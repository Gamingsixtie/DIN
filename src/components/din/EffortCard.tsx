"use client";

import type { DINEffort, EffortDomain } from "@/lib/types";

interface EffortCardProps {
  effort: DINEffort;
  onChange: (updated: DINEffort) => void;
  onDelete: () => void;
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
}: EffortCardProps) {
  const colors = DOMAIN_COLORS[effort.domain];

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
        <button
          onClick={onDelete}
          className="text-xs text-gray-400 hover:text-red-500 px-1"
        >
          ✕
        </button>
      </div>
      <div className="mt-2 flex items-center gap-2 text-xs">
        <span className={`font-medium ${colors.text}`}>
          {DOMAIN_LABELS[effort.domain]}
        </span>
        <input
          value={effort.quarter || ""}
          onChange={(e) => onChange({ ...effort, quarter: e.target.value })}
          className="px-2 py-0.5 border border-gray-200 rounded bg-white/70 text-xs w-20 focus:outline-none"
          placeholder="Q1 2026"
        />
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
