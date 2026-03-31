# Phase 3: Programmaboek Context Pipeline - Research

**Researched:** 2026-03-31
**Domain:** Text extraction from .doc binary format, AI prompt engineering with domain-specific context injection
**Confidence:** HIGH

## Summary

This phase creates a build-time pipeline that extracts relevant sections from the 28MB programmaboek (414 pages, 123,150 words, binary .doc format) and injects them as methodiek-context into AI system prompts. The critical discovery during research is that **mammoth.js cannot parse .doc files** -- it only supports .docx. The project needs `word-extractor` (v1.0.4, already installed as devDependency) which successfully extracts 768,872 characters of clean text from the binary OLE format.

The programmaboek has clear chapter structure with uppercase chapter headers (e.g., "DOELEN EN BATEN IDENTIFICEREN") that can be used as splitting markers. The three most relevant chapters total ~77,000 characters (~19,000 tokens): Chapter 8 (Doelen en Baten, ~6,000 tokens), Chapter 10 (Vermogens, ~7,300 tokens), and Chapter 11 (Samenhang/DIN, ~5,900 tokens). Specific subsections like the batenprofiel definition (680 tokens) and inspanningendossier (305 tokens) are compact enough to include in full per AI call.

**Primary recommendation:** Create a one-time build script that uses `word-extractor` to extract the programmaboek text, split it by uppercase chapter headers, then use AI to select and compress the most relevant passages per use case. Store results as TypeScript constants in `src/lib/programmaboek-context.ts` that are imported into each prompt's system message.

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions
- **D-01:** Build-time extractie -- tekst wordt eenmalig uit `docs/programmaboek.doc` gehaald met mammoth en opgeslagen als importeerbare secties in de codebase. Geen runtime parsing van het 28MB .doc bestand.
  - RESEARCH NOTE: mammoth cannot parse .doc files. Must use `word-extractor` instead. The intent (build-time, no runtime parsing) is preserved.
- **D-02:** Opslagformaat wordt bepaald door Claude (TypeScript constanten of JSON) -- zolang het per sectie importeerbaar is.
- **D-03:** Vaste mapping per AI use case -- elke AI-aanroep (baten-generatie, vermogens-generatie, etc.) krijgt een vooraf bepaalde programmaboek-sectie. Geen runtime keyword-matching of AI-selectie.
- **D-04:** De researcher-agent leest het programmaboek, identificeert de hoofdstukstructuur, en stelt de mapping voor. De gebruiker reviewt en keurt de mapping goed voordat deze wordt geimplementeerd.
- **D-05:** Programmaboek-context wordt geplaatst in de system prompt, als achtergrondkennis voor Claude. Dit past bij de rol "je kent de methodiek".
- **D-06:** Bestaande handgeschreven methodiek-uitleg in `src/lib/prompts.ts` wordt gecontroleerd tegen het programmaboek. Afwijkingen worden als voorstel aan de gebruiker voorgelegd voor handmatige goedkeuring. Correcte uitleg blijft als instructielaag naast de programmaboek-referentie.
- **D-07:** Build-time AI-selectie -- eenmalig een AI-analyse die het hele boek leest, de bestaande prompts/framework bekijkt, en per use case precies de relevante passages selecteert. Dit is een voorbereide kennisbank, geen dynamische retrieval.
- **D-08:** De theorie is statisch -- het programmaboek verandert niet. De kwaliteit zit in het toepassen van het juiste deel op het juiste moment. Build-time selectie is daarom voldoende.
- **D-09:** Primair: DIN-mapping (generateDINMapping, din-suggest, din-create, batenprofiel). Alle momenten waarop baten, vermogens of inspanningen worden gegenereerd of aangescherpt.
- **D-10:** Secundair: cross-analyse -- programmaboek-context voor theoretische toetsing op uitvoerbaarheid van resultaten.
- **D-11:** Buiten scope: export-generatie en sectorplan-analyse krijgen geen extra programmaboek-context.

### Claude's Discretion
- Exact opslagformaat voor geextraheerde secties (TypeScript constanten vs JSON)
- Structuur van het build-time extractie-script
- Implementatie van de zinsgrenzen-logica als fallback bij te lange secties
- Hoe de system prompt precies wordt samengesteld (volgorde van instructies + context)

