"use client";

import { useState } from "react";
import type { DINSession, EffortDomain, SectorName } from "@/lib/types";
import { SECTORS, SECTOR_COLORS } from "@/lib/types";

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

// Chevron SVG
function ChevronIcon({ expanded, className = "" }: { expanded: boolean; className?: string }) {
  return (
    <svg
      className={`w-4 h-4 transition-transform duration-200 ${expanded ? "rotate-180" : ""} ${className}`}
      fill="none" stroke="currentColor" viewBox="0 0 24 24"
    >
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
    </svg>
  );
}

// DIN chain completeness dots
function ChainIndicator({ hasBenefits, hasCaps, hasEfforts }: { hasBenefits: boolean; hasCaps: boolean; hasEfforts: boolean }) {
  return (
    <div className="flex items-center gap-1">
      <div className={`w-2 h-2 rounded-full ${hasBenefits ? "bg-din-baten" : "bg-gray-200"}`} />
      <div className={`w-2 h-2 rounded-full ${hasCaps ? "bg-din-vermogens" : "bg-gray-200"}`} />
      <div className={`w-2 h-2 rounded-full ${hasEfforts ? "bg-din-inspanningen" : "bg-gray-200"}`} />
    </div>
  );
}

// Flow arrow between stats
function FlowArrow() {
  return (
    <svg className="w-5 h-5 text-gray-300 shrink-0 mx-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M13.5 4.5L21 12m0 0l-7.5 7.5M21 12H3" />
    </svg>
  );
}

// Column connector (vertical line + chevron)
function ColumnConnector() {
  return (
    <div className="w-6 flex flex-col items-center justify-center shrink-0">
      <div className="w-px flex-1 bg-gradient-to-b from-gray-200 to-gray-200 min-h-4" />
      <svg className="w-3 h-3 text-gray-300 my-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
      </svg>
      <div className="w-px flex-1 bg-gradient-to-b from-gray-200 to-gray-200 min-h-4" />
    </div>
  );
}

interface DINNetworkGraphProps {
  session: DINSession;
}

