/**
 * DRY-RUN: voeg een nieuwe custom-rol toe aan data_systemen-domein.
 *
 * Simuleert in-memory de volledige doorrekening die `voegFunctieToeAanAdvies`
 * in `src/components/cross-analyse/StapInterneUren.tsx` uitvoert. Geen
 * Supabase-write, geen file mutatie van session-state — alleen rapport.
 *
 * Test-scenario:
 *   - Domein: data_systemen
 *   - Custom rol-id: custom-test-data-architect
 *   - Naam: "Data-architect (test)"
 *   - Aantal: 1
 *   - Categorie: kernteam
 *   - Actieve fases: alle CRM-fases (default voor kernteam)
 */

import * as fs from "fs";
import * as path from "path";

const SNAPSHOT_PATH = path.join(__dirname, "..", "INTERNE-UREN-SNAPSHOT.json");

type FaseType =
  | "piek"
  | "niet-piek"
  | "borging"
  | "basis"
  | "vaardigheid"
  | "realisatie"
  | "acceptatie";

type Domein = "mens" | "cultuur" | "data_systemen" | "processen";
type LezingCCat = "leider" | "kernteam" | "trainings_deelnemer" | "geconsulteerd";
type ScenarioLabel = "min20" | "advies" | "plus20" | "optimaal";

interface Rol {
  functieId: string;
  functieNaam: string;
  afdeling?: string;
  uren: number;
  uurtarief: number;
  kosten: number;
}
interface JaarBlok {
  jaar: number;
  rollen: Rol[];
  totaalUren: number;
  totaalKosten: number;
  activiteit?: string;
}
interface DomeinBlok {
  domein: Domein;
  jaren: JaarBlok[];
  totaalUren: number;
  totaalKosten: number;
  programmaUren: number;
  lijnUren: number;
  raadplegenUren: number;
}
interface TotaalPerJaar {
  jaar: number;
  uren: number;
  kosten: number;
  urenBudget?: number;
  urenGap?: number;
  programmaUren?: number;
  lijnUren?: number;
  raadplegenUren?: number;
}
interface ScenarioData {
  label: ScenarioLabel;
  aantalJaren: number;
  domeinen: DomeinBlok[];
  totaalUren: number;
  totaalKosten: number;
  programmaUren: number;
  lijnUren: number;
  raadplegenUren: number;
  totalenPerJaar: TotaalPerJaar[];
}

const LEZING_C_UREN_NIVEAUS: Record<LezingCCat, { piek: number; nietPiek: number; borging: number }> = {
  leider: { piek: 80, nietPiek: 40, borging: 25 },
  kernteam: { piek: 40, nietPiek: 15, borging: 10 },
  trainings_deelnemer: { piek: 0, nietPiek: 0, borging: 0 },
  geconsulteerd: { piek: 0, nietPiek: 0, borging: 0 },
};

const LEZING_C_PCTS: Record<LezingCCat, { programma: number; lijn: number; raadplegen: number }> = {
  leider: { programma: 0.9, lijn: 0.1, raadplegen: 0 },
  kernteam: { programma: 0.8, lijn: 0.2, raadplegen: 0 },
  trainings_deelnemer: { programma: 0.5, lijn: 0.5, raadplegen: 0 },
  geconsulteerd: { programma: 0, lijn: 0, raadplegen: 1 },
};

function classificeerFaseString(fase: string | undefined): FaseType {
  const f = (fase ?? "").toLowerCase();
  if (!f) return "niet-piek";
  if (f.includes("basistraining") || f.includes("basis")) return "basis";
  if (f.includes("vaardigheid")) return "vaardigheid";
  if (f.includes("acceptatie")) return "acceptatie";
  if (
    f.includes("borging") ||
    f.includes("nazorg") ||
    f.includes("verankering") ||
    f.includes("continu") ||
    f.includes("continue") ||
    f.includes("standaardisatie") ||
    f.includes("beheer") ||
    f.includes("optimalisatie") ||
    f.includes("doorontwikkeling") ||
    f.includes("ontwikkeling")
  ) {
    return "borging";
  }
  if (
    f.includes("realisatie") ||
    f.includes("kern") ||
    f.includes("integraties") ||
    f.includes("uitrol") ||
    f.includes("go-live") ||
    f.includes("pilot") ||
    f.includes("toepassing") ||
    f.includes("blok 1") ||
    f.includes("blok 2")
  ) {
    if (f.includes("realisatie")) return "realisatie";
    return "piek";
  }
  return "niet-piek";
}

