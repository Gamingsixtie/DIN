import { describe, it, expect } from "vitest";
import {
  assembleSystemPrompt,
  getContextForUseCase,
  truncateAtSentenceBoundary,
  extractKiBContext,
  buildSectorwerkBlock,
} from "@/lib/prompt-assembly";
import type { ProgrammaboekUseCase, KiBContext } from "@/lib/prompt-assembly";
import {
  PROGRAMMABOEK_BATEN,
  PROGRAMMABOEK_VERMOGENS,
  PROGRAMMABOEK_INSPANNINGEN,
  PROGRAMMABOEK_DIN,
  PROGRAMMABOEK_BATENPROFIEL,
  PROGRAMMABOEK_CROSS_ANALYSE,
  PROGRAMMABOEK_VERMOGENS_ASPECTEN,
} from "@/lib/programmaboek-context";

describe("getContextForUseCase", () => {
  it("returns BATEN content for baat-suggest use case", () => {
    const context = getContextForUseCase("baat-suggest");
    expect(context).toContain(PROGRAMMABOEK_BATEN.substring(0, 50));
  });

  it("returns BATEN content for baat-create use case", () => {
    const context = getContextForUseCase("baat-create");
    expect(context).toContain(PROGRAMMABOEK_BATEN.substring(0, 50));
  });

  it("returns VERMOGENS content for vermogen-suggest use case", () => {
    const context = getContextForUseCase("vermogen-suggest");
    expect(context).toContain(PROGRAMMABOEK_VERMOGENS.substring(0, 50));
  });

  it("returns VERMOGENS content for vermogen-create use case", () => {
    const context = getContextForUseCase("vermogen-create");
    expect(context).toContain(PROGRAMMABOEK_VERMOGENS.substring(0, 50));
  });

  it("returns INSPANNINGEN content for inspanning-suggest use case", () => {
    const context = getContextForUseCase("inspanning-suggest");
    expect(context).toContain(PROGRAMMABOEK_INSPANNINGEN.substring(0, 50));
  });

  it("returns INSPANNINGEN content for inspanning-create use case", () => {
    const context = getContextForUseCase("inspanning-create");
    expect(context).toContain(PROGRAMMABOEK_INSPANNINGEN.substring(0, 50));
  });

  it("returns DIN content for din-mapping use case", () => {
    const context = getContextForUseCase("din-mapping");
    expect(context).toContain(PROGRAMMABOEK_DIN.substring(0, 50));
  });

  it("returns CROSS_ANALYSE content for cross-analyse use case", () => {
    const context = getContextForUseCase("cross-analyse");
    expect(context).toContain(PROGRAMMABOEK_CROSS_ANALYSE.substring(0, 50));
  });

  it("returns BATENPROFIEL content for batenprofiel use case", () => {
    const context = getContextForUseCase("batenprofiel");
    expect(context).toContain(PROGRAMMABOEK_BATENPROFIEL.substring(0, 50));
  });

  it("returns VERMOGENS_ASPECTEN content for domain-recommend use case", () => {
    const context = getContextForUseCase("domain-recommend");
    expect(context).toContain(PROGRAMMABOEK_VERMOGENS_ASPECTEN.substring(0, 50));
  });

  it("returns non-empty string for every use case", () => {
    const useCases: ProgrammaboekUseCase[] = [
      "din-mapping",
      "baat-suggest",
      "baat-create",
      "vermogen-suggest",
      "vermogen-create",
      "inspanning-suggest",
      "inspanning-create",
      "domain-recommend",
      "batenprofiel",
      "cross-analyse",
    ];
    for (const useCase of useCases) {
      const context = getContextForUseCase(useCase);
      expect(context.length).toBeGreaterThan(0);
    }
  });
});

