"use client";

import { useMemo } from "react";
import type { DINSession, Stap2Result, EffortDomain } from "@/lib/types";
import { SECTORS, SECTOR_COLORS } from "@/lib/types";
import type { SectorName } from "@/lib/types";
import { findSharedCapabilities } from "@/lib/din-service";
import { SectorBadge, ClusterCard } from "./shared";

interface StapGedeeldeVermogensProps {
  session: DINSession;
  result?: Stap2Result;
}

// No-op handlers for read-only ClusterCard
const noopMerge = () => {};
const noopUndo = () => {};
const noopReview = () => {};

export default function StapGedeeldeVermogens({ session, result }: StapGedeeldeVermogensProps) {
  const activeCaps = useMemo(
    () => session.capabilities.filter((c) => !c.consolidated),
    [session.capabilities]
  );

  const sharedCaps = useMemo(
    () => findSharedCapabilities(activeCaps),
    [activeCaps]
  );

  return (
    <div className="space-y-6">
      {/* Vermogen-Synergie Matrix (local data) */}
      <VermogenSynergieMatrix
        activeCaps={activeCaps}
        sharedCaps={sharedCaps}
        session={session}
      />

      {/* AI result (when available) */}
      {result && <AIVermogenResult result={result} />}
    </div>
  );
}

// --- Vermogen-Synergie Matrix ---

function VermogenSynergieMatrix({
  activeCaps,
  sharedCaps,
  session,
}: {
  activeCaps: DINSession["capabilities"];
  sharedCaps: Map<string, string[]>;
  session: DINSession;
}) {
  return (
    <section className="bg-white border border-gray-200 rounded-xl overflow-hidden">
      <div className="px-5 py-4 border-b border-gray-100 flex items-center gap-3">
        <div className="w-8 h-8 rounded-lg bg-amber-100 flex items-center justify-center">
          <svg className="w-4 h-4 text-amber-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" />
          </svg>
        </div>
        <div>
          <h3 className="text-sm font-semibold text-cito-blue">Vermogen-Synergie Matrix</h3>
          <p className="text-xs text-gray-400">
            Vermogens die bij meerdere sectoren terugkomen zijn hefbomen — investeren hierin heeft breed effect.
          </p>
        </div>
      </div>
      <div className="p-5">
        {sharedCaps.size > 0 ? (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-200">
                  <th className="py-2.5 text-left font-medium text-gray-500 text-xs uppercase tracking-wider">
                    Vermogen
                  </th>
                  {SECTORS.map((s) => (
                    <th key={s} className="py-2.5 text-center font-medium text-gray-500 w-24 text-xs uppercase tracking-wider">
                      {s}
                    </th>
                  ))}
                  <th className="py-2.5 text-center font-medium text-gray-500 w-20 text-xs uppercase tracking-wider">
                    Sectoren
                  </th>
                </tr>
              </thead>
              <tbody>
                {activeCaps
                  .filter((c) => sharedCaps.has(c.id))
                  .map((cap) => {
                    const sectors = sharedCaps.get(cap.id) || [];
                    return (
                      <tr key={cap.id} className="border-b border-gray-50 hover:bg-amber-50/30 transition-colors">
                        <td className="py-3 text-gray-700 pr-4">
                          <div className="text-sm">{cap.title || cap.description || "(naamloos)"}</div>
                          {cap.currentLevel && cap.targetLevel && (
                            <div className="text-[10px] text-gray-400 mt-0.5">
                              Niveau: {cap.currentLevel}/5 &rarr; {cap.targetLevel}/5
                            </div>
                          )}
                        </td>
                        {SECTORS.map((s) => (
                          <td key={s} className="py-3 text-center">
                            {sectors.includes(s) ? (
                              <span className="inline-flex items-center justify-center w-6 h-6 rounded-full bg-amber-100">
                                <span className="w-2.5 h-2.5 rounded-full bg-amber-500" />
                              </span>
                            ) : (
                              <span className="inline-flex items-center justify-center w-6 h-6 rounded-full bg-gray-50">
                                <span className="w-2.5 h-2.5 rounded-full bg-gray-200" />
                              </span>
                            )}
                          </td>
                        ))}
                        <td className="py-3 text-center">
                          <span className="inline-flex items-center justify-center px-2 py-0.5 rounded-full bg-amber-100 text-amber-700 text-xs font-bold">
                            {sectors.length}
                          </span>
                        </td>
                      </tr>
                    );
                  })}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="text-center py-8">
            <div className="w-12 h-12 mx-auto mb-3 rounded-full bg-gray-100 flex items-center justify-center">
              <svg className="w-6 h-6 text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" />
              </svg>
            </div>
            <p className="text-sm text-gray-400">
              Geen gedeelde vermogens gevonden tussen sectoren.
            </p>
            <p className="text-xs text-gray-300 mt-1">
              Voeg meer vermogens toe per sector in de DIN-Mapping stap.
            </p>
          </div>
        )}
      </div>
    </section>
  );
}

