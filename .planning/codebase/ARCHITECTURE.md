# Architecture

**Analysis Date:** 2026-03-30

## Pattern Overview

**Overall:** Multi-step wizard application with Next.js App Router, leveraging React Context for session state management and localStorage for local-first persistence with optional Supabase sync.

**Key Characteristics:**
- Step-based workflow (6 sequential phases) for DIN (Doelen-Inspanningennetwerk) planning
- Domain-driven design with clear separation between UI components, business logic, and data persistence
- AI-augmented form generation using Anthropic Claude API via Next.js API routes
- Local-first persistence strategy (localStorage → async Supabase)
- Sector-aware data modeling with cross-sector analysis capabilities

## Layers

**Presentation Layer:**
- Purpose: Render UI components and handle user interactions
- Location: `src/components/` (both page routes and reusable components)
- Contains: React TSX components for steps, DIN cards, wizards, and UI utilities
- Depends on: Session context, DIN service utilities, type definitions
- Used by: Next.js App Router pages

**Session Management Layer:**
- Purpose: Manage application state and persist session data
- Location: `src/lib/session-context.tsx`
- Contains: React Context provider, session loading/creation/updating logic
- Depends on: Persistence layer (localStorage/Supabase), type definitions
- Used by: Page components and step components via `useSession()` hook

**Business Logic Layer:**
- Purpose: Handle DIN entity creation, querying, and domain operations
- Location: `src/lib/din-service.ts`
- Contains: CRUD generators for benefits, capabilities, efforts; filtering helpers; cross-analysis utilities
- Depends on: Type definitions, persistence utilities
- Used by: Components, API routes, and AI client

**Persistence Layer:**
- Purpose: Manage data storage (localStorage + Supabase dual-write)
- Location: `src/lib/persistence.ts`
- Contains: localStorage sync/load, dual persistence pattern, deduplication
- Depends on: None (standalone)
- Used by: Session context, business logic

**AI Integration Layer:**
- Purpose: Orchestrate Claude API calls for domain-specific generation tasks
- Location: `src/lib/ai-client.ts`
- Contains: Wrapper around Anthropic SDK, structured prompt formatting, response parsing
- Depends on: Type definitions, prompts configuration
- Used by: API routes for DIN mapping, cross-analysis, sectorplan analysis

**API Route Layer:**
- Purpose: Handle server-side operations (file upload, AI calls, exports)
- Location: `src/app/api/[endpoint]/route.ts`
- Contains: POST/GET handlers for file parsing, sector analysis, DIN generation, exports
- Depends on: AI client, business logic, file processing libraries
- Used by: Front-end components via fetch() calls

**Type System:**
- Purpose: Define domain entities and contracts
- Location: `src/lib/types.ts`
- Contains: Interfaces for DINSession, DINBenefit, DINCapability, DINEffort, cross-analysis results
- Depends on: None
- Used by: All layers

## Data Flow

**Session Initialization Flow:**

1. User visits `/` → Home page loads existing sessions from localStorage
2. User clicks "Nieuwe sessie" or "Demo laden"
3. Session created in memory with minimal state
4. Session persisted to localStorage via `saveLocal()`
5. Session ID added to session_list in localStorage
6. User navigated to `/sessies/[id]`
7. SessionProvider wraps page, `useSession()` hook loads session via `loadLocal()`

**Programmaplan Workflow (6 Steps):**

1. **Import (Step 0):** User uploads KiB JSON/DOCX → `parse-sector` API → imported vision/goals stored in session
2. **Sectorwerk (Step 1):** User uploads sector plans (PO/VO/Zakelijk) → `parse-sector` API extracts text → `analyze-sectorplan` API analyzes with Claude
3. **DIN-Mapping (Step 2):** Per goal & sector, user fills questionnaire → `din-mapping` API generates benefits/capabilities/efforts with Claude
4. **Cross-Analyse (Step 3):** All DIN data aggregated → `cross-analyse` API identifies synergies/gaps/leverage points
5. **Prioritering (Step 4):** User reviews and votes on efforts, approves items
6. **Export (Step 5):** `export` API generates Word document with full programmaplan

**Session State Update Cycle:**

```
User action in component
  ↓
Component calls useSession().updateSession(updates)
  ↓
SessionContext updates state in memory
  ↓
SessionContext calls saveLocal() → localStorage write (sync)
  ↓
(Async) SessionContext optionally calls dualSave() → Supabase (fire-and-forget)
```

