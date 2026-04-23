// Dump EXACT de plus20 begrotingsadvies-input voor de interne-uren-generator
// zodat we kunnen zien of er iets bijzonders is aan plus20 vs optimaal/min20.
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
const sessionId = process.argv[2];

async function main() {
  const { data } = await supa.from("din_sessions").select("data").eq("id", sessionId).maybeSingle();
  if (!data) { console.error("not found"); process.exit(1); }
  const s = data.data as Record<string, unknown>;
  const wiz = s.crossAnalyseWizard as { stepResults?: Record<string, Record<string, unknown>> };
  const stap4 = wiz.stepResults?.stap4;
  if (!stap4) { console.error("geen stap4"); process.exit(1); }

  const begroting = stap4.begrotingAdvies as Record<string, unknown>;
  const scenarios = begroting?.scenarios as Record<string, unknown>;
  if (!scenarios) { console.error("geen scenarios"); process.exit(1); }

  for (const label of ["optimaal", "plus20", "min20"] as const) {
    const sc = scenarios[label] as Record<string, unknown> | null;
    console.log("\n" + "=".repeat(50));
    console.log("SCENARIO:", label);
    console.log("=".repeat(50));
    if (!sc) { console.log("  NULL"); continue; }
    console.log("  aantalJaren:", sc.aantalJaren);
    console.log("  jaarlijksBudgetEuro:", sc.jaarlijksBudgetEuro);
    console.log("  totaalGeraamdEuro:", sc.totaalGeraamdEuro);
    const insps = sc.inspanningen as unknown[] | undefined;
    console.log("  inspanningen count:", insps?.length ?? 0);
    if (insps) {
      for (const i of insps) {
        const ii = i as Record<string, unknown>;
        const vp = ii.verdelingPerJaar as Array<Record<string, unknown>> | undefined;
        console.log(`    [${ii.domein}] "${ii.inspanningTitel}" groepId=${ii.groepId} jaren=${vp?.length ?? 0}`);
        if (vp) {
          for (const v of vp) {
            console.log(`      jaar ${v.jaar}: €${v.euro} fase="${v.fase}" act="${(v.activiteit as string | undefined)?.slice(0, 40) ?? ""}"`);
          }
        }
      }
    }
    // Lengte van serialisatie — indicatie voor input-token-grootte van AI-call
    const jsonLen = JSON.stringify(sc).length;
    console.log("  JSON size:", jsonLen, "chars (~", Math.round(jsonLen / 4), "tokens)");
  }

  // Ook: aantal toegestane functies per domein
  const stap7 = stap4.stap7InterneUren as Record<string, unknown> | undefined;
  if (stap7) {
    const sel = stap7.selectiePerDomein as Record<string, string[]> | undefined;
    const cust = stap7.customFunctiesPerDomein as Record<string, unknown[]> | undefined;
    console.log("\n" + "=".repeat(50));
    console.log("STAP7 SELECTIE PER DOMEIN:");
    console.log("=".repeat(50));
    for (const d of ["cultuur", "mens", "data_systemen", "processen"]) {
      const stdCount = sel?.[d]?.length ?? 0;
      const custCount = cust?.[d]?.length ?? 0;
      console.log(`  ${d}: ${stdCount} standaard + ${custCount} custom = ${stdCount + custCount} totaal`);
    }
  }

  // vastgesteldeUrenPerInspanning?
  const vast = stap7?.vastgesteldeUrenPerInspanning as unknown[] | undefined;
  console.log("\nvastgesteldeUrenPerInspanning entries:", vast?.length ?? 0);
}
main().catch((e) => { console.error(e); process.exit(1); });
