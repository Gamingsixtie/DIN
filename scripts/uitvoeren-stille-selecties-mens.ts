// Uitvoeren stille selecties MENS — sessie d8b97442
//
// Analoog aan scripts/uitvoeren-stille-selecties.ts (data_systemen) maar voor mens-domein.
//
// Context:
//   - selectiePerDomein.mens telt 80 personen via 22 rollen.
//   - vastgesteldeUrenPerInspanning[mens].rollen[] geeft uren aan 64 personen
//     verdeeld over 10 rollen.
//   - 16 personen (12 unieke rol-IDs) zijn 'stille selecties' — wel aangevinkt
//     voor mens-domein maar zonder uren-toewijzing in de inspanning
//     "Gespreksvaardigheidstraining outside-in".
//
// Classificatie:
//
//   CAT 1 — uren toevoegen (5 personen / 5 rol-IDs):
//     accountmanager_a (1)            → trainings-deelnemer (klantgesprek-rol)
//     accountmanager_b (1)            → trainings-deelnemer (klantgesprek-rol)
//     klantenservice_a (1)            → trainings-deelnemer (klantgesprek-rol)
//     klantenservice_b (1)            → trainings-deelnemer (klantgesprek-rol)
//     teamleider_klantenservice (1)   → coördinator (analoog Manager Klantcontact)
//   Onderbouwing: alle accountmanager- en klantenservice-rollen hebben directe
//   klantcontact-functie. De gespreksvaardigheidstraining outside-in is bedoeld
//   voor het volledige klantcontact-team. Acc C (7p) + KS C (28p) zijn al
//   trainees met 46u (24u blok 1 + 22u blok 2). Acc A/B en KS A/B zijn dezelfde
//   functie-familie en horen dus mee. Teamleider klantenservice is parallel
//   aan Manager Klantcontact (40u coördinatie-uren over 4 jaar advies).
//
//   CAT 2 — stakeholders (8 personen / 6 rol-IDs):
//     productmanager_dst (3)          → programma-stakeholder, geen training
//     productmanager_klt (2)          → idem
//     productmanager_int_zak (2)      → idem
//     campagne_marketeer_a (1)        → input/casuïstiek leverancier (geen klantgesprek-rol)
//     campagne_marketeer_b (1)        → idem
//     junior_marketeer_prof (1)       → idem
//   Onderbouwing: productmanagers zijn programma-eigenaar voor sectorale
//   verankering van outside-in werkwijzen, geen actieve gesprekstrainees.
//   Marketeers leveren campagne-data + casuïstiek voor outside-in maar nemen
//   niet deel aan klantgesprek-training (want geen klantcontact-rol).
//
//   CAT 3 — review (1 persoon / 1 rol-ID):
//     mdw_binnendienst_a (1)          → review-vraag aan user
//   Onderbouwing: in cito-functies.ts heeft Mdw binnendienst A relevantie
//   alleen voor 'processen', niet voor 'mens'. Tegelijk doen 7 personen van
//   de B-variant wél mee als trainee. Onduidelijk of de A-medewerker
//   (junior, schaal 8) daadwerkelijk klantcontact heeft of meer
//   binnen-administratief is.
//
// Wat dit script doet:
//   1. Cat 1 — voegt 5 rollen (accountmanager_a/b, klantenservice_a/b,
//      teamleider_klantenservice) toe aan vastgesteldeUrenPerInspanning[mens]
//      en aan scenarios[].domeinen[mens].jaren[].rollen met juiste verdeling
//      per scenario. Updates aggregaten.
//   2. Cat 2 — markeert 6 rol-IDs in selectiePerDomein.mens met
//      stakeholder=true + stakeholderToelichting.
//   3. Cat 3 — markeert 1 rol-ID met reviewVereist=true + reviewVraag.
//
// Idempotent via marker `stilleSelectiesMensDoorgevoerd` op stap7-state.
//
// Usage: npx tsx scripts/uitvoeren-stille-selecties-mens.ts

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
    const key = t.substring(0, e).trim();
    const val = t.substring(e + 1).trim().replace(/^["']|["']$/g, "");
    if (!process.env[key]) process.env[key] = val;
  }
}
loadEnvFile(join(process.cwd(), ".env.local"));