export default function DINNetworkGraph({ session }: DINNetworkGraphProps) {
  const [collapsedGoals, setCollapsedGoals] = useState<Set<string>>(new Set());

  function toggleGoal(id: string) {
    const next = new Set(collapsedGoals);
    if (next.has(id)) next.delete(id);
    else next.add(id);
    setCollapsedGoals(next);
  }

  const synergieCount = session.capabilities.filter(
    (c) => c.relatedSectors && c.relatedSectors.length > 1
  ).length;

  const stats = [
    { label: "Doelen", value: session.goals.length, color: "bg-din-doelen", sub: "uit KiB" },
    { label: "Baten", value: session.benefits.length, color: "bg-din-baten", sub: "totaal" },
    { label: "Vermogens", value: session.capabilities.length, color: "bg-din-vermogens", sub: "totaal" },
    { label: "Inspanningen", value: session.efforts.length, color: "bg-din-inspanningen", sub: "totaal" },
  ];

  return (
    <div className="space-y-6">
      {/* Stats header met flow-pijlen */}
      <div className="flex items-center justify-between bg-white rounded-xl border border-gray-200 p-4 shadow-sm">
        {stats.map((s, i) => (
          <div key={s.label} className="flex items-center">
            <div className="flex items-center gap-3">
              <div className={`w-12 h-12 rounded-xl ${s.color} flex items-center justify-center text-white text-xl font-bold shadow-sm`}>
                {s.value}
              </div>
              <div>
                <div className="text-sm font-semibold text-gray-800">{s.label}</div>
                <div className="text-[10px] text-gray-400">{s.sub}</div>
              </div>
            </div>
            {i < stats.length - 1 && <FlowArrow />}
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

      {/* Alles in-/uitklappen */}
      <div className="flex items-center justify-end">
        <button
          onClick={() => {
            if (collapsedGoals.size === 0) {
              setCollapsedGoals(new Set(session.goals.map((g) => g.id)));
            } else {
              setCollapsedGoals(new Set());
            }
          }}
          className="text-xs text-gray-400 hover:text-gray-600 flex items-center gap-1 transition-colors"
        >
          <ChevronIcon expanded={collapsedGoals.size === 0} className="w-3 h-3" />
          {collapsedGoals.size === 0 ? "Alles inklappen" : "Alles uitklappen"}
        </button>
      </div>

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
          const isCollapsed = collapsedGoals.has(goal.id);

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
                {/* Doel header — klikbaar */}
                <div
                  className="bg-gradient-to-r from-din-doelen/15 to-din-doelen/5 px-5 py-3 flex items-center gap-3 cursor-pointer hover:from-din-doelen/20 hover:to-din-doelen/10 transition-all select-none"
                  onClick={() => toggleGoal(goal.id)}
                >
                  <div className="shrink-0 w-8 h-8 rounded-lg bg-din-doelen text-white flex items-center justify-center text-sm font-bold shadow-sm">
                    {goal.rank}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="text-sm font-semibold text-gray-800">{goal.name}</div>
                    {goal.description && !isCollapsed && (
                      <div className="text-xs text-gray-500 mt-0.5 line-clamp-1">{goal.description}</div>
                    )}
                  </div>
                  <ChainIndicator hasBenefits={hasBenefits} hasCaps={hasCaps} hasEfforts={hasEfforts} />
                  <div className="flex gap-1.5 shrink-0">
                    {hasBenefits && <span className="text-[10px] bg-din-baten/10 text-din-baten px-1.5 py-0.5 rounded font-medium">{goalBenefits.length} baten</span>}
                    {hasCaps && <span className="text-[10px] bg-din-vermogens/10 text-din-vermogens px-1.5 py-0.5 rounded font-medium">{goalCapabilities.length} vermogens</span>}
                    {hasEfforts && <span className="text-[10px] bg-din-inspanningen/10 text-din-inspanningen px-1.5 py-0.5 rounded font-medium">{goalEfforts.length} inspanningen</span>}
                  </div>
                  <ChevronIcon expanded={!isCollapsed} className="text-gray-400 shrink-0" />
                </div>

                {/* Content — inklapbaar */}
                <div className="collapse-wrapper" data-collapsed={isCollapsed ? "true" : "false"}>
                  <div>
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

                              {/* 3 kolommen met connectoren */}
                              <div className="flex">
                                {/* Baten kolom */}
                                <div className="flex-1 min-w-0">
                                  <div className="flex items-center gap-1 mb-1.5">
                                    <div className="w-2 h-2 rounded-full bg-din-baten" />
                                    <span className="text-[10px] uppercase tracking-wider text-din-baten font-semibold">Baten</span>
                                  </div>
                                  {sectorBenefits.length > 0 ? (
                                    <div className="space-y-1">
                                      {sectorBenefits.map((b) => (
                                        <div key={b.id} className="bg-white/80 border border-din-baten/15 rounded-lg px-2.5 py-1.5">
                                          <span className="text-[11px] text-gray-700 leading-snug">{b.title || b.description || "(naamloos)"}</span>
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

                                <ColumnConnector />

                                {/* Vermogens kolom */}
                                <div className="flex-1 min-w-0">
                                  <div className="flex items-center gap-1 mb-1.5">
                                    <div className="w-2 h-2 rounded-full bg-din-vermogens" />
                                    <span className="text-[10px] uppercase tracking-wider text-din-vermogens font-semibold">Vermogens</span>
                                  </div>
                                  {sectorCaps.length > 0 ? (
                                    <div className="space-y-1">
                                      {sectorCaps.map((c) => (
                                        <div key={c.id} className={`bg-white/80 border rounded-lg px-2.5 py-1.5 ${c.relatedSectors && c.relatedSectors.length > 1 ? "border-amber-200" : "border-din-vermogens/15"}`}>
                                          <span className="text-[11px] text-gray-700 leading-snug">{c.title || c.description || "(naamloos)"}</span>
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

                                <ColumnConnector />

                                {/* Inspanningen kolom */}
                                <div className="flex-1 min-w-0">
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
                                                    <span className="text-[10px] text-gray-700 leading-snug">{e.title || e.description || "(naamloos)"}</span>
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
                </div>
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
      <div className="bg-white rounded-xl border border-gray-200 p-5 shadow-sm">
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
                {count === 0 && <div className="text-[10px] text-red-400 mt-1 font-medium">Ontbreekt</div>}
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
