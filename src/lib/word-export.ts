import {
  Document,
  Packer,
  Paragraph,
  TextRun,
  HeadingLevel,
  Table,
  TableRow,
  TableCell,
  WidthType,
  AlignmentType,
  BorderStyle,
  Header,
  Footer,
  PageNumber,
  NumberFormat,
  TabStopType,
  TabStopPosition,
  TableOfContents,
  StyleLevel,
} from "docx";
import type {
  DINSession,
  DINCapability,
  DINEffort,
  EffortDomain,
  SectorName,
  IntegratieAdviesResult,
  Stap7InterneUren,
  Stap8Totaaloverzicht,
  DomeinInterneUren,
  BundelPlanning,
} from "./types";
import { SECTORS, DOMAIN_LABELS, STATUS_LABELS } from "./types";
import { findSharedCapabilities, getDomainBalance, findGaps, buildChainsForSector, analyzeHefbomen } from "./din-service";

// --- Cito outside-in domeinvolgorde (cultuur → mens → data/systemen → processen) ---
// NIET de klassieke Prevaas-volgorde. Zie memory: "Cito-outside-in volgorde".
const DOMEIN_OUTSIDE_IN_ORDER: EffortDomain[] = ["cultuur", "mens", "data_systemen", "processen"];

// Resolveer een lijst items (kunnen effort-IDs OF al titels zijn) naar leesbare titels.
// IDs zonder match worden gefilterd; we tonen liever niets dan een UUID.
function resolveItemLabels(items: string[], session: DINSession): string[] {
  const isUuidLike = (s: string) => /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(s);
  return items
    .map((item) => {
      const effort = session.efforts.find((e) => e.id === item);
      if (effort) return effort.title || effort.description || "";
      const cap = session.capabilities.find((c) => c.id === item);
      if (cap) return cap.title || cap.description || "";
      const benefit = session.benefits.find((b) => b.id === item);
      if (benefit) return benefit.title || benefit.description || "";
      return isUuidLike(item) ? "" : item;
    })
    .filter((s) => s.trim().length > 0);
}

function sortDomeinenOutsideIn<T extends { domein: EffortDomain }>(items: T[]): T[] {
  return [...items].sort(
    (a, b) => DOMEIN_OUTSIDE_IN_ORDER.indexOf(a.domein) - DOMEIN_OUTSIDE_IN_ORDER.indexOf(b.domein)
  );
}

function resolveBundelDependencies(bundelId: string, all: BundelPlanning[]): string {
  const bundel = all.find((b) => b.bundelId === bundelId);
  if (!bundel) return "\u2014";
  const deps = bundel.afhankelijkVan ?? [];
  if (deps.length === 0) return "\u2014";
  const labels = deps
    .map((depId) => {
      const dep = all.find((b) => b.bundelId === depId);
      return dep ? dep.titel : "";
    })
    .filter((s) => s.length > 0);
  return labels.length > 0 ? labels.join("; ") : "—";
}

function formatEuro(amount: number): string {
  return new Intl.NumberFormat("nl-NL", { style: "currency", currency: "EUR", maximumFractionDigits: 0 }).format(amount);
}

function formatGetal(n: number): string {
  return new Intl.NumberFormat("nl-NL", { maximumFractionDigits: 0 }).format(n);
}

const SCENARIO_LABELS: Record<"optimaal" | "plus20" | "min20" | "advies", string> = {
  optimaal: "Huidig budget",
  plus20: "+20% scenario",
  min20: "\u221220% scenario",
  advies: "Optimaal (advies)",
};

// --- Numbering State ---

export interface NumberingState {
  h1Counter: number;
  h2Counter: number;
  tocEntries: { level: "h1" | "h2"; text: string }[];
}

export function createNumberingState(): NumberingState {
  return { h1Counter: 0, h2Counter: 0, tocEntries: [] };
}

export function numberedHeading(
  text: string,
  level: "h1" | "h2",
  state: NumberingState
): Paragraph {
  if (level === "h1") {
    state.h1Counter++;
    state.h2Counter = 0;
    const prefix = `${state.h1Counter}. ${text}`;
    state.tocEntries.push({ level: "h1", text: prefix });
    return heading(prefix, HeadingLevel.HEADING_1);
  } else {
    state.h2Counter++;
    const prefix = `${state.h1Counter}.${state.h2Counter} ${text}`;
    state.tocEntries.push({ level: "h2", text: prefix });
    return heading(prefix, HeadingLevel.HEADING_2);
  }
}

// H1 zonder auto-nummer-prefix (voor managementsamenvatting, bijlagen).
// Advanceert h1Counter zodat H2-nummering in subsecties correct blijft.
export function plainH1(text: string, state: NumberingState): Paragraph {
  state.h1Counter++;
  state.h2Counter = 0;
  state.tocEntries.push({ level: "h1", text });
  return heading(text, HeadingLevel.HEADING_1);
}

// H1 voor methodiek-stappen: "Stap X — Titel".
export function stepHeading(stepNum: number, title: string, state: NumberingState): Paragraph {
  state.h1Counter++;
  state.h2Counter = 0;
  const prefix = `Stap ${stepNum} \u2014 ${title}`;
  state.tocEntries.push({ level: "h1", text: prefix });
  return heading(prefix, HeadingLevel.HEADING_1);
}

// --- Consolidation filtering ---

export function getActiveCaps(session: DINSession): DINCapability[] {
  return session.capabilities.filter((c) => !c.consolidated);
}

export function getActiveEfforts(session: DINSession): DINEffort[] {
  return session.efforts.filter((e) => !e.consolidated);
}

// --- Smart gap categorization ---

export function categorizeGaps(session: DINSession) {
  const gaps = findGaps(
    session.goals,
    session.benefits,
    session.capabilities,
    session.efforts,
    session.goalBenefitMaps,
    session.benefitCapabilityMaps,
    session.capabilityEffortMaps
  );

  const volgendeCyclus: typeof session.goals = [];
  const echteGapsGoals: typeof session.goals = [];

  // Determine goal status: a goal with no benefits anywhere is "niet-begonnen"
  // A goal with some benefits (but in gaps) is "bezig"
  gaps.goalsWithoutBenefits.forEach((id) => {
    const goal = session.goals.find((g) => g.id === id);
    if (!goal) return;

    // Check if this goal has any activity (benefits, capabilities, efforts linked)
    const hasBenefits = session.goalBenefitMaps.some((m) => m.goalId === id);
    if (!hasBenefits) {
      // No benefits at all = niet-begonnen
      volgendeCyclus.push(goal);
    } else {
      // Has some benefits but still in gap = bezig but incomplete
      echteGapsGoals.push(goal);
    }
  });

  return {
    volgendeCyclus,
    echteGapsGoals,
    benefitsWithoutCaps: gaps.benefitsWithoutCapabilities
      .map((id) => session.benefits.find((b) => b.id === id))
      .filter(Boolean),
    capsWithoutEfforts: gaps.capabilitiesWithoutEfforts
      .map((id) => session.capabilities.find((c) => c.id === id))
      .filter(Boolean),
  };
}

const CITO_BLUE = "003366";
const CITO_BLUE_LIGHT = "E8EDF3";
const TEXT_PRIMARY = "1a1a1a";
const TEXT_SECONDARY = "4a4a4a";
const TEXT_MUTED = "888888";
const BORDER_COLOR = "D0D0D0";


const DOMAIN_COLORS: Record<EffortDomain, string> = {
  mens: "DBEAFE",       // blauw
  processen: "D1FAE5",  // groen
  data_systemen: "EDE9FE", // paars
  cultuur: "FEF3C7",    // amber
};

const THIN_BORDER = { style: BorderStyle.SINGLE, size: 1, color: BORDER_COLOR };
const CELL_BORDERS = {
  top: THIN_BORDER,
  bottom: THIN_BORDER,
  left: THIN_BORDER,
  right: THIN_BORDER,
};

// --- Basiselementen ---

function heading(text: string, level: typeof HeadingLevel[keyof typeof HeadingLevel]) {
  return new Paragraph({
    heading: level,
    spacing: { before: 360, after: 120 },
    children: [new TextRun({ text, color: CITO_BLUE, bold: true })],
  });
}

function subHeading(text: string) {
  return new Paragraph({
    spacing: { before: 240, after: 80 },
    children: [
      new TextRun({ text: text.toUpperCase(), bold: true, size: 18, color: TEXT_SECONDARY, font: "Calibri" }),
    ],
  });
}

function bodyText(content: string, opts?: { bold?: boolean; italic?: boolean; size?: number; color?: string }) {
  return new Paragraph({
    spacing: { after: 80, line: 300 },
    children: [
      new TextRun({
        text: content,
        bold: opts?.bold,
        italics: opts?.italic,
        size: opts?.size || 22,
        color: opts?.color || TEXT_PRIMARY,
        font: "Calibri",
      }),
    ],
  });
}

function bullet(content: string, indent?: number) {
  return new Paragraph({
    spacing: { after: 50, line: 280 },
    indent: { left: indent || 400 },
    children: [
      new TextRun({ text: "\u2022  ", color: CITO_BLUE, font: "Calibri" }),
      new TextRun({ text: content, size: 22, font: "Calibri", color: TEXT_PRIMARY }),
    ],
  });
}

function emptyLine(space?: number) {
  return new Paragraph({ spacing: { after: space || 120 }, children: [] });
}

// Methodiek-intro: gestileerde alinea direct onder een stap-H1, met lichte achtergrond.
function methodiekIntro(text: string) {
  return new Paragraph({
    spacing: { before: 120, after: 200, line: 300 },
    indent: { left: 200, right: 200 },
    shading: { fill: CITO_BLUE_LIGHT },
    border: {
      left: { style: BorderStyle.SINGLE, size: 12, color: CITO_BLUE },
    },
    children: [
      new TextRun({
        text,
        italics: true,
        size: 22,
        color: TEXT_SECONDARY,
        font: "Calibri",
      }),
    ],
  });
}

function styledCell(content: string, opts?: { bold?: boolean; shading?: string; width?: number; color?: string; size?: number }) {
  return new TableCell({
    width: opts?.width ? { size: opts.width, type: WidthType.PERCENTAGE } : undefined,
    shading: opts?.shading ? { fill: opts.shading } : undefined,
    borders: CELL_BORDERS,
    children: [
      new Paragraph({
        spacing: { before: 50, after: 50 },
        children: [
          new TextRun({
            text: content,
            bold: opts?.bold,
            size: opts?.size || 20,
            font: "Calibri",
            color: opts?.color || TEXT_PRIMARY,
          }),
        ],
      }),
    ],
  });
}

function headerCell(content: string, width?: number) {
  return styledCell(content, {
    bold: true,
    shading: CITO_BLUE_LIGHT,
    width,
    color: CITO_BLUE,
    size: 18,
  });
}

function horizontalRule() {
  return new Paragraph({
    spacing: { before: 200, after: 200 },
    border: {
      bottom: { style: BorderStyle.SINGLE, size: 1, color: BORDER_COLOR, space: 1 },
    },
    children: [],
  });
}

// --- Header en Footer ---

function createHeader(sessionName: string) {
  return new Header({
    children: [
      new Paragraph({
        spacing: { after: 0 },
        children: [
          new TextRun({
            text: `Programmaplan \u2014 ${sessionName}`,
            size: 16,
            color: TEXT_MUTED,
            font: "Calibri",
            italics: true,
          }),
        ],
      }),
    ],
  });
}

function createFooter() {
  return new Footer({
    children: [
      new Paragraph({
        alignment: AlignmentType.RIGHT,
        children: [
          new TextRun({
            children: [PageNumber.CURRENT],
            size: 16,
            color: TEXT_MUTED,
            font: "Calibri",
          }),
        ],
      }),
    ],
  });
}

// --- Secties ---

function titlePageSection(session: DINSession) {
  return {
    properties: {
      page: {
        pageNumbers: { start: 1, formatType: NumberFormat.DECIMAL },
      },
    },
    children: [
      new Paragraph({ spacing: { before: 4000 } }),
      // Horizontale lijn boven
      new Paragraph({
        alignment: AlignmentType.CENTER,
        border: {
          bottom: { style: BorderStyle.SINGLE, size: 3, color: CITO_BLUE, space: 8 },
        },
        children: [],
      }),
      new Paragraph({ spacing: { before: 600 } }),
      new Paragraph({
        alignment: AlignmentType.CENTER,
        children: [
          new TextRun({
            text: "PROGRAMMAPLAN",
            size: 56,
            color: CITO_BLUE,
            bold: true,
            font: "Calibri",
          }),
        ],
      }),
      new Paragraph({
        alignment: AlignmentType.CENTER,
        spacing: { before: 200 },
        children: [
          new TextRun({
            text: session.name,
            size: 36,
            color: CITO_BLUE,
            font: "Calibri",
          }),
        ],
      }),
      new Paragraph({ spacing: { before: 400 } }),
      // Horizontale lijn onder
      new Paragraph({
        alignment: AlignmentType.CENTER,
        border: {
          bottom: { style: BorderStyle.SINGLE, size: 3, color: CITO_BLUE, space: 8 },
        },
        children: [],
      }),
      new Paragraph({
        alignment: AlignmentType.CENTER,
        spacing: { before: 600 },
        children: [
          new TextRun({
            text: "Doelen-Inspanningennetwerk (DIN)",
            size: 22,
            color: TEXT_SECONDARY,
            font: "Calibri",
          }),
        ],
      }),
      new Paragraph({
        alignment: AlignmentType.CENTER,
        spacing: { before: 120 },
        children: [
          new TextRun({
            text: "Methodiek: Werken aan Programma\u2019s (Prevaas & Van Loon)",
            size: 18,
            color: TEXT_MUTED,
            font: "Calibri",
            italics: true,
          }),
        ],
      }),
      new Paragraph({
        alignment: AlignmentType.CENTER,
        spacing: { before: 800 },
        children: [
          new TextRun({
            text: `Gegenereerd: ${new Date().toLocaleDateString("nl-NL", {
              day: "numeric",
              month: "long",
              year: "numeric",
            })}`,
            size: 20,
            color: TEXT_MUTED,
            italics: true,
            font: "Calibri",
          }),
        ],
      }),
    ],
  };
}

