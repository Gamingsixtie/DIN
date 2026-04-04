"use client";

import { useState } from "react";

interface ConsolidationActionBarProps {
  itemIds: string[];
  itemCount: number;
  sectorList: string;
  onMerge: (ids: string[]) => void;
  isMerged: boolean;
  onUndo: (sharedId: string) => void;
  sharedId?: string;
  onReview: () => void;
  isReviewed: boolean;
}

export default function ConsolidationActionBar({
  itemIds,
  itemCount,
  sectorList,
  onMerge,
  isMerged,
  onUndo,
  sharedId,
  onReview,
  isReviewed,
}: ConsolidationActionBarProps) {
  const [showConfirm, setShowConfirm] = useState(false);

  if (isMerged && sharedId) {
    return (
      <div className="flex items-center gap-2 mt-3">
        <span className="bg-teal-100 text-teal-700 border border-teal-200 rounded px-1.5 py-0.5 text-[10px] font-semibold">
          Geconsolideerd
        </span>
        <button
          onClick={() => onUndo(sharedId)}
          className="text-xs text-gray-500 hover:text-gray-700 underline transition-colors"
        >
          Ongedaan maken
        </button>
      </div>
    );
  }

  if (isReviewed) {
    return (
      <div className="mt-3 opacity-60">
        <span className="text-xs text-gray-500 italic">Bekeken</span>
      </div>
    );
  }

  if (showConfirm) {
    return (
      <div className="mt-3 p-3 bg-gray-50 rounded-lg border border-gray-200">
        <p className="text-xs text-gray-600 mb-2">
          {itemCount} items worden samengevoegd tot een gedeeld item dat gekoppeld wordt aan {sectorList}. Originele items blijven bewaard.
        </p>
        <div className="flex gap-2">
          <button
            onClick={() => { onMerge(itemIds); setShowConfirm(false); }}
            className="px-3 min-h-[44px] bg-cito-blue text-white rounded-lg text-xs font-semibold hover:bg-cito-blue-light transition-colors"
          >
            Bevestigen
          </button>
          <button
            onClick={() => setShowConfirm(false)}
            className="px-3 min-h-[44px] text-gray-500 text-xs font-semibold hover:text-gray-700 transition-colors"
          >
            Toch niet samenvoegen
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="flex gap-2 mt-3">
      <button
        onClick={() => setShowConfirm(true)}
        className="px-3 min-h-[44px] bg-cito-blue text-white rounded-lg text-xs font-semibold hover:bg-cito-blue-light transition-colors"
      >
        Combineren
      </button>
      <button
        onClick={onReview}
        className="px-3 min-h-[44px] border border-gray-300 text-gray-700 rounded-lg text-xs font-semibold hover:bg-gray-50 transition-colors"
      >
        Afstemmen
      </button>
      <button
        onClick={onReview}
        className="px-3 min-h-[44px] text-gray-500 text-xs font-semibold hover:text-gray-700 transition-colors"
      >
        Apart houden
      </button>
    </div>
  );
}
