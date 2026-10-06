// Expert cultuur-domein: tekst-velden update voor alle 4 scenarios.
//
// Onder cultuur valt 1 inspanning: leiderschapsprogramma outside-in
// als gedeelde waarde cross-sectoraal verankeren.
// 9 personen in MT-coalitie:
//   - Leider: Yara (HR-manager / HR business partner) — categorie "leider"
//   - Kernteam (8): Directeur BV, Manager DT, 3 sectormanagers (PO/VO/Prof),
//     Manager Klantcontact, Teamleider Proces Support, 1× HR-medewerker
//
// Wijzigingen:
//   1. scenarios[scenkey].domeinen[cultuur].motivatie — uniform format met
//      werkelijke uren-totaal per scenario, programma vs lijn vs raadplegen,
//      verwijzing naar 9 MT-leden + Yara als leider, outside-in voorbeeldgedrag,
//      Cito-kerndoel koppeling.
//   2. scenarios[scenkey].domeinen[cultuur].jaren[].activiteit — per jaar
//      de fase + werkpakketten benoemd. Behoud van originele inhoud waar
//      het al klopt; we voegen alleen fase-prefix toe en harmoniseren.
//   3. vastgesteldeUrenPerInspanning[cultuur].rollen[].onderbouwing —
//      verouderde getallen / classificaties bijwerken.
//
// Idempotent met marker: stap7InterneUren.expertCultuurApplied === true.

import { createClient } from "@supabase/supabase-js";
import { existsSync, readFileSync } from "fs";
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
const SCEN_KEYS = ["min20", "advies", "plus20", "optimaal"] as const;
type ScenKey = (typeof SCEN_KEYS)[number];

const SCEN_LABEL: Record<ScenKey, string> = {
  min20: "−20% budget (10 jaar)",
  advies: "Snelste haalbaar (4 jaar)",
  plus20: "+20% budget (5 jaar)",
  optimaal: "Huidig budget (7 jaar)",
};

// Fase-mapping per scenario per jaar (relatief, vanaf startjaar 2026).
// Volgt John Kotter / Cito-outside-in: cultuur → mens → data/systemen → processen.
// Cultuur-fasen zelf (3.1.5 Faseringskader Cultuur, programmaboek):
//   Bewustwording → Coalitievorming → Acceptatie → Adoptie →
//   Waardenverankering → Borging in HR-cyclus → Continu rolmodel.
const CULTUUR_FASE_PER_JAAR: Record<ScenKey, Record<number, string>> = {
  // 4 jaar (2026-2029)
  advies: {
    2026: "Bewustwording & coalitievorming",
    2027: "Acceptatie & rolmodelgedrag",
    2028: "Adoptie",
    2029: "Waardenverankering",
  },
  // 5 jaar (2026-2030)
  plus20: {
    2026: "Bewustwording & coalitievorming",
    2027: "Acceptatie & rolmodelgedrag",
    2028: "Adoptie",
    2029: "Waardenverankering",
    2030: "Continue rolmodel-werking",
  },
  // 7 jaar (2026-2032)
  optimaal: {
    2026: "Bewustwording & coalitievorming",
    2027: "Acceptatie & rolmodelgedrag",
    2028: "Adoptie",
    2029: "Waardenverankering",
    2030: "Borging in HR-cyclus",
    2031: "Continue rolmodel-werking",
    2032: "Verankering",
  },
  // 10 jaar (2026-2035)
  min20: {
    2026: "Urgentiebesef",
    2027: "Coalitievorming",
    2028: "Acceptatie & rolmodelgedrag",
    2029: "Adoptie",
    2030: "Waardenverankering",
    2031: "Borging in HR-cyclus",
    2032: "Continue rolmodel-werking",
    2033: "Verankering",
    2034: "Continue ontwikkeling",
    2035: "Verankering in lijn",
  },
};

