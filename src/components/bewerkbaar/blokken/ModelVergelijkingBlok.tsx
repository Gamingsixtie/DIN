// Modelvergelijking (stap 11): het model van een andere partij naast het DIN, met lijnen
// die per laag laten zien wat gelijk blijft en wat verschuift. Wie de plaat van 3sides kent
// ("Van baten naar vermogens en inspanningen", plan van aanpak p. 2), herkent links meteen
// zijn eigen piramide; rechts staat hetzelfde in het Doelen-Inspanningennetwerk.
// - vorm "piramide": de lagen als trapezia in hun eigen kleur die samen één piramide vormen
//   (de bovenste een driehoek), naam groot en de toevoeging tussen haakjes eronder. Zijvakken
//   staan naast de lagen waar ze bij horen en lopen tot tegen de schuine rand, zoals de
//   groene vakken op de plaat van 3sides; een zijvak bij meer lagen beslaat hun hoogte samen.
// - vorm "keten": gestapelde balken in de laagkleur met een kleine pijl omhoog ertussen
//   (van inspanning naar doel lees je van onder naar boven).
// Beide kanten delen hun rijen (subgrid), zodat een laag links even hoog is als rechts en
// een lijn tussen twee lagen zo recht mogelijk loopt. De lijnen worden na het renderen
// gemeten (useLayoutEffect + ResizeObserver) en in een SVG over de plaat getekend:
// gelijk = doorgetrokken grijsblauw, verschuift = dikke amber streeplijn, voorstel =
// Cito-blauwe stippellijn; het label staat als pilletje in de middenzone, als knooppunt op
// de lijn. Ligt er een zijvak tussen een laag en het midden (of de piramide tussen een
// zijvak en het midden), dan loopt de lijn niet dwars over tekst maar via de dichtstbijzijnde
// naad tussen twee lagen of langs de onder- of bovenrand, langs de schuine rand van de
// piramide. Hover of focus op een laag, zijvak of label licht de lijnen en de verbonden
// elementen op en dimt de rest. Onder ca. 760 px breed staan links en rechts onder elkaar,
// zonder lijnen, met per element links een regel "→ in het DIN: … · label".
// Bewerkmodus: de plaat blijft als voorbeeld staan; daaronder per kant kop, onderregel,
// vorm, lagen (naam, toevoeging, kleur, verplaatsen, weghalen) en zijvakken (kop, items,
// naast welke lagen, links of rechts), de koppelingen als lijst "van → naar" met soort en
// label, en titel en voet. Een laag of zijvak weghalen haalt ook zijn koppelingen weg.
// Alleen gebruiken binnen een client-component (de props bevatten functies).

import { Fragment, useId, useLayoutEffect, useRef, useState } from "react";
import type { CSSProperties, ReactNode } from "react";
import { Keuze, Lijst, PlusKnop, V, WegKnop } from "@/components/bewerkbaar/velden";
import { metBronlinks } from "@/components/bewerkbaar/bron-context";
import { domein } from "@/components/bewerkbaar/blok-typen";
import type { BlokVan, LosBlokProps, Zet } from "@/components/bewerkbaar/blok-typen";

type Blok = BlokVan<"modelvergelijking">;
type Kant = Blok["links"];
type Laag = Kant["lagen"][number];
type Zijvak = Kant["zijvakken"][number];
type Koppeling = Blok["koppelingen"][number];
type Soort = Koppeling["soort"];
type Vorm = Kant["vorm"];
type KantNaam = "links" | "rechts";
/** aan welke kant van de lagen een zijvak staat */
type Zij = "links" | "rechts";
type Pt = [number, number];
type Rect = { l: number; t: number; r: number; b: number };

// ---------- constanten ----------

/** Breedte van de plaat (px) waaronder links en rechts onder elkaar staan, zonder lijnen. */
const SMAL = 760;
const HEX = /^#(?:[0-9a-f]{3}|[0-9a-f]{6})$/i;
const NEUTRAAL = "#64748b";
/** Zijvakken: lichtgroen met een groene rand, als de groene vakken op de plaat van 3sides. */
const ZV_VULLING = "#dcf7e9";
const ZV_RAND = "#a7f3d0";
/** Ten hoogste zo breed (basis : hoogte) wordt de piramide; de plaat van 3sides zit op ca. 1,45. */
const MAX_BREEDTE = 1.45;
/** Afstand (px) tussen lijnen die bij hetzelfde element beginnen of eindigen. */
const SPREIDING = 9;
/** Afstand (px) tussen lijnen die samen door één naad of langs één rand lopen. */
const BAAN = 7;

const SOORTEN: Record<Soort, { kleur: string; uitleg: string }> = {
  gelijk: { kleur: "#64748b", uitleg: "gelijk" },
  verschuift: { kleur: "#d97706", uitleg: "verschuift naar een ander niveau" },
  voorstel: { kleur: "#003366", uitleg: "voorstel van het programma" },
};
/** Tekenvolgorde: de verschuivingen komen bovenop, dat is de boodschap. */
const TEKEN_VOLGORDE: Soort[] = ["gelijk", "voorstel", "verschuift"];
const LEGENDA: { soort: Soort; lijn: string }[] = [
  { soort: "gelijk", lijn: "Doorgetrokken" },
  { soort: "verschuift", lijn: "Streep" },
  { soort: "voorstel", lijn: "Stippel" },
];

const SOORT_OPTIES: { waarde: Soort; label: string }[] = [
  { waarde: "gelijk", label: "Gelijk (doorgetrokken)" },
  { waarde: "verschuift", label: "Verschuift (streep)" },
  { waarde: "voorstel", label: "Voorstel (stippel)" },
];
const VORM_OPTIES: { waarde: Vorm; label: string }[] = [
  { waarde: "piramide", label: "Piramide" },
  { waarde: "keten", label: "Keten (gestapeld)" },
];
const ZIJ_OPTIES: { waarde: Zij; label: string }[] = [
  { waarde: "links", label: "Links van de lagen" },
  { waarde: "rechts", label: "Rechts van de lagen" },
];

// Standaardkleur van een nieuwe laag: pastel als op de plaat van 3sides, of de DIN-kleuren.
const PIRAMIDE_KLEUREN = ["#e5dcef", "#c4f3dd", "#fcd6db", "#bff0f7"];
const KETEN_KLEUREN = ["#003366", "#0066cc", "#0e7490", "#b45309"];
const LAAG_TOKENS = new Map<string, string>([
  ["doel", "#003366"],
  ["baat", "#0066cc"],
  ["vermogen", "#0e7490"],
  ["gedrag", "#6d28d9"],
  ["inspanning", "#b45309"],
]);

const LEGE_KANT: Kant = { kop: "", sub: "", vorm: "keten", lagen: [], zijvakken: [] };

// ---------- kleine hulpfuncties ----------

const r1 = (n: number) => Math.round(n * 10) / 10;
const r4 = (n: number) => Math.round(n * 1e4) / 1e4;
const getal = (n: number) => String(r1(n));

function klem(v: number, min: number, max: number): number {
  return min > max ? (min + max) / 2 : Math.min(max, Math.max(min, v));
}

function kantVan(b: Blok, kant: KantNaam): Kant {
  return b[kant] ?? LEGE_KANT;
}
function lagenVan(k: Kant): Laag[] {
  return k.lagen ?? [];
}
function zijvakkenVan(k: Kant): Zijvak[] {
  return k.zijvakken ?? [];
}
function vormVan(k: Kant): Vorm {
  return k.vorm === "piramide" ? "piramide" : "keten";
}
function soortVan(x: Koppeling): Soort {
  return x.soort === "verschuift" || x.soort === "voorstel" ? x.soort : "gelijk";
}
function zijVan(z: Zijvak): Zij {
  return z.kant === "links" ? "links" : "rechts";
}

/** Kleur van een laag: hex, domein-id, laagtoken (doel, baat, …) of de standaard per positie. */
function laagKleur(kleur: string | undefined, vorm: Vorm, i: number): string {
  const t = (kleur ?? "").trim();
  if (HEX.test(t)) return t;
  const d = domein(t);
  if (d) return d.kleur;
  const token = LAAG_TOKENS.get(t.toLowerCase());
  if (token) return token;
  const palet = vorm === "piramide" ? PIRAMIDE_KLEUREN : KETEN_KLEUREN;
  return palet[i % palet.length];
}

