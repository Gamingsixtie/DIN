"use client";

// Tabblad "Antwoord op het doel" — praatplaat langs het DIN (Doelen-Inspanningennetwerk):
// doel → baten → vermogen per domein (Cito-volgorde: cultuur → mens → data & systemen → processen)
// → werkstromen (inspanningen) met stand, plus de 0-meting over alle domeinen en de besluiten.
// De inhoud staat in de sessie (bronnenAnalyse.antwoordDoel, JSON-tekst), niet in de code.

import { useMemo, useState } from "react";
import type { BronnenAnalyse } from "@/lib/schemas";

interface Kolom {
  domeinen: { naam: string; kleur: string; vermogen: string }[];
  werkstroom: string;
  leads: string;
  stand: string;
  ligt: string[];
  ontbreekt: string[];
  nu: string[];
}
interface Praatplaat {
  titel: string;
  stand: string;
  doel: string;
  baten: string;
  antwoord: string;
  kolommen: Kolom[];
  nulmeting: Omit<Kolom, "domeinen">;
  secties?: { titel: string; toelichting?: string; kop: string[]; rijen: string[][] }[];
  besluiten: { vraag: string; wie: string }[];
  legenda: string;
}

function lees(tekst: string): Praatplaat | null {
  if (!tekst) return null;
  try {
    return JSON.parse(tekst) as Praatplaat;
  } catch {
    return null;
  }
}

