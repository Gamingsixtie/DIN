---
phase: 18-rijke-cross-sectorale-domein-uitwerking-in-sub-effort-analys
plan: 05
completed: 2026-04-20
---

# Plan 18-05 — Summary

## capIds-volgorde bevestigd
Geverifieerd in [src/lib/demo-data.ts:19-23](src/lib/demo-data.ts#L19-L23) en [src/lib/demo-data.ts:142-182](src/lib/demo-data.ts#L142-L182):
- `capIds[0]` = Zakelijk — "Klantgerichte commerciële slagkracht"
- `capIds[1]` = PO — "Strategisch klantpartnerschap PO"
- `capIds[2]` = VO — "Strategisch klantpartnerschap VO"

## 4 verrijkte subEffortAnalysis entries

| Domein | Titel | Dossier-eigenaar | vermogenImpact mapping |
|---|---|---|---|
| mens | Sectoroverstijgende outside-in gespreksvaardigheidstraining | Directie L&D Cito BV | PO→capIds[1], VO→capIds[2], Zakelijk→capIds[0] |
| cultuur | Sectoroverstijgende outside-in leiderschapsontwikkeling (incl. VO predictie) | Directievoorzitter Cito BV | idem |
| data_systemen | Gedeeld CRM-klantbeeld (organisatiebreed) | CIO / IT-directeur Cito BV | idem |
| processen | Sectoroverstijgende klantinformatie-proces standaardisatie | Directeur Sales & Marketing Cito BV | idem |

Elke `beargumentatie` refereert expliciet aan het focus-doel: **"Integraal klantbeeld en outside-in werken als strategisch fundament"**.

## €-symbool in kostenramingen
Alle vier dossier.kostenraming waarden gebruiken `€` (geen "EUR"). `beargumentatie` velden bevatten aanvullende `€`-referenties voor hefboom-argumentatie.

## Test-snapshot
```
Test Files  1 passed (1)
     Tests  30 passed (30)
```
Plan 01 test "demo-data stap4Result.subEffortAnalysis parseert" is nu GREEN.

## Build
`npm run build` slaagt zonder errors.

## Commit
`5fc336c`
