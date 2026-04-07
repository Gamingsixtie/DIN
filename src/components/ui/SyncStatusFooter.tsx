"use client";

import { useSyncStatus } from "@/lib/sync-status-context";
import { getLastSyncDebug } from "@/lib/persistence";
import { useState, useEffect } from "react";

const STATUS_CONFIG = {
  synced:  { color: "bg-green-500", label: "Gesynct" },
  syncing: { color: "bg-orange-400 animate-pulse", label: "Synchroniseren..." },
  error:   { color: "bg-red-500", label: "Sync mislukt" },
  offline: { color: "bg-gray-400", label: "Offline modus" },
} as const;

export function SyncStatusFooter() {
  const { status, lastSyncTime, pendingCount } = useSyncStatus();
  const config = STATUS_CONFIG[status];
  const [debugLog, setDebugLog] = useState("");

  useEffect(() => {
    const interval = setInterval(() => setDebugLog(getLastSyncDebug()), 2000);
    return () => clearInterval(interval);
  }, []);

  return (
    <footer className="fixed bottom-0 inset-x-0 bg-white border-t border-gray-200 px-4 py-2 z-50">
      <div className="flex items-center gap-2 text-xs text-gray-500">
        <span className={`w-2 h-2 rounded-full ${config.color}`} />
        <span className="font-medium text-gray-600">{config.label}</span>
        {pendingCount > 0 && (
          <span className="text-orange-600">({pendingCount} wachtend)</span>
        )}
        {lastSyncTime && (
          <span className="ml-auto text-gray-400">
            Laatste sync: {lastSyncTime.toLocaleTimeString("nl-NL", { hour: "2-digit", minute: "2-digit" })}
          </span>
        )}
      </div>
      {debugLog && (
        <div className="text-[9px] font-mono text-gray-400 mt-0.5 truncate">{debugLog}</div>
      )}
    </footer>
  );
}
