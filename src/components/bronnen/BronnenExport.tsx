"use client";

// Stap 12 — Bronnenanalyse: de exportknop "Download als Word". Leest zelf de sessie
// (useSession) en geeft dezelfde merges als de stap mee aan maakBronnenAnalyseWord, zodat de
// export precies toont wat de stap toont. Meldt altijd wat er gebeurt: bezig, klaar of fout.

import { useMemo, useState } from "react";
import { useSession } from "@/lib/session-context";
import type { BronnenAnalyse } from "@/lib/schemas";
import { mergeOrganigram } from "@/lib/organigram-default";
import { mergeBronnenAnalyse } from "@/lib/bronnenanalyse-default";
import { actieveBronnen } from "@/lib/bronnenanalyse-service";

type Stand =
  | { soort: "bezig"; tekst: string }
  | { soort: "klaar"; tekst: string }
  | { soort: "fout"; tekst: string };

/** Zet het bestand als download klaar onder de gegeven naam. */
function download(blob: Blob, naam: string) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = naam;
  document.body.appendChild(a);
  a.click();
  a.remove();
  window.setTimeout(() => URL.revokeObjectURL(url), 30_000);
}

function vandaagIso(): string {
  const d = new Date();
  const p = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`;
}

export default function BronnenExport() {
  const { session } = useSession();
  const [stand, setStand] = useState<Stand | null>(null);

  const ba = useMemo(
    () => mergeBronnenAnalyse(session?.bronnenAnalyse as Partial<BronnenAnalyse> | undefined),
    [session?.bronnenAnalyse],
  );
  const werkstromen = useMemo(() => mergeOrganigram(session?.organigram).werkstromen, [session?.organigram]);

  if (!session) return null;
  const aantalActief = actieveBronnen(ba).length;
  const bezig = stand?.soort === "bezig";

  async function maakWord() {
    const naam = `Bronnenanalyse Klant in Zicht ${vandaagIso()}.docx`;
    setStand({ soort: "bezig", tekst: "Het Word-bestand wordt gemaakt…" });
    try {
      // pas laden bij gebruik: de Word-bouwer (docx) hoort niet in de eerste lading van de stap
      const { maakBronnenAnalyseWord } = await import("@/lib/bronnenanalyse-word");
      const blob = await maakBronnenAnalyseWord({
        ba,
        werkstromen: werkstromen.map((w) => ({ id: w.id, naam: w.naam })),
        sessieNaam: session?.name,
      });
      download(blob, naam);
      setStand({ soort: "klaar", tekst: `Het Word-bestand is gedownload als ${naam}.` });
    } catch (e) {
      console.error("[bronnen-export] Word-export mislukt:", e);
      const melding = e instanceof Error && e.message ? e.message : "onbekende fout";
      setStand({ soort: "fout", tekst: `De export is mislukt: ${melding}` });
    }
  }

  return (
    <section aria-labelledby="bronnen-export-kop" className="rounded-lg border border-gray-300 bg-white p-4">
      <h3 id="bronnen-export-kop" className="text-base font-bold text-[#003366]">
        Uitkomsten delen
      </h3>
      <p className="mt-1 text-sm text-gray-700">
        Het Word-document bevat het register, het oordeel en de dekking per werkstroom, de vier punten, wat nu in
        gang kan en wat nog nodig is, en de analyse per bron.
      </p>
      <div className="mt-3 flex flex-wrap items-center gap-3">
        <button
          type="button"
          onClick={maakWord}
          disabled={bezig || aantalActief === 0}
          className="inline-flex items-center justify-center gap-2 rounded-lg bg-[#003366] px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-[#004d99] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#0066cc] disabled:cursor-not-allowed disabled:opacity-60"
        >
          {bezig && (
            <span
              className="inline-block h-3.5 w-3.5 animate-spin rounded-full border-2 border-white/40 border-t-white"
              aria-hidden="true"
            />
          )}
          Download als Word
        </button>
        {aantalActief === 0 && (
          <span className="text-sm text-gray-700">Er staan nog geen bronnen in het register; voeg eerst een bron toe.</span>
        )}
      </div>
      {stand && (
        <p
          role={stand.soort === "fout" ? "alert" : "status"}
          className={
            "mt-3 rounded-md border px-3 py-2 text-sm " +
            (stand.soort === "fout"
              ? "border-red-300 bg-red-50 text-red-800"
              : stand.soort === "klaar"
                ? "border-emerald-300 bg-emerald-50 text-emerald-900"
                : "border-blue-200 bg-blue-50 text-[#003366]")
          }
        >
          {stand.tekst}
        </p>
      )}
    </section>
  );
}
