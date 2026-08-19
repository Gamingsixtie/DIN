# AUDIT — Dirty-flag voor scenario-samenvatting (Stap 7)

**Datum:** 2026-05-06
**Branch:** `feat/programmaplan-restructure`
**Doel:** Voorkomen dat scripts handmatige edits in scenario-samenvattingen overschrijven, met visuele indicator in de UI.

## Probleem

In Stap 7 (Interne Uren) kan een gebruiker per scenario (`advies`, `plus20`, `optimaal`, `min20`) de samenvatting handmatig bewerken via `EditableText`. Twee scripts (`update-scenario-samenvattingen.ts`, `herschrijf-uren-samenvattingen.ts`) overschreven die handmatige edits zonder check.

## Oplossing

Een dirty-flag `samenvattingHandmatigBewerkt?: boolean` op `ScenarioBlok`. Gezet vanuit de UI op elke handmatige save. Scripts slaan scenario's met deze flag over. UI toont een chip "✏ handmatig bewerkt" zodat de gebruiker ziet dat dit scenario beschermd is.

---

## Wijzigingen

### Bestand 1 — `src/components/cross-analyse/StapInterneUren.tsx`

#### 1a. Type `ScenarioBlok` (rond regel 64–90)

**Voor:**
```ts
  totaalUren: number;
  totaalKosten: number;
  samenvatting: string;
  // Top-niveau programma vs lijn vs raadplegen-uitsplitsing (interpretatie B).
  programmaUren?: number;
  lijnUren?: number;
  raadplegenUren?: number;
};
```

**Na:**
```ts
  totaalUren: number;
  totaalKosten: number;
  samenvatting: string;
  // Top-niveau programma vs lijn vs raadplegen-uitsplitsing (interpretatie B).
  programmaUren?: number;
  lijnUren?: number;
  raadplegenUren?: number;
  // Dirty-flag: is de samenvatting handmatig in de UI bewerkt?
  // Scripts moeten dit scenario dan overslaan om handmatige edits niet te overschrijven.
  samenvattingHandmatigBewerkt?: boolean;
};
```

#### 1b. `handleSamenvattingEdit` (rond regel 1788–1795)

**Voor:**
```ts
const updated: InterneUrenAdvies = {
  ...advies,
  scenarios: { ...advies.scenarios, [scenarioKey]: { ...sc, samenvatting: newValue } },
};
```

**Na:**
```ts
const updated: InterneUrenAdvies = {
  ...advies,
  scenarios: {
    ...advies.scenarios,
    [scenarioKey]: { ...sc, samenvatting: newValue, samenvattingHandmatigBewerkt: true },
  },
};
```

De flag wordt gezet binnen het bestaande `updated`-object dat via `updateSession` + `saveNow()` naar localStorage en (async) Supabase wordt gepersisteerd. Geen extra writes nodig.

#### 1c. Parent-aanroep van `<ScenarioBlokView>` (rond regel 2855)

**Voor:**
```tsx
<ScenarioBlokView
  key={sv.key}
  s={s}
  sv={sv}
  selectiePerDomein={selectiePerDomein}
  customFunctiesPerDomein={customFunctiesPerDomein}
  lezingMarker={advies.interneUrenLezing}
  begrotingAdvies={begroting}
  onSamenvattingEdit={(v) => handleSamenvattingEdit(sv.key, v)}
  ...
/>
```

**Na:**
```tsx
<ScenarioBlokView
  key={sv.key}
  s={s}
  sv={sv}
  selectiePerDomein={selectiePerDomein}
  customFunctiesPerDomein={customFunctiesPerDomein}
  lezingMarker={advies.interneUrenLezing}
  begrotingAdvies={begroting}
  handmatigBewerkt={s.samenvattingHandmatigBewerkt === true}
  onSamenvattingEdit={(v) => handleSamenvattingEdit(sv.key, v)}
  ...
/>
```

#### 1d. `<ScenarioBlokView>` props-signatuur (rond regel 4192–4210)

**Voor (destructuring + type):**
```ts
function ScenarioBlokView({
  s,
  sv,
  selectiePerDomein,
  customFunctiesPerDomein,
  lezingMarker,
  begrotingAdvies,
  onSamenvattingEdit,
  ...
}: {
  s: ScenarioBlok;
  sv: { ... };
  selectiePerDomein?: ...;
  customFunctiesPerDomein?: ...;
  lezingMarker?: InterneUrenLezingMarker;
  begrotingAdvies?: BegrotingAdviesMin;
  onSamenvattingEdit?: (newValue: string) => Promise<void> | void;
  ...
}): React.ReactElement {
```

**Na:**
```ts
function ScenarioBlokView({
  s,
  sv,
  selectiePerDomein,
  customFunctiesPerDomein,
  lezingMarker,
  begrotingAdvies,
  handmatigBewerkt,
  onSamenvattingEdit,
  ...
}: {
  s: ScenarioBlok;
  sv: { ... };
  selectiePerDomein?: ...;
  customFunctiesPerDomein?: ...;
  lezingMarker?: InterneUrenLezingMarker;
  begrotingAdvies?: BegrotingAdviesMin;
  handmatigBewerkt?: boolean;
  onSamenvattingEdit?: (newValue: string) => Promise<void> | void;
  ...
}): React.ReactElement {
```

#### 1e. Banner — chip-render (rond regel 4243–4259)

