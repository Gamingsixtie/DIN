// Uitvoeren stille selecties data_systemen — sessie d8b97442
//
// Doet:
//  1. Cat. 1 (4 personen): voeg manager_klantcontact (1×) en accountmanager_c_prof (3×)
//     toe aan vastgesteldeUrenPerInspanning[data_systemen].rollen, en aan
//     scenarios[].domeinen[data_systemen].jaren[].rollen met juiste verdeling per scenario.
//     Updates aggregaten (jaar-, domein-, scenario-, totalenPerJaar-totalen).
//  2. Cat. 2 (12 stakeholders): markeer functieIds in selectiePerDomein.data_systemen
//     met stakeholder=true + stakeholderToelichting.
//  3. Cat. 3 (2 onbekenden): markeer functieIds met reviewVereist=true + reviewVraag.
//
// Idempotent: detecteert eerdere uitvoering via 'stilleSelectiesDoorgevoerd' marker
// op selectiePerDomein.data_systemen.<id>.stakeholder/.reviewVereist en op de
// bijgewerkte vastgestelde-uren-rol-ids manager_klantcontact / accountmanager_c_prof.
// Bij her-uitvoering: skip de cat-1 uren-toevoeging (anders dubbel-tellen),
// herzet/overschrijf de cat-2/cat-3 markers (kan veilig opnieuw).
//
// Usage: npx tsx scripts/uitvoeren-stille-selecties.ts

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
// Cat. 1 — uren-toevoegingen
// ─────────────────────────────────────────────────────────────────────────────

type RolUren = {
  functieId: string;
  functieNaam: string;
  afdeling: string;
  urenTotaal: number;
  onderbouwing: string;
};

const CAT1_ONDERBOUWING = (rolKort: string) =>
  `Aanvullende CRM-rol naast eerder vastgestelde uren in mens-domein (zelfde persoon, andere activiteit). ${rolKort} CRM-werk = stuurgroep + acceptatietest + adoption — verschillend van mens-werk = trainings-coördinatie/deelname. Programma-aandeel 70% (CRM-adoption + acceptatietest = nieuw werk); 30% lijn (stuurgroep-tijd valt deels in functieprofiel).`;

const CAT1_VASTGESTELDE: RolUren[] = [
  {
    functieId: "manager_klantcontact",
    functieNaam: "Manager Klantcontact",
    afdeling: "Klantcontact",
    urenTotaal: 28, // 1 persoon × 28u (advies-basis); scenario-schaling gebeurt in scenario-update
    onderbouwing:
      CAT1_ONDERBOUWING("1 persoon × 28u (advies-basis):") +
      " Verdeling: CRM-stuurgroep (16u over 4j) + adoption-leiderschap klantenservice-team (12u in adoptiefasen).",
  },
  {
    functieId: "accountmanager_c_prof",
    functieNaam: "Accountmanager C (Professionals)",
    afdeling: "Sector Professionals",
    urenTotaal: 108, // 3 personen × 36u? actually 9u/jr/persoon × 4j = 36u, ×3 = 108 (advies-basis)
    onderbouwing:
      CAT1_ONDERBOUWING("3 personen × 36u (advies-basis, 9u/jr/persoon × 4 jaar):") +
      " Verdeling: CRM-eindgebruiker (acceptatietest 2027) + sectorconfiguratie-input (2027–2028) + key-user-training (2028).",
  },
];

// Per-scenario per-jaar verdeling (uren TOTAAL voor beide rollen samen)
// Combined totals: advies 28+108=136 (4j); plus20 35+135=170 (5j);
//                  optimaal 49+189=238 (7j); min20 70+270=340 (10j)
// Je deelt deze over de jaren als "verdeling = [j1, j2, ...]"; in totaal moet dit
// gelijk zijn aan combined-total. Verhouding manager_klantcontact:accountmanager_c_prof
// is altijd 28:108 = 7:27 → manager_klantcontact-aandeel ≈ 20.6% (28/136).
// We splitsen elke jaar-toevoeging in dezelfde verhouding.

const SCENARIO_VERDELING: Record<
  "advies" | "plus20" | "optimaal" | "min20",
  { jaren: number[]; combinedTotal: number; mgrTotal: number; accTotal: number }