const SESSION_ID = "d8b97442-ce8f-4134-b2c7-67dc8e3a3f93";

// ─────────────────────────────────────────────────────────────────────────────
// Cat. 1 — uren-toevoegingen (vastgestelde-uren)
// ─────────────────────────────────────────────────────────────────────────────

type RolUren = {
  functieId: string;
  functieNaam: string;
  afdeling: string;
  urenTotaal: number;       // advies-basis (4 jaar)
  rolType: "trainee" | "coordinator";
  onderbouwing: string;
};

const TRAINEE_BASIS_PER_PERSOON = 46; // 24u blok 1 + 22u blok 2 — zelfde als bestaande trainees
const COORDINATOR_BASIS = 40;          // 10u/jaar × 4 jaar (advies) — analoog Manager Klantcontact

const CAT1_VASTGESTELDE: RolUren[] = [
  {
    functieId: "accountmanager_a",
    functieNaam: "Accountmanager A",
    afdeling: "Klantcontact",
    urenTotaal: TRAINEE_BASIS_PER_PERSOON, // 1 persoon × 46u
    rolType: "trainee",
    onderbouwing:
      "Stille selectie geconcretiseerd als trainings-deelnemer. Accountmanager A (junior, schaal 10) heeft directe klantcontact-functie en hoort daarmee in de doelgroep van de gespreksvaardigheidstraining outside-in (zelfde functie-familie als Accountmanager C die wél met 7p was meegenomen). Verdeling: 24u blok 1 (2027) + 22u blok 2 (2028) = 46u × 1 persoon = 46u (advies-basis).",
  },
  {
    functieId: "accountmanager_b",
    functieNaam: "Accountmanager B",
    afdeling: "Klantcontact",
    urenTotaal: TRAINEE_BASIS_PER_PERSOON, // 1 persoon × 46u
    rolType: "trainee",
    onderbouwing:
      "Stille selectie geconcretiseerd als trainings-deelnemer. Accountmanager B (mid, schaal 11) heeft directe klantcontact-functie. Zelfde 46u-template als Accountmanager C / Accountmanager C Professionals. Verdeling: 24u blok 1 (2027) + 22u blok 2 (2028) = 46u × 1 persoon = 46u (advies-basis).",
  },
  {
    functieId: "klantenservice_a",
    functieNaam: "Klantenservice medewerker A",
    afdeling: "Klantcontact",
    urenTotaal: TRAINEE_BASIS_PER_PERSOON, // 1 persoon × 46u
    rolType: "trainee",
    onderbouwing:
      "Stille selectie geconcretiseerd als trainings-deelnemer. Klantenservice medewerker A (junior, schaal 6) heeft volle klantcontact-functie (telefoon/chat). Outside-in gespreksvaardigheid is essentieel voor alle KS-niveaus, niet alleen de 28 KS C-medewerkers. Verdeling: 24u blok 1 (2027) + 22u blok 2 (2028) = 46u × 1 persoon = 46u (advies-basis).",
  },
  {
    functieId: "klantenservice_b",
    functieNaam: "Klantenservice medewerker B",
    afdeling: "Klantcontact",
    urenTotaal: TRAINEE_BASIS_PER_PERSOON, // 1 persoon × 46u
    rolType: "trainee",
    onderbouwing:
      "Stille selectie geconcretiseerd als trainings-deelnemer. Klantenservice medewerker B (schaal 7) heeft volle klantcontact-functie. Zelfde rationale als KS A: outside-in gespreksvaardigheid voor alle KS-niveaus. Verdeling: 24u blok 1 (2027) + 22u blok 2 (2028) = 46u × 1 persoon = 46u (advies-basis).",
  },
  {
    functieId: "teamleider_klantenservice",
    functieNaam: "Teamleider klantenservice",
    afdeling: "Klantcontact",
    urenTotaal: COORDINATOR_BASIS, // 1 persoon × 40u
    rolType: "coordinator",
    onderbouwing:
      "Stille selectie geconcretiseerd als coördinator-rol. Teamleider klantenservice (schaal 12) stuurt het KS-team aan dat met 30 medewerkers (KS A+B+C) deelneemt aan de training. Analoge coördinatie-rol naast Manager Klantcontact (40u over 4 jaar = 10u/jaar voor afstemming, planning, evaluatie team-deelname, individuele coaching gesprekken). Programma-aandeel 100% (training-coördinatie is nieuw werk, niet in lijn-functieprofiel).",
  },
];

