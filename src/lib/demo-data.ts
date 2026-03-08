// Demo data voor DIN-app — gebaseerd op Cito context
import type { DINSession } from "./types";

export function createDemoSession(): DINSession {
  const id = crypto.randomUUID();
  const now = new Date().toISOString();

  // IDs
  const goalIds = [g(), g(), g(), g(), g()];
  const benefitIds = [g(), g(), g(), g(), g(), g(), g(), g(), g(), g(), g(), g()];
  const capIds = [g(), g(), g(), g(), g(), g(), g(), g(), g()];
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
      // Doel 1: Outside-in — PO
      { id: benefitIds[0], goalId: goalIds[0], sectorId: "PO", description: "Klanttevredenheid PO-scholen stijgt significant", profiel: { indicator: "NPS score PO", indicatorOwner: "Sectormanager PO", currentValue: "32", targetValue: "50" } },
      { id: benefitIds[1], goalId: goalIds[0], sectorId: "VO", description: "VO-scholen ervaren Cito als partner, niet als leverancier", profiel: { indicator: "Partnerscore VO-enquête", indicatorOwner: "Sectormanager VO", currentValue: "5.8", targetValue: "7.5" } },
      { id: benefitIds[2], goalId: goalIds[0], sectorId: "Zakelijk", description: "Zakelijke klanten herkennen outside-in benadering in dienstverlening", profiel: { indicator: "Klanttevredenheid zakelijk", indicatorOwner: "Commercieel directeur", currentValue: "6.5", targetValue: "8.0" } },

      // Doel 2: Digitale toetservaring — PO & VO
      { id: benefitIds[3], goalId: goalIds[1], sectorId: "PO", description: "Digitale afname LOVS verloopt soepel en betrouwbaar", profiel: { indicator: "Succesvolle digitale afnames (%)", indicatorOwner: "Productmanager LOVS", currentValue: "72%", targetValue: "95%" } },
      { id: benefitIds[4], goalId: goalIds[1], sectorId: "VO", description: "VO-toetsen zijn volledig digitaal beschikbaar", profiel: { indicator: "Digitaal aanbod (%)", indicatorOwner: "Productmanager VO", currentValue: "40%", targetValue: "85%" } },

      // Doel 3: Data-gedreven inzichten
      { id: benefitIds[5], goalId: goalIds[2], sectorId: "PO", description: "PO-scholen gebruiken Cito-dashboards voor beleidsbeslissingen", profiel: { indicator: "Actieve dashboard-gebruikers", indicatorOwner: "Data-analist PO", currentValue: "120", targetValue: "500" } },
      { id: benefitIds[6], goalId: goalIds[2], sectorId: "VO", description: "VO-docenten hebben real-time inzicht in leerlingvoortgang", profiel: { indicator: "Docenten met dashboard-toegang", indicatorOwner: "Productmanager VO", currentValue: "200", targetValue: "1500" } },

      // Doel 4: Zakelijke markt
      { id: benefitIds[7], goalId: goalIds[3], sectorId: "Zakelijk", description: "Omzet zakelijke assessments groeit met 30%", profiel: { indicator: "Omzet zakelijk (M€)", indicatorOwner: "Commercieel directeur", currentValue: "4.2", targetValue: "5.5" } },
      { id: benefitIds[8], goalId: goalIds[3], sectorId: "Zakelijk", description: "Certificeringsprogramma levert 10 nieuwe klanten", profiel: { indicator: "Nieuwe certificeringsklanten", indicatorOwner: "Sales manager", currentValue: "0", targetValue: "10" } },

      // Doel 5: Wendbaarheid
      { id: benefitIds[9], goalId: goalIds[4], sectorId: "PO", description: "Time-to-market voor nieuwe PO-producten halveert", profiel: { indicator: "Time-to-market (maanden)", indicatorOwner: "Productmanager PO", currentValue: "18", targetValue: "9" } },
      { id: benefitIds[10], goalId: goalIds[4], sectorId: "VO", description: "VO kan snel inspelen op curriculumwijzigingen", profiel: { indicator: "Doorlooptijd aanpassing (weken)", indicatorOwner: "Sectormanager VO", currentValue: "12", targetValue: "4" } },
      { id: benefitIds[11], goalId: goalIds[4], sectorId: "Zakelijk", description: "Zakelijke maatwerkproducten binnen 6 weken leverbaar", profiel: { indicator: "Doorlooptijd maatwerk (weken)", indicatorOwner: "Projectmanager zakelijk", currentValue: "16", targetValue: "6" } },
    ],

    capabilities: [
      // PO
      { id: capIds[0], sectorId: "PO", description: "Klantgericht werken is standaard werkwijze bij alle PO-medewerkers", relatedSectors: ["PO", "VO"], currentLevel: 2, targetLevel: 4 },
      { id: capIds[1], sectorId: "PO", description: "PO-team kan adaptieve digitale toetsen ontwikkelen en beheren", relatedSectors: ["PO"], currentLevel: 1, targetLevel: 4 },
      { id: capIds[2], sectorId: "PO", description: "Data-analyse en dashboarding voor onderwijsinzichten", relatedSectors: ["PO", "VO"], currentLevel: 2, targetLevel: 5 },

      // VO
      { id: capIds[3], sectorId: "VO", description: "VO-team beheerst volledig digitale toetsconstructie", relatedSectors: ["VO"], currentLevel: 2, targetLevel: 4 },
      { id: capIds[4], sectorId: "VO", description: "Formatief toetsen is geïntegreerd in het productaanbod", relatedSectors: ["VO"], currentLevel: 1, targetLevel: 3 },
      { id: capIds[5], sectorId: "VO", description: "Klantgericht werken is standaard werkwijze bij alle VO-medewerkers", relatedSectors: ["PO", "VO"], currentLevel: 2, targetLevel: 4 },

      // Zakelijk
      { id: capIds[6], sectorId: "Zakelijk", description: "Assessment-expertise is gebundeld en schaalbaar ingericht", relatedSectors: ["Zakelijk"], currentLevel: 3, targetLevel: 5 },
      { id: capIds[7], sectorId: "Zakelijk", description: "Digitale certificeringsinfrastructuur is operationeel", relatedSectors: ["Zakelijk"], currentLevel: 1, targetLevel: 4 },
      { id: capIds[8], sectorId: "Zakelijk", description: "Commerciële vaardigheden en account-based selling zijn ontwikkeld", relatedSectors: ["Zakelijk"], currentLevel: 2, targetLevel: 4 },
    ],

    efforts: [
      // PO — Mens
      { id: effortIds[0], sectorId: "PO", description: "Training outside-in werken voor PO-team", domain: "mens", quarter: "Q1 2026", status: "gepland", dependencies: [], votes: 8 },
      { id: effortIds[1], sectorId: "PO", description: "Opleiding adaptief toetsen voor toetsontwikkelaars", domain: "mens", quarter: "Q2 2026", status: "gepland", dependencies: [], votes: 6 },

      // PO — Processen
      { id: effortIds[2], sectorId: "PO", description: "Klantfeedbackloop inrichten (kwartaalcyclus)", domain: "processen", quarter: "Q1 2026", status: "in_uitvoering", dependencies: [], votes: 7 },

      // PO — Data & Systemen
      { id: effortIds[3], sectorId: "PO", description: "LOVS dashboard v2 ontwikkelen", domain: "data_systemen", quarter: "Q2 2026", status: "gepland", dependencies: [], votes: 9 },

      // PO — Cultuur
      { id: effortIds[4], sectorId: "PO", description: "Klantdagen organiseren (2x per jaar)", domain: "cultuur", quarter: "Q1 2026", status: "gepland", dependencies: [], votes: 5 },

      // VO — Mens
      { id: effortIds[5], sectorId: "VO", description: "Training digitale toetsconstructie VO-team", domain: "mens", quarter: "Q1 2026", status: "gepland", dependencies: [], votes: 7 },

      // VO — Processen
      { id: effortIds[6], sectorId: "VO", description: "Pilotprogramma formatief toetsen met 10 scholen", domain: "processen", quarter: "Q2 2026", status: "gepland", dependencies: [], votes: 8 },
      { id: effortIds[7], sectorId: "VO", description: "Agile werkwijze invoeren voor productontwikkeling", domain: "processen", quarter: "Q3 2026", status: "gepland", dependencies: [], votes: 6 },

      // VO — Data & Systemen
      { id: effortIds[8], sectorId: "VO", description: "Digitale toetsplatform VO bouwen", domain: "data_systemen", quarter: "Q2 2026", status: "gepland", dependencies: [], votes: 10 },
      { id: effortIds[9], sectorId: "VO", description: "AI-scoring module pilot", domain: "data_systemen", quarter: "Q4 2026", status: "gepland", dependencies: [effortIds[8]], votes: 4 },

      // VO — Cultuur
      { id: effortIds[10], sectorId: "VO", description: "Innovatiesprints (maandelijks)", domain: "cultuur", quarter: "Q1 2026", status: "gepland", dependencies: [], votes: 3 },

      // Zakelijk — Mens
      { id: effortIds[11], sectorId: "Zakelijk", description: "Sales team uitbreiden met 2 account managers", domain: "mens", quarter: "Q1 2026", status: "gepland", dependencies: [], votes: 7 },

      // Zakelijk — Processen
      { id: effortIds[12], sectorId: "Zakelijk", description: "Account-based marketing proces opzetten", domain: "processen", quarter: "Q2 2026", status: "gepland", dependencies: [], votes: 6 },

      // Zakelijk — Data & Systemen
      { id: effortIds[13], sectorId: "Zakelijk", description: "Certificeringsplatform ontwikkelen", domain: "data_systemen", quarter: "Q3 2026", status: "gepland", dependencies: [], votes: 8 },

      // Zakelijk — Cultuur
      { id: effortIds[14], sectorId: "Zakelijk", description: "Commerciële mindset workshops", domain: "cultuur", quarter: "Q1 2026", status: "gepland", dependencies: [], votes: 4 },
      { id: effortIds[15], sectorId: "Zakelijk", description: "Partnerships met HR-adviesbureaus opbouwen", domain: "cultuur", quarter: "Q2 2026", status: "gepland", dependencies: [], votes: 5 },
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
    ],
  };
}

function g(): string {
  return crypto.randomUUID();
}
