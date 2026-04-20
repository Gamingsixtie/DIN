import { describe, test, expect } from "vitest";
import {
  AICrossAnalyseSchema,
  DINCapabilitySchema,
  DINEffortSchema,
  Stap2ResultSchema,
  Stap4ResultSchema,
  VermogenClusterItemSchema,
  VermogenGelijkenisGroepSchema,
  SubEffortAdviesSchema,
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

// ============================================================
// Phase 17 — VermogenGelijkenisGroep (D-26)
// ============================================================

describe("VermogenGelijkenisGroepSchema (D-26)", () => {
  test("gelijkenis groep accepteert valide input met drie sectoren", () => {
    const result = VermogenGelijkenisGroepSchema.safeParse({
      id: "g1",
      vermogenIds: ["cap-po-1", "cap-vo-1", "cap-zak-1"],
      gezamenlijkeOmschrijving: "Medewerker-wendbaarheid",
      reden: "Alle drie sectoren vereisen adaptief vermogen bij digitalisering",
    });
    expect(result.success).toBe(true);
  });
  test("gelijkenis groep faalt bij lege vermogenIds", () => {
    const result = VermogenGelijkenisGroepSchema.safeParse({
      id: "g1",
      vermogenIds: [],
      gezamenlijkeOmschrijving: "x",
      reden: "y",
    });
    expect(result.success).toBe(false);
  });
});

describe("Stap2ResultSchema backward compat (D-30)", () => {
  test("backward compat — parse zonder vermogenGelijkenisGroepen defaultet naar []", () => {
    const result = Stap2ResultSchema.safeParse({
      vermogenClusters: [],
      hefboomwerking: [],
      samenvatting: "x",
    });
    expect(result.success).toBe(true);
    if (result.success) expect(result.data.vermogenGelijkenisGroepen).toEqual([]);
  });
  test("accepteert vermogenGelijkenisGroepen wanneer aanwezig", () => {
    const result = Stap2ResultSchema.safeParse({
      vermogenClusters: [],
      hefboomwerking: [],
      samenvatting: "x",
      vermogenGelijkenisGroepen: [
        { id: "g1", vermogenIds: ["c1"], gezamenlijkeOmschrijving: "a", reden: "b" },
      ],
    });
    expect(result.success).toBe(true);
    if (result.success) expect(result.data.vermogenGelijkenisGroepen).toHaveLength(1);
  });
});

describe("VermogenClusterItemSchema markeer_gelijkenis enum (D-30)", () => {
  test("markeer_gelijkenis aanbeveling accepteert", () => {
    const result = VermogenClusterItemSchema.safeParse({
      clusterTitel: "x",
      items: [],
      batenContext: [],
      advies: "y",
      aanbeveling: "markeer_gelijkenis",
    });
    expect(result.success).toBe(true);
  });
  test("bestaande enum-waardes blijven werken", () => {
    for (const av of ["combineren", "afstemmen", "apart_houden"] as const) {
      const result = VermogenClusterItemSchema.safeParse({
        clusterTitel: "x",
        items: [],
        batenContext: [],
        advies: "y",
        aanbeveling: av,
      });
      expect(result.success).toBe(true);
    }
  });
});

describe("SubEffortAdviesSchema (D-30)", () => {
  test("sub effort advies accepteert valide input met voorgesteldeNaam string", () => {
    const result = SubEffortAdviesSchema.safeParse({
      groepId: "g1",
      domein: "mens",
      actie: "combineren",
      items: ["eff-1", "eff-2"],
      reden: "gedeelde training",
      voorgesteldeNaam: "Sector-overstijgende training",
    });
    expect(result.success).toBe(true);
  });
  test("sub effort advies accepteert voorgesteldeNaam null", () => {
    const result = SubEffortAdviesSchema.safeParse({
      groepId: "g1",
      domein: "processen",
      actie: "apart_houden",
      items: ["eff-1"],
      reden: "verschillende contexten",
      voorgesteldeNaam: null,
    });
    expect(result.success).toBe(true);
  });
  test("sub effort advies faalt bij ongeldig domein", () => {
    const result = SubEffortAdviesSchema.safeParse({
      groepId: "g1",
      domein: "financien",
      actie: "combineren",
      items: [],
      reden: "x",
      voorgesteldeNaam: null,
    });
    expect(result.success).toBe(false);
  });
});

describe("Stap4ResultSchema backward compat (D-19, D-30)", () => {
  test("backward compat — parse zonder subEffortAnalysis defaultet naar []", () => {
    const result = Stap4ResultSchema.safeParse({
      consolidatieAdvies: [],
      citobreedInzicht: [],
      samenvatting: "x",
    });
    expect(result.success).toBe(true);
    if (result.success) expect(result.data.subEffortAnalysis).toEqual([]);
  });
  test("accepteert context op consolidatieAdvies items", () => {
    const result = Stap4ResultSchema.safeParse({
      consolidatieAdvies: [
        {
          clusterTitel: "x",
          type: "inspanning",
          aanbeveling: "combineren",
          reden: "y",
          context: "User wil focus op data-domein",
        },
      ],
      citobreedInzicht: [],
      samenvatting: "z",
    });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.consolidatieAdvies[0].context).toBe("User wil focus op data-domein");
    }
  });
  test("accepteert subEffortAnalysis wanneer aanwezig", () => {
    const result = Stap4ResultSchema.safeParse({
      consolidatieAdvies: [],
      citobreedInzicht: [],
      samenvatting: "x",
      subEffortAnalysis: [
        {
          groepId: "g1",
          domein: "mens",
          actie: "apart_houden",
          items: ["e1"],
          reden: "verschilt",
          voorgesteldeNaam: null,
        },
      ],
    });
    expect(result.success).toBe(true);
    if (result.success) expect(result.data.subEffortAnalysis).toHaveLength(1);
  });
});

