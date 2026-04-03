import { describe, it, expect } from "vitest";
import type { DINSession, DINCapability, DINEffort, DINBenefit, ProgrammeGoal } from "@/lib/types";

// These will be imported once implemented
import {
  getActiveCaps,
  getActiveEfforts,
  categorizeGaps,
} from "@/lib/word-export";

// --- Test fixtures ---

function createMinimalSession(overrides?: Partial<DINSession>): DINSession {
  return {
    id: "test-session",
    name: "Test Programma",
    createdAt: "2026-01-01",
    updatedAt: "2026-01-01",
    currentStep: 1,
    goals: [
      { id: "g1", name: "Doel 1", description: "Eerste doel", rank: 1 },
      { id: "g2", name: "Doel 2", description: "Tweede doel", rank: 2 },
      { id: "g3", name: "Doel 3", description: "Niet-begonnen doel", rank: 3 },
    ],
    vision: { beknopt: "Korte visie", uitgebreid: "Uitgebreide visie" },
    scope: { inScope: ["A"], outScope: ["B"] },
    sectorPlans: [],
    pmcEntries: [],
    benefits: [
      {
        id: "b1",
        goalId: "g1",
        sectorId: "PO",
        title: "Baat 1",
        description: "Eerste baat",
        profiel: {
          indicator: "NPS",
          indicatorOwner: "Manager",
          currentValue: "30",
          targetValue: "50",
          bateneigenaar: "Eigenaar",
          meetmethode: "Survey",
          measurementMoment: "Q4",
        },
      },
    ],
    capabilities: [
      {
        id: "c1",
        sectorId: "PO",
        title: "Vermogen 1",
        description: "Actief vermogen",
        relatedSectors: ["PO"],
      },
      {
        id: "c2",
        sectorId: "VO",
        title: "Vermogen 2 (geconsolideerd)",
        description: "Origineel vermogen dat geconsolideerd is",
        relatedSectors: ["VO"],
        consolidated: true,
        consolidatedInto: "c-shared",
      },
      {
        id: "c-shared",
        sectorId: "PO",
        title: "Gedeeld vermogen",
        description: "Gedeeld vermogen over sectoren",
        relatedSectors: ["PO", "VO"],
      },
    ],
    efforts: [
      {
        id: "e1",
        sectorId: "PO",
        title: "Inspanning 1",
        description: "Actieve inspanning",
        domain: "mens" as const,
        status: "voorstel" as const,
        dependencies: [],
        quarter: "Q1 2026",
      },
      {
        id: "e2",
        sectorId: "VO",
        title: "Inspanning 2 (geconsolideerd)",
        description: "Originele inspanning die geconsolideerd is",
        domain: "processen" as const,
        status: "voorstel" as const,
        dependencies: [],
        consolidated: true,
        consolidatedInto: "e-shared",
      },
      {
        id: "e3",
        sectorId: "PO",
        title: "Inspanning 3 (geen kwartaal)",
        description: "Inspanning zonder planning",
        domain: "cultuur" as const,
        status: "voorstel" as const,
        dependencies: [],
      },
    ],
    goalBenefitMaps: [{ goalId: "g1", benefitId: "b1" }],
    // g2 heeft baten maar geen vermogens (echte gap)
    // g3 heeft GEEN baten (niet-begonnen)
    benefitCapabilityMaps: [{ benefitId: "b1", capabilityId: "c1" }],
    capabilityEffortMaps: [{ capabilityId: "c1", effortId: "e1" }],
    ...overrides,
  };
}

// --- Tests ---

describe("numbering", () => {
  // Import numberedHeading once it's exported for testing
  // We test this indirectly via the exported helper or directly if exported
  it("numberedHeading increments h1Counter", async () => {
    // Dynamic import to get access to NumberingState and numberedHeading
    const mod = await import("@/lib/word-export");
    const state = mod.createNumberingState();
    const p1 = mod.numberedHeading("Eerste", "h1", state);
    expect(state.h1Counter).toBe(1);
    expect(state.h2Counter).toBe(0);
    expect(state.tocEntries.length).toBe(1);
    expect(state.tocEntries[0].text).toContain("Eerste");
  });

  it("numberedHeading increments h2Counter", async () => {
    const mod = await import("@/lib/word-export");
    const state = mod.createNumberingState();
    mod.numberedHeading("Eerste", "h1", state);
    mod.numberedHeading("Sub een", "h2", state);
    expect(state.h1Counter).toBe(1);
    expect(state.h2Counter).toBe(1);
    expect(state.tocEntries.length).toBe(2);
    expect(state.tocEntries[1].text).toContain("Sub een");
  });

  it("h2Counter resets on new h1", async () => {
    const mod = await import("@/lib/word-export");
    const state = mod.createNumberingState();
    mod.numberedHeading("Eerste", "h1", state);
    mod.numberedHeading("Sub een", "h2", state);
    mod.numberedHeading("Sub twee", "h2", state);
    expect(state.h2Counter).toBe(2);

    mod.numberedHeading("Tweede", "h1", state);
    expect(state.h1Counter).toBe(2);
    expect(state.h2Counter).toBe(0); // reset
    expect(state.tocEntries.length).toBe(4);
  });
});

