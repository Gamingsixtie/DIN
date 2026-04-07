// Dual Persistence — localStorage (sync-first) + Supabase (async)
// Geleerde lessen uit KiB:
// 1. localStorage EERST schrijven (synchronous)
// 2. Deduplicatie van IDs bij AI-hergeneratie

import { supabase } from "./supabase";
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

// --- Dual persist: localStorage eerst, dan Supabase ---

export async function dualSave<T>(
  key: string,
  data: T,
  supabaseSave?: (data: T) => Promise<void>
): Promise<boolean> {
  // Stap 1: localStorage EERST (sync)
  const localSuccess = saveLocal(key, data);

  // Stap 2: Supabase (async, mag falen)
  if (supabaseSave) {
    try {
      await supabaseSave(data);
    } catch (e) {
      console.error(`[persistence] Supabase write failed for ${key}:`, e);
    }
  }

  return localSuccess;
}

export async function dualLoad<T>(
  key: string,
  supabaseLoad?: () => Promise<T | null>
): Promise<T | null> {
  // localStorage is bron van waarheid tijdens sessie
  const local = loadLocal<T>(key);
  if (local !== null) return local;

  // Fallback naar Supabase
  if (supabaseLoad) {
    try {
      const remote = await supabaseLoad();
      if (remote !== null) {
        saveLocal(key, remote); // Cache lokaal
      }
      return remote;
    } catch (e) {
      console.error(`[persistence] Supabase read failed for ${key}:`, e);
    }
  }

  return null;
}

// --- Supabase sessie-opslag ---

export async function saveSessionToSupabase(session: DINSession): Promise<boolean> {
  try {
    const { error } = await supabase
      .from("din_sessions")
      .upsert({
        id: session.id,
        name: session.name,
        data: session,
        updated_at: new Date().toISOString(),
      }, { onConflict: "id" });

    if (error) {
      console.error("[persistence] Supabase sessie-opslag mislukt:", error.message);
      return false;
    }
    return true;
  } catch (e) {
    console.error("[persistence] Supabase sessie-opslag exception:", e);
    return false;
  }
}

export async function loadSessionFromSupabase(id: string): Promise<DINSession | null> {
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

export async function loadSessionListFromSupabase(): Promise<Array<{ id: string; name: string; updatedAt: string }>> {
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

export async function deleteSessionFromSupabase(id: string): Promise<boolean> {
  try {
    const { error } = await supabase
      .from("din_sessions")
      .delete()
      .eq("id", id);

    if (error) {
      console.error("[persistence] Supabase sessie verwijderen mislukt:", error.message);
      return false;
    }
    return true;
  } catch (e) {
    console.error("[persistence] Supabase sessie verwijderen exception:", e);
    return false;
  }
}