// --- AI result ---

function AIVermogenResult({ result }: { result: Stap2Result }) {
  const priorityColors: Record<string, string> = {
    hoog: "bg-red-100 text-red-700 border-red-200",
    midden: "bg-amber-100 text-amber-700 border-amber-200",
    laag: "bg-gray-100 text-gray-600 border-gray-200",
  };

  return (
    <div className="space-y-4">
      {/* Vermogen clusters (read-only) */}
      {result.vermogenClusters && result.vermogenClusters.length > 0 && (
        <div>
          <h4 className="text-sm font-semibold text-teal-700 mb-3">AI-gedetecteerde vermogenclusters</h4>
          <div className="space-y-3">
            {result.vermogenClusters.map((cluster, i) => (
              <ClusterCard
                key={i}
                cluster={cluster}
                type="vermogen"
                onMerge={noopMerge}
                isMerged={false}
                onUndo={noopUndo}
                onReview={noopReview}
                isReviewed={false}
                readOnly={true}
              />
            ))}
          </div>
        </div>
      )}

      {/* Hefboomwerking */}
      {result.hefboomwerking && result.hefboomwerking.length > 0 && (
        <div className="border border-green-200 rounded-xl overflow-hidden">
          <div className="bg-green-50 px-5 py-3 border-b border-green-200 flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-green-100 flex items-center justify-center">
              <svg className="w-4 h-4 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.25 18L9 11.25l4.306 4.307a11.95 11.95 0 015.814-5.519l2.74-1.22m0 0l-5.94-2.28m5.94 2.28l-2.28 5.941" />
              </svg>
            </div>
            <div>
              <h4 className="text-sm font-semibold text-green-800">Hefboomwerking</h4>
              <p className="text-xs text-green-600 italic">
                Inspanningen met het meeste cross-sector effect
              </p>
            </div>
          </div>
          <div className="bg-white p-5">
            <div className="space-y-3">
              {result.hefboomwerking.map((item, i) => (
                <div key={i} className="flex items-start gap-3 p-3 rounded-lg border border-green-100 bg-green-50/20">
                  <div className="w-6 h-6 rounded-full bg-green-100 text-green-700 flex items-center justify-center text-[10px] font-bold shrink-0 mt-0.5">
                    {i + 1}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-medium text-gray-800">{item.inspanning}</span>
                      <span className={`text-[10px] px-1.5 py-0.5 rounded border font-medium ${priorityColors[item.prioriteit] || priorityColors.midden}`}>
                        {item.prioriteit}
                      </span>
                    </div>
                    <div className="flex flex-wrap gap-1 mt-1.5">
                      <span className="text-[10px] text-gray-400 mr-1">Draagt bij aan:</span>
                      {item.bijdraagtAan.map((baat, j) => (
                        <span key={j} className="text-[10px] bg-din-baten/10 text-din-baten px-1.5 py-0.5 rounded font-medium">
                          {baat}
                        </span>
                      ))}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Summary */}
      <div className="p-4 bg-gray-50 rounded-lg border border-gray-200">
        <p className="text-sm text-gray-700">{result.samenvatting}</p>
      </div>
    </div>
  );
}
