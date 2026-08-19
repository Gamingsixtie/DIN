// Expert processen-domein: tekst-velden update voor alle 4 scenarios.
//
// Onder processen valt 1 inspanning: uniforme klantinformatieprocessen +
// funnelgovernance cross-sectoraal inrichten.
// 6 personen klein kernteam:
//   - Leider: TBD-placeholder ("Inspanningsleider Processen — naam nog te
//     benoemen") — beslissing in stuurgroep; kandidaat is mogelijk
//     Projectmanager D (zit ook in kernteam) of een externe procesconsultant.
//   - Kernteam (5):
//       * Procesmanager / Data-analist Klant & Markt — structurele trekker
//         procesinventarisatie + cross-sectoraal funnelmodel.
//       * Projectmanager D (Data & Technologie) — co-trekker; dual-rol
//         (zit OOK in data_systemen-kernteam voor CRM-spoor).
//       * Procesondersteuner C (PO) — sector-specifieke implementatie + adoptie.
//       * Procesondersteuner C (VO) — idem.
//       * Procesondersteuner Professionals — idem.
//   - Geen geconsulteerden, geen trainings-deelnemers (klein domein, alle
//     6 personen zijn kernteam-uitvoerend).
//
// Wijzigingen:
//   1. scenarios[scenkey].domeinen[processen].motivatie — uniform format met
//      werkelijke uren-totaal per scenario (programma vs lijn vs raadplegen),
//      verwijzing naar TBD-leider + 5 kernteam, klein domein zonder trainings-
//      deelnemers, Cito-kerndoel cross-sectorale klant-perspectief in
//      werkprocessen, outside-in funnelgovernance.
//   2. scenarios[scenkey].domeinen[processen].jaren[].activiteit — per jaar
//      de fase + werkpakketten benoemd. Fase-cyclus: Inventarisatie →
//      Herontwerp → Pilot → Uitrol → Standaardisatie → Continu verbeteren →
//      Verankering.
//   3. vastgesteldeUrenPerInspanning[processen].rollen[].onderbouwing —
//      verouderde Procesmanager-narratief en classificatie bijwerken.
//      Belangrijk: bestaande "Procesmanager K&M is structurele trekker"
//      blijft kloppen, maar wordt geherformuleerd binnen het nieuwe TBD-
//      leider-frame: TBD is formeel inspanningsleider, Procesmanager K&M
//      is inhoudelijke trekker (kernteam, niet leider).
//
// Idempotent met marker: stap7InterneUren.expertProcessenApplied === true.

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

// Fase-mapping per scenario per jaar (vanaf startjaar 2026).
// Cyclus voor procesinrichting + funnelgovernance:
//   Inventarisatie → Herontwerp → Pilot → Uitrol → Standaardisatie →
//   Continu verbeteren → Verankering.
const PROCESSEN_FASE_PER_JAAR: Record<ScenKey, Record<number, string>> = {
  // 4 jaar (2026-2029) — strak gefaseerd
  advies: {
    2026: "Inventarisatie & herontwerp",
    2027: "Pilot & sectorvarianten",
    2028: "Uitrol & onboardingsprogramma",
    2029: "Standaardisatie & continu verbeteren",
  },
  // 5 jaar (2026-2030) — iets meer ruimte tussen pilot en uitrol
  plus20: {
    2026: "Inventarisatie & herontwerp",
    2027: "Pilot & sectorvarianten",
    2028: "Uitrol & onboardingsprogramma",
    2029: "Standaardisatie & proceseigenaarschap",
    2030: "Continu verbeteren",
  },
  // 7 jaar (2026-2032) — gespreide cyclus inclusief verankering
  optimaal: {
    2026: "Inventarisatie & herontwerp",
    2027: "Pilot & sectorvarianten",
    2028: "Uitrol & onboardingsprogramma",
    2029: "Standaardisatie & proceseigenaarschap",
    2030: "Continu verbeteren",
    2031: "Doorontwikkeling vastleggingsprotocollen",
    2032: "Verankering in lijn",
  },
  // 10 jaar (2026-2035) — uitgesmeerd; voorbereidingsjaar 2026, lange staart
  min20: {
    2026: "Voorbereiding & inventarisatie",
    2027: "Herontwerp & generiek kader",
    2028: "Pilot & sectorvarianten",
    2029: "Uitrol & onboardingsprogramma",
    2030: "Standaardisatie & proceseigenaarschap",
    2031: "Continu verbeteren — eerste cyclus",
    2032: "Continu verbeteren — tweede cyclus",
    2033: "Doorontwikkeling vastleggingsprotocollen",
    2034: "Doorontwikkeling onboarding & funneldefinities",
    2035: "Verankering in lijn",
  },
};

