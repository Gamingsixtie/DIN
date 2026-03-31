# Phase 2: State Management & Persistence - Discussion Log

> **Audit trail only.** Do not use as input to planning, research, or execution agents.
> Decisions are captured in CONTEXT.md — this log preserves the alternatives considered.

**Date:** 2026-03-31
**Phase:** 02-state-management-persistence
**Areas discussed:** State library keuze, Lege data opslaan, Foutfeedback bij opslaan, Data-integriteit bij crash

---

## State library keuze

### Vraag 1: Hoe de stale-closure race condition oplossen?

| Option | Description | Selected |
|--------|-------------|----------|
| React Context + functionele updaters | Behoud huidige React Context, verander updateSession naar functionele setState. Minimale wijziging. | ✓ |
| Zustand (externe store) | Migreer naar Zustand: state buiten React, geen closure-problemen. Grotere wijziging. | |
| useReducer + Context | Vervang useState door useReducer met typed actions. Meer structuur, geen extra dependency. | |

**User's choice:** React Context + functionele updaters (Aanbevolen)
**Notes:** Minimale wijziging geprefereerd boven nieuwe dependencies.

### Vraag 2: Moeten callers overstappen op functionele updaters (callback-stijl)?

| Option | Description | Selected |
|--------|-------------|----------|
| Functionele callback API | updateSession(prev => ({ benefits: [...prev.benefits, newBenefit] })). Alle 30+ callsites aanpassen. | ✓ |
| Behoud Partial API, fix alleen intern | updateSession({ benefits: updatedList }) blijft werken. Intern functionele updaters. | |
| Beide ondersteunen | Accepteer zowel Partial als callback. Bestaande code blijft werken. | |

**User's choice:** Functionele callback API (Aanbevolen)
**Notes:** Volledige migratie van alle callsites naar callback-stijl.

### Vraag 3: setCurrentStep ook fixen?

| Option | Description | Selected |
|--------|-------------|----------|
| Ja, consistent fixen | setCurrentStep ook via functionele updater. Consistent patroon. | ✓ |
| Laat zoals het is | Minder risico bij setCurrentStep, focus op updateSession. | |

**User's choice:** Ja, consistent fixen (Aanbevolen)
**Notes:** Consistentie door de hele context heen.

---

## Lege data opslaan

### Vraag 1: Hoe de lege-array beveiliging aanpassen?

| Option | Description | Selected |
|--------|-------------|----------|
| Check verwijderen | Verwijder de lege-array guard volledig. Hele sessie is één object, lege arrays zijn valide. | ✓ |
| Verplaats naar caller-niveau | saveLocal alles laten opslaan, checks in updateSession. | |
| Onderscheid per type | Lege arrays toestaan voor bekende velden, blokkeren voor andere keys. | |

**User's choice:** Check verwijderen (Aanbevolen)
**Notes:** De guard was bedoeld voor KiB waar losse arrays werden opgeslagen. In DIN is de hele sessie één object.

### Vraag 2: Speciale handling voor lege session_list?

| Option | Description | Selected |
|--------|-------------|----------|
| Lege lijst is prima | Een lege session_list is gewoon "geen sessies". Consistent gedrag. | ✓ |
| Key verwijderen bij leeg | Bij lege session_list de localStorage key verwijderen. | |

**User's choice:** Lege lijst is prima (Aanbevolen)
**Notes:** Geen speciale cases nodig.

---

## Foutfeedback bij opslaan

### Vraag 1: Wat bij localStorage save failure?

| Option | Description | Selected |
|--------|-------------|----------|
| Toast-notificatie | Niet-blokkerende melding onderaan het scherm. Verdwijnt na 5 seconden. | ✓ |
| Blokkerende modal | Modal die gebruiker dwingt actie te ondernemen. | |
| Stil + indicator | Klein rood icoon in header bij opslagprobleem. | |

**User's choice:** Toast-notificatie (Aanbevolen)
**Notes:** Niet-blokkerend, gebruiker kan doorwerken.

### Vraag 2: Generiek toast-systeem of specifieke persistence-banner?

| Option | Description | Selected |
|--------|-------------|----------|
| Generiek toast-systeem | ToastProvider + useToast() hook, overal in de app bruikbaar. | ✓ |
| Specifieke persistence-banner | Alleen in SessionProvider een error-state. Sneller maar niet herbruikbaar. | |

**User's choice:** Generiek toast-systeem (Aanbevolen)
**Notes:** Investering nu betaalt zich terug bij AI-foutmeldingen en andere feedback in latere fases.

### Vraag 3: Hoe moet saveLocal fouten communiceren?

| Option | Description | Selected |
|--------|-------------|----------|
| Boolean return + toast in caller | saveLocal retourneert true/false. updateSession triggert toast. Scheiding van concerns. | ✓ |
| Event-based (callback) | saveLocal accepteert onError callback. Flexibeler maar meer wiring. | |
| Automatische toast vanuit persistence | persistence.ts importeert toast-functie. Minder scheiding van concerns. | |

**User's choice:** Boolean return + toast in caller (Aanbevolen)
**Notes:** Persistence-laag blijft puur, UI-logica zit in de context.

---

## Data-integriteit bij crash

### Vraag 1: Hoe omgaan met crash halverwege save-reeks?

| Option | Description | Selected |
|--------|-------------|----------|
| Laatste save wint | Geen extra mechanisme. Elke save is volledig sessie-object. Acceptabel risico. | ✓ |
| Debounced batch-save | Verzamel wijzigingen, sla elke 500ms op. Minder writes maar risico bij crash. | |
| Versioned snapshots | Bewaar laatste 3 versies. Gebruiker kan vorige versie herstellen. | |

**User's choice:** Laatste save wint (Aanbevolen)
**Notes:** Single-user app, risico is acceptabel met functionele updaters.

### Vraag 2: Save-status indicator in de UI?

| Option | Description | Selected |
|--------|-------------|----------|
| Subtiele indicator | "Opgeslagen 14:32" in sessie-header. Vergelijkbaar met Google Docs. | ✓ |
| Geen indicator | Opslaan onzichtbaar, zoals nu. | |
| Alleen bij fouten | Normaal geen indicator, waarschuwing alleen bij falen. | |

**User's choice:** Subtiele indicator (Aanbevolen)
**Notes:** Geeft vertrouwen zonder ruimte in te nemen.

---

## Claude's Discretion

- Exacte implementatie van het toast-systeem (animaties, positionering, auto-dismiss timing)
- Positionering van "Opgeslagen" indicator in bestaande header
- Volgorde van migratie van 30+ callsites
- Of saveLocal intern nog logging doet naast boolean return

## Deferred Ideas

None — discussion stayed within phase scope
