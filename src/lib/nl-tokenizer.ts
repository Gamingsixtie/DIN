// Dutch tokenizer met Snowball stemmer, compound splitting, en stopwoorden
// Vervangt de gebroken tokenize/tokenSimilarity in din-service.ts

import snowballFactory from "snowball-stemmers";

const stemmer = snowballFactory.newStemmer("dutch");

// Snowball official Dutch stopwords (101 woorden)
export const NL_STOPWORDS = new Set([
  "de", "en", "van", "ik", "te", "dat", "die", "in", "een", "hij",
  "het", "niet", "zijn", "is", "was", "op", "aan", "met", "als", "voor",
  "had", "er", "maar", "om", "hem", "dan", "zou", "of", "wat", "mijn",
  "men", "dit", "zo", "door", "over", "ze", "zich", "bij", "ook", "tot",
  "je", "mij", "uit", "der", "daar", "haar", "naar", "heb", "hoe", "heeft",
  "hebben", "deze", "u", "want", "nog", "zal", "me", "zij", "nu", "ge",
  "geen", "omdat", "iets", "worden", "toch", "al", "waren", "veel", "meer",
  "doen", "toen", "moet", "ben", "zonder", "kan", "hun", "dus", "alles",
  "onder", "ja", "eens", "hier", "wie", "werd", "altijd", "doch", "wordt",
  "wezen", "kunnen", "ons", "zelf", "tegen", "na", "reeds", "wil", "kon",
  "niets", "uw", "iemand", "geweest", "andere",
]);

export const MIN_TOKEN_LENGTH = 4;
export const COMPOUND_MIN_WORD = 10;
export const COMPOUND_MIN_PART = 5;
export const SIMILARITY_THRESHOLD = 0.35;

/**
 * Detecteer afkortingen: volledig uppercase, 2-6 tekens.
 * Voorbeelden: NPS, KPI, ICT, PO, VO
 */
function isAbbreviation(word: string): boolean {
  return word === word.toUpperCase() && word.length >= 2 && word.length <= 6 && /^[A-Z]+$/.test(word);
}

/**
 * Tokenize Nederlandse tekst voor similarity matching.
 * - Filtert stopwoorden en korte tokens (< 4 tekens)
 * - Stemt woorden met de Snowball Dutch stemmer
 * - Splitst samengestelde woorden conservatief (min woord 10, min deel 5)
 * - Behoudt afkortingen (NPS, KPI, ICT) zonder stemming
 * - Probeert verbindingsletters (s, e) bij compound splitting
 */
export function tokenize(text: string): Set<string> {
  if (!text || !text.trim()) return new Set();

  const tokens = new Set<string>();
  const raw = text
    .replace(/[^a-zA-Z\u00C0-\u00FF0-9\s-]/g, "")
    .split(/[\s-]+/)
    .filter(Boolean);

  for (const rawWord of raw) {
    // Bewaar afkortingen als-is (lowercase) zonder stemming
    if (isAbbreviation(rawWord)) {
      tokens.add(rawWord.toLowerCase());
      continue;
    }

    const word = rawWord.toLowerCase();
    if (NL_STOPWORDS.has(word)) continue;
    if (word.length < MIN_TOKEN_LENGTH) continue;

    // Stem het volledige woord
    const stem = stemmer.stem(word);
    if (stem.length >= MIN_TOKEN_LENGTH) {
      tokens.add(stem);
    }

    // Compound splitting alleen voor lange woorden
    if (word.length >= COMPOUND_MIN_WORD) {
      // Directe splitsing op elke positie
      for (let i = COMPOUND_MIN_PART; i <= word.length - COMPOUND_MIN_PART; i++) {
        const left = word.slice(0, i);
        const right = word.slice(i);
        if (left.length >= MIN_TOKEN_LENGTH && right.length >= MIN_TOKEN_LENGTH) {
          const leftStem = stemmer.stem(left);
          const rightStem = stemmer.stem(right);
          if (leftStem.length >= MIN_TOKEN_LENGTH) tokens.add(leftStem);
          if (rightStem.length >= MIN_TOKEN_LENGTH) tokens.add(rightStem);
        }
      }

      // Probeer verbindingsletter 's' of 'e' te verwijderen
      for (let i = COMPOUND_MIN_PART; i <= word.length - COMPOUND_MIN_PART - 1; i++) {
        if (word[i] === "s" || word[i] === "e") {
          const left = word.slice(0, i);
          const right = word.slice(i + 1);
          if (left.length >= MIN_TOKEN_LENGTH && right.length >= MIN_TOKEN_LENGTH) {
            const leftStem = stemmer.stem(left);
            const rightStem = stemmer.stem(right);
            if (leftStem.length >= MIN_TOKEN_LENGTH) tokens.add(leftStem);
            if (rightStem.length >= MIN_TOKEN_LENGTH) tokens.add(rightStem);
          }
        }
      }
    }
  }

  return tokens;
}

/**
 * Gecombineerde similarity: Jaccard + gereduceerde substring-bonus.
 * Substring bonus vangt partial stem overlaps op, maar is gereduceerd
 * ten opzichte van de oude implementatie (0.05 multiplier, max 0.20 cap)
 * omdat stemming nu de meeste gevallen afvangt.
 */
export function tokenSimilarity(a: Set<string>, b: Set<string>): number {
  if (a.size === 0 || b.size === 0) return 0;

  const intersection = new Set([...a].filter((x) => b.has(x)));
  const union = new Set([...a, ...b]);
  const jaccard = union.size > 0 ? intersection.size / union.size : 0;

  // Gereduceerde substring bonus
  let substringMatches = 0;
  for (const tA of a) {
    for (const tB of b) {
      if (tA !== tB && tA.length >= MIN_TOKEN_LENGTH && tB.length >= MIN_TOKEN_LENGTH) {
        if (tA.includes(tB) || tB.includes(tA)) {
          substringMatches++;
        }
      }
    }
  }
  const substringBonus = Math.min(substringMatches * 0.05, 0.20);

  return Math.min(jaccard + substringBonus, 1.0);
}
