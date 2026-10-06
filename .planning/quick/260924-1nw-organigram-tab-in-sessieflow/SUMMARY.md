---
quick_id: 260924-1nw
slug: organigram-tab-in-sessieflow
date: 2026-09-24
status: complete
---

# Summary: organigram-schets als tabblad in de sessieflow

## Gedaan

- `public/schetsen/organigram-programmaleiding.html`: 1-op-1 kopie van `ORGANIGRAM-PROGRAMMALEIDING-SKETCH.html` (bron van waarheid blijft het root-bestand; bij wijziging opnieuw kopiëren).
- `src/lib/schemas.ts`: `"organigram"` toegevoegd aan `AppStepSchema`.
- `src/lib/types.ts`: stap 10 "Organigram" in `APP_STEPS`.
- `src/components/steps/OrganigramStep.tsx`: toelichting + knop "Open in eigen tabblad" + iframe (80vh) naar de schets.
- `src/app/sessies/[id]/page.tsx`: import en `case "organigram"`; deep-link `?stap=<key>` gelezen uit `window.location.search` zodra de sessie geladen is (bewust geen `useSearchParams`, dus geen Suspense-eis in de build).
- `src/app/schetsen/page.tsx`: organigram bovenaan het schetsenoverzicht.
- `src/app/schetsen/organigram-programmaleiding/page.tsx`: wrapper met app-balk en volledige iframe, zelfde patroon als `systeem-data`.

## Verificatie

- `npm run build` slaagt; route `/schetsen/organigram-programmaleiding` staat in de build-output.
- Stap-teller wordt "Stap 10 van 10"; `getStepCompletions` levert voor de nieuwe stap geen entry, wat de tab-balk correct afhandelt (geen vinkje, geen stip).
- Bestaande stappen ongewijzigd; `session-context` bewaart `currentStep` als index, nieuwe stap staat achteraan dus bestaande sessies laden ongewijzigd.

## Directe links

- Sessie-tab: `/sessies/1f71df73-f372-4638-8bc6-d70d8c3c575e?stap=organigram`
- Eigen tabblad: `/schetsen/organigram-programmaleiding`
