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

// --- Cross-sector hefboomanalyse ---

/** NL stopwoorden die geen thematische waarde hebben */
const NL_STOPWORDS = new Set([
  "de", "het", "een", "van", "voor", "met", "door", "aan", "bij",
  "als", "dat", "die", "dit", "naar", "ook", "nog", "wel", "niet",
  "wordt", "worden", "zijn", "hebben", "meer", "alle", "over",
  "kan", "moet", "zal", "hun", "haar", "zijn", "onze", "ons",
]);

/**
 * Tokenize tekst voor similarity matching.
 * - Behoudt afkortingen (NPS, KPI, ICT) door drempel op >2 chars
 * - Splitst samengestelde woorden (≥8 chars) op mogelijke deelwoorden
 * - Filtert NL-stopwoorden
 */
function tokenize(text: string): Set<string> {
  if (!text || !text.trim()) return new Set();

  const tokens = new Set<string>();
  const words = text
    .toLowerCase()
    .replace(/[^a-zA-ZÀ-ÿ0-9\s-]/g, "")
    .split(/[\s-]+/)
    .filter(Boolean);

  for (const word of words) {
    if (NL_STOPWORDS.has(word)) continue;
    if (word.length <= 2) continue;

    tokens.add(word);

    // Compound word splitting: "klantervaring" → ook "klant" + "ervaring"
    if (word.length >= 8) {
      for (let i = 4; i <= word.length - 4; i++) {
        tokens.add(word.slice(0, i));
        tokens.add(word.slice(i));
      }
    }
  }

  return tokens;
}

/**
 * Gecombineerde similarity: Jaccard + substring-bonus.
 * Vangt partial matches op die pure Jaccard mist.
 */
function tokenSimilarity(a: Set<string>, b: Set<string>): number {
  if (a.size === 0 || b.size === 0) return 0;

  const intersection = new Set([...a].filter((x) => b.has(x)));
  const union = new Set([...a, ...b]);
  const jaccard = union.size > 0 ? intersection.size / union.size : 0;

  // Substring bonus: "klant" matcht met "klanttevredenheid"
  let substringMatches = 0;
  for (const tA of a) {
    for (const tB of b) {
      if (tA !== tB && tA.length >= 4 && tB.length >= 4) {
        if (tA.includes(tB) || tB.includes(tA)) {
          substringMatches++;
        }
      }
    }
  }
  const substringBonus = Math.min(substringMatches * 0.08, 0.25);

  return Math.min(jaccard + substringBonus, 1.0);
}

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

      if (tokenSimilarity(tokens, otherTokens) >= 0.20) {
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

      if (tokenSimilarity(tokens, otherTokens) >= 0.20) {
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