function tableOfContentsSection(_numState: NumberingState) {
  // Auto-populated Word TOC field — Word vraagt bij openen "Update fields?" → Ja
  // levert dan paginanummers per heading.
  const children: (Paragraph | TableOfContents)[] = [];

  children.push(heading("Inhoudsopgave", HeadingLevel.HEADING_1));
  children.push(emptyLine(60));

  children.push(
    new TableOfContents("Programmaplan-inhoudsopgave", {
      hyperlink: true,
      headingStyleRange: "1-2",
    })
  );

  return { properties: {}, children };
}

function executiveSummarySection(session: DINSession, numState: NumberingState, activeEfforts: DINEffort[], activeCaps: DINCapability[]) {
  const children: (Paragraph | Table)[] = [];

  children.push(plainH1("Managementsamenvatting", numState));
  children.push(
    methodiekIntro(
      "Deze samenvatting bundelt de kern van het programma: de visie, de omvang van het DIN-netwerk, " +
      "en de drie cross-sectorale bevindingen die de richting bepalen. Gedetailleerde onderbouwing " +
      "volgt in Hoofdstuk 1 t/m 5."
    )
  );

  // Programmanaam + visie
  if (session.vision?.beknopt) {
    children.push(bodyText(session.vision.beknopt, { italic: true, color: TEXT_SECONDARY, size: 22 }));
    children.push(emptyLine(60));
  }

  // Cijfers in tabel
  const statsRow = new TableRow({
    children: [
      styledCell(`${session.goals.length}`, { bold: true, shading: CITO_BLUE_LIGHT, width: 25 }),
      styledCell(`${session.benefits.length}`, { bold: true, shading: CITO_BLUE_LIGHT, width: 25 }),
      styledCell(`${activeCaps.length}`, { bold: true, shading: CITO_BLUE_LIGHT, width: 25 }),
      styledCell(`${activeEfforts.length}`, { bold: true, shading: CITO_BLUE_LIGHT, width: 25 }),
    ],
  });
  const labelRow = new TableRow({
    children: [
      styledCell("Doelen", { color: CITO_BLUE, size: 18, width: 25 }),
      styledCell("Baten", { color: CITO_BLUE, size: 18, width: 25 }),
      styledCell("Vermogens", { color: CITO_BLUE, size: 18, width: 25 }),
      styledCell("Inspanningen", { color: CITO_BLUE, size: 18, width: 25 }),
    ],
  });

  children.push(
    new Table({
      width: { size: 100, type: WidthType.PERCENTAGE },
      rows: [statsRow, labelRow],
    })
  );
  children.push(emptyLine());

  // 3 kernboodschappen cross-sectoraal
  children.push(subHeading("Drie cross-sectorale kernboodschappen"));

  const shared = findSharedCapabilities(activeCaps);
  children.push(bullet(
    `${shared.size} gedeelde vermogens tussen sectoren \u2014 cross-sectorale synergie is de belangrijkste hefboom van dit programma.`
  ));

  const hefbomen = analyzeHefbomen(session);
  const hefboomCount = hefbomen.reduce(
    (n, h) => n + h.clusters.filter((c) => c.hefboomScore > 1).length,
    0
  );
  children.push(bullet(
    `${hefboomCount} multi-sector hefboomclusters geïdentificeerd \u2014 gezamenlijke inspanningen met breed sectoraal effect.`
  ));

  const balance = getDomainBalance(activeEfforts);
  const totBal = Object.values(balance).reduce((a, b) => a + b, 0) || 1;
  const balanceBullets = DOMEIN_OUTSIDE_IN_ORDER.map((d) => {
    const pct = Math.round(((balance[d] ?? 0) / totBal) * 100);
    return `${DOMAIN_LABELS[d]} ${pct}%`;
  }).join(" \u2022 ");
  children.push(bullet(
    `Domeinbalans (cultuur \u2192 mens \u2192 data/systemen \u2192 processen): ${balanceBullets}.`
  ));

  children.push(emptyLine(60));

  // Programmaduur + budget uit stap 8
  const stap8 = session.crossAnalyseWizard?.stepResults?.stap8 as Stap8Totaaloverzicht | undefined;
  const planning = session.planningVoorstel;
  const kwartalenSet = new Set<string>();
  planning?.bundelPlanning.forEach((bp) => {
    if (bp.startKwartaal) kwartalenSet.add(bp.startKwartaal);
    if (bp.eindKwartaal) kwartalenSet.add(bp.eindKwartaal);
  });
  const kwSorted = Array.from(kwartalenSet).sort();
  if (kwSorted.length >= 2 || stap8) {
    children.push(subHeading("Programmaduur en raming"));
    if (kwSorted.length >= 2) {
      children.push(bullet(`Programmaduur: ${kwSorted[0]} t/m ${kwSorted[kwSorted.length - 1]} (${planning?.bundelPlanning.length ?? 0} bundels)`));
    }
    if (stap8) {
      const actief = stap8.actiefScenario ?? "optimaal";
      const sc = stap8.scenarios[actief];
      if (sc) {
        children.push(bullet(
          `Totaal geraamd (${SCENARIO_LABELS[actief]}): ${formatEuro(sc.totaalGeraamd)} ` +
          `(out-of-pocket ${formatEuro(sc.totaalOutOfPocket)} + interne uren ${formatEuro(sc.totaalInterneUren)}).`
        ));
      }
    }
    children.push(emptyLine(60));
  }

  // Wat wordt van stakeholders gevraagd
  const po = session.programmaorganisatie;
  if (po?.besluitvormingsritme || po?.escalatiepad) {
    children.push(subHeading("Wat wordt van stakeholders gevraagd"));
    if (po.besluitvormingsritme) {
      children.push(bullet(`Besluitvormingsritme: ${po.besluitvormingsritme}`));
    }
    if (po.escalatiepad) {
      children.push(bullet(`Escalatiepad: ${po.escalatiepad}`));
    }
  }

  return { properties: {}, children };
}

export function overviewSection(session: DINSession, numState: NumberingState) {
  const children: (Paragraph | Table)[] = [];

  children.push(numberedHeading("Programmavisie en scope", "h1", numState));
  children.push(
    methodiekIntro(
      "De programmavisie geeft de richting van het geheel: waartoe is dit programma bedoeld en wat valt " +
      "er binnen en buiten de cyclus. Volgens \"Werken aan Programma's\" (Prevaas & Van Loon, Hfst. 2) " +
      "opent een programmaplan met de visie en de scope; beide vormen het fundament waartoe alle baten, " +
      "vermogens en inspanningen worden opgebouwd."
    )
  );
  children.push(emptyLine());

  // Visie
  if (session.vision) {
    children.push(numberedHeading("Programmavisie", "h2", numState));
    if (session.vision.beknopt) {
      children.push(subHeading("Beknopt"));
      children.push(bodyText(session.vision.beknopt, { bold: true, size: 24 }));
    }
    if (session.vision.uitgebreid) {
      children.push(subHeading("Uitgebreid"));
      children.push(bodyText(session.vision.uitgebreid));
    }
  }


  // Scope: alleen binnen scope. Buiten scope wordt afgeleid uit Stap 4 (volgende-cyclus doelen).
  if (session.scope) {
    children.push(numberedHeading("Scope", "h2", numState));
    if (session.scope.inScope.length > 0) {
      children.push(subHeading("Binnen scope"));
      session.scope.inScope.forEach((s) => children.push(bullet(s)));
    }

    // Afgeleide "buiten deze cyclus" uit Stap 4 gap-analyse
    const cats = categorizeGaps(session);
    const buitenItems: string[] = [];
    cats.volgendeCyclus.forEach((g) => buitenItems.push(`Doel: ${g.name} \u2014 wordt in volgende cyclus uitgewerkt`));
    if (session.scope.outScope.length > 0) {
      session.scope.outScope.forEach((s) => buitenItems.push(s));
    }
    if (buitenItems.length > 0) {
      children.push(subHeading("Buiten deze cyclus"));
      children.push(bodyText(
        "Onderstaande items vallen buiten de huidige programmacyclus \u2014 afgeleid uit de cross-sectorale uitkomst (Hoofdstuk 3) en expliciete scope-uitsluitingen.",
        { color: TEXT_SECONDARY, size: 20 }
      ));
      buitenItems.forEach((item) => children.push(bullet(item)));
    }
  }


  return { properties: {}, children };
}

// --- Hoofdstuk 2 — Programmadoelen (met werkvolgorde-toelichting) ---
function programmaDoelenSection(session: DINSession, numState: NumberingState) {
  const children: (Paragraph | Table)[] = [];

  children.push(numberedHeading("Programmadoelen", "h1", numState));
  children.push(
    methodiekIntro(
      "De programmadoelen zijn de kernonderwerpen van het programma. Doelen zijn binnen DIN " +
      "(Doelen-Inspanningennetwerk) het hoogste niveau van de keten (Prevaas & Van Loon, Hfst. 3). " +
      "Pas wanneer doel 1 zijn baten realiseert, schuift het programma door naar doel 2 en 3."
    )
  );
  children.push(emptyLine());

  const sortedGoals = [...session.goals].sort((a, b) => a.rank - b.rank);
  type Stap5 = { focusDoelId?: string };
  const focusDoelId = (session.crossAnalyseWizard?.stepResults?.stap5 as Stap5 | undefined)?.focusDoelId;
  const focusDoel = focusDoelId ? sortedGoals.find((g) => g.id === focusDoelId) : sortedGoals[0];
  const overigeDoelen = focusDoel ? sortedGoals.filter((g) => g.id !== focusDoel.id) : sortedGoals.slice(1);

  if (sortedGoals.length > 0) {
    children.push(subHeading("Werkvolgorde"));
    const overigeNamen = overigeDoelen.map((g) => `doel ${g.rank}`).join(", ");
    const focusText = focusDoel ? `doel ${focusDoel.rank} ("${focusDoel.name}")` : "doel 1";
    children.push(bodyText(
      `De programmadoelen worden volgordelijk opgepakt. We werken ${focusText} eerst volledig af ` +
      (overigeNamen ? `voordat de overige doelen (${overigeNamen}) aan de beurt komen. ` : `voordat de overige doelen aan de beurt komen. `) +
      "Dit borgt focus, haalbaarheid en de mogelijkheid om geleerde lessen mee te nemen naar de volgende doelcyclus.",
      { size: 22, color: TEXT_PRIMARY }
    ));
    children.push(emptyLine());
  }

  // 2.1 Overzicht doelen met thematische spreiding
  children.push(numberedHeading("Overzicht programmadoelen", "h2", numState));
  children.push(bodyText(
    "De programmadoelen met hun thematische spreiding over de sectoren. Het focusdoel is het doel waarop het programma op dit moment werkt.",
    { color: TEXT_SECONDARY, size: 20 }
  ));

  const doelRows = sortedGoals.slice(0, 8).map((g) => {
    const benefits = session.benefits.filter((b) => b.goalId === g.id);
    const sectorsHit = new Set(benefits.map((b) => b.sectorId));
    const isFocus = g.id === focusDoel?.id;
    return new TableRow({
      children: [
        styledCell(`${g.rank}`, { bold: true, width: 6, shading: isFocus ? "FEF3C7" : CITO_BLUE_LIGHT, color: CITO_BLUE }),
        styledCell(`${g.name}${isFocus ? "  (focus)" : ""}`, { bold: true, width: 46 }),
        styledCell(`${sectorsHit.size}`, { width: 14 }),
        styledCell(`${benefits.length}`, { width: 14 }),
        styledCell(Array.from(sectorsHit).join(", ") || "—", { width: 20 }),
      ],
    });
  });
  children.push(
    new Table({
      width: { size: 100, type: WidthType.PERCENTAGE },
      rows: [
        new TableRow({
          children: [
            headerCell("#", 6),
            headerCell("Onderwerp (programmadoel)", 46),
            headerCell("Sectoren", 14),
            headerCell("Baten", 14),
            headerCell("Sector-spreiding", 20),
          ],
        }),
        ...doelRows,
      ],
    })
  );
  children.push(emptyLine());

  // 2.2 Doelen met beschrijvingen
  children.push(numberedHeading("Programmadoelen in detail", "h2", numState));
  const goalIdsWithBenefits = new Set(session.goalBenefitMaps.map((m) => m.goalId));

  sortedGoals.forEach((g) => {
    const isFocus = g.id === focusDoel?.id;
    const headerChildren = [
      new TextRun({ text: `${g.rank}. `, bold: true, color: CITO_BLUE, size: 24, font: "Calibri" }),
      new TextRun({ text: g.name, bold: true, size: 24, color: TEXT_PRIMARY, font: "Calibri" }),
    ];
    if (isFocus) {
      headerChildren.push(new TextRun({ text: "  (focus)", italics: true, size: 20, color: "B45309", font: "Calibri" }));
    }
    children.push(new Paragraph({ spacing: { after: 40 }, children: headerChildren }));
    if (g.description) {
      children.push(bodyText(g.description, { italic: true, color: TEXT_SECONDARY, size: 20 }));
    }
    if (!goalIdsWithBenefits.has(g.id)) {
      children.push(bodyText("Uitwerking volgt in volgende cyclus", { italic: true, color: TEXT_MUTED }));
    }
    children.push(emptyLine(40));
  });

  return { properties: {}, children };
}

