# Project Research Summary

**Project:** DIN (Doelen-Inspanningennetwerk) Programmamanagement App
**Domain:** AI-assisted programme management wizard (DIN-methodiek / benefits mapping)
**Researched:** 2026-03-30
**Confidence:** MEDIUM (architecture and pitfalls HIGH based on codebase analysis; stack versions MEDIUM due to no npm verification; features MEDIUM due to no competitor research)

## Executive Summary

The DIN app is a mature but incomplete implementation of the Dutch DIN programme management methodology. The foundation — Next.js, TypeScript, Tailwind, Claude AI, docx export, localStorage persistence — is well-chosen and does not need replacement. The critical gaps are not in the technology choices but in **data flow between steps** and **AI output reliability**: sector analysis results from Step 1 do not reliably feed into Step 2 (DIN-Mapping), the AI produces methodology-violating output that goes unchecked, and the session state management has a shallow-merge race condition that silently drops data. These three issues together mean users cannot trust the tool's output enough to present it to stakeholders.

The recommended approach is a phased quality improvement rather than a rewrite. The first priority is establishing a reliable data pipeline: parse and store sector analyses as typed objects (not raw strings), add Zod schema validation to every AI response, and fix the state management shallow-merge. These form the foundation for all subsequent improvements. The second priority is aligning the workflow with the methodology: implement a cyclical goal-by-goal processing pattern (the DIN methodology mandates this) and inject structured context from prior steps into each AI call. With that foundation in place, cross-sector analysis, network visualization, and export completeness can be improved incrementally.

The primary risk is scope creep into the wrong direction: adding roadmap Gantt charts, multi-user collaboration, or interactive graph editors before fixing the fundamental data integrity and AI quality issues. The app already has 11 wizard steps, AI integration, Word export, and cross-sector analysis. What it needs is quality and reliability of what exists, not more features. The programmaboek content extraction (Pitfall 10) is also a high-leverage improvement: moving from "AI that knows about DIN" to "AI that follows the actual book" is the difference between a demo and a production tool.

## Key Findings

### Recommended Stack

The existing stack is production-grade and complete. Four targeted additions are recommended, plus improved use of the existing Anthropic SDK. The most important addition is Zod for AI response validation — the current regex-based JSON extraction is the root cause of multiple silent failures throughout the app. Zustand replaces the manual localStorage persistence layer with a cleaner, more reliable pattern. React Flow is recommended for the cross-sector network visualization, but only if the user count per session exceeds ~100 nodes; for the current scale, the existing CSS/card approach can be extended.

**Core technologies (keep):**
- **Next.js ^16 / React ^19 / TypeScript ^5.8**: Full-stack framework — keep unchanged
- **Tailwind CSS ^4**: Styling — keep unchanged
- **@anthropic-ai/sdk ^0.78**: Claude API client — keep, but use prefill and temperature control features currently unused
- **docx ^9.6**: Word generation — keep, extend with TOC and matrix table patterns
- **mammoth ^1.11**: DOCX import — keep unchanged

**New additions (recommended):**
- **zod ^3.24**: AI response validation — replaces fragile regex JSON extraction with typed, schema-validated parsing
- **zustand ^5.0**: State management — replaces scattered loadLocal/saveLocal calls with a single typed store and built-in persistence middleware
- **@xyflow/react ^12.4**: Network visualization (add only when cross-sector DAG view is built) — industry standard for node-based graphs
- **@dagrejs/dagre ^1.1**: DAG layout for React Flow — positions DIN chain nodes in hierarchical layers

**Note:** All added package versions are MEDIUM confidence — verify with `npm view [package] version` before committing to package.json.

### Expected Features

The app already implements all table-stakes features (full DIN chain, KiB import, sector plan upload, Word export, session persistence). The improvements are almost entirely in the differentiator category — making what exists work reliably and methodologically correctly.

**Must have (table stakes — already exist, need quality fixes):**
- Complete DIN chain (Doelen -> Baten -> Vermogens -> Inspanningen) — exists but mapping enforcement is weak
- Benefits profiles with indicator, owner, current/target values — exists in types; UI completion enforcement needed
- Traceability through the full chain — partially exists; needs consistent visual treatment
- Word document export — exists with professional formatting; needs completeness validation before export
- Session persistence — exists via localStorage; needs shallow-merge fix

