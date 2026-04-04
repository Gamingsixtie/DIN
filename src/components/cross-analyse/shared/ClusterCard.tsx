"use client";

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
        />
      )}
    </div>
  );
}
