// Plausibele berekening-redeneringen per sub-component voor Stap 8.
//
// Voor sub-componenten waar de bron-tekst (kostenraming/motivatie) zelf
// GEEN expliciete formule bevat — bv. "externe implementatie en
// dashboardbouw (€250K–€375K)" — kunnen we toch een redenering geven op
// basis van:
//   1. Cijfers die wél in de bron-tekst staan (85 medewerkers, 7-8
//      integraties, 1.500-2.500 consultanturen, PM-buffer 30%)
//   2. Marktconforme tarieven (senior CRM-consultant €150-170/u,
//      procesconsultant €800/dag, training €350-500/persoon)
//   3. Benchmarks (Gartner/Forrester voor mid-size CRM, Cito-benchmarks)
//
// Per inspanning + sub-component-substring een redenering-tekst die in
// de UI naast het bedrag wordt getoond als "Berekening" of "Redenering".
//
// Voor sessie d8b97442 (Cito-context, 4 hoofdinspanningen). Voor andere
// sessies: fallback naar geen redenering.

export interface ComponentRedenering {
  /** Substring (lowercase) gezocht in de inspanning-titel. */
  inspanningMatch: string;
  /** Substring (lowercase) gezocht in de component-naam (gerendered uit parser). */
  componentMatch: string;
  /** Berekening-tekst om naast het bedrag te tonen. */
  berekening: string;
  /** Tarief-onderbouwing (waar komt het tarief vandaan). */
  tariefBron?: string;
  /** Aantal-onderbouwing (waar komt het aantal vandaan). */
  aantalBron?: string;
}

