// Lezing A doorvoeren — alle aangemelde personen in selectiePerDomein krijgen
// uren toegewezen, gedifferentieerd per rolfunctie + CRM-intensiteit.
//
// Idempotent via marker stap7.lezingADoorgevoerd === true.
//
// Wat dit script doet:
//   1. Voegt 14 nieuwe rol-records toe aan vastgesteldeUrenPerInspanning[data_systemen].rollen
//   2. Voegt 12 nieuwe rol-records toe aan vastgesteldeUrenPerInspanning[mens].rollen
//   3. Verspreidt deze uren per scenario per jaar over scenarios[].domeinen[].jaren[].rollen
//   4. Werkt aggregaten bij: jaar-, domein-, scenario-totalen + totalenPerJaar
//   5. Draait marker interneUrenLezing om naar "A" met nieuwe overzicht-cijfers
//   6. Schrijft naar Supabase
//
// Usage: npx tsx scripts/lezing-a-doorvoeren.ts

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
// CONFIGURATIE — nieuwe rollen + uren-toewijzing per domein
// ─────────────────────────────────────────────────────────────────────────────

type RolDef = {
  functieId: string;
  functieNaam: string;
  afdeling: string;
  aantal: number;
  uurPerJaarPerPersoon: number; // u/jr/persoon — basis voor advies-scenario (4 jaar)
  programmaPct: number;
  onderbouwing: string;
  // curveType bepaalt fase-distributie per scenario
  curveType:
    | "ds_productmanager"      // acceptatietest-piek in J3, klein elders
    | "ds_productmanager_a"    // bredere multi-product input — zelfde curve, hogere uren
    | "ds_productowner"        // doorlopende integratie — vlak verspreid
    | "ds_marketeer"           // data-leverings-piek J2-J3 (realisatie)
    | "ds_junior_marketeer"    // idem maar lagere uren
    | "ds_content_specialist"  // continu onderhoud + helpdesk
    | "ds_mdw_eindgebruiker"   // eindgebruiker A-niveau, training-piek J3
    | "mens_trainee"           // trainee klantcontact, volgt klantenservice_c-curve
    | "mens_teamleider"        // coördinator, volgt manager_klantcontact mens-curve
    | "mens_stakeholder"       // 1 sessie/jr stakeholder-awareness, vlak
    | "mens_review";           // review-vraag — voor nu marker behouden, vlakke spreiding
};

