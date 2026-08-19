// ============================================================
// De analysefase 2026 — doelen en activiteiten per domein.
//
// BRON: STAPPENPLAN-SKETCH.html ("Van vastgestelde KPI's naar gerealiseerde
// baten"), deel 2 (De doelen van de analysefase) en deel 3 (Het plan — de
// analysefase per domein, op prioriteit). Letterlijk overgenomen; niets
// bijverzonnen.
//
// Dit is de planning van het programma: 2026 is de analysefase die de KPI's
// meetbaar maakt en de gap per domein vertaalt naar een pakket vervolg-
// inspanningen voor 2027. Gebruikt door het beknopte programmaplan (H6).
// ============================================================

import type { EffortDomain } from "./types";

export interface AnalysefaseDoel {
  /** Bijv. "Eind Q3 2026". */
  periode: string;
  /** Bijv. "meetbaar, gemeten & gericht". */
  kenmerk: string;
  doelen: string[];
  mijlpaal: string;
}

export interface AnalysefaseActiviteit {
  omschrijving: string;
  /** Bijv. "Q3", "Q3–Q4", "doorlopend", "2026". */
  wanneer: string;
}

export interface AnalysefaseDomein {
  domein: EffortDomain;
  prioriteit: number;
  /** Leeg wanneer nog niet benoemd. */
  inspanningsleider: string;
  /** True voor de domeinen waar 3sides een inhoudelijk trekker levert. */
  trekker3sides: boolean;
  activiteiten: AnalysefaseActiviteit[];
}

/** Waarom de prioriteit niet betekent dat lagere domeinen later starten. */
export const ANALYSEFASE_PRIORITEIT_NOOT =
  "Alle vier de domeinen lopen in 2026 tegelijk — een lagere prioriteit betekent niet “later” " +
  "of “niet doen”, maar bepaalt waar de meeste capaciteit en nadruk zit. Data & Systemen en " +
  "Processen starten naast elkaar: het funnelontwerp bepaalt immers wélke data nodig is. Mens en " +
  "Cultuur lopen mee en worden actief bewaakt.";

export const ANALYSEFASE_DOELEN: AnalysefaseDoel[] = [
  {
    periode: "Eind Q3 2026",
    kenmerk: "meetbaar, gemeten & gericht",
    doelen: [
      "Élke baten-KPI compleet ingevuld — per KPI vijf dingen op papier: wat meten we (definitie) · " +
        "waar komt het getal vandaan · hoe vaak · waar staan we nu (startwaarde) · waar willen we " +
        "heen en wanneer (doelwaarde mét datum).",
      "Inspanningsleider en inspanningsteam per domein vastgesteld, samen met de domeineigenaren.",
      "Feitelijk beeld per domein — wat er al is, wat werkt en wat ontbreekt, gemeten in de " +
        "nulmeting. Dat vervangt de gevoelsscore en maakt de gap naar de ambitie zichtbaar.",
      "Pilotgroep gestart in één sector.",
    ],
    mijlpaal: "adoptie-framework gereed en gedragen door het programmateam",
  },
  {
    periode: "Eind Q4 2026",
    kenmerk: "concreet & besluitklaar",
    doelen: [
      "Per onderdeel een concreet pakket vervolg-inspanningen voor 2027, elk onderbouwd met de " +
        "vraag: welke baat wordt hier beter van?",
      "Richting CRM bepaald (formele keuze ~april 2027).",
      "Eerste quick win zichtbaar gerealiseerd.",
    ],
    mijlpaal: "pilot draait, eerste gedragsdata beschikbaar",
  },
];

export const ANALYSEFASE_DOMEINEN: AnalysefaseDomein[] = [
  {
    domein: "data_systemen",
    prioriteit: 1,
    inspanningsleider: "Product Owner",
    trekker3sides: true,
    activiteiten: [
      { omschrijving: "Klantinformatie-landschap en huidig CRM in kaart (8 bronnen)", wanneer: "Q3" },
      {
        omschrijving: "Quick wins: contactgegevens centraliseren en koppeling Maileon ↔ CRM",
        wanneer: "doorlopend",
      },
      { omschrijving: "De klantreis als vertrekpunt — welke data hebben wij nodig", wanneer: "Q3–Q4" },
      { omschrijving: "Datakwaliteit-eisen vastleggen vanuit het funnelontwerp", wanneer: "Q3–Q4" },
      { omschrijving: "Klantreis → CRM-requirements (data en integratie)", wanneer: "Q4" },
      { omschrijving: "Platformopties → richting CRM bepaald", wanneer: "Q4" },
    ],
  },
  {
    domein: "processen",
    prioriteit: 2,
    inspanningsleider: "",
    trekker3sides: true,
    activiteiten: [
      {
        omschrijving: "Klantreizen → funnelprocessen, inclusief customer loops; start samen met Data & Systemen",
        wanneer: "Q3–Q4",
      },
      { omschrijving: "Eenduidig Customer Success-proces met proactieve contactmomenten", wanneer: "Q4" },
    ],
  },
  {
    domein: "mens",
    prioriteit: 3,
    inspanningsleider: "HR-manager",
    trekker3sides: false,
    activiteiten: [
      { omschrijving: "Curriculumontwerp vaardigheidstraining, samen met HR", wanneer: "2026" },
      { omschrijving: "Eerste intervisiegroepen live", wanneer: "Q4" },
    ],
  },
  {
    domein: "cultuur",
    prioriteit: 4,
    inspanningsleider: "HR-manager, gedragen door het MT",
    trekker3sides: false,
    activiteiten: [
      {
        omschrijving: "Aanpak leiderschapsontwikkeling ontwerpen → MT-besluit → eerste sessie gepland",
        wanneer: "2026",
      },
      { omschrijving: "Rituelen: klantverhalen delen · reflectiesessies · klantbezoeken", wanneer: "2026" },
      { omschrijving: "Ambassadeurs per sector geïdentificeerd en aangehaakt", wanneer: "Q4" },
    ],
  },
];
