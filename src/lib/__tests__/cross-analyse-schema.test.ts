import { describe, test, expect } from "vitest";
import {
  AICrossAnalyseSchema,
  DINCapabilitySchema,
  DINEffortSchema,
} from "@/lib/schemas";

// ============================================================
// Cross-analyse schema backward compatibility
// ============================================================

describe("AICrossAnalyseSchema backward compatibility", () => {
  test("Test 1: parse existing valid data without new fields succeeds", () => {
    const existingData = {
      synergie: {
        titel: "Synergieën",
        toelichting: "Toelichting",
        items: [
          { vermogen: "Gedeeld vermogen", sectoren: ["PO", "VO"], impact: "Groot effect" },
        ],
      },
      gaps: {
        titel: "Gap-analyse",
        toelichting: "Toelichting",
        doelenZonderBaten: ["Doel X"],
        batenZonderVermogens: [],
        vermogensZonderInspanningen: [],
      },
      hefboomwerking: {
        titel: "Hefboomwerking",
        toelichting: "Toelichting",
        items: [
          { inspanning: "Training", bijdraagtAan: ["Baat A"], prioriteit: "hoog" },
        ],
      },
      domeinBalans: {
        titel: "Domeinbalans",
        toelichting: "Toelichting",
        domeinen: [
          { domein: "Mens", beoordeling: "voldoende", advies: "Geen actie" },
        ],
      },
      sectorOverlap: {
        titel: "Sector-overlap",
        toelichting: "Toelichting",
        items: [
          { beschrijving: "Overlap", sectoren: ["PO", "VO"], advies: "Combineren" },
        ],
      },
      externeProjecten: {
        titel: "Externe projecten",
        toelichting: "Toelichting",
        items: [
          { project: "Project X", overlapMet: "Inspanning Y", advies: "Synergie benutten" },
        ],
      },
    };

    const result = AICrossAnalyseSchema.safeParse(existingData);
    expect(result.success).toBe(true);
    if (result.success) {
      // New fields should get default values
      expect(result.data.vermogenClusters).toBeDefined();
      expect(result.data.vermogenClusters.items).toEqual([]);
      expect(result.data.inspanningClusters).toBeDefined();
      expect(result.data.inspanningClusters.items).toEqual([]);
      expect(result.data.projectMatching).toBeDefined();
      expect(result.data.projectMatching.items).toEqual([]);
    }
  });
});

// ============================================================
// New cluster schemas
// ============================================================

describe("AICrossAnalyseSchema new cluster fields", () => {
  test("Test 2: parse with vermogenClusters array succeeds", () => {
    const data = {
      vermogenClusters: {
        titel: "Gedeelde vermogens",
        toelichting: "Vermogens die over sectoren terugkomen",
        items: [
          {
            clusterTitel: "Klantgerichtheid",
            items: [
              { id: "cap-1", beschrijving: "Klantgesprek-methodiek", sector: "PO" },
              { id: "cap-2", beschrijving: "Outside-in werken", sector: "VO" },
            ],
            batenContext: [
              { baat: "Hogere klanttevredenheid", sector: "PO" },
            ],
            advies: "Combineer tot een organisatiebreed vermogen",
            aanbeveling: "combineren" as const,
          },
        ],
      },
    };

    const result = AICrossAnalyseSchema.safeParse(data);
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.vermogenClusters.items).toHaveLength(1);
      expect(result.data.vermogenClusters.items[0].clusterTitel).toBe("Klantgerichtheid");
      expect(result.data.vermogenClusters.items[0].items).toHaveLength(2);
    }
  });

  test("Test 3: parse with inspanningClusters array succeeds", () => {
    const data = {
      inspanningClusters: {
        titel: "Gedeelde inspanningen",
        toelichting: "Inspanningen die over sectoren terugkomen",
        items: [
          {
            clusterTitel: "Training outside-in",
            items: [
              { id: "eff-1", beschrijving: "Training PO", sector: "PO", domein: "mens" },
              { id: "eff-2", beschrijving: "Training VO", sector: "VO", domein: "mens" },
            ],
            batenContext: [
              { baat: "Hogere NPS", sector: "PO" },
            ],
            advies: "Combineer tot een gezamenlijke training",
            aanbeveling: "combineren" as const,
          },
        ],
      },
    };

    const result = AICrossAnalyseSchema.safeParse(data);
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.inspanningClusters.items).toHaveLength(1);
      expect(result.data.inspanningClusters.items[0].items[0].domein).toBe("mens");
    }
  });

  test("Test 4: parse with projectMatching array succeeds", () => {
    const data = {
      projectMatching: {
        titel: "Projectkoppeling",
        toelichting: "Koppeling tussen lopende projecten en DIN",
        items: [
          {
            project: "CRM Implementatie",
            heeftMatch: true,
            gekoppeldAan: "Klantdata-infrastructuur",
            type: "vermogen",
            advies: "Direct koppelen aan vermogen klantdata",
          },
          {
            project: "Oud systeem X",
            heeftMatch: false,
            advies: "Past niet in het DIN-netwerk",
          },
        ],
      },
    };

    const result = AICrossAnalyseSchema.safeParse(data);
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.projectMatching.items).toHaveLength(2);
      expect(result.data.projectMatching.items[0].heeftMatch).toBe(true);
      expect(result.data.projectMatching.items[0].gekoppeldAan).toBe("Klantdata-infrastructuur");
      expect(result.data.projectMatching.items[1].heeftMatch).toBe(false);
      expect(result.data.projectMatching.items[1].gekoppeldAan).toBeUndefined();
    }
  });
});

