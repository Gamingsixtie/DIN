"use client";

import { useState, useEffect, useCallback } from "react";
import { useSession } from "@/lib/session-context";
import type {
  DINSession,
  Stap1Result,
  Stap2Result,
  Stap3Result,
  Stap4Result,
  Stap5Result,
} from "@/lib/types";
import { findSharedCapabilities } from "@/lib/din-service";
import { getFocusGoal, restoreStap5Result } from "@/lib/stap5-focus";
import WizardNavigation from "./WizardNavigation";
import StapBatenOverloop from "./StapBatenOverloop";
import StapGedeeldeVermogens from "./StapGedeeldeVermogens";
import StapInspanningenOverlap from "./StapInspanningenOverlap";
import StapConsolidatie from "./StapConsolidatie";
import StapOptimaliseren from "./StapOptimaliseren";
import StapSectorVertaling from "./StapSectorVertaling";
import StapLopendeProjecten from "./StapLopendeProjecten";
import { LoadingOverlay } from "./shared";
import StepAnalyseButton from "./StepAnalyseButton";

interface WizardState {
  currentStep: number;
  completedSteps: Set<number>;
  stepResults: {
    stap1?: Stap1Result;
    stap2?: Stap2Result;
    stap3?: Stap3Result;
    stap4?: Stap4Result;
    stap5?: Stap5Result;
  };
}

const STEP_INFO: Record<number, {
  title: string;
  description: string;
  placeholder: string;
  analyseLabel: string;
  loadingTitle: string;
  loadingDescription: string;
}> = {
  1: {
    title: "Lopende projecten",
    description: "Voeg lopende projecten toe die relevant zijn voor de cross-analyse. Deze projecten worden meegenomen in alle volgende analysestappen.",
    placeholder: "",
    analyseLabel: "",
    loadingTitle: "",
    loadingDescription: "",
  },
  2: {
    title: "Baten-overloop",
    description: "Vergelijk baten per sector en identificeer synergieeen en ontbrekende ketens.",
    placeholder: "Bijv. focus op specifieke baten of sectoren...",
    analyseLabel: "Baten-overloop analyseren",
    loadingTitle: "Baten-overloop wordt geanalyseerd",
    loadingDescription: "De AI vergelijkt baten over alle sectoren...",
  },
  3: {
    title: "Gedeelde vermogens",
    description: "Welke vermogens worden door meerdere sectoren gedeeld? Waar zit hefboomwerking?",
    placeholder: "Bijv. welke vermogens zijn het belangrijkst...",
    analyseLabel: "Vermogens analyseren",
    loadingTitle: "Vermogens worden geclusterd",
    loadingDescription: "De AI identificeert gedeelde vermogens...",
  },
  4: {
    title: "Inspanningen",
    description: "Welke inspanningen overlappen en welke lopende projecten sluiten aan?",
    placeholder: "Bijv. bestaande projecten die relevant zijn...",
    analyseLabel: "Inspanningen analyseren",
    loadingTitle: "Inspanningen worden vergeleken",
    loadingDescription: "De AI zoekt overlap in inspanningen en projecten...",
  },
  5: {
    title: "Consolidatie",
    description: "Beoordeel per cluster: samenvoegen, afstemmen of apart houden.",
    placeholder: "Bijv. voorkeur voor combineren of apart houden van bepaalde clusters...",
    analyseLabel: "Consolidatie-advies genereren",
    loadingTitle: "Consolidatie-advies wordt opgesteld",
    loadingDescription: "De AI formuleert advies per cluster...",
  },
  6: {
    title: "Optimaliseren geconsolideerde inspanningen",
    description: "De cross-sectorale inspanningen uit stap 4 staan per domein (Mens / Processen / Data & Systemen / Cultuur). Hier verfijn je titel, beschrijving, beargumentatie en dossier voordat ze in de prioriteitsview verschijnen.",
    placeholder: "",
    analyseLabel: "",
    loadingTitle: "",
    loadingDescription: "",
  },
  7: {
    title: "Prioriteitsview — eerste doel",
    description: "Dit is de scherpste hefboom: de keten doel → baten → vermogens → inspanningen voor uw hoogste prioriteit. We tonen alleen het eerste doel omdat daar het meeste mandaat en de hoogste urgentie zit.",
    placeholder: "Bijv. specifieke aandachtspunten voor hefboomwerking of baten-dekking...",
    analyseLabel: "Analyseer eerste doel",
    loadingTitle: "AI beoordeelt hefboomwerking…",
    loadingDescription: "De AI loopt vermogens, inspanningen en baten-dekking voor het eerste doel langs...",
  },
};

