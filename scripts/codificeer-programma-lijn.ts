// Codificeer programma/lijn-classificatie op interne uren — sessie d8b97442.
//
// Doel:
//   1. Voeg per rol in `vastgesteldeUrenPerInspanning[].rollen[]` een veld
//      `programmaPct: number` (0-1) toe op basis van functieprofiel +
//      onderbouwing.
//   2. Bereken per scenario per domein een afgeleide programma/lijn-uitsplitsing
//      uit de domeinen[].jaren[].rollen[] uren-data en schrijf dit terug als:
//        - domein.programmaPct (gewogen gemiddelde)
//        - domein.programmaUren
//        - domein.lijnUren
//      en op scenario-niveau:
//        - scenario.programmaUren
//        - scenario.lijnUren
//
// Programma vs. lijn-criterium (vastgesteld met user):
//   Lijn = functieprofiel-werk OF bestaand budget OF bestaande cyclus.
//   Programma = eenmalig & nieuw OF specifieke nieuwe kennis OF bovenop
//   bestaand.
//
// Idempotent: per run wordt de classificatie opnieuw afgeleid uit de
// hardcoded mapping (functieId × domein) + scenario-lengte (alleen voor
// processen.procesmanager_data — schaalt met staart-lengte). Tweede run
// produceert identieke output.
//
// Gebruik:
//   npx tsx scripts/codificeer-programma-lijn.ts            (dry-run)
//   npx tsx scripts/codificeer-programma-lijn.ts --apply    (schrijven)

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
    const k = t.substring(0, e).trim();
    const v = t.substring(e + 1).trim().replace(/^["']|["']$/g, "");
    if (!process.env[k]) process.env[k] = v;
  }
}
loadEnvFile(join(process.cwd(), ".env.local"));

const SESSION_ID = "d8b97442-ce8f-4134-b2c7-67dc8e3a3f93";
const APPLY = process.argv.includes("--apply");

const supa = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
);

type DomeinKey = "data_systemen" | "mens" | "cultuur" | "processen";
type ScenarioKey = "min20" | "advies" | "plus20" | "optimaal";

// HR-custom-id (cultuur)
const HR_CUSTOM_ID = "custom-1777458764027-8mxzp";
// Procesondersteuner Professionals (processen)
const PROCONDERST_PROF_ID = "custom-1777459472792-own3u";

// Procesmanager K&M in processen-domein schaalt met scenario-lengte.
// Heuristiek (audit-document): meer staart = meer lijn-aandeel.
//   advies (4j, 1j staart):  programmaPct 0.76  (1 van 4 jaar = lijn)
//   plus20 (5j, 2j staart):  programmaPct 0.66  (≈⅔ programma)
//   optimaal (7j, 4j staart): programmaPct 0.50
//   min20 (10j, 7j staart):  programmaPct 0.36
const PROCESMANAGER_PROC_PCT: Record<ScenarioKey, number> = {
  advies: 0.76,
  plus20: 0.66,
  optimaal: 0.50,
  min20: 0.36,
};

interface ProgrammaPctMap {
  // key: `${domein}|${functieId}` → percentage programma (0-1)
  [k: string]: number;
}

/**
 * Bepaal programmaPct per rol in een specifiek domein.
 * Sommige rollen bestaan in meerdere domeinen (bv. trainer_adviseur_a in
 * data_systemen + mens) maar krijgen daar een ándere percentage omdat de
 * werkaard verschilt.
 */
