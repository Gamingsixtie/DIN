/**
 * Prompt Assembly Module
 *
 * Composeert AI system prompts met programmaboek-context per use case.
 * De instructielaag (prompts.ts) wordt aangevuld met achtergrondkennis
 * uit het programmaboek (Prevaas & Van Loon, "Werken aan Programma's").
 *
 * Per D-03: vaste mapping per AI use case.
 * Per D-05: context wordt geplaatst in de system prompt.
 * Per D-08: statische theorie, build-time selectie.
 */

import {
  PROGRAMMABOEK_BATEN,
  PROGRAMMABOEK_VERMOGENS,
  PROGRAMMABOEK_INSPANNINGEN,
  PROGRAMMABOEK_DIN,
  PROGRAMMABOEK_BATENPROFIEL,
  PROGRAMMABOEK_VERMOGENS_ASPECTEN,
  PROGRAMMABOEK_CROSS_ANALYSE,
} from "./programmaboek-context";

/**
 * Alle AI use cases die programmaboek-context ontvangen.
 * Per D-09: Primair DIN-mapping gerelateerde use cases.
 * Per D-10: Secundair cross-analyse.
 * Per D-11: Export en sectorplan-analyse zijn buiten scope.
 */
export type ProgrammaboekUseCase =
  | "din-mapping"
  | "baat-suggest"
  | "baat-create"
  | "vermogen-suggest"
  | "vermogen-create"
  | "inspanning-suggest"
  | "inspanning-create"
  | "domain-recommend"
  | "batenprofiel"
  | "cross-analyse";

/**
 * Vaste mapping van AI use case naar programmaboek-secties (D-03).
 *
 * Elke use case krijgt de meest relevante secties uit het programmaboek
 * als achtergrondkennis mee. De secties zijn geselecteerd op basis van
 * de token-budgetten uit het onderzoek (03-RESEARCH.md).
 */
const USE_CASE_CONTEXT_MAP: Record<ProgrammaboekUseCase, string> = {
  // DIN-mapping: brede context (DIN + baten + vermogens)
  "din-mapping": [PROGRAMMABOEK_DIN, PROGRAMMABOEK_BATEN, PROGRAMMABOEK_VERMOGENS].join("\n\n"),

  // Baten: batenprofiel + baten definitie
  "baat-suggest": [PROGRAMMABOEK_BATEN, PROGRAMMABOEK_BATENPROFIEL].join("\n\n"),
  "baat-create": [PROGRAMMABOEK_BATEN, PROGRAMMABOEK_BATENPROFIEL].join("\n\n"),

  // Vermogens: vermogens definitie + 6 aspecten
  "vermogen-suggest": [PROGRAMMABOEK_VERMOGENS, PROGRAMMABOEK_VERMOGENS_ASPECTEN].join("\n\n"),
  "vermogen-create": [PROGRAMMABOEK_VERMOGENS, PROGRAMMABOEK_VERMOGENS_ASPECTEN].join("\n\n"),

  // Inspanningen: inspanningendossier
  "inspanning-suggest": PROGRAMMABOEK_INSPANNINGEN,
  "inspanning-create": PROGRAMMABOEK_INSPANNINGEN,

  // Domein-aanbeveling: 6 aspecten van vermogens
  "domain-recommend": PROGRAMMABOEK_VERMOGENS_ASPECTEN,

  // Batenprofiel: batenprofiel definitie
  "batenprofiel": PROGRAMMABOEK_BATENPROFIEL,

  // Cross-analyse: DIN samenhang + baten definitie
  "cross-analyse": PROGRAMMABOEK_CROSS_ANALYSE,
};

/**
 * Haal de programmaboek-context op voor een specifiek AI use case.
 */
export function getContextForUseCase(useCase: ProgrammaboekUseCase): string {
  return USE_CASE_CONTEXT_MAP[useCase];
}

/**
 * Trunceer tekst op een zinsgrens, nooit midden in een zin.
 *
 * @param text - De tekst om te trunceren
 * @param maxChars - Maximum aantal karakters
 * @returns Tekst afgekapt op de laatste zinsgrens binnen het limiet
 */
export function truncateAtSentenceBoundary(text: string, maxChars: number): string {
  if (text.length <= maxChars) return text;

  const truncated = text.substring(0, maxChars);

  // Zoek de laatste zinsgrens (punt, vraagteken, uitroepteken gevolgd door spatie of newline)
  const lastSentenceEnd = Math.max(
    truncated.lastIndexOf(". "),
    truncated.lastIndexOf(".\n"),
    truncated.lastIndexOf("?\n"),
    truncated.lastIndexOf("!\n"),
    truncated.lastIndexOf("? "),
    truncated.lastIndexOf("! ")
  );

  // 70% drempel: als geen zinsgrens gevonden in de laatste 30%, harde afkapping
  if (lastSentenceEnd > maxChars * 0.7) {
    return truncated.substring(0, lastSentenceEnd + 1);
  }

  // Fallback: check of er een punt op het einde staat
  const lastDot = truncated.lastIndexOf(".");
  if (lastDot > maxChars * 0.5) {
    return truncated.substring(0, lastDot + 1);
  }

  // Laatste redmiddel: harde afkapping
  return truncated;
}

/**
 * Stel een complete system prompt samen met programmaboek-context.
 *
 * De structuur (per D-05 en D-06):
 * 1. Instructie-prompt (de "wat te doen" laag uit prompts.ts)
 * 2. Horizontale lijn
 * 3. Achtergrondkennis header
 * 4. Programmaboek-context (de "waarom en wat" laag uit het boek)
 * 5. Horizontale lijn
 * 6. Instructie om de methodiek als referentie te gebruiken
 *
 * @param instructionPrompt - De bestaande prompt uit prompts.ts
 * @param useCase - Het AI use case waarvoor context nodig is
 * @param maxContextChars - Optioneel: maximaal aantal karakters voor de context
 * @returns De samengestelde system prompt
 */
export function assembleSystemPrompt(
  instructionPrompt: string,
  useCase: ProgrammaboekUseCase,
  maxContextChars?: number
): string {
  let context = getContextForUseCase(useCase);

  if (maxContextChars && context.length > maxContextChars) {
    context = truncateAtSentenceBoundary(context, maxContextChars);
  }

  return `${instructionPrompt}

---
ACHTERGRONDKENNIS UIT HET PROGRAMMABOEK (Prevaas & Van Loon, 'Werken aan Programma's'):

${context}
---

Gebruik bovenstaande methodiek-kennis als referentie bij het genereren van je antwoord. De theorie is leidend voor correcte terminologie en definities.`;
}
