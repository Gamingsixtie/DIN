"use client";

// Tabblad "Praatplaat": het antwoord op het doel van de analyse als plaat langs het DIN
// (Doelen-Inspanningennetwerk). Lees van boven naar beneden om te sturen (doel → baten → vermogen
// → werkstromen), van onder naar boven om te bouwen. Domeinen in de Cito-volgorde: cultuur → mens →
// data & systemen → processen. De gele punten uit het document staan als geelmarkering op de werkstroom
// waar ze landen. De inhoud komt uit de sessie (bronnenAnalyse.antwoordDoel), niet uit de code.

import { useEffect, useMemo, useRef, useState } from "react";
import type { BronnenAnalyse } from "@/lib/schemas";
import { domeinKleuren, leesPraatplaat, MARKEER, type Praatplaat, type PpWerkstroom } from "@/lib/praatplaat";

const BLAUW = "#003366";

function Vlag({ v }: { v?: string }) {
  if (!v) return null;
  return (
    <span className="ml-1.5 inline-flex items-center rounded-full border border-amber-500 bg-amber-50 px-1.5 py-px text-[11px] font-bold text-amber-900 whitespace-nowrap align-middle">
      {v === "⚑" ? "⚑ wacht op 3sides" : "⚑ deels 3sides"}
    </span>
  );
}

function DomeinBalk({ kleuren }: { kleuren: string[] }) {
  return (
    <div className="flex h-1.5 w-full" aria-hidden="true">
      {kleuren.map((k, i) => <div key={i} className="flex-1" style={{ backgroundColor: k }} />)}
    </div>
  );
}

function Rail({ label, sub }: { label: string; sub: string }) {
  return (
    <div className="hidden lg:flex flex-col items-end justify-center pr-4 text-right">
      <span className="text-[11px] font-extrabold uppercase tracking-[0.14em]" style={{ color: BLAUW }}>{label}</span>
      <span className="text-[11px] text-gray-700 leading-tight">{sub}</span>
    </div>
  );
}

function Verbinding({ tekst }: { tekst: string }) {
  return (
    <div className="grid lg:grid-cols-[132px_1fr]" aria-hidden="true">
      <div className="hidden lg:block" />
      <div className="flex items-center gap-2 py-1 pl-2">
        <svg width="14" height="18" viewBox="0 0 14 18" className="shrink-0"><path d="M7 17V3M2 8l5-5 5 5" fill="none" stroke={BLAUW} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" /></svg>
        <span className="text-[11px] font-semibold uppercase tracking-wide text-[#003366]">{tekst}</span>
      </div>
    </div>
  );
}

