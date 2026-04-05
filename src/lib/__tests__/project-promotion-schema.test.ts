// Phase 14 - Tests for ProjectPromotieResultSchema family
// Validates: benefitMatches, capabilityMatches, splitEfforts (min 1 / max 4),
// findings type enum, default status in_uitvoering (D-05, D-07, D-14)
import { describe, it, expect } from "vitest";
import { ProjectPromotieResultSchema } from "@/lib/schemas";

describe("ProjectPromotieResultSchema", () => {
  const valid = {
    benefitMatches: [{ benefitId: "b1", toelichting: "raakt NPS" }],
    capabilityMatches: [
      { capabilityId: "c1", toelichting: "bouwt klantgesprek-vermogen op" },
    ],
    splitEfforts: [
      {
        title: "Training Q1",
        description: "Bouw competentie",
        domain: "mens" as const,
        status: "in_uitvoering" as const,
        quarter: "Q1 2026",
        dossier: {
          eigenaar: "Sectormanager",
          inspanningsleider: "HR-lead",
          verwachtResultaat: "80% medewerkers getraind",
          kostenraming: "€50k",
          randvoorwaarden: "Zaal beschikbaar",
        },
        rationale: "Project valt methodisch onder mens-domein",
      },
    ],
    findings: [
      {
        type: "vermogen" as const,
        beschrijving: "Meten van klantreis-kwaliteit",
        toelichting: "Project impliceert dit maar voert het niet uit",
        targetSector: "PO" as const,
      },
    ],
    samenvatting: "Project gepromoveerd tot 1 mens-inspanning.",
  };

  it("accepts full valid response", () => {
    const result = ProjectPromotieResultSchema.safeParse(valid);
    expect(result.success).toBe(true);
  });

  it("rejects 0 split efforts (D-05 min 1)", () => {
    const result = ProjectPromotieResultSchema.safeParse({
      ...valid,
      splitEfforts: [],
    });
    expect(result.success).toBe(false);
  });

  it("rejects 5 split efforts (D-05 max 4)", () => {
    const result = ProjectPromotieResultSchema.safeParse({
      ...valid,
      splitEfforts: Array(5).fill(valid.splitEfforts[0]),
    });
    expect(result.success).toBe(false);
  });

  it("rejects 0 capability matches (project must land in keten)", () => {
    const result = ProjectPromotieResultSchema.safeParse({
      ...valid,
      capabilityMatches: [],
    });
    expect(result.success).toBe(false);
  });

  it("accepts empty benefitMatches and findings", () => {
    const result = ProjectPromotieResultSchema.safeParse({
      ...valid,
      benefitMatches: [],
      findings: [],
    });
    expect(result.success).toBe(true);
  });

  it("defaults status to in_uitvoering on split effort (D-07)", () => {
    const { status: _status, ...effortWithoutStatus } = valid.splitEfforts[0];
    void _status;
    const result = ProjectPromotieResultSchema.safeParse({
      ...valid,
      splitEfforts: [effortWithoutStatus],
    });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.splitEfforts[0].status).toBe("in_uitvoering");
    }
  });

  it("rejects finding with invalid type (D-14 enum)", () => {
    const result = ProjectPromotieResultSchema.safeParse({
      ...valid,
      findings: [{ ...valid.findings[0], type: "risico" }],
    });
    expect(result.success).toBe(false);
  });
});
