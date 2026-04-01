---
phase: 03-programmaboek-context-pipeline
verified: 2026-03-31T17:16:00Z
status: passed
score: 7/7 must-haves verified
re_verification: false
human_verification:
  - test: "Programmaboek-context inhoud klopt met bronmateriaal"
    expected: "De 7 geextraheerde constanten in src/lib/programmaboek-context.ts bevatten accurate methodiek-tekst uit het programmaboek (Prevaas & Van Loon). Instructielaag in prompts.ts is complementair aan de kennislaag — geen tegenspraken bij batenprofiel (Ch 8.5), vermogens 6-aspecten (Ch 10.4), inspanningendossier (Ch 11.3)"
    result: "APPROVED — user reviewed programmaboek-context.ts against KiB MT Presentatie and prompts.ts. 4 domeinen (Mens, Proces, Systeem, Cultuur) uit presentatie sluiten aan op 6 aspecten uit programmaboek. Geen tegenstrijdigheden. Cito-specifieke invullingen zijn complementair aan de theoretische basis."
    verified_at: "2026-04-01"
---

# Phase 3: Programmaboek Context Pipeline Verification Report

**Phase Goal:** AI-prompts bevatten relevante methodiek-context uit het programmaboek
**Verified:** 2026-03-31T17:16:00Z
**Status:** human_needed
**Re-verification:** No — initial verification

## Goal Achievement

### Observable Truths

| # | Truth | Status | Evidence |
|---|-------|--------|----------|
| 1 | Programmaboek tekst is geextraheerd en opgeslagen als TypeScript constanten per sectie | VERIFIED | `src/lib/programmaboek-context.ts` bestaat, 42,426 bytes, 7 named exports (BATEN, VERMOGENS, INSPANNINGEN, DIN, BATENPROFIEL, VERMOGENS_ASPECTEN, CROSS_ANALYSE), all non-empty substantive text from the programmaboek |
| 2 | Prompt assembly functie combineert bestaande instructie-prompt met programmaboek-context | VERIFIED | `assembleSystemPrompt()` in `src/lib/prompt-assembly.ts` composes instructionPrompt + ACHTERGRONDKENNIS header + context + methodology reference instruction. 28 tests all pass |
| 3 | Context truncation respecteert zinsgrenzen (geen afkapping midden in een zin) | VERIFIED | `truncateAtSentenceBoundary()` implemented and tested: finds last `. `, `.\n`, `? `, `! ` boundary within 70% threshold, falls back to hard cut. Tests confirm no mid-sentence cut |
| 4 | Per AI use case is een vaste sectie-mapping bepaald (D-03) | VERIFIED | `USE_CASE_CONTEXT_MAP` in prompt-assembly.ts maps all 10 use cases: din-mapping (DIN+BATEN+VERMOGENS), baat-suggest/create (BATEN+BATENPROFIEL), vermogen-suggest/create (VERMOGENS+VERMOGENS_ASPECTEN), inspanning-suggest/create (INSPANNINGEN), domain-recommend (VERMOGENS_ASPECTEN), batenprofiel (BATENPROFIEL), cross-analyse (CROSS_ANALYSE) |
| 5 | Bij het genereren van baten bevat de AI system prompt de relevante programmaboek-sectie over batenprofielen | VERIFIED | `din-suggest/route.ts` wraps baat-create and baat-suggest prompts with `assembleSystemPrompt(..., "baat-create")` and `assembleSystemPrompt(..., "baat-suggest")` which inject BATEN + BATENPROFIEL |
| 6 | Bij het genereren van vermogens bevat de AI system prompt de vermogens-definitie uit het programmaboek | VERIFIED | `din-suggest/route.ts` wraps vermogen-create and vermogen-suggest prompts with VERMOGENS + VERMOGENS_ASPECTEN context |
| 7 | Bij het genereren van inspanningen bevat de AI system prompt het inspanningendossier uit het programmaboek | VERIFIED | `din-suggest/route.ts` wraps inspanning-create and inspanning-suggest prompts with INSPANNINGEN context |
| 8 | Bij cross-analyse bevat de AI system prompt de DIN-samenhang context uit het programmaboek | VERIFIED | `cross-analyse/route.ts` line 197: `assembleSystemPrompt(CROSS_ANALYSE_PROMPT, "cross-analyse")` for the default cross-analyse block |
| 9 | Export-generatie en sectorplan-analyse krijgen GEEN extra programmaboek-context (D-11) | VERIFIED | `SECTOR_INTEGRATIE_PROMPT` at line 174 used directly without assembleSystemPrompt; `generateVerrijktSectorplan` block unchanged; `src/app/api/export/route.ts` has no assembleSystemPrompt import |
| 10 | DIN-mapping endpoint bevat programmaboek-context in system prompt | VERIFIED | `din-mapping/route.ts` line 104: `assembleSystemPrompt(DIN_MAPPING_PROMPT, "din-mapping")` — injects DIN + BATEN + VERMOGENS context |

