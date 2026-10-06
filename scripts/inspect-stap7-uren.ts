// Inspect stap 7 vastgestelde uren — toont per inspanning per rol het uren-totaal
// dat is opgegeven via Q&A-flow. Doel: zien WAAROM het totaal zo hoog is.
//
// Usage: npx tsx scripts/inspect-stap7-uren.ts <sessie-id>

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

const supa = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

async function main() {
  const sessionId = process.argv[2];
  const { data } = await supa.from("din_sessions").select("data").eq("id", sessionId).maybeSingle();
  const s = data!.data as Record<string, unknown>;
  const stap4 = ((s.crossAnalyseWizard as Record<string, unknown>)?.stepResults as Record<string, Record<string, unknown>>)?.stap4;
  const stap7 = stap4?.stap7InterneUren as Record<string, unknown> | undefined;
  if (!stap7) {
    console.log("Geen stap7-data");
    return;
  }

  // 1. vastgesteldeUrenPerInspanning (de Q&A-output)
  const vastgesteld = stap7.vastgesteldeUrenPerInspanning as Array<{
    groepId: string;
    inspanningTitel: string;
    domein: string;
    rollen: Array<{ functieNaam: string; functieId: string; urenTotaal: number; onderbouwing?: string }>;
  }> | undefined;

  if (vastgesteld) {
    console.log("=== VASTGESTELDE UREN PER INSPANNING (uit Q&A) ===\n");
    let grandTotaal = 0;
    let aantalRollen = 0;
    for (const insp of vastgesteld) {
      console.log(`[${insp.domein}] ${insp.inspanningTitel}`);
      let inspTotaal = 0;
      for (const r of insp.rollen) {
        console.log(`  - ${r.functieNaam}: ${r.urenTotaal}u`);
        inspTotaal += r.urenTotaal;
        aantalRollen++;
      }
      console.log(`  → subtotaal inspanning: ${inspTotaal}u\n`);
      grandTotaal += inspTotaal;
    }
    console.log(`=== TOTAAL: ${grandTotaal}u over ${vastgesteld.length} inspanningen, ${aantalRollen} rol-toewijzingen ===\n`);
  } else {
    console.log("Geen vastgesteldeUrenPerInspanning (Q&A nog niet doorlopen)");
  }

  // 2. Selectie per domein (welke functies zijn aangewezen + aantal personen)
  const selectie = stap7.selectiePerDomein as Record<string, Record<string, { aantal: number; urenPerJaar?: number }>> | undefined;
  if (selectie) {
    console.log("\n=== GESELECTEERDE FUNCTIES PER DOMEIN (aantal personen) ===\n");
    for (const [domein, functies] of Object.entries(selectie)) {
      const ids = Object.keys(functies);
      if (ids.length === 0) continue;
      console.log(`[${domein}]`);
      for (const [id, input] of Object.entries(functies)) {
        console.log(`  - ${id}: ${input.aantal} ${input.aantal === 1 ? "persoon" : "personen"}${input.urenPerJaar ? ` × ${input.urenPerJaar}u/jaar = ${input.aantal * input.urenPerJaar}u/jaar (max)` : ""}`);
      }
    }
  }

  // 3. Scenario-totalen (wat AI heeft uitgespuugd na guard)
  console.log("\n\n=== SCENARIO-TOTALEN (na vol-werklast guard) ===\n");
  const scenarios = stap7.scenarios as Record<string, { totaalUren?: number; totaalKosten?: number; aantalJaren?: number } | null>;
  for (const [lbl, sc] of Object.entries(scenarios)) {
    if (!sc) continue;
    console.log(`  ${lbl}: ${sc.totaalUren?.toLocaleString("nl-NL")}u over ${sc.aantalJaren} jaar (= €${sc.totaalKosten?.toLocaleString("nl-NL")} kosten)`);
  }
}
main().catch((e) => { console.error(e); process.exit(1); });
