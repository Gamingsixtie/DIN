// Stap 11 — "Programma × 3sides": integratie-analyse van het programmaplan (DIN)
// naast alles wat 3sides heeft opgeleverd, ter voorbereiding van de sessie van
// maandag (intern Cito). Standaardinhoud; in de app per kop en cel aanpasbaar en
// opgeslagen onder session.documenten[INTEGRATIE_SLEUTEL].
//
// Bronnen (stand 29-09-2026): 3sides Plan van Aanpak (PDF), Project tijdlijn
// (Excel, stand 28-09), 0-meting meetinstrument (WiP), Blueprint klantreis (draft),
// Adoptieframework (WiP), Data & Tech, praatplaten funnel en salesproces,
// Data punten ter input KPI, BV-dag-deck, statuspagina 3sides, offerte 12-06-2026;
// programma: programmaplan/DIN, KPI-sessie 24-06-2026, stappenplan analysefase
// 19-08-2026, organigram v4, programmaoverleg 29-09-2026, evaluatie Klant in Beeld.
// Regel: niets verzinnen — datums en waarden alleen uit deze bronnen, anders "te bepalen".

import type { BewerkbaarDocument, DocBlok, DocKaart, DocLaag, DocSectie } from "@/lib/schemas";

export const INTEGRATIE_SLEUTEL = "integratie-3sides";

// ---------- kleine bouwers ----------
const tekst = (t: string): DocBlok => ({ type: "tekst", tekst: t });
const lijst = (items: string[], titel = ""): DocBlok => ({ type: "lijst", titel, items });
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
const kaart = (titel: string, ondertitel: string, regels: [string, string][]): DocKaart => ({
  titel,
  ondertitel,
  regels: regels.map(([label, waarde]) => ({ label, waarde })),
});
const kaarten = (k: DocKaart[]): DocBlok => ({ type: "kaarten", kaarten: k });
const laag = (naam: string, kleur: string, cellen: string[]): DocLaag => ({ naam, kleur, cellen });
const lagen = (kolommen: string[], l: DocLaag[]): DocBlok => ({ type: "lagen", kolommen, lagen: l });
const sectie = (id: string, titel: string, intro: string, blokken: DocBlok[]): DocSectie => ({
  id,
  titel,
  intro,
  blokken,
});

const TIJDLIJN_KOLOMMEN = ["Activiteit (tijdlijn 3sides)", "Start", "Oplevering", "Voortgang", "Status"];

