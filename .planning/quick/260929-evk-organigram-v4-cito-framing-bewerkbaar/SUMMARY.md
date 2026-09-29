---
quick_id: 260929-evk
slug: organigram-v4-cito-framing-bewerkbaar
date: 2026-09-29
status: complete
---

# Summary: organigram v4 — Cito-framing, plan van aanpak, bewerkbare stap 10

## Gedaan

- **Bewerkbare stap 10**: `src/components/steps/OrganigramStep.tsx` rendert de korte versie nu native (geen iframe) met bewerkmodus: elke naam, kop, intro, tabelcel en opsommingsregel is een veld; rijen/regels toevoegen en verwijderen; Opslaan schrijft `session.organigram` via `updateSession` (localStorage-first + Supabase); Annuleren; "Terug naar voorstel-tekst" met bevestiging. Standaardinhoud in `src/lib/organigram-default.ts` (`DEFAULT_ORGANIGRAM`, `mergeOrganigram`). Zod: `OrganigramSchema` + veld `organigram` (partial) in `DINSessionSchema`.
- **Inhoud (alle drie de stukken)**: werkstromen vanuit Cito geframed (Cito bepaalt en accepteert, 3sides levert; Cito-lead vóór 3sides-lead), Cito-lead = leidt de werkstroom namens Cito binnen de kaders van de architect; Jama "product owner bedrijfsapplicaties"; Cito-lead in de hiërarchie-zin; domeineigenaar en plan van aanpak per werkstroom; resultaat/output-KPI als "tot nu toe besproken, definitief uit het plan van aanpak"; RASCI met rij "Plan van aanpak per werkstroom" (Sanne A · Cito-lead R · 3sides R) en "Uitvoering van het plan van aanpak" (Cito-lead A · 3sides R); advies zonder "lichte rol"/terugvaloptie; open punt plan van aanpak.
- Statische pagina's (`public/schetsen/organigram-kort.html`, `organigram-programmaleiding.html`) bijgewerkt als voorstel-versie; de uitgebreide onderbouwing blijft statisch en is bereikbaar via de knop in stap 10.

## Verificatie

- `npm run build` slaagt (tsc-fouten in `src/lib/__tests__` bestonden al op HEAD, 30 stuks, niet geraakt).
- Browsertest (puppeteer, Supabase geblokkeerd, testsessie in localStorage): Bewerken → naam en werkstroomnaam wijzigen → Opslaan → herladen toont de wijziging; Terug naar voorstel-tekst → Opslaan → herladen toont "Meryl". TEST OK.
- Renders: korte sketch, uitgebreide sketch (organigram + werkstroomkaarten), app-weergave en bewerkmodus gecontroleerd.
- Greps: geen "§" in de sketches (md alleen hoofdstuk 3), geen "lichte rol", "3sides-lijn", "o.a. CRM"; elke RASCI-rij één A.

## Directe links

- Sessie-tab (bewerkbaar): `/sessies/1f71df73-f372-4638-8bc6-d70d8c3c575e?stap=organigram`
- Statisch: `/schetsen/organigram-kort` · uitgebreid: `/schetsen/organigram-programmaleiding`
