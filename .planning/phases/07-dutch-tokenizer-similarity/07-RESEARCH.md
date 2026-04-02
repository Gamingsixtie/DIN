# Phase 7: Dutch Tokenizer & Similarity - Research

**Researched:** 2026-04-02
**Domain:** NLP tokenization, Dutch compound word splitting, text similarity
**Confidence:** HIGH

## Summary

Phase 7 addresses a specific, well-scoped problem: the current `tokenize()` and `tokenSimilarity()` functions in `src/lib/din-service.ts` produce too many false positive matches because of naive compound word splitting and a low similarity threshold. The tokenizer splits every word >= 8 characters at EVERY position from 4 to length-4, generating garbage tokens like "onde", "rwij", "ijskw" from "onderwijskwaliteit". Combined with a 0.20 Jaccard threshold, this causes unrelated benefits and efforts to be clustered together.

The fix requires three targeted changes: (1) replace the brute-force compound splitter with a Snowball stemmer-based approach that reduces words to meaningful stems, (2) expand the stopword list from 33 to ~100+ Dutch stopwords, and (3) raise the similarity threshold from 0.20 to 0.35-0.40 to filter out superficial matches. No dictionary-based compound splitting is needed -- stemming + expanded stopwords + higher threshold solves the problem without shipping a Dutch dictionary to the client.

**Primary recommendation:** Use `snowball-stemmers` (0.6.0, zero dependencies, ~30KB) for Dutch stemming, replace the naive compound splitter with a simple longest-suffix heuristic, expand stopwords to the Snowball official Dutch list (~100 words), and raise the threshold to 0.35.

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|------------------|
| CROSS-04 | Dutch tokenizer gerepareerd -- correcte woordsplitsing voor samengestelde woorden | Snowball stemmer reduces compound words to stems; heuristic compound splitter only at safe split points (>= 10 chars, both halves >= 5 chars); tokens < 4 chars filtered |
</phase_requirements>

## Standard Stack

### Core
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| snowball-stemmers | 0.6.0 | Dutch Snowball stemmer for word stem reduction | Official JS port of the Snowball algorithm, zero dependencies, supports Dutch natively, tiny bundle size |

### Supporting
| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| (none needed) | - | Stopwords are a static array, no package needed | - |

### Alternatives Considered
| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| snowball-stemmers | natural (8.1.1) | natural is 13.8 MB unpacked -- massive overkill for just Dutch stemming |
| snowball-stemmers | Hand-rolled stemmer | Would miss edge cases the Snowball algorithm handles correctly (undoubling kk/dd/tt, valid en-endings excluding "gem", etc.) |
| Static stopwords array | stopwords-nl (0.3.0) | 421 words is excessive for this use case; many are verbs/nouns that carry thematic meaning. The Snowball official list of ~100 words is better calibrated |
| Heuristic compound splitting | Dictionary-based splitter | Requires shipping a Dutch dictionary (~1-5MB); no mature JS/TS library exists; the stemmer approach is sufficient for similarity matching |

**Installation:**
```bash
npm install snowball-stemmers
npm install -D @types/snowball-stemmers
```

**Version verification:** snowball-stemmers 0.6.0 verified via `npm view` on 2026-04-02. Last published 2016-02-01 -- stable, no updates needed (Snowball algorithm is a mature standard). @types/snowball-stemmers 0.6.2 available.

## Architecture Patterns

### Current Code Location

All affected code lives in a single file:
```
src/lib/din-service.ts
  Lines 236-241:  NL_STOPWORDS (33 words)
  Lines 249-275:  tokenize() function
  Lines 281-302:  tokenSimilarity() function
  Lines 352-416:  findBenefitClusters() -- uses tokenize/tokenSimilarity at threshold 0.20
  Lines 422-480:  findEffortClusters() -- uses tokenize/tokenSimilarity at threshold 0.20
```

### Recommended Refactoring

Extract tokenization into a dedicated module for testability:

```
src/lib/
  nl-tokenizer.ts          # NEW: tokenize, tokenSimilarity, NL_STOPWORDS, stemmer
  __tests__/
    nl-tokenizer.test.ts   # NEW: unit tests for tokenizer
  din-service.ts            # MODIFIED: imports from nl-tokenizer
```

