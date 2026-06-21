// DIN — Doelen-Inspanningennetwerk Zod Schemas
// Single source of truth voor alle types (per D-10)
// TypeScript types worden afgeleid via z.infer<> (per D-09)

import { z } from "zod";

// ============================================================
// Enums & Literals
// ============================================================

export const EffortDomainSchema = z.enum([
  "mens",
  "processen",
  "data_systemen",
  "cultuur",
  "overig",
]);

/** Normaliseert AI-varianten van domeinnamen naar de juiste enum waarde */
function normalizeDomain(val: unknown): string | undefined {
  if (typeof val !== "string") return undefined;
  const lower = val.toLowerCase().replace(/[&\s]+/g, "_").replace(/_+/g, "_").replace(/^_|_$/g, "");
  const map: Record<string, string> = {
    mens: "mens",
    mensen: "mens",
    processen: "processen",
    proces: "processen",
    data_systemen: "data_systemen",
    data_en_systemen: "data_systemen",
    datasystemen: "data_systemen",
    cultuur: "cultuur",
    overig: "overig",
    overige: "overig",
    onvoorzien: "overig",
    programma_breed: "overig",
  };
  return map[lower] ?? undefined;
}

/** Soepele domain-parser voor AI-output: normaliseert varianten zoals "Data & Systemen" → "data_systemen" */
export const FlexEffortDomainSchema = z
  .string()
  .transform((val) => normalizeDomain(val))
  .pipe(EffortDomainSchema);

export const EffortStatusSchema = z.enum([
  "gepland",
  "in_uitvoering",
  "afgerond",
  "on_hold",
]);

// Backward-compat graveyard: approval-velden blijven optioneel op DINEffort
// zodat bestaande sessies hun data niet kwijtraken. Worden niet meer gebruikt
// in UI of export sinds Phase 20 (roadmap-planning).
export const ApprovalStatusSchema = z.enum([
  "voorstel",
  "goedgekeurd",
  "afgewezen",
  "aangepast",
]);

export const PrioritySchema = z.enum(["hoog", "midden", "laag"]);

export const SectorNameSchema = z.enum(["PO", "VO", "Zakelijk"]);

export const AppStepSchema = z.enum([
  "import",
  "sectorwerk",
  "din-mapping",
  "cross-analyse",
  "governance",
  "prioritering",
  "export",
  "berekeningen",
  "kpi-meetbaarheid",
]);

// ============================================================
// Sub-schemas (profielen)
// ============================================================

export const BatenProfielSchema = z.object({
  bateneigenaar: z.string().optional(),
  indicator: z.string(),
  indicatorOwner: z.string(),
  currentValue: z.string(),
  targetValue: z.string(),
  meetmethode: z.string().optional(),
  measurementMoment: z.string().optional(),
  // KPI-sessie (stap 9): gefaseerde horizon + afstem-status
  horizon: z.string().optional(),
  kpiStatus: z.enum(["concept", "afgestemd"]).optional(),
});

export const VermogensProfielSchema = z.object({
  eigenaar: z.string(),
  huidieSituatie: z.string(),
  gewensteSituatie: z.string(),
  // KPI-sessie (stap 9): meetvariabelen voor het vermogen (optioneel, achterwaarts compatibel)
  indicator: z.string().optional(),
  meetmethode: z.string().optional(),
  currentValue: z.string().optional(),
  targetValue: z.string().optional(),
  measurementMoment: z.string().optional(),
  kpiStatus: z.enum(["concept", "afgestemd"]).optional(),
});

export const InspanningsDossierSchema = z.object({
  eigenaar: z.string(),
  inspanningsleider: z.string(),
  verwachtResultaat: z.string(),
  kostenraming: z.string(),
  randvoorwaarden: z.string(),
});

// ============================================================
// Entity schemas (storage — met id velden)
// ============================================================

export const ProgrammeGoalSchema = z.object({
  id: z.string(),
  name: z.string(),
  description: z.string(),
  rank: z.number(),
  sourceSessionId: z.string().optional(),
});

export const ProgrammeVisionSchema = z.object({
  id: z.string(),
  uitgebreid: z.string(),
  beknopt: z.string(),
  sourceSessionId: z.string().optional(),
});

export const ProgrammeScopeSchema = z.object({
  id: z.string(),
  inScope: z.array(z.string()),
  outScope: z.array(z.string()),
});

export const SectorPlanSchema = z.object({
  id: z.string(),
  sectorName: z.string(),
  rawText: z.string(),
  parsedContent: z.record(z.string(), z.unknown()).optional(),
  uploadedAt: z.string(),
});

export const PMCEntrySchema = z.object({
  id: z.string(),
  product: z.string(),
  marketSegment: z.string(),
  priority: PrioritySchema,
  currentPerformance: z.string().optional(),
});

export const DINBenefitSchema = z.object({
  id: z.string(),
  goalId: z.string(),
  sectorId: z.string(),
  title: z.string().optional(),
  description: z.string(),
  profiel: BatenProfielSchema,
});

export const DINCapabilitySchema = z.object({
  id: z.string(),
  sectorId: z.string(),
  title: z.string().optional(),
  description: z.string(),
  relatedSectors: z.array(z.string()),
  currentLevel: z.number().optional(),
  targetLevel: z.number().optional(),
  profiel: VermogensProfielSchema.optional(),
  consolidated: z.boolean().optional(),
  consolidatedInto: z.string().optional(),
});

export const DINEffortSchema = z.object({
  id: z.string(),
  sectorId: z.string(),
  title: z.string().optional(),
  description: z.string(),
  domain: EffortDomainSchema,
  quarter: z.string().optional(),
  responsibleSector: z.string().optional(),
  status: EffortStatusSchema,
  dependencies: z.array(z.string()),
  votes: z.number().optional(),
  dossier: InspanningsDossierSchema.optional(),
  consolidated: z.boolean().optional(),
  consolidatedInto: z.string().optional(),
  originProjectId: z.string().optional(), // Phase 14 D-09
  approvalStatus: ApprovalStatusSchema.optional(),
  approvalDate: z.string().optional(),
  opmerking: z.string().optional(),
});

export const ExternalProjectSchema = z.object({
  id: z.string(),
  sectorId: z.string(),
  name: z.string(),
  description: z.string(),
  status: EffortStatusSchema,
  relevance: z.string().optional(),
  domains: z.array(EffortDomainSchema).optional().default([]),
  linkedCapabilityIds: z.array(z.string()).optional().default([]),
  aiWarning: z.string().optional(),
  buitenScope: z.boolean().optional().default(false),
  promotedAt: z.string().optional(), // Phase 14 D-08
  promotedToEffortIds: z.array(z.string()).optional(), // Phase 14 D-08 — NO .default() per Pitfall 1
});

// ============================================================
// Mapping schemas (koppelingen)
// ============================================================

export const GoalBenefitMapSchema = z.object({
  goalId: z.string(),
  benefitId: z.string(),
});

export const BenefitCapabilityMapSchema = z.object({
  benefitId: z.string(),
  capabilityId: z.string(),
});

export const CapabilityEffortMapSchema = z.object({
  capabilityId: z.string(),
  effortId: z.string(),
});

export const EffortPMCMapSchema = z.object({
  effortId: z.string(),
  pmcId: z.string(),
});

export const EffortSectorMapSchema = z.object({
  effortId: z.string(),
  sectorPlanId: z.string(),
});

