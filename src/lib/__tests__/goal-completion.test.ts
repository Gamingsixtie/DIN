import { describe, it, expect } from "vitest";
import {
  checkSectorChain,
  getGoalCompletionStatus,
} from "@/lib/din-service";
import type {
  SectorChainStatus,
  GoalCompletionStatus,
  GoalStatus,
} from "@/lib/din-service";
import { DINSessionSchema } from "@/lib/schemas";

/** Helper: complete BatenProfiel for Zod validation */
function makeBatenProfiel() {
  return {
    bateneigenaar: "",
    indicator: "ind",
    indicatorOwner: "eigenaar",
    currentValue: "0",
    targetValue: "10",
  };
}

/** Helper: complete VermogensProfiel */
function makeVermogensProfiel() {
  return {
    eigenaar: "",
    huidieSituatie: "huidige",
    gewensteSituatie: "gewenste",
  };
}

/** Helper: complete InspanningsDossier */
function makeInspanningsDossier() {
  return {
    eigenaar: "",
    inspanningsleider: "",
    verwachtResultaat: "",
    kostenraming: "",
    randvoorwaarden: "",
  };
}

/**
 * Minimal DINSession factory — creates a valid session with empty arrays.
 * Override any fields via the partial parameter.
 */
function createMinimalSession(overrides: Record<string, unknown> = {}) {
  return DINSessionSchema.parse({
    id: "test-session-1",
    name: "Test Sessie",
    createdAt: "2026-01-01T00:00:00Z",
    updatedAt: "2026-01-01T00:00:00Z",
    currentStep: 0,
    goals: [],
    sectorPlans: [],
    pmcEntries: [],
    benefits: [],
    capabilities: [],
    efforts: [],
    goalBenefitMaps: [],
    benefitCapabilityMaps: [],
    capabilityEffortMaps: [],
    ...overrides,
  });
}

describe("DINSessionSchema completedGoals field", () => {
  it("defaults completedGoals to empty array when not provided", () => {
    const session = createMinimalSession();
    expect(session.completedGoals).toEqual([]);
  });

  it("preserves completedGoals array when provided", () => {
    const session = createMinimalSession({ completedGoals: ["goal-1"] });
    expect(session.completedGoals).toEqual(["goal-1"]);
  });
});

describe("checkSectorChain", () => {
  it("returns all-false status for a goal with no items in a sector", () => {
    const session = createMinimalSession({
      goals: [{ id: "g1", name: "Doel 1", description: "", rank: 1 }],
    });

    const result: SectorChainStatus = checkSectorChain(session, "g1", "PO");

    expect(result.hasBenefits).toBe(false);
    expect(result.hasCapabilities).toBe(false);
    expect(result.hasEfforts).toBe(false);
    expect(result.isComplete).toBe(false);
    expect(result.missing).toEqual(
      expect.arrayContaining(["mist baten", "mist vermogens", "mist inspanningen"])
    );
  });

  it("returns complete status for a goal with a full chain in a sector", () => {
    const session = createMinimalSession({
      goals: [{ id: "g1", name: "Doel 1", description: "", rank: 1 }],
      benefits: [
        { id: "b1", goalId: "g1", sectorId: "PO", title: "Baat", description: "Baat 1", profiel: makeBatenProfiel() },
      ],
      capabilities: [
        { id: "c1", sectorId: "PO", title: "Vermogen", description: "Vermogen 1", relatedSectors: ["PO"], profiel: makeVermogensProfiel() },
      ],
      efforts: [
        { id: "e1", sectorId: "PO", title: "Inspanning", description: "Inspanning 1", domain: "mens", status: "gepland", dependencies: [], votes: 0, dossier: makeInspanningsDossier() },
      ],
      goalBenefitMaps: [{ goalId: "g1", benefitId: "b1" }],
      benefitCapabilityMaps: [{ benefitId: "b1", capabilityId: "c1" }],
      capabilityEffortMaps: [{ capabilityId: "c1", effortId: "e1" }],
    });

    const result: SectorChainStatus = checkSectorChain(session, "g1", "PO");

    expect(result.hasBenefits).toBe(true);
    expect(result.hasCapabilities).toBe(true);
    expect(result.hasEfforts).toBe(true);
    expect(result.isComplete).toBe(true);
    expect(result.missing).toEqual([]);
  });

  it("returns partial status when only benefits exist but no linked capabilities", () => {
    const session = createMinimalSession({
      goals: [{ id: "g1", name: "Doel 1", description: "", rank: 1 }],
      benefits: [
        { id: "b1", goalId: "g1", sectorId: "PO", title: "Baat", description: "Baat 1", profiel: makeBatenProfiel() },
      ],
      goalBenefitMaps: [{ goalId: "g1", benefitId: "b1" }],
    });

    const result: SectorChainStatus = checkSectorChain(session, "g1", "PO");

    expect(result.hasBenefits).toBe(true);
    expect(result.hasCapabilities).toBe(false);
    expect(result.hasEfforts).toBe(false);
    expect(result.isComplete).toBe(false);
    expect(result.missing).toContain("mist vermogens");
    expect(result.missing).toContain("mist inspanningen");
    expect(result.missing).not.toContain("mist baten");
  });

  it("does NOT count unlinked items (benefit exists for sector but not in goalBenefitMaps)", () => {
    const session = createMinimalSession({
      goals: [{ id: "g1", name: "Doel 1", description: "", rank: 1 }],
      benefits: [
        // Benefit exists for PO sector but is NOT linked to g1 via goalBenefitMaps
        { id: "b1", goalId: "g1", sectorId: "PO", title: "Baat", description: "Baat 1", profiel: makeBatenProfiel() },
      ],
      // No goalBenefitMaps entry for g1 -> b1
      goalBenefitMaps: [],
    });

    const result: SectorChainStatus = checkSectorChain(session, "g1", "PO");

    expect(result.hasBenefits).toBe(false);
  });
});