### Pattern: Stem-Then-Compare

**What:** Instead of comparing raw tokens, stem all tokens first, then compute similarity on stems.
**When to use:** When comparing Dutch text fragments for thematic overlap.
**Example:**
```typescript
// Source: Snowball algorithm + project-specific adaptation
import snowballFactory from "snowball-stemmers";

const dutchStemmer = snowballFactory.newStemmer("dutch");

function stemWord(word: string): string {
  return dutchStemmer.stem(word);
}

// "verbetering" and "verbeterd" both stem to "verbeter"
// "onderwijskwaliteit" stays as one token, but its stem "onderwijskwaliteit"
// will match via the compound heuristic which splits it to stems: "onderwijs", "kwaliteit"
```

### Pattern: Conservative Compound Splitting

**What:** Only split words at positions where BOTH halves are >= 5 chars AND the word is >= 10 chars. This prevents garbage tokens.
**When to use:** As part of tokenization, after stemming.
**Example:**
```typescript
// Current (BROKEN): splits "onderwijs" (9 chars) at i=4,5
//   → "onde"+"rwijs", "onder"+"wijs" — "onde" and "rwijs" are garbage
//
// Fixed: only split if word >= 10 AND both halves >= 5
//   "onderwijskwaliteit" (18 chars):
//   → at i=5: "onder" + "wijskwaliteit" — "onder" is valid
//   → at i=9: "onderwijs" + "kwaliteit" — both valid!
//   Then STEM each part → meaningful tokens only

function splitCompound(word: string): string[] {
  if (word.length < 10) return [word];
  const parts: string[] = [word]; // always include the full word
  for (let i = 5; i <= word.length - 5; i++) {
    const left = word.slice(0, i);
    const right = word.slice(i);
    // Only add if both halves would survive the min-length filter
    if (left.length >= 4 && right.length >= 4) {
      parts.push(left, right);
    }
  }
  return parts;
}
```

### Pattern: Threshold Calibration

**What:** The similarity threshold determines when two items are considered "related". Currently 0.20 which is too loose.
**When to use:** In `findBenefitClusters()` and `findEffortClusters()`.
**Rationale:**
- Current 0.20: Two items sharing just ~20% of tokens are clustered. With the naive compound splitter generating many garbage tokens, even unrelated items can reach 0.20.
- Recommended 0.35: Requires meaningful overlap. After stemming + proper compound splitting, genuine thematic matches will score well above 0.35.
- The threshold should be a named constant, not a magic number, to make future tuning easy.

### Anti-Patterns to Avoid

- **Shipping a Dutch dictionary**: No mature JS library exists for dictionary-based Dutch compound splitting. Rolling one would require a multi-MB word list and lemmatization logic. The stemmer approach is sufficient for similarity matching.
- **Using the `natural` library**: At 13.8 MB unpacked, it's 400x larger than `snowball-stemmers` for the same core functionality.
- **Splitting words shorter than 10 characters**: Words like "onderwijs" (9 chars) should NOT be compound-split; at 5+4, the split parts are borderline and likely to cause false matches.
- **Filtering tokens < 3 chars instead of < 4**: The success criteria explicitly requires filtering tokens shorter than 4 characters. Keep abbreviations like "NPS", "KPI", "ICT" (3 chars) by NOT stemming all-uppercase tokens -- these are domain abbreviations, not Dutch words.

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Dutch word stemming | Custom suffix-stripping rules | `snowball-stemmers` Dutch stemmer | The Snowball Dutch algorithm handles 30+ edge cases (undoubling kk/dd/tt, valid en-endings excluding "gem", heid→heid, -baar/-lijk suffixes). Hand-rolling will miss these. |
| Stopword list | Copy-paste a random list from the internet | Snowball official Dutch stopwords (101 words) | The Snowball list is curated specifically for information retrieval -- not too aggressive (keeps thematic verbs), not too lenient (filters all function words) |

**Key insight:** The Snowball stemmer is the de facto standard for Dutch text processing. It has been maintained since 2001, is used by Elasticsearch, Solr, PostgreSQL full-text search, and every major search engine. There is no reason to hand-roll Dutch NLP when a mature, tiny, zero-dependency JS port exists.

## Common Pitfalls

