"use client";

// Tabblad "Praatplaat": het antwoord op het doel van de analyse als plaat langs het DIN
// (Doelen-Inspanningennetwerk). Lees van boven naar beneden om te sturen (doel → baten → vermogen
// → werkstromen), van onder naar boven om te bouwen. Domeinen in de Cito-volgorde: cultuur → mens →
// data & systemen → processen; elke werkstroom staat onder het domein waar hij het vermogen opbouwt.
// De gele punten uit het document staan als geelmarkering op de werkstroom waar ze landen.
// Compact op de plaat; de onderbouwing per werkstroom klapt uit. Inhoud uit de sessie
// (bronnenAnalyse.antwoordDoel), niet uit de code.

import { useEffect, useMemo, useRef, useState } from "react";
import type { BronnenAnalyse } from "@/lib/schemas";
import { domeinKleuren, leesPraatplaat, MARKEER, type Praatplaat, type PpWerkstroom, type WachtItem } from "@/lib/praatplaat";
import WachtOp3sides from "@/components/bronnen/WachtOp3sides";
import OpmerkingenPraatplaat from "@/components/bronnen/OpmerkingenPraatplaat";

const BLAUW = "#003366";
const ZELF_KLEUR: Record<string, string> = {
  ja: "bg-emerald-50 border-emerald-600 text-emerald-900",
  deels: "bg-amber-50 border-amber-500 text-amber-900",
  nee: "bg-rose-50 border-rose-600 text-rose-900",
};

function wachtItems(p: Praatplaat, naam: string): WachtItem[] {
  return p.wachtOp3sides?.werkstromen.find((w) => w.naam === naam)?.items ?? [];
}

function Vlag({ v }: { v?: string }) {
  if (!v) return null;
  return (
    <span className="inline-flex items-center rounded-full border border-amber-500 bg-amber-50 px-1.5 py-px text-[11px] font-bold text-amber-900 whitespace-nowrap">
      {v === "⚑" ? "⚑ wacht op 3sides" : "⚑ deels 3sides"}
    </span>
  );
}

function Rail({ label, sub }: { label: string; sub: string }) {
  return (
    <div className="hidden lg:flex flex-col items-end justify-start pt-2 pr-4 text-right">
      <span className="text-[11px] font-extrabold uppercase tracking-[0.14em]" style={{ color: BLAUW }}>{label}</span>
      <span className="text-[11px] leading-tight text-gray-700">{sub}</span>
    </div>
  );
}

function Verbinding({ tekst }: { tekst: string }) {
  return (
    <div className="grid lg:grid-cols-[132px_1fr]" aria-hidden="true">
      <div className="hidden lg:block" />
      <div className="flex items-center gap-2 py-1.5 pl-2">
        <svg width="14" height="18" viewBox="0 0 14 18" className="shrink-0"><path d="M7 17V3M2 8l5-5 5 5" fill="none" stroke={BLAUW} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" /></svg>
        <span className="text-[11px] font-semibold uppercase tracking-wide text-[#003366]">{tekst}</span>
      </div>
    </div>
  );
}

function Teller({ teken, aantal, label, kleur }: { teken: string; aantal: number; label: string; kleur: string }) {
  return (
    <span className="inline-flex items-center gap-1 rounded-md border px-2 py-1 text-xs font-bold" style={{ borderColor: kleur, color: kleur }}>
      <span aria-hidden="true">{teken}</span>{aantal} {label}
    </span>
  );
}

