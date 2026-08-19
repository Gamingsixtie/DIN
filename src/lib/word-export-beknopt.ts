// Beknopt programmaplan — Word-export voor de programma-eigenaar.
//
// Kernversie van ~8 pagina's naast het volledige programmaplan (word-export.ts).
// Doel: in één zitting kunnen zien "wat hebben we besproken en besloten", met de
// DIN-kaartjes (baten per sector → gedeeld vermogen → de vier inspanningen) als
// liggende plaat op één A4.
//
// Methodiek-regels die hier hard gelden:
// - Niets zelf verzinnen. Alleen wat aantoonbaar in de sessie staat. Ontbrekende
//   verplichte velden tonen letterlijk "te bepalen" en landen in hoofdstuk 7.
// - Nooit een UUID in lopende tekst: altijd resolven naar title || description.
// - Domeinvolgorde is Cito outside-in: cultuur → mens → data & systemen → processen.
//   (StapSectorVertaling.tsx gebruikt in de app nog de klassieke volgorde; de
//   Word-exports volgen bewust de outside-in conventie, net als word-export.ts.)

import {
  Document,
  Packer,
  Paragraph,
  TextRun,
  Table,
  TableRow,
  TableCell,
  WidthType,
  AlignmentType,
  BorderStyle,
  TableLayoutType,
  PageOrientation,
  HeadingLevel,
} from "docx";
import type { DINSession, EffortDomain, SectorName } from "./types";
import { SECTORS, DOMAIN_LABELS } from "./types";
import {
  DOMEIN_OUTSIDE_IN_ORDER,
  SCENARIO_LABELS,
  CITO_BLUE,
  TEXT_PRIMARY,
  TEXT_SECONDARY,
  TEXT_MUTED,
  BORDER_COLOR,
  DOMAIN_COLORS,
  formatEuro,
  formatGetal,
  resolveItemLabels,
  sanitizeMeetjaarTekst,
  categorizeGaps,
  createNumberingState,
  numberedHeading,
  heading,
  subHeading,
  bodyText,
  emptyLine,
  methodiekIntro,
  styledCell,
  headerCell,
  createHeader,
  createFooter,
} from "./word-export-shared";
import type { NumberingState } from "./word-export-shared";
import { computeFocusView } from "./stap5-focus";
import { THREESIDES_DOMEINEN } from "./threesides-data";
import {
  BATEN_KPIS,
  DOELWAARDE_EISEN,
  DOELWAARDE_STATUS,
  KPI_EIGENAAR,
  KPI_MEETVERANTWOORDELIJKE,
} from "./kpi-model-data";

// ============================================================
// Constanten
// ============================================================

/**
 * Volgorde van de inspanningen in hoofdstuk 3: op prioriteit, niet outside-in.
 * Komt overeen met de cyclusvolgorde in het planningsvoorstel (Data & Systemen =
 * Cyclus 1, Processen = 2, Mens = 3, Cultuur = 4). De overzichtsplaat in
 * hoofdstuk 2 houdt wél de outside-in volgorde aan — dat is de methodische keten.
 */
const PRIORITEIT_ORDER: EffortDomain[] = ["data_systemen", "processen", "mens", "cultuur"];

/** De harde kant van de veranderstrategie — waar het zwaartepunt van deze cyclus ligt. */
const HARDE_KANT: EffortDomain[] = ["data_systemen", "processen"];

/** Eén consistente formulering voor alles wat nog niet is vastgelegd. */
export const TE_BEPALEN = "te bepalen";

/**
 * Hoofdstuk 2 (de kaartjes-plaat) in liggende oriëntatie, zodat 3 baten,
 * 3 vermogens en 4 inspanningen naast elkaar op één A4 passen. Zet op false
 * voor een document met één consistente staande oriëntatie.
 */
const KAARTJES_LIGGEND = true;

/**
 * Bruikbare tekstbreedte in twips bij marges van 1440.
 * docx gebruikt A4 als standaard: staand 11906 × 16838, liggend gespiegeld.
 */
const BREEDTE_STAAND = 11906 - 2 * 1440; // 9026
const BREEDTE_LIGGEND = 16838 - 2 * 1440; // 13958

/** DIN-keten accentkleuren — spiegel van globals.css (--din-doelen … --din-inspanningen). */
const ACCENT_DOELEN = CITO_BLUE;
const ACCENT_BATEN = "0066CC";
const ACCENT_VERMOGENS = "0891B2";
const ACCENT_INSPANNINGEN = "059669";

/** Domein-accent (randkleur) — globals.css --domain-*. Vulling komt uit DOMAIN_COLORS. */
const DOMAIN_ACCENT: Record<EffortDomain, string> = {
  mens: "2563EB",
  processen: "059669",
  data_systemen: "7C3AED",
  cultuur: "D97706",
  overig: "6B7280",
};

/** Sector-pill — hex-equivalent van SECTOR_COLORS (types.ts). */
const SECTOR_PILL: Record<string, { bg: string; kleur: string }> = {
  PO: { bg: "DBEAFE", kleur: "1E40AF" },
  VO: { bg: "D1FAE5", kleur: "065F46" },
  Zakelijk: { bg: "EDE9FE", kleur: "5B21B6" },
};

const VERMOGEN_VULLING = "E9FAF4";
/** Breedte van de accentbalk links van een kaartje, in twips (~1,6 mm). */
const ACCENT_BREEDTE = 90;
/** Horizontale celmarge binnen een rastercel (links + rechts). */
const RASTER_MARGE = 120;
const NIL_BORDER = { style: BorderStyle.NIL, size: 0, color: "FFFFFF" } as const;
const KAART_LIJN = { style: BorderStyle.SINGLE, size: 1, color: BORDER_COLOR } as const;
const KAART_STIPPEL = { style: BorderStyle.DASHED, size: 1, color: BORDER_COLOR } as const;

// ============================================================
// Kaartje-primitieven
// ============================================================
//
// docx kent geen afgeronde hoeken. De accentrand van de in-app kaartjes
// (border-l-3, StapSectorVertaling.tsx) wordt hier een smalle volledig gevulde
// cel links — die rendert als massieve balk, waar borders.left een haarlijn blijft.
// Pills zijn run-level shading met harde spaties als padding.
//
// Nestingslimiet: maximaal 2 niveaus (raster → kaartje). Dieper nesten breekt de
// kolombreedtes in LibreOffice/Google Docs.

export interface KaartjePill {
  tekst: string;
  bg: string;
  kleur: string;
}

export interface KaartjeSectie {
  label: string;
  tekst?: string;
  bullets?: string[];
}

export interface KaartjeOpts {
  /** Accentkleur van de balk links, hex zonder '#'. */
  accent: string;
  titel: string;
  eyebrow?: string;
  pills?: KaartjePill[];
  body?: string[];
  secties?: KaartjeSectie[];
  profiel?: { label: string; rijen: [string, string][] };
  meta?: [string, string][];
  vulling?: string;
  titelKleur?: string;
  tekstKleur?: string;
  gestippeld?: boolean;
  /** Strakkere marges en regelafstand — voor de overzichtsplaat in hoofdstuk 2. */
  compact?: boolean;
  /**
   * Absolute breedte in twips — verplicht. Een kaartje is een tabel met
   * layout FIXED; zonder expliciete columnWidths zet Word de kolommen op 100
   * twips en wrapt elk woord op een eigen regel (document werd zo 32 pagina's).
   */
  breedte: number;
}

function kaartLabel(tekst: string, kleur: string, compact?: boolean): Paragraph {
  return new Paragraph({
    spacing: compact ? { before: 0, after: 20 } : { before: 100, after: 40 },
    children: [
      new TextRun({
        text: tekst.toUpperCase(),
        bold: true,
        size: 16,
        color: kleur,
        font: "Calibri",
        characterSpacing: 20,
      }),
    ],
  });
}

/** De alinea's van een kaartje — gedeeld door kaartje() en kaartRij(). */
function kaartInhoud(o: KaartjeOpts): Paragraph[] {
  const titelKleur = o.titelKleur ?? CITO_BLUE;
  const tekstKleur = o.tekstKleur ?? TEXT_PRIMARY;
  const inhoud: Paragraph[] = [];

  if (o.eyebrow) {
    inhoud.push(kaartLabel(o.eyebrow, o.titelKleur ? titelKleur : o.accent, o.compact));
  }

  if (o.pills && o.pills.length > 0) {
    inhoud.push(
      new Paragraph({
        spacing: o.compact ? { after: 20 } : { after: 60 },
        children: o.pills.flatMap((p, i) => [
          ...(i > 0 ? [new TextRun({ text: "  ", size: 16, font: "Calibri" })] : []),
          //   = harde spatie: geeft de shading zijn "pill"-padding.
          new TextRun({
            text: ` ${p.tekst} `,
            bold: true,
            size: 16,
            color: p.kleur,
            font: "Calibri",
            shading: { fill: p.bg },
          }),
        ]),
      })
    );
  }

  inhoud.push(
    new Paragraph({
      spacing: o.compact ? { after: 20, line: 230 } : { after: 60, line: 280 },
      children: [
        new TextRun({
          text: o.titel,
          bold: true,
          size: o.compact ? 21 : 23,
          color: titelKleur,
          font: "Calibri",
        }),
      ],
    })
  );

  for (const alinea of o.body ?? []) {
    if (!alinea) continue;
    inhoud.push(
      new Paragraph({
        spacing: { after: 60, line: 280 },
        children: [new TextRun({ text: alinea, size: 20, color: tekstKleur, font: "Calibri" })],
      })
    );
  }

  for (const s of o.secties ?? []) {
    inhoud.push(kaartLabel(s.label, o.titelKleur ? titelKleur : TEXT_SECONDARY));
    if (s.tekst) {
      inhoud.push(
        new Paragraph({
          spacing: { after: 40, line: 270 },
          children: [new TextRun({ text: s.tekst, size: 19, color: tekstKleur, font: "Calibri" })],
        })
      );
    }
    for (const b of s.bullets ?? []) {
      inhoud.push(
        new Paragraph({
          spacing: { after: 20, line: 260 },
          indent: { left: 180 },
          children: [
            new TextRun({ text: "•  ", color: o.accent, font: "Calibri", size: 19 }),
            new TextRun({ text: b, size: 19, color: tekstKleur, font: "Calibri" }),
          ],
        })
      );
    }
  }

  if (o.profiel) {
    inhoud.push(kaartLabel(o.profiel.label, TEXT_SECONDARY));
    for (const [k, v] of o.profiel.rijen) {
      const ontbreekt = v === TE_BEPALEN;
      inhoud.push(
        new Paragraph({
          spacing: { after: 20, line: 260 },
          children: [
            new TextRun({ text: `${k}: `, bold: true, size: 19, color: TEXT_SECONDARY, font: "Calibri" }),
            new TextRun({
              text: v,
              size: 19,
              color: ontbreekt ? TEXT_MUTED : tekstKleur,
              italics: ontbreekt,
              font: "Calibri",
            }),
          ],
        })
      );
    }
  }

  for (const [k, v] of o.meta ?? []) {
    const ontbreekt = v === TE_BEPALEN;
    inhoud.push(
      new Paragraph({
        spacing: o.compact ? { before: 10, after: 0 } : { before: 40, after: 0 },
        children: [
          new TextRun({ text: `${k}: `, bold: true, size: 18, color: TEXT_SECONDARY, font: "Calibri" }),
          new TextRun({
            text: v,
            size: 18,
            color: ontbreekt ? TEXT_MUTED : TEXT_SECONDARY,
            italics: ontbreekt,
            font: "Calibri",
          }),
        ],
      })
    );
  }

  return inhoud;
}

