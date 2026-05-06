// Update top-level scenario.samenvatting binnen stap4.stap7InterneUren.scenarios
// voor sessie d8b97442. Verwijdert verouderde getallen ("5.573/5.574/5.575 uren",
// "€ 435.658/436.194/438.797") en vervangt door verse cijfers uit de scenario-data.
//
// Idempotent via marker `samenvattingenUpdated2026: true` op stap7InterneUren.
// Geen UI-changes. Alleen de string `samenvatting` per scenario wordt herschreven.
import { createClient } from "@supabase/supabase-js";
import { readFileSync, existsSync, writeFileSync } from "fs";
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

const SESSION_ID = "d8b97442-ce8f-4134-b2c7-67dc8e3a3f93";

type DomeinNaam = "mens" | "data_systemen" | "cultuur" | "processen";

type DomeinRecord = {
  domein: DomeinNaam;
  totaalUren: number;
  totaalKosten: number;
};

type ScenarioRecord = {
  aantalJaren: number;
  totaalUren: number;
  totaalKosten: number;
  programmaUren: number;
  lijnUren: number;
  raadplegenUren?: number;
  scenarioLabel?: string;
  samenvatting?: string;
  domeinen: Record<string, DomeinRecord>;
};

const fmt = (n: number) => Math.round(n).toLocaleString("nl-NL");
const fmtEur = (n: number) => "€ " + Math.round(n).toLocaleString("nl-NL");

function intensiteitNoot(scen: string, jaren: number): string {
  if (scen === "min20")
    return `Met ${jaren} jaar is dit het meest uitgesmeerde scenario — laagste jaarlijkse belasting, langste doorlooptijd.`;
  if (scen === "advies")
    return `Met ${jaren} jaar is dit het meest intensieve scenario — hoogste jaarlijkse belasting, kortste doorlooptijd.`;
  if (scen === "plus20")
    return `Met ${jaren} jaar zit dit qua intensiteit tussen advies en optimaal in.`;
  if (scen === "optimaal")
    return `Met ${jaren} jaar combineert dit scenario realistische jaarbelasting met afdoende doorlooptijd.`;
  return `Doorlooptijd ${jaren} jaar.`;
}

function bouwSamenvatting(scenarioKey: string, s: ScenarioRecord): string {
  const totaal = s.totaalUren;
  const prog = s.programmaUren;
  const lijn = s.lijnUren;
  const rdpl = s.raadplegenUren ?? 0;
  const pProg = Math.round((prog / totaal) * 100);
  const pLijn = Math.round((lijn / totaal) * 100);
  const pRdpl = Math.round((rdpl / totaal) * 100);

  const byNaam: Partial<Record<DomeinNaam, DomeinRecord>> = {};
  for (const k of Object.keys(s.domeinen)) {
    const d = s.domeinen[k];
    byNaam[d.domein] = d;
  }

  const mens = byNaam.mens;
  const data = byNaam.data_systemen;
  const cult = byNaam.cultuur;
  const proc = byNaam.processen;

  const splitDelen: string[] = [`programma ${pProg}%`, `lijn ${pLijn}%`];
  if (rdpl > 0) splitDelen.push(`raadplegen ${pRdpl}%`);

  const domeinDelen: string[] = [];
  if (mens) domeinDelen.push(`mens ${fmt(mens.totaalUren)} uur (${fmtEur(mens.totaalKosten)})`);
  if (data)
    domeinDelen.push(
      `data & systemen ${fmt(data.totaalUren)} uur (${fmtEur(data.totaalKosten)})`,
    );
  if (cult) domeinDelen.push(`cultuur ${fmt(cult.totaalUren)} uur (${fmtEur(cult.totaalKosten)})`);
  if (proc)
    domeinDelen.push(`processen ${fmt(proc.totaalUren)} uur (${fmtEur(proc.totaalKosten)})`);

  return [
    `${fmt(totaal)} interne uren over ${s.aantalJaren} jaar — ${fmtEur(s.totaalKosten)} aan interne loonkosten (gemiddeld uurtarief Cito).`,
    `Verdeling: ${splitDelen.join(", ")}.`,
    `Per domein: ${domeinDelen.join("; ")}.`,
    `In mens zit een externe trainer voor de competentieontwikkeling; in data & systemen werkt een multidisciplinair Data&Tech-kernteam aan CRM, klantdata en integraties.`,
    intensiteitNoot(scenarioKey, s.aantalJaren),
  ].join(" ");
}

