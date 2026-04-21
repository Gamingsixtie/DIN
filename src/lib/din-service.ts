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
  ExternalProject,
  ProjectCapabilityMap,
  CapabilityEffortMap,
} from "./types";
import type {
  ProjectPromotieResult,
  AIPromotedEffort,
  FindingSuggestion,
} from "./schemas";
import { SECTORS } from "./types";
import { deduplicateById } from "./persistence";
import { tokenize, tokenSimilarity, SIMILARITY_THRESHOLD } from "./nl-tokenizer";

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

// --- Cross-sector hefboomanalyse ---


/**
 * Een cluster van thematisch verwante baten over meerdere sectoren.
 */
export interface BenefitCluster {
  benefits: DINBenefit[];
  sectors: string[];
  hefboomScore: number;
  theme: string;
  matchReason?: string; // Uitleg waarom geclusterd (gedeelde begrippen)
}

/**
 * Chain-info per sector binnen een hefboom-cluster.
 */
export interface ClusterSectorChain {
  sector: string;
  benefit: DINBenefit;
  capabilities: DINCapability[];
  efforts: DINEffort[];
}

/**
 * Volledig hefboom-resultaat per doel.
 */
export interface HefboomResult {
  goalId: string;
  clusters: BenefitCluster[];
  clusterChains: Map<string, ClusterSectorChain[]>;
}

/**
 * Cluster van vergelijkbare inspanningen over meerdere sectoren.
 * DIT is de echte hefboom: inspanningen die gebundeld kunnen worden.
 */
export interface EffortCluster {
  efforts: DINEffort[];
  sectors: string[];
  domain: EffortDomain;
  hefboomScore: number;
  theme: string;
  matchReason: string;
  consolidatieAdvies: string;
}

/**
 * Groepeer baten per doel op thematische overeenkomst over sectoren.
 * Clusters met meerdere sectoren = hoge hefboomwerking.
 */
export function findBenefitClusters(
  benefits: DINBenefit[],
  goalId: string
): BenefitCluster[] {
  const goalBenefits = benefits.filter((b) => b.goalId === goalId);
  const clusters: BenefitCluster[] = [];
  const used = new Set<string>();

  for (const benefit of goalBenefits) {
    if (used.has(benefit.id)) continue;

    const cluster: DINBenefit[] = [benefit];
    used.add(benefit.id);

    const tokens = tokenize((benefit.title || "") + " " + benefit.description);
    if (tokens.size === 0) continue; // Skip lege baten als seed

    // Max 1 baat per sector per cluster (deduplicatie)
    const sectorsInCluster = new Set([benefit.sectorId]);

    for (const other of goalBenefits) {
      if (used.has(other.id)) continue;
      if (sectorsInCluster.has(other.sectorId)) continue;

      const otherTokens = tokenize(
        (other.title || "") + " " + other.description
      );
      if (otherTokens.size === 0) continue;

      if (tokenSimilarity(tokens, otherTokens) >= SIMILARITY_THRESHOLD) {
        cluster.push(other);
        used.add(other.id);
        sectorsInCluster.add(other.sectorId);
      }
    }

    const sectors = [...sectorsInCluster];

    // Bereken matchReason: welke woorden delen ze?
    let matchReason: string | undefined;
    if (sectors.length > 1) {
      const allTokenSets = cluster.map((b) =>
        tokenize((b.title || "") + " " + b.description)
      );
      const commonTokens = [...allTokenSets[0]].filter((t) =>
        allTokenSets.every((s) => s.has(t))
      );
      if (commonTokens.length > 0) {
        matchReason = `Gedeelde begrippen: ${commonTokens.slice(0, 5).join(", ")}`;
      } else {
        matchReason = "Thematische overlap gedetecteerd";
      }
    }

    clusters.push({
      benefits: cluster,
      sectors,
      hefboomScore: sectors.length,
      theme: benefit.title || benefit.description.slice(0, 60),
      matchReason,
    });
  }

  return clusters.sort((a, b) => b.hefboomScore - a.hefboomScore);
}

/**
 * Vind vergelijkbare inspanningen over sectoren heen.
 * Dit beantwoordt de kernvraag: welke inspanningen kunnen gebundeld worden?
 */