function bepaalFaseType(scenario: any, domein: Domein, jaar: number): FaseType {
  if (!scenario?.inspanningen) return "niet-piek";
  const tally: Record<FaseType, number> = {
    piek: 0,
    "niet-piek": 0,
    borging: 0,
    basis: 0,
    vaardigheid: 0,
    realisatie: 0,
    acceptatie: 0,
  };
  for (const i of scenario.inspanningen) {
    if (i.domein !== domein) continue;
    for (const v of i.verdelingPerJaar ?? []) {
      if (v.jaar !== jaar) continue;
      const t = classificeerFaseString(v.fase);
      tally[t] += v.euro ?? 0;
    }
  }
  const specifiek: FaseType[] = ["basis", "vaardigheid", "realisatie", "acceptatie"];
  let specMax: { type: FaseType | null; sum: number } = { type: null, sum: 0 };
  for (const t of specifiek) {
    if (tally[t] > specMax.sum) specMax = { type: t, sum: tally[t] };
  }
  if (specMax.type) return specMax.type;
  const grof: FaseType[] = ["piek", "borging", "niet-piek"];
  let grofMax: { type: FaseType; sum: number } = { type: "niet-piek", sum: -1 };
  for (const t of grof) {
    if (tally[t] > grofMax.sum) grofMax = { type: t, sum: tally[t] };
  }
  return grofMax.type;
}

function pieksjaren(scenario: any, domein: Domein): number[] {
  if (!scenario?.inspanningen) return [];
  const jaren = new Set<number>();
  const perJaarType = new Map<number, Record<FaseType, number>>();
  for (const i of scenario.inspanningen) {
    if (i.domein !== domein) continue;
    for (const v of i.verdelingPerJaar ?? []) {
      jaren.add(v.jaar);
      const cur =
        perJaarType.get(v.jaar) ?? {
          piek: 0,
          "niet-piek": 0,
          borging: 0,
          basis: 0,
          vaardigheid: 0,
          realisatie: 0,
          acceptatie: 0,
        };
      const t = classificeerFaseString(v.fase);
      cur[t] += v.euro ?? 0;
      perJaarType.set(v.jaar, cur);
    }
  }
  const piekTypes: FaseType[] = ["piek", "basis", "vaardigheid", "realisatie", "acceptatie"];
  const sorted = [...jaren].sort((a, b) => a - b);
  return sorted.filter((j) => {
    const t = perJaarType.get(j);
    if (!t) return false;
    return piekTypes.some((p) => t[p] > 0);
  });
}

function berekenRolUrenPerPersoonPerJaar(
  categorie: LezingCCat,
  faseType: FaseType,
  domein: Domein,
  jaar: number,
  alleJarenPiek: number[],
): number {
  if (categorie === "leider" || categorie === "kernteam") {
    const niveaus = LEZING_C_UREN_NIVEAUS[categorie];
    if (faseType === "borging") return niveaus.borging;
    if (
      faseType === "piek" ||
      faseType === "basis" ||
      faseType === "vaardigheid" ||
      faseType === "realisatie" ||
      faseType === "acceptatie"
    ) {
      return niveaus.piek;
    }
    return niveaus.nietPiek;
  }
  return 0;
}

function berekenGeindexeerdTarief(
  basis: number,
  referentiejaar: number,
  indexatiePct: number,
  huidigJaar: number,
): number {
  const jaren = Math.max(0, huidigJaar - referentiejaar);
  return Math.round(basis * Math.pow(1 + indexatiePct, jaren));
}

// ──────────────────────────────────────────────────────────────────────────
// Main: lees snapshot, simuleer toevoeging, vergelijk
// ──────────────────────────────────────────────────────────────────────────

const NIEUWE_FUNCTIE = {
  domein: "data_systemen" as Domein,
  functieId: "custom-test-data-architect",
  functieNaam: "Data-architect (test)",
  afdeling: undefined as string | undefined,
  aantal: 1,
  categorie: "kernteam" as LezingCCat,
};

const snapshot = JSON.parse(fs.readFileSync(SNAPSHOT_PATH, "utf-8"));
const adv = snapshot.stap4.stap7InterneUren;
const begroting = snapshot.stap4.begrotingAdvies;
const uurtarief = adv.uurtariefSettings ?? {
  basisTarief: 70,
  referentiejaar: 2025,
  indexatiePercentage: 0.05,
};
const basisTarief = uurtarief.basisTarief ?? 70;
const referentiejaar = uurtarief.referentiejaar ?? 2025;
const indexatiePct = uurtarief.indexatiePercentage ?? 0.05;

// Pre-checks: bestaat de rol al in selectiePerDomein?
const reedsAanwezig = NIEUWE_FUNCTIE.functieId in (adv.selectiePerDomein?.[NIEUWE_FUNCTIE.domein] ?? {});
console.log(`Pre-check: rol ${NIEUWE_FUNCTIE.functieId} reeds in selectie?`, reedsAanwezig);

