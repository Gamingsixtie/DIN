# Codebase Structure

**Analysis Date:** 2026-03-30

## Directory Layout

```
c:/Users/pdebu/Projects VS code/DIN/
├── src/
│   ├── app/                           # Next.js App Router pages and API routes
│   │   ├── api/                       # Server-side API endpoints
│   │   │   ├── analyze-sectorplan/
│   │   │   ├── cross-analyse/
│   │   │   ├── din-mapping/
│   │   │   ├── din-suggest/
│   │   │   ├── export/
│   │   │   ├── import-kib/
│   │   │   └── parse-sector/
│   │   ├── methodiek/                 # Methodology explanation page
│   │   │   └── page.tsx
│   │   ├── sessies/                   # Session pages
│   │   │   └── [id]/
│   │   │       └── page.tsx           # Session workflow container
│   │   ├── globals.css                # Global Tailwind CSS
│   │   ├── layout.tsx                 # Root layout
│   │   └── page.tsx                   # Home page (session list)
│   ├── components/                    # React components
│   │   ├── din/                       # DIN-specific domain components
│   │   │   ├── BenefitCard.tsx        # Display/edit benefit (baat)
│   │   │   ├── CapabilityCard.tsx     # Display/edit capability (vermogen)
│   │   │   ├── DINChainIndicator.tsx  # Visual DIN chain progress
│   │   │   ├── DINCreatieWizard.tsx   # AI-guided item creation questionnaire
│   │   │   ├── DINNetworkGraph.tsx    # Network visualization
│   │   │   ├── EffortCard.tsx         # Display/edit effort (inspanning)
│   │   │   ├── MergedDINView.tsx      # Cross-sector consolidated view
│   │   │   └── SectorTabs.tsx         # Sector-specific tabbed interface
│   │   ├── steps/                     # Workflow step components
│   │   │   ├── CrossAnalyseStep.tsx   # Step 3: Cross-sector analysis
│   │   │   ├── DINMappingStep.tsx     # Step 2: DIN entity generation
│   │   │   ├── ExportStep.tsx         # Step 5: Document generation
│   │   │   ├── ImportStep.tsx         # Step 0: KiB import
│   │   │   ├── PrioriteringStep.tsx   # Step 4: Approval & voting
│   │   │   ├── SamengevoegdDINStep.tsx# Merged view (variation)
│   │   │   ├── SectorIntegratieStep.tsx
│   │   │   └── SectorWerkStep.tsx     # Step 1: Sectorplan upload & analysis
│   │   └── ui/
│   │       └── MarkdownContent.tsx    # Markdown renderer for AI-generated text
│   └── lib/                           # Business logic and utilities
│       ├── ai-client.ts               # Anthropic Claude API wrapper
│       ├── demo-data.ts               # Demo session seed data
│       ├── din-service.ts             # DIN CRUD operations and queries
│       ├── kib-import.ts              # KiB JSON parser and importer
│       ├── persistence.ts             # localStorage + Supabase dual persistence
│       ├── prompts.ts                 # Claude API system/user prompts
│       ├── session-context.tsx        # React Context for session state
│       ├── supabase.ts                # Supabase client initialization
│       ├── types.ts                   # Domain type definitions
│       └── word-export.ts             # DOCX generation for export
├── docs/                              # Documentation
├── .planning/
│   └── codebase/                      # GSD analysis documents
├── .claude/                           # Claude project configuration
├── public/                            # Static assets
├── package.json                       # NPM dependencies
├── tsconfig.json                      # TypeScript configuration
├── tailwind.config.js                 # Tailwind CSS configuration (if present)
└── next.config.ts                     # Next.js configuration
```

## Directory Purposes

**src/app/:**
- Purpose: Next.js App Router pages, layouts, and API routes
- Contains: Route handlers, page components, middleware
- Key files: `page.tsx` (home), `layout.tsx` (root wrapper), `globals.css` (styling)