/** Kleur als #rrggbb, wat een kleurkiezer (input type=color) verlangt. */
function hex6(kleur: string): string {
  const t = kleur.trim().toLowerCase();
  if (/^#[0-9a-f]{6}$/.test(t)) return t;
  if (/^#[0-9a-f]{3}$/.test(t)) return "#" + [1, 2, 3].map((i) => t[i] + t[i]).join("");
  return NEUTRAAL;
}

/** Lichte kleur (dan donkere tekst erop); relatieve luminantie volgens WCAG. */
function isLicht(kleur: string): boolean {
  const h = hex6(kleur);
  const kanaal = (i: number) => {
    const c = parseInt(h.slice(i, i + 2), 16) / 255;
    return c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
  };
  return 0.2126 * kanaal(1) + 0.7152 * kanaal(3) + 0.0722 * kanaal(5) > 0.4;
}

function laagNaam(l: Laag): string {
  return (l.naam ?? "").trim() || "Laag";
}
function laagLabel(l: Laag): string {
  const sub = (l.sub ?? "").trim();
  return sub ? `${laagNaam(l)} (${sub})` : laagNaam(l);
}
/** Naam van een zijvak: de kop, of anders de items achter elkaar ("NPS · Conversie · Omzetgroei"). */
function zijvakNaam(z: Zijvak): string {
  const kop = (z.kop ?? "").trim();
  if (kop) return kop;
  const items = (z.items ?? []).map((x) => x.trim()).filter(Boolean);
  return items.length ? items.join(" · ") : "Zijvak";
}
function elementNaam(k: Kant, id: string): string | null {
  const l = lagenVan(k).find((x) => x.id === id);
  if (l) return laagNaam(l);
  const z = zijvakkenVan(k).find((x) => x.id === id);
  return z ? zijvakNaam(z) : null;
}

// ---------- indeling: rijen, banen en kolommen ----------

/** Plek van een zijvak: van laag tot laag (indexen), links of rechts, en de baan (0 = tegen de lagen). */
type Plek = { van: number; tot: number; zij: Zij; baan: number };
type KantIndeling = { span: number; n: number; zv: Map<string, Plek>; banen: Record<Zij, number> };
type Indeling = { R: number; links: KantIndeling; rechts: KantIndeling };

function ggd(a: number, b: number): number {
  return b === 0 ? a : ggd(b, a % b);
}

/**
 * Rijen van de plaat. Hebben beide kanten evenveel lagen, dan is elke laag één rij; anders
 * het kleinste gemene veelvoud, zodat elke laag een gelijk deel van de hoogte krijgt.
 */
function indeling(b: Blok): Indeling {
  const L = kantVan(b, "links");
  const R = kantVan(b, "rechts");
  const nL = lagenVan(L).length;
  const nR = lagenVan(R).length;
  let rijen = Math.max(1, nL, nR);
  let sL = 1;
  let sR = 1;
  if (nL > 0 && nR > 0) {
    const kgv = (nL / ggd(nL, nR)) * nR;
    if (kgv <= 24) {
      rijen = kgv;
      sL = kgv / nL;
      sR = kgv / nR;
    }
  }
  return { R: rijen, links: kantIndeling(L, sL), rechts: kantIndeling(R, sR) };
}

/** Per zijvak de lagen waar het naast staat en een baan, zodat zijvakken elkaar niet overlappen. */
function kantIndeling(k: Kant, span: number): KantIndeling {
  const lagen = lagenVan(k);
  const n = lagen.length;
  const perZij: Record<Zij, { id: string; van: number; tot: number }[]> = { links: [], rechts: [] };
  for (const z of zijvakkenVan(k)) {
    const idx = (z.bij ?? []).map((id) => lagen.findIndex((l) => l.id === id)).filter((i) => i >= 0);
    perZij[zijVan(z)].push({
      id: z.id,
      van: idx.length ? Math.min(...idx) : 0,
      tot: idx.length ? Math.max(...idx) : Math.max(0, n - 1),
    });
  }
  const zv = new Map<string, Plek>();
  const banen: Record<Zij, number> = { links: 0, rechts: 0 };
  for (const zij of ["links", "rechts"] as const) {
    const eindes: number[] = [];
    for (const x of [...perZij[zij]].sort((a, c) => a.van - c.van || a.tot - c.tot)) {
      let baan = eindes.findIndex((e) => e < x.van);
      if (baan < 0) {
        baan = eindes.length;
        eindes.push(x.tot);
      } else eindes[baan] = x.tot;
      zv.set(x.id, { van: x.van, tot: x.tot, zij, baan });
    }
    banen[zij] = eindes.length;
  }
  return { span, n, zv, banen };
}

function laagRij(ki: KantIndeling, i: number): string {
  return `${i * ki.span + 1} / span ${ki.span}`;
}
function zijvakRij(ki: KantIndeling, p: Plek): string {
  return ki.n === 0 ? "1 / -1" : `${p.van * ki.span + 1} / ${(p.tot + 1) * ki.span + 1}`;
}
/** Kolommen van één kant: banen links, de lagen, banen rechts. */
function kolomSjabloon(ki: KantIndeling, vorm: Vorm): string {
  const baan = "fit-content(128px)";
  const lagen = vorm === "piramide" ? "minmax(150px,1fr)" : "minmax(120px,1fr)";
  return [...Array<string>(ki.banen.links).fill(baan), lagen, ...Array<string>(ki.banen.rechts).fill(baan)].join(" ");
}
function lagenKolom(ki: KantIndeling): number {
  return ki.banen.links + 1;
}
function zijvakKolom(ki: KantIndeling, p: Plek): number {
  return p.zij === "links" ? ki.banen.links - p.baan : ki.banen.links + 2 + p.baan;
}
/** Een zijvak in de binnenste baan naast een piramide loopt door tot tegen de schuine rand. */
function heeftStaart(k: Kant, p: Plek): boolean {
  return vormVan(k) === "piramide" && lagenVan(k).length > 0 && p.baan === 0;
}
/** Kolommen van de plaat: links · midden · rechts, naar verhouding van wat er aan elke kant staat. */
function figKolommen(b: Blok, ind: Indeling): string {
  const gewicht = (k: Kant, ki: KantIndeling) =>
    r1((vormVan(k) === "piramide" ? 1.45 : 1) + 0.55 * (ki.banen.links + ki.banen.rechts));
  return `minmax(0,${gewicht(kantVan(b, "links"), ind.links)}fr) minmax(156px,.82fr) minmax(0,${gewicht(kantVan(b, "rechts"), ind.rechts)}fr)`;
}

// ---------- meten en lijnen trekken ----------
// Alle maten relatief aan de plaat (.mv-fig). De rechterkant wordt gespiegeld gerekend
// (x → breedte − x), zodat voor beide kanten "binnen" (naar het midden) de grotere x is.

type Pyr = { pc: number; hb: number; y0: number; T: number; colW: number; naden: number[] };
type ZvGeo = { r: Rect; binnen: boolean; staart: boolean };
type KantGeo = {
  /** x van de binnenrand van deze kant (grens met het midden) */
  binnen: number;
  pyr: Pyr | null;
  lagen: Map<string, Rect>;
  zv: Map<string, ZvGeo>;
  obstakels: { id: string; r: Rect }[];
  /** y van de randen tussen de lagen, plus boven- en onderrand */
  grenzen: number[];
};
/** Beginpunt van een lijn: op de schuine rand (binnen/buiten) of op de rand van een vak. */
type Anker = { x: number; y: number; via: "binnen" | "buiten" | "rand"; spleet: number; id: string };
type Pad = { k: number; soort: Soort; d: string; start: Pt };
type Breuken = { lagen: Record<string, [number, number]>; s: number };
type Meting = {
  w: number;
  h: number;
  paden: Pad[];
  /** bovenkant van elk label (index van de koppeling), relatief aan de middenzone */
  pillen: Record<number, number>;
  /** per piramide: boven- en onderkant van elke laag als deel van de hoogte, en de breedteschaal */
  breuken: Record<KantNaam, Breuken | null>;
  /** per zijvak met staart ("links:<id>"): boven- en onderkant als deel van de hoogte */
  staarten: Record<string, [number, number]>;
};

/** x van de schuine rand op hoogte y; richting 1 = binnenkant, −1 = buitenkant. */
function helling(p: Pyr, y: number, richting: 1 | -1): number {
  return p.pc + richting * p.hb * ((y - p.y0) / p.T);
}
function midY(r: Rect): number {
  return (r.t + r.b) / 2;
}

function kantGeo(
  k: Kant,
  kant: KantNaam,
  ki: KantIndeling,
  meet: (sleutel: string) => Rect | null,
  W: number
): KantGeo | null {
  const spiegel = (r: Rect): Rect => (kant === "rechts" ? { l: W - r.r, t: r.t, r: W - r.l, b: r.b } : r);
  const kr = meet("kant:" + kant);
  if (!kr) return null;
  const lagen = new Map<string, Rect>();
  for (const l of lagenVan(k)) {
    const r = meet(kant + ":" + l.id);
    if (r) lagen.set(l.id, spiegel(r));
  }
  const rij = [...lagen.values()].sort((a, c) => a.t - c.t);
  let pyr: Pyr | null = null;
  if (vormVan(k) === "piramide" && rij.length > 0) {
    const y0 = rij[0].t;
    const T = Math.max(1, rij[rij.length - 1].b - y0);
    const colL = Math.min(...rij.map((r) => r.l));
    const colR = Math.max(...rij.map((r) => r.r));
    const colW = Math.max(1, colR - colL);
    pyr = {
      pc: (colL + colR) / 2,
      hb: Math.min(colW, MAX_BREEDTE * T) / 2,
      y0,
      T,
      colW,
      naden: rij.slice(1).map((r, i) => (rij[i].b + r.t) / 2),
    };
  }
  const zv = new Map<string, ZvGeo>();
  const obstakels: { id: string; r: Rect }[] = [];
  for (const z of zijvakkenVan(k)) {
    const plek = ki.zv.get(z.id);
    const r0 = meet(kant + ":" + z.id);
    if (!plek || !r0) continue;
    const r = spiegel(r0);
    // links liggen de zijvakken rechts van de lagen aan de binnenkant, rechts omgekeerd
    const binnen = kant === "links" ? plek.zij === "rechts" : plek.zij === "links";
    const staart = pyr !== null && plek.baan === 0;
    zv.set(z.id, { r, binnen, staart });
    let o = r;
    if (staart && pyr)
      o = binnen ? { ...r, l: Math.min(r.l, helling(pyr, r.t, 1)) } : { ...r, r: Math.max(r.r, helling(pyr, r.t, -1)) };
    obstakels.push({ id: z.id, r: o });
  }
  if (!pyr) for (const [id, r] of lagen) obstakels.push({ id, r });
  // randen: tussen de lagen het midden van de tussenruimte; boven en onder de buitenkant van
  // alles wat er staat (balken van een keten springen iets in, zijvakken niet)
  const alle = [...rij, ...[...zv.values()].map((z) => z.r)];
  const grenzen = rij.length
    ? [
        Math.min(...alle.map((r) => r.t)),
        ...rij.slice(1).map((r, i) => (rij[i].b + r.t) / 2),
        Math.max(...alle.map((r) => r.b)),
      ]
    : [];
  return { binnen: spiegel(kr).r, pyr, lagen, zv, obstakels, grenzen };
}

/** Kan een lijn op hoogte y vanaf x recht naar de binnenrand, zonder over een vak te gaan? */
function vrij(g: KantGeo, x: number, y: number, eigen: string): boolean {
  for (const o of g.obstakels) {
    if (o.id === eigen || o.r.r <= x + 0.5 || o.r.l >= g.binnen - 0.5) continue;
    if (y > o.r.t + 0.5 && y < o.r.b - 0.5) return false;
  }
  const p = g.pyr;
  if (
    p &&
    y > p.y0 + 0.5 &&
    y < p.y0 + p.T - 0.5 &&
    x < helling(p, y, 1) - 1 &&
    !p.naden.some((n) => Math.abs(n - y) < 2.5)
  )
    return false;
  return true;
}

/** Halve vrije ruimte naast een vak (voor het verticale stukje van een lijn door een spleet). */
function spleet(g: KantGeo, x: number, y: number, eigen: string): number {
  let d = Infinity;
  for (const o of g.obstakels)
    if (o.id !== eigen && o.r.l >= x - 0.5 && y > o.r.t && y < o.r.b) d = Math.min(d, o.r.l - x);
  const p = g.pyr;
  if (p && y > p.y0 && y < p.y0 + p.T) {
    const xl = helling(p, y, -1);
    if (xl >= x - 0.5) d = Math.min(d, xl - x);
  }
  return Number.isFinite(d) ? Math.max(2, Math.min(10, d / 2)) : 10;
}

function anker(g: KantGeo, id: string, dy: number): Anker | null {
  const lr = g.lagen.get(id);
  if (lr) {
    const y = klem(midY(lr) + dy, lr.t + 5, lr.b - 5);
    if (g.pyr) return { x: helling(g.pyr, y, 1), y, via: "binnen", spleet: 0, id };
    return { x: lr.r, y, via: "rand", spleet: spleet(g, lr.r, y, id), id };
  }
  const z = g.zv.get(id);
  if (!z) return null;
  const y = klem(midY(z.r) + dy, z.r.t + 5, z.r.b - 5);
  if (!z.binnen && z.staart && g.pyr) return { x: helling(g.pyr, y, -1), y, via: "buiten", spleet: 0, id };
  return { x: z.r.r, y, via: "rand", spleet: spleet(g, z.r.r, y, id), id };
}

/**
 * Kan de lijn niet recht naar het midden, dan kiest hij de dichtstbijzijnde vrije rand
 * (naad tussen twee lagen, of boven- of onderrand), met een lichte voorkeur voor de kant van
 * het doel. Langs de schuine rand gaat hij niet voorbij het beginpunt van een andere lijn.
 */
function kiesKanaal(g: KantGeo, a: Anker, doelY: number, alle: Anker[]): number | null {
  if (vrij(g, a.x, a.y, a.id)) return null;
  let beste: number | null = null;
  let kost = Infinity;
  for (const gy of g.grenzen) {
    if (!vrij(g, a.x, gy, a.id)) continue;
    let c = Math.abs(gy - a.y) + 0.35 * Math.abs(gy - doelY);
    if (a.via !== "rand")
      for (const o of alle)
        if (o !== a && o.via === a.via && o.y > Math.min(a.y, gy) + 1 && o.y < Math.max(a.y, gy) - 1) c += 1000;
    if (c < kost - 0.01) {
      kost = c;
      beste = gy;
    }
  }
  return beste;
}

/**
 * Lopen meer lijnen door dezelfde naad of langs dezelfde rand, dan krijgt elk een eigen baan,
 * zo gekozen dat ze elkaar niet kruisen: de lijn die het verst van het midden begint, ligt
 * het dichtst bij zijn eigen laag.
 */
function baanOffsets(g: KantGeo, gebruik: { k: number; a: Anker; gy: number }[]): Map<number, number> {
  const uit = new Map<number, number>();
  const top = g.grenzen[0];
  const bodem = g.grenzen[g.grenzen.length - 1];
  const perGrens = new Map<number, { k: number; a: Anker; gy: number }[]>();
  for (const x of gebruik) perGrens.set(x.gy, [...(perGrens.get(x.gy) ?? []), x]);
  for (const [gy, lijst] of perGrens) {
    const boven = lijst.filter((x) => x.a.y < gy).sort((p, q) => p.a.x - q.a.x);
    const onder = lijst.filter((x) => x.a.y >= gy).sort((p, q) => p.a.x - q.a.x);
    if (gy !== top && gy !== bodem && lijst.length === 1) {
      uit.set(lijst[0].k, 0);
      continue;
    }
    boven.forEach((x, j) => uit.set(x.k, gy === bodem ? BAAN * (boven.length - j) : -BAAN / 2 - BAAN * j));
    onder.forEach((x, j) => uit.set(x.k, gy === top ? -BAAN * (onder.length - j) : BAAN / 2 + BAAN * j));
  }
  return uit;
}

/** Knikpunten van anker tot binnenrand. */
function route(g: KantGeo, a: Anker, gy: number | null, off: number): Pt[] {
  if (gy === null) return [[a.x, a.y], [g.binnen, a.y]];
  const yc = gy + off;
  if (a.via === "binnen" && g.pyr) return [[a.x, a.y], [helling(g.pyr, yc, 1), yc], [g.binnen, yc]];
  if (a.via === "buiten" && g.pyr) return [[a.x, a.y], [helling(g.pyr, yc, -1), yc], [g.binnen, yc]];
  const xg = a.x + a.spleet;
  return [[a.x, a.y], [xg, a.y], [xg, yc], [g.binnen, yc]];
}

/** Lijn langs de punten met afgeronde knikken; zonder "begin" loopt hij door vanaf het eerste punt. */
function polylijn(punten: Pt[], straal: number, begin: boolean): string {
  const p = punten.filter((q, i) => i === 0 || Math.hypot(q[0] - punten[i - 1][0], q[1] - punten[i - 1][1]) > 0.5);
  let d = begin ? `M${getal(p[0][0])} ${getal(p[0][1])}` : "";
  for (let i = 1; i < p.length; i++) {
    const [x, y] = p[i];
    if (i === p.length - 1) {
      d += ` L${getal(x)} ${getal(y)}`;
      break;
    }
    const [px, py] = p[i - 1];
    const [nx, ny] = p[i + 1];
    const l1 = Math.hypot(x - px, y - py);
    const l2 = Math.hypot(nx - x, ny - y);
    const r = Math.min(straal, l1 / 2, l2 / 2);
    const ax = x - ((x - px) / l1) * r;
    const ay = y - ((y - py) / l1) * r;
    const bx = x + ((nx - x) / l2) * r;
    const by = y + ((ny - y) / l2) * r;
    d += ` L${getal(ax)} ${getal(ay)} Q${getal(x)} ${getal(y)} ${getal(bx)} ${getal(by)}`;
  }
  return d;
}

/** Labels onder elkaar zonder overlap, zo dicht mogelijk bij hun gewenste hoogte. */
function schikPillen(p: { k: number; y: number; h: number }[], max: number): Map<number, number> {
  const s = [...p].sort((a, c) => a.y - c.y || a.k - c.k);
  const ys: number[] = [];
  let onder = -Infinity;
  s.forEach((q, i) => {
    ys[i] = Math.max(q.y, onder + 6 + q.h / 2);
    onder = ys[i] + q.h / 2;
  });
  let boven = Infinity;
  for (let i = s.length - 1; i >= 0; i--) {
    ys[i] = Math.min(ys[i], boven - 6 - s[i].h / 2, max - s[i].h / 2);
    boven = ys[i] - s[i].h / 2;
  }
  return new Map(s.map((q, i) => [q.k, ys[i]]));
}

/** Lijnen die bij hetzelfde element beginnen (of eindigen) iets uit elkaar, op volgorde van de overkant. */
function spreiding(
  lijst: { k: number; x: Koppeling }[],
  sleutel: (x: Koppeling) => string,
  overkantY: (x: Koppeling) => number
): Map<number, number> {
  const groepen = new Map<string, { k: number; x: Koppeling }[]>();
  for (const g of lijst) groepen.set(sleutel(g.x), [...(groepen.get(sleutel(g.x)) ?? []), g]);
  const uit = new Map<number, number>();
  for (const groep of groepen.values()) {
    const s = [...groep].sort((a, c) => overkantY(a.x) - overkantY(c.x) || a.k - c.k);
    s.forEach((g, j) => uit.set(g.k, (j - (s.length - 1) / 2) * SPREIDING));
  }
  return uit;
}

function breuken(g: KantGeo | null): Breuken | null {
  const p = g?.pyr;
  if (!g || !p) return null;
  const lagen: Record<string, [number, number]> = {};
  for (const [id, r] of g.lagen) lagen[id] = [r4((r.t - p.y0) / p.T), r4((r.b - p.y0) / p.T)];
  return { lagen, s: r4((2 * p.hb) / p.colW) };
}

function staarten(g: KantGeo | null, kant: KantNaam): Record<string, [number, number]> {
  const p = g?.pyr;
  const uit: Record<string, [number, number]> = {};
  if (!g || !p) return uit;
  for (const [id, z] of g.zv) if (z.staart) uit[kant + ":" + id] = [r4((z.r.t - p.y0) / p.T), r4((z.r.b - p.y0) / p.T)];
  return uit;
}

/** Meet de plaat en rekent de lijnen, de labelposities en de vorm van de piramides uit. */
function bereken(b: Blok, els: Map<string, HTMLElement>, fig: HTMLElement): Meting {
  const fr = fig.getBoundingClientRect();
  const W = fr.width;
  const H = fr.height;
  const meet = (sleutel: string): Rect | null => {
    const el = els.get(sleutel);
    if (!el) return null;
    const r = el.getBoundingClientRect();
    return { l: r.left - fr.left, t: r.top - fr.top, r: r.right - fr.left, b: r.bottom - fr.top };
  };
  const ind = indeling(b);
  const gL = kantGeo(kantVan(b, "links"), "links", ind.links, meet, W);
  const gR = kantGeo(kantVan(b, "rechts"), "rechts", ind.rechts, meet, W);
  const uit: Meting = {
    w: r1(W),
    h: r1(H),
    paden: [],
    pillen: {},
    breuken: { links: breuken(gL), rechts: breuken(gR) },
    staarten: { ...staarten(gL, "links"), ...staarten(gR, "rechts") },
  };
  if (!gL || !gR) return uit;

  const rectVan = (g: KantGeo, id: string) => g.lagen.get(id) ?? g.zv.get(id)?.r ?? null;
  const kps = b.koppelingen ?? [];
  const geldig = kps.map((x, k) => ({ k, x })).filter(({ x }) => rectVan(gL, x.van) && rectVan(gR, x.naar));
  const dyL = spreiding(geldig, (x) => x.van, (x) => midY(rectVan(gR, x.naar)!));
  const dyR = spreiding(geldig, (x) => x.naar, (x) => midY(rectVan(gL, x.van)!));
  const aL = new Map<number, Anker>();
  const aR = new Map<number, Anker>();
  for (const { k, x } of geldig) {
    const a = anker(gL, x.van, dyL.get(k) ?? 0);
    const z = anker(gR, x.naar, dyR.get(k) ?? 0);
    if (a && z) {
      aL.set(k, a);
      aR.set(k, z);
    }
  }
  const ks = [...aL.keys()];
  const kanalen = (g: KantGeo, eigen: Map<number, Anker>, over: Map<number, Anker>) => {
    const alle = [...eigen.values()];
    const gekozen = new Map<number, number | null>();
    for (const k of ks) gekozen.set(k, kiesKanaal(g, eigen.get(k)!, over.get(k)!.y, alle));
    const gebruik = ks.flatMap((k) => {
      const gy = gekozen.get(k);
      return gy === null || gy === undefined ? [] : [{ k, a: eigen.get(k)!, gy }];
    });
    const off = baanOffsets(g, gebruik);
    return new Map(ks.map((k) => [k, route(g, eigen.get(k)!, gekozen.get(k) ?? null, off.get(k) ?? 0)]));
  };
  const routesL = kanalen(gL, aL, aR);
  const routesR = new Map(
    [...kanalen(gR, aR, aL)].map(([k, p]) => [k, p.map(([x, y]) => [W - x, y] as Pt)] as [number, Pt[]])
  );
  const laatste = (p: Pt[]) => p[p.length - 1];

  // labels: gemeten maat, hoogte gekozen tussen de twee uitgangen in
  const pilMaat = new Map<number, Rect>();
  for (const k of ks) {
    if (!(kps[k].label ?? "").trim()) continue;
    const r = meet("pil:" + k);
    if (r) pilMaat.set(k, r);
  }
  const pilY = schikPillen(
    [...pilMaat].map(([k, r]) => ({
      k,
      y: (laatste(routesL.get(k)!)[1] + laatste(routesR.get(k)!)[1]) / 2,
      h: r.b - r.t,
    })),
    H
  );
  const midden = meet("midden");

  const paden: Pad[] = ks.map((k) => {
    const links = routesL.get(k)!;
    const rechts = routesR.get(k)!;
    const [xL, yL] = laatste(links);
    const [xR, yR] = laatste(rechts);
    let d = polylijn(links, 8, true);
    const pil = pilMaat.get(k);
    const py = pilY.get(k);
    if (pil && py !== undefined) {
      const dx1 = Math.max(6, (pil.l - xL) / 2);
      const dx2 = Math.max(6, (xR - pil.r) / 2);
      d += ` C${getal(xL + dx1)} ${getal(yL)} ${getal(pil.l - dx1)} ${getal(py)} ${getal(pil.l)} ${getal(py)}`;
      d += ` M${getal(pil.r)} ${getal(py)} C${getal(pil.r + dx2)} ${getal(py)} ${getal(xR - dx2)} ${getal(yR)} ${getal(xR)} ${getal(yR)}`;
      uit.pillen[k] = r1(py - (pil.b - pil.t) / 2 - (midden ? midden.t : 0));
    } else {
      const dx = Math.max(6, (xR - xL) / 2);
      d += ` C${getal(xL + dx)} ${getal(yL)} ${getal(xR - dx)} ${getal(yR)} ${getal(xR)} ${getal(yR)}`;
    }
    d += polylijn([...rechts].reverse(), 8, false);
    return { k, soort: soortVan(kps[k]), d, start: [r1(links[0][0]), r1(links[0][1])] };
  });
  uit.paden = paden.sort((a, c) => TEKEN_VOLGORDE.indexOf(a.soort) - TEKEN_VOLGORDE.indexOf(c.soort) || a.k - c.k);
  return uit;
}

// ---------- weergave: lagen, zijvakken, kop ----------

type HoverProps = {
  tabIndex?: number;
  onMouseEnter?: () => void;
  onMouseLeave?: () => void;
  onFocus?: () => void;
  onBlur?: () => void;
};
type RefFn = (el: HTMLElement | null) => void;

function Kop({ k, kant, stijl }: { k: Kant; kant: KantNaam; stijl?: CSSProperties }) {
  const kop = (k.kop ?? "").trim();
  const sub = (k.sub ?? "").trim();
  if (!kop && !sub) return null;
  return (
    <div className={`mv-kop mv-kop-${kant}`} style={stijl}>
      {kop && <div className="mv-kop-t">{metBronlinks(kop)}</div>}
      {sub && <div className="mv-kop-sub">{metBronlinks(sub)}</div>}
    </div>
  );
}

/** Laag van een piramide: trapezium (bovenste: driehoek) in de laagkleur, naam en (toevoeging). */
function Band({
  l,
  i,
  n,
  kleur,
  ft,
  fb,
  s,
  klasse,
  stijl,
  hover,
  refFn,
}: {
  l: Laag;
  i: number;
  n: number;
  kleur: string;
  /** boven- en onderkant als deel van de piramidehoogte, en de breedteschaal */
  ft: number;
  fb: number;
  s: number;
  klasse?: string;
  stijl?: CSSProperties;
  hover?: HoverProps;
  refFn?: RefFn;
}) {
  const links = (f: number) => r1(50 - f * s * 50);
  const rechts = (f: number) => r1(50 + f * s * 50);
  const clip = `polygon(${links(ft)}% 0, ${rechts(ft)}% 0, ${rechts(fb)}% 100%, ${links(fb)}% 100%)`;
  // tekstbreedte: de breedte van de laag halverwege (vaste verhouding, zodat meten niet terugkoppelt)
  const breedte = `max(92px, calc(${r1(((i + 0.5) / Math.max(1, n)) * 100)}% - 14px))`;
  const sub = (l.sub ?? "").trim();
  const licht = isLicht(kleur);
  return (
    <div
      ref={refFn}
      // witte tekst op een donkere laag krijgt een eigen vlakje: waar de tekst buiten de
      // driehoek steekt, blijft hij leesbaar
      className={"mv-band" + (i === 0 ? " mv-band-top" : "") + (licht ? "" : " mv-band-donker") + (klasse ?? "")}
      style={{ ...stijl, "--mvk": kleur, "--mvt": licht ? "#1f2937" : "#fff" } as CSSProperties}
      {...hover}
    >
      <div className="mv-band-vorm" style={{ clipPath: clip }} />
      <div className="mv-band-tekst" style={{ width: breedte }}>
        <span className="mv-band-naam">{metBronlinks(laagNaam(l))}</span>
        {sub && <span className="mv-band-sub">({metBronlinks(sub)})</span>}
      </div>
    </div>
  );
}

function Pijl() {
  return (
    <svg className="mv-balk-pijl" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M7 12V2.5" />
      <path d="m2.5 6.5 4.5-4.5 4.5 4.5" />
    </svg>
  );
}

/** Laag van een keten: balk in de laagkleur, naam vet en de toevoeging eronder. */
function Balk({
  l,
  i,
  kleur,
  klasse,
  stijl,
  hover,
  refFn,
}: {
  l: Laag;
  i: number;
  kleur: string;
  klasse?: string;
  stijl?: CSSProperties;
  hover?: HoverProps;
  refFn?: RefFn;
}) {
  const sub = (l.sub ?? "").trim();
  return (
    <div
      ref={refFn}
      className={"mv-balk" + (klasse ?? "")}
      style={{ ...stijl, "--mvk": kleur, "--mvt": isLicht(kleur) ? "#0f172a" : "#fff" } as CSSProperties}
      {...hover}
    >
      {i > 0 && <Pijl />}
      <div className="mv-balk-naam">{metBronlinks(laagNaam(l))}</div>
      {sub && <div className="mv-balk-sub">{metBronlinks(sub)}</div>}
    </div>
  );
}

/** Zijvak: afgerond groen vak met de kop klein erboven en de items als korte lijst. */
function ZijvakVak({
  z,
  aan,
  klasse,
  stijl,
  hover,
  refFn,
  extra,
}: {
  z: Zijvak;
  /** kant waar het vak tegen de piramide aan ligt (daar geen rand en geen ronding) */
  aan?: Zij;
  klasse?: string;
  stijl?: CSSProperties;
  hover?: HoverProps;
  refFn?: RefFn;
  extra?: ReactNode;
}) {
  const kop = (z.kop ?? "").trim();
  const items = (z.items ?? []).map((x) => x.trim()).filter(Boolean);
  return (
    <div ref={refFn} className={"mv-zv" + (aan ? " mv-zv-aan-" + aan : "") + (klasse ?? "")} style={stijl} {...hover}>
      {kop && <div className="mv-zv-kop">{metBronlinks(kop)}</div>}
      {items.length > 0 && (
        // zonder kop zijn de items zelf de kop (vet), zoals "NPS · Conversie · Omzetgroei" op de plaat
        <ul className={"mv-zv-items" + (kop ? "" : " mv-zv-vet")}>
          {items.map((t, i) => (
            <li key={i}>{metBronlinks(t)}</li>
          ))}
        </ul>
      )}
      {extra}
    </div>
  );
}

/** Eén kant van de brede plaat: lagen en zijvakken op de gedeelde rijen (subgrid). */
function KantPlaat(p: {
  k: Kant;
  kant: KantNaam;
  ki: KantIndeling;
  R: number;
  meting: Meting | null;
  reg: (sleutel: string) => RefFn;
  hover: (sleutel: string) => HoverProps;
  klasse: (sleutel: string) => string;
}) {
  const { k, kant, ki } = p;
  const lagen = lagenVan(k);
  const n = lagen.length;
  const vorm = vormVan(k);
  const br = p.meting?.breuken[kant] ?? null;
  const s = br?.s ?? 1;
  const kol = lagenKolom(ki);
  return (
    <div
      ref={p.reg("kant:" + kant)}
      className={`mv-kant mv-kant-${kant} mv-vorm-${vorm}`}
      style={{ gridColumn: kant === "links" ? 1 : 3, gridRow: `2 / span ${p.R}`, gridTemplateColumns: kolomSjabloon(ki, vorm) }}
    >
      {lagen.map((l, i) => {
        const sleutel = kant + ":" + l.id;
        const stijl: CSSProperties = { gridRow: laagRij(ki, i), gridColumn: kol };
        const kleur = laagKleur(l.kleur, vorm, i);
        if (vorm === "piramide") {
          const [ft, fb] = br?.lagen[l.id] ?? [i / n, (i + 1) / n];
          return (
            <Band key={l.id} l={l} i={i} n={n} kleur={kleur} ft={ft} fb={fb} s={s} stijl={stijl} klasse={p.klasse(sleutel)} hover={p.hover(sleutel)} refFn={p.reg(sleutel)} />
          );
        }
        return <Balk key={l.id} l={l} i={i} kleur={kleur} stijl={stijl} klasse={p.klasse(sleutel)} hover={p.hover(sleutel)} refFn={p.reg(sleutel)} />;
      })}
      {zijvakkenVan(k).map((z) => {
        const plek = ki.zv.get(z.id);
        if (!plek) return null;
        const sleutel = kant + ":" + z.id;
        const rij = zijvakRij(ki, plek);
        const staart = heeftStaart(k, plek);
        const vak = (
          <ZijvakVak
            key={z.id}
            z={z}
            aan={staart ? (plek.zij === "links" ? "rechts" : "links") : undefined}
            stijl={{ gridRow: rij, gridColumn: zijvakKolom(ki, plek) }}
            klasse={p.klasse(sleutel)}
            hover={p.hover(sleutel)}
            refFn={p.reg(sleutel)}
          />
        );
        if (!staart) return vak;
        // staart: van de rand van de lagenkolom tot tegen de schuine rand (1 px eronder)
        const [ft, fb] = p.meting?.staarten[sleutel] ?? [plek.van / n, (plek.tot + 1) / n];
        const x = (f: number, richting: 1 | -1) => r1(50 + richting * f * s * 50);
        const clip =
          plek.zij === "links"
            ? `polygon(0 0, calc(${x(ft, -1)}% + 1px) 0, calc(${x(fb, -1)}% + 1px) 100%, 0 100%)`
            : `polygon(calc(${x(ft, 1)}% - 1px) 0, 100% 0, 100% 100%, calc(${x(fb, 1)}% - 1px) 100%)`;
        const h = p.hover(sleutel);
        return (
          <Fragment key={z.id}>
            {vak}
            <div
              className={"mv-staart" + p.klasse(sleutel)}
              style={{ gridRow: rij, gridColumn: kol, clipPath: clip }}
              aria-hidden="true"
              onMouseEnter={h.onMouseEnter}
              onMouseLeave={h.onMouseLeave}
            />
          </Fragment>
        );
      })}
    </div>
  );
}

/** Regel onder een element op een smal scherm: "→ in het DIN: <naam rechts> · <label>". */
function Regels({ b, id }: { b: Blok; id: string }) {
  const rechts = kantVan(b, "rechts");
  const lijst = (b.koppelingen ?? []).filter((x) => x.van === id && elementNaam(rechts, x.naar) !== null);
  if (lijst.length === 0) return null;
  return (
    <>
      {lijst.map((x, i) => {
        const label = (x.label ?? "").trim();
        return (
          <span key={i} className={`mv-regel mv-regel-${soortVan(x)}`}>
            → in het DIN: <b>{metBronlinks(elementNaam(rechts, x.naar) ?? "")}</b>
            {label && <> · {metBronlinks(label)}</>}
          </span>
        );
      })}
    </>
  );
}

/** Eén kant op een smal scherm: kop, de lagen, de regels per laag en de zijvakken eronder. */
function SmalKant({ b, kant }: { b: Blok; kant: KantNaam }) {
  const k = kantVan(b, kant);
  const lagen = lagenVan(k);
  const n = lagen.length;
  const vorm = vormVan(k);
  const regels = kant === "links";
  const rechts = kantVan(b, "rechts");
  const metKoppeling = new Set(
    (b.koppelingen ?? []).filter((x) => elementNaam(rechts, x.naar) !== null).map((x) => x.van)
  );
  const lagenMetRegel = regels ? lagen.filter((l) => metKoppeling.has(l.id)) : [];
  return (
    <section className="mv-s-kant">
      <Kop k={k} kant={kant} />
      {n > 0 && (
        <div className={"mv-s-fig mv-vorm-" + vorm}>
          {lagen.map((l, i) =>
            vorm === "piramide" ? (
              <Band key={l.id} l={l} i={i} n={n} kleur={laagKleur(l.kleur, vorm, i)} ft={i / n} fb={(i + 1) / n} s={1} />
            ) : (
              <Balk key={l.id} l={l} i={i} kleur={laagKleur(l.kleur, vorm, i)} />
            )
          )}
        </div>
      )}
      {lagenMetRegel.length > 0 && (
        <ul className="mv-regels">
          {lagenMetRegel.map((l) => (
            <li key={l.id} className="mv-regel-el">
              <span className="mv-regel-naam">
                <i className="mv-stip" style={{ background: laagKleur(l.kleur, vorm, lagen.indexOf(l)) }} aria-hidden="true" />
                {metBronlinks(laagLabel(l))}
              </span>
              <Regels b={b} id={l.id} />
            </li>
          ))}
        </ul>
      )}
      {zijvakkenVan(k).length > 0 && (
        <div className="mv-s-zvn">
          {zijvakkenVan(k).map((z) => {
            const naast = lagen.filter((l) => (z.bij ?? []).includes(l.id)).map(laagNaam);
            return (
              <ZijvakVak
                key={z.id}
                z={z}
                extra={
                  <>
                    {naast.length > 0 && <div className="mv-zv-bij">Naast {naast.join(" · ")}</div>}
                    {regels && <Regels b={b} id={z.id} />}
                  </>
                }
              />
            );
          })}
        </div>
      )}
    </section>
  );
}

function Legenda() {
  return (
    <div className="mv-legenda" aria-label="Legenda">
      {LEGENDA.map(({ soort, lijn }) => (
        <span key={soort} className="mv-leg">
          <svg width="34" height="10" viewBox="0 0 34 10" aria-hidden="true">
            <path className={`mv-lijn mv-lijn-${soort}`} d="M2 5H32" />
          </svg>
          <span>
            <b>{lijn}</b>: {SOORTEN[soort].uitleg}
          </span>
        </span>
      ))}
    </div>
  );
}

// ---------- bewerkmodus ----------
// Wijzigingen werken op de kopie die zet() aanreikt.

function zekereKant(m: Blok, kant: KantNaam): Kant {
  if (!m[kant]) m[kant] = { kop: "", sub: "", vorm: kant === "links" ? "piramide" : "keten", lagen: [], zijvakken: [] };
  const k = m[kant];
  k.lagen ??= [];
  k.zijvakken ??= [];
  return k;
}

function alleIds(m: Blok): Set<string> {
  const ids = new Set<string>();
  for (const kant of ["links", "rechts"] as const) {
    const k = kantVan(m, kant);
    for (const l of lagenVan(k)) ids.add(l.id);
    for (const z of zijvakkenVan(k)) ids.add(z.id);
  }
  return ids;
}

function uniekId(basis: string, bezet: ReadonlySet<string>): string {
  if (!bezet.has(basis)) return basis;
  for (let n = 2; ; n++) if (!bezet.has(`${basis}-${n}`)) return `${basis}-${n}`;
}

function verplaats<T>(lijst: T[], van: number, naar: number) {
  if (naar < 0 || naar >= lijst.length || van === naar) return;
  const [x] = lijst.splice(van, 1);
  lijst.splice(naar, 0, x);
}

/** Haalt de koppelingen weg die aan dit element (links: van, rechts: naar) vastzitten. */
function zonderKoppelingen(m: Blok, kant: KantNaam, id: string) {
  m.koppelingen = (m.koppelingen ?? []).filter((x) => (kant === "links" ? x.van : x.naar) !== id);
}

function voegLaagToe(m: Blok, kant: KantNaam) {
  const k = zekereKant(m, kant);
  k.lagen.push({
    id: uniekId(kant === "links" ? "l-laag" : "r-laag", alleIds(m)),
    naam: "Nieuwe laag",
    sub: "",
    kleur: laagKleur("", vormVan(k), k.lagen.length),
  });
}

/** Haalt een laag weg, met zijn koppelingen en zijn plek naast de zijvakken. */
function verwijderLaag(m: Blok, kant: KantNaam, i: number) {
  const k = zekereKant(m, kant);
  const id = k.lagen[i]?.id;
  k.lagen.splice(i, 1);
  if (id === undefined) return;
  for (const z of k.zijvakken) z.bij = (z.bij ?? []).filter((x) => x !== id);
  zonderKoppelingen(m, kant, id);
}

function voegZijvakToe(m: Blok, kant: KantNaam) {
  const k = zekereKant(m, kant);
  k.zijvakken.push({
    id: uniekId(kant === "links" ? "zl-vak" : "zr-vak", alleIds(m)),
    kop: "",
    items: ["Nieuw item"],
    bij: k.lagen[0] ? [k.lagen[0].id] : [],
    kant: "rechts",
  });
}

function verwijderZijvak(m: Blok, kant: KantNaam, i: number) {
  const k = zekereKant(m, kant);
  const id = k.zijvakken[i]?.id;
  k.zijvakken.splice(i, 1);
  if (id !== undefined) zonderKoppelingen(m, kant, id);
}

/** Vinkje "naast deze laag"; de volgorde van bij volgt die van de lagen. */
function zetBij(k: Kant, zi: number, laagId: string, aan: boolean) {
  const z = k.zijvakken[zi];
  if (!z) return;
  const nu = new Set(z.bij ?? []);
  if (aan) nu.add(laagId);
  else nu.delete(laagId);
  z.bij = lagenVan(k)
    .map((l) => l.id)
    .filter((id) => nu.has(id));
}

function voegKoppelingToe(m: Blok) {
  const eerste = (k: Kant) => lagenVan(k)[0]?.id ?? zijvakkenVan(k)[0]?.id ?? "";
  m.koppelingen ??= [];
  m.koppelingen.push({ van: eerste(kantVan(m, "links")), naar: eerste(kantVan(m, "rechts")), soort: "gelijk", label: "" });
}

function elementOpties(k: Kant): { waarde: string; label: string }[] {
  // een lange toevoeging (zoals bij de lagen van het DIN) past niet in een keuzelijst
  const kort = (l: Laag) => ((l.sub ?? "").trim().length <= 24 ? laagLabel(l) : laagNaam(l));
  return [
    ...lagenVan(k).map((l) => ({ waarde: l.id, label: "Laag: " + kort(l) })),
    ...zijvakkenVan(k).map((z) => ({ waarde: z.id, label: "Zijvak: " + zijvakNaam(z) })),
  ];
}

function KantBewerken({ b, kant, zet }: { b: Blok; kant: KantNaam; zet: Zet<Blok> }) {
  const k = kantVan(b, kant);
  const lagen = lagenVan(k);
  const vorm = vormVan(k);
  const opKant = (fn: (k: Kant) => void) => zet((m) => fn(zekereKant(m, kant)));
  return (
    <div className="mv-e-kant">
      <div className="mv-e-kop">{kant === "links" ? "Links: het model van de ander" : "Rechts: het DIN"}</div>
      <div className="mv-e-velden">
        <label className="mv-e-veld">
          <span className="mv-e-l">Kop</span>
          <V v={k.kop ?? ""} on={(x) => opKant((kk) => void (kk.kop = x))} edit ph="Bijv. Zo tekent 3sides het" />
        </label>
        <label className="mv-e-veld">
          <span className="mv-e-l">Onderregel</span>
          <V v={k.sub ?? ""} on={(x) => opKant((kk) => void (kk.sub = x))} edit ph="Bijv. plan van aanpak p. 2" />
        </label>
        <div className="mv-e-veld">
          <span className="mv-e-l">Vorm</span>
          <Keuze v={vorm} opties={VORM_OPTIES} on={(x) => opKant((kk) => void (kk.vorm = x))} titel="Vorm van deze kant" />
        </div>
      </div>

      <div className="mv-e-sub">Lagen, van boven naar onder</div>
      {lagen.map((l, i) => (
        <div key={l.id} className="mv-e-laag">
          <input
            type="color"
            className="mv-e-kleur"
            value={hex6(laagKleur(l.kleur, vorm, i))}
            title="Kleur van de laag"
            aria-label={`Kleur van ${laagNaam(l)}`}
            onChange={(e) => {
              const kleur = e.target.value;
              opKant((kk) => void (kk.lagen[i].kleur = kleur));
            }}
          />
          <V v={l.naam ?? ""} on={(x) => opKant((kk) => void (kk.lagen[i].naam = x))} edit cls="mv-e-in" ph="Naam, bijv. Baten" />
          <V v={l.sub ?? ""} on={(x) => opKant((kk) => void (kk.lagen[i].sub = x))} edit cls="mv-e-in mv-e-in-breed" ph="Toevoeging, bijv. Effect" />
          <div className="mv-e-knoppen">
            <button type="button" className="ok-knopje" title="Laag omhoog" aria-label="Laag omhoog" disabled={i === 0} onClick={() => opKant((kk) => verplaats(kk.lagen, i, i - 1))}>
              ↑
            </button>
            <button type="button" className="ok-knopje" title="Laag omlaag" aria-label="Laag omlaag" disabled={i === lagen.length - 1} onClick={() => opKant((kk) => verplaats(kk.lagen, i, i + 1))}>
              ↓
            </button>
            <WegKnop titel="Laag verwijderen" on={() => zet((m) => verwijderLaag(m, kant, i))} />
          </div>
        </div>
      ))}
      <div>
        <PlusKnop label="+ laag" on={() => zet((m) => voegLaagToe(m, kant))} />
      </div>

      <div className="mv-e-sub">Zijvakken naast de lagen</div>
      {zijvakkenVan(k).map((z, zi) => (
        <div key={z.id} className="mv-e-zv">
          <div className="mv-e-rij">
            <V v={z.kop ?? ""} on={(x) => opKant((kk) => void (kk.zijvakken[zi].kop = x))} edit cls="mv-e-in" ph="Kop (optioneel)" />
            <Keuze v={zijVan(z)} opties={ZIJ_OPTIES} on={(x) => opKant((kk) => void (kk.zijvakken[zi].kant = x))} titel="Kant van het zijvak" />
            <WegKnop titel="Zijvak verwijderen" on={() => zet((m) => verwijderZijvak(m, kant, zi))} />
          </div>
          {lagen.length > 0 && (
            <div className="mv-e-vinken">
              <span className="mv-e-l">Naast</span>
              {lagen.map((l) => (
                <label key={l.id} className="mv-e-vink">
                  <input
                    type="checkbox"
                    checked={(z.bij ?? []).includes(l.id)}
                    onChange={(e) => {
                      const aan = e.target.checked;
                      opKant((kk) => zetBij(kk, zi, l.id, aan));
                    }}
                  />
                  {laagNaam(l)}
                </label>
              ))}
            </div>
          )}
          <Lijst items={z.items ?? []} edit ml={false} on={(items) => opKant((kk) => void (kk.zijvakken[zi].items = items))} />
        </div>
      ))}
      <div>
        <PlusKnop label="+ zijvak" on={() => zet((m) => voegZijvakToe(m, kant))} />
      </div>
    </div>
  );
}

function KoppelingenBewerken({ b, zet }: { b: Blok; zet: Zet<Blok> }) {
  const opties = (kant: KantNaam, id: string) => {
    const basis = elementOpties(kantVan(b, kant));
    return basis.some((o) => o.waarde === id) ? basis : [{ waarde: id, label: id ? "(onbekend) " + id : "— kies —" }, ...basis];
  };
  return (
    <div className="mv-e-kant">
      <div className="mv-e-kop">Koppelingen: van links naar rechts</div>
      {(b.koppelingen ?? []).map((x, i) => (
        <div key={i} className="mv-e-kp">
          <Keuze v={x.van} opties={opties("links", x.van)} on={(v) => zet((m) => void (m.koppelingen[i].van = v))} titel="Van (links)" />
          <span className="mv-e-pijl" aria-hidden="true">
            →
          </span>
          <Keuze v={x.naar} opties={opties("rechts", x.naar)} on={(v) => zet((m) => void (m.koppelingen[i].naar = v))} titel="Naar (rechts)" />
          <Keuze v={soortVan(x)} opties={SOORT_OPTIES} on={(v) => zet((m) => void (m.koppelingen[i].soort = v))} titel="Soort lijn" />
          <V v={x.label ?? ""} on={(v) => zet((m) => void (m.koppelingen[i].label = v))} edit cls="mv-e-in mv-e-label" ph="Label op de lijn (kort)" />
          <WegKnop titel="Koppeling verwijderen" on={() => zet((m) => void m.koppelingen.splice(i, 1))} />
        </div>
      ))}
      <div>
        <PlusKnop label="+ koppeling" on={() => zet(voegKoppelingToe)} />
      </div>
    </div>
  );
}

// ---------- het blok ----------

export default function ModelVergelijkingBlok({ b, edit, zet }: LosBlokProps<"modelvergelijking">) {
  const plaatRef = useRef<HTMLDivElement>(null);
  const figRef = useRef<HTMLDivElement>(null);
  const els = useRef(new Map<string, HTMLElement>());
  const [smal, setSmal] = useState(false);
  const [meting, setMeting] = useState<Meting | null>(null);
  const [actief, setActief] = useState<string | null>(null);
  const uid = "mv" + useId().replace(/[^a-zA-Z0-9_-]/g, "");

  // Meet na elke render de plaat en trek de lijnen; opnieuw bij een andere grootte.
  useLayoutEffect(() => {
    const plaat = plaatRef.current;
    if (!plaat) return;
    const meet = () => {
      const smalNu = plaat.clientWidth < SMAL;
      if (smalNu !== smal) {
        setSmal(smalNu);
        return;
      }
      const fig = figRef.current;
      if (smalNu || !fig) return;
      const m = bereken(b, els.current, fig);
      setMeting((oud) => (oud && JSON.stringify(oud) === JSON.stringify(m) ? oud : m));
    };
    meet();
    const ro = new ResizeObserver(() => meet());
    ro.observe(plaat);
    if (figRef.current) ro.observe(figRef.current);
    return () => ro.disconnect();
  }, [b, edit, smal]);

  const L = kantVan(b, "links");
  const R = kantVan(b, "rechts");
  const kps = b.koppelingen ?? [];
  if (!edit && lagenVan(L).length === 0 && lagenVan(R).length === 0 && !b.titel) return null;

  const ind = indeling(b);
  const reg =
    (sleutel: string): RefFn =>
    (el) => {
      if (el) els.current.set(sleutel, el);
      else els.current.delete(sleutel);
    };

  // welke koppelingen getekend kunnen worden, en wat oplicht bij hover of focus
  const geldig = kps.map((x) => elementNaam(L, x.van) !== null && elementNaam(R, x.naar) !== null);
  const verbonden = new Set<string>();
  kps.forEach((x, k) => {
    if (!geldig[k]) return;
    verbonden.add("links:" + x.van);
    verbonden.add("rechts:" + x.naar);
  });
  const lijnen = new Set<number>();
  const licht = new Set<string>();
  if (actief)
    kps.forEach((x, k) => {
      if (!geldig[k]) return;
      if (actief === "pil:" + k || actief === "links:" + x.van || actief === "rechts:" + x.naar) {
        lijnen.add(k);
        licht.add("links:" + x.van);
        licht.add("rechts:" + x.naar);
      }
    });
  const klasse = (s: string) => (!actief ? "" : actief === s ? " mv-actief" : licht.has(s) ? " mv-licht" : " mv-dim");
  const hover = (s: string): HoverProps =>
    verbonden.has(s)
      ? {
          tabIndex: 0,
          onMouseEnter: () => setActief(s),
          onMouseLeave: () => setActief((a) => (a === s ? null : a)),
          onFocus: () => setActief(s),
          onBlur: () => setActief((a) => (a === s ? null : a)),
        }
      : {};

  const figuur = (
    <div
      ref={figRef}
      className="mv-fig"
      style={{ gridTemplateColumns: figKolommen(b, ind), gridTemplateRows: `auto repeat(${ind.R}, auto)` }}
    >
      <Kop k={L} kant="links" stijl={{ gridColumn: 1 }} />
      <Kop k={R} kant="rechts" stijl={{ gridColumn: 3 }} />
      <KantPlaat k={L} kant="links" ki={ind.links} R={ind.R} meting={meting} reg={reg} hover={hover} klasse={klasse} />
      <div ref={reg("midden")} className="mv-midden" style={{ gridRow: `2 / span ${ind.R}` }}>
        {kps.map((x, k) => {
          const label = (x.label ?? "").trim();
          if (!geldig[k] || !label) return null;
          const s = "pil:" + k;
          return (
            <div
              key={k}
              ref={reg(s)}
              className={`mv-pil mv-pil-${soortVan(x)}` + (!actief ? "" : actief === s ? " mv-actief" : lijnen.has(k) ? " mv-licht" : " mv-dim")}
              style={{ top: meting?.pillen[k] ?? 0 }}
              onMouseEnter={() => setActief(s)}
              onMouseLeave={() => setActief((a) => (a === s ? null : a))}
            >
              {metBronlinks(label)}
            </div>
          );
        })}
      </div>
      <KantPlaat k={R} kant="rechts" ki={ind.rechts} R={ind.R} meting={meting} reg={reg} hover={hover} klasse={klasse} />
      {meting && meting.paden.length > 0 && (
        <svg className="mv-svg" width={meting.w} height={meting.h} viewBox={`0 0 ${meting.w} ${meting.h}`} aria-hidden="true">
          <defs>
            {LEGENDA.map(({ soort }) => (
              <marker
                key={soort}
                id={`${uid}-${soort}`}
                viewBox="0 0 10 10"
                refX="9"
                refY="5"
                markerWidth={soort === "verschuift" ? 11 : 9}
                markerHeight={soort === "verschuift" ? 11 : 9}
                markerUnits="userSpaceOnUse"
                orient="auto"
              >
                <path d="M0 0.8 L10 5 L0 9.2 z" fill={SOORTEN[soort].kleur} />
              </marker>
            ))}
          </defs>
          {meting.paden.map((p) => (
            <g key={p.k} className={"mv-g" + (!actief ? "" : lijnen.has(p.k) ? " mv-g-licht" : " mv-g-dim")}>
              <path className={`mv-halo mv-halo-${p.soort}`} d={p.d} />
              <path className={`mv-lijn mv-lijn-${p.soort}`} d={p.d} markerEnd={`url(#${uid}-${p.soort})`} />
              <circle className="mv-poort" cx={p.start[0]} cy={p.start[1]} r={3.4} fill={SOORTEN[p.soort].kleur} />
            </g>
          ))}
        </svg>
      )}
    </div>
  );

  return (
    <div className={"mv-blok" + (smal ? " mv-smal" : "")}>
      {(edit || b.titel) && (
        <h4 className="mv-titel">
          <V v={b.titel ?? ""} on={(x) => zet((m) => void (m.titel = x))} edit={edit} ph="Titel van de modelvergelijking (optioneel)" />
        </h4>
      )}

      <div ref={plaatRef} className="mv-plaat">
        {smal ? (
          <div className="mv-stapel">
            <SmalKant b={b} kant="links" />
            <SmalKant b={b} kant="rechts" />
          </div>
        ) : (
          figuur
        )}
      </div>

      {kps.length > 0 && <Legenda />}
      {(edit || b.voet) && (
        <div className="ok-legend mv-voet">
          <V v={b.voet ?? ""} on={(x) => zet((m) => void (m.voet = x))} edit={edit} ml ph="Voettekst (optioneel)" />
        </div>
      )}

      {edit && (
        <div className="mv-e">
          <div className="mv-e-kanten">
            <KantBewerken b={b} kant="links" zet={zet} />
            <KantBewerken b={b} kant="rechts" zet={zet} />
          </div>
          <KoppelingenBewerken b={b} zet={zet} />
        </div>
      )}
    </div>
  );
}

// Stijl; altijd binnen het document (.ok .okd), dus met de variabelen daarvan
// (--cito, --ink, --ink2, --ink3). --mvk = kleur van een laag, --mvt = tekstkleur erop.
// De plaat (.mv-fig) is een raster links · midden · rechts; beide kanten zijn een subgrid op
// dezelfde rijen. De SVG met de lijnen ligt over de plaat (absoluut, zonder muisinteractie);
// de labels staan daarboven in de middenzone.
export const MODELVERGELIJKING_CSS = `
.okd .mv-blok{background:#fff;border:1px solid #e2e8f0;border-radius:12px;padding:14px 16px 12px}
.okd .mv-titel{font-size:12.5px;font-weight:700;color:var(--ink);margin:0 0 12px}
.okd .mv-plaat{position:relative;min-width:0}
.okd .mv-fig{position:relative;isolation:isolate;display:grid;row-gap:3px;column-gap:0;padding-bottom:22px}
.okd .mv-kop{grid-row:1;align-self:end;display:flex;flex-direction:column;gap:2px;min-width:0;padding:0 2px 6px;border-bottom:2px solid #e2e8f0;margin-bottom:16px}
.okd .mv-kop-rechts{border-bottom-color:var(--cito)}
.okd .mv-kop-t{font-size:11px;font-weight:800;text-transform:uppercase;letter-spacing:.07em;line-height:1.3;color:var(--ink)}
.okd .mv-kop-rechts .mv-kop-t{color:var(--cito)}
.okd .mv-kop-sub{font-size:10.5px;line-height:1.4;color:var(--ink3)}
.okd .mv-kant{display:grid;grid-template-rows:subgrid;column-gap:0;min-width:0;position:relative}
.okd .mv-vorm-keten{column-gap:12px}
.okd .mv-midden{grid-column:2;position:relative;z-index:4;min-width:0;pointer-events:none}
.okd .mv-svg{position:absolute;left:0;top:0;z-index:3;pointer-events:none;overflow:visible}

.okd .mv-band{position:relative;z-index:1;min-height:70px;display:flex;flex-direction:column;align-items:center;justify-content:center;pointer-events:none;outline:none}
.okd .mv-band-top{justify-content:flex-end}
.okd .mv-band-vorm{position:absolute;inset:0;background:var(--mvk);pointer-events:auto;transition:opacity .15s,filter .15s}
.okd .mv-band-tekst{position:relative;display:flex;flex-direction:column;align-items:center;text-align:center;padding:6px 0;color:var(--mvt);overflow-wrap:normal;word-break:normal;pointer-events:auto;transition:opacity .15s}
.okd .mv-band-top .mv-band-tekst{padding-bottom:7px}
.okd .mv-band-donker .mv-band-tekst{background:var(--mvk);border-radius:8px;padding:4px 8px;margin:4px 0}
.okd .mv-band-naam{font-size:15px;font-weight:600;line-height:1.2;letter-spacing:-.005em}
.okd .mv-band-sub{font-size:12.5px;line-height:1.3;margin-top:1px;opacity:.9}
.okd .mv-band.mv-actief .mv-band-vorm,.okd .mv-band.mv-licht .mv-band-vorm{filter:saturate(1.45) brightness(.94)}
.okd .mv-band.mv-actief .mv-band-naam{text-decoration:underline;text-decoration-thickness:2px;text-underline-offset:3px}
.okd .mv-band.mv-dim .mv-band-vorm,.okd .mv-band.mv-dim .mv-band-tekst{opacity:.35}

.okd .mv-staart{position:relative;z-index:0;margin:3px 0;background:${ZV_VULLING};border-top:1px solid ${ZV_RAND};border-bottom:1px solid ${ZV_RAND};transition:opacity .15s,background .15s}
.okd .mv-zv{position:relative;z-index:2;margin:3px 0;min-width:0;display:flex;flex-direction:column;justify-content:center;gap:3px;background:${ZV_VULLING};border:1px solid ${ZV_RAND};border-radius:12px;padding:7px 10px;outline:none;transition:opacity .15s,background .15s,border-color .15s}
.okd .mv-zv-aan-rechts{border-right:0;border-top-right-radius:0;border-bottom-right-radius:0}
.okd .mv-zv-aan-links{border-left:0;border-top-left-radius:0;border-bottom-left-radius:0}
.okd .mv-zv-kop{font-size:9px;font-weight:800;text-transform:uppercase;letter-spacing:.06em;line-height:1.35;color:#047857}
.okd .mv-zv-items{list-style:none;margin:0;padding:0;display:flex;flex-direction:column;gap:1px}
.okd .mv-zv-items li{font-size:11.5px;line-height:1.35;color:#1f2937;overflow-wrap:normal}
.okd .mv-zv-vet li{font-weight:700}
.okd .mv-zv.mv-actief,.okd .mv-zv.mv-licht,.okd .mv-staart.mv-actief,.okd .mv-staart.mv-licht{background:#c6f1da;border-color:#34d399}
.okd .mv-zv.mv-actief{box-shadow:0 0 0 2px #6ee7b7}
.okd .mv-zv.mv-dim,.okd .mv-staart.mv-dim{opacity:.4}

.okd .mv-balk{position:relative;z-index:1;margin:7px 0;min-width:0;display:flex;flex-direction:column;justify-content:center;gap:2px;border-radius:10px;padding:8px 12px;background:var(--mvk);color:var(--mvt);outline:none;transition:opacity .15s,box-shadow .15s}
.okd .mv-balk-naam{font-size:13.5px;font-weight:700;line-height:1.25}
.okd .mv-balk-sub{font-size:11.5px;line-height:1.4;opacity:.92}
.okd .mv-balk-pijl{position:absolute;left:50%;top:-15px;width:13px;height:13px;margin-left:-6.5px;color:#5f6b7a;pointer-events:none}
.okd .mv-balk.mv-actief,.okd .mv-balk.mv-licht{box-shadow:0 0 0 3px color-mix(in srgb,var(--mvk) 32%,#fff)}
.okd .mv-balk.mv-dim{opacity:.4}
.okd .mv-band:focus-visible .mv-band-naam,.okd .mv-balk:focus-visible .mv-balk-naam,.okd .mv-zv:focus-visible .mv-zv-kop{text-decoration:underline}

.okd .mv-pil{position:absolute;left:50%;transform:translateX(-50%);width:max-content;max-width:max(112px,calc(100% - 56px));box-sizing:border-box;font-size:12px;line-height:1.3;text-align:center;border:1.5px solid;border-radius:9px;padding:3px 9px 4px;pointer-events:auto;transition:opacity .15s,box-shadow .15s}
.okd .mv-pil-gelijk{color:#475569;background:#f8fafc;border-color:#94a3b8}
.okd .mv-pil-verschuift{color:#92400e;background:#fffbeb;border-color:#d97706;border-style:dashed;font-weight:700}
.okd .mv-pil-voorstel{color:#003366;background:#eef4fb;border-color:#003366;border-style:dotted;font-weight:600}
.okd .mv-pil.mv-actief,.okd .mv-pil.mv-licht{box-shadow:0 0 0 3px rgba(148,163,184,.35)}
.okd .mv-pil-verschuift.mv-actief,.okd .mv-pil-verschuift.mv-licht{box-shadow:0 0 0 3px rgba(217,119,6,.25)}
.okd .mv-pil-voorstel.mv-actief,.okd .mv-pil-voorstel.mv-licht{box-shadow:0 0 0 3px rgba(0,51,102,.18)}
.okd .mv-pil.mv-dim{opacity:.3}

.okd .mv-halo{fill:none;stroke:#fff;stroke-linecap:round;stroke-linejoin:round;stroke-opacity:.95}
.okd .mv-halo-gelijk{stroke-width:5.5}
.okd .mv-halo-verschuift{stroke-width:7}
.okd .mv-halo-voorstel{stroke-width:6}
.okd .mv-lijn{fill:none;stroke-linejoin:round}
.okd .mv-lijn-gelijk{stroke:#64748b;stroke-width:1.75;stroke-linecap:round}
.okd .mv-lijn-verschuift{stroke:#d97706;stroke-width:3;stroke-dasharray:8 5}
.okd .mv-lijn-voorstel{stroke:#003366;stroke-width:2.3;stroke-dasharray:.1 5.4;stroke-linecap:round}
.okd .mv-poort{stroke:#fff;stroke-width:1.5}
.okd .mv-g{transition:opacity .15s}
.okd .mv-g-dim{opacity:.1}
.okd .mv-g-licht .mv-lijn-gelijk{stroke-width:2.6}
.okd .mv-g-licht .mv-lijn-voorstel{stroke-width:3}
.okd .mv-g-licht .mv-lijn-verschuift{stroke-width:3.6}

.okd .mv-legenda{display:flex;flex-wrap:wrap;align-items:center;gap:4px 18px;margin-top:8px;font-size:10.5px;line-height:1.45;color:var(--ink2)}
.okd .mv-leg{display:inline-flex;align-items:center;gap:6px}
.okd .mv-leg svg{flex:none;overflow:visible}
.okd .mv-leg b{font-weight:700;color:var(--ink)}
.okd .mv-voet{margin-top:6px}

.okd .mv-stapel{display:flex;flex-direction:column;gap:22px}
.okd .mv-s-kant{display:flex;flex-direction:column;gap:10px;min-width:0}
.okd .mv-s-kant .mv-kop{align-self:stretch;margin-bottom:0}
.okd .mv-s-fig{display:flex;flex-direction:column;gap:3px;width:100%;max-width:380px;margin:0 auto}
.okd .mv-s-fig .mv-band{min-height:62px}
.okd .mv-s-fig .mv-band-naam{font-size:14px}
.okd .mv-s-fig .mv-band-sub{font-size:12px}
.okd .mv-s-fig.mv-vorm-keten{gap:14px}
.okd .mv-s-fig .mv-balk{margin:0}
.okd .mv-s-fig .mv-balk-pijl{top:-14px}
.okd .mv-s-zvn{display:grid;grid-template-columns:repeat(auto-fill,minmax(min(210px,100%),1fr));gap:8px}
.okd .mv-s-zvn .mv-zv{margin:0}
.okd .mv-zv-bij{font-size:10px;line-height:1.4;color:#047857;margin-top:3px}
.okd .mv-regels{list-style:none;margin:0;padding:0;display:flex;flex-direction:column;gap:8px}
.okd .mv-regel-el{display:flex;flex-direction:column;gap:1px;min-width:0}
.okd .mv-regel-naam{display:flex;align-items:center;gap:6px;font-size:12px;font-weight:700;line-height:1.35;color:var(--ink)}
.okd .mv-stip{flex:none;width:10px;height:10px;border-radius:3px;border:1px solid rgba(15,23,42,.18)}
.okd .mv-regel{display:block;font-size:12px;line-height:1.4;padding-left:16px}
.okd .mv-zv .mv-regel{padding-left:0;margin-top:2px}
.okd .mv-regel b{font-weight:700}
.okd .mv-regel-gelijk{color:#475569}
.okd .mv-regel-verschuift{color:#92400e;font-weight:600}
.okd .mv-regel-voorstel{color:#003366}

.okd .mv-e{margin-top:14px;padding:10px 12px;border:1px dashed #cbd5e1;border-radius:10px;background:#fafbfc;display:flex;flex-direction:column;gap:14px}
.okd .mv-e-kanten{display:grid;grid-template-columns:repeat(auto-fit,minmax(min(320px,100%),1fr));gap:14px}
.okd .mv-e-kant{display:flex;flex-direction:column;gap:6px;min-width:0}
.okd .mv-e-kop{font-size:9.5px;font-weight:800;text-transform:uppercase;letter-spacing:.07em;color:var(--ink2)}
.okd .mv-e-sub{font-size:9px;font-weight:800;text-transform:uppercase;letter-spacing:.06em;color:var(--ink3);margin-top:4px}
.okd .mv-e-velden{display:grid;grid-template-columns:repeat(auto-fit,minmax(min(150px,100%),1fr));gap:6px}
.okd .mv-e-veld{display:flex;flex-direction:column;gap:2px;min-width:0}
.okd .mv-e-l{font-size:8.5px;font-weight:800;text-transform:uppercase;letter-spacing:.07em;color:var(--ink3)}
.okd .mv-e .ok-in{font-size:12px;margin:0;width:100%}
.okd .mv-e-laag,.okd .mv-e-rij,.okd .mv-e-kp{display:flex;flex-wrap:wrap;align-items:flex-start;gap:5px}
.okd .mv-e-laag{padding-bottom:5px;border-bottom:1px dashed #e2e8f0}
.okd .mv-e .mv-e-in{flex:1 1 110px;width:auto;min-width:0}
.okd .mv-e .mv-e-in-breed{flex-basis:150px}
.okd .mv-e .mv-e-label{flex:2 1 170px}
.okd .mv-e-kleur{flex:none;width:28px;height:26px;padding:0;border:1px solid rgba(15,42,63,.25);border-radius:5px;background:none;cursor:pointer}
.okd .mv-e-knoppen{display:flex;gap:3px;padding-top:2px}
.okd .mv-e-knoppen .ok-knopje{min-width:22px;padding:0 5px;text-align:center}
.okd .mv-e-knoppen .ok-knopje:disabled{opacity:.3;cursor:default;background:#fff}
.okd .mv-e-zv{display:flex;flex-direction:column;gap:6px;border:1px solid ${ZV_RAND};background:#f3fcf7;border-radius:9px;padding:7px 8px}
.okd .mv-e-vinken{display:flex;flex-wrap:wrap;align-items:center;gap:4px 6px}
.okd .mv-e-vink{display:inline-flex;align-items:center;gap:5px;font-size:10.5px;font-weight:600;line-height:1.5;color:#334155;background:#fff;border:1px solid #cbd5e1;border-radius:999px;padding:1px 9px 1px 6px;cursor:pointer}
.okd .mv-e-vink input{margin:0;accent-color:#059669;cursor:pointer}
.okd .mv-e-vink:has(input:checked){background:#ecfdf5;border-color:#34d399;color:#065f46}
.okd .mv-e .ok-keuze{font-size:11px;padding:2px 4px;width:auto;min-width:0;max-width:100%}
.okd .mv-e-veld .ok-keuze{width:100%}
.okd .mv-e-rij .ok-keuze{flex:none}
.okd .mv-e-kp .ok-keuze{flex:1 1 150px;width:auto}
.okd .mv-e-kp{padding:6px 0;border-top:1px dashed #e2e8f0}
.okd .mv-e-pijl{font-weight:800;color:var(--cito);padding-top:3px}
`;
