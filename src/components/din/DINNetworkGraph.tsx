"use client";

import { useState } from "react";
import type { DINSession, DINEffort, DINCapability, EffortDomain, SectorName } from "@/lib/types";
import { SECTORS, SECTOR_COLORS, DOMAIN_LABELS, STATUS_LABELS, STATUS_STYLES } from "@/lib/types";
import { buildChainsForSector } from "@/lib/din-service";
import type { DINChain } from "@/lib/din-service";

const DOMAIN_COLORS: Record<EffortDomain, { border: string; bg: string; text: string; dot: string }> = {
  mens: { border: "border-l-blue-500", bg: "bg-blue-50", text: "text-blue-700", dot: "bg-blue-500" },
  processen: { border: "border-l-green-500", bg: "bg-green-50", text: "text-green-700", dot: "bg-green-500" },
  data_systemen: { border: "border-l-purple-500", bg: "bg-purple-50", text: "text-purple-700", dot: "bg-purple-500" },
  cultuur: { border: "border-l-amber-500", bg: "bg-amber-50", text: "text-amber-700", dot: "bg-amber-500" },
};


const DOMAIN_BAR_COLORS: Record<EffortDomain, string> = {
  mens: "#3b82f6",
  processen: "#10b981",
  data_systemen: "#8b5cf6",
  cultuur: "#f59e0b",
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
    <div
      className="flex items-center gap-1"
      title={`Baten: ${hasBenefits ? "\u2713" : "\u2717"} | Vermogens: ${hasCaps ? "\u2713" : "\u2717"} | Inspanningen: ${hasEfforts ? "\u2713" : "\u2717"}`}
      aria-label={`Keten: ${hasBenefits ? "baten aanwezig" : "baten ontbreken"}, ${hasCaps ? "vermogens aanwezig" : "vermogens ontbreken"}, ${hasEfforts ? "inspanningen aanwezig" : "inspanningen ontbreken"}`}
    >
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

// Inline chain connector (small arrow between cards)
function ChainArrow() {
  return (
    <div className="flex items-center justify-center shrink-0 w-6">
      <svg className="w-4 h-4 text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
      </svg>
    </div>
  );
}

// --- Chain Row: Baat → Vermogen(s) → Inspanning(en) — UX-16: responsive, UX-19: tooltips ---
function ChainRow({
  chain,
  chainKey,
  highlightedChain,
  onHover,
}: {
  chain: DINChain;
  chainKey: string;
  highlightedChain: string | null;
  onHover: (key: string | null) => void;
}) {
  const isHighlighted = highlightedChain === null || highlightedChain === chainKey;
  const isDimmed = highlightedChain !== null && highlightedChain !== chainKey;

  // UX-19: Tooltip content builders
  const benefitTooltip = [
    chain.benefit.profiel.indicator && `Indicator: ${chain.benefit.profiel.indicator}`,
    chain.benefit.profiel.currentValue && chain.benefit.profiel.targetValue && `${chain.benefit.profiel.currentValue} → ${chain.benefit.profiel.targetValue}`,
    chain.benefit.profiel.bateneigenaar && `Eigenaar: ${chain.benefit.profiel.bateneigenaar}`,
    chain.benefit.profiel.measurementMoment && `Meetmoment: ${chain.benefit.profiel.measurementMoment}`,
  ].filter(Boolean).join(" | ");

  return (
    <div
      className={`flex flex-col md:flex-row items-stretch gap-1 md:gap-0 transition-opacity duration-200 ${isDimmed ? "opacity-40" : "opacity-100"}`}
      onMouseEnter={() => onHover(chainKey)}
      onMouseLeave={() => onHover(null)}
    >
      {/* Baat — UX-19: tooltip */}
      <div className="flex-1 min-w-0">
        <div
          className={`h-full bg-white border rounded-lg px-3 py-2 transition-all ${isHighlighted && highlightedChain !== null ? "border-din-baten shadow-sm ring-1 ring-din-baten/20" : "border-din-baten/20"}`}
          title={benefitTooltip || undefined}
        >
          <div className="flex items-center gap-1.5 mb-1">
            <div className="w-2 h-2 rounded-full bg-din-baten shrink-0" />
            <span className="text-[9px] uppercase tracking-wider text-din-baten font-semibold">Baat</span>
          </div>
          <div className="text-[11px] text-gray-800 font-medium leading-snug">
            {chain.benefit.title || chain.benefit.description || "(naamloos)"}
          </div>
          {chain.benefit.profiel.indicator && (
            <div className="mt-1 flex items-center gap-1.5 text-[9px]">
              <span className="text-gray-400">{chain.benefit.profiel.indicator}:</span>
              <span className="text-amber-600 font-semibold">{chain.benefit.profiel.currentValue}</span>
              <span className="text-gray-300">{"\u2192"}</span>
              <span className="text-green-600 font-semibold">{chain.benefit.profiel.targetValue}</span>
            </div>
          )}
          {chain.benefit.profiel.bateneigenaar && (
            <div className="mt-0.5 text-[9px] text-gray-400">Eigenaar: {chain.benefit.profiel.bateneigenaar}</div>
          )}
        </div>
      </div>

      <div className="hidden md:block"><ChainArrow /></div>

      {/* Vermogen(s) — UX-19: tooltip */}
      <div className="flex-1 min-w-0">
        {chain.links.length > 0 ? (
          <div className="space-y-1.5 h-full">
            {chain.links.map((link) => {
              const capGap = (link.capability.currentLevel && link.capability.targetLevel)
                ? `Niveau: ${link.capability.currentLevel} → ${link.capability.targetLevel} (gap: +${link.capability.targetLevel - link.capability.currentLevel})`
                : undefined;
              const capSectors = link.capability.relatedSectors?.join(", ");
              const capTooltip = [capGap, capSectors && `Sectoren: ${capSectors}`].filter(Boolean).join(" | ");
              return (
                <div
                  key={link.capability.id}
                  className={`bg-white border rounded-lg px-3 py-2 transition-all ${
                    isHighlighted && highlightedChain !== null ? "border-din-vermogens shadow-sm ring-1 ring-din-vermogens/20" : "border-din-vermogens/20"
                  } ${link.capability.relatedSectors && link.capability.relatedSectors.length > 1 ? "border-amber-200" : ""}`}
                  title={capTooltip || undefined}
                >
                  <div className="flex items-center gap-1.5 mb-1">
                    <div className="w-2 h-2 rounded-full bg-din-vermogens shrink-0" />
                    <span className="text-[9px] uppercase tracking-wider text-din-vermogens font-semibold">Vermogen</span>
                    {link.capability.relatedSectors && link.capability.relatedSectors.length > 1 && (
                      <span className="text-[8px] bg-amber-100 text-amber-700 px-1 rounded font-medium ml-auto">Synergie</span>
                    )}
                  </div>
                  <div className="text-[11px] text-gray-800 font-medium leading-snug">
                    {link.capability.title || link.capability.description || "(naamloos)"}
                  </div>
                  {(link.capability.currentLevel || link.capability.targetLevel) && (
                    <div className="flex items-center gap-2 mt-1">
                      <LevelDots value={link.capability.currentLevel || 0} color="amber" />
                      <span className="text-[9px] text-gray-300">{"\u2192"}</span>
                      <LevelDots value={link.capability.targetLevel || 0} color="green" />
                      {link.capability.currentLevel && link.capability.targetLevel && link.capability.targetLevel > link.capability.currentLevel && (
                        <span className={`text-[9px] px-1 rounded font-medium ${
                          link.capability.targetLevel - link.capability.currentLevel >= 3 ? "bg-red-100 text-red-700" :
                          link.capability.targetLevel - link.capability.currentLevel >= 2 ? "bg-amber-100 text-amber-700" :
                          "bg-green-100 text-green-700"
                        }`}>+{link.capability.targetLevel - link.capability.currentLevel}</span>
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        ) : (
          <div className="h-full flex items-center justify-center bg-gray-50/50 border border-dashed border-gray-200 rounded-lg px-3 py-2">
            <span className="text-[10px] text-gray-300 italic">Geen vermogen gekoppeld</span>
          </div>
        )}
      </div>

      <div className="hidden md:block"><ChainArrow /></div>

      {/* Inspanning(en) */}
      <div className="flex-1 min-w-0">
        {chain.links.length > 0 && chain.links.some((l) => l.efforts.length > 0) ? (
          <div className="space-y-1 h-full">
            {chain.links.map((link) =>
              link.efforts.map((effort) => (
                <EffortChip key={effort.id} effort={effort} highlighted={isHighlighted && highlightedChain !== null} />
              ))
            )}
          </div>
        ) : (
          <div className="h-full flex items-center justify-center bg-gray-50/50 border border-dashed border-gray-200 rounded-lg px-3 py-2">
            <span className="text-[10px] text-gray-300 italic">Geen inspanning gekoppeld</span>
          </div>
        )}
      </div>
    </div>
  );
}

// Effort chip with domain color — UX-19: tooltip
function EffortChip({ effort, highlighted }: { effort: DINEffort; highlighted: boolean }) {
  const dc = DOMAIN_COLORS[effort.domain] || DOMAIN_COLORS.mens;
  const statusLabel = STATUS_LABELS[effort.status] || STATUS_LABELS.gepland;
  const statusStyle = STATUS_STYLES[effort.status] || STATUS_STYLES.gepland;
  const effortTooltip = [
    `Domein: ${DOMAIN_LABELS[effort.domain]}`,
    effort.quarter && `Planning: ${effort.quarter}`,
    `Status: ${statusLabel}`,
    effort.responsibleSector && `Sector: ${effort.responsibleSector}`,
  ].filter(Boolean).join(" | ");
  return (
    <div
      className={`border-l-2 ${dc.border} bg-white border border-gray-100 rounded-r-lg px-2.5 py-1.5 transition-all ${highlighted ? "shadow-sm ring-1 ring-din-inspanningen/20" : ""}`}
      title={effortTooltip}
    >
      <div className="flex items-center gap-1.5 mb-0.5">
        <div className={`w-1.5 h-1.5 rounded-full ${dc.dot} shrink-0`} />
        <span className={`text-[8px] font-medium ${dc.text}`}>{DOMAIN_LABELS[effort.domain]}</span>
      </div>
      <div className="text-[10px] text-gray-700 leading-snug font-medium">{effort.title || effort.description || "(naamloos)"}</div>
      <div className="flex items-center gap-1.5 mt-0.5">
        {effort.quarter && <span className="text-[8px] text-gray-400">{effort.quarter}</span>}
        {effort.status && effort.status !== "gepland" && (
          <span className={`text-[8px] px-1 rounded ${statusStyle}`}>{statusLabel}</span>
        )}
      </div>
    </div>
  );
}

// Unlinked items warning
function UnlinkedSection({ caps, efforts }: { caps: DINCapability[]; efforts: DINEffort[] }) {
  if (caps.length === 0 && efforts.length === 0) return null;
  return (
    <div className="mt-2 p-2.5 bg-amber-50/50 border border-amber-200/50 rounded-lg">
      <div className="flex items-center gap-1.5 mb-1.5">
        <svg className="w-3.5 h-3.5 text-amber-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4.5c-.77-.833-2.694-.833-3.464 0L3.34 16.5c-.77.833.192 2.5 1.732 2.5z" />
        </svg>
        <span className="text-[10px] font-semibold text-amber-700">Ongekoppeld</span>
      </div>
      <div className="space-y-1">
        {caps.map((c) => (
          <div key={c.id} className="text-[10px] text-amber-600 flex items-center gap-1.5">
            <div className="w-1.5 h-1.5 rounded-full bg-din-vermogens shrink-0" />
            <span>Vermogen: {c.title || c.description || "(naamloos)"}</span>
          </div>
        ))}
        {efforts.map((e) => (
          <div key={e.id} className="text-[10px] text-amber-600 flex items-center gap-1.5">
            <div className={`w-1.5 h-1.5 rounded-full ${DOMAIN_COLORS[e.domain]?.dot || "bg-gray-400"} shrink-0`} />
            <span>Inspanning: {e.title || e.description || "(naamloos)"}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

// 5-dot level display
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

// UX-15: Search matching helper
function matchesSearchText(text: string, query: string): boolean {
  if (!query) return true;
  return text.toLowerCase().includes(query.toLowerCase());
}

function chainMatchesSearch(chain: DINChain, query: string): boolean {
  if (!query) return true;
  const benefitText = chain.benefit.title || chain.benefit.description || "";
  if (matchesSearchText(benefitText, query)) return true;
  if (matchesSearchText(chain.benefit.profiel.indicator || "", query)) return true;
  for (const link of chain.links) {
    if (matchesSearchText(link.capability.title || link.capability.description || "", query)) return true;
    for (const e of link.efforts) {
      if (matchesSearchText(e.title || e.description || "", query)) return true;
    }
  }
  return false;
}

interface DINNetworkGraphProps {
  session: DINSession;
  searchQuery?: string;
}

export default function DINNetworkGraph({ session, searchQuery = "" }: DINNetworkGraphProps) {
  const [collapsedGoals, setCollapsedGoals] = useState<Set<string>>(new Set());
  const [highlightedChain, setHighlightedChain] = useState<string | null>(null);

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

  // UX-5: Compact domain balance counts for header
  const domainCounts = (["mens", "processen", "data_systemen", "cultuur"] as EffortDomain[]).map((d) => ({
    domain: d,
    count: session.efforts.filter((e) => e.domain === d).length,
  }));

  return (
    <div className="space-y-8">
      {/* Stats header met flow-pijlen + domeinbalans — UX-16: responsive */}
      <div className="bg-white rounded-xl border border-gray-200 p-4 shadow-sm">
        <div className="flex items-center justify-between flex-wrap gap-3">
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
        {/* Compact domeinbalans inline */}
        <div className="mt-3 pt-3 border-t border-gray-100 flex items-center gap-4">
          <span className="text-[10px] text-gray-400 font-medium uppercase tracking-wider">Domeinen:</span>
          {domainCounts.map(({ domain, count }) => (
            <div key={domain} className="flex items-center gap-1.5">
              <div className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: DOMAIN_BAR_COLORS[domain] }} />
              <span className="text-[11px] text-gray-600">{DOMAIN_LABELS[domain]}</span>
              <span className={`text-[11px] font-bold ${count === 0 ? "text-red-400" : "text-gray-800"}`}>{count}</span>
            </div>
          ))}
          {synergieCount > 0 && (
            <div className="flex items-center gap-1.5 ml-auto">
              <span className="text-[9px] bg-amber-100 text-amber-700 px-1 rounded font-medium">Synergie</span>
              <span className="text-[10px] text-gray-400">{synergieCount} gedeeld</span>
            </div>
          )}
        </div>
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

      {/* Kolom-headers — UX-16: hidden on mobile (chains stack vertically) */}
      <div className="hidden md:flex items-center gap-0 px-5">
        <div className="flex-1 flex items-center gap-1.5">
          <div className="w-2.5 h-2.5 rounded-full bg-din-baten" />
          <span className="text-[10px] uppercase tracking-wider text-din-baten font-bold">Baten</span>
        </div>
        <div className="w-6" />
        <div className="flex-1 flex items-center gap-1.5">
          <div className="w-2.5 h-2.5 rounded-full bg-din-vermogens" />
          <span className="text-[10px] uppercase tracking-wider text-din-vermogens font-bold">Vermogens</span>
        </div>
        <div className="w-6" />
        <div className="flex-1 flex items-center gap-1.5">
          <div className="w-2.5 h-2.5 rounded-full bg-din-inspanningen" />
          <span className="text-[10px] uppercase tracking-wider text-din-inspanningen font-bold">Inspanningen</span>
        </div>
      </div>

      {/* Alles in-/uitklappen — UX-18: focus-visible */}
      <div className="flex items-center justify-end">
        <button
          onClick={() => {
            if (collapsedGoals.size === 0) {
              setCollapsedGoals(new Set(session.goals.map((g) => g.id)));
            } else {
              setCollapsedGoals(new Set());
            }
          }}
          className="text-xs text-gray-400 hover:text-gray-600 flex items-center gap-1 transition-colors focus-visible:ring-2 focus-visible:ring-cito-blue/40 focus-visible:outline-none rounded px-2 py-1"
        >
          <ChevronIcon expanded={collapsedGoals.size === 0} className="w-3 h-3" />
          {collapsedGoals.size === 0 ? "Alles inklappen" : "Alles uitklappen"}
        </button>
      </div>

      {/* DIN-keten per doel — chain-based — UX-20: betere visuele scheiding */}
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

          // UX-15: Dim goal if search active and no chains match
          const goalHasSearchMatch = !searchQuery || goalBenefits.some((b) =>
            matchesSearchText(b.title || b.description || "", searchQuery)
          ) || goalCapabilities.some((c) =>
            matchesSearchText(c.title || c.description || "", searchQuery)
          ) || goalEfforts.some((e) =>
            matchesSearchText(e.title || e.description || "", searchQuery)
          );

          return (
            <div key={goal.id} className={`relative transition-opacity duration-200 ${searchQuery && !goalHasSearchMatch ? "opacity-30" : "opacity-100"}`}>
              {/* UX-20: Doel met visueel accent — afwisselende achtergrond */}
              <div className={`bg-white border-2 border-din-doelen rounded-xl overflow-hidden shadow-sm ${goalIdx % 2 === 1 ? "bg-gray-50/30" : ""}`}>
                {/* Doel header — klikbaar — UX-18: accessibility */}
                <div
                  className="bg-gradient-to-r from-din-doelen/15 to-din-doelen/5 px-5 py-3 flex items-center gap-3 cursor-pointer hover:from-din-doelen/20 hover:to-din-doelen/10 transition-all select-none"
                  onClick={() => toggleGoal(goal.id)}
                  role="button"
                  aria-expanded={!isCollapsed}
                  tabIndex={0}
                  onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); toggleGoal(goal.id); } }}
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
                      <div className="p-5 space-y-4">
                        {sectorsForGoal.map((sector) => {
                          const chainResult = buildChainsForSector(session, goal.id, sector);
                          const sectorBenefitCount = goalBenefits.filter((b) => b.sectorId === sector).length;
                          const sectorCapCount = goalCapabilities.filter((c) => c.sectorId === sector).length;
                          const sectorEffortCount = goalEfforts.filter((e) => e.sectorId === sector).length;

                          if (sectorBenefitCount === 0 && sectorCapCount === 0 && sectorEffortCount === 0) return null;

                          return (
                            <div key={sector} className={`rounded-lg border ${SECTOR_BORDER_COLORS[sector]} ${SECTOR_BG_COLORS[sector]} p-3`}>
                              {/* Sector label + chain indicator */}
                              <div className="flex items-center gap-2 mb-3">
                                <span className={`inline-block px-2 py-0.5 rounded text-[10px] font-semibold ${SECTOR_LABEL_STYLES[sector]}`}>
                                  {sector}
                                </span>
                                <ChainIndicator
                                  hasBenefits={sectorBenefitCount > 0}
                                  hasCaps={sectorCapCount > 0}
                                  hasEfforts={sectorEffortCount > 0}
                                />
                                <span className="text-[9px] text-gray-400 ml-auto">
                                  {chainResult.chains.length} keten{chainResult.chains.length !== 1 ? "s" : ""}
                                </span>
                              </div>

                              {/* Chains — UX-15: search-aware dimming */}
                              {chainResult.chains.length > 0 ? (
                                <div className="space-y-2.5">
                                  {chainResult.chains.map((chain, idx) => {
                                    const isSearchMatch = !searchQuery || chainMatchesSearch(chain, searchQuery);
                                    return (
                                      <div key={chain.benefit.id} className={`transition-opacity duration-200 ${searchQuery && !isSearchMatch ? "opacity-25" : "opacity-100"}`}>
                                        <ChainRow
                                          chain={chain}
                                          chainKey={`${sector}-${idx}`}
                                          highlightedChain={highlightedChain}
                                          onHover={setHighlightedChain}
                                        />
                                      </div>
                                    );
                                  })}
                                </div>
                              ) : (
                                <p className="text-[10px] text-gray-300 italic text-center py-2">Geen ketens gevonden</p>
                              )}

                              {/* Ongekoppelde items */}
                              <UnlinkedSection caps={chainResult.unlinkedCaps} efforts={chainResult.unlinkedEfforts} />
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

              {/* UX-20: Betere connector met scheidingslijn */}
              {goalIdx < session.goals.length - 1 && (
                <div className="flex items-center justify-center gap-3 py-1">
                  <div className="flex-1 h-px bg-gray-100" />
                  <div className="w-0.5 h-6 bg-gradient-to-b from-din-doelen/30 to-din-doelen/10 rounded-full" />
                  <div className="flex-1 h-px bg-gray-100" />
                </div>
              )}
            </div>
          );
        })}

      {/* Domeinbalans detail */}
      <div className="bg-white rounded-xl border border-gray-200 p-5 shadow-sm">
        <h4 className="text-sm font-semibold text-cito-blue mb-4">Domeinbalans inspanningen</h4>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {(["mens", "processen", "data_systemen", "cultuur"] as EffortDomain[]).map((domain) => {
            const count = session.efforts.filter((e) => e.domain === domain).length;
            const maxCount = Math.max(
              ...["mens", "processen", "data_systemen", "cultuur"].map((d) => session.efforts.filter((e) => e.domain === d).length),
              1
            );
            const pct = Math.round((count / maxCount) * 100);

            return (
              <div key={domain} className="text-center">
                <div className="text-xs font-medium mb-2" style={{ color: DOMAIN_BAR_COLORS[domain] }}>{DOMAIN_LABELS[domain]}</div>
                <div className="text-2xl font-bold text-gray-800">{count}</div>
                <div className="mt-2 h-2 bg-gray-100 rounded-full overflow-hidden">
                  <div
                    className="h-full rounded-full transition-all"
                    style={{ width: `${pct}%`, backgroundColor: DOMAIN_BAR_COLORS[domain] }}
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
          <div className="border-l border-gray-300 pl-4 flex items-center gap-1.5">
            {(["mens", "processen", "data_systemen", "cultuur"] as EffortDomain[]).map((d) => (
              <div key={d} className="flex items-center gap-1">
                <div className="w-2 h-2 rounded-full" style={{ backgroundColor: DOMAIN_BAR_COLORS[d] }} />
                <span className="text-gray-400 text-[9px]">{DOMAIN_LABELS[d]}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
