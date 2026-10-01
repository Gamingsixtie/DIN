// Stap 11, tabblad "Kern van de 3sides-documenten": samenvatting van alle documenten
// in de map "3sides input", per document de kern met paginanummer of tabblad.
// Letterlijk omgezet uit 3SIDES-DOCUMENTEN-KERN.md (persoonlijke naslag van de
// programma-architect, 30-09-2026); in de app per kop en cel aanpasbaar en opgeslagen
// onder session.documenten[KERN_3SIDES_SLEUTEL].

import type { BewerkbaarDocument } from "@/lib/schemas";

export const KERN_3SIDES_SLEUTEL = "kern-3sides";

export const DEFAULT_KERN_3SIDES: BewerkbaarDocument = {
  "titel": "3sides-documenten: de kern",
  "ondertitel": "",
  "status": "Persoonlijke samenvatting voor Pim · stand 30-09-2026 · bronnen: map Desktop/3sides input (12 bestanden) en de geplakte 3sides-statuspagina",
  "secties": [
    {
      "id": "in-een-minuut",
      "titel": "In één minuut",
      "intro": "Afkortingen bij bronverwijzingen: PvA = Plan van Aanpak · TL = Project tijdlijn, tab v3 · MI = 0-meting meetinstrument · DP = Data punten ter input KPI · BP = Blueprint Klantreis (Excel) · AF = Adoptie Framework · p. = pagina · rij = rij in de Excel.",
      "blokken": [
        {
          "type": "lijst",
          "titel": "",
          "items": [
            "Wie en hoe: 3sides, een strategieadviesbureau, ondersteunt Klant in Zicht als \"3sides-as-a-service\": 232 uur per maand (juli–september) en elke dinsdag aanwezig bij Cito. Het team bestaat uit Lammert Postma, Ericka Marquez, Sasja Beerendonk en Linsey Meenken (BV-dag p. 1–2 en 10; statuspagina).",
            "Framework: Het framework is een piramide: Doelen (Waartoe) → Baten (Effect: NPS, Conversie, Omzetgroei) → Vermogens (Kunnen) → Inspanningen (Concreet Doen). Vermogens en inspanningen zijn bij 3sides vijf kernprincipes, elk met een KUNNEN- en een DOEN-kant: Klant begrijpen, Klantinformatie benutten, Eigenaarschap nemen, Data-gedreven werken en Samenwerken rond en met de klant (PvA p. 2; MI p. 11).",
            "Vier werkstromen: Succes meten, Cito Blueprint Klantreis, Technologielandschap en Adoptieframework (PvA p. 3).",
            "Wat er ligt: Er zijn een plan van aanpak, een tijdlijn (v3) en een datapunten-Excel. Concept of werk in uitvoering zijn: het meetinstrument voor de 0-meting (\"WiP\"), de Blueprint-Excel (\"Draft\"), het adoptieframework (\"WiP\") en drie praatplaten over data & tech, sales funnel en sales proces (op de statuspagina \"Draft\" of \"Work-In-Progress\").",
            "Planning: De planning loopt van juli 2026 tot en met juni 2027. Van de 24 geplande opleveringen vallen er 16 in augustus–december 2026, met onder meer het meetmodel (september), de 0-meting (oktober), het adoptieframework (oktober), de CRM-richting (november) en de blueprint-onderdelen (oktober–december). In 2027 volgen de tussenmeting (januari–februari), het toepassen in de 1e, 2e en 3e sector/fase (januari–mei) en het training- en coachingsprogramma met HR (april–juni) (TL).",
            "Nog niet gestart: 11 van de 28 activiteiten. Daaronder vallen de 0-meting zelf, het communicatieplan, de playbook-workshops, de drie sectorpilots, de ambassadeurs en de interventies in het landschap. Geen enkele activiteit staat op \"Completed\" (TL).",
            "Doelwaarden: Geen enkele KPI heeft al een doelwaarde. Overal staat \"Te bepalen — vervolgsessie, ná nulmeting Q3\" (MI p. 7)."
          ]
        }
      ]
    },
    {
      "id": "hoe-de-documenten-samenhangen",
      "titel": "Hoe de documenten samenhangen",
      "intro": "",
      "blokken": [
        {
          "type": "tabel",
          "titel": "",
          "kolommen": [
            "Document",
            "Werkstroom 3sides (bij ons)",
            "Soort stuk"
          ],
          "rijen": [
            [
              "Plan van Aanpak (PDF, 13 p.)",
              "alle vier",
              "plan, met statusdia's"
            ],
            [
              "Project tijdlijn (Excel, tab v3)",
              "alle vier",
              "planning en status"
            ],
            [
              "Statuspagina \"3sides-as-a-service\" (tekst)",
              "alle vier en programmabreed",
              "voortgangsrapportage"
            ],
            [
              "0-meting meetinstrument – WiP (PDF, 16 p.)",
              "Succes meten (0-meting)",
              "meetinstrument (WiP)"
            ],
            [
              "Data punten ter input KPI (Excel, 8 tabs)",
              "Succes meten (0-meting)",
              "werkdocument"
            ],
            [
              "Blueprint Klantreis – Draft (Excel, 8 tabs)",
              "Cito Blueprint Klantreis (Klantreizen)",
              "werkdocument"
            ],
            [
              "Cito Data & Tech (PDF, 1 plaat)",
              "Technologielandschap (Centrale datavoorziening klantcontact)",
              "praatplaat (WiP)"
            ],
            [
              "Praatplaat Marketing & Sales funnel (PDF, 1 plaat)",
              "Technologielandschap",
              "praatplaat (draft)"
            ],
            [
              "Praatplaat Marketing & Sales proces (PDF, 1 plaat)",
              "Technologielandschap",
              "praatplaat (draft)"
            ],
            [
              "Cito DIN Adoptie Framework – WiP (PDF, 15 p.)",
              "Adoptieframework",
              "presentatie/plan (WiP)"
            ],
            [
              "BV-dag-229-final (PDF, 10 p.)",
              "programmabreed",
              "presentatie"
            ],
            [
              "Evaluatie Klant in Beeld (Excel)",
              "programmabreed (vorig traject)",
              "enquête-uitkomsten"
            ]
          ],
          "legenda": ""
        },
        {
          "type": "tekst",
          "tekst": "Indeling volgens de statuspagina, die de bestanden per stroom ophangt. De funnel staat in de tijdlijn ook onder Technologielandschap (TL rij 7)."
        },
        {
          "type": "lijst",
          "titel": "",
          "items": [
            "Rode draad: de kernprincipes met KUNNEN/DOEN: Ze komen terug in PvA p. 2, MI p. 11–12, BP tab \"Kern Principes\", DP tab \"Kernprincipes\" en AF p. 15.",
            "Blueprint → Succes meten: Succes meten sluit voor de KPI's per klantreisfase aan op de blueprint-matrix (PvA p. 9: \"link met stroom Blueprint klantreis\"; MI p. 10 en p. 15).",
            "Datapunten → 0-meting: De datapunten-Excel is de input voor de 0-meting (MI p. 14 toont dezelfde lijst).",
            "Blueprint → Adoptie: Adoptie bouwt op de blueprint: \"Iedereen kent de 11 hoofdstappen van de klantreis\" en de 5 kernprincipes en G.O.L.D. (AF p. 15)."
          ]
        }
      ]
    },
    {
      "id": "doc-1",
      "titel": "1. Plan van Aanpak (PDF, 13 p.)",
      "intro": "",
      "blokken": [
        {
          "type": "tekst",
          "tekst": "Wat. Cito-deck \"Programma – Plan van aanpak\" met het framework, de werkstromen, de status en per stroom doel, resultaten, scope, aanpak en planning. Een datum staat niet in het document."
        },
        {
          "type": "lijst",
          "titel": "Kern",
          "items": [
            "Framework \"Van baten naar vermogens en inspanningen\" (p. 2): de piramide met NPS, Conversie en Omzetgroei als baten en de vijf kernprincipes naast Vermogens/Inspanningen.",
            "Vier werkstromen (p. 3), \"ieder met een eigen doel maar die onlosmakelijk met elkaar verbonden zijn\".",
            "Status (p. 4–5): een schermafdruk van de tijdlijn (juli–december zichtbaar) en van het Jira-bord \"Cito\". Dat bord telt 19 work items en epics voor Technologielandschap, Cito Blueprint Klantreis, Succes meten, Adoptieframework en Quick wins.",
            "Succes meten, scope (p. 8): \"Gedefinieerde Doelen en Baten vanuit het programma zijn leidend.\""
          ]
        },
        {
          "type": "tabel",
          "titel": "",
          "kolommen": [
            "Stroom",
            "Kern van doel en resultaten",
            "Planning"
          ],
          "rijen": [
            [
              "Technologielandschap ([[PvA p. 6–7]])",
              "Het groeiende aantal systemen in kaart brengen en per systeem adviseren: behouden, vervangen, samenvoegen of uitfaseren. Levert een overzicht met eigenaren en kosten, een doelbeeld met ontwerpprincipes, een roadmap met kostenindicatie en een werkwijze om het landschap actueel te houden. Scope: alle applicaties, platformen, data en integraties die de klantreis raken.",
              "Q3 inventarisatie & analyse · Q3/Q4 doelbeeld en keuzes · Q4 roadmap en overdracht (zonder jaartal)"
            ],
            [
              "Succes meten ([[PvA p. 8–9]])",
              "In lagen meten: doel → baten (KPI's per sector en BV) → vermogens & inspanningen (KPI's per klantreisfase, gekoppeld aan proces en gedrag). Levert het meetmodel, een verzameling datapunten, een 0-meting op een zeer uitgebreide set KPI's en een tussenmeting.",
              "Q3 2026 inventarisatie, analyse, ontwerp · Q3/Q4 2026 0-meting gerealiseerd · Q1 2027 tussenmeting"
            ],
            [
              "Blueprint Klantreis ([[PvA p. 10–11]])",
              "De sectorklantreizen uit KiB samenvoegen tot één integrale Cito BV-klantreis, gedragen door product- en sectormanagers en bedoeld als werkmodel per sector. De matrix koppelt fasen, klantdoelen, hoofdstappen, kernwaarden, kernprincipes, processen, systeemgebruik, gedrag per rol en KPI's.",
              "Q3 2026 inventarisatie, analyse & ontwerp · Q4 2026 gevalideerd en toegepast binnen eerste pilotgroep"
            ],
            [
              "Adoptieframework ([[PvA p. 12–13]])",
              "Gedragsverandering: \"De klantreis is organisatiebreed, maar gedrag moet rolspecifiek worden.\" Levert het SMILE-framework, Customer Journey Playbook-workshops met een 1e pilot, per rol 1 A4 \"Mijn rol in de klantreis\", een communicatieplan, een kern-adoptieteam en Customer Journey Champions per afdeling.",
              "Q3 2026 inventarisatie, analyse, ontwerp · Q4 2026 Customer Journey Playbooks · Q1 2027 pilots sectoren"
            ]
          ],
          "legenda": ""
        },
        {
          "type": "lijst",
          "titel": "Open / onaf",
          "items": [
            "De planning van Technologielandschap heeft geen jaartal (p. 7). In de tijdlijn staat geen activiteit \"roadmap\".",
            "Adoptieframework heeft als enige stroom geen scope-onderdeel; de nummering springt van 3 naar 5 (p. 12–13).",
            "De statusdia is afgekapt na december (p. 4). De Jira-dia toont 10 van de 19 items (p. 5)."
          ]
        }
      ]
    },
    {
      "id": "doc-2",
      "titel": "2. Project tijdlijn (Excel, tab v3)",
      "intro": "",
      "blokken": [
        {
          "type": "tekst",
          "tekst": "Wat. Planning per stroom van juli 2026 (kolom E) tot en met juni 2027 (kolom P). De markeringen zijn Start, loopt en Delivery. Kolom C geeft de voortgang, kolom D de status (+, +/-, -)."
        },
        {
          "type": "lijst",
          "titel": "Kern",
          "items": [
            "28 activiteiten: 7 Technologielandschap, 7 Blueprint, 4 Succes meten en 10 Adoptieframework.",
            "Voortgang: 17 \"In progress\", 11 \"Not started\" en 0 \"Completed\".",
            "Status: 8 keer \"+\", 7 keer \"+/-\" en 2 keer \"-\" (Data ophalen en 0-meting); 11 zonder status.",
            "Opleveringen: 24 met een Delivery-markering, waarvan 16 in augustus–december 2026. Vier activiteiten hebben geen oplevering."
          ]
        },
        {
          "type": "tekst",
          "tekst": "Leeg in de Excel = \"—\". Namen van activiteiten staan er letterlijk (ook de typefouten)."
        },
        {
          "type": "tabel",
          "titel": "Stroom – Technologielandschap",
          "kolommen": [
            "Rij",
            "Activiteit",
            "Start",
            "Oplevering",
            "Voortgang",
            "Status"
          ],
          "rijen": [
            [
              "4",
              "Data & Apps analyse",
              "jul 2026",
              "sep 2026",
              "In progress",
              "+/-"
            ],
            [
              "5",
              "CRM Richting bepalen",
              "aug 2026",
              "nov 2026",
              "In progress",
              "+/-"
            ],
            [
              "6",
              "Stakeholder engagement",
              "jul 2026",
              "mrt 2027",
              "In progress",
              "+"
            ],
            [
              "7",
              "Marketing & Sales Process / Funnel",
              "sep 2026",
              "okt 2026",
              "In progress",
              "+"
            ],
            [
              "8",
              "Integratie approach",
              "jul 2026",
              "nov 2026 (\"Delivery\" zonder vlag)",
              "In progress",
              "+/-"
            ],
            [
              "9",
              "Visie & Consequentie",
              "jul 2026",
              "sep 2026",
              "In progress",
              "+"
            ],
            [
              "10",
              "Interventies",
              "okt 2026",
              "— (loopt t/m jun 2027)",
              "Not started",
              "—"
            ]
          ],
          "legenda": ""
        },
        {
          "type": "tabel",
          "titel": "Stroom – Cito Blueprint Klantreis",
          "kolommen": [
            "Rij",
            "Activiteit",
            "Start",
            "Oplevering",
            "Voortgang",
            "Status"
          ],
          "rijen": [
            [
              "12",
              "Consollideren journey workshop Klant in Beeld",
              "jul 2026",
              "aug 2026",
              "In progress",
              "+/-"
            ],
            [
              "13",
              "Blueprint klantreis Fasen, Hoofdstappen",
              "aug 2026",
              "okt 2026",
              "In progress",
              "+"
            ],
            [
              "14",
              "Blueprint klantreis Kernwaarden & Kernprincipes naar Handelen",
              "sep 2026",
              "nov 2026",
              "In progress",
              "+"
            ],
            [
              "15",
              "Blueprint klantreis Proces & CRM gebruik + KPIs",
              "sep 2026",
              "dec 2026",
              "In progress",
              "+"
            ],
            [
              "16",
              "Rollen, Gedrag & Competenties",
              "okt 2026",
              "dec 2026",
              "In progress",
              "+/-"
            ],
            [
              "17",
              "Stakeholder engagement en workshops",
              "aug 2026",
              "dec 2026",
              "In progress",
              "+"
            ],
            [
              "18",
              "Journey-vertaling naar CRM-input en funnelprocessen",
              "— (loopt okt 2026)",
              "nov 2026",
              "Not started",
              "—"
            ]
          ],
          "legenda": ""
        },
        {
          "type": "tabel",
          "titel": "Stroom – Succes meten",
          "kolommen": [
            "Rij",
            "Activiteit",
            "Start",
            "Oplevering",
            "Voortgang",
            "Status"
          ],
          "rijen": [
            [
              "20",
              "Ontwikkelen meetmodel: doelen, baten (KPIs), vermogens & inspanningen",
              "jul 2026",
              "sep 2026",
              "In progress",
              "+/-"
            ],
            [
              "21",
              "Data ophalen data voor meetmodel",
              "sep 2026",
              "okt 2026",
              "In progress",
              "-"
            ],
            [
              "22",
              "0-meting",
              "—",
              "okt 2026",
              "Not started",
              "-"
            ],
            [
              "23",
              "Tussen meting",
              "jan 2027",
              "feb 2027",
              "In progress",
              "—"
            ]
          ],
          "legenda": ""
        },
        {
          "type": "tabel",
          "titel": "Stroom – Adoptieframework",
          "kolommen": [
            "Rij",
            "Activiteit",
            "Start",
            "Oplevering",
            "Voortgang",
            "Status"
          ],
          "rijen": [
            [
              "25",
              "Adoptieframework opstellen",
              "jul 2026",
              "okt 2026",
              "In progress",
              "+"
            ],
            [
              "26",
              "Communicatieplan",
              "okt 2026",
              "— (loopt nov 2026)",
              "Not started",
              "—"
            ],
            [
              "27",
              "Customer Journey Playbook workshops",
              "dec 2026",
              "mei 2027",
              "Not started",
              "—"
            ],
            [
              "28",
              "Toepassen in 1e sector/fase waaruit eerste gedragsdata ontstaat",
              "jan 2027",
              "feb 2027",
              "Not started",
              "—"
            ],
            [
              "29",
              "Toepasssen 2e sector/fase",
              "feb 2027",
              "mrt 2027",
              "Not started",
              "—"
            ],
            [
              "30",
              "Toepasssen 3e sector/fase",
              "apr 2027",
              "mei 2027",
              "Not started",
              "—"
            ],
            [
              "31",
              "Training- en coachingsprogramma live (samen met HR)",
              "apr 2027",
              "jun 2027",
              "Not started",
              "—"
            ],
            [
              "32",
              "Feedback loops",
              "jan 2027",
              "mei 2027",
              "Not started",
              "—"
            ],
            [
              "33",
              "Toetsen Adoptieframework",
              "okt 2026",
              "— (loopt t/m jun 2027)",
              "In progress",
              "+/-"
            ],
            [
              "34",
              "Ambassadeurs Adoptie Team",
              "okt 2026",
              "— (loopt t/m jun 2027)",
              "Not started",
              "—"
            ]
          ],
          "legenda": ""
        },
        {
          "type": "lijst",
          "titel": "Open / onaf",
          "items": [
            "\"Tussen meting\" staat op \"In progress\" terwijl die pas in januari 2027 start (rij 23).",
            "De 0-meting en de journey-vertaling hebben geen startmarkering (rij 22 en 18).",
            "Vier activiteiten hebben geen oplevering (rij 10, 26, 33, 34).",
            "Eigenaren per activiteit staan niet in het document."
          ]
        }
      ]
    },
    {
      "id": "doc-3",
      "titel": "3. 0-meting meetinstrument – WiP (PDF, 16 p.)",
      "intro": "",
      "blokken": [
        {
          "type": "tekst",
          "tekst": "Wat. 3sides-deck voor Succes meten, met het meetmodel, de KPI's per laag en de databronnen voor de 0-meting. Let op: de titeldia zegt \"0-meting Adoptie Framework – Programa Klant in zicht\" (p. 1), in dezelfde opmaak als het adoptieframework (document 6); het is toch het meetinstrument. Links zonder paginanummer openen daarom op de tweede pagina. PDF-metadata: auteur Linsey Meenken, 28-09-2026."
        },
        {
          "type": "lijst",
          "titel": "Kern",
          "items": [
            "Keten van strategie naar uitvoering (p. 2). Drie kolommen: Integraal klantbeeld + outside-in werken (fundament): Training & ontwikkeling, Klantgericht commercieel vermogen, Uniforme klantprocessen & eenduidige funnel en Cultuur van eigenaarschap. · Verbeteren & innoveren met klantinzichten en data: Co-creatie met klanten en Data & CRM. · Structurele klantrelevantie en tevredenheid: Meetbare hoge klantwaarde.",
            "Uitgelicht doel (p. 4): \"Outside-in werken vanuit een integraal klantbeeld.\"",
            "Meetmodel (p. 5): dezelfde piramide als PvA p. 2, maar met de omgekeerde titel \"Vanuit Vermogens & Inspanningen naar Baten & Doelen\".",
            "Informatiebronnen voor de 0-meting (p. 13): Kwalitatief, Ja/Nee, Data en NPS.",
            "Data (p. 14): de datapuntenlijst in 7 categorieën. Geel gemarkeerd = \"KPIs gedefinieerd in BATEN DIN-Programma\" (zie document 4)."
          ]
        },
        {
          "type": "tabel",
          "titel": "Het meetmodel",
          "kolommen": [
            "Laag",
            "Label bij 3sides",
            "Wat eronder valt",
            "Waar"
          ],
          "rijen": [
            [
              "Doelen",
              "(Waartoe)",
              "de drie programmadoelen; \"Outside-in werken vanuit een integraal klantbeeld\" uitgelicht",
              "p. 2, 4, 5"
            ],
            [
              "Baten",
              "(Effect)",
              "NPS, Conversie, Omzetgroei; 4 BV-KPI's; per sector een baat met KPI's; product specifieke KPI's",
              "p. 5–9"
            ],
            [
              "Vermogens & Inspanningen",
              "(Kunnen) en (Concreet Doen)",
              "5 kernprincipes met KUNNEN/DOEN; score 1–10 per kernprincipe; kernprincipe-KPI's; klantreisfase-KPI's",
              "p. 5, 10–12"
            ]
          ],
          "legenda": ""
        },
        {
          "type": "tabel",
          "titel": "Vermogens, baten en KPI's per sector (p. 6; kolomkoppen \"Vermogens (Waartoe)\", \"Baten (Effect)\", \"KPIs (Effect)\")",
          "kolommen": [
            "Sector",
            "Vermogen",
            "Baat",
            "KPI's"
          ],
          "rijen": [
            [
              "Zakelijk",
              "Klantgerichte commerciële slagkracht",
              "Sterkere klantgerichtheid bij opdrachtgevers en kandidaten",
              "NPS bij opdrachtgevers en kandidaten · conversieratio lead → opdracht (%) · omzetgroei uit bestaande en nieuwe klanten (€)"
            ],
            [
              "PO",
              "Strategisch klantpartnerschap",
              "Intensiever partnership",
              "NPS onder leerkrachten en schoolbesturen, gecombineerd met het aandeel klantgesprekken dat als samenwerkings- of beleidsgerichte dialoog wordt gekwalificeerd"
            ],
            [
              "VO",
              "Klantfasegericht commercieel relatievermogen",
              "Hogere voorspelbaarheid commerciële begroting",
              "afwijking tussen voorspelde en gerealiseerde commerciële begroting Year 1 (%)"
            ]
          ],
          "legenda": ""
        },
        {
          "type": "tabel",
          "titel": "Sector-KPI's uitgewerkt (p. 7; dezelfde tabel staat in DP tab \"Programma KPIs\"). De startwaarde is overal \"Nulmeting Q3\". De doelwaarde is overal \"Te bepalen — vervolgsessie, ná nulmeting Q3\". Eisen per doelwaarde: een concreet getal mét meetmoment, meetbaar, toetsbaar, motiverend, haalbaar t.o.v. de startwaarde en het roept het gewenste gedrag op.",
          "kolommen": [
            "Sector",
            "KPI",
            "Label in de tabel",
            "Naam erbij*"
          ],
          "rijen": [
            [
              "Zakelijk",
              "Funnel-conversieratio per stap",
              "BV KPI",
              "—"
            ],
            [
              "Zakelijk",
              "Offertes: aantal + % → opdracht",
              "\"Is dit niet al in de vorige funnel KPI?\"",
              "—"
            ],
            [
              "Zakelijk",
              "Conversie uit bezoeken",
              "Kernprincipe KPI",
              "—"
            ],
            [
              "Zakelijk",
              "Serviceniveau & reactietijden",
              "Kernprincipe KPI",
              "Famke"
            ],
            [
              "Zakelijk",
              "Churn / klantbehoud",
              "BV KPI",
              "Ilse"
            ],
            [
              "PO",
              "Groei productgebruik (cross-/up-sell)",
              "Product specifieke KPI",
              "Ilse"
            ],
            [
              "PO",
              "Gebruiksintensiteit volledige lijn (Toets + LVS + DST)",
              "Product specifieke KPI",
              "Ilse"
            ],
            [
              "PO",
              "Raamcontracten grote besturen",
              "Product specifieke KPI",
              "Ilse"
            ],
            [
              "PO",
              "Ontwikkeldeadlines & beloftes gehaald",
              "Product specifieke KPI of Kernprincipe",
              "—"
            ],
            [
              "PO",
              "Churn / klantbehoud",
              "BV KPI",
              "Ilse"
            ],
            [
              "VO",
              "Prognose-nauwkeurigheid",
              "BV KPI",
              "—"
            ],
            [
              "VO",
              "% meerjarige (3-jr) licenties",
              "Product specifieke KPI",
              "Ilse"
            ],
            [
              "VO",
              "Inzicht in toetskeuzemomenten",
              "Product specifieke KPI of Kernprincipe",
              "—"
            ],
            [
              "VO",
              "Churn / klantbehoud",
              "BV KPI",
              "Ilse"
            ]
          ],
          "legenda": ""
        },
        {
          "type": "tekst",
          "tekst": "*Kolom zonder kop; welke rol de genoemde persoon heeft, staat niet in het document."
        },
        {
          "type": "tabel",
          "titel": "BV-KPI's organisatiebreed (p. 8, \"4 Baten (Effect) KPIs organisatiebreed\"; waarde totaal en per sector)",
          "kolommen": [
            "BV-KPI",
            "Wat"
          ],
          "rijen": [
            [
              "NPS",
              "score afgelopen jaar"
            ],
            [
              "Conversie",
              "succes-% per overgang in de sales funnel"
            ],
            [
              "Omzet",
              "omzetgroei t.o.v. vorig jaar · ARR cross-sell · ARR upsell · prognose-nauwkeurigheid (ARR-afwijking prognose en gerealiseerde omzet)"
            ],
            [
              "Retentie/Churn",
              "% klanten churn/retentie · ratio · ARR churn/retentie"
            ]
          ],
          "legenda": ""
        },
        {
          "type": "lijst",
          "titel": "Product specifieke KPI's (p. 9)",
          "items": [
            "Zakelijk: leeg.",
            "PO: upsell Basis > Compleet en cross-sell van extra trainingen en diensten · gebruiksintensiteit volledige lijn (% scholen met Toets + LVS + DST) · aantal raamcontracten met scholengroepen (grote besturen) en % van het totaal aantal contracten.",
            "VO: % meerjarige licenties (1-, 2- en 3-jarig, en % 1-jarig omgezet naar 3-jarig) · inzicht in toetskeuzemomenten · markt-/klantreisdata op productniveau, als voeding voor prognose en propositieontwikkeling."
          ]
        },
        {
          "type": "tabel",
          "titel": "Klantreisfase-KPI's (p. 10): één per fase.",
          "kolommen": [
            "Fase",
            "KPI"
          ],
          "rijen": [
            [
              "Bewustwording",
              "Merkbekendheid"
            ],
            [
              "Oriëntatie",
              "Lead → Opportunity-conversie"
            ],
            [
              "Beslissen",
              "Win Rate"
            ],
            [
              "Bestellen",
              "First Time Right"
            ],
            [
              "Onboarding",
              "Time To Value"
            ],
            [
              "Gebruik",
              "Product Adoptie"
            ],
            [
              "Rapportage",
              "Waargenomen Klantwaarde"
            ],
            [
              "Evaluatie",
              "NPS"
            ],
            [
              "Renewal",
              "Renewal Rate"
            ]
          ],
          "legenda": ""
        },
        {
          "type": "tabel",
          "titel": "De vijf kernprincipes (p. 11; letterlijk ook in BP tab \"Kern Principes\")",
          "kolommen": [
            "Kernprincipe",
            "KUNNEN",
            "DOEN"
          ],
          "rijen": [
            [
              "Klant begrijpen",
              "Cito kan vanuit een integraal klantbeeld doorgronden wat klanten nodig hebben, willen bereiken en ervaren.",
              "Medewerkers luisteren actief, stellen verdiepende vragen, brengen de klantreis en context in kaart en toetsen regelmatig of aannames nog kloppen."
            ],
            [
              "Klantinformatie benutten",
              "Cito kan beschikbare klantdata en signalen vertalen naar bruikbare inzichten.",
              "Medewerkers leggen informatie consequent vast, combineren bronnen, delen inzichten en gebruiken deze zichtbaar bij prioritering, klantcontact en verbetering van proposities en dienstverlening."
            ],
            [
              "Eigenaarschap nemen",
              "Medewerkers voelen zich verantwoordelijk voor het volledige klantresultaat, ook wanneer meerdere teams betrokken zijn.",
              "Medewerkers maken duidelijk wie verantwoordelijk is, en regelen handovers, komen afspraken na, volgen vragen actief op en zorgen dat problemen worden opgelost of tijdig worden geëscaleerd."
            ],
            [
              "Data-gedreven werken",
              "Cito kan besluiten baseren op betrouwbare gegevens en resultaten meetbaar maken.",
              "Teams bepalen vooraf relevante KPI's, volgen bijvoorbeeld NPS, conversie en omzetgroei, toetsen keuzes aan data en sturen bij wanneer resultaten achterblijven."
            ],
            [
              "Samenwerken rond en met de klant",
              "Cito kan interne expertise verbinden en klanten als actieve partner betrekken.",
              "Teams werken vanuit gedeelde klantdoelen, dragen informatie zorgvuldig over, betrekken klanten vroegtijdig bij oplossingen en leren gezamenlijk van feedback en resultaten."
            ]
          ],
          "legenda": ""
        },
        {
          "type": "lijst",
          "titel": "Score 1–10 (p. 12): \"Meting Vermogens & Inspanningen — Elk onderwerp krijgt een score\", op een schaal van 1 tot 10 per kernprincipe.",
          "items": [
            "Op de dia staan pijltjes zonder getal. Klant begrijpen staat het verst naar rechts; Data-gedreven werken en Samenwerken staan het verst naar links.",
            "Of dit al meetwaarden zijn of een voorbeeld, staat niet in het document. Volgens de tijdlijn is de 0-meting nog niet gestart."
          ]
        },
        {
          "type": "lijst",
          "titel": "\"Dashboard\" Succes meten (p. 16), vier onderdelen:",
          "items": [
            "1. organisatiebrede KPI's bij Baten (Effect);",
            "2. KPI's binnen de klantreis-blueprint; sector- en productspecifieke KPI's \"volgen na pilots en workshops\";",
            "3. KPI's bij de kernprincipes;",
            "4. scores per kernprincipe."
          ]
        },
        {
          "type": "tekst",
          "tekst": "Namen: Famke en Ilse (MI p. 7); Ilse, Kathelijn, Jama, Rick, \"Marketeers\" en \"product managers\" bij de datapunten (MI p. 14)."
        },
        {
          "type": "lijst",
          "titel": "Open / onaf",
          "items": [
            "Er zijn nog geen gemeten startwaarden (overal \"Nulmeting Q3\") en alle doelwaarden zijn \"te bepalen\" (p. 7).",
            "De product specifieke KPI's voor Zakelijk zijn leeg (p. 9).",
            "Er staat een open vraag in de tabel: \"Is dit niet al in de vorige funnel KPI?\". Bij twee KPI's is het label nog niet gekozen (p. 7).",
            "Hoe de score 1–10 wordt bepaald, staat niet in het document.",
            "p. 3 (\"0-meting\") en p. 15 (schermafdruk van de blueprint-matrix) hebben geen toelichting."
          ]
        }
      ]
    },
    {
      "id": "doc-4",
      "titel": "4. Data punten ter input KPI (Excel, 8 tabs)",
      "intro": "",
      "blokken": [
        {
          "type": "tekst",
          "tekst": "Wat. Het werkdocument achter de 0-meting: welke data nodig is, met per datapunt een eenheid en soms een naam."
        },
        {
          "type": "lijst",
          "titel": "Kern (per tab)",
          "items": [
            "Data punten: 85 datapunten in 9 blokken: Retentie 6, Upsell/Cross-sell 7, Omzet/Conversie 21, school/organisatie 19, contactpersoon 11, klantreis productniveau 6, CRM-gebruik binnen Cito 8, Marketing 3 en Support 4. Eenheden: %, €, #, duur, Ja/Nee of lijst. · 21 punten zijn geel gemarkeerd als \"KPIs gedefinieerd in BATEN DIN-Programma\". · De gele punten gaan over NPS, churn, renewal, licentieperiode, twee keer ARR up-/cross-sell, upsell LIB Basis → Compleet, cross-sell LIB, de volledige lijn PO, vier conversieratio's plus de winrate, twee keer raamcontracten, twee keer licentieduur, forecast-nauwkeurigheid, nagekomen feature-beloften en de reactietijd op klantvragen.",
            "Programma KPIs: de 14 sector-KPI's van MI p. 7.",
            "Kernprincipes: per principe KUNNEN, DOEN, 4–6 \"Vragen die we willen beantwoorden\" en \"KPIs die hierbij horen\". Aantal KPI's: Klant begrijpen 9, Klantinformatie benutten 17, Eigenaarschap nemen 12, Data-gedreven werken 19 en Samenwerken rond en met de klant 0.",
            "Klantreis KPIs: de 9 fase-KPI's van MI p. 10.",
            "Proces KPIs (6):"
          ]
        },
        {
          "type": "tekst",
          "tekst": "| Onderwerp | KPI | |---|---| | CRM kwaliteit | CRM compleetheid | | Klantinzicht | % klantdoelen geregistreerd | | Samenwerking | % overdrachten volledig | | Kennisdeling | gebruik Microspace | | Eigenaarschap | opvolging open acties | | Ondersteuning | First Contact Resolution |"
        },
        {
          "type": "lijst",
          "titel": "",
          "items": [
            "Gedrags KPIs (5):"
          ]
        },
        {
          "type": "tekst",
          "tekst": "| Gedrag | KPI | |---|---| | Klant begrijpen | klantdoelen vastgelegd | | Klantinformatie benutten | CRM-gebruik | | Eigenaarschap nemen | open acties afgesloten | | Data-gedreven werken | forecastkwaliteit | | Samenwerken rond klant | interne overdrachten compleet |"
        },
        {
          "type": "lijst",
          "titel": "",
          "items": [
            "Uitleg: Drie ketens: First Time Right + Customer Effort + supportervaring + rapportagebeleving = NPS · betere onboarding → meer gebruik → meer waarde → hogere tevredenheid → hoger renewal-percentage → meer omzet · betere CRM-data → beter klantbeeld → betere voorspellingen → hogere forecast accuracy.",
            "Jaarverslag Cijfers: cijfers uit \"jaarverslaglegging-stichting-cito-2025.pdf\" (zie hieronder)."
          ]
        },
        {
          "type": "lijst",
          "titel": "Getallen en namen",
          "items": [
            "Jaarverslag (tab Jaarverslag Cijfers):"
          ]
        },
        {
          "type": "tekst",
          "tekst": "| Post | 2024 | 2025 | |---|---|---| | Omzet | € 71,8 mln | € 79,2 mln | | waarvan Wet SLOA | € 39,8 mln | € 43,9 mln | | waarvan marktactiviteiten | € 32,0 mln | € 35,4 mln | | producten | € 22,0 mln | € 24,4 mln | | dienstverlening | € 49,8 mln | € 54,8 mln | | Resultaat na belastingen | € 3,6 mln | € 2,7 mln |"
        },
        {
          "type": "tekst",
          "tekst": "De verslechtering van € 0,9 mln is verdeeld als Stichting −€ 0,3 mln en BV −€ 0,6 mln."
        },
        {
          "type": "lijst",
          "titel": "",
          "items": [
            "Tab Uitleg, \"Meet bijvoorbeeld\": contactpersonen vastgelegd 95%, besluitvormers 90%, klantdoelen 90%, kansen voorzien van volgende stap 100%. Dit is een voorbeeld, geen afgesproken norm.",
            "Namen in kolom B: Ilse: churn, renewal en licentieperiode · Kathelijn: MQL- en webinarconversie en klantbezoek → call to action · Jama: de blokken school- en contactpersoondata · Kathelijn en Rick: Umbraco-formulieren · \"Marketeers\": NPS · \"product managers\": feature-beloften · \"Jaarcijfers\": als bron voor omzetgroei."
          ]
        },
        {
          "type": "lijst",
          "titel": "Open / onaf",
          "items": [
            "Er zijn nog geen waarden ingevuld; alleen definities en eenheden.",
            "Samenwerken rond en met de klant heeft geen KPI's in tab Kernprincipes.",
            "Bij \"funnelstatus bij bestaande klanten\" staat \"?\", bij \"inzicht productgebruik per klant\" staat \"Nee\", en bij de standaard conversiefunnel staat \"Welke definities?\"."
          ]
        }
      ]
    },
    {
      "id": "doc-5",
      "titel": "5. Blueprint Klantreis – Draft (Excel, 8 tabs)",
      "intro": "",
      "blokken": [
        {
          "type": "tekst",
          "tekst": "Wat. De integrale Cito BV-klantreis als matrix. Per (sub)fase staan erin: klantdoel, hoofdstap, kernwaarden, kernprincipes, handelen, procesafspraken per rol, systeemgebruik en KPI's."
        },
        {
          "type": "lijst",
          "titel": "Kern",
          "items": [
            "Tab \"Klantreis fasen\": 6 fasen, 11 subfasen en 11 hoofdstappen, met per fase een klantdoel en klantquotes (bijvoorbeeld \"Ik wil met vertrouwen een keuze maken.\").",
            "Hoofdlijn (tab Klantreis fasen, rij 24): \"de nadruk verschuift van begrijpen vóór de aankoop, naar eigenaarschap tijdens aankoop en onboarding, vervolgens naar data in gebruik en ten slotte naar samen leren en verbeteren in evaluatie\". Alle vijf principes blijven per fase; de rangorde geeft het relatieve gewicht aan.",
            "\"Handelen\": per subfase vijf we-zinnen plus één zin per G.O.L.D.-waarde. Voorbeeld: \"We laten onze expertise zien zonder direct te sturen op verkoop.\"",
            "Procesafspraken per rol: Marketing, Product Management, Accountmanager, Binnendienst, Procesondersteuning, Implementatie/Trainer en Support.",
            "Systeemgebruik: Marketing Automation, CRM, Webshop, Ticketing/Supportsysteem, Projectomgeving, Kennisplatform/Microspace/ELO, Rapportageplatform en NPS-systeem.",
            "Tab \"KPI meetkader\": 55 KPI's = 11 subfasen × 5 lagen (Effect, Klantreis, Gedrag & proces, Systeem & data, BV-baat). · Per KPI staan er een meetdefinitie, het primaire kernprincipe, het gewenste gedrag, systeem/bron, de frequentie en de koppeling aan een BV-baat. · Kop van de tab: \"Voorstel: voer eerst een nulmeting uit en stel daarna per sector/product een doelwaarde vast.\"",
            "Overige tabs: \"GOLD – Kernwaarden\" en \"Rollen\" (zie hieronder) · \"Kern Principes\": KUNNEN/DOEN, gelijk aan MI p. 11 · \"Gedragsclusters – Gewenst gedrag\": per principe 4–6 uitspraken onder \"Dit betekent voor medewerkers\" · \"KPIs\": zes KPI's rond bestellen en onboarding, deels uitgewerkt met voorbeelden: Time-to-Onboard, First Time Right, Activatiegraad, Customer Effort Score, Readiness Score en Onboarding Completion Rate."
          ]
        },
        {
          "type": "tabel",
          "titel": "",
          "kolommen": [
            "Fase",
            "Subfasen",
            "Klantdoel",
            "Kernprincipe 1 · 2",
            "Dominante G.O.L.D."
          ],
          "rijen": [
            [
              "Bewustwording",
              "Behoefte",
              "Een oplossing (product/dienst) nodig",
              "Klant begrijpen · Klantinformatie benutten",
              "Gedreven, Deskundig"
            ],
            [
              "Overweging/Oriëntatie",
              "Verkennen",
              "Begrijpen welke oplossingen beschikbaar zijn",
              "Klant begrijpen · Klantinformatie benutten",
              "Gedreven, Ondersteunend, Deskundig"
            ],
            [
              "Aankoop",
              "Beslissen, Bestellen",
              "Vertrouwen krijgen in de oplossing",
              "Eigenaarschap nemen · Klant begrijpen",
              "Ondersteunend, Deskundig"
            ],
            [
              "Onboarding",
              "Activeren & Inrichten, Voorbereiding, Trainen & Informeren",
              "Soepele ingebruikname",
              "Eigenaarschap nemen · Samenwerken",
              "Gedreven, Ondersteunend, Deskundig"
            ],
            [
              "Gebruik",
              "Afname, Rapportage",
              "Waarde realiseren door leren zichtbaar te maken",
              "Data-gedreven werken · Eigenaarschap nemen",
              "Gedreven, Ondersteunend, Deskundig"
            ],
            [
              "Evaluatie",
              "Klanttevredenheid, Renewal",
              "Samen verbeteren",
              "Samenwerken · Klantinformatie benutten",
              "Gedreven, Lerend, Deskundig"
            ]
          ],
          "legenda": ""
        },
        {
          "type": "tekst",
          "tekst": "De 11 hoofdstappen zijn:"
        },
        {
          "type": "lijst",
          "titel": "",
          "items": [
            "1. Vertrouwen creëren",
            "2. Behoefte begrijpen",
            "3. Passend adviseren",
            "4. Afspraken borgen",
            "5. Gereed maken voor gebruik",
            "6. Gericht begeleiden",
            "7. Bekwaam maken",
            "8. Betrouwbare uitvoering ondersteunen",
            "9. Inzicht bieden",
            "10. Toekomstgericht ontwikkelen",
            "11. Toekomstig succes mogelijk maken"
          ]
        },
        {
          "type": "lijst",
          "titel": "Getallen en namen",
          "items": [
            "KPI-meetkader: frequentie: 26 KPI's maandelijks, 11 wekelijks, 10 per kwartaal, de rest per cyclus, cohort of meting · CRM is (mede)bron bij 33 van de 55 KPI's · primair kernprincipe: Klantinformatie benutten 13, Data-gedreven werken 13, Eigenaarschap nemen 12, Klant begrijpen 9 en Samenwerken 8.",
            "G.O.L.D: (\"Wat ons drijft\"), met de valkuil aan de onder- en bovenkant:"
          ]
        },
        {
          "type": "tekst",
          "tekst": "| Kernwaarde | Valkuil onder | Valkuil boven | |---|---|---| | Gedreven | routineus | overenthousiast | | Ondersteunend | onverschillig | betuttelend | | Lerend | star | verzandend in vernieuwing | | Deskundig | oppervlakkig | betweterig |"
        },
        {
          "type": "lijst",
          "titel": "",
          "items": [
            "Rollen:"
          ]
        },
        {
          "type": "tekst",
          "tekst": "| Groep | Rollen | |---|---| | Marketing | Marketing Lead | | Product | Product Manager, Trainer, Training & Advies | | Verkoop | Binnendienst, Accountmanager, Training & Advies | | Proces Support | Proces Ondersteuner | | Klant Advies | Customer Support | | Klant | Customer Success Manager | | Management | Sector Manager |"
        },
        {
          "type": "lijst",
          "titel": "",
          "items": [
            "Tab KPIs, \"Voorbeeld Doel\": 90% van alle klanten binnen 5 werkdagen in onboarding, en 95% van de scholen heeft binnen 30 dagen gebruikers ingericht en een eerste activiteit uitgevoerd. Dit zijn voorbeelden, geen afspraken."
          ]
        },
        {
          "type": "lijst",
          "titel": "Open / onaf",
          "items": [
            "De rij \"Beschrijving (sub-fase)\" is leeg, tab \"Competenties\" is leeg en het blok \"Zichtbaar Gedrag\" in de gedragsclusters is leeg.",
            "Bij subfase Afname is geen systeemgebruik ingevuld.",
            "Er zijn geen doelwaarden; eerst komt de nulmeting.",
            "De validatie door product- en sectormanagers (PvA p. 10) staat nog open. Volgens de statuspagina zijn afstemsessies met Saila en Pim gepland."
          ]
        }
      ]
    },
    {
      "id": "doc-6",
      "titel": "6. Cito DIN Adoptie Framework – WiP (PDF, 15 p.)",
      "intro": "",
      "blokken": [
        {
          "type": "tekst",
          "tekst": "Wat. 3sides-deck over de gedragsverandering: hoe de klantreis wordt vertaald naar rolspecifiek gedrag en hoe adoptie wordt georganiseerd en gemeten. Voorblad: \"Augustus 2025\" (p. 1). PDF-metadata: auteur Sasja Beerendonk, 28-09-2026."
        },
        {
          "type": "lijst",
          "titel": "Kern",
          "items": [
            "Rol van het framework: \"Het centrale veranderkundige stuurinstrument van het hele Klant in Zicht-programma\", de brug tussen \"outside-in werken met een integraal klantbeeld\" en het dagelijkse gedrag van medewerkers (p. 3).",
            "Vaste vertaallogica (p. 3): Klantreis → Klantbehoefte → Kritisch contactmoment → Gewenst medewerkergedrag → Competenties → Adoptie → Resultaat. \"Adoptie Team & Ambassadeurs zorgen voor draagvlak + borging.\"",
            "Negen stappen voor de vertaalslag (p. 6): fasen beschrijven (algemeen en per sector) · klantdoelen per fase · kritische momenten · zichtbaar gedrag per Cito-rol · gedrag koppelen aan competenties · gedragsclusters · rollen- en gedragsmatrix · adoptie en training/coaching/intervisie · resultaat meten.",
            "Succes in drie niveaus (p. 8):"
          ]
        },
        {
          "type": "tekst",
          "tekst": "| Niveau | Vraag | Indicatoren | |---|---|---| | Adoptie | \"Doen mensen mee?\" | trainingsdeelname, intervisiedeelname, ambassadeurs actief, coaching/training afgerond | | Gedrag | \"Doen mensen iets anders?\" | gebruik klantdata, kwaliteit gespreksverslagen, funnelregistratie, opvolging afspraken | | Impact | \"Levert het iets op?\" | NPS/klanttevredenheid, conversie, partnership score, omzetgroei |"
        },
        {
          "type": "lijst",
          "titel": "",
          "items": [
            "Vijf lagen (p. 15):"
          ]
        },
        {
          "type": "tekst",
          "tekst": "| Laag | Inhoud | |---|---| | 1 Begrijpen (WHY) | iedereen begrijpt waarom Cito verandert | | 2 Vertalen naar rollen (WHAT) | per rol een Customer Journey Playbook, met 1 A4 \"Mijn rol in de klantreis\" | | 3 Vaardig maken (HOW) | trainingsprogramma: klantreis, G.O.L.D., 5 kernprincipes, CRM en KPI's | | 4 Verankeren | maandelijkse verbeterdialogen, klantreisreviews met KPI's en een managementritme | | 5 Continu verbeteren | leeg |"
        },
        {
          "type": "lijst",
          "titel": "",
          "items": [
            "SMILE (p. 12–14): Start exploring, Make it available, Increase use, Leverage it en Enhance & improve, gegroepeerd als Build / Grow / Thrive. Op p. 14 staan programma-onderdelen in die fasen, zoals kick-off, stuurgroep, 0-meting, tussenmeting, communicatieplan, champions, interventies en stakeholder engagement.",
            "Wie moet aanhaken (p. 5): besluitvorming, prioritering en sturing: de stuurgroep (Directeur Cito BV, DIN-programmaleider, PM en 3sides) en de sectormanagers PO, VO en Zakelijk · werkzaamheden bij HR (competentiemodel, functieprofielen, leerpaden, trainingen), CRM/Data (databehoefte, KPI-dashboards, platformanalyse), Sales/commercie (funnel, accountmanagement), Customer support (klantcontactprocessen) en Marketing (funnel-definities, leadmanagement)."
          ]
        },
        {
          "type": "lijst",
          "titel": "Getallen en datums",
          "items": [
            "Succes \"eind Q3\" (p. 9): het adoptieframework is formeel vastgesteld · 100% van de pilotrollen is uitgewerkt naar gewenst gedrag en competenties · er is een volledige nulmeting voor mens, proces, data en cultuur · CRM-gaps en databehoeften zijn inzichtelijk · een pilotgroep is actief gestart · minimaal 3–5 ambassadeurs zijn aangehaakt · er is draagvlak in programmateam en management · er is een nulmeting waarmee de Q4-gedragsverandering te volgen is.",
            "Fasering voor Q3 (p. 10, letterlijk): Verkenning (week 12) · Klantreis Blueprint Matrix (week 6-10) · Barrière Assessment (week 8-11) · Meetmodel bouwen (week 2-6) · Validatie (week 8-12) · Pilot Start Q4 (week 13-20).",
            "Werksessies met PO, VO en Zakelijk: 8 vragen per klantreisfase (p. 11), zoals \"Wat doet een top performer hier anders?\" en \"Hoe kunnen we dat gedrag meten?\"."
          ]
        },
        {
          "type": "lijst",
          "titel": "Open / onaf",
          "items": [
            "Laag 5 is leeg en lagen 3–5 hebben geen elementen en geen succesindicator (p. 15).",
            "Wie de pilotgroep, de pilotrollen en \"PM\" in de stuurgroep zijn, staat niet in het document.",
            "Waar de weeknummers op p. 10 vanaf tellen, staat niet in het document.",
            "De SMILE-dia's (p. 12–13) zijn generiek Engelstalig 3sides-materiaal."
          ]
        }
      ]
    },
    {
      "id": "doc-7",
      "titel": "7. Cito Data & Tech (praatplaat, 1 pagina)",
      "intro": "",
      "blokken": [
        {
          "type": "tekst",
          "tekst": "Wat. Een plaat van het huidige systeemlandschap langs de klantreis, verdeeld in \"Customer Facing\" en \"Internal Facing\". De PDF heeft geen tekstlaag; ik heb de plaat als afbeelding gelezen."
        },
        {
          "type": "lijst",
          "titel": "Kern",
          "items": [
            "Fasen: Bewustwording → Overweging/Oriëntatie → Aankoop (Beslissen, Bestellen) → Onboarding (Activeren, Inrichten, Trainen & Informeren) → Gebruik (Voorbereiding, Afname) → Analyse/Evaluatie (Rapportage, Opvolging). · Bij Onboarding staat \"Product specifiek — deze fase is alleen van toepassing als er een product wordt afgenomen\".",
            "Customer facing: Website, Google Adds, Socials, Online webinars, Email marketing, Online surveys, Marketing Beurzen, Direct Mails, Aanmeld formulieren, Bezoek adviseur, Microsites, Product, en Telefonisch contact van Aankoop tot en met Analyse/Evaluatie.",
            "Internal facing: 21 systemen (zwarte blokken, de plaat groepeert ze niet): Google Analytics, Zigt, Coosto, Webinar Geek, Maileon, Survey Moneky, Umbraco, Microsoft Bookings, Microspace, OneNet Callcenter, Topdesk, Dynamics 365 for operations, CIAM, CSA, Woots, Platform PO, Leerling In Beeld VO, Bedrijfsvoering DWH, Licentie Server, Data Ware House en Microsoft Dynamics CRM. Daarnaast staan DUO en Assu in grijs.",
            "Uitgetekende stromen: Umbraco gaat via Mails naar Maileon, en \"Voor trainingen automatische verkoopkans\" naar Dynamics CRM. · Dynamics CRM heeft een Verkoopkans met bron (campagne), onderwerp, contactpersoonID, productgroep, afdeling, eigenaar (adviseur) en beslisdatum (+2 mnd), plus Accounts, Klantkaarten en Personen. · Microspace heeft contacten en \"Shared contacts\". · Topdesk heeft Accounts → Meldingen (id) → Mails. · CIAM bevat account, mailadres, password en role.",
            "Post-its: \"Naar Xelion?\" bij OneNet Callcenter en \"FAB gedeeltelijk\" bij Topdesk. Een derde post-it bij Topdesk, over accounts uit CRM en meldingen per mail, is deels onscherp."
          ]
        },
        {
          "type": "lijst",
          "titel": "Open / onaf",
          "items": [
            "Er zijn geen titel, legenda of datum. Wat de grijze blokken (DUO, Assu) betekenen, staat niet in het document.",
            "Het doelbeeld en het advies per systeem (PvA p. 6) staan er nog niet op.",
            "Volgens de statuspagina is de plaat \"Work-In-Progress en wordt continue bijgewerkt\"."
          ]
        }
      ]
    },
    {
      "id": "doc-8",
      "titel": "8. Praatplaat Marketing & Sales funnel (1 pagina)",
      "intro": "",
      "blokken": [
        {
          "type": "tekst",
          "tekst": "Wat. Een plaat van de lead-to-deal-funnel met rollen. Geen tekstlaag; gelezen als afbeelding."
        },
        {
          "type": "lijst",
          "titel": "Kern",
          "items": [
            "Segmenten: een as \"Self Service ↔ High Touch\" met daaronder drie cirkels A, B en C, zonder toelichting. DP spreekt elders van \"segment (ABC)\".",
            "Marketing: Webinar, website en Nieuwsbrief → Marketing Lead (\"Heeft iets gelezen, bezocht, opgevraagd\") → Marketing Qualified Lead (\"X points\").",
            "Sales: een Sales lead (Binnendienst), ook vanuit een Opportunity (AM, Training & Advies, KlantAdvies). · Na Qualify wordt het een Sales Qualified Lead (AM en Binnendienst; \"BANT/MEDDIC\"). · Daarna Qualified, of Unqualified → Nurture → terug naar de MQL.",
            "Blok \"Nog afstemmen\" (\"Team lead – Focus on funnel\"): Contact (demo/bezwaren ophalen) → Build Solution (voorstel opstellen) → Proposal sent, telkens als \"Verkoopkans\". · Won → Implementation (\"T&A, Sectors, PrSu (?)\") → renewal, upsell of cross sell (Sales/CS). · Lost → Nurture en Lost registration (Sales/CS)."
          ]
        },
        {
          "type": "lijst",
          "titel": "Open / onaf",
          "items": [
            "De hele tweede helft staat onder \"Nog afstemmen\".",
            "De drempel voor een MQL is \"X points\". Bij Implementation staat \"PrSu (?)\".",
            "Hoe A/B/C zich tot Self Service–High Touch verhouden, staat niet in het document."
          ]
        }
      ]
    },
    {
      "id": "doc-9",
      "titel": "9. Praatplaat Marketing & Sales proces (1 pagina)",
      "intro": "",
      "blokken": [
        {
          "type": "tekst",
          "tekst": "Wat. Een plaat van hoe klantvragen en orders intern tussen de rollen lopen. Geen tekstlaag; gelezen als afbeelding."
        },
        {
          "type": "lijst",
          "titel": "Kern",
          "items": [
            "Start: \"Klant heeft hulpvraag\" (\"Advies v.s. Service\"; \"Junior en Senior\"), met Klant Advies als centraal punt.",
            "Doorzetten: \"Commerciele vraag gaat naar binnendienst\" en \"Service vraag gaat naar Training & Advies\". Bij Training & Advies staat \"Signaleren\".",
            "Geel blok met Account manager en Binnendienst: Account manager: \"A - junior /B/C - besturen/\", \"Warme relatie onderhouden\" en \"Omzet potentie\" · Binnendienst: \"Customer Succes Coordinator\".",
            "Proces support (in rood): \"2e lijn, admin facturen\" en \"Administratie & Logistiek\", met de vraag \"Geen toegang CRM wat doen ze?\".",
            "Implementatie: \"Klant heeft besteld\" → zes touchpoints → \"Succesvol gebruikt\" → \"Wat komt hierna?\".",
            "Productkant: Klant validatie (\"Toetsen van visie en ideeen\") → Product Mng, met daaronder \"Markt behoefte\" en \"Competitive landscape\". Een stippellijn loopt van Klant validatie naar het tweede touchpoint."
          ]
        },
        {
          "type": "lijst",
          "titel": "Open / onaf",
          "items": [
            "De plaat bevat twee open vragen: \"Geen toegang CRM wat doen ze?\" en \"Wat komt hierna?\".",
            "De zes touchpoints zijn niet benoemd."
          ]
        }
      ]
    },
    {
      "id": "doc-10",
      "titel": "10. BV-dag-229-final (PDF, 10 p.)",
      "intro": "",
      "blokken": [
        {
          "type": "tekst",
          "tekst": "Wat. Presentatie in Cito-huisstijl voor de BV-dag, waarin 3sides zichzelf en Klant in Zicht voorstelt. De datum staat niet in het document. PDF-metadata: auteur Pim de Burger, 28-09-2026."
        },
        {
          "type": "lijst",
          "titel": "Kern",
          "items": [
            "Team (p. 1–2):"
          ]
        },
        {
          "type": "tekst",
          "tekst": "| Naam | Rol | Aandachtsgebied | |---|---|---| | Lammert Postma | partner | strategie & design; achtergrond product & service design | | Ericka Marquez | managing partner | strategie & technologie | | Sasja Beerendonk | senior engagement consultant | klantreis & adoptie | | Linsey Meenken | engagement consultant | klantreis & adoptie |"
        },
        {
          "type": "lijst",
          "titel": "",
          "items": [
            "Terugblik Klant in Beeld (p. 3–4). Drie stappen: huidige klantreis in kaart, gewenste klantreis ontwerpen en valideren, implementatiescenario's uitwerken. \"Ging dat soepel? Nee, niet altijd. Dat horen we ook terug uit de evaluatie.\" Daarna volgen twee groepjes punten, zonder kopje: \"De waan van de dag kreeg soms voorrang\", \"Kost veel tijd in verhouding tot de opbrengst\" en \"Gevoel van eigenaarschap\" · bewustwording van hoe gefragmenteerd de klantinformatie is, samenwerking tussen afdelingen (\"voor het eerst gezamenlijk om tafel\"), methodes die echt zijn toegepast (vooral klantinterviews) en inzicht in de complexiteit van de klantreis.",
            "Probleem (p. 5–6): \"Meer complexiteit dan bij Cito's omvang past\": software en werkprocessen zoals bij grote enterprise-organisaties (+5.000 mensen). Het plaatje toont Maileon, CRM, ERP, de licentieserver en Topdesk met drie handovers. \"De prijs van niets doen\": \"Concurrenten met een simpeler product of customer service krijgen de ruimte.\"",
            "Richting (p. 7): \"Van leverancier naar strategische partner\". Klanten zoeken een strategische partner; de expertise van Cito is de belangrijkste reden om te kiezen, en waar de relatie er is, is de tevredenheid hoog.",
            "Werkstromen (p. 8): de vier stromen; Succes meten heet hier \"Een nulmeting\".",
            "De komende 90 dagen (p. 9): technologie: inventarisatie afronden, advies en een eerste shortlist behouden/vervangen/loslaten · blueprint: een eerste versie samen met de sectoren · 0-meting: \"we bepalen de cijfers waarop we gaan meten\" · adoptie: stap voor stap met de teams.",
            "Oproep (p. 10): kom langs, geef prioriteit aan de sessies en help de eerste veranderingen testen. 3sides is op dinsdagen aanwezig; contact via Lammert."
          ]
        },
        {
          "type": "lijst",
          "titel": "Open / onaf",
          "items": [
            "Vanaf wanneer de 90 dagen lopen, staat niet in het document."
          ]
        }
      ]
    },
    {
      "id": "doc-11",
      "titel": "11. Evaluatie Klant in Beeld (Excel)",
      "intro": "",
      "blokken": [
        {
          "type": "tekst",
          "tekst": "Wat. Anonieme enquête onder 13 deelnemers aan het vorige traject, ingevuld van 1 tot en met 10 september 2026. Deelnemers per traject: PO 4, VO 3, Professionals 3, PO én VO 3."
        },
        {
          "type": "tabel",
          "titel": "",
          "kolommen": [
            "Vraag",
            "Uitkomst"
          ],
          "rijen": [
            [
              "Hoe kijk je terug (1–10)",
              "gemiddeld 5,6 (mediaan 6; 3–8)"
            ],
            [
              "Rapportcijfer",
              "gemiddeld 5,4 (mediaan 6; 2–8)"
            ],
            [
              "Doel behaald?",
              "3 ja · 10 nee"
            ],
            [
              "Tijd het waard?",
              "8 ja · 5 nee"
            ],
            [
              "Methodes toegepast?",
              "2 ja · 11 nee (van die 11 zijn er 7 het nog van plan)"
            ],
            [
              "Kennis/tools waardevol · zelf durven toepassen · anders naar eigen werk kijken",
              "5,2 · 5,9 · 4,2"
            ],
            [
              "Workshopaanpak",
              "6,2"
            ],
            [
              "Geïnformeerd vanuit Cito · vanuit 3sides",
              "5,6 · 6,2"
            ],
            [
              "Inhoud",
              "6 goed · 3 redelijk · 3 matig · 1 slecht"
            ],
            [
              "Uitvoering workshops",
              "4 goed · 6 redelijk · 3 matig"
            ]
          ],
          "legenda": ""
        },
        {
          "type": "lijst",
          "titel": "Rode draad in de open antwoorden",
          "items": [
            "Waarom het doel niet gehaald is: te weinig concreet en geen opvolging (\"Stroperig, geen urgentie, teveel intern…\"; \"bij ideeën lijkt te zijn gebleven\") · te veel inside-out en te weinig input van klanten · de timing (de livegang van LiB VO in Woots).",
            "Wat goed was: voor het eerst multidisciplinair samenwerken, bewustwording van hoe gefragmenteerd klantinformatie is, en de klantinterviews.",
            "Wat beter kan: concreter, sneller en in kleinere stappen; afmaken waar we aan begonnen zijn; klanten meer betrekken; \"Regie vanuit 3side\".",
            "Over 3sides: meestal \"prima\" of \"goed\". Kritisch waren \"Te vrijblijvend en weinig concreet\", \"soms wat stroperig\" en het verschil in marketingdenken.",
            "Over Klant in Zicht: \"nu is er weer een nieuw traject klant in zicht gestart\" (respondent 13). Een ander hoopt dat niet alleen naar symptomen wordt gekeken (respondent 11)."
          ]
        },
        {
          "type": "lijst",
          "titel": "Open / onaf",
          "items": [
            "De schaal van de stellingvragen staat niet in het bestand. De antwoorden lopen van 0 tot 9."
          ]
        }
      ]
    },
    {
      "id": "statuspagina-3sides-as-a-service",
      "titel": "Statuspagina (\"3sides-as-a-service\")",
      "intro": "",
      "blokken": [
        {
          "type": "tekst",
          "tekst": "Bron: de tekst van de 3sides-statuspagina, door Pim geplakt op 29-09-2026. De uren lopen tot en met 25 september."
        },
        {
          "type": "tekst",
          "tekst": "Waarom as-a-service. Klant in Beeld leerde dat projecten bij Cito lang doorlopen. Cito vroeg 3sides daarom het tempo erin te houden, en het abonnement houdt het 3sides-team beschikbaar."
        },
        {
          "type": "tabel",
          "titel": "",
          "kolommen": [
            "Maand",
            "Budget",
            "Besteed",
            "Over"
          ],
          "rijen": [
            [
              "Juli",
              "232 u",
              "186,5 u",
              "45,5 u"
            ],
            [
              "Augustus",
              "232 u",
              "80 u*",
              "151"
            ],
            [
              "September",
              "232 u",
              "226,75 u (t/m 25 sept)",
              "—"
            ]
          ],
          "legenda": ""
        },
        {
          "type": "tekst",
          "tekst": "*Lager door vakantie en afwezigheid van Pim, Meryl, Sanne, Sasja, Lammert en Ericka. De 197,5 u die in juli en augustus niet zijn gebruikt, schuiven door naar de komende maanden. Let op: 232 − 80 = 152, niet 151. Het totaal van 197,5 u klopt wel (45,5 + 152)."
        },
        {
          "type": "lijst",
          "titel": "",
          "items": [
            "Werkwijze: Wekelijkse rapportage met Sanne en Pim via een Excel met stromen en activiteiten (gestart, gepauzeerd of niet gestart, plus status, zodat impediments vroeg zichtbaar worden). · Jira voor de taken. · Elke dinsdag bij Cito.",
            "Programmabreed: Het programma is gepresenteerd op de town hall, direct na Roel en Meryl. · Klant in Beeld is geëvalueerd onder 13 deelnemers. · Er is een ritme voor het programmaoverleg vastgesteld. · Klant in Zicht \"geeft invulling aan de strategische prioriteit commerciële slagkracht\".",
            "Eerste deliverables (juli–september): draft Blueprint Klantreis, draft meetplan met 0-meting-definities, adoptieplan, draft praatplaat marketing & sales funnel en draft praatplaat technologielandschap.",
            "Blueprint: Gedaan: sectorreizen verzameld, eerste versie van fasen en stappen, kernwaarden vertaald, kernprincipes opgesteld \"op basis van vermogen en inspanningen\" en vertaald naar handelen, gedrag en KPI's, en rollen geplaatst. · Afgestemd met Tim, Saila, Kathelijne, Maurice, Jasper, Ferry, Laura, Rody en Sanne. · Saila is in beeld als eigenaar; er staat een wekelijks overleg met Saila, Pim en Sasja. · Inzicht: de klantreis is versnipperd en verschilt sterk per sector, daarom eerst een blueprint. Werkdocument in Miro.",
            "Technologielandschap: Gesprekken met Cornelis, Ilse, Sven, Vincent, Niels, Roy, Jama, Meryl en Famke. · Het integratievoorstel van Ilse en Sven staat on hold en dient als input voor de inventarisatie. · Werksessies met Meryl over salesproces en funnel. · Bevindingen: De CRM-inrichting is verouderd en past niet bij de huidige en toekomstige manier van werken. Eerste inzicht: er moet een evaluatie komen van het platform zelf, in vergelijking met aanpassing van de huidige oplossing; dat hangt af van de gewenste to-be-processen en klantreis. · De evaluatie van het klantadviesproces en de implementatie is afgerond. · Er zijn tot nu toe geen overzicht, requirementsdocumenten of architectuurplaten van SIO ontvangen (\"bestaan niet of nauwelijks? Of, niet gedeeld?\"). · Het landschap is complexer dan past bij Cito's omvang; de gekozen concepten en platforms mappen niet op de gewenste SaaS-concepten. · De verwevenheid van stichting en BV maakt het landschap extra ingewikkeld. · Het licentieserverproject raakt data-integratie en klantreisondersteuning; het team is onvoldoende op de hoogte en heeft begeleiding nodig. · Een deepdive in data en proces van renewal kan wellicht quick wins opleveren. · Er is geen platform- of architectuurteam dat de integratie bewaakt. · Keuzes worden vaak gemaakt op onjuiste of onvolledige kennis. · De informatie is nog niet compleet.",
            "Succes meten: Gedaan: opzet van het meetmodel op \"doel, baat en capability (Vermogens & Inspanningen)\", kernprincipes, eerste datapunten (NPS) en een data-overzicht voor de 0-meting. Afgestemd met Sanne, Meryl en Saila. · Adviezen van 3sides: \"Cito definieert de 0-meting nu alleen op 'baten'.\" Maak die concreet en meetbaar, zodat ze ook het adoptieframework en het succes van de klantreis onderbouwt, en pas haar ook toe op de lagen daaronder (vermogens & inspanningen) · trek de baten-KPI's gelijk voor alle sectoren; elke sector kiest daarna zelf een focus op één of meer KPI's, soms op bateniveau en soms op productniveau. · De eerste versie van de kernprincipe-KPI's is gedefinieerd; validatie met stakeholders volgt \"in de komende maand\".",
            "Adoptieframework: Aanpak op basis van SMILE, met playbook-workshops, een gefaseerde uitrol per sector en een ambassadeursteam. · De eerste opzet is met Pim besproken. · Saila is de beoogde eigenaar, samen met de Blueprint."
          ]
        }
      ]
    },
    {
      "id": "begrippen-van-3sides",
      "titel": "Begrippen van 3sides",
      "intro": "",
      "blokken": [
        {
          "type": "tabel",
          "titel": "",
          "kolommen": [
            "Begrip",
            "Wat 3sides ermee bedoelt",
            "Waar"
          ],
          "rijen": [
            [
              "Kernprincipe",
              "Een van vijf principes voor klantgericht werken, elk met KUNNEN en DOEN. Samen vormen ze bij 3sides de laag Vermogens & Inspanningen.",
              "PvA p. 2; MI p. 11; BP tab Kern Principes (\"Behorend bij Vermogens & Inspanningen\")"
            ],
            [
              "Vermogens & Inspanningen (Kunnen en Doen)",
              "Eén meetlaag onder de baten. KUNNEN is wat Cito moet kunnen; DOEN is wat medewerkers en teams concreet doen. Gemeten met scores en KPI's per kernprincipe en per klantreisfase. Op de statuspagina heet dit \"capability\".",
              "PvA p. 8; MI p. 5, 11–12; statuspagina"
            ],
            [
              "Kernwaarden G.O.L.D.",
              "Gedreven, Ondersteunend, Lerend, Deskundig (\"Wat ons drijft\"), elk met een valkuil aan de onder- en bovenkant. Per klantreisfase zijn er een paar \"dominant\".",
              "BP tabs GOLD – Kernwaarden en Klantreis fasen"
            ],
            [
              "SMILE",
              "De adoptieaanpak van 3sides: Start exploring, Make it available, Increase use, Leverage it, Enhance & improve (Build / Grow / Thrive).",
              "AF p. 12–14"
            ],
            [
              "Blueprint",
              "Eén integrale Cito BV-klantreis als werkmodel voor alle sectoren: een matrix van fasen, klantdoelen, hoofdstappen, kernwaarden, kernprincipes, handelen, processen, systemen, KPI's en rollen.",
              "PvA p. 10–11; BP"
            ],
            [
              "Klantreisfase / subfase / hoofdstap",
              "6 fasen en 11 subfasen, met per subfase één hoofdstap (bijvoorbeeld \"Passend adviseren\").",
              "BP tab Klantreis fasen; AF p. 15"
            ],
            [
              "BV-KPI",
              "Organisatiebrede baten-KPI voor heel Cito BV (NPS, conversie, omzet, retentie/churn), totaal en per sector.",
              "MI p. 7–8"
            ],
            [
              "Product specifieke KPI",
              "KPI voor één sector of product, bijvoorbeeld upsell Basis → Compleet of % meerjarige licenties.",
              "MI p. 7, 9"
            ],
            [
              "Kernprincipe-KPI",
              "KPI die het handelen op een kernprincipe meet, bijvoorbeeld reactietijd of conversie uit bezoeken.",
              "MI p. 7; DP tab Kernprincipes"
            ],
            [
              "Klantreisfase-KPI",
              "Eén kern-KPI per fase, bijvoorbeeld Onboarding → Time To Value.",
              "MI p. 10; DP tab Klantreis KPIs"
            ],
            [
              "KPI-lagen / \"Effecten & leidende indicatoren\"",
              "Per subfase vijf KPI's: Effect, Klantreis, Gedrag & proces, Systeem & data en BV-baat.",
              "BP tab KPI meetkader"
            ],
            [
              "0-meting / tussenmeting",
              "De nulmeting levert de startwaarde van alle KPI's (\"Nulmeting Q3\"); de tussenmeting dient om bij te sturen (Q1 2027).",
              "PvA p. 8–9; MI p. 7; TL rij 22–23"
            ],
            [
              "Customer Journey Playbook",
              "Per rol, gemaakt in een workshop, met \"1 A4: Mijn rol in de klantreis\": gewenst gedrag, CRM-registratie en de KPI's waarop ik invloed heb.",
              "AF p. 15; PvA p. 12"
            ],
            [
              "Champions / ambassadeurs / adoptieteam",
              "Een vast kernteam plus Customer Journey Champions per afdeling, verantwoordelijk voor voorbeeldgedrag en verbeteren; minimaal 3–5.",
              "PvA p. 12; AF p. 3–4, 9"
            ],
            [
              "Praatplaat",
              "Een schets als gespreksstarter (landschap, funnel, proces), werk in uitvoering.",
              "statuspagina; de drie platen"
            ],
            [
              "3sides-as-a-service",
              "Abonnement met een vast urenbudget per maand, bedoeld om tempo en beschikbaarheid te borgen.",
              "statuspagina"
            ],
            [
              "MQL / SQL",
              "Marketing Qualified Lead (drempel \"X points\") en Sales Qualified Lead (kwalificatie \"BANT/MEDDIC\").",
              "funnelplaat"
            ],
            [
              "Swimlanes",
              "Komt in geen van de documenten voor.",
              "—"
            ]
          ],
          "legenda": ""
        }
      ]
    },
    {
      "id": "wat-mij-opvalt",
      "titel": "Wat mij opvalt",
      "intro": "",
      "blokken": [
        {
          "type": "lijst",
          "titel": "",
          "items": [
            "\"Inspanning\" betekent iets anders: Bij 3sides zijn Inspanningen \"(Concreet Doen)\": wat medewerkers en teams doen, uitgewerkt als de DOEN-regel per kernprincipe (PvA p. 2 en 8; MI p. 5 en 11–12). Vermogens en inspanningen vormen samen één laag, \"capability\" (statuspagina). In het DIN van het programma is een inspanning een activiteit die een vermogen opbouwt, bijvoorbeeld \"Implementeren integraal CRM-systeem als eenduidig klantdatafundament\" (DIN-sessie in de app).",
            "\"Vermogens (Waartoe)\": MI p. 6 zet de vermogens onder de kop \"Vermogens (Waartoe)\". In de piramide (MI p. 5; PvA p. 2) hoort \"Waartoe\" bij Doelen en heet de vermogenslaag \"(Kunnen)\". De inhoud van MI p. 6 komt uit het programma: de titels van de drie sectorvermogens en -baten, en de volledige omschrijvingen van de vermogens, zijn gelijk aan die in de DIN-sessie in de app.",
            "Drie of vier baten? PvA p. 2 en MI p. 5 noemen drie baten: NPS, Conversie en Omzetgroei. MI p. 8 spreekt van \"4 Baten (Effect) KPIs\" en voegt Retentie/Churn toe. AF p. 8 noemt bij Impact ook een \"Partnership score\".",
            "Omvang van het KPI-kader: 14 sector-KPI's (MI p. 7), 4 BV-KPI-groepen (MI p. 8) en 9 klantreisfase-KPI's (MI p. 10). · 55 KPI's in het blueprint-meetkader, waarvan 11 wekelijks en 26 maandelijks (BP). · 85 datapunten, 57 KPI-regels bij de kernprincipes, 6 proces-KPI's en 5 gedrags-KPI's (DP). · PvA p. 8 noemt het zelf een zeer uitgebreide set. Nog geen enkele doelwaarde staat vast (MI p. 7).",
            "Datums schuiven: AF p. 9 definieert succes voor \"eind Q3\": een pilotgroep gestart, een volledige nulmeting en 3–5 ambassadeurs. In de tijdlijn is de 0-meting niet gestart (oplevering oktober 2026), beginnen de ambassadeurs in oktober 2026 en loopt de 1e sector/fase in januari–februari 2027 (TL rij 22, 34, 28). · Pilots: PvA p. 11 zegt \"toegepast binnen eerste pilotgroep\" in Q4 2026; PvA p. 13 zegt \"Pilots sectoren\" in Q1 2027. · Playbooks: PvA p. 13 zegt Q4 2026; de tijdlijn zegt december 2026 tot mei 2027 (TL rij 27). · Technologielandschap: PvA p. 7 eindigt in Q4 met \"roadmap en overdracht\"; in de tijdlijn loopt stakeholder engagement tot maart 2027 en lopen de interventies tot en met juni 2027 (TL rij 6 en 10). · Het voorblad van het adoptieframework zegt \"Augustus 2025\".",
            "Statussen spreken elkaar tegen: \"Tussen meting\" staat op \"In progress\" terwijl de start in januari 2027 ligt (TL rij 23). · \"Integratie approach\" is \"In progress\" in de tijdlijn (rij 8; PvA p. 4), maar \"To Do\" in Jira (CITO-10, PvA p. 5). · Succes meten staat in Jira geheel op To do, terwijl de tijdlijn het meetmodel en het ophalen van data op In progress heeft (TL rij 20–21; PvA p. 5). · In Jira staat één blueprint-item op Done, terwijl de tijdlijn geen enkel \"Completed\" kent; de statuspagina (29-09) meldt het samenvoegen van de sectorreizen als gedaan (TL rij 12). · De statuspagina omschrijft de kolom als \"gestart, gepauzeerd of nog niet gestart\"; \"Completed\" staat wel in de legenda (C47) maar is niet gebruikt.",
            "Indeling en namen verschillen per document: Blueprint: Evaluatie = Klanttevredenheid + Renewal, en Gebruik = Afname + Rapportage. · Data & Tech-plaat: \"Analyse/Evaluatie\" = Rapportage + Opvolging, en Gebruik = Voorbereiding + Afname. · MI p. 10: 9 fasen, met Rapportage en Renewal als eigen fase. · De stroom heet \"Succes meten\" (PvA), \"Een nulmeting\" (BV-dag p. 8) en \"0-meting Adoptie Framework\" (MI p. 1).",
            "Eigenaarschap staat alleen in de statustekst: De statuspagina noemt Saila als (beoogd) eigenaar van zowel de Blueprint als het Adoptieframework. Het plan van aanpak en de tijdlijn noemen geen eigenaren per stroom of activiteit."
          ]
        }
      ]
    },
    {
      "id": "bronnen-en-leesbaarheid",
      "titel": "Bronnen en leesbaarheid",
      "intro": "",
      "blokken": [
        {
          "type": "lijst",
          "titel": "",
          "items": [
            "PDF's met tekstlaag (PvA, MI, AF, BV-dag): gelezen via de tekst. Dia's met beeld of tabellen zijn als afbeelding bekeken, zoals PvA p. 4–5, MI p. 6–16 en AF p. 3, 8, 13–15.",
            "Platen zonder tekstlaag (Data & Tech, sales funnel, sales proces): als afbeelding gerenderd en uitvergroot. Ze zijn volledig leesbaar, op één kleine post-it bij Topdesk na (deels onscherp).",
            "Excel-bestanden: alle tabbladen volledig uitgelezen.",
            "Genegeerd: de bestanden met \"(1)\" in de naam (identieke kopieën) en \"Aantallen besteld (1).xlsx\" (orderexport)."
          ]
        }
      ]
    }
  ]
};
