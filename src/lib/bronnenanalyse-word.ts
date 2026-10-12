// Stap 12 — Bronnenanalyse: de Word-export (deelbaar antwoord op de opmerking van Sanne:
// "Pim doet analyse en komt met de uitkomsten").
//
// Opbouw (volgt de tabbladen van de stap; de wizard is de bron van waarheid):
//   titelblok (titel, ondertitel, datum, aanleiding met de bron van de vier punten);
//   1 Register;
//   2 Oordeel en dekking per werkstroom;
//   3 De vier punten;
//   4 Dit kan nu in gang en Nog nodig / te bepalen;
//   5 Analyse per bron.
//
// Rekent NIETS zelf uit: alles komt uit de servicefuncties en labels van fase 1
// (actieveBronnen, bronLabel, berekenDekkingMatrix, berekenPuntenOverzicht, de *_LABELS), zodat
// export en stap dezelfde inhoud tonen. Nooit een id in de tekst: bron-ids via bronLabel,
// werkstroom-ids via de naam uit het organigram; onbekend = "—". Ongesourcd = "te bepalen".
// Draait in de browser (Packer.toBlob).

import {
  AlignmentType,
  BorderStyle,
  Document,
  Footer,
  HeadingLevel,
  Packer,
  PageNumber,
  Paragraph,
  ShadingType,
  Table,
  TableCell,
  TableRow,
  TextRun,
  WidthType,
} from "docx";
import type { ITableCellOptions } from "docx";
import type { BronnenAnalyse, BronStatus, EffortDomain } from "@/lib/schemas";
import {
  BRON_STATUS_LABELS,
  BRON_TYPE_LABELS,
  DOOR_LABELS,
  GEEL_PUNTEN,
  GEEL_PUNTEN_BRON,
  HERKOMST_LABELS,
  KAN_NU_STATUS_LABELS,
  NOG_NODIG_STATUS_LABELS,
  OORDEEL_LABELS,
  TE_BEPALEN,
  VOORSTEL_LABEL,
} from "@/lib/bronnenanalyse-default";
import {
  actieveBronnen,
  berekenDekkingMatrix,
  berekenPuntenOverzicht,
  bronLabel,
  isGeanalyseerd,
} from "@/lib/bronnenanalyse-service";
import type { DekkingCel } from "@/lib/bronnenanalyse-service";
import {
  AMBER_BG,
  AMBER_PILL,
  BORDER_COLOR,
  CITO_BLUE,
  CITO_BLUE_LIGHT,
  DOMAIN_COLORS,
  DOMEIN_OUTSIDE_IN_ORDER,
  TEXT_PRIMARY,
  TEXT_SECONDARY,
} from "@/lib/word-export-shared";
import { DOMAIN_LABELS } from "@/lib/types";

export type BronnenWordInvoer = {
  /** mergeBronnenAnalyse(session.bronnenAnalyse) */
  ba: BronnenAnalyse;
  /** mergeOrganigram(session.organigram).werkstromen */
  werkstromen: { id: string; naam: string }[];
  sessieNaam?: string;
};

const FONT = "Calibri";
/** Tekstgroottes in halve punten; nooit kleiner dan 10 pt (leesbaarheid). */
const G = { titel: 40, sub: 26, h1: 30, h2: 24, body: 22, tabel: 20, label: 20 } as const;
/** Markeringsgeel voor de vier punten (zoals de gele punten in de opmerking van Sanne). */
const GEEL = "FFF9C4";
const GEEL_RAND = "E0B000";
const GROEN_BG = "D1FAE5";
const GROEN_TEKST = "065F46";
const GRIJS_BG = "E5E7EB";
const NIET_GEVERIFIEERD = "(citaat niet letterlijk teruggevonden in de bron — controleren)";
const VOLLE_BREEDTE = 9360; // A4 staand met 2,54 cm marge, in twips

type Inhoud = (Paragraph | Table)[];
type RunOpties = { bold?: boolean; italics?: boolean; size?: number; color?: string };

