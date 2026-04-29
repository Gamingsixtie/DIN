// Zet een backup-bestand integraal terug in Supabase voor de gegeven sessie.
// Gebruik wanneer je verdacht dataverlies ziet en een eerder bewaarde
// snapshot moet herstellen. De versie wordt op de bestaande Supabase versie
// + 1 gezet zodat client-syncs het als 'nieuwer' accepteren.
//
// Gebruik:
//   npx tsx scripts/restore-session.ts <sessionId> <backup-file.json>
//
// Voorbeeld:
//   npx tsx scripts/restore-session.ts d8b97442-ce8f-4134-b2c7-67dc8e3a3f93 \
//     backups/session-d8b97442-FULL-2026-04-29_20-53-23.json

import { createClient } from "@supabase/supabase-js";
import { readFileSync, existsSync } from "fs";
import { join } from "path";

function loadEnvFile(path: string) {
  if (!existsSync(path)) return;
  const content = readFileSync(path, "utf-8");
  for (const line of content.split(/\r?\n/)) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const eq = trimmed.indexOf("=");
    if (eq === -1) continue;
    const key = trimmed.substring(0, eq).trim();
    const val = trimmed.substring(eq + 1).trim().replace(/^["']|["']$/g, "");
    if (!process.env[key]) process.env[key] = val;
  }
}
loadEnvFile(join(process.cwd(), ".env.local"));
loadEnvFile(join(process.cwd(), ".env"));

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SUPABASE_ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const sessionId = process.argv[2];
const backupFile = process.argv[3];

if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
  console.error("Ontbrekende env vars NEXT_PUBLIC_SUPABASE_URL / NEXT_PUBLIC_SUPABASE_ANON_KEY");
  process.exit(1);
}
if (!sessionId || !backupFile) {
  console.error("Gebruik: npx tsx scripts/restore-session.ts <sessionId> <backup-file.json>");
  process.exit(1);
}
if (!existsSync(backupFile)) {
  console.error("Backup-bestand niet gevonden:", backupFile);
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

async function main() {
  const backupRaw = readFileSync(backupFile, "utf-8");
  const backup = JSON.parse(backupRaw) as Record<string, unknown>;

  if (backup.id !== sessionId) {
    console.error(`Sessie-ID mismatch: backup.id = ${backup.id}, opgegeven = ${sessionId}`);
    process.exit(1);
  }

  // Haal huidige versie uit Supabase
  const { data: current, error: readErr } = await supabase
    .from("din_sessions")
    .select("data, updated_at")
    .eq("id", sessionId)
    .maybeSingle();

  if (readErr) {
    console.error("Supabase fout bij lezen:", readErr.message);
    process.exit(1);
  }

  const currentVersion = (current?.data as Record<string, unknown> | undefined)?.version as number | undefined;
  const backupVersion = backup.version as number | undefined;

  console.log("=== RESTORE ===");
  console.log("Sessie:", sessionId);
  console.log("Backup-bestand:", backupFile);
  console.log("Backup-versie:", backupVersion);
  console.log("Huidige Supabase-versie:", currentVersion ?? "(geen)");

  // Forceer hogere versie zodat clients de restore accepteren
  const newVersion = Math.max(backupVersion ?? 0, currentVersion ?? 0) + 1;
  backup.version = newVersion;
  backup.updatedAt = new Date().toISOString();

  console.log("Nieuwe versie:", newVersion);

  const { error: writeErr } = await supabase
    .from("din_sessions")
    .upsert({ id: sessionId, data: backup });

  if (writeErr) {
    console.error("Supabase fout bij schrijven:", writeErr.message);
    process.exit(1);
  }

  console.log("\n✅ Restore voltooid. Browser-tabs op din-kappa.vercel.app moeten:");
  console.log("   1. Hard refresh (Ctrl+Shift+R) — anders winnen lokale wijzigingen.");
  console.log("   2. localStorage cachet de oude versie. Open DevTools Console en run:");
  console.log("      localStorage.removeItem('din_session_" + sessionId + "'); location.reload();");
}

main().catch((e) => {
  console.error(e instanceof Error ? e.message : e);
  process.exit(1);
});
