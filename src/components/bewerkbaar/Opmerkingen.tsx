"use client";

// Opmerkingen bij een blok van een bewerkbaar document, zoals in Word, maar gekoppeld aan
// het blok zelf (kaart, tabel, plaat) in plaats van alleen de kantlijn. In weergave heeft
// elk blok een knop "Opmerking" die altijd zichtbaar is (geen hover nodig, ook niet op een
// aanraakscherm): op een breed scherm in de kantlijn rechts naast het blok, smaller in een
// eigen smalle strook boven de rechterbovenhoek, zodat hij nooit over de inhoud of over
// knoppen van het blok valt. De opmerkingen staan als ballonnen naast het blok (breed
// scherm) of eronder (smal), met naam en datum, antwoorden, "afgehandeld" en verwijderen.
// Opslag in session.opmerkingen (sleutel: document + sectie + blokindex), dus iedereen met
// de link ziet ze. De naam van de schrijver wordt in localStorage onthouden
// (din_opmerkingen_door).

import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from "react";
import type { ReactNode } from "react";
import type { Opmerking } from "@/lib/schemas";
import { useSession } from "@/lib/session-context";
import { DocContext } from "@/components/bewerkbaar/doc-context";

export interface OpmerkingenApi {
  document: string;
  /** alleen de opmerkingen van dit document */
  lijst: Opmerking[];
  toevoegen: (o: Omit<Opmerking, "id" | "datum" | "antwoorden" | "afgehandeld">) => void;
  antwoorden: (id: string, tekst: string, door: string) => void;
  zetAfgehandeld: (id: string, aan: boolean) => void;
  verwijderen: (id: string) => void;
}

export const OpmerkingenContext = createContext<OpmerkingenApi | null>(null);

const NAAM_SLEUTEL = "din_opmerkingen_door";
const GEEN: Opmerking[] = [];

function nieuwId(): string {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) return crypto.randomUUID();
  return "opm-" + Date.now().toString(36) + Math.random().toString(36).slice(2, 8);
}

function leesNaam(): string {
  try { return localStorage.getItem(NAAM_SLEUTEL) ?? ""; } catch { return ""; }
}

/** Naam onthouden; zonder opslag (privémodus) vult de gebruiker hem de volgende keer opnieuw in. */
function bewaarNaam(naam: string) {
  try { localStorage.setItem(NAAM_SLEUTEL, naam); } catch { /* geen opslag */ }
}

/** "1 okt 2026 14:05" (nl-NL); leeg bij een ongeldige datum. */
function toonDatum(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "";
  const dag = d.toLocaleDateString("nl-NL", { day: "numeric", month: "short", year: "numeric" }).replace(/\./g, "");
  return dag + " " + d.toLocaleTimeString("nl-NL", { hour: "2-digit", minute: "2-digit" });
}

export function OpmerkingenProvider({ document, children }: { document: string; children: ReactNode }) {
  const { session, updateSession } = useSession();
  const alle = session?.opmerkingen ?? GEEN;
  const lijst = useMemo(() => alle.filter((o) => o.document === document), [alle, document]);
  // Past één opmerking aan (null = weghalen); opmerkingen van andere documenten blijven staan.
  const wijzig = useCallback(
    (fn: (o: Opmerking) => Opmerking | null) =>
      updateSession((prev) => ({
        opmerkingen: (prev.opmerkingen ?? []).flatMap((o) => { const n = fn(o); return n ? [n] : []; }),
      })),
    [updateSession]
  );
  const api = useMemo<OpmerkingenApi>(
    () => ({
      document,
      lijst,
      toevoegen: (o) =>
        updateSession((prev) => ({
          opmerkingen: [
            ...(prev.opmerkingen ?? []),
            { ...o, id: nieuwId(), datum: new Date().toISOString(), afgehandeld: false, antwoorden: [] },
          ],
        })),
      antwoorden: (id, tekst, door) =>
        wijzig((o) =>
          o.id === id
            ? { ...o, antwoorden: [...(o.antwoorden ?? []), { id: nieuwId(), tekst, door, datum: new Date().toISOString() }] }
            : o
        ),
      zetAfgehandeld: (id, aan) => wijzig((o) => (o.id === id ? { ...o, afgehandeld: aan } : o)),
      verwijderen: (id) => wijzig((o) => (o.id === id ? null : o)),
    }),
    [document, lijst, updateSession, wijzig]
  );
  return <OpmerkingenContext.Provider value={api}>{children}</OpmerkingenContext.Provider>;
}

