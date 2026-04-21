"use client";

interface WizardNavigationProps {
  currentStep: number;          // 1-7
  completedSteps: Set<number>;
  onStepChange: (step: number) => void;
}

const STEP_LABELS = [
  "Lopende projecten",
  "Baten-overloop",
  "Gedeelde vermogens",
  "Inspanningen",
  "Consolidatie",
  "Optimaliseren",
  "DIN-netwerk",
];

export default function WizardNavigation({
  currentStep,
  completedSteps,
  onStepChange,
}: WizardNavigationProps) {
  const isStepAccessible = (step: number): boolean => {
    if (step === 1) return true;
    // Stap 7 (DIN-netwerk) hangt af van stap 5 (Consolidatie), niet stap 6
    // (Optimaliseren) omdat stap 6 geen AI-call heeft om completion te markeren.
    if (step === 7) return completedSteps.has(5);
    return completedSteps.has(step - 1);
  };

  return (
    <div>
      {/* Progress indicator */}
      <ProgressIndicator
        currentStep={currentStep}
        completedSteps={completedSteps}
        onStepChange={onStepChange}
        isStepAccessible={isStepAccessible}
      />

      {/* Navigation buttons (bottom) */}
      <NavigationButtons
        currentStep={currentStep}
        completedSteps={completedSteps}
        onStepChange={onStepChange}
      />
    </div>
  );
}

function ProgressIndicator({
  currentStep,
  completedSteps,
  onStepChange,
  isStepAccessible,
}: {
  currentStep: number;
  completedSteps: Set<number>;
  onStepChange: (step: number) => void;
  isStepAccessible: (step: number) => boolean;
}) {
  return (
    <>
      {/* Desktop: full progress bar */}
      <div className="hidden md:flex items-center justify-between mb-6">
        {STEP_LABELS.map((label, i) => {
          const step = i + 1;
          const isCompleted = completedSteps.has(step);
          const isActive = step === currentStep;
          const isLocked = !isActive && !isCompleted && !isStepAccessible(step);

          return (
            <div key={step} className="flex items-center flex-1 last:flex-none">
              <div className="flex flex-col items-center">
                <button
                  type="button"
                  onClick={() => {
                    if (isCompleted) onStepChange(step);
                  }}
                  disabled={isLocked || isActive}
                  title={isLocked ? "Rond eerst de vorige stap af" : label}
                  className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold transition-colors ${
                    isCompleted
                      ? "bg-cito-blue text-white cursor-pointer hover:bg-cito-blue-light"
                      : isActive
                        ? "bg-cito-blue text-white ring-2 ring-cito-blue/30"
                        : "bg-gray-200 text-gray-400 cursor-not-allowed"
                  }`}
                >
                  {isCompleted ? (
                    <svg className="w-4 h-4" viewBox="0 0 20 20" fill="currentColor">
                      <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                    </svg>
                  ) : (
                    step
                  )}
                </button>
                <span className={`text-[10px] mt-1 text-center whitespace-nowrap ${
                  isActive ? "text-cito-blue font-medium" : "text-gray-500"
                }`}>
                  {label}
                </span>
              </div>
              {i < STEP_LABELS.length - 1 && (
                <div className={`h-0.5 flex-1 mx-2 ${
                  completedSteps.has(step) ? "bg-cito-blue" : "bg-gray-200"
                }`} />
              )}
            </div>
          );
        })}
      </div>

      {/* Mobile: active step + dots */}
      <div className="flex md:hidden items-center justify-center gap-3 mb-6">
        <div className="flex items-center gap-1.5">
          {STEP_LABELS.map((_, i) => {
            const step = i + 1;
            const isActive = step === currentStep;
            const isCompleted = completedSteps.has(step);

            if (isActive) {
              return (
                <div key={step} className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-full bg-cito-blue text-white flex items-center justify-center text-xs font-bold ring-2 ring-cito-blue/30">
                    {step}
                  </div>
                  <span className="text-sm text-cito-blue font-medium">{STEP_LABELS[i]}</span>
                </div>
              );
            }

            return (
              <div
                key={step}
                className={`w-2 h-2 rounded-full ${isCompleted ? "bg-cito-blue" : "bg-gray-300"}`}
              />
            );
          })}
        </div>
      </div>
    </>
  );
}

function NavigationButtons({
  currentStep,
  completedSteps,
  onStepChange,
}: {
  currentStep: number;
  completedSteps: Set<number>;
  onStepChange: (step: number) => void;
}) {
  // Stap 6 (Optimaliseren) heeft geen verplichte AI-call: altijd doorgaan als stap 5 klaar is.
  const canProceed = currentStep === 6 ? completedSteps.has(5) : completedSteps.has(currentStep);

  return (
    <div className="flex flex-col md:flex-row justify-between pt-4 border-t border-gray-200 gap-2">
      {currentStep > 1 ? (
        <button
          type="button"
          onClick={() => onStepChange(currentStep - 1)}
          className="px-4 min-h-[44px] border border-gray-300 text-gray-700 rounded-lg text-sm font-medium hover:bg-gray-50 transition-colors w-full md:w-auto"
        >
          Vorige
        </button>
      ) : (
        <div />
      )}

      {currentStep < 7 && (
        <button
          type="button"
          onClick={() => onStepChange(currentStep + 1)}
          disabled={!canProceed}
          className={`px-4 min-h-[44px] bg-cito-blue text-white rounded-lg text-sm font-medium transition-colors w-full md:w-auto ${
            canProceed
              ? "hover:bg-cito-blue-light"
              : "opacity-50 cursor-not-allowed"
          }`}
        >
          Volgende
        </button>
      )}
    </div>
  );
}
