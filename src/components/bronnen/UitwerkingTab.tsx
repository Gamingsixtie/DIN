"use client";

// Tabblad "Uitwerking": de onderbouwing achter de praatplaat, langs het document van de opdracht:
// de vier gele punten, de zes bouwstenen → werkstroom, de planning langs de drie fasen van het
// 90-dagenplan (fasematrix per werkstroom) en de gaten in de plannen van aanpak.
// De inhoud komt uit de sessie (bronnenAnalyse.antwoordDoel), niet uit de code.

import { useMemo } from "react";
import type { BronnenAnalyse } from "@/lib/schemas";
import { domeinKleuren, leesPraatplaat, MARKEER, type PpPlanItem, type Praatplaat } from "@/lib/praatplaat";

const BLAUW = "#003366";

function Kop({ id, nr, titel, sub }: { id: string; nr: string; titel: string; sub?: string }) {
  return (
    <div id={id} className="scroll-mt-24 flex items-end gap-3 border-b-2 border-[#003366] pb-2">
      <span className="text-3xl font-black leading-none text-[#003366]/25">{nr}</span>
      <div>
        <h3 className="text-lg font-extrabold tracking-tight text-[#003366]">{titel}</h3>
        {sub && <p className="text-[13px] text-gray-800">{sub}</p>}
      </div>
    </div>
  );
}

function Vlag({ v }: { v?: string }) {
  if (!v) return null;
  return <span className="rounded-full border border-amber-500 bg-amber-50 px-1.5 py-px text-[11px] font-bold text-amber-900 whitespace-nowrap">{v === "⚑" ? "⚑ wacht op 3sides" : "⚑ deels 3sides"}</span>;
}

function PlanChip({ it, kleur }: { it: PpPlanItem; kleur: string }) {
  return (
    <li
      className={"rounded-md bg-white px-2.5 py-1.5 text-[13px] leading-snug text-gray-900 " + (it.parkeer ? "border border-dashed border-slate-500" : "border border-slate-300")}
      style={{ borderLeft: `4px solid ${kleur}` }}
    >
      {(it.label || it.parkeer) && (
        <span className="mb-0.5 flex flex-wrap gap-1">
          {it.label && <span className="rounded bg-slate-200 px-1 text-[11px] font-bold text-gray-800">{it.label}</span>}
          {it.parkeer && <span className="rounded bg-slate-200 px-1 text-[11px] font-bold text-gray-800">Parkeerlijst</span>}
        </span>
      )}
      <span>{it.wat}</span>
      <span className="mt-1 flex flex-wrap items-center gap-1">
        {it.tot && <span className="rounded bg-blue-50 px-1 text-[11px] font-semibold text-[#003366]">loopt t/m fase {it.tot}</span>}
        {it.extra && <span className="rounded bg-blue-50 px-1 text-[11px] font-semibold text-[#003366]">{it.extra}</span>}
        <Vlag v={it.vlag} />
      </span>
    </li>
  );
}

function Planning({ p }: { p: Praatplaat }) {
  const pl = p.uitwerking.planning;
  return (
    <div className="overflow-x-auto rounded-xl border border-slate-300 bg-white">
      <div className="min-w-[980px]">
        <div className="grid grid-cols-[190px_repeat(4,1fr)] bg-[#003366] text-white">
          <div className="px-3 py-2 text-xs font-extrabold uppercase tracking-wider">Werkstroom</div>
          {pl.fasen.map((f) => (
            <div key={f.id} className="border-l border-white/20 px-3 py-2">
              <p className="text-xs font-extrabold uppercase tracking-wider">{f.label}</p>
              <p className="text-[11px] text-blue-100">{f.week}</p>
            </div>
          ))}
        </div>
        {pl.werkstromen.map((w) => {
          const kleuren = domeinKleuren(p, w.domeinen);
          const kleur = kleuren[0] ?? BLAUW;
          return (
            <div key={w.naam} className="grid grid-cols-[190px_repeat(4,1fr)] border-t border-slate-300 even:bg-slate-50">
              <div className="flex flex-col justify-start gap-1.5 px-3 py-3">
                <div className="flex h-1.5 w-16 overflow-hidden rounded" aria-hidden="true">{kleuren.map((k, i) => <div key={i} className="flex-1" style={{ backgroundColor: k }} />)}</div>
                <p className="text-sm font-extrabold text-gray-900">{w.naam}</p>
              </div>
              {pl.fasen.map((f) => {
                const items = w.items.filter((it) => it.fase === f.id);
                return (
                  <ul key={f.id} className="space-y-1.5 border-l border-slate-200 px-2 py-2.5">
                    {items.length ? items.map((it, i) => <PlanChip key={i} it={it} kleur={kleur} />) : <li className="px-1 text-xs text-gray-700">—</li>}
                  </ul>
                );
              })}
            </div>
          );
        })}
      </div>
    </div>
  );
}

