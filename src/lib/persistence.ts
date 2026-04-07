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

export async function saveSessionToSupabase(
  session: DINSession
): Promise<boolean> {
  if (!supabase || !isSupabaseConfigured) return false;

  const client = supabase; // TS narrowing: non-null after guard

  try {
    return await withRetry(
      async () => {
        // Lees remote versie
        const { data: remote } = await client
          .from("din_sessions")
          .select("data")
          .eq("id", session.id)
          .single();

        const remoteData = remote?.data as DINSession | null;
        const remoteVersion = remoteData?.version ?? 0;
        const localVersion = session.version ?? 0;

        // D-08: version counter is primary lock; D-04: updatedAt tiebreaker for equal versions; D-05: single-device single-writer model
        if (remoteVersion > localVersion) {
          console.error(
            "[persistence] Remote versie is nieuwer, skip write"
          );
          return false;
        }

        if (remoteVersion === localVersion && remoteData) {
          const remoteUpdatedAt = remoteData.updatedAt;
          if (
            remoteUpdatedAt &&
            session.updatedAt &&
            remoteUpdatedAt > session.updatedAt
          ) {
            console.error(
              "[persistence] Versies gelijk maar remote updatedAt is nieuwer, skip write"
            );
            return false;
          }
        }

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
          throw new Error(error.message);
        }

        return true;
      },
      { maxRetries: 3, label: "saveSession" }
    );
  } catch (e) {
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
      .single();

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