**Score:** 10/10 truths verified (7 derived from must_haves in PLAN frontmatter, 3 from ROADMAP success criteria)

### Required Artifacts

| Artifact | Expected | Status | Details |
|----------|----------|--------|---------|
| `scripts/extract-programmaboek.ts` | Build-time extractie script dat word-extractor gebruikt | VERIFIED | Exists, contains `new WordExtractor()`, `doc.getBody()`, chapter marker "DOELEN EN BATEN IDENTIFICEREN" |
| `src/lib/programmaboek-context.ts` | TypeScript constanten met 7 programmaboek-secties | VERIFIED | 42,426 bytes, 247 lines, all 7 exports present with substantive content |
| `src/lib/prompt-assembly.ts` | Prompt-assembly functions met use-case mapping | VERIFIED | Exports: `assembleSystemPrompt`, `getContextForUseCase`, `truncateAtSentenceBoundary`, `ProgrammaboekUseCase` type |
| `src/lib/__tests__/prompt-assembly.test.ts` | Unit tests voor prompt assembly (min 50 lines) | VERIFIED | 189 lines, 28 tests, all passing |
| `scripts/__tests__/extract-programmaboek.test.ts` | Unit tests voor extractie script (min 20 lines) | VERIFIED | 116 lines, 12 tests, all passing |
| `src/app/api/din-mapping/route.ts` | DIN-mapping endpoint met assembleSystemPrompt | VERIFIED | Import present (line 5), call at line 104 |
| `src/app/api/din-suggest/route.ts` | DIN-suggest endpoint met assembleSystemPrompt per type | VERIFIED | Import present (line 18), used in domain-recommend (line 78), create mode (line 154), suggest mode (line 273) |
| `src/app/api/cross-analyse/route.ts` | Cross-analyse endpoint met assembleSystemPrompt | VERIFIED | Import present (line 6), call at line 197 for default cross-analyse block only |

### Key Link Verification

| From | To | Via | Status | Details |
|------|----|-----|--------|---------|
| `scripts/extract-programmaboek.ts` | `docs/programmaboek.doc` | `word-extractor .extract()` | VERIFIED | `extractor.extract` present; extraction tests confirm >100,000 chars extracted |
| `src/lib/prompt-assembly.ts` | `src/lib/programmaboek-context.ts` | import constants | VERIFIED | `import { PROGRAMMABOEK_BATEN, ... } from "./programmaboek-context"` at lines 13-21 |
| `src/lib/prompt-assembly.ts` | `src/lib/prompts.ts` | import existing prompt constants | NOT WIRED (by design) | `prompt-assembly.ts` does NOT import from `prompts.ts` — prompts are passed as parameters to `assembleSystemPrompt()` at the call site. This is the correct implementation pattern; the link in the plan was a design intent superseded by parameter-injection. Not a gap. |
| `src/app/api/din-mapping/route.ts` | `src/lib/prompt-assembly.ts` | import assembleSystemPrompt | VERIFIED | `import { assembleSystemPrompt } from "@/lib/prompt-assembly"` line 5 |
| `src/app/api/din-suggest/route.ts` | `src/lib/prompt-assembly.ts` | import assembleSystemPrompt | VERIFIED | `import { assembleSystemPrompt, type ProgrammaboekUseCase } from "@/lib/prompt-assembly"` line 18 |
| `src/app/api/cross-analyse/route.ts` | `src/lib/prompt-assembly.ts` | import assembleSystemPrompt | VERIFIED | `import { assembleSystemPrompt } from "@/lib/prompt-assembly"` line 6 |