const ACTIVITEIT_PER_FASE: Record<string, string> = {
  Urgentiebesef:
    "Programma-ontwerp en MT-commitment-sessie; eerste externe begeleidingsdagen; formele verankering van outside-in als beoordelingscriterium voor leidinggevenden.",
  Coalitievorming:
    "Eerste leiderschapsworkshops, vorming kerngroep ambassadeurs over alle sectoren en gedragscontracten outside-in.",
  "Bewustwording & coalitievorming":
    "MT-besluit met beschermde sessietijd, programma-ontwerp met externe begeleider, eerste sessies cultureel vertrekpunt (lef, eigenaarschap, standvastigheid) en gedragscontracten outside-in; Yara coördineert en HR-medewerker verzorgt 360°-instrumentarium-voorbereiding.",
  "Acceptatie & rolmodelgedrag":
    "Cross-sectorale leerkringen, gezamenlijke klantbezoeken PO/VO/Zakelijk, integratie outside-in als criterium in beoordelings- en functioneringscyclus en aanpassing 360°-feedbackinstrument in HRM-cyclus.",
  Adoptie:
    "Intervisiesessies, 360°-feedback op leiderschapsgedrag, ritualisering van outside-in gedrag in MT-overleggen en eerste meting gedragsindicatoren bij de 9 leidinggevenden.",
  Waardenverankering:
    "Slotmeting cultuurindicatoren, borging in HR-cyclus en doorlopend rolmodelgedrag MT zonder externe begeleiding; afnemende externe begeleiding.",
  "Borging in HR-cyclus":
    "Borging in functioneringscyclus en HR-instrumentarium; jaarlijkse cultuurmeting; afnemende externe begeleiding; formele overdracht naar staande HRM-cyclus.",
  "Continue rolmodel-werking":
    "Doorlopende intervisie, lichte HR-coördinatie en jaarlijkse cultuurmeting; doorlopend rolmodelgedrag MT zonder externe begeleiding.",
  Verankering:
    "Cultuurverandering volledig verankerd in HR-cyclus en MT-rituelen; eindevaluatie 12-18 maanden na slotmeting.",
  "Continue ontwikkeling":
    "Doorlopende cultuurontwikkeling met jaarlijkse refresh-sessies; verankering in onboarding nieuwe leidinggevenden.",
  "Verankering in lijn":
    "Cultuurkader volledig in lijn-management; doorlopend rolmodelgedrag verankerd in dagelijkse routines en formele HR-instrumenten.",
};

function nl(n: number): string {
  return new Intl.NumberFormat("nl-NL").format(n);
}

function makeMotivatie(args: {
  scenKey: ScenKey;
  totaalUren: number;
  programmaUren: number;
  lijnUren: number;
  raadplegenUren: number;
  jaren: number;
}): string {
  const { scenKey, totaalUren, programmaUren, lijnUren, raadplegenUren, jaren } = args;
  const startJ = 2026;
  const eindJ = startJ + jaren - 1;
  const label = SCEN_LABEL[scenKey];
  return [
    `Leiderschapsprogramma 'Outside-in als gedeelde waarde' voor het volledige Cito-MT — 9 personen ` +
      `over de looptijd ${startJ}–${eindJ} (${label}). Werklast: ${nl(totaalUren)} uur totaal ` +
      `(programma ${nl(programmaUren)}u + lijn ${nl(lijnUren)}u${raadplegenUren ? ` + raadplegen ${nl(raadplegenUren)}u` : ""}).`,
    `Coalitie: Yara (HR-manager) is inspanningsleider en HR-eigenaar van het traject; de 8 kernteamleden zijn ` +
      `Directeur BV, Manager Data & Technologie, sectormanagers PO/VO/Professionals, Manager Klantcontact, ` +
      `Teamleider Proces Support en 1 HR-medewerker (uitvoering HRM-cyclus, 360°-instrument). Geen geconsulteerden, ` +
      `geen aparte trainings-deelnemers — de MT-leden zijn zelf de coalitie én de deelnemers aan hun eigen leiderschapsprogramma; coalitie-rol en deelnemer-rol vallen samen.`,
    `De inhoudelijke logica is dat outside-in alleen landt wanneer het MT zichtbaar voorgeleefd gedrag toont: ` +
      `pas dan komen de CRM-adoptie en de gespreksvaardigheid in de uitvoering daadwerkelijk in beweging. ` +
      `Daarom is dit domein — hoewel klein in euro — de tweede hefboom in de outside-in keten ` +
      `(volgorde: cultuur → mens → data/systemen → processen).`,
    `Aansluiting Cito-kerndoel: medewerker-ontwikkeling en commerciële slagkracht versterken; binnen het Cito-formatiekader ` +
      `(${jaren}-jarig scenario, stabiele FTE) zonder extra formatie. ` +
      `De fasering volgt het cultuur-faseringskader: bewustwording → coalitievorming → acceptatie → adoptie → ` +
      `waardenverankering → borging HR-cyclus.`,
  ].join(" ");
}