const NUM_TRAINEES_NIEUW = 4; // accountmanager_a, b, klantenservice_a, b
// teamleider_klantenservice = coordinator (apart)

// ─────────────────────────────────────────────────────────────────────────────
// Cat. 2 — stakeholder-markers
// ─────────────────────────────────────────────────────────────────────────────

const CAT2_STAKEHOLDERS: Record<string, string> = {
  productmanager_dst:
    "Programma-eigenaar voor sectorale verankering van outside-in werkwijzen in PO/DST-product. Geen actieve gesprekstrainee — productmanagers leveren input voor doelgroep-analyse en review uitkomsten klantgesprek-aanpak.",
  productmanager_klt:
    "Programma-eigenaar voor sectorale verankering van outside-in werkwijzen in VO/KLT-product. Geen actieve gesprekstrainee — levert input doelgroep-analyse en review uitkomsten klantgesprek-aanpak.",
  productmanager_int_zak:
    "Programma-eigenaar voor sectorale verankering van outside-in werkwijzen in Internationaal & Zakelijk-portfolio. Geen actieve gesprekstrainee — levert input doelgroep-analyse en review uitkomsten.",
  campagne_marketeer_a:
    "Levert campagne-data + casuïstiek (klantsignalen, marktonderzoek) als input voor outside-in werkwijze. Geen klantcontact-rol → geen trainings-deelnemer voor gespreksvaardigheid.",
  campagne_marketeer_b:
    "Levert campagne-data + casuïstiek (klantsignalen, marktonderzoek) als input voor outside-in werkwijze. Geen klantcontact-rol → geen trainings-deelnemer voor gespreksvaardigheid.",
  junior_marketeer_prof:
    "Levert campagne-data + sector-specifieke casuïstiek voor outside-in werkwijze (Professionals). Geen klantcontact-rol → geen trainings-deelnemer voor gespreksvaardigheid.",
};

// ─────────────────────────────────────────────────────────────────────────────
// Cat. 3 — review-vereist
// ─────────────────────────────────────────────────────────────────────────────

const CAT3_REVIEW: Record<string, string> = {
  mdw_binnendienst_a:
    "Heeft Medewerker binnendienst A (junior, schaal 8) daadwerkelijk klantcontact en is dus trainee voor gespreksvaardigheid? Of is deze rol vooral binnen-administratief (cito-functies.ts geeft alleen 'processen'-relevantie, niet 'mens')? Zo ja → 46u trainee-uren toevoegen analoog Mdw binnendienst B (7p × 46u = 322u). Zo nee → stakeholder-label of verwijderen uit mens-selectie.",
};

// ─────────────────────────────────────────────────────────────────────────────
// Main
// ─────────────────────────────────────────────────────────────────────────────

type Json = Record<string, unknown>;

