# Phase 10: Eindproducten - Research

**Researched:** 2026-04-03
**Domain:** Word document export enhancement, gap detection UI, consolidation integration
**Confidence:** HIGH

## Summary

Phase 10 improves the existing Word export pipeline (`word-export.ts` ~1500 lines, `ExportStep.tsx` ~985 lines) rather than building from scratch. The core changes are: (1) integrate consolidation data from Phase 8 so consolidated items show as one shared item with sector markers, (2) add automatic heading numbering with matching TOC, (3) build a tabel-flow DIN-overzicht visualization per doel per sector using the docx library's Table/TableCell with shading and arrow symbols, (4) add gap-detection modal before export with smart distinction between "not yet started" and "real gaps", (5) add roadmap placeholder when no quarter data exists, (6) handle not-yet-worked-out goals with "volgende cyclus" notation, and (7) remove the unused `/api/export` route and `generateProgrammaPlan()`.

The `docx` library (v9.6.0, current: 9.6.1) already provides all needed primitives: Table, TableCell with shading/borders/columnSpan, TextRun with unicode arrows. No new dependencies are required. The existing helper functions (`heading()`, `subHeading()`, `bodyText()`, `styledCell()`, `headerCell()`) cover most needs; only a numbering wrapper and the tabel-flow builder function need to be added.

**Primary recommendation:** Enhance `word-export.ts` incrementally -- add a section counter for numbered headings, filter consolidated items in all section functions, add a `dinFlowTableSection()` for the tabel-flow visualization, and modify `ExportStep.tsx` to show gap-detection before triggering export.

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions
- **D-01:** Bestaande secties verbeteren, niet herontwerpen. De huidige ~15 secties (titelpagina, TOC, samenvatting, visie, scope, doelen, DIN-keten, cross-analyse, gap-analyse, hefboomwerking, governance, externe projecten, sectorale uitwerking, roadmap) vormen een goede basis.
- **D-02:** Geconsolideerde items (Phase 8) tonen als een gedeeld item met alle gekoppelde sectoren. Originele sector-specifieke items niet apart herhalen in de export. De undo-mogelijkheid zit in de app zelf (consolidated-vlag + undo-knop) -- gebruiker kan altijd terug, aanpassen, en opnieuw exporteren.
- **D-03:** Automatische nummering van kopjes (1. Programmavisie, 1.1 Beknopt, 2. Scope, etc.) die automatisch gegenereerd worden op basis van de aanwezige secties. TOC volgt dezelfde nummering.
- **D-04:** De /api/export route en generateProgrammaPlan() functie verwijderen. Het Word-document is het eindproduct -- geen apart AI-gegenereerd tekstdocument nodig.
- **D-05:** Niet-uitgewerkte doelen (cyclisch werken, een doel per keer) worden wel opgenomen in het document met notitie "Uitwerking volgt in volgende cyclus". Zo is het document compleet maar eerlijk over wat nog komt.
- **D-06:** Gestylede tabel-flow per doel: een tabel per doel waarin de DIN-keten als kolommen staat (Baat | Vermogen | Inspanning) met pijl-symbolen als verbindingen. Per sector een aparte tabel.
- **D-07:** Per sector apart, niet alle sectoren in een tabel. Geconsolideerde vermogens/inspanningen verschijnen bij alle relevante sectoren met markering 'gedeeld'.
- **D-08:** Geen apart helicopter-view/totaaloverzicht -- met cyclisch werken (een doel per keer) voegt dat weinig toe. De bestaande samenvattings-sectie dekt de cijfers.
- **D-09:** Altijd een roadmap-sectie opnemen in het document. Als er geen kwartaaldata beschikbaar is: placeholder-tekst "Kwartaalplanning wordt in een volgende cyclus bepaald." Als er wel kwartaaldata is: eenvoudige tabel tonen.
- **D-10:** Geen uitgebreide tijdlijn-visualisatie of Gantt-chart. Kwartaalplanning is een latere stap.
- **D-11:** Informatief overzicht bij klikken op 'Exporteer': eerst gaps tonen, gebruiker kiest "Toch exporteren" of "Eerst aanvullen". Niet blokkerend.
- **D-12:** Gap-analyse als sectie opnemen in het Word-document zelf. Maakt voor stakeholders zichtbaar waar het programma nog onvolledig is.
- **D-13:** Onderscheid maken tussen "nog niet aan de beurt" (doelen die bewust niet uitgewerkt zijn, volgende cyclus) en "echte gaps" (onvolledige ketens binnen een gestart doel). Gebruik completedGoals-data uit Phase 6 voor dit onderscheid.