function Tekstballon() {
  return (
    <svg viewBox="0 0 16 16" aria-hidden="true" focusable="false">
      <path d="M2.5 3.5A1.5 1.5 0 0 1 4 2h8a1.5 1.5 0 0 1 1.5 1.5v6A1.5 1.5 0 0 1 12 11H7.2L4 13.6V11a1.5 1.5 0 0 1-1.5-1.5z" fill="none" stroke="currentColor" strokeWidth="1.4" strokeLinejoin="round" />
    </svg>
  );
}

/** Formulier voor een nieuwe opmerking of een antwoord: tekst, naam (onthouden), Plaatsen/Annuleren. */
function Formulier(p: { label: string; ph: string; onPlaats: (tekst: string, door: string) => void; onSluit: () => void }) {
  const [tekst, setTekst] = useState("");
  const [door, setDoor] = useState(leesNaam);
  const vorm = useRef<HTMLFormElement>(null);
  const veld = useRef<HTMLTextAreaElement>(null);
  // Cursor in het tekstvak. Staat het formulier buiten beeld (smal scherm: onder een hoog
  // blok), dan rustig erheen schuiven in plaats van de sprong die de browser bij focus maakt.
  useEffect(() => {
    veld.current?.focus({ preventScroll: true });
    const el = vorm.current;
    if (!el) return;
    const r = el.getBoundingClientRect();
    if (r.top >= 8 && r.bottom <= window.innerHeight - 8) return;
    const rustig = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    el.scrollIntoView({ block: "center", behavior: rustig ? "auto" : "smooth" });
  }, []);
  const klaar = tekst.trim().length > 0;
  const plaats = () => {
    if (!klaar) return;
    bewaarNaam(door.trim());
    p.onPlaats(tekst.trim(), door.trim());
  };
  return (
    <form
      ref={vorm}
      className="opm-form"
      onSubmit={(e) => { e.preventDefault(); plaats(); }}
      onKeyDown={(e) => {
        if (e.key === "Escape") { e.preventDefault(); p.onSluit(); }
        else if (e.key === "Enter" && (e.ctrlKey || e.metaKey)) { e.preventDefault(); plaats(); }
      }}
    >
      <label className="opm-l">
        {p.label}
        <textarea ref={veld} className="opm-in" rows={3} value={tekst} onChange={(e) => setTekst(e.target.value)} placeholder={p.ph} />
      </label>
      <label className="opm-l">
        Naam
        <input className="opm-in" value={door} onChange={(e) => setDoor(e.target.value)} placeholder="Je naam" />
      </label>
      <div className="opm-knoppen">
        <button type="submit" className="opm-b opm-b-prim" disabled={!klaar}>Plaatsen</button>
        <button type="button" className="opm-b" onClick={p.onSluit}>Annuleren</button>
        <span className="opm-hint">Esc sluit · Ctrl+Enter plaatst</span>
      </div>
    </form>
  );
}

function Ballon({ o, api }: { o: Opmerking; api: OpmerkingenApi }) {
  const [antwoord, setAntwoord] = useState(false);
  const [vraag, setVraag] = useState(false);
  const af = !!o.afgehandeld;
  return (
    <article id={"opm-" + o.id} className={"opm-ballon" + (af ? " opm-af" : "")}>
      <div className="opm-kop">
        <b className="opm-naam">{o.door || "Zonder naam"}</b>
        <time className="opm-datum" dateTime={o.datum}>{toonDatum(o.datum)}</time>
        <button type="button" className="opm-x" title="Opmerking verwijderen" aria-label="Opmerking verwijderen" onClick={() => setVraag(true)}>×</button>
      </div>
      <p className="opm-tekst">{o.tekst}</p>
      {(o.antwoorden ?? []).map((a) => (
        <div key={a.id} className="opm-antwoord">
          <div className="opm-kop">
            <b className="opm-naam">{a.door || "Zonder naam"}</b>
            <time className="opm-datum" dateTime={a.datum}>{toonDatum(a.datum)}</time>
          </div>
          <p className="opm-tekst">{a.tekst}</p>
        </div>
      ))}
      {antwoord && (
        <Formulier
          label="Antwoord"
          ph="Je antwoord"
          onSluit={() => setAntwoord(false)}
          onPlaats={(tekst, door) => { api.antwoorden(o.id, tekst, door); setAntwoord(false); }}
        />
      )}
      {vraag ? (
        <div className="opm-vraag" role="alert">
          Verwijderen?
          <button type="button" className="opm-b opm-b-rood" onClick={() => api.verwijderen(o.id)}>Ja</button>
          <button type="button" className="opm-b" onClick={() => setVraag(false)}>Nee</button>
        </div>
      ) : (
        <div className="opm-voet">
          {!antwoord && <button type="button" className="opm-link" onClick={() => setAntwoord(true)}>Antwoorden…</button>}
          <label className="opm-vink">
            <input type="checkbox" checked={af} onChange={(e) => api.zetAfgehandeld(o.id, e.target.checked)} />
            Afgehandeld
          </label>
        </div>
      )}
    </article>
  );
}

