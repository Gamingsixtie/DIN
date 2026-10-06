// Word-export van de evaluatie (evaluatie-word.ts): het rekenwerk van de app, zodat de
// export dezelfde uitkomst geeft als het scherm.
//
// GEÏMPORTEERD uit de app (daar geëxporteerd, hier ongewijzigd gebruikt):
//   tijdlijnRijen, maandDatum, voortgangSoort   (blokken/TijdlijnBlok.tsx)
//   nodigGroepen, NODIG_GROEPEN, citoTekst      (blokken/VoortgangsbordBlok.tsx)
//   DOMEINEN, domein                            (blok-typen.ts)
//   splitsLeads                                 (leads.tsx)
//   vindVerwijzingen                            (bron-context.tsx)
//
// OVERGENOMEN uit de app (daar niet geëxporteerd; de logica is hier getrouw gekopieerd,
// zonder React). Verandert de app, pas dan ook deze kopie aan:
//   uit blokken/VoortgangsbordBlok.tsx:  berekenStand, telOp, legeTelling, voortgangPct,
//       opSchema, procent, maandLabel, dag00, plusDagen, ddmmjjjj, HORIZON_DAGEN, kleurVan
//   uit blokken/TijdlijnBlok.tsx:        celVan, jaarIndeling, planVan, statusSoort,
//       standlijn (met laatsteDag en ddmm), balkKleur
//   uit blokken/WerkstroomKaartenBlok.tsx: onderdelenPerAnker, maandBereik, jaarPerMaand,
//       isStart, splitsSchakel, niveauKleur, accentKleur, isLink, isJira
//   uit BewerkbaarDocument.tsx:          chipSoort, NUMMER_REGEL
//   uit blokken/EvaluatieBlok.tsx:       beeldSoort, splitsBeeld (met alsZin en hoofdletter),
//       splitsBron (met BRONWOORD), alineas (met LABEL, GENUMMERD, KOP_VOORAAN en
//       OORDEEL_VOORAAN), en de namen van de oordelen (OORDELEN); gelijkgetrokken op 05-10-2026
//
// De afdrukweergave (src/app/sessies/[id]/evaluatie-afdruk/EvaluatieKaders.tsx) gebruikt dezelfde
// kopie voor de evaluatie (beeldSoort, splitsBeeld, splitsBron, alineas, oordeelNaam), zodat Word
// en PDF hetzelfde tonen.

import { DOMEINEN, domein } from "@/components/bewerkbaar/blok-typen";
import type { BlokVan } from "@/components/bewerkbaar/blok-typen";
import { maandDatum, tijdlijnRijen, voortgangSoort } from "@/components/bewerkbaar/blokken/TijdlijnBlok";
import type { TijdlijnRij, VoortgangSoort } from "@/components/bewerkbaar/blokken/TijdlijnBlok";
import { vindVerwijzingen } from "@/components/bewerkbaar/bron-context";

export type Tijdlijn = BlokVan<"tijdlijn">;
export type Bord = BlokVan<"voortgangsbord">;
export type Kaart = BlokVan<"werkstromen">["kaarten"][number];
export type Domein = { id: string; label: string; kleur: string };

const CITO = "#003366";

function tekst(v: string | undefined): string {
  return typeof v === "string" ? v : "";
}

// ---------- uit TijdlijnBlok.tsx ----------

export type Cel = "" | "start" | "loopt" | "oplevering";
type Jaar = { label: string; van: number; aantal: number };
type Loop = { van: number; tot: number };
export type Plan = {
  eerste: number;
  laatste: number;
  lopen: Loop[];
  starts: number[];
  opleveringen: number[];
  startGemarkeerd: boolean;
  looptAl: boolean;
  eind: "oplevering" | "door" | "open";
};
export type StatusSoort = "plus" | "plusmin" | "min" | "leeg" | "anders";
export type Stand = { frac: number; idx: number; label: string; vandaag: boolean };

const CEL_ALIAS = new Map<string, Cel>([
  ["start", "start"],
  ["▶", "start"],
  ["loopt", "loopt"],
  ["⟳", "loopt"],
  ["oplevering", "oplevering"],
  ["delivery", "oplevering"],
  ["⚑", "oplevering"],
]);

export function celVan(v: string | undefined): Cel {
  return CEL_ALIAS.get(tekst(v).replace(/[︎️]/g, "").trim().toLowerCase()) ?? "";
}

