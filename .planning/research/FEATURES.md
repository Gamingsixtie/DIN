# Feature Landscape

**Domain:** Programmamanagement / Benefits Mapping (DIN-methodiek)
**Researched:** 2026-03-30
**Confidence:** MEDIUM (based on codebase analysis, DIN methodology knowledge, and programme management domain expertise; web search unavailable for competitor verification)

## Table Stakes

Features users expect. Missing = product feels incomplete.

| Feature | Why Expected | Complexity | Notes |
|---------|--------------|------------|-------|
| Complete DIN chain (Doelen -> Baten -> Vermogens -> Inspanningen) | Core methodology requirement; without the full chain the tool has no purpose | Med | **Exists** but mapping relationships need stronger enforcement |
| Traceability through the chain | Programme managers need to show stakeholders HOW each goal leads to concrete efforts | Med | **Partially exists** via map tables, but UI does not visually trace full chains consistently |
| Benefits profiles (batenprofielen) | Methodology mandates indicator, owner, current/target values per benefit | Low | **Exists** in types and wizard; needs better completion enforcement |
| Capability profiles (vermogensprofielen) | As-is / to-be with owner and maturity levels | Low | **Exists** in types; UI rendering in cards is minimal |
| Effort dossiers (inspanningsdossiers) | Programme book prescribes owner, leader, expected result, cost estimate, preconditions | Low | **Exists** in types; partially filled by AI, rarely completed by user |
| Sector plan upload and parsing | Starting point for sector-specific work; users have DOCX sector plans | Low | **Exists** and works |
| KiB import (vision, goals, scope) | The app is a follow-up to KiB; import is the entry point | Low | **Exists** and works |
| Word document export | Stakeholders expect a formal document, not a web link | High | **Exists** with professional formatting; needs content completeness improvements |
| Session persistence | Single user must be able to close browser and continue later | Low | **Exists** via localStorage |
| Progress tracking across steps | Users need to know where they are and what remains | Low | **Exists** via step completion percentages |
| Four effort domains balanced (Mens, Processen, Data & Systemen, Cultuur) | Methodology mandates coverage across all four; imbalance = incomplete programme | Low | **Exists** in domain balance analysis |

## Differentiators

Features that set the product apart. Not expected in generic tools, but highly valued in DIN-specific tooling.

