import { Stap5ResultSchema } from "./schemas";
import type {
  DINSession,
  Stap5Result,
  ProgrammeGoal,
  DINBenefit,
  DINCapability,
  DINEffort,
} from "./types";

// ============================================================
// getFocusGoal — D-01 locked expression
// EXACT dezelfde logica in client (StapSectorVertaling.tsx) en server (route.ts)
// ============================================================

export function getFocusGoal<T extends { rank?: number }>(goals: T[]): T | undefined {
  if (goals.length === 0) return undefined;
  return [...goals].sort((a, b) => (a.rank ?? 999) - (b.rank ?? 999))[0];
}

// ============================================================
// computeFocusView — R-CROSS-01, R-CROSS-02
// Filter semantiek conform D-09: focusdoel → baten → cross-sector vermogens → gedeelde inspanningen
// ============================================================

export interface ConsolidationOrigin {
  originalId: string;
  originalTitle: string;
  originalSector: string;
}

export interface FocusView {
  focusGoal: ProgrammeGoal;
  focusBenefits: DINBenefit[];
  focusCaps: DINCapability[];
  focusEfforts: DINEffort[];
  outOfScopeCaps: DINCapability[];
  outOfScopeEfforts: DINEffort[];
  consolidationMap: Map<string, ConsolidationOrigin[]>;
}

export function getConsolidationOrigins(
  session: DINSession,
  itemId: string,
  type: "capability" | "effort"
): ConsolidationOrigin[] {
  const items = type === "capability" ? session.capabilities : session.efforts;
  return items
    .filter((item) => item.consolidatedInto === itemId)
    .map((item) => ({
      originalId: item.id,
      originalTitle: item.title || item.description || "",
      originalSector: item.sectorId || "",
    }));
}

export function computeFocusView(session: DINSession): FocusView | null {
  const focusGoal = getFocusGoal(session.goals);
  if (!focusGoal) return null;

  // Step 1: baten onder focusdoel via goalBenefitMaps
  const focusBenefitIds = new Set(
    (session.goalBenefitMaps ?? [])
      .filter((m) => m.goalId === focusGoal.id)
      .map((m) => m.benefitId)
  );
  const focusBenefits = session.benefits.filter((b) => focusBenefitIds.has(b.id));

  // Step 2: active capabilities (niet geconsolideerd)
  const activeCaps = session.capabilities.filter((c) => !c.consolidated);

  // Step 3: focusCaps = ALLE active caps gekoppeld aan focus benefits via benefitCapabilityMaps
  const activeCapIdSet = new Set(activeCaps.map((c) => c.id));
  const focusCapIds = new Set(
    (session.benefitCapabilityMaps ?? [])
      .filter(
        (m) => focusBenefitIds.has(m.benefitId) && activeCapIdSet.has(m.capabilityId)
      )
      .map((m) => m.capabilityId)
  );
  const focusCaps = activeCaps.filter((c) => focusCapIds.has(c.id));

  // Step 4: active efforts (niet geconsolideerd)
  const activeEfforts = session.efforts.filter((e) => !e.consolidated);

  // Step 5: focusEfforts = ALLE active efforts gekoppeld aan focus caps via capabilityEffortMaps
  const activeEffortIdSet = new Set(activeEfforts.map((e) => e.id));
  const focusEffortIds = new Set(
    (session.capabilityEffortMaps ?? [])
      .filter(
        (m) => focusCapIds.has(m.capabilityId) && activeEffortIdSet.has(m.effortId)
      )
      .map((m) => m.effortId)
  );
  const focusEfforts = activeEfforts.filter((e) => focusEffortIds.has(e.id));

  // Step 8: out-of-scope = active items niet in focus
  const outOfScopeCaps = activeCaps.filter((c) => !focusCapIds.has(c.id));
  const outOfScopeEfforts = activeEfforts.filter((e) => !focusEffortIds.has(e.id));

  // Step 9: consolidation origins — voor elk actief item, welke originelen erin zitten
  const consolidationMap = new Map<string, ConsolidationOrigin[]>();
  for (const cap of focusCaps) {
    const origins = getConsolidationOrigins(session, cap.id, "capability");
    if (origins.length > 0) consolidationMap.set(cap.id, origins);
  }
  for (const eff of focusEfforts) {
    const origins = getConsolidationOrigins(session, eff.id, "effort");
    if (origins.length > 0) consolidationMap.set(eff.id, origins);
  }

  return {
    focusGoal,
    focusBenefits,
    focusCaps,
    focusEfforts,
    outOfScopeCaps,
    outOfScopeEfforts,
    consolidationMap,
  };
}

// ============================================================
// restoreStap5Result — D-10 migratie (oude shape → undefined)
// Pure function, gebruikt door CrossAnalyseWizard.tsx useEffect bij session load
// ============================================================

export function restoreStap5Result(rawStap5: unknown): Stap5Result | undefined {
  if (rawStap5 === undefined || rawStap5 === null) return undefined;
  const parsed = Stap5ResultSchema.safeParse(rawStap5);
  if (!parsed.success) {
    console.warn(
      "[stap5-focus] stap5 result heeft oude shape, wordt gereset",
      parsed.error.issues
    );
    return undefined;
  }
  return parsed.data;
}
