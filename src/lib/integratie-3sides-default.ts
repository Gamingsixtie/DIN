// Stap 11 — "Programma × 3sides". Kernboodschap: de programmastructuur staat; alles
// wat 3sides heeft, past onder het ene framework van het programma (het Doelen-
// Inspanningennetwerk, DIN); met de juiste rollen in het framework maken we het concreet.
// Verhaallijn: de kern → wat we hebben (plaat met rollen) → wat 3sides heeft en waar het
// hoort → het meetmodel (werkstromen bouwen, kernprincipes meten) → de vier werkstromen
// → de planning → overeenkomsten en verschillen → hoe verder → uitleggen → bronnen.
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

import type { BewerkbaarDocument, DocBlok, DocLaag, DocSectie } from "@/lib/schemas";

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
    tekst: "Het programma richt zich nu op dit ene doel: alle drie de baten hangen eronder. Doel 2 en doel 3 hebben nog geen eigen baten.",
    rol: "Programma-eigenaar: Meryl · voorzitter stuurgroep",
  },
  baten: [
    {
      titel: "Zakelijk",
      tekst: "Sterkere klantgerichtheid bij opdrachtgevers en kandidaten · 5 baten-KPI's",
      rol: "Bateneigenaar: sectormanager Zakelijk",
    },
    { titel: "PO", tekst: "Intensiever partnership · 5 baten-KPI's", rol: "Bateneigenaar: sectormanager PO" },
    {
      titel: "VO",
      tekst: "Hogere voorspelbaarheid commerciële begroting · 4 baten-KPI's",
      rol: "Bateneigenaar: sectormanager VO",
    },
  ],
  vermogen: {
    titel: "Gedeeld vermogen",
    tekst:
      "Klantgericht commercieel vermogen op basis van betrouwbare klantdata — outside-in handelen, gedragen door CRM-fundament, eenduidige funnelprocessen, getrainde medewerkers en een cultuur van eigenaarschap. Meetlat (voorstel): de vijf kernprincipes van 3sides (deel 4).",
    rol: "",
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
      planVanAanpak: "Ligt er (3sides, p. 12–13) · scope aanvullen",
    },
    {
      naam: "Centrale datavoorziening klantcontact",
      anker: "data",
      domeinen: ["data"],
      leads: "Cito-lead Jama · 3sides-lead Lammert",
      oplevert: "Overzicht van systemen, advies per systeem, roadmap",
      planVanAanpak: "Ligt er (3sides, p. 6–7)",
    },
    {
      naam: "Klantreizen",
      anker: "klantreizen",
      domeinen: ["processen"],
      leads: "Cito-lead Saila · 3sides-lead Sasja",
      oplevert: "Eén blueprint van de klantreis voor heel Cito BV",
      planVanAanpak: "Ligt er (3sides, p. 10–11)",
    },
    {
      naam: "0-meting",
      anker: "meting",
      domeinen: ["cultuur", "mens", "data", "processen"],
      leads: "Cito-lead Pim · 3sides-lead Sasja",
      oplevert: "Meetmodel, datapunten, 0-meting en tussenmeting: meet het vermogen en de baten",
      planVanAanpak: "Ligt er (3sides, p. 8–9)",
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
    { titel: "Klant begrijpen", kleur: "#c4f3dd" },
    { titel: "Klantinformatie benutten", kleur: "#fdd8b5" },
    { titel: "Eigenaarschap nemen", kleur: "#fcd6db" },
    { titel: "Data-gedreven werken", kleur: "#dcccf9" },
    { titel: "Samenwerken rond en met de klant", kleur: "#bff0f7" },
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
        "Klantreizen · Adoptieframework",
        "Centrale datavoorziening klantcontact",
        "Adoptieframework",
        "Centrale datavoorziening klantcontact",
        "Klantreizen",
      ],
    },
  ],
  legenda:
    "Kunnen en doen: letterlijk uit het meetinstrument van 3sides (p. 11); 3sides noemt kunnen 'vermogen' en doen 'inspanning' (p. 5), in het DIN horen beide bij het vermogen. De 0-meting geeft per kernprincipe één score van 1 tot 10 voor kunnen en doen samen (p. 12). Blauwe rijen: voorstel van het programma, te bespreken met 3sides. Elk kernprincipe raakt meer domeinen; hier staat waar het vooral wordt opgebouwd.",
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
        "Inspanning: adoptieframework; in het DIN 'Trainen medewerkers in klantgerichte gespreksvaardigheden' (Mens) en 'Verankeren van outside-in leiderschap als rolmodel gedrag' (Cultuur)",
        "Vermogen: getrainde medewerkers en een cultuur van eigenaarschap",
        "Baten: Zakelijk · PO · VO",
      ],
      aanvullen: [
        "Scope",
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
        "Inspanning: technologielandschap; in het DIN de analysefase van 'Implementeren en inrichten van integraal CRM-klantdashboard' (Data & Systemen)",
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
        "Inspanning: blueprint klantreis; in het DIN 'Standaardiseren en borgen van klantinformatieprocessen organisatiebreed' (Processen)",
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
        "Inspanning: meetmodel en 0-meting; in het DIN de nulmeting uit het stappenplan (fundament, stap 5), over alle vier de domeinen",
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
  nu: "sep",
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
    "Bron: projecttijdlijn 3sides, tab v3, stand 28-09-2026 (28 activiteiten). Namen in gewone taal; voortgang en status (+, +/-, -) zoals 3sides ze rapporteert. Volgorde van de werkstromen als in de plaat.",
};

