# Codebase Concerns

**Analysis Date:** 2026-03-30

## Tech Debt

**Large Components Without Decomposition:**
- Issue: Multiple components exceed 1,000 lines without clear separation of concerns
- Files:
  - `src/components/steps/DINMappingStep.tsx` (1,859 lines)
  - `src/lib/word-export.ts` (1,551 lines)
  - `src/components/din/MergedDINView.tsx` (1,382 lines)
  - `src/components/din/DINCreatieWizard.tsx` (1,096 lines)
  - `src/components/steps/CrossAnalyseStep.tsx` (1,030 lines)
  - `src/components/steps/ExportStep.tsx` (1,028 lines)
- Impact: Difficult to test, maintain, and modify. Increased risk of cascading bugs when changing logic. Component reusability is compromised
- Fix approach: Break each large component into smaller, single-responsibility sub-components. Extract state management logic to custom hooks. Move business logic to utility functions in `src/lib`

**Implicit JSON Parsing with Fallback to Raw Text:**
- Issue: Multiple locations parse AI-generated JSON with a broad catch-all fallback that returns raw text as structured data
- Files:
  - `src/lib/ai-client.ts` (lines 78-113, 218-253)
  - `src/app/api/din-suggest/route.ts` (lines 46-64)
  - `src/app/api/din-mapping/route.ts` (lines 36-46)
- Impact: Downstream code may receive malformed data or plain text wrapped as JSON. Type assertions fail silently. Difficult to trace when AI response format changes
- Fix approach: Implement strict JSON schema validation using a library like `zod` or `io-ts`. Log parse failures with the full response for debugging. Distinguish between expected fallback responses and actual errors

**Hard-coded Token Limits in AI Calls:**
- Issue: Token limits vary across functions (4096, 8192, 15000, 16384) with no centralized configuration
- Files: `src/lib/ai-client.ts` (lines 126, 133, 279, 502)
- Impact: Changes to token budgets require hunting through multiple files. No visibility into why specific limits were chosen. Risk of exceeding API budgets
- Fix approach: Create a configuration object `AIConfig` in `src/lib/config.ts` with documented token limits per operation type. Reference centrally

**Dual Persistence with Silent Failures:**
- Issue: Supabase write failures are logged but don't propagate. localStorage becomes the only reliable storage if Supabase is misconfigured or offline
- Files: `src/lib/persistence.ts` (lines 62-68)
- Impact: Users may believe data is persisted when it's only stored locally. No alert when remote sync fails. On browser clear or new device, data is lost
- Fix approach: Add explicit sync status indicator. Show warning badge if Supabase sync is failing. Implement periodic retry mechanism with exponential backoff

**Unused `rank` Field in ProgrammeGoal:**
- Issue: ProgrammeGoal type includes `rank` field but it's never displayed, used in sorting, or exported
- Files: `src/lib/types.ts` (line 83), `src/lib/kib-import.ts` (line 48)
- Impact: Dead data in every goal. Confusion about goal prioritization. KiB import supports ranking but DIN system ignores it
- Fix approach: Either remove `rank` field entirely or implement goal prioritization UI/logic. If keeping, document why and how it should be used

## Known Bugs

**JSON Extraction Regex is Too Broad:**
- Symptoms: If an AI response contains multiple JSON objects, the regex captures only the first one. If JSON is embedded in explanatory text, extraction may fail
- Files: `src/lib/ai-client.ts` (line 79), `src/app/api/din-suggest/route.ts` (line 53)
- Pattern: `/\{[\s\S]*\}/` matches from first `{` to last `}`
- Trigger: Multi-object responses or responses with JSON-like examples in comments
- Workaround: Currently unclear. Falls back to raw text which breaks downstream type expectations
- Fix: Use JSON.parse with a proper parser or validate against expected schema

**Missing Error Context in API Responses:**
- Symptoms: Generic 500 error responses don't include which operation failed (din-mapping, cross-analyse, etc.)
- Files: All `src/app/api/*/route.ts` files
- Trigger: Any error during AI generation or file processing
- Workaround: None; user sees only generic message
- Fix: Include operation type and context in error response. Log full error stack server-side

**Supabase Client Initialization Missing Fallback:**
- Symptoms: Application crashes if `NEXT_PUBLIC_SUPABASE_URL` or `NEXT_PUBLIC_SUPABASE_ANON_KEY` are undefined
- Files: `src/lib/supabase.ts` (lines 3-4)
- Trigger: Environment variables not set or cleared accidentally
- Workaround: Set .env manually (not in git)
- Fix: Check env vars at runtime and gracefully disable Supabase features. Return null from sync functions instead of crashing

## Security Considerations

