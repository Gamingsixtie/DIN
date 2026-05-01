"use client";

import { useState, useMemo } from "react";
import { useSession } from "@/lib/session-context";
import type { DINSession, BegrotingAdvies, Stap4Result } from "@/lib/types";

// --- Helpers -----------------------------------------------------------------

function formatEur(n: number | undefined | null): string {
  if (typeof n !== "number" || !isFinite(n)) return "—";
  return `€ ${Math.round(n).toLocaleString("nl-NL")}`;
}

function formatEurK(n: number | undefined | null): string {
  if (typeof n !== "number" || !isFinite(n)) return "—";
  if (Math.abs(n) >= 1_000_000) return `€ ${(n / 1_000_000).toFixed(2)}M`;
  if (Math.abs(n) >= 1_000) return `€ ${Math.round(n / 1_000)}K`;
  return `€ ${Math.round(n)}`;
}

function pct(num: number, denom: number): string {
  if (denom <= 0) return "—";
  return `${Math.round((num / denom) * 100)}%`;
}

const SCENARIO_KEYS = ["optimaal", "plus20", "advies", "min20"] as const;
type ScenarioKey = (typeof SCENARIO_KEYS)[number];

const SCENARIO_META: Record<ScenarioKey, { label: string; band: string; ring: string; accent: string }> = {
  optimaal: { label: "Huidig budget", band: "bg-[#003366]", ring: "ring-[#003366]/30", accent: "text-[#003366]" },
  plus20: { label: "+20% (sneller)", band: "bg-emerald-700", ring: "ring-emerald-700/30", accent: "text-emerald-700" },
  advies: { label: "Snelste scenario", band: "bg-purple-700", ring: "ring-purple-700/30", accent: "text-purple-700" },
  min20: { label: "−20% (langzamer)", band: "bg-amber-700", ring: "ring-amber-700/30", accent: "text-amber-700" },
};

const DOMAIN_LABEL: Record<string, string> = {
  mens: "Mens",
  processen: "Processen",
  data_systemen: "Data & Systemen",
  cultuur: "Cultuur",
};

const DOMAIN_DOT: Record<string, string> = {
  mens: "bg-blue-500",
  processen: "bg-emerald-600",
  data_systemen: "bg-purple-600",
  cultuur: "bg-amber-600",
};

// Lifecycle-curves per domein per aantalJaren (% per cell, som = 100).
// Bron: scripts/rebalance-verdeling.ts. Wordt getoond als toelichting in Sectie C.
const CURVES: Record<string, Record<number, number[]>> = {
  data_systemen: {
    4: [15, 35, 35, 15],
    5: [12, 25, 30, 22, 11],
    7: [10, 20, 25, 18, 12, 10, 5],
    10: [5, 10, 14, 18, 18, 14, 10, 6, 3, 2],
  },
  mens: {
    4: [15, 40, 35, 10],
    5: [10, 30, 35, 18, 7],
    7: [8, 20, 25, 20, 15, 8, 4],
    10: [5, 15, 20, 18, 14, 10, 8, 5, 3, 2],
  },
  cultuur: {
    4: [20, 35, 30, 15],
    5: [15, 25, 25, 20, 15],
    7: [10, 16, 20, 18, 15, 12, 9],
    10: [8, 12, 14, 14, 12, 12, 10, 8, 6, 4],
  },
  processen: {
    4: [25, 35, 25, 15],
    5: [20, 30, 25, 15, 10],
    7: [15, 22, 20, 15, 12, 10, 6],
    10: [10, 18, 18, 15, 12, 8, 7, 5, 4, 3],
  },
};

const CURVE_LABEL: Record<string, string> = {
  data_systemen: "U-curve — piek in realisatie + acceptatie/uitrol (PRINCE2/BiSL)",
  mens: "S-curve — opbouw via basistraining, piek in vaardigheidstraining + toepassing, tail voor borging",
  cultuur: "Brede heuvel — geleidelijke opbouw, lange tail voor verankering in HR-cyclus",
  processen: "Vroege piek — herontwerp + pilot + uitrol vroeg, daarna continu verbeteren",
};

// Dossier-bedragen per inspanning (uit scenario-agnostische motivatie).
// Match via case-insensitive substring op inspanningTitel.
type DossierEntry = {
  match: string;            // substring (lowercase) gezocht in titel
  label: string;            // weergave
  eenmaligMin: number;
  eenmaligMax: number;
  eenmaligMid: number;
  structureelPerJaar: number; // gemiddeld per jaar over scenario-jaren
  toelichting: string;        // korte uitleg voor stuurgroep
};

const DOSSIERS: DossierEntry[] = [
  {
    match: "crm",
    label: "CRM-platform",
    eenmaligMin: 455_000,
    eenmaligMax: 680_000,
    eenmaligMid: 565_000,
    structureelPerJaar: 92_500,
    toelichting:
      "Eenmalig €455K–€680K (selectie, implementatie, integraties incl. risico-buffer). Structureel ~€92,5K/jr (licenties, beheer, doorontwikkeling).",
  },
  {
    match: "uniforme",
    label: "Uniforme klantbenadering",
    eenmaligMin: 55_000,
    eenmaligMax: 70_000,
    eenmaligMid: 62_500,
    structureelPerJaar: 12_500,
    toelichting:
      "Eenmalig €55K–€70K (procesontwerp, pilots, standaarden). Structureel ~€12,5K/jr (audits, doorontwikkeling).",
  },
  {
    match: "gesprek",
    label: "Gespreksvaardigheidstraining",
    eenmaligMin: 125_000,
    eenmaligMax: 160_000,
    eenmaligMid: 142_500,
    structureelPerJaar: 0,
    toelichting:
      "Eenmalig €125K–€160K (curriculum, basistraining, vaardigheidstraining, borging). Geen structurele kosten — kennis blijft in de organisatie.",
  },
  {
    match: "leiderschap",
    label: "Leiderschapsprogramma",
    eenmaligMin: 33_000,
    eenmaligMax: 43_000,
    eenmaligMid: 38_000,
    structureelPerJaar: 7_500,
    toelichting:
      "Eenmalig €33K–€43K (programma, coaching, intervisie). Structureel ~€7,5K/jr (verankering in HR-cyclus, jaarlijkse rolmodel-werking).",
  },
  {
    match: "klantfeedback",
    label: "Klantfeedback-systematiek",
    eenmaligMin: 40_000,
    eenmaligMax: 60_000,
    eenmaligMid: 50_000,
    structureelPerJaar: 10_000,
    toelichting:
      "Eenmalig €40K–€60K (NPS-tooling, dashboards, governance). Structureel ~€10K/jr (analyse-uren, doorontwikkeling).",
  },
  {
    match: "data",
    label: "Klantdata-platform",
    eenmaligMin: 200_000,
    eenmaligMax: 300_000,
    eenmaligMid: 250_000,
    structureelPerJaar: 50_000,
    toelichting:
      "Eenmalig €200K–€300K (data-architectuur, integraties, governance). Structureel ~€50K/jr (beheer, analyses).",
  },
];

function findDossier(titel: string): DossierEntry | null {
  const t = titel.toLowerCase();
  for (const d of DOSSIERS) {
    if (t.includes(d.match)) return d;
  }
  return null;
}

// Component-derivation: per inspanning de individuele line-items die optellen
// tot het eenmalige + structurele bedrag. Stuurgroep ziet HOE elk dossier-bedrag
// is opgebouwd. Match via case-insensitive substring op inspanningTitel.
//
// Per component: formule (eenheid × tarief), berekening min/mid/max met
// expliciete cijfers, tarief-onderbouwing (marktconform/benchmark/aanname),
// en aantal-onderbouwing (uit dossier-input/business-case).
type ComponentItem = {
  naam: string;
  rangeMin: number;
  rangeMax: number;
  toelichting: string;
  formule?: string;
  berekening?: string;        // shorthand wanneer min=mid=max (één regel)
  berekeningMin?: string;
  berekeningMid?: string;
  berekeningMax?: string;
  tariefOnderbouwing?: string;
  aantalOnderbouwing?: string;
};
type ComponentItemPerJaar = {
  naam: string;
  perJaarMin: number;
  perJaarMax: number;
  toelichting: string;
  formule?: string;
  berekening?: string;
  berekeningMin?: string;
  berekeningMax?: string;
  tariefOnderbouwing?: string;
  aantalOnderbouwing?: string;
};
type ComponentBreakdown = {
  match: string;            // substring (lowercase) gezocht in titel
  label: string;            // korte titel
  eenmaligComponents: ComponentItem[];
  structureelComponents: ComponentItemPerJaar[];
  structureelNote?: string; // optionele toelichting onder structureel-blok
};

