import { describe, it, expect } from "vitest";
import {
  assembleSystemPrompt,
  getContextForUseCase,
  truncateAtSentenceBoundary,
} from "@/lib/prompt-assembly";
import type { ProgrammaboekUseCase } from "@/lib/prompt-assembly";
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