function getProgrammaPct(
  domein: DomeinKey,
  functieId: string,
  scenario: ScenarioKey,
): { pct: number; reden: string } {
  const key = `${domein}|${functieId}`;

  // ─── DATA & SYSTEMEN (CRM) ──────────────────────────────────────────────────
  if (domein === "data_systemen") {
    if (functieId === "manager_dt" || functieId === "projectmanager_d") {
      // Helft governance/stuurgroep (lijn) — helft eenmalige contractering
      // + CRM-implementatie + nulmeting (programma).
      return { pct: 0.5, reden: "50% governance/stuurgroep (lijn) + 50% eenmalige contractering & implementatie (programma)" };
    }
    if (functieId === "business_info_analist_c" || functieId === "procesmanager_data") {
      // Specifieke CRM-acceptatietest + datakwaliteit-scan = programma
      // (eenmalig nieuw werk). Stuurgroep-deelname = lijn (vaste cyclus).
      // Bulk is acceptatietest + analyses → 80% programma.
      return { pct: 0.80, reden: "Hoofdzakelijk eenmalige CRM-acceptatietest & datakwaliteit-scan; lichte stuurgroep-deelname is lijn" };
    }
    if (functieId === "trainer_adviseur_a") {
      // CRM-key-user-training facilitatie = programma volledig (specifieke
      // nieuwe kennis CRM-systeem, niet bestaande L&D-baseline).
      return { pct: 1.0, reden: "CRM-key-user-training is specifieke nieuwe kennis = volledig programma" };
    }
    if (functieId === "teamleider_trainingen") {
      // CRM-training-coördinatie = programma (eenmalig nieuw).
      return { pct: 1.0, reden: "CRM-training-coördinatie is eenmalig & nieuw" };
    }
    if (
      functieId === "sectormanager_po" ||
      functieId === "sectormanager_vo" ||
      functieId === "sectormanager_prof"
    ) {
      // 50% MT-tijd (lijn — bestaande stuurgroep-cyclus) + 50% specifieke
      // CRM-afstemming met sectoren (programma — nieuwe afstemming).
      return { pct: 0.5, reden: "50% MT-stuurgroep (lijn) + 50% specifieke CRM-afstemming sector (programma)" };
    }
    if (functieId === "manager_klantcontact") {
      // CRM-staart 4u/jr — programma-coördinatie key-users.
      return { pct: 1.0, reden: "CRM-key-user-coördinatie is programma-staart, geen vaste taak" };
    }
  }

  // ─── MENS (training) ────────────────────────────────────────────────────────
  if (domein === "mens") {
    if (functieId === "trainer_adviseur_a") {
      // Curriculumontwerp + facilitatie outside-in = volledig programma
      // (eenmalige content + nieuwe methodiek).
      return { pct: 1.0, reden: "Curriculumontwerp + facilitatie outside-in = volledig programma (nieuwe content & methodiek)" };
    }
    if (functieId === "teamleider_trainingen") {
      // Coördinatie nulmeting + curriculumontwerp = programma.
      return { pct: 1.0, reden: "Coördinatie nulmeting + curriculumontwerp = programma" };
    }
    if (functieId === "manager_klantcontact") {
      // Programma-coördinatie roosters/werving deelnemers = programma
      // (eenmalig & bovenop bestaand).
      return { pct: 1.0, reden: "Programma-coördinatie roosters/werving = nieuw, bovenop bestaande L&D-cyclus" };
    }
    if (
      functieId === "sectormanager_po" ||
      functieId === "sectormanager_vo" ||
      functieId === "sectormanager_prof"
    ) {
      // 50% MT/afstemming (lijn-cyclus) + 50% specifieke programma-afstemming.
      return { pct: 0.5, reden: "50% MT-tijd voor mens-blok (lijn) + 50% specifieke afstemming (programma)" };
    }
    if (
      functieId === "accountmanager_c" ||
      functieId === "accountmanager_c_prof" ||
      functieId === "mdw_binnendienst_b" ||
      functieId === "klantenservice_c"
    ) {
      // Deelnemers: van de 46u/persoon over 4 jaar is ~16u/jr × 4j = 64u
      // standaard L&D-baseline (lijn). Werkelijk zit per persoon ~46u in
      // het programma — dus baseline-aandeel ≈ 35% lijn, 65% programma.
      // (Zie audit-aanname: 47 deelnemers × ~16u/jr standaard L&D-tijd
      // uit opleidingsplan Klantcontact.)
      return { pct: 0.65, reden: "~35% van deelnemertijd is bestaande L&D-baseline (lijn), 65% is specifieke outside-in-content (programma)" };
    }
  }

  // ─── CULTUUR (leiderschap) ──────────────────────────────────────────────────
  if (domein === "cultuur") {
    if (functieId === HR_CUSTOM_ID) {
      // HR-werk: gedragscontract + 360°-instrument-aanpassing = nieuw
      // (programma); HRM-cyclus zelf = lijn (bestaande cyclus).
      return { pct: 0.6, reden: "Gedragscontract + 360°-instrument-aanpassing = nieuw (60% programma); HRM-cyclus zelf = lijn (40%)" };
    }
    if (functieId === "directeur_bv") {
      // 50% MT-tijd (lijn) + 50% leiderschapsprogramma-deelname (programma).
      return { pct: 0.5, reden: "50% MT-cyclus (lijn) + 50% leiderschapsprogramma-deelname (programma)" };
    }
    if (
      functieId === "sectormanager_po" ||
      functieId === "sectormanager_vo" ||
      functieId === "sectormanager_prof"
    ) {
      // 50% MT-tijd (lijn) + 50% leiderschapsprogramma + leerkringen (programma).
      return { pct: 0.5, reden: "50% MT-tijd (lijn) + 50% leerkringen & klantbezoeken cross-sectoraal (programma)" };
    }
    if (functieId === "manager_klantcontact") {
      // Coördinatie cultuur-uitrol Klantcontact = programma.
      return { pct: 1.0, reden: "Coördinatie cultuur-uitrol Klantcontact = programma (eenmalig)" };
    }
    if (functieId === "teamleider_ps") {
      // Proxy directeur-uren — 50% lijn / 50% programma.
      return { pct: 0.5, reden: "Proxy directeur-uren: 50% MT-cyclus (lijn) + 50% leiderschapssessies (programma)" };
    }
    if (functieId === "manager_dt") {
      // Cultuur-coalitievorming + borging HRM-cyclus.
      // Coalitievorming = programma; HRM-borging = lijn.
      return { pct: 0.5, reden: "50% coalitievorming/leerkringen (programma) + 50% HRM-borging (lijn)" };
    }
  }

  // ─── PROCESSEN ──────────────────────────────────────────────────────────────
  if (domein === "processen") {
    if (functieId === "procesmanager_data") {
      // Schaalt met scenario-lengte (langere staart = meer lijn).
      const pct = PROCESMANAGER_PROC_PCT[scenario];
      const lijnDeel = Math.round((1 - pct) * 100);
      return {
        pct,
        reden: `Procesmanager K&M: structureel beheer (lijn) ≈${lijnDeel}% in ${scenario}-scenario; herontwerp + pilot (programma) = rest`,
      };
    }
    if (functieId === "projectmanager_d") {
      // Eenmalig herontwerp + adoptie-sessies = programma in korte
      // scenario's. In lange-staart-scenario's draait een deel van zijn uren
      // door als structurele governance-coördinatie (lijn).
      const pjmPct: Record<ScenarioKey, number> = {
        advies: 1.00,
        plus20: 0.90,
        optimaal: 0.70,
        min20: 0.50,
      };
      const pct = pjmPct[scenario];
      const lijnDeel = Math.round((1 - pct) * 100);
      return {
        pct,
        reden: `Projectmanager D (proc): eenmalig herontwerp + adoptie = programma; ${lijnDeel}% structureel governance in ${scenario}-staart = lijn`,
      };
    }
    if (
      functieId === "procesondersteuner_po" ||
      functieId === "procesondersteuner_vo" ||
      functieId === PROCONDERST_PROF_ID
    ) {
      // Werksessies + sector-vastlegging in pilot/uitrol-jaren = programma.
      // In lange-staart-scenario's (optimaal/min20) is een deel van hun uren
      // structureel proceseigenaar-borging na uitrol = lijn (functieprofiel).
      //   advies (4j, 1j staart)   : 1.0 (alleen pilot/uitrol)
      //   plus20 (5j, 2j staart)   : 0.85
      //   optimaal (7j, 4j staart) : 0.65 (4 jaar structureel beheer = lijn)
      //   min20 (10j, 7j staart)   : 0.40 (7 jaar structureel beheer = lijn)
      const procondPct: Record<ScenarioKey, number> = {
        advies: 1.00,
        plus20: 0.85,
        optimaal: 0.65,
        min20: 0.40,
      };
      const pct = procondPct[scenario];
      const lijnDeel = Math.round((1 - pct) * 100);
      return {
        pct,
        reden: `Procesondersteuner: werksessies pilot/uitrol = programma; ${lijnDeel}% structureel proceseigenaar-borging in ${scenario}-staart = lijn`,
      };
    }
  }

  // Onbekende rol — conservatief 0.7 (audit-default).
  console.warn(`[unknown-role] ${key} — gebruik default programmaPct=0.7`);
  return { pct: 0.7, reden: "Onbekende rol — conservatieve default 70% programma / 30% lijn" };
}