### Deferred Ideas (OUT OF SCOPE)
None -- discussion stayed within phase scope
</user_constraints>

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|------------------|
| AI-01 | Relevante secties uit docs/programmaboek.doc worden als context meegegeven aan alle AI-prompts | Build-time extraction pipeline with `word-extractor`, chapter splitting by uppercase headers, per-use-case context mapping stored as TS constants, system prompt injection via `callClaude`/`callClaudeWithValidation` |
</phase_requirements>

## Standard Stack

### Core
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| word-extractor | 1.0.4 | Extract text from .doc binary (OLE) format | Only pure-JS library that handles legacy .doc; mammoth cannot parse .doc files |
| typescript | 5.8.0 | Type-safe constants for extracted sections | Project standard |

### Supporting
| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| mammoth | 1.11.0 | Already installed but NOT for .doc extraction | Only for .docx files (sector plans, KiB imports) |
| vitest | 4.1.2 | Testing extraction and context assembly logic | Already configured in project |

### Alternatives Considered
| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| word-extractor | LibreOffice CLI conversion | Requires external binary, not available on this machine |
| word-extractor | officeparser | Less focused on .doc; word-extractor is proven for OLE binary format |
| TypeScript constants | JSON files | TS constants get type-checked and tree-shaken; JSON needs runtime import |

**Installation:**
```bash
# word-extractor already installed as devDependency
npm ls word-extractor  # 1.0.4 confirmed
```

**Version verification:** word-extractor 1.0.4 (latest on npm, confirmed 2026-03-31). Already in devDependencies.

## Architecture Patterns

### Recommended Project Structure
```
src/
├── lib/
│   ├── prompts.ts                    # Existing: prompt constants (MODIFIED: compose with context)
│   ├── programmaboek-context.ts      # NEW: extracted chapter sections as TS constants
│   ├── prompt-assembly.ts            # NEW: functions to compose system prompt + context
│   └── ai-client.ts                  # Existing: callClaude (MODIFIED: use assembled prompts)
scripts/
└── extract-programmaboek.ts          # NEW: one-time build script
```

### Pattern 1: Build-Time Text Extraction
**What:** A Node.js script that runs once (or on demand) to extract text from the .doc file, split into chapters, and write TypeScript constants.
**When to use:** When the programmaboek content needs to be refreshed (rarely -- the theory is static per D-08).
**Example:**
```typescript
// scripts/extract-programmaboek.ts
import WordExtractor from "word-extractor";
import * as fs from "fs";
import * as path from "path";

const CHAPTER_HEADERS = [
  { key: "ch8_doelen_baten", marker: "DOELEN EN BATEN IDENTIFICEREN" },
  { key: "ch9_veranderstrategie", marker: "DE (VERANDER)STRATEGIE FORMULEREN" },
  { key: "ch10_vermogens", marker: "DE BENODIGDE VERMOGENS UITWERKEN" },
  { key: "ch11_samenhang_din", marker: "OVERZICHT EN SAMENHANG AANBRENGEN" },
  { key: "ch12_rollen", marker: "ROLLEN DEFINIËREN EN VERDELEN" },
];

async function extract() {
  const extractor = new WordExtractor();
  const doc = await extractor.extract(path.join(__dirname, "../docs/programmaboek.doc"));
  const body = doc.getBody();

  // Split by uppercase chapter headers
  const sections: Record<string, string> = {};
  for (let i = 0; i < CHAPTER_HEADERS.length; i++) {
    const start = body.indexOf(CHAPTER_HEADERS[i].marker);
    const end = i + 1 < CHAPTER_HEADERS.length
      ? body.indexOf(CHAPTER_HEADERS[i + 1].marker)
      : body.length;
    sections[CHAPTER_HEADERS[i].key] = body.substring(start, end).trim();
  }

  // Write as TypeScript constants
  // ... generate programmaboek-context.ts
}
```

### Pattern 2: Per-Use-Case Context Mapping (Static)
**What:** A fixed mapping that determines which programmaboek section(s) each AI function receives.
**When to use:** Every AI call that generates or refines DIN items.
**Example:**
```typescript
// src/lib/programmaboek-context.ts (generated)
export const PROGRAMMABOEK_BATEN = `...extracted batenprofiel section...`;
export const PROGRAMMABOEK_VERMOGENS = `...extracted vermogens section...`;
export const PROGRAMMABOEK_DIN = `...extracted DIN/samenhang section...`;
export const PROGRAMMABOEK_INSPANNINGEN = `...extracted inspanningendossier section...`;
```

