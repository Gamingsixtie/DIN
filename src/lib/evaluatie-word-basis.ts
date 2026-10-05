// Word-export van de evaluatie (evaluatie-word.ts): de bouwstenen. Kleuren en maten, tekst
// en alinea's, tabelcellen, labels, chips en kaders. Geen inhoud en geen rekenwerk: dat
// staat in evaluatie-word-blokken.ts en evaluatie-word-reken.ts.
//
// Leesbaarheid: lopende tekst 10,5 pt, tabellen 9 tot 9,5 pt, labels 8 pt vet; grijs is
// nooit lichter dan INKT3 (ruim 5:1 op wit).

import {
  AlignmentType,
  BorderStyle,
  LineRuleType,
  Paragraph,
  ShadingType,
  Tab,
  TabStopType,
  Table,
  TableCell,
  TableLayoutType,
  TableRow,
  TextRun,
  VerticalAlign,
  WidthType,
} from "docx";
import type { IBorderOptions, ParagraphChild } from "docx";
import { zonderLinktekens } from "@/lib/evaluatie-uitsnede";

// ---------- maten ----------

export const FONT = "Calibri";
/** Voor tekens die Calibri niet heeft (▶ ◆ ☐ ☑ ✓ →). */
export const SYMBOOL = "Segoe UI Symbol";

/** Lettergroottes in halve punten. */
export const G = { titel: 52, h1: 34, h2: 26, h3: 23, body: 21, tabel: 19, fijn: 18, label: 16 } as const;

/** A4 in twips; docx draait breedte en hoogte zelf om bij liggend. */
export const A4 = { breedte: 11906, hoogte: 16838 } as const;
export const MARGE = {
  staand: { top: 1360, right: 1134, bottom: 1250, left: 1134, header: 560, footer: 520 },
  liggend: { top: 1150, right: 1134, bottom: 1000, left: 1134, header: 480, footer: 440 },
} as const;
/** Bruikbare breedte tussen de marges. */
export const BREEDTE = {
  staand: A4.breedte - MARGE.staand.left - MARGE.staand.right,
  liggend: A4.hoogte - MARGE.liggend.left - MARGE.liggend.right,
} as const;

// ---------- kleuren (hex zonder #), als in de app ----------

export const K = {
  cito: "003366",
  inkt: "111827",
  inkt2: "4A5565",
  inkt3: "5F6B7A",
  rand: "CBD5E1",
  lijn: "E2E8F0",
  vlak: "F8FAFC",
  vlakBlauw: "F2F6FB",
  wit: "FFFFFF",
  rood: "B91C1C",
  amber: "B45309",
  groen: "047857",
} as const;

export type ChipSoort = "groen" | "blauw" | "amber" | "grijs";

/** Chipkleuren van de app (.okd-chip-*): vlak, tekst en rand. */
export const CHIP: Record<ChipSoort, { vlak: string; tekst: string; rand: string }> = {
  groen: { vlak: "ECFDF5", tekst: "047857", rand: "A7F3D0" },
  blauw: { vlak: "EFF6FF", tekst: "1D4ED8", rand: "BFDBFE" },
  amber: { vlak: "FFFBEB", tekst: "92400E", rand: "FCD34D" },
  grijs: { vlak: "F3F4F6", tekst: "4B5563", rand: "D1D5DB" },
};

/** Kaders van de app (.okd-call-*). */
export const TOON: Record<string, { vlak: string; rand: string; tekst: string; titel: string; balk: string }> = {
  info: { vlak: "EFF6FF", rand: "BFDBFE", tekst: "1E3A5F", titel: "1E40AF", balk: "93C5FD" },
  "let-op": { vlak: "FFFBEB", rand: "FCD34D", tekst: "78350F", titel: "92400E", balk: "F59E0B" },
  besluit: { vlak: "F2F6FB", rand: "003366", tekst: "111827", titel: "003366", balk: "003366" },
};

/** "#d97706" of "d97706" → "D97706"; iets anders → de terugvalkleur. */
export function hex(kleur: string | undefined, terugval = "64748B"): string {
  const m = /^#?([0-9a-f]{6})$/i.exec((kleur ?? "").trim());
  return m ? m[1].toUpperCase() : terugval;
}

