// Evaluatiebord (stap 11, deel 8): per kader één kaart, in twee weergaven
// (EvaluatieWeergaveContext, evaluatie-weergave.ts). Wat het blok toont, hangt af van de plek:
//
// "extern" (tabblad Evaluatie 3sides): alleen wat we aan 3sides communiceren.
// 1 · Altijd zichtbaar: nummer, de vraag (titel), onze bevinding als chip met de zin erachter.
// 2 · Eén klik verder (details): de feiten met hun bron, wat we van 3sides vragen en de vraag
//     voor het gesprek. Niets van wat alleen voor Cito is staat in de pagina, ook niet verborgen.
//
// "intern" (de standaard: tabblad Analyse en tabblad Evaluatie intern): alles.
// 1 · Altijd zichtbaar: als hierboven, met rechts wie aan zet is (weggelaten als dat leeg is)
//     en ons oordeel als keuzelijstje. Zes kaarten onder elkaar zijn het overzicht.
// 2 · Eén klik verder (details): eerst hetzelfde als extern, daaronder een eigen vlak
//     "Intern Cito" met wat Cito zelf doet, ons oordeel met een notitie en
// 3 · nog een klik verder (details): de onderbouwing per sectie, met wat we toetsen erboven.
// Wat we van 3sides vragen en wat Cito zelf doet zijn zo twee verschillende dingen op twee
// plekken: niemand leest de acties van Cito als deel van de boodschap aan 3sides.
//
// Een kader zonder feiten, acties en gespreksvraag (oudere opgeslagen documenten) toont intern
// in laag 2 meteen de onderbouwing. Oordeel en notitie kies en typ je in weergave; ze worden
// meteen bewaard (levende gegevens, doc-versie.ts). Bewerkmodus: de teksten aanpasbaar op de
// plek waar ze staan; extern alleen de velden die daar getoond worden (kaders toevoegen en
// weghalen doe je intern, want een kader draagt ook wat alleen voor Cito is). Afdrukken: alles open.

import { useContext, useId, useLayoutEffect, useRef, useState, useSyncExternalStore } from "react";
import type { ChangeEvent, MouseEvent, ReactNode } from "react";
import { flushSync } from "react-dom";
import { PlusKnop, V, WegKnop } from "@/components/bewerkbaar/velden";
import { metBronlinks, vindVerwijzingen } from "@/components/bewerkbaar/bron-context";
import type { BlokVan, LosBlokProps } from "@/components/bewerkbaar/blok-typen";
import { EvaluatieWeergaveContext } from "@/components/bewerkbaar/blokken/evaluatie-weergave";
import { BewerkHierContext } from "@/components/bewerkbaar/bewerk-hier";

type Blok = BlokVan<"evaluatie">;
type Kader = Blok["kaders"][number];
type BeeldSoort = "ja" | "deels" | "needeels" | "nee" | "grijs";
type Partij = "cito" | "3sides";

const OORDELEN: { waarde: string; label: string }[] = [
  { waarde: "", label: "Kies…" },
  { waarde: "goed", label: "Goed" },
  { waarde: "deels", label: "Deels" },
  { waarde: "onvoldoende", label: "Onvoldoende" },
  { waarde: "nvt", label: "Nog niet te beoordelen" },
];

const PARTIJEN: { id: Partij; naam: string; letter: string }[] = [
  { id: "cito", naam: "Cito", letter: "C" },
  { id: "3sides", naam: "3sides", letter: "3" },
];

function tekst(v: string | undefined): string {
  return typeof v === "string" ? v : "";
}

function hoofdletter(s: string): string {
  return s.replace(/^\p{Ll}/u, (c) => c.toUpperCase());
}

// ---------- het eerste beeld: chip en zin ----------

/** Kleur van de chip "eerste beeld": uit het eerste woord van de zin. */
function beeldSoort(s: string): BeeldSoort {
  const t = s.trim().toLowerCase();
  if (/^nee[,;]?\s+deels\b/.test(t)) return "needeels";
  if (/^ja\b/.test(t) || /^sluit aan/.test(t)) return "ja";
  if (/^nee\b/.test(t) || /^onvoldoende/.test(t)) return "nee";
  if (/^deels\b/.test(t) || /^waarschijnlijk/.test(t)) return "deels";
  return "grijs";
}

/**
 * Het eerste beeld in tweeën: het stuk vóór de dubbele punt wordt de chip ("Nee, deels"), de
 * rest de zin erachter (hoofdletter vooraan, punt aan het eind). Zonder dubbele punt vooraan:
 * alleen het oordeelwoord als chip en de hele tekst als zin.
 */
function splitsBeeld(s: string): { kop: string; zin: string } {
  const t = s.trim().replace(/\s*\(voorstel\)\s*$/i, "");
  if (!t) return { kop: "", zin: "" };
  const i = t.indexOf(":");
  if (i > 0 && i <= 40) return { kop: t.slice(0, i).trim(), zin: alsZin(t.slice(i + 1)) };
  const m = t.match(/^(ja|nee,? deels|nee|deels|waarschijnlijk)(?![\p{L}\p{N}])/iu);
  if (m) return { kop: hoofdletter(m[1]), zin: m[0].length < t.length ? alsZin(t) : "" };
  return { kop: "", zin: alsZin(t) };
}