**Should have (differentiators — partially or not yet implemented):**
- **Cyclical goal-by-goal workflow** (P1, not yet implemented): Process one goal fully across all sectors before the next; core methodology requirement
- **Sectorwerk-to-DIN data flow** (P1, not yet implemented): Store sector analyses as typed objects; pass structured hints into DIN-Mapping wizard
- **Programmaboek-grounded AI prompts** (P1, not yet implemented): Extract programmaboek.doc content; inject relevant sections into AI system prompts
- **AI output quality constraints** (P1, partially exists): Strict item counts (2-4 per level), format validation per methodology rules (vergrotende trap for baten, werkwoorden for inspanningen), mandatory user review before acceptance
- **Cross-sector leverage analysis** (P2, partially exists): Fix false-positive token clustering; add semantic matching; surface actionable consolidation recommendations
- **Chain completeness validation with fix actions** (P2, partially exists): Per-goal visual gap indicators and "fix this" buttons
- **Export completeness** (P2): Pre-export validation report; mark incomplete chains in document

**Defer (v2+):**
- Roadmap/Gantt timeline visualization — quarter field on efforts is sufficient for now
- Interactive DIN network graph editing — nice to have, not blocking methodology workflow
- Supabase sync — out of scope per PROJECT.md; stay localStorage-first

**Anti-features (explicitly do not build):**
- Multi-user real-time collaboration
- Free-form AI chat interface
- Database-first architecture
- Automatic batch AI generation without per-item user review
- PDF as primary export format

### Architecture Approach

The architecture is fundamentally sound and does not need restructuring. The improvement is a **context pipeline layer** on top of the existing session model: each step produces structured output that becomes typed input context for subsequent steps. The key change is introducing a `ContextAssembler` module that builds prompt-ready, token-budgeted context from session state, replacing the current ad-hoc `.slice(0, N)` truncation. The session state management should move from `useState` with shallow-merge to `useReducer` (or Zustand) with functional updates to eliminate the race condition that causes silent data loss.

**Major components:**
1. **ContextAssembler** (new module) — builds curated, typed, token-budgeted context from session state for each AI call; single place for all prompt context logic
2. **Zod Schemas** (new layer in ai-client.ts) — validates every AI response at the API boundary; stores typed objects, never raw strings
3. **GoalProcessingState** (new state slice) — tracks which goals/sectors have completed DIN generation and user review; drives the cyclical workflow UI
4. **DINStore via Zustand** (replaces session-context.tsx persistence) — typed actions (addBenefit, updateGoal, etc.) with built-in localStorage persistence middleware
5. **Two-phase CrossAnalyse** (enhancement to din-service.ts) — client-side structural analysis (clusters, gaps, domain balance) feeds as structured input into the AI semantic analysis call

### Critical Pitfalls

1. **AI generates methodology-violating output that passes silently** (Critical) — Benefits are stored with verb titles, capabilities phrased as actions. Prevention: post-processing validation layer using Zod schemas that encode methodology rules (not just JSON structure); auto-retry or user flag when validation fails. This is the single highest-impact fix.

2. **JSON parsing fallback masks AI response failures** (Critical) — Regex `/\{[\s\S]*\}/` extracts what it thinks is JSON; on failure, raw text is stored as structured data causing silent corruption downstream. Prevention: Zod validation on every AI response; retry once with explicit correction prompt; never fall back to storing raw text as structured data.

3. **Session state shallow-merge causes silent data loss** (Critical) — Two rapid `updateSession` calls both read the same stale session snapshot; the second overwrites the first. Data disappears without any error. Prevention: Replace with functional updater `setSession(prev => ...)` or `useReducer`; add post-save item count assertion.

4. **Context truncation silently destroys critical information** (Critical) — Sector plans sliced at arbitrary character positions (3000, 4000, 15000 chars) with no awareness of content structure. The most relevant sections may be in the truncated portion. Prevention: Token-budgeted prompt building with intelligent summarization; centralize all token budgets in a config object; log and warn when significant truncation occurs.

5. **Cross-analysis token similarity produces false connections** (Moderate) — Jaccard similarity threshold of 0.20 combined with broken Dutch compound word splitting creates phantom synergies. Prevention: Fix tokenizer (4+ char minimum, dictionary-backed compound splitting); raise threshold to 0.35-0.40; add semantic matching for final clustering decision.

## Implications for Roadmap

Based on dependency analysis across all four research files, a five-phase structure is recommended. The ordering is determined by what each phase depends on: you cannot improve AI quality without reliable response parsing, and you cannot implement the cyclical workflow without reliable data flow.

