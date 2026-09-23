---
quick_id: 260924-1nw
slug: organigram-tab-in-sessieflow
date: 2026-09-24
status: planned
---

# Quick task: organigram-schets als tabblad in de sessieflow

**Doel:** de schets van de programmaorganisatie (ORGANIGRAM-PROGRAMMALEIDING-SKETCH.html) beschikbaar maken in de DIN-app als stap 10 "Organigram" in de sessieflow, met directe link, en deployen naar productie.

## Taken

1. Schets kopiëren naar `public/schetsen/organigram-programmaleiding.html` (statisch, 1-op-1 de bron).
2. Nieuwe stap `organigram` toevoegen aan `AppStepSchema` (`src/lib/schemas.ts`) en `APP_STEPS` (`src/lib/types.ts`, nummer 10, label "Organigram").
3. Component `src/components/steps/OrganigramStep.tsx`: toelichting, knop "Open in eigen tabblad", iframe naar de schets.
4. Sessiepagina `src/app/sessies/[id]/page.tsx`: import + case in `StepContent`; deep-link `?stap=<key>` via `window.location.search` na laden van de sessie (geen `useSearchParams`, dus geen Suspense-eis).
5. Schetsen-overzicht `src/app/schetsen/page.tsx` uitbreiden en wrapper-pagina `src/app/schetsen/organigram-programmaleiding/page.tsx` (zelfde patroon als `systeem-data`).
6. `npm run build` moet slagen; controle dat bestaande stappen intact zijn.
7. Commit + push; deploy met `npx vercel --prod --scope gamingsixties-projects`.

## Verificatie

- Build slaagt zonder fouten.
- `/sessies/1f71df73-f372-4638-8bc6-d70d8c3c575e?stap=organigram` opent direct het tabblad Organigram.
- `/schetsen/organigram-programmaleiding` toont de schets in eigen tabblad.
- Stap-teller toont "Stap 10 van 10"; bestaande stappen ongewijzigd.
