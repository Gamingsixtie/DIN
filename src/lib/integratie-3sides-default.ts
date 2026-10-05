// Stap 11 — "Programma × 3sides". Kernboodschap: de programmastructuur staat; alles
// wat 3sides heeft, past onder het ene framework van het programma (het Doelen-
// Inspanningennetwerk, DIN); met de juiste rollen in het framework maken we het concreet.
// Verhaallijn in tien delen: de kern → de structuur (plaat met rollen, de toets) → 3sides
// naast het DIN (werkstromen bouwen, kernprincipes meten) → de vier werkstromen → planning,
// voortgang en het actiebord van Cito → het meetmodel → eerst intern besluiten → de
// evaluatie van 3sides op zes kaders → het gesprek met 3sides (de agenda) → bronnen.
// Deel 5 (zonder actiebord) en deel 8 staan ook op het tabblad Evaluatie 3sides en in de
// exports (evaluatie-uitsnede.ts); deel 4 niet. Die tekst is extern en gaat over 3sides,
// geschreven als Cito ("wij"): wat 3sides heeft toegezegd en wat er is geleverd, zonder wat
// Cito zelf nog doet. In deel 8 gaan per kader titel, ondertitel, beeld, punten, aanZet3sides
// en vraag3sides naar 3sides, plus het kader Rolverdeling (toon "besluit"). Intern blijven:
// vraag, aanZetCito, actieBij, secties, oordeel, notitie en het kader met toon "info"
// (tabblad Evaluatie intern). Wat Cito zelf doet staat daar en op het actiebord in deel 5.
// Volgorde van de kaders: levert, tempo, rapportage, mensen, din, actie (id's ongewijzigd).
// Tellingen in de externe tekst staan er nooit kaal: de onderdelen worden bij naam genoemd.
// Standaardinhoud; in de app per kop en cel aanpasbaar en opgeslagen onder
// session.documenten[INTEGRATIE_SLEUTEL].
//
// Bronnen (alleen deze; stand 01-10-2026):
// - 3sides, map "3sides input": Plan van Aanpak (PDF, 13 p.), Project tijdlijn
//   (Excel, tab v3, stand 28-09), 0-meting meetinstrument (WiP, 16 p.), Data punten ter
//   input KPI (Excel), Blueprint klantreis (draft), Adoptieframework (WiP),
//   Data & Tech, praatplaten funnel en salesproces, BV-dag, Evaluatie Klant in Beeld.
// - 3sides-statuspagina (tekst aangeleverd op 29-09 en, in bijgewerkte vorm, op 01-10; de
//   stand van 01-10 is alleen bekend tot en met het deel Technologielandschap) en de
//   automatische samenvatting en transcriptie van het programmaoverleg van 29-09 (met 3sides;
//   niet door beide partijen vastgesteld).
// - Het interne programmaoverleg van Cito van 01-10 (samenvatting en transcriptie, zonder
//   sprekers): gebruikt in deel 2 (plaat, versie 2) en in deel 8, daar alleen als waarneming
//   of mening van het programmateam, zonder namen, met het label "(overleg 01-10)".
// - Het eerste voorstel van 3sides, onderdeel Planning (letterlijk, uit de gedeelde documentruimte;
//   datum: in te vullen; niet "goedgekeurd" of "afgesproken" noemen). De rest van het voorstel
//   kennen we alleen uit de samenvatting in 3SIDES-VOORSTEL-2026-2027.md (ongecontroleerd).
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
        "Inspanning: in het DIN '0-meting: meten van baten en vermogen', over alle vier de domeinen (voorstel van het programma); de werkstroom voert haar uit met meetmodel, 0-meting en tussenmeting",
        "Vermogen: alle vier de delen; de inspanning bouwt het meten van baten en vermogen op en meet het vermogen met de vijf kernprincipes",
        "Baten: de 14 baten-KPI's, met startwaarden uit de 0-meting",
      ],
      aanvullen: [
        "Meetprotocol per baten-KPI",
        "Eigenaar per datapunt",
        "Validatie met de programma-eigenaar en het MT",
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
    "Bron: projecttijdlijn 3sides, tab v3, stand 28-09-2026: 28 onderdelen van de vier werkstromen, met start en oplevering waar 3sides die noemt. Namen en voortgang in gewone taal (Loopt = 'In progress', Niet gestart = 'Not started', Afgerond = 'Completed'); status (+, +/-, -) zoals 3sides die rapporteert.",
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
          legenda: "Vraag aan 3sides: in het meetmodel de begrippen van het programma gebruiken: kunnen en doen horen samen bij het vermogen, en in het meetinstrument op p. 6 'Vermogens (Kunnen)' in plaats van 'Vermogens (Waartoe)' (meetinstrument p. 5 en 6; voorstel); dan is het één model.",
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
          "Bron: plan van aanpak 3sides p. 6–13 (waarom, resultaten, planning) en de tijdlijn (tab v3). Plek in het DIN, leads en 'nog nodig': programma (het DIN van het programma, organigram). De Cito-leads zijn een voorstel uit het organigram, nog vast te stellen door de programma-eigenaar. De koppeling van elke werkstroom aan een inspanning in het DIN is ook een voorstel."
        ),
      ]
    ),

    // 5
    sectie(
      "planning",
      "5 · Planning en voortgang: de tijdlijn als basis",
      "Dit deel laat zien wat 3sides heeft gepland en wat er op 01-10 lag. Eerst de tijdlijn van 3sides (stand 28-09-2026), dan wat ons daarin opvalt en waarom. Daarna één tabel: per toezegging uit het eerste voorstel van 3sides voor Q3 2026 wat er ligt, wat ontbreekt en waarom we dat zeggen.",
      [
        TIJDLIJN,
        callout(
          "info",
          "Zo werk je de tijdlijn bij",
          "Is een onderdeel ingeleverd, kies dan in het keuzelijstje bij dat onderdeel 'Afgerond'; dat wordt meteen bewaard. Een start- of opleverdatum aanpassen doe je met het potlood bij dit deel: klik in de tijdlijn op een maand en daarna op Opslaan. De standlijn staat op vandaag."
        ),
        lijst(
          [
            "Geen 'Completed', zes onderdelen zonder maand: in de laatste stand van de tijdlijn die wij hebben, 28-09, staat elk onderdeel op 'In progress' of 'Not started'. Dat geldt ook voor Klant in Beeld-klantreizen samenvoegen, met oplevering in augustus, en voor analyse van data en applicaties, visie en consequenties en meetmodel ontwikkelen, met oplevering in september, toen nog twee dagen. Vier onderdelen hebben geen oplevermaand: het communicatieplan, en de interventies, het toetsen van het adoptieframework en de ambassadeurs en het adoptieteam, die doorlopen tot en met juni. Twee hebben geen startmaand: de 0-meting en de vertaling van de klantreis naar CRM-input en funnelprocessen (tijdlijn, stand 28-09).\nWaarom het telt: zonder 'Completed' en zonder maand zien wij niet wat af is en wanneer iets af moet zijn.\nWe vragen 3sides: 'Completed' zetten zodra iets af is, en bij deze zes de maand invullen of zeggen dat het doorlopend werk is.",
            "De 0-meting stond in Q3 en is niet gestart: het eerste voorstel van 3sides zet de 'Nulmeting' in Q3 2026 en het plan van aanpak in Q3/Q4. De tijdlijn zet de oplevering in oktober, zonder startmaand; de 0-meting staat op 'Not started' en het ophalen van de data op rood (voorstel 3sides, planning Q3 2026; plan van aanpak p. 9; tijdlijn, stand 28-09).\nWaarom het telt: de 0-meting geeft de startwaarde van elke baten-KPI. Zonder startwaarde kunnen wij geen doelwaarden vaststellen en later niet zien of het programma werkt.\nWe vragen 3sides: één startmaand en één opleverdatum, en een toelichting bij de rode status.",
            "De eerste pilot staat twee kwartalen later: het eerste voorstel zet de pilotgroep in één sector in Q3 2026, de tweede sector in Q4 en de derde in Q1 2027. Het plan van aanpak noemt Q4 2026 voor 'toegepast binnen eerste pilotgroep' en Q1 2027 voor 'Pilots sectoren'. De tijdlijn zet de eerste sector in januari en februari 2027, de tweede in februari en maart en de derde in april en mei (voorstel 3sides; plan van aanpak p. 11 en 13; tijdlijn, stand 28-09).\nWaarom het telt: in de pilot gaan onze medewerkers voor het eerst anders werken, en volgens het voorstel komen daar de eerste gedragsdata uit. Schuift de pilot, dan schuift dat mee.\nWe vragen 3sides: zeggen waarom de pilot is verschoven, en één planning aan ons voorleggen.",
            "CRM-richting in november, keuze rond april 2027: in de tijdlijn staat 'CRM Richting bepalen' met oplevering in november. Ons stappenplan zet de formele keuze rond april 2027 (tijdlijn, stand 28-09; stappenplan).\nWaarom het telt: een richting bepalen en formeel kiezen zijn twee stappen, en de keuze is aan ons. Wij willen in november weten waarop wij in april beslissen.\nWe vragen 3sides: de richting in november als advies aan ons voorleggen, met de onderbouwing.",
            "De vertaling van de klantreis levert eerst op: de vertaling van de klantreis naar CRM-input en funnelprocessen levert op in november. De blueprint voor proces, CRM-gebruik en KPI's en het onderdeel rollen, gedrag en competenties leveren pas in december op (tijdlijn, stand 28-09).\nWaarom het telt: bouwt de vertaling op die twee onderdelen, dan is ze af voordat haar basis er is, en moet ze daarna misschien opnieuw.\nWe vragen 3sides: zeggen of de vertaling op die twee onderdelen bouwt, en zo ja de volgorde aanpassen.",
          ],
          "Wat opvalt in de planning"
        ),
        tabel(
          ["Toegezegd voor Q3 2026 (eerste voorstel van 3sides)", "In de tijdlijn van 3sides", "Was het er op 01-10?", "Wat er ligt", "Wat ontbreekt, en waarom we dat zeggen", "Wat we van 3sides vragen"],
          [
            [
              "'Kickoff en stakeholder alignment'",
              "Geen onderdeel met een oplevermaand tot en met oktober",
              "Ja",
              "De kick-off voor het MT was op 9 juli. Op 22 september heeft 3sides het programma op de town hall gepresenteerd, 'als eerste stap richting de organisatie' (statuspagina 3sides, stand 01-10).",
              "Niets: dit was er in Q3.",
              "Geen vraag.",
            ],
            [
              "'Blueprint Klantreis'",
              "1 · Klant in Beeld-klantreizen samenvoegen (augustus, verstreken)\n6 · Blueprint: fasen en hoofdstappen (oktober)",
              "Nee, deels",
              "Twee dingen. Een Excel die 3sides zelf 'Draft Blueprint Klantreis' noemt: één klantreis in zes fasen (bewustwording, overweging en oriëntatie, aankoop, onboarding, gebruik, evaluatie) en elf subfasen, met per fase een klantdoel en per subfase een hoofdstap. En een Miro-bord waarop de klantreizen van PO, VO en Zakelijk/Professionals (op het bord 'PRO') per fase naast elkaar staan, met de gelijkenissen en één model van zes fasen. 3sides meldt 'Diverse bijeenkomsten' met medewerkers van ons 'om de klantreis te valideren' (blueprint, 24-09; Miro-bord klantreis, bekeken 05-10-2026; statuspagina 3sides, stand 29-09 en 01-10).",
              "De validatie. Het plan van aanpak vraagt een blueprint 'gevalideerd door product managers en sector managers'. Of zij hebben gevalideerd, zien wij niet, en in de samenvatting van het overleg staat dat valideren nog als actiepunt. Het samenvoegen van de sectorreizen noemt 3sides zelf nog niet af: het staat op 'In progress', en de samengevoegde reis per stap is er voor PO en VO, niet voor Zakelijk/Professionals. De kernwaarden en kernprincipes, die het plan ook noemt, volgen in de tijdlijn in november (plan van aanpak p. 10; overleg 29-09; tijdlijn, stand 28-09; Miro-bord klantreis, bekeken 05-10-2026).",
              "Zeggen of het Miro-bord het resultaat van het samenvoegen is, en zo ja dat onderdeel op 'Completed' zetten; zo nee zeggen wat er nog komt, met een datum. De validatie voorbereiden en een datum voorstellen.",
            ],
            [
              "'Nulmeting'",
              "4 · Meetmodel ontwikkelen (september, verstreken)\n7 · Data ophalen voor het meetmodel (oktober)\n8 · 0-meting (oktober)",
              "Nee, niet gestart",
              "De voorbereiding. Een concept van het meetmodel, een werkdocument van 16 p.: het model van doelen, baten, vermogens en inspanningen, de KPI's per niveau en de opzet van een score per kernprincipe. En een lijst van circa 85 datapunten met hun eenheid. 3sides meldt 'Eerste datapunten opgehaald (NPS)' (meetinstrument, 28-09; datapunten, 24-09; statuspagina 3sides, stand 29-09).",
              "De meting zelf: in de tijdlijn staat de 0-meting op 'Not started', zonder startmaand, en het ophalen van de data op rood. Met wat er ligt, kunnen wij nog niet meten: het meetmodel is niet gevalideerd, elke baten-KPI heeft nog 'Nulmeting Q3' als startwaarde (die tabel komt uit onze eigen baten-KPI's), in de datapuntenlijst hebben alleen de jaarverslagcijfers een waarde, en bij ruim de helft van de datapunten staat niet wie ze levert. 3sides meldt dat het data-overzicht met ons programmamanagement is gedeeld; de NPS-waarden die 3sides noemt, zitten niet bij de stukken (tijdlijn, stand 28-09; meetinstrument p. 7; datapunten, 24-09).",
              "Eén startmaand en één opleverdatum voor de 0-meting. De validatie van het meetmodel voorbereiden en een datum voorstellen. Toelichten waarom het ophalen van de data op rood staat.",
            ],
            [
              "'Adoptie-framework bouwen (doelgroepen, barrières, meetaanpak)'",
              "9 · Adoptieframework opstellen (oktober)",
              "Nee, deels",
              "Een werkdocument van 15 p. Het beschrijft vijf lagen: begrijpen, vertalen naar rollen, vaardig maken, verankeren in de praktijk en continu verbeteren. De eerste laag, 'Begrijpen (WHY)', is volledig uitgewerkt. Van de drie dingen die het voorstel noemt, staan er twee in: de doelgroepen ('Wie moet aanhaken binnen Cito?') en de meetaanpak ('Doen mensen mee? Doen mensen iets anders? Heeft het effect?') (adoptieframework p. 5, 7, 8 en 15).",
              "De barrières: het framework plant een 'Barrière Assessment' in week 8 tot en met 11, maar een uitkomst zit niet bij de stukken. Van de vijf lagen zijn de tweede tot en met de vierde niet volledig uitgewerkt en is de vijfde leeg, en de fasering staat in weken zonder datum. Daardoor zegt het framework nog niet hoe, met wie en wanneer wij onze medewerkers meenemen (adoptieframework p. 10 en 15).",
              "Het framework afronden: de vier andere lagen uitwerken, de barrières in kaart brengen en datums bij de fasering zetten.",
            ],
            [
              "'Mijlpaal: adoptie-framework gereed en gedragen door DIN-programmateam'",
              "Hoort bij 9 · Adoptieframework opstellen (oktober)",
              "Nee",
              "De eerste opzet van het framework is besproken met onze programma-architect (statuspagina 3sides, stand 29-09).",
              "Gereed en gedragen. Gereed is het niet: het is een werkdocument, vier van de vijf lagen zijn niet af (de rij hierboven) en de tijdlijn zet de oplevering in oktober. Gedragen door ons programmateam is het nog niet: uit de stukken blijkt een bespreking met één lid, niet met het team, en in ons programmateam is gezegd dat het 'hoogover' blijft (tijdlijn, stand 28-09; overleg 01-10).",
              "Het afgeronde framework ter vaststelling aan ons programmateam voorleggen. De scope van deze werkstroom in het plan van aanpak opnemen, zoals bij de drie andere.",
            ],
            [
              "'Inventarisatie CRM'",
              "2 · Analyse van data en applicaties (september, verstreken)",
              "Nee, deels",
              "Een plaat van het applicatielandschap, door 3sides 'Work-In-Progress' genoemd, met de systemen en een deel van de koppelingen. 3sides meldt 'CRM-proces en implementatie: eerste evaluatie afgerond', met als uitkomst dat de CRM-inrichting 'verouderd' is (Data & Tech, 28-09; statuspagina 3sides, stand 01-10).",
              "De kosten en kansen van het CRM uit het voorstel, en de eigenaren en kosten van alle systemen uit het plan van aanpak. Het voorstel zegt over het huidige CRM: in kaart brengen 'wat werkt, wat vastloopt, wat de kosten en kansen zijn'. Het plan van aanpak vraagt 'Een compleet overzicht van de huidige systemen, koppelingen, eigenaren en kosten'. Eigenaren en kosten staan niet op de plaat. 3sides schrijft zelf 'We hebben nog niet alle informatie die we nodig hebben' en meldt dat stukken van SIO ontbreken (voorstel 3sides; plan van aanpak p. 6; statuspagina 3sides, stand 01-10).",
              "Het overzicht afmaken met eigenaren en kosten. In de tijdlijn zetten wat ontbreekt en wat de nieuwe datum is.",
            ],
            [
              "'Pilotgroep starten (1 sector, bijv. VO of Zakelijk)'",
              "Geen onderdeel met een oplevermaand tot en met oktober; de eerste sector staat in januari en februari 2027",
              "Nee, niet gestart",
              "Nog niets: het toepassen in de eerste sector staat in de tijdlijn op 'Not started', met start in januari 2027 (tijdlijn, stand 28-09).",
              "De gestarte pilotgroep. Het voorstel zet de start in Q3 2026. Het plan van aanpak noemt Q4 2026 voor 'toegepast binnen eerste pilotgroep' en Q1 2027 voor 'Pilots sectoren'; de tijdlijn zegt januari en februari 2027 (voorstel 3sides; plan van aanpak p. 11 en 13; tijdlijn, stand 28-09).",
              "Zeggen waarom de pilot is verschoven. Een voorstel doen voor de eerste pilotsector, met een datum.",
            ],
          ],
          {
            titel: "Toegezegd en geleverd: het eerste voorstel van 3sides naast de stand op 01-10",
            chipKolom: 2,
            legenda: "Eerste kolom: letterlijk uit de planning in het eerste voorstel van 3sides (voorstel 3sides, planning Q3 2026). Het voorstel noemt de zes onderdelen als het werk van Q3 en zegt 'gereed' alleen bij de mijlpaal; wij lezen: in Q3 af. Tweede kolom: de negen onderdelen uit de tijdlijn van 3sides met een oplevermaand tot en met oktober, genummerd als in kader 1 van deel 8; welk onderdeel bij welke toezegging hoort, is onze lezing. Twee van de negen staan onder geen toezegging. 3 · Visie en consequenties gaat over het doelbeeld voor het technologielandschap, dat het voorstel niet in Q3 noemt: een doelbeeld vinden wij niet in de stukken, wel losse inzichten (september in de tijdlijn, Q3/Q4 in het plan van aanpak). 5 · Marketing- en salesproces en funnel staat niet in het voorstel voor Q3: er liggen twee praatplaten, en de oplevermaand oktober loopt nog. Het oordeel geldt de toezegging zelf, niet elk onderdeel eronder. Ja = het was er op 01-10. Nee, deels = er ligt een concept of een begin. Nee, niet gestart = nog niet begonnen. Nee = de mijlpaal is niet gehaald. Tegen het eerste voorstel is Q3 voorbij. Tegen de eigen tijdlijn van 3sides loopt de oplevermaand oktober op 01-10 nog: daar is de stand een tussenstand.",
          }
        ),
        {
          type: "voortgangsbord",
          titel: "Voortgangsbord",
          werkstromen: [
            {
              anker: "adoptie",
              naam: "Adoptieframework",
              geleverd: ["SMILE-aanpak uitgewerkt en opzet besproken met de programma-architect", "Adoptieframework als werkdocument (PDF)"],
              nodig: [
                { tekst: "Scope afbakenen in het plan van aanpak: de aanleiding noemt de hele organisatie, per sector, team en rol, maar een eigen scope-paragraaf zoals bij de andere werkstromen ontbreekt (plan van aanpak p. 12–13)", klaar: false },
                { tekst: "Voorstel voor de eerste pilotsector, met datum, binnen één planning die 3sides aan ons voorlegt (nu: eerste voorstel Q3 2026, plan van aanpak Q4 2026 en Q1 2027, tijdlijn januari–februari 2027)", klaar: false },
                { tekst: "Oplevermaand voor het communicatieplan, het toetsen van het adoptieframework en de ambassadeurs en het adoptieteam", klaar: false },
                { tekst: "Per resultaat de output-KPI en de capaciteit die van ons en van HR nodig is", klaar: false },
              ],
            },
            {
              anker: "data",
              naam: "Centrale datavoorziening klantcontact",
              geleverd: ["Praatplaten funnel en salesproces", "Data & Tech-plaat (draft)", "Eerste conclusies over de CRM-inrichting en het landschap"],
              nodig: [
                { tekst: "Advies per systeem en roadmap met kostenindicatie (resultaten in het plan van aanpak p. 6; planning Q4, p. 7)", klaar: false },
                { tekst: "CRM-richting besluitklaar in november, los van de formele keuze rond april 2027", klaar: false },
                { tekst: "Voorstel voor de funneldefinities lead, MQL en verkoopkans, voor de programma-eigenaar en de verantwoordelijke voor sales", klaar: false },
                { tekst: "Oplevermaand voor de interventies", klaar: false },
                { tekst: "Per resultaat de output-KPI en de capaciteit die van ons nodig is", klaar: false },
              ],
            },
            {
              anker: "klantreizen",
              naam: "Klantreizen",
              geleverd: ["Klant in Beeld-klantreizen: de sectorreizen van PO, VO en Zakelijk/Professionals staan op het Miro-bord per fase naast elkaar, met de gelijkenissen en één model van zes fasen (Miro-bord klantreis, bekeken 05-10-2026; in de tijdlijn nog 'In progress')", "Blueprint draft: zes fasen en elf subfasen (bij naam in deel 8, kader 1, onderbouwing bij onderdeel 6), kernwaarden en kernprincipes", "Eerste KPI's per klantfase"],
              nodig: [
                { tekst: "Zeggen of het Miro-bord het resultaat van het samenvoegen van de Klant in Beeld-klantreizen is, en zo ja het onderdeel in de tijdlijn op 'Completed' zetten; zo nee zeggen wat er nog komt, met een datum (Miro-bord klantreis, bekeken 05-10-2026; tijdlijn: 'In progress')", klaar: false },
                { tekst: "Datum voor de validatie van de blueprint met product- en sectormanagers (Q4)", klaar: false },
                { tekst: "Startmaand van de vertaling naar CRM-input en funnelprocessen", klaar: false },
                { tekst: "Meetkader van 55 KPI's (blueprint, tab KPI meetkader): in de 0-meting alleen wat de baten-KPI's per sector en de score per kernprincipe voedt; de rest na de 0-meting", klaar: false },
                { tekst: "Per resultaat de output-KPI en de capaciteit die van ons nodig is", klaar: false },
              ],
            },
            {
              anker: "meting",
              naam: "0-meting",
              geleverd: ["Meetmodel-opzet met KPI's per niveau", "Meetinstrument als werkdocument (16 p.)", "Datapuntenlijst, circa 85 datapunten", "Advies over de inzet van de 0-meting"],
              nodig: [
                { tekst: "Datum voor de validatie van het meetmodel met de programma-eigenaar en het MT, vóór de 0-meting", klaar: false },
                { tekst: "Meetprotocol per baten-KPI: definitie, bron, eenheid, frequentie, wie levert; een voorstel voor de eigenaar per datapunt", klaar: false },
                { tekst: "0-meting: startmaand invullen en starten zodra het meetmodel is gevalideerd en de data er zijn; oplevering: startwaarde per baten-KPI, score per kernprincipe en de stand per domein (Cultuur, Mens, Data & Systemen, Processen)", klaar: false },
                { tekst: "In het meetmodel onze begrippen gebruiken: kunnen en doen horen samen bij het vermogen; in het meetinstrument op p. 6 'Vermogens (Kunnen)' in plaats van 'Vermogens (Waartoe)' (meetinstrument p. 5 en 6; voorstel)", klaar: false },
              ],
            },
          ],
          programmabreed: [
            { tekst: "Jira-bord delen met de bredere groep (actiepunt 29-09)", klaar: false },
            { tekst: "Plan van aanpak aanvullen per werkstroom: per resultaat de output-KPI, de capaciteit die van ons nodig is en hoe het resultaat aan onze organisatie wordt overgedragen; daarna ter vaststelling aan ons voorleggen", klaar: false },
            { tekst: "In alle documenten onze namen van de werkstromen gebruiken: Adoptieframework, Centrale datavoorziening klantcontact, Klantreizen en 0-meting", klaar: false },
            { tekst: "Projectgroepen per werkstroom in plaats van één-op-één-gesprekken", klaar: false },
          ],
          legenda: "'Nog nodig' is wat we van 3sides vragen; vink af wat binnen is, dat wordt meteen bewaard. 'Geleverd volgens 3sides' komt van de statuspagina 3sides, stand 29-09, van de aangeleverde bestanden en van het Miro-bord klantreis (bekeken 05-10-2026). Het bord en de werkstroomkaarten in deel 4 rekenen mee met de tijdlijn; het bord staat ook los in het tabblad Voortgang.",
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
          ["Programmabreed", "Rolverdeling: ons uitgangspunt uitdrukkelijk uitspreken tegenover 3sides (wij leiden, 3sides volgt en voert uit; wat de rol van de programmamanager is; 3sides regelt de stappen uit het eigen plan), en de eigen stukken daarover gelijktrekken: stappenplan, KPI-model en organigram (deel 8; overleg 01-10)", ""],
          ["Programmabreed", "Vóór het evaluatiegesprek nagaan: heeft 3sides het stappenplan van 19-08 ontvangen; zijn de negen collega's bij het valideren van de klantreis productmanagers en sectormanagers; is de wekelijkse rapportage sinds juli binnengekomen; wie zette het integratievoorstel on-hold (deel 8, interne notitie)", ""],
          ["Programmabreed", "Eén planning voor de 0-meting en voor de pilots vaststellen, zodra 3sides de planningen naast elkaar heeft gelegd en er één voorlegt (deel 5 en 7)", ""],
          ["Programmabreed", "Rapportage-afspraak met 3sides vastleggen: wekelijks de tijdlijn, 'Completed' waar het af is, een toelichting bij elke +/- en -, een nieuwe datum bij een verstreken onderdeel; en op een gemelde belemmering reageren met een besluit of een naam (deel 8)", ""],
          ["Programmabreed", "Vaststellen wat we bedoelen met een integraal klantbeeld, vóór we de werkstromen daarop toetsen (overleg 01-10)", ""],
          ["Programmabreed", "Namen van de vier werkstromen vaststellen (voorstel: die van het organigram; deel 7)", ""],
          ["Programmabreed", "3sides evalueren op de zes kaders (deel 8), in het ritme dat we maandag besluiten", ""],
          ["Programmabreed", "Overzichten en architectuurplaten van SIO aanleveren aan 3sides, of vaststellen dat ze niet bestaan (statuspagina 3sides, stand 01-10)", ""],
          ["Programmabreed", "'Iedereen opnieuw meenemen' (stappenplan): per doelgroep bepalen wat ze horen, in welke vorm en wanneer; samen met de begrippenlijst (overleg 29-09)", ""],
          ["Adoptieframework", "Kern-adoptieteam en champions per afdeling aanwijzen, samen met 3sides (plan van aanpak p. 12; stappenplan: ambassadeurs per sector in Q4)", ""],
          ["Adoptieframework", "Eerste pilotsector kiezen", ""],
          ["Adoptieframework", "Capaciteit van HR vrijmaken voor training en coaching (tijdlijn: april tot juni 2027)", ""],
          ["Adoptieframework", "Het adoptieframework toetsen (programma-architect) en vaststellen, zodra 3sides het heeft afgemaakt", ""],
          ["Centrale datavoorziening klantcontact", "Funneldefinities (lead, MQL, verkoopkans) vaststellen met Meryl en Jasper, op basis van het voorstel van 3sides", ""],
          ["Centrale datavoorziening klantcontact", "Afstemmen met het lopende A5-project (centrale datavoorziening klantcommunicatie): wat valt binnen Klant in Zicht", ""],
          ["Centrale datavoorziening klantcontact", "Het CRM-besluit voorbereiden, rond april 2027", ""],
          ["Klantreizen", "Blueprint valideren, door product- en sectormanagers: een naam per validatie noemen en die mensen beschikbaar maken. 3sides bereidt voor, stelt een datum voor en volgt op (ons uitgangspunt; wie inplant is nergens vastgelegd)", ""],
          ["Klantreizen", "Eigenaar van de blueprint na het programma aanwijzen", ""],
          ["0-meting", "Meetmodel valideren: eerst de programma-eigenaar, daarna het MT, en hen daarvoor beschikbaar maken. 3sides bereidt voor, stelt een datum voor en volgt op (ons uitgangspunt; wie inplant is nergens vastgelegd)", ""],
          ["0-meting", "Data-aanleveranciers per datapunt aanwijzen", ""],
          ["0-meting", "Vervolgsessie plannen voor de doelwaarden en de vermogen-KPI's, na de 0-meting", ""],
        ],
        {
          titel: "Wat Cito zelf moet doen",
          groepKolom: 0,
          invulKolom: 2,
          legenda: "Wie: samen in te vullen. Bronnen: overleg 29-09 en 01-10, organigram, stappenplan, plan van aanpak p. 10–13 en de tijdlijn. Wat we van 3sides vragen, staat in de tabel 'Toegezegd en geleverd' (deel 5) en per kader in de evaluatie (deel 8), en komt op de agenda in deel 9.",
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
      "Eerst besluiten we intern, met de verschillen als onderbouwing; wat Cito zelf doet, staat in het actiebord (deel 5). Daarna volgt de evaluatie van 3sides op zes kaders (deel 8): de programma-eigenaar gebruikt die in het evaluatiegesprek met 3sides, en de kern staat los in het tabblad Evaluatie 3sides. Het maandelijkse gesprek met 3sides kijkt vooruit (deel 9).",
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
            "Evaluatie van 3sides: op zes kaders (deel 8), als basis voor het evaluatiegesprek van de programma-eigenaar met 3sides; besluiten wanneer en hoe vaak (voorstel: elke zes weken).",
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
              "Plan van aanpak: 0-meting Q3/Q4 2026; adoptieframework: een volledige nulmeting eind Q3. Tijdlijn: 0-meting oplevering okt, nog niet gestart; 1e sector jan–feb 2027",
              "Eén planning; de verschuiving expliciet vaststellen",
              "Stappenplan · plan van aanpak p. 9 · adoptieframework p. 9 · tijdlijn",
            ],
          ],
          { titel: "Waar het programma en 3sides nog verschillen: de onderbouwing van de besluiten" }
        ),
      ]
    ),

    // 8
    sectie(
      "evaluatie",
      "8 · Evaluatie van 3sides op zes kaders",
      "Na drie maanden Klant in Zicht hebben wij het werk van 3sides geëvalueerd op zes punten: leveren, tempo, rapporteren, ons helpen onze medewerkers mee te nemen, werken in ons framework en onze regie volgen. We stellen voor ze in het gesprek punt voor punt door te lopen. We beginnen bij de lessen uit de evaluatie van Klant in Beeld; daarna staat per punt onze bevinding, met de feiten en hun bron, wat we van 3sides vragen en de vraag voor het gesprek. De maatstaf is wat 3sides zelf heeft opgeschreven: de planning in het eerste voorstel, de resultaten in het eigen plan van aanpak en de maanden in de eigen tijdlijn. Die drie stukken spreken elkaar op datums tegen; waar ze verschillen, noemen we ze alle drie. We kijken naar het werk in de vier werkstromen, de vier delen waarin 3sides het werk indeelt: Adoptieframework (hoe wij onze medewerkers meenemen), Centrale datavoorziening klantcontact (systemen en klantdata), Klantreizen (één klantreis voor heel Cito BV) en 0-meting (de startwaarden van onze KPI's). De vraag is steeds: is het resultaat opgeleverd, ja of nee. In het Doelen-Inspanningennetwerk (DIN), ons ene framework van doelen, baten, vermogens en inspanningen, is dat het niveau van de inspanningen; 3sides noemt het adoptieframework zelf 'Het centrale veranderkundige stuurinstrument' (adoptieframework p. 3). Of de baten al zichtbaar zijn, is hier niet de vraag. Stand van de bronnen: 01-10-2026; het Miro-bord van de klantreizen is bekeken op 05-10-2026.",
      [
        callout(
          "info",
          "Intern: zo lees je de evaluatie",
          "Dit kader staat alleen op het tabblad Evaluatie intern en in de interne export. Naar 3sides gaan per kader alleen de titel, onze bevinding, de feiten, wat we van 3sides vragen en de vraag voor het gesprek, plus het kader Rolverdeling. Intern blijven: wat Cito zelf doet, bij wie de actie ligt, ons oordeel, de notitie en de onderbouwing. De bevinding per kader is een voorstel tot het programmateam heeft geoordeeld: per kader vult het programmateam het eigen oordeel in, met een notitie. Waarnemingen van het programmateam staan erin als waarneming, niet als feit.\n\nVóór het gesprek zelf na te gaan:\n1 · Het stappenplan van 19-08. Ons uitgangspunt bij de rolverdeling steunt erop. Heeft 3sides het ontvangen: in te vullen.\n2 · Het Miro-werkdocument van de klantreizen. Bekeken op 05-10-2026. Erin staan de sectorreizen uit Klant in Beeld (PO in twee frames, VO in drie: school, docent en leerling, 'PRO' in één), één model van zes fasen ('Gelijkenissen Fases'), per fase de drie sectoren naast elkaar met een blok 'GELIJKENISSEN', voor PO en VO één samengevoegde reis met de verschillen en een gewenste klantreis, en de matrix die ook in de blueprint staat. Niet op het bord: een datum, een maker of een status. Of het er in augustus of op 01-10 al zo stond, weten wij dus niet; of het is gevalideerd ook niet. Let op: het werkdocument stond al op de statuspagina van 29-09 en wij hebben het pas op 05-10 geopend. Het oordeel over onderdeel 1 is aan het programmateam: nu 'Nee, deels'; het bord draagt ook 'Ja'.\n3 · De negen collega's die 3sides noemt bij het valideren van de klantreis. Zijn dat productmanagers en sectormanagers: in te vullen.\n4 · De wekelijkse rapportage. Wij hebben één stand van de tijdlijn (bestand van 18-09, stand 28-09). Sinds [datum afspraak] hebben wij de tijdlijn [aantal] keer ontvangen: in te vullen (programmamanagement). Tot dan zegt kader 3 niet of er wekelijks is gerapporteerd.\n5 · Het integratievoorstel van twee collega's dat volgens de statuspagina on-hold is gezet. Wie besloot dat, en is het aan ons voorgelegd: in te vullen.\n6 · Wat 'toegezegd' draagt. De maanden per onderdeel komen uit de tijdlijn van september (bestand van 18-09, stand 28-09), en het plan van aanpak is van 29-09: zeg dus niet dat een maand als augustus vooraf is toegezegd. Wat er vooraf stond, is de lijst voor Q3 2026 in het eerste voorstel van 3sides. Onze bron voor de status van dat voorstel is ons eigen stappenplan van 19-08: 'De mijlpalen komen uit het goedgekeurde 3sides-voorstel'. Na te gaan: de datum van het voorstel, en of de tekst die wij hebben die goedgekeurde versie is: in te vullen. Noem het voorstel tegenover 3sides niet 'goedgekeurd' zolang dat niet is nagegaan. In de externe tekst heet alleen de lijst uit het eerste voorstel 'toegezegd'; de maanden uit de tijdlijn en de resultaten uit het plan van aanpak heten 'opgeschreven'. Het voorstel noemt de zes als het werk van Q3 en zegt 'gereed' alleen bij de mijlpaal: 'in Q3 af' is onze lezing. Het stappenplan staat in de externe tekst alleen nog waar het de enige bron is (de rolverdeling en de formele CRM-keuze rond april 2027): zijn planning is die van het voorstel. Eén verschil: het voorstel zet 'Blueprint Klantreis' in Q3, ons stappenplan laat de klantreis doorlopen tot in Q4; daar kan 3sides op wijzen.\n\nWaar 3sides op kan terugkomen:\n1 · Stappen die wachten op iets van onze kant. Onderdeel 2, analyse van data en applicaties: de stukken van SIO; het doelbeeld (onderdeel 3) bouwt daarop. Onderdeel 4, meetmodel: de validatie door de programma-eigenaar en het MT. Onderdeel 5, funnel: de definities van lead, MQL en verkoopkans. Onderdeel 6, blueprint: de validatie door productmanagers en sectormanagers. Onderdeel 7, data ophalen: wie per datapunt levert. Onderdeel 8, 0-meting: wacht op 4 en 7. Onderdeel 9, adoptieframework: toetsen en vaststellen. Verder: het aanwijzen van adoptieteam, champions en pilotsector, en de Cito-leads en projectgroepen per werkstroom.\n2 · Wie een validatie inplant en opvolgt, is nergens vastgelegd. Een eerder voorstel van ons voor de programmaorganisatie legt het plannen van de sessies bij onze programmamanager.\n3 · Uit geen stuk blijkt dat 3sides de rolverdeling heeft bevestigd. Het stappenplan heeft de status 'eerste schets'.\n4 · De randvoorwaarden in ons KPI-model leggen 'Regie & programmaleiding bij 3sides'.\n5 · Het voorstel van 3sides laat topic leads 'inhoudelijk de leiding' nemen, 'met name op' Processen en Data & Systemen (uit onze samenvatting; alleen het onderdeel Planning van het voorstel is letterlijk bekend).\n6 · De actiepunten van 29-09 hebben geen eigenaar, en de samenvatting van dat overleg is niet door beide partijen vastgesteld.\n7 · In ons overleg van 01-10 is gezegd dat de regie officieel nog bij 3sides ligt en dat de rol van onze programmamanager niet uitdrukkelijk is uitgesproken.\n8 · Augustus: de uren bleven laag door vakanties en afwezigheid, ook aan onze kant.\n9 · Het eerste voorstel legt het eigenaarschap zelf laat: 'Leiderschap neemt eigenaarschap over' en '3sides verschuift naar sparringpartner rol' staan in Q3/Q4 2027, en de mijlpaal van Q2 2027 is 'programma draait zonder constante begeleiding van 3sides' (voorstel 3sides).\n10 · Het latere plan van aanpak heeft datums verlegd: de 0-meting staat daar op 'Q3/Q4' en de pilots op Q1 2027 (plan van aanpak p. 9 en 13). 3sides kan zeggen dat het plan van aanpak het voorstel vervangt. En 'Ambassadeurs geïdentificeerd en aangehaakt' staat in het voorstel in Q4 2026, niet in Q3.\n11 · De stuurgroep. De methodiek laat toe dat een leverancier met een cruciale rol in de programmastuurgroep zit; dat 3sides zichzelf daar zet, is een verschil om te bespreken, geen bewijs van niet volgen.\n12 · Gemelde belemmeringen. Dat 3sides een belemmering op de statuspagina meldt en niet in de tijdlijn, is geen tekortkoming in het melden: volgens de methodiek verdient wie om hulp vraagt lof. Het punt is alleen de plek.\n13 · De één-op-één gesprekken. Volgens een eerdere controle van de transcriptie gaf 3sides daar op 29-09 een reden voor (mensen spreken in een groep niet vrijuit; er was nog geen intern team): niet zelf nagelezen, na te gaan.\n14 · Het adoptieframework als werkstroom. In de methodiek is adoptie de veranderstrategie, de aanpak in elke werkstroom; of het een eigen werkstroom blijft, is bij ons nog een open voorstel (de plaat in twee versies).\n15 · Medewerkers meenemen. In de methodiek is dat van de lijn, ondersteund door een veranderteam; 3sides faciliteert. Kader 4 vraagt daarom of 3sides ons helpt, niet of 3sides het doet.\n\nKlant in Beeld: wat alleen intern is:\n0 · De respons. 13 deelnemers hebben geantwoord (statuspagina: 'onder 13 deelnemers'); volgens onze opgave waren er 34 aangeschreven. Het aantal van 34 is een opgave van het programmateam (05-10-2026) en staat niet in de Excel; 3sides hield de vragenlijst en kent het precieze aantal: vóór het gesprek na te gaan. De uitkomsten zeggen niets over de 21 die niet antwoordden.\n1 · Wiens lessen het zijn. De antwoorden wijzen zelden iemand aan. Op de directe vraag naar de samenwerking met 3sides antwoorden 10 van de 13 positief of neutraal; 'geïnformeerd vanuit 3sides' scoort gemiddeld 6,2 en 'vanuit Cito' 5,6. Eigenaarschap ('het is onduidelijk wie daar de lead in zou moeten nemen'), tijd en capaciteit van collega's en het informeren liggen ook bij ons.\n2 · Eerdere terugkoppeling. In ons overleg van 01-10 is door één deelnemer gezegd dat het aansluiten op wat voor collega's nieuw is al tijdens Klant in Beeld aan 3sides is teruggegeven, en dat het kleiner en praktischer maken toen bij één onderdeel redelijk is gelukt. Eén persoon, geen datum, geen stuk: hooguit als vraag in het gesprek.\n3 · Wat de plaat van de town hall weglaat. Zij noemt drie punten: 'De waan van de dag kreeg soms voorrang', 'Kost veel tijd in verhouding tot de opbrengst' en 'Gevoel van eigenaarschap' (BV-dag p. 4). Wat deelnemers over de begeleiding zelf schreven (korter, minder 'hoog over', concreter) staat er niet op, en toegepaste methodes staan er als opbrengst, terwijl 2 van de 13 een methode toepasten.\n4 · Het voorstel van 3sides. In de samenvatting die wij hebben staat 'Quick-wins direct implementeren' en 'niet wachten tot het einde'; het origineel is niet gelezen. In de antwoorden van de deelnemers komt het woord quick win niet voor.\n5 · Waar het wel lukte. De drie deelnemers die het doel behaald vinden, komen uit één deeltraject. Niet delen: de groep is herleidbaar.\n6 · Nog te doen: de teamleden die aan Klant in Beeld meededen, kijken de nuances na (gevraagd op 01-10).\n\nWat Cito zelf doet, staat per kader onder 'Wat Cito zelf doet (intern)' en op het actiebord."
        ),
        callout(
          "let-op",
          "De kern van deze evaluatie",
          "Wij hebben als programmateam in de eerste drie maanden geen beeld in hoofdlijnen gehad van waar 3sides aan werkte en hoe ver elke oplevering was. Aan het eind van het kwartaal kregen wij veel documenten tegelijk onder ogen, en uit die stukken hebben wij achteraf zelf moeten opmaken wat er ligt. Dat maakt het moeilijk om te beoordelen wat er van de toegezegde opleveringen af is. Dit is onze eigen waarneming; de feiten eronder zijn deze. De werkdocumenten staan op de statuspagina, de webpagina waarop 3sides voortgang en documenten deelt, met de datums 28 en 29 september. De tijdlijn, de Excel waarin 3sides per onderdeel de planning en de voortgang bijhoudt, zet in de stand van 28-09 geen enkel onderdeel op 'Completed'. En wat vastzit, staat op de statuspagina en niet in de tijdlijn (statuspagina 3sides, stand 29-09 en 01-10; tijdlijn, stand 28-09). Wat wij daarom als eerste vragen: dat wij tijdens het kwartaal per oplevering kunnen zien waar 3sides aan werkt, hoe ver het is en wat in de weg staat: in de tijdlijn, elke week, met tussenversies zodra die er zijn. De zes punten van deze evaluatie werken dit uit."
        ),
        callout(
          "besluit",
          "Rolverdeling",
          "Ons uitgangspunt: wij leiden, 3sides volgt en voert uit, niet andersom. Zo staat het in ons stappenplan voor de analysefase van 19-08-2026, onder 'Onze opdracht aan 3sides': 'wij voeren de regie' en 'Cito is opdrachtgever: wíj bepalen wat er nodig is, 3sides levert daarop'. Wij bepalen wat het resultaat moet zijn, toetsen het en beslissen. 3sides stelt het plan van aanpak op, levert en regelt de stappen uit het eigen plan. Het stappenplan vraagt van 3sides de inhoudelijk trekkers voor Data & Systemen en Processen, een plan van aanpak per domein 'volgens ónze prioritering', het voorbereiden en faciliteren van de sessies en een wekelijkse rapportage; de regie blijft bij ons.\n\nIn de stukken van 3sides staat: per werkstroom zijn doel, scope, activiteiten en mijlpalen uitgewerkt, met ons programmamanagement is afgesproken wekelijks te rapporteren en belemmeringen zo vroeg mogelijk te signaleren, en wij hebben 3sides uitdrukkelijk gevraagd het tempo erin te houden (statuspagina 3sides, stand 01-10). Toetsen en valideren met stakeholders is een stap in de eigen aanpak van 3sides (plan van aanpak p. 7 en 9).\n\nAan dit uitgangspunt toetsen we het werk van 3sides in de zes kaders van deze evaluatie."
        ),
        callout(
          "besluit",
          "Startpunt: de lessen uit Klant in Beeld",
          "Klant in Zicht bouwt voort op Klant in Beeld, het voortraject over klantreizen dat 3sides ook begeleidde. We waarderen dat 3sides dat traject zelf heeft geëvalueerd, met een vragenlijst die 13 deelnemers hebben ingevuld, de antwoorden met ons heeft gedeeld en op de town hall van 22 september heeft gezegd dat het niet altijd soepel ging (statuspagina 3sides, stand 01-10; BV-dag p. 4). Op de vraag of het doel is behaald antwoorden 3 van die 13 ja en 10 nee; 8 vinden de tijd het waard en 5 niet (evaluatie Klant in Beeld). Volgens onze opgave waren er 34 deelnemers aangeschreven; wat hier staat, gaat alleen over de 13 die hebben geantwoord. Over de samenwerking met 3sides zelf zijn de meeste deelnemers positief of neutraal. Eén deelnemer schreef dat het vervolg voor de grote groep niet te volgen was: 'Er is nog een klein groepje bezig, maar daar krijgen we niets van mee'. Twee anderen schreven over de afspraken: 'te weinig opvolging van voorgaande afspraken van eerdere sessies' en 'afspraken zijn niet concreet gemaakt' (evaluatie Klant in Beeld). Dat zijn drie van de dertien antwoorden, geen patroon; wij noemen ze omdat zicht op het werk en opvolging ook nu ons eerste punt zijn. Bij de meeste punten schrijven de deelnemers niet aan wie het lag. Wij lezen ze als lessen voor het vervolg en leggen ze naast wat we na drie maanden Klant in Zicht zien.\n\nEén punt uit de evaluatie zien we terug in de stukken van 3sides: het concreet maken en afmaken. Het tempo speelt opnieuw, in een andere vorm: toen ging het om de tijd in de sessies, nu om opleverdatums. Eén sterk punt van Klant in Beeld, samenwerken over afdelingen heen, is nog niet de werkwijze in Klant in Zicht. De evaluatie is van september: we verwachten niet dat alles op 1 oktober is verwerkt. We willen de lessen terugzien in de planning van het vierde kwartaal."
        ),
        tabel(
          ["Les", "Wat deelnemers schreven", "Wat we nu zien in Klant in Zicht", "Onze vraag aan 3sides"],
          [
            [
              "Maak het concreet en maak het af",
              "Zeven van de dertien deelnemers schrijven dat een concreet vervolg of resultaat uitbleef; vijf gebruiken in hun kritiek het woord concreet. 'Omdat het bij ideeën lijkt te zijn gebleven', 'Scherper doelen formuleren en sneller concreet worden', 'Afmaken waar we aan begonnen zijn' (evaluatie Klant in Beeld)",
              "Dit zien we terug. Van de onderdelen met een oplevermaand in augustus of september hebben wij het resultaat niet gezien zoals het plan van aanpak het beschrijft (kader 1), en vier van de eerste vijf opleveringen noemt 3sides zelf 'Draft': de blueprint klantreis, het meetplan, de praatplaat funnel en de praatplaat technologielandschap (statuspagina 3sides, stand 01-10). In het overleg van 29-09 is de keuze toegelicht: eerst de basis, daarna stap voor stap met teams (overleg 29-09, transcriptie). Die keuze past bij een andere les uit de evaluatie, 'te veel op symptomen ingingen in plaats van het kernprobleem', maar schuift het concrete resultaat op. De eerste toepassing, de pilotgroep in één sector, stond in het eerste voorstel van 3sides in Q3 2026 (voorstel 3sides, planning Q3 2026); het plan van aanpak noemt Q4 2026 voor 'toegepast binnen eerste pilotgroep' en Q1 2027 voor 'Pilots sectoren' (plan van aanpak p. 11 en 13)",
              "Welk eerste concrete resultaat merken onze medewerkers, de deelnemers van Klant in Beeld en hun collega's, vóór eind december, en bij welk onderdeel van de tijdlijn hoort het?",
            ],
            [
              "Houd het tempo",
              "Negen van de dertien noemen tijd of tempo: 'Ik heb het idee dat het sneller had gekund', 'het had iets meer to the point gemogen van mij'. Acht van de dertien vinden de tijd het wel waard (evaluatie Klant in Beeld)",
              "Tempo speelt opnieuw, in een andere vorm: toen ging het om de tijd in de sessies, nu om opleverdatums. Deze les lag er bij de start al. 3sides schrijft: 'Uit Klant in Beeld hebben we geleerd dat projecten bij Cito soms lang doorlopen', en wij hebben daarom gevraagd het tempo erin te houden (statuspagina 3sides, stand 01-10). Drie onderdelen zijn op 01-10 over hun oplevermaand heen, zonder nieuwe datum in de laatste stand van de tijdlijn die wij hebben: Klant in Beeld-klantreizen samenvoegen, analyse van data en applicaties, en meetmodel ontwikkelen; visie en consequenties alleen tegen de tijdlijn, niet tegen het plan van aanpak (tijdlijn, stand 28-09; plan van aanpak p. 7)",
              "Wat doet 3sides in Klant in Zicht anders om het tempo te houden, naast de beschikbaarheid van het team?",
            ],
            [
              "Werk samen, over afdelingen heen (dit ging goed)",
              "Dit noemen deelnemers als sterk punt, ten minste zes van de dertien: 'omdat we voor het eerst met verschillende disciplines samen zaten', 'multidisciplinaire samenwerking' (evaluatie Klant in Beeld)",
              "Dit is nog niet de werkwijze in Klant in Zicht. 3sides noemt het zelf als opbrengst: 'Waardevolle samenwerking tussen afdelingen, voor het eerst gezamenlijk om tafel' (BV-dag p. 4). Volgens de samenvatting van het overleg zijn de gesprekken tot nu toe 'voornamelijk individueel gevoerd'; projectgroepen per werkstroom staan sinds 29 september als actie genoteerd (overleg 29-09). Werksessies per klantreisfase staan in het adoptieframework (adoptieframework p. 11)",
              "Wat uit de werkwijze van Klant in Beeld neemt 3sides mee naar Klant in Zicht, en wanneer starten de werksessies?",
            ],
            [
              "Sluit aan op waar wij staan",
              "Meerdere deelnemers. 'goed georganiseerd, inhoudelijk kundig, leuke mensen', en in hetzelfde antwoord: 'Cito is geen marketingorganisatie.' Een ander: 'Soms te uitgebreid, \"hoog over\" en langdradig' (evaluatie Klant in Beeld)",
              "Hierover is op 29-09 gesproken: een vertaling per doelgroep is nodig, en een begrippenlijst staat als actie genoteerd (overleg 29-09). De stukken van vóór dat overleg hebben die vertaling nog niet: het adoptieframework gebruikt het Engelstalige SMILE-model van 3sides (adoptieframework p. 12 en 13). In ons programmateam is gezegd dat het adoptieframework 'hoogover' blijft (overleg 01-10)",
              "Welke les trekt 3sides hier zelf uit voor de eigen begeleiding?",
            ],
            [
              "Haal de klant zelf erbij",
              "Meerdere deelnemers: 'hebben we veel te weinig input bij de klanten zelf opgehaald', 'Er wordt nog steeds niet vanuit de klant gedacht.' (evaluatie Klant in Beeld)",
              "Het adoptieframework neemt de klantreis als vertrekpunt, 'Het gaat om wat de klant probeert te bereiken' (adoptieframework p. 6), en vertaalt die naar gewenst gedrag van medewerkers (adoptieframework p. 3). De klant zelf komt daarin niet aan het woord. Een stap waarin klanten zelf worden gevraagd, vinden wij in het plan van aanpak en het adoptieframework niet: de blueprint wordt 'gevalideerd door product managers en sector managers' (plan van aanpak p. 10). De klant komt wel terug in de meting, via de NPS (meetinstrument p. 8), en het eerste voorstel van 3sides noemt 'Co-creatiesessies met klanten' in Q2 2027 (voorstel 3sides). Dit is onze lezing van de stukken",
              "Waar in de aanpak komt de klant zelf aan het woord, en wanneer?",
            ],
            [
              "Zorg dat het in het eigen werk terechtkomt",
              "Op de vraag of zij een methode in het eigen werk hebben toegepast, antwoorden 2 deelnemers ja en 11 nee; 7 van die 11 zijn het wel van plan. 'ik zou niet weten welke' (evaluatie Klant in Beeld)",
              "Nog niet te toetsen: de playbook-workshops starten volgens de tijdlijn in december (tijdlijn, stand 28-09). 3sides wil adoptie straks met een vergelijkbare vraag meten: 'Doen mensen mee? Doen mensen iets anders? Heeft het effect?' (adoptieframework p. 7)",
              "Wat doet 3sides in de playbook-workshops anders dan in Klant in Beeld, zodat deelnemers het in hun eigen werk gebruiken?",
            ],
          ],
          {
            titel: "De lessen uit Klant in Beeld naast wat we nu zien",
            legenda: "Bron: de evaluatie van Klant in Beeld, een vragenlijst, ingevuld door 13 deelnemers, van 1 tot en met 10 september 2026; volgens onze opgave waren er 34 aangeschreven. De citaten zijn letterlijk. De aantallen bij de gesloten vragen zijn geteld uit de vragenlijst; de tellingen per les zijn van ons, uit de open antwoorden.",
          }
        ),
        tekst(
          "Onze vraag voor het gesprek: welke drie lessen haalt 3sides zelf uit de evaluatie van Klant in Beeld, en waar zien wij elk daarvan vóór eind december terug in Klant in Zicht: in welk onderdeel van de tijdlijn en met welke datum?"
        ),
        {
          type: "evaluatie",
          titel: "",
          intro: "",
          rolCito: "leidt: bepaalt, toetst en beslist",
          rol3sides: "volgt en voert uit: stelt op, levert, regelt de stap",
          kaders: [
            {
              id: "levert",
              titel: "1 · Levert 3sides wat het heeft toegezegd?",
              ondertitel: "zes toezeggingen uit het eerste voorstel en negen onderdelen uit de tijdlijn van 3sides, getoetst aan het eigen plan van aanpak",
              vraag: "Ligt het resultaat er, ja of nee: van de zes toezeggingen voor Q3 2026 uit het eerste voorstel, en van de negen onderdelen uit de tijdlijn met een oplevermaand tot en met oktober? Zeven van de negen toetsen we aan een resultaat in het plan van aanpak van 3sides (2, 3, 4, 6, 7, 8 en 9); bij visie en consequenties (3) is die koppeling onze lezing. Bij klantreizen samenvoegen (1) staat het alleen onder aanleiding en doel, en voor het marketing- en salesproces en de funnel (5) noemt dat plan geen oplevering. De zes staan bij naam in het eerste punt, de negen in het tweede.",
              beeld: "Nee, deels: van de zes onderdelen die het eerste voorstel van 3sides in Q3 2026 zette, was er op 01-10 één, de kick-off; van drie ligt een concept en twee zijn niet gestart. Van de negen onderdelen die in de tijdlijn van 3sides uiterlijk in oktober af moeten zijn, hebben wij er geen gezien zoals het eigen plan van aanpak het beschrijft, en 3sides zet er zelf geen op 'Completed'. Dit is de kern van de evaluatie: wat af is, hebben wij achteraf zelf uit de stukken moeten opmaken.",
              actieBij: "3sides en Cito",
              punten: [
                "Het eerste voorstel van 3sides is het voorstel voor 2026 en 2027, met een planning per kwartaal. Het zet zes onderdelen in Q3 2026: de kick-off, de blueprint klantreis (één klantreis voor heel Cito BV), de nulmeting (de startwaarde van onze KPI's), het adoptieframework (het plan om onze medewerkers mee te nemen), de inventarisatie van het CRM en een pilotgroep in één sector. Op 01-10 was er één: de kick-off. Van de blueprint, het adoptieframework en de inventarisatie ligt een concept; de nulmeting en de pilotgroep zijn niet gestart, en de mijlpaal 'adoptie-framework gereed en gedragen door DIN-programmateam' is niet gehaald. Wat er per toezegging ligt en wat ontbreekt, staat in de tabel 'Toegezegd en geleverd' in deel 5 (voorstel 3sides, planning Q3 2026; statuspagina 3sides, stand 01-10; tijdlijn, stand 28-09).",
                "In de tijdlijn van 3sides hebben negen onderdelen een oplevermaand tot en met oktober. Wij nummeren ze, ook in de tabel in deel 5: 1 Klant in Beeld-klantreizen samenvoegen (augustus), 2 analyse van data en applicaties (september), 3 visie en consequenties (september), 4 meetmodel ontwikkelen (september), 5 marketing- en salesproces en funnel (oktober), 6 blueprint: fasen en hoofdstappen (oktober), 7 data ophalen voor het meetmodel (oktober), 8 0-meting (oktober), 9 adoptieframework opstellen (oktober). Zeven horen bij een toezegging uit het eerste voorstel; visie en consequenties en het marketing- en salesproces niet (tijdlijn, stand 28-09).",
                "3sides noemt zelf niets af. In de tijdlijn staat geen van deze negen op 'Completed', en op de statuspagina noemt 3sides vier van de eerste vijf opleveringen 'Draft': de blueprint klantreis, het meetplan met de definities voor de 0-meting, de praatplaat funnel en de praatplaat technologielandschap; de vijfde heet 'Adoptieplan'. Alleen in Jira, het takenbord van 3sides, is bij de blueprint een klein deel afgerond; welk onderdeel dat is, staat niet op de schermafdruk. Daardoor kunnen wij uit de stukken van 3sides niet opmaken dat een onderdeel af is (tijdlijn, stand 28-09; statuspagina 3sides, stand 01-10; plan van aanpak p. 5).",
                "Klant in Beeld-klantreizen samenvoegen (augustus): deels gedaan. Het doel is van de losse klantreizen per sector één klantreis te maken. Op het Miro-bord, het digitale werkbord van 3sides, staan de klantreizen van PO, VO en Zakelijk/Professionals (op het bord 'PRO') per fase naast elkaar, met de gelijkenissen en één model van zes fasen. De samengevoegde reis per stap is er voor PO en VO, niet voor Zakelijk/Professionals. Het bord heeft geen datum en geen status, en 3sides heeft het onderdeel zelf nog op 'In progress' (Miro-bord klantreis, bekeken 05-10-2026; tijdlijn, stand 28-09).",
                "Analyse van data en applicaties (september): deels. Het plan van aanpak belooft 'Een compleet overzicht van de huidige systemen, koppelingen, eigenaren en kosten'. Er ligt een plaat van het applicatielandschap met de systemen en een deel van de koppelingen; eigenaren en kosten staan er niet op. 3sides noemt als reden dat het van SIO 'geen overzicht of requirementsdocumenten of architectuurplaten' heeft ontvangen (plan van aanpak p. 6; Data & Tech, 28-09; statuspagina 3sides, stand 01-10).",
                "Visie en consequenties, en meetmodel ontwikkelen (beide september in de tijdlijn). Visie en consequenties lezen wij als wat het plan van aanpak 'Een gewenst doelbeeld met een set ontwerpprincipes' noemt: hoe het technologielandschap eruit moet gaan zien. Een doelbeeld vinden wij niet in de stukken; wel losse inzichten en de platen op de town hall, de bijeenkomst voor alle medewerkers van 22 september, over de complexiteit en 'De prijs van niets doen'. Het plan van aanpak geeft hier zelf Q3/Q4 voor: tegen dat plan is het niet te laat. Het meetmodel beschrijft wat wij meten, van doelen tot inspanningen. Er ligt een concept van 16 p.; het plan zegt dat het met stakeholders wordt gevalideerd, en dat zien wij in de stukken niet terug: 3sides kondigt het aan voor 'de komende maand'. Zonder die validatie staat niet vast wat wij gaan meten (plan van aanpak p. 6, 7 en 9; statuspagina 3sides, stand 29-09 en 01-10; BV-dag p. 5 en 6; meetinstrument, 28-09).",
                "De vijf onderdelen van oktober zijn een tussenstand: die maand liep op 01-10 nog. Bij het marketing- en salesproces en de funnel liggen twee praatplaten, bij de blueprint een concept dat nog niet is gevalideerd, bij het ophalen van de data een lijst van circa 85 datapunten, en bij het adoptieframework een werkdocument waarvan één van de vijf lagen is uitgewerkt. De 0-meting, het meten van de startwaarden, staat op 'Not started', zonder startmaand. Met wat er voor de 0-meting ligt, kunnen wij nog niet meten: elke baten-KPI, de KPI's waarmee wij de baten van het programma volgen, heeft nog 'Nulmeting Q3' als startwaarde, en alleen de jaarverslagcijfers hebben een waarde (tijdlijn, stand 28-09; meetinstrument p. 7; datapunten, 24-09; adoptieframework p. 15).",
              ],
              aanZet3sides: "Vóór het gesprek per onderdeel van de negen op één regel aangeven: is het af, en zo ja waar zien wij het resultaat; zo nee wat komt er nog en op welke datum. Voor het samenvoegen van de klantreizen: zeggen of het Miro-bord het resultaat is, en zo ja het onderdeel op 'Completed' zetten. Voor visie en consequenties: zeggen welke datum geldt, september uit de tijdlijn of Q3/Q4 uit het plan van aanpak.",
              aanZetCito: "Bij zes van de negen onderdelen wacht 3sides ook op ons. Wij moeten: de stukken van SIO aanleveren of vaststellen dat ze niet bestaan (analyse van data en applicaties); het meetmodel valideren; de definities van lead, MQL en verkoopkans vaststellen (funnel); de blueprint laten valideren door productmanagers en sectormanagers; per datapunt aanwijzen wie het levert; en het adoptieframework toetsen en vaststellen. De 0-meting wacht op het meetmodel en de data, het doelbeeld op de analyse.",
              vraag3sides: "Wat is er volgens jullie af van wat voor Q3 was gepland, en waar kunnen wij dat zien?",
              secties: [
                { label: "Toezegging (bron)", tekst: "De oplevering per werkstroom staat in het plan van aanpak (p. 6, 8, 10 en 12), de maand per onderdeel in de tijdlijn (tab v3, stand 28-09). 3sides noemt vier van de vijf eerste opleveringen van juli tot en met september zelf 'Draft' (blueprint klantreis, meetplan met 0-metingdefinities, praatplaat funnel, praatplaat technologielandschap); de vijfde heet 'Adoptieplan' (statuspagina 3sides, stand 01-10)." },
                { label: "Eerste voorstel van 3sides (bron)", tekst: "Alleen het onderdeel Planning van het eerste voorstel is letterlijk bekend (tekst van 3sides uit de gedeelde documentruimte; datum: in te vullen; of dit de goedgekeurde versie is: in te vullen). Q3 2026, 'Van framework naar eerste beweging': 'Kickoff en stakeholder alignment', 'Blueprint Klantreis', 'Nulmeting', 'Adoptie-framework bouwen (doelgroepen, barrières, meetaanpak)', 'Inventarisatie CRM', 'Pilotgroep starten (1 sector, bijv. VO of Zakelijk)', met 'Mijlpaal: adoptie-framework gereed en gedragen door DIN-programmateam'. Q4 2026: 'Richting CRM bepaald en afgestemd', 'Journey-vertaling naar CRM-input en funnelprocessen', 'Ambassadeurs geïdentificeerd en aangehaakt', 'Eerste intervisiegroepen live (start uitvoering adoptie framework)', 'Uitrol naar tweede sector', met 'Mijlpaal: pilot draait, eerste gedragsdata beschikbaar'. Stand op 01-10 per Q3-onderdeel: zie de tabel 'Toegezegd en geleverd' in deel 5. 'Inventarisatie CRM': 3sides meldt 'CRM-proces en implementatie: eerste evaluatie afgerond', met het vervolg 'currently in progress' (statuspagina 3sides, stand 01-10); op de town hall stond het afronden van de inventarisatie bij 'De komende 90 dagen' (BV-dag p. 9). Wat 3sides hierop kan zeggen: het latere plan van aanpak zet de 0-meting op 'Q3/Q4' en de pilots op Q1 2027 (plan van aanpak p. 9 en 13). Ons eigen stappenplan van 19-08 sluit aan op dit voorstel: 'De mijlpalen komen uit het goedgekeurde 3sides-voorstel' (stappenplan). Het komt overeen op de nulmeting, het adoptieframework, het in kaart brengen van het CRM en de pilot in één sector in Q3, op de tweede sector, de richting van het CRM, de ambassadeurs en de intervisiegroepen in Q4, en op de derde sector in Q1 2027; ook de twee mijlpalen zijn dezelfde. Het verschilt op de klantreis: het voorstel zet 'Blueprint Klantreis' in Q3, het stappenplan zet de klantreis en de funnelprocessen in Q3–Q4. Het stappenplan voegt toe: het meetprotocol per baten-KPI, de inspanningsleiders en teams, de vervolgsessie en de quick wins. De richting van het CRM en de vertaling van de klantreis staan in het voorstel in Q4, in de tijdlijn in november: dat komt overeen. Het training- en coachingsprogramma staat in het voorstel in Q1 2027, in de tijdlijn van april tot juni 2027." },
                { label: "1 · Klant in Beeld-klantreizen samenvoegen · augustus, verstreken", tekst: "Nee, deels. In de tijdlijn heet het onderdeel 'Consollideren journey workshop Klant in Beeld'; wij lezen dat als: de afzonderlijke klantreizen uit Klant in Beeld samengebracht in 'één integrale Cito BV klantreis' (plan van aanpak p. 10, onder aanleiding en doel; het is geen apart resultaat). Ligt er: 3sides meldt 'Bestaande sectorreizen uit Klant in Beeld zijn verzameld als basis voor één organisatiebrede klantreis' (statuspagina 3sides, stand 29-09); in het overleg is gezegd dat het materiaal 'op één hoop' is gelegd en 'vertaald naar een blueprint' (overleg 29-09, transcriptie); de blueprint bevat één klantreis (blueprint, tab Klantreis fasen, 24-09). Op het Miro-bord, bekeken op 05-10-2026: de sectorreizen uit Klant in Beeld (PO in twee frames, VO in drie: school, docent en leerling, 'PRO' in één), één model van zes fasen ('Gelijkenissen Fases'), per fase de drie sectoren naast elkaar met een blok 'GELIJKENISSEN', voor PO en VO één samengevoegde reis met de verschillen en een gewenste klantreis, en de matrix die ook in de blueprint staat (Miro-bord klantreis, bekeken 05-10-2026). Waarom nu nog 'Nee, deels' (het oordeel is aan het programmateam en nog niet genomen): de samengevoegde reis per stap is er voor PO en VO, niet voor 'PRO', en 3sides noemt het onderdeel zelf nog niet af: de tijdlijn zegt 'In progress' met status +/- (stand 28-09). Wat voor 'Ja' pleit: het plan van aanpak vraagt hier geen validatie en geen apart resultaat, en het samenvoegen is voor de drie sectoren te volgen. Het bord draagt geen datum en geen status: of het er in augustus of op 01-10 al zo stond, weten wij niet. In Jira is een klein deel van de blueprint afgerond; welk item dat is, is niet te zien (voortgangsbalk, plan van aanpak p. 5). Waarneming uit het overleg van 01-10: twee deelnemers hadden het samengevoegde resultaat niet gezien; een derde, die bij drie validatiesessies was, had er iets van gezien en zei 'dit is wat mij betreft niet behaald', zonder reden; of dat op het samenvoegen slaat of op de validatie, is uit de transcriptie niet zeker. Vraag aan 3sides: is het Miro-bord het resultaat van het samenvoegen; zo ja 'Completed' zetten, zo nee zeggen wat er nog komt, met een datum." },
                { label: "2 · Analyse van data en applicaties · september, verstreken", tekst: "Nee, deels. Volgens 3sides: 'Een compleet overzicht van de huidige systemen, koppelingen, eigenaren en kosten' (plan van aanpak p. 6), via lijsten, werksessies met eigenaren en gebruikers en het verzamelen van kosten en contracten (p. 7). Ligt er: de Data & Tech-plaat als werkdocument (28-09), zonder eigenaren en kosten; de koppelingen staan er deels in. De evaluatie van het klantadviesproces is afgerond en de eerste evaluatie van het CRM-proces ook (statuspagina 3sides, stand 01-10). 3sides zelf: 'Work-In-Progress en wordt continue bijgewerkt', 'We hebben nog niet alle informatie die we nodig hebben' (statuspagina 3sides, stand 01-10); op de town hall van 22-09 zette 3sides het afronden van de inventarisatie in 'De komende 90 dagen' (BV-dag p. 9). Belemmering volgens 3sides: 'Tot nu toe geen overzicht of requirementsdocumenten of architectuurplaten ontvangen van SIO' (statuspagina 3sides, stand 01-10). In het overleg van 01-10 herkend: 'meer praatplaten, maar nog niet echt een concrete analyse' (waarneming)." },
                { label: "3 · Visie en consequenties · september, verstreken", tekst: "Nee. In de tijdlijn heet het onderdeel 'Visie & Consequentie'; wij lezen dat als 'Een gewenst doelbeeld met een set ontwerpprincipes' (plan van aanpak p. 6). Onder geen van de zes toezeggingen voor Q3 uit het eerste voorstel te plaatsen, net als onderdeel 5. Ligt er: geen doelbeeld en geen ontwerpprincipes in de stukken; wel losse inzichten ('Het technologielandschap is complexer dan past bij de omvang van Cito', 'Er is geen platform of architectuurteam dat de integratie bewaakt') en de opmerking dat een doelarchitectuur nog bepaald moet worden (statuspagina 3sides, stand 01-10). Datum: de tijdlijn zegt september, het plan van aanpak zelf 'Q3/Q4: ontwikkelen doelbeeld en keuzes' (p. 7): volgens het eigen plan heeft 3sides nog Q4. In Jira: In Progress (plan van aanpak p. 5)." },
                { label: "4 · Meetmodel ontwikkelen · september, verstreken", tekst: "Nee, deels. Volgens 3sides: 'Een compleet overzicht van het meetmodel', van doelen via baten naar vermogens en inspanningen (plan van aanpak p. 8), opgesteld én gevalideerd met stakeholders (p. 9). Ligt er: het concept als werkdocument van 16 p. (meetinstrument, 28-09): meetmodel p. 5, KPI's per niveau p. 6–11, scores per kernprincipe p. 12; op de statuspagina 'Draft meetplan + 0 meeting definities' (statuspagina 3sides, stand 01-10). Ontbreekt: de validatie. 3sides: 'stakeholders worden nu meegenomen om te valideren en buy-in te krijgen. Dit gebeurt in de komende maand met de stakeholders' (statuspagina 3sides, stand 29-09). Het actiepunt 'Meetmodel valideren met Meryl als opdrachtgever en daarna met het MT' heeft in de samenvatting van het overleg geen eigenaar en geen datum (overleg 29-09). In Jira staat de voortgangsbalk van Succes meten nog geheel op niet gestart (plan van aanpak p. 5)." },
                { label: "5 · Marketing- en salesproces en funnel · oktober", tekst: "Nee, deels; de oplevermaand loopt nog. Volgens 3sides: oplevering in oktober (tijdlijn); het plan van aanpak noemt geen aparte oplevering voor funnel en salesproces (p. 6 noemt vijf resultaten, zonder funnel), dus wat hier 'geleverd' is, is niet vastgelegd. Ligt er: twee praatplaten van 28-09, de praatplaat funnel met een blok 'Nog afstemmen' en de praatplaat proces met open vragen; 'Klant funnel + processen, eerste versie bijna afgerond' en 'Vervolg sessie staat nog gepland' (statuspagina 3sides, stand 01-10). Ontbreekt: de vervolgsessie met de programma-eigenaar en de definities van lead, marketing qualified lead en verkoopkans, die bij Cito nog niet uniform zijn (statuspagina 3sides, stand 01-10; overleg 29-09)." },
                { label: "6 · Blueprint: fasen en hoofdstappen · oktober", tekst: "Nee, deels; de oplevermaand loopt nog. Volgens 3sides: een compleet matrixoverzicht van fasen, klantdoelen, hoofdstappen, kernwaarden en kernprincipes, 'gevalideerd door product managers en sector managers' (plan van aanpak p. 10); het plan zet 'Blueprint gevalideerd en toegepast binnen eerste pilotgroep' in Q4 2026 (plan van aanpak p. 11). Ligt er: de blueprint met zes fasen (bewustwording, overweging en oriëntatie, aankoop, onboarding, gebruik, evaluatie) en elf subfasen (behoefte, verkennen, beslissen, bestellen, activeren en inrichten, voorbereiding, trainen en informeren, afname, rapportage, klanttevredenheid, renewal), met een klantdoel per fase en een hoofdstap per subfase (blueprint, tab Klantreis fasen, 24-09); 'De eerste versie van de fasen en stappen in de klantreis is vastgelegd' (statuspagina 3sides, stand 29-09). Ontbreekt: de formele validatie. 3sides meldt 'Diverse bijeenkomsten' met negen mensen 'om de klantreis te valideren' (statuspagina 3sides, stand 29-09); of dat productmanagers en sectormanagers zijn, staat in geen stuk. Het actiepunt 'Blueprint klantreis valideren met productmanagers en sectormanagers' staat open, zonder eigenaar en zonder datum (overleg 29-09)." },
                { label: "7 · Data ophalen voor het meetmodel · oktober", tekst: "Nee, deels; de oplevermaand loopt nog, status rood. Volgens 3sides: 'Gedetailleerde data punten verzameling (data ophalen)' (plan van aanpak p. 8), via werksessies met eigenaren en gebruikers (p. 9). Ligt er: de datapuntenlijst van circa 85 datapunten met eenheid; bij 9 een naam of rol, bij twee blokken van samen 30 datapunten één naam, en bij 8 van de 14 baten-KPI's een naam (datapunten, 24-09); alleen de jaarverslagcijfers hebben waarden, verder staat er geen enkele meetwaarde in. 3sides meldt 'Eerste datapunten opgehaald (NPS)'; die waarden staan niet in de aangeleverde stukken. Het data-overzicht voor de 0-meting is met de programmamanager gedeeld (statuspagina 3sides, stand 29-09). In de tijdlijn staat dit onderdeel op '-' zonder toelichting wat er vastzit (stand 28-09)." },
                { label: "8 · 0-meting · oktober", tekst: "Nee: niet gestart. Volgens 3sides: een 0-meting op de programma-KPI's, de baten-KPI's per sector en voor de BV en de klantreis-KPI's binnen de vijf kernprincipes (plan van aanpak p. 8–9), 'Q3/Q4 2026: 0-meting gerealiseerd' (p. 9). Het eerste voorstel zet de 'Nulmeting' in Q3 2026 (voorstel 3sides); in het meetinstrument staat 'Nulmeting Q3' als startwaarde bij elke baten-KPI (meetinstrument p. 7; die tabel is overgenomen uit het KPI-model van Cito); het adoptieframework noemt als succes voor eind Q3: 'Een volledige nulmeting beschikbaar is voor mens, proces, data en cultuur' (adoptieframework p. 9). Ligt er: geen startwaarde per baten-KPI en geen score per kernprincipe; wel de jaarverslagcijfers en, volgens 3sides, eerste NPS-datapunten (zie 7). Tijdlijn: 'Not started', status '-', oplevering oktober, geen startmaand (stand 28-09). Oktober valt binnen het Q3/Q4 van het plan van aanpak. Op de town hall van 22-09 stond bij 'De komende 90 dagen' voor de 0-meting: '0 Meting: we bepalen de cijfers waarop we gaan meten' (BV-dag p. 9): eerst nog de cijfers bepalen, dan pas meten. Voorwaarden: een gevalideerd meetmodel (4) en de opgehaalde data (7)." },
                { label: "9 · Adoptieframework opstellen · oktober", tekst: "Nee, deels; de oplevermaand loopt nog. Volgens 3sides: het adoptieframework gerealiseerd en gevalideerd (plan van aanpak p. 12); het framework zelf noemt als succes voor eind Q3: 'Het adoptie-framework formeel is vastgesteld' (adoptieframework p. 9). Ligt er: het werkdocument van 15 p. (adoptieframework, 28-09; voorblad 'Augustus 2025'); 'Adoptieplan' bij de eerste opleveringen (statuspagina 3sides, stand 01-10); de eerste opzet is besproken met de programma-architect (statuspagina 3sides, stand 29-09). Ontbreekt: de validatie en vaststelling, en een scope-paragraaf zoals bij de drie andere werkstromen (plan van aanpak: Technologielandschap p. 6, Succes meten p. 8, Blueprint klantreis p. 10; bij het adoptieframework, p. 12–13, ontbreekt ze; deel 4). Wie valideert, noemt het plan van aanpak niet. De inhoudelijke toets van het framework staat in kader 4." },
                { label: "Telling", tekst: "Negen onderdelen: 0 × ja, 7 × nee, deels (1, 2, 4, 5, 6, 7, 9), 2 × nee (3; 8 niet gestart). Van de vier onderdelen met een verstreken maand in de tijdlijn: 3 × nee, deels (1, 2, 4) en 1 × nee (3); 3 is tegen het plan van aanpak (Q3/Q4) niet te laat. Van de vijf oktober-onderdelen: 4 × nee, deels (er ligt een concept of een lijst: 5, 6, 7, 9) en 1 × niet gestart (8). Geen enkel concept is formeel gevalideerd of vastgesteld; 3sides meldt wel bijeenkomsten 'om de klantreis te valideren' (statuspagina 3sides, stand 29-09). Bij de vijf oktober-onderdelen is het oordeel een tussenstand: de maand liep op 01-10 nog. De 19 onderdelen die later opleveren of geen oplevermaand hebben, zijn hier niet beoordeeld (zie deel 5)." },
                { label: "Uit het overleg van 01-10 (intern)", tekst: "Mening van deelnemers: uit Klant in Beeld ligt al veel informatie; gevraagd is waarom daar nog geen eerste concrete analyses of snelle resultaten uit zijn gekomen. In de evaluatie van Klant in Beeld staat dat woord niet, wel verbeterpunten als 'Scherper doelen formuleren en sneller concreet worden' en 'concretere plannen' (evaluatie Klant in Beeld). Ons stappenplan noemt voor eind Q4 2026: 'Eerste quick win zichtbaar gerealiseerd' (stappenplan). Vraag voor 3sides: welke eerste resultaten kunnen er op korte termijn komen?" },
                { label: "Wat we van 3sides vragen", tekst: "3sides, per onderdeel: 1 zeggen of het Miro-bord het resultaat van het samenvoegen is, en zo ja 'Completed' zetten, zo nee zeggen wat er nog komt, met een datum; 2 het overzicht afmaken met eigenaren en kosten, zoals de eigen aanpak zegt ('lijsten ophalen', 'kosten en contracten verzamelen', plan van aanpak p. 7), en in de tijdlijn zetten wat ontbreekt, bij wie het is gevraagd en wat de nieuwe datum is; 3 zeggen welke datum geldt en in welke vorm het doelbeeld komt; 4 en 6 de validatie voorbereiden, een datum voorstellen en opvolgen; 5 zeggen wat de oplevering is en het voorstel voor het proces en de definities van lead, MQL en verkoopkans aan ons voorleggen; 7 de data ophalen in werksessies (plan van aanpak p. 9), per datapunt melden wat ontbreekt en bij wie het is gevraagd, en de rode status toelichten; 8 de startmaand invullen en starten zodra het meetmodel is gevalideerd en de data er zijn; 9 het framework afronden, met een scope-paragraaf, en ter vaststelling aan ons voorleggen. Wat wij zelf doen, staat hierboven onder 'Wat Cito zelf doet (intern)' en op het actiebord." },
              ],
              oordeel: "",
              notitie: "",
            },
            {
              id: "tempo",
              titel: "2 · Houdt 3sides het tempo?",
              ondertitel: "uren, oplevermaanden en verschuivingen",
              vraag: "Houdt 3sides het tempo waar wij uitdrukkelijk om hebben gevraagd: worden de uren gemaakt, komen de onderdelen af in de maand uit de eigen tijdlijn, en komt er een nieuwe datum als dat niet lukt?",
              beeld: "Deels: het team van 3sides is beschikbaar en maakte in september de afgesproken uren, maar de planning schuift. Drie onderdelen zijn op 01-10 over hun oplevermaand heen zonder nieuwe datum: klantreizen samenvoegen, analyse van data en applicaties en meetmodel ontwikkelen. De 0-meting en de eerste pilot stonden in het eerste voorstel in Q3 2026 en staan in de tijdlijn nu op oktober 2026 en op januari en februari 2027.",
              actieBij: "3sides en Cito",
              punten: [
                "De uren: 3sides maakte 493,25 van de 696 uur die voor juli tot en met september stonden (232 per maand): 186,5 in juli, 80 in augustus en 226,75 in september tot en met de 25e. Voor augustus noemt 3sides als reden vakanties en afwezigheid, bij ons en bij 3sides zelf. In september is het team dus op volle sterkte; uren zeggen alleen nog niet of het werk op tijd af is (statuspagina 3sides, stand 29-09).",
                "Van vier onderdelen is de oplevermaand uit de tijdlijn op 01-10 voorbij: Klant in Beeld-klantreizen samenvoegen (augustus), en analyse van data en applicaties, visie en consequenties en meetmodel ontwikkelen (september). Voor visie en consequenties geeft het plan van aanpak zelf Q3/Q4: dat onderdeel is alleen tegen de tijdlijn te laat. In de laatste stand van de tijdlijn die wij hebben, 28-09, stonden alle vier op 'In progress' zonder nieuwe datum; voor de drie van september liep de maand toen nog twee dagen. Daardoor weten wij niet wanneer ze wel af zijn (tijdlijn, stand 28-09; plan van aanpak p. 7).",
                "De 0-meting, het meten van de startwaarden van onze KPI's, schuift. Het eerste voorstel zet de 'Nulmeting' in Q3 2026, het adoptieframework noemt eind Q3 en het plan van aanpak Q3/Q4. De tijdlijn zet de oplevering in oktober, zonder startmaand, en het onderdeel is niet gestart. Met de voorbereiding die er ligt, kunnen wij nog niet meten: het meetmodel is niet gevalideerd en alleen de jaarverslagcijfers hebben een waarde. Zonder startwaarden kunnen wij geen doelwaarden vaststellen (voorstel 3sides, planning Q3 2026; adoptieframework p. 9; plan van aanpak p. 9; tijdlijn, stand 28-09; datapunten, 24-09).",
                "De eerste pilot, waarin één sector de nieuwe werkwijze als eerste toepast, schuift ook. In het eerste voorstel start de pilotgroep in Q3 2026. Het adoptieframework noemt eind Q3 en Q4 2026; het plan van aanpak noemt Q4 2026 voor 'toegepast binnen eerste pilotgroep' en Q1 2027 voor 'Pilots sectoren'. De tijdlijn zegt januari en februari 2027. De stukken van 3sides noemen dus drie verschillende kwartalen, en het laatste ligt twee kwartalen na het eerste (voorstel 3sides, planning Q3 2026; adoptieframework p. 9 en 10; plan van aanpak p. 11 en 13; tijdlijn, stand 28-09).",
              ],
              aanZet3sides: "Vóór het gesprek een nieuwe datum in de tijdlijn zetten bij klantreizen samenvoegen, analyse van data en applicaties en meetmodel ontwikkelen, en bij visie en consequenties zeggen welke datum geldt. Voor de 0-meting en voor de pilots één planning aan ons voorleggen, met per stap een maand. Vanaf nu vooraf melden als een datum niet wordt gehaald, met de reden en de nieuwe datum.",
              aanZetCito: "Een deel van de vertraging ligt bij ons: onze afwezigheid in augustus, en de stappen die wij zelf nog moeten zetten (kader 1). Wij stellen één planning voor de 0-meting en de pilots vast zodra 3sides die voorlegt, en maken onze mensen vrij voor de validaties en voor het aanleveren van data en stukken.",
              vraag3sides: "Welke datums gelden nu, en hoe horen wij het voortaan vooraf als een datum niet wordt gehaald?",
              secties: [
                { label: "Afspraak (bron)", tekst: "Cito heeft 3sides 'expliciet gevraagd om het tempo erin te houden', omdat projecten bij Cito soms lang doorlopen (les uit Klant in Beeld); daarom '3sides as a service': het team blijft beschikbaar en het risico op vertraging wordt beperkt (statuspagina 3sides, stand 01-10). Budget 232 uur per maand (statuspagina 3sides, stand 29-09). Oplevermaand per onderdeel in de tijdlijn (tab v3); planning per kwartaal in het plan van aanpak (p. 7, 9, 11 en 13)." },
                { label: "Uren (bron)", tekst: "Juli 186,5 van 232 uur (80%), augustus 80 (34%; lager door vakanties en afwezigheid van zes mensen, van Cito en van 3sides), september 226,75 tot en met 25-09 (98%); samen 493,25 van 696 uur, 71% (statuspagina 3sides, stand 29-09; percentages berekend). De 197,5 niet-gebruikte uren van juli en augustus schuiven door naar de komende maanden (statuspagina 3sides, stand 29-09); wat ze opleveren staat nergens. De uren staan per maand, niet per werkstroom." },
                { label: "Opleverdata (bron)", tekst: "Van vier van de negen onderdelen met een oplevering tot en met oktober is de maand verstreken (augustus: klantreizen samenvoegen; september: analyse, visie en consequenties, meetmodel). De tijdlijn van 28-09 houdt die maanden aan als oplevering, zonder nieuwe datum. De statuspagina van 01-10 noemt voor de analyse en het doelbeeld geen nieuwe datum; de delen klantreis en succes meten van die stand zijn niet bekeken. Daartegenover: twee onderdelen met een start in oktober staan al op 'In progress' (rollen, gedrag en competenties; adoptieframework toetsen; tijdlijn, stand 28-09); of dat een vroege start is of een invoerfout zoals bij de tussenmeting, is niet te zien. Vier onderdelen hebben geen oplevermaand en twee geen startmaand (deel 5)." },
                { label: "Verschuivingen (bron)", tekst: "0-meting: Q3 in het eerste voorstel van 3sides en in het adoptieframework (succes eind Q3, p. 9); het meetinstrument zegt 'Nulmeting Q3' (meetinstrument p. 7), maar die tabel is overgenomen uit het KPI-model van Cito; 'Q3/Q4' in het plan van aanpak (p. 9); oktober in de tijdlijn, niet gestart, en oktober valt binnen dat Q3/Q4. Eerste pilot: Q3 2026 in het eerste voorstel van 3sides en in het adoptieframework (p. 9); Q4 2026 in het plan van aanpak ('Blueprint gevalideerd en toegepast binnen eerste pilotgroep', p. 11) en in het adoptieframework ('Pilot Start Q4', p. 10); Q1 2027 in hetzelfde plan van aanpak (p. 13) en januari–februari 2027 in de tijdlijn. Technologielandschap: september voor de analyse in de tijdlijn, maar op de town hall van 22-09 'De komende 90 dagen' voor het afronden van de inventarisatie (BV-dag p. 9)." },
                { label: "Uit het overleg van 01-10 (intern)", tekst: "Mening van deelnemers: dat het werk in de zomer later op gang kwam door vakanties, ook bij Cito, is begrijpelijk. Wens voor het vervolg: als mensen van Cito niet beschikbaar zijn, meldt 3sides dat vooraf en noemt het een nieuwe datum. Genoemd gevolg: elke maand dat de 0-meting later komt, schuift ook het vaststellen van de KPI-waarden op; de zorg is dat het net als bij Klant in Beeld lang gaat duren." },
                { label: "Wat we van 3sides vragen", tekst: "3sides: per verstreken onderdeel een nieuwe datum en de oplevering in de tijdlijn; één planning voor de 0-meting en voor de pilots aan ons voorleggen; per werkstroom zeggen wat de 197,5 doorgeschoven uren opleveren. Wat wij zelf doen, staat hierboven onder 'Wat Cito zelf doet (intern)' en op het actiebord." },
              ],
              oordeel: "",
              notitie: "",
            },
            {
              id: "rapportage",
              titel: "3 · Rapporteert 3sides zoals afgesproken?",
              ondertitel: "tijdlijn, Jira en statuspagina",
              vraag: "Rapporteert 3sides zoals afgesproken, en lezen wij uit de rapportage wat af is, wat vastzit en waarom?",
              beeld: "Deels: de afgesproken Excel, de tijdlijn, is er, en 3sides werkt de statuspagina bij. Maar uit de rapportage lezen wij niet wat af is: in de tijdlijn staat niets op 'Completed', terwijl in Jira, het takenbord van 3sides, een deel wel is afgerond. Wat vastzit en waarom, staat op de statuspagina en niet in de tijdlijn, en alleen bij de werkstroom Centrale datavoorziening klantcontact; dit raakt de kern van de evaluatie.",
              actieBij: "3sides en Cito",
              punten: [
                "De afspraak, in de woorden van 3sides: met ons programmamanagement is afgesproken 'dat we wekelijks rapporteren op basis van een Excel waarin de stromen en activiteiten staan', met per activiteit de voortgang en een status waarmee 3sides 'zo vroeg mogelijk impediments' wil laten zien. Die Excel is de tijdlijn (statuspagina 3sides, stand 01-10).",
                "Wat af is, staat er niet in. In de laatste stand van de tijdlijn die wij hebben, 28-09, staat geen enkel onderdeel op 'Completed': alle 28 onderdelen van de vier werkstromen staan op 'In progress' of 'Not started', ook waar de oplevermaand voorbij is. In Jira is bij de blueprint wel een klein deel afgerond; welk onderdeel dat is, staat niet op de schermafdruk (tijdlijn, stand 28-09; plan van aanpak p. 5).",
                "Wat vastzit, staat er ook niet in. De tijdlijn heeft per onderdeel een status: +, +/- of -. Bij +/- en - staat niet wat er aan de hand is, ook niet bij de twee onderdelen op rood: data ophalen voor het meetmodel en de 0-meting. De ene belemmering die 3sides wel meldt, de ontbrekende stukken van SIO bij de analyse van data en applicaties, staat op de statuspagina. Daardoor zien wij in de wekelijkse Excel niet waar het werk vastzit (tijdlijn, stand 28-09; statuspagina 3sides, stand 29-09 en 01-10).",
                "De tijdlijn en Jira zeggen niet hetzelfde. Jira is volgens 3sides het bord voor de eigen taken. In Jira staat de voortgangsbalk van Succes meten, de naam van 3sides voor de werkstroom 0-meting, geheel op niet gestart; in de tijdlijn staan meetmodel ontwikkelen en data ophalen op 'In progress'. En twee onderdelen met een start in oktober staan in de tijdlijn op 28-09 al op 'In progress': rollen, gedrag en competenties, en het toetsen van het adoptieframework. Daardoor weten wij niet welke van de twee de stand is (statuspagina 3sides, stand 01-10; plan van aanpak p. 5; tijdlijn, stand 28-09).",
                "De werkdocumenten kwamen aan het eind van het kwartaal bij elkaar: op de statuspagina dragen ze een datum van 28 of 29 september. In ons programmateam is gezegd dat ze in één keer kwamen. Tussenversies hebben wij als programmateam niet gezien; 3sides meldt wel afstemming met afzonderlijke collega's. Daardoor konden wij als team niet meekijken (statuspagina 3sides, stand 29-09; overleg 01-10).",
              ],
              aanZet3sides: "Vanaf de eerstvolgende week in de tijdlijn: 'Completed' zetten zodra een onderdeel af is, met de plek waar het resultaat staat; bij elke +/- en - in één zin schrijven wat vastzit en wat nodig is; en zeggen welke stand geldt als Jira iets anders zegt. Per onderdeel een eerste versie delen zodra die er is, niet pas aan het eind.",
              aanZetCito: "Wij leggen de rapportage-afspraak vast: wat er elke week in de tijdlijn staat en wie het bij ons leest. Op een gemelde belemmering reageren wij met een besluit of een naam. Nog na te gaan door ons programmamanagement: hoe vaak wij de tijdlijn sinds de afspraak hebben ontvangen (in te vullen); tot dan zeggen wij niet of er wekelijks is gerapporteerd.",
              vraag3sides: "Hoe zien wij voortaan elke week, zonder alle stukken te lezen, wat af is en wat vastzit?",
              secties: [
                { label: "Afspraak (bron)", tekst: "Afgesproken met het programmamanagement (statuspagina 3sides, stand 01-10): wekelijks rapporteren met een Excel van stromen en activiteiten, per activiteit 'gestart, gepauzeerd of nog niet gestart', plus een status om 'zo vroeg mogelijk impediments te identificeren'; Jira voor de eigen taken; elke dinsdag bij Cito aanwezig." },
                { label: "Tijdlijn (bron)", tekst: "Het bestand is aangemaakt op 18-09 en gewijzigd op 28-09 (bestandsgegevens tijdlijn); we hebben één stand; of er sinds juli wekelijks is gerapporteerd, blijkt niet uit de stukken: in te vullen (programmamanagement). De kolom Progress kent 'In progress', 'Not started' en 'Completed' (legenda); 'gepauzeerd' bestaat er niet en 'Completed' is bij 0 van 28 onderdelen gebruikt (17 × In progress, 11 × Not started). De kolom Status kent +, +/- en - zonder omschrijving: 8 × +, 7 × +/-, 2 × - (data ophalen, 0-meting), nergens een toelichting wat er vastzit; de belemmering bij de analyse (geen stukken van SIO) staat op de statuspagina (statuspagina 3sides, stand 01-10), in de tijdlijn staat de analyse op +/-. 'Tussenmeting' staat op 'In progress' terwijl de start in januari 2027 ligt en de voortgangsbalk van Succes meten in Jira geheel op niet gestart staat: vermoedelijk een invoerfout." },
                { label: "Jira en statuspagina (bron)", tekst: "Jira kennen we alleen als schermafdruk (plan van aanpak p. 5): tien van de negentien items zijn te zien, de rest alleen als voortgangsbalk per stroom. Het Jira-bord delen met de bredere groep is een actiepunt (overleg 29-09). Jira en tijdlijn, allebei van 3sides, spreken elkaar tegen: de balk van Succes meten staat in Jira geheel op niet gestart, in de tijdlijn staan drie onderdelen op 'In progress' (waaronder de tussenmeting, vermoedelijk een invoerfout); 'Integratie approach' staat in Jira op 'To Do', in de tijdlijn op 'In progress'; bij de blueprint is in Jira een klein deel afgerond (welk item is niet te zien), in de tijdlijn staat geen enkel 'Completed' (plan van aanpak p. 5; tijdlijn, stand 28-09). De statuspagina wordt bijgehouden (tussen 29-09 en 01-10 kwamen de kick-off voor het MT van 9 juli en de datum van de town hall erbij) en benoemt belemmeringen wel. Uren: per maand, niet per werkstroom; 232 min 80 staat er als 151, het totaal van 197,5 klopt wel (statuspagina 3sides, stand 29-09)." },
                { label: "Dinsdag (bron)", tekst: "Of 3sides elke dinsdag aanwezig is, is uit de stukken niet te toetsen; op de town hall stond: 'We zijn hier op dinsdagen aanwezig' (BV-dag p. 10). Het overleg van 29-09 plant een voorbereiding op maandag (11:00–12:00) naast de bestaande dinsdag. In te vullen (programmamanagement)." },
                { label: "Uit het overleg van 01-10 (intern)", tekst: "Waarneming van het programmateam: de werkdocumenten kwamen eind september in één keer, twaalf tot vijftien stuks volgens een deelnemer, nadat Cito ernaar vroeg; op de statuspagina dragen de tien gedeelde documenten een datum van 28 of 29 september (statuspagina 3sides, stand 29-09). Het team ervaart dat het weinig wordt meegenomen in lopend werk: resultaten komen als geheel, niet in stappen; over het communicatieplan heeft het nog niets gehoord. Feit: op 01-10 konden nog niet alle leden van het programmateam in de gedeelde documentruimte; bij wie die actie ligt, is niet duidelijk. Wens: per onderdeel tussentijds een eerste versie delen." },
                { label: "Wat we van 3sides vragen", tekst: "3sides: 'Completed' zetten zodra een onderdeel af is, de tussenmeting corrigeren, Jira en tijdlijn gelijktrekken, bij elke - en +/- zeggen wat vastzit, bij een verstreken onderdeel een nieuwe datum, de uren per werkstroom naast de opleveringen, en tussentijds een eerste versie delen. Wat wij zelf doen, staat hierboven onder 'Wat Cito zelf doet (intern)' en op het actiebord." },
              ],
              oordeel: "",
              notitie: "",
            },
            {
              id: "mensen",
              titel: "4 · Helpt 3sides ons onze medewerkers mee te nemen in de verandering?",
              ondertitel: "de organisatie buiten de werkstromen: teams en rollen die anders gaan werken",
              vraag: "Levert 3sides wat wij nodig hebben om onze medewerkers mee te nemen, zoals het eigen plan van aanpak noemt: het adoptieframework, een communicatieplan, een kern-adoptieteam, champions per afdeling en playbook-workshops (plan van aanpak p. 12)?",
              beeld: "Nee, deels: er is een eerste stap gezet, de presentatie op de town hall van 22 september, en er ligt een concept van het adoptieframework, het plan om onze medewerkers mee te nemen. Wat het eerste voorstel en dat framework zelf voor Q3 noemden, is er niet: een gestarte pilotgroep en drie tot vijf ambassadeurs. En het framework zegt nog niet hoe, met wie en wanneer wij onze medewerkers meenemen.",
              actieBij: "3sides en Cito",
              punten: [
                "Wat er is gedaan. 3sides sprak voor de klantreis en voor het technologielandschap elk met een groep medewerkers van ons, hield op 9 juli een kick-off voor het managementteam (MT) en presenteerde het programma op 22 september op de town hall, de bijeenkomst voor alle medewerkers, in eigen woorden 'als eerste stap richting de organisatie'. Voor zover de stukken laten zien, is dat de ene keer dat alle medewerkers over het programma hoorden (statuspagina 3sides, stand 29-09 en 01-10).",
                "Wat voor Q3 was genoemd. Het eerste voorstel zette in Q3 2026 de start van een pilotgroep in één sector en de mijlpaal 'adoptie-framework gereed en gedragen door DIN-programmateam'. Het adoptieframework zelf noemt als succes voor eind Q3 'Minimaal 3-5 ambassadeurs' en een gestarte pilotgroep. Geen van beide is er: de pilot staat in de tijdlijn in januari en februari 2027, en de ambassadeurs en het adoptieteam staan op 'Not started' met start in oktober (voorstel 3sides, planning Q3 2026; adoptieframework p. 9; tijdlijn, stand 28-09).",
                "Wat het plan van aanpak belooft en wanneer het komt. Het plan noemt als resultaten het adoptieframework, een communicatieplan, een kern-adoptieteam, champions per afdeling (collega's die de verandering in hun team trekken) en playbook-workshops (werksessies waarin een team de nieuwe werkwijze oefent). In de tijdlijn levert het adoptieframework op in oktober, start het communicatieplan in oktober en starten de playbook-workshops in december. Tegen de eigen tijdlijn is dat niet te laat; het betekent wel dat onze medewerkers tot en met september nog niets anders zijn gaan doen (plan van aanpak p. 12; tijdlijn, stand 28-09).",
                "Het adoptieframework is nog geen plan waarmee wij aan de slag kunnen. Het beschrijft vijf lagen: begrijpen, vertalen naar rollen, vaardig maken, verankeren in de praktijk en continu verbeteren. Alleen de eerste is volledig uitgewerkt en de vijfde is leeg; de fasering staat in weken zonder datum. Daardoor staat er nog niet wie wat doet en wanneer (adoptieframework p. 10 en 15).",
                "De stukken zijn nog niet geschikt om met de organisatie te delen. Volgens de samenvatting van ons overleg met 3sides zijn de slides en modellen 'niet direct geschikt voor brede organisatiecommunicatie; doelgroepspecifieke vertaling is nodig'. In ons programmateam is gezegd dat kennis en toolkit goed zijn en de samenwerking prettig is, en dat het knelpunt is dat de aanpak uitgaat van een organisatie die al met klantreizen en funnels werkt (overleg 29-09; overleg 01-10).",
              ],
              aanZet3sides: "Het adoptieframework afmaken als plan voor onze organisatie: per laag wat er gebeurt, met wie en in welke maand. Een voorstel doen voor het adoptieteam, de ambassadeurs en de eerste pilotsector, met een datum. Per doelgroep een versie maken in gewone taal, die wij met onze medewerkers kunnen delen.",
              aanZetCito: "Het meenemen zelf is van onze lijn: in de methodiek realiseert de bateneigenaar, bij ons de sectormanager, de verandering in de eigen eenheid, ondersteund door een veranderteam; 3sides levert de middelen en faciliteert. Wij moeten nog: de mensen voor het adoptieteam en de champions aanwijzen, de eerste pilotsector kiezen en HR aanhaken. En eerst zelf vaststellen wat wij met een integraal klantbeeld bedoelen.",
              vraag3sides: "Wat merken onze medewerkers vóór eind december van het programma, en wanneer?",
              secties: [
                { label: "Toezegging (bron)", tekst: "Plan van aanpak p. 12: 'Het programma is slechts dan succesvol wanneer werken vanuit Klant in zicht door de hele organisatie wordt gedragen. Middels een gedragsveranderingsprogramma zorgen we dat iedereen weet wat Klant in zicht betekent voor jouw sector, jouw team en jouw rol'; opleveringen: adoptieframework gerealiseerd en gevalideerd, playbook-workshops met de eerste pilotsector en per rol één A4 'Mijn rol in de klantreis', een communicatieplan, een kern-adoptieteam en champions per afdeling (plan van aanpak p. 12); aanpak 'communiceren op why, how & what samen met adoptie team en champions' (plan van aanpak p. 13). Adoptieframework: het adoptieteam zorgt dat 'Breder informatie gedeeld wordt', 'Betrokkenheid wordt gevraagd van key stakeholders en eigenaren van de klantreis' en 'Rapportage van voortgang wordt gedaan naar de hele organisatie' (adoptieframework p. 4); succes eind Q3: draagvlak voor het framework binnen programmateam en management, 'Minimaal 3-5 ambassadeurs zijn aangehaakt', 'Een pilotgroep actief is gestart' (adoptieframework p. 9); werksessies per klantreisfase met vertegenwoordigers uit PO, VO en Zakelijk (adoptieframework p. 11). Statuspagina 3sides, stand 01-10: 'elke dinsdag bij Cito aanwezig zijn om onze zichtbaarheid te vergroten'. Town hall 22-09: 'Adoptie: We gaan stap voor stap met de teams aan de slag om de veranderingen door te voeren' en de oproep aan de zaal: 'Kom bij ons langs', 'Geef prioriteit aan de sessies waarvoor je wordt uitgenodigd', 'Help ons de eerste veranderingen te testen' (BV-dag p. 9–10). Onze opdracht (stappenplan 19-08): assistentie bij 'iedereen opnieuw meenemen' (met MT, sectormanagers en teams), het framework voorleggen aan sectormanagers en HR 'zo creëren we draagvlak vóór we het vaststellen', en 'zichtbaar aanwezig bij Cito ... aanspreekbaar voor de teams ... de zichtbaarheid van 3sides draagt bij aan het draagvlak voor de verandering' (stappenplan, opdracht aan 3sides)." },
                { label: "Wat we zien · 3sides zelf (bron)", tekst: "Positief: veel contact. Negentien verschillende namen (geteld): negen bij de klantreis ('Diverse bijeenkomsten' met hen 'om de klantreis te valideren'), negen bij het technologielandschap, drie bij het meten en één bij adoptie; één medewerker van Cito is 'meegenomen in werkzaamheden en plan van aanpak'; een wekelijks overleg met twee mensen van Cito is gepland (statuspagina 3sides, stand 29-09); 'gesprekken gevoerd om informatie op te halen, inzichten direct te valideren en feedback te geven' (statuspagina 3sides, stand 01-10). Programmabreed: kick-off voor het MT (9 juli), het programma gepresenteerd op de town hall 'als eerste stap richting de organisatie' (22 september), de evaluatie van Klant in Beeld 'gedeeld met het team' (statuspagina 3sides, stand 01-10). Maar het meenemen van de medewerkers zelf is niet begonnen: bij adoptie is de enige afstemming dat de eerste opzet van het adoptieframework met de programma-architect is besproken (statuspagina 3sides, stand 29-09); 'stakeholders worden nu meegenomen om te valideren en buy-in te krijgen. Dit gebeurt in de komende maand met de stakeholders' (statuspagina 3sides, stand 29-09); sessies met teams of per rol staan nergens. In de tijdlijn staan ambassadeurs en adoptieteam, communicatieplan en playbook-workshops op 'Not started'; volgens diezelfde tijdlijn starten de eerste twee in oktober en de workshops in december, met de eerste pilotsector in januari–februari 2027 (stand 28-09). 3sides signaleert bij het licentieserverproject dat het team begeleiding mist ('team is onvoldoende op de hoogte en heeft begeleiding nodig') en schrijft over het technologielandschap: 'Keuzes worden vaak gemaakt op basis van onjuiste of onvolledige kennis' (statuspagina 3sides, stand 01-10); dat gaat over die projecten, niet over Klant in Zicht." },
                { label: "Wat we zien · overleg 29-09 (bron)", tekst: "Samenvatting: 'gesprekken voornamelijk individueel gevoerd; behoefte aan formele projectgroepen per werkstroom'; 'veel kennis zit bij losse individuen binnen Cito zonder gezamenlijk overzicht'; 'Slides en modellen die intern gebruikt worden, zijn niet direct geschikt voor brede organisatiecommunicatie; doelgroepspecifieke vertaling is nodig'; 'Balans zoeken tussen management informeren (buy-in) en te vroeg te veel communiceren (onrust)'; basisbegrippen als lead en verkoopkans 'nog niet uniform gedefinieerd binnen Cito', vandaar het actiepunt begrippenlijst 'voor gemeenschappelijke taal binnen de organisatie'; 'Behoefte uitgesproken aan nog enkele alignment-sessies'. Transcriptie (automatisch, zonder sprekers; alleen letterlijk leesbare zinnen): 'de platen die we hier maken, niet op een op een de organisatie ingooien'; over baat, vermogen en inspanning: 'wij snappen het, vanuit het DIN-programma, maar ik denk medewerkers ... dus we gaan het in andere manieren doen'; 'jullie zitten er continu in, maar de meeste mensen hier in de organisatie niet'; de kernwaarden G.O.L.D.: 'die zijn echt niet breed gecommuniceerd'; 'conversie is voor jullie vanzelfsprekend ... voor mij niet en ik denk in de hele organisatie als we dit moeten overbrengen straks ook niet'. In het overleg gezegd over de aanpak: eerst de basis, dan stap voor stap met teams, 'ambassadeurs kweken, en dan de volgende', als een olievlek; en als valkuil genoemd: 'weer een projectje doen ... en over een jaar zitten we hier weer bij elkaar' (overleg 29-09, transcriptie; wie het zei, is niet vast te stellen)." },
                { label: "Wat we zien · vanuit het programma", tekst: "Waarnemingen vanuit het programma, als waarneming gelabeld en niet als feit. In het overleg van 29-09 vielen deelnemers opnieuw over de begrippen; de kaders uit het programmaplan waren naar de achtergrond geraakt en er waren nieuwe mensen aangesloten die het plan niet kenden, waardoor eerder besproken onderwerpen opnieuw aan de orde kwamen. De begrippen voor de rollen lopen door elkaar, en een eerder gedeeld voorstel voor de programmaorganisatie bleek niet gelezen. Het framework bestaat uit algemene en technische begrippen; voor brede communicatie binnen Cito is het in deze vorm onduidelijk, en medewerkers buiten het programmateam begrijpen het nog niet. Het kern-adoptieteam en de champions zijn nog niet aangewezen (actiebord). In de stukken staat geen enkele uitspraak van een Cito-medewerker over 3sides in Klant in Zicht; de enige medewerkersstemmen in de stukken zijn de 13 respondenten over Klant in Beeld (hieronder)." },
                { label: "Wat we zien · overleg 01-10 (intern)", tekst: "Alles hieronder is waarneming of mening van deelnemers, zonder namen. Signalen van collega's (uit tweede hand, informeel): deelnemers hebben collega's gevraagd naar Klant in Beeld; een deel was enthousiast, een deel heeft het uitgezeten; een paar collega's vroegen of de klantreis nu opnieuw wordt uitgewerkt en wat het vervolg is. Volgens de deelnemers zijn mensen niet onwillig, maar moe van resultaten die niet concreet worden; uitleg over de verbinding tussen afdelingen en systemen wekt wel belangstelling. Deze signalen gaan over Klant in Beeld en het vervolg, niet over 3sides in Klant in Zicht. Adoptieframework: ook binnen het programmateam is niet voor iedereen duidelijk wat het is en wat het moet doen; het beschrijft wat bereikt moet worden, niet hoe. Aansluiting: de aanpak van 3sides gaat uit van een organisatie die al met klantreizen en funnels werkt; voor veel collega's bij Cito is dit nieuw. Dat is in Klant in Beeld en in dit programma aan 3sides teruggegeven; het kleiner en praktischer maken bleek lastig en is bij Training en Advies redelijk gelukt (waarneming van een deelnemer aan Klant in Beeld). Positief, in hetzelfde overleg: de kennis is er, het programma zit goed in elkaar, de toolkit is goed uitgewerkt en het is prettig samenwerken; het knelpunt is de aansluiting op het kennisniveau binnen Cito, niet de inhoud. Inschatting: een gedeeld beeld van 'integraal klantbeeld' ontbreekt nog, tien collega's zouden tien verschillende antwoorden geven; en zonder gedeeld waarom wordt de validatie met sector- en productmanagers een discussie over de basis. Indruk van één deelnemer, niet gemeten: weinig draagvlak in de organisatie voor de aanpak van 3sides. Voorstellen: adoptie begint bij de projectgroep zelf (wat heb ik eraan, waarom zou ik meewerken) en daarna de bredere organisatie; per werkstroom een gezamenlijke start; 3sides doet een concreet voorstel voor het adoptieteam en de ambassadeurs, Cito wijst de mensen aan; en als mensen zich in een groep niet vrij uitspreken, hoort Cito dat te weten: zoveel mogelijk samen, met ruimte om daarna apart iets te delen." },
                { label: "Les uit Klant in Beeld (bron)", tekst: "De lessen uit Klant in Beeld staan vooraan in dit deel, onder 'Startpunt: de lessen uit Klant in Beeld'; wat alleen intern is, staat in de interne notitie. Voor dit kader telt vooral wat deelnemers schreven over het landen in de organisatie: 'het voelt nu niet als een manier van werken / denken binnen Cito. Meer als een afgerond project ... het is onduidelijk wie daar de lead in zou moeten nemen'; 'het project ligt nu verder stil bij de grote groep die hieraan begonnen is. Er is nog een klein groepje bezig, maar daar krijgen we niets van mee'; 'jammer dat het, voor mijn gevoel, zo abrupt is gestopt' (evaluatie Klant in Beeld). Aan wie dat lag, zegt de evaluatie niet." },
                { label: "Kunnen ze het? (bron)", tekst: "Wat goed is: de vertaallogica klantreis → klantbehoefte → kritisch contactmoment → gewenst gedrag → competenties → adoptie → resultaat is Cito-specifiek en dezelfde die ons stappenplan hanteert (adoptieframework p. 3; stappenplan); de vragen zijn de juiste: wat moeten mensen per rol anders doen, welke competenties, 'wat houdt medewerkers momenteel tegen?' en 'doen mensen mee? Doen mensen iets anders? Heeft het effect?' (adoptieframework p. 7–8); 'wie moet aanhaken binnen Cito' noemt de stuurgroep, de sectormanagers PO, VO en Zakelijk, HR, CRM/Data, sales, customer support en marketing (adoptieframework p. 5); de werksessies hebben een concrete opzet met acht vragen per klantreisfase (adoptieframework p. 11); de eerste laag 'Begrijpen (WHY)' heeft een kernboodschap en een meetbare succesindicator: 'iedereen kent de 11 hoofdstappen van de klantreis' en 'de 5 kernprincipes, en de G.O.L.D. kernwaarden' (adoptieframework p. 15). Wat niet goed is: het voorblad zegt 'Augustus 2025' (bestand van 28-09-2026); de SMILE-pagina's zijn generiek, Engelstalig 3sides-materiaal ('Your success is in good hands', 'we'll help you build a team of champions', adoptieframework p. 12–13), alleen adoptieframework p. 14 zet de Cito-onderdelen op de SMILE-fasen; van de vijf lagen is alleen laag 1 uitgewerkt: laag 2 mist de kernboodschap, laag 3 en 4 hebben alleen een opsomming, laag 5 'Continu verbeteren' is leeg (adoptieframework p. 15); de fasering staat in weken zonder datum en in een volgorde die niet klopt ('Fase 1 - Verkenning (week 12)', 'Fase 4 – Meetmodel bouwen (week 2-6)', adoptieframework p. 10); het barrière-assessment uit die fasering heeft geen resultaat in de stukken; een communicatieplan is er niet (tijdlijn: niet gestart, geen oplevermaand); de scope-paragraaf ontbreekt in het plan van aanpak (p. 12–13 springt van '3. Aanpak' naar '5. Planning'); en van de acht eigen Q3-succescriteria (adoptieframework p. 9) is op 01-10 geen enkele aantoonbaar gehaald; het dichtstbij komt 'CRM-gaps en databehoeften inzichtelijk' (eerste CRM-evaluatie afgerond, maar 'nog niet alle informatie', statuspagina 3sides, stand 01-10). Conclusie: de aanpak is goed gekozen en past bij ons stappenplan; de uitwerking is half af en de uitvoering is niet gestart. Of ze het kunnen, is daarmee uit de stukken niet te bewijzen en niet te weerleggen." },
                { label: "Zo doe je het wél (bron)", tekst: "1 · Niet de platen één-op-één de organisatie in, maar per doelgroep een vertaling: eerst de begrippenlijst in gangbare Cito-termen (actiepunt 29-09), dan per rol één A4 'Mijn rol in de klantreis' (plan van aanpak p. 12; adoptieframework p. 15); 'vermijd jargon, ingewikkelde termen of turbotaal', en omdat 'baten' niet overal goed valt is 'gewenste effecten' een alternatief (programmaboek, over de programmavisie en over baten). 2 · Van één-op-één naar projectgroepen per werkstroom met Cito-mensen, met de Cito-lead voorop en de domeineigenaar erbij (actiepunt 29-09; organigram): 'eigenaarschap aanboren boven opdrachten geven', liever 'samen met de betrokkenen een programma te ontwikkelen boven het experts te laten ontwerpen' en 'niet expertmatig een DIN maken ... maar samen met de mensen die de veranderingen en baten voor elkaar moeten krijgen' (programmaboek, principes en eigenaarschap). 3 · Het adoptieteam en de ambassadeurs nu aanwijzen, niet pas bij de pilot: drie tot vijf ambassadeurs was het eigen Q3-succes (adoptieframework p. 9); 'verandering beklijft als mensen het zelf dragen', niet alleen koplopers (stappenplan); liefst mensen uit de teams: 'dat hoeven dus niet managers te zijn (soms beter van niet)' (programmaboek, veranderteam). 4 · Klein beginnen en bewijzen: de werksessies per klantreisfase met vertegenwoordigers uit PO, VO en Zakelijk, met de acht vragen (adoptieframework p. 11), de eerste pilotsector kiezen (actiebord) en 'klein beginnen, bewijzen dat het werkt, dan uitrollen' (stappenplan); in het overleg is het ook zo gezegd: 'ambassadeurs kweken, en dan de volgende' (overleg 29-09, transcriptie). 5 · De lijn voorop: 'het lijnmanagement (bateneigenaren, programma-eigenaar) speelt een belangrijke rol bij het sturen op verandering' (programmaboek, sturen op verandering); de validaties van blueprint en meetmodel met product- en sectormanagers, de programma-eigenaar en het MT (kader 1) zijn precies die stap, en het MT bekrachtigt de richting (stappenplan). 6 · Weerstand opzoeken en adoptie meten: 'weerstand moet je koesteren ... maak bovendien ruimte voor het geluid dat niet (zo luid) wordt gemaakt' (programmaboek, sturen op verandering); de maat is de eigen maat van 3sides, 'doen mensen mee? Doen mensen iets anders? Heeft het effect?', met deelname aan werksessies en training en actieve ambassadeurs als eerste tellers (adoptieframework p. 7–8), en de lessen van Klant in Beeld als toets: afspraken opvolgen, concreet maken, niet abrupt stoppen." },
                { label: "Wat we van 3sides vragen", tekst: "3sides: het adoptieframework afmaken als stuk voor onze organisatie (lagen 2 tot en met 5, communicatieplan, scope-paragraaf, datums in plaats van weken, voorblad), een concreet voorstel doen voor adoptieteam, ambassadeurs en pilotsector, de werksessies en de begrippenlijst voorbereiden, per doelgroep een vertaling in plaats van de interne platen, de validatiesessies voorbereiden, en voortaan rapporteren op de eigen adoptie-maat: wie doet mee, hoeveel mensen uit welke teams. Wat wij zelf doen, staat hierboven onder 'Wat Cito zelf doet (intern)' en op het actiebord." },
              ],
              oordeel: "",
              notitie: "",
            },
            {
              id: "din",
              titel: "5 · Werkt 3sides in ons framework, en komt het eigenaarschap bij ons te liggen?",
              ondertitel: "één framework (het DIN), één taal, en per werkstroom kennis en resultaat bij ons",
              vraag: "Werkt 3sides in ons ene framework, het Doelen-Inspanningennetwerk (DIN), en zó met onze mensen dat kennis en resultaat per werkstroom bij ons komen te liggen: bij de Cito-lead en de projectgroep van die werkstroom?",
              beeld: "Deels: 3sides werkt met dezelfde vier niveaus als ons framework, het Doelen-Inspanningennetwerk (DIN), maar gebruikt andere woorden en andere namen voor de werkstromen. Hoe kennis en resultaat per werkstroom bij ons komen te liggen, lezen wij nog in geen stuk van 3sides. Voor de blueprint en voor adoptie noemt 3sides een beoogd eigenaar van het resultaat aan onze kant; voor Centrale datavoorziening klantcontact en de 0-meting niet.",
              actieBij: "3sides en Cito",
              punten: [
                "Het framework sluit aan. Ons DIN verbindt vier niveaus: doelen, baten (het effect bij de klant), vermogens (wat wij als organisatie moeten kunnen) en inspanningen (het werk dat een vermogen opbouwt). 3sides gebruikt dezelfde vier niveaus en dezelfde vier werkstromen, en noemt bij het meten de doelen en baten van het programma leidend (plan van aanpak p. 2, 3 en 8).",
                "De woorden verschillen. 'Inspanning' is bij 3sides het concrete doen van medewerkers; in het DIN is het het werk dat een vermogen opbouwt. De vermogens heten in het meetinstrument van 3sides op de ene pagina 'Kunnen' en op de volgende 'Waartoe'. Daardoor kan één woord in een gesprek twee dingen betekenen (plan van aanpak p. 2; meetinstrument p. 5 en 6).",
                "De werkstromen hebben twee sets namen. Bij 3sides heten ze Succes meten, Blueprint klantreis, Technologielandschap en Adoptieframework; in ons organigram 0-meting, Klantreizen, Centrale datavoorziening klantcontact en Adoptieframework. Wie beide stukken leest, moet steeds vertalen (plan van aanpak p. 3; organigram).",
                "3sides werkt vooral met losse gesprekken. Volgens de samenvatting van ons overleg met 3sides zijn gesprekken 'voornamelijk individueel gevoerd' en is er 'behoefte aan formele projectgroepen per werkstroom'. Zonder een vaste groep van onze mensen per werkstroom blijft de kennis bij 3sides en bij de collega's die toevallig zijn gesproken (overleg 29-09).",
                "Wie het resultaat bij ons overneemt, is voor twee van de vier werkstromen genoemd. De statuspagina noemt één medewerker van ons als beoogd eigenaar van de blueprint en van adoptie; het plan van aanpak noemt bij geen enkele werkstroom wie het resultaat aan onze kant overneemt (statuspagina 3sides, stand 29-09; plan van aanpak p. 6 tot en met 13).",
                "Hoe het werk wordt overgedragen, staat nergens. Het plan van aanpak noemt de overdracht één keer, bij het technologielandschap: 'Q4: roadmap en overdracht', zonder te zeggen hoe. Het eerste voorstel zet 'adoptie zelfstandig geborgd in lijnorganisatie' in Q1 2027 en 'Leiderschap neemt eigenaarschap over' in Q3/Q4 2027. Hoe dat per werkstroom gaat, staat er niet; wij willen het vanaf nu opbouwen (plan van aanpak p. 7; voorstel 3sides).",
              ],
              aanZet3sides: "In het meetmodel en de andere stukken onze begrippen en onze namen voor de werkstromen gebruiken. Per werkstroom werken met een vaste projectgroep van onze mensen. Per werkstroom in het plan van aanpak opnemen hoe en wanneer kennis en resultaat aan ons worden overgedragen.",
              aanZetCito: "Wij laten de programma-eigenaar per werkstroom de Cito-lead vaststellen, de collega die het resultaat namens ons overneemt; zolang dat niet is gebeurd, kan 3sides die naam niet in het plan van aanpak zetten. Wij bemensen de projectgroepen, met capaciteit van sector- en afdelingsmanagers, en stellen de namen van de werkstromen vast.",
              vraag3sides: "Wat is nodig om per werkstroom met een projectgroep te werken, en hoe dragen jullie kennis en resultaat aan ons over?",
              secties: [
                { label: "Toezegging (bron)", tekst: "Het plan van aanpak zet dezelfde vier niveaus in, doelen, baten, vermogens en inspanningen (p. 2), en dezelfde vier werkstromen (p. 3); bij het meten: 'Gedefinieerde Doelen en Baten vanuit het programma zijn leidend' (plan van aanpak p. 8); de blueprint 'wordt gedragen door de product managers en sector managers' (plan van aanpak p. 10). Overleg 29-09: projectgroepen per werkstroom, het Jira-bord delen met de bredere groep, de onderbouwing van keuzes vastleggen. Statuspagina 3sides, stand 01-10: elke dinsdag bij Cito." },
                { label: "Framework en taal (bron)", tekst: "Hetzelfde: de vier niveaus (plan van aanpak p. 2), onze drie doelen als vertrekpunt (meetinstrument p. 2), de 14 baten-KPI's per sector (meetinstrument p. 7). Anders: 'inspanning' is bij 3sides het concrete doen, gedrag (plan van aanpak p. 2; meetinstrument p. 5), in het DIN het werk dat een vermogen opbouwt en dat de werkstromen uitvoeren; de vermogens heten 'Waartoe' op meetinstrument p. 6 en 'Kunnen' op p. 5; de vier organisatiebrede KPI's (NPS, conversie, omzet, retentie) staan bij 3sides als baten (meetinstrument p. 8), bij ons op doelniveau als resultante (besloten, bevestigd door de programma-architect op 01-10; deel 3); de werkstromen hebben twee sets namen (deel 3; besluitpunt deel 7). Het advies van 3sides om de 0-meting ook op vermogens en inspanningen te doen (statuspagina 3sides, stand 29-09) past bij ons besluit: de 0-meting is één inspanning over alle vier domeinen (besluit programma-architect, 30-09; ter bevestiging). In het overleg van 01-10 waren de deelnemers het eens: de begrippen van Cito gelden, 3sides sluit daarop aan." },
                { label: "Samenwerking (bron)", tekst: "Veel gesprekken: negen namen bij de klantreis, negen bij het technologielandschap, drie bij het meten en één bij adoptie (statuspagina 3sides, stand 29-09); vaste momenten: dinsdag bij Cito (statuspagina 3sides, stand 01-10), een gepland wekelijks klantreisoverleg met twee mensen van Cito (statuspagina 3sides, stand 29-09) en een wekelijks overleg over het technologielandschap (overleg 29-09). Maar: 'gesprekken voornamelijk individueel gevoerd; behoefte aan formele projectgroepen per werkstroom' en 'veel kennis zit bij losse individuen binnen Cito zonder gezamenlijk overzicht' (overleg 29-09). Eigenaarschap: het plan van aanpak noemt geen Cito-eigenaar per werkstroom; de statuspagina noemt één medewerker van Cito als beoogd eigenaar van blueprint én adoptie (statuspagina 3sides, stand 29-09); de Cito-leads per werkstroom staan in het organigram als voorstel en zijn nog niet vastgesteld (actiebord: rollen laten vaststellen door de programma-eigenaar). De formele validaties door productmanagers en sectormanagers, de programma-eigenaar en het MT staan nog open (kader 1), dus 'gedragen door' is nog niet waar." },
                { label: "Uit het overleg van 01-10 (intern)", tekst: "Waarnemingen en meningen van deelnemers, zonder namen. 3sides voert de gesprekken vooral één-op-één; gezegd is dat 3sides daar bewust voor kiest, de reden kent het programma niet (van horen zeggen). In de werkstroom Centrale datavoorziening klantcontact spreekt 3sides volgens een deelnemer vooral met leden van het managementteam, en niet met iedereen die Cito erbij wil hebben (indruk; te toetsen aan de namen op de statuspagina). 3sides vroeg waarom een collega van Cito voor een overleg was uitgenodigd en wat zijn rol is: de rollen aan de kant van Cito zijn bij 3sides dus niet bekend, en Cito heeft de leads nog niet vastgesteld. De programmaorganisatie (wie doet wat, wie beslist) heeft Cito zelf uitgewerkt; of dat bij de opdracht aan 3sides hoorde: te controleren in de opdracht. Ook binnen Cito heeft niemand het hele beeld van hoe de systemen samenwerken; een voorstel over het CRM vraagt daarom een toets met de mensen van Cito die de risico's kennen. Zo wil het programmateam werken: per werkstroom een projectgroep met mensen uit de organisatie, eerst een gezamenlijke sessie, dan een voorstel van 3sides, een toets door de projectgroep, bij voorkeur samen met 3sides, en daarna besluit Cito. Losse gesprekken halen informatie op; een gezamenlijk beeld ontstaat pas als de betrokkenen het samen bespreken. Voorstel, nog niet besloten: adoptie is onderdeel van elke werkstroom en geen apart eigenaarschap naast de klantreis." },
                { label: "Wat we van 3sides vragen", tekst: "3sides: in het meetmodel onze begrippen gebruiken: het kunnen hoort bij het vermogen, het doen is in de methodiek de verandering die ernaast staat; wij meten beide bij het vermogen (voorstel), en in het meetinstrument op p. 6 'Vermogens (Kunnen)' in plaats van 'Vermogens (Waartoe)' (meetinstrument p. 5 en 6); één set namen in alle stukken; het Jira-bord delen; keuzes onderbouwen op één A4 (overleg 29-09); per werkstroom met een projectgroep werken en in het plan van aanpak beschrijven hoe kennis en resultaat aan onze organisatie worden overgedragen. Wat wij zelf doen, staat hierboven onder 'Wat Cito zelf doet (intern)' en op het actiebord." },
              ],
              oordeel: "",
              notitie: "",
            },
            {
              id: "actie",
              titel: "6 · Volgt 3sides onze regie?",
              ondertitel: "wij leiden, 3sides volgt en voert uit: voorleggen, de stappen uit het eigen plan regelen, vroeg melden",
              vraag: "Werkt 3sides binnen onze regie: legt het voorstellen en keuzes aan ons voor, regelt het de stappen uit het eigen plan, en meldt het vroeg als iets vastloopt, met een nieuwe datum?",
              beeld: "Deels: 3sides legt keuzes als advies aan ons voor, en dat past bij onze regie. Maar een stap uit het eigen plan is niet geregeld: het valideren van het meetmodel stond in Q3 en is alleen aangekondigd voor 'de komende maand', zonder datum. En wat vastloopt, meldt 3sides op de statuspagina en niet in de tijdlijn, zonder nieuwe datum.",
              actieBij: "3sides en Cito",
              punten: [
                "3sides legt keuzes aan ons voor. Op de statuspagina staan drie aanbevelingen over de 0-meting, uitdrukkelijk als advies: haar concreet en meetbaar maken, haar ook doen op vermogens en inspanningen, en de KPI's op batenniveau gelijktrekken voor alle sectoren. Zo hoort het: 3sides adviseert, wij beslissen (statuspagina 3sides, stand 29-09).",
                "Over de plek van 3sides in de besturing verschillen de stukken. In het eigen adoptieframework zet 3sides zichzelf in de stuurgroep, onder 'Besluitvorming, Prioritering, Sturing', naast de directeur van Cito BV, de programmaleider en de PM. In ons organigram, dat nog een voorstel is, zit 3sides in het programmateam en niet in de stuurgroep. Dit leggen we in het gesprek naast elkaar (adoptieframework p. 5; organigram, voorstel).",
                "Het valideren is niet geregeld. Toetsen en valideren met stakeholders is een stap in de eigen aanpak van 3sides. Voor het meetmodel staat het ontwerpen, met het valideren, in het eigen plan in Q3; voor het doelbeeld in Q3/Q4. Op de statuspagina kondigt 3sides het valideren aan voor 'de komende maand'; een datum, een lijst van wie valideert en een uitnodiging staan niet in de stukken. Wij verwachten dat 3sides zo'n stap zelf voorbereidt en een datum voorstelt (plan van aanpak p. 9 en 7; statuspagina 3sides, stand 29-09).",
                "Melden als het vastloopt gebeurt deels. 3sides meldt op de statuspagina dat stukken van SIO ontbreken voor de analyse van data en applicaties; dat is goed. Maar bij de drie onderdelen die op 01-10 over hun maand heen zijn (Klant in Beeld-klantreizen samenvoegen, analyse van data en applicaties, meetmodel ontwikkelen) staat in de laatste stand van de tijdlijn die wij hebben geen nieuwe datum en geen reden (statuspagina 3sides, stand 01-10; tijdlijn, stand 28-09).",
                "In ons programmateam bestaat de indruk dat 3sides zichzelf op onderdelen als leidend ziet (overleg 01-10). In het gesprek horen we hoe 3sides de eigen rol ziet.",
              ],
              aanZet3sides: "Voorstellen en keuzes aan ons voorleggen voordat ze worden uitgevoerd. De stappen uit het eigen plan zelf regelen: voor elke validatie voorbereiden wat er voorligt, voorstellen wie valideert en een datum voorstellen. Zodra iets vastloopt dat in de tijdlijn melden, met wat nodig is en een nieuwe datum.",
              aanZetCito: "Wij spreken ons uitgangspunt uitdrukkelijk uit tegenover 3sides: wij leiden, 3sides volgt en voert uit, en wat de rol van onze programmamanager is; uit geen stuk blijkt dat 3sides dit heeft bevestigd. Wij trekken onze eigen stukken gelijk: stappenplan, KPI-model en organigram. Per validatie noemen wij een naam en maken wij die mensen vrij, en wij beslissen op tijd over wat 3sides voorlegt.",
              vraag3sides: "Hoe zorgen jullie dat wij op tijd kunnen beslissen, en hoe horen wij het als een stap vastloopt?",
              secties: [
                { label: "Uitgangspunt (bron)", tekst: "Stappenplan (19-08-2026; status 'eerste schets'): 'wij voeren de regie' en 'Cito is opdrachtgever: wíj bepalen wat er nodig is, 3sides levert daarop'. Het vraagt van 3sides onder meer 'Assistentie bij élke stap van het fundament', met 'voorbereiden, faciliteren en tempo houden'; 'Een plan van aanpak per domein volgens ónze prioritering'; een 'wekelijkse rapportage'; en 'Zichtbaar aanwezig bij Cito'. Bij de sessies met sectormanagers en MT: '3sides bereidt voor en faciliteert'. Over stilstand: 'bij stilstand escaleren wij'. Organigram (voorstel): 'Cito bepaalt wat het resultaat moet zijn en accepteert het, 3sides levert daarop'; de programmamanager voert de regie; 3sides zit in het programmateam, niet in de stuurgroep. Intern uitgangspunt (05-10): zo is het aan 3sides gecommuniceerd; een stuk waaruit dat blijkt, zit niet bij de bronnen." },
                { label: "Wat we zien (bron)", tekst: "Voorleggen: de drie aanbevelingen over de 0-meting staan als advies op de statuspagina (statuspagina 3sides, stand 29-09); ons besluit dat de 0-meting één inspanning over alle vier domeinen is, sluit daarbij aan. Daartegenover: een integratievoorstel van twee medewerkers van ons is volgens de statuspagina geëvalueerd, met 'Gekozen om dat voor nu on-hold te zetten en als input mee te nemen in de inventarisatie' (statuspagina 3sides, stand 01-10); wie dat koos en of het aan ons is voorgelegd, staat er niet: in te vullen. Stuurgroep: het adoptieframework zet onder 'Besluitvorming, Prioritering, Sturing' in de stuurgroep 'Directeur Cito BV', 'DIN-programmaleider', 'PM' en '3sides' (adoptieframework p. 5); bij projectmanagement noemt het 'Programma Team & Stuurgroep' en 'Programma overleg & rapportages' (adoptieframework p. 14). De stappen uit het eigen plan: 'toetsen met stakeholders' (plan van aanpak p. 7), 'opstellen en valideren met stakeholders' (plan van aanpak p. 9) en 'Fase 5 - Validatie' (adoptieframework p. 10); aangekondigd voor 'de komende maand' (statuspagina 3sides, stand 29-09); de tijdlijn heeft geen regel voor het valideren en geen datum. Melden: de belemmering bij de analyse staat op de statuspagina (statuspagina 3sides, stand 01-10), in de tijdlijn staat status +/-; de twee rode statussen (data ophalen, 0-meting) hebben geen toelichting; de vier verstreken onderdelen hebben geen nieuwe datum (tijdlijn, stand 28-09)." },
                { label: "Regie: wat onze eigen stukken zeggen (intern)", tekst: "De stukken van Cito zijn niet eenduidig. Stappenplan (19-08; status 'eerste schets'): 'wij voeren de regie' en 'Cito is opdrachtgever: wíj bepalen wat er nodig is, 3sides levert daarop'. KPI-model, randvoorwaarden: 'Regie & programmaleiding bij 3sides', voor 'voortgang, tempo en verbinding tussen de sectoren'. Organigram (voorstel): de programmamanager van Cito voert de regie. In de stukken van 3sides komt het woord regie niet voor; 3sides zet zichzelf wel in de stuurgroep (adoptieframework p. 5), het organigram doet dat niet. Overleg 01-10 (waarneming van een direct betrokkene): de regie over het programma ligt officieel nog bij 3sides, de rol van de programmamanager van Cito is niet uitdrukkelijk uitgesproken, en daardoor komen beide partijen in elkaars vaarwater. Dat 3sides zichzelf op onderdelen nog als leidend ziet, is een indruk van deelnemers; een uitspraak van 3sides daarover is er niet. Te controleren: wat de opdracht aan 3sides over de regie zegt." },
                { label: "Rolverdeling: wat de stukken zeggen (intern)", tekst: "Door 3sides zelf beschreven: per werkstroom doel, scope, activiteiten en mijlpalen uitgewerkt; wekelijks rapporteren en belemmeringen vroeg signaleren, afgesproken met het programmamanagement; het tempo erin houden, op uitdrukkelijk verzoek van Cito (statuspagina 3sides, stand 01-10); toetsen en valideren met stakeholders als stap in de eigen aanpak (plan van aanpak p. 7 en 9); 'Met vertegenwoordigers uit PO, VO en Zakelijk organiseren we gesprekken/workshops' (adoptieframework p. 11). Alleen in stukken van Cito: 'Cito is opdrachtgever: wíj bepalen wat er nodig is, 3sides levert daarop' en '3sides bereidt voor en faciliteert' bij de sessies met sectormanagers en MT (stappenplan; status 'eerste schets'); voor Data & Systemen en Processen levert 3sides een inhoudelijk trekker: 'die stuurt de activiteiten van dat domein aan en bewaakt het tempo'; en 'bij stilstand escaleren wij' (stappenplan); 'Cito bepaalt wat het resultaat moet zijn en accepteert het, 3sides levert daarop', met planning, prioriteit en scope bij de programmamanager (organigram, voorstel). In geen enkel stuk: dat 3sides validaties inplant en opvolgt. Daartegen in: het eerdere voorstel voor de programmaorganisatie laat de programmamanager van Cito de sessies met de sectoren plannen en de beschikbaarheid regelen, en de randvoorwaarden in het KPI-model leggen 'Regie & programmaleiding bij 3sides'. Verder noemt het stappenplan een 'goedgekeurd 3sides-voorstel' als bron; in de samenvatting daarvan die het programma heeft (het origineel is voor deze evaluatie niet gelezen) staat dat iemand 'het voortouw' moet nemen, 'met name op' Processen en Data & Systemen, en dat de topic leads van 3sides 'inhoudelijk de leiding' nemen. 3sides kan zich daarop beroepen: vóór het gesprek het origineel lezen. Het uitgangspunt in het kader Rolverdeling is dus onze opzet van de opdracht; uit de stukken blijkt niet dat 3sides het heeft bevestigd." },
                { label: "Waar 3sides op kan terugkomen, per onderdeel (intern)", tekst: "1 · Klant in Beeld-klantreizen samenvoegen: het Miro-werkdocument stond al op de statuspagina van 29-09; wij hebben het pas op 05-10 bekeken. 2 · Analyse van data en applicaties: 3sides heeft 'Tot nu toe geen overzicht of requirementsdocumenten of architectuurplaten ontvangen van SIO' (statuspagina 3sides, stand 01-10); wij hebben ze niet aangeleverd en ook niet vastgesteld dat ze niet bestaan; aan wie bij ons de vraag is gesteld en wanneer, staat nergens: in te vullen. 3 · Visie en consequenties: bouwt op de analyse (2); volgens het eigen plan heeft 3sides nog Q4 (plan van aanpak p. 7); de koppeling van 'Visie & Consequentie' aan het doelbeeld is onze lezing. 4 · Meetmodel ontwikkelen: de validatie is aan de programma-eigenaar en het MT (overleg 29-09); het actiepunt heeft geen eigenaar en geen datum, en wie inplant is nergens vastgelegd. 5 · Marketing- en salesproces en funnel: de definities van lead, marketing qualified lead en verkoopkans stellen wij vast, met de programma-eigenaar en de verantwoordelijke voor sales (overleg 29-09); het plan van aanpak noemt hier geen oplevering. 6 · Blueprint: fasen en hoofdstappen: de validatie is aan onze productmanagers en sectormanagers (plan van aanpak p. 10); de aanpak heeft hier geen validatiestap en het plan zet de validatie in Q4 (plan van aanpak p. 11). 7 · Data ophalen voor het meetmodel: de data komen van onze mensen; bij ruim de helft van de datapunten staat geen naam (datapunten). 8 · 0-meting: wacht op 4 en 7. 9 · Adoptieframework opstellen: toetsen en vaststellen is aan ons; wie valideert, noemt het plan van aanpak niet (plan van aanpak p. 12). Optelsom: in zes van de negen (2, 4, 5, 6, 7 en 9) hebben wij een eigen actie; een zevende (8) wacht op twee daarvan." },
                { label: "Uit het overleg van 01-10 (intern)", tekst: "Waarnemingen en meningen van deelnemers, zonder namen. Gezegd door een direct betrokkene: de regie over het programma ligt officieel nog bij 3sides en de rol van onze programmamanager is niet uitdrukkelijk uitgesproken; daardoor komen de partijen soms in elkaars vaarwater. Indruk van deelnemers: 3sides ziet zichzelf in een aantal dingen nog als leidend; een uitspraak van 3sides daarover is er niet. Genoemde wens: de regie volledig bij ons, met 3sides als ondersteuning in de werkstromen. De programma-eigenaar wil een stuurgroep, eens in de zes weken: daar wordt de voortgang gedeeld en worden besluiten voorgelegd; op welk moment en op welke punten de stuurgroep beslist of het programma op koers ligt: te bepalen. Verder genoemd: een fasering afspreken, niet alles kan tegelijk; en eerst zelf scherp maken wat we bedoelen met een integraal klantbeeld en met de salesfunnel." },
                { label: "Wat we van 3sides vragen", tekst: "3sides: voorstellen en keuzes aan ons voorleggen voordat ze worden uitgevoerd; de stappen uit het eigen plan regelen (voorbereiden, een datum voorstellen, opvolgen); in de tijdlijn melden zodra iets vastloopt, met wat nodig is en een nieuwe datum. Wat wij zelf doen, staat hierboven onder 'Wat Cito zelf doet (intern)' en op het actiebord." },
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
      "Naast het evaluatiegesprek (deel 8; de agenda daarvan staat in het tabblad Evaluatie 3sides): wat we in het maandelijkse gesprek met 3sides bespreken. We kijken vooruit: we hebben alles gelezen, dit zijn de actiepunten, hoe pakken we ze op? De actiepunten per werkstroom staan in het voortgangsbord (deel 5).",
      [
        lijst(
          [
            "1 · Eén model, één taal: in het meetmodel de begrippen van het programma gebruiken: kunnen en doen horen samen bij het vermogen, en in het meetinstrument op p. 6 'Vermogens (Kunnen)' in plaats van 'Vermogens (Waartoe)' (meetinstrument p. 5 en 6; voorstel), en in alle stukken de namen van de werkstromen die we maandag vaststellen (voorstel: die van het organigram); NPS meten we organisatiebreed (besloten): met de andere organisatiebrede KPI's op doelniveau, als resultante (voorstel; deel 3 en 6).",
            "2 · Plan van aanpak per werkstroom aanvullen: output-KPI per resultaat en de capaciteit die 3sides van Cito nodig heeft; bij adoptie een scope-paragraaf binnen de afbakening van het programma; de eigenaar die Cito aanwijst erin opnemen. 3sides vult aan, Cito toetst en stelt vast (deel 4).",
            "3 · Planning: de planning voor 0-meting en pilots die we intern vaststellen in de tijdlijn verwerken, de open start- en opleverdata invullen, de volgorde van de klantreisvertaling controleren, en per onderdeel 'Completed' zetten zodra het resultaat er is, te beginnen met het samenvoegen van de Klant in Beeld-klantreizen (deel 5 en 7).",
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
          "[[Voorstel van 3sides]] voor 2026 en 2027, met de planning per kwartaal: het eerste voorstel, tekst van 3sides in de gedeelde documentruimte (in dit stuk: voorstel 3sides). Alleen het onderdeel Planning is letterlijk bekend",
          "[[Plan van aanpak]] van 3sides (PDF, 13 p.), gedeeld 29-09-2026",
          "[[Tijdlijn]] van 3sides (Excel, tab v3), stand 28-09-2026",
          "[[0-meting meetinstrument]] (PDF, 16 p.), work in progress",
          "[[Data punten ter input KPI]] (Excel), werkdocument",
          "[[Blueprint klantreis]] (Excel), draft",
          "[[Adoptieframework]] (PDF), work in progress",
          "[[Data & Tech]] (PDF) en de praatplaten [[praatplaat funnel]] en [[praatplaat proces]] (PDF)",
          "[[BV-dag]] (PDF) en [[evaluatie Klant in Beeld]] (Excel): een vragenlijst, ingevuld door 13 deelnemers, van 1 tot en met 10 september 2026 (volgens onze opgave waren er 34 aangeschreven); de tellingen per les in deel 8 zijn van ons, uit de open antwoorden",
          "Statuspagina '3sides-as-a-service' van 3sides, als tekst aangeleverd op 29-09-2026 en in bijgewerkte vorm op 01-10-2026 (in dit stuk: statuspagina 3sides, stand 29-09 en stand 01-10); de pagina zelf draagt geen datum, en de stand van 01-10 hebben wij tot en met de werkstroom Technologielandschap: voor de drie andere werkstromen geldt de stand van 29-09",
          "Miro-bord van de klantreizen, het werkdocument dat de statuspagina noemt; bekeken op 05-10-2026, zonder datum of status op het bord (in dit stuk: Miro-bord klantreis, bekeken 05-10-2026)",
          "Automatische samenvatting en transcriptie van het programmaoverleg van 29-09-2026, met 3sides; niet door beide partijen vastgesteld (in dit stuk: overleg 29-09)",
          "Verslag van het interne programmaoverleg van Cito van 01-10-2026 (in dit stuk: overleg 01-10); gebruikt voor de plaat in twee versies en, in de evaluatie, alleen voor waarnemingen en meningen van het programmateam, zonder namen",
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
