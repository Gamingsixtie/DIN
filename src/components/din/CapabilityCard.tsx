"use client";

import { useState } from "react";
import type { DINCapability } from "@/lib/types";

interface CapabilitySuggestion {
  description: string;
  currentLevel: number;
  targetLevel: number;
}

interface CapabilityCardProps {
  capability: DINCapability;
  onChange: (updated: DINCapability) => void;
  onDelete: () => void;
  onAISuggest?: () => Promise<CapabilitySuggestion | null>;
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

  const gap =
    capability.targetLevel && capability.currentLevel
      ? capability.targetLevel - capability.currentLevel
      : undefined;

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
      ...capability,
      description: aiSuggestion.description || capability.description,
      currentLevel: aiSuggestion.currentLevel || capability.currentLevel,
      targetLevel: aiSuggestion.targetLevel || capability.targetLevel,
    });
    setAiSuggestion(null);
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
        <div className="flex gap-1 shrink-0">
          {onAISuggest && (
            <button
              onClick={handleAISuggest}
              disabled={isAILoading}
              className="text-xs px-1.5 py-0.5 rounded text-cito-accent hover:bg-cito-accent/10 disabled:opacity-50 transition-colors"
              title="AI-suggestie voor dit vermogen"
            >
              {isAILoading ? (
                <span className="inline-block animate-spin">&#9881;</span>
              ) : (
                "AI"
              )}
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
            <p><span className="font-medium">Vermogen:</span> {aiSuggestion.description}</p>
            <p>
              <span className="font-medium">Niveau:</span>{" "}
              <span className="text-amber-600">{aiSuggestion.currentLevel}/5 ({LEVEL_LABELS[aiSuggestion.currentLevel]})</span>
              {" \u2192 "}
              <span className="text-green-600">{aiSuggestion.targetLevel}/5 ({LEVEL_LABELS[aiSuggestion.targetLevel]})</span>
            </p>
          </div>
        </div>
      )}

      {/* Compact score weergave als niet expanded */}
      {!expanded &&
        (capability.currentLevel || capability.targetLevel) && (
          <div className="mt-1.5 flex items-center gap-3 text-[10px] text-gray-500">
            {capability.currentLevel && (
              <span>
                Nu:{" "}
                <span className="font-medium text-amber-600">
                  {capability.currentLevel}/5
                </span>
              </span>
            )}
            {capability.targetLevel && (
              <span>
                Doel:{" "}
                <span className="font-medium text-green-600">
                  {capability.targetLevel}/5
                </span>
              </span>
            )}
          </div>
        )}

      {/* Expanded: score selectors */}
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