function dinPerSectorSection(session: DINSession, numState: NumberingState, activeCaps: DINCapability[], activeEfforts: DINEffort[]) {
  const children: (Paragraph | Table)[] = [];

  children.push(numberedHeading("DIN-mapping per sector", "h1", numState));
  children.push(
    methodiekIntro(
      "De kern van het programma zit in de DIN-mapping. Per sector (PO, VO, Zakelijk) zijn de doelen vertaald " +
      "naar baten (effecten in de buitenwereld), vermogens (wat de sector moet kunnen) en inspanningen " +
      "(wat de sector gaat doen) vanuit de eigen context. De cross-sectorale samenhang volgt in Hoofdstuk 4."
    )
  );
  children.push(emptyLine());

  // Build an activeSession with only non-consolidated caps/efforts for buildChainsForSector
  const activeSession: DINSession = {
    ...session,
    capabilities: activeCaps,
    efforts: activeEfforts,
  };

  const dinActiveSectors = SECTORS.filter(
    (s) => session.benefits.some((b) => b.sectorId === s)
  );

  const sortedGoals = [...session.goals]
    .sort((a, b) => a.rank - b.rank)
    .filter((g) => session.benefits.some((b) => b.goalId === g.id));

  // Sector-first iteration: per sector toon je per programmadoel de keten
  dinActiveSectors.forEach((sector) => {
    const sectorBenefitsCount = session.benefits.filter((b) => b.sectorId === sector).length;
    const sectorCapsCount = activeCaps.filter((c) => c.sectorId === sector).length;
    const sectorEffortsCount = activeEfforts.filter((e) => e.sectorId === sector).length;

    children.push(numberedHeading(`Sector ${sector}`, "h2", numState));
    children.push(bodyText(
      `${sectorBenefitsCount} baten, ${sectorCapsCount} vermogens en ${sectorEffortsCount} inspanningen verdeeld over de programmadoelen.`,
      { italic: true, color: TEXT_SECONDARY, size: 20 }
    ));
    children.push(emptyLine(60));

    sortedGoals.forEach((goal) => {
      const chainResult = buildChainsForSector(activeSession, goal.id, sector);
      if (chainResult.chains.length === 0 && chainResult.unlinkedCaps.length === 0) return;

      children.push(
        new Paragraph({
          spacing: { before: 200, after: 80 },
          children: [
            new TextRun({ text: `Doel ${goal.rank}: ${goal.name}`, bold: true, size: 22, color: CITO_BLUE, font: "Calibri" }),
          ],
        })
      );

      // Gekoppelde ketens: Baat → Vermogen(s) → Inspanning(en)
      chainResult.chains.forEach((chain) => {
          // Baat
          const baatLabel = chain.benefit.title || chain.benefit.description || "\u2014";
          const indicator = chain.benefit.profiel.indicator
            ? ` (${chain.benefit.profiel.indicator}: ${chain.benefit.profiel.currentValue || "?"} \u2192 ${chain.benefit.profiel.targetValue || "?"})`
            : "";
          const eigenaar = chain.benefit.profiel.bateneigenaar
            ? ` \u2014 ${chain.benefit.profiel.bateneigenaar}`
            : "";

          children.push(
            new Paragraph({
              spacing: { before: 80, after: 40 },
              indent: { left: 200 },
              children: [
                new TextRun({ text: "BAAT  ", bold: true, size: 16, color: "FFFFFF", font: "Calibri" }),
                new TextRun({ text: baatLabel, bold: true, size: 20, color: TEXT_PRIMARY, font: "Calibri" }),
                new TextRun({ text: indicator, size: 18, color: TEXT_SECONDARY, font: "Calibri" }),
                new TextRun({ text: eigenaar, size: 18, color: TEXT_MUTED, font: "Calibri" }),
              ],
            })
          );

          // Meetmethode/meetmoment
          if (chain.benefit.profiel.meetmethode) {
            const meetInfo = `Meetmethode: ${chain.benefit.profiel.meetmethode}` +
              (chain.benefit.profiel.measurementMoment ? ` | Meetmoment: ${chain.benefit.profiel.measurementMoment}` : "");
            children.push(
              new Paragraph({
                spacing: { after: 30 },
                indent: { left: 400 },
                children: [new TextRun({ text: meetInfo, size: 16, color: TEXT_MUTED, italics: true, font: "Calibri" })],
              })
            );
          }

          // Vermogens + Inspanningen
          chain.links.forEach((link) => {
            const capLabel = link.capability.title || link.capability.description || "\u2014";
            const isSharedCap = (link.capability.relatedSectors?.length || 0) > 1;
            const sharedCapSuffix = isSharedCap ? " (gedeeld)" : "";
            const levelInfo = link.capability.currentLevel && link.capability.targetLevel
              ? ` (niveau: ${link.capability.currentLevel}/5 \u2192 ${link.capability.targetLevel}/5)`
              : "";

            const capChildren: TextRun[] = [
              new TextRun({ text: "VERM  ", bold: true, size: 16, color: CITO_BLUE, font: "Calibri" }),
              new TextRun({ text: capLabel, bold: true, size: 20, color: TEXT_SECONDARY, font: "Calibri" }),
            ];
            if (isSharedCap) {
              capChildren.push(new TextRun({ text: sharedCapSuffix, italics: true, size: 18, color: TEXT_MUTED, font: "Calibri" }));
            }
            if (levelInfo) {
              capChildren.push(new TextRun({ text: levelInfo, size: 18, color: TEXT_MUTED, font: "Calibri" }));
            }

            children.push(
              new Paragraph({
                spacing: { before: 40, after: 30 },
                indent: { left: 600 },
                children: capChildren,
              })
            );

            // Inspanningen onder dit vermogen
            link.efforts.forEach((effort) => {
              const domLabel = DOMAIN_LABELS[effort.domain];
              const efLabel = effort.title || effort.description || "\u2014";
              const quarter = effort.quarter ? ` (${effort.quarter})` : "";

              children.push(
                new Paragraph({
                  spacing: { after: 20 },
                  indent: { left: 1000 },
                  children: [
                    new TextRun({ text: `[${domLabel}] `, bold: true, size: 18, color: TEXT_SECONDARY, font: "Calibri" }),
                    new TextRun({ text: efLabel, size: 18, color: TEXT_PRIMARY, font: "Calibri" }),
                    new TextRun({ text: quarter, size: 18, color: TEXT_MUTED, font: "Calibri" }),
                  ],
                })
              );
            });
          });

          // Baat zonder vermogens
          if (chain.links.length === 0) {
            children.push(
              new Paragraph({
                spacing: { after: 30 },
                indent: { left: 600 },
                children: [
                  new TextRun({ text: "Nog geen vermogens gekoppeld aan deze baat", italics: true, size: 18, color: "CC6600", font: "Calibri" }),
                ],
              })
            );
          }
        });

        // Ongekoppelde vermogens
        if (chainResult.unlinkedCaps.length > 0) {
          children.push(
            new Paragraph({
              spacing: { before: 80, after: 40 },
              indent: { left: 200 },
              children: [
                new TextRun({ text: "Overige vermogens (niet gekoppeld aan een baat)", italics: true, size: 18, color: TEXT_MUTED, font: "Calibri" }),
              ],
            })
          );
          chainResult.unlinkedCaps.forEach((c) => {
            children.push(bullet(`${c.title || c.description}`, 600));
          });
        }
      });

      children.push(horizontalRule());
    });

  return { properties: {}, children };
}

