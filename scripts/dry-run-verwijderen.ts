/**
 * Dry-run: simuleer verwijderen van `productmanager_dst` (3 personen, mens)
 * uit het interne-uren-advies van sessie d8b97442-ce8f-4134-b2c7-67dc8e3a3f93.
 *
 * Géén Supabase-write, géén bestand-overwrite. Alleen in-memory transformatie
 * + rapport (wordt door run-dry-run.ts naar AUDIT-DRY-RUN-VERWIJDEREN.md geschreven).
 *
 * Logica spiegelt `verwijderRolUitAdvies` in StapInterneUren.tsx (regels 3443–3575).
 */

import * as fs from "node:fs";
import * as path from "node:path";

type LezingCCat = "leider" | "kernteam" | "trainings_deelnemer" | "geconsulteerd";
type Domein = "mens" | "processen" | "data_systemen" | "cultuur";
type ScenarioLabel = "optimaal" | "plus20" | "min20" | "advies";

interface RolRecord {
  uren?: number;
  aantal?: number;
  kosten?: number;
  lijnPct?: number;
  categorie?: string;
  functieId: string;
  uurtarief?: number;
  functieNaam?: string;
  programmaPct?: number;
  raadplegenPct?: number;
  urenPerPersoon?: number;
}

interface JaarBlok {
  jaar: number;
  rollen: RolRecord[];
  totaalUren?: number;
  totaalKosten?: number;
}

interface DomeinBlok {
  domein: Domein;
  jaren: JaarBlok[];
  totaalUren?: number;
  totaalKosten?: number;
  programmaUren?: number;
  lijnUren?: number;
  raadplegenUren?: number;
}

interface JaarTotaalBlok {
  jaar: number;
  uren: number;
  kosten?: number;
  programmaUren?: number;
  lijnUren?: number;
  raadplegenUren?: number;
  urenBudget?: number;
  urenGap?: number;
}

interface ScenarioBlok {
  domeinen: DomeinBlok[];
  totalenPerJaar: JaarTotaalBlok[];
  totaalUren?: number;
  totaalKosten?: number;
  programmaUren?: number;
  lijnUren?: number;
  raadplegenUren?: number;
}

interface InterneUrenLezingMarker {
  rolCategorieen?: Partial<Record<Domein, Record<string, LezingCCat>>>;
}

interface FunctieInput {
  aantal?: number;
  stakeholder?: boolean;
  reviewVereist?: boolean;
}

interface InterneUrenAdvies {
  scenarios: Partial<Record<ScenarioLabel, ScenarioBlok | null>>;
  selectiePerDomein?: Record<Domein, Record<string, FunctieInput>>;
  interneUrenLezing?: InterneUrenLezingMarker;
  vastgesteldeUrenPerInspanning?: Array<{
    domein: Domein;
    rollen: Array<RolRecord & { urenTotaal?: number }>;
    groepId?: string;
    inspanningTitel?: string;
  }>;
}

const LEZING_C_PCTS: Record<LezingCCat, { programma: number; lijn: number; raadplegen: number }> = {
  leider: { programma: 0.9, lijn: 0.1, raadplegen: 0 },
  kernteam: { programma: 0.8, lijn: 0.2, raadplegen: 0 },
  trainings_deelnemer: { programma: 0.5, lijn: 0.5, raadplegen: 0 },
  geconsulteerd: { programma: 0, lijn: 0, raadplegen: 1.0 },
};

const LEZING_C_PCTS_TRAININGS_PER_DOMEIN: Partial<
  Record<Domein, { programma: number; lijn: number; raadplegen: number }>
> = {
  mens: { programma: 0.5, lijn: 0.5, raadplegen: 0 },
  data_systemen: { programma: 0.7, lijn: 0.3, raadplegen: 0 },
};