/** Mengt `kleur` met `met`: aandeel 1 = alleen kleur, 0 = alleen `met` (zoals color-mix in de app). */
export function meng(kleur: string, aandeel: number, met = "FFFFFF"): string {
  const a = hex(kleur);
  const b = hex(met, "FFFFFF");
  const kanaal = (i: number) => {
    const x = parseInt(a.slice(i, i + 2), 16);
    const y = parseInt(b.slice(i, i + 2), 16);
    return Math.round(x * aandeel + y * (1 - aandeel))
      .toString(16)
      .padStart(2, "0");
  };
  return (kanaal(0) + kanaal(2) + kanaal(4)).toUpperCase();
}

// ---------- tekst ----------

/**
 * Tekst voor in het document: nooit "undefined", linktekens [[…]] als gewone naam,
 * regeleinden gelijkgetrokken en zonder witruimte aan de randen.
 */
export function schoon(v: unknown): string {
  if (typeof v !== "string") return "";
  return zonderLinktekens(v).replace(/\r\n?/g, "\n").replace(/[ \t]+\n/g, "\n").trim();
}

export const heeft = (v: unknown): boolean => schoon(v) !== "";

export interface Stijl {
  size?: number;
  bold?: boolean;
  italics?: boolean;
  color?: string;
  strike?: boolean;
  font?: string;
  allCaps?: boolean;
  spatie?: number;
  /** vulkleur achter de tekst (chip) */
  vlak?: string;
}

/** Eén of meer runs; een regeleinde in de tekst wordt een regeleinde in Word. */
export function t(tekst: string, s: Stijl = {}): TextRun[] {
  return tekst.split("\n").map(
    (regel, i) =>
      new TextRun({
        text: regel,
        break: i > 0 ? 1 : undefined,
        font: s.font ?? FONT,
        size: s.size ?? G.body,
        bold: s.bold,
        italics: s.italics,
        color: s.color ?? K.inkt,
        strike: s.strike,
        allCaps: s.allCaps,
        characterSpacing: s.spatie,
        shading: s.vlak ? { type: ShadingType.CLEAR, color: "auto", fill: s.vlak } : undefined,
      })
  );
}

/** Een tab (voor het inspringen na een opsommingsteken of naar een rechter tabstop). */
export function tab(): TextRun {
  return new TextRun({ children: [new Tab()] });
}

/**
 * "Label: rest" → het label vet (de dubbele punt staat binnen 48 tekens), zoals metLabel
 * in de app (src/components/bewerkbaar/velden.tsx).
 */
export function metLabel(tekst: string, s: Stijl = {}, labelKleur?: string): TextRun[] {
  const i = tekst.indexOf(":");
  if (i > 0 && i < 48) {
    return [
      ...t(tekst.slice(0, i + 1), { ...s, bold: true, color: labelKleur ?? s.color }),
      ...t(tekst.slice(i + 1), s),
    ];
  }
  return t(tekst, s);
}

/** Gekleurd vakje met tekst (chip): harde spaties geven het vlak wat lucht. */
export function chip(tekst: string, soort: ChipSoort, size: number = G.fijn): TextRun[] {
  const c = CHIP[soort];
  return t(` ${tekst} `, { size, bold: true, color: c.tekst, vlak: c.vlak });
}

/** Gekleurd vakje met een eigen kleur (domein, status): tekst wit of donker op een tint. */
export function vakje(tekst: string, vlak: string, kleur: string, size: number = G.fijn): TextRun[] {
  return t(` ${tekst} `, { size, bold: true, color: kleur, vlak });
}

// ---------- alinea's ----------

export interface AlineaOpties {
  voor?: number;
  na?: number;
  /** regelafstand in 240sten (276 = 1,15) */
  regel?: number;
  links?: number;
  hangend?: number;
  uitlijning?: (typeof AlignmentType)[keyof typeof AlignmentType];
  bijVolgende?: boolean;
  bijeen?: boolean;
  /** rechter tabstop op deze positie (twips) */
  tabRechts?: number;
  /** linker tabstop op deze positie (twips) */
  tabLinks?: number;
}

