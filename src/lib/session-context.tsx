"use client";

import {
  createContext,
  useContext,
  useState,
  useCallback,
  type ReactNode,
} from "react";
import type { DINSession, AppStep } from "./types";
import { APP_STEPS } from "./types";
import { loadLocal, saveLocal } from "./persistence";

interface SessionContextValue {
  session: DINSession | null;
  currentStep: AppStep;
  setCurrentStep: (step: AppStep) => void;
  loadSession: (id: string) => void;
  createSession: (name: string) => DINSession;
  updateSession: (updates: Partial<DINSession>) => void;
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

  const setCurrentStep = useCallback(
    (step: AppStep) => {
      setCurrentStepState(step);
      if (session) {
        const stepIndex = APP_STEPS.findIndex(s => s.key === step);
        const updated = { ...session, currentStep: stepIndex >= 0 ? stepIndex : 0, updatedAt: new Date().toISOString() };
        setSession(updated);
        saveLocal(`session_${session.id}`, updated);
      }
    },
    [session]
  );

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
    (updates: Partial<DINSession>) => {
      if (!session) return;
      const updated = { ...session, ...updates, updatedAt: new Date().toISOString() };
      setSession(updated);
      saveLocal(`session_${session.id}`, updated);
    },
    [session]
  );

  return (
    <SessionContext.Provider
      value={{
        session,
        currentStep,
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
