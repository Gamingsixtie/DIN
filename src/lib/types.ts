// DIN — Doelen-Inspanningennetwerk Types

// Inspanningen domeinen
export type EffortDomain = "mens" | "processen" | "data_systemen" | "cultuur";

// Status voor inspanningen
export type EffortStatus =
  | "gepland"
  | "in_uitvoering"
  | "afgerond"
  | "on_hold";

// Prioriteit voor PMC
export type Priority = "hoog" | "midden" | "laag";

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
  description: string;
  profiel: BatenProfiel;
}

export interface DINCapability {
  id: string;
  description: string;
  relatedSectors: string[];
}

export interface DINEffort {
  id: string;
  description: string;
  domain: EffortDomain;
  quarter?: string;
  responsibleSector?: string;
  status: EffortStatus;
  dependencies: string[];
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
}

// --- App Flow Stappen ---

export type AppStep =
  | "import"
  | "din-mapping"
  | "cross-analyse"
  | "prioritering"
  | "sector-integratie"
  | "export";

export const APP_STEPS: { key: AppStep; label: string; nummer: number }[] = [
  { key: "import", label: "Import & Opzet", nummer: 1 },
  { key: "din-mapping", label: "DIN-Mapping", nummer: 2 },
  { key: "cross-analyse", label: "Cross-analyse", nummer: 3 },
  { key: "prioritering", label: "Prioritering & Planning", nummer: 4 },
  { key: "sector-integratie", label: "Sectorplan-integratie", nummer: 5 },
  { key: "export", label: "Export", nummer: 6 },
];