async function main() {
  const s = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
  );
  const { data, error: loadErr } = await s
    .from("din_sessions")
    .select("data")
    .eq("id", SESSION_ID)
    .maybeSingle();
  if (loadErr) {
    console.error("LOAD FOUT:", loadErr.message);
    process.exit(1);
  }
  if (!data) {
    console.error("Sessie niet gevonden");
    process.exit(1);
  }

  const sess = data.data as Record<string, unknown>;
  const wiz = sess.crossAnalyseWizard as Record<string, unknown> | undefined;
  const stepResults = wiz?.stepResults as Record<string, unknown> | undefined;
  const stap4 = stepResults?.stap4 as Record<string, unknown> | undefined;
  const stap7Uren = stap4?.stap7InterneUren as Record<string, unknown> | undefined;
  if (!stap7Uren) {
    console.error("stap4.stap7InterneUren ontbreekt");
    process.exit(1);
  }
  const scenarios = stap7Uren.scenarios as Record<string, ScenarioRecord> | undefined;
  if (!scenarios) {
    console.error("stap7InterneUren.scenarios ontbreekt");
    process.exit(1);
  }

  const marker = stap7Uren.samenvattingenUpdated2026 === true;
  console.log("=".repeat(80));
  console.log("UPDATE SCENARIO-SAMENVATTINGEN — sessie", SESSION_ID);
  console.log("Idempotency marker reeds gezet?", marker);
  console.log("=".repeat(80));

  type Result = {
    scenario: string;
    voor: string;
    na: string;
    veranderd: boolean;
  };
  const results: Result[] = [];

  for (const sk of Object.keys(scenarios)) {
    const sc = scenarios[sk];
    if (!sc) continue;
    const voor = sc.samenvatting ?? "";
    const na = bouwSamenvatting(sk, sc);
    const veranderd = voor !== na;
    if (veranderd) sc.samenvatting = na;
    results.push({ scenario: sk, voor, na, veranderd });
    console.log(`\n--- ${sk} ---`);
    console.log("VOOR:");
    console.log(voor);
    console.log("NA:");
    console.log(na);
    console.log(veranderd ? "  * gewijzigd" : "  = ongewijzigd");
  }

  const anyChange = results.some((r) => r.veranderd);
  if (!anyChange && marker) {
    console.log("\n! Geen wijziging nodig (marker al gezet) — geen write.");
    process.exit(0);
  }

  // Zet idempotency marker
  stap7Uren.samenvattingenUpdated2026 = true;
  stap7Uren.samenvattingenUpdated2026At = new Date().toISOString();

  const newData = {
    ...sess,
    crossAnalyseWizard: {
      ...(sess.crossAnalyseWizard as object),
      stepResults: {
        ...(stepResults ?? {}),
        stap4: {
          ...(stap4 ?? {}),
          stap7InterneUren: stap7Uren,
        },
      },
    },
  };

  const { error: writeErr } = await s
    .from("din_sessions")
    .update({ data: newData })
    .eq("id", SESSION_ID);
  if (writeErr) {
    console.error("\nWRITE FOUT:", writeErr.message);
    process.exit(1);
  }
  console.log("\nâœ" + " Geschreven naar Supabase.");

  // Verifieer
  const { data: verify } = await s
    .from("din_sessions")
    .select("data")
    .eq("id", SESSION_ID)
    .maybeSingle();
  const v = verify?.data as Record<string, unknown> | undefined;
  const vScen = (
    (v?.crossAnalyseWizard as Record<string, unknown> | undefined)?.stepResults as
      | Record<string, unknown>
      | undefined
  )?.stap4 as Record<string, unknown> | undefined;
  const vUren = vScen?.stap7InterneUren as Record<string, unknown> | undefined;
  const vSc = vUren?.scenarios as Record<string, ScenarioRecord> | undefined;
  console.log("\n--- VERIFICATIE ---");
  console.log("marker:", vUren?.samenvattingenUpdated2026);
  if (vSc) {
    for (const k of Object.keys(vSc)) {
      console.log(`  ${k}.samenvatting (eerste 90 chars): ${(vSc[k]?.samenvatting ?? "").slice(0, 90)}…`);
    }
  }

  // Schrijf rapport-bron mee voor het audit-md
  const reportPath = join(process.cwd(), "SCENARIO-SAMENVATTING-DIFF.json");
  writeFileSync(reportPath, JSON.stringify(results, null, 2), "utf-8");
  console.log(`\nDiff-bron weggeschreven naar ${reportPath}`);
}

void main();
