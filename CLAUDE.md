# DIN — Doelen-Inspanningennetwerk

Vervolg-app op "Klant in Beeld" (KiB). Deze app vertaalt programmadoelen naar concrete **baten, vermogens en inspanningen** via het Doelen-Inspanningennetwerk (DIN).

## Commands

```bash
npm run dev          # Development server (localhost:3000)
npm run build        # Production build
npm run lint         # ESLint
npx vercel --prod    # Deploy naar productie
```

## Kwaliteitseis: Verificatie bij elke feature

**VERPLICHT** bij elke wijziging of nieuwe feature:

1. **`npm run build`** moet slagen zonder fouten
2. **Functionele controle**: Verifieer dat bestaande functionaliteit niet kapot is — lees de relevante componenten, controleer imports, props, types
3. **Skills gebruiken**: Gebruik altijd de beschikbare skills (pim-dev-skill, frontend-design, interface-design, etc.) bij implementatie
4. **Methodiek volgen**: Elke feature moet aansluiten bij de DIN-methodiek uit `docs/programmaboek.doc`
5. **Geen stille failures**: Altijd gebruikersfeedback tonen bij acties (loading states, success/error meldingen)
6. **Direct committen en pushen** na elke werkende wijziging
7. **UX design voor alle output**: Alle AI-output, documenten en gegenereerde content MOET visueel aantrekkelijk en overzichtelijk zijn. Nooit platte tekst of raw markdown tonen — altijd renderen met gestructureerde opmaak (headings, kleuren, kaarten, bullet points). Dit geldt voor zowel de in-app weergave als de Word-export. Behandel elke output als een professioneel document.
8. **Tabellen in de export — letterlijk overnemen, niet zelf maken**: Als de wizard al een tabel of visualisatie heeft voor data (planning-gantt, begroting-advies, interne uren, sector-vertaling, etc.), neem die layout LETTERLIJK over in de export-componenten. Niet zelf een eigen variant bouwen. Pas hooguit een `compact`-prop toe om interactieve elementen te verbergen. De wizard is de bron van waarheid voor weergave; de export volgt.
9. **Geen UUIDs in user-facing tekst**: Verwijs nooit naar effort-IDs, capability-IDs of bundel-IDs in tekst die de gebruiker leest. Resolve altijd naar `title || description` via `session.efforts/capabilities/benefits`. Als geen match: weglaten of "—" tonen, nooit een raw UUID.
10. **Niets zelf verzinnen — alleen gesourcede data**: Verzin nooit zelf planning, kwartalen, mijlpalen, KPI-waarden, bedragen of fasering. Gebruik uitsluitend wat aantoonbaar in de bron staat: het DIN-netwerk (sessie / `src/lib/demo-snapshot.json`), het programmaplan, en de raming/begroting (`kostenraming` per inspanning, begroting-advies). Label elke waarde met de bron. Wat niet gesourcet is: toon expliciet **"te bepalen"** — nooit invullen alsof het vaststaat. Let op: baten hebben een 2-jaars `targetValue` (geen apart jaargetal); `quarter` staat vaak op "Nader te bepalen".
11. **Maximaal parallelle agents**: zet waar mogelijk meerdere agents parallel in om werk sneller en adaptiever te maken (onafhankelijk onderzoek, of niet-overlappende bestanden tegelijk bouwen). Houd file-ownership per agent gescheiden om conflicten te voorkomen; integreer, build en test (incl. opslag-verificatie) daarna centraal.

## Methodiek — DIN Framework

**Bron:** "Werken aan Programma's" (Prevaas & Van Loon), gebaseerd op Wijnen & Van der Tak (2002).
**Referentiedocument:** `docs/programmaboek.doc` — het volledige programmaboek met de methodiek.

### Wat is DIN?

DIN is een **instrument** — het woord staat voor **Doelen-Inspanningennetwerk**, niet voor drie losse letters. Het netwerk verbindt vier niveaus in een logische keten:

```
Doelen → Baten → Vermogens → Inspanningen
```

### De vier niveaus

