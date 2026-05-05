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
  }>;
  totaalUren: number;
  totaalKosten: number;
  samenvatting: string;
  // Top-niveau programma vs lijn-uitsplitsing (gezet door scenario-generator). Optioneel.
  programmaUren?: number;
  lijnUren?: number;
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

const LEZING_C_CAT_KLEUR: Record<LezingCCat, string> = {
  leider: "bg-[#003366] text-white",
  kernteam: "bg-blue-100 text-blue-900 border border-blue-200",
  trainings_deelnemer: "bg-emerald-100 text-emerald-900 border border-emerald-200",
  geconsulteerd: "bg-gray-100 text-gray-700 border border-gray-200",
};

// Heuristiek voor Lezing-C categorie. Geeft een redelijke default; wanneer de
// Lezing-C-doorvoer-agent expliciete `interneUrenLezing.rolCategorieen` schrijft,
// kan deze functie later vervangen worden door directe lookup.
function bepaalLezingCCategorie(
  domein: Domein,
  functieId: string,
  functieNaam: string | undefined,
  selectie: FunctieInput | undefined,
): LezingCCat {
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
      scenarios: { ...advies.scenarios, [scenarioKey]: { ...sc, samenvatting: newValue } },
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
                onSamenvattingEdit={(v) => handleSamenvattingEdit(sv.key, v)}
                onDomeinMotivatieEdit={(idx, v) => handleDomeinMotivatieEdit(sv.key, idx, v)}
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

function ScenarioBlokView({
  s,
  sv,
  selectiePerDomein,
  customFunctiesPerDomein,
  onSamenvattingEdit,
  onDomeinMotivatieEdit,
}: {
  s: ScenarioBlok;
  sv: { key: ScenarioLabel; label: string; kleur: { banner: string; tekst: string; accent: string; kaart: string } };
  selectiePerDomein?: Record<Domein, Record<string, FunctieInput>>;
  customFunctiesPerDomein?: Record<Domein, CustomFunctie[]>;
  onSamenvattingEdit?: (newValue: string) => Promise<void> | void;
  onDomeinMotivatieEdit?: (domeinIdx: number, newValue: string) => Promise<void> | void;
}): React.ReactElement {
  const [openDomein, setOpenDomein] = useState<Domein | null>("cultuur");
  const eindJaar = s.startJaar + s.aantalJaren - 1;

  return (
    <div className="space-y-3">
      {/* Banner */}
      <div className={`${sv.kleur.banner} text-white rounded-lg p-4`}>
        <p className={`text-[11px] font-semibold uppercase tracking-wider ${sv.kleur.tekst} mb-1`}>Scenario — {sv.label}</p>
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
              <p className={`text-sm font-semibold ${col.text} mb-1`}>{DOMEIN_LABELS[d.domein]}</p>
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
              <div className="space-y-3">
                {d.jaren.map((jr) => (
                  <div key={jr.jaar} className="bg-white border border-gray-200 rounded p-3">
                    <div className="flex items-center justify-between mb-2 gap-2 flex-wrap">
                      <div>
                        <p className="text-[10px] font-bold uppercase tracking-wider text-gray-500">{jr.jaar}</p>
                        <p className="text-sm text-gray-800">{jr.activiteit}</p>
                      </div>
                      <div className="text-right">
                        <p className="text-sm font-semibold text-gray-800">{jr.totaalUren.toLocaleString("nl-NL")} u</p>
                        <p className="text-[11px] text-gray-500">€ {jr.totaalKosten.toLocaleString("nl-NL")}</p>
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
                        </tr>
                      </thead>
                      <tbody>
                        {jr.rollen.map((r, i) => {
                          const sel = selectiePerDomein?.[d.domein]?.[r.functieId];
                          const aantal = sel?.aantal ?? 1;
                          const isStakeholder = sel?.stakeholder === true;
                          const stakeholderToel = sel?.stakeholderToelichting;
                          const isReview = sel?.reviewVereist === true;
                          const reviewVraag = sel?.reviewVraag;
                          // Lezing-C categorie afleiden (heuristiek; vervangbaar
                          // door interneUrenLezing.rolCategorieen wanneer beschikbaar)
                          const cat = bepaalLezingCCategorie(d.domein, r.functieId, r.functieNaam, sel);
                          // TBD-detectie op functienaam (placeholder rolnamen)
                          const naamLower = (r.functieNaam ?? "").toLowerCase();
                          const isTbd =
                            naamLower.includes("nader te bepalen") ||
                            naamLower.includes("nog te benoemen") ||
                            naamLower.includes("tbd");
                          return (
                            <tr key={`${r.functieId}-${i}`} className="border-b border-gray-50 last:border-b-0">
                              <td className="py-1">
                                <div className="flex items-center gap-1.5 flex-wrap">
                                  <span
                                    className={`inline-block text-[9px] uppercase tracking-wider font-semibold px-1 py-0 rounded ${LEZING_C_CAT_KLEUR[cat]}`}
                                    title={`Lezing-C categorie: ${LEZING_C_CAT_LABEL[cat]}`}
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
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                ))}
              </div>
            </div>
          );
        })}
      </div>

      {/* Betrokken stakeholders & open beslispunten — apart sub-blok per scenario */}
      <StakeholdersBeslispuntenBlok
        selectiePerDomein={selectiePerDomein}
        customFunctiesPerDomein={customFunctiesPerDomein}
      />
    </div>
  );
}

// ----------------------------------------------------------------------------
// ProgrammaLijnBlok — programma vs lijn-uitsplitsing per scenario
// Toont: 3 hoofdgetal-kaarten + per-domein gestapelde bar + collapsible uitleg.
// Stijl-look-and-feel consistent met SectieF in BerekeningenStep.tsx.
// ----------------------------------------------------------------------------
function ProgrammaLijnBlok({ s }: { s: ScenarioBlok }): React.ReactElement {
  // Resolve programma/lijn per domein — gebruik AI-gezette waarden of val terug op default-pct.
  const domeinUitsplitsing = s.domeinen.map((d) => {
    const pct =
      typeof d.programmaPct === "number" && d.programmaPct >= 0 && d.programmaPct <= 1
        ? d.programmaPct
        : PROGRAMMA_PCT_DEFAULT[d.domein] ?? 0.75;
    const programmaUren =
      typeof d.programmaUren === "number" ? d.programmaUren : Math.round(d.totaalUren * pct);
    const lijnUren =
      typeof d.lijnUren === "number" ? d.lijnUren : Math.round(d.totaalUren * (1 - pct));
    return {
      domein: d.domein,
      totaalUren: d.totaalUren,
      programmaPct: pct,
      programmaUren,
      lijnUren,
    };
  });

  // Top-niveau totalen — gebruik AI-getallen als beschikbaar, anders som van per-domein
  const totaalUren = s.totaalUren;
  const programmaTotaal =
    typeof s.programmaUren === "number"
      ? s.programmaUren
      : domeinUitsplitsing.reduce((acc, d) => acc + d.programmaUren, 0);
  const lijnTotaal =
    typeof s.lijnUren === "number"
      ? s.lijnUren
      : domeinUitsplitsing.reduce((acc, d) => acc + d.lijnUren, 0);
  const programmaPctTot =
    totaalUren > 0 ? Math.round((programmaTotaal / totaalUren) * 100) : 0;
  const lijnPctTot = totaalUren > 0 ? Math.round((lijnTotaal / totaalUren) * 100) : 0;

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
          Programma vs lijn — uitsplitsing van de capaciteitsbelasting
        </p>
        <p className="text-[11px] text-gray-500 mt-0.5 leading-snug">
          Niet alle uren zijn programma-uren. Een deel valt al in functieprofielen, bestaande
          budgetten of bestaande cycli — dat is &lsquo;lijn&rsquo;.
        </p>
      </div>

      <div className="p-3 space-y-3">
        {/* 1. Drie hoofdgetal-kaarten */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
          <ProgLijnKaart
            label="Totaal interne uren"
            waarde={totaalUren}
            sub={`over ${s.aantalJaren} jaar`}
            accent="bg-[#003366]"
          />
          <ProgLijnKaart
            label="Programma — extra te financieren capaciteit"
            waarde={programmaTotaal}
            sub={`${programmaPctTot}% van totaal`}
            accent="bg-emerald-700"
          />
          <ProgLijnKaart
            label="Lijn — valt in functieprofielen / bestaande budgetten"
            waarde={lijnTotaal}
            sub={`${lijnPctTot}% van totaal`}
            accent="bg-amber-700"
          />
        </div>

        {/* 2. Per-domein gestapelde bar (programma in domein-kleur, lijn in lichte tint) */}
        <div className="space-y-1.5">
          {sortedDom.map((d) => {
            const hex = DOMAIN_BAR_HEX[d.domein] ?? "#6b7280";
            const w = maxDomeinUren > 0 ? (d.totaalUren / maxDomeinUren) * 100 : 0;
            const programmaPct =
              d.totaalUren > 0 ? Math.round((d.programmaUren / d.totaalUren) * 100) : 0;
            // Binnen de bar: programma-deel breed = pct van bar-breedte
            const programmaBarPct =
              d.totaalUren > 0 ? (d.programmaUren / d.totaalUren) * 100 : 0;
            return (
              <div key={d.domein} className="flex items-center gap-2 text-[11px]">
                <span className="w-28 shrink-0 font-semibold text-gray-800">
                  {DOMEIN_LABELS[d.domein]}
                </span>
                <div
                  className="flex-1 h-4 rounded bg-gray-100 overflow-hidden"
                  style={{ maxWidth: `${Math.max(0.5, w)}%` }}
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
                        width: `${100 - programmaBarPct}%`,
                        backgroundColor: hex,
                        opacity: 0.25,
                      }}
                    />
                  </div>
                </div>
                <span className="shrink-0 tabular-nums font-mono text-gray-700">
                  {d.totaalUren.toLocaleString("nl-NL")}u
                </span>
                <span className="shrink-0 text-gray-500 w-24 text-right">
                  ({programmaPct}% programma)
                </span>
              </div>
            );
          })}
        </div>

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
