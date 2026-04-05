# Phase 13: Stap 5 Cross-Analyse Prioriteitsview eerste doel - Discussion Log

> **Audit trail only.** Do not use as input to planning, research, or execution agents.
> Decisions are captured in CONTEXT.md — this log preserves the alternatives considered.

**Date:** 2026-04-05
**Phase:** 13-stap-5-cross-analyse-prioriteitsview-eerste-doel
**Areas discussed:** Focusdoel, AI-trigger, Buiten scope, Badge-stijl

---

## Focusdoel

| Option | Description | Selected |
|--------|-------------|----------|
| Vast op hoogste rank (Aanbevolen) | `session.goals` gesorteerd op rank, eerste wint. Fallback: `session.goals[0]`. Identieke logica in client én API. | ✓ |
| Dropdown om doel te wisselen | User kan in stap 5 zelf kiezen welk doel de focus krijgt. | |
| Vast op hoogste rank + switch-knop alleen als rank gelijk is | Hybride: normaal vast, alleen bij gelijke ranks een keuzeknop. | |

**User's choice:** Vast op hoogste rank.
**Notes:** "1e doel is doel wat we pakken bij de KiB upload, dus nummer 1." Bevestigt dat het eerste doel uit de KiB-import (nummer 1) altijd leidend is — geen switching.

---

## AI-trigger

| Option | Description | Selected |
|--------|-------------|----------|
| Handmatige 'Analyseer' knop (Aanbevolen) | Consistent met Phase 11 D-11. User bekijkt eerst de structurele view. | ✓ |
| Automatisch bij betreden stap 5 | AI draait direct. Minder klikken, maar kost tokens en blokkeert de view tijdens load. | |

**User's choice:** Handmatige 'Analyseer' knop.
**Notes:** Hergebruik van bestaande `handleAnalyse` flow uit `CrossAnalyseWizard.tsx`.

---

## Buiten scope

| Option | Description | Selected |
|--------|-------------|----------|
| Alleen tellingen, uitklapbaar naar titels (Aanbevolen) | Ingeklapt: aantallen. Uitgeklapt: simpele lijst met titels + sector-badges. | ✓ |
| Alleen tellingen, geen uitklap | Compacter, maar user kan niet zien welke items weggevallen zijn. | |
| Tellingen + volledige kaarten bij uitklap | Ook beschrijving en AI-review per item — herintroduceert ruis. | |

**User's choice:** Alleen tellingen, uitklapbaar naar titels.

---

## Badge-stijl

| Option | Description | Selected |
|--------|-------------|----------|
| Kleurgecodeerde badges: groen/amber/rood (Aanbevolen) | dekt_volledig → groen, moet_verbreed → amber, mist_aspect → rood. Baten: geraakt → groen, risico → rood. | ✓ |
| Neutrale badges + iconen | Grijs met checkmark / waarschuwings-icoon. | |
| Alleen tekst-labels zonder kleur | Minimaal, maar ondermijnt visuele scan op risico's. | |

**User's choice:** Kleurcodes, met sterke nadruk op stakeholder-herkenning.
**Notes:** "Het moet hierin dus echt duidelijk zijn dat die sectormanagers, die natuurlijk individuele sessies hebben gehad om juist voor hun sector te doen, dat ze dus wel terugzien in die geconsolideerde fase welke baten ze dan raken. Die baten hebben ze zelf bepaald, zodat er dus ook begrip, mandaat en steun wordt gekregen om die gedeelde vermogens met die inspanningen uit te voeren." Deze input is verankerd als kernprincipe in CONTEXT.md (D-04, Specifics §Mandaat via zichtbaarheid).

---

## Claude's Discretion

- Exacte visuele opmaak van callouts (borders, spacing, iconen)
- Tailwind-klassen voor badges (kleuren conform D-05 blijven gelijk)
- Precieze copy van intro-tekst en section-headers
- Of de samenvatting als card, callout of quote wordt gerenderd
- Interne component-opsplitsing binnen `StapSectorVertaling.tsx`

## Deferred Ideas

- Multi-doel toggle in stap 5 (doorloop voor doel 2, 3, ...) — latere phase
- Apply-knop voor AI-verbredingssuggesties — latere phase
- Domeinbalans en gap-analyse voor het focusdoel — evt. toekomstige "diepteview per doel"
