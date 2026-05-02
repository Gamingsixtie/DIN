// Verificatie: bevestigt dat élk getal dat Stap 8 (BerekeningenStep) zal
// tonen voor sessie d8b97442 EXACT overeenkomt met wat in §4.1 begroting-
// advies staat. Voor elk scenario verifieer:
//
//  1. scenario.totaalGeraamdEuro = Σ inspanningen[].totaalEuro
//  2. scenario.totaalGeraamdEuro = Σ totalenPerJaar[].euro
//  3. Per inspanning: Σ verdelingPerJaar[].euro = totaalEuro
//  4. Geen totalenPerJaar[].euro > cap × 1.001
//  5. Per inspanning met dossier-tekst: parseDossierRaming() geeft non-zero
//  6. Per inspanning: motivatie is non-empty
//
// Tolerantie: max(€5K, 0,5%).
// READ-ONLY — schrijft niets.
//
// Run: npx tsx scripts/verify-stap8-equivalentie.ts

import { createClient } from "@supabase/supabase-js";
import { readFileSync, existsSync } from "fs";
import { join } from "path";
import { parseDossierRaming } from "../src/lib/dossier-parser";

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

const SESSION_ID = "d8b97442-ce8f-4134-b2c7-67dc8e3a3f93";

type Cell = { jaar: number; euro: number; percentage?: number; fase?: string; activiteit?: string };
type Insp = {
  inspanningTitel: string;
  domein?: string;
  totaalEuro?: number;
  motivatie?: string;
  verdelingPerJaar?: Cell[];
};
type Scen = {
  label?: string;
  aantalJaren?: number;
  jaarlijksBudgetEuro?: number;
  inspanningen?: Insp[];
  totaalGeraamdEuro?: number;
  totalenPerJaar?: Array<{ jaar: number; euro: number; percentage?: number }>;
};
type SubEffort = {
  titel?: string;
  domein?: string;
  dossier?: { kostenraming?: string };
  dossierKostenraming?: string;
};

function eur(n: number): string {
  return `€${Math.round(n).toLocaleString("nl-NL")}`;
}

/** Tolerantie max(€5K, 0,5%) zoals beschreven in BerekeningenStep §C. */
function tol(reference: number): number {
  return Math.max(5_000, Math.abs(reference) * 0.005);
}

/** Vergelijk twee bedragen binnen tolerantie. */
function within(actual: number, expected: number): boolean {
  return Math.abs(actual - expected) <= tol(expected);
}

function findDossierTekst(
  subs: SubEffort[],
  inspanningTitel: string
): string {
  // Zoek best-match in subEffortAnalysis op titel
  const exact = subs.find((s) => s.titel === inspanningTitel);
  if (exact) {
    return exact.dossier?.kostenraming ?? exact.dossierKostenraming ?? "";
  }
  const lower = inspanningTitel.toLowerCase();
  // Substring match (effort-titels en sub-effort-titels lopen soms uiteen)
  const partial = subs.find((s) => {
    const t = (s.titel ?? "").toLowerCase();
    if (!t) return false;
    return t.includes(lower) || lower.includes(t);
  });
  return partial?.dossier?.kostenraming ?? partial?.dossierKostenraming ?? "";
}