export function jaarIndeling(jaren: Tijdlijn["jaren"], n: number): Jaar[] {
  const uit: Jaar[] = [];
  let van = 0;
  for (const j of jaren ?? []) {
    if (van >= n) break;
    const aantal = Math.min(Math.max(0, Math.floor(j.maanden)), n - van);
    if (aantal === 0) continue;
    uit.push({ label: tekst(j.label), van, aantal });
    van += aantal;
  }
  return uit;
}

export function planVan(cellen: Cel[]): Plan | null {
  const eerste = cellen.findIndex((c) => c !== "");
  if (eerste < 0) return null;
  let laatste = cellen.length - 1;
  while (cellen[laatste] === "") laatste--;
  const lopen: Loop[] = [];
  for (let i = eerste; i <= laatste; i++) {
    if (cellen[i] === "") continue;
    const vorige = lopen[lopen.length - 1];
    if (vorige && vorige.tot === i - 1) vorige.tot = i;
    else lopen.push({ van: i, tot: i });
  }
  const bij = (soort: Cel) => cellen.flatMap((c, i) => (c === soort ? [i] : []));
  return {
    eerste,
    laatste,
    lopen,
    starts: bij("start"),
    opleveringen: bij("oplevering"),
    startGemarkeerd: cellen[eerste] === "start",
    looptAl: cellen[eerste] === "loopt",
    eind: cellen[laatste] === "oplevering" ? "oplevering" : laatste === cellen.length - 1 ? "door" : "open",
  };
}

export function statusSoort(s: string): StatusSoort {
  const t = s.replace(/[−–—]/g, "-").replace(/\s+/g, "").toLowerCase();
  if (t === "" || t === "geen") return "leeg";
  if (t === "+") return "plus";
  if (t === "+/-" || t === "+-" || t === "±") return "plusmin";
  if (t === "-") return "min";
  return "anders";
}

/** Laatste dag van de maand waarin `d` valt (lokale tijd, 00:00). */
function laatsteDag(d: Date): Date {
  return new Date(d.getFullYear(), d.getMonth() + 1, 0);
}

function ddmm(d: Date): string {
  const p = (x: number) => String(x).padStart(2, "0");
  return `${p(d.getDate())}-${p(d.getMonth() + 1)}`;
}

/**
 * Waar de standlijn staat. `nu` leeg of "vandaag": de dag van vandaag; een maandlabel: de
 * rechterrand van die maand, met `nuLabel`; "geen": geen lijn.
 */
export function standlijn(b: Tijdlijn, maanden: string[], n: number, vandaag: Date): Stand | null {
  const sleutel = tekst(b.nu).trim().toLowerCase();
  if (n === 0 || sleutel === "geen") return null;
  if (sleutel !== "" && sleutel !== "vandaag") {
    const idx = maanden.findIndex((m) => m.trim().toLowerCase() === sleutel);
    if (idx < 0) return null;
    return { frac: (idx + 1) / n, idx, label: tekst(b.nuLabel).trim(), vandaag: false };
  }
  const label = "vandaag " + ddmm(vandaag);
  const dag = new Date(vandaag.getFullYear(), vandaag.getMonth(), vandaag.getDate());
  const datums = maanden.map((_, i) => maandDatum(b, i));
  const idx = datums.findIndex((d) => !Number.isNaN(d.getTime()) && d.getFullYear() === dag.getFullYear() && d.getMonth() === dag.getMonth());
  if (idx >= 0) {
    const dagen = laatsteDag(dag).getDate();
    return { frac: (idx + dag.getDate() / dagen) / n, idx, label, vandaag: true };
  }
  const geldig = datums.filter((d) => !Number.isNaN(d.getTime()));
  if (geldig.length === 0) return null;
  return dag < geldig[0] ? { frac: 0, idx: -1, label, vandaag: true } : { frac: 1, idx: n, label, vandaag: true };
}

/** De bekende domeinen bij een lijst ids, zonder dubbele, in de volgorde van de lijst. */
export function domeinenVan(ids: readonly string[] | undefined): Domein[] {
  const uit: Domein[] = [];
  for (const id of ids ?? []) {
    const d = domein(tekst(id));
    if (d && !uit.some((x) => x.id === d.id)) uit.push(d);
  }
  return uit;
}