export const ProjectCapabilityMapSchema = z.object({
  projectId: z.string(),
  capabilityId: z.string(),
});

// ============================================================
// Analyse result schemas
// ============================================================

// --- Sectorplan-analyse ---

export const SectorplanAnalyseResultSchema = z.object({
  samenvatting: z.string(),
  aansluiting: z.object({
    titel: z.string(),
    toelichting: z.string(),
    punten: z.array(z.string()),
  }),
  baten: z.object({
    titel: z.string(),
    toelichting: z.string(),
    punten: z.array(z.string()),
  }),
  vermogens: z.object({
    titel: z.string(),
    toelichting: z.string(),
    punten: z.array(z.string()),
  }),
  inspanningen: z.object({
    titel: z.string(),
    toelichting: z.string(),
    mens: z.array(z.string()),
    processen: z.array(z.string()),
    data_systemen: z.array(z.string()),
    cultuur: z.array(z.string()),
  }),
  aandachtspunten: z.object({
    titel: z.string(),
    toelichting: z.string(),
    punten: z.array(z.string()),
  }),
});

// --- Cross-analyse sub-schemas ---

export const CrossAnalyseSynergieItemSchema = z.object({
  vermogen: z.string(),
  sectoren: z.array(z.string()),
  impact: z.string(),
});

export const CrossAnalyseHefboomItemSchema = z.object({
  inspanning: z.string(),
  bijdraagtAan: z.array(z.string()),
  prioriteit: z.string(),
});

export const CrossAnalyseDomeinItemSchema = z.object({
  domein: z.string(),
  beoordeling: z.string(),
  advies: z.string(),
});

export const CrossAnalyseSectorOverlapItemSchema = z.object({
  beschrijving: z.string(),
  sectoren: z.array(z.string()),
  advies: z.string(),
});

export const CrossAnalyseExternItemSchema = z.object({
  project: z.string(),
  overlapMet: z.string(),
  advies: z.string(),
});

// --- Semantische matching cluster schemas (Phase 8 -- D-04, D-06) ---

export const VermogenClusterItemSchema = z.object({
  clusterTitel: z.string(),
  items: z.array(z.object({
    id: z.string(),
    beschrijving: z.string(),
    sector: z.string(),
  })),
  batenContext: z.array(z.object({
    baat: z.string(),
    sector: z.string(),
  })),
  advies: z.string(),
  // D-30 (Phase 17): markeer_gelijkenis toegevoegd voor cross-analyse vermogen-gelijkenis
  // markering (geen merge) — drieluik-groepen worden apart getoond als sectoroverstijgende duiding.
  aanbeveling: z.enum(["combineren", "afstemmen", "apart_houden", "markeer_gelijkenis"]),
});

// --- Phase 17: VermogenGelijkenisGroep (D-26) ---
// Groep van 2-3 sector-vermogens die methodisch verschillend blijven maar dezelfde
// onderliggende beweging delen. Wordt apart gerenderd naast clusters.
export const VermogenGelijkenisGroepSchema = z.object({
  id: z.string(),
  vermogenIds: z.array(z.string()).min(1),
  gezamenlijkeOmschrijving: z.string(),
  reden: z.string(),
});

// --- Phase 18: SubEffortVermogenImpact (R-CROSS-03) ---
// Per sector-vermogen binnen een cross-sectorale bundel: hoe die bundel dat specifieke vermogen opbouwt.
export const SubEffortVermogenImpactSchema = z.object({
  sectorId: SectorNameSchema,  // "PO" | "VO" | "Zakelijk"
  vermogenId: z.string(),       // refereert aan DINCapability.id uit groep.vermogenIds
  impact: z.string(),           // prose: hoe deze bundel dit sector-vermogen opbouwt
});

// --- Phase 18: SubEffortDossier (R-CROSS-03) ---
// Dossier-velden voor cross-sectorale inspanning. Per Decision R3 (plan 02 frontmatter):
// inline object met .optional().default("") zodat downstream altijd string heeft, nooit undefined.
// Patroon consistent met AIEffortSchema en AIPromotedEffortSchema.
export const SubEffortDossierSchema = z.object({
  eigenaar: z.string().optional().default(""),
  inspanningsleider: z.string().optional().default(""),
  verwachtResultaat: z.string().optional().default(""),
  kostenraming: z.string().optional().default(""),
  randvoorwaarden: z.string().optional().default(""),
});

// --- Phase 17: SubEffortAdvies (D-30) + Phase 18: rijke uitwerking (R-CROSS-03) ---
// Tweede-niveau effort-analyse per domein binnen een VermogenGelijkenisGroep.
// AI stelt per domein voor: combineren (cross-sector training etc.) of apart_houden.
// Phase 18 breidt uit met titel/beschrijving/beargumentatie/vermogenImpact[]/dossier{} — alle optional voor backward compat.
export const BusinessCaseQuestionSchema = z.object({
  key: z.string(),
  vraag: z.string(),
  toelichting: z.string().optional().default(""),
  inputType: z.string().optional().default("text"),
  opties: z.array(z.string()).optional().default([]),
  eenheid: z.string().optional().default(""),
});

export const BusinessCaseStateSchema = z.object({
  questions: z.array(BusinessCaseQuestionSchema).optional().default([]),
  answers: z.record(z.string(), z.string()).optional().default({}),
  result: z.object({
    kostenraming: z.string(),
    aannames: z.array(z.string()).optional().default([]),
    risicos: z.array(z.string()).optional().default([]),
  }).optional(),
  refineInstructie: z.string().optional().default(""),
  selectedKeys: z.array(z.string()).optional().default([]),
});

export const SubEffortAdviesSchema = z.object({
  // Phase 17 — bestaande velden (NIET wijzigen)
  groepId: z.string(),
  domein: z.enum(["mens", "processen", "data_systemen", "cultuur", "overig"]),
  actie: z.enum(["combineren", "apart_houden"]),
  items: z.array(z.string()),
  reden: z.string(),
  voorgesteldeNaam: z.string().nullable().optional(),
  // Phase 18 — rijke uitwerking (alle optional voor backward compat)
  titel: z.string().optional(),
  beschrijving: z.string().optional(),
  beargumentatie: z.string().optional(),
  vermogenImpact: z.array(SubEffortVermogenImpactSchema).optional(),
  dossier: SubEffortDossierSchema.optional(),
  // Phase 19 — business-case Q&A state (auto-persist via subEffortAnalysis)
  businessCase: BusinessCaseStateSchema.optional(),
});

export const InspanningClusterItemSchema = z.object({
  clusterTitel: z.string(),
  items: z.array(z.object({
    id: z.string(),
    beschrijving: z.string(),
    sector: z.string(),
    domein: z.string(),
  })),
  batenContext: z.array(z.object({
    baat: z.string(),
    sector: z.string(),
  })),
  advies: z.string(),
  aanbeveling: z.enum(["combineren", "afstemmen", "apart_houden"]),
});

export const ProjectMatchItemSchema = z.object({
  project: z.string(),
  heeftMatch: z.boolean(),
  gekoppeldAan: z.string().optional(),
  type: z.string().optional(),
  advies: z.string(),
});