// ---------- bouwstenen ----------

function schoon(s: string | undefined | null): string {
  return (s ?? "").replace(/\s+/g, " ").trim();
}

function of(s: string | undefined | null, leeg = TE_BEPALEN): string {
  return schoon(s) || leeg;
}

function run(text: string, o: RunOpties = {}): TextRun {
  return new TextRun({
    text,
    font: FONT,
    bold: o.bold,
    italics: o.italics,
    size: o.size ?? G.body,
    color: o.color ?? TEXT_PRIMARY,
  });
}

function alinea(
  children: TextRun[],
  o: { na?: number; voor?: number; links?: number; shading?: string; randLinks?: string; bijVolgende?: boolean } = {},
): Paragraph {
  return new Paragraph({
    spacing: { before: o.voor ?? 0, after: o.na ?? 100, line: 290 },
    indent: o.links ? { left: o.links } : undefined,
    shading: o.shading ? { type: ShadingType.CLEAR, color: "auto", fill: o.shading } : undefined,
    border: o.randLinks ? { left: { style: BorderStyle.SINGLE, size: 18, color: o.randLinks, space: 6 } } : undefined,
    keepNext: o.bijVolgende,
    children,
  });
}

function tekst(s: string, o: RunOpties = {}, a: Parameters<typeof alinea>[1] = {}): Paragraph {
  return alinea([run(s, o)], a);
}

function kop1(s: string, nieuwePagina = true): Paragraph {
  return new Paragraph({
    heading: HeadingLevel.HEADING_1,
    pageBreakBefore: nieuwePagina,
    spacing: { before: 0, after: 160 },
    keepNext: true,
    border: { bottom: { style: BorderStyle.SINGLE, size: 8, color: CITO_BLUE, space: 4 } },
    children: [run(s, { bold: true, size: G.h1, color: CITO_BLUE })],
  });
}

function kop2(s: string, extra: TextRun[] = []): Paragraph {
  return new Paragraph({
    heading: HeadingLevel.HEADING_2,
    spacing: { before: 260, after: 100 },
    keepNext: true,
    children: [run(s, { bold: true, size: G.h2, color: CITO_BLUE }), ...extra],
  });
}

function label(s: string, kleur = TEXT_SECONDARY): Paragraph {
  return tekst(s.toUpperCase(), { bold: true, size: G.label, color: kleur }, { voor: 120, na: 60, bijVolgende: true });
}

function opsomming(children: TextRun[], links = 360): Paragraph {
  return new Paragraph({
    spacing: { after: 60, line: 280 },
    indent: { left: links, hanging: 220 },
    children: [run("•  ", { color: CITO_BLUE, size: G.tabel }), ...children],
  });
}

/** Pil-achtig label in de tekst (bijv. "Voorstel"). */
function pil(s: string, kleur = AMBER_PILL): TextRun[] {
  return [run("  "), run(` ${s} `, { bold: true, size: G.label, color: kleur })];
}

/** Citaat (cursief) met vindplaats; niet-geverifieerd citaat krijgt een amberen waarschuwing. */
function citaatRuns(citaat: string, vindplaats: string, geverifieerd?: boolean): TextRun[] {
  const c = schoon(citaat);
  if (!c) return [];
  const uit: TextRun[] = [run(`“${c}”`, { italics: true, size: G.tabel, color: TEXT_SECONDARY })];
  uit.push(run(` — ${of(vindplaats, "vindplaats te bepalen")}`, { size: G.tabel, color: TEXT_SECONDARY }));
  if (geverifieerd === false) uit.push(run(` ${NIET_GEVERIFIEERD}`, { bold: true, size: G.tabel, color: AMBER_PILL }));
  return uit;
}

const RAND = { style: BorderStyle.SINGLE, size: 4, color: BORDER_COLOR };
const RANDEN = { top: RAND, bottom: RAND, left: RAND, right: RAND };