function Lijst({ soort, items }: { soort: "ligt" | "ontbreekt"; items: string[] }) {
  const stijl = soort === "ligt"
    ? { kop: "Ligt er", kleur: "#047857", teken: "✓" }
    : { kop: "Ontbreekt", kleur: "#be123c", teken: "○" };
  return (
    <div>
      <p className="text-[11px] font-extrabold uppercase tracking-wider" style={{ color: stijl.kleur }}>{stijl.kop}</p>
      <ul className="mt-1.5 space-y-1.5">
        {items.map((t, i) => (
          <li key={i} className="flex gap-2 text-[13px] leading-snug text-gray-900">
            <span aria-hidden="true" className="mt-px font-bold" style={{ color: stijl.kleur }}>{stijl.teken}</span>
            <span>{t}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}

function KanNu({ w }: { w: PpWerkstroom }) {
  return (
    <div className="rounded-lg border border-[#003366]/25 bg-[#003366]/[0.04] p-3">
      <p className="text-[11px] font-extrabold uppercase tracking-wider text-[#003366]">Kan nu · en waarom</p>
      <ul className="mt-1.5 space-y-2">
        {w.nu.map((n, i) => (
          <li key={i} className="flex gap-2">
            <span aria-hidden="true" className="font-bold text-[#003366]">→</span>
            <div className="text-[13px] leading-snug">
              <span className="font-semibold text-gray-900">{n.wat}</span>
              <Vlag v={n.vlag} />
              <p className="mt-0.5 text-xs text-gray-700">Waarom nu: {n.waarom}</p>
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}

function WerkstroomKaart({ p, w, breed }: { p: Praatplaat; w: PpWerkstroom; breed?: boolean }) {
  return (
    <article className="flex h-full flex-col overflow-hidden rounded-xl border border-slate-300 bg-white shadow-[0_1px_0_rgba(0,51,102,0.06),0_8px_24px_-16px_rgba(0,51,102,0.35)] break-inside-avoid">
      <DomeinBalk kleuren={domeinKleuren(p, w.domeinen)} />
      <div className="flex flex-1 flex-col gap-3 p-4">
        <header className="space-y-1.5">
          <div className="flex flex-wrap items-baseline justify-between gap-x-3 gap-y-1">
            <h3 className="text-lg font-extrabold tracking-tight text-gray-900">{w.naam}</h3>
            <span className="inline-flex items-center gap-1.5 rounded-full border border-amber-400 bg-amber-100 px-2.5 py-0.5 text-xs font-bold text-amber-900">
              <span className="h-2 w-2 rounded-full bg-amber-500" aria-hidden="true" />{w.stand}<span className="font-semibold">· voorstel</span>
            </span>
          </div>
          <p className="text-xs text-gray-700">
            Cito-lead <span className="font-bold text-gray-900">{w.citoLead}</span>{w.leadNoot ? ` (${w.leadNoot})` : ""} · 3sides-lead <span className="font-bold text-gray-900">{w.sidesLead}</span>
            <span className="text-gray-700"> · {w.vermogensdeel}</span>
          </p>
          <div className="flex flex-wrap gap-1.5 pt-0.5">
            {w.punten.map((pt) => (
              <span key={pt.nr} className="rounded px-1.5 py-0.5 text-xs font-bold text-gray-900" style={{ background: MARKEER }} title="Geel gemarkeerd punt in het document">
                Geel punt {pt.nr} · {pt.label}{pt.voorbehoud ? <span className="font-semibold text-gray-800"> ({pt.voorbehoud})</span> : null}
              </span>
            ))}
            {(w.extraLabels ?? []).map((l) => (
              <span key={l} className="rounded border border-slate-400 bg-slate-50 px-1.5 py-0.5 text-xs font-semibold text-gray-800">{l}</span>
            ))}
            {w.bouwstenen.length > 0 && (
              <span className="rounded border border-slate-400 bg-white px-1.5 py-0.5 text-xs font-semibold text-gray-800">
                Bouwsteen {w.bouwstenen.join(", ")}
              </span>
            )}
          </div>
        </header>
        <div className={breed ? "grid gap-4 md:grid-cols-3" : "space-y-3"}>
          <Lijst soort="ligt" items={w.ligt} />
          <Lijst soort="ontbreekt" items={w.ontbreekt} />
          <KanNu w={w} />
        </div>
      </div>
    </article>
  );
}

export default function AntwoordDoelTab({ ba, onNaarTab }: { ba: BronnenAnalyse; onNaarTab: (id: string) => void }) {
  const p = useMemo(() => leesPraatplaat(ba.antwoordDoel), [ba.antwoordDoel]);
  const plaatRef = useRef<HTMLDivElement>(null);
  const [vol, setVol] = useState(false);
  const [melding, setMelding] = useState("");

  useEffect(() => {
    const opVerandering = () => setVol(document.fullscreenElement === plaatRef.current);
    document.addEventListener("fullscreenchange", opVerandering);
    return () => document.removeEventListener("fullscreenchange", opVerandering);
  }, []);

  function meld(t: string) {
    setMelding(t);
    setTimeout(() => setMelding(""), 3000);
  }
  async function kopieerLink() {
    const url = new URL(window.location.href);
    url.searchParams.set("stap", "bronnen");
    url.searchParams.set("tab", "antwoord");
    try {
      await navigator.clipboard.writeText(url.toString());
      meld("Link gekopieerd");
    } catch {
      meld("Kopiëren lukte niet; kopieer de adresbalk");
    }
  }
  async function presenteer() {
    try {
      if (document.fullscreenElement) await document.exitFullscreen();
      else await plaatRef.current?.requestFullscreen();
    } catch {
      meld("Volledig scherm lukte niet; gebruik F11");
    }
  }

  if (!p) {
    return (
      <div className="rounded-xl border border-slate-300 bg-white p-6 text-sm text-gray-800">
        Voor deze sessie is nog geen praatplaat vastgelegd. Bekijk de onderbouwing in{" "}
        <button type="button" className="font-semibold text-[#003366] underline" onClick={() => onNaarTab("dekking")}>Dekking per werkstroom</button>.
      </div>
    );
  }

  const [adoptie, ...rest] = p.werkstromen.filter((w) => w.id !== "nulmeting");
  const nulmeting = p.werkstromen.find((w) => w.id === "nulmeting");

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center justify-between gap-3 print:hidden">
        <p className="max-w-2xl text-sm text-gray-800">
          Eén plaat om te delen en te bespreken. De uitwerking (gele punten, bouwstenen, planning, gaten) staat in{" "}
          <button type="button" onClick={() => onNaarTab("uitwerking")} className="font-semibold text-[#003366] underline">Uitwerking</button>; de onderbouwing per bron in de andere tabbladen.
        </p>
        <div className="flex flex-wrap items-center gap-2">
          {melding && <span role="status" className="text-sm font-semibold text-emerald-800">{melding}</span>}
          <button type="button" onClick={kopieerLink} className="rounded-lg border border-[#003366] bg-white px-3 py-2 text-sm font-semibold text-[#003366] hover:bg-blue-50">Link kopiëren</button>
          <button type="button" onClick={() => window.print()} className="rounded-lg border border-[#003366] bg-white px-3 py-2 text-sm font-semibold text-[#003366] hover:bg-blue-50">Afdrukken / PDF</button>
          <button type="button" onClick={presenteer} className="rounded-lg bg-[#003366] px-3 py-2 text-sm font-semibold text-white hover:bg-[#002244]">{vol ? "Sluiten" : "Presenteren"}</button>
        </div>
      </div>

      <div
        ref={plaatRef}
        className={"relative overflow-auto rounded-2xl border border-slate-300 bg-white " + (vol ? "p-8" : "p-5 md:p-7")}
        style={{
          backgroundImage: "linear-gradient(rgba(0,51,102,0.045) 1px, transparent 1px), linear-gradient(90deg, rgba(0,51,102,0.045) 1px, transparent 1px)",
          backgroundSize: "28px 28px",
          printColorAdjust: "exact",
          WebkitPrintColorAdjust: "exact",
        }}
      >
        {/* Kop */}
        <header className="mb-5 flex flex-wrap items-end justify-between gap-4 border-b-2 border-[#003366] pb-4">
          <div className="max-w-4xl">
            <p className="text-[11px] font-extrabold uppercase tracking-[0.18em] text-[#003366]">Praatplaat · Doelen-Inspanningennetwerk</p>
            <h2 className="mt-1 text-2xl font-extrabold leading-tight tracking-tight text-[#003366] md:text-3xl">{p.titel}</h2>
            <p className="mt-2 text-sm text-gray-900">
              Antwoord op de vraag bij de gele punten in{" "}
              <span className="rounded px-1 font-semibold italic" style={{ background: MARKEER }}>‘{p.document}’</span>
            </p>
            <p className="mt-1 text-sm italic text-gray-800">“{p.vraag}”</p>
          </div>
          <p className="rounded-md border border-[#003366]/30 bg-white px-3 py-1.5 text-xs font-semibold text-[#003366]">{p.stand}</p>
        </header>

        {/* Voorlopig antwoord in vier kernzinnen */}
        <section aria-label="Voorlopig antwoord" className="mb-6 grid gap-3 md:grid-cols-2 xl:grid-cols-4">
          {p.kern.map((k, i) => (
            <div key={i} className="rounded-xl border border-slate-300 bg-white p-4" style={{ borderTop: `4px solid ${i === 3 ? "#059669" : BLAUW}` }}>
              <p className="text-3xl font-black leading-none text-[#003366]/25">{String(i + 1).padStart(2, "0")}</p>
              <p className="mt-1 text-[15px] font-extrabold leading-snug text-gray-900">{k.kop}</p>
              <p className="mt-1.5 text-[13px] leading-snug text-gray-800">{k.tekst}</p>
            </div>
          ))}
        </section>

        {/* De DIN-keten */}
        <section aria-label="Het DIN: doel, baten, vermogen, werkstromen">
          <div className="grid gap-3 lg:grid-cols-[132px_1fr]">
            <Rail label="Doel" sub="waartoe" />
            <div className="rounded-xl px-5 py-4 text-white" style={{ background: `linear-gradient(110deg, ${BLAUW} 0%, #00478f 100%)` }}>
              <p className="text-[17px] font-bold leading-snug md:text-lg">{p.doel.tekst}</p>
              <p className="mt-1 text-xs text-blue-100">{p.doel.noot}</p>
            </div>
          </div>
          <Verbinding tekst="de baten dragen bij aan het doel" />

          <div className="grid gap-3 lg:grid-cols-[132px_1fr]">
            <Rail label="Baten" sub="effect bij de klant" />
            <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
              {p.baten.sectoren.map((s) => (
                <div key={s.naam} className="rounded-xl border-2 border-[#003366]/30 bg-blue-50 px-4 py-3">
                  <p className="text-base font-extrabold text-[#003366]">Sectorbaat {s.naam}</p>
                  <p className="text-xs text-gray-800">{s.noot}</p>
                </div>
              ))}
              <div className="rounded-xl border-2 border-dashed border-[#003366]/40 bg-white px-4 py-3">
                <p className="text-base font-extrabold text-[#003366]">{p.baten.kpi.kop}</p>
                <p className="text-xs text-gray-800">{p.baten.kpi.tekst}</p>
              </div>
            </div>
          </div>
          <Verbinding tekst="het vermogen levert de baten" />

          <div className="grid gap-3 lg:grid-cols-[132px_1fr]">
            <Rail label="Vermogen" sub="één gedeeld vermogen, vier domeinen" />
            <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
              {p.domeinen.map((d) => (
                <div key={d.id} className="overflow-hidden rounded-xl border border-slate-300 bg-white">
                  <div className="px-4 py-2 text-white" style={{ backgroundColor: d.kleur }}>
                    <p className="text-xs font-extrabold uppercase tracking-[0.12em]">{d.naam}</p>
                  </div>
                  <p className="px-4 py-2.5 text-sm font-bold text-gray-900">{d.vermogen}</p>
                </div>
              ))}
            </div>
          </div>
          <Verbinding tekst="de werkstromen bouwen het vermogen op" />

          <div className="grid gap-3 lg:grid-cols-[132px_1fr]">
            <Rail label="Werkstromen" sub="inspanningen · Cito-lead vóór 3sides-lead" />
            <div className="space-y-3">
              <div className="grid gap-3 xl:grid-cols-4">
                {adoptie && <div className="xl:col-span-2"><WerkstroomKaart p={p} w={adoptie} /></div>}
                {rest.map((w) => <div key={w.id}><WerkstroomKaart p={p} w={w} /></div>)}
              </div>
              {nulmeting && <WerkstroomKaart p={p} w={nulmeting} breed />}
            </div>
          </div>
        </section>

        {/* Besluiten */}
        <section aria-label="Om te besluiten" className="mt-6 grid gap-3 lg:grid-cols-[132px_1fr]">
          <Rail label="Besluiten" sub="om te bespreken" />
          <ol className="grid gap-3 sm:grid-cols-2 xl:grid-cols-5">
            {p.besluiten.map((b, i) => (
              <li key={i} className="rounded-xl border-2 border-amber-400 bg-amber-50 p-3">
                <p className="text-2xl font-black leading-none text-amber-700">{i + 1}</p>
                <p className="mt-1 text-[13px] font-bold leading-snug text-gray-900">{b.vraag}</p>
                <p className="mt-1 text-xs text-gray-800">Besluit: {b.wie}</p>
              </li>
            ))}
          </ol>
        </section>

        {/* Opmerkingen: functie volgt */}
        <section aria-label="Opmerkingen" className="mt-6 rounded-xl border-2 border-dashed border-[#003366]/40 bg-white p-4 print:hidden">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <p className="text-sm font-extrabold text-[#003366]">Opmerkingen toevoegen · deze functie komt nog</p>
              <p className="text-[13px] text-gray-800">Straks kunnen collega’s per onderdeel van de plaat een opmerking of vraag plaatsen. Die worden in de sessie bewaard en meegenomen in de volgende versie.</p>
            </div>
            <button type="button" disabled className="cursor-not-allowed rounded-lg border border-slate-400 bg-slate-100 px-3 py-2 text-sm font-semibold text-gray-700">Opmerking toevoegen (binnenkort)</button>
          </div>
        </section>

        <footer className="mt-5 flex flex-wrap gap-x-4 gap-y-1 border-t border-slate-300 pt-3 text-xs text-gray-800">
          {p.legenda.map((l) => <span key={l}>{l}</span>)}
        </footer>
      </div>
    </div>
  );
}
