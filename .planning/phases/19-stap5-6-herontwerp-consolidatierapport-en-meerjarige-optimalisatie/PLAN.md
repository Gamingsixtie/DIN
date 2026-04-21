# Plan — Cross-analyse (Stap 5) & Optimaliseren (Stap 6) herontwerp

## Context

De huidige Stap 5 (Cross-analyse + Consolidatie) en Stap 6 (Optimaliseren + Begroting) zijn voor de programmamanager niet helder genoeg:

- **Stap 5 consolidatie** is gefragmenteerd: velden als *Uitvoering*, *Vermogenimpact*, *Inspanningsdossier*, *Referentieadvies* en *Cito-breed inzicht* staan naast elkaar zonder dat duidelijk is wát ze betekenen of wáárom iets gecombineerd wordt. De keuze voor "N van M gedeelde vermogens" wordt niet onderbouwd. Losse inspanningen (buiten de AI-gelijkenisgroepen) verdwijnen uit het overzicht.
- **Stap 6 optimaliseren** heeft een te smalle *Beschrijving*-kolom (`rows={3}`, één kolom), AI-optimalisatie overschrijft velden zonder dat de gebruiker ziet **wát** is veranderd, en de begroting/business-case rekent éénjarig (2026) terwijl een programma over meerdere jaren loopt — een onrealistische verdeling als er bv. €2,5 ton beschikbaar is maar €17 ton geraamd.
- De **outside-in-logica** (Cultuur → Mens → Processen → Data/Systemen: bereidheid bepaalt competenties, competenties bepalen welke vragen gesteld worden, vragen bepalen processen en CRM-inrichting) is nergens expliciet gemaakt in prompts of UI.

Doel: één samenhangend consolidatierapport in Stap 5 + een bredere, transparante en meerjarige optimalisatie in Stap 6.

---

## Stap 5 — Eén consolidatierapport

### 5.1 Unified consolidatierapport-view
**Bestand:** [src/components/cross-analyse/StapConsolidatie.tsx](../../../src/components/cross-analyse/StapConsolidatie.tsx)

Vervang de huidige domein-gegroepeerde ClusterCards door één rapport-pagina met drie secties die onder elkaar staan:

1. **Per cluster (geconsolideerde bundel):** titel, `aanbeveling` badge, **duidelijke combinatie-uitleg** ("Dit cluster bundelt inspanning A + B + C omdat …"), de vier velden hieronder met duidelijke labels/tooltips:
   - **Uitvoering** → hernoem naar *"Wat wordt er gedaan"* (uit `SubEffortAdvies.beschrijving`)
   - **Vermogen-impact** → *"Welk vermogen bouwt dit op (per sector)"* (uit `SubEffortVermogenImpact`, sector-specifieke taal behouden)
   - **Inspanningsdossier** → *"Eigenaar, leider, kosten, randvoorwaarden"* (uit `SubEffortDossier`; uitklapbaar)
   - **Referentieadvies** → hernoem naar *"Onderbouwing / waarom dit cluster"* (uit `SubEffortAdvies.beargumentatie`)
2. **Losse inspanningen:** elke effort die NIET in een AI-gelijkenisgroep zit, toch tonen als eigen rij (zonder consolidatie) met korte uitleg "Staat op zichzelf — geen sectorgelijkenis gevonden". Bron: de uit `CapabilityEffortMap` gefilterde efforts die niet in `stap3.clusters[*].items` zitten.
3. **Cito-breed inzicht per domein** → hernoem naar *"Programma-brede rode draad (domein)"* met één blok per domein (mens/processen/data_systemen/cultuur). Ieder blok bevat `titel`, `beschrijving`, `onderbouwing`, `relevanteItems` (uit `Stap4Result.citobreedInzicht`), plus één extra AI-regel: *"Wat dit voor Cito als geheel betekent"*.

Een download-knop rechtsboven exporteert het hele rapport naar Word (hergebruik bestaande export-route, nieuwe template).

### 5.2 Alle inspanningen meenemen
**Bestand:** [src/app/api/cross-analyse/route.ts](../../../src/app/api/cross-analyse/route.ts)

Stap 4 auto-groep (wanneer Stap 2 geen gelijkenisgroepen oplevert) gebruikt nu wel alle actieve efforts. Uitbreiden naar ook de happy path: voeg een `ongegroepeerdeInspanningen`-veld toe aan `Stap4Result` (schema in [src/lib/schemas.ts](../../../src/lib/schemas.ts)) dat losse efforts bevat met minimale adviesvelden (*beschrijving*, *vermogenImpact* per sector). Deze worden in de rapport-view onder "Losse inspanningen" getoond.

### 5.3 Gedeelde vermogens — "waarom deze N van M"
**Bestanden:** [src/components/cross-analyse/StapGedeeldeVermogens.tsx](../../../src/components/cross-analyse/StapGedeeldeVermogens.tsx), [src/lib/prompts.ts](../../../src/lib/prompts.ts) (`CROSS_ANALYSE_STAP5_PROMPT`), [src/lib/schemas.ts](../../../src/lib/schemas.ts) (`Stap5ResultSchema`)

