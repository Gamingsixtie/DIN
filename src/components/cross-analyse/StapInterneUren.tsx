"use client";

import React, { useState, useEffect } from "react";
import { useSession } from "@/lib/session-context";
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
type FunctieInput = { aantal: number; urenPerJaar?: number };

type Domein = "cultuur" | "mens" | "data_systemen" | "processen";
type ScenarioLabel = "optimaal" | "plus20" | "min20";

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

const SCENARIO_META: Array<{
  key: ScenarioLabel;
  label: string;
  kleur: { banner: string; tekst: string; accent: string; kaart: string };
}> = [
  { key: "optimaal", label: "Optimaal", kleur: { banner: "bg-[#003366]", tekst: "text-blue-100", accent: "text-[#003366]", kaart: "border-blue-200 bg-blue-50" } },
  { key: "plus20", label: "+20% budget (sneller)", kleur: { banner: "bg-green-800", tekst: "text-green-100", accent: "text-green-800", kaart: "border-green-200 bg-green-50" } },
  { key: "min20", label: "−20% budget (langzamer)", kleur: { banner: "bg-amber-800", tekst: "text-amber-100", accent: "text-amber-800", kaart: "border-amber-200 bg-amber-50" } },
];

export default function StapInterneUren({
  session,
  stap4Result,
}: {
  session: DINSession;
  stap4Result?: Stap4Result;
}): React.ReactElement {
  const { updateSession } = useSession();

  const [basisTarief, setBasisTarief] = useState<number>(DEFAULT_BASIS_TARIEF);
  const [referentiejaar, setReferentiejaar] = useState<number>(DEFAULT_REFERENTIEJAAR);
  const [indexatiePct, setIndexatiePct] = useState<number>(DEFAULT_INDEXATIE_PCT);
  // Uren-budget norm per jaar (user-setting, default 540 voor 2026 zoals user aangaf)
  const [urenBudgetStart, setUrenBudgetStart] = useState<number>(540);

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [advies, setAdvies] = useState<InterneUrenAdvies | null>(null);

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
  useEffect(() => {
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
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [stap4Result]);

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
      scenarios: Record<ScenarioLabel, BegrotingScenario | null>;
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
    const scenariosPayload: Record<ScenarioLabel, BegrotingScenario | null> = {
      optimaal: begroting.scenarios.optimaal ? { ...begroting.scenarios.optimaal, startJaar: begroting.startJaar } : null,
      plus20: begroting.scenarios.plus20 ? { ...begroting.scenarios.plus20, startJaar: begroting.startJaar } : null,
      min20: begroting.scenarios.min20 ? { ...begroting.scenarios.min20, startJaar: begroting.startJaar } : null,
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
      );
      const urenBudgetPerJaar = Array.from({ length: maxAantalJaren }, (_, i) => ({
        jaar: begroting.startJaar + i,
        urenBudget: urenBudgetStart,
      }));
      const res = await fetch("/api/interne-uren-advies", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          scenarios: scenariosPayload,
          uurtariefSettings: { basisTarief, referentiejaar, indexatiePercentage: indexatiePct },
          inspanningenMeta,
          toegestaneFuncties,
          toegestaneFunctiesPerDomein,
          urenBudgetPerJaar,
          // STAP 2 output (Q&A): hard input voor uren per rol per inspanning (totaal over optimaal scenario)
          vastgesteldeUrenPerInspanning: vastgesteldeUrenPerInspanning.length > 0 ? vastgesteldeUrenPerInspanning : undefined,
          scope: session.scope,
          vision: session.vision,
          finetuneInstructie: opts?.finetuneInstructie ?? "",
          previousAdvies: opts?.previousAdvies ?? null,
        }),
      });
      const text = await res.text();
      let data: { success?: boolean; data?: InterneUrenAdvies; error?: string };
      try {
        data = JSON.parse(text);
      } catch {
        setError(res.status >= 500 ? "Server-fout — probeer opnieuw." : `Onverwacht antwoord (${res.status})`);
        setLoading(false);
        return;
      }
      if (!data.success || !data.data) {
        setError(data.error ?? "Onbekende fout");
        setLoading(false);
        return;
      }
      // Verrijk met user-settings zodat ze bij terugkeer bewaard blijven
      const verrijkt: InterneUrenAdvies = {
        ...data.data,
        urenBudgetStart,
        selectiePerDomein,
        customFunctiesPerDomein,
        vragenAntwoorden: antwoordenPerInspanning,
        // Persist Q&A flow voor latere restore
        ...(vragenPerInspanning.length > 0 ? { vragenPerInspanning } : {}),
        ...(vastgesteldeUrenPerInspanning.length > 0 ? { vastgesteldeUrenPerInspanning } : {}),
      } as InterneUrenAdvies;
      setAdvies(verrijkt);
      // Persisteer in session onder stap4.stap7InterneUren
      updateSession((prev) => {
        if (!prev.crossAnalyseWizard?.stepResults?.stap4) return prev;
        return {
          ...prev,
          crossAnalyseWizard: {
            ...prev.crossAnalyseWizard,
            stepResults: {
              ...prev.crossAnalyseWizard.stepResults,
              stap4: {
                ...prev.crossAnalyseWizard.stepResults.stap4,
                stap7InterneUren: verrijkt,
              } as typeof prev.crossAnalyseWizard.stepResults.stap4,
            },
          },
        };
      });
      setLoading(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Netwerkfout");
      setLoading(false);
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
              <button
                onClick={() => setFineutOpen(true)}
                disabled={loading}
                className="text-sm px-4 py-2 rounded bg-[#003366] text-white hover:bg-[#002244] disabled:opacity-50 font-medium shadow-sm"
              >
                ✎ Fineut met AI
              </button>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              {SCENARIO_META.map((sv) => {
                const s = advies.scenarios[sv.key];
                if (!s) {
                  return (
                    <div key={sv.key} className="border-2 border-gray-200 bg-gray-50 rounded p-3 opacity-60">
                      <p className="text-[10px] font-bold uppercase tracking-wider text-gray-500">{sv.label}</p>
                      <p className="text-sm font-medium text-gray-500 mt-2">— gefaald —</p>
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
            return <ScenarioBlokView key={sv.key} s={s} sv={sv} />;
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
                <button
                  onClick={() => setUrenTabelOpen(false)}
                  className="text-gray-400 hover:text-gray-700 text-2xl leading-none px-2"
                >
                  ×
                </button>
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
                          <th className="text-left py-1 px-2 text-gray-500 font-semibold">Onderbouwing (AI)</th>
                          <th className="text-right py-1 px-2 text-gray-500 font-semibold w-32">Uren totaal</th>
                        </tr>
                      </thead>
                      <tbody>
                        {iu.rollen.map((r) => (
                          <tr key={r.functieId} className="border-b border-gray-100 last:border-b-0">
                            <td className="py-1 px-2">
                              <p className="text-gray-800 font-medium">{r.functieNaam}</p>
                              {r.afdeling && <p className="text-[10px] text-gray-500">{r.afdeling}</p>}
                            </td>
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
                        ))}
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
              <h3 className="text-lg font-semibold text-[#003366]">Interne uren fineuten met AI</h3>
              <p className="text-sm text-gray-600 mt-1 leading-relaxed">
                Geef een instructie om rollen, uren of fasering aan te passen.
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
                  rows={5}
                  placeholder="Bijv.: 'Voeg een Projectmanager D toe in elk domein voor programma-coördinatie (10% FTE per jaar).'"
                  className="w-full mt-1 px-3 py-2 text-sm border border-gray-300 rounded bg-white focus:outline-none focus:ring-2 focus:ring-[#003366] resize-y leading-relaxed"
                />
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

function ScenarioBlokView({
  s,
  sv,
}: {
  s: ScenarioBlok;
  sv: { key: ScenarioLabel; label: string; kleur: { banner: string; tekst: string; accent: string; kaart: string } };
}): React.ReactElement {
  const [openDomein, setOpenDomein] = useState<Domein | null>("cultuur");
  const eindJaar = s.startJaar + s.aantalJaren - 1;

  return (
    <div className="space-y-3">
      {/* Banner */}
      <div className={`${sv.kleur.banner} text-white rounded-lg p-4`}>
        <p className={`text-[11px] font-semibold uppercase tracking-wider ${sv.kleur.tekst} mb-1`}>Scenario — {sv.label}</p>
        <p className="text-sm">{s.samenvatting}</p>
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
        {s.domeinen.map((d) => {
          if (openDomein !== d.domein) return null;
          const col = DOMEIN_COLORS[d.domein];
          return (
            <div key={d.domein} className={`p-4 ${col.bg}`}>
              <p className={`text-sm font-semibold ${col.text} mb-1`}>{DOMEIN_LABELS[d.domein]}</p>
              <p className="text-xs text-gray-700 italic leading-relaxed mb-3">{d.motivatie}</p>
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
                          <th className="py-1 font-semibold text-gray-500 text-right">Uren</th>
                          <th className="py-1 font-semibold text-gray-500 text-right">€/u</th>
                          <th className="py-1 font-semibold text-gray-500 text-right">Kosten</th>
                        </tr>
                      </thead>
                      <tbody>
                        {jr.rollen.map((r, i) => (
                          <tr key={`${r.functieId}-${i}`} className="border-b border-gray-50 last:border-b-0">
                            <td className="py-1">
                              <span className="text-gray-800">{r.functieNaam}</span>
                              {r.afdeling && <span className="text-[10px] text-gray-500 ml-1">({r.afdeling})</span>}
                            </td>
                            <td className="py-1 text-right text-gray-800">{r.uren}</td>
                            <td className="py-1 text-right text-gray-500">€{r.uurtarief}</td>
                            <td className="py-1 text-right font-semibold text-gray-800">€ {r.kosten.toLocaleString("nl-NL")}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                ))}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