function accentCel(kleur: string): TableCell {
  return new TableCell({
    width: { size: ACCENT_BREEDTE, type: WidthType.DXA },
    shading: { fill: kleur },
    borders: { top: NIL_BORDER, bottom: NIL_BORDER, left: NIL_BORDER, right: NIL_BORDER },
    margins: { top: 0, bottom: 0, left: 0, right: 0 },
    children: [new Paragraph({ spacing: { after: 0 }, children: [] })],
  });
}

function inhoudCel(o: KaartjeOpts, breedte: number): TableCell {
  const lijn = o.gestippeld ? KAART_STIPPEL : KAART_LIJN;
  return new TableCell({
    width: { size: breedte, type: WidthType.DXA },
    shading: { fill: o.vulling ?? "FFFFFF" },
    borders: { top: lijn, bottom: lijn, right: lijn, left: NIL_BORDER },
    margins: o.compact
      ? { top: 60, bottom: 60, left: 130, right: 130 }
      : { top: 110, bottom: 110, left: 170, right: 170 },
    children: kaartInhoud(o),
  });
}

/** Eén kaartje over de volle breedte: accentbalk links + inhoudscel. */
export function kaartje(o: KaartjeOpts): Table {
  const inhoudBreedte = Math.max(o.breedte - ACCENT_BREEDTE, 600);
  return new Table({
    width: { size: ACCENT_BREEDTE + inhoudBreedte, type: WidthType.DXA },
    layout: TableLayoutType.FIXED,
    columnWidths: [ACCENT_BREEDTE, inhoudBreedte],
    borders: {
      top: NIL_BORDER, bottom: NIL_BORDER, left: NIL_BORDER, right: NIL_BORDER,
      insideHorizontal: NIL_BORDER, insideVertical: NIL_BORDER,
    },
    rows: [new TableRow({ cantSplit: true, children: [accentCel(o.accent), inhoudCel(o, inhoudBreedte)] })],
  });
}

/**
 * Meerdere kaartjes naast elkaar als ÉÉN platte tabel: per kaart twee kolommen
 * (accentbalk + inhoud), met een lege tussenkolom als tussenruimte.
 *
 * Bewust niet genest: in één tabelrij delen alle cellen dezelfde rijhoogte, dus
 * de kaartjes lijnen onderaan uit en de accentbalken lopen over de volle hoogte.
 * Met geneste tabellen hield elk kaartje zijn eigen hoogte en werd de rij rafelig.
 */
export function kaartRij(kaarten: KaartjeOpts[], totaleBreedte: number): Table {
  const tussen = 150;
  const n = kaarten.length;
  const kaartBreedte = Math.floor((totaleBreedte - (n - 1) * tussen) / n);
  const inhoudBreedte = Math.max(kaartBreedte - ACCENT_BREEDTE, 600);

  const kolommen: number[] = [];
  const cellen: TableCell[] = [];
  kaarten.forEach((k, index) => {
    if (index > 0) {
      kolommen.push(tussen);
      cellen.push(
        new TableCell({
          width: { size: tussen, type: WidthType.DXA },
          borders: { top: NIL_BORDER, bottom: NIL_BORDER, left: NIL_BORDER, right: NIL_BORDER },
          margins: { top: 0, bottom: 0, left: 0, right: 0 },
          children: [new Paragraph({ spacing: { after: 0 }, children: [] })],
        })
      );
    }
    kolommen.push(ACCENT_BREEDTE, inhoudBreedte);
    cellen.push(accentCel(k.accent), inhoudCel(k, inhoudBreedte));
  });

  return new Table({
    width: { size: kolommen.reduce((a, b) => a + b, 0), type: WidthType.DXA },
    layout: TableLayoutType.FIXED,
    columnWidths: kolommen,
    borders: {
      top: NIL_BORDER, bottom: NIL_BORDER, left: NIL_BORDER, right: NIL_BORDER,
      insideHorizontal: NIL_BORDER, insideVertical: NIL_BORDER,
    },
    rows: [new TableRow({ cantSplit: true, children: cellen })],
  });
}

/** Volle-breedte accentbalk in Cito-blauw met witte tekst (focusdoel). */
export function balk(eyebrow: string, titel: string, breedte: number, body?: string): Table {
  return kaartje({
    accent: "001F3F",
    eyebrow,
    titel,
    breedte,
    body: body ? [body] : undefined,
    vulling: CITO_BLUE,
    titelKleur: "FFFFFF",
    tekstKleur: "E8EDF3",
  });
}

/** Verticale connector tussen twee lagen van het DIN-organigram. */
export function connector(compact?: boolean): Paragraph {
  return new Paragraph({
    alignment: AlignmentType.CENTER,
    spacing: compact ? { before: 0, after: 0, line: 200 } : { before: 60, after: 60 },
    children: [
      new TextRun({ text: "↓", color: BORDER_COLOR, size: compact ? 18 : 28, font: "Calibri" }),
    ],
  });
}

// ============================================================
// Selectors — puur, zonder docx, los testbaar
// ============================================================

export type ScenarioK = "optimaal" | "plus20" | "min20" | "advies";

export interface OpenPunt {
  hoofdstuk: string;
  tekst: string;
}

export interface InspanningBeknopt {
  domein: EffortDomain;
  titel: string;
  beschrijving: string;
  beargumentatie: string;
  actie: "combineren" | "apart_houden";
  vermogenImpact: { sector: string; impact: string }[];
  dossier: { label: string; waarde: string }[];
  eigenaar: string;
  inspanningsleider: string;
  gebundeld: string[];
  investering: string;
  periode: string;
}

export interface PerJaarBeknopt {
  jaar: number;
  outOfPocket: number;
  interneUren: number;
  interneKosten: number;
  totaal: number;
}

export interface GeldBeknopt {
  scenario: ScenarioK;
  label: string;
  scenarioVastgelegd: boolean;
  outOfPocket: number;
  interneKosten: number;
  interneUren: number;
  totaal: number;
  aantalJaren: number | null;
  perJaar: PerJaarBeknopt[];
  perInspanning: { domein: EffortDomain; titel: string; euro: number; aandeel: number | null }[];
  stuurgroepNotitie: string;
}

export interface BundelBeknopt {
  domein: EffortDomain;
  titel: string;
  cyclus: string;
  periode: string;
  mijlpalen: string[];
}

export interface FaseBeknopt {
  domein: EffortDomain;
  fase2026: string;
  budget2026: string;
}

export interface BeknoptData {
  naam: string;
  visie: string;
  focusDoel: { naam: string; beschrijving: string } | null;
  overigeDoelen: { rank: number; naam: string }[];
  alleDoelen: { rank: number; naam: string; isFocus: boolean }[];
  inScope: string[];
  buitenCyclus: string[];
  batenPerSector: {
    sector: SectorName;
    kaarten: { titel: string; dekking: "geraakt" | "risico" | null; risico: string }[];
  }[];
  vermogensGroepen: {
    omschrijving: string;
    reden: string;
    dekkingTekst: string;
    vermogens: { sector: string; titel: string }[];
  }[];
  inspanningen: InspanningBeknopt[];
  domeinenGecombineerd: number;
  domeinenApart: number;
  geld: GeldBeknopt | null;
  /** Looptijd van de raming — NIET die van de bundelplanning; die is korter. */
  looptijd: { startJaar: number; eindJaar: number; aantalJaren: number } | null;
  /** Aandeel van de harde kant (Data & Systemen + Processen) in de raming. */
  zwaartepunt: { euro: number; aandeel: number } | null;
  fasering: FaseBeknopt[];
  planning: {
    samenvatting: string;
    toelichting: string;
    bundels: BundelBeknopt[];
    /** Zin die de startvolgorde uit de cyclusnummers benoemt. */
    volgordeZin: string;
  } | null;
  organisatie: { rijen: [string, string, string][]; ritme: string; escalatie: string } | null;
  gaps: {
    volgendeCyclus: string[];
    echteGaps: string[];
    batenZonderVermogen: string[];
    vermogensZonderInspanning: string[];
  };
  focusConflict: string;
  openstaand: OpenPunt[];
}

/**
 * Het scenario waarmee de beknopte versie rekent.
 *
 * stap8.actiefScenario is letterlijk de vastgelegde keuze van de programma-eigenaar
 * en daarmee het meest "besloten" feit in de sessie. Het volledige programmaplan
 * hardcodeert in §4.3 juist plus20 als stuurgroep-framing; die hardcode nemen we
 * hier bewust niet over — dat zou een keuze suggereren die niet is vastgelegd.
 */
