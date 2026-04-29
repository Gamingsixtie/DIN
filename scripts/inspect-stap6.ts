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
  const { data } = await supa.from("din_sessions").select("data, updated_at").eq("id", process.argv[2]).maybeSingle();
  const s = data!.data as Record<string, unknown>;
  console.log("version:", s.version, "updated_at:", data!.updated_at);
  const stap4 = ((s.crossAnalyseWizard as Record<string, unknown>)?.stepResults as Record<string, Record<string, unknown>>)?.stap4;
  const b = stap4?.begrotingAdvies as Record<string, unknown> | undefined;
  if (!b) { console.log("GEEN begrotingAdvies"); return; }
  console.log("\nbegrotingAdvies shape:");
  console.log("  jaarlijksBudgetBasis:", b.jaarlijksBudgetBasis);
  console.log("  cyclusMaanden:", b.cyclusMaanden);
  console.log("  startJaar:", b.startJaar);
  console.log("  vergelijking:", String(b.vergelijking).slice(0, 100));
  const sc = b.scenarios as Record<string, Record<string, unknown> | null>;
  for (const lbl of ["optimaal", "plus20", "min20"]) {
    const s2 = sc[lbl];
    if (!s2) { console.log(`  ${lbl}: NULL`); continue; }
    const insps = s2.inspanningen as Array<Record<string, unknown>>;
    console.log(`  ${lbl}: jaarBudget=${s2.jaarlijksBudgetEuro} jaren=${s2.aantalJaren} inspanningen=${insps?.length} totaalGeraamd=${s2.totaalGeraamdEuro}`);
  }
}
main().catch(e => { console.error(e); process.exit(1); });