function crossAnalysisSection(session: DINSession, numState: NumberingState, activeCaps: DINCapability[], activeEfforts: DINEffort[]) {
  const children: (Paragraph | Table)[] = [];

  children.push(numberedHeading("Cross-sectorale uitkomst — de kern", "h1", numState));
  children.push(
    methodiekIntro(
      "Vanuit de DIN-mapping is per sector (PO, VO, Zakelijk) een onafhankelijke keten van baten, vermogens en " +
      "inspanningen opgesteld. Die sector-DIN's overlappen sterk: dezelfde vermogens komen op meerdere plekken " +
      "terug. Hieronder is dat samengevoegd tot één cross-sectorale uitkomst — geconsolideerde inspanningen per " +
      "domein, een doorgerekende begroting, en een uiteindelijke DIN die teruggebracht is naar elke sector. Een " +
      "programma is meer dan de optelsom van sectorinitiatieven (Prevaas & Van Loon, Hfst. 4)."
    )
  );
  children.push(emptyLine());

  // Synergieën — gedeelde vermogens (use active caps only)
  const shared = findSharedCapabilities(activeCaps);
  if (shared.size > 0) {
    children.push(numberedHeading("Synergie\u00ebn \u2014 Gedeelde vermogens", "h2", numState));
    children.push(bodyText(
      `Onderstaande ${shared.size} vermogens komen in meerdere sectoren terug en bieden kansen voor gedeelde inspanningen.`,
      { color: TEXT_SECONDARY, size: 20 }
    ));
    for (const [capId, sectors] of shared) {
      const cap = activeCaps.find((c) => c.id === capId);
      if (cap) {
        children.push(
          bullet(`${cap.title || cap.description} \u2014 Sectoren: ${sectors.join(", ")}`)
        );
      }
    }
    children.push(emptyLine());
  }

  // 4.2 Hefboomwerking
  const hefbomen = analyzeHefbomen(session);
  const multiSectorClusters = hefbomen.flatMap((h) => {
    const goal = session.goals.find((g) => g.id === h.goalId);
    return h.clusters
      .filter((c) => c.hefboomScore > 1)
      .map((cluster) => ({
        goal,
        cluster,
        chains: h.clusterChains.get(cluster.benefits[0].id) || [],
      }));
  });
  if (multiSectorClusters.length > 0) {
    children.push(numberedHeading("Hefboomwerking", "h2", numState));
    children.push(bodyText(
      "Baten die in meerdere sectoren terugkomen bieden hefboomwerking: gedeelde inspanningen met breed effect.",
      { color: TEXT_SECONDARY, size: 20 }
    ));
    multiSectorClusters.forEach(({ goal, cluster, chains }) => {
      children.push(
        new Paragraph({
          spacing: { before: 160, after: 60 },
          children: [
            new TextRun({ text: cluster.theme, bold: true, size: 22, color: CITO_BLUE, font: "Calibri" }),
            new TextRun({
              text: `  (Doel: ${goal?.name || "\u2014"}) \u2014 ${cluster.sectors.length} sectoren`,
              size: 18, color: TEXT_MUTED, font: "Calibri",
            }),
          ],
        })
      );
      children.push(bullet(`Sectoren: ${cluster.sectors.join(", ")}`));
      if (chains.length > 0) {
        chains.forEach((ch) => {
          const capNames = ch.capabilities.map((c) => c.title || c.description).join(", ");
          const detail = capNames ? ` \u2192 ${capNames}` : "";
          children.push(
            new Paragraph({
              spacing: { after: 30 },
              indent: { left: 600 },
              children: [
                new TextRun({ text: `${ch.sector}: `, bold: true, size: 20, color: TEXT_PRIMARY, font: "Calibri" }),
                new TextRun({ text: `${ch.benefit.title || ch.benefit.description}${detail}`, size: 20, color: TEXT_SECONDARY, font: "Calibri" }),
              ],
            })
          );
        });
      }
      children.push(emptyLine(80));
    });
  }

  // (Domeinbalans verwijderd — komt al terug in stap-optimalisatie en managementsamenvatting.)

  // Sector-overlap & integratieadvies (samenvatting — volledige sector-vertaling volgt onderaan deze stap)
  const integratieRecord = session.integratieAdvies as Record<string, IntegratieAdviesResult | undefined> | undefined;
  const adviesEntries = integratieRecord
    ? Object.entries(integratieRecord).filter(([, v]) => v && typeof v === "object")
    : [];
  if (adviesEntries.length > 0) {
    children.push(numberedHeading("Sector-overlap en integratieadvies", "h2", numState));
    children.push(bodyText(
      "Per sector is een integratieadvies beschikbaar dat het cross-sectorale programma vertaalt naar de sectorcontext. " +
      "De volledige teksten staan onderaan deze stap onder \"Uiteindelijke DIN-netwerk — sector-vertaling\".",
      { color: TEXT_SECONDARY, size: 20 }
    ));
    adviesEntries.forEach(([sectorKey, rawAdv]) => {
      const adv = rawAdv as IntegratieAdviesResult;
      const summary = (adv.aansluiting?.toelichting || "\u2014").trim();
      const short = summary.length > 220 ? summary.slice(0, 217) + "\u2026" : summary;
      children.push(
        new Paragraph({
          spacing: { before: 80, after: 40 },
          children: [
            new TextRun({ text: `${adv.sectorName || sectorKey}: `, bold: true, size: 22, color: CITO_BLUE, font: "Calibri" }),
            new TextRun({ text: short, size: 20, color: TEXT_PRIMARY, font: "Calibri" }),
          ],
        })
      );
    });
    children.push(emptyLine());
  }


  // 4.6 Externe projecten
  if (session.externalProjects && session.externalProjects.length > 0) {
    children.push(numberedHeading("Externe projecten", "h2", numState));
    children.push(bodyText(
      "Bestaande projecten gekoppeld aan het DIN-netwerk, gepositioneerd als inspanningen bij de relevante vermogens.",
      { color: TEXT_SECONDARY, size: 20 }
    ));
    const projectRows = session.externalProjects.map((p) => {
      const linkedCaps = (session.projectCapabilityMaps ?? [])
        .filter((m) => m.projectId === p.id)
        .map((m) => {
          const cap = session.capabilities.find((c) => c.id === m.capabilityId);
          return cap ? `${cap.title || cap.description}` : "\u2014";
        });
      return new TableRow({
        children: [
          styledCell(p.name || "\u2014", { bold: true, width: 30 }),
          styledCell(p.description || "\u2014", { width: 40 }),
          styledCell(linkedCaps.length > 0 ? linkedCaps.join("; ") : "Niet gekoppeld", { width: 30 }),
        ],
      });
    });
    children.push(
      new Table({
        width: { size: 100, type: WidthType.PERCENTAGE },
        rows: [
          new TableRow({
            children: [
              headerCell("Project", 30),
              headerCell("Beschrijving", 40),
              headerCell("Gekoppelde vermogens", 30),
            ],
          }),
          ...projectRows,
        ],
      })
    );
    children.push(emptyLine());
  }

  // 4.7 Stap-optimalisatie — geconsolideerde cross-sectorale inspanningen per domein (subEffortAnalysis)
  type Stap4Res = { subEffortAnalysis?: Array<{ groepId: string; domein: EffortDomain; actie: "combineren" | "apart_houden"; items: string[]; reden: string; voorgesteldeNaam?: string | null; titel?: string; beschrijving?: string; beargumentatie?: string; dossier?: { eigenaar?: string; inspanningsleider?: string; kostenraming?: string; verwachtResultaat?: string; randvoorwaarden?: string } }> };
  const stap4 = session.crossAnalyseWizard?.stepResults?.stap4 as Stap4Res | undefined;
  const subEffortAdvies = stap4?.subEffortAnalysis ?? [];
  if (subEffortAdvies.length > 0) {
    children.push(numberedHeading("Stap-optimalisatie: geconsolideerde inspanningen", "h2", numState));
    children.push(bodyText(
      "Volledige uitwerking van de cross-sectorale inspanningen per domein \u2014 voortgekomen uit de consolidatie van vermogen-gelijkenisgroepen. " +
      "Volgorde: cultuur \u2192 mens \u2192 data & systemen \u2192 processen.",
      { color: TEXT_SECONDARY, size: 20 }
    ));
    const sorted = sortDomeinenOutsideIn(subEffortAdvies);
    sorted.forEach((se) => {
      const itemLabels = resolveItemLabels(se.items, session);
      const titel = se.titel || se.voorgesteldeNaam || itemLabels.join(" + ") || `${DOMAIN_LABELS[se.domein]} inspanning`;
      children.push(
        new Paragraph({
          spacing: { before: 160, after: 40 },
          children: [
            new TextRun({ text: `${DOMAIN_LABELS[se.domein]}: `, bold: true, size: 22, color: CITO_BLUE, font: "Calibri" }),
            new TextRun({ text: titel, bold: true, size: 22, color: TEXT_PRIMARY, font: "Calibri" }),
            new TextRun({ text: ` \u2014 ${se.actie === "combineren" ? "combineren" : "apart houden"}`, size: 18, color: TEXT_MUTED, font: "Calibri" }),
          ],
        })
      );
      if (se.beschrijving) {
        children.push(bodyText(se.beschrijving, { size: 20, color: TEXT_PRIMARY }));
      }
      if (se.beargumentatie) {
        children.push(bodyText(`Beargumentatie: ${se.beargumentatie}`, { italic: true, size: 20, color: TEXT_SECONDARY }));
      }
      if (itemLabels.length > 0) {
        children.push(bodyText(`Onderliggende sector-inspanningen: ${itemLabels.join("; ")}`, { size: 18, color: TEXT_MUTED }));
      }
      if (se.dossier) {
        const d = se.dossier;
        const dossierRows: string[] = [];
        if (d.eigenaar) dossierRows.push(`Eigenaar: ${d.eigenaar}`);
        if (d.inspanningsleider) dossierRows.push(`Leider: ${d.inspanningsleider}`);
        if (d.kostenraming) dossierRows.push(`Kosten: ${d.kostenraming}`);
        if (d.verwachtResultaat) dossierRows.push(`Resultaat: ${d.verwachtResultaat}`);
        if (d.randvoorwaarden) dossierRows.push(`Randvoorwaarden: ${d.randvoorwaarden}`);
        if (dossierRows.length > 0) {
          dossierRows.forEach((r) => children.push(bullet(r)));
        }
      }
      if (se.reden) {
        children.push(bodyText(`Reden consolidatie: ${se.reden}`, { italic: true, size: 18, color: TEXT_MUTED }));
      }
      children.push(emptyLine(60));
    });
  }

  // Begroting — scenario-totaaloverzicht (4 scenarios + motivatie waarom actief scenario)
  // Datasources (zelfde als StapTotaaloverzicht.tsx):
  // - stap4.begrotingAdvies   → out-of-pocket (totaalGeraamdEuro) + samenvatting + prioriteitAdvies
  // - stap4.stap7InterneUren  → interne uren + interne kosten
  // - stap8 (optioneel)       → fallback indien expliciet opgeslagen
  type ScenarioKeyLocal = "optimaal" | "plus20" | "min20" | "advies";
  type BegrotingScenarioLocal = { totaalGeraamdEuro?: number; samenvatting?: string; prioriteitAdvies?: string };
  type BegrotingAdvLocal = { scenarios?: Partial<Record<ScenarioKeyLocal, BegrotingScenarioLocal | null>> };
  type InterneUrenScenarioLocal = { totaalUren?: number; totaalKosten?: number };
  type Stap7InterneLocal = { scenarios?: Partial<Record<ScenarioKeyLocal, InterneUrenScenarioLocal | null>> };
  type Stap4ResLocal = { begrotingAdvies?: BegrotingAdvLocal; stap7InterneUren?: Stap7InterneLocal };
  type ScenarioTot = { totaalOutOfPocket: number; totaalInterneUren: number; totaalGeraamd: number };
  type Stap8Local = { actiefScenario?: ScenarioKeyLocal; scenarios?: Partial<Record<ScenarioKeyLocal, ScenarioTot | null>> };

  const stap4Tot = (session.crossAnalyseWizard?.stepResults as { stap4?: Stap4ResLocal } | undefined)?.stap4;
  const stap8Tot = (session.crossAnalyseWizard?.stepResults as { stap8?: Stap8Local } | undefined)?.stap8;
  const begrotingTot = stap4Tot?.begrotingAdvies;
  const interneUrenTot = stap4Tot?.stap7InterneUren;

  const scenarioOrder: ScenarioKeyLocal[] = ["optimaal", "plus20", "min20", "advies"];
  const computedRows = scenarioOrder
    .map((key) => {
      const b = begrotingTot?.scenarios?.[key] ?? null;
      const i = interneUrenTot?.scenarios?.[key] ?? null;
      const fromStap8 = stap8Tot?.scenarios?.[key] ?? null;

      const outOfPocket = b?.totaalGeraamdEuro ?? fromStap8?.totaalOutOfPocket ?? 0;
      const interneKosten = i?.totaalKosten ?? fromStap8?.totaalInterneUren ?? 0;
      const totaalGeraamd = (outOfPocket + interneKosten) || fromStap8?.totaalGeraamd || 0;
      const interneUrenAantal = i?.totaalUren ?? 0;

      if (outOfPocket === 0 && interneKosten === 0 && totaalGeraamd === 0 && !b && !i && !fromStap8) {
        return null;
      }
      return { key, outOfPocket, interneKosten, interneUrenAantal, totaalGeraamd };
    })
    .filter((r): r is NonNullable<typeof r> => r !== null);

  if (computedRows.length > 0) {
    children.push(numberedHeading("Begroting — scenario-totaaloverzicht", "h2", numState));
    children.push(bodyText(
      "Vier scenario's zijn doorgerekend: het huidig jaarbudget, een +20%- en −20%-variant, en een optimaal " +
      "advies. Het actieve scenario vormt de basis voor de programmabegroting.",
      { color: TEXT_SECONDARY, size: 20 }
    ));

    const actiefKey: ScenarioKeyLocal = stap8Tot?.actiefScenario ?? "optimaal";
    const totRows = computedRows.map((r) => {
      const isActief = r.key === actiefKey;
      const interneCellTekst = r.interneUrenAantal > 0
        ? `${formatEuro(r.interneKosten)} (${formatGetal(r.interneUrenAantal)} u)`
        : formatEuro(r.interneKosten);
      return new TableRow({
        children: [
          styledCell(SCENARIO_LABELS[r.key] + (isActief ? " (actief)" : ""), { bold: true, width: 28, shading: isActief ? CITO_BLUE_LIGHT : undefined }),
          styledCell(formatEuro(r.outOfPocket), { width: 24 }),
          styledCell(interneCellTekst, { width: 24 }),
          styledCell(formatEuro(r.totaalGeraamd), { width: 24, bold: true }),
        ],
      });
    });
    children.push(
      new Table({
        width: { size: 100, type: WidthType.PERCENTAGE },
        rows: [
          new TableRow({
            children: [
              headerCell("Scenario", 28),
              headerCell("Out-of-pocket", 24),
              headerCell("Interne uren (kosten)", 24),
              headerCell("Totaal geraamd", 24),
            ],
          }),
          ...totRows,
        ],
      })
    );
    children.push(emptyLine());

    // Motivatie waarom dit actieve scenario gekozen is
    const actiefMotivatie = begrotingTot?.scenarios?.[actiefKey]?.samenvatting?.trim() || "";
    const actiefAdvies = begrotingTot?.scenarios?.[actiefKey]?.prioriteitAdvies?.trim() || "";
    if (actiefMotivatie || actiefAdvies) {
      children.push(bodyText(
        `Motivatie — waarom "${SCENARIO_LABELS[actiefKey]}"?`,
        { bold: true, size: 22, color: CITO_BLUE }
      ));
      if (actiefMotivatie) {
        children.push(bodyText(actiefMotivatie, { size: 22, color: TEXT_PRIMARY }));
      }
      if (actiefAdvies) {
        children.push(bodyText(actiefAdvies, { italic: true, size: 22, color: TEXT_SECONDARY }));
      }
      children.push(emptyLine());
    }
  }

  // Uiteindelijke DIN-netwerk — integratieadvies per sector (sector-vertaling uit wizard-stap 9)
  const integratieRecord2 = session.integratieAdvies as Record<string, IntegratieAdviesResult | undefined> | undefined;
  const adviesItems = integratieRecord2
    ? Object.entries(integratieRecord2).filter(([, v]) => v && typeof v === "object")
    : [];
  if (adviesItems.length > 0) {
    children.push(numberedHeading("Uiteindelijke DIN-netwerk \u2014 sector-vertaling", "h2", numState));
    children.push(bodyText(
      "Het cross-sectorale DIN-netwerk vertaald terug naar elke sector: aansluiting, verrijking, aanvullingen, quick wins en aandachtspunten.",
      { color: TEXT_SECONDARY, size: 20 }
    ));
    adviesItems.forEach(([sectorKey, rawAdv]) => {
      const adv = rawAdv as IntegratieAdviesResult;
      children.push(
        new Paragraph({
          spacing: { before: 160, after: 40 },
          children: [
            new TextRun({ text: `Sector ${adv.sectorName || sectorKey}`, bold: true, size: 24, color: CITO_BLUE, font: "Calibri" }),
          ],
        })
      );
      const keys: Array<{ key: keyof IntegratieAdviesResult; label: string }> = [
        { key: "aansluiting", label: "Aansluiting" },
        { key: "verrijking", label: "Verrijking" },
        { key: "aanvullingen", label: "Aanvullingen" },
        { key: "quickWins", label: "Quick wins" },
        { key: "aandachtspunten", label: "Aandachtspunten" },
      ];
      keys.forEach(({ key, label }) => {
        const item = adv[key] as { titel?: string; toelichting?: string; punten?: string[] } | undefined;
        if (!item) return;
        const hasContent = (item.toelichting && item.toelichting.trim().length > 0) || (item.punten && item.punten.length > 0);
        if (!hasContent) return;
        children.push(bodyText(label, { bold: true, size: 22, color: CITO_BLUE }));
        if (item.toelichting) {
          children.push(bodyText(item.toelichting, { size: 20, color: TEXT_PRIMARY }));
        }
        (item.punten ?? []).forEach((p) => children.push(bullet(p)));
        children.push(emptyLine(40));
      });
    });
  }

  return { properties: {}, children };
}

