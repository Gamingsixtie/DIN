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
} from "docx";
import type { DINSession, EffortDomain, SectorName } from "./types";
import { SECTORS } from "./types";
import { findSharedCapabilities, getDomainBalance } from "./din-service";

const CITO_BLUE = "003366";
const DOMAIN_LABELS: Record<EffortDomain, string> = {
  mens: "Mens",
  processen: "Processen",
  data_systemen: "Data & Systemen",
  cultuur: "Cultuur",
};

function heading(text: string, level: typeof HeadingLevel[keyof typeof HeadingLevel]) {
  return new Paragraph({
    heading: level,
    spacing: { before: 300, after: 100 },
    children: [new TextRun({ text, color: CITO_BLUE, bold: true })],
  });
}

function text(content: string, opts?: { bold?: boolean; italic?: boolean; size?: number; color?: string }) {
  return new Paragraph({
    spacing: { after: 60 },
    children: [
      new TextRun({
        text: content,
        bold: opts?.bold,
        italics: opts?.italic,
        size: opts?.size || 22,
        color: opts?.color || "333333",
      }),
    ],
  });
}

function bullet(content: string, indent?: number) {
  return new Paragraph({
    spacing: { after: 40 },
    indent: { left: indent || 360 },
    children: [
      new TextRun({ text: "• ", color: CITO_BLUE }),
      new TextRun({ text: content, size: 22 }),
    ],
  });
}

function emptyLine() {
  return new Paragraph({ spacing: { after: 100 }, children: [] });
}

function tableCell(content: string, opts?: { bold?: boolean; shading?: string; width?: number }) {
  return new TableCell({
    width: opts?.width ? { size: opts.width, type: WidthType.PERCENTAGE } : undefined,
    shading: opts?.shading ? { fill: opts.shading } : undefined,
    children: [
      new Paragraph({
        spacing: { before: 40, after: 40 },
        children: [
          new TextRun({ text: content, bold: opts?.bold, size: 20 }),
        ],
      }),
    ],
  });
}

// --- Secties ---

function titlePageSection(session: DINSession) {
  return {
    properties: {},
    children: [
      new Paragraph({ spacing: { before: 6000 } }),
      new Paragraph({
        alignment: AlignmentType.CENTER,
        children: [
          new TextRun({ text: "Programmaplan", size: 56, color: CITO_BLUE, bold: true }),
        ],
      }),
      new Paragraph({
        alignment: AlignmentType.CENTER,
        spacing: { before: 300 },
        children: [
          new TextRun({ text: session.name, size: 40, color: CITO_BLUE }),
        ],
      }),
      new Paragraph({
        alignment: AlignmentType.CENTER,
        spacing: { before: 600 },
        children: [
          new TextRun({
            text: `Gegenereerd: ${new Date().toLocaleDateString("nl-NL")}`,
            size: 22,
            color: "888888",
            italics: true,
          }),
        ],
      }),
      new Paragraph({
        alignment: AlignmentType.CENTER,
        spacing: { before: 200 },
        children: [
          new TextRun({
            text: "Doelen-Inspanningennetwerk (DIN)",
            size: 24,
            color: "666666",
          }),
        ],
      }),
    ],
  };
}

function overviewSection(session: DINSession) {
  const children: (Paragraph | Table)[] = [];

  // Visie
  if (session.vision) {
    children.push(heading("Visie", HeadingLevel.HEADING_1));
    if (session.vision.beknopt) {
      children.push(text(session.vision.beknopt, { bold: true }));
    }
    if (session.vision.uitgebreid) {
      children.push(emptyLine());
      children.push(text(session.vision.uitgebreid));
    }
  }

  // Scope
  if (session.scope) {
    children.push(heading("Scope", HeadingLevel.HEADING_1));
    if (session.scope.inScope.length > 0) {
      children.push(text("Binnen scope:", { bold: true }));
      session.scope.inScope.forEach((s) => children.push(bullet(s)));
    }
    if (session.scope.outScope.length > 0) {
      children.push(text("Buiten scope:", { bold: true }));
      session.scope.outScope.forEach((s) => children.push(bullet(s)));
    }
  }

  // Doelen
  children.push(heading("Programmadoelen", HeadingLevel.HEADING_1));
  session.goals
    .sort((a, b) => a.rank - b.rank)
    .forEach((g) => {
      children.push(text(`${g.rank}. ${g.name}`, { bold: true }));
      if (g.description) {
        children.push(text(g.description, { italic: true, color: "555555" }));
      }
      children.push(emptyLine());
    });

  return { properties: {}, children };
}