function Onderbouwing({ p, w }: { p: Praatplaat; w: PpWerkstroom }) {
  const wacht = wachtItems(p, w.naam);
  return (
    <div className="grid gap-4 border-t border-slate-200 pt-3 md:grid-cols-2">
      <div>
        <p className="text-[11px] font-extrabold uppercase tracking-wider text-emerald-800">Ligt er · en waarvoor</p>
        <ul className="mt-1.5 space-y-2">
          {w.ligt.map((t, i) => {
            const [wat, waarvoor] = t.split("||");
            return (
              <li key={i} className="flex gap-2 text-[13px] leading-snug text-gray-900">
                <span aria-hidden="true" className="font-bold text-emerald-700">✓</span>
                <span>{wat}{waarvoor && <span className="mt-0.5 block text-xs text-gray-700"><span className="font-semibold text-emerald-800">Bruikbaar voor:</span> {waarvoor}</span>}</span>
              </li>
            );
          })}
        </ul>
      </div>
      <div className="space-y-4">
        <div>
          <p className="text-[11px] font-extrabold uppercase tracking-wider text-rose-700">Ontbreekt</p>
          <ul className="mt-1.5 space-y-1.5">
            {w.ontbreekt.map((t, i) => (
              <li key={i} className="flex gap-2 text-[13px] leading-snug text-gray-900"><span aria-hidden="true" className="font-bold text-rose-700">○</span><span>{t}</span></li>
            ))}
          </ul>
        </div>
        <div>
          <p className="text-[11px] font-extrabold uppercase tracking-wider text-[#003366]">Kan nu · waarom</p>
          <ul className="mt-1.5 space-y-1.5">
            {w.nu.map((n, i) => {
              const z = n.id ? wacht.find((x) => x.id === n.id) : undefined;
              return (
                <li key={i} className="text-[13px] leading-snug text-gray-900">
                  <span className="font-semibold">{n.wat}</span>
                  <span className="block text-xs text-gray-700">{n.waarom}{z ? ` · Cito zelf: ${z.zelf} — ${z.hoe}` : ""}</span>
                </li>
              );
            })}
          </ul>
        </div>
      </div>
    </div>
  );
}