### Claude's Discretion
- Exacte opmaak en styling van de tabel-flow (kleuren, celgroottes, pijl-stijl)
- Nummering-implementatie (counter-variabele of prefix per sectie)
- Hoe "gedeeld" markering er visueel uitziet in de tabel-flow
- Exacte tekst van placeholder bij lege roadmap
- Hoe de gap-waarschuwing modal eruitziet in de app
- Eventuele cleanup van ongebruikte code na verwijdering van /api/export

### Deferred Ideas (OUT OF SCOPE)
None -- discussion stayed within phase scope
</user_constraints>

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|------------------|
| EXP-01 | Compleet programmaplan als Word-export met alle DIN-secties, inhoudsopgave en genummerde kopjes | Existing `word-export.ts` covers ~15 sections; needs heading numbering system + consolidation filtering + "volgende cyclus" notation for unworked goals |
| EXP-02 | DIN-overzicht met visuele weergave van het netwerk (doelen, baten, vermogens, inspanningen) in export | New `dinFlowTableSection()` using docx Table with 3-column layout (Baat/Vermogen/Inspanning) per sector per doel, arrow symbols, and domain-colored shading |
| EXP-03 | Roadmap/tijdlijn met kwartaalplanning van inspanningen en afhankelijkheden | Existing `roadmapSection()` handles quarters; needs placeholder text for empty case per D-09, and consolidated items filtering |
</phase_requirements>

## Standard Stack

### Core
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| docx | 9.6.0 (installed) | Word document generation | Already in use; provides Table, TableCell, shading, borders, columnSpan -- all needed for tabel-flow |
| React 19.1.0 | 19.1.0 (installed) | ExportStep UI components | Already in use for gap-warning modal |

### Supporting
No new libraries needed. The existing `docx` library provides all required primitives for the tabel-flow visualization.

### Alternatives Considered
| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| Unicode arrow symbols | docx Drawing/Image for arrows | Drawing API is complex and brittle; unicode arrows render reliably in Word and are already used in codebase |
| Manual heading numbering | docx built-in NumberingLevel | Built-in numbering requires defining NumberingReference configurations; manual counter is simpler and already partially done in TOC |

## Architecture Patterns

### Files to Modify
```
src/
├── lib/
│   ├── word-export.ts           # Add numbering, consolidation filtering, tabel-flow, gap improvements
│   ├── ai-client.ts             # Remove generateProgrammaPlan() + PROGRAMMAPLAN_PROMPT import
│   └── prompts.ts               # Remove PROGRAMMAPLAN_PROMPT
├── components/
│   └── steps/
│       └── ExportStep.tsx        # Add gap-detection modal, consolidation filtering, preview improvements
└── app/
    └── api/
        └── export/
            └── route.ts          # DELETE this file entirely
```

### Pattern 1: Heading Numbering System
**What:** A counter-based numbering system for Word headings that auto-increments based on section presence
**When to use:** Throughout `word-export.ts` for all section headings
**Example:**
```typescript
// Numbering state passed through section builders
interface NumberingState {
  h1Counter: number;
  h2Counter: number;
}

function numberedHeading(
  text: string,
  level: 'h1' | 'h2',
  state: NumberingState
): Paragraph {
  if (level === 'h1') {
    state.h1Counter++;
    state.h2Counter = 0; // Reset sub-numbering
    const prefix = `${state.h1Counter}. `;
    return heading(`${prefix}${text}`, HeadingLevel.HEADING_1);
  } else {
    state.h2Counter++;
    const prefix = `${state.h1Counter}.${state.h2Counter} `;
    return heading(`${prefix}${text}`, HeadingLevel.HEADING_2);
  }
}
```

