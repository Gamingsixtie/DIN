"use client";

import { useState } from "react";
import type { DINCapability } from "@/lib/types";

interface CapabilityCardProps {
  capability: DINCapability;
  onChange: (updated: DINCapability) => void;
  onDelete: () => void;
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
          const isExact = value === level;
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
}: CapabilityCardProps) {
  const [expanded, setExpanded] = useState(false);

  const gap =
    capability.targetLevel && capability.currentLevel
      ? capability.targetLevel - capability.currentLevel
      : undefined;

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
            {expanded ? "▲" : "▼"}
          </button>
          <button
            onClick={onDelete}
            className="text-xs text-gray-400 hover:text-red-500 px-1"
          >
            ✕
          </button>
        </div>
      </div>

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