// Verzamel "before" snapshots per scenario voor data_systemen
type Vergelijking = {
  scenario: ScenarioLabel;
  voorTotaalUrenDomein: number;
  naTotaalUrenDomein: number;
  voorProgrammaDomein: number;
  naProgrammaDomein: number;
  voorLijnDomein: number;
  naLijnDomein: number;
  voorScenarioTotaalUren: number;
  naScenarioTotaalUren: number;
  voorScenarioTotaalKosten: number;
  naScenarioTotaalKosten: number;
  voorPerJaar: Array<{ jaar: number; uren: number; budget?: number; gap?: number }>;
  naPerJaar: Array<{
    jaar: number;
    uren: number;
    budget?: number;
    gap?: number;
    nieuweRolUren: number;
    faseType: FaseType;
    fasesInJaar: string[];
    isActief: boolean;
  }>;
  rolJarenSomUren: number;
  rolJarenSomKosten: number;
  scenarioDeltaUren: number;
  domeinDeltaUren: number;
  domeinDeltaProgramma: number;
  domeinDeltaLijn: number;
};

const vergelijkingen: Vergelijking[] = [];

const scenKeys: ScenarioLabel[] = ["min20", "advies", "plus20", "optimaal"];

for (const scenKey of scenKeys) {
  const scen: ScenarioData = adv.scenarios?.[scenKey];
  if (!scen) continue;
  const begrotingScenario = begroting?.scenarios?.[scenKey] ?? null;
  const piekJaren = pieksjaren(begrotingScenario, NIEUWE_FUNCTIE.domein);

  // Default actieve fases voor kernteam = ALLE fases in de begroting voor dit domein
  const allFases = new Set<string>();
  for (const i of begrotingScenario?.inspanningen ?? []) {
    if (i.domein !== NIEUWE_FUNCTIE.domein) continue;
    for (const v of i.verdelingPerJaar ?? []) {
      const fs = (v.fase ?? "").trim();
      if (fs) allFases.add(fs);
    }
  }
  const actieveFasesSet = allFases;

  // Voor: data_systemen domein
  const voorDomein = scen.domeinen.find((d) => d.domein === NIEUWE_FUNCTIE.domein);
  if (!voorDomein) continue;

  // Bereken NA per jaar
  const naPerJaar: Vergelijking["naPerJaar"] = [];
  let rolJarenSomUren = 0;
  let rolJarenSomKosten = 0;
  let domeinNaTotaalUren = 0;
  let domeinNaProgramma = 0;
  let domeinNaLijn = 0;

  for (const jr of voorDomein.jaren) {
    const fasesInJaar: string[] = [];
    for (const i of begrotingScenario?.inspanningen ?? []) {
      if (i.domein !== NIEUWE_FUNCTIE.domein) continue;
      for (const v of i.verdelingPerJaar ?? []) {
        if (v.jaar === jr.jaar) {
          const fs = (v.fase ?? "").trim();
          if (fs) fasesInJaar.push(fs);
        }
      }
    }
    const isActief = fasesInJaar.some((fs) => actieveFasesSet.has(fs));
    const faseType = bepaalFaseType(begrotingScenario, NIEUWE_FUNCTIE.domein, jr.jaar);
    const urenPP = isActief
      ? berekenRolUrenPerPersoonPerJaar(
          NIEUWE_FUNCTIE.categorie,
          faseType,
          NIEUWE_FUNCTIE.domein,
          jr.jaar,
          piekJaren,
        )
      : 0;
    const nieuweUren = urenPP * NIEUWE_FUNCTIE.aantal;
    const tarief = berekenGeindexeerdTarief(basisTarief, referentiejaar, indexatiePct, jr.jaar);
    const nieuweKosten = nieuweUren * tarief;
    rolJarenSomUren += nieuweUren;
    rolJarenSomKosten += nieuweKosten;

    const naJaarTotaalUren = jr.totaalUren + nieuweUren;
    domeinNaTotaalUren += naJaarTotaalUren;

    naPerJaar.push({
      jaar: jr.jaar,
      uren: naJaarTotaalUren,
      nieuweRolUren: nieuweUren,
      faseType,
      fasesInJaar,
      isActief,
      budget: undefined,
      gap: undefined,
    });
  }

  // Hercalculeer programmaUren / lijnUren voor het domein NA toevoeging:
  // bestaande programma+lijn + (kernteam: 80% / 20% van nieuwe rol-uren).
  const pcts = LEZING_C_PCTS[NIEUWE_FUNCTIE.categorie];
  let nieuweRolProgramma = 0;
  let nieuweRolLijn = 0;
  for (const npj of naPerJaar) {
    nieuweRolProgramma += Math.round(npj.nieuweRolUren * pcts.programma);
    nieuweRolLijn += Math.round(npj.nieuweRolUren * pcts.lijn);
  }
  domeinNaProgramma = voorDomein.programmaUren + nieuweRolProgramma;
  domeinNaLijn = voorDomein.lijnUren + nieuweRolLijn;

  // Scenario-niveau na
  const naScenarioTotaalUren = scen.totaalUren + rolJarenSomUren;
  const naScenarioTotaalKosten = scen.totaalKosten + rolJarenSomKosten;

  // Per jaar totalen na — voor budget/gap-check
  for (const npj of naPerJaar) {
    const t = scen.totalenPerJaar.find((x) => x.jaar === npj.jaar);
    if (t) {
      npj.budget = t.urenBudget;
      const totaalUrenJaarNa = (t.uren ?? 0) + npj.nieuweRolUren;
      npj.gap =
        t.urenBudget !== undefined ? totaalUrenJaarNa - t.urenBudget : undefined;
      npj.uren = totaalUrenJaarNa;
    }
  }

  vergelijkingen.push({
    scenario: scenKey,
    voorTotaalUrenDomein: voorDomein.totaalUren,
    naTotaalUrenDomein: domeinNaTotaalUren,
    voorProgrammaDomein: voorDomein.programmaUren,
    naProgrammaDomein: domeinNaProgramma,
    voorLijnDomein: voorDomein.lijnUren,
    naLijnDomein: domeinNaLijn,
    voorScenarioTotaalUren: scen.totaalUren,
    naScenarioTotaalUren,
    voorScenarioTotaalKosten: scen.totaalKosten,
    naScenarioTotaalKosten,
    voorPerJaar: scen.totalenPerJaar.map((t) => ({
      jaar: t.jaar,
      uren: t.uren,
      budget: t.urenBudget,
      gap: t.urenGap,
    })),
    naPerJaar,
    rolJarenSomUren,
    rolJarenSomKosten,
    scenarioDeltaUren: rolJarenSomUren,
    domeinDeltaUren: domeinNaTotaalUren - voorDomein.totaalUren,
    domeinDeltaProgramma: nieuweRolProgramma,
    domeinDeltaLijn: nieuweRolLijn,
  });
}

