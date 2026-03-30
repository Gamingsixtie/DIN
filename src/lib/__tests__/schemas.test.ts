import { describe, test, expect } from "vitest";
import {
  EffortDomainSchema,
  DINBenefitSchema,
  DINCapabilitySchema,
  DINEffortSchema,
  DINSessionSchema,
  AIDINMappingResponseSchema,
  AIBenefitSchema,
  KiBExportSchema,
} from "@/lib/schemas";

// ============================================================
// Schema structure tests
// ============================================================

describe("schema structure", () => {
  test("DINBenefitSchema.safeParse met compleet object -> success: true", () => {
    const result = DINBenefitSchema.safeParse({
      id: "b1",
      goalId: "g1",
      sectorId: "PO",
      title: "Hogere klanttevredenheid",
      description: "NPS stijgt van 32 naar 45",
      profiel: {
        bateneigenaar: "Sectormanager PO",
        indicator: "NPS",
        indicatorOwner: "BI-specialist",
        currentValue: "32",
        targetValue: "45",
        meetmethode: "Enquete",
        measurementMoment: "Q4 2026",
      },
    });
    expect(result.success).toBe(true);
  });

  test("DINBenefitSchema.safeParse met ontbrekend description veld -> success: false", () => {
    const result = DINBenefitSchema.safeParse({
      id: "b1",
      goalId: "g1",
      sectorId: "PO",
      title: "Test",
      profiel: {
        indicator: "NPS",
        indicatorOwner: "BI",
        currentValue: "0",
        targetValue: "10",
      },
    });
    expect(result.success).toBe(false);
  });

  test("EffortDomainSchema.safeParse('mens') -> success: true, data: 'mens'", () => {
    const result = EffortDomainSchema.safeParse("mens");
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data).toBe("mens");
    }
  });

  test("EffortDomainSchema.safeParse('onbekend') -> success: false", () => {
    const result = EffortDomainSchema.safeParse("onbekend");
    expect(result.success).toBe(false);
  });

  test("DINBenefitSchema.safeParse met ontbrekend optioneel title veld -> success: true, title krijgt default ''", () => {
    const result = DINBenefitSchema.safeParse({
      id: "b1",
      goalId: "g1",
      sectorId: "PO",
      description: "Beschrijving",
      profiel: {
        indicator: "NPS",
        indicatorOwner: "BI",
        currentValue: "0",
        targetValue: "10",
      },
    });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.title).toBe("");
    }
  });
});

// ============================================================
// AI Response schema tests
// ============================================================

describe("AI response schemas", () => {
  test("AIDINMappingResponseSchema.safeParse met array van benefits/capabilities/efforts -> success: true", () => {
    const result = AIDINMappingResponseSchema.safeParse({
      benefits: [
        {
          title: "Hogere NPS",
          description: "Klanttevredenheid stijgt",
          profiel: {
            indicator: "NPS",
            indicatorOwner: "BI",
            currentValue: "32",
            targetValue: "45",
          },
        },
      ],
      capabilities: [
        {
          title: "Klantgesprek-methodiek",
          description: "Medewerkers beheersen outside-in methodiek",
        },
      ],
      efforts: [
        {
          title: "Training outside-in",
          description: "Training voor alle medewerkers",
          domain: "mens",
        },
      ],
    });
    expect(result.success).toBe(true);
  });

  test("AIDINMappingResponseSchema.safeParse met lege arrays -> success: true", () => {
    const result = AIDINMappingResponseSchema.safeParse({
      benefits: [],
      capabilities: [],
      efforts: [],
    });
    expect(result.success).toBe(true);
  });

  test("AIBenefitSchema.safeParse ZONDER id/goalId/sectorId -> success: true", () => {
    const result = AIBenefitSchema.safeParse({
      title: "Hogere NPS",
      description: "Klanttevredenheid stijgt",
      profiel: {
        indicator: "NPS",
        indicatorOwner: "BI",
        currentValue: "32",
        targetValue: "45",
      },
    });
    expect(result.success).toBe(true);
    // Verify no id/goalId/sectorId in the output
    if (result.success) {
      expect("id" in result.data).toBe(false);
      expect("goalId" in result.data).toBe(false);
      expect("sectorId" in result.data).toBe(false);
    }
  });
});

