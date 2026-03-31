/**
 * Build-time extractie script voor programmaboek.doc
 *
 * Extraheert relevante secties uit het programmaboek en slaat ze op als
 * TypeScript constanten in src/lib/programmaboek-context.ts
 *
 * Gebruik: npx tsx scripts/extract-programmaboek.ts
 *
 * Bron: docs/programmaboek.doc (Prevaas & Van Loon, "Werken aan Programma's")
 */

import WordExtractor from "word-extractor";
import * as fs from "fs";
import * as path from "path";

// Chapter headers in the programmaboek (uppercase markers)
const CHAPTER_HEADERS = [
  { key: "ch8_doelen_baten", marker: "DOELEN EN BATEN IDENTIFICEREN" },
  { key: "ch9_veranderstrategie", marker: "DE (VERANDER)STRATEGIE FORMULEREN" },
  { key: "ch10_vermogens", marker: "DE BENODIGDE VERMOGENS UITWERKEN" },
  { key: "ch11_samenhang_din", marker: "OVERZICHT EN SAMENHANG AANBRENGEN" },
  { key: "ch12_rollen", marker: "ROLLEN DEFINI\u00cbREN EN VERDELEN" },
  { key: "ch17_doeltreffendheid", marker: "ZORGEN VOOR DOELTREFFENDHEID" },
] as const;

// Subsection patterns: "X.Y " at start of line or after newline
function findSubsection(chapterText: string, sectionNum: string): string {
  // Look for the section number pattern like "8.1 " or "10.4 "
  const patterns = [
    new RegExp(`\\n${sectionNum.replace(".", "\\.")}\\s+`, "g"),
    new RegExp(`^${sectionNum.replace(".", "\\.")}\\s+`, "g"),
  ];

  let startIdx = -1;
  for (const pattern of patterns) {
    const match = pattern.exec(chapterText);
    if (match) {
      startIdx = match.index;
      break;
    }
  }

  if (startIdx === -1) return "";

  // Find the next subsection header (X.Y pattern) or end of chapter
  const majorNum = sectionNum.split(".")[0];
  const minorNum = parseInt(sectionNum.split(".")[1], 10);

  // Try to find next subsection
  const nextSections = [];
  for (let next = minorNum + 1; next <= minorNum + 5; next++) {
    const nextPattern = new RegExp(`\\n${majorNum}\\.${next}\\s+`);
    const nextMatch = nextPattern.exec(chapterText.substring(startIdx + 10));
    if (nextMatch) {
      nextSections.push(startIdx + 10 + nextMatch.index);
      break;
    }
  }

  const endIdx = nextSections.length > 0 ? nextSections[0] : chapterText.length;
  return chapterText.substring(startIdx, endIdx).trim();
}

