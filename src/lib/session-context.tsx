"use client";

import {
  createContext,
  useContext,
  useState,
  useCallback,
  useRef,
  useEffect,
  type ReactNode,
} from "react";
import type { DINSession, AppStep, SectorplanAnalyseResult } from "./types";
import { APP_STEPS } from "./types";
import { loadLocal, saveLocal, saveSessionToSupabase, loadSessionFromSupabase, addPendingSave } from "./persistence";
import { useSyncStatus } from "./sync-status-context";
import { useToast } from "@/components/ui/Toast";
import { AISectorplanAnalyseSchema } from "@/lib/schemas";

export function migrateSectorAnalyses(
  raw: Record<string, unknown> | undefined
): { migrated: Record<string, SectorplanAnalyseResult>; needsToast: boolean } {
  if (!raw) return { migrated: {}, needsToast: false };
  const migrated: Record<string, SectorplanAnalyseResult> = {};
  let needsToast = false;

  for (const [key, value] of Object.entries(raw)) {
    if (typeof value === "object" && value !== null) {
      const result = AISectorplanAnalyseSchema.safeParse(value);
      if (result.success) {
        migrated[key] = result.data;
      } else {
        console.error(`[migration] Ongeldige sectorAnalyse object voor ${key}:`, result.error.issues);
        needsToast = true;
      }
    } else if (typeof value === "string") {
      try {
        const parsed = JSON.parse(value);
        const result = AISectorplanAnalyseSchema.safeParse(parsed);
        if (result.success) {
          migrated[key] = result.data;
        } else {
          console.error(`[migration] Sectoranalyse string voor ${key} valideert niet:`, result.error.issues);
          needsToast = true;
        }
      } catch {
        console.error(`[migration] Sectoranalyse voor ${key} is geen geldig JSON, wordt verwijderd`);
        needsToast = true;
      }
    }
  }

  return { migrated, needsToast };
}

interface SessionContextValue {
  session: DINSession | null;
  currentStep: AppStep;
  lastSaved: Date | null;
  setCurrentStep: (step: AppStep) => void;
  loadSession: (id: string) => void;
  createSession: (name: string) => DINSession;
  updateSession: (updater: (prev: DINSession) => Partial<DINSession>) => void;
}

const SessionContext = createContext<SessionContextValue | null>(null);

export function useSession() {
  const ctx = useContext(SessionContext);
  if (!ctx)
    throw new Error("useSession moet binnen SessionProvider gebruikt worden");
  return ctx;
}

