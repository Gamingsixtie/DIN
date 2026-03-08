"use client";

import { SECTORS } from "@/lib/types";
import type { SectorName } from "@/lib/types";

interface SectorTabsProps {
  activeSector: string;
  onSelect: (sector: SectorName) => void;
  sectorPlans?: { sectorName: string }[];
  completionCounts?: Record<string, { filled: number; total: number }>;
}

export default function SectorTabs({
  activeSector,
  onSelect,
  sectorPlans = [],
  completionCounts,
}: SectorTabsProps) {
  const uploadedSectors = new Set(sectorPlans.map((s) => s.sectorName));

  return (
    <div className="flex gap-1 border-b border-gray-200 mb-4">
      {SECTORS.map((sector) => {
        const counts = completionCounts?.[sector];
        return (
          <button
            key={sector}
            onClick={() => onSelect(sector)}
            className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
              activeSector === sector
                ? "border-cito-blue text-cito-blue"
                : "border-transparent text-gray-500 hover:text-gray-700"
            }`}
          >
            {sector}
            {counts && (
              <span
                className={`ml-1.5 text-xs ${
                  counts.filled === counts.total && counts.total > 0
                    ? "text-green-600"
                    : "text-gray-400"
                }`}
              >
                {counts.filled}/{counts.total}
              </span>
            )}
            {!counts && uploadedSectors.has(sector) && (
              <span className="ml-1.5 inline-block w-1.5 h-1.5 rounded-full bg-green-500" />
            )}
          </button>
        );
      })}
    </div>
  );
}
