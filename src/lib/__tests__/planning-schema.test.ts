import { describe, test, expect } from "vitest";
import { PlanningVoorstelSchema, BundelPlanningSchema } from "@/lib/schemas";

describe("BundelPlanningSchema", () => {
  test("accepteert compleet bundel-object", () => {
    const result = BundelPlanningSchema.safeParse({
      bundelId: "auto-groep-focus:cultuur",
      domein: "cultuur",
      titel: "Cross-sectorale cultuurverandering outside-in",
      startKwartaal: "Q2 2026",
      eindKwartaal: "Q4 2026",
      cyclusLabel: "Cyclus 1",
      beargumentatie: "Cultuur is het fundament — start direct.",
      afhankelijkVan: [],
      mijlpalen: [
        { periode: "Q2-Q3 2026", mijlpaal: "Eerste gesprekken in 3 sectoren" },
      ],
      risico: "Verloop bij kerngroep.",
    });
    expect(result.success).toBe(true);
  });

  test("afhankelijkVan en mijlpalen krijgen default lege array", () => {
    const result = BundelPlanningSchema.safeParse({
      bundelId: "g1:mens",
      domein: "mens",
      titel: "x",
      startKwartaal: "Q2 2026",
      eindKwartaal: "Q4 2026",
      cyclusLabel: "Cyclus 1",
      beargumentatie: "y",
    });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.afhankelijkVan).toEqual([]);
      expect(result.data.mijlpalen).toEqual([]);
    }
  });

  test("weigert onbekend domein", () => {
    const result = BundelPlanningSchema.safeParse({
      bundelId: "g1:xxx",
      domein: "xxx",
      titel: "x",
      startKwartaal: "Q2 2026",
      eindKwartaal: "Q4 2026",
      cyclusLabel: "Cyclus 1",
      beargumentatie: "y",
    });
    expect(result.success).toBe(false);
  });
});

describe("PlanningVoorstelSchema", () => {
  test("accepteert compleet AI-voorstel met 4 bundels over 2 cycli", () => {
    const result = PlanningVoorstelSchema.safeParse({
      bundelPlanning: [
        {
          bundelId: "g1:cultuur",
          domein: "cultuur",
          titel: "Cultuur outside-in",
          startKwartaal: "Q2 2026",
          eindKwartaal: "Q4 2026",
          cyclusLabel: "Cyclus 1",
          beargumentatie: "Fundament eerst.",
          mijlpalen: [{ periode: "Q2-Q3 2026", mijlpaal: "Pilot PO" }],
        },
        {
          bundelId: "g1:mens",
          domein: "mens",
          titel: "Mens competenties",
          startKwartaal: "Q3 2026",
          eindKwartaal: "Q1 2027",
          cyclusLabel: "Cyclus 1",
          beargumentatie: "Parallel met cultuur.",
        },
        {
          bundelId: "g1:data_systemen",
          domein: "data_systemen",
          titel: "Data & Systemen uitrol",
          startKwartaal: "Q4 2026",
          eindKwartaal: "Q2 2027",
          cyclusLabel: "Cyclus 2",
          beargumentatie: "Volgt op mens.",
        },
        {
          bundelId: "g1:processen",
          domein: "processen",
          titel: "Processen standaardiseren",
          startKwartaal: "Q1 2027",
          eindKwartaal: "Q3 2027",
          cyclusLabel: "Cyclus 2",
          beargumentatie: "Borgt wat mens+data hebben opgebouwd.",
        },
      ],
      samenvatting:
        "Outside-in: cyclus 1 cultuur+mens parallel, cyclus 2 data+processen. Totaal 4 kwartalen doorlooptijd per bundel.",
    });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.bundelPlanning).toHaveLength(4);
      const cycli = new Set(result.data.bundelPlanning.map((b) => b.cyclusLabel));
      expect(cycli.size).toBe(2);
    }
  });

  test("accepteert minimaal voorstel (alleen samenvatting)", () => {
    const result = PlanningVoorstelSchema.safeParse({
      samenvatting: "Geen planning mogelijk — onvoldoende input.",
    });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.bundelPlanning).toEqual([]);
    }
  });

  test("weigert ontbrekende samenvatting", () => {
    const result = PlanningVoorstelSchema.safeParse({
      bundelPlanning: [],
    });
    expect(result.success).toBe(false);
  });

  test("bewaart gegenereerdOp-timestamp wanneer aanwezig", () => {
    const result = PlanningVoorstelSchema.safeParse({
      samenvatting: "x",
      gegenereerdOp: "2026-04-22T10:15:00.000Z",
    });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.gegenereerdOp).toBe("2026-04-22T10:15:00.000Z");
    }
  });

  test("toelichting veld wordt behouden en krijgt default lege string", () => {
    const r1 = PlanningVoorstelSchema.safeParse({ samenvatting: "x" });
    expect(r1.success).toBe(true);
    if (r1.success) expect(r1.data.toelichting).toBe("");

    const r2 = PlanningVoorstelSchema.safeParse({
      samenvatting: "x",
      toelichting: "Eigen notities van de programmamanager.",
    });
    expect(r2.success).toBe(true);
    if (r2.success) expect(r2.data.toelichting).toBe("Eigen notities van de programmamanager.");
  });
});
