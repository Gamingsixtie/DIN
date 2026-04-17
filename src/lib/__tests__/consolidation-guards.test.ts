// Phase 17 — Wave 0: tests voor consolidation-guards module.
// Guards zijn in Wave 0 stubs; deze tests bewaken de locked signatures,
// SECTOR_NAME_REGEX pattern, MIN_TITLE_LENGTH waarde, en volledige
// gedragscontract van computeAutoApplyResult (D-05 auto-apply skip failure).

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
