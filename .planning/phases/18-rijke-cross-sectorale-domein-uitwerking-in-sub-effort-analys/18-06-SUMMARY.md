---
phase: 18-rijke-cross-sectorale-domein-uitwerking-in-sub-effort-analys
plan: 06
completed: 2026-04-20
---

# Plan 18-06 — Summary

## Renderer uitgebreid in `src/components/cross-analyse/StapSectorVertaling.tsx`
- **Type-imports** (regel ~16-21): `SubEffortDossier` + `SubEffortVermogenImpact` toegevoegd naast bestaande schemas-imports.
- **Helper-component `VermogenImpactSectie`** (regel ~43-71): rendert lijst met `SectorBadge` + impact-tekst per sector; `data-testid={vermogen-impact-…-{sector}}`.
- **Helper-component `DossierSectie`** (regel ~73-139): expand/collapse met `useState<boolean>(false)` (default gesloten); toggle-button met `▸`/`▾` glyphs, `aria-expanded`, `aria-controls`, Cito-blauw focus-ring; `data-testid={…-toggle}`; UI-disclaimer "Rolnamen zijn AI-voorstel; pas aan op jouw Cito-context."
- **Grid gewijzigd** (regel ~555): `lg:grid-cols-4 gap-2` → `lg:grid-cols-2 gap-3` voor rijke-content-leesbaarheid.
- **Advies-state render vervangen** (regel ~579-683): 5 Phase 18 blokken (titel in Cito blauw, beschrijving, beargumentatie als "Waarom cross-sectoraal opbouwen?", VermogenImpactSectie, DossierSectie) + legacy fallback (`!advies.beargumentatie && advies.reden`) + gebundelde inspanningen lijst. Elke Phase 18-velden render is conditional voor backward-compat.
- **Empty-state onaangeroerd** (regel ~557-565 — dashed border, "Geen gezamenlijke inspanning").

## Automated gate
- `npm run build` — slaagt (Next.js Compiled, alle routes prerender).
- `npx vitest run` — **324 tests, 316 passed, 8 failed.**

### Over de 8 failures
Geen van deze failures raakt Phase 18 code of de StapSectorVertaling.tsx-wijziging van deze plan. Geverifieerd met `git stash` + hertest op HEAD (d.w.z. commit 601471c = 18-05 klaar):
- 6 failures zijn **pre-existing** voor Phase 18 start: `persistence.test.ts` (5 × Supabase write-path tests) + `schemas.test.ts` (DINSessionSchema strips unknown integratieAdvies).
- 2 failures in `stap5-focus-filter.test.ts` worden veroorzaakt door **uncommitted wijzigingen in `src/lib/stap5-focus.ts`** die al in de dirty werktree stonden voordat Phase 18 begon (zie git status bij sessie-start).

Alle Phase 18 tests zijn GREEN:
- `Phase 18 rijke uitwerking (R-CROSS-03)` — 5/5 GREEN
- `Stap4ResultSchema Phase 18 integratie (R-CROSS-03)` — 2/2 GREEN
- Phase 17 `cross-analyse-schema.test.ts` — 23/23 GREEN (geen regressie)

## Human verify checkpoint (Task 2)
Pending — user kan demo laden via `npm run dev` en visueel bevestigen. Automated gate (Task 1) is GREEN voor Phase 18 scope.

## Commit
`ba11e8c`
