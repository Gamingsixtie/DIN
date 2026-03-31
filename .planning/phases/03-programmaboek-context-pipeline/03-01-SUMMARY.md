---
phase: 03-programmaboek-context-pipeline
plan: 01
subsystem: programmaboek-context-extraction
tags: [ai-context, programmaboek, extraction, prompt-assembly, word-extractor]
dependency_graph:
  requires: [docs/programmaboek.doc]
  provides: [src/lib/programmaboek-context.ts, src/lib/prompt-assembly.ts]
  affects: [src/lib/ai-client.ts, src/lib/prompts.ts]
tech_stack:
  added: [word-extractor@1.0.4, vitest@4.1.2, tsx@4.21.0]
  patterns: [build-time-extraction, static-context-constants, prompt-composition, sentence-boundary-truncation]
key_files:
  created:
    - scripts/extract-programmaboek.ts
    - src/lib/programmaboek-context.ts
    - src/lib/prompt-assembly.ts
    - scripts/__tests__/extract-programmaboek.test.ts
    - src/lib/__tests__/prompt-assembly.test.ts
    - vitest.config.ts
  modified:
    - package.json
    - package-lock.json
    - tsconfig.json
decisions:
  - word-extractor for .doc parsing (mammoth cannot handle binary OLE format)
  - Raw subsection extraction without AI selection (fallback path, AI key not required)
  - Scripts directory excluded from tsconfig for Next.js build compatibility
  - Generated programmaboek-context.ts committed to git for deploy-time availability
metrics:
  duration: 8min
  completed: "2026-03-31T21:25:00Z"
  tasks_completed: 2
  tasks_total: 2
  tests_added: 40
  files_changed: 9
---

# Phase 03 Plan 01: Programmaboek Context Extraction Summary

Build-time extraction of programmaboek.doc sections into 7 TypeScript constants, with prompt assembly functions mapping 10 AI use cases to their relevant methodology context.

## What Was Built

### Task 1: Build-time extraction script + generated programmaboek-context.ts

Created `scripts/extract-programmaboek.ts` that uses `word-extractor` (not mammoth -- mammoth cannot parse .doc binary OLE format) to extract text from `docs/programmaboek.doc` (768,872 chars, 414 pages). The script:

1. Extracts full text via `WordExtractor.extract()` / `doc.getBody()`
2. Splits by uppercase chapter headers (chapters 8, 9, 10, 11, 12, 17)
3. Extracts key subsections using "X.Y" numbering patterns (8.1, 8.5, 10.1, 10.4, 11.1, 11.3, 17.2)
4. Composes 7 named exports per use-case context budget
5. Writes `src/lib/programmaboek-context.ts` as generated TypeScript constants

Context sizes match research estimates:
| Constant | Chars | Est. Tokens |
|----------|-------|-------------|
| PROGRAMMABOEK_BATEN | 8,529 | ~2,132 |
| PROGRAMMABOEK_VERMOGENS | 10,124 | ~2,531 |
| PROGRAMMABOEK_INSPANNINGEN | 1,217 | ~304 |
| PROGRAMMABOEK_DIN | 3,452 | ~863 |
| PROGRAMMABOEK_BATENPROFIEL | 4,175 | ~1,044 |
| PROGRAMMABOEK_VERMOGENS_ASPECTEN | 5,909 | ~1,477 |
| PROGRAMMABOEK_CROSS_ANALYSE | 7,806 | ~1,952 |

### Task 2: Prompt assembly module with use-case mapping and truncation

Created `src/lib/prompt-assembly.ts` with:

- `ProgrammaboekUseCase` type: 10 string literal union covering all DIN AI calls
- `USE_CASE_CONTEXT_MAP`: fixed mapping per use case to programmaboek constants (D-03)
- `getContextForUseCase()`: returns the mapped context for a use case
- `truncateAtSentenceBoundary()`: cuts text at sentence boundaries (`. `, `.\n`, `? `, `! `) with 70% threshold fallback
- `assembleSystemPrompt()`: composes instruction prompt + ACHTERGRONDKENNIS header + programmaboek context + methodology reference instruction

Use-case mapping (D-03):
- din-mapping: DIN + BATEN + VERMOGENS
- baat-suggest/create: BATEN + BATENPROFIEL
- vermogen-suggest/create: VERMOGENS + VERMOGENS_ASPECTEN
- inspanning-suggest/create: INSPANNINGEN
- domain-recommend: VERMOGENS_ASPECTEN
- batenprofiel: BATENPROFIEL
- cross-analyse: CROSS_ANALYSE

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 3 - Blocking] Excluded scripts/ from tsconfig.json for Next.js build**
- **Found during:** Task 2 verification (npm run build)
- **Issue:** Next.js build failed with TypeScript error: word-extractor has no type declarations, and scripts/ was included in the build via `**/*.ts` glob
- **Fix:** Added `"scripts"` to tsconfig.json `exclude` array. Scripts run via tsx, not through Next.js build.
- **Files modified:** tsconfig.json
- **Commit:** d39027f

## Decisions Made

1. **word-extractor over mammoth:** mammoth cannot parse .doc binary OLE format (pitfall 1 from research). word-extractor 1.0.4 confirmed working.
2. **Raw subsection extraction (D-07 fallback):** AI-based selection skipped as ANTHROPIC_API_KEY may not be available at build time. Raw subsections are within token budget targets.
3. **Generated file committed to git:** Per research recommendation -- app works without .doc at deploy time.
4. **Scripts excluded from Next.js build:** Build-time scripts use word-extractor which lacks type declarations; excluded to prevent build failures.

## Test Coverage

- 12 tests for extraction (word-extractor reading, chapter headers, splitting, generated exports)
- 28 tests for prompt assembly (all 10 use cases, truncation, composition, ACHTERGRONDKENNIS header)
- Total: 40 tests, all passing
- `npm run build` succeeds

## Known Stubs

None -- all constants contain actual programmaboek content extracted from the source document.

## What's Next

Plan 02 will wire `assembleSystemPrompt` into the existing API routes (`din-mapping`, `din-suggest`, `cross-analyse`, etc.) by replacing direct prompt constant usage with composed system prompts that include programmaboek context.

## Self-Check: PASSED

All 6 created files verified on disk. Both commit hashes (ff1cf9f, d39027f) verified in git log. 40 tests passing. Build succeeds.
