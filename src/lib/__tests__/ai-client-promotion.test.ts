import { describe, test, expect, vi, beforeEach } from "vitest";
import type { DINBenefit, DINCapability, ExternalProject } from "@/lib/types";

// Mock the Anthropic SDK at module level BEFORE importing ai-client.
// This lets us control what callClaudeWithValidation receives from the model
// and verify the Pitfall 2 filter logic in promoteExternalProject.
const mockCreate = vi.fn();

vi.mock("@anthropic-ai/sdk", () => {
  return {
    default: class MockAnthropic {
      messages = { create: mockCreate };
    },
  };
});

// Import AFTER mock is set up so ai-client's Anthropic instance uses the mock.
import { promoteExternalProject } from "@/lib/ai-client";

// ============================================================
// Fixtures — minimal valid session-like inputs
// ============================================================

const sectorName = "PO";

const project: ExternalProject = {
  id: "proj-1",
  sectorId: "PO",
  name: "Outside-in training",
  description: "Medewerkers leren klantgesprekken voeren in de outside-in methodiek.",
  status: "in_uitvoering",
  relevance: "hoog",
  domains: ["mens", "cultuur"],
  linkedCapabilityIds: [],
  buitenScope: false,
};

const sectorBenefits: DINBenefit[] = [
  {
    id: "ben-1",
    goalId: "goal-1",
    sectorId: "PO",
    title: "Klanttevredenheid stijgt",
    description: "NPS stijgt van 32 naar 45 in PO",
    profiel: {
      indicator: "NPS",
      indicatorOwner: "Sectormanager PO",
      currentValue: "32",
      targetValue: "45",
    },
  },
];

const sectorCapabilities: DINCapability[] = [
  {
    id: "cap-1",
    sectorId: "PO",
    title: "Klantgesprek-methodiek",
    description: "Medewerkers beheersen outside-in klantgesprek",
    relatedSectors: ["PO"],
  },
  {
    id: "cap-2",
    sectorId: "PO",
    title: "Feedback-loop",
    description: "Structurele feedbackverwerking van klantgesprekken",
    relatedSectors: ["PO"],
  },
];

/**
 * Helper: build a mock Anthropic message response around a JSON payload.
 * The ai-client's callClaudeWithValidation wraps callClaude, which reads
 * `response.content[0].text`. We return a text block containing JSON.
 */
function mockAnthropicResponse(payload: unknown) {
  return {
    content: [{ type: "text", text: JSON.stringify(payload) }],
  };
}

// ============================================================
// Tests
// ============================================================

describe("promoteExternalProject — Pitfall 2 filter (invalid IDs)", () => {
  beforeEach(() => {
    mockCreate.mockReset();
  });

  test("drops capabilityMatches with IDs not in sectorCapabilities", async () => {
    // AI returns one valid + one ghost capabilityId
    mockCreate.mockResolvedValueOnce(
      mockAnthropicResponse({
        benefitMatches: [],
        capabilityMatches: [
          { capabilityId: "cap-1", toelichting: "Directe bijdrage aan klantgesprek" },
          { capabilityId: "ghost-id", toelichting: "AI hallucinatie" },
        ],
        splitEfforts: [
          {
            title: "Training uitrollen",
            description: "Training outside-in voor alle docenten",
            domain: "mens",
            status: "in_uitvoering",
            quarter: "Q2 2026",
            responsibleSector: "PO",
            dossier: {
              eigenaar: "HRD",
              inspanningsleider: "Opleidingscoordinator",
              verwachtResultaat: "100% geschoold",
              kostenraming: "150k",
              randvoorwaarden: "Budget",
            },
            rationale: "Primaire inspanning",
          },
        ],
        findings: [],
        samenvatting: "Project past in klantgesprek-vermogen.",
      })
    );

    const result = await promoteExternalProject(
      project,
      sectorBenefits,
      sectorCapabilities,
      sectorName,
      {}
    );

    expect(result.success).toBe(true);
    if (!result.success) return;

    // ghost-id must be filtered out; cap-1 preserved
    expect(result.data.capabilityMatches).toHaveLength(1);
    expect(result.data.capabilityMatches[0].capabilityId).toBe("cap-1");
    expect(
      result.data.capabilityMatches.find((m) => m.capabilityId === "ghost-id")
    ).toBeUndefined();
  });

  test("drops benefitMatches with IDs not in sectorBenefits", async () => {
    mockCreate.mockResolvedValueOnce(
      mockAnthropicResponse({
        benefitMatches: [
          { benefitId: "ben-1", toelichting: "NPS effect" },
          { benefitId: "ben-ghost", toelichting: "AI hallucinatie" },
        ],
        capabilityMatches: [
          { capabilityId: "cap-1", toelichting: "primaire capability" },
        ],
        splitEfforts: [
          {
            title: "Training uitrollen",
            description: "Outside-in training",
            domain: "mens",
            status: "in_uitvoering",
            quarter: "Q2 2026",
            responsibleSector: "PO",
            rationale: "kern",
          },
        ],
        findings: [],
        samenvatting: "ok",
      })
    );

    const result = await promoteExternalProject(
      project,
      sectorBenefits,
      sectorCapabilities,
      sectorName,
      {}
    );

    expect(result.success).toBe(true);
    if (!result.success) return;
    expect(result.data.benefitMatches).toHaveLength(1);
    expect(result.data.benefitMatches[0].benefitId).toBe("ben-1");
  });
});