// ============================================================
// Cluster item schemas
// ============================================================

describe("Cluster item schema validation", () => {
  // We import these dynamically to test them directly
  test("Test 5: VermogenClusterItemSchema validates cluster with id, beschrijving, sector, batenContext, advies, aanbeveling", async () => {
    const { VermogenClusterItemSchema } = await import("@/lib/schemas");

    const result = VermogenClusterItemSchema.safeParse({
      clusterTitel: "Datagedreven werken",
      items: [
        { id: "cap-abc", beschrijving: "Data-analyse competentie", sector: "PO" },
        { id: "cap-def", beschrijving: "BI-dashboards beheersen", sector: "VO" },
      ],
      batenContext: [
        { baat: "Betere stuurinformatie", sector: "PO" },
        { baat: "Snellere rapportage", sector: "VO" },
      ],
      advies: "Combineer tot een organisatiebreed data-literacy programma",
      aanbeveling: "combineren",
    });
    expect(result.success).toBe(true);
  });

  test("Test 6: InspanningClusterItemSchema validates cluster with id, beschrijving, sector, domein, batenContext, advies, aanbeveling", async () => {
    const { InspanningClusterItemSchema } = await import("@/lib/schemas");

    const result = InspanningClusterItemSchema.safeParse({
      clusterTitel: "Procesinrichting klantcontact",
      items: [
        { id: "eff-abc", beschrijving: "Klantcontact proces PO", sector: "PO", domein: "processen" },
        { id: "eff-def", beschrijving: "Klantcontact proces VO", sector: "VO", domein: "processen" },
      ],
      batenContext: [
        { baat: "Kortere doorlooptijd", sector: "PO" },
      ],
      advies: "Stem processen af maar houd sectorspecifieke variaties",
      aanbeveling: "afstemmen",
    });
    expect(result.success).toBe(true);
  });

  test("Test 7: ProjectMatchItemSchema validates project with heeftMatch boolean, optional gekoppeldAan, advies", async () => {
    const { ProjectMatchItemSchema } = await import("@/lib/schemas");

    const matchResult = ProjectMatchItemSchema.safeParse({
      project: "CRM Project",
      heeftMatch: true,
      gekoppeldAan: "Klantdata vermogen",
      type: "vermogen",
      advies: "Koppel aan DIN-vermogen",
    });
    expect(matchResult.success).toBe(true);

    const noMatchResult = ProjectMatchItemSchema.safeParse({
      project: "Legacy systeem",
      heeftMatch: false,
      advies: "Niet relevant voor DIN",
    });
    expect(noMatchResult.success).toBe(true);
    if (noMatchResult.success) {
      expect(noMatchResult.data.gekoppeldAan).toBeUndefined();
    }
  });
});

// ============================================================
// Consolidation flags on entity schemas
// ============================================================

describe("Consolidation flags on entity schemas", () => {
  test("Test 8: DINCapabilitySchema parse without consolidated succeeds (backward compat)", () => {
    const result = DINCapabilitySchema.safeParse({
      id: "c1",
      sectorId: "VO",
      description: "Vermogen beschrijving",
      relatedSectors: ["PO", "VO"],
    });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.consolidated).toBeUndefined();
      expect(result.data.consolidatedInto).toBeUndefined();
    }
  });

  test("Test 9: DINCapabilitySchema parse with consolidated: true, consolidatedInto succeeds", () => {
    const result = DINCapabilitySchema.safeParse({
      id: "c1",
      sectorId: "VO",
      description: "Vermogen beschrijving",
      relatedSectors: ["PO", "VO"],
      consolidated: true,
      consolidatedInto: "c-master-123",
    });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.consolidated).toBe(true);
      expect(result.data.consolidatedInto).toBe("c-master-123");
    }
  });

  test("Test 10: DINEffortSchema parse with consolidated: true, consolidatedInto succeeds", () => {
    const result = DINEffortSchema.safeParse({
      id: "e1",
      sectorId: "PO",
      description: "Inspanning beschrijving",
      domain: "mens",
      status: "gepland",
      dependencies: [],
      consolidated: true,
      consolidatedInto: "e-master-456",
    });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.consolidated).toBe(true);
      expect(result.data.consolidatedInto).toBe("e-master-456");
    }
  });
});