function goalDINSections(session: DINSession) {
  const children: (Paragraph | Table)[] = [];

  children.push(heading("DIN-Netwerk per Doel", HeadingLevel.HEADING_1));

  session.goals
    .sort((a, b) => a.rank - b.rank)
    .forEach((goal) => {
      children.push(heading(`Doel ${goal.rank}: ${goal.name}`, HeadingLevel.HEADING_2));

      // Baten tabel
      const goalBenefits = session.benefits.filter((b) => b.goalId === goal.id);
      if (goalBenefits.length > 0) {
        children.push(text("Baten", { bold: true, color: CITO_BLUE }));

        const headerRow = new TableRow({
          children: [
            tableCell("Sector", { bold: true, shading: "E8EDF3", width: 15 }),
            tableCell("Baat", { bold: true, shading: "E8EDF3", width: 30 }),
            tableCell("Indicator", { bold: true, shading: "E8EDF3", width: 20 }),
            tableCell("Eigenaar", { bold: true, shading: "E8EDF3", width: 15 }),
            tableCell("Nu → Doel", { bold: true, shading: "E8EDF3", width: 20 }),
          ],
        });

        const dataRows = goalBenefits.map(
          (b) =>
            new TableRow({
              children: [
                tableCell(b.sectorId),
                tableCell(b.description || "(naamloos)"),
                tableCell(b.profiel.indicator || "—"),
                tableCell(b.profiel.indicatorOwner || "—"),
                tableCell(
                  b.profiel.currentValue && b.profiel.targetValue
                    ? `${b.profiel.currentValue} → ${b.profiel.targetValue}`
                    : "—"
                ),
              ],
            })
        );

        children.push(
          new Table({
            width: { size: 100, type: WidthType.PERCENTAGE },
            rows: [headerRow, ...dataRows],
          })
        );
        children.push(emptyLine());
      }

      // Vermogens
      const goalBenefitIds = new Set(goalBenefits.map((b) => b.id));
      const relatedCapIds = new Set(
        session.benefitCapabilityMaps
          .filter((m) => goalBenefitIds.has(m.benefitId))
          .map((m) => m.capabilityId)
      );
      const goalCaps =
        relatedCapIds.size > 0
          ? session.capabilities.filter((c) => relatedCapIds.has(c.id))
          : session.capabilities.filter((c) =>
              goalBenefits.some((b) => b.sectorId === c.sectorId)
            );

      if (goalCaps.length > 0) {
        children.push(text("Vermogens", { bold: true, color: CITO_BLUE }));
        goalCaps.forEach((c) => {
          children.push(bullet(`[${c.sectorId}] ${c.description || "(naamloos)"}`));
        });
        children.push(emptyLine());
      }

      // Inspanningen per domein
      const goalSectorIds = new Set(goalBenefits.map((b) => b.sectorId));
      const goalEfforts = session.efforts.filter((e) =>
        goalSectorIds.has(e.sectorId)
      );
      if (goalEfforts.length > 0) {
        children.push(text("Inspanningen", { bold: true, color: CITO_BLUE }));
        (Object.keys(DOMAIN_LABELS) as EffortDomain[]).forEach((domain) => {
          const domainEfforts = goalEfforts.filter((e) => e.domain === domain);
          if (domainEfforts.length === 0) return;
          children.push(text(DOMAIN_LABELS[domain], { bold: true, size: 20 }));
          domainEfforts.forEach((e) => {
            const parts = [`[${e.sectorId}] ${e.description || "(naamloos)"}`];
            if (e.quarter) parts.push(`(${e.quarter})`);
            children.push(bullet(parts.join(" ")));
          });
        });
        children.push(emptyLine());
      }
    });

  return { properties: {}, children };
}

