# Domain Pitfalls

**Domain:** AI-assisted programmamanagement (DIN-methodiek) multi-step wizard app
**Researched:** 2026-03-30
**Confidence:** HIGH (based on direct codebase analysis and established patterns in AI/LLM application development)

---

## Critical Pitfalls

Mistakes that cause rewrites, data corruption, or fundamentally broken user experience.

### Pitfall 1: AI Generates Methodology-Violating Output That Passes Silently

**What goes wrong:** The AI produces benefits with verbs in the title (methodology requires comparative adjectives), capabilities phrased as actions (should describe what the org *can do*), or efforts without verbs. The app stores this without validation, producing a DIN network that fails methodology review.

**Why it happens:** The prompts contain validation rules ("VERPLICHTE VALIDATIE VAN DE TITEL") but these are *instructions to the LLM*, not enforced programmatically. LLMs follow instructions probabilistically -- they will violate rules 10-20% of the time, especially when the user-provided context pulls the model toward non-conforming phrasing. Currently, the JSON response is parsed and stored directly without any server-side validation against methodology rules.

**Consequences:**
- Programmaplan contains non-methodological formulations, undermining credibility with stakeholders
- User trusts AI output and does not notice violations until export/presentation
- Cross-analysis clusters items that are methodologically different things (a benefit phrased as an effort gets compared with real efforts)

**Prevention:**
1. Add a post-processing validation layer in `ai-client.ts` that checks: benefits titles contain comparative adjectives and no verbs; capability titles contain no action verbs; effort titles contain verbs
2. Use Zod schemas that encode methodology rules (not just JSON structure)
3. When validation fails, either auto-correct (re-prompt with specific fix instruction) or flag to user with explanation
4. Add a "methodology check" indicator per item in the UI

**Detection:** Search stored benefits for verb patterns ("implementeren", "verbeteren", "uitvoeren"). Count methodology violations per session. If >15% of items violate, the validation layer is not working.

**Phase:** Address in the AI quality improvement phase. This is the single highest-impact fix.

---

### Pitfall 2: Context Truncation Silently Destroys Critical Information

**What goes wrong:** Sector plans are sliced at fixed character positions (3000, 4000, 5000, 10000, 15000 chars) before being sent to the AI. The truncated content may cut off the most relevant sections -- and neither the user nor the system knows what was lost.

**Why it happens:** The codebase uses `.slice(0, N)` extensively:
- `sectorPlan.rawText.slice(0, 3000)` in `generateDINMapping`
- `data.sectorPlan.slice(0, 4000)` in `generateSectorIntegratie`
- `JSON.stringify(sessionData).slice(0, 15000)` in `generateProgrammaPlan`
- `context.sectorPlanText.slice(0, 2000)` in `suggestDINItem`

These are arbitrary limits with no awareness of content structure. A sector plan with the most relevant KiB-related content in paragraphs 4-5 will have exactly that content truncated.

**Consequences:**
- AI generates DIN items that ignore half the sector plan
- Cross-analysis misses connections because one sector's data was truncated
- Programme plan is incomplete because the session data was cut at 15k characters
- User cannot understand why AI suggestions seem disconnected from their input

**Prevention:**
1. Replace naive slicing with intelligent summarization: summarize the sector plan first, then use the summary as context
2. Use token counting (not character counting) to stay within model limits
3. Prioritize content: extract sections most relevant to the current goal before truncating
4. Log what was truncated and show a warning: "Sectorplan was te lang, de laatste 40% is niet meegenomen"
5. Centralize all token budgets in a config object (as CONCERNS.md already recommends)

**Detection:** Compare character count of original input vs. what was sent to AI. If ratio < 0.5 for any input, flag as high-risk truncation.

**Phase:** Address alongside AI quality improvements. Requires refactoring `ai-client.ts`.

---

### Pitfall 3: Session State Shallow-Merge Causes Silent Data Loss

**What goes wrong:** The `updateSession` function uses `{ ...session, ...updates }` which is a shallow merge. When a component updates a nested property (e.g., adding a benefit to the array), it must pass the entire array. If two rapid updates happen (e.g., user adds a benefit while a background save triggers), the second update overwrites the first because both started from the same `session` snapshot.

**Why it happens:** React state updates are asynchronous. The `useCallback` for `updateSession` closes over the current `session` value. Two rapid calls to `updateSession` will both read the same stale `session`, and the second call's spread will overwrite the first call's changes. There is no optimistic locking, no merge strategy, and no conflict detection.

**Consequences:**
- User adds a benefit, then immediately edits it -- the edit overwrites the add
- AI-generated items disappear after a navigation event triggers a step-save
- Data loss is silent: no error, no warning, item simply vanishes
- Particularly dangerous during DIN mapping where multiple AI calls return results

