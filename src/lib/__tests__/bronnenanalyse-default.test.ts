// Stap 12 — Bronnenanalyse: bewaakt de seed (schema, ids, caps, verwijzingen), de merge met de
// sessie en de pure servicefuncties. Generiek over alle bronnen, zodat de test ook na het vullen
// van de bulk-seed (spoor B) blijft gelden.

import { describe, it, expect } from "vitest";
import { BronnenAnalyseSchema } from "@/lib/schemas";
import type { Bron, BronAnalyse, BronnenAnalyse, NogNodigItem } from "@/lib/schemas";
import {
  BRONNENANALYSE_SEED_VERSIE,
  DEFAULT_BRONNEN_ANALYSE,
  TE_BEPALEN,
  mergeBronnenAnalyse,
} from "@/lib/bronnenanalyse-default";
import {
  CITAAT_MAX,
  OPEN_PUNTEN_MAX,
  SAMENVATTING_MAX,
  berekenDekkingMatrix,
  bronLabel,
  capBronAnalyse,
  pasAnalyseToe,
  verifieerCitaat,
  voorstellenNogNodig,
} from "@/lib/bronnenanalyse-service";
import { DEFAULT_ORGANIGRAM } from "@/lib/organigram-default";

const UUID = /[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/i;
const SEED = DEFAULT_BRONNEN_ANALYSE;
const WERKSTROOM_IDS = new Set(DEFAULT_ORGANIGRAM.werkstromen.map((w) => w.id));

// ---------- fixtures (neutrale testteksten) ----------

function analyse(werkstroom: string, extra: Partial<BronAnalyse> = {}): BronAnalyse {
  return {
    samenvatting: "Testsamenvatting.",
    status: "bruikbaar",
    dekking: [
      {
        werkstroom,
        dekt: "Testdekking",
        citaat: "Een testcitaat.",
        vindplaats: "p. 1",
        domeinen: ["mens"],
        openPunten: ["Open testpunt"],
      },
    ],
    punten: [],
    door: "seed",
    geanalyseerdOp: "2026-10-01T00:00:00.000Z",
    ...extra,
  };
}

function bron(id: string, extra: Partial<Bron> = {}): Bron {
  return {
    id,
    titel: `Testbron ${id}`,
    bestandsnaam: "",
    type: "pdf",
    datum: "",
    herkomst: "upload",
    bewerkt: false,
    verwijderd: false,
    ...extra,
  };
}

function leeg(bronnen: Bron[] = [], nogNodig: NogNodigItem[] = []): BronnenAnalyse {
  return {
    bronnen,
    nogNodig,
    werkstroomOordelen: [],
    kanNuInGang: [],
    werkstroomConclusies: {},
    puntConclusies: {},
    seedVersie: BRONNENANALYSE_SEED_VERSIE,
  };
}

// ---------- seed ----------

describe("seed DEFAULT_BRONNEN_ANALYSE", () => {
  it("voldoet aan het schema", () => {
    expect(() => BronnenAnalyseSchema.parse(SEED)).not.toThrow();
  });

  it("heeft unieke bron-ids die slugs zijn", () => {
    const ids = SEED.bronnen.map((b) => b.id);
    expect(new Set(ids).size).toBe(ids.length);
    for (const id of ids) expect(id).toMatch(/^[a-z0-9-]+$/);
  });

  it("heeft geen UUID in een titel", () => {
    for (const b of SEED.bronnen) expect(b.titel).not.toMatch(UUID);
  });

  it("houdt zich aan de caps voor citaat, samenvatting, openPunten en actiesNogTeDoen", () => {
    for (const b of SEED.bronnen) {
      const a = b.analyse;
      if (!a) continue;
      expect(a.samenvatting.length).toBeLessThanOrEqual(SAMENVATTING_MAX);
      for (const d of a.dekking) {
        expect((d.citaat ?? "").length).toBeLessThanOrEqual(CITAAT_MAX);
        expect(d.openPunten.length).toBeLessThanOrEqual(OPEN_PUNTEN_MAX);
      }
      for (const p of a.punten) {
        expect((p.citaat ?? "").length).toBeLessThanOrEqual(CITAAT_MAX);
        expect(p.actiesNogTeDoen.length).toBeLessThanOrEqual(OPEN_PUNTEN_MAX);
      }
    }
  });

  it("heeft de actuele seedVersie", () => {
    expect(SEED.seedVersie).toBe(BRONNENANALYSE_SEED_VERSIE);
  });

  it("laat elke versieVan naar een bestaande bron wijzen", () => {
    const ids = new Set(SEED.bronnen.map((b) => b.id));
    for (const b of SEED.bronnen) if (b.versieVan) expect(ids.has(b.versieVan)).toBe(true);
  });

  it("geeft elk nogNodig-item een niet-leeg bron-label", () => {
    for (const n of SEED.nogNodig) expect(n.bron.trim().length).toBeGreaterThan(0);
  });

  it("verwijst in de dekking alleen naar werkstromen uit het organigram", () => {
    for (const b of SEED.bronnen) {
      for (const d of b.analyse?.dekking ?? []) expect(WERKSTROOM_IDS.has(d.werkstroom)).toBe(true);
    }
  });
});

// ---------- merge ----------

describe("mergeBronnenAnalyse", () => {
  it("geeft zonder opgeslagen data de seed terug, als diepe kopie", () => {
    const m = mergeBronnenAnalyse(undefined);
    expect(m).toEqual(SEED);
    expect(m).not.toBe(SEED);
    expect(m.bronnen).not.toBe(SEED.bronnen);
    if (m.bronnen.length > 0) expect(m.bronnen[0]).not.toBe(SEED.bronnen[0]);
    expect(mergeBronnenAnalyse(null)).toEqual(SEED);
  });

  it("laat de sessie-bron winnen op id", () => {
    const seedBron = SEED.bronnen[0];
    const m = mergeBronnenAnalyse({ bronnen: [{ ...seedBron, titel: "Andere titel", bewerkt: true }] });
    const b = m.bronnen.find((x) => x.id === seedBron.id)!;
    expect(b.titel).toBe("Andere titel");
    expect(m.bronnen.filter((x) => x.id === seedBron.id)).toHaveLength(1);
  });

  it("vult een ontbrekende seed-bron aan", () => {
    const m = mergeBronnenAnalyse({ bronnen: [bron("eigen-bron")] });
    expect(m.bronnen.some((b) => b.id === "eigen-bron")).toBe(true);
    for (const s of SEED.bronnen) expect(m.bronnen.some((b) => b.id === s.id)).toBe(true);
  });

  it("houdt een tombstone als tombstone", () => {
    const seedBron = SEED.bronnen[0];
    const m = mergeBronnenAnalyse({ bronnen: [{ ...seedBron, verwijderd: true }] });
    const b = m.bronnen.find((x) => x.id === seedBron.id)!;
    expect(b.verwijderd).toBe(true);
    expect(m.bronnen.filter((x) => x.id === seedBron.id)).toHaveLength(1);
  });

  it("laat een bewerkte bron zijn eigen analyse houden", () => {
    const werkstroom = DEFAULT_ORGANIGRAM.werkstromen[0].id;
    const eigen = analyse(werkstroom, { samenvatting: "Eigen analyse.", door: "handmatig" });
    // bij voorkeur een seed-bron mét analyse; zolang de seed er geen heeft, de eerste seed-bron
    const seedBron = SEED.bronnen.find((b) => b.analyse) ?? SEED.bronnen[0];
    const m = mergeBronnenAnalyse({
      seedVersie: 0,
      bronnen: [{ ...seedBron, bewerkt: true, analyse: eigen }],
    });
    const b = m.bronnen.find((x) => x.id === seedBron.id)!;
    expect(b.analyse?.samenvatting).toBe("Eigen analyse.");
    expect(b.analyse?.door).toBe("handmatig");
  });

  it("houdt een afgerond nogNodig-item afgerond, ook als de seed het als open heeft", () => {
    const seedItem: NogNodigItem =
      SEED.nogNodig[0] ?? { id: "test-item", tekst: TE_BEPALEN, actie: "", status: "open", bron: "Testbron", bewerkt: false };
    const m = mergeBronnenAnalyse({ nogNodig: [{ ...seedItem, status: "afgerond" }] });
    const items = m.nogNodig.filter((n) => n.id === seedItem.id);
    expect(items).toHaveLength(1);
    expect(items[0].status).toBe("afgerond");
  });

  it("crasht niet op een oude sessie zonder bewerkt/verwijderd-velden", () => {
    const oud = {
      bronnen: [
        { id: "oude-bron", titel: "Oude bron", type: "pdf", herkomst: "upload" },
        {
          id: "oude-bron-2",
          titel: "Oude bron 2",
          type: "docx",
          herkomst: "mail",
          analyse: { samenvatting: "x", status: "bruikbaar", door: "claude", geanalyseerdOp: "2026-10-01" },
        },
      ],
      nogNodig: [{ id: "n1", tekst: "iets", bron: "Oude bron" }],
    } as unknown as Partial<BronnenAnalyse>;
    const m = mergeBronnenAnalyse(oud);
    const b = m.bronnen.find((x) => x.id === "oude-bron")!;
    expect(b.bewerkt).toBe(false);
    expect(b.verwijderd).toBe(false);
    expect(b.bestandsnaam).toBe("");
    const b2 = m.bronnen.find((x) => x.id === "oude-bron-2")!;
    expect(b2.analyse?.dekking).toEqual([]);
    expect(b2.analyse?.punten).toEqual([]);
    expect(m.nogNodig[0].status).toBe("open");
    expect(m.seedVersie).toBe(BRONNENANALYSE_SEED_VERSIE);
    expect(() => BronnenAnalyseSchema.parse(m)).not.toThrow();
  });
});

// ---------- servicefuncties ----------

describe("bronnenanalyse-service", () => {
  it("verifieerCitaat negeert witruimte, hoofdletters en typografische aanhalingstekens", () => {
    const bron = "Hij zei: “We   gaan\nnu  STARTEN” en dat is ‘fijn’.";
    expect(verifieerCitaat('we gaan nu starten" en dat is \'fijn\'', bron)).toBe(true);
    expect(verifieerCitaat("We gaan nu   beginnen", bron)).toBe(false);
    expect(verifieerCitaat("", bron)).toBe(false);
    expect(verifieerCitaat("   ", bron)).toBe(false);
  });

  it("capBronAnalyse kapt een te lang citaat af op hoogstens CITAAT_MAX tekens", () => {
    const a = analyse("klantreizen");
    a.dekking[0].citaat = "a".repeat(400);
    a.dekking[0].openPunten = ["1", "2", "3", "4", "5"];
    a.samenvatting = "b".repeat(900);
    const c = capBronAnalyse(a);
    expect(c.dekking[0].citaat.length).toBeLessThanOrEqual(CITAAT_MAX);
    expect(c.dekking[0].openPunten).toHaveLength(OPEN_PUNTEN_MAX);
    expect(c.samenvatting.length).toBeLessThanOrEqual(SAMENVATTING_MAX);
  });

  it("pasAnalyseToe overschrijft een bewerkte bron alleen met forceer", () => {
    const eigen = analyse("klantreizen", { samenvatting: "Eigen.", door: "handmatig" });
    const nieuw = analyse("klantreizen", { samenvatting: "Nieuw.", door: "claude" });
    const ba = leeg([bron("b1", { bewerkt: true, analyse: eigen })]);
    const zonder = pasAnalyseToe(ba, "b1", nieuw);
    expect(zonder.bronnen[0].analyse?.samenvatting).toBe("Eigen.");
    const met = pasAnalyseToe(ba, "b1", nieuw, { forceer: true });
    expect(met.bronnen[0].analyse?.samenvatting).toBe("Nieuw.");
    expect(met.bronnen[0].bewerkt).toBe(false);
    // het origineel blijft ongemoeid
    expect(ba.bronnen[0].analyse?.samenvatting).toBe("Eigen.");
  });

  it("berekenDekkingMatrix markeert een werkstroom zonder bruikbare bron als te bepalen", () => {
    const ws = [
      { id: "w1", naam: "Werkstroom 1" },
      { id: "w2", naam: "Werkstroom 2" },
      { id: "w3", naam: "Werkstroom 3" },
    ];
    const ba = leeg([
      bron("b1", { analyse: analyse("w1") }),
      bron("b2", { analyse: analyse("w3", { status: "verouderd" }) }),
    ]);
    const m = berekenDekkingMatrix(ba, ws);
    expect(m.find((r) => r.werkstroom === "w1")!.teBepalen).toBe(false);
    expect(m.find((r) => r.werkstroom === "w2")!.teBepalen).toBe(true);
    // alleen een verouderde bron = wel "wat hebben we al", maar niets bruikbaars
    const w3 = m.find((r) => r.werkstroom === "w3")!;
    expect(w3.watHebbenWeAl).toHaveLength(1);
    expect(w3.teBepalen).toBe(true);
  });

  it("voorstellenNogNodig muteert ba.nogNodig niet", () => {
    const ws = [
      { id: "w1", naam: "Werkstroom 1" },
      { id: "w2", naam: "Werkstroom 2" },
    ];
    const bestaand: NogNodigItem = { id: "n1", tekst: "Bestaand", actie: "", status: "open", bron: "Testbron", bewerkt: false };
    const ba = leeg([bron("b1", { analyse: analyse("w1") })], [bestaand]);
    const voor = JSON.stringify(ba.nogNodig);
    const voorstellen = voorstellenNogNodig(ba, ws);
    expect(voorstellen.length).toBeGreaterThan(0);
    expect(JSON.stringify(ba.nogNodig)).toBe(voor);
    expect(ba.nogNodig).toHaveLength(1);
    for (const v of voorstellen) expect(v.bron.trim().length).toBeGreaterThan(0);
  });

  it("bronLabel geeft voor een onbekend of leeg id een streepje", () => {
    const ba = leeg([bron("b1")]);
    expect(bronLabel(ba, "bestaat-niet")).toBe("—");
    expect(bronLabel(ba, undefined)).toBe("—");
    expect(bronLabel(ba, "b1")).toBe("Testbron b1");
  });
});