### Pattern 2: Consolidation Filtering
**What:** Filter `session.capabilities` and `session.efforts` to exclude items with `consolidated: true`, showing only the shared replacement items
**When to use:** In every section function that renders capabilities or efforts
**Example:**
```typescript
// Active items = exclude consolidated originals (they've been merged into shared items)
const activeCaps = session.capabilities.filter(c => !c.consolidated);
const activeEfforts = session.efforts.filter(e => !e.consolidated);

// Shared items have relatedSectors with multiple entries
// Mark them with "(gedeeld)" in output
const isShared = (item: { relatedSectors?: string[] }) =>
  item.relatedSectors && item.relatedSectors.length > 1;
```

### Pattern 3: Tabel-Flow DIN Visualization
**What:** A 3-column table per sector per doel showing Baat -> Vermogen -> Inspanning chains with arrow connectors
**When to use:** New `dinFlowTableSection()` in word-export.ts
**Example:**
```typescript
// Per doel, per sector: build a flow table
// Header row: BAAT | -> | VERMOGEN | -> | INSPANNING
// Data rows: one row per chain link
function buildFlowTable(
  chains: DINChain[],
  sector: string,
  activeCaps: DINCapability[],
  activeEfforts: DINEffort[]
): Table {
  const headerRow = new TableRow({
    children: [
      headerCell("Baat", 30),
      styledCell("\u2192", { width: 4, bold: true }), // arrow column
      headerCell("Vermogen", 28),
      styledCell("\u2192", { width: 4, bold: true }),
      headerCell("Inspanning", 34),
    ],
  });

  const dataRows: TableRow[] = [];
  chains.forEach((chain) => {
    chain.links.forEach((link, i) => {
      link.efforts.forEach((effort, j) => {
        const isSharedCap = link.capability.relatedSectors?.length > 1;
        const isSharedEff = effort.relatedSectors?.length > 1; // if applicable
        dataRows.push(new TableRow({
          children: [
            // Show benefit only on first row of chain
            styledCell(
              i === 0 && j === 0 ? (chain.benefit.title || chain.benefit.description) : "",
              { width: 30, shading: i === 0 && j === 0 ? "E8F0FE" : undefined }
            ),
            styledCell(i === 0 && j === 0 ? "\u2192" : "", { width: 4 }),
            styledCell(
              j === 0
                ? `${link.capability.title || link.capability.description}${isSharedCap ? " (gedeeld)" : ""}`
                : "",
              { width: 28, shading: j === 0 ? "F0F4F8" : undefined }
            ),
            styledCell(j === 0 || i === 0 ? "\u2192" : "", { width: 4 }),
            styledCell(
              `${effort.title || effort.description} [${DOMAIN_LABELS[effort.domain]}]`,
              { width: 34, shading: DOMAIN_COLORS[effort.domain] }
            ),
          ],
        }));
      });
    });
  });

  return new Table({
    width: { size: 100, type: WidthType.PERCENTAGE },
    rows: [headerRow, ...dataRows],
  });
}
```

### Pattern 4: Smart Gap Detection (D-13)
**What:** Distinguish between "volgende cyclus" goals (not started, intentional) and "echte gaps" (started but incomplete chains)
**When to use:** In gap-warning modal (ExportStep) and gap-analysis section (word-export)
**Example:**
```typescript
import { getGoalCompletionStatus } from "@/lib/din-service";

function categorizeGaps(session: DINSession) {
  const gaps = findGaps(/* ... */);

  // Goals without benefits: check if they're started or not
  const goalsWithoutBenefits = gaps.goalsWithoutBenefits.map(id => {
    const goal = session.goals.find(g => g.id === id);
    const status = getGoalCompletionStatus(session, id);
    return {
      goal,
      isVolgendeCyclus: status.status === "niet-begonnen",
      isEchteGap: status.status === "bezig", // started but missing pieces
    };
  });

  return {
    volgendeCyclus: goalsWithoutBenefits.filter(g => g.isVolgendeCyclus),
    echteGaps: goalsWithoutBenefits.filter(g => g.isEchteGap),
    // benefits/caps without next level are always "echte gaps"
    benefitsWithoutCaps: gaps.benefitsWithoutCapabilities,
    capsWithoutEfforts: gaps.capabilitiesWithoutEfforts,
  };
}
```

