// Restore session from backup
import { createClient } from "@supabase/supabase-js";
import { readFileSync, existsSync } from "fs";
import { join } from "path";

function loadEnvFile(p: string) {
  if (!existsSync(p)) return;
  const c = readFileSync(p, "utf-8");
  for (const l of c.split(/\r?\n/)) {
    const t = l.trim();
    if (!t || t.startsWith("#")) continue;
    const e = t.indexOf("=");
    if (e === -1) continue;
    process.env[t.substring(0, e).trim()] = t.substring(e + 1).trim().replace(/^["']|["']$/g, "");
  }
}
loadEnvFile(join(process.cwd(), ".env.local"));

async function main() {
  const backupPath = process.argv[2];
  if (!backupPath) {
    console.error("Usage: npx tsx scripts/restore-from-backup.ts <backup-path>");
    process.exit(1);
  }
  const data = JSON.parse(readFileSync(backupPath, "utf-8"));
  const supa = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
  );
  const { error } = await supa
    .from("din_sessions")
    .update({ data })
    .eq("id", "d8b97442-ce8f-4134-b2c7-67dc8e3a3f93");
  if (error) {
    console.error("Restore failed:", error);
    process.exit(1);
  }
  console.log(`✓ Restored from ${backupPath}`);
}

void main();