export function kiesActiefScenario(session: DINSession): ScenarioK {
  const stepResults = session.crossAnalyseWizard?.stepResults;
  const stap8 = stepResults?.stap8;
  const actief = stap8?.actiefScenario as ScenarioK | undefined;
  if (actief && stap8?.scenarios?.[actief]) return actief;

  const scenarios = stepResults?.stap4?.begrotingAdvies?.scenarios;
  // Plus20 is het scenario waarop het programma is vastgesteld: het volledige
  // programmaplan hanteert het in §4.3 als aanbeveling aan de stuurgroep, de
  // presentatie rekent ermee en threesides-data.ts is erop gebaseerd
  // (budgetTotaalPlus20). Alleen een expliciete keuze in stap 8 gaat hier boven.
  if (scenarios?.plus20) return "plus20";
  if (scenarios?.advies) return "advies";
  return "optimaal";
}

function tekst(waarde: string | null | undefined): string {
  return (waarde ?? "").trim();
}

/**
 * Sorteersleutel voor domeinen: outside-in, en alles wat niet in de vier
 * inspanningsdomeinen valt (zoals "overig" — de post onvoorzien) achteraan.
 */
function domeinVolgorde(domein: EffortDomain): number {
  const i = DOMEIN_OUTSIDE_IN_ORDER.indexOf(domein);
  return i === -1 ? DOMEIN_OUTSIDE_IN_ORDER.length : i;
}

/**
 * Waarden die in de praktijk als "nog niet ingevuld" worden getypt. In de sessie
 * staan die als gewone tekst ("ntb", "NTB", "nader te bepalen"), waardoor ze
 * anders als vastgelegd antwoord in het document zouden belanden én uit de
 * openstaande-puntenlijst zouden vallen. Bewust géén "n.v.t." — dat is een
 * besluit, geen openstaand punt.
 */
const PLACEHOLDERS = new Set([
  "ntb",
  "n.t.b.",
  "n.t.b",
  "tbd",
  "t.b.d.",
  "te bepalen",
  "nader te bepalen",
  "nog te bepalen",
  "nader te bepalen.",
  "nog niet bekend",
  "volgt",
  "volgt nog",
  "?",
  "-",
  "--",
  "—",
]);

function isPlaceholder(waarde: string): boolean {
  return PLACEHOLDERS.has(waarde.toLowerCase().replace(/\s+/g, " ").trim());
}

/** Verplicht veld: leeg of een placeholder → "te bepalen" én een punt in hoofdstuk 7. */
function veld(
  waarde: string | null | undefined,
  hoofdstuk: string,
  label: string,
  open: OpenPunt[]
): string {
  const v = tekst(waarde);
  if (v.length > 0 && !isPlaceholder(v)) return v;
  open.push({ hoofdstuk, tekst: label });
  return TE_BEPALEN;
}

/** Interne uren: canonieke leesweg is stap4.stap7InterneUren; stap7 is legacy fallback. */
function leesInterneUren(session: DINSession) {
  const stepResults = session.crossAnalyseWizard?.stepResults;
  return stepResults?.stap4?.stap7InterneUren ?? stepResults?.stap7 ?? undefined;
}

function bouwGeld(session: DINSession, open: OpenPunt[]): GeldBeknopt | null {
  const stepResults = session.crossAnalyseWizard?.stepResults;
  const begroting = stepResults?.stap4?.begrotingAdvies;
  const interneUren = leesInterneUren(session);
  const stap8 = stepResults?.stap8;
  const scenario = kiesActiefScenario(session);

  const b = begroting?.scenarios?.[scenario];
  const i = interneUren?.scenarios?.[scenario];

  // Zelfde totalen-berekening als §4.3 van het volledige plan: out-of-pocket uit
  // de begroting + interne kosten uit stap 7. Niet uit stap8.totaalGeraamd, dat is afgeleid.
  const oop = b?.totaalGeraamdEuro ?? 0;
  const intK = i?.totaalKosten ?? 0;
  const intU = i?.totaalUren ?? 0;
  if (oop === 0 && intK === 0) return null;

  // perJaar: stap 8 is leidend, anders begroting + uren samenvoegen.
  // Let op: stap8.perJaar draagt runtime interneUren (uren) én interneKosten (euro);
  // dezelfde cast als word-export.ts §4.3 gebruikt.
  type PerJaarRuntime = {
    jaar: number;
    outOfPocket: number;
    interneUren: number;
    interneKosten?: number;
    totaal: number;
  };
  const uitStap8 = (stap8?.scenarios?.[scenario]?.perJaar ?? []) as PerJaarRuntime[];
  let perJaar: PerJaarBeknopt[];
  if (uitStap8.length > 0) {
    perJaar = uitStap8.map((p) => ({
      jaar: p.jaar,
      outOfPocket: p.outOfPocket,
      interneUren: p.interneUren,
      interneKosten: p.interneKosten ?? Math.max(p.totaal - p.outOfPocket, 0),
      totaal: p.totaal,
    }));
  } else {
    const begrPerJaar = b?.totalenPerJaar ?? [];
    const urenPerJaar = i?.totalenPerJaar ?? [];
    const alleJaren = Array.from(
      new Set([...begrPerJaar.map((x) => x.jaar), ...urenPerJaar.map((x) => x.jaar)])
    ).sort();
    perJaar = alleJaren.map((jaar) => {
      const bj = begrPerJaar.find((x) => x.jaar === jaar);
      const uj = urenPerJaar.find((x) => x.jaar === jaar);
      const jOop = bj?.euro ?? 0;
      const jInt = uj?.kosten ?? 0;
      return {
        jaar,
        outOfPocket: jOop,
        interneUren: uj?.uren ?? 0,
        interneKosten: jInt,
        totaal: jOop + jInt,
      };
    });
  }

  const perInspanning = (b?.inspanningen ?? [])
    .map((insp) => ({
      domein: insp.domein as EffortDomain,
      titel: tekst(insp.inspanningTitel),
      euro: insp.totaalEuro,
      // De begroting kent posten zonder percentage (bijv. "Post onvoorzien",
      // domein "overig"). Niet zelf uitrekenen — dan zou het document een getal
      // tonen dat niet in de bron staat.
      aandeel: Number.isFinite(insp.percentageTotaal) ? insp.percentageTotaal : null,
    }))
    .sort((x, y) => domeinVolgorde(x.domein) - domeinVolgorde(y.domein));

  const vastgelegd = Boolean(stap8?.actiefScenario && stap8?.scenarios?.[stap8.actiefScenario as ScenarioK]);
  if (!vastgelegd) {
    open.push({
      hoofdstuk: "Wat het kost",
      tekst:
        `Het scenario is nog niet vastgelegd in cross-analyse stap 8. Dit document rekent met ` +
        `"${SCENARIO_LABELS[scenario]}" — het scenario waarop het programma is vastgesteld.`,
    });
  }

  return {
    scenario,
    label: SCENARIO_LABELS[scenario],
    scenarioVastgelegd: vastgelegd,
    outOfPocket: oop,
    interneKosten: intK,
    interneUren: intU,
    totaal: oop + intK,
    aantalJaren: b?.aantalJaren ?? null,
    perJaar,
    perInspanning,
    stuurgroepNotitie: tekst(stap8?.stuurgroepNotitie),
  };
}

function bouwInspanningen(session: DINSession, open: OpenPunt[]): InspanningBeknopt[] {
  const stepResults = session.crossAnalyseWizard?.stepResults;
  const subEfforts = stepResults?.stap4?.subEffortAnalysis ?? [];
  const begroting = stepResults?.stap4?.begrotingAdvies;
  const scenario = kiesActiefScenario(session);
  const begrotingsposten = begroting?.scenarios?.[scenario]?.inspanningen ?? [];
  const bundels = session.planningVoorstel?.bundelPlanning ?? [];

  // Eén inspanning per domein, in outside-in volgorde. Bij meerdere groepen per
  // domein wint de gecombineerde (die is cross-sectoraal en dus het besluit).
  const perDomein = DOMEIN_OUTSIDE_IN_ORDER.map((domein) => {
    const kandidaten = subEfforts.filter((s) => s.domein === domein);
    return kandidaten.find((s) => s.actie === "combineren") ?? kandidaten[0] ?? null;
  });

  const resultaat: InspanningBeknopt[] = [];

  perDomein.forEach((se, index) => {
    const domein = DOMEIN_OUTSIDE_IN_ORDER[index];
    if (!se) return;

    const gebundeld = Array.from(new Set(resolveItemLabels(se.items ?? [], session)));
    const titel =
      tekst(se.titel) || tekst(se.voorgesteldeNaam) || gebundeld.join(" + ") || DOMAIN_LABELS[domein];
    const hoofdstuk = "De vier inspanningen";
    const dossier = se.dossier;

    const post = begrotingsposten.find((p) => p.domein === domein);
    let investering: string;
    if (post) {
      investering = `${formatEuro(post.totaalEuro)} (${Math.round(post.percentageTotaal)}% van het totaal)`;
    } else if (tekst(dossier?.kostenraming) && !isPlaceholder(tekst(dossier?.kostenraming))) {
      investering = tekst(dossier?.kostenraming);
    } else {
      investering = TE_BEPALEN;
      open.push({ hoofdstuk, tekst: `Investering voor "${titel}" (${DOMAIN_LABELS[domein]})` });
    }

    // Nooit effort.quarter gebruiken: dat staat in de praktijk op "Nader te bepalen".
    const bundel = bundels.find((bd) => bd.domein === domein);
    const start = tekst(bundel?.startKwartaal);
    const eind = tekst(bundel?.eindKwartaal);
    let periode: string;
    if (start && eind) {
      const cyclus = tekst(bundel?.cyclusLabel);
      periode = `${start} – ${eind}${cyclus ? ` (${cyclus})` : ""}`;
    } else {
      periode = TE_BEPALEN;
      open.push({ hoofdstuk, tekst: `Periode voor "${titel}" (${DOMAIN_LABELS[domein]})` });
    }

    resultaat.push({
      domein,
      titel,
      beschrijving: tekst(se.beschrijving),
      beargumentatie: tekst(se.beargumentatie) || tekst(se.reden),
      actie: se.actie,
      vermogenImpact: (se.vermogenImpact ?? [])
        .map((vi) => ({ sector: vi.sectorId as string, impact: tekst(vi.impact) }))
        .filter((vi) => vi.impact.length > 0),
      dossier: [
        ["Eigenaar", veld(dossier?.eigenaar, hoofdstuk, `Eigenaar van "${titel}"`, open)],
        [
          "Inspanningsleider",
          veld(dossier?.inspanningsleider, hoofdstuk, `Inspanningsleider van "${titel}"`, open),
        ],
        [
          "Verwacht resultaat",
          veld(dossier?.verwachtResultaat, hoofdstuk, `Verwacht resultaat van "${titel}"`, open),
        ],
        [
          "Randvoorwaarden",
          veld(dossier?.randvoorwaarden, hoofdstuk, `Randvoorwaarden van "${titel}"`, open),
        ],
      ].map(([label, waarde]) => ({ label, waarde })),
      eigenaar: veld(dossier?.eigenaar, hoofdstuk, `Eigenaar van "${titel}"`, open),
      inspanningsleider: veld(
        dossier?.inspanningsleider,
        hoofdstuk,
        `Inspanningsleider van "${titel}"`,
        open
      ),
      gebundeld,
      investering,
      periode,
    });
  });

  return resultaat;
}

