---
phase: 13-stap-5-cross-analyse-prioriteitsview-eerste-doel
plan: 03
subsystem: cross-analyse
tags: [api-narrowing, ui-rewrite, focusview, wave-2]
dependency_graph:
  requires: [13-02]
  provides: [stap5-api-narrowed-payload, StapSectorVertaling-focusview]
  affects: [CrossAnalyseWizard]
tech_stack:
  added: []
  patterns: [pure-module-reuse-client-server, focus-scoped-payload, 6-block-layout]
key_files:
  created: []
  modified:
    - src/app/api/cross-analyse/route.ts
    - src/components/cross-analyse/StapSectorVertaling.tsx
decisions:
  - API route reuses `getFocusGoal` from Wave 1 pure module to guarantee identical filter semantics between server payload and client view
  - Explicit filter callback type annotations `(b: { id: string }) => …` required because TS strict inference on `.map().filter()` chains does not carry destructured-param element types in this project
  - Component is fully rewritten (not incremental) — no oude DIN-keten / Domeinbalans / Gap-analyse code survives
  - Structural blocks render with or without `result` prop — AI callouts are additive, never blocking
metrics:
  duration: ~4min
  completed: "2026-04-05"
  tasks: 2
  files: 2
requirements: [R-CROSS-01, R-CROSS-02]
---

# Phase 13 Plan 03: Stap 5 Wave 2 Implementation Summary

**One-liner:** Versmalt de `stap===5` branch van `api/cross-analyse/route.ts` tot een focus-scoped payload (focusdoel + baten + cross-sector vermogens + gedeelde inspanningen) via `getFocusGoal`, en herschrijft `StapSectorVertaling.tsx` volledig naar de 6-block focusview per UI-SPEC (FocusDoelCard → BatenPerSectorGroup → CrossSectorVermogensList → GedeeldeInspanningenList → AISamenvattingBlock → BuitenScopeFooter).

## What Was Built

### 1. `src/app/api/cross-analyse/route.ts` — stap 5 narrowing

- **Line 21:** Toegevoegd `import { getFocusGoal } from "@/lib/stap5-focus";`
- **Lines 133-192 (nieuw):** Introduceert `let payloadForPrompt: unknown = structuredData;` met een `if (stap === 5)` block dat de payload versmalt tot focus-scope. Reuses Wave 1 filter semantiek:
  - `focusBenefitIds` ← `goalBenefitMaps.filter(m.goalId === focusGoal.id)`
  - `sharedCapIds` ← actieve caps met `relatedSectors.length > 1`
  - `focusCapIds` ← intersect `benefitCapabilityMaps` × `focusBenefitIds` × `sharedCapIds`
  - `sharedEffortIds` ← actieve efforts met `responsibleSector.includes(",")`
  - `focusEffortIds` ← intersect `capabilityEffortMaps` × `focusCapIds` × `sharedEffortIds`
  - `payloadForPrompt = { focusDoel, baten, gedeeldeVermogens, gedeeldeInspanningen, koppelingen }`
- **Line 196:** `userMessage` template gebruikt nu `JSON.stringify(payloadForPrompt, …)` i.p.v. `structuredData` in de stap-branch
- **Stap 1-4:** volledig ongewijzigd — `payloadForPrompt` default blijft `structuredData`
- **Legacy fallback branch (lines 224-259):** ongewijzigd (backward compat)

**Nieuwe regelcount:** 260 (was 197, +63 lines = het hele narrowing block)

### 2. `src/components/cross-analyse/StapSectorVertaling.tsx` — volledige rewrite

