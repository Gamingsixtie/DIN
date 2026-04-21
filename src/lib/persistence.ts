// Dual Persistence — localStorage (sync-first) + Supabase (async)
// Geleerde lessen uit KiB:
// 1. localStorage EERST schrijven (synchronous)
// 2. Deduplicatie van IDs bij AI-hergeneratie

import { supabase, isSupabaseConfigured } from "./supabase";
import type { DINSession } from "./types";

const STORAGE_PREFIX = "din_";

// --- localStorage (synchrone bron van waarheid) ---

export function loadLocal<T>(key: string): T | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = localStorage.getItem(STORAGE_PREFIX + key);
    if (!raw) return null;
    return JSON.parse(raw) as T;
  } catch {
    return null;
  }
}

export function saveLocal<T>(key: string, data: T): boolean {
  if (typeof window === "undefined") return false;
  if (data === null || data === undefined) return false;
  try {
    localStorage.setItem(STORAGE_PREFIX + key, JSON.stringify(data));
    return true;
  } catch (e) {
    console.error(`[persistence] localStorage write failed for ${key}:`, e);
    return false;
  }
}

export function removeLocal(key: string): void {
  if (typeof window === "undefined") return;
  localStorage.removeItem(STORAGE_PREFIX + key);
}

// --- Deduplicatie ---

export function deduplicateById<T extends { id: string }>(items: T[]): T[] {
  const seen = new Set<string>();
  return items.filter((item) => {
    if (seen.has(item.id)) return false;
    seen.add(item.id);
    return true;
  });
}

// --- Retry met exponential backoff (D-11) ---

export async function withRetry<T>(
  fn: () => Promise<T>,
  options: { maxRetries?: number; baseDelay?: number; label?: string } = {}
): Promise<T> {
  const { maxRetries = 3, baseDelay = 500, label = "operation" } = options;
  let lastError: unknown;
  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      return await fn();
    } catch (error) {
      lastError = error;
      if (attempt < maxRetries) {
        const delay = baseDelay * Math.pow(2, attempt); // 500, 1000, 2000ms
        console.error(
          `[persistence] ${label} poging ${attempt + 1} mislukt, retry in ${delay}ms`
        );
        await new Promise((resolve) => setTimeout(resolve, delay));
      }
    }
  }
  throw lastError;
}

// --- Supabase sessie-opslag ---

// Debug log voor sync diagnostiek — zichtbaar in HealthCheck panel
let _lastSyncDebug: string = "";
export function getLastSyncDebug(): string { return _lastSyncDebug; }

export async function saveSessionToSupabase(
  session: DINSession
): Promise<number | false> {
  if (!supabase || !isSupabaseConfigured) {
    _lastSyncDebug = `[${new Date().toLocaleTimeString("nl-NL")}] Skip: Supabase niet geconfigureerd`;
    return false;
  }

  const client = supabase; // TS narrowing: non-null after guard

  try {
    return await withRetry(
      async () => {
        // Lees remote versie — maybeSingle() ipv single() zodat 0 rows geen 406 oplevert
        const { data: remote, error: readError } = await client
          .from("din_sessions")
          .select("data")
          .eq("id", session.id)
          .maybeSingle();

        if (readError) {
          _lastSyncDebug = `[${new Date().toLocaleTimeString("nl-NL")}] Read fout: ${readError.message} (code: ${readError.code})`;
          throw new Error(readError.message);
        }

        const remoteData = remote?.data as DINSession | null;
        const remoteVersion = remoteData?.version ?? 0;
        const localVersion = session.version ?? 0;
        const effortCount = session.efforts?.length ?? 0;

        const nextVersion = Math.max(remoteVersion, localVersion) + 1;

        const { error } = await client
          .from("din_sessions")
          .upsert(
            {
              id: session.id,
              name: session.name,
              data: { ...session, version: nextVersion },
              updated_at: new Date().toISOString(),
            },
            { onConflict: "id" }
          );

        if (error) {
          _lastSyncDebug = `[${new Date().toLocaleTimeString("nl-NL")}] Write fout: ${error.message} (code: ${error.code})`;
          throw new Error(error.message);
        }

        // Sync ALLEEN het versienummer in localStorage
        const current = loadLocal<DINSession>(`session_${session.id}`);
        if (current) {
          current.version = nextVersion;
          saveLocal(`session_${session.id}`, current);
        }

        _lastSyncDebug = `[${new Date().toLocaleTimeString("nl-NL")}] OK v${nextVersion} | ${effortCount} inspanningen | remote was v${remoteVersion}`;
        return nextVersion;
      },
      { maxRetries: 3, label: "saveSession" }
    );
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    _lastSyncDebug = `[${new Date().toLocaleTimeString("nl-NL")}] MISLUKT: ${msg}`;
    console.error("[persistence] Supabase sessie-opslag mislukt na retries:", e);
    return false;
  }
}

