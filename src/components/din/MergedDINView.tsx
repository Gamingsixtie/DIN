"use client";

import { useState } from "react";
import type { DINSession, EffortDomain, SectorName } from "@/lib/types";
import { SECTORS, SECTOR_COLORS } from "@/lib/types";
import { findSharedCapabilities } from "@/lib/din-service";
import { DOMAIN_LABELS } from "@/components/din/EffortCard";
import DINNetworkGraph from "@/components/din/DINNetworkGraph";

type ViewMode = "grafisch" | "tabel";
type SectorTab = SectorName | "cross";

interface MergedDINViewProps {
  session: DINSession;
  onSwitchToEdit: () => void;
  onDeleteBenefit?: (id: string) => void;
  onDeleteCapability?: (id: string) => void;
  onDeleteEffort?: (id: string) => void;
}

const STATUS_STYLES: Record<string, string> = {
  gepland: "bg-gray-100 text-gray-600",
  in_uitvoering: "bg-green-100 text-green-700",
  afgerond: "bg-blue-100 text-blue-700",
  on_hold: "bg-amber-100 text-amber-700",
};

const STATUS_TEXT: Record<string, string> = {
  gepland: "Gepland",
  in_uitvoering: "Actief",
  afgerond: "Afgerond",
  on_hold: "On hold",
};

const DOMAIN_BAR_COLORS: Record<EffortDomain, string> = {
  mens: "#3b82f6",
  processen: "#10b981",
  data_systemen: "#8b5cf6",
  cultuur: "#f59e0b",
};

const SECTOR_TAB_STYLES: Record<SectorName, { active: string; inactive: string }> = {
  PO: { active: "bg-blue-100 text-blue-800 border-blue-300", inactive: "text-blue-600 hover:bg-blue-50" },
  VO: { active: "bg-green-100 text-green-800 border-green-300", inactive: "text-green-600 hover:bg-green-50" },
  Zakelijk: { active: "bg-purple-100 text-purple-800 border-purple-300", inactive: "text-purple-600 hover:bg-purple-50" },
};

