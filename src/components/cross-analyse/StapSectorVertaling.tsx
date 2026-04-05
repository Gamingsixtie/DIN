"use client";

import { SectorBadge } from "./shared";
import { findGaps, getDomainBalance } from "@/lib/din-service";
import { DOMAIN_LABELS } from "@/lib/types";
import type { DINSession, Stap5Result, EffortDomain } from "@/lib/types";

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
  doelen: { border: "border-l-[#003366]", text: "text-[#003366]" },
  baten: { border: "border-l-[#0066cc]", text: "text-[#0066cc]" },
  vermogens: { border: "border-l-[#0891b2]", text: "text-[#0891b2]" },
  inspanningen: { border: "border-l-[#059669]", text: "text-[#059669]" },
};

export default function StapSectorVertaling({ session }: StapSectorVertalingProps) {
  // --- Active items (post-consolidation) ---
  const activeCaps = session.capabilities.filter((c) => !c.consolidated);
  const activeEfforts = session.efforts.filter((e) => !e.consolidated);

  const totalCaps = session.capabilities.length;
  const totalEfforts = session.efforts.length;
  const mergedAwayCaps = totalCaps - activeCaps.length;
  const mergedAwayEfforts = totalEfforts - activeEfforts.length;

  const sharedCaps = activeCaps.filter(
    (c) => c.relatedSectors && c.relatedSectors.length > 1
  );
  const sharedEfforts = activeEfforts.filter(
    (e) => e.responsibleSector && e.responsibleSector.includes(",")
  );

  // --- Active maps (filter to only active cap/effort IDs) ---
  const activeCapIds = new Set(activeCaps.map((c) => c.id));
  const activeEffortIds = new Set(activeEfforts.map((e) => e.id));

  const activeBCMaps = session.benefitCapabilityMaps.filter((m) =>
    activeCapIds.has(m.capabilityId)
  );
  const activeCEMaps = session.capabilityEffortMaps.filter(
    (m) => activeCapIds.has(m.capabilityId) && activeEffortIds.has(m.effortId)
  );

  // --- Gaps on consolidated network ---
  const gaps = findGaps(
    session.goals,
    session.benefits,
    activeCaps,
    activeEfforts,
    session.goalBenefitMaps,
    activeBCMaps,
    activeCEMaps
  );
  const totalGaps =
    gaps.goalsWithoutBenefits.length +
    gaps.benefitsWithoutCapabilities.length +
    gaps.capabilitiesWithoutEfforts.length;

  // --- Domain balance ---
  const domainBalance = getDomainBalance(activeEfforts);
  const effortSum = Object.values(domainBalance).reduce((a, b) => a + b, 0);

  // --- Empty state ---
  if (
    session.goals.length === 0 &&
    session.benefits.length === 0 &&
    activeCaps.length === 0 &&
    activeEfforts.length === 0
  ) {
    return (
      <div className="flex flex-col items-center justify-center py-12 text-center">
        <p className="text-sm text-gray-500 font-medium">Nog geen DIN-data beschikbaar</p>
        <p className="text-xs text-gray-400 mt-1">
          Vul eerst het DIN-netwerk in via de DIN-Mapping stap.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* --- Consolidatie-samenvatting --- */}
      <div className="bg-gradient-to-r from-emerald-50 to-cyan-50 border border-emerald-200 rounded-xl p-4">
        <div className="flex items-start gap-3">
          <div className="w-8 h-8 rounded-lg bg-emerald-100 flex items-center justify-center shrink-0">
            <svg className="w-4 h-4 text-emerald-700" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h8m-8 6h16" />
            </svg>
          </div>
          <div className="flex-1">
            <h4 className="text-sm font-semibold text-emerald-900">Resultaat van de consolidatie</h4>
            <p className="text-xs text-emerald-800/80 mt-0.5">
              Dit is het nieuwe DIN-netwerk dat doorgaat naar prioritering. Geconsolideerde dubbelen vervallen.
            </p>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mt-3">
              <div className="bg-white/70 rounded-lg px-3 py-2">
                <div className="text-[10px] text-gray-500 uppercase tracking-wider font-medium">Doelen</div>
                <div className="text-lg font-bold text-[#003366]">{session.goals.length}</div>
              </div>
              <div className="bg-white/70 rounded-lg px-3 py-2">
                <div className="text-[10px] text-gray-500 uppercase tracking-wider font-medium">Baten</div>
                <div className="text-lg font-bold text-[#0066cc]">{session.benefits.length}</div>
              </div>
              <div className="bg-white/70 rounded-lg px-3 py-2">
                <div className="text-[10px] text-gray-500 uppercase tracking-wider font-medium">Vermogens</div>
                <div className="text-lg font-bold text-[#0891b2]">
                  {activeCaps.length}
                  {mergedAwayCaps > 0 && (
                    <span className="text-xs font-normal text-gray-400 ml-1">
                      (was {totalCaps})
                    </span>
                  )}
                </div>
                {sharedCaps.length > 0 && (
                  <div className="text-[10px] text-emerald-700 mt-0.5">
                    {sharedCaps.length} gedeeld
                  </div>
                )}
              </div>
              <div className="bg-white/70 rounded-lg px-3 py-2">
                <div className="text-[10px] text-gray-500 uppercase tracking-wider font-medium">Inspanningen</div>
                <div className="text-lg font-bold text-[#059669]">
                  {activeEfforts.length}
                  {mergedAwayEfforts > 0 && (
                    <span className="text-xs font-normal text-gray-400 ml-1">
                      (was {totalEfforts})
                    </span>
                  )}
                </div>
                {sharedEfforts.length > 0 && (
                  <div className="text-[10px] text-emerald-700 mt-0.5">
                    {sharedEfforts.length} gedeeld
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* --- DIN-keten --- */}
      <div className="space-y-5">
        {/* Doelen */}
        <section>
          <div className="flex items-baseline justify-between mb-2">
            <h5 className={`text-sm font-semibold ${CHAIN_COLORS.doelen.text}`}>
              Doelen
              <span className="ml-2 text-xs font-normal text-gray-400">({session.goals.length})</span>
            </h5>
          </div>
          <div className="space-y-1.5">
            {session.goals.length === 0 ? (
              <p className="text-xs text-gray-400 italic pl-4">Geen doelen</p>
            ) : (
              session.goals.map((goal) => {
                const linkedBenefits = session.benefits.filter((b) =>
                  session.goalBenefitMaps.some(
                    (m) => m.goalId === goal.id && m.benefitId === b.id
                  )
                );
                return (
                  <div
                    key={goal.id}
                    className={`${CHAIN_COLORS.doelen.border} border-l-4 bg-gray-50 rounded-r-lg pl-3 pr-3 py-2`}
                  >
                    <div className="text-sm font-medium text-gray-800">
                      {goal.name || goal.description}
                    </div>
                    {linkedBenefits.length > 0 && (
                      <div className="text-[11px] text-gray-500 mt-0.5">
                        {linkedBenefits.length} {linkedBenefits.length === 1 ? "baat" : "baten"} gekoppeld
                      </div>
                    )}
                  </div>
                );
              })
            )}
          </div>
        </section>

        {/* Baten */}
        <section>
          <div className="flex items-baseline justify-between mb-2">
            <h5 className={`text-sm font-semibold ${CHAIN_COLORS.baten.text}`}>
              Baten
              <span className="ml-2 text-xs font-normal text-gray-400">({session.benefits.length})</span>
            </h5>
          </div>
          <div className="space-y-1.5">
            {session.benefits.length === 0 ? (
              <p className="text-xs text-gray-400 italic pl-4">Geen baten</p>
            ) : (
              session.benefits.map((benefit) => (
                <div
                  key={benefit.id}
                  className={`${CHAIN_COLORS.baten.border} border-l-4 pl-3 pr-3 py-1.5 flex items-center gap-2`}
                >
                  <span className="text-xs text-gray-700 flex-1">
                    {benefit.title || benefit.description}
                  </span>
                  {benefit.sectorId && <SectorBadge sector={benefit.sectorId} />}
                </div>
              ))
            )}
          </div>
        </section>

        {/* Vermogens */}
        <section>
          <div className="flex items-baseline justify-between mb-2">
            <h5 className={`text-sm font-semibold ${CHAIN_COLORS.vermogens.text}`}>
              Vermogens
              <span className="ml-2 text-xs font-normal text-gray-400">
                ({activeCaps.length}
                {mergedAwayCaps > 0 && <> — {mergedAwayCaps} samengevoegd</>})
              </span>
            </h5>
          </div>
          <div className="space-y-1.5">
            {activeCaps.length === 0 ? (
              <p className="text-xs text-gray-400 italic pl-4">Geen vermogens</p>
            ) : (
              activeCaps.map((cap) => {
                const isShared = cap.relatedSectors && cap.relatedSectors.length > 1;
                return (
                  <div
                    key={cap.id}
                    className={`${CHAIN_COLORS.vermogens.border} border-l-4 pl-3 pr-3 py-1.5 flex items-center gap-2 ${
                      isShared ? "bg-emerald-50/40" : ""
                    }`}
                  >
                    <span className="text-xs text-gray-700 flex-1">
                      {cap.title || cap.description}
                    </span>
                    {isShared ? (
                      <div className="flex gap-0.5">
                        {cap.relatedSectors!.map((s) => (
                          <SectorBadge key={s} sector={s} />
                        ))}
                      </div>
                    ) : (
                      cap.sectorId && <SectorBadge sector={cap.sectorId} />
                    )}
                  </div>
                );
              })
            )}
          </div>
        </section>

        {/* Inspanningen (per domein) */}
        <section>
          <div className="flex items-baseline justify-between mb-2">
            <h5 className={`text-sm font-semibold ${CHAIN_COLORS.inspanningen.text}`}>
              Inspanningen
              <span className="ml-2 text-xs font-normal text-gray-400">
                ({activeEfforts.length}
                {mergedAwayEfforts > 0 && <> — {mergedAwayEfforts} samengevoegd</>})
              </span>
            </h5>
          </div>
          {activeEfforts.length === 0 ? (
            <p className="text-xs text-gray-400 italic pl-4">Geen inspanningen</p>
          ) : (
            <div className="space-y-3">
              {(Object.keys(DOMAIN_LABELS) as EffortDomain[]).map((domain) => {
                const domainEfforts = activeEfforts.filter((e) => e.domain === domain);
                if (domainEfforts.length === 0) return null;
                const colors = DOMAIN_COLORS[domain];
                return (
                  <div key={domain}>
                    <p className={`text-[10px] font-semibold ${colors.text} uppercase tracking-wider mb-1`}>
                      {DOMAIN_LABELS[domain]} ({domainEfforts.length})
                    </p>
                    <div className="space-y-1">
                      {domainEfforts.map((effort) => {
                        const isShared =
                          effort.responsibleSector && effort.responsibleSector.includes(",");
                        return (
                          <div
                            key={effort.id}
                            className={`${CHAIN_COLORS.inspanningen.border} border-l-4 pl-3 pr-3 py-1.5 flex items-center gap-2 ${
                              isShared ? "bg-emerald-50/40" : ""
                            }`}
                          >
                            <span className="text-xs text-gray-700 flex-1">
                              {effort.title || effort.description}
                            </span>
                            {isShared ? (
                              <div className="flex gap-0.5">
                                {effort.responsibleSector!
                                  .split(",")
                                  .map((s) => s.trim())
                                  .filter(Boolean)
                                  .map((s) => (
                                    <SectorBadge key={s} sector={s} />
                                  ))}
                              </div>
                            ) : (
                              effort.sectorId && <SectorBadge sector={effort.sectorId} />
                            )}
                          </div>
                        );
                      })}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </section>
      </div>

      {/* --- Domeinbalans --- */}
      {activeEfforts.length > 0 && (
        <div>
          <h5 className="text-sm font-semibold text-gray-700 mb-3">Domeinbalans</h5>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
            {(Object.keys(DOMAIN_LABELS) as EffortDomain[]).map((domain) => {
              const count = domainBalance[domain];
              const pct = effortSum > 0 ? Math.round((count / effortSum) * 100) : 0;
              const colors = DOMAIN_COLORS[domain];
              return (
                <div key={domain} className={`${colors.bg} rounded-lg p-3`}>
                  <div className="flex items-baseline gap-1">
                    <span className={`text-lg font-bold ${colors.text}`}>{count}</span>
                    <span className="text-xs text-gray-400">({pct}%)</span>
                  </div>
                  <div className="text-xs font-medium text-gray-600 mt-0.5">
                    {DOMAIN_LABELS[domain]}
                  </div>
                  <div className="mt-2 h-1.5 bg-white/60 rounded-full overflow-hidden">
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
      )}

      {/* --- Gap analyse --- */}
      <div>
        <h5 className="text-sm font-semibold text-gray-700 mb-3">Gap-analyse op geconsolideerd netwerk</h5>
        {totalGaps === 0 ? (
          <div className="border border-green-200 bg-green-50 rounded-lg p-3 flex items-center gap-2">
            <svg className="w-4 h-4 text-green-600 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
            </svg>
            <span className="text-sm text-green-700 font-medium">
              Geen gaps gevonden — de DIN-keten is compleet
            </span>
          </div>
        ) : (
          <div className="space-y-2">
            {gaps.goalsWithoutBenefits.length > 0 && (
              <div className="border border-red-200 bg-red-50 rounded-lg p-3">
                <span className="text-xs font-semibold text-red-700">
                  {gaps.goalsWithoutBenefits.length} doel(en) zonder baten
                </span>
                <div className="mt-1 space-y-0.5">
                  {gaps.goalsWithoutBenefits.map((goalId) => {
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
            {gaps.benefitsWithoutCapabilities.length > 0 && (
              <div className="border border-red-200 bg-red-50 rounded-lg p-3">
                <span className="text-xs font-semibold text-red-700">
                  {gaps.benefitsWithoutCapabilities.length} baat/baten zonder vermogens
                </span>
              </div>
            )}
            {gaps.capabilitiesWithoutEfforts.length > 0 && (
              <div className="border border-red-200 bg-red-50 rounded-lg p-3">
                <span className="text-xs font-semibold text-red-700">
                  {gaps.capabilitiesWithoutEfforts.length} vermogen(s) zonder inspanningen
                </span>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
