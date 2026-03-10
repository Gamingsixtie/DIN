"use client";

import { useState } from "react";
import type { DINEffort, EffortDomain } from "@/lib/types";

interface EffortSuggestion {
  feedback?: string;
  description: string;
  quarter: string;
}

interface EffortCardProps {
  effort: DINEffort;
  onChange: (updated: DINEffort) => void;
  onDelete: () => void;
  onAISuggest?: (userPrompt?: string) => Promise<EffortSuggestion | null>;
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
        <div className="flex gap-1.5 items-center">
          {onAISuggest && (
            <button
              onClick={() => showPrompt ? handleAISuggest() : setShowPrompt(true)}
              disabled={isAILoading}
              className="text-xs px-2 py-1 rounded-md bg-cito-accent/10 text-cito-accent hover:bg-cito-accent/20 disabled:opacity-50 transition-colors font-medium"
              title="AI analyseert en scherpt deze inspanning aan"
            >
              {isAILoading ? (
                <span className="inline-block animate-spin">&#9881;</span>
              ) : (
                "Aanscherpen"
              )}
            </button>
          )}
          {confirmDelete ? (
            <div className="flex items-center gap-1">
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
            placeholder="Optioneel: wat wil je aanscherpen? (bijv. 'meer focus op training')"
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

      {/* AI Suggestie */}
      {aiSuggestion && (
        <div className="mt-2 p-3 bg-cito-accent/5 border border-cito-accent/20 rounded-lg space-y-3">
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