function governanceSection(session: DINSession, numState: NumberingState, activeEfforts: DINEffort[]) {
  const hasGovernanceData =
    session.benefits.length > 0 ||
    session.programmaorganisatie ||
    (session.clusterRasci ?? []).length > 0;
  if (!hasGovernanceData) return null;

  const children: (Paragraph | Table)[] = [];

  children.push(numberedHeading("Programma-organisatie en RASCI", "h1", numState));
  children.push(
    methodiekIntro(
      "De programma-organisatie bepaalt de veranderkracht: wie beslist, wie draagt bij, wie wordt " +
      "ge\u00efnformeerd. De RASCI-matrix legt per hoofdthema (vermogen- en inspanningsclusters) " +
      "de verantwoordelijkheidsverdeling vast. Conform \"Werken aan Programma's\", Hoofdstuk 6."
    )
  );
  children.push(emptyLine());

  // Programmaorganisatie
  const po = session.programmaorganisatie;
  const allRollen: Array<{ id: string; groep: string; rol: string; naam?: string; sector?: string; mandaat?: string }> = [];
  if (po) {
    if (po.opdrachtgever) allRollen.push({ ...po.opdrachtgever, groep: "Opdrachtgever" });
    if (po.programmamanager) allRollen.push({ ...po.programmamanager, groep: "Programmamanager" });
    for (const r of po.kerngroep ?? []) allRollen.push({ ...r, groep: "Kerngroep" });
    for (const r of po.stuurgroep ?? []) allRollen.push({ ...r, groep: "Stuurgroep" });
    for (const r of po.domeineigenaren ?? []) allRollen.push({ ...r, groep: "Domeineigenaar" });
    for (const r of po.klankbordgroep ?? []) allRollen.push({ ...r, groep: "Klankbordgroep" });
  }

  if (po && allRollen.length > 0) {
    children.push(subHeading("Programmaorganisatie"));
    if (po.aiToelichting) {
      children.push(bodyText(po.aiToelichting, { italic: true, color: TEXT_SECONDARY, size: 20 }));
      children.push(emptyLine());
    }

    const rolRows = allRollen.map(
      (r) =>
        new TableRow({
          children: [
            styledCell(r.groep, { bold: true, width: 18 }),
            styledCell(`${r.rol}${r.naam ? ` \u2014 ${r.naam}` : ""}`, { width: 32 }),
            styledCell(r.sector || "\u2014", { width: 15 }),
            styledCell(r.mandaat || "\u2014", { width: 35 }),
          ],
        })
    );
    children.push(
      new Table({
        width: { size: 100, type: WidthType.PERCENTAGE },
        rows: [
          new TableRow({
            children: [
              headerCell("Gremium", 18),
              headerCell("Rol", 32),
              headerCell("Sector", 15),
              headerCell("Mandaat", 35),
            ],
          }),
          ...rolRows,
        ],
      })
    );
    children.push(emptyLine());

    if (po.besluitvormingsritme) {
      children.push(bodyText(`Besluitvormingsritme: ${po.besluitvormingsritme}`, { size: 20 }));
    }
    if (po.escalatiepad) {
      children.push(bodyText(`Escalatiepad: ${po.escalatiepad}`, { size: 20 }));
    }
    children.push(emptyLine());
  }

  // RASCI per hoofdthema
  const clusterRasci = session.clusterRasci ?? [];
  const rolMap = new Map(allRollen.map((r) => [r.id, r]));
  if (clusterRasci.length > 0) {
    children.push(subHeading("RASCI per hoofdthema"));
    children.push(
      bodyText(
        "Verantwoordelijkheidsverdeling per cross-sectoraal cluster \u2014 geldt voor alle onderliggende baten, vermogens en inspanningen binnen dat cluster.",
        { color: TEXT_SECONDARY, size: 20 }
      )
    );
    children.push(emptyLine());

    // Officiële RASCI-matrix: clusters (rijen) × rollen (kolommen)
    if (allRollen.length > 0) {
      children.push(bodyText("Offici\u00eble RASCI-matrix", { bold: true, size: 22, color: CITO_BLUE }));
      const clusterCol = 34;
      const rolColCount = allRollen.length;
      const rolColWidth = Math.max(4, Math.floor((100 - clusterCol) / Math.max(1, rolColCount)));
      const matrixHeader = new TableRow({
        children: [
          headerCell("Cluster", clusterCol),
          ...allRollen.map((rol) => headerCell(rol.rol, rolColWidth)),
        ],
      });
      const matrixRows = clusterRasci.map((c) => {
        const rijMap = new Map(c.rijen.map((r) => [r.rolId, r.letter]));
        return new TableRow({
          children: [
            styledCell(`${c.clusterType === "vermogen" ? "V" : "I"} \u2014 ${c.clusterTitel}`, {
              width: clusterCol,
              bold: true,
              size: 16,
            }),
            ...allRollen.map((rol) => {
              const letter = rijMap.get(rol.id);
              return styledCell(letter ?? "", {
                width: rolColWidth,
                bold: letter === "A",
                shading: letter === "A" ? "FFF3C4" : letter === "R" ? "DBEAFE" : undefined,
                size: 16,
              });
            }),
          ],
        });
      });
      children.push(
        new Table({
          width: { size: 100, type: WidthType.PERCENTAGE },
          rows: [matrixHeader, ...matrixRows],
        })
      );
      children.push(
        bodyText("V = vermogen-cluster, I = inspanning-cluster. A = Accountable (1 per rij), R = Responsible, S = Supportive, C = Consulted, I = Informed.", {
          italic: true,
          color: TEXT_SECONDARY,
          size: 16,
        })
      );
      children.push(emptyLine());
    }

    // Detailweergave per cluster met toelichting
    children.push(bodyText("Detailweergave per cluster", { bold: true, size: 22, color: CITO_BLUE }));
    for (const c of clusterRasci) {
      const perLetter: Record<string, string[]> = { R: [], A: [], S: [], C: [], I: [], V: [] };
      for (const rij of c.rijen) {
        const rol = rolMap.get(rij.rolId);
        if (rol && perLetter[rij.letter]) perLetter[rij.letter].push(rol.rol);
      }
      children.push(
        bodyText(`${c.clusterType === "vermogen" ? "Vermogen-cluster" : "Inspanning-cluster"}: ${c.clusterTitel}`, { bold: true, size: 22 })
      );
      children.push(
        new Table({
          width: { size: 100, type: WidthType.PERCENTAGE },
          rows: [
            new TableRow({
              children: [headerCell("Rol", 12), headerCell("Invullers", 88)],
            }),
            ...(["A", "R", "S", "C", "I", "V"] as const)
              .filter((letter) => letter !== "V" || (perLetter[letter]?.length ?? 0) > 0)
              .map(
                (letter) =>
                  new TableRow({
                    children: [
                      styledCell(letter, { bold: true, width: 12, shading: CITO_BLUE_LIGHT, color: CITO_BLUE }),
                      styledCell((perLetter[letter]?.length ?? 0) > 0 ? perLetter[letter].join("; ") : "\u2014", { width: 88 }),
                    ],
                  })
              ),
          ],
        })
      );
      if (c.toelichting) {
        children.push(bodyText(`Toelichting: ${c.toelichting}`, { italic: true, color: TEXT_SECONDARY, size: 20 }));
      }
      children.push(emptyLine());
    }
  }

  // RASCI per individueel item: baten / vermogens / inspanningen
  const itemRasci = session.itemRasci ?? [];
  if (itemRasci.length > 0 && allRollen.length > 0) {
    const renderItemMatrix = (
      sectionTitle: string,
      itemType: "benefit" | "capability" | "effort",
      lookupTitle: (id: string) => string
    ) => {
      const filtered = itemRasci.filter((i) => i.itemType === itemType);
      if (filtered.length === 0) return;
      children.push(subHeading(sectionTitle));
      const itemCol = 38;
      const rolColCount = allRollen.length;
      const rolColWidth = Math.max(4, Math.floor((100 - itemCol) / Math.max(1, rolColCount)));
      const headerRow = new TableRow({
        children: [
          headerCell("Item", itemCol),
          ...allRollen.map((rol) => headerCell(rol.rol, rolColWidth)),
        ],
      });
      const rows = filtered.map((it) => {
        const rijMap = new Map(it.rijen.map((r) => [r.rolId, r.letter]));
        return new TableRow({
          children: [
            styledCell(lookupTitle(it.itemId), { width: itemCol, bold: true, size: 14 }),
            ...allRollen.map((rol) => {
              const letter = rijMap.get(rol.id);
              return styledCell(letter ?? "", {
                width: rolColWidth,
                bold: letter === "A",
                shading:
                  letter === "A"
                    ? "FFF3C4"
                    : letter === "R"
                      ? "DBEAFE"
                      : letter === "V"
                        ? "CFFAFE"
                        : undefined,
                size: 14,
              });
            }),
          ],
        });
      });
      children.push(
        new Table({
          width: { size: 100, type: WidthType.PERCENTAGE },
          rows: [headerRow, ...rows],
        })
      );
      children.push(emptyLine());
    };

    renderItemMatrix("RASCI per baat", "benefit", (id) => {
      const b = session.benefits.find((x) => x.id === id);
      return b ? (b.title || b.description || "(naamloos)") : id;
    });
    renderItemMatrix("RASCI per individueel vermogen", "capability", (id) => {
      const c = session.capabilities.find((x) => x.id === id);
      return c ? `[${c.sectorId}] ${c.title || c.description || "(naamloos)"}` : id;
    });
  }

  // Bateneigenaren aggregeren
  const eigenaarMap: Record<string, { baten: string[]; sectors: Set<string> }> = {};
  session.benefits.forEach((b) => {
    const eigenaar = b.profiel.bateneigenaar || "Niet toegewezen";
    if (!eigenaarMap[eigenaar]) eigenaarMap[eigenaar] = { baten: [], sectors: new Set() };
    eigenaarMap[eigenaar].baten.push(b.title || b.description || "(naamloos)");
    eigenaarMap[eigenaar].sectors.add(b.sectorId);
  });

  children.push(subHeading("Bateneigenaren"));

  const eigenaarRows = Object.entries(eigenaarMap).map(
    ([eigenaar, data]) =>
      new TableRow({
        children: [
          styledCell(eigenaar, { bold: true, width: 25 }),
          styledCell(Array.from(data.sectors).join(", "), { width: 20 }),
          styledCell(data.baten.join("; "), { width: 55 }),
        ],
      })
  );

  children.push(
    new Table({
      width: { size: 100, type: WidthType.PERCENTAGE },
      rows: [
        new TableRow({
          children: [
            headerCell("Eigenaar", 25),
            headerCell("Sectoren", 20),
            headerCell("Verantwoordelijk voor baten", 55),
          ],
        }),
        ...eigenaarRows,
      ],
    })
  );
  children.push(emptyLine());


  return { properties: {}, children };
}

// --- Raming content builder (wordt aangeroepen binnen Stap 4 cross-sectorale analyse) ---
function buildRamingContent(session: DINSession, numState: NumberingState): (Paragraph | Table)[] {
  const children: (Paragraph | Table)[] = [];

  const wizard = session.crossAnalyseWizard;
  const stap7 = wizard?.stepResults?.stap7 as Stap7InterneUren | undefined;
  const stap8 = wizard?.stepResults?.stap8 as Stap8Totaaloverzicht | undefined;

  children.push(numberedHeading("Raming \u2014 interne uren, kosten en scenario's", "h2", numState));

  if (!stap7 && !stap8) {
    children.push(bodyText(
      "De raming is nog niet ingevuld. Open de Cross-analyse wizard (Stap 4) om de interne " +
      "uren per domein en de totaaloverzicht-scenario's te genereren.",
      { italic: true, color: TEXT_MUTED }
    ));
    return children;
  }

  // Uurtarief-instellingen
  if (stap7?.uurtariefSettings) {
    const s = stap7.uurtariefSettings;
    children.push(bodyText(
      `Basisuurtarief: ${formatEuro(s.basisTarief)} (referentiejaar ${s.referentiejaar}, indexatie ${s.indexatiePercentage}%/jaar).`,
      { size: 20, color: TEXT_SECONDARY }
    ));
    children.push(emptyLine(60));
  }

  // Scenario-vergelijking (stap 8)
  if (stap8?.scenarios) {
    children.push(bodyText("Scenario-vergelijking", { bold: true, size: 22, color: CITO_BLUE }));
    const scenLabels: Array<"optimaal" | "plus20" | "min20"> = ["optimaal", "plus20", "min20"];
    const scenarioRows = scenLabels
      .map((key) => {
        const sc = stap8.scenarios[key];
        if (!sc) return null;
        return new TableRow({
          children: [
            styledCell(SCENARIO_LABELS[key], { bold: true, width: 25, shading: key === (stap8.actiefScenario ?? "optimaal") ? CITO_BLUE_LIGHT : undefined }),
            styledCell(formatEuro(sc.totaalOutOfPocket), { width: 25 }),
            styledCell(formatEuro(sc.totaalInterneUren), { width: 25 }),
            styledCell(formatEuro(sc.totaalGeraamd), { width: 25, bold: true }),
          ],
        });
      })
      .filter((r): r is TableRow => r !== null);

    if (scenarioRows.length > 0) {
      children.push(
        new Table({
          width: { size: 100, type: WidthType.PERCENTAGE },
          rows: [
            new TableRow({
              children: [
                headerCell("Scenario", 25),
                headerCell("Out-of-pocket", 25),
                headerCell("Interne uren (kosten)", 25),
                headerCell("Totaal geraamd", 25),
              ],
            }),
            ...scenarioRows,
          ],
        })
      );
      if (stap8.actiefScenario) {
        children.push(bodyText(
          `Actief scenario voor programmabegroting: ${SCENARIO_LABELS[stap8.actiefScenario]}.`,
          { italic: true, size: 18, color: TEXT_SECONDARY }
        ));
      }
      children.push(emptyLine());
    }
  }

  // Interne uren — per domein per jaar (Cito outside-in volgorde)
  const actiefScenarioKey = stap8?.actiefScenario ?? "optimaal";
  const scenario = stap7?.scenarios?.[actiefScenarioKey] ?? stap7?.scenarios?.optimaal ?? null;

  if (scenario && scenario.domeinen.length > 0) {
    children.push(bodyText(
      `Interne uren per domein (${SCENARIO_LABELS[scenario.scenarioLabel]} \u2014 ${scenario.aantalJaren} jaar, startjaar ${scenario.startJaar})`,
      { bold: true, size: 22, color: CITO_BLUE }
    ));
    children.push(bodyText(
      "Verdeling in Cito outside-in volgorde: cultuur \u2192 mens \u2192 data & systemen \u2192 processen.",
      { italic: true, size: 18, color: TEXT_SECONDARY }
    ));
    children.push(emptyLine(60));

    const domeinenSorted = sortDomeinenOutsideIn(scenario.domeinen as DomeinInterneUren[]);
    domeinenSorted.forEach((dom) => {
      children.push(bodyText(
        `${DOMAIN_LABELS[dom.domein]}`,
        { bold: true, size: 22, color: CITO_BLUE }
      ));
      if (dom.motivatie) {
        children.push(bodyText(dom.motivatie, { italic: true, size: 20, color: TEXT_SECONDARY }));
      }

      // Koppeling aan bundels
      const bundels = session.planningVoorstel?.bundelPlanning ?? [];
      const gekoppeldeBundels = (dom.koppeling ?? [])
        .map((bid) => bundels.find((b) => b.bundelId === bid)?.titel)
        .filter((t): t is string => Boolean(t));
      if (gekoppeldeBundels.length > 0) {
        children.push(bodyText(
          `Gekoppeld aan bundels (Stap 6): ${gekoppeldeBundels.join("; ")}`,
          { size: 18, color: TEXT_MUTED }
        ));
      }

      // Jaartabel
      const jaarRows = dom.jaren.map((j) => {
        const totU = j.totaalUren ?? j.rollen.reduce((s, r) => s + r.uren, 0);
        const totK = j.totaalKosten ?? j.rollen.reduce((s, r) => s + r.kosten, 0);
        return new TableRow({
          children: [
            styledCell(`${j.jaar}`, { bold: true, width: 12 }),
            styledCell(j.activiteit || "\u2014", { width: 48 }),
            styledCell(formatGetal(totU), { width: 20 }),
            styledCell(formatEuro(totK), { width: 20 }),
          ],
        });
      });

      const domTotU = dom.totaalUren ?? dom.jaren.reduce((s, j) => s + (j.totaalUren ?? j.rollen.reduce((a, r) => a + r.uren, 0)), 0);
      const domTotK = dom.totaalKosten ?? dom.jaren.reduce((s, j) => s + (j.totaalKosten ?? j.rollen.reduce((a, r) => a + r.kosten, 0)), 0);

      const totaalRow = new TableRow({
        children: [
          styledCell("Totaal", { bold: true, width: 12, shading: CITO_BLUE_LIGHT }),
          styledCell("", { width: 48, shading: CITO_BLUE_LIGHT }),
          styledCell(formatGetal(domTotU), { bold: true, width: 20, shading: CITO_BLUE_LIGHT }),
          styledCell(formatEuro(domTotK), { bold: true, width: 20, shading: CITO_BLUE_LIGHT }),
        ],
      });

      children.push(
        new Table({
          width: { size: 100, type: WidthType.PERCENTAGE },
          rows: [
            new TableRow({
              children: [
                headerCell("Jaar", 12),
                headerCell("Activiteit", 48),
                headerCell("Uren", 20),
                headerCell("Kosten", 20),
              ],
            }),
            ...jaarRows,
            totaalRow,
          ],
        })
      );
      children.push(emptyLine());
    });

    // Totalen per jaar
    if (scenario.totalenPerJaar && scenario.totalenPerJaar.length > 0) {
      children.push(bodyText("Totalen per jaar", { bold: true, size: 22, color: CITO_BLUE }));
      const totRows = scenario.totalenPerJaar.map((t) =>
        new TableRow({
          children: [
            styledCell(`${t.jaar}`, { bold: true, width: 33 }),
            styledCell(formatGetal(t.uren), { width: 33 }),
            styledCell(formatEuro(t.kosten), { width: 34 }),
          ],
        })
      );
      children.push(
        new Table({
          width: { size: 100, type: WidthType.PERCENTAGE },
          rows: [
            new TableRow({
              children: [
                headerCell("Jaar", 33),
                headerCell("Uren", 33),
                headerCell("Kosten", 34),
              ],
            }),
            ...totRows,
          ],
        })
      );
      children.push(emptyLine());
    }

    if (scenario.samenvatting) {
      children.push(bodyText(scenario.samenvatting, { italic: true, size: 20, color: TEXT_SECONDARY }));
    }
  }

  return children;
}