describe("getGoalCompletionStatus", () => {
  it("returns status 'niet-begonnen' when goal has no items in any sector", () => {
    const session = createMinimalSession({
      goals: [{ id: "g1", name: "Doel 1", description: "", rank: 1 }],
    });

    const result: GoalCompletionStatus = getGoalCompletionStatus(session, "g1");

    expect(result.status).toBe("niet-begonnen");
    expect(result.isComplete).toBe(false);
    expect(result.isManuallyCompleted).toBe(false);
  });

  it("returns status 'bezig' when goal has items in some but not all sectors", () => {
    const session = createMinimalSession({
      goals: [{ id: "g1", name: "Doel 1", description: "", rank: 1 }],
      benefits: [
        { id: "b1", goalId: "g1", sectorId: "PO", title: "Baat", description: "Baat 1", profiel: makeBatenProfiel() },
      ],
      goalBenefitMaps: [{ goalId: "g1", benefitId: "b1" }],
    });

    const result: GoalCompletionStatus = getGoalCompletionStatus(session, "g1");

    expect(result.status).toBe("bezig");
    expect(result.isComplete).toBe(false);
  });

  it("returns status 'bezig' when goal has complete chains in all sectors but is NOT in completedGoals", () => {
    const session = createMinimalSession({
      goals: [{ id: "g1", name: "Doel 1", description: "", rank: 1 }],
      benefits: [
        { id: "b1", goalId: "g1", sectorId: "PO", title: "B", description: "B", profiel: makeBatenProfiel() },
        { id: "b2", goalId: "g1", sectorId: "VO", title: "B", description: "B", profiel: makeBatenProfiel() },
        { id: "b3", goalId: "g1", sectorId: "Zakelijk", title: "B", description: "B", profiel: makeBatenProfiel() },
      ],
      capabilities: [
        { id: "c1", sectorId: "PO", title: "C", description: "C", relatedSectors: ["PO"], profiel: makeVermogensProfiel() },
        { id: "c2", sectorId: "VO", title: "C", description: "C", relatedSectors: ["VO"], profiel: makeVermogensProfiel() },
        { id: "c3", sectorId: "Zakelijk", title: "C", description: "C", relatedSectors: ["Zakelijk"], profiel: makeVermogensProfiel() },
      ],
      efforts: [
        { id: "e1", sectorId: "PO", title: "E", description: "E", domain: "mens", status: "gepland", dependencies: [], votes: 0, dossier: makeInspanningsDossier() },
        { id: "e2", sectorId: "VO", title: "E", description: "E", domain: "mens", status: "gepland", dependencies: [], votes: 0, dossier: makeInspanningsDossier() },
        { id: "e3", sectorId: "Zakelijk", title: "E", description: "E", domain: "mens", status: "gepland", dependencies: [], votes: 0, dossier: makeInspanningsDossier() },
      ],
      goalBenefitMaps: [
        { goalId: "g1", benefitId: "b1" },
        { goalId: "g1", benefitId: "b2" },
        { goalId: "g1", benefitId: "b3" },
      ],
      benefitCapabilityMaps: [
        { benefitId: "b1", capabilityId: "c1" },
        { benefitId: "b2", capabilityId: "c2" },
        { benefitId: "b3", capabilityId: "c3" },
      ],
      capabilityEffortMaps: [
        { capabilityId: "c1", effortId: "e1" },
        { capabilityId: "c2", effortId: "e2" },
        { capabilityId: "c3", effortId: "e3" },
      ],
      completedGoals: [],
    });

    const result: GoalCompletionStatus = getGoalCompletionStatus(session, "g1");

    // Complete chains in all sectors but NOT manually marked as completed
    expect(result.status).toBe("bezig");
    expect(result.isComplete).toBe(true);
    expect(result.isManuallyCompleted).toBe(false);
  });

  it("returns status 'afgerond' when goal ID is in completedGoals array", () => {
    const session = createMinimalSession({
      goals: [{ id: "g1", name: "Doel 1", description: "", rank: 1 }],
      completedGoals: ["g1"],
    });

    const result: GoalCompletionStatus = getGoalCompletionStatus(session, "g1");

    expect(result.status).toBe("afgerond");
    expect(result.isManuallyCompleted).toBe(true);
  });

  it("sectorStatuses has entries for all 3 sectors (PO, VO, Zakelijk)", () => {
    const session = createMinimalSession({
      goals: [{ id: "g1", name: "Doel 1", description: "", rank: 1 }],
    });

    const result: GoalCompletionStatus = getGoalCompletionStatus(session, "g1");

    expect(result.sectorStatuses).toHaveProperty("PO");
    expect(result.sectorStatuses).toHaveProperty("VO");
    expect(result.sectorStatuses).toHaveProperty("Zakelijk");
  });
});