export const CrossAnalyseResultSchema = z.object({
  synergie: z.object({
    titel: z.string(),
    toelichting: z.string(),
    items: z.array(CrossAnalyseSynergieItemSchema),
  }),
  gaps: z.object({
    titel: z.string(),
    toelichting: z.string(),
    doelenZonderBaten: z.array(z.string()),
    batenZonderVermogens: z.array(z.string()),
    vermogensZonderInspanningen: z.array(z.string()),
  }),
  hefboomwerking: z.object({
    titel: z.string(),
    toelichting: z.string(),
    items: z.array(CrossAnalyseHefboomItemSchema),
  }),
  domeinBalans: z.object({
    titel: z.string(),
    toelichting: z.string(),
    domeinen: z.array(CrossAnalyseDomeinItemSchema),
  }),
  sectorOverlap: z.object({
    titel: z.string(),
    toelichting: z.string(),
    items: z.array(CrossAnalyseSectorOverlapItemSchema),
  }),
  externeProjecten: z.object({
    titel: z.string(),
    toelichting: z.string(),
    items: z.array(CrossAnalyseExternItemSchema),
  }),
});

// --- AI Sectorplan analyse (soepelere defaults voor AI output, nodig voor DINSession) ---

const AIAnalyseSectieSchema = z.object({
  titel: z.string().optional().default(""),
  toelichting: z.string().optional().default(""),
  punten: z.array(z.string()).optional().default([]),
});

const aiAnalyseSectieDefault = () => ({ titel: "", toelichting: "", punten: [] as string[] });

export const AISectorplanAnalyseSchema = z.object({
  samenvatting: z.string().optional().default(""),
  aansluiting: AIAnalyseSectieSchema.optional().default(aiAnalyseSectieDefault),
  baten: AIAnalyseSectieSchema.optional().default(aiAnalyseSectieDefault),
  vermogens: AIAnalyseSectieSchema.optional().default(aiAnalyseSectieDefault),
  inspanningen: z
    .object({
      titel: z.string().optional().default(""),
      toelichting: z.string().optional().default(""),
      mens: z.array(z.string()).optional().default([]),
      processen: z.array(z.string()).optional().default([]),
      data_systemen: z.array(z.string()).optional().default([]),
      cultuur: z.array(z.string()).optional().default([]),
    })
    .optional()
    .default(() => ({
      titel: "",
      toelichting: "",
      mens: [] as string[],
      processen: [] as string[],
      data_systemen: [] as string[],
      cultuur: [] as string[],
    })),
  aandachtspunten: AIAnalyseSectieSchema.optional().default(aiAnalyseSectieDefault),
});

// --- Per-step cross-analyse schemas (Phase 11 — stapsgewijs wizard) ---

export const Stap1ResultSchema = z.object({
  batenPerSector: z.array(z.object({
    sector: z.string(),
    baten: z.array(z.object({
      titel: z.string(),
      doelId: z.string().optional(),
      doelNaam: z.string().optional(),
    })),
  })),
  synergieën: z.array(z.object({
    beschrijving: z.string(),
    sectoren: z.array(z.string()),
    impact: z.string(),
  })).optional().default([]),
  gaps: z.object({
    doelenZonderBaten: z.array(z.string()).optional().default([]),
    batenZonderVermogens: z.array(z.string()).optional().default([]),
  }).optional().default(() => ({ doelenZonderBaten: [], batenZonderVermogens: [] })),
  samenvatting: z.string(),
});

export const Stap2ResultSchema = z.object({
  vermogenClusters: z.array(VermogenClusterItemSchema).optional().default([]),
  hefboomwerking: z.array(CrossAnalyseHefboomItemSchema).optional().default([]),
  // D-30 (Phase 17): nieuwe vermogen-gelijkenis groepen (markering, geen merge)
  vermogenGelijkenisGroepen: z.array(VermogenGelijkenisGroepSchema).optional().default([]),
  samenvatting: z.string(),
});

export const Stap3ResultSchema = z.object({
  inspanningClusters: z.array(InspanningClusterItemSchema).optional().default([]),
  projectMatching: z.array(ProjectMatchItemSchema).optional().default([]),
  samenvatting: z.string(),
});

export const Stap4ResultSchema = z.object({
  consolidatieAdvies: z.array(z.object({
    clusterTitel: z.string(),
    type: z.enum(["vermogen", "inspanning"]),
    aanbeveling: z.enum(["combineren", "afstemmen", "apart_houden"]),
    reden: z.string(),
    voorgesteldeNaam: z.string().nullable().optional(),
    afstemmingsStappen: z.array(z.string()).optional().default([]),
    // D-19 (Phase 17): user-context voor herzie-advies (vrij tekstveld bij B-path)
    context: z.string().optional(),
  })).optional().default([]),
  citobreedInzicht: z.array(z.object({
    domein: z.enum(["mens", "processen", "data_systemen", "cultuur", "overig"]),
    titel: z.string(),
    beschrijving: z.string(),
    onderbouwing: z.string(),
    relevanteItems: z.array(z.string()).optional().default([]),
  })).optional().default([]),
  // D-30 (Phase 17): sub-effort analyse per VermogenGelijkenisGroep × domein
  subEffortAnalysis: z.array(SubEffortAdviesSchema).optional().default([]),
  samenvatting: z.string(),
  // Stap 6 (Optimaliseren) output — out-of-pocket begroting per scenario
  begrotingAdvies: z.lazy(() => BegrotingAdviesSchema).optional(),
  // Stap 7 (Interne Uren) output — Cito-uren + kosten per scenario
  stap7InterneUren: z.lazy(() => Stap7InterneUrenSchema).optional(),
});

export const Stap5ResultSchema = z.object({
  focusDoelId: z.string(),
  focusDoelNaam: z.string(),
  vermogenReview: z.array(z.object({
    vermogenId: z.string(),
    hefboomAnalyse: z.string(),
    suggestieAanscherping: z.string().nullable().optional(),
  })).default([]),
  inspanningReview: z.array(z.object({
    inspanningId: z.string(),
    breedteOordeel: z.enum(["dekt_volledig", "moet_verbreed", "mist_aspect"]),
    toelichting: z.string(),
    suggestieVerbreding: z.string().nullable().optional(),
  })).default([]),
  batenDekking: z.array(z.object({
    baatId: z.string(),
    sector: z.string(),
    wordtGeraakt: z.boolean(),
    redenering: z.string(),
    risico: z.string().nullable().optional(),
  })).default([]),
  samenvatting: z.string(),
});

// --- Planning & Roadmap (Phase 20: bundel-gedreven roadmap obv cross-analyse) ---
// AI-voorstel voor de 4 gezamenlijke (cross-sectorale) inspanningen uit stap 4
// (subEffortAnalysis — exact 1 bundel per domein). Elke bundel loopt over
// meerdere kwartalen (6-9 maanden per cyclus/cohort); geen losse effort-planning.
export const BundelPlanningSchema = z.object({
  bundelId: z.string(),            // stabiele id: `${groepId}:${domein}`
  domein: EffortDomainSchema,
  titel: z.string(),
  startKwartaal: z.string(),       // bv "Q2 2026"
  eindKwartaal: z.string(),        // bv "Q4 2026" (6-9 maanden = 2-3 kwartalen verder)
  cyclusLabel: z.string(),         // bv "Cyclus 1" / "Cohort 1"
  beargumentatie: z.string(),
  afhankelijkVan: z.array(z.string()).optional().default([]),  // andere bundelIds
  mijlpalen: z.array(z.object({
    periode: z.string(),           // bv "Q2-Q3 2026"
    mijlpaal: z.string(),
  })).optional().default([]),
  risico: z.string().optional(),
});