interface VastgesteldeRol {
  functieId: string;
  functieNaam?: string;
  afdeling?: string;
  urenTotaal: number;
  programmaPct?: number;
  classificatieToelichting?: string;
}

interface VastgesteldeInspanning {
  domein: string;
  inspanningTitel?: string;
  rollen: VastgesteldeRol[];
  groepId?: string;
}

interface JaarRol {
  functieId: string;
  functieNaam?: string;
  uren: number;
  uurtarief: number;
  kosten: number;
  afdeling?: string;
}

interface JaarBlok {
  jaar: number;
  rollen: JaarRol[];
  totaalUren?: number;
  totaalKosten?: number;
  activiteit?: string;
}

interface DomeinBlok {
  domein: string;
  jaren: JaarBlok[];
  totaalUren?: number;
  totaalKosten?: number;
  uren?: number;
  motivatie?: string;
  koppeling?: string[];
  programmaPct?: number;
  programmaUren?: number;
  lijnUren?: number;
}

interface ScenarioBlok {
  scenarioLabel?: string;
  startJaar?: number;
  aantalJaren?: number;
  domeinen?: DomeinBlok[];
  totaalUren?: number;
  totaalKosten?: number;
  programmaUren?: number;
  lijnUren?: number;
  samenvatting?: string;
}

