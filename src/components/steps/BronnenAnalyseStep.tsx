"use client";

// Stap 12 — "Bronnenanalyse".
// Doel (opdracht Sanne, 12-10): per werkstroom zicht op wat we al hebben, wat daarvan
// bruikbaar is en wat nog ontbreekt — actiegericht, zodat duidelijk wordt wat nu al in
// gang kan. Vijf tabbladen:
// 1. Bronnenregister: alle bronnen (3sides-documenten, Miro-borden, mail, uploads) met
//    type, datum, herkomst, versie en status.
// 2. Analyse per bron: wat elke bron dekt per werkstroom, met citaat en vindplaats.
// 3. Dekking per werkstroom: wat hebben we al, wat is bruikbaar, wat is nog nodig.
// 4. De vier punten: wat er al is voor de vier punten van Sanne, en wat nog te doen is.
// 5. Acties: wat nog nodig is, oordeel per werkstroom (voorstel) en wat nu al in gang kan.
// Direct te openen met ?stap=bronnen&tab=<register|analyse|dekking|punten|acties>.
// Dit is het skelet (fundament): alleen-lezen register; de overige tabbladen volgen.
// Bewust GEEN schrijf-logica (updateSession) zodat er nooit lege state wordt opgeslagen.

import { useMemo, useState } from "react";
import { useSession } from "@/lib/session-context";
import type { BronnenAnalyse, BronStatus } from "@/lib/schemas";
import { mergeOrganigram } from "@/lib/organigram-default";
import { BRON_STATUS_LABELS, BRON_TYPE_LABELS, HERKOMST_LABELS, mergeBronnenAnalyse } from "@/lib/bronnenanalyse-default";
import { actieveBronnen, bronLabel } from "@/lib/bronnenanalyse-service";

const TABBLADEN = [
  { id: "register", label: "Bronnenregister" },
  { id: "analyse", label: "Analyse per bron" },
  { id: "dekking", label: "Dekking per werkstroom" },
  { id: "punten", label: "De vier punten" },
  { id: "acties", label: "Acties" },
] as const;

function beginTab(): number {
  if (typeof window === "undefined") return 0;
  const i = TABBLADEN.findIndex((t) => t.id === new URLSearchParams(window.location.search).get("tab"));
  return i < 0 ? 0 : i;
}

/** Zet het tabblad in de url, zonder navigatie; ?stap=bronnen erbij zodat de link na herladen klopt. */
function zetUrl(tabId: string) {
  const url = new URL(window.location.href);
  url.searchParams.set("stap", "bronnen");
  url.searchParams.set("tab", tabId);
  window.history.replaceState(window.history.state, "", url);
}

const STATUS_STIJL: Record<BronStatus, string> = {
  bruikbaar: "bg-emerald-100 text-emerald-900 border-emerald-300",
  deels_bruikbaar: "bg-amber-100 text-amber-900 border-amber-300",
  verouderd: "bg-gray-200 text-gray-800 border-gray-400",
  niet_geanalyseerd: "bg-white text-gray-800 border-gray-500",
};

function formatDatum(iso: string | undefined): string {
  if (!iso) return "—";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "—";
  return d.toLocaleDateString("nl-NL", { day: "numeric", month: "long", year: "numeric" });
}

const SKELET_TEKST: Record<string, string> = {
  analyse: "Analyse per bron: per bron wat ze dekt per werkstroom, met citaat en vindplaats.",
  dekking: "Dekking per werkstroom: wat we al hebben, wat bruikbaar is en wat nog nodig is.",
  punten: "De vier punten: wat er per punt al is en wat nog te doen is.",
  acties: "Acties: wat nog nodig is, het oordeel per werkstroom (voorstel) en wat nu al in gang kan.",
};