function cel(
  paragrafen: Paragraph[],
  o: { breedte?: number; vulling?: string; randen?: ITableCellOptions["borders"] } = {},
): TableCell {
  return new TableCell({
    width: o.breedte ? { size: o.breedte, type: WidthType.DXA } : undefined,
    shading: o.vulling ? { type: ShadingType.CLEAR, color: "auto", fill: o.vulling } : undefined,
    borders: o.randen ?? RANDEN,
    margins: { top: 60, bottom: 60, left: 100, right: 100 },
    children: paragrafen.length > 0 ? paragrafen : [new Paragraph({ children: [] })],
  });
}

function celTekst(s: string, o: RunOpties = {}): Paragraph {
  return new Paragraph({ spacing: { after: 40, line: 264 }, children: [run(s, { size: G.tabel, ...o })] });
}

function kopCel(s: string, breedte: number): TableCell {
  return cel([celTekst(s, { bold: true, color: CITO_BLUE })], { breedte, vulling: CITO_BLUE_LIGHT });
}

function tabel(koppen: string[], breedtes: number[], rijen: TableCell[][]): Table {
  return new Table({
    width: { size: VOLLE_BREEDTE, type: WidthType.DXA },
    columnWidths: breedtes,
    rows: [
      new TableRow({ tableHeader: true, children: koppen.map((k, i) => kopCel(k, breedtes[i])) }),
      ...rijen.map((cellen) => new TableRow({ cantSplit: true, children: cellen })),
    ],
  });
}

/** Kader (één cel, volle breedte) met een gekleurde linkerrand en vulling. */
function kader(paragrafen: Paragraph[], vulling: string, accent: string): Table {
  const geen = { style: BorderStyle.NONE, size: 0, color: "auto" };
  return new Table({
    width: { size: VOLLE_BREEDTE, type: WidthType.DXA },
    columnWidths: [VOLLE_BREEDTE],
    rows: [
      new TableRow({
        children: [
          cel(paragrafen, {
            breedte: VOLLE_BREEDTE,
            vulling,
            randen: { top: geen, bottom: geen, right: geen, left: { style: BorderStyle.SINGLE, size: 24, color: accent } },
          }),
        ],
      }),
    ],
  });
}

function wit(na = 160): Paragraph {
  return new Paragraph({ spacing: { after: na }, children: [] });
}

// ---------- labels en lookups ----------

const STATUS_KLEUR: Record<BronStatus, { vulling?: string; tekst: string }> = {
  bruikbaar: { vulling: GROEN_BG, tekst: GROEN_TEKST },
  deels_bruikbaar: { vulling: AMBER_BG, tekst: AMBER_PILL },
  verouderd: { vulling: GRIJS_BG, tekst: TEXT_PRIMARY },
  niet_geanalyseerd: { tekst: TEXT_PRIMARY },
};

function statusCel(status: BronStatus, breedte: number): TableCell {
  const k = STATUS_KLEUR[status];
  // niet geanalyseerd: "omlijnd" — witte cel met een donkere rand
  const donker = { style: BorderStyle.SINGLE, size: 8, color: TEXT_SECONDARY };
  return cel([celTekst(BRON_STATUS_LABELS[status], { bold: true, color: k.tekst })], {
    breedte,
    vulling: k.vulling,
    randen: k.vulling ? RANDEN : { top: donker, bottom: donker, left: donker, right: donker },
  });
}

function bronStatus(b: BronnenAnalyse["bronnen"][number]): BronStatus {
  return b.analyse?.status ?? "niet_geanalyseerd";
}

function datumNl(iso: string | undefined): string {
  if (!iso) return "—";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "—";
  return d.toLocaleDateString("nl-NL", { day: "numeric", month: "long", year: "numeric" });
}