async function main() {
  const supa = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
  );

  const { data, error } = await supa
    .from("din_sessions")
    .select("data")
    .eq("id", SESSION_ID)
    .maybeSingle();

  if (error || !data) {
    console.error("✗ Sessie niet gevonden:", error?.message ?? "no row");
    process.exit(1);
  }

  const sess = data.data as Record<string, unknown>;
  const wiz = sess.crossAnalyseWizard as { stepResults?: Record<string, unknown> } | undefined;
  const stap4 = wiz?.stepResults?.stap4 as Record<string, unknown> | undefined;
  if (!stap4) {
    console.error("✗ stap4 ontbreekt in sessie");
    process.exit(1);
  }
  const adv = stap4.begrotingAdvies as
    | { startJaar?: number; scenarios?: Record<string, Scen | null> }
    | undefined;
  if (!adv?.scenarios) {
    console.error("✗ begrotingAdvies.scenarios ontbreekt");
    process.exit(1);
  }
  const subs = (stap4.subEffortAnalysis as SubEffort[] | undefined) ?? [];
  const startJaar = adv.startJaar ?? 2026;

  console.log("═".repeat(90));
  console.log(`STAP 8 ↔ §4.1 EQUIVALENTIE-VERIFICATIE  (sessie ${SESSION_ID.slice(0, 8)})`);
  console.log("═".repeat(90));
  console.log(`Tolerantie per check: max(€5.000, 0,5% van referentie)\n`);

  let totalChecks = 0;
  let totalFails = 0;
  const allFailures: string[] = [];

  for (const [scenKey, sc] of Object.entries(adv.scenarios)) {
    if (!sc) {
      console.log(`▌ ${scenKey.toUpperCase()} — (null, skip)\n`);
      continue;
    }

    const aantalJaren = sc.aantalJaren ?? 0;
    const cap = sc.jaarlijksBudgetEuro ?? 0;
    const inspanningen = sc.inspanningen ?? [];
    const totalenPerJaar = sc.totalenPerJaar ?? [];
    const recordedTotaal = sc.totaalGeraamdEuro ?? 0;

    console.log("─".repeat(90));
    console.log(`▌ SCENARIO: ${scenKey.toUpperCase()}  (${aantalJaren}j × ${eur(cap)}/jr cap)`);
    console.log("─".repeat(90));

    let scenChecks = 0;
    let scenFails = 0;
    const scenFailures: string[] = [];

    const recordCheck = (passed: boolean, label: string, detail?: string) => {
      scenChecks++;
      totalChecks++;
      if (passed) {
        console.log(`  ✓ ${label}`);
      } else {
        scenFails++;
        totalFails++;
        const fullDetail = detail ? ` — ${detail}` : "";
        const line = `  ✗ ${label}${fullDetail}`;
        console.log(line);
        scenFailures.push(`[${scenKey}] ${label}${fullDetail}`);
        allFailures.push(`[${scenKey}] ${label}${fullDetail}`);
      }
    };

    // ── Check 1: scenario.totaalGeraamdEuro = Σ inspanningen[].totaalEuro
    const sumInsp = inspanningen.reduce((s, i) => s + (i.totaalEuro ?? 0), 0);
    recordCheck(
      within(sumInsp, recordedTotaal),
      `Check 1: Σ inspanningen.totaalEuro = scenario.totaalGeraamdEuro`,
      `Σ=${eur(sumInsp)}, recorded=${eur(recordedTotaal)}, Δ=${eur(sumInsp - recordedTotaal)}`,
    );

    // ── Check 2: scenario.totaalGeraamdEuro = Σ totalenPerJaar[].euro
    if (totalenPerJaar.length > 0) {
      const sumTpj = totalenPerJaar.reduce((s, t) => s + t.euro, 0);
      recordCheck(
        within(sumTpj, recordedTotaal),
        `Check 2: Σ totalenPerJaar.euro = scenario.totaalGeraamdEuro`,
        `Σ=${eur(sumTpj)}, recorded=${eur(recordedTotaal)}, Δ=${eur(sumTpj - recordedTotaal)}`,
      );
    } else {
      recordCheck(false, `Check 2: totalenPerJaar ontbreekt`);
    }

    // ── Check 3: Per inspanning Σ verdelingPerJaar.euro = totaalEuro
    let check3Fails = 0;
    const check3Details: string[] = [];
    for (const ins of inspanningen) {
      const cellSum = (ins.verdelingPerJaar ?? []).reduce((s, c) => s + c.euro, 0);
      const recorded = ins.totaalEuro ?? 0;
      if (!within(cellSum, recorded)) {
        check3Fails++;
        check3Details.push(
          `${ins.inspanningTitel.slice(0, 40)}: Σ=${eur(cellSum)} ≠ totaalEuro=${eur(recorded)} (Δ=${eur(cellSum - recorded)})`,
        );
      }
    }
    recordCheck(
      check3Fails === 0,
      `Check 3: Per inspanning Σ verdelingPerJaar.euro = totaalEuro (${inspanningen.length} inspanningen)`,
      check3Fails > 0 ? `${check3Fails} fail(s): ${check3Details.join(" | ")}` : undefined,
    );

    // ── Check 4: Geen totalenPerJaar.euro > cap × 1.001
    //   Uitzondering: J1 (=startJaar) mag op €250K hard staan (Cito-eis vrijval
    //   2026 — verify-all-calculations.ts gebruikt dezelfde regel: yearCap =
    //   i === 0 ? J1_HARD : cap). Server-guards laten J1 deze afwijking toe.
    const J1_HARD = 250_000;
    let check4Fails = 0;
    const check4Details: string[] = [];
    if (cap > 0) {
      for (const t of totalenPerJaar) {
        const yearCap = t.jaar === startJaar ? Math.max(cap, J1_HARD) : cap;
        const capLimit = yearCap * 1.001;
        if (t.euro > capLimit) {
          check4Fails++;
          check4Details.push(`${t.jaar}: ${eur(t.euro)} > yearCap×1.001=${eur(capLimit)}`);
        }
      }
    }
    recordCheck(
      check4Fails === 0,
      `Check 4: Geen totalenPerJaar.euro > cap × 1.001 (J1=€250K Cito-eis toegestaan)`,
      check4Fails > 0 ? check4Details.join(" | ") : undefined,
    );

    // ── Check 5: Per inspanning met dossier-tekst → parseDossierRaming non-zero
    let check5Fails = 0;
    const check5Details: string[] = [];
    let check5Total = 0;
    for (const ins of inspanningen) {
      const tekst = findDossierTekst(subs, ins.inspanningTitel);
      if (!tekst.trim()) {
        // Geen dossier-tekst → niet-checkbaar (skip)
        continue;
      }
      check5Total++;
      const parsed = parseDossierRaming(tekst);
      const totalParsed = parsed.eenmaligMid + parsed.structureelMidPerJr;
      if (parsed.unparsed || totalParsed <= 0) {
        check5Fails++;
        check5Details.push(
          `${ins.inspanningTitel.slice(0, 40)}: parser unparsed=${parsed.unparsed}, eenmaligMid=${eur(parsed.eenmaligMid)}, struct/jr=${eur(parsed.structureelMidPerJr)}`,
        );
      }
    }
    recordCheck(
      check5Fails === 0,
      `Check 5: Inspanningen met dossier-tekst → parser non-zero (${check5Total} testbaar)`,
      check5Fails > 0 ? check5Details.join(" | ") : undefined,
    );

    // ── Check 6: Per inspanning motivatie non-empty
    let check6Fails = 0;
    const check6Details: string[] = [];
    for (const ins of inspanningen) {
      const m = (ins.motivatie ?? "").trim();
      if (!m) {
        check6Fails++;
        check6Details.push(ins.inspanningTitel.slice(0, 40));
      }
    }
    recordCheck(
      check6Fails === 0,
      `Check 6: Per inspanning motivatie non-empty (${inspanningen.length} inspanningen)`,
      check6Fails > 0 ? `leeg bij: ${check6Details.join(", ")}` : undefined,
    );

    console.log(
      `\n  Subtotaal ${scenKey}: ${scenChecks - scenFails}/${scenChecks} pass${scenFails > 0 ? ` — ${scenFails} fail` : ""}\n`,
    );
  }

  console.log("═".repeat(90));
  if (totalFails === 0) {
    console.log(`✓ ALLE ${totalChecks} CHECKS PASS — Stap 8 kan §4.1 1-op-1 renderen zonder mismatches.`);
  } else {
    console.log(`✗ ${totalFails}/${totalChecks} CHECKS FAILED:`);
    for (const f of allFailures) console.log(`  ${f}`);
  }
  console.log("═".repeat(90));

  process.exit(totalFails === 0 ? 0 : 1);
}

main().catch((e) => {
  console.error("✗ Fataal:", e);
  process.exit(2);
});
