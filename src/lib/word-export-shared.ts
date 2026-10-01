// Gedeelde docx-bouwstenen voor alle Word-exports.
//
// Deze module bevat de primitieven die zowel het volledige programmaplan
// (word-export.ts) als de beknopte kernversie (word-export-beknopt.ts) gebruiken:
// kleuren, tekst-atoms, tabelcellen, header/footer, nummering en de
// selectie-/gap-helpers. Eén bron van waarheid — geen duplicaten per export.
//
// word-export.ts re-exporteert de publieke helpers hieruit, zodat bestaande
// imports (`@/lib/word-export`) ongewijzigd blijven werken.

import {
  Paragraph,
  TextRun,
  HeadingLevel,
  TableCell,
  WidthType,
  AlignmentType,
  BorderStyle,
  Header,
  Footer,
  PageNumber,
} from "docx";
import type { DINSession, DINCapability, DINEffort, EffortDomain } from "./types";
import { findGaps } from "./din-service";

// --- Cito outside-in domeinvolgorde (cultuur → mens → data/systemen → processen) ---
// NIET de klassieke Prevaas-volgorde. Zie memory: "Cito-outside-in volgorde".
export const DOMEIN_OUTSIDE_IN_ORDER: EffortDomain[] = ["cultuur", "mens", "data_systemen", "processen"];

// Resolveer een lijst items (kunnen effort-IDs OF al titels zijn) naar leesbare titels.
// IDs zonder match worden gefilterd; we tonen liever niets dan een UUID.
export function resolveItemLabels(items: string[], session: DINSession): string[] {
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

export function sortDomeinenOutsideIn<T extends { domein: EffortDomain }>(items: T[]): T[] {
  return [...items].sort(
    (a, b) => DOMEIN_OUTSIDE_IN_ORDER.indexOf(a.domein) - DOMEIN_OUTSIDE_IN_ORDER.indexOf(b.domein)
  );
}

export function formatEuro(amount: number): string {
  return new Intl.NumberFormat("nl-NL", { style: "currency", currency: "EUR", maximumFractionDigits: 0 }).format(amount);
}

export function formatGetal(n: number): string {
  return new Intl.NumberFormat("nl-NL", { maximumFractionDigits: 0 }).format(n);
}

// Sanitizer voor batenprofiel-meetwaarden: vervangt verleden Q1-Q4 jaartallen
// (2020-2025) door een neutrale "bij start programma"-formulering. AI heeft in
// oudere sessies nulmeting-momenten als "(Q1 2025)" of vergelijkbaar vastgelegd;
// in 2026 zijn die jaartallen verleden tijd en moeten ze niet meer in een
// toekomstgericht programmaplan staan.
export function sanitizeMeetjaarTekst(text: string | null | undefined): string {
  if (!text) return "";
  return text
    .replace(/\s*\(\s*Q[1-4]\s*202[0-5]\s*\)/gi, "")
    .replace(/\bQ[1-4]\s*202[0-5]\b/gi, "bij start programma")
    .replace(/\s{2,}/g, " ")
    .replace(/\s+([,.;])/g, "$1")
    .trim();
}

export const SCENARIO_LABELS: Record<"optimaal" | "plus20" | "min20" | "advies", string> = {
  optimaal: "Huidig budget",
  plus20: "+20% scenario",
  min20: "\u221220% scenario",
  advies: "Snelste scenario",
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
export const CITO_BLUE = "003366";
export const CITO_BLUE_LIGHT = "E8EDF3";
export const TEXT_PRIMARY = "1a1a1a";
export const TEXT_SECONDARY = "4a4a4a";
export const TEXT_MUTED = "888888";
export const BORDER_COLOR = "D0D0D0";
// Pill-kleuren voor Stakeholder (cat-2) en Review-nodig (cat-3) labels in interne-uren-tabellen.
// Komen overeen met de Tailwind-klassen text-purple-700 / text-amber-800 in de UI.
export const PURPLE_PILL = "6B21A8";
export const PURPLE_BG = "F3E8FF";
export const AMBER_PILL = "92400E";
export const AMBER_BG = "FEF3C7";


export const DOMAIN_COLORS: Record<EffortDomain, string> = {
  mens: "DBEAFE",       // blauw
  processen: "D1FAE5",  // groen
  data_systemen: "EDE9FE", // paars
  cultuur: "FEF3C7",    // amber
  overig: "E5E7EB",     // grijs (programma-breed)
};

export const THIN_BORDER = { style: BorderStyle.SINGLE, size: 1, color: BORDER_COLOR };
export const CELL_BORDERS = {
  top: THIN_BORDER,
  bottom: THIN_BORDER,
  left: THIN_BORDER,
  right: THIN_BORDER,
};

// --- Basiselementen ---

export function heading(text: string, level: typeof HeadingLevel[keyof typeof HeadingLevel]) {
  return new Paragraph({
    heading: level,
    spacing: { before: 360, after: 120 },
    children: [new TextRun({ text, color: CITO_BLUE, bold: true })],
  });
}

export function subHeading(text: string) {
  return new Paragraph({
    spacing: { before: 240, after: 80 },
    children: [
      new TextRun({ text: text.toUpperCase(), bold: true, size: 18, color: TEXT_SECONDARY, font: "Calibri" }),
    ],
  });
}

export function bodyText(content: string, opts?: { bold?: boolean; italic?: boolean; size?: number; color?: string }) {
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

export function bullet(content: string, indent?: number) {
  return new Paragraph({
    spacing: { after: 50, line: 280 },
    indent: { left: indent || 400 },
    children: [
      new TextRun({ text: "\u2022  ", color: CITO_BLUE, font: "Calibri" }),
      new TextRun({ text: content, size: 22, font: "Calibri", color: TEXT_PRIMARY }),
    ],
  });
}

export function emptyLine(space?: number) {
  return new Paragraph({ spacing: { after: space || 120 }, children: [] });
}

// Methodiek-intro: gestileerde alinea direct onder een stap-H1, met lichte achtergrond.
export function methodiekIntro(text: string) {
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

export function styledCell(content: string, opts?: { bold?: boolean; shading?: string; width?: number; color?: string; size?: number }) {
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

export function headerCell(content: string, width?: number) {
  return styledCell(content, {
    bold: true,
    shading: CITO_BLUE_LIGHT,
    width,
    color: CITO_BLUE,
    size: 18,
  });
}

export function horizontalRule() {
  return new Paragraph({
    spacing: { before: 200, after: 200 },
    border: {
      bottom: { style: BorderStyle.SINGLE, size: 1, color: BORDER_COLOR, space: 1 },
    },
    children: [],
  });
}

// --- Header en Footer ---

export function createHeader(sessionName: string) {
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

export function createFooter() {
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