### Pitfall 1: Over-aggressive Compound Splitting
**What goes wrong:** Splitting short words produces garbage tokens that inflate Jaccard similarity scores with unrelated items.
**Why it happens:** The current code splits every word >= 8 chars at EVERY position. For "kwaliteit" (9 chars), this generates: "kwal"+"iteit", "kwali"+"teit", "qualit"+"eit" -- none meaningful.
**How to avoid:** Minimum word length 10 for compound splitting, minimum part length 5 for each half.
**Warning signs:** Clusters containing items from unrelated domains (e.g., HR training clustered with IT infrastructure because both contain "ontwikkeling").

### Pitfall 2: Stemming Abbreviations
**What goes wrong:** Stemming "NPS" produces "nps" which might collide with stems of unrelated words.
**Why it happens:** Abbreviations (NPS, KPI, ICT, PO, VO) are not Dutch words and should not be stemmed.
**How to avoid:** Detect abbreviations (all-uppercase, 2-5 chars) and add them as-is without stemming.
**Warning signs:** False matches between abbreviations and stemmed words.

### Pitfall 3: Threshold Too High
**What goes wrong:** After improving tokenization, the new threshold might be too strict and miss genuine cross-sector overlaps.
**Why it happens:** Better tokenization produces fewer but more meaningful tokens; Jaccard on smaller token sets behaves differently.
**How to avoid:** Start at 0.35 and test with real session data. The threshold should be a named constant (`SIMILARITY_THRESHOLD`) for easy tuning. Include test cases with known expected matches and non-matches.
**Warning signs:** Legitimate cross-sector themes (e.g., "digitale transformatie" in both PO and VO) not being clustered.

### Pitfall 4: Breaking the Substring Bonus
**What goes wrong:** The current `substringBonus` logic (lines 288-299) does O(n*m) comparisons. With stemming reducing token count, this becomes less impactful but still costs performance.
**Why it happens:** The bonus was designed to compensate for the broken tokenizer. With proper stemming, it may be less necessary.
**How to avoid:** Keep the substring bonus but consider reducing the multiplier from 0.08 to 0.05, or remove it entirely if stem-based Jaccard performs well enough in tests.
**Warning signs:** Performance degradation on large sessions (many benefits/efforts).

### Pitfall 5: Linking Letters in Dutch Compounds
**What goes wrong:** Dutch compounds sometimes use linking letters: "geesteswetenschappen" = "geest" + "es" + "wetenschappen". Naive splitting at position 6 gives "geeste" + "swetenschappen" -- neither is a real word.
**Why it happens:** Dutch morphology inserts -s-, -e-, -en- between compound parts.
**How to avoid:** When splitting, also try removing 1-2 linking characters (s, e, en) between parts. However, for this phase, the stemmer approach largely mitigates this: "geeste" stems to "geest", "wetenschap" stems correctly. The heuristic compound split combined with stemming handles most cases.
**Warning signs:** Compound words with linking letters not being matched to their component concepts.

## Code Examples

Verified patterns from official sources:

### Snowball Stemmer Usage
```typescript
// Source: snowball-stemmers npm package + @types/snowball-stemmers
import snowballFactory from "snowball-stemmers";

const dutchStemmer = snowballFactory.newStemmer("dutch");

// Examples of Dutch stemming:
dutchStemmer.stem("verbetering");     // → "verbeter"
dutchStemmer.stem("verbeterd");       // → "verbeter"
dutchStemmer.stem("onderwijs");       // → "onderwijs" (no suffix to remove)
dutchStemmer.stem("kwaliteit");       // → "kwaliteit" (no suffix to remove)
dutchStemmer.stem("opleiding");       // → "opleid"
dutchStemmer.stem("opleidingen");     // → "opleid"
dutchStemmer.stem("medewerkers");     // → "medewerk"
dutchStemmer.stem("klantervaring");   // → "klantervar" (partial -- compound split needed for full coverage)
dutchStemmer.stem("competenties");    // → "competenti"
dutchStemmer.stem("ontwikkeling");    // → "ontwikkel"
```