describe("promoteExternalProject — failure propagation", () => {
  beforeEach(() => {
    mockCreate.mockReset();
  });

  test("propagates upstream failure when AI returns malformed JSON on all retries", async () => {
    // callClaudeWithValidation retries 2x (3 attempts total) — all return garbage
    mockCreate.mockResolvedValue({
      content: [{ type: "text", text: "niet valide json output" }],
    });

    const result = await promoteExternalProject(
      project,
      sectorBenefits,
      sectorCapabilities,
      sectorName,
      {}
    );

    expect(result.success).toBe(false);
    if (result.success) return;
    expect(typeof result.error).toBe("string");
    expect(result.error.length).toBeGreaterThan(0);
  });

  test("propagates upstream failure when schema validation fails (missing capabilityMatches)", async () => {
    mockCreate.mockResolvedValue(
      mockAnthropicResponse({
        benefitMatches: [],
        // capabilityMatches omitted -> schema has .min(1) so this fails
        capabilityMatches: [],
        splitEfforts: [
          {
            title: "Foo",
            description: "Bar",
            domain: "mens",
            status: "in_uitvoering",
          },
        ],
        findings: [],
        samenvatting: "x",
      })
    );

    const result = await promoteExternalProject(
      project,
      sectorBenefits,
      sectorCapabilities,
      sectorName,
      {}
    );

    expect(result.success).toBe(false);
  });
});

describe("promoteExternalProject — valid result passthrough", () => {
  beforeEach(() => {
    mockCreate.mockReset();
  });

  test("passes through result when all IDs are valid", async () => {
    const validPayload = {
      benefitMatches: [
        { benefitId: "ben-1", toelichting: "Klanttevredenheid verbetert" },
      ],
      capabilityMatches: [
        { capabilityId: "cap-1", toelichting: "kernvermogen" },
        { capabilityId: "cap-2", toelichting: "ondersteunend" },
      ],
      splitEfforts: [
        {
          title: "Training uitrollen",
          description: "Alle docenten trainen in outside-in",
          domain: "mens",
          status: "in_uitvoering",
          quarter: "Q2 2026",
          responsibleSector: "PO",
          dossier: {
            eigenaar: "HRD",
            inspanningsleider: "Opleidingscoord",
            verwachtResultaat: "100% geschoold",
            kostenraming: "150k",
            randvoorwaarden: "Budget beschikbaar",
          },
          rationale: "Primaire training-inspanning",
        },
        {
          title: "Feedbackloop opzetten",
          description: "Maandelijkse gesprekken-review",
          domain: "processen",
          status: "in_uitvoering",
          quarter: "Q3 2026",
          responsibleSector: "PO",
          rationale: "Continuiteit borgen",
        },
      ],
      findings: [
        {
          type: "vermogen",
          beschrijving: "Kwaliteits-audit vermogen ontbreekt",
          toelichting: "Zonder audit kan effect niet gemeten worden",
          targetSector: "PO",
        },
      ],
      samenvatting:
        "Outside-in training vertaalt naar twee inspanningen in mens+processen.",
    };

    mockCreate.mockResolvedValueOnce(mockAnthropicResponse(validPayload));

    const result = await promoteExternalProject(
      project,
      sectorBenefits,
      sectorCapabilities,
      sectorName,
      {}
    );

    expect(result.success).toBe(true);
    if (!result.success) return;

    expect(result.data.benefitMatches).toHaveLength(1);
    expect(result.data.capabilityMatches).toHaveLength(2);
    expect(result.data.splitEfforts).toHaveLength(2);
    expect(result.data.findings).toHaveLength(1);
    expect(result.data.samenvatting).toContain("Outside-in");

    // Exactly 1 API call because first attempt is valid
    expect(mockCreate).toHaveBeenCalledTimes(1);
  });
});