function escapeTemplateString(text: string): string {
  return text
    .replace(/\\/g, "\\\\")
    .replace(/`/g, "\\`")
    .replace(/\$\{/g, "\\${");
}

async function extract(): Promise<void> {
  const docPath = path.resolve(__dirname, "../docs/programmaboek.doc");
  const outputPath = path.resolve(__dirname, "../src/lib/programmaboek-context.ts");

  console.log("Extracting programmaboek.doc...");

  const extractor = new WordExtractor();
  const doc = await extractor.extract(docPath);
  const body = doc.getBody();

  console.log(`Extracted ${body.length} characters from programmaboek.doc`);

  // Split by chapter headers
  const chapters: Record<string, string> = {};
  for (let i = 0; i < CHAPTER_HEADERS.length; i++) {
    const start = body.indexOf(CHAPTER_HEADERS[i].marker);
    if (start === -1) {
      console.warn(`WARNING: Chapter header not found: ${CHAPTER_HEADERS[i].marker}`);
      continue;
    }

    // Find end: next chapter header or reasonable end
    let end = body.length;
    for (let j = i + 1; j < CHAPTER_HEADERS.length; j++) {
      const nextStart = body.indexOf(CHAPTER_HEADERS[j].marker);
      if (nextStart > start) {
        end = nextStart;
        break;
      }
    }

    chapters[CHAPTER_HEADERS[i].key] = body.substring(start, end).trim();
    console.log(`  ${CHAPTER_HEADERS[i].key}: ${chapters[CHAPTER_HEADERS[i].key].length} chars`);
  }

  // Extract key subsections
  const ch8 = chapters["ch8_doelen_baten"] || "";
  const ch10 = chapters["ch10_vermogens"] || "";
  const ch11 = chapters["ch11_samenhang_din"] || "";
  const ch17 = chapters["ch17_doeltreffendheid"] || "";

  // Section 8.1: Wat zijn doelen en baten?
  const section_8_1 = findSubsection(ch8, "8.1");
  console.log(`  Section 8.1: ${section_8_1.length} chars`);

  // Section 8.5: Batenprofiel
  const section_8_5 = findSubsection(ch8, "8.5");
  console.log(`  Section 8.5: ${section_8_5.length} chars`);

  // Section 10.1: Wat zijn vermogens?
  const section_10_1 = findSubsection(ch10, "10.1");
  console.log(`  Section 10.1: ${section_10_1.length} chars`);

  // Section 10.4: Waaruit vermogens opgebouwd (6 aspecten)
  const section_10_4 = findSubsection(ch10, "10.4");
  console.log(`  Section 10.4: ${section_10_4.length} chars`);

  // Section 11.1: Doelen-inspanningennetwerk (DIN)
  const section_11_1 = findSubsection(ch11, "11.1");
  console.log(`  Section 11.1: ${section_11_1.length} chars`);

  // Section 11.3: Inspanningendossier
  const section_11_3 = findSubsection(ch11, "11.3");
  console.log(`  Section 11.3: ${section_11_3.length} chars`);

  // Section 17.2: Baten managen
  const section_17_2 = findSubsection(ch17, "17.2");
  console.log(`  Section 17.2: ${section_17_2.length} chars`);

  // Compose the context constants per use case
  // Per D-03: fixed mapping per AI use case

  // Baten context: sections 8.1 + 8.5 (~1,400 tokens target)
  const batenContext = [section_8_1, section_8_5].filter(Boolean).join("\n\n");

  // Vermogens context: sections 10.1 + 10.4 (~2,100 tokens target)
  const vermogensContext = [section_10_1, section_10_4].filter(Boolean).join("\n\n");

  // Inspanningen context: section 11.3 (~305 tokens target)
  const inspanningenContext = section_11_3;

  // DIN/samenhang context: section 11.1 (~860 tokens target)
  const dinContext = section_11_1;

  // Batenprofiel context: section 8.5 (~680 tokens target)
  const batenprofielContext = section_8_5;

  // Vermogens aspecten: section 10.4 (~1,478 tokens target)
  const vermogensAspectenContext = section_10_4;

  // Cross-analyse context: sections 11.1 + 8.1 (~1,600 tokens target)
  const crossAnalyseContext = [section_11_1, section_8_1].filter(Boolean).join("\n\n");

  // Generate the TypeScript constants file
  const output = `// GEGENEREERD -- niet handmatig bewerken
// Bron: docs/programmaboek.doc (Prevaas & Van Loon, "Werken aan Programma's")
// Gegenereerd door: scripts/extract-programmaboek.ts
// Datum: ${new Date().toISOString().split("T")[0]}

/** Sectie 8.1 + 8.5: Doelen, baten en batenprofiel */
export const PROGRAMMABOEK_BATEN = \`${escapeTemplateString(batenContext)}\`;

/** Sectie 10.1 + 10.4: Vermogens en de 6 aspecten */
export const PROGRAMMABOEK_VERMOGENS = \`${escapeTemplateString(vermogensContext)}\`;

/** Sectie 11.3: Inspanningendossier */
export const PROGRAMMABOEK_INSPANNINGEN = \`${escapeTemplateString(inspanningenContext)}\`;

/** Sectie 11.1: Doelen-Inspanningennetwerk (DIN) samenhang */
export const PROGRAMMABOEK_DIN = \`${escapeTemplateString(dinContext)}\`;

/** Sectie 8.5: Batenprofiel definitie en voorbeeld */
export const PROGRAMMABOEK_BATENPROFIEL = \`${escapeTemplateString(batenprofielContext)}\`;

/** Sectie 10.4: De 6 aspecten waaruit vermogens zijn opgebouwd */
export const PROGRAMMABOEK_VERMOGENS_ASPECTEN = \`${escapeTemplateString(vermogensAspectenContext)}\`;

/** Sectie 11.1 + 8.1: DIN samenhang + baten definitie (voor cross-analyse) */
export const PROGRAMMABOEK_CROSS_ANALYSE = \`${escapeTemplateString(crossAnalyseContext)}\`;
`;

  fs.writeFileSync(outputPath, output, "utf-8");
  console.log(`\nGenerated ${outputPath}`);
  console.log(`Output size: ${output.length} chars`);

  // Summary of context sizes
  console.log("\nContext sizes (chars / ~tokens):");
  console.log(`  PROGRAMMABOEK_BATEN:            ${batenContext.length} chars (~${Math.round(batenContext.length / 4)} tokens)`);
  console.log(`  PROGRAMMABOEK_VERMOGENS:        ${vermogensContext.length} chars (~${Math.round(vermogensContext.length / 4)} tokens)`);
  console.log(`  PROGRAMMABOEK_INSPANNINGEN:     ${inspanningenContext.length} chars (~${Math.round(inspanningenContext.length / 4)} tokens)`);
  console.log(`  PROGRAMMABOEK_DIN:              ${dinContext.length} chars (~${Math.round(dinContext.length / 4)} tokens)`);
  console.log(`  PROGRAMMABOEK_BATENPROFIEL:     ${batenprofielContext.length} chars (~${Math.round(batenprofielContext.length / 4)} tokens)`);
  console.log(`  PROGRAMMABOEK_VERMOGENS_ASPECTEN: ${vermogensAspectenContext.length} chars (~${Math.round(vermogensAspectenContext.length / 4)} tokens)`);
  console.log(`  PROGRAMMABOEK_CROSS_ANALYSE:    ${crossAnalyseContext.length} chars (~${Math.round(crossAnalyseContext.length / 4)} tokens)`);
}

extract().catch((err) => {
  console.error("Extraction failed:", err);
  process.exit(1);
});
