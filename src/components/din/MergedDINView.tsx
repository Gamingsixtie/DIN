"use client";

import { useState } from "react";
import type { DINSession, EffortDomain, SectorName } from "@/lib/types";
import { SECTORS, SECTOR_COLORS } from "@/lib/types";
import { findSharedCapabilities, getEffortsByDomainAllSectors } from "@/lib/din-service";
import { DOMAIN_LABELS } from "@/components/din/EffortCard";
import DINNetworkGraph from "@/components/din/DINNetworkGraph";

type ViewMode = "grafisch" | "tabel";

interface MergedDINViewProps {
  session: DINSession;
  onSwitchToEdit: () => void;
}

function SectorBadge({ sector }: { sector: string }) {
  const colors = SECTOR_COLORS[sector as SectorName] || "bg-gray-100 text-gray-700 border-gray-200";
  return (
    <span className={`inline-block px-1.5 py-0.5 rounded text-[10px] font-medium border ${colors}`}>
      {sector}
    </span>
  );
}

export default function MergedDINView({ session, onSwitchToEdit }: MergedDINViewProps) {
  const [viewMode, setViewMode] = useState<ViewMode>("grafisch");
  const sharedCaps = findSharedCapabilities(session.capabilities);
  const effortsByDomain = getEffortsByDomainAllSectors(session.efforts);

  const sectorsWithData = SECTORS.filter(
    (s) =>
      session.benefits.some((b) => b.sectorId === s) ||
      session.capabilities.some((c) => c.sectorId === s) ||
      session.efforts.some((e) => e.sectorId === s)
  );

  if (sectorsWithData.length === 0) {
    return (
      <div className="text-center py-12">
        <p className="text-gray-500 mb-4">
          Nog geen DIN-data per sector ingevuld. Vul eerst per sector het
          DIN-netwerk in.
        </p>
        <button
          onClick={onSwitchToEdit}
          className="px-4 py-2 bg-cito-blue text-white rounded-lg text-sm font-medium hover:bg-cito-blue-light"
        >
          Per Sector Invullen
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {/* Header met status + weergave toggle */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <h3 className="text-lg font-semibold text-cito-blue">
            Samengevoegd DIN-Netwerk
          </h3>
          <span className="text-xs text-gray-400">
            {sectorsWithData.length}/{SECTORS.length} sectoren ingevuld
          </span>
        </div>
        <div className="flex items-center gap-2">
          <div className="flex items-center gap-0.5 p-0.5 bg-gray-100 rounded-md">
            <button
              onClick={() => setViewMode("grafisch")}
              className={`px-3 py-1 rounded text-xs font-medium transition-colors ${
                viewMode === "grafisch"
                  ? "bg-white text-cito-blue shadow-sm"
                  : "text-gray-500 hover:text-gray-700"
              }`}
            >
              Grafisch
            </button>
            <button
              onClick={() => setViewMode("tabel")}
              className={`px-3 py-1 rounded text-xs font-medium transition-colors ${
                viewMode === "tabel"
                  ? "bg-white text-cito-blue shadow-sm"
                  : "text-gray-500 hover:text-gray-700"
              }`}
            >
              Tabel
            </button>
          </div>
          <button
            onClick={onSwitchToEdit}
            className="px-3 py-1.5 text-sm text-cito-blue border border-cito-blue rounded-lg hover:bg-blue-50"
          >
            Per Sector bewerken
          </button>
        </div>
      </div>

      {/* Grafische weergave */}
      {viewMode === "grafisch" && <DINNetworkGraph session={session} />}

      {/* Tabel weergave — per doel */}
      {viewMode === "tabel" && <>

      {/* Per doel */}
      {session.goals
        .sort((a, b) => a.rank - b.rank)
        .map((goal) => {
          const goalBenefits = session.benefits.filter(
            (b) => b.goalId === goal.id
          );
          const goalBenefitIds = new Set(goalBenefits.map((b) => b.id));
          const relatedCapIds = new Set(
            session.benefitCapabilityMaps
              .filter((m) => goalBenefitIds.has(m.benefitId))
              .map((m) => m.capabilityId)
          );
          const goalCapabilities =
            relatedCapIds.size > 0
              ? session.capabilities.filter((c) => relatedCapIds.has(c.id))
              : session.capabilities.filter((c) =>
                  goalBenefits.some((b) => b.sectorId === c.sectorId)
                );

          return (
            <div
              key={goal.id}
              className="border border-gray-200 rounded-xl overflow-hidden"
            >
              {/* Doel header */}
              <div className="bg-din-doelen/10 px-5 py-3 border-b border-gray-200">
                <div className="text-sm font-bold text-cito-blue">
                  Doel {goal.rank}: {goal.name}
                </div>
                {goal.description && (
                  <div className="text-xs text-gray-500 mt-0.5">
                    {goal.description}
                  </div>
                )}
              </div>

              <div className="p-5 space-y-5">
                {/* Baten */}
                <div>
                  <h4 className="text-xs font-semibold text-din-baten uppercase mb-2">
                    Baten
                  </h4>
                  {goalBenefits.length === 0 ? (
                    <p className="text-xs text-gray-400 italic">
                      Geen baten voor dit doel
                    </p>
                  ) : (
                    <div className="space-y-1.5">
                      {goalBenefits.map((b) => (
                        <div
                          key={b.id}
                          className="flex items-start gap-2 text-sm"
                        >
                          <SectorBadge sector={b.sectorId} />
                          <span className="text-gray-700">
                            {b.description || "(naamloos)"}
                          </span>
                          {b.profiel.indicator && (
                            <span className="text-xs text-gray-400 ml-auto whitespace-nowrap">
                              {b.profiel.indicator}: {b.profiel.currentValue} →{" "}
                              {b.profiel.targetValue}
                            </span>
                          )}
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {/* Vermogens */}
                <div>
                  <h4 className="text-xs font-semibold text-din-vermogens uppercase mb-2">
                    Vermogens
                  </h4>
                  {goalCapabilities.length === 0 ? (
                    <p className="text-xs text-gray-400 italic">
                      Geen vermogens gekoppeld
                    </p>
                  ) : (
                    <div className="space-y-1.5">
                      {goalCapabilities.map((c) => {
                        const isShared = sharedCaps.has(c.id);
                        const sharedSectors = sharedCaps.get(c.id);
                        return (
                          <div
                            key={c.id}
                            className={`flex items-start gap-2 text-sm p-2 rounded ${
                              isShared
                                ? "bg-amber-50 border border-amber-200"
                                : ""
                            }`}
                          >
                            <SectorBadge sector={c.sectorId} />
                            <div className="flex-1">
                              <span className="text-gray-700">
                                {c.description || "(naamloos)"}
                              </span>
                              {(c.currentLevel || c.targetLevel) && (
                                <div className="flex items-center gap-2 mt-0.5">
                                  {c.currentLevel && (
                                    <span className="text-[10px] text-amber-600">
                                      Nu: {c.currentLevel}/5
                                    </span>
                                  )}
                                  {c.targetLevel && (
                                    <span className="text-[10px] text-green-600">
                                      Doel: {c.targetLevel}/5
                                    </span>
                                  )}
                                  {c.currentLevel && c.targetLevel && c.targetLevel > c.currentLevel && (
                                    <span className={`text-[10px] px-1 rounded font-medium ${
                                      c.targetLevel - c.currentLevel >= 3
                                        ? "bg-red-100 text-red-700"
                                        : c.targetLevel - c.currentLevel >= 2
                                        ? "bg-amber-100 text-amber-700"
                                        : "bg-green-100 text-green-700"
                                    }`}>
                                      +{c.targetLevel - c.currentLevel}
                                    </span>
                                  )}
                                </div>
                              )}
                            </div>
                            {isShared && sharedSectors && (
                              <span className="ml-auto flex items-center gap-1 shrink-0">
                                <span className="text-[10px] font-medium text-amber-700 bg-amber-100 px-1.5 py-0.5 rounded">
                                  Synergie
                                </span>
                                {sharedSectors
                                  .filter((s) => s !== c.sectorId)
                                  .map((s) => (
                                    <SectorBadge key={s} sector={s} />
                                  ))}
                              </span>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>

                {/* Inspanningen per domein */}
                <div>
                  <h4 className="text-xs font-semibold text-din-inspanningen uppercase mb-2">
                    Inspanningen per domein
                  </h4>
                  <div className="grid grid-cols-2 gap-3">
                    {(
                      Object.entries(DOMAIN_LABELS) as [
                        EffortDomain,
                        string,
                      ][]
                    ).map(([domain, label]) => {
                      const domainEfforts = session.efforts.filter(
                        (e) =>
                          e.domain === domain &&
                          goalBenefits.some(
                            (b) => b.sectorId === e.sectorId
                          )
                      );
                      return (
                        <div key={domain}>
                          <div className="text-xs font-medium text-gray-500 mb-1">
                            {label}
                          </div>
                          {domainEfforts.length === 0 ? (
                            <p className="text-xs text-gray-300 italic">
                              —
                            </p>
                          ) : (
                            <div className="space-y-1">
                              {domainEfforts.map((e) => (
                                <div
                                  key={e.id}
                                  className="flex items-center gap-1.5 text-xs"
                                >
                                  <SectorBadge sector={e.sectorId} />
                                  <span className="text-gray-600">
                                    {e.description || "(naamloos)"}
                                  </span>
                                  {e.quarter && (
                                    <span className="text-gray-400 ml-auto">
                                      {e.quarter}
                                    </span>
                                  )}
                                </div>
                              ))}
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>
            </div>
          );
        })}

      {/* Totaaloverzicht per domein (alle doelen) */}
      <div className="border border-gray-200 rounded-xl p-5">
        <h3 className="text-sm font-semibold text-cito-blue mb-3">
          Totaaloverzicht inspanningen per domein
        </h3>
        <div className="grid grid-cols-4 gap-4">
          {(Object.entries(effortsByDomain) as [EffortDomain, typeof session.efforts][]).map(
            ([domain, efforts]) => (
              <div key={domain} className="text-center">
                <div className="text-2xl font-bold text-cito-blue">
                  {efforts.length}
                </div>
                <div className="text-xs text-gray-500">
                  {DOMAIN_LABELS[domain]}
                </div>
                <div className="flex flex-wrap gap-0.5 justify-center mt-1">
                  {SECTORS.map((s) => {
                    const count = efforts.filter(
                      (e) => e.sectorId === s
                    ).length;
                    if (count === 0) return null;
                    return (
                      <span key={s} className="text-[9px] text-gray-400">
                        {s}: {count}
                      </span>
                    );
                  })}
                </div>
              </div>
            )
          )}
        </div>
      </div>

      </>}
    </div>
  );
}
