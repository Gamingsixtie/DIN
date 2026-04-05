import { describe, test, expect, vi, beforeEach, afterEach } from "vitest";
import { restoreStap5Result } from "@/lib/stap5-focus";

describe("restoreStap5Result (D-10 migratie)", () => {
  // Unterdrückt de console.warn die restoreStap5Result emits bij fail (zie RESEARCH Pattern 7)
  let warnSpy: ReturnType<typeof vi.spyOn>;
  beforeEach(() => {
    warnSpy = vi.spyOn(console, "warn").mockImplementation(() => {});
  });
  afterEach(() => {
    warnSpy.mockRestore();
  });

  test("Test 1: valide nieuwe shape wordt doorgegeven als getypeerd object", () => {
    const valid = {
      focusDoelId: "g1",
      focusDoelNaam: "Focus",
      vermogenReview: [],
      inspanningReview: [],
      batenDekking: [],
      samenvatting: "OK",
    };
    const result = restoreStap5Result(valid);
    expect(result).toBeDefined();
    expect(result?.focusDoelId).toBe("g1");
    expect(result?.samenvatting).toBe("OK");
  });

  test("Test 2: oude sectorVertalingen[] shape wordt naar undefined gereset", () => {
    const oldShape = {
      sectorVertalingen: [
        { sector: "PO", dinKeten: { aantalBaten: 1, aantalVermogens: 1, aantalInspanningen: 1, waarvanGedeeld: 0 }, samenvatting: "x" },
      ],
      totaalSamenvatting: "oud",
    };
    const result = restoreStap5Result(oldShape);
    expect(result).toBeUndefined();
  });

  test("Test 3: undefined input retourneert undefined", () => {
    expect(restoreStap5Result(undefined)).toBeUndefined();
  });

  test("Test 4: null input retourneert undefined", () => {
    expect(restoreStap5Result(null)).toBeUndefined();
  });

  test("Test 5: partial nieuwe shape met ontbrekende required fields → undefined", () => {
    const partial = {
      focusDoelId: "g1",
      // focusDoelNaam ontbreekt
      samenvatting: "x",
    };
    const result = restoreStap5Result(partial);
    expect(result).toBeUndefined();
  });

  test("Test 6: valide minimale shape (lege default arrays) wordt geaccepteerd", () => {
    const minimal = {
      focusDoelId: "g1",
      focusDoelNaam: "Focus",
      samenvatting: "minimale",
    };
    const result = restoreStap5Result(minimal);
    expect(result).toBeDefined();
    expect(result?.vermogenReview).toEqual([]);
    expect(result?.inspanningReview).toEqual([]);
    expect(result?.batenDekking).toEqual([]);
  });

  test("Test 7: emitteert console.warn bij afgewezen oude shape", () => {
    const oldShape = { sectorVertalingen: [], totaalSamenvatting: "x" };
    restoreStap5Result(oldShape);
    expect(warnSpy).toHaveBeenCalled();
  });
});