function bouwVermogensGroepen(session: DINSession) {
  const stepResults = session.crossAnalyseWizard?.stepResults;
  const groepen = stepResults?.stap2?.vermogenGelijkenisGroepen ?? [];
  const subEfforts = stepResults?.stap4?.subEffortAnalysis ?? [];

  return groepen.map((groep) => {
    // Zelfde telling als DomainBalanceBadge in StapSectorVertaling.tsx.
    const gedekt = new Set(
      subEfforts.filter((s) => s.groepId === groep.id && s.actie === "combineren").map((s) => s.domein)
    );
    const mist = DOMEIN_OUTSIDE_IN_ORDER.filter((d) => !gedekt.has(d));
    const dekkingTekst =
      `Dekt ${gedekt.size} van 4 domeinen` +
      (mist.length > 0 ? ` — mist ${mist.map((d) => DOMAIN_LABELS[d]).join(", ")}` : "");

    const vermogens = (groep.vermogenIds ?? [])
      .map((id) => session.capabilities.find((c) => c.id === id))
      .filter((c): c is NonNullable<typeof c> => Boolean(c))
      .map((c) => ({ sector: c.sectorId, titel: tekst(c.title) || tekst(c.description) }))
      .filter((v) => v.titel.length > 0)
      // Zelfde sectorvolgorde als de batenrij erboven, anders staan de kolommen kriskras.
      .sort((a, b) => SECTORS.indexOf(a.sector as never) - SECTORS.indexOf(b.sector as never));

    return {
      omschrijving: tekst(groep.gezamenlijkeOmschrijving),
      reden: tekst(groep.reden),
      dekkingTekst,
      vermogens,
    };
  });
}

function bouwPlanning(session: DINSession, open: OpenPunt[]) {
  const planning = session.planningVoorstel;
  const bundels = planning?.bundelPlanning ?? [];
  if (!planning || bundels.length === 0) {
    open.push({
      hoofdstuk: "Wanneer",
      tekst: "De planning is nog niet vastgesteld — genereer het voorstel in stap 6 van de cross-analyse.",
    });
    return null;
  }

  // Op cyclus, niet op domein: een planningstabel leest chronologisch. Valt terug
  // op de prioriteitsvolgorde als er geen cyclusnummer in het label staat.
  const cyclusNr = (label: string): number => {
    const m = /(\d+)/.exec(label ?? "");
    return m ? Number(m[1]) : 99;
  };
  const gesorteerd = [...bundels].sort((a, b) => {
    const verschil = cyclusNr(a.cyclusLabel) - cyclusNr(b.cyclusLabel);
    if (verschil !== 0) return verschil;
    return (
      PRIORITEIT_ORDER.indexOf(a.domein as EffortDomain) -
      PRIORITEIT_ORDER.indexOf(b.domein as EffortDomain)
    );
  });

  // De startvolgorde uit de cyclusnummers — dat is de harde bron, niet het proza.
  const volgorde = gesorteerd
    .filter((bd) => cyclusNr(bd.cyclusLabel) < 99)
    .map((bd) => `${tekst(bd.cyclusLabel)}: ${DOMAIN_LABELS[bd.domein as EffortDomain]}`);
  const eersteTwee = gesorteerd.slice(0, 2).map((bd) => DOMAIN_LABELS[bd.domein as EffortDomain]);
  const volgordeZin =
    eersteTwee.length === 2
      ? `Het zwaartepunt ligt vooraan: ${eersteTwee[0]} en ${eersteTwee[1]} starten als eerste. ` +
        `Volgorde van de cycli — ${volgorde.join(" · ")}.`
      : volgorde.length > 0
        ? `Volgorde van de cycli — ${volgorde.join(" · ")}.`
        : "";

  // De AI-toelichting noemt soms een andere volgorde dan de cyclusnummers.
  // Niet stilzwijgend gladstrijken: als de domeinen in de tekst in een andere
  // volgorde staan dan de cycli, is dat een punt om vast te leggen.
  const proza = tekst(planning.samenvatting);
  if (proza) {
    const inTekst = gesorteerd
      .map((bd) => ({
        domein: bd.domein as EffortDomain,
        positie: proza.indexOf(DOMAIN_LABELS[bd.domein as EffortDomain]),
      }))
      .filter((x) => x.positie >= 0);
    if (inTekst.length >= 2) {
      const volgensTekst = [...inTekst].sort((a, b) => a.positie - b.positie).map((x) => x.domein);
      const volgensCyclus = inTekst.map((x) => x.domein);
      if (volgensTekst.join() !== volgensCyclus.join()) {
        open.push({
          hoofdstuk: "Wanneer",
          tekst:
            `De toelichting bij de planning noemt de domeinen in een andere volgorde ` +
            `(${volgensTekst.map((d) => DOMAIN_LABELS[d]).join(" → ")}) dan de cyclusnummers ` +
            `(${volgensCyclus.map((d) => DOMAIN_LABELS[d]).join(" → ")}). Leg vast welke leidend is.`,
        });
      }
    }
  }

  return {
    samenvatting: proza,
    toelichting: tekst(planning.toelichting),
    volgordeZin,
    bundels: gesorteerd.map((bd) => {
      const start = tekst(bd.startKwartaal);
      const eind = tekst(bd.eindKwartaal);
      return {
        domein: bd.domein as EffortDomain,
        titel: tekst(bd.titel),
        cyclus: tekst(bd.cyclusLabel) || TE_BEPALEN,
        periode: start && eind ? `${start} – ${eind}` : TE_BEPALEN,
        mijlpalen: (bd.mijlpalen ?? [])
          .map((m) => `${tekst(m.periode)}: ${tekst(m.mijlpaal)}`)
          .filter((s) => s.length > 2),
      };
    }),
  };
}

function bouwOrganisatie(session: DINSession, open: OpenPunt[]) {
  const po = session.programmaorganisatie;
  if (!po) return null;

  const rijen: [string, string, string][] = [];
  const gezien = new Set<string>();
  const voegToe = (
    rolLabel: string,
    rol: { id?: string; rol?: string; naam?: string; functie?: string } | undefined
  ) => {
    if (!rol) return;
    const sleutel = `${tekst(rol.rol) || rolLabel}|${tekst(rol.naam)}`;
    if (gezien.has(sleutel)) return;
    gezien.add(sleutel);
    const naam = veld(rol.naam, "Wie", `Naam van de ${rolLabel.toLowerCase()}`, open);
    rijen.push([tekst(rol.rol) || rolLabel, naam, tekst(rol.functie) || "—"]);
  };

  voegToe("Opdrachtgever", po.opdrachtgever);
  voegToe("Programmamanager", po.programmamanager);

  // Er kan meer dan één programmamanager zijn. Het schema kent maar één veld,
  // dus extra programmamanagers staan in de kern- of stuurgroep; die halen we
  // hier op zodat ze naast elkaar in de tabel komen.
  const isProgrammamanager = (r: { rol?: string }) => /programmamanager/i.test(r.rol ?? "");
  [...(po.kerngroep ?? []), ...(po.stuurgroep ?? [])]
    .filter(isProgrammamanager)
    .forEach((r) => voegToe("Programmamanager", r));

  (po.domeineigenaren ?? []).forEach((d) => voegToe("Domeineigenaar", d));

  if (rijen.length === 0) return null;

  return {
    rijen,
    ritme: tekst(po.besluitvormingsritme),
    escalatie: tekst(po.escalatiepad),
  };
}

