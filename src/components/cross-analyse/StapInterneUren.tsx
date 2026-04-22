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
  geselecteerdeFunctieIds?: string[];
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

  // Functie-selectie (Fase 1 — user kiest welke functies AI mag gebruiken)
  const [geselecteerdeFunctieIds, setGeselecteerdeFunctieIds] = useState<Set<string>>(
    () => new Set(CITO_FUNCTIES.filter((f) => (f.inspanningRelevantie?.length ?? 0) > 0).map((f) => f.id))
  );
  const [selectieOpen, setSelectieOpen] = useState(false);

  function toggleFunctie(id: string) {
    setGeselecteerdeFunctieIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }
  function selecteerAllesIn(afdeling: CitoAfdeling) {
    setGeselecteerdeFunctieIds((prev) => {
      const next = new Set(prev);
      for (const f of CITO_FUNCTIES) if (f.afdeling === afdeling) next.add(f.id);
      return next;
    });
  }
  function deselecteerAllesIn(afdeling: CitoAfdeling) {
    setGeselecteerdeFunctieIds((prev) => {
      const next = new Set(prev);
      for (const f of CITO_FUNCTIES) if (f.afdeling === afdeling) next.delete(f.id);
      return next;
    });
  }
  function resetNaarAanbevolen() {
    setGeselecteerdeFunctieIds(
      new Set(CITO_FUNCTIES.filter((f) => (f.inspanningRelevantie?.length ?? 0) > 0).map((f) => f.id))
    );
  }

  const FINEUT_VOORBEELDEN: ReadonlyArray<{ kort: string; instructie: string }> = [
    { kort: "Meer sectormanagement-uren", instructie: "Verhoog de sectormanager-uren in het eerste jaar — zij moeten de cultuur-verandering gaan dragen." },
    { kort: "Minder uren op Data/Systemen", instructie: "Halveer de uren op Data/Systemen — we gaan een externe partij inschakelen voor de bouw." },
    { kort: "Toetsdeskundige C i.p.v. B", instructie: "Vervang Toetsdeskundige B door Toetsdeskundige C waar mogelijk — senioriteit past beter bij dit programma." },
    { kort: "Verplaats uren naar jaar 2-3", instructie: "Verminder de totale uren in jaar 1 en verplaats die naar jaar 2-3 — het eerste jaar is vooral scoping, minder handen aan bed nodig." },
    { kort: "Voeg project-coördinatie toe", instructie: "Voeg overal een Projectmanager D toe voor programma-coördinatie — 10-20% FTE per jaar." },
  ];

  // Restore vanuit sessie — inclusief user-settings (urenBudget, selectie)
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
      if (persisted.geselecteerdeFunctieIds && persisted.geselecteerdeFunctieIds.length > 0) {
        setGeselecteerdeFunctieIds(new Set(persisted.geselecteerdeFunctieIds));
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
    if (geselecteerdeFunctieIds.size === 0) {
      setError("Selecteer minimaal één functie voordat je de analyse draait.");
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
      const toegestaneFuncties = CITO_FUNCTIES.filter((f) => geselecteerdeFunctieIds.has(f.id)).map((f) => ({
        id: f.id,
        naam: f.naam,
        afdeling: f.afdeling,
        schaal: f.schaal,
      }));
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
        geselecteerdeFunctieIds: Array.from(geselecteerdeFunctieIds),
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

      {/* Functie-selectie — Fase 1: user kiest welke Cito-functies AI mag inzetten */}
      <div className="bg-white border border-gray-200 rounded-lg">
        <button
          onClick={() => setSelectieOpen((v) => !v)}
          className="w-full flex items-center justify-between p-4 text-left hover:bg-gray-50"
        >
          <div>
            <p className="text-sm font-semibold text-[#003366]">
              Functie-selectie ({geselecteerdeFunctieIds.size} / {CITO_FUNCTIES.length} actief)
            </p>
            <p className="text-[11px] text-gray-500 mt-0.5">
              Kies welke Cito-rollen AI mag inzetten in de analyse. Default: aanbevolen rollen op basis van inspanningsdomein. Trainers zijn standaard uit (klantcontact-context, niet programma).
            </p>
          </div>
          <span className="text-xs text-gray-500">{selectieOpen ? "▲ inklappen" : "▼ uitklappen"}</span>
        </button>
        {selectieOpen && (
          <div className="border-t border-gray-200 p-4 space-y-3">
            <div className="flex items-center gap-2 flex-wrap">
              <button
                onClick={resetNaarAanbevolen}
                className="text-xs px-2.5 py-1 rounded border border-[#003366] text-[#003366] bg-white hover:bg-[#f0f4f8]"
              >
                Reset naar aanbevolen
              </button>
              <button
                onClick={() => setGeselecteerdeFunctieIds(new Set(CITO_FUNCTIES.map((f) => f.id)))}
                className="text-xs px-2.5 py-1 rounded border border-gray-300 text-gray-700 bg-white hover:bg-gray-50"
              >
                Alles
              </button>
              <button
                onClick={() => setGeselecteerdeFunctieIds(new Set())}
                className="text-xs px-2.5 py-1 rounded border border-gray-300 text-gray-700 bg-white hover:bg-gray-50"
              >
                Niets
              </button>
            </div>
            {(() => {
              const perAfdeling = new Map<CitoAfdeling, CitoFunctie[]>();
              for (const f of CITO_FUNCTIES) {
                const list = perAfdeling.get(f.afdeling) ?? [];
                list.push(f);
                perAfdeling.set(f.afdeling, list);
              }
              return Array.from(perAfdeling.entries()).map(([afd, functies]) => {
                const actiefInAfd = functies.filter((f) => geselecteerdeFunctieIds.has(f.id)).length;
                return (
                  <div key={afd} className="border border-gray-100 rounded p-2">
                    <div className="flex items-center justify-between mb-1">
                      <p className="text-[11px] font-semibold text-gray-700">
                        {afd} <span className="text-gray-400">({actiefInAfd}/{functies.length})</span>
                      </p>
                      <div className="flex items-center gap-1">
                        <button onClick={() => selecteerAllesIn(afd)} className="text-[10px] px-1.5 py-0.5 rounded bg-gray-100 hover:bg-gray-200 text-gray-700">✓ alles</button>
                        <button onClick={() => deselecteerAllesIn(afd)} className="text-[10px] px-1.5 py-0.5 rounded bg-gray-100 hover:bg-gray-200 text-gray-700">✕ geen</button>
                      </div>
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-1">
                      {functies.map((f) => {
                        const actief = geselecteerdeFunctieIds.has(f.id);
                        return (
                          <label
                            key={f.id}
                            className={`flex items-center gap-2 text-[11px] px-2 py-1 rounded cursor-pointer ${actief ? "bg-blue-50 text-gray-800" : "text-gray-600 hover:bg-gray-50"}`}
                          >
                            <input
                              type="checkbox"
                              checked={actief}
                              onChange={() => toggleFunctie(f.id)}
                              className="accent-[#003366]"
                            />
                            <span className="flex-1 leading-tight">
                              {f.naam} <span className="text-gray-400">s{f.schaal}</span>
                            </span>
                          </label>
                        );
                      })}
                    </div>
                  </div>
                );
              });
            })()}
          </div>
        )}
      </div>

      <button
        onClick={() => generateAdvies()}
        disabled={loading || geselecteerdeFunctieIds.size === 0}
        className="text-sm px-4 py-2 rounded bg-[#003366] text-white hover:bg-[#002244] disabled:opacity-50"
      >
        {loading
          ? "AI berekent interne uren voor 3 scenario's..."
          : advies
          ? `Regenereer interne-uren-advies (${geselecteerdeFunctieIds.size} functies)`
          : `Genereer interne-uren-advies (${geselecteerdeFunctieIds.size} functies)`}
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
