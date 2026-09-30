// Stap 11 — "Programma × 3sides". Kernboodschap: de programmastructuur staat; alles
// wat 3sides heeft, past onder het ene framework van het programma (het Doelen-
// Inspanningennetwerk, DIN); met de juiste rollen in het framework maken we het concreet.
// Verhaallijn: de kern → wat we hebben (plaat met rollen) → wat 3sides heeft en waar het
// hoort → het meetmodel (werkstromen bouwen, kernprincipes meten) → de vier werkstromen
// → de planning → overeenkomsten en verschillen → hoe verder → voortgang → bronnen.
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
  opts: { titel?: string; legenda?: string; chipKolom?: number } = {}
): DocBlok => ({
  type: "tabel",
  titel: opts.titel ?? "",
  kolommen,
  rijen,
  legenda: opts.legenda ?? "",
  ...(opts.chipKolom !== undefined ? { chipKolom: opts.chipKolom } : {}),
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
const DIN_PLAAT: DocBlok = {
  type: "dinplaat",
  doel: {
    titel: "Doel 1 · Integraal klantbeeld en outside-in werken als strategisch fundament",
    tekst: "Het programma richt zich nu op dit doel (focusdoel in de app, stap 5): alle drie de baten hangen eronder. Doel 2 en doel 3 hebben nog geen eigen baten.",
    rol: "Programma-eigenaar: Meryl · voorzitter stuurgroep",
    kpi: "Impact: organisatiebreed beeld (NPS, conversie, omzet, retentie/churn), jaarlijks · voorstel",
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
    { id: "cultuur", naam: "Cultuur", kleur: "#d97706", vermogensdeel: "Een cultuur van eigenaarschap", eigenaar: "n.t.b. ❓", inspanningen: "Verankeren van outside-in leiderschap als rolmodel gedrag · samengevoegd uit 3" },
    { id: "mens", naam: "Mens", kleur: "#2563eb", vermogensdeel: "Getrainde medewerkers", eigenaar: "Yara (HR)", inspanningen: "Trainen medewerkers in klantgerichte gespreksvaardigheden · samengevoegd uit 3" },
    { id: "data", naam: "Data & Systemen", kleur: "#7c3aed", vermogensdeel: "CRM-fundament en betrouwbare klantdata", eigenaar: "Cornelis", inspanningen: "Implementeren en inrichten van integraal CRM-klantdashboard · samengevoegd uit 2" },
    { id: "processen", naam: "Processen", kleur: "#059669", vermogensdeel: "Eenduidige funnelprocessen", eigenaar: "n.t.b. ❓", inspanningen: "Standaardiseren en borgen van klantinformatieprocessen organisatiebreed · samengevoegd uit 2" },
  ],
  werkstromen: [
    {
      naam: "Adoptieframework",
      anker: "adoptie",
      domeinen: ["cultuur", "mens"],
      leads: "Cito-lead Sanne · 3sides-lead Sasja",
      oplevert: "Adoptieaanpak (SMILE), playbook-workshops, per rol één A4, adoptieteam en champions",
      planVanAanpak: "Deels: eerste versie van 3sides (p. 12–13); aanvullen: afbakening van de scope, output-KPI, capaciteit",
      kpi: "Output: framework vastgesteld · pilot gestart · eerste gedragsdata · ambassadeurs aangehaakt",
    },
    {
      naam: "Centrale datavoorziening klantcontact",
      anker: "data",
      domeinen: ["data"],
      leads: "Cito-lead Jama · 3sides-lead Lammert",
      oplevert: "Overzicht van systemen, advies per systeem, roadmap",
      planVanAanpak: "Deels: eerste versie van 3sides (p. 6–7); aanvullen: output-KPI, capaciteit",
      kpi: "Output: inventarisatie af · advies behouden/vervangen/loslaten opgeleverd · richting CRM besluitklaar",
    },
    {
      naam: "Klantreizen",
      anker: "klantreizen",
      domeinen: ["processen"],
      leads: "Cito-lead Saila · 3sides-lead Sasja",
      oplevert: "Eén blueprint van de klantreis voor heel Cito BV",
      planVanAanpak: "Deels: eerste versie van 3sides (p. 10–11); aanvullen: output-KPI, capaciteit, eigenaar",
      kpi: "Output: blueprint geaccepteerd · funnelprocessen vastgesteld · Customer Success-proces beschreven",
    },
    {
      naam: "0-meting",
      anker: "meting",
      domeinen: ["cultuur", "mens", "data", "processen"],
      leads: "Cito-lead Pim · 3sides-lead Sasja",
      oplevert: "Meetmodel, datapunten, 0-meting en tussenmeting: meet het vermogen en de baten",
      planVanAanpak: "Deels: eerste versie van 3sides (p. 8–9); aanvullen: meetprotocol, eigenaar per datapunt",
      kpi: "Output: elke baten-KPI compleet (definitie, bron, startwaarde) · stand per domein opgeleverd · advies opgeleverd",
    },
  ],
  voet:
    "Lees van onder naar boven: elke werkstroom bouwt in een of meer domeinen aan het vermogen; samen levert dat de baten, en die dragen bij aan het doel. Op elk niveau staat wie het draagt. Klik op een werkstroom voor het plan van aanpak. Bronnen: DIN in de app (stand 29-09-2026), KPI-model (stap 9), organigram (stap 10), plan van aanpak 3sides.",
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
    "Kunnen en doen: letterlijk uit het meetinstrument van 3sides (p. 11); 3sides noemt kunnen 'vermogen' en doen 'inspanning' (p. 5), in het DIN horen beide bij het vermogen. De kolomkleur is die van het domein (rij Domein). De 0-meting geeft per kernprincipe één score van 1 tot 10 voor kunnen en doen samen (p. 12). Blauwe rijen: voorstel van het programma, te bespreken met 3sides. Elk kernprincipe raakt meer domeinen; hier staat waar het vooral wordt opgebouwd.",
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
        "Adoptieframework (SMILE) met een veranderprogramma op hoofdlijnen",
        "Playbook-workshops met een eerste pilotsector; per rol één A4 'Mijn rol in de klantreis'",
        "Communicatieplan",
        "Kern-adoptieteam en champions per afdeling in de sectoren",
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
        "Overzicht van systemen, koppelingen, eigenaren en kosten",
        "Doelbeeld met ontwerpprincipes",
        "Advies per systeem: behouden, vervangen, samenvoegen of uitfaseren",
        "Roadmap met prioriteiten, afhankelijkheden en kostenindicatie",
        "Werkwijze om het landschap actueel te houden",
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
        { label: "Praatplaten funnel en salesproces (PDF)", url: "" },
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
        "Blueprint: fasen, klantdoelen, hoofdstappen, kernwaarden en kernprincipes",
        "Per fase: processen, systeemgebruik, gedrag per rol en KPI's",
        "Gevalideerd door product- en sectormanagers",
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
        "Meetmodel: doelen, baten, vermogens en inspanningen",
        "Verzameling datapunten",
        "0-meting: de baten-KPI's en een score per kernprincipe",
        "Tussenmeting om bij te sturen",
      ],
      planning: [
        { wanneer: "Q3 2026", wat: "inventariseren, analyseren, ontwerpen" },
        { wanneer: "Q3/Q4 2026", wat: "0-meting" },
        { wanneer: "Q1 2027", wat: "tussenmeting" },
      ],
      dinPad: [
        "Inspanning: meetmodel en 0-meting; geen eigen inspanning in het DIN, want meten bouwt geen vermogen op: het is stap 5 van het fundament in het stappenplan, over alle vier de domeinen",
        "Vermogen: gemeten met de vijf kernprincipes",
        "Baten: de 14 baten-KPI's",
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
    "Bron: projecttijdlijn 3sides, tab v3, stand 28-09-2026: 28 onderdelen van de vier werkstromen, met per onderdeel de oplevering. Namen in gewone taal; voortgang en status (+, +/-, -) zoals 3sides ze rapporteert. Volgorde van de werkstromen als in de plaat.",
};

// ---------- het model van 3sides naast het DIN ----------
// Links de piramide zoals 3sides hem tekent (plan van aanpak p. 2; meetinstrument p. 5),
// rechts het DIN van het programmaplan; de koppelingen laten zien wat gelijk is en wat verschuift.
const MODELVERGELIJKING: DocBlok = {
  type: "modelvergelijking",
  titel: "Het model van 3sides naast ons DIN",
  links: {
    kop: "Zo tekent 3sides het",
    sub: "Plan van aanpak p. 2 · meetinstrument p. 5",
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
        kop: "Vier werkstromen (p. 3)",
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
      { id: "r-vermogen", naam: "Vermogen", sub: "kunnen én doen, in 4 domeinen; meetlat: de vijf kernprincipes", kleur: "#0891b2" },
      { id: "r-inspanningen", naam: "Inspanningen", sub: "4, één per domein; uitgevoerd door de 4 werkstromen", kleur: "#b45309" },
    ],
    zijvakken: [],
  },
  koppelingen: [
    { van: "l-doelen", naar: "r-doel", soort: "gelijk", label: "zelfde" },
    { van: "l-baten", naar: "r-baten", soort: "gelijk", label: "zelfde 14 KPI's per sector" },
    { van: "z-bv", naar: "r-doel", soort: "voorstel", label: "organisatiebreed beeld; NPS als resultante" },
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
    "Klant in Zicht en 3sides in één Doelen-Inspanningennetwerk (DIN): wat er staat, hoe het model van 3sides erin past, wat de werkstromen doen en hoe we meten.",
  status: "Intern Cito · voorbereiding sessie maandag 5 oktober · stand 30-09-2026",
  secties: [
    // 1
    sectie("kort", "1 · De kern: de programmastructuur staat", "", [
      callout(
        "besluit",
        "De programmastructuur staat",
        "Het programmaplan met het Doelen-Inspanningennetwerk (DIN) staat: doel, baten, een gedeeld vermogen in vier domeinen met per domein een inspanning, en vier werkstromen die die inspanningen uitvoeren, met op elk niveau een rol. 3sides werkt met hetzelfde framework en dezelfde vier werkstromen. We vinden het niet opnieuw uit; we maken het concreet."
      ),
      kaarten([
        kaart("Waar we staan", "stand 29-09-2026", [
          ["Sinds", "juli 2026, met 3sides als uitvoeringspartner, in vier werkstromen"],
          ["Van 3sides", "een eerste versie van het plan van aanpak per werkstroom (doel, resultaten, aanpak, planning; p. 6–13), een tijdlijn (tab v3, stand 28-09) en een datapuntenlijst als werkdocument"],
          ["Nog niet af", "het plan van aanpak mist per werkstroom output-KPI, capaciteit van Cito en eigenaar, bij adoptie ook een afbakening van de scope; de 0-meting is nog niet gestart", true],
          ["In concept", "blueprint klantreis, meetinstrument 0-meting, adoptieframework, Data & Tech-plaat en praatplaten: allemaal werkdocumenten, nog niet vastgesteld", true],
          ["Knelt", "begrippen lopen door elkaar, onderwerpen overlappen, niet iedereen weet wie wat doet (overleg 29-09)", true],
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
      "Dit staat al. Van onder naar boven: wat we doen, wat we daarvoor moeten kunnen, wat het oplevert en waartoe. Op elk niveau staat wie het draagt.",
      [
        DIN_PLAAT,
      {
        type: "stappen",
        titel: "Zo toetsen we werk aan de structuur (voorstel programmamanagement)",
        stappen: [
          { kop: "Welk deel van het vermogen, in welk domein?", tekst: "Bouwt het aan geen van de vier delen, dan valt het buiten het programma.", icoon: "domein" },
          { kop: "Welke werkstroom, en staat het in het plan van aanpak?", tekst: "Zo niet: aanvullen in het plan van aanpak, of naar de parkeerlijst.", icoon: "werkstroom" },
          { kop: "Past het in tijd en capaciteit?", tekst: "Zo niet: de programmamanager weegt af; bij afwijking van het plan besluit de stuurgroep.", icoon: "tijd" },
          { kop: "Controle via de keten: welke baat volgt?", tekst: "Dat bevestigt de plek, het bepaalt hem niet.", icoon: "baat" },
        ],
        uitkomsten: [
          { label: "Hoort erbij: domein, werkstroom, plan van aanpak", toon: "groen" },
          { label: "Parkeerlijst: de programmamanager weegt af", toon: "amber" },
          { label: "Buiten het programma", toon: "grijs" },
        ],
        legenda: "",
      },
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
              "Beslist hoe het resultaat van een werkstroom in het eigen domein wordt uitgewerkt en gebruikt; zorgt dat het in de lijn landt en blijft werken; denkt mee over wie uit het domein in het team van een werkstroom meewerkt (stappenplan stap 2, met 3sides en de sectormanagers); werkt mee aan de 0-meting van het eigen domein, waarbij 3sides de stand per domein meet (stappenplan stap 5); schuift aan in de stuurgroep bij besluiten over het eigen domein. Is nooit tegelijk Cito-lead van een werkstroom in hetzelfde domein",
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
        tabel(
          ["Onderdeel", "Stand", "Toelichting"],
          [
            ["Doelen", "Staat erin", "3 programmadoelen; de baten hangen nu onder doel 1"],
            [
              "Baten en baten-KPI's",
              "Staat erin",
              "3 sectorbaten met 14 baten-KPI's (KPI-model, stap 9); startwaarden uit de 0-meting, doelwaarden in een vervolgsessie",
            ],
            ["Vermogen en domeinen", "Staat erin", "Gedeeld vermogen in 4 domeinen, met per domein één inspanning (samengevoegd uit 10 sectorinspanningen)"],
            ["Werkstromen", "Staat erin", "De vier werkstromen zijn afgesproken (plan van aanpak p. 3), met per werkstroom een 3sides-lead (programmateam) en een Cito-lead als voorstel (organigram; vast te stellen door de programma-eigenaar)"],
            [
              "Rollen",
              "Deels",
              "Voorstel in het organigram (v4), vast te stellen door de programma-eigenaar; domeineigenaar Processen en Cultuur nog benoemen; bateneigenaar gelijktrekken met het KPI-model",
            ],
            [
              "Plan van aanpak per werkstroom",
              "Deels",
              "3sides beschreef per werkstroom doel, resultaten, aanpak en planning (p. 6–13). Wat er nog bij moet (3sides vult aan, Cito toetst en stelt vast): output-KPI en capaciteit van Cito; bij klantreizen de eigenaar na het programma, bij adoptie de afbakening van de scope en de pilotsector, bij de 0-meting het meetprotocol per baten-KPI en de eigenaar per datapunt (deel 4)",
            ],
            ["Meetmodel", "Deels", "De KPI's staan; de 0-meting is nog niet gestart (oplevering oktober)"],
          ],
          {
            titel: "Staat de structuur? Toets per onderdeel",
            chipKolom: 1,
            legenda: "Bronnen: DIN in de app, KPI-model, organigram, plan van aanpak en tijdlijn van 3sides.",
          }
        ),
        lijst(
          [
            "Eén keten van doel tot werkstroom: van elk onderdeel is na te gaan waartoe het dient.",
            "Samenhang: groeperen naar vermogens in plaats van deelprogramma's houdt het programma bij elkaar; vier domeinen, één programma.",
            "Het programma bakent af, het team werkt uit: het plan van aanpak van 3sides is die uitwerking, geen nieuw kader.",
          ],
          "Waarom deze structuur logisch is (Werken aan Programma's)"
        ),
        lijst(
          [
            "Twee frameworks naast elkaar: woorden lopen door elkaar en elke sessie begint opnieuw.",
            "Overlap en dubbel werk: binnen het programma en met projecten erbuiten.",
            "Herhaling van Klant in Beeld: 10 van de 13 respondenten vinden het doel niet behaald (evaluatie Klant in Beeld).",
          ],
          "Risico als we het opnieuw uitvinden"
        ),
      ]
    ),

    // 3
    sectie(
      "3sides",
      "3 · 3sides naast het DIN: hetzelfde model, andere woorden",
      "3sides liet in het plan van aanpak een eigen piramide zien (p. 2). Het is hetzelfde model als ons DIN, met andere woorden. Eerst die piramide naast het DIN, dan wat hetzelfde is, waar de woorden verschillen en waarom we ze zo gelijktrekken, en tot slot waar alles wat 3sides oplevert onder hangt.",
      [
        MODELVERGELIJKING,
        lijst(
        [
          "Framework: doelen, baten, vermogens en inspanningen, bij allebei (plan van aanpak p. 2).",
          "Keten: het meetinstrument opent met de keten van het programma: de drie doelen met hun bouwstenen, onder doel 1 de onderdelen van ons gedeelde vermogen (meetinstrument p. 2).",
          "Werkstromen: dezelfde vier (plan van aanpak p. 3; organigram); het Jira-bord kent daarnaast 'Quick wins' (p. 5).",
          "Baten-KPI's: dezelfde 14 per sector, met startwaarde uit de 0-meting en de doelwaarde in een vervolgsessie (meetinstrument p. 7; KPI-model).",
          "Klantreis: het herontwerp ligt bij de sectoren; de blueprint is het werkmodel dat zij verder invullen (programmascope; plan van aanpak p. 10).",
          "CRM: eerst een richting als advies, daarna de keuze als besluit (tijdlijn; stappenplan).",
        ],
        "Wat hetzelfde is"
      ),
        {
          type: "vannaar",
          titel: "Waar de woorden verschillen, en waarom we ze zo gelijktrekken",
          vanKop: "Zo staat het bij 3sides",
          naarKop: "Zo komt het in het DIN",
          rijen: [
            {
              onderwerp: "Het woord inspanning",
              van: "Inspanningen (Concreet Doen): wat medewerkers en teams doen per kernprincipe, dus gedrag",
              naar: "Inspanning = de vier inspanningen in het DIN, één per domein, uitgevoerd door de werkstromen. Doen hoort bij het vermogen",
              bron: "Plan van aanpak p. 2 en 8 · meetinstrument p. 5 en 11–12",
              waarom: "In het programmaplan is een inspanning het werk dat een vermogen opbouwt; daarop plannen en sturen we. Gedrag is wat dat werk moet opleveren, dus het hoort bij het vermogen. Eén woord met twee betekenissen geeft verwarring in elk overleg.",
            },
            {
              onderwerp: "Kunnen en doen",
              van: "Vermogens & Inspanningen (Kunnen en Doen) als één laag, gemeten met de vijf kernprincipes",
              naar: "Vermogen = kunnen én doen; de vijf kernprincipes zijn de meetlat van ons vermogen, geen vijfde onderdeel van het framework",
              bron: "Plan van aanpak p. 8 · meetinstrument p. 11–12",
              waarom: "Een vermogen telt pas als je het terugziet in wat mensen doen; kunnen zonder doen levert geen baat op. Met kunnen én doen bij het vermogen meet de 0-meting per kernprincipe één ding, en blijven de inspanningen werk dat je kunt plannen en afronden.",
            },
            {
              onderwerp: "Label van de vermogens",
              van: "Meetinstrument p. 6: 'Vermogens (Waartoe)'; elders 'Vermogens (Kunnen)'",
              naar: "Doelen = waartoe, vermogens = kunnen",
              bron: "Plan van aanpak p. 2 · meetinstrument p. 5 en 6",
              waarom: "'Waartoe' is de vraag bij het doel: waarom doen we dit? Bij het vermogen hoort 'wat moeten we kunnen'. 3sides gebruikt zelf beide labels; met één label lopen doel en vermogen niet door elkaar.",
            },
            {
              onderwerp: "Werkstromen",
              van: "Vier werkstromen of stromen; nergens inspanningen genoemd",
              naar: "De vier werkstromen zijn de uitvoering van de inspanningen in het DIN (voorstel)",
              bron: "Plan van aanpak p. 3 · tijdlijn · organigram",
              waarom: "3sides verdeelt het werk in vier werkstromen, het programmaplan in vier domeinen met elk een inspanning. Door de werkstromen te zien als de uitvoering van de inspanningen blijft er één structuur, en hangt elk onderdeel van het werk aan een vermogen.",
            },
            {
              onderwerp: "Namen van de werkstromen",
              van: "Blueprint klantreis · Technologielandschap · Succes meten · Adoptieframework",
              naar: "Klantreizen · Centrale datavoorziening klantcontact · 0-meting · Adoptieframework: één set namen, in alle documenten (te besluiten, deel 7)",
              bron: "Plan van aanpak p. 3 · organigram",
              waarom: "Twee namen voor dezelfde werkstroom doen denken dat het om iets anders gaat. Eén set namen houdt het overzicht, in de stukken van 3sides en in die van Cito.",
            },
          ],
          legenda: "Zonder deze afspraak praten we langs elkaar heen. Vraag aan 3sides: in het meetmodel 'Vermogen: kunnen en doen' en 'Vermogens (Kunnen)' gebruiken; dan is het één model.",
        },
        callout(
          "info",
          "De vijf kernprincipes: de meetlat van ons vermogen",
          "De vijf kernprincipes van 3sides beschrijven ons vermogen in vijf principes, elk met een kunnen-kant en een doen-kant, en krijgen in de 0-meting een score van 1 tot 10. Ze zijn geen vijfde onderdeel van het framework, maar de meetlat op het niveau van het vermogen: de werkstromen bouwen het vermogen op, de kernprincipes meten hoe ver het is. Hieronder per kernprincipe het kunnen en doen, letterlijk van 3sides, en waar het in ons vermogen hoort. Die koppeling is onze lezing, als voorstel; 3sides zegt zelf niets over domeinen of werkstromen."
        ),
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
              "Werkstroom 0-meting; geen eigen inspanning in het DIN, meet alle niveaus (stappenplan, fundament stap 5)",
              "Plan van aanpak p. 8–9 · meetinstrument · datapunten",
            ],
            [
              "Adoptieframework (SMILE)",
              "Werkstroom Adoptieframework, domeinen Mens en Cultuur; voert uit: 'Trainen medewerkers in klantgerichte gespreksvaardigheden' en 'Verankeren van outside-in leiderschap als rolmodel gedrag'",
              "Plan van aanpak p. 12–13 · adoptieframework",
            ],
            ["Praatplaten funnel en salesproces", "Resultaat van de werkstroom Centrale datavoorziening klantcontact", "Tijdlijn · praatplaten"],
            ["Vijf kernprincipes: kunnen en doen", "Vermogen: de meetlat voor ons vermogen (hierboven)", "Meetinstrument p. 11–12"],
            ["KPI's per klantreisfase, van merkbekendheid tot renewal rate", "Vermogen: leidende indicatoren per fase", "Meetinstrument p. 10 · blueprint"],
            ["Kernwaarden G.O.L.D.: gedreven, ondersteunend, lerend, deskundig", "Vermogen, domein Cultuur", "Blueprint, tab GOLD - Kernwaarden"],
            ["Vier organisatiebrede KPI's: NPS, conversie, omzet, retentie/churn", "Doel: organisatiebreed beeld (deel 6); NPS als resultante", "Meetinstrument p. 8 · KPI-model"],
          ],
          { titel: "Waar hangt alles wat 3sides oplevert onder?" }
        ),
        lijst(
          [
            "Eén betekenis per woord: inspanning is wat het programma doet, de vier inspanningen in het DIN, uitgevoerd door de werkstromen; kunnen én doen horen bij het vermogen.",
            "Werkstromen bouwen, kernprincipes meten: de werkstromen bouwen het vermogen op in de vier domeinen; de vijf kernprincipes zijn de meetlat waarmee de 0-meting laat zien hoe ver dat vermogen is.",
            "Per niveau één soort meting: output voor de werkstromen, de kernprincipe-score voor het vermogen, de 14 baten-KPI's voor de baten.",
            "Vraag aan 3sides: noem 'Vermogens & Inspanningen (Kunnen en Doen)' in het meetmodel voortaan 'Vermogen: kunnen en doen', en maak van 'Vermogens (Waartoe)' 'Vermogens (Kunnen)'. Dan is het één model.",
          ],
          "Advies: zo komt alles samen"
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
      "3sides heeft het werk van elke werkstroom opgedeeld in onderdelen: 28 in totaal, elk met een startmaand en een oplevering. Die tijdlijn is de basis: het voortgangsbord en de werkstroomkaarten (deel 4) rekenen ermee. De standlijn staat op vandaag; de gegevens zijn de stand van 3sides van 28-09. Zet je een onderdeel in de tijdlijn op 'afgerond', dan telt het bord mee. Het bord staat ook los in het tabblad Voortgang.",
      [
        {
          type: "voortgangsbord",
          titel: "Voortgangsbord",
          werkstromen: [
            {
              anker: "adoptie",
              naam: "Adoptieframework",
              geleverd: ["SMILE-aanpak uitgewerkt en opzet besproken met Pim", "Adoptieframework als werkdocument (PDF)"],
              nodig: [
                { tekst: "Scope afbakenen in het plan van aanpak: de aanleiding noemt de hele organisatie, per sector, team en rol, maar een eigen scope-paragraaf zoals bij de andere werkstromen ontbreekt (p. 12–13)", klaar: false },
                { tekst: "Voorstel eerste pilotsector met datum; planning gelijktrekken: stappenplan Q3, plan van aanpak Q1 2027, tijdlijn januari–februari 2027", klaar: false },
                { tekst: "Einddatum voor communicatieplan, toetsen en ambassadeurs", klaar: false },
                { tekst: "Output-KPI's en capaciteit van Cito en HR per resultaat", klaar: false },
                { tekst: "Cito: domeineigenaar Cultuur benoemen", klaar: false },
                { tekst: "Cito: kern-adoptieteam en champions per afdeling aanwijzen, samen met 3sides (plan van aanpak p. 12; stappenplan: ambassadeurs per sector in Q4)", klaar: false },
                { tekst: "Cito: eerste pilotsector kiezen", klaar: false },
                { tekst: "Cito: capaciteit van HR vrijmaken voor training en coaching (tijdlijn: april tot juni 2027)", klaar: false },
              ],
            },
            {
              anker: "data",
              naam: "Centrale datavoorziening klantcontact",
              geleverd: ["Praatplaten funnel en salesproces", "Data & Tech-plaat (draft)", "Eerste conclusies over de CRM-inrichting en het landschap"],
              nodig: [
                { tekst: "Advies per systeem en roadmap met kostenindicatie (resultaten plan van aanpak, Q4)", klaar: false },
                { tekst: "CRM-richting besluitklaar in november, los van de formele keuze rond april 2027", klaar: false },
                { tekst: "Funneldefinities lead, MQL en verkoopkans, samen met Meryl en Jasper", klaar: false },
                { tekst: "Cito: afstemmen met het lopende A5-project (centrale datavoorziening klantcommunicatie): wat valt binnen Klant in Zicht", klaar: false },
                { tekst: "Cito: het CRM-besluit voorbereiden, rond april 2027", klaar: false },
                { tekst: "Output-KPI's en capaciteit van Cito per resultaat", klaar: false },
              ],
            },
            {
              anker: "klantreizen",
              naam: "Klantreizen",
              geleverd: ["Klant in Beeld-klantreizen samengevoegd", "Blueprint draft: 6 fasen, 11 subfasen, kernwaarden en kernprincipes", "Eerste KPI's per klantfase"],
              nodig: [
                { tekst: "Validatie van de blueprint met product- en sectormanagers (Q4) met datum", klaar: false },
                { tekst: "Startmaand van de vertaling naar CRM-input en funnelprocessen", klaar: false },
                { tekst: "Selectie uit het meetkader van 55 KPI's: welke gaan mee naar de 0-meting", klaar: false },
                { tekst: "Eigenaar van de blueprint na het programma", klaar: false },
                { tekst: "Cito: domeineigenaar Processen benoemen", klaar: false },
                { tekst: "Cito: eigenaar van de blueprint na het programma aanwijzen", klaar: false },
                { tekst: "Output-KPI's en capaciteit van Cito per resultaat", klaar: false },
              ],
            },
            {
              anker: "meting",
              naam: "0-meting",
              geleverd: ["Meetmodel-opzet met KPI's per niveau", "Meetinstrument als werkdocument (16 p.)", "Datapuntenlijst, circa 85 datapunten", "Advies over de inzet van de 0-meting"],
              nodig: [
                { tekst: "Meetmodel valideren met Meryl en het MT, met datum vóór de 0-meting", klaar: false },
                { tekst: "Meetprotocol per baten-KPI: definitie, bron, eenheid, frequentie, wie levert; eigenaar per datapunt", klaar: false },
                { tekst: "0-meting starten en in oktober opleveren: startwaarde per baten-KPI en score per kernprincipe", klaar: false },
                { tekst: "In het meetmodel 'Vermogen: kunnen en doen' en 'Vermogens (Kunnen)' gebruiken", klaar: false },
                { tekst: "Cito: datum van de vervolgsessie voor de doelwaarden plannen", klaar: false },
                { tekst: "Cito: data-aanleveranciers per datapunt aanwijzen", klaar: false },
              ],
            },
          ],
          programmabreed: [
            { tekst: "Jira-bord delen met de bredere groep (actiepunt 29-09) en de link onder Vindplaatsen zetten", klaar: false },
            { tekst: "Plan van aanpak aanvullen per werkstroom: output-KPI, capaciteit van Cito, eigenaar; 3sides vult aan, Cito toetst en stelt vast", klaar: false },
            { tekst: "Eén set namen voor de vier werkstromen, in alle documenten", klaar: false },
            { tekst: "Begrippenlijst met gangbare termen (actiepunt 29-09)", klaar: false },
            { tekst: "Eén planning: de verschuiving van pilot en 0-meting expliciet vaststellen", klaar: false },
            { tekst: "Projectgroepen per werkstroom in plaats van één-op-één-gesprekken", klaar: false },
            { tekst: "Cito: projectgroep per werkstroom samenstellen; capaciteit ophalen bij sector- en afdelingsmanagers", klaar: false },
            { tekst: "Cito: rollen laten vaststellen door de programma-eigenaar (organigram v4)", klaar: false },
            { tekst: "Vindplaats van de documenten: één map, zodat elke paginaverwijzing naar het document zelf springt", klaar: false },
          ],
          legenda: "Regels die met 'Cito:' beginnen, doet Cito zelf; de rest vragen we van 3sides. Voortgang en opleveringen komen uit de tijdlijn hieronder, op de dag van vandaag; zet daar een onderdeel op 'afgerond' en het bord telt mee. 'Geleverd volgens 3sides' komt van de statuspagina van 29-09. 'Nog nodig' is een voorstel van het programma; vink af wat binnen is.",
        },
        TIJDLIJN,
        lijst(
          [
            "0-meting komt later dan gepland: ons stappenplan en het meetinstrument noemen Q3, het plan van aanpak Q3/Q4; de tijdlijn zet de oplevering in oktober, en de 0-meting is nog niet gestart. Het ophalen van de data (september en oktober) staat op rood. Gevolg: de startwaarden van de 14 baten-KPI's komen op zijn vroegst in oktober; de doelwaarden volgen pas in de vervolgsessie daarna.",
            "Adoptie: drie documenten, drie planningen. Stappenplan: pilot in één sector in Q3 2026, de tweede in Q4, de derde in Q1 2027. Plan van aanpak: playbooks in Q4 2026, pilots in Q1 2027. Tijdlijn: eerste sector januari en februari 2027, tweede februari en maart, derde april en mei; playbook-workshops van december 2026 tot mei 2027. Te besluiten: welke planning geldt.",
            "CRM: richting en keuze zijn twee stappen. De tijdlijn levert in november een advies over de CRM-richting; het besluit over het CRM valt volgens het stappenplan rond april 2027. Dat past, zolang het advies van november geen besluit wordt.",
            "Klantreizen: een onderdeel levert eerder op dan waar het op bouwt. De vertaling van de klantreis naar CRM-input en funnelprocessen levert op in november, maar de blueprint-onderdelen waarop die vertaling bouwt (proces, CRM-gebruik en KPI's; rollen, gedrag en competenties) leveren pas in december op. Vraag aan 3sides: klopt die volgorde?",
            "Open einden: vier onderdelen hebben geen oplevermaand (interventies, communicatieplan, adoptieframework toetsen, ambassadeurs en adoptieteam) en twee geen startmaand (de 0-meting en de vertaling van de klantreis naar CRM-input). Vraag aan 3sides om die maanden in te vullen.",
          ],
          "Wat opvalt in de planning"
        ),
      ]
    ),

    // 6
    sectie(
      "meetmodel",
      "6 · Het meetmodel: hoe we meten of het werkt",
      "De werkstroom 0-meting levert het meetmodel (plan van aanpak p. 8–9). Het beantwoordt drie vragen: wat meten we per niveau, hoe hangen bouwen en meten samen, en hoe verloopt de meting?",
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
                { titel: "Organisatiebreed beeld, NPS als resultante (bij 3sides onder de baten)", chips: ["NPS", "Conversie", "Omzet", "Retentie/churn"], toon: "voorstel" },
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
              bron: "KPI-model (stap 9) · meetinstrument p. 7. Bateneigenaar: sectormanager (organigram); het KPI-model noemt de Commercieel Manager ❓",
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
              bron: "Meetinstrument p. 11–12 · stappenplan stap 5 en 6 · KPI-sessie",
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
        {
          type: "stroomplaat",
          titel: "Hoe hangen bouwen en meten samen? Werkstromen bouwen, kernprincipes meten (voorstel)",
          kolommen: [
            {
              kop: "Werkstromen",
              sub: "bouwen het vermogen op",
              items: [
                { id: "ws-adoptie", naam: "Adoptieframework", kleur: "cultuur", sub: "Cultuur en Mens" },
                { id: "ws-data", naam: "Centrale datavoorziening klantcontact", kleur: "data", sub: "Data & Systemen" },
                { id: "ws-klantreizen", naam: "Klantreizen", kleur: "processen", sub: "Processen" },
                { id: "ws-meting", naam: "0-meting", kleur: "#003366", sub: "meet alle domeinen" },
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
          voet: "Lees van links naar rechts: een werkstroom bouwt in een of meer domeinen aan het vermogen; de 0-meting meet elk domein met de kernprincipes. De koppeling kernprincipe naar domein is een voorstel; de uitwerking per kernprincipe staat in deel 3.",
        },
        tabel(
          ["Stap", "Wat", "Wanneer", "Bron"],
          [
            ["Meetmodel ontwikkelen", "Doelen, baten, vermogens en inspanningen", "jul–sep; loopt, status +/-", "Tijdlijn"],
            ["Meetmodel valideren", "Met Meryl als opdrachtgever, daarna met het MT", "Te bepalen", "Overleg 29-09"],
            ["Data ophalen", "Circa 85 datapunten, deels met eigenaar", "sep–okt; loopt, status -", "Tijdlijn · datapunten"],
            ["0-meting", "Startwaarde per baten-KPI en een score per kernprincipe", "Oplevering okt; nog niet gestart", "Tijdlijn · plan van aanpak p. 8–9"],
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
      "7 · Hoe verder: besluiten en volgende stappen",
      "Wat we maandag voorstellen te besluiten, de verschillen met 3sides die daaronder liggen, en de volgende stappen.",
      [
      lijst(
        [
          "Framework: het DIN blijft het enige framework; de termen van 3sides zijn synoniemen (deel 3).",
          "Woorden: inspanning = de vier inspanningen in het DIN, uitgevoerd door de werkstromen; kunnen en doen horen bij het vermogen (deel 3).",
          "Meten: de 14 baten-KPI's zijn de stuurlaag, de kernprincipe-scores de meetlat voor het vermogen.",
          "Vermogen-KPI's: per domein vaststellen waar we naartoe willen (gewenste situatie) en per kernprincipe de doelscore, in de vervolgsessie na de 0-meting.",
          "Plan van aanpak: per werkstroom finaliseren, met output-KPI, capaciteit van Cito en eigenaar.",
          "Rollen: per werkstroom wie leidt en wie na het programma eigenaar is; domeineigenaren Processen en Cultuur benoemen; bateneigenaar gelijktrekken (sectormanager of Commercieel Manager).",
          "Planning: de verschuiving van pilot en 0-meting vaststellen (deel 5).",
          "Namen: één set namen voor de vier werkstromen.",
        ],
        "Besluitpunten"
      ),
      tabel(
        ["Onderwerp", "Wij", "3sides", "Voorstel", "Bron"],
        [
          [
            "Namen van de werkstromen",
            "Klantreizen · Centrale datavoorziening klantcontact · 0-meting · Adoptieframework",
            "Blueprint klantreis · Technologielandschap · Succes meten · Adoptieframework",
            "Eén set namen, overal dezelfde",
            "Organigram · plan van aanpak p. 3",
          ],
          [
            "Omvang van het meetkader",
            "14 baten-KPI's",
            "55 KPI's in het KPI-meetkader en circa 85 datapunten",
            "Focus op de 14 baten-KPI's en de vijf kernprincipe-scores; de rest later",
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
      tabel(
        ["Werkstroom", "Wat Cito zelf moet doen", "Wie"],
        [
          ["Programmabreed", "Rollen laten vaststellen door de programma-eigenaar (organigram v4)", ""],
          ["Programmabreed", "Domeineigenaren Processen en Cultuur benoemen", ""],
          ["Programmabreed", "Bateneigenaar gelijktrekken: sectormanager of Commercieel Manager", ""],
          ["Programmabreed", "Projectgroep per werkstroom samenstellen; capaciteit ophalen bij sector- en afdelingsmanagers", ""],
          ["Programmabreed", "Plan van aanpak per werkstroom toetsen (Cito-lead op resultaat, Pim op de kaders) en vaststellen (Sanne)", ""],
          ["Programmabreed", "Eén set namen en één planning vaststellen", ""],
          ["Programmabreed", "Begrippenlijst met gangbare termen", ""],
          ["Adoptieframework", "Kern-adoptieteam en champions per afdeling aanwijzen, samen met 3sides", ""],
          ["Adoptieframework", "Eerste pilotsector kiezen", ""],
          ["Adoptieframework", "Capaciteit van HR vrijmaken voor training en coaching", ""],
          ["Centrale datavoorziening klantcontact", "Salesfunnel en -proces definiëren met Meryl en Jasper: lead, MQL, verkoopkans", ""],
          ["Centrale datavoorziening klantcontact", "Afstemmen met het lopende A5-project: wat valt binnen Klant in Zicht", ""],
          ["Centrale datavoorziening klantcontact", "Het CRM-besluit voorbereiden, rond april 2027", ""],
          ["Klantreizen", "Blueprint valideren met product- en sectormanagers", ""],
          ["Klantreizen", "Eigenaar van de blueprint na het programma aanwijzen", ""],
          ["0-meting", "Meetmodel valideren met Meryl, daarna met het MT", ""],
          ["0-meting", "Data-aanleveranciers per datapunt aanwijzen", ""],
          ["0-meting", "Vervolgsessie plannen voor de doelwaarden en de vermogen-KPI's, na de 0-meting", ""],
        ],
        {
          titel: "Wat Cito zelf moet doen",
          legenda: "Wie: samen in te vullen. Bronnen: overleg 29-09, organigram, stappenplan, plan van aanpak p. 10–13 en de tijdlijn. Wat we van 3sides vragen, staat in deel 8.",
        }
      ),
      ]
    ),

    // 8
    sectie(
      "gesprek",
      "8 · Klaar voor het gesprek met 3sides?",
      "Drie vragen om af te sluiten: hebben we 3sides geëvalueerd, weten we wat we zelf willen, en weten we wat we met 3sides willen bespreken?",
      [
        kaarten([
          kaart("Hebben we 3sides geëvalueerd?", "deels", [
            ["Antwoord", "Deels: we hebben de inhoud getoetst, niet de samenwerking."],
            ["Wel gedaan", "Hun model en werkstromen passen op ons DIN, met verschillen in taal (deel 3); per werkstroom ligt een eerste versie van het plan van aanpak (deel 4); de planning schuift bij de 0-meting en de pilots (deel 5)."],
            ["Nog niet", "De samenwerking zelf: werkwijze (tot nu toe vooral één-op-één, overleg 29-09), tempo tegenover de tijdlijn, en inzet: juli 186,5, augustus 80 en september 226,75 uur (tot 25-09) van 232 per maand, 197,5 uur doorgeschoven (statuspagina).", true],
            ["Voorstel", "Evalueer op vier punten: sluit het aan op het DIN, levert 3sides op volgens planning, werkt 3sides samen met Cito-mensen in projectgroepen, en past de inzet bij wat er ligt.", true],
          ]),
          kaart("Weten we wat we zelf willen?", "op hoofdlijnen ja", [
            ["Antwoord", "Op hoofdlijnen ja: de structuur staat."],
            ["Staat", "Het DIN met doel, baten en 14 baten-KPI's, het gedeelde vermogen in vier domeinen, de vier werkstromen, de rollen als voorstel en de toets voor nieuw werk (deel 2)."],
            ["Nog te besluiten", "Rollen vaststellen, domeineigenaren Processen en Cultuur, bateneigenaar, één set namen en één planning (deel 7); na de 0-meting de doelwaarden en de vermogen-KPI's.", true],
            ["Nog te doen", "Wat Cito zelf moet doen, per werkstroom: deel 7.", true],
          ]),
          kaart("Weten we wat we met 3sides willen bespreken?", "ja, zes punten", [
            ["Antwoord", "Ja. De zes punten hieronder, in deze volgorde."],
            ["Basis", "Alles is terug te voeren op de verschillen (deel 3), de plannen van aanpak (deel 4), de planning (deel 5) en het meetmodel (deel 6)."],
          ]),
        ]),
        lijst(
          [
            "Eén model, één taal: in het meetmodel 'Vermogen: kunnen en doen' en 'Vermogens (Kunnen)' gebruiken, en één set namen voor de werkstromen (deel 3).",
            "Plan van aanpak per werkstroom aanvullen: output-KPI per resultaat, capaciteit van Cito en eigenaar; bij adoptie de afbakening van de scope (deel 4).",
            "Planning gelijktrekken: 0-meting en pilots in één planning, open start- en opleverdata invullen, de volgorde van de klantreisvertaling controleren (deel 5).",
            "Meetkader focussen: de 14 baten-KPI's en de vijf kernprincipe-scores eerst; meetprotocol en eigenaar per datapunt (deel 6).",
            "Werkwijze: projectgroepen per werkstroom met Cito-mensen, en het Jira-bord delen met de bredere groep (overleg 29-09).",
            "Samenwerking evalueren op de vier punten hierboven, en afspreken hoe we dat elke zes weken bijhouden.",
          ],
          "Agenda voor het gesprek met 3sides (voorstel)"
        ),
      ]
    ),

    // 9
    sectie("documenten", "9 · Bronnen: de gebruikte documenten", "", [
      lijst(
        [
          "Plan van aanpak 3sides (PDF, 13 p.), gedeeld 29-09-2026",
          "Projecttijdlijn 3sides (Excel, tab v3), stand 28-09-2026",
          "0-meting meetinstrument (PDF, 16 p.), work in progress",
          "Data punten ter input KPI (Excel), werkdocument",
          "Blueprint klantreis (Excel), draft",
          "Adoptieframework (PDF), work in progress",
          "Data & Tech (PDF) en praatplaten funnel en salesproces (PDF)",
          "BV-dag (PDF) en evaluatie Klant in Beeld (Excel, 13 respondenten)",
          "Statuspagina 3sides (tekst, 29-09-2026) en verslag programmaoverleg 29-09-2026",
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
