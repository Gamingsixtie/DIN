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
  // Per-domein selectie: functie-id → aantal personen (Cito-id of custom-id)
  selectiePerDomein?: Record<Domein, Record<string, number>>;
  // Custom functies door user toegevoegd, per domein
  customFunctiesPerDomein?: Record<Domein, CustomFunctie[]>;
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

  // Functie-selectie per domein — user kiest per inspanningsdomein welke functies + hoeveel personen
  const DOMEINEN: Domein[] = ["cultuur", "mens", "data_systemen", "processen"];

  function defaultSelectiePerDomein(): Record<Domein, Record<string, number>> {
    const init: Record<Domein, Record<string, number>> = { cultuur: {}, mens: {}, data_systemen: {}, processen: {} };
    for (const f of CITO_FUNCTIES) {
      const rel = (f.inspanningRelevantie ?? []) as Domein[];
      for (const d of rel) {
        if (d in init) init[d][f.id] = 1;
      }
    }
    return init;
  }

  const [selectiePerDomein, setSelectiePerDomein] = useState<Record<Domein, Record<string, number>>>(
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
      else next[domein][id] = 1;
      return next;
    });
  }
  function setAantalVoor(domein: Domein, id: string, aantal: number) {
    setSelectiePerDomein((prev) => {
      const clamped = Math.max(1, Math.min(50, Math.floor(aantal) || 1));
      const next = { ...prev, [domein]: { ...prev[domein], [id]: clamped } };
      return next;
    });
  }
  function selecteerAllesIn(domein: Domein, afdeling: CitoAfdeling) {
    setSelectiePerDomein((prev) => {
      const copy = { ...prev[domein] };
      for (const f of CITO_FUNCTIES) if (f.afdeling === afdeling && !(f.id in copy)) copy[f.id] = 1;
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
      const copy: Record<string, number> = { ...prev[domein] };
      for (const f of CITO_FUNCTIES) if (!(f.id in copy)) copy[f.id] = 1;
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
    setSelectiePerDomein((prev) => ({ ...prev, [domein]: { ...prev[domein], [id]: 1 } }));
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
  const geselecteerdeTotaal =
    geselecteerdePerDomein.cultuur + geselecteerdePerDomein.mens +
    geselecteerdePerDomein.data_systemen + geselecteerdePerDomein.processen;
  const totaalAantalPersonen = DOMEINEN.reduce(
    (s, d) => s + Object.values(selectiePerDomein[d]).reduce((a, b) => a + b, 0),
    0
  );

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
        setSelectiePerDomein({
          cultuur: persisted.selectiePerDomein.cultuur ?? {},
          mens: persisted.selectiePerDomein.mens ?? {},
          data_systemen: persisted.selectiePerDomein.data_systemen ?? {},
          processen: persisted.selectiePerDomein.processen ?? {},
        });
      } else if (persisted.functieAantallen || (persisted.geselecteerdeFunctieIds && persisted.geselecteerdeFunctieIds.length > 0)) {
        // Legacy-migratie: zet oude globale selectie om naar domein-default (op basis van inspanningRelevantie)
        const legacy: Record<string, number> =
          persisted.functieAantallen ??
          Object.fromEntries((persisted.geselecteerdeFunctieIds ?? []).map((id) => [id, 1]));
        const migrated: Record<Domein, Record<string, number>> = { cultuur: {}, mens: {}, data_systemen: {}, processen: {} };
        for (const [id, aantal] of Object.entries(legacy)) {
          const f = CITO_FUNCTIES.find((x) => x.id === id);
          const rel = (f?.inspanningRelevantie ?? []) as Domein[];
          const targets = rel.length > 0 ? rel : (DOMEINEN as Domein[]);
          for (const d of targets) migrated[d][id] = aantal;
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
      // Per-domein toegestane functies (Cito + custom), met aantal personen
      type ToegestaneFunctie = {
        id: string;
        naam: string;
        afdeling: string;
        schaal?: number;
        aantal: number;
        custom?: boolean;
      };
      const toegestaneFunctiesPerDomein: Record<Domein, ToegestaneFunctie[]> = {
        cultuur: [], mens: [], data_systemen: [], processen: [],
      };
      for (const d of DOMEINEN) {
        for (const [id, aantal] of Object.entries(selectiePerDomein[d])) {
          const citoF = CITO_FUNCTIES.find((f) => f.id === id);
          if (citoF) {
            toegestaneFunctiesPerDomein[d].push({
              id: citoF.id,
              naam: citoF.naam,
              afdeling: citoF.afdeling,
              schaal: citoF.schaal,
              aantal,
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
      };
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
                    {DOMEIN_LABELS[d]}: {geselecteerdePerDomein[d]}
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
                    {DOMEIN_LABELS[d]} · {geselecteerdePerDomein[d]}
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
                      const aantal = selectiePerDomein[actiefDomein][cf.id] ?? 0;
                      return (
                        <div key={cf.id} className="flex items-center gap-2 bg-white border border-gray-200 rounded px-2 py-1">
                          <input
                            type="checkbox"
                            checked={cf.id in selectiePerDomein[actiefDomein]}
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
                            disabled={!(cf.id in selectiePerDomein[actiefDomein])}
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
                          const aantal = selectiePerDomein[actiefDomein][f.id] ?? 0;
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

      <button
        onClick={() => generateAdvies()}
        disabled={loading || geselecteerdeTotaal === 0}
        className="text-sm px-4 py-2 rounded bg-[#003366] text-white hover:bg-[#002244] disabled:opacity-50"
      >
        {loading
          ? "AI berekent interne uren voor 3 scenario's..."
          : advies
          ? `Regenereer interne-uren-advies (${geselecteerdeTotaal} functies · ${totaalAantalPersonen} personen)`
          : `Genereer interne-uren-advies (${geselecteerdeTotaal} functies · ${totaalAantalPersonen} personen)`}
      </button>

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