function crossAnalysisSection(session: DINSession) {
  const children: (Paragraph | Table)[] = [];

  children.push(heading("Cross-analyse", HeadingLevel.HEADING_1));

  // Gedeelde vermogens
  const shared = findSharedCapabilities(session.capabilities);
  if (shared.size > 0) {
    children.push(heading("Gedeelde vermogens (synergieën)", HeadingLevel.HEADING_2));
    for (const [capId, sectors] of shared) {
      const cap = session.capabilities.find((c) => c.id === capId);
      if (cap) {
        children.push(
          bullet(`${cap.description} — Sectoren: ${sectors.join(", ")}`)
        );
      }
    }
    children.push(emptyLine());
  }

  // Domeinbalans
  const balance = getDomainBalance(session.efforts);
  children.push(heading("Domeinbalans inspanningen", HeadingLevel.HEADING_2));
  const total = Object.values(balance).reduce((a, b) => a + b, 0) || 1;
  (Object.entries(balance) as [EffortDomain, number][]).forEach(
    ([domain, count]) => {
      const pct = Math.round((count / total) * 100);
      children.push(
        bullet(`${DOMAIN_LABELS[domain]}: ${count} inspanningen (${pct}%)`)
      );
    }
  );

  return { properties: {}, children };
}

function sectorSection(session: DINSession, sector: SectorName) {
  const children: (Paragraph | Table)[] = [];

  children.push(heading(`Sectorplan: ${sector}`, HeadingLevel.HEADING_1));

  // Origineel sectorplan
  const plan = session.sectorPlans.find((s) => s.sectorName === sector);
  if (plan?.rawText) {
    children.push(heading("Origineel sectorplan", HeadingLevel.HEADING_2));
    const planText = plan.rawText.length > 2000
      ? plan.rawText.slice(0, 2000) + "..."
      : plan.rawText;
    planText.split("\n").forEach((line) => {
      children.push(text(line.trim() || " "));
    });
    children.push(emptyLine());
  }

  // Baten
  const sectorBenefits = session.benefits.filter((b) => b.sectorId === sector);
  if (sectorBenefits.length > 0) {
    children.push(heading("Baten", HeadingLevel.HEADING_2));
    sectorBenefits.forEach((b) => {
      const goal = session.goals.find((g) => g.id === b.goalId);
      children.push(
        bullet(
          `${b.description || "(naamloos)"}${goal ? ` (Doel: ${goal.name})` : ""}${
            b.profiel.indicator
              ? ` — ${b.profiel.indicator}: ${b.profiel.currentValue} → ${b.profiel.targetValue}`
              : ""
          }`
        )
      );
    });
    children.push(emptyLine());
  }

  // Vermogens
  const sectorCaps = session.capabilities.filter(
    (c) => c.sectorId === sector
  );
  if (sectorCaps.length > 0) {
    children.push(heading("Vermogens", HeadingLevel.HEADING_2));
    sectorCaps.forEach((c) => {
      children.push(bullet(c.description || "(naamloos)"));
    });
    children.push(emptyLine());
  }

  // Inspanningen
  const sectorEfforts = session.efforts.filter(
    (e) => e.sectorId === sector
  );
  if (sectorEfforts.length > 0) {
    children.push(heading("Inspanningen", HeadingLevel.HEADING_2));
    (Object.keys(DOMAIN_LABELS) as EffortDomain[]).forEach((domain) => {
      const domainEfforts = sectorEfforts.filter((e) => e.domain === domain);
      if (domainEfforts.length === 0) return;
      children.push(text(DOMAIN_LABELS[domain], { bold: true }));
      domainEfforts.forEach((e) => {
        const parts = [e.description || "(naamloos)"];
        if (e.quarter) parts.push(`— ${e.quarter}`);
        if (e.status) parts.push(`[${e.status}]`);
        children.push(bullet(parts.join(" ")));
      });
    });
  }

  return { properties: {}, children };
}