### Anti-Patterns to Avoid
- **Rebuilding the export from scratch:** D-01 explicitly says improve, not redesign. The ~15 existing sections are the foundation.
- **Showing consolidated originals alongside shared items:** Filter with `!c.consolidated` everywhere. The shared item replaces originals.
- **Blocking export on gaps:** D-11 says non-blocking. Show gaps, let user choose.
- **Building separate DIN visualization outside tables:** D-06 specifies tabel-flow (table-based), not canvas/SVG/drawing.
- **Treating all goals-without-benefits as gaps:** D-13 requires distinguishing "volgende cyclus" from "echte gaps" using `getGoalCompletionStatus()`.

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Word document generation | Custom XML builder | `docx` library (already installed) | Handles OOXML complexity, cross-platform |
| Table-based flow visualization | Drawing/Image-based arrows | Unicode arrows (\u2192) in TableCell | Reliable rendering, no image handling needed |
| Gap detection logic | New gap analysis | Existing `findGaps()` + `getGoalCompletionStatus()` | Already built in Phase 6/8, tested |
| Chain building | Manual mapping traversal | Existing `buildChainsForSector()` | Already handles all mapping lookups correctly |
| Consolidation logic | New merge detection | `consolidated` flag on entities | Phase 8 already marks originals and creates shared items |

**Key insight:** This phase is about wiring existing pieces together, not building new infrastructure. The gap detection, chain building, consolidation logic, and word generation are all already built.

## Common Pitfalls

### Pitfall 1: Forgetting Consolidation Filtering in a Section
**What goes wrong:** A section renders both the original (sector-specific) item AND the shared consolidated item, causing duplicates
**Why it happens:** The `consolidated: true` flag is on originals, but the shared item has `consolidated: undefined`. Easy to miss in one of the ~8 section functions.
**How to avoid:** Create `getActiveCaps(session)` and `getActiveEfforts(session)` helper functions called once at the top of `generateWordDocument()`, then pass the filtered arrays to all section functions.
**Warning signs:** Duplicate items in export, items appearing in wrong sectors

### Pitfall 2: Numbering Gets Out of Sync with TOC
**What goes wrong:** The TOC says "5. Cross-analyse" but the heading says "6. Cross-analyse" because an optional section was or wasn't present
**Why it happens:** Current TOC is hardcoded with static numbers. When optional sections (gap-analyse, hefboom, externe projecten) are present/absent, numbering shifts.
**How to avoid:** Use a single `NumberingState` object that's passed through ALL section builders. TOC is generated AFTER all sections are built, reading the numbering state.
**Warning signs:** TOC numbers don't match heading numbers

### Pitfall 3: Empty Tabel-Flow for Goals Without Data
**What goes wrong:** The tabel-flow section renders an empty table or crashes when a goal has no benefits in a sector
**Why it happens:** `buildChainsForSector()` returns empty arrays for sectors without data
**How to avoid:** Skip rendering for doel+sector combinations with no chain data, same pattern as current `goalDINSections()` which already does this check
**Warning signs:** Empty sections in output, blank tables

### Pitfall 4: Gap Modal Prevents Export
**What goes wrong:** The gap-detection modal appears but has no "proceed anyway" button, effectively blocking export
**Why it happens:** Developer focuses on showing gaps and forgets D-11 says "not blocking"
**How to avoid:** Always include two buttons: "Toch exporteren" and "Eerst aanvullen". Default focus on "Toch exporteren".
**Warning signs:** Users can't export a partially complete plan