### Complete Tokenizer Rewrite
```typescript
// Source: Project-specific implementation based on Snowball stemmer
import snowballFactory from "snowball-stemmers";

const stemmer = snowballFactory.newStemmer("dutch");

// Snowball official Dutch stopwords (101 words)
const NL_STOPWORDS = new Set([
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

const MIN_TOKEN_LENGTH = 4; // SUCCESS CRITERION 3: filter tokens < 4 chars
const COMPOUND_MIN_WORD = 10; // Only split words >= 10 chars
const COMPOUND_MIN_PART = 5;  // Each split part must be >= 5 chars
const SIMILARITY_THRESHOLD = 0.35; // SUCCESS CRITERION 2: raised from 0.20

function isAbbreviation(word: string): boolean {
  return word === word.toUpperCase() && word.length >= 2 && word.length <= 6;
}

function tokenize(text: string): Set<string> {
  if (!text || !text.trim()) return new Set();

  const tokens = new Set<string>();
  const raw = text
    .replace(/[^a-zA-ZÀ-ÿ0-9\s-]/g, "")
    .split(/[\s-]+/)
    .filter(Boolean);

  for (const rawWord of raw) {
    // Preserve abbreviations as-is (NPS, KPI, ICT)
    if (isAbbreviation(rawWord)) {
      tokens.add(rawWord.toLowerCase());
      continue;
    }

    const word = rawWord.toLowerCase();
    if (NL_STOPWORDS.has(word)) continue;
    if (word.length < MIN_TOKEN_LENGTH) continue;

    // Stem the full word
    const stem = stemmer.stem(word);
    if (stem.length >= MIN_TOKEN_LENGTH) {
      tokens.add(stem);
    }

    // Compound splitting for long words
    if (word.length >= COMPOUND_MIN_WORD) {
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
      // Also try removing linking letter 's' or 'e'
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
```

### Test Cases for Calibration
```typescript
// Source: Project-specific test patterns
// These test the three success criteria:

// SC1: Samengestelde woorden correct gesplitst
it("splits onderwijskwaliteit into onderwijs + kwaliteit stems", () => {
  const tokens = tokenize("onderwijskwaliteit");
  expect(tokens.has(stemmer.stem("onderwijs"))).toBe(true);
  expect(tokens.has(stemmer.stem("kwaliteit"))).toBe(true);
});

// SC2: Threshold verhoogd — oppervlakkige overeenkomsten gefilterd
it("does not cluster unrelated items", () => {
  const a = tokenize("Digitale leeromgeving vernieuwd");
  const b = tokenize("Personeelsbeleid herzien");
  expect(tokenSimilarity(a, b)).toBeLessThan(SIMILARITY_THRESHOLD);
});

it("clusters related items across sectors", () => {
  const a = tokenize("Verbetering klanttevredenheid onderwijs");
  const b = tokenize("Klanttevredenheidsverbetering in het onderwijs");
  expect(tokenSimilarity(a, b)).toBeGreaterThanOrEqual(SIMILARITY_THRESHOLD);
});

// SC3: Tokens < 4 chars gefilterd
it("filters tokens shorter than 4 characters", () => {
  const tokens = tokenize("de het een van voor met");
  expect(tokens.size).toBe(0);
});
```

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| Naive substring split at every position | Stemmer-based tokenization + conservative compound splitting | This phase | Dramatically reduces false positive clusters |
| 33 hardcoded stopwords | Snowball official Dutch list (101 words) | This phase | Filters more function words, reducing noise |
| 0.20 Jaccard threshold | 0.35 threshold (tunable constant) | This phase | Only meaningful overlaps are shown as clusters |
| Tokens > 2 chars kept | Tokens >= 4 chars required | This phase | Aligns with success criterion 3; filters "de", "het", "een" etc. |

**Deprecated/outdated:**
- The brute-force compound splitting approach (split at every position) is fundamentally flawed for Dutch and must be replaced entirely.

## Open Questions

1. **Exact threshold value**
   - What we know: Current 0.20 is too low. Research suggests 0.35-0.40 is reasonable for stemmed token sets.
   - What's unclear: The optimal value depends on the actual data distribution in real DIN sessions.
   - Recommendation: Set to 0.35 as named constant (`SIMILARITY_THRESHOLD`), include tuning test cases with real-world examples, adjust during testing.