export const PlanningVoorstelSchema = z.object({
  bundelPlanning: z.array(BundelPlanningSchema).optional().default([]),
  samenvatting: z.string(),
  gegenereerdOp: z.string().optional(),  // ISO date
  // Handgeschreven toelichting door de programma-eigenaar (los van het AI-voorstel).
  // Wordt apart gerenderd in de app en export.
  toelichting: z.string().optional().default(""),
});

// --- Begrotingsadvies (stap 6 Optimaliseren) — 4 scenario's (optimaal/+20%/−20%/advies) ---
export const InspanningBegrotingSchema = z.object({
  inspanningTitel: z.string(),
  groepId: z.string().optional(),
  domein: z.enum(["mens", "processen", "data_systemen", "cultuur", "overig"]),
  totaalEuro: z.number(),
  percentageTotaal: z.number(),
  motivatie: z.string(),
  verdelingPerJaar: z.array(z.object({
    jaar: z.number(),
    percentage: z.number(),
    euro: z.number(),
    fase: z.string(),
    activiteit: z.string().optional(),
  })),
  volgorde: z.object({
    rank: z.number(),
    reden: z.string(),
  }),
});

export const BegrotingScenarioSchema = z.object({
  label: z.enum(["optimaal", "plus20", "min20", "advies"]),
  jaarlijksBudgetEuro: z.number(),
  aantalJaren: z.number(),
  totaalGeraamdEuro: z.number(),
  inspanningen: z.array(InspanningBegrotingSchema).default([]),
  totalenPerJaar: z.array(z.object({
    jaar: z.number(),
    euro: z.number(),
    percentage: z.number(),
  })).default([]),
  prioriteitAdvies: z.string().optional().default(""),
  samenvatting: z.string().optional().default(""),
});

export const BegrotingAdviesSchema = z.object({
  jaarlijksBudgetBasis: z.number(),
  startJaar: z.number(),
  cyclusMaanden: z.number(),
  scenarios: z.object({
    optimaal: BegrotingScenarioSchema.nullable(),
    plus20: BegrotingScenarioSchema.nullable(),
    min20: BegrotingScenarioSchema.nullable(),
    advies: BegrotingScenarioSchema.nullable().optional(),
  }),
  vergelijking: z.string().optional().default(""),
  partialFailures: z.array(z.string()).optional().default([]),
  // Vlag die wordt gezet door de begroting-advies route bij elke succesvolle
  // generatie via de huidige prompt (regel 10: geen absolute jaartallen).
  // Als true: motivatie/samenvatting/prioriteitAdvies zijn scenario-bewust
  // hergeschreven en de "tekst-coherentie"-banner in §4.1 verdwijnt. Sessies
  // van vóór deze flag krijgen geen vlag = banner blijft tonen.
  tekstenSchoon: z.boolean().optional(),
});

// Interne uren (stap 7) — per domein × jaar, gekoppeld aan stap 6 scenario's
export const InterneUrenRolSchema = z.object({
  functieId: z.string(),
  functieNaam: z.string(),
  afdeling: z.string().optional(),
  uren: z.number(),
  uurtarief: z.number(),
  kosten: z.number(),
});

export const DomeinJaarBlokSchema = z.object({
  jaar: z.number(),
  activiteit: z.string(),
  rollen: z.array(InterneUrenRolSchema),
  totaalUren: z.number().optional(),
  totaalKosten: z.number().optional(),
});

export const DomeinInterneUrenSchema = z.object({
  domein: z.enum(["cultuur", "mens", "data_systemen", "processen"]),
  koppeling: z.array(z.string()).optional().default([]),
  jaren: z.array(DomeinJaarBlokSchema),
  totaalUren: z.number().optional(),
  totaalKosten: z.number().optional(),
  motivatie: z.string(),
});

export const InterneUrenScenarioSchema = z.object({
  scenarioLabel: z.enum(["optimaal", "plus20", "min20", "advies"]),
  aantalJaren: z.number(),
  startJaar: z.number(),
  uurtariefGebruikt: z.number(),
  domeinen: z.array(DomeinInterneUrenSchema),
  totalenPerJaar: z.array(z.object({
    jaar: z.number(),
    uren: z.number(),
    kosten: z.number(),
  })).optional(),
  totaalUren: z.number().optional(),
  totaalKosten: z.number().optional(),
  samenvatting: z.string().optional(),
});

export const Stap7InterneUrenSchema = z.object({
  uurtariefSettings: z.object({
    basisTarief: z.number(),
    referentiejaar: z.number(),
    indexatiePercentage: z.number(),
  }),
  scenarios: z.object({
    optimaal: InterneUrenScenarioSchema.nullable(),
    plus20: InterneUrenScenarioSchema.nullable(),
    min20: InterneUrenScenarioSchema.nullable(),
    advies: InterneUrenScenarioSchema.nullable().optional(),
  }),
  partialFailures: z.array(z.string()).optional().default([]),
  // Vlag die wordt gezet door de interne-uren-advies route bij elke
  // succesvolle generatie via de huidige prompt. Als true: samenvatting
  // (top-level) + motivatie (per domein) zijn scenario-bewust hergeschreven
  // en de "tekst-coherentie"-banner in §4.2 verdwijnt.
  tekstenSchoon: z.boolean().optional(),
});

// Totaaloverzicht (stap 8) — combineert stap 6 + stap 7
export const ScenarioTotaalSchema = z.object({
  scenarioLabel: z.enum(["optimaal", "plus20", "min20", "advies"]),
  perJaar: z.array(z.object({
    jaar: z.number(),
    outOfPocket: z.number(),
    interneUren: z.number(),
    totaal: z.number(),
  })),
  totaalOutOfPocket: z.number(),
  totaalInterneUren: z.number(),
  totaalGeraamd: z.number(),
});

// Notitie-velden in Stap 8 die de gebruiker (programmamanager) noteert
// als feedback voor Claude tussen sessies door. Per scenario en globaal.
// Niet bedoeld voor stakeholders — verschijnt niet in export.
export const ClaudeNotitieSchema = z.object({
  id: z.string(),
  tekst: z.string(),
  createdAt: z.string(),
  status: z.enum(["open", "opgepakt"]).default("open"),
});

export const Stap8ClaudeNotesSchema = z.object({
  globaal: z.array(ClaudeNotitieSchema).optional().default([]),
  perScenario: z.object({
    optimaal: z.array(ClaudeNotitieSchema).optional().default([]),
    plus20: z.array(ClaudeNotitieSchema).optional().default([]),
    min20: z.array(ClaudeNotitieSchema).optional().default([]),
    advies: z.array(ClaudeNotitieSchema).optional().default([]),
  }).optional(),
});

export const Stap8TotaaloverzichtSchema = z.object({
  scenarios: z.object({
    optimaal: ScenarioTotaalSchema.nullable(),
    plus20: ScenarioTotaalSchema.nullable(),
    min20: ScenarioTotaalSchema.nullable(),
    advies: ScenarioTotaalSchema.nullable().optional(),
  }),
  actiefScenario: z.enum(["optimaal", "plus20", "min20", "advies"]).optional(),
  // Vrije tekst-notitie van programmamanager na stuurgroep-overleg.
  // Wordt boven §4.3 in de export gerenderd zodat stuurgroep-input
  // expliciet meegenomen wordt zonder dat er getallen herrekend hoeven worden.
  stuurgroepNotitie: z.string().optional(),
  // Privé feedback-notities van programmamanager voor Claude.
  // Niet voor stakeholders, niet in export.
  claudeNotes: Stap8ClaudeNotesSchema.optional(),
});

