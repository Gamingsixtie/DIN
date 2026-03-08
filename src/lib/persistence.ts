// Dual Persistence — localStorage (sync-first) + Supabase (async)
// Geleerde lessen uit KiB:
// 1. localStorage EERST schrijven (synchronous)
// 2. Nooit lege state opslaan
// 3. Deduplicatie van IDs bij AI-hergeneratie

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

export function saveLocal<T>(key: string, data: T): void {
  if (typeof window === "undefined") return;
  // Nooit lege state opslaan
  if (data === null || data === undefined) return;
  if (Array.isArray(data) && data.length === 0) return;
  try {
    localStorage.setItem(STORAGE_PREFIX + key, JSON.stringify(data));
  } catch (e) {
    console.error(`[persistence] localStorage write failed for ${key}:`, e);
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
): Promise<void> {
  // Stap 1: localStorage EERST (sync)
  saveLocal(key, data);

  // Stap 2: Supabase (async, mag falen)
  if (supabaseSave) {
    try {
      await supabaseSave(data);
    } catch (e) {
      console.error(`[persistence] Supabase write failed for ${key}:`, e);
    }
  }
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
