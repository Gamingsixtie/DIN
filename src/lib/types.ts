// DIN — Doelen-Inspanningennetwerk Types

// Inspanningen domeinen
export type EffortDomain = "mens" | "processen" | "data_systemen" | "cultuur";

// Status voor inspanningen
export type EffortStatus =
  | "gepland"
  | "in_uitvoering"
  | "afgerond"
  | "on_hold";

// Goedkeuringsstatus (apart van executie-status)
export type ApprovalStatus = "voorstel" | "goedgekeurd" | "afgewezen" | "aangepast";

// Prioriteit voor PMC
export type Priority = "hoog" | "midden" | "laag";

// Standaard sectoren (Data & Tech is ondersteunend, geen eigen sector)
export const SECTORS = ["PO", "VO", "Zakelijk"] as const;
export type SectorName = (typeof SECTORS)[number];

// Sector kleuren voor tags/badges
export const SECTOR_COLORS: Record<SectorName, string> = {
  PO: "bg-blue-100 text-blue-800 border-blue-200",
  VO: "bg-green-100 text-green-800 border-green-200",
  Zakelijk: "bg-purple-100 text-purple-800 border-purple-200",
};

// --- KiB Import ---

export interface ProgrammeGoal {
  id: string;
  name: string;
  description: string;
  rank: number;
  sourceSessionId?: string;
}

export interface ProgrammeVision {
  id: string;
  uitgebreid: string;
  beknopt: string;
  sourceSessionId?: string;
}

export interface ProgrammeScope {
  id: string;
  inScope: string[];
  outScope: string[];
}

// --- Sectorplannen ---

export interface SectorPlan {
  id: string;
  sectorName: string;
  rawText: string;
  parsedContent?: Record<string, unknown>;
  uploadedAt: string;
}

// --- Product-Marktcombinaties ---

export interface PMCEntry {
  id: string;
  product: string;
  marketSegment: string;
  priority: Priority;
  currentPerformance?: string;
}

// --- DIN Keten ---

export interface BatenProfiel {
  indicator: string;
  indicatorOwner: string;
  currentValue: string;
  targetValue: string;
  measurementMoment?: string;
}

export interface DINBenefit {
  id: string;
  goalId: string;
  sectorId: string;
  description: string;
  profiel: BatenProfiel;
}

export interface DINCapability {
  id: string;
  sectorId: string;
  description: string;
  relatedSectors: string[];
  currentLevel?: number; // 1-5: huidig vermogensniveau
  targetLevel?: number;  // 1-5: gewenst vermogensniveau
}

export interface DINEffort {
  id: string;
  sectorId: string;
  description: string;
  domain: EffortDomain;
  quarter?: string;
  responsibleSector?: string;
  status: EffortStatus;
  dependencies: string[];
  votes?: number;
  opmerking?: string;
  approvalStatus?: ApprovalStatus;
  approvalDate?: string;
}

// --- Koppelingen ---

export interface GoalBenefitMap {
  goalId: string;
  benefitId: string;
}

export interface BenefitCapabilityMap {
  benefitId: string;
  capabilityId: string;
}

export interface CapabilityEffortMap {
  capabilityId: string;
  effortId: string;
}

export interface EffortPMCMap {
  effortId: string;
  pmcId: string;
}

export interface EffortSectorMap {
  effortId: string;
  sectorPlanId: string;
}

// --- Sectorplan-analyse gestructureerd resultaat (Sectorwerk) ---

export interface SectorplanAnalyseResult {
  samenvatting: string;
  aansluiting: { titel: string; toelichting: string; punten: string[] };
  baten: { titel: string; toelichting: string; punten: string[] };
  vermogens: { titel: string; toelichting: string; punten: string[] };
  inspanningen: {
    titel: string;
    toelichting: string;
    mens: string[];
    processen: string[];
    data_systemen: string[];
    cultuur: string[];
  };
  aandachtspunten: { titel: string; toelichting: string; punten: string[] };
}

// --- Cross-analyse gestructureerd resultaat ---

export interface CrossAnalyseSynergieItem {
  vermogen: string;
  sectoren: string[];
  impact: string;
}

