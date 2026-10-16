"use client";

// Blok "Wacht op 3sides: kan Cito het zelf?" op de praatplaat (stap 12). Per werkstroom elk onderdeel
// met ⚑ uit de planning, met de toets of Cito het zelf kan (ja / deels / nee), hoe, wat nodig is en
// wanneer. Voorstel; feitelijke input voor het besluit over de rol van 3sides (programma-eigenaar),
// geen advies over doorgaan of stoppen. Inhoud uit de sessie (praatplaat-JSON, veld wachtOp3sides).

import { useState } from "react";

import type { WachtItem, WachtOp3sidesData } from "@/lib/praatplaat";

const ZELF = {
  ja: { label: "Cito kan het zelf", kort: "ja", kleur: "#047857", vlak: "bg-emerald-50 border-emerald-600 text-emerald-900" },
  deels: { label: "Cito kan het deels", kort: "deels", kleur: "#b45309", vlak: "bg-amber-50 border-amber-500 text-amber-900" },
  nee: { label: "Wacht echt op 3sides of extra capaciteit", kort: "nee", kleur: "#be123c", vlak: "bg-rose-50 border-rose-600 text-rose-900" },
} as const;

function Staaf({ items }: { items: WachtItem[] }) {
  const n = items.length || 1;
  return (
    <div className="flex h-3 w-full overflow-hidden rounded-full bg-slate-200" role="img" aria-label="Verdeling ja, deels, nee">
      {(["ja", "deels", "nee"] as const).map((z) => {
        const aantal = items.filter((i) => i.zelf === z).length;
        return aantal ? <div key={z} style={{ width: `${(aantal / n) * 100}%`, backgroundColor: ZELF[z].kleur }} /> : null;
      })}
    </div>
  );
}

export default function WachtOp3sides({ data, kleurVan }: { data: WachtOp3sidesData; kleurVan: (werkstroom: string) => string[] }) {
  const [open, setOpen] = useState<Record<string, boolean>>({});
  return (
    <section id="wacht-op-3sides" aria-label={data.titel} className="scroll-mt-4 mt-6 overflow-hidden rounded-2xl border-2 border-[#003366] bg-white">
      <header className="flex flex-wrap items-end justify-between gap-3 bg-[#003366] px-5 py-3 text-white">
        <div>
          <p className="text-[11px] font-extrabold uppercase tracking-[0.16em] text-amber-300">Prio nu</p>
          <h3 className="text-xl font-extrabold tracking-tight">{data.titel}</h3>
        </div>
        <div className="flex flex-wrap gap-3 text-xs font-semibold">
          {(["ja", "deels", "nee"] as const).map((z) => (
            <span key={z} className="inline-flex items-center gap-1.5"><span className="h-3 w-3 rounded-sm" style={{ backgroundColor: ZELF[z].kleur }} />{ZELF[z].label}</span>
          ))}
        </div>
      </header>
      <div className="space-y-3 p-5">
        <p className="text-sm text-gray-900"><span className="font-bold">{data.kern}</span></p>
        <p className="text-[13px] text-gray-800">{data.toelichting}</p>

        <div className="grid gap-3 xl:grid-cols-2">
          {data.werkstromen.map((w) => {
            const isOpen = !!open[w.naam];
            const kleuren = kleurVan(w.naam);
            const tel = (z: "ja" | "deels" | "nee") => w.items.filter((i) => i.zelf === z).length;
            return (
              <article key={w.naam} className="overflow-hidden rounded-xl border border-slate-300 bg-white break-inside-avoid">
                <div className="flex h-1.5" aria-hidden="true">{kleuren.map((k, i) => <div key={i} className="flex-1" style={{ backgroundColor: k }} />)}</div>
                <div className="space-y-2 p-4">
                  <div className="flex flex-wrap items-baseline justify-between gap-2">
                    <h4 className="text-base font-extrabold text-gray-900">{w.naam}</h4>
                    <p className="text-xs font-semibold text-gray-800">
                      {w.items.length} onderdelen met ⚑ · <span style={{ color: ZELF.ja.kleur }}>{tel("ja")} zelf</span> · <span style={{ color: ZELF.deels.kleur }}>{tel("deels")} deels</span> · <span style={{ color: ZELF.nee.kleur }}>{tel("nee")} niet</span>
                    </p>
                  </div>
                  <Staaf items={w.items} />
                  <p className="text-[13px] leading-snug text-gray-900">{w.samenvatting}</p>
                  <button
                    type="button"
                    onClick={() => setOpen((o) => ({ ...o, [w.naam]: !isOpen }))}
                    className="text-sm font-semibold text-[#003366] underline print:hidden"
                    aria-expanded={isOpen}
                  >
                    {isOpen ? "Verberg onderdelen" : `Toon de ${w.items.length} onderdelen`}
                  </button>
                  <ul className={(isOpen ? "block" : "hidden print:block") + " space-y-2 pt-1"}>
                    {w.items.map((it, i) => (
                      <li key={i} className="rounded-lg border border-slate-200 p-3">
                        <div className="flex flex-wrap items-start justify-between gap-2">
                          <p className="text-[13px] font-bold leading-snug text-gray-900">{it.wat}</p>
                          <div className="flex shrink-0 flex-wrap gap-1">
                            <span className={"rounded-full border px-2 py-px text-[11px] font-bold " + ZELF[it.zelf].vlak}>Zelf: {ZELF[it.zelf].kort}</span>
                            <span className="rounded-full border border-[#003366]/40 bg-blue-50 px-2 py-px text-[11px] font-bold text-[#003366]">{it.wanneer}</span>
                          </div>
                        </div>
                        <p className="mt-1 text-[13px] leading-snug text-gray-900"><span className="font-semibold text-[#003366]">Hoe: </span>{it.hoe}</p>
                        <p className="mt-0.5 text-[13px] leading-snug text-gray-900"><span className="font-semibold text-[#003366]">Nodig: </span>{it.nodig}</p>
                        {it.bron && <p className="mt-0.5 text-xs text-gray-700">Bron: {it.bron}</p>}
                      </li>
                    ))}
                  </ul>
                </div>
              </article>
            );
          })}
        </div>
      </div>
    </section>
  );
}
