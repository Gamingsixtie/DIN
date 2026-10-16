"use client";

// Opmerkingen op de praatplaat (stap 12): collega's plaatsen per onderdeel een opmerking of vraag.
// Opgeslagen in de sessie (bronnenAnalyse.opmerkingen): eerst lokaal, daarna direct naar Supabase,
// met een zichtbare melding. Verwerkte opmerkingen blijven staan, gemarkeerd als verwerkt.

import { useEffect, useState } from "react";
import type { BronnenAnalyse, PraatplaatOpmerking } from "@/lib/schemas";

const NAAM_SLEUTEL = "din-praatplaat-naam";

function leesNaam(): string {
  try { return localStorage.getItem(NAAM_SLEUTEL) ?? ""; } catch { return ""; }
}
function bewaarNaam(n: string) {
  try { localStorage.setItem(NAAM_SLEUTEL, n); } catch { /* niet erg: alleen gemak */ }
}

function nieuweId(): string {
  try { return crypto.randomUUID(); } catch { return "op-" + Math.random().toString(36).slice(2); }
}

export default function OpmerkingenPraatplaat({
  ba, onderdelen, gekozen, onKies, onWijzig, onBewaar,
}: {
  ba: BronnenAnalyse;
  onderdelen: string[];
  gekozen: string;
  onKies: (o: string) => void;
  onWijzig: (nieuw: BronnenAnalyse) => boolean | void;
  onBewaar: () => Promise<boolean>;
}) {
  const [tekst, setTekst] = useState("");
  const [door, setDoor] = useState("");
  const [melding, setMelding] = useState<{ soort: "ok" | "fout"; tekst: string } | null>(null);
  const [bezig, setBezig] = useState(false);
  useEffect(() => setDoor(leesNaam()), []);

  const lijst: PraatplaatOpmerking[] = ba.opmerkingen ?? [];
  const open = lijst.filter((o) => o.status !== "verwerkt").length;

  async function sla(nieuweLijst: PraatplaatOpmerking[], okTekst: string) {
    setBezig(true);
    const gelukt = onWijzig({ ...ba, opmerkingen: nieuweLijst });
    if (gelukt === false) { setMelding({ soort: "fout", tekst: "Niet opgeslagen." }); setBezig(false); return false; }
    const opgeslagen = await onBewaar();
    setMelding(opgeslagen ? { soort: "ok", tekst: okTekst } : { soort: "fout", tekst: "Lokaal bewaard; opslaan in de database mislukte. Probeer het zo opnieuw." });
    setBezig(false);
    return true;
  }

  async function plaats() {
    const t = tekst.trim();
    if (!t) { setMelding({ soort: "fout", tekst: "Schrijf eerst een opmerking." }); return; }
    bewaarNaam(door.trim());
    const nieuw: PraatplaatOpmerking = { id: nieuweId(), onderdeel: gekozen || onderdelen[0], tekst: t, door: door.trim(), datum: new Date().toISOString(), status: "open" };
    if (await sla([...lijst, nieuw], "Opmerking geplaatst")) setTekst("");
  }

  async function wissel(id: string) {
    await sla(lijst.map((o) => (o.id === id ? { ...o, status: o.status === "verwerkt" ? "open" : "verwerkt" } : o)), "Status bijgewerkt");
  }

  const perOnderdeel = onderdelen.map((o) => ({ o, items: lijst.filter((x) => x.onderdeel === o) })).filter((g) => g.items.length);

  return (
    <section id="opmerkingen" aria-label="Opmerkingen" className="scroll-mt-4 mt-6 overflow-hidden rounded-2xl border-2 border-[#003366]/40 bg-white print:hidden">
      <header className="flex flex-wrap items-baseline justify-between gap-2 border-b border-slate-200 bg-blue-50 px-5 py-3">
        <h3 className="text-base font-extrabold text-[#003366]">Opmerkingen en vragen bij de plaat</h3>
        <p className="text-xs font-semibold text-gray-800">{lijst.length} opmerkingen · {open} open</p>
      </header>
      <div className="grid gap-5 p-5 lg:grid-cols-[minmax(280px,1fr)_1.4fr]">
        <div className="space-y-2">
          <label className="block text-xs font-bold text-gray-900">Bij onderdeel
            <select value={gekozen || onderdelen[0]} onChange={(e) => onKies(e.target.value)} className="mt-1 block w-full rounded-lg border border-slate-400 bg-white px-2 py-2 text-sm text-gray-900">
              {onderdelen.map((o) => <option key={o} value={o}>{o}</option>)}
            </select>
          </label>
          <label className="block text-xs font-bold text-gray-900">Opmerking of vraag
            <textarea value={tekst} onChange={(e) => setTekst(e.target.value)} rows={4} className="mt-1 block w-full rounded-lg border border-slate-400 px-2 py-2 text-sm text-gray-900" placeholder="Wat klopt niet, wat mist er, wat wil je weten?" />
          </label>
          <label className="block text-xs font-bold text-gray-900">Je naam
            <input value={door} onChange={(e) => setDoor(e.target.value)} className="mt-1 block w-full rounded-lg border border-slate-400 px-2 py-2 text-sm text-gray-900" placeholder="bijv. Sanne" />
          </label>
          <div className="flex flex-wrap items-center gap-3">
            <button type="button" onClick={plaats} disabled={bezig} className="rounded-lg bg-[#003366] px-4 py-2 text-sm font-semibold text-white hover:bg-[#002244] disabled:opacity-60">{bezig ? "Opslaan…" : "Opmerking plaatsen"}</button>
            {melding && <span role="status" className={"text-sm font-semibold " + (melding.soort === "ok" ? "text-emerald-800" : "text-rose-800")}>{melding.tekst}</span>}
          </div>
        </div>
        <div>
          {perOnderdeel.length === 0 ? (
            <p className="text-sm text-gray-800">Nog geen opmerkingen. Kies een onderdeel en plaats de eerste.</p>
          ) : (
            <ul className="space-y-3">
              {perOnderdeel.map((g) => (
                <li key={g.o}>
                  <p className="text-xs font-extrabold uppercase tracking-wider text-[#003366]">{g.o}</p>
                  <ul className="mt-1 space-y-1.5">
                    {g.items.map((x) => (
                      <li key={x.id} className={"rounded-lg border px-3 py-2 " + (x.status === "verwerkt" ? "border-slate-200 bg-slate-50" : "border-amber-300 bg-amber-50")}>
                        <p className={"text-sm text-gray-900 " + (x.status === "verwerkt" ? "line-through decoration-slate-400" : "")}>{x.tekst}</p>
                        <div className="mt-1 flex flex-wrap items-center justify-between gap-2">
                          <p className="text-xs text-gray-700">{x.door ? <span className="font-bold text-gray-900">{x.door}</span> : "anoniem"} · {new Date(x.datum).toLocaleDateString("nl-NL", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" })}</p>
                          <button type="button" onClick={() => wissel(x.id)} disabled={bezig} className="text-xs font-semibold text-[#003366] underline">{x.status === "verwerkt" ? "Weer open zetten" : "Markeer als verwerkt"}</button>
                        </div>
                      </li>
                    ))}
                  </ul>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </section>
  );
}
