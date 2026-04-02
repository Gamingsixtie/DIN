---
phase: 05-sectorwerk-doorstroming
plan: 01
subsystem: data
tags: [zod, typescript, schema-validation, migration, sectorwerk]

# Dependency graph
requires:
  - phase: none
    provides: existing SectorWerkStep with string-based sectorAnalyses storage
provides:
  - Typed SectorplanAnalyseResult storage in DINSession.sectorAnalyses
  - AISectorplanAnalyseSchema Zod schema for validation
  - migrateSectorAnalyses() function for legacy data migration
  - SectorWerkStep rendering directly from typed objects (no JSON.parse)
affects: [05-02 (suggestiepaneel uses typed sectorAnalyses), din-mapping, cross-analyse]

# Tech tracking
tech-stack:
  added: [zod, vitest]
  patterns: [Zod schema validation for sector analyses, migration-on-load for legacy data]

key-files:
  created:
    - src/lib/schemas.ts
    - src/lib/__tests__/sector-migration.test.ts
    - vitest.config.ts
  modified:
    - src/lib/types.ts
    - src/lib/session-context.tsx
    - src/components/steps/SectorWerkStep.tsx
    - src/components/steps/DINMappingStep.tsx
    - package.json

key-decisions:
  - "AISectorplanAnalyseSchema (soepel met defaults) gekozen boven SectorplanAnalyseResultSchema (strict) voor opslag, conform D-01"
  - "Zod en vitest als directe dependencies toegevoegd voor schema validatie en unit tests"
  - "API response parsing in SectorWerkStep behoudt JSON.parse voor string responses, met AISectorplanAnalyseSchema.safeParse validatie"
  - "DINMappingStep serialiseert typed objects terug naar JSON strings voor backward-compatible API calls"

patterns-established:
  - "Migration-on-load: migrateSectorAnalyses() wordt aangeroepen in loadSession() om legacy data te migreren"
  - "Schema-validated storage: AI responses worden gevalideerd met Zod schema voordat ze in sessie worden opgeslagen"

requirements-completed: [DATA-04]

# Metrics
duration: 8min
completed: 2026-04-02
---

# Phase 5 Plan 1: Sectorwerk Typed Storage Summary

**sectorAnalyses opslagstructuur gewijzigd van Record<string, string> naar Record<string, SectorplanAnalyseResult> met Zod schema validatie, migratielogica en 4 unit tests**

## Performance

- **Duration:** 8 min
- **Started:** 2026-04-02T19:18:47Z
- **Completed:** 2026-04-02T19:27:00Z
- **Tasks:** 2
- **Files modified:** 9

## Accomplishments
- sectorAnalyses schema gewijzigd naar getypeerde SectorplanAnalyseResult objecten met AISectorplanAnalyseSchema validatie
- Migratielogica voor legacy string-data: JSON strings worden automatisch omgezet, markdown/ongeldige data wordt verwijderd
- SectorWerkStep leest direct van typed objects zonder JSON.parse/stringify cyclus
- 4 unit tests voor migratielogica (schema validatie, string migratie, invalid verwijdering, object doorlating)

## Task Commits

Each task was committed atomically:

1. **Task 1: Schema migratie + migratielogica + tests** - `50fa78a` (feat)
2. **Task 2: SectorWerkStep typed object opslag en weergave** - `98f6240` (feat)

_Note: Task 1 was TDD — RED (tests failing) and GREEN (implementation passing) in one commit since both schema and migration were interdependent._

## Files Created/Modified
- `src/lib/schemas.ts` - Zod schemas voor AISectorplanAnalyseSchema en sectorAnalysesSchema
- `src/lib/__tests__/sector-migration.test.ts` - 4 unit tests voor migratielogica
- `vitest.config.ts` - Vitest configuratie met path alias (@/ -> ./src/)
- `src/lib/types.ts` - DINSession.sectorAnalyses type gewijzigd naar Record<string, SectorplanAnalyseResult>
- `src/lib/session-context.tsx` - migrateSectorAnalyses() functie + migratie in loadSession()
- `src/components/steps/SectorWerkStep.tsx` - Typed object opslag, schema-gevalideerde AI response, geen JSON.parse meer
- `src/components/steps/DINMappingStep.tsx` - Backward-compatible JSON.stringify bij API calls
- `package.json` - zod + vitest dependencies toegevoegd