function domeinRuns(domeinen: EffortDomain[]): TextRun[] {
  const gesorteerd = DOMEIN_OUTSIDE_IN_ORDER.filter((d) => domeinen.includes(d));
  const uit: TextRun[] = [];
  for (const d of gesorteerd) {
    uit.push(
      new TextRun({
        text: ` ${DOMAIN_LABELS[d]} `,
        font: FONT,
        size: G.label,
        bold: true,
        color: TEXT_PRIMARY,
        shading: { type: ShadingType.CLEAR, color: "auto", fill: DOMAIN_COLORS[d] },
      }),
      run(" ", { size: G.label }),
    );
  }
  return uit;
}

// ---------- titelblok ----------

function titelblok(ba: BronnenAnalyse, datum: string, sessieNaam?: string): Inhoud {
  const actief = actieveBronnen(ba);
  const geanalyseerd = actief.filter(isGeanalyseerd).length;
  const uit: Inhoud = [
    tekst("Bronnenanalyse — Klant in Zicht", { bold: true, size: G.titel, color: CITO_BLUE }, { na: 80 }),
    tekst("Wat hebben we al, wat is bruikbaar, wat ontbreekt", { size: G.sub, color: TEXT_SECONDARY }, { na: 200 }),
    alinea([run("Datum  ", { bold: true, size: G.label, color: TEXT_SECONDARY }), run(datum)], { na: 60 }),
  ];
  if (schoon(sessieNaam)) {
    uit.push(alinea([run("Sessie  ", { bold: true, size: G.label, color: TEXT_SECONDARY }), run(schoon(sessieNaam))], { na: 60 }));
  }
  uit.push(
    alinea([run("Register  ", { bold: true, size: G.label, color: TEXT_SECONDARY }), run(`${actief.length} bronnen · ${geanalyseerd} geanalyseerd`)], {
      na: 200,
    }),
    alinea(
      [
        run("Aanleiding: ", { bold: true }),
        run(
          "wat er al aan analyse en documenten is, beoordeeld per werkstroom en op de vier punten uit de opmerking van Sanne. Bron van de vier punten: ",
        ),
        run(GEEL_PUNTEN_BRON, { italics: true }),
        run("."),
      ],
      { shading: CITO_BLUE_LIGHT, randLinks: CITO_BLUE, na: 160 },
    ),
    tekst(
      `Oordelen en acties zijn gelabeld als "${VOORSTEL_LABEL}" zolang ze niet zijn vastgesteld. Wat niet in een bron staat, staat er als "${TE_BEPALEN}".`,
      { size: G.tabel, color: TEXT_SECONDARY },
      { na: 200 },
    ),
    label("Inhoud", CITO_BLUE),
    ...[
      "Register",
      "Oordeel en dekking per werkstroom",
      "De vier punten",
      "Dit kan nu in gang en Nog nodig",
      "Analyse per bron",
    ].map((s, i) => opsomming([run(`Deel ${i + 1}  `, { bold: true, color: CITO_BLUE, size: G.tabel }), run(s, { size: G.tabel })])),
  );
  return uit;
}

// ---------- 1 Register ----------

function deelRegister(ba: BronnenAnalyse): Inhoud {
  const actief = actieveBronnen(ba);
  const geanalyseerd = actief.filter(isGeanalyseerd).length;
  const breedtes = [2700, 1100, 1500, 1460, 1400, 1200];
  const rijen = actief.map((b) => [
    cel([celTekst(of(b.titel, "—"), { bold: true })], { breedte: breedtes[0] }),
    cel([celTekst(BRON_TYPE_LABELS[b.type] ?? "—")], { breedte: breedtes[1] }),
    cel([celTekst(datumNl(b.datum))], { breedte: breedtes[2] }),
    cel([celTekst(HERKOMST_LABELS[b.herkomst] ?? "—")], { breedte: breedtes[3] }),
    cel([celTekst(b.versieVan ? bronLabel(ba, b.versieVan) : "—")], { breedte: breedtes[4] }),
    statusCel(bronStatus(b), breedtes[5]),
  ]);
  return [
    kop1("Deel 1 · Register", true),
    tekst(`${actief.length} bronnen · ${geanalyseerd} geanalyseerd`, { bold: true, color: TEXT_SECONDARY }, { na: 160 }),
    actief.length > 0
      ? tabel(["Titel", "Type", "Datum", "Herkomst", "Versie van", "Status"], breedtes, rijen)
      : tekst("Nog geen bronnen in het register.", { color: TEXT_SECONDARY }),
  ];
}