function WerkstroomKaart({ p, w, open, onWissel, aantalOpm, onOpmerking }: { p: Praatplaat; w: PpWerkstroom; open: boolean; onWissel: () => void; aantalOpm: number; onOpmerking: () => void }) {
  const wacht = wachtItems(p, w.naam);
  const telZelf = (z: string) => wacht.filter((x) => x.zelf === z).length;
  return (
    <article className="overflow-hidden rounded-xl border border-slate-300 bg-white shadow-[0_8px_24px_-18px_rgba(0,51,102,0.45)] break-inside-avoid">
      <div className="flex h-1.5" aria-hidden="true">{domeinKleuren(p, w.domeinen).map((k, i) => <div key={i} className="flex-1" style={{ backgroundColor: k }} />)}</div>
      <div className="space-y-3 p-4">
        <header className="space-y-1">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <h3 className="text-lg font-extrabold tracking-tight text-gray-900">{w.naam}</h3>
            <span className="inline-flex items-center gap-1.5 rounded-full border border-amber-400 bg-amber-100 px-2.5 py-0.5 text-xs font-bold text-amber-900">
              <span className="h-2 w-2 rounded-full bg-amber-500" aria-hidden="true" />{w.stand}
            </span>
          </div>
          <p className="text-xs text-gray-800">
            Cito-lead <span className="font-bold text-gray-900">{w.citoLead}</span>{w.leadNoot ? ` (${w.leadNoot})` : ""} · 3sides-lead <span className="font-bold text-gray-900">{w.sidesLead}</span>
          </p>
        </header>

        {(w.punten.length > 0 || (w.extraLabels ?? []).length > 0 || w.bouwstenen.length > 0) && (
          <div className="flex flex-wrap gap-1.5">
            {w.punten.map((pt) => (
              <span key={pt.nr} className="rounded px-1.5 py-0.5 text-xs font-bold text-gray-900" style={{ background: MARKEER }} title={pt.voorbehoud ?? "Geel gemarkeerd punt in het document"}>
                Geel punt {pt.nr} · {pt.label}{pt.voorbehoud ? " *" : ""}
              </span>
            ))}
            {(w.extraLabels ?? []).map((l) => <span key={l} className="rounded border border-slate-400 bg-slate-50 px-1.5 py-0.5 text-xs font-semibold text-gray-800">{l}</span>)}
            {w.bouwstenen.length > 0 && <span className="rounded border border-slate-400 bg-white px-1.5 py-0.5 text-xs font-semibold text-gray-800">Bouwsteen {w.bouwstenen.join(", ")}</span>}
          </div>
        )}

        <div className="flex flex-wrap gap-1.5">
          <Teller teken="✓" aantal={w.ligt.length} label="ligt er" kleur="#047857" />
          <Teller teken="○" aantal={w.ontbreekt.length} label="ontbreekt" kleur="#be123c" />
          {wacht.length > 0 && (
            <a href="#wacht-op-3sides" className="inline-flex items-center gap-1 rounded-md border border-amber-500 bg-amber-50 px-2 py-1 text-xs font-bold text-amber-900 hover:bg-amber-100">
              ⚑ {wacht.length} leunen op 3sides · zelf: {telZelf("ja")} ja, {telZelf("deels")} deels, {telZelf("nee")} nee
            </a>
          )}
        </div>

        <div className="rounded-lg bg-[#003366]/[0.05] p-3">
          <p className="text-[11px] font-extrabold uppercase tracking-wider text-[#003366]">Kan nu</p>
          <ul className="mt-1 space-y-1">
            {w.nu.map((n, i) => {
              const z = n.id ? wacht.find((x) => x.id === n.id) : undefined;
              return (
                <li key={i} className="flex flex-wrap items-baseline gap-x-1.5 gap-y-0.5 text-[13px] leading-snug">
                  <span aria-hidden="true" className="font-bold text-[#003366]">→</span>
                  <span className="font-semibold text-gray-900">{n.wat}</span>
                  <Vlag v={n.vlag} />
                  {z && <span className={"rounded-full border px-1.5 py-px text-[11px] font-bold " + ZELF_KLEUR[z.zelf]}>Cito zelf: {z.zelf}</span>}
                </li>
              );
            })}
          </ul>
        </div>

        <div className="flex flex-wrap items-center justify-between gap-2 print:hidden">
          <button type="button" onClick={onWissel} aria-expanded={open} className="text-sm font-semibold text-[#003366] underline">
            {open ? "Verberg onderbouwing" : "Toon onderbouwing: wat er ligt en waarvoor, wat ontbreekt, waarom nu"}
          </button>
          <button type="button" onClick={onOpmerking} className="rounded-md border border-[#003366]/50 px-2 py-1 text-xs font-semibold text-[#003366] hover:bg-blue-50">
            Opmerking{aantalOpm ? ` (${aantalOpm})` : ""}
          </button>
        </div>
        <div className={open ? "block" : "hidden print:block"}>
          <Onderbouwing p={p} w={w} />
        </div>
      </div>
    </article>
  );
}

