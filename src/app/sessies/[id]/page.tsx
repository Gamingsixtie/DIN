"use client";

import { useEffect, useMemo } from "react";
import { useParams, useRouter } from "next/navigation";
import { useSession, SessionProvider } from "@/lib/session-context";
import { APP_STEPS } from "@/lib/types";
import type { AppStep } from "@/lib/types";
import { getStepCompletions } from "@/lib/din-service";
import ImportStep from "@/components/steps/ImportStep";
import SectorWerkStep from "@/components/steps/SectorWerkStep";
import CrossAnalyseStep from "@/components/steps/CrossAnalyseStep";
import DINMappingStep from "@/components/steps/DINMappingStep";
import PrioriteringStep from "@/components/steps/PrioriteringStep";
import ExportStep from "@/components/steps/ExportStep";

function StepContent({ step }: { step: AppStep }) {
  switch (step) {
    case "import":
      return <ImportStep />;
    case "sectorwerk":
      return <SectorWerkStep />;
    case "din-mapping":
      return <DINMappingStep />;
    case "cross-analyse":
      return <CrossAnalyseStep />;
    case "prioritering":
      return <PrioriteringStep />;
    case "export":
      return <ExportStep />;
  }
}

function SessionFlow() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const { session, currentStep, setCurrentStep, loadSession } = useSession();

  useEffect(() => {
    if (id) loadSession(id);
  }, [id, loadSession]);

  const completions = useMemo(() => {
    if (!session) return [];
    return getStepCompletions(session);
  }, [session]);

  if (!session) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-cito-bg">
        <p className="text-gray-500">Sessie laden...</p>
      </div>
    );
  }

  const currentStepIndex = APP_STEPS.findIndex((s) => s.key === currentStep);

  return (
    <div className="min-h-screen bg-cito-bg">
      <header className="bg-cito-blue text-white px-6 py-4">
        <div className="max-w-6xl mx-auto flex items-center justify-between">
          <div>
            <button
              onClick={() => router.push("/")}
              className="text-blue-200 hover:text-white text-sm mb-1 block"
            >
              ← Terug naar sessies
            </button>
            <h1 className="text-xl font-bold">DIN — {session.name}</h1>
          </div>
          <div className="text-sm text-blue-200">
            Stap {currentStepIndex + 1} van {APP_STEPS.length}
          </div>
        </div>
      </header>

      <nav className="bg-white border-b border-cito-border px-6 py-3">
        <div className="max-w-6xl mx-auto flex gap-1">
          {APP_STEPS.map((step) => {
            const completion = completions.find((c) => c.step === step.key);
            const pct = completion?.percentage ?? 0;
            return (
              <button
                key={step.key}
                onClick={() => setCurrentStep(step.key)}
                className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors flex items-center gap-1.5 ${
                  currentStep === step.key
                    ? "bg-cito-blue text-white"
                    : "text-gray-600 hover:bg-gray-100"
                }`}
              >
                {step.nummer}. {step.label}
                {pct > 0 && (
                  <span
                    className={`text-xs ${
                      currentStep === step.key
                        ? pct === 100
                          ? "text-green-300"
                          : "text-blue-200"
                        : pct === 100
                        ? "text-green-600"
                        : "text-gray-400"
                    }`}
                  >
                    {pct === 100 ? "✓" : `${pct}%`}
                  </span>
                )}
              </button>
            );
          })}
        </div>
      </nav>

      <main className="max-w-6xl mx-auto p-6">
        <div className="bg-white rounded-xl border border-cito-border p-8">
          <h2 className="text-2xl font-bold text-cito-blue mb-6">
            {APP_STEPS.find((s) => s.key === currentStep)?.label}
          </h2>
          <StepContent step={currentStep} />
        </div>

        {/* Navigatie knoppen */}
        <div className="flex justify-between mt-4">
          <button
            onClick={() => {
              if (currentStepIndex > 0)
                setCurrentStep(APP_STEPS[currentStepIndex - 1].key);
            }}
            disabled={currentStepIndex === 0}
            className="px-4 py-2 text-sm font-medium text-gray-600 hover:text-gray-800 disabled:opacity-30 disabled:cursor-not-allowed"
          >
            ← Vorige stap
          </button>
          <button
            onClick={() => {
              if (currentStepIndex < APP_STEPS.length - 1)
                setCurrentStep(APP_STEPS[currentStepIndex + 1].key);
            }}
            disabled={currentStepIndex === APP_STEPS.length - 1}
            className="px-4 py-2 bg-cito-blue text-white rounded-lg text-sm font-medium hover:bg-cito-blue-light disabled:opacity-30 disabled:cursor-not-allowed"
          >
            Volgende stap →
          </button>
        </div>
      </main>
    </div>
  );
}

export default function SessionPage() {
  return (
    <SessionProvider>
      <SessionFlow />
    </SessionProvider>
  );
}