**src/app/api/:**
- Purpose: Server-side API endpoints for file processing, AI calls, document export
- Contains: POST/GET route handlers using Next.js API route conventions
- Key files: Each subdirectory contains `route.ts` with async handler function

**src/components/din/:**
- Purpose: Domain-specific components for DIN entity management and visualization
- Contains: Card components for editing/viewing benefits, capabilities, efforts; wizards for creation; network graphs
- Key files: `DINCreatieWizard.tsx` (AI-guided form), `SectorTabs.tsx` (sector navigation)

**src/components/steps/:**
- Purpose: Workflow step components implementing each phase of the programmaplan process
- Contains: Full-page components with form logic, API integration, session updates
- Key files: `ImportStep.tsx`, `SectorWerkStep.tsx`, `DINMappingStep.tsx`, `CrossAnalyseStep.tsx`

**src/lib/:**
- Purpose: Shared business logic, utilities, and configuration
- Contains: AI client wrapper, persistence logic, entity service, type definitions, prompts
- Key files: `din-service.ts` (entity queries), `ai-client.ts` (Claude integration), `persistence.ts` (storage)

## Key File Locations

**Entry Points:**
- `src/app/page.tsx`: Home page — session list, creation, demo loading
- `src/app/sessies/[id]/page.tsx`: Session workflow — loads session, renders current step
- `src/lib/session-context.tsx`: SessionProvider wrapper, useSession() hook

**Configuration:**
- `src/lib/types.ts`: All domain entity interfaces (DINSession, DINBenefit, etc.)
- `src/lib/prompts.ts`: Claude API system and user message templates
- `tsconfig.json`: TypeScript path aliases (`@/*` → `src/`)
- `package.json`: NPM dependencies (next, react, anthropic SDK, supabase, docx, mammoth)

**Core Logic:**
- `src/lib/din-service.ts`: CRUD generators and query helpers for DIN entities
- `src/lib/ai-client.ts`: Anthropic Claude API wrapper with structured prompt formatting
- `src/lib/persistence.ts`: localStorage and Supabase dual-write persistence layer
- `src/lib/kib-import.ts`: KiB JSON parser and data transformer

**Testing:**
- No test files present in codebase

## Naming Conventions

**Files:**
- PascalCase: React components (`BenefitCard.tsx`, `DINCreatieWizard.tsx`)
- camelCase: Utility and service files (`din-service.ts`, `persistence.ts`, `ai-client.ts`)
- Kebab-case: API route directories (`parse-sector`, `din-mapping`, `cross-analyse`)

**Directories:**
- Lowercase with hyphens: API routes (`api/parse-sector/`, `api/din-mapping/`)
- Lowercase: Feature directories (`components/din/`, `components/steps/`, `lib/`)
- Square brackets: Dynamic segments in App Router (`[id]`)

**React Components:**
- PascalCase file names matching component export name
- Hooks named `use*` (`useSession`)
- Props interfaces suffixed with `Props` or inline as function parameter type
- Context pattern: `[Domain]Context`, `use[Domain]()`, `[Domain]Provider`

**Variables & Functions:**
- camelCase: Local variables, function names, method names
- UPPER_SNAKE_CASE: Constants (especially enums and lookups: `SECTORS`, `STATUS_LABELS`, `DOMAIN_COLORS`)
- Constants exported from `types.ts`: `SECTORS`, `SECTOR_COLORS`, `STATUS_LABELS`, `STATUS_STYLES`, `APP_STEPS`

## Where to Add New Code

**New Feature (multi-step workflow):**
- Primary code: `src/components/steps/[FeatureName]Step.tsx`
- Session state type: Add interface to `src/lib/types.ts` (DINSession)
- Business logic: Add helper functions to `src/lib/din-service.ts`
- Tests: Create `src/components/steps/[FeatureName]Step.test.tsx` (currently no test suite)

**New Component/Module (reusable UI):**
- Implementation: `src/components/[category]/[ComponentName].tsx`
- For domain-specific: `src/components/din/[ComponentName].tsx`
- For generic UI: `src/components/ui/[ComponentName].tsx`
- Usage: Import in step components or other reusable components