## Decisions Made
- **AISectorplanAnalyseSchema voor opslag**: Het soepelere AI schema (met .optional().default()) wordt gebruikt voor opslag in plaats van het stricte SectorplanAnalyseResultSchema, zodat data met ontbrekende optionele velden niet wordt afgewezen.
- **Zod als directe dependency**: Zod was al beschikbaar als transitive dependency, maar wordt nu als direct dependency geinstalleerd voor expliciete schema validatie.
- **Vitest voor unit tests**: Vitest gekozen als test framework, compatibel met de TypeScript + ESM setup.
- **Backward-compatible API serialisatie**: DINMappingStep serialiseert typed objects naar JSON strings bij het aanroepen van API routes die nog string input verwachten. Dit voorkomt breakage terwijl Plan 02 de downstream aanpassing doet.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 3 - Blocking] schemas.ts bestond niet in de codebase**
- **Found during:** Task 1
- **Issue:** Plan refereerde naar bestaand schemas.ts bestand op lijn 195-479, maar dit bestand bestond niet in de huidige codebase
- **Fix:** schemas.ts aangemaakt met AISectorplanAnalyseSchema, sectorAnalysesSchema en isSectorplanAnalyseResult
- **Files modified:** src/lib/schemas.ts
- **Verification:** Tests importeren schema succesvol, build slaagt
- **Committed in:** 50fa78a (Task 1 commit)

**2. [Rule 3 - Blocking] Vitest en Zod niet geinstalleerd**
- **Found during:** Task 1
- **Issue:** Vitest was niet als dependency geinstalleerd, Zod alleen als transitive dependency
- **Fix:** npm install zod vitest --save-dev (vitest), npm install zod (zod)
- **Files modified:** package.json, package-lock.json
- **Verification:** npx vitest run slaagt
- **Committed in:** 50fa78a (Task 1 commit)

**3. [Rule 3 - Blocking] session-context.tsx miste Phase 2 patronen (addToastRef, functional updater)**
- **Found during:** Task 1
- **Issue:** Plan refereerde naar addToastRef en functionele updateSession(prev => ...) API die niet in de huidige codebase bestaan
- **Fix:** Migratie-waarschuwing via console.error in plaats van toast; updateSession met direct object in plaats van functional updater
- **Files modified:** src/lib/session-context.tsx
- **Verification:** Build slaagt, migratie werkt correct
- **Committed in:** 50fa78a (Task 1 commit)

**4. [Rule 1 - Bug] API retourneert string, niet object**
- **Found during:** Task 2
- **Issue:** analyze-sectorplan API retourneert raw Claude string, niet een getypeerd object. Directe toewijzing aan SectorplanAnalyseResult zou runtime falen
- **Fix:** JSON regex extractie + AISectorplanAnalyseSchema.safeParse validatie in SectorWerkStep voordat resultaat wordt opgeslagen
- **Files modified:** src/components/steps/SectorWerkStep.tsx
- **Verification:** Build slaagt, type-safe opslag gegarandeerd
- **Committed in:** 98f6240 (Task 2 commit)

**5. [Rule 1 - Bug] DINMappingStep downstream type mismatch**
- **Found during:** Task 2
- **Issue:** DINMappingStep stuurt sectorAnalyses[sector] door als sectorAnalysis naar API die string verwacht. Na type-wijziging zou een object worden gestuurd
- **Fix:** JSON.stringify van typed object voordat het naar de API wordt gestuurd
- **Files modified:** src/components/steps/DINMappingStep.tsx
- **Verification:** Build slaagt, API ontvangt correcte string input
- **Committed in:** 98f6240 (Task 2 commit)

---

**Total deviations:** 5 auto-fixed (2 bugs, 3 blocking)
**Impact on plan:** All auto-fixes necessary for correctness. Codebase differencties met plan-aannames vereisten adaptatie. Geen scope creep.

## Issues Encountered
- Plan was gebaseerd op een codebase met Phase 2 patronen (addToastRef, functional updater) die niet aanwezig waren. Adaptatie naar het werkelijke updateSession(updates: Partial<DINSession>) patroon was noodzakelijk.
- schemas.ts referenties in het plan verwezen naar een niet-bestaand bestand — het schema moest volledig worden gecreeerd.

## Known Stubs
None - alle data paden zijn volledig verbonden.

## User Setup Required
None - no external service configuration required.

## Next Phase Readiness
- Typed sectorAnalyses beschikbaar voor Plan 02 suggestiepaneel
- AISectorplanAnalyseSchema beschikbaar voor downstream validatie
- migrateSectorAnalyses() garandeert dat alle bestaande sessies correcte getypeerde data bevatten
- API routes verwachten nog string input voor sectorAnalysis — Plan 02 kan dit aanpassen naar typed objects

---
*Phase: 05-sectorwerk-doorstroming*
*Completed: 2026-04-02*
