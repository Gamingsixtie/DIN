# Fix afgeronde bedragen — Stap 8 Berekeningen

**Bestand:** `src/components/steps/BerekeningenStep.tsx`
**Probleem:** `formatEurMln()` toont "€ 1.77 mln" terwijl het werkelijke totaal €1.768.500 is. Verschil van €1.500 verwart programmamanagers omdat het scenario-totaal niet 1-op-1 matcht met de optelling van inspanningen in dezelfde kaart.

**Bevinding:** in dit bestand komt `formatEurMln(...)` slechts op 4 plekken voor — alle 4 zijn vergelijkings-bedragen die de gebruiker direct met andere getallen vergelijkt. Alle 4 moeten naar `formatEur()`.

## Te wijzigen plekken

| Regel | Huidig | Voorstel | Reden |
|---|---|---|---|
| 369 | `{formatEurMln(s?.totaalGeraamdEuro ?? 0)}` | `{formatEur(s?.totaalGeraamdEuro ?? 0)}` | Scenario-picker kaart toont totaal — moet exact zijn voor 1-op-1 vergelijking met scenario-detail |
| 372 | `max per jaar {formatEurMln(s?.jaarlijksBudgetEuro ?? 0)}` | `max per jaar {formatEur(s?.jaarlijksBudgetEuro ?? 0)}` | Cap-bedrag per jaar — niet altijd rond (bv. +20%-scenario), exact getal voorkomt verwarring |
| 434 | `{formatEurMln(totaalScenario)}` | `{formatEur(totaalScenario)}` | Scenario-band-header toont totaal — gebruiker vergelijkt dit direct met som-inspanningen onderin |
| 437 | `plafond {formatEurMln(cap)}/jaar` | `plafond {formatEur(cap)}/jaar` | Plafond moet matchen met "% van plafond ({formatEur(cap)})" op regel 1439 (die al `formatEur` gebruikt) — anders inconsistent |

## Concrete edit-snippets (copy-paste klaar)

### Edit 1 — regel 369 (scenario-picker totaal)
```
old_string:                {formatEurMln(s?.totaalGeraamdEuro ?? 0)}
new_string:                {formatEur(s?.totaalGeraamdEuro ?? 0)}
```

### Edit 2 — regel 372 (scenario-picker cap per jaar)
```
old_string:                {s?.aantalJaren ?? 0} jaar · max per jaar {formatEurMln(s?.jaarlijksBudgetEuro ?? 0)}
new_string:                {s?.aantalJaren ?? 0} jaar · max per jaar {formatEur(s?.jaarlijksBudgetEuro ?? 0)}
```

### Edit 3 — regel 434 (scenario-band totaal in kaart-header)
```
old_string:            {formatEurMln(totaalScenario)}
new_string:            {formatEur(totaalScenario)}
```

### Edit 4 — regel 437 (scenario-band plafond per jaar in kaart-header)
```
old_string:              {formatEurMln(cap)}/jaar
new_string:              {formatEur(cap)}/jaar
```

## Niet wijzigen

**Geen andere `formatEurMln()`-calls in dit bestand.** Grep bevestigt: 4 van 4 occurrences bovenstaand. De functie-definitie zelf (regel 55-60) kan blijven staan — eventueel later opgeruimd als hij nergens meer gebruikt wordt, maar dat is niet kritiek voor deze fix.

**Reeds correct** (gebruiken al `formatEur`):
- SectieD jaartabel (regel 1414, 1419, 1430, 1434, 1439) — toont elke euro
- Per-inspanning totalen en cap-label "% van plafond ({formatEur(cap)})"

## Side-effects / verificatie

- Bredere kolommen in scenario-picker kaart (regel 368: `text-lg font-bold` met `font-mono`) — "€ 1.768.500" past nog binnen lg-breedpunt op `grid-cols-4`. Visueel checken op smal viewport; eventueel `text-base` overwegen als overflow optreedt.
- Cap "€ 250.000/jaar" wordt iets langer dan "€ 250K/jaar" maar past nog binnen scenario-band-subtitel.
- `formatEur` is reeds geïmporteerd/gedefinieerd in dit bestand (regel 50) — geen nieuwe import nodig.
- `npm run build` en visuele check op alle 4 scenario-kaarten (Huidig budget, +20%, advies, -20%) verplicht na edit.

## Samenvatting

4 minimale 1-op-1 substituties (`formatEurMln` → `formatEur`) op regels 369, 372, 434, 437. Geen andere wijzigingen nodig. Resultaat: scenario-totalen en plafond-bedragen in de scenario-picker en kaart-headers tonen exacte euro's, consistent met de jaartabel eronder.
