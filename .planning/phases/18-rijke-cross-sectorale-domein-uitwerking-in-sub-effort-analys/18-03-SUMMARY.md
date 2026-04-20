---
phase: 18-rijke-cross-sectorale-domein-uitwerking-in-sub-effort-analys
plan: 03
completed: 2026-04-20
---

# Plan 18-03 — Summary

## Prompt herzien
`SUB_EFFORT_ANALYSE_PROMPT` (regel ~360-420) volledig vervangen: van 28-regelig Phase 17-contract naar ~60-regelige Phase 18 rijke-uitwerkings-prompt met:
- **FOCUS-DOEL VERANKERING** (incl. fallback-tolerantie voor beschrijving === naam).
- **SECTOR-CONTEXT VERANKERING** (gebruik profielHuidig/profielGewenst per vermogen).
- Output-shape: alle 5 Phase 18 velden (titel, beschrijving, beargumentatie, vermogenImpact[3], dossier{5}).
- Nederlandse rolnaam-voorbeelden (Directie L&D, Programmamanager, Business Process Owner, CIO, IT-architect, Opleidingsregisseur).
- €-symbool in kostenraming-voorbeelden (niet "EUR").
- Verwijzing naar *Werken aan Programma's*, Hfst 11.3 — Inspanningendossier.
- Backward-compat voor `actie: "apart_houden"` (rijke velden mogen dan weg).

## Andere prompts ongewijzigd
`CROSS_ANALYSE_STAP4_PROMPT`, `CROSS_ANALYSE_STAP5_PROMPT`, `DIN_SUGGEST_INSPANNING_PROMPT`, `CONSOLIDATIE_HERZIEN_PROMPT`, `DIN_CREATE_INSPANNING_PROMPT` — alle ongewijzigd. Alleen `SUB_EFFORT_ANALYSE_PROMPT` aangepast.

## Verification
- `npx tsc --noEmit` — geen errors in prompts.ts.
- Schema-tests: 29/30 GREEN (Phase 17 + 5/6 Phase 18; demo-data test nog RED zoals verwacht tot Plan 05).
- Grep checks: FOCUS-DOEL VERANKERING (1), Hfst 11.3 (2), € (2), SUB_EFFORT_ANALYSE_PROMPT export (1).

## Commit
`2fa4fe2`
