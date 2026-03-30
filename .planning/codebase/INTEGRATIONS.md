# External Integrations

**Analysis Date:** 2026-03-30

## APIs & External Services

**Anthropic Claude API:**
- Claude AI models for structured generation and analysis
  - SDK/Client: `@anthropic-ai/sdk` (version 0.78.0)
  - Auth: `ANTHROPIC_API_KEY` (server-side environment variable)
  - Location: `src/lib/ai-client.ts`
  - Models used:
    - `claude-sonnet-4-6` - Default model for most DIN mapping and analysis tasks
    - `claude-opus-4-6` - More capable model for complex cross-analysis and programma planning
  - Functions using API:
    - `generateDINMapping()` - Creates DIN networks from goals and sector plans
    - `generateCrossAnalyse()` - Analyzes cross-sector patterns in DIN data
    - `generateSectorIntegratie()` - Provides integration advice for sector strategies
    - `generateProgrammaPlan()` - Generates complete programme plans
    - `generateBatenprofiel()` - Creates benefit profiles
    - `analyzeSectorPlan()` - Analyzes sectorplans for DIN alignment
    - `suggestDINItem()` - Suggests improvements to DIN items (benefits, capabilities, efforts)
    - `createDINItem()` - Creates new DIN items with domain-specific guidance
    - `recommendDomain()` - Recommends DIMA domains for efforts
    - `generateVerrijktSectorplan()` - Enriches sectorplans with DIN content

## Data Storage

**Databases:**
- Supabase PostgreSQL
  - Connection: `NEXT_PUBLIC_SUPABASE_URL` (public), `NEXT_PUBLIC_SUPABASE_ANON_KEY` (public anon auth)
  - Client: `@supabase/supabase-js` (version 2.49.0)
  - Initialization: `src/lib/supabase.ts`
  - Usage pattern: Client-side anonymous authentication

**File Storage:**
- Local filesystem only
  - Word document export handled by `docx` library (in-memory generation)
  - Document files (`.docx`) imported via HTTP file upload to API routes

**Caching:**
- Browser localStorage
  - Prefix: `din_` for all keys
  - Pattern: Dual persistence (localStorage sync, Supabase async)
  - Location: `src/lib/persistence.ts`
  - Managed by: `saveLocal()`, `loadLocal()`, `dualSave()`, `dualLoad()` functions

## Authentication & Identity

**Auth Provider:**
- Supabase (anon/public auth)
  - Implementation: Anonymous/public key-based access
  - No specific user authentication required (public anon key in env)
  - Client initialized in: `src/lib/supabase.ts`

## Monitoring & Observability

**Error Tracking:**
- None detected - Manual error handling in try/catch blocks

**Logs:**
- Browser console logging only
- Server-side errors logged via console.error() in `src/lib/persistence.ts`
- API route errors returned in JSON responses

## CI/CD & Deployment

**Hosting:**
- Designed for Vercel or serverless Node.js environments
- Next.js supports: Vercel, AWS Lambda, Google Cloud Run, AWS Amplify, etc.
- Environment variables configured per deployment platform

**CI Pipeline:**
- None detected in codebase (no GitHub Actions, GitLab CI, etc.)

## Environment Configuration

**Required env vars:**
- `ANTHROPIC_API_KEY` - Anthropic API token for Claude access (server-side secret)
- `NEXT_PUBLIC_SUPABASE_URL` - Supabase project URL (public)
- `NEXT_PUBLIC_SUPABASE_ANON_KEY` - Supabase anonymous access key (public)

**Secrets location:**
- `.env.local` - Local development (not committed)
- Deployment platform secrets manager - Production

**Env var usage patterns:**
- Located in: `src/lib/supabase.ts`, `src/lib/ai-client.ts`
- API routes check for `ANTHROPIC_API_KEY` and gracefully degrade if missing
- Supabase keys are marked NEXT_PUBLIC (intentionally exposed to client)

## Document Processing

**Input:**
- File upload via multipart/form-data to API routes:
  - `src/app/api/import-kib/route.ts` - Imports KiB programme data
  - `src/app/api/parse-sector/route.ts` - Parses sectorplan files
- Supported formats:
  - `.docx` (Word documents) - Converted to text via `mammoth.extractRawText()`
  - `.doc` (Legacy Word) - Same as .docx
  - `.json` (Structured data) - Parsed directly
  - Plain text - Handled as fallback

**Output:**
- Export to `.docx` via `docx` library
- Location: `src/lib/word-export.ts`
- Used by: `src/app/api/export/route.ts` and export steps
- Features: Formatted tables, DIN networks, sector analysis, benefits/capabilities/efforts

## Webhooks & Callbacks

**Incoming:**
- None detected

**Outgoing:**
- None detected

## Data Flow Pattern

**Session-based architecture:**
1. Load data from localStorage (sync source of truth) → `src/lib/persistence.ts`
2. Fallback to Supabase if localStorage empty → async operation
3. User edits data via UI
4. Save to localStorage immediately (sync)
5. Async save to Supabase (may fail gracefully) → dual persistence pattern
6. Send data to Claude API for AI generation → `src/lib/ai-client.ts`
7. Export to Word document → `src/lib/word-export.ts`

**API patterns:**
- All AI generation routes follow same pattern:
  1. Extract JSON body with required fields
  2. Check if `ANTHROPIC_API_KEY` set (degrade gracefully if missing)
  3. Call Claude via `src/lib/ai-client.ts`
  4. Parse JSON response
  5. Return structured result or raw response if parse fails

---

*Integration audit: 2026-03-30*
