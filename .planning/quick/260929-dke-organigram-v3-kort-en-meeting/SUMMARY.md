---
quick_id: 260929-dke
slug: organigram-v3-kort-en-meeting
date: 2026-09-29
status: complete
---

# Summary: organigram v3 — meetingresultaat, korte sketch als stap 10

## Gedaan

- `ORGANIGRAM-KORT-SKETCH.html` (nieuw, root): korte versie — organigram met de vier 3sides-werkstromen (3sides-lead + Cito-lead), programmamanagement als één blok, stuurgroep KIZ, domeineigenaren op uitnodiging, overlegritme; vijf rollen/vijf vragen; werkstromen-tabel; KPI's en doelen per laag; RASCI gedeelde zone; meeting-samenvatting, advies en open punten.
- `ORGANIGRAM-PROGRAMMALEIDING-SKETCH.html` (uitgebreid): herschreven naar dezelfde structuur en terminologie (Cito-lead, namen uit de meeting, adviesblokken, KPI-laag, meeting-samenvatting); knop "← Korte versie".
- `VOORSTEL-ORGANIGRAM-PROGRAMMALEIDING.md`: versie 3, 17 hoofdstukken; §-verwijzingen alleen in hoofdstuk 3; "inspanningsleider" alleen als boekterm.
- App: `public/schetsen/organigram-kort.html` en `public/schetsen/organigram-programmaleiding.html` (kopieën; onderlinge knop-links omgezet naar `/schetsen/...` met `target="_top"`); `OrganigramStep.tsx` toont de korte versie met knoppen "Uitgebreide versie" en "Open in eigen tabblad"; `/schetsen/organigram-kort` wrapper; `/schetsen` overzicht met beide.

## Verificatie

- Renders van beide sketches via puppeteer gecontroleerd (korte versie volledig; uitgebreide versie organigram-blok).
- Geen "§" en geen "product" (behalve functietitel product owner) in de sketches; "inspanningsleider" alleen in de boekterm-regels.
- `npm run build` slaagt; `/schetsen/organigram-kort` staat in de build-output.

## Directe links

- Sessie-tab: `/sessies/1f71df73-f372-4638-8bc6-d70d8c3c575e?stap=organigram` (korte versie)
- Eigen tabblad: `/schetsen/organigram-kort` · uitgebreid: `/schetsen/organigram-programmaleiding`