describe("consolidated", () => {
  it("getActiveCaps filters out items with consolidated=true", () => {
    const session = createMinimalSession();
    const active = getActiveCaps(session);
    expect(active.length).toBe(2); // c1 and c-shared, but not c2
    expect(active.find((c) => c.id === "c2")).toBeUndefined();
    expect(active.find((c) => c.id === "c1")).toBeDefined();
    expect(active.find((c) => c.id === "c-shared")).toBeDefined();
  });

  it("getActiveEfforts filters out items with consolidated=true", () => {
    const session = createMinimalSession();
    const active = getActiveEfforts(session);
    expect(active.length).toBe(2); // e1 and e3, but not e2
    expect(active.find((e) => e.id === "e2")).toBeUndefined();
    expect(active.find((e) => e.id === "e1")).toBeDefined();
  });

  it("items with consolidated=undefined or false are kept", () => {
    const session = createMinimalSession();
    const active = getActiveCaps(session);
    // c1 has no consolidated field, c-shared has no consolidated field
    expect(active.length).toBe(2);
  });
});

describe("gap-category", () => {
  it("goal with no benefits and status niet-begonnen categorized as volgendeCyclus", () => {
    const session = createMinimalSession();
    // g3 has no benefits in goalBenefitMaps
    const result = categorizeGaps(session);
    expect(result.volgendeCyclus.find((g) => g.id === "g3")).toBeDefined();
    expect(result.echteGapsGoals.find((g) => g.id === "g3")).toBeUndefined();
  });

  it("goal with status bezig and missing benefits categorized as echteGap", () => {
    // g2 has no benefits but has some session activity -- we'll simulate this
    const session = createMinimalSession({
      benefits: [
        ...createMinimalSession().benefits,
        {
          id: "b2",
          goalId: "g2",
          sectorId: "PO",
          title: "Baat voor g2",
          description: "Onvolledige baat",
          profiel: {},
        },
      ],
      goalBenefitMaps: [
        { goalId: "g1", benefitId: "b1" },
        { goalId: "g2", benefitId: "b2" },
      ],
      // g2 has benefits but b2 has no capability => echte gap on benefit level
      // g3 still has no benefits => volgendeCyclus
    });
    const result = categorizeGaps(session);
    // g2 has benefits so it's not in goalsWithoutBenefits
    // but b2 has no capabilities => appears in benefitsWithoutCaps
    expect(result.benefitsWithoutCaps.find((b) => b!.id === "b2")).toBeDefined();
  });

  it("benefits without capabilities categorized as echteGap", () => {
    const session = createMinimalSession({
      benefitCapabilityMaps: [], // remove all links
    });
    const result = categorizeGaps(session);
    expect(result.benefitsWithoutCaps.length).toBeGreaterThan(0);
  });

  it("capabilities without efforts categorized as echteGap", () => {
    const session = createMinimalSession({
      capabilityEffortMaps: [], // remove all links
    });
    const result = categorizeGaps(session);
    expect(result.capsWithoutEfforts.length).toBeGreaterThan(0);
  });
});

describe("roadmap", () => {
  it("when no efforts have quarter data, roadmap placeholder is present", async () => {
    const mod = await import("@/lib/word-export");
    const session = createMinimalSession({
      efforts: [
        {
          id: "e-no-q",
          sectorId: "PO",
          title: "Zonder kwartaal",
          description: "Geen planning",
          domain: "mens" as const,
          status: "voorstel" as const,
          dependencies: [],
          // no quarter field
        },
      ],
    });
    const state = mod.createNumberingState();
    const activeEfforts = mod.getActiveEfforts(session);
    const section = mod.roadmapSection(session, state, activeEfforts);
    // Check that the section contains the placeholder text
    // We inspect the children for text content
    const allText = extractTextFromChildren(section.children);
    expect(allText).toContain("Kwartaalplanning wordt in een volgende cyclus bepaald");
  });

  it("when efforts have quarter data, roadmap contains quarter table entries", async () => {
    const mod = await import("@/lib/word-export");
    const session = createMinimalSession();
    const state = mod.createNumberingState();
    const activeEfforts = mod.getActiveEfforts(session);
    const section = mod.roadmapSection(session, state, activeEfforts);
    const allText = extractTextFromChildren(section.children);
    expect(allText).toContain("Q1 2026");
  });
});

describe("volgende-cyclus", () => {
  it("goals not in any benefit render with volgende cyclus text", async () => {
    const mod = await import("@/lib/word-export");
    const session = createMinimalSession();
    const state = mod.createNumberingState();
    const section = mod.overviewSection(session, state);
    const allText = extractTextFromChildren(section.children);
    // g3 has no benefits
    expect(allText).toContain("Uitwerking volgt in volgende cyclus");
  });
});

// --- Helper to extract text from docx Paragraph/Table children ---
function extractTextFromChildren(children: unknown[]): string {
  const texts: string[] = [];

  function walk(obj: unknown) {
    if (!obj || typeof obj !== "object") return;

    // TextRun or similar objects may have root[0].text or options.text
    const o = obj as Record<string, unknown>;

    // Check for TextRun-like object with text property
    if ("text" in o && typeof o.text === "string") {
      texts.push(o.text);
    }

    // docx library stores text in root array
    if ("root" in o && Array.isArray(o.root)) {
      for (const item of o.root) {
        walk(item);
      }
    }

    // Check children arrays
    if ("children" in o && Array.isArray(o.children)) {
      for (const child of o.children) {
        walk(child);
      }
    }

    // Check options
    if ("options" in o && typeof o.options === "object" && o.options !== null) {
      walk(o.options);
    }

    // Check rows (Table)
    if ("rows" in o && Array.isArray(o.rows)) {
      for (const row of o.rows) {
        walk(row);
      }
    }
  }

  for (const child of children) {
    walk(child);
  }

  return texts.join(" ");
}