### Pattern 3: System Prompt Composition
**What:** A function that combines the existing handwritten prompt instructions with programmaboek context.
**When to use:** In every AI call that needs methodology backing.
**Example:**
```typescript
// src/lib/prompt-assembly.ts
export function assembleSystemPrompt(
  instructionPrompt: string,
  methodiekContext: string
): string {
  return `${instructionPrompt}

---
ACHTERGRONDKENNIS UIT HET PROGRAMMABOEK (Prevaas & Van Loon):
${methodiekContext}
---

Gebruik deze methodiek-kennis als referentie bij het genereren van je antwoord.`;
}
```

### Anti-Patterns to Avoid
- **Runtime .doc parsing:** The file is 28MB and takes several seconds to parse. Never parse at request time.
- **Sending full chapters as context:** Chapter 8 alone is ~6,000 tokens. Select relevant subsections, not entire chapters.
- **Replacing handwritten prompts with book text:** The book explains concepts; the prompts give instructions. These are complementary layers (per D-06).
- **Dynamic AI-based section selection at runtime:** Build-time selection is the decision (D-07). No retrieval pipeline needed.

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| .doc text extraction | Custom OLE parser | `word-extractor` v1.0.4 | OLE binary format is complex; word-extractor handles it cleanly |
| Token counting | Character-based estimation | Approximate with chars/4 for Dutch | Exact token counting needs tiktoken which adds dependency; rough estimation is sufficient for build-time budgeting |
| Sentence boundary detection | Regex-based splitter | Split on `. ` followed by uppercase or newline | Dutch sentence boundaries are straightforward; no NLP library needed for this static text |

**Key insight:** The programmaboek is static reference material. The entire extraction and selection pipeline runs once. Runtime complexity should be zero -- just import constants.

## Common Pitfalls

### Pitfall 1: mammoth Cannot Parse .doc Files
**What goes wrong:** The CONTEXT.md mentions using mammoth for extraction (D-01), but mammoth only handles .docx (Open XML), not .doc (binary OLE).
**Why it happens:** The project already uses mammoth for .docx files, so it's natural to assume it handles .doc too.
**How to avoid:** Use `word-extractor` (already installed as devDependency) which explicitly supports both .doc (OLE) and .docx formats.
**Warning signs:** Error "Could not find the body element: are you sure this is a docx file?" from mammoth.

### Pitfall 2: Context Window Overflow
**What goes wrong:** Adding full chapters to system prompts pushes total prompt size beyond effective limits, causing degraded AI output quality.
**Why it happens:** The three relevant chapters total ~19,000 tokens. Combined with existing prompts (500-800 tokens each) and user messages (can be 3,000+ tokens with sectorplan data), this risks exceeding the sweet spot for Claude's context utilization.
**How to avoid:** Pre-select focused subsections per use case. Budget ~1,000-2,000 tokens of programmaboek context per AI call. The batenprofiel definition is only 680 tokens; the inspanningendossier is only 305 tokens. Use targeted excerpts, not full chapters.
**Warning signs:** AI responses become more generic or miss specific instructions from the prompt.

### Pitfall 3: Duplicate Methodology Instructions
**What goes wrong:** The existing prompts already contain handwritten methodology explanations (e.g., DIN_MAPPING_PROMPT has 733 tokens of methodology). Adding book text creates contradiction or redundancy.
**Why it happens:** The prompts were written from the same source material.
**How to avoid:** Per D-06, compare existing prompt text against the book. Keep the prompt as the "instruction layer" (what to DO) and the book text as the "knowledge layer" (WHY and WHAT the concepts mean). Flag discrepancies for user review.
**Warning signs:** AI output includes verbatim book language instead of following prompt formatting instructions.

### Pitfall 4: Table of Contents Pollution
**What goes wrong:** The programmaboek text starts with a ~12,000 character table of contents that gets included in extracted sections.
**Why it happens:** The TOC is at positions 0-12585 in the extracted text, before actual content starts at the "Voorwoord".
**How to avoid:** Start extraction after the TOC. Use uppercase chapter headers (e.g., "DOELEN EN BATEN IDENTIFICEREN" at position 176549) to find actual chapter content, not TOC entries.
**Warning signs:** Extracted text is very short or consists of heading lines without body text.

