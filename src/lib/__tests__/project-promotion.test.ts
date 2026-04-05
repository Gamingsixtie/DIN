// Phase 14 - Unit tests for promoteProjectToEfforts + undoProjectPromotion
// Pure mutation helpers that convert lopende projecten to DIN-efforts. (D-08, D-09, D-10, D-11)
import { describe, it, expect, vi, beforeEach } from "vitest";
import type { DINSession } from "@/lib/types";
import type {
  ProjectPromotieResult,
  AIPromotedEffort,
  FindingSuggestion,
} from "@/lib/schemas";

// Mock crypto.randomUUID with per-call counter so we can assert on ID patterns.
// Using a mutable counter (instead of a single static ID) so each generated
// entity gets a unique predictable ID and we can assert counts.
let uuidCounter = 0;
vi.stubGlobal("crypto", {
  randomUUID: vi.fn(() => {
    uuidCounter += 1;
    return `mock-uuid-${uuidCounter}`;
  }),
});

// Import AFTER mocking crypto
import {
  promoteProjectToEfforts,
  undoProjectPromotion,
  type PromotionSelections,
} from "@/lib/din-service";

function makeSession(overrides: Partial<DINSession> = {}): DINSession {
  return {
    id: "session-1",
    name: "Test Session",
    createdAt: "2026-01-01T00:00:00.000Z",
    updatedAt: "2026-01-01T00:00:00.000Z",
    currentStep: 3,
    goals: [],
    sectorPlans: [],
    pmcEntries: [],
    benefits: [],
    capabilities: [
      {
        id: "cap1",
        sectorId: "PO",
        title: "Klantgesprek-methodiek",
        description: "Medewerkers beheersen klantgesprek-methodiek",
        relatedSectors: ["PO"],
      },
      {
        id: "cap2",
        sectorId: "PO",
        title: "Data-analyse",
        description: "Medewerkers kunnen klantdata interpreteren",
        relatedSectors: ["PO"],
      },
    ],
    efforts: [],
    goalBenefitMaps: [],
    benefitCapabilityMaps: [],
    capabilityEffortMaps: [],
    projectCapabilityMaps: [{ projectId: "proj1", capabilityId: "cap1" }],
    externalProjects: [
      {
        id: "proj1",
        sectorId: "PO",
        name: "Outside-in pilot",
        description: "Pilot bij 5 scholen om outside-in werken te testen",
        status: "in_uitvoering",
        domains: ["mens"],
        linkedCapabilityIds: [],
        buitenScope: false,
      },
    ],
    completedGoals: [],
    ...overrides,
  };
}

function makeEffort(partial: Partial<AIPromotedEffort> = {}): AIPromotedEffort {
  return {
    title: "Training klantgesprek",
    description: "Train 50 medewerkers in klantgesprek-methodiek",
    domain: "mens",
    status: "in_uitvoering",
    quarter: "Q1 2026",
    responsibleSector: "PO",
    dossier: {
      eigenaar: "Sectormanager PO",
      inspanningsleider: "HR-lead",
      verwachtResultaat: "80% getraind",
      kostenraming: "€50k",
      randvoorwaarden: "Zaal beschikbaar",
    },
    rationale: "Mens-domein",
    ...partial,
  };
}

function makeResult(
  overrides: Partial<ProjectPromotieResult> = {}
): ProjectPromotieResult {
  return {
    benefitMatches: [],
    capabilityMatches: [
      { capabilityId: "cap1", toelichting: "bouwt klantgesprek-vermogen op" },
    ],
    splitEfforts: [makeEffort()],
    findings: [],
    samenvatting: "Project gepromoveerd tot 1 inspanning.",
    ...overrides,
  };
}

beforeEach(() => {
  uuidCounter = 0;
});

