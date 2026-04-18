---
status: partial
phase: 17-cross-analyse-organigram-helderheid-domein-bewuste-consolidatie
source: [17-VERIFICATION.md]
started: 2026-04-18T19:17:26Z
updated: 2026-04-18T19:17:26Z
---

## Current Test

[awaiting human testing]

## Tests

### 1. Drieluik-rendering
expected: Per VermogenGelijkenisGroep rendert drie parallelle sector-vermogen-kaarten (grid-cols-3 op md+) met SectorBadge PO / VO / Zakelijk; rationale-kop toont gezamenlijkeOmschrijving + DomainBalanceBadge
result: [pending]

### 2. Hefboom-badge tooltip
expected: Tooltip verschijnt onder de 'Hefboom: raakt 3 sectoren via gelijkende vermogens' badge met lijst {sectorId}: {title} voor alle drie vermogens in de groep
result: [pending]

### 3. Cross-domein guard-error banner
expected: Inline rode banner met exact message 'Cross-domein merge geblokkeerd: mens + data_systemen' (of omgekeerd); Combineren-knop disabled; Herzie advies knop zichtbaar
result: [pending]

### 4. Herzie-advies round-trip + cache-invalidatie
expected: Spinner verschijnt; na response wordt consolidatieAdvies cluster overschreven; savedContext getoond als italic onder cluster; subEffortAnalysis voor affectedGroepIds wordt gefilterd (volgende Analyseer-run regenereert)
result: [pending]

### 5. Auto-apply toast + Vereist review badge
expected: Toast 'N samengevoegd, M vereisen review' verschijnt kort; failed clusters krijgen rood-lint + 'Vereist review' badge op ClusterCard; geen dubbele render in React 19 Strict Mode
result: [pending]

### 6. Domein-balans badge kleur-coding
expected: Groen bij count >=3, amber bij count=2, rood bij count <=1; label toont 'mist X, Y' voor ontbrekende domains
result: [pending]

### 7. Legacy warning voor pre-17 consolidated caps
expected: Legacy-sectie onderaan drieluik-lijst toont caps met amber 'Legacy: vermogens-merge (niet meer toegepast in cross-analyse)' badge; geen crash; MergeHerkomst expandable beschikbaar
result: [pending]

## Summary

total: 7
passed: 0
issues: 0
pending: 7
skipped: 0
blocked: 0

## Gaps