describe("truncateAtSentenceBoundary", () => {
  it("returns full text when under limit", () => {
    const text = "Dit is een korte tekst. Niets af te kappen.";
    expect(truncateAtSentenceBoundary(text, 1000)).toBe(text);
  });

  it("does not cut mid-sentence when over limit", () => {
    const text = "Eerste zin hier. Tweede zin hier. Derde zin die langer is dan het limiet zou toelaten.";
    const result = truncateAtSentenceBoundary(text, 40);
    // Should cut at a sentence boundary, not mid-word
    expect(result).toMatch(/\.$/);
  });

  it("never returns empty string for non-empty input", () => {
    const text = "Korte tekst.";
    expect(truncateAtSentenceBoundary(text, 5).length).toBeGreaterThan(0);
  });

  it("returns truncated text ending at sentence boundary", () => {
    const text = "Eerste zin. Tweede zin. Derde zin. Vierde zin die erg lang is en ver voorbij het limiet gaat.";
    const result = truncateAtSentenceBoundary(text, 35);
    // Should end at "Tweede zin." (position ~22) or "Derde zin." (position ~33)
    expect(result.endsWith("zin.")).toBe(true);
  });

  it("handles text with question marks as sentence boundaries", () => {
    const text = "Wat is een baat? Een baat is een effect. Hoe meet je dat? Met een indicator.";
    const result = truncateAtSentenceBoundary(text, 50);
    expect(result.length).toBeLessThanOrEqual(50);
    expect(result.length).toBeGreaterThan(0);
  });
});

describe("assembleSystemPrompt", () => {
  const testInstruction = "Je bent een DIN-expert. Genereer baten.";

  it("contains the instruction prompt text", () => {
    const result = assembleSystemPrompt(testInstruction, "baat-suggest");
    expect(result).toContain(testInstruction);
  });

  it("contains ACHTERGRONDKENNIS header", () => {
    const result = assembleSystemPrompt(testInstruction, "baat-suggest");
    expect(result).toContain("ACHTERGRONDKENNIS UIT HET PROGRAMMABOEK");
  });

  it("contains Prevaas & Van Loon reference", () => {
    const result = assembleSystemPrompt(testInstruction, "baat-suggest");
    expect(result).toContain("Prevaas & Van Loon");
  });

  it("contains methodology reference instruction", () => {
    const result = assembleSystemPrompt(testInstruction, "baat-suggest");
    expect(result).toContain("methodiek");
  });

  it("for baat-suggest contains PROGRAMMABOEK_BATEN content", () => {
    const result = assembleSystemPrompt(testInstruction, "baat-suggest");
    expect(result).toContain(PROGRAMMABOEK_BATEN.substring(0, 50));
  });

  it("for vermogens use cases contains PROGRAMMABOEK_VERMOGENS content", () => {
    const result = assembleSystemPrompt(testInstruction, "vermogen-suggest");
    expect(result).toContain(PROGRAMMABOEK_VERMOGENS.substring(0, 50));
  });

  it("for inspanningen use cases contains PROGRAMMABOEK_INSPANNINGEN content", () => {
    const result = assembleSystemPrompt(testInstruction, "inspanning-create");
    expect(result).toContain(PROGRAMMABOEK_INSPANNINGEN.substring(0, 50));
  });

  it("for din-mapping contains PROGRAMMABOEK_DIN content", () => {
    const result = assembleSystemPrompt(testInstruction, "din-mapping");
    expect(result).toContain(PROGRAMMABOEK_DIN.substring(0, 50));
  });

  it("for cross-analyse contains PROGRAMMABOEK_CROSS_ANALYSE content", () => {
    const result = assembleSystemPrompt(testInstruction, "cross-analyse");
    expect(result).toContain(PROGRAMMABOEK_CROSS_ANALYSE.substring(0, 50));
  });

  it("for batenprofiel contains PROGRAMMABOEK_BATENPROFIEL content", () => {
    const result = assembleSystemPrompt(testInstruction, "batenprofiel");
    expect(result).toContain(PROGRAMMABOEK_BATENPROFIEL.substring(0, 50));
  });

  it("respects maxContextChars parameter for truncation", () => {
    const result = assembleSystemPrompt(testInstruction, "vermogen-suggest", 500);
    // The context portion should be limited
    const contextStart = result.indexOf("ACHTERGRONDKENNIS");
    const contextEnd = result.lastIndexOf("---");
    const contextSection = result.substring(contextStart, contextEnd);
    // The entire context section (including headers) should be within reasonable bounds
    expect(contextSection.length).toBeLessThan(1000);
  });

  it("contains separator between instruction and context", () => {
    const result = assembleSystemPrompt(testInstruction, "baat-suggest");
    expect(result).toContain("---");
  });
});

