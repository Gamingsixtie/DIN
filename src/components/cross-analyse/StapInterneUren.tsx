"use client";

import React, { useState, useEffect, useRef } from "react";
import { useSession } from "@/lib/session-context";
import { useToast } from "@/components/ui/Toast";
import { EditableText } from "@/components/ui/EditableText";
import { applyHalfjaarShiftAlleScenarios } from "@/lib/halfjaar-shift";
import type { DINSession, Stap4Result } from "@/lib/types";
import {
  DEFAULT_BASIS_TARIEF,
  DEFAULT_REFERENTIEJAAR,
  DEFAULT_INDEXATIE_PCT,
  berekenGeindexeerdTarief,
} from "@/lib/uurtarief";
import { CITO_FUNCTIES, type CitoFunctie, type CitoAfdeling } from "@/lib/cito-functies";

type CustomFunctie = { id: string; naam: string; schaal?: number };
// Per geselecteerde functie: aantal personen + (optioneel) hard uren-budget per jaar per persoon
// Als urenPerJaar leeg is → AI bepaalt; ingevuld → AI moet dit als jaarlijks budget per persoon respecteren
// stakeholder: rol levert review/input (geen uren-belasting); UI toont label i.p.v. aantal
// reviewVereist: handmatige beslissing nog open (cat-3 stille selecties)
type FunctieInput = {
  aantal: number;
  urenPerJaar?: number;
  stakeholder?: boolean;
  stakeholderToelichting?: string;
  reviewVereist?: boolean;
  reviewVraag?: string;
};

type Domein = "cultuur" | "mens" | "data_systemen" | "processen";
type ScenarioLabel = "optimaal" | "plus20" | "min20" | "advies";

type Rol = {
  functieId: string;
  functieNaam: string;
  afdeling?: string;
  uren: number;
  uurtarief: number;
  kosten: number;
};
type JaarBlok = {
  jaar: number;
  activiteit: string;
  rollen: Rol[];
  totaalUren: number;
  totaalKosten: number;
};
type DomeinBlok = {
  domein: Domein;
  koppeling?: string[];
  jaren: JaarBlok[];
  totaalUren: number;
  totaalKosten: number;
  motivatie: string;
  // Programma- vs lijn-aandeel binnen dit domein (0..1). Optioneel; valt terug op default-pct.
  programmaPct?: number;
  programmaUren?: number;
  lijnUren?: number;
  // Interpretatie B: derde uren-type "raadplegen" — geconsulteerden vallen
  // volledig onder raadplegen, niet onder programma of lijn.
  raadplegenUren?: number;
};
type ScenarioBlok = {
  scenarioLabel: ScenarioLabel;
  aantalJaren: number;
  startJaar: number;
  uurtariefGebruikt: number;
  domeinen: DomeinBlok[];
  totalenPerJaar: Array<{
    jaar: number;
    uren: number;
    kosten: number;
    urenBudget?: number;
    urenGap?: number;
    programmaUren?: number;
    lijnUren?: number;
    raadplegenUren?: number;
  }>;
  totaalUren: number;
  totaalKosten: number;
  samenvatting: string;
  // Top-niveau programma vs lijn vs raadplegen-uitsplitsing (interpretatie B).
  programmaUren?: number;
  lijnUren?: number;
  raadplegenUren?: number;
  // Dirty-flag: is de samenvatting handmatig in de UI bewerkt?
  // Scripts moeten dit scenario dan overslaan om handmatige edits niet te overschrijven.
  samenvattingHandmatigBewerkt?: boolean;
};
type InterneUrenAdvies = {
  uurtariefSettings: { basisTarief: number; referentiejaar: number; indexatiePercentage: number };
  // User-settings die we opslaan zodat ze bij terugkeer bewaard blijven
  urenBudgetStart?: number;
  geselecteerdeFunctieIds?: string[]; // legacy (backward compat)
  functieAantallen?: Record<string, number>; // legacy (backward compat)
  // Legacy: per-domein selectie als alleen aantallen (number)
  selectiePerDomeinLegacy?: Record<Domein, Record<string, number>>;
  // Per-domein selectie: functie-id → { aantal, urenPerJaar? }
  selectiePerDomein?: Record<Domein, Record<string, FunctieInput>>;
  // Custom functies door user toegevoegd, per domein
  customFunctiesPerDomein?: Record<Domein, CustomFunctie[]>;
  // AI-vragen Q&A antwoorden per inspanning (voor uren-verfijning)
  vragenAntwoorden?: Record<string, Record<string, string>>;
  scenarios: {
    optimaal: ScenarioBlok | null;
    plus20: ScenarioBlok | null;
    min20: ScenarioBlok | null;
    advies?: ScenarioBlok | null;
  };
  partialFailures?: string[];
  // Lezing-C marker — bevat per-rol categorie-overrides die door de UI-dropdown
  // (Stap 7 ScenarioBlokView) of door de Lezing-C-doorvoer-agent worden gezet.
  interneUrenLezing?: InterneUrenLezingMarker;
};

const DOMEIN_LABELS: Record<Domein, string> = {
  cultuur: "Cultuur",
  mens: "Mens",
  data_systemen: "Data & Systemen",
  processen: "Processen",
};
const DOMEIN_COLORS: Record<Domein, { bg: string; border: string; text: string }> = {
  cultuur: { bg: "bg-amber-50", border: "border-amber-200", text: "text-amber-800" },
  mens: { bg: "bg-blue-50", border: "border-blue-200", text: "text-blue-800" },
  data_systemen: { bg: "bg-purple-50", border: "border-purple-200", text: "text-purple-800" },
  processen: { bg: "bg-green-50", border: "border-green-200", text: "text-green-800" },
};

// Programma vs lijn — defaults & visualisatie (consistent met SectieF in BerekeningenStep)
const PROGRAMMA_PCT_DEFAULT: Record<Domein, number> = {
  data_systemen: 0.85,
  mens: 0.70,
  cultuur: 0.75,
  processen: 0.55,
};
const DOMAIN_BAR_HEX: Record<Domein, string> = {
  mens: "#2563eb",
  processen: "#059669",
  data_systemen: "#7c3aed",
  cultuur: "#d97706",
};
// Compacte per-domein-toelichting waarom lijn-aandeel zo is.
const DOMAIN_LIJN_VOORBEELD: Record<Domein, string> = {
  data_systemen:
    "~15% lijn — Manager DT + Projectmanager D 4u/mnd stuurgroep is governance-tijd uit functieprofiel.",
  mens:
    "~30% lijn — 47 deelnemers × ~16u/jr standaard L&D zit in opleidingsplan Klantcontact.",
  cultuur:
    "~25% lijn — HRM-cyclus zelf + 50% MT-cyclus-tijd sectormanagers/directeur.",
  processen:
    "~45% lijn — schaalt met scenario-lengte; Procesmanager K&M structureel werk vanaf 2029 valt in functieprofiel.",
};
// Volgorde van de per-domein-bar: data_systemen, mens, cultuur, processen
const PROGLIJN_DOMEIN_VOLGORDE: Domein[] = ["data_systemen", "mens", "cultuur", "processen"];

// ────────────────────────────────────────────────────────────────────────────
// Lezing-C — kernteam-model categorie-labels (consistent met BerekeningenStep)
// ────────────────────────────────────────────────────────────────────────────
type LezingCCat = "leider" | "kernteam" | "trainings_deelnemer" | "geconsulteerd";

const LEZING_C_CAT_LABEL: Record<LezingCCat, string> = {
  leider: "leider",
  kernteam: "kernteam",
  trainings_deelnemer: "trainings-deelnemer",
  geconsulteerd: "geconsulteerd",
};

// Defensieve normalisatie: oudere data kan categorie-namen met dash, spatie of
// in mixed-case bevatten. Mapt elke variant naar de canonical interne vorm.
//   • "trainings-deelnemer" / "trainings deelnemer" / "Trainings_Deelnemer"
//     → "trainings_deelnemer"
//   • "Kernteam" / "kernteam-MT" → "kernteam"
//   • case-insensitive accept voor "leider" en "geconsulteerd"
// Returns null voor onbekende categorieën zodat caller default-gedrag kan
// kiezen (bv. heuristiek toepassen).
function normaliseerCategorie(raw: string | undefined): LezingCCat | null {
  if (!raw) return null;
  const norm = raw
    .toString()
    .trim()
    .toLowerCase()
    .replace(/[\s-]+/g, "_"); // unify spaces and dashes naar underscores
  if (norm === "leider") return "leider";
  if (norm === "geconsulteerd") return "geconsulteerd";
  if (
    norm === "trainings_deelnemer" ||
    norm === "training_deelnemer" ||
    norm === "trainingsdeelnemer"
  ) {
    return "trainings_deelnemer";
  }
  if (
    norm === "kernteam" ||
    norm === "kernteam_uitvoerend" ||
    norm === "kernteam_mt" ||
    norm === "kernteam_mt_cultuur"
  ) {
    return "kernteam";
  }
  return null;
}

// ────────────────────────────────────────────────────────────────────────────
// Lezing-C — uren-niveaus per categorie (kernteam-model). Bron: AUDIT-KERNTEAM-MODEL.md.
// piek = piek-jaar, nietPiek = niet-piek-jaar (analyse/ontwerp/borging-aanloop),
// borging = expliciete borging/nazorg/verankering-fase. Voor trainings-deelnemer
// en geconsulteerd geldt een afwijkende regel — zie berekenRolUrenPerJaar.
// ────────────────────────────────────────────────────────────────────────────
const LEZING_C_UREN_NIVEAUS: Record<LezingCCat, { piek: number; nietPiek: number; borging: number }> = {
  leider: { piek: 80, nietPiek: 40, borging: 25 },
  kernteam: { piek: 40, nietPiek: 15, borging: 10 },
  trainings_deelnemer: { piek: 0, nietPiek: 0, borging: 0 }, // afhankelijk van fase + domein
  geconsulteerd: { piek: 0, nietPiek: 0, borging: 0 }, // afhankelijk van piek-volgorde
};

// Programma- vs lijn-aandeel per categorie (interpretatie B). Voor
// trainings-deelnemer wijkt mens/data af.
const LEZING_C_PCTS: Record<LezingCCat, { programma: number; lijn: number; raadplegen: number }> = {
  leider: { programma: 0.90, lijn: 0.10, raadplegen: 0 },
  kernteam: { programma: 0.80, lijn: 0.20, raadplegen: 0 },
  trainings_deelnemer: { programma: 0.50, lijn: 0.50, raadplegen: 0 }, // mens-default
  geconsulteerd: { programma: 0, lijn: 0, raadplegen: 1.0 },
};

// Trainings-deelnemer per domein heeft eigen pcts (zie spec-tabel).
const LEZING_C_PCTS_TRAININGS_PER_DOMEIN: Partial<Record<Domein, { programma: number; lijn: number; raadplegen: number }>> = {
  mens: { programma: 0.50, lijn: 0.50, raadplegen: 0 },
  data_systemen: { programma: 0.70, lijn: 0.30, raadplegen: 0 },
};

// Fase-typering uit een fase-string van begrotingAdvies.verdelingPerJaar.
// Geeft een grove indeling die voldoende is om uren-niveaus te kiezen.
type FaseType =
  | "piek"
  | "niet-piek"
  | "borging"
  | "basis"            // mens trainings: blok 1 (24u)
  | "vaardigheid"      // mens trainings: vaardigheidstraining (22u)
  | "realisatie"       // data trainings: 14u
  | "acceptatie";      // data trainings: 14u

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
    // realisatie = piek-fase, behalve als context data-systemen → realisatie-fase voor trainings-deelnemer.
    if (f.includes("realisatie")) return "realisatie";
    return "piek";
  }
  // analyse / ontwerp / behoeftestelling / leverancier-selectie / inventarisatie / curriculumvalidatie
  return "niet-piek";
}

// Bepaal voor één jaar binnen een scenario+domein de dominante fase-type
// (op basis van euro-aandeel uit begrotingAdvies.verdelingPerJaar). Als
// geen begrotingsdata: val terug op "niet-piek".
type BegrotingInspMin = {
  inspanningTitel?: string;
  domein?: Domein;
  verdelingPerJaar?: Array<{ jaar: number; euro: number; fase: string; activiteit?: string }>;
};
type BegrotingScenarioMin = {
  inspanningen?: BegrotingInspMin[];
};

function bepaalFaseType(
  scenario: BegrotingScenarioMin | null | undefined,
  domein: Domein,
  jaar: number,
): FaseType {
  if (!scenario?.inspanningen) return "niet-piek";
  // Tel euro per fase-type voor inspanningen in dit domein in dit jaar
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
  // Specifieke fasen krijgen prioriteit boven generieke "piek"/"niet-piek"
  // wanneer er trainings-fasen aanwezig zijn (basis/vaardigheid/realisatie/acceptatie).
  const specifiek: FaseType[] = ["basis", "vaardigheid", "realisatie", "acceptatie"];
  let specMax: { type: FaseType | null; sum: number } = { type: null, sum: 0 };
  for (const t of specifiek) {
    if (tally[t] > specMax.sum) specMax = { type: t, sum: tally[t] };
  }
  if (specMax.type) return specMax.type;

  // Anders: kies dominante uit piek/borging/niet-piek
  const grof: FaseType[] = ["piek", "borging", "niet-piek"];
  let grofMax: { type: FaseType; sum: number } = { type: "niet-piek", sum: -1 };
  for (const t of grof) {
    if (tally[t] > grofMax.sum) grofMax = { type: t, sum: tally[t] };
  }
  return grofMax.type;
}