const NIEUWE_ROLLEN_DS: RolDef[] = [
  {
    functieId: "productmanager_dst",
    functieNaam: "Productmanager B (DST)",
    afdeling: "Sector PO",
    aantal: 2,
    uurPerJaarPerPersoon: 12,
    programmaPct: 0.7,
    curveType: "ds_productmanager",
    onderbouwing:
      "Productmanager B sector levert input voor product-attributen in CRM-datamodel + acceptatietest 1–2 dagen per jaar. 2 personen × 12u/jr × 4 jaar = 96u programma-basis (advies-scenario). Programma-aandeel 70% (acceptatietest + sector-specifieke configuratie = nieuw werk); 30% lijn (productverantwoordelijkheid valt deels in functieprofiel).",
  },
  {
    functieId: "productmanager_kib",
    functieNaam: "Productmanager A (KiB)",
    afdeling: "Sector PO",
    aantal: 1,
    uurPerJaarPerPersoon: 14,
    programmaPct: 0.7,
    curveType: "ds_productmanager_a",
    onderbouwing:
      "Productmanager A sector heeft bredere multi-product-input voor CRM-datamodel (KiB-portfolio); 1 persoon × 14u/jr × 4 jaar = 56u programma-basis. Programma-aandeel 70% (acceptatietest + multi-product configuratie = nieuw werk); 30% lijn.",
  },
  {
    functieId: "productmanager_klt",
    functieNaam: "Productmanager B (KLT)",
    afdeling: "Sector VO",
    aantal: 1,
    uurPerJaarPerPersoon: 12,
    programmaPct: 0.7,
    curveType: "ds_productmanager",
    onderbouwing:
      "Productmanager B sector levert input voor product-attributen in CRM-datamodel + acceptatietest 1–2 dagen per jaar. 1 persoon × 12u/jr × 4 jaar = 48u programma-basis. Programma-aandeel 70%; 30% lijn.",
  },
  {
    functieId: "productmanager_lib",
    functieNaam: "Productmanager B (LiB)",
    afdeling: "Sector PO",
    aantal: 1,
    uurPerJaarPerPersoon: 12,
    programmaPct: 0.7,
    curveType: "ds_productmanager",
    onderbouwing:
      "Productmanager B sector levert input voor product-attributen in CRM-datamodel + acceptatietest 1–2 dagen per jaar. 1 persoon × 12u/jr × 4 jaar = 48u programma-basis. Programma-aandeel 70%; 30% lijn.",
  },
  {
    functieId: "productmanager_nt2",
    functieNaam: "Productmanager B (NT2 overheid)",
    afdeling: "Sector Professionals",
    aantal: 1,
    uurPerJaarPerPersoon: 12,
    programmaPct: 0.7,
    curveType: "ds_productmanager",
    onderbouwing:
      "Productmanager B sector levert input voor product-attributen in CRM-datamodel + acceptatietest 1–2 dagen per jaar. 1 persoon × 12u/jr × 4 jaar = 48u programma-basis. Programma-aandeel 70%; 30% lijn.",
  },
  {
    functieId: "productmanager_cvvo",
    functieNaam: "Productmanager B (CvVO)",
    afdeling: "Sector VO",
    aantal: 1,
    uurPerJaarPerPersoon: 12,
    programmaPct: 0.7,
    curveType: "ds_productmanager",
    onderbouwing:
      "Productmanager B sector levert input voor product-attributen in CRM-datamodel + acceptatietest 1–2 dagen per jaar. 1 persoon × 12u/jr × 4 jaar = 48u programma-basis. Programma-aandeel 70%; 30% lijn.",
  },
  {
    functieId: "productmanager_int_zak",
    functieNaam: "Productmanager A (Internationaal & Zakelijk)",
    afdeling: "Sector Professionals",
    aantal: 1,
    uurPerJaarPerPersoon: 14,
    programmaPct: 0.7,
    curveType: "ds_productmanager_a",
    onderbouwing:
      "Productmanager A sector heeft bredere multi-product-input voor CRM-datamodel (Internationaal + Zakelijk-portfolio); 1 persoon × 14u/jr × 4 jaar = 56u programma-basis. Programma-aandeel 70%; 30% lijn.",
  },
  {
    functieId: "productowner_a_website",
    functieNaam: "Productowner A website",
    afdeling: "Data & Technologie",
    aantal: 1,
    uurPerJaarPerPersoon: 20,
    programmaPct: 0.85,
    curveType: "ds_productowner",
    onderbouwing:
      "Doorlopende integratie website-leads → CRM vereist hogere belasting in alle programmajaren. 1 persoon × 20u/jr × 4 jaar = 80u programma-basis. Programma-aandeel 85% (website-CRM-koppeling is nieuw werk, vergelijkbaar met operationele D&T-rollen); 15% lijn.",
  },
  {
    functieId: "productowner_b_producten",
    functieNaam: "Productowner B producten",
    afdeling: "Data & Technologie",
    aantal: 1,
    uurPerJaarPerPersoon: 20,
    programmaPct: 0.85,
    curveType: "ds_productowner",
    onderbouwing:
      "Doorlopende integratie productdata → CRM vereist hogere belasting in alle programmajaren. 1 persoon × 20u/jr × 4 jaar = 80u programma-basis. Programma-aandeel 85% (productdata-CRM-koppeling is nieuw werk); 15% lijn.",
  },
  {
    functieId: "campagne_marketeer_a",
    functieNaam: "Campagne Marketeer A",
    afdeling: "Sector PO",
    aantal: 1,
    uurPerJaarPerPersoon: 10,
    programmaPct: 0.7,
    curveType: "ds_marketeer",
    onderbouwing:
      "Campagne-data → CRM voor leads (PO): voornamelijk in realisatiejaren wanneer CRM ingericht wordt. 1 persoon × 10u/jr × 4 jaar = 40u programma-basis. Programma-aandeel 70%; 30% lijn.",
  },
  {
    functieId: "campagne_marketeer_b",
    functieNaam: "Campagne Marketeer B",
    afdeling: "Sector VO",
    aantal: 1,
    uurPerJaarPerPersoon: 10,
    programmaPct: 0.7,
    curveType: "ds_marketeer",
    onderbouwing:
      "Campagne-data → CRM voor leads (VO): voornamelijk in realisatiejaren wanneer CRM ingericht wordt. 1 persoon × 10u/jr × 4 jaar = 40u programma-basis. Programma-aandeel 70%; 30% lijn.",
  },
  {
    functieId: "junior_marketeer_prof",
    functieNaam: "Junior Marketeer (Professionals)",
    afdeling: "Sector Professionals",
    aantal: 1,
    uurPerJaarPerPersoon: 8,
    programmaPct: 0.7,
    curveType: "ds_junior_marketeer",
    onderbouwing:
      "Junior marketeer ondersteunt campagne-data-aanlevering CRM voor Professionals-leads; lagere belasting dan senior collega's. 1 persoon × 8u/jr × 4 jaar = 32u programma-basis. Programma-aandeel 70%; 30% lijn.",
  },
  {
    functieId: "content_specialist",
    functieNaam: "Content Specialist",
    afdeling: "Ondersteuning & Productie",
    aantal: 1,
    uurPerJaarPerPersoon: 16,
    programmaPct: 0.7,
    curveType: "ds_content_specialist",
    onderbouwing:
      "Content-onderhoud + gebruikersgidsen + helpdesk-FAQ in CRM is doorlopend werk in alle programmajaren met lichte piek bij eerste content-creatie (J2). 1 persoon × 16u/jr × 4 jaar = 64u programma-basis. Programma-aandeel 70% (CRM-content is nieuw werk); 30% lijn.",
  },
  {
    functieId: "mdw_binnendienst_a_prof",
    functieNaam: "Medewerker binnendienst A (Professionals)",
    afdeling: "Sector Professionals",
    aantal: 1,
    uurPerJaarPerPersoon: 30,
    programmaPct: 0.85,
    curveType: "ds_mdw_eindgebruiker",
    onderbouwing:
      "Eindgebruiker CRM op A-niveau (Professionals binnendienst) — vergelijkbaar belasting met klantenservice maar A-niveau-werk. Acceptatietest + adoptie-training piek J3 (2028). 1 persoon × 30u/jr × 4 jaar = 120u programma-basis. Programma-aandeel 85% (CRM-eindgebruik is nieuw werk); 15% lijn.",
  },
];