### Pitfall 5: Roadmap Shows Consolidated Items as Separate Entries
**What goes wrong:** Consolidated efforts appear twice in roadmap -- once as original, once as shared
**Why it happens:** `roadmapSection()` iterates `session.efforts` without filtering
**How to avoid:** Filter with `activeEfforts` before rendering roadmap quarters
**Warning signs:** Duplicate entries in roadmap table

### Pitfall 6: "Gedeeld" Marking Missing on Shared Items in Tabel-Flow
**What goes wrong:** A consolidated vermogen appears in multiple sectors but without visual indication that it's shared
**Why it happens:** The shared item's `relatedSectors` array has multiple entries, but the renderer doesn't check
**How to avoid:** Check `relatedSectors.length > 1` and append "(gedeeld)" or use a distinct shading
**Warning signs:** Stakeholders confused about whether items are duplicated or shared

## Code Examples

### Existing Helpers (from word-export.ts)
```typescript
// Already available and reusable:
heading(text, HeadingLevel.HEADING_1)   // H1 with Cito blue
subHeading(text)                         // Uppercase subtitle
bodyText(content, { bold, italic })      // Body paragraph
bullet(content, indent?)                 // Bulleted item
styledCell(content, { bold, shading, width, color, size })
headerCell(content, width?)              // Blue header cell
horizontalRule()                         // Separator line
emptyLine(space?)                        // Vertical spacing
```

### Filtering Consolidated Items
```typescript
// Pattern established in CrossAnalyseStep.tsx line 962-963
const activeCaps = session.capabilities.filter(c => !c.consolidated);
const activeEfforts = session.efforts.filter(e => !e.consolidated);
```

### Using buildChainsForSector for Tabel-Flow
```typescript
// Already used in goalDINSections() at line 491
const chainResult = buildChainsForSector(session, goal.id, sector);
// chainResult.chains: DINChain[] (benefit -> links -> capability + efforts)
// chainResult.unlinkedCaps: DINCapability[] (caps not linked to a benefit)
// chainResult.unlinkedEfforts: DINEffort[] (efforts not in a chain)
```

### Smart Gap Categorization with completedGoals
```typescript
// From din-service.ts line 728+
const status = getGoalCompletionStatus(session, goalId);
// status.status: "afgerond" | "bezig" | "niet-begonnen"
// "niet-begonnen" = not yet started -> "volgende cyclus" (D-05/D-13)
// "bezig" but missing pieces -> "echte gap" (D-13)
```

### Dynamic Import Pattern for Word Export (existing)
```typescript
// ExportStep.tsx line 870 -- keep this pattern
const { generateWordDocument } = await import("@/lib/word-export");
const blob = await generateWordDocument(session!);
```

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| AI-generated prose export via `/api/export` | Direct Word generation from session data | Phase 10 (D-04) | Remove unused AI route, simplify pipeline |
| Static TOC numbering (hardcoded) | Dynamic numbered headings with counter | Phase 10 (D-03) | TOC always matches actual sections |
| Show all capabilities/efforts | Filter consolidated originals | Phase 10 (D-02) | Clean export without duplicates |
| All goals-without-benefits = gap | Distinguish "volgende cyclus" vs "echte gap" | Phase 10 (D-13) | Honest, non-alarming gap reporting |

**Deprecated/outdated:**
- `/api/export/route.ts`: Unused route generating AI prose -- to be deleted (D-04)
- `generateProgrammaPlan()` in `ai-client.ts`: Unused function -- to be deleted (D-04)
- `PROGRAMMAPLAN_PROMPT` in `prompts.ts`: Unused prompt -- to be deleted (D-04)

## Validation Architecture

### Test Framework
| Property | Value |
|----------|-------|
| Framework | vitest 4.1.2 |
| Config file | Implicit (vitest defaults in package.json) |
| Quick run command | `npm test -- --testPathPattern "word-export\|export"` |
| Full suite command | `npm test` |