/** Alles wat de beknopte export nodig heeft, één keer geresolved. */
export function verzamelBeknoptData(session: DINSession): BeknoptData {
  const open: OpenPunt[] = [];
  const focus = computeFocusView(session);
  const stepResults = session.crossAnalyseWizard?.stepResults;
  const subEfforts = stepResults?.stap4?.subEffortAnalysis ?? [];
  const gaps = categorizeGaps(session);

  const focusDoel = focus
    ? { naam: tekst(focus.focusGoal.name), beschrijving: tekst(focus.focusGoal.description) }
    : null;

  const geld = bouwGeld(session, open);

  // Looptijd komt uit de RAMING, niet uit de bundelplanning: die laatste dekt
  // alleen de eerste cycli en is korter, wat een tegenstrijdige pagina opleverde.
  const jaren = geld?.perJaar.map((x) => x.jaar) ?? [];
  const looptijd =
    jaren.length > 0
      ? { startJaar: Math.min(...jaren), eindJaar: Math.max(...jaren), aantalJaren: jaren.length }
      : null;

  const hardEuro = (geld?.perInspanning ?? [])
    .filter((x) => HARDE_KANT.includes(x.domein))
    .reduce((a, b) => a + b.euro, 0);
  const zwaartepunt =
    geld && geld.outOfPocket > 0 && hardEuro > 0
      ? { euro: hardEuro, aandeel: Math.round((hardEuro / geld.outOfPocket) * 100) }
      : null;

  const overigeDoelen = [...session.goals]
    .filter((g) => !focus || g.id !== focus.focusGoal.id)
    .sort((a, b) => (a.rank ?? 99) - (b.rank ?? 99))
    .map((g) => ({ rank: g.rank ?? 0, naam: tekst(g.name) }))
    .filter((g) => g.naam.length > 0);

  // Buiten deze cyclus — zelfde afleiding als overviewSection in het volledige plan.
  const buitenCyclus = [
    ...gaps.volgendeCyclus.map((g) => `Doel: ${tekst(g.name)} — wordt in volgende cyclus uitgewerkt`),
    ...(session.scope?.outScope ?? []).map((s) => tekst(s)),
  ].filter((s) => s.length > 0);

  const dekking = stepResults?.stap5?.batenDekking ?? [];
  const focusBenefits = focus?.focusBenefits ?? [];
  const batenPerSector = SECTORS.map((sector) => {
    const kaarten = focusBenefits
      .filter((b) => b.sectorId === sector)
      .map((b) => {
        const d = dekking.find((x) => x.baatId === b.id);
        return {
          titel: tekst(b.title) || tekst(b.description),
          dekking: d ? ((d.wordtGeraakt ? "geraakt" : "risico") as "geraakt" | "risico") : null,
          risico: tekst(d?.risico),
        };
      })
      .filter((k) => k.titel.length > 0);
    return { sector: sector as SectorName, kaarten };
  }).filter((s) => s.kaarten.length > 0);

  const gecombineerdeDomeinen = new Set(
    subEfforts.filter((s) => s.actie === "combineren").map((s) => s.domein)
  );
  const aparteDomeinen = new Set(
    subEfforts.filter((s) => s.actie === "apart_houden").map((s) => s.domein)
  );

  const focusDoelNaam = tekst(stepResults?.stap5?.focusDoelNaam);
  const focusConflict =
    focusDoelNaam && focusDoel && focusDoelNaam !== focusDoel.naam
      ? `Het focusdoel uit stap 5 ("${focusDoelNaam}") wijkt af van het doel met prioriteit 1 ("${focusDoel.naam}"). Leg vast welke van de twee leidend is.`
      : "";
  if (focusConflict) open.push({ hoofdstuk: "Waar het programma over gaat", tekst: focusConflict });

  return {
    naam: session.name,
    visie: tekst(session.vision?.beknopt),
    focusDoel,
    overigeDoelen,
    alleDoelen: [...session.goals]
      .sort((a, b) => (a.rank ?? 99) - (b.rank ?? 99))
      .map((g) => ({
        rank: g.rank ?? 0,
        naam: tekst(g.name),
        isFocus: Boolean(focus && g.id === focus.focusGoal.id),
      }))
      .filter((g) => g.naam.length > 0),
    inScope: (session.scope?.inScope ?? []).map((s) => tekst(s)).filter((s) => s.length > 0),
    buitenCyclus,
    batenPerSector,
    vermogensGroepen: bouwVermogensGroepen(session),
    inspanningen: bouwInspanningen(session, open),
    domeinenGecombineerd: gecombineerdeDomeinen.size,
    domeinenApart: aparteDomeinen.size,
    geld,
    looptijd,
    zwaartepunt,
    // 2026-fasen per domein uit de Plus20-raming (threesides-data.ts), in
    // prioriteitsvolgorde: Analyse → Inventarisatie → Behoefte → Bewustwording.
    fasering: PRIORITEIT_ORDER.map((domein) => {
      const t = THREESIDES_DOMEINEN.find((x) => x.domein === domein);
      return t ? { domein, fase2026: t.fase2026, budget2026: t.budget2026 } : null;
    }).filter((f): f is FaseBeknopt => f !== null),
    planning: bouwPlanning(session, open),
    organisatie: bouwOrganisatie(session, open),
    gaps: {
      volgendeCyclus: gaps.volgendeCyclus.map((g) => tekst(g.name)).filter((s) => s.length > 0),
      echteGaps: gaps.echteGapsGoals.map((g) => tekst(g.name)).filter((s) => s.length > 0),
      batenZonderVermogen: gaps.benefitsWithoutCaps
        .map((b) => (b ? tekst(b.title) || tekst(b.description) : ""))
        .filter((s) => s.length > 0),
      vermogensZonderInspanning: gaps.capsWithoutEfforts
        .map((c) => (c ? tekst(c.title) || tekst(c.description) : ""))
        .filter((s) => s.length > 0),
    },
    focusConflict,
    openstaand: open,
  };
}

/** De punten voor hoofdstuk 7, ontdubbeld met behoud van volgorde. */
export function verzamelOpenstaand(data: BeknoptData): OpenPunt[] {
  const gezien = new Set<string>();
  return data.openstaand.filter((p) => {
    const sleutel = `${p.hoofdstuk}|${p.tekst}`;
    if (gezien.has(sleutel)) return false;
    gezien.add(sleutel);
    return true;
  });
}

// ============================================================
// Hoofdstukken
// ============================================================

type Inhoud = (Paragraph | Table)[];
type Sectie = { properties: Record<string, unknown>; children: Inhoud };

const PAGINA_STAAND = {
  page: { margin: { top: 1440, right: 1440, bottom: 1440, left: 1440 } },
};
const PAGINA_LIGGEND = {
  page: {
    size: { orientation: PageOrientation.LANDSCAPE },
    margin: { top: 1440, right: 1440, bottom: 1440, left: 1440 },
  },
};

/** Rij kerncijfers: groot getal met label eronder, naast elkaar. */
function kerncijfers(tegels: { waarde: string; label: string }[], breedte: number): Table {
  const kol = Math.floor(breedte / tegels.length);
  return new Table({
    width: { size: breedte, type: WidthType.DXA },
    layout: TableLayoutType.FIXED,
    columnWidths: Array(tegels.length).fill(kol),
    borders: {
      top: NIL_BORDER, bottom: NIL_BORDER, left: NIL_BORDER, right: NIL_BORDER,
      insideHorizontal: NIL_BORDER, insideVertical: NIL_BORDER,
    },
    rows: [
      new TableRow({
        children: tegels.map(
          (t) =>
            new TableCell({
              width: { size: kol, type: WidthType.DXA },
              shading: { fill: "F4F7FA" },
              borders: {
                top: { style: BorderStyle.SINGLE, size: 14, color: CITO_BLUE },
                bottom: NIL_BORDER, left: NIL_BORDER, right: NIL_BORDER,
              },
              margins: { top: 140, bottom: 140, left: 160, right: 160 },
              children: [
                new Paragraph({
                  spacing: { after: 40 },
                  children: [
                    new TextRun({ text: t.waarde, bold: true, size: 30, color: CITO_BLUE, font: "Calibri" }),
                  ],
                }),
                new Paragraph({
                  spacing: { after: 0 },
                  children: [
                    new TextRun({
                      text: t.label.toUpperCase(),
                      bold: true,
                      size: 16,
                      color: TEXT_SECONDARY,
                      font: "Calibri",
                      characterSpacing: 20,
                    }),
                  ],
                }),
              ],
            })
        ),
      }),
    ],
  });
}

/** Strak laag-label op de overzichtsplaat — subHeading kost 12pt ruimte erboven. */
function plaatLabel(text: string): Paragraph {
  return new Paragraph({
    spacing: { before: 40, after: 40 },
    children: [
      new TextRun({
        text: text.toUpperCase(),
        bold: true,
        size: 16,
        color: TEXT_SECONDARY,
        font: "Calibri",
        characterSpacing: 20,
      }),
    ],
  });
}

function kop(text: string, state: NumberingState): Inhoud {
  return [
    numberedHeading(text, "h1", state),
    // Dunne accentlijn onder elke hoofdstukkop — geeft het document ritme.
    new Paragraph({
      spacing: { before: 0, after: 110 },
      border: { bottom: { style: BorderStyle.SINGLE, size: 10, color: CITO_BLUE, space: 2 } },
      children: [],
    }),
  ];
}

/** Bullet met hangende inspringing — vervolgregels lijnen uit onder de tekst. */
function opsomming(text: string): Paragraph {
  return new Paragraph({
    spacing: { after: 60, line: 280 },
    indent: { left: 400, hanging: 220 },
    children: [
      new TextRun({ text: "•  ", color: CITO_BLUE, font: "Calibri", size: 22 }),
      new TextRun({ text, size: 22, font: "Calibri", color: TEXT_PRIMARY }),
    ],
  });
}

function bronRegel(text: string): Paragraph {
  return bodyText(text, { italic: true, size: 17, color: TEXT_MUTED });
}

function tebepalenRegel(text: string): Paragraph {
  return bodyText(text, { italic: true, size: 20, color: TEXT_MUTED });
}

function tabel(kolommen: { kop: string; breedte: number }[], rijen: TableCell[][]): Table {
  return new Table({
    width: { size: 100, type: WidthType.PERCENTAGE },
    margins: { left: 80, right: 80 },
    rows: [
      // tableHeader: kopregel herhaalt zich als de tabel over een pagina breekt.
      new TableRow({ tableHeader: true, children: kolommen.map((k) => headerCell(k.kop, k.breedte)) }),
      ...rijen.map((cellen) => new TableRow({ children: cellen })),
    ],
  });
}

// --- Titelpagina + leeswijzer ---

