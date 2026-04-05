import { describe, test, expect } from "vitest";
import { getFocusGoal, computeFocusView } from "@/lib/stap5-focus";
import type { DINSession } from "@/lib/types";

// ============================================================
// getFocusGoal — D-01 expression contract
// ============================================================

describe("getFocusGoal (D-01)", () => {
  test("Test 1: sorteert op rank oplopend en retourneert laagste", () => {
    const goals = [
      { id: "g1", name: "Doel 1", description: "", rank: 3 },
      { id: "g2", name: "Doel 2", description: "", rank: 1 },
      { id: "g3", name: "Doel 3", description: "", rank: 2 },
    ];
    const result = getFocusGoal(goals);
    expect(result?.id).toBe("g2");
  });

  test("Test 2: rank undefined valt terug op 999 in sort", () => {
    const goals = [
      { id: "g1", name: "Doel 1", description: "" }, // geen rank
      { id: "g2", name: "Doel 2", description: "", rank: 5 },
    ];
    const result = getFocusGoal(goals);
    expect(result?.id).toBe("g2"); // g1 valt op 999, g2 op 5 → g2 wint
  });

  test("Test 3: lege array retourneert undefined", () => {
    const result = getFocusGoal([]);
    expect(result).toBeUndefined();
  });

  test("Test 4: single goal retourneert dat goal (fallback path)", () => {
    const goals = [{ id: "g1", name: "Only", description: "" }];
    const result = getFocusGoal(goals);
    expect(result?.id).toBe("g1");
  });

  test("Test 5: muteert source array NIET (spread kopie)", () => {
    const goals = [
      { id: "g1", name: "A", description: "", rank: 3 },
      { id: "g2", name: "B", description: "", rank: 1 },
    ];
    getFocusGoal(goals);
    expect(goals[0].id).toBe("g1"); // ongewijzigd
  });
});

// ============================================================
// computeFocusView — R-CROSS-01, R-CROSS-02
// ============================================================

function mockSession(overrides: Partial<DINSession> = {}): DINSession {
  const base: DINSession = {
    id: "s1",
    name: "Test",
    createdAt: "2026-04-05T00:00:00Z",
    updatedAt: "2026-04-05T00:00:00Z",
    currentStep: 1,
    goals: [],
    sectorPlans: [],
    pmcEntries: [],
    benefits: [],
    capabilities: [],
    efforts: [],
    goalBenefitMaps: [],
    benefitCapabilityMaps: [],
    capabilityEffortMaps: [],
  };
  return { ...base, ...overrides };
}

