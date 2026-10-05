"use client";

// Opmerkingen bij een blok van een bewerkbaar document, zoals in Word, maar gekoppeld aan
// het blok zelf (kaart, tabel, plaat) in plaats van alleen de kantlijn. In weergave heeft
// elk blok een knop "Opmerking" die altijd zichtbaar is (geen hover nodig, ook niet op een
// aanraakscherm): op een breed scherm in de kantlijn rechts naast het blok, smaller in een
// eigen smalle strook boven de rechterbovenhoek, zodat hij nooit over de inhoud of over
// knoppen van het blok valt. De opmerkingen staan als ballonnen naast het blok (breed
// scherm) of eronder (smal), met naam en datum, antwoorden, "afgehandeld" en verwijderen.
//
// Een opmerking kan op één passage in het blok wijzen (citaat + citaatNr): de woorden die
// de schrijver selecteerde, of de alinea, regel, rij, cel of kaart die hij aanwees met
// "Kies de plek". De passage wordt op tekst teruggevonden (witruimte telt niet mee) en in
// het blok gemarkeerd zonder de DOM van het blok te wijzigen: woorden met de CSS Custom
// Highlight API, een hele alinea, rij of kaart met een kader in een laag over het blok
// (en woorden ook, in een browser zonder die API). Staat de tekst er niet meer zo, dan
// blijft het citaat in de ballon staan met de melding dat de tekst is gewijzigd.
//
// Opslag in session.opmerkingen (sleutel: document + sectie + blokindex), dus iedereen met
// de link ziet ze. De naam van de schrijver wordt in localStorage onthouden
// (din_opmerkingen_door).