// ---------- 2 Oordeel en dekking per werkstroom ----------

function dekkingCelInhoud(cellen: DekkingCel[]): Paragraph[] {
  if (cellen.length === 0) return [celTekst(TE_BEPALEN, { italics: true, color: TEXT_SECONDARY })];
  const uit: Paragraph[] = [];
  for (const c of cellen) {
    uit.push(
      new Paragraph({
        spacing: { after: 30, line: 264 },
        children: [run(of(c.bronTitel, "—"), { bold: true, size: G.tabel }), run(` — ${of(c.dekt)}`, { size: G.tabel })],
      }),
    );
    const cr = citaatRuns(c.citaat, c.vindplaats, c.citaatGeverifieerd);
    if (cr.length > 0) uit.push(new Paragraph({ spacing: { after: 80, line: 264 }, children: cr }));
  }
  return uit;
}

function deelDekking(ba: BronnenAnalyse, werkstromen: { id: string; naam: string }[]): Inhoud {
  const uit: Inhoud = [
    kop1("Deel 2 · Oordeel en dekking per werkstroom"),
    tekst(
      "Per werkstroom: kan hij starten (voorstel), wat hebben we al, wat daarvan is bruikbaar en wat is nog nodig.",
      { color: TEXT_SECONDARY },
      { na: 160 },
    ),
  ];
  if (werkstromen.length === 0) {
    uit.push(tekst(`Geen werkstromen in het organigram: ${TE_BEPALEN}.`, { color: TEXT_SECONDARY }));
    return uit;
  }
  const matrix = berekenDekkingMatrix(ba, werkstromen);
  const breedtes = [3400, 3000, 2960];
  for (const rij of matrix) {
    uit.push(kop2(of(rij.naam, "—")));
    const o = ba.werkstroomOordelen.find((x) => x.werkstroom === rij.werkstroom);
    if (!o) {
      uit.push(alinea([run("Oordeel: ", { bold: true }), run(TE_BEPALEN, { italics: true, color: TEXT_SECONDARY })]));
    } else {
      const runs: TextRun[] = [run("Oordeel: ", { bold: true }), run(OORDEEL_LABELS[o.oordeel], { bold: true, color: CITO_BLUE })];
      if (schoon(o.wachtOp)) runs.push(run(` ${schoon(o.wachtOp)}`));
      if (o.voorstel) runs.push(...pil(VOORSTEL_LABEL));
      uit.push(alinea(runs, { na: 60 }));
      if (schoon(o.toelichting)) uit.push(tekst(schoon(o.toelichting), { color: TEXT_SECONDARY }, { na: 120 }));
    }
    const nogNodig: Paragraph[] =
      rij.nogNodig.length === 0
        ? [celTekst(TE_BEPALEN, { italics: true, color: TEXT_SECONDARY })]
        : rij.nogNodig.map(
            (n) =>
              new Paragraph({
                spacing: { after: 60, line: 264 },
                children: [
                  run(of(n.tekst), { size: G.tabel }),
                  run(`  (bron: ${of(n.bron, "—")})`, { size: G.tabel, color: TEXT_SECONDARY }),
                ],
              }),
          );
    uit.push(
      tabel(["Wat hebben we al", "Bruikbaar", "Nog nodig"], breedtes, [
        [
          cel(dekkingCelInhoud(rij.watHebbenWeAl), { breedte: breedtes[0] }),
          cel(dekkingCelInhoud(rij.bruikbaar), { breedte: breedtes[1] }),
          cel(nogNodig, { breedte: breedtes[2] }),
        ],
      ]),
    );
    const conclusie = schoon(ba.werkstroomConclusies[rij.werkstroom]);
    if (conclusie) {
      uit.push(alinea([run("Conclusie: ", { bold: true, color: CITO_BLUE }), run(conclusie)], { voor: 120, na: 120 }));
    } else {
      uit.push(wit(120));
    }
  }
  return uit;
}