| Feature | Value Proposition | Complexity | Notes |
|---------|-------------------|------------|-------|
| **Cyclical goal-by-goal workflow** | Work one goal completely through the DIN chain before starting the next. Prevents half-baked broad mappings. Quality over quantity. | Med | **Not yet implemented.** Currently all goals processed simultaneously. This is the #1 workflow change needed. |
| **Sectorwerk-to-DIN data flow** | Sector plan analysis results (baten hints, vermogens hints, inspanningen hints from Step 1) automatically feed into DIN-Mapping (Step 2) as pre-populated suggestions. Eliminates rework and ensures continuity. | Med | **Not yet implemented.** Currently sectorwerk analysis is stored as freetext markdown, not structured data that DIN-Mapping can consume. |
| **Programmaboek-grounded AI prompts** | AI uses relevant sections from docs/programmaboek.doc as context, ensuring methodologically correct output. Differentiates from generic AI that invents plausible-sounding but methodologically wrong content. | Med | **Not yet implemented.** Prompts reference the methodology by name but do not inject actual programmaboek text. |
| **Cross-sector leverage analysis (hefboomwerking)** | Identifies shared benefits, capabilities, and efforts across PO/VO/Zakelijk. The real value: finding where one investment serves multiple sectors. | High | **Partially exists.** Token-based clustering in din-service.ts works for exact/near matches. AI cross-analyse provides narrative. Needs: better semantic matching, actionable consolidation recommendations, visual comparison. |
| **AI quality constraints (fewer, better items)** | 2-4 benefits per goal per sector, not 15. Methodologically grounded titles (vergrotende trap for benefits, werkwoorden for efforts). | Med | **Partially exists** in prompts. Needs: stricter output validation, post-generation filtering, user review before acceptance. |
| **Guided wizard with domain discovery** | For inspanningen: asks diagnostic questions to determine which domain(s) need effort, then generates domain-specific initiatives. Not a blank form but an intelligent interview. | Med | **Exists** in DINCreatieWizard with domeinverkenning phase. Could be enhanced with sectorplan context injection. |
| **Chain completeness validation** | Visual and analytical warnings when the chain has gaps: goals without benefits, benefits without capabilities, capabilities without efforts. Ensures nothing falls through the cracks. | Low | **Exists** in findGaps() and cross-analyse. Needs: per-goal visual indicator in UI, actionable "fix this gap" buttons. |
| **Roadmap / quarter planning** | Timeline view of efforts across quarters, showing dependencies and resource implications. Programme managers present this to steering committees. | High | **Partially exists** as quarter field on efforts. No timeline visualization, no dependency visualization, no Gantt-style view. |
| **Interactive DIN network visualization** | Visual graph showing the complete chain from goals through benefits, capabilities, to efforts. Clickable nodes for detail. Shows where chains are thick (well-supported) vs thin (risky). | High | **Exists** as DINNetworkGraph component. Quality and interactivity level unknown from file listing alone. |
| **Approval workflow for efforts** | Programme steering committee (PSC) reviews and approves/rejects efforts. Tracks approval status and dates. | Low | **Exists** in types (ApprovalStatus). UI integration level needs verification. |
| **Verrijkt sectorplan export** | Per-sector enriched document that combines the original sector plan with DIN analysis results. Sector managers get a document they can use internally. | Med | **Exists** as generateVerrijktSectorplanDocument in word-export.ts. |

## Anti-Features

Features to explicitly NOT build.

| Anti-Feature | Why Avoid | What to Do Instead |
|--------------|-----------|-------------------|
| Multi-user real-time collaboration | Single user app (one programme manager). Adding multi-user adds enormous complexity for zero value in this context. | Keep localStorage-first. If sharing is needed later, export/import sessions as files. |
| Integratieadvies step (separate step) | Already decided to remove. Was a separate step that duplicated cross-analyse value without adding unique insight. | Fold any useful integration analysis into the cross-analyse step. |
| Generic project management features (task boards, time tracking, resource allocation) | This is a methodology tool, not a PM tool. Users have MS Project / Jira for execution tracking. | Focus on the planning/mapping phase. Export to formats that PM tools can consume. |
| Free-form AI chat interface | Programme managers need structured, methodologically correct output, not open-ended conversation. Chat invites hallucination and off-method responses. | Keep the guided wizard pattern. AI generates structured JSON, not prose. User reviews and edits, not chats. |
| Database-first architecture | Adds deployment complexity, auth requirements, and cost. Single user on Vercel does not need a database. | Stay localStorage-first. Supabase sync remains optional/future. |
| Automatic AI generation without review | "Generate all DIN for all goals" sounds efficient but produces garbage. The methodology requires human judgment at each level. | Always: AI suggests, human reviews, human accepts/edits/rejects. Per-item, not batch. |
| PDF export (primary format) | Word is the standard in Dutch programme management. Stakeholders edit and annotate in Word. PDF is a read-only afterthought. | Keep Word (docx) as primary. If PDF is needed, users can "Save as PDF" from Word. |
| Complex role-based access control | Single user, no roles needed. Would add login friction for zero benefit. | No auth. Session-based access only. |

## Feature Dependencies

