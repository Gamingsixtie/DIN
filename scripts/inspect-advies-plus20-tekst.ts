// Quick inspect: dump huidige samenvatting + prioriteitAdvies + jaarlijksBudget
// + aantalJaren voor advies, plus20, optimaal/huidig, min20.
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
    process.env[t.substring(0, e).trim()] = t
      .substring(e + 1)
      .trim()
      .replace(/^["']|["']$/g, "");
  }
}
loadEnvFile(join(process.cwd(), ".env.local"));

async function main() {
  const s = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
  );
  const { data } = await s
    .from("din_sessions")
    .select("data")
    .eq("id", "d8b97442-ce8f-4134-b2c7-67dc8e3a3f93")
    .maybeSingle();
  if (!data) {
    console.error("not found");
    return;
  }
  const sess = data.data as Record<string, unknown>;
  const adv = (((sess.crossAnalyseWizard as Record<string, unknown>)?.stepResults as Record<
    string,
    unknown
  >)?.stap4 as Record<string, unknown>)?.begrotingAdvies as
    | { scenarios?: Record<string, Record<string, unknown> | null> }
    | undefined;
  if (!adv?.scenarios) return;

  for (const sk of Object.keys(adv.scenarios)) {
    const sc = adv.scenarios[sk];
    if (!sc) {
      console.log(`\n=== ${sk}: NULL ===`);
      continue;
    }
    console.log("\n" + "=".repeat(80));
    console.log(`SCENARIO: ${sk}`);
    console.log("=".repeat(80));
    console.log(`aantalJaren        : ${sc.aantalJaren}`);
    console.log(`jaarlijksBudgetEuro: ${sc.jaarlijksBudgetEuro}`);
    console.log(`totaalGeraamdEuro  : ${sc.totaalGeraamdEuro}`);
    console.log(`samenvatting (${(sc.samenvatting as string | undefined)?.length ?? 0} chars):`);
    console.log("  " + (sc.samenvatting ?? "(leeg)"));
    console.log(
      `prioriteitAdvies (${(sc.prioriteitAdvies as string | undefined)?.length ?? 0} chars):`,
    );
    console.log("  " + (sc.prioriteitAdvies ?? "(leeg)"));
  }
}

void main();