function titelSectie(data: BeknoptData): Sectie {
  const datum = new Date().toLocaleDateString("nl-NL", {
    day: "numeric",
    month: "long",
    year: "numeric",
  });

  const ketenKolommen: { label: string; sub: string; kleur: string }[] = [
    { label: "Doelen", sub: "waar we heen willen", kleur: ACCENT_DOELEN },
    { label: "Baten", sub: "wat het oplevert", kleur: ACCENT_BATEN },
    { label: "Vermogens", sub: "wat we moeten kunnen", kleur: ACCENT_VERMOGENS },
    { label: "Inspanningen", sub: "wat we gaan doen", kleur: ACCENT_INSPANNINGEN },
  ];

  const kolBreedte = Math.floor(BREEDTE_STAAND / ketenKolommen.length);
  const leeswijzer = new Table({
    width: { size: BREEDTE_STAAND, type: WidthType.DXA },
    layout: TableLayoutType.FIXED,
    columnWidths: Array(ketenKolommen.length).fill(kolBreedte),
    borders: {
      top: NIL_BORDER,
      bottom: NIL_BORDER,
      left: NIL_BORDER,
      right: NIL_BORDER,
      insideHorizontal: NIL_BORDER,
      insideVertical: NIL_BORDER,
    },
    rows: [
      new TableRow({
        children: ketenKolommen.map(
          (k) =>
            new TableCell({
              width: { size: kolBreedte, type: WidthType.DXA },
              borders: { top: { style: BorderStyle.SINGLE, size: 12, color: k.kleur }, bottom: NIL_BORDER, left: NIL_BORDER, right: NIL_BORDER },
              margins: { top: 120, bottom: 80, left: 80, right: 80 },
              children: [
                new Paragraph({
                  spacing: { after: 30 },
                  children: [new TextRun({ text: k.label, bold: true, size: 20, color: k.kleur, font: "Calibri" })],
                }),
                new Paragraph({
                  spacing: { after: 0 },
                  children: [new TextRun({ text: k.sub, size: 16, color: TEXT_MUTED, font: "Calibri" })],
                }),
              ],
            })
        ),
      }),
    ],
  });

  return {
    properties: { page: { margin: { top: 2200, right: 1440, bottom: 1440, left: 1440 } } },
    children: [
      new Paragraph({
        spacing: { after: 120 },
        children: [
          new TextRun({ text: "PROGRAMMAPLAN", bold: true, size: 56, color: CITO_BLUE, font: "Calibri", characterSpacing: 40 }),
        ],
      }),
      new Paragraph({
        spacing: { after: 320 },
        children: [
          new TextRun({ text: "BEKNOPT — DE KERN", bold: true, size: 22, color: TEXT_SECONDARY, font: "Calibri", characterSpacing: 60 }),
        ],
      }),
      new Paragraph({
        spacing: { after: 100 },
        border: { top: { style: BorderStyle.SINGLE, size: 12, color: CITO_BLUE, space: 8 } },
        children: [],
      }),
      new Paragraph({
        spacing: { after: 80 },
        children: [new TextRun({ text: data.naam, bold: true, size: 36, color: CITO_BLUE, font: "Calibri" })],
      }),
      bodyText("Doelen-Inspanningennetwerk (DIN)", { size: 22, color: TEXT_SECONDARY }),
      bodyText("Methodiek: Werken aan Programma's (Prevaas & Van Loon)", { size: 18, color: TEXT_MUTED }),
      bodyText(datum, { size: 18, color: TEXT_MUTED }),
      emptyLine(280),
      subHeading("De DIN-keten in één oogopslag"),
      leeswijzer,
      emptyLine(200),
      bodyText(
        "Hoe-vraag (van links naar rechts): hoe bereiken we dit doel? " +
          "Waartoe-vraag (van rechts naar links): waartoe dient deze inspanning?",
        { italic: true, size: 18, color: TEXT_SECONDARY }
      ),
      emptyLine(280),
      bronRegel(
        "Dit is de kernversie voor de programma-eigenaar. De volledige onderbouwing — batenprofielen, " +
          "vermogensprofielen, RASCI, interne uren per rol en alle vier de scenario's — staat in het " +
          "complete programmaplan."
      ),
    ],
  };
}

// --- Besluiten in het kort ---

function besluitenSectie(data: BeknoptData): Sectie {
  // Ongenummerde kop: bewust NIET plainH1 — dat advanceert de h1-teller,
  // waardoor de hoofdstukken op 2 zouden beginnen.
  const children: Inhoud = [
    heading("Besluiten in het kort", HeadingLevel.HEADING_1),
    new Paragraph({
      spacing: { before: 0, after: 200 },
      border: { bottom: { style: BorderStyle.SINGLE, size: 10, color: CITO_BLUE, space: 2 } },
      children: [],
    }),
    emptyLine(140),
  ];

  // Kerncijfers bovenaan — waar de programma-eigenaar het eerst naar kijkt.
  const tegels: { waarde: string; label: string }[] = [];
  if (data.geld) {
    tegels.push({
      waarde: formatEuro(data.geld.totaal),
      label: data.geld.aantalJaren ? `totaal over ${data.geld.aantalJaren} jaar` : "totaal geraamd",
    });
  }
  if (data.inspanningen.length > 0) {
    tegels.push({ waarde: `${data.inspanningen.length}`, label: "gezamenlijke inspanningen" });
  }
  if (data.looptijd) {
    tegels.push({
      waarde: `${data.looptijd.startJaar} – ${data.looptijd.eindJaar}`,
      label: `looptijd raming (${data.looptijd.aantalJaren} jaar)`,
    });
  }
  if (tegels.length > 0) {
    children.push(kerncijfers(tegels, BREEDTE_STAAND));
    children.push(emptyLine(110));
  }

  // Waar het zwaartepunt ligt — de eerste vraag van de programma-eigenaar.
  if (data.zwaartepunt) {
    children.push(
      kaartje({
        accent: DOMAIN_ACCENT.data_systemen,
        breedte: BREEDTE_STAAND,
        eyebrow: "Zwaartepunt in deze cyclus",
        titel: "Data & Systemen en Processen",
        body: [
          `Samen ${formatEuro(data.zwaartepunt.euro)} van de raming (${data.zwaartepunt.aandeel}% ` +
            `van de out-of-pocket kosten). Dit is de harde kant van de veranderstrategie: eerst het ` +
            `klantbeeld en de werkprocessen op orde, zodat Mens en Cultuur daarop kunnen bouwen.`,
        ],
        vulling: "F7F5FD",
      })
    );
    children.push(emptyLine(110));
  }

  const punten: string[] = [];

  if (data.focusDoel) {
    const rest =
      data.overigeDoelen.length > 0
        ? ` De overige ${data.overigeDoelen.length} ${data.overigeDoelen.length === 1 ? "doelstelling volgt" : "doelstellingen volgen"} in een volgende cyclus.`
        : "";
    punten.push(`Focus ligt op één doel: ${data.focusDoel.naam}.${rest}`);
  }

  if (data.domeinenGecombineerd > 0) {
    punten.push(
      `${data.domeinenGecombineerd} van de 4 inspanningsdomeinen worden cross-sectoraal opgepakt` +
        (data.domeinenApart > 0 ? `; ${data.domeinenApart} blijven per sector apart.` : ".")
    );
  }

  if (data.inspanningen.length > 0) {
    punten.push(
      `De gezamenlijke inspanningen: ${data.inspanningen.map((i) => i.titel).join("; ")}.`
    );
  }

  if (data.geld) {
    const jaren = data.geld.aantalJaren ? ` over ${data.geld.aantalJaren} jaar` : "";
    punten.push(
      `Gerekend met het ${data.geld.label}${jaren}: ${formatEuro(data.geld.outOfPocket)} out-of-pocket ` +
        `en ${formatEuro(data.geld.interneKosten)} interne uren.`
    );
  }

  if (data.planning && data.planning.bundels.length > 0) {
    const periodes = data.planning.bundels.map((b) => b.periode).filter((p) => p !== TE_BEPALEN);
    if (periodes.length > 0) {
      const start = periodes.map((p) => p.split(" – ")[0]).sort()[0];
      const eind = periodes.map((p) => p.split(" – ")[1] ?? p).sort().slice(-1)[0];
      punten.push(
        `De eerste cycli lopen van ${start} tot en met ${eind}, verdeeld over ` +
          `${data.planning.bundels.length} ${data.planning.bundels.length === 1 ? "bundel" : "bundels"}. ` +
          `De raming kijkt verder vooruit (zie de looptijd hierboven).`
      );
    }
  }

  const open = verzamelOpenstaand(data);
  if (open.length > 0) {
    punten.push(
      `${open.length} ${open.length === 1 ? "punt is" : "punten zijn"} nog niet vastgelegd; die staan in dit document als “te bepalen”.`
    );
  }

  if (punten.length === 0) {
    children.push(
      tebepalenRegel(
        "Er is nog te weinig vastgelegd om besluiten samen te vatten. Werk de cross-analyse verder uit."
      )
    );
  } else {
    punten.forEach((p) => children.push(opsomming(p)));
  }

  children.push(emptyLine(120));
  children.push(
    bronRegel(
      "Alle cijfers en namen op deze pagina komen uit deze sessie: het DIN-netwerk, de cross-analyse " +
        "(stap 2, 4, 6, 7 en 8) en het planningsvoorstel. Er is niets bijgeschat."
    )
  );

  return { properties: PAGINA_STAAND, children };
}

// --- 1. Waar het programma over gaat ---

