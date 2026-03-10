"use client";

import { useState } from "react";
import type { DINEffort, EffortDomain } from "@/lib/types";

interface EffortSuggestion {
  feedback?: string;
  description: string;
  quarter: string;
}

type AanscherpVeld = "alles" | "beschrijving" | "planning";

const VELD_LABELS: Record<AanscherpVeld, string> = {
  alles: "Alles",
  beschrijving: "Beschrijving",
  planning: "Planning",
};

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
  const [showAIPanel, setShowAIPanel] = useState(false);
  const [selectedVelden, setSelectedVelden] = useState<Set<AanscherpVeld>>(new Set(["alles"]));
  const [userPrompt, setUserPrompt] = useState("");
  const [previousState, setPreviousState] = useState<DINEffort | null>(null);

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

  async function handleAISuggest() {
    if (!onAISuggest || isAILoading) return;
    setIsAILoading(true);
    try {
      let prefix = "";
      if (!selectedVelden.has("alles")) {
        const labels = Array.from(selectedVelden).map((v) => VELD_LABELS[v]);
        prefix = `Focus ALLEEN op: ${labels.join(", ")}. `;
      }
      const result = await onAISuggest((prefix + (userPrompt || "")) || undefined);
      if (result) {
        setAiSuggestion(result);
      }
    } catch (e) {
      console.error("AI suggestie mislukt:", e);
    } finally {
      setIsAILoading(false);
    }
  }

  function applySuggestion(fields?: AanscherpVeld[]) {
    if (!aiSuggestion) return;
    setPreviousState({ ...effort });

    const applyAll = !fields || fields.includes("alles");
    const applySet = new Set(fields || ["alles"]);
    const updated = { ...effort };

    if (applyAll || applySet.has("beschrijving")) {
      if (aiSuggestion.description) updated.description = aiSuggestion.description;
    }
    if (applyAll || applySet.has("planning")) {
      if (aiSuggestion.quarter) updated.quarter = aiSuggestion.quarter;
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
              onClick={() => setShowAIPanel(!showAIPanel)}
              disabled={isAILoading}
              className={`text-xs px-2 py-1 rounded-md font-medium transition-colors disabled:opacity-50 ${
                showAIPanel
                  ? "bg-cito-accent text-white"
                  : "bg-cito-accent/10 text-cito-accent hover:bg-cito-accent/20"
              }`}
              title="AI analyseert en scherpt deze inspanning aan"
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

      {/* AI Panel: selectie + prompt */}
      {showAIPanel && !aiSuggestion && (
        <div className="mt-2 p-3 bg-cito-accent/5 border border-cito-accent/20 rounded-lg space-y-2">
          <div className="text-xs font-semibold text-cito-accent mb-1">Wat wil je aanscherpen?</div>
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
              placeholder="Optioneel: wat wil je veranderen? (bijv. 'meer focus op training')"
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
        <div className="mt-2 p-3 bg-cito-accent/5 border border-cito-accent/20 rounded-lg space-y-3">
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
          <div className="space-y-1.5">
            {aiSuggestion.description && aiSuggestion.description !== effort.description && (
              <div className="flex items-start gap-2 text-xs bg-white/60 rounded px-2 py-1.5">
                <span className="font-medium text-gray-500 w-20 shrink-0">Beschrijving</span>
                <div className="flex-1 min-w-0">
                  {effort.description && <div className="text-gray-400 line-through truncate">{effort.description}</div>}
                  <div className="text-gray-700">{aiSuggestion.description}</div>
                </div>
                <button onClick={() => applySuggestion(["beschrijving"])} className="text-[10px] px-2 py-0.5 bg-cito-accent/10 text-cito-accent rounded hover:bg-cito-accent/20 font-medium shrink-0">Toepassen</button>
              </div>
            )}
            {aiSuggestion.quarter && aiSuggestion.quarter !== effort.quarter && (
              <div className="flex items-start gap-2 text-xs bg-white/60 rounded px-2 py-1.5">
                <span className="font-medium text-gray-500 w-20 shrink-0">Planning</span>
                <div className="flex-1 min-w-0">
                  {effort.quarter && <div className="text-gray-400 line-through">{effort.quarter}</div>}
                  <div className="text-gray-700">{aiSuggestion.quarter}</div>
                </div>
                <button onClick={() => applySuggestion(["planning"])} className="text-[10px] px-2 py-0.5 bg-cito-accent/10 text-cito-accent rounded hover:bg-cito-accent/20 font-medium shrink-0">Toepassen</button>
              </div>
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