**Prevention:**
1. Replace shallow-merge `updateSession` with functional updater: `setSession(prev => ({ ...prev, ...computeUpdates(prev) }))`
2. Use `useReducer` instead of `useState` for session state -- actions are serializable and composable
3. Add a version counter to session state. Before saving, verify version matches. If not, merge intelligently
4. Add save-success confirmation that verifies the item count after save matches expected count
5. Separate high-frequency state (UI state, current step) from low-frequency state (DIN items) to reduce conflict surface

**Detection:** Add assertion in `saveLocal`: count items before and after save. If count decreases unexpectedly, log a warning.

**Phase:** Address in the data flow / state management phase. This is a prerequisite for reliable multi-step data propagation.

---

### Pitfall 4: Cross-Analysis Token Similarity Produces False Connections

**What goes wrong:** The cross-sector analysis uses Jaccard token similarity with a threshold of 0.20 to cluster benefits. This threshold is too low -- items sharing common domain words ("digitaal", "systeem", "kwaliteit") get clustered together even when they describe fundamentally different things.

**Why it happens:** The `tokenize` function splits compound words (e.g., "klantervaring" produces "klant", "erva", "aring", "klante", etc. for all splits at positions 4 through length-4). This generates many short, meaningless tokens that inflate similarity scores. The substring bonus adds another 0.08 per match. Two unrelated items sharing "digitaal" and containing compound words with overlapping fragments easily exceed 0.20.

**Consequences:**
- Cross-analysis reports false synergies: "PO and VO share benefit X" when they do not
- Programme manager makes consolidation decisions based on phantom connections
- Real connections with different phrasing (e.g., "Hogere klanttevredenheid" vs. "Meer tevreden gebruikers") may be missed because the tokens do not overlap enough

**Prevention:**
1. Raise similarity threshold to 0.35-0.40 after fixing tokenization
2. Fix compound word splitting: use a Dutch word list or morphological analyzer instead of brute-force substring splitting. The current approach generates nonsense tokens
3. Add a minimum token length filter of 4+ characters for compound-split results
4. Supplement token similarity with AI-based semantic matching for the final clustering decision
5. Show the user WHY items were clustered (already partially done via `matchReason`) and let them confirm/reject

**Detection:** Review clusters where `matchReason` contains only very short or generic words ("meer", "hoge", "data"). These are likely false positives.

**Phase:** Address in the cross-analysis improvement phase.

---

### Pitfall 5: JSON Parsing Fallback Masks AI Response Failures

**What goes wrong:** When the AI returns malformed JSON (markdown-wrapped, partial, or plain text), the regex `/\{[\s\S]*\}/` extracts what it thinks is JSON. If that fails, raw text is returned as if it were structured data. Downstream code receives a string where it expects an object and either crashes or silently stores garbage.

**Why it happens:** The codebase has a broad catch-all pattern: try to extract JSON with regex, if that fails, return the raw string. The raw string then gets stored via `updateSession`. Components that read this data expect structured objects and fail unpredictably. The regex itself is greedy -- given `{a:1} some text {b:2}`, it matches from the first `{` to the last `}`, capturing the middle text.

**Consequences:**
- Cross-analysis step receives a string instead of the expected `{synergie, gaps, hefboomwerking}` structure -- UI breaks or shows nothing
- DIN mapping items get stored as raw text strings, breaking the benefit/capability/effort type contracts
- Error is invisible: no user-facing error, no error logging with response content

**Prevention:**
1. Use Zod schemas to validate every AI response before storing
2. On validation failure: retry once with a more explicit prompt ("Your response was not valid JSON. Respond ONLY with JSON.")
3. On second failure: show user a clear error with the option to retry or edit manually
4. Log the full AI response on parse failure for debugging
5. Never fall back to storing raw text as structured data -- that trades a visible error for invisible corruption

**Detection:** Add a `parseSuccessRate` metric per AI operation. If below 90%, the prompt needs rework.

**Phase:** Address as a prerequisite in the earliest improvement phase. Every other fix depends on reliable AI response handling.

---

## Moderate Pitfalls

### Pitfall 6: Sectorwerk Analysis Does Not Flow Into DIN Mapping

**What goes wrong:** Step 2 (Sectorwerk) analyzes sector plans and produces structured analysis (`sectorAnalyses` in session). Step 3 (DIN Mapping) optionally uses this via the `sectorAnalysis` parameter. But the connection is fragile: the analysis is stored as a raw string, parsed again in `generateDINMapping` with the same flawed regex, and sliced to 3000 characters. Much of the analysis is lost or corrupted in transit.

