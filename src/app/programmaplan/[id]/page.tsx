"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { loadSessionFromSupabase } from "@/lib/persistence";
import type { DINSession } from "@/lib/types";
import { ProgrammaplanDocument } from "@/components/steps/ExportStep";

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
      <div className="max-w-5xl mx-auto px-4 print:max-w-none print:px-0">
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

        {/* Document zelf */}
        <div className="bg-white border border-gray-200 rounded-xl overflow-hidden print:border-0 print:rounded-none print:shadow-none">
          <ProgrammaplanDocument session={session} />
        </div>

        {/* Footer — verbergen bij print */}
        <footer className="mt-6 text-center text-xs text-gray-400 print:hidden">
          Dit is een leesversie van het programmaplan. Voor wijzigingen — neem contact op met de programmaeigenaar.
        </footer>
      </div>
    </div>
  );
}