export const COMPONENT_REDENERINGEN: ComponentRedenering[] = [
  // ─────────────────────────────────────────────────────────────────────
  // CRM (Integraal CRM-klantdashboard) — 85 gebruikers, 7-8 integraties,
  // 1.500-2.500 consultanturen, MS Dynamics-equivalent, PM-buffer 30%
  // ─────────────────────────────────────────────────────────────────────
  {
    inspanningMatch: "crm",
    componentMatch: "implementatie",
    berekening: "1.500–2.500 consultanturen × € 150–170/u (senior CRM-consultant NL) = € 225K–€ 425K → afgerond € 250K–€ 375K (incl. ~10% PM-buffer + realistisch plafond)",
    tariefBron: "Marktconforme tarieven Nederland 2025 voor senior CRM-consultants",
    aantalBron: "1.500-2.500 uur volgens Gartner/Forrester benchmark voor mid-size enterprise CRM (85 gebruikers + 7-8 integraties); aantal letterlijk uit motivatie-tekst",
  },
  {
    inspanningMatch: "crm",
    componentMatch: "datamigratie",
    berekening: "7–8 koppelingen × € 8K–€ 15K per integratie + € 15K–€ 20K datacleaning = € 71K–€ 140K → afgerond € 75K–€ 125K",
    tariefBron: "Per koppeling 80–150 ontwikkeluren × € 100–130/u; datacleaning afhankelijk van datakwaliteits-scan",
    aantalBron: "7-8 bronsysteem-integraties (uit kostenraming-tekst)",
  },
  {
    inspanningMatch: "crm",
    componentMatch: "training",
    berekening: "85 medewerkers × € 350–500 training-kost/persoon + € 10K–€ 15K externe schaduwbegeleiding = € 39K–€ 58K → afgerond € 40K–€ 55K",
    tariefBron: "1–2 dagen CRM-training per persoon door externe trainer: € 350–500 all-in",
    aantalBron: "85 te trainen medewerkers (uit kostenraming-tekst); schaduwbegeleiding 2 weken × € 1.000–1.500/dag",
  },
  {
    inspanningMatch: "crm",
    componentMatch: "licentielast",
    berekening: "6–12 transitiemaanden × € 5.000/maand parallelle licenties (oude omgeving + nieuwe MS Dynamics) = € 30K–€ 60K",
    tariefBron: "Oude omgeving ~€ 2.500/maand + nieuwe MS Dynamics-licentie ~€ 2.500/maand = € 5.000/maand parallel",
    aantalBron: "Standaard transitieperiode 6–12 maanden om continuïteit te waarborgen",
  },
  {
    inspanningMatch: "crm",
    componentMatch: "licenties",
    berekening: "85 gebruikers × € 660–780/jaar (€ 55–65/maand × 12) = € 56K–€ 66K → ~€ 50K–€ 75K incl. premium-modules",
    tariefBron: "MS Dynamics 365 Customer Engagement Pro: € 55–65/maand per gebruiker",
    aantalBron: "85 gebruikers (uit kostenraming-tekst, 3 sectoren samen)",
  },
  {
    inspanningMatch: "crm",
    componentMatch: "beheer",
    berekening: "0,3 FTE interne CRM-beheerder × € 100K loaded cost = € 30K/jaar (2nd-line support, kleine functionele aanpassingen, datakwaliteit)",
    tariefBron: "Interne FTE-loaded cost Cito ~€ 100K/jaar",
    aantalBron: "0,3 FTE inschatting voor 85-gebruikers MS Dynamics-omgeving (industry benchmark)",
  },
  // ─────────────────────────────────────────────────────────────────────
  // UNIFORME klantbenadering — 3 sectoren, externe procesbegeleider 20
  // dagen, 9 multidisciplinaire werksessies (3 × 3 sectoren)
  // ─────────────────────────────────────────────────────────────────────
  {
    inspanningMatch: "uniforme",
    componentMatch: "procesbegeleiding",
    berekening: "20 dagen externe procesbegeleider × € 800/dag (Cito-benchmark) = € 16K basis + 11–30 extra dagen voor uitrol over 3 sectoren = € 25K–€ 40K",
    tariefBron: "Senior procesconsultant Nederland: € 750–850/dag (medior–senior)",
    aantalBron: "~20 dagen voor procesontwerp + werksessies + extra uitrol-coördinatie 3 sectoren",
  },
  {
    inspanningMatch: "uniforme",
    componentMatch: "sessiebegeleiding",
    berekening: "9 multidisciplinaire werksessies (3 sessies × 3 sectoren PO/VO/Zakelijk) × € 1.700–€ 2.800/sessie incl. voorbereiding + facilitering + materialen = € 15K–€ 25K",
    tariefBron: "Per werksessie: 0,5 dag voorbereiding + 1 dag facilitering + materialen ≈ € 2.000",
    aantalBron: "9 sessies = 3 sessies × 3 sectoren, zoals belegd in sectorraad-cyclus",
  },
  {
    inspanningMatch: "uniforme",
    componentMatch: "materialen",
    berekening: "BiSL/Lean methodiek-licenties € 2,5K–€ 5K + Cito-specifieke content-aanpassing 4–7 dagen × € 700/dag = € 5K–€ 10K",
    tariefBron: "Methodiek-licenties (BiSL/Lean) en commerciële templates: € 2,5K–5K per traject",
    aantalBron: "Cito-specifieke aanpassingen casuïstiek + werkvormen: 4-7 dagen contentwerk",
  },
  // ─────────────────────────────────────────────────────────────────────
  // GESPREKSVAARDIGHEIDSTRAINING — 80 deelnemers (uit Stap 7), 2 blokken,
  // 12 interne train-de-trainer-deelnemers, schaalvoordeel 30%
  // ─────────────────────────────────────────────────────────────────────
  {
    inspanningMatch: "gesprek",
    componentMatch: "lms-licentie",
    berekening: "LMS-platform 5+ jaar vooruitbetaald × ~€ 6K/jaar = € 30K (eenmalig) — voor 80 deelnemers + onbeperkte content",
    tariefBron: "LMS SaaS-platform met outside-in content-functionaliteiten: € 5K–€ 7K per jaar",
    aantalBron: "5+ jaar looptijd voor verankering van curriculum",
  },
  {
    inspanningMatch: "gesprek",
    componentMatch: "content-ontwikkeling",
    berekening: "Curriculum-ontwerp + Cito-specifieke casuïstiek + materialen 25–30 dagen × ~€ 850/dag = € 21K–€ 25K (gedeeltelijk extern)",
    tariefBron: "Curriculum-ontwerper: € 750–1.000/dag (afhankelijk van seniority + Cito-context)",
    aantalBron: "Leerlijn-ontwerp + casuïstiek per sector (PO/VO/Zakelijk/Professionals): 25-30 ontwikkeldagen",
  },
  {
    inspanningMatch: "gesprek",
    componentMatch: "train-de-trainer",
    berekening: "12 interne trainer/adviseurs × ~€ 833 per persoon = € 10K (compacte ToT-cursus 2 dagen)",
    tariefBron: "Train-the-trainer cursus 2 dagen all-in inclusief materialen",
    aantalBron: "12 trainer/adviseurs (uit motivatie-tekst) — voldoende voor 80 deelnemers in 2 blokken",
  },
  {
    inspanningMatch: "gesprek",
    componentMatch: "nulmeting",
    berekening: "80 deelnemers × ~€ 100 digitaal vaardigheidsassessment + 4 sectoren intake-sessies × € 500 = € 10K",
    tariefBron: "Vaardigheids-assessment-tool € 70–€ 130 per deelnemer; intake-sessie € 500",
    aantalBron: "80 deelnemers (Stap 7 selectiePerDomein) × digitaal assessment + 4 sector-intakes",
  },
  {
    inspanningMatch: "gesprek",
    componentMatch: "kerntraject",
    berekening: "2 trainingsblokken × € 31,5K (10 dagen × € 2.500 per blok + materialen) + sessieondersteuning, locatie, materialen € 17K = € 80K voor 80 deelnemers",
    tariefBron: "Externe trainingspartner gespecialiseerd outside-in: € 2.500/dag × 10 dagen per blok",
    aantalBron: "2 blokken (basistraining + vaardigheidsverdieping); 80 deelnemers in groepen van ~10",
  },
  // ─────────────────────────────────────────────────────────────────────
  // LEIDERSCHAP — 9 leidinggevenden + 2 HR coördinerend, executive-tarief
  // ─────────────────────────────────────────────────────────────────────
  // Voor leiderschap heeft de motivatie al expliciete formules:
  // "15 dagen × €2.500 (€37.500)", "9 lg × €4.000 (€36.000)" — die worden
  // door extractFormule uit motivatie-parser zelf opgehaald. Hier alleen
  // aanvullingen voor componenten zonder formule in tekst.
  {
    inspanningMatch: "leiderschap",
    componentMatch: "executive-tarief",
    berekening: "Reservering voor uitloop: coaches kunnen oplopen tot € 4.000/dag (executive-niveau) — buffer ~5 dagen × € 4.000 = € 20K",
    tariefBron: "Executive-coach Nederland: € 2.500–4.000/dag",
    aantalBron: "Reservering voor onverwachte verdieping of extra MT-sessies",
  },
  {
    inspanningMatch: "leiderschap",
    componentMatch: "hr-instrumentarium",
    berekening: "360°-feedback tool config € 6K–€ 10K + criteria-ontwerp door HR-adviseur 5–10 dagen × € 850/dag = € 10K–€ 18K → € 15K voor MT-laag",
    tariefBron: "360°-tool eenmalige config; HR-adviseur dagprijs € 800–900",
    aantalBron: "Aanpassing beoordelingsformulieren (3-5 outside-in-criteria) + tool-config",
  },
];

/** Vind de redenering voor een sub-component, gegeven inspanning-titel. */
export function vindRedenering(
  inspanningTitel: string,
  componentNaam: string,
): ComponentRedenering | null {
  const insp = inspanningTitel.toLowerCase();
  const comp = componentNaam.toLowerCase();
  for (const r of COMPONENT_REDENERINGEN) {
    if (insp.includes(r.inspanningMatch) && comp.includes(r.componentMatch)) {
      return r;
    }
  }
  return null;
}
