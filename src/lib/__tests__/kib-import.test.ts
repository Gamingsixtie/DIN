import { describe, it, expect } from "vitest";
import { parseKiBExport, importFromKiB, extractGoals } from "../kib-import";

describe("parseKiBExport", () => {
  it("retourneert gevalideerd object bij geldig JSON met visie, doelen, scope", () => {
    const json = JSON.stringify({
      visie: { uitgebreid: "Lange visie tekst", beknopt: "Kort" },
      doelen: [
        { naam: "Doel 1", beschrijving: "Beschrijving 1", rang: 1 },
        { naam: "Doel 2", beschrijving: "Beschrijving 2", rang: 2 },
      ],
      scope: { binnen: ["Item A"], buiten: ["Item B"] },
      sessionId: "abc-123",
    });

    const result = parseKiBExport(json);

    expect(result.visie).toBeDefined();
    expect(result.visie!.uitgebreid).toBe("Lange visie tekst");
    expect(result.visie!.beknopt).toBe("Kort");
    expect(result.doelen).toHaveLength(2);
    expect(result.doelen[0].naam).toBe("Doel 1");
    expect(result.scope).toBeDefined();
    expect(result.scope!.binnen).toEqual(["Item A"]);
    expect(result.sessionId).toBe("abc-123");
  });

  it("retourneert object met doelen als alleen doelen aanwezig zijn (geen visie, geen scope)", () => {
    const json = JSON.stringify({
      doelen: [{ naam: "Enig doel", beschrijving: "Test", rang: 1 }],
    });

    const result = parseKiBExport(json);

    expect(result.doelen).toHaveLength(1);
    expect(result.visie).toBeUndefined();
    expect(result.scope).toBeUndefined();
  });

  it("retourneert object met doelen: [] bij leeg object {}", () => {
    const json = "{}";

    const result = parseKiBExport(json);

    expect(result.doelen).toEqual([]);
  });

  it("gooit Error met 'Ongeldig JSON formaat' bij ongeldige JSON string", () => {
    expect(() => parseKiBExport("niet json")).toThrow("Ongeldig JSON formaat");
  });

  it("gooit Error met 'Ongeldig KiB-formaat' bij ontbrekend verplicht veld in doel (geen naam)", () => {
    const json = JSON.stringify({
      doelen: [{ beschrijving: "Zonder naam", rang: 1 }],
    });

    expect(() => parseKiBExport(json)).toThrow("Ongeldig KiB-formaat");
  });

  it("gooit Error bij doel met ontbrekende rang", () => {
    const json = JSON.stringify({
      doelen: [{ naam: "Test", beschrijving: "Beschrijving" }],
    });

    expect(() => parseKiBExport(json)).toThrow("Ongeldig KiB-formaat");
  });
});

describe("importFromKiB", () => {
  it("retourneert vision, goals array, scope bij compleet KiB export", () => {
    const json = JSON.stringify({
      visie: { uitgebreid: "Uitgebreide visie", beknopt: "Beknopt" },
      doelen: [{ naam: "Doel A", beschrijving: "Beschrijving A", rang: 1 }],
      scope: { binnen: ["In scope"], buiten: ["Uit scope"] },
    });

    const result = importFromKiB(json);

    expect(result.vision).toBeDefined();
    expect(result.vision!.uitgebreid).toBe("Uitgebreide visie");
    expect(result.goals).toHaveLength(1);
    expect(result.goals[0].name).toBe("Doel A");
    expect(result.scope).toBeDefined();
    expect(result.scope!.inScope).toEqual(["In scope"]);
  });

  it("retourneert goals: [] bij lege doelen", () => {
    const json = JSON.stringify({
      visie: { uitgebreid: "Visie", beknopt: "Kort" },
    });

    const result = importFromKiB(json);

    expect(result.goals).toEqual([]);
  });
});

describe("extractGoals", () => {
  it("genereert UUID ids als id ontbreekt in KiB data", () => {
    const data = {
      doelen: [
        { naam: "Doel zonder ID", beschrijving: "Test", rang: 1 },
        { naam: "Doel met ID", beschrijving: "Test 2", rang: 2, id: "bestaand-id" },
      ],
    };

    const goals = extractGoals(data);

    expect(goals).toHaveLength(2);
    // Eerste doel heeft geen id in data, moet UUID krijgen
    expect(goals[0].id).toBeTruthy();
    expect(goals[0].id).not.toBe("");
    // Tweede doel heeft een bestaand id
    expect(goals[1].id).toBe("bestaand-id");
  });
});