export default function AntwoordDoelTab({ ba, onNaarTab, onWijzig, onBewaar }: { ba: BronnenAnalyse; onNaarTab: (id: string) => void; onWijzig: (nieuw: BronnenAnalyse) => boolean | void; onBewaar: () => Promise<boolean> }) {
  const p = useMemo(() => leesPraatplaat(ba.antwoordDoel), [ba.antwoordDoel]);
  const plaatRef = useRef<HTMLDivElement>(null);
  const [vol, setVol] = useState(false);
  const [melding, setMelding] = useState("");
  const [open, setOpen] = useState<Record<string, boolean>>({});
  const [opmOnderdeel, setOpmOnderdeel] = useState("Algemeen");

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

  const allesOpen = p.werkstromen.every((w) => open[w.id]);
  const wissel = (id: string) => setOpen((o) => ({ ...o, [id]: !o[id] }));
  const kaart = (id: string) => {
    const w = p.werkstromen.find((x) => x.id === id);
    if (!w) return null;
    const aantalOpm = (ba.opmerkingen ?? []).filter((o) => o.onderdeel === w.naam && o.status !== "verwerkt").length;
    return <WerkstroomKaart p={p} w={w} open={!!open[w.id]} onWissel={() => wissel(w.id)} aantalOpm={aantalOpm} onOpmerking={() => { setOpmOnderdeel(w.naam); document.getElementById("opmerkingen")?.scrollIntoView({ behavior: "smooth" }); }} />;
  };
  const spanVan = (w: PpWerkstroom) => (w.domeinen.length >= 4 ? "xl:col-span-4" : w.domeinen.length === 2 ? "xl:col-span-2" : "");

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center justify-between gap-3 print:hidden">
        <p className="max-w-2xl text-sm text-gray-800">
          Eén plaat om te delen en te bespreken. De uitwerking (gele punten, bouwstenen, planning, gaten) staat in{" "}
          <button type="button" onClick={() => onNaarTab("uitwerking")} className="font-semibold text-[#003366] underline">Uitwerking</button>.
        </p>
        <div className="flex flex-wrap items-center gap-2">
          {melding && <span role="status" className="text-sm font-semibold text-emerald-800">{melding}</span>}
          <button type="button" onClick={() => setOpen(Object.fromEntries(p.werkstromen.map((w) => [w.id, !allesOpen])))} className="rounded-lg border border-[#003366] bg-white px-3 py-2 text-sm font-semibold text-[#003366] hover:bg-blue-50">{allesOpen ? "Alles inklappen" : "Alles uitklappen"}</button>
          <button type="button" onClick={kopieerLink} className="rounded-lg border border-[#003366] bg-white px-3 py-2 text-sm font-semibold text-[#003366] hover:bg-blue-50">Link kopiëren</button>
          <button type="button" onClick={() => window.print()} className="rounded-lg border border-[#003366] bg-white px-3 py-2 text-sm font-semibold text-[#003366] hover:bg-blue-50">Afdrukken / PDF</button>
          <button type="button" onClick={presenteer} className="rounded-lg bg-[#003366] px-3 py-2 text-sm font-semibold text-white hover:bg-[#002244]">{vol ? "Sluiten" : "Presenteren"}</button>
        </div>
      </div>

      <div
        ref={plaatRef}
        className={"relative overflow-x-hidden overflow-y-auto rounded-2xl border border-slate-300 bg-white " + (vol ? "p-8" : "p-5 md:p-7")}
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
            <Rail label="Werkstromen" sub="onder het domein dat ze opbouwen" />
            <div className="grid items-start gap-3 xl:grid-cols-4">
              {p.werkstromen.map((w) => (
                <div key={w.id} className={spanVan(w)}>{kaart(w.id)}</div>
              ))}
            </div>
          </div>
        </section>

        {p.wachtOp3sides && (
          <WachtOp3sides data={p.wachtOp3sides} kleurVan={(naam) => domeinKleuren(p, p.werkstromen.find((x) => x.naam === naam)?.domeinen ?? [])} />
        )}

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

        <OpmerkingenPraatplaat
          ba={ba}
          onderdelen={["Algemeen", "Voorlopig antwoord", "Doel en baten", "Vermogen", ...p.werkstromen.map((w) => w.naam), "Wacht op 3sides", "Besluiten", "Uitwerking"]}
          gekozen={opmOnderdeel}
          onKies={setOpmOnderdeel}
          onWijzig={onWijzig}
          onBewaar={onBewaar}
        />

        <footer className="mt-5 flex flex-wrap gap-x-4 gap-y-1 border-t border-slate-300 pt-3 text-xs text-gray-800">
          <span>* plek van dit punt: besluitpunt</span>
          {p.legenda.map((l) => <span key={l}>{l}</span>)}
        </footer>
      </div>
    </div>
  );
}
