// Herschrijf scenario-samenvattingen voor stap7InterneUren — sessie d8b97442.
//
// Doel: vervang de oude (verouderde) `samenvatting` per scenario met een
// nieuwe versie van ~150-200 woorden die:
//   - opent met totaal-uren + programma-uren + lijn-uren als hoofdgetal
//   - piek-jaar noemt met scenario-context (CRM-OOP-fase resoneren)
//   - mens-trainingsblok piek-context geeft (Klantcontact 47 deelnemers)
//   - 2026 half-jaar-context noemt (start juni)
//   - lijn-criterium kort uitlegt
//   - per scenario specifieke karakter benoemt
//
// Idempotent: vervangt altijd door de hardcoded samenvatting hieronder.
//
// Gebruik:
//   npx tsx scripts/herschrijf-uren-samenvattingen.ts            (dry-run + log voor/na)
//   npx tsx scripts/herschrijf-uren-samenvattingen.ts --apply    (schrijven)

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

type ScenarioKey = "min20" | "advies" | "plus20" | "optimaal";

// Lijn-criterium-uitleg (één zin, hergebruikt in elke samenvatting)
const LIJN_UITLEG =
  "Lijn = uren die in functieprofielen, lopende L&D-budgetten of bestaande governance-cycli al ingepland zijn; programma = eenmalig nieuw werk of specifieke kennis bovenop de reguliere afdelingstaken.";

// Samenvattingen per scenario — alle getallen herleidbaar naar
// stap7InterneUren.scenarios na codificeer-programma-lijn.ts.
const SAMENVATTINGEN: Record<ScenarioKey, string> = {
  // ─── ADVIES (4 jaar 2026-2029, totaal 5.627u) ───
  advies: [
    "5.627 interne uren over 4 jaar (2026-2029), waarvan circa 4.133u programma-belasting (73%) en 1.494u lijn-werk (27%). " +
      LIJN_UITLEG,
    "Zwaarste jaar is 2027 met 2.524u — gedreven door de samenloop van CRM-realisatie en het eerste mens-trainingsblok in hetzelfde jaar; " +
      "in 2028 valt CRM-acceptatie samen met blok 2 mens, totaal 1.642u. 2029 (1.173u) is het beheer-jaar: CRM-staart 65u plus afronding processen + cultuur-verankering.",
    "2026 is een half-jaar (start juni): J1 ligt daarom op 288u (cap 290u), met name nulmeting en kick-off — niet vol-jaar-niveau.",
    "Capaciteits-aandachtspunt: in 2027 piekt mens met circa 1.500u — een capaciteitsbreuk-risico voor het Klantcontact-team " +
      "(47 deelnemers tegelijk in blok 1 + curriculumontwikkeling). Dit scenario heeft de hoogste piek-belasting van de vier scenario's.",
    "Programma/lijn-verhouding per domein: data_systemen 74% programma, mens 74% programma, cultuur 57% programma, " +
      "processen 91% programma (kortste staart, dus weinig structureel beheer).",
  ].join(" "),

  // ─── PLUS20 (5 jaar 2026-2030, totaal 5.692u) ───
  plus20: [
    "5.692 interne uren over 5 jaar (2026-2030), waarvan circa 4.097u programma-belasting (72%) en 1.595u lijn-werk (28%). " +
      LIJN_UITLEG,
    "Zwaarste jaar blijft 2027 (2.343u) — CRM-realisatie + mens-blok 1, vergelijkbaar met advies maar 7% lichter dankzij de extra ruimte. " +
      "2028 (1.436u) draagt CRM-acceptatie + blok 2; 2029 (685u) en 2030 (940u) zijn de twee CRM-staart-jaren met 65u/jr CRM-bilateralen plus mens-borging en cultuur-continu.",
    "2026 is een half-jaar (start juni): J1 op 288u (cap 290u), nulmeting + kick-off.",
    "Tempo-context: door 1 jaar extra looptijd schuift mens-borging naar 2030 en blijft data_systemen iets langer aan; " +
      "het Klantcontact-team houdt in 2027 een vergelijkbare piek als bij advies, maar nazorg en intervisies zijn netter ingebed.",
    "Programma/lijn-verhouding per domein: data_systemen 73% programma, mens 74% programma, cultuur 57% programma, " +
      "processen 79% programma (2 jaar staart = ietsje meer structureel beheer).",
  ].join(" "),

  // ─── OPTIMAAL (7 jaar 2026-2032, totaal 5.697u) ───
  optimaal: [
    "5.697 interne uren over 7 jaar (2026-2032), waarvan circa 3.988u programma-belasting (70%) en 1.709u lijn-werk (30%). " +
      LIJN_UITLEG,
    "Zwaarste jaar is 2028 met 1.394u — bij dit scenario ligt CRM-realisatie pas in 2028 (na leverancier-selectie 2027), " +
      "en valt samen met basis-/vaardigheidstraining mens. 2029 (1.228u) is het CRM-acceptatie-jaar, gevolgd door go-live 2030 (667u). " +
      "2027 is met 920u opvallend licht — leverancier-selectie is een trekker-licht jaar voor data_systemen. " +
      "2031 (598u) en 2032 (642u) bevatten CRM-staart, processen-verankering en cultuur-continu.",
    "2026 is een half-jaar (start juni): J1 op 248u (cap 250u), gericht op analyse en eerste leiderschapssessies.",
    "Tempo-context: standaard-tempo. De mens-piek valt later (rond 2028 in plaats van 2027), waardoor het Klantcontact-team " +
      "geen botsing heeft met de zwaarste CRM-jaren. Het scenario verspreidt de belasting echter over een lange periode, " +
      "wat meer governance-overhead geeft.",
    "Programma/lijn-verhouding per domein: data_systemen 73% programma, mens 74% programma, cultuur 57% programma, " +
      "processen 61% programma (4 jaar staart = substantieel meer structureel proceseigenaar-werk in lijn).",
  ].join(" "),

  // ─── MIN20 (10 jaar 2026-2035, totaal 5.970u) ───
  min20: [
    "5.970 interne uren over 10 jaar (2026-2035), waarvan circa 4.013u programma-belasting (67%) en 1.957u lijn-werk (33%). " +
      LIJN_UITLEG,
    "Zwaarste jaar is 2028 met 1.324u — CRM-realisatie. Daarna volgt een lange uitgespreide curve: " +
      "2029 (679u realisatie-vervolg), 2030 (739u acceptatie), 2031 (595u go-live/uitrol). " +
      "2027 (754u) is een trekker-licht jaar voor leverancier-selectie. Vanaf 2032 (353u) start de structurele staart: " +
      "2033-2035 elk circa 410-459u met CRM-staart 65u/jr, processen proceseigenaar-borging en cultuur-jaarcyclus.",
    "2026 is een half-jaar (start juni): J1 op 247u (cap 250u), analyse en cultuur-urgentie.",
    "Tempo-context: het uitgesmeerdste scenario. Mens-piek schuift naar 2028 — geen capaciteitsbreuk bij Klantcontact. " +
      "De CRM-acceptatie/go-live ligt nu inhoudelijk waar het hoort (2030/2031), terwijl in kortere scenario's de uren-piek " +
      "vóór het werk lag. Wel: de structurele staart 2033-2035 is langer dan in andere scenario's en vereist een blijvende " +
      "lijn-bezetting voor proceseigenaarschap (procesondersteuners 60% lijn) en governance.",
    "Programma/lijn-verhouding per domein: data_systemen 71% programma, mens 74% programma, cultuur 57% programma, " +
      "processen 41% programma — het laagste programma-aandeel van alle scenario's omdat 7 jaar staart de structurele lijn-belasting opdrijft.",
  ].join(" "),
};

