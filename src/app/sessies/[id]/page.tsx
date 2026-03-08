"use client";

import { useEffect } from "react";
import { useParams } from "next/navigation";
import { useSession, SessionProvider } from "@/lib/session-context";
import { APP_STEPS } from "@/lib/types";

function SessionFlow() {
  const { id } = useParams<{ id: string }>();
  const { session, currentStep, setCurrentStep, loadSession } = useSession();

  useEffect(() => {
    if (id) loadSession(id);
  }, [id, loadSession]);

  if (!session) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p className="text-gray-500">Sessie laden...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-cito-bg">
      {/* Header */}
      <header className="bg-cito-blue text-white px-6 py-4">
        <div className="max-w-6xl mx-auto flex items-center justify-between">
          <div>
            <h1 className="text-xl font-bold">DIN — {session.name}</h1>
            <p className="text-sm text-blue-200">
              Doelen-Inspanningennetwerk
            </p>
          </div>
        </div>
      </header>

      {/* Stappen navigatie */}
      <nav className="bg-white border-b border-cito-border px-6 py-3">
        <div className="max-w-6xl mx-auto flex gap-1">
          {APP_STEPS.map((step) => (
            <button
              key={step.key}
              onClick={() => setCurrentStep(step.key)}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                currentStep === step.key
                  ? "bg-cito-blue text-white"
                  : "text-gray-600 hover:bg-gray-100"
              }`}
            >
              {step.nummer}. {step.label}
            </button>
          ))}
        </div>
      </nav>

      {/* Content */}
      <main className="max-w-6xl mx-auto p-6">
        <div className="bg-white rounded-xl border border-cito-border p-8">
          <h2 className="text-2xl font-bold text-cito-blue mb-4">
            {APP_STEPS.find((s) => s.key === currentStep)?.label}
          </h2>
          <p className="text-gray-500">
            Stap {APP_STEPS.find((s) => s.key === currentStep)?.nummer} van 6 —
            implementatie volgt.
          </p>
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
