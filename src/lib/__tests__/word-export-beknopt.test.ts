import { describe, it, expect } from "vitest";
import type { DINSession } from "@/lib/types";
import {
  kiesActiefScenario,
  verzamelBeknoptData,
  verzamelOpenstaand,
  buildBeknoptSections,
  TE_BEPALEN,
} from "@/lib/word-export-beknopt";

// --- Fixtures ---

/** Kale sessie: geen cross-analyse, geen planning, geen programmaorganisatie. */
function createMinimalSession(overrides?: Record<string, unknown>): DINSession {
  return {
    id: "s1",
    name: "Test Programma",
    createdAt: "2026-01-01",
    updatedAt: "2026-01-01",
    version: 1,
    currentStep: 1,
    goals: [
      { id: "g1", name: "Doel 1", description: "Eerste doel", rank: 1 },
      { id: "g2", name: "Doel 2", description: "Tweede doel", rank: 2 },
    ],
    vision: { id: "v1", beknopt: "Korte visie", uitgebreid: "Uitgebreide visie" },
    scope: { id: "sc1", inScope: ["Binnen A"], outScope: ["Buiten B"] },
    sectorPlans: [],
    pmcEntries: [],
    benefits: [],
    capabilities: [],
    efforts: [],
    goalBenefitMaps: [],
    benefitCapabilityMaps: [],
    capabilityEffortMaps: [],
    projectCapabilityMaps: [],
    completedGoals: [],
    clusterRasci: [],
    itemRasci: [],
    gezamenlijkeRasci: [],
    ...overrides,
  } as unknown as DINSession;
}

const UUID_A = "aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee";
const UUID_ONBEKEND = "11111111-2222-3333-4444-555555555555";