function alsZin(s: string): string {
  const t = hoofdletter(s.trim());
  if (!t) return "";
  return /[.!?…]["'’”)]?$/.test(t) ? t : t + ".";
}

/** Wie er in "actie bij" genoemd wordt (voor de rondjes): Cito, 3sides of beide. */
function partijen(s: string): Partij[] {
  const t = s.toLowerCase();
  const beide = /(?<![\p{L}])(beide|allebei|samen)(?![\p{L}])/u.test(t);
  const uit: Partij[] = [];
  if (beide || t.includes("cito")) uit.push("cito");
  if (beide || /3\s?sides/.test(t)) uit.push("3sides");
  return uit;
}

// ---------- feiten: de bron op een eigen regel ----------

/** Woorden waaraan een bronvermelding tussen haakjes te herkennen is, naast de documentnamen. */
const BRONWOORD =
  /statuspagina|overleg|stappenplan|programmaboek|programmaplan|organigram|actiebord|evaluatie|verslag|transcriptie|jira|town hall|stand \d|\d{1,2}-\d{1,2}|(?:^|[\s(])p\.\s?\d/i;

/**
 * Een feit met de bron tussen haakjes aan het eind: de bron komt op een eigen, rustiger regel.
 * Alleen als de haakjes een bron bevatten en er geen verwijzing over de grens heen loopt
 * ("plan van aanpak (p. 10)" blijft één geheel, anders breekt de link).
 */
function splitsBron(s: string): { kern: string; bron: string } {
  const t = s.trim();
  const m = t.match(/^([\s\S]*\S)\s*(\([^()]+\))\s*\.?$/);
  if (!m) return { kern: t, bron: "" };
  const grens = m[1].length;
  const verwijzingen = vindVerwijzingen(t);
  if (verwijzingen.some((v) => v.start < grens && v.end > grens)) return { kern: t, bron: "" };
  if (!BRONWOORD.test(m[2]) && !verwijzingen.some((v) => v.start >= grens)) return { kern: t, bron: "" };
  return { kern: /[.!?…:]$/.test(m[1]) ? m[1] : m[1] + ".", bron: m[2] };
}

// ---------- onderbouwing: lange tekst in alinea's ----------

interface Alinea {
  /** kort oordeel of partij vooraan ("Nee, deels", "Beide"): als chip */
  chip: string;
  /** label aan het begin van de alinea ("Afspraak:", "3sides:", "2 ·"): vet */
  label: string;
  tekst: string;
}

// Een label aan het begin van een zin: hoofdletter of cijfer, hooguit 45 tekens, dan ": ".
// Geen punt, puntkomma of dubbele aanhalingstekens erin, zodat citaten heel blijven; wel
// een korte toevoeging tussen haakjes aan het eind ("Cito (Sanne):").
const ZINSBEGIN = "(?:^|(?<=[.!?…)'’\"”]\\s))";
const LABEL = new RegExp(`${ZINSBEGIN}((?:\\p{Lu}|\\d)[^.:;!?()"“”\\n]{1,44}(?:\\s\\([^()\\n]{1,30}\\))?):\\s`, "gu");
/** Genummerd punt aan het begin van een zin: "2 · Van één-op-één naar …". */
const GENUMMERD = new RegExp(`${ZINSBEGIN}(\\d{1,2}\\s·)\\s`, "gu");
/** Kort oordeel of partij vooraan, hooguit drie woorden: "Waarschijnlijk.", "Nee, deels; …", "Beide.". */
const KOP_VOORAAN = /^([^.;:!?()]{1,24})[.;]\s+(?=\S)/u;
/** Een oordeelwoord met een dubbele punt erachter telt ook als kop: "Nee: niet gestart." */
const OORDEEL_VOORAAN = /^((?:ja|nee,? deels|nee|deels|waarschijnlijk))(?![\p{L}\p{N}]):\s+(?=\S)/iu;

/**
 * Knipt een sectietekst in alinea's bij de labels die er al in staan ("Afspraak: …",
 * "Ligt er: …", "3sides: …", "2 · …") en bij regeleinden. De tekst zelf verandert niet;
 * zonder herkenbare labels blijft het één alinea.
 */
function alineas(invoer: string): Alinea[] {
  const uit: Alinea[] = [];
  invoer.split(/\n+/).forEach((regel, ri) => {
    let t = regel.trim();
    if (!t) return;
    let chip = "";
    const kop = ri === 0 ? (t.match(OORDEEL_VOORAAN) ?? t.match(KOP_VOORAAN)) : null;
    if (kop && kop[1].trim().split(/\s+/).length <= 3) {
      chip = kop[1].trim();
      t = hoofdletter(t.slice(kop[0].length));
    }
    const grenzen: { start: number; eind: number; label: string }[] = [];
    for (const m of t.matchAll(LABEL)) {
      const start = m.index ?? 0;
      if (/\p{Ll}/u.test(m[1])) grenzen.push({ start, eind: start + m[0].length, label: m[1] + ":" });
    }
    for (const m of t.matchAll(GENUMMERD)) {
      const start = m.index ?? 0;
      if (!grenzen.some((g) => start >= g.start && start < g.eind)) grenzen.push({ start, eind: start + m[0].length, label: m[1] });
    }
    grenzen.sort((a, b) => a.start - b.start);
    let eerste = true;
    const duw = (label: string, stuk: string) => {
      const s = stuk.trim();
      if (!label && !s) return;
      uit.push({ chip: eerste ? chip : "", label, tekst: s });
      eerste = false;
    };
    if (grenzen.length === 0) return duw("", t);
    if (grenzen[0].start > 0) duw("", t.slice(0, grenzen[0].start));
    grenzen.forEach((g, i) => duw(g.label, t.slice(g.eind, grenzen[i + 1]?.start ?? t.length)));
  });
  return uit;
}

// ---------- afdrukken: alles open ----------

let drukAf = false;

function printAbonnement(cb: () => void): () => void {
  const mq = window.matchMedia("print");
  const voor = () => {
    drukAf = true;
    flushSync(cb);
  };
  const na = () => {
    drukAf = false;
    cb();
  };
  window.addEventListener("beforeprint", voor);
  window.addEventListener("afterprint", na);
  mq.addEventListener("change", cb);
  return () => {
    window.removeEventListener("beforeprint", voor);
    window.removeEventListener("afterprint", na);
    mq.removeEventListener("change", cb);
  };
}

function printStand(): boolean {
  return drukAf || window.matchMedia("print").matches;
}

function printServer(): boolean {
  return false;
}

// ---------- kleine onderdelen ----------

function Chevron() {
  return (
    <span className="ev-chev" aria-hidden="true">
      <svg viewBox="0 0 16 16" width="12" height="12">
        <path d="M4 6l4 4 4-4" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    </span>
  );
}

/** Teken bij het eerste beeld, zodat kleur niet het enige signaal is: vink, half rondje, kruis of stip. */
function BeeldIcoon({ soort }: { soort: BeeldSoort }) {
  return (
    <svg viewBox="0 0 16 16" width="12" height="12" aria-hidden="true">
      {soort === "ja" && <path d="M3.2 8.6l3 3 6.6-7.4" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" />}
      {(soort === "deels" || soort === "needeels") && (
        <>
          <circle cx="8" cy="8" r="5.6" fill="none" stroke="currentColor" strokeWidth="1.8" />
          <path d="M8 2.4a5.6 5.6 0 0 0 0 11.2z" fill="currentColor" />
        </>
      )}
      {soort === "nee" && <path d="M4.2 4.2l7.6 7.6M11.8 4.2l-7.6 7.6" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" />}
      {soort === "grijs" && <circle cx="8" cy="8" r="3" fill="currentColor" />}
    </svg>
  );
}

function BeeldChip({ kop, klein = false }: { kop: string; klein?: boolean }) {
  const soort = beeldSoort(kop);
  return (
    <span className={"ev-beeld ev-beeld-" + soort + (klein ? " ev-beeld-klein" : "")}>
      <BeeldIcoon soort={soort} />
      {kop}
    </span>
  );
}

function Avatar({ wie, klein = false }: { wie: Partij; klein?: boolean }) {
  const p = PARTIJEN.find((x) => x.id === wie) ?? PARTIJEN[0];
  return (
    <span className={"ev-av ev-av-" + (wie === "cito" ? "cito" : "3sides") + (klein ? " ev-av-klein" : "")} aria-hidden="true">
      {p.letter}
    </span>
  );
}

function Spreekballon() {
  return (
    <svg className="ev-vraag-i" viewBox="0 0 24 24" width="22" height="22" aria-hidden="true">
      <path
        d="M4.5 5.5h15a1.5 1.5 0 0 1 1.5 1.5v8a1.5 1.5 0 0 1-1.5 1.5H12l-4.2 3.4v-3.4H4.5A1.5 1.5 0 0 1 3 15V7a1.5 1.5 0 0 1 1.5-1.5z"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.7"
        strokeLinejoin="round"
      />
      <path d="M9.9 9.4a2.2 2.2 0 1 1 3 2.1c-.6.3-.9.6-.9 1.2" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" />
      <circle cx="12" cy="14.6" r=".95" fill="currentColor" />
    </svg>
  );
}

/** Ons oordeel als keuzelijstje (altijd zichtbaar in de kop van het kader). */
function OordeelKeuze({ id, k, naam, on }: { id: string; k: Kader; naam: string; on: (x: string) => void }) {
  const v = tekst(k.oordeel);
  return (
    <select
      id={id}
      className={"ev-oordeel" + (v ? " ev-oordeel-" + v : "")}
      value={v}
      onChange={(e: ChangeEvent<HTMLSelectElement>) => on(e.target.value)}
      aria-label={"Ons oordeel bij " + naam}
    >
      {OORDELEN.map((o) => (
        <option key={o.waarde} value={o.waarde}>
          {o.label}
        </option>
      ))}
    </select>
  );
}

/** Hetzelfde oordeel als keuzerondjes, bij de notitie onderaan het opengeklapte kader. */
function OordeelPillen({ groep, v, labelId, on }: { groep: string; v: string; labelId: string; on: (x: string) => void }) {
  return (
    <div className="ev-pillen" role="radiogroup" aria-labelledby={labelId}>
      {OORDELEN.filter((o) => o.waarde !== "").map((o) => (
        <label key={o.waarde} className={"ev-pil ev-pil-" + o.waarde + (v === o.waarde ? " is-gekozen" : "")}>
          <input type="radio" name={groep} value={o.waarde} checked={v === o.waarde} onChange={() => on(o.waarde)} />
          <span>{o.label}</span>
        </label>
      ))}
      {v !== "" && (
        <button type="button" className="ev-wis" onClick={() => on("")}>
          Wissen
        </button>
      )}
    </div>
  );
}

/** Notitie bij ons oordeel: groeit mee met de tekst, ook na openklappen en herladen. */
function Notitie({ id, v, zichtbaar, on }: { id: string; v: string; zichtbaar: boolean; on: (x: string) => void }) {
  const ref = useRef<HTMLTextAreaElement>(null);
  useLayoutEffect(() => {
    const el = ref.current;
    if (!el) return;
    el.style.height = "auto";
    const h = el.scrollHeight;
    // dichtgeklapt is er niets te meten: de hoogte dan aan de browser laten (field-sizing)
    el.style.height = h > 0 ? h + 2 + "px" : "";
  }, [v, zichtbaar]);
  return (
    <textarea
      ref={ref}
      id={id}
      className="ev-notitie"
      value={v}
      placeholder="Toelichting bij ons oordeel"
      rows={2}
      onChange={(e) => on(e.target.value)}
    />
  );
}

/** De twee koppen die uit elkaar moeten blijven: de vraag aan 3sides en het eigen werk van Cito. */
const KOP_VRAGEN = "Wat we van 3sides vragen";
const KOP_ZELF = "Wat Cito zelf doet (intern)";

/**
 * Wat één partij doet, als kop met een tekstvak eronder. "3sides": wat we van 3sides vragen,
 * deel van de boodschap. "cito": wat Cito zelf doet; staat alleen in het vlak "Intern Cito".
 */
function Doen({ wie, children }: { wie: Partij; children: ReactNode }) {
  return (
    <section className={wie === "cito" ? "ev-doen ev-doen-cito" : "ev-doen ev-doen-3sides"}>
      <h6 className="ev-h ev-h-av">
        <Avatar wie={wie} klein />
        {wie === "cito" ? KOP_ZELF : KOP_VRAGEN}
      </h6>
      <div className="ev-doen-t">{children}</div>
    </section>
  );
}

/** Kop van het vlak met wat alleen voor Cito is: het merk "Intern Cito" en wat dat betekent. */
function InternKop() {
  return (
    <p className="ev-intern-kop">
      <span className="ev-merk">Intern Cito</span>
      <span>Alleen voor Cito: dit deel gaat niet naar 3sides.</span>
    </p>
  );
}

/** Staat er in dit kader iets achter de klik dat we aan 3sides communiceren? */
function heeftBoodschap(k: Kader): boolean {
  return (
    (k.punten ?? []).some((s) => tekst(s).trim() !== "") || tekst(k.aanZet3sides).trim() !== "" || tekst(k.vraag3sides).trim() !== ""
  );
}

function Feit({ t }: { t: string }) {
  const { kern, bron } = splitsBron(t);
  return (
    <span className="ev-feit-t">
      {metBronlinks(kern)}
      {bron && <span className="ev-bron">{metBronlinks(bron)}</span>}
    </span>
  );
}

function Alineas({ t }: { t: string }) {
  return (
    <>
      {alineas(t).map((a, i) => (
        <p key={i}>
          {a.chip && <BeeldChip kop={a.chip} klein />}
          {a.chip && " "}
          {a.label && <b>{metBronlinks(a.label)}</b>}
          {a.label && " "}
          {metBronlinks(a.tekst)}
        </p>
      ))}
    </>
  );
}

function Veld({ label, hint, children }: { label: string; hint?: string; children: ReactNode }) {
  return (
    <label className="ev-veld">
      <span className="ev-l">{label}</span>
      {children}
      {hint && <span className="ev-hint">{hint}</span>}
    </label>
  );
}

// ---------- een kader in weergave ----------

function KaderWeergave(p: {
  k: Kader;
  nr: number;
  uid: string;
  /** alleen wat we aan 3sides communiceren; al het andere staat dan niet in de pagina */
  extern: boolean;
  open: boolean;
  diep: boolean | undefined;
  print: boolean;
  zetOpen: (open: boolean) => void;
  zetDiep: (open: boolean) => void;
  zetK: (fn: (k: Kader) => void) => void;
}) {
  const { k, nr, uid, print, extern } = p;
  const bewerkHier = useContext(BewerkHierContext);
  const titel = k.titel.replace(/^\d+\s*·\s*/, "");
  const { kop, zin } = splitsBeeld(tekst(k.beeld));
  // De boodschap aan 3sides: in beide weergaven.
  const punten = (k.punten ?? []).map(tekst).filter((s) => s.trim() !== "");
  const aanZet3sides = tekst(k.aanZet3sides).trim();
  const vraag3sides = tekst(k.vraag3sides).trim();
  const boodschap = punten.length > 0 || aanZet3sides !== "" || vraag3sides !== "";
  // Alleen voor Cito: extern leeg, zodat er niets van getekend wordt.
  const actieBij = extern ? "" : tekst(k.actieBij).trim();
  const wie = partijen(actieBij);
  const aanZetCito = extern ? "" : tekst(k.aanZetCito).trim();
  const vraag = extern ? "" : tekst(k.vraag).trim();
  const secties = extern ? [] : (k.secties ?? []);
  const heeftKern = boodschap || aanZetCito !== "";
  const heeftOnder = secties.length > 0 || vraag !== "";
  // Extern zit er achter de klik alleen de boodschap; zonder boodschap is er niets om open te klappen.
  const klapbaar = !extern || boodschap;
  const isOpen = print || p.open || !klapbaar;
  // zonder de hapklare kern staat de onderbouwing meteen open
  const diepOpen = print || (p.diep ?? !heeftKern);
  const oordeel = tekst(k.oordeel);
  const ids = { titel: `${uid}-t`, keuze: `${uid}-keuze`, pillen: `${uid}-pillen`, body: `${uid}-body` };

  // wat er achter de klik zit, in woorden op de knop
  const inhoud: string[] = [];
  if (punten.length > 0) inhoud.push(`${punten.length} ${punten.length === 1 ? "feit" : "feiten"}`);
  if (aanZet3sides) inhoud.push("wat we van 3sides vragen");
  if (vraag3sides) inhoud.push("vraag voor het gesprek");
  if (aanZetCito) inhoud.push("wat Cito zelf doet");
  const meer = inhoud.length > 0 ? hoofdletter(inhoud.join(" · ")) : heeftOnder ? "Onderbouwing en ons oordeel" : "Ons oordeel";

  // Klik op de kop klapt open of dicht; niet bij een klik op een link of veld, of bij het selecteren van tekst.
  const kopKlik = (e: MouseEvent<HTMLDivElement>) => {
    if ((e.target as HTMLElement).closest("a,button,select,input,textarea,label,summary")) return;
    if ((window.getSelection()?.toString() ?? "") !== "") return;
    p.zetOpen(!p.open);
  };

  return (
    <li
      id={"ev-" + k.id}
      className={"ev-kader" + (isOpen ? " is-open" : "")}
      data-kader={nr}
      data-beeld={kop ? beeldSoort(kop) : "leeg"}
      data-oordeel={extern ? undefined : oordeel}
      aria-labelledby={ids.titel}
    >
      <div className={"ev-kop" + (extern ? " ev-kop-smal" : "") + (klapbaar ? "" : " ev-kop-vast")} onClick={klapbaar ? kopKlik : undefined}>
        <span className="ev-nr" aria-hidden="true">
          {nr}
        </span>
        <div className="ev-kop-t">
          <h5 className="ev-titel" id={ids.titel}>
            {titel}
          </h5>
          {k.ondertitel && <p className="ev-sub">{metBronlinks(k.ondertitel)}</p>}
          {bewerkHier && !print && (
            <button type="button" className="ev-bewerk" title={`Kader ${nr} bewerken`} onClick={(e) => bewerkHier(e.currentTarget)}>
              <svg viewBox="0 0 16 16" width="12" height="12" aria-hidden="true">
                <path d="M11.3 2.3a1.5 1.5 0 0 1 2.1 2.1l-7.6 7.6-3 .9.9-3z" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinejoin="round" />
              </svg>
              Kader bewerken
            </button>
          )}
        </div>
        <div className="ev-hoofd">
          <p className="ev-beeldrij">
            {/* extern is dit wat we communiceren, geen voorstel meer */}
            <span className="ev-l">{extern ? "Onze bevinding" : "Eerste beeld · voorstel"}</span>
            {kop ? <BeeldChip kop={kop} /> : !zin && <span className="ev-beeld ev-beeld-leeg">te bepalen</span>}
          </p>
          {zin && <p className="ev-zin">{metBronlinks(zin)}</p>}
        </div>
        {!extern && (
          <dl className="ev-rail">
            {/* zonder invulling geen "te bepalen": wie wat doet, staat in de twee vakken hieronder */}
            {actieBij && (
              <div className="ev-gegeven">
                <dt className="ev-l">Aan zet</dt>
                <dd className="ev-wie">
                  {wie.length > 0 && (
                    <span className="ev-wie-avs">
                      {wie.map((w) => (
                        <Avatar key={w} wie={w} klein />
                      ))}
                    </span>
                  )}
                  <span>{metBronlinks(actieBij)}</span>
                </dd>
              </div>
            )}
            <div className="ev-gegeven">
              <dt className="ev-l">
                <label htmlFor={ids.keuze}>Ons oordeel</label>
              </dt>
              <dd>
                <OordeelKeuze id={ids.keuze} k={k} naam={titel} on={(x) => p.zetK((n) => void (n.oordeel = x))} />
                {/* op papier geen leeg keuzelijstje */}
                {oordeel === "" && <span className="ev-tb ev-alleen-print">nog niet gekozen</span>}
              </dd>
            </div>
          </dl>
        )}
      </div>

      {klapbaar && (
        <details
          className="ev-meer"
          open={isOpen}
          onToggle={(e) => {
            if (print) return;
            p.zetOpen(e.currentTarget.open);
          }}
        >
          <summary className="ev-meer-kop">
            <Chevron />
            <span className="ev-meer-t">{meer}</span>
          </summary>
          <div className="ev-body" id={ids.body}>
            {boodschap && (
              <div className={"ev-kern" + (punten.length > 0 ? " heeft-feiten" : "") + (aanZet3sides ? " heeft-vragen" : "")}>
                {punten.length > 0 && (
                  <section className="ev-feitenvak">
                    <h6 className="ev-h">Feiten</h6>
                    <ol className="ev-feiten">
                      {punten.map((s, i) => (
                        <li key={i}>
                          <span className="ev-fnr" aria-hidden="true">
                            {i + 1}
                          </span>
                          <Feit t={s} />
                        </li>
                      ))}
                    </ol>
                  </section>
                )}
                {aanZet3sides && <Doen wie="3sides">{metBronlinks(aanZet3sides)}</Doen>}
                {vraag3sides && (
                  <section className="ev-vraagvak">
                    <Spreekballon />
                    <h6 className="ev-h">Vraag voor het gesprek</h6>
                    <p className="ev-vraag-t">{metBronlinks(vraag3sides)}</p>
                  </section>
                )}
              </div>
            )}

            {!extern && (
              <div className="ev-intern">
                <InternKop />
                {aanZetCito && <Doen wie="cito">{metBronlinks(aanZetCito)}</Doen>}

                <section className="ev-oordeelvak">
                  <div className="ev-oordeel-kop">
                    <h6 className="ev-h" id={ids.pillen}>
                      Ons oordeel (intern)
                    </h6>
                    <OordeelPillen groep={ids.pillen} v={oordeel} labelId={ids.pillen} on={(x) => p.zetK((n) => void (n.oordeel = x))} />
                    <span className="ev-bewaard">Wordt meteen bewaard</span>
                  </div>
                  <label className="ev-sr" htmlFor={"ev-notitie-" + k.id}>
                    Toelichting bij ons oordeel
                  </label>
                  <Notitie id={"ev-notitie-" + k.id} v={tekst(k.notitie)} zichtbaar={isOpen} on={(x) => p.zetK((n) => void (n.notitie = x))} />
                </section>

                {heeftOnder && (
                  <details
                    className="ev-diep"
                    open={diepOpen}
                    onToggle={(e) => {
                      if (print) return;
                      p.zetDiep(e.currentTarget.open);
                    }}
                  >
                    <summary className="ev-diep-kop">
                      <Chevron />
                      <span className="ev-meer-t">Onderbouwing</span>
                      {secties.length > 0 && (
                        <span className="ev-diep-n">
                          {secties.length} {secties.length === 1 ? "onderdeel" : "onderdelen"}, met de bronnen
                        </span>
                      )}
                    </summary>
                    <div className="ev-onder">
                      {vraag && (
                        <div className="ev-s ev-s-toets">
                          <p className="ev-s-kop" role="heading" aria-level={6}>
                            Wat we toetsen
                          </p>
                          <div className="ev-s-t">
                            <p>{metBronlinks(vraag)}</p>
                          </div>
                        </div>
                      )}
                      {secties.map((s, si) => (
                        <div key={si} className="ev-s">
                          <p className="ev-s-kop" role="heading" aria-level={6}>
                            {s.label}
                          </p>
                          <div className="ev-s-t">
                            <Alineas t={s.tekst} />
                          </div>
                        </div>
                      ))}
                    </div>
                  </details>
                )}
              </div>
            )}
          </div>
        </details>
      )}
    </li>
  );
}

// ---------- een kader in bewerkmodus ----------

function KaderBewerken(p: {
  k: Kader;
  nr: number;
  /** alleen de velden die we aan 3sides communiceren; het kader zelf is hier niet weg te halen */
  extern: boolean;
  zetK: (fn: (k: Kader) => void) => void;
  weg: () => void;
}) {
  const { k, nr, extern, zetK } = p;
  const punten = k.punten ?? [];
  return (
    <li className="ev-kader ev-kader-edit is-open" data-kader={nr} data-beeld={tekst(k.beeld).trim() ? beeldSoort(tekst(k.beeld)) : "leeg"}>
      <div className="ev-kop ev-kop-smal">
        <span className="ev-nr" aria-hidden="true">
          {nr}
        </span>
        <div className="ev-kop-t">
          <div className="ok-rij">
            <h5 className="ev-titel">
              <V v={k.titel} on={(x) => zetK((n) => void (n.titel = x))} edit ph="Titel van het kader (de vraag)" />
            </h5>
            {!extern && <WegKnop titel="Kader verwijderen" label="× kader" on={p.weg} />}
          </div>
          <p className="ev-sub">
            <V v={tekst(k.ondertitel)} on={(x) => zetK((n) => void (n.ondertitel = x))} edit ph="Ondertitel" />
          </p>
        </div>
      </div>

      <div className="ev-body">
        <div className="ev-velden">
          <Veld
            label={extern ? "Onze bevinding" : "Eerste beeld · voorstel"}
            hint="Begin met Ja, Deels, Nee of Nee, deels, dan een dubbele punt en één of twee zinnen."
          >
            <V v={tekst(k.beeld)} on={(x) => zetK((n) => void (n.beeld = x))} edit ml ph="Bijvoorbeeld: Deels: …" />
          </Veld>
          {!extern && (
            <Veld label="Aan zet" hint="Kort: 3sides, Cito, of 3sides en Cito. Leeg: dan staat het er niet.">
              <V v={tekst(k.actieBij)} on={(x) => zetK((n) => void (n.actieBij = x))} edit ph="Wie aan zet is (optioneel)" />
            </Veld>
          )}
        </div>

        <div className="ev-kern heeft-feiten heeft-vragen">
          <section className="ev-feitenvak">
            <h6 className="ev-h">Feiten</h6>
            <ol className="ev-feiten ev-feiten-edit">
              {punten.map((s, pi) => (
                <li key={pi}>
                  <span className="ev-fnr" aria-hidden="true">
                    {pi + 1}
                  </span>
                  <span className="ok-rij">
                    <V
                      v={tekst(s)}
                      on={(x) =>
                        zetK((n) => {
                          (n.punten ??= [])[pi] = x;
                        })
                      }
                      edit
                      ml
                      ph="Feitelijke constatering, met de bron tussen haakjes"
                    />
                    <WegKnop titel="Feit verwijderen" on={() => zetK((n) => void n.punten?.splice(pi, 1))} />
                  </span>
                </li>
              ))}
            </ol>
            <div className="ev-plus">
              <PlusKnop label="+ feit" on={() => zetK((n) => void (n.punten ??= []).push(""))} />
            </div>
          </section>
          <Doen wie="3sides">
            <V v={tekst(k.aanZet3sides)} on={(x) => zetK((n) => void (n.aanZet3sides = x))} edit ml ph="Wat we van 3sides vragen" />
          </Doen>
          <section className="ev-vraagvak">
            <Spreekballon />
            <h6 className="ev-h">Vraag voor het gesprek</h6>
            <div className="ev-vraag-t">
              <V v={tekst(k.vraag3sides)} on={(x) => zetK((n) => void (n.vraag3sides = x))} edit ml ph="De vraag die we 3sides stellen" />
            </div>
          </section>
        </div>

        {!extern && (
          <div className="ev-intern">
            <InternKop />
            <Doen wie="cito">
              <V v={tekst(k.aanZetCito)} on={(x) => zetK((n) => void (n.aanZetCito = x))} edit ml ph="Wat Cito zelf doet" />
            </Doen>

            <div className="ev-diep ev-diep-edit">
              <div className="ev-diep-kop">
                <span className="ev-meer-t">Onderbouwing</span>
              </div>
              <div className="ev-onder">
                <div className="ev-s ev-s-toets">
                  <p className="ev-s-kop">Wat we toetsen</p>
                  <div className="ev-s-t">
                    <V v={tekst(k.vraag)} on={(x) => zetK((n) => void (n.vraag = x))} edit ml ph="Wat we toetsen" />
                  </div>
                </div>
                {k.secties.map((s, si) => (
                  <div key={si} className="ev-s">
                    <div className="ev-s-kop">
                      <span className="ok-rij">
                        <V v={s.label} on={(x) => zetK((n) => void (n.secties[si].label = x))} edit ph="Label" />
                        <WegKnop titel="Sectie verwijderen" on={() => zetK((n) => void n.secties.splice(si, 1))} />
                      </span>
                    </div>
                    <div className="ev-s-t">
                      <V v={s.tekst} on={(x) => zetK((n) => void (n.secties[si].tekst = x))} edit ml ph="Tekst" />
                    </div>
                  </div>
                ))}
                <div className="ev-plus">
                  <PlusKnop label="+ sectie" on={() => zetK((n) => void n.secties.push({ label: "Nieuwe sectie", tekst: "" }))} />
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </li>
  );
}

// ---------- het blok ----------

export default function EvaluatieBlok({ b, edit, zet }: LosBlokProps<"evaluatie">) {
  const kaders = b.kaders ?? [];
  // extern (tabblad Evaluatie 3sides): alleen wat we aan 3sides communiceren; anders alles
  const extern = useContext(EvaluatieWeergaveContext) === "extern";
  const uid = useId();
  const print = useSyncExternalStore(printAbonnement, printStand, printServer);
  // in weergave standaard dicht; de gebruiker klapt open wat hij bespreekt
  const [open, setOpen] = useState<Record<string, boolean>>({});
  const [diep, setDiep] = useState<Record<string, boolean>>({});
  const sleutel = (k: Kader, i: number) => k.id || "kader-" + i;
  const ingevuld = kaders.filter((k) => tekst(k.oordeel) !== "").length;
  const pct = kaders.length > 0 ? Math.round((ingevuld / kaders.length) * 100) : 0;
  // De kaders waar iets achter de klik zit: intern allemaal, extern die met een boodschap.
  const klapbaar = kaders.map((k, i) => ({ k, i })).filter(({ k }) => !extern || heeftBoodschap(k));
  const allesOpen = klapbaar.length > 0 && klapbaar.every(({ k, i }) => open[sleutel(k, i)] === true);
  const rolCito = tekst(b.rolCito).trim();
  const rol3sides = tekst(b.rol3sides).trim();
  const zetK = (i: number, fn: (k: Kader) => void) =>
    zet((n) => {
      const k = n.kaders[i];
      if (k) fn(k);
    });
  const wissel = (soort: "open" | "diep", id: string, aan: boolean) =>
    (soort === "open" ? setOpen : setDiep)((o) => (o[id] === aan ? o : { ...o, [id]: aan }));

  return (
    <div className={"ev" + (edit ? " ev-edit" : "") + (extern ? " ev-extern" : "")}>
      {(edit || b.titel) && (
        <h4 className="okd-bt">
          <V v={tekst(b.titel)} on={(x) => zet((n) => void (n.titel = x))} edit={edit} ph="Titel (optioneel)" />
        </h4>
      )}
      {(edit || b.intro) && (
        <V v={tekst(b.intro)} on={(x) => zet((n) => void (n.intro = x))} edit={edit} ml block cls="ok-sub" ph="Inleiding (optioneel)" />
      )}

      {edit ? (
        <div className="ev-rollen ev-rollen-edit">
          <span className="ev-l ev-rollen-l">Rolverdeling</span>
          <div className="ev-rol">
            <Avatar wie="cito" />
            <Veld label="Rol van Cito">
              <V v={tekst(b.rolCito)} on={(x) => zet((n) => void (n.rolCito = x))} edit ph="Bijvoorbeeld: leidt: bepaalt, toetst en beslist" />
            </Veld>
          </div>
          <div className="ev-rol">
            <Avatar wie="3sides" />
            <Veld label="Rol van 3sides">
              <V v={tekst(b.rol3sides)} on={(x) => zet((n) => void (n.rol3sides = x))} edit ph="Bijvoorbeeld: voert uit: stelt op en levert" />
            </Veld>
          </div>
        </div>
      ) : (
        (rolCito || rol3sides) && (
          <div className="ev-rollen" role="group" aria-label="Rolverdeling">
            <span className="ev-l ev-rollen-l">Rolverdeling</span>
            <div className="ev-rol">
              <Avatar wie="cito" />
              <span className="ev-rol-t">
                <b className="ev-rol-n">Cito</b>
                {rolCito && <span className="ev-rol-r">{metBronlinks(rolCito)}</span>}
              </span>
            </div>
            <div className="ev-rol">
              <Avatar wie="3sides" />
              <span className="ev-rol-t">
                <b className="ev-rol-n">3sides</b>
                {rol3sides && <span className="ev-rol-r">{metBronlinks(rol3sides)}</span>}
              </span>
            </div>
          </div>
        )
      )}

      {!edit && klapbaar.length > 0 && (
        <div className="ev-tools">
          <button
            type="button"
            className={"ev-alles" + (allesOpen ? " is-open" : "")}
            onClick={() => {
              const aan = !allesOpen;
              setOpen(Object.fromEntries(kaders.map((k, i) => [sleutel(k, i), aan])));
            }}
          >
            <Chevron />
            {allesOpen ? "Alles inklappen" : "Alles openklappen"}
          </button>
          {/* de teller hoort bij ons eigen oordeel: alleen intern */}
          {!extern && (
            <span className="ev-invul">
              <span className="ev-invul-t">Ons oordeel ingevuld</span>
              <span className="ev-meter" role="progressbar" aria-valuemin={0} aria-valuemax={kaders.length} aria-valuenow={ingevuld} aria-label="Ons oordeel ingevuld">
                <span style={{ width: pct + "%" }} />
              </span>
              <b>
                {ingevuld} van {kaders.length}
              </b>
            </span>
          )}
        </div>
      )}

      <ol className="ev-lijst">
        {kaders.map((k, i) => {
          const id = sleutel(k, i);
          return edit ? (
            <KaderBewerken
              key={id}
              k={k}
              nr={i + 1}
              extern={extern}
              zetK={(fn) => zetK(i, fn)}
              weg={() => zet((n) => void n.kaders.splice(i, 1))}
            />
          ) : (
            <KaderWeergave
              key={id}
              k={k}
              nr={i + 1}
              uid={`${uid}-${id}`}
              extern={extern}
              open={open[id] === true}
              diep={diep[id]}
              print={print}
              zetOpen={(aan) => wissel("open", id, aan)}
              zetDiep={(aan) => wissel("diep", id, aan)}
              zetK={(fn) => zetK(i, fn)}
            />
          );
        })}
      </ol>
      {edit && extern && (
        <p className="ev-hint ev-hint-los" role="note">
          Hier pas je aan wat we aan 3sides communiceren. Een kader toevoegen of weghalen, en wat alleen voor Cito is, doe je op het tabblad
          Evaluatie intern.
        </p>
      )}
      {edit && !extern && (
        <div className="ev-plus">
          <PlusKnop
            label="+ kader"
            on={() =>
              zet((n) =>
                void n.kaders.push({
                  id: "kader-" + Date.now().toString(36),
                  titel: "Nieuw kader",
                  ondertitel: "",
                  vraag: "",
                  beeld: "",
                  actieBij: "",
                  secties: [],
                  oordeel: "",
                  notitie: "",
                })
              )
            }
          />
        </div>
      )}

      {(edit || b.legenda) && (
        <p className="ev-legenda">
          <V v={tekst(b.legenda)} on={(x) => zet((n) => void (n.legenda = x))} edit={edit} ml ph="Legenda (optioneel)" />
        </p>
      )}
    </div>
  );
}
