# Phase 9: Wizard Cleanup & Export Voorbereiding - Discussion Log

> **Audit trail only.** Do not use as input to planning, research, or execution agents.
> Decisions are captured in CONTEXT.md — this log preserves the alternatives considered.

**Date:** 2026-04-03
**Phase:** 09-wizard-cleanup-export-voorbereiding
**Areas discussed:** Cleanup scope

---

## Gray Area Selection

| Option | Description | Selected |
|--------|-------------|----------|
| Cleanup scope | Just the integratieadvies panel from DINMappingStep, or also deep-clean orphaned components, schemas, and AI client functions? | ✓ |
| Export & data handling | Word-export and ExportStep reference integratieAdvies data. Remove or keep? | |
| Wizard flow after removal | Should DINMappingStep get a replacement feature or just be cleaner? | |

---

## Cleanup Scope

### Q1: How deep should the cleanup go?

| Option | Description | Selected |
|--------|-------------|----------|
| Deep clean (Recommended) | Remove integratieadvies panel + delete orphaned components + remove from schemas/types/AI client/word-export/ExportStep | ✓ |
| Minimal removal | Only remove panel from DINMappingStep, leave orphaned components | |
| You decide | Claude determines scope | |

**User's choice:** Deep clean (Recommended)
**Notes:** Full dead code removal across all layers

### Q2: Legacy data handling

| Option | Description | Selected |
|--------|-------------|----------|
| Remove field, ignore legacy | Zod's .optional() means old sessions load fine — field silently dropped | ✓ |
| Keep field, mark deprecated | Keep schema field, remove UI and generation code | |

**User's choice:** Remove field, ignore legacy
**Notes:** No migration needed

### Q3: Export after removal

| Option | Description | Selected |
|--------|-------------|----------|
| Just remove the section | Export skips integratieadvies — Phase 10 handles full redesign | ✓ |
| Replace with cross-analyse samenvatting | New functionality — out of scope | |

**User's choice:** Just remove the section
**Notes:** Phase 10 handles export redesign

### Q4: DINMappingStep after removal

| Option | Description | Selected |
|--------|-------------|----------|
| Just remove, no replacement | Cleaner step, cross-analyse handles guidance separately | ✓ |
| Add compact sectorwerk-hint | Show read-only sectorwerk summary | |

**User's choice:** Just remove, no replacement
**Notes:** Phase 8 cross-analyse will provide cross-sector guidance

---

## Claude's Discretion

- Deletion order and import cleanup
- DINMappingStep layout adjustments after panel removal

## Deferred Ideas

None
