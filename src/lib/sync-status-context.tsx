"use client";

import { createContext, useContext, useState, useCallback, useEffect, type ReactNode } from "react";
import { isSupabaseConfigured } from "./supabase";
import { drainPendingSaves, getPendingSaveCount } from "./persistence";

type SyncStatus = "synced" | "syncing" | "error" | "offline";

interface SyncStatusValue {
  status: SyncStatus;
  lastSyncTime: Date | null;
  pendingCount: number;
  setSyncing: () => void;
  setSynced: () => void;
  setError: () => void;
}

const SyncStatusContext = createContext<SyncStatusValue | null>(null);

export function useSyncStatus() {
  const ctx = useContext(SyncStatusContext);
  if (!ctx) throw new Error("useSyncStatus moet binnen SyncStatusProvider gebruikt worden");
  return ctx;
}

export function SyncStatusProvider({ children }: { children: ReactNode }) {
  const [status, setStatus] = useState<SyncStatus>(
    isSupabaseConfigured ? "synced" : "offline"
  );
  const [lastSyncTime, setLastSyncTime] = useState<Date | null>(null);
  const [pendingCount, setPendingCount] = useState(0);

  // On mount: drain pending saves from localStorage queue (per D-03)
  useEffect(() => {
    if (!isSupabaseConfigured) return;
    const pending = getPendingSaveCount();
    setPendingCount(pending);
    if (pending > 0) {
      setStatus("syncing");
      drainPendingSaves().then((synced) => {
        const remaining = getPendingSaveCount();
        setPendingCount(remaining);
        if (remaining === 0) {
          setStatus("synced");
          if (synced > 0) setLastSyncTime(new Date());
        } else {
          setStatus("error");
        }
      });
    }
  }, []);

  const setSyncing = useCallback(() => {
    if (!isSupabaseConfigured) return;
    setStatus("syncing");
  }, []);

  const setSynced = useCallback(() => {
    if (!isSupabaseConfigured) return;
    setStatus("synced");
    setLastSyncTime(new Date());
    setPendingCount(getPendingSaveCount());
  }, []);

  const setError = useCallback(() => {
    if (!isSupabaseConfigured) return;
    setStatus("error");
    setPendingCount(getPendingSaveCount());
  }, []);

  return (
    <SyncStatusContext.Provider value={{ status, lastSyncTime, pendingCount, setSyncing, setSynced, setError }}>
      {children}
    </SyncStatusContext.Provider>
  );
}
