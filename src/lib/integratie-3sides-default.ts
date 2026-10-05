// Stap 11 — "Programma × 3sides". Kernboodschap: de programmastructuur staat; alles
// wat 3sides heeft, past onder het ene framework van het programma (het Doelen-
// Inspanningennetwerk, DIN); met de juiste rollen in het framework maken we het concreet.
// Verhaallijn in tien delen: de kern → de structuur (plaat met rollen, de toets) → 3sides
// naast het DIN (werkstromen bouwen, kernprincipes meten) → de vier werkstromen → planning,
// voortgang en het actiebord van Cito → het meetmodel → eerst intern besluiten → de interne
// evaluatie van 3sides → het gesprek met 3sides (de agenda) → bronnen.
// Standaardinhoud; in de app per kop en cel aanpasbaar en opgeslagen onder
// session.documenten[INTEGRATIE_SLEUTEL].
//
// Bronnen (alleen deze; stand 29-09-2026):
// - 3sides, map "3sides input": Plan van Aanpak (PDF, 13 p.), Project tijdlijn
//   (Excel, tab v3, stand 28-09), 0-meting meetinstrument (WiP, 16 p.), Data punten ter
//   input KPI (Excel), Blueprint klantreis (draft), Adoptieframework (WiP),
//   Data & Tech, praatplaten funnel en salesproces, BV-dag, Evaluatie Klant in Beeld.
// - 3sides-statuspagina (tekst gedeeld door Pim, 29-09) en het verslag van het
//   programmaoverleg van 29-09.
// - Programma: DIN in de app (sessie, stand 29-09), KPI-model (stap 9), stappenplan analysefase (19-08-2026), organigram (stap 10).
// Niet gebruikt: de orderexport "Aantallen besteld" (hoort niet bij deze analyse).
// Regel: niets verzinnen — datums en waarden alleen uit deze bronnen, anders "te bepalen";
// koppelingen die het programma voorstelt, staan als "voorstel".

import type { BewerkbaarDocument, DocBlok, DocKaart, DocLaag, DocSectie } from "@/lib/schemas";

export const INTEGRATIE_SLEUTEL = "integratie-3sides";

// ---------- kleine bouwers ----------
const lijst = (items: string[], titel = ""): DocBlok => ({ type: "lijst", titel, items });
const tekst = (t: string): DocBlok => ({ type: "tekst", tekst: t });
const callout = (toon: "info" | "let-op" | "besluit", titel: string, t: string): DocBlok => ({
  type: "callout",
  toon,
  titel,
  tekst: t,
});
const tabel = (
  kolommen: string[],
  rijen: string[][],
  opts: { titel?: string; legenda?: string; chipKolom?: number; groepKolom?: number; invulKolom?: number } = {}
): DocBlok => ({
  type: "tabel",
  titel: opts.titel ?? "",
  kolommen,
  rijen,
  legenda: opts.legenda ?? "",
  ...(opts.chipKolom !== undefined ? { chipKolom: opts.chipKolom } : {}),
  ...(opts.groepKolom !== undefined ? { groepKolom: opts.groepKolom } : {}),
  ...(opts.invulKolom !== undefined ? { invulKolom: opts.invulKolom } : {}),
});
const laag = (naam: string, kleur: string, cellen: string[]): DocLaag => ({ naam, kleur, cellen });
const kaart = (titel: string, ondertitel: string, regels: [string, string, boolean?][]): DocKaart => ({
  titel,
  ondertitel,
  regels: regels.map(([label, waarde, accent]) => ({ label, waarde, accent: !!accent })),
});
const kaarten = (k: DocKaart[]): DocBlok => ({ type: "kaarten", kaarten: k });
const lagen = (kolommen: string[], l: DocLaag[]): DocBlok => ({ type: "lagen", kolommen, lagen: l });
const sectie = (id: string, titel: string, intro: string, blokken: DocBlok[]): DocSectie => ({
  id,
  titel,
  intro,
  blokken,
});

// ---------- de DIN-plaat, met de rollen ----------
type DinPlaat = Extract<DocBlok, { type: "dinplaat" }>;

// Versie 1: zoals het in het organigram en het plan van aanpak staat.
const DIN_PLAAT: DinPlaat = {
  type: "dinplaat",
  versie: "Versie 1 · zoals het nu staat",
  versieToelichting:
    "Vier werkstromen, elk gekoppeld aan een of meer domeinen; adoptie is een eigen werkstroom. Zo staat het in het organigram en in het plan van aanpak van 3sides (plan van aanpak p. 3).",
  doel: {
    titel: "Doel 1 · Integraal klantbeeld en outside-in werken als strategisch fundament",
    tekst: "Het programma richt zich nu op dit doel (focusdoel in de app, stap 5): alle drie de baten hangen eronder. Doel 2 en doel 3 hebben nog geen eigen baten.",
    rol: "Programma-eigenaar: Meryl · voorzitter stuurgroep",
    kpi: "Impact: organisatiebreed gemeten (NPS, conversie, omzet, retentie/churn); jaarlijks · voorstel",
  },
  baten: [
    {
      titel: "Zakelijk",
      tekst: "Sterkere klantgerichtheid bij opdrachtgevers en kandidaten · 5 baten-KPI's",
      rol: "Bateneigenaar: sectormanager Zakelijk",
      kpi: "5 baten-KPI's: funnel-conversie per stap · offertes: aantal en % dat opdracht wordt · conversie uit bezoeken · serviceniveau en reactietijden · churn",
    },
    {
      titel: "PO",
      tekst: "Intensiever partnership · 5 baten-KPI's",
      rol: "Bateneigenaar: sectormanager PO",
      kpi: "5 baten-KPI's: groei productgebruik (cross- en upsell) · gebruiksintensiteit volledige lijn · raamcontracten grote besturen · ontwikkeldeadlines en beloftes gehaald · churn",
    },
    {
      titel: "VO",
      tekst: "Hogere voorspelbaarheid commerciële begroting · 4 baten-KPI's",
      rol: "Bateneigenaar: sectormanager VO",
      kpi: "4 baten-KPI's: prognose-nauwkeurigheid · % meerjarige (3-jr) licenties · inzicht in toetskeuzemomenten · churn",
    },
  ],
  vermogen: {
    titel: "Gedeeld vermogen",
    tekst:
      "Klantgericht commercieel vermogen op basis van betrouwbare klantdata — outside-in handelen, gedragen door CRM-fundament, eenduidige funnelprocessen, getrainde medewerkers en een cultuur van eigenaarschap. Meetlat (voorstel): de vijf kernprincipes van 3sides (deel 3).",
    rol: "",
    kpi: "Leidend: per kernprincipe één score van 1 tot 10 in de 0-meting; stand per domein van huidige naar gewenste situatie",
    meetlat: ["Klant begrijpen", "Klantinformatie benutten", "Eigenaarschap nemen", "Data-gedreven werken", "Samenwerken rond en met de klant"],
  },
  regie:
    "Programmamanagement: Sanne (programmamanager: regie, aanspreekpunt) · Pim (programma-architect: inhoudelijke kaders)",
  domeinen: [
    { id: "cultuur", naam: "Cultuur", kleur: "#d97706", vermogensdeel: "Een cultuur van eigenaarschap", eigenaar: "n.t.b. ❓", inspanningen: "Verankeren van outside-in leiderschap als rolmodel gedrag" },
    { id: "mens", naam: "Mens", kleur: "#2563eb", vermogensdeel: "Getrainde medewerkers", eigenaar: "Yara (HR)", inspanningen: "Trainen medewerkers in klantgerichte gespreksvaardigheden" },
    { id: "data", naam: "Data & Systemen", kleur: "#7c3aed", vermogensdeel: "CRM-fundament en betrouwbare klantdata", eigenaar: "Cornelis", inspanningen: "Implementeren en inrichten van integraal CRM-klantdashboard" },
    { id: "processen", naam: "Processen", kleur: "#059669", vermogensdeel: "Eenduidige funnelprocessen", eigenaar: "n.t.b. ❓", inspanningen: "Standaardiseren en borgen van klantinformatieprocessen organisatiebreed" },
  ],
  werkstromen: [
    {
      naam: "Adoptieframework",
      anker: "adoptie",
      domeinen: ["cultuur", "mens"],
      leads: "Cito-lead Sanne · 3sides-lead Sasja",
      oplevert: "Adoptieaanpak (SMILE), playbook-workshops, per rol één A4, adoptieteam en champions",
      planVanAanpak: "Deels: eerste versie van 3sides (plan van aanpak p. 12–13); aanvullen: afbakening van de scope, output-KPI, capaciteit",
      kpi: "Output: framework vastgesteld · pilot gestart · eerste gedragsdata · ambassadeurs aangehaakt",
    },
    {
      naam: "Centrale datavoorziening klantcontact",
      anker: "data",
      domeinen: ["data"],
      leads: "Cito-lead Jama · 3sides-lead Lammert",
      oplevert: "Overzicht van systemen, advies per systeem, roadmap",
      planVanAanpak: "Deels: eerste versie van 3sides (plan van aanpak p. 6–7); aanvullen: output-KPI, capaciteit",
      kpi: "Output: inventarisatie af · advies behouden/vervangen/loslaten opgeleverd · richting CRM besluitklaar",
    },
    {
      naam: "Klantreizen",
      anker: "klantreizen",
      domeinen: ["processen"],
      leads: "Cito-lead Saila · 3sides-lead Sasja",
      oplevert: "Eén blueprint van de klantreis voor heel Cito BV",
      planVanAanpak: "Deels: eerste versie van 3sides (plan van aanpak p. 10–11); aanvullen: output-KPI, capaciteit, eigenaar",
      kpi: "Output: blueprint geaccepteerd · funnelprocessen vastgesteld · Customer Success-proces beschreven",
    },
    {
      naam: "0-meting",
      anker: "meting",
      domeinen: ["cultuur", "mens", "data", "processen"],
      leads: "Cito-lead Pim · 3sides-lead Sasja",
      oplevert: "Meetmodel, datapunten, 0-meting en tussenmeting: meet het vermogen en de baten",
      planVanAanpak: "Deels: eerste versie van 3sides (plan van aanpak p. 8–9); aanvullen: meetprotocol, eigenaar per datapunt",
      kpi: "Output: elke baten-KPI compleet (definitie, bron, startwaarde) · stand per domein opgeleverd · advies opgeleverd",
    },
  ],
  voet:
    "Lees van onder naar boven: elke werkstroom bouwt in een of meer domeinen aan het vermogen; samen levert dat de baten, en die dragen bij aan het doel. Op elk niveau staat wie het draagt. Klik op een werkstroom voor het plan van aanpak. Bronnen: DIN in de app (stand 29-09-2026), KPI-model (stap 9), organigram (stap 10), plan van aanpak 3sides.",
};

// Versie 2: voorstel na het programmaoverleg van 01-10-2026, getoetst aan Werken aan
// Programma's. Doel, baten, vermogen en domeinen zijn gelijk aan versie 1.
const DIN_PLAAT_V2: DinPlaat = {
  ...DIN_PLAAT,
  versie: "Versie 2 · voorstel na het overleg van 01-10",
  versieToelichting:
    "Twee wijzigingen uit het programmaoverleg van 01-10, getoetst aan Werken aan Programma's. Eén: elke werkstroom raakt alle vier de domeinen, met een zwaartepunt; een vermogen is een combinatie van mensen, processen, data en systemen en werkt pas als die onderdelen samen zijn ontwikkeld. Twee: adoptie is geen aparte werkstroom, maar de veranderstrategie over alle werkstromen heen: de brug tussen doelen en baten en de vermogens en inspanningen. Voorstel; nog niet besloten.",
  strategie: {
    titel: "Veranderstrategie: adoptie",
    tekst:
      "Hoe we de verandering voor elkaar krijgen en de medewerkers meenemen. Geen aparte werkstroom, maar de aanpak die in elke werkstroom zit, vanaf het begin (overleg 01-10). Eerst een gedeeld beeld: waarom Klant in Zicht, en wat we bedoelen met een integraal klantbeeld. Daarna per werkstroom: wat verandert er voor welke rol, van de huidige naar de gewenste situatie (Werken aan Programma's, over de veranderstrategie). De interventies hieronder komen uit het plan van aanpak van 3sides (plan van aanpak p. 12) en de tijdlijn; de uitwerking per werkstroom staat nog niet in de plannen van aanpak: te bepalen.",
    rol: "Regie: Sanne (programmamanager; Cito-lead Adoptieframework) · 3sides-lead Sasja · gedragen door de bateneigenaren, met een veranderteam uit de afdelingen (voorstel)",
    punten: [
      "Gedeeld beeld: het waarom en de begrippen",
      "Kern-adoptieteam en champions per afdeling",
      "Communicatieplan",
      "Playbook-workshops klantreis",
      "Per rol één A4: mijn rol in de klantreis",
      "Training en coaching, samen met HR",
    ],
  },
  werkstromen: [
    {
      naam: "Centrale datavoorziening klantcontact",
      anker: "data",
      domeinen: ["cultuur", "mens", "data", "processen"],
      zwaartepunt: "data",
      raakt: "Wat dit vraagt in Processen, Mens en Cultuur: te bepalen in het plan van aanpak",
      leads: "Cito-lead Jama · 3sides-lead Lammert",
      oplevert: "Overzicht van systemen, advies per systeem, roadmap",
      planVanAanpak: "Deels: eerste versie van 3sides (plan van aanpak p. 6–7); aanvullen: output-KPI, capaciteit",
      kpi: "Output: inventarisatie af · advies behouden/vervangen/loslaten opgeleverd · richting CRM besluitklaar",
    },
    {
      naam: "Klantreizen",
      anker: "klantreizen",
      domeinen: ["cultuur", "mens", "data", "processen"],
      zwaartepunt: "processen",
      raakt: "Data & Systemen: wat de klantreis aan data en systemen vraagt · Mens: de vaardigheid om met klantreizen te werken · Cultuur: de nieuwe werkwijze omarmen en uitvoeren (overleg 01-10)",
      leads: "Cito-lead Saila · 3sides-lead Sasja",
      oplevert: "Eén blueprint van de klantreis voor heel Cito BV",
      planVanAanpak: "Deels: eerste versie van 3sides (plan van aanpak p. 10–11); aanvullen: output-KPI, capaciteit, eigenaar",
      kpi: "Output: blueprint geaccepteerd · funnelprocessen vastgesteld · Customer Success-proces beschreven",
    },
    {
      naam: "0-meting",
      anker: "meting",
      domeinen: ["cultuur", "mens", "data", "processen"],
      leads: "Cito-lead Pim · 3sides-lead Sasja",
      oplevert: "Meetmodel, datapunten, 0-meting en tussenmeting: meet het vermogen en de baten",
      planVanAanpak: "Deels: eerste versie van 3sides (plan van aanpak p. 8–9); aanvullen: meetprotocol, eigenaar per datapunt",
      kpi: "Output: elke baten-KPI compleet (definitie, bron, startwaarde) · stand per domein opgeleverd · advies opgeleverd",
    },
  ],
  voet:
    "Lees van onder naar boven: elke werkstroom raakt alle vier de domeinen van het vermogen, met een zwaartepunt; de veranderstrategie loopt door alle werkstromen heen. De domeineigenaar bewaakt in zijn domein de kaders: wat hoort bij Klant in Zicht en wat niet (overleg 01-10). Nog te besluiten ❓: wie de inspanningen in de domeinen Mens en Cultuur uitvoert als adoptie geen eigen werkstroom is. De werkstroomkaarten (deel 4) en de tijdlijn (deel 5) volgen nog versie 1. Bronnen: programmaoverleg 01-10-2026; Werken aan Programma's (over vermogens en over de veranderstrategie); DIN in de app (stand 29-09-2026), KPI-model (stap 9), organigram (stap 10), plan van aanpak 3sides.",
};