export async function loadSessionFromSupabase(
  id: string
): Promise<DINSession | null> {
  if (!supabase) return null;
  try {
    const { data, error } = await supabase
      .from("din_sessions")
      .select("data")
      .eq("id", id)
      .maybeSingle();

    if (error || !data) return null;
    return data.data as DINSession;
  } catch (e) {
    console.error("[persistence] Supabase sessie laden mislukt:", e);
    return null;
  }
}

export async function loadSessionListFromSupabase(): Promise<
  Array<{ id: string; name: string; updatedAt: string }>
> {
  if (!supabase) return [];
  try {
    const { data, error } = await supabase
      .from("din_sessions")
      .select("id, name, updated_at")
      .order("updated_at", { ascending: false });

    if (error || !data) return [];
    return data.map((row) => ({
      id: row.id,
      name: row.name,
      updatedAt: row.updated_at,
    }));
  } catch (e) {
    console.error("[persistence] Supabase sessielijst laden mislukt:", e);
    return [];
  }
}

export async function deleteSessionFromSupabase(
  id: string
): Promise<boolean> {
  if (!supabase) return false;
  try {
    const { error } = await supabase
      .from("din_sessions")
      .delete()
      .eq("id", id);

    if (error) {
      console.error(
        "[persistence] Supabase sessie verwijderen mislukt:",
        error.message
      );
      return false;
    }
    return true;
  } catch (e) {
    console.error("[persistence] Supabase sessie verwijderen exception:", e);
    return false;
  }
}

// --- Persistent pending-saves queue (D-03) ---

const PENDING_SAVES_KEY = "din_pending_saves";

/**
 * Add a session to the pending-saves queue in localStorage.
 * Only stores the LATEST version per session ID (per Pitfall 4 from RESEARCH.md).
 */
export function addPendingSave(session: DINSession): void {
  try {
    const existing: Record<string, DINSession> = JSON.parse(
      localStorage.getItem(PENDING_SAVES_KEY) || "{}"
    );
    existing[session.id] = session;
    localStorage.setItem(PENDING_SAVES_KEY, JSON.stringify(existing));
    console.error(`[persistence] Sessie ${session.id} toegevoegd aan pending-saves queue`);
  } catch (e) {
    console.error("[persistence] Kon pending save niet opslaan:", e);
  }
}

/**
 * Get the number of pending saves (for badge display).
 */
export function getPendingSaveCount(): number {
  try {
    const existing: Record<string, DINSession> = JSON.parse(
      localStorage.getItem(PENDING_SAVES_KEY) || "{}"
    );
    return Object.keys(existing).length;
  } catch {
    return 0;
  }
}

/**
 * Drain all pending saves — retry each one via saveSessionToSupabase.
 * Called on app startup / when Supabase becomes reachable.
 * Returns number of successfully synced sessions.
 */
export async function drainPendingSaves(): Promise<number> {
  if (!isSupabaseConfigured) return 0;
  try {
    const existing: Record<string, DINSession> = JSON.parse(
      localStorage.getItem(PENDING_SAVES_KEY) || "{}"
    );
    const ids = Object.keys(existing);
    if (ids.length === 0) return 0;

    let synced = 0;
    for (const id of ids) {
      const result = await saveSessionToSupabase(existing[id]);
      if (result !== false) {
        delete existing[id];
        synced++;
      }
    }
    // Write back remaining failures (if any)
    localStorage.setItem(PENDING_SAVES_KEY, JSON.stringify(existing));
    if (synced > 0) {
      console.log(`[persistence] ${synced} pending save(s) succesvol gesynct`);
    }
    return synced;
  } catch (e) {
    console.error("[persistence] Fout bij draining pending saves:", e);
    return 0;
  }
}

// --- Health check (D-10, gebruikt door Plan 03) ---

export async function checkSupabaseHealth(): Promise<{
  reachable: boolean;
  sessionCount: number;
}> {
  if (!supabase) return { reachable: false, sessionCount: 0 };
  try {
    const { count, error } = await supabase
      .from("din_sessions")
      .select("id", { count: "exact", head: true });
    if (error) return { reachable: false, sessionCount: 0 };
    return { reachable: true, sessionCount: count ?? 0 };
  } catch {
    return { reachable: false, sessionCount: 0 };
  }
}
