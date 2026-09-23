// Live API-test: roep /api/begroting-advies aan met echte sessie-input,
// toon de uitvoer en valideer per scenario of dossier-bedragen kloppen.
//
// Usage: npx tsx scripts/live-api-test.ts <sessie-id> [api-base-url]
// Default api-base-url: https://din-kappa.vercel.app

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
  const apiBase = process.argv[3] ?? "https://din-kappa.vercel.app";
  if (!sessionId) {
    console.error("Usage: npx tsx scripts/live-api-test.ts <sessie-id> [api-base]");
    process.exit(1);
  }
  const { data } = await supa.from("din_sessions").select("data").eq("id", sessionId).maybeSingle();
  const s = data!.data as Record<string, unknown>;
  const stap4 = ((s.crossAnalyseWizard as Record<string, unknown>)?.stepResults as Record<string, Record<string, unknown>>)?.stap4;
  const sea = stap4?.subEffortAnalysis as Array<Record<string, unknown>>;

  const inspanningen = sea
    .filter((e) => e.actie === "combineren")
    .map((e) => {
      const dossier = e.dossier as Record<string, unknown> | undefined;
      const bc = e.businessCase as Record<string, unknown> | undefined;
      const bcResult = bc?.result as Record<string, unknown> | undefined;
      return {
        titel: e.titel ?? e.voorgesteldeNaam ?? `${e.domein} inspanning`,
        groepId: e.groepId,
        domein: e.domein,
        beschrijving: e.beschrijving ?? "",
        beargumentatie: e.beargumentatie ?? "",
        vermogenImpact: e.vermogenImpact ?? [],
        dossier: {
          eigenaar: (dossier?.eigenaar as string) ?? "",
          inspanningsleider: (dossier?.inspanningsleider as string) ?? "",
          verwachtResultaat: (dossier?.verwachtResultaat as string) ?? "",
          randvoorwaarden: (dossier?.randvoorwaarden as string) ?? "",
        },
        dossierKostenraming: (dossier?.kostenraming as string) ?? "",
        businessCaseAannames: (bcResult?.aannames as string[]) ?? [],
        businessCaseRisicos: (bcResult?.risicos as string[]) ?? [],
      };
    });

  const focusGoal = ((s.goals as Array<Record<string, unknown>> | undefined) ?? [])
    .slice()
    .sort((a, b) => ((a.rank as number) ?? 999) - ((b.rank as number) ?? 999))[0];
  const focusDoel = focusGoal
    ? {
        naam: (focusGoal.name as string) ?? "",
        beschrijving: (focusGoal.description as string) ?? (focusGoal.name as string) ?? "",
      }
    : null;

  const body = {
    jaarlijksBudgetEuro: 250000,
    cyclusMaanden: 9,
    startJaar: 2026,
    focusDoel,
    inspanningen,
    scope: s.scope,
    vision: s.vision,
  };

  console.log(`=== POST ${apiBase}/api/begroting-advies (${inspanningen.length} inspanningen) ===\n`);
  const t0 = Date.now();
  const res = await fetch(`${apiBase}/api/begroting-advies`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  const ms = Date.now() - t0;
  const text = await res.text();
  console.log(`Status: ${res.status} (${ms}ms)`);
  let json: { success?: boolean; data?: Record<string, unknown>; error?: string };
  try {
    json = JSON.parse(text);
  } catch {
    console.log("RAW (niet-JSON):", text.slice(0, 500));
    process.exit(1);
  }
  if (!json.success) {
    console.log("FOUT:", json.error);
    process.exit(1);
  }
  const d = json.data as Record<string, unknown>;
  const scenarios = d.scenarios as Record<string, Record<string, unknown> | null>;
  const adviesKeuze = d.adviesKeuze as Record<string, unknown> | undefined;
  const optimaalOpties = d.optimaalOpties as Array<Record<string, unknown>> | undefined;

  console.log("\n=== ADVIES-KEUZE (server-side) ===");
  if (adviesKeuze) {
    console.log(`  jaren: ${adviesKeuze.jaren}, budget/jr: €${(adviesKeuze.benodigdJaarlijks as number).toLocaleString("nl-NL")}, +${adviesKeuze.pctVerschilTovHuidig}% tov huidig`);
  }
  if (optimaalOpties) {
    console.log(`  alle opties:`);
    for (const o of optimaalOpties) {
      console.log(`    - ${o.jaren} jaar @ €${(o.benodigdJaarlijks as number).toLocaleString("nl-NL")}/jr (totaal €${(o.totaalEuro as number).toLocaleString("nl-NL")}, +${o.pctVerschilTovHuidig}%)`);
    }
  }

  for (const lbl of ["optimaal", "plus20", "min20", "advies"] as const) {
    const sc = scenarios[lbl];
    if (!sc) {
      console.log(`\n=== ${lbl.toUpperCase()}: NULL ===`);
      continue;
    }
    console.log(`\n=== ${lbl.toUpperCase()} (€${sc.jaarlijksBudgetEuro}/jr × ${sc.aantalJaren} jaar = €${sc.totaalGeraamdEuro}) ===`);
    const insps = sc.inspanningen as Array<Record<string, unknown>>;
    for (const i of insps) {
      console.log(`  [${i.domein}] ${i.inspanningTitel} → €${(i.totaalEuro as number).toLocaleString("nl-NL")} (${i.percentageTotaal}%)`);
      const verd = i.verdelingPerJaar as Array<Record<string, unknown>>;
      for (const v of verd) {
        console.log(`     ${v.jaar}: €${(v.euro as number).toLocaleString("nl-NL")}  ${v.fase}`);
      }
    }
  }

  // Validatie tov dossier-min
  console.log("\n=== DOSSIER-VALIDATIE ===");
  const val = d.dossierValidatie as Record<string, { ok: boolean; tekorten: Array<{ titel: string; geleverd: number; minimaal: number }> }>;
  for (const lbl of ["optimaal", "plus20", "min20", "advies"]) {
    const v = val[lbl];
    if (!v) continue;
    if (v.ok) {
      console.log(`  ${lbl}: ✅ alle inspanningen ≥ 90% van dossier-ondergrens`);
    } else {
      console.log(`  ${lbl}: ⚠️  ${v.tekorten.length} tekort(en):`);
      for (const t of v.tekorten) {
        console.log(`    - ${t.titel}: €${t.geleverd.toLocaleString("nl-NL")} geleverd, €${t.minimaal.toLocaleString("nl-NL")} minimum`);
      }
    }
  }

  console.log("\n=== VERGELIJKING ===");
  console.log(d.vergelijking);

  const ba = d.budgetAdvies as { uitlegMd?: string } | null;
  if (ba) {
    console.log("\n=== BUDGET-ADVIES (huidig budget capped) ===");
    console.log(ba.uitlegMd);
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
