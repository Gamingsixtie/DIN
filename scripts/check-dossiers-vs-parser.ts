// Diagnose: zijn de DOSSIERS-bedragen in BerekeningenStep.tsx consistent met
// wat parseDossierRaming() uit dossierKostenraming-tekst haalt voor sessie
// d8b97442? Dat is dé vraag voor of Stap 8 audit klopt met §4.1.
//
// Run: npx tsx scripts/check-dossiers-vs-parser.ts
//
// READ-ONLY — schrijft niets.

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

const supa = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
);

// Hardcoded DOSSIERS uit BerekeningenStep.tsx (regels 98-159)
const DOSSIERS = [
  { match: "crm",         label: "CRM-platform",                eenmaligMin: 455_000, eenmaligMax: 680_000, eenmaligMid: 565_000, structureelPerJaar: 92_500 },
  { match: "uniforme",    label: "Uniforme klantbenadering",    eenmaligMin: 55_000,  eenmaligMax: 70_000,  eenmaligMid: 62_500,  structureelPerJaar: 12_500 },
  { match: "gesprek",     label: "Gespreksvaardigheidstraining",eenmaligMin: 125_000, eenmaligMax: 160_000, eenmaligMid: 142_500, structureelPerJaar: 0 },
  { match: "leiderschap", label: "Leiderschapsprogramma",       eenmaligMin: 33_000,  eenmaligMax: 43_000,  eenmaligMid: 38_000,  structureelPerJaar: 7_500 },
  { match: "klantfeedback", label: "Klantfeedback-systematiek", eenmaligMin: 40_000,  eenmaligMax: 60_000,  eenmaligMid: 50_000,  structureelPerJaar: 10_000 },
  { match: "data",        label: "Klantdata-platform",          eenmaligMin: 200_000, eenmaligMax: 300_000, eenmaligMid: 250_000, structureelPerJaar: 50_000 },
];

function findDossier(titel: string) {
  const t = titel.toLowerCase();
  return DOSSIERS.find((d) => t.includes(d.match)) ?? null;
}

const sessionId = process.argv[2] ?? "d8b97442-ce8f-4134-b2c7-67dc8e3a3f93";

type SubEffort = {
  titel?: string;
  domein?: string;
  dossier?: { kostenraming?: string };
  dossierKostenraming?: string;
};

type Scenario = {
  totaalGeraamdEuro?: number;
  jaarlijksBudgetEuro?: number;
  aantalJaren?: number;
  inspanningen?: Array<{ inspanningTitel: string; totaalEuro?: number }>;
};

function fmtEur(n: number) {
  return `€ ${n.toLocaleString("nl-NL")}`;
}

async function main() {
  const { data, error } = await supa
    .from("din_sessions")
    .select("data, updated_at")
    .eq("id", sessionId)
    .maybeSingle();

  if (error || !data) {
    console.error(error?.message ?? "Sessie niet gevonden");
    process.exit(1);
  }

  const s = data.data as Record<string, unknown>;
  const wiz = s.crossAnalyseWizard as
    | { stepResults?: Record<string, Record<string, unknown>> }
    | undefined;
  const stap4 = wiz?.stepResults?.stap4 as Record<string, unknown> | undefined;
  const sub = (stap4?.subEffortAnalysis as SubEffort[] | undefined) ?? [];
  const begroting = stap4?.begrotingAdvies as
    | { startJaar?: number; scenarios?: Record<string, Scenario | null> }
    | undefined;

  console.log("═".repeat(100));
  console.log("DOSSIERS (BerekeningenStep.tsx)  vs  parseDossierRaming(kostenraming)  vs  scenario-totalen");
  console.log("═".repeat(100));

  for (const inspanning of sub) {
    const titel = inspanning.titel ?? "(zonder titel)";
    const tekst = inspanning.dossier?.kostenraming ?? inspanning.dossierKostenraming ?? "";
    const parsed = parseDossierRaming(tekst);
    const dossier = findDossier(titel);

    console.log(`\n## ${titel}`);
    console.log(`Domein: ${inspanning.domein ?? "?"}`);
    console.log();
    console.log(`Kostenraming-tekst: ${tekst.slice(0, 180)}${tekst.length > 180 ? "…" : ""}`);
    console.log();

    console.log(`Parser uit tekst:                 eenmalig=${fmtEur(parsed.eenmaligLow)}–${fmtEur(parsed.eenmaligHigh)} (mid ${fmtEur(parsed.eenmaligMid)})  +  ${fmtEur(parsed.structureelMidPerJr)}/jr`);
    if (dossier) {
      console.log(`DOSSIERS in BerekeningenStep:     eenmalig=${fmtEur(dossier.eenmaligMin)}–${fmtEur(dossier.eenmaligMax)} (mid ${fmtEur(dossier.eenmaligMid)})  +  ${fmtEur(dossier.structureelPerJaar)}/jr`);

      const dMin = parsed.eenmaligLow - dossier.eenmaligMin;
      const dMax = parsed.eenmaligHigh - dossier.eenmaligMax;
      const dMid = parsed.eenmaligMid - dossier.eenmaligMid;
      const dStr = parsed.structureelMidPerJr - dossier.structureelPerJaar;

      console.log(`Δ parser − DOSSIERS:              eenmalig low ${fmtEur(dMin)} | high ${fmtEur(dMax)} | mid ${fmtEur(dMid)}  |  struct/jr ${fmtEur(dStr)}`);

      const matchMid = Math.abs(dMid) <= 1000;
      const matchStr = Math.abs(dStr) <= 500;
      console.log(`Verdict:                          mid ${matchMid ? "✓" : "✗"}   struct ${matchStr ? "✓" : "✗"}`);
    } else {
      console.log(`DOSSIERS in BerekeningenStep:     (geen match — geen audit-weergave voor deze inspanning)`);
    }

    if (begroting?.scenarios) {
      console.log(`\nWerkelijk in scenarios:`);
      for (const [k, sc] of Object.entries(begroting.scenarios)) {
        if (!sc) continue;
        const ins = sc.inspanningen?.find((i) => i.inspanningTitel === titel);
        if (!ins) continue;
        const jaren = sc.aantalJaren ?? 0;
        const expectedFromParser = parsed.eenmaligMid + parsed.structureelMidPerJr * jaren;
        const expectedFromDossier = dossier
          ? dossier.eenmaligMid + dossier.structureelPerJaar * jaren
          : null;
        const drift = (ins.totaalEuro ?? 0) - expectedFromParser;
        console.log(
          `  ${k.padEnd(10)} (${jaren}jr): werkelijk ${fmtEur(ins.totaalEuro ?? 0)}  |  parser-bottom-up ${fmtEur(expectedFromParser)}  |  drift ${fmtEur(drift)}` +
          (expectedFromDossier !== null ? `  |  DOSSIERS-bottom-up ${fmtEur(expectedFromDossier)}` : "")
        );
      }
    }
  }

  console.log("\n" + "═".repeat(100));
  console.log("CONCLUSIE: kijk waar Δ parser−DOSSIERS niet 0 is. Dat is de echte mismatch tussen audit en §4.1.");
  console.log("═".repeat(100));
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