// ============================================================
// extractKiBContext tests
// ============================================================

describe("extractKiBContext", () => {
  it("extracts goals sorted by rank with descriptions capped at 80 chars", () => {
    const longDesc = "A".repeat(120);
    const result = extractKiBContext({
      goals: [
        { id: "g2", name: "Doel B", description: longDesc, rank: 2 },
        { id: "g1", name: "Doel A", description: "Korte beschrijving", rank: 1 },
      ],
      scope: undefined,
    });
    expect(result.goals).toHaveLength(2);
    expect(result.goals[0].rank).toBe(1);
    expect(result.goals[0].name).toBe("Doel A");
    expect(result.goals[1].description.length).toBeLessThanOrEqual(80);
  });

  it("returns empty goals and null scope when no data provided", () => {
    const result = extractKiBContext({ goals: [], scope: undefined });
    expect(result.goals).toEqual([]);
    expect(result.scope).toBeNull();
  });

  it("returns empty goals and null scope when goals is undefined", () => {
    const result = extractKiBContext({});
    expect(result.goals).toEqual([]);
    expect(result.scope).toBeNull();
  });

  it("caps scope items at 10 per list", () => {
    const manyItems = Array.from({ length: 15 }, (_, i) => `Item ${i + 1}`);
    const result = extractKiBContext({
      goals: [],
      scope: { id: "s1", inScope: manyItems, outScope: manyItems },
    });
    expect(result.scope).not.toBeNull();
    expect(result.scope!.inScope.length).toBeLessThanOrEqual(10);
    expect(result.scope!.outScope.length).toBeLessThanOrEqual(10);
  });

  it("preserves scope data when within limits", () => {
    const result = extractKiBContext({
      goals: [],
      scope: { id: "s1", inScope: ["A", "B"], outScope: ["C"] },
    });
    expect(result.scope).toEqual({ inScope: ["A", "B"], outScope: ["C"] });
  });
});

// ============================================================
// assembleSystemPrompt with KiB context tests
// ============================================================

describe("assembleSystemPrompt with KiB context", () => {
  const testInstruction = "Je bent een DIN-expert. Genereer baten.";

  const sampleKiB: KiBContext = {
    goals: [
      { name: "Outside-in competentie", description: "Verankeren in de organisatie", rank: 1 },
      { name: "Digitale transformatie", description: "Volledige digitalisering", rank: 2 },
    ],
    scope: {
      inScope: ["Primair onderwijs", "Voortgezet onderwijs"],
      outScope: ["Hoger onderwijs"],
    },
  };

  it("includes KIB PROGRAMMADOELEN EN SCOPE header when kibContext provided", () => {
    const result = assembleSystemPrompt(testInstruction, "baat-suggest", undefined, sampleKiB);
    expect(result).toContain("KIB PROGRAMMADOELEN EN SCOPE");
  });

  it("produces same output without KiB block when kibContext is null", () => {
    const withNull = assembleSystemPrompt(testInstruction, "baat-suggest", undefined, null);
    const withoutArg = assembleSystemPrompt(testInstruction, "baat-suggest");
    expect(withNull).toBe(withoutArg);
  });

  it("produces same output without KiB block when kibContext is undefined", () => {
    const withUndefined = assembleSystemPrompt(testInstruction, "baat-suggest", undefined, undefined);
    const withoutArg = assembleSystemPrompt(testInstruction, "baat-suggest");
    expect(withUndefined).toBe(withoutArg);
  });

  it("places KiB block AFTER programmaboek context", () => {
    const result = assembleSystemPrompt(testInstruction, "baat-suggest", undefined, sampleKiB);
    const achtergrondPos = result.indexOf("ACHTERGRONDKENNIS UIT HET PROGRAMMABOEK");
    const kibPos = result.indexOf("KIB PROGRAMMADOELEN EN SCOPE");
    expect(achtergrondPos).toBeGreaterThan(-1);
    expect(kibPos).toBeGreaterThan(-1);
    expect(kibPos).toBeGreaterThan(achtergrondPos);
  });

  it("includes scope instruction to generate only within scope", () => {
    const result = assembleSystemPrompt(testInstruction, "baat-suggest", undefined, sampleKiB);
    expect(result).toContain("Genereer ALLEEN items die passen binnen");
  });

  it("omits KiB block when kibContext has 0 goals", () => {
    const emptyKiB: KiBContext = { goals: [], scope: null };
    const result = assembleSystemPrompt(testInstruction, "baat-suggest", undefined, emptyKiB);
    expect(result).not.toContain("KIB PROGRAMMADOELEN EN SCOPE");
  });

  it("includes goal names in the KiB block", () => {
    const result = assembleSystemPrompt(testInstruction, "baat-suggest", undefined, sampleKiB);
    expect(result).toContain("Outside-in competentie");
    expect(result).toContain("Digitale transformatie");
  });

  it("includes scope items in the KiB block", () => {
    const result = assembleSystemPrompt(testInstruction, "baat-suggest", undefined, sampleKiB);
    expect(result).toContain("Primair onderwijs");
    expect(result).toContain("Hoger onderwijs");
  });

  it("caps total KiB block length at approximately 1000 chars", () => {
    const manyGoals = Array.from({ length: 20 }, (_, i) => ({
      name: `Zeer lang programmadoel nummer ${i + 1} met uitgebreide naam`,
      description: "Dit is een uitgebreide beschrijving die veel tekens inneemt en de limiet gaat testen",
      rank: i + 1,
    }));
    const bigKiB: KiBContext = {
      goals: manyGoals,
      scope: { inScope: Array(10).fill("Scope item"), outScope: Array(10).fill("Out item") },
    };
    const result = assembleSystemPrompt(testInstruction, "baat-suggest", undefined, bigKiB);
    // Extract the KiB block between its separators
    const kibStart = result.indexOf("KIB PROGRAMMADOELEN EN SCOPE");
    if (kibStart > -1) {
      // Find the closing separator after the KiB block
      const afterKib = result.substring(kibStart);
      // The KiB block should be capped
      expect(afterKib.length).toBeLessThanOrEqual(1200); // some margin for formatting
    }
  });
});