export function alinea(children: ParagraphChild[], o: AlineaOpties = {}): Paragraph {
  const tabStops = [
    ...(o.tabLinks !== undefined ? [{ type: TabStopType.LEFT, position: o.tabLinks }] : []),
    ...(o.tabRechts !== undefined ? [{ type: TabStopType.RIGHT, position: o.tabRechts }] : []),
  ];
  return new Paragraph({
    spacing: { before: o.voor ?? 0, after: o.na ?? 120, line: o.regel ?? 276 },
    indent: o.links !== undefined || o.hangend !== undefined ? { left: o.links ?? 0, hanging: o.hangend ?? 0 } : undefined,
    alignment: o.uitlijning,
    keepNext: o.bijVolgende,
    keepLines: o.bijeen,
    tabStops: tabStops.length > 0 ? tabStops : undefined,
    children,
  });
}

/** Lopende tekst. */
export function tekstAlinea(tekst: string, s: Stijl = {}, o: AlineaOpties = {}): Paragraph {
  return alinea(t(tekst, { color: K.inkt, ...s }), o);
}

/**
 * Klein kopje in hoofdletters boven een onderdeel. Zonder "bij volgende": in een tabelcel
 * plakt Word daarmee de hele rij aan de volgende rij vast.
 */
export function label(tekst: string, kleur: string = K.inkt2, o: AlineaOpties = {}): Paragraph {
  return alinea(t(tekst, { size: G.label, bold: true, color: kleur, allCaps: true, spatie: 12 }), { na: 50, ...o });
}

/** Regel met een opsommingsteken en hangend inspringen; `teken` is het teken zelf (•, ☐, 1). */
export function punt(inhoud: ParagraphChild[], teken: ParagraphChild[], o: AlineaOpties & { inspring?: number } = {}): Paragraph {
  const inspring = o.inspring ?? 260;
  const links = (o.links ?? 0) + inspring;
  return alinea([...teken, tab(), ...inhoud], { na: 60, ...o, links, hangend: inspring, tabLinks: links });
}

/** Opsommingsteken "•" in de accentkleur. */
export function bol(kleur: string = K.cito, size: number = G.body): TextRun[] {
  return t("•", { size, bold: true, color: kleur });
}

/** Niet ingevuld of niet gesourcet: expliciet tonen, nooit leeg laten. */
export function leeg(tekst: string, size: number = G.tabel, o: AlineaOpties = {}): Paragraph {
  return alinea(t(tekst, { size, italics: true, color: K.inkt3 }), { na: 40, ...o });
}

/** Lege alinea als witruimte tussen tabellen (Word plakt twee tabellen anders aan elkaar). */
export function wit(hoogte = 160): Paragraph {
  return new Paragraph({ spacing: { before: 0, after: 0, line: hoogte, lineRule: LineRuleType.EXACT }, children: [] });
}

// ---------- tabellen ----------

export const GEEN: IBorderOptions = { style: BorderStyle.NONE, size: 0, color: "auto" };
export const lijn = (kleur: string = K.lijn, dikte = 4): IBorderOptions => ({ style: BorderStyle.SINGLE, size: dikte, color: kleur });

export interface Randen {
  top?: IBorderOptions;
  bottom?: IBorderOptions;
  left?: IBorderOptions;
  right?: IBorderOptions;
}

export const RONDOM: Randen = { top: lijn(), bottom: lijn(), left: lijn(), right: lijn() };
export const ZONDER: Randen = { top: GEEN, bottom: GEEN, left: GEEN, right: GEEN };

export interface CelOpties {
  breedte: number;
  vlak?: string;
  randen?: Randen;
  /** binnenmarge in twips: [boven, rechts, onder, links] */
  marge?: [number, number, number, number];
  span?: number;
  rijen?: number;
  midden?: boolean;
}

export function cel(children: (Paragraph | Table)[], o: CelOpties): TableCell {
  const m = o.marge ?? [70, 110, 70, 110];
  return new TableCell({
    width: { size: o.breedte, type: WidthType.DXA },
    shading: o.vlak ? { type: ShadingType.CLEAR, color: "auto", fill: o.vlak } : undefined,
    borders: o.randen ?? RONDOM,
    margins: { top: m[0], right: m[1], bottom: m[2], left: m[3] },
    columnSpan: o.span,
    rowSpan: o.rijen,
    verticalAlign: o.midden ? VerticalAlign.CENTER : VerticalAlign.TOP,
    children: children.length > 0 ? children : [new Paragraph({ spacing: { after: 0 }, children: [] })],
  });
}