function pctsVoorCategorie(
  categorie: LezingCCat,
  domein: Domein,
): { programma: number; lijn: number; raadplegen: number } {
  if (categorie === "trainings_deelnemer") {
    return LEZING_C_PCTS_TRAININGS_PER_DOMEIN[domein] ?? LEZING_C_PCTS.trainings_deelnemer;
  }
  return LEZING_C_PCTS[categorie];
}

function normaliseerCategorie(s: string | undefined): LezingCCat | null {
  if (!s) return null;
  const v = s.toLowerCase();
  if (v === "leider" || v === "kernteam" || v === "trainings_deelnemer" || v === "geconsulteerd") {
    return v as LezingCCat;
  }
  return null;
}

/**
 * Spiegel van `bepaalLezingCCategorie` (StapInterneUren.tsx ~regel 683).
 * - Highest priority: marker override
 * - Dan: rol.categorie veld (rolCategorie param)
 * - Dan: stakeholder/reviewVereist heuristiek → geconsulteerd
 * - Dan: naam/id heuristiek → leider
 * - Default: kernteam (mens) of trainings_deelnemer (data_systemen)
 *
 * Belangrijk: in `verwijderRolUitAdvies` wordt deze functie aangeroepen ZONDER
 * de `rolCategorie` parameter (zie regels 3486-3492 en 3527-3533). We spiegelen
 * dat hier ook — anders zouden we een ander resultaat krijgen dan de runtime.
 */
function bepaalLezingCCategorie(
  domein: Domein,
  functieId: string,
  functieNaam: string | undefined,
  selectie: FunctieInput | undefined,
  marker?: InterneUrenLezingMarker,
  rolCategorie?: string,
): LezingCCat {
  const expl = marker?.rolCategorieen?.[domein]?.[functieId];
  const norm = normaliseerCategorie(expl as string | undefined);
  if (norm) return norm;
  const rolNorm = normaliseerCategorie(rolCategorie);
  if (rolNorm) return rolNorm;
  if (selectie?.stakeholder === true) return "geconsulteerd";
  if (selectie?.reviewVereist === true) return "geconsulteerd";
  const lower = (functieNaam ?? "").toLowerCase();
  const idLower = functieId.toLowerCase();
  if (
    lower.includes("inspanningsleider") ||
    lower.includes("projectleider") ||
    lower.includes("projectmanager") ||
    idLower.includes("-leider") ||
    idLower.includes("leider-") ||
    idLower.endsWith("-leider") ||
    functieId === "manager_klantcontact" ||
    functieId === "sio"
  ) {
    return "leider";
  }
  if (domein === "data_systemen") return "trainings_deelnemer";
  return "kernteam";
}