/**
 * Om elk blok in weergave: de knop "Opmerking" (altijd zichtbaar; in de kantlijn of in een
 * strook boven de rechterbovenhoek, zie OPMERKINGEN_CSS), het formulier en de ballonnen
 * van dit blok. De knop staat vóór de inhoud, zodat de tabvolgorde de leesvolgorde volgt.
 * Zonder OpmerkingenProvider alleen de inhoud.
 */
export function BlokMetOpmerkingen(p: { sectie: string; blok: number; naam: string; children: ReactNode }) {
  const api = useContext(OpmerkingenContext);
  const [open, setOpen] = useState(false);
  const [kolomHoogte, setKolomHoogte] = useState(0);
  const kolom = useRef<HTMLDivElement>(null);
  const knop = useRef<HTMLButtonElement>(null);
  const eigen = api ? api.lijst.filter((o) => o.sectie === p.sectie && o.blok === p.blok) : GEEN;
  const toon = open || eigen.length > 0;
  // Breed scherm: de ballonnen staan in de kantlijn (absoluut, onder de knop) en tellen niet
  // mee in de hoogte. Het blok wordt minstens zo hoog als de kolom reikt, zodat ze niet over
  // de knop en de ballonnen van het volgende blok vallen. Smal: de kolom staat in de tekst.
  useEffect(() => {
    const el = kolom.current;
    if (!el) return;
    const meet = () => setKolomHoogte(getComputedStyle(el).position === "absolute" ? el.offsetTop + el.offsetHeight : 0);
    const ro = new ResizeObserver(meet);
    ro.observe(el);
    window.addEventListener("resize", meet);
    return () => { ro.disconnect(); window.removeEventListener("resize", meet); };
  }, [toon]);
  if (!api) return <>{p.children}</>;
  const openAantal = eigen.filter((o) => !o.afgehandeld).length;
  const cls = "opm-blok" + (eigen.length ? " heeft" : "") + (openAantal ? " opm-open" : "");
  const telling = eigen.length === 0 ? "" : ` (${eigen.length} ${eigen.length === 1 ? "opmerking" : "opmerkingen"}, ${openAantal} open)`;
  // Annuleren of Esc: terug naar de knop, zodat toetsenbord en beeld weer bij het blok staan.
  const sluit = () => { setOpen(false); knop.current?.focus(); };
  return (
    <div className={cls} style={toon && kolomHoogte ? { minHeight: kolomHoogte } : undefined}>
      <button
        ref={knop}
        type="button"
        className="opm-knop"
        aria-expanded={open}
        aria-label={`Opmerking plaatsen bij ${p.naam}${telling}`}
        title={`Opmerking plaatsen bij ${p.naam}${telling}`}
        onClick={() => setOpen((v) => !v)}
      >
        <Tekstballon />
        Opmerking
        {eigen.length > 0 && <span className="opm-tel">{eigen.length}</span>}
      </button>
      {p.children}
      {toon && (
        <div className="opm-ballonnen" ref={kolom}>
          {open && (
            <Formulier
              label="Opmerking"
              ph={`Opmerking bij ${p.naam}`}
              onSluit={sluit}
              onPlaats={(tekst, door) => {
                api.toevoegen({ document: api.document, sectie: p.sectie, blok: p.blok, bij: p.naam, tekst, door });
                setOpen(false);
              }}
            />
          )}
          {eigen.map((o) => <Ballon key={o.id} o={o} api={api} />)}
        </div>
      )}
    </div>
  );
}

/**
 * Compacte lijst van alle opmerkingen van het document: open eerst, dan afgehandeld; elk met
 * blok, sectie, naam, datum en tekst, en een link naar de ballon. De sectietitel komt uit
 * `secties` (optioneel), anders uit het document als de lijst erbinnen staat.
 */
