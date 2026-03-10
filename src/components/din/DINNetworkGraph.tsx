"use client";

import type { DINSession, EffortDomain, SectorName } from "@/lib/types";
import { SECTORS, SECTOR_COLORS } from "@/lib/types";

interface DINNetworkGraphProps {
  session: DINSession;
}

const DOMAIN_COLORS: Record<EffortDomain, { border: string; bg: string; text: string }> = {
  mens: { border: "border-l-blue-500", bg: "bg-blue-50", text: "text-blue-700" },
  processen: { border: "border-l-green-500", bg: "bg-green-50", text: "text-green-700" },
  data_systemen: { border: "border-l-purple-500", bg: "bg-purple-50", text: "text-purple-700" },
  cultuur: { border: "border-l-amber-500", bg: "bg-amber-50", text: "text-amber-700" },
};

const DOMAIN_LABELS: Record<EffortDomain, string> = {
  mens: "Mens",
  processen: "Processen",
  data_systemen: "Data & Systemen",
  cultuur: "Cultuur",
};

const STATUS_LABELS: Record<string, { label: string; color: string }> = {
  gepland: { label: "Gepland", color: "bg-gray-100 text-gray-600" },
  in_uitvoering: { label: "Actief", color: "bg-green-100 text-green-700" },
  afgerond: { label: "Afgerond", color: "bg-blue-100 text-blue-700" },
  on_hold: { label: "On hold", color: "bg-amber-100 text-amber-700" },
};

const SECTOR_BORDER_COLORS: Record<SectorName, string> = {
  PO: "border-blue-300",
  VO: "border-green-300",
  Zakelijk: "border-purple-300",
};

const SECTOR_BG_COLORS: Record<SectorName, string> = {
  PO: "bg-blue-50/30",
  VO: "bg-green-50/30",
  Zakelijk: "bg-purple-50/30",
};

const SECTOR_LABEL_STYLES: Record<SectorName, string> = {
  PO: "bg-blue-100 text-blue-800",
  VO: "bg-green-100 text-green-800",
  Zakelijk: "bg-purple-100 text-purple-800",
};

