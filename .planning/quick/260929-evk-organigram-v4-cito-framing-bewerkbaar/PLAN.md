---
quick_id: 260929-evk
slug: organigram-v4-cito-framing-bewerkbaar
date: 2026-09-29
status: complete
---

# Quick task: organigram v4 — Cito-framing, plan van aanpak, bewerkbare stap 10

**Doel:** feedback Pim (29-09) verwerken: werkstromen vanuit Cito framen (Cito bepaalt, 3sides levert; Cito-lead vóór 3sides-lead), Cito-lead in de hiërarchie-zin, domeineigenaar en plan van aanpak per werkstroom, resultaat/output-KPI als "tot nu toe besproken", RASCI-check, advies zonder "lichte rol", open punt plan van aanpak. Stap 10 wordt een bewerkbare pagina: namen en teksten per kop handmatig aanpasbaar, opgeslagen in de sessie.

## Taken

1. `src/lib/organigram-default.ts` (standaardinhoud) + `OrganigramSchema` en veld `organigram` in `src/lib/schemas.ts`.
2. `src/components/steps/OrganigramStep.tsx`: korte versie native gerenderd, bewerkmodus (velden, rijen toevoegen/verwijderen), Opslaan via `updateSession`, Annuleren, Terug naar voorstel-tekst; knop naar uitgebreide versie.
3. `ORGANIGRAM-KORT-SKETCH.html` (statische voorstel-versie) inhoudelijk bijwerken; kopie naar `public/schetsen/organigram-kort.html`.
4. Agent: `ORGANIGRAM-PROGRAMMALEIDING-SKETCH.html` + `VOORSTEL-ORGANIGRAM-PROGRAMMALEIDING.md` bijwerken; kopie naar `public/schetsen/organigram-programmaleiding.html`.
5. `npm run build`; render-check; commit; push; deploy.

## Verificatie

- Build slaagt; stap 10 toont de korte versie native; bewerken → opslaan → herladen bewaart de aanpassing (localStorage + Supabase via updateSession).
- Geen "lichte rol", "3sides-lijn" of "o.a. CRM" meer in de stukken; RASCI: één A per regel.