| Niveau | Betekenis | Voorbeeld |
|---|---|---|
| **Doelen** | Programmadoelstellingen (uit KiB) | "Outside-in competentie organisatiebreed verankeren" |
| **Baten** | Gewenste effecten in de buitenwereld (klant, markt, organisatie) | "NPS stijgt van 32 naar 45" |
| **Vermogens** | Wat de organisatie moet *kunnen* om baten te realiseren | "Medewerkers beheersen klantgesprek-methodiek" |
| **Inspanningen** | Concrete projecten en activiteiten die vermogens opbouwen | "Training outside-in werken (Q2 2026)" |

### Batenprofielen

Elke baat heeft een **batenprofiel** met:
- Omschrijving
- Meetbare indicator
- Eigenaar
- Huidige waarde
- Gewenste waarde
- Meetmoment

### 4 Inspanningsdomeinen

Inspanningen worden ingedeeld in vier domeinen:

| Domein | Kleur | Voorbeelden |
|---|---|---|
| **Mens** | `#2563eb` (blauw) | Opleiding, training, bemensing, competentieontwikkeling |
| **Processen** | `#059669` (groen) | Werkwijzen, procedures, governance, samenwerking |
| **Data & Systemen** | `#7c3aed` (paars) | IT-systemen, data-infrastructuur, tooling, integraties |
| **Cultuur** | `#d97706` (amber) | Gedrag, mindset, waarden, leiderschapsontwikkeling |

### Redeneerrichtingen

- **Hoe-vraag** (rechts → links): "Hoe bereiken we dit doel?" → baten → vermogens → inspanningen
- **Waartoe-vraag** (links → rechts): "Waartoe dient deze inspanning?" → vermogen → baat → doel

### Veranderstrategie

Tussen doelen/baten en vermogens/inspanningen ligt de **veranderstrategie**: de keuze hoe de organisatie de gewenste verandering wil realiseren.

## Input voor de app

### 1. Uit KiB (importeren)
- Vastgestelde visie (uitgebreid + beknopt)
- Top-doelen (na dot voting)
- Scope (in/buiten)

### 2. Sectorplannen (uploaden/invoeren)
- PO-sectorplan
- VO-sectorplan
- Zakelijk/Professionals-sectorplan
- Data & Tech roadmap

### 3. Product-marktcombinaties (invoeren/importeren)
- Welke producten/diensten × welke marktsegmenten
- Huidige performance per combinatie
- Strategische prioriteit per combinatie

## App Flow (6 stappen)

1. **Import & Opzet** — KiB-import, sectorplannen upload, PMC-definitie
2. **DIN-Mapping per doel** — Per doel: baten (met profielen), vermogens, inspanningen
3. **Cross-analyse** — Synergie-matrix, hefboomwerking, gap-analyse
4. **Prioritering & Planning** — Dot voting, tijdlijn, afhankelijkheden
5. **Sectorplan-integratie** — Per sector: welke baten, vermogens, inspanningen
6. **Export** — Programmaplan, sectorale vertalingen, DIN-overzicht, roadmap

## Architectuur

### Stack
- **Next.js 16** + TypeScript + Tailwind CSS 4
- **Supabase** voor database en auth
- **Vercel** voor hosting/deployment
- **App Router** (src/app/ directory)

### Branding
- Cito blauw: `#003366` (cito-blue)
- Alle UI en AI output in het **Nederlands** (nl-NL)
- Geen Engelse termen in de interface

### Dual Persistence Patroon

Geleerde lessen uit KiB — altijd volgen:
1. **localStorage EERST schrijven** (synchronous), dan Supabase (async)
2. **Nooit lege state opslaan** — check altijd of data aanwezig is voor je schrijft
3. **Deduplicatie van IDs** bij AI-hergeneratie — voorkom dubbele records
4. **Sync-first**: localStorage is de bron van waarheid tijdens de sessie

### Database Schema

```sql
-- Import uit KiB
programme_goals (id, name, description, rank, source_session_id)
programme_vision (id, uitgebreid, beknopt, source_session_id)
programme_scope (id, in_scope[], out_scope[])

-- Sectorplannen
sector_plans (id, sector_name, raw_text, parsed_content, uploaded_at)

-- Product-marktcombinaties
pmc_entries (id, product, market_segment, priority, current_performance)

-- DIN-keten
din_benefits (id, goal_id FK, description, indicator, indicator_owner,
              current_value, target_value, measurement_moment)
din_capabilities (id, description, related_sectors[])
din_efforts (id, description, domain, quarter, responsible_sector, status, dependencies[])
-- domain: 'mens' | 'processen' | 'data_systemen' | 'cultuur'

-- Koppelingen
goal_benefit_map (goal_id, benefit_id)
benefit_capability_map (benefit_id, capability_id)
capability_effort_map (capability_id, effort_id)
effort_pmc_map (effort_id, pmc_id)
effort_sector_map (effort_id, sector_plan_id)
```