export default function CrossAnalyseWizard() {
  const { session, updateSession } = useSession();
  const [wizardState, setWizardState] = useState<WizardState>({
    currentStep: 1,
    completedSteps: new Set(),
    stepResults: {},
  });
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [userFeedback, setUserFeedback] = useState("");
  const [legacyMode, setLegacyMode] = useState(false);

  // Restore wizard state from session on mount
  useEffect(() => {
    if (!session) return;

    const wizData = session.crossAnalyseWizard;
    if (wizData) {
      // D-10 — stap5 schema is breaking changed; valideer bij restore via pure helper
      const restoredStap5 = restoreStap5Result(wizData.stepResults?.stap5);

      // Migratie: 5-stappen (v1) → 6-stappen (v2) layout
      let currentStep = wizData.currentStep || 1;
      let completedSteps = wizData.completedSteps || [];
      if (!wizData.wizardVersion || wizData.wizardVersion < 2) {
        // Oude opslag: display-stappen +1 verschuiven
        currentStep = currentStep + 1;
        completedSteps = completedSteps.map((s: number) => s + 1);
      }

      setWizardState({
        currentStep,
        completedSteps: new Set(completedSteps),
        stepResults: {
          ...(wizData.stepResults || {}),
          stap5: restoredStap5,
        },
      });
    } else if (session.crossAnalyse) {
      // Legacy format exists, no wizard state
      setLegacyMode(true);
    }
    // Start at step 1 if neither exists (default state)
  }, [session?.id]); // eslint-disable-line react-hooks/exhaustive-deps

  // Step completion handler
  // resultKey = API stap (1-5) voor stepResults, displayStep = display stap (1-6) voor completedSteps
  const handleStepComplete = useCallback(
    (resultKey: number, result: unknown, displayStep?: number) => {
      setWizardState((prev) => {
        const newCompleted = new Set(prev.completedSteps);
        newCompleted.add(displayStep ?? prev.currentStep);
        const key = `stap${resultKey}` as keyof typeof prev.stepResults;
        const newStepResults = { ...prev.stepResults, [key]: result };

        // Persist to session
        updateSession(() => ({
          crossAnalyseWizard: {
            currentStep: prev.currentStep,
            completedSteps: Array.from(newCompleted),
            wizardVersion: 2,
            stepResults: newStepResults,
          },
        }));

        return {
          ...prev,
          completedSteps: newCompleted,
          stepResults: newStepResults,
        };
      });
    },
    [updateSession]
  );

  // Mark step as viewed (no AI needed)
  const handleMarkViewed = useCallback(() => {
    setWizardState((prev) => {
      const newCompleted = new Set(prev.completedSteps);
      newCompleted.add(prev.currentStep);

      updateSession(() => ({
        crossAnalyseWizard: {
          currentStep: prev.currentStep,
          completedSteps: Array.from(newCompleted),
          wizardVersion: 2,
          stepResults: prev.stepResults,
        },
      }));

      return { ...prev, completedSteps: newCompleted };
    });
  }, [updateSession]);

  // AI call handler
  const handleAnalyse = useCallback(async () => {
    if (!session || wizardState.currentStep < 2) return;

    setIsLoading(true);
    setError(null);

    // Map display step (2-6) naar API step (1-5)
    // Wizard step 6 (Optimaliseren) heeft geen AI-call. Wizard step 7 (Prioriteitsview) mapt naar apiStap 5.
    const apiStap = wizardState.currentStep === 7 ? 5 : wizardState.currentStep - 1;

    try {
      const activeCaps = session.capabilities.filter((c) => !c.consolidated);
      const activeEfforts = session.efforts.filter((e) => !e.consolidated);

      // Alleen het eerste (hoogst gerankte) doel meenemen in cross-analyse
      const focusGoal = getFocusGoal(session.goals);
      const focusGoals = focusGoal ? [focusGoal] : [];
      const focusGoalIds = new Set(focusGoals.map((g) => g.id));
      const focusGBMaps = (session.goalBenefitMaps || []).filter((m) => focusGoalIds.has(m.goalId));
      const focusBenefitIds = new Set(focusGBMaps.map((m) => m.benefitId));
      const focusBenefits = session.benefits.filter((b) => focusBenefitIds.has(b.id));
      const focusBCMaps = (session.benefitCapabilityMaps || []).filter((m) => focusBenefitIds.has(m.benefitId));

      const requestBody = {
        stap: apiStap,
        goals: focusGoals,
        benefits: focusBenefits,
        capabilities: activeCaps,
        efforts: activeEfforts,
        externalProjects: session.externalProjects || [],
        goalBenefitMaps: focusGBMaps,
        benefitCapabilityMaps: focusBCMaps,
        capabilityEffortMaps: session.capabilityEffortMaps,
        kibGoals: session.goals,
        kibScope: session.scope,
        stap1Result: wizardState.stepResults.stap1,
        stap2Result: wizardState.stepResults.stap2,
        stap3Result: wizardState.stepResults.stap3,
        stap4Result: wizardState.stepResults.stap4,
        userFeedback: userFeedback || undefined,
      };

      const response = await fetch("/api/cross-analyse", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(requestBody),
      });

      // Guard: lees body als text en parse handmatig — voorkomt crash bij non-JSON responses
      const rawText = await response.text();
      let data: { success: boolean; error?: string; data?: { analysis?: unknown; stap?: number } };
      try {
        data = JSON.parse(rawText);
      } catch {
        console.error("[cross-analyse] Niet-JSON response:", response.status, rawText.slice(0, 200));
        setError(
          response.status === 504 || rawText.includes("FUNCTION_INVOCATION_TIMEOUT")
            ? "De analyse duurde te lang (timeout). Probeer het opnieuw — eventueel met minder data of extra instructies."
            : `Serverfout (${response.status}). Probeer het opnieuw.`
        );
        return;
      }

      if (!data.success) {
        setError(data.error || "De AI-analyse is mislukt. Probeer het opnieuw, eventueel met extra instructies.");
        return;
      }

      handleStepComplete(apiStap, data.data?.analysis, wizardState.currentStep);
      setUserFeedback("");
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "De AI-analyse is mislukt. Probeer het opnieuw, eventueel met extra instructies."
      );
    } finally {
      setIsLoading(false);
    }
  }, [session, wizardState.currentStep, wizardState.stepResults, userFeedback, handleStepComplete]);

  // Step navigation handler
  const handleStepChange = useCallback(
    (step: number) => {
      setWizardState((prev) => {
        updateSession(() => ({
          crossAnalyseWizard: {
            currentStep: step,
            completedSteps: Array.from(prev.completedSteps),
            wizardVersion: 2,
            stepResults: prev.stepResults,
          },
        }));

        return { ...prev, currentStep: step };
      });
      setUserFeedback("");
      setError(null);
    },
    [updateSession]
  );

  // Start new wizard (from legacy mode)
  const handleStartNewWizard = useCallback(() => {
    setLegacyMode(false);
    setWizardState({ currentStep: 1, completedSteps: new Set(), stepResults: {} });
    updateSession(() => ({
      crossAnalyseWizard: {
        currentStep: 1,
        completedSteps: [],
        wizardVersion: 2,
        stepResults: {},
      },
    }));
  }, [updateSession]);

  // Early returns
  if (!session) return null;

  // Check for enough DIN data
  const hasData =
    session.goals.length > 0 &&
    (session.benefits.length > 0 || session.capabilities.length > 0 || session.efforts.length > 0);

  if (!hasData) {
    return (
      <div className="flex flex-col items-center justify-center py-16 text-center">
        <div className="w-12 h-12 rounded-full bg-gray-100 flex items-center justify-center mb-4">
          <svg className="w-6 h-6 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 17v-2m3 2v-4m3 4v-6m2 10H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
          </svg>
        </div>
        <p className="text-gray-500 font-medium mb-1">Nog geen DIN-data beschikbaar</p>
        <p className="text-sm text-gray-400">
          Vul eerst het DIN-netwerk in via de DIN-Mapping stap om een cross-analyse uit te voeren.
        </p>
      </div>
    );
  }

  // Legacy mode banner
  if (legacyMode) {
    return (
      <div className="space-y-8">
        <div className="bg-amber-50 border border-amber-200 rounded-xl p-5">
          <div className="flex items-start gap-3">
            <div className="w-8 h-8 rounded-lg bg-amber-100 flex items-center justify-center shrink-0">
              <svg className="w-4 h-4 text-amber-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v3.75m9-.75a9 9 0 11-18 0 9 9 0 0118 0zm-9 3.75h.008v.008H12v-.008z" />
              </svg>
            </div>
            <div className="flex-1">
              <h4 className="text-sm font-semibold text-amber-800">Eerdere analyse gevonden</h4>
              <p className="text-sm text-amber-700 mt-1">
                Eerdere analyse gevonden. Bekijk de resultaten of start een nieuwe wizard-analyse.
              </p>
              <div className="flex gap-3 mt-3">
                <button
                  onClick={() => {
                    // Show legacy mode -- keep existing CrossAnalyseStep behavior
                    // The parent CrossAnalyseStep will render the legacy view
                    setLegacyMode(true);
                  }}
                  className="px-4 min-h-[44px] border border-amber-300 text-amber-800 rounded-lg text-sm font-medium hover:bg-amber-100 transition-colors"
                >
                  Bekijk eerdere analyse
                </button>
                <button
                  onClick={handleStartNewWizard}
                  className="px-4 min-h-[44px] bg-cito-blue text-white rounded-lg text-sm font-medium hover:bg-cito-blue-light transition-colors"
                >
                  Nieuwe analyse starten
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Compute stats — alleen focus-doel (eerste doel) meenemen
  const activeCaps = session.capabilities.filter((c) => !c.consolidated);
  const activeEfforts = session.efforts.filter((e) => !e.consolidated);
  const sharedCaps = findSharedCapabilities(activeCaps);
  const statsFocusGoal = getFocusGoal(session.goals);
  const statsFocusGoalIds = statsFocusGoal ? new Set([statsFocusGoal.id]) : new Set<string>();
  const statsFocusBenefitIds = new Set(
    (session.goalBenefitMaps || []).filter((m) => statsFocusGoalIds.has(m.goalId)).map((m) => m.benefitId)
  );
  const statsFocusBenefitCount = session.benefits.filter((b) => statsFocusBenefitIds.has(b.id)).length;

  const stepInfo = STEP_INFO[wizardState.currentStep];

  return (
    <div className="space-y-6">
      {/* Loading overlay */}
      {isLoading && (
        <LoadingOverlay
          title={stepInfo.loadingTitle}
          description={stepInfo.loadingDescription}
        />
      )}

      {/* Header with stats strip */}
      <div className="bg-white border border-gray-200 rounded-xl p-5">
        <div className="mb-4">
          <h3 className="text-lg font-semibold text-cito-blue">Cross-analyse</h3>
          <p className="text-xs text-gray-400 mt-0.5">
            Analyseer synergieeen, gedeelde vermogens en consolidatiemogelijkheden over alle sectoren
          </p>
        </div>

        {/* Stats strip */}
        <div className="grid grid-cols-6 gap-3">
          <div className="bg-gray-50 rounded-lg p-3 text-center">
            <div className="text-xl font-bold text-din-doelen">1</div>
            <div className="text-[10px] text-gray-500 uppercase tracking-wider font-medium">Focusdoel</div>
          </div>
          <div className="bg-gray-50 rounded-lg p-3 text-center">
            <div className="text-xl font-bold text-din-baten">{statsFocusBenefitCount}</div>
            <div className="text-[10px] text-gray-500 uppercase tracking-wider font-medium">Baten</div>
          </div>
          <div className="bg-gray-50 rounded-lg p-3 text-center">
            <div className="text-xl font-bold text-din-vermogens">{activeCaps.length}</div>
            <div className="text-[10px] text-gray-500 uppercase tracking-wider font-medium">Vermogens</div>
          </div>
          <div className="bg-gray-50 rounded-lg p-3 text-center">
            <div className="text-xl font-bold text-din-inspanningen">{activeEfforts.length}</div>
            <div className="text-[10px] text-gray-500 uppercase tracking-wider font-medium">Inspanningen</div>
          </div>
          <div className="bg-gray-50 rounded-lg p-3 text-center">
            <div className="text-xl font-bold text-gray-600">{(session.externalProjects || []).filter(p => !p.promotedAt).length}</div>
            <div className="text-[10px] text-gray-500 uppercase tracking-wider font-medium">Projecten</div>
          </div>
          <div className="bg-gray-50 rounded-lg p-3 text-center">
            <div className="text-xl font-bold text-amber-600">{sharedCaps.size}</div>
            <div className="text-[10px] text-gray-500 uppercase tracking-wider font-medium">Synergieeen</div>
          </div>
        </div>
      </div>

      {/* Step content panel with wizard navigation */}
      <div className="bg-white border border-gray-200 rounded-xl p-6 min-h-[400px]">
        {/* Wizard progress indicator + navigation at top */}
        <WizardNavigation
          currentStep={wizardState.currentStep}
          completedSteps={wizardState.completedSteps}
          onStepChange={handleStepChange}
        />

        {/* Step title + description */}
        <div className="mb-6">
          <h4 className="text-lg font-semibold text-cito-blue">{stepInfo.title}</h4>
          <p className="text-sm text-gray-500 mt-1">{stepInfo.description}</p>
        </div>

        {/* Active step component */}
        {wizardState.currentStep === 1 && (
          <StapLopendeProjecten session={session} onComplete={handleMarkViewed} />
        )}
        {wizardState.currentStep === 2 && (
          <StapBatenOverloop session={session} result={wizardState.stepResults.stap1} />
        )}
        {wizardState.currentStep === 3 && (
          <StapGedeeldeVermogens session={session} result={wizardState.stepResults.stap2} />
        )}
        {wizardState.currentStep === 4 && (
          <StapInspanningenOverlap session={session} result={wizardState.stepResults.stap3} />
        )}
        {wizardState.currentStep === 5 && (
          <StapConsolidatie
            session={session}
            stap2Result={wizardState.stepResults.stap2}
            stap3Result={wizardState.stepResults.stap3}
            stap4Result={wizardState.stepResults.stap4}
          />
        )}
        {wizardState.currentStep === 6 && (
          <StapOptimaliseren
            session={session}
            stap4Result={wizardState.stepResults.stap4}
            stap2Result={wizardState.stepResults.stap2}
          />
        )}
        {wizardState.currentStep === 7 && (
          <StapSectorVertaling
            session={session}
            result={wizardState.stepResults.stap5}
            stap2Result={wizardState.stepResults.stap2}
            stap4Result={wizardState.stepResults.stap4}
          />
        )}

        {/* Error state */}
        {error && (
          <div className="mt-6 p-4 bg-red-50 border border-red-200 rounded-lg">
            <div className="flex items-start gap-3">
              <svg className="w-5 h-5 text-red-500 shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v3.75m9-.75a9 9 0 11-18 0 9 9 0 0118 0zm-9 3.75h.008v.008H12v-.008z" />
              </svg>
              <div className="flex-1">
                <p className="text-sm font-medium text-red-700">Analyse mislukt</p>
                <p className="text-sm text-red-600 mt-0.5">{error}</p>
              </div>
            </div>
            <div className="mt-3 space-y-2">
              <textarea
                value={userFeedback}
                onChange={(e) => setUserFeedback(e.target.value)}
                className="w-full p-3 border border-gray-300 rounded-lg text-sm min-h-[60px] placeholder-gray-400"
                placeholder="Voeg extra instructies toe..."
              />
              <button
                onClick={handleAnalyse}
                disabled={isLoading}
                className="px-4 min-h-[44px] bg-cito-blue text-white rounded-lg text-sm font-medium hover:bg-cito-blue-light disabled:opacity-50 transition-colors"
              >
                Opnieuw proberen
              </button>
            </div>
          </div>
        )}

        {/* Optional context textarea + Analyseer button (steps 2-6, niet voor stap 1 = data-invoer) */}
        {wizardState.currentStep >= 2 && wizardState.currentStep <= 7 && wizardState.currentStep !== 6 && !error && (
          <div className="mt-6 space-y-3">
            <div>
              <label className="text-xs text-gray-500 mb-1 block">
                Optioneel: extra context voor de AI-analyse
              </label>
              <textarea
                value={userFeedback}
                onChange={(e) => setUserFeedback(e.target.value)}
                className="w-full p-3 border border-gray-300 rounded-lg text-sm min-h-[60px] max-h-[120px] resize-y placeholder-gray-400"
                placeholder={stepInfo.placeholder}
                disabled={isLoading}
              />
            </div>
            <div className="flex items-center gap-3">
              <StepAnalyseButton
                label={stepInfo.analyseLabel}
                isLoading={isLoading}
                disabled={!hasData}
                onClick={handleAnalyse}
              />
              {!wizardState.completedSteps.has(wizardState.currentStep) && (
                <button
                  onClick={handleMarkViewed}
                  className="px-4 min-h-[44px] border border-gray-300 text-gray-700 rounded-lg text-sm font-medium hover:bg-gray-50 transition-colors"
                >
                  Markeer als bekeken
                </button>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
