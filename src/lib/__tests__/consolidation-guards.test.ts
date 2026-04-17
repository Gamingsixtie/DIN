// Phase 17 — Wave 0 + Wave 1: tests voor consolidation-guards module.
// Wave 0: guards zijn stubs; tests bewaken signatures, SECTOR_NAME_REGEX pattern,
// MIN_TITLE_LENGTH waarde, en gedragscontract van computeAutoApplyResult.
// Wave 1: guards hebben throw-logica; tests dekken alle throw-paden per D-24.

import { describe, test, expect, vi } from "vitest";
import {
  SECTOR_NAME_REGEX,
  MIN_TITLE_LENGTH,
  validateNeutralTitle,
  validateSameDomain,
  validateDrieluikThreshold,
  computeAutoApplyResult,
  type AutoApplyCluster,
} from "@/lib/consolidation-guards";
import type { DINEffort } from "@/lib/types";

describe("consolidation-guards module exports (Wave 0 scaffold)", () => {
  test("Test 1: all named exports resolve", () => {
    expect(validateNeutralTitle).toBeDefined();
    expect(validateSameDomain).toBeDefined();
    expect(validateDrieluikThreshold).toBeDefined();
    expect(computeAutoApplyResult).toBeDefined();
  });

  test("Test 2: SECTOR_NAME_REGEX locked pattern (D-01)", () => {
    expect(SECTOR_NAME_REGEX.source).toBe(
      "\\b(PO|VO|Zakelijk|primair onderwijs|voortgezet onderwijs)\\b"
    );
    expect(SECTOR_NAME_REGEX.flags).toContain("i");
  });

  test("Test 3: MIN_TITLE_LENGTH locked value", () => {
    expect(MIN_TITLE_LENGTH).toBe(10);
  });
});

describe("computeAutoApplyResult (D-05) — auto apply skip failure", () => {
  test("happy path — valid cluster gets merged", () => {
    const mergeFn = vi.fn();
    const clusters: AutoApplyCluster[] = [
      { key: "a,b", itemIds: ["a", "b"], suggestedTitle: "Sectoroverstijgende training" },
    ];
    const result = computeAutoApplyResult(clusters, new Set(), mergeFn);
    expect(result.mergedKeys).toEqual(["a,b"]);
    expect(result.failedKeys).toEqual([]);
    expect(mergeFn).toHaveBeenCalledWith(["a", "b"], "Sectoroverstijgende training");
  });

  test("guard throw is captured in failedKeys with reason", () => {
    const mergeFn = vi.fn((ids: string[]) => {
      if (ids.includes("bad")) throw new Error('Titel bevat sector-naam "PO"');
    });
    const clusters: AutoApplyCluster[] = [
      { key: "bad,x", itemIds: ["bad", "x"], suggestedTitle: "PO-training" },
      { key: "c,d", itemIds: ["c", "d"], suggestedTitle: "Neutrale titel lang" },
    ];
    const result = computeAutoApplyResult(clusters, new Set(), mergeFn);
    expect(result.mergedKeys).toEqual(["c,d"]);
    expect(result.failedKeys).toEqual(["bad,x"]);
    expect(result.reasons["bad,x"]).toContain("sector-naam");
  });

  test("skips clusters with <2 items silently", () => {
    const mergeFn = vi.fn();
    const clusters: AutoApplyCluster[] = [
      { key: "a", itemIds: ["a"], suggestedTitle: "x" },
    ];
    const result = computeAutoApplyResult(clusters, new Set(), mergeFn);
    expect(result.mergedKeys).toEqual([]);
    expect(result.failedKeys).toEqual([]);
    expect(mergeFn).not.toHaveBeenCalled();
  });

  test("skips clusters already merged via alreadyMergedKeys", () => {
    const mergeFn = vi.fn();
    const clusters: AutoApplyCluster[] = [
      { key: "a,b", itemIds: ["a", "b"] },
    ];
    const result = computeAutoApplyResult(clusters, new Set(["a,b"]), mergeFn);
    expect(result.mergedKeys).toEqual([]);
    expect(mergeFn).not.toHaveBeenCalled();
  });
});

// ============================================================
// Wave 1: Guard implementation tests (D-01, D-02, D-27)
// ============================================================

