"use client";

import React, { useState, useMemo } from "react";
import type { DINSession, Stap4Result } from "@/lib/types";

type ScenarioLabel = "optimaal" | "plus20" | "min20";
type Domein = "cultuur" | "mens" | "data_systemen" | "processen";

type BegrotingScenario = {
  aantalJaren: number;
  jaarlijksBudgetEuro: number;
  totaalGeraamdEuro: number;
  totalenPerJaar?: Array<{ jaar: number; euro: number; percentage?: number }>;
};
type BegrotingAdvies = {
  jaarlijksBudgetBasis: number;
  startJaar: number;
  cyclusMaanden: number;
  scenarios: Record<ScenarioLabel, BegrotingScenario | null>;
  vergelijking?: string;
};

type InterneUrenScenario = {
  aantalJaren: number;
  startJaar: number;
  totaalUren: number;
  totaalKosten: number;
  totalenPerJaar: Array<{ jaar: number; uren: number; kosten: number }>;
  domeinen: Array<{ domein: Domein; totaalUren: number; totaalKosten: number }>;
};
type Stap7InterneUren = {
  uurtariefSettings: { basisTarief: number; referentiejaar: number; indexatiePercentage: number };
  scenarios: Record<ScenarioLabel, InterneUrenScenario | null>;
};

const SCENARIO_META: Array<{
  key: ScenarioLabel;
  label: string;
  kleur: { banner: string; tekst: string; accent: string };
}> = [
  { key: "optimaal", label: "Optimaal", kleur: { banner: "bg-[#003366]", tekst: "text-blue-100", accent: "text-[#003366]" } },
  { key: "plus20", label: "+20% (sneller)", kleur: { banner: "bg-green-800", tekst: "text-green-100", accent: "text-green-800" } },
  { key: "min20", label: "−20% (langzamer)", kleur: { banner: "bg-amber-800", tekst: "text-amber-100", accent: "text-amber-800" } },
];

