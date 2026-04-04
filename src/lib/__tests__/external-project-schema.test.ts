// Tests for Phase 12: External Project schema extensions, ProjectCapabilityMap,
// AI Project Extraction/Matching response schemas, DINSession updates
import { describe, it, expect } from "vitest";
import {
  ExternalProjectSchema,
  ProjectCapabilityMapSchema,
  AIProjectExtractionResponseSchema,
  AIProjectCapabilityMatchResponseSchema,
  DINSessionSchema,
} from "../schemas";

describe("ExternalProjectSchema extensions (Phase 12)", () => {
  const baseProject = {
    id: "x",
    sectorId: "PO",
    name: "Test",
    description: "Desc",
    status: "in_uitvoering" as const,
  };

  it("Test 1: accepts domains array with EffortDomain values", () => {
    const result = ExternalProjectSchema.parse({
      ...baseProject,
      domains: ["mens", "processen"],
    });
    expect(result.domains).toEqual(["mens", "processen"]);
  });

  it("Test 2: defaults domains to [] for backward compat (D-03)", () => {
    const result = ExternalProjectSchema.parse(baseProject);
    expect(result.domains).toEqual([]);
  });

  it("Test 3: accepts linkedCapabilityIds", () => {
    const result = ExternalProjectSchema.parse({
      ...baseProject,
      linkedCapabilityIds: ["cap-1"],
    });
    expect(result.linkedCapabilityIds).toEqual(["cap-1"]);
  });

  it("Test 4: accepts aiWarning", () => {
    const result = ExternalProjectSchema.parse({
      ...baseProject,
      aiWarning: "warning text",
    });
    expect(result.aiWarning).toBe("warning text");
  });

  it("Test 5: accepts buitenScope", () => {
    const result = ExternalProjectSchema.parse({
      ...baseProject,
      buitenScope: true,
    });
    expect(result.buitenScope).toBe(true);
  });
});

describe("ProjectCapabilityMapSchema", () => {
  it("Test 6: validates projectId + capabilityId pairs", () => {
    const result = ProjectCapabilityMapSchema.parse({
      projectId: "p1",
      capabilityId: "c1",
    });
    expect(result.projectId).toBe("p1");
    expect(result.capabilityId).toBe("c1");
  });
});

describe("AIProjectExtractionResponseSchema", () => {
  it("Test 7: accepts projects with defaults", () => {
    const result = AIProjectExtractionResponseSchema.parse({
      projects: [{ name: "X", description: "Y" }],
    });
    expect(result.projects).toHaveLength(1);
    expect(result.projects[0].status).toBe("in_uitvoering");
    expect(result.projects[0].domains).toEqual([]);
  });
});

describe("AIProjectCapabilityMatchResponseSchema", () => {
  it("Test 8: accepts matches with all required fields", () => {
    const result = AIProjectCapabilityMatchResponseSchema.parse({
      matches: [
        {
          projectId: "p1",
          suggestedCapabilityIds: ["c1"],
          confidence: "hoog",
          toelichting: "reason",
        },
      ],
    });
    expect(result.matches).toHaveLength(1);
    expect(result.matches[0].confidence).toBe("hoog");
  });
});

describe("DINSessionSchema projectCapabilityMaps", () => {
  const minimalSession = {
    id: "s1",
    name: "Test",
    createdAt: "2026-01-01",
    updatedAt: "2026-01-01",
    currentStep: 1,
    goals: [],
    sectorPlans: [],
    pmcEntries: [],
    benefits: [],
    capabilities: [],
    efforts: [],
  };

  it("Test 9: accepts projectCapabilityMaps:[]", () => {
    const result = DINSessionSchema.parse({
      ...minimalSession,
      projectCapabilityMaps: [],
    });
    expect(result.projectCapabilityMaps).toEqual([]);
  });

  it("Test 10: defaults projectCapabilityMaps to [] when missing", () => {
    const result = DINSessionSchema.parse(minimalSession);
    expect(result.projectCapabilityMaps).toEqual([]);
  });
});
