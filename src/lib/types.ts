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
  SectorplanAnalyseResult,
  CrossAnalyseSynergieItem,
  CrossAnalyseHefboomItem,
  CrossAnalyseDomeinItem,
  CrossAnalyseSectorOverlapItem,
  CrossAnalyseExternItem,
  CrossAnalyseResult,
  IntegratieAdviesItem,
  IntegratieAdviesResult,
  VermogenClusterItem,
  InspanningClusterItem,
  ProjectMatchItem,
  AICrossAnalyse,
  DINSession,
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
  { key: "prioritering", label: "Planning & Goedkeuring", nummer: 5 },
  { key: "export", label: "Export", nummer: 6 },
];
