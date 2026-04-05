import { describe, test, expect } from "vitest";
import { Stap5ResultSchema } from "@/lib/schemas";

describe("Stap5ResultSchema (nieuw shape — Phase 13)", () => {
  test("Test 1: accepteert valid nieuwe shape met alle velden", () => {
    const valid = {
      focusDoelId: "goal-1",
      focusDoelNaam: "Outside-in competentie verankeren",
      vermogenReview: [
        {
          vermogenId: "cap-1",
          hefboomAnalyse: "Dit vermogen raakt baat X in PO en VO.",
          suggestieAanscherping: "Maak formulering concreter",
        },
      ],
      inspanningReview: [
        {
          inspanningId: "eff-1",
          breedteOordeel: "dekt_volledig",
          toelichting: "Past bij het gedeelde vermogen",
        },
        {
          inspanningId: "eff-2",
          breedteOordeel: "moet_verbreed",
          toelichting: "Dekt maar een deel",
          suggestieVerbreding: "Breid uit naar Zakelijk",
        },
        {
          inspanningId: "eff-3",
          breedteOordeel: "mist_aspect",
          toelichting: "Mist data-infrastructuur",
          suggestieVerbreding: "Voeg data-laag toe",
        },
      ],
      batenDekking: [
        { baatId: "ben-1", sector: "PO", wordtGeraakt: true, redenering: "Cross-sector vermogen raakt direct" },
        { baatId: "ben-2", sector: "VO", wordtGeraakt: false, redenering: "Mismatch", risico: "Baat niet gerealiseerd zonder extra inspanning" },
      ],
      samenvatting: "Kern van de cross-sector hefboomwerking voor dit focusdoel in 3-5 zinnen.",
    };
    const parsed = Stap5ResultSchema.safeParse(valid);
    expect(parsed.success).toBe(true);
  });

  test("Test 2: accepteert minimale shape met lege arrays (default [])", () => {
    const minimal = {
      focusDoelId: "goal-1",
      focusDoelNaam: "Doel",
      samenvatting: "Korte samenvatting",
    };
    const parsed = Stap5ResultSchema.safeParse(minimal);
    expect(parsed.success).toBe(true);
    if (parsed.success) {
      expect(parsed.data.vermogenReview).toEqual([]);
      expect(parsed.data.inspanningReview).toEqual([]);
      expect(parsed.data.batenDekking).toEqual([]);
    }
  });

  test("Test 3: wijst OUDE sectorVertalingen[] shape af (D-07 breaking change)", () => {
    const oldShape = {
      sectorVertalingen: [
        {
          sector: "PO",
          dinKeten: { aantalBaten: 6, aantalVermogens: 4, aantalInspanningen: 8, waarvanGedeeld: 2 },
          domeinBalans: [],
          gaps: [],
          samenvatting: "oud",
        },
      ],
      totaalSamenvatting: "oud totaal",
    };
    const parsed = Stap5ResultSchema.safeParse(oldShape);
    expect(parsed.success).toBe(false);
  });

  test("Test 4: wijst breedteOordeel buiten enum af", () => {
    const invalidEnum = {
      focusDoelId: "goal-1",
      focusDoelNaam: "Doel",
      inspanningReview: [
        {
          inspanningId: "eff-1",
          breedteOordeel: "needs_broadening", // Engelse hallucinatie — moet falen
          toelichting: "Fout",
        },
      ],
      samenvatting: "x",
    };
    const parsed = Stap5ResultSchema.safeParse(invalidEnum);
    expect(parsed.success).toBe(false);
  });

  test("Test 5: vereist focusDoelId en focusDoelNaam (non-optional)", () => {
    const missingFocus = {
      samenvatting: "x",
    };
    const parsed = Stap5ResultSchema.safeParse(missingFocus);
    expect(parsed.success).toBe(false);
  });
});