// ============================================================
// Legacy data tests
// ============================================================

describe("legacy data defaults", () => {
  test("DINBenefitSchema.safeParse met ontbrekend profiel.meetmethode -> success: true, krijgt default ''", () => {
    const result = DINBenefitSchema.safeParse({
      id: "b1",
      goalId: "g1",
      sectorId: "PO",
      description: "Test",
      profiel: {
        indicator: "NPS",
        indicatorOwner: "BI",
        currentValue: "0",
        targetValue: "10",
      },
    });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.profiel.meetmethode).toBe("");
    }
  });

  test("DINCapabilitySchema.safeParse met ontbrekend profiel -> success: true, profiel is undefined", () => {
    const result = DINCapabilitySchema.safeParse({
      id: "c1",
      sectorId: "VO",
      description: "Vermogen beschrijving",
      relatedSectors: ["PO", "VO"],
    });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.profiel).toBeUndefined();
    }
  });

  test("DINSessionSchema.safeParse met ontbrekend crossAnalyse -> success: true, veld is undefined", () => {
    const result = DINSessionSchema.safeParse({
      id: "s1",
      name: "Test sessie",
      createdAt: "2026-01-01T00:00:00Z",
      updatedAt: "2026-01-01T00:00:00Z",
      currentStep: 0,
      goals: [],
      sectorPlans: [],
      pmcEntries: [],
      benefits: [],
      capabilities: [],
      efforts: [],
    });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.crossAnalyse).toBeUndefined();
    }
  });

  test("DINSessionSchema.safeParse met ontbrekende mapping-arrays -> success: true, krijgen default []", () => {
    const result = DINSessionSchema.safeParse({
      id: "s1",
      name: "Test sessie",
      createdAt: "2026-01-01T00:00:00Z",
      updatedAt: "2026-01-01T00:00:00Z",
      currentStep: 0,
      goals: [],
      sectorPlans: [],
      pmcEntries: [],
      benefits: [],
      capabilities: [],
      efforts: [],
    });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.goalBenefitMaps).toEqual([]);
      expect(result.data.benefitCapabilityMaps).toEqual([]);
      expect(result.data.capabilityEffortMaps).toEqual([]);
    }
  });
});

// ============================================================
// KiB Import schema tests
// ============================================================

describe("KiB import schema", () => {
  test("KiBExportSchema.safeParse met compleet object -> success: true", () => {
    const result = KiBExportSchema.safeParse({
      visie: {
        uitgebreid: "Lange visie tekst",
        beknopt: "Korte visie",
      },
      doelen: [
        { naam: "Doel 1", beschrijving: "Beschrijving", rang: 1 },
      ],
      scope: {
        binnen: ["Item 1"],
        buiten: ["Item 2"],
      },
      sessionId: "abc-123",
    });
    expect(result.success).toBe(true);
  });

  test("KiBExportSchema.safeParse met lege doelen -> success: true, krijgt default []", () => {
    const result = KiBExportSchema.safeParse({});
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.doelen).toEqual([]);
    }
  });
});

// ============================================================
// DINEffort schema tests
// ============================================================

describe("DINEffort schema", () => {
  test("DINEffortSchema.safeParse met compleet object -> success: true", () => {
    const result = DINEffortSchema.safeParse({
      id: "e1",
      sectorId: "PO",
      title: "Training outside-in",
      description: "Training voor medewerkers",
      domain: "mens",
      status: "gepland",
      dependencies: [],
    });
    expect(result.success).toBe(true);
  });

  test("DINEffortSchema.safeParse met ongeldig domain -> success: false", () => {
    const result = DINEffortSchema.safeParse({
      id: "e1",
      sectorId: "PO",
      description: "Test",
      domain: "ongeldig",
      status: "gepland",
      dependencies: [],
    });
    expect(result.success).toBe(false);
  });
});