export default function DINNetworkGraph({ session }: DINNetworkGraphProps) {
  const totalBenefits = session.benefits.length;
  const totalCapabilities = session.capabilities.length;
  const totalEfforts = session.efforts.length;
  const synergieCount = session.capabilities.filter(
    (c) => c.relatedSectors && c.relatedSectors.length > 1
  ).length;

  const stats = [
    { label: "Doelen", value: session.goals.length, color: "bg-din-doelen" },
    { label: "Baten", value: totalBenefits, color: "bg-din-baten" },
    { label: "Vermogens", value: totalCapabilities, color: "bg-din-vermogens" },
    { label: "Inspanningen", value: totalEfforts, color: "bg-din-inspanningen" },
  ];

  return (
    <div className="space-y-6">
      {/* Stats */}
      <div className="grid grid-cols-4 gap-3">
        {stats.map((s) => (
          <div key={s.label} className="flex items-center gap-3 p-3 bg-white rounded-lg border border-gray-200">
            <div className={`w-10 h-10 rounded-lg ${s.color} flex items-center justify-center text-white text-lg font-bold`}>
              {s.value}
            </div>
            <div className="text-xs text-gray-600 font-medium">{s.label}</div>
          </div>
        ))}
      </div>

      {/* Visie */}
      {session.vision && (
        <div className="relative">
          <div className="bg-gradient-to-r from-cito-blue to-cito-blue/80 text-white rounded-xl p-5 shadow-md">
            <div className="text-[10px] uppercase tracking-wider text-blue-200 mb-1">Programmavisie</div>
            <p className="text-sm font-medium leading-relaxed">{session.vision.beknopt || session.vision.uitgebreid}</p>
          </div>
          <div className="flex justify-center">
            <div className="w-0.5 h-6 bg-gradient-to-b from-cito-blue to-din-doelen" />
          </div>
        </div>
      )}

      {/* DIN-keten per doel — met sector-groepering */}
      {session.goals
        .sort((a, b) => a.rank - b.rank)
        .map((goal, goalIdx) => {
          const goalBenefits = session.benefits.filter((b) => b.goalId === goal.id);
          const goalBenefitIds = new Set(goalBenefits.map((b) => b.id));

          const relatedCapIds = new Set(
            session.benefitCapabilityMaps
              .filter((m) => goalBenefitIds.has(m.benefitId))
              .map((m) => m.capabilityId)
          );
          const goalCapabilities = relatedCapIds.size > 0
            ? session.capabilities.filter((c) => relatedCapIds.has(c.id))
            : session.capabilities.filter((c) => goalBenefits.some((b) => b.sectorId === c.sectorId));

          const relatedCapIdSet = new Set(goalCapabilities.map((c) => c.id));
          const relatedEffortIds = new Set(
            session.capabilityEffortMaps
              .filter((m) => relatedCapIdSet.has(m.capabilityId))
              .map((m) => m.effortId)
          );
          const goalEfforts = relatedEffortIds.size > 0
            ? session.efforts.filter((e) => relatedEffortIds.has(e.id))
            : session.efforts.filter((e) => goalBenefits.some((b) => b.sectorId === e.sectorId));

          const hasBenefits = goalBenefits.length > 0;
          const hasCaps = goalCapabilities.length > 0;
          const hasEfforts = goalEfforts.length > 0;

          // Determine which sectors have items for this goal
          const sectorsForGoal = SECTORS.filter(
            (s) =>
              goalBenefits.some((b) => b.sectorId === s) ||
              goalCapabilities.some((c) => c.sectorId === s) ||
              goalEfforts.some((e) => e.sectorId === s)
          );

          return (
            <div key={goal.id} className="relative">
              {/* Doel */}
              <div className="bg-white border-2 border-din-doelen rounded-xl overflow-hidden shadow-sm">
                <div className="bg-din-doelen/10 px-5 py-3 flex items-center gap-3">
                  <div className="shrink-0 w-8 h-8 rounded-full bg-din-doelen text-white flex items-center justify-center text-sm font-bold shadow-sm">
                    {goal.rank}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="text-sm font-semibold text-gray-800">{goal.name}</div>
                    {goal.description && (
                      <div className="text-xs text-gray-500 mt-0.5 line-clamp-1">{goal.description}</div>
                    )}
                  </div>
                  <div className="flex gap-1.5 shrink-0">
                    {hasBenefits && <span className="text-[10px] bg-din-baten/10 text-din-baten px-1.5 py-0.5 rounded font-medium">{goalBenefits.length} baten</span>}
                    {hasCaps && <span className="text-[10px] bg-din-vermogens/10 text-din-vermogens px-1.5 py-0.5 rounded font-medium">{goalCapabilities.length} vermogens</span>}
                    {hasEfforts && <span className="text-[10px] bg-din-inspanningen/10 text-din-inspanningen px-1.5 py-0.5 rounded font-medium">{goalEfforts.length} inspanningen</span>}
                  </div>
                </div>

                {/* DIN-keten flow — gegroepeerd per sector */}
                {hasBenefits ? (
                  <div className="p-5 space-y-3">
                    {sectorsForGoal.map((sector) => {
                      const sectorBenefits = goalBenefits.filter((b) => b.sectorId === sector);
                      const sectorCaps = goalCapabilities.filter((c) => c.sectorId === sector);
                      const sectorEfforts = goalEfforts.filter((e) => e.sectorId === sector);

                      if (sectorBenefits.length === 0 && sectorCaps.length === 0 && sectorEfforts.length === 0) return null;

                      return (
                        <div key={sector} className={`rounded-lg border ${SECTOR_BORDER_COLORS[sector]} ${SECTOR_BG_COLORS[sector]} p-3`}>
                          {/* Sector label */}
                          <div className="mb-2">
                            <span className={`inline-block px-2 py-0.5 rounded text-[10px] font-semibold ${SECTOR_LABEL_STYLES[sector]}`}>
                              {sector}
                            </span>
                          </div>

                          {/* 3 kolommen */}
                          <div className="grid grid-cols-3 gap-3">
                            {/* Baten kolom */}
                            <div>
                              <div className="flex items-center gap-1 mb-1.5">
                                <div className="w-2 h-2 rounded-full bg-din-baten" />
                                <span className="text-[10px] uppercase tracking-wider text-din-baten font-semibold">Baten</span>
                              </div>
                              {sectorBenefits.length > 0 ? (
                                <div className="space-y-1">
                                  {sectorBenefits.map((b) => (
                                    <div key={b.id} className="bg-white/80 border border-din-baten/15 rounded-lg px-2.5 py-1.5">
                                      <span className="text-[11px] text-gray-700 leading-snug">{b.description || "(naamloos)"}</span>
                                      {b.profiel.indicator && (
                                        <div className="mt-0.5 text-[9px] text-gray-400">
                                          {b.profiel.indicator}: {b.profiel.currentValue} {"\u2192"} {b.profiel.targetValue}
                                        </div>
                                      )}
                                    </div>
                                  ))}
                                </div>
                              ) : (
                                <p className="text-[10px] text-gray-300 italic">{"\u2014"}</p>
                              )}
                            </div>

                            {/* Vermogens kolom */}
                            <div>
                              <div className="flex items-center gap-1 mb-1.5">
                                <div className="w-2 h-2 rounded-full bg-din-vermogens" />
                                <span className="text-[10px] uppercase tracking-wider text-din-vermogens font-semibold">Vermogens</span>
                              </div>
                              {sectorCaps.length > 0 ? (
                                <div className="space-y-1">
                                  {sectorCaps.map((c) => (
                                    <div key={c.id} className={`bg-white/80 border rounded-lg px-2.5 py-1.5 ${c.relatedSectors && c.relatedSectors.length > 1 ? "border-amber-200" : "border-din-vermogens/15"}`}>
                                      <span className="text-[11px] text-gray-700 leading-snug">{c.description || "(naamloos)"}</span>
                                      <div className="flex items-center gap-2 mt-0.5">
                                        {c.currentLevel && c.targetLevel && (
                                          <span className="text-[9px]">
                                            <span className="text-amber-600">{c.currentLevel}/5</span>
                                            {" \u2192 "}
                                            <span className="text-green-600">{c.targetLevel}/5</span>
                                          </span>
                                        )}
                                        {c.relatedSectors && c.relatedSectors.length > 1 && (
                                          <span className="text-[8px] bg-amber-100 text-amber-700 px-1 py-0 rounded font-medium">Synergie</span>
                                        )}
                                      </div>
                                    </div>
                                  ))}
                                </div>
                              ) : (
                                <p className="text-[10px] text-gray-300 italic">{"\u2014"}</p>
                              )}
                            </div>

                            {/* Inspanningen kolom */}
                            <div>
                              <div className="flex items-center gap-1 mb-1.5">
                                <div className="w-2 h-2 rounded-full bg-din-inspanningen" />
                                <span className="text-[10px] uppercase tracking-wider text-din-inspanningen font-semibold">Inspanningen</span>
                              </div>
                              {sectorEfforts.length > 0 ? (
                                <div className="space-y-1.5">
                                  {(["mens", "processen", "data_systemen", "cultuur"] as EffortDomain[]).map((domain) => {
                                    const domainEfforts = sectorEfforts.filter((e) => e.domain === domain);
                                    if (domainEfforts.length === 0) return null;
                                    const dc = DOMAIN_COLORS[domain];
                                    return (
                                      <div key={domain}>
                                        <div className={`text-[9px] font-medium ${dc.text} mb-0.5`}>{DOMAIN_LABELS[domain]}</div>
                                        <div className="space-y-0.5">
                                          {domainEfforts.map((e) => {
                                            const st = STATUS_LABELS[e.status] || STATUS_LABELS.gepland;
                                            return (
                                              <div key={e.id} className={`border-l-2 ${dc.border} bg-white/80 rounded-r px-2 py-1`}>
                                                <span className="text-[10px] text-gray-700 leading-snug">{e.description || "(naamloos)"}</span>
                                                <div className="flex items-center gap-1.5 mt-0.5">
                                                  {e.quarter && <span className="text-[8px] text-gray-400">{e.quarter}</span>}
                                                  {e.status && e.status !== "gepland" && (
                                                    <span className={`text-[8px] px-1 rounded ${st.color}`}>{st.label}</span>
                                                  )}
                                                </div>
                                              </div>
                                            );
                                          })}
                                        </div>
                                      </div>
                                    );
                                  })}
                                </div>
                              ) : (
                                <p className="text-[10px] text-gray-300 italic">{"\u2014"}</p>
                              )}
                            </div>
                          </div>

                          {/* Flow indicator */}
                          <div className="flex items-center justify-center gap-1 mt-2 text-[9px] text-gray-300">
                            <span className="text-din-baten">Baten</span>
                            <span>{"\u2192"}</span>
                            <span className="text-din-vermogens">Vermogens</span>
                            <span>{"\u2192"}</span>
                            <span className="text-din-inspanningen">Inspanningen</span>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                ) : (
                  <div className="p-5 text-center">
                    <p className="text-xs text-gray-400 italic">Nog geen DIN-netwerk voor dit doel.</p>
                  </div>
                )}
              </div>

              {/* Connector to next goal */}
              {goalIdx < session.goals.length - 1 && (
                <div className="flex justify-center">
                  <div className="w-0.5 h-5 bg-gray-200" />
                </div>
              )}
            </div>
          );
        })}

      {/* Domeinbalans */}
      <div className="bg-white rounded-xl border border-gray-200 p-5">
        <h4 className="text-sm font-semibold text-cito-blue mb-4">Domeinbalans inspanningen</h4>
        <div className="grid grid-cols-4 gap-4">
          {(["mens", "processen", "data_systemen", "cultuur"] as EffortDomain[]).map((domain) => {
            const count = session.efforts.filter((e) => e.domain === domain).length;
            const maxCount = Math.max(
              ...["mens", "processen", "data_systemen", "cultuur"].map((d) => session.efforts.filter((e) => e.domain === d).length),
              1
            );
            const dc = DOMAIN_COLORS[domain];
            const pct = Math.round((count / maxCount) * 100);

            return (
              <div key={domain} className="text-center">
                <div className={`text-xs font-medium ${dc.text} mb-2`}>{DOMAIN_LABELS[domain]}</div>
                <div className="text-2xl font-bold text-gray-800">{count}</div>
                <div className="mt-2 h-2 bg-gray-100 rounded-full overflow-hidden">
                  <div
                    className="h-full rounded-full transition-all"
                    style={{
                      width: `${pct}%`,
                      backgroundColor: domain === "mens" ? "#3b82f6" : domain === "processen" ? "#10b981" : domain === "data_systemen" ? "#8b5cf6" : "#f59e0b",
                    }}
                  />
                </div>
                <div className="flex flex-wrap gap-0.5 justify-center mt-1">
                  {SECTORS.map((s) => {
                    const sCount = session.efforts.filter((e) => e.sectorId === s && e.domain === domain).length;
                    if (sCount === 0) return null;
                    const colors = SECTOR_COLORS[s];
                    return (
                      <span key={s} className={`text-[9px] px-1 rounded border ${colors}`}>{s}: {sCount}</span>
                    );
                  })}
                </div>
                {count === 0 && <div className="text-[10px] text-red-400 mt-1">Ontbreekt</div>}
              </div>
            );
          })}
        </div>
        {synergieCount > 0 && (
          <div className="mt-4 pt-3 border-t border-gray-100 flex items-center gap-2">
            <span className="text-[10px] bg-amber-100 text-amber-700 px-1.5 py-0.5 rounded font-medium">Synergie</span>
            <span className="text-xs text-gray-500">{synergieCount} vermogens worden gedeeld door meerdere sectoren</span>
          </div>
        )}
      </div>

      {/* Legenda */}
      <div className="bg-gray-50 rounded-lg p-4 border border-gray-100">
        <div className="text-[10px] font-semibold text-gray-400 uppercase tracking-wider mb-2">Legenda</div>
        <div className="flex flex-wrap gap-4 text-xs">
          <div className="flex items-center gap-1.5">
            <div className="w-2.5 h-2.5 rounded-full bg-din-doelen" />
            <span className="text-gray-600">Doelen</span>
          </div>
          <div className="flex items-center gap-1.5">
            <div className="w-2.5 h-2.5 rounded-full bg-din-baten" />
            <span className="text-gray-600">Baten</span>
          </div>
          <div className="flex items-center gap-1.5">
            <div className="w-2.5 h-2.5 rounded-full bg-din-vermogens" />
            <span className="text-gray-600">Vermogens</span>
          </div>
          <div className="flex items-center gap-1.5">
            <div className="w-2.5 h-2.5 rounded-full bg-din-inspanningen" />
            <span className="text-gray-600">Inspanningen</span>
          </div>
          <div className="border-l border-gray-300 pl-4 flex items-center gap-1.5">
            {SECTORS.map((s) => {
              const colors = SECTOR_COLORS[s];
              return <span key={s} className={`inline-block px-1.5 py-0.5 rounded text-[9px] font-medium border ${colors}`}>{s}</span>;
            })}
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