describe("promoteProjectToEfforts", () => {
  it("promotes with 1 kept effort + 1 accepted capability", () => {
    const session = makeSession();
    const result = makeResult();
    const selections: PromotionSelections = {
      acceptedBenefitIds: [],
      acceptedCapabilityIds: ["cap1"],
      keptEfforts: result.splitEfforts,
      acceptedFindings: [],
    };

    const updates = promoteProjectToEfforts(session, "proj1", result, selections);

    // Project marked as promoted with ISO timestamp + effort ids
    expect(updates.externalProjects).toHaveLength(1);
    const promoted = updates.externalProjects![0];
    expect(promoted.promotedAt).toEqual(expect.any(String));
    expect(promoted.promotedAt?.length).toBeGreaterThan(0);
    expect(promoted.promotedToEffortIds).toHaveLength(1);

    // +1 new effort with originProjectId === project.id
    expect(updates.efforts).toHaveLength(1);
    expect(updates.efforts![0].originProjectId).toBe("proj1");
    expect(updates.efforts![0].sectorId).toBe("PO");
    expect(updates.efforts![0].domain).toBe("mens");
    expect(updates.efforts![0].status).toBe("in_uitvoering");

    // +1 capabilityEffortMap row linking cap1 -> new effort
    expect(updates.capabilityEffortMaps).toHaveLength(1);
    expect(updates.capabilityEffortMaps![0].capabilityId).toBe("cap1");
    expect(updates.capabilityEffortMaps![0].effortId).toBe(
      updates.efforts![0].id
    );

    // Old projectCapabilityMaps for this project removed
    expect(updates.projectCapabilityMaps).toEqual([]);
  });

  it("creates cartesian product for 3 efforts x 2 capabilities (6 map rows)", () => {
    const session = makeSession();
    const splitEfforts = [
      makeEffort({ title: "E1", description: "Effort 1" }),
      makeEffort({ title: "E2", description: "Effort 2", domain: "processen" }),
      makeEffort({
        title: "E3",
        description: "Effort 3",
        domain: "data_systemen",
      }),
    ];
    const result = makeResult({
      splitEfforts,
      capabilityMatches: [
        { capabilityId: "cap1", toelichting: "..." },
        { capabilityId: "cap2", toelichting: "..." },
      ],
    });
    const selections: PromotionSelections = {
      acceptedBenefitIds: [],
      acceptedCapabilityIds: ["cap1", "cap2"],
      keptEfforts: splitEfforts,
      acceptedFindings: [],
    };

    const updates = promoteProjectToEfforts(session, "proj1", result, selections);

    expect(updates.efforts).toHaveLength(3);
    expect(updates.capabilityEffortMaps).toHaveLength(6); // 3 x 2 cartesian
    // Each effort gets 2 rows (one per capability)
    const effortIdCounts = new Map<string, number>();
    for (const m of updates.capabilityEffortMaps!) {
      effortIdCounts.set(m.effortId, (effortIdCounts.get(m.effortId) || 0) + 1);
    }
    for (const count of effortIdCounts.values()) {
      expect(count).toBe(2);
    }
  });

  it("accepts finding of type 'vermogen' and pushes new DINCapability", () => {
    const session = makeSession();
    const vermogenFinding: FindingSuggestion = {
      type: "vermogen",
      beschrijving: "Meten van klantreis-kwaliteit",
      toelichting: "Project impliceert dit",
      targetSector: "PO",
    };
    const result = makeResult({ findings: [vermogenFinding] });
    const selections: PromotionSelections = {
      acceptedBenefitIds: [],
      acceptedCapabilityIds: ["cap1"],
      keptEfforts: result.splitEfforts,
      acceptedFindings: [vermogenFinding],
    };

    const updates = promoteProjectToEfforts(session, "proj1", result, selections);

    // session.capabilities had 2 -> now 3
    expect(updates.capabilities).toHaveLength(3);
    const newCap = updates.capabilities!.find(
      (c) => c.description === "Project impliceert dit"
    ) || updates.capabilities![updates.capabilities!.length - 1];
    expect(newCap.sectorId).toBe("PO");
  });

  it("accepts finding of type 'inspanning' and pushes new DINEffort with originProjectId", () => {
    const session = makeSession();
    const inspanningFinding: FindingSuggestion = {
      type: "inspanning",
      beschrijving: "Cultuur-workshop klantdenken",
      toelichting: "Aanvullende actie voor cultuur-domein",
      targetSector: "PO",
      domain: "cultuur",
    };
    const result = makeResult({ findings: [inspanningFinding] });
    const selections: PromotionSelections = {
      acceptedBenefitIds: [],
      acceptedCapabilityIds: ["cap1"],
      keptEfforts: result.splitEfforts,
      acceptedFindings: [inspanningFinding],
    };

    const updates = promoteProjectToEfforts(session, "proj1", result, selections);

    // session.efforts: 1 promoted effort + 1 finding effort = 2
    expect(updates.efforts).toHaveLength(2);
    const findingEffort = updates.efforts!.find(
      (e) => e.domain === "cultuur"
    );
    expect(findingEffort).toBeDefined();
    expect(findingEffort!.originProjectId).toBe("proj1");
    expect(findingEffort!.sectorId).toBe("PO");
  });

  it("returns {} when projectId not found in session.externalProjects", () => {
    const session = makeSession();
    const result = makeResult();
    const selections: PromotionSelections = {
      acceptedBenefitIds: [],
      acceptedCapabilityIds: ["cap1"],
      keptEfforts: result.splitEfforts,
      acceptedFindings: [],
    };

    const updates = promoteProjectToEfforts(
      session,
      "non-existent",
      result,
      selections
    );
    expect(updates).toEqual({});
  });
});