const ACTIVITEIT_PER_FASE: Record<string, string> = {
  "Voorbereiding & inventarisatie":
    "Smartprocess-inventarisatie huidige klantprocessen drie sectoren; eerste werksessies funneldefinities en KPI-systematiek; verkenning proceseigenaarschap-model. Bewust laag tempo om belasting kernteam (Procesmanager K&M + 3 procesondersteuners) over 10 jaar te spreiden.",
  "Inventarisatie & herontwerp":
    "Smartprocess as-is mapping per sector (PO/VO/Professionals); werkgroepsessies cross-sectoraal voor funneldefinities en KPI-systematiek; formele besluitvorming over generiek funnelkader vóór CRM-bouw; benoeming proceseigenaren in stuurgroep. Procesmanager K&M trekt inhoudelijk; Projectmanager D bewaakt aansluiting op CRM-spoor; 3 procesondersteuners leveren sectorinput.",
  "Herontwerp & generiek kader":
    "Externe procesbegeleider levert generiek funnelkader; werkgroepen valideren cross-sectorale invulling; sectorvarianten worden voorbereid; afstemming met data/systemen-spoor over vastleggingsprotocollen.",
  "Pilot & sectorvarianten":
    "Pilot vastleggingsprotocollen per funnelfase in één rol per sector parallel aan CRM-bouw; werksessies procesondersteuners (PO/VO/Professionals) — 66u per ondersteuner in piekjaar voor sectorvariant; externe procesbegeleiding ~20 dagen; eerste verbinding met data/systemen-implementatie.",
  "Uitrol & onboardingsprogramma":
    "Brede uitrol bij ~21 betrokken medewerkers; 9 multidisciplinaire deliverable-sessies (3 per sector) voor adoptie; onboardingsprogramma voor nieuwe medewerkers operationeel; structureel proceseigenaarschap start onder regie van Procesmanager K&M; Projectmanager D coördineert sessies.",
  "Standaardisatie & continu verbeteren":
    "Standaardisatie funnelgovernance organisatiebreed; structureel beheer proceseigenaarschap drie sectoren (4–8u/maand per Procesondersteuner); eerste verbetercyclus op basis van CRM-rapportages; jaarlijkse review funneldefinities.",
  "Standaardisatie & proceseigenaarschap":
    "Proceseigenaren per sector geactiveerd (4–8u/maand); naleving structureel in lijnoverleg; koppeling aan CRM-go-live; eerste jaarlijkse evaluatie funnelnaleving en KPI-bijstelling.",
  "Continu verbeteren":
    "Doorlopend proceseigenaarschap; jaarlijkse review van funneldefinities; bijstelling KPI's op basis van CRM-rapportages; harmonisatie procesvarianten met live-CRM; lichte cross-sectorale procesreview.",
  "Continu verbeteren — eerste cyclus":
    "Eerste verbeter-iteratie op basis van CRM-data: welke funnelfasen leveren onbetrouwbare signalen op en hoe scherpen we registratie aan; lichte cross-sectorale review.",
  "Continu verbeteren — tweede cyclus":
    "Tweede verbeter-iteratie en uitbreiding cross-sectorale managementrapportage op basis van funnelvergelijking; bijstelling vastleggingsprotocollen.",
  "Doorontwikkeling vastleggingsprotocollen":
    "Cross-sectorale procesreview en doorontwikkeling vastleggingsprotocollen op basis van adoptiemetrics; herijking funnelfasen op basis van CRM-data.",
  "Doorontwikkeling onboarding & funneldefinities":
    "Doorontwikkeling onboardingsprogramma voor nieuwe medewerkers; harmonisatie met evoluerende CRM-functionaliteit; onboardingsmateriaal digitaliseren.",
  "Verankering in lijn":
    "Volledige overdracht aan proceseigenaren in lijn; structureel beheer Smartprocess en jaarlijkse evaluatiecyclus; eindevaluatie funnelgovernance over de programmacyclus en input voor volgende portfoliocyclus.",
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
    `Uniforme klantinformatieprocessen en cross-sectorale funnelgovernance — klein kernteam van 6 personen ` +
      `over de looptijd ${startJ}–${eindJ} (${label}). Werklast: ${nl(totaalUren)} uur totaal ` +
      `(programma ${nl(programmaUren)}u + lijn ${nl(lijnUren)}u${raadplegenUren ? ` + raadplegen ${nl(raadplegenUren)}u` : ""}).`,
    `Coalitie: de inspanningsleider is op dit moment een TBD-placeholder ('Inspanningsleider Processen — naam ` +
      `nog te benoemen'); de stuurgroep neemt de definitieve benoeming nog. Mogelijke kandidaten zijn ` +
      `Projectmanager D (zit ook in dit kernteam) of een externe procesconsultant. ` +
      `Het 5-koppige kernteam bestaat uit Procesmanager / Data-analist Klant & Markt (inhoudelijke trekker, ` +
      `inventarisatie en cross-sectoraal funnelmodel), Projectmanager D (co-trekker met dual-rol naar het ` +
      `data/systemen-spoor — bewaakt aansluiting CRM ↔ procesinrichting) en drie Procesondersteuners C ` +
      `(PO, VO, Professionals) voor sector-specifieke implementatie en structureel proceseigenaarschap. ` +
      `Geen geconsulteerden, geen aparte trainings-deelnemers — dit is een klein domein waarin alle ` +
      `6 personen kernteam-uitvoerend zijn; sectoradoptie loopt via de eigen procesondersteuners en niet ` +
      `via een trainingsdoelgroep.`,
    `Aansluiting Cito-kerndoel: het cross-sectorale klant-perspectief verankeren in de werkprocessen — ` +
      `concreet via één gedeeld funnelmodel met sectorvarianten, vastleggingsprotocollen die direct ` +
      `koppelen aan CRM-data, en proceseigenaarschap dat de outside-in registratiediscipline borgt. ` +
      `Dit domein is in euro klein, maar inhoudelijk de scharnierfunctie tussen het CRM-platform en de ` +
      `dagelijkse uitvoering: zonder uniforme procesinrichting blijft CRM-data fragmentarisch en blijft ` +
      `outside-in een trainingsambitie zonder operationele borging.`,
    `Volgorde-context (Cito outside-in: cultuur → mens → data/systemen → processen): processen sluit de ` +
      `keten en is bewust het laatste domein dat 'volgroeit' — pas wanneer cultuur, gespreksvaardigheid en ` +
      `CRM voldoende landen kan funnelgovernance structureel werken. Binnen het Cito-formatiekader ` +
      `(${jaren}-jarig scenario, ~124 FTE Cito-breed) draait dit domein op een minimale formele ` +
      `bezetting; de werkelijke last zit in cross-sectorale afstemming en proceseigenaarschap.`,
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
  placeholderTBD?: boolean;
  tbdToelichting?: string;
};

