"use client";

import { useState } from "react";

interface ConsolidationActionBarProps {
  itemIds: string[];
  itemCount: number;
  sectorList: string;
  onMerge: (ids: string[]) => void;
  isMerged: boolean;
  onUndo: (sharedId: string) => void;
  sharedId?: string;
  onReview: () => void;
  isReviewed: boolean;
  afstemmingsStappen?: string[];
  onGenerateAdvice?: () => Promise<string[]>;
  onHerzieAdvies?: (context: string) => Promise<void>;
}

export default function ConsolidationActionBar({
  itemIds,
  itemCount,
  sectorList,
  onMerge,
  isMerged,
  onUndo,
  sharedId,
  onReview,
  isReviewed,
  afstemmingsStappen,
  onGenerateAdvice,
  onHerzieAdvies,
}: ConsolidationActionBarProps) {
  const [showConfirm, setShowConfirm] = useState(false);
  const [showAfstemmingsAdvies, setShowAfstemmingsAdvies] = useState(false);
  const [generatedAdvice, setGeneratedAdvice] = useState<string[] | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);
  // Phase 17 Wave 3: guard-error banner + herzie loading state
  const [guardError, setGuardError] = useState<string | null>(null);
  const [isHerzienLoading, setIsHerzienLoading] = useState(false);

  // --- Phase 17: guarded merge wrapper — catches throws from D-01/D-02/D-27 guards ---
  function tryMerge() {
    try {
      onMerge(itemIds);
      setGuardError(null);
      setShowConfirm(false);
    } catch (err) {
      setGuardError(err instanceof Error ? err.message : "Samenvoeging gefaald");
      setShowConfirm(false);
    }
  }

  if (isMerged && sharedId) {
    return (
      <div className="flex items-center gap-2 mt-3">
        <span className="bg-teal-100 text-teal-700 border border-teal-200 rounded px-1.5 py-0.5 text-[10px] font-semibold">
          Geconsolideerd
        </span>
        <button
          onClick={() => onUndo(sharedId)}
          className="text-xs text-gray-500 hover:text-gray-700 underline transition-colors"
        >
          Ongedaan maken
        </button>
      </div>
    );
  }

  if (isReviewed) {
    return (
      <div className="mt-3 opacity-60">
        <span className="text-xs text-gray-500 italic">Bekeken</span>
      </div>
    );
  }

  if (showConfirm) {
    return (
      <div className="mt-3 p-3 bg-gray-50 rounded-lg border border-gray-200">
        <p className="text-xs text-gray-600 mb-2">
          {itemCount} items worden samengevoegd tot een gedeeld item dat gekoppeld wordt aan {sectorList}. Originele items blijven bewaard.
        </p>
        <div className="flex gap-2">
          <button
            onClick={tryMerge}
            className="px-3 min-h-[44px] bg-cito-blue text-white rounded-lg text-xs font-semibold hover:bg-cito-blue-light transition-colors"
          >
            Bevestigen
          </button>
          <button
            onClick={() => setShowConfirm(false)}
            className="px-3 min-h-[44px] text-gray-500 text-xs font-semibold hover:text-gray-700 transition-colors"
          >
            Toch niet samenvoegen
          </button>
        </div>
      </div>
    );
  }

  const adviceSteps = generatedAdvice ?? afstemmingsStappen ?? [];

  if (showAfstemmingsAdvies) {
    return (
      <div className="mt-3 p-4 bg-amber-50 rounded-lg border border-amber-200">
        <p className="text-xs font-semibold text-amber-800 mb-2">
          Afstemmingsadvies
        </p>

        {adviceSteps.length > 0 ? (
          <ol className="space-y-1.5 mb-3">
            {adviceSteps.map((stap, i) => (
              <li key={i} className="flex items-start gap-2 text-xs text-amber-900">
                <span className="w-5 h-5 rounded-full bg-amber-200 text-amber-800 flex items-center justify-center shrink-0 text-[10px] font-bold mt-0.5">
                  {i + 1}
                </span>
                <span>{stap}</span>
              </li>
            ))}
          </ol>
        ) : (
          <div className="mb-3">
            <p className="text-xs text-amber-700 mb-2">
              Nog geen afstemmingsadvies beschikbaar.
            </p>
            {onGenerateAdvice && (
              <button
                onClick={async () => {
                  setIsGenerating(true);
                  try {
                    const result = await onGenerateAdvice();
                    setGeneratedAdvice(result);
                  } finally {
                    setIsGenerating(false);
                  }
                }}
                disabled={isGenerating}
                className="px-3 min-h-[36px] bg-amber-600 text-white rounded-lg text-xs font-semibold hover:bg-amber-700 transition-colors disabled:opacity-50 flex items-center gap-2"
              >
                {isGenerating ? (
                  <>
                    <svg className="w-3.5 h-3.5 animate-spin" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                    </svg>
                    AI genereert advies...
                  </>
                ) : (
                  <>
                    <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                    </svg>
                    Genereer AI-consolidatieadvies
                  </>
                )}
              </button>
            )}
          </div>
        )}

        <div className="flex gap-2">
          <button
            onClick={() => { onReview(); setShowAfstemmingsAdvies(false); }}
            className="px-3 min-h-[44px] bg-amber-600 text-white rounded-lg text-xs font-semibold hover:bg-amber-700 transition-colors"
          >
            Begrepen — markeer als afgestemd
          </button>
          <button
            onClick={() => { setShowAfstemmingsAdvies(false); setShowConfirm(true); }}
            className="px-3 min-h-[44px] text-gray-500 text-xs font-semibold hover:text-gray-700 transition-colors"
          >
            Toch combineren
          </button>
        </div>
      </div>
    );
  }

  return (
    <div>
      {/* Phase 17 D-04: guard-error banner bij geblokkeerde merge */}
      {guardError && (
        <div
          className="mt-3 p-3 bg-red-50 border border-red-200 rounded-lg"
          data-testid="guard-error-banner"
        >
          <p className="text-xs font-semibold text-red-800">Samenvoeging niet mogelijk</p>
          <p className="text-xs text-red-700 mt-1">{guardError}</p>
          <div className="flex gap-2 mt-2">
            {onHerzieAdvies && (
              <button
                onClick={async () => {
                  setIsHerzienLoading(true);
                  try {
                    await onHerzieAdvies("");
                  } finally {
                    setIsHerzienLoading(false);
                  }
                  setGuardError(null);
                }}
                disabled={isHerzienLoading}
                className="text-xs px-3 py-1 rounded bg-red-600 text-white hover:bg-red-700 disabled:opacity-50"
              >
                {isHerzienLoading ? "Bezig..." : "Herzie advies"}
              </button>
            )}
            <button
              onClick={() => setGuardError(null)}
              className="text-xs px-3 py-1 rounded bg-gray-100 text-gray-700 hover:bg-gray-200"
            >
              Sluiten
            </button>
          </div>
        </div>
      )}

      <div className="flex gap-2 mt-3">
        <button
          onClick={() => setShowConfirm(true)}
          disabled={guardError !== null}
          className="px-3 min-h-[44px] bg-cito-blue text-white rounded-lg text-xs font-semibold hover:bg-cito-blue-light transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
        >
          Combineren
        </button>
        <button
          onClick={() => setShowAfstemmingsAdvies(true)}
          className="px-3 min-h-[44px] border border-amber-300 text-amber-700 rounded-lg text-xs font-semibold hover:bg-amber-50 transition-colors"
        >
          Afstemmen
        </button>
        <button
          onClick={onReview}
          className="px-3 min-h-[44px] text-gray-500 text-xs font-semibold hover:text-gray-700 transition-colors"
        >
          Apart houden
        </button>
      </div>
    </div>
  );
}