export const CrossAnalyseWizardStateSchema = z.object({
  currentStep: z.number().min(1).max(9),
  completedSteps: z.array(z.number()),
  wizardVersion: z.number().optional(),
  stepResults: z.object({
    stap1: Stap1ResultSchema.optional(),
    stap2: Stap2ResultSchema.optional(),
    stap3: Stap3ResultSchema.optional(),
    stap4: Stap4ResultSchema.optional(),
    stap5: Stap5ResultSchema.optional(),
    stap7: Stap7InterneUrenSchema.optional(),
    stap8: Stap8TotaaloverzichtSchema.optional(),
  }).optional(),
});

// ============================================================
// Programmaorganisatie & RASCI (Werken aan Programma's, Hfst 6)
// ============================================================

export const ProgrammaRolSchema = z.object({
  id: z.string(),
  rol: z.string(),
  naam: z.string().optional().default(""),
  functie: z.string().optional().default(""),
  sector: z.string().optional().default(""),
  mandaat: z.string().optional().default(""),
  toelichting: z.string().optional().default(""),
});

export const ProgrammaorganisatieSchema = z.object({
  opdrachtgever: ProgrammaRolSchema.optional(),
  programmamanager: ProgrammaRolSchema.optional(),
  kerngroep: z.array(ProgrammaRolSchema).optional().default([]),
  stuurgroep: z.array(ProgrammaRolSchema).optional().default([]),
  // Adviesgroep: intern, gezaghebbend/inhoudelijk advies aan opdrachtgever + stuurgroep,
  // GEEN besluitmandaat. Onderscheiden van de klankbordgroep (externe klant-/buitenwereld-
  // reflectie). Beide adviseren, maar vanuit een andere positie.
  adviesgroep: z.array(ProgrammaRolSchema).optional().default([]),
  klankbordgroep: z.array(ProgrammaRolSchema).optional().default([]),
  domeineigenaren: z.array(ProgrammaRolSchema).optional().default([]),
  besluitvormingsritme: z.string().optional().default(""),
  escalatiepad: z.string().optional().default(""),
  aiToelichting: z.string().optional().default(""),
});

// V toegevoegd: optionele Verifier (onafhankelijke verificatie van baten/leverables)
export const RasciLetterSchema = z.enum(["R", "A", "S", "C", "I", "V"]);

// `bron` (optional, no default) tracks of de cel uit cross-analyse is afgeleid
// of door de gebruiker handmatig is gezet. Afwezig = behandelen als "manual"
// (backward compat met bestaande sessies). Sync-knop ververst alleen cellen
// met expliciete bron === "derived".
export const RasciRijSchema = z.object({
  rolId: z.string(),
  letter: RasciLetterSchema,
  bron: z.enum(["derived", "manual"]).optional(),
});

export const RasciOnderdeelTypeSchema = z.enum(["benefit", "capability", "effort"]);
export const RasciClusterTypeSchema = z.enum(["vermogen", "inspanning", "doel", "baat"]);

export const RasciOverrideSchema = z.object({
  onderdeelId: z.string(),
  onderdeelType: RasciOnderdeelTypeSchema,
  rijen: z.array(RasciRijSchema).optional().default([]),
  reden: z.string().optional().default(""),
});

export const ClusterRasciSchema = z.object({
  clusterTitel: z.string(),
  clusterType: RasciClusterTypeSchema,
  toelichting: z.string().optional().default(""),
  rijen: z.array(RasciRijSchema).optional().default([]),
  overrides: z.array(RasciOverrideSchema).optional().default([]),
});

// AI response schemas voor governance-mapping route
export const AIProgrammaRolSchema = z.object({
  rol: z.string().optional().default(""),
  naam: z.string().optional().default(""),
  functie: z.string().optional().default(""),
  sector: z.string().optional().default(""),
  mandaat: z.string().optional().default(""),
  toelichting: z.string().optional().default(""),
});

export const AIProgrammaorganisatieSchema = z.object({
  opdrachtgever: AIProgrammaRolSchema.optional(),
  programmamanager: AIProgrammaRolSchema.optional(),
  kerngroep: z.array(AIProgrammaRolSchema).optional().default([]),
  stuurgroep: z.array(AIProgrammaRolSchema).optional().default([]),
  adviesgroep: z.array(AIProgrammaRolSchema).optional().default([]),
  klankbordgroep: z.array(AIProgrammaRolSchema).optional().default([]),
  domeineigenaren: z.array(AIProgrammaRolSchema).optional().default([]),
  besluitvormingsritme: z.string().optional().default(""),
  escalatiepad: z.string().optional().default(""),
  aiToelichting: z.string().optional().default(""),
});

export const AIRasciRijSchema = z.object({
  rolLabel: z.string(),
  letter: RasciLetterSchema,
});

export const AIClusterRasciSchema = z.object({
  clusterTitel: z.string(),
  clusterType: RasciClusterTypeSchema,
  toelichting: z.string().optional().default(""),
  rijen: z.array(AIRasciRijSchema).optional().default([]),
});

export const AIGovernanceRasciResponseSchema = z.object({
  clusters: z.array(AIClusterRasciSchema),
});

// --- Item-RASCI: per individuele baat / vermogen / inspanning ---
export const RasciItemTypeSchema = z.enum(["benefit", "capability", "effort"]);

export const ItemRasciSchema = z.object({
  itemId: z.string(),
  itemType: RasciItemTypeSchema,
  sectorId: z.string().optional(),
  rijen: z.array(RasciRijSchema).optional().default([]),
  toelichting: z.string().optional().default(""),
});

export const AIItemRasciSchema = z.object({
  itemId: z.string(),
  rijen: z.array(AIRasciRijSchema).optional().default([]),
  toelichting: z.string().optional().default(""),
});

export const AIGovernanceItemRasciResponseSchema = z.object({
  items: z.array(AIItemRasciSchema),
});

// ============================================================
// "Gezamenlijke" RASCI — primaire view voor stap 5, afgeleid uit cross-analyse
// stap 4 (Optimaliseren). Eigen veld zodat legacy clusterRasci/itemRasci data
// 100% intact blijft. Vier vaste secties:
//   - sector_baten             (per sector × baat uit stap 1.batenPerSector)
//   - gezamenlijke_vermogens   (per VermogenGelijkenisGroep uit stap 2)
//   - gezamenlijke_inspanningen (per subEffortAnalysis met ingevuld dossier)
//   - programmagovernance      (vaste rijen: besluitvorming/rapportage/escalatie/baten-realisatie)
// ============================================================

export const GezamenlijkeRasciSectieSchema = z.enum([
  "sector_baten",
  "gezamenlijke_vermogens",
  "gezamenlijke_inspanningen",
  "programmagovernance",
]);

export const GezamenlijkRasciItemSchema = z.object({
  sectie: GezamenlijkeRasciSectieSchema,
  itemId: z.string(), // stabiele unieke key binnen sectie
  itemTitel: z.string(),
  // Vrije meta voor weergave (sectorId, domein, groepId, ...). Geen vaste keys
  // zodat we backward compatible blijven bij uitbreidingen.
  meta: z.record(z.string(), z.string()).optional().default({}),
  rijen: z.array(RasciRijSchema).optional().default([]),
  toelichting: z.string().optional().default(""),
});