// ============================================================
// Phase 17 — Integratie-casus: volledige stap 4 response shape (D-30)
// Verifieer dat de AI-gegenereerde response shape (met subEffortAnalysis
// en consolidatieAdvies[].context) via Stap4ResultSchema parseerbaar is.
// ============================================================

describe("Stap4ResultSchema sub effort advies integration (D-30)", () => {
  test("volledig stap 4 response met subEffortAnalysis parseert succesvol", () => {
    const mockResponse = {
      consolidatieAdvies: [
        {
          clusterTitel: "Medewerkerstraining cluster",
          type: "inspanning" as const,
          aanbeveling: "combineren" as const,
          reden: "Drie trainingen met identiek doel",
          voorgesteldeNaam: "Sector-overstijgende klantgesprek-training",
          afstemmingsStappen: ["Stem agenda af", "Plan kwartaalslot"],
          context: "User wil focus op data-domein erbij betrekken",
        },
      ],
      citobreedInzicht: [],
      subEffortAnalysis: [
        {
          groepId: "g1",
          domein: "mens" as const,
          actie: "combineren" as const,
          items: ["eff-po-1", "eff-vo-1", "eff-zak-1"],
          reden: "Drie trainingen met identieke inhoud",
          voorgesteldeNaam: "Sector-overstijgende training",
        },
        {
          groepId: "g1",
          domein: "processen" as const,
          actie: "apart_houden" as const,
          items: ["eff-proc-1"],
          reden: "Proces-gebonden aan sector-governance",
          voorgesteldeNaam: null,
        },
      ],
      samenvatting: "Consolidatie mogelijk in Mens-domein",
    };
    const result = Stap4ResultSchema.safeParse(mockResponse);
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.subEffortAnalysis).toHaveLength(2);
      expect(result.data.subEffortAnalysis[0].groepId).toBe("g1");
      expect(result.data.subEffortAnalysis[0].domein).toBe("mens");
      expect(result.data.subEffortAnalysis[1].actie).toBe("apart_houden");
      expect(result.data.consolidatieAdvies[0].context).toBe(
        "User wil focus op data-domein erbij betrekken"
      );
    }
  });
});

// ============================================================
// Phase 18 — SubEffortAdviesSchema rijke uitwerking (R-CROSS-03)
// Uitbreiding met titel, beschrijving, beargumentatie, vermogenImpact[], dossier{}.
// Alle nieuwe velden zijn .optional() voor backward compat.
// ============================================================