**Environment Variables Marked as Non-Secret but Used for Auth:**
- Risk: `NEXT_PUBLIC_SUPABASE_ANON_KEY` is intentionally public (per Supabase design) but client-side requests to Supabase are unencrypted if not using SSL
- Files: `src/lib/supabase.ts`, `.env` (not read for review, but noted)
- Current mitigation: Supabase handles RLS (Row-Level Security) server-side. Public key is only valid for rows user can access
- Recommendations:
  - Document why these vars are public in code comments
  - Ensure RLS policies are correctly configured in Supabase
  - Validate that session data is not leaked in localStorage (currently stores DIN data, not auth tokens)

**AI API Key Not Validated Client-Side:**
- Risk: If `ANTHROPIC_API_KEY` is accidentally exposed in frontend code or logs, it grants full API access
- Files: `src/lib/ai-client.ts`, API routes check `process.env.ANTHROPIC_API_KEY`
- Current mitigation: Key is only accessed in server-side route handlers, never exposed to client
- Recommendations:
  - Add code comments warning against moving AI client calls to frontend
  - Consider wrapping AI calls in a dedicated API layer with rate limiting
  - Log all AI API calls to audit trail for cost tracking

**File Upload Without Type Validation:**
- Risk: Users can upload arbitrary files as sector plans. If parsed as text without validation, malicious content could be injected into AI prompts
- Files: `src/app/api/parse-sector/route.ts` (line 19), `src/app/api/import-kib/route.ts` (line 22)
- Current mitigation: Files are converted to text only. No code execution risk
- Recommendations:
  - Validate file size (currently unlimited)
  - Reject files larger than 5MB
  - Sanitize extracted text before passing to AI prompts (remove null bytes, control characters)

## Performance Bottlenecks

**Token Limit Slicing Without Cost Visibility:**
- Problem: Multiple operations slice responses to 3000-15000 characters before passing to AI. No visibility into what's being truncated or token cost
- Files:
  - `src/lib/ai-client.ts` (lines 69, 114, 167, 337, 443, 520, 556)
  - Multiple slice operations with no logging
- Cause: Each operation independently manages truncation with no central strategy
- Improvement path:
  - Add debug logging to show what's being truncated and why
  - Implement token counting before truncating
  - Consider compression (summarization) instead of naive slicing

**Tokenization Logic for Cross-Sector Analysis Runs on Every Render:**
- Problem: `tokenize()` function in `src/lib/din-service.ts` (lines 249-275) is called during cluster analysis which may happen on every state update
- Files: `src/lib/din-service.ts` (lines 352-416 for benefit clustering)
- Cause: No memoization or caching of tokenization results
- Improvement path: Cache tokenized descriptions using a Map or memoization library. Validate impact with performance profiler

**Word Export Document Generation Not Streamed:**
- Problem: Entire Word document is buffered in memory before sending to client. Large projects may exceed heap limits
- Files: `src/lib/word-export.ts` (no streaming detected)
- Cause: Using `Packer.toBlob()` which buffers full output
- Improvement path: Stream document to response using `Packer.toStream()` if available. Add progress indicator for large exports

## Fragile Areas

**DIN Chain Building Logic:**
- Files: `src/lib/din-service.ts` (lines 552-625 for `buildChainsForSector`)
- Why fragile: Complex three-level join logic (benefit → capability → effort) with multiple filter operations. Off-by-one errors in mapping lookups would silently produce incomplete chains
- Safe modification:
  - Add comprehensive tests for all edge cases (orphaned items, circular references if ever introduced)
  - Use TypeScript `as const` on mapping IDs to prevent accidental type confusion
  - Log chain composition during development for debugging
- Test coverage: Gaps in testing of empty sectors, goals with no benefits, etc.

**AI Prompt Context Assembly:**
- Files: `src/lib/ai-client.ts` (lines 51-127 for `generateDINMapping`)
- Why fragile: Prompt construction by string concatenation. Changes to prompt order or whitespace could affect AI output. Slicing at fixed character positions (3000, 4000, 5000) loses content without warning
- Safe modification:
  - Move prompts to separate template files with clear variables
  - Use a prompt templating library (e.g., `mustache`)
  - Add debug mode to log full prompt before sending
  - Validate AI response schema before parsing
- Test coverage: No tests for prompt formatting or handling edge case inputs

**Session State Management in Context:**
- Files: `src/lib/session-context.tsx` (lines 32-97)
- Why fragile: All session mutations call `saveLocal()` but rely on localStorage size limits. No verification that saves succeed. Circular dependency between `currentStep` and `session` state could cause stale updates
- Safe modification:
  - Add error boundary around SessionProvider
  - Separate `currentStep` state from session data to avoid circular updates
  - Add quota checks before saving
  - Test with localStorage quota simulation
- Test coverage: No tests for concurrent updates or quota exhaustion

**Data Deduplication Logic:**
- Files: `src/lib/persistence.ts` (lines 41-48), `src/lib/din-service.ts` (lines 46-50)
- Why fragile: `deduplicateById()` assumes IDs are truly unique. If AI-generated items receive identical IDs (from crypto.randomUUID() collision or re-use), silent data loss occurs
- Safe modification:
  - Log when deduplication removes items
  - Add assertions that ID collisions are extremely rare
  - Consider using timestamp + random as ID backup