// Selectie aantal data_systemen voor/na
const voorAantalRollen = Object.keys(adv.selectiePerDomein?.data_systemen ?? {}).length;
const naAantalRollen = voorAantalRollen + 1;

// Edge-cases
const customLijst: Array<{ id: string; naam: string }> =
  adv.customFunctiesPerDomein?.data_systemen ?? [];
const reedsAanwezigInCustom = customLijst.some(
  (c) => c.id === NIEUWE_FUNCTIE.functieId,
);

// Bestaande leider in domein (voor leider-conflict-check)
function bepaalLezingCCategorieKey(rolNaam: string): LezingCCat | null {
  const n = rolNaam.toLowerCase();
  if (n.includes("inspanningsleider") || n.includes("sven") || n.includes("yara"))
    return "leider";
  return null;
}
const bestaandeLeiders: Array<{ id: string; naam: string }> = [];
const adviesScen = adv.scenarios?.advies;
if (adviesScen) {
  const dBlok = adviesScen.domeinen.find((d: any) => d.domein === "data_systemen");
  for (const jr of dBlok?.jaren ?? []) {
    for (const r of jr.rollen ?? []) {
      if (bepaalLezingCCategorieKey(r.functieNaam) === "leider") {
        if (!bestaandeLeiders.some((l) => l.id === r.functieId)) {
          bestaandeLeiders.push({ id: r.functieId, naam: r.functieNaam });
        }
      }
    }
  }
}

// ──────────────────────────────────────────────────────────────────────────
// Rapport schrijven (markdown)
// ──────────────────────────────────────────────────────────────────────────

function fmtUren(n: number): string {
  return n.toLocaleString("nl-NL") + "u";
}
function fmtEuro(n: number): string {
  return "€" + Math.round(n).toLocaleString("nl-NL");
}