describe("SubEffortAdviesSchema Phase 18 rijke uitwerking (R-CROSS-03)", () => {
  test("accepteert volledig rijke input met titel, beschrijving, beargumentatie, vermogenImpact en dossier", () => {
    const result = SubEffortAdviesSchema.safeParse({
      groepId: "g-klantpartnerschap",
      domein: "mens",
      actie: "combineren",
      items: ["eff-1", "eff-2", "eff-3"],
      reden: "gedeelde training",
      voorgesteldeNaam: "Sectoroverstijgende outside-in training",
      titel: "Sectoroverstijgende outside-in training",
      beschrijving:
        "Gezamenlijk curriculum outside-in gespreksvaardigheden met sector-specifieke casuistiek.",
      beargumentatie:
        "Een traject levert de hefboom voor drie sectoren tegelijk; circa 30% besparing t.o.v. drie losse trajecten.",
      vermogenImpact: [
        { sectorId: "PO", vermogenId: "cap-po-1", impact: "Leerkrachten voeren outside-in gesprekken met ouders." },
        { sectorId: "VO", vermogenId: "cap-vo-1", impact: "Schoolleiders benoemen inhoudelijke kansen vroeg." },
        { sectorId: "Zakelijk", vermogenId: "cap-zak-1", impact: "Accountmanagers stellen klantvraag scherp." },
      ],
      dossier: {
        eigenaar: "Directie L&D Cito BV",
        inspanningsleider: "Programmamanager L&D",
        verwachtResultaat: "NPS +5 binnen 12 maanden.",
        kostenraming: "EUR 350K over 18 maanden.",
        randvoorwaarden: "Commitment van alle drie sectormanagers.",
      },
    });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.titel).toBe("Sectoroverstijgende outside-in training");
      expect(result.data.vermogenImpact).toHaveLength(3);
      expect(result.data.dossier?.eigenaar).toBe("Directie L&D Cito BV");
    }
  });

  test("backward compat — Phase 17 shape zonder rijke velden parseert succesvol", () => {
    const result = SubEffortAdviesSchema.safeParse({
      groepId: "g1",
      domein: "mens",
      actie: "combineren",
      items: ["eff-1"],
      reden: "gedeelde training",
      voorgesteldeNaam: "Sector-overstijgende training",
      // Phase 18 velden expliciet afwezig
    });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.titel).toBeUndefined();
      expect(result.data.dossier).toBeUndefined();
      expect(result.data.vermogenImpact).toBeUndefined();
    }
  });

  test("dossier leeg object parseert met default lege strings per veld", () => {
    const result = SubEffortAdviesSchema.safeParse({
      groepId: "g1",
      domein: "processen",
      actie: "combineren",
      items: ["eff-1"],
      reden: "gedeelde processen",
      voorgesteldeNaam: "Gedeelde klantinformatie-proces standaardisatie",
      dossier: {},
    });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.dossier?.eigenaar).toBe("");
      expect(result.data.dossier?.inspanningsleider).toBe("");
      expect(result.data.dossier?.verwachtResultaat).toBe("");
      expect(result.data.dossier?.kostenraming).toBe("");
      expect(result.data.dossier?.randvoorwaarden).toBe("");
    }
  });

  test("vermogenImpact lege array parseert succesvol", () => {
    const result = SubEffortAdviesSchema.safeParse({
      groepId: "g1",
      domein: "cultuur",
      actie: "apart_houden",
      items: ["eff-1"],
      reden: "sector-specifieke cultuur",
      voorgesteldeNaam: null,
      vermogenImpact: [],
    });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.vermogenImpact).toEqual([]);
    }
  });

  test("vermogenImpact faalt bij ongeldige sectorId", () => {
    const result = SubEffortAdviesSchema.safeParse({
      groepId: "g1",
      domein: "mens",
      actie: "combineren",
      items: ["eff-1"],
      reden: "x",
      voorgesteldeNaam: "Sector-overstijgende training",
      vermogenImpact: [
        { sectorId: "FINANCIEN", vermogenId: "cap-1", impact: "x" }, // ongeldig — moet PO|VO|Zakelijk zijn
      ],
    });
    expect(result.success).toBe(false);
  });
});

describe("Stap4ResultSchema Phase 18 integratie (R-CROSS-03)", () => {
  test("Stap4Result met rijke subEffortAnalysis entry parseert succesvol", () => {
    const mockResponse = {
      consolidatieAdvies: [],
      citobreedInzicht: [],
      samenvatting: "Phase 18 rijke uitwerking demo",
      subEffortAnalysis: [
        {
          groepId: "g1",
          domein: "mens" as const,
          actie: "combineren" as const,
          items: ["eff-1"],
          reden: "gedeelde training",
          voorgesteldeNaam: "Sector-overstijgende training",
          titel: "Sector-overstijgende training",
          beschrijving: "Een cross-sectorale training",
          beargumentatie: "Hefboom over 3 sectoren",
          vermogenImpact: [
            { sectorId: "PO" as const, vermogenId: "cap-po-1", impact: "PO-impact" },
            { sectorId: "VO" as const, vermogenId: "cap-vo-1", impact: "VO-impact" },
            { sectorId: "Zakelijk" as const, vermogenId: "cap-zak-1", impact: "Zakelijk-impact" },
          ],
          dossier: {
            eigenaar: "Directie L&D",
            inspanningsleider: "Programmamanager",
            verwachtResultaat: "NPS +5",
            kostenraming: "EUR 350K",
            randvoorwaarden: "Drie sectormanagers commitment",
          },
        },
      ],
    };
    const result = Stap4ResultSchema.safeParse(mockResponse);
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.subEffortAnalysis).toHaveLength(1);
      expect(result.data.subEffortAnalysis[0].dossier?.eigenaar).toBe("Directie L&D");
      expect(result.data.subEffortAnalysis[0].vermogenImpact).toHaveLength(3);
    }
  });

  test("demo-data stap4Result.subEffortAnalysis parseert onder Stap4ResultSchema", async () => {
    const { createDemoSession } = await import("@/lib/demo-data");
    const demo = createDemoSession();
    const stap4 = demo.crossAnalyseWizard?.stepResults?.stap4;
    expect(stap4).toBeTruthy();
    const result = Stap4ResultSchema.safeParse(stap4);
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.subEffortAnalysis.length).toBeGreaterThanOrEqual(4);
      // Phase 18: elke entry moet rijke velden hebben (dossier, titel, vermogenImpact)
      result.data.subEffortAnalysis.forEach((entry) => {
        expect(entry.titel).toBeDefined();
        expect(entry.beschrijving).toBeDefined();
        expect(entry.beargumentatie).toBeDefined();
        expect(entry.dossier).toBeDefined();
        expect(entry.vermogenImpact).toBeDefined();
      });
    }
  });
});
