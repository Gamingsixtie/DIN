// Demo data voor DIN-app — gebaseerd op Cito context
import type { DINSession } from "./types";

export function createDemoSession(): DINSession {
  const id = crypto.randomUUID();
  const now = new Date().toISOString();

  // IDs
  const goalIds = [g(), g(), g(), g(), g()];
  const benefitIds = [g(), g(), g(), g(), g(), g(), g(), g(), g(), g(), g(), g()];
  const capIds = [g(), g(), g(), g(), g(), g(), g(), g(), g(), g(), g(), g()];
  const effortIds = [g(), g(), g(), g(), g(), g(), g(), g(), g(), g(), g(), g(), g(), g(), g(), g()];

  return {
    id,
    name: "Demo — Cito Programma 2026",
    createdAt: now,
    updatedAt: now,
    currentStep: 1,
    vision: {
      id: g(),
      uitgebreid:
        "Cito transformeert naar een outside-in organisatie die vanuit klantbehoeften werkt. We combineren onze toetsexpertise met data-gedreven inzichten om scholen, docenten en leerlingen beter te ondersteunen bij leren en ontwikkeling. We bouwen aan een organisatie die wendbaar, klantgericht en innovatief is.",
      beknopt:
        "Cito wordt een outside-in organisatie die vanuit klantbehoeften toetsexpertise en data-inzichten combineert om onderwijs beter te maken.",
    },
    goals: [
      {
        id: goalIds[0],
        name: "Outside-in competentie verankeren",
        description:
          "Medewerkers denken en handelen vanuit de klant. Outside-in werken is de standaard in alle sectoren.",
        rank: 1,
      },
      {
        id: goalIds[1],
        name: "Digitale toetservaring verbeteren",
        description:
          "Een naadloze, gebruiksvriendelijke digitale toetservaring voor leerlingen en docenten in PO en VO.",
        rank: 2,
      },
      {
        id: goalIds[2],
        name: "Data-gedreven inzichten voor scholen",
        description:
          "Scholen krijgen bruikbare, data-gedreven inzichten die direct bijdragen aan onderwijsverbetering.",
        rank: 3,
      },
      {
        id: goalIds[3],
        name: "Zakelijke markt uitbouwen",
        description:
          "Groei in de zakelijke markt door assessment- en certificeringsdiensten te professionaliseren.",
        rank: 4,
      },
      {
        id: goalIds[4],
        name: "Organisatie wendbaarheid vergroten",
        description:
          "Cito wordt een wendbare organisatie die snel kan inspelen op veranderende klantbehoeften en marktdynamiek.",
        rank: 5,
      },
    ],
    scope: {
      id: g(),
      inScope: [
        "PO toetsportfolio (LOVS, Eindtoets)",
        "VO toetsproducten en -diensten",
        "Zakelijke markt (assessments, certificering)",
        "Digitale platformen en tooling",
        "Organisatieontwikkeling en cultuurverandering",
      ],
      outScope: [
        "Staatsexamens (apart traject)",
        "Internationale projecten fase 1",
        "Fysieke kantoorinrichting",
      ],
    },
    sectorPlans: [
      {
        id: g(),
        sectorName: "PO",
        rawText:
          "PO Sectorplan 2026\n\nOnze ambitie is om het primair onderwijs te voorzien van de beste toetsen en leerlingvolgsystemen. We richten ons op:\n\n1. Vernieuwing LOVS: het leerlingvolgsysteem wordt volledig digitaal, adaptief en gebruiksvriendelijk. Docenten krijgen real-time inzichten in leerlingprestaties.\n\n2. Eindtoets doorontwikkeling: verdere digitalisering en personalisatie van de eindtoets, met betere rapportages voor scholen en ouders.\n\n3. Klantrelatie versterken: structureel klantcontact via accountmanagement, klanttevredenheidsmetingen en co-creatie met scholen.\n\n4. Data & Analytics: scholen helpen met data-gedreven besluitvorming via dashboards en benchmarking.\n\n5. Professionalisering docenten: trainingen en workshops over toetsgebruik en data-interpretatie.",
        uploadedAt: now,
      },
      {
        id: g(),
        sectorName: "VO",
        rawText:
          "VO Sectorplan 2026\n\nDe sector Voortgezet Onderwijs richt zich op het versterken van de positie in de VO-markt:\n\n1. Digitale toetsomgeving: een volledig digitale, schaalbare toetsomgeving die aansluit op de behoeften van VO-scholen.\n\n2. Formatief toetsen: uitbouwen van formatieve toetsmogelijkheden die docenten ondersteunen bij dagelijkse onderwijspraktijk.\n\n3. Samenwerking met scholen: intensivering van de samenwerking met VO-scholen via pilotprogramma's en feedbackloops.\n\n4. Leerlingrapportages: rijkere, meer inzichtelijke rapportages die leerlingen en ouders beter informeren.\n\n5. Innovatie: investeren in AI-gedreven toetsconstructie en automatische scoring.",
        uploadedAt: now,
      },
      {
        id: g(),
        sectorName: "Zakelijk",
        rawText:
          "Zakelijk Sectorplan 2026\n\nDe zakelijke markt biedt groeikansen voor Cito:\n\n1. Assessment portfolio: professionalisering en uitbreiding van het assessment-aanbod voor bedrijven en overheden.\n\n2. Certificering: opzetten van een robuust certificeringsprogramma met digitale afname en verificatie.\n\n3. Klantacquisitie: actieve marktbewerking via account-based marketing en partnerships.\n\n4. Maatwerk: flexibele, op maat gemaakte toets- en assessmentoplossingen voor grote organisaties.\n\n5. Internationale expansie: verkennen van mogelijkheden in Vlaanderen en Duitsland voor assessment-diensten.",
        uploadedAt: now,
      },
    ],
    pmcEntries: [],

    // --- DIN Netwerk ---
    benefits: [
      // Doel 1: Outside-in — PO, VO, Zakelijk
      { id: benefitIds[0], goalId: goalIds[0], sectorId: "PO", description: "Hogere klanttevredenheid bij PO-scholen", profiel: { bateneigenaar: "Sectormanager PO", indicator: "NPS score PO", indicatorOwner: "BI-specialist PO", currentValue: "32", targetValue: "50" } },
      { id: benefitIds[1], goalId: goalIds[0], sectorId: "VO", description: "Sterkere partnerbeleving bij VO-scholen", profiel: { bateneigenaar: "Sectormanager VO", indicator: "Partnerscore VO-enquête", indicatorOwner: "Marktonderzoeker VO", currentValue: "5.8", targetValue: "7.5" } },
      { id: benefitIds[2], goalId: goalIds[0], sectorId: "Zakelijk", description: "Grotere klanttevredenheid zakelijke dienstverlening", profiel: { bateneigenaar: "Commercieel directeur", indicator: "Klanttevredenheid zakelijk", indicatorOwner: "Controller Zakelijk", currentValue: "6.5", targetValue: "8.0" } },

      // Doel 2: Digitale toetservaring — PO & VO
      { id: benefitIds[3], goalId: goalIds[1], sectorId: "PO", description: "Hogere betrouwbaarheid digitale LOVS-afname", profiel: { bateneigenaar: "Productmanager LOVS", indicator: "Succesvolle digitale afnames (%)", indicatorOwner: "Testcoördinator PO", currentValue: "72%", targetValue: "95%" } },
      { id: benefitIds[4], goalId: goalIds[1], sectorId: "VO", description: "Breder digitaal toetsaanbod voor VO", profiel: { bateneigenaar: "Productmanager VO", indicator: "Digitaal aanbod (%)", indicatorOwner: "BI-specialist VO", currentValue: "40%", targetValue: "85%" } },

      // Doel 3: Data-gedreven inzichten
      { id: benefitIds[5], goalId: goalIds[2], sectorId: "PO", description: "Meer gebruik van data-inzichten door PO-scholen", profiel: { bateneigenaar: "Sectormanager PO", indicator: "Actieve dashboard-gebruikers", indicatorOwner: "Data-analist PO", currentValue: "120", targetValue: "500" } },
      { id: benefitIds[6], goalId: goalIds[2], sectorId: "VO", description: "Beter real-time inzicht in leerlingvoortgang voor VO-docenten", profiel: { bateneigenaar: "Sectormanager VO", indicator: "Docenten met dashboard-toegang", indicatorOwner: "Data-analist VO", currentValue: "200", targetValue: "1500" } },

      // Doel 4: Zakelijke markt
      { id: benefitIds[7], goalId: goalIds[3], sectorId: "Zakelijk", description: "Hogere omzet zakelijke assessments", profiel: { bateneigenaar: "Commercieel directeur", indicator: "Omzet zakelijk (M€)", indicatorOwner: "Controller Zakelijk", currentValue: "4.2", targetValue: "5.5" } },
      { id: benefitIds[8], goalId: goalIds[3], sectorId: "Zakelijk", description: "Meer certificeringsklanten", profiel: { bateneigenaar: "Sales manager Zakelijk", indicator: "Nieuwe certificeringsklanten", indicatorOwner: "CRM-beheerder", currentValue: "0", targetValue: "10" } },

      // Doel 5: Wendbaarheid
      { id: benefitIds[9], goalId: goalIds[4], sectorId: "PO", description: "Kortere time-to-market voor PO-producten", profiel: { bateneigenaar: "Productmanager PO", indicator: "Time-to-market (maanden)", indicatorOwner: "Projectcontroller PO", currentValue: "18", targetValue: "9" } },
      { id: benefitIds[10], goalId: goalIds[4], sectorId: "VO", description: "Snellere doorlooptijd bij curriculumwijzigingen VO", profiel: { bateneigenaar: "Sectormanager VO", indicator: "Doorlooptijd aanpassing (weken)", indicatorOwner: "Projectcontroller VO", currentValue: "12", targetValue: "4" } },
      { id: benefitIds[11], goalId: goalIds[4], sectorId: "Zakelijk", description: "Kortere levertijd zakelijke maatwerkproducten", profiel: { bateneigenaar: "Projectmanager Zakelijk", indicator: "Doorlooptijd maatwerk (weken)", indicatorOwner: "Controller Zakelijk", currentValue: "16", targetValue: "6" } },
    ],

    capabilities: [
      // PO
      { id: capIds[0], sectorId: "PO", description: "Klantgericht werken is standaard werkwijze bij alle PO-medewerkers", relatedSectors: ["PO", "VO"], currentLevel: 2, targetLevel: 4, profiel: { eigenaar: "Hoofd PO-ontwikkeling", huidieSituatie: "Medewerkers werken voornamelijk product-gedreven; klantcontact is beperkt tot accountmanagers.", gewensteSituatie: "Elke PO-medewerker start vanuit klantbehoefte en heeft minimaal 2x per jaar direct klantcontact." } },
      { id: capIds[1], sectorId: "PO", description: "PO-team kan adaptieve digitale toetsen ontwikkelen en beheren", relatedSectors: ["PO"], currentLevel: 1, targetLevel: 4, profiel: { eigenaar: "Productmanager LOVS", huidieSituatie: "Adaptief toetsen is in pilotfase; kennis zit bij 2 specialisten.", gewensteSituatie: "Het hele toetsontwikkelteam kan adaptieve items ontwikkelen en het systeem beheren." } },
      { id: capIds[2], sectorId: "PO", description: "Data-analyse en dashboarding voor onderwijsinzichten", relatedSectors: ["PO", "VO"], currentLevel: 2, targetLevel: 5, profiel: { eigenaar: "Hoofd Data & Analytics", huidieSituatie: "Basisdashboards beschikbaar maar weinig gebruikt; data-analyse ad hoc.", gewensteSituatie: "Scholen gebruiken standaard dashboards voor beleidsbeslissingen; real-time inzichten beschikbaar." } },

      // VO
      { id: capIds[3], sectorId: "VO", description: "VO-team beheerst volledig digitale toetsconstructie", relatedSectors: ["VO"], currentLevel: 2, targetLevel: 4, profiel: { eigenaar: "Hoofd VO-productontwikkeling", huidieSituatie: "Circa 40% van toetsen digitaal; rest nog papier-gebaseerd.", gewensteSituatie: "Alle VO-toetsen worden digitaal geconstrueerd, afgenomen en gescoord." } },
      { id: capIds[4], sectorId: "VO", description: "Formatief toetsen is geïntegreerd in het productaanbod", relatedSectors: ["VO"], currentLevel: 1, targetLevel: 3, profiel: { eigenaar: "Productmanager VO", huidieSituatie: "Formatief toetsen is apart initiatief zonder integratie in bestaand aanbod.", gewensteSituatie: "Formatieve toetsmogelijkheden zijn standaard onderdeel van elk VO-product." } },
      { id: capIds[5], sectorId: "VO", description: "Klantgericht werken is standaard werkwijze bij alle VO-medewerkers", relatedSectors: ["PO", "VO"], currentLevel: 2, targetLevel: 4, profiel: { eigenaar: "Sectormanager VO", huidieSituatie: "Klantcontact loopt via accountmanagement; medewerkers hebben weinig direct contact.", gewensteSituatie: "Alle VO-medewerkers begrijpen klantbehoeften en passen outside-in werken dagelijks toe." } },

      // Zakelijk
      { id: capIds[6], sectorId: "Zakelijk", description: "Assessment-expertise is gebundeld en schaalbaar ingericht", relatedSectors: ["Zakelijk"], currentLevel: 3, targetLevel: 5, profiel: { eigenaar: "Hoofd Assessment & Certificering", huidieSituatie: "Expertise verspreid over individuele consultants; hergebruik van materiaal is beperkt.", gewensteSituatie: "Gestandaardiseerde assessment-methodiek met schaalbare templates en kennisdeling." } },
      { id: capIds[7], sectorId: "Zakelijk", description: "Digitale certificeringsinfrastructuur is operationeel", relatedSectors: ["Zakelijk"], currentLevel: 1, targetLevel: 4, profiel: { eigenaar: "IT-manager Zakelijk", huidieSituatie: "Certificering verloopt grotendeels handmatig met papieren processen.", gewensteSituatie: "Volledig digitaal certificeringsplatform met online afname, verificatie en rapportage." } },
      { id: capIds[8], sectorId: "Zakelijk", description: "Commerciële vaardigheden en account-based selling zijn ontwikkeld", relatedSectors: ["Zakelijk"], currentLevel: 2, targetLevel: 4, profiel: { eigenaar: "Commercieel directeur", huidieSituatie: "Sales is reactief; geen structureel accountmanagement voor zakelijke klanten.", gewensteSituatie: "Proactief account-based sales met gestructureerde pijplijn en klantrelatiebeheer." } },

      // Wendbaarheid — cross-sectoraal
      { id: capIds[9], sectorId: "PO", description: "Agile productontwikkeling is standaard werkwijze in PO", relatedSectors: ["PO", "VO"], currentLevel: 2, targetLevel: 4, profiel: { eigenaar: "Productmanager PO", huidieSituatie: "Waterval-aanpak met lange doorlooptijden; releases 1-2x per jaar.", gewensteSituatie: "Iteratieve productontwikkeling in sprints met releases elke 6 weken." } },
      { id: capIds[10], sectorId: "VO", description: "VO-organisatie kan snel reageren op curriculumwijzigingen en marktbehoeften", relatedSectors: ["VO"], currentLevel: 2, targetLevel: 4, profiel: { eigenaar: "Sectormanager VO", huidieSituatie: "Lange doorlooptijden bij aanpassingen; besluitvorming via meerdere lagen.", gewensteSituatie: "Korte beslislijnen en snelle aanpassing van producten bij curriculumwijzigingen." } },
      { id: capIds[11], sectorId: "Zakelijk", description: "Zakelijke dienstverlening is flexibel en snel schaalbaar", relatedSectors: ["Zakelijk"], currentLevel: 2, targetLevel: 4, profiel: { eigenaar: "Projectmanager Zakelijk", huidieSituatie: "Maatwerkprojecten duren lang door gebrek aan standaardcomponenten.", gewensteSituatie: "Modulaire opzet waarmee maatwerkproducten snel worden samengesteld uit standaardcomponenten." } },
    ],

    efforts: [
      // PO — Mens
      { id: effortIds[0], sectorId: "PO", description: "Training outside-in werken uitvoeren voor PO-team", domain: "mens", quarter: "Q1 2026", status: "gepland", dependencies: [], votes: 8, dossier: { eigenaar: "Sectormanager PO", inspanningsleider: "HR-adviseur PO", verwachtResultaat: "Alle PO-medewerkers beheersen outside-in gespreksmethodiek en passen het toe in dagelijks werk.", kostenraming: "€25.000 (±20%)", randvoorwaarden: "Extern trainingsbudget beschikbaar, management commitment voor deelname" } },
      { id: effortIds[1], sectorId: "PO", description: "Opleiding adaptief toetsen verzorgen voor toetsontwikkelaars", domain: "mens", quarter: "Q2 2026", status: "gepland", dependencies: [], votes: 6, dossier: { eigenaar: "Productmanager LOVS", inspanningsleider: "Toetsexpert PO", verwachtResultaat: "Toetsontwikkelaars kunnen zelfstandig adaptieve items ontwikkelen en valideren.", kostenraming: "€40.000 (±25%)", randvoorwaarden: "Samenwerking met externe adaptief-toets experts, toegang tot testomgeving" } },

      // PO — Processen
      { id: effortIds[2], sectorId: "PO", description: "Klantfeedbackloop inrichten als kwartaalcyclus", domain: "processen", quarter: "Q1 2026", status: "in_uitvoering", dependencies: [], votes: 7, dossier: { eigenaar: "Sectormanager PO", inspanningsleider: "Accountmanager PO", verwachtResultaat: "Structureel klantfeedbackproces met kwartaalrapportages en actieplannen.", kostenraming: "€10.000 (±15%)", randvoorwaarden: "CRM-systeem beschikbaar, klantenpanel opgezet" } },

      // PO — Data & Systemen
      { id: effortIds[3], sectorId: "PO", description: "LOVS dashboard v2 ontwikkelen en uitrollen", domain: "data_systemen", quarter: "Q2 2026", status: "gepland", dependencies: [], votes: 9, dossier: { eigenaar: "Hoofd Data & Analytics", inspanningsleider: "Lead developer dashboards", verwachtResultaat: "Vernieuwd dashboard met real-time inzichten, bruikbaar voor schoolleiders en docenten.", kostenraming: "€120.000 (±30%)", randvoorwaarden: "API-koppeling met LOVS-backend, UX-onderzoek afgerond" } },

      // PO — Cultuur
      { id: effortIds[4], sectorId: "PO", description: "Klantdagen organiseren (2x per jaar)", domain: "cultuur", quarter: "Q1 2026", status: "gepland", dependencies: [], votes: 5, dossier: { eigenaar: "Sectormanager PO", inspanningsleider: "Communicatieadviseur PO", verwachtResultaat: "PO-medewerkers hebben direct contact met scholen en begrijpen klantbehoeften beter.", kostenraming: "€15.000 per jaar (±10%)", randvoorwaarden: "Locatie en catering geregeld, scholen bereid om deel te nemen" } },

      // VO — Mens
      { id: effortIds[5], sectorId: "VO", description: "Training digitale toetsconstructie geven aan VO-team", domain: "mens", quarter: "Q1 2026", status: "gepland", dependencies: [], votes: 7, dossier: { eigenaar: "Hoofd VO-productontwikkeling", inspanningsleider: "Toetsexpert VO", verwachtResultaat: "VO-team kan volledig digitaal toetsen construeren, afnemen en scoren.", kostenraming: "€35.000 (±20%)", randvoorwaarden: "Digitale toetsomgeving beschikbaar als trainingsplatform" } },

      // VO — Processen
      { id: effortIds[6], sectorId: "VO", description: "Pilotprogramma formatief toetsen opzetten met 10 scholen", domain: "processen", quarter: "Q2 2026", status: "gepland", dependencies: [], votes: 8, dossier: { eigenaar: "Productmanager VO", inspanningsleider: "Pilotcoördinator VO", verwachtResultaat: "Gevalideerd formatief toetsproduct met feedback van 10 pilotscholen.", kostenraming: "€50.000 (±25%)", randvoorwaarden: "Pilotscholen geworven, basisproduct formatief toetsen klaar" } },
      { id: effortIds[7], sectorId: "VO", description: "Agile werkwijze invoeren voor VO-productontwikkeling", domain: "processen", quarter: "Q3 2026", status: "gepland", dependencies: [], votes: 6, dossier: { eigenaar: "Sectormanager VO", inspanningsleider: "Agile coach", verwachtResultaat: "VO-productontwikkeling werkt in sprints met iteratieve releases.", kostenraming: "€20.000 (±15%)", randvoorwaarden: "Agile coach beschikbaar, teamleden vrij van andere verplichtingen" } },

      // VO — Data & Systemen
      { id: effortIds[8], sectorId: "VO", description: "Digitaal toetsplatform voor VO bouwen", domain: "data_systemen", quarter: "Q2 2026", status: "gepland", dependencies: [], votes: 10, dossier: { eigenaar: "Hoofd VO-productontwikkeling", inspanningsleider: "Lead architect VO-platform", verwachtResultaat: "Schaalbaar digitaal toetsplatform operationeel voor VO met API-integraties.", kostenraming: "€250.000 (±35%)", randvoorwaarden: "Architectuurbesluit genomen, cloud-infrastructuur ingericht" } },
      { id: effortIds[9], sectorId: "VO", description: "AI-scoring module piloten en evalueren", domain: "data_systemen", quarter: "Q4 2026", status: "gepland", dependencies: [effortIds[8]], votes: 4, dossier: { eigenaar: "Hoofd Data & Analytics", inspanningsleider: "AI-specialist", verwachtResultaat: "Werkende AI-scoring pilot met betrouwbaarheidsmetingen voor open vragen.", kostenraming: "€80.000 (±40%)", randvoorwaarden: "VO-toetsplatform operationeel, gelabelde trainingsdata beschikbaar" } },

      // VO — Cultuur
      { id: effortIds[10], sectorId: "VO", description: "Maandelijkse innovatiesprints organiseren", domain: "cultuur", quarter: "Q1 2026", status: "gepland", dependencies: [], votes: 3, dossier: { eigenaar: "Sectormanager VO", inspanningsleider: "Innovatiemanager VO", verwachtResultaat: "Structurele innovatiecultuur met maandelijkse sprints en minimaal 2 innovaties per kwartaal.", kostenraming: "€5.000 per sprint (±10%)", randvoorwaarden: "Tijd gealloceerd in teamplanningen, innovatiebudget beschikbaar" } },

      // Zakelijk — Mens
      { id: effortIds[11], sectorId: "Zakelijk", description: "Sales team uitbreiden met 2 account managers werven", domain: "mens", quarter: "Q1 2026", status: "gepland", dependencies: [], votes: 7, dossier: { eigenaar: "Commercieel directeur", inspanningsleider: "HR-manager", verwachtResultaat: "2 ervaren account managers operationeel voor zakelijke marktbewerking.", kostenraming: "€160.000 per jaar (±10%)", randvoorwaarden: "Budget goedgekeurd, functieprofiel opgesteld, wervingsbureau ingeschakeld" } },

      // Zakelijk — Processen
      { id: effortIds[12], sectorId: "Zakelijk", description: "Account-based marketing proces implementeren", domain: "processen", quarter: "Q2 2026", status: "gepland", dependencies: [], votes: 6, dossier: { eigenaar: "Commercieel directeur", inspanningsleider: "Marketing manager Zakelijk", verwachtResultaat: "Gestructureerd ABM-proces met target account list, campagne-templates en pijplijnrapportage.", kostenraming: "€30.000 (±20%)", randvoorwaarden: "CRM-systeem geconfigureerd voor ABM, target accounts geïdentificeerd" } },

      // Zakelijk — Data & Systemen
      { id: effortIds[13], sectorId: "Zakelijk", description: "Certificeringsplatform ontwikkelen en lanceren", domain: "data_systemen", quarter: "Q3 2026", status: "gepland", dependencies: [], votes: 8, dossier: { eigenaar: "IT-manager Zakelijk", inspanningsleider: "Lead developer certificering", verwachtResultaat: "Digitaal certificeringsplatform met online afname, automatische verificatie en rapportage.", kostenraming: "€180.000 (±30%)", randvoorwaarden: "Certificeringseisen gedefinieerd, beveiligingsaudit gepland" } },

      // Zakelijk — Cultuur
      { id: effortIds[14], sectorId: "Zakelijk", description: "Commerciële mindset workshops uitvoeren", domain: "cultuur", quarter: "Q1 2026", status: "gepland", dependencies: [], votes: 4, dossier: { eigenaar: "Commercieel directeur", inspanningsleider: "Externe coach commercie", verwachtResultaat: "Medewerkers denken commercieel en herkennen kansen in klantgesprekken.", kostenraming: "€18.000 (±15%)", randvoorwaarden: "Externe workshopleider gecontracteerd, agenda's medewerkers geblokt" } },
      { id: effortIds[15], sectorId: "Zakelijk", description: "Partnerships met HR-adviesbureaus opbouwen en formaliseren", domain: "cultuur", quarter: "Q2 2026", status: "gepland", dependencies: [], votes: 5, dossier: { eigenaar: "Sales manager Zakelijk", inspanningsleider: "Partnermanager", verwachtResultaat: "Minimaal 3 formele partnerschappen met HR-adviesbureaus voor doorverwijzingen.", kostenraming: "€12.000 (±20%)", randvoorwaarden: "Partner-propositie uitgewerkt, juridisch kader voor samenwerkingsovereenkomsten" } },
    ],

    // Koppelingen
    goalBenefitMaps: [
      { goalId: goalIds[0], benefitId: benefitIds[0] },
      { goalId: goalIds[0], benefitId: benefitIds[1] },
      { goalId: goalIds[0], benefitId: benefitIds[2] },
      { goalId: goalIds[1], benefitId: benefitIds[3] },
      { goalId: goalIds[1], benefitId: benefitIds[4] },
      { goalId: goalIds[2], benefitId: benefitIds[5] },
      { goalId: goalIds[2], benefitId: benefitIds[6] },
      { goalId: goalIds[3], benefitId: benefitIds[7] },
      { goalId: goalIds[3], benefitId: benefitIds[8] },
      { goalId: goalIds[4], benefitId: benefitIds[9] },
      { goalId: goalIds[4], benefitId: benefitIds[10] },
      { goalId: goalIds[4], benefitId: benefitIds[11] },
    ],
    benefitCapabilityMaps: [
      { benefitId: benefitIds[0], capabilityId: capIds[0] },
      { benefitId: benefitIds[1], capabilityId: capIds[5] },
      { benefitId: benefitIds[3], capabilityId: capIds[1] },
      { benefitId: benefitIds[4], capabilityId: capIds[3] },
      { benefitId: benefitIds[5], capabilityId: capIds[2] },
      { benefitId: benefitIds[6], capabilityId: capIds[2] },
      { benefitId: benefitIds[7], capabilityId: capIds[6] },
      { benefitId: benefitIds[8], capabilityId: capIds[7] },
      { benefitId: benefitIds[2], capabilityId: capIds[8] },
      // Wendbaarheid — baten gekoppeld aan vermogens
      { benefitId: benefitIds[9], capabilityId: capIds[9] },
      { benefitId: benefitIds[10], capabilityId: capIds[10] },
      { benefitId: benefitIds[11], capabilityId: capIds[11] },
    ],
    capabilityEffortMaps: [
      { capabilityId: capIds[0], effortId: effortIds[0] },
      { capabilityId: capIds[0], effortId: effortIds[4] },
      { capabilityId: capIds[1], effortId: effortIds[1] },
      { capabilityId: capIds[2], effortId: effortIds[3] },
      { capabilityId: capIds[3], effortId: effortIds[5] },
      { capabilityId: capIds[3], effortId: effortIds[8] },
      { capabilityId: capIds[4], effortId: effortIds[6] },
      { capabilityId: capIds[5], effortId: effortIds[5] },
      { capabilityId: capIds[6], effortId: effortIds[11] },
      { capabilityId: capIds[7], effortId: effortIds[13] },
      { capabilityId: capIds[8], effortId: effortIds[12] },
      { capabilityId: capIds[8], effortId: effortIds[14] },
      // Wendbaarheid — vermogens gekoppeld aan inspanningen
      { capabilityId: capIds[9], effortId: effortIds[2] },   // Klantfeedbackloop → agile PO
      { capabilityId: capIds[10], effortId: effortIds[7] },  // Agile werkwijze → wendbaarheid VO
      { capabilityId: capIds[11], effortId: effortIds[12] },  // ABM proces → flexibiliteit Zakelijk
    ],
  };
}

function g(): string {
  return crypto.randomUUID();
}
