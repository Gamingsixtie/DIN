// DIN — Doelen-Inspanningennetwerk Types
// Types worden afgeleid uit Zod schemas (per D-09)
// Zie src/lib/schemas.ts voor de single source of truth (per D-10)

// Re-export alle types uit schemas
export type {
  EffortDomain,
  EffortStatus,
  ApprovalStatus,
  Priority,
  SectorName,
  AppStep,
  BatenProfiel,
  VermogensProfiel,
  InspanningsDossier,
  ProgrammeGoal,
  ProgrammeVision,
  ProgrammeScope,
  SectorPlan,
  PMCEntry,
  DINBenefit,
  DINCapability,
  DINEffort,
  ExternalProject,
  GoalBenefitMap,
  BenefitCapabilityMap,
  CapabilityEffortMap,
  EffortPMCMap,
  EffortSectorMap,
  ProjectCapabilityMap,
  SectorplanAnalyseResult,
  CrossAnalyseSynergieItem,
  CrossAnalyseHefboomItem,
  CrossAnalyseDomeinItem,
  CrossAnalyseSectorOverlapItem,
  CrossAnalyseExternItem,
  CrossAnalyseResult,
  VermogenClusterItem,
  InspanningClusterItem,
  ProjectMatchItem,
  AICrossAnalyse,
  DINSession,
  Stap1Result,
  Stap2Result,
  Stap3Result,
  Stap4Result,
  Stap5Result,
  CrossAnalyseWizardState,
  PlanningVoorstel,
  BundelPlanning,
  ProgrammaRol,
  Programmaorganisatie,
  RasciLetter,
  RasciRij,
  RasciOverride,
  ClusterRasci,
  RasciOnderdeelType,
  RasciClusterType,
  AIProgrammaorganisatie,
  AIGovernanceRasciResponse,
  SubEffortAdvies,
} from "./schemas";

// Import types nodig voor constanten hieronder
import type {
  EffortDomain,
  EffortStatus,
  SectorName,
  AppStep,
} from "./schemas";

// ============================================================
// Runtime constanten (behouden in types.ts)
// ============================================================

// Standaard sectoren (Data & Tech is ondersteunend, geen eigen sector)
export const SECTORS = ["PO", "VO", "Zakelijk"] as const;

// Sector kleuren voor tags/badges
export const SECTOR_COLORS: Record<SectorName, string> = {
  PO: "bg-blue-100 text-blue-800 border-blue-200",
  VO: "bg-green-100 text-green-800 border-green-200",
  Zakelijk: "bg-purple-100 text-purple-800 border-purple-200",
};

// --- Domein labels (single source of truth) ---

export const DOMAIN_LABELS: Record<EffortDomain, string> = {
  mens: "Mens",
  processen: "Processen",
  data_systemen: "Data & Systemen",
  cultuur: "Cultuur",
};

// --- Status labels & stijlen (single source of truth) ---

export const STATUS_LABELS: Record<EffortStatus, string> = {
  gepland: "Gepland",
  in_uitvoering: "In uitvoering",
  afgerond: "Afgerond",
  on_hold: "Gepauzeerd",
};

export const STATUS_STYLES: Record<EffortStatus, string> = {
  gepland: "bg-gray-100 text-gray-600",
  in_uitvoering: "bg-green-100 text-green-700",
  afgerond: "bg-blue-100 text-blue-700",
  on_hold: "bg-amber-100 text-amber-700",
};

export const STATUS_BORDER_COLORS: Record<EffortStatus, string> = {
  gepland: "#d1d5db",
  in_uitvoering: "#22c55e",
  afgerond: "#3b82f6",
  on_hold: "#f59e0b",
};

// --- Dynamische kwartalen ---

export function generateQuarters(count = 8): string[] {
  const now = new Date();
  const currentQ = Math.ceil((now.getMonth() + 1) / 3);
  const currentYear = now.getFullYear();
  const quarters: string[] = [];
  for (let i = 0; i < count; i++) {
    const q = ((currentQ - 1 + i) % 4) + 1;
    const y = currentYear + Math.floor((currentQ - 1 + i) / 4);
    quarters.push(`Q${q} ${y}`);
  }
  return quarters;
}

// --- App Flow Stappen ---
// Flow: eerst per sector doorlopen (methodiek), dan gezamenlijke cross-analyse

export const APP_STEPS: { key: AppStep; label: string; nummer: number }[] = [
  { key: "import", label: "KiB Import", nummer: 1 },
  { key: "sectorwerk", label: "Sectorwerk", nummer: 2 },
  { key: "din-mapping", label: "DIN-Mapping", nummer: 3 },
  { key: "cross-analyse", label: "Cross-analyse", nummer: 4 },
  { key: "governance", label: "Programmaorganisatie", nummer: 5 },
  { key: "prioritering", label: "Roadmap & Planning", nummer: 6 },
  { key: "export", label: "Export", nummer: 7 },
];

// --- Domein-kleuren voor roadmap-visualisatie ---

export const DOMAIN_COLORS: Record<EffortDomain, { bar: string; bg: string; text: string; border: string }> = {
  mens: { bar: "#2563eb", bg: "bg-blue-50", text: "text-blue-700", border: "border-blue-200" },
  processen: { bar: "#059669", bg: "bg-green-50", text: "text-green-700", border: "border-green-200" },
  data_systemen: { bar: "#7c3aed", bg: "bg-purple-50", text: "text-purple-700", border: "border-purple-200" },
  cultuur: { bar: "#d97706", bg: "bg-amber-50", text: "text-amber-700", border: "border-amber-200" },
};

// --- RASCI labels (single source of truth) ---

export const RASCI_LABELS: Record<"R" | "A" | "S" | "C" | "I", string> = {
  R: "Responsible",
  A: "Accountable",
  S: "Supportive",
  C: "Consulted",
  I: "Informed",
};

export const RASCI_TOELICHTING: Record<"R" | "A" | "S" | "C" | "I", string> = {
  R: "Voert het werk uit",
  A: "Eindverantwoordelijk (exact 1 per regel)",
  S: "Ondersteunt actief de uitvoering",
  C: "Wordt vooraf geraadpleegd",
  I: "Wordt geïnformeerd over voortgang",
};

export const RASCI_KLEUREN: Record<"R" | "A" | "S" | "C" | "I", string> = {
  R: "bg-blue-100 text-blue-800 border-blue-300",
  A: "bg-amber-100 text-amber-900 border-amber-400 font-bold",
  S: "bg-emerald-50 text-emerald-700 border-emerald-200",
  C: "bg-purple-50 text-purple-700 border-purple-200",
  I: "bg-gray-100 text-gray-600 border-gray-300",
};

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