// ============================================================
// DINSession schema
// ============================================================

export const DINSessionSchema = z.object({
  id: z.string(),
  name: z.string(),
  createdAt: z.string(),
  updatedAt: z.string(),
  version: z.number().optional().default(1),
  currentStep: z.number(),
  vision: ProgrammeVisionSchema.optional(),
  goals: z.array(ProgrammeGoalSchema),
  scope: ProgrammeScopeSchema.optional(),
  sectorPlans: z.array(SectorPlanSchema),
  pmcEntries: z.array(PMCEntrySchema),
  benefits: z.array(DINBenefitSchema),
  capabilities: z.array(DINCapabilitySchema),
  efforts: z.array(DINEffortSchema),
  // Koppelingen — default [] voor legacy data
  goalBenefitMaps: z.array(GoalBenefitMapSchema).optional().default([]),
  benefitCapabilityMaps: z.array(BenefitCapabilityMapSchema).optional().default([]),
  capabilityEffortMaps: z.array(CapabilityEffortMapSchema).optional().default([]),
  projectCapabilityMaps: z.array(ProjectCapabilityMapSchema).optional().default([]),
  // Opgeslagen analyses
  sectorAnalyses: z.record(z.string(), AISectorplanAnalyseSchema).optional(),
  verrijkteSectorplannen: z.record(z.string(), z.string()).optional(),
  crossAnalyse: z.string().optional(),
  crossAnalyseWizard: CrossAnalyseWizardStateSchema.optional(),
  externalProjects: z.array(ExternalProjectSchema).optional(),
  // Opgeslagen integratie-adviezen per sector
  integratieAdvies: z.record(z.string(), z.unknown()).optional(),
  // Doel-voor-doel voortgang: welke doelen zijn afgerond
  completedGoals: z.array(z.string()).optional().default([]),
  // Programmaorganisatie & RASCI (Werken aan Programma's, Hfst 6)
  programmaorganisatie: ProgrammaorganisatieSchema.optional(),
  clusterRasci: z.array(ClusterRasciSchema).optional().default([]),
  itemRasci: z.array(ItemRasciSchema).optional().default([]),
  // "Gezamenlijke" RASCI — primaire view stap 5, afgeleid uit cross-analyse.
  // Aparte field zodat legacy clusterRasci/itemRasci onaangeroerd blijven.
  gezamenlijkeRasci: z.array(GezamenlijkRasciItemSchema).optional().default([]),
  // Phase 20: AI-planning-voorstel (roadmap obv cross-analyse stap 6+7)
  planningVoorstel: PlanningVoorstelSchema.optional(),
});

// ============================================================
// AI Response schemas (ZONDER id/goalId/sectorId — per Pitfall 6)
// ============================================================

export const AIBenefitSchema = z.object({
  title: z.string().optional().default(""),
  description: z.string().optional().default(""),
  profiel: z.object({
    bateneigenaar: z.string().optional().default(""),
    indicator: z.string().optional().default(""),
    indicatorOwner: z.string().optional().default(""),
    currentValue: z.string().optional().default(""),
    targetValue: z.string().optional().default(""),
    meetmethode: z.string().optional().default(""),
    measurementMoment: z.string().optional().default(""),
  }),
});

export const AICapabilitySchema = z.object({
  title: z.string().optional().default(""),
  description: z.string().optional().default(""),
  currentLevel: z.number().optional(),
  targetLevel: z.number().optional(),
  profiel: z
    .object({
      eigenaar: z.string().optional().default(""),
      huidieSituatie: z.string().optional().default(""),
      gewensteSituatie: z.string().optional().default(""),
    })
    .optional(),
});

export const AIEffortSchema = z.object({
  title: z.string().optional().default(""),
  description: z.string().optional().default(""),
  domain: FlexEffortDomainSchema,
  quarter: z.string().optional(),
  dossier: z
    .object({
      eigenaar: z.string().optional().default(""),
      inspanningsleider: z.string().optional().default(""),
      verwachtResultaat: z.string().optional().default(""),
      kostenraming: z.string().optional().default(""),
      randvoorwaarden: z.string().optional().default(""),
    })
    .optional(),
});

export const AIDINMappingResponseSchema = z.object({
  benefits: z.array(AIBenefitSchema).max(4),
  capabilities: z.array(AICapabilitySchema).max(8),
  efforts: z.array(AIEffortSchema).max(12),
});

// --- AI Suggest schemas ---

export const AISuggestBaatSchema = z.object({
  feedback: z.string().optional(),
  title: z.string().optional(),
  description: z.string(),
  bateneigenaar: z.string().optional(),
  indicator: z.string().optional(),
  indicatorOwner: z.string().optional(),
  currentValue: z.string().optional(),
  targetValue: z.string().optional(),
  meetmethode: z.string().optional(),
  measurementMoment: z.string().optional(),
});

export const AISuggestVermogenSchema = z.object({
  feedback: z.string().optional(),
  title: z.string().optional(),
  description: z.string(),
  currentLevel: z.number().optional(),
  targetLevel: z.number().optional(),
  eigenaar: z.string().optional(),
  huidieSituatie: z.string().optional(),
  gewensteSituatie: z.string().optional(),
});

export const AISuggestInspanningSchema = z.object({
  feedback: z.string().optional(),
  title: z.string().optional(),
  description: z.string(),
  domain: FlexEffortDomainSchema.optional(),
  quarter: z.string().optional(),
  eigenaar: z.string().optional(),
  inspanningsleider: z.string().optional(),
  verwachtResultaat: z.string().optional(),
  kostenraming: z.string().optional(),
  randvoorwaarden: z.string().optional(),
});

// --- AI Cross-analyse (soepelere defaults) ---

const aiTitelToelichtingItemsDefault = <T,>() => ({
  titel: "",
  toelichting: "",
  items: [] as T[],
});