const COMPONENT_BREAKDOWNS: ComponentBreakdown[] = [
  {
    match: "crm",
    label: "CRM-platform",
    eenmaligComponents: [
      {
        naam: "Externe implementatie + dashboardbouw",
        rangeMin: 250_000,
        rangeMax: 375_000,
        toelichting: "1.500–2.500 consultanturen × € 150–170/uur",
        formule: "consultanturen × tarief/uur (incl. PM-buffer + ceiling)",
        berekeningMin: "1.500u × € 150/u = € 225.000 → afgerond € 250.000 (incl. ~10% PM-buffer)",
        berekeningMid: "2.000u × € 160/u = € 320.000",
        berekeningMax: "2.500u × € 170/u = € 425.000 → capped € 375.000 (realistisch plafond)",
        tariefOnderbouwing: "Senior CRM-consultant Nederland markt 2025: € 150–170/u (marktconforme tarieven)",
        aantalOnderbouwing: "Mid-size enterprise CRM-implementatie (85 gebruikers + 7-8 integraties): 1.500–2.500u (Gartner/Forrester benchmark voor MS Dynamics)",
      },
      {
        naam: "Datamigratie + 7-8 bronsysteemintegraties",
        rangeMin: 75_000,
        rangeMax: 125_000,
        toelichting: "ETL + datacleaning + koppelingen",
        formule: "koppelingen × kost/koppeling + datacleaning",
        berekeningMin: "7 koppelingen × € 8.000 + € 15.000 datacleaning = € 71.000 → afgerond € 75.000",
        berekeningMid: "7-8 koppelingen × ~€ 11.500 + € 17.500 datacleaning = € 105.000",
        berekeningMax: "8 koppelingen × € 15.000 + € 20.000 datacleaning = € 140.000 → capped € 125.000",
        tariefOnderbouwing: "Per bronsysteem-koppeling 80–150 ontwikkeluren × € 100–130/u = € 8K–€ 20K",
        aantalOnderbouwing: "7-8 bronsystemen geïdentificeerd in datakwaliteit-scan (uit dossier); datacleaning afhankelijk van scan-resultaat (gemiddeld € 15K–€ 20K)",
      },
      {
        naam: "Training + adoptie 85 medewerkers + externe schaduwbegeleiding",
        rangeMin: 40_000,
        rangeMax: 55_000,
        toelichting: "go-live ondersteuning + key-user-traject",
        formule: "deelnemers × training-kost/persoon + schaduwbegeleiding",
        berekeningMin: "85 × € 350 + € 10.000 schaduw = € 39.750 → afgerond € 40.000",
        berekeningMid: "85 × € 425 + € 12.500 schaduw = € 48.625",
        berekeningMax: "85 × € 500 + € 15.000 schaduw = € 57.500 → capped € 55.000",
        tariefOnderbouwing: "1-2 dagen CRM-training per persoon door externe trainer: € 350–500 all-in",
        aantalOnderbouwing: "85 te trainen medewerkers (uit dossier-scope); schaduwbegeleiding 2 weken on-the-floor à € 1.000–€ 1.500/dag",
      },
      {
        naam: "Dubbele licentielast transitie 6–12 mnd",
        rangeMin: 30_000,
        rangeMax: 60_000,
        toelichting: "oude + nieuwe omgeving parallel tijdens migratie",
        formule: "transitiemaanden × (oude licentie + nieuwe licentie)/mnd",
        berekeningMin: "6 mnd × € 5.000/mnd = € 30.000",
        berekeningMid: "9 mnd × € 5.000/mnd = € 45.000",
        berekeningMax: "12 mnd × € 5.000/mnd = € 60.000",
        tariefOnderbouwing: "Oude omgeving ~€ 2.500/mnd + nieuwe MS Dynamics-licentie ~€ 2.500/mnd = € 5.000/mnd parallel",
        aantalOnderbouwing: "Standaard transitieperiode 6–12 maanden om continuïteit te waarborgen tijdens overstap",
      },
      {
        naam: "Risico-buffer onvoorzien",
        rangeMin: 40_000,
        rangeMax: 80_000,
        toelichting: "8-15% van eenmalige investering (industry standard PM-buffer)",
        formule: "8-15% van eenmalige investering",
        berekeningMin: "8% × € 440K eenmalig = € 35K → afgerond € 40.000",
        berekeningMid: "11% × € 540K eenmalig = € 60.000",
        berekeningMax: "15% × € 540K eenmalig = € 80.000",
        tariefOnderbouwing: "Industry standard PM-buffer voor IT-implementaties van deze omvang (€500K-€1M categorie): 10-15% (PRINCE2/PMI). Hoger dan kleine projecten omdat 7-8 bronsystemen + 85 gebruikers cross-sectoraal + datacleaning onzekerheid uit datakwaliteit-scan.",
        aantalOnderbouwing: "Dekt: scope-aanpassingen pilot-feedback per sector, complexiteit bronsysteem-integraties, additionele test-iteraties datacleaning, training-bijsturing bij adoptie-tegenvaller, kleine architectuur-aanpassingen tijdens bouw. NB: Stichting Cito-ontvlechting valt apart traject (stuurgroep-besluit) — niet in deze buffer.",
      },
    ],
    structureelComponents: [
      {
        naam: "Licenties 85 gebruikers Microsoft Dynamics-equivalent",
        perJaarMin: 63_000,
        perJaarMax: 63_000,
        toelichting: "85 × ~€ 740/jaar",
        formule: "gebruikers × licentie-tarief/jaar",
        berekening: "85 × € 740/jaar = € 62.900 → afgerond € 63.000",
        tariefOnderbouwing: "MS Dynamics 365 Customer Engagement Pro: € 55–€ 65/maand × 12 mnd = € 660–€ 780/jaar (gemiddeld € 740)",
        aantalOnderbouwing: "85 gebruikers (uit dossier-scope, 3 sectoren samen)",
      },
      {
        naam: "Beheer + doorontwikkeling",
        perJaarMin: 30_000,
        perJaarMax: 30_000,
        toelichting: "interne CRM-beheerder, kleine functionele aanpassingen, 2nd-line support",
        formule: "interne capaciteit × tarief OF 1 dag/week × 50 weken × dagprijs",
        berekening: "0,3 FTE × € 100.000/jaar = € 30.000  /  alt: 1 dag/week × 50 weken × € 600/dag = € 30.000",
        tariefOnderbouwing: "Interne FTE-kosten Cito ~€ 100.000/jaar (loaded cost) of dagprijs € 600 voor functioneel beheerder",
        aantalOnderbouwing: "0,3 FTE voor 2nd-line support, kleine functionele aanpassingen, datakwaliteitsmonitoring",
      },
    ],
  },
  {
    match: "uniforme",
    label: "Uniforme klantbenadering (processen)",
    eenmaligComponents: [
      {
        naam: "Externe procesbegeleider (~20 dagen × € 800)",
        rangeMin: 16_000,
        rangeMax: 16_000,
        toelichting: "expert procesontwerp + facilitering",
        formule: "begeleidingsdagen × dagtarief",
        berekening: "20 dagen × € 800/dag = € 16.000",
        tariefOnderbouwing: "Senior procesconsultant Nederland: € 750–€ 850/dag (marktconform niveau medior–senior)",
        aantalOnderbouwing: "~20 dagen verspreid over 6–9 maanden voor procesontwerp + werksessie-facilitering (uit dossier)",
      },
      {
        naam: "9 multidisciplinaire werksessies (3 sectoren)",
        rangeMin: 20_000,
        rangeMax: 25_000,
        toelichting: "voorbereiding, facilitering, materialen per sectorraad",
        formule: "sessies × kost/sessie (voorbereiding + facilitering + materialen)",
        berekeningMin: "9 sessies × ~€ 2.200/sessie = € 19.800 → afgerond € 20.000",
        berekeningMax: "9 sessies × ~€ 2.800/sessie = € 25.200 → afgerond € 25.000",
        tariefOnderbouwing: "Per werksessie: 0,5 dag voorbereiding + 1 dag facilitering + materialen ≈ € 2.200–€ 2.800",
        aantalOnderbouwing: "9 sessies = 3 sessies × 3 sectoren (PO, VO, Zakelijk) — zoals belegd in sectorraad-cyclus",
      },
      {
        naam: "Procesinventarisatie (Smartprocess setup)",
        rangeMin: 8_000,
        rangeMax: 12_000,
        toelichting: "tooling-configuratie + initiële procesbeschrijvingen",
        formule: "tooling-setup + initiële proces-modellering",
        berekeningMin: "€ 4.000 tooling-setup + € 4.000 modellering = € 8.000",
        berekeningMax: "€ 5.000 tooling-setup + € 7.000 modellering = € 12.000",
        tariefOnderbouwing: "Smartprocess setup-fee € 4K–€ 5K + procesbeschrijver dagprijs € 700/dag",
        aantalOnderbouwing: "Initiële inventarisatie 6–10 dagen voor 8–12 kernprocessen (uit dossier-scope)",
      },
      {
        naam: "Externe materialen + methodiek",
        rangeMin: 5_000,
        rangeMax: 10_000,
        toelichting: "templates, casuïstiek, methodische ondersteuning",
        formule: "licentie-methodiek + content-ontwikkeling",
        berekeningMin: "€ 2.500 methodiek-licentie + € 2.500 content = € 5.000",
        berekeningMax: "€ 5.000 methodiek-licentie + € 5.000 content = € 10.000",
        tariefOnderbouwing: "Methodiek-licenties (BiSL/Lean) en gebruik commerciële templates: € 2,5K–€ 5K per traject",
        aantalOnderbouwing: "Cito-specifieke aanpassingen casuïstiek + werkvormen: 4–7 dagen contentwerk",
      },
      {
        naam: "Pilot-coördinatie + sectorvalidatie",
        rangeMin: 6_000,
        rangeMax: 7_000,
        toelichting: "pilot-uitvoering + valideren met sectoren",
        formule: "pilot-coördinatiedagen × dagprijs + validatie-sessies",
        berekeningMin: "6 dagen × € 800 + € 1.200 validatie = € 6.000",
        berekeningMax: "7 dagen × € 800 + € 1.400 validatie = € 7.000",
        tariefOnderbouwing: "Pilot-coördinator dagprijs € 800; validatie-sessies € 1,2K–€ 1,4K all-in",
        aantalOnderbouwing: "1 pilot per sector (3 sectoren) met 2 validatie-sessies elk",
      },
    ],
    structureelComponents: [
      {
        naam: "Proceseigenaarschap-borging via Smartprocess",
        perJaarMin: 12_500,
        perJaarMax: 12_500,
        toelichting: "tooling-licentie + lichte governance + jaarlijkse audits",
        formule: "Smartprocess subscription + proceseigenaar-coördinatie + jaarlijkse audit",
        berekening: "€ 6.000 tooling/jaar + € 4.500 coördinatie + € 2.000 audit = € 12.500/jaar",
        tariefOnderbouwing: "Smartprocess SaaS-subscription ~€ 500/maand × 12 = € 6K; auditdagen € 800–€ 1.000/dag",
        aantalOnderbouwing: "0,05 FTE proceseigenaar-coördinatie (~5 dagen/jaar × € 900) + 2 auditdagen/jaar",
      },
    ],
  },
  {
    match: "gesprek",
    label: "Gespreksvaardigheidstraining (mens)",
    eenmaligComponents: [
      {
        naam: "Externe trainingspartner (2 blokken × € 26.000)",
        rangeMin: 52_000,
        rangeMax: 52_000,
        toelichting: "basistraining + vaardigheidstraining outside-in",
        formule: "trainingsblokken × kost/blok",
        berekening: "2 blokken × € 26.000/blok = € 52.000",
        tariefOnderbouwing: "Per trainingsblok: ~10 trainingsdagen × € 2.500/dag (gespecialiseerde trainer outside-in) + materialen = € 26.000",
        aantalOnderbouwing: "2 blokken: blok 1 = basistraining (alle 66 deelnemers), blok 2 = vaardigheidsverdieping (uit dossier-leerlijn)",
      },
      {
        naam: "Nulmeting + intake per sector",
        rangeMin: 10_000,
        rangeMax: 10_000,
        toelichting: "vaardigheidsmeting voorafgaand aan curriculum",
        formule: "sectoren × kost/sector (assessment + intake-sessies)",
        berekening: "3 sectoren × ~€ 3.300/sector = € 10.000",
        tariefOnderbouwing: "Per sector: vaardigheids-assessment-tool € 1,5K + 2 intake-sessies à € 900 = € 3,3K",
        aantalOnderbouwing: "Nulmeting 66 deelnemers × 30 min digitaal assessment + intake per sector (PO/VO/Zakelijk)",
      },
      {
        naam: "Curriculum-ontwikkeling (intern + gedeeltelijk extern)",
        rangeMin: 15_000,
        rangeMax: 30_000,
        toelichting: "leerlijn + Cito-specifieke casuïstiek",
        formule: "ontwikkeluren × tarief (extern + interne tijd)",
        berekeningMin: "20 dagen × € 750/dag = € 15.000 (gedeeltelijk uitbesteed)",
        berekeningMax: "30 dagen × € 1.000/dag = € 30.000 (volledig extern)",
        tariefOnderbouwing: "Curriculum-ontwerper dagprijs € 750–€ 1.000 (afhankelijk van seniority + Cito-context)",
        aantalOnderbouwing: "Leerlijn-ontwerp + Cito-casuïstiek: 20–30 ontwikkeldagen voor 2 trainingsblokken",
      },
      {
        naam: "Materialen + casuïstiek",
        rangeMin: 10_000,
        rangeMax: 15_000,
        toelichting: "werkvormen, video, oefencases per sector",
        formule: "video-productie + werkvormen + oefencases",
        berekeningMin: "€ 5.000 video + € 3.000 werkvormen + € 2.000 cases = € 10.000",
        berekeningMax: "€ 7.000 video + € 4.500 werkvormen + € 3.500 cases = € 15.000",
        tariefOnderbouwing: "Korte training-video's € 1K–€ 1,5K/stuk; oefencase-ontwerp € 700/case",
        aantalOnderbouwing: "5–7 trainingsvideo's, 3–4 werkvormen, 5–7 sector-specifieke cases (PO/VO/Zakelijk)",
      },
      {
        naam: "Adoptie + intervisie-begeleiding",
        rangeMin: 20_000,
        rangeMax: 30_000,
        toelichting: "intervisiekringen + on-the-job-coaching",
        formule: "intervisiekringen × sessies × dagprijs + coaching-uren",
        berekeningMin: "6 kringen × 4 sessies × € 750 + € 2.000 coaching = € 20.000",
        berekeningMax: "6 kringen × 5 sessies × € 850 + € 4.500 coaching = € 30.000",
        tariefOnderbouwing: "Intervisiekring-begeleider € 750–€ 850/sessie (halve dag); on-the-job-coaching € 100–€ 130/u",
        aantalOnderbouwing: "6 intervisiekringen (66 deelnemers ÷ ~11 per kring) × 4–5 sessies à 2 uur",
      },
      {
        naam: "Cross-sectorale coördinatie",
        rangeMin: 8_000,
        rangeMax: 13_000,
        toelichting: "interne coördinatie-uren over 3 sectoren",
        formule: "coördinator-uren × tarief",
        berekeningMin: "100u × € 80/u = € 8.000",
        berekeningMax: "130u × € 100/u = € 13.000",
        tariefOnderbouwing: "Interne L&D-coördinator: € 80–€ 100/u (loaded cost intern tarief)",
        aantalOnderbouwing: "100–130u over 6 maanden = ~4u/week × 26 weken voor planning, communicatie, evaluatie 3 sectoren",
      },
    ],
    structureelComponents: [],
    structureelNote:
      "€ 0/jaar — borging via interne ambassadeurs + e-learning (kennis blijft in de organisatie)",
  },
  {
    match: "leiderschap",
    label: "Leiderschapsprogramma (cultuur)",
    eenmaligComponents: [
      {
        naam: "Externe begeleider (~15 dagen × € 2.500)",
        rangeMin: 37_500,
        rangeMax: 37_500,
        toelichting: "executive-niveau dagprijs",
        formule: "begeleidingsdagen × dagprijs (executive-niveau)",
        berekening: "15 dagen × € 2.500/dag = € 37.500",
        tariefOnderbouwing: "Executive-coach/leiderschapsbegeleider Nederland: € 2.250–€ 2.750/dag (marktconform voor MT-niveau)",
        aantalOnderbouwing: "~15 begeleidingsdagen verspreid over 9–12 maanden voor MT (ca. 12 leiders): kick-off + 4 sessies + reflectie",
      },
      {
        naam: "Programma-ontwerp + MT-commitment-sessie",
        rangeMin: 3_000,
        rangeMax: 5_000,
        toelichting: "kick-off + ontwerp leerlijn voor MT/leiders",
        formule: "ontwerpdagen × dagprijs + kick-off-sessie",
        berekeningMin: "2 dagen × € 1.000 + € 1.000 kick-off = € 3.000",
        berekeningMax: "3 dagen × € 1.250 + € 1.250 kick-off = € 5.000",
        tariefOnderbouwing: "Programma-ontwerper voor leiderschap: € 1.000–€ 1.250/dag",
        aantalOnderbouwing: "2–3 ontwerpdagen + 1 commitment-sessie met MT (verplicht startpunt voor borging)",
      },
      {
        naam: "HR-instrumenten-aanpassing",
        rangeMin: 5_000,
        rangeMax: 10_000,
        toelichting: "360°-feedback + beoordelingscriteria outside-in",
        formule: "HR-tooling-aanpassing + criteria-ontwerp",
        berekeningMin: "€ 3.000 360°-tool config + € 2.000 criteria = € 5.000",
        berekeningMax: "€ 6.000 360°-tool config + € 4.000 criteria = € 10.000",
        tariefOnderbouwing: "360°-feedback-tool config € 3K–€ 6K eenmalig; criteria-ontwerp door HR-adviseur (€ 850/dag)",
        aantalOnderbouwing: "Eenmalige aanpassing beoordelingsformulieren (3–5 outside-in-criteria) + tool-config voor MT-laag",
      },
    ],
    structureelComponents: [
      {
        naam: "Doorlopende externe begeleiding (afnemend)",
        perJaarMin: 5_000,
        perJaarMax: 8_000,
        toelichting: "jaar 2-3 hoog, afnemend in latere jaren",
        formule: "begeleidingsdagen × dagprijs (afnemend per jaar)",
        berekeningMin: "2 dagen × € 2.500 = € 5.000/jaar (latere jaren)",
        berekeningMax: "3 dagen × € 2.750 = € 8.000/jaar (jaar 2-3)",
        tariefOnderbouwing: "Executive-coach € 2.500–€ 2.750/dag (consistent met eenmalig-fase tarief)",
        aantalOnderbouwing: "Jaar 2-3: 3 dagen/jaar (intervisie + verdieping); jaar 4+: 2 dagen/jaar (refresh)",
      },
      {
        naam: "Lichte HR-coördinatie + jaarlijkse cultuurmeting",
        perJaarMin: 2_000,
        perJaarMax: 3_000,
        toelichting: "borging in HR-cyclus + meting",
        formule: "HR-coördinatie-uren + meting-tooling",
        berekeningMin: "20u × € 80 + € 400 tool = € 2.000/jaar",
        berekeningMax: "30u × € 85 + € 450 tool = € 3.000/jaar",
        tariefOnderbouwing: "Interne HR-coördinator € 80–€ 85/u; cultuurmeting-tool ~€ 400–€ 450/jaar (SaaS)",
        aantalOnderbouwing: "20–30u/jaar HR-coördinatie (verankering in beoordelingscyclus) + jaarlijkse pulse-meting",
      },
    ],
    structureelNote:
      "Cultuur-totaal varieert per scenario: structureel-budget is geconcentreerd in jaar 2-3, met afnemende trend in latere jaren. Voor langere looptijden komt er een extra borgings-tail bij.",
  },
];

