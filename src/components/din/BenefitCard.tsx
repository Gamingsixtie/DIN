"use client";

import { useState } from "react";
import type { DINBenefit } from "@/lib/types";

interface BenefitSuggestion {
  feedback?: string;
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
  onAISuggest?: (userPrompt?: string) => Promise<BenefitSuggestion | null>;
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
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [showPrompt, setShowPrompt] = useState(false);
  const [userPrompt, setUserPrompt] = useState("");

  async function handleAISuggest() {
    if (!onAISuggest || isAILoading) return;
    setIsAILoading(true);
    setShowPrompt(false);
    try {
      const result = await onAISuggest(userPrompt || undefined);
      if (result) {
        setAiSuggestion(result);
        setExpanded(true);
      }
    } catch (e) {
      console.error("AI suggestie mislukt:", e);
    } finally {
      setIsAILoading(false);
      setUserPrompt("");
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

  // Completeness check
  const missing: string[] = [];
  if (!benefit.description) missing.push("beschrijving");
  if (!benefit.profiel.indicator) missing.push("indicator");
  if (!benefit.profiel.indicatorOwner) missing.push("eigenaar");
  if (!benefit.profiel.currentValue) missing.push("huidige waarde");
  if (!benefit.profiel.targetValue) missing.push("gewenste waarde");

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
          {missing.length > 0 && !expanded && (
            <p className="text-[10px] text-amber-500 mt-1">
              Ontbreekt: {missing.join(", ")}
            </p>
          )}
        </div>
        <div className="flex gap-1.5 ml-2 items-center">
          {onAISuggest && (
            <button
              onClick={() => showPrompt ? handleAISuggest() : setShowPrompt(true)}
              disabled={isAILoading}
              className="text-xs px-2 py-1 rounded-md bg-cito-accent/10 text-cito-accent hover:bg-cito-accent/20 disabled:opacity-50 transition-colors font-medium"
              title="AI analyseert en scherpt deze baat aan"
            >
              {isAILoading ? (
                <span className="inline-block animate-spin">&#9881;</span>
              ) : (
                "Aanscherpen"
              )}
            </button>
          )}
          <button
            onClick={() => setExpanded(!expanded)}
            className="text-xs text-gray-400 hover:text-cito-blue px-1"
            title={expanded ? "Inklappen" : "Profiel bewerken"}
          >
            {expanded ? "\u25B2" : "\u25BC"}
          </button>
          {confirmDelete ? (
            <div className="flex items-center gap-1 ml-1">
              <button
                onClick={onDelete}
                className="text-[10px] px-2 py-0.5 rounded bg-red-500 text-white hover:bg-red-600 transition-colors font-medium"
              >
                Verwijderen
              </button>
              <button
                onClick={() => setConfirmDelete(false)}
                className="text-[10px] px-1.5 py-0.5 rounded text-gray-500 hover:text-gray-700 hover:bg-gray-100 transition-colors"
              >
                Annuleren
              </button>
            </div>
          ) : (
            <button
              onClick={() => setConfirmDelete(true)}
              className="text-xs text-gray-300 hover:text-red-500 px-1 transition-colors"
              title="Verwijderen"
            >
              &#128465;
            </button>
          )}
        </div>
      </div>

      {/* Prompt veld voor AI */}
      {showPrompt && !isAILoading && (
        <div className="mt-2 flex gap-2 items-center">
          <input
            value={userPrompt}
            onChange={(e) => setUserPrompt(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && handleAISuggest()}
            className="flex-1 text-xs px-2 py-1.5 border border-cito-accent/30 rounded-md focus:outline-none focus:ring-1 focus:ring-cito-accent/50 bg-white"
            placeholder="Optioneel: wat wil je aanscherpen? (bijv. 'maak indicator specifieker')"
            autoFocus
          />
          <button
            onClick={handleAISuggest}
            className="text-xs px-3 py-1.5 bg-cito-accent text-white rounded-md hover:bg-cito-blue transition-colors font-medium shrink-0"
          >
            Verstuur
          </button>
          <button
            onClick={() => { setShowPrompt(false); setUserPrompt(""); }}
            className="text-xs text-gray-400 hover:text-gray-600 px-1"
          >
            &#10005;
          </button>
        </div>
      )}

      {/* AI Suggestie met feedback */}
      {aiSuggestion && (
        <div className="mt-3 p-3 bg-cito-accent/5 border border-cito-accent/20 rounded-lg space-y-3">
          {aiSuggestion.feedback && (
            <div className="p-2 bg-amber-50 border border-amber-200 rounded text-xs text-amber-800">
              <span className="font-semibold">Analyse: </span>
              {aiSuggestion.feedback}
            </div>
          )}

          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-cito-accent">Aangescherpte suggestie</span>
            <div className="flex gap-2">
              <button
                onClick={applySuggestion}
                className="text-xs px-3 py-1 bg-cito-accent text-white rounded-md hover:bg-cito-blue transition-colors font-medium"
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
              <p><span className="font-medium">Nu:</span> {aiSuggestion.currentValue} <span className="font-medium">&#8594; Doel:</span> {aiSuggestion.targetValue}</p>
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
