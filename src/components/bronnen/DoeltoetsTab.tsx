"use client";

// Tabblad "Doeltoets" (stap 12): brengt wat we hebben en plannen ons naar het doel? Met het document
// ‘Cito BV – Integraal klantbeeld en outside-in werken: eerste stappen’ als leidraad: conclusie, toets per
// werkstroom (elke activiteit getoetst vanuit het doel, niet aangenomen), wat mist, de concretiseringsslag,
// het fasenplan (superconcreet), weekoverzicht, voorstel 1 en 2 met advies, besluiten en de uitwerking per
// bouwsteen. Inhoud uit de sessie (bronnenAnalyse.doeltoets, JSON-tekst), niet uit de code.

import { useMemo, useState } from "react";
import type { BronnenAnalyse } from "@/lib/schemas";

/* eslint-disable @typescript-eslint/no-explicit-any */
type Los = any;

const BLAUW = "#003366";
const ORDEEL_KLEUR: Record<string, string> = {
  nodig: "bg-emerald-50 border-emerald-600 text-emerald-900",
  aanpassen: "bg-amber-50 border-amber-500 text-amber-900",
  "niet nodig": "bg-rose-50 border-rose-600 text-rose-900",
  later: "bg-slate-100 border-slate-400 text-gray-800",
  behouden: "bg-emerald-50 border-emerald-600 text-emerald-900",
  nieuw: "bg-blue-50 border-[#003366] text-[#003366]",
};
const WS_KLEUR: Record<string, string> = {
  "nodig zoals hij is": "bg-emerald-600",
  "nodig met aanpassing": "bg-amber-500",
  "niet nodig in deze vorm": "bg-rose-600",
};

const lijst = (x: unknown): Los[] => (Array.isArray(x) ? x : []);
const tekst = (x: unknown): string => (x === undefined || x === null ? "" : typeof x === "string" ? x : Array.isArray(x) ? x.join(", ") : typeof x === "object" ? Object.values(x as object).filter((v) => typeof v === "string").join(" · ") : String(x));

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

function Badge({ waarde }: { waarde: string }) {
  if (!waarde) return null;
  return <span className={"rounded-full border px-2 py-px text-[11px] font-bold whitespace-nowrap " + (ORDEEL_KLEUR[waarde] ?? "bg-slate-100 border-slate-400 text-gray-800")}>{waarde}</span>;
}

function Punten({ items, teken = "•", kleur = BLAUW }: { items: Los[]; teken?: string; kleur?: string }) {
  if (!items.length) return null;
  return (
    <ul className="space-y-1.5">
      {items.map((t, i) => (
        <li key={i} className="flex gap-2 text-[13px] leading-snug text-gray-900">
          <span aria-hidden="true" className="font-bold" style={{ color: kleur }}>{teken}</span>
          <span>{typeof t === "string" ? t : tekst(t.wat ?? t.tekst ?? t)}{typeof t === "object" && t?.waarom ? <span className="block text-xs text-gray-700">{tekst(t.waarom)}</span> : null}{typeof t === "object" && t?.waaromNodig ? <span className="block text-xs text-gray-700">{tekst(t.waaromNodig)}</span> : null}</span>
        </li>
      ))}
    </ul>
  );
}