/** Volledig gevulde sessie met subEfforts in willekeurige (niet-outside-in) volgorde. */
function createRichSession(overrides?: Record<string, unknown>): DINSession {
  return createMinimalSession({
    benefits: [
      {
        id: "b1",
        goalId: "g1",
        sectorId: "PO",
        title: "Baat PO",
        description: "Beschrijving baat PO",
        profiel: { indicator: "NPS", indicatorOwner: "M", currentValue: "1", targetValue: "2" },
      },
    ],
    capabilities: [
      { id: "c1", sectorId: "PO", title: "Vermogen PO", description: "d", relatedSectors: ["PO"] },
    ],
    efforts: [
      {
        id: UUID_A,
        sectorId: "PO",
        title: "Sector-inspanning PO",
        description: "d",
        domain: "mens",
        status: "gepland",
        dependencies: [],
      },
    ],
    goalBenefitMaps: [{ goalId: "g1", benefitId: "b1" }],
    benefitCapabilityMaps: [{ benefitId: "b1", capabilityId: "c1" }],
    crossAnalyseWizard: {
      currentStep: 8,
      completedSteps: [1, 2, 3, 4],
      stepResults: {
        stap2: {
          samenvatting: "s",
          vermogenGelijkenisGroepen: [
            {
              id: "grp1",
              vermogenIds: ["c1"],
              gezamenlijkeOmschrijving: "Gedeeld commercieel vermogen",
              reden: "Alle sectoren hebben dit nodig",
            },
          ],
        },
        // Bewust NIET outside-in gesorteerd — de export moet zelf sorteren.
        stap4: {
          samenvatting: "s",
          subEffortAnalysis: [
            {
              groepId: "grp1",
              domein: "processen",
              actie: "combineren",
              items: [UUID_A, UUID_ONBEKEND],
              reden: "r",
              titel: "Processen-inspanning",
              beschrijving: "Beschrijving processen",
              dossier: {
                eigenaar: "E",
                inspanningsleider: "L",
                verwachtResultaat: "R",
                kostenraming: "K",
                randvoorwaarden: "V",
              },
            },
            {
              groepId: "grp1",
              domein: "data_systemen",
              actie: "combineren",
              items: [],
              reden: "r",
              titel: "Data-inspanning",
              beschrijving: "Beschrijving data",
              dossier: {
                eigenaar: "E",
                inspanningsleider: "L",
                verwachtResultaat: "R",
                kostenraming: "K",
                randvoorwaarden: "V",
              },
            },
            {
              groepId: "grp1",
              domein: "cultuur",
              actie: "combineren",
              items: [],
              reden: "r",
              titel: "Cultuur-inspanning",
              beschrijving: "Beschrijving cultuur",
              dossier: {
                eigenaar: "E",
                inspanningsleider: "L",
                verwachtResultaat: "R",
                kostenraming: "K",
                randvoorwaarden: "V",
              },
            },
            {
              groepId: "grp1",
              domein: "mens",
              actie: "combineren",
              items: [],
              reden: "r",
              titel: "Mens-inspanning",
              beschrijving: "Beschrijving mens",
              dossier: {
                eigenaar: "E",
                inspanningsleider: "L",
                verwachtResultaat: "R",
                kostenraming: "K",
                randvoorwaarden: "V",
              },
            },
          ],
          begrotingAdvies: {
            jaarlijksBudgetBasis: 100000,
            startJaar: 2026,
            cyclusMaanden: 9,
            vergelijking: "",
            partialFailures: [],
            scenarios: {
              optimaal: {
                label: "optimaal",
                jaarlijksBudgetEuro: 100000,
                aantalJaren: 2,
                totaalGeraamdEuro: 200000,
                prioriteitAdvies: "",
                samenvatting: "SAMENVATTING-ONGESCHOOND",
                totalenPerJaar: [
                  { jaar: 2026, euro: 100000, percentage: 50 },
                  { jaar: 2027, euro: 100000, percentage: 50 },
                ],
                inspanningen: [
                  {
                    inspanningTitel: "Processen-inspanning",
                    domein: "processen",
                    totaalEuro: 120000,
                    percentageTotaal: 60,
                    motivatie: "m",
                    verdelingPerJaar: [],
                    volgorde: { rank: 1, reden: "r" },
                  },
                  {
                    inspanningTitel: "Cultuur-inspanning",
                    domein: "cultuur",
                    totaalEuro: 80000,
                    percentageTotaal: 40,
                    motivatie: "m",
                    verdelingPerJaar: [],
                    volgorde: { rank: 2, reden: "r" },
                  },
                ],
              },
            },
          },
          stap7InterneUren: {
            uurtariefSettings: { basisTarief: 75, referentiejaar: 2026, indexatiePercentage: 2 },
            partialFailures: [],
            scenarios: {
              optimaal: {
                scenarioLabel: "optimaal",
                aantalJaren: 2,
                startJaar: 2026,
                uurtariefGebruikt: 75,
                domeinen: [],
                totaalUren: 400,
                totaalKosten: 30000,
                totalenPerJaar: [
                  { jaar: 2026, uren: 200, kosten: 15000 },
                  { jaar: 2027, uren: 200, kosten: 15000 },
                ],
              },
            },
          },
        },
        stap5: { focusDoelId: "g1", focusDoelNaam: "Doel 1", batenDekking: [], samenvatting: "s" },
      },
    },
    planningVoorstel: {
      samenvatting: "Planning samenvatting",
      toelichting: "Toelichting van de programma-eigenaar",
      bundelPlanning: [
        {
          bundelId: "grp1:cultuur",
          domein: "cultuur",
          titel: "Cultuur-inspanning",
          startKwartaal: "Q2 2026",
          eindKwartaal: "Q4 2026",
          cyclusLabel: "Cyclus 1",
          beargumentatie: "b",
          afhankelijkVan: [],
          mijlpalen: [{ periode: "Q3 2026", mijlpaal: "Eerste cohort gestart" }],
        },
      ],
    },
    programmaorganisatie: {
      opdrachtgever: { id: "r1", rol: "Opdrachtgever", naam: "A. Jansen", functie: "Directeur" },
      programmamanager: { id: "r2", rol: "Programmamanager", naam: "", functie: "PM" },
      kerngroep: [],
      stuurgroep: [],
      adviesgroep: [],
      klankbordgroep: [],
      domeineigenaren: [],
      besluitvormingsritme: "Maandelijks",
      escalatiepad: "Via de stuurgroep",
    },
    ...overrides,
  });
}