const NIEUWE_ROLLEN_MENS: RolDef[] = [
  // Trainees — eindgebruiker training-blok, volgt klantenservice_c-curve, 11u/jr × 4j = 44u
  {
    functieId: "accountmanager_a",
    functieNaam: "Accountmanager A",
    afdeling: "Klantcontact",
    aantal: 1,
    uurPerJaarPerPersoon: 11,
    programmaPct: 0.65,
    curveType: "mens_trainee",
    onderbouwing:
      "Trainee gespreksvaardigheid — eindgebruiker training-blok zoals overige accountmanagers; conservatiever 46u/4j = 11u/jr/persoon (lichter dan ervaren collega's omdat trainee al introductie-traject volgt). 1 persoon × 11u/jr × 4 jaar = 44u programma-basis. Programma-aandeel 65% (analoog klantenservice_c).",
  },
  {
    functieId: "accountmanager_b",
    functieNaam: "Accountmanager B",
    afdeling: "Klantcontact",
    aantal: 1,
    uurPerJaarPerPersoon: 11,
    programmaPct: 0.65,
    curveType: "mens_trainee",
    onderbouwing:
      "Trainee gespreksvaardigheid — eindgebruiker training-blok zoals overige accountmanagers; 46u/4j = 11u/jr/persoon. 1 persoon × 11u/jr × 4 jaar = 44u programma-basis. Programma-aandeel 65%.",
  },
  {
    functieId: "klantenservice_a",
    functieNaam: "Klantenservice medewerker A",
    afdeling: "Klantcontact",
    aantal: 1,
    uurPerJaarPerPersoon: 11,
    programmaPct: 0.65,
    curveType: "mens_trainee",
    onderbouwing:
      "Trainee gespreksvaardigheid — eindgebruiker training-blok analoog klantenservice_c; 46u/4j = 11u/jr/persoon. 1 persoon × 11u/jr × 4 jaar = 44u programma-basis. Programma-aandeel 65%.",
  },
  {
    functieId: "klantenservice_b",
    functieNaam: "Klantenservice medewerker B",
    afdeling: "Klantcontact",
    aantal: 1,
    uurPerJaarPerPersoon: 11,
    programmaPct: 0.65,
    curveType: "mens_trainee",
    onderbouwing:
      "Trainee gespreksvaardigheid — eindgebruiker training-blok analoog klantenservice_c; 46u/4j = 11u/jr/persoon. 1 persoon × 11u/jr × 4 jaar = 44u programma-basis. Programma-aandeel 65%.",
  },
  {
    functieId: "teamleider_klantenservice",
    functieNaam: "Teamleider klantenservice",
    afdeling: "Klantcontact",
    aantal: 1,
    uurPerJaarPerPersoon: 10,
    programmaPct: 0.7,
    curveType: "mens_teamleider",
    onderbouwing:
      "Coördinator analoog Manager Klantcontact — coördinatie trainings-rooster, deelname kick-off + tussen-evaluaties. 1 persoon × 10u/jr × 4 jaar = 40u programma-basis. Programma-aandeel 70% (training-coördinatie = nieuw werk).",
  },
  // Stakeholders — 1 sessie/jr awareness (3u/jr × 4j = 12u/persoon), vlakke spreiding
  {
    functieId: "productmanager_dst",
    functieNaam: "Productmanager B (DST)",
    afdeling: "Sector PO",
    aantal: 3,
    uurPerJaarPerPersoon: 3,
    programmaPct: 0.7,
    curveType: "mens_stakeholder",
    onderbouwing:
      "Stakeholder-awareness over wat outside-in gespreksvaardigheidstraining inhoudt — 1 sessie/jaar (3u). 3 personen × 3u/jr × 4 jaar = 36u programma-basis. Programma-aandeel 70% (stakeholder-bijwoning).",
  },
  {
    functieId: "productmanager_klt",
    functieNaam: "Productmanager B (KLT)",
    afdeling: "Sector VO",
    aantal: 2,
    uurPerJaarPerPersoon: 3,
    programmaPct: 0.7,
    curveType: "mens_stakeholder",
    onderbouwing:
      "Stakeholder-awareness over wat outside-in gespreksvaardigheidstraining inhoudt — 1 sessie/jaar. 2 personen × 3u/jr × 4 jaar = 24u programma-basis. Programma-aandeel 70%.",
  },
  {
    functieId: "productmanager_int_zak",
    functieNaam: "Productmanager A (Internationaal & Zakelijk)",
    afdeling: "Sector Professionals",
    aantal: 2,
    uurPerJaarPerPersoon: 3,
    programmaPct: 0.7,
    curveType: "mens_stakeholder",
    onderbouwing:
      "Stakeholder-awareness over wat outside-in gespreksvaardigheidstraining inhoudt — 1 sessie/jaar. 2 personen × 3u/jr × 4 jaar = 24u programma-basis. Programma-aandeel 70%.",
  },
  {
    functieId: "campagne_marketeer_a",
    functieNaam: "Campagne Marketeer A",
    afdeling: "Sector PO",
    aantal: 1,
    uurPerJaarPerPersoon: 3,
    programmaPct: 0.7,
    curveType: "mens_stakeholder",
    onderbouwing:
      "Stakeholder-awareness over wat outside-in gespreksvaardigheidstraining inhoudt — 1 sessie/jaar. 1 persoon × 3u/jr × 4 jaar = 12u programma-basis. Programma-aandeel 70%.",
  },
  {
    functieId: "campagne_marketeer_b",
    functieNaam: "Campagne Marketeer B",
    afdeling: "Sector VO",
    aantal: 1,
    uurPerJaarPerPersoon: 3,
    programmaPct: 0.7,
    curveType: "mens_stakeholder",
    onderbouwing:
      "Stakeholder-awareness over wat outside-in gespreksvaardigheidstraining inhoudt — 1 sessie/jaar. 1 persoon × 3u/jr × 4 jaar = 12u programma-basis. Programma-aandeel 70%.",
  },
  {
    functieId: "junior_marketeer_prof",
    functieNaam: "Junior Marketeer (Professionals)",
    afdeling: "Sector Professionals",
    aantal: 1,
    uurPerJaarPerPersoon: 3,
    programmaPct: 0.7,
    curveType: "mens_stakeholder",
    onderbouwing:
      "Stakeholder-awareness over wat outside-in gespreksvaardigheidstraining inhoudt — 1 sessie/jaar. 1 persoon × 3u/jr × 4 jaar = 12u programma-basis. Programma-aandeel 70%.",
  },
  {
    functieId: "mdw_binnendienst_a",
    functieNaam: "Medewerker binnendienst A",
    afdeling: "Klantcontact",
    aantal: 1,
    uurPerJaarPerPersoon: 8,
    programmaPct: 0.7,
    curveType: "mens_review",
    onderbouwing:
      "Review-vraag uit Lezing B blijft staan: voor nu 8u/jr stakeholder-awareness als basis tot user-beslissing of dit een actieve training-deelnemer is (zoals klantenservice_c). 1 persoon × 8u/jr × 4 jaar = 32u programma-basis. Programma-aandeel 70%.",
  },
];