// Stap 2 — Sectorwerk: beknopt overzicht per sector (volle drilldown in Bijlage A)
function buildSectorwerkKaderSection(session: DINSession, numState: NumberingState) {
  const children: (Paragraph | Table)[] = [];

  children.push(stepHeading(2, "Sectorwerk", numState));
  children.push(
    methodiekIntro(
      "Elke sector vertaalt de programmadoelen naar eigen baten, vermogens en inspanningen vanuit " +
      "het eigen sectorplan en de product-marktcombinaties. Hieronder een beknopt overzicht per sector. " +
      "De volledige sector-drilldowns staan in Bijlage A."
    )
  );
  children.push(emptyLine());

  const activeSectors = SECTORS.filter(
    (s) =>
      session.benefits.some((b) => b.sectorId === s) ||
      session.capabilities.some((c) => c.sectorId === s) ||
      session.efforts.some((e) => e.sectorId === s) ||
      session.sectorPlans.some((sp) => sp.sectorName === s)
  );

  if (activeSectors.length === 0) {
    children.push(bodyText(
      "Er zijn nog geen sectorplannen geladen of sector-specifieke baten/vermogens/inspanningen ingevoerd.",
      { italic: true, color: TEXT_MUTED }
    ));
    return { properties: {}, children };
  }

  const sectorRows = activeSectors.map((sector) => {
    const plan = session.sectorPlans.find((s) => s.sectorName === sector);
    const kern = plan?.rawText
      ? (plan.rawText.slice(0, 160).replace(/\s+/g, " ").trim() + (plan.rawText.length > 160 ? "\u2026" : ""))
      : "Geen sectorplan geladen";

    const batenCount = session.benefits.filter((b) => b.sectorId === sector).length;
    const vermogensCount = session.capabilities.filter((c) => c.sectorId === sector && !c.consolidated).length;
    const inspanningenCount = session.efforts.filter((e) => e.sectorId === sector && !e.consolidated).length;

    // Tel hoeveel doelen deze sector raakt (via baten)
    const goalIds = new Set(
      session.benefits.filter((b) => b.sectorId === sector).map((b) => b.goalId)
    );

    return new TableRow({
      children: [
        styledCell(sector, { bold: true, width: 14, shading: CITO_BLUE_LIGHT }),
        styledCell(kern, { width: 54 }),
        styledCell(`${goalIds.size}`, { width: 12 }),
        styledCell(`${batenCount} B \u2022 ${vermogensCount} V \u2022 ${inspanningenCount} I`, { width: 20 }),
      ],
    });
  });

  // Totaal-PMC's onder de tabel
  const totaalPmc = (session.pmcEntries ?? []).length;

  children.push(
    new Table({
      width: { size: 100, type: WidthType.PERCENTAGE },
      rows: [
        new TableRow({
          children: [
            headerCell("Sector", 14),
            headerCell("Kern sectorplan", 54),
            headerCell("Doelen geraakt", 12),
            headerCell("B/V/I", 20),
          ],
        }),
        ...sectorRows,
      ],
    })
  );
  if (totaalPmc > 0) {
    children.push(emptyLine(60));
    children.push(bodyText(
      `Totaal product-marktcombinaties in scope: ${totaalPmc}.`,
      { size: 20, color: TEXT_SECONDARY, italic: true }
    ));
  }

  return { properties: {}, children };
}

function sectorSection(session: DINSession, sector: SectorName, numState: NumberingState, activeCaps: DINCapability[], activeEfforts: DINEffort[]) {
  const children: (Paragraph | Table)[] = [];

  children.push(plainH1(`Bijlage A \u2014 Sector ${sector}`, numState));

  // Origineel sectorplan (beknopt)
  const plan = session.sectorPlans.find((s) => s.sectorName === sector);
  if (plan?.rawText) {
    children.push(subHeading("Sectorplan samenvatting"));
    const planText =
      plan.rawText.length > 1500 ? plan.rawText.slice(0, 1500) + "..." : plan.rawText;
    const paragraphs = planText.split(/\n\n+/);
    paragraphs.forEach((p) => {
      const cleaned = p.replace(/\n/g, " ").trim();
      if (cleaned) children.push(bodyText(cleaned, { size: 20, color: TEXT_SECONDARY }));
    });
    children.push(emptyLine());
  }

  // Baten — met meetmethode en meetmoment
  const sectorBenefits = session.benefits.filter((b) => b.sectorId === sector);
  if (sectorBenefits.length > 0) {
    children.push(subHeading("Baten"));

    const batenRows = sectorBenefits.map((b) =>
      new TableRow({
        children: [
          styledCell(b.title || b.description || "\u2014", { bold: true, width: 16 }),
          styledCell(b.profiel.indicator || "\u2014", { width: 13 }),
          styledCell(b.profiel.indicatorOwner || "\u2014", { width: 11 }),
          styledCell(
            b.profiel.currentValue && b.profiel.targetValue
              ? `${b.profiel.currentValue} \u2192 ${b.profiel.targetValue}`
              : "\u2014",
            { width: 12 }
          ),
          styledCell(b.profiel.bateneigenaar || "\u2014", { width: 12 }),
          styledCell(b.profiel.meetmethode || "\u2014", { width: 18 }),
          styledCell(b.profiel.measurementMoment || "\u2014", { width: 18 }),
        ],
      })
    );

    children.push(
      new Table({
        width: { size: 100, type: WidthType.PERCENTAGE },
        rows: [
          new TableRow({
            children: [
              headerCell("Baat", 16),
              headerCell("Indicator", 13),
              headerCell("Ind. eigenaar", 11),
              headerCell("Huidig \u2192 Doel", 12),
              headerCell("Eigenaar", 12),
              headerCell("Meetmethode", 18),
              headerCell("Meetmoment", 18),
            ],
          }),
          ...batenRows,
        ],
      })
    );
    children.push(emptyLine());
  }

  // Vermogens (use active caps only)
  const sectorCaps = activeCaps.filter((c) => c.sectorId === sector);
  if (sectorCaps.length > 0) {
    children.push(subHeading("Vermogens"));

    const capRows = sectorCaps.map(
      (c) =>
        new TableRow({
          children: [
            styledCell(
              (c.title || c.description || "\u2014") + ((c.relatedSectors?.length || 0) > 1 ? " (gedeeld)" : ""),
              { bold: true, width: 22 }
            ),
            styledCell(c.profiel?.eigenaar || "\u2014", { width: 14 }),
            styledCell(
              c.currentLevel && c.targetLevel
                ? `${c.currentLevel}/5 \u2192 ${c.targetLevel}/5`
                : "\u2014",
              { width: 12 }
            ),
            styledCell(c.profiel?.huidieSituatie || "\u2014", { width: 26 }),
            styledCell(c.profiel?.gewensteSituatie || "\u2014", { width: 26 }),
          ],
        })
    );

    children.push(
      new Table({
        width: { size: 100, type: WidthType.PERCENTAGE },
        rows: [
          new TableRow({
            children: [
              headerCell("Vermogen", 22),
              headerCell("Eigenaar", 14),
              headerCell("Niveau", 12),
              headerCell("Huidige situatie", 26),
              headerCell("Gewenste situatie", 26),
            ],
          }),
          ...capRows,
        ],
      })
    );
    children.push(emptyLine());
  }

  // Inspanningen per domein — met randvoorwaarden (use active efforts only)
  const sectorEfforts = activeEfforts.filter((e) => e.sectorId === sector);
  if (sectorEfforts.length > 0) {
    children.push(subHeading("Inspanningen"));

    (Object.keys(DOMAIN_LABELS) as EffortDomain[]).forEach((domain) => {
      const domainEfforts = sectorEfforts.filter((e) => e.domain === domain);
      if (domainEfforts.length === 0) return;

      children.push(
        new Paragraph({
          spacing: { before: 160, after: 80 },
          children: [
            new TextRun({
              text: `\u25A0 ${DOMAIN_LABELS[domain]}`,
              bold: true,
              size: 22,
              font: "Calibri",
              color: TEXT_SECONDARY,
            }),
          ],
        })
      );

      const effortRows = domainEfforts.map(
        (e) =>
          new TableRow({
            children: [
              styledCell(e.title || e.description || "\u2014", { bold: true, width: 20 }),
              styledCell(e.quarter || "\u2014", { width: 10 }),
              styledCell(e.dossier?.eigenaar || "\u2014", { width: 13 }),
              styledCell(e.dossier?.inspanningsleider || "\u2014", { width: 13 }),
              styledCell(e.dossier?.kostenraming || "\u2014", { width: 12 }),
              styledCell(e.dossier?.verwachtResultaat || "\u2014", { width: 20 }),
              styledCell(e.dossier?.randvoorwaarden || "\u2014", { width: 12 }),
            ],
          })
      );

      children.push(
        new Table({
          width: { size: 100, type: WidthType.PERCENTAGE },
          rows: [
            new TableRow({
              children: [
                headerCell("Inspanning", 20),
                headerCell("Planning", 10),
                headerCell("Opdrachtgever", 13),
                headerCell("Leider", 13),
                headerCell("Kosten", 12),
                headerCell("Resultaat", 20),
                headerCell("Randvoorw.", 12),
              ],
            }),
            ...effortRows,
          ],
        })
      );
      children.push(emptyLine(80));
    });
  }

  // Integratie-advies
  const rawAdvies = session.integratieAdvies?.[sector];
  if (rawAdvies && typeof rawAdvies !== "string") {
    const advies = rawAdvies as IntegratieAdviesResult;
    children.push(subHeading("Integratie-advies"));

    const adviesKeys: { key: keyof IntegratieAdviesResult; label: string }[] = [
      { key: "aansluiting", label: "Aansluiting op KiB-doelen" },
      { key: "verrijking", label: "Verrijking" },
      { key: "aanvullingen", label: "Aanvullingen" },
      { key: "quickWins", label: "Quick wins" },
      { key: "aandachtspunten", label: "Aandachtspunten" },
    ];

    adviesKeys.forEach(({ key, label }) => {
      const item = advies[key];
      if (!item || typeof item === "string") return;
      if (!("punten" in item) || item.punten.length === 0) return;

      children.push(
        new Paragraph({
          spacing: { before: 120, after: 60 },
          children: [
            new TextRun({ text: label, bold: true, size: 20, color: TEXT_SECONDARY, font: "Calibri" }),
          ],
        })
      );
      item.punten.forEach((punt) => {
        children.push(bullet(punt, 600));
      });
    });
    children.push(emptyLine());
  }

  return { properties: {}, children };
}