### Pitfall 5: Build Script Not Idempotent
**What goes wrong:** Running the extraction script multiple times produces different outputs or corrupts the generated file.
**Why it happens:** If the script appends instead of overwrites, or generates non-deterministic IDs.
**How to avoid:** The script should always overwrite the output file completely. Generated TypeScript should be deterministic given the same input.
**Warning signs:** Git diff shows changes in the generated file when re-running without changing the source.

## Code Examples

Verified patterns from existing codebase:

### Existing word-extractor Usage (verified working)
```typescript
// Tested successfully during research -- extracts 768,872 chars from programmaboek.doc
const WordExtractor = require("word-extractor");
const extractor = new WordExtractor();
const doc = await extractor.extract("docs/programmaboek.doc");
const body = doc.getBody(); // Returns full text as string
```

### Existing callClaude System Prompt Pattern
```typescript
// Source: src/lib/ai-client.ts line 27-43
async function callClaude(
  systemPrompt: string,      // <-- programmaboek context goes here
  userMessage: string,
  maxTokens?: number,
  model: "claude-sonnet-4-6" | "claude-opus-4-6" = "claude-sonnet-4-6"
): Promise<string> {
  const client = getClient();
  const response = await client.messages.create({
    model,
    max_tokens: maxTokens || 4096,
    system: systemPrompt,    // <-- single string, not array
    messages: [{ role: "user", content: userMessage }],
  });
  // ...
}
```

### Existing Prompt Import Pattern
```typescript
// Source: src/app/api/din-mapping/route.ts line 4
import { DIN_MAPPING_PROMPT } from "@/lib/prompts";
// Used as: callClaudeWithValidation(schema, DIN_MAPPING_PROMPT, userMessage)
```

### Sentence-Boundary Truncation (for fallback)
```typescript
// Token-aware truncation that never cuts mid-sentence
function truncateAtSentenceBoundary(text: string, maxChars: number): string {
  if (text.length <= maxChars) return text;
  const truncated = text.substring(0, maxChars);
  const lastSentenceEnd = Math.max(
    truncated.lastIndexOf(". "),
    truncated.lastIndexOf(".\n"),
    truncated.lastIndexOf("?\n"),
    truncated.lastIndexOf("!\n")
  );
  return lastSentenceEnd > maxChars * 0.7
    ? truncated.substring(0, lastSentenceEnd + 1)
    : truncated;
}
```

## Programmaboek Chapter Structure (Research Finding)

### Document Metrics
- **File:** `docs/programmaboek.doc` (Composite Document File V2, OLE format)
- **Size:** 28,621,312 bytes (28MB)
- **Pages:** 414
- **Words:** 123,150
- **Characters:** 677,326
- **Extracted text length:** 768,872 characters
- **Author:** Bjorn Prevaas & Niels van Loon
- **Title:** "Werken aan Programmas"

### Chapter Map (positions in extracted text)
| Chapter | Title | Start Pos | Size (chars) | Est. Tokens |
|---------|-------|-----------|-------------|-------------|
| 8 | DOELEN EN BATEN IDENTIFICEREN | 176,549 | 24,175 | ~6,044 |
| 9 | DE (VERANDER)STRATEGIE FORMULEREN | 200,724 | 22,904 | ~5,726 |
| 10 | DE BENODIGDE VERMOGENS UITWERKEN | 223,628 | 29,198 | ~7,300 |
| 11 | OVERZICHT EN SAMENHANG AANBRENGEN | 252,826 | 23,586 | ~5,897 |
| 17 | ZORGEN VOOR DOELTREFFENDHEID | 398,284 | ~12,000 | ~3,000 |

### Key Subsections for Context Injection
| Section | Topic | Size (chars) | Est. Tokens | Use Case |
|---------|-------|-------------|-------------|----------|
| 8.5 (partial) | Batenprofiel definitie + voorbeeld | ~2,720 | ~680 | Baten generatie, suggest, create |
| 8.1 | Wat zijn doelen en baten? | ~3,000 | ~750 | DIN-mapping, baten context |
| 10.1 | Wat zijn vermogens? | ~2,500 | ~625 | Vermogens generatie |
| 10.4 | Waaruit vermogens opgebouwd (6 aspecten) | ~5,910 | ~1,478 | Vermogens suggest/create |
| 11.1 | Doelen-inspanningennetwerk (DIN) | ~3,453 | ~863 | Cross-analyse, DIN-mapping |
| 11.3 | Inspanningendossier | ~1,218 | ~305 | Inspanningen generatie |
| 17.2 | Baten managen | ~3,000 | ~750 | Batenprofiel, cross-analyse |