- **Oude regelcount:** 407 lines (inclusief Consolidatie-samenvatting, volledige DIN-keten render, Domeinbalans, Gap-analyse)
- **Nieuwe regelcount:** 364 lines
- **Imports weg:** `findGaps`, `getDomainBalance`, `DOMAIN_LABELS`, `EffortDomain`
- **Imports toegevoegd:** `useState` (React), `computeFocusView` from `@/lib/stap5-focus`, `SectorName` type
- **Structuur (top→bottom):**
  1. Intro paragraph (copy uit UI-SPEC §Copywriting Contract verbatim)
  2. `FocusDoelCard` — `border-l-4 border-l-[#003366]` + `text-lg font-semibold`
  3. `BatenPerSectorGroup` — hardcoded volgorde `["PO", "VO", "Zakelijk"]`, per sector een `SectorBadge` + count, elke baat met `border-l-4 border-l-[#0066cc]` + geraakt/risico badges
  4. `CrossSectorVermogensList` — elke vermogen met `border-l-4 border-l-[#0891b2]` + multi-SectorBadge + hefboomAnalyse prose
  5. `GedeeldeInspanningenList` — elke inspanning met `border-l-4 border-l-[#059669]` + breedteOordeel badges (dekt_volledig / moet_verbreed / mist_aspect) + toelichting/suggestie
  6. `AISamenvattingBlock` — prose callout met samenvatting OR placeholder copy
  7. `BuitenScopeFooter` — collapsible `min-h-[44px]` button met `aria-expanded`, expanded toont `outOfScopeCaps` en `outOfScopeEfforts` per lijst
- **Accessibility:** pre-AI placeholder dots hebben `aria-label="Wachten op AI-analyse"`; buiten-scope toggle heeft 44px touch target + `aria-expanded`; section headings gebruiken `<h4>`/`<h5>` met `aria-labelledby` koppelingen
- **Typografie-contract:** alleen `font-normal`/`font-semibold`, sizes `text-lg`/`text-sm`/`text-[13px]`/`text-[11px]` — geen `font-medium`, `text-xs`, `text-xl`
- **Empty states:** (A) geen doelen → importeer-melding; (B) focusdoel zonder cross-sector vermogens → stap 4 instructie

## Tasks Executed

| # | Task | Status | Commit | Files |
|---|------|--------|--------|-------|
| 1 | API route — versmalde payloadForPrompt voor stap===5 | DONE | `039eec3` | `src/app/api/cross-analyse/route.ts` |
| 2 | StapSectorVertaling.tsx volledig herschrijven naar focusview | DONE | `f2d27b2` | `src/components/cross-analyse/StapSectorVertaling.tsx` (+ explicit filter types in route.ts) |

## Verification Results

### `npm run build`
```
✓ Compiled successfully in 5.1s
  Running TypeScript ...
  Collecting page data using 23 workers ...
✓ Generating static pages using 23 workers (13/13) in 454.2ms
  Finalizing page optimization ...
```
**PASS** — TypeScript strict mode + Next.js 16 Turbopack production build.

### Wave 0 tests — alle 23 groen
```
npx vitest run src/lib/__tests__/stap5-focus-filter.test.ts src/lib/__tests__/schemas-stap5.test.ts src/lib/__tests__/stap5-restore-guard.test.ts

 Test Files  3 passed (3)
      Tests  23 passed (23)
```

### Acceptance criteria — Task 1
- `grep getFocusGoal src/app/api/cross-analyse/route.ts` → 2+ matches ✓
- `let payloadForPrompt: unknown = structuredData;` present ✓
- `if (stap === 5)` conditie present ✓
- `focusBenefitIds`, `focusCapIds`, `focusEffortIds` variabelen present ✓
- `payloadForPrompt = { focusDoel, baten, gedeeldeVermogens, gedeeldeInspanningen, koppelingen }` present ✓
- `JSON.stringify(payloadForPrompt` in userMessage (niet `structuredData` in stap-branch) ✓
- Stap 1-4 branches ongewijzigd ✓
- Backward compat fallback branch ongewijzigd ✓

### Acceptance criteria — Task 2
- Importeert `computeFocusView` van `@/lib/stap5-focus` ✓
- Importeert `SectorBadge` van `./shared` (relative) ✓
- Geen `findGaps`, `getDomainBalance`, `DOMAIN_LABELS` imports ✓
- Geen `font-medium`, `text-xl`, `text-xs` klassen ✓
- Alle UI-SPEC copy strings verbatim aanwezig: "Focusdoel — prioriteit 1", "Baten onder dit doel — per sector", "Cross-sector vermogens die hefboom leveren", "Gedeelde inspanningen onder deze vermogens", "Buiten scope voor nu" ✓
- `aria-label="Wachten op AI-analyse"` op elke placeholder dot (3×) ✓
- `min-h-[44px]` op buiten-scope toggle ✓
- `border-l-4` met Cito-blue/blauw/cyaan/groen op focus-doel/baten/vermogens/inspanningen ✓
- Alle 3 `breedteOordeel` enum checks aanwezig ✓
- Hardcoded `SECTORS_ORDER = ["PO", "VO", "Zakelijk"] as const` ✓
- Bestand ≥ 200 regels (364) ✓