- Test coverage: No tests for deduplication behavior

## Scaling Limits

**Session Data in localStorage:**
- Current capacity: Most browsers limit localStorage to 5-10MB per domain
- Limit: With 4+ sectors, full DIN networks (200+ items) with metadata could approach 2-3MB when serialized
- Issue: Each session stored separately. Multiple concurrent sessions share same quota
- Scaling path:
  - Implement session archiving (move old sessions to IndexedDB)
  - Add warning when session size exceeds 1MB
  - Compress session JSON before storage
  - Consider server-side session storage if available (Supabase)

**AI API Rate Limits:**
- Current capacity: Anthropic API has per-minute token limits (varies by plan)
- Limit: Multiple users calling DIN mapping simultaneously could exceed quota
- Issue: No rate limiting or queuing in frontend
- Scaling path:
  - Implement job queue (Bull, RQ) on backend
  - Add user feedback for queued requests
  - Implement exponential backoff for retries
  - Document expected latency

**Word Document Export File Size:**
- Current capacity: No limit on document size
- Limit: Documents with 1000+ items could exceed practical file sizes (>20MB)
- Scaling path:
  - Add pagination to exports
  - Implement multi-file exports (one per sector)
  - Add compression option
  - Warn users if export will be large

## Dependencies at Risk

**Anthropic SDK Version Pinned Loosely:**
- Risk: `@anthropic-ai/sdk` at `^0.78.0` allows minor/patch updates. Model names in code (claude-sonnet-4-6, claude-opus-4-6) may become deprecated
- Files: `package.json` (line 12), `src/lib/ai-client.ts` (line 30)
- Impact: API breaking changes in SDK could fail at runtime. Model names may change
- Migration plan:
  - Move model names to configuration
  - Add SDK version pinning if stability is critical
  - Set up test alerts for new Claude model releases

**mammoth Dependency for Document Parsing:**
- Risk: `mammoth@^1.11.0` is actively maintained but extraction is lossy (only text, no formatting)
- Files: `src/app/api/parse-sector/route.ts` (line 2), `src/app/api/import-kib/route.ts` (line 3)
- Impact: Complex Word documents lose structure. Users must re-format text after upload
- Migration plan: Consider `docx` or `python-docx` via API if document structure preservation becomes critical

**docx Library for Export:**
- Risk: `docx@^9.6.0` is maintained but has limited styling support compared to programmatic Word API
- Files: `src/lib/word-export.ts` (line 1)
- Impact: Exported documents may have limited formatting control. Charts/graphs cannot be embedded
- Migration plan: Investigate `office-js` or server-side generation (e.g., LibreOffice) if rich formatting required

## Missing Critical Features

**No Offline Support:**
- Problem: Application requires network for AI features. No service worker or offline cache. All data is lost if offline
- Blocks: Field work, offline sessions
- Recommendation: Implement service worker with offline data sync strategy

**No Session Sharing or Collaboration:**
- Problem: Each user has isolated sessions. No way to share or co-edit DIN networks
- Blocks: Multi-user workshops, real-time feedback
- Recommendation: Implement shared session concept with WebSocket sync

**No Audit Trail or Version History:**
- Problem: No record of who changed what or when. No way to revert changes
- Blocks: Governance, accountability tracking
- Recommendation: Add audit log table and version control per session

**No Validation Rules for DIN Chain Completeness:**
- Problem: Users can save incomplete chains (benefits without capabilities, etc.)
- Blocks: Automatic report generation, data quality assurance
- Recommendation: Add validation step before export/save

## Test Coverage Gaps

**No Unit Tests for Core Business Logic:**
- Untested area: DIN service functions (chain building, clustering, gap analysis)
- Files: `src/lib/din-service.ts` (all functions)
- Risk: Bugs in core logic remain undetected. Refactoring is error-prone
- Priority: High

**No Integration Tests for AI API Flows:**
- Untested area: API routes that call Anthropic SDK
- Files: `src/app/api/*/route.ts` (all)
- Risk: AI prompt/response handling bugs discovered only in production
- Priority: High

**No Tests for Persistence Layer:**
- Untested area: localStorage/Supabase sync, deduplication
- Files: `src/lib/persistence.ts`
- Risk: Data loss scenarios undetected. Silent failures when storage quota exceeded
- Priority: Medium

**No Tests for Component State Management:**
- Untested area: Large step components, session context
- Files: `src/lib/session-context.tsx`, `src/components/steps/*`
- Risk: Race conditions, stale state bugs
- Priority: Medium

**No End-to-End Tests:**
- Untested area: Full user workflows (import → DIN mapping → export)
- Risk: Integration failures between components
- Priority: Medium

**No Performance Tests:**
- Untested area: Large data sets (100+ items per sector), document generation
- Risk: Slowdowns discovered only with real data
- Priority: Low

---

*Concerns audit: 2026-03-30*
