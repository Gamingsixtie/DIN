"use client";

import { useState, useEffect } from "react";
import { useSession } from "@/lib/session-context";
import {
  mergeCapabilities,
  undoMergeCapabilities,
  mergeEfforts,
  undoMergeEfforts,
} from "@/components/steps/CrossAnalyseStep";
import { ClusterCard, SectorBadge } from "./shared";
import type {
  DINSession,
  Stap2Result,
  Stap3Result,
  Stap4Result,
} from "@/lib/types";

interface StapConsolidatieProps {
  session: DINSession;
  stap2Result?: Stap2Result;
  stap3Result?: Stap3Result;
  stap4Result?: Stap4Result;
}

const AANBEVELING_STYLE: Record<string, { bg: string; text: string; border: string }> = {
  combineren: { bg: "bg-green-50", text: "text-green-700", border: "border-green-200" },
  afstemmen: { bg: "bg-amber-50", text: "text-amber-700", border: "border-amber-200" },
  apart_houden: { bg: "bg-gray-50", text: "text-gray-600", border: "border-gray-200" },
};

const AANBEVELING_LABEL: Record<string, string> = {
  combineren: "Combineren",
  afstemmen: "Afstemmen",
  apart_houden: "Apart houden",
};

export default function StapConsolidatie({
  session,
  stap2Result,
  stap3Result,
  stap4Result,
}: StapConsolidatieProps) {
  const { updateSession } = useSession();

  const [mergedCapClusters, setMergedCapClusters] = useState<Map<string, string>>(new Map());
  const [mergedEffClusters, setMergedEffClusters] = useState<Map<string, string>>(new Map());
  const [reviewedClusters, setReviewedClusters] = useState<Set<string>>(new Set());
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  // Toast auto-clear
  useEffect(() => {
    if (toastMessage) {
      const timer = setTimeout(() => setToastMessage(null), 3000);
      return () => clearTimeout(timer);
    }
  }, [toastMessage]);

  const [autoApplied, setAutoApplied] = useState(false);

  const vermogenClusters = stap2Result?.vermogenClusters ?? [];
  const inspanningClusters = stap3Result?.inspanningClusters ?? [];
  const hasAnyClusters = vermogenClusters.length > 0 || inspanningClusters.length > 0;

  // --- Auto-apply "combineren" aanbevelingen na stap 4 ---
  useEffect(() => {
    if (autoApplied) return;
    // Auto-apply wanneer stap4Result binnenkomt, of op basis van stap2/3 aanbevelingen
    const hasCombineren =
      vermogenClusters.some((c) => c.aanbeveling === "combineren") ||
      inspanningClusters.some((c) => c.aanbeveling === "combineren");
    if (!hasCombineren) return;

    setAutoApplied(true);
    let count = 0;

    updateSession((prev) => {
      let updated = prev;

      // Auto-merge vermogen clusters met "combineren"
      for (const cluster of vermogenClusters) {
        if (cluster.aanbeveling !== "combineren") continue;
        const ids = cluster.items.map((it) => it.id);
        if (ids.length < 2) continue;
        // Skip als al gemerged
        const key = [...ids].sort().join(",");
        if (mergedCapClusters.has(key)) continue;

        updated = mergeCapabilities(updated, ids);
        const sharedId = updated.capabilities[updated.capabilities.length - 1]?.id;
        if (sharedId) {
          setMergedCapClusters((p) => new Map(p).set(key, sharedId));
          count++;
        }
      }

      // Auto-merge inspanning clusters met "combineren"
      for (const cluster of inspanningClusters) {
        if (cluster.aanbeveling !== "combineren") continue;
        const ids = cluster.items.map((it) => it.id);
        if (ids.length < 2) continue;
        const key = [...ids].sort().join(",");
        if (mergedEffClusters.has(key)) continue;

        updated = mergeEfforts(updated, ids);
        const sharedId = updated.efforts[updated.efforts.length - 1]?.id;
        if (sharedId) {
          setMergedEffClusters((p) => new Map(p).set(key, sharedId));
          count++;
        }
      }

      return updated;
    });

    if (count > 0) {
      setToastMessage(`${count} cluster${count > 1 ? "s" : ""} automatisch samengevoegd`);
    }
  }, [stap2Result, stap3Result, stap4Result, autoApplied]); // eslint-disable-line react-hooks/exhaustive-deps

  // --- Consolidation handlers (per D-10 -- reuse existing pure functions) ---

  function handleMergeCapabilities(clusterItemIds: string[]) {
    updateSession((prev) => {
      const result = mergeCapabilities(prev, clusterItemIds);
      const sharedId = result.capabilities[result.capabilities.length - 1]?.id;
      if (sharedId) {
        const key = [...clusterItemIds].sort().join(",");
        setMergedCapClusters((p) => new Map(p).set(key, sharedId));
      }
      return result;
    });
    setToastMessage("Items samengevoegd");
  }

  function handleMergeEfforts(clusterItemIds: string[]) {
    updateSession((prev) => {
      const result = mergeEfforts(prev, clusterItemIds);
      const sharedId = result.efforts[result.efforts.length - 1]?.id;
      if (sharedId) {
        const key = [...clusterItemIds].sort().join(",");
        setMergedEffClusters((p) => new Map(p).set(key, sharedId));
      }
      return result;
    });
    setToastMessage("Items samengevoegd");
  }

  function handleUndoMergeCap(sharedId: string) {
    updateSession((prev) => undoMergeCapabilities(prev, sharedId));
    setMergedCapClusters((prev) => {
      const next = new Map(prev);
      for (const [key, val] of next.entries()) {
        if (val === sharedId) next.delete(key);
      }
      return next;
    });
    setToastMessage("Samenvoeging ongedaan gemaakt");
  }

  function handleUndoMergeEff(sharedId: string) {
    updateSession((prev) => undoMergeEfforts(prev, sharedId));
    setMergedEffClusters((prev) => {
      const next = new Map(prev);
      for (const [key, val] of next.entries()) {
        if (val === sharedId) next.delete(key);
      }
      return next;
    });
    setToastMessage("Samenvoeging ongedaan gemaakt");
  }

  function handleReviewCluster(key: string) {
    setReviewedClusters((prev) => new Set(prev).add(key));
  }

  // --- No clusters available ---

  if (!hasAnyClusters) {
    return (
      <div className="flex flex-col items-center justify-center py-12 text-center">
        <div className="w-10 h-10 rounded-full bg-gray-100 flex items-center justify-center mb-3">
          <svg className="w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
          </svg>
        </div>
        <p className="text-sm text-gray-500 font-medium">Voer eerst stap 2 en 3 uit om clusters te zien</p>
        <p className="text-xs text-gray-400 mt-1">De consolidatie-stap werkt met de clusters uit de voorgaande analyses.</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Intro */}
      <div className="bg-gray-50 border border-gray-200 rounded-lg p-3">
        <p className="text-xs text-gray-600">
          Dit is de beslissingsstap: beoordeel per cluster of items <strong>samengevoegd</strong>,
          <strong> afgestemd</strong> of <strong>apart gehouden</strong> moeten worden. Samengevoegde
          items verschijnen als één gedeelde entiteit in het nieuwe DIN-netwerk (stap 5) en in de prioritering.
        </p>
      </div>

      {/* Toast message */}
      {toastMessage && (
        <div className="fixed top-4 right-4 z-50 bg-cito-blue text-white px-4 py-3 rounded-lg shadow-lg text-sm font-medium animate-fade-in">
          {toastMessage}
        </div>
      )}

      {/* AI consolidatie-advies (if stap4Result exists) */}
      {stap4Result && stap4Result.consolidatieAdvies.length > 0 && (
        <div className="space-y-3">
          <h5 className="text-sm font-semibold text-gray-700">AI consolidatie-advies</h5>
          <div className="grid gap-3 sm:grid-cols-2">
            {stap4Result.consolidatieAdvies.map((advies, i) => {
              const style = AANBEVELING_STYLE[advies.aanbeveling] || AANBEVELING_STYLE.apart_houden;
              return (
                <div
                  key={i}
                  className={`${style.bg} border ${style.border} rounded-lg p-3`}
                >
                  <div className="flex items-start gap-2">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="text-sm font-semibold text-gray-800 truncate">{advies.clusterTitel}</span>
                        <span className={`inline-block px-1.5 py-0.5 rounded text-[10px] font-semibold ${style.text} ${style.bg} border ${style.border}`}>
                          {AANBEVELING_LABEL[advies.aanbeveling] || advies.aanbeveling}
                        </span>
                      </div>
                      <span className="text-[10px] text-gray-400 uppercase tracking-wider">
                        {advies.type === "vermogen" ? "Vermogen" : "Inspanning"}
                      </span>
                      <p className="text-xs text-gray-600 mt-1">{advies.reden}</p>
                      {advies.voorgesteldeNaam && (
                        <p className="text-xs text-gray-500 mt-1 italic">
                          Voorgestelde naam: {advies.voorgesteldeNaam}
                        </p>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
          {stap4Result.samenvatting && (
            <div className="bg-gray-50 border border-gray-200 rounded-lg p-3 mt-2">
              <p className="text-xs text-gray-600">{stap4Result.samenvatting}</p>
            </div>
          )}
        </div>
      )}

      {/* Vermogen clusters section */}
      {vermogenClusters.length > 0 && (
        <div className="space-y-3">
          <h5 className="text-sm font-semibold text-teal-700">
            Gedeelde vermogens <span className="text-xs font-normal text-gray-400">(uit stap 2)</span>
            <span className="ml-2 text-xs font-normal text-gray-400">· {vermogenClusters.length} clusters</span>
          </h5>
          <div className="space-y-3">
            {vermogenClusters.map((cluster, idx) => {
              const key = cluster.items.map((it) => it.id).sort().join(",");
              const isMerged = mergedCapClusters.has(key);
              const sharedId = mergedCapClusters.get(key);
              const isReviewed = reviewedClusters.has(key);

              return (
                <ClusterCard
                  key={idx}
                  cluster={cluster}
                  type="vermogen"
                  onMerge={handleMergeCapabilities}
                  isMerged={isMerged}
                  onUndo={handleUndoMergeCap}
                  sharedId={sharedId}
                  onReview={() => handleReviewCluster(key)}
                  isReviewed={isReviewed}
                  readOnly={false}
                />
              );
            })}
          </div>
        </div>
      )}

      {/* Inspanning clusters section */}
      {inspanningClusters.length > 0 && (
        <div className="space-y-3">
          <h5 className="text-sm font-semibold text-indigo-700">
            Gedeelde inspanningen <span className="text-xs font-normal text-gray-400">(uit stap 3)</span>
            <span className="ml-2 text-xs font-normal text-gray-400">· {inspanningClusters.length} clusters</span>
          </h5>
          <div className="space-y-3">
            {inspanningClusters.map((cluster, idx) => {
              const key = cluster.items.map((it) => it.id).sort().join(",");
              const isMerged = mergedEffClusters.has(key);
              const sharedId = mergedEffClusters.get(key);
              const isReviewed = reviewedClusters.has(key);

              return (
                <ClusterCard
                  key={idx}
                  cluster={cluster}
                  type="inspanning"
                  onMerge={handleMergeEfforts}
                  isMerged={isMerged}
                  onUndo={handleUndoMergeEff}
                  sharedId={sharedId}
                  onReview={() => handleReviewCluster(key)}
                  isReviewed={isReviewed}
                  readOnly={false}
                />
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
