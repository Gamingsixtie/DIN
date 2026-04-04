"use client";

import { useState } from "react";
import { SectorBadge } from "./shared";
import { findGaps, getDomainBalance } from "@/lib/din-service";
import { SECTORS, DOMAIN_LABELS } from "@/lib/types";
import type {
  DINSession,
  Stap5Result,
  EffortDomain,
  SectorName,
} from "@/lib/types";

interface StapSectorVertalingProps {
  session: DINSession;
  result?: Stap5Result;
}

const DOMAIN_COLORS: Record<EffortDomain, { bg: string; text: string; bar: string }> = {
  mens: { bg: "bg-blue-50", text: "text-blue-700", bar: "#2563eb" },
  processen: { bg: "bg-green-50", text: "text-green-700", bar: "#059669" },
  data_systemen: { bg: "bg-purple-50", text: "text-purple-700", bar: "#7c3aed" },
  cultuur: { bg: "bg-amber-50", text: "text-amber-700", bar: "#d97706" },
};

const CHAIN_COLORS = {
  baten: "border-l-[#0066cc]",
  vermogens: "border-l-[#0891b2]",
  inspanningen: "border-l-[#059669]",
};

type TabId = "overzicht" | SectorName;

export default function StapSectorVertaling({
  session,
  result,
}: StapSectorVertalingProps) {
  const [activeTab, setActiveTab] = useState<TabId>("overzicht");

  const tabs: { id: TabId; label: string }[] = [
    { id: "overzicht", label: "Overzicht" },
    ...SECTORS.map((s) => ({ id: s as TabId, label: s })),
  ];

  // --- Helper: compute sector stats from session data ---

  function getSectorStats(sectorId: string) {
    const sectorBenefits = session.benefits.filter((b) => b.sectorId === sectorId);
    const sectorCaps = session.capabilities.filter(
      (c) => c.sectorId === sectorId && !c.consolidated
    );
    const sectorEfforts = session.efforts.filter(
      (e) => e.sectorId === sectorId && !e.consolidated
    );

    // Count shared items: capabilities/efforts with relatedSectors > 1 or consolidated items belonging to this sector
    const sharedCaps = session.capabilities.filter(
      (c) =>
        !c.consolidated &&
        c.relatedSectors &&
        c.relatedSectors.length > 1 &&
        c.relatedSectors.includes(sectorId)
    );
    const sharedEfforts = session.efforts.filter(
      (e) =>
        !e.consolidated &&
        e.responsibleSector &&
        e.responsibleSector.includes(",") &&
        (e.sectorId === sectorId || e.responsibleSector.includes(sectorId))
    );
    const waarvanGedeeld = sharedCaps.length + sharedEfforts.length;

    // Filter maps for this sector's entities
    const sectorBenefitIds = new Set(sectorBenefits.map((b) => b.id));
    const sectorCapIds = new Set(sectorCaps.map((c) => c.id));

    const relevantGBMaps = session.goalBenefitMaps.filter((m) => sectorBenefitIds.has(m.benefitId));
    const relevantBCMaps = session.benefitCapabilityMaps.filter((m) => sectorBenefitIds.has(m.benefitId) || sectorCapIds.has(m.capabilityId));
    const relevantCEMaps = session.capabilityEffortMaps.filter((m) => sectorCapIds.has(m.capabilityId));

    const gaps = findGaps(
      session.goals,
      sectorBenefits,
      sectorCaps,
      sectorEfforts,
      relevantGBMaps,
      relevantBCMaps,
      relevantCEMaps
    );

    const totalGaps =
      gaps.goalsWithoutBenefits.length +
      gaps.benefitsWithoutCapabilities.length +
      gaps.capabilitiesWithoutEfforts.length;

    return {
      baten: sectorBenefits.length,
      vermogens: sectorCaps.length,
      inspanningen: sectorEfforts.length,
      waarvanGedeeld,
      gaps: totalGaps,
      gapDetails: gaps,
      sectorBenefits,
      sectorCaps,
      sectorEfforts,
    };
  }

  // --- Overzicht tab ---

  function renderOverzicht() {
    return (
      <div className="space-y-4">
        {/* Summary table */}
        <div className="w-full text-sm border border-gray-200 rounded-lg overflow-hidden">
          <table className="w-full">
            <thead>
              <tr className="bg-gray-50">
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">Sector</th>
                <th className="px-4 py-3 text-center text-xs font-semibold text-gray-600 uppercase tracking-wider">Baten</th>
                <th className="px-4 py-3 text-center text-xs font-semibold text-gray-600 uppercase tracking-wider">Vermogens</th>
                <th className="px-4 py-3 text-center text-xs font-semibold text-gray-600 uppercase tracking-wider">Inspanningen</th>
                <th className="px-4 py-3 text-center text-xs font-semibold text-gray-600 uppercase tracking-wider">Waarvan gedeeld</th>
                <th className="px-4 py-3 text-center text-xs font-semibold text-gray-600 uppercase tracking-wider">Gaps</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {SECTORS.map((sector) => {
                // Use AI result if available, otherwise compute from session
                const aiSector = result?.sectorVertalingen?.find((sv) => sv.sector === sector);
                const sessionStats = getSectorStats(sector);

                const baten = aiSector?.dinKeten.aantalBaten ?? sessionStats.baten;
                const vermogens = aiSector?.dinKeten.aantalVermogens ?? sessionStats.vermogens;
                const inspanningen = aiSector?.dinKeten.aantalInspanningen ?? sessionStats.inspanningen;
                const gedeeld = aiSector?.dinKeten.waarvanGedeeld ?? sessionStats.waarvanGedeeld;
                const gapCount = aiSector?.gaps?.length ?? sessionStats.gaps;

                return (
                  <tr key={sector} className="hover:bg-gray-50/50">
                    <td className="px-4 py-3">
                      <SectorBadge sector={sector} />
                    </td>
                    <td className="px-4 py-3 text-center text-sm text-gray-700">{baten}</td>
                    <td className="px-4 py-3 text-center text-sm text-gray-700">{vermogens}</td>
                    <td className="px-4 py-3 text-center text-sm text-gray-700">{inspanningen}</td>
                    <td className="px-4 py-3 text-center">
                      <span className="text-cito-accent font-medium">{gedeeld}</span>
                    </td>
                    <td className="px-4 py-3 text-center">
                      {gapCount > 0 ? (
                        <span className="text-red-600 font-semibold">{gapCount}</span>
                      ) : (
                        <span className="text-green-600 inline-flex items-center gap-1">
                          <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                          </svg>
                          0
                        </span>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        {/* AI samenvatting */}
        {result?.totaalSamenvatting && (
          <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
            <p className="text-xs text-gray-500 font-medium mb-1">Samenvatting</p>
            <p className="text-sm text-gray-700">{result.totaalSamenvatting}</p>
          </div>
        )}
      </div>
    );
  }

  // --- Sector tab ---

  function renderSectorTab(sectorId: SectorName) {
    const stats = getSectorStats(sectorId);
    const aiSector = result?.sectorVertalingen?.find((sv) => sv.sector === sectorId);

    // Sector efforts for domain balance
    const domainBalance = getDomainBalance(stats.sectorEfforts);
    const totalEfforts = Object.values(domainBalance).reduce((a, b) => a + b, 0);

    return (
      <div className="space-y-6">
        {/* Sector samenvatting (if AI result) */}
        {aiSector?.samenvatting && (
          <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
            <p className="text-sm text-gray-700">{aiSector.samenvatting}</p>
          </div>
        )}

        {/* DIN-keten */}
        <div className="space-y-4">
          <h5 className="text-sm font-semibold text-gray-700">DIN-keten</h5>

          {/* Baten */}
          <div>
            <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">Baten</p>
            <div className="space-y-1.5">
              {stats.sectorBenefits.length === 0 ? (
                <p className="text-xs text-gray-400 italic pl-4">Geen baten voor deze sector</p>
              ) : (
                stats.sectorBenefits.map((benefit) => {
                  const linkedGoal = session.goals.find((g) => g.id === benefit.goalId);
                  return (
                    <div
                      key={benefit.id}
                      className={`${CHAIN_COLORS.baten} border-l-4 pl-3 py-1.5`}
                    >
                      <span className="text-xs text-gray-700">{benefit.title || benefit.description}</span>
                      {linkedGoal && (
                        <span className="text-[10px] text-gray-400 ml-2">
                          ({linkedGoal.name || linkedGoal.description})
                        </span>
                      )}
                    </div>
                  );
                })
              )}
            </div>
          </div>

          {/* Vermogens */}
          <div>
            <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">Vermogens</p>
            <div className="space-y-1.5">
              {stats.sectorCaps.length === 0 ? (
                <p className="text-xs text-gray-400 italic pl-4">Geen vermogens voor deze sector</p>
              ) : (
                stats.sectorCaps.map((cap) => (
                  <div
                    key={cap.id}
                    className={`${CHAIN_COLORS.vermogens} border-l-4 pl-3 py-1.5 flex items-center gap-2`}
                  >
                    <span className="text-xs text-gray-700">{cap.title || cap.description}</span>
                    {/* D-16: shared items get sector badges */}
                    {cap.relatedSectors && cap.relatedSectors.length > 1 && (
                      <div className="flex gap-0.5">
                        {cap.relatedSectors.map((s) => (
                          <SectorBadge key={s} sector={s} />
                        ))}
                      </div>
                    )}
                  </div>
                ))
              )}
            </div>
          </div>

          {/* Inspanningen (grouped by domain) */}
          <div>
            <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">Inspanningen</p>
            {stats.sectorEfforts.length === 0 ? (
              <p className="text-xs text-gray-400 italic pl-4">Geen inspanningen voor deze sector</p>
            ) : (
              <div className="space-y-3">
                {(Object.keys(DOMAIN_LABELS) as EffortDomain[]).map((domain) => {
                  const domainEfforts = stats.sectorEfforts.filter((e) => e.domain === domain);
                  if (domainEfforts.length === 0) return null;
                  return (
                    <div key={domain}>
                      <p className={`text-[10px] font-semibold ${DOMAIN_COLORS[domain].text} mb-1`}>
                        {DOMAIN_LABELS[domain]}
                      </p>
                      <div className="space-y-1">
                        {domainEfforts.map((effort) => (
                          <div
                            key={effort.id}
                            className={`${CHAIN_COLORS.inspanningen} border-l-4 pl-3 py-1.5 flex items-center gap-2`}
                          >
                            <span className="text-xs text-gray-700">{effort.title || effort.description}</span>
                            {/* D-16: shared inspanningen get sector badges */}
                            {effort.responsibleSector && effort.responsibleSector.includes(",") && (
                              <div className="flex gap-0.5">
                                {effort.responsibleSector.split(", ").map((s) => (
                                  <SectorBadge key={s} sector={s} />
                                ))}
                              </div>
                            )}
                          </div>
                        ))}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>

        {/* Domeinbalans */}
        <div>
          <h5 className="text-sm font-semibold text-gray-700 mb-3">Domeinbalans</h5>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
            {(Object.keys(DOMAIN_LABELS) as EffortDomain[]).map((domain) => {
              const count = domainBalance[domain];
              const pct = totalEfforts > 0 ? Math.round((count / totalEfforts) * 100) : 0;
              const colors = DOMAIN_COLORS[domain];
              const aiDomein = aiSector?.domeinBalans?.find((d) => d.domein === domain);

              return (
                <div key={domain} className={`${colors.bg} rounded-lg p-3`}>
                  <div className="flex items-baseline gap-1">
                    <span className={`text-lg font-bold ${colors.text}`}>{count}</span>
                    <span className="text-xs text-gray-400">({pct}%)</span>
                  </div>
                  <div className="text-xs font-medium text-gray-600 mt-0.5">{DOMAIN_LABELS[domain]}</div>
                  {/* AI beoordeling badge */}
                  {aiDomein?.beoordeling && (
                    <div className="mt-1">
                      <span className={`text-[10px] px-1.5 py-0.5 rounded font-medium ${
                        aiDomein.beoordeling === "evenwichtig"
                          ? "bg-green-100 text-green-700"
                          : aiDomein.beoordeling === "oververtegenwoordigd"
                            ? "bg-amber-100 text-amber-700"
                            : "bg-red-100 text-red-700"
                      }`}>
                        {aiDomein.beoordeling}
                      </span>
                    </div>
                  )}
                  {/* Bar */}
                  <div className="mt-2 h-1.5 bg-white/50 rounded-full overflow-hidden">
                    <div
                      className="h-full rounded-full transition-all"
                      style={{ width: `${pct}%`, backgroundColor: colors.bar }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Gaps */}
        <div>
          <h5 className="text-sm font-semibold text-gray-700 mb-3">Gaps</h5>
          {renderGapCards(stats, sectorId, aiSector?.gaps)}
        </div>
      </div>
    );
  }

  // --- Gap cards ---

  function renderGapCards(
    stats: ReturnType<typeof getSectorStats>,
    sectorId: string,
    aiGaps?: string[]
  ) {
    const { gapDetails } = stats;
    const hasAnyGaps =
      gapDetails.goalsWithoutBenefits.length > 0 ||
      gapDetails.benefitsWithoutCapabilities.length > 0 ||
      gapDetails.capabilitiesWithoutEfforts.length > 0;

    if (!hasAnyGaps && (!aiGaps || aiGaps.length === 0)) {
      return (
        <div className="border border-green-200 bg-green-50 rounded-lg p-3 flex items-center gap-2">
          <svg className="w-4 h-4 text-green-600 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
          </svg>
          <span className="text-sm text-green-700 font-medium">Geen gaps gevonden - DIN-keten is compleet</span>
        </div>
      );
    }

    return (
      <div className="space-y-2">
        {gapDetails.goalsWithoutBenefits.length > 0 && (
          <div className="border border-red-200 bg-red-50 rounded-lg p-3">
            <span className="text-xs font-semibold text-red-700">
              {gapDetails.goalsWithoutBenefits.length} doel(en) zonder baten
            </span>
            <div className="mt-1 space-y-0.5">
              {gapDetails.goalsWithoutBenefits.map((goalId) => {
                const goal = session.goals.find((g) => g.id === goalId);
                return (
                  <p key={goalId} className="text-xs text-red-600">
                    {goal?.name || goal?.description || goalId}
                  </p>
                );
              })}
            </div>
          </div>
        )}
        {gapDetails.benefitsWithoutCapabilities.length > 0 && (
          <div className="border border-red-200 bg-red-50 rounded-lg p-3">
            <span className="text-xs font-semibold text-red-700">
              {gapDetails.benefitsWithoutCapabilities.length} baat/baten zonder vermogens
            </span>
          </div>
        )}
        {gapDetails.capabilitiesWithoutEfforts.length > 0 && (
          <div className="border border-red-200 bg-red-50 rounded-lg p-3">
            <span className="text-xs font-semibold text-red-700">
              {gapDetails.capabilitiesWithoutEfforts.length} vermogen(s) zonder inspanningen
            </span>
          </div>
        )}
        {/* AI-detected gaps */}
        {aiGaps && aiGaps.length > 0 && (
          <div className="border border-amber-200 bg-amber-50 rounded-lg p-3">
            <span className="text-xs font-semibold text-amber-700 mb-1 block">AI-gedetecteerde gaps</span>
            <div className="space-y-0.5">
              {aiGaps.map((gap, i) => (
                <p key={i} className="text-xs text-amber-600">{gap}</p>
              ))}
            </div>
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Tab bar */}
      <div className="flex gap-1 border-b border-gray-200">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`px-4 py-2 text-sm font-medium transition-colors ${
              activeTab === tab.id
                ? "border-b-2 border-cito-blue text-cito-blue"
                : "border-transparent text-gray-500 hover:text-gray-700"
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Tab content */}
      {activeTab === "overzicht" && renderOverzicht()}
      {SECTORS.map(
        (sector) =>
          activeTab === sector && (
            <div key={sector}>{renderSectorTab(sector)}</div>
          )
      )}
    </div>
  );
}