### AI Prompts

1. **DIN-mapping**: doel + sectorplannen → baten, vermogens, inspanningen
2. **Cross-analyse**: alle DIN-netwerken → synergieën, gaps, hefbomen
3. **Sectorplan-integratie**: sectorplan + inspanningen → sectorale vertaling
4. **Programmaplan**: alle DIN-data → samenhangend document
5. **Batenprofiel**: baat → meetbare indicator, eigenaar, waarden

## Projectstructuur

```
DIN/
├── CLAUDE.md                          # Dit bestand
├── docs/
│   └── programmaboek.doc             # Methodiek referentie (Prevaas & Van Loon)
├── Documents/
│   └── plan-vervolg-app.md           # Volledig projectplan
├── src/
│   ├── app/
│   │   ├── layout.tsx                # Root layout (nl-NL, Cito branding)
│   │   ├── page.tsx                  # Home: sessie kiezen/aanmaken
│   │   ├── globals.css               # Tailwind + Cito/DIN tokens
│   │   ├── api/
│   │   │   ├── import-kib/           # Import KiB uitkomsten
│   │   │   ├── parse-sector/         # Sectorplan parsing
│   │   │   ├── din-mapping/          # AI DIN-keten generatie
│   │   │   ├── cross-analyse/        # Synergie/gap analyse
│   │   │   └── export/               # Programmaplan export
│   │   └── sessies/
│   │       └── [id]/
│   │           ├── page.tsx          # Sessie flow
│   │           ├── feedback/         # Async feedback
│   │           └── stemmen/          # Dot voting
│   ├── components/
│   │   ├── steps/                    # Stap-componenten (Import, DIN, Cross, etc.)
│   │   ├── din/                      # DIN-specifieke componenten
│   │   ├── feedback/                 # Hergebruik uit KiB
│   │   └── ui/                       # Hergebruik uit KiB
│   └── lib/
│       ├── types.ts                  # TypeScript types
│       ├── persistence.ts            # Dual persistence (sync-first)
│       ├── session-context.tsx        # Session state management
│       ├── din-service.ts            # DIN CRUD operaties
│       ├── kib-import.ts             # KiB data import
│       └── prompts.ts               # DIN-specifieke AI prompts
├── supabase-schema.sql               # Database schema
└── .claude/
    └── skills/                       # AI agent skills (van pim-skills repo)
        ├── pim-dev-skill/
        ├── frontend-design/
        ├── interface-design/
        ├── klant-in-beeld/
        ├── ui-design-system/
        └── web-asset-generator/
```

## Skills (van pim-skills repo)

De volgende skills zijn beschikbaar in `.claude/skills/`:

| Skill | Gebruik voor |
|---|---|
| `pim-dev-skill` | Next.js/React + Python dev, Cito context, debuggen |
| `frontend-design` | Opvallende, productie-grade frontend interfaces |
| `interface-design` | Dashboards, admin panels, SaaS apps met craft |
| `klant-in-beeld` | KiB operaties: sessies, deploys, ID-fixes |
| `ui-design-system` | Design tokens, kleurpaletten, typografie, spacing |
| `web-asset-generator` | Favicons, app icons, social media images |

## Domain Rules

- KiB-import is altijd het startpunt: visie, doelen (top 5), scope
- Sectorplannen: PO, VO, Zakelijk/Professionals, Data & Tech
- Product-marktcombinaties met prioriteit en performance
- Async feedback en dot voting hergebruik uit KiB-patronen
- DIN = Doelen-Inspanningennetwerk — gebruik altijd de volledige term bij eerste vermelding

<!-- GSD:project-start source:PROJECT.md -->
## Project

**DIN — Doelen-Inspanningennetwerk**

