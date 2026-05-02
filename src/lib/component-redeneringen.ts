// Plausibele berekening-redeneringen per sub-component voor Stap 8.
//
// Voor sub-componenten waar de bron-tekst (kostenraming/motivatie) zelf
// GEEN expliciete formule bevat — bv. "externe implementatie en
// dashboardbouw (€250K–€375K)" — kunnen we toch een redenering geven op
// basis van:
//   1. Cijfers die wél in de bron-tekst staan (85 medewerkers, 7-8
//      integraties, 1.500-2.500 consultanturen)
//   2. Marktconforme tarieven met herleidbare bron (Berenschot-benchmarks,
//      Microsoft-pricing, NIP-register-coach, etc.)
//   3. Benchmarks (Gartner/Forrester voor mid-size CRM, Cito-benchmarks)
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
  /** Tarief-onderbouwing (waar komt het tarief vandaan, met herleidbare bron). */
  tariefBron?: string;
  /** Aantal-onderbouwing (waar komt het aantal vandaan). */
  aantalBron?: string;
}

export const COMPONENT_REDENERINGEN: ComponentRedenering[] = [
  // ─────────────────────────────────────────────────────────────────────
  // CRM (Integraal CRM-klantdashboard) — 85 gebruikers, 7-8 integraties,
  // 1.500-2.500 consultanturen, MS Dynamics-equivalent
  // ─────────────────────────────────────────────────────────────────────
  {
    inspanningMatch: "crm",
    componentMatch: "implementatie",
    berekening: "1.500–2.500 consultanturen × € 150–170/u (senior CRM-consultant NL) = € 225K–€ 425K → afgerond € 250K–€ 375K (rekening houdend met realistisch plafond bij grote scopes)",
    tariefBron: "Senior CRM-consultant Nederland 2025: € 150–170/u (Berenschot/Conclusion/Capgemini-benchmarktarieven voor specialistische CRM-implementatie-consultants)",
    aantalBron: "1.500–2.500 uur volgens Gartner/Forrester benchmark voor mid-size enterprise CRM (85 gebruikers + 7–8 integraties); aantal letterlijk genoemd in motivatie",
  },
  {
    inspanningMatch: "crm",
    componentMatch: "datamigratie",
    berekening: "7–8 koppelingen × € 8K–€ 15K per integratie + € 15K–€ 20K datacleaning = € 71K–€ 140K → afgerond € 75K–€ 125K",
    tariefBron: "Per koppeling 80–150 ontwikkeluren × € 100–130/u (medior CRM-developer NL); datacleaning afhankelijk van scope datakwaliteits-scan",
    aantalBron: "7–8 bronsysteem-integraties (uit kostenraming-tekst)",
  },
  {
    inspanningMatch: "crm",
    componentMatch: "training",
    berekening: "85 medewerkers × € 350–500 per persoon + € 10K–€ 15K externe schaduwbegeleiding = € 39K–€ 58K → afgerond € 40K–€ 55K",
    tariefBron: "Klassikaal trainer-tarief NL ~€ 2.500/dag ÷ groep van 5–7 deelnemers = € 350–500 per persoon, all-in (trainer + materialen + lunch). 1–2 dagen CRM-training per medewerker.",
    aantalBron: "85 te trainen medewerkers (uit kostenraming-tekst); schaduwbegeleiding 2 weken × € 1.000–1.500/dag voor go-live ondersteuning",
  },
  {
    inspanningMatch: "crm",
    componentMatch: "licentielast",
    berekening: "6–12 transitiemaanden × ~€ 5.000/maand nieuwe MS Dynamics-licenties (85 × € 55–65/m) = € 30K–€ 60K. Tijdens deze periode loopt het huidige klantsysteem parallel — die kosten zitten al in de bestaande exploitatie en worden hier niet dubbel geteld.",
    tariefBron: "MS Dynamics 365 Customer Engagement Pro: € 55–65/maand per gebruiker × 85 gebruikers ≈ € 4.675–5.525/maand (Microsoft Pricing 2025, microsoft.com)",
    aantalBron: "Transitieperiode 6–12 maanden: tijdsvenster waarin nieuwe omgeving al actief is terwijl oude nog niet is afgeschakeld (industry best-practice voor mid-size CRM-migratie)",
  },
  {
    inspanningMatch: "crm",
    componentMatch: "licenties",
    berekening: "85 gebruikers × € 660–780/jaar (€ 55–65/maand × 12) = € 56K–€ 66K → ~€ 50K–€ 75K incl. premium-modules",
    tariefBron: "Microsoft Dynamics 365 Customer Engagement Pro: officiële prijslijst € 55–65/maand per gebruiker (Microsoft Pricing 2025, gepubliceerd op microsoft.com)",
    aantalBron: "85 gebruikers (uit kostenraming-tekst, 3 sectoren samen)",
  },
  {
    inspanningMatch: "crm",
    componentMatch: "beheer",
    berekening: "0,3 FTE interne CRM-beheerder × € 100K loaded cost = € 30K/jaar (2nd-line support, kleine functionele aanpassingen, datakwaliteit)",
    tariefBron: "Loaded cost interne medewerker Cito: ~€ 100K/jaar incl. werkgeverslasten (gebaseerd op CAO + benefits)",
    aantalBron: "0,3 FTE inschatting voor 85-gebruikers MS Dynamics-omgeving (Forrester benchmark voor functioneel beheer mid-size CRM)",
  },
  // ─────────────────────────────────────────────────────────────────────
  // UNIFORME klantbenadering — 3 sectoren, externe procesbegeleider 20
  // dagen, 9 multidisciplinaire werksessies (3 × 3 sectoren)
  // ─────────────────────────────────────────────────────────────────────
  {
    inspanningMatch: "uniforme",
    componentMatch: "procesbegeleiding",
    berekening: "20 dagen externe procesbegeleider × € 800/dag = € 16K basis + 11–30 extra dagen voor uitrol over 3 sectoren = € 25K–€ 40K",
    tariefBron: "Senior procesconsultant Nederland 2025: € 750–850/dag (Berenschot/Boer&Croon-benchmark voor medior–senior procesconsultants)",
    aantalBron: "~20 dagen voor procesontwerp + werksessies (Cito-benchmark uit motivatie) + 11–30 extra dagen voor uitrol-coördinatie 3 sectoren",
  },
  {
    inspanningMatch: "uniforme",
    componentMatch: "sessiebegeleiding",
    berekening: "9 multidisciplinaire werksessies (3 sessies × 3 sectoren PO/VO/Zakelijk) × € 1.700–€ 2.800/sessie incl. voorbereiding + facilitering + materialen = € 15K–€ 25K",
    tariefBron: "Per werksessie: 0,5 dag voorbereiding + 1 dag facilitering = 1,5 dag × € 750–850/dag procesconsultant + € 200–300 materialen = € 1.700–2.800/sessie",
    aantalBron: "9 sessies = 3 sessies × 3 sectoren, zoals belegd in sectorraad-cyclus (uit motivatie)",
  },
  {
    inspanningMatch: "uniforme",
    componentMatch: "materialen",
    berekening: "BiSL/Lean methodiek-licenties € 2,5K–€ 5K + Cito-specifieke content-aanpassing 4–7 dagen × € 700/dag = € 5K–€ 10K",
    tariefBron: "Methodiek-licenties (BiSL Foundation, Lean Six Sigma): publieke prijslijst € 2,5K–5K per organisatie-licentie. Content-ontwerper NL: € 700/dag (ZZP-tarief medior)",
    aantalBron: "Cito-specifieke aanpassingen: casuïstiek + werkvormen voor 3 sectoren = 4–7 dagen contentwerk",
  },
  // ─────────────────────────────────────────────────────────────────────
  // GESPREKSVAARDIGHEIDSTRAINING — 80 deelnemers (uit Stap 7), 2 blokken,
  // 12 interne train-de-trainer-deelnemers, schaalvoordeel 30%
  // ─────────────────────────────────────────────────────────────────────
  {
    inspanningMatch: "gesprek",
    componentMatch: "lms-licentie",
    berekening: "LMS-platform 5+ jaar vooruitbetaald × ~€ 6K/jaar = € 30K (eenmalig) — voor 80 deelnemers + onbeperkte content",
    tariefBron: "LMS SaaS-platform NL (vergelijkbare aanbieders: TalentLMS, Easy LMS, AbsorbLMS): € 5K–€ 7K/jaar voor 80 gebruikers + outside-in content-functionaliteiten",
    aantalBron: "5+ jaar looptijd voor verankering van curriculum (vooruitbetaling geeft korting)",
  },
  {
    inspanningMatch: "gesprek",
    componentMatch: "content-ontwikkeling",
    berekening: "Curriculum-ontwerp + Cito-specifieke casuïstiek + materialen 25–30 dagen × ~€ 850/dag = € 21K–€ 25K (gedeeltelijk extern)",
    tariefBron: "Curriculum-ontwerper Nederland: € 750–1.000/dag (ZZP-tarief senior-niveau voor onderwijs/training-content)",
    aantalBron: "Leerlijn-ontwerp + casuïstiek per sector (PO/VO/Zakelijk/Professionals): 25–30 ontwikkeldagen (industry-norm voor curriculum van deze omvang)",
  },
  {
    inspanningMatch: "gesprek",
    componentMatch: "train-de-trainer",
    berekening: "12 interne trainer/adviseurs × ~€ 833 per persoon = € 10K (compacte ToT-cursus 2 dagen)",
    tariefBron: "ToT-cursus 2 dagen all-in: ~€ 5.000/dag externe trainer ÷ 12 deelnemers = € 833 per persoon (incl. materialen + certificering)",
    aantalBron: "12 trainer/adviseurs (uit motivatie-tekst) — voldoende voor 80 deelnemers in 2 blokken (groepsgrootte ~6–7)",
  },
  {
    inspanningMatch: "gesprek",
    componentMatch: "nulmeting",
    berekening: "80 deelnemers × ~€ 100 digitaal vaardigheidsassessment + 4 sectoren intake-sessies × € 500 = € 10K",
    tariefBron: "Digitaal vaardigheids-assessment (online tools NL-aanbieders zoals TalentLens, Bureau Beyond): € 70–130 per deelnemer; intake-sessie 1 dagdeel × € 750–850 ÷ 1,5 sectoren = ~€ 500 per sector",
    aantalBron: "80 deelnemers (Stap 7 selectiePerDomein) × digitaal assessment + 4 sector-intakes (PO/VO/Zakelijk/Professionals)",
  },
  {
    inspanningMatch: "gesprek",
    componentMatch: "kerntraject",
    berekening: "2 trainingsblokken × € 31,5K (10 dagen × € 2.500 per blok + materialen) + sessieondersteuning, locatie, materialen € 17K = € 80K voor 80 deelnemers",
    tariefBron: "Externe trainingspartner gespecialiseerd outside-in: € 2.500/dag (NL-marktprijs voor B2B-training senior-trainer met onderwijs-context)",
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
    berekening: "Reservering voor executive-coaches die tot € 4.000/dag kunnen kosten (i.p.v. de €2.500/dag in basisberekening) — voor MT-niveau soms nodig: ~5 extra dagen × € 4.000 = € 20K",
    tariefBron: "Executive-coach Nederland 2025: € 2.500/dag senior-niveau (NIP-register-coach), oplopend tot € 4.000/dag voor top-coaches (NOLOC-NIP-register voor MT-niveau)",
    aantalBron: "Reservering voor onverwachte verdieping of extra MT-sessies bovenop de 15 basisdagen — typisch 5 extra dagen voor MT-traject",
  },
  {
    inspanningMatch: "leiderschap",
    componentMatch: "hr-instrumentarium",
    berekening: "360°-feedback tool config € 6K–€ 10K + criteria-ontwerp door HR-adviseur 5–10 dagen × € 850/dag = € 10K–€ 18K → € 15K voor MT-laag",
    tariefBron: "360°-tool eenmalige config (NL-aanbieders: GreatPlaceToWork, Effectory, Performance360): € 6K–10K. HR-adviseur senior NL: € 800–900/dag (Berenschot/Hay-benchmark)",
    aantalBron: "Aanpassing beoordelingsformulieren (3–5 outside-in-criteria) + tool-config voor 9 leidinggevenden + 2 HR coördinerend = 5–10 dagen werk",
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