function Lijst({ kop, items, accent }: { kop: string; items: string[]; accent: string }) {
  if (!items.length) return null;
  return (
    <div>
      <p className="text-xs font-bold uppercase tracking-wide" style={{ color: accent }}>{kop}</p>
      <ul className="mt-1 space-y-1">
        {items.map((t, i) => (
          <li key={i} className="text-sm text-gray-900 leading-snug flex gap-1.5">
            <span aria-hidden="true" style={{ color: accent }}>•</span>
            <span>{t}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}

function StandLabel({ stand }: { stand: string }) {
  return (
    <span className="inline-block rounded-full bg-amber-100 border border-amber-400 px-2.5 py-0.5 text-xs font-bold text-amber-900">
      {stand}
    </span>
  );
}

export default function AntwoordDoelTab({ ba, onNaarTab }: { ba: BronnenAnalyse; onNaarTab: (id: string) => void }) {
  const p = useMemo(() => lees(ba.antwoordDoel ?? ""), [ba.antwoordDoel]);
  const [melding, setMelding] = useState("");

  async function kopieerLink() {
    const url = new URL(window.location.href);
    url.searchParams.set("stap", "bronnen");
    url.searchParams.set("tab", "antwoord");
    try {
      await navigator.clipboard.writeText(url.toString());
      setMelding("Link gekopieerd");
    } catch {
      setMelding("Kopiëren lukte niet; kopieer de adresbalk");
    }
    setTimeout(() => setMelding(""), 3000);
  }

  if (!p) {
    return (
      <div className="rounded-xl border border-slate-300 bg-white p-6 text-sm text-gray-800">
        Voor deze sessie is nog geen antwoord op het doel vastgelegd. Bekijk de onderbouwing in de tabbladen{" "}
        <button type="button" className="font-semibold text-[#003366] underline" onClick={() => onNaarTab("dekking")}>Dekking per werkstroom</button> en{" "}
        <button type="button" className="font-semibold text-[#003366] underline" onClick={() => onNaarTab("punten")}>De vier punten</button>.
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-start justify-between gap-3 print:hidden">
        <p className="text-sm text-gray-700 max-w-2xl">
          Praatplaat om te delen en te bespreken. De onderbouwing per bron staat in de andere tabbladen.
        </p>
        <div className="flex items-center gap-2">
          {melding && <span role="status" className="text-sm font-semibold text-emerald-700">{melding}</span>}
          <button type="button" onClick={kopieerLink} className="px-3 py-2 rounded-lg text-sm font-semibold border border-[#003366] text-[#003366] bg-white hover:bg-blue-50">
            Link kopiëren
          </button>
          <button type="button" onClick={() => window.print()} className="px-3 py-2 rounded-lg text-sm font-semibold bg-[#003366] text-white hover:bg-[#002244]">
            Afdrukken / PDF
          </button>
        </div>
      </div>

      <section className="rounded-2xl border border-slate-300 bg-white p-5 space-y-4">
        <header>
          <h2 className="text-xl font-bold text-[#003366]">{p.titel}</h2>
          <p className="text-sm text-gray-700">{p.stand}</p>
        </header>

        {/* Doel en baten */}
        <div className="rounded-xl bg-[#003366] text-white p-4">
          <p className="text-xs font-bold uppercase tracking-wide text-blue-100">Doel</p>
          <p className="text-base font-semibold">{p.doel}</p>
        </div>
        <div className="rounded-xl border-2 border-[#003366] bg-blue-50 p-4">
          <p className="text-xs font-bold uppercase tracking-wide text-[#003366]">Baten</p>
          <p className="text-sm text-gray-900">{p.baten}</p>
        </div>
        <div className="rounded-xl border border-emerald-600 bg-emerald-50 p-4">
          <p className="text-xs font-bold uppercase tracking-wide text-emerald-800">Voorlopig antwoord</p>
          <p className="text-sm text-gray-900">{p.antwoord}</p>
        </div>

        {/* Vermogen per domein → werkstroom */}
        <div className="grid gap-3 md:grid-cols-3">
          {p.kolommen.map((k, i) => {
            const accent = k.domeinen[0]?.kleur ?? "#003366";
            return (
              <div key={i} className="rounded-xl border border-slate-300 overflow-hidden flex flex-col">
                <div className="flex">
                  {k.domeinen.map((d) => (
                    <div key={d.naam} className="flex-1 px-3 py-2 text-white" style={{ backgroundColor: d.kleur }}>
                      <p className="text-xs font-bold uppercase tracking-wide">{d.naam}</p>
                      <p className="text-xs leading-snug">{d.vermogen}</p>
                    </div>
                  ))}
                </div>
                <div className="p-3 space-y-3 flex-1 bg-white">
                  <div>
                    <p className="text-base font-bold text-gray-900">{k.werkstroom}</p>
                    <p className="text-xs text-gray-700">{k.leads}</p>
                    <div className="mt-1"><StandLabel stand={k.stand} /></div>
                  </div>
                  <Lijst kop="Wat er ligt" items={k.ligt} accent={accent} />
                  <Lijst kop="Wat ontbreekt" items={k.ontbreekt} accent={accent} />
                  <Lijst kop="Wat nu kan" items={k.nu} accent={accent} />
                </div>
              </div>
            );
          })}
        </div>

        {/* 0-meting over alle domeinen */}
        <div className="rounded-xl border border-slate-300 overflow-hidden">
          <div className="px-3 py-2 text-white text-xs font-bold uppercase tracking-wide" style={{ background: "linear-gradient(90deg,#d97706,#2563eb,#7c3aed,#059669)" }}>
            Alle vier de domeinen
          </div>
          <div className="p-3 grid gap-3 md:grid-cols-4 bg-white">
            <div>
              <p className="text-base font-bold text-gray-900">{p.nulmeting.werkstroom}</p>
              <p className="text-xs text-gray-700">{p.nulmeting.leads}</p>
              <div className="mt-1"><StandLabel stand={p.nulmeting.stand} /></div>
            </div>
            <Lijst kop="Wat er ligt" items={p.nulmeting.ligt} accent="#003366" />
            <Lijst kop="Wat ontbreekt" items={p.nulmeting.ontbreekt} accent="#003366" />
            <Lijst kop="Wat nu kan" items={p.nulmeting.nu} accent="#003366" />
          </div>
        </div>

        {/* Uitgebreide blokken: gele punten, bouwstenen, planning, gaten */}
        {(p.secties ?? []).map((s, si) => (
          <div key={si} className="rounded-xl border border-slate-300 overflow-hidden break-inside-avoid-page">
            <div className="bg-[#003366] px-4 py-2">
              <p className="text-sm font-bold text-white">{s.titel}</p>
              {s.toelichting && <p className="text-xs text-blue-100">{s.toelichting}</p>}
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-blue-50">
                  <tr>{s.kop.map((k, ki) => <th key={ki} className="text-left align-top px-3 py-2 text-xs font-bold uppercase tracking-wide text-[#003366] border-b border-slate-300">{k}</th>)}</tr>
                </thead>
                <tbody>
                  {s.rijen.map((r, ri) => (
                    <tr key={ri} className="odd:bg-white even:bg-slate-50 align-top">
                      {r.map((c, ci) => <td key={ci} className={"px-3 py-2 text-gray-900 whitespace-pre-line border-b border-slate-200 " + (ci === 0 ? "font-semibold" : "")}>{c}</td>)}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        ))}

        {/* Besluiten */}
        <div className="rounded-xl border-2 border-amber-500 bg-amber-50 p-4">
          <p className="text-xs font-bold uppercase tracking-wide text-amber-900">Om te besluiten</p>
          <ol className="mt-2 space-y-1.5 list-decimal pl-5">
            {p.besluiten.map((b, i) => (
              <li key={i} className="text-sm text-gray-900">
                <span className="font-semibold">{b.vraag}</span> <span className="text-gray-700">({b.wie})</span>
              </li>
            ))}
          </ol>
        </div>

        <p className="text-xs text-gray-700">{p.legenda}</p>
      </section>
    </div>
  );
}