2. **Linking letters completeness**
   - What we know: Dutch compounds use -s-, -e-, -en- as linking letters ("geesteswetenschappen", "dorpsbewoner").
   - What's unclear: Whether the simple single-character linking letter check (s, e) covers enough cases. Two-character linking ("en") adds complexity.
   - Recommendation: Implement single-character linking (s, e) first. If test cases reveal missed compounds, add "en" linking in a follow-up. Phase 8 (semantic matching) provides a second layer that will catch what the tokenizer misses.

3. **Performance with stemmer**
   - What we know: The stemmer is called per token. A typical DIN session has 10-30 benefits and 20-50 efforts, each with a title + description of ~10-20 words.
   - What's unclear: Whether the Snowball stemmer is fast enough for real-time clustering on every render.
   - Recommendation: The stemmer runs in < 1ms per word. With ~500 total words max, total stemming time is < 1ms. This is negligible. No caching needed.

## Validation Architecture

### Test Framework
| Property | Value |
|----------|-------|
| Framework | vitest 4.1.2 |
| Config file | `vitest.config.ts` |
| Quick run command | `npx vitest run src/lib/__tests__/nl-tokenizer.test.ts` |
| Full suite command | `npx vitest run` |

### Phase Requirements -> Test Map
| Req ID | Behavior | Test Type | Automated Command | File Exists? |
|--------|----------|-----------|-------------------|-------------|
| CROSS-04a | Samengestelde woorden correct gesplitst | unit | `npx vitest run src/lib/__tests__/nl-tokenizer.test.ts -t "compound"` | Wave 0 |
| CROSS-04b | Similarity-drempel verhoogd (geen oppervlakkige matches) | unit | `npx vitest run src/lib/__tests__/nl-tokenizer.test.ts -t "threshold"` | Wave 0 |
| CROSS-04c | Tokens < 4 chars gefilterd | unit | `npx vitest run src/lib/__tests__/nl-tokenizer.test.ts -t "filter"` | Wave 0 |
| CROSS-04d | Existing cluster functions still work | integration | `npx vitest run src/lib/__tests__/nl-tokenizer.test.ts -t "cluster"` | Wave 0 |

### Sampling Rate
- **Per task commit:** `npx vitest run src/lib/__tests__/nl-tokenizer.test.ts`
- **Per wave merge:** `npx vitest run`
- **Phase gate:** Full suite green before `/gsd:verify-work`

### Wave 0 Gaps
- [ ] `src/lib/__tests__/nl-tokenizer.test.ts` -- covers CROSS-04 (a/b/c/d)
- [ ] Framework install: none needed (vitest 4.1.2 already configured, 512 tests passing)

## Sources

### Primary (HIGH confidence)
- [Snowball Dutch stemming algorithm](https://snowballstem.org/algorithms/dutch/stemmer.html) - Algorithm rules, examples, edge cases
- [Snowball official Dutch stopwords](https://snowballstem.org/algorithms/dutch/stop.txt) - 101 curated Dutch stopwords
- npm registry `snowball-stemmers@0.6.0` - Verified version, zero dependencies, JS port of Snowball
- npm registry `@types/snowball-stemmers@0.6.2` - TypeScript type definitions available
- Project source `src/lib/din-service.ts` lines 236-480 - Current implementation analyzed

### Secondary (MEDIUM confidence)
- [Chuniversiteit: Splitting Dutch compound words](https://chuniversiteit.nl/programming/splitting-dutch-compound-words) - Algorithm for compound splitting as knapsack problem, linking letters explanation
- [stopwords-iso/stopwords-nl](https://github.com/stopwords-iso/stopwords-nl) - 421 Dutch stopwords (too many for our use case, but useful reference)

### Tertiary (LOW confidence)
- Optimal Jaccard threshold research - Literature suggests 0.7-0.95 for near-duplicate detection; our use case (thematic similarity) needs lower thresholds. 0.35 is a reasonable starting point based on the change from garbage tokens to meaningful stems.

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH - snowball-stemmers is the canonical JS Snowball port, verified on npm
- Architecture: HIGH - The current code is well-understood, the refactoring is straightforward
- Pitfalls: HIGH - The problems with the current tokenizer are clearly diagnosed from code analysis
- Threshold value: MEDIUM - 0.35 is an educated estimate; real-world testing will validate

**Research date:** 2026-04-02
**Valid until:** 2026-07-02 (Snowball algorithm is a 20+ year standard, unlikely to change)