### Phase 1: Data Integrity Foundation
**Rationale:** Every other improvement depends on data being stored correctly and AI responses being parsed reliably. This is prerequisite work, not a visible feature phase — but without it, later phases build on sand. ARCHITECTURE.md explicitly identifies this as the dependency root.
**Delivers:** Zod schemas for all AI responses; Zustand store replacing manual localStorage; sectorAnalyses stored as typed `SectorplanAnalyseResult` objects (not raw strings); shallow-merge race condition fixed; model names moved to config
**Addresses:** Table-stakes features (reliability of existing functionality)
**Avoids:** Pitfall 5 (JSON parse fallback), Pitfall 3 (shallow-merge data loss), Pitfall 9 (empty array not saved), Pitfall 11 (hard-coded model names)

### Phase 2: AI Quality and Methodology Compliance
**Rationale:** Depends on Phase 1 (reliable response parsing and typed storage). This phase makes AI output trustworthy. Programmaboek injection and methodology validation together address the core quality gap between "AI that sounds right" and "AI that IS right per the book."
**Delivers:** ContextAssembler module with token-budgeted prompt building; vision/scope injected into every DIN-mapping prompt; programmaboek.doc content extracted and included in system prompts; post-generation methodology validation (title format checks for baten/vermogens/inspanningen); per-item user review before acceptance; item budget warnings
**Addresses:** Programmaboek AI context (P1 feature), AI quality constraints (P1 feature)
**Avoids:** Pitfall 1 (methodology violations pass silently), Pitfall 2 (context truncation), Pitfall 8 (too many items at scale), Pitfall 10 (programmaboek not used)
**Uses:** Zod (from Phase 1) for methodology-rule validation schemas; Anthropic SDK prefill pattern for guaranteed JSON output

### Phase 3: Cyclical Goal-by-Goal Workflow
**Rationale:** Depends on Phase 1 (reliable state management) and Phase 2 (quality AI output worth reviewing). The cyclical workflow is the #1 unimplemented differentiator and the methodology requires it. Implementing it before cross-analysis ensures cross-analysis receives complete, high-quality data.
**Delivers:** GoalProcessingState tracking which goals/sectors are complete; focused goal-at-a-time UI (one goal, three sector tabs, progress through sectors, summary before moving to next goal); previous-goal context passed to AI ("these capabilities already exist, reuse where possible")
**Addresses:** Cyclical goal-by-goal workflow (P1 feature), Sectorwerk-to-DIN data flow (P1 feature)
**Avoids:** Pitfall 6 (sectorwerk analysis not flowing into DIN mapping), Pitfall 8 (item explosion without goal sequencing)
**Implements:** GoalProcessingState architecture component; ContextAssembler wired for per-goal context

### Phase 4: Cross-Sector Analysis Quality
**Rationale:** Depends on Phase 3 having produced complete, cyclically-processed DIN data for all goals. Cross-analysis on partial data produces misleading results. With complete data and reliable AI output (from Phase 2), the two-phase analysis pipeline can meaningfully identify leverage points.
**Delivers:** Fixed Dutch tokenizer (4+ char minimum, dictionary backing); raised similarity threshold (0.35-0.40); two-phase cross-analysis (client-side structural analysis feeds AI semantic analysis); actionable consolidation recommendations ("merge these three efforts into one cross-sector initiative"); chain gap visualization with per-goal visual indicators and "fix this" buttons
**Addresses:** Cross-sector semantic matching (P2 feature), Chain gap visualization + fix actions (P2 feature)
**Avoids:** Pitfall 4 (false connections from bad tokenization), Pitfall 13 (Dutch compound word tokenization)
**Implements:** Two-phase CrossAnalyse architecture pattern

### Phase 5: Export and Visualization Polish
**Rationale:** Last phase because it presents the output of all prior phases. Pre-export validation only makes sense when the data it validates is reliable. Network visualization improvements are most valuable when the complete, cross-sector-analyzed DIN network is available.
**Delivers:** Pre-export chain completeness validation (report gaps before generating document); completeness score in document header; DIN matrix table in Word export; cross-sector DAG visualization (React Flow if node count exceeds ~100, otherwise enhanced CSS/SVG); session quality indicators; undo/redo after AI generation (snapshot stack)
**Addresses:** Export content completeness (P2 feature)
**Avoids:** Pitfall 7 (incomplete chains exported silently)
**Uses:** @xyflow/react + @dagrejs/dagre (if node count warrants it); docx TOC and NumberingConfig patterns

### Phase Ordering Rationale