**Why it happens:** The analysis is stored as the raw AI response string, not as a parsed and validated object. When it is consumed in step 3, it must be re-parsed -- but if the original response had markdown wrapping or extra text, re-parsing fails and the raw string (potentially 10KB+) is sliced to 3000 chars of mostly unusable text.

**Prevention:**
1. Parse and validate the sectorplan analysis at storage time (step 2). Store the validated object, not the raw string
2. Pass the structured object to step 3 directly -- no re-parsing needed
3. Extract the specific fields relevant to DIN mapping (proposed benefits, capabilities, efforts) and pass only those
4. If analysis is unavailable, clearly indicate this to the AI prompt rather than passing truncated noise

**Detection:** Check `session.sectorAnalyses` entries: if any starts with "```" or contains "json" as text, it was stored as raw AI response.

**Phase:** Address in the data flow improvement phase.

---

### Pitfall 7: Word Export Ignores Incomplete DIN Chains

**What goes wrong:** The Word export generates a professional-looking document even when the DIN network has gaps: benefits without capabilities, capabilities without efforts, or goals without any benefits. The exported document looks complete but is structurally incomplete.

**Why it happens:** The export calls `buildChainsForSector` which filters items by mapping relationships. Missing mappings simply produce empty arrays -- there is no validation that chains are complete before generating the document. The document sections are generated regardless: an empty table is rendered or the section is silently omitted.

**Prevention:**
1. Add a pre-export validation step that checks chain completeness: every goal has benefits, every benefit has capabilities, every capability has efforts
2. Show a validation report before export: "3 benefits have no capabilities" with the option to fix or proceed
3. In the exported document, mark incomplete chains visually (e.g., a warning row in the table)
4. Add a "completeness score" to the export header

**Detection:** Count items at each DIN level. If the ratio of capabilities to benefits is < 0.5, or efforts to capabilities is < 0.5, chains are incomplete.

**Phase:** Address in the export quality phase.

---

### Pitfall 8: AI Generates Too Many Items at Scale

**What goes wrong:** With 3 sectors and 3-5 goals, the AI generates 2-4 benefits per goal per sector. At scale: 5 goals x 3 sectors x 3 benefits = 45 benefits, plus capabilities and efforts. The DIN network becomes unmanageable. The programme manager cannot meaningfully review 100+ items.

**Why it happens:** The prompt says "2-4 per doel per sector" which is reasonable per invocation, but cumulative across all goals and sectors it explodes. There is no mechanism to limit total items or encourage reuse of capabilities/efforts across goals. Each `generateDINMapping` call operates independently without awareness of what was already generated for other goals.

**Prevention:**
1. Implement the cyclical workflow: one goal at a time, fully worked out, before starting the next
2. Pass previously generated items as context: "These capabilities already exist: [...]. Reuse where appropriate."
3. Add a global item budget: show the user the current count and recommended maximum per level
4. After initial generation, offer a consolidation step: "These 5 capabilities look similar. Merge into 2?"
5. The cross-analysis should actively suggest merges, not just report overlaps

**Detection:** Monitor total item count per session. If benefits > 20 or efforts > 40, the network is likely too dense for meaningful use.

**Phase:** Address in the AI quality and cyclical workflow phases.

---

### Pitfall 9: localStorage "Never Save Empty Array" Rule Causes Data Loss

**What goes wrong:** The `saveLocal` function refuses to save empty arrays: `if (Array.isArray(data) && data.length === 0) return;`. If the user deliberately deletes all benefits for a sector, this change is never persisted. On reload, the old benefits reappear.

**Why it happens:** This was a safety measure from KiB to prevent accidentally wiping data with an empty state. But it makes intentional deletion impossible. The comment says "Nooit lege state opslaan" but this is too broad -- there is a difference between "state failed to load so it is empty" and "user deleted all items."

**Prevention:**
1. Distinguish between "no data loaded yet" (null) and "user cleared all items" (empty array)
2. Use a wrapper: `{ version: 1, items: [] }` -- save the wrapper even when items is empty
3. Or: use a separate "last known item count" to detect accidental wipes vs. intentional clears
4. Add a delete confirmation for the last item in any category

**Detection:** Delete all benefits for a goal, refresh the page. If benefits reappear, this pitfall is active.

**Phase:** Address in the data flow / state management phase.

---

### Pitfall 10: Programmaboek Not Actually Used as AI Context

**What goes wrong:** The project documentation states "Programmaboek als validatiebron + prompt-context voor AI" as an active requirement, and `docs/programmaboek.doc` exists. But the prompts in `prompts.ts` only reference the methodology by name ("Wijnen & Van der Tak, 2002", "Prevaas & Van der Loon"). No actual content from the programmaboek is extracted and included in prompts. The AI relies on its training data's knowledge of these books, which may be incomplete or hallucinated.