export default function MergedDINView({
  session,
  onSwitchToEdit,
  onDeleteBenefit,
  onDeleteCapability,
  onDeleteEffort,
}: MergedDINViewProps) {
  const [viewMode, setViewMode] = useState<ViewMode>("tabel");
  const [activeTab, setActiveTab] = useState<SectorTab>("PO");
  const sharedCaps = findSharedCapabilities(session.capabilities);

  const sectorsWithData = SECTORS.filter(
    (s) =>
      session.benefits.some((b) => b.sectorId === s) ||
      session.capabilities.some((c) => c.sectorId === s) ||
      session.efforts.some((e) => e.sectorId === s)
  );

  if (sectorsWithData.length === 0) {
    return (
      <div className="text-center py-12">
        <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-gray-100 flex items-center justify-center">
          <svg className="w-8 h-8 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M19.5 14.25v-2.625a3.375 3.375 0 00-3.375-3.375h-1.5A1.125 1.125 0 0113.5 7.125v-1.5a3.375 3.375 0 00-3.375-3.375H8.25m0 12.75h7.5m-7.5 3H12M10.5 2.25H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 00-9-9z" />
          </svg>
        </div>
        <p className="text-gray-500 mb-1 font-medium">Nog geen DIN-data ingevuld</p>
        <p className="text-sm text-gray-400 mb-4">Vul eerst per sector het DIN-netwerk in.</p>
        <button onClick={onSwitchToEdit} className="px-4 py-2 bg-cito-blue text-white rounded-lg text-sm font-medium hover:bg-cito-blue-light">
          Per Sector Invullen
        </button>
      </div>
    );
  }

  function getSectorStats(sector: SectorName) {
    return {
      benefits: session.benefits.filter((b) => b.sectorId === sector).length,
      capabilities: session.capabilities.filter((c) => c.sectorId === sector).length,
      efforts: session.efforts.filter((e) => e.sectorId === sector).length,
    };
  }

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold text-cito-blue">Samengevoegd DIN-Netwerk</h3>
          <p className="text-xs text-gray-400 mt-0.5">
            {sectorsWithData.length}/{SECTORS.length} sectoren &middot; {session.benefits.length} baten &middot; {session.capabilities.length} vermogens &middot; {session.efforts.length} inspanningen
          </p>
        </div>
        <div className="flex items-center gap-2">
          <div className="flex items-center gap-0.5 p-0.5 bg-gray-100 rounded-md">
            <button
              onClick={() => setViewMode("grafisch")}
              className={`px-3 py-1.5 rounded text-xs font-medium transition-colors ${viewMode === "grafisch" ? "bg-white text-cito-blue shadow-sm" : "text-gray-500 hover:text-gray-700"}`}
            >
              Grafisch
            </button>
            <button
              onClick={() => setViewMode("tabel")}
              className={`px-3 py-1.5 rounded text-xs font-medium transition-colors ${viewMode === "tabel" ? "bg-white text-cito-blue shadow-sm" : "text-gray-500 hover:text-gray-700"}`}
            >
              Per Sector
            </button>
          </div>
          <button onClick={onSwitchToEdit} className="px-3 py-1.5 text-sm text-cito-blue border border-cito-blue rounded-lg hover:bg-blue-50">
            Per Sector bewerken
          </button>
        </div>
      </div>

      {/* Grafische weergave */}
      {viewMode === "grafisch" && <DINNetworkGraph session={session} />}

      {/* Tabel weergave — per sector */}
      {viewMode === "tabel" && (
        <div className="space-y-4">
          {/* Sector tabs */}
          <div className="flex items-center gap-1 p-1 bg-gray-50 rounded-lg border border-gray-200">
            {SECTORS.map((sector) => {
              const stats = getSectorStats(sector);
              const hasData = stats.benefits + stats.capabilities + stats.efforts > 0;
              const isActive = activeTab === sector;
              const styles = SECTOR_TAB_STYLES[sector];
              return (
                <button
                  key={sector}
                  onClick={() => setActiveTab(sector)}
                  className={`flex items-center gap-2 px-4 py-2 rounded-md text-sm font-medium transition-colors border ${
                    isActive ? styles.active : `border-transparent ${styles.inactive}`
                  } ${!hasData ? "opacity-40" : ""}`}
                >
                  <span>{sector}</span>
                  {hasData && (
                    <span className={`text-[10px] px-1.5 py-0.5 rounded-full ${isActive ? "bg-white/60" : "bg-gray-100"}`}>
                      {stats.benefits + stats.capabilities + stats.efforts}
                    </span>
                  )}
                </button>
              );
            })}
            <button
              onClick={() => setActiveTab("cross")}
              className={`flex items-center gap-2 px-4 py-2 rounded-md text-sm font-medium transition-colors border ml-auto ${
                activeTab === "cross" ? "bg-cito-blue/10 text-cito-blue border-cito-blue/30" : "border-transparent text-gray-500 hover:bg-gray-100"
              }`}
            >
              Cross-sector
            </button>
          </div>

          {/* Per sector content */}
          {activeTab !== "cross" && (
            <SectorContent
              session={session}
              sector={activeTab}
              sharedCaps={sharedCaps}
              onDeleteBenefit={onDeleteBenefit}
              onDeleteCapability={onDeleteCapability}
              onDeleteEffort={onDeleteEffort}
            />
          )}

          {/* Cross-sector content */}
          {activeTab === "cross" && (
            <CrossSectorContent
              session={session}
              sharedCaps={sharedCaps}
              sectorsWithData={sectorsWithData}
            />
          )}
        </div>
      )}
    </div>
  );
}

// --- Sector Content ---