export function OpmerkingenOverzicht(p: { secties?: { id: string; titel: string }[] } = {}) {
  const api = useContext(OpmerkingenContext);
  const doc = useContext(DocContext);
  if (!api) return null;
  const titel = (id: string) => p.secties?.find((s) => s.id === id)?.titel ?? doc?.secties.find((s) => s.id === id)?.titel ?? "";
  const opDatum = (a: Opmerking, b: Opmerking) => a.datum.localeCompare(b.datum);
  const open = api.lijst.filter((o) => !o.afgehandeld).sort(opDatum);
  const af = api.lijst.filter((o) => o.afgehandeld).sort(opDatum);
  const items = [...open, ...af];
  return (
    <section className="opm-overzicht" aria-label="Alle opmerkingen">
      <style>{OPMERKINGEN_CSS}</style>
      <div className="opm-ov-kop">
        <b>Opmerkingen</b>
        <span>{open.length} open · {af.length} afgehandeld</span>
      </div>
      <p className="opm-ov-uitleg">
        Klik bij een onderdeel op <span className="opm-ov-chip"><Tekstballon />Opmerking</span> om te reageren.
      </p>
      {items.length === 0 ? (
        <p className="opm-ov-leeg">Nog geen opmerkingen.</p>
      ) : (
        <ul>
          {items.map((o) => {
            const n = o.antwoorden?.length ?? 0;
            return (
              <li key={o.id} className={o.afgehandeld ? "opm-af" : undefined}>
                <div className="opm-ov-bij">
                  <a href={"#opm-" + o.id}>{o.bij || "Blok " + (o.blok + 1)}</a>
                  {titel(o.sectie) && <span className="opm-ov-sec">{titel(o.sectie)}</span>}
                </div>
                <div className="opm-ov-meta">
                  <b>{o.door || "Zonder naam"}</b> · {toonDatum(o.datum)}
                  {n > 0 && ` · ${n} ${n === 1 ? "antwoord" : "antwoorden"}`}
                  {o.afgehandeld && " · afgehandeld"}
                </div>
                <div className="opm-ov-tekst">{o.tekst}</div>
              </li>
            );
          })}
        </ul>
      )}
    </section>
  );
}