// ---------- de vijf kernprincipes van 3sides in ons vermogen ----------
const KERNPRINCIPES: DocBlok = {
  type: "matrix",
  titel: "De vijf kernprincipes van 3sides in ons vermogen",
  hoek: "Kernprincipe",
  kolommen: [
    { titel: "Klant begrijpen", kleur: "#dbeafe" },
    { titel: "Klantinformatie benutten", kleur: "#ede9fe" },
    { titel: "Eigenaarschap nemen", kleur: "#fef3c7" },
    { titel: "Data-gedreven werken", kleur: "#ede9fe" },
    { titel: "Samenwerken rond en met de klant", kleur: "#d1fae5" },
  ],
  rijen: [
    {
      label: "Kunnen",
      sublabel: "bij 3sides: vermogen",
      soort: "tekst",
      accent: false,
      cellen: [
        "Cito kan vanuit een integraal klantbeeld doorgronden wat klanten nodig hebben, willen bereiken en ervaren.",
        "Cito kan beschikbare klantdata en signalen vertalen naar bruikbare inzichten.",
        "Medewerkers voelen zich verantwoordelijk voor het volledige klantresultaat, ook wanneer meerdere teams betrokken zijn.",
        "Cito kan besluiten baseren op betrouwbare gegevens en resultaten meetbaar maken.",
        "Cito kan interne expertise verbinden en klanten als actieve partner betrekken.",
      ],
    },
    {
      label: "Doen",
      sublabel: "bij 3sides: inspanning",
      soort: "tekst",
      accent: false,
      cellen: [
        "Medewerkers luisteren actief, stellen verdiepende vragen, brengen de klantreis en context in kaart en toetsen regelmatig of aannames nog kloppen.",
        "Medewerkers leggen informatie consequent vast, combineren bronnen, delen inzichten en gebruiken deze zichtbaar bij prioritering, klantcontact en verbetering van proposities en dienstverlening.",
        "Medewerkers maken duidelijk wie verantwoordelijk is, en regelen handovers, komen afspraken na, volgen vragen actief op en zorgen dat problemen worden opgelost of tijdig worden geëscaleerd.",
        "Teams bepalen vooraf relevante KPI’s, volgen bijvoorbeeld NPS, conversie en omzetgroei, toetsen keuzes aan data en sturen bij wanneer resultaten achterblijven.",
        "Teams werken vanuit gedeelde klantdoelen, dragen informatie zorgvuldig over, betrekken klanten vroegtijdig bij oplossingen en leren gezamenlijk van feedback en resultaten.",
      ],
    },
    {
      label: "In ons vermogen",
      sublabel: "DIN · voorstel",
      soort: "tekst",
      accent: true,
      cellen: [
        "Outside-in handelen, door getrainde medewerkers",
        "Betrouwbare klantdata, gedragen door het CRM-fundament",
        "Een cultuur van eigenaarschap",
        "Commercieel vermogen op basis van betrouwbare klantdata",
        "Eenduidige funnelprocessen",
      ],
    },
    {
      label: "Domein",
      sublabel: "DIN · voorstel",
      soort: "domeinen",
      accent: true,
      cellen: ["mens", "data", "cultuur", "data", "processen"],
    },
    {
      label: "Opgebouwd door",
      sublabel: "werkstroom · voorstel",
      soort: "chips",
      accent: true,
      cellen: [
        "Adoptieframework",
        "Centrale datavoorziening klantcontact",
        "Adoptieframework",
        "Centrale datavoorziening klantcontact",
        "Klantreizen",
      ],
    },
  ],
  legenda:
    "Kunnen en doen: letterlijk uit het meetinstrument van 3sides (p. 11); 3sides noemt kunnen 'vermogen' en doen 'inspanning' (meetinstrument p. 5), in het DIN horen beide bij het vermogen. De kolomkleur is die van het domein (rij Domein). De 0-meting geeft per kernprincipe één score van 1 tot 10 voor kunnen en doen samen (meetinstrument p. 12). Blauwe rijen: voorstel van het programma, te bespreken met 3sides. Elk kernprincipe raakt meer domeinen; hier staat waar het vooral wordt opgebouwd.",
};

// ---------- de vier werkstromen, uit het plan van aanpak ----------
const WERKSTROMEN: DocBlok = {
  type: "werkstromen",
  kaarten: [
    {
      id: "adoptie",
      naam: "Adoptieframework",
      bijnaam: "Adoptieframework",
      domeinen: ["cultuur", "mens"],
      leads: "Cito-lead Sanne · 3sides-lead Sasja",
      bron: "Plan van aanpak p. 12–13",
      waarom: "Iedereen weet wat Klant in Zicht betekent voor de eigen sector, het eigen team en de eigen rol.",
      resultaten: [
        "Adoptieframework gerealiseerd en gevalideerd: het SMILE-framework, met een veranderingsprogramma in hoofdlijnen",
        "Customer Journey Playbook-workshops: gerealiseerd met de eerste pilotsector of -fase, en per rol op één A4 'Mijn rol in de klantreis'",
        "Communicatieplan: voor het programma opgesteld",
        "Kern-adoptieteam: vastgesteld",
        "Customer Journey Champions: binnen de sectoren per afdeling vastgesteld, verantwoordelijk voor voorbeeldgedrag en verbeteren",
      ],
      planning: [
        { wanneer: "Q3 2026", wat: "inventariseren, analyseren, ontwerpen" },
        { wanneer: "Q4 2026", wat: "playbooks" },
        { wanneer: "Q1 2027", wat: "pilots in de sectoren" },
      ],
      dinPad: [
        "Inspanning: in het DIN 'Trainen medewerkers in klantgerichte gespreksvaardigheden' (Mens) en 'Verankeren van outside-in leiderschap als rolmodel gedrag' (Cultuur); de werkstroom adoptieframework voert ze uit",
        "Vermogen: getrainde medewerkers en een cultuur van eigenaarschap",
        "Baten: Zakelijk · PO · VO",
      ],
      aanvullen: [
        "Scope afbakenen (reikwijdte staat in de aanleiding, een scope-paragraaf ontbreekt)",
        "Domeineigenaar Cultuur",
        "Keuze eerste pilotsector",
        "Output-KPI per resultaat",
        "Capaciteit Cito en HR",
      ],
      koppelingen: [
        { label: "Plan van aanpak p. 12–13", url: "" },
        { label: "Adoptieframework (PDF)", url: "" },
        { label: "Tijdlijn (Excel, tab v3)", url: "" },
        { label: "Jira-bord: link toevoegen", url: "" },
      ],
    },
    {
      id: "data",
      naam: "Centrale datavoorziening klantcontact",
      bijnaam: "Technologielandschap",
      domeinen: ["data"],
      leads: "Cito-lead Jama · 3sides-lead Lammert",
      bron: "Plan van aanpak p. 6–7",
      waarom: "Overzicht en keuzes in een groeiend aantal systemen, tools en koppelingen.",
      resultaten: [
        "Een compleet overzicht van de huidige systemen, koppelingen, eigenaren en kosten",
        "Een gewenst doelbeeld met een set ontwerpprincipes",
        "Een advies per systeem: behouden, vervangen, samenvoegen of uitfaseren",
        "Een roadmap met prioriteiten, afhankelijkheden en een indicatie van de kosten",
        "Een werkwijze om het landschap actueel te houden",
      ],
      planning: [
        { wanneer: "Q3", wat: "inventarisatie en analyse" },
        { wanneer: "Q3/Q4", wat: "doelbeeld en keuzes" },
        { wanneer: "Q4", wat: "roadmap en overdracht" },
      ],
      dinPad: [
        "Inspanning: in het DIN 'Implementeren en inrichten van integraal CRM-klantdashboard' (Data & Systemen); de werkstroom technologielandschap levert de inventarisatie en het advies vooraf (stappenplan, prioriteit 1)",
        "Vermogen: CRM-fundament en betrouwbare klantdata",
        "Baten: Zakelijk · PO · VO",
      ],
      aanvullen: [
        "Output-KPI per resultaat",
        "Capaciteit Cito",
        "CRM-richting (november) naast de CRM-keuze (rond april 2027)",
      ],
      koppelingen: [
        { label: "Plan van aanpak p. 6–7", url: "" },
        { label: "Data & Tech (PDF)", url: "" },
        { label: "Praatplaat funnel (PDF)", url: "" },
        { label: "Praatplaat proces (PDF)", url: "" },
        { label: "Tijdlijn (Excel, tab v3)", url: "" },
        { label: "Jira-bord: link toevoegen", url: "" },
      ],
    },
    {
      id: "klantreizen",
      naam: "Klantreizen",
      bijnaam: "Cito Blueprint Klantreis",
      domeinen: ["processen"],
      leads: "Cito-lead Saila · 3sides-lead Sasja",
      bron: "Plan van aanpak p. 10–11",
      waarom: "Van een klantreis per sector naar één klantreis voor heel Cito BV, die iedereen herkent.",
      resultaten: [
        "Blueprint als matrix: een compleet overzicht van de klantreisfasen, klantdoelen, hoofdstappen en de bijbehorende kernwaarden en kernprincipes, gevalideerd door productmanagers en sectormanagers",
        "Per klantreisfase: een verdere koppeling naar processen, systeemgebruik en gedrag door verschillende rollen, en KPI's die inzicht geven in hoe succesvol we zijn vanuit de kernprincipes",
      ],
      planning: [
        { wanneer: "Q3 2026", wat: "inventariseren, analyseren, ontwerpen" },
        { wanneer: "Q4 2026", wat: "gevalideerd en toegepast in een eerste pilotgroep" },
      ],
      dinPad: [
        "Inspanning: in het DIN 'Standaardiseren en borgen van klantinformatieprocessen organisatiebreed' (Processen); de werkstroom klantreizen voert dat uit met de blueprint",
        "Vermogen: eenduidige funnelprocessen",
        "Baten: Zakelijk · PO · VO",
      ],
      aanvullen: [
        "Domeineigenaar Processen",
        "Output-KPI per resultaat",
        "Capaciteit Cito",
        "Eigenaar van de blueprint na het programma",
      ],
      koppelingen: [
        { label: "Plan van aanpak p. 10–11", url: "" },
        { label: "Blueprint klantreis (Excel)", url: "" },
        { label: "Tijdlijn (Excel, tab v3)", url: "" },
        { label: "Jira-bord: link toevoegen", url: "" },
      ],
    },
    {
      id: "meting",
      naam: "0-meting",
      bijnaam: "Succes meten",
      domeinen: ["cultuur", "mens", "data", "processen"],
      leads: "Cito-lead Pim · 3sides-lead Sasja",
      bron: "Plan van aanpak p. 8–9",
      waarom: "Weten waar we nu staan en of het programma werkt.",
      resultaten: [
        "Meetmodel: een compleet overzicht, van doelen via baten naar vermogens en inspanningen",
        "Datapunten: een gedetailleerde verzameling (data ophalen)",
        "0-meting: op basis van een zeer uitgebreide set programma-KPI's, de baten (effecten) en de KPI's per klantreisfase binnen de vijf kernprincipes",
        "Tussenmeting: om de voortgang van het programma tussentijds te evalueren en bij te sturen",
      ],
      planning: [
        { wanneer: "Q3 2026", wat: "inventariseren, analyseren, ontwerpen" },
        { wanneer: "Q3/Q4 2026", wat: "0-meting" },
        { wanneer: "Q1 2027", wat: "tussenmeting" },
      ],
      dinPad: [
        "Inspanning: in het DIN '0-meting: meten van baten en vermogen', over alle vier de domeinen (besluit 30-09); de werkstroom voert haar uit met meetmodel, 0-meting en tussenmeting",
        "Vermogen: alle vier de delen; de inspanning bouwt het meten van baten en vermogen op en meet het vermogen met de vijf kernprincipes",
        "Baten: de 14 baten-KPI's, met startwaarden uit de 0-meting",
      ],
      aanvullen: [
        "Meetprotocol per baten-KPI",
        "Eigenaar per datapunt",
        "Validatie met Meryl en het MT",
        "Datum vervolgsessie doelwaarden",
      ],
      koppelingen: [
        { label: "Plan van aanpak p. 8–9", url: "" },
        { label: "0-meting meetinstrument (PDF)", url: "" },
        { label: "Data punten ter input KPI (Excel)", url: "" },
        { label: "Tijdlijn (Excel, tab v3)", url: "" },
        { label: "Jira-bord: link toevoegen", url: "" },
      ],
    },
  ],
};

// ---------- de projecttijdlijn van 3sides (Excel, tab v3) ----------
// Patroon per activiteit: 12 tekens van juli 2026 t/m juni 2027 (Excel-kolommen E t/m P):
// s = ▶ start · l = ⟳ loopt · o = ⚑ oplevering · - = leeg.
const MARKERING: Record<string, string> = { s: "start", l: "loopt", o: "oplevering" };
const act = (activiteit: string, patroon: string, voortgang: string, status = "") => ({
  activiteit,
  cellen: patroon.split("").map((c) => MARKERING[c] ?? ""),
  voortgang,
  status,
});
const LOOPT = "Loopt";
const NIET = "Niet gestart";

const TIJDLIJN: DocBlok = {
  type: "tijdlijn",
  titel: "",
  jaren: [
    { label: "2026", maanden: 6 },
    { label: "2027", maanden: 6 },
  ],
  maanden: ["jul", "aug", "sep", "okt", "nov", "dec", "jan", "feb", "mrt", "apr", "mei", "jun"],
  nu: "vandaag",
  nuLabel: "stand 28-09",
  groepen: [
    {
      naam: "Adoptieframework",
      bijnaam: "Adoptieframework",
      anker: "adoptie",
      domeinen: ["cultuur", "mens"],
      rijen: [
        act("Adoptieframework opstellen", "sllo--------", LOOPT, "+"),
        act("Communicatieplan", "---sl-------", NIET),
        act("Playbook-workshops klantreis", "-----sllllo-", NIET),
        act("Toepassen in de 1e sector of fase, met eerste gedragsdata", "------so----", NIET),
        act("Toepassen in de 2e sector of fase", "-------so---", NIET),
        act("Toepassen in de 3e sector of fase", "---------so-", NIET),
        act("Training- en coachingsprogramma live, samen met HR", "---------slo", NIET),
        act("Feedbackloops", "------slllo-", NIET),
        act("Adoptieframework toetsen", "---sllllllll", LOOPT, "+/-"),
        act("Ambassadeurs en adoptieteam", "---sllllllll", NIET),
      ],
    },
    {
      naam: "Centrale datavoorziening klantcontact",
      bijnaam: "Technologielandschap",
      anker: "data",
      domeinen: ["data"],
      rijen: [
        act("Analyse van data en applicaties", "slo---------", LOOPT, "+/-"),
        act("CRM-richting bepalen", "-sllo-------", LOOPT, "+/-"),
        act("Stakeholders betrekken", "slllllllo---", LOOPT, "+"),
        act("Marketing- en salesproces en funnel", "--so--------", LOOPT, "+"),
        act("Aanpak voor integraties", "slllo-------", LOOPT, "+/-"),
        act("Visie en consequenties", "slo---------", LOOPT, "+"),
        act("Interventies", "---sllllllll", NIET),
      ],
    },
    {
      naam: "Klantreizen",
      bijnaam: "Cito Blueprint Klantreis",
      anker: "klantreizen",
      domeinen: ["processen"],
      rijen: [
        act("Klant in Beeld-klantreizen samenvoegen", "so----------", LOOPT, "+/-"),
        act("Blueprint: fasen en hoofdstappen", "-slo--------", LOOPT, "+"),
        act("Blueprint: kernwaarden en kernprincipes naar handelen", "--slo-------", LOOPT, "+"),
        act("Blueprint: proces, CRM-gebruik en KPI's", "--sllo------", LOOPT, "+"),
        act("Rollen, gedrag en competenties", "---slo------", LOOPT, "+/-"),
        act("Stakeholders betrekken en workshops", "-slllo------", LOOPT, "+"),
        act("Klantreis vertalen naar CRM-input en funnelprocessen", "---lo-------", NIET),
      ],
    },
    {
      naam: "0-meting",
      bijnaam: "Succes meten",
      anker: "meting",
      domeinen: ["cultuur", "mens", "data", "processen"],
      rijen: [
        act("Meetmodel ontwikkelen: doelen, baten (KPI's), vermogens en inspanningen", "slo---------", LOOPT, "+/-"),
        act("Data ophalen voor het meetmodel", "--so--------", LOOPT, "-"),
        act("0-meting", "---o--------", NIET, "-"),
        act("Tussenmeting", "------so----", LOOPT),
      ],
    },
  ],
  legenda:
    "Bron: projecttijdlijn 3sides, tab v3, stand 28-09-2026: 28 onderdelen van de vier werkstromen, met start en oplevering waar 3sides die noemt. Namen in gewone taal; voortgang en status (+, +/-, -) zoals 3sides ze rapporteert. Volgorde van de werkstromen als in de plaat.",
};

// ---------- het model van 3sides naast het DIN ----------
// Links de piramide zoals 3sides hem tekent (plan van aanpak p. 2; meetinstrument p. 5),
// rechts het DIN van het programmaplan; de koppelingen laten zien wat gelijk is en wat verschuift.
const MODELVERGELIJKING: DocBlok = {
  type: "modelvergelijking",
  titel: "Het model van 3sides naast ons DIN",
  links: {
    kop: "Zo tekent 3sides het",
    sub: "Plan van aanpak p. 2–3 · meetinstrument p. 5",
    vorm: "piramide",
    lagen: [
      { id: "l-doelen", naam: "Doelen", sub: "Waartoe", kleur: "#e5dcef" },
      { id: "l-baten", naam: "Baten", sub: "Effect", kleur: "#c4f3dd" },
      { id: "l-vermogens", naam: "Vermogens", sub: "Kunnen", kleur: "#fcd6db" },
      { id: "l-inspanningen", naam: "Inspanningen", sub: "Concreet doen", kleur: "#bff0f7" },
    ],
    zijvakken: [
      { id: "z-bv", kop: "", items: ["NPS", "Conversie", "Omzetgroei"], bij: ["l-baten"], kant: "links" },
      {
        id: "z-kp",
        kop: "Vijf kernprincipes",
        items: ["Klant begrijpen", "Klantinformatie benutten", "Eigenaarschap nemen", "Data-gedreven werken", "Samenwerken rond en met de klant"],
        bij: ["l-vermogens", "l-inspanningen"],
        kant: "rechts",
      },
      {
        id: "z-ws",
        kop: "Vier werkstromen",
        items: ["Succes meten", "Blueprint klantreis", "Technologielandschap", "Adoptieframework"],
        bij: ["l-inspanningen"],
        kant: "links",
      },
    ],
  },
  rechts: {
    kop: "Zo staat het in ons DIN",
    sub: "programmaplan · DIN in de app",
    vorm: "keten",
    lagen: [
      { id: "r-doel", naam: "Doel", sub: "Integraal klantbeeld en outside-in werken", kleur: "#003366" },
      { id: "r-baten", naam: "Baten", sub: "3 sectorbaten, 14 baten-KPI's", kleur: "#0066cc" },
      { id: "r-vermogen", naam: "Vermogen", sub: "kunnen én doen, in 4 domeinen; meetlat: de vijf kernprincipes", kleur: "#0e7490" },
      { id: "r-inspanningen", naam: "Inspanningen", sub: "één per domein, plus de 0-meting over alle vier; uitgevoerd door de 4 werkstromen", kleur: "#b45309" },
    ],
    zijvakken: [],
  },
  koppelingen: [
    { van: "l-doelen", naar: "r-doel", soort: "gelijk", label: "zelfde" },
    { van: "l-baten", naar: "r-baten", soort: "gelijk", label: "zelfde 14 KPI's per sector" },
    { van: "z-bv", naar: "r-doel", soort: "voorstel", label: "organisatiebreed gemeten; NPS als resultante" },
    { van: "l-vermogens", naar: "r-vermogen", soort: "gelijk", label: "kunnen" },
    { van: "l-inspanningen", naar: "r-vermogen", soort: "verschuift", label: "doen = gedrag, hoort bij het vermogen" },
    { van: "z-kp", naar: "r-vermogen", soort: "voorstel", label: "de meetlat van het vermogen" },
    { van: "z-ws", naar: "r-inspanningen", soort: "verschuift", label: "voeren onze inspanningen uit" },
  ],
  voet: "Links de piramide zoals 3sides hem tekent (plan van aanpak p. 2); rechts het DIN van het programmaplan. Doorgetrokken lijn: gelijk. Streeplijn: verschuift naar een ander niveau. Stippellijn: voorstel van het programma.",
};

