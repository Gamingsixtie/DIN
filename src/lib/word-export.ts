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
} from "docx";
import type { DINSession, EffortDomain, SectorName, IntegratieAdviesResult } from "./types";
import { SECTORS, DOMAIN_LABELS, STATUS_LABELS } from "./types";
import { findSharedCapabilities, getDomainBalance, findGaps, buildChainsForSector, analyzeHefbomen } from "./din-service";

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

function tableOfContentsSection(session: DINSession) {
  const children: Paragraph[] = [];

  children.push(heading("Inhoudsopgave", HeadingLevel.HEADING_1));
  children.push(emptyLine(60));

  const tocItems: string[] = [
    "1.  Programmavisie",
    "2.  Scope",
    "3.  Programmadoelen",
    "4.  DIN-Netwerk per Doel",
    "5.  Cross-analyse",
    "6.  Gap-analyse",
    "7.  Hefboomwerking",
    "8.  Governance & Monitoring",
  ];

  let nextNum = 9;

  // Externe projecten (optioneel)
  if (session.externalProjects && session.externalProjects.length > 0) {
    tocItems.push(`${nextNum}.  Lopende projecten`);
    nextNum++;
  }

  // Sectoren toevoegen
  const activeSectors = SECTORS.filter(
    (s) =>
      session.benefits.some((b) => b.sectorId === s) ||
      session.capabilities.some((c) => c.sectorId === s) ||
      session.efforts.some((e) => e.sectorId === s) ||
      session.sectorPlans.some((sp) => sp.sectorName === s)
  );
  activeSectors.forEach((s, i) => {
    tocItems.push(`${nextNum + i}.  Sectorplan: ${s}`);
  });
  tocItems.push(`${nextNum + activeSectors.length}.  Roadmap`);

  tocItems.forEach((item) => {
    children.push(
      new Paragraph({
        spacing: { after: 80 },
        tabStops: [
          {
            type: TabStopType.RIGHT,
            position: TabStopPosition.MAX,
          },
        ],
        children: [
          new TextRun({
            text: item,
            size: 22,
            color: TEXT_PRIMARY,
            font: "Calibri",
          }),
        ],
      })
    );
  });

  return { properties: {}, children };
}

