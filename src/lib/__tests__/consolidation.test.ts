// Consolidation logic unit tests (merge/undo for capabilities and efforts)
import { describe, it, expect, vi, beforeEach } from "vitest";
import type { DINSession } from "@/lib/types";

// Mock crypto.randomUUID to return predictable IDs
const mockUUID = "shared-uuid-1234";
vi.stubGlobal("crypto", {
  randomUUID: vi.fn(() => mockUUID),
});

// Import after mocking crypto
import {
  mergeCapabilities,
  undoMergeCapabilities,
  mergeEfforts,
  undoMergeEfforts,
} from "@/components/steps/CrossAnalyseStep";

function createMockSession(overrides: Partial<DINSession> = {}): DINSession {
  return {
    id: "session-1",
    name: "Test Session",
    createdAt: "2026-01-01",
    updatedAt: "2026-01-01",
    currentStep: 4,
    goals: [],
    sectorPlans: [],
    pmcEntries: [],
    benefits: [],
    capabilities: [
      {
        id: "cap-po-1",
        sectorId: "PO",
        title: "Klantgesprek-methodiek PO",
        description: "Medewerkers beheersen klantgesprek-methodiek (PO)",
        relatedSectors: ["PO"],
        status: "gepland" as const,
      },
      {
        id: "cap-vo-1",
        sectorId: "VO",
        title: "Klantgesprek-methodiek VO",
        description: "Medewerkers beheersen klantgesprek-methodiek (VO)",
        relatedSectors: ["VO"],
        status: "gepland" as const,
      },
      {
        id: "cap-zak-1",
        sectorId: "Zakelijk",
        title: "Marktanalyse",
        description: "Marktanalyse vermogen",
        relatedSectors: ["Zakelijk"],
        status: "gepland" as const,
      },
    ],
    efforts: [
      {
        id: "eff-po-1",
        sectorId: "PO",
        title: "Training klantgesprek PO",
        description: "Training uitvoeren voor PO medewerkers",
        domain: "mens" as const,
        status: "gepland" as const,
        dependencies: [],
      },
      {
        id: "eff-vo-1",
        sectorId: "VO",
        title: "Training klantgesprek VO",
        description: "Training uitvoeren voor VO medewerkers",
        domain: "mens" as const,
        status: "gepland" as const,
        dependencies: [],
      },
    ],
    goalBenefitMaps: [],
    benefitCapabilityMaps: [
      { benefitId: "ben-1", capabilityId: "cap-po-1" },
      { benefitId: "ben-2", capabilityId: "cap-vo-1" },
      { benefitId: "ben-1", capabilityId: "cap-vo-1" }, // shared benefit
    ],
    capabilityEffortMaps: [
      { capabilityId: "cap-po-1", effortId: "eff-po-1" },
      { capabilityId: "cap-vo-1", effortId: "eff-vo-1" },
    ],
    ...overrides,
  } as DINSession;
}

describe("mergeCapabilities", () => {
  beforeEach(() => {
    vi.mocked(crypto.randomUUID).mockReturnValue(mockUUID);
  });

  it("creates a new shared capability with multi-sector relatedSectors", () => {
    const session = createMockSession();
    const result = mergeCapabilities(session, ["cap-po-1", "cap-vo-1"]);

    const sharedItem = result.capabilities.find((c) => c.id === mockUUID);
    expect(sharedItem).toBeDefined();
    expect(sharedItem!.relatedSectors).toEqual(
      expect.arrayContaining(["PO", "VO"])
    );
    expect(sharedItem!.relatedSectors).toHaveLength(2);
  });

  it("flags original items with consolidated: true and consolidatedInto: sharedId", () => {
    const session = createMockSession();
    const result = mergeCapabilities(session, ["cap-po-1", "cap-vo-1"]);

    const origPO = result.capabilities.find((c) => c.id === "cap-po-1");
    const origVO = result.capabilities.find((c) => c.id === "cap-vo-1");
    expect(origPO?.consolidated).toBe(true);
    expect(origPO?.consolidatedInto).toBe(mockUUID);
    expect(origVO?.consolidated).toBe(true);
    expect(origVO?.consolidatedInto).toBe(mockUUID);
  });

  it("copies benefitCapabilityMaps from originals to the new shared item (deduplicating)", () => {
    const session = createMockSession();
    const result = mergeCapabilities(session, ["cap-po-1", "cap-vo-1"]);

    const sharedMaps = result.benefitCapabilityMaps.filter(
      (m) => m.capabilityId === mockUUID
    );
    // ben-1 mapped to cap-po-1 AND cap-vo-1, so should appear once for shared; ben-2 mapped to cap-vo-1
    expect(sharedMaps).toHaveLength(2);
    expect(sharedMaps.map((m) => m.benefitId).sort()).toEqual(["ben-1", "ben-2"]);
  });

  it("copies capabilityEffortMaps from originals to the new shared item (deduplicating)", () => {
    const session = createMockSession();
    const result = mergeCapabilities(session, ["cap-po-1", "cap-vo-1"]);

    const sharedEffMaps = result.capabilityEffortMaps.filter(
      (m) => m.capabilityId === mockUUID
    );
    expect(sharedEffMaps).toHaveLength(2);
    expect(sharedEffMaps.map((m) => m.effortId).sort()).toEqual([
      "eff-po-1",
      "eff-vo-1",
    ]);
  });

  it("with less than 2 items returns unchanged session", () => {
    const session = createMockSession();
    const result = mergeCapabilities(session, ["cap-po-1"]);
    expect(result).toBe(session); // same reference
  });
});