export interface CrossAnalyseHefboomItem {
  inspanning: string;
  bijdraagtAan: string[];
  prioriteit: string;
}

export interface CrossAnalyseDomeinItem {
  domein: string;
  beoordeling: string;
  advies: string;
}

export interface CrossAnalyseSectorOverlapItem {
  beschrijving: string;
  sectoren: string[];
  advies: string;
}

export interface CrossAnalyseExternItem {
  project: string;
  overlapMet: string;
  advies: string;
}

export interface CrossAnalyseResult {
  synergie: {
    titel: string;
    toelichting: string;
    items: CrossAnalyseSynergieItem[];
  };
  gaps: {
    titel: string;
    toelichting: string;
    doelenZonderBaten: string[];
    batenZonderVermogens: string[];
    vermogensZonderInspanningen: string[];
  };
  hefboomwerking: {
    titel: string;
    toelichting: string;
    items: CrossAnalyseHefboomItem[];
  };
  domeinBalans: {
    titel: string;
    toelichting: string;
    domeinen: CrossAnalyseDomeinItem[];
  };
  sectorOverlap: {
    titel: string;
    toelichting: string;
    items: CrossAnalyseSectorOverlapItem[];
  };
  externeProjecten: {
    titel: string;
    toelichting: string;
    items: CrossAnalyseExternItem[];
  };
}

// --- Integratie-advies gestructureerd resultaat ---

export interface IntegratieAdviesItem {
  titel: string;
  toelichting: string;
  punten: string[];
}

export interface IntegratieAdviesResult {
  sectorName: string;
  aansluiting: IntegratieAdviesItem;
  verrijking: IntegratieAdviesItem;
  aanvullingen: IntegratieAdviesItem;
  quickWins: IntegratieAdviesItem;
  aandachtspunten: IntegratieAdviesItem;
}

// --- Sessie ---

export interface DINSession {
  id: string;
  name: string;
  createdAt: string;
  updatedAt: string;
  currentStep: number;
  vision?: ProgrammeVision;
  goals: ProgrammeGoal[];
  scope?: ProgrammeScope;
  sectorPlans: SectorPlan[];
  pmcEntries: PMCEntry[];
  benefits: DINBenefit[];
  capabilities: DINCapability[];
  efforts: DINEffort[];
  // Koppelingen
  goalBenefitMaps: GoalBenefitMap[];
  benefitCapabilityMaps: BenefitCapabilityMap[];
  capabilityEffortMaps: CapabilityEffortMap[];
  // Opgeslagen integratie-adviezen per sector
  integratieAdvies?: Record<string, IntegratieAdviesResult | string>;
  // Opgeslagen AI sectorplan-analyses per sector (uit Sectorwerk)
  sectorAnalyses?: Record<string, string>;
  // Opgeslagen verrijkte sectorplannen per sector (uit DIN-Mapping)
  verrijkteSectorplannen?: Record<string, string>;
  // Lopende projecten die passen bij het programma KiB, per sector
  externalProjects?: ExternalProject[];
}

// --- Lopende projecten (passend bij KiB-programma) ---

export interface ExternalProject {
  id: string;
  sectorId: string;
  name: string;
  description: string;
  status: EffortStatus;
  relevance?: string; // Waarom relevant voor het programma
}

// --- App Flow Stappen ---
// Flow: eerst per sector doorlopen (methodiek), dan gezamenlijke cross-analyse

export type AppStep =
  | "import"
  | "sectorwerk"
  | "din-mapping"
  | "cross-analyse"
  | "prioritering"
  | "export";

export const APP_STEPS: { key: AppStep; label: string; nummer: number }[] = [
  { key: "import", label: "KiB Import", nummer: 1 },
  { key: "sectorwerk", label: "Sectorwerk", nummer: 2 },
  { key: "din-mapping", label: "DIN-Mapping", nummer: 3 },
  { key: "cross-analyse", label: "Cross-analyse", nummer: 4 },
  { key: "prioritering", label: "Planning & Goedkeuring", nummer: 5 },
  { key: "export", label: "Export", nummer: 6 },
];