- Phases 1 and 2 address data corruption and AI quality issues that, left unfixed, contaminate everything built afterward. There is no point improving the workflow UI (Phase 3) if the underlying data it manages is unreliable.
- Phase 3 (cyclical workflow) must precede Phase 4 (cross-analysis) because cross-analysis needs complete per-goal data. The current app's free-navigation approach means sessions routinely have partial data across goals.
- Phase 5 (export/visualization) is last because it presents accumulated results. Pre-export validation and quality indicators only add value when the preceding phases have made the data trustworthy.
- The architecture's Context Pipeline pattern threads through Phases 1-3: each phase adds a layer to the pipeline (typed storage in Phase 1, token-budgeted prompts in Phase 2, goal-sequenced context in Phase 3).

### Research Flags

**Phases needing deeper research during planning:**
- **Phase 2 (AI Quality):** Programmaboek extraction strategy needs scoping — the `.doc` file format, content structure, and section selection logic for prompt injection are implementation-specific and need hands-on investigation
- **Phase 4 (Cross-Analysis):** Dutch NLP tokenization improvement options (Snowball stemmer vs. dictionary-backed compound splitting vs. embedding-based similarity) need evaluation against actual session data to determine which approach is warranted at this scale

**Phases with standard/well-documented patterns (research-phase optional):**
- **Phase 1 (Data Integrity):** Zod schema validation and Zustand store patterns are extensively documented; the codebase changes are mechanical refactoring with clear targets identified in PITFALLS.md
- **Phase 3 (Cyclical Workflow):** The GoalProcessingState pattern and step-sequencing UI are standard wizard patterns; no novel research needed
- **Phase 5 (Export/Visualization):** React Flow and docx patterns are well-documented; scope is clear

## Confidence Assessment

| Area | Confidence | Notes |
|------|------------|-------|
| Stack | MEDIUM | Existing stack: HIGH (installed and working). New packages: MEDIUM — versions unverified via npm due to tool restrictions. Verify before installing. |
| Features | MEDIUM | Table stakes and anti-features: HIGH (direct codebase + methodology analysis). Differentiators: MEDIUM (no competitor research possible; based on methodology requirements and gap analysis). |
| Architecture | HIGH | Based entirely on codebase analysis. Component boundaries, data flow patterns, and anti-patterns are directly observed, not inferred. |
| Pitfalls | HIGH | All critical pitfalls are grounded in specific code locations and patterns identified in the codebase. No speculation. |

**Overall confidence:** MEDIUM-HIGH — the research is grounded in direct codebase analysis rather than external research, which makes findings specific and actionable but means technology market assumptions (library alternatives, competitor features) carry MEDIUM confidence.

### Gaps to Address

- **Package version verification:** All new packages (zod, zustand, @xyflow/react, @dagrejs/dagre) should be verified with `npm view [package] version` before adding to package.json. Versions in STACK.md are from training data, not live npm.
- **Programmaboek content structure:** The actual content and structure of `docs/programmaboek.doc` is unknown without parsing. Phase 2 planning should start with reading the file and identifying which sections map to which DIN operations.
- **Token usage baseline:** Current token consumption per AI call is unknown. Building token budgets (Phase 2) requires instrumenting the existing calls first to understand what is actually being sent.
- **Session size in production:** localStorage is sufficient at current scale, but the actual session sizes for complete 5-goal sessions have not been measured. If sessions exceed 500KB, IndexedDB may be needed before Phase 5.

## Sources

### Primary (HIGH confidence — direct codebase analysis)
- `src/lib/ai-client.ts` — AI call patterns, JSON parsing, context assembly, model names
- `src/lib/session-context.tsx` — State management, shallow-merge pattern, persistence
- `src/lib/din-service.ts` — Cross-analysis, tokenizer, clustering logic
- `src/lib/types.ts` — DIN data model, SectorplanAnalyseResult structure
- `src/lib/prompts.ts` — Prompt templates, methodology instructions
- `src/lib/word-export.ts` — Document generation patterns
- `src/lib/persistence.ts` — localStorage rules including "never save empty array"
- `src/components/steps/DINMappingStep.tsx`, `SectorWerkStep.tsx`, `CrossAnalyseStep.tsx`
- `.planning/codebase/CONCERNS.md` — Prior audit findings
- `.planning/PROJECT.md` — Project requirements and key decisions

### Secondary (MEDIUM confidence — training data knowledge)
- Zod, Zustand, React Flow library documentation and patterns
- Anthropic SDK prefill and prompt caching features
- DIN methodology: Wijnen & Van der Tak (2002), Prevaas & Van Loon

### Tertiary (LOW confidence — unverified)
- Package version numbers for new dependencies — verify with npm before use
- Competitor feature sets in Dutch programme management tooling — no web research performed

---
*Research completed: 2026-03-30*
*Ready for roadmap: yes*