export const AICrossAnalyseSchema = z.object({
  synergie: z
    .object({
      titel: z.string().optional().default(""),
      toelichting: z.string().optional().default(""),
      items: z.array(CrossAnalyseSynergieItemSchema).optional().default([]),
    })
    .optional()
    .default(() => aiTitelToelichtingItemsDefault<z.infer<typeof CrossAnalyseSynergieItemSchema>>()),
  gaps: z
    .object({
      titel: z.string().optional().default(""),
      toelichting: z.string().optional().default(""),
      doelenZonderBaten: z.array(z.string()).optional().default([]),
      batenZonderVermogens: z.array(z.string()).optional().default([]),
      vermogensZonderInspanningen: z.array(z.string()).optional().default([]),
    })
    .optional()
    .default(() => ({
      titel: "",
      toelichting: "",
      doelenZonderBaten: [] as string[],
      batenZonderVermogens: [] as string[],
      vermogensZonderInspanningen: [] as string[],
    })),
  hefboomwerking: z
    .object({
      titel: z.string().optional().default(""),
      toelichting: z.string().optional().default(""),
      items: z.array(CrossAnalyseHefboomItemSchema).optional().default([]),
    })
    .optional()
    .default(() => aiTitelToelichtingItemsDefault<z.infer<typeof CrossAnalyseHefboomItemSchema>>()),
  domeinBalans: z
    .object({
      titel: z.string().optional().default(""),
      toelichting: z.string().optional().default(""),
      domeinen: z.array(CrossAnalyseDomeinItemSchema).optional().default([]),
    })
    .optional()
    .default(() => ({
      titel: "",
      toelichting: "",
      domeinen: [] as z.infer<typeof CrossAnalyseDomeinItemSchema>[],
    })),
  sectorOverlap: z
    .object({
      titel: z.string().optional().default(""),
      toelichting: z.string().optional().default(""),
      items: z.array(CrossAnalyseSectorOverlapItemSchema).optional().default([]),
    })
    .optional()
    .default(() => aiTitelToelichtingItemsDefault<z.infer<typeof CrossAnalyseSectorOverlapItemSchema>>()),
  externeProjecten: z
    .object({
      titel: z.string().optional().default(""),
      toelichting: z.string().optional().default(""),
      items: z.array(CrossAnalyseExternItemSchema).optional().default([]),
    })
    .optional()
    .default(() => aiTitelToelichtingItemsDefault<z.infer<typeof CrossAnalyseExternItemSchema>>()),
  vermogenClusters: z
    .object({
      titel: z.string().optional().default(""),
      toelichting: z.string().optional().default(""),
      items: z.array(VermogenClusterItemSchema).optional().default([]),
    })
    .optional()
    .default(() => aiTitelToelichtingItemsDefault<z.infer<typeof VermogenClusterItemSchema>>()),
  inspanningClusters: z
    .object({
      titel: z.string().optional().default(""),
      toelichting: z.string().optional().default(""),
      items: z.array(InspanningClusterItemSchema).optional().default([]),
    })
    .optional()
    .default(() => aiTitelToelichtingItemsDefault<z.infer<typeof InspanningClusterItemSchema>>()),
  projectMatching: z
    .object({
      titel: z.string().optional().default(""),
      toelichting: z.string().optional().default(""),
      items: z.array(ProjectMatchItemSchema).optional().default([]),
    })
    .optional()
    .default(() => aiTitelToelichtingItemsDefault<z.infer<typeof ProjectMatchItemSchema>>()),
});

// --- AI Project Extraction (Phase 12) ---

export const AIExtractedProjectSchema = z.object({
  name: z.string(),
  description: z.string(),
  status: EffortStatusSchema.optional().default("in_uitvoering"),
  domains: z.array(FlexEffortDomainSchema).optional().default([]),
  aiWarning: z.string().optional(),
});

export const AIProjectExtractionResponseSchema = z.object({
  projects: z.array(AIExtractedProjectSchema).max(20),
});

// --- AI Project-Capability Matching (Phase 12) ---

export const AIProjectCapabilityMatchSchema = z.object({
  projectId: z.string(),
  suggestedCapabilityIds: z.array(z.string()),
  confidence: z.enum(["hoog", "gemiddeld", "laag"]),
  toelichting: z.string(),
  warning: z.string().optional(),
});

export const AIProjectCapabilityMatchResponseSchema = z.object({
  matches: z.array(AIProjectCapabilityMatchSchema),
});

// --- AI Project Promotion (Phase 14) ---
// Combined-shot promotion result: benefit matches + capability matches +
// 1-4 split efforts + findings. Used by promote-project API route. (D-02, D-05, D-14)

export const FindingSuggestionSchema = z.object({
  type: z.enum(["baat", "vermogen", "inspanning"]),
  beschrijving: z.string(),
  toelichting: z.string(),
  targetSector: SectorNameSchema,
  // For inspanning findings, allow AI to hint a domain (optional)
  domain: FlexEffortDomainSchema.optional(),
});

export const AIPromotedEffortSchema = z.object({
  title: z.string(),
  description: z.string(),
  domain: FlexEffortDomainSchema,
  // D-07: default to in_uitvoering (lopend project)
  status: EffortStatusSchema.optional().default("in_uitvoering"),
  quarter: z.string().optional(),
  responsibleSector: z.string().optional(),
  // Reuse InspanningsDossierSchema for consistency; all fields optional on AI side
  dossier: z
    .object({
      eigenaar: z.string().optional().default(""),
      inspanningsleider: z.string().optional().default(""),
      verwachtResultaat: z.string().optional().default(""),
      kostenraming: z.string().optional().default(""),
      randvoorwaarden: z.string().optional().default(""),
    })
    .optional(),
  // AI's reasoning for why THIS split effort exists (shown in review UI)
  rationale: z.string().optional(),
});

export const AIPromotedBenefitMatchSchema = z.object({
  benefitId: z.string(), // Matches an existing DINBenefit.id from the session
  toelichting: z.string(),
});

export const AIPromotedCapabilityMatchSchema = z.object({
  capabilityId: z.string(), // Matches an existing DINCapability.id
  toelichting: z.string(),
});

export const ProjectPromotieResultSchema = z.object({
  benefitMatches: z.array(AIPromotedBenefitMatchSchema).optional().default([]),
  // D-02: at least one capability must be suggested (project must land in DIN-keten)
  capabilityMatches: z.array(AIPromotedCapabilityMatchSchema).min(1),
  // D-05: hard constraint 1..4
  splitEfforts: z.array(AIPromotedEffortSchema).min(1).max(4),
  findings: z.array(FindingSuggestionSchema).optional().default([]),
  samenvatting: z.string(),
});

// --- AI Domain Recommend ---

export const AIDomainRecommendSchema = z.object({
  aanbevolenDomein: FlexEffortDomainSchema,
  vertrouwen: z.enum(["hoog", "gemiddeld"]).optional().default("gemiddeld"),
  redenering: z.string().optional().default(""),
  alternatiefDomein: FlexEffortDomainSchema.nullable().optional().default(null),
  alternatiefRedenering: z.string().nullable().optional().default(null),
});

// ============================================================
// KiB Import schema (per D-06)
// ============================================================

export const KiBExportSchema = z.object({
  visie: z
    .object({
      uitgebreid: z.string(),
      beknopt: z.string(),
    })
    .optional(),
  doelen: z
    .array(
      z.object({
        id: z.string().optional(),
        naam: z.string(),
        beschrijving: z.string(),
        rang: z.number(),
      })
    )
    .optional()
    .default([]),
  scope: z
    .object({
      binnen: z.array(z.string()),
      buiten: z.array(z.string()),
    })
    .optional(),
  sessionId: z.string().optional(),
});

// ============================================================
// Type exports (z.infer<> — single source of truth per D-09)
// ============================================================

export type EffortDomain = z.infer<typeof EffortDomainSchema>;
export type EffortStatus = z.infer<typeof EffortStatusSchema>;
export type ApprovalStatus = z.infer<typeof ApprovalStatusSchema>;
export type Priority = z.infer<typeof PrioritySchema>;
export type SectorName = z.infer<typeof SectorNameSchema>;
export type AppStep = z.infer<typeof AppStepSchema>;

export type BatenProfiel = z.infer<typeof BatenProfielSchema>;
export type VermogensProfiel = z.infer<typeof VermogensProfielSchema>;
export type InspanningsDossier = z.infer<typeof InspanningsDossierSchema>;