Breid Stap5 AI-output uit met `gedeeldeVermogensKeuze`:
```
{
  kandidaten: [{capabilityId, titel, reden}],
  geselecteerd: [{capabilityId, titel, reden}],
  verantwoording: "Waarom deze 2 i.p.v. alle 4 — hefboom, afhankelijkheid, coverage"
}
```
Prompt instructie toevoegen: "Motiveer expliciet per afgewezen kandidaat waarom deze níet gekozen is." UI toont eerst `geselecteerd` + `verantwoording`, daaronder een `<details>` met de afgewezen kandidaten en hun `reden`.

### 5.4 Prompt-verduidelijking
**Bestand:** [src/lib/prompts.ts](../../../src/lib/prompts.ts) (`SUB_EFFORT_ANALYSE_PROMPT`)

Update de veld-instructies zodat de AI kortere, concretere teksten levert die 1-op-1 matchen met de nieuwe UI-labels. Voeg expliciet toe: "Leg bij `beargumentatie` uit welke concrete items samenkomen en waarom ze samen meer opleveren dan apart."

---

## Stap 6 — Brede layout, transparante AI, meerjarige begroting

### 6.1 Brede beschrijving-kolom
**Bestand:** [src/components/cross-analyse/StapOptimaliseren.tsx](../../../src/components/cross-analyse/StapOptimaliseren.tsx)

Huidige kaart: één kolom, `rows={3}` voor beschrijving en beargumentatie. Herontwerp naar een 12-koloms grid per kaart:
- Links (col-span-8): **Titel** (input), **Beschrijving** (`rows={10}`, `min-h-[220px]`), **Beargumentatie** (`rows={6}`)
- Rechts (col-span-4): domein-badge, actie-badge, dossier (niet meer in `<details>`, direct zichtbaar), vermogen-impact per sector als compacte lijst

Beschrijving wordt daarmee de dominante kolom; gebruiker ziet alles zonder scrollen binnen de kaart.

### 6.2 AI-optimalisatie — before/after diff
**Bestanden:** [src/app/api/optimaliseer-subeffort/route.ts](../../../src/app/api/optimaliseer-subeffort/route.ts), [src/components/cross-analyse/StapOptimaliseren.tsx](../../../src/components/cross-analyse/StapOptimaliseren.tsx)

- API-route retourneert nu alleen de nieuwe `SubEffortAdvies`. Uitbreiden met `{ nieuw, origineel, gewijzigdeVelden: string[], samenvattingWijziging: string }`.
- Na de AI-call niet direct overschrijven: toon een **diff-paneel** in de kaart met per gewijzigd veld: links de oude tekst (lichtrood, `line-through` voor verwijderde delen), rechts de nieuwe tekst (lichtgroen, bold voor toegevoegde delen). Onderaan staat `samenvattingWijziging` + twee knoppen: *Toepassen* / *Verwerpen*.
- Eenvoudige word-diff-functie in [src/lib/diff.ts](../../../src/lib/diff.ts) (nieuw; gebruik simpele LCS of splits op woordgrens, geen externe dep).

### 6.3 Meerjarige begroting
**Bestanden:** [src/app/api/begroting-advies/route.ts](../../../src/app/api/begroting-advies/route.ts), [src/app/api/business-case/route.ts](../../../src/app/api/business-case/route.ts), [src/lib/prompts.ts](../../../src/lib/prompts.ts), [src/lib/schemas.ts](../../../src/lib/schemas.ts), [src/components/cross-analyse/StapOptimaliseren.tsx](../../../src/components/cross-analyse/StapOptimaliseren.tsx)

- Input uitbreiden: naast `totaalBudgetEuro` ook `startJaar` (default 2026) en `aantalJaren` (default 3). Bestaand `cyclusMaanden` → afleiden.
- Schema `BegrotingAdvies`: per inspanning `verdelingPerJaar: { jaar: number, percentage: number, euro: number, fase: string }[]`, plus globaal `totalenPerJaar`.
- Prompt-update (`BEGROTING_ADVIES_PROMPT`): "Spreid realistisch. Voorbereiding/cultuur jaar 1, training/proces jaar 1-2, systemen jaar 2-3, borging jaar 3. Als geraamde kosten groter zijn dan het beschikbaar budget: prioriteer en schuif door. Geen overschrijding."
- Business-case (`BUSINESS_CASE_PROMPT` questions-mode): vraag expliciet naar *"Welke kosten vallen in jaar 1 vs jaar 2 vs jaar 3?"* en *"Welke activiteit is randvoorwaarde voor welke andere?"*
- UI: vervang de smalle eenjarige kolom door een meerjarige tabel (jaren als kolommen, inspanningen als rijen, totalen onder + begrotings-indicator "binnen/buiten budget").

### 6.4 Prioriteit/volgorde + outside-in expliciet
**Bestanden:** [src/lib/prompts.ts](../../../src/lib/prompts.ts), [src/components/cross-analyse/StapOptimaliseren.tsx](../../../src/components/cross-analyse/StapOptimaliseren.tsx)

