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
  getActiveCaps,
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
          size: o.compact ? 20 : 22,
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
          children: [new TextRun({ text: s.tekst, size: 20, color: tekstKleur, font: "Calibri" })],
        })
      );
    }
    for (const b of s.bullets ?? []) {
      inhoud.push(
        new Paragraph({
          spacing: { after: 20, line: 260 },
          indent: { left: 180 },
          children: [
            new TextRun({ text: "•  ", color: o.accent, font: "Calibri", size: 20 }),
            new TextRun({ text: b, size: 20, color: tekstKleur, font: "Calibri" }),
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
            new TextRun({ text: `${k}: `, bold: true, size: 20, color: TEXT_SECONDARY, font: "Calibri" }),
            new TextRun({
              text: v,
              size: 20,
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

export interface VermogensProfielBeknopt {
  titel: string;
  sectoren: string;
  asIs: string;
  toBe: string;
  verantwoordelijk: string;
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
  vermogensprofielen: VermogensProfielBeknopt[];
  planning: {
    toelichting: string;
    bundels: BundelBeknopt[];
  } | null;
  organisatie: { rijen: [string, string, string][]; ritme: string; escalatie: string } | null;
  gaps: {
    volgendeCyclus: string[];
    echteGaps: string[];
    batenZonderVermogen: string[];
    vermogensZonderInspanning: string[];
  };
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
function prioriteitVolgorde(domein: EffortDomain): number {
  const i = PRIORITEIT_ORDER.indexOf(domein);
  return i === -1 ? PRIORITEIT_ORDER.length : i;
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

/**
 * Waarde van een veld, of een lege string als er niets (bruikbaars) staat.
 * De beknopte versie is een samenvatting van het vastgestelde programmaplan:
 * daar horen geen openstaande punten in. Wat leeg is, valt weg.
 */
function veld(waarde: string | null | undefined): string {
  const v = tekst(waarde);
  return v.length > 0 && !isPlaceholder(v) ? v : "";
}

/** Interne uren: canonieke leesweg is stap4.stap7InterneUren; stap7 is legacy fallback. */
function leesInterneUren(session: DINSession) {
  const stepResults = session.crossAnalyseWizard?.stepResults;
  return stepResults?.stap4?.stap7InterneUren ?? stepResults?.stap7 ?? undefined;
}

function bouwGeld(session: DINSession): GeldBeknopt | null {
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
    .sort((x, y) => prioriteitVolgorde(x.domein) - prioriteitVolgorde(y.domein));

  const vastgelegd = Boolean(stap8?.actiefScenario && stap8?.scenarios?.[stap8.actiefScenario as ScenarioK]);

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

function bouwInspanningen(session: DINSession): InspanningBeknopt[] {
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
      investering = "";
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
      periode = "";
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
        ["Eigenaar", veld(dossier?.eigenaar)],
        [
          "Inspanningsleider",
          veld(dossier?.inspanningsleider),
        ],
        [
          "Verwacht resultaat",
          veld(dossier?.verwachtResultaat),
        ],
        [
          "Randvoorwaarden",
          veld(dossier?.randvoorwaarden),
        ],
      ].map(([label, waarde]) => ({ label, waarde })),
      eigenaar: veld(dossier?.eigenaar),
      inspanningsleider: veld(dossier?.inspanningsleider),
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

function bouwPlanning(session: DINSession) {
  const planning = session.planningVoorstel;
  const bundels = planning?.bundelPlanning ?? [];
  if (!planning || bundels.length === 0) {
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

  return {
    toelichting: tekst(planning.toelichting),
    bundels: gesorteerd.map((bd) => {
      const start = tekst(bd.startKwartaal);
      const eind = tekst(bd.eindKwartaal);
      return {
        domein: bd.domein as EffortDomain,
        titel: tekst(bd.titel),
        cyclus: tekst(bd.cyclusLabel),
        periode: start && eind ? `${start} – ${eind}` : "",
        mijlpalen: (bd.mijlpalen ?? [])
          .map((m) => `${tekst(m.periode)}: ${tekst(m.mijlpaal)}`)
          .filter((s) => s.length > 2),
      };
    }),
  };
}

function bouwOrganisatie(session: DINSession) {
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
    const naam = veld(rol.naam);
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
  const focus = computeFocusView(session);
  const stepResults = session.crossAnalyseWizard?.stepResults;
  const subEfforts = stepResults?.stap4?.subEffortAnalysis ?? [];
  const gaps = categorizeGaps(session);

  const focusDoel = focus
    ? { naam: tekst(focus.focusGoal.name), beschrijving: tekst(focus.focusGoal.description) }
    : null;

  const geld = bouwGeld(session);

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
    inspanningen: bouwInspanningen(session),
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
    // 1-op-1 als VermogensprofielenBlock in het volledige programmaplan:
    // alfabetisch op titel, sectoren onder de naam, "—" waar niets staat, en
    // dezelfde afleiding van de verantwoordelijken (sectormanager + commercieel
    // manager per sector).
    vermogensprofielen: [...getActiveCaps(session)]
      .sort((a, b) =>
        (a.title || a.description).localeCompare(b.title || b.description, "nl")
      )
      .map((c) => {
        const sectoren =
          c.relatedSectors && c.relatedSectors.length > 0 ? c.relatedSectors : c.sectorId ? [c.sectorId] : [];
        const uniek = Array.from(new Set(sectoren.map((x) => x.trim()).filter(Boolean)));
        return {
          titel: tekst(c.title) || tekst(c.description),
          sectoren: uniek.join(", "),
          asIs: tekst(c.profiel?.huidieSituatie) || "—",
          toBe: tekst(c.profiel?.gewensteSituatie) || "—",
          verantwoordelijk:
            uniek.length > 0
              ? uniek.map((x) => `Sectormanager ${x} + Commercieel manager ${x}`).join("; ")
              : "— nog te benoemen",
        };
      })
      .filter((v) => v.titel.length > 0),
    planning: bouwPlanning(session),
    organisatie: bouwOrganisatie(session),
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
  };
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

function subKop(text: string, state: NumberingState): Paragraph {
  return numberedHeading(text, "h2", state);
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
      new TextRun({ text: "•  ", color: CITO_BLUE, font: "Calibri", size: 20 }),
      new TextRun({ text, size: 20, font: "Calibri", color: TEXT_PRIMARY }),
    ],
  });
}

function bronRegel(text: string): Paragraph {
  return bodyText(text, { italic: true, size: 18, color: TEXT_MUTED });
}

/**
 * Cel met een kleine tweede regel eronder (bijv. de sectoren onder een
 * vermogensnaam). Een "
" in een TextRun levert in docx geen regelafbreking op,
 * dus dit moeten twee alinea's zijn.
 */
function celMetSubregel(titel: string, sub: string, breedte: number): TableCell {
  return new TableCell({
    width: { size: breedte, type: WidthType.PERCENTAGE },
    borders: {
      top: KAART_LIJN,
      bottom: KAART_LIJN,
      left: KAART_LIJN,
      right: KAART_LIJN,
    },
    children: [
      new Paragraph({
        spacing: { before: 50, after: sub ? 20 : 50 },
        children: [
          new TextRun({ text: titel, bold: true, size: 20, font: "Calibri", color: TEXT_PRIMARY }),
        ],
      }),
      ...(sub
        ? [
            new Paragraph({
              spacing: { after: 50 },
              children: [
                new TextRun({ text: sub, size: 16, font: "Calibri", color: TEXT_MUTED }),
              ],
            }),
          ]
        : []),
    ],
  });
}

function tabel(kolommen: { kop: string; breedte: number }[], rijen: TableCell[][]): Table {
  return new Table({
    width: { size: 100, type: WidthType.PERCENTAGE },
    margins: { left: 80, right: 80 },
    rows: [
      // tableHeader: kopregel herhaalt zich als de tabel over een pagina breekt.
      new TableRow({ tableHeader: true, children: kolommen.map((k) => headerCell(k.kop, k.breedte)) }),
      // cantSplit: een rij mag niet over de paginarand breken — anders blijven er
      // lege cellen achter op de vervolgpagina.
      ...rijen.map((cellen) => new TableRow({ cantSplit: true, children: cellen })),
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
      emptyLine(120),
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

// --- 1. Programmavisie en scope ---

function visieScopeSectie(data: BeknoptData, state: NumberingState): Sectie {
  const children: Inhoud = [...kop("Programmavisie en scope", state)];

  if (data.visie) {
    children.push(subKop("Programmavisie", state));
    children.push(bodyText(data.visie, { bold: true, size: 24 }));
  }

  if (data.inScope.length > 0 || data.buitenCyclus.length > 0) {
    children.push(subKop("Scope", state));
    if (data.inScope.length > 0) {
      children.push(subHeading("Binnen scope"));
      data.inScope.forEach((x) => children.push(opsomming(x)));
    }
    if (data.buitenCyclus.length > 0) {
      children.push(subHeading("Buiten deze cyclus"));
      data.buitenCyclus.forEach((x) => children.push(opsomming(x)));
    }
  }

  return { properties: PAGINA_STAAND, children };
}

// --- 2. Programmadoelen ---

function doelenSectie(data: BeknoptData, state: NumberingState): Sectie {
  const children: Inhoud = [...kop("Programmadoelen", state)];

  if (data.focusDoel) {
    children.push(
      kaartje({
        accent: "001F3F",
        breedte: BREEDTE_STAAND,
        eyebrow: "Focusdoel — prioriteit 1",
        titel: data.focusDoel.naam,
        body: data.focusDoel.beschrijving ? [data.focusDoel.beschrijving] : undefined,
        vulling: CITO_BLUE,
        titelKleur: "FFFFFF",
        tekstKleur: "E8EDF3",
      })
    );
    children.push(emptyLine(120));
  }

  data.alleDoelen
    .filter((g) => !g.isFocus)
    .forEach((g) =>
      children.push(opsomming(`${g.rank}. ${g.naam} — wordt in een volgende cyclus uitgewerkt`))
    );

  return { properties: PAGINA_STAAND, children };
}

// --- 3. Cross-sectorale uitkomst — de kern (de plaat, liggend) ---

function kernSectie(data: BeknoptData, state: NumberingState): Sectie {
  const breedte = KAARTJES_LIGGEND ? BREEDTE_LIGGEND : BREEDTE_STAAND;
  const children: Inhoud = [...kop("Cross-sectorale uitkomst — de kern", state)];

  children.push(
    bodyText(
      "Van het focusdoel naar de baten per sector, via het gedeelde vermogen naar de vier " +
        "cross-sectorale inspanningen.",
      { size: 20, color: TEXT_SECONDARY }
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

  if (data.batenPerSector.length > 0) {
    children.push(plaatLabel("Baten per sector"));
    children.push(
      kaartRij(
        data.batenPerSector.map((sec) => {
          const pill = SECTOR_PILL[sec.sector] ?? { bg: "E5E7EB", kleur: "374151" };
          const eerste = sec.kaarten[0];
          return {
            accent: ACCENT_BATEN,
            breedte,
            compact: true,
            pills: [{ tekst: sec.sector, bg: pill.bg, kleur: pill.kleur }],
            titel: eerste ? eerste.titel : "",
            body: sec.kaarten.slice(1).map((k) => k.titel),
          };
        }),
        breedte
      )
    );
    children.push(connector(true));
  }

  data.vermogensGroepen.forEach((groep) => {
    children.push(
      kaartje({
        accent: ACCENT_VERMOGENS,
        breedte,
        compact: true,
        eyebrow: "Gedeeld vermogen — hefboomgroep",
        titel: groep.omschrijving,
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

  children.push(plaatLabel("Cross-sectorale inspanningen — de hefboomlaag"));
  children.push(
    kaartRij(
      PRIORITEIT_ORDER.map((domein) => {
        const insp = data.inspanningen.find((i) => i.domein === domein);
        if (!insp) {
          return {
            accent: BORDER_COLOR,
            breedte,
            compact: true,
            pills: [
              { tekst: DOMAIN_LABELS[domein], bg: DOMAIN_COLORS[domein], kleur: DOMAIN_ACCENT[domein] },
            ],
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
          meta: insp.investering
            ? ([["Investering", insp.investering]] as [string, string][])
            : undefined,
        };
      }),
      breedte
    )
  );

  return { properties: KAARTJES_LIGGEND ? PAGINA_LIGGEND : PAGINA_STAAND, children };
}

// --- 3.1 KPI-model · 3.2 Vermogensprofielen · 3.3 Inspanningsleiders · 3.4 Veranderstrategie ---

function kernSubsectiesSectie(data: BeknoptData, state: NumberingState): Sectie {
  const children: Inhoud = [subKop("KPI-model — baten · vermogen · inspanningen", state)];

  children.push(
    bodyText(
      "Per sector één baat met de bijbehorende KPI's, vastgesteld in de stakeholdersessie. De " +
        "startwaarden meten we in Q3 (nulmeting); de doelwaarden bepalen we daarna in de vervolgsessie.",
      { size: 20, color: TEXT_SECONDARY }
    )
  );

  BATEN_KPIS.forEach((baat) => {
    const pill = SECTOR_PILL[baat.sector] ?? { bg: "E5E7EB", kleur: "374151" };
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
    children.push(emptyLine(120));
  });

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
  children.push(emptyLine(120));
  children.push(
    bronRegel(
      "NPS is een resultante, geen stuur-KPI: je stuurt op de onderliggende indicatoren en meet met " +
        "NPS of het werkt."
    )
  );

  if (data.vermogensprofielen.length > 0) {
    children.push(subKop("Vermogensprofielen", state));
    children.push(
      tabel(
        [
          { kop: "Vermogen", breedte: 22 },
          { kop: "Huidige situatie (AS-IS)", breedte: 30 },
          { kop: "Gewenste situatie (TO-BE)", breedte: 30 },
          { kop: "Verantwoordelijk", breedte: 18 },
        ],
        data.vermogensprofielen.map((v) => [
          celMetSubregel(v.titel, v.sectoren, 22),
          styledCell(v.asIs, { width: 30 }),
          styledCell(v.toBe, { width: 30 }),
          styledCell(v.verantwoordelijk, { width: 18 }),
        ])
      )
    );
  }

  if (data.inspanningen.length > 0) {
    children.push(subKop("Eigenaar en inspanningsleider per domein", state));
    children.push(
      tabel(
        [
          { kop: "Domein", breedte: 22 },
          { kop: "Gezamenlijke inspanning", breedte: 38 },
          { kop: "Eigenaar", breedte: 20 },
          { kop: "Inspanningsleider", breedte: 20 },
        ],
        [...data.inspanningen]
          .sort((a, b) => PRIORITEIT_ORDER.indexOf(a.domein) - PRIORITEIT_ORDER.indexOf(b.domein))
          .map((i) => [
            styledCell(DOMAIN_LABELS[i.domein], { shading: DOMAIN_COLORS[i.domein], width: 22 }),
            styledCell(i.titel, { width: 38 }),
            styledCell(i.eigenaar, { width: 20 }),
            styledCell(i.inspanningsleider, { width: 20 }),
          ])
      )
    );
  }

  // Letterlijk de veranderstrategie uit het volledige programmaplan (§3.4).
  children.push(subKop("Veranderstrategie", state));
  children.push(
    bodyText(
      "De inspanningen zijn niet willekeurig over de vier domeinen verdeeld. Het programma kiest " +
        "bewust voor een dubbele aanpak: parallel werken aan de zachte kant — cultuur (waarden, gedrag, " +
        "leiderschap) en mens (competenties, vakmanschap, opleiding) — én aan de harde kant — data & " +
        "systemen (CRM, registratie, infrastructuur) en processen (werkwijzen, governance, samenwerking).",
      { size: 20 }
    )
  );
  children.push(
    bodyText(
      "Wie alleen aan cultuur en gedrag werkt, ontwikkelt een klantgerichte mindset zonder de " +
        "instrumenten om die mindset waar te maken. Wie alleen aan systemen en processen sleutelt, " +
        "krijgt een stelsel dat technisch klopt maar door medewerkers niet wordt gedragen. Pas wanneer " +
        "beide kanten gelijktijdig opschuiven, ontstaat verandering die beklijft. De roadmap in " +
        "hoofdstuk 6 plant de zachte en harde inspanningen daarom parallel, niet sequentieel.",
      { size: 20 }
    )
  );

  return { properties: PAGINA_STAAND, children };
}

// --- 4. Raming ---

function ramingSectie(data: BeknoptData, state: NumberingState): Sectie | null {
  const geld = data.geld;
  if (!geld) return null;

  const children: Inhoud = [...kop("Raming", state)];
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

  if (geld.perInspanning.length > 0) {
    children.push(subKop("Out-of-pocket kosten", state));
    children.push(
      tabel(
        [
          { kop: "Domein", breedte: 20 },
          { kop: "Inspanning", breedte: 44 },
          { kop: "Bedrag", breedte: 20 },
          { kop: "Aandeel", breedte: 16 },
        ],
        geld.perInspanning.map((x) => [
          styledCell(DOMAIN_LABELS[x.domein], { shading: DOMAIN_COLORS[x.domein], width: 20 }),
          styledCell(x.titel, { width: 44 }),
          styledCell(formatEuro(x.euro), { width: 20 }),
          styledCell(x.aandeel === null ? "—" : `${Math.round(x.aandeel)}%`, { width: 16 }),
        ])
      )
    );
  }

  if (geld.perJaar.length > 0) {
    children.push(subKop("Totaaloverzicht per jaar", state));
    children.push(
      tabel(
        [
          { kop: "Jaar", breedte: 16 },
          { kop: "Out-of-pocket", breedte: 28 },
          { kop: "Interne uren", breedte: 28 },
          { kop: "Totaal", breedte: 28 },
        ],
        geld.perJaar.map((j) => [
          styledCell(String(j.jaar), { bold: true, width: 16 }),
          styledCell(formatEuro(j.outOfPocket), { width: 28 }),
          styledCell(
            formatEuro(j.interneKosten) + (j.interneUren > 0 ? ` (${formatGetal(j.interneUren)} u)` : ""),
            { width: 28 }
          ),
          styledCell(formatEuro(j.totaal), { bold: true, width: 28 }),
        ])
      )
    );
  }

  if (geld.stuurgroepNotitie) children.push(methodiekIntro(geld.stuurgroepNotitie));
  children.push(emptyLine(120));
  children.push(bodyText("Dit is een raming, geen vastgestelde begroting.", { bold: true, size: 20 }));
  children.push(
    bronRegel(
      `Bron: cross-analyse stap 6, 7 en 8 — scenario "${geld.label}". De vergelijking met de andere ` +
        "scenario's staat in het volledige programmaplan (§4.3)."
    )
  );

  return { properties: PAGINA_STAAND, children };
}

// --- 5. Programma-organisatie ---

function organisatieSectie(data: BeknoptData, state: NumberingState): Sectie | null {
  const org = data.organisatie;
  if (!org) return null;

  const children: Inhoud = [...kop("Programma-organisatie", state)];
  children.push(
    tabel(
      [
        { kop: "Rol", breedte: 30 },
        { kop: "Naam", breedte: 32 },
        { kop: "Functie", breedte: 38 },
      ],
      org.rijen.map(([rol, naam, functie]) => [
        styledCell(rol, { bold: true, width: 30 }),
        styledCell(naam, { width: 32 }),
        styledCell(functie, { width: 38 }),
      ])
    )
  );
  children.push(emptyLine(120));
  if (org.ritme) children.push(bodyText(`Besluitvormingsritme: ${org.ritme}`, { size: 20 }));
  if (org.escalatie) children.push(bodyText(`Escalatiepad: ${org.escalatie}`, { size: 20 }));
  children.push(
    bronRegel(
      "De volledige programmaorganisatie en de RASCI-matrix staan in hoofdstuk 5 van het complete " +
        "programmaplan."
    )
  );

  return { properties: PAGINA_STAAND, children };
}

// --- 6. Planning en roadmap ---

function planningSectie(data: BeknoptData, state: NumberingState): Sectie | null {
  const planning = data.planning;
  if (!planning) return null;

  const children: Inhoud = [...kop("Planning en roadmap", state)];

  if (data.fasering.length > 0) {
    children.push(
      bodyText(
        "2026 is de analysefase met quick wins: per domein brengen we de startsituatie in kaart en " +
          "maken we de gap tussen huidige en gewenste situatie meetbaar. Wat daaruit komt, bepaalt de " +
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
    children.push(emptyLine(120));
  }

  if (planning.toelichting) children.push(methodiekIntro(planning.toelichting));

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

  planning.bundels
    .filter((b) => b.mijlpalen.length > 0)
    .forEach((b) => {
      children.push(subHeading(`Mijlpalen — ${b.titel}`));
      b.mijlpalen.forEach((m) => children.push(opsomming(m)));
    });

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

  // Zelfde hoofdstukindeling als het volledige programmaplan, alleen ingedikt.
  const secties: (Sectie | null)[] = [
    titelSectie(data),
    visieScopeSectie(data, state),
    doelenSectie(data, state),
    kernSectie(data, state),
    kernSubsectiesSectie(data, state),
    ramingSectie(data, state),
    organisatieSectie(data, state),
    planningSectie(data, state),
  ];

  return secties.filter((x): x is Sectie => x !== null);
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
