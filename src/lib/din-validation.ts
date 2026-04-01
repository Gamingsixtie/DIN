// DIN-methodiek validatiemodule
// Pure validatiefuncties per DIN-type: baat, vermogen, inspanning
// Stille correctie waar mogelijk, warnings waar niet auto-corrigeerbaar

// ============================================================
// Types
// ============================================================

export interface ValidationCorrection {
  field: string;
  original: string;
  corrected: string;
  rule: string;
  message: string; // Dutch, human-readable
}

export interface ValidationResult<T> {
  item: T;
  passed: boolean;
  corrections: ValidationCorrection[];
  warnings: string[]; // Dutch warning messages
}

// ============================================================
// Word lists (domain-specific, NOT full NLP)
// ============================================================

/**
 * Actie-werkwoorden die NIET in baat- of vermogenstitels thuishoren.
 * Deze woorden duiden op inspanningen (concrete activiteiten), niet effecten of vermogens.
 */
const ACTION_VERBS_BLACKLIST: string[] = [
  "implementeren",
  "uitvoeren",
  "opzetten",
  "inrichten",
  "trainen",
  "bouwen",
  "ontwikkelen",
  "realiseren",
  "verbeteren",
  "optimaliseren",
  "lanceren",
  "deployen",
  "migreren",
  "invoeren",
  "organiseren",
  "aanschaffen",
  "installeren",
  "configureren",
  "integreren",
  "automatiseren",
];

/**
 * Vergrotende trap patronen voor baat-titels.
 * Curated list -- geen generieke -er/-ere suffix matching (Pitfall 4).
 */
const VERGROTENDE_TRAP_PATTERNS: RegExp[] = [
  /\b(hogere?|lagere?|snellere?|betere?|grotere?|bredere?|sterkere?|diepere?|rijkere?|kortere?|langere?)\b/i,
  /\b(meer|minder)\b/i,
];

// ============================================================
// Internal helpers
// ============================================================

function checkVergrotendeTrap(title: string): {
  valid: boolean;
  suggestion?: string;
} {
  const hasComparative = VERGROTENDE_TRAP_PATTERNS.some((p) => p.test(title));
  if (hasComparative) return { valid: true };

  // Auto-correct: prepend "Betere" as safe default
  return {
    valid: false,
    suggestion: `Betere ${title.charAt(0).toLowerCase()}${title.slice(1)}`,
  };
}

function findActionVerbs(title: string): string[] {
  const words = title.toLowerCase().split(/\s+/);
  return words.filter((word) =>
    ACTION_VERBS_BLACKLIST.some(
      (verb) => word === verb || word === verb.replace(/en$/, "")
    )
  );
}

function countWords(title: string): number {
  return title.trim().split(/\s+/).length;
}

// ============================================================
// Validator functions
// ============================================================

/**
 * Valideer een baat (benefit) tegen DIN-methodiekregels.
 *
 * Regels:
 * 1. Vergrotende trap: titel moet vergrotende trap bevatten (auto-correct)
 * 2. Geen werkwoorden: titel mag geen actie-werkwoorden bevatten (warning)
 * 3. Kort: titel max 5 woorden (warning)
 */
export function validateBaat<T extends { title: string; [key: string]: unknown }>(
  baat: T
): ValidationResult<T> {
  const corrections: ValidationCorrection[] = [];
  const warnings: string[] = [];
  let correctedItem = { ...baat };

  // Rule 1: Vergrotende trap check
  const trapResult = checkVergrotendeTrap(correctedItem.title);
  if (!trapResult.valid && trapResult.suggestion) {
    corrections.push({
      field: "title",
      original: correctedItem.title,
      corrected: trapResult.suggestion,
      rule: "vergrotende-trap",
      message: "Titel aangepast naar vergrotende trap",
    });
    correctedItem = { ...correctedItem, title: trapResult.suggestion };
  }

  // Rule 2: Geen werkwoorden
  const foundVerbs = findActionVerbs(correctedItem.title);
  for (const verb of foundVerbs) {
    warnings.push(
      `Titel bevat werkwoord "${verb}" -- baten beschrijven effecten, geen activiteiten`
    );
  }

  // Rule 3: Kort (max 5 woorden)
  const wordCount = countWords(correctedItem.title);
  if (wordCount > 5) {
    warnings.push(
      `Titel heeft ${wordCount} woorden (max 5 aanbevolen)`
    );
  }

  return {
    item: correctedItem,
    passed: corrections.length === 0 && warnings.length === 0,
    corrections,
    warnings,
  };
}

/**
 * Valideer een vermogen (capability) tegen DIN-methodiekregels.
 *
 * Regels:
 * 1. Geen actie-werkwoorden: titel mag geen actie-werkwoorden bevatten (warning)
 * 2. Kort: titel max 5 woorden (warning)
 */
export function validateVermogen<T extends { title: string; [key: string]: unknown }>(
  vermogen: T
): ValidationResult<T> {
  const corrections: ValidationCorrection[] = [];
  const warnings: string[] = [];
  const correctedItem = { ...vermogen };

  // Rule 1: Geen actie-werkwoorden
  const foundVerbs = findActionVerbs(correctedItem.title);
  for (const verb of foundVerbs) {
    warnings.push(
      `Titel bevat actie-werkwoord "${verb}" -- vermogens beschrijven wat de organisatie moet KUNNEN, niet DOEN`
    );
  }

  // Rule 2: Kort (max 5 woorden)
  const wordCount = countWords(correctedItem.title);
  if (wordCount > 5) {
    warnings.push(
      `Titel heeft ${wordCount} woorden (max 5 aanbevolen)`
    );
  }

  return {
    item: correctedItem,
    passed: corrections.length === 0 && warnings.length === 0,
    corrections,
    warnings,
  };
}

/**
 * Valideer een inspanning (effort) tegen DIN-methodiekregels.
 *
 * Regels:
 * 1. Werkwoorden verplicht: titel MOET een werkwoord bevatten (warning)
 * 2. Kort: titel max 8 woorden (warning)
 */
export function validateInspanning<T extends { title: string; [key: string]: unknown }>(
  inspanning: T
): ValidationResult<T> {
  const corrections: ValidationCorrection[] = [];
  const warnings: string[] = [];
  const correctedItem = { ...inspanning };

  // Rule 1: Werkwoorden verplicht
  const foundVerbs = findActionVerbs(correctedItem.title);
  if (foundVerbs.length === 0) {
    warnings.push(
      "Titel mist een werkwoord -- inspanningen beschrijven concrete acties"
    );
  }

  // Rule 2: Kort (max 8 woorden)
  const wordCount = countWords(correctedItem.title);
  if (wordCount > 8) {
    warnings.push(
      `Titel heeft ${wordCount} woorden (max 8 aanbevolen)`
    );
  }

  return {
    item: correctedItem,
    passed: corrections.length === 0 && warnings.length === 0,
    corrections,
    warnings,
  };
}
