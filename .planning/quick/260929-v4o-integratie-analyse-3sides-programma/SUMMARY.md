---
quick_id: 260929-v4o
slug: integratie-analyse-3sides-programma
date: 2026-09-29
status: complete
---

# Summary: stap 11 "Programma × 3sides" — integratie-analyse vóór de sessie van maandag

## Gedaan

- **Inhoud** (`src/lib/integratie-3sides-default.ts`): 13 secties — kernboodschap · wat er al gedaan is · kapstok in één plaat (DIN ↔ 3sides-meetmodel) · begrippenlijst (werktaal, met 3sides- en marktconforme term) · per werkstroom wat er ligt en waar het landt · verschillenanalyse (14 onderwerpen met oordeel en besluitvoorstel) · actiepunten meeting 29-09 · scope-scherm met trechter en spelregel · concreet per werkstroom (tijdlijnregels 3sides letterlijk + wat het plan van aanpak nog mist) · onderbouwing (Werken aan Programma's + service blueprint, leidende/volgende indicatoren, NPS, adoptie) · risico's (intern) · voorstel voor maandag (agenda + besluitpunten) · als laatste: vertaling naar gewone taal per doelgroep.
- **Generiek bewerkbaar document** (`src/components/bewerkbaar/`: `BewerkbaarDocument`, `BewerkBalk`, `velden`, `stijl`; `src/lib/bewerkbaar-document.ts`: `kloon`, `mergeDocument`, `zichtbareSecties`): bloktypes tekst, callout, lijst, tabel (met chipkolom), kaarten, lagen; bewerkmodus per veld, toevoegen/verwijderen van secties, regels, rijen, kaarten en lagen; inhoudsopgave.
- **Schema**: `BewerkbaarDocumentSchema` + sessieveld `documenten` (record, partial); stap `integratie` in `AppStepSchema`, `APP_STEPS` (11) en `StepContent`.
- **Refactor**: `OrganigramStep` gebruikt de gedeelde bouwstenen; gedrag en uiterlijk ongewijzigd.
- Bewust géén publieke /schetsen-versie (interne inhoud; app zonder login).

## Verificatie

- `npm run build` slaagt (tsc-fouten alleen in de bestaande `src/lib/__tests__`).
- Browsertest stap 11 (puppeteer, Supabase geblokkeerd): 13 secties, titel wijzigen → opslaan → herladen bewaart (localStorage `documenten["integratie-3sides"]`), terug naar voorstel-tekst → opslaan → herladen herstelt. TEST OK.
- Browsertest organigram na refactor: TEST OK.
- Renders gecontroleerd (desktop per sectie, telefoonbreedte zonder horizontale paginascroll, bewerkmodus).
- Feitencheck: aantallen en datums uit de bronnen (datapunten gecorrigeerd naar circa 85 in negen blokken); geen "§" en geen "lichte rol" in de standaardinhoud.

## Link

- `/sessies/1f71df73-f372-4638-8bc6-d70d8c3c575e?stap=integratie`
