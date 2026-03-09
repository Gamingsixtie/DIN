"use client";

import type { DINSession, EffortDomain, SectorName } from "@/lib/types";
import { SECTOR_COLORS } from "@/lib/types";

interface DINNetworkGraphProps {
  session: DINSession;
}

function SectorDot({ sector }: { sector: string }) {
  const colorMap: Record<string, string> = {
    PO: "bg-blue-500",
    VO: "bg-green-500",
    Zakelijk: "bg-purple-500",
  };
  return (
    <span
      className={`inline-block w-2 h-2 rounded-full ${colorMap[sector] || "bg-gray-400"}`}
      title={sector}
    />
  );
}

function SectorBadge({ sector }: { sector: string }) {
  const colors = SECTOR_COLORS[sector as SectorName] || "bg-gray-100 text-gray-700 border-gray-200";
  return (
    <span className={`inline-block px-1 py-0 rounded text-[9px] font-medium border ${colors}`}>
      {sector}
    </span>
  );
}

const DOMAIN_COLORS: Record<EffortDomain, string> = {
  mens: "border-l-blue-500",
  processen: "border-l-green-500",
  data_systemen: "border-l-purple-500",
  cultuur: "border-l-amber-500",
};

const DOMAIN_LABELS: Record<EffortDomain, string> = {
  mens: "Mens",
  processen: "Processen",
  data_systemen: "Data & Systemen",
  cultuur: "Cultuur",
};

