"use client";

// Stap 11, de tabbladen "Evaluatie 3sides" en "Evaluatie intern": de exportknoppen (Word en
// PDF), in twee versies: een versie om aan 3sides te overhandigen (wat we aan 3sides
// communiceren, met de begeleidende brief) en een interne versie (alles, ook wat Cito zelf
// doet, ons oordeel en de onderbouwing). Met `versie` toont het paneel er één: het tabblad
// Evaluatie 3sides die voor 3sides, het tabblad Evaluatie intern de interne. Zonder `versie`
// beide naast elkaar. Leest zelf de sessie (useSession); het tabblad plaatst alleen dit paneel.
// Word: de uitsnede (evaluatie-uitsnede.ts) gaat naar maakEvaluatieWord en wordt gedownload.
// PDF: opent de afdrukweergave (/sessies/<id>/evaluatie-afdruk) in een nieuw tabblad; daar
// maak je de pdf met het afdrukvenster van de browser. Elke actie meldt wat er gebeurt:
// bezig, klaar of mislukt (met de reden).

import { useMemo, useState } from "react";
import { useSession } from "@/lib/session-context";
import { DEFAULT_INTEGRATIE_3SIDES, INTEGRATIE_SLEUTEL } from "@/lib/integratie-3sides-default";
import { DEFAULT_EVALUATIE_GESPREK, EVALUATIE_GESPREK_SLEUTEL } from "@/lib/evaluatie-gesprek-default";
import { oplossen } from "@/lib/doc-versie";
import { exportBestandsnaam, maakUitsnede, zonderLinktekens } from "@/lib/evaluatie-uitsnede";
import type { ExportVersie } from "@/lib/evaluatie-uitsnede";

type Stand =
  | { soort: "bezig"; tekst: string }
  | { soort: "klaar"; tekst: string }
  | { soort: "fout"; tekst: string };

const KEUZES: {
  versie: ExportVersie;
  titel: string;
  merk: string;
  zin: string;
  /** als alleen deze versie wordt getoond: waar de andere staat */
  andere: string;
  rand: string;
  merkCls: string;
}[] = [
  {
    versie: "intern",
    titel: "Interne versie",
    merk: "Intern Cito",
    zin: "Alles: wat we aan 3sides communiceren, en wat alleen voor Cito is: wat Cito zelf doet, ons oordeel met de notities en de onderbouwing per kader. Op elke pagina staat 'Intern Cito'.",
    andere: "De versie voor 3sides maak je op het tabblad Evaluatie 3sides.",
    rand: "border-l-[#003366]",
    merkCls: "border-[#003366] bg-[#003366] text-white",
  },
  {
    versie: "3sides",
    titel: "Voor 3sides",
    merk: "Om te overhandigen",
    zin: "Wat we aan 3sides communiceren, met de begeleidende brief: de agenda, de planning met wat er is geleverd en per kader onze bevinding, de feiten, wat we van 3sides vragen en de vraag voor het gesprek.",
    andere: "De interne versie maak je op het tabblad Evaluatie intern.",
    rand: "border-l-[#0e7490]",
    merkCls: "border-[#0e7490] bg-white text-[#0b5c72]",
  },
];

const KNOP = "inline-flex items-center justify-center gap-2 rounded-lg px-4 py-2 text-sm font-semibold transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#0066cc]";
const KNOP_VOL = `${KNOP} bg-[#003366] text-white hover:bg-[#004d99] disabled:cursor-wait disabled:opacity-70`;
const KNOP_RAND = `${KNOP} border border-[#003366] bg-white text-[#003366] hover:bg-[#003366] hover:text-white`;

