# Phase 1: Zod Schema Validatie - Discussion Log

> **Audit trail only.** Do not use as input to planning, research, or execution agents.
> Decisions are captured in CONTEXT.md — this log preserves the alternatives considered.

**Date:** 2026-03-30
**Phase:** 01-zod-schema-validatie
**Areas discussed:** Foutafhandeling, Validatiescope, Bestaande data, Schema-strategie

---

## Foutafhandeling

### Q1: Wat moet er gebeuren als AI-output niet voldoet aan het Zod schema?

| Option | Description | Selected |
|--------|-------------|----------|
| Foutmelding + retry | Gebruiker ziet melding met 'Opnieuw proberen' knop. Geen data opgeslagen bij falen. | |
| Deels opslaan + waarschuwing | Wat wel valideert wordt opgeslagen, waarschuwing over ontbrekende velden. | |
| Stille retry | Automatisch opnieuw proberen zonder melding, pas bij falen foutmelding. | |

**User's choice:** Stille retry, en dan reden geven van de fout + mogelijkheid voor de gebruiker om de prompt te optimaliseren.
**Notes:** Combinatie van stille retry en foutmelding met prompt-aanpassing bij falen.

### Q2: Hoeveel detail wil je in de foutmelding?

| Option | Description | Selected |
|--------|-------------|----------|
| Simpel | Korte melding zonder technische details. | |
| Met context | Melding + hint wat er mis ging. | ✓ |
| Jij beslist | Claude kiest per situatie. | |

**User's choice:** Met context
**Notes:** Gebruiker is programmamanager, maar wil weten wat er mis ging.

### Q3: Hoeveel automatische retries?

| Option | Description | Selected |
|--------|-------------|----------|
| 1 retry | Eenmalig opnieuw, snelle feedback. | |
| 2 retries | Twee pogingen, hogere slagingskans. | ✓ |
| Jij beslist | Claude kiest per situatie. | |

**User's choice:** 2 retries

### Q4: Hoe kan de gebruiker de prompt aanpassen na een fout?

| Option | Description | Selected |
|--------|-------------|----------|
| Tekstveld in foutmelding | Tekstveld voor extra instructies aan de AI-prompt. | ✓ |
| Terug naar invoer | Teruggestuurd naar invoerscherm. | |
| Beide opties | Tekstveld + terug naar invoer link. | |

**User's choice:** Tekstveld in foutmelding

---

## Validatiescope

### Q1: Alle endpoints tegelijk of incrementeel?

| Option | Description | Selected |
|--------|-------------|----------|
| Alles tegelijk | Alle 7 endpoints in één fase. Consistent. | ✓ |
| Kernflow eerst | Alleen din-mapping, din-suggest, cross-analyse. Rest later. | |
| Jij beslist | Claude bepaalt volgorde. | |

**User's choice:** Alles tegelijk

### Q2: Zod ook voor niet-AI parsing?

| Option | Description | Selected |
|--------|-------------|----------|
| Ja, alles valideren | KiB import en sectorplan parsing ook via Zod. | ✓ |
| Alleen AI responses | Alleen AI-output valideren. | |
| Jij beslist | Claude bepaalt. | |

**User's choice:** Ja, alles valideren

---

## Bestaande data

### Q1: Wat met bestaande sessies in localStorage?

| Option | Description | Selected |
|--------|-------------|----------|
| Laat staan, valideer bij gebruik | Data gevalideerd bij openen/bewerken, defaults voor ongeldige velden. | ✓ |
| Eenmalige migratie bij laden | Alle data door Zod bij laden, opnieuw opslaan. | |
| Negeren | Alleen nieuwe data valideren. | |

**User's choice:** Laat staan, valideer bij gebruik

### Q2: Melding bij data-reparatie?

| Option | Description | Selected |
|--------|-------------|----------|
| Stille reparatie | Defaults stil toegepast, geen meldingen. | ✓ |
| Subtiele indicatie | Klein icoon bij gerepareerde items. | |
| Jij beslist | Claude kiest. | |

**User's choice:** Stille reparatie

---

## Schema-strategie

### Q1: Verhouding Zod schemas tot TypeScript types?

| Option | Description | Selected |
|--------|-------------|----------|
| Zod als bron, types afleiden | Zod = single source of truth, types via z.infer<>. types.ts herschreven. | ✓ |
| Naast elkaar | Zod voor runtime, bestaande types voor compile-time. | |
| Jij beslist | Claude kiest. | |

**User's choice:** Zod als bron, types afleiden

### Q2: Locatie van Zod schemas?

| Option | Description | Selected |
|--------|-------------|----------|
| Centraal in lib/schemas.ts | Eén bestand, herbruikbaar door alle endpoints. | ✓ |
| Per domein gesplitst | Aparte bestanden per domein. | |
| Jij beslist | Claude kiest. | |

**User's choice:** Centraal in lib/schemas.ts

---

## Claude's Discretion

- Nesting en structuur van schemas binnen schemas.ts
- Keuze van Zod features per situatie
- Exacte foutmeldingen per endpoint

## Deferred Ideas

Geen — discussie bleef binnen fase-scope.