**Why it happens:** Extracting structured content from a .doc file and injecting it into prompts is a non-trivial engineering task. The prompts were written with methodology knowledge embedded directly (the validation rules, the DIN levels, the domain descriptions). But this means the AI cannot reference specific passages, examples, or nuances from the actual book.

**Prevention:**
1. Extract key sections from the programmaboek into structured markdown files (one per methodology concept)
2. Include the relevant section as context in the system prompt for each operation
3. Use the extracted content for post-processing validation rules, not just prompt instructions
4. Create a "methodology reference card" that summarizes the key rules in a machine-parseable format

**Detection:** Ask the AI to generate a DIN network and check whether it references specific book content or just generic methodology knowledge. If generic, the programmaboek is not being used.

**Phase:** Address in the methodology compliance phase. This is what elevates the app from "AI that knows about DIN" to "AI that follows the book."

---

## Minor Pitfalls

### Pitfall 11: Hard-Coded Model Names Will Break on Deprecation

**What goes wrong:** Model names `claude-sonnet-4-6` and `claude-opus-4-6` are hard-coded in `ai-client.ts`. When Anthropic releases new models and deprecates these, all AI calls fail.

**Prevention:** Move model names to environment variables or a central config. Add a fallback model. Log the model used per request for migration planning.

**Detection:** API errors mentioning "model not found" or "deprecated."

**Phase:** Address early as a quick config cleanup task.

---

### Pitfall 12: No Undo/Redo After AI Generation

**What goes wrong:** When the AI generates a full DIN mapping and the user accepts it, there is no way to undo. If the generation was poor quality, the user must manually delete each item.

**Prevention:** Store a snapshot before each AI generation. Offer "Ongedaan maken" (undo) button after generation. Implement as a simple state stack (last 3-5 states).

**Detection:** User manually deleting >5 items after a generation.

**Phase:** Address in the UX improvement phase.

---

### Pitfall 13: Dutch Language Tokenization Mishandles Compound Words

**What goes wrong:** The tokenizer splits words at every position from 4 to length-4, producing fragments that are not real words. "klanttevredenheid" (12 chars) produces: "klan", "klant", "klante", "klantt", "klantte", "klantev", etc. This creates noise that degrades similarity matching.

**Prevention:** Use a Dutch stemmer (e.g., Snowball Dutch stemmer) or a compound word splitter that uses a dictionary. Alternatively, use embedding-based similarity instead of token overlap.

**Detection:** Log the tokens generated for a few representative items. If >50% of tokens are not real Dutch words, the tokenizer needs work.

**Phase:** Address in the cross-analysis improvement phase.

---

## Phase-Specific Warnings

| Phase Topic | Likely Pitfall | Mitigation |
|-------------|---------------|------------|
| AI Quality Improvement | Pitfall 1 (methodology violations pass silently), Pitfall 5 (JSON parse failures), Pitfall 8 (too many items) | Add Zod validation layer, programmatic methodology checks, item budgets |
| Data Flow Between Steps | Pitfall 3 (shallow merge data loss), Pitfall 6 (analysis not flowing), Pitfall 9 (empty array not saved) | Refactor to useReducer, store parsed objects, fix persistence rules |
| Cross-Analysis | Pitfall 4 (false connections), Pitfall 13 (bad tokenization) | Fix tokenizer, raise thresholds, add semantic matching |
| Export Quality | Pitfall 7 (incomplete chains exported), Pitfall 2 (truncated context in programmaplan) | Pre-export validation, intelligent content summarization |
| Methodology Compliance | Pitfall 10 (programmaboek not used), Pitfall 1 (no enforcement) | Extract book content, build validation rules from it |
| Cyclical Workflow | Pitfall 8 (explosion of items) | One goal at a time, pass existing items as context |

---

## Sources

- Direct codebase analysis of `src/lib/ai-client.ts`, `src/lib/prompts.ts`, `src/lib/din-service.ts`, `src/lib/session-context.tsx`, `src/lib/persistence.ts`, `src/lib/word-export.ts`
- `.planning/codebase/CONCERNS.md` (2026-03-30 audit)
- `.planning/PROJECT.md` (project requirements and constraints)
- LLM application patterns: established best practices for structured output validation, prompt engineering, and state management in AI-assisted applications (training data, MEDIUM confidence)
- Dutch NLP tokenization: known limitations of naive compound word splitting without morphological analysis (training data, HIGH confidence)

---

*Pitfalls audit: 2026-03-30*
