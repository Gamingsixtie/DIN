// Inspect huidige vergelijkings-tekst in begrotingAdvies
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
    const k = t.substring(0, e).trim();
    const v = t.substring(e + 1).trim().replace(/^["']|["']$/g, "");
    if (!process.env[k]) process.env[k] = v;
  }
}
loadEnvFile(join(process.cwd(), ".env.local"));

const supa = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
);

const SESSION_ID = "d8b97442-ce8f-4134-b2c7-67dc8e3a3f93";

async function main() {
  const { data, error } = await supa
    .from("din_sessions")
    .select("data")
    .eq("id", SESSION_ID)
    .maybeSingle();
  if (error) {
    console.error("ERR:", error);
    return;
  }
  if (!data) {
    console.error("NO DATA");
    return;
  }
  const root = data.data as any;
  const beg = root?.crossAnalyseWizard?.stepResults?.stap4?.begrotingAdvies;
  if (!beg) {
    console.error("Geen begrotingAdvies gevonden");
    return;
  }
  console.log("begrotingAdvies keys:", Object.keys(beg));
  console.log("---");
  console.log("vergelijking:");
  console.log(beg.vergelijking ?? "(leeg)");
  console.log("---");
  // Scenario totalen ter validatie
  const scenarios = beg.scenarios ?? {};
  for (const k of Object.keys(scenarios)) {
    const sc = scenarios[k];
    if (!sc) continue;
    console.log(`\n[${k}] keys:`, Object.keys(sc));
    if (sc.totaalEuro !== undefined) console.log(`  totaalEuro: ${sc.totaalEuro}`);
    if (sc.aantalJaren !== undefined) console.log(`  aantalJaren: ${sc.aantalJaren}`);
    if (sc.jaarlijksBudgetEuro !== undefined)
      console.log(`  jaarlijksBudgetEuro: ${sc.jaarlijksBudgetEuro}`);
  }
}
main().catch((e) => console.error("Caught:", e));