export function SessionProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<DINSession | null>(null);
  const [currentStep, setCurrentStepState] = useState<AppStep>("import");
  const [lastSaved, setLastSaved] = useState<Date | null>(null);

  // Store addToast in a ref so it can be accessed inside setSession without stale closure
  const addToastRef = useRef<
    (msg: string, type?: "success" | "error" | "info") => void
  >(() => {});

  const { addToast } = useToast();
  useEffect(() => {
    addToastRef.current = addToast;
  }, [addToast]);

  // Sync status ref to avoid stale closures in setSession (same pattern as addToastRef)
  const { setSyncing, setSynced, setError } = useSyncStatus();
  const syncStatusRef = useRef({ setSyncing: () => {}, setSynced: () => {}, setError: () => {} });
  useEffect(() => {
    syncStatusRef.current = { setSyncing, setSynced, setError };
  }, [setSyncing, setSynced, setError]);

  // Ref to capture latest session for async Supabase save outside setSession callback
  const latestSessionRef = useRef<DINSession | null>(null);

  const setCurrentStep = useCallback((step: AppStep) => {
    setCurrentStepState(step);
    setSession((prev) => {
      if (!prev) return prev;
      const stepIndex = APP_STEPS.findIndex((s) => s.key === step);
      const updated = {
        ...prev,
        currentStep: stepIndex >= 0 ? stepIndex : 0,
        updatedAt: new Date().toISOString(),
      };
      saveLocal(`session_${prev.id}`, updated);
      latestSessionRef.current = updated;
      return updated;
    });
    // Async Supabase save OUTSIDE setSession callback (per Pitfall 6)
    queueMicrotask(async () => {
      const toSave = latestSessionRef.current;
      if (!toSave) return;
      syncStatusRef.current.setSyncing();
      try {
        const result = await saveSessionToSupabase(toSave);
        if (result !== false) {
          syncStatusRef.current.setSynced();
        } else {
          addPendingSave(toSave);
          syncStatusRef.current.setError();
        }
      } catch {
        addPendingSave(toSave);
        syncStatusRef.current.setError();
      }
    });
  }, []);

  const loadSession = useCallback((id: string) => {
    const applySession = (loaded: DINSession) => {
      // Migratie: sectorAnalyses string -> typed object (Phase 05)
      if (loaded.sectorAnalyses) {
        const { migrated, needsToast } = migrateSectorAnalyses(
          loaded.sectorAnalyses as Record<string, unknown>
        );
        loaded.sectorAnalyses = migrated;
        if (needsToast) {
          queueMicrotask(() =>
            addToastRef.current(
              "Eerdere sectorwerk-analyses konden niet worden geladen. Voer de analyse opnieuw uit.",
              "error"
            )
          );
        }
        saveLocal(`session_${id}`, loaded);
      }
      setSession(loaded);
      const step = APP_STEPS[loaded.currentStep]?.key || "import";
      setCurrentStepState(step);
      // NIET naar Supabase schrijven bij laden — alleen updateSession mag schrijven.
      // Anders ontstaat een race condition waarbij de geladen (oude) data
      // de door updateSession opgeslagen (nieuwe) data overschrijft.
    };

    // localStorage eerst (sync, snelle UX)
    const local = loadLocal<DINSession>(`session_${id}`);
    if (local) {
      applySession(local);
    }

    // ALTIJD Supabase checken — als remote nieuwer is, overnemen.
    // Dit maakt cross-device sync mogelijk: wijzigingen op device A
    // worden zichtbaar op device B bij het openen van de sessie.
    loadSessionFromSupabase(id).then((remote) => {
      if (!remote) return;
      const remoteVersion = remote.version ?? 0;
      const localVersion = local?.version ?? 0;

      if (!local) {
        // Geen lokale data — herstel vanuit Supabase
        saveLocal(`session_${id}`, remote);
        applySession(remote);
        queueMicrotask(() =>
          addToastRef.current("Sessie hersteld vanuit Supabase", "success")
        );
      } else if (remoteVersion > localVersion) {
        // Remote is nieuwer — overnemen
        saveLocal(`session_${id}`, remote);
        applySession(remote);
        queueMicrotask(() =>
          addToastRef.current("Nieuwere versie geladen vanuit cloud", "info")
        );
      }
    });
  }, []);

  const createSession = useCallback((name: string): DINSession => {
    const newSession: DINSession = {
      id: crypto.randomUUID(),
      name,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      version: 1,
      currentStep: 0,
      goals: [],
      sectorPlans: [],
      pmcEntries: [],
      benefits: [],
      capabilities: [],
      efforts: [],
      goalBenefitMaps: [],
      benefitCapabilityMaps: [],
      capabilityEffortMaps: [],
      projectCapabilityMaps: [],
      sectorAnalyses: {},
      verrijkteSectorplannen: {},
      completedGoals: [],
      clusterRasci: [],
    };
    setSession(newSession);
    saveLocal(`session_${newSession.id}`, newSession);
    // Sync naar Supabase met status tracking (D-01, D-03)
    syncStatusRef.current.setSyncing();
    saveSessionToSupabase(newSession).then((result) => {
      if (result !== false) syncStatusRef.current.setSynced();
      else {
        addPendingSave(newSession);
        syncStatusRef.current.setError();
      }
    }).catch(() => {
      addPendingSave(newSession);
      syncStatusRef.current.setError();
    });

    // Sessie-lijst bijwerken
    const list = loadLocal<string[]>("session_list") || [];
    list.push(newSession.id);
    saveLocal("session_list", list);

    return newSession;
  }, []);

  const updateSession = useCallback(
    (updater: (prev: DINSession) => Partial<DINSession>) => {
      setSession((prev) => {
        if (!prev) return prev;
        const updates = updater(prev);
        const updated = {
          ...prev,
          ...updates,
          updatedAt: new Date().toISOString(),
        };
        const saved = saveLocal(`session_${prev.id}`, updated);
        if (!saved) {
          queueMicrotask(() =>
            addToastRef.current(
              "Opslaan mislukt \u2014 ruim browsergegevens op of exporteer je sessie.",
              "error"
            )
          );
        } else {
          queueMicrotask(() => setLastSaved(new Date()));
        }
        latestSessionRef.current = updated;
        return updated;
      });
      // Async Supabase save OUTSIDE setSession callback (per Pitfall 6)
      queueMicrotask(async () => {
        const toSave = latestSessionRef.current;
        if (!toSave) return;
        syncStatusRef.current.setSyncing();
        try {
          const result = await saveSessionToSupabase(toSave);
          if (result !== false) {
            syncStatusRef.current.setSynced();
            // Sync versie in React state zodat volgende writes niet geblokkeerd worden
            setSession((prev) => prev && prev.version !== result ? { ...prev, version: result } : prev);
          } else {
            // Save failed after all retries — add to persistent pending queue (per D-03)
            addPendingSave(toSave);
            syncStatusRef.current.setError();
          }
        } catch {
          // Save threw after all retries — add to persistent pending queue (per D-03)
          addPendingSave(toSave);
          syncStatusRef.current.setError();
          addToastRef.current("Synchronisatie mislukt na 3 pogingen. Wijzigingen zijn lokaal opgeslagen.", "error");
        }
      });
    },
    []
  );

  return (
    <SessionContext.Provider
      value={{
        session,
        currentStep,
        lastSaved,
        setCurrentStep,
        loadSession,
        createSession,
        updateSession,
      }}
    >
      {children}
    </SessionContext.Provider>
  );
}
