// Demo data voor DIN-app — snapshot van "Klant in Beeld" sessie (2026-04-09)
import type { DINSession } from "./types";

export function createDemoSession(): DINSession {
  const id = crypto.randomUUID();
  const now = new Date().toISOString();

  // Vaste IDs zodat koppelingen consistent zijn
  const goalIds = [
    "461a23af-1e14-4de4-9d1e-1a25e4542b46",
    "183a8941-af14-4f6a-820b-5e0783843874",
    "dcff16cb-cd64-4a90-8bfc-a86f984987c9",
  ];
  const benefitIds = [
    "015ebffc-93b7-4ee5-a8ff-787c075fc948",
    "3cf24b31-c739-495b-9c85-0d2bc3689c8a",
    "343f6163-2ae4-43f6-8a04-1d6e54477a45",
  ];
  const capIds = [
    "4aa95cb0-f3c3-4108-8e81-8abec1cc6587",
    "cfdf5175-78ee-4836-a29f-7d53b2afe465",
    "d2e8f9a1-4b5c-4d6e-8f7a-9b0c1d2e3f4a", // VO — toegevoegd voor drieluik (phase 17)
  ];
  const effortIds = [
    "3981af2f-4549-47d5-87c6-33d0c431aaee",
    "84fe41e4-c181-4c10-96d7-6f4fff6e3f3b",
    "88807a3a-98ef-4d57-b608-a1a931e2f56c",
    "b656f046-edbf-400c-ac29-3af35a9df1c5",
    "b1107cd6-9fb3-482e-855e-204fe1f896c4",
    "714e04bc-f22a-45d3-85bf-2c07c22b2d06",
    "a1b2c3d4-e5f6-4a7b-8c9d-0e1f2a3b4c5d", // VO mens (training) — toegevoegd phase 17
    "f9e8d7c6-b5a4-4938-8271-615f4c3d2e1b", // VO cultuur (leiderschap) — toegevoegd phase 17
    "1a2b3c4d-5e6f-4078-9182-a3b4c5d6e7f8", // PO data_systemen (CRM-klantbeeld)
    "2b3c4d5e-6f70-4819-a2b3-c4d5e6f7a8b9", // VO data_systemen (CRM-klantbeeld)
  ];

  return {
    id,
    name: "Demo — Phase 17 Drieluik & Sub-effort (3 sectoren)",
    createdAt: now,
    updatedAt: now,
    version: 1,
    currentStep: 4,
    vision: {
      id: crypto.randomUUID(),
      beknopt: "Met het programma Klant in Beeld maakt Cito BV de beweging van reactief leverancier naar proactieve strategische partner, waarbij een outside-in perspectief \u2013 wat klanten werkelijk nodig hebben \u2013 leidend is voor denken en handelen. Door mens, proces, systeem en cultuur structureel met elkaar te verbinden, bouwt Cito BV samen met klanten aan echte oplossingen en duurzame relaties.",
      uitgebreid: "Het programma Klant in Beeld stuurt de organisatiebrede transformatie van Cito BV: van productgerichte leverancier naar proactieve strategische partner. Het programma werkt langs vier domeinen \u2013 Mens, Proces, Systeem & Data en Cultuur \u2013 en geldt voor alle klantgroepen: van basisscholen en middelbare scholen tot mbo-instellingen, bedrijven, overheidsorganisaties en internationale opdrachtgevers. Klant in Beeld is geen project, maar een programma dat outside-in werken structureel verankert.\n\nCito BV is strategisch partner die proactief cocre\u00ebert met klanten om hun werkelijke behoeftes te begrijpen en daar gerichte waarde aan toe te voegen, waarbij klanten de regie behouden over hun processen en beslissingen. Door een geharmoniseerde aanpak met data-gedreven prioritering en branded customer journeys cre\u00ebren we een onderscheidende merkervaring die moeilijk te kopi\u00ebren is. We bedienen niet alleen individuele klanten maar begrijpen bredere ecosystemen en ontwikkelen sectoroverstijgende proposities die echte impact maken.\n\nCito BV maakt de beweging van reactief naar proactief handelen door systematisch klantinzichten om te zetten in concrete verbeteracties en samen met klanten te werken aan productontwikkeling via co-creatie. Tegelijkertijd maken we bewuste keuzes over waar we wel en niet de beste partner kunnen zijn, zodat we onze toegevoegde waarde maximaliseren. Deze outside-in benadering verankeren we structureel in onze dagelijkse werkwijze, zodat klantgericht denken en handelen onderdeel wordt van onze cultuur.",
    },
    goals: [
      {
        id: goalIds[0],
        name: "Integraal klantbeeld en outside-in werken als strategisch fundament",
        rank: 1,
        description: "Cito BV bouwt \u00e9\u00e9n toegankelijk en betrouwbaar klantbeeld op dat voor alle medewerkers met klantcontact beschikbaar is, ingericht op de specifieke klantcontext per organisatieonderdeel. Door klantdata, interacties en inzichten samen te brengen in een integraal systeem \u2013 inclusief een volledig en consistent beeld van de klantfunnel en eenduidige afspraken over de doorrekening per funnelfase \u2013 wordt proactief handelen mogelijk en worden kansen eerder gesignaleerd. Dit is onlosmakelijk verbonden met outside-in werken: medewerkers stellen de juiste vragen, doorvragen naar de vraag achter de vraag, en begrijpen de praktijk van klanten werkelijk. Samen vormen dit het strategische fundament voor alle andere klantgerichte ambities binnen het programma.",
      },
      {
        id: goalIds[1],
        name: "Verbeteren \u00e9n innoveren op basis van klantinzichten en gebruiksdata",
        rank: 2,
        description: "Cito BV betrekt klanten structureel bij zowel de doorlopende verbetering van het huidige aanbod als de ontwikkeling van nieuwe producten en diensten \u2013 via co-creatie, klantpanels, ambassadeursprogramma\u2019s en iteratieve samenwerking. Tegelijkertijd zet Cito beschikbare klant- en gebruiksdata actief in als grondstof voor besluitvorming. Kwalitatieve inzichten uit directe samenwerking met klanten en kwantitatieve inzichten uit gebruiksdata versterken elkaar en vormen samen het vertrekpunt voor productontwikkeling en optimalisatie van bestaand aanbod.",
      },
      {
        id: goalIds[2],
        name: "Structurele klantrelevantie en tevredenheid realiseren",
        rank: 3,
        description: "Cito BV streeft ernaar structureel relevant te zijn voor de vraagstukken en uitdagingen van klanten, waarbij klanttevredenheid zichtbaar en meetbaar op een hoog niveau ligt. Dit betekent dat Cito haar belofte waarmaakt: de waarde die ze levert sluit aan bij wat klanten werkelijk nodig hebben. Een hoge waardeperceptie is daarmee een einddoel.",
      },
    ],
    scope: {
      id: crypto.randomUUID(),
      inScope: [
        "Organisatiebrede transformatie langs vier domeinen: Mens, Proces, Systeem & Data en Cultuur",
        "Alle klantgroepen: basisscholen, middelbare scholen, mbo-instellingen, bedrijven, overheidsorganisaties en internationale opdrachtgevers",
        "Ideation en prioritering van kansrijke richtingen voor alle markten",
        "Opbouwen van een integraal 360\u00b0-klantbeeld met betrouwbare klantdata",
        "Ontwikkeling van medewerkers voor outside-in werken en co-creatie vaardigheden",
        "Structurele verankering van klantgericht denken in cultuur en dagelijkse werkwijze",
        "Overkoepelende grote thema\u2019s waarbij bedrijfsprocessen of applicaties aan ten grondslag liggen (mits MT-prioriteit)",
      ],
      outScope: [
        "Het daadwerkelijk herontwerpen van de klantreis en het uitvoeren van verbeteridee\u00ebn (ligt binnen de sectoren met productmanagers, propositiemanagers of customer experience managers als lead)",
        "De way of working tussen toetsdeskundigen en conceptontwikkelaars (is een apart traject)",
        "De specifieke aanpak voor PO (Primair Onderwijs) en Professionals (elke sector bepaalt zijn eigen invulling binnen de kaders van Klant in Beeld)",
      ],
    },
    sectorPlans: [],
    pmcEntries: [],
    benefits: [
      {
        id: benefitIds[0],
        title: "Sterkere klantgerichtheid bij opdrachtgevers en kandidaten",
        goalId: goalIds[0],
        sectorId: "Zakelijk",
        description: "Opdrachtgevers en kandidaten ervaren Cito BV als een onderscheidende partner die hun context begrijpt en proactief inspeelt op hun behoeften; dit uit zich in hogere tevredenheid, sterkere relaties en betere commerci\u00eble prestaties zoals snellere conversie en meer omzet.",
        profiel: {
          indicator: "NPS bij opdrachtgevers en kandidaten, conversieratio van lead naar opdracht (%), en omzetgroei uit bestaande en nieuwe klanten (\u20ac)",
          meetmethode: "Kwantitatieve data-analyse vanuit CRM (conversie en omzet), gecombineerd met periodieke NPS-enqu\u00eate onder opdrachtgevers en kandidaten",
          targetValue: "NPS-stijging met minimaal 10 punten, conversieratio leads naar opdracht +15%, omzetgroei +10% binnen 2 jaar na programmainvoering",
          currentValue: "Nulmeting vast te stellen bij programmastart (NPS, conversieratio en omzetcijfers op T0)",
          bateneigenaar: "Commercieel Manager",
          indicatorOwner: "Productmanager",
          measurementMoment: "Halfjaarlijks, met kwartaalrapportage op conversie en omzet via dashboarding in CRM",
        },
      },
      {
        id: benefitIds[1],
        title: "Intensiever partnership",
        goalId: goalIds[0],
        sectorId: "PO",
        description: "Leerkrachten, schoolbesturen en andere schoolmedewerkers ervaren dat Leerling in Beeld producten en diensten beter aansluiten op hun dagelijkse onderwijspraktijk en behoeften; dit uit zich in diepere samenwerkingsgesprekken, hogere tevredenheid en groeiend gebruik van het LIB-aanbod.",
        profiel: {
          indicator: "NPS-score onder leerkrachten en schoolbesturen, gecombineerd met het aandeel klantgesprekken dat als samenwerkings- of beleidsgerichte dialoog wordt gekwalificeerd",
          meetmethode: "Halfjaarlijkse NPS-enqu\u00eate onder leerkrachten en schoolbesturen; kwalitatieve gespreksregistratie via CRM met labeling op gesprekstype (transactioneel vs. verdiepend); aanvullend: jaarlijkse analyse van gebruikersaantallen, trainingsdeelname en meldingsvolume klantenservice",
          targetValue: "NPS stijging van minimaal +10 punten t.o.v. nulmeting; \u2265 40% van klantgesprekken gekwalificeerd als samenwerkings- of beleidsgerichte dialoog binnen 2 jaar",
          currentValue: "Nulmeting NPS: nog te bepalen (Q1 2025); aandeel verdiepende klantgesprekken: 0% formeel geregistreerd",
          bateneigenaar: "Commercieel Manager",
          indicatorOwner: "Sectormanager PO",
          measurementMoment: "Halfjaarlijks (NPS en gespreksanalyse), jaarlijks (gebruikersaantallen en trainingsdata)",
        },
      },
      {
        id: benefitIds[2],
        title: "Betere vroegere klantsignalering bij accountmanagers",
        goalId: goalIds[0],
        sectorId: "VO",
        description: "Accountmanagers bij Cito BV signaleren kansen en risico\u2019s in klantrelaties eerder doordat zij beschikken over een integraal en actueel klantbeeld; klanten ervaren proactievere aandacht en meer passende oplossingen in hun specifieke onderwijscontext.",
        profiel: {
          indicator: "Percentage kansen dat proactief (v\u00f3\u00f3r klantinitiatief) wordt gesignaleerd als aandeel van het totaal aantal gerealiseerde verkoopkansen",
          meetmethode: "Data-analyse vanuit CRM-systeem: vergelijking van moment van eerste registratie van een kans ten opzichte van moment van eerste klantinitiatief, aangevuld met kwartaalsteekproef onder accountmanagers (n=20)",
          targetValue: "55% van de verkoopkansen proactief gesignaleerd (doelwaarde Q4 2026)",
          currentValue: "15% van de verkoopkansen proactief gesignaleerd (nulmeting Q1 2025)",
          bateneigenaar: "Directeur Commercie & Klantrelaties",
          indicatorOwner: "CRM & Data Analist",
          measurementMoment: "Elk kwartaal",
        },
      },
    ],
    capabilities: [
      {
        id: capIds[0],
        title: "Klantgerichte commerci\u00eble slagkracht",
        sectorId: "Zakelijk",
        description: "Het vermogen om via eenduidige processen, betrouwbare CRM-data en commercieel vaardige medewerkers structureel klantgericht te werken richting opdrachtgevers en kandidaten; waarbij eigenaarschap, gerichte prioritering en een uniforme werkwijze zorgen voor hogere conversie en duurzame klantrelaties.",
        currentLevel: 3,
        targetLevel: 4,
        relatedSectors: ["Zakelijk"],
        profiel: {
          eigenaar: "Sectormanager",
          huidieSituatie: "Commerci\u00eble werkwijzen zijn deels aanwezig maar niet uniform: medewerkers werken wisselend met het CRM-systeem, prioritering van leads verloopt inconsistent en eigenaarschap voor de klantrelatie is onvoldoende verankerd in gedrag en cultuur.",
          gewensteSituatie: "Medewerkers werken aantoonbaar eenduidig volgens gedeelde processen, prioriteren actief op de belangrijkste leads, voeren regie op betrouwbare CRM-data en nemen volwaardig eigenaarschap voor opdrachtgevers en kandidaten \u2013 resulterend in hogere NPS, betere conversieratio en aantoonbare omzetgroei.",
        },
      },
      {
        id: capIds[1],
        title: "Strategisch klantpartnerschap PO",
        sectorId: "PO",
        description: "Het vermogen bestaat uit accountmanagers en sectormanagement (mensen) die op basis van kwalitatieve klantdata en productinformatie (data & systemen) gerichte samenwerkingsgesprekken voeren, ondersteund door een cultuur van lef, standvastigheid en actief ophalen van klantbehoeften (cultuur & processen).",
        currentLevel: 2,
        targetLevel: 3,
        relatedSectors: ["PO"],
        profiel: {
          eigenaar: "Sectormanager PO",
          huidieSituatie: "Medewerkers zijn vooral zendend in klantcontact en hebben onvoldoende grip op klant- en productdata om geloofwaardige, op maat gesneden gesprekken te voeren; bewustwording over het aanbod van het leerlingvolgsysteem is beperkt aanwezig.",
          gewensteSituatie: "Medewerkers voeren proactief kwalitatieve dialogen met leerkrachten en schoolbesturen over beleid en samenwerking, daarbij ondersteund door betrouwbare klant- en productdata en een cultuur waarin men zichzelf durft neer te zetten en beloftes waarmaakt.",
        },
      },
      {
        id: capIds[2],
        title: "Strategisch klantpartnerschap VO",
        sectorId: "VO",
        description: "Het vermogen bestaat uit accountmanagers en sectormanagement (mensen) die kwalitatieve klantdata en productinformatie (data & systemen) inzetten voor gerichte samenwerkingsgesprekken met scholen en besturen in het voortgezet onderwijs, ondersteund door een cultuur van lef, nieuwsgierigheid en actief ophalen van klantbehoeften.",
        currentLevel: 2,
        targetLevel: 3,
        relatedSectors: ["VO"],
        profiel: {
          eigenaar: "Sectormanager VO",
          huidieSituatie: "Klantgesprekken zijn vooral reactief; medewerkers VO hebben beperkte grip op productgebruik-data en durven onvoldoende standpunten in te nemen over curriculum- en toetsingsvraagstukken.",
          gewensteSituatie: "Medewerkers VO voeren proactief dialogen met schoolleiders en docenten over onderwijskundige visie en data-gedreven verbetering, onderbouwd met betrouwbare klant- en gebruiksdata, en durven zichzelf als inhoudelijk partner te positioneren.",
        },
      },
    ],
    efforts: [
      {
        id: effortIds[0],
        title: "Verankeren van outside-in leiderschap als rolmodel gedrag",
        sectorId: "PO",
        domain: "cultuur",
        status: "gepland",
        quarter: "Nader te bepalen",
        votes: 0,
        dependencies: [],
        description: "Leidinggevenden binnen de PO-sector ontwikkelen en tonen zichtbaar buiten-naar-binnen-denken als norm: zij cre\u00ebren bewust ruimte \u2014 weg uit de vergadercultuur en de waan van de dag \u2014 om medewerkers uit te nodigen klantgericht te handelen, door te vragen naar de vraag achter de vraag, en lef en creativiteit te stimuleren. Via gerichte leiderschapsinterventies (sessies, intervisie, gezamenlijke klantbezoeken) wordt het goede voorbeeld gesteld zodat outside-in denken een gedeeld cultureel vertrekpunt wordt.",
        dossier: {
          eigenaar: "Sectormanager PO",
          inspanningsleider: "Programmamanager / HR Business Partner PO",
          verwachtResultaat: "Leidinggevenden en medewerkers voelen zich vrij en veilig om klantgericht gedrag te tonen en hierop aan te spreken, zichtbaar in een stijging van de NPS-score en een groter aandeel klantgesprekken dat als samenwerkingsgerichte dialoog wordt gekwalificeerd.",
          kostenraming: "\u20ac 30.000 \u2013 \u20ac 60.000 (afhankelijk van aantal leiderschapssessies, externe begeleiding en intervisietraject); onzekerheidsmarge \u00b130%",
          randvoorwaarden: "Commitment van sectormanager als zichtbaar sponsor en deelnemend rolmodel; minimale beschikbaarheid van leidinggevenden; afstemming met lopende inspanningen op systeem- en procesvlak.",
        },
      },
      {
        id: effortIds[1],
        title: "Trainen medewerkers in klantgerichte gespreksvaardigheden PO",
        sectorId: "PO",
        domain: "mens",
        status: "gepland",
        quarter: "Nader te bepalen",
        votes: 0,
        dependencies: [],
        description: "Medewerkers met klantcontact in sector PO worden opgeleid en gecoacht in outside-in gespreksvaardigheden: het stellen van de vraag achter de vraag, het voeren van een sturend waardeverhaal vanuit het brede Cito-portfolio, en het ophalen van diepgaande klantinzichten.",
        dossier: {
          eigenaar: "Sectormanager PO",
          inspanningsleider: "Nader te bepalen (bijv. L&D-lead of commercieel trainer)",
          verwachtResultaat: "Medewerkers in sector PO voeren zelfverzekerd klantgesprekken vanuit een outside-in houding, waarbij zij proactief de klantbehoefte doorgronden.",
          kostenraming: "Nader te bepalen; rekening houden met externe trainings- en coachingskosten (\u00b120%)",
          randvoorwaarden: "Processen en klantfunnel zijn voldoende in kaart gebracht; businessfocus per klantsegment is bepaald.",
        },
      },
      {
        id: effortIds[2],
        title: "Implementeren en inrichten van integraal CRM-klantdashboard",
        sectorId: "Zakelijk",
        domain: "data_systemen",
        status: "gepland",
        quarter: "Nader te bepalen",
        votes: 0,
        dependencies: [],
        description: "Het bestaande CRM-systeem wordt volledig heringericht en correct ge\u00efmplementeerd zodat alle relevante klantdata eenduidig en volledig worden vastgelegd en ontsloten. Aanvullend wordt een integraal klantdashboard gebouwd dat voor alle medewerkers met klantcontact real-time inzicht biedt.",
        dossier: {
          eigenaar: "Commercieel Manager",
          inspanningsleider: "CRM Projectleider / Functioneel Beheerder",
          verwachtResultaat: "Medewerkers beschikken over een betrouwbaar, integraal klantbeeld in het CRM \u2014 inclusief productgebruik, klachtenhistorie, betaalgedrag en klantsegmentatie.",
          kostenraming: "Nader te bepalen (afhankelijk van CRM-licenties en implementatiepartner); marge 20-30%",
          randvoorwaarden: "Keuze en beschikbaarheid van CRM-platform is bevestigd; toegang tot bestaande klantdata is geregeld.",
        },
      },
      {
        id: effortIds[3],
        title: "Verankeren van outside-in mindset en klantgericht eigenaarschap",
        sectorId: "Zakelijk",
        domain: "cultuur",
        status: "gepland",
        quarter: "Nader te bepalen",
        votes: 0,
        dependencies: [],
        description: "Via boegbeelden, rolmodellen en gerichte activering wordt een outside-in cultuur gestimuleerd waarbij medewerkers actief eigenaarschap tonen in klantgesprekken en de vraag achter de vraag leren stellen.",
        dossier: {
          eigenaar: "Sectormanager",
          inspanningsleider: "Nader te bepalen (aanbevolen: teamleider commercie of HR-business partner)",
          verwachtResultaat: "Medewerkers tonen aantoonbaar eigenaarschap in klantinteracties en handelen vanuit oprechte nieuwsgierigheid naar de klantbehoefte.",
          kostenraming: "Nader te bepalen; indicatief lage tot middelgrote investering (\u00b130%)",
          randvoorwaarden: "Commitment van sectormanager en teamleiders als actieve boegbeelden.",
        },
      },
      {
        id: effortIds[4],
        title: "Werven en ontwikkelen van outside-in competenties bij medewerkers",
        sectorId: "Zakelijk",
        domain: "mens",
        status: "gepland",
        quarter: "Nader te bepalen",
        votes: 0,
        dependencies: [],
        description: "Medewerkers met klantcontact worden getraind en gecoacht op outside-in denken en werken. Parallel wordt bij nieuwe werving expliciet geselecteerd op outside-in mindset en commercieel eigenaarschap.",
        dossier: {
          eigenaar: "Sectormanager",
          inspanningsleider: "HR Business Partner / L&D-verantwoordelijke",
          verwachtResultaat: "Medewerkers beschikken aantoonbaar over de competenties om outside-in te opereren en fungeren als inspiratiebron voor collega\u2019s.",
          kostenraming: "Nader te bepalen (PM) \u2014 inclusief onzekerheidsmarge voor externe trainers/coaches",
          randvoorwaarden: "Gedragen competentieprofiel \u2018outside-in medewerker\u2019 beschikbaar als basis.",
        },
      },
      {
        id: effortIds[5],
        title: "Standaardiseren en borgen van klantinformatieprocessen organisatiebreed",
        sectorId: "Zakelijk",
        domain: "processen",
        status: "gepland",
        quarter: "Nader te bepalen",
        votes: 0,
        dependencies: [],
        description: "Voor alle rollen met klantcontact worden eenduidige werkprocessen ingericht die vastleggen hoe, wanneer en door wie klantinformatie wordt geregistreerd \u2014 van lead tot lopende relatie.",
        dossier: {
          eigenaar: "Directeur",
          inspanningsleider: "Programmamanager / Procesverantwoordelijke",
          verwachtResultaat: "Alle medewerkers met klantcontact werken volgens een gestandaardiseerd klantinformatieproces; kennisborging is procesmatig geborgd en overdraagbaar.",
          kostenraming: "\u20ac15.000\u2013\u20ac35.000 (\u00b130%)",
          randvoorwaarden: "Besluitvorming over CRM-inrichting is afgerond of loopt parallel; directie stelt proceseigenaarschap formeel in.",
        },
      },
      {
        id: effortIds[6],
        title: "Trainen medewerkers in klantgerichte gespreksvaardigheden VO",
        sectorId: "VO",
        domain: "mens",
        status: "gepland",
        quarter: "Nader te bepalen",
        votes: 0,
        dependencies: [],
        description: "Medewerkers met klantcontact in sector VO worden opgeleid en gecoacht in outside-in gespreksvaardigheden: de vraag achter de vraag stellen, een sturend waardeverhaal voeren vanuit het VO-portfolio, en diepgaande klantinzichten ophalen bij scholen en besturen.",
        dossier: {
          eigenaar: "Sectormanager VO",
          inspanningsleider: "L&D-lead / commercieel trainer VO",
          verwachtResultaat: "Medewerkers in sector VO voeren zelfverzekerd klantgesprekken vanuit een outside-in houding, waarbij zij proactief de klantbehoefte doorgronden en als inhoudelijk partner optreden.",
          kostenraming: "Nader te bepalen; rekening houden met externe trainings- en coachingskosten (\u00b120%)",
          randvoorwaarden: "Processen en klantfunnel zijn voldoende in kaart gebracht; businessfocus per klantsegment is bepaald.",
        },
      },
      {
        id: effortIds[7],
        title: "Verankeren van outside-in leiderschap als rolmodel gedrag VO",
        sectorId: "VO",
        domain: "cultuur",
        status: "gepland",
        quarter: "Nader te bepalen",
        votes: 0,
        dependencies: [],
        description: "Leidinggevenden binnen de VO-sector ontwikkelen en tonen zichtbaar buiten-naar-binnen-denken als norm: zij cre\u00ebren bewust ruimte om medewerkers uit te nodigen klantgericht te handelen, door te vragen naar de vraag achter de vraag, en lef en creativiteit te stimuleren. Via gerichte leiderschapsinterventies wordt het goede voorbeeld gesteld zodat outside-in denken een gedeeld cultureel vertrekpunt wordt.",
        dossier: {
          eigenaar: "Sectormanager VO",
          inspanningsleider: "Programmamanager / HR Business Partner VO",
          verwachtResultaat: "Leidinggevenden en medewerkers voelen zich vrij en veilig om klantgericht gedrag te tonen en hierop aan te spreken, zichtbaar in een stijging van de NPS-score en een groter aandeel klantgesprekken dat als samenwerkingsgerichte dialoog wordt gekwalificeerd.",
          kostenraming: "\u20ac 30.000 \u2013 \u20ac 60.000 (afhankelijk van aantal leiderschapssessies en intervisietraject); onzekerheidsmarge \u00b130%",
          randvoorwaarden: "Commitment van sectormanager VO als zichtbaar sponsor en deelnemend rolmodel.",
        },
      },
      {
        id: effortIds[8],
        title: "CRM-klantbeeld voor sector PO inrichten",
        sectorId: "PO",
        domain: "data_systemen",
        status: "gepland",
        quarter: "Nader te bepalen",
        votes: 0,
        dependencies: [],
        description: "Richt het centrale CRM zo in dat accountmanagers en sectormanagement PO een integraal klantbeeld hebben van scholen en besturen: contactmomenten, productgebruik, verbetersignalen en escalaties. Het CRM is het systeem voor klantrelatiebeheer — niet te verwarren met het leerlingvolgsysteem (dat registreert leerlingdata, geen klantrelaties).",
        dossier: {
          eigenaar: "Sectormanager PO",
          inspanningsleider: "CRM Projectleider / Functioneel Beheerder PO",
          verwachtResultaat: "PO-medewerkers hebben in \u00e9\u00e9n dashboard zicht op klantcontactgeschiedenis, productgebruik van scholen en besturen en openstaande signalen \u2014 waardoor proactief handelen en kwalitatieve dialogen mogelijk worden.",
          kostenraming: "Nader te bepalen (deels gedeelde infra met Zakelijk en VO); marge 20-30%",
          randvoorwaarden: "Gedeelde CRM-platformkeuze met Zakelijk en VO; klantdata PO ontsloten en opgeschoond.",
        },
      },
      {
        id: effortIds[9],
        title: "CRM-klantbeeld voor sector VO inrichten",
        sectorId: "VO",
        domain: "data_systemen",
        status: "gepland",
        quarter: "Nader te bepalen",
        votes: 0,
        dependencies: [],
        description: "Richt het centrale CRM zo in dat accountmanagers en sectormanagement VO een integraal klantbeeld hebben van scholen, besturen en samenwerkingsverbanden. CRM registreert de relatie (contactmomenten, signalen, aanbestedingen); het leerlingvolgsysteem is een apart systeem voor leerlingdata en valt buiten deze scope.",
        dossier: {
          eigenaar: "Sectormanager VO",
          inspanningsleider: "CRM Projectleider / Functioneel Beheerder VO",
          verwachtResultaat: "VO-medewerkers hebben in \u00e9\u00e9n dashboard zicht op schoolbesturen, aanbestedingstrajecten en gebruiksdata van VO-producten \u2014 basis voor proactief relatiebeheer.",
          kostenraming: "Nader te bepalen (deels gedeelde infra met PO en Zakelijk); marge 20-30%",
          randvoorwaarden: "Gedeelde CRM-platformkeuze met PO en Zakelijk; klantdata VO ontsloten en opgeschoond.",
        },
      },
    ],
    goalBenefitMaps: [
      { goalId: goalIds[0], benefitId: benefitIds[0] },
      { goalId: goalIds[0], benefitId: benefitIds[1] },
      { goalId: goalIds[0], benefitId: benefitIds[2] },
    ],
    benefitCapabilityMaps: [
      { benefitId: benefitIds[0], capabilityId: capIds[0] },
      { benefitId: benefitIds[1], capabilityId: capIds[1] },
      { benefitId: benefitIds[2], capabilityId: capIds[2] },
    ],
    capabilityEffortMaps: [
      { capabilityId: capIds[1], effortId: effortIds[0] }, // PO cap → PO cultuur
      { capabilityId: capIds[1], effortId: effortIds[1] }, // PO cap → PO mens
      { capabilityId: capIds[0], effortId: effortIds[2] }, // Zakelijk cap → Zakelijk data
      { capabilityId: capIds[0], effortId: effortIds[3] }, // Zakelijk cap → Zakelijk cultuur
      { capabilityId: capIds[0], effortId: effortIds[4] }, // Zakelijk cap → Zakelijk mens
      { capabilityId: capIds[0], effortId: effortIds[5] }, // Zakelijk cap → Zakelijk processen
      { capabilityId: capIds[2], effortId: effortIds[6] }, // VO cap → VO mens
      { capabilityId: capIds[2], effortId: effortIds[7] }, // VO cap → VO cultuur
      { capabilityId: capIds[1], effortId: effortIds[8] }, // PO cap → PO CRM
      { capabilityId: capIds[2], effortId: effortIds[9] }, // VO cap → VO CRM
    ],
    projectCapabilityMaps: [],
    completedGoals: [],
    crossAnalyseWizard: {
      currentStep: 6,
      completedSteps: [1, 2, 3, 4, 5],
      wizardVersion: 2,
      stepResults: {
        stap1: {
          batenPerSector: [
            {
              sector: "PO",
              baten: [
                {
                  titel: "Hogere klanttevredenheid PO-scholen",
                  doelId: goalIds[0],
                  doelNaam: "Integraal klantbeeld en outside-in werken",
                },
              ],
            },
            {
              sector: "VO",
              baten: [
                {
                  titel: "Inhoudelijk partnerschap met VO-besturen",
                  doelId: goalIds[0],
                  doelNaam: "Integraal klantbeeld en outside-in werken",
                },
              ],
            },
            {
              sector: "Zakelijk",
              baten: [
                {
                  titel: "Hogere conversie en duurzame klantrelaties Zakelijk",
                  doelId: goalIds[0],
                  doelNaam: "Integraal klantbeeld en outside-in werken",
                },
              ],
            },
          ],
          synergieën: [
            {
              beschrijving:
                "Outside-in competentie en klantgerichte gespreksvoering zijn in alle drie sectoren ontbrekend — gezamenlijk ontwikkeltraject geeft schaal.",
              sectoren: ["PO", "VO", "Zakelijk"],
              impact: "Hoog — raakt alle primaire klantinteracties en NPS",
            },
            {
              beschrijving:
                "Betrouwbare klantdata is voorwaarde voor proactief handelen in PO/VO (leerlingvolgsysteem) én Zakelijk (CRM) — systemen verschillen maar de datadiscipline is dezelfde.",
              sectoren: ["PO", "VO", "Zakelijk"],
              impact: "Middel — verschillende systemen, wel gedeelde governance-principes",
            },
          ],
          gaps: {
            doelenZonderBaten: [],
            batenZonderVermogens: [],
          },
          samenvatting:
            "Alle drie sectoren formuleren klantgerichte baten die aansluiten op doel 1 (outside-in werken). Synergie-potentieel ligt vooral bij Mens (gespreksvoering) en Cultuur (eigenaarschap); Data/Systemen en Processen blijven sector-eigen.",
        },
        stap2: {
          vermogenClusters: [],
          hefboomwerking: [],
          vermogenGelijkenisGroepen: [
            {
              id: "groep-klantpartnerschap",
              vermogenIds: [capIds[0], capIds[1], capIds[2]],
              // Praktisch: gebruik de kern-term die alle drie vermogens al dragen ("klantpartnerschap" / "commerciële slagkracht"),
              // zonder een kunstmatig nieuwe label te verzinnen. De drie sector-vermogens blijven intact met hun eigen titel.
              gezamenlijkeOmschrijving:
                "Strategisch klantpartnerschap — gedeelde methodische kern over PO, VO en Zakelijk",
              reden:
                "PO en VO dragen letterlijk de term 'Strategisch klantpartnerschap' in hun vermogenstitel; Zakelijk heeft dezelfde methodische kern onder de benaming 'Klantgerichte commerciële slagkracht'. Alle drie vermogens vragen om: (a) medewerkers die outside-in het klantgesprek voeren, (b) betrouwbare klantdata in één systeem, en (c) een cultuur van eigenaarschap. De vermogens blijven sector-eigen (context, klantgroep, producten verschillen) — de hefboom zit in het gezamenlijk ontwikkelen van de onderliggende inspanningen per domein.",
            },
          ],
          samenvatting:
            "Cross-analyse identificeert één sectoroverstijgende hefboomgroep rond strategisch klantpartnerschap. De drie vermogens behouden hun sector-eigen titel — de winst zit in gedeelde inspanningen per domein (mens, cultuur, data/systemen) onder dezelfde methodische noemer.",
        },
        stap3: {
          inspanningClusters: [
            {
              clusterTitel:
                "Outside-in gespreksvaardigheidstraining (mens) — PO/VO/Zakelijk",
              items: [
                {
                  id: effortIds[1],
                  beschrijving:
                    "Trainen medewerkers in klantgerichte gespreksvaardigheden PO",
                  sector: "PO",
                  domein: "mens",
                },
                {
                  id: effortIds[6],
                  beschrijving:
                    "Trainen medewerkers in klantgerichte gespreksvaardigheden VO",
                  sector: "VO",
                  domein: "mens",
                },
                {
                  id: effortIds[4],
                  beschrijving:
                    "Werven en ontwikkelen van outside-in competenties bij medewerkers",
                  sector: "Zakelijk",
                  domein: "mens",
                },
              ],
              batenContext: [
                {
                  baat: "Hogere klanttevredenheid PO-scholen",
                  sector: "PO",
                },
                {
                  baat: "Inhoudelijk partnerschap met VO-besturen",
                  sector: "VO",
                },
                {
                  baat: "Hogere conversie en duurzame klantrelaties Zakelijk",
                  sector: "Zakelijk",
                },
              ],
              advies:
                "Drie sectoren werken aan vergelijkbare gespreksvaardigheden en outside-in competenties. Scope: gezamenlijke curriculumkern (doorvragen, waardeverhaal, klantbehoefte doorgronden) + sector-specifieke casuïstiek modules (PO: leerkracht/bestuur, VO: schoolleider/aanbesteding, Zakelijk: opdrachtgever/RFP). Aanpak: één programma-ontwerp, drie sector-rollouts met gedeelde trainers en intervisie tussen sectoren. Kostenbesparing ~30% t.o.v. drie losse trajecten; cultuurvoordeel: gedeeld vocabulaire over sectoren.",
              aanbeveling: "combineren",
            },
            {
              clusterTitel:
                "Outside-in leiderschap & eigenaarschap (cultuur) — PO/VO/Zakelijk",
              items: [
                {
                  id: effortIds[0],
                  beschrijving:
                    "Verankeren van outside-in leiderschap als rolmodel gedrag (PO)",
                  sector: "PO",
                  domein: "cultuur",
                },
                {
                  id: effortIds[7],
                  beschrijving:
                    "Verankeren van outside-in leiderschap als rolmodel gedrag VO",
                  sector: "VO",
                  domein: "cultuur",
                },
                {
                  id: effortIds[3],
                  beschrijving:
                    "Verankeren van outside-in mindset en klantgericht eigenaarschap",
                  sector: "Zakelijk",
                  domein: "cultuur",
                },
              ],
              batenContext: [
                {
                  baat: "Hogere klanttevredenheid PO-scholen",
                  sector: "PO",
                },
                {
                  baat: "Inhoudelijk partnerschap met VO-besturen",
                  sector: "VO",
                },
                {
                  baat: "Hogere conversie en duurzame klantrelaties Zakelijk",
                  sector: "Zakelijk",
                },
              ],
              advies:
                "Leiderschap als multiplier voor outside-in gedrag geldt identiek in alle drie sectoren. Scope: sectoroverstijgend leiderschapsprogramma met drie kernelementen — (1) rolmodel-gedrag (zichtbare klantbezoeken door sectormanagers), (2) intervisie-cyclus tussen sectoren (kruis-bestuiving met klantcases), (3) sturings-KPI's gekoppeld aan klantdialoog-kwaliteit. Drie sector-specifieke tracks binnen één programma; shared faculty. Aanpak: fase 1 kick-off met directie; fase 2 intervisies per kwartaal; fase 3 evaluatie via NPS en medewerker-feedback.",
              aanbeveling: "combineren",
            },
            {
              clusterTitel:
                "CRM-klantbeeld inrichten (data & systemen) — PO/VO/Zakelijk",
              items: [
                {
                  id: effortIds[2],
                  beschrijving:
                    "Implementeren en inrichten van integraal CRM-klantdashboard (Zakelijk)",
                  sector: "Zakelijk",
                  domein: "data_systemen",
                },
                {
                  id: effortIds[8],
                  beschrijving: "CRM-klantbeeld voor sector PO inrichten",
                  sector: "PO",
                  domein: "data_systemen",
                },
                {
                  id: effortIds[9],
                  beschrijving: "CRM-klantbeeld voor sector VO inrichten",
                  sector: "VO",
                  domein: "data_systemen",
                },
              ],
              batenContext: [
                { baat: "Hogere klanttevredenheid PO-scholen", sector: "PO" },
                { baat: "Inhoudelijk partnerschap met VO-besturen", sector: "VO" },
                {
                  baat: "Hogere conversie en duurzame klantrelaties Zakelijk",
                  sector: "Zakelijk",
                },
              ],
              advies:
                "CRM is het systeem voor klantrelatiebeheer — dit geldt voor alle drie sectoren (scholen, besturen, zakelijke opdrachtgevers). Het leerlingvolgsysteem is een apart systeem voor leerlingdata en valt hier buiten scope. Drie aparte CRM-trajecten levert datasilo's, licentiecontracten en dubbele platform-keuzes op; één gedeelde CRM-implementatie met sector-specifieke views is de hefboom. Scope: gezamenlijke platformkeuze, één datamodel voor klantrelaties, sector-specifieke dashboards. Niet in scope: leerlingvolgsysteem, productie-data, financiële systemen.",
              aanbeveling: "combineren",
            },
            {
              clusterTitel: "Standaardisatie klantinformatieprocessen (Zakelijk)",
              items: [
                {
                  id: effortIds[5],
                  beschrijving:
                    "Standaardiseren en borgen van klantinformatieprocessen organisatiebreed",
                  sector: "Zakelijk",
                  domein: "processen",
                },
              ],
              batenContext: [
                {
                  baat: "Hogere conversie en duurzame klantrelaties Zakelijk",
                  sector: "Zakelijk",
                },
              ],
              advies:
                "Procesflows voor lead-to-deal zijn specifiek voor Zakelijk; PO/VO werken met andere inkoop- en samenwerkingscycli (aanbestedingen, schoolbesturen, bestelcycli). Standaardisatie kan per sector lopen — wel borgen dat de proces-output (klantdata) straks in het gedeelde CRM landt.",
              aanbeveling: "apart_houden",
            },
          ],
          projectMatching: [],
          samenvatting:
            "Vier inspanningsclusters geïdentificeerd onder de vermogen-gelijkenisgroep: mens (3 sectoren — combineren), cultuur (3 sectoren — combineren), data & systemen CRM (3 sectoren — combineren), processen (alleen Zakelijk — apart). Drie van de vier inspanningsbundels zijn sectoroverstijgend samen te voegen; alleen proces-standaardisatie blijft sector-eigen.",
        },
        stap4: {
          consolidatieAdvies: [
            {
              clusterTitel:
                "Outside-in gespreksvaardigheidstraining (mens) — PO/VO/Zakelijk",
              type: "inspanning",
              aanbeveling: "combineren",
              reden:
                "Drie sectoren investeren in vergelijkbare gespreksvaardigheden. Eén gezamenlijk programma met gedeelde curriculumkern + sector-specifieke casuïstiek realiseert ~30% kostenbesparing, consistenter vocabulaire over sectoren, en gedeelde trainers/intervisie. Sector-eigenheid blijft behouden via modules (PO: leerkracht/bestuur, VO: schoolleider/aanbesteding, Zakelijk: opdrachtgever/RFP).",
              voorgesteldeNaam:
                "Sectoroverstijgende outside-in gespreksvaardigheidstraining",
              afstemmingsStappen: [
                "Q2 2026: stel gezamenlijk programmaontwerp op met L&D-verantwoordelijken uit alle drie sectoren; definieer kerncompetenties + sector-specifieke casuïstiek.",
                "Q3 2026: selecteer externe trainers/coaches die multi-sector casuïstiek aankunnen; richt train-de-trainer-traject in voor sectormanagers.",
                "Q4 2026 — Q2 2027: rol gefaseerd uit per sector (PO eerst, dan VO, dan Zakelijk); borg intervisie tussen sectoren per kwartaal.",
                "Q3 2027: meet effect via NPS, gesprekskwaliteit-observaties en medewerker-feedback; itereer curriculum.",
              ],
            },
            {
              clusterTitel:
                "Outside-in leiderschap & eigenaarschap (cultuur) — PO/VO/Zakelijk",
              type: "inspanning",
              aanbeveling: "combineren",
              reden:
                "Leiderschap is de multiplier voor outside-in gedrag — zichtbaar rolmodel-gedrag van sectormanagers bepaalt de mate waarin medewerkers eigenaarschap durven nemen. Drie gefragmenteerde leiderschapstrajecten leveren drie verschillende interpretaties van 'outside-in'; één gezamenlijk programma met sector-tracks borgt consistentie en versterkt de boodschap organisatiebreed.",
              voorgesteldeNaam:
                "Sectoroverstijgende outside-in leiderschapsontwikkeling",
              afstemmingsStappen: [
                "Q2 2026: kick-off met directie en drie sectormanagers — commitment op zichtbaar rolmodel-gedrag (klantbezoeken, ophaalgesprekken, mee-lopen in de sector).",
                "Q3 2026: start intervisie-cyclus per kwartaal met gemixte groepen sectormanagers + teamleiders (kruis-bestuiving op klantcases).",
                "Q4 2026: koppel outside-in KPI's aan leidinggevenden-performance (%klantdialogen met inhoudelijke regie, NPS-beweging binnen team).",
                "Q2 2027: evaluatie via 360° feedback en NPS-beweging; stel jaardoelen voor komende cyclus bij.",
              ],
            },
            {
              clusterTitel:
                "CRM-klantbeeld inrichten (data & systemen) — PO/VO/Zakelijk",
              type: "inspanning",
              aanbeveling: "combineren",
              reden:
                "CRM is het systeem voor klantrelatiebeheer en is in álle drie sectoren nodig (scholen, besturen, zakelijke opdrachtgevers). Het leerlingvolgsysteem is een ander systeem (leerlingdata, niet klantrelaties) en valt hier buiten. Drie aparte CRM-trajecten leidt tot datasilo's, onverenigbare datamodellen en dubbele licentiecontracten. Scope: één gedeeld CRM-platform, één klantdata-model, sector-specifieke dashboards/views. Niet in scope: leerlingvolgsysteem, productie-data, financiële systemen.",
              voorgesteldeNaam: "Gedeeld CRM-klantbeeld (PO/VO/Zakelijk)",
              afstemmingsStappen: [
                "Q2 2026: gezamenlijke platformkeuze (Salesforce / HubSpot / MS Dynamics) met IT-architect, sectormanagers en data-governance.",
                "Q3 2026: definieer één klantdata-model (accounts, contacten, interacties, signalen) dat alle drie sectoren ondersteunt; leg rollen, rechten en data-eigenaarschap per sector vast.",
                "Q4 2026: implementeer basis-CRM + sector-specifieke dashboards; migreer klantdata per sector gefaseerd.",
                "Q1 2027: borg koppelingen met nevenbronnen (productgebruik, verbetersignalen) per sector; ontsluit via dashboard.",
                "Q2 2027: meet adoptie (% medewerkers met wekelijks gebruik), datakwaliteit en klantdialoog-effect.",
              ],
            },
            {
              clusterTitel: "Standaardisatie klantinformatieprocessen (Zakelijk)",
              type: "inspanning",
              aanbeveling: "apart_houden",
              reden:
                "Procesflows voor lead-to-deal zijn specifiek voor Zakelijk (salescycli, RFP's, commerciële opvolging). PO/VO hebben andere procescycli (aanbestedingen, schoolbestuur-overleg, bestelrondes). Niet combineerbaar zonder sector-eigen waarde te verliezen. Wel borgen dat proces-output (klantdata) in het gedeelde CRM landt — koppeling met CRM-cluster is kritiek.",
              voorgesteldeNaam: null,
              afstemmingsStappen: [
                "Q3 2026: proces-design Zakelijk (lead-to-deal-flow) met commerciële manager en procesverantwoordelijke.",
                "Q4 2026: koppel proces-output aan CRM-klantbeeld (zodra CRM-cluster live is).",
                "Q1 2027: evalueer of PO/VO hun eigen proces-standaardisatie willen, gebruikmakend van dezelfde proces-methodologie maar sector-eigen flow.",
              ],
            },
          ],
          citobreedInzicht: [
            {
              domein: "mens",
              titel: "Outside-in competentie is organisatiebrede hefboom",
              beschrijving:
                "Gespreksvaardigheden en commerciële outside-in mindset worden in alle drie sectoren ontwikkeld. Gezamenlijk curriculum reduceert kosten ~30% en versterkt consistent vocabulaire tussen sectoren. Scope: kern-curriculum + sector-specifieke casuïstiek modules. Aanpak: train-de-trainer via sectormanagers.",
              onderbouwing:
                "Drie inspanningen (PO/VO/Zakelijk) met overlappende doelstellingen én gedeelde baten-indicatoren (NPS, klanttevredenheid, conversie).",
              relevanteItems: [effortIds[1], effortIds[6], effortIds[4]],
            },
            {
              domein: "cultuur",
              titel: "Leiderschap als multiplier voor gedragsverandering",
              beschrijving:
                "Outside-in gedrag vraagt zichtbare rolmodellen op leiderschapsniveau. Sectoroverstijgend programma met sector-tracks voorkomt dat drie sectormanagers elk hun eigen interpretatie geven. Scope: gezamenlijke visie + intervisie, sector-specifieke KPI's.",
              onderbouwing:
                "Drie cultuur-inspanningen met vergelijkbare interventies (sessies, intervisie, rolmodel-gedrag) onder verschillende sectormanagers.",
              relevanteItems: [effortIds[0], effortIds[7], effortIds[3]],
            },
            {
              domein: "data_systemen",
              titel: "CRM-klantbeeld organisatiebreed — niet te verwarren met leerlingvolgsysteem",
              beschrijving:
                "CRM is het systeem voor klantrelatiebeheer (scholen, besturen, opdrachtgevers) en is in alle drie sectoren vereist voor proactief handelen. Het leerlingvolgsysteem is een apart systeem voor leerlingdata en valt buiten scope. Gezamenlijke CRM-keuze voorkomt datasilo's en dubbele platform-investeringen.",
              onderbouwing:
                "Drie data & systemen-inspanningen (CRM per sector) met identieke systeembehoefte: klantrelaties, contacthistorie, signalen, aanbestedingen. Eén platform + sector-views is technisch en organisatorisch haalbaar.",
              relevanteItems: [effortIds[2], effortIds[8], effortIds[9]],
            },
          ],
          subEffortAnalysis: [
            {
              groepId: "groep-klantpartnerschap",
              domein: "mens",
              actie: "combineren",
              items: [effortIds[1], effortIds[4], effortIds[6]], // PO training + Zakelijk werven + VO training
              reden:
                "Scope: gezamenlijk curriculum outside-in gespreksvaardigheden + sector-specifieke casuïstiek modules. Stappen: (1) Q2 2026 gezamenlijk programmaontwerp met L&D uit 3 sectoren, (2) Q3 train-de-trainer voor sectormanagers, (3) Q4 → Q2 2027 gefaseerde rollout per sector met kwartaal-intervisies, (4) Q3 2027 effectmeting via NPS + gesprekskwaliteit. Besparing ~30% t.o.v. drie losse trajecten; consistenter vocabulaire over sectoren.",
              voorgesteldeNaam:
                "Sectoroverstijgende outside-in gespreksvaardigheidstraining",
            },
            {
              groepId: "groep-klantpartnerschap",
              domein: "cultuur",
              actie: "combineren",
              items: [effortIds[0], effortIds[3], effortIds[7]], // PO leiderschap + Zakelijk mindset + VO leiderschap
              reden:
                "Scope: sectoroverstijgend leiderschapsprogramma met sector-tracks. Stappen: (1) Q2 2026 kick-off met directie + 3 sectormanagers (commitment op rolmodel-gedrag), (2) Q3 start kwartaal-intervisies met gemixte groepen sectormanagers + teamleiders, (3) Q4 koppel outside-in KPI's aan leidinggevenden-performance, (4) Q2 2027 evaluatie via 360° feedback + NPS-beweging. Voorkomt dat drie sectormanagers ieder hun eigen interpretatie geven van 'outside-in'.",
              voorgesteldeNaam:
                "Sectoroverstijgende outside-in leiderschapsontwikkeling",
            },
            {
              groepId: "groep-klantpartnerschap",
              domein: "data_systemen",
              actie: "combineren",
              items: [effortIds[2], effortIds[8], effortIds[9]], // Zakelijk + PO + VO CRM
              reden:
                "CRM is organisatiebreed van toepassing (klantrelatiebeheer scholen/besturen/opdrachtgevers). Leerlingvolgsysteem is een ander systeem en valt buiten scope. Scope: één gedeeld CRM-platform, één klantdata-model, sector-specifieke dashboards. Stappen: (1) Q2 2026 gezamenlijke platformkeuze (Salesforce/HubSpot/Dynamics) met IT + sectormanagers + data-governance, (2) Q3 klantdata-model + rollen/rechten per sector, (3) Q4 basis-implementatie + sector-dashboards + gefaseerde data-migratie, (4) Q1 2027 koppelingen met productgebruik/signalen, (5) Q2 2027 meet adoptie + datakwaliteit. Voorkomt datasilo's, dubbele licentiecontracten en onverenigbare datamodellen.",
              voorgesteldeNaam:
                "Gedeeld CRM-klantbeeld (PO/VO/Zakelijk)",
            },
            {
              groepId: "groep-klantpartnerschap",
              domein: "processen",
              actie: "apart_houden",
              items: [effortIds[5]], // alleen Zakelijk processen
              reden:
                "Lead-to-deal procesflow is specifiek voor Zakelijk (salescycli, RFP's, commerciële opvolging). PO/VO hebben andere procescycli (aanbestedingen, schoolbestuur-overleg, bestelrondes). Scope: proces-standaardisatie Zakelijk, met borging dat proces-output in gedeelde CRM landt. Stappen: (1) Q3 2026 proces-design Zakelijk, (2) Q4 koppel proces-output aan CRM, (3) Q1 2027 evalueer of PO/VO sector-eigen proces-standaardisatie willen via zelfde methodologie.",
              voorgesteldeNaam: null,
            },
          ],
          samenvatting:
            "Op domein-niveau zijn mens (training), cultuur (leiderschap) én data & systemen (CRM) combineerbaar over alle drie sectoren — drie gedeelde inspanningsbundels in plaats van negen losse trajecten. Alleen procesinrichting blijft sector-eigen (Zakelijk lead-to-deal ≠ PO/VO aanbestedingscycli), met een kritieke borging dat proces-output in het gedeelde CRM landt.",
        },
      },
    },
  };
}