function waarOverSectie(data: BeknoptData, state: NumberingState): Sectie {
  const children: Inhoud = [...kop("Waar het programma over gaat", state)];

  if (data.visie) {
    children.push(subHeading("Programmavisie"));
    children.push(bodyText(data.visie, { bold: true, size: 24 }));
    children.push(emptyLine(120));
  }

  if (data.focusDoel) {
    children.push(
      balk("Focusdoel — prioriteit 1", data.focusDoel.naam, BREEDTE_STAAND, data.focusDoel.beschrijving)
    );
    children.push(emptyLine(110));
  }

  if (data.alleDoelen.length > 0) {
    // Alle drie de doelen tonen, met de focus gemarkeerd. Alleen "overige doelen"
    // laten zien liet de lijst bij 2 beginnen, wat las alsof doel 1 ontbrak.
    children.push(subHeading("De programmadoelen"));
    data.alleDoelen.forEach((g) =>
      children.push(
        opsomming(
          `${g.rank}. ${g.naam} — ${g.isFocus ? "focus in deze cyclus" : "volgt in een volgende cyclus"}`
        )
      )
    );
    children.push(emptyLine(110));
  }

  if (data.inScope.length > 0) {
    children.push(subHeading("Binnen scope"));
    data.inScope.forEach((s) => children.push(opsomming(s)));
  }

  if (data.buitenCyclus.length > 0) {
    children.push(subHeading("Buiten deze cyclus"));
    data.buitenCyclus.forEach((s) => children.push(opsomming(s)));
  }

  return { properties: PAGINA_STAAND, children };
}

// --- 2. Het DIN in één beeld — de kaartjes ---

function kaartjesSectie(data: BeknoptData, state: NumberingState): Sectie {
  const breedte = KAARTJES_LIGGEND ? BREEDTE_LIGGEND : BREEDTE_STAAND;
  const children: Inhoud = [...kop("Het DIN in één beeld", state)];

  children.push(
    bodyText(
      "Van focusdoel naar baten per sector, via het gedeelde vermogen naar de vier cross-sectorale " +
        "inspanningen. De uitwerking per inspanning staat in hoofdstuk 3.",
      { size: 18, color: TEXT_SECONDARY }
    )
  );

  if (data.focusDoel) {
    children.push(
      kaartje({
        accent: "001F3F",
        breedte,
        compact: true,
        eyebrow: "Focusdoel — prioriteit 1",
        titel: data.focusDoel.naam,
        vulling: CITO_BLUE,
        titelKleur: "FFFFFF",
        tekstKleur: "E8EDF3",
      })
    );
    children.push(connector(true));
  }

  // Laag 2 — baten per sector
  if (data.batenPerSector.length > 0) {
    children.push(plaatLabel("Baten per sector"));
    children.push(
      kaartRij(
        data.batenPerSector.map((s) => {
          const pill = SECTOR_PILL[s.sector] ?? { bg: "E5E7EB", kleur: "374151" };
          const eerste = s.kaarten[0];
          const pills: KaartjePill[] = [{ tekst: s.sector, bg: pill.bg, kleur: pill.kleur }];
          if (eerste?.dekking === "risico") pills.push({ tekst: "risico", bg: "FEE2E2", kleur: "991B1B" });
          return {
            accent: ACCENT_BATEN,
            breedte,
            compact: true,
            pills,
            titel: eerste?.titel ?? TE_BEPALEN,
            body: s.kaarten.slice(1).map((k) => k.titel),
          };
        }),
        breedte
      )
    );
    children.push(connector(true));
  }

  // Laag 3 — gedeeld vermogen: kop over de volle breedte, daaronder de sectorkaartjes
  data.vermogensGroepen.forEach((groep) => {
    children.push(
      kaartje({
        accent: ACCENT_VERMOGENS,
        breedte,
        compact: true,
        eyebrow: "Gedeeld vermogen — hefboomgroep",
        titel: groep.omschrijving || TE_BEPALEN,
        meta: [["Domeinbalans", groep.dekkingTekst]],
        vulling: VERMOGEN_VULLING,
      })
    );
    if (groep.vermogens.length > 0) {
      children.push(
        kaartRij(
          groep.vermogens.map((v) => {
            const pill = SECTOR_PILL[v.sector] ?? { bg: "E5E7EB", kleur: "374151" };
            return {
              accent: ACCENT_VERMOGENS,
              breedte,
              compact: true,
              pills: [{ tekst: v.sector, bg: pill.bg, kleur: pill.kleur }],
              titel: v.titel,
            };
          }),
          breedte
        )
      );
    }
    children.push(connector(true));
  });

  // Laag 4 — de vier inspanningen
  children.push(plaatLabel("Cross-sectorale inspanningen — de hefboomlaag"));
  children.push(
    kaartRij(
      DOMEIN_OUTSIDE_IN_ORDER.map((domein) => {
        const insp = data.inspanningen.find((i) => i.domein === domein);
        if (!insp) {
          return {
            accent: BORDER_COLOR,
            breedte,
            compact: true,
            pills: [{ tekst: DOMAIN_LABELS[domein], bg: DOMAIN_COLORS[domein], kleur: DOMAIN_ACCENT[domein] }],
            titel: "Geen gezamenlijke inspanning",
            gestippeld: true,
            tekstKleur: TEXT_MUTED,
            titelKleur: TEXT_MUTED,
          };
        }
        return {
          accent: DOMAIN_ACCENT[domein],
          breedte,
          compact: true,
          vulling: DOMAIN_COLORS[domein],
          pills: [{ tekst: DOMAIN_LABELS[domein], bg: "FFFFFF", kleur: DOMAIN_ACCENT[domein] }],
          titel: insp.titel,
          meta: insp.investering !== TE_BEPALEN ? ([["Investering", insp.investering]] as [string, string][]) : undefined,
        };
      }),
      breedte
    )
  );

  return { properties: KAARTJES_LIGGEND ? PAGINA_LIGGEND : PAGINA_STAAND, children };
}

// --- 3. De vier inspanningen ---

function inspanningenSectie(data: BeknoptData, state: NumberingState): Sectie {
  const children: Inhoud = [...kop("De vier inspanningen", state)];

  if (data.inspanningen.length === 0) {
    children.push(
      tebepalenRegel(
        "De cross-sectorale inspanningen zijn nog niet uitgewerkt — doorloop stap 4 van de cross-analyse."
      )
    );
    return { properties: PAGINA_STAAND, children };
  }

  children.push(
    bodyText(
      "Per domein één gezamenlijke inspanning: wat we gaan doen, wat het kost, wanneer en wie. " +
        "Op volgorde van prioriteit — Data & Systemen eerst, daarna Processen, Mens en Cultuur. " +
        "De volledige onderbouwing staat in het complete programmaplan.",
      { size: 18, color: TEXT_SECONDARY }
    )
  );

  // Op prioriteit, niet outside-in: Data & Systemen → Processen → Mens → Cultuur.
  const opPrioriteit = [...data.inspanningen].sort(
    (a, b) => PRIORITEIT_ORDER.indexOf(a.domein) - PRIORITEIT_ORDER.indexOf(b.domein)
  );
  opPrioriteit.forEach((insp, index) => {
    children.push(
      kaartje({
        accent: DOMAIN_ACCENT[insp.domein],
        breedte: BREEDTE_STAAND,
        eyebrow: `${index + 1}. ${DOMAIN_LABELS[insp.domein]} · cross-sectorale hefboom`,
        titel: insp.titel,
        body: insp.beschrijving ? [insp.beschrijving] : undefined,
        // Bewust alleen wie/wat: de argumentatie en randvoorwaarden maakten dit
        // hoofdstuk vier pagina's lang en verdrongen de bedoeling.
        // Periode bewust weggelaten: die staat per bundel in het hoofdstuk
        // "Wanneer" en was hier meestal "te bepalen".
        meta: [
          ["Investering", insp.investering],
          ["Eigenaar", insp.eigenaar],
          ["Inspanningsleider", insp.inspanningsleider],
        ],
      })
    );
    children.push(emptyLine(110));
  });

  return { properties: PAGINA_STAAND, children };
}

// --- Hoe we meten of het werkt (baten-KPI's) ---

function kpiSectie(data: BeknoptData, state: NumberingState): Sectie {
  const children: Inhoud = [...kop("Hoe we meten of het werkt", state)];

  children.push(
    bodyText(
      "Per sector één baat met de bijbehorende KPI's, vastgesteld in de stakeholdersessie. " +
        "De startwaarden meten we in Q3 (nulmeting); de doelwaarden bepalen we daarna in de " +
        "vervolgsessie — een doelwaarde zonder startwaarde is niet toetsbaar op haalbaarheid.",
      { size: 20, color: TEXT_SECONDARY }
    )
  );
  children.push(emptyLine(110));

  BATEN_KPIS.forEach((baat) => {
    const pill = SECTOR_PILL[baat.sector] ?? { bg: "E5E7EB", kleur: "374151" };
    // Kop van de baat — zelfde opbouw als de kaartkop in KpiModelBlock.
    children.push(
      kaartje({
        accent: ACCENT_BATEN,
        breedte: BREEDTE_STAAND,
        compact: true,
        pills: [{ tekst: baat.sector, bg: pill.bg, kleur: pill.kleur }],
        titel: baat.titel,
        meta: [
          ["Eigenaar", KPI_EIGENAAR],
          ["Meetverantwoordelijke", KPI_MEETVERANTWOORDELIJKE],
        ],
      })
    );
    // KPI-tabel: exact de kolommen uit de app (KPI · Definitie · Startwaarde → waar naartoe).
    children.push(
      tabel(
        [
          { kop: "KPI", breedte: 26 },
          { kop: "Definitie", breedte: 44 },
          { kop: "Startwaarde → waar naartoe", breedte: 30 },
        ],
        baat.rijen.map((r) => [
          styledCell(r.naam, { bold: true, width: 26 }),
          styledCell(r.definitie, { width: 44 }),
          styledCell(`${r.start} → ${r.richting}`, { width: 30 }),
        ])
      )
    );
    children.push(emptyLine(140));
  });

  // Doelwaarden: één keer, met de eisen uit H8 — niet per baat herhalen.
  children.push(
    kaartje({
      accent: "B45309",
      breedte: BREEDTE_STAAND,
      eyebrow: "Doelwaarden",
      titel: DOELWAARDE_STATUS,
      secties: [{ label: "Eisen per doelwaarde", bullets: DOELWAARDE_EISEN }],
      vulling: "FFFDF7",
    })
  );
  children.push(emptyLine(110));

  children.push(
    bronRegel(
      "NPS is een resultante, geen stuur-KPI: je stuurt op de onderliggende indicatoren en meet met " +
        "NPS of het werkt. De indicatoren per vermogen worden bepaald in de vervolgsessie, na de " +
        "nulmeting. Bron: de KPI-set uit de stakeholdersessie (stap 9)."
    )
  );

  return { properties: PAGINA_STAAND, children };
}

