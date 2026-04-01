# DIN — Doelen-Inspanningennetwerk

## What This Is

Een vervolg-app op "Klant in Beeld" (KiB) waarmee programmamanagers doelstellingen vertalen naar concrete baten, vermogens en inspanningen via het Doelen-Inspanningennetwerk (DIN). De app begeleidt stapsgewijs door de DIN-methodiek — van KiB-input en sectorplannen tot een compleet programmaplan met roadmap.

## Core Value

**Methodische samenhang**: elke stap bouwt voort op de vorige, AI-output is getoetst aan het programmaboek (Prevaas & Van Loon), en het resultaat is een samenhangende keten van doelen → baten → vermogens → inspanningen die de gebruiker kan presenteren aan stakeholders.

## Requirements

### Validated

- ✓ Basis 6-stappen wizard (Import, Sectorwerk, DIN-Mapping, Cross-analyse, Prioritering, Export) — existing
- ✓ DIN-netwerk visualisatie met interactieve kaarten — existing
- ✓ Word-export van programmaplan — existing
- ✓ AI-gebaseerde DIN-mapping per doel — existing
- ✓ Cross-analyse hefboomwerking over sectoren — existing
- ✓ Sectorplan parsing en analyse — existing
- ✓ Session management met localStorage persistence — existing
- ✓ Race-condition-vrije state updates met functionele updaters — Validated in Phase 2: State Management & Persistence
- ✓ Opslagfeedback via toast-notificaties bij mislukte saves — Validated in Phase 2: State Management & Persistence
- ✓ Empty-array persistence zonder __placeholder__ hacks — Validated in Phase 2: State Management & Persistence

### Active

- [ ] Sectorwerk-analyse doorstromen naar DIN-mapping (resultaten automatisch meenemen)
- [ ] Cyclisch werken: één doel tegelijk volledig uitwerken, rest later
- [x] AI-kwaliteit: beknopte, methodisch correcte output (niet honderden baten) — Validated in Phase 4: AI Output Kwaliteit
- [x] Programmaboek als validatiebron + prompt-context voor AI — Validated in Phase 3: Programmaboek Context Pipeline
- [ ] Cross-analyse die écht verbindt: gedeelde baten, vermogens en inspanningen over PO/VO/Zakelijk herkennen
- [ ] Chronologische doorloop: context van stap 1 meenemen naar stap 2 en verder
- [ ] Programmaplan + DIN-overzicht + roadmap als eindproducten
- [ ] Integratieadvies-stap verwijderen (geen meerwaarde)

### Out of Scope

- Multi-user samenwerking — app wordt door één persoon gebruikt
- Supabase database-integratie — localStorage-first, database is toekomst
- Realtime sync — niet nodig voor single-user
- Integratieadvies — verwijderd, voegt nu geen waarde toe

## Context

**Bestaande codebase**: Next.js 16 + TypeScript + Tailwind CSS 4 app die al functioneert. De kern staat — dit project richt zich op verbetering en uitbreiding, niet opnieuw bouwen.

**Methodiek**: Gebaseerd op "Werken aan Programma's" (Prevaas & Van Loon), het programmaboek staat in `docs/programmaboek.doc`. De DIN-methodiek definieert vier niveaus: Doelen → Baten → Vermogens → Inspanningen, met batenprofielen en vier inspanningsdomeinen (Mens, Processen, Data & Systemen, Cultuur).

**Sectoren**: Drie sectoren — PO (Primair Onderwijs), VO (Voortgezet Onderwijs), Zakelijk/Professionals. De cross-analyse zoekt overeenkomsten en samenhang tussen deze drie.

**KiB-input**: De app ontvangt visie, top-doelen (3-5 na dot voting) en scope vanuit Klant in Beeld. Dit is het startpunt voor alle verdere stappen.

**Gebruiker**: Eén persoon (programmamanager) die het zelf gebruikt om programmaplannen op te stellen. Geen multi-user scenario.

**Werkwijze**: Cyclisch per doel — eerst één doel volledig door het DIN-netwerk uitwerken, dan het volgende. Kwaliteit boven kwantiteit.

## Constraints

- **Tech stack**: Next.js 16, TypeScript, Tailwind CSS 4 — bestaande stack behouden
- **Taal**: Alle UI en AI-output in het Nederlands (nl-NL)
- **Branding**: Cito blauw (#003366) als primaire kleur
- **Persistence**: localStorage-first (sync-first patroon uit KiB)
- **AI**: OpenAI API via Next.js API routes
- **Bronmateriaal**: `docs/programmaboek.doc` is de methodische autoriteit
- **Deployment**: Vercel

## Key Decisions

| Decision | Rationale | Outcome |
|----------|-----------|---------|
| Cyclisch per doel werken | Kwaliteit boven kwantiteit — één doel volledig uitwerken voordat het volgende begint | — Pending |
| Integratieadvies verwijderen | Voegt nu geen meerwaarde toe, maakt de flow eenvoudiger | — Pending |
| Programmaboek als AI-context | Methodische correctheid waarborgen door relevante secties mee te geven aan prompts | — Pending |
| Cross-analyse focust op samenhang | Gedeelde baten/vermogens/inspanningen over 3 sectoren — niet alles apart houden | — Pending |

## Evolution

This document evolves at phase transitions and milestone boundaries.

**After each phase transition** (via `/gsd:transition`):
1. Requirements invalidated? → Move to Out of Scope with reason
2. Requirements validated? → Move to Validated with phase reference
3. New requirements emerged? → Add to Active
4. Decisions to log? → Add to Key Decisions
5. "What This Is" still accurate? → Update if drifted

**After each milestone** (via `/gsd:complete-milestone`):
1. Full review of all sections
2. Core Value check — still the right priority?
3. Audit Out of Scope — reasons still valid?
4. Update Context with current state

---
*Last updated: 2026-04-02 after Phase 4 completion — AI Output Kwaliteit (KiB context injection, hoeveelheidslimieten, DIN-methodiek validatie)*