- AI-output van `BEGROTING_ADVIES` uitbreiden met `volgorde: { rank: number, reden: string }` per cluster.
- Prompt-regel toevoegen aan `BEGROTING_ADVIES_PROMPT` en `CROSS_ANALYSE_STAP5_PROMPT`: *"Volg outside-in: (1) Cultuur eerst — zijn ze bereid? (2) Mens — competenties en gesprekvaardigheid, kan los van systemen starten; de vraagstelling die medewerkers leren bepaalt wat volgt. (3) Processen — volgen uit de vragen die gesteld worden. (4) Data & Systemen — CRM wordt ingeregeld op wat genoteerd moet worden. Motiveer afwijkingen."*
- UI: cluster-kaarten krijgen een `#1`, `#2`, … badge + één-regel volgorde-reden. De 4 domein-blokken in het consolidatierapport (5.1 sectie 3) krijgen dezelfde outside-in sortering.

---

## Kritische bestanden om te wijzigen

| Bestand | Wijziging |
|---|---|
| [src/components/cross-analyse/StapConsolidatie.tsx](../../../src/components/cross-analyse/StapConsolidatie.tsx) | Unified rapport-view (5.1) |
| [src/components/cross-analyse/StapGedeeldeVermogens.tsx](../../../src/components/cross-analyse/StapGedeeldeVermogens.tsx) | N-van-M verantwoording (5.3) |
| [src/components/cross-analyse/StapOptimaliseren.tsx](../../../src/components/cross-analyse/StapOptimaliseren.tsx) | Brede layout, diff-panel, meerjarige tabel, volgorde-badges (6.1–6.4) |
| [src/app/api/cross-analyse/route.ts](../../../src/app/api/cross-analyse/route.ts) | Ongegroepeerde efforts meenemen (5.2) |
| [src/app/api/optimaliseer-subeffort/route.ts](../../../src/app/api/optimaliseer-subeffort/route.ts) | Origineel + diff retourneren (6.2) |
| [src/app/api/begroting-advies/route.ts](../../../src/app/api/begroting-advies/route.ts) | Meerjarig model (6.3) |
| [src/app/api/business-case/route.ts](../../../src/app/api/business-case/route.ts) | Meerjarige Q&A (6.3) |
| [src/lib/prompts.ts](../../../src/lib/prompts.ts) | Update `SUB_EFFORT_ANALYSE_PROMPT`, `CROSS_ANALYSE_STAP5_PROMPT`, `OPTIMALISEER_PROMPT`, `BEGROTING_ADVIES_PROMPT`, `BUSINESS_CASE_PROMPT` (5.3, 5.4, 6.3, 6.4) |
| [src/lib/schemas.ts](../../../src/lib/schemas.ts) | `Stap4Result.ongegroepeerdeInspanningen`, `Stap5Result.gedeeldeVermogensKeuze`, `BegrotingAdvies.verdelingPerJaar`, optimalisatie-diff type |
| [src/lib/diff.ts](../../../src/lib/diff.ts) | **Nieuw** — simpele word-diff util (6.2) |

Herbruiken (niet nieuw schrijven):
- [src/lib/ai-client.ts](../../../src/lib/ai-client.ts) `callClaudeWithValidation()` voor alle AI-calls
- [src/lib/stap5-focus.ts](../../../src/lib/stap5-focus.ts) focusdoel-filtering
- [src/lib/consolidation-guards.ts](../../../src/lib/consolidation-guards.ts) D-01/D-02/D-27 validaties
- `ClusterCard` uit [src/components/cross-analyse/shared.tsx](../../../src/components/cross-analyse/shared.tsx) als bouwsteen voor het rapport

---

## Verificatie

1. `npm run build` passeert zonder typefouten.
2. `npm run lint` zonder nieuwe warnings.
3. Manuele flow in browser (`npm run dev`):
   - Open een sessie met minimaal 1 doel, 2 baten, gedeelde vermogens, efforts in 3 sectoren.
   - **Stap 5:** bekijk het consolidatierapport → elk cluster heeft begrijpelijke labels, combinatie-uitleg staat bovenaan, losse inspanningen zijn zichtbaar, gedeelde-vermogens-keuze toont waarom N geselecteerd is en welke zijn afgewezen, Cito-breed inzicht staat per domein onderaan in outside-in volgorde.
   - **Stap 6:** beschrijving-kolom is duidelijk dominant (±2/3 breedte), volledige tekst zichtbaar zonder scrollen binnen een kaart.
   - **AI-optimalisatie:** klik *Optimaliseer met AI* → diff-panel toont oude vs nieuwe tekst per veld + samenvatting → *Toepassen* past toe, *Verwerpen* laat origineel staan.
   - **Begroting:** vul totaalbudget €250.000 in, cyclus 3 jaar → uitvoer toont verdeling per jaar, totalen kloppen, indicator meldt "binnen budget" of realistische doorsschuiving; geen ramingen van €1,7M bij €250k budget.
   - **Outside-in:** volgorde-badges (#1, #2, …) tonen cultuur/mens voor processen/systemen, met één-regel reden.
4. Git-commits per substap (5.1, 5.2, 5.3, 6.1, 6.2, 6.3, 6.4) met duidelijke messages.