describe("undoProjectPromotion", () => {
  it("removes promoted efforts, restores projectCapabilityMaps, clears promotedAt", () => {
    // First promote, then undo
    const session = makeSession();
    const result = makeResult();
    const selections: PromotionSelections = {
      acceptedBenefitIds: [],
      acceptedCapabilityIds: ["cap1"],
      keptEfforts: result.splitEfforts,
      acceptedFindings: [],
    };

    const promoteUpdates = promoteProjectToEfforts(
      session,
      "proj1",
      result,
      selections
    );
    // Apply updates to build a "promoted session"
    const promotedSession: DINSession = {
      ...session,
      ...promoteUpdates,
    } as DINSession;

    expect(promotedSession.externalProjects![0].promotedAt).toBeDefined();
    expect(promotedSession.efforts).toHaveLength(1);
    expect(promotedSession.capabilityEffortMaps).toHaveLength(1);
    expect(promotedSession.projectCapabilityMaps).toEqual([]);

    const undoUpdates = undoProjectPromotion(promotedSession, "proj1");

    // Efforts removed
    expect(undoUpdates.efforts).toHaveLength(0);
    // capabilityEffortMaps cleaned
    expect(undoUpdates.capabilityEffortMaps).toHaveLength(0);
    // projectCapabilityMaps restored (cap1 came back)
    expect(undoUpdates.projectCapabilityMaps).toEqual([
      { projectId: "proj1", capabilityId: "cap1" },
    ]);
    // promotedAt + promotedToEffortIds cleared
    const restoredProject = undoUpdates.externalProjects![0];
    expect(restoredProject.promotedAt).toBeUndefined();
    expect(restoredProject.promotedToEffortIds).toBeUndefined();
  });

  it("returns {} when project.promotedAt is undefined (no-op)", () => {
    const session = makeSession();
    // Project is NOT promoted — promotedAt undefined
    const updates = undoProjectPromotion(session, "proj1");
    expect(updates).toEqual({});
  });

  it("does NOT rollback finding-created entities (documented behavior)", () => {
    // Promote with a vermogen finding -> promotedSession has 1 extra capability
    const session = makeSession();
    const vermogenFinding: FindingSuggestion = {
      type: "vermogen",
      beschrijving: "Meten van klantreis-kwaliteit",
      toelichting: "Project impliceert dit",
      targetSector: "PO",
    };
    const result = makeResult({ findings: [vermogenFinding] });
    const selections: PromotionSelections = {
      acceptedBenefitIds: [],
      acceptedCapabilityIds: ["cap1"],
      keptEfforts: result.splitEfforts,
      acceptedFindings: [vermogenFinding],
    };

    const promoteUpdates = promoteProjectToEfforts(
      session,
      "proj1",
      result,
      selections
    );
    const promotedSession: DINSession = {
      ...session,
      ...promoteUpdates,
    } as DINSession;

    // 2 base + 1 finding-vermogen = 3 capabilities
    expect(promotedSession.capabilities).toHaveLength(3);

    const undoUpdates = undoProjectPromotion(promotedSession, "proj1");

    // capabilities should NOT be returned by undo (finding is preserved)
    // Either undo doesn't touch capabilities (undefined in Partial) OR returns them unchanged.
    // Document: finding-created entities persist after undo.
    if (undoUpdates.capabilities !== undefined) {
      expect(undoUpdates.capabilities).toHaveLength(3);
    }
    // Promoted effort (1) removed, finding-efforts (0 for vermogen finding) unaffected
    expect(undoUpdates.efforts).toHaveLength(0);
  });
});