function roadmapSection(session: DINSession) {
  const children: (Paragraph | Table)[] = [];

  children.push(heading("Roadmap", HeadingLevel.HEADING_1));

  // Verzamel unieke kwartalen
  const quarters = Array.from(
    new Set(session.efforts.filter((e) => e.quarter).map((e) => e.quarter!))
  ).sort();

  if (quarters.length === 0) {
    children.push(
      text("Nog geen inspanningen ingepland op kwartalen.", { italic: true })
    );
    return { properties: {}, children };
  }

  quarters.forEach((q) => {
    children.push(heading(q, HeadingLevel.HEADING_2));
    const qEfforts = session.efforts.filter((e) => e.quarter === q);

    const headerRow = new TableRow({
      children: [
        tableCell("Sector", { bold: true, shading: "E8EDF3", width: 15 }),
        tableCell("Domein", { bold: true, shading: "E8EDF3", width: 20 }),
        tableCell("Inspanning", { bold: true, shading: "E8EDF3", width: 45 }),
        tableCell("Status", { bold: true, shading: "E8EDF3", width: 20 }),
      ],
    });

    const dataRows = qEfforts.map(
      (e) =>
        new TableRow({
          children: [
            tableCell(e.sectorId),
            tableCell(DOMAIN_LABELS[e.domain]),
            tableCell(e.description || "(naamloos)"),
            tableCell(e.status),
          ],
        })
    );

    children.push(
      new Table({
        width: { size: 100, type: WidthType.PERCENTAGE },
        rows: [headerRow, ...dataRows],
      })
    );
    children.push(emptyLine());
  });

  return { properties: {}, children };
}

// --- Verrijkt sectorplan als Word ---

/** Parse inline markdown (**bold**, *italic*) to TextRun array */
function parseInlineMarkdown(text: string, baseSize?: number): TextRun[] {
  const size = baseSize || 22;
  const runs: TextRun[] = [];
  // Split on **bold** and *italic* patterns
  const parts = text.split(/(\*\*.*?\*\*|\*.*?\*)/g);
  for (const part of parts) {
    if (!part) continue;
    if (part.startsWith("**") && part.endsWith("**")) {
      runs.push(new TextRun({ text: part.slice(2, -2), bold: true, size }));
    } else if (part.startsWith("*") && part.endsWith("*") && !part.startsWith("**")) {
      runs.push(new TextRun({ text: part.slice(1, -1), italics: true, size }));
    } else {
      runs.push(new TextRun({ text: part, size, color: "333333" }));
    }
  }
  return runs;
}

