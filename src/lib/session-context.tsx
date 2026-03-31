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
import type { DINSession, AppStep } from "./types";
import { APP_STEPS } from "./types";
import { loadLocal, saveLocal } from "./persistence";
import { useToast } from "@/components/ui/Toast";

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
      integratieAdvies: {},
      sectorAnalyses: {},
      verrijkteSectorplannen: {},
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
