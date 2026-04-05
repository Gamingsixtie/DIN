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

export interface FocusView {
  focusGoal: ProgrammeGoal;
  focusBenefits: DINBenefit[];
  focusCaps: DINCapability[];
  focusEfforts: DINEffort[];
  outOfScopeCaps: DINCapability[];
  outOfScopeEfforts: DINEffort[];
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

  // Step 3: cross-sector capabilities (relatedSectors.length > 1)
  const sharedCaps = activeCaps.filter(
    (c) => (c.relatedSectors?.length ?? 0) > 1
  );

  // Step 4: focusCaps = shared caps gekoppeld aan focus benefits via benefitCapabilityMaps
  const sharedCapIdSet = new Set(sharedCaps.map((c) => c.id));
  const focusCapIds = new Set(
    (session.benefitCapabilityMaps ?? [])
      .filter(
        (m) => focusBenefitIds.has(m.benefitId) && sharedCapIdSet.has(m.capabilityId)
      )
      .map((m) => m.capabilityId)
  );
  const focusCaps = sharedCaps.filter((c) => focusCapIds.has(c.id));

  // Step 5: active efforts (niet geconsolideerd)
  const activeEfforts = session.efforts.filter((e) => !e.consolidated);

  // Step 6: shared efforts (multi-sector responsibleSector via comma)
  const sharedEfforts = activeEfforts.filter(
    (e) => e.responsibleSector?.includes(",") ?? false
  );

  // Step 7: focusEfforts = shared efforts gekoppeld aan focus caps via capabilityEffortMaps
  const sharedEffortIdSet = new Set(sharedEfforts.map((e) => e.id));
  const focusEffortIds = new Set(
    (session.capabilityEffortMaps ?? [])
      .filter(
        (m) => focusCapIds.has(m.capabilityId) && sharedEffortIdSet.has(m.effortId)
      )
      .map((m) => m.effortId)
  );
  const focusEfforts = sharedEfforts.filter((e) => focusEffortIds.has(e.id));

  // Step 8: out-of-scope = active items niet in focus
  const outOfScopeCaps = activeCaps.filter((c) => !focusCapIds.has(c.id));
  const outOfScopeEfforts = activeEfforts.filter((e) => !focusEffortIds.has(e.id));

  return {
    focusGoal,
    focusBenefits,
    focusCaps,
    focusEfforts,
    outOfScopeCaps,
    outOfScopeEfforts,
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
