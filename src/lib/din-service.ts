// DIN CRUD operaties — beheer van de DIN-keten
// Doelen → Baten → Vermogens → Inspanningen
// Invulling is PER SECTOR anders, doelen zijn gezamenlijk

import type {
  DINBenefit,
  DINCapability,
  DINEffort,
  DINSession,
  EffortDomain,
  AppStep,
} from "./types";
import { SECTORS } from "./types";
import { deduplicateById } from "./persistence";

// --- ID generatie ---

export function generateId(): string {
  return crypto.randomUUID();
}

// --- Baten ---

export function createBenefit(
  goalId: string,
  sectorId: string,
  description: string,
  title?: string
): DINBenefit {
  return {
    id: generateId(),
    goalId,
    sectorId,
    title: title || "",
    description,
    profiel: {
      bateneigenaar: "",
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

export function getBenefitsByGoalAndSector(
  benefits: DINBenefit[],
  goalId: string,
  sectorId: string
): DINBenefit[] {
  return benefits.filter(
    (b) => b.goalId === goalId && b.sectorId === sectorId
  );
}

export function getBenefitsBySector(
  benefits: DINBenefit[],
  sectorId: string
): DINBenefit[] {
  return benefits.filter((b) => b.sectorId === sectorId);
}

// --- Vermogens ---

export function createCapability(
  sectorId: string,
  description: string,
  title?: string
): DINCapability {
  return {
    id: generateId(),
    sectorId,
    title: title || "",
    description,
    relatedSectors: [sectorId],
    profiel: {
      eigenaar: "",
      huidieSituatie: "",
      gewensteSituatie: "",
    },
  };
}

export function addCapabilities(
  existing: DINCapability[],
  newCapabilities: DINCapability[]
): DINCapability[] {
  return deduplicateById([...existing, ...newCapabilities]);
}

export function getCapabilitiesBySector(
  capabilities: DINCapability[],
  sectorId: string
): DINCapability[] {
  return capabilities.filter((c) => c.sectorId === sectorId);
}

// --- Inspanningen ---

export function createEffort(
  sectorId: string,
  description: string,
  domain: EffortDomain,
  title?: string
): DINEffort {
  return {
    id: generateId(),
    sectorId,
    title: title || "",
    description,
    domain,
    status: "gepland",
    dependencies: [],
    votes: 0,
    dossier: {
      eigenaar: "",
      inspanningsleider: "",
      verwachtResultaat: "",
      kostenraming: "",
      randvoorwaarden: "",
    },
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

export function getEffortsBySector(
  efforts: DINEffort[],
  sectorId: string
): DINEffort[] {
  return efforts.filter((e) => e.sectorId === sectorId);
}

export function getEffortsBySectorAndDomain(
  efforts: DINEffort[],
  sectorId: string,
  domain: EffortDomain
): DINEffort[] {
  return efforts.filter(
    (e) => e.sectorId === sectorId && e.domain === domain
  );
}

// --- Cross-analyse helpers ---

export function findSharedCapabilities(
  capabilities: DINCapability[]
): Map<string, string[]> {
  // Groepeer vermogens op beschrijving (genormaliseerd) → welke sectoren
  const descToSectors = new Map<string, { id: string; sectors: Set<string> }>();

  for (const cap of capabilities) {
    const key = cap.description.toLowerCase().trim();
    if (!descToSectors.has(key)) {
      descToSectors.set(key, { id: cap.id, sectors: new Set() });
    }
    descToSectors.get(key)!.sectors.add(cap.sectorId);
  }

  // Filter op vermogens die bij meerdere sectoren horen (synergie)
  const shared = new Map<string, string[]>();
  for (const [, value] of descToSectors) {
    if (value.sectors.size > 1) {
      shared.set(value.id, Array.from(value.sectors));
    }
  }
  return shared;
}

export function getDomainBalance(
  efforts: DINEffort[]
): Record<EffortDomain, number> {
  return {
    mens: efforts.filter((e) => e.domain === "mens").length,
    processen: efforts.filter((e) => e.domain === "processen").length,
    data_systemen: efforts.filter((e) => e.domain === "data_systemen").length,
    cultuur: efforts.filter((e) => e.domain === "cultuur").length,
  };
}

export function findGaps(
  goals: { id: string }[],
  benefits: DINBenefit[],
  capabilities: DINCapability[],
  efforts: DINEffort[],
  goalBenefitMaps: { goalId: string; benefitId: string }[],
  benefitCapabilityMaps: { benefitId: string; capabilityId: string }[],
  capabilityEffortMaps: { capabilityId: string; effortId: string }[]
): { goalsWithoutBenefits: string[]; benefitsWithoutCapabilities: string[]; capabilitiesWithoutEfforts: string[] } {
  const goalIdsWithBenefits = new Set(goalBenefitMaps.map((m) => m.goalId));
  const benefitIdsWithCaps = new Set(benefitCapabilityMaps.map((m) => m.benefitId));
  const capIdsWithEfforts = new Set(capabilityEffortMaps.map((m) => m.capabilityId));

  return {
    goalsWithoutBenefits: goals
      .filter((g) => !goalIdsWithBenefits.has(g.id))
      .map((g) => g.id),
    benefitsWithoutCapabilities: benefits
      .filter((b) => !benefitIdsWithCaps.has(b.id))
      .map((b) => b.id),
    capabilitiesWithoutEfforts: capabilities
      .filter((c) => !capIdsWithEfforts.has(c.id))
      .map((c) => c.id),
  };
}

// --- Keten-building helpers ---

export interface DINChainLink {
  capability: DINCapability;
  efforts: DINEffort[];
}

export interface DINChain {
  benefit: DINBenefit;
  links: DINChainLink[];
}

export interface ChainResult {
  chains: DINChain[];
  unlinkedCaps: DINCapability[];
  unlinkedEfforts: DINEffort[];
}

/**
 * Bouw DIN-ketens voor een specifiek doel + sector.
 * Keten: Baat → Vermogen(s) → Inspanning(en)
 * Ongekoppelde vermogens/inspanningen worden apart teruggegeven.
 */
export function buildChainsForSector(
  session: DINSession,
  goalId: string,
  sectorId: string
): ChainResult {
  const sectorBenefits = session.benefits.filter(
    (b) => b.goalId === goalId && b.sectorId === sectorId
  );
  const sectorCaps = session.capabilities.filter((c) => c.sectorId === sectorId);
  const sectorEfforts = session.efforts.filter((e) => e.sectorId === sectorId);

  const usedCapIds = new Set<string>();
  const usedEffortIds = new Set<string>();

  // Bouw ketens vanuit baten
  const chains: DINChain[] = sectorBenefits.map((benefit) => {
    // Vind gekoppelde vermogens via benefitCapabilityMaps
    const linkedCapIds = session.benefitCapabilityMaps
      .filter((m) => m.benefitId === benefit.id)
      .map((m) => m.capabilityId);

    const links: DINChainLink[] = linkedCapIds
      .map((capId) => sectorCaps.find((c) => c.id === capId))
      .filter((c): c is DINCapability => c !== undefined)
      .map((capability) => {
        usedCapIds.add(capability.id);

        // Vind gekoppelde inspanningen via capabilityEffortMaps
        const linkedEffortIds = session.capabilityEffortMaps
          .filter((m) => m.capabilityId === capability.id)
          .map((m) => m.effortId);

        const efforts = linkedEffortIds
          .map((eid) => sectorEfforts.find((e) => e.id === eid))
          .filter((e): e is DINEffort => e !== undefined);

        efforts.forEach((e) => usedEffortIds.add(e.id));

        return { capability, efforts };
      });

    return { benefit, links };
  });

  // Vermogens in scope van dit doel die niet gekoppeld zijn via een baat
  // We beperken tot vermogens die via goalBenefitMaps bij dit doel horen
  const goalBenefitIds = new Set(
    session.goalBenefitMaps
      .filter((m) => m.goalId === goalId)
      .map((m) => m.benefitId)
  );
  const allCapIdsForGoal = new Set(
    session.benefitCapabilityMaps
      .filter((m) => goalBenefitIds.has(m.benefitId))
      .map((m) => m.capabilityId)
  );

  const unlinkedCaps = sectorCaps.filter(
    (c) => !usedCapIds.has(c.id) && allCapIdsForGoal.has(c.id)
  );

  // Inspanningen die via capabilityEffortMaps gekoppeld zijn aan dit doel maar niet in een keten zitten
  const allEffortIdsForGoal = new Set(
    session.capabilityEffortMaps
      .filter((m) => allCapIdsForGoal.has(m.capabilityId))
      .map((m) => m.effortId)
  );

  const unlinkedEfforts = sectorEfforts.filter(
    (e) => !usedEffortIds.has(e.id) && allEffortIdsForGoal.has(e.id)
  );

  return { chains, unlinkedCaps, unlinkedEfforts };
}

// --- Merged DIN helpers ---

export function getEffortsByDomainAllSectors(
  efforts: DINEffort[]
): Record<EffortDomain, DINEffort[]> {
  return {
    mens: efforts.filter((e) => e.domain === "mens"),
    processen: efforts.filter((e) => e.domain === "processen"),
    data_systemen: efforts.filter((e) => e.domain === "data_systemen"),
    cultuur: efforts.filter((e) => e.domain === "cultuur"),
  };
}

// --- Voortgangsindicatoren ---

export interface StepCompletion {
  step: AppStep;
  percentage: number;
  details: string;
}

export function getStepCompletions(session: DINSession): StepCompletion[] {
  return [
    {
      step: "import",
      percentage: computeImportCompletion(session),
      details: [
        session.vision ? "Visie" : "",
        session.goals.length > 0 ? `${session.goals.length} doelen` : "",
      ].filter(Boolean).join(", ") || "Nog niets ingevuld",
    },
    {
      step: "sectorwerk",
      percentage: computeSectorwerkCompletion(session),
      details: `${session.sectorPlans.length} plannen, ${session.benefits.length} baten, ${session.efforts.length} inspanningen`,
    },
    {
      step: "cross-analyse",
      percentage: session.benefits.length > 0 && session.capabilities.length > 0 ? 100 : 0,
      details: session.benefits.length > 0 ? "Data beschikbaar" : "Vul eerst DIN in",
    },
    {
      step: "din-mapping",
      percentage: session.benefits.length > 0 || session.capabilities.length > 0
        ? Math.round(((session.benefits.length + session.capabilities.length + session.efforts.length) / Math.max(1, session.goals.length * 3)) * 100)
        : 0,
      details: session.benefits.length > 0
        ? `${session.benefits.length} baten, ${session.capabilities.length} vermogens, ${session.efforts.length} inspanningen`
        : "Vul het DIN-netwerk in per sector",
    },
    {
      step: "prioritering",
      percentage: session.efforts.filter((e) => e.quarter).length > 0
        ? Math.round((session.efforts.filter((e) => e.quarter).length / Math.max(session.efforts.length, 1)) * 100)
        : 0,
      details: `${session.efforts.filter((e) => e.quarter).length}/${session.efforts.length} ingepland`,
    },
    {
      step: "export",
      percentage: 0,
      details: "Export wanneer gereed",
    },
  ];
}

function computeImportCompletion(session: DINSession): number {
  let score = 0;
  if (session.vision) score += 50;
  if (session.goals.length > 0) score += 50;
  return score;
}

function computeSectorwerkCompletion(session: DINSession): number {
  let sectorsDone = 0;
  for (const sector of SECTORS) {
    const hasPlan = session.sectorPlans.some((s) => s.sectorName === sector);
    const hasDIN = session.benefits.some((b) => b.sectorId === sector);
    if (hasPlan && hasDIN) sectorsDone++;
  }
  return Math.round((sectorsDone / SECTORS.length) * 100);
}
