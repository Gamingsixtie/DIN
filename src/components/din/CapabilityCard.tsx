"use client";

import { useState } from "react";
import type { DINCapability } from "@/lib/types";

interface CapabilitySuggestion {
  feedback?: string;
  description: string;
  currentLevel: number;
  targetLevel: number;
}

type AanscherpVeld = "alles" | "beschrijving" | "niveaus";

const VELD_LABELS: Record<AanscherpVeld, string> = {
  alles: "Alles",
  beschrijving: "Beschrijving",
  niveaus: "Niveaus",
};

interface CapabilityCardProps {
  capability: DINCapability;
  onChange: (updated: DINCapability) => void;
  onDelete: () => void;
  onAISuggest?: (userPrompt?: string) => Promise<CapabilitySuggestion | null>;
}

const LEVEL_LABELS: Record<number, string> = {
  1: "Minimaal",
  2: "Basis",
  3: "Gevorderd",
  4: "Goed",
  5: "Excellent",
};

function LevelSelector({
  label,
  value,
  onChange,
  color,
}: {
  label: string;
  value: number | undefined;
  onChange: (v: number) => void;
  color: "current" | "target";
}) {
  return (
    <div>
      <div className="text-[10px] text-gray-500 mb-1">{label}</div>
      <div className="flex gap-0.5">
        {[1, 2, 3, 4, 5].map((level) => {
          const isActive = value !== undefined && level <= value;
          return (
            <button
              key={level}
              onClick={() => onChange(level)}
              className={`w-6 h-6 rounded text-[10px] font-semibold transition-colors ${
                isActive
                  ? color === "current"
                    ? "bg-amber-400 text-amber-900"
                    : "bg-green-500 text-white"
                  : "bg-gray-100 text-gray-400 hover:bg-gray-200"
              }`}
              title={`${level} — ${LEVEL_LABELS[level]}`}
            >
              {level}
            </button>
          );
        })}
        {value !== undefined && (
          <span className="text-[9px] text-gray-400 ml-1 self-center">
            {LEVEL_LABELS[value]}
          </span>
        )}
      </div>
    </div>
  );
}

export default function CapabilityCard({
  capability,
  onChange,
  onDelete,
  onAISuggest,
}: CapabilityCardProps) {
  const [expanded, setExpanded] = useState(false);
  const [isAILoading, setIsAILoading] = useState(false);
  const [aiSuggestion, setAiSuggestion] = useState<CapabilitySuggestion | null>(null);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [showAIPanel, setShowAIPanel] = useState(false);
  const [selectedVelden, setSelectedVelden] = useState<Set<AanscherpVeld>>(new Set(["alles"]));
  const [userPrompt, setUserPrompt] = useState("");
  const [previousState, setPreviousState] = useState<DINCapability | null>(null);

  const gap =
    capability.targetLevel && capability.currentLevel
      ? capability.targetLevel - capability.currentLevel
      : undefined;

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
    setPreviousState({ ...capability });

    const applyAll = !fields || fields.includes("alles");
    const applySet = new Set(fields || ["alles"]);
    const updated = { ...capability };

    if (applyAll || applySet.has("beschrijving")) {
      if (aiSuggestion.description) updated.description = aiSuggestion.description;
    }
    if (applyAll || applySet.has("niveaus")) {
      if (aiSuggestion.currentLevel) updated.currentLevel = aiSuggestion.currentLevel;
      if (aiSuggestion.targetLevel) updated.targetLevel = aiSuggestion.targetLevel;
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
    <div className="border border-cyan-200 rounded-lg p-3 bg-cyan-50/50">
      <div className="flex items-start gap-2">
        <input
          value={capability.description}
          onChange={(e) =>
            onChange({ ...capability, description: e.target.value })
          }
          className="flex-1 text-sm bg-transparent border-b border-transparent hover:border-gray-300 focus:border-cito-blue focus:outline-none"
          placeholder="Beschrijf het vermogen..."
        />
        <div className="flex gap-1.5 shrink-0 items-center">
          {onAISuggest && (
            <button
              onClick={() => setShowAIPanel(!showAIPanel)}
              disabled={isAILoading}
              className={`text-xs px-2 py-1 rounded-md font-medium transition-colors disabled:opacity-50 ${
                showAIPanel
                  ? "bg-cito-accent text-white"
                  : "bg-cito-accent/10 text-cito-accent hover:bg-cito-accent/20"
              }`}
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
            >
              Ongedaan
            </button>
          )}
          {gap !== undefined && gap > 0 && (
            <span
              className={`text-[10px] px-1.5 py-0.5 rounded font-medium ${
                gap >= 3
                  ? "bg-red-100 text-red-700"
                  : gap >= 2
                  ? "bg-amber-100 text-amber-700"
                  : "bg-green-100 text-green-700"
              }`}
            >
              +{gap}
            </span>
          )}
          <button
            onClick={() => setExpanded(!expanded)}
            className="text-xs text-gray-400 hover:text-cito-blue px-1"
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

      {/* AI Panel */}
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
              placeholder="Optioneel: wat wil je veranderen?"
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

      {/* AI Suggestie */}
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
          <div className="space-y-1.5">
            {aiSuggestion.description && aiSuggestion.description !== capability.description && (
              <div className="flex items-start gap-2 text-xs bg-white/60 rounded px-2 py-1.5">
                <span className="font-medium text-gray-500 w-20 shrink-0">Beschrijving</span>
                <div className="flex-1 min-w-0">
                  {capability.description && <div className="text-gray-400 line-through truncate">{capability.description}</div>}
                  <div className="text-gray-700">{aiSuggestion.description}</div>
                </div>
                <button onClick={() => applySuggestion(["beschrijving"])} className="text-[10px] px-2 py-0.5 bg-cito-accent/10 text-cito-accent rounded hover:bg-cito-accent/20 font-medium shrink-0">Toepassen</button>
              </div>
            )}
            {(aiSuggestion.currentLevel || aiSuggestion.targetLevel) && (
              <div className="flex items-start gap-2 text-xs bg-white/60 rounded px-2 py-1.5">
                <span className="font-medium text-gray-500 w-20 shrink-0">Niveaus</span>
                <div className="flex-1">
                  <span className="text-amber-600">{aiSuggestion.currentLevel}/5</span>
                  {" \u2192 "}
                  <span className="text-green-600">{aiSuggestion.targetLevel}/5</span>
                </div>
                <button onClick={() => applySuggestion(["niveaus"])} className="text-[10px] px-2 py-0.5 bg-cito-accent/10 text-cito-accent rounded hover:bg-cito-accent/20 font-medium shrink-0">Toepassen</button>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Compact score weergave */}
      {!expanded && (capability.currentLevel || capability.targetLevel) && (
        <div className="mt-1.5 flex items-center gap-3 text-[10px] text-gray-500">
          {capability.currentLevel && (
            <span>Nu: <span className="font-medium text-amber-600">{capability.currentLevel}/5</span></span>
          )}
          {capability.targetLevel && (
            <span>Doel: <span className="font-medium text-green-600">{capability.targetLevel}/5</span></span>
          )}
        </div>
      )}

      {expanded && (
        <div className="mt-3 flex gap-6">
          <LevelSelector
            label="Huidig niveau"
            value={capability.currentLevel}
            onChange={(v) => onChange({ ...capability, currentLevel: v })}
            color="current"
          />
          <LevelSelector
            label="Gewenst niveau"
            value={capability.targetLevel}
            onChange={(v) => onChange({ ...capability, targetLevel: v })}
            color="target"
          />
        </div>
      )}
    </div>
  );
}