/** Loopt door de docx-objectboom en verzamelt alle tekst. */
function extractText(children: unknown[]): string {
  const texts: string[] = [];

  function walk(obj: unknown) {
    if (typeof obj === "string") {
      if (obj !== "preserve" && obj.length > 0) texts.push(obj);
      return;
    }
    if (!obj || typeof obj !== "object") return;
    const o = obj as Record<string, unknown>;
    if ("text" in o && typeof o.text === "string") texts.push(o.text);
    if ("root" in o && Array.isArray(o.root)) o.root.forEach(walk);
    if ("children" in o && Array.isArray(o.children)) o.children.forEach(walk);
    if ("options" in o && typeof o.options === "object" && o.options !== null) walk(o.options);
    if ("rows" in o && Array.isArray(o.rows)) o.rows.forEach(walk);
  }

  children.forEach(walk);
  return texts.join(" ");
}

function volledigeTekst(session: DINSession): string {
  return buildBeknoptSections(session)
    .map((s) => extractText(s.children as unknown[]))
    .join(" ");
}

// --- Tests ---

describe("kiesActiefScenario", () => {
  it("gebruikt het vastgelegde actiefScenario uit stap 8", () => {
    const session = createRichSession({
      crossAnalyseWizard: {
        currentStep: 8,
        completedSteps: [],
        stepResults: {
          stap8: {
            actiefScenario: "plus20",
            scenarios: { plus20: { scenarioLabel: "plus20", perJaar: [], totaalOutOfPocket: 0, totaalInterneUren: 0, totaalGeraamd: 0 } },
          },
        },
      },
    });
    expect(kiesActiefScenario(session)).toBe("plus20");
  });

  it("valt terug op advies wanneer stap 8 niets heeft vastgelegd", () => {
    const session = createMinimalSession({
      crossAnalyseWizard: {
        currentStep: 6,
        completedSteps: [],
        stepResults: {
          stap4: {
            samenvatting: "s",
            subEffortAnalysis: [],
            begrotingAdvies: {
              jaarlijksBudgetBasis: 0,
              startJaar: 2026,
              cyclusMaanden: 9,
              vergelijking: "",
              partialFailures: [],
              scenarios: { advies: { label: "advies", jaarlijksBudgetEuro: 0, aantalJaren: 1, totaalGeraamdEuro: 1, prioriteitAdvies: "", samenvatting: "", totalenPerJaar: [], inspanningen: [] } },
            },
          },
        },
      },
    });
    expect(kiesActiefScenario(session)).toBe("advies");
  });

  it("valt terug op optimaal wanneer er niets is doorgerekend", () => {
    expect(kiesActiefScenario(createMinimalSession())).toBe("optimaal");
  });
});

describe("verzamelOpenstaand", () => {
  it("meldt een leeg verplicht dossierveld", () => {
    const session = createRichSession();
    const data = verzamelBeknoptData(session);
    // programmamanager heeft een lege naam
    const punten = verzamelOpenstaand(data).map((p) => p.tekst);
    expect(punten.some((t) => t.toLowerCase().includes("programmamanager"))).toBe(true);
  });

  it("ontdubbelt identieke punten", () => {
    const data = verzamelBeknoptData(createRichSession());
    const punten = verzamelOpenstaand(data);
    const sleutels = punten.map((p) => `${p.hoofdstuk}|${p.tekst}`);
    expect(new Set(sleutels).size).toBe(sleutels.length);
  });
});