// --- Verantwoording methodiek "Werken aan Programma's" (Prevaas & Van Loon) ---
function methodiekVerantwoordingSection(numState: NumberingState) {
  const children: (Paragraph | Table)[] = [];

  children.push(plainH1("Verantwoording — methodiek \"Werken aan Programma's\"", numState));
  children.push(
    methodiekIntro(
      "Onderstaande tabel laat zien welke onderdelen van een programmaplan volgens \"Werken aan Programma's\" " +
      "(Prevaas & Van Loon) in dit document zijn opgenomen, en welke onderdelen los van het programmaplan " +
      "worden onderhouden."
    )
  );
  children.push(emptyLine());

  type Row = { onderdeel: string; hoofdstuk: string; status: "Gedekt" | "Extern" | "Los onderhouden"; toelichting?: string };
  const rows: Row[] = [
    { onderdeel: "Programmavisie", hoofdstuk: "1", status: "Gedekt" },
    { onderdeel: "Scope (binnen / buiten cyclus)", hoofdstuk: "1", status: "Gedekt" },
    { onderdeel: "Programmadoelstellingen", hoofdstuk: "2", status: "Gedekt" },
    { onderdeel: "Werkvolgorde / fasering doelen", hoofdstuk: "2", status: "Gedekt" },
    { onderdeel: "Baten (DIN: gewenste effecten)", hoofdstuk: "3", status: "Gedekt" },
    { onderdeel: "Vermogens (DIN: wat de organisatie moet kunnen)", hoofdstuk: "3", status: "Gedekt" },
    { onderdeel: "Inspanningen (DIN: projecten en activiteiten)", hoofdstuk: "3", status: "Gedekt" },
    { onderdeel: "Programmabegroting (out-of-pocket + interne uren, scenario's)", hoofdstuk: "3", status: "Gedekt" },
    { onderdeel: "Programma-organisatie en gremia", hoofdstuk: "4", status: "Gedekt" },
    { onderdeel: "RASCI per hoofdthema", hoofdstuk: "4", status: "Gedekt" },
    { onderdeel: "Planning op programmaniveau (mijlpalen)", hoofdstuk: "5", status: "Gedekt" },
    { onderdeel: "Aanleiding / context vanuit KiB", hoofdstuk: "—", status: "Extern", toelichting: "Bron: vastgestelde visie en doelen uit Klant in Beeld" },
    { onderdeel: "Risicomanagement op programmaniveau", hoofdstuk: "—", status: "Los onderhouden", toelichting: "Wordt los onderhouden in stuurgroep-rapportage; per inspanning zijn randvoorwaarden vastgelegd in het dossier (Hoofdstuk 3)" },
    { onderdeel: "Communicatie- en stakeholder-aanpak", hoofdstuk: "—", status: "Los onderhouden", toelichting: "Wordt los onderhouden via de programmamanager; gremia en escalatiepad zijn vastgelegd in Hoofdstuk 4" },
  ];

  const headerRow = new TableRow({
    children: [
      headerCell("Onderdeel methodiek", 42),
      headerCell("Hoofdstuk", 12),
      headerCell("Status", 18),
      headerCell("Toelichting", 28),
    ],
  });
  const dataRows = rows.map((r, i) => {
    const shadeStatus = r.status === "Gedekt" ? "DCFCE7" : r.status === "Extern" ? "DBEAFE" : "F3F4F6";
    return new TableRow({
      children: [
        styledCell(r.onderdeel, { bold: i % 2 === 0, width: 42 }),
        styledCell(r.hoofdstuk, { bold: true, width: 12, color: CITO_BLUE }),
        styledCell(r.status, { bold: true, width: 18, shading: shadeStatus, size: 16 }),
        styledCell(r.toelichting ?? "—", { width: 28, size: 16, color: TEXT_SECONDARY }),
      ],
    });
  });
  children.push(
    new Table({
      width: { size: 100, type: WidthType.PERCENTAGE },
      rows: [headerRow, ...dataRows],
    })
  );
  children.push(emptyLine());

  return { properties: {}, children };
}

export function roadmapSection(session: DINSession, numState: NumberingState, _activeEfforts: DINEffort[]) {
  void _activeEfforts;
  const children: (Paragraph | Table)[] = [];

  children.push(numberedHeading("Planning en roadmap", "h1", numState));
  children.push(
    methodiekIntro(
      "De roadmap groepeert inspanningen in cycli en bundels, maakt afhankelijkheden zichtbaar en " +
      "markeert de mijlpalen waarop we voortgang meten. Hij is het ritmische kompas van het programma. " +
      "Vier gezamenlijke cross-sectorale bundels \u2014 \u00e9\u00e9n per domein (cultuur, mens, " +
      "data & systemen, processen) \u2014 worden gepland in cycli van 6\u20139 maanden."
    )
  );
  children.push(emptyLine());

  const planning = session.planningVoorstel;

  if (!planning || planning.bundelPlanning.length === 0) {
    children.push(bodyText(
      "De roadmap-planning is nog niet opgesteld. Genereer een AI-voorstel in stap 6 van de app.",
      { italic: true, color: TEXT_MUTED }
    ));
    return { properties: {}, children };
  }

  // Samenvatting
  if (planning.samenvatting) {
    children.push(subHeading("Samenvatting planning"));
    children.push(bodyText(planning.samenvatting, { size: 22 }));
    children.push(emptyLine());
  }

  // Eigen toelichting van de programmamanager
  if (planning.toelichting && planning.toelichting.trim().length > 0) {
    children.push(subHeading("Toelichting programmamanager"));
    for (const line of planning.toelichting.split(/\n{2,}/)) {
      const trimmed = line.trim();
      if (trimmed) {
        children.push(bodyText(trimmed, { size: 22 }));
      }
    }
    children.push(emptyLine());
  }

  // Cycli-overzicht
  const cycliMap = new Map<string, typeof planning.bundelPlanning>();
  for (const bp of planning.bundelPlanning) {
    const arr = cycliMap.get(bp.cyclusLabel) ?? [];
    arr.push(bp);
    cycliMap.set(bp.cyclusLabel, arr);
  }
  const cycli = Array.from(cycliMap.entries()).sort((a, b) => {
    const aStart = Math.min(...a[1].map((x) => x.startKwartaal.localeCompare(x.startKwartaal) || 0));
    const bStart = Math.min(...b[1].map((x) => x.startKwartaal.localeCompare(x.startKwartaal) || 0));
    return aStart - bStart;
  });

  // Hoofdtabel: per bundel domein, titel, cyclus, start, eind, afhankelijkheden, risico
  children.push(subHeading("Roadmap-overzicht"));
  const allBundels = planning.bundelPlanning;
  const bundelRows = [...allBundels]
    .sort((a, b) => a.startKwartaal.localeCompare(b.startKwartaal))
    .map((bp) => {
      const deps = resolveBundelDependencies(bp.bundelId, allBundels);
      return new TableRow({
        children: [
          styledCell(DOMAIN_LABELS[bp.domein] || bp.domein, { bold: true, width: 14, shading: DOMAIN_COLORS[bp.domein] }),
          styledCell(bp.titel, { bold: true, width: 24 }),
          styledCell(bp.cyclusLabel, { width: 10 }),
          styledCell(`${bp.startKwartaal} \u2192 ${bp.eindKwartaal}`, { width: 14 }),
          styledCell(deps, { width: 20 }),
          styledCell(bp.risico || "\u2014", { width: 18 }),
        ],
      });
    });
  children.push(
    new Table({
      width: { size: 100, type: WidthType.PERCENTAGE },
      rows: [
        new TableRow({
          children: [
            headerCell("Domein", 14),
            headerCell("Gezamenlijke inspanning", 24),
            headerCell("Cyclus", 10),
            headerCell("Periode", 14),
            headerCell("Afhankelijk van", 20),
            headerCell("Risico", 18),
          ],
        }),
        ...bundelRows,
      ],
    })
  );
  children.push(emptyLine());

  // Tekstuele timeline per kwartaal
  const kwartalen = Array.from(
    new Set(
      allBundels.flatMap((bp) => {
        const start = bp.startKwartaal;
        const eind = bp.eindKwartaal;
        return [start, eind];
      })
    )
  ).filter(Boolean).sort();

  if (kwartalen.length > 0) {
    children.push(subHeading("Timeline per kwartaal"));
    kwartalen.forEach((kw) => {
      const actiefIn = allBundels.filter(
        (bp) => bp.startKwartaal.localeCompare(kw) <= 0 && bp.eindKwartaal.localeCompare(kw) >= 0
      );
      if (actiefIn.length === 0) return;
      children.push(
        new Paragraph({
          spacing: { before: 60, after: 30 },
          children: [
            new TextRun({ text: `${kw}: `, bold: true, size: 22, color: CITO_BLUE, font: "Calibri" }),
            new TextRun({
              text: actiefIn.map((b) => `${DOMAIN_LABELS[b.domein]} \u2014 ${b.titel}`).join(" | "),
              size: 20, color: TEXT_SECONDARY, font: "Calibri",
            }),
          ],
        })
      );
    });
    children.push(emptyLine());
  }

  // Per cyclus: mijlpalen
  cycli.forEach(([cyclusLabel, items]) => {
    children.push(numberedHeading(cyclusLabel, "h2", numState));
    for (const bp of items) {
      children.push(
        bodyText(`${DOMAIN_LABELS[bp.domein]} \u2014 ${bp.titel} (${bp.startKwartaal} \u2192 ${bp.eindKwartaal})`, {
          bold: true,
          size: 22,
        })
      );
      if (bp.beargumentatie) {
        children.push(bodyText(bp.beargumentatie, { italic: true, color: TEXT_SECONDARY, size: 20 }));
      }
      for (const m of bp.mijlpalen || []) {
        children.push(bullet(`${m.periode}: ${m.mijlpaal}`));
      }
      if (bp.risico) {
        children.push(bodyText(`Risico: ${bp.risico}`, { italic: true, color: TEXT_MUTED, size: 20 }));
      }
      children.push(emptyLine(80));
    }
  });

  return { properties: {}, children };
}

// --- DIN Tabel-flow visualisatie ---

export function dinFlowTableSection(
  session: DINSession,
  numState: NumberingState,
  activeCaps: DINCapability[],
  activeEfforts: DINEffort[]
) {
  const children: (Paragraph | Table)[] = [];

  children.push(numberedHeading("DIN-Overzicht (Tabel-flow)", "h1", numState));
  children.push(bodyText(
    "Per doel per sector wordt de DIN-keten weergegeven in tabelvorm: " +
    "Baat \u2192 Vermogen \u2192 Inspanning.",
    { color: TEXT_SECONDARY, size: 20 }
  ));
  children.push(emptyLine());

  const activeSession: DINSession = {
    ...session,
    capabilities: activeCaps,
    efforts: activeEfforts,
  };

  const flowActiveSectors = SECTORS.filter(
    (s) => session.benefits.some((b) => b.sectorId === s)
  );

  session.goals
    .sort((a, b) => a.rank - b.rank)
    .forEach((goal) => {
      children.push(numberedHeading(`Doel ${goal.rank}: ${goal.name}`, "h2", numState));

      flowActiveSectors.forEach((sector) => {
        const chainResult = buildChainsForSector(activeSession, goal.id, sector);
        if (chainResult.chains.length === 0) {
          // Check if this goal has no benefits for this sector
          const goalIdsWithBenefits = new Set(session.goalBenefitMaps.map((m) => m.goalId));
          if (!goalIdsWithBenefits.has(goal.id)) {
            children.push(bodyText(
              `Dit doel is nog niet uitgewerkt voor sector ${sector}.`,
              { italic: true, color: TEXT_MUTED }
            ));
          }
          return;
        }

        // Sector label
        children.push(
          new Paragraph({
            spacing: { before: 160, after: 80 },
            children: [
              new TextRun({ text: `Sector ${sector}`, bold: true, size: 22, color: CITO_BLUE, font: "Calibri" }),
            ],
          })
        );

        // Build table rows
        const tableRows: TableRow[] = [];

        // Header row
        tableRows.push(
          new TableRow({
            children: [
              headerCell("Baat", 30),
              styledCell("\u2192", { width: 4, color: TEXT_MUTED, bold: true }),
              headerCell("Vermogen", 28),
              styledCell("\u2192", { width: 4, color: TEXT_MUTED, bold: true }),
              headerCell("Inspanning", 34),
            ],
          })
        );

        chainResult.chains.forEach((chain) => {
          const baatLabel = chain.benefit.title || chain.benefit.description || "\u2014";
          let isFirstRow = true;

          if (chain.links.length === 0) {
            // Baat without capabilities
            tableRows.push(
              new TableRow({
                children: [
                  styledCell(baatLabel, { bold: true, width: 30, shading: "E8F0FE" }),
                  styledCell("\u2192", { width: 4, color: TEXT_MUTED }),
                  styledCell("\u2014", { width: 28, color: TEXT_MUTED }),
                  styledCell("\u2192", { width: 4, color: TEXT_MUTED }),
                  styledCell("\u2014", { width: 34, color: TEXT_MUTED }),
                ],
              })
            );
          } else {
            chain.links.forEach((link) => {
              const capLabel = link.capability.title || link.capability.description || "\u2014";
              const isSharedCap = (link.capability.relatedSectors?.length || 0) > 1;
              const capText = isSharedCap ? `${capLabel} (gedeeld)` : capLabel;
              const capShading = isSharedCap ? CITO_BLUE_LIGHT : undefined;
              let isFirstEffort = true;

              if (link.efforts.length === 0) {
                tableRows.push(
                  new TableRow({
                    children: [
                      styledCell(isFirstRow ? baatLabel : "", {
                        bold: isFirstRow,
                        width: 30,
                        shading: isFirstRow ? "E8F0FE" : undefined,
                      }),
                      styledCell("\u2192", { width: 4, color: TEXT_MUTED }),
                      styledCell(capText, { width: 28, shading: capShading }),
                      styledCell("\u2192", { width: 4, color: TEXT_MUTED }),
                      styledCell("\u2014", { width: 34, color: TEXT_MUTED }),
                    ],
                  })
                );
                isFirstRow = false;
              } else {
                link.efforts.forEach((effort) => {
                  const domLabel = DOMAIN_LABELS[effort.domain];
                  const efLabel = `${effort.title || effort.description || "\u2014"} [${domLabel}]`;
                  const efShading = DOMAIN_COLORS[effort.domain];

                  tableRows.push(
                    new TableRow({
                      children: [
                        styledCell(isFirstRow ? baatLabel : "", {
                          bold: isFirstRow,
                          width: 30,
                          shading: isFirstRow ? "E8F0FE" : undefined,
                        }),
                        styledCell("\u2192", { width: 4, color: TEXT_MUTED }),
                        styledCell(isFirstEffort ? capText : "", {
                          width: 28,
                          shading: isFirstEffort ? capShading : undefined,
                        }),
                        styledCell("\u2192", { width: 4, color: TEXT_MUTED }),
                        styledCell(efLabel, { width: 34, shading: efShading }),
                      ],
                    })
                  );
                  isFirstRow = false;
                  isFirstEffort = false;
                });
              }
            });
          }
        });

        if (tableRows.length > 1) {
          children.push(
            new Table({
              width: { size: 100, type: WidthType.PERCENTAGE },
              rows: tableRows,
            })
          );
          children.push(emptyLine());
        }
      });

      children.push(horizontalRule());
    });

  return { properties: {}, children };
}