// ─────────────────────────────────────────────────────────────────────────────
// FASE-CURVES per scenario per curveType (jaar-fracties, som = 1.0)
// Volgorde = oplopend per jaar vanaf startJaar.
// ─────────────────────────────────────────────────────────────────────────────

type ScenarioKey = "advies" | "plus20" | "optimaal" | "min20";

// Helper: 2026 = halfjaar — verwerkt impliciet via curve-fracties (J1 lichter).
// We baseren curves op de bestaande analoge rollen uit de snapshot.

const CURVES: Record<RolDef["curveType"], Record<ScenarioKey, number[]>> = {
  // Productmanagers — acceptatietest-piek J3 (2028 advies), klein elders
  // Volgt manager_klantcontact data_systemen-curve, met sterkere J3-piek
  ds_productmanager: {
    advies: [0.10, 0.20, 0.50, 0.20], // 2026/27/28/29
    plus20: [0.08, 0.18, 0.42, 0.18, 0.14], // 5j
    optimaal: [0.08, 0.13, 0.18, 0.22, 0.16, 0.13, 0.10], // 7j — piek 2029 (= advies J3+1)
    min20: [0.06, 0.08, 0.10, 0.12, 0.16, 0.14, 0.10, 0.08, 0.08, 0.08], // 10j — piek 2030
  },
  ds_productmanager_a: {
    advies: [0.10, 0.20, 0.50, 0.20],
    plus20: [0.08, 0.18, 0.42, 0.18, 0.14],
    optimaal: [0.08, 0.13, 0.18, 0.22, 0.16, 0.13, 0.10],
    min20: [0.06, 0.08, 0.10, 0.12, 0.16, 0.14, 0.10, 0.08, 0.08, 0.08],
  },
  // Productowners — doorlopende integratie, vlak verspreid
  ds_productowner: {
    advies: [0.20, 0.27, 0.27, 0.26],
    plus20: [0.16, 0.22, 0.22, 0.20, 0.20],
    optimaal: [0.12, 0.15, 0.15, 0.16, 0.16, 0.13, 0.13],
    min20: [0.08, 0.10, 0.10, 0.10, 0.12, 0.12, 0.10, 0.10, 0.09, 0.09],
  },
  // Marketeers — data-leverings-piek J2-J3 (realisatiejaren CRM-inrichting)
  ds_marketeer: {
    advies: [0.10, 0.40, 0.35, 0.15],
    plus20: [0.08, 0.32, 0.30, 0.16, 0.14],
    optimaal: [0.08, 0.20, 0.22, 0.20, 0.14, 0.08, 0.08],
    min20: [0.06, 0.12, 0.14, 0.14, 0.16, 0.12, 0.08, 0.08, 0.05, 0.05],
  },
  ds_junior_marketeer: {
    advies: [0.10, 0.40, 0.35, 0.15],
    plus20: [0.08, 0.32, 0.30, 0.16, 0.14],
    optimaal: [0.08, 0.20, 0.22, 0.20, 0.14, 0.08, 0.08],
    min20: [0.06, 0.12, 0.14, 0.14, 0.16, 0.12, 0.08, 0.08, 0.05, 0.05],
  },
  // Content specialist — doorlopend onderhoud, lichte piek J2 (eerste content-creatie)
  ds_content_specialist: {
    advies: [0.15, 0.30, 0.30, 0.25],
    plus20: [0.12, 0.24, 0.24, 0.20, 0.20],
    optimaal: [0.10, 0.16, 0.18, 0.16, 0.14, 0.13, 0.13],
    min20: [0.06, 0.10, 0.12, 0.12, 0.14, 0.12, 0.10, 0.08, 0.08, 0.08],
  },
  // Mdw_binnendienst_a_prof — eindgebruiker A-niveau, zware training-piek J3 + adoptie-J4
  // (lijkt op klantenservice_c mens-curve maar dan in DS-domein voor CRM-eindgebruiker)
  ds_mdw_eindgebruiker: {
    advies: [0.05, 0.20, 0.50, 0.25],
    plus20: [0.05, 0.18, 0.42, 0.20, 0.15],
    optimaal: [0.05, 0.12, 0.20, 0.22, 0.18, 0.13, 0.10],
    min20: [0.04, 0.08, 0.10, 0.12, 0.18, 0.16, 0.10, 0.08, 0.08, 0.06],
  },
  // Mens-trainee — volgt klantenservice_c-curve advies = [42/545/467/234]/1288 ≈ [3.3%/42.3%/36.2%/18.2%]
  mens_trainee: {
    advies: [0.033, 0.423, 0.362, 0.182],
    plus20: [0.031, 0.376, 0.323, 0.108, 0.162],
    optimaal: [0.018, 0.052, 0.362, 0.310, 0.103, 0.078, 0.078],
    min20: [0.024, 0.052, 0.359, 0.155, 0.155, 0.103, 0.038, 0.038, 0.038, 0.038],
  },
  // Mens-teamleider — volgt manager_klantcontact mens-curve advies = [0/19/15/6]/40 ≈ [0/47.5%/37.5%/15%]
  mens_teamleider: {
    advies: [0.0, 0.475, 0.375, 0.150],
    plus20: [0.0, 0.366, 0.341, 0.098, 0.195],
    optimaal: [0.048, 0.048, 0.405, 0.333, 0.119, 0.024, 0.024],
    min20: [0.077, 0.026, 0.385, 0.154, 0.154, 0.103, 0.026, 0.026, 0.026, 0.026],
  },
  // Mens-stakeholder — 1 sessie/jaar, vlak verspreid (2026 = halfjaar lichter)
  mens_stakeholder: {
    advies: [0.20, 0.27, 0.27, 0.26],
    plus20: [0.16, 0.22, 0.22, 0.20, 0.20],
    optimaal: [0.12, 0.15, 0.15, 0.16, 0.16, 0.13, 0.13],
    min20: [0.08, 0.10, 0.10, 0.10, 0.12, 0.12, 0.10, 0.10, 0.09, 0.09],
  },
  // Mens-review — zelfde als stakeholder
  mens_review: {
    advies: [0.20, 0.27, 0.27, 0.26],
    plus20: [0.16, 0.22, 0.22, 0.20, 0.20],
    optimaal: [0.12, 0.15, 0.15, 0.16, 0.16, 0.13, 0.13],
    min20: [0.08, 0.10, 0.10, 0.10, 0.12, 0.12, 0.10, 0.10, 0.09, 0.09],
  },
};