### Data-Flow Trace (Level 4)

The phase produces a library module (`prompt-assembly.ts`) and modifies API routes — no user-facing rendering components. Data flow is:

| Artifact | Data Variable | Source | Produces Real Data | Status |
|----------|---------------|--------|-------------------|--------|
| `programmaboek-context.ts` | PROGRAMMABOEK_* constants | `scripts/extract-programmaboek.ts` reading `docs/programmaboek.doc` | Yes — 42,426 chars of actual programmaboek text confirmed by extraction tests | FLOWING |
| `prompt-assembly.ts` | assembled system prompt | USE_CASE_CONTEXT_MAP + instructionPrompt parameter | Yes — constants are non-empty strings injected into callClaudeWithValidation | FLOWING |
| `din-mapping/route.ts` | systemPrompt | `assembleSystemPrompt(DIN_MAPPING_PROMPT, "din-mapping")` | Yes — DIN_MAPPING_PROMPT is non-empty, context map returns real text | FLOWING |
| `din-suggest/route.ts` | systemPrompt (3 modes) | `assembleSystemPrompt(promptMap[type], useCaseMap[type])` | Yes — all prompt constants and use case contexts are non-empty | FLOWING |
| `cross-analyse/route.ts` | systemPrompt | `assembleSystemPrompt(CROSS_ANALYSE_PROMPT, "cross-analyse")` | Yes — CROSS_ANALYSE_PROMPT is non-empty, context returns CROSS_ANALYSE constant | FLOWING |

### Behavioral Spot-Checks

| Behavior | Command | Result | Status |
|----------|---------|--------|--------|
| prompt-assembly tests pass | `npx vitest run src/lib/__tests__/prompt-assembly.test.ts` | 28/28 tests passed | PASS |
| extraction tests pass | `npx vitest run scripts/__tests__/extract-programmaboek.test.ts` | 12/12 tests passed | PASS |
| full test suite no regressions | `npx vitest run --exclude '.claude/**'` | 92/92 tests passed (7 test files) | PASS |
| TypeScript build succeeds | `npm run build` | Build succeeded, no errors or warnings | PASS |
| assembleSystemPrompt produces ACHTERGRONDKENNIS header | verified in tests | test "contains ACHTERGRONDKENNIS header" passes | PASS |
| SECTOR_INTEGRATIE_PROMPT excluded from context (D-11) | grep check | Line 174: `SECTOR_INTEGRATIE_PROMPT` used directly, no assembleSystemPrompt wrapper | PASS |
| export route excluded from context (D-11) | grep check | No assembleSystemPrompt import in export/route.ts | PASS |

### Requirements Coverage

| Requirement | Source Plan | Description | Status | Evidence |
|-------------|------------|-------------|--------|----------|
| AI-01 | 03-01-PLAN.md, 03-02-PLAN.md | Relevante secties uit docs/programmaboek.doc worden als context meegegeven aan alle AI-prompts | SATISFIED | All 3 DIN-related AI API routes (din-mapping, din-suggest, cross-analyse) now call `assembleSystemPrompt()` which appends relevant programmaboek sections to every AI system prompt. The 10 use cases cover all DIN generation scenarios. Build passes, 92 tests pass. |