/** Balkkleur in de tijdlijn: het eerste domein; alle vier de domeinen = Cito-blauw. */
export function balkKleur(ds: Domein[]): string {
  if (ds.length === 0) return "#64748b";
  return ds.length >= DOMEINEN.length ? CITO : ds[0].kleur;
}

// ---------- uit VoortgangsbordBlok.tsx ----------

/** Eén onderdeel uit de tijdlijn met wat het bord erover weet. */
export interface Onderdeel {
  rij: TijdlijnRij;
  soort: VoortgangSoort;
  /** oplevermaand als "okt 2026"; leeg zonder oplevering */
  maand: string;
  verstreken: boolean;
  komend: boolean;
  /** startmaand als "okt 2026"; leeg zonder start */
  start: string;
}

export interface Telling {
  totaal: number;
  afgerond: number;
  loopt: number;
  niet: number;
  verstreken: number;
  komend: number;
  metDatum: number;
  zonderDatum: number;
}

export interface GroepStand {
  anker: string;
  naam: string;
  domeinen: Domein[];
  onderdelen: Onderdeel[];
  telling: Telling;
}

/** Hoeveel dagen vooruit "komt eraan" kijkt. */
export const HORIZON_DAGEN = 60;

export function dag00(d: Date): Date {
  return new Date(d.getFullYear(), d.getMonth(), d.getDate());
}

function plusDagen(d: Date, n: number): Date {
  return new Date(d.getFullYear(), d.getMonth(), d.getDate() + n);
}

export function ddmmjjjj(d: Date): string {
  const p = (x: number) => String(x).padStart(2, "0");
  return `${p(d.getDate())}-${p(d.getMonth() + 1)}-${d.getFullYear()}`;
}

/** Maand in woorden: het maandlabel uit de tijdlijn plus het jaar, bijv. "okt 2026". */
function maandLabel(tl: Tijdlijn, idx: number | null): string {
  if (idx === null) return "";
  const m = tekst((tl.maanden ?? [])[idx]).trim();
  const d = maandDatum(tl, idx);
  return Number.isNaN(d.getTime()) ? m : `${m} ${d.getFullYear()}`;
}

export function legeTelling(): Telling {
  return { totaal: 0, afgerond: 0, loopt: 0, niet: 0, verstreken: 0, komend: 0, metDatum: 0, zonderDatum: 0 };
}

export function telOp(t: Telling, o: Onderdeel) {
  t.totaal++;
  if (o.soort === "afgerond") t.afgerond++;
  else if (o.soort === "loopt") t.loopt++;
  else if (o.soort === "niet") t.niet++;
  if (o.rij.opleverDatum) t.metDatum++;
  else if (o.soort !== "afgerond") t.zonderDatum++;
  if (o.verstreken) t.verstreken++;
  if (o.komend) t.komend++;
}

/** Voortgang 0..1: alleen afgeronde onderdelen tellen; null zonder onderdelen. */
export function voortgangPct(t: Telling): number | null {
  return t.totaal > 0 ? t.afgerond / t.totaal : null;
}

/** Op schema 0..1: het deel van de opleveringen met datum dat niet verstreken is; null zonder datums. */
export function opSchema(t: Telling): number | null {
  return t.metDatum > 0 ? 1 - t.verstreken / t.metDatum : null;
}

export function procent(x: number | null): string {
  return x === null ? "—" : Math.round(x * 100) + "%";
}

/**
 * Alle onderdelen uit de tijdlijn, beoordeeld op de dag `vandaag`, gegroepeerd per
 * tijdlijngroep (op anker; zonder anker op naam). Volgorde als in de tijdlijn.
 */