type Rol = {
  uren?: number;
  kosten?: number;
  lijnPct?: number;
  afdeling?: string;
  categorie?: string;
  functieId?: string;
  uurtarief?: number;
  functieNaam?: string;
  programmaPct?: number;
  raadplegenPct?: number;
  urenPerPersoon?: number;
};

type Jaar = {
  jaar: number;
  rollen?: Rol[];
  lijnUren?: number;
  activiteit?: string;
  totaalUren?: number;
  totaalKosten?: number;
  programmaUren?: number;
  raadplegenUren?: number;
};

type Domein = {
  domein: string;
  jaren?: Jaar[];
  totaalUren?: number;
  programmaUren?: number;
  lijnUren?: number;
  raadplegenUren?: number;
  motivatie?: string;
  koppeling?: string[];
  programmaPct?: number;
  totaalKosten?: number;
};

type Scenario = {
  domeinen?: Domein[];
};

type VUPIRol = {
  aantal?: number;
  lijnPct?: number;
  afdeling?: string;
  categorie?: string;
  functieId?: string;
  urenTotaal?: number;
  functieNaam?: string;
  onderbouwing?: string;
  programmaPct?: number;
  raadplegenPct?: number;
};

type VUPI = {
  domein: string;
  rollen: VUPIRol[];
  groepId?: string;
  inspanningTitel?: string;
};