// Stijl: knop en ballonnen binnen .okd (het document); het overzicht (.opm-overzicht) staat
// ook buiten het document.
// De knop "Opmerking" is altijd zichtbaar en staat nooit over de inhoud van het blok:
// - smal (<1400px): in een eigen strook van 24px boven de rechterbovenhoek van het blok:
//   4px lucht, de knop (18px), 2px tot het blok. Die strook is de bestaande tussenruimte
//   (12px) plus een marge op .opm-blok (12px). Waar de ruimte erboven kleiner is, is de
//   marge groter: in een versiegroep (tussenruimte 8px) en bij het eerste blok van een
//   sectie zonder inleiding (direct onder de knop "Bewerken").
// - breed (≥1400px): in de kantlijn rechts naast het blok, met de ballonnen eronder; zet
//   daarvoor .opm-ruimte op de documentwrapper (ruimte rechts). Geen extra marge.
// Rustig zolang er niets staat (lichte rand, geen schaduw); met opmerkingen een teller en
// een amberkleurige rand (open) of een grijze (alles afgehandeld); donkerblauw als het
// formulier openstaat. --opm-h is de hoogte van de knop (aanraakscherm: 24px).
export const OPMERKINGEN_CSS = `
.okd{--opm-h:18px}
.okd .opm-blok{position:relative;margin-top:12px}
.okd .okd-vg > .opm-blok,.okd .okd-kop + .okd-blokken > .opm-blok:first-child{margin-top:16px}
.okd .opm-blok:not(.heeft):has(> .opm-knop:only-child){display:none}
.okd .opm-knop{position:absolute;bottom:100%;right:8px;z-index:3;box-sizing:border-box;height:var(--opm-h);margin:0 0 2px;display:inline-flex;align-items:center;gap:4px;font:inherit;font-size:11.5px;font-weight:600;line-height:1;white-space:nowrap;color:#003366;background:rgba(255,255,255,.7);border:1px solid #c3cedb;border-radius:999px;padding:0 8px 0 6px;cursor:pointer;transition:background-color .12s,border-color .12s,color .12s}
.okd .opm-knop:hover{background:#fff;border-color:#003366}
.okd .opm-knop:focus-visible{background:#fff;border-color:#003366;outline:2px solid #003366;outline-offset:2px}
.okd .opm-knop svg{width:12px;height:12px;flex:none}
.okd .opm-tel{display:inline-grid;place-items:center;box-sizing:border-box;min-width:14px;height:14px;margin-right:-5px;padding:0 4px;border-radius:999px;background:#5f6b7a;color:#fff;font-size:11.5px;font-weight:800;line-height:1;font-variant-numeric:tabular-nums}
.okd .opm-blok.heeft > .opm-knop{background:#fff;border-color:#94a3b8;font-weight:700}
.okd .opm-blok.opm-open > .opm-knop{background:#fffbeb;border-color:#f59e0b}
.okd .opm-blok.opm-open > .opm-knop .opm-tel{background:#92400e}
.okd .opm-blok > .opm-knop[aria-expanded="true"]{background:#003366;border-color:#003366;color:#fff}
.okd .opm-blok > .opm-knop[aria-expanded="true"] .opm-tel{background:#fff;color:#003366}
@media (pointer:coarse){.okd{--opm-h:24px}.okd .opm-blok{margin-top:18px}.okd .okd-vg > .opm-blok,.okd .okd-kop + .okd-blokken > .opm-blok:first-child{margin-top:22px}.okd .opm-knop{padding:0 10px 0 8px}.okd .opm-tel{min-width:16px;height:16px}}
@media print{.okd .opm-knop,.okd .opm-form{display:none}.okd .opm-blok,.okd .okd-vg > .opm-blok,.okd .okd-kop + .okd-blokken > .opm-blok:first-child{margin-top:0}}
.okd .opm-ballonnen{position:absolute;left:100%;top:calc(var(--opm-h) + 8px);margin-left:12px;width:260px;display:flex;flex-direction:column;gap:8px;z-index:2}
.okd .opm-ballon,.okd .opm-form{position:relative;background:#fff;border:1px solid #e2e8f0;border-radius:10px;padding:9px 11px 8px;box-shadow:0 2px 8px rgba(15,23,42,.07);font-size:12.5px;line-height:1.5;color:#1f2937;scroll-margin-top:16px}
.okd .opm-ballon::before{content:"";position:absolute;left:-12px;top:15px;width:12px;height:1px;background:#cbd5e1}
.okd .opm-ballon::after{content:"";position:absolute;left:-16px;top:12px;width:7px;height:7px;border-radius:50%;background:#f59e0b}
.okd .opm-ballon.opm-af{background:#f1f5f9;box-shadow:none}
.okd .opm-ballon.opm-af::after{background:#94a3b8}
.okd .opm-ballon.opm-af > .opm-tekst{text-decoration:line-through;text-decoration-color:rgba(74,85,101,.5);color:#4a5565}
.okd .opm-ballon:target{box-shadow:0 0 0 3px rgba(245,158,11,.45)}
.okd .opm-kop{display:flex;align-items:baseline;gap:6px;flex-wrap:wrap}
.okd .opm-naam{font-weight:700;color:#003366}
.okd .opm-datum{font-size:11.5px;color:#5f6b7a}
.okd .opm-af .opm-datum{color:#4a5565}
.okd .opm-x{margin-left:auto;align-self:center;width:20px;height:20px;border-radius:6px;border:0;background:transparent;color:#5f6b7a;font-size:16px;line-height:1;cursor:pointer}
.okd .opm-x:hover,.okd .opm-x:focus-visible{background:#fee2e2;color:#b91c1c}
.okd .opm-tekst{margin:3px 0 0;white-space:pre-line}
.okd .opm-antwoord{margin:7px 0 0 10px;padding-left:9px;border-left:2px solid #c7d7ea}
.okd .opm-voet{display:flex;align-items:center;justify-content:space-between;gap:8px;margin-top:7px;font-size:11.5px}
.okd .opm-link{font:inherit;font-size:11.5px;font-weight:600;color:#003366;background:none;border:0;padding:0;cursor:pointer;text-decoration:underline;text-underline-offset:2px}
.okd .opm-vink{display:inline-flex;align-items:center;gap:5px;margin-left:auto;color:#4a5565;cursor:pointer;white-space:nowrap}
.okd .opm-vink input{margin:0;accent-color:#003366}
.okd .opm-vraag{display:flex;align-items:center;gap:6px;margin-top:7px;font-size:11.5px;font-weight:600;color:#7f1d1d;background:#fef2f2;border:1px solid #fecaca;border-radius:8px;padding:4px 8px}
.okd .opm-form{border-color:#003366}
.okd .opm-l{display:block;font-size:11.5px;font-weight:800;text-transform:uppercase;letter-spacing:.05em;color:#5f6b7a;margin-top:6px}
.okd .opm-l:first-child{margin-top:0}
.okd .opm-in{display:block;width:100%;box-sizing:border-box;margin-top:2px;font:inherit;font-size:12.5px;font-weight:400;line-height:1.45;letter-spacing:0;text-transform:none;color:#1f2937;background:#fff;border:1px solid #cbd5e1;border-radius:7px;padding:5px 8px;resize:vertical}
.okd .opm-in:focus{outline:none;border-color:#003366;box-shadow:0 0 0 3px rgba(0,51,102,.15)}
.okd .opm-knoppen{display:flex;align-items:center;gap:6px;flex-wrap:wrap;margin-top:8px}
.okd .opm-b{font:inherit;font-size:11.5px;font-weight:700;line-height:1.5;border:1px solid #cbd5e1;border-radius:6px;background:#fff;color:#334155;padding:2px 10px;cursor:pointer}
.okd .opm-b:hover{background:#f1f5f9}
.okd .opm-b-prim{background:#003366;border-color:#003366;color:#fff}
.okd .opm-b-prim:hover{background:#00264d}
.okd .opm-b:disabled{opacity:.45;cursor:default}
.okd .opm-b-rood{color:#b91c1c;border-color:#fecaca}
.okd .opm-hint{font-size:11.5px;color:#5f6b7a;margin-left:auto}
@media (min-width:1400px){.okd.opm-ruimte{padding-right:296px}.okd .opm-blok,.okd .okd-vg > .opm-blok,.okd .okd-kop + .okd-blokken > .opm-blok:first-child{margin-top:0}.okd .opm-knop{bottom:auto;top:0;right:auto;left:100%;margin:0 0 0 12px}}
@media (max-width:1399px){.okd .opm-ballonnen{position:static;width:auto;margin:10px 0 0}.okd .opm-ballon::before,.okd .opm-ballon::after{content:none}.okd .opm-ballon{border-left:3px solid #f59e0b}.okd .opm-ballon.opm-af{border-left-color:#94a3b8}}
.opm-overzicht{margin-top:14px;font-size:12.5px;line-height:1.5;color:#1f2937;background:#fff;border:1px solid #e2e8f0;border-radius:12px;padding:12px 14px}
.opm-ov-kop{display:flex;align-items:baseline;gap:8px;flex-wrap:wrap;margin-bottom:4px}
.opm-ov-kop b{font-size:13px;color:#003366}
.opm-ov-kop span,.opm-ov-meta,.opm-ov-sec{font-size:11.5px;color:#5f6b7a}
.opm-ov-uitleg{margin:0 0 8px;font-size:12px;line-height:1.7;color:#4a5565}
.opm-ov-chip{display:inline-flex;align-items:center;gap:4px;height:18px;box-sizing:border-box;vertical-align:-4px;margin:0 2px;padding:0 8px 0 6px;border:1px solid #c3cedb;border-radius:999px;background:#fff;font-size:11.5px;font-weight:600;line-height:1;white-space:nowrap;color:#003366}
.opm-ov-chip svg{width:12px;height:12px;flex:none}
.opm-ov-leeg{margin:0;font-size:12px;color:#4a5565}
@media print{.opm-ov-uitleg{display:none}}
.opm-overzicht ul{list-style:none;margin:0;padding:0;display:flex;flex-direction:column;gap:6px}
.opm-overzicht li{padding:7px 10px;border:1px solid #e2e8f0;border-left:3px solid #f59e0b;border-radius:8px;background:#fff}
.opm-overzicht li.opm-af{background:#f1f5f9;border-left-color:#94a3b8}
.opm-overzicht li.opm-af .opm-ov-meta,.opm-overzicht li.opm-af .opm-ov-sec{color:#4a5565}
.opm-ov-bij{display:flex;align-items:baseline;gap:8px;flex-wrap:wrap}
.opm-ov-bij a{font-weight:700;color:#003366;text-decoration:underline;text-underline-offset:2px}
.opm-ov-bij a:hover,.opm-ov-bij a:focus-visible{color:#0066cc}
.opm-ov-meta b{color:#1f2937}
.opm-ov-tekst{margin-top:2px;white-space:pre-line}
.opm-overzicht li.opm-af .opm-ov-tekst{color:#4a5565}
`;
