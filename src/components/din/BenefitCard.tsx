"use client";

import { useState } from "react";
import type { DINBenefit } from "@/lib/types";

interface BenefitCardProps {
  benefit: DINBenefit;
  onChange: (updated: DINBenefit) => void;
  onDelete: () => void;
}

export default function BenefitCard({
  benefit,
  onChange,
  onDelete,
}: BenefitCardProps) {
  const [expanded, setExpanded] = useState(false);

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