export function findEffortClusters(efforts: DINEffort[]): EffortCluster[] {
  const clusters: EffortCluster[] = [];
  const used = new Set<string>();
  const sorted = [...efforts].sort((a, b) => a.domain.localeCompare(b.domain));

  for (const effort of sorted) {
    if (used.has(effort.id)) continue;

    const cluster: DINEffort[] = [effort];
    used.add(effort.id);

    const tokens = tokenize((effort.title || "") + " " + effort.description);
    if (tokens.size === 0) continue;

    const sectorsInCluster = new Set([effort.sectorId]);

    for (const other of sorted) {
      if (used.has(other.id)) continue;
      if (sectorsInCluster.has(other.sectorId)) continue;

      const otherTokens = tokenize(
        (other.title || "") + " " + other.description
      );
      if (otherTokens.size === 0) continue;

      if (tokenSimilarity(tokens, otherTokens) >= SIMILARITY_THRESHOLD) {
        cluster.push(other);
        used.add(other.id);
        sectorsInCluster.add(other.sectorId);
      }
    }

    if (sectorsInCluster.size > 1) {
      const sectors = [...sectorsInCluster];
      const allTokenSets = cluster.map((e) =>
        tokenize((e.title || "") + " " + e.description)
      );
      const commonTokens = [...allTokenSets[0]].filter((t) =>
        allTokenSets.every((s) => s.has(t))
      );

      clusters.push({
        efforts: cluster,
        sectors,
        domain: effort.domain,
        hefboomScore: sectors.length,
        theme: effort.title || effort.description.slice(0, 60),
        matchReason: commonTokens.length > 0
          ? `Gedeelde begrippen: ${commonTokens.slice(0, 5).join(", ")}`
          : "Thematische overlap in inspanningen",
        consolidatieAdvies: sectors.length === 3
          ? "Alle sectoren hebben een vergelijkbare inspanning. Overweeg centraal op te pakken."
          : `${sectors.join(" en ")} hebben vergelijkbare inspanningen. Bundelen kan kosten besparen.`,
      });
    }
  }

  return clusters.sort((a, b) => b.hefboomScore - a.hefboomScore);
}

/**
 * Bouw de volledige DIN-keten per sector voor een cluster van baten.
 */
export function buildClusterChains(
  session: DINSession,
  cluster: BenefitCluster
): ClusterSectorChain[] {
  return cluster.benefits.map((benefit) => {
    const capIds = session.benefitCapabilityMaps
      .filter((m) => m.benefitId === benefit.id)
      .map((m) => m.capabilityId);
    const capabilities = capIds
      .map((cid) => session.capabilities.find((c) => c.id === cid))
      .filter((c): c is DINCapability => c !== undefined);

    const effortIds = new Set(
      capabilities.flatMap((cap) =>
        session.capabilityEffortMaps
          .filter((m) => m.capabilityId === cap.id)
          .map((m) => m.effortId)
      )
    );
    const efforts = [...effortIds]
      .map((eid) => session.efforts.find((e) => e.id === eid))
      .filter((e): e is DINEffort => e !== undefined);

    return { sector: benefit.sectorId, benefit, capabilities, efforts };
  });
}

/**
 * Bereken hefboomanalyse voor alle doelen.
 */