function verwijderRolUitAdvies(
  advies: InterneUrenAdvies,
  domein: Domein,
  functieId: string,
  selectiePerDomein: Record<Domein, Record<string, FunctieInput>> | undefined,
): InterneUrenAdvies {
  const huidigeMarker: InterneUrenLezingMarker = advies.interneUrenLezing ?? {};
  const huidigeMapping = huidigeMarker.rolCategorieen ?? {};
  const huidigeDomeinMapping: Record<string, LezingCCat> = {
    ...((huidigeMapping[domein] ?? {}) as Record<string, LezingCCat>),
  };
  delete huidigeDomeinMapping[functieId];
  const nieuweMarker: InterneUrenLezingMarker = {
    ...huidigeMarker,
    rolCategorieen: {
      ...huidigeMapping,
      [domein]: huidigeDomeinMapping,
    },
  };

  const newScenarios: InterneUrenAdvies["scenarios"] = { ...advies.scenarios };
  const scenKeys: ScenarioLabel[] = ["optimaal", "plus20", "min20", "advies"];

  for (const scenKey of scenKeys) {
    const scen = newScenarios[scenKey];
    if (!scen) continue;

    const newDomeinen: DomeinBlok[] = scen.domeinen.map((d) => {
      if (d.domein !== domein) return d;
      const newJaren: JaarBlok[] = d.jaren.map((jr) => {
        const nieuweRollen = jr.rollen.filter((r) => r.functieId !== functieId);
        const totaalUren = nieuweRollen.reduce((s, x) => s + (x.uren ?? 0), 0);
        const totaalKosten = nieuweRollen.reduce((s, x) => s + (x.kosten ?? 0), 0);
        return { ...jr, rollen: nieuweRollen, totaalUren, totaalKosten };
      });

      let programmaUren = 0;
      let lijnUren = 0;
      let raadplegenUren = 0;
      for (const jr of newJaren) {
        for (const r of jr.rollen) {
          const rolCat = bepaalLezingCCategorie(
            d.domein,
            r.functieId,
            r.functieNaam,
            selectiePerDomein?.[d.domein]?.[r.functieId],
            nieuweMarker,
          );
          const pcts = pctsVoorCategorie(rolCat, d.domein);
          const u = r.uren ?? 0;
          programmaUren += Math.round(u * pcts.programma);
          lijnUren += Math.round(u * pcts.lijn);
          raadplegenUren += Math.round(u * pcts.raadplegen);
        }
      }

      const totaalUren = newJaren.reduce((s, j) => s + (j.totaalUren ?? 0), 0);
      const totaalKosten = newJaren.reduce((s, j) => s + (j.totaalKosten ?? 0), 0);
      return {
        ...d,
        jaren: newJaren,
        totaalUren,
        totaalKosten,
        programmaUren,
        lijnUren,
        raadplegenUren,
      };
    });

    const newTotalenPerJaar = scen.totalenPerJaar.map((t) => {
      let uren = 0;
      let kosten = 0;
      let progU = 0;
      let lijnU = 0;
      let raadU = 0;
      for (const d of newDomeinen) {
        const j = d.jaren.find((x) => x.jaar === t.jaar);
        uren += j?.totaalUren ?? 0;
        kosten += j?.totaalKosten ?? 0;
        if (!j) continue;
        for (const r of j.rollen) {
          const rolCat = bepaalLezingCCategorie(
            d.domein,
            r.functieId,
            r.functieNaam,
            selectiePerDomein?.[d.domein]?.[r.functieId],
            nieuweMarker,
          );
          const pcts = pctsVoorCategorie(rolCat, d.domein);
          const u = r.uren ?? 0;
          progU += Math.round(u * pcts.programma);
          lijnU += Math.round(u * pcts.lijn);
          raadU += Math.round(u * pcts.raadplegen);
        }
      }
      return {
        ...t,
        uren,
        kosten,
        urenGap: t.urenBudget !== undefined ? uren - t.urenBudget : t.urenGap,
        programmaUren: progU,
        lijnUren: lijnU,
        raadplegenUren: raadU,
      };
    });

    const totaalUren = newDomeinen.reduce((s, d) => s + (d.totaalUren ?? 0), 0);
    const totaalKosten = newDomeinen.reduce((s, d) => s + (d.totaalKosten ?? 0), 0);
    const programmaUrenScen = newDomeinen.reduce((s, d) => s + (d.programmaUren ?? 0), 0);
    const lijnUrenScen = newDomeinen.reduce((s, d) => s + (d.lijnUren ?? 0), 0);
    const raadplegenUrenScen = newDomeinen.reduce((s, d) => s + (d.raadplegenUren ?? 0), 0);

    newScenarios[scenKey] = {
      ...scen,
      domeinen: newDomeinen,
      totalenPerJaar: newTotalenPerJaar,
      totaalUren,
      totaalKosten,
      programmaUren: programmaUrenScen,
      lijnUren: lijnUrenScen,
      raadplegenUren: raadplegenUrenScen,
    };
  }

  // Selectie-update (UI doet dit als optimistic update vóór verwijderRolUitAdvies)
  const newSelectie: Record<Domein, Record<string, FunctieInput>> = JSON.parse(
    JSON.stringify(advies.selectiePerDomein ?? {}),
  );
  if (newSelectie[domein]) {
    delete newSelectie[domein][functieId];
  }

  // vUPI-update (UI doet dit ook in optimistic update)
  const newVUPI = (advies.vastgesteldeUrenPerInspanning ?? []).map((grp) => {
    if (grp.domein !== domein) return grp;
    const filtered = grp.rollen.filter((r) => r.functieId !== functieId);
    return { ...grp, rollen: filtered };
  });

  return {
    ...advies,
    scenarios: newScenarios,
    interneUrenLezing: nieuweMarker,
    selectiePerDomein: newSelectie,
    vastgesteldeUrenPerInspanning: newVUPI,
  };
}

