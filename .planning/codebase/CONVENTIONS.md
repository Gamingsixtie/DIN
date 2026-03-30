# Coding Conventions

**Analysis Date:** 2026-03-30

## Naming Patterns

**Files:**
- React components: PascalCase (`BenefitCard.tsx`, `DINMappingStep.tsx`, `ExportStep.tsx`)
- Library/utility files: camelCase (`din-service.ts`, `persistence.ts`, `ai-client.ts`)
- Route handlers: `route.ts` in API directories following Next.js convention
- Type files: `types.ts` for domain types

**Functions:**
- Regular functions: camelCase (`generateId()`, `createBenefit()`, `getBenefitsByGoal()`)
- React components/hooks: PascalCase (`Home()`, `BenefitCard()`, `useSession()`)
- Event handlers: `handle` prefix followed by camelCase (`handleCreate()`, `handleDelete()`, `handleAISuggest()`)
- Internal helper functions: camelCase, often defined with function keyword or arrow function

**Variables:**
- State: camelCase (`sessions`, `showCreate`, `newName`, `isAILoading`, `selectedVelden`)
- Constants: UPPER_SNAKE_CASE for exported module-level constants (`STORAGE_PREFIX`, `SECTORS`, `DOMAIN_LABELS`, `STATUS_LABELS`)
- Computed constants: camelCase within component scope (`BAAT_ZETVRAGEN`, `VERMOGEN_ZETVRAGEN`, `LEVEL_LABELS`, `VELD_LABELS`)
- Color/style maps: UPPER_SNAKE_CASE or camelCase Record objects (`SECTOR_COLORS`, `STATUS_STYLES`, `DOMAIN_DOT_COLORS`)

**Types:**
- Interfaces: PascalCase (`DINBenefit`, `DINCapability`, `BenefitSuggestion`, `BenefitCardProps`)
- Type aliases: PascalCase (`EffortStatus`, `SectorName`, `Priority`, `AanscherpVeld`)
- Discriminated unions: Use string literals for type discrimination (`"voorstel" | "goedgekeurd" | "afgewezen"`)

## Code Style

**Formatting:**
- ESLint with Next.js config enabled (see `package.json` devDependencies: `eslint`, `eslint-config-next`)
- Run via: `npm run lint`
- Tailwind CSS for styling — all class composition done inline via className attribute

**Linting:**
- Framework: ESLint (version 9.x)
- Config file: Uses Next.js default ESLint config (`eslint-config-next`)
- No custom `.eslintrc` file — inherits Next.js rules

**TypeScript Strict Mode:**
- Enabled in `tsconfig.json`: `"strict": true`
- Type annotations required for function parameters and return types
- Use `type` keyword for type imports: `import type { DINBenefit } from "@/lib/types"`

## Import Organization

**Order:**
1. Next.js and React imports (`import { useState } from "react"`, `import { NextRequest, NextResponse } from "next/server"`)
2. Internal lib/context imports (`import { useSession } from "@/lib/session-context"`)
3. Type imports (`import type { DINBenefit } from "@/lib/types"`)
4. Component imports (`import BenefitCard from "@/components/din/BenefitCard"`)
5. Utility/constant imports from lib (`import { SECTORS, STATUS_LABELS } from "@/lib/types"`)

**Path Aliases:**
- `@/*` maps to `./src/*` (defined in `tsconfig.json`)
- All imports use absolute paths with `@/` prefix: `@/lib/types`, `@/components/din/BenefitCard`, `@/lib/session-context`

## Error Handling

**Patterns:**
- API routes: Use try-catch with `NextResponse.json()` returning `{ success: boolean, error?: string, data?: any }`
- Client components: Catch errors with state management (`isAILoading`, `aiError` flags)
- Error instanceof check: `error instanceof Error ? error.message : "Fallback message"`
- Silent failures with logging: Catch errors in persistence operations, log with context prefix: `[persistence]`, `[kib]`, etc.

