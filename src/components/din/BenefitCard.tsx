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

type AanscherpVeld = "alles" | "beschrijving" | "indicator" | "eigenaar" | "waarden";

const VELD_LABELS: Record<AanscherpVeld, string> = {
  alles: "Alles",
  beschrijving: "Beschrijving",
  indicator: "Indicator",
  eigenaar: "Eigenaar",
  waarden: "Waarden",
};

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
  const [showAIPanel, setShowAIPanel] = useState(false);
  const [selectedVelden, setSelectedVelden] = useState<Set<AanscherpVeld>>(new Set(["alles"]));
  const [userPrompt, setUserPrompt] = useState("");
  // Undo: bewaar vorige staat na toepassen
  const [previousState, setPreviousState] = useState<DINBenefit | null>(null);

  function toggleVeld(veld: AanscherpVeld) {
    const next = new Set(selectedVelden);
    if (veld === "alles") {
      setSelectedVelden(new Set(["alles"]));
      return;
    }
    next.delete("alles");
    if (next.has(veld)) {
      next.delete(veld);
      if (next.size === 0) next.add("alles");
    } else {
      next.add(veld);
    }
    setSelectedVelden(next);
  }

  function buildPromptPrefix(): string {
    if (selectedVelden.has("alles")) return "";
    const labels = Array.from(selectedVelden).map((v) => VELD_LABELS[v]);
    return `Focus ALLEEN op het aanscherpen van: ${labels.join(", ")}. Laat de andere velden zo dicht mogelijk bij de huidige waarden. `;
  }

  async function handleAISuggest() {
    if (!onAISuggest || isAILoading) return;
    setIsAILoading(true);
    try {
      const prefix = buildPromptPrefix();
      const fullPrompt = prefix + (userPrompt || "");
      const result = await onAISuggest(fullPrompt || undefined);
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

  function applySuggestion(fields?: AanscherpVeld[]) {
    if (!aiSuggestion) return;
    // Bewaar huidige staat voor undo
    setPreviousState({ ...benefit, profiel: { ...benefit.profiel } });

    const applyAll = !fields || fields.includes("alles");
    const applySet = new Set(fields || ["alles"]);

    const updated = { ...benefit, profiel: { ...benefit.profiel } };

    if (applyAll || applySet.has("beschrijving")) {
      if (aiSuggestion.description) updated.description = aiSuggestion.description;
    }
    if (applyAll || applySet.has("indicator")) {
      if (aiSuggestion.indicator) updated.profiel.indicator = aiSuggestion.indicator;
    }
    if (applyAll || applySet.has("eigenaar")) {
      if (aiSuggestion.indicatorOwner) updated.profiel.indicatorOwner = aiSuggestion.indicatorOwner;
    }
    if (applyAll || applySet.has("waarden")) {
      if (aiSuggestion.currentValue) updated.profiel.currentValue = aiSuggestion.currentValue;
      if (aiSuggestion.targetValue) updated.profiel.targetValue = aiSuggestion.targetValue;
    }

    onChange(updated);
    setAiSuggestion(null);
    setShowAIPanel(false);
  }

  function handleUndo() {
    if (!previousState) return;
    onChange(previousState);
    setPreviousState(null);
  }

  // Completeness check
  const missing: string[] = [];
  if (!benefit.description) missing.push("beschrijving");
  if (!benefit.profiel.indicator) missing.push("indicator");
  if (!benefit.profiel.indicatorOwner) missing.push("eigenaar");
  if (!benefit.profiel.currentValue) missing.push("huidige waarde");
  if (!benefit.profiel.targetValue) missing.push("gewenste waarde");

  return (
    <div className="border border-blue-200 rounded-lg p-4 bg-blue-50/50 min-w-0 overflow-hidden">
      <div className="flex items-start justify-between gap-2">
        <div className="flex-1 min-w-0">
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
              onClick={() => setShowAIPanel(!showAIPanel)}
              disabled={isAILoading}
              className={`text-xs px-2 py-1 rounded-md font-medium transition-colors disabled:opacity-50 ${
                showAIPanel
                  ? "bg-cito-accent text-white"
                  : "bg-cito-accent/10 text-cito-accent hover:bg-cito-accent/20"
              }`}
              title="AI analyseert en scherpt deze baat aan"
            >
              {isAILoading ? (
                <span className="inline-block animate-spin">&#9881;</span>
              ) : (
                "Aanscherpen"
              )}
            </button>
          )}
          {previousState && (
            <button
              onClick={handleUndo}
              className="text-xs px-2 py-1 rounded-md bg-amber-100 text-amber-700 hover:bg-amber-200 transition-colors font-medium"
              title="Laatste AI-wijziging ongedaan maken"
            >
              Ongedaan
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

      {/* AI Panel: selectie + prompt */}
      {showAIPanel && !aiSuggestion && (
        <div className="mt-3 p-3 bg-cito-accent/5 border border-cito-accent/20 rounded-lg space-y-2">
          <div className="flex items-center justify-between mb-1">
            <span className="text-xs font-semibold text-cito-accent">Wat wil je aanscherpen?</span>
            <button onClick={() => setShowAIPanel(false)} className="text-xs text-gray-400 hover:text-gray-600">&#10005;</button>
          </div>
          <div className="flex flex-wrap gap-1.5">
            {(Object.keys(VELD_LABELS) as AanscherpVeld[]).map((veld) => (
              <button
                key={veld}
                onClick={() => toggleVeld(veld)}
                className={`text-[11px] px-2.5 py-1 rounded-full font-medium transition-colors ${
                  selectedVelden.has(veld)
                    ? "bg-cito-accent text-white"
                    : "bg-white border border-gray-200 text-gray-600 hover:border-cito-accent/50"
                }`}
              >
                {VELD_LABELS[veld]}
              </button>
            ))}
          </div>
          <div className="flex gap-2 items-center mt-2">
            <input
              value={userPrompt}
              onChange={(e) => setUserPrompt(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleAISuggest()}
              className="flex-1 text-xs px-2 py-1.5 border border-gray-200 rounded-md focus:outline-none focus:ring-1 focus:ring-cito-accent/50 bg-white"
              placeholder="Optioneel: beschrijf wat je wilt (bijv. 'maak meetbaarder')"
            />
            <button
              onClick={handleAISuggest}
              disabled={isAILoading}
              className="text-xs px-3 py-1.5 bg-cito-accent text-white rounded-md hover:bg-cito-blue transition-colors font-medium shrink-0 disabled:opacity-50"
            >
              {isAILoading ? "Bezig..." : "Verstuur"}
            </button>
          </div>
        </div>
      )}

      {/* AI Suggestie met per-veld toepassen */}
      {aiSuggestion && (
        <div className="mt-3 p-3 bg-cito-accent/5 border border-cito-accent/20 rounded-lg space-y-3">
          {aiSuggestion.feedback && (
            <div className="p-2 bg-amber-50 border border-amber-200 rounded text-xs text-amber-800">
              <span className="font-semibold">Analyse: </span>
              {aiSuggestion.feedback}
            </div>
          )}

          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-cito-accent">Suggestie</span>
            <div className="flex gap-2">
              <button
                onClick={() => applySuggestion(["alles"])}
                className="text-xs px-3 py-1 bg-cito-accent text-white rounded-md hover:bg-cito-blue transition-colors font-medium"
              >
                Alles toepassen
              </button>
              <button
                onClick={() => { setAiSuggestion(null); setShowAIPanel(false); }}
                className="text-xs px-2 py-1 text-gray-500 hover:text-gray-700"
              >
                Sluiten
              </button>
            </div>
          </div>

          {/* Per-veld vergelijking met individuele toepas-knoppen */}
          <div className="space-y-1.5">
            {aiSuggestion.description && aiSuggestion.description !== benefit.description && (
              <SuggestionRow
                label="Beschrijving"
                current={benefit.description}
                suggested={aiSuggestion.description}
                onApply={() => applySuggestion(["beschrijving"])}
              />
            )}
            {aiSuggestion.indicator && aiSuggestion.indicator !== benefit.profiel.indicator && (
              <SuggestionRow
                label="Indicator"
                current={benefit.profiel.indicator}
                suggested={aiSuggestion.indicator}
                onApply={() => applySuggestion(["indicator"])}
              />
            )}
            {aiSuggestion.indicatorOwner && aiSuggestion.indicatorOwner !== benefit.profiel.indicatorOwner && (
              <SuggestionRow
                label="Eigenaar"
                current={benefit.profiel.indicatorOwner}
                suggested={aiSuggestion.indicatorOwner}
                onApply={() => applySuggestion(["eigenaar"])}
              />
            )}
            {(aiSuggestion.currentValue || aiSuggestion.targetValue) &&
              (aiSuggestion.currentValue !== benefit.profiel.currentValue || aiSuggestion.targetValue !== benefit.profiel.targetValue) && (
              <SuggestionRow
                label="Waarden"
                current={`${benefit.profiel.currentValue || "?"} \u2192 ${benefit.profiel.targetValue || "?"}`}
                suggested={`${aiSuggestion.currentValue || "?"} \u2192 ${aiSuggestion.targetValue || "?"}`}
                onApply={() => applySuggestion(["waarden"])}
              />
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

/** Rij die huidig vs. gesuggereerd veld toont met een toepas-knop */
function SuggestionRow({ label, current, suggested, onApply }: {
  label: string;
  current: string;
  suggested: string;
  onApply: () => void;
}) {
  return (
    <div className="flex items-start gap-2 text-xs bg-white/60 rounded px-2 py-1.5">
      <span className="font-medium text-gray-500 w-20 shrink-0">{label}</span>
      <div className="flex-1 min-w-0">
        {current && (
          <div className="text-gray-400 line-through truncate">{current}</div>
        )}
        <div className="text-gray-700">{suggested}</div>
      </div>
      <button
        onClick={onApply}
        className="text-[10px] px-2 py-0.5 bg-cito-accent/10 text-cito-accent rounded hover:bg-cito-accent/20 transition-colors font-medium shrink-0"
      >
        Toepassen
      </button>
    </div>
  );
}