> = {
  advies: { jaren: [27, 55, 27, 27], combinedTotal: 136, mgrTotal: 28, accTotal: 108 },
  plus20: { jaren: [34, 68, 34, 17, 17], combinedTotal: 170, mgrTotal: 35, accTotal: 135 },
  optimaal: { jaren: [48, 95, 48, 24, 12, 6, 5], combinedTotal: 238, mgrTotal: 49, accTotal: 189 },
  min20: {
    jaren: [68, 102, 51, 34, 34, 17, 17, 8, 5, 4],
    combinedTotal: 340,
    mgrTotal: 70,
    accTotal: 270,
  },
};

// Verdeel een jaar-totaal naar [mgrUren, accUren] zo dat sommen kloppen
function splitJaar(
  jaarTotaal: number,
  scenarioMgrTotal: number,
  scenarioAccTotal: number,
  scenarioCombinedTotal: number,
): { mgr: number; acc: number } {
  const mgrShare = scenarioMgrTotal / scenarioCombinedTotal;
  const mgr = Math.round(jaarTotaal * mgrShare);
  const acc = jaarTotaal - mgr;
  return { mgr, acc };
}

// Uurtarief per jaar uit bestaande data — leid af uit scenario, of fallback
// (scenarios bevatten al uurtariefGebruikt + per-rol uurtarief in elke jaar)
function pickUurtariefVoorJaar(jaarRollen: Array<{ uurtarief?: number }>, fallback: number): number {
  // pak hoogste-frequente uurtarief uit bestaande rollen in dat jaar
  const tarieven = jaarRollen.map((r) => r.uurtarief).filter((x): x is number => typeof x === "number");
  if (tarieven.length === 0) return fallback;
  // Mediaan (rustiger dan gemiddelde)
  const sorted = [...tarieven].sort((a, b) => a - b);
  return sorted[Math.floor(sorted.length / 2)];
}

// ─────────────────────────────────────────────────────────────────────────────
// Cat. 2 — stakeholder-markers
// ─────────────────────────────────────────────────────────────────────────────

const CAT2_STAKEHOLDERS: Record<string, string> = {
  productmanager_dst:
    "Levert input voor sector-specifieke product-attributen + acceptatietest filters",
  productmanager_kib:
    "Levert input voor sector-specifieke product-attributen + acceptatietest filters",
  productmanager_klt:
    "Levert input voor sector-specifieke product-attributen + acceptatietest filters",
  productmanager_lib:
    "Levert input voor sector-specifieke product-attributen + acceptatietest filters",
  productmanager_nt2:
    "Levert input voor sector-specifieke product-attributen + acceptatietest filters",
  productmanager_cvvo:
    "Levert input voor sector-specifieke product-attributen + acceptatietest filters",
  productmanager_int_zak:
    "Levert input voor sector-specifieke product-attributen + acceptatietest filters",
  productowner_a_website:
    "Bespreekt CRM-integraties met website-leads + productdata",
  productowner_b_producten:
    "Bespreekt CRM-integraties met website-leads + productdata",
  campagne_marketeer_a:
    "Levert campagne-data + consumenten-attributen voor CRM",
  campagne_marketeer_b:
    "Levert campagne-data + consumenten-attributen voor CRM",
  junior_marketeer_prof:
    "Levert campagne-data + consumenten-attributen voor CRM",
};

// ─────────────────────────────────────────────────────────────────────────────
// Cat. 3 — review-vereist
// ─────────────────────────────────────────────────────────────────────────────

const CAT3_REVIEW: Record<string, string> = {
  content_specialist:
    "Doet Content Specialist actief CRM-content-werk (gebruikersgidsen, in-app teksten, helpdesk-FAQ)? Zo ja → ~12-16u/jr toevoegen. Zo nee → stakeholder-label.",
  mdw_binnendienst_a_prof:
    "Is deze medewerker een actieve CRM-eindgebruiker (zoals klantenservice C in mens) of een per-ongeluk-aangevinkte naam? Zo ja → uren toevoegen + ook in mens een trainings-uur. Zo nee → stakeholder-label of verwijderen.",
};

// ─────────────────────────────────────────────────────────────────────────────
// Main
// ─────────────────────────────────────────────────────────────────────────────