// ---------- 3 De vier punten ----------

function deelPunten(ba: BronnenAnalyse): Inhoud {
  const uit: Inhoud = [
    kop1("Deel 3 · De vier punten"),
    alinea([run("Bron: ", { bold: true, color: TEXT_SECONDARY }), run(GEEL_PUNTEN_BRON, { italics: true, color: TEXT_SECONDARY })], {
      na: 160,
    }),
  ];
  for (const p of berekenPuntenOverzicht(ba)) {
    const info = GEEL_PUNTEN.find((g) => g.id === p.punt);
    const inhoud: Paragraph[] = [
      new Paragraph({
        spacing: { after: 60 },
        children: [run(`${p.nummer}  `, { bold: true, size: G.h2, color: CITO_BLUE }), run(p.titel, { bold: true, size: G.h2, color: TEXT_PRIMARY })],
      }),
    ];
    if (info?.omschrijving) inhoud.push(celTekst(info.omschrijving));
    if (p.noot) inhoud.push(celTekst(`Noot: ${p.noot}`, { italics: true, color: TEXT_SECONDARY }));

    inhoud.push(celTekst("WAT IS ER AL", { bold: true, color: TEXT_SECONDARY }));
    if (p.watErAl.length === 0) inhoud.push(celTekst(TE_BEPALEN, { italics: true, color: TEXT_SECONDARY }));
    for (const w of p.watErAl) {
      inhoud.push(
        new Paragraph({
          spacing: { after: 30, line: 264 },
          indent: { left: 200 },
          children: [run(of(w.watErAlIs), { size: G.tabel }), run(`  (bron: ${of(w.bronTitel, "—")})`, { size: G.tabel, color: TEXT_SECONDARY })],
        }),
      );
      const cr = citaatRuns(w.citaat, w.vindplaats, w.citaatGeverifieerd);
      if (cr.length > 0) inhoud.push(new Paragraph({ spacing: { after: 80, line: 264 }, indent: { left: 200 }, children: cr }));
    }

    inhoud.push(celTekst("ACTIES NOG TE DOEN", { bold: true, color: TEXT_SECONDARY }));
    if (p.acties.length === 0) inhoud.push(celTekst(TE_BEPALEN, { italics: true, color: TEXT_SECONDARY }));
    for (const a of p.acties) {
      inhoud.push(
        new Paragraph({
          spacing: { after: 40, line: 264 },
          indent: { left: 200 },
          children: [run(of(a.tekst), { size: G.tabel }), run(`  (bron: ${of(a.bron, "—")})`, { size: G.tabel, color: TEXT_SECONDARY })],
        }),
      );
    }

    const conclusie = schoon(ba.puntConclusies[p.punt]);
    inhoud.push(
      new Paragraph({
        spacing: { before: 60, after: 40 },
        children: [run("Conclusie: ", { bold: true, size: G.tabel }), run(conclusie || TE_BEPALEN, { size: G.tabel, italics: !conclusie })],
      }),
    );
    uit.push(kader(inhoud, GEEL, GEEL_RAND), wit(200));
  }
  return uit;
}

// ---------- 4 Dit kan nu in gang en Nog nodig ----------

function werkstroomNaam(werkstromen: { id: string; naam: string }[], id: string | undefined): string {
  if (!id) return "—";
  return schoon(werkstromen.find((w) => w.id === id)?.naam) || "—";
}

