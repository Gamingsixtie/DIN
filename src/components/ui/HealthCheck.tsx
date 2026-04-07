"use client";

import { useState, useEffect } from "react";
import { checkSupabaseHealth, getLastSyncDebug } from "@/lib/persistence";
import { isSupabaseConfigured } from "@/lib/supabase";
import { useSyncStatus } from "@/lib/sync-status-context";

export function HealthCheck() {
  const { lastSyncTime, status } = useSyncStatus();
  const [health, setHealth] = useState<{ reachable: boolean; sessionCount: number } | null>(null);
  const [debugLog, setDebugLog] = useState("");

  useEffect(() => {
    if (!isSupabaseConfigured) return;
    checkSupabaseHealth().then(setHealth);
    // Poll debug log elke 2 seconden
    const interval = setInterval(() => {
      setDebugLog(getLastSyncDebug());
    }, 2000);
    return () => clearInterval(interval);
  }, []);

  // Determine dot color for reachability
  const reachDot = !isSupabaseConfigured
    ? "bg-gray-400"
    : health === null
    ? "bg-gray-300 animate-pulse"
    : health.reachable
    ? "bg-green-500"
    : "bg-red-500";

  const reachLabel = !isSupabaseConfigured ? "Niet geconfigureerd" : "";

  return (
    <div className="mt-6 bg-white rounded-lg border border-gray-200 p-4">
      <h3 className="text-xs font-medium text-gray-500 mb-3">Verbindingsstatus</h3>
      <div className="flex items-center gap-6">
        {/* Bereikbaarheid */}
        <div className="flex items-center gap-2">
          <span className={`w-2 h-2 rounded-full ${reachDot}`} />
          <span className="text-xs font-medium text-gray-500">Supabase</span>
          {reachLabel && <span className="text-xs text-gray-400">{reachLabel}</span>}
        </div>

        {/* Sessie-count */}
        <div className="flex items-center gap-2">
          <span className="text-xs font-medium text-gray-500">Sessies in cloud</span>
          <span className="text-sm text-gray-700">
            {!isSupabaseConfigured ? "\u2014" : health === null ? "..." : String(health.sessionCount)}
          </span>
        </div>

        {/* Laatste sync */}
        <div className="flex items-center gap-2">
          <span className="text-xs font-medium text-gray-500">Laatste sync</span>
          <span className="text-sm text-gray-700">
            {lastSyncTime
              ? lastSyncTime.toLocaleTimeString("nl-NL", { hour: "2-digit", minute: "2-digit" })
              : "Nooit"}
          </span>
        </div>

        {/* Sync status */}
        <div className="flex items-center gap-2">
          <span className="text-xs font-medium text-gray-500">Status</span>
          <span className={`text-xs px-1.5 py-0.5 rounded ${
            status === "synced" ? "bg-green-100 text-green-700" :
            status === "syncing" ? "bg-orange-100 text-orange-700" :
            status === "error" ? "bg-red-100 text-red-700" :
            "bg-gray-100 text-gray-500"
          }`}>{status}</span>
        </div>
      </div>

      {/* Debug log */}
      {debugLog && (
        <div className="mt-2 px-2 py-1 bg-gray-50 border border-gray-100 rounded text-[10px] font-mono text-gray-600">
          {debugLog}
        </div>
      )}
    </div>
  );
}