function executiveSummarySection(session: DINSession) {
  const children: (Paragraph | Table)[] = [];

  children.push(heading("Samenvatting", HeadingLevel.HEADING_1));

  // Programma-overzicht
  if (session.vision?.beknopt) {
    children.push(bodyText(session.vision.beknopt, { italic: true, color: TEXT_SECONDARY }));
    children.push(emptyLine(60));
  }

  // Cijfers in tabel
  const statsRow = new TableRow({
    children: [
      styledCell(`${session.goals.length}`, { bold: true, shading: CITO_BLUE_LIGHT, width: 25 }),
      styledCell(`${session.benefits.length}`, { bold: true, shading: CITO_BLUE_LIGHT, width: 25 }),
      styledCell(`${session.capabilities.length}`, { bold: true, shading: CITO_BLUE_LIGHT, width: 25 }),
      styledCell(`${session.efforts.length}`, { bold: true, shading: CITO_BLUE_LIGHT, width: 25 }),
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

  // Top doelen beknopt
  children.push(subHeading("Programmadoelen"));
  session.goals
    .sort((a, b) => a.rank - b.rank)
    .forEach((g) => {
      children.push(bullet(`${g.name}`));
    });

  // Domeinbalans beknopt
  const balance = getDomainBalance(session.efforts);
  const total = Object.values(balance).reduce((a, b) => a + b, 0) || 1;
  children.push(emptyLine(60));
  children.push(subHeading("Verdeling inspanningen over domeinen"));
  (Object.entries(balance) as [EffortDomain, number][]).forEach(([domain, count]) => {
    const pct = Math.round((count / total) * 100);
    children.push(bullet(`${DOMAIN_LABELS[domain]}: ${count} inspanningen (${pct}%)`));
  });

  // Actieve sectoren
  const activeSectors = SECTORS.filter(
    (s) =>
      session.benefits.some((b) => b.sectorId === s) ||
      session.efforts.some((e) => e.sectorId === s)
  );
  if (activeSectors.length > 0) {
    children.push(emptyLine(60));
    children.push(subHeading("Betrokken sectoren"));
    activeSectors.forEach((s) => {
      const sectorBenefits = session.benefits.filter((b) => b.sectorId === s).length;
      const sectorEfforts = session.efforts.filter((e) => e.sectorId === s).length;
      children.push(bullet(`${s}: ${sectorBenefits} baten, ${sectorEfforts} inspanningen`));
    });
  }

  return { properties: {}, children };
}

function overviewSection(session: DINSession) {
  const children: (Paragraph | Table)[] = [];

  // Visie
  if (session.vision) {
    children.push(heading("Programmavisie", HeadingLevel.HEADING_1));
    if (session.vision.beknopt) {
      children.push(bodyText(session.vision.beknopt, { bold: true, size: 24 }));
    }
    if (session.vision.uitgebreid) {
      children.push(emptyLine(60));
      children.push(bodyText(session.vision.uitgebreid));
    }
  }

  // Scope
  if (session.scope) {
    children.push(heading("Scope", HeadingLevel.HEADING_1));
    if (session.scope.inScope.length > 0) {
      children.push(subHeading("Binnen scope"));
      session.scope.inScope.forEach((s) => children.push(bullet(s)));
    }
    if (session.scope.outScope.length > 0) {
      children.push(emptyLine(60));
      children.push(subHeading("Buiten scope"));
      session.scope.outScope.forEach((s) => children.push(bullet(s)));
    }
  }

  // Doelen
  children.push(heading("Programmadoelen", HeadingLevel.HEADING_1));
  session.goals
    .sort((a, b) => a.rank - b.rank)
    .forEach((g) => {
      children.push(
        new Paragraph({
          spacing: { after: 40 },
          children: [
            new TextRun({ text: `${g.rank}. `, bold: true, color: CITO_BLUE, size: 24, font: "Calibri" }),
            new TextRun({ text: g.name, bold: true, size: 24, color: TEXT_PRIMARY, font: "Calibri" }),
          ],
        })
      );
      if (g.description) {
        children.push(bodyText(g.description, { italic: true, color: TEXT_SECONDARY, size: 20 }));
      }
      children.push(emptyLine(40));
    });

  return { properties: {}, children };
}

function goalDINSections(session: DINSession) {
  const children: (Paragraph | Table)[] = [];

  children.push(heading("DIN-Netwerk per Doel", HeadingLevel.HEADING_1));
  children.push(bodyText(
    "Per programmadoel wordt de volledige DIN-keten getoond: welke baten worden nagestreefd, " +
    "welke vermogens daarvoor nodig zijn, en welke inspanningen die vermogens opbouwen.",
    { color: TEXT_SECONDARY, size: 20 }
  ));
  children.push(emptyLine());

  const activeSectors = SECTORS.filter(
    (s) => session.benefits.some((b) => b.sectorId === s)
  );

  session.goals
    .sort((a, b) => a.rank - b.rank)
    .forEach((goal) => {
      const goalHasData = session.benefits.some((b) => b.goalId === goal.id);
      if (!goalHasData) return;

      children.push(heading(`Doel ${goal.rank}: ${goal.name}`, HeadingLevel.HEADING_2));

      // Per sector: expliciete DIN-keten via buildChainsForSector
      activeSectors.forEach((sector) => {
        const chainResult = buildChainsForSector(session, goal.id, sector);
        if (chainResult.chains.length === 0 && chainResult.unlinkedCaps.length === 0) return;

        children.push(
          new Paragraph({
            spacing: { before: 200, after: 80 },
            children: [
              new TextRun({ text: `Sector ${sector}`, bold: true, size: 22, color: CITO_BLUE, font: "Calibri" }),
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
            const levelInfo = link.capability.currentLevel && link.capability.targetLevel
              ? ` (niveau: ${link.capability.currentLevel}/5 \u2192 ${link.capability.targetLevel}/5)`
              : "";

            children.push(
              new Paragraph({
                spacing: { before: 40, after: 30 },
                indent: { left: 600 },
                children: [
                  new TextRun({ text: "VERM  ", bold: true, size: 16, color: CITO_BLUE, font: "Calibri" }),
                  new TextRun({ text: capLabel, bold: true, size: 20, color: TEXT_SECONDARY, font: "Calibri" }),
                  new TextRun({ text: levelInfo, size: 18, color: TEXT_MUTED, font: "Calibri" }),
                ],
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

function crossAnalysisSection(session: DINSession) {
  const children: (Paragraph | Table)[] = [];

  children.push(heading("Cross-analyse", HeadingLevel.HEADING_1));
  children.push(bodyText(
    "De cross-analyse identificeert synergieën tussen sectoren en beoordeelt de balans " +
    "over de vier inspanningsdomeinen (Mens, Processen, Data & Systemen, Cultuur).",
    { color: TEXT_SECONDARY, size: 20 }
  ));
  children.push(emptyLine());

  // Gedeelde vermogens
  const shared = findSharedCapabilities(session.capabilities);
  if (shared.size > 0) {
    children.push(heading("Synergieën \u2014 Gedeelde vermogens", HeadingLevel.HEADING_2));
    children.push(bodyText(
      "Onderstaande vermogens komen in meerdere sectoren terug en bieden kansen voor gedeelde inspanningen.",
      { color: TEXT_SECONDARY, size: 20 }
    ));
    for (const [capId, sectors] of shared) {
      const cap = session.capabilities.find((c) => c.id === capId);
      if (cap) {
        children.push(
          bullet(`${cap.title || cap.description} \u2014 Sectoren: ${sectors.join(", ")}`)
        );
      }
    }
    children.push(emptyLine());
  }

  // Domeinbalans
  const balance = getDomainBalance(session.efforts);
  const total = Object.values(balance).reduce((a, b) => a + b, 0) || 1;

  children.push(heading("Domeinbalans", HeadingLevel.HEADING_2));
  children.push(bodyText(
    "Verdeling van inspanningen over de vier DIN-domeinen. Een evenwichtige verdeling " +
    "is essentieel voor duurzame verandering.",
    { color: TEXT_SECONDARY, size: 20 }
  ));

  const balanceRows = (Object.entries(balance) as [EffortDomain, number][]).map(
    ([domain, count]) => {
      const pct = Math.round((count / total) * 100);
      return new TableRow({
        children: [
          styledCell(DOMAIN_LABELS[domain], { bold: true, width: 30, shading: DOMAIN_COLORS[domain] }),
          styledCell(`${count}`, { width: 20 }),
          styledCell(`${pct}%`, { width: 20 }),
          styledCell(
            pct < 10 ? "Aandacht: ondervertegenwoordigd" :
            pct > 40 ? "Aandacht: relatief dominant" :
            "Evenwichtig",
            { width: 30, color: pct < 10 || pct > 40 ? "CC6600" : "2E7D32" }
          ),
        ],
      });
    }
  );

  children.push(
    new Table({
      width: { size: 100, type: WidthType.PERCENTAGE },
      rows: [
        new TableRow({
          children: [
            headerCell("Domein", 30),
            headerCell("Aantal", 20),
            headerCell("Aandeel", 20),
            headerCell("Beoordeling", 30),
          ],
        }),
        ...balanceRows,
      ],
    })
  );

  return { properties: {}, children };
}

function gapAnalysisSection(session: DINSession) {
  const gaps = findGaps(
    session.goals,
    session.benefits,
    session.capabilities,
    session.efforts,
    session.goalBenefitMaps,
    session.benefitCapabilityMaps,
    session.capabilityEffortMaps
  );

  const goalsWithout = gaps.goalsWithoutBenefits.map((id) => session.goals.find((g) => g.id === id)).filter(Boolean);
  const benefitsWithout = gaps.benefitsWithoutCapabilities.map((id) => session.benefits.find((b) => b.id === id)).filter(Boolean);
  const capsWithout = gaps.capabilitiesWithoutEfforts.map((id) => session.capabilities.find((c) => c.id === id)).filter(Boolean);

  const hasGaps = goalsWithout.length > 0 || benefitsWithout.length > 0 || capsWithout.length > 0;
  if (!hasGaps) return null;

  const children: (Paragraph | Table)[] = [];

  children.push(heading("Gap-analyse", HeadingLevel.HEADING_1));
  children.push(bodyText(
    "Onderstaande breuken in de DIN-keten vragen aandacht. Een compleet netwerk " +
    "verbindt elk doel via baten en vermogens aan concrete inspanningen.",
    { color: TEXT_SECONDARY, size: 20 }
  ));
  children.push(emptyLine());

  if (goalsWithout.length > 0) {
    children.push(subHeading(`Doelen zonder baten (${goalsWithout.length})`));
    goalsWithout.forEach((g) => {
      children.push(bullet(g!.name));
    });
    children.push(emptyLine());
  }

  if (benefitsWithout.length > 0) {
    children.push(subHeading(`Baten zonder vermogens (${benefitsWithout.length})`));
    benefitsWithout.forEach((b) => {
      children.push(bullet(`[${b!.sectorId}] ${b!.title || b!.description}`));
    });
    children.push(emptyLine());
  }

  if (capsWithout.length > 0) {
    children.push(subHeading(`Vermogens zonder inspanningen (${capsWithout.length})`));
    capsWithout.forEach((c) => {
      children.push(bullet(`[${c!.sectorId}] ${c!.title || c!.description}`));
    });
  }

  return { properties: {}, children };
}

function hefboomSection(session: DINSession) {
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

  if (multiSectorClusters.length === 0) return null;

  const children: (Paragraph | Table)[] = [];

  children.push(heading("Hefboomwerking", HeadingLevel.HEADING_1));
  children.push(bodyText(
    "Baten die in meerdere sectoren terugkomen bieden hefboomwerking: " +
    "gedeelde inspanningen met breed effect.",
    { color: TEXT_SECONDARY, size: 20 }
  ));
  children.push(emptyLine());

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

  return { properties: {}, children };
}

function governanceSection(session: DINSession) {
  if (session.benefits.length === 0) return null;

  const children: (Paragraph | Table)[] = [];

  children.push(heading("Governance & Monitoring", HeadingLevel.HEADING_1));
  children.push(bodyText(
    "Overzicht van verantwoordelijkheden voor batenrealisatie, meetmomenten en goedkeuringsstatus " +
    "van inspanningen.",
    { color: TEXT_SECONDARY, size: 20 }
  ));
  children.push(emptyLine());

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

  // Monitoring-kalender
  const meetplanItems = session.benefits.filter(
    (b) => b.profiel.measurementMoment || b.profiel.meetmethode
  );

  if (meetplanItems.length > 0) {
    children.push(subHeading("Monitoring-kalender"));

    const meetRows = meetplanItems.map(
      (b) =>
        new TableRow({
          children: [
            styledCell(b.title || b.description || "\u2014", { bold: true, width: 22 }),
            styledCell(b.profiel.indicator || "\u2014", { width: 18 }),
            styledCell(b.profiel.meetmethode || "\u2014", { width: 22 }),
            styledCell(b.profiel.measurementMoment || "\u2014", { width: 18 }),
            styledCell(b.profiel.indicatorOwner || "\u2014", { width: 20 }),
          ],
        })
    );

    children.push(
      new Table({
        width: { size: 100, type: WidthType.PERCENTAGE },
        rows: [
          new TableRow({
            children: [
              headerCell("Baat", 22),
              headerCell("Indicator", 18),
              headerCell("Meetmethode", 22),
              headerCell("Meetmoment", 18),
              headerCell("Meetverantw.", 20),
            ],
          }),
          ...meetRows,
        ],
      })
    );
    children.push(emptyLine());
  }

  // Goedkeuringsstatus
  const approvedEfforts = session.efforts.filter((e) => e.approvalStatus && e.approvalStatus !== "voorstel");
  if (approvedEfforts.length > 0) {
    children.push(subHeading("Goedkeuringsstatus inspanningen"));
    approvedEfforts.forEach((e) => {
      const status = e.approvalStatus || "onbekend";
      const date = e.approvalDate ? ` (${e.approvalDate})` : "";
      children.push(bullet(`[${status}] [${e.sectorId}] ${e.title || e.description}${date}`));
    });
  }

  return { properties: {}, children };
}

function externalProjectsSection(session: DINSession) {
  if (!session.externalProjects || session.externalProjects.length === 0) return null;

  const children: (Paragraph | Table)[] = [];

  children.push(heading("Lopende projecten", HeadingLevel.HEADING_1));
  children.push(bodyText(
    "Bestaande projecten die aansluiten bij het programma en mogelijk bijdragen aan DIN-vermogens.",
    { color: TEXT_SECONDARY, size: 20 }
  ));
  children.push(emptyLine());

  const projectRows = session.externalProjects.map(
    (p) =>
      new TableRow({
        children: [
          styledCell(p.name, { bold: true, width: 20 }),
          styledCell(p.sectorId, { width: 10 }),
          styledCell(p.description, { width: 30 }),
          styledCell(STATUS_LABELS[p.status] || p.status, { width: 15 }),
          styledCell(p.relevance || "\u2014", { width: 25 }),
        ],
      })
  );

  children.push(
    new Table({
      width: { size: 100, type: WidthType.PERCENTAGE },
      rows: [
        new TableRow({
          children: [
            headerCell("Project", 20),
            headerCell("Sector", 10),
            headerCell("Beschrijving", 30),
            headerCell("Status", 15),
            headerCell("Relevantie", 25),
          ],
        }),
        ...projectRows,
      ],
    })
  );

  return { properties: {}, children };
}

function sectorSection(session: DINSession, sector: SectorName) {
  const children: (Paragraph | Table)[] = [];

  children.push(heading(`Sectorplan: ${sector}`, HeadingLevel.HEADING_1));

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

  // Vermogens
  const sectorCaps = session.capabilities.filter((c) => c.sectorId === sector);
  if (sectorCaps.length > 0) {
    children.push(subHeading("Vermogens"));

    const capRows = sectorCaps.map(
      (c) =>
        new TableRow({
          children: [
            styledCell(c.title || c.description || "\u2014", { bold: true, width: 22 }),
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

  // Inspanningen per domein — met randvoorwaarden
  const sectorEfforts = session.efforts.filter((e) => e.sectorId === sector);
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

function roadmapSection(session: DINSession) {
  const children: (Paragraph | Table)[] = [];

  children.push(heading("Roadmap", HeadingLevel.HEADING_1));
  children.push(bodyText(
    "Overzicht van alle inspanningen gepland per kwartaal, georganiseerd per sector en domein.",
    { color: TEXT_SECONDARY, size: 20 }
  ));
  children.push(emptyLine());

  const quarters = Array.from(
    new Set(session.efforts.filter((e) => e.quarter).map((e) => e.quarter!))
  ).sort();

  if (quarters.length === 0) {
    children.push(bodyText("Nog geen inspanningen ingepland op kwartalen.", { italic: true, color: TEXT_MUTED }));
    return { properties: {}, children };
  }

  quarters.forEach((q) => {
    children.push(heading(q, HeadingLevel.HEADING_2));
    const qEfforts = session.efforts.filter((e) => e.quarter === q);

    const dataRows = qEfforts.map(
      (e) =>
        new TableRow({
          children: [
            styledCell(e.sectorId, { width: 12 }),
            styledCell(DOMAIN_LABELS[e.domain], { width: 18, shading: DOMAIN_COLORS[e.domain] }),
            styledCell(e.title || e.description || "\u2014", { bold: true, width: 40 }),
            styledCell(e.dossier?.eigenaar || "\u2014", { width: 15 }),
            styledCell(STATUS_LABELS[e.status] || e.status, { width: 15 }),
          ],
        })
    );

    children.push(
      new Table({
        width: { size: 100, type: WidthType.PERCENTAGE },
        rows: [
          new TableRow({
            children: [
              headerCell("Sector", 12),
              headerCell("Domein", 18),
              headerCell("Inspanning", 40),
              headerCell("Opdrachtgever", 15),
              headerCell("Status", 15),
            ],
          }),
          ...dataRows,
        ],
      })
    );
    children.push(emptyLine());
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

  const sectorSections = SECTORS.filter((sector) => {
    return (
      session.benefits.some((b) => b.sectorId === sector) ||
      session.capabilities.some((c) => c.sectorId === sector) ||
      session.efforts.some((e) => e.sectorId === sector) ||
      session.sectorPlans.some((s) => s.sectorName === sector)
    );
  }).map((sector) => {
    const section = sectorSection(session, sector);
    return {
      ...section,
      properties: { ...pageProps },
      headers: { default: header },
      footers: { default: footer },
    };
  });

  // Voeg headers/footers toe aan alle content-secties (behalve titelpagina)
  const addHeaderFooter = (section: { properties: Record<string, unknown>; children: (Paragraph | Table)[] }) => ({
    ...section,
    properties: { ...section.properties, ...pageProps },
    headers: { default: header },
    footers: { default: footer },
  });

  // Optionele secties (retourneren null als data ontbreekt)
  const optionalSections = [
    gapAnalysisSection(session),
    hefboomSection(session),
    governanceSection(session),
    externalProjectsSection(session),
  ]
    .filter((s): s is { properties: Record<string, unknown>; children: (Paragraph | Table)[] } => s !== null)
    .map(addHeaderFooter);

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
      addHeaderFooter(tableOfContentsSection(session)),
      addHeaderFooter(executiveSummarySection(session)),
      addHeaderFooter(overviewSection(session)),
      addHeaderFooter(goalDINSections(session)),
      addHeaderFooter(crossAnalysisSection(session)),
      ...optionalSections,
      ...sectorSections,
      addHeaderFooter(roadmapSection(session)),
    ],
  });

  return Packer.toBlob(doc);
}