function deelActies(ba: BronnenAnalyse, werkstromen: { id: string; naam: string }[]): Inhoud {
  const uit: Inhoud = [kop1("Deel 4 · Dit kan nu in gang en Nog nodig"), kop2("Dit kan nu in gang")];
  if (ba.kanNuInGang.length === 0) {
    uit.push(tekst(TE_BEPALEN, { italics: true, color: TEXT_SECONDARY }));
  } else {
    // per werkstroom, in de volgorde van het organigram; onbekende werkstromen achteraan
    const volgorde = [...werkstromen.map((w) => w.id)];
    for (const k of ba.kanNuInGang) if (!volgorde.includes(k.werkstroom)) volgorde.push(k.werkstroom);
    for (const wId of volgorde) {
      const items = ba.kanNuInGang.filter((k) => k.werkstroom === wId);
      if (items.length === 0) continue;
      uit.push(label(werkstroomNaam(werkstromen, wId), CITO_BLUE));
      for (const k of items) {
        const runs: TextRun[] = [run(of(k.actie), { size: G.tabel, bold: true })];
        runs.push(run(`  · ${KAN_NU_STATUS_LABELS[k.status]}`, { size: G.tabel, color: TEXT_SECONDARY }));
        if (k.status === "voorstel") runs.push(...pil(VOORSTEL_LABEL));
        uit.push(opsomming(runs));
        const onderbouwing = k.onderbouwing.map((id) => bronLabel(ba, id)).filter((t) => t !== "—");
        uit.push(
          tekst(`Onderbouwing: ${onderbouwing.length > 0 ? onderbouwing.join(" · ") : TE_BEPALEN}`, { size: G.tabel, color: TEXT_SECONDARY }, { links: 360, na: 80 }),
        );
      }
    }
  }

  uit.push(kop2("Nog nodig / te bepalen"));
  if (ba.nogNodig.length === 0) {
    uit.push(tekst(TE_BEPALEN, { italics: true, color: TEXT_SECONDARY }));
  } else {
    const breedtes = [3000, 1900, 2200, 900, 1360];
    const rijen = ba.nogNodig.map((n) => {
      const waar = [
        n.werkstroom ? werkstroomNaam(werkstromen, n.werkstroom) : "",
        n.punt ? GEEL_PUNTEN.find((g) => g.id === n.punt)?.titel ?? "" : "",
      ]
        .filter(Boolean)
        .join(" · ");
      return [
        cel([celTekst(of(n.tekst))], { breedte: breedtes[0] }),
        cel([celTekst(waar || "—")], { breedte: breedtes[1] }),
        cel([celTekst(of(n.actie))], { breedte: breedtes[2] }),
        cel([celTekst(NOG_NODIG_STATUS_LABELS[n.status])], { breedte: breedtes[3] }),
        cel([celTekst(of(n.bron, "—"), { color: TEXT_SECONDARY })], { breedte: breedtes[4] }),
      ];
    });
    uit.push(tabel(["Wat is nodig", "Werkstroom / punt", "Actie", "Status", "Bron"], breedtes, rijen));
  }
  return uit;
}

// ---------- 5 Analyse per bron ----------