/** Parse markdown table lines into a docx Table */
function parseMarkdownTable(tableLines: string[]): Table {
  const THIN_BORDER = { style: BorderStyle.SINGLE, size: 1, color: "BBBBBB" };
  const cellBorders = {
    top: THIN_BORDER,
    bottom: THIN_BORDER,
    left: THIN_BORDER,
    right: THIN_BORDER,
  };

  // Parse cells from a pipe-separated line
  function parseCells(line: string): string[] {
    return line
      .replace(/^\|/, "")
      .replace(/\|$/, "")
      .split("|")
      .map((c) => c.trim());
  }

  // Detect separator line (|---|---|)
  function isSeparator(line: string): boolean {
    return /^\|?[\s:]*-{2,}[\s:]*(\|[\s:]*-{2,}[\s:]*)*\|?$/.test(line.trim());
  }

  const dataLines = tableLines.filter((l) => !isSeparator(l));
  if (dataLines.length === 0) return new Table({ rows: [], width: { size: 100, type: WidthType.PERCENTAGE } });

  const headerCells = parseCells(dataLines[0]);
  const colCount = headerCells.length;
  const colWidth = Math.floor(100 / colCount);

  // Header row
  const headerRow = new TableRow({
    children: headerCells.map(
      (cell) =>
        new TableCell({
          width: { size: colWidth, type: WidthType.PERCENTAGE },
          shading: { fill: "E8EDF3" },
          borders: cellBorders,
          children: [
            new Paragraph({
              spacing: { before: 60, after: 60 },
              children: [new TextRun({ text: cell, bold: true, size: 20, color: CITO_BLUE })],
            }),
          ],
        })
    ),
  });

  // Data rows
  const dataRows = dataLines.slice(1).map(
    (line, rowIdx) =>
      new TableRow({
        children: parseCells(line).slice(0, colCount).map(
          (cell) =>
            new TableCell({
              width: { size: colWidth, type: WidthType.PERCENTAGE },
              shading: rowIdx % 2 === 1 ? { fill: "F8F9FA" } : undefined,
              borders: cellBorders,
              children: [
                new Paragraph({
                  spacing: { before: 40, after: 40 },
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

    // Empty line
    if (!trimmed) {
      elements.push(emptyLine());
      i++;
      continue;
    }

    // Horizontal rule: --- or *** or ___
    if (/^[-*_]{3,}$/.test(trimmed)) {
      elements.push(
        new Paragraph({
          spacing: { before: 200, after: 200 },
          border: { bottom: { style: BorderStyle.SINGLE, size: 1, color: "CCCCCC", space: 1 } },
          children: [],
        })
      );
      i++;
      continue;
    }

    // Markdown table: lines starting with |
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
        // Single pipe line — treat as text
        elements.push(new Paragraph({ spacing: { after: 60 }, children: parseInlineMarkdown(tableLines[0]) }));
      }
      continue;
    }

    // Heading 1: # ...
    if (trimmed.startsWith("# ")) {
      elements.push(heading(trimmed.slice(2), HeadingLevel.HEADING_1));
      i++;
      continue;
    }
    // Heading 2: ## ...
    if (trimmed.startsWith("## ")) {
      elements.push(heading(trimmed.slice(3), HeadingLevel.HEADING_2));
      i++;
      continue;
    }
    // Heading 3: ### ...
    if (trimmed.startsWith("### ")) {
      elements.push(
        new Paragraph({
          spacing: { before: 200, after: 80 },
          children: [
            new TextRun({ text: trimmed.slice(4), bold: true, size: 24, color: CITO_BLUE }),
          ],
        })
      );
      i++;
      continue;
    }
    // Heading 4: #### ...
    if (trimmed.startsWith("#### ")) {
      elements.push(
        new Paragraph({
          spacing: { before: 160, after: 60 },
          children: [
            new TextRun({ text: trimmed.slice(5), bold: true, size: 22, color: "444444" }),
          ],
        })
      );
      i++;
      continue;
    }

    // Numbered heading: 1. **Tekst**: rest
    const numberedBold = trimmed.match(/^(\d+)\.\s+\*\*(.+?)\*\*:?\s*(.*)/);
    if (numberedBold) {
      const runs: TextRun[] = [
        new TextRun({ text: `${numberedBold[1]}. ${numberedBold[2]}`, bold: true, size: 24, color: CITO_BLUE }),
      ];
      if (numberedBold[3]) {
        runs.push(new TextRun({ text: `: ${numberedBold[3]}`, size: 22, color: "333333" }));
      }
      elements.push(
        new Paragraph({ spacing: { before: 200, after: 60 }, children: runs })
      );
      i++;
      continue;
    }

    // Numbered list: 1. text (without bold)
    const numberedItem = trimmed.match(/^(\d+)\.\s+(.+)/);
    if (numberedItem) {
      elements.push(
        new Paragraph({
          spacing: { after: 40 },
          indent: { left: 360 },
          children: [
            new TextRun({ text: `${numberedItem[1]}. `, bold: true, size: 22, color: CITO_BLUE }),
            ...parseInlineMarkdown(numberedItem[2]),
          ],
        })
      );
      i++;
      continue;
    }

    // Sub-bullet: starts with spaces/tabs + - or *
    const subBullet = line.match(/^(\s{2,}|\t+)[-*]\s+(.*)/);
    if (subBullet) {
      elements.push(
        new Paragraph({
          spacing: { after: 30 },
          indent: { left: 720 },
          children: [
            new TextRun({ text: "◦ ", color: "888888", size: 20 }),
            ...parseInlineMarkdown(subBullet[2], 20),
          ],
        })
      );
      i++;
      continue;
    }

    // Bullet point: - ... or * ...
    if (trimmed.startsWith("- ") || trimmed.startsWith("* ")) {
      elements.push(
        new Paragraph({
          spacing: { after: 40 },
          indent: { left: 360 },
          children: [
            new TextRun({ text: "• ", color: CITO_BLUE }),
            ...parseInlineMarkdown(trimmed.slice(2)),
          ],
        })
      );
      i++;
      continue;
    }

    // Regular text with possible **bold** and *italic* segments
    const runs = parseInlineMarkdown(trimmed);
    if (runs.length > 0) {
      elements.push(new Paragraph({ spacing: { after: 60 }, children: runs }));
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
  const doc = new Document({
    styles: {
      default: {
        heading1: {
          run: { color: CITO_BLUE, bold: true, size: 32, font: "Calibri" },
        },
        heading2: {
          run: { color: CITO_BLUE, bold: true, size: 26, font: "Calibri" },
        },
        document: {
          run: { font: "Calibri", size: 22 },
        },
      },
    },
    sections: [
      {
        properties: {},
        children: [
          // Titel
          new Paragraph({
            alignment: AlignmentType.CENTER,
            spacing: { before: 2000, after: 200 },
            children: [
              new TextRun({ text: `Sectorplan ${sectorName} — Klant in Beeld`, size: 48, color: CITO_BLUE, bold: true }),
            ],
          }),
          new Paragraph({
            alignment: AlignmentType.CENTER,
            spacing: { after: 100 },
            children: [
              new TextRun({ text: sessionName, size: 28, color: CITO_BLUE }),
            ],
          }),
          new Paragraph({
            alignment: AlignmentType.CENTER,
            spacing: { after: 600 },
            children: [
              new TextRun({
                text: `Gegenereerd: ${new Date().toLocaleDateString("nl-NL")} — Doelen-Inspanningennetwerk (DIN)`,
                size: 20,
                color: "888888",
                italics: true,
              }),
            ],
          }),
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
  const sectorSections = SECTORS.filter((sector) => {
    return (
      session.benefits.some((b) => b.sectorId === sector) ||
      session.capabilities.some((c) => c.sectorId === sector) ||
      session.efforts.some((e) => e.sectorId === sector) ||
      session.sectorPlans.some((s) => s.sectorName === sector)
    );
  }).map((sector) => sectorSection(session, sector));

  const doc = new Document({
    styles: {
      default: {
        heading1: {
          run: { color: CITO_BLUE, bold: true, size: 32, font: "Calibri" },
        },
        heading2: {
          run: { color: CITO_BLUE, bold: true, size: 26, font: "Calibri" },
        },
        document: {
          run: { font: "Calibri", size: 22 },
        },
      },
    },
    sections: [
      titlePageSection(session),
      overviewSection(session),
      goalDINSections(session),
      crossAnalysisSection(session),
      ...sectorSections,
      roadmapSection(session),
    ],
  });

  return Packer.toBlob(doc);
}
