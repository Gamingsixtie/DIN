"use client";

import { useState, useMemo } from "react";
import type { DINSession, DINBenefit, DINCapability, DINEffort, EffortDomain, SectorName } from "@/lib/types";
import { SECTORS, SECTOR_COLORS } from "@/lib/types";
import { findSharedCapabilities, findGaps, buildChainsForSector, analyzeHefbomen, findEffortClusters } from "@/lib/din-service";
import type { BenefitCluster, ClusterSectorChain, EffortCluster } from "@/lib/din-service";
import { DOMAIN_LABELS } from "@/components/din/EffortCard";
import DINNetworkGraph from "@/components/din/DINNetworkGraph";

type ViewMode = "grafisch" | "tabel";
type SectorTab = SectorName | "cross";

interface MergedDINViewProps {
  session: DINSession;
  onSwitchToEdit: () => void;
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

const STATUS_BORDER_COLORS: Record<string, string> = {
  gepland: "#d1d5db",
  in_uitvoering: "#22c55e",
  afgerond: "#3b82f6",
  on_hold: "#f59e0b",
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

const SECTOR_BORDER_LEFT: Record<SectorName, string> = {
  PO: "border-l-blue-400",
  VO: "border-l-green-400",
  Zakelijk: "border-l-purple-400",
};

// Chevron SVG component
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

// UX-11: Zoekterm highlighting
function HighlightText({ text, query }: { text: string; query: string }) {
  if (!query || !text) return <>{text}</>;
  const idx = text.toLowerCase().indexOf(query.toLowerCase());
  if (idx === -1) return <>{text}</>;
  return (
    <>
      {text.slice(0, idx)}
      <mark className="bg-yellow-200/70 rounded px-0.5 text-inherit">{text.slice(idx, idx + query.length)}</mark>
      {text.slice(idx + query.length)}
    </>
  );
}

// DIN-keten completheid indicator
function ChainIndicator({ hasBenefits, hasCapabilities, hasEfforts }: { hasBenefits: boolean; hasCapabilities: boolean; hasEfforts: boolean }) {
  return (
    <div className="flex items-center gap-1" title={`Baten: ${hasBenefits ? "✓" : "✗"} | Vermogens: ${hasCapabilities ? "✓" : "✗"} | Inspanningen: ${hasEfforts ? "✓" : "✗"}`}>
      <div className={`w-2 h-2 rounded-full ${hasBenefits ? "bg-din-baten" : "bg-gray-200"}`} />
      <div className={`w-2 h-2 rounded-full ${hasCapabilities ? "bg-din-vermogens" : "bg-gray-200"}`} />
      <div className={`w-2 h-2 rounded-full ${hasEfforts ? "bg-din-inspanningen" : "bg-gray-200"}`} />
    </div>
  );
}

// 5-dot level display (read-only)
function LevelDots({ value, color }: { value: number; color: "amber" | "green" }) {
  const fillColor = color === "amber" ? "bg-amber-400" : "bg-green-500";
  return (
    <div className="flex items-center gap-0.5">
      {[1, 2, 3, 4, 5].map((l) => (
        <div key={l} className={`w-1.5 h-1.5 rounded-full ${l <= value ? fillColor : "bg-gray-200"}`} />
      ))}
    </div>
  );
}

export default function MergedDINView({
  session,
  onSwitchToEdit,
}: MergedDINViewProps) {
  const [viewMode, setViewMode] = useState<ViewMode>("tabel");
  const [activeTab, setActiveTab] = useState<SectorTab>("PO");
  const [collapsedGoals, setCollapsedGoals] = useState<Set<string>>(new Set());
  const [searchQuery, setSearchQuery] = useState("");
  const sharedCaps = useMemo(() => findSharedCapabilities(session.capabilities), [session.capabilities]);

  const sectorsWithData = SECTORS.filter(
    (s) =>
      session.benefits.some((b) => b.sectorId === s) ||
      session.capabilities.some((c) => c.sectorId === s) ||
      session.efforts.some((e) => e.sectorId === s)
  );

  function toggleGoal(id: string) {
    const next = new Set(collapsedGoals);
    if (next.has(id)) next.delete(id);
    else next.add(id);
    setCollapsedGoals(next);
  }

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

  const statItems = [
    { label: "Doelen", value: session.goals.length, color: "bg-din-doelen" },
    { label: "Baten", value: session.benefits.length, color: "bg-din-baten" },
    { label: "Vermogens", value: session.capabilities.length, color: "bg-din-vermogens" },
    { label: "Inspanningen", value: session.efforts.length, color: "bg-din-inspanningen" },
  ];

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-start justify-between flex-wrap gap-3">
        <div>
          <h3 className="text-lg font-semibold text-cito-blue">Samengevoegd DIN-Netwerk</h3>
          {/* Stats banner */}
          <div className="flex items-center gap-2.5 mt-2 flex-wrap">
            {statItems.map((s, i) => (
              <div key={s.label} className="flex items-center gap-1.5">
                {i > 0 && <div className="w-px h-4 bg-gray-200 -ml-1 mr-0.5" />}
                <div className={`w-5 h-5 rounded ${s.color} flex items-center justify-center text-white text-[10px] font-bold`}>
                  {s.value}
                </div>
                <span className="text-xs text-gray-500">{s.label}</span>
              </div>
            ))}
            <div className="w-px h-4 bg-gray-200" />
            <span className="text-xs text-gray-400">{sectorsWithData.length}/{SECTORS.length} sectoren</span>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <div className="flex items-center gap-0.5 p-0.5 bg-gray-100 rounded-md" role="tablist" aria-label="Weergavemodus">
            <button
              role="tab"
              aria-selected={viewMode === "grafisch"}
              onClick={() => setViewMode("grafisch")}
              className={`px-3 py-1.5 rounded text-xs font-medium transition-colors focus-visible:ring-2 focus-visible:ring-cito-blue/40 focus-visible:outline-none ${viewMode === "grafisch" ? "bg-white text-cito-blue shadow-sm" : "text-gray-500 hover:text-gray-700"}`}
            >
              Keten-overzicht
            </button>
            <button
              role="tab"
              aria-selected={viewMode === "tabel"}
              onClick={() => setViewMode("tabel")}
              className={`px-3 py-1.5 rounded text-xs font-medium transition-colors focus-visible:ring-2 focus-visible:ring-cito-blue/40 focus-visible:outline-none ${viewMode === "tabel" ? "bg-white text-cito-blue shadow-sm" : "text-gray-500 hover:text-gray-700"}`}
            >
              Sector-dashboard
            </button>
          </div>
          <button onClick={onSwitchToEdit} className="px-3 py-1.5 text-sm text-cito-blue border border-cito-blue rounded-lg hover:bg-blue-50 focus-visible:ring-2 focus-visible:ring-cito-blue/40 focus-visible:outline-none">
            Per Sector bewerken
          </button>
        </div>
      </div>

      {/* UX-15: Zoekbalk boven beide views */}
      <div className="relative">
        <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M21 21l-5.197-5.197m0 0A7.5 7.5 0 105.196 5.196a7.5 7.5 0 0010.607 10.607z" />
        </svg>
        <input
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="w-full pl-9 pr-8 py-2 text-sm border border-gray-200 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-cito-blue/30 focus:border-cito-blue/30"
          placeholder="Zoek in baten, vermogens, inspanningen..."
          aria-label="Zoek in DIN-items"
        />
        {searchQuery && (
          <button onClick={() => setSearchQuery("")} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600" aria-label="Zoekopdracht wissen">
            &#10005;
          </button>
        )}
      </div>

      {/* UX-3: Zoekresultaten feedback */}
      {searchQuery && (() => {
        const totalItems = session.benefits.length + session.capabilities.length + session.efforts.length;
        const matchedB = filterBenefits(session.benefits, searchQuery).length;
        const matchedC = filterCapabilities(session.capabilities, searchQuery).length;
        const matchedE = filterEfforts(session.efforts, searchQuery).length;
        const matchedTotal = matchedB + matchedC + matchedE;
        return (
          <div className={`text-xs px-3 py-1.5 rounded-lg ${matchedTotal > 0 ? "bg-blue-50 text-blue-600" : "bg-amber-50 text-amber-600"}`} role="status" aria-live="polite">
            {matchedTotal > 0
              ? `${matchedTotal} van ${totalItems} items gevonden`
              : `Geen resultaten voor "${searchQuery}"`}
          </div>
        );
      })()}

      {/* Grafische weergave */}
      {viewMode === "grafisch" && <DINNetworkGraph session={session} searchQuery={searchQuery} />}

      {/* Tabel weergave — per sector */}
      {viewMode === "tabel" && (
        <div className="space-y-4">
          {/* UX-12: Sticky sector tabs + UX-18: Accessibility */}
          <div className="sticky top-0 z-10 bg-white/95 backdrop-blur-sm py-2 -mx-1 px-1" role="tablist" aria-label="Sector navigatie">
            <div className="flex items-center gap-1 p-1 bg-gray-50 rounded-lg border border-gray-200">
              {SECTORS.map((sector) => {
                const stats = getSectorStats(sector);
                const hasData = stats.benefits + stats.capabilities + stats.efforts > 0;
                const isActive = activeTab === sector;
                const styles = SECTOR_TAB_STYLES[sector];
                return (
                  <button
                    key={sector}
                    role="tab"
                    aria-selected={isActive}
                    aria-controls={`sector-panel-${sector}`}
                    onClick={() => setActiveTab(sector)}
                    className={`flex items-center gap-2 px-4 py-2 rounded-md text-sm font-medium transition-colors border focus-visible:ring-2 focus-visible:ring-cito-blue/40 focus-visible:outline-none ${
                      isActive ? styles.active : `border-transparent ${styles.inactive}`
                    } ${!hasData ? "opacity-40" : ""}`}
                  >
                    <span>{sector}</span>
                    {hasData && (
                      <span className={`flex items-center gap-1 text-[10px] px-1.5 py-0.5 rounded-full ${isActive ? "bg-white/60" : "bg-gray-100"}`}>
                        <span className="text-din-baten font-semibold">{stats.benefits}</span>
                        <span className="text-gray-300">|</span>
                        <span className="text-din-vermogens font-semibold">{stats.capabilities}</span>
                        <span className="text-gray-300">|</span>
                        <span className="text-din-inspanningen font-semibold">{stats.efforts}</span>
                      </span>
                    )}
                  </button>
                );
              })}
              <button
                role="tab"
                aria-selected={activeTab === "cross"}
                aria-controls="sector-panel-cross"
                onClick={() => setActiveTab("cross")}
                className={`flex items-center gap-2 px-4 py-2 rounded-md text-sm font-medium transition-colors border ml-auto focus-visible:ring-2 focus-visible:ring-cito-blue/40 focus-visible:outline-none ${
                  activeTab === "cross" ? "bg-cito-blue/10 text-cito-blue border-cito-blue/30" : "border-transparent text-gray-500 hover:bg-gray-100"
                }`}
              >
                Cross-sector
              </button>
            </div>
          </div>

          {/* Per sector content — UX-14: geen delete-knoppen in overzicht */}
          {activeTab !== "cross" && (
            <div role="tabpanel" id={`sector-panel-${activeTab}`} aria-label={`Sector ${activeTab}`}>
              <SectorContent
                session={session}
                sector={activeTab}
                sharedCaps={sharedCaps}
                collapsedGoals={collapsedGoals}
                toggleGoal={toggleGoal}
                setCollapsedGoals={setCollapsedGoals}
                searchQuery={searchQuery}
              />
            </div>
          )}

          {/* Cross-sector content */}
          {activeTab === "cross" && (
            <div role="tabpanel" id="sector-panel-cross" aria-label="Cross-sector analyse">
              <CrossSectorContent
                session={session}
                sharedCaps={sharedCaps}
                sectorsWithData={sectorsWithData}
              />
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// --- Helper: text filter matching ---
function matchesSearch(text: string, query: string): boolean {
  if (!query) return true;
  return text.toLowerCase().includes(query.toLowerCase());
}

function filterBenefits(benefits: DINBenefit[], query: string): DINBenefit[] {
  if (!query) return benefits;
  return benefits.filter((b) =>
    matchesSearch(b.title || "", query) ||
    matchesSearch(b.description, query) ||
    matchesSearch(b.profiel.indicator, query) ||
    matchesSearch(b.profiel.indicatorOwner, query)
  );
}

function filterCapabilities(capabilities: DINCapability[], query: string): DINCapability[] {
  if (!query) return capabilities;
  return capabilities.filter((c) => matchesSearch(c.title || "", query) || matchesSearch(c.description, query));
}

function filterEfforts(efforts: DINEffort[], query: string): DINEffort[] {
  if (!query) return efforts;
  return efforts.filter((e) => matchesSearch(e.title || "", query) || matchesSearch(e.description, query));
}

// --- Sector Content ---

function SectorContent({
  session,
  sector,
  sharedCaps,
  collapsedGoals,
  toggleGoal,
  setCollapsedGoals,
  searchQuery,
}: {
  session: DINSession;
  sector: SectorName;
  sharedCaps: Map<string, string[]>;
  collapsedGoals: Set<string>;
  toggleGoal: (id: string) => void;
  setCollapsedGoals: (s: Set<string>) => void;
  searchQuery: string;
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

  const goalIds = new Set([...sectorBenefits.map((b) => b.goalId)]);
  const relevantGoals = session.goals
    .filter((g) => goalIds.has(g.id))
    .sort((a, b) => a.rank - b.rank);

  return (
    <div className="space-y-4">
      {/* Sector dashboard */}
      {/* UX-13: Keten-completheid per sector */}
      {(() => {
        let totalChains = 0;
        let completeChains = 0;
        relevantGoals.forEach((g) => {
          const cr = buildChainsForSector(session, g.id, sector);
          cr.chains.forEach((c) => {
            totalChains++;
            if (c.links.length > 0 && c.links.some((l) => l.efforts.length > 0)) completeChains++;
          });
        });
        const incompleteChains = totalChains - completeChains;
        return (
          <div className={`rounded-xl border-l-4 border border-gray-200 p-5 bg-white shadow-sm ${SECTOR_BORDER_LEFT[sector]}`}>
            <div className="flex items-start justify-between mb-4">
              <div>
                <h4 className="text-base font-bold text-gray-800">Sector {sector}</h4>
                <p className="text-xs text-gray-400 mt-0.5">{relevantGoals.length} doelen met DIN-invulling</p>
              </div>
              {totalChains > 0 && (
                <div className="flex items-center gap-2 text-xs">
                  <span className="text-green-600 font-medium">{completeChains} volledige keten{completeChains !== 1 ? "s" : ""}</span>
                  {incompleteChains > 0 && (
                    <>
                      <span className="text-gray-300">|</span>
                      <span className="text-amber-600 font-medium">{incompleteChains} onvolledig</span>
                    </>
                  )}
                </div>
              )}
            </div>

            {/* Stat blokken */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mb-4">
              <div className="bg-din-baten/10 rounded-lg p-3 text-center">
                <div className="text-xl font-bold text-din-baten">{sectorBenefits.length}</div>
                <div className="text-[11px] text-gray-500 font-medium">Baten</div>
              </div>
              <div className="bg-din-vermogens/10 rounded-lg p-3 text-center">
                <div className="text-xl font-bold text-din-vermogens">{sectorCaps.length}</div>
                <div className="text-[11px] text-gray-500 font-medium">Vermogens</div>
              </div>
              <div className="bg-din-inspanningen/10 rounded-lg p-3 text-center">
                <div className="text-xl font-bold text-din-inspanningen">{sectorEfforts.length}</div>
                <div className="text-[11px] text-gray-500 font-medium">Inspanningen</div>
              </div>
            </div>

            {/* Domeinbalans — UX-16: responsive */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              {(Object.entries(DOMAIN_LABELS) as [EffortDomain, string][]).map(([domain, label]) => {
                const count = sectorEfforts.filter((e) => e.domain === domain).length;
                const maxCount = Math.max(...(Object.keys(DOMAIN_LABELS) as EffortDomain[]).map((d) => sectorEfforts.filter((e) => e.domain === d).length), 1);
                const pct = Math.round((count / maxCount) * 100);
                return (
                  <div key={domain}>
                    <div className="flex items-center justify-between text-[11px] mb-1">
                      <span className="text-gray-600 font-medium">{label}</span>
                      <span className="font-bold" style={{ color: DOMAIN_BAR_COLORS[domain] }}>{count}</span>
                    </div>
                    <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
                      <div className="h-full rounded-full transition-all" style={{ width: `${pct}%`, backgroundColor: DOMAIN_BAR_COLORS[domain] }} />
                    </div>
                    {count === 0 && <div className="text-[10px] text-red-400 mt-0.5 font-medium">Ontbreekt</div>}
                  </div>
                );
              })}
            </div>
          </div>
        );
      })()}

      {/* Alles in-/uitklappen */}
      <div className="flex items-center justify-end">
        <button
          onClick={() => {
            if (collapsedGoals.size === 0) {
              setCollapsedGoals(new Set(relevantGoals.map((g) => g.id)));
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

      {/* Per goal */}
      {relevantGoals.map((goal) => {
        const goalBenefits = filterBenefits(sectorBenefits.filter((b) => b.goalId === goal.id), searchQuery);
        const goalBenefitIds = new Set(sectorBenefits.filter((b) => b.goalId === goal.id).map((b) => b.id));

        const linkedCapIds = new Set(
          session.benefitCapabilityMaps
            .filter((m) => goalBenefitIds.has(m.benefitId))
            .map((m) => m.capabilityId)
        );
        const goalCaps = filterCapabilities(
          linkedCapIds.size > 0 ? sectorCaps.filter((c) => linkedCapIds.has(c.id)) : sectorCaps,
          searchQuery
        );

        const goalCapIdSet = new Set(sectorCaps.filter((c) => linkedCapIds.size > 0 ? linkedCapIds.has(c.id) : true).map((c) => c.id));
        const linkedEffortIds = new Set(
          session.capabilityEffortMaps
            .filter((m) => goalCapIdSet.has(m.capabilityId))
            .map((m) => m.effortId)
        );
        const goalEfforts = filterEfforts(
          linkedEffortIds.size > 0 ? sectorEfforts.filter((e) => linkedEffortIds.has(e.id)) : sectorEfforts,
          searchQuery
        );

        const isCollapsed = collapsedGoals.has(goal.id);
        const hasBenefits = sectorBenefits.filter((b) => b.goalId === goal.id).length > 0;
        const hasCaps = (linkedCapIds.size > 0 ? sectorCaps.filter((c) => linkedCapIds.has(c.id)) : sectorCaps).length > 0;
        const hasEfforts = (linkedEffortIds.size > 0 ? sectorEfforts.filter((e) => linkedEffortIds.has(e.id)) : sectorEfforts).length > 0;

        // UX-13: Keten-samenvatting per doel
        const goalChainResult = buildChainsForSector(session, goal.id, sector);
        const goalCompleteChains = goalChainResult.chains.filter((c) => c.links.length > 0 && c.links.some((l) => l.efforts.length > 0)).length;
        const goalIncompleteChains = goalChainResult.chains.length - goalCompleteChains;

        // Skip goal if search active and no matches
        if (searchQuery && goalBenefits.length === 0 && goalCaps.length === 0 && goalEfforts.length === 0) return null;

        return (
          <div key={goal.id} className="border border-gray-200 rounded-xl overflow-hidden bg-white shadow-sm">
            {/* Goal header — klikbaar — UX-18: aria-expanded */}
            <div
              className="bg-gradient-to-r from-din-doelen/15 to-din-doelen/5 px-4 py-3 border-b border-gray-200 flex items-center gap-3 cursor-pointer hover:from-din-doelen/20 hover:to-din-doelen/10 transition-all select-none"
              onClick={() => toggleGoal(goal.id)}
              role="button"
              aria-expanded={!isCollapsed}
              tabIndex={0}
              onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); toggleGoal(goal.id); } }}
            >
              <div className="shrink-0 w-7 h-7 rounded-lg bg-din-doelen text-white flex items-center justify-center text-xs font-bold shadow-sm">
                {goal.rank}
              </div>
              <div className="flex-1 min-w-0">
                <div className="text-sm font-semibold text-gray-800">{goal.name}</div>
                {goal.description && !isCollapsed && (
                  <div className="text-[11px] text-gray-500 mt-0.5 line-clamp-1">{goal.description}</div>
                )}
              </div>
              <ChainIndicator hasBenefits={hasBenefits} hasCapabilities={hasCaps} hasEfforts={hasEfforts} />
              {/* UX-13: Mini keten-samenvatting */}
              {goalChainResult.chains.length > 0 && (
                <span className={`text-[9px] px-1.5 py-0.5 rounded font-medium ${goalIncompleteChains > 0 ? "bg-amber-50 text-amber-600" : "bg-green-50 text-green-600"}`}>
                  {goalCompleteChains}/{goalChainResult.chains.length} ketens
                </span>
              )}
              <div className="flex gap-1.5 shrink-0">
                {hasBenefits && <span className="text-[10px] bg-din-baten/10 text-din-baten px-1.5 py-0.5 rounded font-medium">{goalBenefits.length}</span>}
                {hasCaps && <span className="text-[10px] bg-din-vermogens/10 text-din-vermogens px-1.5 py-0.5 rounded font-medium">{goalCaps.length}</span>}
                {hasEfforts && <span className="text-[10px] bg-din-inspanningen/10 text-din-inspanningen px-1.5 py-0.5 rounded font-medium">{goalEfforts.length}</span>}
              </div>
              <ChevronIcon expanded={!isCollapsed} className="text-gray-400 shrink-0" />
            </div>

            {/* Content — inklapbaar met animatie */}
            <div className="collapse-wrapper" data-collapsed={isCollapsed ? "true" : "false"}>
              <div>
                <div className="p-4 space-y-4">
                  {/* Baten — UX-11: HighlightText */}
                  {goalBenefits.length > 0 && (
                    <div>
                      <h5 className="text-[11px] font-semibold text-din-baten uppercase tracking-wider mb-2 flex items-center gap-1.5">
                        <div className="w-1.5 h-1.5 rounded-full bg-din-baten" />
                        Baten ({goalBenefits.length})
                      </h5>
                      <div className="space-y-2">
                        {goalBenefits.map((b) => (
                          <div key={b.id} className="bg-white border border-din-baten/20 rounded-lg p-2.5 hover:border-din-baten/40 transition-colors">
                            <span className="text-xs text-gray-700 font-medium">
                              <HighlightText text={b.title || b.description || "(naamloos)"} query={searchQuery} />
                            </span>
                            {b.profiel.indicator && (
                              <div className="mt-1.5 flex items-center gap-2 text-[11px]">
                                <span className="text-gray-400 font-medium"><HighlightText text={b.profiel.indicator} query={searchQuery} /></span>
                                <div className="flex items-center gap-1 bg-gray-50 rounded px-1.5 py-0.5">
                                  <span className="text-amber-600 font-semibold">{b.profiel.currentValue}</span>
                                  <span className="text-gray-300">{"\u2192"}</span>
                                  <span className="text-green-600 font-semibold">{b.profiel.targetValue}</span>
                                </div>
                              </div>
                            )}
                            {b.profiel.indicatorOwner && (
                              <div className="mt-0.5 text-[10px] text-gray-400">Eigenaar: <HighlightText text={b.profiel.indicatorOwner} query={searchQuery} /></div>
                            )}
                            {/* Gekoppeld vermogen */}
                            {(() => {
                              const lCaps = session.benefitCapabilityMaps
                                .filter((m) => m.benefitId === b.id)
                                .map((m) => session.capabilities.find((c) => c.id === m.capabilityId))
                                .filter(Boolean);
                              if (lCaps.length === 0) return null;
                              return (
                                <div className="mt-1 flex items-center gap-1 text-[10px]">
                                  <span className="text-din-vermogens">{"\u2192"}</span>
                                  <span className="text-gray-400">Vermogen:</span>
                                  {lCaps.map((c) => (
                                    <span key={c!.id} className="text-din-vermogens font-medium">{c!.title || c!.description?.slice(0, 30) || "?"}</span>
                                  ))}
                                </div>
                              );
                            })()}
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Vermogens — UX-11: HighlightText, UX-14: geen delete */}
                  {goalCaps.length > 0 && (
                    <div>
                      <h5 className="text-[11px] font-semibold text-din-vermogens uppercase tracking-wider mb-2 flex items-center gap-1.5">
                        <div className="w-1.5 h-1.5 rounded-full bg-din-vermogens" />
                        Vermogens ({goalCaps.length})
                      </h5>
                      <div className="space-y-2">
                        {goalCaps.map((c) => {
                          const isShared = sharedCaps.has(c.id);
                          const sharedSectors = sharedCaps.get(c.id);
                          return (
                            <div key={c.id} className={`p-2.5 rounded-lg transition-colors ${isShared ? "bg-amber-50 border border-amber-200" : "bg-white border border-din-vermogens/20 hover:border-din-vermogens/40"}`}>
                              <div className="flex items-start justify-between">
                                <span className="text-xs text-gray-700 font-medium flex-1">
                                  <HighlightText text={c.title || c.description || "(naamloos)"} query={searchQuery} />
                                </span>
                                {isShared && sharedSectors && (
                                  <span className="flex items-center gap-1 shrink-0 ml-2">
                                    <span className="text-[10px] font-medium text-amber-700 bg-amber-100 px-1.5 py-0.5 rounded">Synergie</span>
                                    <span className="text-[9px] text-gray-400">
                                      ook: {sharedSectors.filter((s) => s !== sector).join(", ")}
                                    </span>
                                  </span>
                                )}
                              </div>
                              {(c.currentLevel || c.targetLevel) && (
                                <div className="flex items-center gap-4 mt-1.5">
                                  {c.currentLevel && (
                                    <div className="flex items-center gap-1.5">
                                      <span className="text-[9px] text-gray-400">Nu</span>
                                      <LevelDots value={c.currentLevel} color="amber" />
                                    </div>
                                  )}
                                  {c.targetLevel && (
                                    <div className="flex items-center gap-1.5">
                                      <span className="text-[9px] text-gray-400">Doel</span>
                                      <LevelDots value={c.targetLevel} color="green" />
                                    </div>
                                  )}
                                  {c.currentLevel && c.targetLevel && c.targetLevel > c.currentLevel && (
                                    <span className={`text-[10px] px-1 rounded font-medium ${c.targetLevel - c.currentLevel >= 3 ? "bg-red-100 text-red-700" : c.targetLevel - c.currentLevel >= 2 ? "bg-amber-100 text-amber-700" : "bg-green-100 text-green-700"}`}>
                                      +{c.targetLevel - c.currentLevel}
                                    </span>
                                  )}
                                </div>
                              )}
                              {/* Gekoppelde inspanningen */}
                              {(() => {
                                const linkedEffs = session.capabilityEffortMaps
                                  .filter((m) => m.capabilityId === c.id)
                                  .map((m) => session.efforts.find((e) => e.id === m.effortId))
                                  .filter(Boolean);
                                if (linkedEffs.length === 0) return null;
                                return (
                                  <div className="mt-1 flex items-center gap-1 flex-wrap text-[10px]">
                                    <span className="text-din-inspanningen">{"\u2192"}</span>
                                    <span className="text-gray-400">Inspanningen:</span>
                                    {linkedEffs.map((e, i) => (
                                      <span key={e!.id}>
                                        <span className="text-din-inspanningen font-medium">{e!.title || e!.description?.slice(0, 25) || "?"}</span>
                                        {i < linkedEffs.length - 1 && <span className="text-gray-300">, </span>}
                                      </span>
                                    ))}
                                  </div>
                                );
                              })()}
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  )}

                  {/* Inspanningen per domein — UX-11: HighlightText, UX-14: geen delete, UX-16: responsive */}
                  {goalEfforts.length > 0 && (
                    <div>
                      <h5 className="text-[11px] font-semibold text-din-inspanningen uppercase tracking-wider mb-2 flex items-center gap-1.5">
                        <div className="w-1.5 h-1.5 rounded-full bg-din-inspanningen" />
                        Inspanningen ({goalEfforts.length})
                      </h5>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                        {(Object.entries(DOMAIN_LABELS) as [EffortDomain, string][]).map(([domain, label]) => {
                          const domainEfforts = goalEfforts.filter((e) => e.domain === domain);
                          if (domainEfforts.length === 0) return null;
                          return (
                            <div key={domain} className="bg-gray-50 rounded-lg p-2.5">
                              <div className="text-[10px] font-medium text-gray-500 mb-1.5 flex items-center gap-1">
                                <div className="w-2 h-2 rounded-sm" style={{ backgroundColor: DOMAIN_BAR_COLORS[domain] }} />
                                {label} ({domainEfforts.length})
                              </div>
                              <div className="space-y-1">
                                {domainEfforts.map((e) => (
                                  <div
                                    key={e.id}
                                    className="flex items-center gap-1.5 text-[11px] py-1 pl-2 border-l-2 rounded-r-sm hover:bg-white/60 transition-colors"
                                    style={{ borderLeftColor: STATUS_BORDER_COLORS[e.status] || STATUS_BORDER_COLORS.gepland }}
                                  >
                                    <span className="text-gray-600 flex-1">
                                      <HighlightText text={e.title || e.description || "(naamloos)"} query={searchQuery} />
                                    </span>
                                    {e.quarter && <span className="text-[10px] bg-white text-gray-500 px-1.5 py-0.5 rounded shrink-0">{e.quarter}</span>}
                                    <span className={`text-[9px] px-1.5 py-0.5 rounded shrink-0 font-medium ${STATUS_STYLES[e.status] || ""}`}>{STATUS_TEXT[e.status] || e.status}</span>
                                  </div>
                                ))}
                              </div>
                            </div>
                          );
                        })}
                      </div>

                      {/* UX-17: Kwartaal-tijdlijn */}
                      {(() => {
                        const quarters = [...new Set(goalEfforts.map((e) => e.quarter).filter(Boolean))].sort();
                        if (quarters.length === 0) return null;
                        return (
                          <div className="mt-3 pt-3 border-t border-gray-100">
                            <div className="text-[10px] font-medium text-gray-400 uppercase tracking-wider mb-2">Tijdlijn</div>
                            <div className="flex gap-2 overflow-x-auto pb-1">
                              {quarters.map((q) => {
                                const qEfforts = goalEfforts.filter((e) => e.quarter === q);
                                return (
                                  <div key={q} className="shrink-0 bg-white border border-gray-200 rounded-lg p-2 min-w-[120px]">
                                    <div className="text-[10px] font-semibold text-gray-700 mb-1.5">{q}</div>
                                    <div className="space-y-1">
                                      {qEfforts.map((e) => {
                                        const dc = DOMAIN_BAR_COLORS[e.domain] || "#6b7280";
                                        return (
                                          <div key={e.id} className="flex items-center gap-1 text-[9px]">
                                            <div className="w-1.5 h-1.5 rounded-full shrink-0" style={{ backgroundColor: dc }} />
                                            <span className="text-gray-600 truncate">{e.title || e.description?.slice(0, 20) || "?"}</span>
                                          </div>
                                        );
                                      })}
                                    </div>
                                  </div>
                                );
                              })}
                            </div>
                          </div>
                        );
                      })()}
                    </div>
                  )}
                </div>
              </div>
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
  const hefboomResults = useMemo(() => analyzeHefbomen(session), [session]);
  const effortClusters = useMemo(() => findEffortClusters(session.efforts), [session.efforts]);

  const multiSectorClusters = useMemo(
    () => hefboomResults.flatMap((r) => r.clusters.filter((c) => c.hefboomScore > 1)),
    [hefboomResults]
  );
  const singleSectorClusters = useMemo(
    () => hefboomResults.flatMap((r) => r.clusters.filter((c) => c.hefboomScore === 1)),
    [hefboomResults]
  );
  const multiSectorEffortClusters = useMemo(
    () => effortClusters.filter((c) => c.hefboomScore > 1),
    [effortClusters]
  );

  const SECTOR_HEADER_COLORS: Record<SectorName, string> = {
    PO: "bg-blue-400",
    VO: "bg-green-400",
    Zakelijk: "bg-purple-400",
  };

  const SECTOR_DOT_COLORS: Record<string, string> = {
    PO: "bg-blue-400",
    VO: "bg-green-400",
    Zakelijk: "bg-purple-400",
  };

  // Verzamel prioriteits-inspanningen (uit multi-sector baten-clusters)
  const priorityEfforts = useMemo(() => {
    const crossSectorEffortIds = new Set<string>();
    hefboomResults.forEach((r) => {
      r.clusters.filter((c) => c.hefboomScore > 1).forEach((cluster) => {
        const chains = r.clusterChains.get(cluster.benefits[0].id) || [];
        chains.forEach((chain) => {
          chain.efforts.forEach((e) => crossSectorEffortIds.add(e.id));
        });
      });
    });
    return session.efforts.filter((e) => crossSectorEffortIds.has(e.id));
  }, [hefboomResults, session.efforts]);

  const hasAnyCrossSector = multiSectorClusters.length > 0 || multiSectorEffortClusters.length > 0;

  return (
    <div className="space-y-5">

      {/* 1. Introductie — waarom cross-analyse? */}
      <div className="bg-gradient-to-r from-cito-blue/5 to-cito-blue/10 rounded-xl border border-cito-blue/20 p-5">
        <div className="flex items-start gap-3">
          <div className="shrink-0 w-10 h-10 rounded-xl bg-cito-blue/10 flex items-center justify-center">
            <svg className="w-5 h-5 text-cito-blue" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M3.75 3v11.25A2.25 2.25 0 006 16.5h2.25M3.75 3h-1.5m1.5 0h16.5m0 0h1.5m-1.5 0v11.25A2.25 2.25 0 0118 16.5h-2.25m-7.5 0h7.5m-7.5 0l-1 3m8.5-3l1 3m0 0l.5 1.5m-.5-1.5h-9.5m0 0l-.5 1.5" />
            </svg>
          </div>
          <div>
            <h4 className="text-sm font-bold text-cito-blue">Hefboomanalyse</h4>
            <p className="text-xs text-gray-600 mt-1 leading-relaxed">
              Waar benoemen meerdere sectoren vergelijkbare baten en inspanningen? Die overlap wijst op <strong>hefbomen</strong>: investeer hier en alle sectoren profiteren.
              Hoe meer sectoren dezelfde richting op willen, hoe efficiënter het budget wordt ingezet.
            </p>
            <div className="flex items-center gap-4 mt-3">
              <div className="flex items-center gap-1.5">
                <div className="w-6 h-6 rounded-lg bg-green-500 text-white flex items-center justify-center text-xs font-bold">{multiSectorClusters.length}</div>
                <span className="text-xs text-gray-600">Baten-hefbomen</span>
              </div>
              <div className="flex items-center gap-1.5">
                <div className="w-6 h-6 rounded-lg bg-indigo-500 text-white flex items-center justify-center text-xs font-bold">{multiSectorEffortClusters.length}</div>
                <span className="text-xs text-gray-600">Inspannings-hefbomen</span>
              </div>
              <div className="flex items-center gap-1.5">
                <div className="w-6 h-6 rounded-lg bg-gray-200 text-gray-600 flex items-center justify-center text-xs font-bold">{singleSectorClusters.length}</div>
                <span className="text-xs text-gray-500">Sector-specifiek</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Empty state als er geen cross-sector hefbomen zijn */}
      {!hasAnyCrossSector && (
        <div className="border border-dashed border-gray-300 rounded-xl bg-gray-50/50 p-8 text-center">
          <div className="w-12 h-12 rounded-full bg-gray-100 flex items-center justify-center mx-auto mb-3">
            <svg className="w-6 h-6 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M21 21l-5.197-5.197m0 0A7.5 7.5 0 105.196 5.196a7.5 7.5 0 0010.607 10.607z" />
            </svg>
          </div>
          <h4 className="text-sm font-semibold text-gray-600 mb-1">Nog geen cross-sector hefbomen gevonden</h4>
          <p className="text-xs text-gray-400 max-w-md mx-auto leading-relaxed">
            Er zijn nog geen overeenkomsten in baten of inspanningen tussen sectoren gedetecteerd.
            Dit kan komen doordat er nog weinig DIN-items zijn ingevuld, of doordat de sectoren sterk verschillende focusgebieden hebben.
            Vul meer baten en inspanningen in per sector om overlap te ontdekken.
          </p>
        </div>
      )}

      {/* 2. Sector vergelijking (verplaatst omhoog) */}
      <div className="border border-gray-200 rounded-xl bg-white overflow-hidden shadow-sm">
        <div className="bg-gray-50 px-5 py-3 border-b border-gray-200">
          <h4 className="text-sm font-semibold text-cito-blue">Vergelijking per sector</h4>
        </div>
        <div className="p-5">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {SECTORS.map((sector) => {
              const benefits = session.benefits.filter((x) => x.sectorId === sector).length;
              const capabilities = session.capabilities.filter((x) => x.sectorId === sector).length;
              const efforts = session.efforts.filter((x) => x.sectorId === sector).length;
              const maxItemCount = Math.max(
                ...SECTORS.flatMap((s) => [
                  session.benefits.filter((x) => x.sectorId === s).length,
                  session.capabilities.filter((x) => x.sectorId === s).length,
                  session.efforts.filter((x) => x.sectorId === s).length,
                ]),
                1
              );
              return (
                <div key={sector} className="bg-white rounded-xl border border-gray-200 overflow-hidden shadow-sm">
                  <div className={`h-1.5 ${SECTOR_HEADER_COLORS[sector]}`} />
                  <div className="p-4">
                    <div className="flex items-center justify-between mb-3">
                      <span className="text-sm font-bold text-gray-800">{sector}</span>
                      <ChainIndicator hasBenefits={benefits > 0} hasCapabilities={capabilities > 0} hasEfforts={efforts > 0} />
                    </div>
                    <div className="space-y-2.5">
                      {[
                        { label: "Baten", count: benefits, color: "bg-din-baten" },
                        { label: "Vermogens", count: capabilities, color: "bg-din-vermogens" },
                        { label: "Inspanningen", count: efforts, color: "bg-din-inspanningen" },
                      ].map((item) => (
                        <div key={item.label}>
                          <div className="flex justify-between text-[11px] mb-0.5">
                            <span className="text-gray-500">{item.label}</span>
                            <span className="font-semibold text-gray-700">{item.count}</span>
                          </div>
                          <div className="h-1.5 bg-gray-100 rounded-full overflow-hidden">
                            <div className={`h-full rounded-full ${item.color} transition-all`} style={{ width: `${maxItemCount > 0 ? (item.count / maxItemCount) * 100 : 0}%` }} />
                          </div>
                        </div>
                      ))}
                    </div>
                    <div className="mt-3 pt-3 border-t border-gray-100">
                      <div className="grid grid-cols-2 gap-1.5">
                        {(Object.entries(DOMAIN_LABELS) as [EffortDomain, string][]).map(([domain, label]) => {
                          const count = session.efforts.filter((e) => e.sectorId === sector && e.domain === domain).length;
                          return (
                            <div key={domain} className="flex items-center gap-1.5 text-[10px]">
                              <div className="w-2 h-2 rounded-sm shrink-0" style={{ backgroundColor: DOMAIN_BAR_COLORS[domain] }} />
                              <span className="text-gray-500 flex-1">{label}</span>
                              <span className={`font-semibold ${count === 0 ? "text-red-400" : "text-gray-700"}`}>{count}</span>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* 3. INSPANNINGS-OVERLAP (NIEUW) — de echte hefboom */}
      {multiSectorEffortClusters.length > 0 && (
        <div className="border border-indigo-200 rounded-xl bg-white overflow-hidden shadow-sm">
          <div className="bg-indigo-50 px-5 py-3 border-b border-indigo-200 flex items-center gap-2">
            <svg className="w-4 h-4 text-indigo-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M18 18.72a9.094 9.094 0 003.741-.479 3 3 0 00-4.682-2.72m.94 3.198l.001.031c0 .225-.012.447-.037.666A11.944 11.944 0 0112 21c-2.17 0-4.207-.576-5.963-1.584A6.062 6.062 0 016 18.719m12 0a5.971 5.971 0 00-.941-3.197m0 0A5.995 5.995 0 0012 12.75a5.995 5.995 0 00-5.058 2.772m0 0a3 3 0 00-4.681 2.72 8.986 8.986 0 003.74.477m.94-3.197a5.971 5.971 0 00-.94 3.197M15 6.75a3 3 0 11-6 0 3 3 0 016 0zm6 3a2.25 2.25 0 11-4.5 0 2.25 2.25 0 014.5 0zm-13.5 0a2.25 2.25 0 11-4.5 0 2.25 2.25 0 014.5 0z" />
            </svg>
            <h4 className="text-sm font-semibold text-indigo-800">Inspannings-overlap: bundelen = besparen</h4>
            <span className="text-[10px] bg-indigo-100 text-indigo-700 px-1.5 py-0.5 rounded font-medium ml-auto">{multiSectorEffortClusters.length} clusters</span>
          </div>
          <div className="p-5">
            <p className="text-xs text-gray-500 mb-4">
              Deze inspanningen zijn vergelijkbaar over meerdere sectoren. Door ze te bundelen of centraal op te pakken kun je kosten besparen en consistentie bevorderen.
            </p>
            <div className="space-y-3">
              {multiSectorEffortClusters.map((cluster, idx) => (
                <div key={idx} className="rounded-xl border border-indigo-100 bg-indigo-50/20 overflow-hidden">
                  {/* Cluster header */}
                  <div className="px-4 py-2.5 bg-indigo-50/50 border-b border-indigo-100 flex items-center gap-3">
                    <div className="shrink-0 flex items-center gap-0.5" title={`${cluster.hefboomScore} sectoren`}>
                      {[1, 2, 3].map((n) => (
                        <svg key={n} className={`w-3.5 h-3.5 ${n <= cluster.hefboomScore ? "text-indigo-500" : "text-gray-200"}`} fill="currentColor" viewBox="0 0 20 20">
                          <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                        </svg>
                      ))}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="text-xs font-semibold text-gray-800">{cluster.theme}</div>
                      <div className="text-[10px] text-indigo-500 mt-0.5">{cluster.matchReason}</div>
                    </div>
                    <div className="flex items-center gap-1 shrink-0">
                      <div className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: DOMAIN_BAR_COLORS[cluster.domain] || "#6b7280" }} />
                      <span className="text-[10px] text-gray-500">{DOMAIN_LABELS[cluster.domain]}</span>
                    </div>
                    <div className="flex items-center gap-1 shrink-0">
                      {cluster.sectors.map((s) => {
                        const colors = SECTOR_COLORS[s as SectorName] || "bg-gray-100 text-gray-700 border-gray-200";
                        return (
                          <span key={s} className={`inline-block px-1.5 py-0.5 rounded text-[10px] font-medium border ${colors}`}>{s}</span>
                        );
                      })}
                    </div>
                  </div>

                  {/* Per-sector inspanningen */}
                  <div className="divide-y divide-indigo-50">
                    {cluster.efforts.map((effort) => {
                      const sectorColor = SECTOR_DOT_COLORS[effort.sectorId] || "bg-gray-400";
                      return (
                        <div key={effort.id} className="px-4 py-2.5 flex items-start gap-3">
                          <div className={`shrink-0 w-2.5 h-2.5 rounded-full mt-0.5 ${sectorColor}`} title={effort.sectorId} />
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2">
                              <span className="text-[9px] uppercase tracking-wider text-din-inspanningen font-semibold">{effort.sectorId}</span>
                            </div>
                            <div className="text-xs text-gray-700 font-medium mt-0.5">{effort.title || effort.description || "?"}</div>
                            <div className="flex items-center gap-2 mt-1 text-[10px] text-gray-400">
                              {effort.quarter && <span className="bg-gray-100 px-1 rounded">{effort.quarter}</span>}
                              {effort.dossier?.kostenraming && (
                                <span className="bg-amber-50 text-amber-600 px-1 rounded">{effort.dossier.kostenraming}</span>
                              )}
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>

                  {/* Consolidatie-advies */}
                  <div className="px-4 py-2.5 bg-indigo-50 border-t border-indigo-100">
                    <div className="flex items-start gap-2">
                      <svg className="w-3.5 h-3.5 text-indigo-500 shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5.002 5.002 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
                      </svg>
                      <span className="text-[11px] text-indigo-700 font-medium">{cluster.consolidatieAdvies}</span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* 4. HEFBOOMANALYSE PER DOEL — baten-clusters */}
      {hefboomResults
        .filter((r) => r.clusters.length > 0)
        .map((result) => {
          const goal = session.goals.find((g) => g.id === result.goalId);
          if (!goal) return null;
          const hasMultiSector = result.clusters.some((c) => c.hefboomScore > 1);

          return (
            <div key={result.goalId} className="border border-gray-200 rounded-xl bg-white overflow-hidden shadow-sm">
              {/* Goal header */}
              <div className="bg-gradient-to-r from-din-doelen/15 to-din-doelen/5 px-5 py-3 border-b border-gray-200 flex items-center gap-3">
                <div className="shrink-0 w-8 h-8 rounded-lg bg-din-doelen text-white flex items-center justify-center text-sm font-bold shadow-sm">
                  {goal.rank}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="text-sm font-semibold text-gray-800">{goal.name}</div>
                  {goal.description && (
                    <div className="text-[11px] text-gray-500 mt-0.5 line-clamp-1">{goal.description}</div>
                  )}
                </div>
                {hasMultiSector && (
                  <span className="text-[10px] bg-green-100 text-green-700 px-2 py-0.5 rounded-full font-medium">
                    Hefboom gevonden
                  </span>
                )}
              </div>

              <div className="p-5 space-y-4">
                {result.clusters.map((cluster, clusterIdx) => {
                  const chains = result.clusterChains.get(cluster.benefits[0].id) || [];
                  const isMultiSector = cluster.hefboomScore > 1;

                  const allEffortsInCluster = chains.flatMap((c) => c.efforts);
                  const uniqueEffortDomains = [...new Set(allEffortsInCluster.map((e) => e.domain))];

                  return (
                    <div
                      key={clusterIdx}
                      className={`rounded-xl border overflow-hidden ${
                        isMultiSector
                          ? "border-green-200 bg-green-50/30"
                          : "border-gray-100 bg-gray-50/30"
                      }`}
                    >
                      {/* Cluster header */}
                      <div className={`px-4 py-2.5 border-b flex flex-col gap-1 ${
                        isMultiSector ? "border-green-200 bg-green-50" : "border-gray-100 bg-gray-50"
                      }`}>
                        <div className="flex items-center gap-3">
                          {/* Hefboom score */}
                          <div className="shrink-0 flex items-center gap-0.5" title={`${cluster.hefboomScore} sector${cluster.hefboomScore > 1 ? "en" : ""}`}>
                            {[1, 2, 3].map((n) => (
                              <svg
                                key={n}
                                className={`w-3.5 h-3.5 ${n <= cluster.hefboomScore ? "text-green-500" : "text-gray-200"}`}
                                fill="currentColor"
                                viewBox="0 0 20 20"
                              >
                                <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                              </svg>
                            ))}
                          </div>

                          <div className="flex-1 min-w-0">
                            <div className="text-xs font-semibold text-gray-800">{cluster.theme}</div>
                            <div className="text-[10px] text-gray-400 mt-0.5">
                              {isMultiSector
                                ? `${cluster.hefboomScore} sectoren herkennen deze baat — investeer hier voor maximaal effect`
                                : "Sector-specifieke baat"}
                            </div>
                          </div>

                          {/* Sector badges */}
                          <div className="flex items-center gap-1 shrink-0">
                            {cluster.sectors.map((s) => {
                              const colors = SECTOR_COLORS[s as SectorName] || "bg-gray-100 text-gray-700 border-gray-200";
                              return (
                                <span key={s} className={`inline-block px-1.5 py-0.5 rounded text-[10px] font-medium border ${colors}`}>
                                  {s}
                                </span>
                              );
                            })}
                          </div>
                        </div>
                        {/* matchReason — waarom geclusterd? */}
                        {cluster.matchReason && isMultiSector && (
                          <div className="text-[10px] text-green-600 pl-[52px]">{cluster.matchReason}</div>
                        )}
                      </div>

                      {/* Per sector: baat → vermogens → inspanningen */}
                      <div className="divide-y divide-gray-100">
                        {chains.map((chain) => {
                          const sectorColor = SECTOR_DOT_COLORS[chain.sector] || "bg-gray-400";
                          return (
                            <div key={chain.benefit.id} className="px-4 py-3">
                              <div className="flex items-start gap-3">
                                {/* Sector indicator */}
                                <div className="shrink-0 mt-0.5">
                                  <div className={`w-2.5 h-2.5 rounded-full ${sectorColor}`} title={chain.sector} />
                                </div>

                                <div className="flex-1 min-w-0 space-y-2">
                                  {/* Baat */}
                                  <div>
                                    <div className="flex items-center gap-2">
                                      <span className="text-[9px] uppercase tracking-wider text-din-baten font-semibold">{chain.sector} — Baat</span>
                                    </div>
                                    <div className="text-xs text-gray-700 font-medium mt-0.5">
                                      {chain.benefit.title || chain.benefit.description || "(naamloos)"}
                                    </div>
                                    {chain.benefit.profiel.indicator && (
                                      <div className="flex items-center gap-2 mt-1 text-[10px]">
                                        <span className="text-gray-400">{chain.benefit.profiel.indicator}:</span>
                                        <span className="text-amber-600 font-semibold">{chain.benefit.profiel.currentValue}</span>
                                        <span className="text-gray-300">{"\u2192"}</span>
                                        <span className="text-green-600 font-semibold">{chain.benefit.profiel.targetValue}</span>
                                      </div>
                                    )}
                                  </div>

                                  {/* Vermogens */}
                                  {chain.capabilities.length > 0 && (
                                    <div className="pl-3 border-l-2 border-din-vermogens/30">
                                      <span className="text-[9px] uppercase tracking-wider text-din-vermogens font-semibold">Vermogens</span>
                                      <div className="space-y-1 mt-0.5">
                                        {chain.capabilities.map((cap) => (
                                          <div key={cap.id} className="flex items-center gap-2 text-[11px]">
                                            <div className="w-1.5 h-1.5 rounded-full bg-din-vermogens shrink-0" />
                                            <span className="text-gray-600">{cap.title || cap.description || "?"}</span>
                                            {cap.currentLevel && cap.targetLevel && (
                                              <span className="text-[9px] text-gray-400">
                                                {cap.currentLevel}{"\u2192"}{cap.targetLevel}
                                              </span>
                                            )}
                                            {cap.relatedSectors && cap.relatedSectors.length > 1 && (
                                              <span className="text-[8px] bg-amber-100 text-amber-700 px-1 rounded">Synergie</span>
                                            )}
                                          </div>
                                        ))}
                                      </div>
                                    </div>
                                  )}

                                  {/* Inspanningen */}
                                  {chain.efforts.length > 0 && (
                                    <div className="pl-3 border-l-2 border-din-inspanningen/30">
                                      <span className="text-[9px] uppercase tracking-wider text-din-inspanningen font-semibold">Inspanningen</span>
                                      <div className="space-y-1 mt-0.5">
                                        {chain.efforts.map((effort) => (
                                          <div key={effort.id} className="flex items-center gap-2 text-[11px]">
                                            <div className="w-1.5 h-1.5 rounded-full shrink-0" style={{ backgroundColor: DOMAIN_BAR_COLORS[effort.domain] || "#6b7280" }} />
                                            <span className="text-gray-600">{effort.title || effort.description || "?"}</span>
                                            <span className="text-[9px] text-gray-400">{DOMAIN_LABELS[effort.domain]}</span>
                                            {effort.quarter && <span className="text-[9px] bg-gray-100 text-gray-500 px-1 rounded">{effort.quarter}</span>}
                                          </div>
                                        ))}
                                      </div>
                                    </div>
                                  )}

                                  {chain.capabilities.length === 0 && chain.efforts.length === 0 && (
                                    <div className="text-[10px] text-gray-300 italic pl-3">Nog geen vermogens of inspanningen gekoppeld</div>
                                  )}
                                </div>
                              </div>
                            </div>
                          );
                        })}
                      </div>

                      {/* Samenvatting: overlap in inspanningsdomeinen */}
                      {isMultiSector && uniqueEffortDomains.length > 0 && (
                        <div className="px-4 py-2 bg-green-50 border-t border-green-200">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="text-[9px] uppercase tracking-wider text-green-700 font-semibold">Gedeelde domeinen:</span>
                            {uniqueEffortDomains.map((d) => {
                              const count = allEffortsInCluster.filter((e) => e.domain === d).length;
                              return (
                                <span key={d} className="flex items-center gap-1 text-[10px] bg-white/60 px-1.5 py-0.5 rounded border border-green-200">
                                  <div className="w-1.5 h-1.5 rounded-full shrink-0" style={{ backgroundColor: DOMAIN_BAR_COLORS[d] || "#6b7280" }} />
                                  <span className="text-gray-700 font-medium">{DOMAIN_LABELS[d]}</span>
                                  <span className="text-gray-400">({count})</span>
                                </span>
                              );
                            })}
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          );
        })}

      {/* 5. BUDGET-PRIORITEIT: inspanningen met hoogste cross-sector impact */}
      {priorityEfforts.length > 0 && (
        <div className="border border-green-200 rounded-xl bg-white overflow-hidden shadow-sm">
          <div className="bg-green-50 px-5 py-3 border-b border-green-200 flex items-center gap-2">
            <svg className="w-4 h-4 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 6v12m-3-2.818l.879.659c1.171.879 3.07.879 4.242 0 1.172-.879 1.172-2.303 0-3.182C13.536 12.219 12.768 12 12 12c-.725 0-1.45-.22-2.003-.659-1.106-.879-1.106-2.303 0-3.182s2.9-.879 4.006 0l.415.33M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <h4 className="text-sm font-semibold text-green-800">Budget-prioriteit: inspanningen met cross-sector impact</h4>
            <span className="text-[10px] bg-green-100 text-green-700 px-1.5 py-0.5 rounded font-medium ml-auto">{priorityEfforts.length} inspanningen</span>
          </div>
          <div className="p-5">
            <p className="text-xs text-gray-500 mb-3">
              Deze inspanningen dragen bij aan baten die door meerdere sectoren worden herkend. Investeer hier voor maximale efficiëntie.
            </p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              {priorityEfforts.map((effort) => (
                <div key={effort.id} className="flex items-center gap-2 bg-green-50/50 border border-green-100 rounded-lg px-3 py-2">
                  <div className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: DOMAIN_BAR_COLORS[effort.domain] || "#6b7280" }} />
                  <div className="flex-1 min-w-0">
                    <div className="text-[11px] text-gray-700 font-medium truncate">{effort.title || effort.description || "?"}</div>
                    <div className="flex items-center gap-2 text-[9px] text-gray-400">
                      <span>{DOMAIN_LABELS[effort.domain]}</span>
                      {effort.quarter && <span>{effort.quarter}</span>}
                      <span className={`inline-block px-1 py-0 rounded text-[9px] font-medium border ${SECTOR_COLORS[effort.sectorId as SectorName] || ""}`}>{effort.sectorId}</span>
                      {effort.dossier?.kostenraming && (
                        <span className="bg-amber-50 text-amber-600 px-1 rounded font-medium">{effort.dossier.kostenraming}</span>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* 6. GEDEELDE VERMOGENS (synergieën) */}
      {sharedCaps.size > 0 && (
        <div className="border border-amber-200 rounded-xl bg-amber-50/30 overflow-hidden shadow-sm">
          <div className="bg-amber-50 px-5 py-3 border-b border-amber-200 flex items-center gap-2">
            <span className="text-[10px] bg-amber-100 text-amber-700 px-1.5 py-0.5 rounded font-medium">Synergie</span>
            <h4 className="text-sm font-semibold text-amber-800">Gedeelde vermogens ({sharedCaps.size})</h4>
          </div>
          <div className="p-5 space-y-2">
            {Array.from(sharedCaps.entries()).map(([capId, sectors]) => {
              const cap = session.capabilities.find((c) => c.id === capId);
              if (!cap) return null;
              return (
                <div key={capId} className="flex items-start gap-3 bg-white rounded-lg p-4 border border-amber-100 shadow-sm hover:shadow-md transition-shadow">
                  <div className="shrink-0 w-8 h-8 rounded-lg bg-amber-100 flex items-center justify-center">
                    <svg className="w-4 h-4 text-amber-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M7.5 21L3 16.5m0 0L7.5 12M3 16.5h13.5m0-13.5L21 7.5m0 0L16.5 12M21 7.5H7.5" />
                    </svg>
                  </div>
                  <div className="flex-1">
                    <div className="text-sm text-gray-800 font-medium">{cap.title || cap.description || "(naamloos)"}</div>
                    {(cap.currentLevel || cap.targetLevel) && (
                      <div className="flex items-center gap-4 mt-1.5">
                        {cap.currentLevel && (
                          <div className="flex items-center gap-1.5">
                            <span className="text-[9px] text-gray-400">Nu</span>
                            <LevelDots value={cap.currentLevel} color="amber" />
                          </div>
                        )}
                        {cap.targetLevel && (
                          <div className="flex items-center gap-1.5">
                            <span className="text-[9px] text-gray-400">Doel</span>
                            <LevelDots value={cap.targetLevel} color="green" />
                          </div>
                        )}
                      </div>
                    )}
                    <div className="flex items-center gap-1.5 mt-2">
                      <span className="text-[10px] text-gray-400">Gedeeld door:</span>
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
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* 7. KETEN-DEKKING */}
      <div className="border border-gray-200 rounded-xl bg-white overflow-hidden shadow-sm">
        <div className="bg-gray-50 px-5 py-3 border-b border-gray-200">
          <h4 className="text-sm font-semibold text-cito-blue">Keten-dekking</h4>
          <p className="text-[10px] text-gray-400 mt-0.5">Hoeveel items hebben een volledige DIN-keten?</p>
        </div>
        <div className="p-5">
          {(() => {
            const gaps = findGaps(
              session.goals,
              session.benefits,
              session.capabilities,
              session.efforts,
              session.goalBenefitMaps,
              session.benefitCapabilityMaps,
              session.capabilityEffortMaps
            );
            const totalBenefits = session.benefits.length;
            const totalCaps = session.capabilities.length;
            const linkedBenefits = totalBenefits - gaps.benefitsWithoutCapabilities.length;
            const linkedCaps = totalCaps - gaps.capabilitiesWithoutEfforts.length;
            return (
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div className="text-center">
                  <div className="text-lg font-bold text-gray-800">{session.goals.length - gaps.goalsWithoutBenefits.length}/{session.goals.length}</div>
                  <div className="text-[11px] text-gray-500">Doelen met baten</div>
                  <div className="mt-1 h-1.5 bg-gray-100 rounded-full overflow-hidden">
                    <div className="h-full bg-din-baten rounded-full" style={{ width: `${session.goals.length > 0 ? ((session.goals.length - gaps.goalsWithoutBenefits.length) / session.goals.length) * 100 : 0}%` }} />
                  </div>
                </div>
                <div className="text-center">
                  <div className="text-lg font-bold text-gray-800">{linkedBenefits}/{totalBenefits}</div>
                  <div className="text-[11px] text-gray-500">Baten met vermogens</div>
                  <div className="mt-1 h-1.5 bg-gray-100 rounded-full overflow-hidden">
                    <div className="h-full bg-din-vermogens rounded-full" style={{ width: `${totalBenefits > 0 ? (linkedBenefits / totalBenefits) * 100 : 0}%` }} />
                  </div>
                </div>
                <div className="text-center">
                  <div className="text-lg font-bold text-gray-800">{linkedCaps}/{totalCaps}</div>
                  <div className="text-[11px] text-gray-500">Vermogens met inspanningen</div>
                  <div className="mt-1 h-1.5 bg-gray-100 rounded-full overflow-hidden">
                    <div className="h-full bg-din-inspanningen rounded-full" style={{ width: `${totalCaps > 0 ? (linkedCaps / totalCaps) * 100 : 0}%` }} />
                  </div>
                </div>
              </div>
            );
          })()}
        </div>
      </div>

      {/* 8. DOMEINBALANS */}
      <div className="border border-gray-200 rounded-xl bg-white overflow-hidden shadow-sm">
        <div className="bg-gray-50 px-5 py-3 border-b border-gray-200">
          <h4 className="text-sm font-semibold text-cito-blue">Domeinbalans alle sectoren</h4>
        </div>
        <div className="p-5">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
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
                  {allEfforts.length === 0 && <div className="text-[10px] text-red-400 mt-1 font-medium">Ontbreekt</div>}
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}