Een vervolg-app op "Klant in Beeld" (KiB) waarmee programmamanagers doelstellingen vertalen naar concrete baten, vermogens en inspanningen via het Doelen-Inspanningennetwerk (DIN). De app begeleidt stapsgewijs door de DIN-methodiek — van KiB-input en sectorplannen tot een compleet programmaplan met roadmap.

**Core Value:** **Methodische samenhang**: elke stap bouwt voort op de vorige, AI-output is getoetst aan het programmaboek (Prevaas & Van Loon), en het resultaat is een samenhangende keten van doelen → baten → vermogens → inspanningen die de gebruiker kan presenteren aan stakeholders.

### Constraints

- **Tech stack**: Next.js 16, TypeScript, Tailwind CSS 4 — bestaande stack behouden
- **Taal**: Alle UI en AI-output in het Nederlands (nl-NL)
- **Branding**: Cito blauw (#003366) als primaire kleur
- **Persistence**: localStorage-first (sync-first patroon uit KiB)
- **AI**: OpenAI API via Next.js API routes
- **Bronmateriaal**: `docs/programmaboek.doc` is de methodische autoriteit
- **Deployment**: Vercel
<!-- GSD:project-end -->

<!-- GSD:stack-start source:codebase/STACK.md -->
## Technology Stack

## Languages
- TypeScript 5.8.0 - Full codebase (frontend and backend)
- JSX/TSX - React components and Next.js pages
- JavaScript - PostCSS configuration
## Runtime
- Node.js (version not explicitly specified in package.json, inferred from Next.js 16.1.0)
- npm - Managing dependencies
- Lockfile: `package-lock.json` present
## Frameworks
- Next.js 16.1.0 - Full-stack React framework for routing, SSR, and API routes
- React 19.1.0 - UI library and component framework
- React DOM 19.1.0 - DOM rendering for React
- Tailwind CSS 4.1.0 - Utility-first CSS framework for UI styling
- PostCSS 8.5.0 - CSS transformation pipeline
- docx 9.6.0 - Generate and manipulate Word documents for export functionality
- mammoth 1.11.0 - Extract text from .docx and .doc files during import
## Key Dependencies
- @anthropic-ai/sdk 0.78.0 - Anthropic Claude API client for AI-powered DIN mapping and analysis
- @supabase/supabase-js 2.49.0 - Supabase client library for database and authentication
## Development Dependencies
- ESLint 9.0.0 - JavaScript/TypeScript linting
- eslint-config-next 16.1.0 - Next.js recommended ESLint configuration
- @eslint/eslintrc 3.3.0 - ESLint config utilities
- TypeScript 5.8.0 - Language support
- @types/node 22.0.0 - Node.js type definitions
- @types/react 19.1.0 - React type definitions
- @types/react-dom 19.1.0 - React DOM type definitions
- @tailwindcss/postcss 4.1.0 - Tailwind CSS PostCSS plugin
## Configuration
- Environment variables configured via Next.js `.env.local` (not committed)
- Required variables:
- `next.config.ts` - Next.js configuration (minimal, uses defaults)
- `tsconfig.json` - TypeScript compiler options
- `postcss.config.mjs` - PostCSS configuration with Tailwind CSS plugin
## Platform Requirements
- Node.js environment with npm
- Next.js dev server (`npm run dev`)
- Node.js 16.8+ (required by Next.js 16.1.0)
- Environment variables configured in deployment platform
- Deployment via `npm run build` and `npm start`
- Next.js standalone server or serverless runtime (Vercel, AWS Lambda, etc.)
## Build & Dev Commands
<!-- GSD:stack-end -->

<!-- GSD:conventions-start source:CONVENTIONS.md -->
## Conventions

## Naming Patterns
- React components: PascalCase (`BenefitCard.tsx`, `DINMappingStep.tsx`, `ExportStep.tsx`)
- Library/utility files: camelCase (`din-service.ts`, `persistence.ts`, `ai-client.ts`)
- Route handlers: `route.ts` in API directories following Next.js convention
- Type files: `types.ts` for domain types
- Regular functions: camelCase (`generateId()`, `createBenefit()`, `getBenefitsByGoal()`)
- React components/hooks: PascalCase (`Home()`, `BenefitCard()`, `useSession()`)
- Event handlers: `handle` prefix followed by camelCase (`handleCreate()`, `handleDelete()`, `handleAISuggest()`)
- Internal helper functions: camelCase, often defined with function keyword or arrow function
- State: camelCase (`sessions`, `showCreate`, `newName`, `isAILoading`, `selectedVelden`)
- Constants: UPPER_SNAKE_CASE for exported module-level constants (`STORAGE_PREFIX`, `SECTORS`, `DOMAIN_LABELS`, `STATUS_LABELS`)
- Computed constants: camelCase within component scope (`BAAT_ZETVRAGEN`, `VERMOGEN_ZETVRAGEN`, `LEVEL_LABELS`, `VELD_LABELS`)
- Color/style maps: UPPER_SNAKE_CASE or camelCase Record objects (`SECTOR_COLORS`, `STATUS_STYLES`, `DOMAIN_DOT_COLORS`)
- Interfaces: PascalCase (`DINBenefit`, `DINCapability`, `BenefitSuggestion`, `BenefitCardProps`)
- Type aliases: PascalCase (`EffortStatus`, `SectorName`, `Priority`, `AanscherpVeld`)
- Discriminated unions: Use string literals for type discrimination (`"voorstel" | "goedgekeurd" | "afgewezen"`)
## Code Style
- ESLint with Next.js config enabled (see `package.json` devDependencies: `eslint`, `eslint-config-next`)
- Run via: `npm run lint`
- Tailwind CSS for styling — all class composition done inline via className attribute
- Framework: ESLint (version 9.x)
- Config file: Uses Next.js default ESLint config (`eslint-config-next`)
- No custom `.eslintrc` file — inherits Next.js rules
- Enabled in `tsconfig.json`: `"strict": true`
- Type annotations required for function parameters and return types
- Use `type` keyword for type imports: `import type { DINBenefit } from "@/lib/types"`
## Import Organization
- `@/*` maps to `./src/*` (defined in `tsconfig.json`)
- All imports use absolute paths with `@/` prefix: `@/lib/types`, `@/components/din/BenefitCard`, `@/lib/session-context`
## Error Handling
- API routes: Use try-catch with `NextResponse.json()` returning `{ success: boolean, error?: string, data?: any }`
- Client components: Catch errors with state management (`isAILoading`, `aiError` flags)
- Error instanceof check: `error instanceof Error ? error.message : "Fallback message"`
- Silent failures with logging: Catch errors in persistence operations, log with context prefix: `[persistence]`, `[kib]`, etc.
- `src/app/api/din-mapping/route.ts`: Outer try-catch around request handling, inner try-catch for JSON parsing
- `src/components/din/BenefitCard.tsx`: Async operations wrapped in try-catch with error state and user feedback
## Logging
- **Error logging:** `console.error()` with descriptive prefix and context
- **Scope prefixes:** Bracket notation `[domain]` used to categorize origin: `[persistence]`, `[kib]`
- No info/debug/warn logging observed — errors only
## Comments
- Methodiek explanations: Inline comments explain DIN methodology (e.g., "Batenprofiel conform DIN-methodiek")
- Source citations: Comments reference methodology books/chapters (e.g., "Werken aan Programma's, Hfst 8")
- Complex business logic: Explain "why", not "what" (the code shows the "what")
- State management notes: Document non-obvious state transitions (e.g., "Undo: bewaar vorige staat na toepassen")
- Not extensively used
- Type-level documentation: Inline comments above interface fields explaining their purpose
- Example from `types.ts`: `bateneigenaar?: string;      // Eindverantwoordelijk voor realisatie (bijv. Sectormanager)`
## Function Design
- Component functions: 50-200+ lines (complex UI logic with multiple state managers)
- Utility functions: 10-40 lines (simple CRUD, filter operations)
- Nested helper functions: Defined within component scope when used only once
- React components: Single object parameter with destructuring (`{ benefit, onChange, onDelete, onAISuggest }`)
- Utility functions: Multiple typed parameters (`createBenefit(goalId: string, sectorId: string, description: string, title?: string)`)
- Type imports for parameter types: Use `type` keyword (`const handleAISuggest: (userPrompt?: string) => Promise<SuggestionType | null>`)
- Components: JSX element (React.ReactNode)
- Async functions: Promise-wrapped return types (`Promise<string>`, `Promise<SuggestionType | null>`)
- Void operations: Explicit `void` for state setters and side-effect functions
- Nullable returns: Use `T | null` pattern rather than `T | undefined`
## Module Design
- Default export for React components: `export default function ComponentName() {}`
- Named exports for utility functions: `export function generateId(): string {}`
- Type exports: `export interface DINBenefit {...}`, `export type SectorName = ...`
- Constants: Mix of default and named exports depending on reusability
- Not used — imports specify full paths: `import { generateId } from "@/lib/din-service"`
- Each module has a single clear responsibility
- `types.ts` is central (imported by almost all files for domain types)
- `persistence.ts` manages all localStorage/Supabase access
- `din-service.ts` contains DIN CRUD operations
- API routes import from lib layer, not from components
## React Component Patterns
- `"use client"` directive at top of file for interactive components (all step components, card components)
- Server components: Layout and page components without `"use client"`
- Local state with `useState()` for UI state (expanded, loading flags, form values)
- Session context via `useSession()` hook for cross-component data
- localStorage with custom `loadLocal()`/`saveLocal()` functions for persistence
- Standard React hooks: `useState`, `useEffect`, `useCallback`, `useMemo`, `useRouter`, `useContext`
- Custom hook: `useSession()` from `@/lib/session-context` for session data access
## Data Structures
- All entities use `id: string` field (UUID via `crypto.randomUUID()`)
- Sector-specific data organized via `sectorId` field on entities
- Time data stored as ISO 8601 strings: `createdAt: string`, `updatedAt: string`
- Separate mapping types for many-to-many: `GoalBenefitMap`, `BenefitCapabilityMap`, `CapabilityEffortMap`
- Maps stored in arrays within session object, not as separate tables
<!-- GSD:conventions-end -->

<!-- GSD:architecture-start source:ARCHITECTURE.md -->
## Architecture

## Pattern Overview
- Step-based workflow (6 sequential phases) for DIN (Doelen-Inspanningennetwerk) planning
- Domain-driven design with clear separation between UI components, business logic, and data persistence
- AI-augmented form generation using Anthropic Claude API via Next.js API routes
- Local-first persistence strategy (localStorage → async Supabase)
- Sector-aware data modeling with cross-sector analysis capabilities
## Layers
- Purpose: Render UI components and handle user interactions
- Location: `src/components/` (both page routes and reusable components)
- Contains: React TSX components for steps, DIN cards, wizards, and UI utilities
- Depends on: Session context, DIN service utilities, type definitions
- Used by: Next.js App Router pages
- Purpose: Manage application state and persist session data
- Location: `src/lib/session-context.tsx`
- Contains: React Context provider, session loading/creation/updating logic
- Depends on: Persistence layer (localStorage/Supabase), type definitions
- Used by: Page components and step components via `useSession()` hook
- Purpose: Handle DIN entity creation, querying, and domain operations
- Location: `src/lib/din-service.ts`
- Contains: CRUD generators for benefits, capabilities, efforts; filtering helpers; cross-analysis utilities
- Depends on: Type definitions, persistence utilities
- Used by: Components, API routes, and AI client
- Purpose: Manage data storage (localStorage + Supabase dual-write)
- Location: `src/lib/persistence.ts`
- Contains: localStorage sync/load, dual persistence pattern, deduplication
- Depends on: None (standalone)
- Used by: Session context, business logic
- Purpose: Orchestrate Claude API calls for domain-specific generation tasks
- Location: `src/lib/ai-client.ts`
- Contains: Wrapper around Anthropic SDK, structured prompt formatting, response parsing
- Depends on: Type definitions, prompts configuration
- Used by: API routes for DIN mapping, cross-analysis, sectorplan analysis
- Purpose: Handle server-side operations (file upload, AI calls, exports)
- Location: `src/app/api/[endpoint]/route.ts`
- Contains: POST/GET handlers for file parsing, sector analysis, DIN generation, exports
- Depends on: AI client, business logic, file processing libraries
- Used by: Front-end components via fetch() calls
- Purpose: Define domain entities and contracts
- Location: `src/lib/types.ts`
- Contains: Interfaces for DINSession, DINBenefit, DINCapability, DINEffort, cross-analysis results
- Depends on: None
- Used by: All layers
## Data Flow
```
```
- **Source of truth:** `DINSession` object in React Context
- **Backing store:** localStorage (immediate, reliable)
- **Remote sync:** Supabase (optional, async, can fail gracefully)
- **Deduplication:** Applied when merging AI-generated items to prevent duplicates on regeneration
## Key Abstractions
- Purpose: Root domain entity representing entire programmaplan state
- Examples: `src/lib/types.ts` line 320
- Pattern: Single source of truth for all user data (goals, benefits, capabilities, efforts, mappings, analysis results)
- **DINBenefit:** Benefit (baat) with owner, indicator, current/target values
- **DINCapability:** Capability (vermogen) with profiel (as-is/to-be), maturity levels
- **DINEffort:** Initiative (inspanning) with domain, status, dossier profile, quarter planning
- Pattern: Each entity is sector-scoped; mappings (goalBenefitMap, etc.) connect them
- Purpose: AI-guided questionnaire for DIN item creation
- Location: `src/components/din/DINCreatieWizard.tsx`
- Pattern: Multi-step form with dynamic questions → Claude API call → structured JSON parsing → entity creation
- Purpose: Encapsulate one phase of the workflow
- Examples: `src/components/steps/ImportStep.tsx`, `SectorWerkStep.tsx`, `DINMappingStep.tsx`
- Pattern: Each step loads session, renders domain-specific UI, updates session on save
- Benefits, Capabilities, Efforts are all tagged with sectorId
- Cross-sector analysis identifies overlaps via `findSharedCapabilities()`
- Per-sector integration advice generated via `generateSectorIntegratie()`
## Entry Points
- Location: `src/app/page.tsx`
- Triggers: Browser navigation to `/`
- Responsibilities: Session list management, creation/deletion, demo loading, navigation to session detail
- Location: `src/app/sessies/[id]/page.tsx`
- Triggers: Navigation from home or direct URL
- Responsibilities: SessionProvider wrapper, step navigation, progress tracking, session loading
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
- AI API failures logged to console, user shown error message with retry option
- File upload failures caught in try/catch blocks, user shown specific error (e.g., "Ongeldig JSON formaat")
- Persistence failures logged; localStorage success is critical path, Supabase failure does not block UI
- Session loading failures show "Sessie laden..." spinner indefinitely (should timeout)
- `src/app/api/parse-sector/route.ts` (line 38-49): File parsing errors
- `src/lib/kib-import.ts` (line 24-29): JSON parsing validation
- `src/lib/ai-client.ts` (all callClaude calls): API failures silently return empty string
## Cross-Cutting Concerns
- Approach: `console.error()` and `console.log()` for debugging
- Locations: persistence errors (`src/lib/persistence.ts`), AI client errors (implicit)
- Approach: Type-level via TypeScript interfaces + runtime checks in importers
- Examples: KiB JSON shape validation in `src/lib/kib-import.ts`
- UI-level: Form fields required, questionnaire answers validated before API call
- Approach: None implemented; all data stored client-side or per-session key
- Supabase client created but not authenticated (anon key only, `src/lib/supabase.ts`)
- Approach: Dutch language hardcoded throughout UI and prompts
- Locale: `nl-NL` for date formatting in home page (`src/app/page.tsx` line 219)
<!-- GSD:architecture-end -->

<!-- GSD:workflow-start source:GSD defaults -->
## GSD Workflow Enforcement

Before using Edit, Write, or other file-changing tools, start work through a GSD command so planning artifacts and execution context stay in sync.

Use these entry points:
- `/gsd:quick` for small fixes, doc updates, and ad-hoc tasks
- `/gsd:debug` for investigation and bug fixing
- `/gsd:execute-phase` for planned phase work

Do not make direct repo edits outside a GSD workflow unless the user explicitly asks to bypass it.
<!-- GSD:workflow-end -->

<!-- GSD:profile-start -->
## Developer Profile

> Profile not yet configured. Run `/gsd:profile-user` to generate your developer profile.
> This section is managed by `generate-claude-profile` -- do not edit manually.
<!-- GSD:profile-end -->