// ────────────────────────────────────────────────────────────────────────────
// Run
// ────────────────────────────────────────────────────────────────────────────

interface ScenarioCompare {
  label: ScenarioLabel;
  voor: {
    mensTotaal: number;
    mensProgU: number;
    mensLijnU: number;
    mensRaadU: number;
    scenTotaal: number;
    scenProgU: number;
    scenLijnU: number;
    scenRaadU: number;
    perJaarMens: Array<{ jaar: number; uren: number }>;
    perJaarScen: Array<{ jaar: number; uren: number; raadU: number; progU: number; lijnU: number }>;
  };
  na: {
    mensTotaal: number;
    mensProgU: number;
    mensLijnU: number;
    mensRaadU: number;
    scenTotaal: number;
    scenProgU: number;
    scenLijnU: number;
    scenRaadU: number;
    perJaarMens: Array<{ jaar: number; uren: number }>;
    perJaarScen: Array<{ jaar: number; uren: number; raadU: number; progU: number; lijnU: number }>;
  };
}

function snapshotMetrics(scen: ScenarioBlok | null | undefined) {
  if (!scen) {
    return {
      mensTotaal: 0,
      mensProgU: 0,
      mensLijnU: 0,
      mensRaadU: 0,
      scenTotaal: scen?.totaalUren ?? 0,
      scenProgU: scen?.programmaUren ?? 0,
      scenLijnU: scen?.lijnUren ?? 0,
      scenRaadU: scen?.raadplegenUren ?? 0,
      perJaarMens: [] as Array<{ jaar: number; uren: number }>,
      perJaarScen: [] as Array<{ jaar: number; uren: number; raadU: number; progU: number; lijnU: number }>,
    };
  }
  const mens = scen.domeinen.find((d) => d.domein === "mens");
  return {
    mensTotaal: mens?.totaalUren ?? 0,
    mensProgU: mens?.programmaUren ?? 0,
    mensLijnU: mens?.lijnUren ?? 0,
    mensRaadU: mens?.raadplegenUren ?? 0,
    scenTotaal: scen.totaalUren ?? 0,
    scenProgU: scen.programmaUren ?? 0,
    scenLijnU: scen.lijnUren ?? 0,
    scenRaadU: scen.raadplegenUren ?? 0,
    perJaarMens: (mens?.jaren ?? []).map((j) => ({ jaar: j.jaar, uren: j.totaalUren ?? 0 })),
    perJaarScen: scen.totalenPerJaar.map((t) => ({
      jaar: t.jaar,
      uren: t.uren,
      raadU: t.raadplegenUren ?? 0,
      progU: t.programmaUren ?? 0,
      lijnU: t.lijnUren ?? 0,
    })),
  };
}