type VUPI = {
  domein: string;
  rollen: VUPIRol[];
  groepId?: string;
  inspanningTitel?: string;
};

const VUPI_ONDERBOUWING_NIEUW: Record<string, string> = {
  "custom-inspanningsleider-processen-tbd":
    "Inspanningsleider Processen — TBD-placeholder. De stuurgroep moet de definitieve persoon nog benoemen; mogelijke kandidaten zijn Projectmanager D (zit ook in dit kernteam) of een externe procesconsultant met cross-sectorale ervaring. De rol stuurt de cross-sectorale governance + het generiek funnelkader, bewaakt afstemming tussen Procesmanager K&M (inhoudelijke trekker) en de drie procesondersteuners, en escaleert blokkades naar de stuurgroep. Lezing C: 80u/jr piek + 40u/jr niet-piek + 25u/jr borging — toegepast over de looptijd van het scenario. Programmaaandeel 90% (rolspecifieke programma-coördinatie); 10% lijn.",
  procesmanager_data:
    "Procesmanager / Data-analist Klant & Markt — kernteam, inhoudelijke trekker procesinventarisatie en cross-sectoraal funnelmodel (formeel ondergeschikt aan TBD-inspanningsleider, maar inhoudelijk leidend). Werklast geclusterd in 2026 (werkgroepsessies + besluitvorming proceseigenaarschap, ~66u: sessies 18u + voorbereiding 30u + cross-sectorale afstemming 6u + besluitvorming 12u) en in structureel beheer 2029+ (maandelijks overleg 12u + kwartaalrapportage 16u + ad-hoc 20u + herijking 8u ≈ 56u/jr). Tussenliggende jaren proportioneel aan budgetaandeel pilot/adoptie. Programmaaandeel 80%; 20% lijn.",
  projectmanager_d:
    "Projectmanager D — kernteam, co-trekker. Heeft dual-rol: zit ook in het data_systemen-kernteam voor het CRM-spoor en bewaakt vanuit die positie de directe aansluiting tussen procesinrichting en CRM-bouw. Inzet: 2026 ~66u als co-trekker werkgroepsessies; 2027 ~34u proportioneel pilotjaar; 2028 ~36u voor 9 multidisciplinaire deliverable-sessies (9 × 2u aanwezigheid + 2u voorbereiding); structureel ~15u/jr borging. Programmaaandeel 80%; 20% lijn. Belangrijke leesregel: uren van Projectmanager D worden afzonderlijk geteld in beide domeinen — geen dubbeltelling, want elk domein registreert het deel van zijn werklast dat aan dát domein wordt besteed.",
  procesondersteuner_po:
    "Procesondersteuner C (PO) — kernteam, sector-specifieke implementatie en adoptie cross-sectoraal vanuit het PO-perspectief. Piekjaar 2027 ca. 66u (werksessies 18u + voorbereiding sectorvariant 27u + afstemming CRM-datamodel 6u + documentatie 15u). Vanaf 2029 structureel proceseigenaarschap PO 4–8u/maand (afhankelijk van scenario; in advies-scenario verwerkt in collectief structureel-blok). Programmaaandeel 80%; 20% lijn.",
  procesondersteuner_vo:
    "Procesondersteuner C (VO) — kernteam, sector-specifieke implementatie en adoptie cross-sectoraal vanuit het VO-perspectief. Identieke 66u in piekjaar 2027 als PO-collega (werksessies 18u + voorbereiding sectorvariant 27u + afstemming CRM-datamodel 6u + documentatie 15u). Structureel proceseigenaarschap VO 4–8u/maand vanaf 2029. Programmaaandeel 80%; 20% lijn.",
  "custom-1777459472792-own3u":
    "Procesondersteuner Professionals — kernteam, sector-specifieke implementatie en adoptie cross-sectoraal vanuit het Professionals/Zakelijk-perspectief. Identieke 66u in piekjaar 2027 (werksessies 18u + voorbereiding sectorvariant 27u + afstemming CRM-datamodel 6u + documentatie 15u). Structureel proceseigenaarschap Professionals 4–8u/maand vanaf 2029. Programmaaandeel 80%; 20% lijn.",
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

  const already = (s7.expertProcessenApplied as boolean | undefined) === true;
  if (already) {
    console.log("expertProcessenApplied: true — script idempotent. Verifieren wordt gedaan; geen herhaling van wijzigingen.");
  }

  console.log("=".repeat(80));
  console.log("EXPERT PROCESSEN — sessie", SESSION_ID);
  console.log("=".repeat(80));

  // --- Verificatie: 6 personen totaal (TBD-leider + 5 kernteam) ---
  const sel = (s7.selectiePerDomein as Record<string, Record<string, { aantal?: number }>> | undefined)?.processen;
  if (sel) {
    const fnIds = Object.keys(sel);
    const totaal = Object.values(sel).reduce((a, v) => a + (v.aantal ?? 0), 0);
    console.log(`\n  selectiePerDomein.processen: ${fnIds.length} functies, ${totaal} personen`);
    if (totaal !== 6) {
      console.warn(`  ! VERWACHT 6 personen, gevonden ${totaal} — ga niet verder zonder check.`);
    }
  }

  // 1. Update vUPI processen onderbouwingen
  const vUPI = s7.vastgesteldeUrenPerInspanning as VUPI[];
  let vupiCount = 0;
  for (const v of vUPI) {
    if (v.domein !== "processen") continue;
    for (const r of v.rollen) {
      if (!r.functieId) continue;
      const nieuw = VUPI_ONDERBOUWING_NIEUW[r.functieId];
      if (nieuw && r.onderbouwing !== nieuw) {
        console.log(`  vUPI processen ${r.functieId}: onderbouwing herschreven`);
        r.onderbouwing = nieuw;
        vupiCount++;
      }
    }
  }
  console.log(`\n  vUPI processen onderbouwingen bijgewerkt: ${vupiCount}`);

  // 2. Update scenarios processen motivatie + jaren.activiteit
  const scenarios = s7.scenarios as Record<ScenKey, Scenario>;
  let scenCount = 0;
  let activiteitCount = 0;

  for (const skey of SCEN_KEYS) {
    const sc = scenarios[skey];
    if (!sc?.domeinen) {
      console.log(`  ! scenario ${skey} ontbreekt — overgeslagen`);
      continue;
    }
    const dProc = sc.domeinen.find((d) => d.domein === "processen");
    if (!dProc) {
      console.log(`  ! scenario ${skey} heeft geen processen-domein — overgeslagen`);
      continue;
    }

    const totaal = dProc.totaalUren ?? 0;
    const programma = dProc.programmaUren ?? 0;
    const lijn = dProc.lijnUren ?? 0;
    const raadplegen = dProc.raadplegenUren ?? 0;
    const jarenCount = (dProc.jaren ?? []).length;

    const nieuweMotivatie = makeMotivatie({
      scenKey: skey,
      totaalUren: totaal,
      programmaUren: programma,
      lijnUren: lijn,
      raadplegenUren: raadplegen,
      jaren: jarenCount,
    });

    if (dProc.motivatie !== nieuweMotivatie) {
      console.log(
        `  scenario ${skey}: motivatie herschreven (${nl(totaal)}u tot, ${nl(programma)}u prog + ${nl(lijn)}u lijn${raadplegen ? ` + ${nl(raadplegen)}u raadpl` : ""}, ${jarenCount} jaren)`,
      );
      dProc.motivatie = nieuweMotivatie;
      scenCount++;
    }

    for (const j of dProc.jaren ?? []) {
      const fase = PROCESSEN_FASE_PER_JAAR[skey]?.[j.jaar];
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
  s7.expertProcessenApplied = true;
  s7.expertProcessenAppliedAt = new Date().toISOString();

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
  console.log(`  expertProcessenApplied = ${(vS7 as Record<string, unknown>).expertProcessenApplied}`);

  const vScen = vS7.scenarios as Record<ScenKey, Scenario>;
  for (const skey of SCEN_KEYS) {
    const dP = vScen[skey]?.domeinen?.find((d) => d.domein === "processen");
    if (!dP) continue;
    const okMot = (dP.motivatie ?? "").includes("6 personen");
    const allActOk = (dP.jaren ?? []).every((j) => (j.activiteit ?? "").startsWith("["));
    console.log(`  ${skey}: motivatie ok=${okMot}; alle activiteiten gefaseerd ok=${allActOk}; ${dP.jaren?.length ?? 0} jaren`);
  }

  const vVupi = vS7.vastgesteldeUrenPerInspanning as VUPI[];
  const vP = vVupi.find((v) => v.domein === "processen");
  if (vP) {
    const allOnderbouwingenOk = vP.rollen.every((r) => {
      if (!r.functieId) return true;
      const expected = VUPI_ONDERBOUWING_NIEUW[r.functieId];
      if (!expected) return true;
      return r.onderbouwing === expected;
    });
    console.log(`  vUPI processen onderbouwingen ok = ${allOnderbouwingenOk}`);
    console.log(`  vUPI processen rollen totaal = ${vP.rollen.length} (verwacht 6)`);
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