describe("computeFocusView (R-CROSS-01, R-CROSS-02)", () => {
  test("Test 1: filtert baten op focusdoel via goalBenefitMaps", () => {
    const session = mockSession({
      goals: [
        { id: "g1", name: "Focus", description: "", rank: 1 },
        { id: "g2", name: "Ander", description: "", rank: 2 },
      ],
      benefits: [
        { id: "b1", goalId: "g1", sectorId: "PO", description: "Baat onder focus", title: "B1", createdAt: "", updatedAt: "" },
        { id: "b2", goalId: "g2", sectorId: "VO", description: "Baat onder ander", title: "B2", createdAt: "", updatedAt: "" },
      ],
      goalBenefitMaps: [
        { goalId: "g1", benefitId: "b1" },
        { goalId: "g2", benefitId: "b2" },
      ],
    });
    const view = computeFocusView(session);
    expect(view).not.toBeNull();
    expect(view!.focusGoal.id).toBe("g1");
    expect(view!.focusBenefits.map((b) => b.id)).toEqual(["b1"]);
  });

  test("Test 2: filtert vermogens op relatedSectors.length > 1 EN koppeling aan focus-baten", () => {
    const session = mockSession({
      goals: [{ id: "g1", name: "Focus", description: "", rank: 1 }],
      benefits: [
        { id: "b1", goalId: "g1", sectorId: "PO", description: "B1", title: "", createdAt: "", updatedAt: "" },
      ],
      capabilities: [
        { id: "c1", sectorId: "PO", description: "Cross", title: "", relatedSectors: ["PO", "VO"], consolidated: false, createdAt: "", updatedAt: "" },
        { id: "c2", sectorId: "PO", description: "Solo", title: "", relatedSectors: ["PO"], consolidated: false, createdAt: "", updatedAt: "" },
        { id: "c3", sectorId: "VO", description: "Cross niet gekoppeld", title: "", relatedSectors: ["VO", "Zakelijk"], consolidated: false, createdAt: "", updatedAt: "" },
      ],
      goalBenefitMaps: [{ goalId: "g1", benefitId: "b1" }],
      benefitCapabilityMaps: [
        { benefitId: "b1", capabilityId: "c1" },
        { benefitId: "b1", capabilityId: "c2" },
      ],
    });
    const view = computeFocusView(session);
    expect(view!.focusCaps.map((c) => c.id)).toEqual(["c1"]); // alleen cross-sector EN gekoppeld
    expect(view!.outOfScopeCaps.map((c) => c.id).sort()).toEqual(["c2", "c3"].sort());
  });

  test("Test 3: filtert inspanningen op responsibleSector multi-sector EN koppeling aan focus-vermogens", () => {
    const session = mockSession({
      goals: [{ id: "g1", name: "Focus", description: "", rank: 1 }],
      benefits: [
        { id: "b1", goalId: "g1", sectorId: "PO", description: "B1", title: "", createdAt: "", updatedAt: "" },
      ],
      capabilities: [
        { id: "c1", sectorId: "PO", description: "Cross", title: "", relatedSectors: ["PO", "VO"], consolidated: false, createdAt: "", updatedAt: "" },
      ],
      efforts: [
        { id: "e1", sectorId: "PO", description: "Shared", title: "", domain: "mens", responsibleSector: "PO, VO", consolidated: false, createdAt: "", updatedAt: "" },
        { id: "e2", sectorId: "PO", description: "Solo", title: "", domain: "mens", responsibleSector: "PO", consolidated: false, createdAt: "", updatedAt: "" },
      ],
      goalBenefitMaps: [{ goalId: "g1", benefitId: "b1" }],
      benefitCapabilityMaps: [{ benefitId: "b1", capabilityId: "c1" }],
      capabilityEffortMaps: [
        { capabilityId: "c1", effortId: "e1" },
        { capabilityId: "c1", effortId: "e2" },
      ],
    });
    const view = computeFocusView(session);
    expect(view!.focusEfforts.map((e) => e.id)).toEqual(["e1"]); // alleen multi-sector EN gekoppeld
    expect(view!.outOfScopeEfforts.map((e) => e.id)).toEqual(["e2"]);
  });

  test("Test 4: negeert consolidated=true items (zowel caps als efforts)", () => {
    const session = mockSession({
      goals: [{ id: "g1", name: "Focus", description: "", rank: 1 }],
      benefits: [
        { id: "b1", goalId: "g1", sectorId: "PO", description: "B1", title: "", createdAt: "", updatedAt: "" },
      ],
      capabilities: [
        { id: "c1", sectorId: "PO", description: "Cross consolidated", title: "", relatedSectors: ["PO", "VO"], consolidated: true, createdAt: "", updatedAt: "" },
      ],
      goalBenefitMaps: [{ goalId: "g1", benefitId: "b1" }],
      benefitCapabilityMaps: [{ benefitId: "b1", capabilityId: "c1" }],
    });
    const view = computeFocusView(session);
    expect(view!.focusCaps).toEqual([]);
    expect(view!.outOfScopeCaps).toEqual([]); // consolidated items vallen OOK buiten active set
  });

  test("Test 5: geen doelen → null", () => {
    const session = mockSession({ goals: [] });
    const view = computeFocusView(session);
    expect(view).toBeNull();
  });

  test("Test 6: focusdoel maar geen cross-sector vermogens → lege focusCaps, non-null view", () => {
    const session = mockSession({
      goals: [{ id: "g1", name: "Focus", description: "", rank: 1 }],
      benefits: [
        { id: "b1", goalId: "g1", sectorId: "PO", description: "B1", title: "", createdAt: "", updatedAt: "" },
      ],
      goalBenefitMaps: [{ goalId: "g1", benefitId: "b1" }],
    });
    const view = computeFocusView(session);
    expect(view).not.toBeNull();
    expect(view!.focusCaps).toEqual([]);
    expect(view!.focusEfforts).toEqual([]);
    expect(view!.focusBenefits.length).toBe(1);
  });
});
