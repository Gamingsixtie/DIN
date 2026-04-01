# Phase 4: AI Output Kwaliteit - Discussion Log

> **Audit trail only.** Do not use as input to planning, research, or execution agents.
> Decisions are captured in CONTEXT.md — this log preserves the alternatives considered.

**Date:** 2026-04-01
**Phase:** 04-ai-output-kwaliteit
**Areas discussed:** Validatiestrategie, KiB context-injectie, Hoeveelheidslimiet, Validatiefeedback

---

## Validatiestrategie

### Waar moet de methodiek-validatie primair plaatsvinden?

| Option | Description | Selected |
|--------|-------------|----------|
| Prompt-first (aanbevolen) | Verbeter de prompts zodat AI het meteen goed genereert. Post-validatie alleen als vangnet. | |
| Dual: prompt + code-validatie | Prompts sturen aan, maar aparte validatiefuncties in code controleren elk item op methodiekregels. Twee lagen van zekerheid. | ✓ |
| Code-validatie primair | AI genereert vrij, daarna valideert code strikt tegen methodiekregels. | |

**User's choice:** Dual: prompt + code-validatie
**Notes:** Twee lagen gewenst voor maximale betrouwbaarheid.

### Moet validatie ook bestaande (handmatig ingevoerde) items controleren?

| Option | Description | Selected |
|--------|-------------|----------|
| Alleen AI-output | Validatie geldt alleen voor wat de AI genereert. | |
| Alles valideren | Ook handmatig aangemaakte items worden getoetst. | ✓ |

**User's choice:** Alles valideren
**Notes:** Consistentie over hele sessie gewenst.

### Wat moet er gebeuren als een item niet door de code-validatie komt?

| Option | Description | Selected |
|--------|-------------|----------|
| Waarschuwing tonen (aanbevolen) | Item wordt opgeslagen met visuele waarschuwing. Niet-blokkerend. | |
| Blokkeren tot gecorrigeerd | Item kan niet worden opgeslagen tot het voldoet. | |
| Stille correctie | Code corrigeert automatisch waar mogelijk. Gebruiker ziet gecorrigeerd resultaat. | ✓ |

**User's choice:** Stille correctie — maar gebruiker ziet de correctie en kan bijsturen via extra prompt of handmatige aanpassing.
**Notes:** Geen harde blokkade. Transparante correctie met mogelijkheid tot ingrijpen.

---

## KiB context-injectie

### Hoe moeten KiB visie, scope en doelen worden meegegeven aan AI-prompts?

| Option | Description | Selected |
|--------|-------------|----------|
| System prompt blok (aanbevolen) | KiB-data als apart blok in de system prompt, na de methodiek-context. | ✓ |
| User prompt context | KiB-data als onderdeel van het user-bericht. | |
| Gescheiden: visie in system, doelen in user | Visie/scope in system prompt, doelen in user prompt. | |

**User's choice:** System prompt blok (aanbevolen)
**Notes:** Past bij bestaand patroon uit Phase 3.

### Welke KiB-elementen moeten altijd mee in de prompt?

| Option | Description | Selected |
|--------|-------------|----------|
| Beknopte visie | Beknopte visietekst uit KiB | |
| Uitgebreide visie | Volledige visietekst uit KiB | |
| Top-doelen (alle) | Alle geimporteerde doelen met beschrijving en ranking | ✓ |
| Scope (in/buiten) | Wat wel en niet binnen scope valt | ✓ |

**User's choice:** Top-doelen + Scope (geen visietekst)
**Notes:** Doelen en scope geven voldoende richting.

### Moet de KiB-context bij ALLE AI-aanroepen mee?

| Option | Description | Selected |
|--------|-------------|----------|
| Alle AI-aanroepen (aanbevolen) | Overal: din-mapping, suggest, create, cross-analyse. | ✓ |
| Alleen DIN-generatie | Alleen bij din-mapping, suggest en create. | |
| Configureerbaar per use case | Map per AI-aanroep welke KiB-elementen mee moeten. | |

**User's choice:** Alle AI-aanroepen (aanbevolen)
**Notes:** Consistent, past bij AI-03 requirement.

---

## Hoeveelheidslimiet

### Hoe moet de limiet van 2-4 baten per doel per sector worden afgedwongen?

| Option | Description | Selected |
|--------|-------------|----------|
| Prompt + schema (aanbevolen) | Prompt instrueert "max 4 baten". Zod schema valideert .max(4). Dubbele zekerheid. | ✓ |
| Alleen prompt-instructie | Vertrouw op prompt. Geen harde limiet in code. | |
| Post-processing trim | AI genereert vrij, code selecteert beste 2-4. | |

**User's choice:** Prompt + schema (aanbevolen)
**Notes:** Dubbele zekerheid gewenst.

### Gelden vergelijkbare limieten ook voor vermogens en inspanningen?

| Option | Description | Selected |
|--------|-------------|----------|
| Ja, vergelijkbare limieten | Max vermogens per baat, max inspanningen per vermogen. | ✓ |
| Nee, alleen baten beperken | Alleen baten-limiet. | |
| Jij bepaalt | Claude bepaalt passende limieten. | |

**User's choice:** Ja, vergelijkbare limieten — maar gebruiker kan handmatig extra toevoegen boven de limiet.
**Notes:** Limieten gelden voor AI-generatie, niet voor handmatige invoer.

---

## Validatiefeedback

### Hoe moet de gebruiker zien dat een item gecorrigeerd is?

| Option | Description | Selected |
|--------|-------------|----------|
| Inline correctie-badge (aanbevolen) | Klein label op de kaart dat na bekijken verdwijnt. | ✓ |
| Diff-weergave | Origineel vs gecorrigeerd naast elkaar. | |
| Toast-melding | Kort toast-bericht bij correctie. | |

**User's choice:** Inline correctie-badge (aanbevolen)
**Notes:** Subtiel maar informatief, per item.

### Moet er een overzicht komen van alle validatieresultaten?

| Option | Description | Selected |
|--------|-------------|----------|
| Nee, per item is voldoende | Feedback per kaart/item. | ✓ |
| Ja, samenvatting na generatie | Kort overzicht na AI-generatie. | |

**User's choice:** Nee, per item is voldoende

### Hoe moet de gebruiker een gecorrigeerd item kunnen bijsturen?

| Option | Description | Selected |
|--------|-------------|----------|
| Bestaande aanscherpknop | Via bestaande "Aanscherpen met AI" functie. Geen nieuwe UI. | ✓ |
| Inline bewerken + hervalideren | Gebruiker past tekst direct aan, hervalidatie bij opslaan. | |
| Beide opties | Inline + AI-aanscherpen. | |

**User's choice:** Bestaande aanscherpknop
**Notes:** Geen nieuwe UI nodig.

---

## Claude's Discretion

- Exacte methodiekregels per DIN-type extraheren naar validatiefuncties
- Correctielogica per regeltype
- Exacte limieten voor vermogens en inspanningen
- Structuur van het validatieresultaat-object
- Badge-styling en verdwijntiming

## Deferred Ideas

None — discussion stayed within phase scope