## Deviations from Plan

### [Rule 1 - Bug] Explicit filter callback type annotations in route.ts
- **Found during:** Task 1 eerste build run
- **Issue:** TypeScript strict mode faalde op 3 plekken met `Parameter 'b' implicitly has an 'any' type` bij `benefitsData.filter((b) => …)`, ondanks dat `benefitsData` het resultaat is van een typed `.map()` callback. Bekend TypeScript-gedrag: de return type van `.map()` met destructured callback parameter propagteert niet altijd schoon door een volgende `.filter()` chain in strict mode.
- **Fix:** Expliciete type annotatie op de filter callback parameters: `(b: { id: string }) => …`, `(c: { id: string }) => …`, `(e: { id: string }) => …`. Dit raakt alleen de filter-callback binnen het stap===5 block; bestaande `benefitsData`/`capsData`/`effortsData` definities blijven intact.
- **Files modified:** `src/app/api/cross-analyse/route.ts`
- **Commit:** onderdeel van `f2d27b2`

Dit is een triviale micro-fix die strikt binnen de scope van Task 1 valt (narrowing block dat in deze plan is toegevoegd). Geen CLAUDE.md conflict, geen architecturale impact.

## Deferred Issues

None. Alle Wave 2 scope is geleverd.

## Downstream Impact (Wave 3 = Plan 04)

Wave 3 zal deze bestanden moeten raken:
- `src/components/cross-analyse/CrossAnalyseWizard.tsx`:
  - `STEP_INFO[5]` bijwerken naar "Prioriteitsview — eerste doel" (UI-SPEC D-11)
  - Intro paragraph in step 5 bijwerken naar UI-SPEC copy
  - Restore guard: `restoreStap5Result(raw)` aanroepen bij session load (D-10)
  - CTA conditie: "Analyseer eerste doel" disabled state met tooltip "Er zijn nog geen cross-sector vermogens om te beoordelen" wanneer `computeFocusView(session).focusCaps.length === 0`

Het `<StapSectorVertaling session={…} result={…} />` prop-contract is ongewijzigd — wizard integratie is dus additive, geen breaking.

## Key Decisions Made

1. **Pure module reuse client + server** — `getFocusGoal` wordt nu zowel in `route.ts` (server) als in `computeFocusView` (client via `StapSectorVertaling.tsx`) aangeroepen. Dit garandeert byte-identieke filter-semantiek tussen het prompt-payload dat Claude ziet en de UI die de gebruiker ziet. Geen dubbele filter-regels meer onderhouden.
2. **Focus narrowing alleen actief als `focusGoal` bestaat** — als `goals` leeg is, valt `payloadForPrompt` terug op `structuredData`. Claude krijgt dan alles; het resultaat is voorspelbaar "geen data om over te oordelen".
3. **Component volledig vervangen, niet incrementeel bewerkt** — de oude DIN-keten render + Domeinbalans + Gap-analyse hoort structureel niet meer in stap 5 (D-01). Incrementele rewrite zou dead code laten staan.
4. **Typografie strikt 2 gewichten, 4 sizes** — conform UI-SPEC Dimension 4. Dit voorkomt typografische drift in een scherm dat stakeholder-mandaat moet communiceren.

## Self-Check: PASSED

**Files verified:**
- FOUND: `src/app/api/cross-analyse/route.ts` (modified, 260 lines)
- FOUND: `src/components/cross-analyse/StapSectorVertaling.tsx` (modified, 364 lines — full rewrite)

**Commits verified:**
- FOUND: `039eec3` feat(13-03): narrow stap 5 API payload to focus goal scope
- FOUND: `f2d27b2` feat(13-03): rewrite StapSectorVertaling to focusview per UI-SPEC

**Build verified:**
- `npm run build` → ✓ Compiled successfully, TypeScript PASS, 13/13 static pages generated

**Tests verified:**
- 23/23 Wave 0 tests GREEN (5 schemas-stap5 + 11 stap5-focus-filter + 7 stap5-restore-guard)
