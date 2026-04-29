// Dry-run: simuleer de NIEUWE begroting-advies server-logica op een sessie,
// ZONDER de AI-call te doen. Toont per scenario: aantalJaren, totaal-budget,
// dossier-totalen per inspanning, en of het budget-advies banner getoond zou worden.
//
// Gebruik: npx tsx scripts/dry-run-begroting-logica.ts <sessie-id>

import { createClient } from "@supabase/supabase-js";
import { readFileSync, existsSync } from "fs";
import { join } from "path";
import {
  parseDossierRaming,
  berekenMinimumJaren,
  totaalBenodigdBudget,
  budgetAdvies,
} from "../src/lib/dossier-parser";

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
  if (!sessionId) {
    console.error("Usage: npx tsx scripts/dry-run-begroting-logica.ts <sessie-id>");
    process.exit(1);
  }
  const { data } = await supa.from("din_sessions").select("data").eq("id", sessionId).maybeSingle();
  const s = data!.data as Record<string, unknown>;
  const stap4 = ((s.crossAnalyseWizard as Record<string, unknown>)?.stepResults as Record<string, Record<string, unknown>>)
    ?.stap4;
  const sea = stap4?.subEffortAnalysis as Array<Record<string, unknown>> | undefined;
  if (!sea) {
    console.error("geen subEffortAnalysis");
    process.exit(1);
  }

  const inspanningen = sea
    .filter((e) => e.actie === "combineren")
    .map((e) => {
      const dossier = e.dossier as Record<string, unknown> | undefined;
      return {
        titel: (e.titel as string) ?? (e.voorgesteldeNaam as string) ?? "?",
        domein: (e.domein as string) ?? "",
        dossierKostenraming: (dossier?.kostenraming as string) ?? "",
      };
    });

  const ramingen = inspanningen.map((i) => ({
    titel: i.titel,
    domein: i.domein,
    raming: parseDossierRaming(i.dossierKostenraming),
  }));

  console.log("=== INSPANNINGEN + GEPARSEERDE RAMINGEN ===");
  for (const r of ramingen) {
    console.log(`\n[${r.domein}] ${r.titel}`);
    console.log(
      `  Eenmalig: €${r.raming.eenmaligLow.toLocaleString("nl-NL")} – €${r.raming.eenmaligHigh.toLocaleString("nl-NL")} (mid €${r.raming.eenmaligMid.toLocaleString("nl-NL")})`
    );
    if (r.raming.structureelMidPerJr > 0) {
      console.log(
        `  Structureel/jr: €${r.raming.structureelLowPerJr.toLocaleString("nl-NL")} – €${r.raming.structureelHighPerJr.toLocaleString("nl-NL")} (mid €${r.raming.structureelMidPerJr.toLocaleString("nl-NL")})`
      );
    }
  }

  const jaarlijksBudgetEuro = 250000;
  const budgetOptimaal = jaarlijksBudgetEuro;
  const budgetPlus20 = jaarlijksBudgetEuro * 1.2;
  const budgetMin20 = jaarlijksBudgetEuro * 0.8;

  console.log("\n\n=== SCENARIO-BEREKENINGEN ===");
  for (const [label, budget, max] of [
    ["OPTIMAAL", budgetOptimaal, 6] as const,
    ["PLUS20", budgetPlus20, 6] as const,
    ["MIN20", budgetMin20, 10] as const,
  ]) {
    const min = berekenMinimumJaren(
      ramingen.map((r) => r.raming),
      budget,
      "mid",
      max
    );
    console.log(`\n${label} (€${budget.toLocaleString("nl-NL")}/jr, max ${max} jaar):`);
    console.log(`  → aantalJaren: ${min.jaren}${min.capped ? " (CAPPED)" : ""}`);
    console.log(`  → totaal benodigd (mid): €${min.totaalEuro.toLocaleString("nl-NL")}`);
    console.log(
      `  → totaal benodigd (low): €${totaalBenodigdBudget(ramingen.map((r) => r.raming), min.jaren - 1, "low").toLocaleString("nl-NL")}`
    );

    // Per inspanning Doel-totaal en Min
    console.log(`  Per inspanning (over ${min.jaren} jaar):`);
    const structureleJaren = min.jaren - 1;
    for (const r of ramingen) {
      const doel = r.raming.eenmaligMid + r.raming.structureelMidPerJr * structureleJaren;
      const minTot = r.raming.eenmaligLow + r.raming.structureelLowPerJr * structureleJaren;
      console.log(
        `    [${r.domein}] ${r.titel}: doel €${doel.toLocaleString("nl-NL")}, min €${minTot.toLocaleString("nl-NL")}`
      );
    }
  }

  // Budget-advies (alleen als optimaal capped is)
  const minOpt = berekenMinimumJaren(ramingen.map((r) => r.raming), budgetOptimaal, "mid", 6);
  if (minOpt.capped) {
    console.log("\n\n=== BUDGET-ADVIES (optimaal capped op 6 jaar) ===");
    const advies = budgetAdvies({
      jaarlijksBudgetEuro: budgetOptimaal,
      ramingen: ramingen.map((r) => ({ titel: r.titel, raming: r.raming })),
      doelJaren: 5,
    });
    console.log(advies.uitlegMd);
    console.log(`\nTotaal realistisch: €${advies.totaalRealistisch.toLocaleString("nl-NL")}`);
    console.log(`Benodigd/jaar voor 5 jaar: €${advies.benodigdJaarlijksVoorDoeltermijn.toLocaleString("nl-NL")}`);
    console.log(`Tekort/jaar: €${advies.tekortPerJaar.toLocaleString("nl-NL")}`);
  } else {
    console.log("\n\n=== Optimaal past binnen 6 jaar — geen budget-advies banner ===");
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
