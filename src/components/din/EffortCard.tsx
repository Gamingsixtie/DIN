"use client";

import { useState } from "react";
import type { DINEffort, EffortDomain } from "@/lib/types";

interface EffortSuggestion {
  description: string;
  quarter: string;
}

interface EffortCardProps {
  effort: DINEffort;
  onChange: (updated: DINEffort) => void;
  onDelete: () => void;
  onAISuggest?: () => Promise<EffortSuggestion | null>;
}

const DOMAIN_COLORS: Record<EffortDomain, { bg: string; text: string }> = {
  mens: { bg: "bg-domain-mens/10", text: "text-domain-mens" },
  processen: { bg: "bg-domain-processen/10", text: "text-domain-processen" },
  data_systemen: { bg: "bg-domain-data/10", text: "text-domain-data" },
  cultuur: { bg: "bg-domain-cultuur/10", text: "text-domain-cultuur" },
};

const DOMAIN_LABELS: Record<EffortDomain, string> = {
  mens: "Mens",
  processen: "Processen",
  data_systemen: "Data & Systemen",
  cultuur: "Cultuur",
};

export default function EffortCard({
  effort,
  onChange,
  onDelete,
  onAISuggest,
}: EffortCardProps) {
  const colors = DOMAIN_COLORS[effort.domain];
  const [isAILoading, setIsAILoading] = useState(false);
  const [aiSuggestion, setAiSuggestion] = useState<EffortSuggestion | null>(null);

  async function handleAISuggest() {
    if (!onAISuggest || isAILoading) return;
    setIsAILoading(true);
    try {
      const result = await onAISuggest();
      if (result) {
        setAiSuggestion(result);
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
      ...effort,
      description: aiSuggestion.description || effort.description,
      quarter: aiSuggestion.quarter || effort.quarter,
    });
    setAiSuggestion(null);
  }

  return (
    <div className={`border rounded-lg p-3 ${colors.bg} border-gray-200`}>
      <div className="flex items-start justify-between gap-2">
        <div className="flex-1">
          <input
            value={effort.description}
            onChange={(e) =>
              onChange({ ...effort, description: e.target.value })
            }
            className="w-full text-sm bg-transparent border-b border-transparent hover:border-gray-300 focus:border-cito-blue focus:outline-none pb-0.5"
            placeholder="Beschrijf de inspanning..."
          />
        </div>
        <div className="flex gap-1">
          {onAISuggest && (
            <button
              onClick={handleAISuggest}
              disabled={isAILoading}
              className="text-xs px-1.5 py-0.5 rounded text-cito-accent hover:bg-cito-accent/10 disabled:opacity-50 transition-colors"
              title="AI-suggestie voor deze inspanning"
            >
              {isAILoading ? (
                <span className="inline-block animate-spin">&#9881;</span>
              ) : (
                "AI"
              )}
            </button>
          )}
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
        <div className="mt-2 p-3 bg-cito-accent/5 border border-cito-accent/20 rounded-lg">
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
          <div className="text-sm text-gray-700">
            <p><span className="font-medium">Inspanning:</span> {aiSuggestion.description}</p>
            {aiSuggestion.quarter && (
              <p className="mt-1"><span className="font-medium">Planning:</span> {aiSuggestion.quarter}</p>
            )}
          </div>
        </div>
      )}

      <div className="mt-2 flex items-center gap-2 text-xs">
        <span className={`font-medium ${colors.text}`}>
          {DOMAIN_LABELS[effort.domain]}
        </span>
        <select
          value={effort.quarter || ""}
          onChange={(e) => onChange({ ...effort, quarter: e.target.value })}
          className="px-2 py-0.5 border border-gray-200 rounded bg-white/70 text-xs focus:outline-none"
        >
          <option value="">Kwartaal...</option>
          <option value="Nader te bepalen">Nader te bepalen</option>
          <option value="Q1 2026">Q1 2026</option>
          <option value="Q2 2026">Q2 2026</option>
          <option value="Q3 2026">Q3 2026</option>
          <option value="Q4 2026">Q4 2026</option>
          <option value="Q1 2027">Q1 2027</option>
          <option value="Q2 2027">Q2 2027</option>
        </select>
        <select
          value={effort.status}
          onChange={(e) =>
            onChange({
              ...effort,
              status: e.target.value as DINEffort["status"],
            })
          }
          className="px-2 py-0.5 border border-gray-200 rounded bg-white/70 text-xs focus:outline-none"
        >
          <option value="gepland">Gepland</option>
          <option value="in_uitvoering">In uitvoering</option>
          <option value="afgerond">Afgerond</option>
          <option value="on_hold">On hold</option>
        </select>
      </div>
    </div>
  );
}

export { DOMAIN_LABELS, DOMAIN_COLORS };