function main() {
  const REPO = "c:/Users/pdebu/Projects VS code/DIN";
  const snap = JSON.parse(fs.readFileSync(path.join(REPO, "INTERNE-UREN-SNAPSHOT.json"), "utf8"));
  const advies: InterneUrenAdvies = snap.stap4.stap7InterneUren;

  // Voor-metingen
  const voor = {
    advies: snapshotMetrics(advies.scenarios.advies),
    optimaal: snapshotMetrics(advies.scenarios.optimaal),
    plus20: snapshotMetrics(advies.scenarios.plus20),
    min20: snapshotMetrics(advies.scenarios.min20),
  };

  const totaalSelectieMensVoor = Object.values(advies.selectiePerDomein?.mens ?? {}).reduce(
    (s, x) => s + (x.aantal ?? 1),
    0,
  );
  const aantalFunctiesMensVoor = Object.keys(advies.selectiePerDomein?.mens ?? {}).length;

  // vUPI rol-record voor (mens, productmanager_dst)
  const vUPIVoor = (advies.vastgesteldeUrenPerInspanning ?? [])
    .filter((g) => g.domein === "mens")
    .flatMap((g) => g.rollen.filter((r) => r.functieId === "productmanager_dst"));
  const vUPIUrenTotaalVoor = vUPIVoor.reduce((s, r) => s + (r.urenTotaal ?? 0), 0);
  const vUPIAantalVoor = vUPIVoor.reduce((s, r) => s + (r.aantal ?? 0), 0);

  // Voer simulatie uit
  const na = verwijderRolUitAdvies(
    advies,
    "mens",
    "productmanager_dst",
    advies.selectiePerDomein,
  );

  const naMetric = {
    advies: snapshotMetrics(na.scenarios.advies),
    optimaal: snapshotMetrics(na.scenarios.optimaal),
    plus20: snapshotMetrics(na.scenarios.plus20),
    min20: snapshotMetrics(na.scenarios.min20),
  };

  const totaalSelectieMensNa = Object.values(na.selectiePerDomein?.mens ?? {}).reduce(
    (s, x) => s + (x.aantal ?? 1),
    0,
  );
  const aantalFunctiesMensNa = Object.keys(na.selectiePerDomein?.mens ?? {}).length;
  const vUPINa = (na.vastgesteldeUrenPerInspanning ?? [])
    .filter((g) => g.domein === "mens")
    .flatMap((g) => g.rollen.filter((r) => r.functieId === "productmanager_dst"));

  // Customs
  const customsMens = (snap.stap4.stap7InterneUren.customFunctiesPerDomein?.mens ?? {}) as Record<string, unknown>;
  const isCustom = "productmanager_dst" in customsMens;

  const compares: ScenarioCompare[] = (
    ["advies", "optimaal", "plus20", "min20"] as ScenarioLabel[]
  ).map((label) => ({
    label,
    voor: voor[label],
    na: naMetric[label],
  }));

  const out = {
    totaalSelectieMensVoor,
    totaalSelectieMensNa,
    aantalFunctiesMensVoor,
    aantalFunctiesMensNa,
    vUPIUrenTotaalVoor,
    vUPIAantalVoor,
    vUPIRollenNaCount: vUPINa.length,
    customsMens_heeftProductmanagerDst: isCustom,
    customsMens_keys: Object.keys(customsMens),
    compares,
  };

  fs.writeFileSync(
    path.join(REPO, "scripts", ".dry-run-result.json"),
    JSON.stringify(out, null, 2),
    "utf8",
  );

  console.log("Dry-run klaar. Resultaat in scripts/.dry-run-result.json");
  console.log("Selectie mens:", totaalSelectieMensVoor, "→", totaalSelectieMensNa);
  console.log("Functies mens:", aantalFunctiesMensVoor, "→", aantalFunctiesMensNa);
  console.log("vUPI productmanager_dst urenTotaal voor:", vUPIUrenTotaalVoor, "rollen na:", vUPINa.length);
  for (const c of compares) {
    console.log(
      `\n[${c.label}] mens: ${c.voor.mensTotaal}u → ${c.na.mensTotaal}u (Δ ${c.na.mensTotaal - c.voor.mensTotaal})`,
    );
    console.log(
      `  scen totaal: ${c.voor.scenTotaal}u → ${c.na.scenTotaal}u (Δ ${c.na.scenTotaal - c.voor.scenTotaal})`,
    );
    console.log(
      `  prog: ${c.voor.scenProgU}→${c.na.scenProgU} | lijn: ${c.voor.scenLijnU}→${c.na.scenLijnU} | raad: ${c.voor.scenRaadU}→${c.na.scenRaadU}`,
    );
  }
}

main();
