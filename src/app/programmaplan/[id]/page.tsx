"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { loadSessionFromSupabase } from "@/lib/persistence";
import type { DINSession } from "@/lib/types";
import { ProgrammaplanDocument } from "@/components/steps/ExportStep";

// Inhoudsopgave-structuur — synchroon met ProgrammaplanDocument hoofdstukken
const TOC: Array<{ id: string; nummer: string; titel: string; sub?: Array<{ id: string; titel: string }> }> = [
  { id: "hoofdstuk-1", nummer: "1.", titel: "Programmavisie en scope" },
  { id: "hoofdstuk-2", nummer: "2.", titel: "Programmadoelen" },
  { id: "hoofdstuk-3", nummer: "3.", titel: "Cross-sectorale uitkomst — de kern" },
  {
    id: "hoofdstuk-4",
    nummer: "4.",
    titel: "Raming",
    sub: [
      { id: "4-1-raming-out-of-pocket-kosten", titel: "4.1 Out-of-pocket kosten" },
      { id: "4-2-interne-uren", titel: "4.2 Interne uren" },
      { id: "4-3-totaaloverzicht-vier-scenario-s", titel: "4.3 Totaaloverzicht — vier scenario's" },
    ],
  },
  { id: "hoofdstuk-5", nummer: "5.", titel: "Programma-organisatie en RASCI" },
  { id: "hoofdstuk-6", nummer: "6.", titel: "Planning en roadmap" },
];

export default function PubliekProgrammaplanPage() {
  const { id } = useParams<{ id: string }>();
  const [session, setSession] = useState<DINSession | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    if (!id) return;
    setLoading(true);
    loadSessionFromSupabase(id)
      .then((s) => {
        if (cancelled) return;
        if (!s) {
          setError("Programmaplan niet gevonden of niet meer beschikbaar.");
        } else {
          setSession(s);
        }
      })
      .catch(() => {
        if (!cancelled) setError("Programmaplan kon niet geladen worden.");
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [id]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="inline-block w-10 h-10 border-4 border-cito-blue/20 border-t-cito-blue rounded-full animate-spin mb-3" />
          <p className="text-sm text-gray-500">Programmaplan laden…</p>
        </div>
      </div>
    );
  }

  if (error || !session) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="max-w-md text-center bg-white border border-gray-200 rounded-xl p-8 shadow-sm">
          <div className="text-cito-blue/60 mb-3">
            <svg className="h-12 w-12 mx-auto" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M9.879 7.519c1.171-1.025 3.071-1.025 4.242 0 1.172 1.025 1.172 2.687 0 3.712-.203.179-.43.326-.67.442-.745.361-1.45.999-1.45 1.827v.75M21 12a9 9 0 11-18 0 9 9 0 0118 0zm-9 5.25h.008v.008H12v-.008z" />
            </svg>
          </div>
          <h1 className="text-lg font-bold text-gray-800 mb-2">Programmaplan niet gevonden</h1>
          <p className="text-sm text-gray-600">{error ?? "De gedeelde link is mogelijk verlopen of het programmaplan is verwijderd."}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 py-8 print:bg-white print:py-0">
      <div className="max-w-7xl mx-auto px-4 print:max-w-none print:px-0">
        {/* Read-only header — verbergen bij print */}
        <header className="bg-white border border-gray-200 rounded-xl p-5 mb-6 flex items-center justify-between print:hidden">
          <div>
            <div className="text-[10px] uppercase tracking-[0.2em] text-cito-blue/70 font-bold mb-0.5">
              Programmaplan — leesversie
            </div>
            <h1 className="text-base font-bold text-cito-blue">{session.name}</h1>
          </div>
          <div className="flex items-center gap-3">
            <button
              onClick={() => window.print()}
              className="px-4 py-2 bg-cito-blue text-white rounded-lg text-sm font-medium hover:bg-cito-blue-light transition-colors"
            >
              Printen / opslaan als PDF
            </button>
          </div>
        </header>

        {/* Layout met sticky inhoudsopgave-zijbalk */}
        <div className="grid grid-cols-1 lg:grid-cols-[260px_1fr] gap-6 print:block print:gap-0">
          {/* Inhoudsopgave — verbergen bij print */}
          <aside className="print:hidden lg:sticky lg:top-6 lg:self-start">
            <nav className="bg-white border border-gray-200 rounded-xl p-4">
              <div className="text-[10px] uppercase tracking-wider text-cito-blue/70 font-bold mb-3">
                Inhoudsopgave
              </div>
              <ol className="space-y-1.5">
                {TOC.map((item) => (
                  <li key={item.id}>
                    <a
                      href={`#${item.id}`}
                      className="block text-sm text-gray-700 hover:text-cito-blue hover:bg-cito-blue/5 -mx-2 px-2 py-1 rounded transition-colors"
                    >
                      <span className="font-semibold text-cito-blue tabular-nums mr-1">{item.nummer}</span>
                      {item.titel}
                    </a>
                    {item.sub && (
                      <ol className="mt-1 ml-3 space-y-0.5 border-l border-cito-blue/15 pl-2">
                        {item.sub.map((s) => (
                          <li key={s.id}>
                            <a
                              href={`#${s.id}`}
                              className="block text-xs text-gray-600 hover:text-cito-blue hover:bg-cito-blue/5 -mx-1 px-1 py-0.5 rounded transition-colors"
                            >
                              {s.titel}
                            </a>
                          </li>
                        ))}
                      </ol>
                    )}
                  </li>
                ))}
              </ol>
              <div className="mt-4 pt-3 border-t border-gray-100 text-[11px] text-gray-400 leading-snug">
                Klik een hoofdstuk aan om er direct heen te springen.
              </div>
            </nav>
          </aside>

          {/* Document zelf */}
          <div className="bg-white border border-gray-200 rounded-xl overflow-hidden print:border-0 print:rounded-none print:shadow-none min-w-0">
            <ProgrammaplanDocument session={session} />
          </div>
        </div>

        {/* Footer — verbergen bij print */}
        <footer className="mt-6 text-center text-xs text-gray-400 print:hidden">
          Dit is een leesversie van het programmaplan. Voor wijzigingen — neem contact op met de programmaeigenaar.
        </footer>
      </div>
    </div>
  );
}