function findComponentBreakdown(titel: string): ComponentBreakdown | null {
  const t = titel.toLowerCase();
  for (const b of COMPONENT_BREAKDOWNS) {
    if (t.includes(b.match)) return b;
  }
  return null;
}

// Tolerantie voor som-controle (afronding op duizendtallen kan kleine
// afwijking geven). 0,5% van het scenariototaal of €5.000, hoogste wint.
function tolerantie(scenarioTotaal: number): number {
  return Math.max(5_000, Math.round(scenarioTotaal * 0.005));
}

// --- Component ---------------------------------------------------------------

export default function BerekeningenStep() {
  const { session } = useSession();
  const [openScenario, setOpenScenario] = useState<ScenarioKey | null>("optimaal");

  if (!session) return null;

  const stap4 = (session.crossAnalyseWizard?.stepResults as { stap4?: Stap4Result } | undefined)?.stap4;
  const begroting = stap4?.begrotingAdvies as BegrotingAdvies | undefined;

  const beschikbareScenarios: ScenarioKey[] = SCENARIO_KEYS.filter(
    (k) => !!begroting?.scenarios?.[k]
  );

  return (
    <div className="space-y-6">
      <Header />

      {!begroting && <GeenBegrotingPlaceholder />}

      {begroting && beschikbareScenarios.length === 0 && (
        <div className="bg-amber-50 border border-amber-200 rounded-lg p-4 text-sm text-amber-900">
          Er is een begrotingsadvies-record, maar geen enkel scenario is gevuld. Genereer scenario&apos;s
          in <strong>Cross-analyse · Stap 6 (Optimaliseren)</strong>.
        </div>
      )}

      {begroting && beschikbareScenarios.length > 0 && (
        <>
          <ScenarioPicker
            beschikbaar={beschikbareScenarios}
            actief={openScenario}
            onPick={setOpenScenario}
            session={session}
            begroting={begroting}
          />

          <div className="space-y-4">
            {beschikbareScenarios.map((k) => (
              <ScenarioBerekeningKaart
                key={k}
                scenarioKey={k}
                begroting={begroting}
                open={openScenario === k}
                onToggle={() => setOpenScenario(openScenario === k ? null : k)}
              />
            ))}
          </div>
        </>
      )}

      <BinnenkortBlok />
    </div>
  );
}

// --- Sub-componenten ---------------------------------------------------------

function Header() {
  return (
    <div className="bg-gradient-to-br from-[#003366] to-[#1a4d8a] text-white rounded-xl p-6">
      <div className="text-[10px] uppercase tracking-[0.25em] text-blue-200 mb-2">
        Stap 8 — Audit
      </div>
      <h2 className="text-2xl font-bold mb-2">Berekeningen — out-of-pocket per scenario</h2>
      <p className="text-sm text-blue-100 leading-relaxed max-w-3xl">
        Transparante audit-pagina: per scenario zie je <strong>HOE</strong> elk bedrag is opgebouwd.
        Eenmalige investering plus structurele jaarlast, lifecycle-curve per domein, en de som-checks
        die garanderen dat alles aansluit op het scenariototaal en de jaarlijkse cap. Pure read-only —
        voor stuurgroep-verantwoording.
      </p>
    </div>
  );
}

function GeenBegrotingPlaceholder() {
  return (
    <div className="bg-white border-2 border-dashed border-gray-300 rounded-xl p-10 text-center">
      <div className="w-12 h-12 rounded-full bg-gray-100 mx-auto flex items-center justify-center mb-4">
        <svg className="w-6 h-6 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 17v-2m3 2v-4m3 4v-6m2 10H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
        </svg>
      </div>
      <p className="text-sm font-medium text-gray-700 mb-1">Nog geen begrotingsadvies</p>
      <p className="text-xs text-gray-500 max-w-md mx-auto">
        Ga naar <strong>Cross-analyse · Stap 6 (Optimaliseren)</strong> en genereer het
        begrotingsadvies. De berekeningen op deze pagina worden automatisch gevuld.
      </p>
    </div>
  );
}

function BinnenkortBlok() {
  return (
    <div className="bg-gray-50 border border-gray-200 rounded-xl p-4">
      <p className="text-xs uppercase tracking-wider text-gray-500 font-semibold mb-1">
        Komt later
      </p>
      <ul className="text-sm text-gray-600 space-y-0.5 list-disc ml-5">
        <li>§4.2 Interne uren — berekeningen per rol × jaar × tarief</li>
        <li>§4.3 Totaalberekeningen — out-of-pocket + interne uren samen</li>
      </ul>
    </div>
  );
}