export default function UitwerkingTab({ ba, onNaarTab }: { ba: BronnenAnalyse; onNaarTab: (id: string) => void }) {
  const p = useMemo(() => leesPraatplaat(ba.antwoordDoel), [ba.antwoordDoel]);
  if (!p) {
    return <div className="rounded-xl border border-slate-300 bg-white p-6 text-sm text-gray-800">Voor deze sessie is nog geen uitwerking vastgelegd.</div>;
  }
  const u = p.uitwerking;
  const kleurVan = (ids: string[]) => domeinKleuren(p, ids as never);
  const nav = [
    ["punten", "De vier gele punten"],
    ["bouwstenen", "Zes bouwstenen → werkstroom"],
    ["planning", "Planning per fase"],
    ["gaten", "Gaten"],
  ];

  return (
    <div className="space-y-8" style={{ printColorAdjust: "exact", WebkitPrintColorAdjust: "exact" }}>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="max-w-3xl text-sm text-gray-800">
          De uitwerking achter de{" "}
          <button type="button" onClick={() => onNaarTab("antwoord")} className="font-semibold text-[#003366] underline">praatplaat</button>, langs{" "}
          <span className="rounded px-1 font-semibold italic" style={{ background: MARKEER }}>‘{p.document}’</span>.
        </p>
        <nav aria-label="Onderdelen" className="flex flex-wrap gap-2 print:hidden">
          {nav.map(([id, label]) => (
            <a key={id} href={`#${id}`} className="rounded-full border border-[#003366] px-3 py-1 text-xs font-semibold text-[#003366] hover:bg-blue-50">{label}</a>
          ))}
        </nav>
      </div>

      {/* 1. Gele punten */}
      <section className="space-y-3">
        <Kop id="punten" nr="01" titel="De vier gele punten: wat er al ligt en wat nog moet" sub={p.vraag} />
        <div className="grid gap-4 lg:grid-cols-2">
          {u.punten.map((pt) => (
            <article key={pt.nr} className="flex flex-col overflow-hidden rounded-xl border border-slate-300 bg-white break-inside-avoid">
              <header className="flex items-start gap-3 border-b border-slate-200 px-4 py-3">
                <span className="grid h-8 w-8 shrink-0 place-items-center rounded-full bg-yellow-300 text-sm font-black text-gray-900">{pt.nr}</span>
                <h4 className="text-base font-extrabold leading-snug text-gray-900"><span className="rounded px-1" style={{ background: MARKEER }}>{pt.titel}</span></h4>
              </header>
              <div className="grid flex-1 gap-4 px-4 py-3 md:grid-cols-2">
                <div>
                  <p className="text-[11px] font-extrabold uppercase tracking-wider text-emerald-800">Wat er al ligt</p>
                  <ul className="mt-1.5 space-y-1.5">{pt.ligt.map((t, i) => <li key={i} className="flex gap-2 text-[13px] leading-snug text-gray-900"><span aria-hidden="true" className="font-bold text-emerald-700">✓</span><span>{t}</span></li>)}</ul>
                </div>
                <div>
                  <p className="text-[11px] font-extrabold uppercase tracking-wider text-[#003366]">Wat nog moet · voorstel</p>
                  <ul className="mt-1.5 space-y-1.5">{pt.moet.map((t, i) => <li key={i} className="flex gap-2 text-[13px] leading-snug text-gray-900"><span aria-hidden="true" className="font-bold text-[#003366]">→</span><span>{t}</span></li>)}</ul>
                </div>
              </div>
              <footer className="border-t border-slate-200 bg-slate-50 px-4 py-2.5 text-[13px] text-gray-900">
                <span className="font-bold text-[#003366]">Plek in het DIN (voorstel): </span>{pt.plek}
                {pt.wie && <><br /><span className="font-bold text-[#003366]">Wie: </span>{pt.wie}</>}
              </footer>
            </article>
          ))}
        </div>
      </section>

      {/* 2. Bouwstenen */}
      <section className="space-y-3">
        <Kop id="bouwstenen" nr="02" titel="De zes bouwstenen uit het document → werkstroom" sub="Uitkomst van de werkstroomtoets (drie beoordelaars, meerderheid). Het document vraagt geen vijfde werkstroom (voorstel)." />
        <ol className="divide-y divide-slate-200 overflow-hidden rounded-xl border border-slate-300 bg-white">
          {u.bouwstenen.map((b) => {
            const kleuren = kleurVan(b.domeinen);
            return (
              <li key={b.nr} className="grid gap-2 px-4 py-3 md:grid-cols-[minmax(220px,1fr)_28px_minmax(260px,1.4fr)_minmax(200px,1fr)] md:items-center">
                <p className="text-sm font-bold text-gray-900"><span className="mr-2 text-[#003366]/40">{b.nr}</span>{b.naam}</p>
                <span aria-hidden="true" className="hidden text-center font-bold text-[#003366] md:block">→</span>
                <div className="flex items-center gap-2">
                  <div className="flex h-8 w-1.5 shrink-0 flex-col overflow-hidden rounded" aria-hidden="true">{kleuren.map((k, i) => <div key={i} className="flex-1" style={{ backgroundColor: k }} />)}</div>
                  <div>
                    <p className="text-sm font-bold text-gray-900">{b.werkstroom}</p>
                    <p className="text-xs text-gray-700">{b.vermogensdeel} · {b.domeinlabel}</p>
                  </div>
                </div>
                <p className="text-[13px] text-gray-800">{b.opmerking}</p>
              </li>
            );
          })}
        </ol>
      </section>

      {/* 3. Planning */}
      <section className="space-y-3">
        <Kop id="planning" nr="03" titel="Planning langs de drie fasen van het 90-dagenplan" sub={u.planning.toelichting} />
        <div className="flex flex-wrap items-center gap-3 text-xs text-gray-800">
          <span className="inline-flex items-center gap-1.5"><span className="h-3 w-5 rounded border border-slate-300 bg-white" style={{ borderLeft: "4px solid #7c3aed" }} />deliverable (strook = domein)</span>
          <span className="inline-flex items-center gap-1.5"><span className="h-3 w-5 rounded border border-dashed border-slate-500 bg-white" />parkeerlijst</span>
          <Vlag v="⚑" /><Vlag v="⚑ deels" />
        </div>
        <Planning p={p} />
      </section>

      {/* 4. Gaten */}
      <section className="space-y-3">
        <Kop id="gaten" nr="04" titel="Gaten: wat nu in geen plan van aanpak staat" sub="De gaten zitten in de plannen van aanpak en de programmaorganisatie, niet in de indeling van de werkstromen." />
        <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
          {u.gaten.map((g) => (
            <article key={g.gat} className="rounded-xl border border-slate-300 bg-white p-4 break-inside-avoid" style={{ borderLeft: "4px solid #be123c" }}>
              <p className="text-sm font-extrabold text-gray-900">{g.gat}</p>
              <p className="mt-1 text-[13px] leading-snug text-gray-900"><span className="font-semibold text-[#003366]">Voorstel: </span>{g.voorstel}</p>
              <p className="mt-1.5 text-xs text-gray-800"><span className="font-semibold">Wie besluit (voorstel): </span>{g.wie}</p>
            </article>
          ))}
        </div>
      </section>

      <footer className="flex flex-wrap gap-x-4 gap-y-1 border-t border-slate-300 pt-3 text-xs text-gray-800">
        {p.legenda.map((l) => <span key={l}>{l}</span>)}
      </footer>
    </div>
  );
}