### Proposed Use-Case to Section Mapping
| AI Use Case | Prompt Constant | Programmaboek Sections | Budget |
|-------------|----------------|----------------------|--------|
| DIN-mapping (full) | `DIN_MAPPING_PROMPT` | 8.1 (doelen/baten def) + 11.1 (DIN) + 10.1 (vermogens def) | ~2,200 tokens |
| Baat suggest/create | `DIN_SUGGEST_BAAT_PROMPT`, `DIN_CREATE_BAAT_PROMPT` | 8.5 (batenprofiel) + 8.1 (baten def) | ~1,400 tokens |
| Vermogen suggest/create | `DIN_SUGGEST_VERMOGEN_PROMPT`, `DIN_CREATE_VERMOGEN_PROMPT` | 10.1 + 10.4 (vermogens + 6 aspecten) | ~2,100 tokens |
| Inspanning suggest/create | `DIN_SUGGEST_INSPANNING_PROMPT`, `DIN_CREATE_INSPANNING_PROMPT` | 11.3 (inspanningendossier) | ~305 tokens |
| Domein-aanbeveling | `DIN_DOMAIN_RECOMMEND_PROMPT` | 10.4 (6 aspecten van vermogens) | ~1,478 tokens |
| Batenprofiel | `BATENPROFIEL_PROMPT` | 8.5 (batenprofiel voorbeeld) | ~680 tokens |
| Cross-analyse | `CROSS_ANALYSE_PROMPT` | 11.1 (DIN) + 8.1 (baten) | ~1,600 tokens |

### Existing Prompt Sizes (for budget calculation)
| Prompt | Current Size | + Context | Total Budget |
|--------|-------------|-----------|-------------|
| DIN_MAPPING_PROMPT | ~733 tokens | +2,200 | ~2,933 tokens |
| DIN_SUGGEST_BAAT_PROMPT | ~696 tokens | +1,400 | ~2,096 tokens |
| DIN_SUGGEST_VERMOGEN_PROMPT | ~615 tokens | +2,100 | ~2,715 tokens |
| DIN_SUGGEST_INSPANNING_PROMPT | ~619 tokens | +305 | ~924 tokens |
| DIN_CREATE_BAAT_PROMPT | ~298 tokens | +1,400 | ~1,698 tokens |
| DIN_CREATE_VERMOGEN_PROMPT | ~261 tokens | +2,100 | ~2,361 tokens |
| DIN_CREATE_INSPANNING_PROMPT | ~642 tokens | +305 | ~947 tokens |
| DIN_DOMAIN_RECOMMEND_PROMPT | ~435 tokens | +1,478 | ~1,913 tokens |
| BATENPROFIEL_PROMPT | ~136 tokens | +680 | ~816 tokens |
| CROSS_ANALYSE_PROMPT | ~808 tokens | +1,600 | ~2,408 tokens |

All totals well within Claude's context budget. The largest (DIN_MAPPING_PROMPT at ~2,933 tokens system prompt) still leaves ample room for user messages that can include sectorplan data (up to 3,000-5,000 chars).

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| Handwritten methodology summaries in prompts | Book excerpts + handwritten instructions (complementary layers) | This phase | AI output backed by authoritative source |
| mammoth for .doc extraction | word-extractor for .doc, mammoth for .docx | Discovered during research | mammoth cannot handle binary OLE format |

**Deprecated/outdated:**
- mammoth for .doc files: Never supported this format. Use word-extractor instead.

## Open Questions

1. **Exact subsection boundaries**
   - What we know: Chapters use uppercase headers; subsections use "X.Y" numbering. The extracted text preserves these markers.
   - What's unclear: The exact character positions of every subsection boundary need to be mapped by the extraction script or during build-time AI analysis.
   - Recommendation: The extraction script should split by both chapter headers and subsection numbers, then the AI-selection step (D-07) picks the best passages per use case.

2. **Discrepancies between prompts and book**
   - What we know: Existing prompts reference "Wijnen & Van der Tak (2002)" and contain methodology summaries. The book is "Prevaas & Van Loon" which builds on that work.
   - What's unclear: Whether there are actual contradictions or just different emphasis.
   - Recommendation: Per D-06, the comparison is a human-review step. The planner should include a task that surfaces these differences for the user to approve.

