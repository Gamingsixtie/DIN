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
import { loadLocal, saveLocal } from "./persistence";
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
      return updated;
    });
  }, []);

  const loadSession = useCallback((id: string) => {
    const loaded = loadLocal<DINSession>(`session_${id}`);
    if (loaded) {
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
    }
  }, []);

  const createSession = useCallback((name: string): DINSession => {
    const newSession: DINSession = {
      id: crypto.randomUUID(),
      name,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
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
      sectorAnalyses: {},
      verrijkteSectorplannen: {},
      completedGoals: [],
    };
    setSession(newSession);
    saveLocal(`session_${newSession.id}`, newSession);

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
        return updated;
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