interface ScenarioBlok {
  totaalUren?: number;
  programmaUren?: number;
  lijnUren?: number;
  samenvatting?: string;
}

async function main() {
  console.log(`[samenvattingen] sessie ${SESSION_ID} — apply=${APPLY}`);
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
  const scenarios = s7.scenarios as Record<ScenarioKey, ScenarioBlok>;

  const beforeAfter: Record<ScenarioKey, { voor: string; na: string }> = {
    advies: { voor: "", na: "" },
    plus20: { voor: "", na: "" },
    optimaal: { voor: "", na: "" },
    min20: { voor: "", na: "" },
  };

  for (const k of ["advies", "plus20", "optimaal", "min20"] as ScenarioKey[]) {
    const scen = scenarios[k];
    if (!scen) {
      console.warn(`[skip] scenario ${k} bestaat niet`);
      continue;
    }
    if ((scen as any).samenvattingHandmatigBewerkt) {
      console.log(`  ⏭ ${k}: handmatig bewerkt, overslaan`);
      continue;
    }
    beforeAfter[k].voor = scen.samenvatting || "";
    beforeAfter[k].na = SAMENVATTINGEN[k];

    console.log(`\n=== ${k.toUpperCase()} ===`);
    console.log(`[voor] ${(scen.samenvatting || "").substring(0, 200)}...`);
    console.log(`[na]   ${SAMENVATTINGEN[k].substring(0, 200)}...`);

    scen.samenvatting = SAMENVATTINGEN[k];
  }

  // Schrijf voor/na rapport
  const reportPath = join(process.cwd(), "SAMENVATTINGEN-VOOR-NA.json");
  writeFileSync(
    reportPath,
    JSON.stringify({ sessieId: SESSION_ID, voor_na: beforeAfter }, null, 2),
    "utf-8",
  );
  console.log(`\n✓ Voor/na rapport in ${reportPath}`);

  if (!APPLY) {
    console.log("\n[dry-run] Geen wijzigingen geschreven. Gebruik --apply.");
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
