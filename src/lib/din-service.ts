// DIN CRUD operaties — beheer van de DIN-keten
// Doelen → Baten → Vermogens → Inspanningen

import type {
  DINBenefit,
  DINCapability,
  DINEffort,
  EffortDomain,
} from "./types";
import { deduplicateById } from "./persistence";

// --- ID generatie ---

export function generateId(): string {
  return crypto.randomUUID();
}

// --- Baten ---

export function createBenefit(
  goalId: string,
  description: string
): DINBenefit {
  return {
    id: generateId(),
    goalId,
    description,
    profiel: {
      indicator: "",
      indicatorOwner: "",
      currentValue: "",
      targetValue: "",
    },
  };
}

export function addBenefits(
  existing: DINBenefit[],
  newBenefits: DINBenefit[]
): DINBenefit[] {
  return deduplicateById([...existing, ...newBenefits]);
}

export function getBenefitsByGoal(
  benefits: DINBenefit[],
  goalId: string
): DINBenefit[] {
  return benefits.filter((b) => b.goalId === goalId);
}

// --- Vermogens ---

export function createCapability(description: string): DINCapability {
  return {
    id: generateId(),
    description,
    relatedSectors: [],
  };
}

export function addCapabilities(
  existing: DINCapability[],
  newCapabilities: DINCapability[]
): DINCapability[] {
  return deduplicateById([...existing, ...newCapabilities]);
}

// --- Inspanningen ---

export function createEffort(
  description: string,
  domain: EffortDomain
): DINEffort {
  return {
    id: generateId(),
    description,
    domain,
    status: "gepland",
    dependencies: [],
  };
}

export function addEfforts(
  existing: DINEffort[],
  newEfforts: DINEffort[]
): DINEffort[] {
  return deduplicateById([...existing, ...newEfforts]);
}

export function getEffortsByDomain(
  efforts: DINEffort[],
  domain: EffortDomain
): DINEffort[] {
  return efforts.filter((e) => e.domain === domain);
}

// --- Cross-analyse helpers ---

export function findSharedCapabilities(
  benefitCapabilityMap: { benefitId: string; capabilityId: string }[],
  goalBenefitMap: { goalId: string; benefitId: string }[]
): Map<string, string[]> {
  // capability → welke doelen het raakt
  const capToGoals = new Map<string, Set<string>>();

  for (const bc of benefitCapabilityMap) {
    const goalIds = goalBenefitMap
      .filter((gb) => gb.benefitId === bc.benefitId)
      .map((gb) => gb.goalId);

    if (!capToGoals.has(bc.capabilityId)) {
      capToGoals.set(bc.capabilityId, new Set());
    }
    for (const gid of goalIds) {
      capToGoals.get(bc.capabilityId)!.add(gid);
    }
  }

  // Filter op vermogens die bij meerdere doelen horen (synergie)
  const shared = new Map<string, string[]>();
  for (const [capId, goalSet] of capToGoals) {
    if (goalSet.size > 1) {
      shared.set(capId, Array.from(goalSet));
    }
  }
  return shared;
}