```
KiB Import (Step 1)
  -> Sectorwerk (Step 2): needs goals + vision as context for sector plan analysis
    -> DIN-Mapping (Step 3): needs sectorwerk analysis results + goals
      -> Cross-Analyse (Step 4): needs all DIN entities from all sectors
        -> Prioritering (Step 5): needs cross-analyse results for prioritization
          -> Export (Step 6): needs complete DIN + priorities + approvals

Cyclical workflow (NEW):
  Goal selection -> Sectorwerk for this goal -> DIN-Mapping for this goal -> next goal
  Cross-analyse happens AFTER all goals are mapped (needs complete data)

Sectorwerk -> DIN data flow (NEW):
  SectorplanAnalyseResult (structured) -> pre-populate DIN-Mapping wizard
  Requires: structured storage of sectorwerk results (not just markdown string)

Programmaboek context (NEW):
  docs/programmaboek.doc -> extract relevant sections -> inject into AI prompts
  Requires: programmaboek parsing + section selection logic
  Benefits: all AI-generated content (baten, vermogens, inspanningen, cross-analyse)
```

## MVP Recommendation

The app already has a working foundation. The improvements should prioritize:

1. **Cyclical goal-by-goal workflow** - Fundamental UX change that aligns with how the methodology actually works. Currently the biggest gap between the tool and the method.

2. **Sectorwerk-to-DIN data flow** - Store sector analysis as structured data (SectorplanAnalyseResult type already exists). Pass identified baten/vermogens/inspanningen hints as pre-filled context to the DIN-Mapping wizard. Eliminates the "start from scratch" feeling in Step 3.

3. **Programmaboek as AI context** - Parse and chunk programmaboek.doc. Include relevant sections in prompts. This is the difference between "AI that sounds right" and "AI that IS right per the methodology."

4. **AI output quality enforcement** - Strict count limits (2-4 per level), format validation (vergrotende trap for baten, werkwoorden for inspanningen), user review/edit before acceptance. Post-generation filtering to remove duplicates and off-method items.

5. **Cross-analyse that connects** - Improve semantic matching beyond token overlap. Show side-by-side comparison of DIN chains across sectors. Generate actionable consolidation recommendations ("combine these three similar efforts into one cross-sector initiative").

**Defer:**
- Roadmap/Gantt visualization: Valuable but not critical for first improvement cycle. Quarter planning on efforts is sufficient.
- DIN network graph improvements: Nice to have, not blocking the methodology workflow.
- Supabase sync: Out of scope per PROJECT.md. Stay localStorage-first.

## Feature Prioritization Matrix

| Feature | Impact | Effort | Priority |
|---------|--------|--------|----------|
| Cyclical goal-by-goal workflow | HIGH (methodology alignment) | Med | P1 |
| Sectorwerk -> DIN data flow | HIGH (eliminates rework) | Med | P1 |
| Programmaboek AI context | HIGH (output quality) | Med | P1 |
| AI quality constraints + review | HIGH (usable output) | Med | P1 |
| Cross-sector semantic matching | MED (leverage insights) | High | P2 |
| Chain gap visualization + fix actions | MED (completeness) | Low | P2 |
| Export content completeness | MED (stakeholder output) | Med | P2 |
| Roadmap timeline visualization | LOW (nice to have) | High | P3 |
| Remove integratieadvies step | LOW (simplification) | Low | P2 |

## Confidence Notes

- **HIGH confidence** on table stakes and anti-features: based on direct codebase analysis and DIN methodology knowledge from Wijnen & Van der Tak / Prevaas & Van Loon framework.
- **MEDIUM confidence** on differentiators: based on programme management domain expertise. Could not verify against competitor tools due to web search being unavailable. The DIN methodology is niche (Dutch programme management), so direct competitors are unlikely -- most organisations use Excel/Word manually.
- **LOW confidence** on specific competitor feature sets: no web research was possible. The recommendations are based on methodology requirements and codebase gap analysis rather than market comparison.

## Sources

- Direct codebase analysis of DIN application (all source files in src/)
- DIN methodology references in prompts.ts and types.ts (Wijnen & Van der Tak, 2002; Prevaas & Van Loon)
- PROJECT.md active requirements and key decisions
- ARCHITECTURE.md current system structure
