"use client";

import { useMemo } from "react";
import type { DINSession, Stap1Result } from "@/lib/types";
import { SECTORS } from "@/lib/types";
import { findGaps } from "@/lib/din-service";
import { getFocusGoal } from "@/lib/stap5-focus";
import { SectorBadge } from "./shared";

interface StapBatenOverloopProps {
  session: DINSession;
  result?: Stap1Result;
}

export default function StapBatenOverloop({ session, result }: StapBatenOverloopProps) {
  // Group baten per sector
  const batenPerSector = useMemo(() => {
    return SECTORS.map((sector) => ({
      sector,
      baten: session.benefits.filter((b) => b.sectorId === sector),
    }));
  }, [session.benefits]);

  // Alleen focusdoel (eerste doel) meenemen in gaps-analyse
  const focusGoal = useMemo(() => getFocusGoal(session.goals), [session.goals]);
  const focusGoals = useMemo(() => (focusGoal ? [focusGoal] : []), [focusGoal]);
  const focusGBMaps = useMemo(
    () => {
      const ids = new Set(focusGoals.map((g) => g.id));
      return (session.goalBenefitMaps || []).filter((m) => ids.has(m.goalId));
    },
    [focusGoals, session.goalBenefitMaps]
  );
  const focusBenefitIds = useMemo(
    () => new Set(focusGBMaps.map((m) => m.benefitId)),
    [focusGBMaps]
  );
  const focusBenefits = useMemo(
    () => session.benefits.filter((b) => focusBenefitIds.has(b.id)),
    [session.benefits, focusBenefitIds]
  );
  const focusBCMaps = useMemo(
    () => (session.benefitCapabilityMaps || []).filter((m) => focusBenefitIds.has(m.benefitId)),
    [session.benefitCapabilityMaps, focusBenefitIds]
  );

  // Compute local gaps
  const activeCaps = useMemo(
    () => session.capabilities.filter((c) => !c.consolidated),
    [session.capabilities]
  );
  const activeEfforts = useMemo(
    () => session.efforts.filter((e) => !e.consolidated),
    [session.efforts]
  );
  const gaps = useMemo(
    () =>
      findGaps(
        focusGoals,
        focusBenefits,
        activeCaps,
        activeEfforts,
        focusGBMaps,
        focusBCMaps,
        session.capabilityEffortMaps
      ),
    [
      focusGoals,
      focusBenefits,
      activeCaps,
      activeEfforts,
      focusGBMaps,
      focusBCMaps,
      session.capabilityEffortMaps,
    ]
  );

  return (
    <div className="space-y-6">
      {/* Sector columns: baten side-by-side */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {batenPerSector.map(({ sector, baten }) => (
          <div key={sector}>
            <div className="flex items-center gap-2 mb-3">
              <SectorBadge sector={sector} />
              <span className="text-sm font-semibold text-gray-700">
                {baten.length} {baten.length === 1 ? "baat" : "baten"}
              </span>
            </div>
            {baten.length > 0 ? (
              <div className="space-y-2">
                {baten.map((baat) => {
                  const linkedGoal = session.goalBenefitMaps
                    .filter((m) => m.benefitId === baat.id)
                    .map((m) => session.goals.find((g) => g.id === m.goalId))
                    .filter(Boolean)[0];

                  return (
                    <div
                      key={baat.id}
                      className="p-3 rounded-lg bg-gray-50 border border-gray-100 text-sm"
                    >
                      <div className="text-gray-800">
                        {baat.title || baat.description}
                      </div>
                      {linkedGoal && (
                        <div className="mt-1.5">
                          <span className="inline-block px-1.5 py-0.5 rounded text-[10px] font-medium bg-din-doelen/10 text-din-doelen border border-din-doelen/20">
                            {linkedGoal.name}
                          </span>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="p-3 rounded-lg bg-gray-50 border border-gray-100 text-sm text-gray-400 text-center">
                Geen baten voor {sector}
              </div>
            )}
          </div>
        ))}
      </div>

      {/* Local gaps analysis */}
      <LocalGapsSection gaps={gaps} session={session} />

      {/* AI result (when available) */}
      {result && <AIBatenResult result={result} />}
    </div>
  );
}

// --- Local gaps section ---

function LocalGapsSection({
  gaps,
  session,
}: {
  gaps: ReturnType<typeof findGaps>;
  session: DINSession;
}) {
  const categories = [
    {
      label: "Doelen zonder baten",
      items: gaps.goalsWithoutBenefits.map(
        (id) => session.goals.find((g) => g.id === id)?.name || id
      ),
    },
    {
      label: "Baten zonder vermogens",
      items: gaps.benefitsWithoutCapabilities.map(
        (id) => {
          const b = session.benefits.find((b) => b.id === id);
          return b?.title || b?.description || id;
        }
      ),
    },
    {
      label: "Vermogens zonder inspanningen",
      items: gaps.capabilitiesWithoutEfforts.map(
        (id) => {
          const c = session.capabilities.find((c) => c.id === id);
          return c?.title || c?.description || id;
        }
      ),
    },
  ];

  const totalGaps = categories.reduce((sum, cat) => sum + cat.items.length, 0);
  if (totalGaps === 0) return null;

  return (
    <div className="border border-red-200 rounded-xl overflow-hidden">
      <div className="bg-red-50 px-5 py-3 border-b border-red-200 flex items-center gap-3">
        <div className="w-8 h-8 rounded-lg bg-red-100 flex items-center justify-center">
          <svg className="w-4 h-4 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126zM12 15.75h.007v.008H12v-.008z" />
          </svg>
        </div>
        <div>
          <h4 className="text-sm font-semibold text-red-800">Ontbrekende ketens</h4>
          <p className="text-xs text-red-600 italic">
            Gaps in de DIN-keten: items zonder volgende schakel
          </p>
        </div>
      </div>
      <div className="bg-white p-5">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {categories.map(({ label, items }) => {
            const hasGaps = items.length > 0;
            return (
              <div
                key={label}
                className={`rounded-lg border p-4 ${
                  hasGaps
                    ? "border-red-200 bg-red-50/30"
                    : "border-green-200 bg-green-50/30"
                }`}
              >
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs font-semibold text-gray-700">{label}</span>
                  <span
                    className={`text-lg font-bold ${
                      hasGaps ? "text-red-600" : "text-green-600"
                    }`}
                  >
                    {items.length}
                  </span>
                </div>
                {hasGaps ? (
                  <ul className="space-y-1.5">
                    {items.map((item, i) => (
                      <li
                        key={i}
                        className="flex items-start gap-2 text-xs text-gray-600"
                      >
                        <span className="w-1.5 h-1.5 rounded-full bg-red-400 mt-1.5 shrink-0" />
                        <span>{item}</span>
                      </li>
                    ))}
                  </ul>
                ) : (
                  <div className="flex items-center gap-1.5 text-xs text-green-600">
                    <svg className="w-3.5 h-3.5" fill="currentColor" viewBox="0 0 20 20">
                      <path
                        fillRule="evenodd"
                        d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.857-9.809a.75.75 0 00-1.214-.882l-3.483 4.79-1.88-1.88a.75.75 0 10-1.06 1.061l2.5 2.5a.75.75 0 001.137-.089l4-5.5z"
                        clipRule="evenodd"
                      />
                    </svg>
                    <span>Volledig afgedekt</span>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

// --- AI result section ---

function AIBatenResult({ result }: { result: Stap1Result }) {
  return (
    <div className="space-y-4">
      {/* Synergies */}
      {result.synergieën && result.synergieën.length > 0 && (
        <div className="border border-amber-200 rounded-xl overflow-hidden">
          <div className="bg-amber-50 px-5 py-3 border-b border-amber-200 flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-amber-100 flex items-center justify-center">
              <svg className="w-4 h-4 text-amber-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" />
              </svg>
            </div>
            <div>
              <h4 className="text-sm font-semibold text-amber-800">Synergieeen tussen sectoren</h4>
              <p className="text-xs text-amber-600 italic">
                Baten die over meerdere sectoren heen overeenkomen
              </p>
            </div>
          </div>
          <div className="bg-white p-5">
            <div className="space-y-3">
              {result.synergieën.map((item, i) => (
                <div
                  key={i}
                  className="flex items-start gap-3 p-3 rounded-lg bg-amber-50/30 border border-amber-100"
                >
                  <div className="w-6 h-6 rounded-full bg-amber-100 text-amber-700 flex items-center justify-center text-[10px] font-bold shrink-0 mt-0.5">
                    {i + 1}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="text-sm font-medium text-gray-800">
                      {item.beschrijving}
                    </div>
                    <p className="text-xs text-gray-500 mt-0.5">{item.impact}</p>
                    <div className="flex gap-1 mt-1.5">
                      {item.sectoren.map((s) => (
                        <SectorBadge key={s} sector={s} />
                      ))}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Enhanced AI gaps */}
      {result.gaps && (
        (result.gaps.doelenZonderBaten.length > 0 || result.gaps.batenZonderVermogens.length > 0) && (
          <div className="border border-red-200 rounded-xl overflow-hidden">
            <div className="bg-red-50 px-5 py-3 border-b border-red-200 flex items-center gap-3">
              <div className="w-8 h-8 rounded-lg bg-red-100 flex items-center justify-center">
                <svg className="w-4 h-4 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126zM12 15.75h.007v.008H12v-.008z" />
                </svg>
              </div>
              <div>
                <h4 className="text-sm font-semibold text-red-800">AI-gedetecteerde gaps</h4>
                <p className="text-xs text-red-600 italic">
                  Aanvullende ontbrekende schakels geidentificeerd door de AI
                </p>
              </div>
            </div>
            <div className="bg-white p-5 space-y-3">
              {result.gaps.doelenZonderBaten.length > 0 && (
                <div>
                  <span className="text-xs font-semibold text-gray-700">Doelen zonder baten:</span>
                  <ul className="mt-1 space-y-1">
                    {result.gaps.doelenZonderBaten.map((item, i) => (
                      <li key={i} className="flex items-start gap-2 text-xs text-gray-600">
                        <span className="w-1.5 h-1.5 rounded-full bg-red-400 mt-1.5 shrink-0" />
                        <span>{item}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}
              {result.gaps.batenZonderVermogens.length > 0 && (
                <div>
                  <span className="text-xs font-semibold text-gray-700">Baten zonder vermogens:</span>
                  <ul className="mt-1 space-y-1">
                    {result.gaps.batenZonderVermogens.map((item, i) => (
                      <li key={i} className="flex items-start gap-2 text-xs text-gray-600">
                        <span className="w-1.5 h-1.5 rounded-full bg-red-400 mt-1.5 shrink-0" />
                        <span>{item}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          </div>
        )
      )}

      {/* Summary */}
      <div className="p-4 bg-gray-50 rounded-lg border border-gray-200">
        <p className="text-sm text-gray-700">{result.samenvatting}</p>
      </div>
    </div>
  );
}
