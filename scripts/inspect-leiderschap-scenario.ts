// Toont scenario-bedragen voor leiderschap-inspanning
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

const supa = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
);
const fmt = (n: number) => `€${Math.round(n).toLocaleString("nl-NL")}`;

async function main() {
  const { data } = await supa
    .from("din_sessions").select("data")
    .eq("id", "d8b97442-ce8f-4134-b2c7-67dc8e3a3f93").maybeSingle();
  if (!data) return;
  const wiz = (data.data as Record<string, unknown>).crossAnalyseWizard as
    | { stepResults?: Record<string, Record<string, unknown>> } | undefined;
  const stap4 = wiz?.stepResults?.stap4 as Record<string, unknown> | undefined;
  const begroting = stap4?.begrotingAdvies as { startJaar?: number; scenarios?: Record<string, { aantalJaren?: number; totaalGeraamdEuro?: number; inspanningen?: Array<Record<string, unknown>> } | null> } | undefined;

  const sk = "advies";
  const sc = begroting?.scenarios?.[sk];
  if (!sc) return;
  console.log(`\n=== Scenario ${sk} (${sc.aantalJaren} jaar) ===`);
  console.log(`Inspanning  | Werkelijk | Verwacht (eenmalig+struct×jaren) | Verschil`);
  for (const insp of sc.inspanningen ?? []) {
    const titel = (insp.inspanningTitel as string) ?? "?";
    const werkelijk = (insp.totaalEuro as number) ?? 0;
    console.log(`${titel.slice(0, 50).padEnd(50)} | ${fmt(werkelijk)}`);
  }
}
main().catch(console.error);