// ---------- de analyse ----------
export const DEFAULT_INTEGRATIE_3SIDES: BewerkbaarDocument = {
  titel: "Eén framework, geen nieuw wiel",
  ondertitel:
    "Klant in Zicht en 3sides in één Doelen-Inspanningennetwerk (DIN): wat er staat, hoe het model van 3sides erin past, wat de werkstromen doen, hoe we meten, wat we intern besluiten en wat we met 3sides bespreken.",
  status: "Intern Cito · voorbereiding sessie maandag 5 oktober · stand 01-10-2026",
  secties: [
    // 1
    sectie("kort", "1 · De kern: de programmastructuur staat", "", [
      callout(
        "besluit",
        "De programmastructuur staat",
        "Het programmaplan met het Doelen-Inspanningennetwerk (DIN) staat: doel, baten, een gedeeld vermogen in vier domeinen met per domein een inspanning, plus de 0-meting over alle vier, en vier werkstromen die ze uitvoeren, met op elk niveau een rol. 3sides werkt met hetzelfde framework en dezelfde vier werkstromen. We vinden het niet opnieuw uit; we maken het concreet."
      ),
      kaarten([
        kaart("Waar we staan", "stand 29-09-2026", [
          ["Sinds", "juli 2026, met 3sides als uitvoeringspartner, in vier werkstromen"],
          ["Van 3sides", "een eerste versie van het plan van aanpak per werkstroom (doel, resultaten, aanpak, planning; plan van aanpak p. 6–13), een tijdlijn (tab v3, stand 28-09) en een datapuntenlijst als werkdocument"],
          ["Nog niet af", "het plan van aanpak mist per werkstroom output-KPI, capaciteit van Cito en eigenaar, bij adoptie ook een afbakening van de scope; de 0-meting is nog niet gestart", true],
          ["In concept", "blueprint klantreis, meetinstrument 0-meting, adoptieframework, Data & Tech-plaat en praatplaten: allemaal werkdocumenten, nog niet vastgesteld", true],
          ["Les uit Klant in Beeld", "10 van de 13 respondenten vinden het doel niet behaald (evaluatie Klant in Beeld); opnieuw uitvinden herhaalt dat risico", true],
        ]),
        kaart("Wat het DIN is", "in gewone taal", [
          ["Doel", "waar we naartoe willen"],
          ["Baten", "wat de klant en Cito ervan merken; daar sturen we op, met 14 baten-KPI's"],
          ["Vermogen", "wat we daarvoor blijvend moeten kunnen, in vier domeinen"],
          ["Inspanningen", "wat we doen om dat vermogen op te bouwen; de vier werkstromen voeren ze uit (voorstel)"],
          ["Lezen", "van onder naar boven om te bouwen, van boven naar onder om te sturen"],
        ]),
        kaart("Waarom de structuur staat", "niets opnieuw uitvinden", [
          ["Vastgelegd", "doel, baten, vermogen en inspanningen in het programmaplan en het DIN; de KPI's in het KPI-model; de rollen als voorstel in het organigram"],
          ["3sides", "hetzelfde framework en dezelfde vier werkstromen; het meetinstrument opent met onze keten"],
          ["Wat wél moet", "concretiseren: wie draagt welk niveau, welke werkstroom bouwt welk deel van het vermogen, waar hangt wat 3sides oplevert", true],
        ]),
        kaart("Hoe de rollen dat oplossen", "één rol per niveau", [
          ["Per niveau", "programma-eigenaar, bateneigenaar, domeineigenaar, en per werkstroom een Cito-lead en een 3sides-lead"],
          ["Over de keten", "programmamanagement: Sanne op regie en aanspreekpunt, Pim op de inhoudelijke kaders"],
          ["Effect", "bij elk onderwerp is duidelijk wie erover gaat; er ontstaat geen tweede structuur"],
          ["Status", "voorstel in het organigram (v4), vast te stellen door de programma-eigenaar", true],
        ]),
      ]),
      tabel(
        ["Wat nu knelt", "Hoe de structuur dat oplost"],
        [
          [
            "Het is lastig concreet te maken wie wat doet, en hoe",
            "Op elk niveau een rol: bateneigenaar, domeineigenaar, en per werkstroom een Cito-lead en een 3sides-lead (deel 2)",
          ],
          [
            "Dingen overlappen, ook met projecten buiten Klant in Zicht",
            "Elk onderwerp krijgt één plek: een domein en een werkstroom. Via het vermogen hangt het aan een baat. Past het in geen domein, dan hoort het niet bij het programma",
          ],
          [
            "We doen veel tegelijk en het is niet duidelijk wat voorgaat",
            "Elk onderdeel van het werk bouwt aan een van de vier delen van het vermogen. Wat het meest bijdraagt aan het vermogensdeel dat nu nodig is, gaat voor. Bouwt iets aan geen van de vier, dan valt het buiten het programma",
          ],
          [
            "Elke sessie begint met uitleggen wat er al ligt",
            "Eén overzicht dat iedereen kent (deel 2); nieuwe mensen starten daar",
          ],
          [
            "Begrippen lopen door elkaar",
            "De woorden van het DIN; de termen van 3sides gelden als synoniem (deel 3)",
          ],
        ],
        { legenda: "Bron: programmamanagement; overleg van 29-09." }
      ),
    ]),

    // 2
    sectie(
      "framework",
      "2 · De structuur: het DIN in één overzicht, met de rollen",
      "Dit staat al. Van onder naar boven: wat we doen, wat we daarvoor moeten kunnen, wat het oplevert en waartoe. Op elk niveau staat wie het draagt. Het overzicht staat er in twee versies: zoals het nu staat, en een voorstel na het overleg van 01-10; kies de versie met de knoppen erboven.",
      [
        DIN_PLAAT,
        DIN_PLAAT_V2,
      {
        type: "stappen",
        titel: "Hoort het bij het programma? De toets voor lopend werk en voor wat uit de analyse komt (voorstel)",
        stappen: [
          { kop: "Welk deel van het vermogen, in welk domein?", tekst: "Bouwt het aan geen van de vier delen, dan valt het buiten het programma.", icoon: "domein" },
          { kop: "Welke werkstroom, en staat het in het plan van aanpak?", tekst: "Zo niet: aanvullen in het plan van aanpak, of naar de parkeerlijst.", icoon: "werkstroom" },
          { kop: "Past het in tijd en capaciteit?", tekst: "Zo niet: de programmamanager weegt af; bij afwijking van het plan besluit de stuurgroep.", icoon: "tijd" },
          { kop: "Controle via de keten: welke baat volgt?", tekst: "Dat bevestigt de plek, het bepaalt hem niet.", icoon: "baat" },
        ],
        uitkomsten: [
          { label: "Hoort erbij: opnemen of doorgaan, met domein, werkstroom en plan van aanpak", toon: "groen" },
          { label: "Parkeerlijst: de programmamanager weegt af", toon: "amber" },
          { label: "Buiten het programma: niet opnemen, of stoppen of overdragen", toon: "grijs" },
        ],
        legenda: "We toetsen twee soorten werk met dezelfde vier vragen: wat nu loopt (de onderdelen in de tijdlijn en lopende projecten buiten het programma, zoals A5) en wat uit de analyse komt, zoals het pakket vervolg-inspanningen voor 2027. Voorstel: lopend werk elke zes weken, in het ritme van de stuurgroep.",
      },
        tabel(
          ["Onderdeel", "Stand", "Toelichting"],
          [
            ["Doelen", "Staat erin", "3 programmadoelen; de baten hangen nu onder doel 1"],
            [
              "Baten en baten-KPI's",
              "Staat erin",
              "3 sectorbaten met 14 baten-KPI's (KPI-model, stap 9); startwaarden uit de 0-meting, doelwaarden in een vervolgsessie",
            ],
            ["Vermogen en domeinen", "Staat erin", "Gedeeld vermogen in 4 domeinen, met per domein één inspanning (samengevoegd uit 10 sectorinspanningen), plus de 0-meting als inspanning over alle vier (besluit 30-09)"],
            ["Werkstromen", "Staat erin", "De vier werkstromen zijn afgesproken (plan van aanpak p. 3), met per werkstroom een Cito-lead als voorstel (organigram; vast te stellen door de programma-eigenaar) en een 3sides-lead (programmateam)"],
            [
              "Rollen",
              "Deels",
              "Voorstel in het organigram (v4), vast te stellen door de programma-eigenaar; domeineigenaar Processen en Cultuur nog benoemen; bateneigenaren: de sectormanagers (besluit 01-10)",
            ],
            [
              "Plan van aanpak per werkstroom",
              "Deels",
              "3sides beschreef per werkstroom doel, resultaten, aanpak en planning (plan van aanpak p. 6–13). Wat er nog bij moet (3sides vult aan, Cito toetst en stelt vast): output-KPI en capaciteit van Cito; bij adoptie de afbakening van de scope en een voorstel voor de pilotsector, bij de 0-meting het meetprotocol per baten-KPI en een voorstel voor de eigenaar per datapunt (deel 4); eigenaren en pilotsector kiest Cito (actiebord, deel 5)",
            ],
            ["Meetmodel", "Deels", "De 14 baten-KPI's staan; vermogen- en output-KPI's volgen (deel 6); de 0-meting is nog niet gestart (oplevering oktober)"],
          ],
          {
            titel: "Staat de structuur? Stand per onderdeel",
            chipKolom: 1,
            legenda: "Bronnen: DIN in de app, KPI-model, organigram, plan van aanpak en tijdlijn van 3sides.",
          }
        ),
        tabel(
          ["Rol", "Wie", "Wat"],
          [
            ["Programma-eigenaar", "Meryl", "Geeft de opdracht en zit de stuurgroep voor"],
            [
              "Programmamanager",
              "Sanne",
              "Leidt het programma: regie, planning, capaciteit en scope; aanspreekpunt naar de programma-eigenaar en de stuurgroep",
            ],
            [
              "Programma-architect",
              "Pim",
              "Bewaakt de inhoudelijke kaders over alle vier de werkstromen; geen resultaat naar de stuurgroep zonder zijn inhoudelijke acceptatie",
            ],
            ["Bateneigenaren", "Sectormanagers PO, VO en Zakelijk", "Bewaken dat de baten komen; lid van de stuurgroep"],
            [
              "Domeineigenaren",
              "Cornelis (Data & Systemen) · Yara (Mens) · Processen en Cultuur: n.t.b.",
              "Beslist hoe het resultaat van een werkstroom in het eigen domein wordt uitgewerkt en gebruikt; zorgt dat het in de lijn landt en blijft werken; denkt mee over wie uit het domein in het team van een werkstroom meewerkt (stappenplan: inspanningsleiders en teams, met 3sides en de sectormanagers); werkt mee aan de 0-meting van het eigen domein, waarbij 3sides de stand per domein meet (stappenplan: nulmeting); schuift aan in de stuurgroep bij besluiten over het eigen domein. Is nooit tegelijk Cito-lead van een werkstroom in hetzelfde domein",
            ],
            [
              "Cito-lead per werkstroom",
              "Saila · Jama · Pim · Sanne",
              "Leidt de werkstroom namens Cito, binnen de kaders; toetst het plan van aanpak op resultaat",
            ],
            ["3sides-lead per werkstroom", "Sasja · Lammert", "Stelt het plan van aanpak op en voert het uit met het team"],
          ],
          { titel: "Wie doet wat", legenda: "Bron: organigram (stap 10, voorstel v4)." }
        ),
        lijst(
          [
            "Eén keten van doel tot werkstroom: van elk onderdeel is na te gaan waartoe het dient.",
            "Samenhang: groeperen naar vermogens in plaats van deelprogramma's houdt het programma bij elkaar; vier domeinen, één programma.",
            "Het programma bakent af, het team werkt uit: het plan van aanpak van 3sides is die uitwerking, geen nieuw kader.",
          ],
          "Waarom deze structuur logisch is (Werken aan Programma's)"
        ),
      ]
    ),

    // 3
    sectie(
      "3sides",
      "3 · 3sides naast het DIN: hetzelfde model, andere woorden",
      "Links de piramide zoals 3sides hem tekent, rechts ons DIN. Hetzelfde model; alleen een paar woorden verschuiven. Hieronder eerst dat beeld, dan het advies in één zin, en per verschil één regel met de reden.",
      [
        MODELVERGELIJKING,
        callout(
          "besluit",
          "Advies in één zin",
          "Eén model en één taal: we gebruiken de woorden van het DIN, de begrippen van 3sides zijn synoniemen, en kunnen én doen horen bij het vermogen; de werkstromen voeren de inspanningen uit."
        ),
        {
          type: "vannaar",
          titel: "Wat verschuift, en waarom",
          vanKop: "Bij 3sides",
          naarKop: "In het DIN",
          rijen: [
            {
              onderwerp: "Inspanning",
              van: "Wat medewerkers doen: gedrag per kernprincipe",
              naar: "Het werk dat een vermogen opbouwt; de werkstromen voeren het uit",
              bron: "Plan van aanpak p. 2 en 8 · meetinstrument p. 5",
              waarom: "Eén woord, één betekenis. Gedrag is wat het werk oplevert, dus het hoort bij het vermogen.",
            },
            {
              onderwerp: "Kunnen en doen",
              van: "Samen één laag, gemeten met de vijf kernprincipes",
              naar: "Allebei het vermogen; de kernprincipes zijn de meetlat",
              bron: "Plan van aanpak p. 8 · meetinstrument p. 11–12",
              waarom: "Een vermogen telt pas als je het terugziet in wat mensen doen.",
            },
            {
              onderwerp: "Label vermogens",
              van: "'Vermogens (Waartoe)'",
              naar: "Vermogens (Kunnen); waartoe hoort bij het doel",
              bron: "Meetinstrument p. 6 · plan van aanpak p. 2",
              waarom: "Zo lopen doel en vermogen niet door elkaar; 3sides gebruikt elders zelf 'Kunnen'.",
            },
            {
              onderwerp: "Werkstromen",
              van: "Vier werkstromen, los van de piramide",
              naar: "De uitvoering van de inspanningen in het DIN (voorstel)",
              bron: "Plan van aanpak p. 3 · organigram",
              waarom: "Eén structuur: elk onderdeel van het werk hangt aan een vermogen.",
            },
            {
              onderwerp: "Namen",
              van: "Blueprint klantreis · Technologielandschap · Succes meten · Adoptieframework",
              naar: "Klantreizen · Centrale datavoorziening klantcontact · 0-meting · Adoptieframework",
              bron: "Plan van aanpak p. 3 · organigram",
              waarom: "Twee namen voor hetzelfde geven verwarring; één set namen, in alle stukken (te besluiten, deel 7).",
            },
          ],
          legenda: "Vraag aan 3sides: in het meetmodel 'Vermogen: kunnen en doen' en 'Vermogens (Kunnen)' gebruiken; dan is het één model.",
        },
        lijst(
          [
            "Framework: doelen, baten, vermogens en inspanningen (plan van aanpak p. 2).",
            "Keten: het meetinstrument opent met onze drie doelen (meetinstrument p. 2).",
            "Werkstromen: dezelfde vier (plan van aanpak p. 3).",
            "Baten-KPI's: dezelfde 14 per sector (meetinstrument p. 7; KPI-model).",
            "Klantreis: het herontwerp ligt bij de sectoren (programmascope; plan van aanpak p. 10).",
            "CRM: eerst een richting als advies, dan de keuze als besluit (tijdlijn; stappenplan).",
          ],
          "Wat hetzelfde is"
        ),
        callout(
          "info",
          "De vijf kernprincipes: de meetlat van ons vermogen",
          "Vijf principes, elk met een kunnen-kant en een doen-kant, met in de 0-meting een score van 1 tot 10. Geen vijfde onderdeel van het framework, maar de meetlat van het vermogen. Kunnen en doen hieronder zijn letterlijk van 3sides; de koppeling aan ons vermogen, domein en werkstroom is ons voorstel."
        ),
        {
          type: "stroomplaat",
          titel: "Hoe hangen bouwen en meten samen? Werkstromen bouwen, kernprincipes meten (voorstel)",
          kolommen: [
            {
              kop: "Werkstromen",
              sub: "voeren de inspanningen uit; de 0-meting in alle vier domeinen",
              items: [
                { id: "ws-adoptie", naam: "Adoptieframework", kleur: "cultuur", sub: "Cultuur en Mens" },
                { id: "ws-data", naam: "Centrale datavoorziening klantcontact", kleur: "data", sub: "Data & Systemen" },
                { id: "ws-klantreizen", naam: "Klantreizen", kleur: "processen", sub: "Processen" },
                { id: "ws-meting", naam: "0-meting", kleur: "#003366", sub: "meet in alle vier domeinen" },
              ],
            },
            {
              kop: "Vermogen in vier domeinen",
              sub: "wat we blijvend moeten kunnen",
              items: [
                { id: "d-cultuur", naam: "Cultuur", kleur: "cultuur", sub: "een cultuur van eigenaarschap" },
                { id: "d-mens", naam: "Mens", kleur: "mens", sub: "getrainde medewerkers" },
                { id: "d-data", naam: "Data & Systemen", kleur: "data", sub: "CRM-fundament en betrouwbare klantdata" },
                { id: "d-processen", naam: "Processen", kleur: "processen", sub: "eenduidige funnelprocessen" },
              ],
            },
            {
              kop: "Kernprincipes",
              sub: "meten het vermogen, score 1 tot 10",
              items: [
                { id: "k-begrijpen", naam: "Klant begrijpen", kleur: "mens", sub: "kunnen en doen · Mens" },
                { id: "k-benutten", naam: "Klantinformatie benutten", kleur: "data", sub: "kunnen en doen · Data & Systemen" },
                { id: "k-eigenaarschap", naam: "Eigenaarschap nemen", kleur: "cultuur", sub: "kunnen en doen · Cultuur" },
                { id: "k-data", naam: "Data-gedreven werken", kleur: "data", sub: "kunnen en doen · Data & Systemen" },
                { id: "k-samenwerken", naam: "Samenwerken rond en met de klant", kleur: "processen", sub: "kunnen en doen · Processen" },
              ],
            },
          ],
          verbindingen: [
            ["ws-adoptie", "d-cultuur"],
            ["ws-adoptie", "d-mens"],
            ["ws-data", "d-data"],
            ["ws-klantreizen", "d-processen"],
            ["ws-meting", "d-cultuur"],
            ["ws-meting", "d-mens"],
            ["ws-meting", "d-data"],
            ["ws-meting", "d-processen"],
            ["d-mens", "k-begrijpen"],
            ["d-data", "k-benutten"],
            ["d-cultuur", "k-eigenaarschap"],
            ["d-data", "k-data"],
            ["d-processen", "k-samenwerken"],
          ],
          voet: "Lees van links naar rechts: een werkstroom voert inspanningen uit in een of meer domeinen; de 0-meting doet dat in alle vier, door het vermogen in elk domein te meten met de kernprincipes. De koppeling kernprincipe naar domein is een voorstel; de uitwerking per kernprincipe staat hieronder.",
        },
        KERNPRINCIPES,
        tabel(
          ["Wat 3sides heeft", "Hoort in het DIN bij (voorstel)", "Bron"],
          [
            ["Blueprint klantreis", "Werkstroom Klantreizen, domein Processen; voert uit: 'Standaardiseren en borgen van klantinformatieprocessen organisatiebreed'", "Plan van aanpak p. 10–11 · blueprint"],
            [
              "Technologielandschap",
              "Werkstroom Centrale datavoorziening klantcontact, domein Data & Systemen; bereidt voor: 'Implementeren en inrichten van integraal CRM-klantdashboard'",
              "Plan van aanpak p. 6–7 · Data & Tech",
            ],
            [
              "Succes meten: meetmodel, datapunten, 0-meting",
              "Werkstroom 0-meting; voert de inspanning '0-meting: meten van baten en vermogen' uit, over alle vier domeinen (besluit 30-09; stappenplan: nulmeting)",
              "Plan van aanpak p. 8–9 · meetinstrument · datapunten",
            ],
            [
              "Adoptieframework (SMILE)",
              "Werkstroom Adoptieframework, domeinen Mens en Cultuur; voert uit: 'Trainen medewerkers in klantgerichte gespreksvaardigheden' en 'Verankeren van outside-in leiderschap als rolmodel gedrag'",
              "Plan van aanpak p. 12–13 · adoptieframework",
            ],
            ["Praatplaten funnel en salesproces", "Resultaat van de werkstroom Centrale datavoorziening klantcontact", "Tijdlijn · praatplaat funnel · praatplaat proces"],
            ["Vijf kernprincipes: kunnen en doen", "Vermogen: de meetlat voor ons vermogen (hierboven)", "Meetinstrument p. 11–12"],
            ["KPI's per klantreisfase, van merkbekendheid tot renewal rate", "Vermogen: leidende indicatoren per fase (voorstel; samen met 3sides uit te werken)", "Meetinstrument p. 10 · blueprint"],
            ["Kernwaarden G.O.L.D.: gedreven, ondersteunend, lerend, deskundig", "Vermogen, domein Cultuur", "Blueprint, tab GOLD - Kernwaarden"],
            ["Vier organisatiebrede KPI's: NPS, conversie, omzet, retentie/churn", "Doel: organisatiebreed gemeten (deel 6); NPS als resultante", "Meetinstrument p. 8 · KPI-model"],
          ],
          { titel: "Waar hangt alles wat 3sides oplevert onder?" }
        ),
      ]
    ),

    // 4
    sectie(
      "werkstromen",
      "4 · De vier werkstromen: wat 3sides doet",
      "Per werkstroom het plan van aanpak van 3sides, ingepast in het DIN, met de onderdelen uit de tijdlijn en wat er nog nodig is. Waarom, resultaten en planning zijn samengevat uit het plan van aanpak; van elke werkstroom ligt een eerste versie. De plek in de keten en de inspanning in het DIN zijn van het programma.",
      [
        WERKSTROMEN,
        tekst(
          "Bron: plan van aanpak 3sides p. 6–13 (waarom, resultaten, planning) en de tijdlijn (tab v3). Plek in het DIN, leads en 'nog nodig': programma (DIN in de app, organigram). De koppeling van elke werkstroom aan een inspanning in het DIN is een voorstel."
        ),
      ]
    ),

    // 5
    sectie(
      "planning",
      "5 · Planning en voortgang: de tijdlijn als basis",
      "3sides heeft het werk van elke werkstroom opgedeeld in onderdelen: 28 in totaal, met per onderdeel de start en de oplevering, waar 3sides die noemt. Die tijdlijn is de basis: eerst de tijdlijn, daaronder het voortgangsbord dat ermee rekent, net als de werkstroomkaarten (deel 4), en als laatste wat Cito zelf doet: het actiebord. De standlijn staat op vandaag; de gegevens zijn de stand van 3sides van 28-09. Zet je een onderdeel op Afgerond, in de tijdlijn of in het bord, dan telt het bord mee. Het bord staat ook los in het tabblad Voortgang.",
      [
        TIJDLIJN,
        lijst(
          [
            "Verstreken is niet hetzelfde als niet geleverd. De tijdlijn kent geen enkel 'Afgerond'; 3sides omschrijft die kolom zelf als 'gestart, gepauzeerd of nog niet gestart' (statuspagina). Wat er per onderdeel echt ligt, staat in de tabel 'Geleverd?' hieronder, getoetst aan de oplevering die 3sides zelf in het plan van aanpak schreef.",
            "0-meting komt later dan gepland: ons stappenplan en het meetinstrument noemen Q3, het plan van aanpak Q3/Q4; de tijdlijn zet de oplevering in oktober, en de 0-meting is nog niet gestart. Het ophalen van de data (september en oktober) staat op rood. Gevolg: de startwaarden van de 14 baten-KPI's komen op zijn vroegst in oktober; de doelwaarden volgen pas in de vervolgsessie daarna.",
            "Adoptie: drie documenten, drie planningen. Stappenplan: pilot in één sector in Q3 2026, de tweede in Q4, de derde in Q1 2027. Plan van aanpak: playbooks in Q4 2026, pilots in Q1 2027. Tijdlijn: eerste sector januari en februari 2027, tweede februari en maart, derde april en mei; playbook-workshops van december 2026 tot mei 2027. Te besluiten: welke planning geldt.",
            "CRM: richting en keuze zijn twee stappen. De tijdlijn levert in november een advies over de CRM-richting; het besluit over het CRM valt volgens het stappenplan rond april 2027. Dat past, zolang het advies van november geen besluit wordt.",
            "Klantreizen: een onderdeel levert eerder op dan waar het op bouwt. De vertaling van de klantreis naar CRM-input en funnelprocessen levert op in november, maar de blueprint-onderdelen waarop die vertaling bouwt (proces, CRM-gebruik en KPI's; rollen, gedrag en competenties) leveren pas in december op. Vraag aan 3sides: klopt die volgorde?",
            "Open einden: vier onderdelen hebben geen oplevermaand (interventies, communicatieplan, adoptieframework toetsen, ambassadeurs en adoptieteam) en twee geen startmaand (de 0-meting en de vertaling van de klantreis naar CRM-input). Vraag aan 3sides om die maanden in te vullen. De tussenmeting staat op 'Loopt' terwijl de start in januari 2027 ligt (in Jira: To do); dat telt nu mee als lopend.",
          ],
          "Wat opvalt in de planning"
        ),
        tabel(
          ["Onderdeel", "Oplevering", "Geleverd?", "Afgesproken oplevering", "Wat er ligt", "Wat ontbreekt", "Actie bij"],
          [
            [
              "Klant in Beeld-klantreizen samenvoegen (Klantreizen)",
              "augustus (verstreken)",
              "Waarschijnlijk",
              "Bestaande sectorreizen samengevoegd tot één organisatiebrede klantreis (plan van aanpak p. 10)",
              "3sides meldt het zelf als gedaan: 'sectorreizen uit Klant in Beeld zijn verzameld als basis voor één organisatiebrede klantreis' (statuspagina 3sides, stand 29-09) en 'samengevoegd tot een generieke klantreis blueprint' (overleg 29-09); de blueprint bevat die ene klantreis (blueprint, tab Klantreis fasen); in Jira staat één blueprint-item op Done (plan van aanpak p. 5)",
              "Het samengevoegde materiaal zelf (Miro) is niet gedeeld, en in de tijdlijn staat het nog op 'Loopt' met status +/-",
              "3sides: bevestigen, het resultaat delen en het onderdeel op Afgerond zetten",
            ],
            [
              "Analyse van data en applicaties (Centrale datavoorziening klantcontact)",
              "september (verstreken)",
              "Nee, deels",
              "Een compleet overzicht van de huidige systemen, koppelingen, eigenaren en kosten (plan van aanpak p. 6)",
              "De Data & Tech-plaat (werkdocument, 28-09); evaluaties van het CRM-proces en het klantadviesproces afgerond (statuspagina)",
              "Eigenaren, kosten en koppelingen; 3sides zelf: 'work in progress', 'we hebben nog niet alle informatie' (statuspagina)",
              "Beide: 3sides levert het overzicht; Cito (SIO) levert de overzichten en architectuurplaten die 3sides nog niet heeft ontvangen (statuspagina)",
            ],
            [
              "Visie en consequenties (Centrale datavoorziening klantcontact)",
              "september (verstreken)",
              "Nee",
              "Een gewenst doelbeeld met een set ontwerpprincipes (plan van aanpak p. 6)",
              "Alleen losse inzichten, zoals 'het technologielandschap is complexer dan past bij de omvang van Cito' (statuspagina); geen doelbeeld in de stukken",
              "Het doelbeeld en de ontwerpprincipes; het plan van aanpak zelf zegt Q3/Q4 (p. 7), de tijdlijn september",
              "3sides: nieuwe datum en de vorm van het doelbeeld; hangt af van de analyse hierboven",
            ],
            [
              "Meetmodel ontwikkelen (0-meting)",
              "september (verstreken)",
              "Nee, deels",
              "Het meetmodel opstellen én valideren met stakeholders (plan van aanpak p. 8–9)",
              "Het concept-meetmodel als werkdocument: meetinstrument van 28-09, 16 p.",
              "De validatie; in Jira staat Succes meten nog geheel op To do (plan van aanpak p. 5)",
              "Cito: validatie met Meryl en daarna het MT inplannen (overleg 29-09); 3sides: na validatie op Afgerond zetten",
            ],
            [
              "Marketing- en salesproces en funnel (Centrale datavoorziening klantcontact)",
              "oktober",
              "Nee, deels",
              "Geen aparte oplevering in het plan van aanpak; alleen de oplevermaand oktober in de tijdlijn",
              "Twee praatplaten van 28-09, met open vragen; 'eerste versie bijna afgerond' (statuspagina)",
              "De vervolgsessie met Meryl en de definities lead, MQL en verkoopkans",
              "Beide: 3sides maakt het voorstel, Cito stelt de definities vast met Meryl en Jasper (overleg 29-09)",
            ],
            [
              "Blueprint: fasen en hoofdstappen (Klantreizen)",
              "oktober",
              "Nee, deels",
              "Blueprint gevalideerd met product- en sectormanagers (plan van aanpak p. 10)",
              "De blueprint-Excel is gevuld: 6 fasen, 11 subfasen, klantdoel en hoofdstappen (blueprint, 24-09)",
              "De validatie door product- en sectormanagers (overleg 29-09)",
              "Cito: validatie inplannen; 3sides: datum voorstellen",
            ],
            [
              "Adoptieframework opstellen (Adoptieframework)",
              "oktober",
              "Nee, deels",
              "Adoptieframework gerealiseerd en gevalideerd (plan van aanpak p. 12)",
              "Werkdocument van 15 p. (adoptieframework, 28-09); eerste opzet met Pim besproken (statuspagina 3sides, stand 29-09)",
              "De validatie en vaststelling; het adoptieframework zelf noemt 'formeel vastgesteld' als succes voor eind Q3 (adoptieframework p. 9)",
              "3sides: afronden; Cito: vaststellen",
            ],
            [
              "Data ophalen voor het meetmodel (0-meting)",
              "oktober",
              "Nee, deels",
              "De data voor de 0-meting opgehaald (plan van aanpak p. 9)",
              "De datapuntenlijst van circa 85 punten, bij 11 een naam (datapunten); alleen de jaarverslagcijfers zijn ingevuld; status rood in de tijdlijn",
              "Vrijwel alle meetwaarden en bij de meeste datapunten een eigenaar",
              "Beide: Cito wijst de data-aanleveranciers aan (actiebord), 3sides haalt op",
            ],
            [
              "0-meting (0-meting)",
              "oktober",
              "Nee, niet gestart",
              "Startwaarde per baten-KPI en een score per kernprincipe (plan van aanpak p. 8–9; meetinstrument p. 7 en 12)",
              "Niets; nergens staat een meetwaarde (meetinstrument: overal 'Nulmeting Q3')",
              "Alles; het meetmodel is nog niet gevalideerd en de data zijn nog niet opgehaald",
              "3sides: starten zodra het meetmodel is gevalideerd; Cito: de validatie (hierboven)",
            ],
          ],
          {
            titel: "Geleverd? Per onderdeel met een opleverdatum tot en met oktober",
            chipKolom: 2,
            legenda: "Oordeel op 01-10-2026, getoetst aan de oplevering die 3sides zelf in het plan van aanpak schreef: een concept telt niet als geleverd als de afspraak 'gevalideerd' of 'compleet' is. Ja = geleverd; Waarschijnlijk = 3sides meldt het als gedaan, het bewijs is er grotendeels; Nee, deels = er ligt een concept, de afspraak is niet gehaald; Nee = niets geleverd. De 19 onderdelen die later opleveren of geen opleverdatum hebben, staan niet in deze tabel. Fout in de tijdlijn: de tussenmeting staat op 'Loopt' terwijl ze pas in januari 2027 start. Bronnen: plan van aanpak, tijdlijn (stand 28-09), statuspagina (29-09 en 01-10), overleg 29-09, de werkdocumenten van 28-09.",
          }
        ),
        callout(
          "info",
          "Zo werk je de voortgang bij",
          "De voortgang wordt berekend uit de tijdlijn hierboven. Is een onderdeel ingeleverd, kies dan in het keuzelijstje bij dat onderdeel 'Afgerond', in de tijdlijn of in het voortgangsbord; dat wordt meteen bewaard. Het voortgangsbord en de werkstroomkaarten in deel 4 rekenen direct mee. Een start- of opleverdatum aanpassen doe je met het potlood bij dit deel: klik in de tijdlijn op een maand en daarna op Opslaan. Vinkjes bij 'Nog nodig' zet je gewoon aan; ook die worden meteen bewaard."
        ),
        {
          type: "voortgangsbord",
          titel: "Voortgangsbord",
          werkstromen: [
            {
              anker: "adoptie",
              naam: "Adoptieframework",
              geleverd: ["SMILE-aanpak uitgewerkt en opzet besproken met Pim", "Adoptieframework als werkdocument (PDF)"],
              nodig: [
                { tekst: "Scope afbakenen in het plan van aanpak: de aanleiding noemt de hele organisatie, per sector, team en rol, maar een eigen scope-paragraaf zoals bij de andere werkstromen ontbreekt (plan van aanpak p. 12–13)", klaar: false },
                { tekst: "Voorstel eerste pilotsector met datum, binnen de planning die Cito vaststelt (nu: stappenplan Q3, plan van aanpak Q1 2027, tijdlijn januari–februari 2027)", klaar: false },
                { tekst: "Einddatum voor communicatieplan, toetsen en ambassadeurs", klaar: false },
                { tekst: "Output-KPI's en capaciteit van Cito en HR per resultaat", klaar: false },
              ],
            },
            {
              anker: "data",
              naam: "Centrale datavoorziening klantcontact",
              geleverd: ["Praatplaten funnel en salesproces", "Data & Tech-plaat (draft)", "Eerste conclusies over de CRM-inrichting en het landschap"],
              nodig: [
                { tekst: "Advies per systeem en roadmap met kostenindicatie (resultaten plan van aanpak, Q4)", klaar: false },
                { tekst: "CRM-richting besluitklaar in november, los van de formele keuze rond april 2027", klaar: false },
                { tekst: "Voorstel voor de funneldefinities lead, MQL en verkoopkans, voor Meryl en Jasper", klaar: false },
                { tekst: "Output-KPI's en capaciteit van Cito per resultaat", klaar: false },
              ],
            },
            {
              anker: "klantreizen",
              naam: "Klantreizen",
              geleverd: ["Klant in Beeld-klantreizen samengevoegd tot één blueprint (volgens 3sides gedaan: statuspagina en overleg 29-09; in de tijdlijn nog 'Loopt')", "Blueprint draft: 6 fasen, 11 subfasen, kernwaarden en kernprincipes", "Eerste KPI's per klantfase"],
              nodig: [
                { tekst: "Bevestigen dat het samenvoegen van de Klant in Beeld-klantreizen af is, het resultaat delen en het onderdeel in de tijdlijn op 'Afgerond' zetten (statuspagina 3sides, stand 29-09, en overleg 29-09 zeggen gedaan; Jira: één blueprint-item op Done; tijdlijn: Loopt)", klaar: false },
                { tekst: "Datum voor de validatie van de blueprint met product- en sectormanagers (Q4)", klaar: false },
                { tekst: "Startmaand van de vertaling naar CRM-input en funnelprocessen", klaar: false },
                { tekst: "Meetkader van 55 KPI's: in de 0-meting alleen wat de 14 baten-KPI's en de vijf kernprincipe-scores voedt, de rest na de 0-meting (voorstel, deel 7)", klaar: false },
                { tekst: "Output-KPI's en capaciteit van Cito per resultaat", klaar: false },
              ],
            },
            {
              anker: "meting",
              naam: "0-meting",
              geleverd: ["Meetmodel-opzet met KPI's per niveau", "Meetinstrument als werkdocument (16 p.)", "Datapuntenlijst, circa 85 datapunten", "Advies over de inzet van de 0-meting"],
              nodig: [
                { tekst: "Datum voor de validatie van het meetmodel met Meryl en het MT, vóór de 0-meting", klaar: false },
                { tekst: "Meetprotocol per baten-KPI: definitie, bron, eenheid, frequentie, wie levert; eigenaar per datapunt", klaar: false },
                { tekst: "0-meting starten en in oktober opleveren: startwaarde per baten-KPI, score per kernprincipe en de stand per domein (alle vier)", klaar: false },
                { tekst: "In het meetmodel 'Vermogen: kunnen en doen' en 'Vermogens (Kunnen)' gebruiken", klaar: false },
              ],
            },
          ],
          programmabreed: [
            { tekst: "Jira-bord delen met de bredere groep (actiepunt 29-09)", klaar: false },
            { tekst: "Plan van aanpak aanvullen per werkstroom: output-KPI, benodigde capaciteit van Cito en de eigenaar die Cito aanwijst; 3sides vult aan, Cito toetst en stelt vast", klaar: false },
            { tekst: "In alle documenten de namen van de werkstromen die Cito vaststelt (voorstel: die van het organigram)", klaar: false },
            { tekst: "Projectgroepen per werkstroom in plaats van één-op-één-gesprekken", klaar: false },
          ],
          legenda: "'Nog nodig' is wat we van 3sides vragen, een voorstel van het programma; vink af wat binnen is. Wat Cito zelf doet, staat in het actiebord onder dit bord (deel 5). 'Geleverd volgens 3sides' komt van de statuspagina 3sides, stand 29-09.",
        },
      tabel(
        ["Werkstroom", "Wat Cito zelf moet doen", "Wie"],
        [
          ["Programmabreed", "Rollen laten vaststellen door de programma-eigenaar (organigram v4)", ""],
          ["Programmabreed", "Domeineigenaren Processen en Cultuur benoemen", ""],
                    ["Programmabreed", "Projectgroep per werkstroom samenstellen; capaciteit ophalen bij sector- en afdelingsmanagers", ""],
          ["Programmabreed", "Plan van aanpak per werkstroom toetsen (Cito-lead op resultaat, Pim op de kaders) en vaststellen (Sanne)", ""],
                    ["Programmabreed", "Begrippenlijst met gangbare termen (actiepunt 29-09)", ""],
          ["Programmabreed", "Rapportage van 3sides afspreken: per werkstroom de uren naast de opleveringen, en wat de 197,5 doorgeschoven uren opleveren (contract)", "Sanne"],
          ["Programmabreed", "3sides intern evalueren op de zes kaders (deel 8), in het ritme dat we maandag besluiten", ""],
          ["Programmabreed", "Overzichten en architectuurplaten van SIO aanleveren aan 3sides, of vaststellen dat ze niet bestaan (statuspagina)", ""],
          ["Programmabreed", "'Iedereen opnieuw meenemen' (stappenplan): per doelgroep bepalen wat ze horen, in welke vorm en wanneer; samen met de begrippenlijst (overleg 29-09)", ""],
          ["Adoptieframework", "Kern-adoptieteam en champions per afdeling aanwijzen, samen met 3sides (plan van aanpak p. 12; stappenplan: ambassadeurs per sector in Q4)", ""],
          ["Adoptieframework", "Eerste pilotsector kiezen", ""],
          ["Adoptieframework", "Capaciteit van HR vrijmaken voor training en coaching (tijdlijn: april tot juni 2027)", ""],
          ["Adoptieframework", "Het adoptieframework toetsen (programma-architect) en vaststellen, zodra 3sides het heeft afgemaakt", ""],
          ["Centrale datavoorziening klantcontact", "Funneldefinities (lead, MQL, verkoopkans) vaststellen met Meryl en Jasper, op basis van het voorstel van 3sides", ""],
          ["Centrale datavoorziening klantcontact", "Afstemmen met het lopende A5-project (centrale datavoorziening klantcommunicatie): wat valt binnen Klant in Zicht", ""],
          ["Centrale datavoorziening klantcontact", "Het CRM-besluit voorbereiden, rond april 2027", ""],
          ["Klantreizen", "Blueprint valideren met product- en sectormanagers", ""],
          ["Klantreizen", "Eigenaar van de blueprint na het programma aanwijzen", ""],
          ["0-meting", "Meetmodel valideren met Meryl, daarna met het MT", ""],
          ["0-meting", "Data-aanleveranciers per datapunt aanwijzen", ""],
          ["0-meting", "Vervolgsessie plannen voor de doelwaarden en de vermogen-KPI's, na de 0-meting", ""],
        ],
        {
          titel: "Wat Cito zelf moet doen",
          groepKolom: 0,
          invulKolom: 2,
          legenda: "Wie: samen in te vullen. Bronnen: overleg 29-09, organigram, stappenplan, plan van aanpak p. 10–13 en de tijdlijn. Wat we van 3sides vragen, staat in het voortgangsbord hierboven en komt op de agenda in deel 9.",
        }
      ),
      ]
    ),

    // 6
    sectie(
      "meetmodel",
      "6 · Het meetmodel: hoe we meten of het werkt",
      "De werkstroom 0-meting levert het meetmodel (plan van aanpak p. 8–9). Het beantwoordt twee vragen: wat meten we per niveau, en hoe verloopt de meting? Hoe bouwen en meten samenhangen (werkstromen bouwen, kernprincipes meten), staat in deel 3.",
      [
        {
          type: "kpiplaat",
          titel: "Wat meten we, per niveau?",
          niveaus: [
            {
              naam: "Doel",
              kleur: "doel",
              soort: "impact",
              vraag: "Is de organisatie veranderd?",
              wanneer: "Jaarlijks (voorstel)",
              groepen: [
                { titel: "Organisatiebreed gemeten; NPS meten we (besloten), als resultante; bij 3sides onder de baten", chips: ["NPS", "Conversie", "Omzet", "Retentie/churn"], toon: "voorstel" },
              ],
              bron: "Meetinstrument p. 8 · KPI-model",
            },
            {
              naam: "Baat",
              kleur: "baat",
              soort: "uitkomst",
              vraag: "Merkt de klant het?",
              wanneer: "Startwaarde uit de 0-meting (okt), doelwaarde in de vervolgsessie; tussenmeting jan–feb 2027",
              groepen: [
                { titel: "Zakelijk: sterkere klantgerichtheid bij opdrachtgevers en kandidaten", chips: ["Funnel-conversieratio per stap", "Offertes: aantal en % dat opdracht wordt", "Conversie uit bezoeken", "Serviceniveau en reactietijden", "Churn / klantbehoud"], toon: "" },
                { titel: "PO: intensiever partnership", chips: ["Groei productgebruik (cross- en upsell)", "Gebruiksintensiteit volledige lijn", "Raamcontracten grote besturen", "Ontwikkeldeadlines en beloftes gehaald", "Churn / klantbehoud"], toon: "" },
                { titel: "VO: hogere voorspelbaarheid commerciële begroting", chips: ["Prognose-nauwkeurigheid", "% meerjarige (3-jr) licenties", "Inzicht in toetskeuzemomenten", "Churn / klantbehoud"], toon: "" },
              ],
              bron: "KPI-model (stap 9) · meetinstrument p. 7. Bateneigenaren: de sectormanagers",
            },
            {
              naam: "Vermogen",
              kleur: "vermogen",
              soort: "leidend",
              vraag: "Kunnen we het nu?",
              wanneer: "0-meting (okt) en tussenmeting (jan–feb 2027)",
              groepen: [
                { titel: "Vijf kernprincipes, elk één score van 1 tot 10 (kunnen en doen samen)", chips: ["Klant begrijpen", "Klantinformatie benutten", "Eigenaarschap nemen", "Data-gedreven werken", "Samenwerken rond en met de klant"], toon: "" },
                { titel: "Stand per domein, van huidige naar gewenste situatie", chips: ["Cultuur", "Mens", "Data & Systemen", "Processen"], toon: "" },
                { titel: "Verdere indicatoren per domein, na de 0-meting", chips: ["Te bepalen in de vervolgsessie"], toon: "voorstel" },
              ],
              bron: "Meetinstrument p. 11–12 · stappenplan · KPI-sessie",
            },
            {
              naam: "Inspanning",
              kleur: "inspanning",
              soort: "output",
              vraag: "Hebben we het gedaan? Per werkstroom: is het resultaat opgeleverd?",
              wanneer: "Doorlopend, via de tijdlijn en het voortgangsbord (deel 5)",
              groepen: [
                { titel: "Werkstroom Klantreizen", chips: ["Blueprint geaccepteerd", "Funnelprocessen vastgesteld", "Customer Success-proces beschreven"], toon: "" },
                { titel: "Werkstroom Centrale datavoorziening klantcontact", chips: ["Inventarisatie af", "Advies behouden/vervangen/loslaten opgeleverd", "Richting CRM besluitklaar"], toon: "" },
                { titel: "Werkstroom 0-meting", chips: ["Elke baten-KPI compleet (definitie, bron, startwaarde)", "Stand per domein opgeleverd", "Advies opgeleverd"], toon: "" },
                { titel: "Werkstroom Adoptieframework", chips: ["Framework vastgesteld", "Pilot gestart", "Eerste gedragsdata", "Ambassadeurs aangehaakt"], toon: "" },
              ],
              bron: "Organigram (stap 10): tot nu toe besproken; definitief uit het plan van aanpak, 3sides vult aan",
            },
          ],
          legenda: "Baten-KPI's zijn de stuurlaag. Vermogen-KPI's zijn leidend: ze bewegen als eerste. Werkstroom-KPI's zeggen of het resultaat er is, opgeleverd ja of nee. Voorstel: de plek van het organisatiebrede beeld op doelniveau en de meetfrequentie van het doel.",
        },
        tabel(
          ["Stap", "Wat", "Wanneer", "Bron"],
          [
            ["Meetmodel ontwikkelen", "Doelen, baten, vermogens en inspanningen", "jul–sep; loopt, status +/-", "Tijdlijn"],
            ["Meetmodel valideren", "Met Meryl als opdrachtgever, daarna met het MT", "Te bepalen", "Overleg 29-09"],
            ["Data ophalen", "Circa 85 datapunten, deels met eigenaar", "sep–okt; loopt, status -", "Tijdlijn · datapunten"],
            ["0-meting", "Startwaarde per baten-KPI, een score per kernprincipe en de stand per domein", "Oplevering okt; nog niet gestart", "Tijdlijn · plan van aanpak p. 8–9"],
            ["Doelwaarden vaststellen", "In een vervolgsessie, na de 0-meting", "Te bepalen", "Meetinstrument p. 7"],
            ["Tussenmeting", "Voortgang evalueren en bijsturen", "jan–feb 2027", "Tijdlijn · plan van aanpak p. 8–9"],
            [
              "Dashboard",
              "Organisatiebrede KPI's, KPI's in de klantreis, KPI's per kernprincipe en de kernprincipe-scores",
              "Te bepalen",
              "Meetinstrument p. 16",
            ],
          ],
          {
            titel: "Hoe verloopt de meting?",
            legenda: "De stappen en maanden komen uit de tijdlijn (tab v3); de aanpak uit het plan van aanpak p. 9 (inventariseren, analyseren, ontwerpen, uitvoeren) zit daarin verwerkt; de validatie met Meryl en het MT uit het overleg van 29-09; de vervolgsessie en het dashboard uit het meetinstrument p. 7 en p. 16.",
          }
        ),
      ]
    ),

    // 7
    sectie(
      "verder",
      "7 · Eerst intern: wat we zelf besluiten",
      "Eerst besluiten we intern, met de verschillen als onderbouwing; wat Cito zelf doet, staat in het actiebord (deel 5). Daarna evalueren we 3sides intern (deel 8), en dan volgt het gesprek met 3sides (deel 9).",
      [
        lijst(
          [
            "Framework: het DIN blijft het enige framework; de termen van 3sides zijn synoniemen (deel 3).",
            "Woorden: inspanning = de inspanningen in het DIN, uitgevoerd door de werkstromen; kunnen en doen horen bij het vermogen (deel 3).",
            "0-meting: een inspanning over alle vier domeinen, naast de vier domeininspanningen (besluit programma-architect, 30-09; ter bevestiging).",
            "Meten: de 14 baten-KPI's zijn de stuurlaag, de kernprincipe-scores de meetlat voor het vermogen; NPS meten we organisatiebreed (besloten), als resultante en niet als stuur-KPI (deel 6).",
            "Vermogen-KPI's: per domein vaststellen waar we naartoe willen (gewenste situatie) en per kernprincipe de doelscore, in de vervolgsessie na de 0-meting.",
            "Plan van aanpak: per werkstroom finaliseren, met output-KPI en de benodigde capaciteit van Cito; 3sides vult aan, Cito toetst, stelt vast en wijst de eigenaar aan (deel 4).",
            "Rollen: per werkstroom wie leidt en wie na het programma eigenaar is; domeineigenaren Processen en Cultuur benoemen; bateneigenaren zijn de sectormanagers (besluit programma-architect, 01-10; ter bevestiging).",
            "Planning: de verschuiving van pilot en 0-meting vaststellen (deel 5).",
            "Namen: één set namen voor de vier werkstromen; voorstel: die van het organigram (leidend).",
            "Evaluatie van 3sides: intern, op zes kaders (deel 8); besluiten wanneer en hoe vaak (voorstel: elke zes weken).",
          ],
          "Besluitpunten voor maandag (intern)"
        ),
        tabel(
          ["Onderwerp", "Wij", "3sides", "Voorstel", "Bron"],
          [
            [
              "Namen van de werkstromen",
              "Klantreizen · Centrale datavoorziening klantcontact · 0-meting · Adoptieframework",
              "Blueprint klantreis · Technologielandschap · Succes meten · Adoptieframework",
              "Eén set namen: die van het organigram (voorstel)",
              "Organigram · plan van aanpak p. 3",
            ],
            [
              "Omvang van het meetkader",
              "14 baten-KPI's",
              "55 KPI's in het KPI-meetkader en circa 85 datapunten",
              "Focus op de 14 baten-KPI's en de vijf kernprincipe-scores. Aan 3sides melden: er komen KPI's bij op vermogensniveau (na de 0-meting, in de vervolgsessie) en per werkstroom (output: resultaat opgeleverd). De rest van het meetkader later.",
              "Blueprint, tab KPI meetkader · datapunten",
            ],
            [
              "Eigenaarschap per werkstroom",
              "Een Cito-lead per werkstroom",
              "Plan van aanpak noemt geen eigenaar; statuspagina: Saila beoogd eigenaar van blueprint én adoptie",
              "Per werkstroom vastleggen wie leidt en wie na het programma eigenaar is",
              "Organigram · statuspagina",
            ],
            [
              "Planning",
              "Stappenplan: pilot in één sector en 0-meting in Q3 2026",
              "Plan van aanpak en meetinstrument: 0-meting Q3 of Q3/Q4 2026. Tijdlijn: 0-meting oplevering okt, nog niet gestart; 1e sector jan–feb 2027",
              "Eén planning; de verschuiving expliciet vaststellen",
              "Stappenplan · plan van aanpak p. 9 · meetinstrument p. 7 · tijdlijn",
            ],
          ],
          { titel: "Waar het programma en 3sides nog verschillen: de onderbouwing van de besluiten" }
        ),
      ]
    ),

    // 8
    sectie(
      "evaluatie",
      "8 · Evaluatie van 3sides: intern, op zes kaders",
      "Voor onze eigen evaluatie, niet voor het gesprek met 3sides. Zes kaders, elk uit wat we met 3sides hebben afgesproken (plan van aanpak, statuspagina, adoptieframework) en uit ons programmaplan en stappenplan: wat we toetsen, de afspraak, wat we zien (met bron), een eerste beeld als voorstel en bij wie de actie ligt: 3sides, Cito of beide. De evaluatie werkt op het niveau van de inspanningen: per onderdeel is de maat 'opgeleverd: ja of nee' (output), niet of de baat al zichtbaar is. Zwart-wit waar het kan; 'waarschijnlijk' alleen met de reden erbij en wat ontbreekt om zeker te zijn. Stand: 01-10-2026, op de tijdlijn en werkdocumenten van 28-09, het overleg van 29-09, de statuspagina 3sides, stand 29-09 en 01-10, de evaluatie van Klant in Beeld (13 respondenten, september) en de waarnemingen vanuit het programma rond het overleg van 29-09, als waarneming gelabeld.",
      [
        callout(
          "info",
          "Zo gebruiken we de evaluatie",
          "Intern: het eerste beeld per kader is een voorstel, het oordeel vullen we zelf in. Het maandelijkse gesprek met 3sides kijkt vooruit: we hebben alles gelezen, dit zijn de actiepunten, hoe pakken we ze op (deel 9). Maatstaf: de oplevering die 3sides zelf in het plan van aanpak schreef; een concept telt niet als geleverd als de afspraak 'gevalideerd' of 'compleet' is. Wat Cito moet doen staat op één plek, het actiebord (deel 5); hier staat alleen bij wie de actie ligt. Waarnemingen vanuit het programma staan erin als waarneming, niet als feit; wat in geen enkel stuk staat, staat als 'in te vullen'. Nog te besluiten: wanneer we de evaluatie doen en hoe vaak (voorstel: elke zes weken, in het ritme van de stuurgroep) en wie het oordeel invult (voorstel: programmamanagement, Sanne en Pim)."
        ),
        {
          type: "evaluatie",
          titel: "",
          intro: "",
          kaders: [
            {
              id: "levert",
              titel: "1 · Levert 3sides wat is afgesproken?",
              ondertitel: "de negen onderdelen met een oplevering tot en met oktober, getoetst aan het plan van aanpak",
              vraag: "Per onderdeel uit de tijdlijn met een oplevermaand tot en met oktober: is de oplevering uit het plan van aanpak er, ja of nee? Vier onderdelen zijn verstreken (augustus en september), vijf leveren in oktober op.",
              beeld: "Nee, deels: 3sides heeft in het derde kwartaal per werkstroom een concept geleverd, maar geen enkel onderdeel is af in de zin van het eigen plan van aanpak; ook de twee opleveringen van september zonder validatiestap, de analyse en het doelbeeld, zijn niet af",
              actieBij: "3sides en Cito",
              secties: [
                { label: "Afspraak (bron)", tekst: "De oplevering per werkstroom staat in het plan van aanpak (p. 6, 8, 10 en 12), de maand per onderdeel in de tijdlijn (tab v3, stand 28-09). 3sides noemt vier van de vijf eerste deliverables van juli tot en met september zelf 'draft' (blueprint klantreis, meetplan met 0-metingdefinities, praatplaat funnel, praatplaat technologielandschap); de vijfde heet 'adoptieplan' (statuspagina 3sides, stand 01-10)." },
                { label: "1 · Klant in Beeld-klantreizen samenvoegen · augustus, verstreken", tekst: "Waarschijnlijk. Afspraak: de sectorreizen uit Klant in Beeld samengevoegd tot één integrale Cito-klantreis (plan van aanpak p. 10). Bewijs: 3sides meldt het als gedaan ('bestaande sectorreizen uit Klant in Beeld zijn verzameld als basis voor één organisatiebrede klantreis', statuspagina 3sides, stand 29-09; 'samengevoegd tot een generieke klantreis blueprint', overleg 29-09), de blueprint bevat die ene reis (blueprint, tab Klantreis fasen, 24-09) en in Jira staat één blueprint-item op Done (plan van aanpak p. 5). Waarom geen 'ja': het samengevoegde werkdocument (Miro) is niet gedeeld, 3sides heeft het niet als afgerond bevestigd en de tijdlijn zegt 'Loopt' met status +/- (stand 28-09). Om zeker te zijn: bevestiging van 3sides en het resultaat." },
                { label: "2 · Analyse van data en applicaties · september, verstreken", tekst: "Nee, deels. Afspraak: 'een compleet overzicht van de huidige systemen, koppelingen, eigenaren en kosten' (plan van aanpak p. 6), via lijsten, werksessies met eigenaren en gebruikers en het verzamelen van kosten en contracten (p. 7). Ligt er: de Data & Tech-plaat als werkdocument (28-09) zonder eigenaren, kosten en koppelingen; de evaluatie van het klantadviesproces is afgerond en de eerste evaluatie van het CRM-proces ook (statuspagina 3sides, stand 01-10). 3sides zelf: 'Work-In-Progress en wordt continue bijgewerkt', 'we hebben nog niet alle informatie die we nodig hebben' (statuspagina 3sides, stand 01-10); op de town hall van 22-09 zette 3sides het afronden van de inventarisatie in 'de komende 90 dagen' (BV-dag p. 9). Blokkade volgens 3sides: 'tot nu toe geen overzicht of requirementsdocumenten of architectuurplaten ontvangen van SIO' (statuspagina 3sides, stand 01-10)." },
                { label: "3 · Visie en consequenties · september, verstreken", tekst: "Nee. Afspraak: 'een gewenst doelbeeld met een set ontwerpprincipes' (plan van aanpak p. 6). Ligt er: geen doelbeeld en geen ontwerpprincipes in de stukken (bevestigd 01-10); wel losse inzichten ('het technologielandschap is complexer dan past bij de omvang van Cito', 'er is geen platform of architectuurteam dat de integratie bewaakt') en de opmerking dat de doelarchitectuur nog bepaald moet worden (statuspagina 3sides, stand 01-10). Datum: de tijdlijn zegt september, het plan van aanpak zelf 'Q3/Q4: ontwikkelen doelbeeld en keuzes' (p. 7): volgens het eigen plan heeft 3sides nog Q4. In Jira: In Progress (plan van aanpak p. 5)." },
                { label: "4 · Meetmodel ontwikkelen · september, verstreken", tekst: "Nee, deels. Afspraak: 'een compleet overzicht van het meetmodel: doelen, baten, vermogens en inspanningen' (plan van aanpak p. 8), opgesteld én gevalideerd met stakeholders (p. 9). Ligt er: het concept als werkdocument van 16 p. (meetinstrument, 28-09): meetmodel p. 5, KPI's per niveau p. 6–11, scores per kernprincipe p. 12; op de statuspagina 'draft meetplan + 0 meeting definities' (01-10). Ontbreekt: de validatie. 3sides: 'stakeholders worden nu meegenomen om te valideren en buy-in te krijgen, dit gebeurt in de komende maand' (statuspagina 3sides, stand 29-09); actiepunt 'meetmodel valideren met Meryl als opdrachtgever en daarna met het MT' (overleg 29-09). In Jira staat Succes meten geheel op To do (plan van aanpak p. 5)." },
                { label: "5 · Marketing- en salesproces en funnel · oktober", tekst: "Nee, deels; de oplevermaand loopt nog. Afspraak: oplevering in oktober (tijdlijn); het plan van aanpak noemt geen aparte oplevering voor funnel en salesproces (p. 6 noemt vijf resultaten, zonder funnel), dus wat hier 'geleverd' is, is niet vastgelegd. Ligt er: twee praatplaten van 28-09, de praatplaat funnel met een blok 'Nog afstemmen' en de praatplaat proces met open vragen; 'klant funnel + processen, eerste versie bijna afgerond', 'vervolg sessie staat nog gepland' (statuspagina 3sides, stand 01-10). Ontbreekt: de vervolgsessie met Meryl en de definities van lead, marketing qualified lead en verkoopkans, die bij Cito nog niet uniform zijn (overleg 29-09)." },
                { label: "6 · Blueprint: fasen en hoofdstappen · oktober", tekst: "Nee, deels; de oplevermaand loopt nog. Afspraak: een compleet matrixoverzicht van fasen, klantdoelen, hoofdstappen, kernwaarden en kernprincipes, 'gevalideerd door product managers en sector managers' (plan van aanpak p. 10). Ligt er: de blueprint met 6 fasen, 11 subfasen, klantdoel en hoofdstappen (blueprint, tab Klantreis fasen, 24-09); 'de eerste versie van de fasen en stappen in de klantreis is vastgelegd' (statuspagina 3sides, stand 29-09). Ontbreekt: de validatie; actiepunt 'blueprint klantreis valideren met productmanagers en sectormanagers' (overleg 29-09)." },
                { label: "7 · Data ophalen voor het meetmodel · oktober", tekst: "Nee, deels; de oplevermaand loopt nog, status rood. Afspraak: 'gedetailleerde data punten verzameling (data ophalen)' (plan van aanpak p. 8), via werksessies met eigenaren en gebruikers (p. 9). Ligt er: de datapuntenlijst van circa 85 datapunten met eenheid, bij 11 een naam, en bij 8 van de 14 baten-KPI's een naam (Ilse 7×, Famke 1×) (datapunten, 24-09); alleen de jaarverslagcijfers hebben waarden, verder geen enkele meetwaarde. 'Eerste datapunten opgehaald (NPS)', 'met Sanne data overzicht gedeeld nodig voor 0-meting' (statuspagina 3sides, stand 29-09). In de tijdlijn staat dit onderdeel op '-' zonder toelichting wat er vastzit (stand 28-09)." },
                { label: "8 · 0-meting · oktober", tekst: "Nee: niet gestart. Afspraak: een 0-meting op de programma-KPI's, de baten-KPI's per sector en voor de BV en de klantreis-KPI's binnen de vijf kernprincipes (plan van aanpak p. 8–9), 'Q3/Q4 2026: 0-meting gerealiseerd' (p. 9). Ons stappenplan (19-08) en het meetinstrument zeggen Q3 ('Nulmeting Q3' als startwaarde bij elke KPI, meetinstrument p. 7); het adoptieframework noemt als succes voor eind Q3 'een volledige nulmeting beschikbaar voor mens, proces, data en cultuur' (adoptieframework p. 9). Ligt er: geen enkele meetwaarde in de stukken. Tijdlijn: 'Niet gestart', status '-', oplevering oktober, geen startmaand (stand 28-09). Op de town hall van 22-09 zette 3sides bij 'de komende 90 dagen' alleen '0 meting: we bepalen de cijfers waarop we gaan meten' (BV-dag p. 9): eerst nog de cijfers bepalen, dan pas meten." },
                { label: "9 · Adoptieframework opstellen · oktober", tekst: "Nee, deels; de oplevermaand loopt nog. Afspraak: 'adoptieframework gerealiseerd en gevalideerd' (plan van aanpak p. 12); het framework zelf noemt 'formeel vastgesteld' als succes voor eind Q3 (adoptieframework p. 9). Ligt er: het werkdocument van 15 p. (adoptieframework, 28-09; voorblad 'Augustus 2025'); 'adoptieplan' bij de eerste deliverables (statuspagina 3sides, stand 01-10); 'eerste opzet adoptieframework met Pim besproken' (statuspagina 3sides, stand 29-09). Ontbreekt: de validatie en vaststelling, en een scope-paragraaf zoals bij de andere werkstromen (plan van aanpak p. 12–13; deel 4). De inhoudelijke toets van het framework staat in kader 5." },
                { label: "Telling", tekst: "Negen onderdelen: 0 × ja, 1 × waarschijnlijk (1), 6 × nee deels (2, 4, 5, 6, 7, 9), 2 × nee (3; 8 niet gestart). Van de vier verstreken onderdelen: 1 waarschijnlijk, 2 nee deels, 1 nee. Van de vijf oktober-onderdelen: 4 × een concept zonder validatie, 1 × niet gestart. Geen enkel concept is gevalideerd of vastgesteld. De 19 onderdelen die later opleveren of geen oplevermaand hebben, zijn hier niet beoordeeld (zie deel 5)." },
                { label: "Actie bij", tekst: "Per onderdeel in kader 6. In één zin: de validaties, de SIO-stukken en de data liggen bij Cito; de analyse, het doelbeeld, de datums en de statussen bij 3sides." },
              ],
              oordeel: "",
              notitie: "",
            },
            {
              id: "tempo",
              titel: "2 · Houdt 3sides het tempo?",
              ondertitel: "uren, opleverdata en verschuivingen",
              vraag: "Houdt 3sides het tempo dat Cito expliciet heeft gevraagd: worden de uren gemaakt, komen de onderdelen op de afgesproken maand af, en blijven de datums staan of schuiven ze?",
              beeld: "Deels: het team is beschikbaar en maakt de uren (augustus uitgezonderd), maar de opleveringen schuiven een tot twee kwartalen (0-meting: Q3 naar oktober; pilot: Q3 naar januari 2027), 3sides noemt in eigen stukken drie verschillende kwartalen voor de pilot en stelt de tijdlijn niet bij; een deel van de vertraging zit bij Cito, in de validaties",
              actieBij: "3sides en Cito",
              secties: [
                { label: "Afspraak (bron)", tekst: "Cito heeft 3sides 'expliciet gevraagd om het tempo erin te houden', omdat projecten bij Cito soms lang doorlopen (les uit Klant in Beeld); daarom '3sides as a service': het team blijft beschikbaar en het risico op vertraging wordt beperkt (statuspagina). Budget 232 uur per maand (statuspagina 3sides, stand 29-09). Oplevermaand per onderdeel in de tijdlijn (tab v3); planning per kwartaal in het plan van aanpak (p. 7, 9, 11 en 13)." },
                { label: "Uren (bron)", tekst: "Juli 186,5 van 232 uur (80%), augustus 80 (34%; vakanties en afwezigheid van Pim, Meryl, Sanne, Sasja, Lammert en Ericka), september 226,75 tot en met 25-09 (98%); samen 493,25 van 696 uur, 71% (statuspagina 3sides, stand 29-09; percentages berekend). De 197,5 niet-gebruikte uren schuiven door naar de komende maanden (statuspagina 3sides, stand 29-09); wat ze opleveren staat nergens. De uren staan per maand, niet per werkstroom." },
                { label: "Opleverdata (bron)", tekst: "Vier van de negen onderdelen met een oplevering tot en met oktober zijn over tijd (augustus: samenvoegen; september: analyse, visie, meetmodel); de tijdlijn van 28-09 houdt die maanden als oplevering, zonder nieuwe datum, en de statuspagina 3sides, stand 01-10 noemt ook geen nieuwe datum. Daartegenover: twee onderdelen zijn eerder gestart dan gepland (rollen, gedrag en competenties; adoptieframework toetsen: start oktober, al 'Loopt'; tijdlijn). Vier onderdelen hebben geen oplevermaand en twee geen startmaand (deel 5)." },
                { label: "Verschuivingen (bron)", tekst: "0-meting: Q3 in ons stappenplan (19-08), in het meetinstrument ('Nulmeting Q3', p. 7) en in het adoptieframework (succes eind Q3, p. 9); 'Q3/Q4' in het plan van aanpak (p. 9); oktober in de tijdlijn, niet gestart. Eerste pilot: Q3 2026 in ons stappenplan en in het adoptieframework (p. 9); Q4 2026 in het plan van aanpak ('blueprint gevalideerd en toegepast binnen eerste pilotgroep', p. 11) en in het adoptieframework ('Pilot Start Q4', p. 10); Q1 2027 in hetzelfde plan van aanpak (p. 13) en januari–februari 2027 in de tijdlijn. Technologielandschap: september voor de analyse in de tijdlijn, maar op de town hall van 22-09 'de komende 90 dagen' voor het afronden van de inventarisatie (BV-dag p. 9)." },
                { label: "Actie bij", tekst: "3sides: per verstreken onderdeel een nieuwe datum en de oplevering in de tijdlijn; per werkstroom zeggen wat de 197,5 doorgeschoven uren opleveren (via Sanne, actiebord). Cito: één planning voor 0-meting en pilots vaststellen (besluitpunt, deel 7) en de validaties inplannen die de opleveringen tegenhouden (kader 6)." },
              ],
              oordeel: "",
              notitie: "",
            },
            {
              id: "rapportage",
              titel: "3 · Rapporteert 3sides zoals afgesproken?",
              ondertitel: "tijdlijn, Jira, statuspagina en de dinsdag",
              vraag: "Rapporteert 3sides zoals afgesproken, en kunnen we uit de rapportage lezen wat af is, wat vastzit en waarom?",
              beeld: "Deels: de instrumenten zijn er en worden gevuld, maar ze spreken elkaar tegen en 'Afgerond' wordt niet gebruikt; uit de rapportage is niet te lezen wat af is en wat vastzit",
              actieBij: "3sides en Cito",
              secties: [
                { label: "Afspraak (bron)", tekst: "Afgesproken met Sanne en Pim (statuspagina): wekelijks rapporteren met een Excel van stromen en activiteiten, per activiteit 'gestart, gepauzeerd of nog niet gestart', plus een status om impediments zo vroeg mogelijk te zien; Jira voor de eigen taken; elke dinsdag bij Cito aanwezig." },
                { label: "Tijdlijn (bron)", tekst: "Het bestand is aangemaakt op 18-09 en gewijzigd op 28-09 (bestandsgegevens tijdlijn); we hebben één stand; of er sinds juli wekelijks is gerapporteerd, blijkt niet uit de stukken: in te vullen (Sanne). De kolom Progress kent 'In progress', 'Not started' en 'Completed' (legenda); 'gepauzeerd' bestaat er niet en 'Completed' is bij 0 van 28 onderdelen gebruikt (17 × In progress, 11 × Not started). De kolom Status kent +, +/- en - zonder omschrijving: 8 × +, 7 × +/-, 2 × - (data ophalen, 0-meting), nergens een toelichting wat er vastzit; de blokkade bij de analyse (geen stukken van SIO) staat op de statuspagina, in de tijdlijn staat de analyse op +/-. 'Tussenmeting' staat op 'In progress' terwijl de start in januari 2027 ligt en Jira het hele onderdeel op To do heeft: vermoedelijk een invoerfout." },
                { label: "Jira en statuspagina (bron)", tekst: "Jira kennen we alleen als schermafdruk van 29-09 (plan van aanpak p. 5); delen met de bredere groep is een actiepunt (overleg 29-09). Jira en tijdlijn, allebei van 3sides, spreken elkaar tegen: Succes meten in Jira geheel op To do, in de tijdlijn drie onderdelen 'In progress'; integratie-aanpak in Jira To do, in de tijdlijn 'In progress'; één blueprint-item in Jira op Done, in de tijdlijn geen enkel 'Completed'; adoptie in Jira één item in uitvoering, in de tijdlijn twee (plan van aanpak p. 5; tijdlijn). De statuspagina wordt bijgehouden (tussen 29-09 en 01-10 kwamen de kick-off voor het MT van 9 juli en de datum van de town hall erbij) en benoemt impediments wel, maar geeft geen nieuwe datum voor de vier verstreken onderdelen. Uren: per maand, niet per werkstroom; 232 min 80 staat er als 151, het totaal van 197,5 klopt wel (statuspagina 3sides, stand 29-09)." },
                { label: "Dinsdag (bron)", tekst: "Of 3sides elke dinsdag aanwezig is, is uit de stukken niet te toetsen; het overleg van 29-09 plant een voorbereiding op maandag (11:00–12:00) naast de bestaande dinsdag. In te vullen (Sanne en Pim)." },
                { label: "Actie bij", tekst: "3sides: 'Afgerond' zetten zodra een onderdeel af is, de tussenmeting corrigeren, Jira en tijdlijn gelijktrekken, bij elke - en +/- zeggen wat vastzit, bij een verstreken onderdeel een nieuwe datum, en de uren per werkstroom naast de opleveringen. Cito (Sanne): de rapportage-afspraak zo vastleggen: wekelijks de tijdlijn, met 'Afgerond' waar het af is, een toelichting bij elke - en +/-, een nieuwe datum bij een verstreken onderdeel en de uren per werkstroom (actiebord)." },
              ],
              oordeel: "",
              notitie: "",
            },
            {
              id: "din",
              titel: "4 · Sluit het aan op het DIN en ligt het eigenaarschap bij Cito?",
              ondertitel: "één model, één taal, eigenaarschap in de werkstromen",
              vraag: "Werkt 3sides in het ene framework van het programma, het DIN, met één taal; en werkt 3sides zó met de Cito-mensen in de werkstromen dat kennis en eigenaarschap bij Cito landen: Cito bepaalt, 3sides levert. Het meenemen van de organisatie daarbuiten, de teams en rollen die anders moeten gaan werken, staat in kader 5.",
              beeld: "Deels: het model sluit aan, met verschillen in taal; de samenwerking is intensief maar één-op-één, zonder projectgroepen en zonder vastgestelde Cito-lead per werkstroom, dus het eigenaarschap ligt nog niet bij Cito",
              actieBij: "3sides en Cito",
              secties: [
                { label: "Afspraak (bron)", tekst: "Het plan van aanpak zet dezelfde vier niveaus in, doelen, baten, vermogens en inspanningen (p. 2), en dezelfde vier werkstromen (p. 3); de blueprint wordt 'gedragen door de product managers en sector managers' (p. 10). Overleg 29-09: projectgroepen per werkstroom, het Jira-bord delen met de bredere groep, de onderbouwing van keuzes vastleggen op één A4. Statuspagina: elke dinsdag bij Cito." },
                { label: "Model en taal (bron)", tekst: "Hetzelfde: de vier niveaus (plan van aanpak p. 2), onze drie doelen als vertrekpunt (meetinstrument p. 2), de 14 baten-KPI's per sector (meetinstrument p. 7). Anders: 'inspanning' is bij 3sides het concrete doen, gedrag (plan van aanpak p. 2; meetinstrument p. 5), in het DIN het werk van de werkstromen; de vermogens heten 'Waartoe' op meetinstrument p. 6 en 'Kunnen' op p. 5; de vier organisatiebrede KPI's (NPS, conversie, omzet, retentie) staan bij 3sides als baten (meetinstrument p. 8), bij ons op doelniveau als resultante (besloten; deel 3); de werkstromen hebben twee sets namen (deel 3; besluitpunt deel 7). Het advies van 3sides om de 0-meting ook op vermogens en inspanningen te doen (statuspagina 3sides, stand 29-09) past bij ons besluit: de 0-meting is één inspanning over alle vier domeinen." },
                { label: "Samenwerking (bron)", tekst: "Veel gesprekken: negen namen bij de klantreis, negen bij het technologielandschap, Sanne, Meryl en Saila bij het meten, Pim bij adoptie (statuspagina 3sides, stand 29-09); vaste momenten: dinsdag bij Cito (statuspagina), een wekelijks klantreisoverleg met Saila, Pim en Sasja (statuspagina 3sides, stand 29-09) en een wekelijks technologielandschap-overleg met Ericka en Cornelis (overleg 29-09). Maar: 'gesprekken voornamelijk individueel gevoerd; behoefte aan formele projectgroepen per werkstroom' en 'veel kennis zit bij losse individuen binnen Cito zonder gezamenlijk overzicht' (overleg 29-09). Eigenaarschap: het plan van aanpak noemt geen Cito-eigenaar per werkstroom; de statuspagina noemt Saila als beoogd eigenaar van blueprint én adoptie; de Cito-leads per werkstroom staan in het organigram als voorstel (Saila, Jama, Pim, Sanne) en zijn nog niet vastgesteld (actiebord: rollen laten vaststellen door de programma-eigenaar). De validaties door product- en sectormanagers, Meryl en het MT zijn nog niet gedaan (kader 1), dus 'gedragen door' is nog niet waar." },
                { label: "Actie bij", tekst: "3sides: in het meetmodel 'Vermogen: kunnen en doen' en 'Vermogens (Kunnen)' gebruiken, één set namen in alle stukken, het Jira-bord delen, keuzes onderbouwen op één A4 (overleg 29-09). Cito: de Cito-leads per werkstroom laten vaststellen (organigram; actiebord), een projectgroep samenstellen met capaciteit van sector- en afdelingsmanagers (actiepunt 29-09; actiebord) en de werkstroomnamen vaststellen (besluitpunt, deel 7)." },
              ],
              oordeel: "",
              notitie: "",
            },
            {
              id: "mensen",
              titel: "5 · Neemt 3sides de medewerkers van Cito mee in de verandering?",
              ondertitel: "kunnen ze het, en doen ze het tot nu toe",
              vraag: "Neemt 3sides de medewerkers van Cito mee: kunnen ze het (vakmanschap in verandering: een aanpak die bij Cito past en die ze kunnen uitvoeren) en doen ze het (wat er tot 01-10 in de praktijk is gebeurd, met wie)? Kader 4 gaat over het werken met de Cito-mensen in de werkstromen; dit kader gaat over de organisatie daarbuiten: de teams en rollen die straks anders moeten werken. Vanuit het programma wordt dit kader als heel belangrijk gezien, en er zijn signalen dat het meenemen van medewerkers nog niet goed loopt; welke signalen en van wie staat in geen enkel stuk: in te vullen.",
              beeld: "Nee, deels: 3sides spreekt veel mensen, maar één-op-één en in een vaste kring; de instrumenten waarmee het de medewerkers zou meenemen (adoptieteam en ambassadeurs, werksessies per rol, communicatieplan, pilot) zijn op 01-10 geen van alle gestart, het eigen Q3-succes is niet gehaald en de eigen platen zijn nog niet vertaald naar Cito-taal. Of ze het kunnen, blijkt nog niet: de aanpak is goed en Cito-specifiek, de uitwerking half af, en bij hetzelfde bureau liep het de vorige keer volgens de deelnemers juist vast op het meenemen en de opvolging, niet op de workshops",
              actieBij: "beide",
              secties: [
                { label: "Afspraak (bron)", tekst: "Plan van aanpak p. 12: 'Het programma is slechts dan succesvol wanneer werken vanuit Klant in zicht door de hele organisatie wordt gedragen. Middels een gedragsveranderingsprogramma zorgen we dat iedereen weet wat Klant in zicht betekent voor jouw sector, jouw team en jouw rol'; opleveringen: adoptieframework 'gerealiseerd en gevalideerd', playbook-workshops met de eerste pilotsector en per rol één A4 'Mijn rol in de klantreis', een communicatieplan, een kern-adoptieteam en champions per afdeling (p. 12); aanpak 'communiceren op why, how & what samen met adoptie team en champions' (p. 13). Adoptieframework: het adoptieteam zorgt dat 'breder informatie gedeeld wordt', 'betrokkenheid wordt gevraagd van key stakeholders en eigenaren van de klantreis' en 'rapportage van voortgang wordt gedaan naar de hele organisatie' (p. 4); succes eind Q3: draagvlak voor het framework binnen programmateam en management, 'minimaal 3-5 ambassadeurs zijn aangehaakt', 'een pilotgroep actief is gestart' (p. 9); werksessies per klantreisfase met vertegenwoordigers uit PO, VO en Zakelijk (p. 11). Statuspagina: 'elke dinsdag bij Cito aanwezig zijn om onze zichtbaarheid te vergroten'. Town hall 22-09: 'Adoptie: we gaan stap voor stap met de teams aan de slag om de veranderingen door te voeren' en de oproep aan de zaal: 'kom bij ons langs', 'geef prioriteit aan de sessies waarvoor je wordt uitgenodigd', 'help ons de eerste veranderingen te testen' (BV-dag p. 9–10). Onze opdracht (stappenplan 19-08): assistentie bij 'iedereen opnieuw meenemen' (met MT, sectormanagers en teams), het framework voorleggen aan sectormanagers en HR 'zo creëren we draagvlak vóór we het vaststellen', en 'zichtbaar aanwezig bij Cito ... aanspreekbaar voor de teams ... de zichtbaarheid van 3sides draagt bij aan het draagvlak voor de verandering' (stappenplan, opdracht aan 3sides)." },
                { label: "Wat we zien · 3sides zelf (bron)", tekst: "Positief: veel contact. Negentien verschillende namen (geteld): negen bij de klantreis ('diverse bijeenkomsten ... om de klantreis te valideren'), negen bij het technologielandschap, Sanne, Meryl en Saila bij het meten, Pim bij adoptie; 'Saila meegenomen in werkzaamheden en plan van aanpak'; een wekelijks overleg met Saila, Pim en Sasja (statuspagina 3sides, stand 29-09); 'gesprekken gevoerd om informatie op te halen, inzichten direct te valideren en feedback te geven' (statuspagina 3sides, stand 01-10). Programmabreed: kick-off voor het MT (9 juli), het programma gepresenteerd op de town hall 'als eerste stap richting de organisatie' (22 september), de evaluatie van Klant in Beeld 'gedeeld met het team' (statuspagina 3sides, stand 01-10). Maar het meenemen van de medewerkers zelf is niet begonnen: bij adoptie is de enige afstemming 'eerste opzet adoptieframework met Pim besproken' (statuspagina 3sides, stand 29-09); 'stakeholders worden nu meegenomen om te valideren en buy-in te krijgen. Dit gebeurt in de komende maand' (statuspagina 3sides, stand 29-09); sessies met teams of per rol staan nergens, en in de tijdlijn staan ambassadeurs en adoptieteam, communicatieplan en playbook-workshops op 'Niet gestart', met de eerste pilotsector in januari–februari 2027 (stand 28-09). 3sides signaleert zelf dat teams begeleiding missen: 'team is onvoldoende op de hoogte en heeft begeleiding nodig' (licentieserverproject) en 'keuzes worden vaak gemaakt op basis van onjuiste of onvolledige kennis' (statuspagina 3sides, stand 01-10)." },
                { label: "Wat we zien · overleg 29-09 (bron)", tekst: "Verslag: 'gesprekken voornamelijk individueel gevoerd; behoefte aan formele projectgroepen per werkstroom'; 'veel kennis zit bij losse individuen binnen Cito zonder gezamenlijk overzicht'; 'slides en modellen die intern gebruikt worden, zijn niet direct geschikt voor brede organisatiecommunicatie; doelgroepspecifieke vertaling is nodig'; 'balans zoeken tussen management informeren (buy-in) en te vroeg te veel communiceren (onrust)'; basisbegrippen als lead en verkoopkans 'nog niet uniform gedefinieerd binnen Cito', vandaar het actiepunt begrippenlijst 'voor gemeenschappelijke taal binnen de organisatie'; 'behoefte uitgesproken aan nog enkele alignment-sessies'. Transcriptie (automatisch, zonder sprekers; alleen letterlijk leesbare zinnen): 'de platen die we hier maken, niet op een op een de organisatie ingooien'; over baat, vermogen en inspanning: 'wij snappen het, vanuit het DIN-programma, maar ik denk medewerkers ... dus we gaan het in andere manieren doen'; 'jullie zitten er continu in, maar de meeste mensen hier in de organisatie niet'; de kernwaarden G.O.L.D.: 'die zijn echt niet breed gecommuniceerd'; 'conversie is voor jullie vanzelfsprekend ... voor mij niet en ik denk in de hele organisatie als we dit moeten overbrengen straks ook niet'. 3sides over de eigen aanpak: eerst de basis, dan stap voor stap met teams, 'ambassadeurs kweken, en dan de volgende', als een olievlek; en de valkuil die het zelf noemt: 'weer een projectje doen ... en over een jaar zitten we hier weer bij elkaar'." },
                { label: "Wat we zien · vanuit het programma", tekst: "Waarnemingen vanuit het programma, als waarneming gelabeld en niet als feit. In het overleg van 29-09 vielen deelnemers opnieuw over de begrippen; de kaders uit het programmaplan waren naar de achtergrond geraakt en er waren nieuwe mensen aangesloten die het plan niet kenden, waardoor eerder besproken onderwerpen opnieuw aan de orde kwamen. De begrippen voor de rollen lopen door elkaar, en een eerder gedeeld voorstel voor de programmaorganisatie bleek niet gelezen. Het framework bestaat uit algemene en technische begrippen; voor brede communicatie binnen Cito is het in deze vorm onduidelijk, en medewerkers buiten het programmateam begrijpen het nog niet. Het kern-adoptieteam en de champions zijn nog niet aangewezen; dat is een actie van Cito (actiebord). Er zijn signalen dat het meenemen van medewerkers niet goed loopt, maar zonder bron of naam: in te vullen. In de stukken staat geen enkele uitspraak van een Cito-medewerker over 3sides in Klant in Zicht; de enige medewerkersstemmen zijn de 13 respondenten over Klant in Beeld (volgende rij)." },
                { label: "Les uit Klant in Beeld (bron)", tekst: "Het vorige traject van hetzelfde bureau, geëvalueerd onder 13 deelnemers (1 tot 10 september; evaluatie Klant in Beeld). Doel behaald: 3 × ja, 10 × nee; methodes toegepast in het eigen werk: 2 × ja, 11 × nee; de tijd waard: 8 × ja, 5 × nee; 'duidelijk geïnformeerd vanuit Cito' gemiddeld 5,6 en 'vanuit 3sides' 6,2 op 10 (geteld en berekend uit de Excel). Over de workshops en de mensen is men positief: 'goed georganiseerd, inhoudelijk kundig, leuke mensen'; 'heel duidelijk! Het was per sessie duidelijk wat er verwacht werd'; 'het zijn prettige mensen om mee samen te werken'. Waar het misging is het meenemen en de opvolging: 'het voelt nu niet als een manier van werken / denken binnen Cito. Meer als een afgerond project ... het is onduidelijk wie daar de lead in zou moeten nemen'; 'het project ligt nu verder stil bij de grote groep die hieraan begonnen is. Er is nog een klein groepje bezig, maar daar krijgen we niets van mee'; 'te weinig opvolging van voorgaande afspraken van eerdere sessies'; 'omdat het bij ideeën lijkt te zijn gebleven'; 'jammer dat het, voor mijn gevoel, zo abrupt is gestopt'; 'Cito is geen marketingorganisatie. Dat vroeg soms om een extra vertaalslag van mijn kant'; 'er zat wel structuur vanuit 3sides, echter is er te makkelijk van het doel afgestapt door wat de collega's meebrachten'. Wie dat aan te rekenen is, Cito of 3sides, zegt de evaluatie niet; 'regie vanuit 3side' staat één keer als verbeterpunt. 3sides erkent het op de town hall: 'Ging dat soepel? Nee, niet altijd ... de waan van de dag kreeg soms voorrang · kost veel tijd in verhouding tot de opbrengst · gevoel van eigenaarschap' (BV-dag p. 4)." },
                { label: "Kunnen ze het? (bron)", tekst: "Wat goed is: de vertaallogica klantreis → klantbehoefte → kritisch contactmoment → gewenst gedrag → competenties → adoptie → resultaat is Cito-specifiek en dezelfde die ons stappenplan hanteert (adoptieframework p. 3; stappenplan); de vragen zijn de juiste: wat moeten mensen per rol anders doen, welke competenties, 'wat houdt medewerkers momenteel tegen?' en 'doen mensen mee? Doen mensen iets anders? Heeft het effect?' (p. 7–8); 'wie moet aanhaken binnen Cito' noemt de stuurgroep, de sectormanagers PO, VO en Zakelijk, HR, CRM/Data, sales, customer support en marketing (p. 5); de werksessies hebben een concrete opzet met acht vragen per klantreisfase (p. 11); de eerste laag 'Begrijpen (WHY)' heeft een kernboodschap en een meetbare succesindicator: 'iedereen kent de 11 hoofdstappen van de klantreis' en 'de 5 kernprincipes, en de G.O.L.D. kernwaarden' (p. 15). Wat niet goed is: het voorblad zegt 'Augustus 2025' (bestand van 28-09-2026); de SMILE-pagina's zijn generiek, Engelstalig 3sides-materiaal ('Your success is in good hands', 'we'll help you build a team of champions', p. 12–13), alleen p. 14 zet de Cito-onderdelen op de SMILE-fasen; van de vijf lagen is alleen laag 1 uitgewerkt: laag 2 mist de kernboodschap, laag 3 en 4 hebben alleen een opsomming, laag 5 'Continu verbeteren' is leeg (p. 15); de fasering staat in weken zonder datum en in een volgorde die niet klopt ('Fase 1 - Verkenning (week 12)', 'Fase 4 – Meetmodel bouwen (week 2-6)', p. 10); het barrière-assessment uit die fasering heeft geen resultaat in de stukken; een communicatieplan is er niet (tijdlijn: niet gestart, geen oplevermaand); de scope-paragraaf ontbreekt in het plan van aanpak (p. 12–13 springt van '3. Aanpak' naar '5. Planning'); en van de acht eigen Q3-succescriteria (p. 9) is op 01-10 geen enkele aantoonbaar gehaald; het dichtstbij komt 'CRM-gaps en databehoeften inzichtelijk' (eerste CRM-evaluatie afgerond, maar 'nog niet alle informatie', statuspagina 3sides, stand 01-10). Conclusie: de aanpak is goed gekozen en past bij ons stappenplan; de uitwerking is half af en de uitvoering is niet gestart. Of ze het kunnen, is daarmee uit de stukken niet te bewijzen en niet te weerleggen." },
                { label: "Zo doe je het wél (bron)", tekst: "1 · Niet de platen één-op-één de organisatie in, maar per doelgroep een vertaling: eerst de begrippenlijst in gangbare Cito-termen (actiepunt 29-09), dan per rol één A4 'Mijn rol in de klantreis' (plan van aanpak p. 12; adoptieframework p. 15); 'vermijd jargon, ingewikkelde termen of turbotaal', en omdat 'baten' niet overal goed valt is 'gewenste effecten' een alternatief (programmaboek, over de programmavisie en over baten). 2 · Van één-op-één naar projectgroepen per werkstroom met Cito-mensen, met de Cito-lead voorop en de domeineigenaar erbij (actiepunt 29-09; organigram): 'eigenaarschap aanboren boven opdrachten geven', liever 'samen met de betrokkenen een programma te ontwikkelen boven het experts te laten ontwerpen' en 'niet expertmatig een DIN maken ... maar samen met de mensen die de veranderingen en baten voor elkaar moeten krijgen' (programmaboek, principes en eigenaarschap). 3 · Het adoptieteam en de ambassadeurs nu aanwijzen, niet pas bij de pilot: drie tot vijf ambassadeurs was het eigen Q3-succes (adoptieframework p. 9); 'verandering beklijft als mensen het zelf dragen', niet alleen koplopers (stappenplan); liefst mensen uit de teams: 'dat hoeven dus niet managers te zijn (soms beter van niet)' (programmaboek, veranderteam). 4 · Klein beginnen en bewijzen: de werksessies per klantreisfase met vertegenwoordigers uit PO, VO en Zakelijk, met de acht vragen (adoptieframework p. 11), de eerste pilotsector kiezen (actiebord) en 'klein beginnen, bewijzen dat het werkt, dan uitrollen' (stappenplan); 3sides zegt het zelf ook: 'ambassadeurs kweken, en dan de volgende' (overleg 29-09, transcriptie). 5 · De lijn voorop: 'het lijnmanagement (bateneigenaren, programma-eigenaar) speelt een belangrijke rol bij het sturen op verandering' (programmaboek, sturen op verandering); de validaties van blueprint en meetmodel met product- en sectormanagers, Meryl en het MT (kader 1) zijn precies die stap, en het MT bekrachtigt de richting (stappenplan). 6 · Weerstand opzoeken en adoptie meten: 'weerstand moet je koesteren ... maak bovendien ruimte voor het geluid dat niet (zo luid) wordt gemaakt' (programmaboek, sturen op verandering); de maat is de eigen maat van 3sides, 'doen mensen mee? Doen mensen iets anders? Heeft het effect?', met deelname aan werksessies en training en actieve ambassadeurs als eerste tellers (adoptieframework p. 7–8), en de lessen van Klant in Beeld als toets: afspraken opvolgen, concreet maken, niet abrupt stoppen." },
                { label: "Actie bij", tekst: "3sides: het adoptieframework afmaken als Cito-stuk (lagen 2 tot en met 5, communicatieplan, scope-paragraaf, datums in plaats van weken, voorblad), de werksessies en de begrippenlijst voorbereiden, per doelgroep een vertaling in plaats van de interne platen, de validatiesessies voorbereiden, en voortaan rapporteren op de eigen adoptie-maat: wie doet mee, hoeveel mensen uit welke teams. Cito: kern-adoptieteam en champions aanwijzen, de eerste pilotsector kiezen, de projectgroepen bemensen, HR aanhaken en de Cito-leads laten vaststellen (actiebord, deel 5); de validaties zelf inplannen en doen, door de bateneigenaren en het MT (kader 1). Beide: de begrippenlijst (3sides stelt voor, Cito stelt vast in Cito-taal) en 'iedereen opnieuw meenemen' (stappenplan): per doelgroep besluiten wat ze horen, in welke vorm en wanneer (overleg 29-09)." },
              ],
              oordeel: "",
              notitie: "",
            },
            {
              id: "actie",
              titel: "6 · Waar ligt de actie: bij 3sides of bij Cito?",
              ondertitel: "per niet-geleverd onderdeel, zwart-wit, met het bewijs",
              vraag: "Per onderdeel uit kader 1 dat niet is geleverd: ligt het aan 3sides, aan Cito, of aan allebei? Wat Cito moet doen staat in het actiebord (deel 5); wat we 3sides vragen in het voortgangsbord (deel 5) en op de agenda (deel 9).",
              beeld: "Deels bij Cito: het beeld 'niets is afgerond' ligt niet alleen bij 3sides: in zeven van de negen onderdelen is Cito aan zet voor de volgende stap; 3sides is aan zet voor het doelbeeld, de analyse, de datums en de statussen, en voor het afmaken en in gang zetten van de eigen adoptie-aanpak",
              actieBij: "vooral Cito",
              secties: [
                { label: "1 · Klantreizen samenvoegen", tekst: "3sides. Het werk is volgens 3sides gedaan (statuspagina 3sides, stand 29-09, en overleg 29-09); wat ontbreekt is de bevestiging, het resultaat en de status 'Afgerond' in de tijdlijn. Vraag aan 3sides: bevestigen, het Miro-werkdocument delen en het onderdeel op Afgerond zetten." },
                { label: "2 · Analyse van data en applicaties", tekst: "Beide. Cito: 3sides heeft 'tot nu toe geen overzicht of requirementsdocumenten of architectuurplaten ontvangen van SIO' (statuspagina 3sides, stand 01-10); Cito moet die aanleveren of vaststellen dat ze niet bestaan. 3sides: de afgesproken oplevering is een overzicht mét eigenaren en kosten (plan van aanpak p. 6) en die ontbreken in de plaat; nieuwe datum, en de blokkade in de tijdlijn benoemen." },
                { label: "3 · Visie en consequenties", tekst: "3sides. Het doelbeeld met ontwerpprincipes is hun oplevering (plan van aanpak p. 6) en september hun eigen datum (tijdlijn); er is niets geleverd. De afhankelijkheid van de analyse, en dus van de SIO-stukken, is reëel, maar volgens het eigen plan heeft 3sides nog Q4 (p. 7). Vraag aan 3sides: welke datum geldt en in welke vorm komt het doelbeeld." },
                { label: "4 · Meetmodel", tekst: "Beide. 3sides: het concept kwam op 28-09 als werkdocument (meetinstrument), de validatie is onderdeel van hun eigen aanpak (plan van aanpak p. 9) en Succes meten staat in Jira op To do (p. 5). Cito: de validatie met Meryl als opdrachtgever en daarna het MT is een actiepunt van Cito (overleg 29-09; actiebord) en is nog niet ingepland; zonder validatie geen 0-meting." },
                { label: "5 · Funnel en salesproces", tekst: "Beide. 3sides: het voorstel afmaken en zeggen wat de oplevering is (het plan van aanpak noemt er geen); de vervolgsessie met Meryl staat gepland (statuspagina 3sides, stand 01-10). Cito: de definities van lead, marketing qualified lead en verkoopkans vaststellen met Meryl en Jasper (overleg 29-09; actiebord)." },
                { label: "6 · Blueprint: fasen en hoofdstappen", tekst: "Vooral Cito. De blueprint ligt er (blueprint, 24-09); de afgesproken oplevering is 'gevalideerd door product managers en sector managers' (plan van aanpak p. 10) en die validatie is een actiepunt van Cito (overleg 29-09; actiebord). 3sides: de datum voorstellen en de sessie voorbereiden." },
                { label: "7 · Data ophalen", tekst: "Vooral Cito. De data komen van Cito-mensen, in de datapuntenlijst: Ilse, Famke, Kathelijn, Jama, marketeers, productmanagers (datapunten), en Sanne heeft het overzicht (statuspagina 3sides, stand 29-09); de aanlevering is dus van Cito. 3sides: de werksessies met die eigenaren (plan van aanpak p. 9) en per datapunt zeggen wat ontbreekt; het rode vlaggetje staat er, de toelichting niet (tijdlijn)." },
                { label: "8 · 0-meting", tekst: "Beide. Cito: de twee voorwaarden, een gevalideerd meetmodel en de data (4 en 7), liggen bij Cito. 3sides: geen startmaand in de tijdlijn en 'Niet gestart', terwijl het eigen plan Q3/Q4 zegt (plan van aanpak p. 9) en het eigen adoptieframework een volledige nulmeting eind Q3 (p. 9); startdatum invullen en de 0-meting over alle vier domeinen voorbereiden." },
                { label: "9 · Adoptieframework", tekst: "Beide. 3sides: het framework afronden, met een scope-paragraaf (plan van aanpak p. 12–13; deel 4). Cito: toetsen (programma-architect) en vaststellen; 'formeel vastgesteld' was in het adoptieframework zelf het succes voor eind Q3 (p. 9) en de eerste opzet is tot nu toe alleen met Pim besproken (statuspagina 3sides, stand 29-09)." },
                { label: "Mensen meenemen (kader 5)", tekst: "Beide. 3sides: de eigen instrumenten uit het plan van aanpak (adoptieteam, werksessies, communicatieplan, per rol één A4) zijn niet gestart en het framework is half af. Cito: het kern-adoptieteam, de champions en de pilotsector zijn keuzes van Cito (plan van aanpak p. 12; actiebord) en zijn nog niet gemaakt; de validaties liggen bij de lijn." },
                { label: "Zwart-wit", tekst: "Alleen 3sides: 1 en 3 (status en bevestiging; het doelbeeld). Vooral Cito: 6 en 7 (validatie van de blueprint; aanlevering van data). Beide: 2, 4, 5, 8 en 9. In zeven van de negen onderdelen (2, 4, 5, 6, 7, 8, 9) is de volgende stap een validatie, besluit of aanlevering van Cito." },
              ],
              oordeel: "",
              notitie: "",
            },
          ],
          legenda: "",
        },
      ]
    ),

    // 9
    sectie(
      "gesprek",
      "9 · Het gesprek met 3sides: de agenda",
      "Na de interne besluiten en de evaluatie: wat we in het maandelijkse gesprek met 3sides bespreken. We kijken vooruit: we hebben alles gelezen, dit zijn de actiepunten, hoe pakken we ze op? De actiepunten per werkstroom staan in het voortgangsbord (deel 5).",
      [
        lijst(
          [
            "1 · Eén model, één taal: in het meetmodel 'Vermogen: kunnen en doen' en 'Vermogens (Kunnen)' gebruiken, en in alle stukken de namen van de werkstromen die we maandag vaststellen (voorstel: die van het organigram); NPS meten we organisatiebreed (besloten): met de andere organisatiebrede KPI's op doelniveau, als resultante (voorstel; deel 3 en 6).",
            "2 · Plan van aanpak per werkstroom aanvullen: output-KPI per resultaat en de capaciteit die 3sides van Cito nodig heeft; bij adoptie een scope-paragraaf binnen de afbakening van het programma; de eigenaar die Cito aanwijst erin opnemen. 3sides vult aan, Cito toetst en stelt vast (deel 4).",
            "3 · Planning: de planning voor 0-meting en pilots die we intern vaststellen in de tijdlijn verwerken, de open start- en opleverdata invullen, de volgorde van de klantreisvertaling controleren, en per onderdeel 'Afgerond' zetten zodra het resultaat er is, te beginnen met het samenvoegen van de Klant in Beeld-klantreizen (deel 5 en 7).",
            "4 · Meetkader focussen: in de 0-meting eerst de 14 baten-KPI's, de vijf kernprincipe-scores en de stand per domein; melden dat er KPI's bij komen op vermogensniveau (na de 0-meting) en per werkstroom (output); meetprotocol en een voorstel voor de eigenaar per datapunt (deel 6 en 7).",
            "5 · Werkwijze: per werkstroom een projectgroep met Cito-mensen, het Jira-bord delen met de bredere groep, en keuzes onderbouwen op één A4 (overleg 29-09).",
          ],
          "Agenda voor het maandelijkse gesprek met 3sides (voorstel)"
        ),
      ]
    ),

    // 10
    sectie("documenten", "10 · Bronnen: de gebruikte documenten", "", [
      lijst(
        [
          "[[Plan van aanpak]] van 3sides (PDF, 13 p.), gedeeld 29-09-2026",
          "[[Tijdlijn]] van 3sides (Excel, tab v3), stand 28-09-2026",
          "[[0-meting meetinstrument]] (PDF, 16 p.), work in progress",
          "[[Data punten ter input KPI]] (Excel), werkdocument",
          "[[Blueprint klantreis]] (Excel), draft",
          "[[Adoptieframework]] (PDF), work in progress",
          "[[Data & Tech]] (PDF) en de praatplaten [[praatplaat funnel]] en [[praatplaat proces]] (PDF)",
          "[[BV-dag]] (PDF) en [[evaluatie Klant in Beeld]] (Excel, 13 respondenten)",
          "Statuspagina '3sides-as-a-service' van 3sides, als tekst aangeleverd op 29-09-2026 en in bijgewerkte vorm op 01-10-2026 (in dit stuk: statuspagina 3sides, stand 29-09 en stand 01-10); de pagina zelf draagt geen datum",
          "Verslag programmaoverleg 29-09-2026 en verslag programmaoverleg 01-10-2026",
          "Programma: DIN in de app (stand 29-09-2026), KPI-model (stap 9), stappenplan analysefase (19-08-2026), organigram (stap 10)",
          "Niet gebruikt: de orderexport 'Aantallen besteld'; die hoort niet bij deze analyse.",
        ],
        "Gebruikte documenten"
      ),
      lijst(
        [
          "Prevaas & Van Loon, Werken aan Programma's: H1 (programma versus project), H4 (eigenaarschap), H6 (programmaplan), H8 (baten), H10–H11 (vermogens, samenhang, focus), H17–H18 (sturen, afbakenen en uitwerken), H24 en H30 (beeldvorming, oordeel, besluit).",
          "Shostack (1984), Designing Services That Deliver; Bitner, Ostrom & Morgan (2008), Service Blueprinting.",
          "Kaplan & Norton (1996), The Balanced Scorecard: leidende en volgende indicatoren.",
          "Reichheld (2003), The One Number You Need to Grow: NPS.",
          "Kotter (1996), Leading Change; Hiatt (2006), ADKAR.",
        ],
        "Onderbouwing"
      ),
    ]),
  ],
};