describe("validateNeutralTitle (D-01)", () => {
  test("throws on PO substring", () => {
    expect(() => validateNeutralTitle("Training PO-leerkrachten")).toThrow(/PO/);
  });

  test("throws on VO substring", () => {
    expect(() => validateNeutralTitle("Curriculum VO-scholen breed")).toThrow(/VO/);
  });

  test("throws on Zakelijk substring", () => {
    expect(() => validateNeutralTitle("Training Zakelijke klanten totaal")).toThrow(/Zakelijk/);
  });

  test("throws on 'primair onderwijs'", () => {
    expect(() => validateNeutralTitle("Strategie primair onderwijs breed")).toThrow(/primair onderwijs/i);
  });

  test("throws on <10 chars", () => {
    expect(() => validateNeutralTitle("Kort")).toThrow(/(te kort|minimum)/i);
  });

  test("word boundary false positives — accepteert Protocol", () => {
    expect(() => validateNeutralTitle("Protocol datakwaliteit cito-breed")).not.toThrow();
  });

  test("word boundary false positives — accepteert VOldoende", () => {
    expect(() => validateNeutralTitle("VOldoende inzicht in leervraag")).not.toThrow();
  });

  test("word boundary false positives — accepteert Automatiseren", () => {
    expect(() => validateNeutralTitle("Automatiseren van rapportageproces")).not.toThrow();
  });

  test("accepteert neutrale titel van exact 10 chars", () => {
    expect(() => validateNeutralTitle("Klantgespr")).not.toThrow();
  });
});

describe("validateSameDomain (D-02)", () => {
  test("throws on cross-domein mens + data_systemen", () => {
    expect(() =>
      validateSameDomain([
        { id: "a", domain: "mens" } as DINEffort,
        { id: "b", domain: "data_systemen" } as DINEffort,
      ])
    ).toThrow(/mens.*data_systemen|data_systemen.*mens/);
  });

  test("accepts same-domein mens + mens", () => {
    expect(() =>
      validateSameDomain([
        { id: "a", domain: "mens" } as DINEffort,
        { id: "b", domain: "mens" } as DINEffort,
      ])
    ).not.toThrow();
  });

  test("accepts empty items list", () => {
    expect(() => validateSameDomain([])).not.toThrow();
  });
});

describe("validateDrieluikThreshold (D-27)", () => {
  test("throws when efforts raken geen groep", () => {
    expect(() =>
      validateDrieluikThreshold(["eff-1", "eff-2"], {
        gelijkenisGroepen: [
          { id: "g1", vermogenIds: ["cap-x"], gezamenlijkeOmschrijving: "x", reden: "y" },
        ],
        capEffortMaps: [
          { capabilityId: "cap-y", effortId: "eff-1" },
          { capabilityId: "cap-z", effortId: "eff-2" },
        ],
      })
    ).toThrow(/drieluik|drempel/i);
  });

  test("accepts when efforts all reach one groep", () => {
    expect(() =>
      validateDrieluikThreshold(["eff-1", "eff-2"], {
        gelijkenisGroepen: [
          {
            id: "g1",
            vermogenIds: ["cap-po", "cap-vo", "cap-zak"],
            gezamenlijkeOmschrijving: "x",
            reden: "y",
          },
        ],
        capEffortMaps: [
          { capabilityId: "cap-po", effortId: "eff-1" },
          { capabilityId: "cap-vo", effortId: "eff-2" },
        ],
      })
    ).not.toThrow();
  });

  test("accepts when efforts all reach SAME cap (within one groep)", () => {
    expect(() =>
      validateDrieluikThreshold(["eff-1", "eff-2"], {
        gelijkenisGroepen: [
          { id: "g1", vermogenIds: ["cap-po", "cap-vo"], gezamenlijkeOmschrijving: "x", reden: "y" },
        ],
        capEffortMaps: [
          { capabilityId: "cap-po", effortId: "eff-1" },
          { capabilityId: "cap-po", effortId: "eff-2" },
        ],
      })
    ).not.toThrow();
  });

  test("accepts empty effortIds list (no items to merge)", () => {
    expect(() =>
      validateDrieluikThreshold([], {
        gelijkenisGroepen: [],
        capEffortMaps: [],
      })
    ).not.toThrow();
  });
});