// --- Verrijkt sectorplan als Word ---

function parseInlineMarkdown(text: string, baseSize?: number): TextRun[] {
  const size = baseSize || 22;
  const runs: TextRun[] = [];
  const parts = text.split(/(\*\*.*?\*\*|\*.*?\*)/g);
  for (const part of parts) {
    if (!part) continue;
    if (part.startsWith("**") && part.endsWith("**")) {
      runs.push(new TextRun({ text: part.slice(2, -2), bold: true, size, font: "Calibri" }));
    } else if (part.startsWith("*") && part.endsWith("*") && !part.startsWith("**")) {
      runs.push(new TextRun({ text: part.slice(1, -1), italics: true, size, font: "Calibri" }));
    } else {
      runs.push(new TextRun({ text: part, size, color: TEXT_PRIMARY, font: "Calibri" }));
    }
  }
  return runs;
}

function parseMarkdownTable(tableLines: string[]): Table {
  function parseCells(line: string): string[] {
    return line.replace(/^\|/, "").replace(/\|$/, "").split("|").map((c) => c.trim());
  }
  function isSeparator(line: string): boolean {
    return /^\|?[\s:]*-{2,}[\s:]*(\|[\s:]*-{2,}[\s:]*)*\|?$/.test(line.trim());
  }

  const dataLines = tableLines.filter((l) => !isSeparator(l));
  if (dataLines.length === 0) return new Table({ rows: [], width: { size: 100, type: WidthType.PERCENTAGE } });

  const headerCells = parseCells(dataLines[0]);
  const colCount = headerCells.length;
  const colWidth = Math.floor(100 / colCount);

  const headerRow = new TableRow({
    children: headerCells.map((cell) => headerCell(cell, colWidth)),
  });

  const dataRows = dataLines.slice(1).map(
    (line, rowIdx) =>
      new TableRow({
        children: parseCells(line).slice(0, colCount).map(
          (cell) =>
            new TableCell({
              width: { size: colWidth, type: WidthType.PERCENTAGE },
              shading: rowIdx % 2 === 1 ? { fill: "F8F9FA" } : undefined,
              borders: CELL_BORDERS,
              children: [
                new Paragraph({
                  spacing: { before: 50, after: 50 },
                  children: parseInlineMarkdown(cell, 20),
                }),
              ],
            })
        ),
      })
  );

  return new Table({
    width: { size: 100, type: WidthType.PERCENTAGE },
    rows: [headerRow, ...dataRows],
  });
}

function parseMarkdownToDocx(content: string): (Paragraph | Table)[] {
  const elements: (Paragraph | Table)[] = [];
  const lines = content.split("\n");
  let i = 0;

  while (i < lines.length) {
    const line = lines[i];
    const trimmed = line.trim();

    if (!trimmed) { elements.push(emptyLine(60)); i++; continue; }

    if (/^[-*_]{3,}$/.test(trimmed)) {
      elements.push(horizontalRule());
      i++; continue;
    }

    if (trimmed.startsWith("|")) {
      const tableLines: string[] = [];
      while (i < lines.length && lines[i].trim().startsWith("|")) {
        tableLines.push(lines[i].trim());
        i++;
      }
      if (tableLines.length >= 2) {
        elements.push(parseMarkdownTable(tableLines));
        elements.push(emptyLine());
      } else {
        elements.push(new Paragraph({ spacing: { after: 60 }, children: parseInlineMarkdown(tableLines[0]) }));
      }
      continue;
    }

    if (trimmed.startsWith("# ")) {
      elements.push(heading(trimmed.slice(2), HeadingLevel.HEADING_1));
      i++; continue;
    }
    if (trimmed.startsWith("## ")) {
      elements.push(heading(trimmed.slice(3), HeadingLevel.HEADING_2));
      i++; continue;
    }
    if (trimmed.startsWith("### ")) {
      elements.push(subHeading(trimmed.slice(4)));
      i++; continue;
    }
    if (trimmed.startsWith("#### ")) {
      elements.push(
        new Paragraph({
          spacing: { before: 160, after: 60 },
          children: [new TextRun({ text: trimmed.slice(5), bold: true, size: 22, color: TEXT_SECONDARY, font: "Calibri" })],
        })
      );
      i++; continue;
    }

    const numberedBold = trimmed.match(/^(\d+)\.\s+\*\*(.+?)\*\*:?\s*(.*)/);
    if (numberedBold) {
      const runs: TextRun[] = [
        new TextRun({ text: `${numberedBold[1]}. ${numberedBold[2]}`, bold: true, size: 24, color: CITO_BLUE, font: "Calibri" }),
      ];
      if (numberedBold[3]) {
        runs.push(new TextRun({ text: `: ${numberedBold[3]}`, size: 22, color: TEXT_PRIMARY, font: "Calibri" }));
      }
      elements.push(new Paragraph({ spacing: { before: 200, after: 60 }, children: runs }));
      i++; continue;
    }

    const numberedItem = trimmed.match(/^(\d+)\.\s+(.+)/);
    if (numberedItem) {
      elements.push(
        new Paragraph({
          spacing: { after: 40 },
          indent: { left: 400 },
          children: [
            new TextRun({ text: `${numberedItem[1]}. `, bold: true, size: 22, color: CITO_BLUE, font: "Calibri" }),
            ...parseInlineMarkdown(numberedItem[2]),
          ],
        })
      );
      i++; continue;
    }

    const subBullet = line.match(/^(\s{2,}|\t+)[-*]\s+(.*)/);
    if (subBullet) {
      elements.push(
        new Paragraph({
          spacing: { after: 30 },
          indent: { left: 800 },
          children: [
            new TextRun({ text: "\u25E6 ", color: TEXT_MUTED, size: 20, font: "Calibri" }),
            ...parseInlineMarkdown(subBullet[2], 20),
          ],
        })
      );
      i++; continue;
    }

    if (trimmed.startsWith("- ") || trimmed.startsWith("* ")) {
      elements.push(bullet(trimmed.slice(2)));
      i++; continue;
    }

    const runs = parseInlineMarkdown(trimmed);
    if (runs.length > 0) {
      elements.push(new Paragraph({ spacing: { after: 80, line: 300 }, children: runs }));
    }
    i++;
  }

  return elements;
}

export async function generateVerrijktSectorplanDocument(
  sectorName: string,
  verrijktPlanText: string,
  sessionName: string
): Promise<Blob> {
  const header = createHeader(sessionName);
  const footer = createFooter();

  const doc = new Document({
    styles: {
      default: {
        heading1: { run: { color: CITO_BLUE, bold: true, size: 32, font: "Calibri" } },
        heading2: { run: { color: CITO_BLUE, bold: true, size: 26, font: "Calibri" } },
        document: { run: { font: "Calibri", size: 22 } },
      },
    },
    sections: [
      {
        properties: {
          page: {
            margin: { top: 1440, bottom: 1440, left: 1440, right: 1440 },
          },
        },
        headers: { default: header },
        footers: { default: footer },
        children: [
          // Titel
          new Paragraph({
            alignment: AlignmentType.CENTER,
            spacing: { before: 2000, after: 200 },
            children: [
              new TextRun({
                text: `Verrijkt Sectorplan ${sectorName}`,
                size: 48,
                color: CITO_BLUE,
                bold: true,
                font: "Calibri",
              }),
            ],
          }),
          new Paragraph({
            alignment: AlignmentType.CENTER,
            spacing: { after: 100 },
            children: [
              new TextRun({ text: sessionName, size: 28, color: CITO_BLUE, font: "Calibri" }),
            ],
          }),
          new Paragraph({
            alignment: AlignmentType.CENTER,
            spacing: { after: 600 },
            children: [
              new TextRun({
                text: `Gegenereerd: ${new Date().toLocaleDateString("nl-NL", {
                  day: "numeric",
                  month: "long",
                  year: "numeric",
                })} \u2014 Doelen-Inspanningennetwerk (DIN)`,
                size: 20,
                color: TEXT_MUTED,
                italics: true,
                font: "Calibri",
              }),
            ],
          }),
          horizontalRule(),
          // Content
          ...parseMarkdownToDocx(verrijktPlanText),
        ],
      },
    ],
  });

  return Packer.toBlob(doc);
}

// --- Hoofdfunctie ---

export async function generateWordDocument(session: DINSession): Promise<Blob> {
  const header = createHeader(session.name);
  const footer = createFooter();

  const pageProps = {
    page: {
      margin: { top: 1440, bottom: 1440, left: 1440, right: 1440 },
    },
  };

  // Consolidation-aware active items
  const activeCaps = getActiveCaps(session);
  const activeEfforts = getActiveEfforts(session);

  // Numbering state -- all content sections advance this
  const numState = createNumberingState();

  // Voeg headers/footers toe aan alle content-secties (behalve titelpagina)
  type SectionChild = Paragraph | Table | TableOfContents;
  const addHeaderFooter = (section: { properties: Record<string, unknown>; children: readonly SectionChild[] }) => ({
    ...section,
    properties: { ...section.properties, ...pageProps },
    headers: { default: header },
    footers: { default: footer },
  });

  type SectionType = { properties: Record<string, unknown>; children: readonly SectionChild[] };

  // Build all content sections first (advancing numState), then build TOC from tocEntries.
  // Methodische opbouw conform "Werken aan Programma's" (Prevaas & Van Loon):
  //   Managementsamenvatting \u2192
  //   1. Programmavisie en scope \u2192
  //   2. Programmadoelen (met werkvolgorde) \u2192
  //   3. Cross-sectorale uitkomst \u2014 de kern (DIN-onderbouwing per sector blijft als data-bron
  //      maar wordt cross-sectoraal geconsolideerd in dit hoofdstuk: synergie, hefboom,
  //      optimalisatie, scenario-totaal, uiteindelijke DIN per sector) \u2192
  //   4. Programma-organisatie en RASCI \u2192
  //   5. Planning en roadmap \u2192
  //   Verantwoording methodiek (dekking 'Werken aan Programma's')
  const contentSections: SectionType[] = [];

  // Managementsamenvatting (cross-sectorale nadruk)
  contentSections.push(executiveSummarySection(session, numState, activeEfforts, activeCaps));

  // Hoofdstuk 1 \u2014 Programmavisie en scope
  contentSections.push(overviewSection(session, numState));

  // Hoofdstuk 2 \u2014 Programmadoelen (met werkvolgorde 1\u21922\u21923)
  contentSections.push(programmaDoelenSection(session, numState));

  // Hoofdstuk 3 \u2014 Cross-sectorale uitkomst (de kern; bevat ook de consolidatie van per-sector DIN's)
  contentSections.push(crossAnalysisSection(session, numState, activeCaps, activeEfforts));

  // Hoofdstuk 4 \u2014 Programma-organisatie en RASCI
  const governance = governanceSection(session, numState, activeEfforts);
  if (governance) contentSections.push(governance);

  // Hoofdstuk 5 \u2014 Planning en roadmap
  contentSections.push(roadmapSection(session, numState, activeEfforts));

  // Verantwoording methodiek (dekking 'Werken aan Programma's')
  contentSections.push(methodiekVerantwoordingSection(numState));

  // Now build TOC from accumulated tocEntries
  const tocSection = tableOfContentsSection(numState);

  // Assemble final document: title page + TOC + content sections
  const doc = new Document({
    styles: {
      default: {
        heading1: { run: { color: CITO_BLUE, bold: true, size: 32, font: "Calibri" } },
        heading2: { run: { color: CITO_BLUE, bold: true, size: 26, font: "Calibri" } },
        document: { run: { font: "Calibri", size: 22 } },
      },
    },
    sections: [
      titlePageSection(session),
      addHeaderFooter(tocSection),
      ...contentSections.map(addHeaderFooter),
    ],
  });

  return Packer.toBlob(doc);
}