async function main() {
  console.log(`[programma-lijn] sessie ${SESSION_ID} — apply=${APPLY}`);
  const { data: row, error } = await supa
    .from("din_sessions")
    .select("data")
    .eq("id", SESSION_ID)
    .maybeSingle();
  if (error || !row) {
    console.error("Kon sessie niet ophalen:", error);
    process.exit(1);
  }

  const sess = row.data as Record<string, unknown>;
  const wiz = sess.crossAnalyseWizard as Record<string, unknown>;
  const stepResults = wiz.stepResults as Record<string, unknown>;
  const stap4 = stepResults.stap4 as Record<string, unknown>;
  const s7 = stap4.stap7InterneUren as Record<string, unknown>;

  const vastgestelde = s7.vastgesteldeUrenPerInspanning as VastgesteldeInspanning[];
  const scenarios = s7.scenarios as Record<ScenarioKey, ScenarioBlok>;

  // ── Stap A: vastgesteldeUrenPerInspanning[].rollen[].programmaPct ──
  // We pakken `advies` als referentie-scenario voor de procesmanager_data
  // pct in de vastgestelde lijst (vastgesteld is scenario-onafhankelijk
  // qua structuur, maar processen-staart varieert; we documenteren beide).
  console.log("\n[A] Vastgestelde rollen — programmaPct per rol");
  const rolReport: Array<{
    domein: string;
    functieId: string;
    functieNaam?: string;
    urenTotaal: number;
    programmaPct: number;
    reden: string;
  }> = [];

  // Lijst rollen die scenario-afhankelijk programmaPct hebben (processen-staart).
  const scenarioAfhankelijk: Set<string> = new Set([
    "processen|procesmanager_data",
    "processen|projectmanager_d",
    "processen|procesondersteuner_po",
    "processen|procesondersteuner_vo",
    `processen|${PROCONDERST_PROF_ID}`,
  ]);

  for (const insp of vastgestelde) {
    const dom = insp.domein as DomeinKey;
    for (const r of insp.rollen) {
      const key = `${dom}|${r.functieId}`;
      // Voor scenario-afhankelijke rollen: gebruik advies-pct als basis-pct in
      // de vastgestelde-lijst (scenario-onafhankelijk veld). Markeer expliciet
      // dat de scenario-aware pct in scenarios[].domeinen[] staat.
      const result = getProgrammaPct(dom, r.functieId, "advies");
      const reden = scenarioAfhankelijk.has(key)
        ? `${result.reden} — basis-pct hier = advies, zie scenarios[].domeinen[].programmaPct voor exacte waarden per scenario`
        : result.reden;

      r.programmaPct = result.pct;
      r.classificatieToelichting = reden;
      rolReport.push({
        domein: dom,
        functieId: r.functieId,
        functieNaam: r.functieNaam,
        urenTotaal: r.urenTotaal,
        programmaPct: result.pct,
        reden,
      });
      console.log(
        `  [${dom}] ${r.functieId.padEnd(35)} pct=${result.pct.toFixed(2)} — ${r.functieNaam || ""}`,
      );
    }
  }

  // ── Stap B: scenario × domein × rol — gewogen programmaPct + uren-uitsplitsing
  console.log("\n[B] Scenario × domein — programma vs lijn");
  const scenReport: Array<{
    scenario: ScenarioKey;
    domein: DomeinKey;
    totaalUren: number;
    programmaUren: number;
    lijnUren: number;
    pct: number;
  }> = [];

  for (const [scenKey, scen] of Object.entries(scenarios) as Array<[ScenarioKey, ScenarioBlok]>) {
    if (!scen?.domeinen) continue;
    let scenProgUren = 0;
    let scenLijnUren = 0;

    for (const dom of scen.domeinen) {
      const domKey = dom.domein as DomeinKey;
      let domTotaal = 0;
      let domProg = 0;

      for (const jaar of dom.jaren || []) {
        for (const rol of jaar.rollen || []) {
          const { pct } = getProgrammaPct(domKey, rol.functieId, scenKey);
          domTotaal += rol.uren;
          domProg += rol.uren * pct;
        }
      }

      const lijn = Math.max(0, domTotaal - domProg);
      const gewogenPct = domTotaal > 0 ? domProg / domTotaal : 0;

      dom.programmaPct = Math.round(gewogenPct * 1000) / 1000;
      dom.programmaUren = Math.round(domProg);
      dom.lijnUren = Math.round(lijn);

      scenProgUren += domProg;
      scenLijnUren += lijn;

      scenReport.push({
        scenario: scenKey,
        domein: domKey,
        totaalUren: domTotaal,
        programmaUren: dom.programmaUren,
        lijnUren: dom.lijnUren,
        pct: dom.programmaPct,
      });

      console.log(
        `  [${scenKey}] ${domKey.padEnd(15)} totaal=${domTotaal.toString().padStart(5)}u  prog=${dom.programmaUren.toString().padStart(5)}u (${(gewogenPct * 100).toFixed(0)}%)  lijn=${dom.lijnUren.toString().padStart(4)}u`,
      );
    }

    scen.programmaUren = Math.round(scenProgUren);
    scen.lijnUren = Math.round(scenLijnUren);
    console.log(
      `  [${scenKey}] TOTAAL prog=${scen.programmaUren}u lijn=${scen.lijnUren}u (van ${scen.totaalUren}u)`,
    );
  }

  // ── Snapshot rapport schrijven ──
  const reportPath = join(process.cwd(), "PROGRAMMA-LIJN-CLASSIFICATIE.json");
  writeFileSync(
    reportPath,
    JSON.stringify(
      {
        sessieId: SESSION_ID,
        rolClassificaties: rolReport,
        scenarioDomeinUitsplitsing: scenReport,
        scenarioTotalen: Object.fromEntries(
          (Object.keys(scenarios) as ScenarioKey[]).map((k) => [
            k,
            {
              totaalUren: scenarios[k].totaalUren,
              programmaUren: scenarios[k].programmaUren,
              lijnUren: scenarios[k].lijnUren,
            },
          ]),
        ),
      },
      null,
      2,
    ),
    "utf-8",
  );
  console.log(`\n✓ Rapport geschreven naar ${reportPath}`);

  // ── Apply ──
  if (!APPLY) {
    console.log("\n[dry-run] Geen wijzigingen geschreven naar Supabase. Gebruik --apply.");
    return;
  }

  const { error: upErr } = await supa
    .from("din_sessions")
    .update({ data: sess })
    .eq("id", SESSION_ID);
  if (upErr) {
    console.error("Update gefaald:", upErr);
    process.exit(1);
  }
  console.log("✓ Geschreven naar Supabase.");
}

void main();
