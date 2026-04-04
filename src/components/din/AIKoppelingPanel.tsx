"use client";

import { useState } from "react";
import type {
  ExternalProject,
  DINCapability,
  SectorName,
  ProjectCapabilityMap,
} from "@/lib/types";

// --- Types ---

interface AIKoppelingPanelProps {
  projects: ExternalProject[];
  capabilities: DINCapability[];
  sectorName: SectorName;
  existingMaps: ProjectCapabilityMap[];
  onConfirmMappings: (maps: ProjectCapabilityMap[]) => void;
}

interface AIMatchResult {
  projectId: string;
  suggestedCapabilityIds: string[];
  confidence: "hoog" | "gemiddeld" | "laag";
  toelichting: string;
  warning?: string;
}

// --- Constants ---

const CONFIDENCE_COLORS: Record<string, string> = {
  hoog: "bg-green-500",
  gemiddeld: "bg-amber-500",
  laag: "bg-gray-400",
};

// --- Component ---

export default function AIKoppelingPanel({
  projects,
  capabilities,
  sectorName,
  existingMaps,
  onConfirmMappings,
}: AIKoppelingPanelProps) {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [matches, setMatches] = useState<AIMatchResult[]>([]);
  const [acceptedMaps, setAcceptedMaps] = useState<Map<string, Set<string>>>(
    new Map()
  );
  const [isConfirmed, setIsConfirmed] = useState(false);

  // Check if there are already confirmed mappings for these projects
  const hasExistingMaps = projects.some((p) =>
    existingMaps.some((m) => m.projectId === p.id)
  );

  async function handleAnalyze() {
    setIsLoading(true);
    setError(null);
    setMatches([]);
    setAcceptedMaps(new Map());
    setIsConfirmed(false);

    try {
      const res = await fetch("/api/match-projects", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          projects: projects.map((p) => ({
            id: p.id,
            name: p.name,
            description: p.description,
            domains: p.domains,
          })),
          capabilities: capabilities.map((c) => ({
            id: c.id,
            description: c.description,
            sectorId: c.sectorId,
          })),
          sectorName,
        }),
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(
          data.error ||
            "Het koppelen aan vermogens is mislukt. Probeer het opnieuw of koppel handmatig."
        );
      }

      const resultMatches: AIMatchResult[] = data.data.matches || [];
      setMatches(resultMatches);

      // Pre-accept all suggested mappings
      const initialAccepted = new Map<string, Set<string>>();
      for (const match of resultMatches) {
        initialAccepted.set(
          match.projectId,
          new Set(match.suggestedCapabilityIds)
        );
      }
      setAcceptedMaps(initialAccepted);
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Het koppelen aan vermogens is mislukt. Probeer het opnieuw of koppel handmatig."
      );
    } finally {
      setIsLoading(false);
    }
  }

  function toggleCapability(projectId: string, capabilityId: string) {
    setAcceptedMaps((prev) => {
      const next = new Map(prev);
      const set = new Set(next.get(projectId) || []);
      if (set.has(capabilityId)) {
        set.delete(capabilityId);
      } else {
        set.add(capabilityId);
      }
      next.set(projectId, set);
      return next;
    });
  }

  function handleConfirm() {
    const maps: ProjectCapabilityMap[] = [];
    for (const [projectId, capIds] of acceptedMaps) {
      for (const capabilityId of capIds) {
        maps.push({ projectId, capabilityId });
      }
    }
    onConfirmMappings(maps);
    setIsConfirmed(true);
  }

  // No capabilities available
  if (capabilities.length === 0) {
    return (
      <div className="p-3 bg-gray-50 border border-gray-200 rounded-lg">
        <p className="text-xs text-gray-500">
          Voeg eerst vermogens toe voordat je koppelingen kunt analyseren.
        </p>
      </div>
    );
  }

  return (
    <div
      className={`p-4 rounded-lg border ${
        isConfirmed || hasExistingMaps
          ? "bg-green-50/30 border-green-200"
          : "bg-blue-50/30 border-blue-100"
      }`}
    >
      {/* Header with action buttons */}
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <span className="text-xs font-semibold text-gray-600">
            AI-koppelingen
          </span>
          {(isConfirmed || hasExistingMaps) && (
            <span className="px-2 py-0.5 text-xs font-medium bg-green-100 text-green-700 rounded">
              Gekoppeld
            </span>
          )}
        </div>
        <div className="flex items-center gap-2">
          {matches.length > 0 && (
            <button
              onClick={handleAnalyze}
              className="text-xs text-gray-500 hover:text-cito-blue"
            >
              Opnieuw analyseren
            </button>
          )}
          {matches.length === 0 && !isLoading && (
            <button
              onClick={handleAnalyze}
              disabled={isLoading}
              className="px-3 py-2 bg-cito-blue text-white text-xs rounded hover:bg-cito-blue-light disabled:opacity-50 flex items-center gap-1.5"
            >
              Analyseer koppelingen
            </button>
          )}
        </div>
      </div>

      {/* Loading state */}
      {isLoading && (
        <div className="space-y-3">
          {projects.map((p) => (
            <div key={p.id} className="flex items-center gap-3">
              <div className="h-4 w-32 bg-gray-200 rounded animate-pulse" />
              <span className="text-gray-300">{"\u2192"}</span>
              <div className="flex gap-1.5">
                <div className="h-6 w-24 bg-gray-200 rounded animate-pulse" />
                <div className="h-6 w-20 bg-gray-200 rounded animate-pulse" />
              </div>
            </div>
          ))}
          <p className="text-xs text-gray-400">Bezig met koppelen...</p>
        </div>
      )}

      {/* Error state */}
      {error && (
        <div className="bg-red-100 text-red-700 rounded p-2 text-xs mb-3">
          {error}
        </div>
      )}

      {/* Match results */}
      {matches.length > 0 && !isLoading && (
        <div className="space-y-3">
          {matches.map((match) => {
            const project = projects.find((p) => p.id === match.projectId);
            if (!project) return null;

            const accepted = acceptedMaps.get(match.projectId) || new Set();

            return (
              <div key={match.projectId} className="space-y-1.5">
                {/* Project row */}
                <div className="flex items-start gap-2 flex-wrap">
                  <span className="text-sm font-medium text-gray-700 shrink-0">
                    {project.name}
                  </span>
                  <span className="text-gray-400 shrink-0">{"\u2192"}</span>
                  <div className="flex flex-wrap gap-1.5">
                    {match.suggestedCapabilityIds.map((capId) => {
                      const cap = capabilities.find((c) => c.id === capId);
                      if (!cap) return null;
                      const isAccepted = accepted.has(capId);

                      return (
                        <button
                          key={capId}
                          onClick={() =>
                            !isConfirmed &&
                            toggleCapability(match.projectId, capId)
                          }
                          disabled={isConfirmed}
                          className={`px-2 py-1 text-xs rounded border transition-all flex items-center gap-1 ${
                            isAccepted
                              ? "bg-[#0891b2]/10 text-[#0891b2] border-[#0891b2]/20 ring-2 ring-[#0891b2]/40"
                              : "bg-gray-100 text-gray-400 border-gray-200 opacity-40 line-through"
                          } ${!isConfirmed ? "cursor-pointer hover:opacity-100" : ""}`}
                        >
                          <span
                            className={`w-1.5 h-1.5 rounded-full ${
                              CONFIDENCE_COLORS[match.confidence] ||
                              "bg-gray-400"
                            }`}
                          />
                          {cap.description.slice(0, 50)}
                          {cap.description.length > 50 ? "..." : ""}
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* Toelichting */}
                {match.toelichting && (
                  <p className="text-xs text-gray-500 mt-1 ml-0">
                    {match.toelichting}
                  </p>
                )}

                {/* Warning */}
                {match.warning && (
                  <p className="text-xs text-amber-600 mt-0.5 ml-0">
                    {match.warning}
                  </p>
                )}
              </div>
            );
          })}

          {/* Confirm button */}
          {!isConfirmed && (
            <div className="flex items-center gap-3 pt-2 border-t border-blue-100">
              <button
                onClick={handleConfirm}
                className="px-3 py-2 bg-cito-blue text-white text-xs rounded hover:bg-cito-blue-light"
              >
                Bevestig koppelingen
              </button>
              <span className="text-xs text-gray-400">
                {Array.from(acceptedMaps.values()).reduce(
                  (sum, set) => sum + set.size,
                  0
                )}{" "}
                koppelingen geselecteerd
              </span>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
