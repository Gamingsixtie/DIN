import { describe, it, expect } from "vitest";
import WordExtractor from "word-extractor";
import * as path from "path";
import * as fs from "fs";

const DOC_PATH = path.resolve(__dirname, "../../docs/programmaboek.doc");

describe("extract-programmaboek", () => {
  it("WordExtractor reads programmaboek.doc and returns >100,000 chars", async () => {
    const extractor = new WordExtractor();
    const doc = await extractor.extract(DOC_PATH);
    const body = doc.getBody();
    expect(body.length).toBeGreaterThan(100_000);
  });

  it("extracted text contains chapter 8 header: DOELEN EN BATEN IDENTIFICEREN", async () => {
    const extractor = new WordExtractor();
    const doc = await extractor.extract(DOC_PATH);
    const body = doc.getBody();
    expect(body).toContain("DOELEN EN BATEN IDENTIFICEREN");
  });

  it("extracted text contains chapter 10 header: DE BENODIGDE VERMOGENS UITWERKEN", async () => {
    const extractor = new WordExtractor();
    const doc = await extractor.extract(DOC_PATH);
    const body = doc.getBody();
    expect(body).toContain("DE BENODIGDE VERMOGENS UITWERKEN");
  });

  it("extracted text contains chapter 11 header: OVERZICHT EN SAMENHANG AANBRENGEN", async () => {
    const extractor = new WordExtractor();
    const doc = await extractor.extract(DOC_PATH);
    const body = doc.getBody();
    expect(body).toContain("OVERZICHT EN SAMENHANG AANBRENGEN");
  });

  it("splitting by chapter headers produces non-empty section for chapter 8", async () => {
    const extractor = new WordExtractor();
    const doc = await extractor.extract(DOC_PATH);
    const body = doc.getBody();

    const ch8Start = body.indexOf("DOELEN EN BATEN IDENTIFICEREN");
    const ch9Start = body.indexOf("DE (VERANDER)STRATEGIE FORMULEREN");
    expect(ch8Start).toBeGreaterThan(-1);
    expect(ch9Start).toBeGreaterThan(ch8Start);

    const ch8Text = body.substring(ch8Start, ch9Start).trim();
    expect(ch8Text.length).toBeGreaterThan(1000);
  });

  it("splitting by chapter headers produces non-empty section for chapter 10", async () => {
    const extractor = new WordExtractor();
    const doc = await extractor.extract(DOC_PATH);
    const body = doc.getBody();

    const ch10Start = body.indexOf("DE BENODIGDE VERMOGENS UITWERKEN");
    const ch11Start = body.indexOf("OVERZICHT EN SAMENHANG AANBRENGEN");
    expect(ch10Start).toBeGreaterThan(-1);
    expect(ch11Start).toBeGreaterThan(ch10Start);

    const ch10Text = body.substring(ch10Start, ch11Start).trim();
    expect(ch10Text.length).toBeGreaterThan(1000);
  });

  it("splitting by chapter headers produces non-empty section for chapter 11", async () => {
    const extractor = new WordExtractor();
    const doc = await extractor.extract(DOC_PATH);
    const body = doc.getBody();

    const ch11Start = body.indexOf("OVERZICHT EN SAMENHANG AANBRENGEN");
    expect(ch11Start).toBeGreaterThan(-1);

    // Chapter 11 extends at least 1000 chars from its header
    const ch11Text = body.substring(ch11Start, ch11Start + 30000).trim();
    expect(ch11Text.length).toBeGreaterThan(1000);
  });
});

describe("generated programmaboek-context.ts", () => {
  const CONTEXT_PATH = path.resolve(__dirname, "../../src/lib/programmaboek-context.ts");

  it("programmaboek-context.ts exists and is non-empty", () => {
    expect(fs.existsSync(CONTEXT_PATH)).toBe(true);
    const content = fs.readFileSync(CONTEXT_PATH, "utf-8");
    expect(content.length).toBeGreaterThan(500);
  });

  it("exports PROGRAMMABOEK_BATEN as non-empty string", async () => {
    const mod = await import("@/lib/programmaboek-context");
    expect(mod.PROGRAMMABOEK_BATEN).toBeDefined();
    expect(typeof mod.PROGRAMMABOEK_BATEN).toBe("string");
    expect(mod.PROGRAMMABOEK_BATEN.length).toBeGreaterThan(100);
  });

  it("exports PROGRAMMABOEK_VERMOGENS as non-empty string", async () => {
    const mod = await import("@/lib/programmaboek-context");
    expect(mod.PROGRAMMABOEK_VERMOGENS).toBeDefined();
    expect(typeof mod.PROGRAMMABOEK_VERMOGENS).toBe("string");
    expect(mod.PROGRAMMABOEK_VERMOGENS.length).toBeGreaterThan(100);
  });

  it("exports PROGRAMMABOEK_INSPANNINGEN as non-empty string", async () => {
    const mod = await import("@/lib/programmaboek-context");
    expect(mod.PROGRAMMABOEK_INSPANNINGEN).toBeDefined();
    expect(typeof mod.PROGRAMMABOEK_INSPANNINGEN).toBe("string");
    expect(mod.PROGRAMMABOEK_INSPANNINGEN.length).toBeGreaterThan(100);
  });

  it("exports PROGRAMMABOEK_DIN as non-empty string", async () => {
    const mod = await import("@/lib/programmaboek-context");
    expect(mod.PROGRAMMABOEK_DIN).toBeDefined();
    expect(typeof mod.PROGRAMMABOEK_DIN).toBe("string");
    expect(mod.PROGRAMMABOEK_DIN.length).toBeGreaterThan(100);
  });
});