**New API Endpoint:**
- Implementation: `src/app/api/[endpoint-name]/route.ts`
- Pattern: Async `POST` handler, JSON request/response, error handling with NextResponse
- Example: See `src/app/api/parse-sector/route.ts`

**Utilities and Helpers:**
- Shared business logic: `src/lib/[domain]-service.ts` (e.g., `din-service.ts`, `kib-import.ts`)
- Shared constants: `src/lib/types.ts` under "Dynamische kwartalen" or "--- [Domain] labels ---"
- Persistence: Add to `src/lib/persistence.ts` if it involves localStorage/Supabase

**AI Integration:**
- New Claude prompts: Add to `src/lib/prompts.ts` (currently: `DIN_MAPPING_PROMPT`, `CROSS_ANALYSE_PROMPT`, etc.)
- New Claude function: Add to `src/lib/ai-client.ts` following pattern of `generateDINMapping()`, `suggestDINItem()`

**Type Definitions:**
- Domain entities: `src/lib/types.ts` (lines 79-380)
- Input/output schemas: Add interface to `types.ts` near related entities
- Step-specific state: Can be local component state or added to DINSession if persisted

## Special Directories

**src/app/api/**
- Purpose: Server-side API route handlers
- Generated: No
- Committed: Yes
- Pattern: Each endpoint is a directory with `route.ts` containing POST/GET handler
- Note: Executed server-side, can use environment variables and server-only libraries

**src/.claude/**
- Purpose: Claude project configuration and skill definitions
- Generated: No (managed externally)
- Committed: Yes (git tracked)
- Contains: Project settings, custom skills/capabilities for Claude Agent

**Docs/**
- Purpose: External documentation
- Generated: No
- Committed: Yes
- Note: Separate from `.planning/codebase/` (GSD analysis docs)

**.planning/codebase/**
- Purpose: GSD analysis documents (ARCHITECTURE.md, STRUCTURE.md, etc.)
- Generated: Yes (by `/gsd:map-codebase` orchestrator)
- Committed: Yes

## Data Model Overview

**Session Hierarchy:**

```
DINSession (root entity)
├── vision: ProgrammeVision
├── goals: ProgrammeGoal[]
├── scope: ProgrammeScope
├── sectorPlans: SectorPlan[] (per sector: PO, VO, Zakelijk)
├── pmcEntries: PMCEntry[]
├── benefits: DINBenefit[] (sectorId-scoped)
├── capabilities: DINCapability[] (sectorId-scoped)
├── efforts: DINEffort[] (sectorId-scoped, domain-tagged)
├── goalBenefitMaps: GoalBenefitMap[] (goal → benefit links)
├── benefitCapabilityMaps: BenefitCapabilityMap[] (benefit → capability links)
├── capabilityEffortMaps: CapabilityEffortMap[] (capability → effort links)
├── integratieAdvies: Record<sectorId, IntegratieAdviesResult | string>
├── sectorAnalyses: Record<sectorId, string> (JSON structure from Claude)
├── verrijkteSectorplannen: Record<sectorId, string>
├── crossAnalyse: string (JSON structure from Claude)
└── externalProjects: ExternalProject[] (optional)
```

**Sector Scoping:**
- Three predefined sectors: `"PO" | "VO" | "Zakelijk"` (defined in `types.ts` line 20)
- Benefits, Capabilities, Efforts are tagged with sectorId
- Cross-sector queries group by sectorId (e.g., `getBenefitsBySector()`)
- Integration advice generated per-sector via Claude API

**Entity Creation Pattern:**
- `createBenefit()`, `createCapability()`, `createEffort()` factory functions in `din-service.ts`
- Each generates UUID via `generateId()` (crypto.randomUUID())
- Empty profile/dossier fields initialized to defaults
- Status defaults: efforts start as "gepland", benefits have no status

---

*Structure analysis: 2026-03-30*
