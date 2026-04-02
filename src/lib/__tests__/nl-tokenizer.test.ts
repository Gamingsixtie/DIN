// Dutch tokenizer unit tests
// Tests voor tokenize, tokenSimilarity, compound splitting, threshold, filtering

import { describe, it, expect } from "vitest";
import {
  tokenize,
  tokenSimilarity,
  SIMILARITY_THRESHOLD,
  MIN_TOKEN_LENGTH,
} from "@/lib/nl-tokenizer";
import snowballFactory from "snowball-stemmers";

const stemmer = snowballFactory.newStemmer("dutch");

describe("tokenize", () => {
  it("filters tokens shorter than 4 characters", () => {
    const tokens = tokenize("de het een van voor met");
    expect(tokens.size).toBe(0);
  });

  it("filters NL stopwords", () => {
    const tokens = tokenize("deze worden door alle meer over");
    expect(tokens.size).toBe(0);
  });

  it("stems Dutch words to roots", () => {
    const tokens = tokenize("verbetering");
    const expectedStem = stemmer.stem("verbetering");
    expect(tokens.has(expectedStem)).toBe(true);
  });

  it("stems plural forms to same root", () => {
    const tokensPlural = tokenize("opleidingen");
    const tokensSingular = tokenize("opleiding");
    const common = [...tokensPlural].filter((t) => tokensSingular.has(t));
    expect(common.length).toBeGreaterThanOrEqual(1);
  });

  it("preserves abbreviations without stemming", () => {
    const tokens = tokenize("NPS score verbetering");
    expect(tokens.has("nps")).toBe(true);
  });

  it("splits compound word onderwijskwaliteit", () => {
    const tokens = tokenize("onderwijskwaliteit");
    const onderwijsStem = stemmer.stem("onderwijs");
    const kwaliteitStem = stemmer.stem("kwaliteit");
    expect(tokens.has(onderwijsStem)).toBe(true);
    expect(tokens.has(kwaliteitStem)).toBe(true);
  });

  it("does NOT split short words (< 10 chars)", () => {
    const tokens = tokenize("onderwijs");
    // "onderwijs" is 9 chars, below COMPOUND_MIN_WORD of 10
    // It should NOT contain "onder" or "wijs" as separate compound parts
    expect(tokens.has("onder")).toBe(false);
    expect(tokens.has("wijs")).toBe(false);
  });

  it("handles empty string", () => {
    const tokens = tokenize("");
    expect(tokens.size).toBe(0);
  });

  it("handles linking letters in compounds", () => {
    const tokens = tokenize("geesteswetenschappen");
    const geestStem = stemmer.stem("geest");
    expect(tokens.has(geestStem)).toBe(true);
  });
});

describe("tokenSimilarity", () => {
  it("returns 0 for empty sets", () => {
    expect(tokenSimilarity(new Set(), new Set())).toBe(0);
  });

  it("returns 1 for identical sets", () => {
    const a = tokenize("verbetering onderwijs");
    const b = tokenize("verbetering onderwijs");
    expect(tokenSimilarity(a, b)).toBe(1);
  });

  it("does not cluster unrelated items", () => {
    const a = tokenize("Digitale leeromgeving vernieuwd");
    const b = tokenize("Personeelsbeleid herzien");
    expect(tokenSimilarity(a, b)).toBeLessThan(0.35);
  });

  it("clusters related items across sectors", () => {
    const a = tokenize("Verbetering klanttevredenheid onderwijs");
    const b = tokenize("Klanttevredenheidsverbetering in het onderwijs");
    expect(tokenSimilarity(a, b)).toBeGreaterThanOrEqual(0.35);
  });
});

describe("constants", () => {
  it("SIMILARITY_THRESHOLD is 0.35", () => {
    expect(SIMILARITY_THRESHOLD).toBe(0.35);
  });

  it("MIN_TOKEN_LENGTH is 4", () => {
    expect(MIN_TOKEN_LENGTH).toBe(4);
  });
});