### Phase Requirements -> Test Map
| Req ID | Behavior | Test Type | Automated Command | File Exists? |
|--------|----------|-----------|-------------------|-------------|
| EXP-01 | Word export has all sections with numbered headings and TOC | unit | `npx vitest run src/lib/__tests__/word-export.test.ts -t "numbering"` | No -- Wave 0 |
| EXP-01 | Consolidated items filtered from all sections | unit | `npx vitest run src/lib/__tests__/word-export.test.ts -t "consolidated"` | No -- Wave 0 |
| EXP-02 | Tabel-flow visualization per doel per sector | unit | `npx vitest run src/lib/__tests__/word-export.test.ts -t "flow-table"` | No -- Wave 0 |
| EXP-03 | Roadmap shows placeholder when no quarters, table when quarters exist | unit | `npx vitest run src/lib/__tests__/word-export.test.ts -t "roadmap"` | No -- Wave 0 |
| D-11 | Gap-detection modal shows before export | manual-only | Manual: click export button, verify modal appears | N/A |
| D-13 | Gap categorization distinguishes "volgende cyclus" from "echte gaps" | unit | `npx vitest run src/lib/__tests__/word-export.test.ts -t "gap-category"` | No -- Wave 0 |

### Sampling Rate
- **Per task commit:** `npm run build` (must pass)
- **Per wave merge:** `npm test` (full suite)
- **Phase gate:** Full suite green + manual export verification

### Wave 0 Gaps
- [ ] `src/lib/__tests__/word-export.test.ts` -- covers EXP-01, EXP-02, EXP-03, D-13 (gap categorization)
- [ ] Test fixtures: mock DINSession with consolidated items, completedGoals, and partial chains

## Open Questions

1. **Heading numbering: should the preview also be numbered?**
   - What we know: D-03 says numbered kopjes in the Word document. ExportStep preview currently has no numbers.
   - What's unclear: Should the in-app preview mirror the numbering exactly?
   - Recommendation: Add numbering to the preview as well for consistency. Low effort since it's just prefixing section titles.

2. **"Gedeeld" visual style in tabel-flow**
   - What we know: D-07 says consolidated items should appear in all relevant sectors with "gedeeld" marking
   - What's unclear: Exact visual treatment (text label vs. background color vs. icon)
   - Recommendation: Use italic text "(gedeeld)" suffix + a subtle distinct background shading (e.g., lighter blue). This is within Claude's discretion per CONTEXT.md.

## Sources

### Primary (HIGH confidence)
- `src/lib/word-export.ts` -- Full existing export implementation (~1500 lines), all helper functions, section structure
- `src/components/steps/ExportStep.tsx` -- Full existing preview implementation (~985 lines), all block components
- `src/lib/din-service.ts` -- `findGaps()`, `buildChainsForSector()`, `getGoalCompletionStatus()`, `checkSectorChain()`
- `src/components/steps/CrossAnalyseStep.tsx` -- `mergeCapabilities()`, `undoMergeCapabilities()`, consolidation filtering pattern
- `src/lib/schemas.ts` -- `consolidated` and `consolidatedInto` fields on DINCapability/DINEffort schemas
- [docx library tables documentation](https://github.com/dolanmiu/docx/blob/master/docs/usage/tables.md) -- Table, TableCell, columnSpan, rowSpan, shading, borders API

### Secondary (MEDIUM confidence)
- [docx npm registry](https://www.npmjs.com/package/docx) -- Version 9.6.0 installed, 9.6.1 latest (minor patch)

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH -- no new libraries, all primitives already in use in the codebase
- Architecture: HIGH -- all patterns visible in existing code, direct file-by-file enhancement
- Pitfalls: HIGH -- consolidation filtering pattern documented in Phase 8 decisions, gap categorization logic visible in din-service.ts

**Research date:** 2026-04-03
**Valid until:** 2026-05-03 (stable -- no external dependency changes expected)