3. **word-extractor as devDependency**
   - What we know: word-extractor is currently in devDependencies. The build-time script only runs during development.
   - What's unclear: Whether the generated TypeScript file should be committed to git or regenerated.
   - Recommendation: Commit the generated `programmaboek-context.ts` to git. The extraction script is a development-only tool. This ensures the app works without the .doc file at build/deploy time.

## Environment Availability

| Dependency | Required By | Available | Version | Fallback |
|------------|------------|-----------|---------|----------|
| word-extractor | .doc text extraction | Yes | 1.0.4 | -- (required) |
| Node.js | Build script execution | Yes | 24.14.0 | -- |
| vitest | Testing | Yes | 4.1.2 | -- |
| docs/programmaboek.doc | Source text | Yes | 28MB, 414 pages | -- (required) |

**Missing dependencies with no fallback:** None
**Missing dependencies with fallback:** None

## Validation Architecture

### Test Framework
| Property | Value |
|----------|-------|
| Framework | vitest 4.1.2 |
| Config file | `vitest.config.ts` |
| Quick run command | `npx vitest run --reporter=verbose` |
| Full suite command | `npx vitest run` |

### Phase Requirements to Test Map
| Req ID | Behavior | Test Type | Automated Command | File Exists? |
|--------|----------|-----------|-------------------|-------------|
| AI-01a | Baten-generatie prompt bevat batenprofiel-sectie uit programmaboek | unit | `npx vitest run src/lib/__tests__/prompt-assembly.test.ts -t "baten"` | Wave 0 |
| AI-01b | Vermogens-generatie prompt bevat vermogens-definitie uit programmaboek | unit | `npx vitest run src/lib/__tests__/prompt-assembly.test.ts -t "vermogens"` | Wave 0 |
| AI-01c | Inspanningen-generatie prompt bevat inspanningendossier uit programmaboek | unit | `npx vitest run src/lib/__tests__/prompt-assembly.test.ts -t "inspanningen"` | Wave 0 |
| AI-01d | Context truncation respecteert zinsgrenzen | unit | `npx vitest run src/lib/__tests__/prompt-assembly.test.ts -t "truncat"` | Wave 0 |
| AI-01e | Extraction script produceert non-empty sections for key chapters | unit | `npx vitest run scripts/__tests__/extract-programmaboek.test.ts` | Wave 0 |

### Sampling Rate
- **Per task commit:** `npx vitest run --reporter=verbose`
- **Per wave merge:** `npx vitest run && npm run build`
- **Phase gate:** Full suite green + `npm run build` succeeds before `/gsd:verify-work`

### Wave 0 Gaps
- [ ] `src/lib/__tests__/prompt-assembly.test.ts` -- covers AI-01a through AI-01d
- [ ] `scripts/__tests__/extract-programmaboek.test.ts` -- covers AI-01e
- [ ] Framework already configured (`vitest.config.ts` exists with path aliases)

## Sources

### Primary (HIGH confidence)
- word-extractor tested directly against `docs/programmaboek.doc` -- confirmed 768,872 chars extracted successfully
- `src/lib/ai-client.ts` read in full -- callClaude takes systemPrompt as first string parameter
- `src/lib/prompts.ts` read in full -- 14 prompt constants measured for token budgets
- All 3 API routes (`din-mapping`, `din-suggest`, `cross-analyse`) read in full
- `docs/programmaboek.doc` metadata verified via `file` command: 414 pages, 123,150 words, binary OLE format

### Secondary (MEDIUM confidence)
- [word-extractor npm](https://www.npmjs.com/package/word-extractor) -- v1.0.4 latest, supports .doc and .docx
- [mammoth.js GitHub](https://github.com/mwilliamson/mammoth.js/) -- confirmed .docx only, no .doc support

### Tertiary (LOW confidence)
- Token estimates use chars/4 approximation for Dutch text. Actual Claude tokenization may vary by 10-20%.

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH -- word-extractor tested and confirmed working on the actual .doc file
- Architecture: HIGH -- all integration points (callClaude, prompts.ts, API routes) thoroughly examined
- Pitfalls: HIGH -- mammoth/.doc incompatibility discovered empirically; chapter structure verified in extracted text

**Research date:** 2026-03-31
**Valid until:** 2026-06-30 (stable -- programmaboek is static, libraries are mature)
