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

const supa = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!);

async function main() {
  const { data } = await supa.from("din_sessions")
    .select("id, name, updated_at, data")
    .order("updated_at", { ascending: false })
    .limit(15);

  for (const row of data ?? []) {
    const s = row.data as Record<string, unknown>;
    const wiz = s.crossAnalyseWizard as { stepResults?: Record<string, Record<string, unknown>> } | undefined;
    const stap4 = wiz?.stepResults?.stap4;
    const hasBegroting = !!stap4?.begrotingAdvies;
    const hasStap7 = !!stap4?.stap7InterneUren;
    console.log(`${row.updated_at} | v${s.version} | begroting=${hasBegroting ? "Y" : "-"} | stap7=${hasStap7 ? "Y" : "-"} | ${row.id.slice(0, 8)} | ${row.name}`);
  }
}
main().catch((e) => { console.error(e); process.exit(1); });