// Geef de chronologische lijst van piek-jaren voor één scenario+domein.
// Wordt gebruikt voor "geconsulteerd" (1e + 2e piek krijgen 3u elk).
function pieksjaren(
  scenario: BegrotingScenarioMin | null | undefined,
  domein: Domein,
): number[] {
  if (!scenario?.inspanningen) return [];
  const jaren = new Set<number>();
  const perJaarType = new Map<number, Record<FaseType, number>>();
  for (const i of scenario.inspanningen) {
    if (i.domein !== domein) continue;
    for (const v of i.verdelingPerJaar ?? []) {
      jaren.add(v.jaar);
      const cur = perJaarType.get(v.jaar) ?? {
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

// Bereken uren-per-jaar voor één persoon op basis van categorie + fase-type.
// Output is uren per persoon (vermenigvuldigen met aantal voor rol-totaal).
function berekenRolUrenPerPersoonPerJaar(
  categorie: LezingCCat,
  faseType: FaseType,
  domein: Domein,
  jaar: number,
  alleJarenPiek: number[], // chronologische piek-jaren — voor geconsulteerd-detectie
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
  if (categorie === "trainings_deelnemer") {
    if (domein === "mens") {
      if (faseType === "basis") return 24;
      if (faseType === "vaardigheid") return 22;
      return 0;
    }
    if (domein === "data_systemen") {
      if (faseType === "realisatie") return 14;
      if (faseType === "acceptatie") return 14;
      return 0;
    }
    return 0;
  }
  if (categorie === "geconsulteerd") {
    // 3u in 1e piek-jaar, 3u in 2e piek-jaar, anders 0.
    const idx = alleJarenPiek.indexOf(jaar);
    if (idx === 0 || idx === 1) return 3;
    return 0;
  }
  return 0;
}

// Pcts-lookup met domein-context voor trainings-deelnemer.
function pctsVoorCategorie(categorie: LezingCCat, domein: Domein): { programma: number; lijn: number; raadplegen: number } {
  if (categorie === "trainings_deelnemer") {
    return LEZING_C_PCTS_TRAININGS_PER_DOMEIN[domein] ?? LEZING_C_PCTS.trainings_deelnemer;
  }
  return LEZING_C_PCTS[categorie];
}

// ────────────────────────────────────────────────────────────────────────────
// herclassificeerRol — orkestreert het wijzigen van een rol-categorie:
// (1) update interneUrenLezing.rolCategorieen[domein][functieId]
// (2) per scenario per domein per jaar: hernieuw rol.uren + rol.kosten
// (3) per domein: hernieuw programmaUren / lijnUren / raadplegenUren
//     op basis van categorie-pcts + rol.uren
// (4) hertel jaar.totaalUren/Kosten, domein.totaal, scenario.totaal,
//     scenario.totalenPerJaar.
// Alleen het scenario waar de wijziging gedaan is hoeft strict-genomen
// een herrekening, maar we doen alle scenarios voor consistentie omdat
// de rolCategorieen-marker globaal is (één override geldt voor alle scenarios).
// ────────────────────────────────────────────────────────────────────────────
type BegrotingAdviesMin = {
  startJaar?: number;
  scenarios?: Partial<Record<ScenarioLabel, BegrotingScenarioMin | null>>;
};

function herclassificeerRol(
  advies: InterneUrenAdvies,
  domein: Domein,
  functieId: string,
  nieuweCategorie: LezingCCat,
  selectiePerDomein: Record<Domein, Record<string, FunctieInput>> | undefined,
  begrotingAdvies: BegrotingAdviesMin | undefined,
  basisTarief: number,
  referentiejaar: number,
  indexatiePct: number,
): InterneUrenAdvies {
  // 1. Update marker
  const huidigeMarker: InterneUrenLezingMarker = advies.interneUrenLezing ?? {};
  const huidigeMapping = huidigeMarker.rolCategorieen ?? {};
  const huidigeDomeinMapping = huidigeMapping[domein] ?? {};
  const nieuweMarker: InterneUrenLezingMarker = {
    ...huidigeMarker,
    rolCategorieen: {
      ...huidigeMapping,
      [domein]: { ...huidigeDomeinMapping, [functieId]: nieuweCategorie },
    },
  };

  const aantal = selectiePerDomein?.[domein]?.[functieId]?.aantal ?? 1;

  // 2-4. Loop scenarios → domeinen → jaren → rollen
  const newScenarios: InterneUrenAdvies["scenarios"] = { ...advies.scenarios };
  const scenKeys: ScenarioLabel[] = ["optimaal", "plus20", "min20", "advies"];
  for (const scenKey of scenKeys) {
    const scen = newScenarios[scenKey];
    if (!scen) continue;
    const begrotingScenario = begrotingAdvies?.scenarios?.[scenKey] ?? null;
    const piekJarenLijst: Record<Domein, number[]> = {
      cultuur: pieksjaren(begrotingScenario, "cultuur"),
      mens: pieksjaren(begrotingScenario, "mens"),
      data_systemen: pieksjaren(begrotingScenario, "data_systemen"),
      processen: pieksjaren(begrotingScenario, "processen"),
    };
    const newDomeinen: DomeinBlok[] = scen.domeinen.map((d) => {
      // Voor het gewijzigde domein: pas rol-uren aan voor de specifieke functieId.
      // Hercalculatie van programmaUren/lijnUren/raadplegenUren doen we voor ALLE
      // domeinen omdat we de pcts per categorie willen herberekenen.
      const heeftRol = d.jaren.some((jr) => jr.rollen.some((r) => r.functieId === functieId));
      const moetRolUpdaten = d.domein === domein && heeftRol;

      const newJaren: JaarBlok[] = d.jaren.map((jr) => {
        let nieuweRollen = jr.rollen;
        if (moetRolUpdaten) {
          const faseType = bepaalFaseType(begrotingScenario, d.domein, jr.jaar);
          const piekJaren = piekJarenLijst[d.domein];
          const urenPerPersoon = berekenRolUrenPerPersoonPerJaar(
            nieuweCategorie,
            faseType,
            d.domein,
            jr.jaar,
            piekJaren,
          );
          const nieuweUrenTotaal = urenPerPersoon * aantal;
          const tarief = berekenGeindexeerdTarief(basisTarief, referentiejaar, indexatiePct, jr.jaar);
          nieuweRollen = jr.rollen.map((r) => {
            if (r.functieId !== functieId) return r;
            return {
              ...r,
              uren: nieuweUrenTotaal,
              uurtarief: tarief,
              kosten: nieuweUrenTotaal * tarief,
            };
          });
        }
        const totaalUren = nieuweRollen.reduce((s, x) => s + (x.uren ?? 0), 0);
        const totaalKosten = nieuweRollen.reduce((s, x) => s + (x.kosten ?? 0), 0);
        return { ...jr, rollen: nieuweRollen, totaalUren, totaalKosten };
      });

      // Hercalculeer per-domein programma/lijn/raadplegen op basis van rol-categorieen
      let programmaUren = 0;
      let lijnUren = 0;
      let raadplegenUren = 0;
      for (const jr of newJaren) {
        for (const r of jr.rollen) {
          // Bepaal categorie van deze rol — gebruik de NIEUWE marker
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

    // Hercalculeer scenario-niveau: totaalUren, totaalKosten, totalenPerJaar,
    // programma/lijn/raadplegen-totalen.
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
      }
      // Programma/lijn/raadplegen per jaar: re-derive uit rol-pcts per jaar
      for (const d of newDomeinen) {
        const j = d.jaren.find((x) => x.jaar === t.jaar);
        if (!j) continue;
        for (const r of j.rollen) {
          const rolCat = bepaalLezingCCategorie(
            d.domein,
            r.functieId,
            r.functieNaam,
            selectiePerDomein?.[d.domein]?.[r.functieId],
            nieuweMarker,
            (r as { categorie?: string }).categorie,
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

  return {
    ...advies,
    scenarios: newScenarios,
    interneUrenLezing: nieuweMarker,
  };
}

// Vind huidige leider in een domein, op basis van interneUrenLezing.rolCategorieen
// (override) en/of de heuristiek. Returnt functieId van de eerste rol die als leider
// is gemarkeerd, of null. Gebruikt voor de "er is al een leider"-waarschuwing.
function vindHuidigeLeiderId(
  advies: InterneUrenAdvies,
  domein: Domein,
  selectiePerDomein: Record<Domein, Record<string, FunctieInput>> | undefined,
): string | null {
  const marker = advies.interneUrenLezing;
  // Probeer eerst expliciete override
  const overrides = marker?.rolCategorieen?.[domein] ?? {};
  for (const [fId, c] of Object.entries(overrides)) {
    if (c === "leider") return fId;
  }
  // Anders: scan eerste scenario
  const scenarios = advies.scenarios;
  const scenKeys: ScenarioLabel[] = ["optimaal", "plus20", "min20", "advies"];
  for (const k of scenKeys) {
    const scen = scenarios[k];
    if (!scen) continue;
    const dBlok = scen.domeinen.find((d) => d.domein === domein);
    if (!dBlok) continue;
    const seen = new Set<string>();
    for (const jr of dBlok.jaren) {
      for (const r of jr.rollen) {
        if (seen.has(r.functieId)) continue;
        seen.add(r.functieId);
        // Skip het toepassen van overrides hier — die zijn al gechecked
        if (overrides[r.functieId]) continue;
        const cat = bepaalLezingCCategorie(
          domein,
          r.functieId,
          r.functieNaam,
          selectiePerDomein?.[domein]?.[r.functieId],
          marker,
        );
        if (cat === "leider") return r.functieId;
      }
    }
    break; // één scenario is voldoende
  }
  return null;
}

const LEZING_C_CAT_KLEUR: Record<LezingCCat, string> = {
  leider: "bg-[#003366] text-white",
  kernteam: "bg-blue-100 text-blue-900 border border-blue-200",
  trainings_deelnemer: "bg-emerald-100 text-emerald-900 border border-emerald-200",
  geconsulteerd: "bg-gray-100 text-gray-700 border border-gray-200",
};

// Type voor de optionele Lezing-C marker (override-mapping). Wordt door de
// per-rol categorie-dropdown geschreven, en is óók wat de Lezing-C-doorvoer-
// agent zou schrijven. Lazy-typing — alle velden optioneel.
type InterneUrenLezingMarker = {
  lezing?: string;
  timestamp?: string;
  toelichting?: string;
  urenNiveaus?: Partial<Record<LezingCCat, { piek?: number; nietPiek?: number; buitenPiek?: number; borging?: number; totaal?: number }>>;
  rolCategorieen?: Partial<Record<Domein, Record<string, LezingCCat>>>;
  inspanningsleiders?: Partial<Record<Domein, { naam?: string; tbd?: boolean; rolLabel?: string }>>;
};

// Heuristiek voor Lezing-C categorie. Geeft een redelijke default; wanneer de
// Lezing-C-doorvoer-agent expliciete `interneUrenLezing.rolCategorieen` schrijft,
// of de gebruiker via de UI-dropdown een categorie kiest, leest deze functie
// die override (hoogste prioriteit).
function bepaalLezingCCategorie(
  domein: Domein,
  functieId: string,
  functieNaam: string | undefined,
  selectie: FunctieInput | undefined,
  lezingMarker?: InterneUrenLezingMarker,
  rolCategorie?: string,
): LezingCCat {
  // 1. Expliciete override (UI-dropdown of doorvoer-agent) — hoogste prioriteit
  const expl = lezingMarker?.rolCategorieen?.[domein]?.[functieId];
  const norm = normaliseerCategorie(expl as string | undefined);
  if (norm) return norm;

  // 2. Direct rol.categorie-veld (gezet door doorvoer-script)
  const rolNorm = normaliseerCategorie(rolCategorie);
  if (rolNorm) return rolNorm;

  // 3. Heuristiek op basis van selectie-flags
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

  // Mens-domein heuristiek voor cursisten (frontline-medewerkers met grote aantallen)
  if (domein === "mens") {
    const aantal = selectie?.aantal ?? 1;
    if (
      aantal >= 3 &&
      (functieId.includes("klantenservice") ||
        functieId.includes("accountmanager") ||
        functieId.includes("mdw_binnendienst"))
    ) {
      return "trainings_deelnemer";
    }
    if ((selectie?.urenPerJaar ?? 0) === 0 && aantal >= 1 && functieId !== "manager_klantcontact") {
      return "trainings_deelnemer";
    }
  }

  return "kernteam";
}

const SCENARIO_META: Array<{
  key: ScenarioLabel;
  label: string;
  kleur: { banner: string; tekst: string; accent: string; kaart: string };
}> = [
  { key: "optimaal", label: "Huidig budget", kleur: { banner: "bg-[#003366]", tekst: "text-blue-100", accent: "text-[#003366]", kaart: "border-blue-200 bg-blue-50" } },
  { key: "plus20", label: "+20% budget (sneller)", kleur: { banner: "bg-green-800", tekst: "text-green-100", accent: "text-green-800", kaart: "border-green-200 bg-green-50" } },
  { key: "min20", label: "−20% budget (langzamer)", kleur: { banner: "bg-amber-800", tekst: "text-amber-100", accent: "text-amber-800", kaart: "border-amber-200 bg-amber-50" } },
  { key: "advies", label: "Snelste scenario", kleur: { banner: "bg-purple-800", tekst: "text-purple-100", accent: "text-purple-800", kaart: "border-purple-300 bg-purple-50" } },
];

export default function StapInterneUren({
  session,
  stap4Result,
  onStepCompleted,
}: {
  session: DINSession;
  stap4Result?: Stap4Result;
  onStepCompleted?: () => void;
}): React.ReactElement {
  const { updateSession, saveNow } = useSession();
  const { addToast } = useToast();

  const [basisTarief, setBasisTarief] = useState<number>(DEFAULT_BASIS_TARIEF);
  const [referentiejaar, setReferentiejaar] = useState<number>(DEFAULT_REFERENTIEJAAR);
  const [indexatiePct, setIndexatiePct] = useState<number>(DEFAULT_INDEXATIE_PCT);
  // Uren-budget norm per jaar (user-setting, default 540 voor 2026 zoals user aangaf)
  const [urenBudgetStart, setUrenBudgetStart] = useState<number>(540);

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [advies, setAdvies] = useState<InterneUrenAdvies | null>(null);
  // Per-scenario retry — welk label is nu aan het her-genereren?
  const [retryingLabel, setRetryingLabel] = useState<ScenarioLabel | null>(null);

  const [fineutOpen, setFineutOpen] = useState(false);
  const [fineutInstr, setFineutInstr] = useState("");

  // ───── Q&A FLOW (3-stappen): vragen → antwoorden → vastgestelde uren ─────
  type Vraag = {
    id: string;
    vraag: string;
    aanbevolenAntwoord?: string;
    toelichtingAanbeveling?: string;
    voorbeeldAntwoord?: string; // legacy
  };
  type InspanningVragen = {
    groepId: string;
    inspanningTitel: string;
    domein: Domein;
    vragen: Vraag[];
  };
  type RolUren = {
    functieId: string;
    functieNaam: string;
    afdeling?: string;
    urenTotaal: number;
    onderbouwing: string;
  };
  type InspanningUren = {
    groepId: string;
    inspanningTitel: string;
    domein: Domein;
    rollen: RolUren[];
  };

  const [vragenLoading, setVragenLoading] = useState(false);
  const [vragenError, setVragenError] = useState<string | null>(null);
  const [vragenPerInspanning, setVragenPerInspanning] = useState<InspanningVragen[]>([]);
  // antwoordenPerInspanning[groepId][vraagId] = antwoord-tekst
  const [antwoordenPerInspanning, setAntwoordenPerInspanning] = useState<Record<string, Record<string, string>>>({});
  const [vaststellenLoading, setVaststellenLoading] = useState(false);
  const [vaststellenError, setVaststellenError] = useState<string | null>(null);
  const [vastgesteldeUrenPerInspanning, setVastgesteldeUrenPerInspanning] = useState<InspanningUren[]>([]);
  const [vragenModalOpen, setVragenModalOpen] = useState(false);
  const [urenTabelOpen, setUrenTabelOpen] = useState(false);

  // Functie-selectie per domein — per functie: aantal personen + (optioneel) uren/jaar/persoon
  const DOMEINEN: Domein[] = ["cultuur", "mens", "data_systemen", "processen"];

  function defaultSelectiePerDomein(): Record<Domein, Record<string, FunctieInput>> {
    const init: Record<Domein, Record<string, FunctieInput>> = { cultuur: {}, mens: {}, data_systemen: {}, processen: {} };
    for (const f of CITO_FUNCTIES) {
      const rel = (f.inspanningRelevantie ?? []) as Domein[];
      for (const d of rel) {
        if (d in init) init[d][f.id] = { aantal: 1 };
      }
    }
    return init;
  }

  const [selectiePerDomein, setSelectiePerDomein] = useState<Record<Domein, Record<string, FunctieInput>>>(
    () => defaultSelectiePerDomein()
  );
  const [customFunctiesPerDomein, setCustomFunctiesPerDomein] = useState<Record<Domein, CustomFunctie[]>>({
    cultuur: [], mens: [], data_systemen: [], processen: [],
  });
  const [actiefDomein, setActiefDomein] = useState<Domein>("cultuur");
  const [selectieOpen, setSelectieOpen] = useState(false);

  // Form-state voor custom functie toevoegen (per domein)
  const [customNaam, setCustomNaam] = useState("");
  const [customSchaal, setCustomSchaal] = useState<string>("");

  function toggleFunctie(domein: Domein, id: string) {
    setSelectiePerDomein((prev) => {
      const next = { ...prev, [domein]: { ...prev[domein] } };
      if (id in next[domein]) delete next[domein][id];
      else next[domein][id] = { aantal: 1 };
      return next;
    });
  }
  function setAantalVoor(domein: Domein, id: string, aantal: number) {
    setSelectiePerDomein((prev) => {
      const clamped = Math.max(1, Math.min(50, Math.floor(aantal) || 1));
      const cur = prev[domein][id] ?? { aantal: 1 };
      return { ...prev, [domein]: { ...prev[domein], [id]: { ...cur, aantal: clamped } } };
    });
  }
  function setUrenPerJaarVoor(domein: Domein, id: string, urenPerJaar: number | undefined) {
    setSelectiePerDomein((prev) => {
      const cur = prev[domein][id] ?? { aantal: 1 };
      const next = { ...cur };
      if (urenPerJaar === undefined || urenPerJaar <= 0 || !Number.isFinite(urenPerJaar)) {
        delete next.urenPerJaar;
      } else {
        next.urenPerJaar = Math.max(1, Math.min(2000, Math.floor(urenPerJaar)));
      }
      return { ...prev, [domein]: { ...prev[domein], [id]: next } };
    });
  }
  function selecteerAllesIn(domein: Domein, afdeling: CitoAfdeling) {
    setSelectiePerDomein((prev) => {
      const copy = { ...prev[domein] };
      for (const f of CITO_FUNCTIES) if (f.afdeling === afdeling && !(f.id in copy)) copy[f.id] = { aantal: 1 };
      return { ...prev, [domein]: copy };
    });
  }
  function deselecteerAllesIn(domein: Domein, afdeling: CitoAfdeling) {
    setSelectiePerDomein((prev) => {
      const copy = { ...prev[domein] };
      for (const f of CITO_FUNCTIES) if (f.afdeling === afdeling) delete copy[f.id];
      return { ...prev, [domein]: copy };
    });
  }
  function resetNaarAanbevolen(domein: Domein) {
    const alle = defaultSelectiePerDomein();
    setSelectiePerDomein((prev) => ({ ...prev, [domein]: alle[domein] }));
  }
  function allesInDomein(domein: Domein) {
    setSelectiePerDomein((prev) => {
      const copy: Record<string, FunctieInput> = { ...prev[domein] };
      for (const f of CITO_FUNCTIES) if (!(f.id in copy)) copy[f.id] = { aantal: 1 };
      return { ...prev, [domein]: copy };
    });
  }
  function nietsInDomein(domein: Domein) {
    setSelectiePerDomein((prev) => ({ ...prev, [domein]: {} }));
  }

  function voegCustomFunctieToe(domein: Domein) {
    const naam = customNaam.trim();
    if (!naam) return;
    const schaal = customSchaal.trim() ? Number(customSchaal) : undefined;
    const id = `custom-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
    const nieuwe: CustomFunctie = { id, naam, schaal: Number.isFinite(schaal) ? (schaal as number) : undefined };
    setCustomFunctiesPerDomein((prev) => ({ ...prev, [domein]: [...prev[domein], nieuwe] }));
    setSelectiePerDomein((prev) => ({ ...prev, [domein]: { ...prev[domein], [id]: { aantal: 1 } } }));
    setCustomNaam("");
    setCustomSchaal("");
  }
  function verwijderCustomFunctie(domein: Domein, id: string) {
    setCustomFunctiesPerDomein((prev) => ({ ...prev, [domein]: prev[domein].filter((c) => c.id !== id) }));
    setSelectiePerDomein((prev) => {
      const copy = { ...prev[domein] };
      delete copy[id];
      return { ...prev, [domein]: copy };
    });
  }

  const geselecteerdePerDomein: Record<Domein, number> = {
    cultuur: Object.keys(selectiePerDomein.cultuur).length,
    mens: Object.keys(selectiePerDomein.mens).length,
    data_systemen: Object.keys(selectiePerDomein.data_systemen).length,
    processen: Object.keys(selectiePerDomein.processen).length,
  };
  // Totaal aantal personen per domein (sum van aantal-veld) — gaat omhoog bij
  // meer personen op één functie OF bij toevoegen van een nieuwe functie
  const personenPerDomein: Record<Domein, number> = {
    cultuur: Object.values(selectiePerDomein.cultuur).reduce((s, v) => s + v.aantal, 0),
    mens: Object.values(selectiePerDomein.mens).reduce((s, v) => s + v.aantal, 0),
    data_systemen: Object.values(selectiePerDomein.data_systemen).reduce((s, v) => s + v.aantal, 0),
    processen: Object.values(selectiePerDomein.processen).reduce((s, v) => s + v.aantal, 0),
  };
  const geselecteerdeTotaal =
    geselecteerdePerDomein.cultuur + geselecteerdePerDomein.mens +
    geselecteerdePerDomein.data_systemen + geselecteerdePerDomein.processen;
  const totaalAantalPersonen =
    personenPerDomein.cultuur + personenPerDomein.mens +
    personenPerDomein.data_systemen + personenPerDomein.processen;

  // Helper: bouw toegestaneFunctiesPerDomein payload voor API's
  type ToegestaneFunctiePayload = {
    id: string;
    naam: string;
    afdeling: string;
    schaal?: number;
    aantal: number;
    urenPerJaar?: number;
    custom?: boolean;
  };
  function buildToegestaneFunctiesPerDomein(): Record<Domein, ToegestaneFunctiePayload[]> {
    const out: Record<Domein, ToegestaneFunctiePayload[]> = { cultuur: [], mens: [], data_systemen: [], processen: [] };
    for (const d of DOMEINEN) {
      for (const [id, input] of Object.entries(selectiePerDomein[d])) {
        const citoF = CITO_FUNCTIES.find((f) => f.id === id);
        if (citoF) {
          out[d].push({
            id: citoF.id, naam: citoF.naam, afdeling: citoF.afdeling, schaal: citoF.schaal,
            aantal: input.aantal, ...(input.urenPerJaar ? { urenPerJaar: input.urenPerJaar } : {}),
          });
          continue;
        }
        const cf = customFunctiesPerDomein[d].find((c) => c.id === id);
        if (cf) {
          out[d].push({
            id: cf.id, naam: cf.naam, afdeling: "Custom", schaal: cf.schaal,
            aantal: input.aantal, ...(input.urenPerJaar ? { urenPerJaar: input.urenPerJaar } : {}),
            custom: true,
          });
        }
      }
    }
    return out;
  }

  // STAP 2a — vragen ophalen
  async function haalVragenOp() {
    setVragenError(null);
    setVaststellenError(null);
    if (!begroting?.scenarios?.optimaal) {
      setVragenError("Geen optimaal scenario uit stap 6 beschikbaar.");
      return;
    }
    if (geselecteerdeTotaal === 0) {
      setVragenError("Selecteer eerst minstens één functie in een domein (stap 1).");
      return;
    }
    setVragenLoading(true);
    try {
      const optimaal = begroting.scenarios.optimaal;
      // BUG-FIX: ALTIJD een unieke groepId per inspanning afdwingen — voorheen werd
      // missing groepId als "" opgeslagen, waardoor antwoorden van inspanning A
      // ook in inspanning B verschenen.
      const inspanningenInput = optimaal.inspanningen.map((i, idx) => {
        const stableGroepId =
          i.groepId && i.groepId.trim().length > 0 ? i.groepId : `insp-${idx}-${i.domein}`;
        const bcEntry = stap4Result?.subEffortAnalysis?.find((e) => e.groepId === i.groepId);
        const bc = (bcEntry as unknown as { businessCase?: { answers?: Record<string, string> } })?.businessCase;
        return {
          inspanningTitel: i.inspanningTitel,
          groepId: stableGroepId,
          domein: i.domein,
          motivatie: i.motivatie,
          verdelingPerJaar: i.verdelingPerJaar,
          businessCaseInterneRollen: bc?.answers?.["interne_rollen"] ?? bc?.answers?.["cito_rollen"],
          businessCaseInterneUren: bc?.answers?.["interne_uren_per_rol"] ?? bc?.answers?.["uren_per_rol"],
        };
      });
      const res = await fetch("/api/interne-uren-vragen", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          inspanningen: inspanningenInput,
          toegestaneFunctiesPerDomein: buildToegestaneFunctiesPerDomein(),
          scope: session.scope, vision: session.vision,
        }),
      });
      const text = await res.text();
      let data: { success?: boolean; data?: { inspanningen?: InspanningVragen[] }; error?: string };
      try { data = JSON.parse(text); }
      catch { setVragenError(`Onverwacht antwoord (${res.status})`); setVragenLoading(false); return; }
      if (!data.success || !data.data?.inspanningen) {
        setVragenError(data.error ?? "AI gaf geen geldig antwoord");
        setVragenLoading(false);
        return;
      }
      // Force-uniqueness van groepId in AI-output (fallback als AI toch dupliceert)
      const seen = new Set<string>();
      const uniqueInspanningen = data.data.inspanningen.map((insp, idx) => {
        let gid = insp.groepId;
        if (!gid || seen.has(gid)) gid = `insp-${idx}-${insp.domein}`;
        seen.add(gid);
        return { ...insp, groepId: gid };
      });
      setVragenPerInspanning(uniqueInspanningen);
      // Pre-fill antwoorden met aanbevolenAntwoord (Cito-context); behoud bestaande user-input
      setAntwoordenPerInspanning((prev) => {
        const next: Record<string, Record<string, string>> = { ...prev };
        for (const insp of uniqueInspanningen) {
          if (!next[insp.groepId]) next[insp.groepId] = {};
          for (const v of insp.vragen) {
            const bestaand = next[insp.groepId][v.id];
            if (bestaand === undefined || bestaand.trim() === "") {
              // Pre-fill met AI-aanbeveling (of legacy voorbeeldAntwoord)
              next[insp.groepId][v.id] = v.aanbevolenAntwoord ?? v.voorbeeldAntwoord ?? "";
            }
          }
        }
        return next;
      });
      setVragenModalOpen(true);
      setVragenLoading(false);
    } catch (err) {
      setVragenError(err instanceof Error ? err.message : "Netwerkfout");
      setVragenLoading(false);
    }
  }

  // STAP 2b — vaststellen uren op basis van antwoorden
  async function vaststellenUren() {
    setVaststellenError(null);
    if (vragenPerInspanning.length === 0) {
      setVaststellenError("Geen vragen — haal eerst vragen op.");
      return;
    }
    if (!begroting?.scenarios?.optimaal) {
      setVaststellenError("Geen optimaal scenario beschikbaar.");
      return;
    }
    setVaststellenLoading(true);
    try {
      const optimaal = begroting.scenarios.optimaal;
      const inspanningenInput = optimaal.inspanningen.map((i) => ({
        inspanningTitel: i.inspanningTitel,
        groepId: i.groepId ?? "",
        domein: i.domein,
        motivatie: i.motivatie,
        verdelingPerJaar: i.verdelingPerJaar,
      }));
      const vragenAntwoorden = vragenPerInspanning.map((vi) => ({
        groepId: vi.groepId,
        inspanningTitel: vi.inspanningTitel,
        domein: vi.domein,
        vragenAntwoorden: vi.vragen.map((v) => ({
          vraag: v.vraag,
          antwoord: antwoordenPerInspanning[vi.groepId]?.[v.id] ?? "",
        })),
      }));
      const res = await fetch("/api/interne-uren-vaststellen", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          inspanningen: inspanningenInput,
          vragenAntwoorden,
          toegestaneFunctiesPerDomein: buildToegestaneFunctiesPerDomein(),
          aantalJarenOptimaal: optimaal.aantalJaren,
          scope: session.scope, vision: session.vision,
        }),
      });
      const text = await res.text();
      let data: { success?: boolean; data?: { inspanningen?: InspanningUren[] }; error?: string };
      try { data = JSON.parse(text); }
      catch { setVaststellenError(`Onverwacht antwoord (${res.status})`); setVaststellenLoading(false); return; }
      if (!data.success || !data.data?.inspanningen) {
        setVaststellenError(data.error ?? "AI gaf geen geldig antwoord");
        setVaststellenLoading(false);
        return;
      }
      setVastgesteldeUrenPerInspanning(data.data.inspanningen);
      setUrenTabelOpen(true);
      setVragenModalOpen(false);
      setVaststellenLoading(false);
    } catch (err) {
      setVaststellenError(err instanceof Error ? err.message : "Netwerkfout");
      setVaststellenLoading(false);
    }
  }

  // Conservatief voorstel: reduceer breed-uitgerolde training en zwaar belaste
  // rollen tot realistischere niveaus. Houdt key-rollen + cultuur intact.
  // Onderbouwing per regel komt uit Cito-context (as-is procesinventarisatie
  // al gedaan; outside-in basistraining 3 dagen voor frontline genoeg).
  function bouwConservatiefVoorstel(): Array<{
    groepId: string;
    functieId: string;
    huidig: number;
    voorgesteld: number;
    reden: string;
  }> {
    const wijzigingen: Array<{ groepId: string; functieId: string; huidig: number; voorgesteld: number; reden: string }> = [];
    for (const insp of vastgesteldeUrenPerInspanning) {
      for (const r of insp.rollen) {
        const aantal = selectiePerDomein[insp.domein]?.[r.functieId]?.aantal ?? 1;
        const urenPP = aantal > 0 ? r.urenTotaal / aantal : r.urenTotaal;
        let voorgesteld = r.urenTotaal;
        let reden = "";

        // Mens-training: brede frontline-groepen → 24u basistraining/persoon
        if (
          insp.domein === "mens" &&
          (r.functieId.startsWith("klantenservice_") ||
            r.functieId.startsWith("accountmanager_") ||
            r.functieId.startsWith("mdw_binnendienst_") ||
            r.functieId === "campagne_marketeer_a" ||
            r.functieId === "campagne_marketeer_b") &&
          aantal >= 2
        ) {
          const nieuw = aantal * 24;
          if (nieuw < r.urenTotaal) {
            voorgesteld = nieuw;
            reden = `${aantal} pers × 24u basistraining (was ${urenPP.toFixed(0)}u/p) — outside-in basis = 3 dagen voor frontline`;
          }
        }
        // Trainer/Adviseur A: trainers leveren training, geen 120u meedraaien
        else if (r.functieId === "trainer_adviseur_a" && aantal >= 8) {
          const nieuwPP = insp.domein === "mens" ? 80 : 30;
          const nieuw = aantal * nieuwPP;
          if (nieuw < r.urenTotaal) {
            voorgesteld = nieuw;
            reden = `${aantal} trainers × ${nieuwPP}u (was ${urenPP.toFixed(0)}u/p) — trainers leveren training, draaien niet 120u mee`;
          }
        }
        // Procesondersteuner: as-is al in kaart → 240u (was 462u)
        else if (r.functieId.startsWith("procesondersteuner_") && r.urenTotaal > 350) {
          voorgesteld = 240;
          reden = `As-is procesinventarisatie al gedaan; resteert herontwerp + pilot + uitrol = 4-5u/maand × 4 jaar`;
        }
        // Procesmanager processen: 280u (was 518u)
        else if (
          r.functieId === "procesmanager_data" &&
          insp.domein === "processen" &&
          r.urenTotaal > 400
        ) {
          voorgesteld = 280;
          reden = `As-is al uitgevoerd; focus op to-be ontwerp + governance, 6u/maand realistisch`;
        }
        // Sectormanagers in CRM: strategisch, niet operationeel meebouwen
        else if (
          r.functieId.startsWith("sectormanager_") &&
          insp.domein === "data_systemen"
        ) {
          if (r.urenTotaal > 60) {
            voorgesteld = 60;
            reden = `Strategische input op CRM-mijlpalen, niet operationeel meebouwen`;
          }
        }
        // Productmanagers in mens: 80u content-validatie
        else if (
          r.functieId.startsWith("productmanager_") &&
          insp.domein === "mens" &&
          r.urenTotaal > 80
        ) {
          voorgesteld = 80;
          reden = `Content-validatie op outside-in materiaal, 80u over looptijd voldoende`;
        }

        if (voorgesteld !== r.urenTotaal) {
          wijzigingen.push({
            groepId: insp.groepId,
            functieId: r.functieId,
            huidig: r.urenTotaal,
            voorgesteld,
            reden,
          });
        }
      }
    }
    return wijzigingen;
  }

  function pasConservatiefVoorstelToe() {
    const wijzigingen = bouwConservatiefVoorstel();
    if (wijzigingen.length === 0) {
      addToast("Geen aanpassingen nodig — uren zijn al conservatief.", "info");
      return;
    }
    const huidigTotaal = vastgesteldeUrenPerInspanning.reduce(
      (s, i) => s + i.rollen.reduce((rs, r) => rs + r.urenTotaal, 0),
      0
    );
    const besparing = wijzigingen.reduce((s, w) => s + (w.huidig - w.voorgesteld), 0);
    const nieuwTotaal = huidigTotaal - besparing;
    const akkoord = window.confirm(
      `Conservatief voorstel:\n\n` +
        `${wijzigingen.length} rollen worden aangepast.\n` +
        `Totaal: ${huidigTotaal.toLocaleString("nl-NL")}u → ${nieuwTotaal.toLocaleString("nl-NL")}u (−${besparing.toLocaleString("nl-NL")}u, ${Math.round((besparing / huidigTotaal) * 100)}%)\n\n` +
        `Toepassen? (Klik daarna op 'Genereer interne-uren-advies' om scenarios opnieuw te berekenen.)`
    );
    if (!akkoord) return;
    setVastgesteldeUrenPerInspanning((prev) =>
      prev.map((insp) => ({
        ...insp,
        rollen: insp.rollen.map((r) => {
          const w = wijzigingen.find(
            (x) => x.groepId === insp.groepId && x.functieId === r.functieId
          );
          if (!w) return r;
          return {
            ...r,
            urenTotaal: w.voorgesteld,
            onderbouwing: r.onderbouwing
              ? `${r.onderbouwing} | Conservatief voorstel: ${w.reden}`
              : `Conservatief voorstel: ${w.reden}`,
          };
        }),
      }))
    );
    addToast(
      `${wijzigingen.length} aanpassingen toegepast: ${huidigTotaal.toLocaleString("nl-NL")}u → ${nieuwTotaal.toLocaleString("nl-NL")}u`,
      "success"
    );
  }

  // Handmatig per rol uren aanpassen
  function pasUrenAan(groepId: string, functieId: string, urenTotaal: number) {
    setVastgesteldeUrenPerInspanning((prev) =>
      prev.map((i) =>
        i.groepId !== groepId
          ? i
          : {
              ...i,
              rollen: i.rollen.map((r) =>
                r.functieId === functieId ? { ...r, urenTotaal: Math.max(0, Math.floor(urenTotaal) || 0) } : r
              ),
            }
      )
    );
  }

  const FINEUT_VOORBEELDEN: ReadonlyArray<{ kort: string; instructie: string }> = [
    { kort: "Meer sectormanagement-uren", instructie: "Verhoog de sectormanager-uren in het eerste jaar — zij moeten de cultuur-verandering gaan dragen." },
    { kort: "Minder uren op Data/Systemen", instructie: "Halveer de uren op Data/Systemen — we gaan een externe partij inschakelen voor de bouw." },
    { kort: "Toetsdeskundige C i.p.v. B", instructie: "Vervang Toetsdeskundige B door Toetsdeskundige C waar mogelijk — senioriteit past beter bij dit programma." },
    { kort: "Verplaats uren naar jaar 2-3", instructie: "Verminder de totale uren in jaar 1 en verplaats die naar jaar 2-3 — het eerste jaar is vooral scoping, minder handen aan bed nodig." },
    { kort: "Voeg project-coördinatie toe", instructie: "Voeg overal een Projectmanager D toe voor programma-coördinatie — 10-20% FTE per jaar." },
  ];

  // Restore vanuit sessie — inclusief user-settings (urenBudget, selectie per domein, custom functies)
  // BELANGRIJK: alleen 1× draaien om state-loop te voorkomen (auto-save → session update →
  // nieuwe stap4Result reference → restore → nieuwe state ref → auto-save → loop).
  const restoredRef = useRef(false);
  useEffect(() => {
    if (restoredRef.current) return;
    if (stap4Result === undefined) return; // wacht tot stap4Result beschikbaar is
    restoredRef.current = true; // mark restored UNCONDITIONEEL — voorkom loop
    const persisted = (stap4Result as unknown as { stap7InterneUren?: InterneUrenAdvies })?.stap7InterneUren;
    if (persisted) {
      setAdvies(persisted);
      if (persisted.uurtariefSettings) {
        setBasisTarief(persisted.uurtariefSettings.basisTarief);
        setReferentiejaar(persisted.uurtariefSettings.referentiejaar);
        setIndexatiePct(persisted.uurtariefSettings.indexatiePercentage);
      }
      if (typeof persisted.urenBudgetStart === "number") {
        setUrenBudgetStart(persisted.urenBudgetStart);
      }
      if (persisted.selectiePerDomein) {
        // Detect of het al de nieuwe vorm is ({aantal, urenPerJaar?}) of legacy (number)
        const sample = Object.values(persisted.selectiePerDomein.cultuur ?? {})[0];
        const isLegacyNumberShape = typeof sample === "number";
        const restored: Record<Domein, Record<string, FunctieInput>> = { cultuur: {}, mens: {}, data_systemen: {}, processen: {} };
        for (const d of DOMEINEN) {
          const dEntry = (persisted.selectiePerDomein as Record<string, Record<string, unknown>>)[d] ?? {};
          for (const [id, val] of Object.entries(dEntry)) {
            if (isLegacyNumberShape) {
              restored[d][id] = { aantal: typeof val === "number" ? val : 1 };
            } else if (val && typeof val === "object" && "aantal" in (val as object)) {
              const obj = val as FunctieInput;
              restored[d][id] = { aantal: obj.aantal ?? 1, ...(obj.urenPerJaar ? { urenPerJaar: obj.urenPerJaar } : {}) };
            } else {
              restored[d][id] = { aantal: 1 };
            }
          }
        }
        setSelectiePerDomein(restored);
      } else if (persisted.functieAantallen || (persisted.geselecteerdeFunctieIds && persisted.geselecteerdeFunctieIds.length > 0)) {
        // Legacy-migratie: zet oude globale selectie om naar domein-default (op basis van inspanningRelevantie)
        const legacy: Record<string, number> =
          persisted.functieAantallen ??
          Object.fromEntries((persisted.geselecteerdeFunctieIds ?? []).map((id) => [id, 1]));
        const migrated: Record<Domein, Record<string, FunctieInput>> = { cultuur: {}, mens: {}, data_systemen: {}, processen: {} };
        for (const [id, aantal] of Object.entries(legacy)) {
          const f = CITO_FUNCTIES.find((x) => x.id === id);
          const rel = (f?.inspanningRelevantie ?? []) as Domein[];
          const targets = rel.length > 0 ? rel : (DOMEINEN as Domein[]);
          for (const d of targets) migrated[d][id] = { aantal };
        }
        setSelectiePerDomein(migrated);
      }
      if (persisted.customFunctiesPerDomein) {
        setCustomFunctiesPerDomein({
          cultuur: persisted.customFunctiesPerDomein.cultuur ?? [],
          mens: persisted.customFunctiesPerDomein.mens ?? [],
          data_systemen: persisted.customFunctiesPerDomein.data_systemen ?? [],
          processen: persisted.customFunctiesPerDomein.processen ?? [],
        });
      }
      if (persisted.vragenAntwoorden) {
        setAntwoordenPerInspanning(persisted.vragenAntwoorden);
      }
      // Q&A state restore — vragen en vastgestelde uren als die er zijn
      const persistedExtra = persisted as unknown as {
        vragenPerInspanning?: InspanningVragen[];
        vastgesteldeUrenPerInspanning?: InspanningUren[];
      };
      if (persistedExtra.vragenPerInspanning) {
        setVragenPerInspanning(persistedExtra.vragenPerInspanning);
      }
      if (persistedExtra.vastgesteldeUrenPerInspanning) {
        setVastgesteldeUrenPerInspanning(persistedExtra.vastgesteldeUrenPerInspanning);
      }
    }
    // Mark mounted so auto-save niet bij eerste render firet
    setHasMounted(true);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [stap4Result]);

  // Mount-tracking voor auto-save (vermijd write bij eerste render)
  const [hasMounted, setHasMounted] = useState(false);

  // ───── AUTO-SAVE user-input (debounced 600ms) ─────
  // Persisteer ALLE user-input naar session ook al heeft user nog niet geklikt
  // op "Genereer interne-uren-advies". Dit voorkomt verlies bij navigatie.
  useEffect(() => {
    if (!hasMounted) return;
    const timer = setTimeout(() => {
      updateSession((prev) => {
        const currentWiz = prev.crossAnalyseWizard;
        const currentStap4 = currentWiz?.stepResults?.stap4;
        const huidig = (currentStap4 as unknown as {
          stap7InterneUren?: InterneUrenAdvies;
        } | undefined)?.stap7InterneUren;
        // Bestaand AI-advies behouden, alleen user-input merge'n
        const merged: InterneUrenAdvies = {
          ...(huidig ?? {
            uurtariefSettings: { basisTarief, referentiejaar, indexatiePercentage: indexatiePct },
            scenarios: { optimaal: null, plus20: null, min20: null },
          }),
          uurtariefSettings: { basisTarief, referentiejaar, indexatiePercentage: indexatiePct },
          urenBudgetStart,
          selectiePerDomein,
          customFunctiesPerDomein,
          vragenAntwoorden: antwoordenPerInspanning,
          ...(vragenPerInspanning.length > 0 ? { vragenPerInspanning } : {}),
          ...(vastgesteldeUrenPerInspanning.length > 0 ? { vastgesteldeUrenPerInspanning } : {}),
        } as InterneUrenAdvies;
        // NOOIT silent-droppen: als stap4 niet bestaat, init minimaal.
        return {
          ...prev,
          crossAnalyseWizard: {
            currentStep: currentWiz?.currentStep ?? 7,
            completedSteps: currentWiz?.completedSteps ?? [],
            wizardVersion: currentWiz?.wizardVersion ?? 2,
            ...currentWiz,
            stepResults: {
              ...(currentWiz?.stepResults ?? {}),
              stap4: {
                ...(currentStap4 ?? { samenvatting: "", subEffortAnalysis: [], consolidatieAdvies: [], citobreedInzicht: [] }),
                stap7InterneUren: merged,
              } as NonNullable<typeof currentStap4>,
            },
          },
        };
      });
    }, 600);
    return () => clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    hasMounted,
    selectiePerDomein,
    customFunctiesPerDomein,
    urenBudgetStart,
    basisTarief,
    referentiejaar,
    indexatiePct,
    antwoordenPerInspanning,
    vragenPerInspanning,
    vastgesteldeUrenPerInspanning,
  ]);

  const huidigJaar = new Date().getFullYear();
  const tariefPreview = berekenGeindexeerdTarief(basisTarief, referentiejaar, indexatiePct, huidigJaar);

  // Haal stap 6 scenario's uit session (via stap4.begrotingAdvies)
  type BegrotingInsp = {
    inspanningTitel: string;
    groepId?: string;
    domein: Domein;
    motivatie: string;
    verdelingPerJaar: Array<{ jaar: number; euro: number; fase: string; activiteit?: string }>;
  };
  type BegrotingScenario = {
    aantalJaren: number;
    startJaar?: number;
    jaarlijksBudgetEuro: number;
    inspanningen: BegrotingInsp[];
  };
  const begroting = (stap4Result as unknown as {
    begrotingAdvies?: {
      startJaar: number;
      scenarios: Partial<Record<ScenarioLabel, BegrotingScenario | null>>;
    };
  })?.begrotingAdvies;

  async function generateAdvies(opts?: { finetuneInstructie?: string; previousAdvies?: InterneUrenAdvies | null }) {
    setLoading(true);
    setError(null);
    if (!begroting?.scenarios) {
      setError("Geen begrotingsadvies uit stap 6 gevonden — genereer daar eerst.");
      setLoading(false);
      return;
    }
    if (geselecteerdeTotaal === 0) {
      setError("Selecteer minimaal één functie in minstens één domein voordat je de analyse draait.");
      setLoading(false);
      return;
    }
    // Inspanningen-meta: business-case antwoorden per inspanning
    const inspanningenMeta: Array<{ groepId?: string; businessCaseInterneRollen?: string; businessCaseInterneUren?: string }> = [];
    for (const entry of stap4Result?.subEffortAnalysis ?? []) {
      const bc = (entry as unknown as { businessCase?: { answers?: Record<string, string> } }).businessCase;
      if (bc?.answers) {
        inspanningenMeta.push({
          groepId: entry.groepId,
          businessCaseInterneRollen: bc.answers["interne_rollen"] ?? bc.answers["cito_rollen"] ?? "",
          businessCaseInterneUren: bc.answers["interne_uren_per_rol"] ?? bc.answers["uren_per_rol"] ?? "",
        });
      }
    }

    // Bouw scenario-payload met startJaar invullen
    const scenariosPayload: Partial<Record<ScenarioLabel, BegrotingScenario | null>> = {
      optimaal: begroting.scenarios.optimaal ? { ...begroting.scenarios.optimaal, startJaar: begroting.startJaar } : null,
      plus20: begroting.scenarios.plus20 ? { ...begroting.scenarios.plus20, startJaar: begroting.startJaar } : null,
      min20: begroting.scenarios.min20 ? { ...begroting.scenarios.min20, startJaar: begroting.startJaar } : null,
      advies: begroting.scenarios.advies ? { ...begroting.scenarios.advies, startJaar: begroting.startJaar } : null,
    };

    try {
      // Per-domein toegestane functies (Cito + custom), met aantal personen + (optioneel) urenPerJaar
      type ToegestaneFunctie = {
        id: string;
        naam: string;
        afdeling: string;
        schaal?: number;
        aantal: number;
        urenPerJaar?: number;
        custom?: boolean;
      };
      const toegestaneFunctiesPerDomein: Record<Domein, ToegestaneFunctie[]> = {
        cultuur: [], mens: [], data_systemen: [], processen: [],
      };
      for (const d of DOMEINEN) {
        for (const [id, input] of Object.entries(selectiePerDomein[d])) {
          const aantal = input.aantal;
          const urenPerJaar = input.urenPerJaar;
          const citoF = CITO_FUNCTIES.find((f) => f.id === id);
          if (citoF) {
            toegestaneFunctiesPerDomein[d].push({
              id: citoF.id,
              naam: citoF.naam,
              afdeling: citoF.afdeling,
              schaal: citoF.schaal,
              aantal,
              ...(urenPerJaar ? { urenPerJaar } : {}),
            });
            continue;
          }
          const custom = customFunctiesPerDomein[d].find((c) => c.id === id);
          if (custom) {
            toegestaneFunctiesPerDomein[d].push({
              id: custom.id,
              naam: custom.naam,
              afdeling: "Custom",
              schaal: custom.schaal,
              aantal,
              ...(urenPerJaar ? { urenPerJaar } : {}),
              custom: true,
            });
          }
        }
      }
      // Flat list (backward compat voor API's/onderdelen die nog over alle functies heen kijken)
      const toegestaneFuncties = DOMEINEN.flatMap((d) => toegestaneFunctiesPerDomein[d]);
      // Bouw urenBudgetPerJaar voor alle jaren van het langste scenario (gebruik startJaar norm constant)
      const maxAantalJaren = Math.max(
        begroting.scenarios.optimaal?.aantalJaren ?? 0,
        begroting.scenarios.plus20?.aantalJaren ?? 0,
        begroting.scenarios.min20?.aantalJaren ?? 0,
        begroting.scenarios.advies?.aantalJaren ?? 0,
      );
      const urenBudgetPerJaar = Array.from({ length: maxAantalJaren }, (_, i) => ({
        jaar: begroting.startJaar + i,
        urenBudget: urenBudgetStart,
      }));
      // Split 3 scenarios over 3 parallelle HTTP-requests — voorkomt Vercel 504
      // op grote prompts (elke request doet 1 AI-call i.p.v. 3).
      const basePayload = {
        scenarios: scenariosPayload,
        uurtariefSettings: { basisTarief, referentiejaar, indexatiePercentage: indexatiePct },
        inspanningenMeta,
        toegestaneFuncties,
        toegestaneFunctiesPerDomein,
        urenBudgetPerJaar,
        vastgesteldeUrenPerInspanning: vastgesteldeUrenPerInspanning.length > 0 ? vastgesteldeUrenPerInspanning : undefined,
        scope: session.scope,
        vision: session.vision,
        finetuneInstructie: opts?.finetuneInstructie ?? "",
        previousAdvies: opts?.previousAdvies ?? null,
      };

      async function fetchScenario(label: ScenarioLabel) {
        try {
          const r = await fetch("/api/interne-uren-advies", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ ...basePayload, onlyScenario: label }),
          });
          const t = await r.text();
          try {
            const d = JSON.parse(t) as { success?: boolean; data?: { scenario?: unknown }; error?: string };
            if (d.success && d.data?.scenario) return d.data.scenario;
            console.error(`[stap7] ${label} faalde:`, d.error ?? `status ${r.status}`);
            return null;
          } catch {
            console.error(`[stap7] ${label} non-JSON response (status ${r.status})`);
            return null;
          }
        } catch (err) {
          console.error(`[stap7] ${label} network error:`, err);
          return null;
        }
      }

      const [optRes, plusRes, minRes, adviesRes] = await Promise.all([
        scenariosPayload.optimaal ? fetchScenario("optimaal") : Promise.resolve(null),
        scenariosPayload.plus20 ? fetchScenario("plus20") : Promise.resolve(null),
        scenariosPayload.min20 ? fetchScenario("min20") : Promise.resolve(null),
        scenariosPayload.advies ? fetchScenario("advies") : Promise.resolve(null),
      ]);

      if (!optRes && !plusRes && !minRes && !adviesRes) {
        setError("Alle scenario's faalden — controleer Console of probeer opnieuw.");
        setLoading(false);
        return;
      }

      const partialFailures = [
        scenariosPayload.optimaal && !optRes ? "optimaal" : null,
        scenariosPayload.plus20 && !plusRes ? "plus20" : null,
        scenariosPayload.min20 && !minRes ? "min20" : null,
        scenariosPayload.advies && !adviesRes ? "advies" : null,
      ].filter(Boolean) as string[];

      // Verrijk met user-settings zodat ze bij terugkeer bewaard blijven
      const verrijkt: InterneUrenAdvies = {
        uurtariefSettings: { basisTarief, referentiejaar, indexatiePercentage: indexatiePct },
        scenarios: {
          optimaal: optRes as InterneUrenAdvies["scenarios"]["optimaal"] | null,
          plus20: plusRes as InterneUrenAdvies["scenarios"]["plus20"] | null,
          min20: minRes as InterneUrenAdvies["scenarios"]["min20"] | null,
          advies: adviesRes as InterneUrenAdvies["scenarios"]["advies"] | null,
        },
        partialFailures,
        // Tekst-coherentie vlag: alle scenario's komen uit de huidige
        // prompt (regel 10: geen absolute jaartallen). Verbergt de
        // "tekst-coherentie"-banner in §4.2 van de export.
        tekstenSchoon: true,
        urenBudgetStart,
        selectiePerDomein,
        customFunctiesPerDomein,
        vragenAntwoorden: antwoordenPerInspanning,
        ...(vragenPerInspanning.length > 0 ? { vragenPerInspanning } : {}),
        ...(vastgesteldeUrenPerInspanning.length > 0 ? { vastgesteldeUrenPerInspanning } : {}),
      } as InterneUrenAdvies;
      setAdvies(verrijkt);
      // Persisteer in session — NOOIT silent-droppen: init minimaal als stap4 ontbreekt.
      updateSession((prev) => {
        const currentWiz = prev.crossAnalyseWizard;
        const currentStap4 = currentWiz?.stepResults?.stap4;
        return {
          ...prev,
          crossAnalyseWizard: {
            currentStep: currentWiz?.currentStep ?? 7,
            completedSteps: currentWiz?.completedSteps ?? [],
            wizardVersion: currentWiz?.wizardVersion ?? 2,
            ...currentWiz,
            stepResults: {
              ...(currentWiz?.stepResults ?? {}),
              stap4: {
                ...(currentStap4 ?? { samenvatting: "", subEffortAnalysis: [], consolidatieAdvies: [], citobreedInzicht: [] }),
                stap7InterneUren: verrijkt,
              } as NonNullable<typeof currentStap4>,
            },
          },
        };
      });
      // Force save + bevestig in UI
      const version = await saveNow();
      if (version !== false) {
        addToast(`Interne-uren-advies opgeslagen (v${version})`, "success");
        onStepCompleted?.();
      } else {
        addToast("Opslaan naar cloud mislukt — wijzigingen staan lokaal opgeslagen. Probeer later opnieuw.", "error");
      }
      setLoading(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Netwerkfout");
      setLoading(false);
    }
  }

  // Regenereer 1 specifiek scenario. Gebruikt als het oorspronkelijke
  // genereer-request voor dat label faalde (scenarios.<label> === null).
  // Merget het resultaat in de bestaande advies zonder de andere 2 te raken.
  async function retryScenario(label: ScenarioLabel) {
    if (!advies || !begroting?.scenarios) return;
    setRetryingLabel(label);
    try {
      // Bouw dezelfde payload als generateAdvies
      type ToegestaneFunctie = {
        id: string; naam: string; afdeling: string; schaal?: number;
        aantal: number; urenPerJaar?: number; custom?: boolean;
      };
      const toegestaneFunctiesPerDomein: Record<Domein, ToegestaneFunctie[]> = {
        cultuur: [], mens: [], data_systemen: [], processen: [],
      };
      for (const d of DOMEINEN) {
        for (const [id, input] of Object.entries(selectiePerDomein[d])) {
          const citoF = CITO_FUNCTIES.find((f) => f.id === id);
          if (citoF) {
            toegestaneFunctiesPerDomein[d].push({
              id: citoF.id, naam: citoF.naam, afdeling: citoF.afdeling, schaal: citoF.schaal,
              aantal: input.aantal, ...(input.urenPerJaar ? { urenPerJaar: input.urenPerJaar } : {}),
            });
            continue;
          }
          const custom = customFunctiesPerDomein[d].find((c) => c.id === id);
          if (custom) {
            toegestaneFunctiesPerDomein[d].push({
              id: custom.id, naam: custom.naam, afdeling: "Custom", schaal: custom.schaal,
              aantal: input.aantal, ...(input.urenPerJaar ? { urenPerJaar: input.urenPerJaar } : {}),
              custom: true,
            });
          }
        }
      }
      const toegestaneFuncties = DOMEINEN.flatMap((d) => toegestaneFunctiesPerDomein[d]);
      const scenariosPayload: Partial<Record<ScenarioLabel, BegrotingScenario | null>> = {
        optimaal: begroting.scenarios.optimaal ? { ...begroting.scenarios.optimaal, startJaar: begroting.startJaar } : null,
        plus20: begroting.scenarios.plus20 ? { ...begroting.scenarios.plus20, startJaar: begroting.startJaar } : null,
        min20: begroting.scenarios.min20 ? { ...begroting.scenarios.min20, startJaar: begroting.startJaar } : null,
        advies: begroting.scenarios.advies ? { ...begroting.scenarios.advies, startJaar: begroting.startJaar } : null,
      };
      const maxAantalJaren = Math.max(
        begroting.scenarios.optimaal?.aantalJaren ?? 0,
        begroting.scenarios.plus20?.aantalJaren ?? 0,
        begroting.scenarios.min20?.aantalJaren ?? 0,
        begroting.scenarios.advies?.aantalJaren ?? 0,
      );
      const urenBudgetPerJaar = Array.from({ length: maxAantalJaren }, (_, i) => ({
        jaar: begroting.startJaar + i, urenBudget: urenBudgetStart,
      }));
      const inspanningenMeta: Array<{ groepId?: string; businessCaseInterneRollen?: string; businessCaseInterneUren?: string }> = [];
      for (const entry of stap4Result?.subEffortAnalysis ?? []) {
        const bc = (entry as unknown as { businessCase?: { answers?: Record<string, string> } }).businessCase;
        if (bc?.answers) {
          inspanningenMeta.push({
            groepId: entry.groepId,
            businessCaseInterneRollen: bc.answers["interne_rollen"] ?? bc.answers["cito_rollen"] ?? "",
            businessCaseInterneUren: bc.answers["interne_uren_per_rol"] ?? bc.answers["uren_per_rol"] ?? "",
          });
        }
      }

      const r = await fetch("/api/interne-uren-advies", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          scenarios: scenariosPayload,
          uurtariefSettings: { basisTarief, referentiejaar, indexatiePercentage: indexatiePct },
          inspanningenMeta,
          toegestaneFuncties,
          toegestaneFunctiesPerDomein,
          urenBudgetPerJaar,
          vastgesteldeUrenPerInspanning: vastgesteldeUrenPerInspanning.length > 0 ? vastgesteldeUrenPerInspanning : undefined,
          scope: session.scope,
          vision: session.vision,
          onlyScenario: label,
        }),
      });
      const t = await r.text();
      const d = JSON.parse(t) as { success?: boolean; data?: { scenario?: unknown }; error?: string };
      if (!d.success || !d.data?.scenario) {
        addToast(`Regenereren ${label} mislukt — ${d.error ?? "onbekende fout"}`, "error");
        setRetryingLabel(null);
        return;
      }
      // Merge in bestaande advies — alleen deze scenario-slot vervangen
      const nieuwScenario = d.data.scenario as InterneUrenAdvies["scenarios"]["optimaal"];
      const nieuweFailures = (advies.partialFailures ?? []).filter((l) => l !== label);
      const verrijkt: InterneUrenAdvies = {
        ...advies,
        scenarios: { ...advies.scenarios, [label]: nieuwScenario },
        partialFailures: nieuweFailures,
      } as InterneUrenAdvies;
      setAdvies(verrijkt);
      // Persisteer
      updateSession((prev) => {
        const currentWiz = prev.crossAnalyseWizard;
        const currentStap4 = currentWiz?.stepResults?.stap4;
        return {
          ...prev,
          crossAnalyseWizard: {
            currentStep: currentWiz?.currentStep ?? 7,
            completedSteps: currentWiz?.completedSteps ?? [],
            wizardVersion: currentWiz?.wizardVersion ?? 2,
            ...currentWiz,
            stepResults: {
              ...(currentWiz?.stepResults ?? {}),
              stap4: {
                ...(currentStap4 ?? { samenvatting: "", subEffortAnalysis: [], consolidatieAdvies: [], citobreedInzicht: [] }),
                stap7InterneUren: verrijkt,
              } as NonNullable<typeof currentStap4>,
            },
          },
        };
      });
      const version = await saveNow();
      if (version !== false) {
        addToast(`Scenario ${label} opgeslagen (v${version})`, "success");
        if (nieuweFailures.length === 0) onStepCompleted?.();
      } else {
        addToast("Opslaan naar cloud mislukt — wijzigingen staan lokaal opgeslagen.", "error");
      }
    } catch (err) {
      addToast(`Regenereren ${label} faalde: ${err instanceof Error ? err.message : "netwerkfout"}`, "error");
    } finally {
      setRetryingLabel(null);
    }
  }

  // Handmatige tekst-edit (geen AI-call) voor samenvatting per scenario
  // en motivatie per domein. Bespaart tokens voor kleine afronding/formulering.
  async function handleSamenvattingEdit(scenarioKey: ScenarioLabel, newValue: string): Promise<void> {
    if (!advies) return;
    const sc = advies.scenarios[scenarioKey];
    if (!sc) return;
    const updated: InterneUrenAdvies = {
      ...advies,
      scenarios: {
        ...advies.scenarios,
        [scenarioKey]: { ...sc, samenvatting: newValue, samenvattingHandmatigBewerkt: true },
      },
    };
    setAdvies(updated);
    updateSession((prev) => {
      const cw = prev.crossAnalyseWizard;
      const cs = cw?.stepResults?.stap4;
      return {
        ...prev,
        crossAnalyseWizard: {
          currentStep: cw?.currentStep ?? 7,
          completedSteps: cw?.completedSteps ?? [],
          wizardVersion: cw?.wizardVersion ?? 2,
          ...cw,
          stepResults: {
            ...(cw?.stepResults ?? {}),
            stap4: {
              ...(cs ?? { samenvatting: "", subEffortAnalysis: [], consolidatieAdvies: [], citobreedInzicht: [] }),
              stap7InterneUren: updated,
            } as NonNullable<typeof cs>,
          },
        },
      };
    });
    const v = await saveNow();
    if (v !== false) addToast("Samenvatting opgeslagen", "success");
  }

  async function handleDomeinMotivatieEdit(
    scenarioKey: ScenarioLabel,
    domeinIdx: number,
    newValue: string,
  ): Promise<void> {
    if (!advies) return;
    const sc = advies.scenarios[scenarioKey];
    if (!sc) return;
    const newDomeinen = sc.domeinen.map((d, i) => (i === domeinIdx ? { ...d, motivatie: newValue } : d));
    const updated: InterneUrenAdvies = {
      ...advies,
      scenarios: { ...advies.scenarios, [scenarioKey]: { ...sc, domeinen: newDomeinen } },
    };
    setAdvies(updated);
    updateSession((prev) => {
      const cw = prev.crossAnalyseWizard;
      const cs = cw?.stepResults?.stap4;
      return {
        ...prev,
        crossAnalyseWizard: {
          currentStep: cw?.currentStep ?? 7,
          completedSteps: cw?.completedSteps ?? [],
          wizardVersion: cw?.wizardVersion ?? 2,
          ...cw,
          stepResults: {
            ...(cw?.stepResults ?? {}),
            stap4: {
              ...(cs ?? { samenvatting: "", subEffortAnalysis: [], consolidatieAdvies: [], citobreedInzicht: [] }),
              stap7InterneUren: updated,
            } as NonNullable<typeof cs>,
          },
        },
      };
    });
    const v = await saveNow();
    if (v !== false) addToast("Motivatie opgeslagen", "success");
  }

  // Halfjaar-2026 correctie: Cito-medewerkers werken pas vanaf juni 2026,
  // dus jaar 1 = ~55% van oorspronkelijke uren; rest schuift naar 2027.
  // Toepassing op alle 4 scenarios tegelijk; cijfers blijven kloppend
  // door de utility (zie src/lib/halfjaar-shift.ts).
  async function handleHalfjaarShift(factor: number = 0.55): Promise<void> {
    if (!advies) return;
    const factorPct = Math.round(factor * 100);
    const ok = window.confirm(
      `Halfjaar-2026 correctie toepassen?\n\n` +
        `• Jaar 1 (2026) uren worden verlaagd naar ${factorPct}% van de huidige waarde\n` +
        `• Het verschil (${100 - factorPct}%) schuift naar jaar 2 (2027) per rol\n` +
        `• Wordt toegepast op alle 4 scenarios\n` +
        `• Totaal-uren per scenario blijft gelijk; alleen verschoven\n\n` +
        `Klik OK om door te gaan.`,
    );
    if (!ok) return;
    const updated = applyHalfjaarShiftAlleScenarios(advies, factor);
    setAdvies(updated);
    updateSession((prev) => {
      const cw = prev.crossAnalyseWizard;
      const cs = cw?.stepResults?.stap4;
      return {
        ...prev,
        crossAnalyseWizard: {
          currentStep: cw?.currentStep ?? 7,
          completedSteps: cw?.completedSteps ?? [],
          wizardVersion: cw?.wizardVersion ?? 2,
          ...cw,
          stepResults: {
            ...(cw?.stepResults ?? {}),
            stap4: {
              ...(cs ?? { samenvatting: "", subEffortAnalysis: [], consolidatieAdvies: [], citobreedInzicht: [] }),
              stap7InterneUren: updated,
            } as NonNullable<typeof cs>,
          },
        },
      };
    });
    const v = await saveNow();
    if (v !== false) addToast(`Halfjaar-2026 correctie toegepast (${factorPct}%)`, "success");
  }

  // Per-rol categorie wijzigen — orkestreert lokale optimistic update + Supabase-sync.
  // Bij Supabase-fail: rollback lokale state + toast.
  async function handleCategorieChange(
    _scenarioKey: ScenarioLabel,
    domein: Domein,
    functieId: string,
    nieuweCategorie: LezingCCat,
  ): Promise<void> {
    if (!advies) return;

    // Edge case: waarschuwing als gebruiker een tweede leider toevoegt
    if (nieuweCategorie === "leider") {
      const huidigeLeiderId = vindHuidigeLeiderId(advies, domein, selectiePerDomein);
      if (huidigeLeiderId && huidigeLeiderId !== functieId) {
        const huidigeNaam =
          CITO_FUNCTIES.find((f) => f.id === huidigeLeiderId)?.naam ??
          customFunctiesPerDomein?.[domein]?.find((c) => c.id === huidigeLeiderId)?.naam ??
          huidigeLeiderId;
        addToast(
          `Er is al een leider in ${DOMEIN_LABELS[domein]} (${huidigeNaam}). Wijzig eerst die rol naar een andere categorie voordat je een nieuwe leider aanwijst.`,
          "error",
        );
        return;
      }
    }

    // Bewaar vorige staat voor rollback
    const previousAdvies = advies;

    // Optimistic update: hercalculeer en zet lokaal
    const updated = herclassificeerRol(
      advies,
      domein,
      functieId,
      nieuweCategorie,
      selectiePerDomein,
      begroting,
      basisTarief,
      referentiejaar,
      indexatiePct,
    );
    setAdvies(updated);

    updateSession((prev) => {
      const cw = prev.crossAnalyseWizard;
      const cs = cw?.stepResults?.stap4;
      return {
        ...prev,
        crossAnalyseWizard: {
          currentStep: cw?.currentStep ?? 7,
          completedSteps: cw?.completedSteps ?? [],
          wizardVersion: cw?.wizardVersion ?? 2,
          ...cw,
          stepResults: {
            ...(cw?.stepResults ?? {}),
            stap4: {
              ...(cs ?? { samenvatting: "", subEffortAnalysis: [], consolidatieAdvies: [], citobreedInzicht: [] }),
              stap7InterneUren: updated,
            } as NonNullable<typeof cs>,
          },
        },
      };
    });

    try {
      const v = await saveNow();
      if (v === false) {
        // Rollback: lokale staat naar vorige snapshot
        setAdvies(previousAdvies);
        updateSession((prev) => {
          const cw = prev.crossAnalyseWizard;
          const cs = cw?.stepResults?.stap4;
          return {
            ...prev,
            crossAnalyseWizard: {
              currentStep: cw?.currentStep ?? 7,
              completedSteps: cw?.completedSteps ?? [],
              wizardVersion: cw?.wizardVersion ?? 2,
              ...cw,
              stepResults: {
                ...(cw?.stepResults ?? {}),
                stap4: {
                  ...(cs ?? { samenvatting: "", subEffortAnalysis: [], consolidatieAdvies: [], citobreedInzicht: [] }),
                  stap7InterneUren: previousAdvies,
                } as NonNullable<typeof cs>,
              },
            },
          };
        });
        addToast("Categorie wijzigen mislukt — Supabase niet bereikbaar. Lokale staat teruggezet.", "error");
        return;
      }
      addToast(`Categorie gewijzigd naar ${LEZING_C_CAT_LABEL[nieuweCategorie]} — uren herberekend (v${v})`, "success");
    } catch (err) {
      setAdvies(previousAdvies);
      updateSession((prev) => {
        const cw = prev.crossAnalyseWizard;
        const cs = cw?.stepResults?.stap4;
        return {
          ...prev,
          crossAnalyseWizard: {
            currentStep: cw?.currentStep ?? 7,
            completedSteps: cw?.completedSteps ?? [],
            wizardVersion: cw?.wizardVersion ?? 2,
            ...cw,
            stepResults: {
              ...(cw?.stepResults ?? {}),
              stap4: {
                ...(cs ?? { samenvatting: "", subEffortAnalysis: [], consolidatieAdvies: [], citobreedInzicht: [] }),
                stap7InterneUren: previousAdvies,
              } as NonNullable<typeof cs>,
            },
          },
        };
      });
      addToast(
        `Categorie wijzigen mislukt: ${err instanceof Error ? err.message : "onbekende fout"}`,
        "error",
      );
    }
  }

  // Functie toevoegen aan een domein — voegt rol-records toe in alle scenarios
  // op basis van categorie + actieve fases. Update ook selectiePerDomein
  // (en customFunctiesPerDomein bij eigen functie) + vUPI.
  async function handleFunctieToevoegen(input: {
    domein: Domein;
    functieId: string;
    functieNaam: string;
    afdeling?: string;
    schaal?: number;
    isCustom: boolean;
    aantal: number;
    categorie: LezingCCat;
    actieveFases: string[];
    onderbouwing?: string;
  }): Promise<void> {
    if (!advies) return;
    const { domein, functieId, functieNaam, afdeling, schaal, isCustom, aantal, categorie, actieveFases, onderbouwing } = input;

    // Edge case: functie al in selectiePerDomein
    if (functieId in (selectiePerDomein[domein] ?? {})) {
      addToast(`${functieNaam} staat al in ${DOMEIN_LABELS[domein]}.`, "error");
      return;
    }

    // Edge case: tweede leider
    if (categorie === "leider") {
      const huidigeLeiderId = vindHuidigeLeiderId(advies, domein, selectiePerDomein);
      if (huidigeLeiderId && huidigeLeiderId !== functieId) {
        const huidigeNaam =
          CITO_FUNCTIES.find((f) => f.id === huidigeLeiderId)?.naam ??
          customFunctiesPerDomein?.[domein]?.find((c) => c.id === huidigeLeiderId)?.naam ??
          huidigeLeiderId;
        addToast(
          `Er is al een leider in ${DOMEIN_LABELS[domein]} (${huidigeNaam}). Wijzig eerst die rol naar een andere categorie.`,
          "error",
        );
        return;
      }
    }

    // Bewaar previous voor rollback
    const previousAdvies = advies;
    const previousSelectie = selectiePerDomein;
    const previousCustom = customFunctiesPerDomein;
    const previousVUPI = vastgesteldeUrenPerInspanning;

    // Optimistic update — advies (per-jaar rol-records, totalen, vUPI)
    const updatedAdvies = voegFunctieToeAanAdvies(
      advies,
      domein,
      functieId,
      functieNaam,
      afdeling,
      aantal,
      categorie,
      actieveFases,
      begroting,
      basisTarief,
      referentiejaar,
      indexatiePct,
      selectiePerDomein,
    );

    // Optimistic — selectiePerDomein
    const nieuweSelectie: Record<Domein, Record<string, FunctieInput>> = {
      ...selectiePerDomein,
      [domein]: {
        ...selectiePerDomein[domein],
        [functieId]: { aantal },
      },
    };
    setSelectiePerDomein(nieuweSelectie);

    // Optimistic — customFunctiesPerDomein (alleen bij custom)
    let nieuweCustom = customFunctiesPerDomein;
    if (isCustom) {
      nieuweCustom = {
        ...customFunctiesPerDomein,
        [domein]: [
          ...customFunctiesPerDomein[domein],
          { id: functieId, naam: functieNaam, schaal },
        ],
      };
      setCustomFunctiesPerDomein(nieuweCustom);
    }

    // vUPI: voeg de nieuwe rol toe per inspanning op dit domein, met
    // urenTotaal = som over advies-scenario alle jaren voor deze rol.
    let nieuweVUPI = vastgesteldeUrenPerInspanning;
    const adviesScen = updatedAdvies.scenarios.advies ?? updatedAdvies.scenarios.optimaal;
    if (adviesScen) {
      const dBlok = adviesScen.domeinen.find((d) => d.domein === domein);
      const urenTotaalAdvies = dBlok
        ? dBlok.jaren.reduce((s, jr) => {
            const r = jr.rollen.find((x) => x.functieId === functieId);
            return s + (r?.uren ?? 0);
          }, 0)
        : 0;
      const onderbouwingTekst =
        onderbouwing && onderbouwing.length > 0
          ? onderbouwing
          : `${aantal}× ${functieNaam} — ${LEZING_C_CAT_LABEL[categorie]} actief in ${actieveFases.length} fase(s).`;
      nieuweVUPI = vastgesteldeUrenPerInspanning.map((insp) => {
        if (insp.domein !== domein) return insp;
        // Voeg alleen toe als deze rol nog niet in deze inspanning staat
        if (insp.rollen.some((r) => r.functieId === functieId)) return insp;
        return {
          ...insp,
          rollen: [
            ...insp.rollen,
            {
              functieId,
              functieNaam,
              afdeling,
              urenTotaal: urenTotaalAdvies,
              onderbouwing: onderbouwingTekst,
            },
          ],
        };
      });
      setVastgesteldeUrenPerInspanning(nieuweVUPI);
    }

    setAdvies(updatedAdvies);

    updateSession((prev) => {
      const cw = prev.crossAnalyseWizard;
      const cs = cw?.stepResults?.stap4;
      const huidig = (cs as unknown as { stap7InterneUren?: InterneUrenAdvies } | undefined)?.stap7InterneUren;
      const merged: InterneUrenAdvies = {
        ...(huidig ?? updatedAdvies),
        ...updatedAdvies,
        selectiePerDomein: nieuweSelectie,
        customFunctiesPerDomein: nieuweCustom,
      };
      return {
        ...prev,
        crossAnalyseWizard: {
          currentStep: cw?.currentStep ?? 7,
          completedSteps: cw?.completedSteps ?? [],
          wizardVersion: cw?.wizardVersion ?? 2,
          ...cw,
          stepResults: {
            ...(cw?.stepResults ?? {}),
            stap4: {
              ...(cs ?? { samenvatting: "", subEffortAnalysis: [], consolidatieAdvies: [], citobreedInzicht: [] }),
              stap7InterneUren: merged,
            } as NonNullable<typeof cs>,
          },
        },
      };
    });

    try {
      const v = await saveNow();
      if (v === false) {
        // Rollback
        setAdvies(previousAdvies);
        setSelectiePerDomein(previousSelectie);
        setCustomFunctiesPerDomein(previousCustom);
        setVastgesteldeUrenPerInspanning(previousVUPI);
        addToast("Functie toevoegen mislukt — Supabase niet bereikbaar. Lokale staat teruggezet.", "error");
        return;
      }
      addToast(
        `${functieNaam} toegevoegd aan ${DOMEIN_LABELS[domein]} (${LEZING_C_CAT_LABEL[categorie]}, ${aantal}× — uren herberekend, v${v})`,
        "success",
      );
    } catch (err) {
      setAdvies(previousAdvies);
      setSelectiePerDomein(previousSelectie);
      setCustomFunctiesPerDomein(previousCustom);
      setVastgesteldeUrenPerInspanning(previousVUPI);
      addToast(
        `Functie toevoegen mislukt: ${err instanceof Error ? err.message : "onbekende fout"}`,
        "error",
      );
    }
  }

  // Rol verwijderen uit een domein — orkestreert verwijdering uit
  // selectiePerDomein, customFunctiesPerDomein, vUPI én alle scenarios
  // (incl. aggregaten + Supabase-sync). Bij Supabase-fail: rollback.
  async function handleRolVerwijderen(
    domein: Domein,
    functieId: string,
  ): Promise<void> {
    if (!advies) return;

    // Resolveer naam voor confirm-dialog
    const naam =
      CITO_FUNCTIES.find((f) => f.id === functieId)?.naam ??
      customFunctiesPerDomein?.[domein]?.find((c) => c.id === functieId)?.naam ??
      functieId;

    // Edge case: leider verwijderen → waarschuwing maar wel toestaan
    const huidigeLeiderId = vindHuidigeLeiderId(advies, domein, selectiePerDomein);
    const isLeider = huidigeLeiderId === functieId;
    const extra = isLeider
      ? `\n\n⚠ Let op: ${naam} is de huidige leider in ${DOMEIN_LABELS[domein]}. Na verwijdering heeft dit domein geen leider meer — voeg eerst een andere leider toe als dat nodig is.`
      : "";

    const ok = window.confirm(
      `Weet je zeker dat je "${naam}" wilt verwijderen uit ${DOMEIN_LABELS[domein]}?\n\n` +
        `• Verwijdert deze rol uit alle 4 scenario's (alle jaren)\n` +
        `• Verwijdert het record uit "Vastgestelde uren per inspanning" (vUPI)\n` +
        `• Verwijdert eventuele eigen-functie-registratie\n` +
        `• Aggregaten (totalen, programma/lijn/raadplegen) worden herrekend\n` +
        `• Dit kan niet ongedaan gemaakt worden.${extra}`,
    );
    if (!ok) return;

    // Bewaar vorige staat voor rollback
    const previousAdvies = advies;
    const previousSelectie = selectiePerDomein;
    const previousCustom = customFunctiesPerDomein;
    const previousVUPI = vastgesteldeUrenPerInspanning;

    // Optimistic update — advies (verwijder rol uit alle scenarios + marker)
    const updatedAdvies = verwijderRolUitAdvies(advies, domein, functieId, selectiePerDomein);

    // Optimistic — selectiePerDomein
    const nieuweDomeinSel: Record<string, FunctieInput> = { ...(selectiePerDomein[domein] ?? {}) };
    delete nieuweDomeinSel[functieId];
    const nieuweSelectie: Record<Domein, Record<string, FunctieInput>> = {
      ...selectiePerDomein,
      [domein]: nieuweDomeinSel,
    };
    setSelectiePerDomein(nieuweSelectie);

    // Optimistic — customFunctiesPerDomein (verwijder als custom)
    const nieuweCustom: Record<Domein, CustomFunctie[]> = {
      ...customFunctiesPerDomein,
      [domein]: (customFunctiesPerDomein[domein] ?? []).filter((c) => c.id !== functieId),
    };
    setCustomFunctiesPerDomein(nieuweCustom);

    // Optimistic — vUPI: schrap deze rol uit elke inspanning op dit domein
    const nieuweVUPI = vastgesteldeUrenPerInspanning.map((insp) => {
      if (insp.domein !== domein) return insp;
      return {
        ...insp,
        rollen: insp.rollen.filter((r) => r.functieId !== functieId),
      };
    });
    setVastgesteldeUrenPerInspanning(nieuweVUPI);

    setAdvies(updatedAdvies);

    updateSession((prev) => {
      const cw = prev.crossAnalyseWizard;
      const cs = cw?.stepResults?.stap4;
      const huidig = (cs as unknown as { stap7InterneUren?: InterneUrenAdvies } | undefined)?.stap7InterneUren;
      const merged: InterneUrenAdvies = {
        ...(huidig ?? updatedAdvies),
        ...updatedAdvies,
        selectiePerDomein: nieuweSelectie,
        customFunctiesPerDomein: nieuweCustom,
      };
      return {
        ...prev,
        crossAnalyseWizard: {
          currentStep: cw?.currentStep ?? 7,
          completedSteps: cw?.completedSteps ?? [],
          wizardVersion: cw?.wizardVersion ?? 2,
          ...cw,
          stepResults: {
            ...(cw?.stepResults ?? {}),
            stap4: {
              ...(cs ?? { samenvatting: "", subEffortAnalysis: [], consolidatieAdvies: [], citobreedInzicht: [] }),
              stap7InterneUren: merged,
            } as NonNullable<typeof cs>,
          },
        },
      };
    });

    try {
      const v = await saveNow();
      if (v === false) {
        // Rollback
        setAdvies(previousAdvies);
        setSelectiePerDomein(previousSelectie);
        setCustomFunctiesPerDomein(previousCustom);
        setVastgesteldeUrenPerInspanning(previousVUPI);
        addToast("Rol verwijderen mislukt — Supabase niet bereikbaar. Lokale staat teruggezet.", "error");
        return;
      }
      addToast(
        `${naam} verwijderd uit ${DOMEIN_LABELS[domein]} — uren herberekend (v${v})`,
        "success",
      );
    } catch (err) {
      setAdvies(previousAdvies);
      setSelectiePerDomein(previousSelectie);
      setCustomFunctiesPerDomein(previousCustom);
      setVastgesteldeUrenPerInspanning(previousVUPI);
      addToast(
        `Rol verwijderen mislukt: ${err instanceof Error ? err.message : "onbekende fout"}`,
        "error",
      );
    }
  }

  if (!begroting?.scenarios) {
    return (
      <div className="text-center py-10">
        <p className="text-sm text-gray-600">
          Nog geen begroting uit stap 6 beschikbaar.
        </p>
        <p className="text-xs text-gray-500 mt-2">
          Ga terug naar <strong>stap 6 Optimaliseren</strong> en klik op <strong>Genereer begrotingsadvies (3 scenario&apos;s)</strong>.
          De interne uren worden dan daarop gebaseerd.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
        <p className="text-sm text-blue-900 leading-relaxed">
          Interne uren van Cito-medewerkers, per domein en per jaar — gekoppeld aan de scenario-fasering uit stap 6.
          AI stelt passende rollen voor uit het Cito-organogram en schat uren per jaar. Pas het uurtarief aan (basis + indexatie) en klik op <strong>Genereer interne-uren-advies</strong>.
        </p>
      </div>

      {/* Bronnen waar AI de uren-schatting op baseert — transparant voor gebruiker */}
      <details className="bg-white border border-gray-200 rounded-lg overflow-hidden">
        <summary className="cursor-pointer px-4 py-3 text-sm font-semibold text-[#003366] hover:bg-gray-50">
          Waar baseert de AI de uren-schatting op? <span className="text-xs text-gray-500 font-normal">(klik voor details)</span>
        </summary>
        <div className="px-4 pb-4 pt-1 space-y-2 text-[12px] text-gray-700 leading-relaxed border-t border-gray-100">
          <p>De AI haalt het aantal uren NIET uit de stap 6 begroting (die gaat over <em>out-of-pocket</em> euro&apos;s, niet uren). De uren-schatting komt tot stand uit:</p>
          <ul className="list-disc pl-5 space-y-1">
            <li><strong>Stap 6 fasering &amp; activiteiten</strong> — per inspanning per jaar: welke fase (voorbereiding / uitrol / borging) en welke activiteit. Hieruit leidt AI af hoe zwaar het werk is en waar de pieken zitten.</li>
            <li><strong>Toegestane functies per domein (jouw selectie hierboven)</strong> — alleen rollen die je hebt aangevinkt mag AI inzetten. Met &quot;aantal personen&quot; (bijv. 3 accountmanagers) schaalt AI de uren op die rol.</li>
            <li><strong>Business-case antwoorden per inspanning</strong> — wanneer je bij een inspanning Cito-rollen + uren-schattingen hebt opgegeven (interne_rollen + interne_uren_per_rol), gebruikt AI die als harde aanname.</li>
            <li><strong>Realistische FTE-norm</strong> — 1 FTE ≈ 1600 werkbare uren/jaar. Een 10%-rol = ~160u/jr; zware trekkers in een piekjaar = 300-500u/rol.</li>
            <li><strong>Uren-budget norm (Finance, hierboven)</strong> — AI streeft binnen het ingestelde budget per jaar te blijven en toont een gap in rood (tekort) of groen (overschot).</li>
          </ul>
          <p className="text-[11px] text-gray-500 italic">Per domein staat onder &quot;motivatie&quot; concreet welke rol waarom is gekozen, en in elk jaarblok zie je de activiteit-tekst die met stap 6 correspondeert.</p>
        </div>
      </details>

      {/* Uren-budget norm */}
      <div className="bg-white border border-gray-200 rounded-lg p-4">
        <div className="flex items-center gap-3 flex-wrap">
          <div className="flex-1 min-w-[200px]">
            <label className="text-[11px] font-semibold text-gray-600 uppercase tracking-wider">
              Uren-budget per jaar (Finance-norm)
            </label>
            <p className="text-[10px] text-gray-500 mt-0.5">
              De beschikbare uren per jaar voor programma-interne werk. AI vergelijkt zijn voorstel hiermee en toont een gap.
            </p>
          </div>
          <div className="flex items-center gap-2">
            <input
              type="number"
              value={urenBudgetStart}
              onChange={(e) => setUrenBudgetStart(Math.max(0, Number(e.target.value) || 0))}
              className="w-32 px-3 py-2 text-sm border border-gray-300 rounded bg-white focus:outline-none focus:ring-2 focus:ring-[#003366]"
            />
            <span className="text-sm text-gray-600">uren/jaar</span>
          </div>
        </div>
      </div>

      {/* Tarief-instellingen */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div>
          <label className="text-[11px] font-semibold text-gray-600 uppercase tracking-wider">Basistarief (€/u)</label>
          <input
            type="number"
            value={basisTarief}
            onChange={(e) => setBasisTarief(Number(e.target.value) || 0)}
            className="w-full mt-1 px-3 py-2 text-sm border border-gray-300 rounded bg-white focus:outline-none focus:ring-2 focus:ring-[#003366]"
          />
        </div>
        <div>
          <label className="text-[11px] font-semibold text-gray-600 uppercase tracking-wider">Referentiejaar</label>
          <input
            type="number"
            value={referentiejaar}
            onChange={(e) => setReferentiejaar(Number(e.target.value) || 2020)}
            className="w-full mt-1 px-3 py-2 text-sm border border-gray-300 rounded bg-white focus:outline-none focus:ring-2 focus:ring-[#003366]"
          />
        </div>
        <div>
          <label className="text-[11px] font-semibold text-gray-600 uppercase tracking-wider">Indexatie %/jaar</label>
          <input
            type="number"
            step={0.01}
            value={indexatiePct}
            onChange={(e) => setIndexatiePct(Number(e.target.value) || 0)}
            className="w-full mt-1 px-3 py-2 text-sm border border-gray-300 rounded bg-white focus:outline-none focus:ring-2 focus:ring-[#003366]"
          />
        </div>
        <div className="flex flex-col justify-end">
          <label className="text-[11px] font-semibold text-gray-600 uppercase tracking-wider">Tarief {huidigJaar}</label>
          <p className="mt-1 px-3 py-2 text-sm font-semibold text-[#003366] bg-blue-50 border border-blue-200 rounded">
            € {tariefPreview}/u
          </p>
        </div>
      </div>

      {/* Functie-selectie per domein (cultuur / mens / data&systemen / processen) — met aantal per functie + custom functies */}
      <div className="bg-white border border-gray-200 rounded-lg">
        <button
          onClick={() => setSelectieOpen((v) => !v)}
          className="w-full flex items-center justify-between p-4 text-left hover:bg-gray-50"
        >
          <div>
            <p className="text-sm font-semibold text-[#003366]">
              Functie-selectie per inspanning ({geselecteerdeTotaal} functies · {totaalAantalPersonen} personen totaal)
            </p>
            <p className="text-[11px] text-gray-500 mt-0.5">
              Kies per domein (cultuur / mens / data & systemen / processen) welke Cito-rollen AI mag inzetten. Vul per rol het aantal personen in (bijv. 3 accountmanagers). Eigen functies zijn ook mogelijk.
            </p>
            <div className="flex gap-2 flex-wrap mt-2">
              {DOMEINEN.map((d) => {
                const col = DOMEIN_COLORS[d];
                return (
                  <span
                    key={d}
                    className={`text-[10px] px-2 py-0.5 rounded border ${col.bg} ${col.border} ${col.text}`}
                  >
                    {DOMEIN_LABELS[d]}: {geselecteerdePerDomein[d]} fns / {personenPerDomein[d]} pers.
                  </span>
                );
              })}
            </div>
          </div>
          <span className="text-xs text-gray-500">{selectieOpen ? "▲ inklappen" : "▼ uitklappen"}</span>
        </button>
        {selectieOpen && (
          <div className="border-t border-gray-200">
            {/* Domein-tabs */}
            <div className="flex flex-wrap border-b border-gray-200 bg-gray-50">
              {DOMEINEN.map((d) => {
                const col = DOMEIN_COLORS[d];
                const active = actiefDomein === d;
                return (
                  <button
                    key={d}
                    onClick={() => setActiefDomein(d)}
                    className={`flex-1 min-w-[130px] px-3 py-2.5 text-xs font-semibold border-r border-gray-200 last:border-r-0 ${
                      active ? `${col.bg} ${col.text} border-b-2` : "text-gray-600 hover:bg-white"
                    }`}
                  >
                    {DOMEIN_LABELS[d]}
                    <span className="block text-[10px] font-normal opacity-80">
                      {geselecteerdePerDomein[d]} fns · {personenPerDomein[d]} pers.
                    </span>
                  </button>
                );
              })}
            </div>

            {/* Content voor actief domein */}
            <div className="p-4 space-y-3">
              <div className="flex items-center gap-2 flex-wrap">
                <button
                  onClick={() => resetNaarAanbevolen(actiefDomein)}
                  className="text-xs px-2.5 py-1 rounded border border-[#003366] text-[#003366] bg-white hover:bg-[#f0f4f8]"
                >
                  Reset naar aanbevolen
                </button>
                <button
                  onClick={() => allesInDomein(actiefDomein)}
                  className="text-xs px-2.5 py-1 rounded border border-gray-300 text-gray-700 bg-white hover:bg-gray-50"
                >
                  Alles
                </button>
                <button
                  onClick={() => nietsInDomein(actiefDomein)}
                  className="text-xs px-2.5 py-1 rounded border border-gray-300 text-gray-700 bg-white hover:bg-gray-50"
                >
                  Niets
                </button>
              </div>

              {/* Custom functies voor dit domein */}
              <div className="border border-dashed border-gray-300 rounded p-3 bg-gray-50">
                <p className="text-[11px] font-semibold text-gray-700 mb-2">Eigen functie toevoegen voor {DOMEIN_LABELS[actiefDomein]}</p>
                <div className="flex items-end gap-2 flex-wrap">
                  <div className="flex-1 min-w-[180px]">
                    <label className="text-[10px] text-gray-500">Functienaam</label>
                    <input
                      type="text"
                      value={customNaam}
                      onChange={(e) => setCustomNaam(e.target.value)}
                      placeholder="Bijv. Programmadirecteur"
                      className="w-full px-2 py-1 text-xs border border-gray-300 rounded bg-white focus:outline-none focus:ring-2 focus:ring-[#003366]"
                    />
                  </div>
                  <div className="w-20">
                    <label className="text-[10px] text-gray-500">Schaal (opt.)</label>
                    <input
                      type="number"
                      value={customSchaal}
                      onChange={(e) => setCustomSchaal(e.target.value)}
                      placeholder="14"
                      className="w-full px-2 py-1 text-xs border border-gray-300 rounded bg-white focus:outline-none focus:ring-2 focus:ring-[#003366]"
                    />
                  </div>
                  <button
                    onClick={() => voegCustomFunctieToe(actiefDomein)}
                    disabled={!customNaam.trim()}
                    className="text-xs px-3 py-1.5 rounded bg-[#003366] text-white hover:bg-[#002244] disabled:opacity-50"
                  >
                    + Toevoegen
                  </button>
                </div>
                {customFunctiesPerDomein[actiefDomein].length > 0 && (
                  <div className="mt-2 space-y-1">
                    {customFunctiesPerDomein[actiefDomein].map((cf) => {
                      const input = selectiePerDomein[actiefDomein][cf.id];
                      const aantal = input?.aantal ?? 0;
                      const actief = cf.id in selectiePerDomein[actiefDomein];
                      return (
                        <div key={cf.id} className="flex items-center gap-2 bg-white border border-gray-200 rounded px-2 py-1">
                          <input
                            type="checkbox"
                            checked={actief}
                            onChange={() => toggleFunctie(actiefDomein, cf.id)}
                            className="accent-[#003366]"
                          />
                          <span className="text-xs flex-1 text-gray-800">
                            {cf.naam}
                            {cf.schaal !== undefined && <span className="text-[10px] text-gray-400 ml-1">s{cf.schaal}</span>}
                            <span className="text-[10px] text-gray-400 ml-1">(custom)</span>
                          </span>
                          <input
                            type="number"
                            min={1}
                            max={50}
                            value={aantal || 1}
                            disabled={!actief}
                            onChange={(e) => setAantalVoor(actiefDomein, cf.id, Number(e.target.value))}
                            className="w-14 px-1 py-0.5 text-xs border border-gray-300 rounded bg-white focus:outline-none focus:ring-1 focus:ring-[#003366] disabled:bg-gray-100 disabled:text-gray-400"
                          />
                          <span className="text-[10px] text-gray-500">pers.</span>
                          <button
                            onClick={() => verwijderCustomFunctie(actiefDomein, cf.id)}
                            className="text-[10px] text-red-600 hover:text-red-800 px-1"
                            title="Verwijder custom functie"
                          >
                            ✕
                          </button>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>

              {/* Cito functies per afdeling */}
              {(() => {
                const perAfdeling = new Map<CitoAfdeling, CitoFunctie[]>();
                for (const f of CITO_FUNCTIES) {
                  const list = perAfdeling.get(f.afdeling) ?? [];
                  list.push(f);
                  perAfdeling.set(f.afdeling, list);
                }
                return Array.from(perAfdeling.entries()).map(([afd, functies]) => {
                  const actiefInAfd = functies.filter((f) => f.id in selectiePerDomein[actiefDomein]).length;
                  return (
                    <div key={afd} className="border border-gray-100 rounded p-2">
                      <div className="flex items-center justify-between mb-1">
                        <p className="text-[11px] font-semibold text-gray-700">
                          {afd} <span className="text-gray-400">({actiefInAfd}/{functies.length})</span>
                        </p>
                        <div className="flex items-center gap-1">
                          <button
                            onClick={() => selecteerAllesIn(actiefDomein, afd)}
                            className="text-[10px] px-1.5 py-0.5 rounded bg-gray-100 hover:bg-gray-200 text-gray-700"
                          >
                            ✓ alles
                          </button>
                          <button
                            onClick={() => deselecteerAllesIn(actiefDomein, afd)}
                            className="text-[10px] px-1.5 py-0.5 rounded bg-gray-100 hover:bg-gray-200 text-gray-700"
                          >
                            ✕ geen
                          </button>
                        </div>
                      </div>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-1">
                        {functies.map((f) => {
                          const actief = f.id in selectiePerDomein[actiefDomein];
                          const input = selectiePerDomein[actiefDomein][f.id];
                          const aantal = input?.aantal ?? 0;
                          return (
                            <div
                              key={f.id}
                              className={`flex items-center gap-2 text-[11px] px-2 py-1 rounded ${
                                actief ? "bg-blue-50" : "hover:bg-gray-50"
                              }`}
                            >
                              <input
                                type="checkbox"
                                checked={actief}
                                onChange={() => toggleFunctie(actiefDomein, f.id)}
                                className="accent-[#003366]"
                              />
                              <span className="flex-1 leading-tight text-gray-800">
                                {f.naam} <span className="text-gray-400">s{f.schaal}</span>
                              </span>
                              <input
                                type="number"
                                min={1}
                                max={50}
                                value={aantal || 1}
                                disabled={!actief}
                                onChange={(e) => setAantalVoor(actiefDomein, f.id, Number(e.target.value))}
                                className="w-12 px-1 py-0.5 text-[11px] border border-gray-300 rounded bg-white focus:outline-none focus:ring-1 focus:ring-[#003366] disabled:bg-gray-100 disabled:text-gray-400"
                                title="Aantal personen in deze rol"
                              />
                              <span className="text-[10px] text-gray-500">pers.</span>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  );
                });
              })()}
            </div>
          </div>
        )}
      </div>

      {/* ───────── 3-STAPPEN FLOW ───────── */}
      <div className="bg-white border-2 border-[#003366] rounded-lg p-4">
        <div className="flex items-center gap-3 mb-4">
          <div className={`flex items-center gap-2 ${geselecteerdeTotaal > 0 ? "text-green-700" : "text-gray-400"}`}>
            <span className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold ${geselecteerdeTotaal > 0 ? "bg-green-100 border border-green-300" : "bg-gray-100 border border-gray-300"}`}>1</span>
            <span className="text-sm font-semibold">Functies geselecteerd</span>
          </div>
          <div className={`flex-1 h-px ${vragenPerInspanning.length > 0 ? "bg-green-300" : "bg-gray-200"}`} />
          <div className={`flex items-center gap-2 ${vastgesteldeUrenPerInspanning.length > 0 ? "text-green-700" : vragenPerInspanning.length > 0 ? "text-[#003366]" : "text-gray-400"}`}>
            <span className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold ${vastgesteldeUrenPerInspanning.length > 0 ? "bg-green-100 border border-green-300" : vragenPerInspanning.length > 0 ? "bg-blue-100 border border-blue-300" : "bg-gray-100 border border-gray-300"}`}>2</span>
            <span className="text-sm font-semibold">Uren vastgesteld via AI-vragen</span>
          </div>
          <div className={`flex-1 h-px ${advies ? "bg-green-300" : "bg-gray-200"}`} />
          <div className={`flex items-center gap-2 ${advies ? "text-green-700" : "text-gray-400"}`}>
            <span className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold ${advies ? "bg-green-100 border border-green-300" : "bg-gray-100 border border-gray-300"}`}>3</span>
            <span className="text-sm font-semibold">Advies gegenereerd</span>
          </div>
        </div>

        {/* Stap 2 — AI-vragen */}
        <div className="space-y-3">
          <div className="flex items-center gap-2 flex-wrap">
            <button
              onClick={haalVragenOp}
              disabled={vragenLoading || geselecteerdeTotaal === 0}
              className="text-sm px-4 py-2 rounded border-2 border-[#003366] text-[#003366] bg-white hover:bg-[#f0f4f8] disabled:opacity-50 font-medium"
            >
              {vragenLoading
                ? "AI stelt vragen op..."
                : vragenPerInspanning.length > 0
                ? `↻ Stap 2 herstart — vraag opnieuw (${vragenPerInspanning.length} inspanningen)`
                : "Stap 2 — Stel uren-vragen op via AI"}
            </button>
            {vragenPerInspanning.length > 0 && (
              <button
                onClick={() => setVragenModalOpen(true)}
                className="text-sm px-3 py-2 rounded text-[#003366] hover:bg-[#f0f4f8] font-medium"
              >
                ✎ Open vragenformulier ({Object.values(antwoordenPerInspanning).reduce((s, a) => s + Object.values(a).filter((v) => v.trim().length > 0).length, 0)} antwoorden)
              </button>
            )}
            {vastgesteldeUrenPerInspanning.length > 0 && (
              <button
                onClick={() => setUrenTabelOpen(true)}
                className="text-sm px-3 py-2 rounded border border-green-600 text-green-700 hover:bg-green-50 font-medium"
              >
                📊 Bekijk vastgestelde uren ({vastgesteldeUrenPerInspanning.reduce((s, i) => s + i.rollen.reduce((a, r) => a + r.urenTotaal, 0), 0).toLocaleString("nl-NL")}u totaal)
              </button>
            )}
          </div>
          {vragenError && (
            <div className="bg-red-50 border border-red-200 rounded p-2 text-sm text-red-700">{vragenError}</div>
          )}
          {vaststellenError && (
            <div className="bg-red-50 border border-red-200 rounded p-2 text-sm text-red-700">{vaststellenError}</div>
          )}
          <p className="text-[11px] text-gray-500 leading-relaxed">
            Stap 2 is <strong>optioneel maar aanbevolen</strong> voor realistische uren — AI stelt per inspanning 3 gerichte vragen (frequentie, duur, deelnemers), berekent dan op basis van jouw antwoorden de uren per rol. Sla over en AI maakt zelf een schatting op basis van fasering + organogram.
          </p>
        </div>

        {/* Stap 3 — Genereer */}
        <div className="mt-4 pt-4 border-t border-gray-200">
          <button
            onClick={() => generateAdvies()}
            disabled={loading || geselecteerdeTotaal === 0}
            className="text-sm px-4 py-2 rounded bg-[#003366] text-white hover:bg-[#002244] disabled:opacity-50 font-medium"
          >
            {loading
              ? "AI berekent interne uren voor 3 scenario's..."
              : advies
              ? `↻ Stap 3 — Regenereer interne-uren-advies (${geselecteerdeTotaal} functies · ${totaalAantalPersonen} personen${vastgesteldeUrenPerInspanning.length > 0 ? " · met user-input" : ""})`
              : `Stap 3 — Genereer interne-uren-advies (${geselecteerdeTotaal} functies · ${totaalAantalPersonen} personen${vastgesteldeUrenPerInspanning.length > 0 ? " · met user-input" : ""})`}
          </button>
          {vastgesteldeUrenPerInspanning.length > 0 ? (
            <p className="text-[11px] text-green-700 mt-1">
              ✓ AI gebruikt jouw vastgestelde uren als hard input (totaal {vastgesteldeUrenPerInspanning.reduce((s, i) => s + i.rollen.reduce((a, r) => a + r.urenTotaal, 0), 0).toLocaleString("nl-NL")}u over alle inspanningen).
            </p>
          ) : (
            <p className="text-[11px] text-gray-500 mt-1">
              Geen vastgestelde uren — AI maakt zelf een schatting per scenario.
            </p>
          )}
        </div>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-3">
          <p className="text-sm text-red-700">Interne uren-advies faalde: {error}</p>
        </div>
      )}

      {advies && (
        <div className="space-y-6">
          {/* Vergelijkingsbanner */}
          <div className="bg-white border-2 border-[#003366] rounded-lg p-4">
            <div className="flex items-center justify-between gap-3 flex-wrap mb-3">
              <h4 className="text-sm font-semibold text-[#003366]">Interne uren — scenario-vergelijking</h4>
              <div className="flex items-center gap-2">
                <button
                  onClick={() =>
                    generateAdvies({
                      // TEKST_ONLY:-prefix triggert server-side garantie dat
                      // alleen samenvatting + motivatie per domein worden
                      // vervangen — alle uren, kosten, rollen en jaartabellen
                      // blijven letterlijk gelijk aan previousAdvies.
                      finetuneInstructie: `TEKST_ONLY: Herschrijf de samenvatting (top-level) en motivatie per domein van dit scenario.

DOEL: alleen jaartallen en looptijd-claims weghalen — alle andere onderbouwing behouden.

REGEL A — VERWIJDER:
- Absolute jaartallen ('2027', '2028', 'tot 2031').
- Looptijd-aantallen ('over X jaar', '× N jaar', 'jaar 4').
- Cyclus-claims ('4-jarige cyclus').
Vervang door relatieve aanduidingen: 'in het startjaar', 'in de bouwjaren', 'rond het midden van de looptijd', 'in de achterste derde', 'in het slotjaar'.

REGEL B — BEHOUD:
- Dossier-aannames uit business-case Q&A (uurtarieven, FTE-percentages, aantal personen per rol). Die zijn universeel en MOETEN blijven.
- Concrete onderbouwingen: rollen, afdelingen, redenen waarom een rol nodig is.

REGEL C — UREN-TOTALEN MOETEN KLOPPEN:
Als je een uren-totaal noemt, MOET dat exact gelijk zijn aan de som in de tabel voor dit scenario. Verzin GEEN getallen.

REGEL D — LANGE LOOPTIJDEN:
Bij scenario's met lange looptijd wordt het VOLLEDIGE programma binnen die jaren uitgevoerd — geen 'aanloopfase', geen 'vervolgfinanciering' impliceren.

Houd uren, rollen, kosten en jaar-cellen exact onveranderd.`,
                      previousAdvies: advies,
                    })
                  }
                  disabled={loading}
                  title="Herschrijft alleen de samenvatting en motivatie per domein — uren, kosten, rollen en jaar-totalen blijven server-zijde gegarandeerd onveranderd."
                  className="text-sm px-3 py-2 rounded bg-white text-[#003366] border-2 border-[#003366] hover:bg-blue-50 disabled:opacity-50 font-medium shadow-sm"
                >
                  🔁 Herschrijf alleen teksten
                </button>
                <button
                  onClick={() => setFineutOpen(true)}
                  disabled={loading}
                  title="Pas de uren-verdeling aan op basis van stuurgroep-feedback (bv. 'minder uren in jaar 1, meer in jaar 3'). Cijfers + tekst worden samen herrekend."
                  className="text-sm px-4 py-2 rounded bg-[#003366] text-white hover:bg-[#002244] disabled:opacity-50 font-medium shadow-sm"
                >
                  ⚖ Herrekenen op basis van stuurgroep-feedback
                </button>
                <button
                  onClick={() => handleHalfjaarShift(0.55)}
                  disabled={loading}
                  title="Cito-medewerkers werken pas vanaf juni 2026 → jaar 1 wordt 55% van huidige uren, het verschil schuift per rol naar 2027. Geen AI-call, alle 4 scenarios in één klap. Totaal-uren per scenario blijft gelijk."
                  className="text-sm px-3 py-2 rounded bg-amber-600 text-white hover:bg-amber-700 disabled:opacity-50 font-medium shadow-sm"
                >
                  📅 Halfjaar-2026 toepassen (55%)
                </button>
              </div>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              {SCENARIO_META.map((sv) => {
                const s = advies.scenarios[sv.key];
                if (!s) {
                  const isRetrying = retryingLabel === sv.key;
                  return (
                    <div key={sv.key} className="border-2 border-amber-300 bg-amber-50 rounded p-3">
                      <p className="text-[10px] font-bold uppercase tracking-wider text-amber-700">{sv.label}</p>
                      <p className="text-sm font-medium text-amber-900 mt-2">⚠️ Niet gegenereerd</p>
                      <button
                        onClick={() => retryScenario(sv.key)}
                        disabled={isRetrying || retryingLabel !== null || loading}
                        className="mt-2 w-full text-xs px-3 py-2 rounded bg-amber-600 text-white hover:bg-amber-700 disabled:opacity-50 font-medium"
                      >
                        {isRetrying ? "Bezig..." : `↻ Regenereer ${sv.label}`}
                      </button>
                    </div>
                  );
                }
                return (
                  <div key={sv.key} className={`border-2 rounded p-3 ${sv.kleur.kaart}`}>
                    <p className={`text-[10px] font-bold uppercase tracking-wider ${sv.kleur.accent}`}>{sv.label}</p>
                    <p className="text-2xl font-bold text-gray-800 mt-1">
                      {s.totaalUren.toLocaleString("nl-NL")} <span className="text-xs font-normal text-gray-500">uren</span>
                    </p>
                    <p className="text-xs text-gray-600 mt-1">€ {s.totaalKosten.toLocaleString("nl-NL")} totaal</p>
                    <p className="text-[11px] text-gray-500 mt-0.5">
                      {s.aantalJaren} jaar × {DOMEIN_LABELS && "4"} domeinen
                    </p>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Per scenario een blok */}
          {SCENARIO_META.map((sv) => {
            const s = advies.scenarios[sv.key];
            if (!s) return null;
            return (
              <ScenarioBlokView
                key={sv.key}
                s={s}
                sv={sv}
                selectiePerDomein={selectiePerDomein}
                customFunctiesPerDomein={customFunctiesPerDomein}
                lezingMarker={advies.interneUrenLezing}
                begrotingAdvies={begroting}
                handmatigBewerkt={s.samenvattingHandmatigBewerkt === true}
                onSamenvattingEdit={(v) => handleSamenvattingEdit(sv.key, v)}
                onDomeinMotivatieEdit={(idx, v) => handleDomeinMotivatieEdit(sv.key, idx, v)}
                onCategorieChange={handleCategorieChange}
                onFunctieToevoegen={handleFunctieToevoegen}
                onRolVerwijderen={handleRolVerwijderen}
              />
            );
          })}
        </div>
      )}

      {/* Vragen-modal — STAP 2 Q&A */}
      {vragenModalOpen && (
        <div
          className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4"
          onClick={() => !vaststellenLoading && setVragenModalOpen(false)}
        >
          <div
            className="bg-white rounded-lg shadow-2xl max-w-4xl w-full max-h-[92vh] overflow-y-auto"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="p-5 border-b border-gray-200 sticky top-0 bg-white z-10">
              <div className="flex items-center justify-between gap-2">
                <div>
                  <h3 className="text-lg font-semibold text-[#003366]">Stap 2 — AI-vragen voor uren-onderbouwing</h3>
                  <p className="text-xs text-gray-600 mt-1">
                    Beantwoord per inspanning de 3 vragen. Antwoorden mogen kort/grof zijn (bijv. &quot;maandelijks 2u&quot;, &quot;12 sessies&quot;). Hoe specifieker, hoe realistischer de uren-schatting.
                  </p>
                </div>
                <button
                  onClick={() => setVragenModalOpen(false)}
                  disabled={vaststellenLoading}
                  className="text-gray-400 hover:text-gray-700 text-2xl leading-none px-2"
                >
                  ×
                </button>
              </div>
            </div>
            <div className="p-5 space-y-4">
              {vragenPerInspanning.map((vi) => {
                const col = DOMEIN_COLORS[vi.domein];
                return (
                  <div key={vi.groepId} className={`border-2 rounded-lg p-4 ${col.bg} ${col.border}`}>
                    <div className="flex items-center gap-2 mb-3">
                      <span className={`text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded ${col.text} bg-white`}>
                        {DOMEIN_LABELS[vi.domein]}
                      </span>
                      <p className={`text-sm font-semibold ${col.text}`}>{vi.inspanningTitel}</p>
                    </div>
                    <div className="space-y-3">
                      {vi.vragen.map((v, idx) => {
                        const huidig = antwoordenPerInspanning[vi.groepId]?.[v.id] ?? "";
                        const aanbeveling = v.aanbevolenAntwoord ?? v.voorbeeldAntwoord ?? "";
                        const ongewijzigd = aanbeveling.length > 0 && huidig.trim() === aanbeveling.trim();
                        return (
                          <div key={v.id} className="bg-white rounded p-3 border border-gray-200">
                            <p className="text-sm text-gray-800 mb-2">
                              <span className="text-[#003366] font-semibold">{idx + 1}.</span> {v.vraag}
                            </p>
                            {aanbeveling && (
                              <div className="mb-2 bg-blue-50 border border-blue-200 rounded p-2">
                                <p className="text-[10px] font-semibold text-[#003366] uppercase tracking-wider mb-1">
                                  💡 AI-aanbeveling (Cito-context)
                                </p>
                                <p className="text-[12px] text-gray-800 leading-snug">{aanbeveling}</p>
                                {v.toelichtingAanbeveling && (
                                  <p className="text-[10px] text-gray-600 italic mt-1">{v.toelichtingAanbeveling}</p>
                                )}
                                <div className="mt-1 flex items-center gap-2">
                                  <button
                                    onClick={() =>
                                      setAntwoordenPerInspanning((prev) => ({
                                        ...prev,
                                        [vi.groepId]: { ...prev[vi.groepId], [v.id]: aanbeveling },
                                      }))
                                    }
                                    className="text-[10px] px-2 py-0.5 rounded bg-[#003366] text-white hover:bg-[#002244]"
                                  >
                                    {ongewijzigd ? "✓ aanbeveling overgenomen" : "↺ Vul aanbeveling in"}
                                  </button>
                                  {!ongewijzigd && huidig.trim().length > 0 && (
                                    <span className="text-[10px] text-gray-500">(jouw antwoord wordt gebruikt)</span>
                                  )}
                                </div>
                              </div>
                            )}
                            <textarea
                              value={huidig}
                              onChange={(e) =>
                                setAntwoordenPerInspanning((prev) => ({
                                  ...prev,
                                  [vi.groepId]: { ...prev[vi.groepId], [v.id]: e.target.value },
                                }))
                              }
                              rows={2}
                              placeholder="Jouw antwoord (overschrijf aanbeveling als die niet past)..."
                              className="w-full px-2 py-1.5 text-sm border border-gray-300 rounded bg-white focus:outline-none focus:ring-2 focus:ring-[#003366] resize-y"
                            />
                          </div>
                        );
                      })}
                    </div>
                  </div>
                );
              })}
            </div>
            <div className="p-5 border-t border-gray-200 sticky bottom-0 bg-white flex items-center justify-between gap-2">
              <p className="text-xs text-gray-500">Lege antwoorden krijgen een conservatieve schatting van AI.</p>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setVragenModalOpen(false)}
                  disabled={vaststellenLoading}
                  className="text-sm px-4 py-2 rounded border border-gray-300 text-gray-700 bg-white hover:bg-gray-50 disabled:opacity-50"
                >
                  Sluit
                </button>
                <button
                  onClick={vaststellenUren}
                  disabled={vaststellenLoading}
                  className="text-sm px-4 py-2 rounded bg-[#003366] text-white hover:bg-[#002244] disabled:opacity-50 font-medium"
                >
                  {vaststellenLoading ? "AI rekent uren uit..." : "→ Stel uren vast"}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Vastgestelde uren — editable tabel */}
      {urenTabelOpen && (
        <div
          className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4"
          onClick={() => setUrenTabelOpen(false)}
        >
          <div
            className="bg-white rounded-lg shadow-2xl max-w-5xl w-full max-h-[92vh] overflow-y-auto"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="p-5 border-b border-gray-200 sticky top-0 bg-white z-10">
              <div className="flex items-center justify-between gap-2">
                <div>
                  <h3 className="text-lg font-semibold text-[#003366]">Vastgestelde uren per inspanning (totaal over optimaal scenario)</h3>
                  <p className="text-xs text-gray-600 mt-1">
                    Pas waar nodig handmatig aan. Deze uren worden als <strong>hard input</strong> gebruikt door stap 3 — AI verdeelt ze over de jaren per scenario.
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    onClick={pasConservatiefVoorstelToe}
                    className="text-xs px-3 py-1.5 rounded bg-purple-100 hover:bg-purple-200 text-purple-900 font-medium border border-purple-300 transition-colors"
                    title="Pas een conservatief voorstel toe dat het totaal terugbrengt naar realistische niveaus (basistraining 24u/persoon voor frontline, as-is procesinventarisatie meegerekend, etc.)"
                  >
                    ✨ Conservatief voorstel
                  </button>
                  <button
                    onClick={() => setUrenTabelOpen(false)}
                    className="text-gray-400 hover:text-gray-700 text-2xl leading-none px-2"
                  >
                    ×
                  </button>
                </div>
              </div>
            </div>
            <div className="p-5 space-y-4">
              {vastgesteldeUrenPerInspanning.map((iu) => {
                const col = DOMEIN_COLORS[iu.domein];
                const totaalUrenInsp = iu.rollen.reduce((s, r) => s + r.urenTotaal, 0);
                return (
                  <div key={iu.groepId} className={`border-2 rounded-lg p-3 ${col.bg} ${col.border}`}>
                    <div className="flex items-center justify-between mb-2 gap-2">
                      <div className="flex items-center gap-2">
                        <span className={`text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded ${col.text} bg-white`}>
                          {DOMEIN_LABELS[iu.domein]}
                        </span>
                        <p className={`text-sm font-semibold ${col.text}`}>{iu.inspanningTitel}</p>
                      </div>
                      <p className="text-sm font-bold text-gray-800">{totaalUrenInsp.toLocaleString("nl-NL")}u</p>
                    </div>
                    <table className="w-full text-xs bg-white rounded">
                      <thead>
                        <tr className="border-b border-gray-200">
                          <th className="text-left py-1 px-2 text-gray-500 font-semibold">Rol</th>
                          <th className="text-right py-1 px-2 text-gray-500 font-semibold w-16">Aantal</th>
                          <th className="text-left py-1 px-2 text-gray-500 font-semibold">Onderbouwing (AI)</th>
                          <th className="text-right py-1 px-2 text-gray-500 font-semibold w-32">Uren totaal</th>
                        </tr>
                      </thead>
                      <tbody>
                        {iu.rollen.map((r) => {
                          const aantal = selectiePerDomein[iu.domein]?.[r.functieId]?.aantal ?? 1;
                          return (
                            <tr key={r.functieId} className="border-b border-gray-100 last:border-b-0">
                              <td className="py-1 px-2">
                                <p className="text-gray-800 font-medium">{r.functieNaam}</p>
                                {r.afdeling && <p className="text-[10px] text-gray-500">{r.afdeling}</p>}
                              </td>
                              <td className="py-1 px-2 text-right text-gray-700 tabular-nums">{aantal}</td>
                              <td className="py-1 px-2 text-[11px] text-gray-600 italic leading-snug">{r.onderbouwing}</td>
                              <td className="py-1 px-2 text-right">
                                <input
                                  type="number"
                                  min={0}
                                  value={r.urenTotaal}
                                  onChange={(e) => pasUrenAan(iu.groepId, r.functieId, Number(e.target.value))}
                                  className="w-24 px-2 py-1 text-xs border border-gray-300 rounded bg-white text-right focus:outline-none focus:ring-1 focus:ring-[#003366]"
                                />
                                <span className="text-[10px] text-gray-500 ml-1">u</span>
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                );
              })}
            </div>
            <div className="p-5 border-t border-gray-200 sticky bottom-0 bg-white flex items-center justify-end gap-2">
              <button
                onClick={() => setUrenTabelOpen(false)}
                className="text-sm px-4 py-2 rounded bg-[#003366] text-white hover:bg-[#002244] font-medium"
              >
                Klaar — gebruik bij stap 3
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Fineut-modal */}
      {fineutOpen && (
        <div
          className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4"
          onClick={() => !loading && setFineutOpen(false)}
        >
          <div
            className="bg-white rounded-lg shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="p-5 border-b border-gray-200">
              <h3 className="text-lg font-semibold text-[#003366]">Herrekenen op basis van stuurgroep-feedback</h3>
              <p className="text-sm text-gray-600 mt-1 leading-relaxed">
                Beschrijf wat de stuurgroep heeft afgesproken of wat anders moet — rollen, uren,
                fasering of capaciteits-verdeling. AI rekent door wat dat betekent voor uren-totalen
                per scenario en past de tekst daarop aan zodat alles coherent blijft.
              </p>
            </div>
            <div className="p-5 space-y-4">
              <div>
                <p className="text-[11px] font-semibold text-gray-600 uppercase tracking-wider mb-2">Voorbeelden</p>
                <div className="flex flex-wrap gap-2">
                  {FINEUT_VOORBEELDEN.map((vb) => (
                    <button
                      key={vb.kort}
                      onClick={() => setFineutInstr(vb.instructie)}
                      disabled={loading}
                      className="text-xs px-3 py-1.5 rounded-full border border-[#003366] text-[#003366] bg-white hover:bg-[#f0f4f8] disabled:opacity-50"
                      title={vb.instructie}
                    >
                      {vb.kort}
                    </button>
                  ))}
                </div>
              </div>
              <div>
                <label className="text-[11px] font-semibold text-gray-600 uppercase tracking-wider">Instructie aan AI</label>
                <textarea
                  value={fineutInstr}
                  onChange={(e) => setFineutInstr(e.target.value)}
                  rows={6}
                  placeholder={"Voorbeelden van stuurgroep-input die je hier kunt typen:\n\n• \"Uit stuurgroep-overleg: Cito-medewerkers kunnen pas vanaf juni 2026 voor 50–60% inzetbaar zijn. Reken de uren-verdeling jaar 1 daarop bij.\"\n\n• \"Voeg een Projectmanager D toe in elk domein voor programma-coördinatie (10% FTE per jaar).\"\n\n• \"Verlaag totale uren cultuur-domein met 20% — stuurgroep wil minder afhankelijkheid van externe begeleiding.\""}
                  className="w-full mt-1 px-3 py-2 text-sm border border-gray-300 rounded bg-white focus:outline-none focus:ring-2 focus:ring-[#003366] resize-y leading-relaxed"
                />
                <p className="text-[10px] text-gray-500 mt-1">
                  Tip: wees specifiek over WAT (uren, jaar, scenario, rol) en WAAROM (stuurgroep-besluit,
                  capaciteit, prioriteit). AI past zowel uren als tekst aan zodat alles consistent blijft.
                </p>
              </div>
            </div>
            <div className="p-5 border-t border-gray-200 flex items-center justify-end gap-2">
              <button
                onClick={() => { setFineutOpen(false); setFineutInstr(""); }}
                disabled={loading}
                className="text-sm px-4 py-2 rounded border border-gray-300 text-gray-700 bg-white hover:bg-gray-50 disabled:opacity-50"
              >
                Annuleer
              </button>
              <button
                onClick={async () => {
                  const instr = fineutInstr.trim();
                  if (!instr) { setError("Vul een instructie in."); return; }
                  await generateAdvies({ finetuneInstructie: instr, previousAdvies: advies });
                  setFineutOpen(false);
                  setFineutInstr("");
                }}
                disabled={loading || !fineutInstr.trim()}
                className="text-sm px-4 py-2 rounded bg-[#003366] text-white hover:bg-[#002244] disabled:opacity-50 font-medium"
              >
                {loading ? "AI rekent door..." : "Stuur naar AI"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ----------------------------------------------------------------------------
// StakeholdersBeslispuntenBlok — collapsible sub-blok onder de rol-tabel.
// Toont per scenario:
//  - Cat 2 (stakeholder: true): rollen die input/review leveren maar GEEN uren
//    krijgen toegewezen (paars accent).
//  - Cat 3 (reviewVereist: true): rollen waarvoor nog een handmatige beslissing
//    open staat — visueel als "open beslispunt" (oranje accent).
// Resolve namen via CITO_FUNCTIES + customFunctiesPerDomein zodat geen UUIDs
// in de UI verschijnen (CLAUDE.md regel 9).
// ----------------------------------------------------------------------------
type StakeholderItem = {
  domein: Domein;
  functieId: string;
  naam: string;
  afdeling?: string;
  aantal: number;
  toelichting?: string;
};
type ReviewItem = {
  domein: Domein;
  functieId: string;
  naam: string;
  afdeling?: string;
  aantal: number;
  vraag?: string;
};

function resolveRolNaam(
  domein: Domein,
  functieId: string,
  customFunctiesPerDomein?: Record<Domein, CustomFunctie[]>,
): { naam: string; afdeling?: string } {
  const cito = CITO_FUNCTIES.find((f) => f.id === functieId);
  if (cito) return { naam: cito.naam, afdeling: cito.afdeling };
  const custom = customFunctiesPerDomein?.[domein]?.find((c) => c.id === functieId);
  if (custom) return { naam: custom.naam, afdeling: "Custom" };
  return { naam: functieId };
}

function StakeholdersBeslispuntenBlok({
  selectiePerDomein,
  customFunctiesPerDomein,
}: {
  selectiePerDomein?: Record<Domein, Record<string, FunctieInput>>;
  customFunctiesPerDomein?: Record<Domein, CustomFunctie[]>;
}): React.ReactElement | null {
  if (!selectiePerDomein) return null;

  const domOrder: Domein[] = ["cultuur", "mens", "data_systemen", "processen"];
  const stakeholders: StakeholderItem[] = [];
  const reviews: ReviewItem[] = [];

  for (const d of domOrder) {
    const sel = selectiePerDomein[d] ?? {};
    for (const [functieId, input] of Object.entries(sel)) {
      const { naam, afdeling } = resolveRolNaam(d, functieId, customFunctiesPerDomein);
      const aantal = typeof input.aantal === "number" && input.aantal > 0 ? input.aantal : 1;
      if (input.stakeholder === true) {
        stakeholders.push({ domein: d, functieId, naam, afdeling, aantal, toelichting: input.stakeholderToelichting });
      }
      if (input.reviewVereist === true) {
        reviews.push({ domein: d, functieId, naam, afdeling, aantal, vraag: input.reviewVraag });
      }
    }
  }

  if (stakeholders.length === 0 && reviews.length === 0) return null;

  return (
    <details className="rounded-lg border-2 border-purple-200 bg-white overflow-hidden" open>
      <summary className="cursor-pointer px-4 py-2.5 bg-gradient-to-r from-purple-50 to-amber-50 hover:from-purple-100 hover:to-amber-100 flex items-center justify-between gap-3">
        <span className="text-sm font-semibold text-[#003366]">
          Betrokken stakeholders &amp; open beslispunten
        </span>
        <span className="text-[11px] text-gray-600 font-mono shrink-0">
          {stakeholders.length > 0 && (
            <span className="inline-block bg-purple-100 text-purple-800 border border-purple-200 px-1.5 py-0.5 rounded mr-1.5">
              {stakeholders.length} stakeholder{stakeholders.length !== 1 ? "s" : ""}
            </span>
          )}
          {reviews.length > 0 && (
            <span className="inline-block bg-amber-100 text-amber-800 border border-amber-200 px-1.5 py-0.5 rounded">
              {reviews.length} beslispunt{reviews.length !== 1 ? "en" : ""}
            </span>
          )}
        </span>
      </summary>

      <div className="px-4 pb-4 pt-3 border-t border-purple-100 space-y-4">
        {/* Toelichting verschil stakeholder vs review-vereist */}
        <div className="rounded bg-gray-50 border border-gray-200 p-2.5 text-[11px] text-gray-700 leading-relaxed">
          <p>
            <strong className="text-purple-800">Stakeholder</strong> = betrokken voor input of review,
            geen uren-belasting in de begroting. <strong className="text-amber-800">Review-vereist</strong> ={" "}
            handmatige beslissing nog open — vraag onder &lsquo;open beslispunt&rsquo; bepaalt of/hoeveel
            uren deze rol uiteindelijk krijgt.
          </p>
        </div>

        {/* Cat 2 — Stakeholders */}
        {stakeholders.length > 0 && (
          <div>
            <div className="flex items-center gap-2 mb-2">
              <span className="inline-block w-2.5 h-2.5 rounded-full bg-purple-600" />
              <p className="text-[11px] uppercase tracking-wider font-bold text-purple-800">
                Stakeholders ({stakeholders.length}) — input/review, geen uren-belasting
              </p>
            </div>
            <div className="space-y-1.5">
              {stakeholders.map((it) => {
                const dCol = DOMEIN_COLORS[it.domein];
                return (
                  <div
                    key={`sh-${it.domein}-${it.functieId}`}
                    className="rounded border border-purple-200 bg-purple-50/40 p-2.5 text-[11px]"
                  >
                    <div className="flex items-baseline justify-between gap-2 flex-wrap mb-1">
                      <div className="flex items-baseline gap-2 flex-wrap">
                        <span className={`text-[10px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded ${dCol.text} ${dCol.bg} border ${dCol.border}`}>
                          {DOMEIN_LABELS[it.domein]}
                        </span>
                        <span className="font-semibold text-gray-900">{it.naam}</span>
                        {it.afdeling && <span className="text-[10px] text-gray-500">({it.afdeling})</span>}
                      </div>
                      <span className="font-mono tabular-nums text-purple-800">
                        {it.aantal}× <span className="text-[10px] uppercase tracking-wider">stakeholder</span>
                      </span>
                    </div>
                    {it.toelichting && (
                      <p className="text-gray-700 leading-snug italic">{it.toelichting}</p>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Cat 3 — Review-vereist (open beslispunten) */}
        {reviews.length > 0 && (
          <div>
            <div className="flex items-center gap-2 mb-2">
              <span className="inline-block w-2.5 h-2.5 rounded-full bg-amber-500" />
              <p className="text-[11px] uppercase tracking-wider font-bold text-amber-800">
                Open beslispunten ({reviews.length}) — handmatige review nodig
              </p>
            </div>
            <div className="space-y-1.5">
              {reviews.map((it) => {
                const dCol = DOMEIN_COLORS[it.domein];
                return (
                  <div
                    key={`rv-${it.domein}-${it.functieId}`}
                    className="rounded border-l-4 border-l-amber-500 border border-amber-200 bg-amber-50/60 p-2.5 text-[11px]"
                  >
                    <div className="flex items-baseline justify-between gap-2 flex-wrap mb-1">
                      <div className="flex items-baseline gap-2 flex-wrap">
                        <span className={`text-[10px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded ${dCol.text} ${dCol.bg} border ${dCol.border}`}>
                          {DOMEIN_LABELS[it.domein]}
                        </span>
                        <span className="font-semibold text-gray-900">{it.naam}</span>
                        {it.afdeling && <span className="text-[10px] text-gray-500">({it.afdeling})</span>}
                      </div>
                      <span className="font-mono tabular-nums text-amber-800">
                        {it.aantal}× <span className="text-[10px] uppercase tracking-wider">review nodig</span>
                      </span>
                    </div>
                    {it.vraag && (
                      <div className="mt-1 rounded bg-white border border-amber-200 p-2">
                        <p className="text-[10px] uppercase tracking-wider font-bold text-amber-700 mb-0.5">Vraag</p>
                        <p className="text-gray-800 leading-snug">{it.vraag}</p>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>
    </details>
  );
}

// ────────────────────────────────────────────────────────────────────────────
// bepaalUniekeFasesPerDomein — verzamelt unieke fase-strings uit
// begrotingAdvies voor één domein, gegroepeerd per scenario. Returnt
// per scenario de unieke set fase-strings + de bijbehorende geclassificeerde
// FaseType. Gebruikt door FunctieToevoegenModal als checkboxen-bron.
// ────────────────────────────────────────────────────────────────────────────
type FaseInfo = { fase: string; faseType: FaseType };

function bepaalUniekeFasesPerDomein(
  begrotingAdvies: BegrotingAdviesMin | undefined,
  domein: Domein,
): Record<ScenarioLabel, FaseInfo[]> {
  const out: Record<ScenarioLabel, FaseInfo[]> = {
    optimaal: [],
    plus20: [],
    min20: [],
    advies: [],
  };
  const scenKeys: ScenarioLabel[] = ["optimaal", "plus20", "min20", "advies"];
  for (const k of scenKeys) {
    const scen = begrotingAdvies?.scenarios?.[k];
    if (!scen?.inspanningen) continue;
    const seen = new Set<string>();
    for (const i of scen.inspanningen) {
      if (i.domein !== domein) continue;
      for (const v of i.verdelingPerJaar ?? []) {
        const fase = (v.fase ?? "").trim();
        if (!fase || seen.has(fase)) continue;
        seen.add(fase);
        out[k].push({ fase, faseType: classificeerFaseString(fase) });
      }
    }
  }
  return out;
}

// Geünificeerde fase-lijst over alle scenarios — voor de checkbox-UI in
// de modal (we tonen 1 lijst, user vinkt aan welke fases relevant zijn;
// per scenario wordt later getoetst of een jaar-fase in die set zit).
function bepaalUniekeFasesGeunificeerd(
  begrotingAdvies: BegrotingAdviesMin | undefined,
  domein: Domein,
): FaseInfo[] {
  const perScen = bepaalUniekeFasesPerDomein(begrotingAdvies, domein);
  const seen = new Set<string>();
  const out: FaseInfo[] = [];
  for (const k of ["optimaal", "plus20", "min20", "advies"] as ScenarioLabel[]) {
    for (const f of perScen[k]) {
      if (seen.has(f.fase)) continue;
      seen.add(f.fase);
      out.push(f);
    }
  }
  return out;
}

// Default-aanvinklogica per categorie: welke fases standaard actief zijn.
//  • leider: alle fases
//  • kernteam: alle fases
//  • trainings-deelnemer: basis/vaardigheid (mens) of realisatie/acceptatie (data) — overig: leeg
//  • geconsulteerd: eerste 2 piek-achtige fases (op basis van fase-type-volgorde)
function defaultActieveFases(
  categorie: LezingCCat,
  domein: Domein,
  fases: FaseInfo[],
): string[] {
  if (categorie === "leider" || categorie === "kernteam") {
    return fases.map((f) => f.fase);
  }
  if (categorie === "trainings_deelnemer") {
    if (domein === "mens") {
      return fases
        .filter((f) => f.faseType === "basis" || f.faseType === "vaardigheid")
        .map((f) => f.fase);
    }
    if (domein === "data_systemen") {
      return fases
        .filter((f) => f.faseType === "realisatie" || f.faseType === "acceptatie")
        .map((f) => f.fase);
    }
    return [];
  }
  // geconsulteerd → eerste 2 piek-achtige fases
  const piekTypes: FaseType[] = ["piek", "basis", "vaardigheid", "realisatie", "acceptatie"];
  return fases
    .filter((f) => piekTypes.includes(f.faseType))
    .slice(0, 2)
    .map((f) => f.fase);
}

// ────────────────────────────────────────────────────────────────────────────
// verwijderRolUitAdvies — orkestreert de volledige verwijdering wanneer een
// gebruiker een functie verwijdert: per scenario, per domein, per jaar wordt
// het rol-record geschrapt en alle aggregaten (totaalUren, totaalKosten,
// programma/lijn/raadplegen) opnieuw berekend. Verwijdert ook het categorie-
// override-record uit de marker.
// ────────────────────────────────────────────────────────────────────────────
function verwijderRolUitAdvies(
  advies: InterneUrenAdvies,
  domein: Domein,
  functieId: string,
  selectiePerDomein: Record<Domein, Record<string, FunctieInput>> | undefined,
): InterneUrenAdvies {
  // 1. Update marker: verwijder de categorie-override voor deze rol
  const huidigeMarker: InterneUrenLezingMarker = advies.interneUrenLezing ?? {};
  const huidigeMapping = huidigeMarker.rolCategorieen ?? {};
  const huidigeDomeinMapping: Record<string, LezingCCat> = { ...(huidigeMapping[domein] ?? {}) };
  delete huidigeDomeinMapping[functieId];
  const nieuweMarker: InterneUrenLezingMarker = {
    ...huidigeMarker,
    rolCategorieen: {
      ...huidigeMapping,
      [domein]: huidigeDomeinMapping,
    },
  };

  // 2. Loop scenarios → domeinen → jaren → filter rollen
  const newScenarios: InterneUrenAdvies["scenarios"] = { ...advies.scenarios };
  const scenKeys: ScenarioLabel[] = ["optimaal", "plus20", "min20", "advies"];
  for (const scenKey of scenKeys) {
    const scen = newScenarios[scenKey];
    if (!scen) continue;

    const newDomeinen: DomeinBlok[] = scen.domeinen.map((d) => {
      if (d.domein !== domein) {
        return d;
      }
      const newJaren: JaarBlok[] = d.jaren.map((jr) => {
        const nieuweRollen = jr.rollen.filter((r) => r.functieId !== functieId);
        const totaalUren = nieuweRollen.reduce((s, x) => s + (x.uren ?? 0), 0);
        const totaalKosten = nieuweRollen.reduce((s, x) => s + (x.kosten ?? 0), 0);
        return { ...jr, rollen: nieuweRollen, totaalUren, totaalKosten };
      });

      // Hercalculeer programma/lijn/raadplegen voor dit domein
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
            (r as { categorie?: string }).categorie,
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

    // Hercalculeer scenario-niveau totalen
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
            (r as { categorie?: string }).categorie,
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

  return {
    ...advies,
    scenarios: newScenarios,
    interneUrenLezing: nieuweMarker,
  };
}

// ────────────────────────────────────────────────────────────────────────────
// voegFunctieToeAanAdvies — orkestreert de volledige update wanneer een
// gebruiker een functie toevoegt: per scenario per domein per jaar wordt
// een rol-record toegevoegd. Uren-niveau volgt categorie + fase-type van
// dat jaar; alleen jaren waarvan de fase in `actieveFases` staat krijgen
// uren > 0 (anders 0).
// Updated marker: rolCategorieen[domein][functieId] = categorie.
// ────────────────────────────────────────────────────────────────────────────
function voegFunctieToeAanAdvies(
  advies: InterneUrenAdvies,
  domein: Domein,
  functieId: string,
  functieNaam: string,
  afdeling: string | undefined,
  aantal: number,
  categorie: LezingCCat,
  actieveFases: string[],
  begrotingAdvies: BegrotingAdviesMin | undefined,
  basisTarief: number,
  referentiejaar: number,
  indexatiePct: number,
  selectiePerDomein: Record<Domein, Record<string, FunctieInput>>,
): InterneUrenAdvies {
  // 1. Update marker: zet categorie-override voor deze nieuwe rol
  const huidigeMarker: InterneUrenLezingMarker = advies.interneUrenLezing ?? {};
  const huidigeMapping = huidigeMarker.rolCategorieen ?? {};
  const huidigeDomeinMapping = huidigeMapping[domein] ?? {};
  const nieuweMarker: InterneUrenLezingMarker = {
    ...huidigeMarker,
    rolCategorieen: {
      ...huidigeMapping,
      [domein]: { ...huidigeDomeinMapping, [functieId]: categorie },
    },
  };

  const actieveFasesSet = new Set(actieveFases.map((f) => f.trim()));

  // 2. Loop scenarios → bouw nieuwe DomeinBlok met extra rol per jaar
  const newScenarios: InterneUrenAdvies["scenarios"] = { ...advies.scenarios };
  const scenKeys: ScenarioLabel[] = ["optimaal", "plus20", "min20", "advies"];
  for (const scenKey of scenKeys) {
    const scen = newScenarios[scenKey];
    if (!scen) continue;
    const begrotingScenario = begrotingAdvies?.scenarios?.[scenKey] ?? null;
    const piekJaren = pieksjaren(begrotingScenario, domein);

    // Bepaal per jaar de geldige fases uit begroting (per inspanning op dit domein)
    function urenVoorJaar(jaar: number): number {
      // Verzamel fase-strings die in dit jaar vallen voor dit domein
      const fasesInJaar: string[] = [];
      if (begrotingScenario?.inspanningen) {
        for (const i of begrotingScenario.inspanningen) {
          if (i.domein !== domein) continue;
          for (const v of i.verdelingPerJaar ?? []) {
            if (v.jaar !== jaar) continue;
            const fs = (v.fase ?? "").trim();
            if (fs) fasesInJaar.push(fs);
          }
        }
      }
      // Functie is in dit jaar actief als minstens één van de aangevinkte
      // fases voorkomt in de begroting voor dit jaar.
      const isActief = fasesInJaar.some((fs) => actieveFasesSet.has(fs));
      if (!isActief) return 0;
      const faseType = bepaalFaseType(begrotingScenario, domein, jaar);
      const urenPP = berekenRolUrenPerPersoonPerJaar(
        categorie,
        faseType,
        domein,
        jaar,
        piekJaren,
      );
      return urenPP * aantal;
    }

    const newDomeinen: DomeinBlok[] = scen.domeinen.map((d) => {
      if (d.domein !== domein) {
        // Andere domeinen blijven onveranderd, maar progr/lijn/raadplegen
        // hercalculeren we niet — die blijven gelijk omdat geen rol-mutatie.
        return d;
      }
      const newJaren: JaarBlok[] = d.jaren.map((jr) => {
        const uren = urenVoorJaar(jr.jaar);
        const tarief = berekenGeindexeerdTarief(basisTarief, referentiejaar, indexatiePct, jr.jaar);
        const nieuweRol: Rol = {
          functieId,
          functieNaam,
          afdeling,
          uren,
          uurtarief: tarief,
          kosten: uren * tarief,
        };
        // Bestaat de rol al voor dit jaar? Vervang i.p.v. dupliceren.
        const bestaatIdx = jr.rollen.findIndex((r) => r.functieId === functieId);
        const nieuweRollen =
          bestaatIdx >= 0
            ? jr.rollen.map((r, i) => (i === bestaatIdx ? nieuweRol : r))
            : [...jr.rollen, nieuweRol];
        const totaalUren = nieuweRollen.reduce((s, x) => s + (x.uren ?? 0), 0);
        const totaalKosten = nieuweRollen.reduce((s, x) => s + (x.kosten ?? 0), 0);
        return { ...jr, rollen: nieuweRollen, totaalUren, totaalKosten };
      });

      // Hercalculeer programma/lijn/raadplegen voor dit domein op basis van
      // (nieuwe) rol-categorieen. We hebben nog geen selectiePerDomein-aantallen
      // in scope hier, maar pcts gebruiken alleen rol.uren — dus correct.
      let programmaUren = 0;
      let lijnUren = 0;
      let raadplegenUren = 0;
      const seenForCat = new Map<string, LezingCCat>();
      function getCat(rol: Rol): LezingCCat {
        const cached = seenForCat.get(rol.functieId);
        if (cached) return cached;
        const sel =
          rol.functieId === functieId
            ? { aantal }
            : selectiePerDomein?.[d.domein]?.[rol.functieId];
        const cat = bepaalLezingCCategorie(d.domein, rol.functieId, rol.functieNaam, sel, nieuweMarker, (rol as { categorie?: string }).categorie);
        seenForCat.set(rol.functieId, cat);
        return cat;
      }
      for (const jr of newJaren) {
        for (const r of jr.rollen) {
          const rolCat = getCat(r);
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

    // Hercalculeer scenario-niveau totalen
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
          const sel =
            r.functieId === functieId
              ? { aantal }
              : selectiePerDomein?.[d.domein]?.[r.functieId];
          const rolCat = bepaalLezingCCategorie(d.domein, r.functieId, r.functieNaam, sel, nieuweMarker, (r as { categorie?: string }).categorie);
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

  return {
    ...advies,
    scenarios: newScenarios,
    interneUrenLezing: nieuweMarker,
  };
}

// ────────────────────────────────────────────────────────────────────────────
// CategorieGroepsoverzicht — aggregatie per Lezing-C-categorie over hele scenario-looptijd
// Geef voor één domein een totaal-overzicht: groepeer rollen per categorie
// (leider / kernteam / trainings-deelnemer / geconsulteerd) met aantal personen
// per rol + totaal-uren over alle jaren + categorie-totaal.
// Lost op: gebruiker zag geconsulteerden met 0u in jaren waar ze niet werken.
// ────────────────────────────────────────────────────────────────────────────
type CategorieRol = {
  functieId: string;
  functieNaam: string;
  afdeling?: string;
  aantal: number;
  totaalUren: number;          // som over alle jaren
  jarenActief: Array<{ jaar: number; uren: number; activiteit: string }>; // alleen jaren met uren > 0
  isStakeholder: boolean;
  isReview: boolean;
  isTbd: boolean;
};

const CATEGORIE_VOLGORDE: LezingCCat[] = ["leider", "kernteam", "trainings_deelnemer", "geconsulteerd"];

const CATEGORIE_UITLEG: Record<LezingCCat, string> = {
  leider: "Trekt de inspanning — eindverantwoordelijk voor voortgang en escalatie.",
  kernteam: "Doet uitvoerend werk — vakinhoudelijke taken (5–7 personen volgens Kotter guiding coalition).",
  trainings_deelnemer: "Volgt training als eindgebruiker — pure contacttijd (geen kernteam-rol).",
  geconsulteerd: "Levert incidenteel input/review op kritische momenten — geen continue belasting.",
};

const CATEGORIE_CHIP_BG: Record<LezingCCat, string> = {
  leider: "bg-[#003366]",
  kernteam: "bg-blue-500",
  trainings_deelnemer: "bg-emerald-500",
  geconsulteerd: "bg-gray-400",
};

const CATEGORIE_BLOK_BG: Record<LezingCCat, string> = {
  leider: "bg-[#003366]/[0.05] border-[#003366]/30",
  kernteam: "bg-blue-50 border-blue-200",
  trainings_deelnemer: "bg-emerald-50 border-emerald-200",
  geconsulteerd: "bg-gray-50 border-gray-200",
};

function CategorieGroepsoverzicht({
  domeinBlok,
  selectiePerDomein,
  lezingMarker,
}: {
  domeinBlok: DomeinBlok;
  selectiePerDomein?: Record<Domein, Record<string, FunctieInput>>;
  lezingMarker?: InterneUrenLezingMarker;
}): React.ReactElement {
  // Aggregeer rollen over alle jaren — per functieId één entry met som-uren
  const perFunctie = new Map<string, CategorieRol & { categorie: LezingCCat }>();
  for (const jr of domeinBlok.jaren) {
    for (const r of jr.rollen) {
      const sel = selectiePerDomein?.[domeinBlok.domein]?.[r.functieId];
      const cat = bepaalLezingCCategorie(domeinBlok.domein, r.functieId, r.functieNaam, sel, lezingMarker, (r as { categorie?: string }).categorie);
      const naamLower = (r.functieNaam ?? "").toLowerCase();
      const isTbd =
        naamLower.includes("nader te bepalen") ||
        naamLower.includes("nog te benoemen") ||
        naamLower.includes("tbd");
      const cur = perFunctie.get(r.functieId) ?? {
        functieId: r.functieId,
        functieNaam: r.functieNaam,
        afdeling: r.afdeling,
        aantal: sel?.aantal ?? 1,
        totaalUren: 0,
        jarenActief: [],
        isStakeholder: sel?.stakeholder === true,
        isReview: sel?.reviewVereist === true,
        isTbd,
        categorie: cat,
      };
      cur.totaalUren += r.uren ?? 0;
      if ((r.uren ?? 0) > 0) {
        cur.jarenActief.push({ jaar: jr.jaar, uren: r.uren, activiteit: jr.activiteit });
      }
      perFunctie.set(r.functieId, cur);
    }
  }

  // Groepeer per categorie
  const perCategorie: Record<LezingCCat, Array<CategorieRol & { categorie: LezingCCat }>> = {
    leider: [],
    kernteam: [],
    trainings_deelnemer: [],
    geconsulteerd: [],
  };
  for (const r of perFunctie.values()) {
    perCategorie[r.categorie].push(r);
  }
  // Sorteer per categorie op totaal-uren desc
  for (const c of CATEGORIE_VOLGORDE) {
    perCategorie[c].sort((a, b) => b.totaalUren - a.totaalUren);
  }

  // Categorie-totalen
  const totals: Record<LezingCCat, { personen: number; uren: number; rollen: number }> = {
    leider: { personen: 0, uren: 0, rollen: 0 },
    kernteam: { personen: 0, uren: 0, rollen: 0 },
    trainings_deelnemer: { personen: 0, uren: 0, rollen: 0 },
    geconsulteerd: { personen: 0, uren: 0, rollen: 0 },
  };
  for (const c of CATEGORIE_VOLGORDE) {
    for (const r of perCategorie[c]) {
      totals[c].personen += r.aantal;
      totals[c].uren += r.totaalUren;
      totals[c].rollen += 1;
    }
  }

  const eindJaar = (domeinBlok.jaren[domeinBlok.jaren.length - 1]?.jaar) ?? 0;
  const startJaar = (domeinBlok.jaren[0]?.jaar) ?? 0;
  const aantalJaren = domeinBlok.jaren.length;

  // Som van categorie-totaal-personen — niet noodzakelijk gelijk aan unieke
  // FTEs (één persoon kan 2× geteld zijn als hij in 2 categorieën zit binnen
  // hetzelfde domein; in praktijk bijna nooit). Toch "som" tonen consistent.
  const totaalPersonen =
    totals.leider.personen +
    totals.kernteam.personen +
    totals.trainings_deelnemer.personen +
    totals.geconsulteerd.personen;
  const totaalRollen =
    totals.leider.rollen +
    totals.kernteam.rollen +
    totals.trainings_deelnemer.rollen +
    totals.geconsulteerd.rollen;

  return (
    <div className="rounded-lg border-2 border-[#003366]/30 bg-white overflow-hidden mb-3">
      <div className="bg-[#003366] text-white px-3 py-2 flex items-baseline justify-between gap-2 flex-wrap">
        <div>
          <p className="text-[10px] uppercase tracking-wider font-bold opacity-80">
            {DOMEIN_LABELS[domeinBlok.domein]} — overzicht per categorie
          </p>
          <p className="text-xs opacity-90">
            Hele scenario-looptijd ({startJaar}–{eindJaar}, {aantalJaren} jaar) · {totaalRollen} unieke rollen · ~{totaalPersonen} personen · {domeinBlok.totaalUren.toLocaleString("nl-NL")}u totaal
          </p>
        </div>
        <p className="text-[10px] italic opacity-80 max-w-md">
          Eén lijst per categorie zodat je in één oogopslag ziet wie welke rol heeft, ongeacht in welk jaar de uren vallen.
        </p>
      </div>
      <div className="p-3 space-y-2">
        {CATEGORIE_VOLGORDE.map((cat) => {
          const rollen = perCategorie[cat];
          if (rollen.length === 0) return null;
          const tot = totals[cat];
          const aandeelPct =
            domeinBlok.totaalUren > 0
              ? Math.round((tot.uren / domeinBlok.totaalUren) * 100)
              : 0;
          return (
            <div
              key={cat}
              className={`rounded border-l-4 ${CATEGORIE_BLOK_BG[cat]} p-2.5`}
            >
              <div className="flex items-baseline justify-between gap-2 flex-wrap mb-1.5">
                <div className="flex items-center gap-2 flex-wrap">
                  <span
                    className={`inline-block ${CATEGORIE_CHIP_BG[cat]} text-white text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded`}
                  >
                    {LEZING_C_CAT_LABEL[cat]}
                  </span>
                  <span className="text-xs font-semibold text-gray-800">
                    {tot.rollen} rol{tot.rollen === 1 ? "" : "len"} · {tot.personen} {tot.personen === 1 ? "persoon" : "personen"}
                  </span>
                  <span className="text-[11px] font-mono tabular-nums text-gray-700">
                    {tot.uren.toLocaleString("nl-NL")}u totaal ({aandeelPct}%)
                  </span>
                </div>
              </div>
              <p className="text-[10px] italic text-gray-600 leading-snug mb-2 pl-1">
                {CATEGORIE_UITLEG[cat]}
              </p>
              <div className="space-y-1">
                {rollen.map((r) => {
                  const urenLabel = r.isStakeholder
                    ? "Stakeholder (geen uren-belasting)"
                    : r.totaalUren === 0
                      ? "0u — geen actieve uren in dit scenario"
                      : `${r.totaalUren.toLocaleString("nl-NL")}u over ${aantalJaren}j`;
                  // Per-jaar-detail tekst (alleen jaren met uren > 0)
                  const jaarDetailKort = r.jarenActief
                    .map((j) => `${j.uren}u in ${j.jaar}`)
                    .join(" + ");
                  // Bepaal aantal-suffix
                  let aantalLabel = "";
                  if (r.aantal > 1) aantalLabel = ` (${r.aantal} personen)`;
                  return (
                    <div
                      key={r.functieId}
                      className="bg-white/70 rounded border border-gray-200 px-2 py-1 text-xs flex items-baseline justify-between gap-2 flex-wrap"
                    >
                      <div className="flex items-baseline gap-1.5 flex-wrap min-w-0">
                        <span className="font-medium text-gray-900 truncate">
                          {r.functieNaam}
                        </span>
                        {r.afdeling && (
                          <span className="text-[10px] text-gray-500">({r.afdeling})</span>
                        )}
                        {aantalLabel && (
                          <span className="text-[10px] font-semibold text-gray-700">
                            {aantalLabel}
                          </span>
                        )}
                        {r.isStakeholder && (
                          <span className="text-[9px] uppercase tracking-wider font-semibold text-purple-700 bg-purple-100 border border-purple-200 px-1 py-0 rounded">
                            Stakeholder
                          </span>
                        )}
                        {r.isReview && !r.isStakeholder && (
                          <span className="text-[9px] uppercase tracking-wider font-semibold text-amber-800 bg-amber-100 border border-amber-300 px-1 py-0 rounded">
                            Review nodig
                          </span>
                        )}
                        {r.isTbd && (
                          <span className="text-[9px] uppercase tracking-wider font-bold text-amber-800 bg-amber-100 border border-amber-300 px-1 py-0 rounded">
                            TBD
                          </span>
                        )}
                      </div>
                      <div className="text-right shrink-0">
                        <p className="font-mono tabular-nums text-gray-800 font-semibold">
                          {urenLabel}
                        </p>
                        {!r.isStakeholder && r.jarenActief.length > 0 && r.jarenActief.length < aantalJaren && (
                          <p className="text-[10px] text-gray-500 italic leading-tight">
                            {jaarDetailKort}
                          </p>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ----------------------------------------------------------------------------
// RolActieMenu — één compact actie-menu per rol (Stap 7 UI-verfijning).
// Vervangt de losse categorie-dropdown + × kruisje door één 3-dots-knop
// met dropdown waarin de gebruiker:
//   • de rol naar een andere Lezing-C categorie verplaatst (4 opties — huidige
//     categorie disabled), of
//   • de rol helemaal uit de selectie verwijdert (rode optie, met confirm via
//     handleRolVerwijderen die zelf window.confirm aanroept).
// Disabled wanneer er geen acties zijn (bv. stakeholder/review-rollen waarvan
// categorie automatisch volgt).
// ----------------------------------------------------------------------------
function RolActieMenu({
  huidigeCategorie,
  onVerplaats,
  onVerwijder,
  disableLeider,
  disabled,
  disabledReden,
}: {
  huidigeCategorie: LezingCCat;
  onVerplaats?: (nieuweCategorie: LezingCCat) => void;
  onVerwijder?: () => void;
  disableLeider?: boolean;
  disabled?: boolean;
  disabledReden?: string;
}): React.ReactElement {
  const [open, setOpen] = useState(false);
  const wrapperRef = useRef<HTMLDivElement | null>(null);

  // Buiten-klikken sluit het menu
  useEffect(() => {
    if (!open) return;
    function handleClick(e: MouseEvent) {
      if (!wrapperRef.current) return;
      if (!wrapperRef.current.contains(e.target as Node)) setOpen(false);
    }
    function handleKey(e: KeyboardEvent) {
      if (e.key === "Escape") setOpen(false);
    }
    document.addEventListener("mousedown", handleClick);
    document.addEventListener("keydown", handleKey);
    return () => {
      document.removeEventListener("mousedown", handleClick);
      document.removeEventListener("keydown", handleKey);
    };
  }, [open]);

  const heeftActies = Boolean(onVerplaats) || Boolean(onVerwijder);
  const isDisabled = Boolean(disabled) || !heeftActies;

  const VERPLAATS_OPTIES: LezingCCat[] = [
    "leider",
    "kernteam",
    "trainings_deelnemer",
    "geconsulteerd",
  ];

  return (
    <div ref={wrapperRef} className="relative inline-block text-left">
      <button
        type="button"
        onClick={(e) => {
          e.stopPropagation();
          if (isDisabled) return;
          setOpen((v) => !v);
        }}
        disabled={isDisabled}
        title={
          isDisabled
            ? disabledReden ?? "Geen acties beschikbaar voor deze rol"
            : "Acties — verplaats of verwijder rol"
        }
        aria-haspopup="menu"
        aria-expanded={open}
        className={`inline-flex items-center justify-center w-6 h-6 rounded text-gray-500 hover:bg-gray-100 hover:text-[#003366] focus:outline-none focus:ring-1 focus:ring-[#003366] disabled:opacity-40 disabled:cursor-not-allowed leading-none text-[14px] font-bold`}
      >
        ⋯
      </button>
      {open && !isDisabled && (
        <div
          role="menu"
          className="absolute right-0 z-30 mt-1 w-56 origin-top-right rounded border border-gray-200 bg-white shadow-lg py-1 text-xs"
          onClick={(e) => e.stopPropagation()}
        >
          {onVerplaats && (
            <>
              <p className="px-3 py-1 text-[10px] font-bold uppercase tracking-wider text-gray-500">
                Verplaats naar
              </p>
              {VERPLAATS_OPTIES.map((c) => {
                const isHuidig = c === huidigeCategorie;
                const isLeiderGeblokkeerd =
                  c === "leider" && disableLeider === true && !isHuidig;
                const optieDisabled = isHuidig || isLeiderGeblokkeerd;
                return (
                  <button
                    key={c}
                    type="button"
                    role="menuitem"
                    disabled={optieDisabled}
                    onClick={() => {
                      if (optieDisabled) return;
                      setOpen(false);
                      onVerplaats(c);
                    }}
                    title={
                      isHuidig
                        ? `Huidige categorie — ${LEZING_C_CAT_LABEL[c]}`
                        : isLeiderGeblokkeerd
                          ? "Er is al een leider in dit domein. Wijzig die rol eerst."
                          : `Verplaats naar ${LEZING_C_CAT_LABEL[c]}`
                    }
                    className={`w-full text-left px-3 py-1.5 flex items-center gap-2 ${
                      optieDisabled
                        ? "text-gray-400 cursor-not-allowed bg-gray-50"
                        : "text-gray-800 hover:bg-[#003366]/10 hover:text-[#003366]"
                    }`}
                  >
                    <span
                      className={`inline-block text-[9px] uppercase tracking-wider font-semibold px-1 py-0 rounded ${LEZING_C_CAT_KLEUR[c]}`}
                    >
                      {LEZING_C_CAT_LABEL[c]}
                    </span>
                    {isHuidig && (
                      <span className="text-[10px] italic text-gray-500">huidige</span>
                    )}
                  </button>
                );
              })}
            </>
          )}
          {onVerplaats && onVerwijder && (
            <div className="my-1 border-t border-gray-200" />
          )}
          {onVerwijder && (
            <button
              type="button"
              role="menuitem"
              onClick={() => {
                setOpen(false);
                onVerwijder();
              }}
              className="w-full text-left px-3 py-1.5 text-red-700 hover:bg-red-50 flex items-center gap-2"
              title="Helemaal verwijderen uit selectie (alle scenarios)"
            >
              <span className="inline-block w-4 text-center">✕</span>
              Helemaal verwijderen
            </button>
          )}
        </div>
      )}
    </div>
  );
}

function ScenarioBlokView({
  s,
  sv,
  selectiePerDomein,
  customFunctiesPerDomein,
  lezingMarker,
  begrotingAdvies,
  handmatigBewerkt,
  onSamenvattingEdit,
  onDomeinMotivatieEdit,
  onCategorieChange,
  onFunctieToevoegen,
  onRolVerwijderen,
}: {
  s: ScenarioBlok;
  sv: { key: ScenarioLabel; label: string; kleur: { banner: string; tekst: string; accent: string; kaart: string } };
  selectiePerDomein?: Record<Domein, Record<string, FunctieInput>>;
  customFunctiesPerDomein?: Record<Domein, CustomFunctie[]>;
  lezingMarker?: InterneUrenLezingMarker;
  begrotingAdvies?: BegrotingAdviesMin;
  handmatigBewerkt?: boolean;
  onSamenvattingEdit?: (newValue: string) => Promise<void> | void;
  onDomeinMotivatieEdit?: (domeinIdx: number, newValue: string) => Promise<void> | void;
  onCategorieChange?: (
    scenarioKey: ScenarioLabel,
    domein: Domein,
    functieId: string,
    nieuweCategorie: LezingCCat,
  ) => Promise<void> | void;
  onFunctieToevoegen?: (input: {
    domein: Domein;
    functieId: string;
    functieNaam: string;
    afdeling?: string;
    schaal?: number;
    isCustom: boolean;
    aantal: number;
    categorie: LezingCCat;
    actieveFases: string[];
    onderbouwing?: string;
  }) => Promise<void> | void;
  onRolVerwijderen?: (domein: Domein, functieId: string) => Promise<void> | void;
}): React.ReactElement {
  const [openDomein, setOpenDomein] = useState<Domein | null>("cultuur");
  const [modalDomein, setModalDomein] = useState<Domein | null>(null);
  // Per-jaar tabellen: default 0u-rollen verbergen zodat geconsulteerden niet
  // als "0u rommel" verschijnen in jaren waar ze niet werken.
  const [toonNulUrenInJaar, setToonNulUrenInJaar] = useState<boolean>(false);
  const eindJaar = s.startJaar + s.aantalJaren - 1;

  return (
    <div className="space-y-3">
      {/* Banner */}
      <div className={`${sv.kleur.banner} text-white rounded-lg p-4`}>
        <div className="flex items-center gap-2 mb-1 flex-wrap">
          <p className={`text-[11px] font-semibold uppercase tracking-wider ${sv.kleur.tekst}`}>Scenario — {sv.label}</p>
          {handmatigBewerkt === true && (
            <span
              title="Deze samenvatting is handmatig in de UI bewerkt en wordt niet door scripts overschreven."
              className="inline-block text-[10px] font-semibold px-1.5 py-0.5 rounded bg-white/95 text-[#003366] border border-white/60"
            >
              ✏ handmatig bewerkt
            </span>
          )}
        </div>
        {onSamenvattingEdit ? (
          <div className="bg-white/95 rounded p-2 -mx-1">
            <EditableText
              value={s.samenvatting ?? ""}
              onSave={onSamenvattingEdit}
              hint={`Scenario-totaal ${s.totaalUren.toLocaleString("nl-NL")} u over ${s.aantalJaren} jaar (${s.startJaar}–${eindJaar}). Geen absolute jaartallen — gebruik 'in het startjaar', 'rond het midden van de looptijd', etc.`}
              rows={3}
              textClassName="text-sm text-gray-800 leading-relaxed whitespace-pre-wrap"
            />
          </div>
        ) : (
          <p className="text-sm">{s.samenvatting}</p>
        )}
        <p className={`text-xs ${sv.kleur.tekst} mt-2`}>
          {s.aantalJaren} jaar ({s.startJaar}–{eindJaar}) • ~€{s.uurtariefGebruikt}/u basis • {s.totaalUren.toLocaleString("nl-NL")} uren totaal
        </p>
      </div>

      {/* Totalen-per-jaar strip met gap vs budget-norm */}
      <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-5 gap-2">
        {s.totalenPerJaar.map((t) => {
          const gap = t.urenGap;
          const hasBudget = t.urenBudget !== undefined;
          const tekort = gap !== undefined && gap > 0;
          const overschot = gap !== undefined && gap < 0;
          return (
            <div key={t.jaar} className="border border-gray-200 rounded p-2 bg-white">
              <p className="text-[10px] font-semibold text-gray-500 uppercase">{t.jaar}</p>
              <p className="text-sm font-semibold text-gray-800">{t.uren.toLocaleString("nl-NL")} u</p>
              <p className="text-[11px] text-gray-500">€ {t.kosten.toLocaleString("nl-NL")}</p>
              {hasBudget && (
                <div className="mt-1 pt-1 border-t border-gray-100">
                  <p className="text-[10px] text-gray-500">Norm: {t.urenBudget!.toLocaleString("nl-NL")}u</p>
                  {gap !== undefined && gap !== 0 && (
                    <p className={`text-[10px] font-semibold ${tekort ? "text-red-600" : "text-green-700"}`}>
                      {tekort ? "Tekort" : "Overschot"}: {Math.abs(gap).toLocaleString("nl-NL")}u
                    </p>
                  )}
                  {gap === 0 && <p className="text-[10px] font-semibold text-gray-600">Precies binnen norm</p>}
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Programma vs lijn — uitsplitsing per scenario (3 kaarten + per-domein-bar + collapsible uitleg) */}
      <ProgrammaLijnBlok s={s} />

      {/* Toelichting: meerdere domeinen + stakeholder-label */}
      <details className="rounded border border-blue-200 bg-blue-50 overflow-hidden">
        <summary className="cursor-pointer px-3 py-2 text-[11px] font-semibold text-blue-900 hover:bg-blue-100">
          Waarom kunnen personen in meerdere domeinen staan? En wat betekent &lsquo;Stakeholder&rsquo;?
        </summary>
        <div className="px-3 pb-3 pt-1 text-[11px] text-blue-900 leading-relaxed space-y-2 border-t border-blue-200">
          <p>
            Een persoon kan in twee of meer domeinen voorkomen omdat <strong>per domein een andere activiteit</strong> geldt — geen dubbeltelling. Het zijn verschillende werkpakketten in dezelfde rol.
          </p>
          <p>
            <strong>Voorbeeld Manager Klantcontact:</strong>
          </p>
          <ul className="list-disc pl-4 space-y-0.5">
            <li>
              <strong>Mens</strong>: trainings-coördinatie-uren (40u — roosters maken voor klantenservice-team).
            </li>
            <li>
              <strong>Data &amp; Systemen</strong>: CRM-stuurgroep- en adoption-uren (28u — andere activiteit).
            </li>
          </ul>
          <p>
            <strong>Stakeholder-label</strong>: rollen met label <em>Stakeholder</em> in de Aantal-kolom hebben een review/input-rol bij de inspanning (bijv. productmanagers leveren acceptatietest-input voor het CRM) maar geen uren-belasting. Ze staan in de selectie omdat zij geraadpleegd worden, niet omdat ze uitvoerders zijn.
          </p>
        </div>
      </details>

      {/* Domein-tabs */}
      <div className="bg-white border border-gray-200 rounded-lg overflow-hidden">
        <div className="flex flex-wrap border-b border-gray-200">
          {s.domeinen.map((d) => {
            const col = DOMEIN_COLORS[d.domein];
            const active = openDomein === d.domein;
            return (
              <button
                key={d.domein}
                onClick={() => setOpenDomein(active ? null : d.domein)}
                className={`flex-1 min-w-[120px] px-3 py-2 text-xs font-semibold border-r border-gray-200 last:border-r-0 ${active ? `${col.bg} ${col.text}` : "text-gray-700 hover:bg-gray-50"}`}
              >
                {DOMEIN_LABELS[d.domein]} · {d.totaalUren.toLocaleString("nl-NL")}u
              </button>
            );
          })}
        </div>
        {s.domeinen.map((d, dIdx) => {
          if (openDomein !== d.domein) return null;
          const col = DOMEIN_COLORS[d.domein];
          return (
            <div key={d.domein} className={`p-4 ${col.bg}`}>
              <div className="flex items-center justify-between gap-2 flex-wrap mb-1">
                <p className={`text-sm font-semibold ${col.text}`}>{DOMEIN_LABELS[d.domein]}</p>
                {onFunctieToevoegen && (
                  <button
                    onClick={() => setModalDomein(d.domein)}
                    title={`Voeg een extra functie toe aan ${DOMEIN_LABELS[d.domein]}`}
                    className="text-[11px] px-2.5 py-1 rounded border border-[#003366] text-[#003366] bg-white hover:bg-[#003366] hover:text-white font-semibold transition-colors"
                  >
                    + Functie toevoegen
                  </button>
                )}
              </div>
              {onDomeinMotivatieEdit ? (
                <div className="mb-3">
                  <EditableText
                    value={d.motivatie ?? ""}
                    onSave={(v) => onDomeinMotivatieEdit(dIdx, v)}
                    hint={`${DOMEIN_LABELS[d.domein]} domein-totaal: ${d.totaalUren.toLocaleString("nl-NL")} u over ${s.aantalJaren} jaar. Geen absolute jaartallen — gebruik relatieve aanduidingen.`}
                    rows={3}
                    textClassName="text-xs text-gray-700 italic leading-relaxed whitespace-pre-wrap"
                  />
                </div>
              ) : (
                <p className="text-xs text-gray-700 italic leading-relaxed mb-3">{d.motivatie}</p>
              )}
              {d.domein === "mens" && (
                <>
                  <p className="text-[10px] text-gray-500 italic leading-snug mb-3 pl-2 border-l-2 border-gray-300">
                    Mens-domein heeft <strong className="not-italic font-semibold">80 betrokkenen</strong> in de
                    selectie: 47 actieve trainings-deelnemers + 12 trainers + 3 sectormanagers + 1 Manager
                    Klantcontact + 1 Teamleider Trainingen + ~16 stakeholders/begeleiders. De uren-tabel toont
                    de 64 personen met daadwerkelijke uren-belasting; de stakeholders staan in het &lsquo;Betrokken
                    stakeholders &amp; open beslispunten&rsquo;-blok onder dit scenario.
                  </p>
                  <div className="rounded border-l-4 border-[#003366] bg-[#003366]/[0.04] p-2.5 text-[11px] text-gray-700 leading-relaxed mb-3">
                    <p className="font-semibold text-[#003366] text-[10px] uppercase tracking-wider mb-1">
                      Lezing-C — waarom mens-totaal hoog lijkt
                    </p>
                    Mens is met ~{d.totaalUren.toLocaleString("nl-NL")}u het zwaarste domein, maar circa <strong className="text-[#003366]">~70% (~2.162u)</strong> bestaat uit cursist-contacttijd: 47 medewerkers × 46u outside-in-gespreksvaardigheidstraining over 2 blokken (Basis + Vaardigheid). Aftrekken cursisten: ~990u <strong>programma-organisatie-werk</strong> — in lijn met cultuur, data &amp; systemen en processen.
                  </div>
                </>
              )}
              {/* Categorie-groepsoverzicht — één lijst per categorie over hele looptijd
                  zodat trainings-deelnemers en geconsulteerden zichtbaar zijn,
                  ongeacht in welk jaar hun uren vallen. Per-jaar-detail blijft eronder. */}
              <CategorieGroepsoverzicht
                domeinBlok={d}
                selectiePerDomein={selectiePerDomein}
                lezingMarker={lezingMarker}
              />
              {/* Toggle voor de per-jaar-tabellen: 0u-rollen wel/niet tonen.
                  Default UIT — geconsulteerden met 0u in een jaar verschijnen
                  niet als "rommel" in dat jaar. */}
              <div className="flex items-center justify-between mb-2 px-1">
                <p className="text-[11px] uppercase tracking-wider font-bold text-gray-600">
                  Detail per jaar — {DOMEIN_LABELS[d.domein]} (alleen leider + kernteam)
                </p>
                <label className="flex items-center gap-1.5 text-[11px] text-gray-700 cursor-pointer select-none">
                  <input
                    type="checkbox"
                    checked={toonNulUrenInJaar}
                    onChange={(e) => setToonNulUrenInJaar(e.target.checked)}
                    className="cursor-pointer"
                  />
                  Toon ook leider/kernteam-rollen met 0u in dit jaar
                </label>
              </div>
              <p className="text-[10px] text-gray-500 italic leading-snug mb-2 pl-1">
                Trainings-deelnemers en geconsulteerden zijn samengevat in aparte overzichten onder deze per-jaar-tabel
                — gebruik het ⋯ actie-menu rechts in de rij om een rol naar een andere categorie te verplaatsen of helemaal
                uit de selectie te verwijderen.
              </p>
              <div className="space-y-3">
                {d.jaren.map((jr) => {
                  // Bepaal huidige leider-id in dit domein (voor disableLeider in menu).
                  const overridesDom = lezingMarker?.rolCategorieen?.[d.domein] ?? {};
                  let huidigeLeiderIdDom: string | null = null;
                  for (const [fId, c] of Object.entries(overridesDom)) {
                    if (c === "leider") { huidigeLeiderIdDom = fId; break; }
                  }
                  if (!huidigeLeiderIdDom) {
                    const seenL = new Set<string>();
                    for (const jr2 of d.jaren) {
                      for (const r2 of jr2.rollen) {
                        if (seenL.has(r2.functieId)) continue;
                        seenL.add(r2.functieId);
                        if (overridesDom[r2.functieId]) continue;
                        const sel2 = selectiePerDomein?.[d.domein]?.[r2.functieId];
                        const cat2 = bepaalLezingCCategorie(d.domein, r2.functieId, r2.functieNaam, sel2, lezingMarker, (r2 as { categorie?: string }).categorie);
                        if (cat2 === "leider") { huidigeLeiderIdDom = r2.functieId; break; }
                      }
                      if (huidigeLeiderIdDom) break;
                    }
                  }
                  // Per-jaar tabel toont enkel leider + kernteam.
                  // Trainings-deelnemers en geconsulteerden krijgen aparte
                  // overzichten verderop — voorkomt dat 65 cursisten per jaar
                  // herhaald worden in elk jaarblok.
                  const rollenFiltered = jr.rollen.filter((r) => {
                    const sel = selectiePerDomein?.[d.domein]?.[r.functieId];
                    const cat = bepaalLezingCCategorie(d.domein, r.functieId, r.functieNaam, sel, lezingMarker, (r as { categorie?: string }).categorie);
                    if (cat !== "leider" && cat !== "kernteam") return false;
                    if (toonNulUrenInJaar) return true;
                    if (sel?.stakeholder === true) return true;
                    return (r.uren ?? 0) > 0;
                  });
                  // Subtotaal alleen voor leider + kernteam in dit jaar.
                  const subtotaalUren = rollenFiltered.reduce((s, r) => s + (r.uren ?? 0), 0);
                  const subtotaalKosten = rollenFiltered.reduce((s, r) => s + (r.kosten ?? 0), 0);
                  return (
                  <div key={jr.jaar} className="bg-white border border-gray-200 rounded p-3">
                    <div className="flex items-center justify-between mb-2 gap-2 flex-wrap">
                      <div>
                        <p className="text-[10px] font-bold uppercase tracking-wider text-gray-500">{jr.jaar}</p>
                        <p className="text-sm text-gray-800">{jr.activiteit}</p>
                      </div>
                      <div className="text-right">
                        <p className="text-sm font-semibold text-gray-800">
                          {subtotaalUren.toLocaleString("nl-NL")} u
                          <span className="text-[10px] font-normal text-gray-500 ml-1">
                            (kernteam)
                          </span>
                        </p>
                        <p className="text-[11px] text-gray-500">€ {subtotaalKosten.toLocaleString("nl-NL")}</p>
                        <p className="text-[10px] text-gray-400 italic">
                          jaar-totaal incl. trainings/geconsulteerd: {jr.totaalUren.toLocaleString("nl-NL")} u
                        </p>
                      </div>
                    </div>
                    <table className="w-full text-xs">
                      <thead>
                        <tr className="text-left border-b border-gray-100">
                          <th className="py-1 font-semibold text-gray-500">Rol</th>
                          <th className="py-1 font-semibold text-gray-500 text-right">Aantal</th>
                          <th className="py-1 font-semibold text-gray-500 text-right">Uren</th>
                          <th className="py-1 font-semibold text-gray-500 text-right">€/u</th>
                          <th className="py-1 font-semibold text-gray-500 text-right">Kosten</th>
                          {(onRolVerwijderen || onCategorieChange) && (
                            <th className="py-1 font-semibold text-gray-500 text-right w-8" aria-label="Acties" />
                          )}
                        </tr>
                      </thead>
                      <tbody>
                        {rollenFiltered.length === 0 && (
                          <tr>
                            <td colSpan={(onRolVerwijderen || onCategorieChange) ? 6 : 5} className="py-2 text-[11px] text-gray-500 italic text-center">
                              Geen leider- of kernteam-rollen in dit jaar.
                            </td>
                          </tr>
                        )}
                        {rollenFiltered.map((r, i) => {
                          const sel = selectiePerDomein?.[d.domein]?.[r.functieId];
                          const aantal = sel?.aantal ?? 1;
                          const isStakeholder = sel?.stakeholder === true;
                          const stakeholderToel = sel?.stakeholderToelichting;
                          const isReview = sel?.reviewVereist === true;
                          const reviewVraag = sel?.reviewVraag;
                          const isNul = !isStakeholder && (r.uren ?? 0) === 0;
                          // Lezing-C categorie afleiden — leest eerst expliciete
                          // override uit interneUrenLezing.rolCategorieen, anders heuristiek.
                          const cat = bepaalLezingCCategorie(
                            d.domein,
                            r.functieId,
                            r.functieNaam,
                            sel,
                            lezingMarker,
                          );
                          // TBD-detectie op functienaam (placeholder rolnamen)
                          const naamLower = (r.functieNaam ?? "").toLowerCase();
                          const isTbd =
                            naamLower.includes("nader te bepalen") ||
                            naamLower.includes("nog te benoemen") ||
                            naamLower.includes("tbd");
                          // Actie-menu disabled-staat: stakeholder/review-rollen
                          // volgen automatisch 'geconsulteerd' — geen actie mogelijk.
                          const menuDisabled = isStakeholder || isReview;
                          const menuDisabledReden = isStakeholder
                            ? "Stakeholder-rol: categorie volgt automatisch 'geconsulteerd'"
                            : isReview
                              ? "Review-rol: categorie volgt automatisch 'geconsulteerd'"
                              : undefined;
                          return (
                            <tr
                              key={`${r.functieId}-${i}`}
                              className={`border-b border-gray-50 last:border-b-0 ${isNul ? "opacity-50" : ""}`}
                            >
                              <td className="py-1">
                                <div className="flex items-center gap-1.5 flex-wrap">
                                  {/* Categorie-pill — read-only; wijzigen gebeurt via
                                      het actie-menu (laatste kolom). Visuele
                                      consistentie met oude pill blijft behouden. */}
                                  <span
                                    className={`inline-block text-[9px] uppercase tracking-wider font-semibold px-1 py-0 rounded ${LEZING_C_CAT_KLEUR[cat]}`}
                                    title={`Lezing-C categorie: ${LEZING_C_CAT_LABEL[cat]} — wijzig via het ⋯ actie-menu`}
                                  >
                                    {LEZING_C_CAT_LABEL[cat]}
                                  </span>
                                  <span className="text-gray-800">{r.functieNaam}</span>
                                  {r.afdeling && <span className="text-[10px] text-gray-500">({r.afdeling})</span>}
                                  {isTbd && (
                                    <span className="inline-block text-[9px] uppercase tracking-wider font-bold text-amber-800 bg-amber-100 border border-amber-300 px-1 py-0 rounded">
                                      TBD
                                    </span>
                                  )}
                                </div>
                              </td>
                              <td className="py-1 text-right tabular-nums">
                                {isStakeholder ? (
                                  <span
                                    className="inline-block text-[10px] font-semibold uppercase tracking-wider text-purple-700 bg-purple-100 border border-purple-200 px-1.5 py-0.5 rounded"
                                    title={stakeholderToel ?? "Stakeholder (review/input, geen uren-belasting)"}
                                  >
                                    Stakeholder
                                  </span>
                                ) : isReview ? (
                                  <span
                                    className="inline-block text-[10px] font-semibold uppercase tracking-wider text-amber-800 bg-amber-100 border border-amber-300 px-1.5 py-0.5 rounded"
                                    title={reviewVraag ?? "Review nodig — handmatige beslissing nog open"}
                                  >
                                    Review nodig
                                  </span>
                                ) : (
                                  <span className="text-gray-700">{aantal}</span>
                                )}
                              </td>
                              <td className="py-1 text-right text-gray-800 tabular-nums">
                                {isStakeholder ? <span className="text-gray-400">—</span> : r.uren}
                              </td>
                              <td className="py-1 text-right text-gray-500 tabular-nums">€{r.uurtarief}</td>
                              <td className="py-1 text-right font-semibold text-gray-800 tabular-nums">€ {r.kosten.toLocaleString("nl-NL")}</td>
                              {(onRolVerwijderen || onCategorieChange) && (
                                <td className="py-1 text-right">
                                  <RolActieMenu
                                    huidigeCategorie={cat}
                                    onVerplaats={
                                      onCategorieChange
                                        ? (nieuweCat) =>
                                            void onCategorieChange(sv.key, d.domein, r.functieId, nieuweCat)
                                        : undefined
                                    }
                                    onVerwijder={
                                      onRolVerwijderen
                                        ? () => void onRolVerwijderen(d.domein, r.functieId)
                                        : undefined
                                    }
                                    disableLeider={
                                      huidigeLeiderIdDom !== null &&
                                      huidigeLeiderIdDom !== r.functieId
                                    }
                                    disabled={menuDisabled}
                                    disabledReden={menuDisabledReden}
                                  />
                                </td>
                              )}
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                  );
                })}
              </div>
              {/* Trainings-deelnemers — apart overzicht (vol-domein-overzicht) */}
              <BezettingTabel
                domeinBlok={d}
                categorie="trainings_deelnemer"
                selectiePerDomein={selectiePerDomein}
                lezingMarker={lezingMarker}
                begrotingAdvies={begrotingAdvies}
                scenarioKey={sv.key}
                onCategorieChange={onCategorieChange}
                onRolVerwijderen={onRolVerwijderen}
              />
              {/* Geconsulteerden — apart overzicht */}
              <BezettingTabel
                domeinBlok={d}
                categorie="geconsulteerd"
                selectiePerDomein={selectiePerDomein}
                lezingMarker={lezingMarker}
                begrotingAdvies={begrotingAdvies}
                scenarioKey={sv.key}
                onCategorieChange={onCategorieChange}
                onRolVerwijderen={onRolVerwijderen}
              />
            </div>
          );
        })}
      </div>

      {/* Betrokken stakeholders & open beslispunten — apart sub-blok per scenario */}
      <StakeholdersBeslispuntenBlok
        selectiePerDomein={selectiePerDomein}
        customFunctiesPerDomein={customFunctiesPerDomein}
      />

      {/* Modal — Functie toevoegen aan domein */}
      {modalDomein && onFunctieToevoegen && (() => {
        const fasesUniek = bepaalUniekeFasesGeunificeerd(begrotingAdvies, modalDomein);
        // Vind huidige leider in dit domein op basis van scenario s + lezingMarker
        const dBlok = s.domeinen.find((d) => d.domein === modalDomein);
        let huidigeLeider: string | null = null;
        if (dBlok) {
          const overrides = lezingMarker?.rolCategorieen?.[modalDomein] ?? {};
          for (const [fId, c] of Object.entries(overrides)) {
            if (c === "leider") { huidigeLeider = fId; break; }
          }
          if (!huidigeLeider) {
            const seen = new Set<string>();
            for (const jr of dBlok.jaren) {
              for (const r of jr.rollen) {
                if (seen.has(r.functieId)) continue;
                seen.add(r.functieId);
                if (overrides[r.functieId]) continue;
                const sel = selectiePerDomein?.[modalDomein]?.[r.functieId];
                const cat = bepaalLezingCCategorie(modalDomein, r.functieId, r.functieNaam, sel, lezingMarker, (r as { categorie?: string }).categorie);
                if (cat === "leider") { huidigeLeider = r.functieId; break; }
              }
              if (huidigeLeider) break;
            }
          }
        }
        return (
          <FunctieToevoegenModal
            domein={modalDomein}
            selectiePerDomein={selectiePerDomein ?? { cultuur: {}, mens: {}, data_systemen: {}, processen: {} }}
            customFunctiesPerDomein={customFunctiesPerDomein ?? { cultuur: [], mens: [], data_systemen: [], processen: [] }}
            fases={fasesUniek}
            huidigeLeiderFunctieId={huidigeLeider}
            onClose={() => setModalDomein(null)}
            onSubmit={async (input) => {
              await onFunctieToevoegen({ domein: modalDomein, ...input });
              setModalDomein(null);
            }}
          />
        );
      })()}
    </div>
  );
}

// ----------------------------------------------------------------------------
// BezettingTabel — apart overzicht per categorie (trainings-deelnemer of
// geconsulteerd) per domein. Aggregreert rollen over hele scenario-looptijd
// zodat niet 65 trainings-cursisten in elk jaarblok herhaald worden.
//   Kolommen: Rol | Aantal | Totaal uren | Detail-tekst (fase + jaar) |
//             ⋯ actie-menu (RolActieMenu — verplaats + verwijder gegroepeerd)
// Detail-tekst leest fase-string per jaar uit begrotingAdvies (bv.
//   "24u Basis-jr 2027 + 22u Vaardigheid-jr 2028") of fallback op jaar-totaal.
// ----------------------------------------------------------------------------
function BezettingTabel({
  domeinBlok,
  categorie,
  selectiePerDomein,
  lezingMarker,
  begrotingAdvies,
  scenarioKey,
  onCategorieChange,
  onRolVerwijderen,
}: {
  domeinBlok: DomeinBlok;
  categorie: Extract<LezingCCat, "trainings_deelnemer" | "geconsulteerd">;
  selectiePerDomein?: Record<Domein, Record<string, FunctieInput>>;
  lezingMarker?: InterneUrenLezingMarker;
  begrotingAdvies?: BegrotingAdviesMin;
  scenarioKey: ScenarioLabel;
  onCategorieChange?: (
    scenarioKey: ScenarioLabel,
    domein: Domein,
    functieId: string,
    nieuweCategorie: LezingCCat,
  ) => Promise<void> | void;
  onRolVerwijderen?: (domein: Domein, functieId: string) => Promise<void> | void;
}): React.ReactElement | null {
  // 1. Aggregeer rollen over alle jaren in dit domein, alleen voor de gevraagde categorie
  type AggRol = {
    functieId: string;
    functieNaam: string;
    afdeling?: string;
    aantal: number;
    totaalUren: number;
    perJaar: Array<{ jaar: number; uren: number; activiteit: string }>;
  };
  const perFunctie = new Map<string, AggRol>();
  for (const jr of domeinBlok.jaren) {
    for (const r of jr.rollen) {
      const sel = selectiePerDomein?.[domeinBlok.domein]?.[r.functieId];
      const cat = bepaalLezingCCategorie(domeinBlok.domein, r.functieId, r.functieNaam, sel, lezingMarker, (r as { categorie?: string }).categorie);
      if (cat !== categorie) continue;
      const cur = perFunctie.get(r.functieId) ?? {
        functieId: r.functieId,
        functieNaam: r.functieNaam,
        afdeling: r.afdeling,
        aantal: sel?.aantal ?? 1,
        totaalUren: 0,
        perJaar: [],
      };
      cur.totaalUren += r.uren ?? 0;
      if ((r.uren ?? 0) > 0) {
        cur.perJaar.push({ jaar: jr.jaar, uren: r.uren, activiteit: jr.activiteit });
      }
      perFunctie.set(r.functieId, cur);
    }
  }
  const rollen = Array.from(perFunctie.values()).sort((a, b) => b.totaalUren - a.totaalUren);
  if (rollen.length === 0) return null;

  // 2. Bouw per-rol detail-tekst uit begroting (fase-string per jaar)
  const begrotingScen = begrotingAdvies?.scenarios?.[scenarioKey] ?? null;
  function bouwDetailTekst(rol: AggRol): string {
    if (rol.perJaar.length === 0) return "Geen actieve uren";
    // Probeer per jaar de dominante fase-string uit de begroting te halen
    // (eerste fase met euro > 0 op dit domein in dit jaar).
    const segments: string[] = [];
    for (const j of rol.perJaar) {
      let faseLabel = "";
      if (begrotingScen?.inspanningen) {
        // Verzamel fases voor dit jaar in dit domein, sorteer op euro-aandeel desc
        const faseMap = new Map<string, number>();
        for (const i of begrotingScen.inspanningen) {
          if (i.domein !== domeinBlok.domein) continue;
          for (const v of i.verdelingPerJaar ?? []) {
            if (v.jaar !== j.jaar) continue;
            const fs = (v.fase ?? "").trim();
            if (!fs) continue;
            faseMap.set(fs, (faseMap.get(fs) ?? 0) + (v.euro ?? 0));
          }
        }
        const sorted = Array.from(faseMap.entries()).sort((a, b) => b[1] - a[1]);
        if (sorted.length > 0) {
          // Korte fase-aanduiding: eerste woord met hoofdletter
          const raw = sorted[0][0];
          const woord = raw.split(/[\s\-]/)[0] ?? raw;
          faseLabel = woord.charAt(0).toUpperCase() + woord.slice(1).toLowerCase();
        }
      }
      if (faseLabel) {
        segments.push(`${j.uren}u ${faseLabel} ${j.jaar}`);
      } else {
        segments.push(`${j.uren}u in ${j.jaar}`);
      }
    }
    return segments.join(" + ");
  }

  const totaalAantal = rollen.reduce((s, r) => s + r.aantal, 0);
  const totaalUren = rollen.reduce((s, r) => s + r.totaalUren, 0);
  const aantalJaren = domeinBlok.jaren.length;
  const headerLabel =
    categorie === "trainings_deelnemer" ? "Trainings-deelnemers" : "Geconsulteerden";
  const headerSub =
    categorie === "trainings_deelnemer"
      ? "Eindgebruikers die training volgen — pure contacttijd, geen kernteam-rol."
      : "Leveren incidenteel input/review op kritische momenten — geen continue belasting.";
  const blokKleur =
    categorie === "trainings_deelnemer"
      ? "border-emerald-200 bg-emerald-50/40"
      : "border-gray-200 bg-gray-50";
  const chipKleur =
    categorie === "trainings_deelnemer"
      ? "bg-emerald-500 text-white"
      : "bg-gray-500 text-white";

  return (
    <div className={`mt-3 rounded-lg border-2 ${blokKleur} overflow-hidden`}>
      <div className="px-3 py-2 border-b border-gray-200 bg-white/60 flex items-baseline justify-between gap-2 flex-wrap">
        <div className="flex items-baseline gap-2 flex-wrap">
          <span className={`text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded ${chipKleur}`}>
            {headerLabel}
          </span>
          <p className="text-xs font-semibold text-gray-800">
            {rollen.length} rol{rollen.length === 1 ? "" : "len"} · {totaalAantal} {totaalAantal === 1 ? "persoon" : "personen"}
          </p>
          <p className="text-[11px] font-mono tabular-nums text-gray-700">
            {totaalUren.toLocaleString("nl-NL")}u over {aantalJaren}j
          </p>
        </div>
        <p className="text-[10px] italic text-gray-600 max-w-md">{headerSub}</p>
      </div>
      <div className="p-2">
        {(() => {
          // Bepaal huidige leider-id in dit domein (voor disableLeider in menu)
          const overridesDom = lezingMarker?.rolCategorieen?.[domeinBlok.domein] ?? {};
          let huidigeLeiderIdDom: string | null = null;
          for (const [fId, c] of Object.entries(overridesDom)) {
            if (c === "leider") { huidigeLeiderIdDom = fId; break; }
          }
          if (!huidigeLeiderIdDom) {
            const seenL = new Set<string>();
            for (const jr2 of domeinBlok.jaren) {
              for (const r2 of jr2.rollen) {
                if (seenL.has(r2.functieId)) continue;
                seenL.add(r2.functieId);
                if (overridesDom[r2.functieId]) continue;
                const sel2 = selectiePerDomein?.[domeinBlok.domein]?.[r2.functieId];
                const cat2 = bepaalLezingCCategorie(domeinBlok.domein, r2.functieId, r2.functieNaam, sel2, lezingMarker, (r2 as { categorie?: string }).categorie);
                if (cat2 === "leider") { huidigeLeiderIdDom = r2.functieId; break; }
              }
              if (huidigeLeiderIdDom) break;
            }
          }
          return (
            <table className="w-full text-xs">
              <thead>
                <tr className="text-left border-b border-gray-200">
                  <th className="py-1 px-2 font-semibold text-gray-500">Rol</th>
                  <th className="py-1 px-2 font-semibold text-gray-500 text-right w-16">Aantal</th>
                  <th className="py-1 px-2 font-semibold text-gray-500 text-right w-28">Totaal uren</th>
                  <th className="py-1 px-2 font-semibold text-gray-500">Toelichting</th>
                  {(onCategorieChange || onRolVerwijderen) && (
                    <th className="py-1 px-2 font-semibold text-gray-500 w-8" aria-label="Acties" />
                  )}
                </tr>
              </thead>
              <tbody>
                {rollen.map((r) => {
                  const detail = bouwDetailTekst(r);
                  return (
                    <tr key={r.functieId} className="border-b border-gray-100 last:border-b-0 align-top">
                      <td className="py-1.5 px-2">
                        <p className="text-gray-900 font-medium leading-snug">{r.functieNaam}</p>
                        {r.afdeling && (
                          <p className="text-[10px] text-gray-500 leading-tight">{r.afdeling}</p>
                        )}
                      </td>
                      <td className="py-1.5 px-2 text-right tabular-nums text-gray-800">{r.aantal}</td>
                      <td className="py-1.5 px-2 text-right tabular-nums font-semibold text-gray-800">
                        {r.totaalUren.toLocaleString("nl-NL")}u
                        <span className="block text-[10px] font-normal text-gray-500">over {r.perJaar.length}j</span>
                      </td>
                      <td className="py-1.5 px-2 text-[11px] text-gray-700 italic leading-snug">{detail}</td>
                      {(onCategorieChange || onRolVerwijderen) && (
                        <td className="py-1.5 px-2 text-right">
                          <RolActieMenu
                            huidigeCategorie={categorie}
                            onVerplaats={
                              onCategorieChange
                                ? (nieuweCat) =>
                                    void onCategorieChange(scenarioKey, domeinBlok.domein, r.functieId, nieuweCat)
                                : undefined
                            }
                            onVerwijder={
                              onRolVerwijderen
                                ? () => void onRolVerwijderen(domeinBlok.domein, r.functieId)
                                : undefined
                            }
                            disableLeider={
                              huidigeLeiderIdDom !== null &&
                              huidigeLeiderIdDom !== r.functieId
                            }
                          />
                        </td>
                      )}
                    </tr>
                  );
                })}
              </tbody>
            </table>
          );
        })()}
      </div>
    </div>
  );
}

// ----------------------------------------------------------------------------
// ProgrammaLijnBlok — programma / lijn / raadplegen-uitsplitsing per scenario
// Interpretatie B: drie aparte uren-types per persoon naast elkaar.
// Toont: 3 hoofdgetal-kaarten + per-domein gestapelde bar (3 segmenten) +
// collapsible uitleg. Stijl consistent met SectieF in BerekeningenStep.
// Raadplegen-kleur: paars (consistent met domain data_systemen kleur is OK
// omdat raadplegen niet domein-gebonden is — kies een neutraal paars).
// ----------------------------------------------------------------------------
const RAADPLEGEN_HEX = "#7c3aed";

function ProgrammaLijnBlok({ s }: { s: ScenarioBlok }): React.ReactElement {
  // Resolve programma/lijn/raadplegen per domein — gebruik gezette waarden
  // (door interpretatie-b-driedeling.ts) of val terug op default-pct.
  const domeinUitsplitsing = s.domeinen.map((d) => {
    const heeftDriedeling =
      typeof d.programmaUren === "number" || typeof d.lijnUren === "number";
    let programmaUren: number;
    let lijnUren: number;
    let raadplegenUren: number;
    if (heeftDriedeling) {
      programmaUren = d.programmaUren ?? 0;
      lijnUren = d.lijnUren ?? 0;
      raadplegenUren = d.raadplegenUren ?? 0;
    } else {
      const pct =
        typeof d.programmaPct === "number" && d.programmaPct >= 0 && d.programmaPct <= 1
          ? d.programmaPct
          : PROGRAMMA_PCT_DEFAULT[d.domein] ?? 0.75;
      programmaUren = Math.round(d.totaalUren * pct);
      lijnUren = Math.round(d.totaalUren * (1 - pct));
      raadplegenUren = 0;
    }
    return {
      domein: d.domein,
      totaalUren: d.totaalUren,
      programmaUren,
      lijnUren,
      raadplegenUren,
    };
  });

  // Top-niveau totalen — gebruik scenario-niveau-getallen als beschikbaar,
  // anders som van per-domein.
  const totaalUren = s.totaalUren;
  const programmaTotaal =
    typeof s.programmaUren === "number"
      ? s.programmaUren
      : domeinUitsplitsing.reduce((acc, d) => acc + d.programmaUren, 0);
  const lijnTotaal =
    typeof s.lijnUren === "number"
      ? s.lijnUren
      : domeinUitsplitsing.reduce((acc, d) => acc + d.lijnUren, 0);
  const raadplegenTotaal =
    typeof s.raadplegenUren === "number"
      ? s.raadplegenUren
      : domeinUitsplitsing.reduce((acc, d) => acc + d.raadplegenUren, 0);
  const programmaPctTot =
    totaalUren > 0 ? Math.round((programmaTotaal / totaalUren) * 100) : 0;
  const lijnPctTot = totaalUren > 0 ? Math.round((lijnTotaal / totaalUren) * 100) : 0;
  const raadplegenPctTot =
    totaalUren > 0 ? Math.round((raadplegenTotaal / totaalUren) * 100) : 0;

  // Voor de bar: lengte-schaal = scenario-totaal (zo zie je dat data_systemen het grootst is, etc.)
  const maxDomeinUren = domeinUitsplitsing.reduce((m, d) => Math.max(m, d.totaalUren), 0);

  // Sorteer op vaste volgorde (data_systemen, mens, cultuur, processen)
  const sortedDom = [...domeinUitsplitsing].sort(
    (a, b) =>
      PROGLIJN_DOMEIN_VOLGORDE.indexOf(a.domein) - PROGLIJN_DOMEIN_VOLGORDE.indexOf(b.domein),
  );

  return (
    <div className="rounded-lg border border-gray-200 bg-white overflow-hidden">
      <div className="px-4 py-2.5 border-b border-gray-100 bg-gray-50">
        <p className="text-[11px] uppercase tracking-wider font-bold text-gray-600">
          Programma · Lijn · Raadplegen — driedeling capaciteitsbelasting
        </p>
        <p className="text-[11px] text-gray-500 mt-0.5 leading-snug">
          Drie uren-types naast elkaar (interpretatie B). <strong>Programma</strong>:
          écht extra te financieren capaciteit. <strong>Lijn</strong>: functieprofiel /
          L&amp;D-budget / bestaande cyclus. <strong>Raadplegen</strong>: incidentele
          consultatie van geconsulteerden — valt buiten programma- en lijn-toewijzing.
        </p>
      </div>

      <div className="p-3 space-y-3">
        {/* 1. Drie hoofdgetal-kaarten — Programma / Lijn / Raadplegen */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
          <ProgLijnKaart
            label="Programma — extra te financieren capaciteit"
            waarde={programmaTotaal}
            sub={`${programmaPctTot}% van totaal (${totaalUren.toLocaleString("nl-NL")}u over ${s.aantalJaren} jaar)`}
            accent="bg-[#003366]"
          />
          <ProgLijnKaart
            label="Lijn — functieprofielen / L&D-budget / bestaande cyclus"
            waarde={lijnTotaal}
            sub={`${lijnPctTot}% van totaal`}
            accent="bg-gray-600"
          />
          <ProgLijnKaart
            label="Raadplegen — incidentele consultatie geconsulteerden"
            waarde={raadplegenTotaal}
            sub={`${raadplegenPctTot}% van totaal — eigen categorie naast programma/lijn`}
            accent="bg-purple-700"
          />
        </div>

        {/* 2. Per-domein gestapelde bar — drie segmenten:
              programma in domein-kleur (vol), lijn in lichte tint van domein-kleur,
              raadplegen in paars-overlay (consistent met raadplegen-kaart). */}
        <div className="space-y-1.5">
          {sortedDom.map((d) => {
            const hex = DOMAIN_BAR_HEX[d.domein] ?? "#6b7280";
            const w = maxDomeinUren > 0 ? (d.totaalUren / maxDomeinUren) * 100 : 0;
            const programmaBarPct =
              d.totaalUren > 0 ? (d.programmaUren / d.totaalUren) * 100 : 0;
            const lijnBarPct =
              d.totaalUren > 0 ? (d.lijnUren / d.totaalUren) * 100 : 0;
            const raadpBarPct = Math.max(0, 100 - programmaBarPct - lijnBarPct);
            const programmaPct =
              d.totaalUren > 0 ? Math.round((d.programmaUren / d.totaalUren) * 100) : 0;
            const raadpPct =
              d.totaalUren > 0 ? Math.round((d.raadplegenUren / d.totaalUren) * 100) : 0;
            return (
              <div key={d.domein} className="flex items-center gap-2 text-[11px]">
                <span className="w-28 shrink-0 font-semibold text-gray-800">
                  {DOMEIN_LABELS[d.domein]}
                </span>
                <div
                  className="flex-1 h-4 rounded bg-gray-100 overflow-hidden"
                  style={{ maxWidth: `${Math.max(0.5, w)}%` }}
                  title={`${DOMEIN_LABELS[d.domein]}: programma ${d.programmaUren}u (${programmaPct}%) · lijn ${d.lijnUren}u (${Math.round(lijnBarPct)}%) · raadplegen ${d.raadplegenUren}u (${raadpPct}%)`}
                >
                  <div className="flex h-full w-full">
                    <div
                      className="h-full"
                      style={{
                        width: `${programmaBarPct}%`,
                        backgroundColor: hex,
                      }}
                    />
                    <div
                      className="h-full"
                      style={{
                        width: `${lijnBarPct}%`,
                        backgroundColor: hex,
                        opacity: 0.25,
                      }}
                    />
                    <div
                      className="h-full"
                      style={{
                        width: `${raadpBarPct}%`,
                        backgroundColor: RAADPLEGEN_HEX,
                      }}
                    />
                  </div>
                </div>
                <span className="shrink-0 tabular-nums font-mono text-gray-700">
                  {d.totaalUren.toLocaleString("nl-NL")}u
                </span>
                <span className="shrink-0 text-gray-500 w-32 text-right">
                  ({programmaPct}% prog · {raadpPct}% raadpl)
                </span>
              </div>
            );
          })}
        </div>
        <p className="text-[10px] text-gray-500 italic leading-snug pl-2 border-l-2 border-purple-300">
          Raadplegen-uren = incidentele consultatie, valt buiten programma- en lijn-toewijzing.
          Geconsulteerden tellen volledig (100%) als raadplegen.
        </p>

        {/* 3. Collapsible toelichting "Wat is lijn vs programma?" */}
        <details className="rounded border border-gray-200 bg-gray-50 overflow-hidden">
          <summary className="cursor-pointer px-3 py-2 text-[11px] font-semibold text-[#003366] hover:bg-gray-100 flex items-center justify-between">
            <span>Wat is lijn vs programma?</span>
            <span className="text-[10px] text-gray-500 font-normal">
              klik voor uitleg + per-domein-voorbeelden
            </span>
          </summary>
          <div className="px-3 pb-3 pt-2 text-[11px] text-gray-700 leading-relaxed space-y-2 border-t border-gray-200">
            <div>
              <p className="font-semibold text-gray-800 mb-1">
                Lijn-criterium — werk valt in lijn als het voldoet aan minstens één:
              </p>
              <ol className="list-decimal pl-5 space-y-0.5">
                <li>
                  <strong>Functieprofiel-werk</strong> — vaste taak in functiebeschrijving
                  (bv. Procesmanager K&amp;M doet vanaf 2029 doorlopend proceseigenaarschap).
                </li>
                <li>
                  <strong>Bestaand budget</strong> — al jaarlijks gereserveerd (bv. 47
                  klantenservice-medewerkers × ~16u/jr L&amp;D-tijd zit in opleidingsplan
                  Klantcontact).
                </li>
                <li>
                  <strong>Bestaande cyclus</strong> — al ingeplande overleg-/governance-momenten
                  (bv. MT-cyclus + stuurgroep).
                </li>
              </ol>
            </div>
            <div>
              <p className="font-semibold text-gray-800 mb-1">Programma-criterium:</p>
              <p>
                Werk dat <strong>eenmalig &amp; nieuw</strong> is, <strong>specifieke nieuwe
                kennis</strong> vraagt, of <strong>bovenop</strong> bestaande tijd komt.
              </p>
            </div>
            <div>
              <p className="font-semibold text-gray-800 mb-1">Per-domein — waarom dit lijn-aandeel:</p>
              <ul className="space-y-0.5">
                {sortedDom.map((d) => {
                  const hex = DOMAIN_BAR_HEX[d.domein] ?? "#6b7280";
                  return (
                    <li key={d.domein} className="flex items-start gap-1.5">
                      <span
                        className="inline-block w-2 h-2 rounded-full mt-1 shrink-0"
                        style={{ backgroundColor: hex }}
                      />
                      <span>
                        <strong>{DOMEIN_LABELS[d.domein]}</strong>:{" "}
                        {DOMAIN_LIJN_VOORBEELD[d.domein] ??
                          "lijn-aandeel volgt uit bestaande functieprofielen."}
                      </span>
                    </li>
                  );
                })}
              </ul>
            </div>
          </div>
        </details>
      </div>
    </div>
  );
}

// Compacte 1-regel-kaart voor totaal/programma/lijn — same look-and-feel als KengetalKaart in SectieF
function ProgLijnKaart({
  label,
  waarde,
  sub,
  accent,
}: {
  label: string;
  waarde: number;
  sub: string;
  accent: string;
}): React.ReactElement {
  return (
    <div className="rounded border border-gray-200 bg-white overflow-hidden">
      <div
        className={`${accent} text-white text-[9px] uppercase tracking-wider font-bold px-2 py-1 leading-tight`}
      >
        {label}
      </div>
      <div className="px-2 py-2">
        <p className="text-lg font-bold text-gray-900 font-mono tabular-nums leading-tight">
          {waarde.toLocaleString("nl-NL")}
          <span className="text-xs font-normal text-gray-500 ml-1">u</span>
        </p>
        <p className="text-[10px] text-gray-600 mt-0.5 leading-snug">{sub}</p>
      </div>
    </div>
  );
}

// ────────────────────────────────────────────────────────────────────────────
// FunctieToevoegenModal — modal om een extra functie aan een domein toe te
// voegen (Stap 7). User kiest functie (cito of custom), aantal personen,
// categorie en in welke fase(s) die actief is. Bij save wordt:
//   • selectiePerDomein[domein] uitgebreid (en customFunctiesPerDomein
//     bij eigen functie)
//   • per scenario per jaar een rol-record toegevoegd, alleen jaren met
//     één van de aangevinkte fases krijgen uren > 0
// ────────────────────────────────────────────────────────────────────────────
function FunctieToevoegenModal({
  domein,
  selectiePerDomein,
  customFunctiesPerDomein,
  fases,
  huidigeLeiderFunctieId,
  onClose,
  onSubmit,
}: {
  domein: Domein;
  selectiePerDomein: Record<Domein, Record<string, FunctieInput>>;
  customFunctiesPerDomein: Record<Domein, CustomFunctie[]>;
  fases: FaseInfo[];
  huidigeLeiderFunctieId: string | null;
  onClose: () => void;
  onSubmit: (input: {
    functieId: string;
    functieNaam: string;
    afdeling?: string;
    schaal?: number;
    isCustom: boolean;
    aantal: number;
    categorie: LezingCCat;
    actieveFases: string[];
    onderbouwing?: string;
  }) => Promise<void> | void;
}): React.ReactElement {
  const [bron, setBron] = useState<"cito" | "custom">("cito");
  const [zoek, setZoek] = useState("");
  const [gekozenFunctieId, setGekozenFunctieId] = useState<string>("");
  const [customNaam, setCustomNaam] = useState("");
  const [customSchaal, setCustomSchaal] = useState("");
  const [aantal, setAantal] = useState<number>(1);
  const [categorie, setCategorie] = useState<LezingCCat>("kernteam");
  const [actieveFases, setActieveFases] = useState<string[]>(() =>
    defaultActieveFases("kernteam", domein, fases),
  );
  const [onderbouwing, setOnderbouwing] = useState("");
  const [bezig, setBezig] = useState(false);

  // Hercalculeer default-fases bij categorie-wijziging — alleen als gebruiker
  // niet al expliciet handmatig aangepast heeft. Simpel: reset altijd op cat-wissel.
  function handleCategorieWissel(nieuw: LezingCCat) {
    setCategorie(nieuw);
    setActieveFases(defaultActieveFases(nieuw, domein, fases));
  }

  // Lijst van Cito-functies, gefilterd op (a) niet al geselecteerd in dit
  // domein, (b) zoekstring match. We tonen ook functies waarvan
  // inspanningRelevantie dit domein NIET bevat — gebruiker mag manueel kiezen.
  const beschikbareCitoFuncties = CITO_FUNCTIES.filter((f) => {
    if (f.id in selectiePerDomein[domein]) return false;
    if (zoek.trim().length > 0) {
      const q = zoek.trim().toLowerCase();
      if (!f.naam.toLowerCase().includes(q) && !f.afdeling.toLowerCase().includes(q)) return false;
    }
    return true;
  });

  // Validatie
  const heeftFunctie =
    bron === "cito" ? gekozenFunctieId.length > 0 : customNaam.trim().length > 0;
  const heeftFases = actieveFases.length > 0;
  const aantalOk = aantal >= 1;
  const dubbeleLeider =
    categorie === "leider" &&
    huidigeLeiderFunctieId !== null &&
    (bron === "custom" || huidigeLeiderFunctieId !== gekozenFunctieId);
  const customDubbel =
    bron === "custom" &&
    customNaam.trim().length > 0 &&
    customFunctiesPerDomein[domein].some((c) => c.naam.toLowerCase() === customNaam.trim().toLowerCase());

  const kanOpslaan = heeftFunctie && heeftFases && aantalOk && !dubbeleLeider && !customDubbel && !bezig;

  async function handleSave() {
    if (!kanOpslaan) return;
    setBezig(true);
    try {
      if (bron === "cito") {
        const f = CITO_FUNCTIES.find((x) => x.id === gekozenFunctieId);
        if (!f) {
          setBezig(false);
          return;
        }
        await onSubmit({
          functieId: f.id,
          functieNaam: f.naam,
          afdeling: f.afdeling,
          schaal: f.schaal,
          isCustom: false,
          aantal,
          categorie,
          actieveFases,
          onderbouwing: onderbouwing.trim() || undefined,
        });
      } else {
        const naam = customNaam.trim();
        const slug = naam
          .toLowerCase()
          .replace(/[^a-z0-9]+/g, "-")
          .replace(/^-+|-+$/g, "")
          .slice(0, 30);
        const id = `custom-${slug || "rol"}-${Date.now()}`;
        const schaalNum = customSchaal.trim() ? Number(customSchaal) : undefined;
        await onSubmit({
          functieId: id,
          functieNaam: naam,
          afdeling: "Custom",
          schaal: Number.isFinite(schaalNum) ? (schaalNum as number) : undefined,
          isCustom: true,
          aantal,
          categorie,
          actieveFases,
          onderbouwing: onderbouwing.trim() || undefined,
        });
      }
    } finally {
      setBezig(false);
    }
  }

  return (
    <div
      className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4"
      onClick={() => !bezig && onClose()}
    >
      <div
        className="bg-white rounded-lg shadow-2xl max-w-2xl w-full max-h-[92vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="p-5 border-b border-gray-200 sticky top-0 bg-white z-10">
          <div className="flex items-center justify-between gap-2">
            <div>
              <h3 className="text-lg font-semibold text-[#003366]">
                Functie toevoegen aan {DOMEIN_LABELS[domein]}
              </h3>
              <p className="text-xs text-gray-600 mt-1">
                Voeg een extra functie toe aan dit domein. Uren worden automatisch berekend op basis van categorie + gekozen fase(s).
              </p>
            </div>
            <button
              onClick={onClose}
              disabled={bezig}
              className="text-gray-400 hover:text-gray-700 text-2xl leading-none px-2 disabled:opacity-50"
            >
              ×
            </button>
          </div>
        </div>

        <div className="p-5 space-y-5">
          {/* 1. Functie kiezen */}
          <div>
            <label className="text-[11px] font-semibold text-gray-700 uppercase tracking-wider">
              1. Functie
            </label>
            <div className="flex gap-2 mt-2 mb-2">
              <button
                onClick={() => setBron("cito")}
                className={`text-xs px-3 py-1.5 rounded border font-medium ${bron === "cito" ? "bg-[#003366] text-white border-[#003366]" : "bg-white text-gray-700 border-gray-300 hover:bg-gray-50"}`}
              >
                Cito-functie
              </button>
              <button
                onClick={() => setBron("custom")}
                className={`text-xs px-3 py-1.5 rounded border font-medium ${bron === "custom" ? "bg-[#003366] text-white border-[#003366]" : "bg-white text-gray-700 border-gray-300 hover:bg-gray-50"}`}
              >
                Eigen functie
              </button>
            </div>
            {bron === "cito" ? (
              <>
                <input
                  type="text"
                  value={zoek}
                  onChange={(e) => setZoek(e.target.value)}
                  placeholder="Zoek in functienaam of afdeling..."
                  className="w-full px-3 py-2 text-sm border border-gray-300 rounded mb-2 focus:outline-none focus:ring-2 focus:ring-[#003366]"
                />
                <select
                  value={gekozenFunctieId}
                  onChange={(e) => setGekozenFunctieId(e.target.value)}
                  className="w-full px-3 py-2 text-sm border border-gray-300 rounded bg-white focus:outline-none focus:ring-2 focus:ring-[#003366]"
                  size={Math.min(8, Math.max(3, beschikbareCitoFuncties.length))}
                >
                  {beschikbareCitoFuncties.length === 0 ? (
                    <option disabled>Geen functies beschikbaar (alle al geselecteerd of zoekfilter te streng)</option>
                  ) : (
                    beschikbareCitoFuncties.map((f) => (
                      <option key={f.id} value={f.id}>
                        {f.naam} (schaal {f.schaal}) — {f.afdeling}
                      </option>
                    ))
                  )}
                </select>
              </>
            ) : (
              <div className="space-y-2">
                <input
                  type="text"
                  value={customNaam}
                  onChange={(e) => setCustomNaam(e.target.value)}
                  placeholder="Functienaam (bijv. 'Programma-secretaris')"
                  className="w-full px-3 py-2 text-sm border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-[#003366]"
                />
                <input
                  type="number"
                  value={customSchaal}
                  onChange={(e) => setCustomSchaal(e.target.value)}
                  placeholder="Schaal (optioneel)"
                  className="w-32 px-3 py-2 text-sm border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-[#003366]"
                />
                {customDubbel && (
                  <p className="text-[11px] text-amber-700">
                    ⚠ Een eigen functie met deze naam bestaat al in dit domein.
                  </p>
                )}
              </div>
            )}
          </div>

          {/* 2. Aantal */}
          <div>
            <label className="text-[11px] font-semibold text-gray-700 uppercase tracking-wider">
              2. Aantal personen
            </label>
            <input
              type="number"
              min={1}
              max={50}
              value={aantal}
              onChange={(e) => setAantal(Math.max(1, Math.min(50, Math.floor(Number(e.target.value) || 1))))}
              className="w-32 mt-1 px-3 py-2 text-sm border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-[#003366]"
            />
          </div>

          {/* 3. Categorie */}
          <div>
            <label className="text-[11px] font-semibold text-gray-700 uppercase tracking-wider">
              3. Categorie
            </label>
            <select
              value={categorie}
              onChange={(e) => handleCategorieWissel((normaliseerCategorie(e.target.value) ?? "kernteam") as LezingCCat)}
              className="w-full mt-1 px-3 py-2 text-sm border border-gray-300 rounded bg-white focus:outline-none focus:ring-2 focus:ring-[#003366]"
            >
              {(["leider", "kernteam", "trainings_deelnemer", "geconsulteerd"] as LezingCCat[]).map((c) => (
                <option key={c} value={c}>
                  {LEZING_C_CAT_LABEL[c]}
                </option>
              ))}
            </select>
            <p className="text-[10px] text-gray-500 mt-1 italic leading-snug">
              {CATEGORIE_UITLEG[categorie]}
            </p>
            {dubbeleLeider && (
              <p className="text-[11px] text-amber-700 mt-1">
                ⚠ Er is al een leider in {DOMEIN_LABELS[domein]}. Wijzig eerst die rol naar een andere categorie voordat je een nieuwe leider aanwijst.
              </p>
            )}
          </div>

          {/* 4. Actieve fases */}
          <div>
            <label className="text-[11px] font-semibold text-gray-700 uppercase tracking-wider">
              4. Actieve fase(s)
            </label>
            <p className="text-[10px] text-gray-500 mt-0.5 mb-2">
              Vink aan in welke fases deze functie uren krijgt. Standaard ingesteld op basis van categorie en domein.
            </p>
            {fases.length === 0 ? (
              <p className="text-xs text-gray-500 italic">
                Geen fases gevonden in begroting voor dit domein.
              </p>
            ) : (
              <div className="space-y-1 max-h-48 overflow-y-auto border border-gray-200 rounded p-2 bg-gray-50">
                {fases.map((f) => {
                  const checked = actieveFases.includes(f.fase);
                  return (
                    <label
                      key={f.fase}
                      className="flex items-center gap-2 text-xs cursor-pointer hover:bg-white px-1 py-0.5 rounded"
                    >
                      <input
                        type="checkbox"
                        checked={checked}
                        onChange={(e) => {
                          setActieveFases((prev) =>
                            e.target.checked
                              ? [...prev, f.fase]
                              : prev.filter((x) => x !== f.fase),
                          );
                        }}
                      />
                      <span className="text-gray-800">{f.fase}</span>
                      <span className="text-[10px] text-gray-500">({f.faseType})</span>
                    </label>
                  );
                })}
              </div>
            )}
            {!heeftFases && fases.length > 0 && (
              <p className="text-[11px] text-amber-700 mt-1">⚠ Selecteer minstens één fase.</p>
            )}
          </div>

          {/* 5. Onderbouwing (optioneel) */}
          <div>
            <label className="text-[11px] font-semibold text-gray-700 uppercase tracking-wider">
              5. Onderbouwing (optioneel)
            </label>
            <textarea
              value={onderbouwing}
              onChange={(e) => setOnderbouwing(e.target.value)}
              rows={2}
              placeholder="Waarom is deze rol nodig?"
              className="w-full mt-1 px-3 py-2 text-sm border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-[#003366]"
            />
          </div>
        </div>

        <div className="p-5 border-t border-gray-200 sticky bottom-0 bg-white z-10 flex justify-end gap-2">
          <button
            onClick={onClose}
            disabled={bezig}
            className="text-sm px-4 py-2 rounded border border-gray-300 text-gray-700 hover:bg-gray-50 disabled:opacity-50"
          >
            Annuleren
          </button>
          <button
            onClick={() => { void handleSave(); }}
            disabled={!kanOpslaan}
            className="text-sm px-4 py-2 rounded bg-[#003366] text-white hover:bg-[#002244] disabled:opacity-50 font-medium"
          >
            {bezig ? "Bezig..." : "Functie toevoegen"}
          </button>
        </div>
      </div>
    </div>
  );
}
