// DIN-methodiek validatie tests
// Tests voor validateBaat, validateVermogen, validateInspanning

import { describe, it, expect } from "vitest";
import {
  validateBaat,
  validateVermogen,
  validateInspanning,
  type ValidationResult,
  type ValidationCorrection,
} from "@/lib/din-validation";

describe("validateBaat", () => {
  it("passes when title has vergrotende trap (hogere)", () => {
    const result = validateBaat({ title: "Hogere klanttevredenheid" });
    expect(result.passed).toBe(true);
    expect(result.corrections).toHaveLength(0);
    expect(result.warnings).toHaveLength(0);
  });

  it("passes when title contains 'meer'", () => {
    const result = validateBaat({ title: "Meer data-gedreven besluitvorming" });
    expect(result.passed).toBe(true);
    expect(result.corrections).toHaveLength(0);
  });

  it("passes when title has -ere ending (snellere)", () => {
    const result = validateBaat({ title: "Snellere doorlooptijd" });
    expect(result.passed).toBe(true);
    expect(result.corrections).toHaveLength(0);
  });

  it("auto-corrects title missing vergrotende trap", () => {
    const result = validateBaat({ title: "Klanttevredenheid" });
    expect(result.passed).toBe(false);
    expect(result.corrections).toHaveLength(1);
    expect(result.corrections[0].field).toBe("title");
    expect(result.corrections[0].rule).toBe("vergrotende-trap");
    expect(result.corrections[0].corrected).toBe("Betere klanttevredenheid");
    expect(result.item.title).toBe("Betere klanttevredenheid");
  });

  it("warns about verb in title (implementeren)", () => {
    const result = validateBaat({ title: "Implementeren van innovatie" });
    expect(result.passed).toBe(false);
    expect(result.warnings.length).toBeGreaterThanOrEqual(1);
    expect(result.warnings.some((w: string) => w.includes("implementeren"))).toBe(true);
  });

  it("warns about title length >5 words", () => {
    const result = validateBaat({
      title: "Dit is een veel te lange titel die meer dan vijf woorden bevat en niet kort genoeg is",
    });
    expect(result.passed).toBe(false);
    expect(result.warnings.some((w: string) => w.includes("woorden"))).toBe(true);
  });

  it("correction array contains field, rule for auto-corrected titles", () => {
    const result = validateBaat({ title: "Omzet" });
    expect(result.corrections.length).toBeGreaterThanOrEqual(1);
    const correction = result.corrections.find(
      (c: ValidationCorrection) => c.rule === "vergrotende-trap"
    );
    expect(correction).toBeDefined();
    expect(correction!.field).toBe("title");
    expect(correction!.original).toBe("Omzet");
    expect(correction!.corrected).toContain("Betere");
  });

  it("returns passed=true for items with no corrections and no warnings", () => {
    const result = validateBaat({ title: "Hogere omzet" });
    expect(result.passed).toBe(true);
    expect(result.corrections).toHaveLength(0);
    expect(result.warnings).toHaveLength(0);
  });

  it("returns passed=false when corrections exist", () => {
    const result = validateBaat({ title: "Klanttevredenheid" });
    expect(result.passed).toBe(false);
  });

  it("preserves other fields on the item", () => {
    const result = validateBaat({
      title: "Hogere omzet",
      description: "Meer omzet door betere klantbinding",
    });
    expect(result.item.description).toBe("Meer omzet door betere klantbinding");
  });
});

describe("validateVermogen", () => {
  it("passes for capability title without action verbs", () => {
    const result = validateVermogen({ title: "Klantgesprekken voeren" });
    expect(result.passed).toBe(true);
    expect(result.warnings).toHaveLength(0);
  });

  it("warns about action verb 'implementeren'", () => {
    const result = validateVermogen({ title: "Implementeren van CRM" });
    expect(result.passed).toBe(false);
    expect(result.warnings.some((w: string) => w.includes("implementeren"))).toBe(true);
    expect(result.warnings.some((w: string) => w.includes("KUNNEN"))).toBe(true);
  });

  it("warns about action verb 'opzetten'", () => {
    const result = validateVermogen({ title: "Opzetten van governance" });
    expect(result.passed).toBe(false);
    expect(result.warnings.some((w: string) => w.includes("opzetten"))).toBe(true);
  });

  it("warns about title length >5 words", () => {
    const result = validateVermogen({
      title: "Het volledig kunnen toepassen van een nieuwe methodiek",
    });
    expect(result.passed).toBe(false);
    expect(result.warnings.some((w: string) => w.includes("woorden"))).toBe(true);
  });

  it("passes for short title without action verbs", () => {
    const result = validateVermogen({ title: "Data-analyse bekwaamheid" });
    expect(result.passed).toBe(true);
  });
});

describe("validateInspanning", () => {
  it("passes when title contains verb 'uitvoeren'", () => {
    const result = validateInspanning({
      title: "Training uitvoeren voor medewerkers",
      domain: "mens",
    });
    expect(result.passed).toBe(true);
    expect(result.warnings).toHaveLength(0);
  });

  it("warns when title has no verb", () => {
    const result = validateInspanning({ title: "CRM systeem", domain: "data_systemen" });
    expect(result.passed).toBe(false);
    expect(result.warnings.some((w: string) => w.includes("werkwoord"))).toBe(true);
  });

  it("warns about title length >8 words", () => {
    const result = validateInspanning({
      title: "Het implementeren van een heel nieuw systeem voor de gehele organisatie en alle medewerkers",
      domain: "data_systemen",
    });
    expect(result.passed).toBe(false);
    expect(result.warnings.some((w: string) => w.includes("woorden"))).toBe(true);
  });

  it("passes with valid domain", () => {
    const result = validateInspanning({
      title: "Opzetten van governance structuur",
      domain: "processen",
    });
    expect(result.passed).toBe(true);
    expect(result.corrections).toHaveLength(0);
  });

  it("preserves other fields on the item", () => {
    const result = validateInspanning({
      title: "Implementeren van CRM",
      domain: "data_systemen",
      description: "CRM systeem opzetten",
    });
    expect(result.item.description).toBe("CRM systeem opzetten");
    expect(result.item.domain).toBe("data_systemen");
  });
});
