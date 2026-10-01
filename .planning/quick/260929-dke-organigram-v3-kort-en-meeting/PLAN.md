---
quick_id: 260929-dke
slug: organigram-v3-kort-en-meeting
date: 2026-09-29
status: complete
---

# Quick task: organigram v3 — meetingresultaat, korte sketch, rollen scherp

**Doel:** de programmaorganisatie van Klant in Zicht bijwerken naar de uitkomst van de stuurgroep- en programmateam-meeting (namen, vier werkstromen langs de 3sides-lijnen, Cito-lead per werkstroom, programmamanagement als één blok, overlegritme), een korte sketch maken die wél gelezen wordt, en die als stap 10 in de app zetten met de uitgebreide versie via een knop.

Goedgekeurd plan: `C:\Users\pdebu\.claude\plans\ik-ga-het-volgende-encapsulated-orbit.md`.

## Taken

1. `ORGANIGRAM-KORT-SKETCH.html` (root, nieuw): organigram, vijf rollen/vijf vragen, werkstromen-tabel, KPI's en doelen per laag, RASCI gedeelde zone, meeting-samenvatting, advies, open punten.
2. `ORGANIGRAM-PROGRAMMALEIDING-SKETCH.html` en `VOORSTEL-ORGANIGRAM-PROGRAMMALEIDING.md` (uitgebreid) bijwerken naar dezelfde structuur en terminologie.
3. App: `public/schetsen/organigram-kort.html` + `public/schetsen/organigram-programmaleiding.html` (kopieën, met de knop-link omgezet naar de app-route); `OrganigramStep.tsx` toont de korte versie met knoppen naar de uitgebreide versie en eigen tabblad; `/schetsen` overzicht en wrapper `/schetsen/organigram-kort`.
4. `npm run build`; commit; push; deploy (`NODE_OPTIONS=--use-system-ca npx vercel --prod --yes --scope gamingsixties-projects`).

## Verificatie

- Renders van beide sketches gecontroleerd; geen "§", geen "product", geen "inspanningsleider" in lopende tekst (alleen boekterm-regel).
- Build slaagt; live URL's geven 200; `?stap=organigram` toont de korte versie.