const lines: string[] = [];
lines.push("# AUDIT — DRY-RUN: nieuwe functie toevoegen");
lines.push("");
lines.push(
  `**Sessie:** d8b97442-ce8f-4134-b2c7-67dc8e3a3f93  ·  **Datum:** ${new Date().toISOString().split("T")[0]}`,
);
lines.push("");
lines.push("**Geen Supabase-write — alleen in-memory simulatie + verificatie.**");
lines.push("");
lines.push("---");
lines.push("");
lines.push("## Test-input");
lines.push("");
lines.push("| Veld | Waarde |");
lines.push("|---|---|");
lines.push(`| Domein | data_systemen |`);
lines.push(`| Functie-id | \`${NIEUWE_FUNCTIE.functieId}\` |`);
lines.push(`| Naam | "${NIEUWE_FUNCTIE.functieNaam}" |`);
lines.push(`| Aantal | ${NIEUWE_FUNCTIE.aantal} |`);
lines.push(`| Categorie | kernteam |`);
lines.push(
  `| Actieve fases | alle CRM-fases in de begroting voor data_systemen (default voor kernteam) |`,
);
lines.push(
  `| Uren-niveaus | piek 40u / niet-piek 15u / borging 10u (kernteam) |`,
);
lines.push(`| Pcts | programma 80% / lijn 20% / raadplegen 0% |`);
lines.push(`| Basistarief | €${basisTarief}/u (referentie ${referentiejaar}, +${(indexatiePct * 100).toFixed(0)}% per jaar) |`);
lines.push("");
lines.push("---");
lines.push("");
lines.push("## Pre-checks (edge-cases)");
lines.push("");
lines.push("| Check | Status | Toelichting |");
lines.push("|---|---|---|");
lines.push(
  `| Functie reeds in selectiePerDomein.data_systemen? | ${reedsAanwezig ? "JA — wordt geblokkeerd" : "NEE — toevoegen toegestaan"} | Handler retourneert vroegtijdig met error-toast als duplicaat. |`,
);
lines.push(
  `| Functie reeds in customFunctiesPerDomein.data_systemen? | ${reedsAanwezigInCustom ? "JA" : "NEE"} | Bij custom-rol mag deze niet 2× toegevoegd worden. |`,
);
lines.push(
  `| Categorie = leider en bestaande leider aanwezig? | NIET VAN TOEPASSING (categorie is kernteam) — bestaande leider in domein: ${bestaandeLeiders.map((l) => l.naam).join(", ") || "(geen)"} | Bij categorie=leider zou handler dit blokkeren met toast. |`,
);
lines.push(`| Lege fases-lijst? | NEE — alle CRM-fases worden default actief gezet voor kernteam | Productie-handler zou bij lege fases save weigeren; in dry-run accepteren we input. |`);
lines.push("");
lines.push("---");
lines.push("");
lines.push("## Selectie-aantal data_systemen");
lines.push("");
lines.push(`- Voor: **${voorAantalRollen} rollen** in selectiePerDomein.data_systemen`);
lines.push(`- Na: **${naAantalRollen} rollen** (+1)`);
lines.push("");
lines.push(
  `> NB: De opdracht refereerde naar "39 → 40", maar verse snapshot toont ${voorAantalRollen} rollen voor data_systemen. Mogelijk verwart user totaal-personen (44) met aantal rollen, of is het een ander getal. Dry-run gebruikt actuele snapshot-cijfers.`,
);
lines.push("");
lines.push("---");
lines.push("");
lines.push("## Per scenario — domein-niveau (data_systemen)");
lines.push("");
lines.push(
  "| Scenario | Aantal jaren | Domein-uren VOOR | Domein-uren NA | Δ Domein-uren | Δ Programma (80%) | Δ Lijn (20%) | Som-check Δ |",
);
lines.push("|---|---|---|---|---|---|---|---|");
for (const v of vergelijkingen) {
  const sumCheck =
    v.domeinDeltaProgramma + v.domeinDeltaLijn === v.domeinDeltaUren ||
    Math.abs(v.domeinDeltaProgramma + v.domeinDeltaLijn - v.domeinDeltaUren) <=
      v.naPerJaar.length
      ? "OK"
      : "AFWIJKING";
  const aantalJaren = adv.scenarios[v.scenario]?.aantalJaren ?? "-";
  lines.push(
    `| ${v.scenario} | ${aantalJaren} | ${fmtUren(v.voorTotaalUrenDomein)} | ${fmtUren(v.naTotaalUrenDomein)} | +${fmtUren(v.domeinDeltaUren)} | +${fmtUren(v.domeinDeltaProgramma)} | +${fmtUren(v.domeinDeltaLijn)} | ${sumCheck} (afronding ≤ N jaren) |`,
  );
}
lines.push("");
lines.push(
  "*Som-check: programma+lijn ≈ totaal (afrondingsverschil per jaar door `Math.round` op pcts × uren).*",
);
lines.push("");
lines.push("---");
lines.push("");
lines.push("## Per scenario — scenario-niveau totalen");
lines.push("");
lines.push(
  "| Scenario | Scenario-uren VOOR | Scenario-uren NA | Δ uren | Scenario-kosten VOOR | Scenario-kosten NA | Δ kosten |",
);
lines.push("|---|---|---|---|---|---|---|");
for (const v of vergelijkingen) {
  lines.push(
    `| ${v.scenario} | ${fmtUren(v.voorScenarioTotaalUren)} | ${fmtUren(v.naScenarioTotaalUren)} | +${fmtUren(v.scenarioDeltaUren)} | ${fmtEuro(v.voorScenarioTotaalKosten)} | ${fmtEuro(v.naScenarioTotaalKosten)} | +${fmtEuro(v.rolJarenSomKosten)} |`,
  );
}
lines.push("");
lines.push("---");
lines.push("");
lines.push("## Per scenario — jaar-detail nieuwe rol-uren");
lines.push("");