export default function DINNetworkGraph({ session }: DINNetworkGraphProps) {
  return (
    <div className="space-y-6">
      {/* Visie bovenaan */}
      {session.vision && (
        <div className="relative">
          <div className="bg-cito-blue text-white rounded-xl p-5 shadow-md">
            <div className="text-[10px] uppercase tracking-wider text-blue-200 mb-1">
              Programmavisie
            </div>
            <p className="text-sm font-medium leading-relaxed">
              {session.vision.beknopt || session.vision.uitgebreid}
            </p>
          </div>
          {/* Verbindingslijn naar doelen */}
          <div className="flex justify-center">
            <div className="w-0.5 h-6 bg-gradient-to-b from-cito-blue to-din-doelen" />
          </div>
        </div>
      )}

      {/* Doelen → Baten → Vermogens → Inspanningen per doel */}
      {session.goals
        .sort((a, b) => a.rank - b.rank)
        .map((goal, goalIdx) => {
          const goalBenefits = session.benefits.filter(
            (b) => b.goalId === goal.id
          );
          const goalBenefitIds = new Set(goalBenefits.map((b) => b.id));

          // Vermogens gekoppeld via benefitCapabilityMaps, of fallback op sector
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

          // Inspanningen gekoppeld via capabilityEffortMaps, of fallback
          const relatedCapIdSet = new Set(goalCapabilities.map((c) => c.id));
          const relatedEffortIds = new Set(
            session.capabilityEffortMaps
              .filter((m) => relatedCapIdSet.has(m.capabilityId))
              .map((m) => m.effortId)
          );
          const goalEfforts =
            relatedEffortIds.size > 0
              ? session.efforts.filter((e) => relatedEffortIds.has(e.id))
              : session.efforts.filter((e) =>
                  goalBenefits.some((b) => b.sectorId === e.sectorId)
                );

          return (
            <div key={goal.id} className="relative">
              {/* Doel node */}
              <div className="bg-din-doelen/10 border-2 border-din-doelen rounded-xl p-4">
                <div className="flex items-start gap-3">
                  {/* Doel label */}
                  <div className="shrink-0 w-8 h-8 rounded-full bg-din-doelen text-white flex items-center justify-center text-sm font-bold">
                    {goal.rank}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="text-[10px] uppercase tracking-wider text-din-doelen font-semibold">
                      Doel
                    </div>
                    <div className="text-sm font-semibold text-gray-800">
                      {goal.name}
                    </div>
                    {goal.description && (
                      <div className="text-xs text-gray-500 mt-0.5 line-clamp-2">
                        {goal.description}
                      </div>
                    )}
                  </div>
                </div>

                {/* DIN-keten binnen het doel */}
                {goalBenefits.length > 0 && (
                  <div className="mt-4 ml-11 space-y-3">
                    {/* Pijl: Doel → Baten */}
                    <div className="flex items-center gap-2 text-[10px] text-gray-400">
                      <div className="w-4 h-0 border-t border-dashed border-gray-300" />
                      <span>Hoe?</span>
                      <div className="flex-1 h-0 border-t border-dashed border-gray-300" />
                    </div>

                    {/* Baten */}
                    <div className="space-y-1.5">
                      <div className="text-[10px] uppercase tracking-wider text-din-baten font-semibold flex items-center gap-1">
                        <div className="w-3 h-3 rounded-full bg-din-baten" />
                        Baten ({goalBenefits.length})
                      </div>
                      {goalBenefits.map((b) => (
                        <div
                          key={b.id}
                          className="ml-4 flex items-center gap-2 bg-din-baten/5 border border-din-baten/20 rounded-lg px-3 py-1.5"
                        >
                          <SectorBadge sector={b.sectorId} />
                          <span className="text-xs text-gray-700 flex-1">
                            {b.description || "(naamloos)"}
                          </span>
                          {b.profiel.indicator && (
                            <span className="text-[10px] text-gray-400 shrink-0">
                              {b.profiel.currentValue} {"\u2192"} {b.profiel.targetValue}
                            </span>
                          )}
                        </div>
                      ))}
                    </div>

                    {/* Pijl: Baten → Vermogens */}
                    {goalCapabilities.length > 0 && (
                      <>
                        <div className="flex items-center gap-2 text-[10px] text-gray-400">
                          <div className="w-4 h-0 border-t border-dashed border-gray-300" />
                          <span>Hoe?</span>
                          <div className="flex-1 h-0 border-t border-dashed border-gray-300" />
                        </div>

                        {/* Vermogens */}
                        <div className="space-y-1.5">
                          <div className="text-[10px] uppercase tracking-wider text-din-vermogens font-semibold flex items-center gap-1">
                            <div className="w-3 h-3 rounded-full bg-din-vermogens" />
                            Vermogens ({goalCapabilities.length})
                          </div>
                          {goalCapabilities.map((c) => (
                            <div
                              key={c.id}
                              className="ml-4 flex items-center gap-2 bg-din-vermogens/5 border border-din-vermogens/20 rounded-lg px-3 py-1.5"
                            >
                              <SectorBadge sector={c.sectorId} />
                              <span className="text-xs text-gray-700 flex-1">
                                {c.description || "(naamloos)"}
                              </span>
                              {c.currentLevel && c.targetLevel && (
                                <span className="text-[10px] shrink-0">
                                  <span className="text-amber-600">{c.currentLevel}</span>
                                  {" \u2192 "}
                                  <span className="text-green-600">{c.targetLevel}</span>
                                </span>
                              )}
                              {c.relatedSectors.length > 1 && (
                                <span className="text-[9px] bg-amber-100 text-amber-700 px-1 rounded">
                                  Synergie
                                </span>
                              )}
                            </div>
                          ))}
                        </div>
                      </>
                    )}

                    {/* Pijl: Vermogens → Inspanningen */}
                    {goalEfforts.length > 0 && (
                      <>
                        <div className="flex items-center gap-2 text-[10px] text-gray-400">
                          <div className="w-4 h-0 border-t border-dashed border-gray-300" />
                          <span>Hoe?</span>
                          <div className="flex-1 h-0 border-t border-dashed border-gray-300" />
                        </div>

                        {/* Inspanningen per domein */}
                        <div className="space-y-1.5">
                          <div className="text-[10px] uppercase tracking-wider text-din-inspanningen font-semibold flex items-center gap-1">
                            <div className="w-3 h-3 rounded-full bg-din-inspanningen" />
                            Inspanningen ({goalEfforts.length})
                          </div>
                          <div className="ml-4 grid grid-cols-2 gap-2">
                            {(["mens", "processen", "data_systemen", "cultuur"] as EffortDomain[]).map(
                              (domain) => {
                                const domainEfforts = goalEfforts.filter(
                                  (e) => e.domain === domain
                                );
                                if (domainEfforts.length === 0) return null;
                                return (
                                  <div key={domain} className="space-y-1">
                                    <div className="text-[10px] font-medium text-gray-500">
                                      {DOMAIN_LABELS[domain]}
                                    </div>
                                    {domainEfforts.map((e) => (
                                      <div
                                        key={e.id}
                                        className={`flex items-center gap-1.5 bg-white border-l-2 ${DOMAIN_COLORS[domain]} rounded px-2 py-1`}
                                      >
                                        <SectorDot sector={e.sectorId} />
                                        <span className="text-[11px] text-gray-600 flex-1">
                                          {e.description || "(naamloos)"}
                                        </span>
                                        {e.quarter && (
                                          <span className="text-[9px] text-gray-400">
                                            {e.quarter}
                                          </span>
                                        )}
                                      </div>
                                    ))}
                                  </div>
                                );
                              }
                            )}
                          </div>
                        </div>
                      </>
                    )}
                  </div>
                )}
              </div>

              {/* Verbindingslijn naar volgend doel */}
              {goalIdx < session.goals.length - 1 && (
                <div className="flex justify-center">
                  <div className="w-0.5 h-4 bg-gray-200" />
                </div>
              )}
            </div>
          );
        })}

      {/* Legenda */}
      <div className="bg-gray-50 rounded-lg p-4 border border-gray-200">
        <div className="text-xs font-semibold text-gray-500 mb-2">Legenda</div>
        <div className="flex flex-wrap gap-4 text-xs">
          <div className="flex items-center gap-1.5">
            <div className="w-3 h-3 rounded-full bg-din-doelen" />
            <span>Doelen</span>
          </div>
          <div className="flex items-center gap-1.5">
            <div className="w-3 h-3 rounded-full bg-din-baten" />
            <span>Baten</span>
          </div>
          <div className="flex items-center gap-1.5">
            <div className="w-3 h-3 rounded-full bg-din-vermogens" />
            <span>Vermogens</span>
          </div>
          <div className="flex items-center gap-1.5">
            <div className="w-3 h-3 rounded-full bg-din-inspanningen" />
            <span>Inspanningen</span>
          </div>
          <div className="border-l border-gray-300 pl-4 flex items-center gap-1.5">
            <SectorBadge sector="PO" />
            <SectorBadge sector="VO" />
            <SectorBadge sector="Zakelijk" />
          </div>
          <div className="border-l border-gray-300 pl-4 flex items-center gap-1.5">
            <span className="text-[9px] bg-amber-100 text-amber-700 px-1 rounded">Synergie</span>
            <span className="text-gray-400">= gedeeld vermogen</span>
          </div>
        </div>
      </div>
    </div>
  );
}