No orphaned requirements — only AI-01 is mapped to Phase 3 in REQUIREMENTS.md, and both plans in this phase claim AI-01.

### Anti-Patterns Found

| File | Line | Pattern | Severity | Impact |
|------|------|---------|----------|--------|
| None found | - | - | - | - |

No TODO/FIXME comments, no empty implementations, no hardcoded empty data arrays in the modified/created files.

### Human Verification Required

#### 1. D-06: Review programmaboek-tekst nauwkeurigheid en prompt-boek afstemming

**Test:** Open `src/lib/programmaboek-context.ts` en vergelijk elk geexporteerd constant met het bronmateriaal in `docs/programmaboek.doc`:

1. Vergelijk `PROGRAMMABOEK_DIN` (sectie 11.1) met `DIN_MAPPING_PROMPT` in `src/lib/prompts.ts` — zijn de DIN-definitie en de doelen→baten→vermogens→inspanningen keten consistent?
2. Vergelijk `PROGRAMMABOEK_BATENPROFIEL` (sectie 8.5) met de batenprofiel-velden in `DIN_SUGGEST_BAAT_PROMPT` — zijn de veldnamen en beschrijvingen complementair (niet tegenstrijdig)?
3. Vergelijk `PROGRAMMABOEK_VERMOGENS` + `PROGRAMMABOEK_VERMOGENS_ASPECTEN` (secties 10.1 + 10.4) met `DIN_SUGGEST_VERMOGEN_PROMPT` — zijn de 6 aspecten consistent beschreven?
4. Vergelijk `PROGRAMMABOEK_INSPANNINGEN` (sectie 11.3) met `DIN_SUGGEST_INSPANNING_PROMPT` — zijn de inspanningendossier-velden consistent?

**Expected:** Programmaboek-secties bevatten accurate methodiek-tekst. Instructielaag in prompts.ts is complementair aan kennislaag — geen tegenspraken. Eventuele discrepanties zijn input voor Phase 4 (AI Output Kwaliteit).

**Optioneel: live test:**
- Start `npm run dev`
- Navigeer naar een sessie met een doel en sector
- Klik "DIN-mapping genereren" voor een doel
- Verifieer dat de gegenereerde baten/vermogens/inspanningen methodiek-concepten uit het programmaboek bevatten (vergrotende trap voor baten, werkwoorden voor vermogens, concrete activiteiten voor inspanningen)

**Why human:** Tekstuele vergelijking met brondocument en beoordeling van inhoudelijke complementariteit vereist methodiek-kennis en menselijk oordeel. Dit is de D-06 checkpoint die in de SUMMARY als "AWAITING HUMAN VERIFICATION" is gemarkeerd.

**Resume-signaal:** Typ "approved" als de programmaboek-context nauwkeurig is en de prompts complementair zijn. Als er discrepanties zijn, beschrijf ze — die worden aangepakt in Phase 4.

### Gaps Summary

Geen technische gaps gevonden. Alle automated checks slagen:

- 7 artifacts aangemaakt/gemodificeerd per plan
- Alle 10 use cases hebben een vaste programmaboek-sectie mapping
- Alle 3 API routes gebruiken `assembleSystemPrompt`
- D-11 exclusies correct toegepast (sector-integratie, verrijkt-sectorplan, export ongewijzigd)
- 92 tests passing, build succeeds

De enige openstaande actie is de menselijke D-06 checkpoint: inhoudelijke verificatie of de geextraheerde programmaboek-tekst overeenkomt met het bronmateriaal en complementair is aan de bestaande prompt-instructies.

De planlink `prompt-assembly.ts → prompts.ts` uit het PLAN-frontmatter is niet geimplementeerd als directe import maar als parameter-injection — dit is een betere implementatie dan het plan beschreef en geen gap.

---

_Verified: 2026-03-31T17:16:00Z_
_Verifier: Claude (gsd-verifier)_