describe("buildBeknoptSections", () => {
  it("bevat geen enkele UUID (CLAUDE.md-regel 9)", () => {
    const tekst = volledigeTekst(createRichSession());
    expect(tekst).not.toMatch(/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/i);
  });

  it("resolveert effort-IDs naar leesbare titels", () => {
    // De gebundelde sector-inspanningen staan niet meer in het beknopte document
    // (te lang), maar de resolutie moet blijven werken: geen UUID's in de data.
    const data = verzamelBeknoptData(createRichSession());
    const processen = data.inspanningen.find((i) => i.domein === "processen");
    expect(processen?.gebundeld).toContain("Sector-inspanning PO");
    // De onbekende UUID uit items[] is weggefilterd, niet doorgegeven.
    expect(processen?.gebundeld).toHaveLength(1);
  });

  it("sorteert de domeinen outside-in: cultuur, mens, data & systemen, processen", () => {
    const tekst = volledigeTekst(createRichSession());
    const cultuur = tekst.indexOf("Cultuur-inspanning");
    const mens = tekst.indexOf("Mens-inspanning");
    const data = tekst.indexOf("Data-inspanning");
    const processen = tekst.indexOf("Processen-inspanning");
    expect(cultuur).toBeGreaterThan(-1);
    expect(cultuur).toBeLessThan(mens);
    expect(mens).toBeLessThan(data);
    expect(data).toBeLessThan(processen);
  });

  it("gooit niet op een kale sessie en toont 'te bepalen'", () => {
    const session = createMinimalSession();
    expect(() => buildBeknoptSections(session)).not.toThrow();
    const secties = buildBeknoptSections(session);
    expect(secties.length).toBeGreaterThan(0);
    expect(volledigeTekst(session)).toContain(TE_BEPALEN);
  });

  it("laat hoofdstuk 6 (Wie) weg zonder programmaorganisatie", () => {
    const zonder = createRichSession({ programmaorganisatie: undefined });
    expect(volledigeTekst(zonder)).not.toContain("Besluitvormingsritme");
    expect(volledigeTekst(createRichSession())).toContain("Besluitvormingsritme");
  });

  it("toont de raming van het actieve scenario", () => {
    const tekst = volledigeTekst(createRichSession());
    // 200.000 out-of-pocket + 30.000 interne kosten = 230.000
    expect(tekst).toContain("230.000");
  });

  it("rendert begrotings-proza niet zonder tekstenSchoon-vlag", () => {
    const tekst = volledigeTekst(createRichSession());
    expect(tekst).not.toContain("SAMENVATTING-ONGESCHOOND");
  });

  it("noemt de vier hoofdstuktitels", () => {
    const tekst = volledigeTekst(createRichSession());
    expect(tekst).toContain("Besluiten in het kort");
    expect(tekst).toContain("Het DIN in één beeld");
    expect(tekst).toContain("De vier inspanningen");
    expect(tekst).toContain("Wat nog open staat");
  });

  it("nummert de hoofdstukken 1 t/m 7 — de ongenummerde besluitenpagina schuift niets op", () => {
    const tekst = volledigeTekst(createRichSession());
    expect(tekst).toContain("1. Waar het programma over gaat");
    expect(tekst).toContain("2. Het DIN in één beeld");
    expect(tekst).toContain("3. De vier inspanningen");
    expect(tekst).toContain("4. Wat het kost");
    expect(tekst).toContain("5. Wanneer");
    expect(tekst).toContain("6. Wie");
    // Hoofdstuk 7 moet kloppen: de besluitenpagina verwijst ernaar.
    expect(tekst).toContain("7. Wat nog open staat");
  });

  it("toont geen NaN of undefined bij een begrotingspost zonder percentage", () => {
    const session = createRichSession();
    const begroting = session.crossAnalyseWizard!.stepResults!.stap4!.begrotingAdvies!;
    // Post onvoorzien: domein "overig", geen percentageTotaal — komt echt zo voor.
    (begroting.scenarios.optimaal!.inspanningen as unknown[]).push({
      inspanningTitel: "Post onvoorzien (programma-breed)",
      domein: "overig",
      totaalEuro: 57000,
      percentageTotaal: undefined,
      motivatie: "m",
      verdelingPerJaar: [],
      volgorde: { rank: 9, reden: "r" },
    });
    const tekst = volledigeTekst(session);
    expect(tekst).not.toContain("NaN");
    expect(tekst).not.toContain("undefined");
    expect(tekst).toContain("Post onvoorzien (programma-breed)");
    // "overig" hoort achteraan, niet vóór cultuur.
    expect(tekst.indexOf("Cultuur-inspanning")).toBeLessThan(
      tekst.indexOf("Post onvoorzien (programma-breed)")
    );
  });

  it("behandelt getypte placeholders zoals 'ntb' als nog niet ingevuld", () => {
    const session = createRichSession();
    const subs = session.crossAnalyseWizard!.stepResults!.stap4!.subEffortAnalysis as unknown as {
      dossier: { verwachtResultaat: string; eigenaar: string };
    }[];
    subs[0].dossier.verwachtResultaat = "NTB";
    subs[1].dossier.eigenaar = "nader te bepalen";

    const data = verzamelBeknoptData(session);
    const punten = verzamelOpenstaand(data).map((p) => p.tekst.toLowerCase());
    expect(punten.some((t) => t.includes("verwacht resultaat"))).toBe(true);
    expect(punten.some((t) => t.includes("eigenaar"))).toBe(true);

    const tekst = volledigeTekst(session);
    expect(tekst).not.toContain("NTB");
    expect(tekst).toContain(TE_BEPALEN);
  });
});