// --- 4. Wat het kost ---

function ramingSectie(data: BeknoptData, state: NumberingState): Sectie {
  const children: Inhoud = [...kop("Wat het kost", state)];
  const geld = data.geld;

  if (!geld) {
    children.push(
      tebepalenRegel(
        "De raming is nog niet doorgerekend — doorloop stap 6 (out-of-pocket) en stap 7 (interne uren) van de cross-analyse."
      )
    );
    return { properties: PAGINA_STAAND, children };
  }

  children.push(
    kaartje({
      accent: CITO_BLUE,
      breedte: BREEDTE_STAAND,
      eyebrow: `Scenario — ${geld.label}`,
      titel: `Totaal geraamd: ${formatEuro(geld.totaal)}`,
      body: [
        `${formatEuro(geld.outOfPocket)} out-of-pocket en ${formatEuro(geld.interneKosten)} interne uren` +
          (geld.interneUren > 0 ? ` (${formatGetal(geld.interneUren)} uur)` : "") +
          (geld.aantalJaren ? `, over ${geld.aantalJaren} jaar.` : "."),
      ],
    })
  );
  children.push(emptyLine(120));

  if (geld.perJaar.length > 0) {
    children.push(subHeading("Per jaar"));
    children.push(
      tabel(
        [
          { kop: "Jaar", breedte: 16 },
          { kop: "Out-of-pocket", breedte: 28 },
          { kop: "Interne uren", breedte: 28 },
          { kop: "Totaal", breedte: 28 },
        ],
        geld.perJaar.map((p) => [
          styledCell(String(p.jaar), { bold: true, width: 16 }),
          styledCell(formatEuro(p.outOfPocket), { width: 28 }),
          styledCell(
            formatEuro(p.interneKosten) + (p.interneUren > 0 ? ` (${formatGetal(p.interneUren)} u)` : ""),
            { width: 28 }
          ),
          styledCell(formatEuro(p.totaal), { bold: true, width: 28 }),
        ])
      )
    );
    children.push(emptyLine(120));
  }

  if (geld.perInspanning.length > 0) {
    children.push(subHeading("Per inspanning"));
    children.push(
      tabel(
        [
          { kop: "Domein", breedte: 20 },
          { kop: "Inspanning", breedte: 44 },
          { kop: "Bedrag", breedte: 20 },
          { kop: "Aandeel", breedte: 16 },
        ],
        geld.perInspanning.map((p) => [
          styledCell(DOMAIN_LABELS[p.domein], { shading: DOMAIN_COLORS[p.domein], width: 20 }),
          styledCell(p.titel, { width: 44 }),
          styledCell(formatEuro(p.euro), { width: 20 }),
          styledCell(p.aandeel === null ? "—" : `${Math.round(p.aandeel)}%`, { width: 16 }),
        ])
      )
    );
    children.push(emptyLine(120));
  }

  if (geld.stuurgroepNotitie) {
    children.push(subHeading("Notitie uit de stuurgroep"));
    children.push(methodiekIntro(geld.stuurgroepNotitie));
  }

  children.push(bodyText("Dit is een raming, geen vastgestelde begroting.", { bold: true, size: 20 }));
  children.push(
    bronRegel(
      `Bron: cross-analyse stap 6, 7 en 8 — scenario "${geld.label}". Drie alternatieve scenario's zijn ` +
        "doorgerekend; de vergelijking staat in het volledige programmaplan (§4.3)."
    )
  );

  return { properties: PAGINA_STAAND, children };
}

// --- 5. Wanneer ---

function planningSectie(data: BeknoptData, state: NumberingState): Sectie {
  const children: Inhoud = [...kop("Wanneer", state)];
  const planning = data.planning;

  if (!planning) {
    children.push(
      tebepalenRegel(
        "De planning is nog niet vastgesteld — te bepalen. Genereer het planningsvoorstel in stap 6 van de cross-analyse."
      )
    );
    return { properties: PAGINA_STAAND, children };
  }

  if (data.fasering.length > 0) {
    children.push(subHeading("2026 — de analysefase"));
    children.push(
      bodyText(
        "2026 is de analysefase met quick wins: per domein brengen we de startsituatie in kaart en " +
          "maken we de gap tussen huidige en gewenste situatie meetbaar. Wat daar uitkomt, bepaalt de " +
          "vervolg-inspanningen voor 2027 en de indicatoren waarmee we de groei volgen.",
        { size: 20 }
      )
    );
    children.push(
      tabel(
        [
          { kop: "Domein", breedte: 26 },
          { kop: "Fase in 2026", breedte: 40 },
          { kop: "Budget 2026", breedte: 34 },
        ],
        data.fasering.map((f) => [
          styledCell(DOMAIN_LABELS[f.domein], { shading: DOMAIN_COLORS[f.domein], width: 26 }),
          styledCell(f.fase2026, { width: 40 }),
          styledCell(f.budget2026, { width: 34 }),
        ])
      )
    );
    children.push(bronRegel("Bron: fasering en budgetten 2026 uit de Plus20-raming."));
    children.push(emptyLine(110));
    children.push(subHeading("De bundels in de tijd"));
  }

  if (planning.volgordeZin) {
    children.push(bodyText(planning.volgordeZin, { bold: true, size: 20 }));
  }
  if (planning.toelichting) {
    children.push(subHeading("Toelichting programma-eigenaar"));
    children.push(methodiekIntro(planning.toelichting));
  }

  children.push(
    tabel(
      [
        { kop: "Domein", breedte: 18 },
        { kop: "Gezamenlijke inspanning", breedte: 42 },
        { kop: "Cyclus", breedte: 18 },
        { kop: "Periode", breedte: 22 },
      ],
      planning.bundels.map((b) => [
        styledCell(DOMAIN_LABELS[b.domein], { shading: DOMAIN_COLORS[b.domein], width: 18 }),
        styledCell(b.titel, { width: 42 }),
        styledCell(b.cyclus, { width: 18 }),
        styledCell(b.periode, { width: 22 }),
      ])
    )
  );
  children.push(emptyLine(120));

  planning.bundels
    .filter((b) => b.mijlpalen.length > 0)
    .forEach((b) => {
      children.push(subHeading(`Mijlpalen — ${b.titel}`));
      b.mijlpalen.forEach((m) => children.push(opsomming(m)));
    });

  return { properties: PAGINA_STAAND, children };
}

// --- 6. Wie ---

function bemensingSectie(data: BeknoptData, state: NumberingState): Sectie | null {
  const org = data.organisatie;
  if (!org) return null;

  const children: Inhoud = [...kop("Wie", state)];
  children.push(
    tabel(
      [
        { kop: "Rol", breedte: 30 },
        { kop: "Naam", breedte: 32 },
        { kop: "Functie", breedte: 38 },
      ],
      org.rijen.map(([rol, naam, functie]) => [
        styledCell(rol, { bold: true, width: 30 }),
        styledCell(naam, { width: 32, color: naam === TE_BEPALEN ? TEXT_MUTED : TEXT_PRIMARY }),
        styledCell(functie, { width: 38 }),
      ])
    )
  );
  children.push(emptyLine(120));

  if (org.ritme) children.push(bodyText(`Besluitvormingsritme: ${org.ritme}`, { size: 20 }));
  if (org.escalatie) children.push(bodyText(`Escalatiepad: ${org.escalatie}`, { size: 20 }));
  children.push(
    bronRegel(
      "De volledige programmaorganisatie — kerngroep, stuurgroep, adviesgroep, klankbordgroep en de " +
        "RASCI-matrix — staat in hoofdstuk 5 van het complete programmaplan."
    )
  );

  return { properties: PAGINA_STAAND, children };
}

// ============================================================
// Assemblage
// ============================================================

/**
 * Bouwt de docx-secties zonder Packer aan te roepen. Los testbaar in node —
 * Packer.toBlob heeft browser-API's nodig.
 */
export function buildBeknoptSections(session: DINSession): Sectie[] {
  const data = verzamelBeknoptData(session);
  // Eigen nummerstaat: NumberingState wordt in-place gemuteerd en mag nooit
  // gedeeld worden met generateWordDocument.
  const state = createNumberingState();

  const secties: (Sectie | null)[] = [
    titelSectie(data),
    besluitenSectie(data),
    waarOverSectie(data, state),
    kaartjesSectie(data, state),
    inspanningenSectie(data, state),
    kpiSectie(data, state),
    ramingSectie(data, state),
    planningSectie(data, state),
    bemensingSectie(data, state),
  ];

  return secties.filter((s): s is Sectie => s !== null);
}

export async function generateBeknoptWordDocument(session: DINSession): Promise<Blob> {
  const header = createHeader(`${session.name} (beknopt)`);
  const footer = createFooter();
  const secties = buildBeknoptSections(session);

  const doc = new Document({
    styles: {
      paragraphStyles: [
        {
          id: "Heading1",
          name: "Heading 1",
          basedOn: "Normal",
          next: "Normal",
          quickFormat: true,
          run: { size: 32, bold: true, color: CITO_BLUE, font: "Calibri" },
          paragraph: { spacing: { before: 360, after: 160 } },
        },
        {
          id: "Heading2",
          name: "Heading 2",
          basedOn: "Normal",
          next: "Normal",
          quickFormat: true,
          run: { size: 26, bold: true, color: CITO_BLUE, font: "Calibri" },
          paragraph: { spacing: { before: 280, after: 120 } },
        },
      ],
      default: { document: { run: { font: "Calibri", size: 22 } } },
    },
    sections: secties.map((s, index) => ({
      properties: s.properties,
      // Titelpagina zonder header/footer, net als het volledige programmaplan.
      ...(index === 0 ? {} : { headers: { default: header }, footers: { default: footer } }),
      children: s.children,
    })),
  });

  return Packer.toBlob(doc);
}