export default function StapTotaaloverzicht({
  stap4Result,
}: {
  session: DINSession;
  stap4Result?: Stap4Result;
}): React.ReactElement {
  const [actiefScenario, setActiefScenario] = useState<ScenarioLabel>("optimaal");

  const begroting = (stap4Result as unknown as { begrotingAdvies?: BegrotingAdvies })?.begrotingAdvies;
  const interneUren = (stap4Result as unknown as { stap7InterneUren?: Stap7InterneUren })?.stap7InterneUren;

  const totalen = useMemo(() => {
    if (!begroting?.scenarios || !interneUren?.scenarios) return null;

    function combineScenario(label: ScenarioLabel) {
      const b = begroting?.scenarios?.[label];
      const i = interneUren?.scenarios?.[label];
      if (!b || !i) return null;
      const startJaar = begroting?.startJaar ?? new Date().getFullYear();
      const aantalJaren = Math.max(b.aantalJaren, i.aantalJaren);
      const perJaar: Array<{ jaar: number; outOfPocket: number; interneUren: number; interneKosten: number; totaal: number }> = [];
      for (let k = 0; k < aantalJaren; k++) {
        const jaar = startJaar + k;
        const outCell = b.totalenPerJaar?.find((t) => t.jaar === jaar);
        const inCell = i.totalenPerJaar?.find((t) => t.jaar === jaar);
        const outOfPocket = outCell?.euro ?? 0;
        const urenAantal = inCell?.uren ?? 0;
        const interneKosten = inCell?.kosten ?? 0;
        perJaar.push({
          jaar,
          outOfPocket,
          interneUren: urenAantal,
          interneKosten,
          totaal: outOfPocket + interneKosten,
        });
      }
      const totaalOutOfPocket = perJaar.reduce((s, p) => s + p.outOfPocket, 0);
      const totaalInterneKosten = perJaar.reduce((s, p) => s + p.interneKosten, 0);
      const totaalInterneUren = perJaar.reduce((s, p) => s + p.interneUren, 0);
      const totaalGeraamd = totaalOutOfPocket + totaalInterneKosten;
      return { perJaar, totaalOutOfPocket, totaalInterneKosten, totaalInterneUren, totaalGeraamd, aantalJaren, startJaar };
    }

    return {
      optimaal: combineScenario("optimaal"),
      plus20: combineScenario("plus20"),
      min20: combineScenario("min20"),
    };
  }, [begroting, interneUren]);

  if (!begroting?.scenarios) {
    return (
      <div className="text-center py-10">
        <p className="text-sm text-gray-600">Nog geen begrotingsadvies uit stap 6 beschikbaar.</p>
        <p className="text-xs text-gray-500 mt-2">Ga eerst naar stap 6 <strong>Optimaliseren</strong> en genereer de begroting.</p>
      </div>
    );
  }
  if (!interneUren?.scenarios) {
    return (
      <div className="text-center py-10">
        <p className="text-sm text-gray-600">Nog geen interne-uren-advies uit stap 7 beschikbaar.</p>
        <p className="text-xs text-gray-500 mt-2">Ga naar stap 7 <strong>Interne uren</strong> en genereer het advies.</p>
      </div>
    );
  }

  const actief = totalen?.[actiefScenario];

  return (
    <div className="space-y-6">
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
        <p className="text-sm text-blue-900 leading-relaxed">
          Totaaloverzicht per scenario — <strong>out-of-pocket</strong> (externe kosten uit stap 6) +
          <strong> interne uren</strong> (Cito-medewerkers uit stap 7) = <strong>totale programmakosten</strong>.
        </p>
      </div>

      {/* Scenario-vergelijkingsbanner */}
      <div className="bg-white border-2 border-[#003366] rounded-lg p-4">
        <h4 className="text-sm font-semibold text-[#003366] mb-3">Totaaloverzicht — 3 scenario&apos;s</h4>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          {SCENARIO_META.map((sv) => {
            const t = totalen?.[sv.key];
            const isActief = actiefScenario === sv.key;
            if (!t) {
              return (
                <div key={sv.key} className="border-2 border-gray-200 bg-gray-50 rounded p-3 opacity-60">
                  <p className="text-[10px] font-bold uppercase tracking-wider text-gray-500">{sv.label}</p>
                  <p className="text-sm font-medium text-gray-500 mt-2">— geen data —</p>
                </div>
              );
            }
            return (
              <button
                key={sv.key}
                onClick={() => setActiefScenario(sv.key)}
                className={`border-2 rounded p-3 text-left transition-colors ${isActief ? "border-[#003366] bg-blue-50 shadow-sm" : "border-gray-200 bg-white hover:border-gray-300"}`}
              >
                <p className={`text-[10px] font-bold uppercase tracking-wider ${sv.kleur.accent}`}>
                  {sv.label}
                  {isActief && <span className="ml-1 text-[9px]">(actief)</span>}
                </p>
                <p className="text-2xl font-bold text-gray-800 mt-1">€ {(t.totaalGeraamd / 1_000_000).toFixed(2)}M</p>
                <p className="text-xs text-gray-600 mt-0.5">
                  {t.aantalJaren} jaar ({t.startJaar}–{t.startJaar + t.aantalJaren - 1})
                </p>
                <div className="text-[11px] text-gray-500 mt-1.5 space-y-0.5">
                  <p>Out-of-pocket: € {t.totaalOutOfPocket.toLocaleString("nl-NL")}</p>
                  <p>Interne uren: € {t.totaalInterneKosten.toLocaleString("nl-NL")} ({t.totaalInterneUren.toLocaleString("nl-NL")} u)</p>
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {/* Actief scenario — detail-tabel */}
      {actief && (
        <div className="bg-white border border-gray-200 rounded-lg p-4 overflow-x-auto">
          <h4 className="text-sm font-semibold text-[#003366] mb-3">
            Jaar-detail — {SCENARIO_META.find((s) => s.key === actiefScenario)?.label}
          </h4>
          <table className="w-full text-sm border-collapse">
            <thead>
              <tr className="border-b-2 border-gray-200">
                <th className="text-left py-2 px-2 text-[10px] font-semibold text-gray-500 uppercase tracking-wider">Categorie</th>
                {actief.perJaar.map((p) => (
                  <th key={p.jaar} className="text-right py-2 px-2 text-[10px] font-semibold text-gray-500 uppercase tracking-wider">
                    {p.jaar}
                  </th>
                ))}
                <th className="text-right py-2 px-2 text-[10px] font-semibold text-gray-500 uppercase tracking-wider">Totaal</th>
              </tr>
            </thead>
            <tbody>
              <tr className="border-b border-gray-100">
                <td className="py-3 px-2">
                  <p className="text-sm font-medium text-gray-700">Out-of-pocket</p>
                  <p className="text-[10px] text-gray-500">Externe kosten (stap 6)</p>
                </td>
                {actief.perJaar.map((p) => (
                  <td key={p.jaar} className="text-right py-3 px-2">
                    <p className="text-sm text-gray-800">€ {p.outOfPocket.toLocaleString("nl-NL")}</p>
                  </td>
                ))}
                <td className="text-right py-3 px-2">
                  <p className="text-sm font-semibold text-[#003366]">€ {actief.totaalOutOfPocket.toLocaleString("nl-NL")}</p>
                </td>
              </tr>
              <tr className="border-b border-gray-100">
                <td className="py-3 px-2">
                  <p className="text-sm font-medium text-gray-700">Interne uren</p>
                  <p className="text-[10px] text-gray-500">Cito-medewerkers (stap 7)</p>
                </td>
                {actief.perJaar.map((p) => (
                  <td key={p.jaar} className="text-right py-3 px-2">
                    <p className="text-sm text-gray-800">€ {p.interneKosten.toLocaleString("nl-NL")}</p>
                    <p className="text-[10px] text-gray-500">{p.interneUren.toLocaleString("nl-NL")} u</p>
                  </td>
                ))}
                <td className="text-right py-3 px-2">
                  <p className="text-sm font-semibold text-[#003366]">€ {actief.totaalInterneKosten.toLocaleString("nl-NL")}</p>
                  <p className="text-[10px] text-gray-500">{actief.totaalInterneUren.toLocaleString("nl-NL")} u</p>
                </td>
              </tr>
            </tbody>
            <tfoot>
              <tr className="border-t-2 border-[#003366] bg-blue-50">
                <td className="py-3 px-2 text-sm font-bold text-[#003366]">TOTAAL</td>
                {actief.perJaar.map((p) => (
                  <td key={p.jaar} className="text-right py-3 px-2">
                    <p className="text-sm font-bold text-[#003366]">€ {p.totaal.toLocaleString("nl-NL")}</p>
                  </td>
                ))}
                <td className="text-right py-3 px-2">
                  <p className="text-base font-bold text-[#003366]">€ {actief.totaalGeraamd.toLocaleString("nl-NL")}</p>
                </td>
              </tr>
            </tfoot>
          </table>
        </div>
      )}

      {/* Visuele stacked-bar */}
      {actief && (
        <div className="bg-white border border-gray-200 rounded-lg p-4">
          <h4 className="text-sm font-semibold text-[#003366] mb-3">Visuele verdeling per jaar</h4>
          <div className="space-y-2">
            {actief.perJaar.map((p) => {
              const max = Math.max(...actief.perJaar.map((j) => j.totaal));
              const width = max > 0 ? (p.totaal / max) * 100 : 0;
              const outPct = p.totaal > 0 ? (p.outOfPocket / p.totaal) * 100 : 0;
              return (
                <div key={p.jaar}>
                  <div className="flex items-center justify-between text-[11px] text-gray-600 mb-1">
                    <span className="font-semibold">{p.jaar}</span>
                    <span>€ {p.totaal.toLocaleString("nl-NL")}</span>
                  </div>
                  <div className="h-6 bg-gray-100 rounded-sm overflow-hidden flex" style={{ width: `${width}%` }}>
                    <div className="bg-[#003366] h-full" style={{ width: `${outPct}%` }} title={`Out-of-pocket € ${p.outOfPocket.toLocaleString("nl-NL")}`} />
                    <div className="bg-green-600 h-full flex-1" title={`Interne uren € ${p.interneKosten.toLocaleString("nl-NL")}`} />
                  </div>
                </div>
              );
            })}
            <div className="flex items-center gap-4 text-[10px] text-gray-600 pt-2">
              <span className="flex items-center gap-1"><span className="w-3 h-3 bg-[#003366] inline-block" /> Out-of-pocket</span>
              <span className="flex items-center gap-1"><span className="w-3 h-3 bg-green-600 inline-block" /> Interne uren</span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
