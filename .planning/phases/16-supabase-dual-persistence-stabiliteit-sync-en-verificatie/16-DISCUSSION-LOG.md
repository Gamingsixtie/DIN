# Phase 16: Supabase dual persistence — stabiliteit, sync en verificatie - Discussion Log

> **Audit trail only.** Do not use as input to planning, research, or execution agents.
> Decisions are captured in CONTEXT.md — this log preserves the alternatives considered.

**Date:** 2026-04-07
**Phase:** 16-supabase-dual-persistence-stabiliteit-sync-en-verificatie
**Areas discussed:** Sync-status & feedback, Conflict resolution, Schema-richting, Verificatie & tests, Supabase connectie

---

## Sync-status & feedback

| Option | Description | Selected |
|--------|-------------|----------|
| Subtiele badge | Klein sync-icoon in footer: groen/oranje/rood | ✓ |
| Toast bij elke save | Korte melding bij elke sync | |
| Alleen bij fouten | Geen indicator bij succes | |

**User's choice:** Subtiele badge
**Notes:** —

### Badge locatie

| Option | Description | Selected |
|--------|-------------|----------|
| In de header naast sessienaam | Bovenaan bij cito-blue header | |
| In de footer/statusbalk | Onderaan het scherm, subtiel | ✓ |

**User's choice:** Footer/statusbalk

### Offline gedrag

| Option | Description | Selected |
|--------|-------------|----------|
| Badge rood + retry queue | Automatische retry zodra Supabase weer bereikbaar | ✓ |
| Badge rood + handmatige retry | Gebruiker moet zelf klikken | |
| Alleen melding | Toast, geen retry | |

**User's choice:** Badge rood + retry queue

---

## Conflict resolution

### Conflict strategie

| Option | Description | Selected |
|--------|-------------|----------|
| Nieuwste wint | updatedAt vergelijking, nieuwste overschrijft | ✓ |
| localStorage altijd leidend | Supabase puur backup | |
| Merge op veld-niveau | Field-level change tracking | |

**User's choice:** Nieuwste wint

### Multi-device gebruik

| Option | Description | Selected |
|--------|-------------|----------|
| Nee, één apparaat per sessie | Supabase is backup/herstel | ✓ |
| Mogelijk, soms wisselen | Kantoor → thuis | |
| Ja, mogelijk tegelijk | Real-time conflict detection nodig | |

**User's choice:** Eén apparaat per sessie

### Session_list sync

| Option | Description | Selected |
|--------|-------------|----------|
| Ja, sync session_list | Sessielijst ook in Supabase | ✓ |
| Nee, alleen sessie-data | Session_list localStorage-only | |

**User's choice:** Ja, sync session_list

---

## Schema-richting

### Schema patroon

| Option | Description | Selected |
|--------|-------------|----------|
| JSON blob behouden | Hele sessie als JSON in één tabel | ✓ |
| Genormaliseerd schema | Aparte tabellen per entiteit | |
| Hybride: blob + views | JSON blob + Supabase views voor rapportage | |

**User's choice:** JSON blob behouden

### Versioning

| Option | Description | Selected |
|--------|-------------|----------|
| Ja, version counter | Oplopend versienummer voor optimistic locking | ✓ |
| Nee, updatedAt is genoeg | Alleen timestamp vergelijking | |

**User's choice:** Version counter

---

## Verificatie & tests

### Verificatie aanpak

| Option | Description | Selected |
|--------|-------------|----------|
| Unit tests + health-check | Tests + in-app health-check | ✓ |
| Alleen unit tests | Geen runtime verificatie | |
| Handmatige verificatie | Browser devtools + Supabase dashboard | |

**User's choice:** Unit tests + health-check

### Health-check scope

| Option | Description | Selected |
|--------|-------------|----------|
| Connectie + sessie-count | Bereikbaar ja/nee, sessie-count, laatste sync | ✓ |
| Alleen connectie-status | Minimaal | |
| Uitgebreide diagnostiek | Connectie + integriteit check + versie-mismatch | |

**User's choice:** Connectie + sessie-count

---

## Supabase connectie & betrouwbaar opslaan

### Save garantie

| Option | Description | Selected |
|--------|-------------|----------|
| Await + retry bij fout | Elke save afgewacht, max 3x retry | ✓ |
| Await + queue bij fout | Queue met periodieke retry | |
| Fire-and-forget behouden | Huidige aanpak met betere logging | |

**User's choice:** Await + retry bij fout

### Configuratie handling

| Option | Description | Selected |
|--------|-------------|----------|
| Graceful degradation | App werkt offline-only zonder env vars | ✓ |
| Hard requirement | App weigert zonder config | |
| Runtime detectie | Check bij eerste save | |

**User's choice:** Graceful degradation

### dualSave/dualLoad cleanup

| Option | Description | Selected |
|--------|-------------|----------|
| Opruimen | Verwijder ongebruikte generics | ✓ |
| Behouden | Laten staan voor toekomstig gebruik | |

**User's choice:** Opruimen

---

## Claude's Discretion

- Retry-strategie details (exponential backoff, interval, max queue size)
- Footer/statusbalk styling en animatie
- Unit test structuur en mock-patronen
- Version counter implementatiedetails

## Deferred Ideas

None — discussion stayed within phase scope