describe("undoMergeCapabilities", () => {
  it("removes the shared item, clears consolidated flags on originals, removes shared item mappings", () => {
    const session = createMockSession();
    // First merge
    const merged = mergeCapabilities(session, ["cap-po-1", "cap-vo-1"]);

    // Then undo
    const undone = undoMergeCapabilities(merged, mockUUID);

    // Shared item removed
    expect(undone.capabilities.find((c) => c.id === mockUUID)).toBeUndefined();

    // Originals unflagged
    const origPO = undone.capabilities.find((c) => c.id === "cap-po-1");
    const origVO = undone.capabilities.find((c) => c.id === "cap-vo-1");
    expect(origPO?.consolidated).toBeUndefined();
    expect(origPO?.consolidatedInto).toBeUndefined();
    expect(origVO?.consolidated).toBeUndefined();
    expect(origVO?.consolidatedInto).toBeUndefined();

    // Shared item mappings removed
    expect(
      undone.benefitCapabilityMaps.filter((m) => m.capabilityId === mockUUID)
    ).toHaveLength(0);
    expect(
      undone.capabilityEffortMaps.filter((m) => m.capabilityId === mockUUID)
    ).toHaveLength(0);
  });
});

describe("mergeEfforts", () => {
  it("creates a shared effort with multi-sector sectorId and flags originals", () => {
    const session = createMockSession();
    const result = mergeEfforts(session, ["eff-po-1", "eff-vo-1"]);

    const sharedItem = result.efforts.find((e) => e.id === mockUUID);
    expect(sharedItem).toBeDefined();
    expect(sharedItem!.responsibleSector).toContain("PO");
    expect(sharedItem!.responsibleSector).toContain("VO");

    // Originals flagged
    const origPO = result.efforts.find((e) => e.id === "eff-po-1");
    const origVO = result.efforts.find((e) => e.id === "eff-vo-1");
    expect(origPO?.consolidated).toBe(true);
    expect(origPO?.consolidatedInto).toBe(mockUUID);
    expect(origVO?.consolidated).toBe(true);
    expect(origVO?.consolidatedInto).toBe(mockUUID);
  });
});

describe("undoMergeEfforts", () => {
  it("removes the shared effort, clears flags, removes mappings", () => {
    const session = createMockSession();
    const merged = mergeEfforts(session, ["eff-po-1", "eff-vo-1"]);
    const undone = undoMergeEfforts(merged, mockUUID);

    // Shared item removed
    expect(undone.efforts.find((e) => e.id === mockUUID)).toBeUndefined();

    // Originals unflagged
    const origPO = undone.efforts.find((e) => e.id === "eff-po-1");
    const origVO = undone.efforts.find((e) => e.id === "eff-vo-1");
    expect(origPO?.consolidated).toBeUndefined();
    expect(origPO?.consolidatedInto).toBeUndefined();
    expect(origVO?.consolidated).toBeUndefined();
    expect(origVO?.consolidatedInto).toBeUndefined();

    // Shared item mappings removed
    expect(
      undone.capabilityEffortMaps.filter((m) => m.effortId === mockUUID)
    ).toHaveLength(0);
  });
});