export interface RijOpties {
  /** kopregel: herhaalt bovenaan elke pagina waarop de tabel doorloopt */
  kop?: boolean;
  /** de rij mag over een paginarand breken (alleen voor erg lange rijen) */
  breekbaar?: boolean;
}

export function rij(cellen: TableCell[], o: RijOpties = {}): TableRow {
  return new TableRow({ children: cellen, tableHeader: o.kop, cantSplit: !o.breekbaar });
}

/** Tabel met vaste kolombreedtes (twips); de som is de breedte van de tabel. */
export function tabel(kolommen: number[], rijen: TableRow[]): Table {
  return new Table({
    width: { size: kolommen.reduce((a, b) => a + b, 0), type: WidthType.DXA },
    layout: TableLayoutType.FIXED,
    columnWidths: kolommen,
    borders: { top: GEEN, bottom: GEEN, left: GEEN, right: GEEN, insideHorizontal: GEEN, insideVertical: GEEN },
    rows: rijen,
  });
}

/** Kopcel van een tabel: Cito-blauw met witte vette tekst. */
export function kopCel(tekst: string, breedte: number, o: { size?: number; midden?: boolean; span?: number; rijen?: number } = {}): TableCell {
  const rand = lijn(K.cito);
  return cel(
    [
      alinea(t(tekst, { size: o.size ?? G.tabel, bold: true, color: K.wit }), {
        na: 0,
        regel: 252,
        uitlijning: o.midden ? AlignmentType.CENTER : undefined,
        bijVolgende: true,
      }),
    ],
    {
      breedte,
      vlak: K.cito,
      randen: { top: rand, bottom: rand, left: lijn("335C85"), right: lijn("335C85") },
      marge: [80, 110, 80, 110],
      span: o.span,
      rijen: o.rijen,
      midden: true,
    }
  );
}

/**
 * Verdeelt `totaal` over kolommen naar gewicht, met een minimum per kolom; de som klopt
 * precies (de laatste kolom vangt de afronding op).
 */
export function verdeel(totaal: number, gewichten: number[], minima: number[] = []): number[] {
  const n = gewichten.length;
  if (n === 0) return [];
  const g = gewichten.map((x) => (x > 0 ? x : 1));
  let min = g.map((_, i) => Math.max(0, minima[i] ?? 0));
  // passen de minima samen niet, dan naar verhouding kleiner
  const somMin = min.reduce((a, b) => a + b, 0);
  if (somMin > totaal) min = min.map((m) => (m * totaal) / somMin);
  // Een kolom die onder zijn minimum komt, krijgt het minimum en blijft daarop staan; de
  // andere kolommen delen wat overblijft. Herhalen tot er geen kolom meer bij komt.
  const vast = g.map(() => false);
  let breedtes = g.map(() => 0);
  for (let ronde = 0; ronde <= n; ronde++) {
    const vastSom = min.reduce((a, m, i) => a + (vast[i] ? m : 0), 0);
    const vrij = g.reduce((a, x, i) => a + (vast[i] ? 0 : x), 0);
    breedtes = g.map((x, i) => (vast[i] ? min[i] : vrij > 0 ? ((totaal - vastSom) * x) / vrij : 0));
    let erbij = false;
    breedtes.forEach((b, i) => {
      if (!vast[i] && b < min[i]) {
        vast[i] = true;
        erbij = true;
      }
    });
    if (!erbij) break;
  }
  const uit = breedtes.map((b) => Math.floor(b));
  uit[n - 1] += totaal - uit.reduce((a, b) => a + b, 0);
  return uit;
}

/**
 * Kader over de volle breedte: één cel met een dikke balk links, een optionele titel en
 * de inhoud. `toon` kiest de kleuren van de app (info, let-op, besluit).
 */
export function kader(inhoud: Paragraph[], breedte: number, toon: string, titel = ""): Table {
  const k = TOON[toon] ?? TOON.info;
  const rand = lijn(k.rand, toon === "besluit" ? 8 : 6);
  const kop = titel ? [alinea(t(titel, { size: G.body, bold: true, color: k.titel }), { na: 50 })] : [];
  return tabel(
    [breedte],
    [
      rij([
        cel([...kop, ...inhoud], {
          breedte,
          vlak: k.vlak,
          randen: { top: rand, bottom: rand, right: rand, left: lijn(k.balk, 36) },
          marge: [120, 180, 120, 200],
        }),
      ]),
    ]
  );
}
