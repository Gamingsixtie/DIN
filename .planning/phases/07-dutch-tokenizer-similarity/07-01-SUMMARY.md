---
phase: 07-dutch-tokenizer-similarity
plan: 01
subsystem: nlp
tags: [snowball-stemmers, dutch-stemmer, tokenizer, jaccard-similarity, compound-splitting]

# Dependency graph
requires:
  - phase: existing din-service.ts
    provides: findBenefitClusters and findEffortClusters cluster functions
provides:
  - "nl-tokenizer.ts module with Snowball Dutch stemmer, compound splitting, 101 stopwords"
  - "tokenize(), tokenSimilarity(), SIMILARITY_THRESHOLD exports"
  - "15 unit tests covering tokenizer, similarity, constants, compounds, abbreviations"
affects: [cross-analyse, din-mapping, export]

# Tech tracking
tech-stack:
  added: [snowball-stemmers@0.6.0, "@types/snowball-stemmers@0.6.2"]
  patterns: [stem-then-compare for Dutch text similarity, conservative compound splitting (min 10/5), linking letter removal]

key-files:
  created: [src/lib/nl-tokenizer.ts, src/lib/__tests__/nl-tokenizer.test.ts]
  modified: [src/lib/din-service.ts, package.json, package-lock.json]

key-decisions:
  - "Snowball stemmer (snowball-stemmers) chosen over natural (13.8MB) for Dutch stemming"
  - "101 official Snowball Dutch stopwords instead of 33 hardcoded or 421 from stopwords-nl"
  - "SIMILARITY_THRESHOLD raised from 0.20 to 0.35 as named constant"
  - "Compound splitting only for words >= 10 chars with parts >= 5 chars"
  - "Linking letter removal (s, e) for Dutch compound morphology"
  - "Reduced substring bonus (0.05/0.20) since stemming handles most overlaps"

patterns-established:
  - "Stem-then-compare: all Dutch text similarity uses Snowball stems, not raw words"
  - "Named threshold constant: SIMILARITY_THRESHOLD exported for tuning and testing"
  - "Abbreviation detection: all-uppercase 2-6 char words preserved without stemming"

requirements-completed: [CROSS-04]

# Metrics
duration: 4min
completed: 2026-04-02
---

# Phase 7 Plan 1: Dutch Tokenizer & Similarity Summary

**Snowball stemmer-based Dutch tokenizer with conservative compound splitting, 101 stopwords, and raised similarity threshold (0.35) replacing the broken naive splitter**

## Performance

- **Duration:** 4 min
- **Started:** 2026-04-02T19:32:58Z
- **Completed:** 2026-04-02T19:37:00Z
- **Tasks:** 2
- **Files modified:** 5

## Accomplishments
- Created nl-tokenizer.ts module with Snowball Dutch stemmer that produces meaningful tokens instead of garbage substrings
- Replaced brute-force compound splitting (every position >= 8 chars) with conservative approach (word >= 10, parts >= 5, linking letters s/e)
- Raised similarity threshold from 0.20 to 0.35 as named constant, eliminating false positive clusters
- Full TDD: 15 unit tests covering tokenize, similarity, constants, compound splitting, abbreviations, stopwords, empty input

## Task Commits

Each task was committed atomically:

1. **Task 1: TDD -- Create nl-tokenizer module with Snowball stemmer** - `37f171c` (feat)
2. **Task 2: Wire din-service.ts to use nl-tokenizer + update thresholds** - `914047e` (feat)

## Files Created/Modified
- `src/lib/nl-tokenizer.ts` - Dutch tokenizer with Snowball stemmer, 101 stopwords, compound splitting, similarity function
- `src/lib/__tests__/nl-tokenizer.test.ts` - 15 unit tests for tokenizer, similarity, constants
- `src/lib/din-service.ts` - Removed old tokenizer (70 lines), imports from nl-tokenizer, uses SIMILARITY_THRESHOLD
- `package.json` - Added snowball-stemmers dependency
- `package-lock.json` - Updated lockfile

## Decisions Made
- Used snowball-stemmers (0.6.0, zero dependencies, ~30KB) over natural (13.8MB) -- 400x smaller for same Dutch stemming capability
- Snowball official Dutch stopwords (101 words) over hand-curated 33 or excessive 421 from stopwords-nl
- Threshold 0.35 as named constant for easy future tuning; tested with calibration cases
- Compound splitting conservative: min word 10, min part 5 -- prevents garbage tokens from short words like "onderwijs" (9 chars)
- Single-char linking letters (s, e) implemented; two-char (en) deferred to Phase 8 semantic matching if needed
- Substring bonus reduced from 0.08/0.25 to 0.05/0.20 since stemming handles most partial overlaps

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered

None.

## User Setup Required

None - no external service configuration required.

## Known Stubs

None - all functionality is fully wired and tested.

## Next Phase Readiness
- nl-tokenizer module is fully tested and wired into din-service.ts
- Cross-analyse cluster functions now use meaningful stems instead of garbage tokens
- Threshold is a named constant (SIMILARITY_THRESHOLD) ready for future tuning with real session data
- Phase 8 (semantic matching) can build on this foundation for embedding-based similarity

## Self-Check: PASSED

All files exist, all commits verified.

---
*Phase: 07-dutch-tokenizer-similarity*
*Completed: 2026-04-02*