export type ProgrammeGoal = z.infer<typeof ProgrammeGoalSchema>;
export type ProgrammeVision = z.infer<typeof ProgrammeVisionSchema>;
export type ProgrammeScope = z.infer<typeof ProgrammeScopeSchema>;
export type SectorPlan = z.infer<typeof SectorPlanSchema>;
export type PMCEntry = z.infer<typeof PMCEntrySchema>;
export type DINBenefit = z.infer<typeof DINBenefitSchema>;
export type DINCapability = z.infer<typeof DINCapabilitySchema>;
export type DINEffort = z.infer<typeof DINEffortSchema>;
export type ExternalProject = z.infer<typeof ExternalProjectSchema>;

export type GoalBenefitMap = z.infer<typeof GoalBenefitMapSchema>;
export type BenefitCapabilityMap = z.infer<typeof BenefitCapabilityMapSchema>;
export type CapabilityEffortMap = z.infer<typeof CapabilityEffortMapSchema>;
export type EffortPMCMap = z.infer<typeof EffortPMCMapSchema>;
export type EffortSectorMap = z.infer<typeof EffortSectorMapSchema>;
export type ProjectCapabilityMap = z.infer<typeof ProjectCapabilityMapSchema>;

export type SectorplanAnalyseResult = z.infer<typeof SectorplanAnalyseResultSchema>;
export type CrossAnalyseSynergieItem = z.infer<typeof CrossAnalyseSynergieItemSchema>;
export type CrossAnalyseHefboomItem = z.infer<typeof CrossAnalyseHefboomItemSchema>;
export type CrossAnalyseDomeinItem = z.infer<typeof CrossAnalyseDomeinItemSchema>;
export type CrossAnalyseSectorOverlapItem = z.infer<typeof CrossAnalyseSectorOverlapItemSchema>;
export type CrossAnalyseExternItem = z.infer<typeof CrossAnalyseExternItemSchema>;
export type CrossAnalyseResult = z.infer<typeof CrossAnalyseResultSchema>;
export type DINSession = z.infer<typeof DINSessionSchema>;

export type AIBenefit = z.infer<typeof AIBenefitSchema>;
export type AICapability = z.infer<typeof AICapabilitySchema>;
export type AIEffort = z.infer<typeof AIEffortSchema>;
export type AIDINMappingResponse = z.infer<typeof AIDINMappingResponseSchema>;
export type AISuggestBaat = z.infer<typeof AISuggestBaatSchema>;
export type AISuggestVermogen = z.infer<typeof AISuggestVermogenSchema>;
export type AISuggestInspanning = z.infer<typeof AISuggestInspanningSchema>;
export type AISectorplanAnalyse = z.infer<typeof AISectorplanAnalyseSchema>;
export type AICrossAnalyse = z.infer<typeof AICrossAnalyseSchema>;
export type VermogenClusterItem = z.infer<typeof VermogenClusterItemSchema>;
export type VermogenGelijkenisGroep = z.infer<typeof VermogenGelijkenisGroepSchema>;
export type SubEffortAdvies = z.infer<typeof SubEffortAdviesSchema>;
export type SubEffortVermogenImpact = z.infer<typeof SubEffortVermogenImpactSchema>;
export type SubEffortDossier = z.infer<typeof SubEffortDossierSchema>;
export type InspanningClusterItem = z.infer<typeof InspanningClusterItemSchema>;
export type ProjectMatchItem = z.infer<typeof ProjectMatchItemSchema>;
export type AIExtractedProject = z.infer<typeof AIExtractedProjectSchema>;
export type AIProjectExtractionResponse = z.infer<typeof AIProjectExtractionResponseSchema>;
export type AIProjectCapabilityMatch = z.infer<typeof AIProjectCapabilityMatchSchema>;
export type AIProjectCapabilityMatchResponse = z.infer<typeof AIProjectCapabilityMatchResponseSchema>;
export type FindingSuggestion = z.infer<typeof FindingSuggestionSchema>;
export type AIPromotedEffort = z.infer<typeof AIPromotedEffortSchema>;
export type AIPromotedBenefitMatch = z.infer<typeof AIPromotedBenefitMatchSchema>;
export type AIPromotedCapabilityMatch = z.infer<typeof AIPromotedCapabilityMatchSchema>;
export type ProjectPromotieResult = z.infer<typeof ProjectPromotieResultSchema>;
export type AIDomainRecommend = z.infer<typeof AIDomainRecommendSchema>;
export type KiBExport = z.infer<typeof KiBExportSchema>;
export type Stap1Result = z.infer<typeof Stap1ResultSchema>;
export type Stap2Result = z.infer<typeof Stap2ResultSchema>;
export type Stap3Result = z.infer<typeof Stap3ResultSchema>;
export type Stap4Result = z.infer<typeof Stap4ResultSchema>;
export type Stap5Result = z.infer<typeof Stap5ResultSchema>;
export type InterneUrenRol = z.infer<typeof InterneUrenRolSchema>;
export type DomeinJaarBlok = z.infer<typeof DomeinJaarBlokSchema>;
export type DomeinInterneUren = z.infer<typeof DomeinInterneUrenSchema>;
export type InterneUrenScenario = z.infer<typeof InterneUrenScenarioSchema>;
export type Stap7InterneUren = z.infer<typeof Stap7InterneUrenSchema>;
export type InspanningBegroting = z.infer<typeof InspanningBegrotingSchema>;
export type BegrotingScenario = z.infer<typeof BegrotingScenarioSchema>;
export type BegrotingAdvies = z.infer<typeof BegrotingAdviesSchema>;
export type ScenarioTotaal = z.infer<typeof ScenarioTotaalSchema>;
export type Stap8Totaaloverzicht = z.infer<typeof Stap8TotaaloverzichtSchema>;
export type ClaudeNotitie = z.infer<typeof ClaudeNotitieSchema>;
export type Stap8ClaudeNotes = z.infer<typeof Stap8ClaudeNotesSchema>;
export type CrossAnalyseWizardState = z.infer<typeof CrossAnalyseWizardStateSchema>;
export type PlanningVoorstel = z.infer<typeof PlanningVoorstelSchema>;
export type BundelPlanning = z.infer<typeof BundelPlanningSchema>;

export type ProgrammaRol = z.infer<typeof ProgrammaRolSchema>;
export type Programmaorganisatie = z.infer<typeof ProgrammaorganisatieSchema>;
export type RasciLetter = z.infer<typeof RasciLetterSchema>;
export type RasciRij = z.infer<typeof RasciRijSchema>;
export type RasciOnderdeelType = z.infer<typeof RasciOnderdeelTypeSchema>;
export type RasciClusterType = z.infer<typeof RasciClusterTypeSchema>;
export type RasciOverride = z.infer<typeof RasciOverrideSchema>;
export type ClusterRasci = z.infer<typeof ClusterRasciSchema>;
export type AIProgrammaorganisatie = z.infer<typeof AIProgrammaorganisatieSchema>;
export type AIGovernanceRasciResponse = z.infer<typeof AIGovernanceRasciResponseSchema>;
export type RasciItemType = z.infer<typeof RasciItemTypeSchema>;
export type ItemRasci = z.infer<typeof ItemRasciSchema>;
export type AIItemRasci = z.infer<typeof AIItemRasciSchema>;
export type AIGovernanceItemRasciResponse = z.infer<typeof AIGovernanceItemRasciResponseSchema>;
export type GezamenlijkeRasciSectie = z.infer<typeof GezamenlijkeRasciSectieSchema>;
export type GezamenlijkRasciItem = z.infer<typeof GezamenlijkRasciItemSchema>;
