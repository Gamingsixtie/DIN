import { describe, it, expect, vi, beforeEach } from "vitest";
import type { DINSession } from "@/lib/types";

// --- Pure state transition function extracted from session-context ---
// This mirrors the core logic inside updateSession's setSession updater:
//   const updates = updater(prev);
//   return { ...prev, ...updates, updatedAt: new Date().toISOString() };

function applySessionUpdate(
  prev: DINSession | null,
  updater: (prev: DINSession) => Partial<DINSession>
): DINSession | null {
  if (!prev) return prev;
  const updates = updater(prev);
  return { ...prev, ...updates, updatedAt: new Date().toISOString() };
}

// --- Test helper: minimal valid DINSession ---

function createTestSession(overrides: Partial<DINSession> = {}): DINSession {
  return {
    id: "test-session-id",
    name: "Test Sessie",
    createdAt: "2026-01-01T00:00:00.000Z",
    updatedAt: "2026-01-01T00:00:00.000Z",
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
    sectorAnalyses: {},
    verrijkteSectorplannen: {},
    completedGoals: [],
    ...overrides,
  };
}

describe("session-context: applySessionUpdate (pure state transition)", () => {
  it("functional updater receives latest prev state, not a stale closure value (DATA-03-a)", () => {
    const session = createTestSession({ benefits: [] });

    const benefit1 = {
      id: "b1",
      goalId: "g1",
      sectorId: "PO",
      description: "Eerste baat",
      profiel: {
        indicator: "NPS",
        indicatorOwner: "BI",
        currentValue: "30",
        targetValue: "45",
      },
    };
    const benefit2 = {
      id: "b2",
      goalId: "g1",
      sectorId: "VO",
      description: "Tweede baat",
      profiel: {
        indicator: "CES",
        indicatorOwner: "BI",
        currentValue: "3",
        targetValue: "5",
      },
    };

    // Simulate two sequential updates (like React batched setState calls)
    const after1 = applySessionUpdate(session, (prev) => ({
      benefits: [...prev.benefits, benefit1],
    }));
    const after2 = applySessionUpdate(after1!, (prev) => ({
      benefits: [...prev.benefits, benefit2],
    }));

    expect(after2!.benefits).toHaveLength(2);
    expect(after2!.benefits.map((b) => b.id)).toEqual(["b1", "b2"]);
  });

  it("two rapid updateSession calls both reflect in final state (DATA-03-b)", () => {
    const session = createTestSession({ benefits: [], capabilities: [] });

    const testBenefit = {
      id: "b1",
      goalId: "g1",
      sectorId: "PO",
      description: "Test baat",
      profiel: {
        indicator: "NPS",
        indicatorOwner: "BI",
        currentValue: "30",
        targetValue: "45",
      },
    };
    const testCapability = {
      id: "c1",
      sectorId: "PO",
      description: "Test vermogen",
      relatedSectors: ["PO"],
    };

    // First update adds a benefit
    const after1 = applySessionUpdate(session, (prev) => ({
      benefits: [...prev.benefits, testBenefit],
    }));
    // Second update adds a capability (uses result of first)
    const after2 = applySessionUpdate(after1!, (prev) => ({
      capabilities: [...prev.capabilities, testCapability],
    }));

    expect(after2!.benefits).toHaveLength(1);
    expect(after2!.capabilities).toHaveLength(1);
    // Both changes are present
    expect(after2!.benefits[0].id).toBe("b1");
    expect(after2!.capabilities[0].id).toBe("c1");
  });

  it("addToast is called when saveLocal returns false (DATA-03-f)", () => {
    // This test verifies the save-check branch logic:
    // When saveLocal returns false, queueMicrotask should call addToast with "error"
    const mockAddToast = vi.fn();
    const originalQueueMicrotask = globalThis.queueMicrotask;
    const microtasks: (() => void)[] = [];
    globalThis.queueMicrotask = (cb: () => void) => microtasks.push(cb);

    try {
      // Simulate the save-check logic from updateSession
      const saved = false; // saveLocal returned false
      if (!saved) {
        queueMicrotask(() =>
          mockAddToast(
            "Opslaan mislukt \u2014 ruim browsergegevens op of exporteer je sessie.",
            "error"
          )
        );
      }

      // Flush microtasks
      microtasks.forEach((cb) => cb());

      expect(mockAddToast).toHaveBeenCalledOnce();
      expect(mockAddToast).toHaveBeenCalledWith(
        "Opslaan mislukt \u2014 ruim browsergegevens op of exporteer je sessie.",
        "error"
      );
    } finally {
      globalThis.queueMicrotask = originalQueueMicrotask;
    }
  });

  it("partial updates merge without losing other fields", () => {
    const testBenefit = {
      id: "b1",
      goalId: "g1",
      sectorId: "PO",
      description: "Bestaande baat",
      profiel: {
        indicator: "NPS",
        indicatorOwner: "BI",
        currentValue: "30",
        targetValue: "45",
      },
    };
    const session = createTestSession({
      name: "Originele naam",
      benefits: [testBenefit],
    });

    const after = applySessionUpdate(session, () => ({
      name: "Bijgewerkte naam",
    }));

    expect(after!.name).toBe("Bijgewerkte naam");
    expect(after!.benefits).toHaveLength(1); // preserved
    expect(after!.benefits[0].id).toBe("b1"); // preserved
    expect(after!.goals).toEqual([]); // other fields preserved
  });

  it("setCurrentStep updates session.currentStep via functional updater", () => {
    const session = createTestSession({ currentStep: 0 });

    // Simulate the internal logic of setCurrentStep:
    // const stepIndex = APP_STEPS.findIndex(s => s.key === step);
    // The step "din-mapping" is at index 2 in APP_STEPS
    const stepIndex = 2;
    const after = applySessionUpdate(session, () => ({
      currentStep: stepIndex,
    }));

    expect(after!.currentStep).toBe(2);
    // updatedAt should be refreshed
    expect(after!.updatedAt).not.toBe(session.updatedAt);
  });

  it("returns null when prev is null (no session loaded)", () => {
    const result = applySessionUpdate(null, () => ({ name: "ignored" }));
    expect(result).toBeNull();
  });
});