**Voor:**
```tsx
{/* Banner */}
<div className={`${sv.kleur.banner} text-white rounded-lg p-4`}>
  <p className={`text-[11px] font-semibold uppercase tracking-wider ${sv.kleur.tekst} mb-1`}>Scenario — {sv.label}</p>
  {onSamenvattingEdit ? (
```

**Na:**
```tsx
{/* Banner */}
<div className={`${sv.kleur.banner} text-white rounded-lg p-4`}>
  <div className="flex items-center gap-2 mb-1 flex-wrap">
    <p className={`text-[11px] font-semibold uppercase tracking-wider ${sv.kleur.tekst}`}>Scenario — {sv.label}</p>
    {handmatigBewerkt === true && (
      <span
        title="Deze samenvatting is handmatig in de UI bewerkt en wordt niet door scripts overschreven."
        className="inline-block text-[10px] font-semibold px-1.5 py-0.5 rounded bg-white/95 text-[#003366] border border-white/60"
      >
        ✏ handmatig bewerkt
      </span>
    )}
  </div>
  {onSamenvattingEdit ? (
```

Stijl volgt de bestaande chip-pattern in dit bestand (zie regel 3246/3251: `px-1.5 py-0.5 rounded` met `text-[10px]/text-xs` + tinted bg). Cito-blauw `#003366` op semi-witte achtergrond zodat het tegen elke banner-kleur (blauw/groen/paars/amber) leesbaar contrasteert.

---

### Bestand 2 — `scripts/update-scenario-samenvattingen.ts`

#### 2a. Guard in scenario-loop (rond regel 154–161)

**Voor:**
```ts
for (const sk of Object.keys(scenarios)) {
  const sc = scenarios[sk];
  if (!sc) continue;
  const voor = sc.samenvatting ?? "";
  ...
}
```

**Na:**
```ts
for (const sk of Object.keys(scenarios)) {
  const sc = scenarios[sk];
  if (!sc) continue;
  if ((sc as any).samenvattingHandmatigBewerkt) {
    console.log(`  ⏭ ${sk}: handmatig bewerkt, overslaan`);
    continue;
  }
  const voor = sc.samenvatting ?? "";
  ...
}
```

---

### Bestand 3 — `scripts/herschrijf-uren-samenvattingen.ts`

#### 3a. Guard in scenario-loop (rond regel 147–161)

**Voor:**
```ts
for (const k of ["advies", "plus20", "optimaal", "min20"] as ScenarioKey[]) {
  const scen = scenarios[k];
  if (!scen) {
    console.warn(`[skip] scenario ${k} bestaat niet`);
    continue;
  }
  beforeAfter[k].voor = scen.samenvatting || "";
  ...
}
```

**Na:**
```ts
for (const k of ["advies", "plus20", "optimaal", "min20"] as ScenarioKey[]) {
  const scen = scenarios[k];
  if (!scen) {
    console.warn(`[skip] scenario ${k} bestaat niet`);
    continue;
  }
  if ((scen as any).samenvattingHandmatigBewerkt) {
    console.log(`  ⏭ ${k}: handmatig bewerkt, overslaan`);
    continue;
  }
  beforeAfter[k].voor = scen.samenvatting || "";
  ...
}
```

---

## Build-verificatie

```
> din@0.1.0 build
> next build

▲ Next.js 16.1.6 (Turbopack)
- Environments: .env.local
- Experiments (use with caution):
  · serverActions

  Creating an optimized production build ...
✓ Compiled successfully in 6.0s
  Running TypeScript ...
  Collecting page data using 23 workers ...
  Generating static pages using 23 workers (0/25) ...
  Generating static pages using 23 workers (6/25)
  Generating static pages using 23 workers (12/25)
  Generating static pages using 23 workers (18/25)
✓ Generating static pages using 23 workers (25/25) in 182.5ms
  Finalizing page optimization ...
```

Geen TypeScript- of build-fouten. Alle 25 routes generated.

---

## Browser-test (7 stappen)

1. Open een DIN-sessie en navigeer naar **Stap 7 — Interne Uren** (binnen Cross-analyse Stap 4).
2. Scroll naar een scenario-blok (bv. "Advies"-banner). Klik op het potlood-icoontje (✎) op de samenvatting in de banner.
3. Wijzig de tekst (voeg bv. een zin toe: "[handmatige notitie 6 mei]") en klik op "Opslaan" (of toets-shortcut van `EditableText`).
4. Verifieer dat de toast "Samenvatting opgeslagen" verschijnt.
5. Refresh de pagina (F5).
6. Controleer dat de aangepaste tekst nog in de samenvatting staat.
7. Controleer dat naast "Scenario — Advies" in de banner een witte chip met **"✏ handmatig bewerkt"** zichtbaar is. Hover toont de tooltip "Deze samenvatting is handmatig in de UI bewerkt en wordt niet door scripts overschreven."

**Aanvullende script-test (optioneel):**
- Run `npx tsx scripts/update-scenario-samenvattingen.ts` (of het `herschrijf-` script) op de sessie waar je net hebt bewerkt. In de console zie je `⏭ advies: handmatig bewerkt, overslaan` (of de scenario-key die je bewerkt hebt). De handmatige tekst blijft intact.

---

## Niet gewijzigd

- `EditableText`-component zelf (geen wijzigingen).
- Geen Supabase-writes vanuit deze patch toegevoegd; persistence loopt via de bestaande `updateSession` + `saveNow()` flow.
- Geen commit/push uitgevoerd.