// ---------- de analyse ----------
export const DEFAULT_INTEGRATIE_3SIDES: BewerkbaarDocument = {
  titel: "Programma × 3sides — het is al één geheel",
  ondertitel:
    "Programmaplan en DIN naast alles wat 3sides heeft opgeleverd: wat er ligt, hoe het samenvalt, waar het verschilt en wat we maandag besluiten.",
  status: "Intern Cito · voorbereiding sessie maandag · stand 29-09-2026",
  secties: [
    // 1
    sectie(
      "kern",
      "1 · Kernboodschap",
      "Ik heb onderzoek gedaan: alles wat 3sides tot nu toe heeft opgeleverd naast het programmaplan en het DIN gelegd. De uitkomst: het is al één geheel. Het kader staat; 3sides vult het in.",
      [
        lijst([
          "Het kader staat: het programmaplan en het DIN (doelen → baten → vermogens → inspanningen), drie sectorbaten met veertien baten-KPI's (vastgesteld 24-06-2026), vier werkstromen en de programmaorganisatie.",
          "Dezelfde vier werkstromen: de vier stromen van 3sides zijn onze vier werkstromen; alleen de namen verschillen per document.",
          "Eerste invulling, geen nieuw kader: blueprint, meetinstrument, datapunten, adoptieframework, Data & Tech-plaat en funnel- en salesprocesplaat zijn drafts die in het kader passen.",
          "Het plan van aanpak ligt er al grotendeels: het 3sides-PvA beschrijft per werkstroom doel, resultaten, scope, aanpak en planning. We vullen aan wat ontbreekt: eigenaar, output-KPI, capaciteit van Cito, domeineigenaar, koppeling aan baat en vermogen, en wat buiten scope valt.",
          "Niet opnieuw doen: we bouwen voort op wat er ligt. Een beperkt aantal verschillen vraagt een besluit: begrippen, meetlaag, eigenaarschap en planning (deel 6).",
        ]),
      ]
    ),

    // 2
    sectie(
      "gedaan",
      "2 · Wat er al gedaan is",
      "Er ligt al veel. Dit is wat het programma en 3sides tot nu toe hebben gedaan, met status en bron.",
      [
        tabel(
          ["Onderdeel", "Wat er ligt", "Status", "Bron"],
          [
            ["Klant in Beeld", "Visie (uitgebreid en beknopt), drie programmadoelen, scope, klantreizen per sector", "Afgerond; basis voor Klant in Zicht", "KiB-uitkomsten, programmaplan"],
            ["Programmaplan en DIN", "3 doelen · 3 sectorbaten · gedeeld vermogen + 3 sectorvermogens · 4 domeinclusters (Mens, Processen, Data & Systemen, Cultuur)", "Vastgesteld; doel 2 en 3 hebben nog geen eigen baten", "Programmaplan, DIN-netwerk"],
            ["Baten-KPI's", "14 baten-KPI's (Zakelijk 5 · PO 5 · VO 4), churn bij alle drie; NPS als resultante", "Vastgesteld 24-06-2026; start- en doelwaarden te bepalen na de 0-meting", "KPI-sessie, KPI-model (stap 9)"],
            ["Stappenplan analysefase", "Fundament in 7 stappen (meenemen, teams, meetprotocol, adoptieframework, nulmeting, vervolgsessie, pilot) en activiteiten per domein per kwartaal", "Eerste schets 19-08-2026, levend document", "Stappenplan analysefase"],
            ["Raming en begroting", "Scenario Plus20 (2026–2030); 2026 € 251.500, 2027 € 301.500", "2027 is een raming, nog geen begroting", "Onderbouwing begroting 2027"],
            ["Programmaorganisatie", "Programmamanagement als één blok, vier werkstromen met Cito-lead en 3sides-lead, domeineigenaren, stuurgroep, overlegritme", "Voorstel v4, vast te stellen door de programma-eigenaar", "Organigram (stap 10)"],
            ["3sides-inzet", "3sides-as-a-service, 6 maanden (offerte 12-06-2026); uren Q3: juli 186,5 · augustus 80 · september 226,75 (t/m 25-09) van 232 per maand; 197,5 uur doorgeschoven", "Lopend", "Offerte, statuspagina 3sides"],
            ["Plan van aanpak 3sides", "Per werkstroom doel, resultaten, scope, aanpak en planning (Q3 2026 – Q1 2027)", "Ontvangen", "Cito – Plan van Aanpak (PDF)"],
            ["Projecttijdlijn", "29 activiteiten in vier stromen, juli 2026 – juni 2027, met voortgang en status", "Stand 28-09-2026", "Project tijdlijn (Excel)"],
            ["Blueprint klantreis", "6 fasen en 11 subfasen; swimlanes klantdoel, hoofdstappen, kernwaarden G.O.L.D., kernprincipes, handelen, procesafspraken per rol, systeemgebruik en KPI's; KPI-meetkader met 55 KPI's", "Draft; competenties nog leeg", "Blueprint klantreis (Excel)"],
            ["Meetinstrument 0-meting", "Meetmodel doelen → baten → vermogens en inspanningen; vijf kernprincipes met score 1–10; baten-KPI's per sector; klantreis-KPI per fase; dashboard in vier lagen", "Work in progress; 0-meting nog niet gestart", "0-meting meetinstrument, tijdlijn"],
            ["Datapunten ter input KPI", "Circa 85 datapunten in negen blokken (van retentie tot support); gele cellen zijn de baten-KPI's van het programma; eigenaren deels ingevuld", "Werkdocument; bron, frequentie en status ontbreken", "Data punten ter input KPI (Excel)"],
            ["Orderexport LIB VO", "677 orderregels LIB VO voor gebruiksjaar 2026/2027 (orderdatum juni – september 2026); bruikbaar voor % meerjarige licenties, licentieperiode en upsell Basis → Plus", "Beschikbaar als databron; alleen VO en één gebruiksjaar (churn vraagt ook een vorig jaar)", "Aantallen besteld (Excel)"],
            ["Adoptieframework", "SMILE-aanpak, vertaallogica klantreis → gedrag → competenties → adoptie, vijf lagen, adoptieteam en champions, playbook-workshops", "Work in progress", "Cito DIN Adoptie Framework (PDF)"],
            ["Data & Tech-plaat", "Kanalen en systemen per klantreisfase (klant- en interne kant), velden van een CRM-verkoopkans", "Inventarisatie", "Cito Data & Tech (PDF)"],
            ["Funnel- en salesprocesplaat", "Funnel van marketing lead tot won/lost en renewal; rollen in het salesproces", "Draft, deels 'nog afstemmen'", "Praatplaten funnel en salesproces"],
            ["Organisatie en draagvlak", "Town hall, BV-dag (kennismaking, 'de komende 90 dagen'), gesprekken met stakeholders, evaluatie Klant in Beeld (13 respondenten)", "Gedaan", "Statuspagina, BV-dag-deck, evaluatie"],
          ]
        ),
      ]
    ),

    // 3
    sectie(
      "kapstok",
      "3 · De kapstok in één plaat",
      "Het DIN van het programma en het meetmodel van 3sides beschrijven dezelfde keten. Zo leggen we ze op elkaar.",
      [
        lagen(
          ["Programma (DIN)", "3sides", "Wat we meten", "Eigenaar"],
          [
            laag("Doel", "doel", [
              "3 programmadoelen, o.a. 'Integraal klantbeeld en outside-in werken als strategisch fundament'",
              "'Doelen (Waartoe)': outside-in werken vanuit een integraal klantbeeld",
              "Impact, lange termijn",
              "Programma-eigenaar, stuurgroep",
            ]),
            laag("Baat", "baat", [
              "3 sectorbaten met 14 baten-KPI's; NPS is resultante",
              "'Baten (Effect)': NPS, conversie, omzetgroei, churn — BV-breed en per sector",
              "Outcome: de stuurlaag",
              "Sectormanagers (bateneigenaren); meetverantwoordelijke Strategisch Marketeer",
            ]),
            laag("Vermogen", "vermogen", [
              "Gedeeld vermogen + 3 sectorvermogens, opgebouwd in 4 domeinen",
              "Vijf kernprincipes, kunnen-kant (klant begrijpen · klantinformatie benutten · eigenaarschap nemen · data-gedreven werken · samenwerken rond en met de klant) + kernwaarden G.O.L.D.",
              "Maturity: streefniveau AS-IS → TO-BE; kernprincipescores als kandidaat-indicator (voorstel)",
              "Domeineigenaren",
            ]),
            laag("Gedrag", "gedrag", [
              "Onderdeel van het vermogen: gewenst gedrag per rol en contactmoment",
              "'Inspanningen (Doen)': doen-kant van de kernprincipes, gedrag per klantreisfase en rol",
              "Gedrags- en proces-KPI's (voorstel, na de 0-meting)",
              "Teams en leidinggevenden",
            ]),
            laag("Inspanning", "inspanning", [
              "Activiteiten per domein en de fundamentstappen, gebundeld in vier werkstromen",
              "Activiteiten per werkstroom in het plan van aanpak en de tijdlijn",
              "Output: opgeleverd ja/nee, mijlpaal gehaald",
              "Cito-lead met 3sides-lead",
            ]),
          ]
        ),
        callout(
          "let-op",
          "Het belangrijkste verschil in taal",
          "Bij 3sides betekent 'inspanning' het gedrag van medewerkers (doen). In het DIN is een inspanning een activiteit die een vermogen opbouwt; gedrag hoort bij het vermogen. Zonder deze afspraak praten we langs elkaar heen."
        ),
      ]
    ),

    // 4
    sectie(
      "begrippen",
      "4 · Begrippenlijst (werktaal programmateam)",
      "Eén term per begrip, met de 3sides-variant en de marktconforme term ernaast. Definities uit de bronnen; wat nog niet gedefinieerd is, staat op 'te bepalen'.",
      [
        tabel(
          ["Term (programma)", "Bij 3sides", "Marktconform", "Definitie", "Bron"],
          [
            ["Doel", "Doelen (Waartoe)", "Goal", "Waar het programma naartoe werkt; alleen op programmaniveau", "Programmaplan"],
            ["Baat", "Baten (Effect)", "Benefit / outcome", "Meetbaar effect van de verandering dat bijdraagt aan een doel; met batenprofiel en bateneigenaar", "Werken aan Programma's H8"],
            ["Baten-KPI", "BV KPI · product specifieke KPI", "Outcome-KPI", "De vastgestelde KPI's per sectorbaat; de stuurlaag", "KPI-sessie 24-06-2026"],
            ["Vermogen", "Vermogens (Kunnen)", "Capability", "Wat de organisatie moet kunnen: combinatie van mensen, processen, data en systemen", "Werken aan Programma's H10"],
            ["Gedrag", "Inspanningen (Doen)", "Behaviour", "Zichtbaar gedrag van medewerkers per klantreisfase en rol; onderdeel van het vermogen", "Kernprincipes 3sides; voorstel"],
            ["Inspanning", "Activiteit (in een stroom)", "Initiative", "Activiteit die een vermogen opbouwt; gebundeld in een werkstroom", "Programmaplan"],
            ["Werkstroom", "Werkstroom · stroom", "Workstream", "Bundel inspanningen met een Cito-lead en een 3sides-lead; geen deelprogramma", "Organigram v4"],
            ["Kernprincipe", "Kernprincipe (kunnen en doen)", "Guiding principle", "Vijf principes voor hoe we werken, elk met een kunnen- en een doen-kant; score 1–10", "Blueprint en meetinstrument 3sides"],
            ["Kernwaarden", "G.O.L.D.", "Core values", "Gedreven, Ondersteunend, Lerend, Deskundig", "Blueprint 3sides"],
            ["0-meting", "0-meting · nulmeting", "Baseline", "Eerste meting: startwaarde per baten-KPI en stand per domein", "Stappenplan, PvA 3sides"],
            ["Succesmeting", "Succes meten", "Performance measurement", "Doorlopend meten, met de 0-meting als eerste stap en een tussenmeting in Q1 2027", "PvA 3sides, meeting 29-09"],
            ["Plan van aanpak", "Plan van aanpak", "Workstream plan", "Per werkstroom: resultaat, output-KPI, aanpak, planning, capaciteit, domeineigenaar; 3sides stelt op, Cito toetst, de programmamanager stelt vast", "Organigram v4"],
            ["Bateneigenaar", "—", "Benefit owner", "Sectormanager die verantwoordelijk is voor de baat in de eigen sector", "Organigram v4"],
            ["Data-aanleverancier", "Eigenaar datapunt", "Data owner", "Levert de meetgegevens aan; niet hetzelfde als de bateneigenaar", "Datapunten 3sides; voorstel"],
            ["Marketing lead", "Marketing Lead", "Lead", "Heeft iets gelezen, bezocht of opgevraagd", "Praatplaat funnel"],
            ["MQL", "Marketing Qualified Lead", "MQL", "Lead na een aantal touchpoints; het aantal is te bepalen", "Praatplaat funnel"],
            ["Sales lead", "Sales lead", "SQL", "Lead die is overgedragen aan sales; definitie SQL te bepalen", "Praatplaat funnel"],
            ["Verkoopkans", "Verkoopkans · opportunity", "Opportunity", "Gekwalificeerde lead met business case, beslissers, verwachte omzet en kanspercentage", "KPI-meetkader blueprint"],
            ["Winrate", "Win Rate", "Win rate", "Aantal gewonnen opdrachten / aantal uitgebrachte offertes × 100%", "KPI-meetkader blueprint"],
            ["Renewal rate", "Renewal Rate", "Renewal rate", "Aantal verlengde contracten / aantal aflopende contracten × 100%", "KPI-meetkader blueprint"],
            ["Churn", "Churn / retentie", "Churn", "Verloren klanten / klanten aan het begin van de periode; per sector nog verschillend omschreven", "KPI-meetkader; Programma KPIs 3sides"],
            ["NPS", "NPS", "Net Promoter Score", "% promoters minus % detractors; resultante, geen stuur-KPI", "KPI-meetkader; besluit programma"],
            ["Deal", "Won", "Closed-won", "Te bepalen", "—"],
          ],
          { legenda: "Uit de meeting van 29-09: begrippen marktconform houden, zodat ook externe partijen ze begrijpen." }
        ),
      ]
    ),

    // 5
    sectie(
      "werkstromen",
      "5 · Per werkstroom: wat er ligt en waar het landt",
      "Per werkstroom de namen naast elkaar, wat 3sides heeft opgeleverd, waar het landt en wat het plan van aanpak nog nodig heeft.",
      [
        kaarten([
          kaart("Klantreizen", "3sides: Cito Blueprint Klantreis · BV-dag: Blueprint voor de Cito klantreis", [
            ["Cito-lead · 3sides-lead", "Saila · Sasja"],
            ["Doel (PvA)", "De klantreizen per sector samenbrengen in één integrale Cito BV-klantreis, gedragen door productmanagers en sectormanagers, als werkmodel binnen de sectoren."],
            ["Opgeleverd", "Blueprint draft: 6 fasen, 11 subfasen, swimlanes, KPI-meetkader (55 KPI's), rollen; G.O.L.D. en kernprincipes per fase."],
            ["Stand (tijdlijn)", "Fasen en hoofdstappen: okt · kernwaarden en kernprincipes naar handelen: nov · proces, CRM-gebruik en KPI's: dec · rollen, gedrag en competenties: dec · journey naar CRM-input en funnelprocessen: niet gestart, nov."],
            ["Landt in", "Processen (domeineigenaar n.t.b. ❓); basis voor alle vier; draagt bij aan alle drie de sectorbaten."],
            ["Plan van aanpak mist", "Output-KPI, capaciteit van Cito voor sessies met de sectoren, eigenaar van de blueprint na het programma, domeineigenaar Processen, wat buiten scope valt."],
          ]),
          kaart("Centrale datavoorziening klantcontact", "3sides: Technologielandschap · BV-dag: Technologielandschap", [
            ["Cito-lead · 3sides-lead", "Jama · Lammert (in de meeting: wekelijks overleg van Ericka met Cornelis)"],
            ["Doel (PvA)", "Het technologielandschap in kaart brengen, bepalen wat we behouden, vervangen, samenvoegen of uitfaseren, en een gedragen route naar het gewenste landschap."],
            ["Opgeleverd", "Data & Tech-plaat (kanalen en systemen per klantreisfase), funnel- en salesprocesplaat, eerste evaluatie van de CRM-inrichting, gesprekken met stakeholders."],
            ["Stand (tijdlijn)", "Data & apps-analyse: sep · visie en consequentie: sep · marketing & sales-proces en funnel: okt · CRM-richting: nov · integratie-approach: nov · stakeholder engagement: t/m mrt-27 · interventies: niet gestart."],
            ["Landt in", "Data & Systemen (Cornelis); in de 3sides-stukken nog niet gekoppeld aan een baat of vermogen; raakt project A5 centrale datavoorziening."],
            ["Plan van aanpak mist", "Koppeling aan baat en vermogen, output-KPI, afstemming van de CRM-richting (nov, tijdlijn) met de formele keuze (rond april 2027, stappenplan), afbakening A5 en Stichting."],
          ]),
          kaart("0-meting", "3sides: Succes meten · BV-dag: nulmeting / 0 Meting", [
            ["Cito-lead · 3sides-lead", "Pim · Sasja"],
            ["Doel (PvA)", "Duidelijk maken waarom we dit doen en wat we willen bereiken, gemeten in lagen: baten per sector en BV, en daaronder vermogens en inspanningen per klantreisfase."],
            ["Opgeleverd", "Meetinstrument (WiP): meetmodel, vijf kernprincipes met score 1–10, baten-KPI's per sector, klantreis-KPI per fase, dashboard in vier lagen; datapuntenlijst met circa 85 datapunten."],
            ["Stand (tijdlijn)", "Meetmodel ontwikkelen: sep · data ophalen: okt (status -) · 0-meting: niet gestart, oplevering okt · tussenmeting: feb-27."],
            ["Landt in", "Alle vier de domeinen; levert de startwaarden van de 14 baten-KPI's en de stand per domein."],
            ["Plan van aanpak mist", "Meetprotocol per baten-KPI (wat, bron, eenheid, frequentie, wie levert), eigenaar per datapunt, keuze welke kernprincipe-indicatoren meegaan, akkoordronde sectormanagers, datum vervolgsessie."],
          ]),
          kaart("Adoptieframework", "3sides: Adoptieframework (SMILE) · BV-dag: adoptieframework / Adoptie", [
            ["Cito-lead · 3sides-lead", "Sanne · Sasja (statuspagina 3sides: Saila beoogd eigenaar)"],
            ["Doel (PvA)", "Werken vanuit Klant in Zicht door de hele organisatie laten dragen; de klantreis is organisatiebreed, gedrag wordt rolspecifiek."],
            ["Opgeleverd", "Adoptieframework (WiP): SMILE-aanpak, vertaallogica klantreis → gedrag → competenties → adoptie, vijf lagen, adoptieteam en champions, playbook-workshops, per rol één A4."],
            ["Stand (tijdlijn)", "Framework opstellen: okt · communicatieplan: niet gestart · playbook-workshops: dec t/m mei-27 · 1e sector jan–feb-27, 2e feb–mrt-27, 3e apr–mei-27 · training en coaching met HR: jun-27 · ambassadeurs: vanaf okt."],
            ["Landt in", "Mens (Yara) en Cultuur (n.t.b. ❓); paraplu over alle vier."],
            ["Plan van aanpak mist", "Keuze eerste sector, output-KPI, capaciteit van Cito (teams, HR), koppeling aan curriculum en leiderschapsaanpak uit het stappenplan, verhouding tot de pilot in Q3 uit het stappenplan."],
          ]),
        ]),
      ]
    ),

    // 6
    sectie(
      "verschillen",
      "6 · Verschillenanalyse: klopt wat 3sides heeft met het programmaplan?",
      "Grotendeels wel. Waar het verschilt, staat hieronder met een voorstel om te besluiten.",
      [
        tabel(
          ["Onderwerp", "Programmaplan (wij)", "3sides", "Oordeel", "Voorstel om te besluiten"],
          [
            ["Namen werkstromen", "Klantreizen · Centrale datavoorziening klantcontact · 0-meting · Adoptieframework", "Cito Blueprint Klantreis · Technologielandschap · Succes meten · Adoptieframework (PvA); nulmeting en Adoptie op de BV-dag", "Verschil", "Eén set namen kiezen en overal gebruiken"],
            ["Betekenis van 'inspanning'", "Activiteit die een vermogen opbouwt", "Gedrag van medewerkers (doen), samen met kunnen in één kernprincipe", "Verschil", "Gedrag hoort bij het vermogen; 'inspanning' blijft activiteit (begrippenlijst)"],
            ["Aantal en niveau van baten", "3 sectorbaten, vastgesteld", "3, 4, per sector of 11 per klantreisfase, afhankelijk van het document", "Verschil", "De drie sectorbaten blijven de stuurlaag; BV-brede effecten als samenvatting erboven"],
            ["NPS", "Resultante, geen stuur-KPI", "Baat (effect) naast conversie en omzetgroei", "Verschil", "NPS als resultante houden; wel meten als klantreis-KPI in de fase Evaluatie"],
            ["KPI's per sector of BV-breed", "Baten-KPI's per sector", "Gelijk trekken voor alle sectoren; de sector kiest een focus (meeting)", "Aanvulling", "Zelfde definities en meetprotocol BV-breed; de sectorbaat bepaalt de focus"],
            ["Meten op vermogen en gedrag", "Vermogen-indicatoren pas na de 0-meting vaststellen, niet in overdraagbare stukken", "0-meting ook op de kernprincipes, score 1–10", "Aanvulling", "Kernprincipescores als kandidaat-indicator; vaststellen in de vervolgsessie"],
            ["Omvang meetkader", "14 baten-KPI's", "55 klantreis-KPI's en circa 85 datapunten, veel zonder eigenaar of bron", "Verschil", "Focus op de 14 baten-KPI's plus een beperkte set kernprincipe-indicatoren; de rest later"],
            ["Typering baten-KPI's", "Baten-KPI's per sector", "Een deel van onze baten-KPI's getypeerd als 'product specifieke KPI'", "Aanvulling", "Laten toelichten wat 3sides bedoelt; de KPI's niet herdefiniëren"],
            ["Eigenaarschap per werkstroom", "Cito-lead leidt de werkstroom namens Cito; 3sides-lead stelt het plan van aanpak op", "PvA noemt geen eigenaar of lead; statuspagina: Saila beoogd eigenaar blueprint én adoptie; voortgangsoverleg 28-09: Cito-leads uitvoerend en inhoudelijk, coördinatie bij 3sides", "Verschil", "Intern besluiten vóór dinsdag: wie leidt, wie coördineert, wie is eigenaar na het programma"],
            ["Data-aanleveranciers", "Bateneigenaar sectormanager; meetverantwoordelijke Strategisch Marketeer", "Eigenaren per datapunt: Ilse, Famke, Kathelijn, Jama, marketeers", "Aanvulling", "Rollen scheiden: bateneigenaar · meetverantwoordelijke · data-aanleverancier"],
            ["Planning", "Stappenplan: nulmeting Q3, adoptieframework gereed eind Q3, pilot in 1 sector Q3, 2e sector Q4, 3e Q1 2027", "Tijdlijn: 0-meting niet gestart, oplevering okt; framework okt; 1e sector jan-27, 2e feb–mrt-27, 3e apr–mei-27", "Verschil", "De verschuiving expliciet maken en laten vaststellen"],
            ["Technologielandschap", "Data & Systemen; CRM-keuze niet in 2026, formele keuze rond april 2027; A5 deels in scope", "CRM-richting in nov; roadmap en overdracht Q4; niet gekoppeld aan baat of vermogen", "Verschil", "Koppelen aan baat en vermogen; CRM-richting (advies) scheiden van CRM-keuze (besluit)"],
            ["Projectgroepen per werkstroom", "Stappenplan stap 2: inspanningsleiders en teams bepalen (Q3)", "Tot nu toe vooral één-op-één-gesprekken; actiepunt: projectgroepen per werkstroom", "Sluit aan", "Stap 2 nu uitvoeren: per werkstroom een projectgroep met capaciteit uit de sectoren"],
            ["Scope van de blueprint", "Sector- en productspecifieke uitwerking later", "Blueprint BV-breed; sector- en productspecifiek na pilots en workshops", "Sluit aan", "Zo houden"],
          ],
          {
            chipKolom: 3,
            legenda: "Oordeel: sluit aan · aanvulling (past in het kader en maakt het rijker) · verschil (vraagt een besluit).",
          }
        ),
      ]
    ),

    // 7
    sectie(
      "meeting",
      "7 · Uit de meeting van 29-09",
      "De actiepunten uit het programmaoverleg, gekoppeld aan werkstroom en stappenplan. 'Wie' is een voorstel.",
      [
        tabel(
          ["Actiepunt", "Werkstroom", "Wie (voorstel)", "Staat al in"],
          [
            ["Meetmodel valideren met Meryl als opdrachtgever, daarna met het MT", "0-meting", "Pim met Sasja; Sanne plant", "Stappenplan stap 3 (meetprotocol)"],
            ["Begrippenlijst / legende met marktconforme termen", "Programmabreed", "Pim", "Deel 4 van dit stuk (concept)"],
            ["Projectgroepen per werkstroom; capaciteit ophalen bij sector- en afdelingsmanagers", "Alle vier", "Sanne met de Cito-leads", "Stappenplan stap 2"],
            ["Blueprint valideren met productmanagers en sectormanagers", "Klantreizen", "Saila met Sasja", "PvA 3sides (Q4: gevalideerd)"],
            ["Jira-board met activiteiten delen met de bredere groep", "Programmabreed", "3sides", "—"],
            ["Maandagsessie 11:00–12:00 ter voorbereiding op dinsdag", "Programmabreed", "Sanne", "—"],
            ["Rapportage lezen vóór de volgende sessie", "Programmabreed", "Iedereen", "—"],
            ["Salesfunnel en -proces definiëren met Meryl en Jasper (lead, MQL, verkoopkans)", "Centrale datavoorziening klantcontact en Klantreizen", "Jama met Lammert; Meryl en Jasper beslissen", "Stappenplan: klantreizen → funnelprocessen (Q3–Q4)"],
          ]
        ),
        lijst(
          [
            "Werkwijze: Cito-deelnemers verwachtten een gezamenlijke start en projectgroepen; 3sides werkte tot nu toe vooral in één-op-één-gesprekken.",
            "Onderbouwing: keuzes vastleggen, beknopt: per keuze een toelichting op één A4.",
            "Volgorde: scenario's (nieuw aanbod, verrijking, uitfasering) komen later; eerst de basis: meetmodel, blueprint en funnel.",
            "Communicatie: platen en modellen zijn werkmateriaal en gaan niet één-op-één de organisatie in (zie deel 13).",
            "Budget: losse CRM-aanpassingen nu kunnen weggegooid geld zijn als de richting later anders uitvalt.",
          ],
          "Discussiepunten (op rolniveau)"
        ),
      ]
    ),

    // 8
    sectie(
      "scope",
      "8 · Scope-scherm: kaders",
      "Om scope creep en kadervervaging te voorkomen: wat erbij hoort, wat niet, en hoe we met nieuwe vragen omgaan.",
      [
        tabel(
          ["In scope", "Buiten scope of later"],
          [
            ["Organisatiebrede transformatie langs vier domeinen (programmaplan)", "Werkwijze tussen toetsdeskundigen en conceptontwikkelaars (apart traject)"],
            ["Alle klantgroepen; doorvertaling naar PO, VO en Zakelijk", "Formele CRM-keuze in 2026 (keuze rond april 2027)"],
            ["Integraal klantbeeld; funnel en klantreis BV-breed", "Release- en productproces (buiten de funnelscope)"],
            ["Het deel van A5 centrale datavoorziening dat de klantreis raakt", "Sector- en productspecifieke uitwerking (na de pilots)"],
            ["", "Stichting: nog open ❓"],
          ]
        ),
        lijst(
          [
            "1: welke baat wordt hier beter van?",
            "2: welk vermogen en welk domein bouwt het op?",
            "3: in welke werkstroom hoort het, en staat het in het plan van aanpak?",
            "4: past het in tijd en capaciteit?",
            "Vier keer ja: de werkstroom pakt het op. Anders: parkeerlijst; de programmamanager weegt, en bij afwijking van het plan besluit de stuurgroep.",
          ],
          "Trechter voor nieuwe vragen"
        ),
        callout(
          "info",
          "Voorbeeld uit de meeting",
          "De vraag hoe VO-klanten van een basispakket naar een uitgebreider pakket gaan, is een sector- en productspecifieke conversievraag. Die krijgt een plek in het model (klantreis, upsell in de fasen Gebruik en Evaluatie), maar wordt nu geen los project."
        ),
        callout(
          "besluit",
          "Spelregel",
          "Het kader (programmaplan, DIN, werkstromen en rollen) wijzigt alleen via de programmamanager en de stuurgroep. Werkstromen vullen het in via hun plan van aanpak. Voorstellen voor een andere structuur gaan als voorstel naar de programmamanager, niet rechtstreeks de werkstroom in."
        ),
      ]
    ),

    // 9
    sectie(
      "concreet",
      "9 · Concreet per werkstroom, bijna op projectniveau",
      "Een programma is geen verzameling projecten. Om maandag en dinsdag te kunnen sturen maken we het nu toch bijna op projectniveau concreet: per werkstroom de activiteiten uit de tijdlijn van 3sides (stand 28-09-2026) en wat het plan van aanpak nog moet bevatten.",
      [
        tabel(
          TIJDLIJN_KOLOMMEN,
          [
            ["Consolideren journey workshop Klant in Beeld", "jul", "aug", "In progress", "+/-"],
            ["Blueprint fasen en hoofdstappen", "aug", "okt", "In progress", "+"],
            ["Kernwaarden en kernprincipes naar handelen", "sep", "nov", "In progress", "+"],
            ["Proces, CRM-gebruik en KPI's", "sep", "dec", "In progress", "+"],
            ["Rollen, gedrag en competenties", "okt", "dec", "In progress", "+/-"],
            ["Stakeholder engagement en workshops", "aug", "dec", "In progress", "+"],
            ["Journey-vertaling naar CRM-input en funnelprocessen", "te bepalen", "nov", "Not started", "–"],
          ],
          { titel: "Klantreizen" }
        ),
        tabel(
          TIJDLIJN_KOLOMMEN,
          [
            ["Data & apps-analyse", "jul", "sep", "In progress", "+/-"],
            ["CRM-richting bepalen", "aug", "nov", "In progress", "+/-"],
            ["Stakeholder engagement", "jul", "mrt-27", "In progress", "+"],
            ["Marketing & sales-proces / funnel", "sep", "okt", "In progress", "+"],
            ["Integratie-approach", "jul", "nov", "In progress", "+/-"],
            ["Visie en consequentie", "jul", "sep", "In progress", "+"],
            ["Interventies", "okt", "te bepalen", "Not started", "–"],
          ],
          { titel: "Centrale datavoorziening klantcontact" }
        ),
        tabel(
          TIJDLIJN_KOLOMMEN,
          [
            ["Meetmodel ontwikkelen: doelen, baten, vermogens en inspanningen", "jul", "sep", "In progress", "+/-"],
            ["Data ophalen voor het meetmodel", "sep", "okt", "In progress", "-"],
            ["0-meting", "te bepalen", "okt", "Not started", "-"],
            ["Tussenmeting", "jan-27", "feb-27", "In progress", "–"],
          ],
          { titel: "0-meting" }
        ),
        tabel(
          TIJDLIJN_KOLOMMEN,
          [
            ["Adoptieframework opstellen", "jul", "okt", "In progress", "+"],
            ["Communicatieplan", "okt", "te bepalen", "Not started", "–"],
            ["Customer Journey Playbook-workshops", "dec", "mei-27", "Not started", "–"],
            ["Toepassen in 1e sector/fase (eerste gedragsdata)", "jan-27", "feb-27", "Not started", "–"],
            ["Toepassen in 2e sector/fase", "feb-27", "mrt-27", "Not started", "–"],
            ["Toepassen in 3e sector/fase", "apr-27", "mei-27", "Not started", "–"],
            ["Training- en coachingsprogramma live (met HR)", "apr-27", "jun-27", "Not started", "–"],
            ["Feedbackloops", "jan-27", "mei-27", "Not started", "–"],
            ["Toetsen adoptieframework", "okt", "te bepalen", "In progress", "+/-"],
            ["Ambassadeurs adoptieteam", "okt", "te bepalen", "Not started", "–"],
          ],
          {
            titel: "Adoptieframework",
            legenda: "Maanden in 2026 tenzij '-27'. Voortgang en status (+, +/-, -) zoals 3sides ze in de tijdlijn rapporteert; 'te bepalen' waar de tijdlijn geen maand noemt.",
          }
        ),
        lijst(
          [
            "Eigenaar: wie is na het programma eigenaar van het resultaat?",
            "Output-KPI: per resultaat, opgeleverd ja/nee met mijlpaal.",
            "Capaciteit van Cito: wie, hoeveel uur, uit welke sector of afdeling.",
            "Domeineigenaar: wie accepteert het resultaat voor gebruik in de lijn?",
            "Koppeling: aan welke baat en welk vermogen draagt het bij?",
            "Scope: wat valt er expliciet buiten?",
            "Beslismomenten: wanneer beslist wie?",
          ],
          "Nog vast te leggen in elk plan van aanpak"
        ),
        callout(
          "besluit",
          "Volgende stap",
          "3sides werkt per werkstroom het plan van aanpak uit op basis van hun PvA. De Cito-lead toetst op het resultaat, de programma-architect op de kaders, de programmamanager stelt vast. Eerste versie per werkstroom: datum te bepalen."
        ),
      ]
    ),

    // 10
    sectie(
      "onderbouwing",
      "10 · Onderbouwing: de meta-analyse",
      "De keuzes in dit stuk zijn getoetst aan Werken aan Programma's en aan de theorie waarop de 3sides-producten leunen.",
      [
        tabel(
          ["Principe", "Wat het zegt", "Wat het hier betekent"],
          [
            ["Programmaplan en uitwerking", "Het programma bakent een inspanning op hoofdlijnen af; het team werkt haar in detail uit en maakt de planning, binnen kaders voor start, doorlooptijd en capaciteit.", "Het programmaplan en de werkstromen staan; 3sides werkt het plan van aanpak per werkstroom uit."],
            ["Groeperen naar vermogens", "Inspanningen groeperen naar vermogens; geen programmalijnen of deelprogramma's, anders gaat de samenhang verloren.", "Vier werkstromen, één programma; de programma-architect bewaakt de samenhang."],
            ["Afbakening", "Omschrijf ook wat buiten het programma valt. Niets is zo vertragend als 'we pakken dit raakvlak ook even mee'.", "Scope-scherm en trechter (deel 8)."],
            ["Waartoe-redenering", "Van inspanning via vermogen naar baat en doel: waartoe doen we dit?", "De eerste vraag van de trechter; elke activiteit herleidbaar tot een baat."],
            ["Baten meetbaar maken", "Baten zijn meetbaar, toetsbaar, motiverend en haalbaar, met een batenprofiel; de bateneigenaren operationaliseren ze. Nieuwe metingen kosten tijd en geld: vraag je af of het echt nodig is.", "14 baten-KPI's als stuurlaag; het meetkader van 3sides afslanken."],
            ["Eigenaarschap", "Eigenaarschap aanboren boven opdrachten geven; het programma neemt het eigenaarschap niet over.", "Projectgroepen met Cito-mensen; blueprint en framework blijven na 3sides van Cito."],
            ["Beeldvorming vóór besluit", "Beeldvorming gaat vooraf aan oordeelsvorming en besluitvorming; wie beslist, staat vooraf vast.", "Maandag de beeldvorming (dit stuk); besluiten waar ze horen (deel 12)."],
            ["Service blueprint", "Een klantreis per fase, met lagen voor klantacties, contactmomenten en de processen en systemen daarachter.", "De swimlanes van de 3sides-blueprint volgen deze methode."],
            ["Leidende en volgende indicatoren", "Uitkomstmaten (volgend) worden aangevuld met maten die eerder bewegen (leidend).", "Baten-KPI's zijn volgend; kernprincipe- en gedragsindicatoren kunnen leidend zijn. Het boek gebruikt die term niet: dit is onze interpretatie."],
            ["NPS", "Aanbevelingsbereidheid als maat voor klantloyaliteit.", "Uitkomst van veel factoren; daarom resultante en geen stuur-KPI."],
            ["Adoptie", "Veranderen verloopt in fasen: bewustzijn, willen, weten, kunnen, borgen (ADKAR); met urgentie en een leidende coalitie (Kotter); bij 3sides: SMILE.", "Het adoptieframework als paraplu; laag 1 'Begrijpen' is de sleutel voor deel 13."],
          ]
        ),
        lijst(
          [
            "Prevaas & Van Loon, Werken aan Programma's: H1 (programma versus project), H4 (eigenaarschap), H6 (programmaplan), H8 (baten), H10–H11 (vermogens, samenhang, focus), H12 (rollen en leveranciers), H17–H18 (sturen, afbakenen en uitwerken), H24 en H30 (beeldvorming, oordeel, besluit).",
            "Shostack (1984), Designing Services That Deliver, Harvard Business Review; Bitner, Ostrom & Morgan (2008), Service Blueprinting, California Management Review.",
            "Kaplan & Norton (1996), The Balanced Scorecard (leidende en volgende indicatoren).",
            "Reichheld (2003), The One Number You Need to Grow, Harvard Business Review.",
            "Kotter (1996), Leading Change; Hiatt (2006), ADKAR.",
            "3sides: Plan van Aanpak, Project tijdlijn, 0-meting meetinstrument, Blueprint klantreis, Adoptieframework, Data & Tech, praatplaten funnel en salesproces, Data punten ter input KPI, BV-dag-deck, statuspagina.",
            "Programma: programmaplan en DIN, KPI-sessie 24-06-2026, stappenplan analysefase 19-08-2026, organigram v4, programmaoverleg 29-09-2026, evaluatie Klant in Beeld.",
          ],
          "Bronnen"
        ),
      ]
    ),

    // 11
    sectie(
      "risicos",
      "11 · Risico's (intern)",
      "Wat we zien en hoe we het beheersen.",
      [
        tabel(
          ["Risico", "Wat we zien", "Beheersmaatregel"],
          [
            ["Het kader wordt opnieuw ontworpen", "Nieuwe lagen en termen naast het DIN: kernprincipes als 'vermogen én inspanning', 11 BV-baten, 55 KPI's", "Kapstok en begrippenlijst vaststellen; spelregel: het kader wijzigt via programmamanager en stuurgroep"],
            ["Scope creep", "Losse vragen per sector of product, losse CRM-aanpassingen", "Trechter en parkeerlijst (deel 8)"],
            ["Kennis bij individuen", "Vooral één-op-één-gesprekken en weinig gezamenlijke sessies; kennis zit bij losse personen", "Projectgroep per werkstroom; onderbouwing van keuzes op één A4"],
            ["Planning schuift ongemerkt", "Pilot van Q3 2026 (stappenplan) naar januari 2027 (tijdlijn); 0-meting nog niet gestart", "Verschuiving expliciet laten besluiten; mijlpalen in het plan van aanpak"],
            ["Meetkader te groot", "Circa 85 datapunten, veel zonder eigenaar of bron", "Focus op de 14 baten-KPI's; eigenaar per datapunt"],
            ["Te vroeg of te technisch communiceren", "Termen als baat, vermogen en inspanning zijn voor medewerkers onbegrijpelijk", "Vertaling per doelgroep (deel 13)"],
            ["Herhaling van Klant in Beeld", "Evaluatie (13 respondenten): gemiddelde cijfers rond 5,5; 10 van de 13 vinden het doel niet behaald; kritiek op concreetheid, opvolging en eigenaarschap", "Concreet plan van aanpak per werkstroom, eigenaar per resultaat, zichtbare voortgang"],
          ]
        ),
      ]
    ),

    // 12
    sectie(
      "maandag",
      "12 · Voorstel voor maandag",
      "Voorbereidingssessie maandag 11:00–12:00, intern Cito, ter voorbereiding op dinsdag.",
      [
        tabel(
          ["Tijd", "Onderwerp", "Doel"],
          [
            ["11:00–11:10", "Wat er al ligt en de kapstok (deel 2 en 3)", "Beeld: het is al één geheel"],
            ["11:10–11:20", "Botsende begrippen (deel 4)", "Eén werktaal vaststellen"],
            ["11:20–11:40", "Verschillen die een besluit vragen (deel 6)", "Oordeel vormen; voorstel voor dinsdag"],
            ["11:40–11:50", "Plan van aanpak per werkstroom: het 3sides-PvA aanvullen (deel 5 en 9)", "Afspreken wat 3sides aanvult en wanneer"],
            ["11:50–12:00", "Scope-scherm en rolverdeling voor dinsdag (deel 8)", "Wie brengt wat in op dinsdag"],
          ]
        ),
        lijst(
          [
            "Namen: één set namen voor de vier werkstromen.",
            "Begrippen: inspanning is activiteit, gedrag hoort bij het vermogen; NPS is resultante.",
            "Meetlaag: de 14 baten-KPI's als stuurlaag; kernprincipescores als kandidaat-indicator.",
            "Eigenaarschap: per werkstroom wie leidt, wie coördineert en wie eigenaar is na het programma.",
            "Planning: de verschuiving van pilot en 0-meting expliciet vaststellen.",
            "Projectgroepen: per werkstroom starten (stappenplan stap 2).",
            "Kader: de spelregel en de trechter voor nieuwe vragen.",
          ],
          "Besluitpunten"
        ),
      ]
    ),

    // 13
    sectie(
      "organisatie",
      "13 · Als laatste: hoe maken we dit begrijpelijk binnen Cito?",
      "De begrippen in dit stuk zijn werktaal voor het programmateam. Voor de organisatie vertalen we ze naar gewone taal, met de klantreis als verhaal. Dit is de laatste stap, na de besluiten hierboven.",
      [
        tabel(
          ["Werktaal", "Gewone taal", "Voorbeeldvraag"],
          [
            ["Doel", "Waar willen we naartoe?", "Waarom doen we Klant in Zicht?"],
            ["Baat", "Wat merkt de klant, wat levert het op?", "Blijven klanten langer, gebruiken ze meer, klopt onze prognose beter?"],
            ["Vermogen", "Wat moeten we kunnen?", "Kunnen we een klant in één beeld zien?"],
            ["Gedrag / kernprincipe", "Hoe werken we?", "Leg ik vast wat de klant wil, en volg ik het op?"],
            ["Inspanning", "Wat gaan we doen?", "Welke training, welk proces, welk systeem?"],
            ["Werkstroom", "Waar werken we aan?", "Klantreizen, klantdata, meten en meenemen."],
            ["0-meting", "Waar staan we nu?", "Hoeveel klanten verliezen we nu per jaar?"],
          ],
          { titel: "Vertaaltabel" }
        ),
        tabel(
          ["Doelgroep", "Wat ze moeten weten", "Vorm"],
          [
            ["MT", "Waartoe, de baten en de keuzes die het MT maakt", "Eén plaat: doel → baten → wat we doen; besluitvragen"],
            ["Sectormanagers", "Wat het hun sector oplevert en wat het van hun teams vraagt", "Sectorbaat en KPI's, de klantreis van hun sector, benodigde capaciteit"],
            ["Teams en medewerkers", "Wat er verandert in hun werk, per klantreisfase en rol", "Per rol één A4 'Mijn rol in de klantreis' (adoptieframework), voorbeelden uit de eigen praktijk"],
          ],
          { titel: "Per doelgroep" }
        ),
        lijst(
          [
            "Geen jargon: geen DIN- of 3sides-termen naar de organisatie; het boek zegt zelf 'vermijd jargon' en noemt 'gewenste effecten' als alternatief voor 'baten'.",
            "De klantreis is het verhaal: fasen die iedere medewerker herkent.",
            "Aansluiten: bij laag 1 'Begrijpen' van het adoptieframework en bij de jargonvrije lijn van de BV-dag.",
            "Werkmateriaal blijft intern: platen uit het programmateam gaan niet één-op-één de organisatie in (meeting 29-09).",
          ],
          "Uitgangspunten"
        ),
      ]
    ),
  ],
};