export function berekenStand(tl: Tijdlijn | null, vandaag: Date): { groepen: GroepStand[]; onderdelen: Onderdeel[] } {
  if (!tl) return { groepen: [], onderdelen: [] };
  const dag = dag00(vandaag);
  const grens = plusDagen(dag, HORIZON_DAGEN);
  const onderdelen: Onderdeel[] = tijdlijnRijen(tl).map((rij) => {
    const soort = voortgangSoort(rij.voortgang);
    const d = rij.opleverDatum;
    const open = soort !== "afgerond";
    return {
      rij,
      soort,
      maand: maandLabel(tl, rij.opleverIndex),
      start: maandLabel(tl, rij.startIndex),
      verstreken: d !== null && open && d < dag,
      komend: d !== null && open && d >= dag && d <= grens,
    };
  });
  const groepen: GroepStand[] = [];
  const opSleutel = new Map<string, GroepStand>();
  for (const g of tl.groepen ?? []) {
    const anker = tekst(g.anker).trim();
    const naam = tekst(g.naam).trim();
    const sleutel = anker || "naam:" + naam;
    if (opSleutel.has(sleutel)) continue;
    const stand: GroepStand = { anker, naam, domeinen: domeinenVan(g.domeinen), onderdelen: [], telling: legeTelling() };
    opSleutel.set(sleutel, stand);
    groepen.push(stand);
  }
  for (const o of onderdelen) {
    const stand = opSleutel.get(o.rij.groepAnker || "naam:" + o.rij.groepNaam);
    if (!stand) continue;
    stand.onderdelen.push(o);
    telOp(stand.telling, o);
  }
  return { groepen, onderdelen };
}

/** Kleur van een werkstroom op het bord: het eerste domein; alle vier = Cito-blauw; geen = grijs. */
export function kleurVan(ds: Domein[]): string {
  if (ds.length === 0) return "#94a3b8";
  return ds.length >= DOMEINEN.length ? CITO : ds[0].kleur;
}

// ---------- uit WerkstroomKaartenBlok.tsx ----------

/** Eén onderdeel van de werkstroom uit de tijdlijn, klaar om op de kaart te tonen. */
export interface KaartOnderdeel {
  naam: string;
  /** startmaand (▶), bijv. "jul" of "jan 2027"; null = start te bepalen */
  start: string | null;
  /** oplevermaand (⚑), bijv. "okt" of "mei 2027"; null = oplevering te bepalen */
  oplevering: string | null;
  /** in de tijdlijn is voor dit onderdeel geen enkele maand gemarkeerd */
  zonderMaand: boolean;
  voortgang: string;
  soort: VoortgangSoort;
  status: string;
  /** de oplevermaand is voorbij en het onderdeel staat niet op Afgerond */
  verstreken: boolean;
}

/** Alleen een url die met http:// of https:// begint, wordt als link getoond. */
export function isLink(url: string): boolean {
  return /^https?:\/\/\S/i.test(url.trim());
}

export function isJira(label: string): boolean {
  return label.trim().toLowerCase().startsWith("jira");
}

function isStart(cel: string | undefined): boolean {
  const t = tekst(cel).replace(/[︎️]/g, "").trim().toLowerCase();
  return t === "start" || t === "▶";
}

/** Jaarlabel bij elke maand van de tijdlijn, uit `jaren` (bijv. 6 × "2026", 6 × "2027"). */
function jaarPerMaand(tl: Tijdlijn): string[] {
  const n = (tl.maanden ?? []).length;
  const uit = Array.from({ length: n }, () => "");
  let van = 0;
  for (const j of tl.jaren ?? []) {
    if (van >= n) break;
    const aantal = Math.min(Math.max(0, Math.floor(j.maanden)), n - van);
    for (let i = van; i < van + aantal; i++) uit[i] = tekst(j.label).trim();
    van += aantal;
  }
  return uit;
}

/**
 * Start- en oplevermaand in woorden (null waar de tijdlijn geen maand noemt). Het jaartal
 * staat er alleen bij buiten het eerste jaar van de tijdlijn; liggen start en oplevering
 * in hetzelfde latere jaar, dan één keer achteraan ("jan → feb 2027").
 */
function maandBereik(
  tl: Tijdlijn,
  jaren: string[],
  start: number | null,
  oplevering: number | null
): { start: string | null; oplevering: string | null } {
  const maanden = tl.maanden ?? [];
  const eersteJaar = jaren[0] ?? "";
  const maand = (i: number) => tekst(maanden[i]).trim() || `maand ${i + 1}`;
  const jaar = (i: number) => {
    const j = jaren[i] ?? "";
    return j !== "" && j !== eersteJaar && !/\d{4}/.test(maand(i)) ? j : "";
  };
  const voluit = (i: number) => (jaar(i) ? `${maand(i)} ${jaar(i)}` : maand(i));
  if (start !== null && oplevering !== null && jaar(start) !== "" && jaar(start) === jaar(oplevering)) {
    return { start: maand(start), oplevering: voluit(oplevering) };
  }
  return {
    start: start === null ? null : voluit(start),
    oplevering: oplevering === null ? null : voluit(oplevering),
  };
}