function ScenarioPicker({
  beschikbaar,
  actief,
  onPick,
  begroting,
}: {
  beschikbaar: ScenarioKey[];
  actief: ScenarioKey | null;
  onPick: (k: ScenarioKey) => void;
  session: DINSession;
  begroting: BegrotingAdvies;
}) {
  return (
    <div className="bg-white border border-gray-200 rounded-xl p-4">
      <p className="text-[10px] uppercase tracking-wider font-semibold text-gray-500 mb-2">
        Snel-navigatie
      </p>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2">
        {beschikbaar.map((k) => {
          const meta = SCENARIO_META[k];
          const s = begroting.scenarios?.[k];
          const isActief = actief === k;
          return (
            <button
              key={k}
              onClick={() => onPick(k)}
              className={`text-left rounded-lg border-2 p-3 transition-all ${
                isActief
                  ? `border-current ${meta.accent} bg-white shadow-sm ring-2 ${meta.ring}`
                  : "border-gray-200 hover:border-gray-300 bg-white"
              }`}
            >
              <div className={`text-[10px] uppercase tracking-wider font-bold ${meta.accent}`}>
                {meta.label}
              </div>
              <div className="text-lg font-bold text-gray-800 mt-1 font-mono">
                {formatEurK(s?.totaalGeraamdEuro ?? 0)}
              </div>
              <div className="text-[11px] text-gray-500 mt-0.5">
                {s?.aantalJaren ?? 0} jr · cap {formatEurK(s?.jaarlijksBudgetEuro ?? 0)}/jr
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
}

function ScenarioBerekeningKaart({
  scenarioKey,
  begroting,
  open,
  onToggle,
}: {
  scenarioKey: ScenarioKey;
  begroting: BegrotingAdvies;
  open: boolean;
  onToggle: () => void;
}) {
  const scenario = begroting.scenarios?.[scenarioKey];
  const meta = SCENARIO_META[scenarioKey];

  const startJaar = begroting.startJaar;
  const aantalJaren = scenario?.aantalJaren ?? 0;
  const jaren = useMemo(
    () => Array.from({ length: aantalJaren }, (_, i) => startJaar + i),
    [startJaar, aantalJaren]
  );

  if (!scenario) return null;

  const cap = scenario.jaarlijksBudgetEuro;
  const totaalScenario = scenario.totaalGeraamdEuro;
  const tol = tolerantie(totaalScenario);

  // --- Sectie B: per inspanning -------------------------------------------
  const inspanningen = scenario.inspanningen ?? [];
  const sumInspanningen = inspanningen.reduce((s, i) => s + (i.totaalEuro ?? 0), 0);
  const inspanningenDelta = sumInspanningen - totaalScenario;

  // --- Sectie C: per jaar ---------------------------------------------------
  // Bouw een matrix: rows = inspanning, cols = jaar
  const perJaarPerInspanning = inspanningen.map((insp) => {
    const cells: Record<number, number> = {};
    const fases: Record<number, string> = {};
    for (const v of insp.verdelingPerJaar ?? []) {
      cells[v.jaar] = (cells[v.jaar] ?? 0) + (v.euro ?? 0);
      if (v.fase) fases[v.jaar] = v.fase;
    }
    return {
      titel: insp.inspanningTitel,
      domein: insp.domein,
      totaal: insp.totaalEuro,
      cells,
      fases,
    };
  });

  // Per-jaar som over alle inspanningen
  const totalenPerJaarFromInsp: Record<number, number> = {};
  for (const insp of perJaarPerInspanning) {
    for (const j of jaren) {
      totalenPerJaarFromInsp[j] = (totalenPerJaarFromInsp[j] ?? 0) + (insp.cells[j] ?? 0);
    }
  }

  // Officiële totalenPerJaar (uit scenario)
  const officieelPerJaar: Record<number, number> = {};
  for (const t of scenario.totalenPerJaar ?? []) {
    officieelPerJaar[t.jaar] = t.euro;
  }

  const sumJaartotalen = jaren.reduce((s, j) => s + (officieelPerJaar[j] ?? 0), 0);
  const jaartotalenDelta = sumJaartotalen - totaalScenario;

  // --- Sectie D: som-controle ----------------------------------------------
  const checks: { label: string; ok: boolean; uitleg: string }[] = [
    {
      label: "Σ inspanning-totalen = scenario-totaal",
      ok: Math.abs(inspanningenDelta) <= tol,
      uitleg: `Som inspanningen ${formatEur(sumInspanningen)} vs scenario ${formatEur(totaalScenario)} — verschil ${formatEur(Math.abs(inspanningenDelta))} (tolerantie ${formatEur(tol)}).`,
    },
    {
      label: "Σ jaartotalen = scenario-totaal",
      ok: Math.abs(jaartotalenDelta) <= tol,
      uitleg: `Som jaartotalen ${formatEur(sumJaartotalen)} vs scenario ${formatEur(totaalScenario)} — verschil ${formatEur(Math.abs(jaartotalenDelta))} (tolerantie ${formatEur(tol)}).`,
    },
    {
      label: "Geen jaar boven cap (€/jaar)",
      ok: jaren.every((j) => (officieelPerJaar[j] ?? 0) <= cap + tol),
      uitleg: `Hoogste jaarbedrag: ${formatEur(Math.max(...jaren.map((j) => officieelPerJaar[j] ?? 0)))} — cap ${formatEur(cap)}.`,
    },
    {
      label: "Σ verdelingPerJaar (per inspanning) = inspanning-totaal",
      ok: inspanningen.every((insp) => {
        const sum = (insp.verdelingPerJaar ?? []).reduce((s, v) => s + (v.euro ?? 0), 0);
        return Math.abs(sum - (insp.totaalEuro ?? 0)) <= tolerantie(insp.totaalEuro ?? 0);
      }),
      uitleg: "Voor elke inspanning telt de jaar-verdeling op tot het inspanning-totaal.",
    },
  ];

  const allOk = checks.every((c) => c.ok);

  return (
    <div className="bg-white border border-gray-200 rounded-xl overflow-hidden">
      {/* Banner / toggle */}
      <button
        onClick={onToggle}
        className={`w-full ${meta.band} text-white px-5 py-3 flex items-center justify-between text-left`}
      >
        <div>
          <div className="text-[10px] uppercase tracking-[0.2em] opacity-80">{meta.label}</div>
          <div className="text-base font-bold mt-0.5">
            {formatEurK(totaalScenario)}
            <span className="text-xs font-normal opacity-80 ml-2">
              over {aantalJaren} jaar ({startJaar}–{startJaar + aantalJaren - 1}) · cap {formatEurK(cap)}/jr
            </span>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <span
            className={`text-[10px] uppercase tracking-wider font-bold px-2 py-1 rounded ${
              allOk ? "bg-emerald-500/30 text-emerald-50" : "bg-red-500/40 text-red-50"
            }`}
          >
            {allOk ? "✓ klopt" : "⚠ controleren"}
          </span>
          <svg
            className={`w-5 h-5 transition-transform ${open ? "rotate-180" : ""}`}
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
          </svg>
        </div>
      </button>

      {open && (
        <div className="p-5 space-y-6">
          <Sectie0VolledigeBerekening
            inspanningen={inspanningen}
            jaren={jaren}
            aantalJaren={aantalJaren}
            startJaar={startJaar}
            cap={cap}
            totaalScenario={totaalScenario}
            scenarioLabel={meta.label}
          />
          <SectieA cap={cap} aantalJaren={aantalJaren} startJaar={startJaar} totaalScenario={totaalScenario} />
          <SectieB
            inspanningen={inspanningen}
            sumInspanningen={sumInspanningen}
            totaalScenario={totaalScenario}
            tol={tol}
            aantalJaren={aantalJaren}
          />
          <SectieScenarioTotaal
            inspanningen={inspanningen}
            aantalJaren={aantalJaren}
            totaalScenario={totaalScenario}
          />
          <SectieC
            jaren={jaren}
            perJaarPerInspanning={perJaarPerInspanning}
            officieelPerJaar={officieelPerJaar}
            totalenPerJaarFromInsp={totalenPerJaarFromInsp}
            cap={cap}
            startJaar={startJaar}
            aantalJaren={aantalJaren}
          />
          <SectieD checks={checks} allOk={allOk} />
        </div>
      )}
    </div>
  );
}

// --- Sectie 0 — Volledige berekening (vanaf nul) ----------------------------

function Sectie0VolledigeBerekening({
  inspanningen,
  jaren,
  aantalJaren,
  startJaar,
  cap,
  totaalScenario,
  scenarioLabel,
}: {
  inspanningen: InspanningRow[];
  jaren: number[];
  aantalJaren: number;
  startJaar: number;
  cap: number;
  totaalScenario: number;
  scenarioLabel: string;
}) {
  // Stap 1+2: dossier-derivation per inspanning
  const derivations = inspanningen.map((insp) => {
    const d = findDossier(insp.inspanningTitel);
    const eenmaligMin = d?.eenmaligMin ?? 0;
    const eenmaligMax = d?.eenmaligMax ?? 0;
    const eenmaligMid = d?.eenmaligMid ?? 0;
    const structJr = d?.structureelPerJaar ?? 0;
    const structTotaal = structJr * aantalJaren;
    const berekend = d ? eenmaligMid + structTotaal : insp.totaalEuro ?? 0;
    return {
      titel: insp.inspanningTitel,
      domein: insp.domein,
      heeftDossier: !!d,
      eenmaligMin,
      eenmaligMax,
      eenmaligMid,
      structJr,
      structTotaal,
      berekend,
      werkelijk: insp.totaalEuro ?? 0,
      verdelingPerJaar: insp.verdelingPerJaar ?? [],
      toelichting: d?.toelichting ?? "",
    };
  });
  const sumBerekend = derivations.reduce((s, r) => s + r.berekend, 0);
  const sumWerkelijk = derivations.reduce((s, r) => s + r.werkelijk, 0);

  // Stap 3: theoretische curve-toepassing per inspanning op totaalEuro
  const theoretischePerJaar: Record<number, number> = {};
  for (const j of jaren) theoretischePerJaar[j] = 0;
  const theoretischePerInsp = derivations.map((r) => {
    const curve = CURVES[r.domein]?.[aantalJaren];
    const cells: Record<number, number> = {};
    if (curve && curve.length === aantalJaren) {
      jaren.forEach((j, idx) => {
        const v = Math.round((curve[idx] / 100) * r.werkelijk);
        cells[j] = v;
        theoretischePerJaar[j] += v;
      });
    } else {
      // fallback lineair
      const perJaar = Math.round(r.werkelijk / aantalJaren);
      jaren.forEach((j) => {
        cells[j] = perJaar;
        theoretischePerJaar[j] += perJaar;
      });
    }
    return {
      titel: r.titel,
      domein: r.domein,
      curve,
      cells,
      werkelijk: r.werkelijk,
    };
  });

  // Stap 5: werkelijke jaartotalen uit Supabase
  const werkelijkPerJaar: Record<number, number> = {};
  for (const j of jaren) werkelijkPerJaar[j] = 0;
  for (const r of derivations) {
    for (const v of r.verdelingPerJaar) {
      werkelijkPerJaar[v.jaar] = (werkelijkPerJaar[v.jaar] ?? 0) + (v.euro ?? 0);
    }
  }
  const sumWerkelijkPerJaar = jaren.reduce((s, j) => s + (werkelijkPerJaar[j] ?? 0), 0);

  return (
    <details className="rounded-lg border-2 border-[#003366]/20 bg-gradient-to-br from-[#003366]/5 to-white">
      <summary className="cursor-pointer px-4 py-3 select-none hover:bg-[#003366]/5 rounded-t-lg">
        <span className="text-sm font-semibold text-[#003366]">
          📋 Volledige berekening — vanaf nul
        </span>
        <span className="text-xs text-gray-500 ml-2">
          (klik om alle 5 stappen te zien — van dossier-input tot eindgetal)
        </span>
      </summary>
      <div className="space-y-5 px-5 pt-2 pb-5 text-sm">
        {/* Stap 1: Component-derivation per inspanning */}
        <div>
          <h4 className="font-semibold text-[#003366]">
            Stap 1 — Dossier-input · component-derivation per inspanning
          </h4>
          <p className="text-xs text-gray-500 ml-4 mt-0.5 mb-2">
            Voor elke inspanning is het eenmalige + structurele bedrag opgebouwd uit individuele
            componenten met onderbouwing (uur-tarieven, aantal gebruikers, dagprijzen). Klik op een
            inspanning om de breakdown te zien.
          </p>
          <div className="ml-4 space-y-2">
            {derivations.map((r, i) => (
              <Stap1ComponentDerivation
                key={i}
                titel={r.titel}
                domein={r.domein}
                heeftDossier={r.heeftDossier}
                eenmaligMin={r.eenmaligMin}
                eenmaligMax={r.eenmaligMax}
                eenmaligMid={r.eenmaligMid}
                structJr={r.structJr}
                werkelijk={r.werkelijk}
                aantalJaren={aantalJaren}
              />
            ))}
          </div>
        </div>

        {/* Stap 2: Inspanning-totaal formule */}
        <div>
          <h4 className="font-semibold text-[#003366]">
            Stap 2 — Inspanning-totaal = eenmalig + structureel × {aantalJaren} jaar
          </h4>
          <pre className="text-xs bg-gray-50 border border-gray-200 p-3 rounded ml-4 mt-1 overflow-x-auto whitespace-pre">
{derivations
  .map((r) => {
    const naam = r.titel.length > 28 ? r.titel.slice(0, 27) + "…" : r.titel;
    const naamPad = naam.padEnd(30, " ");
    if (!r.heeftDossier) {
      return `${naamPad}  ${formatEur(r.werkelijk).padStart(10, " ")}  (geen dossier — direct overgenomen)`;
    }
    if (r.structJr === 0) {
      return `${naamPad}  ${formatEur(r.eenmaligMid).padStart(10, " ")} mid + 0  =  ${formatEur(r.berekend).padStart(10, " ")}`;
    }
    return `${naamPad}  ${formatEur(r.eenmaligMid).padStart(10, " ")} mid + ${aantalJaren} × ${formatEur(r.structJr).padStart(8, " ")} = ${formatEur(r.berekend).padStart(10, " ")}`;
  })
  .join("\n")}
{`\n${"─".repeat(72)}`}
{`\nΣ scenario-totaal (theoretisch):  ${formatEur(sumBerekend).padStart(12, " ")}`}
{`\nWerkelijk scenario-totaal:        ${formatEur(sumWerkelijk).padStart(12, " ")}`}
{sumBerekend !== sumWerkelijk && `\nΔ verschil:                       ${formatEur(sumWerkelijk - sumBerekend).padStart(12, " ")}  (scenario heeft geschoven; zie Stap 4)`}
          </pre>
        </div>

        {/* Stap 3: Lifecycle-curve theoretisch */}
        <div>
          <h4 className="font-semibold text-[#003366]">
            Stap 3 — Lifecycle-curve toepassen (theoretisch)
          </h4>
          <p className="text-xs text-gray-600 ml-4 mt-0.5">
            Curves uit <code className="bg-gray-100 px-1 rounded text-[10px]">FASE_CHAINS</code> per
            domein × {aantalJaren} jaar. Per cel: curve-% × inspanning-totaal.
          </p>
          <pre className="text-xs bg-gray-50 border border-gray-200 p-3 rounded ml-4 mt-1 overflow-x-auto whitespace-pre">
{theoretischePerInsp
  .map((r) => {
    const naam = r.titel.length > 24 ? r.titel.slice(0, 23) + "…" : r.titel;
    const curveStr = r.curve ? r.curve.join("/") + "%" : "lineair";
    const cellsStr = jaren
      .map((j) => formatEurK(r.cells[j] ?? 0).padStart(8, " "))
      .join(" / ");
    return `${naam.padEnd(26, " ")} (${(DOMAIN_LABEL[r.domein] ?? r.domein).padEnd(15, " ")} ${curveStr.padEnd(20, " ")}):  ${cellsStr}`;
  })
  .join("\n")}
{`\n${"─".repeat(72)}`}
{`\nΣ theoretisch jaar-totalen:${" ".repeat(48)}${jaren.map((j) => formatEurK(theoretischePerJaar[j] ?? 0).padStart(8, " ")).join(" / ")}`}
          </pre>
        </div>

        {/* Stap 4: Aanpassingen */}
        <div>
          <h4 className="font-semibold text-[#003366]">Stap 4 — Aanpassingen toegepast</h4>
          <ul className="text-xs ml-4 mt-1 space-y-1.5 text-gray-700">
            <li>
              <strong>A. {startJaar} Cito-eis:</strong> jaartotaal in {startJaar} moet exact passen
              binnen het Cito-norm-budget (de start-cap). Als de theoretische curve in {startJaar}{" "}
              eronder zit, wordt het verschil proportioneel opgehoogd; overschot wordt getrokken
              uit latere jaren met capaciteit. Theoretisch was{" "}
              {formatEurK(theoretischePerJaar[startJaar] ?? 0)}, eindbedrag werd{" "}
              {formatEurK(werkelijkPerJaar[startJaar] ?? 0)}.
            </li>
            <li>
              <strong>B. Cap-respect:</strong> geen jaartotaal mag boven scenario-cap (
              {scenarioLabel}: {formatEurK(cap)}/jaar) uitkomen. Bij overschrijding herverdeelt
              water-fill het overschot proportioneel naar lichtere jaren.
            </li>
            <li>
              <strong>C. Cultuur-ophoging:</strong> dossier-mid-totaal voor cultuur is bewust
              opgehoogd naar realistisch verankeringsniveau (€100K–€130K afhankelijk van scenario)
              omdat borgingslast in HR-cyclus een meerjarige tail vraagt. Cultuur-cellen zijn
              herrekend met de afnemende curve.
            </li>
            <li>
              <strong>D. Inspanning-totaal blijft leidend:</strong> per inspanning telt de
              jaar-verdeling altijd op tot het inspanning-totaal (zie Sectie B+ en D voor de
              som-checks).
            </li>
          </ul>
        </div>

        {/* Stap 5: Eindbedrag per cell */}
        <div>
          <h4 className="font-semibold text-[#003366]">
            Stap 5 — Eindbedrag per cell (na alle aanpassingen)
          </h4>
          <pre className="text-xs bg-gray-50 border border-gray-200 p-3 rounded ml-4 mt-1 overflow-x-auto whitespace-pre">
{jaren
  .map((j) => {
    const parts = derivations
      .map((r) => {
        const cell = r.verdelingPerJaar.find((v) => v.jaar === j)?.euro ?? 0;
        if (cell === 0) return null;
        const kort = r.titel.split(/[ \-—]/)[0].slice(0, 12);
        return `${kort} ${formatEurK(cell)}`;
      })
      .filter((x): x is string => x !== null)
      .join(" + ");
    const totaal = werkelijkPerJaar[j] ?? 0;
    const overcap = totaal > cap * 1.001;
    const capMark = overcap ? "⚠ over cap" : totaal > cap * 0.99 ? "(≈cap)" : "";
    return `${j}: ${parts}  =  ${formatEurK(totaal)}  ${capMark}`;
  })
  .join("\n")}
{`\n${"─".repeat(72)}`}
{`\nΣ scenario-totaal: ${formatEur(sumWerkelijkPerJaar)}  ${Math.abs(sumWerkelijkPerJaar - totaalScenario) <= tolerantie(totaalScenario) ? "✓" : "⚠"}`}
          </pre>
          <p className="text-xs text-gray-600 italic mt-1.5 ml-4">
            Bovenstaande cijfers komen uit Supabase (scenario.inspanningen[].verdelingPerJaar).
            Volledige som-checks staan in Sectie D onderaan.
          </p>
        </div>
      </div>
    </details>
  );
}

// --- Stap 1 — Component-derivation per inspanning ---------------------------

function Stap1ComponentDerivation({
  titel,
  domein,
  heeftDossier,
  eenmaligMin,
  eenmaligMax,
  eenmaligMid,
  structJr,
  werkelijk,
  aantalJaren,
}: {
  titel: string;
  domein: string;
  heeftDossier: boolean;
  eenmaligMin: number;
  eenmaligMax: number;
  eenmaligMid: number;
  structJr: number;
  werkelijk: number;
  aantalJaren: number;
}) {
  const breakdown = findComponentBreakdown(titel);

  // Header-samenvatting (altijd zichtbaar in <summary>)
  let samenvatting: React.ReactNode;
  if (heeftDossier) {
    samenvatting = (
      <>
        eenmalig {formatEurK(eenmaligMin)}–{formatEurK(eenmaligMax)}
        {structJr > 0 ? (
          <>
            {" "}+ {formatEur(structJr)}/jaar structureel
          </>
        ) : (
          <> · geen structureel</>
        )}
      </>
    );
  } else {
    samenvatting = (
      <span className="text-gray-500">
        geen dossier — gebruikt scenario-totaal direct ({formatEurK(werkelijk)})
      </span>
    );
  }

  // Tel componenten (om subtotalen te tonen)
  const sumEenmaligMin = breakdown
    ? breakdown.eenmaligComponents.reduce((s, c) => s + c.rangeMin, 0)
    : 0;
  const sumEenmaligMax = breakdown
    ? breakdown.eenmaligComponents.reduce((s, c) => s + c.rangeMax, 0)
    : 0;
  const sumStructMin = breakdown
    ? breakdown.structureelComponents.reduce((s, c) => s + c.perJaarMin, 0)
    : 0;
  const sumStructMax = breakdown
    ? breakdown.structureelComponents.reduce((s, c) => s + c.perJaarMax, 0)
    : 0;

  return (
    <details className="border-l-2 border-[#003366]/30 bg-white rounded-r-lg overflow-hidden group">
      <summary className="cursor-pointer select-none px-3 py-2 hover:bg-[#003366]/5 list-none">
        <div className="flex items-baseline gap-2 flex-wrap">
          <svg
            className="w-3 h-3 text-gray-400 transition-transform group-open:rotate-90 inline-block flex-shrink-0"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
          </svg>
          <span
            className={`inline-block w-2 h-2 rounded-full ${DOMAIN_DOT[domein] ?? "bg-gray-400"}`}
          />
          <span className="font-semibold text-sm text-gray-800">{titel}</span>
          <span className="text-xs text-gray-600">— {samenvatting}</span>
        </div>
      </summary>
      {breakdown && (
        <div className="px-4 pt-1 pb-3 space-y-3">
          {/* EENMALIG */}
          {breakdown.eenmaligComponents.length > 0 && (
            <div>
              <p className="text-[10px] uppercase tracking-wider font-bold text-[#003366] mb-1.5">
                Eenmalig — componenten
              </p>
              <div className="space-y-2">
                {breakdown.eenmaligComponents.map((c, idx) => (
                  <ComponentDerivationCard
                    key={idx}
                    naam={c.naam}
                    range={
                      c.rangeMin === c.rangeMax
                        ? formatEur(c.rangeMin)
                        : `${formatEur(c.rangeMin)} – ${formatEur(c.rangeMax)}`
                    }
                    toelichting={c.toelichting}
                    formule={c.formule}
                    berekeningMin={c.berekeningMin ?? c.berekening}
                    berekeningMid={c.berekeningMid}
                    berekeningMax={c.berekeningMax}
                    tariefOnderbouwing={c.tariefOnderbouwing}
                    aantalOnderbouwing={c.aantalOnderbouwing}
                  />
                ))}
              </div>
              <div className="mt-2 pt-2 border-t border-gray-200 text-[11px] font-mono text-gray-700 flex items-baseline justify-between flex-wrap gap-2">
                <span className="font-semibold">Σ eenmalig</span>
                <span>
                  {formatEur(sumEenmaligMin)} – {formatEur(sumEenmaligMax)}
                  <span className="text-gray-500"> (mid {formatEur(eenmaligMid)})</span>
                </span>
              </div>
            </div>
          )}

          {/* STRUCTUREEL */}
          {breakdown.structureelComponents.length > 0 ? (
            <div>
              <p className="text-[10px] uppercase tracking-wider font-bold text-[#003366] mb-1.5">
                Structureel — componenten (per jaar)
              </p>
              <div className="space-y-2">
                {breakdown.structureelComponents.map((c, idx) => (
                  <ComponentDerivationCard
                    key={idx}
                    naam={c.naam}
                    range={
                      c.perJaarMin === c.perJaarMax
                        ? `${formatEur(c.perJaarMin)}/jaar`
                        : `${formatEur(c.perJaarMin)} – ${formatEur(c.perJaarMax)}/jaar`
                    }
                    toelichting={c.toelichting}
                    formule={c.formule}
                    berekeningMin={c.berekeningMin ?? c.berekening}
                    berekeningMax={c.berekeningMax}
                    tariefOnderbouwing={c.tariefOnderbouwing}
                    aantalOnderbouwing={c.aantalOnderbouwing}
                  />
                ))}
              </div>
              <div className="mt-2 pt-2 border-t border-gray-200 text-[11px] font-mono text-gray-700 flex items-baseline justify-between flex-wrap gap-2">
                <span className="font-semibold">Σ structureel</span>
                <span>
                  {sumStructMin === sumStructMax
                    ? `${formatEur(sumStructMin)}/jaar`
                    : `${formatEur(sumStructMin)} – ${formatEur(sumStructMax)}/jaar`}
                  {structJr > 0 && (
                    <span className="text-gray-500"> (gemiddeld {formatEur(structJr)}/jaar)</span>
                  )}
                </span>
              </div>
              {breakdown.structureelNote && (
                <p className="text-[11px] text-gray-500 italic mt-1.5">
                  {breakdown.structureelNote}
                </p>
              )}
            </div>
          ) : (
            <div>
              <p className="text-[10px] uppercase tracking-wider font-bold text-[#003366] mb-1">
                Structureel
              </p>
              <p className="text-[11px] text-gray-600 italic">
                {breakdown.structureelNote ?? "€ 0/jaar — geen structurele kosten"}
              </p>
            </div>
          )}

          <p className="text-[10px] text-gray-500 leading-relaxed">
            <strong>Inspanning-totaal:</strong> middenpunt eenmalig ({formatEur(eenmaligMid)})
            {structJr > 0 && (
              <>
                {" "}+ {aantalJaren} jaar × {formatEur(structJr)} ={" "}
                {formatEur(eenmaligMid + structJr * aantalJaren)}
              </>
            )}
            . Werkelijk in scenario: <strong>{formatEur(werkelijk)}</strong>.
          </p>
        </div>
      )}
      {!breakdown && heeftDossier && (
        <div className="px-4 pt-1 pb-3">
          <p className="text-[11px] text-gray-500 italic">
            Component-breakdown nog niet beschikbaar voor deze inspanning. Dossier-bedrag:{" "}
            eenmalig {formatEurK(eenmaligMin)}–{formatEurK(eenmaligMax)} (mid{" "}
            {formatEurK(eenmaligMid)})
            {structJr > 0 && <> + {formatEur(structJr)}/jaar structureel</>}.
          </p>
        </div>
      )}
      {!breakdown && !heeftDossier && (
        <div className="px-4 pt-1 pb-3">
          <p className="text-[11px] text-gray-500 italic">
            Geen dossier-match — scenario-totaal {formatEurK(werkelijk)} wordt direct overgenomen
            uit de scenario-data.
          </p>
        </div>
      )}
    </details>
  );
}

// --- Component derivation card — per component formule + berekening + onderbouwing
// Toont voor elk component een eigen kaart: range-bedrag, formule, berekening
// (min/mid/max waar beschikbaar), tarief-onderbouwing en aantal-onderbouwing.
// Bedragen + formules in mono-font; onderbouwingen in italic gray. Stuurgroep
// kan elk eindbedrag terug-rekenen tot uur-tarief × aantal-eenheden.

function ComponentDerivationCard({
  naam,
  range,
  toelichting,
  formule,
  berekeningMin,
  berekeningMid,
  berekeningMax,
  tariefOnderbouwing,
  aantalOnderbouwing,
}: {
  naam: string;
  range: string;
  toelichting?: string;
  formule?: string;
  berekeningMin?: string;
  berekeningMid?: string;
  berekeningMax?: string;
  tariefOnderbouwing?: string;
  aantalOnderbouwing?: string;
}) {
  const heeftBerekening = !!(berekeningMin || berekeningMid || berekeningMax);
  const heeftOnderbouwing = !!(tariefOnderbouwing || aantalOnderbouwing);
  return (
    <div className="bg-gray-50 border border-gray-200 rounded p-2.5 text-[11px]">
      {/* Header: naam + range */}
      <div className="flex items-baseline justify-between gap-3 flex-wrap">
        <div className="flex items-baseline gap-1.5 min-w-0">
          <span className="text-[#003366] font-bold flex-shrink-0">▌</span>
          <span className="font-semibold text-gray-800">{naam}</span>
        </div>
        <span className="font-mono font-semibold text-gray-900 flex-shrink-0">{range}</span>
      </div>

      {/* Formule */}
      {formule && (
        <div className="mt-1.5 ml-3.5">
          <span className="text-[10px] uppercase tracking-wider font-bold text-gray-500">
            Formule:{" "}
          </span>
          <span className="font-mono text-gray-700">{formule}</span>
        </div>
      )}

      {/* Berekening min/mid/max */}
      {heeftBerekening && (
        <div className="mt-1 ml-3.5">
          <p className="text-[10px] uppercase tracking-wider font-bold text-gray-500 mb-0.5">
            Berekening
          </p>
          <ul className="font-mono text-gray-800 space-y-0.5">
            {berekeningMin && (
              <li>
                <span className="text-gray-500 inline-block w-9">Min:</span>
                {berekeningMin}
              </li>
            )}
            {berekeningMid && (
              <li>
                <span className="text-gray-500 inline-block w-9">Mid:</span>
                {berekeningMid}
              </li>
            )}
            {berekeningMax && (
              <li>
                <span className="text-gray-500 inline-block w-9">Max:</span>
                {berekeningMax}
              </li>
            )}
          </ul>
        </div>
      )}

      {/* Onderbouwingen */}
      {heeftOnderbouwing && (
        <div className="mt-1.5 ml-3.5 space-y-0.5">
          {tariefOnderbouwing && (
            <p className="italic text-gray-500">
              <span className="not-italic font-semibold text-gray-600">Tarief:</span>{" "}
              {tariefOnderbouwing}
            </p>
          )}
          {aantalOnderbouwing && (
            <p className="italic text-gray-500">
              <span className="not-italic font-semibold text-gray-600">Aantal:</span>{" "}
              {aantalOnderbouwing}
            </p>
          )}
        </div>
      )}

      {/* Korte toelichting (fallback wanneer er geen formule/berekening is) */}
      {!formule && !heeftBerekening && toelichting && (
        <p className="mt-1 ml-3.5 italic text-gray-500">{toelichting}</p>
      )}
    </div>
  );
}

// --- Sectie A — Scenario input ------------------------------------------------

function SectieA({
  cap,
  aantalJaren,
  startJaar,
  totaalScenario,
}: {
  cap: number;
  aantalJaren: number;
  startJaar: number;
  totaalScenario: number;
}) {
  const theoMax = cap * aantalJaren;
  const benutting = theoMax > 0 ? totaalScenario / theoMax : 0;
  return (
    <div>
      <SectieKop nummer="A" titel="Scenario-input" hint="Welke begrenzingen gelden voor dit scenario?" />
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <Stat label="Cap (€/jaar)" value={formatEur(cap)} mono />
        <Stat label="Aantal jaren" value={`${aantalJaren} jr`} sub={`${startJaar}–${startJaar + aantalJaren - 1}`} />
        <Stat label="Theoretisch max" value={formatEur(theoMax)} mono sub="cap × jaren" />
        <Stat
          label="Benutting"
          value={pct(totaalScenario, theoMax)}
          sub={`${formatEur(totaalScenario)} / ${formatEur(theoMax)}`}
          highlight={benutting > 1.001}
        />
      </div>
    </div>
  );
}

// --- Sectie B — per inspanning + derivation ------------------------------------

type InspanningRow = NonNullable<NonNullable<BegrotingAdvies["scenarios"]["optimaal"]>>["inspanningen"][number];

function SectieB({
  inspanningen,
  sumInspanningen,
  totaalScenario,
  tol,
  aantalJaren,
}: {
  inspanningen: InspanningRow[];
  sumInspanningen: number;
  totaalScenario: number;
  tol: number;
  aantalJaren: number;
}) {
  return (
    <div>
      <SectieKop
        nummer="B"
        titel="Berekening per inspanning — eenmalig + structureel"
        hint="Hoe komt het inspanning-totaal tot stand? Eenmalige investering (mid uit dossier-range) + structurele jaarlast × aantal jaren."
      />
      <div className="overflow-x-auto rounded-lg border border-gray-200">
        <table className="w-full text-sm">
          <thead className="bg-gray-50">
            <tr className="text-left text-[10px] uppercase tracking-wider text-gray-500">
              <th className="px-3 py-2 font-semibold">Inspanning</th>
              <th className="px-3 py-2 font-semibold">Domein</th>
              <th className="px-3 py-2 font-semibold text-right">Eenmalig (mid)</th>
              <th className="px-3 py-2 font-semibold text-right">+ Structureel × {aantalJaren} jr</th>
              <th className="px-3 py-2 font-semibold text-right">= Berekend</th>
              <th className="px-3 py-2 font-semibold text-right">Inspanning-totaal</th>
              <th className="px-3 py-2 font-semibold text-right">% v. scenario</th>
              <th className="px-3 py-2 font-semibold text-center">Match</th>
            </tr>
          </thead>
          <tbody>
            {inspanningen.map((insp, i) => {
              const dossier = findDossier(insp.inspanningTitel);
              const sumVerdeling = (insp.verdelingPerJaar ?? []).reduce(
                (s, v) => s + (v.euro ?? 0),
                0
              );
              const localTol = tolerantie(insp.totaalEuro ?? 0);
              const sumMatch = Math.abs(sumVerdeling - (insp.totaalEuro ?? 0)) <= localTol;

              const eenmalig = dossier?.eenmaligMid ?? null;
              const structJr = dossier?.structureelPerJaar ?? null;
              const structTotaal = structJr !== null ? structJr * aantalJaren : null;
              const berekend = eenmalig !== null && structTotaal !== null ? eenmalig + structTotaal : null;
              const derivTol = berekend !== null ? Math.max(50_000, Math.round(berekend * 0.15)) : 0; // ruime tolerantie — scenario kan ±20% schuiven
              const derivMatch =
                berekend !== null
                  ? Math.abs(berekend - (insp.totaalEuro ?? 0)) <= derivTol
                  : null;

              return (
                <tr key={i} className="border-t border-gray-100 hover:bg-gray-50/50 align-top">
                  <td className="px-3 py-2">
                    <p className="font-medium text-gray-800">{insp.inspanningTitel}</p>
                    {dossier && (
                      <p className="text-[11px] text-gray-500 mt-0.5 leading-snug">
                        {dossier.toelichting}
                      </p>
                    )}
                  </td>
                  <td className="px-3 py-2">
                    <span className="inline-flex items-center gap-1.5 text-[11px] text-gray-700">
                      <span className={`w-2 h-2 rounded-full ${DOMAIN_DOT[insp.domein] ?? "bg-gray-400"}`} />
                      {DOMAIN_LABEL[insp.domein] ?? insp.domein}
                    </span>
                  </td>
                  <td className="px-3 py-2 text-right font-mono text-gray-700">
                    {eenmalig !== null ? (
                      <>
                        <div>{formatEur(eenmalig)}</div>
                        <div className="text-[10px] text-gray-400">
                          {formatEurK(dossier!.eenmaligMin)}–{formatEurK(dossier!.eenmaligMax)}
                        </div>
                      </>
                    ) : (
                      <span className="text-gray-300">—</span>
                    )}
                  </td>
                  <td className="px-3 py-2 text-right font-mono text-gray-700">
                    {structTotaal !== null ? (
                      <>
                        <div>{formatEur(structTotaal)}</div>
                        <div className="text-[10px] text-gray-400">
                          {formatEur(structJr!)}/jr × {aantalJaren}
                        </div>
                      </>
                    ) : (
                      <span className="text-gray-300">—</span>
                    )}
                  </td>
                  <td className="px-3 py-2 text-right font-mono text-gray-800">
                    {berekend !== null ? formatEur(berekend) : <span className="text-gray-300">—</span>}
                  </td>
                  <td className="px-3 py-2 text-right font-mono font-semibold text-gray-900">
                    {formatEur(insp.totaalEuro)}
                    <div className="text-[10px] text-gray-400 font-normal">
                      Σ verd. {formatEur(sumVerdeling)} {sumMatch ? "✓" : "✗"}
                    </div>
                  </td>
                  <td className="px-3 py-2 text-right text-gray-600 tabular-nums">
                    {pct(insp.totaalEuro ?? 0, totaalScenario)}
                  </td>
                  <td className="px-3 py-2 text-center">
                    {derivMatch === null ? (
                      <span className="text-gray-300" title="Geen dossier-match">—</span>
                    ) : derivMatch ? (
                      <span className="text-emerald-600 font-bold" title="Berekend bedrag binnen tolerantie">✓</span>
                    ) : (
                      <span
                        className="text-amber-600 font-bold"
                        title={`Verschil ${formatEur(Math.abs((berekend ?? 0) - (insp.totaalEuro ?? 0)))} — scenario kan ±20% schuiven`}
                      >
                        ≈
                      </span>
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
          <tfoot>
            <tr className="bg-gray-50 border-t-2 border-gray-300">
              <td colSpan={5} className="px-3 py-2 text-right font-semibold text-gray-700">
                Totaal inspanningen
              </td>
              <td className="px-3 py-2 text-right font-mono font-bold text-[#003366]">
                {formatEur(sumInspanningen)}
              </td>
              <td className="px-3 py-2 text-right text-gray-500 tabular-nums">
                {pct(sumInspanningen, totaalScenario)}
              </td>
              <td className="px-3 py-2 text-center">
                {Math.abs(sumInspanningen - totaalScenario) <= tol ? (
                  <span className="text-emerald-600 font-bold">✓</span>
                ) : (
                  <span className="text-red-600 font-bold">✗</span>
                )}
              </td>
            </tr>
            <tr className="bg-gray-50 border-t border-gray-200">
              <td colSpan={5} className="px-3 py-2 text-right text-xs text-gray-500">
                Scenario-totaal (referentie)
              </td>
              <td className="px-3 py-2 text-right font-mono text-xs text-gray-500">
                {formatEur(totaalScenario)}
              </td>
              <td colSpan={2} />
            </tr>
          </tfoot>
        </table>
      </div>
      <p className="text-[11px] text-gray-500 mt-2 leading-relaxed">
        <strong>Legenda match-kolom:</strong> ✓ berekend bedrag (eenmalig + structureel × jaren) komt
        overeen met inspanning-totaal. <span className="text-amber-600 font-bold">≈</span> wijkt af —
        scenario heeft ±20% geschoven (bv. plus20 of min20). — geen dossier-match voor deze
        inspanning.
      </p>
    </div>
  );
}

// --- Nieuwe sectie: Scenario-totaal derivation -------------------------------

function SectieScenarioTotaal({
  inspanningen,
  aantalJaren,
  totaalScenario,
}: {
  inspanningen: InspanningRow[];
  aantalJaren: number;
  totaalScenario: number;
}) {
  const rows = inspanningen.map((insp) => {
    const d = findDossier(insp.inspanningTitel);
    const eenmalig = d?.eenmaligMid ?? 0;
    const structJr = d?.structureelPerJaar ?? 0;
    const structTotaal = structJr * aantalJaren;
    const berekend = d ? eenmalig + structTotaal : insp.totaalEuro ?? 0;
    return {
      titel: insp.inspanningTitel,
      domein: insp.domein,
      eenmalig,
      structJr,
      structTotaal,
      berekend,
      werkelijk: insp.totaalEuro ?? 0,
      hasDossier: !!d,
    };
  });
  const sumBerekend = rows.reduce((s, r) => s + r.berekend, 0);
  const sumWerkelijk = rows.reduce((s, r) => s + r.werkelijk, 0);
  const driftScenario = sumWerkelijk - sumBerekend;

  return (
    <div>
      <SectieKop
        nummer="B+"
        titel="Scenario-totaal — bottom-up samenvatting"
        hint="Top-level optelling: alle inspanning-derivations bij elkaar = scenariototaal."
      />
      <div className="rounded-lg border border-gray-200 bg-gradient-to-br from-blue-50/30 to-white p-4">
        <div className="font-mono text-[13px] leading-relaxed text-gray-800 space-y-1">
          {rows.map((r, i) => (
            <div key={i} className="flex items-baseline gap-2">
              <span className="text-gray-400 w-3">{i === 0 ? " " : "+"}</span>
              <span className={`w-2 h-2 rounded-full mt-1.5 ${DOMAIN_DOT[r.domein] ?? "bg-gray-400"}`} />
              <span className="flex-1 truncate">
                <span className="font-medium">{r.titel}</span>
                {r.hasDossier ? (
                  <span className="text-gray-500 text-xs ml-1">
                    ({formatEurK(r.eenmalig)} eenmalig
                    {r.structJr > 0 && (
                      <>
                        {" "}+ {aantalJaren} jr × {formatEurK(r.structJr)}
                      </>
                    )})
                  </span>
                ) : (
                  <span className="text-gray-400 text-xs ml-1">(geen dossier)</span>
                )}
              </span>
              <span className="font-semibold text-gray-900 tabular-nums">
                = {formatEurK(r.berekend)}
              </span>
            </div>
          ))}
          <div className="border-t-2 border-gray-300 mt-2 pt-2 flex items-baseline gap-2">
            <span className="text-gray-400 w-3" />
            <span className="w-2" />
            <span className="flex-1 font-bold text-[#003366]">
              Σ Scenario-totaal (bottom-up)
            </span>
            <span className="font-bold text-[#003366] tabular-nums">
              = {formatEurK(sumBerekend)}
            </span>
          </div>
          <div className="flex items-baseline gap-2 text-xs text-gray-500">
            <span className="w-3" />
            <span className="w-2" />
            <span className="flex-1">Werkelijk scenario-totaal (uit Supabase)</span>
            <span className="tabular-nums font-mono">{formatEurK(sumWerkelijk)}</span>
          </div>
          {Math.abs(driftScenario) > 5_000 && (
            <div className="flex items-baseline gap-2 text-xs text-amber-700 mt-1">
              <span className="w-3" />
              <span className="w-2" />
              <span className="flex-1">
                Δ verschil — scenario is {driftScenario > 0 ? "opgehoogd" : "verlaagd"} t.o.v. dossier-mid
              </span>
              <span className="tabular-nums font-mono">{formatEurK(Math.abs(driftScenario))}</span>
            </div>
          )}
        </div>
        <p className="text-[11px] text-gray-500 mt-3 leading-relaxed">
          De bottom-up sommering gebruikt de <strong>middenwaarde</strong> uit elke dossier-range.
          Het werkelijke scenario-totaal kan ±20% afwijken doordat scenario&apos;s &quot;sneller&quot;
          (plus20) of &quot;langzamer&quot; (min20) op dezelfde scope zijn afgesteld; voor het
          referentie-scenario (huidig budget / advies) hoort het verschil klein te zijn.
          Vergeleken met scenario-totaal: <strong>{formatEurK(totaalScenario)}</strong>.
        </p>
      </div>
    </div>
  );
}

// --- Sectie C — per jaar + lifecycle-toelichting ----------------------------

function SectieC({
  jaren,
  perJaarPerInspanning,
  officieelPerJaar,
  totalenPerJaarFromInsp,
  cap,
  startJaar,
  aantalJaren,
}: {
  jaren: number[];
  perJaarPerInspanning: Array<{ titel: string; domein: string; totaal: number; cells: Record<number, number>; fases: Record<number, string> }>;
  officieelPerJaar: Record<number, number>;
  totalenPerJaarFromInsp: Record<number, number>;
  cap: number;
  startJaar: number;
  aantalJaren: number;
}) {
  return (
    <div>
      <SectieKop
        nummer="C"
        titel="Berekening per jaar — lifecycle-curve"
        hint="Per cel: hoeveel procent van het inspanning-totaal valt in welke fase, en waarom (S-curve voor training, U-curve voor IT, etc.)."
      />
      <div className="overflow-x-auto rounded-lg border border-gray-200">
        <table className="w-full text-sm">
          <thead className="bg-gray-50">
            <tr className="text-left text-[10px] uppercase tracking-wider text-gray-500">
              <th className="px-3 py-2 font-semibold sticky left-0 bg-gray-50 z-10">Inspanning</th>
              {jaren.map((j) => (
                <th key={j} className="px-3 py-2 font-semibold text-right">
                  {j}
                </th>
              ))}
              <th className="px-3 py-2 font-semibold text-right">Totaal</th>
            </tr>
          </thead>
          <tbody>
            {perJaarPerInspanning.map((row, i) => {
              const sum = jaren.reduce((s, j) => s + (row.cells[j] ?? 0), 0);
              return (
                <tr key={i} className="border-t border-gray-100 hover:bg-gray-50/50">
                  <td className="px-3 py-2 sticky left-0 bg-white z-10">
                    <div className="flex items-center gap-1.5">
                      <span className={`w-2 h-2 rounded-full ${DOMAIN_DOT[row.domein] ?? "bg-gray-400"}`} />
                      <span className="text-gray-800 font-medium">{row.titel}</span>
                    </div>
                  </td>
                  {jaren.map((j) => {
                    const v = row.cells[j] ?? 0;
                    const cellPct = row.totaal > 0 ? Math.round((v / row.totaal) * 100) : 0;
                    return (
                      <td key={j} className="px-3 py-2 text-right font-mono text-gray-700">
                        {v > 0 ? (
                          <>
                            <div>{formatEur(v)}</div>
                            <div className="text-[10px] text-gray-400 font-normal">{cellPct}%</div>
                          </>
                        ) : (
                          <span className="text-gray-300">—</span>
                        )}
                      </td>
                    );
                  })}
                  <td className="px-3 py-2 text-right font-mono font-semibold text-gray-900">
                    {formatEur(sum)}
                  </td>
                </tr>
              );
            })}
          </tbody>
          <tfoot>
            {/* Som-uit-inspanningen */}
            <tr className="bg-gray-50 border-t-2 border-gray-300 font-semibold">
              <td className="px-3 py-2 sticky left-0 bg-gray-50 z-10 text-gray-700">
                Σ uit inspanningen
              </td>
              {jaren.map((j) => (
                <td key={j} className="px-3 py-2 text-right font-mono text-[#003366]">
                  {formatEur(totalenPerJaarFromInsp[j] ?? 0)}
                </td>
              ))}
              <td className="px-3 py-2 text-right font-mono text-[#003366]">
                {formatEur(jaren.reduce((s, j) => s + (totalenPerJaarFromInsp[j] ?? 0), 0))}
              </td>
            </tr>
            {/* Officieel veld */}
            <tr className="bg-blue-50/40 border-t border-blue-100">
              <td className="px-3 py-2 sticky left-0 bg-blue-50/40 z-10 text-gray-600 text-xs">
                totalenPerJaar (scenario-veld)
              </td>
              {jaren.map((j) => (
                <td key={j} className="px-3 py-2 text-right font-mono text-xs text-gray-600">
                  {formatEur(officieelPerJaar[j] ?? 0)}
                </td>
              ))}
              <td className="px-3 py-2 text-right font-mono text-xs text-gray-600">
                {formatEur(jaren.reduce((s, j) => s + (officieelPerJaar[j] ?? 0), 0))}
              </td>
            </tr>
            {/* Cap-vergelijking */}
            <tr className="bg-white border-t border-gray-200">
              <td className="px-3 py-2 sticky left-0 bg-white z-10 text-gray-500 text-xs">
                Cap-benutting (% van €{cap.toLocaleString("nl-NL")})
              </td>
              {jaren.map((j) => {
                const v = officieelPerJaar[j] ?? totalenPerJaarFromInsp[j] ?? 0;
                const p = cap > 0 ? v / cap : 0;
                const overcap = p > 1.001;
                return (
                  <td
                    key={j}
                    className={`px-3 py-2 text-right text-xs tabular-nums ${
                      overcap ? "text-red-600 font-bold" : "text-gray-500"
                    }`}
                  >
                    {pct(v, cap)}
                    {overcap && <span className="ml-0.5">⚠</span>}
                  </td>
                );
              })}
              <td />
            </tr>
          </tfoot>
        </table>
      </div>

      {/* Per-inspanning lifecycle toelichting */}
      <div className="mt-4 space-y-3">
        <p className="text-[11px] uppercase tracking-wider font-semibold text-gray-500">
          Lifecycle-curve per inspanning — waarom valt het bedrag in welk jaar?
        </p>
        {perJaarPerInspanning.map((row, i) => {
          const curve = CURVES[row.domein]?.[aantalJaren];
          const curveLabel = CURVE_LABEL[row.domein] ?? "Lineaire verdeling";
          return (
            <div
              key={i}
              className="rounded-lg border border-gray-200 bg-gray-50/40 p-3"
            >
              <div className="flex items-baseline gap-2 mb-2">
                <span className={`w-2 h-2 rounded-full ${DOMAIN_DOT[row.domein] ?? "bg-gray-400"}`} />
                <span className="font-semibold text-sm text-gray-800">{row.titel}</span>
                <span className="text-[11px] text-gray-500">
                  ({DOMAIN_LABEL[row.domein] ?? row.domein})
                </span>
              </div>
              <p className="text-xs text-gray-600 mb-2 italic">
                <strong className="not-italic text-gray-700">Curve:</strong> {curveLabel}
              </p>
              <div className="font-mono text-[12px] space-y-0.5">
                {jaren.map((j, idx) => {
                  const v = row.cells[j] ?? 0;
                  const cellPct = row.totaal > 0 ? Math.round((v / row.totaal) * 100) : 0;
                  const curvePct = curve?.[idx] ?? null;
                  const fase = row.fases[j] ?? "—";
                  if (v === 0 && !fase) return null;
                  return (
                    <div key={j} className="flex items-baseline gap-2 text-gray-700">
                      <span className="text-gray-500 w-12 tabular-nums">{j}</span>
                      <span className="text-gray-800 tabular-nums w-20 text-right">
                        {formatEurK(v)}
                      </span>
                      <span className="text-gray-500 tabular-nums w-10 text-right">
                        {cellPct}%
                      </span>
                      {curvePct !== null && (
                        <span className="text-gray-400 text-[10px] tabular-nums w-16">
                          (curve {curvePct}%)
                        </span>
                      )}
                      <span className="text-gray-600 flex-1 truncate">— {fase}</span>
                    </div>
                  );
                })}
              </div>
            </div>
          );
        })}
        <p className="text-[11px] text-gray-500 leading-relaxed">
          De cell-percentages in de tabel komen overeen met de gepubliceerde lifecycle-curve voor
          dat domein × aantal jaren. Cap-respect kan kleine afwijkingen veroorzaken (water-fill
          herverdeelt overschot proportioneel naar jaren met capaciteit). Bron-curves staan in{" "}
          <code className="text-[10px] bg-gray-100 px-1 rounded">scripts/rebalance-verdeling.ts</code>
          ; fase-namen in{" "}
          <code className="text-[10px] bg-gray-100 px-1 rounded">scripts/normalize-fases.ts</code>.
        </p>
      </div>
    </div>
  );
}

// --- Sectie D — som-controle --------------------------------------------------

function SectieD({
  checks,
  allOk,
}: {
  checks: { label: string; ok: boolean; uitleg: string }[];
  allOk: boolean;
}) {
  return (
    <div>
      <SectieKop nummer="D" titel="Som-controle" hint="Sluiten alle deelsommen aan op de scenario-totalen?" />
      <div
        className={`rounded-lg border-2 p-4 ${
          allOk ? "border-emerald-300 bg-emerald-50" : "border-red-300 bg-red-50"
        }`}
      >
        <div className="flex items-center gap-2 mb-3">
          {allOk ? (
            <>
              <span className="w-6 h-6 rounded-full bg-emerald-600 text-white flex items-center justify-center text-xs font-bold">
                ✓
              </span>
              <span className="font-semibold text-emerald-900">Alle berekeningen kloppen</span>
            </>
          ) : (
            <>
              <span className="w-6 h-6 rounded-full bg-red-600 text-white flex items-center justify-center text-xs font-bold">
                !
              </span>
              <span className="font-semibold text-red-900">Discrepantie gevonden — zie details</span>
            </>
          )}
        </div>
        <ul className="space-y-1.5">
          {checks.map((c, i) => (
            <li key={i} className="flex items-start gap-2 text-sm">
              <span className={c.ok ? "text-emerald-600" : "text-red-600"}>{c.ok ? "✓" : "✗"}</span>
              <div className="flex-1">
                <span className="font-medium text-gray-800">{c.label}</span>
                <p className="text-xs text-gray-600 mt-0.5">{c.uitleg}</p>
              </div>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}

// --- Kleine UI primitives -----------------------------------------------------

function SectieKop({ nummer, titel, hint }: { nummer: string; titel: string; hint?: string }) {
  return (
    <div className="mb-3">
      <div className="flex items-center gap-2">
        <span className="min-w-6 h-6 px-1.5 rounded-md bg-[#003366] text-white text-xs font-bold flex items-center justify-center">
          {nummer}
        </span>
        <h3 className="text-sm font-semibold text-[#003366]">{titel}</h3>
      </div>
      {hint && <p className="text-xs text-gray-500 mt-1 ml-8">{hint}</p>}
    </div>
  );
}

function Stat({
  label,
  value,
  sub,
  mono,
  highlight,
}: {
  label: string;
  value: string;
  sub?: string;
  mono?: boolean;
  highlight?: boolean;
}) {
  return (
    <div
      className={`rounded-lg border p-3 ${
        highlight ? "border-amber-300 bg-amber-50" : "border-gray-200 bg-gray-50"
      }`}
    >
      <p className="text-[10px] uppercase tracking-wider text-gray-500 font-semibold">{label}</p>
      <p className={`text-base font-bold text-gray-900 mt-0.5 ${mono ? "font-mono" : ""}`}>{value}</p>
      {sub && <p className="text-[11px] text-gray-500 mt-0.5">{sub}</p>}
    </div>
  );
}