**State Management:**
- **Source of truth:** `DINSession` object in React Context
- **Backing store:** localStorage (immediate, reliable)
- **Remote sync:** Supabase (optional, async, can fail gracefully)
- **Deduplication:** Applied when merging AI-generated items to prevent duplicates on regeneration

## Key Abstractions

**DINSession:**
- Purpose: Root domain entity representing entire programmaplan state
- Examples: `src/lib/types.ts` line 320
- Pattern: Single source of truth for all user data (goals, benefits, capabilities, efforts, mappings, analysis results)

**DIN Entity Types (Doelen-Inspanningennetwerk chain):**
- **DINBenefit:** Benefit (baat) with owner, indicator, current/target values
- **DINCapability:** Capability (vermogen) with profiel (as-is/to-be), maturity levels
- **DINEffort:** Initiative (inspanning) with domain, status, dossier profile, quarter planning
- Pattern: Each entity is sector-scoped; mappings (goalBenefitMap, etc.) connect them

**Wizard Component (DINCreatieWizard):**
- Purpose: AI-guided questionnaire for DIN item creation
- Location: `src/components/din/DINCreatieWizard.tsx`
- Pattern: Multi-step form with dynamic questions → Claude API call → structured JSON parsing → entity creation

**Step Components:**
- Purpose: Encapsulate one phase of the workflow
- Examples: `src/components/steps/ImportStep.tsx`, `SectorWerkStep.tsx`, `DINMappingStep.tsx`
- Pattern: Each step loads session, renders domain-specific UI, updates session on save

**Sector-Aware Patterns:**
- Benefits, Capabilities, Efforts are all tagged with sectorId
- Cross-sector analysis identifies overlaps via `findSharedCapabilities()`
- Per-sector integration advice generated via `generateSectorIntegratie()`

## Entry Points

**Web Application:**
- Location: `src/app/page.tsx`
- Triggers: Browser navigation to `/`
- Responsibilities: Session list management, creation/deletion, demo loading, navigation to session detail

**Session Flow:**
- Location: `src/app/sessies/[id]/page.tsx`
- Triggers: Navigation from home or direct URL
- Responsibilities: SessionProvider wrapper, step navigation, progress tracking, session loading

**API Endpoints:**

| Endpoint | Location | Purpose |
|----------|----------|---------|
| `POST /api/parse-sector` | `src/app/api/parse-sector/route.ts` | Extract text from DOCX/TXT sectorplan |
| `POST /api/analyze-sectorplan` | `src/app/api/analyze-sectorplan/route.ts` | Analyze sectorplan with Claude, return structured result |
| `POST /api/din-mapping` | `src/app/api/din-mapping/route.ts` | Generate DIN entities from goal + questionnaire answers |
| `POST /api/cross-analyse` | `src/app/api/cross-analyse/route.ts` | Cross-sector analysis and synergy detection |
| `POST /api/din-suggest` | `src/app/api/din-suggest/route.ts` | Suggest/improve single DIN item |
| `POST /api/export` | `src/app/api/export/route.ts` | Generate Word document export |
| `POST /api/import-kib` | `src/app/api/import-kib/route.ts` | Import KiB programmaplan from DOCX |

## Error Handling

**Strategy:** Graceful degradation with user feedback

**Patterns:**
- AI API failures logged to console, user shown error message with retry option
- File upload failures caught in try/catch blocks, user shown specific error (e.g., "Ongeldig JSON formaat")
- Persistence failures logged; localStorage success is critical path, Supabase failure does not block UI
- Session loading failures show "Sessie laden..." spinner indefinitely (should timeout)

**Key Error Points:**
- `src/app/api/parse-sector/route.ts` (line 38-49): File parsing errors
- `src/lib/kib-import.ts` (line 24-29): JSON parsing validation
- `src/lib/ai-client.ts` (all callClaude calls): API failures silently return empty string

## Cross-Cutting Concerns

**Logging:**
- Approach: `console.error()` and `console.log()` for debugging
- Locations: persistence errors (`src/lib/persistence.ts`), AI client errors (implicit)

**Validation:**
- Approach: Type-level via TypeScript interfaces + runtime checks in importers
- Examples: KiB JSON shape validation in `src/lib/kib-import.ts`
- UI-level: Form fields required, questionnaire answers validated before API call

**Authentication:**
- Approach: None implemented; all data stored client-side or per-session key
- Supabase client created but not authenticated (anon key only, `src/lib/supabase.ts`)

**Internationalization:**
- Approach: Dutch language hardcoded throughout UI and prompts
- Locale: `nl-NL` for date formatting in home page (`src/app/page.tsx` line 219)

---

*Architecture analysis: 2026-03-30*