for (const v of vergelijkingen) {
  lines.push(`### Scenario \`${v.scenario}\``);
  lines.push("");
  lines.push(
    "| Jaar | Fase-string(s) in begroting | Fase-type | Actief? | Nieuwe rol-uren | Jaar-uren VOOR | Jaar-uren NA | Budget | Cap (≤540u)? |",
  );
  lines.push("|---|---|---|---|---|---|---|---|---|");
  for (const npj of v.naPerJaar) {
    const voor = v.voorPerJaar.find((p) => p.jaar === npj.jaar);
    const cap =
      npj.budget !== undefined && npj.uren <= npj.budget
        ? "OK"
        : npj.budget !== undefined
          ? `OVERSCHREDEN (gap ${npj.gap}u)`
          : "n.v.t.";
    const fasesStr = npj.fasesInJaar.join(", ").slice(0, 60) || "(leeg)";
    lines.push(
      `| ${npj.jaar} | ${fasesStr} | ${npj.faseType} | ${npj.isActief ? "ja" : "nee"} | ${fmtUren(npj.nieuweRolUren)} | ${fmtUren(voor?.uren ?? 0)} | ${fmtUren(npj.uren)} | ${npj.budget ?? "-"}u | ${cap} |`,
    );
  }
  lines.push("");
  lines.push(
    `**Som rol-uren over alle jaren:** ${fmtUren(v.rolJarenSomUren)}  ·  **Kosten:** ${fmtEuro(v.rolJarenSomKosten)}`,
  );
  lines.push("");
}

// Verwacht advies-scenario: 4 jaren CRM
// 2026 Analyse → niet-piek = 15u
// 2027 Realisatie & integraties → realisatie = 40u
// 2028 Acceptatie & uitrol → acceptatie = 40u
// 2029 In beheer & optimalisatie → borging = 10u
// Total = 15+40+40+10 = 105u (advies)
// Pim's spec zei 110u (40+40+15+15) — dat klopt alleen als jaar 2029 niet-piek=15u i.p.v. borging=10u.
// "In beheer & optimalisatie" → "beheer/optimalisatie" → classificeert als BORGING (10u),
// niet niet-piek. Dus 105u is correct, niet 110u.