export default function DoeltoetsTab({ ba, onNaarTab }: { ba: BronnenAnalyse; onNaarTab: (id: string) => void }) {
  const d: Los = useMemo(() => { try { return ba.doeltoets ? JSON.parse(ba.doeltoets) : null; } catch { return null; } }, [ba.doeltoets]);
  const [openLijn, setOpenLijn] = useState<Record<string, boolean>>({});

  if (!d) {
    return (
      <div className="rounded-xl border border-slate-300 bg-white p-6 text-sm text-gray-800">
        De doeltoets is voor deze sessie nog niet vastgelegd. Zie intussen de{" "}
        <button type="button" onClick={() => onNaarTab("antwoord")} className="font-semibold text-[#003366] underline">praatplaat</button>.
      </div>
    );
  }

  const c: Los = d.conclusie ?? {};
  const oordeel = tekst(c.antwoord?.oordeel ?? c.oordeel);
  const nav = [
    ["conclusie", "Conclusie"], ["werkstromen", "Toets per werkstroom"], ["mist", "Wat mist"], ["concretisering", "Concretiseringsslag"],
    ["fasen", "Fasenplan"], ["weken", "Weekoverzicht"], ["voorstellen", "Voorstel 1 en 2"], ["besluiten", "Besluiten"], ["lijnen", "Per bouwsteen"],
  ];

  return (
    <div className="space-y-8" style={{ printColorAdjust: "exact", WebkitPrintColorAdjust: "exact" }}>
      <div className="flex flex-wrap items-center justify-between gap-3 print:hidden">
        <nav aria-label="Onderdelen" className="flex flex-wrap gap-2">
          {nav.map(([id, label]) => <a key={id} href={`#${id}`} className="rounded-full border border-[#003366] px-3 py-1 text-xs font-semibold text-[#003366] hover:bg-blue-50">{label}</a>)}
        </nav>
        <button type="button" onClick={() => window.print()} className="rounded-lg border border-[#003366] bg-white px-3 py-2 text-sm font-semibold text-[#003366] hover:bg-blue-50">Afdrukken / PDF</button>
      </div>

      {/* Kop en antwoord */}
      <header className="rounded-2xl border border-slate-300 bg-white p-6" style={{ backgroundImage: "linear-gradient(rgba(0,51,102,0.045) 1px, transparent 1px), linear-gradient(90deg, rgba(0,51,102,0.045) 1px, transparent 1px)", backgroundSize: "28px 28px" }}>
        <p className="text-[11px] font-extrabold uppercase tracking-[0.18em] text-[#003366]">Doeltoets · met het document als leidraad</p>
        <h2 className="mt-1 text-2xl font-extrabold leading-tight tracking-tight text-[#003366] md:text-3xl">{tekst(d.titel) || "Brengt wat we hebben en plannen ons naar het doel?"}</h2>
        {d.vraag && <p className="mt-2 text-sm italic text-gray-800">“{tekst(d.vraag)}”</p>}
        {lijst(d.antwoord).length > 0 && (
          <ol className="mt-4 grid gap-3 md:grid-cols-2 xl:grid-cols-5">
            {lijst(d.antwoord).map((z, i) => (
              <li key={i} className="rounded-xl border border-slate-300 bg-white p-3" style={{ borderTop: `4px solid ${BLAUW}` }}>
                <p className="text-2xl font-black leading-none text-[#003366]/25">{String(i + 1).padStart(2, "0")}</p>
                <p className="mt-1 text-[13px] leading-snug text-gray-900">{tekst(z)}</p>
              </li>
            ))}
          </ol>
        )}
      </header>

      {/* Conclusie */}
      <section className="space-y-3">
        <Kop id="conclusie" nr="01" titel="Conclusie: is dit de juiste manier?" sub="Zijn de werkstromen en de activiteiten, vanuit het doel geredeneerd, de juiste om het doel binnen de fasen van het document te halen?" />
        <div className="rounded-xl border-2 border-[#003366] bg-white p-5">
          {oordeel && <p className="text-lg font-extrabold text-[#003366]">Oordeel: {oordeel}</p>}
          <div className="mt-2"><Punten items={lijst(c.antwoord?.onderbouwing ?? c.onderbouwing)} teken="→" /></div>
          {c.indeling && (
            <div className="mt-4 rounded-lg bg-amber-50 border border-amber-400 p-3 text-[13px] text-gray-900">
              <p className="font-bold text-amber-900">Indeling van de werkstromen</p>
              <p>{tekst(c.indeling.voorstel ?? c.indeling)}{c.indeling.besluitBij ? ` · Besluit bij: ${tekst(c.indeling.besluitBij)}` : ""}</p>
            </div>
          )}
        </div>
      </section>

      {/* Toets per werkstroom */}
      <section className="space-y-3">
        <Kop id="werkstromen" nr="02" titel="Toets per werkstroom: elke activiteit vanuit het doel" sub="Niet aangenomen maar getoetst: is elke huidige activiteit nodig om het doel binnen de fasen te halen, en wat ontbreekt?" />
        <div className="grid gap-4 xl:grid-cols-2">
          {lijst(d.werkstroomToets).map((w, i) => (
            <article key={i} className="overflow-hidden rounded-xl border border-slate-300 bg-white break-inside-avoid">
              <header className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-200 px-4 py-3">
                <h4 className="text-base font-extrabold text-gray-900">{tekst(w.werkstroom)}</h4>
                <span className={"rounded-full px-2.5 py-0.5 text-xs font-bold text-white " + (WS_KLEUR[tekst(w.oordeelWerkstroom)] ?? "bg-slate-600")}>{tekst(w.oordeelWerkstroom)}</span>
              </header>
              <div className="space-y-3 px-4 py-3">
                {w.waaromOordeel && <p className="text-[13px] text-gray-900">{tekst(w.waaromOordeel)}</p>}
                <div className="flex flex-wrap gap-1.5 text-xs">
                  {["nodig", "aanpassen", "niet nodig", "later"].map((o) => {
                    const n = lijst(w.huidigeActiviteiten).filter((a) => a.oordeel === o).length;
                    return n ? <span key={o} className={"rounded-md border px-2 py-0.5 font-bold " + ORDEEL_KLEUR[o]}>{n} {o}</span> : null;
                  })}
                </div>
                <details className="group">
                  <summary className="cursor-pointer text-sm font-semibold text-[#003366] underline">Huidige activiteiten ({lijst(w.huidigeActiviteiten).length})</summary>
                  <ul className="mt-2 space-y-1.5">
                    {lijst(w.huidigeActiviteiten).map((a, j) => (
                      <li key={j} className="rounded-lg border border-slate-200 px-3 py-2">
                        <div className="flex flex-wrap items-start justify-between gap-2">
                          <p className="text-[13px] font-semibold text-gray-900">{tekst(a.deliverable)}</p>
                          <Badge waarde={tekst(a.oordeel)} />
                        </div>
                        <p className="text-xs text-gray-800">{tekst(a.waarom)}{a.aanpassing ? ` · Aanpassing: ${tekst(a.aanpassing)}` : ""}</p>
                      </li>
                    ))}
                  </ul>
                </details>
                {lijst(w.ontbreekt).length > 0 && (
                  <div>
                    <p className="text-[11px] font-extrabold uppercase tracking-wider text-rose-700">Ontbreekt in deze werkstroom</p>
                    <div className="mt-1"><Punten items={lijst(w.ontbreekt)} teken="+" kleur="#be123c" /></div>
                  </div>
                )}
                {w.conclusie && <p className="rounded-lg bg-slate-50 px-3 py-2 text-[13px] font-semibold text-gray-900">{tekst(w.conclusie)}</p>}
              </div>
            </article>
          ))}
        </div>
      </section>

      {/* Wat mist en wat anders */}
      <section className="space-y-3">
        <Kop id="mist" nr="03" titel="Wat missen we, en wat moet anders" />
        <div className="grid gap-4 lg:grid-cols-2">
          <div className="rounded-xl border border-rose-300 bg-white p-4">
            <p className="text-[11px] font-extrabold uppercase tracking-wider text-rose-700">Wat missen we</p>
            <ul className="mt-2 space-y-2">
              {lijst(c.mist).map((m, i) => (
                <li key={i} className="text-[13px] text-gray-900"><span className="font-bold">{tekst(m.wat ?? m)}</span>{m.fase ? <span className="ml-1 rounded bg-slate-100 px-1 text-[11px] font-bold text-gray-800">fase {tekst(m.fase)}</span> : null}{m.waarom ? <span className="block text-xs text-gray-700">{tekst(m.waarom)}</span> : null}</li>
              ))}
            </ul>
          </div>
          <div className="rounded-xl border border-amber-300 bg-white p-4">
            <p className="text-[11px] font-extrabold uppercase tracking-wider text-amber-800">Wat moet anders (voorstel)</p>
            <ul className="mt-2 space-y-2">
              {lijst(c.anders).map((a, i) => (
                <li key={i} className="text-[13px] text-gray-900"><span className="font-bold">{tekst(a.werkstroom)}</span>{a.aanpassing ? `: ${tekst(a.aanpassing)}` : ""}
                  {[["erbij", "+"], ["eraf", "–"], ["anders", "~"]].map(([k, t]) => lijst(a[k]).length ? <span key={k} className="block text-xs text-gray-800">{t} {lijst(a[k]).map(tekst).join(" · ")}</span> : null)}
                </li>
              ))}
            </ul>
          </div>
        </div>
      </section>

      {/* Concretiseringsslag */}
      <section className="space-y-3">
        <Kop id="concretisering" nr="04" titel="De concretiseringsslag: zo maken we het concreet" sub={tekst(c.concretisering?.uitleg)} />
        <ol className="relative space-y-3 border-l-2 border-[#003366]/30 pl-6">
          {lijst(c.concretisering?.stappen).map((s, i) => (
            <li key={i} className="relative rounded-xl border border-slate-300 bg-white p-4">
              <span className="absolute -left-[37px] top-4 grid h-6 w-6 place-items-center rounded-full bg-[#003366] text-xs font-black text-white">{i + 1}</span>
              <p className="text-sm font-extrabold text-gray-900">{tekst(s.stap ?? s.wat)}</p>
              {s.stap && s.wat && <p className="text-[13px] text-gray-900">{tekst(s.wat)}</p>}
              <p className="mt-1 flex flex-wrap gap-x-4 text-xs text-gray-800">
                {s.wie && <span><span className="font-bold">Wie:</span> {tekst(s.wie)}</span>}
                {s.wanneer && <span><span className="font-bold">Wanneer:</span> {tekst(s.wanneer)}</span>}
                {s.resultaat && <span><span className="font-bold">Resultaat:</span> {tekst(s.resultaat)}</span>}
              </p>
            </li>
          ))}
        </ol>
        {lijst(c.concretisering?.eersteTweeWeken).length > 0 && (
          <div className="rounded-xl border-2 border-emerald-600 bg-emerald-50 p-4">
            <p className="text-sm font-extrabold text-emerald-900">De eerste twee weken</p>
            <div className="mt-1"><Punten items={lijst(c.concretisering?.eersteTweeWeken)} teken="✓" kleur="#047857" /></div>
          </div>
        )}
      </section>

      {/* Fasenplan */}
      <section className="space-y-3">
        <Kop id="fasen" nr="05" titel="Fasenplan langs het 90-dagenplan" sub="Per activiteit: week, resultaat, eigenaar, klaar als en de eerste stap." />
        <div className="grid gap-4 xl:grid-cols-3">
          {lijst(d.fasen).map((f, i) => (
            <div key={i} className="flex flex-col overflow-hidden rounded-xl border border-slate-300 bg-white">
              <div className="bg-[#003366] px-4 py-2 text-white">
                <p className="text-sm font-extrabold">{tekst(f.label) || `Fase ${tekst(f.id)}`}</p>
                <p className="text-xs text-blue-100">{tekst(f.week)}{f.doel ? ` · ${tekst(f.doel)}` : ""}</p>
              </div>
              <ul className="flex-1 space-y-2 p-3">
                {lijst(f.activiteiten).map((a, j) => (
                  <li key={j} className="rounded-lg border border-slate-200 p-3">
                    <div className="flex flex-wrap items-start justify-between gap-2">
                      <p className="text-[13px] font-bold leading-snug text-gray-900">{tekst(a.wat)}</p>
                      <Badge waarde={tekst(a.vergelijkHuidig)} />
                    </div>
                    <dl className="mt-1 grid grid-cols-[auto_1fr] gap-x-2 gap-y-0.5 text-xs text-gray-900">
                      {a.weken && <><dt className="font-bold text-[#003366]">Week</dt><dd>{tekst(a.weken)}</dd></>}
                      {a.resultaat && <><dt className="font-bold text-[#003366]">Resultaat</dt><dd>{tekst(a.resultaat)}</dd></>}
                      {a.eigenaar && <><dt className="font-bold text-[#003366]">Eigenaar</dt><dd>{tekst(a.eigenaar)}</dd></>}
                      {a.klaarAls && <><dt className="font-bold text-[#003366]">Klaar als</dt><dd>{tekst(a.klaarAls)}</dd></>}
                      {a.eersteStap && <><dt className="font-bold text-[#003366]">Eerste stap</dt><dd>{tekst(a.eersteStap)}</dd></>}
                      {a.besluit && <><dt className="font-bold text-amber-800">Besluit</dt><dd>{tekst(a.besluit)}</dd></>}
                    </dl>
                  </li>
                ))}
              </ul>
              {f.mijlpaal && <p className="border-t border-slate-200 bg-amber-50 px-4 py-2 text-[13px] font-semibold text-amber-950">Mijlpaal: {tekst(f.mijlpaal)}</p>}
            </div>
          ))}
        </div>
        {lijst(d.schuift).length > 0 && (
          <div className="rounded-xl border border-slate-300 bg-white p-4">
            <p className="text-[11px] font-extrabold uppercase tracking-wider text-gray-800">Schuift naar later</p>
            <div className="mt-1"><Punten items={lijst(d.schuift)} teken="↷" kleur="#475569" /></div>
          </div>
        )}
      </section>

      {/* Weekoverzicht */}
      {lijst(d.weekoverzicht).length > 0 && (
        <section className="space-y-3">
          <Kop id="weken" nr="06" titel="Weekoverzicht week 1 tot en met 12" sub="Startdatum van week 1: te bepalen." />
          <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {lijst(d.weekoverzicht).map((w, i) => (
              <div key={i} className="rounded-lg border border-slate-300 bg-white p-3">
                <p className="text-xs font-extrabold uppercase tracking-wider text-[#003366]">Week {tekst(w.week)}</p>
                <div className="mt-1"><Punten items={lijst(w.watGebeurt)} /></div>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* Voorstellen */}
      <section className="space-y-3">
        <Kop id="voorstellen" nr="07" titel="Voorstel 1 en voorstel 2" sub="Het besluit over de indeling ligt bij de programma-eigenaar en de programma-architect." />
        <div className="grid gap-4 lg:grid-cols-2">
          {lijst(d.voorstellen).map((v, i) => (
            <article key={i} className="overflow-hidden rounded-xl border-2 border-[#003366]/40 bg-white">
              <header className="bg-blue-50 px-4 py-3">
                <p className="text-xs font-extrabold uppercase tracking-wider text-[#003366]">Voorstel {tekst(v.nr) || i + 1}</p>
                <h4 className="text-base font-extrabold text-gray-900">{tekst(v.titel)}</h4>
                {v.kern && <p className="mt-1 text-[13px] text-gray-900">{tekst(v.kern)}</p>}
              </header>
              <div className="space-y-3 p-4">
                {lijst(v.dragers).length > 0 && (
                  <div>
                    <p className="text-[11px] font-extrabold uppercase tracking-wider text-[#003366]">Indeling</p>
                    <ul className="mt-1 space-y-1">{lijst(v.dragers).map((dr, j) => <li key={j} className="text-[13px] text-gray-900"><span className="font-bold">{tekst(dr.naam)}</span>{lijst(dr.activiteiten).length ? `: ${lijst(dr.activiteiten).map(tekst).join(" · ")}` : ""}</li>)}</ul>
                  </div>
                )}
                <div className="grid gap-3 sm:grid-cols-2">
                  <div><p className="text-[11px] font-extrabold uppercase tracking-wider text-emerald-800">Voordelen</p><div className="mt-1"><Punten items={lijst(v.voordelen)} teken="+" kleur="#047857" /></div></div>
                  <div><p className="text-[11px] font-extrabold uppercase tracking-wider text-rose-700">Nadelen</p><div className="mt-1"><Punten items={lijst(v.nadelen)} teken="–" kleur="#be123c" /></div></div>
                </div>
                {lijst(v.besluiten).length > 0 && <div><p className="text-[11px] font-extrabold uppercase tracking-wider text-amber-800">Vraagt besluit</p><div className="mt-1"><Punten items={lijst(v.besluiten)} teken="!" kleur="#b45309" /></div></div>}
              </div>
            </article>
          ))}
        </div>
        {d.advies && (
          <div className="rounded-xl border-2 border-emerald-600 bg-white p-4">
            <p className="text-sm font-extrabold text-emerald-900">Advies (voorstel)</p>
            <p className="mt-1 text-[13px] text-gray-900">{tekst(d.advies.tekst ?? d.advies)}</p>
            {lijst(d.advies.criteria).length > 0 && (
              <div className="mt-3 overflow-x-auto">
                <table className="w-full text-[13px]">
                  <thead><tr className="bg-blue-50 text-left text-xs font-bold uppercase tracking-wide text-[#003366]"><th className="px-2 py-1.5">Criterium</th><th className="px-2 py-1.5">Voorstel 1</th><th className="px-2 py-1.5">Voorstel 2</th></tr></thead>
                  <tbody>{lijst(d.advies.criteria).map((k, j) => <tr key={j} className="border-t border-slate-200 align-top"><td className="px-2 py-1.5 font-semibold text-gray-900">{tekst(k.criterium)}</td><td className="px-2 py-1.5 text-gray-900">{tekst(k.voorstel1)}</td><td className="px-2 py-1.5 text-gray-900">{tekst(k.voorstel2)}</td></tr>)}</tbody>
                </table>
              </div>
            )}
          </div>
        )}
      </section>

      {/* Besluiten */}
      <section className="space-y-3">
        <Kop id="besluiten" nr="08" titel="Besluitpunten" />
        <ol className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
          {lijst(d.besluiten).map((b, i) => (
            <li key={i} className="rounded-xl border-2 border-amber-400 bg-amber-50 p-3">
              <p className="text-2xl font-black leading-none text-amber-700">{i + 1}</p>
              <p className="mt-1 text-[13px] font-bold text-gray-900">{tekst(b.besluit ?? b)}</p>
              {b.wie && <p className="text-xs text-gray-800">Besluit: {tekst(b.wie)}</p>}
            </li>
          ))}
        </ol>
      </section>

      {/* Per bouwsteen */}
      <section className="space-y-3">
        <Kop id="lijnen" nr="09" titel="Per bouwsteen: eindbeeld, stand, gat en activiteiten" sub="De basis van de toets: vanuit het doel en het document per bouwsteen wat nodig is." />
        <div className="space-y-2">
          {lijst(d.lijnen).map((l, i) => {
            const k = tekst(l.k) || String(i);
            const open = !!openLijn[k];
            return (
              <article key={k} className="overflow-hidden rounded-xl border border-slate-300 bg-white">
                <button type="button" onClick={() => setOpenLijn((o) => ({ ...o, [k]: !open }))} aria-expanded={open} className="flex w-full items-center justify-between gap-3 px-4 py-3 text-left hover:bg-slate-50">
                  <span className="text-sm font-extrabold text-gray-900">{tekst(l.titel) || tekst(l.naamUitDocument)}</span>
                  <span className="text-xs font-semibold text-[#003366] underline">{open ? "Inklappen" : "Uitklappen"}</span>
                </button>
                <div className={(open ? "grid" : "hidden print:grid") + " gap-4 border-t border-slate-200 p-4 md:grid-cols-2"}>
                  <div><p className="text-[11px] font-extrabold uppercase tracking-wider text-[#003366]">Eindbeeld</p><div className="mt-1"><Punten items={lijst(l.eindbeeld).map((e) => (typeof e === "string" ? e : tekst(e.tekst)))} /></div></div>
                  <div><p className="text-[11px] font-extrabold uppercase tracking-wider text-emerald-800">Stand</p><div className="mt-1"><Punten items={lijst(l.stand).map((e) => (typeof e === "string" ? e : tekst(e.wat) + (e.bruikbaarVoor ? ` — bruikbaar voor: ${tekst(e.bruikbaarVoor)}` : "")))} teken="✓" kleur="#047857" /></div></div>
                  <div><p className="text-[11px] font-extrabold uppercase tracking-wider text-rose-700">Gat</p><div className="mt-1"><Punten items={lijst(l.gat)} teken="○" kleur="#be123c" /></div></div>
                  <div><p className="text-[11px] font-extrabold uppercase tracking-wider text-[#003366]">Activiteiten</p><div className="mt-1"><Punten items={lijst(l.activiteiten).map((a) => (typeof a === "string" ? a : `${tekst(a.wat)} (fase ${tekst(a.fase)}${a.vergelijkHuidig ? `, ${tekst(a.vergelijkHuidig)}` : ""})`))} teken="→" /></div></div>
                  {l.oordeel && <p className="md:col-span-2 rounded-lg bg-slate-50 px-3 py-2 text-[13px] font-semibold text-gray-900">{tekst(l.oordeel)}</p>}
                </div>
              </article>
            );
          })}
        </div>
      </section>

      {lijst(d.legenda).length > 0 && (
        <footer className="flex flex-wrap gap-x-4 gap-y-1 border-t border-slate-300 pt-3 text-xs text-gray-800">{lijst(d.legenda).map((l, i) => <span key={i}>{tekst(l)}</span>)}</footer>
      )}
    </div>
  );
}