/**
 * De onderdelen uit de tijdlijn per anker (= id van de werkstroomkaart), in de volgorde
 * van de tijdlijn en beoordeeld op de dag `vandaag` (00:00).
 */
export function onderdelenPerAnker(tl: Tijdlijn, vandaag: Date): Map<string, KaartOnderdeel[]> {
  const rijen = tijdlijnRijen(tl);
  const jaren = jaarPerMaand(tl);
  const uit = new Map<string, KaartOnderdeel[]>();
  let k = 0;
  for (const g of tl.groepen ?? []) {
    const anker = tekst(g.anker).trim();
    let lijst = anker ? uit.get(anker) : undefined;
    if (anker && !lijst) {
      lijst = [];
      uit.set(anker, lijst);
    }
    for (const regel of g.rijen ?? []) {
      const r = rijen[k++];
      if (!lijst || !r) continue;
      const soort = voortgangSoort(r.voortgang);
      // startIndex is de ▶-cel of, zonder start, de eerste gemarkeerde maand: alleen een ▶ telt als start
      const start = r.startIndex !== null && isStart((regel.cellen ?? [])[r.startIndex]) ? r.startIndex : null;
      const bereik = maandBereik(tl, jaren, start, r.opleverIndex);
      lijst.push({
        naam: r.activiteit,
        start: bereik.start,
        oplevering: bereik.oplevering,
        zonderMaand: r.startIndex === null,
        voortgang: r.voortgang,
        soort,
        status: r.status,
        verstreken: r.opleverDatum !== null && soort !== "afgerond" && r.opleverDatum < vandaag,
      });
    }
  }
  return uit;
}

/** "Vermogen: eenduidige funnelprocessen" → { prefix: "Vermogen", rest: "eenduidige funnelprocessen" }. */
export function splitsSchakel(s: string): { prefix: string; rest: string } {
  const i = s.indexOf(":");
  if (i > 0 && i <= 32) return { prefix: s.slice(0, i).trim(), rest: s.slice(i + 1).trim() };
  return { prefix: "", rest: s.trim() };
}

const NIVEAUS: { woorden: string[]; kleur: string }[] = [
  { woorden: ["inspanning"], kleur: "#b45309" },
  { woorden: ["vermogen"], kleur: "#0e7490" },
  { woorden: ["baat", "baten"], kleur: "#0066cc" },
  { woorden: ["doel"], kleur: CITO },
];

/** Kleur per DIN-niveau, herkend aan het woord vóór de dubbele punt. */
export function niveauKleur(prefix: string): string {
  const t = prefix.trim().toLowerCase();
  if (!t) return "#64748b";
  return NIVEAUS.find((n) => n.woorden.some((w) => t.startsWith(w)))?.kleur ?? "#64748b";
}

/** Accentkleur van een kaart: het eerste domein; bouwt de werkstroom in alle domeinen, dan Cito-blauw. */
export function accentKleur(doms: Domein[]): string {
  if (doms.length === 0) return "#64748b";
  if (DOMEINEN.every((d) => doms.some((x) => x.id === d.id))) return CITO;
  return doms[0].kleur;
}

// ---------- uit BewerkbaarDocument.tsx ----------

/** Kleur van een oordeel-chip in de chipkolom van een tabel, op basis van de tekst. */
export function chipSoort(v: string): "groen" | "blauw" | "amber" | "grijs" {
  const t = v.toLowerCase().trim();
  const bevat = (...woorden: string[]) => woorden.some((w) => t.includes(w));
  const ligtEr = t.includes("ligt er") && !/\bniet\b/.test(t);
  if (/^ja\b/.test(t) || bevat("sluit aan", "staat erin") || ligtEr) return "groen";
  if (/^nee\b/.test(t) || /^verstreken/.test(t) || /^(zien we terug|speelt opnieuw|nog niet|nee:)/.test(t)) return "amber";
  if (bevat("waarschijnlijk", "aanvulling", "deels") || /^loopt/.test(t) || /^besproken/.test(t)) return "blauw";
  if (bevat("verschil", "ontbreekt", "aanvullen")) return "amber";
  return "grijs";
}

/** "1 · Eén model: …": elke regel begint met een nummer; dan is het een genummerde lijst. */
export const NUMMER_REGEL = /^\s*(\d+)\s*·\s+([\s\S]*)$/;

