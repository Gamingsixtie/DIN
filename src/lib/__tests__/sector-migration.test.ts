import { describe, it, expect } from "vitest";
import { AISectorplanAnalyseSchema } from "@/lib/schemas";
import { migrateSectorAnalyses } from "@/lib/session-context";

const validAnalysis = {
  samenvatting: "Test samenvatting",
  aansluiting: {
    titel: "Aansluiting",
    toelichting: "Toelichting aansluiting",
    punten: ["punt 1"],
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
};

describe("sector-migration", () => {
  it("stores typed object — AISectorplanAnalyseSchema accepts valid analysis", () => {
    const result = AISectorplanAnalyseSchema.safeParse(validAnalysis);
    expect(result.success).toBe(true);
  });

  it("migrates legacy string to typed object", () => {
    const result = migrateSectorAnalyses({
      PO: JSON.stringify(validAnalysis),
    });
    expect(result.needsToast).toBe(false);
    expect(result.migrated).toHaveProperty("PO");
    expect(result.migrated.PO.samenvatting).toBe("Test samenvatting");
    expect(result.migrated.PO.baten.punten).toEqual(["baat 1", "baat 2"]);
  });

  it("discards invalid string data", () => {
    const result = migrateSectorAnalyses({
      PO: "# Markdown analyse\nGeen JSON",
    });
    expect(result.needsToast).toBe(true);
    expect(result.migrated).not.toHaveProperty("PO");
  });

  it("keeps valid objects unchanged", () => {
    const result = migrateSectorAnalyses({
      PO: validAnalysis,
    });
    expect(result.needsToast).toBe(false);
    expect(result.migrated).toHaveProperty("PO");
    expect(result.migrated.PO.samenvatting).toBe("Test samenvatting");
  });
});