// Per scenario: schaal voor totaalUren-per-rol (over de hele looptijd).
// Advies = basis (factor 1.0 t.o.v. uurPerJaarPerPersoon × aantal × 4 jaar).
// Bestaande rollen tonen: advies-totalen ≈ plus20 ≈ optimaal ≈ min20 voor deelnemers (werklast-gebaseerd),
// maar voor governance-rollen schaalt min20 op tot ~2.5× door langere doorlooptijd.
// Voor onze nieuwe rollen kiezen we werklast-gebaseerd: zelfde totaal in alle scenarios behalve
// "doorlopende" rollen (productowners, content_specialist) die lichter schalen met looptijd.

type ScalingRule = "werklast" | "looptijd_licht";
const ROL_SCALING: Record<RolDef["curveType"], ScalingRule> = {
  ds_productmanager: "werklast",
  ds_productmanager_a: "werklast",
  ds_productowner: "looptijd_licht",   // doorlopend werk schaalt mee met looptijd
  ds_marketeer: "werklast",
  ds_junior_marketeer: "werklast",
  ds_content_specialist: "looptijd_licht",
  ds_mdw_eindgebruiker: "werklast",
  mens_trainee: "werklast",
  mens_teamleider: "werklast",
  mens_stakeholder: "looptijd_licht",
  mens_review: "looptijd_licht",
};

const SCENARIO_LOOPTIJD: Record<ScenarioKey, number> = {
  advies: 4,
  plus20: 5,
  optimaal: 7,
  min20: 10,
};

