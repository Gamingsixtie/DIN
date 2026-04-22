"use client";

import React, { useState, useMemo } from "react";
import type { DINSession, Stap4Result, BegrotingAdvies, Stap7InterneUren } from "@/lib/types";

type ScenarioLabel = "optimaal" | "plus20" | "min20";

const SCENARIO_META: Array<{
  key: ScenarioLabel;
  label: string;
  kleur: { banner: string; tekst: string; accent: string };
}> = [
  { key: "optimaal", label: "Optimaal", kleur: { banner: "bg-[#003366]", tekst: "text-blue-100", accent: "text-[#003366]" } },
  { key: "plus20", label: "+20% (sneller)", kleur: { banner: "bg-green-800", tekst: "text-green-100", accent: "text-green-800" } },
  { key: "min20", label: "−20% (langzamer)", kleur: { banner: "bg-amber-800", tekst: "text-amber-100", accent: "text-amber-800" } },
];

type PerScenarioTotaal = {
  perJaar: Array<{ jaar: number; outOfPocket: number; interneUren: number; interneKosten: number; totaal: number }>;
  totaalOutOfPocket: number;
  totaalInterneKosten: number;
  totaalInterneUren: number;
  totaalGeraamd: number;
  aantalJaren: number;
  startJaar: number;
  heeftBegroting: boolean;
  heeftInterneUren: boolean;
};

export default function StapTotaaloverzicht({
  stap4Result,
}: {
  session: DINSession;
  stap4Result?: Stap4Result;
}): React.ReactElement {
  const [actiefScenario, setActiefScenario] = useState<ScenarioLabel>("optimaal");

  const begroting = stap4Result?.begrotingAdvies as BegrotingAdvies | undefined;
  const interneUren = stap4Result?.stap7InterneUren as Stap7InterneUren | undefined;

  const totalen = useMemo(() => {
    const startJaarDefault = begroting?.startJaar ?? interneUren?.scenarios?.optimaal?.startJaar ?? new Date().getFullYear();

    function combineScenario(label: ScenarioLabel): PerScenarioTotaal | null {
      const b = begroting?.scenarios?.[label] ?? null;
      const i = interneUren?.scenarios?.[label] ?? null;
      if (!b && !i) return null;

      const startJaar = b ? begroting?.startJaar ?? startJaarDefault : i?.startJaar ?? startJaarDefault;
      const aantalJaren = Math.max(b?.aantalJaren ?? 0, i?.aantalJaren ?? 0);
      const perJaar: PerScenarioTotaal["perJaar"] = [];
      for (let k = 0; k < aantalJaren; k++) {
        const jaar = startJaar + k;
        const outCell = b?.totalenPerJaar?.find((t) => t.jaar === jaar);
        const inCell = i?.totalenPerJaar?.find((t) => t.jaar === jaar);
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
      return {
        perJaar,
        totaalOutOfPocket,
        totaalInterneKosten,
        totaalInterneUren,
        totaalGeraamd,
        aantalJaren,
        startJaar,
        heeftBegroting: !!b,
        heeftInterneUren: !!i,
      };
    }

    return {
      optimaal: combineScenario("optimaal"),
      plus20: combineScenario("plus20"),
      min20: combineScenario("min20"),
    };
  }, [begroting, interneUren]);

  const heeftEnigeBegroting = !!begroting?.scenarios && SCENARIO_META.some((s) => begroting.scenarios?.[s.key]);
  const heeftEnigeInterneUren = !!interneUren?.scenarios && SCENARIO_META.some((s) => interneUren.scenarios?.[s.key]);
  const actief = totalen[actiefScenario];

  return (
    <div className="space-y-6">
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
        <p className="text-sm text-blue-900 leading-relaxed">
          Totaaloverzicht per scenario — <strong>out-of-pocket</strong> (externe kosten uit stap 6) +
          <strong> interne uren</strong> (Cito-medewerkers uit stap 7) = <strong>totale programmakosten</strong>.
        </p>
      </div>

      {(!heeftEnigeBegroting || !heeftEnigeInterneUren) && (
        <div className="bg-amber-50 border border-amber-200 rounded-lg p-4 space-y-1">
          <p className="text-sm font-semibold text-amber-900">Nog niet alle bronnen gegenereerd</p>
          <ul className="text-xs text-amber-800 list-disc ml-5 space-y-0.5">
            {!heeftEnigeBegroting && (
              <li>Geen begrotingsadvies uit <strong>stap 6 Optimaliseren</strong> — out-of-pocket kolom blijft leeg.</li>
            )}
            {!heeftEnigeInterneUren && (
              <li>Geen interne-uren-advies uit <strong>stap 7 Interne uren</strong> — interne uren kolom blijft leeg.</li>
            )}
          </ul>
        </div>
      )}

      {/* Scenario-vergelijkingsbanner — altijd 3 kaarten */}
      <div className="bg-white border-2 border-[#003366] rounded-lg p-4">
        <h4 className="text-sm font-semibold text-[#003366] mb-3">Totaaloverzicht — 3 scenario&apos;s</h4>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          {SCENARIO_META.map((sv) => {
            const t = totalen[sv.key];
            const isActief = actiefScenario === sv.key;
            if (!t) {
              return (
                <div key={sv.key} className="border-2 border-gray-200 bg-gray-50 rounded p-3 opacity-70">
                  <p className="text-[10px] font-bold uppercase tracking-wider text-gray-500">{sv.label}</p>
                  <p className="text-sm font-medium text-gray-500 mt-2">— geen data —</p>
                  <p className="text-[10px] text-gray-500 mt-1">Genereer scenario in stap 6 en 7.</p>
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
                  {t.heeftBegroting ? (
                    <p>Out-of-pocket: € {t.totaalOutOfPocket.toLocaleString("nl-NL")}</p>
                  ) : (
                    <p className="text-amber-700">Out-of-pocket: — nog niet uit stap 6</p>
                  )}
                  {t.heeftInterneUren ? (
                    <p>Interne uren: € {t.totaalInterneKosten.toLocaleString("nl-NL")} ({t.totaalInterneUren.toLocaleString("nl-NL")} u)</p>
                  ) : (
                    <p className="text-amber-700">Interne uren: — nog niet uit stap 7</p>
                  )}
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
      {actief && actief.perJaar.length > 0 && (
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
