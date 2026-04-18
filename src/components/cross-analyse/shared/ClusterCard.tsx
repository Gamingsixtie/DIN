"use client";

import { useState } from "react";
import type { VermogenClusterItem, InspanningClusterItem } from "@/lib/types";
import SectorBadge from "./SectorBadge";
import ConsolidationActionBar from "./ConsolidationActionBar";

interface ClusterCardProps {
  cluster: VermogenClusterItem | InspanningClusterItem;
  type: "vermogen" | "inspanning";
  onMerge: (ids: string[]) => void;
  isMerged: boolean;
  onUndo: (sharedId: string) => void;
  sharedId?: string;
  onReview: () => void;
  isReviewed: boolean;
  readOnly?: boolean;
  afstemmingsStappen?: string[];
  onGenerateAdvice?: () => Promise<string[]>;
  // Phase 17 Wave 3 — Herzie-advies + Vereist review
  onHerzieAdvies?: (userContext: string) => Promise<void>;
  isHerzienLoading?: boolean;
  savedContext?: string;
  requiresReview?: boolean;
}

// Phase 17: Inline Herzie-advies input (context textarea + submit button)
function HerzieAdviesInput({
  onSubmit,
  isLoading,
}: {
  onSubmit: (context: string) => Promise<void>;
  isLoading: boolean;
}) {
  const [context, setContext] = useState("");
  return (
    <div className="flex flex-col gap-2">
      <textarea
        value={context}
        onChange={(e) => setContext(e.target.value)}
        disabled={isLoading}
        placeholder="Voeg context toe voor een herzien advies (bv. focus op data-domein)..."
        className="w-full text-xs border border-gray-300 rounded p-2 disabled:opacity-50"
        rows={2}
      />
      <button
        onClick={async () => {
          await onSubmit(context);
        }}
        disabled={isLoading}
        className="self-start text-xs px-3 py-1 rounded bg-teal-600 text-white hover:bg-teal-700 disabled:opacity-50 flex items-center gap-1"
      >
        {isLoading ? (
          <>
            <svg className="animate-spin w-3 h-3" viewBox="0 0 24 24" fill="none">
              <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" className="opacity-25" />
              <path d="M4 12a8 8 0 018-8" stroke="currentColor" strokeWidth="4" fill="none" />
            </svg>
            Bezig...
          </>
        ) : (
          "Herzie advies"
        )}
      </button>
    </div>
  );
}

export default function ClusterCard({
  cluster,
  type,
  onMerge,
  isMerged,
  onUndo,
  sharedId,
  onReview,
  isReviewed,
  readOnly = false,
  afstemmingsStappen,
  onGenerateAdvice,
  onHerzieAdvies,
  isHerzienLoading,
  savedContext,
  requiresReview,
}: ClusterCardProps) {
  const borderColor = type === "vermogen" ? "border-l-teal-400" : "border-l-indigo-400";
  const itemIds = cluster.items.map(item => item.id);
  const sectorList = [...new Set(cluster.items.map(item => item.sector))].join(", ");

  return (
    <div className={`bg-white border border-gray-200 border-l-4 ${borderColor} rounded-lg p-4 ${isReviewed && !isMerged ? "opacity-60" : ""}`}>
      <div className="text-sm font-semibold text-gray-800">{cluster.clusterTitel}</div>
      <p className="text-xs text-gray-500 italic mt-1">{cluster.advies}</p>

      <div className="mt-3 space-y-2">
        {cluster.items.map((item) => (
          <div key={item.id} className="flex items-start gap-2">
            <span className="w-1.5 h-1.5 rounded-full bg-gray-400 mt-1.5 shrink-0" />
            <div className="flex-1 min-w-0">
              <span className="text-xs text-gray-700">{item.beschrijving}</span>
              <div className="flex gap-1 mt-0.5">
                <SectorBadge sector={item.sector} />
                {"domein" in item && item.domein && (
                  <span className="inline-block px-1.5 py-0.5 rounded text-[10px] font-medium border bg-gray-100 text-gray-600 border-gray-200">
                    {item.domein}
                  </span>
                )}
              </div>
            </div>
          </div>
        ))}
      </div>

      {cluster.batenContext.length > 0 && (
        <div className="mt-3 flex flex-wrap items-center gap-1">
          <span className="text-[10px] text-gray-400">Draagt bij aan:</span>
          {cluster.batenContext.map((bc, i) => (
            <span key={i} className="text-[10px] bg-din-baten/10 text-din-baten px-1.5 py-0.5 rounded font-medium">
              {bc.sector}: {bc.baat}
            </span>
          ))}
        </div>
      )}

      {!readOnly && (
        <ConsolidationActionBar
          itemIds={itemIds}
          itemCount={cluster.items.length}
          sectorList={sectorList}
          onMerge={onMerge}
          isMerged={isMerged}
          onUndo={onUndo}
          sharedId={sharedId}
          onReview={onReview}
          isReviewed={isReviewed}
          afstemmingsStappen={afstemmingsStappen}
          onGenerateAdvice={onGenerateAdvice}
          onHerzieAdvies={onHerzieAdvies}
        />
      )}

      {/* Phase 17 Wave 3 — Vereist review badge (auto-apply failure) */}
      {requiresReview && (
        <div
          className="border-l-4 border-red-500 bg-red-50 px-3 py-2 my-2 rounded"
          data-testid="requires-review-badge"
        >
          <p className="text-xs font-semibold text-red-700">Vereist review</p>
          <p className="text-[11px] text-red-600">
            Auto-apply kon dit cluster niet veilig samenvoegen — bekijk het advies en pas handmatig aan.
          </p>
        </div>
      )}

      {/* Phase 17 Wave 3 — Herzie-advies sectie (D-19) */}
      {onHerzieAdvies && !readOnly && (
        <div
          className="mt-3 border-t border-gray-200 pt-3"
          data-testid="herzie-advies-section"
        >
          {savedContext && (
            <p className="text-[11px] text-gray-600 mb-2 italic">
              <span className="font-semibold">Herzien met context:</span> {savedContext}
            </p>
          )}
          <HerzieAdviesInput
            onSubmit={onHerzieAdvies}
            isLoading={isHerzienLoading ?? false}
          />
        </div>
      )}
    </div>
  );
}
