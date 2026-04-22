// Probeer een echte write naar Supabase met de huidige sessie-data + extra dummy.
// Als de payload te groot is of RLS blokkeert, zien we dat in de response.
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

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
const sessionId = process.argv[2];
if (!sessionId) { console.error("Usage: tsx scripts/test-save-size.ts <sessionId>"); process.exit(1); }

const supa = createClient(SUPABASE_URL, KEY);

async function main() {
  const { data, error } = await supa.from("din_sessions").select("data, name").eq("id", sessionId).maybeSingle();
  if (error || !data) { console.error(error?.message ?? "not found"); process.exit(1); }

  const s = data.data as Record<string, unknown>;
  const sizeKB = Math.round(JSON.stringify(s).length / 1024);
  console.log("Huidige payload size:", sizeKB, "KB");
  console.log("Version:", s.version);

  // Probeer een write met marker
  const newVersion = ((s.version as number) || 0) + 1;
  const payload = { ...s, version: newVersion, _diagMarker: new Date().toISOString() };
  const newSizeKB = Math.round(JSON.stringify(payload).length / 1024);
  console.log("Nieuwe payload size:", newSizeKB, "KB");

  const t0 = Date.now();
  const { error: writeError } = await supa.from("din_sessions").upsert({
    id: sessionId,
    name: data.name,
    data: payload,
    updated_at: new Date().toISOString(),
  }, { onConflict: "id" });
  const dt = Date.now() - t0;

  if (writeError) {
    console.log("WRITE FOUT:", writeError.message);
    console.log("Code:", writeError.code);
    console.log("Hint:", writeError.hint);
    console.log("Details:", writeError.details);
  } else {
    console.log("WRITE OK in", dt, "ms");
  }

  // Verify
  const { data: v } = await supa.from("din_sessions").select("data, updated_at").eq("id", sessionId).maybeSingle();
  console.log("Verify: version =", (v?.data as Record<string, unknown>)?.version, "updated_at =", v?.updated_at);
  console.log("Diag marker:", (v?.data as Record<string, unknown>)?._diagMarker);
}
main().catch((e) => { console.error(e); process.exit(1); });
