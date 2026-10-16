"use client";

import { useMemo } from "react";
import type { DINSession, Stap3Result, EffortDomain, ProjectMatchItem } from "@/lib/types";
import { SECTORS, DOMAIN_LABELS } from "@/lib/types";
import { getDomainBalance } from "@/lib/din-service";
import { SectorBadge, ClusterCard } from "./shared";

interface StapInspanningenOverlapProps {
  session: DINSession;
  result?: Stap3Result;
}

const DOMAIN_COLORS: Record<EffortDomain, { bg: string; text: string; bar: string }> = {
  mens: { bg: "bg-blue-50", text: "text-blue-700", bar: "#2563eb" },
  processen: { bg: "bg-green-50", text: "text-green-700", bar: "#059669" },
  data_systemen: { bg: "bg-purple-50", text: "text-purple-700", bar: "#7c3aed" },
  cultuur: { bg: "bg-amber-50", text: "text-amber-700", bar: "#d97706" },
  overig: { bg: "bg-gray-50", text: "text-gray-700", bar: "#6b7280" },
};

// No-op handlers for read-only ClusterCard
const noopMerge = () => {};
const noopUndo = () => {};
const noopReview = () => {};

export default function StapInspanningenOverlap({ session, result }: StapInspanningenOverlapProps) {
  const activeEfforts = useMemo(
    () => session.efforts.filter((e) => !e.consolidated),
    [session.efforts]
  );

  const domainBalance = useMemo(
    () => getDomainBalance(activeEfforts),
    [activeEfforts]
  );

  const totalEfforts = activeEfforts.length;

  return (
    <div className="space-y-6">
      {/* Domain balance breakdown (local data) */}
      <DomainBalanceGrid
        domainBalance={domainBalance}
        totalEfforts={totalEfforts}
        activeEfforts={activeEfforts}
      />

      {/* AI result (when available) */}
      {result && <AIInspanningenResult result={result} />}
    </div>
  );
}

// --- Domain Balance Grid ---

function DomainBalanceGrid({
  domainBalance,
  totalEfforts,
  activeEfforts,
}: {
  domainBalance: Record<EffortDomain, number>;
  totalEfforts: number;
  activeEfforts: DINSession["efforts"];
}) {
  return (
    <section className="bg-white border border-gray-200 rounded-xl overflow-hidden">
      <div className="px-5 py-4 border-b border-gray-100 flex items-center gap-3">
        <div className="w-8 h-8 rounded-lg bg-green-100 flex items-center justify-center">
          <svg className="w-4 h-4 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 13.125C3 12.504 3.504 12 4.125 12h2.25c.621 0 1.125.504 1.125 1.125v6.75C7.5 20.496 6.996 21 6.375 21h-2.25A1.125 1.125 0 013 19.875v-6.75zM9.75 8.625c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125v11.25c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 01-1.125-1.125V8.625zM16.5 4.125c0-.621.504-1.125 1.125-1.125h2.25C20.496 3 21 3.504 21 4.125v15.75c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 01-1.125-1.125V4.125z" />
          </svg>
        </div>
        <div>
          <h3 className="text-sm font-semibold text-cito-blue">Inspanningen per Domein</h3>
          <p className="text-xs text-gray-400">
            Verdeling over de 4 inspanningsdomeinen — alle domeinen moeten afgedekt zijn.
          </p>
        </div>
      </div>
      <div className="p-5">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {(Object.keys(DOMAIN_LABELS) as EffortDomain[]).map((domain) => {
            const count = domainBalance[domain];
            const pct = totalEfforts > 0 ? (count / totalEfforts) * 100 : 0;
            const colors = DOMAIN_COLORS[domain];
            const isEmpty = count === 0;

            const domainEfforts = activeEfforts.filter((e) => e.domain === domain);

            return (
              <div
                key={domain}
                className={`border rounded-xl p-4 transition-colors ${
                  isEmpty ? "border-red-200 bg-red-50/50" : `border-gray-200 ${colors.bg}`
                }`}
              >
                <div className="flex items-center justify-between">
                  <div className={`text-xs font-semibold uppercase tracking-wider ${colors.text}`}>
                    {DOMAIN_LABELS[domain]}
                  </div>
                </div>
                <div className="flex items-end gap-2 mt-2">
                  <div className={`text-3xl font-bold ${isEmpty ? "text-red-400" : colors.text}`}>
                    {count}
                  </div>
                  <div className="text-xs text-gray-400 mb-1">
                    {Math.round(pct)}%
                  </div>
                </div>
                <div className="mt-3 h-2 bg-white/60 rounded-full overflow-hidden">
                  <div
                    className="h-full rounded-full transition-all duration-500"
                    style={{ width: `${pct}%`, backgroundColor: colors.bar }}
                  />
                </div>
                {domainEfforts.length > 0 && (
                  <div className="mt-3 flex flex-wrap gap-1">
                    {SECTORS.map((s) => {
                      const sectorCount = domainEfforts.filter((e) => e.sectorId === s).length;
                      if (sectorCount === 0) return null;
                      return (
                        <span key={s} className="text-[9px] text-gray-500 bg-white/80 px-1.5 py-0.5 rounded">
                          {s}: {sectorCount}
                        </span>
                      );
                    })}
                  </div>
                )}
                {isEmpty && (
                  <div className="mt-2 text-[10px] text-red-500 font-medium flex items-center gap-1">
                    <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M8.485 2.495c.673-1.167 2.357-1.167 3.03 0l6.28 10.875c.673 1.167-.17 2.625-1.516 2.625H3.72c-1.347 0-2.189-1.458-1.515-2.625L8.485 2.495zM10 5a.75.75 0 01.75.75v3.5a.75.75 0 01-1.5 0v-3.5A.75.75 0 0110 5zm0 9a1 1 0 100-2 1 1 0 000 2z" clipRule="evenodd" />
                    </svg>
                    Niet afgedekt
                  </div>
                )}
              </div>
            );
          })}
        </div>

        {/* Balance check */}
        {totalEfforts > 0 && (() => {
          const hasEmptyDomains = Object.values(domainBalance).some((v) => v === 0);
          return (
            <div className={`mt-4 p-3 rounded-lg text-sm ${
              hasEmptyDomains
                ? "bg-red-50 border border-red-200 text-red-700"
                : "bg-green-50 border border-green-200 text-green-700"
            }`}>
              <div className="flex items-center gap-2">
                {hasEmptyDomains ? (
                  <>
                    <svg className="w-4 h-4 shrink-0" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M8.485 2.495c.673-1.167 2.357-1.167 3.03 0l6.28 10.875c.673 1.167-.17 2.625-1.516 2.625H3.72c-1.347 0-2.189-1.458-1.515-2.625L8.485 2.495zM10 5a.75.75 0 01.75.75v3.5a.75.75 0 01-1.5 0v-3.5A.75.75 0 0110 5zm0 9a1 1 0 100-2 1 1 0 000 2z" clipRule="evenodd" />
                    </svg>
                    <span>Niet alle domeinen zijn afgedekt. Overweeg inspanningen toe te voegen voor ontbrekende domeinen.</span>
                  </>
                ) : (
                  <>
                    <svg className="w-4 h-4 shrink-0" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.857-9.809a.75.75 0 00-1.214-.882l-3.483 4.79-1.88-1.88a.75.75 0 10-1.06 1.061l2.5 2.5a.75.75 0 001.137-.089l4-5.5z" clipRule="evenodd" />
                    </svg>
                    <span>Alle vier de domeinen zijn vertegenwoordigd.</span>
                  </>
                )}
              </div>
            </div>
          );
        })()}
      </div>
    </section>
  );
}