function WordIcoon() {
  return (
    <svg viewBox="0 0 16 16" width="15" height="15" aria-hidden="true" focusable="false">
      <path d="M4 1.5h5.2L12.5 4.8V13a1.5 1.5 0 0 1-1.5 1.5H4A1.5 1.5 0 0 1 2.5 13V3A1.5 1.5 0 0 1 4 1.5z" fill="none" stroke="currentColor" strokeWidth="1.4" strokeLinejoin="round" />
      <path d="M5 7.2l1 4 1.5-3 1.5 3 1-4" fill="none" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function PdfIcoon() {
  return (
    <svg viewBox="0 0 16 16" width="15" height="15" aria-hidden="true" focusable="false">
      <path d="M4.5 6V2h7v4M4.5 11.5h-1A1.5 1.5 0 0 1 2 10V7.5A1.5 1.5 0 0 1 3.5 6h9A1.5 1.5 0 0 1 14 7.5V10a1.5 1.5 0 0 1-1.5 1.5h-1" fill="none" stroke="currentColor" strokeWidth="1.4" strokeLinejoin="round" />
      <path d="M4.5 9.5h7V14h-7z" fill="none" stroke="currentColor" strokeWidth="1.4" strokeLinejoin="round" />
    </svg>
  );
}

function Draaier() {
  return <span className="inline-block h-3.5 w-3.5 animate-spin rounded-full border-2 border-white/40 border-t-white" aria-hidden="true" />;
}

/** Plekken tussen haken die nog ingevuld moeten worden ("[naam]", "[datum gesprek]"), elk één keer. */
function invulplekken(waarde: unknown): string[] {
  const uit = new Set<string>();
  const loop = (v: unknown) => {
    if (typeof v === "string") for (const m of zonderLinktekens(v).matchAll(/\[[^[\]]{1,40}\]/g)) uit.add(m[0]);
    else if (Array.isArray(v)) v.forEach(loop);
    else if (v && typeof v === "object") Object.values(v).forEach(loop);
  };
  loop(waarde);
  return [...uit];
}

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

export default function EvaluatieExport({ versie }: { /** alleen deze versie tonen; zonder: beide */ versie?: ExportVersie }) {
  const { session } = useSession();
  const [stand, setStand] = useState<Partial<Record<ExportVersie, Stand>>>({});

  const bewaardAnalyse = session?.documenten?.[INTEGRATIE_SLEUTEL];
  const bewaardGesprek = session?.documenten?.[EVALUATIE_GESPREK_SLEUTEL];
  // Dezelfde documenten als de tabbladen van stap 11 (doc-versie.ts: oplossen).
  const bron = useMemo(
    () => ({
      analyse: oplossen(DEFAULT_INTEGRATIE_3SIDES, bewaardAnalyse).doc,
      gesprek: oplossen(DEFAULT_EVALUATIE_GESPREK, bewaardGesprek).doc,
    }),
    [bewaardAnalyse, bewaardGesprek]
  );
  // De versie voor 3sides heeft alleen een brief als die inhoud heeft, en de brief hoort af te
  // zijn voordat hij de deur uitgaat: een lege brief en plekken tussen haken hier melden.
  const brief = useMemo(() => {
    const sectie = maakUitsnede(bron.analyse, bron.gesprek, "3sides").brief;
    return { leeg: sectie === null, invulplekken: sectie ? invulplekken(sectie) : [] };
  }, [bron]);

  if (!session) return null;
  const sessieId = session.id;

  function zet(versie: ExportVersie, s: Stand) {
    setStand((vorige) => ({ ...vorige, [versie]: s }));
  }

  async function word(versie: ExportVersie) {
    const naam = exportBestandsnaam(versie, "docx");
    zet(versie, { soort: "bezig", tekst: "Het Word-bestand wordt gemaakt…" });
    try {
      // pas laden bij gebruik: de Word-bouwer (docx) hoort niet in de eerste lading van het tabblad
      const { maakEvaluatieWord } = await import("@/lib/evaluatie-word");
      const blob = await maakEvaluatieWord(maakUitsnede(bron.analyse, bron.gesprek, versie));
      download(blob, naam);
      zet(versie, { soort: "klaar", tekst: `Het Word-bestand is gedownload als ${naam}.` });
    } catch (e) {
      console.error("[evaluatie-export] Word-export mislukt:", e);
      const reden = e instanceof Error && e.message ? e.message : "Onbekende fout.";
      zet(versie, { soort: "fout", tekst: `Het Word-bestand is niet gemaakt. ${reden}` });
    }
  }

  const keuzes = versie ? KEUZES.filter((k) => k.versie === versie) : KEUZES;
  const een = keuzes.length === 1;

  return (
    <section aria-labelledby="evaluatie-export-kop">
      <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
        <h3 id="evaluatie-export-kop" className="text-base font-bold text-[#003366]">
          Delen als Word of PDF
        </h3>
        <p className="text-[13px] leading-relaxed text-[#4a5565]">
          {een ? keuzes[0].andere : "Kies eerst voor wie het stuk is; de twee versies verschillen in wat erin staat."}
        </p>
      </div>

      <div className={"mt-3 grid gap-3 " + (een ? "max-w-3xl" : "md:grid-cols-2")}>
        {keuzes.map((k) => {
          const s = stand[k.versie];
          const bezig = s?.soort === "bezig";
          const kopId = "evaluatie-export-" + k.versie;
          return (
            <article key={k.versie} aria-labelledby={kopId} className={`flex flex-col rounded-xl border border-cito-border border-l-4 ${k.rand} bg-white p-4`}>
              <div className="flex flex-wrap items-center gap-x-2.5 gap-y-1.5">
                <h4 id={kopId} className="text-[15px] font-bold leading-snug text-[#111827]">
                  {k.titel}
                </h4>
                <span className={`rounded-full border px-2.5 py-0.5 text-[11px] font-bold uppercase tracking-[0.07em] ${k.merkCls}`}>{k.merk}</span>
              </div>
              <p className="mt-1.5 text-[13px] leading-relaxed text-[#374151]">{k.zin}</p>
              {k.versie === "3sides" && brief.leeg && (
                <p className="mt-2 rounded-lg border border-amber-300 bg-amber-50 px-3 py-2 text-[13px] leading-relaxed text-amber-900" role="note">
                  De begeleidende brief is nog leeg. Vul hem in op het tabblad Evaluatie 3sides; zonder tekst komt er geen brief in deze versie.
                </p>
              )}
              {k.versie === "3sides" && brief.invulplekken.length > 0 && (
                <p className="mt-2 rounded-lg border border-amber-300 bg-amber-50 px-3 py-2 text-[13px] leading-relaxed text-amber-900" role="note">
                  In de brief staan nog plekken om in te vullen: {brief.invulplekken.join(", ")}. Vul ze in bij de begeleidende brief op het
                  tabblad Evaluatie 3sides, voordat je deze versie deelt.
                </p>
              )}

              <div className="mt-3 flex flex-wrap gap-2 pt-1 md:mt-auto md:pt-3">
                <button type="button" className={KNOP_VOL} onClick={() => void word(k.versie)} disabled={bezig} aria-busy={bezig}>
                  {bezig ? <Draaier /> : <WordIcoon />}
                  {bezig ? "Word maken…" : "Word"}
                </button>
                <a
                  className={KNOP_RAND}
                  href={`/sessies/${encodeURIComponent(sessieId)}/evaluatie-afdruk?versie=${k.versie}&afdrukken=1`}
                  target="_blank"
                  rel="noopener"
                  onClick={() =>
                    zet(k.versie, {
                      soort: "klaar",
                      tekst: "De afdrukweergave is geopend in een nieuw tabblad. Kies daar bij Bestemming: Opslaan als PDF.",
                    })
                  }
                >
                  <PdfIcoon />
                  PDF
                  <span className="sr-only"> (opent de afdrukweergave in een nieuw tabblad)</span>
                </a>
              </div>

              {/* altijd aanwezig, zodat een schermlezer de melding voorleest zodra die verschijnt */}
              <div aria-live="polite" className="empty:hidden">
                {s && s.soort !== "fout" && (
                  <p
                    className={`mt-3 rounded-lg border px-3 py-2 text-[13px] leading-relaxed ${
                      s.soort === "klaar" ? "border-emerald-200 bg-emerald-50 text-emerald-900" : "border-blue-200 bg-blue-50 text-blue-900"
                    }`}
                  >
                    {s.soort === "klaar" && <span aria-hidden="true">✓ </span>}
                    {s.tekst}
                  </p>
                )}
              </div>
              {s?.soort === "fout" && (
                <p className="mt-3 rounded-lg border border-red-300 bg-red-50 px-3 py-2 text-[13px] leading-relaxed text-red-900" role="alert">
                  <b>Mislukt.</b> {s.tekst}
                </p>
              )}
            </article>
          );
        })}
      </div>
    </section>
  );
}