function scenarioTotaalRol(rol: RolDef, scenario: ScenarioKey): number {
  const adviesBasis = rol.aantal * rol.uurPerJaarPerPersoon * 4; // advies-basis = 4 jaar
  const rule = ROL_SCALING[rol.curveType];
  if (rule === "werklast") {
    // Werklast blijft gelijk (deelnemers training, productmanager-acceptatietest etc.)
    return adviesBasis;
  }
  // looptijd_licht: 50% schaalt mee met looptijd t.o.v. advies (4j),
  // 50% blijft werklast-gebaseerd. Dit reflecteert dat doorlopend werk in een
  // langer scenario meer uren kost (meer jaren × maandelijks ritme).
  const looptijdFactor = SCENARIO_LOOPTIJD[scenario] / 4;
  const totaal = adviesBasis * (0.5 + 0.5 * looptijdFactor);
  return Math.round(totaal);
}

// ─────────────────────────────────────────────────────────────────────────────
// MAIN
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
  const backupPath = join(process.cwd(), `backup-lezing-a-${Date.now()}.json`);
  writeFileSync(backupPath, JSON.stringify(sess, null, 2), "utf-8");
  console.log(`Backup geschreven: ${backupPath}`);

  const wiz = (sess.crossAnalyseWizard as Json | undefined) ?? {};
  const stepResults = (wiz.stepResults as Json | undefined) ?? {};
  const stap4 = (stepResults.stap4 as Json | undefined) ?? {};
  const stap7 = stap4.stap7InterneUren as Json | undefined;
  if (!stap7) {
    console.error("Geen stap7InterneUren-state — afgebroken");
    process.exit(1);
  }

  const reedsDoorgevoerd = stap7.lezingADoorgevoerd === true;
  if (reedsDoorgevoerd) {
    console.log("Lezing A is reeds doorgevoerd (marker stap7.lezingADoorgevoerd === true). Geen wijzigingen.");
    return;
  }

  const log: string[] = [];
  const oudeTotalen: Record<string, { totaalUren: number; totaalKosten: number }> = {};
  const nieuweTotalen: Record<string, { totaalUren: number; totaalKosten: number }> = {};

  // Vastleggen oude scenario-totalen
  const scenarios = stap7.scenarios as Record<string, Json | null>;
  for (const [k, sc] of Object.entries(scenarios)) {
    if (!sc) continue;
    const s = sc as { totaalUren: number; totaalKosten: number };
    oudeTotalen[k] = { totaalUren: s.totaalUren, totaalKosten: s.totaalKosten };
  }

  // ───── 1. vastgesteldeUrenPerInspanning bijwerken ─────
  const vastgesteld = stap7.vastgesteldeUrenPerInspanning as Array<{
    domein: string;
    rollen: Array<{
      functieId: string;
      functieNaam: string;
      afdeling?: string;
      urenTotaal: number;
      programmaPct?: number;
      onderbouwing?: string;
    }>;
  }>;

  function voegRollenToe(domein: string, nieuweRollen: RolDef[]) {
    const blok = vastgesteld.find((x) => x.domein === domein);
    if (!blok) {
      console.error(`Geen ${domein}-blok in vastgesteldeUrenPerInspanning`);
      process.exit(1);
    }
    for (const rol of nieuweRollen) {
      // urenTotaal in vastgestelde-tabel = advies-basis (4 jaar)
      const adviesBasis = rol.aantal * rol.uurPerJaarPerPersoon * 4;
      const bestaandIdx = blok.rollen.findIndex((r) => r.functieId === rol.functieId);
      const record = {
        functieId: rol.functieId,
        functieNaam: rol.functieNaam,
        afdeling: rol.afdeling,
        urenTotaal: adviesBasis,
        programmaPct: rol.programmaPct,
        onderbouwing: rol.onderbouwing,
      };
      if (bestaandIdx >= 0) {
        blok.rollen[bestaandIdx] = record;
        log.push(`[vastgesteld:${domein}] ${rol.functieNaam} (${rol.functieId}) VERVANGEN met ${adviesBasis}u (advies-basis)`);
      } else {
        blok.rollen.push(record);
        log.push(`[vastgesteld:${domein}] ${rol.functieNaam} (${rol.functieId}) TOEGEVOEGD met ${adviesBasis}u (advies-basis)`);
      }
    }
  }

  voegRollenToe("data_systemen", NIEUWE_ROLLEN_DS);
  voegRollenToe("mens", NIEUWE_ROLLEN_MENS);

  // ───── 2. Scenarios bijwerken ─────
  type Rol = { functieId: string; functieNaam: string; afdeling: string; uren: number; uurtarief: number; kosten: number };
  type Jaar = { jaar: number; rollen: Rol[]; activiteit?: string; totaalUren: number; totaalKosten: number };
  type Domein = { domein: string; jaren: Jaar[]; totaalUren: number; totaalKosten: number; uren?: number };
  type Scenario = {
    aantalJaren: number;
    startJaar: number;
    domeinen: Domein[];
    totalenPerJaar: Array<{ jaar: number; uren: number; kosten: number; urenBudget?: number; urenGap?: number }>;
    totaalUren: number;
    totaalKosten: number;
    uurtariefGebruikt?: number;
  };

  function pickUurtariefVoorJaar(rollen: Rol[], fallback: number): number {
    const tarieven = rollen.map((r) => r.uurtarief).filter((x): x is number => typeof x === "number");
    if (tarieven.length === 0) return fallback;
    const sorted = [...tarieven].sort((a, b) => a - b);
    return sorted[Math.floor(sorted.length / 2)];
  }

  for (const [scKey, sc] of Object.entries(scenarios)) {
    if (!sc) continue;
    const scenario = sc as unknown as Scenario;
    const sk = scKey as ScenarioKey;
    if (!CURVES.ds_productmanager[sk]) {
      log.push(`[scenarios] ${scKey} — geen curve gedefinieerd, overslaan`);
      continue;
    }

    function verwerkRollenInDomein(domein: string, nieuweRollen: RolDef[]) {
      const dom = scenario.domeinen.find((d) => d.domein === domein);
      if (!dom) {
        log.push(`[${scKey}/${domein}] geen domein-blok — overgeslagen`);
        return;
      }
      dom.jaren.sort((a, b) => a.jaar - b.jaar);
      const nJaren = dom.jaren.length;

      let totaalToegevoegdUren = 0;
      let totaalToegevoegdKosten = 0;

      for (const rol of nieuweRollen) {
        const totaalRol = scenarioTotaalRol(rol, sk);
        const curve = CURVES[rol.curveType][sk];
        if (!curve || curve.length !== scenario.aantalJaren) {
          log.push(
            `[${scKey}/${domein}/${rol.functieId}] curve-mismatch (curve.length=${curve?.length}, aantalJaren=${scenario.aantalJaren}) — overgeslagen`,
          );
          continue;
        }

        // Bereken uren per jaar — vermenigvuldig totaal × fractie + round, fix laatste jaar voor sluitende som
        const urenPerJaarRaw: number[] = curve.map((f) => totaalRol * f);
        const urenPerJaar: number[] = urenPerJaarRaw.map((u) => Math.round(u));
        const sumRounded = urenPerJaar.reduce((a, b) => a + b, 0);
        const correctie = totaalRol - sumRounded;
        // Voeg correctie toe aan piekjaar (max-fractie)
        const maxIdx = curve.indexOf(Math.max(...curve));
        urenPerJaar[maxIdx] = Math.max(0, urenPerJaar[maxIdx] + correctie);

        for (let i = 0; i < nJaren; i++) {
          const uren = urenPerJaar[i];
          if (!uren || uren <= 0) continue;
          const jaarBlok = dom.jaren[i];
          const tarief = pickUurtariefVoorJaar(jaarBlok.rollen, scenario.uurtariefGebruikt ?? 74);
          const kosten = uren * tarief;
          // Idempotentie binnen dit run-pad: als rol al in jaarBlok staat (van een eerdere run via vervanging),
          // dan vervangen i.p.v. duplicate toevoegen. Marker bovenliggend voorkomt complete her-uitvoering.
          const bestaandIdx = jaarBlok.rollen.findIndex((r) => r.functieId === rol.functieId);
          const record = {
            functieId: rol.functieId,
            functieNaam: rol.functieNaam,
            afdeling: rol.afdeling,
            uren,
            uurtarief: tarief,
            kosten,
          };
          if (bestaandIdx >= 0) {
            const oudeUren = jaarBlok.rollen[bestaandIdx].uren ?? 0;
            const oudeKosten = jaarBlok.rollen[bestaandIdx].kosten ?? 0;
            jaarBlok.rollen[bestaandIdx] = record;
            jaarBlok.totaalUren = (jaarBlok.totaalUren ?? 0) - oudeUren + uren;
            jaarBlok.totaalKosten = (jaarBlok.totaalKosten ?? 0) - oudeKosten + kosten;
            totaalToegevoegdUren += uren - oudeUren;
            totaalToegevoegdKosten += kosten - oudeKosten;
          } else {
            jaarBlok.rollen.push(record);
            jaarBlok.totaalUren = (jaarBlok.totaalUren ?? 0) + uren;
            jaarBlok.totaalKosten = (jaarBlok.totaalKosten ?? 0) + kosten;
            totaalToegevoegdUren += uren;
            totaalToegevoegdKosten += kosten;
          }

          // totalenPerJaar bijwerken
          const tpj = scenario.totalenPerJaar?.find((t) => t.jaar === jaarBlok.jaar);
          if (tpj) {
            // We kunnen niet zomaar uren erbij optellen als rol al bestond — herbereken later.
          }
        }
      }

      dom.totaalUren = (dom.totaalUren ?? 0) + totaalToegevoegdUren;
      dom.totaalKosten = (dom.totaalKosten ?? 0) + totaalToegevoegdKosten;
      // sommige domeinen hebben ook 'uren' veld (dubbel-redundant) — die ook bijwerken
      if (typeof dom.uren === "number") {
        dom.uren = (dom.uren ?? 0) + totaalToegevoegdUren;
      }

      log.push(
        `[${scKey}/${domein}] +${totaalToegevoegdUren}u (€${totaalToegevoegdKosten.toLocaleString("nl-NL")}) — ${nieuweRollen.length} nieuwe rollen verspreid`,
      );
    }

    verwerkRollenInDomein("data_systemen", NIEUWE_ROLLEN_DS);
    verwerkRollenInDomein("mens", NIEUWE_ROLLEN_MENS);

    // Hertel scenario-totalen vanaf grond op (om dubbele tellingen + drift te vermijden)
    let scTotaalUren = 0;
    let scTotaalKosten = 0;
    const totalenPerJaarMap: Record<number, { uren: number; kosten: number }> = {};
    for (const dom of scenario.domeinen) {
      let domTotU = 0;
      let domTotK = 0;
      for (const j of dom.jaren) {
        let jaarU = 0;
        let jaarK = 0;
        for (const r of j.rollen) {
          jaarU += r.uren;
          jaarK += r.kosten;
        }
        j.totaalUren = jaarU;
        j.totaalKosten = jaarK;
        domTotU += jaarU;
        domTotK += jaarK;
        totalenPerJaarMap[j.jaar] = totalenPerJaarMap[j.jaar] ?? { uren: 0, kosten: 0 };
        totalenPerJaarMap[j.jaar].uren += jaarU;
        totalenPerJaarMap[j.jaar].kosten += jaarK;
      }
      dom.totaalUren = domTotU;
      dom.totaalKosten = domTotK;
      if (typeof dom.uren === "number") dom.uren = domTotU;
      scTotaalUren += domTotU;
      scTotaalKosten += domTotK;
    }
    scenario.totaalUren = scTotaalUren;
    scenario.totaalKosten = scTotaalKosten;
    // Update totalenPerJaar
    for (const tpj of scenario.totalenPerJaar) {
      const m = totalenPerJaarMap[tpj.jaar];
      if (m) {
        tpj.uren = m.uren;
        tpj.kosten = m.kosten;
        if (typeof tpj.urenBudget === "number") {
          tpj.urenGap = tpj.uren - tpj.urenBudget;
        }
      }
    }

    nieuweTotalen[scKey] = { totaalUren: scenario.totaalUren, totaalKosten: scenario.totaalKosten };
  }

  // ───── 3. Marker interneUrenLezing omdraaien ─────
  // Bouw nieuwe overzicht-cijfers
  const selectie = stap7.selectiePerDomein as Record<string, Record<string, { aantal: number; stakeholder?: boolean; reviewVereist?: boolean }>>;
  const vastgesteldRollenPerDomein: Record<string, Set<string>> = {};
  for (const blok of vastgesteld) {
    vastgesteldRollenPerDomein[blok.domein] = new Set(blok.rollen.map((r) => r.functieId));
  }

  function overzichtPerDomein(d: string) {
    const sel = selectie[d] ?? {};
    let aangemeld = 0;
    let metUren = 0;
    let stakeholder = 0;
    let review = 0;
    let onbekend = 0;
    const vastSet = vastgesteldRollenPerDomein[d] ?? new Set();
    for (const [fid, info] of Object.entries(sel)) {
      const aantal = info.aantal ?? 0;
      aangemeld += aantal;
      if (vastSet.has(fid)) {
        metUren += aantal;
      } else if (info.stakeholder) {
        stakeholder += aantal;
      } else if (info.reviewVereist) {
        review += aantal;
      } else {
        onbekend += aantal;
      }
    }
    return { aangemeld, metUren, stakeholder, review, onbekend };
  }

  const overzicht = {
    mens: overzichtPerDomein("mens"),
    cultuur: overzichtPerDomein("cultuur"),
    processen: overzichtPerDomein("processen"),
    data_systemen: overzichtPerDomein("data_systemen"),
  };

  (stap7 as Record<string, unknown>).interneUrenLezing = {
    lezing: "A",
    timestamp: new Date().toISOString(),
    toelichting:
      "Iedereen die in selectiePerDomein staat, krijgt uren toegewezen op basis van rolfunctie + CRM-intensiteit. Operationele eindgebruikers (klantenservice, accountmanagers, productowners) krijgen hoge uren; review-rollen (productmanagers, marketeers) krijgen lagere uren proportioneel aan hun bijdrage. Lezing B (stakeholders zonder uren) is bewust verworpen omdat user expliciet aangaf dat alle aangemelden uren-belasting moeten hebben.",
    overzicht,
  };

  (stap7 as Record<string, unknown>).lezingADoorgevoerd = true;
  (stap7 as Record<string, unknown>).lezingADoorgevoerdMeta = {
    timestamp: new Date().toISOString(),
    nieuweRollenDs: NIEUWE_ROLLEN_DS.length,
    nieuweRollenMens: NIEUWE_ROLLEN_MENS.length,
    oudeTotalen,
    nieuweTotalen,
  };

  // ───── 4. Persist naar Supabase ─────
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

  console.log("\n=== SCENARIO-TOTALEN VOOR/NA ===");
  for (const [k, oud] of Object.entries(oudeTotalen)) {
    const nieuw = nieuweTotalen[k];
    if (!nieuw) continue;
    const dU = nieuw.totaalUren - oud.totaalUren;
    const dK = nieuw.totaalKosten - oud.totaalKosten;
    console.log(
      `  ${k}: ${oud.totaalUren}u → ${nieuw.totaalUren}u (+${dU}u) | €${oud.totaalKosten.toLocaleString("nl-NL")} → €${nieuw.totaalKosten.toLocaleString("nl-NL")} (+€${dK.toLocaleString("nl-NL")})`,
    );
  }

  console.log("\n=== OVERZICHT NA DOORVOER ===");
  for (const [d, o] of Object.entries(overzicht)) {
    console.log(`  ${d}: aangemeld=${o.aangemeld} metUren=${o.metUren} stakeholder=${o.stakeholder} review=${o.review} onbekend=${o.onbekend}`);
  }

  console.log(`\n[OK] Supabase bijgewerkt voor sessie ${SESSION_ID}`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