export default function BronnenAnalyseStep() {
  const { session } = useSession();
  const [actief, setActief] = useState(beginTab);
  const tab = TABBLADEN[actief];

  const ba = useMemo(
    () => mergeBronnenAnalyse(session?.bronnenAnalyse as Partial<BronnenAnalyse> | undefined),
    [session?.bronnenAnalyse],
  );
  const werkstromen = useMemo(() => mergeOrganigram(session?.organigram).werkstromen, [session?.organigram]);

  function kies(i: number) {
    zetUrl(TABBLADEN[i].id);
    setActief(i);
  }

  const bronnen = actieveBronnen(ba);

  return (
    <div className="space-y-4">
      <div>
        <h2 className="text-2xl font-bold text-[#003366]">Bronnenanalyse</h2>
        <p className="mt-1 text-sm text-gray-700">
          Alle bronnen op een rij: wat we per werkstroom al hebben, wat daarvan bruikbaar is en wat nog ontbreekt.
        </p>
      </div>

      <div role="tablist" aria-label="Onderdelen van stap 12" className="flex flex-wrap items-center gap-2">
        {TABBLADEN.map((t, i) => (
          <button
            key={t.id}
            type="button"
            role="tab"
            aria-selected={i === actief}
            onClick={() => kies(i)}
            className={
              "px-4 py-2 rounded-lg text-sm font-semibold border transition-colors " +
              (i === actief
                ? "bg-[#003366] text-white border-[#003366]"
                : "bg-white text-[#003366] border-slate-300 hover:border-[#003366]")
            }
          >
            {t.label}
          </button>
        ))}
      </div>

      {tab.id === "register" ? (
        <section className="rounded-xl border border-slate-300 bg-white p-4">
          <h3 className="text-lg font-bold text-[#003366]">Bronnenregister</h3>
          <p className="mt-1 text-sm text-gray-700">
            {bronnen.length} bronnen · {werkstromen.length} werkstromen in het organigram
          </p>
          {bronnen.length === 0 ? (
            <p className="mt-4 text-sm text-gray-900">Nog geen bronnen geregistreerd.</p>
          ) : (
            <div className="mt-4 overflow-x-auto">
              <table className="w-full text-sm text-gray-900 border-collapse">
                <thead>
                  <tr className="border-b-2 border-[#003366] text-left text-[#003366]">
                    <th className="py-2 pr-3 font-semibold">Titel</th>
                    <th className="py-2 pr-3 font-semibold">Type</th>
                    <th className="py-2 pr-3 font-semibold">Datum</th>
                    <th className="py-2 pr-3 font-semibold">Herkomst</th>
                    <th className="py-2 pr-3 font-semibold">Versie van</th>
                    <th className="py-2 pr-3 font-semibold">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {bronnen.map((b) => {
                    const status: BronStatus = b.analyse?.status ?? "niet_geanalyseerd";
                    return (
                      <tr key={b.id} className="border-b border-slate-200 align-top">
                        <td className="py-2 pr-3">
                          <span className="font-semibold">{b.titel}</span>
                          {b.bestandsnaam && <div className="text-sm text-gray-700">{b.bestandsnaam}</div>}
                        </td>
                        <td className="py-2 pr-3">{BRON_TYPE_LABELS[b.type] ?? "—"}</td>
                        <td className="py-2 pr-3 whitespace-nowrap">{formatDatum(b.datum)}</td>
                        <td className="py-2 pr-3">{HERKOMST_LABELS[b.herkomst] ?? "—"}</td>
                        <td className="py-2 pr-3">{b.versieVan ? bronLabel(ba, b.versieVan) : "—"}</td>
                        <td className="py-2 pr-3">
                          <span
                            className={
                              "inline-block rounded-full border px-2.5 py-0.5 text-xs font-semibold " +
                              STATUS_STIJL[status]
                            }
                          >
                            {BRON_STATUS_LABELS[status]}
                          </span>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </section>
      ) : (
        <section className="rounded-xl border border-slate-300 bg-white p-4">
          <h3 className="text-lg font-bold text-[#003366]">{tab.label}</h3>
          <p className="mt-1 text-sm text-gray-700">{SKELET_TEKST[tab.id]}</p>
        </section>
      )}
    </div>
  );
}
