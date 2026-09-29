// Stap 10 — Organigram (korte versie): standaardinhoud van het voorstel.
// Alles hierin is in de app per kop en per naam handmatig aanpasbaar; de
// aanpassingen worden in de sessie opgeslagen (session.organigram) en hier
// overheen gelegd met mergeOrganigram(). Bron: stuurgroep- en programmateam-
// meeting Klant in Zicht, stappenplan analysefase 2026, KPI-sessies.

import type { OrganigramData } from "@/lib/schemas";

export const DEFAULT_ORGANIGRAM: OrganigramData = {
  secties: {
    organigram: {
      titel: "1 · Het organigram",
      intro:
        "Eén lijn omhoog (programmamanagement → programma-eigenaar), één lijn naar 3sides, en per werkstroom een Cito-lead die de werkstroom namens Cito leidt naast een 3sides-lead die het plan van aanpak uitvoert.",
    },
    rollen: {
      titel: "2 · Vijf rollen, vijf vragen",
      intro: "Dezelfde inhoud gaat door vijf handen. Wie waarvan is, en waar niet van.",
    },
    werkstromen: {
      titel: "3 · De vier werkstromen",
      intro:
        "Per werkstroom: wie leidt namens Cito, wie levert vanuit 3sides, welke domeineigenaar het draagt, waar het landt, en wat tot nu toe is besproken als resultaat en output-KPI. Het definitieve resultaat en de output-KPI komen uit het plan van aanpak per werkstroom.",
    },
    kpi: {
      titel: "4 · KPI's en doelen per laag",
      intro:
        "Doelen staan alleen op programmaniveau. Daaronder werken we met KPI's, streefniveaus en resultaten; anders raakt de keten doel → baat → vermogen → inspanning vervuild.",
    },
    rasci: {
      titel: "5 · Wie beslist wat — de gedeelde zone",
      intro:
        "Eén A per regel; wie C heeft, is vooraf gehoord. Niets uit deze zone gaat naar de stuurgroep, 3sides of de organisatie zonder dat Sanne en Pim er beiden achter staan.",
    },
    meeting: {
      titel: "6 · Uit de meeting, met advies en open punten",
      intro: "",
    },
  },

  begrippen: [
    "Programmamanagement = Sanne (regie) + Pim (inhoud, programma-architect), één blok",
    "Werkstroom = een van de vier werkstromen van de analysefase; Cito bepaalt wat het resultaat moet zijn en accepteert het, 3sides levert daarop. Elke werkstroom heeft een Cito-lead en een 3sides-lead",
    "Cito-lead = leidt de werkstroom namens Cito: bepaalt binnen de kaders van de programma-architect wat het resultaat moet zijn, maakt met de 3sides-lead het plan van aanpak en bewaakt kaders en resultaat (boekterm: inspanningsleider)",
    "3sides-lead = brengt methode, expertise en handen en voert het plan van aanpak uit met het team",
    "Domein = onderdeel van het vermogen waarin het resultaat landt; de domeineigenaar draagt het in de lijn",
    "Bateneigenaren = de sectormanagers, in de stuurgroep",
  ],

  sponsorgroep: "Sponsorgroep · MT ❓ te bevestigen — prioriteit, middelen, benoemt de programma-eigenaar",
  programmaEigenaar: {
    naam: "Meryl",
    rol: "Programma-eigenaar",
    toelichting: "programma-eigenaar · voorzitter stuurgroep · opdrachtgever 3sides",
  },
  programmamanager: {
    naam: "Sanne",
    rol: "regie",
    toelichting:
      "programmamanager · leiding en sturing van het programma · opdrachtgever werkstromen · regie 3sides · Cito-lead adoptieframework",
  },
  architect: {
    naam: "Pim",
    rol: "inhoud",
    toelichting:
      "programma-architect · inhoudelijke kaders en samenhang over alle vier de werkstromen · Cito-lead 0-meting",
  },
  pmToelichting:
    "Sanne is het aanspreekpunt naar de programma-eigenaar en de stuurgroep; Pim is de inhoudelijke autoriteit. Samen bereiden zij het programmateam en de stuurgroep voor.",

  overlegritme: [
    { naam: "Stuurgroep", ritme: "1× per 6 weken" },
    { naam: "Programmateam", ritme: "opstart 1× per week, daarna 1× per 2 weken" },
    {
      naam: "Voortgangsoverleg per werkstroom",
      ritme: "1× per 2 weken: Cito-lead + 3sides-lead + programmamanagement",
    },
    { naam: "Programma-eigenaar ↔ programmamanagement", ritme: "1× per 2 weken" },
  ],

  werkstromen: [
    {
      id: "klantreizen",
      naam: "Klantreizen",
      citoLead: "Saila",
      citoLeadFunctie: "inhoudsdeskundige sales & marketing funnel en klantreizen",
      sidesLead: "Sasja",
      domeineigenaar: "Processen: n.t.b. ❓",
      landtIn: "Processen · basis voor alle vier",
      resultaat:
        "Blueprint klantreis versie 1 met de sectoren; funnelprocessen met customer loops (Q3–Q4); eenduidig Customer Success-proces (Q4)",
      outputKpi: "Blueprint geaccepteerd · funnelprocessen vastgesteld · Customer Success-proces beschreven",
      planVanAanpak: "Te maken ❓ — Saila met Sasja; Pim toetst de kaders; Sanne stelt vast",
    },
    {
      id: "datavoorziening",
      naam: "Centrale datavoorziening klantcontact",
      citoLead: "Jama",
      citoLeadFunctie: "product owner bedrijfsapplicaties",
      sidesLead: "Lammert",
      domeineigenaar: "Cornelis (Data & Systemen)",
      landtIn: "Data & Systemen · technologielandschap",
      resultaat:
        "Klantinformatie-landschap en huidig CRM in kaart, acht bronnen (Q3); quick wins (doorlopend); klantreis → CRM-requirements (Q4); richting CRM (Q4, formele keuze rond april 2027)",
      outputKpi: "Inventarisatie af · advies behouden/vervangen/loslaten opgeleverd · richting CRM besluitklaar",
      planVanAanpak: "Te maken ❓ — Jama met Lammert; Pim toetst de kaders; Sanne stelt vast",
    },
    {
      id: "nulmeting",
      naam: "0-meting",
      citoLead: "Pim",
      citoLeadFunctie: "programma-architect; analyse met advies als uitkomst",
      sidesLead: "Sasja",
      domeineigenaar: "Alle vier: Cornelis, Yara, Processen n.t.b., Cultuur n.t.b.",
      landtIn: "Alle vier · startwaarden baten-KPI's",
      resultaat:
        "Meetprotocol per baten-KPI geaccordeerd met de sectormanagers (Q3); startwaarde per KPI en stand per domein (Q3); advies over de gap als basis voor de vervolgsessie en het pakket 2027",
      outputKpi: "Elke baten-KPI compleet (definitie, bron, startwaarde) · stand per domein opgeleverd · advies opgeleverd",
      planVanAanpak: "Te maken ❓ — Pim met Sasja; Sanne stelt vast",
    },
    {
      id: "adoptie",
      naam: "Adoptieframework",
      citoLead: "Sanne",
      citoLeadFunctie: "programmamanager; plan van aanpak, pilot en uitrol — inhoudelijke kaders bij Pim",
      sidesLead: "Sasja",
      domeineigenaar: "Yara (Mens) · Cultuur: n.t.b. ❓",
      landtIn: "Mens en Cultuur · paraplu over alle vier",
      resultaat:
        "Framework gereed en gedragen door het programmateam (Q3); pilot in één sector (Q3), tweede sector Q4, derde Q1 2027; ambassadeurs per sector (Q4)",
      outputKpi: "Framework vastgesteld · pilot gestart · eerste gedragsdata · ambassadeurs aangehaakt",
      planVanAanpak: "Te maken ❓ — Sanne met Sasja; Pim toetst de kaders",
    },
  ],

  domeinen: [
    { domein: "Data & Systemen", eigenaar: "Cornelis" },
    { domein: "Mens", eigenaar: "Yara (HR)" },
    { domein: "Processen", eigenaar: "n.t.b. ❓" },
    { domein: "Cultuur", eigenaar: "n.t.b. ❓" },
  ],
  staandeOrganisatie:
    "Staande organisatie — sectoren PO · VO · Zakelijk · klantcontact · marketing: daar landen de vermogens en worden de baten gerealiseerd",

  stuurgroep: [
    { naam: "Meryl", rol: "programma-eigenaar · voorzitter" },
    { naam: "Sanne en Pim", rol: "programmamanagement" },
    { naam: "Sectormanagers", rol: "bateneigenaren PO · VO · Zakelijk" },
    { naam: "George", rol: "financiële control · adviserend" },
  ],
  stuurgroepNoot: "Domeineigenaren op uitnodiging, bij besluiten over hun domein",

  hierarchie:
    "Meryl geeft de opdracht en zit de stuurgroep voor · programmamanagement leidt het programma, met Sanne als aanspreekpunt en Pim als inhoudelijke autoriteit · per werkstroom leidt de Cito-lead de werkstroom namens Cito, binnen de kaders van de architect, en voert de 3sides-lead het plan van aanpak uit met het team · de domeineigenaren laten het werken in de lijn · de sectormanagers bewaken als bateneigenaren dat de baten komen.",

  rollenKolommen: [
    "Programmamanager (Sanne)",
    "Architect (Pim)",
    "Cito-lead (per werkstroom)",
    "Domeineigenaar / bateneigenaar",
    "3sides-lead",
  ],
  rollenRijen: [
    {
      label: "Kernvraag",
      cellen: [
        "Gebeurt het, op tijd, haalbaar, met de juiste mensen?",
        "Klopt het en hangt het samen over de vier werkstromen?",
        "Halen we het afgesproken resultaat binnen de kaders?",
        "Werkt het bij ons, landt het, en komt de baat?",
        "Hoe doen we het, en wat werkt elders?",
      ],
    },
    {
      label: "Levert op",
      cellen: [
        "Cyclusplan, opdrachten aan de werkstromen, voortgang en rapportage, besluitklare stuurgroepstukken, werkafspraken met 3sides",
        "De kaders en het ontwerp (DIN, vermogens, adoptie-framework-logica, blueprint-kaders); de inhoudelijke acceptatie",
        "Het plan van aanpak (met de 3sides-lead), sturing op kaders en resultaat, signalen naar programmamanagement",
        "Het werkende vermogen in de lijn; de baat per sector",
        "Methode, expertise en handen: blueprint, technologielandschap, 0-meting, adoptieframework en teambegeleiding, volgens het plan van aanpak",
      ],
    },
    {
      label: "Beslist over",
      cellen: [
        "Tempo, capaciteit, geld en scope binnen het programmaplan; opdracht en plan van aanpak per werkstroom; het besluitproces; de knoop bij een patstelling",
        "Wat een werkstroom moet opleveren en of het klopt in de keten",
        "Wat binnen de kaders van de architect nodig is om het resultaat te halen; het plan van aanpak samen met de 3sides-lead",
        "Hoe het in het eigen domein wordt uitgewerkt en gebruikt; als bateneigenaar mee over richting en middelen",
        "De eigen werkwijze en methode binnen de opdracht; hoe te meten en uit welke bron",
      ],
    },
    {
      label: "Beslist niet over",
      cellen: [
        "De inhoud binnen de kaders (architect); de uitwerking in het domein (domeineigenaar); wat buiten het programmaplan valt (stuurgroep)",
        "Tempo, capaciteit, geld; de uitwerking in het domein",
        "De kaders zelf (architect); planning en capaciteit (programmamanager); de landing in de lijn (domeineigenaar)",
        "De samenhang tussen werkstromen; het tempo van het programma",
        "Kaders en acceptatie (architect); planning, prioriteit en scope (programmamanager); de uitwerking in het domein (domeineigenaar)",
      ],
    },
    {
      label: "Verantwoording aan",
      cellen: [
        "Programma-eigenaar",
        "Programmamanagement, met eigen mandaat op de inhoud",
        "Programmamanagement (voortgang en kaders); architect (inhoud)",
        "Stuurgroep en lijn",
        "Programma-eigenaar als opdrachtgever; dagelijks aan programmamanagement",
      ],
    },
    {
      label: "Zit in",
      cellen: [
        "Stuurgroep; voorzitter programmateam; voortgangsoverleggen; afstemming met programma-eigenaar",
        "Stuurgroep; programmateam; voortgangsoverleggen van alle vier de werkstromen",
        "Programmateam; voortgangsoverleg van de eigen werkstroom",
        "Lijn; stuurgroep (sectormanagers als lid, domeineigenaren op uitnodiging)",
        "Programmateam; voortgangsoverleg van de eigen werkstroom; op dinsdag bij Cito",
      ],
    },
    {
      label: "Typische zin",
      cellen: [
        "“Met deze bezetting halen we de datum niet; ik leg twee opties voor aan de stuurgroep.”",
        "“Dit past niet bij de baat; zo hoort het in de keten.”",
        "“Dit is het resultaat dat we hebben afgesproken; zo halen we het binnen de kaders.”",
        "“Zo gaan wij dat in ons domein niet gebruiken; dít wel.”",
        "“Dit zien we bij andere organisaties werken; zullen we het zo proberen?”",
      ],
    },
  ],
  rollenLegenda:
    "Cito-lead is een rol naast de eigen functie; wie hem vervult, is geen domeineigenaar van hetzelfde domein: eigenaar (lijn, landing, baat) en leider van de uitvoering (kaders, resultaat) blijven twee mensen.",

  werkstromenLegenda:
    "Over de vier heen: de blueprint bepaalt de datavraag (centrale datavoorziening) en het gedrag (adoptieframework); de 0-meting meet wat blueprint en framework definiëren. Daarom bewaakt de architect de samenhang over alle vier. Het plan van aanpak per werkstroom wordt opgesteld door de Cito-lead met de 3sides-lead, getoetst door de architect op de kaders en vastgesteld door de programmamanager; het bevat resultaat, output-KPI, aanpak, planning, capaciteit en de betrokken domeineigenaar.",

  kpiKolommen: ["Laag", "Wat staat er", "Waarop sturen we", "Wie"],
  kpiRijen: [
    {
      label: "Doelen (programma)",
      cellen: [
        "De programmadoelen uit Klant in Beeld",
        "Impact op lange termijn; geen aparte doelen per domein of werkstroom",
        "Programma-eigenaar, stuurgroep",
      ],
    },
    {
      label: "Baten (per sector)",
      cellen: [
        "Baten-KPI's, vastgesteld in de KPI-sessies",
        "Outcome: startwaarde uit de 0-meting, doelwaarde met datum in de vervolgsessie",
        "Bateneigenaren: sectormanagers · meetverantwoordelijke: Strategisch Marketeer",
      ],
    },
    {
      label: "Domein (vermogen)",
      cellen: [
        "Streefniveau: van AS-IS naar TO-BE",
        "Vermogen-indicator, pas na de 0-meting in de vervolgsessie vast te stellen; niet in overdraagbare stukken",
        "Domeineigenaar, afleiding door de architect",
      ],
    },
    {
      label: "Werkstroom (inspanning)",
      cellen: [
        "Resultaat: wat is af, wanneer — definitief in het plan van aanpak",
        "Output-KPI: klaar ja/nee, mijlpaal gehaald",
        "Cito-lead met de 3sides-lead; programmamanagement bewaakt",
      ],
    },
  ],

  rasciKolommen: ["Sanne", "Pim", "Cito-leads", "Domeineigenaren", "3sides", "Stuurgroep"],
  rasciRijen: [
    { label: "Cyclusplan / masterplan analysefase", cellen: ["A R", "S", "C", "C", "S", "besluit"] },
    { label: "Inhoudelijke kaders per werkstroom", cellen: ["C", "A R", "C", "C", "S", "I"] },
    { label: "Plan van aanpak per werkstroom", cellen: ["A", "C toetst kaders", "R", "C", "R", "I"] },
    { label: "Uitvoering van het plan van aanpak", cellen: ["I", "C", "A", "C", "R", "I"] },
    { label: "Inhoudelijke acceptatie van een resultaat", cellen: ["I", "A", "R", "C", "S", "I"] },
    { label: "Acceptatie voor gebruik in de lijn", cellen: ["I", "V", "S", "A", "S", "I"] },
    { label: "Stuurgroepstukken en besluitvragen", cellen: ["A R presenteert", "R licht inhoud toe", "C", "C", "I", "ontvangt"] },
    { label: "Pakket vervolg-inspanningen 2027", cellen: ["A", "V waartoe-toets", "R", "R", "S", "besluit"] },
  ],
  rasciLegenda:
    "R voert uit · A eindverantwoordelijk (één per regel) · S ondersteunt · C vooraf geraadpleegd · I geïnformeerd · V verifieert. Letters zoals in stap 5 van de app.",

  meeting: [
    "Stuurgroep KIZ: Meryl (programma-eigenaar, voorzitter) · Pim en Sanne (programmamanagement) · sectormanagers (bateneigenaren) · George (financiële control). Cornelis was genoemd als eigenaar Data & Systemen; afgesproken na de meeting: domeineigenaren op uitnodiging. Frequentie 1× per 6 weken.",
    "Programmateam: Pim en Sanne (programmamanagement) · Saila (Cito-lead klantreizen) · Jama (product owner bedrijfsapplicaties, Cito-lead centrale datavoorziening) · Sasja (3sides-lead klantreizen, 0-meting, adoptieframework) · Lammert (3sides-lead centrale datavoorziening klantcontact). Opstart 1× per week, later 1× per 2 weken; daarnaast 1× per 2 weken voortgangsoverleg per werkstroom met programmamanagement.",
    "Overig: 1× per 2 weken afstemming programma-eigenaar met programmamanagement.",
    "Cito-leads uit programmamanagement: Pim voor de 0-meting (analyse met advies), Sanne voor het adoptieframework.",
  ],
  advies: [
    "Pim staat als programma-architect op de inhoud over alle vier de werkstromen: elke Cito-lead werkt binnen de kaders van de programma-architect, ook Sanne voor het adoptieframework en Pim zelf voor de 0-meting. De 0-meting is een analyse met een advies als uitkomst en past daarmee bij de architect; voor het adoptieframework leidt Sanne als Cito-lead het plan van aanpak, de pilot en de uitrol. De voortgang van deze twee werkstromen komt in de tweewekelijkse afstemming met Meryl.",
    "Cito bepaalt, 3sides levert: de Cito-lead leidt de werkstroom namens Cito en de 3sides-lead voert het plan van aanpak uit; geen resultaat gaat naar de stuurgroep zonder inhoudelijke acceptatie door de architect.",
    "Cito-leads zijn geen domeineigenaar van hetzelfde domein: eigenaar (lijn) en leider van de uitvoering uit elkaar houden voorkomt twee petten.",
    "Stuurgroep klein houden: domeineigenaren op uitnodiging bij besluiten over hun domein.",
    "Geen extra overleggen: het voortgangsoverleg per werkstroom is ook de plek voor kaders en inhoud; de duo-afstemming Sanne–Pim is de voorbereiding van het programmateam.",
  ],
  openPunten: [
    "Plan van aanpak per werkstroom: opstellen (Cito-lead met 3sides-lead), toetsen (architect), vaststellen (programmamanager)",
    "Domeineigenaar Processen en Cultuur benoemen",
    "Sponsorgroep (MT?) bevestigen",
    "Rollen, mandaten en Cito-leads vaststellen door de programma-eigenaar",
    "Vermogen-indicatoren en doelwaarden: in de vervolgsessie na de 0-meting",
  ],
  bronnen:
    "Bronnen: stuurgroep- en programmateam-meeting Klant in Zicht · stappenplan analysefase 2026 · KPI-sessies · Opdracht Sanne · 3sides-presentatie",
};

/** Legt de opgeslagen (mogelijk gedeeltelijke) sessie-inhoud over de standaard. */
export function mergeOrganigram(opgeslagen?: Partial<OrganigramData> | null): OrganigramData {
  if (!opgeslagen) return kloon(DEFAULT_ORGANIGRAM);
  const basis = kloon(DEFAULT_ORGANIGRAM);
  const resultaat: OrganigramData = { ...basis, ...(opgeslagen as OrganigramData) };
  // secties per kop mergen, zodat een nieuw toegevoegde kop nooit ontbreekt
  resultaat.secties = { ...basis.secties, ...(opgeslagen.secties ?? {}) };
  return resultaat;
}

export function kloon<T>(x: T): T {
  return JSON.parse(JSON.stringify(x)) as T;
}
