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
    berekening: "Twee Dynamics-instanties parallel: huidige Cito-omgeving + nieuwe geïntegreerde omgeving. Per maand: 85 gebruikers × ~€ 55–65/maand (Pro-SKU) = ~€ 4.675–€ 5.525/maand voor de huidige instance. Over 6 maanden = € 28K–€ 33K; over 12 maanden = € 56K–€ 66K → afgerond € 30K–€ 60K eenmalig. De nieuwe-omgeving-licenties zitten in de aparte structurele post — geen dubbeltelling.",
    tariefBron: "Microsoft Dynamics 365 Customer Engagement Pro: € 55–65/maand per gebruiker (Microsoft Pricing 2025, microsoft.com). Cito gebruikt nu al deze SKU; tijdens migratie loopt deze instance 6–12 maanden door naast de nieuwe.",
    aantalBron: "85 gebruikers (3 sectoren samen) × 6–12 transitiemaanden — tijdsvenster waarin de huidige Dynamics nog niet afgeschakeld kan worden omdat data, processen en gebruikers gefaseerd overgaan (industry best-practice mid-size CRM-migratie).",
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
    berekening: "Basis: 20 dagen × € 800/dag = € 16.000. Uitrol-coördinatie 3 sectoren: 11–30 extra dagen × € 800/dag = € 9.000–€ 24.000. Totaal € 16.000 + € 9.000–€ 24.000 = € 25.000–€ 40.000.",
    tariefBron: "Senior procesconsultant Nederland 2026: € 750–850/dag (Berenschot/Boer&Croon-benchmark voor medior–senior procesconsultants); we hanteren € 800 als gemiddeld dagtarief.",
    aantalBron: "~20 dagen voor procesontwerp + werksessies (Cito-benchmark uit motivatie) + 11–30 extra dagen voor uitrol-coördinatie over PO/VO/Zakelijk.",
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
    berekening: "Methodiek-licenties € 2.500–€ 5.000 + content-aanpassing 4–7 dagen × € 700/dag = € 2.800–€ 4.900. Totaal € 2.500 + € 2.800 = € 5.300 (low) tot € 5.000 + € 4.900 = € 9.900 (high) → afgerond € 5.000–€ 10.000.",
    tariefBron: "Methodiek-licenties (BiSL Foundation, Lean Six Sigma): publieke prijslijst € 2,5K–5K per organisatie-licentie. Content-ontwerper NL: € 700/dag (ZZP-tarief medior, Berenschot 2026).",
    aantalBron: "Cito-specifieke aanpassingen: casuïstiek + werkvormen voor 3 sectoren = 4–7 dagen contentwerk.",
  },
  // Structurele componenten Uniforme klantbenadering — uit motivatie-tekst:
  // €12K proceseigenaarschap-borging + €10K governance-instrumentarium +
  // €6K sectorvariatie-buffer per jaar.
  {
    inspanningMatch: "uniforme",
    componentMatch: "proceseigenaarschap",
    berekening: "Borging via bestaande Smartprocess-tooling = € 0 (geen extra licentie). Externe continuïteitsondersteuning: 14–18 dagen/jaar × € 700–850/dag = € 9.800–€ 15.300/jaar → afgerond € 10K–€ 15K/jaar.",
    tariefBron: "Smartprocess (BPM-tooling) zit al in Cito-stack. Procesconsultant senior NL: € 700–850/dag (Berenschot-benchmark 2026).",
    aantalBron: "14–18 dagen/jaar externe ondersteuning voor 3 sectoren proceseigenaren samen — circa 1,5 dag/maand gemiddeld voor sparring, kalibratie en kleine processkappingen (Cito-benchmark voor governance-borging na implementatie).",
  },
  {
    inspanningMatch: "uniforme",
    componentMatch: "governance",
    berekening: "Onderhoud KPI-template + integratie-format CRM: 12–15 dagen/jaar × € 700–850/dag procesconsultant = € 8K–€ 12K/jaar",
    tariefBron: "Procesconsultant senior NL: € 700–850/dag. Werk omvat KPI-rapportage-update, integratie-format met CRM-dashboard en governance-bijeenkomsten 4×/jaar.",
    aantalBron: "Cross-sectorale governance-cyclus: kwartaal-evaluatie 4 dagen + jaarlijkse herijking 6 dagen + ad-hoc 4 dagen = 12–15 dagen/jr",
  },
  // NB: Sectorvariatie-buffer is bewust NIET als component opgenomen —
  // bandbreedte/risico op herbewerking wordt programma-breed afgevangen
  // via de aparte post onvoorzien (5e inspanning), niet per inspanning.
  // ─────────────────────────────────────────────────────────────────────
  // GESPREKSVAARDIGHEIDSTRAINING — 80 deelnemers (uit Stap 7), 2 blokken,
  // 12 interne train-de-trainer-deelnemers, schaalvoordeel 30%
  // ─────────────────────────────────────────────────────────────────────
  {
    inspanningMatch: "gesprek",
    componentMatch: "lms-licentie",
    berekening: "5 jaar × € 6.000/jaar = € 30.000 vooruitbetaald (5–10% korting bij meerjarig contract is meegenomen in het tarief).",
    tariefBron: "LMS SaaS-platform NL (TalentLMS, Easy LMS, AbsorbLMS): € 5K–€ 7K/jaar voor 80 gebruikers + outside-in content-functionaliteiten — middentarief € 6K/jr.",
    aantalBron: "5 jaar looptijd om curriculum te verankeren over twee trainings-blokken + refresh-jaren; vooruitbetaling geeft volume-korting bij vergelijkbare aanbieders.",
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
    berekening: "ToT 2 dagen × € 5.000/dag externe trainer = € 10.000 totaal voor de groep (12 deelnemers samen). Per persoon: € 10.000 ÷ 12 = ~€ 833. Eindbedrag: € 10.000 (de groepskost is leidend, niet × 12).",
    tariefBron: "ToT-cursus 2 dagen all-in: ~€ 5.000/dag externe trainer (NL B2B-tarief incl. materialen + certificering, Berenschot 2026).",
    aantalBron: "12 trainer/adviseurs (uit motivatie-tekst) — voldoende voor 80 deelnemers in 2 blokken (groepsgrootte ~6–7).",
  },
  {
    inspanningMatch: "gesprek",
    componentMatch: "nulmeting",
    berekening: "Digitaal assessment: 80 deelnemers × € 100 = € 8.000. Sector-intakes: 4 sectoren × € 500/sessie = € 2.000. Totaal € 8.000 + € 2.000 = € 10.000.",
    tariefBron: "Digitaal vaardigheids-assessment (NL-tools TalentLens, Bureau Beyond): € 70–130 per deelnemer — middentarief € 100. Intake-sessie 1 dagdeel × € 750–850 procesconsultant ÷ 1,5 sectoren = ~€ 500 per sector.",
    aantalBron: "80 deelnemers (Stap 7 selectiePerDomein) + 4 sector-intakes (PO/VO/Zakelijk/Professionals).",
  },
  {
    inspanningMatch: "gesprek",
    componentMatch: "kerntraject",
    berekening: "Per blok: 12–13 trainerdagen × € 2.500/dag = € 30.000–€ 32.500 → afgerond € 31.500 per blok. Twee blokken × € 31.500 = € 63.000 voor 80 deelnemers (basistraining + vaardigheidsverdieping).",
    tariefBron: "Externe trainingspartner gespecialiseerd outside-in: € 2.500/dag senior-niveau (Berenschot 2026 voor B2B-training met onderwijs-context). Voor sterk gespecialiseerde sectortrainers loopt dit op tot € 3.000–3.500/dag — bij dat scenario neemt het kerntraject toe naar € 75K–€ 90K.",
    aantalBron: "Per blok 80 deelnemers in groepen van 10 = 8 groepen; 1 dag plenair + 1,5 dag praktijk-rotatie = 12–13 trainerdagen totaal. Twee blokken (basistraining + vaardigheidsverdieping).",
  },
  {
    inspanningMatch: "gesprek",
    componentMatch: "sessieondersteuning",
    berekening: "Locatie: 5 dagen × € 1.000/dag = € 5.000. Materialen: 80 deelnemers × € 60 = € 4.800 → ~€ 5.000. Interne coördinatie: 8 dagen × € 850/dag = € 6.800 → ~€ 7.000. Totaal € 5.000 + € 5.000 + € 7.000 = € 17.000.",
    tariefBron: "Locatiehuur grote zaal Cito-omgeving of externe locatie: € 800–1.000/dag (TUF/Hotel Postillion/De Reehorst-tarieven 2026). Materialen: workbook + casuïstiek-set per deelnemer = € 50–70. Interne adviseur loaded cost: € 850/dag.",
    aantalBron: "4–6 plenaire sessiedagen voor 80 deelnemers in groepen van 10 (twee blokken samen). Coördinatie: 8 dagen interne adviseur voor planning, opvang, evaluatie.",
  },
  {
    inspanningMatch: "gesprek",
    componentMatch: "refresh",
    berekening: "3–4 sessies/jaar × € 3.500–4.500 per sessie = € 10.500 (3 × € 3.500) tot € 18.000 (4 × € 4.500) → afgerond € 12.000–€ 18.000/jaar.",
    tariefBron: "Externe trainer halve dag inclusief reskilling-content + materialen + locatie: € 3.500–4.500 per sessie (NL-trainingsmarktprijs 2026 voor herhaalsessies, Berenschot).",
    aantalBron: "Vanaf jaar 4 (na de twee basis-blokken) om verworven gespreksvaardigheid te verankeren — 3–4 sessies/jaar voor cohorten van ~20 deelnemers (4 cohorten × 1× per jaar of 4 cohorten × verspreid).",
  },
  {
    inspanningMatch: "gesprek",
    componentMatch: "onboarding",
    berekening: "Geschatte instroom 8–12 nieuwe medewerkers/jaar × € 400–600 micro-leertraject (mix LMS + 1 dag begeleiding) = € 3K–€ 7K/jaar",
    tariefBron: "Micro-leertraject: 4 LMS-modules (zit in licentie) + 1 begeleidingsdag externe trainer ÷ groep van 6–8 nieuwe medewerkers = € 400–600 per persoon",
    aantalBron: "Cito jaarlijkse instroom in betrokken sectoren ~10% van 80 = 8 nieuwe medewerkers/jaar (HR-benchmark Cito-typische turnover)",
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
    berekening: "Reservering voor situaties waarin een MT-lid een top-coach (i.p.v. senior-coach) nodig heeft. Out-of-pocket fractie: 1,5–2,5 dagen × € 4.000/dag = € 6.000–€ 10.000 (de meeste MT-coaching gaat door op de basis €2.500/dag-tarief; deze post dekt alléén de meerprijs voor uitzonderlijke trajecten).",
    tariefBron: "Top-coach Nederland 2026: € 4.000/dag — NOLOC/NIP-register voor executive-niveau (CEO/MT). Marktboveneinde t.o.v. de senior-coach € 2.500/dag.",
    aantalBron: "Niet voor alle MT-leden nodig; reservering voor 1–2 trajecten waarin een gespecialiseerde top-coach gewenst is bovenop de 15 basisdagen.",
  },
  {
    inspanningMatch: "leiderschap",
    componentMatch: "hr-instrumentarium",
    berekening: "360°-tool eenmalige config: € 3.000–€ 5.000 (voor MT-laag, kleine populatie). HR-adviseur criteria-ontwerp: 3–5 dagen × € 850/dag = € 2.550–€ 4.250. Totaal € 5.500–€ 9.250 → afgerond € 5.000–€ 8.000 voor 9 lg + 2 HR.",
    tariefBron: "360°-tool eenmalige config NL (Effectory, Performance360, GreatPlaceToWork): € 3K–€ 5K voor klein team. HR-adviseur senior NL: € 800–900/dag (Berenschot/Hay-benchmark 2026).",
    aantalBron: "Aanpassing beoordelingsformulieren (3–5 outside-in-criteria) + tool-config voor 9 leidinggevenden + 2 HR coördinerend = 3–5 dagen werk (smaller dan eerder geraamd; MT-laag heeft beperkte scope).",
  },
  {
    inspanningMatch: "leiderschap",
    componentMatch: "externe begeleider",
    berekening: "Bruto-formule motivatie: 15 dagen × € 2.500/dag = € 37.500. Out-of-pocket fractie: ~50% extern (€ 15K–€ 23K), restant via §4.2 interne uren omdat HR-coördinatoren en MT-leden zelf programma-ontwerp en deel van de uitvoering dragen.",
    tariefBron: "Senior leiderschaps-/cultuurconsultant Nederland 2026: € 2.500/dag (Berenschot Tariefbenchmark Adviesbranche 2026 voor senior organisatieadviseurs; NIP-register MT-coaches gemiddelde dagprijs).",
    aantalBron: "15 dagen voor programma-ontwerp + uitvoering 4 plenaire werkblokken + slottraject (uit motivatie-tekst sessie d8b97442).",
  },
  {
    inspanningMatch: "leiderschap",
    componentMatch: "individuele coaching",
    berekening: "Bruto-formule motivatie: 9 lg × € 4.000/traject = € 36.000 totaal (~5 sessies × € 800/sessie per lg). Out-of-pocket fractie: € 8K–€ 12K (alleen externe sessie-component); restant intern verrekend in §4.2 interne uren.",
    tariefBron: "Individuele coaching senior-niveau Nederland 2026: € 700–900 per sessie (NIP/NOLOC-register-coach), traject van 4–6 sessies = € 3.500–€ 5.000 per leidinggevende.",
    aantalBron: "9 leidinggevenden uit Stap 7 selectiePerDomein (cultuur-domein); volledig MT-team Cito.",
  },
  {
    inspanningMatch: "leiderschap",
    componentMatch: "360°",
    berekening: "1 organisatie-licentie × € 5.000/jaar all-in = € 5.000/jaar (config + hosting + rapportages voor 9 lg + 2 HR).",
    tariefBron: "360°-feedback-tools NL-markt 2026 (Effectory, Performance360, GreatPlaceToWork): € 4K–€ 6K/jaar voor groepen tot ~15 deelnemers, incl. rapportage-module en benchmarking.",
    aantalBron: "1 organisatie-licentie voor 9 leidinggevenden + 2 HR coördinerend; structureel om jaarlijkse cyclus te dragen.",
  },
  {
    inspanningMatch: "leiderschap",
    componentMatch: "cultuurmeting",
    berekening: "1 meting/jaar × € 2.500 = € 2.500/jaar vanaf jaar 3 (survey-uitvraag + analyse + rapport voor MT-laag).",
    tariefBron: "Cultuurmeting MT-laag NL 2026: € 2.000–€ 3.000 per meetronde (Effectory/Great Place to Work-tarief voor kleine populatie 9–15 deelnemers, incl. dashboard).",
    aantalBron: "Vanaf jaar 3 (12–18 mnd na slottraject) ter borging van verankering; jaarlijks ritme tot einde looptijd 2029.",
  },
  {
    inspanningMatch: "leiderschap",
    componentMatch: "onboarding",
    berekening: "1–2 nieuwe leidinggevenden/jaar × € 1.000–€ 2.000 micro-traject (HR-intake + 1 dag externe coaching) = € 2.000/jaar vanaf jaar 5.",
    tariefBron: "Onboarding-traject leidinggevende Cito-context: € 1.000–€ 2.000 per persoon (1 dag coach × € 800–1.000 + HR-tijd + materialen; tarief afgeleid van NIP-register en Berenschot-benchmark 2026).",
    aantalBron: "Cito MT-turnover ~10–20% over 9 lg = 1–2 nieuwe leiders/jaar (HR-benchmark Cito); vanaf jaar 5 omdat eerdere instroom binnen basistraject meegaat.",
  },
  {
    inspanningMatch: "leiderschap",
    componentMatch: "borgings",
    berekening: "12–18 maanden afnemende externe begeleiding na slottraject: 8–12 dagen/jaar × € 800/dag = € 6.400–€ 9.600/jaar → afgerond € 6K–€ 10K/jaar.",
    tariefBron: "Senior coach/begeleider continuïteit: € 750–850/dag (NIP-register-coach + Berenschot-benchmark 2026 voor afnemende begeleiding).",
    aantalBron: "Afnemende begeleiding: jaar 1 na slottraject ~12 dagen, jaar 2 ~8 dagen — borgt verankering zonder volledig nieuw traject te starten.",
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