function deelPerBron(ba: BronnenAnalyse, werkstromen: { id: string; naam: string }[]): Inhoud {
  const uit: Inhoud = [kop1("Deel 5 · Analyse per bron")];
  const bronnen = actieveBronnen(ba).filter(isGeanalyseerd);
  if (bronnen.length === 0) {
    uit.push(tekst(`Nog geen bron geanalyseerd: ${TE_BEPALEN}.`, { color: TEXT_SECONDARY }));
    return uit;
  }
  for (const b of bronnen) {
    const a = b.analyse!;
    uit.push(kop2(of(b.titel, "—")));
    const k = STATUS_KLEUR[a.status];
    uit.push(
      alinea(
        [
          run(`${DOOR_LABELS[a.door]} · ${datumNl(a.geanalyseerdOp)}`, { size: G.tabel, color: TEXT_SECONDARY }),
          run("   "),
          new TextRun({
            text: ` ${BRON_STATUS_LABELS[a.status]} `,
            font: FONT,
            bold: true,
            size: G.label,
            color: k.tekst,
            shading: k.vulling ? { type: ShadingType.CLEAR, color: "auto", fill: k.vulling } : undefined,
          }),
        ],
        { na: 100 },
      ),
    );
    uit.push(tekst(of(a.samenvatting), {}, { na: 120 }));

    uit.push(label("Dekking per werkstroom"));
    if (a.dekking.length === 0) uit.push(tekst(TE_BEPALEN, { italics: true, color: TEXT_SECONDARY, size: G.tabel }));
    for (const d of a.dekking) {
      uit.push(opsomming([run(werkstroomNaam(werkstromen, d.werkstroom), { bold: true, size: G.tabel }), run(` — ${of(d.dekt)}`, { size: G.tabel })]));
      const cr = citaatRuns(d.citaat, d.vindplaats, d.citaatGeverifieerd);
      if (cr.length > 0) uit.push(alinea(cr, { links: 360, na: 40 }));
      const dr = domeinRuns(d.domeinen);
      if (dr.length > 0) uit.push(alinea([run("Domeinen: ", { size: G.tabel, color: TEXT_SECONDARY }), ...dr], { links: 360, na: 40 }));
      for (const op of d.openPunten) {
        uit.push(alinea([run("Open punt: ", { size: G.tabel, bold: true, color: TEXT_SECONDARY }), run(schoon(op), { size: G.tabel })], { links: 360, na: 40 }));
      }
    }

    if (a.punten.length > 0) {
      uit.push(label("Bijdrage aan de vier punten"));
      for (const p of a.punten) {
        const info = GEEL_PUNTEN.find((g) => g.id === p.punt);
        uit.push(
          opsomming([
            run(info ? `${info.nummer} ${info.titel}` : "—", { bold: true, size: G.tabel }),
            run(` — ${of(p.watErAlIs)}`, { size: G.tabel }),
          ]),
        );
        const cr = citaatRuns(p.citaat, p.vindplaats, p.citaatGeverifieerd);
        if (cr.length > 0) uit.push(alinea(cr, { links: 360, na: 40 }));
        for (const act of p.actiesNogTeDoen) {
          uit.push(alinea([run("Nog te doen: ", { size: G.tabel, bold: true, color: TEXT_SECONDARY }), run(schoon(act), { size: G.tabel })], { links: 360, na: 40 }));
        }
      }
    }
    uit.push(wit(160));
  }
  return uit;
}

// ---------- het document ----------

function voettekst(): Footer {
  return new Footer({
    children: [
      new Paragraph({
        alignment: AlignmentType.RIGHT,
        children: [
          run("Bronnenanalyse — Klant in Zicht · ", { size: G.label, color: TEXT_SECONDARY }),
          new TextRun({ children: ["Pagina ", PageNumber.CURRENT, " van ", PageNumber.TOTAL_PAGES], font: FONT, size: G.label, color: TEXT_SECONDARY }),
        ],
      }),
    ],
  });
}

/** Het Word-document (.docx) van de bronnenanalyse als Blob. */
export async function maakBronnenAnalyseWord(invoer: BronnenWordInvoer): Promise<Blob> {
  const { ba, werkstromen, sessieNaam } = invoer;
  const datum = datumNl(new Date().toISOString());

  const doc = new Document({
    creator: "Cito",
    lastModifiedBy: "Cito",
    title: "Bronnenanalyse — Klant in Zicht",
    description: "Wat hebben we al, wat is bruikbaar, wat ontbreekt",
    styles: {
      default: { document: { run: { font: FONT, size: G.body, color: TEXT_PRIMARY, language: { value: "nl-NL" } } } },
    },
    sections: [
      {
        properties: { page: { margin: { top: 1440, bottom: 1440, left: 1440, right: 1440 } } },
        footers: { default: voettekst() },
        children: [
          ...titelblok(ba, datum, sessieNaam),
          ...deelRegister(ba),
          ...deelDekking(ba, werkstromen),
          ...deelPunten(ba),
          ...deelActies(ba, werkstromen),
          ...deelPerBron(ba, werkstromen),
        ],
      },
    ],
  });

  return Packer.toBlob(doc);
}
