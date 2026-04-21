---
status: awaiting_human_verify
trigger: "Cross-analyse stap 4 geeft 'Analyse mislukt' met JSON parse error"
created: 2026-04-06T12:00:00Z
updated: 2026-04-06T12:00:00Z
---

## Current Focus

hypothesis: Two issues compound — (1) callClaude has NO try-catch so Anthropic SDK errors (timeout, rate limit) propagate as unhandled exceptions inside callClaudeWithValidation retry loop, and (2) the client calls response.json() unconditionally without checking response.ok or content-type, so Vercel platform error pages (plain text) crash the client
test: Read code paths confirmed both issues
expecting: Fix both server-side error handling in callClaude and client-side response parsing
next_action: Apply fixes to both ai-client.ts and CrossAnalyseWizard.tsx

## Symptoms

expected: Stap 4 of the cross-analyse wizard should return JSON with consolidatie-advies and render it in StapConsolidatie component
actual: "Analyse mislukt" error shown, with message: Unexpected token 'A', "An error o"... is not valid JSON
errors: The error text "An error o..." is the start of "An error occurred..." - a Vercel/platform error returned as plain text, not JSON
reproduction: Run stap 4 "Consolidatie-advies genereren" in the cross-analyse wizard
started: Current behavior

## Eliminated

(none yet)

## Evidence

- timestamp: 2026-04-06T12:01:00Z
  checked: CrossAnalyseWizard.tsx handleAnalyse (line 198-209)
  found: Line 204 calls `response.json()` unconditionally without checking `response.ok` or content-type. If the server returns a non-JSON error (Vercel 504 page), this throws a SyntaxError.
  implication: Client-side needs defensive JSON parsing

- timestamp: 2026-04-06T12:02:00Z
  checked: ai-client.ts callClaude (line 48-64) and callClaudeWithValidation (line 147-171)
  found: callClaude has NO try-catch — if Anthropic SDK throws (timeout, rate limit, network error), the error propagates up to callClaudeWithValidation which also has no try-catch around callClaude. This means the error escapes to the API route's outer catch, which does return JSON — BUT the error message might be cryptic.
  implication: The real issue is the Vercel function timing out (maxDuration=120s) when opus model takes too long, causing Vercel to return its own error page (plain text, not JSON)

- timestamp: 2026-04-06T12:03:00Z
  checked: cross-analyse/route.ts line 207-212
  found: Uses model "claude-opus-4-6" for ALL steps including stap 4. Opus is slower and more likely to hit timeout. The API route has maxDuration=120 and the SDK timeout is 90s, but stap 4 with large payloads can still exceed Vercel's function timeout.
  implication: Even with maxDuration=120, complex consolidation analysis can timeout. The client must handle non-JSON responses gracefully.

## Resolution

root_cause: Two compounding issues — (1) callClaude() in ai-client.ts has no try-catch, so SDK errors (timeout/rate-limit) bubble up as unhandled exceptions that may bypass the route's JSON error response before Vercel's timeout kills the function, (2) CrossAnalyseWizard.tsx calls response.json() without checking response.ok or content-type, so when Vercel returns a plain-text error page (e.g. "An error occurred..."), the JSON parse fails with the observed error message.
fix: Three changes — (1) Added try-catch to callClaude() so SDK errors are caught and re-thrown with clear message, (2) Added try-catch around callClaude inside callClaudeWithValidation retry loop so SDK errors trigger retry instead of aborting, (3) Made CrossAnalyseWizard.tsx check response.ok and content-type before calling response.json(), with user-friendly error messages for timeout (504) and other server errors
verification: Build passes successfully
files_changed: [src/lib/ai-client.ts, src/components/cross-analyse/CrossAnalyseWizard.tsx]