function SectorContent({
  session,
  sector,
  sharedCaps,
  onDeleteBenefit,
  onDeleteCapability,
  onDeleteEffort,
}: {
  session: DINSession;
  sector: SectorName;
  sharedCaps: Map<string, string[]>;
  onDeleteBenefit?: (id: string) => void;
  onDeleteCapability?: (id: string) => void;
  onDeleteEffort?: (id: string) => void;
}) {
  const sectorBenefits = session.benefits.filter((b) => b.sectorId === sector);
  const sectorCaps = session.capabilities.filter((c) => c.sectorId === sector);
  const sectorEfforts = session.efforts.filter((e) => e.sectorId === sector);

  if (sectorBenefits.length === 0 && sectorCaps.length === 0 && sectorEfforts.length === 0) {
    return (
      <div className="text-center py-8 bg-white rounded-xl border border-gray-200">
        <p className="text-gray-400 text-sm">Nog geen DIN-items voor {sector}.</p>
        <p className="text-gray-300 text-xs mt-1">Vul het DIN-netwerk in via &quot;Per Sector bewerken&quot;.</p>
      </div>
    );
  }

  // Find goals that have items for this sector
  const goalIds = new Set([
    ...sectorBenefits.map((b) => b.goalId),
  ]);
  const relevantGoals = session.goals
    .filter((g) => goalIds.has(g.id))
    .sort((a, b) => a.rank - b.rank);

  // Caps/efforts not linked to a specific goal
  const allLinkedCapIds = new Set(
    session.benefitCapabilityMaps
      .filter((m) => sectorBenefits.some((b) => b.id === m.benefitId))
      .map((m) => m.capabilityId)
  );

  return (
    <div className="space-y-4">
      {/* Sector summary bar */}
      <div className={`rounded-xl border p-4 ${SECTOR_COLORS[sector].replace("text-", "").includes("blue") ? "bg-blue-50/50 border-blue-200" : SECTOR_COLORS[sector].includes("green") ? "bg-green-50/50 border-green-200" : "bg-purple-50/50 border-purple-200"}`}>
        <div className="flex items-center justify-between">
          <h4 className="text-sm font-semibold text-gray-800">Sector {sector}</h4>
          <div className="flex gap-2 text-[11px]">
            <span className="bg-din-baten/10 text-din-baten px-2 py-0.5 rounded font-medium">{sectorBenefits.length} baten</span>
            <span className="bg-din-vermogens/10 text-din-vermogens px-2 py-0.5 rounded font-medium">{sectorCaps.length} vermogens</span>
            <span className="bg-din-inspanningen/10 text-din-inspanningen px-2 py-0.5 rounded font-medium">{sectorEfforts.length} inspanningen</span>
          </div>
        </div>

        {/* Mini domain balance */}
        <div className="grid grid-cols-4 gap-3 mt-3">
          {(Object.entries(DOMAIN_LABELS) as [EffortDomain, string][]).map(([domain, label]) => {
            const count = sectorEfforts.filter((e) => e.domain === domain).length;
            const maxCount = Math.max(...(Object.keys(DOMAIN_LABELS) as EffortDomain[]).map((d) => sectorEfforts.filter((e) => e.domain === d).length), 1);
            const pct = Math.round((count / maxCount) * 100);
            return (
              <div key={domain} className="flex items-center gap-2">
                <div className="flex-1">
                  <div className="flex items-center justify-between text-[10px] mb-0.5">
                    <span className="text-gray-500">{label}</span>
                    <span className="font-semibold text-gray-700">{count}</span>
                  </div>
                  <div className="h-1 bg-white/80 rounded-full overflow-hidden">
                    <div className="h-full rounded-full" style={{ width: `${pct}%`, backgroundColor: DOMAIN_BAR_COLORS[domain] }} />
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Per goal for this sector */}
      {relevantGoals.map((goal) => {
        const goalBenefits = sectorBenefits.filter((b) => b.goalId === goal.id);
        const goalBenefitIds = new Set(goalBenefits.map((b) => b.id));

        // Get capabilities linked to these benefits
        const linkedCapIds = new Set(
          session.benefitCapabilityMaps
            .filter((m) => goalBenefitIds.has(m.benefitId))
            .map((m) => m.capabilityId)
        );
        const goalCaps = linkedCapIds.size > 0
          ? sectorCaps.filter((c) => linkedCapIds.has(c.id))
          : sectorCaps;

        // Get efforts linked to these capabilities
        const goalCapIdSet = new Set(goalCaps.map((c) => c.id));
        const linkedEffortIds = new Set(
          session.capabilityEffortMaps
            .filter((m) => goalCapIdSet.has(m.capabilityId))
            .map((m) => m.effortId)
        );
        const goalEfforts = linkedEffortIds.size > 0
          ? sectorEfforts.filter((e) => linkedEffortIds.has(e.id))
          : sectorEfforts;

        return (
          <div key={goal.id} className="border border-gray-200 rounded-xl overflow-hidden bg-white">
            {/* Goal header */}
            <div className="bg-din-doelen/10 px-4 py-2.5 border-b border-gray-200 flex items-center gap-3">
              <div className="shrink-0 w-6 h-6 rounded-full bg-din-doelen text-white flex items-center justify-center text-[11px] font-bold">
                {goal.rank}
              </div>
              <div className="flex-1 min-w-0">
                <div className="text-sm font-semibold text-cito-blue">{goal.name}</div>
              </div>
            </div>

            <div className="p-4 space-y-4">
              {/* Baten */}
              {goalBenefits.length > 0 && (
                <div>
                  <h5 className="text-[11px] font-semibold text-din-baten uppercase tracking-wider mb-1.5 flex items-center gap-1.5">
                    <div className="w-1.5 h-1.5 rounded-full bg-din-baten" />
                    Baten ({goalBenefits.length})
                  </h5>
                  <div className="space-y-1">
                    {goalBenefits.map((b) => (
                      <div key={b.id} className="flex items-start gap-2 text-xs group py-1 px-2 rounded hover:bg-gray-50">
                        <span className="text-gray-700 flex-1">{b.description || "(naamloos)"}</span>
                        {b.profiel.indicator && (
                          <span className="text-[10px] text-gray-400 whitespace-nowrap shrink-0">
                            {b.profiel.indicator}: {b.profiel.currentValue} {"\u2192"} {b.profiel.targetValue}
                          </span>
                        )}
                        {onDeleteBenefit && (
                          <button onClick={() => onDeleteBenefit(b.id)} className="text-gray-300 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-opacity shrink-0" title="Verwijder">
                            {"\u2715"}
                          </button>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Vermogens */}
              {goalCaps.length > 0 && (
                <div>
                  <h5 className="text-[11px] font-semibold text-din-vermogens uppercase tracking-wider mb-1.5 flex items-center gap-1.5">
                    <div className="w-1.5 h-1.5 rounded-full bg-din-vermogens" />
                    Vermogens ({goalCaps.length})
                  </h5>
                  <div className="space-y-1">
                    {goalCaps.map((c) => {
                      const isShared = sharedCaps.has(c.id);
                      const sharedSectors = sharedCaps.get(c.id);
                      return (
                        <div key={c.id} className={`flex items-start gap-2 text-xs p-2 rounded group ${isShared ? "bg-amber-50 border border-amber-200" : "hover:bg-gray-50"}`}>
                          <div className="flex-1 min-w-0">
                            <span className="text-gray-700">{c.description || "(naamloos)"}</span>
                            {(c.currentLevel || c.targetLevel) && (
                              <div className="flex items-center gap-2 mt-0.5">
                                {c.currentLevel && <span className="text-[10px] text-amber-600">Nu: {c.currentLevel}/5</span>}
                                {c.targetLevel && <span className="text-[10px] text-green-600">Doel: {c.targetLevel}/5</span>}
                                {c.currentLevel && c.targetLevel && c.targetLevel > c.currentLevel && (
                                  <span className={`text-[10px] px-1 rounded font-medium ${c.targetLevel - c.currentLevel >= 3 ? "bg-red-100 text-red-700" : c.targetLevel - c.currentLevel >= 2 ? "bg-amber-100 text-amber-700" : "bg-green-100 text-green-700"}`}>
                                    +{c.targetLevel - c.currentLevel}
                                  </span>
                                )}
                              </div>
                            )}
                          </div>
                          {isShared && sharedSectors && (
                            <span className="flex items-center gap-1 shrink-0">
                              <span className="text-[10px] font-medium text-amber-700 bg-amber-100 px-1.5 py-0.5 rounded">Synergie</span>
                              <span className="text-[9px] text-gray-400">
                                ook: {sharedSectors.filter((s) => s !== sector).join(", ")}
                              </span>
                            </span>
                          )}
                          {onDeleteCapability && (
                            <button onClick={() => onDeleteCapability(c.id)} className="text-gray-300 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-opacity shrink-0" title="Verwijder">
                              {"\u2715"}
                            </button>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Inspanningen per domein */}
              {goalEfforts.length > 0 && (
                <div>
                  <h5 className="text-[11px] font-semibold text-din-inspanningen uppercase tracking-wider mb-1.5 flex items-center gap-1.5">
                    <div className="w-1.5 h-1.5 rounded-full bg-din-inspanningen" />
                    Inspanningen ({goalEfforts.length})
                  </h5>
                  <div className="grid grid-cols-2 gap-2">
                    {(Object.entries(DOMAIN_LABELS) as [EffortDomain, string][]).map(([domain, label]) => {
                      const domainEfforts = goalEfforts.filter((e) => e.domain === domain);
                      if (domainEfforts.length === 0) return null;
                      return (
                        <div key={domain} className="bg-gray-50 rounded-lg p-2">
                          <div className="text-[10px] font-medium text-gray-500 mb-1 flex items-center gap-1">
                            <div className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: DOMAIN_BAR_COLORS[domain] }} />
                            {label} ({domainEfforts.length})
                          </div>
                          <div className="space-y-0.5">
                            {domainEfforts.map((e) => (
                              <div key={e.id} className="flex items-center gap-1.5 text-[11px] group py-0.5">
                                <span className="text-gray-600 flex-1">{e.description || "(naamloos)"}</span>
                                {e.quarter && <span className="text-[10px] text-gray-400 shrink-0">{e.quarter}</span>}
                                {e.status && e.status !== "gepland" && (
                                  <span className={`text-[9px] px-1 rounded shrink-0 ${STATUS_STYLES[e.status] || ""}`}>{STATUS_TEXT[e.status] || e.status}</span>
                                )}
                                {onDeleteEffort && (
                                  <button onClick={() => onDeleteEffort(e.id)} className="text-gray-300 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-opacity shrink-0" title="Verwijder">
                                    {"\u2715"}
                                  </button>
                                )}
                              </div>
                            ))}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}

// --- Cross-sector Content ---

function CrossSectorContent({
  session,
  sharedCaps,
  sectorsWithData,
}: {
  session: DINSession;
  sharedCaps: Map<string, string[]>;
  sectorsWithData: SectorName[];
}) {
  return (
    <div className="space-y-4">
      {/* Sector vergelijking */}
      <div className="border border-gray-200 rounded-xl bg-white overflow-hidden">
        <div className="bg-gray-50 px-5 py-3 border-b border-gray-200">
          <h4 className="text-sm font-semibold text-cito-blue">Vergelijking per sector</h4>
        </div>
        <div className="p-5">
          <div className="grid grid-cols-3 gap-4">
            {SECTORS.map((sector) => {
              const benefits = session.benefits.filter((b) => b.sectorId === sector).length;
              const caps = session.capabilities.filter((c) => c.sectorId === sector).length;
              const efforts = session.efforts.filter((e) => e.sectorId === sector).length;
              const total = benefits + caps + efforts;
              const sectorColors = SECTOR_COLORS[sector];

              return (
                <div key={sector} className={`rounded-lg border p-4 ${sectorColors}`}>
                  <div className="font-semibold text-sm mb-3">{sector}</div>
                  <div className="space-y-2">
                    <div className="flex justify-between text-xs">
                      <span>Baten</span>
                      <span className="font-bold">{benefits}</span>
                    </div>
                    <div className="flex justify-between text-xs">
                      <span>Vermogens</span>
                      <span className="font-bold">{caps}</span>
                    </div>
                    <div className="flex justify-between text-xs">
                      <span>Inspanningen</span>
                      <span className="font-bold">{efforts}</span>
                    </div>
                    <div className="border-t pt-1.5 mt-1.5 flex justify-between text-xs font-semibold">
                      <span>Totaal</span>
                      <span>{total}</span>
                    </div>
                  </div>

                  {/* Domain balance for this sector */}
                  <div className="mt-3 pt-2 border-t space-y-1">
                    {(Object.entries(DOMAIN_LABELS) as [EffortDomain, string][]).map(([domain, label]) => {
                      const count = session.efforts.filter((e) => e.sectorId === sector && e.domain === domain).length;
                      return (
                        <div key={domain} className="flex items-center gap-2 text-[10px]">
                          <div className="w-1.5 h-1.5 rounded-full shrink-0" style={{ backgroundColor: DOMAIN_BAR_COLORS[domain] }} />
                          <span className="flex-1">{label}</span>
                          <span className="font-semibold">{count}</span>
                          {count === 0 && <span className="text-red-400">!</span>}
                        </div>
                      );
                    })}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* Gedeelde vermogens (synergieën) */}
      {sharedCaps.size > 0 && (
        <div className="border border-amber-200 rounded-xl bg-amber-50/30 overflow-hidden">
          <div className="bg-amber-50 px-5 py-3 border-b border-amber-200 flex items-center gap-2">
            <span className="text-[10px] bg-amber-100 text-amber-700 px-1.5 py-0.5 rounded font-medium">Synergie</span>
            <h4 className="text-sm font-semibold text-amber-800">Gedeelde vermogens ({sharedCaps.size})</h4>
          </div>
          <div className="p-5 space-y-2">
            {Array.from(sharedCaps.entries()).map(([capId, sectors]) => {
              const cap = session.capabilities.find((c) => c.id === capId);
              if (!cap) return null;
              return (
                <div key={capId} className="flex items-start gap-3 bg-white rounded-lg p-3 border border-amber-100">
                  <div className="flex-1">
                    <div className="text-xs text-gray-700 font-medium">{cap.description || "(naamloos)"}</div>
                    {(cap.currentLevel || cap.targetLevel) && (
                      <div className="flex items-center gap-2 mt-0.5 text-[10px]">
                        {cap.currentLevel && <span className="text-amber-600">Nu: {cap.currentLevel}/5</span>}
                        {cap.targetLevel && <span className="text-green-600">Doel: {cap.targetLevel}/5</span>}
                      </div>
                    )}
                  </div>
                  <div className="flex gap-1 shrink-0">
                    {sectors.map((s) => {
                      const colors = SECTOR_COLORS[s as SectorName] || "bg-gray-100 text-gray-700 border-gray-200";
                      return (
                        <span key={s} className={`inline-block px-1.5 py-0.5 rounded text-[10px] font-medium border ${colors}`}>
                          {s}
                        </span>
                      );
                    })}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Domeinbalans totaaloverzicht */}
      <div className="border border-gray-200 rounded-xl bg-white overflow-hidden">
        <div className="bg-gray-50 px-5 py-3 border-b border-gray-200">
          <h4 className="text-sm font-semibold text-cito-blue">Domeinbalans alle sectoren</h4>
        </div>
        <div className="p-5">
          <div className="grid grid-cols-4 gap-6">
            {(Object.entries(DOMAIN_LABELS) as [EffortDomain, string][]).map(([domain, label]) => {
              const allEfforts = session.efforts.filter((e) => e.domain === domain);
              const maxCount = Math.max(
                ...(Object.keys(DOMAIN_LABELS) as EffortDomain[]).map((d) => session.efforts.filter((e) => e.domain === d).length),
                1
              );
              const pct = Math.round((allEfforts.length / maxCount) * 100);

              return (
                <div key={domain} className="text-center">
                  <div className="text-2xl font-bold" style={{ color: DOMAIN_BAR_COLORS[domain] }}>{allEfforts.length}</div>
                  <div className="text-xs text-gray-500 mb-2">{label}</div>
                  <div className="h-2 bg-gray-100 rounded-full overflow-hidden mb-2">
                    <div className="h-full rounded-full transition-all" style={{ width: `${pct}%`, backgroundColor: DOMAIN_BAR_COLORS[domain] }} />
                  </div>
                  <div className="space-y-0.5">
                    {SECTORS.map((s) => {
                      const count = allEfforts.filter((e) => e.sectorId === s).length;
                      if (count === 0) return null;
                      const colors = SECTOR_COLORS[s];
                      return (
                        <div key={s} className="flex items-center justify-center gap-1">
                          <span className={`inline-block px-1 py-0 rounded text-[9px] font-medium border ${colors}`}>{s}</span>
                          <span className="text-[10px] text-gray-400">{count}</span>
                        </div>
                      );
                    })}
                  </div>
                  {allEfforts.length === 0 && <div className="text-[10px] text-red-400 mt-1">Ontbreekt</div>}
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}