type Rol = {
  functieId: string;
  functieNaam: string;
  afdeling: string;
  uren: number;
  uurtarief: number;
  kosten: number;
};
type Jaar = {
  jaar: number;
  rollen: Rol[];
  activiteit?: string;
  totaalUren: number;
  totaalKosten: number;
};
type Domein = {
  domein: string;
  jaren: Jaar[];
  totaalUren: number;
  totaalKosten: number;
  motivatie?: string;
  programmaPct?: number;
};
type Scenario = {
  aantalJaren: number;
  domeinen: Domein[];
  totalenPerJaar: Array<{
    jaar: number;
    uren: number;
    kosten: number;
    urenBudget?: number;
    urenGap?: number;
  }>;
  totaalUren: number;
  totaalKosten: number;
  uurtariefGebruikt?: number;
};

function pickUurtariefVoorJaar(jaarRollen: Array<{ uurtarief?: number }>, fallback: number): number {
  const tarieven = jaarRollen.map((r) => r.uurtarief).filter((x): x is number => typeof x === "number");
  if (tarieven.length === 0) return fallback;
  const sorted = [...tarieven].sort((a, b) => a - b);
  return sorted[Math.floor(sorted.length / 2)];
}

async function main() {
  const supa = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
  );

  const { data: row, error } = await supa
    .from("din_sessions")
    .select("data")
    .eq("id", SESSION_ID)
    .maybeSingle();

  if (error || !row) {
    console.error("Sessie niet gevonden:", error);
    process.exit(1);
  }

  const sess = row.data as Json;
  const backupPath = join(process.cwd(), `backup-stille-selecties-mens-${Date.now()}.json`);
  writeFileSync(backupPath, JSON.stringify(sess, null, 2), "utf-8");
  console.log(`✓ Backup geschreven naar ${backupPath}`);

  const wiz = (sess.crossAnalyseWizard as Json | undefined) ?? {};
  const stepResults = (wiz.stepResults as Json | undefined) ?? {};
  const stap4 = (stepResults.stap4 as Json | undefined) ?? {};
  const stap7 = stap4.stap7InterneUren as Json | undefined;
  if (!stap7) {
    console.error("Geen stap7InterneUren-state — afgebroken");
    process.exit(1);
  }

  const log: string[] = [];

  // Idempotentie via marker
  const eerdereMarker =
    (stap7.stilleSelectiesMensDoorgevoerd as Record<string, unknown> | undefined) ?? {};
  const cat1VastgesteldEerderUitgevoerd = eerdereMarker.cat1_vastgesteld === "uitgevoerd";
  const cat1ScenariosEerderUitgevoerd = eerdereMarker.cat1_scenarios === "uitgevoerd";

  // ───── 1. Cat. 1 — uren toevoegen aan vastgesteldeUrenPerInspanning ─────
  const vastgesteld = stap7.vastgesteldeUrenPerInspanning as Array<{
    domein: string;
    rollen: Array<{
      functieId: string;
      functieNaam: string;
      afdeling?: string;
      urenTotaal: number;
      onderbouwing?: string;
    }>;
  }>;

  const mensBlok = vastgesteld.find((x) => x.domein === "mens");
  if (!mensBlok) {
    console.error("Geen mens-blok in vastgesteldeUrenPerInspanning");
    process.exit(1);
  }

  let cat1VastgesteldStatus: "uitgevoerd" | "overgeslagen-reeds-uitgevoerd" = "uitgevoerd";
  if (!cat1VastgesteldEerderUitgevoerd) {
    for (const cat1 of CAT1_VASTGESTELDE) {
      const bestaand = mensBlok.rollen.findIndex((r) => r.functieId === cat1.functieId);
      const record = {
        functieId: cat1.functieId,
        functieNaam: cat1.functieNaam,
        afdeling: cat1.afdeling,
        urenTotaal: cat1.urenTotaal,
        onderbouwing: cat1.onderbouwing,
      };
      if (bestaand >= 0) {
        mensBlok.rollen[bestaand] = record;
        log.push(
          `[CAT1] vastgestelde-uren VERVANGEN (was reeds aanwezig): ${cat1.functieNaam} → ${cat1.urenTotaal}u`,
        );
      } else {
        mensBlok.rollen.push(record);
        log.push(
          `[CAT1] vastgestelde-uren toegevoegd: ${cat1.functieNaam} → ${cat1.urenTotaal}u (${cat1.afdeling})`,
        );
      }
    }
  } else {
    cat1VastgesteldStatus = "overgeslagen-reeds-uitgevoerd";
    log.push(`[CAT1] OVERGESLAGEN — eerdere uitvoering geregistreerd via marker (idempotent).`);
  }

  // ───── 2. Cat. 1 — scenarios bijwerken ─────
  // Strategie: gebruik per-jaar templates uit bestaande mens-domein scenario:
  //   - trainees: ratio = uren(mdw_binnendienst_b in dat jaar) / 7 — vermenigvuldig met 4 (acc_a, acc_b, ks_a, ks_b)
  //   - coordinator (teamleider_klantenservice): ratio = uren(manager_klantcontact in dat jaar) — × 1
  // Update aggregaten (jaar, domein, scenario, totalenPerJaar)

  const scenarios = stap7.scenarios as Record<string, Json | null>;

  const oudeTotalen: Record<
    string,
    { totaalUren: number; totaalKosten: number; mensTotaalUren: number; mensTotaalKosten: number }
  > = {};
  const nieuweTotalen: Record<
    string,
    { totaalUren: number; totaalKosten: number; mensTotaalUren: number; mensTotaalKosten: number }
  > = {};
  const verdelingPerScenario: Record<
    string,
    Array<{ jaar: number; trainees4p: number; coord: number; totaal: number; kostenToegevoegd: number }>
  > = {};

  for (const [scKey, sc] of Object.entries(scenarios)) {
    if (!sc) continue;
    const scenario = sc as unknown as Scenario;

    const mensDomain = scenario.domeinen.find((d) => d.domein === "mens");
    if (!mensDomain) {
      log.push(`[CAT1-SCEN] ${scKey} — geen mens-domein — overgeslagen`);
      continue;
    }

    oudeTotalen[scKey] = {
      totaalUren: scenario.totaalUren,
      totaalKosten: scenario.totaalKosten,
      mensTotaalUren: mensDomain.totaalUren,
      mensTotaalKosten: mensDomain.totaalKosten,
    };

    if (cat1ScenariosEerderUitgevoerd) {
      log.push(`[CAT1-SCEN] ${scKey} — eerdere uitvoering geregistreerd via marker, overslaan`);
      nieuweTotalen[scKey] = oudeTotalen[scKey];
      continue;
    }

    mensDomain.jaren.sort((a, b) => a.jaar - b.jaar);

    let totaalToegevoegdTrainees = 0;
    let totaalToegevoegdCoord = 0;
    let totaalToegevoegdKosten = 0;
    const verdJr: Array<{
      jaar: number;
      trainees4p: number;
      coord: number;
      totaal: number;
      kostenToegevoegd: number;
    }> = [];

    for (const jaarBlok of mensDomain.jaren) {
      // Template-rollen
      const tmplTrainee = jaarBlok.rollen.find((r) => r.functieId === "mdw_binnendienst_b");
      const tmplCoord = jaarBlok.rollen.find((r) => r.functieId === "manager_klantcontact");

      // Per-1-trainee uren = round(template / 7); × 4 nieuwe trainees
      const traineePer1 = tmplTrainee ? Math.round(tmplTrainee.uren / 7) : 0;
      const traineesNieuwUren = traineePer1 * NUM_TRAINEES_NIEUW;
      // Coordinator uren = exact gelijk aan manager_klantcontact dat jaar
      const coordNieuwUren = tmplCoord ? tmplCoord.uren : 0;

      const tarief = pickUurtariefVoorJaar(jaarBlok.rollen, scenario.uurtariefGebruikt ?? 74);

      let dezeJaarKosten = 0;

      if (traineesNieuwUren > 0) {
        // Splits over 4 individuele rollen voor traceerbaarheid
        const each = Math.round(traineesNieuwUren / NUM_TRAINEES_NIEUW);
        const rest = traineesNieuwUren - each * NUM_TRAINEES_NIEUW; // afronding-correctie naar rol 1
        const traineeRollen: Array<{ id: string; naam: string; afd: string; uren: number }> = [
          { id: "accountmanager_a", naam: "Accountmanager A", afd: "Klantcontact", uren: each + rest },
          { id: "accountmanager_b", naam: "Accountmanager B", afd: "Klantcontact", uren: each },
          {
            id: "klantenservice_a",
            naam: "Klantenservice medewerker A",
            afd: "Klantcontact",
            uren: each,
          },
          {
            id: "klantenservice_b",
            naam: "Klantenservice medewerker B",
            afd: "Klantcontact",
            uren: each,
          },
        ];
        for (const tr of traineeRollen) {
          if (tr.uren <= 0) continue;
          const k = tr.uren * tarief;
          jaarBlok.rollen.push({
            functieId: tr.id,
            functieNaam: tr.naam,
            afdeling: tr.afd,
            uren: tr.uren,
            uurtarief: tarief,
            kosten: k,
          });
          dezeJaarKosten += k;
          totaalToegevoegdTrainees += tr.uren;
        }
      }

      if (coordNieuwUren > 0) {
        const k = coordNieuwUren * tarief;
        jaarBlok.rollen.push({
          functieId: "teamleider_klantenservice",
          functieNaam: "Teamleider klantenservice",
          afdeling: "Klantcontact",
          uren: coordNieuwUren,
          uurtarief: tarief,
          kosten: k,
        });
        dezeJaarKosten += k;
        totaalToegevoegdCoord += coordNieuwUren;
      }

      const dezeJaarUren = traineesNieuwUren + coordNieuwUren;
      jaarBlok.totaalUren = (jaarBlok.totaalUren ?? 0) + dezeJaarUren;
      jaarBlok.totaalKosten = (jaarBlok.totaalKosten ?? 0) + dezeJaarKosten;
      totaalToegevoegdKosten += dezeJaarKosten;

      // Update totalenPerJaar
      const tpj = scenario.totalenPerJaar?.find((t) => t.jaar === jaarBlok.jaar);
      if (tpj) {
        tpj.uren = (tpj.uren ?? 0) + dezeJaarUren;
        tpj.kosten = (tpj.kosten ?? 0) + dezeJaarKosten;
        if (typeof tpj.urenBudget === "number") {
          tpj.urenGap = tpj.uren - tpj.urenBudget;
        }
      }

      verdJr.push({
        jaar: jaarBlok.jaar,
        trainees4p: traineesNieuwUren,
        coord: coordNieuwUren,
        totaal: dezeJaarUren,
        kostenToegevoegd: dezeJaarKosten,
      });
    }

    // Update domein-totalen
    mensDomain.totaalUren += totaalToegevoegdTrainees + totaalToegevoegdCoord;
    mensDomain.totaalKosten += totaalToegevoegdKosten;

    // Update scenario-totalen
    scenario.totaalUren += totaalToegevoegdTrainees + totaalToegevoegdCoord;
    scenario.totaalKosten += totaalToegevoegdKosten;

    nieuweTotalen[scKey] = {
      totaalUren: scenario.totaalUren,
      totaalKosten: scenario.totaalKosten,
      mensTotaalUren: mensDomain.totaalUren,
      mensTotaalKosten: mensDomain.totaalKosten,
    };
    verdelingPerScenario[scKey] = verdJr;

    log.push(
      `[CAT1-SCEN] ${scKey}: +${totaalToegevoegdTrainees}u trainees (4p) +${totaalToegevoegdCoord}u tl_klantenservice = +${
        totaalToegevoegdTrainees + totaalToegevoegdCoord
      }u (€${totaalToegevoegdKosten.toLocaleString("nl-NL")}). mens-totaal ${
        oudeTotalen[scKey].mensTotaalUren
      } → ${nieuweTotalen[scKey].mensTotaalUren}u. scenario-totaal ${
        oudeTotalen[scKey].totaalUren
      } → ${nieuweTotalen[scKey].totaalUren}u.`,
    );
  }

  // ───── 3. Cat. 2 + Cat. 3 — markers in selectiePerDomein.mens ─────
  const selectiePerDomein = (stap7.selectiePerDomein as Json | undefined) ?? {};
  const mensSel = (selectiePerDomein as Record<string, Record<string, Json>>).mens ?? {};
  let cat2Done = 0;
  let cat3Done = 0;
  if (!mensSel) {
    log.push("[CAT2/3] Geen mens-selectie — markers overgeslagen");
  } else {
    for (const [fid, toelichting] of Object.entries(CAT2_STAKEHOLDERS)) {
      if (mensSel[fid]) {
        const obj = mensSel[fid] as Record<string, unknown>;
        obj.stakeholder = true;
        obj.stakeholderToelichting = `Stakeholder (review/input, geen uren-belasting): ${toelichting}`;
        cat2Done++;
      } else {
        log.push(`[CAT2-WARN] ${fid} niet gevonden in selectie mens — overgeslagen`);
      }
    }
    log.push(
      `[CAT2] ${cat2Done}/${Object.keys(CAT2_STAKEHOLDERS).length} stakeholder-markers gezet op selectiePerDomein.mens.<id>.stakeholder=true`,
    );

    for (const [fid, vraag] of Object.entries(CAT3_REVIEW)) {
      if (mensSel[fid]) {
        const obj = mensSel[fid] as Record<string, unknown>;
        obj.reviewVereist = true;
        obj.reviewVraag = vraag;
        cat3Done++;
      } else {
        log.push(`[CAT3-WARN] ${fid} niet gevonden in selectie mens — overgeslagen`);
      }
    }
    log.push(
      `[CAT3] ${cat3Done}/${Object.keys(CAT3_REVIEW).length} reviewVereist-markers gezet op selectiePerDomein.mens.<id>.reviewVereist=true`,
    );
  }

  // Marker
  (stap7 as Record<string, unknown>).stilleSelectiesMensDoorgevoerd = {
    timestamp: new Date().toISOString(),
    cat1_vastgesteld: cat1VastgesteldStatus,
    cat1_scenarios: cat1ScenariosEerderUitgevoerd ? "overgeslagen-reeds-uitgevoerd" : "uitgevoerd",
    cat2_count: Object.keys(CAT2_STAKEHOLDERS).length,
    cat3_count: Object.keys(CAT3_REVIEW).length,
    oudeTotalen,
    nieuweTotalen,
    verdelingPerScenario,
  };

  // ───── Persist ─────
  const { error: upErr } = await supa
    .from("din_sessions")
    .update({ data: sess })
    .eq("id", SESSION_ID);
  if (upErr) {
    console.error("Update faalde:", upErr);
    process.exit(1);
  }

  console.log("\n=== UITGEVOERD ===\n");
  for (const l of log) console.log("  " + l);
  console.log(`\n✓ Supabase bijgewerkt voor sessie ${SESSION_ID}`);
  console.log("\n=== TOTALEN VOOR/NA ===");
  for (const [k, oud] of Object.entries(oudeTotalen)) {
    const nieuw = nieuweTotalen[k];
    if (!nieuw) continue;
    console.log(
      `  ${k}: scenario ${oud.totaalUren}u → ${nieuw.totaalUren}u (+${
        nieuw.totaalUren - oud.totaalUren
      }u) | mens-domein ${oud.mensTotaalUren}u → ${nieuw.mensTotaalUren}u (+${
        nieuw.mensTotaalUren - oud.mensTotaalUren
      }u) | mens-kosten €${oud.mensTotaalKosten.toLocaleString(
        "nl-NL",
      )} → €${nieuw.mensTotaalKosten.toLocaleString("nl-NL")}`,
    );
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