const VUPI_ONDERBOUWING_NIEUW: Record<string, string> = {
  "custom-yara-cultuur-leider":
    "Yara (HR-manager) is formeel inspanningsleider voor het cultuur-domein conform de programmaorganisatie. Zij coördineert ontwerp, externe begeleiding, MT-commitment, leerkringen, intervisie en de integratie van outside-in in HR-cyclus. Lezing C: 80u/jr piek + 40u/jr niet-piek + 25u/jr borging.",
  "custom-1777458764027-8mxzp":
    "HR-medewerker (1 persoon, kernteam) — uitvoeringskracht achter de HR-cyclus en het 360°-feedback-instrument; ondersteunt Yara bij curriculumvoorbereiding, coördinatie leerkringen en verankering in functioneringscyclus. Werklastverdeling op programma-uren-basis: 2026: 40u + 2027: 60u + 2028: 40u + 2029: 20u = 160u (cumulatief over advies-scenario; in langere scenario's uitgesmeerd).",
  directeur_bv:
    "Directeur Bedrijfsvoering — eindverantwoordelijke voor outside-in voorbeeldgedrag binnen het MT en eigenaar van de programmatische verbinding tussen cultuur, processen en data. Kernteam-rol: cumulatief ~68u over 4 actieve jaren (2026: 20u, 2027: 24u, 2028: 16u, 2029: 8u).",
  sectormanager_po:
    "Sectormanager PO — kernteam, borgt outside-in voorgeleefd gedrag binnen sector PO via leerkringen en eigen MT-aansturing. Cumulatief 58u over 4 actieve jaren (2026: 20u + 2027: 15u + 2028: 15u + 2029: 8u).",
  sectormanager_vo:
    "Sectormanager VO — kernteam, borgt outside-in voorgeleefd gedrag binnen sector VO via leerkringen en eigen MT-aansturing. Cumulatief 58u over 4 actieve jaren (2026: 20u + 2027: 15u + 2028: 15u + 2029: 8u).",
  sectormanager_prof:
    "Sectormanager Professionals — kernteam, borgt outside-in voorgeleefd gedrag binnen sector Zakelijk/Professionals via leerkringen en eigen MT-aansturing. Cumulatief 58u over 4 actieve jaren (2026: 20u + 2027: 15u + 2028: 15u + 2029: 8u).",
  manager_klantcontact:
    "Manager Klantcontact — kernteam, primaire eigenaar van het outside-in werken in de operatie; coördineert de aansluiting tussen leiderschapsprogramma en de praktijk van klantcontact. Cumulatief +10u per jaar × 4 jaar (2026–2029) = 40u.",
  teamleider_ps:
    "Teamleider Proces Support — kernteam, brengt operations- en change-readiness-perspectief in en zorgt dat outside-in gedrag aansluit op procesondersteuning over sectoren heen. Cumulatief ~68u over 4 actieve jaren (2026: 20u, 2027: 24u, 2028: 16u, 2029: 8u).",
  manager_dt:
    "Manager Data & Technologie — kernteam in cultuur omdat IT-discipline binnen het MT zichtbaar moet voorleven dat outside-in werken óók geldt voor data- en systeemgedrag (geen tegenargument vs de aparte data-domein-bijdrage; daar zit Manager DT in een operationele rol, hier in MT-rol). Cumulatief ~68u over 4 actieve jaren: 20u + 24u + 16u + 8u.",
};

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
  if (loadErr || !data) {
    console.error("LOAD FOUT:", loadErr?.message ?? "geen data");
    process.exit(1);
  }
  const sess = data.data as Record<string, unknown>;
  const wiz = sess.crossAnalyseWizard as Record<string, unknown>;
  const stepResults = wiz.stepResults as Record<string, unknown>;
  const stap4 = stepResults.stap4 as Record<string, unknown>;
  const s7 = stap4.stap7InterneUren as Record<string, unknown>;

  const already = (s7.expertCultuurApplied as boolean | undefined) === true;
  if (already) {
    console.log("expertCultuurApplied: true — script idempotent. Verifieren wordt gedaan; geen herhaling van wijzigingen.");
  }

  console.log("=".repeat(80));
  console.log("EXPERT CULTUUR — sessie", SESSION_ID);
  console.log("=".repeat(80));

  // 1. Update vUPI cultuur onderbouwingen
  const vUPI = s7.vastgesteldeUrenPerInspanning as VUPI[];
  let vupiCount = 0;
  for (const v of vUPI) {
    if (v.domein !== "cultuur") continue;
    for (const r of v.rollen) {
      if (!r.functieId) continue;
      const nieuw = VUPI_ONDERBOUWING_NIEUW[r.functieId];
      if (nieuw && r.onderbouwing !== nieuw) {
        console.log(`  vUPI cultuur ${r.functieId}: onderbouwing herschreven`);
        r.onderbouwing = nieuw;
        vupiCount++;
      }
    }
  }
  console.log(`\n  vUPI cultuur onderbouwingen bijgewerkt: ${vupiCount}`);

  // 2. Update scenarios cultuur motivatie + jaren.activiteit
  const scenarios = s7.scenarios as Record<ScenKey, Scenario>;
  let scenCount = 0;
  let activiteitCount = 0;

  for (const skey of SCEN_KEYS) {
    const sc = scenarios[skey];
    if (!sc?.domeinen) {
      console.log(`  ! scenario ${skey} ontbreekt — overgeslagen`);
      continue;
    }
    const dCultuur = sc.domeinen.find((d) => d.domein === "cultuur");
    if (!dCultuur) {
      console.log(`  ! scenario ${skey} heeft geen cultuur-domein — overgeslagen`);
      continue;
    }

    // Lees werkelijke totalen uit data
    const totaal = dCultuur.totaalUren ?? 0;
    const programma = dCultuur.programmaUren ?? 0;
    const lijn = dCultuur.lijnUren ?? 0;
    const raadplegen = dCultuur.raadplegenUren ?? 0;
    const jarenCount = (dCultuur.jaren ?? []).length;

    const nieuweMotivatie = makeMotivatie({
      scenKey: skey,
      totaalUren: totaal,
      programmaUren: programma,
      lijnUren: lijn,
      raadplegenUren: raadplegen,
      jaren: jarenCount,
    });

    if (dCultuur.motivatie !== nieuweMotivatie) {
      console.log(
        `  scenario ${skey}: motivatie herschreven (${nl(totaal)}u tot, ${nl(programma)}u prog + ${nl(lijn)}u lijn${raadplegen ? ` + ${nl(raadplegen)}u raadpl` : ""}, ${jarenCount} jaren)`,
      );
      dCultuur.motivatie = nieuweMotivatie;
      scenCount++;
    }

    // Update jaren.activiteit
    for (const j of dCultuur.jaren ?? []) {
      const fase = CULTUUR_FASE_PER_JAAR[skey]?.[j.jaar];
      if (!fase) continue;
      const activiteitText = ACTIVITEIT_PER_FASE[fase];
      if (!activiteitText) continue;
      const nieuw = `[${fase}] ${activiteitText}`;
      if (j.activiteit !== nieuw) {
        j.activiteit = nieuw;
        activiteitCount++;
      }
    }
  }

  console.log(`  scenario motivaties bijgewerkt: ${scenCount}`);
  console.log(`  scenario jaren.activiteit bijgewerkt: ${activiteitCount}`);

  if (vupiCount === 0 && scenCount === 0 && activiteitCount === 0 && already) {
    console.log("\n✓ Geen wijzigingen — alles al toegepast.");
    return;
  }

  // 3. Marker zetten
  s7.expertCultuurApplied = true;
  s7.expertCultuurAppliedAt = new Date().toISOString();

  // 4. Schrijf terug
  const { error: writeErr } = await s
    .from("din_sessions")
    .update({ data: sess })
    .eq("id", SESSION_ID);
  if (writeErr) {
    console.error("WRITE FOUT:", writeErr.message);
    process.exit(1);
  }
  console.log(`\n✓ Geschreven naar Supabase.`);

  // 5. Verifieer
  console.log("\n--- VERIFICATIE ---");
  const { data: verify } = await s
    .from("din_sessions")
    .select("data")
    .eq("id", SESSION_ID)
    .maybeSingle();
  const vSess = verify!.data as Record<string, unknown>;
  const vS7 = (((vSess.crossAnalyseWizard as Record<string, unknown>).stepResults as Record<string, unknown>).stap4 as Record<string, unknown>).stap7InterneUren as Record<string, unknown>;
  console.log(`  expertCultuurApplied = ${(vS7 as Record<string, unknown>).expertCultuurApplied}`);

  const vScen = vS7.scenarios as Record<ScenKey, Scenario>;
  for (const skey of SCEN_KEYS) {
    const dC = vScen[skey]?.domeinen?.find((d) => d.domein === "cultuur");
    if (!dC) continue;
    const okMot = (dC.motivatie ?? "").includes("9 personen");
    const allActOk = (dC.jaren ?? []).every((j) => (j.activiteit ?? "").startsWith("["));
    console.log(`  ${skey}: motivatie ok=${okMot}; alle activiteiten gefaseerd ok=${allActOk}; ${dC.jaren?.length ?? 0} jaren`);
  }

  const vVupi = vS7.vastgesteldeUrenPerInspanning as VUPI[];
  const vC = vVupi.find((v) => v.domein === "cultuur");
  if (vC) {
    const allOnderbouwingenOk = vC.rollen.every((r) => {
      if (!r.functieId) return true;
      const expected = VUPI_ONDERBOUWING_NIEUW[r.functieId];
      if (!expected) return true;
      return r.onderbouwing === expected;
    });
    console.log(`  vUPI cultuur onderbouwingen ok = ${allOnderbouwingenOk}`);
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