type Json = Record<string, unknown>;

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
  // Backup-snapshot vóór wijziging
  const backupPath = join(process.cwd(), `backup-stille-selecties-${Date.now()}.json`);
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

  // Lees eerdere doorvoer-marker voor fijne idempotentie
  const eerdereMarker = (stap7.stilleSelectiesDoorgevoerd as Record<string, unknown> | undefined) ?? {};
  const cat1VastgesteldEerderUitgevoerd = eerdereMarker.cat1_vastgesteld === "uitgevoerd";
  const cat1ScenariosEerderUitgevoerd = eerdereMarker.cat1_scenarios === "uitgevoerd";

  // ───── 1. Cat. 1 — uren toevoegen aan vastgesteldeUrenPerInspanning ─────
  const vastgesteld = (stap7.vastgesteldeUrenPerInspanning as Array<{
    domein: string;
    rollen: Array<{ functieId: string; functieNaam: string; afdeling?: string; urenTotaal: number; onderbouwing?: string }>;
  }>);

  const dsBlok = vastgesteld.find((x) => x.domein === "data_systemen");
  if (!dsBlok) {
    console.error("Geen data_systemen-blok in vastgesteldeUrenPerInspanning");
    process.exit(1);
  }

  let cat1VastgesteldStatus: "uitgevoerd" | "overgeslagen-reeds-uitgevoerd" = "uitgevoerd";
  if (!cat1VastgesteldEerderUitgevoerd) {
    // Pad-vergrendeling: voeg toe (en de-dupliceer als toevallig al aanwezig)
    for (const cat1 of CAT1_VASTGESTELDE) {
      const bestaand = dsBlok.rollen.findIndex((r) => r.functieId === cat1.functieId);
      if (bestaand >= 0) {
        // Vervang met onze cat-1 versie (deterministisch idempotent)
        dsBlok.rollen[bestaand] = {
          functieId: cat1.functieId,
          functieNaam: cat1.functieNaam,
          afdeling: cat1.afdeling,
          urenTotaal: cat1.urenTotaal,
          onderbouwing: cat1.onderbouwing,
        };
        log.push(`[CAT1] vastgestelde-uren VERVANGEN (was reeds aanwezig): ${cat1.functieNaam} → ${cat1.urenTotaal}u`);
      } else {
        dsBlok.rollen.push({
          functieId: cat1.functieId,
          functieNaam: cat1.functieNaam,
          afdeling: cat1.afdeling,
          urenTotaal: cat1.urenTotaal,
          onderbouwing: cat1.onderbouwing,
        });
        log.push(`[CAT1] vastgestelde-uren toegevoegd: ${cat1.functieNaam} → ${cat1.urenTotaal}u (${cat1.afdeling})`);
      }
    }
  } else {
    cat1VastgesteldStatus = "overgeslagen-reeds-uitgevoerd";
    log.push(`[CAT1] OVERGESLAGEN — eerdere uitvoering geregistreerd via marker (idempotent).`);
  }

  // ───── 2. Cat. 1 — scenarios bijwerken ─────
  const scenarios = stap7.scenarios as Record<string, Json | null>;
  type Rol = { functieId: string; functieNaam: string; afdeling: string; uren: number; uurtarief: number; kosten: number };
  type Jaar = { jaar: number; rollen: Rol[]; activiteit?: string; totaalUren: number; totaalKosten: number };
  type Domein = { domein: string; jaren: Jaar[]; totaalUren: number; totaalKosten: number; motivatie?: string; programmaPct?: number };
  type Scenario = {
    aantalJaren: number;
    domeinen: Domein[];
    totalenPerJaar: Array<{ jaar: number; uren: number; kosten: number; urenBudget?: number; urenGap?: number }>;
    totaalUren: number;
    totaalKosten: number;
    uurtariefGebruikt?: number;
  };

  const oudeTotalen: Record<string, { totaalUren: number; totaalKosten: number; dsTotaalUren: number; dsTotaalKosten: number }> = {};
  const nieuweTotalen: Record<string, { totaalUren: number; totaalKosten: number; dsTotaalUren: number; dsTotaalKosten: number }> = {};

  for (const [scKey, sc] of Object.entries(scenarios)) {
    if (!sc) continue;
    const scenario = sc as unknown as Scenario;
    const verdeling = SCENARIO_VERDELING[scKey as keyof typeof SCENARIO_VERDELING];
    if (!verdeling) {
      log.push(`[CAT1-SCEN] ${scKey} — geen verdeling gedefinieerd — overgeslagen`);
      continue;
    }

    const dsDomain = scenario.domeinen.find((d) => d.domein === "data_systemen");
    if (!dsDomain) {
      log.push(`[CAT1-SCEN] ${scKey} — geen data_systemen-domein — overgeslagen`);
      continue;
    }

    oudeTotalen[scKey] = {
      totaalUren: scenario.totaalUren,
      totaalKosten: scenario.totaalKosten,
      dsTotaalUren: dsDomain.totaalUren,
      dsTotaalKosten: dsDomain.totaalKosten,
    };

    // Idempotentie-check: gebruik marker (bestaande kleine uren in scenario zijn
    // van eerdere AI-generatie en moeten niet als 'reeds gedaan' worden gezien;
    // de marker is de enige betrouwbare indicator dat ONS script de cat-1
    // verdeling reeds heeft toegepast).
    if (cat1ScenariosEerderUitgevoerd) {
      log.push(`[CAT1-SCEN] ${scKey} — eerdere uitvoering geregistreerd via marker, overslaan`);
      nieuweTotalen[scKey] = oudeTotalen[scKey];
      continue;
    }

    // Sorteer jaren op jaartal (defensief)
    dsDomain.jaren.sort((a, b) => a.jaar - b.jaar);
    const jaarVerdeling = verdeling.jaren;

    if (dsDomain.jaren.length < jaarVerdeling.length) {
      log.push(`[CAT1-SCEN] ${scKey} — minder jaren beschikbaar (${dsDomain.jaren.length}) dan verdeling-jaren (${jaarVerdeling.length}); knip verdeling af`);
    }

    // Som van extra uren over scenario voor controle
    let totaalToegevoegdMgr = 0;
    let totaalToegevoegdAcc = 0;
    let totaalToegevoegdKosten = 0;

    for (let idx = 0; idx < jaarVerdeling.length && idx < dsDomain.jaren.length; idx++) {
      const jaarTot = jaarVerdeling[idx];
      const { mgr, acc } = splitJaar(jaarTot, verdeling.mgrTotal, verdeling.accTotal, verdeling.combinedTotal);
      const jaarBlok = dsDomain.jaren[idx];

      // Bepaal uurtarief voor dit jaar — pak uit bestaande rollen
      const tarief = pickUurtariefVoorJaar(jaarBlok.rollen, scenario.uurtariefGebruikt ?? 74);

      if (mgr > 0) {
        const k = mgr * tarief;
        jaarBlok.rollen.push({
          functieId: "manager_klantcontact",
          functieNaam: "Manager Klantcontact",
          afdeling: "Klantcontact",
          uren: mgr,
          uurtarief: tarief,
          kosten: k,
        });
        jaarBlok.totaalUren = (jaarBlok.totaalUren ?? 0) + mgr;
        jaarBlok.totaalKosten = (jaarBlok.totaalKosten ?? 0) + k;
        totaalToegevoegdMgr += mgr;
        totaalToegevoegdKosten += k;
      }
      if (acc > 0) {
        const k = acc * tarief;
        jaarBlok.rollen.push({
          functieId: "accountmanager_c_prof",
          functieNaam: "Accountmanager C (Professionals)",
          afdeling: "Sector Professionals",
          uren: acc,
          uurtarief: tarief,
          kosten: k,
        });
        jaarBlok.totaalUren = (jaarBlok.totaalUren ?? 0) + acc;
        jaarBlok.totaalKosten = (jaarBlok.totaalKosten ?? 0) + k;
        totaalToegevoegdAcc += acc;
        totaalToegevoegdKosten += k;
      }

      // Update totalenPerJaar
      const tpj = scenario.totalenPerJaar?.find((t) => t.jaar === jaarBlok.jaar);
      if (tpj) {
        tpj.uren = (tpj.uren ?? 0) + mgr + acc;
        tpj.kosten = (tpj.kosten ?? 0) + (mgr + acc) * tarief;
        if (typeof tpj.urenBudget === "number") {
          tpj.urenGap = tpj.uren - tpj.urenBudget;
        }
      }
    }

    // Update domein-totalen
    dsDomain.totaalUren += totaalToegevoegdMgr + totaalToegevoegdAcc;
    dsDomain.totaalKosten += totaalToegevoegdKosten;

    // Update scenario-totalen
    scenario.totaalUren += totaalToegevoegdMgr + totaalToegevoegdAcc;
    scenario.totaalKosten += totaalToegevoegdKosten;

    nieuweTotalen[scKey] = {
      totaalUren: scenario.totaalUren,
      totaalKosten: scenario.totaalKosten,
      dsTotaalUren: dsDomain.totaalUren,
      dsTotaalKosten: dsDomain.totaalKosten,
    };

    log.push(
      `[CAT1-SCEN] ${scKey}: +${totaalToegevoegdMgr}u mgr_klantcontact +${totaalToegevoegdAcc}u acc_c_prof = +${totaalToegevoegdMgr + totaalToegevoegdAcc}u (€${totaalToegevoegdKosten.toLocaleString("nl-NL")}). ds-totaal ${oudeTotalen[scKey].dsTotaalUren} → ${nieuweTotalen[scKey].dsTotaalUren}u. scenario-totaal ${oudeTotalen[scKey].totaalUren} → ${nieuweTotalen[scKey].totaalUren}u.`,
    );
  }

  // ───── 3. Cat. 2 + Cat. 3 — markers in selectiePerDomein.data_systemen ─────
  const selectiePerDomein = (stap7.selectiePerDomein as Json | undefined) ?? {};
  const dsSel = (selectiePerDomein as Record<string, Record<string, Json>>).data_systemen ?? {};
  if (!dsSel) {
    log.push("[CAT2/3] Geen data_systemen-selectie — markers overgeslagen");
  } else {
    let cat2Done = 0;
    for (const [fid, toelichting] of Object.entries(CAT2_STAKEHOLDERS)) {
      if (dsSel[fid]) {
        const obj = dsSel[fid] as Record<string, unknown>;
        obj.stakeholder = true;
        obj.stakeholderToelichting = `Stakeholder (review/input, geen uren-belasting): ${toelichting}`;
        cat2Done++;
      } else {
        log.push(`[CAT2-WARN] ${fid} niet gevonden in selectie data_systemen — overgeslagen`);
      }
    }
    log.push(`[CAT2] ${cat2Done}/12 stakeholder-markers gezet op selectiePerDomein.data_systemen.<id>.stakeholder=true`);

    let cat3Done = 0;
    for (const [fid, vraag] of Object.entries(CAT3_REVIEW)) {
      if (dsSel[fid]) {
        const obj = dsSel[fid] as Record<string, unknown>;
        obj.reviewVereist = true;
        obj.reviewVraag = vraag;
        cat3Done++;
      } else {
        log.push(`[CAT3-WARN] ${fid} niet gevonden in selectie data_systemen — overgeslagen`);
      }
    }
    log.push(`[CAT3] ${cat3Done}/2 reviewVereist-markers gezet op selectiePerDomein.data_systemen.<id>.reviewVereist=true`);
  }

  // Marker dat actie is uitgevoerd (voor latere idempotentie)
  (stap7 as Record<string, unknown>).stilleSelectiesDoorgevoerd = {
    timestamp: new Date().toISOString(),
    cat1_vastgesteld: cat1VastgesteldStatus === "uitgevoerd" ? "uitgevoerd" : "overgeslagen-reeds-uitgevoerd",
    cat1_scenarios: cat1ScenariosEerderUitgevoerd ? "overgeslagen-reeds-uitgevoerd" : "uitgevoerd",
    cat2_count: Object.keys(CAT2_STAKEHOLDERS).length,
    cat3_count: Object.keys(CAT3_REVIEW).length,
    oudeTotalen,
    nieuweTotalen,
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
      `  ${k}: scenario ${oud.totaalUren}u → ${nieuw.totaalUren}u (+${nieuw.totaalUren - oud.totaalUren}u) | ds-domein ${oud.dsTotaalUren}u → ${nieuw.dsTotaalUren}u (+${nieuw.dsTotaalUren - oud.dsTotaalUren}u)`,
    );
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
