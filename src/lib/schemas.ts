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
]);

export const EffortStatusSchema = z.enum([
  "gepland",
  "in_uitvoering",
  "afgerond",
  "on_hold",
]);

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
  "prioritering",
  "export",
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
});

export const VermogensProfielSchema = z.object({
  eigenaar: z.string(),
  huidieSituatie: z.string(),
  gewensteSituatie: z.string(),
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
  opmerking: z.string().optional(),
  approvalStatus: ApprovalStatusSchema.optional(),
  approvalDate: z.string().optional(),
  dossier: InspanningsDossierSchema.optional(),
});

export const ExternalProjectSchema = z.object({
  id: z.string(),
  sectorId: z.string(),
  name: z.string(),
  description: z.string(),
  status: EffortStatusSchema,
  relevance: z.string().optional(),
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

// --- Integratie-advies ---

export const IntegratieAdviesItemSchema = z.object({
  titel: z.string(),
  toelichting: z.string(),
  punten: z.array(z.string()),
});

export const IntegratieAdviesResultSchema = z.object({
  sectorName: z.string(),
  aansluiting: IntegratieAdviesItemSchema,
  verrijking: IntegratieAdviesItemSchema,
  aanvullingen: IntegratieAdviesItemSchema,
  quickWins: IntegratieAdviesItemSchema,
  aandachtspunten: IntegratieAdviesItemSchema,
});

// ============================================================
// DINSession schema
// ============================================================

export const DINSessionSchema = z.object({
  id: z.string(),
  name: z.string(),
  createdAt: z.string(),
  updatedAt: z.string(),
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
  // Opgeslagen analyses
  integratieAdvies: z
    .record(z.string(), z.union([IntegratieAdviesResultSchema, z.string()]))
    .optional(),
  sectorAnalyses: z.record(z.string(), z.string()).optional(),
  verrijkteSectorplannen: z.record(z.string(), z.string()).optional(),
  crossAnalyse: z.string().optional(),
  externalProjects: z.array(ExternalProjectSchema).optional(),
});

// ============================================================
// AI Response schemas (ZONDER id/goalId/sectorId — per Pitfall 6)
// ============================================================

export const AIBenefitSchema = z.object({
  title: z.string(),
  description: z.string(),
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
  title: z.string(),
  description: z.string(),
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
  title: z.string(),
  description: z.string(),
  domain: EffortDomainSchema,
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
  benefits: z.array(AIBenefitSchema),
  capabilities: z.array(AICapabilitySchema),
  efforts: z.array(AIEffortSchema),
});

// --- AI Suggest schemas ---

export const AISuggestBaatSchema = z.object({
  title: z.string().optional(),
  description: z.string(),
  profiel: z
    .object({
      bateneigenaar: z.string().optional(),
      indicator: z.string().optional(),
      indicatorOwner: z.string().optional(),
      currentValue: z.string().optional(),
      targetValue: z.string().optional(),
      meetmethode: z.string().optional(),
      measurementMoment: z.string().optional(),
    })
    .optional(),
});

export const AISuggestVermogenSchema = z.object({
  title: z.string().optional(),
  description: z.string(),
  currentLevel: z.number().optional(),
  targetLevel: z.number().optional(),
  profiel: z
    .object({
      eigenaar: z.string().optional(),
      huidieSituatie: z.string().optional(),
      gewensteSituatie: z.string().optional(),
    })
    .optional(),
});

export const AISuggestInspanningSchema = z.object({
  title: z.string().optional(),
  description: z.string(),
  domain: EffortDomainSchema.optional(),
  quarter: z.string().optional(),
  dossier: z
    .object({
      eigenaar: z.string().optional(),
      inspanningsleider: z.string().optional(),
      verwachtResultaat: z.string().optional(),
      kostenraming: z.string().optional(),
      randvoorwaarden: z.string().optional(),
    })
    .optional(),
});

// --- AI Sectorplan analyse (soepelere defaults voor AI output) ---

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
});

// --- AI Integratie-advies (soepelere defaults) ---

const AIIntegratieAdviesItemSchema = z.object({
  titel: z.string().optional().default(""),
  toelichting: z.string().optional().default(""),
  punten: z.array(z.string()).optional().default([]),
});

const aiIntegratieAdviesItemDefault = () => ({
  titel: "",
  toelichting: "",
  punten: [] as string[],
});

export const AIIntegratieAdviesSchema = z.object({
  sectorName: z.string().optional().default(""),
  aansluiting: AIIntegratieAdviesItemSchema.optional().default(aiIntegratieAdviesItemDefault),
  verrijking: AIIntegratieAdviesItemSchema.optional().default(aiIntegratieAdviesItemDefault),
  aanvullingen: AIIntegratieAdviesItemSchema.optional().default(aiIntegratieAdviesItemDefault),
  quickWins: AIIntegratieAdviesItemSchema.optional().default(aiIntegratieAdviesItemDefault),
  aandachtspunten: AIIntegratieAdviesItemSchema.optional().default(aiIntegratieAdviesItemDefault),
});

// --- AI Domain Recommend ---

export const AIDomainRecommendSchema = z.object({
  domain: EffortDomainSchema,
  reasoning: z.string(),
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

export type SectorplanAnalyseResult = z.infer<typeof SectorplanAnalyseResultSchema>;
export type CrossAnalyseSynergieItem = z.infer<typeof CrossAnalyseSynergieItemSchema>;
export type CrossAnalyseHefboomItem = z.infer<typeof CrossAnalyseHefboomItemSchema>;
export type CrossAnalyseDomeinItem = z.infer<typeof CrossAnalyseDomeinItemSchema>;
export type CrossAnalyseSectorOverlapItem = z.infer<typeof CrossAnalyseSectorOverlapItemSchema>;
export type CrossAnalyseExternItem = z.infer<typeof CrossAnalyseExternItemSchema>;
export type CrossAnalyseResult = z.infer<typeof CrossAnalyseResultSchema>;
export type IntegratieAdviesItem = z.infer<typeof IntegratieAdviesItemSchema>;
export type IntegratieAdviesResult = z.infer<typeof IntegratieAdviesResultSchema>;
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
export type AIIntegratieAdvies = z.infer<typeof AIIntegratieAdviesSchema>;
export type AIDomainRecommend = z.infer<typeof AIDomainRecommendSchema>;
export type KiBExport = z.infer<typeof KiBExportSchema>;
