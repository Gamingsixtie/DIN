// Stap 11 — "Programma × 3sides". Kernboodschap: de programmastructuur staat; alles
// wat 3sides heeft, past onder het ene framework van het programma (het Doelen-
// Inspanningennetwerk, DIN); met de juiste rollen in het framework maken we het concreet.
// Verhaallijn in tien delen: de kern → de structuur (plaat met rollen, de toets) → 3sides
// naast het DIN (werkstromen bouwen, kernprincipes meten) → de vier werkstromen → planning,
// voortgang en het actiebord van Cito → het meetmodel → eerst intern besluiten → de
// evaluatie van 3sides op zes kaders → het gesprek met 3sides (de agenda) → bronnen.
// Deel 4, 5 (zonder actiebord) en 8 staan ook op het tabblad Evaluatie en in de exports
// (evaluatie-uitsnede.ts). In deel 8 gaan per kader beeld, punten, aanZet3sides, aanZetCito
// en vraag3sides mee naar 3sides; secties, oordeel en notitie blijven intern.
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
    "Bron: projecttijdlijn 3sides, tab v3, stand 28-09-2026: 28 onderdelen van de vier werkstromen, met start en oplevering waar 3sides die noemt. Namen en voortgang in gewone taal (Loopt = 'In progress', Niet gestart = 'Not started', Afgerond = 'Completed'); status (+, +/-, -) zoals 3sides die rapporteert. Volgorde van de werkstromen als in de plaat.",
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
          legenda: "Vraag aan 3sides: in het meetmodel de begrippen van het programma gebruiken: kunnen en doen horen samen bij het vermogen, en op p. 6 'Vermogens (Kunnen)' in plaats van 'Vermogens (Waartoe)' (meetinstrument p. 5 en 6; voorstel); dan is het één model.",
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
      "3sides heeft het werk van elke werkstroom opgedeeld in onderdelen: 28 in totaal, met per onderdeel de start en de oplevering, waar 3sides die noemt. Die tijdlijn is de basis voor de voortgang. Eerst de tijdlijn, dan wat opvalt in de planning, dan per onderdeel met een oplevering tot en met oktober wat er is geleverd, en als laatste de voortgang per werkstroom. De gegevens zijn de stand van 3sides van 28-09-2026.",
      [
        TIJDLIJN,
        lijst(
          [
            "Verstreken is niet hetzelfde als niet geleverd. In de tijdlijn staat geen enkel onderdeel op 'Completed'; 3sides omschrijft die kolom zelf als 'gestart, gepauzeerd of nog niet gestart' (statuspagina 3sides, stand 01-10). Wat er per onderdeel echt ligt, staat in de tabel 'Geleverd?' hieronder, getoetst aan de oplevering die 3sides zelf in het plan van aanpak schreef.",
            "0-meting: drie planningen. Ons stappenplan noemt Q3; het adoptieframework noemt een volledige nulmeting als succes voor eind Q3 (adoptieframework p. 9); het plan van aanpak zegt Q3/Q4 (plan van aanpak p. 9); de tijdlijn zet de oplevering in oktober, zonder startmaand, en het onderdeel is niet gestart. Het ophalen van de data (september en oktober) staat op rood. Gevolg: de startwaarden van de 14 baten-KPI's komen op zijn vroegst in oktober; de doelwaarden volgen pas in de vervolgsessie daarna.",
            "Adoptie: drie documenten, drie planningen. Stappenplan: pilot in één sector in Q3 2026, de tweede in Q4, de derde in Q1 2027. Plan van aanpak: playbooks in Q4 2026, pilots in Q1 2027. Tijdlijn: eerste sector januari en februari 2027, tweede februari en maart, derde april en mei; playbook-workshops van december 2026 tot mei 2027. Te besluiten: welke planning geldt.",
            "CRM: richting en keuze zijn twee stappen. In de tijdlijn staat 'CRM Richting bepalen' met oplevering in november (tijdlijn, tab v3); het besluit over het CRM valt volgens het stappenplan rond april 2027. Dat past, zolang de richting van november een advies blijft en geen besluit wordt.",
            "Klantreizen: de volgorde van twee opleveringen. De vertaling van de klantreis naar CRM-input en funnelprocessen levert op in november; twee blueprint-onderdelen (proces, CRM-gebruik en KPI's; rollen, gedrag en competenties) leveren pas in december op (tijdlijn, tab v3). Vraag aan 3sides: bouwt de vertaling op die twee onderdelen, en klopt de volgorde dan?",
            "Open einden: vier onderdelen hebben geen oplevermaand (interventies, communicatieplan, adoptieframework toetsen, ambassadeurs en adoptieteam) en twee geen startmaand (de 0-meting en de vertaling van de klantreis naar CRM-input) (tijdlijn, tab v3). Vraag aan 3sides om die maanden in te vullen. De tussenmeting staat op 'In progress' terwijl de start in januari 2027 ligt, en in Jira staat de voortgangsbalk van Succes meten nog geheel op niet gestart (plan van aanpak p. 5); vermoedelijk een invoerfout, die nu meetelt als lopend.",
          ],
          "Wat opvalt in de planning"
        ),
        tabel(
          ["Onderdeel", "Oplevering", "Geleverd?", "Oplevering volgens het plan van aanpak van 3sides", "Wat er ligt", "Wat ontbreekt", "Actie bij"],
          [
            [
              "1 · Klant in Beeld-klantreizen samenvoegen (Klantreizen)",
              "augustus (verstreken)",
              "Nee, deels",
              "In de tijdlijn: 'Consollideren journey workshop Klant in Beeld'. Wij lezen dit als: de afzonderlijke klantreizen uit Klant in Beeld samengebracht in 'één integrale Cito BV klantreis' (plan van aanpak p. 10, onder aanleiding en doel; geen apart resultaat)",
              "3sides meldt: 'Bestaande sectorreizen uit Klant in Beeld zijn verzameld als basis voor één organisatiebrede klantreis' (statuspagina 3sides, stand 29-09). In het overleg: het materiaal is 'op één hoop' gelegd en 'vertaald naar een blueprint' (overleg 29-09, transcriptie). De blueprint bevat één klantreis (blueprint, tab Klantreis fasen, 24-09)",
              "Welke sectorreizen in de blueprint zitten, is er niet uit af te lezen. Het Miro-werkdocument staat op de statuspagina (statuspagina 3sides, stand 29-09), maar zit niet bij de aangeleverde stukken en is niet bekeken. In de tijdlijn staat het onderdeel op 'In progress' met status +/-",
              "3sides: laten zien wat is samengevoegd, of een nieuwe datum geven; daarna het onderdeel op 'Completed' zetten",
            ],
            [
              "2 · Analyse van data en applicaties (Centrale datavoorziening klantcontact)",
              "september (verstreken)",
              "Nee, deels",
              "Een compleet overzicht van de huidige systemen, koppelingen, eigenaren en kosten (plan van aanpak p. 6)",
              "De Data & Tech-plaat (werkdocument, 28-09), volgens 3sides 'Work-In-Progress en wordt continue bijgewerkt'; de evaluatie van het klantadviesproces is afgerond en de eerste evaluatie van het CRM-proces ook (statuspagina 3sides, stand 01-10)",
              "Eigenaren en kosten; de koppelingen staan er deels in (Data & Tech-plaat, 28-09). 3sides zelf: 'We hebben nog niet alle informatie die we nodig hebben' (statuspagina 3sides, stand 01-10)",
              "Beide: 3sides maakt het overzicht af en haalt de stukken op (plan van aanpak p. 7); Cito (SIO) levert de overzichten en architectuurplaten die 3sides nog niet heeft ontvangen, of stelt vast dat ze er niet zijn (statuspagina 3sides, stand 01-10)",
            ],
            [
              "3 · Visie en consequenties (Centrale datavoorziening klantcontact)",
              "september (verstreken)",
              "Nee",
              "In de tijdlijn: 'Visie & Consequentie'. Wij lezen dit als: een gewenst doelbeeld met een set ontwerpprincipes (plan van aanpak p. 6)",
              "Alleen losse inzichten, zoals 'Het technologielandschap is complexer dan past bij de omvang van Cito' (statuspagina 3sides, stand 01-10); geen doelbeeld in de stukken",
              "Het doelbeeld en de ontwerpprincipes; het plan van aanpak zelf zegt Q3/Q4 (p. 7), de tijdlijn september",
              "3sides: nieuwe datum en de vorm van het doelbeeld; hangt af van de analyse hierboven",
            ],
            [
              "4 · Meetmodel ontwikkelen (0-meting)",
              "september (verstreken)",
              "Nee, deels",
              "Het meetmodel opstellen én valideren met stakeholders (plan van aanpak p. 8–9)",
              "Het concept-meetmodel als werkdocument: meetinstrument van 28-09, 16 p.",
              "De validatie; in Jira staat de voortgangsbalk van Succes meten nog geheel op niet gestart (plan van aanpak p. 5)",
              "Beide. Cito valideert: eerst de programma-eigenaar, daarna het MT (overleg 29-09; actiepunt zonder eigenaar). 3sides: de validatie voorbereiden en een datum voorstellen; valideren met stakeholders is een stap in de eigen aanpak (plan van aanpak p. 9). Wie inplant en opvolgt, is nog af te spreken (voorstel van het programma: 3sides)",
            ],
            [
              "5 · Marketing- en salesproces en funnel (Centrale datavoorziening klantcontact)",
              "oktober (loopt nog)",
              "Nee, deels",
              "Geen oplevering vastgelegd in het plan van aanpak; alleen de oplevermaand oktober in de tijdlijn. Af te spreken: wat hier de oplevering is",
              "Twee praatplaten van 28-09, met open vragen; 'Klant funnel + processen, eerste versie bijna afgerond' (statuspagina 3sides, stand 01-10)",
              "De vervolgsessie met de programma-eigenaar en de definities lead, MQL en verkoopkans (statuspagina 3sides, stand 01-10; overleg 29-09)",
              "Beide: 3sides maakt het voorstel, Cito stelt de definities vast met de programma-eigenaar en de verantwoordelijke voor sales (overleg 29-09)",
            ],
            [
              "6 · Blueprint: fasen en hoofdstappen (Klantreizen)",
              "oktober (loopt nog)",
              "Nee, deels",
              "Blueprint gevalideerd door productmanagers en sectormanagers (plan van aanpak p. 10); het plan zet 'Blueprint gevalideerd en toegepast binnen eerste pilotgroep' in Q4 2026 (p. 11)",
              "De blueprint-Excel is gevuld: 6 fasen, 11 subfasen, klantdoel en hoofdstappen (blueprint, 24-09)",
              "De formele validatie. 3sides meldt 'Diverse bijeenkomsten' met negen mensen 'om de klantreis te valideren' (statuspagina 3sides, stand 29-09); het valideren met productmanagers en sectormanagers staat nog open (overleg 29-09)",
              "Vooral Cito: valideren door productmanagers en sectormanagers (overleg 29-09; actiepunt zonder eigenaar). 3sides: de validatie voorbereiden en een datum voorstellen. Wie inplant en opvolgt, is nog af te spreken (voorstel van het programma: 3sides)",
            ],
            [
              "7 · Data ophalen voor het meetmodel (0-meting)",
              "oktober (loopt nog)",
              "Nee, deels",
              "'Gedetailleerde data punten verzameling (data ophalen)' (plan van aanpak p. 8)",
              "De datapuntenlijst van circa 85 punten; bij 9 een naam of rol en bij twee blokken (school- en contactniveau, 30 punten) één naam (datapunten, 24-09); alleen de jaarverslagcijfers zijn ingevuld; status rood (-) in de tijdlijn. 3sides meldt 'Eerste datapunten opgehaald (NPS)' (statuspagina 3sides, stand 29-09); die waarden staan niet in de aangeleverde stukken",
              "Vrijwel alle meetwaarden; bij ruim de helft van de datapunten ontbreekt een naam (datapunten)",
              "Beide: Cito wijst per datapunt aan wie levert; 3sides haalt op in werksessies met eigenaren en gebruikers (plan van aanpak p. 9)",
            ],
            [
              "8 · 0-meting (0-meting)",
              "oktober (loopt nog)",
              "Nee, niet gestart",
              "Startwaarde per baten-KPI en een score per kernprincipe (plan van aanpak p. 8–9; meetinstrument p. 7 en 12)",
              "Geen startwaarde per baten-KPI en geen score per kernprincipe: bij alle 14 baten-KPI's staat als startwaarde nog 'Nulmeting Q3' (meetinstrument p. 7; die tabel is overgenomen uit de baten-KPI's van het programma)",
              "De startwaarden en de scores; het meetmodel is nog niet gevalideerd en de data zijn grotendeels nog niet opgehaald (onderdeel 4 en 7)",
              "Beide: 3sides vult de startmaand in en start zodra het meetmodel is gevalideerd en de data er zijn; Cito: de validatie en de aanlevering van data (onderdeel 4 en 7)",
            ],
            [
              "9 · Adoptieframework opstellen (Adoptieframework)",
              "oktober (loopt nog)",
              "Nee, deels",
              "Adoptieframework gerealiseerd en gevalideerd (plan van aanpak p. 12)",
              "Werkdocument van 15 p. (adoptieframework, 28-09); de eerste opzet is besproken met de programma-architect (statuspagina 3sides, stand 29-09)",
              "De validatie en vaststelling, en een scope-paragraaf zoals bij de andere werkstromen (plan van aanpak p. 12–13); het adoptieframework zelf noemt als succes voor eind Q3: 'Het adoptie-framework formeel is vastgesteld' (adoptieframework p. 9)",
              "Beide: 3sides rondt af; Cito toetst en stelt vast",
            ],
          ],
          {
            titel: "Geleverd? Per onderdeel met een opleverdatum tot en met oktober",
            chipKolom: 2,
            legenda: "Oordeel op 01-10-2026, getoetst aan de oplevering die 3sides zelf in het plan van aanpak schreef: een concept telt niet als geleverd als het plan van aanpak 'gevalideerd' of 'compleet' vraagt. Ja = geleverd. Nee, deels = er ligt een concept of een begin; de oplevering uit het plan van aanpak ligt er nog niet. Nee = niets geleverd. Nee, niet gestart = het onderdeel is nog niet begonnen. Bij de vier onderdelen van augustus en september is de oplevermaand verstreken. Bij de vijf onderdelen van oktober liep de maand op 01-10 nog: daar is het oordeel een tussenstand, geen gemiste datum. De koppeling van elk tijdlijnonderdeel aan een resultaat uit het plan van aanpak is van het programma (voorstel). De nummers zijn dezelfde als in de evaluatie (deel 8). De 19 onderdelen die later opleveren of geen opleverdatum hebben, staan niet in deze tabel. Vermoedelijk een invoerfout in de tijdlijn: de tussenmeting staat op 'In progress' terwijl ze pas in januari 2027 start. Bronnen: plan van aanpak, tijdlijn (stand 28-09), statuspagina 3sides (stand 29-09 en 01-10), overleg 29-09, de werkdocumenten van 24-09 en 28-09.",
          }
        ),
        callout(
          "info",
          "Zo werk je de voortgang bij",
          "De voortgang wordt berekend uit de tijdlijn hierboven. Is een onderdeel ingeleverd, kies dan in het keuzelijstje bij dat onderdeel 'Afgerond', in de tijdlijn of in het voortgangsbord; dat wordt meteen bewaard. Het voortgangsbord en de werkstroomkaarten in deel 4 rekenen direct mee. Een start- of opleverdatum aanpassen doe je met het potlood bij dit deel: klik in de tijdlijn op een maand en daarna op Opslaan. Vinkjes bij 'Nog nodig' zet je gewoon aan zodra iets binnen is; ook die worden meteen bewaard. De standlijn in de tijdlijn staat op vandaag. Het voortgangsbord staat ook los in het tabblad Voortgang. Wat Cito zelf doet, staat in het actiebord onder het voortgangsbord."
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
                { tekst: "Voorstel voor de funneldefinities lead, MQL en verkoopkans, voor de programma-eigenaar en de verantwoordelijke voor sales", klaar: false },
                { tekst: "Oplevermaand voor de interventies", klaar: false },
                { tekst: "Output-KPI's en capaciteit van Cito per resultaat", klaar: false },
              ],
            },
            {
              anker: "klantreizen",
              naam: "Klantreizen",
              geleverd: ["Sectorreizen uit Klant in Beeld verzameld als basis voor één organisatiebrede klantreis (statuspagina 3sides, stand 29-09; in de tijdlijn nog 'In progress')", "Blueprint draft: 6 fasen, 11 subfasen, kernwaarden en kernprincipes", "Eerste KPI's per klantfase"],
              nodig: [
                { tekst: "Laten zien wat er van de Klant in Beeld-klantreizen is samengevoegd, of een nieuwe datum geven; daarna het onderdeel in de tijdlijn op 'Completed' zetten (statuspagina 3sides, stand 29-09: 'verzameld als basis'; tijdlijn: 'In progress')", klaar: false },
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
                { tekst: "Datum voor de validatie van het meetmodel met de programma-eigenaar en het MT, vóór de 0-meting", klaar: false },
                { tekst: "Meetprotocol per baten-KPI: definitie, bron, eenheid, frequentie, wie levert; een voorstel voor de eigenaar per datapunt (Cito wijst aan)", klaar: false },
                { tekst: "0-meting: startmaand invullen en starten zodra het meetmodel is gevalideerd en de data er zijn; oplevering: startwaarde per baten-KPI, score per kernprincipe en de stand per domein (alle vier)", klaar: false },
                { tekst: "In het meetmodel de begrippen van het programma gebruiken: kunnen en doen horen samen bij het vermogen; op p. 6 'Vermogens (Kunnen)' in plaats van 'Vermogens (Waartoe)' (meetinstrument p. 5 en 6; voorstel)", klaar: false },
              ],
            },
          ],
          programmabreed: [
            { tekst: "Jira-bord delen met de bredere groep (actiepunt 29-09)", klaar: false },
            { tekst: "Plan van aanpak aanvullen per werkstroom: output-KPI, benodigde capaciteit van Cito en de eigenaar die Cito aanwijst; 3sides vult aan, Cito toetst en stelt vast", klaar: false },
            { tekst: "In alle documenten de namen van de werkstromen die Cito vaststelt (voorstel: die van het organigram)", klaar: false },
            { tekst: "Projectgroepen per werkstroom in plaats van één-op-één-gesprekken", klaar: false },
          ],
          legenda: "'Nog nodig' is wat we van 3sides vragen, een voorstel van het programma. 'Geleverd volgens 3sides' komt van de statuspagina 3sides, stand 29-09, en van de aangeleverde bestanden.",
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
          ["Programmabreed", "Rolverdeling: het voorstel laten vaststellen door de programma-eigenaar en met 3sides vastleggen: wie de regie voert, wat de rol van de programmamanager is en wie de validaties regelt; en de eigen stukken daarover gelijktrekken: stappenplan, KPI-model en organigram (deel 8; overleg 01-10)", ""],
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
          ["Klantreizen", "Blueprint valideren, door product- en sectormanagers; 3sides bereidt voor en stelt een datum voor. Wie inplant en opvolgt: af te spreken (voorstel: 3sides)", ""],
          ["Klantreizen", "Eigenaar van de blueprint na het programma aanwijzen", ""],
          ["0-meting", "Meetmodel valideren: eerst Meryl, daarna het MT; 3sides bereidt voor en stelt een datum voor. Wie inplant en opvolgt: af te spreken (voorstel: 3sides)", ""],
          ["0-meting", "Data-aanleveranciers per datapunt aanwijzen", ""],
          ["0-meting", "Vervolgsessie plannen voor de doelwaarden en de vermogen-KPI's, na de 0-meting", ""],
        ],
        {
          titel: "Wat Cito zelf moet doen",
          groepKolom: 0,
          invulKolom: 2,
          legenda: "Wie: samen in te vullen. Bronnen: overleg 29-09 en 01-10, organigram, stappenplan, plan van aanpak p. 10–13 en de tijdlijn. Wat we van 3sides vragen, staat in het voortgangsbord hierboven en komt op de agenda in deel 9.",
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
      "Na drie maanden Klant in Zicht hebben we getoetst hoe het werk van 3sides ervoor staat, op zes kaders. De maatstaf is de oplevering die 3sides zelf in het plan van aanpak beschreef. De evaluatie kijkt naar het werk van de vier werkstromen (in het DIN: de inspanningen): is het resultaat opgeleverd, ja of nee. Of de baten al zichtbaar zijn, is hier niet de vraag. Per kader staat de bevinding, de feiten met hun bron, wat 3sides doet, wat Cito doet en de vraag voor het gesprek. Stand van de bronnen: 01-10-2026.",
      [
        callout(
          "besluit",
          "Rolverdeling",
          "Voorstel van het programma voor de rolverdeling, nog vast te stellen door de programma-eigenaar en in het gesprek met 3sides te bevestigen: Cito leidt, 3sides voert uit. Cito bepaalt wat het resultaat moet zijn, toetst het en beslist; de programmamanager van Cito voert de regie over het programma. 3sides stelt het plan van aanpak op, voert uit, bewaakt de planning van de eigen opleveringen en regelt de stappen die daarvoor nodig zijn. Ook waar Cito moet valideren, regelt 3sides de stap: voorbereiden, inplannen, opvolgen en melden als het vastloopt. Cito zorgt dat de juiste mensen beschikbaar zijn.\n\nWat de stukken van 3sides hiervan dragen: volgens 3sides zijn per werkstroom doel, scope, activiteiten en mijlpalen uitgewerkt, en is met het programmamanagement afgesproken wekelijks te rapporteren en belemmeringen zo vroeg mogelijk te signaleren; Cito heeft 3sides uitdrukkelijk gevraagd het tempo erin te houden (statuspagina 3sides, stand 01-10). Toetsen en valideren met stakeholders is een stap in de eigen aanpak van 3sides (plan van aanpak p. 7 en 9). De blueprint wordt gevalideerd door productmanagers en sectormanagers van Cito (plan van aanpak p. 10).\n\nWat nog niet vastligt: dit voorstel is niet met 3sides besproken of vastgelegd; dat Cito bepaalt en 3sides levert, staat alleen in stukken van Cito (stappenplan, eerste schets; organigram, voorstel). Wie een validatie inplant en opvolgt, is niet afgesproken. In het programmateam van Cito is gezegd dat de rol van de programmamanager niet uitdrukkelijk is uitgesproken (overleg 01-10). Dat is aan Cito om recht te zetten.\n\nDaarom staat het bevestigen van de rolverdeling op de agenda van het gesprek. Het inplannen en opvolgen van validaties rekenen we 3sides over de afgelopen drie maanden niet aan: daarover lag geen afspraak. De opleveringen en maanden uit het eigen plan van aanpak en de eigen tijdlijn toetsen we wel."
        ),
        callout(
          "info",
          "Zo gebruiken we de evaluatie (intern)",
          "De bevinding per kader is een voorstel, tot het programmateam heeft geoordeeld. In de app kies je per kader ons oordeel in het keuzelijstje en schrijf je er een notitie bij; beide worden meteen bewaard. De versie voor 3sides bevat per kader de bevinding, de feiten, wie aan zet is en de vraag voor het gesprek. Ons oordeel, de notitie en de onderbouwing per kader blijven intern, net als dit kader. Waarnemingen van het programmateam staan erin als waarneming, niet als feit.\n\nVóór het gesprek zelf na te gaan:\n1 · Het Miro-werkdocument van de klantreizen. Het staat op de statuspagina, maar is niet bekeken. Wat erin is samengevoegd: in te vullen.\n2 · De negen collega's die 3sides noemt bij het valideren van de klantreis. Zijn dat productmanagers en sectormanagers: in te vullen.\n3 · De wekelijkse rapportage. Is die sinds juli elke week binnengekomen: in te vullen (programmamanagement).\n\nVóór het gesprek intern te besluiten:\n1 · De rolverdeling is een voorstel; de programma-eigenaar stelt haar vast. Het voorstel wijkt af van het eerdere voorstel voor de programmaorganisatie: daarin plant de programmamanager van Cito de sessies met de sectoren en regelt de beschikbaarheid; hier regelt 3sides die stap.\n2 · De stukken van Cito zijn niet eenduidig over de regie: het stappenplan legt die bij Cito, de randvoorwaarden in het KPI-model bij 3sides. Dat staat niet in de versie voor 3sides. Te doen: de stukken gelijktrekken, en nagaan wat de opdracht aan 3sides en het goedgekeurde voorstel van 3sides over de rollen zeggen; het origineel van dat voorstel is voor deze evaluatie niet gelezen: in te vullen.\n3 · Wanneer we de evaluatie herhalen (voorstel: elke zes weken, in het ritme van de stuurgroep) en wie het oordeel invult (voorstel: programmamanagement)."
        ),
        {
          type: "evaluatie",
          titel: "",
          intro: "",
          rolCito: "leidt: bepaalt, toetst en beslist",
          rol3sides: "voert uit: stelt op, levert, regelt de stap",
          kaders: [
            {
              id: "levert",
              titel: "1 · Levert 3sides wat is afgesproken?",
              ondertitel: "negen onderdelen met een oplevering tot en met oktober",
              vraag: "Ligt van de negen onderdelen met een oplevermaand tot en met oktober (vier verstreken, vijf in oktober) de oplevering uit het plan van aanpak er, ja of nee?",
              beeld: "Nee, deels: per werkstroom ligt er een concept, maar geen van de vier onderdelen met een verstreken maand is af, en de 0-meting (oktober) is niet gestart. In zes van de negen moet ook Cito nog leveren of beslissen; de 0-meting wacht daarop.",
              actieBij: "3sides en Cito",
              punten: [
                "3sides noemt vier van de vijf eerste opleveringen zelf 'Draft', en in de tijdlijn staat geen van de negen onderdelen op 'Completed' (statuspagina 3sides, stand 01-10; tijdlijn, stand 28-09).",
                "Klantreizen samenvoegen (augustus): de sectorreizen zijn 'verzameld als basis', de tijdlijn zegt 'In progress', en uit de blueprint is niet af te lezen welke sectorreizen erin zitten (statuspagina 3sides, stand 29-09; tijdlijn, stand 28-09; blueprint).",
                "Analyse en meetmodel (september): er ligt een plaat zonder eigenaren en kosten, en een concept-meetmodel dat nog niet is gevalideerd (plan van aanpak p. 6 en 9; Data & Tech; meetinstrument).",
                "Visie en consequenties (september in de tijdlijn): wij lezen dit als het doelbeeld met ontwerpprincipes; dat ligt er niet. Het plan van aanpak geeft er zelf Q3/Q4 voor (plan van aanpak p. 6 en 7; tijdlijn, stand 28-09).",
                "Oktober, vijf onderdelen: bij vier ligt een concept of een lijst (funnel, blueprint, datapunten, adoptieframework); de 0-meting staat op 'Not started', zonder startmaand (tijdlijn, stand 28-09).",
              ],
              aanZet3sides: "Laten zien wat er van de klantreizen is samengevoegd, of een nieuwe datum geven. Per onderdeel aangeven wat de oplevering is en wanneer die komt, te beginnen met de vier verstreken onderdelen.",
              aanZetCito: "Meetmodel en blueprint valideren en het adoptieframework vaststellen, de funneldefinities vaststellen, de stukken van SIO aanleveren of vaststellen dat ze er niet zijn, en per datapunt aanwijzen wie levert.",
              vraag3sides: "Welke van de negen onderdelen zijn volgens jullie af, en waar kunnen wij dat zien?",
              secties: [
                { label: "Afspraak (bron)", tekst: "De oplevering per werkstroom staat in het plan van aanpak (p. 6, 8, 10 en 12), de maand per onderdeel in de tijdlijn (tab v3, stand 28-09). 3sides noemt vier van de vijf eerste opleveringen van juli tot en met september zelf 'Draft' (blueprint klantreis, meetplan met 0-metingdefinities, praatplaat funnel, praatplaat technologielandschap); de vijfde heet 'Adoptieplan' (statuspagina 3sides, stand 01-10)." },
                { label: "1 · Klant in Beeld-klantreizen samenvoegen · augustus, verstreken", tekst: "Nee, deels. Volgens 3sides: de afzonderlijke klantreizen uit Klant in Beeld samengebracht in 'één integrale Cito BV klantreis' (plan van aanpak p. 10, onder aanleiding en doel; het is geen apart resultaat). Ligt er: 3sides meldt 'Bestaande sectorreizen uit Klant in Beeld zijn verzameld als basis voor één organisatiebrede klantreis' (statuspagina 3sides, stand 29-09); in het overleg is gezegd dat het materiaal 'op één hoop' is gelegd en 'vertaald naar een blueprint' (overleg 29-09, transcriptie); de blueprint bevat één klantreis (blueprint, tab Klantreis fasen, 24-09). Ontbreekt: welke sectorreizen in de blueprint zitten, is er niet uit af te lezen; het Miro-werkdocument staat op de statuspagina (statuspagina 3sides, stand 29-09), maar zit niet bij de aangeleverde stukken en is niet bekeken; de tijdlijn zegt 'In progress' met status +/- (stand 28-09), terwijl 'Completed' in de legenda bestaat. In Jira is een klein deel van de blueprint afgerond; welk item dat is, is niet te zien (voortgangsbalk, plan van aanpak p. 5). Waarneming uit het overleg van 01-10: twee deelnemers hadden het samengevoegde resultaat niet gezien; een derde, die bij drie validatiesessies was, had er iets van gezien en zei 'dit is wat mij betreft niet behaald', zonder reden; of dat op het samenvoegen slaat of op de validatie, is uit de transcriptie niet zeker. Vraag aan 3sides: laat zien wat is samengevoegd, of geef een nieuwe datum." },
                { label: "2 · Analyse van data en applicaties · september, verstreken", tekst: "Nee, deels. Volgens 3sides: 'Een compleet overzicht van de huidige systemen, koppelingen, eigenaren en kosten' (plan van aanpak p. 6), via lijsten, werksessies met eigenaren en gebruikers en het verzamelen van kosten en contracten (p. 7). Ligt er: de Data & Tech-plaat als werkdocument (28-09), zonder eigenaren en kosten; de koppelingen staan er deels in. De evaluatie van het klantadviesproces is afgerond en de eerste evaluatie van het CRM-proces ook (statuspagina 3sides, stand 01-10). 3sides zelf: 'Work-In-Progress en wordt continue bijgewerkt', 'We hebben nog niet alle informatie die we nodig hebben' (statuspagina 3sides, stand 01-10); op de town hall van 22-09 zette 3sides het afronden van de inventarisatie in 'De komende 90 dagen' (BV-dag p. 9). Belemmering volgens 3sides: 'Tot nu toe geen overzicht of requirementsdocumenten of architectuurplaten ontvangen van SIO' (statuspagina 3sides, stand 01-10). In het overleg van 01-10 herkend: 'meer praatplaten, maar nog niet echt een concrete analyse' (waarneming)." },
                { label: "3 · Visie en consequenties · september, verstreken", tekst: "Nee. Volgens 3sides: 'Een gewenst doelbeeld met een set ontwerpprincipes' (plan van aanpak p. 6). Ligt er: geen doelbeeld en geen ontwerpprincipes in de stukken; wel losse inzichten ('Het technologielandschap is complexer dan past bij de omvang van Cito', 'Er is geen platform of architectuurteam dat de integratie bewaakt') en de opmerking dat een doelarchitectuur nog bepaald moet worden (statuspagina 3sides, stand 01-10). Datum: de tijdlijn zegt september, het plan van aanpak zelf 'Q3/Q4: ontwikkelen doelbeeld en keuzes' (p. 7): volgens het eigen plan heeft 3sides nog Q4. In Jira: In Progress (plan van aanpak p. 5)." },
                { label: "4 · Meetmodel ontwikkelen · september, verstreken", tekst: "Nee, deels. Volgens 3sides: 'Een compleet overzicht van het meetmodel', van doelen via baten naar vermogens en inspanningen (plan van aanpak p. 8), opgesteld én gevalideerd met stakeholders (p. 9). Ligt er: het concept als werkdocument van 16 p. (meetinstrument, 28-09): meetmodel p. 5, KPI's per niveau p. 6–11, scores per kernprincipe p. 12; op de statuspagina 'Draft meetplan + 0 meeting definities' (statuspagina 3sides, stand 01-10). Ontbreekt: de validatie. 3sides: 'stakeholders worden nu meegenomen om te valideren en buy-in te krijgen. Dit gebeurt in de komende maand met de stakeholders' (statuspagina 3sides, stand 29-09). Het actiepunt 'Meetmodel valideren met Meryl als opdrachtgever en daarna met het MT' heeft in de samenvatting van het overleg geen eigenaar en geen datum (overleg 29-09). In Jira staat de voortgangsbalk van Succes meten nog geheel op niet gestart (plan van aanpak p. 5)." },
                { label: "5 · Marketing- en salesproces en funnel · oktober", tekst: "Nee, deels; de oplevermaand loopt nog. Volgens 3sides: oplevering in oktober (tijdlijn); het plan van aanpak noemt geen aparte oplevering voor funnel en salesproces (p. 6 noemt vijf resultaten, zonder funnel), dus wat hier 'geleverd' is, is niet vastgelegd. Ligt er: twee praatplaten van 28-09, de praatplaat funnel met een blok 'Nog afstemmen' en de praatplaat proces met open vragen; 'Klant funnel + processen, eerste versie bijna afgerond' en 'Vervolg sessie staat nog gepland' (statuspagina 3sides, stand 01-10). Ontbreekt: de vervolgsessie met de programma-eigenaar en de definities van lead, marketing qualified lead en verkoopkans, die bij Cito nog niet uniform zijn (statuspagina 3sides, stand 01-10; overleg 29-09)." },
                { label: "6 · Blueprint: fasen en hoofdstappen · oktober", tekst: "Nee, deels; de oplevermaand loopt nog. Volgens 3sides: een compleet matrixoverzicht van fasen, klantdoelen, hoofdstappen, kernwaarden en kernprincipes, 'gevalideerd door product managers en sector managers' (plan van aanpak p. 10); het plan zet 'Blueprint gevalideerd en toegepast binnen eerste pilotgroep' in Q4 2026 (p. 11). Ligt er: de blueprint met 6 fasen, 11 subfasen, klantdoel en hoofdstappen (blueprint, tab Klantreis fasen, 24-09); 'De eerste versie van de fasen en stappen in de klantreis is vastgelegd' (statuspagina 3sides, stand 29-09). Ontbreekt: de formele validatie. 3sides meldt 'Diverse bijeenkomsten' met negen mensen 'om de klantreis te valideren' (statuspagina 3sides, stand 29-09); of dat productmanagers en sectormanagers zijn, staat in geen stuk. Het actiepunt 'Blueprint klantreis valideren met productmanagers en sectormanagers' staat open, zonder eigenaar en zonder datum (overleg 29-09)." },
                { label: "7 · Data ophalen voor het meetmodel · oktober", tekst: "Nee, deels; de oplevermaand loopt nog, status rood. Volgens 3sides: 'Gedetailleerde data punten verzameling (data ophalen)' (plan van aanpak p. 8), via werksessies met eigenaren en gebruikers (p. 9). Ligt er: de datapuntenlijst van circa 85 datapunten met eenheid; bij 9 een naam of rol, bij twee blokken van samen 30 datapunten één naam, en bij 8 van de 14 baten-KPI's een naam (datapunten, 24-09); alleen de jaarverslagcijfers hebben waarden, verder staat er geen enkele meetwaarde in. 3sides meldt 'Eerste datapunten opgehaald (NPS)'; die waarden staan niet in de aangeleverde stukken. Het data-overzicht voor de 0-meting is met de programmamanager gedeeld (statuspagina 3sides, stand 29-09). In de tijdlijn staat dit onderdeel op '-' zonder toelichting wat er vastzit (stand 28-09)." },
                { label: "8 · 0-meting · oktober", tekst: "Nee: niet gestart. Volgens 3sides: een 0-meting op de programma-KPI's, de baten-KPI's per sector en voor de BV en de klantreis-KPI's binnen de vijf kernprincipes (plan van aanpak p. 8–9), 'Q3/Q4 2026: 0-meting gerealiseerd' (p. 9). Ons stappenplan (19-08) zegt Q3; in het meetinstrument staat 'Nulmeting Q3' als startwaarde bij elke baten-KPI (meetinstrument p. 7; die tabel is overgenomen uit het KPI-model van Cito); het adoptieframework noemt als succes voor eind Q3: 'Een volledige nulmeting beschikbaar is voor mens, proces, data en cultuur' (adoptieframework p. 9). Ligt er: geen startwaarde per baten-KPI en geen score per kernprincipe; wel de jaarverslagcijfers en, volgens 3sides, eerste NPS-datapunten (zie 7). Tijdlijn: 'Not started', status '-', oplevering oktober, geen startmaand (stand 28-09). Oktober valt binnen het Q3/Q4 van het plan van aanpak. Op de town hall van 22-09 stond bij 'De komende 90 dagen' voor de 0-meting: '0 Meting: we bepalen de cijfers waarop we gaan meten' (BV-dag p. 9): eerst nog de cijfers bepalen, dan pas meten. Voorwaarden: een gevalideerd meetmodel (4) en de opgehaalde data (7)." },
                { label: "9 · Adoptieframework opstellen · oktober", tekst: "Nee, deels; de oplevermaand loopt nog. Volgens 3sides: het adoptieframework gerealiseerd en gevalideerd (plan van aanpak p. 12); het framework zelf noemt als succes voor eind Q3: 'Het adoptie-framework formeel is vastgesteld' (adoptieframework p. 9). Ligt er: het werkdocument van 15 p. (adoptieframework, 28-09; voorblad 'Augustus 2025'); 'Adoptieplan' bij de eerste opleveringen (statuspagina 3sides, stand 01-10); de eerste opzet is besproken met de programma-architect (statuspagina 3sides, stand 29-09). Ontbreekt: de validatie en vaststelling, en een scope-paragraaf zoals bij de andere werkstromen (plan van aanpak p. 12–13; deel 4). Wie valideert, noemt het plan van aanpak niet. De inhoudelijke toets van het framework staat in kader 5." },
                { label: "Telling", tekst: "Negen onderdelen: 0 × ja, 7 × nee, deels (1, 2, 4, 5, 6, 7, 9), 2 × nee (3; 8 niet gestart). Van de vier verstreken onderdelen: 3 × nee, deels (1, 2, 4) en 1 × nee (3). Van de vijf oktober-onderdelen: 4 × nee, deels (er ligt een concept of een lijst: 5, 6, 7, 9) en 1 × niet gestart (8). Geen enkel concept is formeel gevalideerd of vastgesteld; 3sides meldt wel bijeenkomsten 'om de klantreis te valideren' (statuspagina 3sides, stand 29-09). Bij de vijf oktober-onderdelen is het oordeel een tussenstand: de maand liep op 01-10 nog. De 19 onderdelen die later opleveren of geen oplevermaand hebben, zijn hier niet beoordeeld (zie deel 5)." },
                { label: "Uit het overleg van 01-10 (intern)", tekst: "Mening van deelnemers: uit Klant in Beeld ligt al veel informatie; gevraagd is waarom daar nog geen eerste concrete analyses of snelle resultaten uit zijn gekomen. In de evaluatie van Klant in Beeld staat dat woord niet, wel verbeterpunten als 'Scherper doelen formuleren en sneller concreet worden' en 'concretere plannen' (evaluatie Klant in Beeld). Ons stappenplan noemt voor eind Q4 2026: 'Eerste quick win zichtbaar gerealiseerd' (stappenplan). Vraag voor 3sides: welke eerste resultaten kunnen er op korte termijn komen?" },
                { label: "Wie is aan zet", tekst: "Per onderdeel in kader 6. In één zin: Cito valideert, levert de stukken van SIO en wijst aan wie de data levert; 3sides maakt de analyse en het doelbeeld af, noemt datums en statussen en laat zien wat er van de klantreizen is samengevoegd. Wie de validaties inplant en opvolgt, is nog af te spreken (voorstel van het programma: 3sides)." },
              ],
              oordeel: "",
              notitie: "",
            },
            {
              id: "tempo",
              titel: "2 · Houdt 3sides het tempo?",
              ondertitel: "uren, oplevermaanden en verschuivingen",
              vraag: "Houdt 3sides het tempo waar Cito uitdrukkelijk om vroeg: worden de uren gemaakt, komen de onderdelen af in de maand uit de eigen tijdlijn en blijven de datums staan?",
              beeld: "Deels: het team is beschikbaar en maakt de uren, augustus uitgezonderd, maar opleveringen schuiven en de tijdlijn van 28-09 houdt verstreken maanden aan zonder nieuwe datum. Een deel van de oorzaak ligt bij Cito: afwezigheid in de zomer en stappen die Cito nog moet zetten.",
              actieBij: "3sides en Cito",
              punten: [
                "De uren: 493,25 van 696 tot en met 25-09. September is vrijwel volledig benut; augustus bleef op 80 van 232, door vakanties en afwezigheid aan beide kanten (statuspagina 3sides, stand 29-09).",
                "Van vier onderdelen is de oplevermaand verstreken; de tijdlijn houdt die maanden aan en noemt geen nieuwe datum (tijdlijn, stand 28-09).",
                "Voor de 0-meting noemt 3sides eind Q3 en Q3/Q4; de tijdlijn zet de oplevering in oktober, zonder startmaand, en het onderdeel is niet gestart (adoptieframework p. 9; plan van aanpak p. 9; tijdlijn, stand 28-09).",
                "Voor de eerste pilot noemt 3sides drie momenten: eind Q3 2026, Q4 2026 en Q1 2027; de tijdlijn zegt januari en februari 2027 (adoptieframework p. 9 en 10; plan van aanpak p. 11 en 13; tijdlijn, stand 28-09).",
                "Twee onderdelen met een start in oktober staan op 28-09 al op 'In progress': rollen, gedrag en competenties, en het toetsen van het adoptieframework (tijdlijn, stand 28-09).",
              ],
              aanZet3sides: "Bij elk verstreken onderdeel een nieuwe datum in de tijdlijn zetten. Vooraf melden als mensen van Cito niet beschikbaar zijn, met wat dat voor de datum betekent.",
              aanZetCito: "Eén planning voor de 0-meting en de pilots vaststellen. De eigen mensen beschikbaar maken voor de validaties en voor de aanlevering van data en stukken.",
              vraag3sides: "Welke datums gelden nu voor de vier verstreken onderdelen, en wat hebben jullie van Cito nodig om ze te halen?",
              secties: [
                { label: "Afspraak (bron)", tekst: "Cito heeft 3sides 'expliciet gevraagd om het tempo erin te houden', omdat projecten bij Cito soms lang doorlopen (les uit Klant in Beeld); daarom '3sides as a service': het team blijft beschikbaar en het risico op vertraging wordt beperkt (statuspagina 3sides, stand 01-10). Budget 232 uur per maand (statuspagina 3sides, stand 29-09). Oplevermaand per onderdeel in de tijdlijn (tab v3); planning per kwartaal in het plan van aanpak (p. 7, 9, 11 en 13)." },
                { label: "Uren (bron)", tekst: "Juli 186,5 van 232 uur (80%), augustus 80 (34%; lager door vakanties en afwezigheid van zes mensen, van Cito en van 3sides), september 226,75 tot en met 25-09 (98%); samen 493,25 van 696 uur, 71% (statuspagina 3sides, stand 29-09; percentages berekend). De 197,5 niet-gebruikte uren van juli en augustus schuiven door naar de komende maanden (statuspagina 3sides, stand 29-09); wat ze opleveren staat nergens. De uren staan per maand, niet per werkstroom." },
                { label: "Opleverdata (bron)", tekst: "Van vier van de negen onderdelen met een oplevering tot en met oktober is de maand verstreken (augustus: klantreizen samenvoegen; september: analyse, visie en consequenties, meetmodel). De tijdlijn van 28-09 houdt die maanden aan als oplevering, zonder nieuwe datum. De statuspagina van 01-10 noemt voor de analyse en het doelbeeld geen nieuwe datum; de delen klantreis en succes meten van die stand zijn niet bekeken. Daartegenover: twee onderdelen met een start in oktober staan al op 'In progress' (rollen, gedrag en competenties; adoptieframework toetsen; tijdlijn, stand 28-09); of dat een vroege start is of een invoerfout zoals bij de tussenmeting, is niet te zien. Vier onderdelen hebben geen oplevermaand en twee geen startmaand (deel 5)." },
                { label: "Verschuivingen (bron)", tekst: "0-meting: Q3 in ons stappenplan (19-08) en in het adoptieframework (succes eind Q3, p. 9); het meetinstrument zegt 'Nulmeting Q3' (p. 7), maar die tabel is overgenomen uit het KPI-model van Cito; 'Q3/Q4' in het plan van aanpak (p. 9); oktober in de tijdlijn, niet gestart, en oktober valt binnen dat Q3/Q4. Eerste pilot: Q3 2026 in ons stappenplan en in het adoptieframework (p. 9); Q4 2026 in het plan van aanpak ('Blueprint gevalideerd en toegepast binnen eerste pilotgroep', p. 11) en in het adoptieframework ('Pilot Start Q4', p. 10); Q1 2027 in hetzelfde plan van aanpak (p. 13) en januari–februari 2027 in de tijdlijn. Technologielandschap: september voor de analyse in de tijdlijn, maar op de town hall van 22-09 'De komende 90 dagen' voor het afronden van de inventarisatie (BV-dag p. 9)." },
                { label: "Uit het overleg van 01-10 (intern)", tekst: "Mening van deelnemers: dat het werk in de zomer later op gang kwam door vakanties, ook bij Cito, is begrijpelijk. Wens voor het vervolg: als mensen van Cito niet beschikbaar zijn, meldt 3sides dat vooraf en noemt het een nieuwe datum. Genoemd gevolg: elke maand dat de 0-meting later komt, schuift ook het vaststellen van de KPI-waarden op; de zorg is dat het net als bij Klant in Beeld lang gaat duren." },
                { label: "Wie is aan zet", tekst: "3sides: per verstreken onderdeel een nieuwe datum en de oplevering in de tijdlijn; per werkstroom zeggen wat de 197,5 doorgeschoven uren opleveren. Cito: één planning voor 0-meting en pilots vaststellen (besluitpunt, deel 7), de validaties doen en de mensen daarvoor beschikbaar maken. Wie de validaties inplant en opvolgt, is nog af te spreken (kader 6)." },
              ],
              oordeel: "",
              notitie: "",
            },
            {
              id: "rapportage",
              titel: "3 · Rapporteert 3sides zoals afgesproken?",
              ondertitel: "tijdlijn, Jira en statuspagina",
              vraag: "Rapporteert 3sides zoals afgesproken, en lezen we uit de rapportage wat af is, wat vastzit en waarom?",
              beeld: "Deels: de afgesproken instrumenten zijn er en worden gevuld, maar ze spreken elkaar tegen en 'Completed' wordt niet gebruikt. Wat af is, is uit de rapportage niet te lezen; wat vastzit en waarom staat alleen op de statuspagina, bij één werkstroom.",
              actieBij: "3sides en Cito",
              punten: [
                "Afgesproken met het programmamanagement: wekelijks rapporteren in een Excel met per activiteit de stand, en een status om belemmeringen vroeg te zien (statuspagina 3sides, stand 01-10).",
                "In de tijdlijn staat bij 0 van de 28 onderdelen 'Completed': 17 keer 'In progress' en 11 keer 'Not started' (tijdlijn, stand 28-09).",
                "Bij de statussen +/- (7 keer) en - (2 keer) staat niet wat er vastzit; de belemmering bij de analyse staat wel op de statuspagina (tijdlijn, stand 28-09; statuspagina 3sides, stand 01-10).",
                "Jira en tijdlijn spreken elkaar tegen: in Jira staat de balk van Succes meten op niet gestart, in de tijdlijn staan meetmodel en data ophalen op 'In progress' (plan van aanpak p. 5; tijdlijn, stand 28-09).",
                "Het programmateam ervaart dat de werkdocumenten eind september in één keer kwamen; op de statuspagina dragen ze een datum van 28 of 29 september (overleg 01-10; statuspagina 3sides, stand 29-09).",
              ],
              aanZet3sides: "'Completed' zetten zodra een onderdeel af is, bij elke +/- en - schrijven wat vastzit en wat nodig is, Jira en tijdlijn gelijktrekken, en per onderdeel tussentijds een eerste versie delen.",
              aanZetCito: "De rapportage-afspraak vastleggen: wat er elke week in staat en wie het leest. Op een gemelde belemmering reageren met een besluit of een naam.",
              vraag3sides: "Waar zien wij in de tijdlijn dat een onderdeel af is, en waar lezen we wat er vastzit en wat jullie nodig hebben?",
              secties: [
                { label: "Afspraak (bron)", tekst: "Afgesproken met het programmamanagement (statuspagina 3sides, stand 01-10): wekelijks rapporteren met een Excel van stromen en activiteiten, per activiteit 'gestart, gepauzeerd of nog niet gestart', plus een status om 'zo vroeg mogelijk impediments te identificeren'; Jira voor de eigen taken; elke dinsdag bij Cito aanwezig." },
                { label: "Tijdlijn (bron)", tekst: "Het bestand is aangemaakt op 18-09 en gewijzigd op 28-09 (bestandsgegevens tijdlijn); we hebben één stand; of er sinds juli wekelijks is gerapporteerd, blijkt niet uit de stukken: in te vullen (programmamanagement). De kolom Progress kent 'In progress', 'Not started' en 'Completed' (legenda); 'gepauzeerd' bestaat er niet en 'Completed' is bij 0 van 28 onderdelen gebruikt (17 × In progress, 11 × Not started). De kolom Status kent +, +/- en - zonder omschrijving: 8 × +, 7 × +/-, 2 × - (data ophalen, 0-meting), nergens een toelichting wat er vastzit; de belemmering bij de analyse (geen stukken van SIO) staat op de statuspagina (statuspagina 3sides, stand 01-10), in de tijdlijn staat de analyse op +/-. 'Tussenmeting' staat op 'In progress' terwijl de start in januari 2027 ligt en de voortgangsbalk van Succes meten in Jira geheel op niet gestart staat: vermoedelijk een invoerfout." },
                { label: "Jira en statuspagina (bron)", tekst: "Jira kennen we alleen als schermafdruk (plan van aanpak p. 5): tien van de negentien items zijn te zien, de rest alleen als voortgangsbalk per stroom. Het Jira-bord delen met de bredere groep is een actiepunt (overleg 29-09). Jira en tijdlijn, allebei van 3sides, spreken elkaar tegen: de balk van Succes meten staat in Jira geheel op niet gestart, in de tijdlijn staan drie onderdelen op 'In progress' (waaronder de tussenmeting, vermoedelijk een invoerfout); 'Integratie approach' staat in Jira op 'To Do', in de tijdlijn op 'In progress'; bij de blueprint is in Jira een klein deel afgerond (welk item is niet te zien), in de tijdlijn staat geen enkel 'Completed' (plan van aanpak p. 5; tijdlijn, stand 28-09). De statuspagina wordt bijgehouden (tussen 29-09 en 01-10 kwamen de kick-off voor het MT van 9 juli en de datum van de town hall erbij) en benoemt belemmeringen wel. Uren: per maand, niet per werkstroom; 232 min 80 staat er als 151, het totaal van 197,5 klopt wel (statuspagina 3sides, stand 29-09)." },
                { label: "Dinsdag (bron)", tekst: "Of 3sides elke dinsdag aanwezig is, is uit de stukken niet te toetsen; op de town hall stond: 'We zijn hier op dinsdagen aanwezig' (BV-dag p. 10). Het overleg van 29-09 plant een voorbereiding op maandag (11:00–12:00) naast de bestaande dinsdag. In te vullen (programmamanagement)." },
                { label: "Uit het overleg van 01-10 (intern)", tekst: "Waarneming van het programmateam: de werkdocumenten kwamen eind september in één keer, twaalf tot vijftien stuks volgens een deelnemer, nadat Cito ernaar vroeg; op de statuspagina dragen de tien gedeelde documenten een datum van 28 of 29 september (statuspagina 3sides, stand 29-09). Het team ervaart dat het weinig wordt meegenomen in lopend werk: resultaten komen als geheel, niet in stappen; over het communicatieplan heeft het nog niets gehoord. Feit: op 01-10 konden nog niet alle leden van het programmateam in de gedeelde documentruimte; bij wie die actie ligt, is niet duidelijk. Wens: per onderdeel tussentijds een eerste versie delen." },
                { label: "Wie is aan zet", tekst: "3sides: 'Completed' zetten zodra een onderdeel af is, de tussenmeting corrigeren, Jira en tijdlijn gelijktrekken, bij elke - en +/- zeggen wat vastzit, bij een verstreken onderdeel een nieuwe datum, de uren per werkstroom naast de opleveringen, en tussentijds een eerste versie delen. Cito (programmamanagement): de rapportage-afspraak zo vastleggen: wekelijks de tijdlijn, met 'Completed' waar het af is, een toelichting bij elke - en +/-, een nieuwe datum bij een verstreken onderdeel en de uren per werkstroom (actiebord); en op een gemelde belemmering reageren met een besluit of een naam." },
              ],
              oordeel: "",
              notitie: "",
            },
            {
              id: "din",
              titel: "4 · Sluit het aan op het DIN, en ligt het eigenaarschap bij Cito?",
              ondertitel: "één framework, één taal, en eigenaarschap in de werkstromen",
              vraag: "Werkt 3sides in het ene framework van het programma, het Doelen-Inspanningennetwerk (DIN), en zó met de mensen van Cito dat kennis en eigenaarschap bij Cito komen te liggen?",
              beeld: "Deels: het framework sluit aan, met verschillen in taal. Het eigenaarschap ligt nog niet bij Cito: 3sides werkt vooral één-op-één, en Cito heeft de leads per werkstroom en de regie niet vastgelegd.",
              actieBij: "3sides en Cito",
              punten: [
                "3sides gebruikt dezelfde vier niveaus en dezelfde vier werkstromen, en noemt bij het meten de doelen en baten van het programma leidend (plan van aanpak p. 2, 3 en 8).",
                "De taal verschilt: 'inspanning' is bij 3sides het concrete doen, in het DIN het werk dat een vermogen opbouwt; en de werkstromen hebben twee sets namen (plan van aanpak p. 2 en 3; meetinstrument p. 5; organigram).",
                "Volgens de samenvatting van het overleg zijn gesprekken 'voornamelijk individueel gevoerd' en is er 'behoefte aan formele projectgroepen per werkstroom' (overleg 29-09).",
                "Het plan van aanpak noemt per werkstroom geen eigenaar bij Cito; Cito heeft de Cito-leads voorgesteld, maar nog niet vastgesteld (plan van aanpak p. 6 tot en met 13; organigram, voorstel).",
                "In het programmateam is gezegd dat niet uitdrukkelijk is uitgesproken wie de regie voert; dat is aan Cito om recht te zetten (overleg 01-10).",
              ],
              aanZet3sides: "In het meetmodel en de andere stukken de begrippen en de werkstroomnamen van het programma gebruiken. Per werkstroom met een projectgroep werken en keuzes kort op papier onderbouwen.",
              aanZetCito: "Uitspreken wie de regie voert en wat de rol van de programmamanager is. De Cito-leads laten vaststellen door de programma-eigenaar, de projectgroepen bemensen en de werkstroomnamen vaststellen.",
              vraag3sides: "Wat is voor jullie de reden om de gesprekken vooral één-op-één te voeren, en wat is nodig om per werkstroom met een projectgroep te werken?",
              secties: [
                { label: "Afspraak (bron)", tekst: "Het plan van aanpak zet dezelfde vier niveaus in, doelen, baten, vermogens en inspanningen (p. 2), en dezelfde vier werkstromen (p. 3); bij het meten: 'Gedefinieerde Doelen en Baten vanuit het programma zijn leidend' (p. 8); de blueprint 'wordt gedragen door de product managers en sector managers' (p. 10). Overleg 29-09: projectgroepen per werkstroom, het Jira-bord delen met de bredere groep, de onderbouwing van keuzes vastleggen. Statuspagina 3sides, stand 01-10: elke dinsdag bij Cito." },
                { label: "Framework en taal (bron)", tekst: "Hetzelfde: de vier niveaus (plan van aanpak p. 2), onze drie doelen als vertrekpunt (meetinstrument p. 2), de 14 baten-KPI's per sector (meetinstrument p. 7). Anders: 'inspanning' is bij 3sides het concrete doen, gedrag (plan van aanpak p. 2; meetinstrument p. 5), in het DIN het werk dat een vermogen opbouwt en dat de werkstromen uitvoeren; de vermogens heten 'Waartoe' op meetinstrument p. 6 en 'Kunnen' op p. 5; de vier organisatiebrede KPI's (NPS, conversie, omzet, retentie) staan bij 3sides als baten (meetinstrument p. 8), bij ons op doelniveau als resultante (besloten, bevestigd door de programma-architect op 01-10; deel 3); de werkstromen hebben twee sets namen (deel 3; besluitpunt deel 7). Het advies van 3sides om de 0-meting ook op vermogens en inspanningen te doen (statuspagina 3sides, stand 29-09) past bij ons besluit: de 0-meting is één inspanning over alle vier domeinen (besluit programma-architect, 30-09; ter bevestiging). In het overleg van 01-10 waren de deelnemers het eens: de begrippen van Cito gelden, 3sides sluit daarop aan." },
                { label: "Samenwerking (bron)", tekst: "Veel gesprekken: negen namen bij de klantreis, negen bij het technologielandschap, drie bij het meten en één bij adoptie (statuspagina 3sides, stand 29-09); vaste momenten: dinsdag bij Cito (statuspagina 3sides, stand 01-10), een gepland wekelijks klantreisoverleg met twee mensen van Cito (statuspagina 3sides, stand 29-09) en een wekelijks overleg over het technologielandschap (overleg 29-09). Maar: 'gesprekken voornamelijk individueel gevoerd; behoefte aan formele projectgroepen per werkstroom' en 'veel kennis zit bij losse individuen binnen Cito zonder gezamenlijk overzicht' (overleg 29-09). Eigenaarschap: het plan van aanpak noemt geen Cito-eigenaar per werkstroom; de statuspagina noemt één medewerker van Cito als beoogd eigenaar van blueprint én adoptie (statuspagina 3sides, stand 29-09); de Cito-leads per werkstroom staan in het organigram als voorstel en zijn nog niet vastgesteld (actiebord: rollen laten vaststellen door de programma-eigenaar). De formele validaties door productmanagers en sectormanagers, de programma-eigenaar en het MT staan nog open (kader 1), dus 'gedragen door' is nog niet waar." },
                { label: "Regie (bron)", tekst: "De stukken van Cito zijn niet eenduidig. Stappenplan (19-08; status 'eerste schets'): 'wij voeren de regie' en 'Cito is opdrachtgever: wíj bepalen wat er nodig is, 3sides levert daarop'. KPI-model, randvoorwaarden: 'Regie & programmaleiding bij 3sides', voor 'voortgang, tempo en verbinding tussen de sectoren'. Organigram (voorstel): de programmamanager van Cito voert de regie. In de stukken van 3sides komt het woord regie niet voor; 3sides zet zichzelf wel in de stuurgroep (adoptieframework p. 5), het organigram doet dat niet. Overleg 01-10 (waarneming van een direct betrokkene): de regie over het programma ligt officieel nog bij 3sides, de rol van de programmamanager van Cito is niet uitdrukkelijk uitgesproken, en daardoor komen beide partijen in elkaars vaarwater. Dat 3sides zichzelf op onderdelen nog als leidend ziet, is een indruk van deelnemers; een uitspraak van 3sides daarover is er niet. Te controleren: wat de opdracht aan 3sides over de regie zegt." },
                { label: "Uit het overleg van 01-10 (intern)", tekst: "Waarnemingen en meningen van deelnemers, zonder namen. 3sides voert de gesprekken vooral één-op-één; gezegd is dat 3sides daar bewust voor kiest, de reden kent het programma niet (van horen zeggen). In de werkstroom Centrale datavoorziening klantcontact spreekt 3sides volgens een deelnemer vooral met leden van het managementteam, en niet met iedereen die Cito erbij wil hebben (indruk; te toetsen aan de namen op de statuspagina). 3sides vroeg waarom een collega van Cito voor een overleg was uitgenodigd en wat zijn rol is: de rollen aan de kant van Cito zijn bij 3sides dus niet bekend, en Cito heeft de leads nog niet vastgesteld. De programmaorganisatie (wie doet wat, wie beslist) heeft Cito zelf uitgewerkt; of dat bij de opdracht aan 3sides hoorde: te controleren in de opdracht. Ook binnen Cito heeft niemand het hele beeld van hoe de systemen samenwerken; een voorstel over het CRM vraagt daarom een toets met de mensen van Cito die de risico's kennen. Zo wil het programmateam werken: per werkstroom een projectgroep met mensen uit de organisatie, eerst een gezamenlijke sessie, dan een voorstel van 3sides, een toets door de projectgroep, bij voorkeur samen met 3sides, en daarna besluit Cito. Losse gesprekken halen informatie op; een gezamenlijk beeld ontstaat pas als de betrokkenen het samen bespreken. Voorstel, nog niet besloten: adoptie is onderdeel van elke werkstroom en geen apart eigenaarschap naast de klantreis." },
                { label: "Wie is aan zet", tekst: "3sides: in het meetmodel de begrippen van het programma gebruiken: kunnen en doen horen samen bij het vermogen, en op p. 6 'Vermogens (Kunnen)' in plaats van 'Vermogens (Waartoe)' (meetinstrument p. 5 en 6; voorstel), één set namen in alle stukken, het Jira-bord delen, keuzes onderbouwen op één A4 (overleg 29-09), en per werkstroom met een projectgroep werken. Cito: de regie en de rol van de programmamanager uitspreken en met 3sides vastleggen, en de eigen stukken daarover gelijktrekken; de Cito-leads per werkstroom laten vaststellen (organigram; actiebord); een projectgroep samenstellen met capaciteit van sector- en afdelingsmanagers (actiepunt 29-09; actiebord); de werkstroomnamen vaststellen (besluitpunt, deel 7)." },
              ],
              oordeel: "",
              notitie: "",
            },
            {
              id: "mensen",
              titel: "5 · Neemt 3sides de medewerkers van Cito mee in de verandering?",
              ondertitel: "de organisatie buiten de werkstromen: teams en rollen die anders gaan werken",
              vraag: "Neemt 3sides de medewerkers van Cito mee, zoals het eigen plan van aanpak vraagt: weet iedereen wat Klant in Zicht betekent voor de eigen sector, het eigen team en de eigen rol?",
              beeld: "Nee, deels: 3sides spreekt veel mensen, maar na de eerste presentatie is het meenemen van de medewerkers zelf nog niet begonnen, en het adoptieframework zegt nog niet hoe. De kennis is er; het knelpunt is de aansluiting op Cito, en Cito koos adoptieteam en pilotsector nog niet.",
              actieBij: "3sides en Cito",
              punten: [
                "3sides sprak veel mensen: negen namen bij de klantreis en negen bij het technologielandschap; er was een kick-off voor het MT en een presentatie op de town hall (statuspagina 3sides, stand 29-09 en 01-10).",
                "Het adoptieframework noemde voor eind Q3 'Minimaal 3-5 ambassadeurs' en een gestarte pilotgroep; de tijdlijn start adoptieteam en communicatieplan in oktober en de eerste pilot in januari 2027 (adoptieframework p. 9; tijdlijn, stand 28-09).",
                "Van de vijf lagen in het adoptieframework is alleen de eerste volledig uitgewerkt; de vijfde is leeg, en de fasering staat in weken zonder datum (adoptieframework p. 10 en 15).",
                "Volgens de samenvatting van het overleg zijn de slides en modellen 'niet direct geschikt voor brede organisatiecommunicatie; doelgroepspecifieke vertaling is nodig' (overleg 29-09).",
                "Het programmateam ervaart: kennis en toolkit zijn goed en de samenwerking is prettig; het knelpunt is dat de aanpak uitgaat van een organisatie die al met klantreizen en funnels werkt (overleg 01-10).",
              ],
              aanZet3sides: "Het adoptieframework afmaken als stuk voor Cito: hoe, met wie en wanneer. Een concreet voorstel doen voor het adoptieteam en de ambassadeurs, en per doelgroep een vertaling maken in gewone taal.",
              aanZetCito: "De mensen voor het adoptieteam en de champions aanwijzen, de eerste pilotsector kiezen en HR aanhaken. Eerst zelf vaststellen wat we met een integraal klantbeeld bedoelen.",
              vraag3sides: "Hoe maken jullie de aanpak kleiner en praktischer voor collega's voor wie klantreizen en funnels nieuw zijn?",
              secties: [
                { label: "Afspraak (bron)", tekst: "Plan van aanpak p. 12: 'Het programma is slechts dan succesvol wanneer werken vanuit Klant in zicht door de hele organisatie wordt gedragen. Middels een gedragsveranderingsprogramma zorgen we dat iedereen weet wat Klant in zicht betekent voor jouw sector, jouw team en jouw rol'; opleveringen: adoptieframework gerealiseerd en gevalideerd, playbook-workshops met de eerste pilotsector en per rol één A4 'Mijn rol in de klantreis', een communicatieplan, een kern-adoptieteam en champions per afdeling (p. 12); aanpak 'communiceren op why, how & what samen met adoptie team en champions' (p. 13). Adoptieframework: het adoptieteam zorgt dat 'Breder informatie gedeeld wordt', 'Betrokkenheid wordt gevraagd van key stakeholders en eigenaren van de klantreis' en 'Rapportage van voortgang wordt gedaan naar de hele organisatie' (p. 4); succes eind Q3: draagvlak voor het framework binnen programmateam en management, 'Minimaal 3-5 ambassadeurs zijn aangehaakt', 'Een pilotgroep actief is gestart' (p. 9); werksessies per klantreisfase met vertegenwoordigers uit PO, VO en Zakelijk (p. 11). Statuspagina 3sides, stand 01-10: 'elke dinsdag bij Cito aanwezig zijn om onze zichtbaarheid te vergroten'. Town hall 22-09: 'Adoptie: We gaan stap voor stap met de teams aan de slag om de veranderingen door te voeren' en de oproep aan de zaal: 'Kom bij ons langs', 'Geef prioriteit aan de sessies waarvoor je wordt uitgenodigd', 'Help ons de eerste veranderingen te testen' (BV-dag p. 9–10). Onze opdracht (stappenplan 19-08): assistentie bij 'iedereen opnieuw meenemen' (met MT, sectormanagers en teams), het framework voorleggen aan sectormanagers en HR 'zo creëren we draagvlak vóór we het vaststellen', en 'zichtbaar aanwezig bij Cito ... aanspreekbaar voor de teams ... de zichtbaarheid van 3sides draagt bij aan het draagvlak voor de verandering' (stappenplan, opdracht aan 3sides)." },
                { label: "Wat we zien · 3sides zelf (bron)", tekst: "Positief: veel contact. Negentien verschillende namen (geteld): negen bij de klantreis ('Diverse bijeenkomsten' met hen 'om de klantreis te valideren'), negen bij het technologielandschap, drie bij het meten en één bij adoptie; één medewerker van Cito is 'meegenomen in werkzaamheden en plan van aanpak'; een wekelijks overleg met twee mensen van Cito is gepland (statuspagina 3sides, stand 29-09); 'gesprekken gevoerd om informatie op te halen, inzichten direct te valideren en feedback te geven' (statuspagina 3sides, stand 01-10). Programmabreed: kick-off voor het MT (9 juli), het programma gepresenteerd op de town hall 'als eerste stap richting de organisatie' (22 september), de evaluatie van Klant in Beeld 'gedeeld met het team' (statuspagina 3sides, stand 01-10). Maar het meenemen van de medewerkers zelf is niet begonnen: bij adoptie is de enige afstemming dat de eerste opzet van het adoptieframework met de programma-architect is besproken (statuspagina 3sides, stand 29-09); 'stakeholders worden nu meegenomen om te valideren en buy-in te krijgen. Dit gebeurt in de komende maand met de stakeholders' (statuspagina 3sides, stand 29-09); sessies met teams of per rol staan nergens. In de tijdlijn staan ambassadeurs en adoptieteam, communicatieplan en playbook-workshops op 'Not started'; volgens diezelfde tijdlijn starten de eerste twee in oktober en de workshops in december, met de eerste pilotsector in januari–februari 2027 (stand 28-09). 3sides signaleert bij het licentieserverproject dat het team begeleiding mist ('team is onvoldoende op de hoogte en heeft begeleiding nodig') en schrijft over het technologielandschap: 'Keuzes worden vaak gemaakt op basis van onjuiste of onvolledige kennis' (statuspagina 3sides, stand 01-10); dat gaat over die projecten, niet over Klant in Zicht." },
                { label: "Wat we zien · overleg 29-09 (bron)", tekst: "Samenvatting: 'gesprekken voornamelijk individueel gevoerd; behoefte aan formele projectgroepen per werkstroom'; 'veel kennis zit bij losse individuen binnen Cito zonder gezamenlijk overzicht'; 'Slides en modellen die intern gebruikt worden, zijn niet direct geschikt voor brede organisatiecommunicatie; doelgroepspecifieke vertaling is nodig'; 'Balans zoeken tussen management informeren (buy-in) en te vroeg te veel communiceren (onrust)'; basisbegrippen als lead en verkoopkans 'nog niet uniform gedefinieerd binnen Cito', vandaar het actiepunt begrippenlijst 'voor gemeenschappelijke taal binnen de organisatie'; 'Behoefte uitgesproken aan nog enkele alignment-sessies'. Transcriptie (automatisch, zonder sprekers; alleen letterlijk leesbare zinnen): 'de platen die we hier maken, niet op een op een de organisatie ingooien'; over baat, vermogen en inspanning: 'wij snappen het, vanuit het DIN-programma, maar ik denk medewerkers ... dus we gaan het in andere manieren doen'; 'jullie zitten er continu in, maar de meeste mensen hier in de organisatie niet'; de kernwaarden G.O.L.D.: 'die zijn echt niet breed gecommuniceerd'; 'conversie is voor jullie vanzelfsprekend ... voor mij niet en ik denk in de hele organisatie als we dit moeten overbrengen straks ook niet'. In het overleg gezegd over de aanpak: eerst de basis, dan stap voor stap met teams, 'ambassadeurs kweken, en dan de volgende', als een olievlek; en als valkuil genoemd: 'weer een projectje doen ... en over een jaar zitten we hier weer bij elkaar' (overleg 29-09, transcriptie; wie het zei, is niet vast te stellen)." },
                { label: "Wat we zien · vanuit het programma", tekst: "Waarnemingen vanuit het programma, als waarneming gelabeld en niet als feit. In het overleg van 29-09 vielen deelnemers opnieuw over de begrippen; de kaders uit het programmaplan waren naar de achtergrond geraakt en er waren nieuwe mensen aangesloten die het plan niet kenden, waardoor eerder besproken onderwerpen opnieuw aan de orde kwamen. De begrippen voor de rollen lopen door elkaar, en een eerder gedeeld voorstel voor de programmaorganisatie bleek niet gelezen. Het framework bestaat uit algemene en technische begrippen; voor brede communicatie binnen Cito is het in deze vorm onduidelijk, en medewerkers buiten het programmateam begrijpen het nog niet. Het kern-adoptieteam en de champions zijn nog niet aangewezen (actiebord). In de stukken staat geen enkele uitspraak van een Cito-medewerker over 3sides in Klant in Zicht; de enige medewerkersstemmen in de stukken zijn de 13 respondenten over Klant in Beeld (hieronder)." },
                { label: "Wat we zien · overleg 01-10 (intern)", tekst: "Alles hieronder is waarneming of mening van deelnemers, zonder namen. Signalen van collega's (uit tweede hand, informeel): deelnemers hebben collega's gevraagd naar Klant in Beeld; een deel was enthousiast, een deel heeft het uitgezeten; een paar collega's vroegen of de klantreis nu opnieuw wordt uitgewerkt en wat het vervolg is. Volgens de deelnemers zijn mensen niet onwillig, maar moe van resultaten die niet concreet worden; uitleg over de verbinding tussen afdelingen en systemen wekt wel belangstelling. Deze signalen gaan over Klant in Beeld en het vervolg, niet over 3sides in Klant in Zicht. Adoptieframework: ook binnen het programmateam is niet voor iedereen duidelijk wat het is en wat het moet doen; het beschrijft wat bereikt moet worden, niet hoe. Aansluiting: de aanpak van 3sides gaat uit van een organisatie die al met klantreizen en funnels werkt; voor veel collega's bij Cito is dit nieuw. Dat is in Klant in Beeld en in dit programma aan 3sides teruggegeven; het kleiner en praktischer maken bleek lastig en is bij Training en Advies redelijk gelukt (waarneming van een deelnemer aan Klant in Beeld). Positief, in hetzelfde overleg: de kennis is er, het programma zit goed in elkaar, de toolkit is goed uitgewerkt en het is prettig samenwerken; het knelpunt is de aansluiting op het kennisniveau binnen Cito, niet de inhoud. Inschatting: een gedeeld beeld van 'integraal klantbeeld' ontbreekt nog, tien collega's zouden tien verschillende antwoorden geven; en zonder gedeeld waarom wordt de validatie met sector- en productmanagers een discussie over de basis. Indruk van één deelnemer, niet gemeten: weinig draagvlak in de organisatie voor de aanpak van 3sides. Voorstellen: adoptie begint bij de projectgroep zelf (wat heb ik eraan, waarom zou ik meewerken) en daarna de bredere organisatie; per werkstroom een gezamenlijke start; 3sides doet een concreet voorstel voor het adoptieteam en de ambassadeurs, Cito wijst de mensen aan; en als mensen zich in een groep niet vrij uitspreken, hoort Cito dat te weten: zoveel mogelijk samen, met ruimte om daarna apart iets te delen." },
                { label: "Les uit Klant in Beeld (bron)", tekst: "Het vorige traject van hetzelfde bureau, geëvalueerd onder 13 deelnemers (1 tot 10 september; evaluatie Klant in Beeld). Doel behaald: 3 × ja, 10 × nee; methodes toegepast in het eigen werk: 2 × ja, 11 × nee; de tijd waard: 8 × ja, 5 × nee; 'Ik voelde mij duidelijk geïnformeerd over Klant in beeld vanuit Cito' gemiddeld 5,6 en dezelfde vraag 'vanuit 3sides' 6,2 op 10 (geteld en berekend uit de Excel). Over de workshops en de mensen is men positief: 'goed georganiseerd, inhoudelijk kundig, leuke mensen'; 'heel duidelijk! Het was per sessie duidelijk wat er verwacht werd'; 'het zijn prettige mensen om mee samen te werken'. Waar het misging is het meenemen en de opvolging: 'het voelt nu niet als een manier van werken / denken binnen Cito. Meer als een afgerond project ... het is onduidelijk wie daar de lead in zou moeten nemen'; 'het project ligt nu verder stil bij de grote groep die hieraan begonnen is. Er is nog een klein groepje bezig, maar daar krijgen we niets van mee'; 'te weinig opvolging van voorgaande afspraken van eerdere sessies'; 'omdat het bij ideeën lijkt te zijn gebleven'; 'jammer dat het, voor mijn gevoel, zo abrupt is gestopt'; 'Cito is geen marketingorganisatie. Dat vroeg soms om een extra vertaalslag van mijn kant'; 'er zat wel structuur vanuit 3sides, echter is er te makkelijk van het doel afgestapt door wat de collega's meebrachten'. Wie dat aan te rekenen is, Cito of 3sides, zegt de evaluatie niet; 'regie vanuit 3side' staat één keer als verbeterpunt. 3sides erkent het op de town hall: 'Ging dat soepel? Nee, niet altijd ... de waan van de dag kreeg soms voorrang · kost veel tijd in verhouding tot de opbrengst · gevoel van eigenaarschap' (BV-dag p. 4)." },
                { label: "Kunnen ze het? (bron)", tekst: "Wat goed is: de vertaallogica klantreis → klantbehoefte → kritisch contactmoment → gewenst gedrag → competenties → adoptie → resultaat is Cito-specifiek en dezelfde die ons stappenplan hanteert (adoptieframework p. 3; stappenplan); de vragen zijn de juiste: wat moeten mensen per rol anders doen, welke competenties, 'wat houdt medewerkers momenteel tegen?' en 'doen mensen mee? Doen mensen iets anders? Heeft het effect?' (p. 7–8); 'wie moet aanhaken binnen Cito' noemt de stuurgroep, de sectormanagers PO, VO en Zakelijk, HR, CRM/Data, sales, customer support en marketing (p. 5); de werksessies hebben een concrete opzet met acht vragen per klantreisfase (p. 11); de eerste laag 'Begrijpen (WHY)' heeft een kernboodschap en een meetbare succesindicator: 'iedereen kent de 11 hoofdstappen van de klantreis' en 'de 5 kernprincipes, en de G.O.L.D. kernwaarden' (p. 15). Wat niet goed is: het voorblad zegt 'Augustus 2025' (bestand van 28-09-2026); de SMILE-pagina's zijn generiek, Engelstalig 3sides-materiaal ('Your success is in good hands', 'we'll help you build a team of champions', p. 12–13), alleen p. 14 zet de Cito-onderdelen op de SMILE-fasen; van de vijf lagen is alleen laag 1 uitgewerkt: laag 2 mist de kernboodschap, laag 3 en 4 hebben alleen een opsomming, laag 5 'Continu verbeteren' is leeg (p. 15); de fasering staat in weken zonder datum en in een volgorde die niet klopt ('Fase 1 - Verkenning (week 12)', 'Fase 4 – Meetmodel bouwen (week 2-6)', p. 10); het barrière-assessment uit die fasering heeft geen resultaat in de stukken; een communicatieplan is er niet (tijdlijn: niet gestart, geen oplevermaand); de scope-paragraaf ontbreekt in het plan van aanpak (p. 12–13 springt van '3. Aanpak' naar '5. Planning'); en van de acht eigen Q3-succescriteria (p. 9) is op 01-10 geen enkele aantoonbaar gehaald; het dichtstbij komt 'CRM-gaps en databehoeften inzichtelijk' (eerste CRM-evaluatie afgerond, maar 'nog niet alle informatie', statuspagina 3sides, stand 01-10). Conclusie: de aanpak is goed gekozen en past bij ons stappenplan; de uitwerking is half af en de uitvoering is niet gestart. Of ze het kunnen, is daarmee uit de stukken niet te bewijzen en niet te weerleggen." },
                { label: "Zo doe je het wél (bron)", tekst: "1 · Niet de platen één-op-één de organisatie in, maar per doelgroep een vertaling: eerst de begrippenlijst in gangbare Cito-termen (actiepunt 29-09), dan per rol één A4 'Mijn rol in de klantreis' (plan van aanpak p. 12; adoptieframework p. 15); 'vermijd jargon, ingewikkelde termen of turbotaal', en omdat 'baten' niet overal goed valt is 'gewenste effecten' een alternatief (programmaboek, over de programmavisie en over baten). 2 · Van één-op-één naar projectgroepen per werkstroom met Cito-mensen, met de Cito-lead voorop en de domeineigenaar erbij (actiepunt 29-09; organigram): 'eigenaarschap aanboren boven opdrachten geven', liever 'samen met de betrokkenen een programma te ontwikkelen boven het experts te laten ontwerpen' en 'niet expertmatig een DIN maken ... maar samen met de mensen die de veranderingen en baten voor elkaar moeten krijgen' (programmaboek, principes en eigenaarschap). 3 · Het adoptieteam en de ambassadeurs nu aanwijzen, niet pas bij de pilot: drie tot vijf ambassadeurs was het eigen Q3-succes (adoptieframework p. 9); 'verandering beklijft als mensen het zelf dragen', niet alleen koplopers (stappenplan); liefst mensen uit de teams: 'dat hoeven dus niet managers te zijn (soms beter van niet)' (programmaboek, veranderteam). 4 · Klein beginnen en bewijzen: de werksessies per klantreisfase met vertegenwoordigers uit PO, VO en Zakelijk, met de acht vragen (adoptieframework p. 11), de eerste pilotsector kiezen (actiebord) en 'klein beginnen, bewijzen dat het werkt, dan uitrollen' (stappenplan); in het overleg is het ook zo gezegd: 'ambassadeurs kweken, en dan de volgende' (overleg 29-09, transcriptie). 5 · De lijn voorop: 'het lijnmanagement (bateneigenaren, programma-eigenaar) speelt een belangrijke rol bij het sturen op verandering' (programmaboek, sturen op verandering); de validaties van blueprint en meetmodel met product- en sectormanagers, de programma-eigenaar en het MT (kader 1) zijn precies die stap, en het MT bekrachtigt de richting (stappenplan). 6 · Weerstand opzoeken en adoptie meten: 'weerstand moet je koesteren ... maak bovendien ruimte voor het geluid dat niet (zo luid) wordt gemaakt' (programmaboek, sturen op verandering); de maat is de eigen maat van 3sides, 'doen mensen mee? Doen mensen iets anders? Heeft het effect?', met deelname aan werksessies en training en actieve ambassadeurs als eerste tellers (adoptieframework p. 7–8), en de lessen van Klant in Beeld als toets: afspraken opvolgen, concreet maken, niet abrupt stoppen." },
                { label: "Wie is aan zet", tekst: "3sides: het adoptieframework afmaken als Cito-stuk (lagen 2 tot en met 5, communicatieplan, scope-paragraaf, datums in plaats van weken, voorblad), een concreet voorstel doen voor adoptieteam en ambassadeurs, de werksessies en de begrippenlijst voorbereiden, per doelgroep een vertaling in plaats van de interne platen, de validatiesessies voorbereiden, en voortaan rapporteren op de eigen adoptie-maat: wie doet mee, hoeveel mensen uit welke teams. Cito: de mensen voor het kern-adoptieteam en de champions aanwijzen, de eerste pilotsector kiezen, de projectgroepen bemensen, HR aanhaken en de Cito-leads laten vaststellen (actiebord); de validaties doen, door de bateneigenaren en het MT (kader 1); en eerst zelf vaststellen wat we met een integraal klantbeeld bedoelen (overleg 01-10). Wie de validaties inplant en opvolgt, is nog af te spreken (kader 6). Beide: de begrippenlijst (3sides stelt voor, Cito stelt vast in Cito-taal) en 'iedereen opnieuw meenemen' (stappenplan): per doelgroep besluiten wat ze horen, in welke vorm en wanneer (overleg 29-09)." },
              ],
              oordeel: "",
              notitie: "",
            },
            {
              id: "actie",
              titel: "6 · Is duidelijk wie aan zet is: 3sides of Cito?",
              ondertitel: "per onderdeel: wie levert of beslist, en wie regelt de stap",
              vraag: "Is per onderdeel dat niet is geleverd duidelijk wie moet leveren of beslissen, en wie de stap regelt: voorbereiden, inplannen, opvolgen en melden als het vastloopt?",
              beeld: "Deels: wie moet leveren of beslissen is per onderdeel te zeggen; in zes van de negen is dat ook Cito. Wie de stap regelt is niet afgesproken, en in de stukken heeft geen validatie een datum: beide kanten hebben werk, te beginnen met die afspraak.",
              actieBij: "3sides en Cito",
              punten: [
                "Bij twee onderdelen is alleen 3sides aan zet: de samengevoegde klantreizen laten zien, en het doelbeeld; dat bouwt wel op de analyse, waarvoor Cito nog stukken moet leveren (plan van aanpak p. 6, 7 en 10; statuspagina 3sides, stand 01-10).",
                "Bij zes is ook Cito aan zet: meetmodel en blueprint valideren, adoptieframework vaststellen, funneldefinities, stukken van SIO en data; de 0-meting, een zevende, wacht op twee daarvan (plan van aanpak p. 9, 10 en 12; statuspagina 3sides, stand 01-10; overleg 29-09).",
                "Toetsen en valideren met stakeholders is een stap in de eigen aanpak van 3sides; 3sides kondigde het valideren aan voor 'de komende maand' (plan van aanpak p. 7 en 9; statuspagina 3sides, stand 29-09).",
                "De actiepunten 'Meetmodel valideren' en 'Blueprint klantreis valideren' staan in de samenvatting van het overleg zonder eigenaar en zonder datum (overleg 29-09).",
                "Uit de stukken bij deze evaluatie blijkt niet dat met 3sides is vastgelegd wie de regie voert en wie een validatie inplant en opvolgt. In het programmateam is gezegd dat de partijen bij de regie soms in elkaars vaarwater komen (overleg 01-10).",
              ],
              aanZet3sides: "Per onderdeel de stap regelen die nodig is: de validatie voorbereiden, een datum voorstellen en opvolgen, en in de tijdlijn melden zodra iets op Cito wacht. Dit is een voorstel; in het gesprek bevestigen we het.",
              aanZetCito: "Het voorstel voor de rolverdeling laten vaststellen door de programma-eigenaar en met 3sides vastleggen. Per validatie en per aanlevering een naam noemen en die mensen beschikbaar maken.",
              vraag3sides: "Kunnen jullie je vinden in dit voorstel voor de rolverdeling, waarin 3sides ook de stappen regelt waarin Cito moet valideren, en wat hebben jullie daarvoor van Cito nodig?",
              secties: [
                { label: "Zo lezen we dit kader", tekst: "Per onderdeel twee vragen. Eén: wie moet leveren of beslissen; dat volgt uit de stukken. Twee: wie regelt de stap (voorbereiden, inplannen, opvolgen, melden als het vastloopt); dat is niet afgesproken. Het voorstel van het programma is dat 3sides de stap regelt, ook waar Cito valideert; het inplannen en opvolgen van validaties rekenen we 3sides over de afgelopen drie maanden niet aan." },
                { label: "1 · Klant in Beeld-klantreizen samenvoegen", tekst: "Alleen 3sides. De sectorreizen zijn 'verzameld als basis' (statuspagina 3sides, stand 29-09) en volgens het overleg 'vertaald naar een blueprint' (overleg 29-09, transcriptie); de tijdlijn zegt 'In progress'. Wat ontbreekt: zien wat er is samengevoegd, en de status in de tijdlijn. Cito hoeft hier niets te leveren. Vraag aan 3sides: het samengevoegde resultaat laten zien en het onderdeel op 'Completed' zetten, of een nieuwe datum geven." },
                { label: "2 · Analyse van data en applicaties", tekst: "Beide. Leveren, Cito: 3sides heeft 'Tot nu toe geen overzicht of requirementsdocumenten of architectuurplaten ontvangen van SIO' (statuspagina 3sides, stand 01-10); Cito heeft ze niet aangeleverd en ook niet vastgesteld dat ze niet bestaan. Leveren, 3sides: de oplevering volgens het plan van aanpak is een overzicht mét eigenaren en kosten (plan van aanpak p. 6) en die ontbreken in de plaat; nieuwe datum. De stap regelen: 'lijsten ophalen' en 'kosten en contracten verzamelen' staan in de eigen aanpak van 3sides (plan van aanpak p. 7), en 3sides heeft de belemmering op de statuspagina gemeld; in de tijdlijn staat alleen +/-. Aan wie bij Cito de vraag is gesteld en wanneer, staat nergens: in te vullen." },
                { label: "3 · Visie en consequenties", tekst: "Alleen 3sides. Het doelbeeld met ontwerpprincipes is de oplevering van 3sides (plan van aanpak p. 6) en september de eigen datum (tijdlijn); er is niets geleverd. De afhankelijkheid van de analyse, en dus van de stukken van SIO, is reëel, en volgens het eigen plan heeft 3sides nog Q4 (p. 7). De stap regelen: 3sides; 'toetsen met stakeholders' staat in de eigen aanpak (p. 7). Kanttekening bij 'alleen 3sides': het doelbeeld bouwt op de analyse (2), waarvoor Cito nog stukken van SIO moet leveren. En de koppeling van het tijdlijnonderdeel 'Visie & Consequentie' aan het doelbeeld is onze lezing. Vraag aan 3sides: welke datum geldt, en in welke vorm komt het doelbeeld." },
                { label: "4 · Meetmodel ontwikkelen", tekst: "Beide. Leveren, 3sides: het concept kwam op 28-09 als werkdocument (meetinstrument). Beslissen, Cito: valideren, eerst de programma-eigenaar als opdrachtgever, daarna het MT (overleg 29-09). De stap regelen: niet afgesproken. Het valideren met stakeholders is een stap in de eigen aanpak van 3sides (plan van aanpak p. 9), 3sides kondigde het aan voor 'de komende maand' (statuspagina 3sides, stand 29-09), en in het overleg is een gevalideerd model 'een van de uitkomsten die we moeten leveren' genoemd (overleg 29-09, transcriptie; wie het zei, is niet vast te stellen). Het actiepunt in de samenvatting van het overleg heeft geen eigenaar en geen datum (overleg 29-09); dat het een actiepunt van Cito zou zijn, staat er niet. Voorstel van het programma: 3sides bereidt voor, plant in en volgt op; Cito zorgt dat de programma-eigenaar en het MT beschikbaar zijn. Zonder validatie geen 0-meting." },
                { label: "5 · Marketing- en salesproces en funnel", tekst: "Beide. Leveren, 3sides: het voorstel afmaken en zeggen wat de oplevering is; het plan van aanpak noemt er geen. Beslissen, Cito: de definities van lead, marketing qualified lead en verkoopkans vaststellen, met de programma-eigenaar en de verantwoordelijke voor sales (overleg 29-09; actiebord). De stap regelen: 3sides meldt de werksessies als eigen activiteit, en 'Vervolg sessie staat nog gepland' (statuspagina 3sides, stand 01-10)." },
                { label: "6 · Blueprint: fasen en hoofdstappen", tekst: "Vooral Cito. De blueprint ligt er (blueprint, 24-09). De oplevering volgens het plan van aanpak is 'gevalideerd door product managers en sector managers' (plan van aanpak p. 10), en dat zijn mensen van Cito. De stap regelen: niet afgesproken. De aanpak in het plan van aanpak heeft hier geen validatiestap (p. 11); het valideren is een actiepunt zonder eigenaar en zonder datum (overleg 29-09). 3sides meldt wel 'Diverse bijeenkomsten' met negen mensen 'om de klantreis te valideren' als eigen activiteit (statuspagina 3sides, stand 29-09). Voorstel van het programma: 3sides bereidt de validatie voor, plant in en volgt op; Cito zorgt dat de productmanagers en sectormanagers beschikbaar zijn." },
                { label: "7 · Data ophalen voor het meetmodel", tekst: "Beide. Leveren, Cito: de data komen van mensen van Cito (datapunten); bij ruim de helft van de datapunten staat nog geen naam, dus Cito moet aanwijzen wie levert (actiebord). De stap regelen, 3sides: 'data ophalen, werk sessies met eigenaren en gebruikers' is de eigen aanpak (plan van aanpak p. 9); ons stappenplan zegt hetzelfde: 3sides voert uit, de meetverantwoordelijken leveren de bronnen (stappenplan). 3sides zegt per datapunt wat ontbreekt; het rode vlaggetje staat er, de toelichting niet (tijdlijn, stand 28-09)." },
                { label: "8 · 0-meting", tekst: "Beide. Uitvoeren: 3sides (plan van aanpak p. 9). De twee voorwaarden, een gevalideerd meetmodel (4) en de data (7), vragen allebei ook iets van Cito. 3sides: geen startmaand in de tijdlijn en 'Not started', terwijl het eigen plan Q3/Q4 zegt (plan van aanpak p. 9) en het eigen adoptieframework een volledige nulmeting eind Q3 (adoptieframework p. 9); startmaand invullen en de 0-meting over alle vier domeinen voorbereiden." },
                { label: "9 · Adoptieframework opstellen", tekst: "Beide. Leveren, 3sides: het framework afronden, met een scope-paragraaf (plan van aanpak p. 12–13; deel 4). Beslissen, Cito: toetsen (programma-architect) en vaststellen; het adoptieframework noemt zelf als succes voor eind Q3: 'Het adoptie-framework formeel is vastgesteld' (adoptieframework p. 9). Wie valideert, noemt het plan van aanpak niet (p. 12), en de aanpak heeft geen validatiestap (p. 13). De stap regelen: 3sides, volgens de eigen fasering ('Fase 5 - Validatie', adoptieframework p. 10). De eerste opzet is tot nu toe met één persoon van Cito besproken, de programma-architect (statuspagina 3sides, stand 29-09)." },
                { label: "Mensen meenemen (kader 5)", tekst: "Beide. 3sides: adoptieteam, champions, communicatieplan en per rol één A4 staan als resultaat in het plan van aanpak (p. 12), en 3sides ontwerpt het adoptieteam en het team van champions (p. 13); volgens de tijdlijn start dat vanaf oktober, en het framework is half af. Cito: de mensen aanwijzen en de pilotsector kiezen (voorstel; actiebord); dat is nog niet gedaan. Verwachting uit het overleg van 01-10: 3sides doet een concreet voorstel, Cito wijst de mensen aan." },
                { label: "Optelsom", tekst: "Alleen 3sides: 1 en 3. Vooral Cito: 6. Beide: 2, 4, 5, 7, 8 en 9. In zes van de negen onderdelen (2, 4, 5, 6, 7 en 9) heeft Cito een eigen actie: een validatie of vaststelling (4, 6 en 9), een besluit (5) of een aanlevering (2 en 7); een zevende, de 0-meting (8), wacht op 4 en 7, en het doelbeeld (3) bouwt op de analyse (2). In alle negen heeft 3sides eigen werk; alleen bij 6 is dat vooral voorbereiden. Deze indeling is van het programma (voorstel). Eerder stond hier 'vooral Cito'. De feiten over wat Cito niet heeft geleverd blijven staan; de conclusie is bijgesteld, omdat het regelen van die stappen bij niemand was belegd en omdat in 5, 8 en 9 eerst 3sides moet afmaken of de voorwaarden eerst komen." },
                { label: "Rolverdeling: wat de stukken zeggen (bron)", tekst: "Door 3sides zelf beschreven: per werkstroom doel, scope, activiteiten en mijlpalen uitgewerkt; wekelijks rapporteren en belemmeringen vroeg signaleren, afgesproken met het programmamanagement; het tempo erin houden, op uitdrukkelijk verzoek van Cito (statuspagina 3sides, stand 01-10); toetsen en valideren met stakeholders als stap in de eigen aanpak (plan van aanpak p. 7 en 9); 'Met vertegenwoordigers uit PO, VO en Zakelijk organiseren we gesprekken/workshops' (adoptieframework p. 11). Alleen in stukken van Cito: 'Cito is opdrachtgever: wíj bepalen wat er nodig is, 3sides levert daarop' en '3sides bereidt voor en faciliteert' bij de sessies met sectormanagers en MT (stappenplan; status 'eerste schets'); voor Data & Systemen en Processen levert 3sides een inhoudelijk trekker: 'die stuurt de activiteiten van dat domein aan en bewaakt het tempo'; en 'bij stilstand escaleren wij' (stappenplan); 'Cito bepaalt wat het resultaat moet zijn en accepteert het, 3sides levert daarop', met planning, prioriteit en scope bij de programmamanager (organigram, voorstel). In geen enkel stuk: dat 3sides validaties inplant en opvolgt. Daartegen in: het eerdere voorstel voor de programmaorganisatie laat de programmamanager van Cito de sessies met de sectoren plannen en de beschikbaarheid regelen, en de randvoorwaarden in het KPI-model leggen 'Regie & programmaleiding bij 3sides'. Verder noemt het stappenplan een 'goedgekeurd 3sides-voorstel' als bron; in de samenvatting daarvan die het programma heeft (het origineel is voor deze evaluatie niet gelezen) staat dat iemand 'het voortouw' moet nemen, 'met name op' Processen en Data & Systemen, en dat de topic leads van 3sides 'inhoudelijk de leiding' nemen. 3sides kan zich daarop beroepen: vóór het gesprek het origineel lezen. Het voorstel in het kader Rolverdeling is dus een keuze van het programma die de programma-eigenaar nog moet vaststellen en die nog met 3sides moet worden afgesproken." },
                { label: "Uit het overleg van 01-10 (intern)", tekst: "Voor Cito: de programma-eigenaar legt vast wie de regie voert en wat de rol van de programmamanager van Cito is, en deelt dat met 3sides. Eerst zelf scherp maken wat we bedoelen met een integraal klantbeeld en met de salesfunnel; zonder dat beeld is niet te toetsen of de projecten bijdragen. De programma-eigenaar wil een stuurgroep, eens in de zes weken: daar wordt de voortgang gedeeld en worden besluiten voorgelegd; op welk moment en op welke punten de stuurgroep beslist of het programma op koers ligt: te bepalen. Voor beide: een fasering afspreken; niet alles kan tegelijk." },
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
            "1 · Eén model, één taal: in het meetmodel de begrippen van het programma gebruiken: kunnen en doen horen samen bij het vermogen, en op p. 6 'Vermogens (Kunnen)' in plaats van 'Vermogens (Waartoe)' (meetinstrument p. 5 en 6; voorstel), en in alle stukken de namen van de werkstromen die we maandag vaststellen (voorstel: die van het organigram); NPS meten we organisatiebreed (besloten): met de andere organisatiebrede KPI's op doelniveau, als resultante (voorstel; deel 3 en 6).",
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
          "[[Plan van aanpak]] van 3sides (PDF, 13 p.), gedeeld 29-09-2026",
          "[[Tijdlijn]] van 3sides (Excel, tab v3), stand 28-09-2026",
          "[[0-meting meetinstrument]] (PDF, 16 p.), work in progress",
          "[[Data punten ter input KPI]] (Excel), werkdocument",
          "[[Blueprint klantreis]] (Excel), draft",
          "[[Adoptieframework]] (PDF), work in progress",
          "[[Data & Tech]] (PDF) en de praatplaten [[praatplaat funnel]] en [[praatplaat proces]] (PDF)",
          "[[BV-dag]] (PDF) en [[evaluatie Klant in Beeld]] (Excel, 13 respondenten)",
          "Statuspagina '3sides-as-a-service' van 3sides, als tekst aangeleverd op 29-09-2026 en in bijgewerkte vorm op 01-10-2026 (in dit stuk: statuspagina 3sides, stand 29-09 en stand 01-10); de pagina zelf draagt geen datum",
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