// ============================================================
// buildSectorwerkBlock tests
// ============================================================

describe("buildSectorwerkBlock", () => {
  const validAnalysis = {
    samenvatting: "Test samenvatting van het sectorplan",
    aansluiting: {
      titel: "Aansluiting",
      toelichting: "Toelichting",
      punten: ["aansluiting punt 1"],
    },
    baten: {
      titel: "Baten",
      toelichting: "Toelichting baten",
      punten: ["baat 1", "baat 2"],
    },
    vermogens: {
      titel: "Vermogens",
      toelichting: "Toelichting vermogens",
      punten: ["vermogen 1"],
    },
    inspanningen: {
      titel: "Inspanningen",
      toelichting: "Toelichting inspanningen",
      mens: ["training"],
      processen: ["werkwijze"],
      data_systemen: [],
      cultuur: [],
    },
    aandachtspunten: {
      titel: "Aandachtspunten",
      toelichting: "Toelichting aandachtspunten",
      punten: ["let op X"],
    },
  };

  it("formats samenvatting with SECTORWERK-ANALYSE header", () => {
    const result = buildSectorwerkBlock(validAnalysis);
    expect(result).toContain("SECTORWERK-ANALYSE");
    expect(result).toContain("Test samenvatting van het sectorplan");
    expect(result).toContain("---");
  });

  it("formats baten punten as bullet list under Voorgestelde baten", () => {
    const result = buildSectorwerkBlock(validAnalysis);
    expect(result).toContain("Voorgestelde baten");
    expect(result).toContain("- baat 1");
    expect(result).toContain("- baat 2");
  });

  it("formats inspanningen per domein", () => {
    const result = buildSectorwerkBlock(validAnalysis);
    expect(result).toContain("Mens: training");
    expect(result).toContain("Processen: werkwijze");
  });

  it("truncates at 1500 chars for very long samenvatting", () => {
    const longAnalysis = {
      ...validAnalysis,
      samenvatting: "A".repeat(2000),
    };
    const result = buildSectorwerkBlock(longAnalysis);
    expect(result.length).toBeLessThan(1600);
  });

  it("returns empty string for null input", () => {
    const result = buildSectorwerkBlock(null);
    expect(result).toBe("");
  });
});
