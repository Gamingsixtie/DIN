# Phase 6: Cyclisch Doel-voor-Doel Werken - Discussion Log

> **Audit trail only.** Do not use as input to planning, research, or execution agents.
> Decisions are captured in CONTEXT.md — this log preserves the alternatives considered.

**Date:** 2026-04-02
**Phase:** 06-cyclisch-doel-voor-doel-werken
**Areas discussed:** Progressiemodel, Compleetheid-definitie, Context-meegave, Voortgangsweergave

---

## Progressiemodel

| Option | Description | Selected |
|--------|-------------|----------|
| Zachte begeleiding (aanbevolen) | Alle doelen toegankelijk, actief doel gemarkeerd, "Doel afronden"-knop, automatisch doorspringen | ✓ |
| Hybride met waarschuwing | Alle doelen toegankelijk, waarschuwing bij switchen naar niet-afgerond doel | |
| Hard lock | Doelen sequentieel ontgrendeld, N+1 pas klikbaar als N afgerond | |

**User's choice:** Zachte begeleiding (aanbevolen)
**Notes:** Vrije navigatie met sturende UX, geen harde blokkades.

---

## Compleetheid-definitie

| Option | Description | Selected |
|--------|-------------|----------|
| Minimaal 1 baat per sector (aanbevolen) | Afgerond bij ≥1 baat per sector, vermogens/inspanningen wenselijk maar niet verplicht | |
| Volledige DIN-keten per sector | Afgerond bij complete keten (baat→vermogen→inspanning) in elke sector | ✓ |
| Handmatige markering | Gebruiker bepaalt zelf, ongeacht items | |

**User's choice:** Volledige DIN-keten per sector
**Notes:** Methodisch zuiver — complete keten vereist in alle 3 sectoren.

### Vervolgvraag: Override bij incomplete keten?

| Option | Description | Selected |
|--------|-------------|----------|
| Ja, met waarschuwing (aanbevolen) | Knop altijd beschikbaar, melding bij incomplete keten, gebruiker kan toch afronden | |
| Nee, keten moet compleet zijn | Knop pas actief bij complete keten in alle sectoren | ✓ |
| Jij beslist | Claude kiest | |

**User's choice:** Nee, keten moet compleet zijn
**Notes:** Stricte afdwinging — geen shortcuts.

---

## Context-meegave

| Option | Description | Selected |
|--------|-------------|----------|
| Titels + deduplicatie-instructie (aanbevolen) | Lijst titels van bestaande items + "vermijd overlap" instructie | |
| Volledige items met profielen | Complete items inclusief batenprofielen, vermogens-profielen, inspannings-dossiers | ✓ |
| Samenvatting per doel | Gecomprimeerde samenvatting per afgerond doel | |

**User's choice:** Volledige items met profielen
**Notes:** Maximale context voor de AI.

### Vervolgvraag: Prompt-budget bij veel afgeronde doelen

| Option | Description | Selected |
|--------|-------------|----------|
| Automatisch cappen (aanbevolen) | Volledige profielen tot ~2000 tokens, daarna terugval op titels + beschrijvingen | ✓ |
| Altijd alles meegeven | Geen limiet, risico op token-overschrijding | |
| Jij beslist | Claude kiest | |

**User's choice:** Automatisch cappen (aanbevolen)
**Notes:** Consistent met Phase 5 buildSectorwerkBlock capping patroon.

---

## Voortgangsweergave

| Option | Description | Selected |
|--------|-------------|----------|
| Status-badges in sidebar (aanbevolen) | Badges per doel: afgerond/bezig/niet begonnen, compact per-sector overzicht bij "bezig" | ✓ |
| Dashboard bovenaan DIN-mapping | Horizontale balk met doel-kaarten bovenaan de mapping stap | |
| Beide: sidebar + dashboard | Sidebar badges + compact dashboard | |

**User's choice:** Status-badges in sidebar (aanbevolen)
**Notes:** Compact, past bij bestaande sidebar. Vervangt huidige groene stip.

---

## Claude's Discretion

- Exacte styling/positionering "Doel afronden"-knop
- Animatie bij doorspringen naar volgend doel
- Prompt-formattering eerder-uitgewerkte-doelen blok
- Per-sector voortgangsweergave styling
- Bevestigingsstap bij afronden ja/nee
- Migratielogica completedGoals state

## Deferred Ideas

None — discussion stayed within phase scope