// ---------- uit EvaluatieBlok.tsx ----------

export type BeeldSoort = "ja" | "deels" | "needeels" | "nee" | "grijs";

function hoofdletter(s: string): string {
  return s.replace(/^\p{Ll}/u, (c) => c.toUpperCase());
}

/** Kleur van de chip "eerste beeld": uit het eerste woord van de zin. */
export function beeldSoort(s: string): BeeldSoort {
  const t = s.trim().toLowerCase();
  if (/^nee[,;]?\s+deels\b/.test(t)) return "needeels";
  if (/^ja\b/.test(t) || /^sluit aan/.test(t)) return "ja";
  if (/^nee\b/.test(t) || /^onvoldoende/.test(t)) return "nee";
  if (/^deels\b/.test(t) || /^waarschijnlijk/.test(t)) return "deels";
  return "grijs";
}

function alsZin(s: string): string {
  const t = hoofdletter(s.trim());
  if (!t) return "";
  return /[.!?…]["'’”)]?$/.test(t) ? t : t + ".";
}

/**
 * Het eerste beeld in tweeën: het stuk vóór de dubbele punt wordt de chip ("Nee, deels"), de
 * rest de zin erachter (hoofdletter vooraan, punt aan het eind). Zonder dubbele punt vooraan:
 * alleen het oordeelwoord als chip en de hele tekst als zin.
 */
export function splitsBeeld(s: string): { kop: string; zin: string } {
  const t = s.trim().replace(/\s*\(voorstel\)\s*$/i, "");
  if (!t) return { kop: "", zin: "" };
  const i = t.indexOf(":");
  if (i > 0 && i <= 40) return { kop: t.slice(0, i).trim(), zin: alsZin(t.slice(i + 1)) };
  const m = t.match(/^(ja|nee,? deels|nee|deels|waarschijnlijk)(?![\p{L}\p{N}])/iu);
  if (m) return { kop: hoofdletter(m[1]), zin: m[0].length < t.length ? alsZin(t) : "" };
  return { kop: "", zin: alsZin(t) };
}

/** Woorden waaraan een bronvermelding tussen haakjes te herkennen is, naast de documentnamen. */
const BRONWOORD =
  /statuspagina|microspace|overleg|stappenplan|programmaboek|programmaplan|organigram|actiebord|evaluatie|verslag|transcriptie|jira|town hall|stand \d|\d{1,2}-\d{1,2}|(?:^|[\s(])p\.\s?\d/i;

/**
 * Een feit met de bron tussen haakjes aan het eind: de bron komt op een eigen, rustiger regel.
 * Alleen als de haakjes een bron bevatten en er geen verwijzing over de grens heen loopt.
 */
export function splitsBron(s: string): { kern: string; bron: string } {
  const t = s.trim();
  const m = t.match(/^([\s\S]*\S)\s*(\([^()]+\))\s*\.?$/);
  if (!m) return { kern: t, bron: "" };
  const grens = m[1].length;
  const verwijzingen = vindVerwijzingen(t);
  if (verwijzingen.some((v) => v.start < grens && v.end > grens)) return { kern: t, bron: "" };
  if (!BRONWOORD.test(m[2]) && !verwijzingen.some((v) => v.start >= grens)) return { kern: t, bron: "" };
  return { kern: /[.!?…:]$/.test(m[1]) ? m[1] : m[1] + ".", bron: m[2] };
}

export interface Alinea {
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
export function alineas(invoer: string): Alinea[] {
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

/** Ons oordeel (intern): de naam zoals in het keuzelijstje van de app, en de kleur van het pilletje. */
export function oordeelNaam(waarde: string): { naam: string; soort: "groen" | "blauw" | "amber" | "grijs"; ingevuld: boolean } {
  switch (waarde.trim().toLowerCase()) {
    case "goed":
      return { naam: "Goed", soort: "groen", ingevuld: true };
    case "deels":
      return { naam: "Deels", soort: "blauw", ingevuld: true };
    case "onvoldoende":
      return { naam: "Onvoldoende", soort: "amber", ingevuld: true };
    case "nvt":
      return { naam: "Nog niet te beoordelen", soort: "grijs", ingevuld: true };
    default:
      return { naam: "nog niet ingevuld", soort: "grijs", ingevuld: false };
  }
}
