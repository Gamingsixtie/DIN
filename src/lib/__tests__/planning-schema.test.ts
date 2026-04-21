import { describe, test, expect } from "vitest";
import { PlanningVoorstelSchema } from "@/lib/schemas";

describe("PlanningVoorstelSchema", () => {
  test("accepteert compleet AI-voorstel", () => {
    const result = PlanningVoorstelSchema.safeParse({
      inspanningPlanning: [
        {
          inspanningId: "e1",
          voorgesteldKwartaal: "Q2 2026",
          beargumentatie: "Hefboom-inspanning uit subEffortAnalysis — vroeg plaatsen.",
          afhankelijkVan: [],
        },
        {
          inspanningId: "e2",
          voorgesteldKwartaal: "Q3 2026",
          beargumentatie: "Volgt op e1 (training-fundament).",
          afhankelijkVan: ["e1"],
        },
      ],
      clusterFasering: [
        {
          clusterTitel: "Cross-sectorale klantgesprek-methodiek",
          domein: "mens",
          fases: [
            { periode: "Q2-Q3 2026", mijlpaal: "Eerste pilot PO afgerond" },
            { periode: "Q4 2026 - Q1 2027", mijlpaal: "Uitrol naar VO en Zakelijk" },
          ],
          risico: "Afhankelijk van beschikbare trainers.",
        },
      ],
      samenvatting: "Roadmap start met cross-sectorale fundamenten in Q2-Q3, uitrol volgt in Q4.",
    });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.inspanningPlanning).toHaveLength(2);
      expect(result.data.clusterFasering).toHaveLength(1);
    }
  });

  test("accepteert minimaal voorstel (lege arrays, alleen samenvatting)", () => {
    const result = PlanningVoorstelSchema.safeParse({
      samenvatting: "Geen planning mogelijk — onvoldoende input.",
    });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.inspanningPlanning).toEqual([]);
      expect(result.data.clusterFasering).toEqual([]);
    }
  });

  test("afhankelijkVan krijgt default lege array wanneer ontbreekt", () => {
    const result = PlanningVoorstelSchema.safeParse({
      inspanningPlanning: [
        {
          inspanningId: "e1",
          voorgesteldKwartaal: "Q2 2026",
          beargumentatie: "Fundament.",
        },
      ],
      samenvatting: "x",
    });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.inspanningPlanning[0].afhankelijkVan).toEqual([]);
    }
  });

  test("weigert onbekend domein in clusterFasering", () => {
    const result = PlanningVoorstelSchema.safeParse({
      clusterFasering: [
        {
          clusterTitel: "x",
          domein: "onbekend",
          fases: [],
        },
      ],
      samenvatting: "x",
    });
    expect(result.success).toBe(false);
  });

  test("weigert ontbrekende samenvatting", () => {
    const result = PlanningVoorstelSchema.safeParse({
      inspanningPlanning: [],
      clusterFasering: [],
    });
    expect(result.success).toBe(false);
  });

  test("fases krijgt default lege array wanneer ontbreekt", () => {
    const result = PlanningVoorstelSchema.safeParse({
      clusterFasering: [
        {
          clusterTitel: "Geen fases",
          domein: "cultuur",
        },
      ],
      samenvatting: "x",
    });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.clusterFasering[0].fases).toEqual([]);
    }
  });
});
