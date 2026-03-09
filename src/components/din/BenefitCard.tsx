"use client";

import { useState } from "react";
import type { DINBenefit } from "@/lib/types";

interface BenefitSuggestion {
  description: string;
  indicator: string;
  indicatorOwner: string;
  currentValue: string;
  targetValue: string;
}

interface BenefitCardProps {
  benefit: DINBenefit;
  onChange: (updated: DINBenefit) => void;
  onDelete: () => void;
  onAISuggest?: () => Promise<BenefitSuggestion | null>;
}

export default function BenefitCard({
  benefit,
  onChange,
  onDelete,
  onAISuggest,
}: BenefitCardProps) {
  const [expanded, setExpanded] = useState(false);
  const [isAILoading, setIsAILoading] = useState(false);
  const [aiSuggestion, setAiSuggestion] = useState<BenefitSuggestion | null>(null);

  async function handleAISuggest() {
    if (!onAISuggest || isAILoading) return;
    setIsAILoading(true);
    try {
      const result = await onAISuggest();
      if (result) {
        setAiSuggestion(result);
        setExpanded(true);
      }
    } catch (e) {
      console.error("AI suggestie mislukt:", e);
    } finally {
      setIsAILoading(false);
    }
  }

  function applySuggestion() {
    if (!aiSuggestion) return;
    onChange({
      ...benefit,
      description: aiSuggestion.description || benefit.description,
      profiel: {
        ...benefit.profiel,
        indicator: aiSuggestion.indicator || benefit.profiel.indicator,
        indicatorOwner: aiSuggestion.indicatorOwner || benefit.profiel.indicatorOwner,
        currentValue: aiSuggestion.currentValue || benefit.profiel.currentValue,
        targetValue: aiSuggestion.targetValue || benefit.profiel.targetValue,
      },
    });
    setAiSuggestion(null);
  }

  return (
    <div className="border border-blue-200 rounded-lg p-4 bg-blue-50/50">
      <div className="flex items-start justify-between">
        <div className="flex-1">
          <input
            value={benefit.description}
            onChange={(e) =>
              onChange({ ...benefit, description: e.target.value })
            }
            className="w-full font-medium text-sm bg-transparent border-b border-transparent hover:border-gray-300 focus:border-cito-blue focus:outline-none pb-0.5"
            placeholder="Beschrijf de baat..."
          />
        </div>
        <div className="flex gap-1 ml-2">
          {onAISuggest && (
            <button
              onClick={handleAISuggest}
              disabled={isAILoading}
              className="text-xs px-1.5 py-0.5 rounded text-cito-accent hover:bg-cito-accent/10 disabled:opacity-50 transition-colors"
              title="AI-suggestie voor deze baat"
            >
              {isAILoading ? (
                <span className="inline-block animate-spin">&#9881;</span>
              ) : (
                "AI"
              )}
            </button>
          )}
          <button
            onClick={() => setExpanded(!expanded)}
            className="text-xs text-gray-400 hover:text-cito-blue px-1"
          >
            {expanded ? "\u25B2" : "\u25BC"}
          </button>
          <button
            onClick={onDelete}
            className="text-xs text-gray-400 hover:text-red-500 px-1"
          >
            \u2715
          </button>
        </div>
      </div>

      {/* AI Suggestie */}
      {aiSuggestion && (
        <div className="mt-3 p-3 bg-cito-accent/5 border border-cito-accent/20 rounded-lg">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-semibold text-cito-accent">AI Suggestie</span>
            <div className="flex gap-2">
              <button
                onClick={applySuggestion}
                className="text-xs px-2 py-1 bg-cito-accent text-white rounded hover:bg-cito-blue transition-colors"
              >
                Toepassen
              </button>
              <button
                onClick={() => setAiSuggestion(null)}
                className="text-xs px-2 py-1 text-gray-500 hover:text-gray-700"
              >
                Sluiten
              </button>
            </div>
          </div>
          <div className="text-sm text-gray-700 space-y-1">
            <p><span className="font-medium">Baat:</span> {aiSuggestion.description}</p>
            {aiSuggestion.indicator && (
              <p><span className="font-medium">Indicator:</span> {aiSuggestion.indicator}</p>
            )}
            {aiSuggestion.indicatorOwner && (
              <p><span className="font-medium">Eigenaar:</span> {aiSuggestion.indicatorOwner}</p>
            )}
            {aiSuggestion.currentValue && (
              <p><span className="font-medium">Nu:</span> {aiSuggestion.currentValue} <span className="font-medium">Doel:</span> {aiSuggestion.targetValue}</p>
            )}
          </div>
        </div>
      )}

      {expanded && (
        <div className="mt-3 grid grid-cols-2 gap-3 text-sm">
          <div>
            <label className="text-xs text-gray-500">Indicator</label>
            <input
              value={benefit.profiel.indicator}
              onChange={(e) =>
                onChange({
                  ...benefit,
                  profiel: { ...benefit.profiel, indicator: e.target.value },
                })
              }
              className="w-full px-2 py-1 border border-gray-200 rounded text-sm focus:outline-none focus:ring-1 focus:ring-cito-blue/30"
              placeholder="Meetbare KPI..."
            />
          </div>
          <div>
            <label className="text-xs text-gray-500">Eigenaar</label>
            <input
              value={benefit.profiel.indicatorOwner}
              onChange={(e) =>
                onChange({
                  ...benefit,
                  profiel: {
                    ...benefit.profiel,
                    indicatorOwner: e.target.value,
                  },
                })
              }
              className="w-full px-2 py-1 border border-gray-200 rounded text-sm focus:outline-none focus:ring-1 focus:ring-cito-blue/30"
              placeholder="Rol/functie..."
            />
          </div>
          <div>
            <label className="text-xs text-gray-500">Huidige waarde</label>
            <input
              value={benefit.profiel.currentValue}
              onChange={(e) =>
                onChange({
                  ...benefit,
                  profiel: {
                    ...benefit.profiel,
                    currentValue: e.target.value,
                  },
                })
              }
              className="w-full px-2 py-1 border border-gray-200 rounded text-sm focus:outline-none focus:ring-1 focus:ring-cito-blue/30"
              placeholder="Nu..."
            />
          </div>
          <div>
            <label className="text-xs text-gray-500">Gewenste waarde</label>
            <input
              value={benefit.profiel.targetValue}
              onChange={(e) =>
                onChange({
                  ...benefit,
                  profiel: {
                    ...benefit.profiel,
                    targetValue: e.target.value,
                  },
                })
              }
              className="w-full px-2 py-1 border border-gray-200 rounded text-sm focus:outline-none focus:ring-1 focus:ring-cito-blue/30"
              placeholder="Doel..."
            />
          </div>
        </div>
      )}
    </div>
  );
}