// --- AI result ---

function AIInspanningenResult({ result }: { result: Stap3Result }) {
  return (
    <div className="space-y-4">
      {/* Inspanning clusters (read-only) */}
      {result.inspanningClusters && result.inspanningClusters.length > 0 && (
        <div>
          <h4 className="text-sm font-semibold text-indigo-700 mb-3">AI-gedetecteerde inspanningclusters</h4>
          <div className="space-y-3">
            {result.inspanningClusters.map((cluster, i) => (
              <ClusterCard
                key={i}
                cluster={cluster}
                type="inspanning"
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

      {/* Project matching */}
      {result.projectMatching && result.projectMatching.length > 0 && (
        <ProjectMatchingDisplay items={result.projectMatching} />
      )}

      {/* Summary */}
      <div className="p-4 bg-gray-50 rounded-lg border border-gray-200">
        <p className="text-sm text-gray-700">{result.samenvatting}</p>
      </div>
    </div>
  );
}

// --- Project matching display ---

function ProjectMatchingDisplay({ items }: { items: ProjectMatchItem[] }) {
  return (
    <div className="border border-cyan-200 rounded-xl overflow-hidden">
      <div className="bg-cyan-50 px-5 py-3 border-b border-cyan-200 flex items-center gap-3">
        <div className="w-8 h-8 rounded-lg bg-cyan-100 flex items-center justify-center">
          <svg className="w-4 h-4 text-cyan-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.5 6H5.25A2.25 2.25 0 003 8.25v10.5A2.25 2.25 0 005.25 21h10.5A2.25 2.25 0 0018 18.75V10.5m-10.5 6L21 3m0 0h-5.25M21 3v5.25" />
          </svg>
        </div>
        <div>
          <h4 className="text-sm font-semibold text-cyan-800">Projectkoppeling</h4>
          <p className="text-xs text-cyan-600 italic">
            Lopende projecten gekoppeld aan het DIN-netwerk — welke passen, welke niet.
          </p>
        </div>
      </div>
      <div className="bg-white p-5">
        <div className="space-y-3">
          {items.map((item, i) => (
            <div key={i} className="flex items-start gap-3 p-3 rounded-lg border border-cyan-100 bg-cyan-50/20">
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <span className="text-sm font-medium text-gray-800">{item.project}</span>
                  {item.heeftMatch ? (
                    <span className="text-[10px] px-1.5 py-0.5 rounded border font-medium bg-green-100 text-green-700 border-green-200">
                      Match
                    </span>
                  ) : (
                    <span className="text-[10px] px-1.5 py-0.5 rounded border font-medium bg-gray-100 text-gray-500 border-gray-200">
                      Geen DIN-match
                    </span>
                  )}
                </div>
                {item.heeftMatch && item.gekoppeldAan && (
                  <div className="text-xs text-gray-500 mt-0.5">
                    Gekoppeld aan <span className="font-medium text-gray-700">{item.gekoppeldAan}</span>
                  </div>
                )}
                <p className="text-xs text-gray-500 mt-1">{item.advies}</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