export function analyzeHefbomen(session: DINSession): HefboomResult[] {
  return session.goals.map((goal) => {
    const clusters = findBenefitClusters(session.benefits, goal.id);
    const clusterChains = new Map<string, ClusterSectorChain[]>();

    for (const cluster of clusters) {
      const chains = buildClusterChains(session, cluster);
      clusterChains.set(cluster.benefits[0].id, chains);
    }

    return { goalId: goal.id, clusters, clusterChains };
  });
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
      step: "din-mapping",
      percentage: session.benefits.length > 0 || session.capabilities.length > 0
        ? Math.round(((session.benefits.length + session.capabilities.length + session.efforts.length) / Math.max(1, session.goals.length * 3)) * 100)
        : 0,
      details: session.benefits.length > 0
        ? `${session.benefits.length} baten, ${session.capabilities.length} vermogens, ${session.efforts.length} inspanningen`
        : "Vul het DIN-netwerk in per sector",
    },
    {
      step: "cross-analyse",
      percentage: session.benefits.length > 0 && session.capabilities.length > 0 ? 100 : 0,
      details: session.benefits.length > 0 ? "Data beschikbaar" : "Vul eerst DIN in",
    },
    {
      step: "governance",
      percentage: computeGovernanceCompletion(session),
      details: governanceDetails(session),
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

function computeGovernanceCompletion(session: DINSession): number {
  const po = session.programmaorganisatie;
  if (!po) return 0;

  let organisatieScore = 0;
  if (po.opdrachtgever?.rol) organisatieScore += 20;
  if (po.programmamanager?.rol) organisatieScore += 20;
  if ((po.kerngroep ?? []).length >= 2) organisatieScore += 20;
  if ((po.stuurgroep ?? []).length >= 2) organisatieScore += 10;
  if ((po.domeineigenaren ?? []).length >= 2) organisatieScore += 10;
  if (po.besluitvormingsritme && po.escalatiepad) organisatieScore += 20;

  // RASCI: gedeelte van clusters met 1 A + minstens 1 R
  const wizard = session.crossAnalyseWizard;
  const vermogen = wizard?.stepResults?.stap2?.vermogenClusters ?? [];
  const inspanning = wizard?.stepResults?.stap3?.inspanningClusters ?? [];
  const totalClusters = vermogen.length + inspanning.length;

  if (totalClusters === 0) {
    return Math.round(organisatieScore * 0.6);
  }

  const rasci = session.clusterRasci ?? [];
  const validCount = rasci.filter((r) => {
    const nA = r.rijen.filter((x) => x.letter === "A").length;
    const nR = r.rijen.filter((x) => x.letter === "R").length;
    return nA === 1 && nR >= 1;
  }).length;

  const rasciScore = Math.round((validCount / totalClusters) * 100);
  return Math.round(organisatieScore * 0.5 + rasciScore * 0.5);
}

function governanceDetails(session: DINSession): string {
  const po = session.programmaorganisatie;
  if (!po) return "Nog niet ingevuld";
  const rasci = session.clusterRasci ?? [];
  const validCount = rasci.filter((r) => {
    const nA = r.rijen.filter((x) => x.letter === "A").length;
    const nR = r.rijen.filter((x) => x.letter === "R").length;
    return nA === 1 && nR >= 1;
  }).length;
  const rolCount =
    (po.opdrachtgever ? 1 : 0) +
    (po.programmamanager ? 1 : 0) +
    (po.kerngroep?.length ?? 0) +
    (po.stuurgroep?.length ?? 0) +
    (po.domeineigenaren?.length ?? 0) +
    (po.klankbordgroep?.length ?? 0);
  return `${rolCount} rollen, ${validCount}/${rasci.length} clusters met geldige RASCI`;
}

// --- Doel-voor-Doel Voortgang (Phase 6) ---

export interface SectorChainStatus {
  hasBenefits: boolean;
  hasCapabilities: boolean;
  hasEfforts: boolean;
  isComplete: boolean;
  missing: string[]; // e.g., ["mist baten", "mist vermogens"]
}

export type GoalStatus = "afgerond" | "bezig" | "niet-begonnen";

export interface GoalCompletionStatus {
  goalId: string;
  status: GoalStatus;
  sectorStatuses: Record<string, SectorChainStatus>;
  isComplete: boolean;
  isManuallyCompleted: boolean;
}

/**
 * Controleer of een doel een volledige DIN-keten heeft in een specifieke sector.
 * Volgt de mapping-keten: goalBenefitMaps -> benefitCapabilityMaps -> capabilityEffortMaps
 * Telt ALLEEN items die via mappings gekoppeld zijn (niet losse items).
 */
export function checkSectorChain(
  session: DINSession,
  goalId: string,
  sectorId: string
): SectorChainStatus {
  // 1. Vind baten voor dit doel+sector via goalBenefitMaps
  const goalBenefitIds = new Set(
    session.goalBenefitMaps
      .filter((m) => m.goalId === goalId)
      .map((m) => m.benefitId)
  );
  const linkedBenefits = session.benefits.filter(
    (b) => goalBenefitIds.has(b.id) && b.sectorId === sectorId
  );
  const hasBenefits = linkedBenefits.length > 0;

  // 2. Vind vermogens gekoppeld aan die baten via benefitCapabilityMaps
  const linkedBenefitIds = new Set(linkedBenefits.map((b) => b.id));
  const linkedCapabilityIds = new Set(
    session.benefitCapabilityMaps
      .filter((m) => linkedBenefitIds.has(m.benefitId))
      .map((m) => m.capabilityId)
  );
  const linkedCapabilities = session.capabilities.filter(
    (c) => linkedCapabilityIds.has(c.id) && c.sectorId === sectorId
  );
  const hasCapabilities = linkedCapabilities.length > 0;

  // 3. Vind inspanningen gekoppeld aan die vermogens via capabilityEffortMaps
  const linkedCapIds = new Set(linkedCapabilities.map((c) => c.id));
  const linkedEffortIds = new Set(
    session.capabilityEffortMaps
      .filter((m) => linkedCapIds.has(m.capabilityId))
      .map((m) => m.effortId)
  );
  const linkedEfforts = session.efforts.filter(
    (e) => linkedEffortIds.has(e.id) && e.sectorId === sectorId
  );
  const hasEfforts = linkedEfforts.length > 0;

  // 4. Bouw missing array
  const missing: string[] = [];
  if (!hasBenefits) missing.push("mist baten");
  if (!hasCapabilities) missing.push("mist vermogens");
  if (!hasEfforts) missing.push("mist inspanningen");

  return {
    hasBenefits,
    hasCapabilities,
    hasEfforts,
    isComplete: hasBenefits && hasCapabilities && hasEfforts,
    missing,
  };
}

/**
 * Bepaal de voortgangsstatus van een doel over alle sectoren.
 * - "afgerond": doel staat in completedGoals (handmatig gemarkeerd)
 * - "bezig": er zijn DIN-items in minstens één sector
 * - "niet-begonnen": geen DIN-items in welke sector dan ook
 */
export function getGoalCompletionStatus(
  session: DINSession,
  goalId: string
): GoalCompletionStatus {
  const isManuallyCompleted = (session.completedGoals ?? []).includes(goalId);

  // Check elke sector
  const sectorStatuses: Record<string, SectorChainStatus> = {};
  let anyHasItems = false;
  let allComplete = true;

  for (const sector of SECTORS) {
    const sectorStatus = checkSectorChain(session, goalId, sector);
    sectorStatuses[sector] = sectorStatus;

    if (sectorStatus.hasBenefits || sectorStatus.hasCapabilities || sectorStatus.hasEfforts) {
      anyHasItems = true;
    }
    if (!sectorStatus.isComplete) {
      allComplete = false;
    }
  }

  // Bepaal status
  let status: GoalStatus;
  if (isManuallyCompleted) {
    status = "afgerond";
  } else if (anyHasItems) {
    status = "bezig";
  } else {
    status = "niet-begonnen";
  }

  return {
    goalId,
    status,
    sectorStatuses,
    isComplete: allComplete,
    isManuallyCompleted,
  };
}

// --- External Project helpers (Phase 12) ---

/**
 * Filter projecten op sector, exclusief buiten-scope items.
 */
export function getProjectsBySector(
  projects: ExternalProject[],
  sectorId: string
): ExternalProject[] {
  return projects.filter((p) => p.sectorId === sectorId && !p.buitenScope);
}

/**
 * Vind vermogens die gekoppeld zijn aan een specifiek project via ProjectCapabilityMaps.
 */
export function getLinkedCapabilities(
  projectId: string,
  maps: ProjectCapabilityMap[],
  capabilities: DINCapability[]
): DINCapability[] {
  const capIds = maps
    .filter((m) => m.projectId === projectId)
    .map((m) => m.capabilityId);
  return capabilities.filter((c) => capIds.includes(c.id));
}

// --- Project Promotie helpers (Phase 14) ---

/**
 * User selecties uit het promotie-review scherm.
 * - acceptedBenefitIds: welke AI-voorgestelde baten de user wil koppelen
 * - acceptedCapabilityIds: welke AI-voorgestelde vermogens de user wil koppelen
 * - keptEfforts: welke split efforts de user heeft bevestigd (1..4 per D-05/D-06)
 * - acceptedFindings: welke bevindingen direct omgezet moeten worden naar DIN-entiteiten
 */
export interface PromotionSelections {
  acceptedBenefitIds: string[];
  acceptedCapabilityIds: string[];
  keptEfforts: AIPromotedEffort[];
  acceptedFindings: FindingSuggestion[];
}

/**
 * Pure function: gegeven een sessie + promotie-resultaat + user-selecties,
 * retourneert de Partial<DINSession> die toegepast moet worden.
 *
 * Deze functie is PURE — het moet binnen `updateSession(prev => ...)` worden
 * aangeroepen zodat React's functional updater atomiciteit garandeert.
 *
 * Mutaties (Phase 14 D-08, D-09, D-10):
 * 1. Origineel project markeren als gepromoveerd (promotedAt, promotedToEffortIds)
 * 2. Nieuwe DINEffort entries (1..4) aanmaken met originProjectId
 * 3. Oude projectCapabilityMaps rows voor dit project verwijderen
 * 4. Nieuwe capabilityEffortMap rows (cartesisch: elke cap x elke effort)
 * 5. Voor geaccepteerde findings: nieuwe DINBenefit/DINCapability/DINEffort entries
 *    (findings van type 'inspanning' krijgen originProjectId voor traceback)
 */
export function promoteProjectToEfforts(
  session: DINSession,
  projectId: string,
  _result: ProjectPromotieResult,
  selections: PromotionSelections
): Partial<DINSession> {
  const project = (session.externalProjects || []).find(
    (p) => p.id === projectId
  );
  if (!project) return {};

  // 1. Nieuwe DINEffort entries aanmaken
  const newEffortIds: string[] = [];
  const newEfforts: DINEffort[] = selections.keptEfforts.map((ae) => {
    const id = generateId();
    newEffortIds.push(id);
    return {
      id,
      sectorId: project.sectorId,
      title: ae.title,
      description: ae.description,
      domain: ae.domain,
      quarter: ae.quarter,
      responsibleSector: ae.responsibleSector || project.sectorId,
      status: ae.status || "in_uitvoering",
      dependencies: [],
      votes: 0,
      dossier: ae.dossier
        ? {
            eigenaar: ae.dossier.eigenaar || "",
            inspanningsleider: ae.dossier.inspanningsleider || "",
            verwachtResultaat: ae.dossier.verwachtResultaat || "",
            kostenraming: ae.dossier.kostenraming || "",
            randvoorwaarden: ae.dossier.randvoorwaarden || "",
          }
        : undefined,
      originProjectId: projectId, // D-09
    };
  });

  // 2. capabilityEffortMap rows (cartesisch product: elke accepted cap x elke new effort)
  const newCapEffMaps: CapabilityEffortMap[] = [];
  for (const capabilityId of selections.acceptedCapabilityIds) {
    for (const effortId of newEffortIds) {
      newCapEffMaps.push({ capabilityId, effortId });
    }
  }

  // 3. Oude projectCapabilityMaps voor dit project verwijderen (D-10)
  const filteredProjectCapMaps = (session.projectCapabilityMaps || []).filter(
    (m) => m.projectId !== projectId
  );

  // 4. Origineel project markeren als gepromoveerd (D-08)
  const updatedProjects = (session.externalProjects || []).map((p) =>
    p.id === projectId
      ? {
          ...p,
          promotedAt: new Date().toISOString(),
          promotedToEffortIds: newEffortIds,
        }
      : p
  );

  // 5. Geaccepteerde findings -> nieuwe entities
  const findingBenefits: DINBenefit[] = [];
  const findingCapabilities: DINCapability[] = [];
  const findingEfforts: DINEffort[] = [];
  for (const finding of selections.acceptedFindings) {
    if (finding.type === "baat") {
      findingBenefits.push({
        id: generateId(),
        // Findings van type 'baat' hebben nog geen goal context — UI Wave 3 beslist
        // of er een goal-picker stap komt. Voor nu: lege placeholder goalId.
        goalId: "",
        sectorId: finding.targetSector,
        title: finding.beschrijving.slice(0, 60),
        description: finding.beschrijving,
        profiel: {
          bateneigenaar: "",
          indicator: "",
          indicatorOwner: "",
          currentValue: "",
          targetValue: "",
        },
      });
    } else if (finding.type === "vermogen") {
      findingCapabilities.push({
        id: generateId(),
        sectorId: finding.targetSector,
        title: finding.beschrijving.slice(0, 60),
        description: finding.toelichting || finding.beschrijving,
        relatedSectors: [finding.targetSector],
        profiel: {
          eigenaar: "",
          huidieSituatie: "",
          gewensteSituatie: "",
        },
      });
    } else if (finding.type === "inspanning") {
      findingEfforts.push({
        id: generateId(),
        sectorId: finding.targetSector,
        title: finding.beschrijving.slice(0, 60),
        description: finding.beschrijving,
        domain: finding.domain || "processen",
        status: "gepland",
        dependencies: [],
        originProjectId: projectId, // Findings die efforts maken, traceerbaar naar bronproject
      });
    }
  }

  return {
    externalProjects: updatedProjects,
    efforts: [...(session.efforts || []), ...newEfforts, ...findingEfforts],
    benefits: [...(session.benefits || []), ...findingBenefits],
    capabilities: [...(session.capabilities || []), ...findingCapabilities],
    capabilityEffortMaps: [
      ...(session.capabilityEffortMaps || []),
      ...newCapEffMaps,
    ],
    projectCapabilityMaps: filteredProjectCapMaps,
  };
}

/**
 * Pure function: inverse van promoteProjectToEfforts.
 * - Verwijdert efforts met originProjectId === projectId (of die in promotedToEffortIds staan)
 * - Ruimt bijbehorende capabilityEffortMaps op
 * - Herstelt projectCapabilityMaps (met dedupe per projectId:capabilityId)
 * - Wist promotedAt + promotedToEffortIds op het project
 *
 * Let op: findings-created benefits/capabilities worden NIET teruggedraaid —
 * die zijn gepromoveerd tot first-class DIN-entiteiten. Dit is gedocumenteerd
 * gedrag; de undo-dialog moet dit expliciet aan de user tonen.
 */
export function undoProjectPromotion(
  session: DINSession,
  projectId: string
): Partial<DINSession> {
  const project = (session.externalProjects || []).find(
    (p) => p.id === projectId
  );
  if (!project || !project.promotedAt) return {};

  const promotedEffortIds = new Set(project.promotedToEffortIds || []);
  // Belt-and-braces: pak ook efforts die via originProjectId terug verwijzen
  const effortsToRemove = new Set(
    (session.efforts || [])
      .filter(
        (e) => e.originProjectId === projectId || promotedEffortIds.has(e.id)
      )
      .map((e) => e.id)
  );

  // Herstel projectCapabilityMaps uit capabilityEffortMaps waarvan effortId in effortsToRemove zit
  const restoredProjectCapMaps: ProjectCapabilityMap[] = [];
  const seen = new Set<string>();
  for (const cem of session.capabilityEffortMaps || []) {
    if (effortsToRemove.has(cem.effortId)) {
      const key = `${projectId}:${cem.capabilityId}`;
      if (!seen.has(key)) {
        restoredProjectCapMaps.push({
          projectId,
          capabilityId: cem.capabilityId,
        });
        seen.add(key);
      }
    }
  }

  return {
    externalProjects: (session.externalProjects || []).map((p) =>
      p.id === projectId
        ? { ...p, promotedAt: undefined, promotedToEffortIds: undefined }
        : p
    ),
    efforts: (session.efforts || []).filter((e) => !effortsToRemove.has(e.id)),
    capabilityEffortMaps: (session.capabilityEffortMaps || []).filter(
      (cem) => !effortsToRemove.has(cem.effortId)
    ),
    projectCapabilityMaps: [
      ...(session.projectCapabilityMaps || []),
      ...restoredProjectCapMaps,
    ],
    // findings-created entities (benefits, capabilities) worden NIET teruggedraaid.
  };
}
