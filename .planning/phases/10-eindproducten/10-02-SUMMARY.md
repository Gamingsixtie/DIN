---
phase: 10-eindproducten
plan: 02
subsystem: export-preview
tags: [export, preview, gap-detection, tabel-flow, consolidation, numbered-sections]

# Dependency graph
requires:
  - phase: 10-eindproducten
    plan: 01
    provides: categorizeGaps, getActiveCaps, getActiveEfforts exports from word-export.ts
provides:
  - "ExportStep with numbered section preview matching Word document"
  - "GapDetectionModal with smart gap categorization (volgende cyclus vs echte gaps)"
  - "DINFlowTable tabel-flow visualization per doel per sector"
  - "Consolidation filtering with (gedeeld) marking on shared items"
  - "Roadmap always visible with placeholder when no quarter data"

# Self-Check: PASSED

key-files:
  created: []
  modified:
    - src/components/steps/ExportStep.tsx

result: All automated checks passed. Human verification approved on Vercel production deploy.

## What Changed

### ExportStep.tsx (735 lines added, 318 removed)
- **GapDetectionModal**: Non-blocking overlay before export with two categories — "Nog niet uitgewerkt (volgende cyclus)" and "Aandachtspunten / Onvolledige ketens". Escape/backdrop close. Two buttons: "Eerst aanvullen" / "Toch exporteren".
- **Numbered sections**: Section/SubSection accept optional `number` prop. Numbers computed dynamically based on data presence.
- **DINFlowTable**: New tabel-flow visualization per doel per sector with 5-column table (Baat → Vermogen → Inspanning), domain-colored cells, "(gedeeld)" marking.
- **Consolidation filtering**: All blocks use getActiveCaps/getActiveEfforts. Stats show active counts.
- **Smart gap categorization**: GapAnalyseBlock uses categorizeGaps() with two distinct categories.
- **Roadmap always visible**: Placeholder text when no quarter data.
- **Export toast**: Success/error feedback on export.

## Deviations
None.

## Duration
~10min (automated) + human verification on Vercel