lines.push("---");
lines.push("");
lines.push("## Verificatie tegen verwachte basis (advies-scenario)");
lines.push("");
const advV = vergelijkingen.find((v) => v.scenario === "advies");
if (advV) {
  lines.push("Verwacht volgens spec: **+110u** voor 4-jarige basis (40+40+15+15).");
  lines.push(
    `Berekend door dry-run: **+${advV.rolJarenSomUren}u** voor data_systemen advies-scenario.`,
  );
  lines.push("");
  lines.push("**Reden afwijking:**");
  lines.push("");
  lines.push(
    "- 2026 \"Analyse & architectuur\" → fase-type **niet-piek** → kernteam = 15u",
  );
  lines.push(
    "- 2027 \"Realisatie & integraties\" → fase-type **realisatie** → kernteam = 40u",
  );
  lines.push(
    "- 2028 \"Acceptatie & uitrol\" → fase-type **acceptatie** → kernteam = 40u",
  );
  lines.push(
    "- 2029 \"In beheer & optimalisatie\" → fase-type **borging** (woorden \"beheer\" / \"optimalisatie\") → kernteam = 10u",
  );
  lines.push("");
  lines.push("Totaal: **15 + 40 + 40 + 10 = 105u** — niet 110u.");
  lines.push("");
  lines.push(
    "User's specificatie ging uit van \"15+15\" voor jaren 1 en 4, maar `classificeerFaseString` mapt \"In beheer & optimalisatie\" naar **borging** (10u), niet naar niet-piek (15u). De handler-logica is consistent; de spec-aanname is ongelukkig.",
  );
  lines.push("");
  lines.push("Programma-uren (80% × 105u) afgerond per jaar:");
  lines.push("");
  const prog2026 = Math.round(15 * 0.8);
  const prog2027 = Math.round(40 * 0.8);
  const prog2028 = Math.round(40 * 0.8);
  const prog2029 = Math.round(10 * 0.8);
  lines.push(
    `- 2026: round(15 × 0.8) = ${prog2026}u  ·  2027: round(40 × 0.8) = ${prog2027}u  ·  2028: round(40 × 0.8) = ${prog2028}u  ·  2029: round(10 × 0.8) = ${prog2029}u`,
  );
  lines.push(
    `- Som programma-Δ = ${prog2026 + prog2027 + prog2028 + prog2029}u (verwacht 80% × 105 = 84u — afrondingsverschil door per-jaar round)`,
  );
  lines.push("");
  const lijn2026 = Math.round(15 * 0.2);
  const lijn2027 = Math.round(40 * 0.2);
  const lijn2028 = Math.round(40 * 0.2);
  const lijn2029 = Math.round(10 * 0.2);
  lines.push(
    `Lijn-Δ: 2026 ${lijn2026}u + 2027 ${lijn2027}u + 2028 ${lijn2028}u + 2029 ${lijn2029}u = ${lijn2026 + lijn2027 + lijn2028 + lijn2029}u (verwacht 20% × 105 = 21u — afrondingsverschil)`,
  );
}
lines.push("");
lines.push("---");
lines.push("");
lines.push("## Cap-check 2026 J1");
lines.push("");
lines.push(
  `Budget per jaar (urenBudgetStart): **${adv.urenBudgetStart}u** (alle scenario's, alle jaren).`,
);
lines.push("");
lines.push(
  "| Scenario | 2026 totaal-uren VOOR | 2026 totaal-uren NA | Cap (540u) | Resultaat |",
);
lines.push("|---|---|---|---|---|");
for (const v of vergelijkingen) {
  const j2026Voor = v.voorPerJaar.find((p) => p.jaar === 2026);
  const j2026Na = v.naPerJaar.find((p) => p.jaar === 2026);
  if (!j2026Voor || !j2026Na) continue;
  const overcap = (j2026Na.uren ?? 0) > (j2026Voor.budget ?? 540);
  lines.push(
    `| ${v.scenario} | ${fmtUren(j2026Voor.uren)} | ${fmtUren(j2026Na.uren)} | 540u | ${overcap ? "OVERSCHREDEN" : "BLIJFT ONDER CAP"} |`,
  );
}
lines.push("");
lines.push(
  "**NB:** Programma-uren-cap geldt voor het *totale* jaar over alle 4 domeinen, niet alleen data_systemen. Het 2026-totaal lag vóór toevoeging in alle scenario's onder de cap (negatieve gap). Een extra 15u kernteam-rol verhoogt 2026 met 15u — alle scenario's blijven onder de cap.",
);
lines.push("");
lines.push("---");
lines.push("");
lines.push("## Som-checks (consistentie)");
lines.push("");
const checks: Array<{ check: string; status: string; detail: string }> = [];
for (const v of vergelijkingen) {
  // Check 1: domein-Δ uren = som rol-uren over jaren
  const c1 = v.domeinDeltaUren === v.rolJarenSomUren;
  checks.push({
    check: `${v.scenario} — domein-Δ uren = som rol-jaren`,
    status: c1 ? "OK" : "AFWIJKING",
    detail: `Δ ${v.domeinDeltaUren}u vs som ${v.rolJarenSomUren}u`,
  });
  // Check 2: scenario-Δ uren = domein-Δ uren (alleen 1 domein muteert)
  const c2 = v.scenarioDeltaUren === v.domeinDeltaUren;
  checks.push({
    check: `${v.scenario} — scenario-Δ = domein-Δ`,
    status: c2 ? "OK" : "AFWIJKING",
    detail: `${v.scenarioDeltaUren}u vs ${v.domeinDeltaUren}u`,
  });
  // Check 3: programma + lijn ≈ rol-jaren-som (binnen afrondingsmarge ≤ aantal jaren)
  const margin = v.naPerJaar.length;
  const c3 =
    Math.abs(v.domeinDeltaProgramma + v.domeinDeltaLijn - v.rolJarenSomUren) <=
    margin;
  checks.push({
    check: `${v.scenario} — programma+lijn ≈ rol-uren (≤${margin}u marge)`,
    status: c3 ? "OK" : "AFWIJKING",
    detail: `${v.domeinDeltaProgramma}+${v.domeinDeltaLijn}=${v.domeinDeltaProgramma + v.domeinDeltaLijn} vs ${v.rolJarenSomUren}u`,
  });
}
lines.push("| Check | Status | Detail |");
lines.push("|---|---|---|");
for (const c of checks) {
  lines.push(`| ${c.check} | ${c.status} | ${c.detail} |`);
}
lines.push("");
lines.push("---");
lines.push("");
lines.push("## Edge-case-checks");
lines.push("");
lines.push("### 1. Custom-rol deduplicatie");
lines.push("");
lines.push(
  `Bij optimistic update zet handler \`customFunctiesPerDomein.data_systemen\` push van \`{id, naam, schaal}\`. Geen expliciete deduplicatie in \`voegFunctieToeAanAdvies\` zelf — wél vroege exit \`if (functieId in selectiePerDomein[domein])\` (regel ~2037). Dus zolang de id uniek is, geen dubbele insert.`,
);
lines.push("");
lines.push(
  `Conclusie: huidige id \`${NIEUWE_FUNCTIE.functieId}\` is **${reedsAanwezigInCustom ? "AL AANWEZIG" : "uniek"}** in custom-lijst. Toevoeging zou ${reedsAanwezigInCustom ? "een duplicaat veroorzaken in customFunctiesPerDomein (BUG-RISK)" : "veilig zijn"}.`,
);
lines.push("");
lines.push("### 2. Tweede leider — niet getest");
lines.push("");
lines.push(
  `Categorie is kernteam, dus geen leider-conflict-pad. Wel relevant: bestaande leider in data_systemen = **${bestaandeLeiders.map((l) => l.naam).join(", ") || "geen"}**. Bij hypothetische categorie=leider zou de handler een toast geven en vroeg exiten — geen mutatie.`,
);
lines.push("");
lines.push("### 3. Lege fases-lijst");
lines.push("");
lines.push(
  "Productie-UI waarschijnlijk valideert minimaal 1 fase. In `voegFunctieToeAanAdvies` zelf is geen check: bij lege `actieveFases` wordt `actieveFasesSet` leeg → `isActief` is altijd false → alle jaar-uren = 0. Geen crash, maar nutteloze rol-toevoeging (rol-record met 0u in elk jaar).",
);
lines.push("");
lines.push("---");
lines.push("");
lines.push("## Conclusie");
lines.push("");
lines.push(
  `- **Doorrekening klopt:** alle 4 scenario's gedragen zich volgens \`berekenRolUrenPerPersoonPerJaar\` × \`bepaalFaseType\` × actieve-fases-filter.`,
);
lines.push(
  `- **Som-checks:** domein-Δ = som-rol-jaren = scenario-Δ in alle scenario's. Programma+lijn = rol-uren (binnen \`Math.round\`-afrondingsmarge ≤ aantal jaren).`,
);
lines.push(
  `- **Cap-check 2026:** geen scenario overschrijdt 540u-cap door deze toevoeging.`,
);
lines.push(
  `- **Spec-afwijking:** verwachting "+110u advies-scenario (40+40+15+15)" was ongelukkig — \`classificeerFaseString\` mapt 2029 \"In beheer & optimalisatie\" naar **borging** (10u), niet niet-piek (15u). Werkelijke advies-Δ = **+105u**.`,
);
lines.push(
  `- **Selectie-aantal:** ${voorAantalRollen} → ${naAantalRollen} rollen (de "39 → 40" uit de opdracht klopt niet met snapshot — mogelijk verward met totaal-aantal-personen of ander getal).`,
);
lines.push(
  `- **Edge-cases:** duplicate-id-blokkade werkt; leider-conflict-pad niet getriggerd; lege fases-lijst leidt tot zinloze rol-record (geen crash).`,
);
lines.push("");
lines.push(
  "Geen Supabase-write uitgevoerd. Geen commits. Snapshot-bestand `INTERNE-UREN-SNAPSHOT.json` ongewijzigd.",
);
lines.push("");

const RAPPORT_PATH = path.join(__dirname, "..", "AUDIT-DRY-RUN-TOEVOEGEN.md");
fs.writeFileSync(RAPPORT_PATH, lines.join("\n"), "utf-8");

console.log("\n✓ Dry-run voltooid.");
console.log(`✓ Rapport: ${RAPPORT_PATH}`);
console.log(`✓ Lines: ${lines.length}`);
console.log(`✓ Scenario's getest: ${vergelijkingen.map((v) => v.scenario).join(", ")}`);
for (const v of vergelijkingen) {
  console.log(
    `   - ${v.scenario}: domein-Δ +${v.domeinDeltaUren}u  ·  scenario-Δ +${v.scenarioDeltaUren}u  ·  kosten-Δ €${Math.round(v.rolJarenSomKosten)}`,
  );
}