**Examples:**
- `src/app/api/din-mapping/route.ts`: Outer try-catch around request handling, inner try-catch for JSON parsing
- `src/components/din/BenefitCard.tsx`: Async operations wrapped in try-catch with error state and user feedback

## Logging

**Framework:** `console` methods only (no dedicated logging library)

**Patterns:**
- **Error logging:** `console.error()` with descriptive prefix and context
  - Example: `console.error("AI suggestie mislukt:", e)`
  - Example: `console.error(`[persistence] localStorage write failed for ${key}:`, e)`
- **Scope prefixes:** Bracket notation `[domain]` used to categorize origin: `[persistence]`, `[kib]`
- No info/debug/warn logging observed — errors only

## Comments

**When to Comment:**
- Methodiek explanations: Inline comments explain DIN methodology (e.g., "Batenprofiel conform DIN-methodiek")
- Source citations: Comments reference methodology books/chapters (e.g., "Werken aan Programma's, Hfst 8")
- Complex business logic: Explain "why", not "what" (the code shows the "what")
- State management notes: Document non-obvious state transitions (e.g., "Undo: bewaar vorige staat na toepassen")

**JSDoc/TSDoc:**
- Not extensively used
- Type-level documentation: Inline comments above interface fields explaining their purpose
- Example from `types.ts`: `bateneigenaar?: string;      // Eindverantwoordelijk voor realisatie (bijv. Sectormanager)`

## Function Design

**Size:**
- Component functions: 50-200+ lines (complex UI logic with multiple state managers)
- Utility functions: 10-40 lines (simple CRUD, filter operations)
- Nested helper functions: Defined within component scope when used only once

**Parameters:**
- React components: Single object parameter with destructuring (`{ benefit, onChange, onDelete, onAISuggest }`)
- Utility functions: Multiple typed parameters (`createBenefit(goalId: string, sectorId: string, description: string, title?: string)`)
- Type imports for parameter types: Use `type` keyword (`const handleAISuggest: (userPrompt?: string) => Promise<SuggestionType | null>`)

**Return Values:**
- Components: JSX element (React.ReactNode)
- Async functions: Promise-wrapped return types (`Promise<string>`, `Promise<SuggestionType | null>`)
- Void operations: Explicit `void` for state setters and side-effect functions
- Nullable returns: Use `T | null` pattern rather than `T | undefined`

## Module Design

**Exports:**
- Default export for React components: `export default function ComponentName() {}`
- Named exports for utility functions: `export function generateId(): string {}`
- Type exports: `export interface DINBenefit {...}`, `export type SectorName = ...`
- Constants: Mix of default and named exports depending on reusability

**Barrel Files:**
- Not used — imports specify full paths: `import { generateId } from "@/lib/din-service"`
- Each module has a single clear responsibility

**File Coupling:**
- `types.ts` is central (imported by almost all files for domain types)
- `persistence.ts` manages all localStorage/Supabase access
- `din-service.ts` contains DIN CRUD operations
- API routes import from lib layer, not from components

## React Component Patterns

**Client Components:**
- `"use client"` directive at top of file for interactive components (all step components, card components)
- Server components: Layout and page components without `"use client"`

**State Management:**
- Local state with `useState()` for UI state (expanded, loading flags, form values)
- Session context via `useSession()` hook for cross-component data
- localStorage with custom `loadLocal()`/`saveLocal()` functions for persistence

**Hooks:**
- Standard React hooks: `useState`, `useEffect`, `useCallback`, `useMemo`, `useRouter`, `useContext`
- Custom hook: `useSession()` from `@/lib/session-context` for session data access

## Data Structures

**Domain Objects:**
- All entities use `id: string` field (UUID via `crypto.randomUUID()`)
- Sector-specific data organized via `sectorId` field on entities
- Time data stored as ISO 8601 strings: `createdAt: string`, `updatedAt: string`

**Mapping Relationships:**
- Separate mapping types for many-to-many: `GoalBenefitMap`, `BenefitCapabilityMap`, `CapabilityEffortMap`
- Maps stored in arrays within session object, not as separate tables

---

*Convention analysis: 2026-03-30*