// ---------- de analyse ----------
export const DEFAULT_INTEGRATIE_3SIDES: BewerkbaarDocument = {
  titel: "Programma × 3sides: één framework, vier werkstromen",
  ondertitel:
    "Wat wij hebben, wat 3sides heeft, de overeenkomsten en de verschillen. De programmastructuur staat; met de juiste rollen in het framework maken we haar concreet.",
  status: "Intern Cito · voorbereiding sessie maandag · stand 29-09-2026 · elke regel met bron",
  secties: [
    // 1
    sectie("kort", "1 · De kern: de programmastructuur staat", "", [
      callout(
        "besluit",
        "De programmastructuur staat",
        "Het programmaplan met het Doelen-Inspanningennetwerk (DIN) staat: doel, baten, een gedeeld vermogen in vier domeinen met per domein een inspanning, en vier werkstromen die daaraan werken, met op elk niveau een rol. 3sides werkt met hetzelfde framework en dezelfde vier werkstromen. We vinden het niet opnieuw uit; we maken het concreet."
      ),
      tekst(
        "Waar we staan. Klant in Zicht loopt sinds juli 2026 met 3sides als uitvoeringspartner, in vier werkstromen. Na drie maanden ligt er per werkstroom een plan van aanpak, een tijdlijn en een reeks eerste resultaten: een blueprint van de klantreis, een meetinstrument voor de 0-meting, een adoptieframework en een eerste beeld van het technologielandschap. Tegelijk zagen we in het overleg van 29-09 dat begrippen door elkaar lopen, dat onderwerpen overlappen en dat niet voor iedereen duidelijk is wie wat doet."
      ),
      tekst(
        "Wat het DIN is, in gewone taal. Het Doelen-Inspanningennetwerk is één keten met vier niveaus. Het doel zegt waar we naartoe willen. De baten zeggen wat de klant en Cito daarvan merken; daar sturen we op, met 14 baten-KPI's. Het vermogen zegt wat we daarvoor blijvend moeten kunnen, in vier domeinen: cultuur, mens, data en systemen, processen. De inspanningen zijn wat we doen om dat vermogen op te bouwen; de vier werkstromen voeren ze uit. Je leest de keten van onder naar boven om te bouwen, en van boven naar onder om te sturen."
      ),
      tekst(
        "Waarom de structuur staat. Doel, baten, vermogen en inspanningen zijn vastgelegd in het programmaplan en in het DIN in de app, de baten-KPI's in het KPI-model, de rollen in het organigram. 3sides werkt met hetzelfde framework en dezelfde vier werkstromen, en opent het meetinstrument met onze keten. Er hoeft dus niets opnieuw uitgevonden te worden. Wat er wél moet gebeuren, is concretiseren: wie draagt welk niveau, welke werkstroom bouwt aan welk deel van het vermogen, en waar hangt alles wat 3sides oplevert."
      ),
      tekst(
        "Hoe de rollen dat oplossen. Op elk niveau staat één rol die het draagt: de programma-eigenaar voor het doel, een bateneigenaar per baat, een domeineigenaar per domein, en per werkstroom een Cito-lead die leidt en een 3sides-lead die het plan van aanpak opstelt en uitvoert. Programmamanagement, Sanne op regie en Pim op de inhoudelijke kaders, houdt de hele keten bij elkaar. Zo weet iedereen bij elk onderwerp wie erover gaat, en ontstaat er geen tweede structuur ernaast."
      ),
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
            "Elke activiteit bouwt aan een van de vier delen van het vermogen. Wat het meest bijdraagt aan het vermogensdeel dat nu nodig is, gaat voor. Bouwt iets aan geen van de vier, dan valt het buiten het programma",
          ],
          [
            "Elke sessie begint met uitleggen wat er al ligt",
            "Eén plaat die iedereen kent (deel 2); nieuwe mensen starten daar",
          ],
          [
            "Begrippen lopen door elkaar",
            "De woorden van het DIN; de termen van 3sides gelden als synoniem (deel 3)",
          ],
        ],
        { legenda: "Bron: programmamanagement; overleg van 29-09." }
      ),
      lijst(
        [
          "1: welk deel van het vermogen bouwt het op, in welk domein? Aan geen van de vier: dan valt het buiten het programma.",
          "2: in welke werkstroom hoort het, en staat het in het plan van aanpak van die werkstroom? Zo niet: aanvullen of parkeerlijst.",
          "3: past het in tijd en capaciteit? Zo niet: de programmamanager weegt af; bij afwijking van het plan besluit de stuurgroep.",
          "4: controle via de keten: welke baat volgt hieruit? Dat bevestigt de plek, het bepaalt hem niet.",
        ],
        "Zo gebruik je de plaat bij een nieuw project of een nieuwe vraag"
      ),
      lijst(
        [
          "Deel 2: de structuur in één plaat, met de rollen en een toets per onderdeel.",
          "Deel 3: wat 3sides heeft en hoe hun woorden op de onze passen, met het belangrijkste taalverschil.",
          "Deel 4: het meetmodel en het advies om alles samen te voegen.",
          "Deel 5 en 6: de vier werkstromen en hun planning.",
          "Deel 7 en 8: overeenkomsten, verschillen en hoe verder.",
          "Deel 9 en 10: uitleggen binnen en buiten Cito, en de bronnen.",
        ],
        "Leeswijzer"
      ),
    ]),

    // 2
    sectie(
      "framework",
      "2 · Wat we hebben: de structuur in één plaat, met de rollen",
      "Dit ligt er al. Van onder naar boven: wat we doen, wat we daarvoor moeten kunnen, wat het oplevert en waartoe. Op elk niveau staat wie het draagt.",
      [
        DIN_PLAAT,
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
              "Beslist hoe het resultaat van een werkstroom in het eigen domein wordt uitgewerkt en gebruikt; zorgt dat het in de lijn landt en blijft werken; bepaalt met de programmaleiding wie uit het domein meewerkt (inspanningsleider en team, stappenplan stap 2); levert de stand van het domein voor de 0-meting; schuift aan in de stuurgroep bij besluiten over het eigen domein. Is nooit tegelijk Cito-lead van een werkstroom in hetzelfde domein",
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
            ["Werkstromen", "Staat erin", "De vier werkstromen zijn afgesproken, met per werkstroom een Cito-lead en een 3sides-lead als voorstel (plan van aanpak p. 3; organigram)"],
            [
              "Rollen",
              "Deels",
              "Voorstel in het organigram (v4), vast te stellen door de programma-eigenaar; domeineigenaar Processen en Cultuur nog benoemen; bateneigenaar gelijktrekken met het KPI-model",
            ],
            [
              "Plan van aanpak per werkstroom",
              "Deels",
              "3sides beschreef per werkstroom doel, resultaten, aanpak en planning (p. 6–13). Wat het programma nog toevoegt: output-KPI, capaciteit van Cito en eigenaar, bij adoptie ook de scope (deel 5)",
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
            "Eén keten van doel tot werkstroom: van elke activiteit is na te gaan waartoe hij dient.",
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
      "3 · Wat 3sides heeft, en waar het in het framework hoort",
      "3sides gebruikt hetzelfde framework, met eigen woorden. Hieronder per niveau wat wij zeggen en wat 3sides zegt, en daarna het ene verschil dat ertoe doet. Waar elk onderdeel van 3sides precies onder hangt, staat in deel 7.",
      [
        lagen(
          ["Wij (DIN)", "3sides", "Bron"],
          [
            laag("Doel", "doel", [
              "Drie programmadoelen; het programma richt zich nu op doel 1: 'Integraal klantbeeld en outside-in werken als strategisch fundament'. Alle drie de baten hangen daaronder; doel 2 en 3 hebben nog geen eigen baten",
              "Doelen (Waartoe). Het meetinstrument opent met de keten van het programma, de drie doelen met hun bouwstenen, en noemt als doel: 'Outside-in werken vanuit een integraal klantbeeld'",
              "Plan van aanpak p. 2 · meetinstrument p. 2 en 4",
            ]),
            laag("Baat", "baat", [
              "3 sectorbaten met samen 14 baten-KPI's",
              "Baten (Effect): dezelfde 14 KPI's per sector, plus 4 organisatiebrede: NPS, conversie, omzet, retentie/churn",
              "KPI-model · meetinstrument p. 7–8",
            ]),
            laag("Vermogen", "vermogen", [
              "Gedeeld vermogen en 3 sectorvermogens, opgebouwd in 4 domeinen",
              "Vermogens (Kunnen): per kernprincipe wat Cito moet kunnen",
              "Plan van aanpak p. 2 · meetinstrument p. 5 en 11",
            ]),
            laag("Inspanning", "inspanning", [
              "Wat het programma doet: per domein één inspanning; de vier werkstromen werken eraan (voorstel)",
              "Inspanningen (Concreet Doen): per kernprincipe wat medewerkers en teams doen. De werkstromen heten bij 3sides werkstromen of stromen, nergens inspanningen",
              "Plan van aanpak p. 2–4, 6 en 8–10 · meetinstrument p. 5 en 11–12 · tijdlijn",
            ]),
          ]
        ),
        callout(
          "let-op",
          "Het belangrijkste verschil in taal",
          "Bij 3sides betekent 'inspanning' het gedrag van medewerkers: wat ze doen per kernprincipe ('Vermogens & Inspanningen (Kunnen en Doen)', plan van aanpak p. 8; meetinstrument p. 5 en 11–12). In het DIN is een inspanning een activiteit die een vermogen opbouwt: de vier werkstromen en hun activiteiten. Gedrag hoort bij het vermogen. Zonder deze afspraak praten we langs elkaar heen; het advies staat in deel 4."
        ),
      ]
    ),

    // 4
    sectie(
      "meetmodel",
      "4 · Het meetmodel: werkstromen bouwen, kernprincipes meten",
      "Per niveau één soort meting, ook op het niveau van het vermogen en van de werkstromen. De werkstromen bouwen het vermogen, de vijf kernprincipes van 3sides meten hoe ver het vermogen is, en de baten-KPI's laten zien of de klant het merkt.",
      [
        lagen(
          ["De vraag", "Wat we meten", "Van 3sides", "Wanneer"],
          [
            laag("Doel · impact", "doel", [
              "Is de organisatie veranderd?",
              "Het organisatiebrede beeld; indicator te bepalen",
              "Vier organisatiebrede KPI's: NPS, conversie, omzet, retentie/churn (bij 3sides onder de baten; voorstel: hier)",
              "Jaarlijks (voorstel)",
            ]),
            laag("Baat · uitkomst", "baat", [
              "Merkt de klant het?",
              "De 14 baten-KPI's per sector: de stuurlaag. Bateneigenaar: de sectormanager (organigram); het KPI-model noemt de Commercieel Manager als KPI-eigenaar ❓",
              "Dezelfde 14 KPI's, met startwaarde uit de 0-meting en doelwaarde in een vervolgsessie",
              "0-meting: oplevering okt · tussenmeting: jan–feb 2027",
            ]),
            laag("Vermogen · leidend", "vermogen", [
              "Kunnen we het nu?",
              "Stand per domein; start- en doelwaarde na de 0-meting",
              "Vijf kernprincipes: kunnen en doen, één score van 1 tot 10 per kernprincipe; KPI's per klantreisfase",
              "0-meting: oplevering okt · tussenmeting: jan–feb 2027",
            ]),
            laag("Inspanning · output", "inspanning", [
              "Hebben we het gedaan?",
              "Per werkstroom: is het resultaat opgeleverd? Output-KPI per resultaat: aanvullen in het plan van aanpak",
              "De tijdlijn: per activiteit start, oplevering en status (+, +/-, -)",
              "Doorlopend",
            ]),
          ]
        ),
        tekst(
          "Bron: KPI-model (stap 9), meetinstrument p. 7–12 en de tijdlijn. Voorstel: de plek van de organisatiebrede KPI's op doelniveau en de meetfrequentie van het doel."
        ),
        tabel(
          ["Niveau", "KPI's, concreet", "Bron"],
          [
            ["Doel · impact", "Organisatiebreed beeld: NPS, conversie, omzet, retentie/churn; NPS als resultante (voorstel)", "Meetinstrument p. 8 · KPI-model"],
            ["Baat · uitkomst", "De 14 baten-KPI's: Zakelijk 5, PO 5, VO 4. Startwaarde uit de 0-meting, doelwaarde in de vervolgsessie", "KPI-model · meetinstrument p. 7"],
            [
              "Vermogen · leidend",
              "Per kernprincipe één score van 1 tot 10, kunnen en doen samen; de stand per domein, van huidige naar gewenste situatie; verdere indicatoren per domein na de 0-meting (voorstel)",
              "Meetinstrument p. 12 · stappenplan · KPI-sessie",
            ],
            ["Werkstroom · output · Klantreizen", "Blueprint geaccepteerd · funnelprocessen vastgesteld · Customer Success-proces beschreven", "Organigram; tot nu toe besproken, definitief uit het plan van aanpak"],
            ["Werkstroom · output · Centrale datavoorziening klantcontact", "Inventarisatie af · advies behouden/vervangen/loslaten opgeleverd · richting CRM besluitklaar", "Organigram; tot nu toe besproken, definitief uit het plan van aanpak"],
            ["Werkstroom · output · 0-meting", "Elke baten-KPI compleet (definitie, bron, startwaarde) · stand per domein opgeleverd · advies opgeleverd", "Organigram; tot nu toe besproken, definitief uit het plan van aanpak"],
            ["Werkstroom · output · Adoptieframework", "Framework vastgesteld · pilot gestart · eerste gedragsdata · ambassadeurs aangehaakt", "Organigram; tot nu toe besproken, definitief uit het plan van aanpak"],
          ],
          {
            titel: "KPI's per niveau, ook op het vermogen en per werkstroom",
            legenda: "Baten-KPI's zijn de stuurlaag. Vermogen-KPI's zijn leidend: ze bewegen als eerste. Werkstroom-KPI's zeggen of het resultaat er is (opgeleverd ja/nee); 3sides vult ze aan in het plan van aanpak.",
          }
        ),
        tekst(
          "Waarom hier de kernprincipes. De vijf kernprincipes van 3sides zijn geen vijfde onderdeel van het framework. Ze beschrijven ons vermogen in vijf gedragingen, elk met een kunnen-kant en een doen-kant, en ze krijgen in de 0-meting een score. Daarmee zijn ze de meetlat op het niveau van het vermogen. In de plaat staan ze daarom alleen bij het vermogen; hier in het meetmodel werken we ze uit: welk kernprincipe hoort bij welk deel van ons vermogen, in welk domein, en welke werkstroom bouwt eraan. Zo sluiten de vier domeinen en de vijf kernprincipes op elkaar aan zonder dat er een tweede indeling ontstaat."
        ),
        KERNPRINCIPES,
        lijst(
          [
            "Eén betekenis per woord: inspanning is wat het programma doet, dus de vier werkstromen en hun activiteiten; kunnen én doen horen bij het vermogen.",
            "Werkstromen bouwen, kernprincipes meten: de werkstromen bouwen het vermogen op in de vier domeinen; de vijf kernprincipes zijn de meetlat waarmee de 0-meting laat zien hoe ver dat vermogen is.",
            "Per niveau één soort meting: output voor de werkstromen, de kernprincipe-score voor het vermogen, de 14 baten-KPI's voor de baten.",
            "Vraag aan 3sides: noem 'Vermogens & Inspanningen (Kunnen en Doen)' in het meetmodel voortaan 'Vermogen: kunnen en doen', en maak van 'Vermogens (Waartoe)' 'Vermogens (Kunnen)'. Dan is het één model.",
          ],
          "Advies: zo komt alles samen"
        ),
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
            titel: "Zo verloopt de meting",
            legenda: "De stappen volgen de aanpak van 3sides (plan van aanpak p. 9: inventariseren, analyseren, ontwerpen, uitvoeren); de maanden komen uit de tijdlijn (tab v3); de validatie met Meryl en het MT uit het overleg van 29-09; de vervolgsessie en het dashboard uit het meetinstrument p. 7 en p. 16.",
          }
        ),
      ]
    ),

    // 5
    sectie(
      "werkstromen",
      "5 · De vier werkstromen: wat 3sides gaat doen",
      "Per werkstroom het plan van aanpak van 3sides, ingepast in het DIN: waarom, resultaten en planning komen letterlijk uit hun plan van aanpak; de plek in de keten, de inspanning in het DIN en 'nog aanvullen' zijn van het programma. Het plan van aanpak ligt er; wat nog ontbreekt, staat onder 'nog aanvullen'.",
      [
        WERKSTROMEN,
        tekst(
          "Bron: plan van aanpak 3sides p. 6–13 (waarom, resultaten, planning). Plek in het DIN, leads en 'nog aanvullen': programma (DIN in de app, organigram). De koppeling van elke werkstroom aan een inspanning in het DIN is een voorstel."
        ),
      ]
    ),

    // 6
    sectie(
      "planning",
      "6 · De planning van 3sides in één beeld",
      "De projecttijdlijn van 3sides: per werkstroom de activiteiten, van start tot oplevering, met de stand van 28-09.",
      [
        TIJDLIJN,
        lijst(
          [
            "0-meting: nog niet gestart, oplevering in oktober; het ophalen van data staat op '-'.",
            "Adoptie: de eerste sector start in januari 2027; in het stappenplan stond een pilot in één sector in Q3 2026.",
            "Plan van aanpak tegenover tijdlijn: de playbooks staan in het plan van aanpak in Q4 2026 en in de tijdlijn van december 2026 tot mei 2027; de pilots in Q1 2027, in de tijdlijn van januari tot mei 2027.",
            "Open einden: vier activiteiten hebben geen oplevermaand (interventies, communicatieplan, adoptieframework toetsen, ambassadeurs) en twee geen startmaand (klantreis vertalen naar CRM-input, 0-meting).",
          ],
          "Wat opvalt"
        ),
      ]
    ),

    // 7
    sectie("verschillen", "7 · Overeenkomsten en verschillen", "Eerst waar alles wat 3sides heeft onder het DIN hangt; dan wat hetzelfde is en wat verschilt.", [
        tabel(
          ["Wat 3sides heeft", "Hoort in het DIN bij (voorstel)", "Bron"],
          [
            ["Blueprint klantreis", "Inspanning: werkstroom Klantreizen, domein Processen", "Plan van aanpak p. 10–11 · blueprint"],
            [
              "Technologielandschap",
              "Inspanning: werkstroom Centrale datavoorziening klantcontact, domein Data & Systemen",
              "Plan van aanpak p. 6–7 · Data & Tech",
            ],
            [
              "Succes meten: meetmodel, datapunten, 0-meting",
              "Inspanning: werkstroom 0-meting; meet alle niveaus",
              "Plan van aanpak p. 8–9 · meetinstrument · datapunten",
            ],
            [
              "Adoptieframework (SMILE)",
              "Inspanning: werkstroom Adoptieframework, domeinen Mens en Cultuur",
              "Plan van aanpak p. 12–13 · adoptieframework",
            ],
            ["Praatplaten funnel en salesproces", "Resultaat van de werkstroom Centrale datavoorziening klantcontact", "Tijdlijn · praatplaten"],
            ["Vijf kernprincipes: kunnen en doen", "Vermogen: de meetlat voor ons vermogen (deel 4)", "Meetinstrument p. 11–12"],
            ["KPI's per klantreisfase, van merkbekendheid tot renewal rate", "Vermogen: leidende indicatoren per fase", "Meetinstrument p. 10 · blueprint"],
            ["Kernwaarden G.O.L.D.: gedreven, ondersteunend, lerend, deskundig", "Vermogen, domein Cultuur", "Blueprint, tab GOLD - Kernwaarden"],
            ["Vier organisatiebrede KPI's: NPS, conversie, omzet, retentie/churn", "Doel: organisatiebreed beeld (deel 4); NPS als resultante", "Meetinstrument p. 8 · KPI-model"],
          ],
          { titel: "Waar hangt wat van 3sides onder?" }
        ),
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
      tabel(
        ["Onderwerp", "Wij", "3sides", "Voorstel", "Bron"],
        [
          [
            "Het woord inspanning",
            "Activiteit die een vermogen opbouwt: de werkstromen",
            "Wat medewerkers doen: gedrag per kernprincipe",
            "Inspanning alleen voor de werkstromen; kunnen en doen horen bij het vermogen (deel 4)",
            "Plan van aanpak p. 2 en 8 · meetinstrument p. 5 en 11–12",
          ],
          [
            "Label van de vermogens",
            "Vermogen = wat we moeten kunnen",
            "Meetinstrument p. 6: 'Vermogens (Waartoe)'; elders 'Vermogens (Kunnen)'",
            "Doelen = waartoe, vermogens = kunnen",
            "Plan van aanpak p. 2 · meetinstrument p. 6",
          ],
          [
            "Namen van de werkstromen",
            "Klantreizen · Centrale datavoorziening klantcontact · 0-meting · Adoptieframework",
            "Blueprint klantreis · Technologielandschap · Succes meten · Adoptieframework",
            "Eén set namen, overal dezelfde",
            "Organigram · plan van aanpak p. 3",
          ],
          [
            "NPS",
            "Resultante, geen stuur-KPI",
            "Baat (effect), naast conversie en omzetgroei",
            "NPS als resultante houden; wel meten",
            "KPI-model · plan van aanpak p. 2 · meetinstrument p. 8",
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
        { titel: "Wat verschilt en een besluit vraagt" }
      ),
    ]),

    // 8
    sectie("verder", "8 · Hoe verder", "", [
      lijst(
        [
          "Framework: het DIN blijft het enige framework; de termen van 3sides zijn synoniemen (deel 3).",
          "Woorden: inspanning = werkstroomactiviteit; kunnen en doen horen bij het vermogen (deel 4).",
          "Meten: de 14 baten-KPI's zijn de stuurlaag, de kernprincipe-scores de meetlat voor het vermogen, NPS is resultante.",
          "Rollen: per werkstroom wie leidt en wie na het programma eigenaar is; domeineigenaren Processen en Cultuur benoemen; bateneigenaar gelijktrekken (sectormanager of Commercieel Manager).",
          "Planning: de verschuiving van pilot en 0-meting vaststellen.",
        ],
        "Besluitpunten"
      ),
      tabel(
        ["Wat", "Wie (voorstel)", "Bron"],
        [
          ["Meetmodel valideren met Meryl, daarna met het MT", "Pim met Sasja; Sanne plant", "Overleg 29-09"],
          [
            "Projectgroep per werkstroom; capaciteit ophalen bij sector- en afdelingsmanagers",
            "Sanne met de Cito-leads",
            "Overleg 29-09 · stappenplan",
          ],
          ["Blueprint valideren met product- en sectormanagers", "Saila met Sasja", "Overleg 29-09 · plan van aanpak p. 10"],
          ["Salesfunnel en -proces definiëren met Meryl en Jasper", "Jama met Lammert", "Overleg 29-09"],
          ["Begrippenlijst met gangbare termen", "Pim", "Overleg 29-09"],
          ["Plan van aanpak aanvullen per werkstroom (deel 5)", "3sides vult aan; de Cito-lead toetst op resultaat, Pim op de kaders; Sanne stelt vast", "Organigram"],
        ],
        { titel: "Volgende stappen" }
      ),
    ]),

    // 9
    sectie(
      "organisatie",
      "9 · Uitleggen: binnen Cito en naar buiten",
      "De termen in dit stuk zijn werktaal voor het programmateam. Voor de organisatie vertalen we ze naar gewone taal; met externe partijen gebruiken we de gangbare term.",
      [
        tabel(
          ["Werktaal", "In gewone taal", "Gangbare term (extern, voorstel)"],
          [
            ["Doel", "Waar willen we naartoe?", "Goal"],
            ["Baat", "Wat merkt de klant, wat levert het op?", "Benefit"],
            ["Vermogen", "Wat moeten we kunnen?", "Capability"],
            ["Kernprincipe", "Hoe werken we, en zie je dat terug?", "Guiding principle"],
            ["Domein", "Waar in de organisatie verandert het?", "People · process · technology · culture"],
            ["Inspanning", "Wat gaan we doen?", "Initiative"],
            ["Werkstroom", "Waar werken we aan?", "Workstream"],
            ["0-meting", "Waar staan we nu?", "Baseline"],
          ],
          { titel: "Vertaaltabel" }
        ),
        lijst(
          [
            "Naar de organisatie: de klantreis als verhaal, geen DIN- of 3sides-jargon.",
            "Per doelgroep een eigen vorm: MT (doel, baten, besluiten) · sectormanagers (wat het hun sector oplevert en vraagt) · teams (per rol één A4 'Mijn rol in de klantreis').",
            "Werkmateriaal blijft intern: platen gaan niet één-op-één de organisatie in (overleg 29-09).",
          ],
          "Uitgangspunten"
        ),
      ]
    ),

    // 10
    sectie("documenten", "10 · Bronnen", "", [
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
