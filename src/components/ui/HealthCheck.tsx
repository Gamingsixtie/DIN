"use client";

import { useState, useEffect } from "react";
import { checkSupabaseHealth, getLastSyncDebug, loadLocal, loadSessionFromSupabase } from "@/lib/persistence";
import { isSupabaseConfigured } from "@/lib/supabase";
import { useSyncStatus } from "@/lib/sync-status-context";
import type { DINSession } from "@/lib/types";

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

      {/* Diagnostiek */}
      <SessionDiagnostics />
    </div>
  );
}

interface DiagInfo {
  id: string;
  name: string;
  local: { efforts: number; benefits: number; capabilities: number; version: number; updatedAt: string } | null;
  remote: { efforts: number; benefits: number; capabilities: number; version: number; updatedAt: string } | null;
}

function SessionDiagnostics() {
  const [diag, setDiag] = useState<DiagInfo[]>([]);
  const [loading, setLoading] = useState(false);
  const [show, setShow] = useState(false);

  async function runDiag() {
    setLoading(true);
    setShow(true);
    const list = loadLocal<string[]>("session_list") || [];
    const results: DiagInfo[] = [];

    for (const id of list) {
      const local = loadLocal<DINSession>(`session_${id}`);
      const remote = await loadSessionFromSupabase(id);
      results.push({
        id,
        name: local?.name || remote?.name || "?",
        local: local ? {
          efforts: local.efforts?.length ?? 0,
          benefits: local.benefits?.length ?? 0,
          capabilities: local.capabilities?.length ?? 0,
          version: local.version ?? 0,
          updatedAt: local.updatedAt || "?",
        } : null,
        remote: remote ? {
          efforts: remote.efforts?.length ?? 0,
          benefits: remote.benefits?.length ?? 0,
          capabilities: remote.capabilities?.length ?? 0,
          version: remote.version ?? 0,
          updatedAt: remote.updatedAt || "?",
        } : null,
      });
    }
    setDiag(results);
    setLoading(false);
  }

  return (
    <div className="mt-3 border-t border-gray-100 pt-3">
      <button
        onClick={runDiag}
        disabled={loading}
        className="text-xs px-3 py-1.5 bg-gray-100 hover:bg-gray-200 rounded font-medium text-gray-600 transition-colors"
      >
        {loading ? "Controleren..." : "Sessie-diagnostiek"}
      </button>

      {show && diag.length === 0 && !loading && (
        <p className="text-xs text-gray-400 mt-2">Geen sessies in localStorage gevonden.</p>
      )}

      {diag.map((d) => (
        <div key={d.id} className="mt-2 p-2 bg-gray-50 border border-gray-100 rounded text-[10px] font-mono space-y-1">
          <div className="font-semibold text-gray-700">{d.name} <span className="text-gray-400">({d.id.slice(0, 8)}...)</span></div>
          <div className="grid grid-cols-2 gap-2">
            <div>
              <div className="font-semibold text-blue-600 mb-0.5">localStorage</div>
              {d.local ? (
                <>
                  <div>Baten: {d.local.benefits} | Vermogens: {d.local.capabilities} | Inspanningen: {d.local.efforts}</div>
                  <div>Versie: {d.local.version} | Updated: {new Date(d.local.updatedAt).toLocaleString("nl-NL")}</div>
                </>
              ) : <div className="text-red-500">NIET GEVONDEN</div>}
            </div>
            <div>
              <div className="font-semibold text-purple-600 mb-0.5">Supabase</div>
              {d.remote ? (
                <>
                  <div>Baten: {d.remote.benefits} | Vermogens: {d.remote.capabilities} | Inspanningen: {d.remote.efforts}</div>
                  <div>Versie: {d.remote.version} | Updated: {new Date(d.remote.updatedAt).toLocaleString("nl-NL")}</div>
                </>
              ) : <div className="text-gray-400">Niet in Supabase</div>}
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}