import { createContext, useCallback, useContext, useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import type { CSSProperties, ReactNode } from "react";
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

function rustigeBeweging(): boolean {
  return window.matchMedia("(prefers-reduced-motion: reduce)").matches;
}

// ---------- de passage: tekstmodel van een blok ----------
//
// Het model is alle tekst in de DOM van het blok, in volgorde, zonder witruimte ("kaal").
// Bewust niet alleen de zichtbare tekst: wat in een ingeklapt kader staat of op een smal
// scherm verborgen is, telt mee, zodat "de hoeveelste keer" (citaatNr) op elk scherm en in
// elke toestand hetzelfde uitkomt. Niet in het model: de opmerkingen zelf, invoervelden
// en keuzelijsten, en tekst die alleen voor de voorlezer is.

/** Eigen onderdelen in het blok: horen niet bij de inhoud. */
const EIGEN = ".opm-knop,.opm-ballonnen,.opm-laag";
const GEEN_TEKST = new Set(["SCRIPT", "STYLE", "SELECT", "OPTION", "OPTGROUP", "DATALIST", "TEXTAREA", "INPUT", "TEMPLATE", "NOSCRIPT", "TITLE", "DESC"]);
const ALLEEN_VOORLEZER = /(?:^|[-_])sr(?:[-_]only)?$|visually-hidden/;
/** Witruimte, plus tekens die je niet ziet (zachte afbreking, breedteloze spatie). */
const WIT = /[\s\u200b\u00ad]+/g;
/** Een citaat is hooguit zo lang; van een langere passage bewaren we het begin en het eind. */
const CITAAT_MAX = 300;
const KOP_MAX = 190;
const STAART_MAX = 90;
/** Staat in een ingekort citaat tussen het begin en het eind van de passage. */
const TUSSEN = " […] ";
/** De passage van de opmerking die nog in het formulier staat. */
const CONCEPT = "concept";

interface Stuk { knoop: Text; /** begin in de kale tekst */ van: number; /** aantal kale tekens */ n: number; /** er staat losse witruimte of een regeleinde (br) voor */ los: boolean }
interface Kaart {
  kaal: string;
  stukken: Stuk[];
  /** per element met tekst: [begin, einde) in de kale tekst */
  bereik: Map<Element, [number, number]>;
  wortels: Element[];
}
interface Plek { citaat: string; nr: number }
interface Vak { x: number; y: number; w: number; h: number }

function isWit(c: number): boolean {
  return (
    (c >= 9 && c <= 13) || c === 32 || c === 0xa0 || c === 0xad || c === 0x1680 || (c >= 0x2000 && c <= 0x200b) ||
    c === 0x2028 || c === 0x2029 || c === 0x202f || c === 0x205f || c === 0x3000 || c === 0xfeff
  );
}

function kaalVan(s: string): string {
  return s.replace(WIT, "");
}

/** Aantal kale tekens in s vóór positie `tot`. */
function telKaal(s: string, tot: number): number {
  let n = 0;
  for (let i = 0; i < tot && i < s.length; i++) if (!isWit(s.charCodeAt(i))) n++;
  return n;
}

/** Positie in s van het k-de kale teken (vanaf 0); voorbij het laatste: de lengte. */
function plaatsIn(s: string, k: number): number {
  let n = 0;
  for (let i = 0; i < s.length; i++) {
    if (isWit(s.charCodeAt(i))) continue;
    if (n === k) return i;
    n++;
  }
  return s.length;
}

function slaOver(el: Element): boolean {
  if (GEEN_TEKST.has(el.tagName.toUpperCase())) return true;
  for (const c of el.classList) if (ALLEEN_VOORLEZER.test(c)) return true;
  return false;
}

function bouwKaart(wrap: HTMLElement): Kaart {
  const stukken: Stuk[] = [];
  const delen: string[] = [];
  const bereik = new Map<Element, [number, number]>();
  let lengte = 0;
  let los = false;
  const loop = (el: Element) => {
    const begin = lengte;
    for (let k = el.firstChild; k; k = k.nextSibling) {
      if (k.nodeType === 3) {
        const kaal = kaalVan((k as Text).data);
        if (!kaal) {
          // alleen witruimte (bijv. de spatie tussen twee elementen): onthouden voor het citaat
          if ((k as Text).data) los = true;
          continue;
        }
        stukken.push({ knoop: k as Text, van: lengte, n: kaal.length, los });
        delen.push(kaal);
        lengte += kaal.length;
        los = false;
      } else if (k.nodeType === 1) {
        const e = k as Element;
        if (e.tagName === "BR") los = true;
        else if (!slaOver(e)) loop(e);
      }
    }
    if (lengte > begin) bereik.set(el, [begin, lengte]);
  };
  const wortels = [...wrap.children].filter((c) => !c.matches(EIGEN) && !slaOver(c));
  for (const w of wortels) loop(w);
  return { kaal: delen.join(""), stukken, bereik, wortels };
}

/** Index van het stuk waarin kaal teken i valt. */
function stukIndex(kaart: Kaart, i: number): number {
  let lo = 0;
  let hi = kaart.stukken.length - 1;
  while (lo < hi) {
    const m = (lo + hi + 1) >> 1;
    if (kaart.stukken[m].van <= i) lo = m;
    else hi = m - 1;
  }
  return lo;
}

function maakRange(kaart: Kaart, a: number, b: number): Range {
  const s = kaart.stukken[stukIndex(kaart, a)];
  const e = kaart.stukken[stukIndex(kaart, b - 1)];
  const r = document.createRange();
  r.setStart(s.knoop, plaatsIn(s.knoop.data, a - s.van));
  r.setEnd(e.knoop, plaatsIn(e.knoop.data, b - 1 - e.van) + 1);
  return r;
}

/** Staat er tussen twee tekstknopen een grens van een blok (alinea, cel, kaart, chip)? */
function blokgrens(a: Node, b: Node): boolean {
  const boven = new Set<Node>();
  for (let n = a.parentNode; n; n = n.parentNode) boven.add(n);
  const pad: Element[] = [];
  let gedeeld: Node | null = b.parentNode;
  for (; gedeeld && !boven.has(gedeeld); gedeeld = gedeeld.parentNode) if (gedeeld.nodeType === 1) pad.push(gedeeld as Element);
  for (let n = a.parentNode; n && n !== gedeeld; n = n.parentNode) if (n.nodeType === 1) pad.push(n as Element);
  return pad.some((el) => {
    const d = getComputedStyle(el).display;
    return d !== "inline" && d !== "contents";
  });
}

/**
 * De tekst van [a, b) zoals je hem leest: met spaties tussen woorden en tussen blokken
 * (hooguit `max` tekens). Zonder witruimte is het resultaat precies de kale tekst vanaf a,
 * dus het is terug te vinden.
 */
function leesbaar(kaart: Kaart, a: number, b: number, max = Infinity): string {
  let uit = "";
  let vorige: Stuk | null = null;
  for (let i = stukIndex(kaart, a); i < kaart.stukken.length && uit.length < max; i++) {
    const s = kaart.stukken[i];
    if (s.van >= b) break;
    const t = s.knoop.data;
    const van = s.van < a ? plaatsIn(t, a - s.van) : 0;
    const tot = s.van + s.n > b ? plaatsIn(t, b - 1 - s.van) + 1 : t.length;
    const deel = t.slice(van, tot).replace(/[\u200b\u00ad]/g, "").replace(/\s+/g, " ");
    if (vorige && !uit.endsWith(" ") && (deel.startsWith(" ") || s.los || blokgrens(vorige.knoop, s.knoop))) uit += " ";
    uit += uit.endsWith(" ") || !uit ? deel.replace(/^ /, "") : deel;
    vorige = s;
  }
  // geen losse spatie voor een leesteken of na een haakje (ontstaat bij een pictogram in de tekst)
  return uit.trim().replace(/ ([),.;])/g, "$1").replace(/\( /g, "(");
}

/** Het citaat in zoekvorm: het begin (kaal) en, bij een ingekort citaat, het eind van de passage. */
function naaldVan(citaat: string): { kop: string; staart: string } {
  const i = citaat.indexOf(TUSSEN);
  return i < 0 ? { kop: kaalVan(citaat), staart: "" } : { kop: kaalVan(citaat.slice(0, i)), staart: kaalVan(citaat.slice(i + TUSSEN.length)) };
}

/**
 * Bewaarvorm van de passage [a, b): het citaat en de hoeveelste keer dat het in het blok
 * staat. Een lange passage (een hele rij of kaart) wordt ingekort tot begin, TUSSEN en eind;
 * zo is ook het einde terug te vinden, en breekt een wijziging in het midden de koppeling niet.
 */
function plekVan(kaart: Kaart, a: number, b: number): Plek {
  let citaat = leesbaar(kaart, a, b);
  if (citaat.length > CITAAT_MAX) {
    const heel = citaat;
    let kop = heel.slice(0, KOP_MAX);
    const spatie = kop.lastIndexOf(" ");
    if (spatie > KOP_MAX * 0.6) kop = kop.slice(0, spatie);
    kop = kop.trimEnd();
    const staartVan = (n: number) => {
      let s = heel.slice(-n);
      const i = s.indexOf(" ");
      if (i >= 0 && i < n * 0.4) s = s.slice(i + 1);
      return s.trimStart();
    };
    // het eind moet eenduidig zijn: de eerste keer dat het na het begin voorkomt, is het einde van de passage
    const kopKaal = kaalVan(kop);
    let staart = staartVan(STAART_MAX);
    for (let n = STAART_MAX; n <= STAART_MAX + 20; n += 10) {
      staart = staartVan(n);
      const k = kaalVan(staart);
      if (kaart.kaal.indexOf(k, a + kopKaal.length) + k.length === b) break;
    }
    citaat = kop + TUSSEN + staart;
  }
  const { kop } = naaldVan(citaat);
  let nr = 0;
  for (let i = kaart.kaal.indexOf(kop); i >= 0 && i < a; i = kaart.kaal.indexOf(kop, i + 1)) nr++;
  return { citaat, nr };
}

/** De passage terugzoeken: de nr-de keer dat het citaat in het blok staat; null = staat er niet (meer). */
function vind(kaart: Kaart, citaat: string, nr: number): { a: number; b: number } | null {
  const { kop, staart } = naaldVan(citaat);
  if (!kop) return null;
  let a = -1;
  for (let k = 0; k <= Math.max(0, nr); k++) {
    a = kaart.kaal.indexOf(kop, a + 1);
    if (a < 0) return null;
  }
  if (!staart) return { a, b: a + kop.length };
  const eind = kaart.kaal.indexOf(staart, a + kop.length);
  return eind < 0 ? null : { a, b: eind + staart.length };
}

/** [begin, einde) in de kale tekst van wat een Range (de selectie) omvat. */
function bereikVan(kaart: Kaart, r: Range): [number, number] {
  let a = -1;
  let b = -1;
  for (const s of kaart.stukken) {
    if (!r.intersectsNode(s.knoop)) {
      if (a >= 0) break;
      continue;
    }
    const lo = s.knoop === r.startContainer ? telKaal(s.knoop.data, r.startOffset) : 0;
    const hi = s.knoop === r.endContainer ? telKaal(s.knoop.data, r.endOffset) : s.n;
    if (hi <= lo) continue;
    if (a < 0) a = s.van + lo;
    b = s.van + hi;
  }
  return a < 0 ? [0, 0] : [a, b];
}

// ---------- eenheden: wat je als geheel kunt aanwijzen ----------
//
// Een eenheid is een element met tekst dat als blok wordt getoond: een alinea, regel,
// lijstpunt, rij, cel, kaart. Bepaald op de vorm (display), niet op klassennamen, zodat het
// voor elk soort blok werkt. Niet: het hele blok zelf (dat is "het hele onderdeel"), een
// tabel als geheel, en inklapbare delen als geheel (de kop en de inhoud apart wel).

const GEEN_EENHEID = /^(inline|contents|none|table|inline-table|table-row-group|table-header-group|table-footer-group|table-column|table-column-group)$/;

function zichtbaar(el: Element): boolean {
  if (typeof el.checkVisibility === "function") return el.checkVisibility({ visibilityProperty: true });
  return el.getClientRects().length > 0;
}

function isEenheid(el: Element, kaart: Kaart): el is HTMLElement {
  if (!(el instanceof HTMLElement) || el.tagName === "DETAILS") return false;
  const r = kaart.bereik.get(el);
  if (!r || r[1] - r[0] < 2) return false;
  if (r[0] === 0 && r[1] === kaart.kaal.length) return false;
  return !GEEN_EENHEID.test(getComputedStyle(el).display);
}

function zelfdeBereik(kaart: Kaart, x: Element, y: Element): boolean {
  const p = kaart.bereik.get(x);
  const q = kaart.bereik.get(y);
  return !!p && !!q && p[0] === q[0] && p[1] === q[1];
}

/** De eenheid waar een element in valt: de kleinste, en van elementen met dezelfde tekst de buitenste. */
function eenheidVan(kaart: Kaart, wrap: HTMLElement, van: Element): HTMLElement | null {
  let k: HTMLElement | null = null;
  for (let n: Element | null = van; n && n !== wrap; n = n.parentElement) {
    if (k && !zelfdeBereik(kaart, k, n)) break;
    if (isEenheid(n, kaart)) k = n;
  }
  // In een tabel wijst de eerste cel van een rij de hele rij aan; de andere cellen zichzelf.
  if (k && (k.tagName === "TD" || k.tagName === "TH") && !k.previousElementSibling && k.nextElementSibling) {
    const rij = k.parentElement;
    if (rij && isEenheid(rij, kaart)) k = rij;
  }
  return k;
}

function eenheidOp(kaart: Kaart, wrap: HTMLElement, x: number, y: number): HTMLElement | null {
  for (const raak of document.elementsFromPoint(x, y)) {
    if (raak === wrap || !wrap.contains(raak)) return null;
    if (raak.closest(EIGEN)) return null;
    return eenheidVan(kaart, wrap, raak);
  }
  return null;
}

/** Alle zichtbare eenheden van het blok in leesvolgorde (voor het toetsenbord). */
function alleEenheden(kaart: Kaart, wrap: HTMLElement, max = Infinity): HTMLElement[] {
  const uit: HTMLElement[] = [];
  const gezien = new Set<string>();
  const loop = (el: Element) => {
    if (uit.length >= max) return;
    const r = kaart.bereik.get(el);
    if (!r || !zichtbaar(el)) return;
    if (isEenheid(el, kaart)) {
      const sleutel = r[0] + ":" + r[1];
      if (!gezien.has(sleutel)) {
        gezien.add(sleutel);
        uit.push(el);
      }
    }
    for (const k of el.children) loop(k);
  };
  for (const w of kaart.wortels) loop(w);
  return uit;
}

/** De eenheid die precies de teruggevonden passage is (van elementen met dezelfde tekst de buitenste), of null: losse woorden. */
function eenheidVoor(kaart: Kaart, wrap: HTMLElement, a: number, b: number): HTMLElement | null {
  let beste: HTMLElement | null = null;
  for (let n = kaart.stukken[stukIndex(kaart, a)].knoop.parentElement; n && n !== wrap; n = n.parentElement) {
    const r = kaart.bereik.get(n);
    if (!r) continue;
    if (r[0] !== a || r[1] > b) break;
    if (r[1] === b && isEenheid(n, kaart)) beste = n;
  }
  return beste;
}

/** De kleinste eenheid die ruimer is dan [a, b). */
function ruimereEenheid(kaart: Kaart, wrap: HTMLElement, a: number, b: number): HTMLElement | null {
  for (let n = kaart.stukken[stukIndex(kaart, a)].knoop.parentElement; n && n !== wrap; n = n.parentElement) {
    const r = kaart.bereik.get(n);
    if (!r || r[0] > a || r[1] < b || r[1] - r[0] <= b - a) continue;
    if (isEenheid(n, kaart) && zichtbaar(n)) return eenheidVan(kaart, wrap, n) ?? n;
  }
  return null;
}

/** Hoe je de eenheid noemt: "de rij", "de alinea", "de kaart". */
function soortVan(el: HTMLElement): { lid: "de" | "het"; naam: string } {
  const tag = el.tagName;
  if (tag === "TR") return { lid: "de", naam: "rij" };
  if (tag === "TD" || tag === "TH") return { lid: "de", naam: "cel" };
  if (/^H[1-6]$/.test(tag) || tag === "SUMMARY") return { lid: "de", naam: "kop" };
  if (tag === "FIGCAPTION" || tag === "CAPTION") return { lid: "het", naam: "bijschrift" };
  if (el.children.length === 1 && el.firstElementChild?.tagName === "TABLE") return { lid: "de", naam: "tabel" };
  const cs = getComputedStyle(el);
  const blokkenErin = [...el.children].some((k) => (k.textContent ?? "").trim() !== "" && !/^(inline|contents|none)$/.test(getComputedStyle(k).display));
  if (!blokkenErin) {
    if (tag === "LI") return { lid: "het", naam: "punt" };
    const regel = parseFloat(cs.lineHeight) || parseFloat(cs.fontSize) * 1.5 || 18;
    return el.getBoundingClientRect().height <= regel * 1.9 ? { lid: "de", naam: "regel" } : { lid: "de", naam: "alinea" };
  }
  // een kaart heeft een eigen vlak met ronde hoeken; een lage, brede strook met vakken naast elkaar is een rij
  const vlak = parseFloat(cs.borderTopWidth) > 0 || cs.boxShadow !== "none" || !/^(rgba\(0, 0, 0, 0\)|transparent)$/.test(cs.backgroundColor);
  if (vlak && parseFloat(cs.borderTopLeftRadius) > 0) return { lid: "de", naam: "kaart" };
  const r = el.getBoundingClientRect();
  if (r.height <= 90 && r.width >= r.height * 4 && /grid|flex|table-row/.test(cs.display) && !/column/.test(cs.flexDirection)) return { lid: "de", naam: "rij" };
  return { lid: "het", naam: "deel" };
}

// ---------- waar staat de passage op het scherm ----------

type Knipvakken = Map<Element, DOMRect | null>;

/**
 * Een vak (in venstermaten) afknippen op de voorouders die hun inhoud afkappen (een tabel
 * die opzij schuift) en omrekenen naar het blok; null = niet te zien.
 */
function knipVak(r: { left: number; top: number; right: number; bottom: number }, van: Element | null, wrap: HTMLElement, wr: DOMRect, knip: Knipvakken): Vak | null {
  let { left, top, right, bottom } = r;
  for (let n = van; n && n !== wrap; n = n.parentElement) {
    let k = knip.get(n);
    if (k === undefined) {
      const cs = getComputedStyle(n);
      k = cs.overflowX !== "visible" || cs.overflowY !== "visible" ? n.getBoundingClientRect() : null;
      knip.set(n, k);
    }
    if (k) {
      left = Math.max(left, k.left);
      right = Math.min(right, k.right);
      top = Math.max(top, k.top);
      bottom = Math.min(bottom, k.bottom);
    }
  }
  if (right - left < 1 || bottom - top < 1) return null;
  return { x: Math.round(left - wr.left), y: Math.round(top - wr.top), w: Math.round(right - left), h: Math.round(bottom - top) };
}

function eenheidVak(el: HTMLElement, wrap: HTMLElement, wr: DOMRect, knip: Knipvakken): Vak | null {
  if (!zichtbaar(el)) return null;
  const r = el.getBoundingClientRect();
  if (r.width < 1 || r.height < 1) return null;
  // iets ruimer dan de tekst, zodat de streep links niet tegen de letters staat
  return knipVak({ left: r.left - 4, top: r.top - 2, right: r.right + 4, bottom: r.bottom + 2 }, el.parentElement, wrap, wr, knip);
}

/** De regels tekst van [a, b) als vakken (per regel samengevoegd). */
function tekstVakken(kaart: Kaart, a: number, b: number, wrap: HTMLElement, wr: DOMRect, knip: Knipvakken): Vak[] {
  const los: Vak[] = [];
  const r = document.createRange();
  for (let i = stukIndex(kaart, a); i < kaart.stukken.length; i++) {
    const s = kaart.stukken[i];
    if (s.van >= b) break;
    const ouder = s.knoop.parentElement;
    if (!s.knoop.isConnected || !ouder || !zichtbaar(ouder)) continue;
    const t = s.knoop.data;
    r.setStart(s.knoop, s.van < a ? plaatsIn(t, a - s.van) : 0);
    r.setEnd(s.knoop, s.van + s.n > b ? plaatsIn(t, b - 1 - s.van) + 1 : t.length);
    for (const q of r.getClientRects()) {
      if (q.width < 0.5 || q.height < 0.5) continue;
      const v = knipVak(q, ouder, wrap, wr, knip);
      if (v) los.push(v);
    }
  }
  los.sort((p, q) => p.y - q.y || p.x - q.x);
  const uit: Vak[] = [];
  for (const v of los) {
    const l = uit[uit.length - 1];
    if (l && Math.abs(v.y - l.y) <= 3 && Math.abs(v.h - l.h) <= 4 && v.x <= l.x + l.w + 8) {
      const rechts = Math.max(l.x + l.w, v.x + v.w);
      l.x = Math.min(l.x, v.x);
      l.w = rechts - l.x;
    } else uit.push({ ...v });
  }
  return uit;
}

// Woorden markeren zonder de DOM te wijzigen: CSS Custom Highlight API. Eén register per
// naam voor de hele pagina; elk blok voegt zijn eigen bereiken toe en haalt ze weer weg.
type HlNaam = "opm-merk" | "opm-merk-actief" | "opm-merk-flits";
const HL_RANG: Record<HlNaam, number> = { "opm-merk": 0, "opm-merk-actief": 1, "opm-merk-flits": 2 };

function highlight(naam: HlNaam): Highlight | null {
  if (typeof CSS === "undefined" || typeof Highlight === "undefined" || !CSS.highlights) return null;
  let h = CSS.highlights.get(naam) ?? null;
  if (!h) {
    h = new Highlight();
    h.priority = HL_RANG[naam];
    CSS.highlights.set(naam, h);
  }
  return h;
}

type Status = "ok" | "verborgen" | "weg";
type Sterk = "" | "actief" | "flits";
interface MerkBeeld { id: string; soort: "eenheid" | "tekst"; sterk: Sterk; vakken: Vak[] }
/** Wat het blok van zijn passages laat zien; `sleutel` om te zien of er iets is veranderd. */
interface Beeld {
  sleutel: string;
  /** kaders in de laag over het blok: eenheden, en woorden als de Highlight API ontbreekt */
  merken: MerkBeeld[];
  /** per opmerking met een passage: staat hij er, is hij ingeklapt, of is de tekst gewijzigd */
  status: Record<string, Status>;
  /** hoogte van de passage in het blok (px vanaf de bovenkant), om de ballon ernaast te zetten */
  y: Record<string, number>;
  /** de eenheid waar "Ruimer" in het formulier naartoe gaat ("de hele rij"), of leeg */
  ruimer: string;
}
const LEEG_BEELD: Beeld = { sleutel: "", merken: [], status: {}, y: {}, ruimer: "" };

interface Doel { id: string; citaat: string; nr: number; /** afgehandeld: alleen tonen als hij wordt uitgelicht */ stil: boolean }
interface Gevonden { a: number; b: number; range: Range; eenheid: HTMLElement | null }
interface Motor {
  doelen: Doel[];
  bezig: boolean;
  kaart: Kaart | null;
  gevonden: Map<string, Gevonden>;
  ranges: Map<Range, HlNaam>;
  actief: string | null;
  flits: string | null;
  y: Record<string, number>;
}
function nieuweMotor(): Motor {
  return { doelen: [], bezig: false, kaart: null, gevonden: new Map(), ranges: new Map(), actief: null, flits: null, y: {} };
}

interface Wijs { vak: Vak; naam: string; tekst: string; plaats: string }
interface Selectie extends Plek { x: number; y: number }
interface Schik { sleutel: string; marge: Record<string, number>; volg: Record<string, number> }
const GEEN_SCHIK: Schik = { sleutel: "", marge: {}, volg: {} };

/** De selectie in de inhoud van dit blok als passage, met de plek voor de knop ernaast; null = geen. */
function leesSelectie(wrap: HTMLElement): Selectie | null {
  const s = document.getSelection();
  if (!s || s.isCollapsed || s.rangeCount === 0) return null;
  const r = s.getRangeAt(0);
  if (!wrap.contains(r.commonAncestorContainer)) return null;
  const elVan = (n: Node) => (n instanceof Element ? n : n.parentElement);
  const begin = elVan(r.startContainer);
  const eind = elVan(r.endContainer);
  if (!begin || !eind || begin.closest(EIGEN) || eind.closest(EIGEN)) return null;
  const kaart = bouwKaart(wrap);
  const [a, b] = bereikVan(kaart, r);
  if (b <= a) return null;
  const laatste = kaart.stukken[stukIndex(kaart, b - 1)];
  const tot = plaatsIn(laatste.knoop.data, b - 1 - laatste.van) + 1;
  const eindje = document.createRange();
  eindje.setStart(laatste.knoop, tot - 1);
  eindje.setEnd(laatste.knoop, tot);
  const vakken = eindje.getClientRects();
  const vak = vakken[vakken.length - 1];
  if (!vak || !laatste.knoop.parentElement || !zichtbaar(laatste.knoop.parentElement)) return null;
  const wr = wrap.getBoundingClientRect();
  const marge = Math.min(70, wr.width / 2);
  return {
    ...plekVan(kaart, a, b),
    x: Math.round(Math.min(Math.max(vak.right - wr.left, marge), wr.width - marge)),
    y: Math.round(vak.bottom - wr.top),
  };
}

/** Wat om de passage heen dicht staat, openen: ingeklapte delen en tabbladen. True = er is iets geopend. */
function openOmheen(g: Gevonden, wrap: HTMLElement): boolean {
  let iets = false;
  for (let n = g.range.startContainer.parentElement; n && n !== wrap; n = n.parentElement) {
    if (n instanceof HTMLDetailsElement) {
      if (n.open) continue;
      const kop = n.querySelector<HTMLElement>(":scope > summary");
      if (kop) kop.click();
      if (!n.open) n.open = true;
      iets = true;
    } else if (n.id && (n.hasAttribute("hidden") || getComputedStyle(n).display === "none")) {
      const knop = wrap.querySelector<HTMLElement>('[aria-controls~="' + CSS.escape(n.id) + '"]');
      if (knop && (knop.getAttribute("aria-selected") === "false" || knop.getAttribute("aria-expanded") === "false")) {
        knop.click();
        iets = true;
      }
    }
  }
  return iets;
}

/**
 * Het eerste stukje van de passage in beeld brengen: opzij in een schuivende tabel, en omhoog
 * of omlaag in de pagina. True = de pagina schuift (het oplichten wacht daar even op).
 */
function schuifNaar(g: Gevonden): boolean {
  const anker = g.eenheid ?? g.range.startContainer.parentElement;
  if (!anker) return false;
  const eerste = (): DOMRect | null => {
    if (g.eenheid) return g.eenheid.getBoundingClientRect();
    for (const q of g.range.getClientRects()) if (q.width > 0.5 && q.height > 0.5) return q;
    return null;
  };
  let r = eerste();
  if (!r) return false;
  for (let n = anker.parentElement; n && n !== document.body; n = n.parentElement) {
    if (n.scrollWidth <= n.clientWidth + 1 || !/^(auto|scroll)$/.test(getComputedStyle(n).overflowX)) continue;
    const nr = n.getBoundingClientRect();
    if (r.left < nr.left + 8 || r.left > nr.right - 48) {
      n.scrollLeft += r.left - nr.left - 24;
      r = eerste() ?? r;
    }
  }
  const hoog = window.innerHeight;
  if (r.top >= 90 && r.top <= hoog - 200 && (r.bottom <= hoog - 70 || r.height >= hoog - 200)) return false;
  window.scrollBy({ top: r.top - Math.round(hoog * 0.3), behavior: rustigeBeweging() ? "auto" : "smooth" });
  return true;
}

/** Het blok dat nu in "kies de plek" staat, om te stoppen als een ander blok begint. */
let stopLopendeKeuze: (() => void) | null = null;

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
      // Id en datum vóór de update bepalen: de update zelf kan vaker worden uitgevoerd
      // (React Strict Mode), en dan moet wat in beeld staat hetzelfde zijn als wat is bewaard.
      toevoegen: (o) => {
        const nieuw: Opmerking = { ...o, id: nieuwId(), datum: new Date().toISOString(), afgehandeld: false, antwoorden: [] };
        updateSession((prev) => ({ opmerkingen: [...(prev.opmerkingen ?? []), nieuw] }));
      },
      antwoorden: (id, tekst, door) => {
        const antwoord = { id: nieuwId(), tekst, door, datum: new Date().toISOString() };
        wijzig((o) => (o.id === id ? { ...o, antwoorden: [...(o.antwoorden ?? []), antwoord] } : o));
      },
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

function Richtpunt() {
  return (
    <svg viewBox="0 0 16 16" aria-hidden="true" focusable="false">
      <circle cx="8" cy="8" r="4.2" fill="none" stroke="currentColor" strokeWidth="1.4" />
      <path d="M8 1.5v3M8 11.5v3M1.5 8h3M11.5 8h3" fill="none" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" />
    </svg>
  );
}

/**
 * Formulier voor een nieuwe opmerking of een antwoord: tekst, naam (onthouden),
 * Plaatsen/Annuleren. `boven` staat boven het tekstvak (bij een nieuwe opmerking: de plek).
 * Verandert `focusTeken`, dan gaat de cursor terug naar het tekstvak en komt het formulier
 * in beeld (na het kiezen van een plek).
 */
function Formulier(p: {
  label: string;
  ph: string;
  onPlaats: (tekst: string, door: string) => void;
  onSluit: () => void;
  boven?: ReactNode;
  focusTeken?: number;
  stijl?: CSSProperties;
  sleutel?: string;
  plekId?: string;
}) {
  const [tekst, setTekst] = useState("");
  const [door, setDoor] = useState(leesNaam);
  const vorm = useRef<HTMLFormElement>(null);
  const veld = useRef<HTMLTextAreaElement>(null);
  // Cursor in het tekstvak. Staat het formulier buiten beeld (smal scherm: onder een hoog
  // blok), dan rustig erheen schuiven in plaats van de sprong die de browser bij focus maakt.
  // Twee beeldjes wachten: op een breed scherm schuift het formulier eerst naast de passage.
  useEffect(() => {
    veld.current?.focus({ preventScroll: true });
    let beeldjes = 0;
    let raf = requestAnimationFrame(function kijk() {
      if (beeldjes++ < 2) {
        raf = requestAnimationFrame(kijk);
        return;
      }
      const el = vorm.current;
      if (!el) return;
      const r = el.getBoundingClientRect();
      if (r.top >= 8 && r.bottom <= window.innerHeight - 8) return;
      el.scrollIntoView({ block: "center", behavior: rustigeBeweging() ? "auto" : "smooth" });
    });
    return () => cancelAnimationFrame(raf);
  }, [p.focusTeken]);
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
      style={p.stijl}
      data-sleutel={p.sleutel}
      data-plek={p.plekId}
      onSubmit={(e) => { e.preventDefault(); plaats(); }}
      onKeyDown={(e) => {
        if (e.key === "Escape") { e.preventDefault(); p.onSluit(); }
        else if (e.key === "Enter" && (e.ctrlKey || e.metaKey)) { e.preventDefault(); plaats(); }
      }}
    >
      {p.boven}
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

/**
 * Het citaat in een ballon: hooguit twee regels, de rest met "Hele passage tonen". Een klik
 * op het citaat gaat naar de passage in de tekst. Staat de passage er niet meer: alleen het
 * citaat, met de melding dat de tekst is gewijzigd.
 */
function Citaat(p: { tekst: string; status?: Status; onGa?: () => void }) {
  const [heel, setHeel] = useState(false);
  const [lang, setLang] = useState(false);
  const el = useRef<HTMLSpanElement>(null);
  useEffect(() => {
    const e = el.current;
    if (!e || heel) return;
    const meet = () => setLang(e.scrollHeight > e.clientHeight + 1);
    meet();
    const ro = new ResizeObserver(meet);
    ro.observe(e);
    return () => ro.disconnect();
  }, [heel, p.tekst]);
  const weg = p.status === "weg";
  const tekst = (
    <span ref={el} className={"opm-citaat-t" + (heel ? " is-heel" : "")}>
      “{p.tekst}”
    </span>
  );
  return (
    <div className={"opm-citaat" + (weg ? " is-weg" : "")}>
      {weg || !p.onGa ? (
        tekst
      ) : (
        <button
          type="button"
          className="opm-citaat-ga"
          title={p.status === "verborgen" ? "Open het ingeklapte deel en ga naar deze passage" : "Ga naar deze passage in de tekst"}
          onClick={p.onGa}
        >
          {tekst}
        </button>
      )}
      {(lang || heel) && (
        <button type="button" className="opm-citaat-meer" aria-expanded={heel} onClick={() => setHeel((v) => !v)}>
          {heel ? "Minder tonen" : "Hele passage tonen"}
        </button>
      )}
      {weg && <span className="opm-citaat-noot">De tekst is sindsdien gewijzigd.</span>}
      {p.status === "verborgen" && <span className="opm-citaat-noot is-stil">Staat in een ingeklapt deel; klik op het citaat om het te openen.</span>}
    </div>
  );
}

function Ballon(p: {
  o: Opmerking;
  api: OpmerkingenApi;
  /** staat de passage er nog (alleen bij een opmerking met een citaat) */
  status?: Status;
  stijl?: CSSProperties;
  actief?: boolean;
  flits?: boolean;
  /** de passage in het blok uitlichten zolang de ballon wordt aangewezen of de focus heeft */
  onUitlicht?: (aan: boolean) => void;
  /** naar de passage in de tekst */
  onGa?: () => void;
}) {
  const { o, api } = p;
  const [antwoord, setAntwoord] = useState(false);
  const [vraag, setVraag] = useState(false);
  const el = useRef<HTMLElement>(null);
  const af = !!o.afgehandeld;
  // De passage uitlichten zolang de ballon wordt aangewezen of de toetsenbordfocus heeft
  // (een muisklik op een knop of vinkje telt niet: anders blijft de passage hangen).
  const licht = o.citaat ? p.onUitlicht : undefined;
  const erbij = () => !!el.current && (el.current.matches(":hover") || el.current.querySelector(":focus-visible") !== null);
  const bijwerken = licht && (() => licht(erbij()));
  // ook als het antwoordformulier of de verwijdervraag sluit (de focus verdwijnt dan zonder melding)
  useEffect(() => {
    if (licht && !erbij()) licht(false);
  }, [antwoord, vraag]); // eslint-disable-line react-hooks/exhaustive-deps
  return (
    <article
      ref={el}
      id={"opm-" + o.id}
      className={"opm-ballon" + (af ? " opm-af" : "") + (p.actief ? " is-actief" : "") + (p.flits ? " is-flits" : "")}
      style={p.stijl}
      data-sleutel={o.id}
      data-plek={o.citaat ? o.id : undefined}
      onMouseEnter={licht && (() => licht(true))}
      onMouseLeave={licht && (() => licht(el.current?.querySelector(":focus-visible") != null))}
      onFocus={bijwerken}
      onBlur={licht && ((e) => { if (!e.currentTarget.contains(e.relatedTarget) && !e.currentTarget.matches(":hover")) licht(false); })}
    >
      <div className="opm-kop">
        <b className="opm-naam">{o.door || "Zonder naam"}</b>
        <time className="opm-datum" dateTime={o.datum}>{toonDatum(o.datum)}</time>
        <button type="button" className="opm-x" title="Opmerking verwijderen" aria-label="Opmerking verwijderen" onClick={() => setVraag(true)}>×</button>
      </div>
      {o.citaat && <Citaat tekst={o.citaat} status={p.status} onGa={p.onGa} />}
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
 * De balk onder in beeld zolang je een plek kiest: wat je moet doen, wat het toetsenbord nu
 * aanwijst, en "Annuleren". Staat buiten het document (portal), zodat hij altijd te zien is.
 */
function Kiesbalk(p: { wijs: Wijs | null; mis: number; onStop: () => void }) {
  const el = useRef<HTMLDivElement>(null);
  useEffect(() => { el.current?.focus({ preventScroll: true }); }, []);
  const nu = p.wijs && p.wijs.tekst ? `${p.wijs.naam}${p.wijs.plaats ? " " + p.wijs.plaats : ""}: “${p.wijs.tekst}”` : "";
  return (
    <div ref={el} className="opm-kiesbalk" role="region" aria-label="Plek kiezen voor de opmerking" tabIndex={-1}>
      <div className="opm-kiesbalk-t">
        <b>Kies de plek</b>
        <span>Wijs de alinea, regel, rij of kaart aan waar je opmerking over gaat.</span>
        <span className="opm-kiesbalk-toets">Toetsenbord: pijltjes omlaag en omhoog wijzen aan, links is ruimer, rechts preciezer; Enter kiest, Esc stopt.</span>
        <span className="opm-kiesbalk-nu" aria-live="polite">{nu}</span>
        {p.mis > 0 && !nu && <span key={p.mis} className="opm-kiesbalk-mis" role="status">Daar staat geen tekst. Wijs een stuk tekst in het onderdeel aan.</span>}
      </div>
      <button type="button" onClick={p.onStop}>Annuleren</button>
    </div>
  );
}

/**
 * Om elk blok in weergave: de knop "Opmerking" (altijd zichtbaar; in de kantlijn of in een
 * strook boven de rechterbovenhoek, zie OPMERKINGEN_CSS), het formulier en de ballonnen
 * van dit blok. De knop staat vóór de inhoud, zodat de tabvolgorde de leesvolgorde volgt.
 * Zonder OpmerkingenProvider alleen de inhoud.
 *
 * Een opmerking kan op één passage wijzen. Plaatsen: tekst selecteren (knop "Opmerking" bij
 * de selectie, of de knop van het blok), of in het formulier "Kies de plek" en een alinea,
 * regel, rij, cel of kaart aanwijzen (muis, tik of pijltjestoetsen). Lezen: de passage is
 * in het blok gemarkeerd zolang de opmerking openstaat; de ballon toont het citaat en staat
 * op een breed scherm op de hoogte van de passage.
 */
export function BlokMetOpmerkingen(p: { sectie: string; blok: number; naam: string; children: ReactNode }) {
  const api = useContext(OpmerkingenContext);
  const [open, setOpen] = useState(false);
  const [kolomHoogte, setKolomHoogte] = useState(0);
  /** de passage van de opmerking in het formulier; null = het hele onderdeel */
  const [plek, setPlek] = useState<Plek | null>(null);
  const [kies, setKies] = useState(false);
  const [kanKiezen, setKanKiezen] = useState(false);
  const [wijs, setWijs] = useState<Wijs | null>(null);
  const [selectie, setSelectie] = useState<Selectie | null>(null);
  const [bijBallon, setBijBallon] = useState<string | null>(null);
  const [bijMerk, setBijMerk] = useState<string | null>(null);
  const [flits, setFlits] = useState<{ id: string; aan: boolean } | null>(null);
  const [ballonFlits, setBallonFlits] = useState<string | null>(null);
  const [beeld, setBeeld] = useState<Beeld>(LEEG_BEELD);
  const [schik, setSchik] = useState<Schik>(GEEN_SCHIK);
  const [focusTeken, setFocusTeken] = useState(0);
  /** kiesmodus: zo vaak is er geklikt op een plek waar niets te kiezen valt */
  const [mis, setMis] = useState(0);
  const wrap = useRef<HTMLDivElement>(null);
  const kolom = useRef<HTMLDivElement>(null);
  const knop = useRef<HTMLButtonElement>(null);
  const motor = useRef<Motor | null>(null);
  const bijKnop = useRef<{ selectie: Selectie | null; toen: number }>({ selectie: null, toen: 0 });
  const tijden = useRef<{ flits: number[]; ballon: number }>({ flits: [], ballon: 0 });
  const netGeplaatst = useRef(false);

  const eigen = api ? api.lijst.filter((o) => o.sectie === p.sectie && o.blok === p.blok) : GEEN;
  const toon = open || eigen.length > 0;
  const uitgelicht = bijMerk ?? bijBallon;

  // Welke passages het blok moet terugvinden: die van de opmerkingen, en die in het formulier.
  const doelen: Doel[] = [];
  for (const o of eigen) if (o.citaat) doelen.push({ id: o.id, citaat: o.citaat, nr: o.citaatNr ?? 0, stil: !!o.afgehandeld });
  if (open && plek) doelen.push({ id: CONCEPT, citaat: plek.citaat, nr: plek.nr, stil: false });
  const doelSleutel = doelen.length ? JSON.stringify(doelen) : "";
  const aan = doelen.length > 0;

  // Breed scherm: ballonnen en formulier op de hoogte van hun passage (zoals in Word), zonder
  // over elkaar te vallen: een marge erboven, en `order` voor het formulier, dat in de DOM
  // vooraan blijft staan. Smal: gewoon onder elkaar.
  const schikken = useCallback(() => {
    const k = kolom.current;
    const m = motor.current;
    if (!k || !m) return;
    let nieuw = GEEN_SCHIK;
    if (getComputedStyle(k).position === "absolute") {
      const basis = k.offsetTop;
      const items = ([...k.children] as HTMLElement[]).map((el, i) => {
        const y = el.dataset.plek ? m.y[el.dataset.plek] : undefined;
        return { sleutel: el.dataset.sleutel ?? "", h: el.offsetHeight, wens: y === undefined ? 0 : Math.max(0, y - basis - 6), i };
      });
      items.sort((x, y) => x.wens - y.wens || x.i - y.i);
      const marge: Record<string, number> = {};
      const volg: Record<string, number> = {};
      let pos = 0;
      items.forEach((it, n) => {
        const top = Math.max(pos, it.wens);
        marge[it.sleutel] = Math.round(top - pos);
        volg[it.sleutel] = n;
        pos = top + it.h + 8;
      });
      nieuw = { sleutel: JSON.stringify([marge, volg]), marge, volg };
    }
    setSchik((oud) => (oud.sleutel === nieuw.sleutel ? oud : nieuw));
  }, []);

  // De passages terugzoeken in de tekst van het blok (`metZoeken`: na een wijziging in het
  // blok) en op het scherm zetten: woorden via de Highlight API, eenheden (en woorden zonder
  // die API) als kaders in de laag over het blok. Zonder zoeken wordt alleen opnieuw gemeten.
  const werkBij = useCallback((metZoeken: boolean) => {
    const el = wrap.current;
    const m = motor.current;
    if (!el || !m) return;
    // heeft het blok zijn tekst opnieuw getekend sinds de vorige keer, dan toch zoeken
    let zoeken = metZoeken || !m.kaart;
    if (!zoeken) for (const g of m.gevonden.values()) if (!g.range.startContainer.isConnected || g.eenheid?.isConnected === false) zoeken = true;
    if (zoeken) {
      const nieuw = bouwKaart(el);
      m.kaart = nieuw;
      m.gevonden = new Map();
      for (const d of m.doelen) {
        const v = vind(nieuw, d.citaat, d.nr);
        if (v) m.gevonden.set(d.id, { a: v.a, b: v.b, range: maakRange(nieuw, v.a, v.b), eenheid: eenheidVoor(nieuw, el, v.a, v.b) });
      }
    }
    const kaart = m.kaart;
    const wr = el.getBoundingClientRect();
    const knip: Knipvakken = new Map();
    const kanHighlight = highlight("opm-merk") !== null;
    const merken: MerkBeeld[] = [];
    const status: Record<string, Status> = {};
    const y: Record<string, number> = {};
    const ranges = new Map<Range, HlNaam>();
    let ruimer = "";
    for (const d of m.doelen) {
      const g = m.gevonden.get(d.id);
      if (!g || !kaart) {
        status[d.id] = "weg";
        continue;
      }
      const anker = g.eenheid ?? g.range.startContainer.parentElement;
      if (!anker || !zichtbaar(anker)) {
        // ingeklapt of verborgen: de ballon komt naast het dichtstbijzijnde deel dat wel te zien is
        status[d.id] = "verborgen";
        for (let n = anker?.parentElement; n && n !== el; n = n.parentElement) {
          if (!zichtbaar(n)) continue;
          const r = n.getBoundingClientRect();
          if (r.width > 0 || r.height > 0) {
            y[d.id] = Math.round(r.top - wr.top);
            break;
          }
        }
        continue;
      }
      status[d.id] = "ok";
      const vakken = g.eenheid ? [eenheidVak(g.eenheid, el, wr, knip)].filter((v): v is Vak => v !== null) : tekstVakken(kaart, g.a, g.b, el, wr, knip);
      if (vakken.length === 0) {
        // wel in het blok, maar buiten het venster van een tabel die opzij schuift: geen markering
        y[d.id] = Math.round(anker.getBoundingClientRect().top - wr.top);
        continue;
      }
      y[d.id] = vakken[0].y;
      const sterk: Sterk = m.flits === d.id ? "flits" : m.actief === d.id || d.id === CONCEPT ? "actief" : "";
      if (d.stil && !sterk) continue;
      if (g.eenheid || !kanHighlight) merken.push({ id: d.id, soort: g.eenheid ? "eenheid" : "tekst", sterk, vakken });
      else ranges.set(g.range, sterk === "flits" ? "opm-merk-flits" : sterk === "actief" ? "opm-merk-actief" : "opm-merk");
      if (d.id === CONCEPT) {
        const basis = (g.eenheid && kaart.bereik.get(g.eenheid)) || [g.a, g.b];
        const w = ruimereEenheid(kaart, el, basis[0], basis[1]);
        if (w) {
          const s = soortVan(w);
          ruimer = `${s.lid} hele ${s.naam}`;
        }
      }
    }
    for (const [r, naam] of m.ranges) if (ranges.get(r) !== naam) highlight(naam)?.delete(r);
    for (const [r, naam] of ranges) if (m.ranges.get(r) !== naam) highlight(naam)?.add(r);
    m.ranges = ranges;
    m.y = y;
    const sleutel = JSON.stringify([merken, status, y, ruimer]);
    setBeeld((oud) => (oud.sleutel === sleutel ? oud : { sleutel, merken, status, y, ruimer }));
    schikken();
  }, [schikken]);
  const zoek = useCallback(() => werkBij(true), [werkBij]);
  const plaats = useCallback(() => werkBij(false), [werkBij]);

  useLayoutEffect(() => {
    const m = (motor.current ??= nieuweMotor());
    m.doelen = doelSleutel ? (JSON.parse(doelSleutel) as Doel[]) : [];
    if (!m.doelen.length && !m.bezig) return;
    m.bezig = m.doelen.length > 0;
    zoek();
  }, [doelSleutel, zoek]);

  useLayoutEffect(() => {
    const m = (motor.current ??= nieuweMotor());
    m.actief = uitgelicht;
    m.flits = flits?.aan ? flits.id : null;
    if (m.bezig) plaats();
  }, [uitgelicht, flits, plaats]);

  // Bij het weggaan van het blok: de markeringen uit het register van de pagina halen.
  useEffect(() => {
    const t = tijden.current;
    return () => {
      const m = motor.current;
      if (m) {
        for (const [r, naam] of m.ranges) highlight(naam)?.delete(r);
        m.ranges = new Map();
      }
      t.flits.forEach((x) => window.clearTimeout(x));
      window.clearTimeout(t.ballon);
    };
  }, []);

  /** De ballon van een opmerking laten opvallen (en zo nodig in beeld brengen). */
  const toonBallon = useCallback((id: string, schuif: boolean) => {
    const b = wrap.current?.querySelector<HTMLElement>('[data-sleutel="' + CSS.escape(id) + '"]');
    if (b && schuif) {
      const r = b.getBoundingClientRect();
      if (r.top < 8 || r.bottom > window.innerHeight - 48) b.scrollIntoView({ block: "center", behavior: rustigeBeweging() ? "auto" : "smooth" });
    }
    setBallonFlits(id);
    window.clearTimeout(tijden.current.ballon);
    tijden.current.ballon = window.setTimeout(() => setBallonFlits(null), 1800);
  }, []);

  // Zolang er passages zijn: het blok volgen (opnieuw getekend, formaat, in- en uitklappen,
  // schuiven in een tabel) en de markeringen bijwerken. Wijzen op een gemarkeerde passage
  // licht de ballon uit; een klik erop brengt de ballon naar voren.
  useEffect(() => {
    const el = wrap.current;
    if (!aan || !el) return;
    let raf = 0;
    let zwaar = false;
    const plan = (metZoeken: boolean) => {
      zwaar ||= metZoeken;
      if (raf) return;
      raf = requestAnimationFrame(() => {
        raf = 0;
        const z = zwaar;
        zwaar = false;
        if (z) zoek();
        else plaats();
      });
    };
    const licht = () => plan(false);
    const vreemd = (r: MutationRecord) => {
      if (r.target === el) return r.type === "childList" && [...r.addedNodes, ...r.removedNodes].some((n) => !(n instanceof Element && n.matches(EIGEN)));
      const t = r.target instanceof Element ? r.target : r.target.parentElement;
      return !t?.closest(EIGEN);
    };
    const mo = new MutationObserver((lijst) => { if (lijst.some(vreemd)) plan(true); });
    mo.observe(el, { subtree: true, childList: true, characterData: true, attributes: true, attributeFilter: ["open", "hidden", "class", "style", "aria-expanded", "aria-hidden", "aria-selected"] });
    const ro = new ResizeObserver(licht);
    ro.observe(el);
    const soorten = ["toggle", "scroll", "transitionend", "animationend", "load"] as const;
    for (const s of soorten) el.addEventListener(s, licht, true);
    window.addEventListener("resize", licht);
    void document.fonts?.ready.then(licht);

    const raak = (x: number, y: number): string | null => {
      const m = motor.current;
      if (!m) return null;
      const binnen = (r: DOMRect) => x >= r.left && x <= r.right && y >= r.top && y <= r.bottom;
      let beste: string | null = null;
      let kleinste = Infinity;
      for (const d of m.doelen) {
        const g = m.gevonden.get(d.id);
        if (!g || d.stil || d.id === CONCEPT) continue;
        const vakken = g.eenheid ? (zichtbaar(g.eenheid) ? [g.eenheid.getBoundingClientRect()] : []) : zichtbaar(g.range.startContainer.parentElement ?? el) ? [...g.range.getClientRects()] : [];
        for (const r of vakken) {
          if (!binnen(r) || r.width * r.height >= kleinste) continue;
          kleinste = r.width * r.height;
          beste = d.id;
        }
      }
      return beste;
    };
    const inInhoud = (t: EventTarget | null) => t instanceof Element && el.contains(t) && !t.closest(EIGEN);
    let wijsRaf = 0;
    const beweeg = (e: PointerEvent) => {
      if (e.pointerType === "touch") return;
      const { clientX, clientY, target } = e;
      cancelAnimationFrame(wijsRaf);
      wijsRaf = requestAnimationFrame(() => setBijMerk(inInhoud(target) ? raak(clientX, clientY) : null));
    };
    const weg = () => {
      cancelAnimationFrame(wijsRaf);
      setBijMerk(null);
    };
    const klik = (e: MouseEvent) => {
      if (!inInhoud(e.target) || (e.target as Element).closest("a,button,select,input,textarea,label,summary")) return;
      const s = document.getSelection();
      if (s && !s.isCollapsed) return;
      const id = raak(e.clientX, e.clientY);
      if (id) toonBallon(id, true);
    };
    el.addEventListener("pointermove", beweeg);
    el.addEventListener("pointerleave", weg);
    el.addEventListener("click", klik);
    return () => {
      cancelAnimationFrame(raf);
      cancelAnimationFrame(wijsRaf);
      mo.disconnect();
      ro.disconnect();
      for (const s of soorten) el.removeEventListener(s, licht, true);
      window.removeEventListener("resize", licht);
      el.removeEventListener("pointermove", beweeg);
      el.removeEventListener("pointerleave", weg);
      el.removeEventListener("click", klik);
      setBijMerk(null);
    };
  }, [aan, zoek, plaats, toonBallon]);

  // Tekst geselecteerd in dit blok: de knop "Opmerking" bij de selectie.
  const heeftApi = api !== null;
  useEffect(() => {
    const el = wrap.current;
    if (!heeftApi || !el) return;
    let t = 0;
    let muisNeer = false;
    let had = false;
    const lees = () => {
      const s = leesSelectie(el);
      had = s !== null;
      setSelectie(s);
    };
    const bij = () => {
      window.clearTimeout(t);
      const s = document.getSelection();
      const hier = !!s && !s.isCollapsed && !!s.anchorNode && el.contains(s.anchorNode);
      if (!hier) {
        if (had) {
          had = false;
          setSelectie(null);
        }
        return;
      }
      // tijdens het slepen met de muis nog niet: pas als de knop los is
      if (!muisNeer) t = window.setTimeout(lees, 160);
    };
    const neer = (e: PointerEvent) => { if (e.pointerType === "mouse") muisNeer = true; };
    const op = () => {
      if (!muisNeer) return;
      muisNeer = false;
      bij();
    };
    document.addEventListener("selectionchange", bij);
    el.addEventListener("pointerdown", neer);
    window.addEventListener("pointerup", op);
    return () => {
      window.clearTimeout(t);
      document.removeEventListener("selectionchange", bij);
      el.removeEventListener("pointerdown", neer);
      window.removeEventListener("pointerup", op);
    };
  }, [heeftApi]);

  // Formulier open: valt er in dit blok iets kleiners aan te wijzen dan het hele onderdeel?
  useLayoutEffect(() => {
    const el = wrap.current;
    if (!open || !el) return;
    setKanKiezen(alleEenheden(bouwKaart(el), el, 1).length > 0);
  }, [open]);

  // "Kies de plek": de eenheid onder de aanwijzer krijgt een kader, een klik of tik kiest
  // hem; met het toetsenbord de pijltjes en Enter. Zolang dit aanstaat doen de knoppen,
  // links, keuzelijsten en vinkjes van het blok zelf niets: de gebeurtenissen worden hier
  // afgevangen voordat ze het blok bereiken.
  useEffect(() => {
    const el = wrap.current;
    if (!kies || !el) return;
    let kaart = bouwKaart(el);
    let lijst: HTMLElement[] | null = null;
    let huidig: HTMLElement | null = null;
    let viaToets = false;
    let punt: { x: number; y: number } | null = null;
    let raf = 0;
    const stop = () => setKies(false);
    stopLopendeKeuze?.();
    stopLopendeKeuze = stop;

    const teken = () => {
      const k = huidig;
      const r = k && k.isConnected ? kaart.bereik.get(k) : undefined;
      const vak = k && r ? eenheidVak(k, el, el.getBoundingClientRect(), new Map()) : null;
      if (!k || !r || !vak) {
        setWijs(null);
        return;
      }
      const i = viaToets && lijst ? lijst.indexOf(k) : -1;
      const naam = soortVan(k).naam;
      setWijs({
        vak,
        naam: naam.charAt(0).toUpperCase() + naam.slice(1),
        tekst: viaToets ? leesbaar(kaart, r[0], Math.min(r[1], r[0] + 90)) : "",
        plaats: i >= 0 && lijst ? `${i + 1} van ${lijst.length}` : "",
      });
    };
    const wijsAan = (k: HTMLElement | null, toets: boolean) => {
      huidig = k;
      viaToets = toets;
      teken();
    };
    const kiesDeze = (k: HTMLElement) => {
      const r = kaart.bereik.get(k);
      if (!r) return;
      setPlek(plekVan(kaart, r[0], r[1]));
      setKies(false);
    };
    const eigenDeel = (t: EventTarget | null) => t instanceof Element && !!t.closest(EIGEN);

    const beweeg = (e: PointerEvent) => {
      if (e.pointerType === "touch") return;
      punt = { x: e.clientX, y: e.clientY };
      const opEigen = eigenDeel(e.target);
      cancelAnimationFrame(raf);
      raf = requestAnimationFrame(() => wijsAan(opEigen || !punt ? null : eenheidOp(kaart, el, punt.x, punt.y), false));
    };
    const weg = () => {
      punt = null;
      cancelAnimationFrame(raf);
      if (!viaToets) wijsAan(null, false);
    };
    const klik = (e: MouseEvent) => {
      if (eigenDeel(e.target)) return;
      e.preventDefault();
      e.stopPropagation();
      // een "klik" van het toetsenbord op een knop van het blok: tegenhouden, niets kiezen
      if (e.detail === 0 && e.clientX === 0 && e.clientY === 0) return;
      const k = eenheidOp(kaart, el, e.clientX, e.clientY) ?? (e.target instanceof Element ? eenheidVan(kaart, el, e.target) : null);
      if (k) kiesDeze(k);
      else setMis((n) => n + 1);
    };
    const slik = (e: Event) => {
      if (eigenDeel(e.target)) return;
      e.stopPropagation();
      if (e.type === "mousedown" || e.type === "dblclick" || e.type === "auxclick") e.preventDefault();
    };
    const inBeeld = (k: HTMLElement) => {
      k.scrollIntoView({ block: "nearest", inline: "nearest" });
      const r = k.getBoundingClientRect();
      const onder = window.innerHeight - 150;
      if (r.bottom > onder && r.top > 120) window.scrollBy({ top: Math.min(r.bottom - onder, r.top - 120) });
    };
    const toets = (e: KeyboardEvent) => {
      const t = e.target instanceof Element ? e.target : null;
      if (e.key === "Escape") {
        e.preventDefault();
        e.stopPropagation();
        stop();
        return;
      }
      const eigenVeld = !!t && !!t.closest(".opm-ballonnen") && !!t.closest("input,textarea,select");
      const pijl = ["ArrowDown", "ArrowUp", "ArrowLeft", "ArrowRight", "Home", "End"].includes(e.key);
      if (pijl && !eigenVeld && !e.altKey && !e.ctrlKey && !e.metaKey) {
        e.preventDefault();
        e.stopPropagation();
        lijst ??= alleEenheden(kaart, el);
        if (!lijst.length) return;
        const i = huidig ? lijst.indexOf(huidig) : -1;
        let k: HTMLElement | undefined;
        if (e.key === "Home") k = lijst[0];
        else if (e.key === "End") k = lijst[lijst.length - 1];
        else if (i < 0) {
          // beginnen bij de eerste eenheid die in beeld staat
          k = lijst.find((x) => { const r = x.getBoundingClientRect(); return r.top >= 60 && r.top < window.innerHeight - 150; }) ?? lijst[0];
        } else if (e.key === "ArrowDown") k = lijst[Math.min(i + 1, lijst.length - 1)];
        else if (e.key === "ArrowUp") k = lijst[Math.max(i - 1, 0)];
        else if (e.key === "ArrowLeft") {
          for (let n = lijst[i].parentElement; n && n !== el; n = n.parentElement) {
            if (lijst.includes(n as HTMLElement)) {
              k = n as HTMLElement;
              break;
            }
          }
        } else if (lijst[i + 1] && lijst[i].contains(lijst[i + 1])) k = lijst[i + 1];
        if (k) {
          inBeeld(k);
          wijsAan(k, true);
        }
        return;
      }
      if (e.key === "Enter" || e.key === " ") {
        // eigen knoppen (Annuleren, het formulier) doen gewoon hun werk
        if (t && t.closest(".opm-kiesbalk button,.opm-ballonnen,.opm-knop")) return;
        const inBlok = !!t && el.contains(t);
        if (inBlok || huidig) {
          e.preventDefault();
          e.stopPropagation();
        }
        if (huidig) kiesDeze(huidig);
      }
    };
    const herteken = () => {
      if (punt && !viaToets) huidig = eenheidOp(kaart, el, punt.x, punt.y);
      teken();
    };
    const eigenWijziging = (r: MutationRecord) => {
      if (r.target === el) return [...r.addedNodes, ...r.removedNodes].every((n) => n instanceof Element && n.matches(EIGEN));
      return !!(r.target instanceof Element ? r.target : r.target.parentElement)?.closest(EIGEN);
    };
    const mo = new MutationObserver((records) => {
      if (records.every(eigenWijziging)) return;
      kaart = bouwKaart(el);
      lijst = null;
      herteken();
    });
    mo.observe(el, { subtree: true, childList: true, characterData: true });
    const slikSoorten = ["pointerdown", "pointerup", "mousedown", "mouseup", "dblclick", "auxclick", "touchstart", "touchend"] as const;
    for (const s of slikSoorten) el.addEventListener(s, slik, { capture: true, passive: s.startsWith("touch") });
    el.addEventListener("click", klik, true);
    el.addEventListener("pointermove", beweeg);
    el.addEventListener("pointerleave", weg);
    el.addEventListener("scroll", herteken, true);
    window.addEventListener("scroll", herteken, { passive: true });
    window.addEventListener("resize", herteken);
    document.addEventListener("keydown", toets, true);
    return () => {
      cancelAnimationFrame(raf);
      mo.disconnect();
      for (const s of slikSoorten) el.removeEventListener(s, slik, true);
      el.removeEventListener("click", klik, true);
      el.removeEventListener("pointermove", beweeg);
      el.removeEventListener("pointerleave", weg);
      el.removeEventListener("scroll", herteken, true);
      window.removeEventListener("scroll", herteken);
      window.removeEventListener("resize", herteken);
      document.removeEventListener("keydown", toets, true);
      if (stopLopendeKeuze === stop) stopLopendeKeuze = null;
      setWijs(null);
      // terug naar het formulier, met de gekozen plek of zonder
      setFocusTeken((n) => n + 1);
    };
  }, [kies]);

  // Breed scherm: de ballonnen staan in de kantlijn (absoluut, onder de knop) en tellen niet
  // mee in de hoogte. Het blok wordt minstens zo hoog als de kolom reikt, zodat ze niet over
  // de knop en de ballonnen van het volgende blok vallen. Smal: de kolom staat in de tekst.
  useEffect(() => {
    const el = kolom.current;
    if (!el) return;
    const meet = () => {
      setKolomHoogte(getComputedStyle(el).position === "absolute" ? el.offsetTop + el.offsetHeight : 0);
      schikken();
    };
    const ro = new ResizeObserver(meet);
    ro.observe(el);
    window.addEventListener("resize", meet);
    return () => { ro.disconnect(); window.removeEventListener("resize", meet); };
  }, [toon, schikken]);
  useLayoutEffect(() => {
    if (toon) schikken();
  });

  // Net geplaatst: de nieuwe ballon even laten opvallen, zodat je ziet waar hij staat.
  const laatsteId = eigen.length ? eigen[eigen.length - 1].id : "";
  useEffect(() => {
    if (!netGeplaatst.current || !laatsteId) return;
    netGeplaatst.current = false;
    toonBallon(laatsteId, false);
  }, [laatsteId, toonBallon]);

  if (!api) return <>{p.children}</>;
  const openAantal = eigen.filter((o) => !o.afgehandeld).length;
  const cls =
    "opm-blok" + (eigen.length ? " heeft" : "") + (openAantal ? " opm-open" : "") + (kies ? " opm-kiest" : "") + (bijMerk && !kies ? " opm-wijst" : "");
  const telling = eigen.length === 0 ? "" : ` (${eigen.length} ${eigen.length === 1 ? "opmerking" : "opmerkingen"}, ${openAantal} open)`;

  const wisSelectie = () => {
    document.getSelection()?.removeAllRanges();
    setSelectie(null);
  };
  const dicht = () => {
    setOpen(false);
    setKies(false);
    setPlek(null);
  };
  // Annuleren of Esc: terug naar de knop, zodat toetsenbord en beeld weer bij het blok staan.
  const sluit = () => {
    dicht();
    knop.current?.focus();
  };
  /** Het formulier openen (of, als het al openstaat, de plek erin zetten) met de geselecteerde tekst. */
  const metSelectie = (s: Selectie) => {
    setPlek({ citaat: s.citaat, nr: s.nr });
    setKies(false);
    if (open) setFocusTeken((n) => n + 1);
    else setOpen(true);
    wisSelectie();
  };
  const klikKnop = () => {
    // de selectie van het moment van indrukken (de klik zelf kan hem al hebben weggehaald)
    const vers = performance.now() - bijKnop.current.toen < 1500 ? bijKnop.current.selectie : null;
    const s = vers ?? (wrap.current ? leesSelectie(wrap.current) : null);
    bijKnop.current = { selectie: null, toen: 0 };
    if (open) dicht();
    else if (s) metSelectie(s);
    else setOpen(true);
  };
  const startKiezen = () => {
    setKies(true);
    setMis(0);
    // Smal scherm: het formulier staat onder het blok. Het blok zelf in beeld brengen.
    const el = wrap.current;
    const k = kolom.current;
    if (!el || !k || getComputedStyle(k).position === "absolute") return;
    const onder = window.innerHeight - 110;
    const inhoudOnder = k.getBoundingClientRect().top;
    const teZien = Math.min(inhoudOnder, onder) - Math.max(el.getBoundingClientRect().top, 0);
    if (teZien < window.innerHeight * 0.45) window.scrollBy({ top: inhoudOnder - onder, behavior: rustigeBeweging() ? "auto" : "smooth" });
  };
  const ruimer = () => {
    const el = wrap.current;
    const m = motor.current;
    const g = m?.gevonden.get(CONCEPT);
    if (!el || !m?.kaart || !g) return;
    const basis = (g.eenheid && m.kaart.bereik.get(g.eenheid)) || [g.a, g.b];
    const w = ruimereEenheid(m.kaart, el, basis[0], basis[1]);
    const r = w && m.kaart.bereik.get(w);
    if (!r) return;
    setPlek(plekVan(m.kaart, r[0], r[1]));
    // verdwijnt de knop "Ruimer" (ruimer kan niet), dan de cursor terug in het tekstvak
    requestAnimationFrame(() => { if (!el.contains(document.activeElement)) setFocusTeken((n) => n + 1); });
  };
  const heleOnderdeel = () => {
    setPlek(null);
    setFocusTeken((n) => n + 1);
  };
  /**
   * De passage van een opmerking laten opvallen: drie keer oplichten (of, bij "minder
   * beweging", even vasthouden). `wacht`: eerst de pagina laten schuiven.
   */
  const flitsen = (id: string, wacht: number) => {
    tijden.current.flits.forEach((x) => window.clearTimeout(x));
    const stappen: [number, boolean | null][] = rustigeBeweging()
      ? [[0, true], [2000, null]]
      : [[0, true], [500, false], [680, true], [1180, false], [1360, true], [2300, null]];
    tijden.current.flits = stappen.map(([ms, aanUit]) => window.setTimeout(() => setFlits(aanUit === null ? null : { id, aan: aanUit }), wacht + ms));
  };
  /** Klik op het citaat: openen wat dicht staat, naar de passage schuiven en hem laten oplichten. */
  const naarPassage = (id: string) => {
    const el = wrap.current;
    const g = motor.current?.gevonden.get(id);
    if (!el || !g) return;
    const ga = () => {
      const nu = motor.current?.gevonden.get(id);
      if (nu) flitsen(id, schuifNaar(nu) && !rustigeBeweging() ? 350 : 0);
    };
    if (!openOmheen(g, el)) {
      ga();
      return;
    }
    // even wachten tot het geopende deel er staat
    let beeldjes = 0;
    const wacht = () => {
      zoek();
      const nu = motor.current?.gevonden.get(id);
      const anker = nu ? (nu.eenheid ?? nu.range.startContainer.parentElement) : null;
      if ((anker && zichtbaar(anker)) || ++beeldjes > 20) ga();
      else requestAnimationFrame(wacht);
    };
    requestAnimationFrame(wacht);
  };

  // Ballonnen in de volgorde van hun passage in het blok; opmerkingen over het hele onderdeel eerst.
  const rang = (o: Opmerking) => (o.citaat ? (beeld.y[o.id] ?? -1) : -1);
  const geordend = eigen.length > 1 ? [...eigen].sort((x, y) => rang(x) - rang(y)) : eigen;
  /** woorden zonder Highlight API: de markeerstift ligt in een eigen laag */
  const stift = beeld.merken.filter((m) => m.soort === "tekst");
  const stijlVan = (sleutel: string): CSSProperties | undefined =>
    schik.marge[sleutel] === undefined ? undefined : { order: schik.volg[sleutel], marginTop: schik.marge[sleutel] };

  const plekDeel = (
    <div className="opm-plek" aria-live="polite">
      <span className="opm-l">Plek</span>
      {kies ? (
        <>
          <p className="opm-plek-heel">Wijs nu de plek aan in het onderdeel.</p>
          <div className="opm-plek-knoppen">
            <button type="button" className="opm-b" onClick={() => setKies(false)}>Stoppen met kiezen</button>
          </div>
        </>
      ) : plek ? (
        <>
          <div className="opm-citaat opm-citaat-form">
            <span className="opm-citaat-t" title={plek.citaat}>“{plek.citaat}”</span>
          </div>
          <div className="opm-plek-knoppen">
            {beeld.ruimer && <button type="button" className="opm-b" onClick={ruimer}>Ruimer: {beeld.ruimer}</button>}
            {kanKiezen && <button type="button" className="opm-b opm-b-kies" onClick={startKiezen}><Richtpunt />Andere plek</button>}
            <button type="button" className="opm-b" onClick={heleOnderdeel}>Hele onderdeel</button>
          </div>
        </>
      ) : (
        <>
          <p className="opm-plek-heel">Het hele onderdeel.</p>
          {kanKiezen && (
            <div className="opm-plek-knoppen">
              <button type="button" className="opm-b opm-b-kies" onClick={startKiezen}><Richtpunt />Kies de plek</button>
            </div>
          )}
          <p className="opm-plek-tip">Of selecteer eerst de woorden in de tekst waar het om gaat.</p>
        </>
      )}
    </div>
  );

  return (
    <div ref={wrap} className={cls} style={toon && kolomHoogte ? { minHeight: kolomHoogte } : undefined}>
      <button
        ref={knop}
        type="button"
        className="opm-knop"
        aria-expanded={open}
        aria-label={`Opmerking plaatsen bij ${p.naam}${telling}`}
        title={`Opmerking plaatsen bij ${p.naam}${telling}`}
        onPointerDown={() => { bijKnop.current = { selectie: wrap.current ? leesSelectie(wrap.current) : null, toen: performance.now() }; }}
        onClick={klikKnop}
      >
        <Tekstballon />
        Opmerking
        {eigen.length > 0 && <span className="opm-tel">{eigen.length}</span>}
      </button>
      {p.children}
      {stift.length > 0 && (
        <div className="opm-laag opm-laag-stift" aria-hidden="true">
          {stift.flatMap((m) =>
            m.vakken.map((v, i) => (
              <span key={m.id + ":" + i} className={"opm-m opm-m-tekst" + (m.sterk ? " is-" + m.sterk : "")} style={{ left: v.x, top: v.y, width: v.w, height: v.h }} />
            ))
          )}
        </div>
      )}
      {beeld.merken.length > 0 && (
        <div className="opm-laag opm-laag-merk" aria-hidden="true">
          {beeld.merken.flatMap((m) =>
            m.vakken.map((v, i) =>
              m.soort === "eenheid" ? (
                <span
                  key={m.id + ":" + i}
                  className={"opm-m opm-m-eenheid" + (m.sterk ? " is-" + m.sterk : "") + (v.h > 240 ? " is-groot" : "")}
                  style={{ left: v.x, top: v.y, width: v.w, height: v.h }}
                />
              ) : (
                <span key={m.id + ":" + i} className={"opm-m opm-m-lijn" + (m.sterk ? " is-" + m.sterk : "")} style={{ left: v.x, top: v.y + v.h - 2, width: v.w }} />
              )
            )
          )}
        </div>
      )}
      {kies && wijs && (
        <div className="opm-laag opm-laag-ui" aria-hidden="true">
          <span className="opm-kiesvak" style={{ left: wijs.vak.x, top: wijs.vak.y, width: wijs.vak.w, height: wijs.vak.h }}>
            <span className="opm-kieslabel">{wijs.naam}</span>
          </span>
        </div>
      )}
      {!kies && selectie && (
        <div className="opm-laag opm-laag-ui">
          <button
            type="button"
            className="opm-selknop"
            style={{ left: selectie.x, top: selectie.y }}
            title={`Opmerking bij de geselecteerde tekst in ${p.naam}`}
            onPointerDown={(e) => e.preventDefault()}
            onMouseDown={(e) => e.preventDefault()}
            onClick={() => metSelectie(selectie)}
          >
            <Tekstballon />
            {open ? "Kies deze tekst" : "Opmerking"}
          </button>
        </div>
      )}
      {toon && (
        <div className="opm-ballonnen" ref={kolom}>
          {open && (
            <Formulier
              label="Opmerking"
              ph={plek ? "Opmerking bij deze passage" : `Opmerking bij ${p.naam}`}
              onSluit={sluit}
              onPlaats={(tekst, door) => {
                netGeplaatst.current = true;
                api.toevoegen({
                  document: api.document,
                  sectie: p.sectie,
                  blok: p.blok,
                  bij: p.naam,
                  ...(plek ? { citaat: plek.citaat, citaatNr: plek.nr } : {}),
                  tekst,
                  door,
                });
                dicht();
              }}
              boven={plekDeel}
              focusTeken={focusTeken}
              stijl={stijlVan("formulier")}
              sleutel="formulier"
              plekId={plek ? CONCEPT : undefined}
            />
          )}
          {geordend.map((o) => (
            <Ballon
              key={o.id}
              o={o}
              api={api}
              status={o.citaat ? beeld.status[o.id] : undefined}
              stijl={stijlVan(o.id)}
              actief={uitgelicht === o.id}
              flits={ballonFlits === o.id}
              onUitlicht={(licht) => setBijBallon((v) => (licht ? o.id : v === o.id ? null : v))}
              onGa={() => naarPassage(o.id)}
            />
          ))}
        </div>
      )}
      {kies && createPortal(<Kiesbalk wijs={wijs} mis={mis} onStop={() => setKies(false)} />, document.body)}
    </div>
  );
}

/**
 * Compacte lijst van alle opmerkingen van het document: open eerst, dan afgehandeld; elk met
 * blok, sectie, naam, datum, het citaat (als de opmerking op een passage wijst) en de tekst,
 * en een link naar de ballon. De sectietitel komt uit `secties` (optioneel), anders uit het
 * document als de lijst erbinnen staat.
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
        Klik bij een onderdeel op <span className="opm-ov-chip"><Tekstballon />Opmerking</span> om te reageren. Gaat het om één
        passage: selecteer eerst de woorden, of kies in het formulier “Kies de plek”.
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
                {o.citaat && <div className="opm-ov-citaat">“{o.citaat}”</div>}
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
//
// De passage van een opmerking: amber, zoals de ballon. Woorden krijgen een markeerstift
// (::highlight, met donkere letters zodat het ook op een donker vlak leesbaar is), een hele
// alinea, rij of kaart een kader met een streep links in een laag over het blok
// (.opm-laag-merk; een groot kader lichter). Zonder Highlight API liggen de woorden in een
// eigen laag (.opm-laag-stift, vermenigvuldigd met wat eronder staat, zodat de tekst scherp
// blijft) met een lijn eronder (.opm-m-lijn). Sterker (.is-actief) zolang de ballon wordt
// aangewezen of de toetsenbordfocus heeft; .is-flits na een klik op het citaat. Bij "Kies
// de plek" een blauw kader om wat je aanwijst (.opm-kiesvak), een stippellijn om het blok
// en een balk onder in beeld (.opm-kiesbalk, buiten het document). Afdrukken: geen lagen.
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
@media print{.okd .opm-knop,.okd .opm-form,.okd .opm-laag,.okd .opm-citaat-meer,.okd .opm-citaat-noot.is-stil,.opm-kiesbalk{display:none !important}.okd .opm-blok,.okd .okd-vg > .opm-blok,.okd .okd-kop + .okd-blokken > .opm-blok:first-child{margin-top:0}}
.okd .opm-ballonnen{position:absolute;left:100%;top:calc(var(--opm-h) + 8px);margin-left:12px;width:260px;display:flex;flex-direction:column;gap:8px;z-index:2}
.okd .opm-ballon,.okd .opm-form{position:relative;background:#fff;border:1px solid #e2e8f0;border-radius:10px;padding:9px 11px 8px;box-shadow:0 2px 8px rgba(15,23,42,.07);font-size:12.5px;line-height:1.5;color:#1f2937;scroll-margin-top:16px}
.okd .opm-ballon::before{content:"";position:absolute;left:-12px;top:15px;width:12px;height:1px;background:#cbd5e1}
.okd .opm-ballon::after{content:"";position:absolute;left:-16px;top:12px;width:7px;height:7px;border-radius:50%;background:#f59e0b}
.okd .opm-ballon.opm-af{background:#f1f5f9;box-shadow:none}
.okd .opm-ballon.opm-af::after{background:#94a3b8}
.okd .opm-ballon.opm-af > .opm-tekst{text-decoration:line-through;text-decoration-color:rgba(74,85,101,.5);color:#4a5565}
.okd .opm-ballon:target{box-shadow:0 0 0 3px rgba(245,158,11,.45)}
.okd .opm-ballon.is-actief{border-color:#f59e0b;box-shadow:0 0 0 2px rgba(245,158,11,.4),0 2px 8px rgba(15,23,42,.07)}
.okd .opm-ballon.is-flits{border-color:#d97706;animation:opm-ballon-flits 1.8s ease-out}
@keyframes opm-ballon-flits{0%,30%,60%{box-shadow:0 0 0 4px rgba(245,158,11,.6)}15%,45%{box-shadow:0 0 0 2px rgba(245,158,11,.2)}100%{box-shadow:0 0 0 2px rgba(245,158,11,0)}}
@media (prefers-reduced-motion:reduce){.okd .opm-ballon.is-flits{animation:none;box-shadow:0 0 0 3px rgba(245,158,11,.55)}}
.okd .opm-kop{display:flex;align-items:baseline;gap:6px;flex-wrap:wrap}
.okd .opm-naam{font-weight:700;color:#003366}
.okd .opm-datum{font-size:11.5px;color:#5f6b7a}
.okd .opm-af .opm-datum{color:#4a5565}
.okd .opm-x{margin-left:auto;align-self:center;width:20px;height:20px;border-radius:6px;border:0;background:transparent;color:#5f6b7a;font-size:16px;line-height:1;cursor:pointer}
.okd .opm-x:hover,.okd .opm-x:focus-visible{background:#fee2e2;color:#b91c1c}
.okd .opm-tekst{margin:3px 0 0;white-space:pre-line}
.okd .opm-citaat{display:flex;flex-direction:column;align-items:flex-start;gap:2px;margin:5px 0 4px;padding:2px 0 2px 8px;border-left:3px solid #f59e0b}
.okd .opm-citaat-t{display:-webkit-box;-webkit-box-orient:vertical;-webkit-line-clamp:2;overflow:hidden;font-size:12px;line-height:1.45;font-style:italic;color:#4a5565;text-align:left;overflow-wrap:anywhere}
.okd .opm-citaat-t.is-heel{display:block;-webkit-line-clamp:none;overflow:visible}
.okd .opm-citaat-ga{display:block;font:inherit;text-align:left;background:none;border:0;border-radius:3px;padding:0;margin:0;cursor:pointer}
.okd .opm-citaat-ga:hover .opm-citaat-t{color:#003366;text-decoration:underline;text-underline-offset:2px}
.okd .opm-citaat-ga:focus-visible,.okd .opm-citaat-meer:focus-visible,.okd .opm-link:focus-visible,.okd .opm-b:focus-visible,.okd .opm-selknop:focus-visible{outline:2px solid #003366;outline-offset:2px}
.okd .opm-citaat-meer{font:inherit;font-size:11.5px;font-weight:600;color:#003366;background:none;border:0;padding:0;cursor:pointer;text-decoration:underline;text-underline-offset:2px}
.okd .opm-citaat.is-weg{border-left-color:#94a3b8}
.okd .opm-citaat-noot{font-size:12px;font-weight:600;color:#92400e}
.okd .opm-citaat-noot.is-stil{font-weight:400;color:#4a5565}
.okd .opm-af .opm-citaat{border-left-color:#94a3b8}
.okd .opm-citaat-form{margin-top:3px}
.okd .opm-citaat-form .opm-citaat-t{-webkit-line-clamp:4;color:#1f2937}
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
.okd .opm-plek{margin-bottom:8px;padding-bottom:8px;border-bottom:1px solid #e2e8f0}
.okd .opm-plek-heel{margin:2px 0 0;font-size:12.5px;color:#1f2937}
.okd .opm-plek-tip{margin:5px 0 0;font-size:12px;line-height:1.45;color:#4a5565}
.okd .opm-plek-knoppen{display:flex;align-items:center;gap:6px;flex-wrap:wrap;margin-top:6px}
.okd .opm-knoppen{display:flex;align-items:center;gap:6px;flex-wrap:wrap;margin-top:8px}
.okd .opm-b{font:inherit;font-size:11.5px;font-weight:700;line-height:1.5;border:1px solid #cbd5e1;border-radius:6px;background:#fff;color:#334155;padding:2px 10px;cursor:pointer}
.okd .opm-b:hover{background:#f1f5f9}
.okd .opm-b-prim{background:#003366;border-color:#003366;color:#fff}
.okd .opm-b-prim:hover{background:#00264d}
.okd .opm-b:disabled{opacity:.45;cursor:default}
.okd .opm-b-rood{color:#b91c1c;border-color:#fecaca}
.okd .opm-b-kies{display:inline-flex;align-items:center;gap:5px;border-color:#003366;color:#003366}
.okd .opm-b-kies:hover{background:#eef4fb}
.okd .opm-b-kies svg{width:13px;height:13px;flex:none}
.okd .opm-hint{font-size:11.5px;color:#5f6b7a;margin-left:auto}
@media (pointer:coarse){.okd .opm-plek-knoppen .opm-b{min-height:32px;padding:4px 12px;font-size:12.5px}}
.okd .opm-laag{position:absolute;inset:0;pointer-events:none}
.okd .opm-laag-merk{z-index:1}
.okd .opm-laag-stift{z-index:1;mix-blend-mode:multiply}
.okd .opm-laag-ui{z-index:5}
.okd .opm-m{position:absolute;box-sizing:border-box}
.okd .opm-m-eenheid{border-radius:6px;background:rgba(251,191,36,.13);box-shadow:inset 3px 0 0 #f59e0b,inset 0 0 0 1px rgba(217,119,6,.6)}
.okd .opm-m-eenheid.is-groot{background:rgba(251,191,36,.07)}
.okd .opm-m-eenheid.is-actief{background:rgba(251,191,36,.26);box-shadow:inset 4px 0 0 #d97706,inset 0 0 0 2px #d97706}
.okd .opm-m-eenheid.is-groot.is-actief{background:rgba(251,191,36,.14)}
.okd .opm-m-eenheid.is-flits{background:rgba(245,158,11,.45);box-shadow:inset 5px 0 0 #b45309,inset 0 0 0 3px #b45309}
.okd .opm-m-eenheid.is-groot.is-flits{background:rgba(245,158,11,.24)}
.okd .opm-m-tekst{border-radius:2px;background:rgba(251,191,36,.42)}
.okd .opm-m-tekst.is-actief{background:rgba(245,158,11,.62)}
.okd .opm-m-tekst.is-flits{background:rgba(245,158,11,.9)}
.okd .opm-m-lijn{height:2px;background:#d97706}
.okd .opm-m-lijn.is-actief,.okd .opm-m-lijn.is-flits{background:#b45309}
@media screen{
::highlight(opm-merk){background-color:#fde9a9;color:#1f2937;text-decoration:underline;text-decoration-color:#d97706;text-decoration-thickness:2px;text-underline-offset:3px}
::highlight(opm-merk-actief){background-color:#fbbf24;color:#111827;text-decoration:underline;text-decoration-color:#b45309;text-decoration-thickness:2px;text-underline-offset:3px}
::highlight(opm-merk-flits){background-color:#f59e0b;color:#111827}
}
.okd .opm-blok.opm-wijst{cursor:pointer}
.okd .opm-blok.opm-kiest{cursor:pointer;-webkit-user-select:none;user-select:none;outline:2px dashed rgba(0,51,102,.5);outline-offset:5px;border-radius:6px}
.okd .opm-blok.opm-kiest > :not(.opm-knop):not(.opm-ballonnen):not(.opm-laag) :is(select,input,textarea){pointer-events:none}
.okd .opm-blok.opm-kiest .opm-ballonnen{cursor:auto;-webkit-user-select:text;user-select:text}
.okd .opm-kiesvak{position:absolute;box-sizing:border-box;border:2px solid #003366;border-radius:6px;background:rgba(0,51,102,.07)}
.okd .opm-kieslabel{position:absolute;left:-2px;bottom:100%;padding:1px 7px;border-radius:5px 5px 0 0;background:#003366;color:#fff;font-size:11px;font-weight:700;line-height:1.5;white-space:nowrap}
.okd .opm-selknop{position:absolute;transform:translate(-50%,8px);pointer-events:auto;display:inline-flex;align-items:center;gap:5px;box-sizing:border-box;height:28px;padding:0 12px 0 9px;font:inherit;font-size:12px;font-weight:700;line-height:1;white-space:nowrap;color:#fff;background:#003366;border:1px solid #003366;border-radius:999px;box-shadow:0 4px 14px rgba(15,23,42,.28);cursor:pointer;-webkit-user-select:none;user-select:none}
.okd .opm-selknop:hover{background:#00264d}
.okd .opm-selknop svg{width:13px;height:13px;flex:none}
@media (pointer:coarse){.okd .opm-selknop{height:38px;padding:0 16px 0 12px;font-size:13px;transform:translate(-50%,30px)}}
.opm-kiesbalk{position:fixed;left:50%;bottom:48px;transform:translateX(-50%);z-index:60;display:flex;align-items:center;gap:14px;box-sizing:border-box;width:max-content;max-width:calc(100vw - 24px);padding:10px 10px 10px 16px;border-radius:12px;background:#003366;color:#fff;box-shadow:0 12px 32px rgba(15,23,42,.35);font-size:13px;line-height:1.45}
.opm-kiesbalk:focus-visible{outline:2px solid #fff;outline-offset:-4px}
.opm-kiesbalk-t{display:flex;flex-direction:column;gap:1px;min-width:0}
.opm-kiesbalk-t b{font-size:13.5px;font-weight:700}
.opm-kiesbalk-toets{font-size:12px;color:#dbe7f5}
.opm-kiesbalk-nu{font-size:12px;font-weight:600;color:#fde68a;overflow-wrap:anywhere}
.opm-kiesbalk-nu:empty{display:none}
.opm-kiesbalk-mis{font-size:12px;font-weight:600;color:#fde68a;animation:opm-mis .5s ease-out}
@keyframes opm-mis{0%{opacity:.2}100%{opacity:1}}
@media (prefers-reduced-motion:reduce){.opm-kiesbalk-mis{animation:none}}
.opm-kiesbalk button{flex:none;font:inherit;font-size:13px;font-weight:700;color:#003366;background:#fff;border:1px solid #fff;border-radius:8px;padding:6px 14px;cursor:pointer}
.opm-kiesbalk button:hover{background:#eef4fb}
.opm-kiesbalk button:focus-visible{outline:2px solid #fde68a;outline-offset:2px}
@media (pointer:coarse){.opm-kiesbalk-toets{display:none}.opm-kiesbalk button{padding:9px 16px}}
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
.opm-ov-citaat{display:-webkit-box;-webkit-box-orient:vertical;-webkit-line-clamp:2;overflow:hidden;margin:3px 0 1px;padding-left:8px;border-left:3px solid #fcd34d;font-size:12px;line-height:1.45;font-style:italic;color:#4a5565;overflow-wrap:anywhere}
.opm-overzicht li.opm-af .opm-ov-citaat{border-left-color:#94a3b8}
.opm-ov-tekst{margin-top:2px;white-space:pre-line}
.opm-overzicht li.opm-af .opm-ov-tekst{color:#4a5565}
`;
