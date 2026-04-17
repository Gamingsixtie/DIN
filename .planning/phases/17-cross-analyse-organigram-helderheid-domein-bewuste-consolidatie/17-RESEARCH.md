# Phase 17: Cross-analyse organigram helderheid + domein-bewuste consolidatie - Research

**Researched:** 2026-04-17
**Domain:** React/Next.js organigram rendering + Zod schema extensie + pure guard-functies + AI prompt-engineering voor DIN cross-analyse
**Confidence:** HIGH (alle kern-bevindingen komen direct uit de gelezen codebase en CONTEXT.md)

## Summary

Phase 17 herontwerpt de cross-analyse organigram rond een methodische correctie (D-25..D-32): **vermogens blijven intact per sector** en een nieuw concept `VermogenGelijkenisGroep` markeert trio's van gelijkende sector-vermogens zonder ze te mergen. De cross-analyse-kracht verschuift naar inspannings-bundeling op een drieluik. De implementatie bestaat uit vier parallelle werkstromen:

1. **Schema + types**: nieuwe `VermogenGelijkenisGroep` entiteit, uitbreiding van `Stap2ResultSchema`, `Stap4ResultSchema`, `VermogenClusterItemSchema` en `ConsolidatieAdviesItemSchema` (additief, geen breaking changes).
2. **Pure guards**: word-boundary title-guard (D-01) + domain-guard (D-02) + drieluik-drempel-guard (D-27) in `mergeEfforts`; `mergeCapabilities` behoudt title-guard maar wordt niet meer vanuit cross-analyse aangeroepen voor nieuwe merges (D-25).
3. **Prompt-engineering + API**: aangepaste stap 2/3/4 prompts; nieuwe `SUB_EFFORT_ANALYSE_PROMPT` per `VermogenGelijkenisGroep`; nieuwe `consolidatie-herzien` tak in `/api/din-suggest` met Zod validatie.
4. **UI**: drieluik-rendering in `StapSectorVertaling.tsx` (volledige rewrite van de vermogen-sectie, hefboomlaag-rendering met SVG-pijlen, hefboom-badges), herzie-knop + context-textarea in `ConsolidationActionBar` en `ClusterCard`, inline guard-error banner, auto-apply skip-on-failure summary toast.

**Primary recommendation:** Implementeer in 4 waves: (Wave 0) test-scaffold en schema-extensie, (Wave 1) pure guards + tests, (Wave 2) prompts + API + AI pipeline, (Wave 3) UI rewrite van `StapSectorVertaling` + `StapConsolidatie` + `ClusterCard`. Hergebruik consequent: `callClaudeWithValidation` voor alle nieuwe AI-calls, `DOMAIN_COLORS` map voor domein-bucketing, `SectorBadge` voor sector-kleur, `consolidationMap` patroon uit `stap5-focus.ts` voor groep-lookup. Drieluik is **desktop-first** (CSS Grid 3-col, mobile stapelt verticaal via `grid-cols-1 md:grid-cols-3`).

<user_constraints>

## User Constraints (from CONTEXT.md)

### Locked Decisions

**Title-guard & domain-guard (blijven volledig geldig, gelden nu uitsluitend voor inspanning-merges):**
- **D-01:** Sector-naam detectie via **word-boundary regex** — `/\b(PO|VO|Zakelijk|primair onderwijs|voortgezet onderwijs)\b/i`. Minimale lengte `>= 10` chars. Geldt voor zowel `mergeCapabilities` als `mergeEfforts`.
- **D-02:** Domein-guard in `mergeEfforts`: alle items identiek `domain`. Cross-domein throw.
- **D-03:** Guards via **throw Error** in de pure functies. UI try/catcht rond `onMerge`. Error-message bevat concrete reden.
- **D-04:** Handmatige merge-failure UI in `ConsolidationActionBar`: **inline error banner** (rood) + actieknop "Herzie advies". Combineren-knop disabled zolang titel niet valideert.
- **D-05:** Auto-apply in `StapConsolidatie` skipt guard-falende clusters stil. Gefaalde clusters krijgen "Vereist review" badge. Eén samenvattende toast: `"N clusters samengevoegd, M vereisen review"`.

**Herzie advies regeneration:**
- **D-06:** Regen is **per-cluster**. Respons overschrijft cluster in `stap4Result.consolidatieAdvies`.
- **D-07:** Per cluster een `context: string` veld op `ConsolidatieAdviesItem`. Single source of truth.
- **D-08:** Nieuwe tak in bestaande `/api/din-suggest` route: `type === "consolidatie-herzien"`. Hergebruikt pipeline, Zod-gevalideerde response.
- **D-09:** Loading UX: inline spinner in "Herzie advies" knop + textarea disabled.

**Sub-effort analyse (nu per VermogenGelijkenisGroep):**
- **D-10:** Draait uitsluitend tijdens stap 4 "Analyseer".
- **D-11:** Batching = **1 AI-call per groep, alle vier domeinen in één payload**. N groepen = N sequentiële calls.
- **D-12:** Cache-policy: sticky. Verdwijnt alleen bij (a) opnieuw "Analyseer" of (b) "Herzie advies" op getroffen groep.
- **D-13:** Empty groep (geen efforts gekoppeld aan de drie vermogens) = skip AI-call + empty-state.

**Methodische correctie (2026-04-17) — D-25 t/m D-32:**
- **D-25:** Cross-analyse voegt **vermogens NIET meer samen**. Drie sector-vermogens blijven aparte records. `mergeCapabilities` blijft in codebase voor legacy/binnen-sector. Stap 4 `consolidatieAdvies` stelt **nooit** meer een vermogen-merge voor.
- **D-26:** Nieuwe domein-entiteit: `VermogenGelijkenisGroep { id, vermogenIds: string[], gezamenlijkeOmschrijving, reden }` — minstens één vermogen per sector uit {PO, VO, Zakelijk}. Markering, geen merge. Opgeslagen in `session.crossAnalyseWizard.stepResults.stap2.vermogenGelijkenisGroepen`.
- **D-27:** Drempel voor inspanning-bundeling: alleen geldig als items via `capabilityEffortMap` terug-refereren naar vermogens uit **dezelfde `VermogenGelijkenisGroep`** EN die groep **alle drie sectoren** bevat. Nieuwe guard in `mergeEfforts`.
- **D-28:** Organigram-rendering per groep: (boven) `gezamenlijkeOmschrijving` als rationale-kop, (midden) drie parallelle vermogen-kaarten naast elkaar met `SectorBadge`, (onder, hefboomlaag) per domein color-coded sectie met gebundelde inspanningen. Drie pijlen van inspannings-sectie omhoog naar de drie vermogens.
- **D-29:** Domein-balans badge per groep: `"Dekt N van 4 domeinen — mist {X}"`. Groen ≥3, amber 2, rood ≤1.
- **D-30:** Schema aanpassingen: `Stap2ResultSchema` krijgt top-level `vermogenGelijkenisGroepen`. `VermogenClusterItemSchema` krijgt nieuwe variant `aanbeveling: 'markeer_gelijkenis'`. `Stap4ResultSchema.consolidatieAdvies` wordt gefilterd op `type === 'inspanning'` only. `subEffortAnalysis` verschuift van "per shared cap" naar "per groep": `{ groepId, domein, actie, items, reden, voorgesteldeNaam }[]`.
- **D-31:** Prompt-aanpassingen: Stap 2 mag GEEN `combineren`-advies voor vermogens geven (alleen `markeer_gelijkenis`). Stap 3 clustering vereist drieluik-drempel. Stap 4 werkt uitsluitend op inspanningen-clusters. `SUB_EFFORT_ANALYSE_PROMPT` input wordt `VermogenGelijkenisGroep` (met alle drie vermogens + gekoppelde inspanningen).
- **D-32:** Hefboom-badge op elke gebundelde inspanning: `"Hefboom: raakt 3 sectoren via gelijkende vermogens"` met tooltip die de drie vermogens opsomt.

**Legacy data:**
- **D-23:** Bestaande sessies met sector-specifieke shared-cap/effort titels krijgen warning badge `"Legacy titel"`. Uitbreiding: sessies met door `mergeCapabilities` geconsolideerde shared-caps krijgen `"Legacy: vermogens-merge (niet meer toegepast in cross-analyse)"`. Geen destructieve migratie.

**Tests:**
- **D-24:** Bestaande `consolidation.test.ts` blijft groen. Nieuwe cases: title-guard (PO/VO/Zakelijk substrings), min-length, word-boundary false positives (Protocol/VOldoende), cross-domein throw, same-domein accept, auto-apply skip-failers, `mergeEfforts` throw bij ontbreken drieluik-drempel, `VermogenGelijkenisGroep` validatie (alle drie sectoren aanwezig).

### Claude's Discretion

- Exacte Tailwind-klassen voor error-banner styling (mits rood/herkenbaar)
- Component-opsplitsing van sub-effort rendering binnen `StapSectorVertaling.tsx` (eigen `<SubEffortSection>` of inline)
- Precieze copy van error-berichten mits gebruiker duidelijk begrijpt wat er moet gebeuren
- Hoe de auto-apply summary-toast exact geformatteerd wordt (N/M tellers + tijdsduur)
- Of `SUB_EFFORT_ANALYSE_PROMPT` als losse constant of inline in een helper functie leeft
- Folder-structuur voor eventuele nieuwe pure helpers (bv. `src/lib/consolidation-guards.ts` of inline in `CrossAnalyseStep.tsx`)

### Deferred Ideas (OUT OF SCOPE)

- **Retroactieve titel-migratie** voor bestaande sessies met sector-specifieke shared-cap/effort titles (alleen warning badge).
- **Undo voor tweede-niveau merges** (sub-effort combineren → uit elkaar halen).
- **Word-export ondersteuning voor sub-effort analyse** — stap 6 organigram is primaire rendering.
- **Revisie-historie per cluster** — D-07 kiest voor overschrijven met context-veld.

</user_constraints>

<phase_requirements>

## Phase Requirements

| ID | Description | Research Support |
|----|-------------|------------------|
| R-CROSS-01 | Cross-analyse helderheid | Drieluik-rendering (D-28) + hefboom-badge (D-32) + domein-balans (D-29) maken de hefboomwerking "1 inspanning → 3 sectoren" direct zichtbaar. Guard-errors tonen expliciet waarom een merge niet mag. |
| R-CROSS-02 | Consolidatie-kwaliteit | Title-guard (D-01), domein-guard (D-02), drieluik-drempel (D-27) en prompt-aanscherping (D-31) garanderen sectoroverstijgende titels en methodisch correcte merges. Herzie-advies flow (D-06..D-09) geeft gebruiker controle over het AI-advies. |

</phase_requirements>

## Project Constraints (from CLAUDE.md)

Actionable directives uit `CLAUDE.md` die Phase 17 **moet** respecteren:

| Directive | Consequentie voor Phase 17 |
|-----------|---------------------------|
| `npm run build` moet slagen zonder fouten | Elke wave sluit af met een groene build. |
| Functionele controle bij elke wijziging | Legacy sessies moeten blijven werken — zie Runtime State Inventory. |
| UI en AI-output in **Nederlands** (nl-NL) | Alle nieuwe prompts, schema-enum `markeer_gelijkenis`, error-berichten, badges ("Legacy titel", "Hefboom: raakt 3 sectoren…"), toast-copy zijn Nederlands. |
| Cito blauw `#003366` (cito-blue) primaire kleur | Niet wijzigen; hefboomlaag gebruikt `DOMAIN_COLORS` (blauw/groen/paars/amber) en teal voor groep-kader (conform bestaand). |
| Dual persistence: localStorage **eerst**, Supabase async | `VermogenGelijkenisGroep[]` wordt opgeslagen als genest veld in `session.crossAnalyseWizard.stepResults.stap2` — gaat automatisch mee in `updateSession(prev => ...)` flow. Geen aparte persistence code nodig. |
| UX design voor alle output — nooit platte tekst | Drieluik moet gestructureerd renderen: kaarten met borders, color-coded domein-secties, badges, SVG-pijlen voor hefboomvisualisatie. |
| Direct committen en pushen na elke werkende wijziging | `commit_docs: true` in `.planning/config.json` — per wave een commit. |
| Methodiek volgen: `docs/programmaboek.doc` | `SUB_EFFORT_ANALYSE_PROMPT` gebruikt `assembleSystemPrompt(..., "cross-analyse", ...)` zodat programmaboek-context (Wijnen & Van der Tak) wordt geïnjecteerd. |
| Skills gebruiken (`pim-dev-skill`, `interface-design`) | Wave 3 UI-rewrite moet volgen: consistent spacing, toegankelijke kleuren (WCAG AA), duidelijke hiërarchie in drieluik. |
| GSD workflow enforcement | Deze research volgt reeds `/gsd:research-phase`. Planner moet downstream `/gsd:execute-phase` gebruiken. |

## Standard Stack

### Core (reeds aanwezig — NIET nieuw installeren)

| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| `zod` | (transitive via schemas.ts; geen expliciete dep in package.json — wordt via `z` uit `@anthropic-ai/sdk` tree gebruikt? Controleer) | Schema validatie voor nieuwe `VermogenGelijkenisGroepSchema` en `SubEffortAdviesSchema` | Single source of truth per D-10 uit Phase 1 — alle AI-responses zijn Zod-gevalideerd |
| `@anthropic-ai/sdk` | 0.78.0 | Direct client voor `consolidatie-herzien` tak | Reeds gebruikt in `din-suggest/route.ts` regel 40-46 (`claude-sonnet-4-6`) |
| `vitest` | 4.1.2 | Test runner | Reeds geconfigureerd (`vitest.config.ts`), include `src/**/*.test.ts`, 20 bestaande test-files in `src/lib/__tests__/` |
| Next.js App Router | 16.1.0 | API routes + React Server Components | Bestaande `api/din-suggest` en `api/cross-analyse` routes breiden uit — geen nieuwe route-files |
| React | 19.1.0 | State + `useState`/`useEffect`/`useCallback` patronen | Volgt bestaand `ConsolidationActionBar` state-machine pattern |
| Tailwind CSS | 4.1.0 | Styling | `DOMAIN_COLORS` map in `StapSectorVertaling.tsx` regel 29-34 hergebruikt; `SectorBadge` shared |

**Version verification:** `zod` blijkt impliciet meegeleverd via Next.js/SDK tree — controleer met `npm ls zod` in Wave 0. Als ontbrekend: expliciet installeren (`npm install zod`). Geen andere nieuwe dependencies nodig.

### Supporting (bestaande modules hergebruiken)

| Module | Purpose | When to Use |
|--------|---------|-------------|
| `src/lib/ai-client.ts` → `callClaudeWithValidation` | Alle nieuwe AI-calls met Zod retry | Voor `consolidatie-herzien` + `SUB_EFFORT_ANALYSE_PROMPT` calls — 2 stille retries, schema validatie |
| `src/lib/prompt-assembly.ts` → `assembleSystemPrompt` | Layered context (programmaboek + KiB + sectorwerk + completed goals) | Voor `SUB_EFFORT_ANALYSE_PROMPT` — `useCase = "cross-analyse"` injecteert `PROGRAMMABOEK_CROSS_ANALYSE` |
| `src/lib/stap5-focus.ts` → `getConsolidationOrigins`, `ConsolidationOrigin` | Legacy warning detectie + audit-trail | Voor D-23 "Legacy vermogens-merge" badge: check `session.capabilities.some(c => c.consolidated)` bij render van drieluik |
| `src/components/cross-analyse/shared/SectorBadge.tsx` | PO/VO/Zakelijk kleur-coded badge | Drie vermogen-kaarten in drieluik; hefboom-tooltip inhoud |
| `DOMAIN_COLORS` + `DOMAIN_LABELS` in `StapSectorVertaling.tsx` regel 22-34 | Color-coded domein-secties | Hefboomlaag per-domein rendering + `DOMEIN_META` voor icons |

### Alternatives Considered

| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| Losse `src/lib/consolidation-guards.ts` module | Inline in `CrossAnalyseStep.tsx` | **Recommended:** losse module. Past bij Phase 14 pattern (pure helpers in `src/lib/`) en test-baarheid zonder component-imports. `src/lib/consolidation-guards.ts` met `validateNeutralTitle()`, `validateSameDomain()`, `validateDrieluikThreshold()` pure functies. |
| 1 AI-call per (groep × domein) | 1 call per groep met alle 4 domeinen | D-11 heeft dit al gelockt: per groep, omdat AI cross-domein context moet meewegen maar geen cross-domein merges mag adviseren. |
| Nieuwe route `api/consolidatie-herzien` | Tak in bestaande `api/din-suggest` | D-08 lockt: nieuwe tak. Hergebruikt auth/error-handling. |
| SVG library voor hefboom-pijlen (bv. `reactflow`) | Inline SVG + Tailwind CSS | **Recommended:** inline SVG + CSS. Reeds gebruikt in codebase (zie `ConsolidationActionBar.tsx` regel 126-128 spinner, `StapSectorVertaling.tsx` regel 47-52 connector-icon, regel 423-430 samenvoeg-badge met `M19 14l-7 7…`). Geen extra dep. |

**Installation:** `npm ls zod` verifiëren, anders `npm install zod@^3.25.0`.

## Architecture Patterns

### Recommended Code Organization

```
src/
├── lib/
│   ├── consolidation-guards.ts       # NIEUW — pure guard functies (D-01, D-02, D-27)
│   │                                   # exports: validateNeutralTitle, validateSameDomain,
│   │                                   # validateDrieluikThreshold, SECTOR_NAME_REGEX
│   ├── schemas.ts                    # UITBREIDEN — VermogenGelijkenisGroepSchema,
│   │                                   # SubEffortAdviesSchema, Stap2ResultSchema.extend
│   ├── types.ts                      # AFGELEID — z.infer<> types (automatisch via schemas.ts)
│   └── prompts.ts                    # UITBREIDEN — CROSS_ANALYSE_STAP2_PROMPT herzien,
│                                       # CROSS_ANALYSE_STAP3_PROMPT + STAP4_PROMPT aangescherpt,
│                                       # SUB_EFFORT_ANALYSE_PROMPT nieuw
├── app/api/
│   ├── din-suggest/route.ts          # UITBREIDEN — tak "consolidatie-herzien" (D-08)
│   └── cross-analyse/route.ts        # UITBREIDEN — stap 4 branch roept analyzeSubEffortsPerGroup
│                                       # aan voor elke VermogenGelijkenisGroep (D-10, D-11)
└── components/
    ├── steps/
    │   └── CrossAnalyseStep.tsx      # UITBREIDEN — mergeEfforts krijgt context-param voor guard;
    │                                   # mergeCapabilities blijft voor legacy maar title-guard toegevoegd
    └── cross-analyse/
        ├── StapConsolidatie.tsx       # UITBREIDEN — auto-apply try/catch per cluster,
        │                                # summary toast, "Vereist review" badge, context-textarea
        │                                # doorpropagate naar ClusterCard
        ├── StapSectorVertaling.tsx    # HERSCHRIJVEN — drieluik-rendering per
        │                                # VermogenGelijkenisGroep; hefboomlaag; pijlen
        │                                # Verwijder: Variant A/B logica (regel 122-140),
        │                                # sharedCaps/sharedEffortGroups (D-15 obsolete).
        │                                # Nieuwe sub-components (optioneel): VermogenDrieluik,
        │                                # HefboomLaag, SubEffortSection
        └── shared/
            ├── ClusterCard.tsx         # UITBREIDEN — context-textarea + "Herzie advies" knop
            └── ConsolidationActionBar.tsx  # UITBREIDEN — showGuardError state, inline error
                                              # banner, disabled-until-valid merge button
└── lib/__tests__/
    └── consolidation.test.ts          # UITBREIDEN — guard-test cases (D-24)
    # NIEUW: consolidation-guards.test.ts — optioneel, bij losse module
```

### Pattern 1: Pure Guard met Contextparameter (D-27)

**What:** `mergeEfforts` krijgt optionele `context` param voor drieluik-drempel-check zonder impure te worden.

**When to use:** Als pure functies runtime-data nodig hebben voor validatie.

**Example (verified against CrossAnalyseStep.tsx regel 85-130):**

```typescript
// src/lib/consolidation-guards.ts
import type { DINEffort, VermogenGelijkenisGroep, CapabilityEffortMap } from "./types";

export const SECTOR_NAME_REGEX = /\b(PO|VO|Zakelijk|primair onderwijs|voortgezet onderwijs)\b/i;
export const MIN_TITLE_LENGTH = 10;

export function validateNeutralTitle(title: string): void {
  if (!title || title.length < MIN_TITLE_LENGTH) {
    throw new Error(`Titel te kort (minimum ${MIN_TITLE_LENGTH} tekens): "${title}"`);
  }
  const match = title.match(SECTOR_NAME_REGEX);
  if (match) {
    throw new Error(`Titel bevat sector-naam "${match[0]}" — sectoroverstijgende titel vereist`);
  }
}

export function validateSameDomain(items: DINEffort[]): void {
  const domains = new Set(items.map((e) => e.domain));
  if (domains.size > 1) {
    throw new Error(
      `Cross-domein merge geblokkeerd: ${Array.from(domains).join(" + ")}`
    );
  }
}

export interface DrieluikContext {
  gelijkenisGroepen: VermogenGelijkenisGroep[];
  capEffortMaps: CapabilityEffortMap[];
}

export function validateDrieluikThreshold(
  effortIds: string[],
  ctx: DrieluikContext
): void {
  // Voor elke effort: via capEffortMaps → capabilityIds → welke groep?
  const effortCapIds = new Map<string, Set<string>>();
  for (const eId of effortIds) {
    const caps = ctx.capEffortMaps
      .filter((m) => m.effortId === eId)
      .map((m) => m.capabilityId);
    effortCapIds.set(eId, new Set(caps));
  }

  // Zoek een gemeenschappelijke groep die: (a) alle drie sectoren heeft,
  // (b) waar ELKE effort minstens één cap aan raakt.
  for (const groep of ctx.gelijkenisGroepen) {
    const groepCapIds = new Set(groep.vermogenIds);
    // Alle drie sectoren — afgeleid uit capabilities? Nee: check expliciet via metadata.
    // MAAR: D-26 definieert groep heeft minstens 1 vermogen per sector. Validatie
    // zit in schema. Hier checken we of alle effortIds deze groep raken.
    const allEffortsReachGroep = effortIds.every((eId) => {
      const caps = effortCapIds.get(eId) ?? new Set();
      return [...caps].some((cId) => groepCapIds.has(cId));
    });
    if (allEffortsReachGroep) return; // geldig
  }

  throw new Error(
    "Cross-analyse drempel niet gehaald: inspanningen raken geen drieluik van gelijkende sector-vermogens"
  );
}
```

**Integratie in `mergeEfforts` (uitbreiden, niet vervangen):**

```typescript
// src/components/steps/CrossAnalyseStep.tsx
export function mergeEfforts(
  session: DINSession,
  clusterItemIds: string[],
  suggestedTitle?: string,
  context?: DrieluikContext  // NIEUW — optioneel voor backward compat met legacy testcalls
): DINSession {
  if (clusterItemIds.length < 2) return session;
  const itemsToMerge = session.efforts.filter(e => clusterItemIds.includes(e.id));
  if (itemsToMerge.length < 2) return session;

  // GUARDS (D-01, D-02, D-27)
  if (suggestedTitle) validateNeutralTitle(suggestedTitle);
  validateSameDomain(itemsToMerge);
  if (context) validateDrieluikThreshold(clusterItemIds, context);
  // ... bestaande logic ...
}
```

**Waarom optioneel context param:** de bestaande test-suite (`consolidation.test.ts` regel 182-200) roept `mergeEfforts` zonder context aan. Optioneel houdt backward compat; nieuwe tests geven wél context mee en verifiëren throw-gedrag.

### Pattern 2: State Machine Extension voor Guard Errors (D-04)

**What:** `ConsolidationActionBar` state machine (regel 32-35) uitbreiden met `showGuardError` sub-state.

**When to use:** Als nieuwe fail-modes de bestaande happy-path state-machine raken.

**Example (uitbreiding op bestaande pattern):**

```typescript
// src/components/cross-analyse/shared/ConsolidationActionBar.tsx
const [showConfirm, setShowConfirm] = useState(false);
const [showAfstemmingsAdvies, setShowAfstemmingsAdvies] = useState(false);
const [generatedAdvice, setGeneratedAdvice] = useState<string[] | null>(null);
const [isGenerating, setIsGenerating] = useState(false);
// NIEUW:
const [guardError, setGuardError] = useState<string | null>(null);
const [isHerzienLoading, setIsHerzienLoading] = useState(false);

async function tryMerge() {
  try {
    onMerge(itemIds); // throw mogelijk
    setShowConfirm(false);
    setGuardError(null);
  } catch (err) {
    setGuardError(err instanceof Error ? err.message : "Merge gefaald");
    setShowConfirm(false);
  }
}

// Inline error banner render (bovenaan sub-states):
{guardError && (
  <div className="mt-3 p-3 bg-red-50 border border-red-200 rounded-lg">
    <p className="text-xs font-semibold text-red-800">Samenvoeging niet mogelijk</p>
    <p className="text-xs text-red-700 mt-1">{guardError}</p>
    <div className="flex gap-2 mt-2">
      <button onClick={onHerzieAdvies} disabled={isHerzienLoading}>
        {isHerzienLoading ? "Bezig..." : "Herzie advies"}
      </button>
      <button onClick={() => setGuardError(null)}>Sluiten</button>
    </div>
  </div>
)}
```

### Pattern 3: Auto-Apply Skip-on-Failure (D-05)

**What:** `useEffect` in `StapConsolidatie.tsx` regel 108-162 krijgt try/catch per cluster.

**Example (uitbreiding):**

```typescript
// src/components/cross-analyse/StapConsolidatie.tsx
useEffect(() => {
  if (autoApplied) return;
  // ... bestaande hasCombineren check ...
  setAutoApplied(true);
  let mergedCount = 0;
  const failedClusters: string[] = [];

  updateSession((prev) => {
    let updated = prev;
    const drieluikCtx = {
      gelijkenisGroepen: stap2Result?.vermogenGelijkenisGroepen ?? [],
      capEffortMaps: prev.capabilityEffortMaps,
    };

    for (const cluster of inspanningClusters) {
      if (cluster.aanbeveling !== "combineren") continue;
      const ids = cluster.items.map((it) => it.id);
      if (ids.length < 2) continue;
      const key = [...ids].sort().join(",");
      if (mergedEffClusters.has(key)) continue;

      const title = findSuggestedTitle(cluster.clusterTitel);
      try {
        updated = mergeEfforts(updated, ids, title, drieluikCtx);
        const sharedId = updated.efforts[updated.efforts.length - 1]?.id;
        if (sharedId) {
          setMergedEffClusters((p) => new Map(p).set(key, sharedId));
          mergedCount++;
        }
      } catch (err) {
        console.warn(`[consolidatie] Cluster skipped: ${err instanceof Error ? err.message : err}`);
        failedClusters.push(key);
      }
    }
    return updated;
  });

  const summary = failedClusters.length > 0
    ? `${mergedCount} cluster${mergedCount !== 1 ? "s" : ""} samengevoegd, ${failedClusters.length} vereisen review`
    : `${mergedCount} cluster${mergedCount !== 1 ? "s" : ""} samengevoegd`;
  if (mergedCount > 0 || failedClusters.length > 0) setToastMessage(summary);
  // failedClusters bewaren in state voor "Vereist review" badge op ClusterCard
}, [stap2Result, stap3Result, stap4Result, autoApplied]);
```

### Pattern 4: Drieluik Rendering (D-28)

**What:** CSS Grid 3-column layout met overlappende hefboomlaag.

**Layout structuur:**

```tsx
{/* Per VermogenGelijkenisGroep */}
<section className="bg-teal-50/30 border border-teal-200 rounded-xl p-5">
  {/* Rationale-kop (D-28 boven) */}
  <div className="mb-4 text-center">
    <p className="text-[10px] font-bold text-teal-700 uppercase tracking-wider mb-1">
      Gelijkende vermogens — hefboomgroep
    </p>
    <p className="text-sm font-semibold text-gray-800">{groep.gezamenlijkeOmschrijving}</p>
    <p className="text-xs text-gray-500 mt-1 italic">{groep.reden}</p>
    {/* Domein-balans badge (D-29) */}
    <DomainBalanceBadge groepId={groep.id} bundledEfforts={bundledEfforts} />
  </div>

  {/* Drie parallelle vermogen-kaarten (D-28 midden) */}
  <div className="grid grid-cols-1 md:grid-cols-3 gap-3 mb-4">
    {groep.vermogenIds.map((vId) => {
      const cap = session.capabilities.find((c) => c.id === vId);
      if (!cap) return null;
      return (
        <div key={vId} className="bg-white border-2 border-teal-300 rounded-lg p-3">
          <div className="flex items-center justify-between mb-1">
            <SectorBadge sector={cap.sectorId} />
          </div>
          <p className="text-sm font-medium text-gray-800">{cap.title || cap.description}</p>
        </div>
      );
    })}
  </div>

  {/* Hefboom-pijlen (inline SVG, drie pijlen van onder naar boven) */}
  <HefboomPijlen count={3} />

  {/* Hefboomlaag — per domein gebundelde inspanningen (D-28 onder) */}
  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-2 mt-2">
    {DOMEIN_ORDER.map((domein) => {
      const advies = stap4Result?.subEffortAnalysis?.find(
        (s) => s.groepId === groep.id && s.domein === domein
      );
      return <DomeinSectie key={domein} domein={domein} advies={advies} />;
    })}
  </div>
</section>
```

**Hefboom-pijlen (inline SVG, verified pattern via StapSectorVertaling.tsx regel 423-430 en 47-52):**

```tsx
function HefboomPijlen() {
  return (
    <div className="grid grid-cols-3 gap-3 my-2">
      {[0, 1, 2].map((i) => (
        <div key={i} className="flex justify-center">
          <svg className="w-6 h-6 text-teal-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
              d="M5 10l7-7m0 0l7 7m-7-7v18" />
          </svg>
        </div>
      ))}
    </div>
  );
}
```

**Mobile fallback:** `grid-cols-1 md:grid-cols-3` — de drie vermogens stapelen verticaal onder de breakpoint. Hefboom-pijlen verbergen op mobile met `hidden md:grid` (visualisatie heeft geen waarde bij verticaal stapelen).

### Pattern 5: Hefboom-badge op Inspanningen (D-32)

**What:** Outline badge onder de effort-titel met hover-tooltip.

**Example:**

```tsx
{/* In HefboomLaag / DomeinSectie / elke gebundelde inspanning */}
<div className="relative group">
  <span className="inline-flex items-center gap-1 text-[10px] font-semibold text-teal-700 border border-teal-300 bg-teal-50 rounded-full px-2 py-0.5 mt-1">
    <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
    </svg>
    Hefboom: raakt 3 sectoren via gelijkende vermogens
  </span>
  {/* Tooltip: native title kan, of Tailwind group-hover */}
  <div className="invisible group-hover:visible absolute left-0 top-full mt-1 z-10 bg-gray-900 text-white text-xs rounded p-2 shadow-lg min-w-[200px]">
    Gelijkende vermogens:
    <ul className="mt-1 space-y-0.5">
      {groep.vermogenIds.map(vId => {
        const cap = session.capabilities.find(c => c.id === vId);
        return <li key={vId}>{cap?.sectorId}: {cap?.title}</li>;
      })}
    </ul>
  </div>
</div>
```

### Anti-Patterns to Avoid

- **NIET: shared caps opnieuw gebruiken als organigram-anker.** D-25 lockt: cross-analyse voegt vermogens niet meer samen. De oude `sharedCaps` logica in `StapSectorVertaling.tsx` regel 104 (`focusCaps.filter((c) => (c.relatedSectors?.length ?? 0) > 1)`) moet VERVANGEN worden door iteratie over `VermogenGelijkenisGroep[]`. Niet parallel laten bestaan — dat geeft dubbele rendering.
- **NIET: `VermogenGelijkenisGroep` als entiteit in `session.capabilities`.** Het is metadata, geen keten-entiteit. Hoort in `session.crossAnalyseWizard.stepResults.stap2.vermogenGelijkenisGroepen`.
- **NIET: impure `mergeEfforts` met directe session-access voor drempel-check.** Gebruik context-parameter pattern (Pattern 1) — behoudt testbaarheid.
- **NIET: nieuwe API route voor sub-effort analyse.** D-10 lockt: draait als onderdeel van bestaande stap 4 branch in `api/cross-analyse/route.ts`.
- **NIET: Zod schema opnieuw definiëren in types.ts.** Types worden afgeleid via `z.infer<>` — zie `schemas.ts` regel 850-918.
- **NIET: auto-apply die stopt bij eerste failure.** D-05 lockt: stil skippen + summary toast. Gebruiker ziet welke clusters review vereisen via badge.
- **NIET: force-update van legacy sessies.** D-23 lockt: warning badge only, geen destructieve migratie.
- **NIET: nieuwe state voor `session.vermogenGelijkenisGroepen` op top-level.** Hoort in wizard `stepResults.stap2` — persistence gebeurt automatisch via bestaand `updateSession(prev => ...)` pattern.

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| JSON extractie uit AI text response | Eigen regex | `extractJSON()` + `parseAIResponse()` uit `ai-client.ts` regel 84-146 | Hanteert markdown code blocks, retry semantiek, Zod validatie al correct |
| Retry logic voor AI-call | Eigen for-loop | `callClaudeWithValidation()` uit `ai-client.ts` regel 153-184 | 2 stille retries, schema validatie, consistente error shape |
| Prompt-assemblage met programmaboek-context | Handmatige string-concat | `assembleSystemPrompt()` uit `prompt-assembly.ts` regel 374-400 | D-03..D-09 layered context (programmaboek → KiB → sectorwerk → completed goals), token budget capping |
| Consolidation origin lookup voor legacy-warning | Eigen filter-chain | `getConsolidationOrigins()` uit `stap5-focus.ts` regel 42-55 | Al gebruikt voor `MergeHerkomst` component, consistent contract |
| Sector-kleur badge | Eigen component | `SectorBadge` uit `components/cross-analyse/shared/SectorBadge.tsx` | Al gebruikt in hele codebase, consistente kleuren |
| Word-boundary regex voor NL-sector-namen | Eigen regex van scratch | `SECTOR_NAME_REGEX` in nieuwe `consolidation-guards.ts` (D-01 lockt pattern) | Locked pattern: `/\b(PO|VO|Zakelijk|primair onderwijs|voortgezet onderwijs)\b/i` |
| localStorage/Supabase dual persistence voor nieuwe velden | Eigen save-logic | `updateSession(prev => ({ ...prev, newField }))` uit `session-context.tsx` | Dual persistence automatisch: sync-first localStorage, async Supabase, version counter |
| Toast notificaties | Eigen state + timer | Bestaande `setToastMessage` pattern in `StapConsolidatie.tsx` regel 82-89 (3s auto-clear) | Consistent UX; Toast provider is al klant-wide |
| SVG pijl-icons voor hefboom-laag | External SVG library | Inline Heroicons-style SVG (zoals in codebase overal) | Geen dep-creep, consistent met bestaande icon-stijl |

**Key insight:** De codebase heeft al patronen voor **alle** Phase 17 bouwstenen behalve het `VermogenGelijkenisGroep` concept zelf. De research-opdracht is daarom vooral compositie en niet nieuwe infrastructuur bouwen.

## Runtime State Inventory

| Category | Items Found | Action Required |
|----------|-------------|------------------|
| Stored data | `session.capabilities[]` met `consolidated=true` flags uit eerdere Phase 8 merges (bestaande sessies in localStorage + Supabase). Ook `session.crossAnalyseWizard.stepResults.stap2.vermogenClusters` met `aanbeveling: "combineren"` van oude runs. | Code edit only — geen destructieve data-migratie (D-23). Render warning-badge op consolidated caps: "Legacy: vermogens-merge (niet meer toegepast in cross-analyse)". Behoud `consolidated` flag voor backward compat van `MergeHerkomst` tooltip. Nieuwe `VermogenGelijkenisGroep[]` wordt bij volgende stap 2 "Analyseer" klik naast bestaande data gegenereerd. |
| Live service config | Supabase table `din_sessions` met `data jsonb` — bevat de hele sessie incl. `crossAnalyseWizard`. Nieuw veld `vermogenGelijkenisGroepen` landt automatisch in jsonb. Géén schema migratie nodig. | None — jsonb structuur is schema-loos. Optioneel: `DINSessionSchema` graceful default (`vermogenGelijkenisGroepen: [].optional().default([])`) zodat load-path niet faalt op sessies zonder het veld. |
| OS-registered state | Geen — Next.js/Vercel serverless, geen OS-level registraties. | None. |
| Secrets/env vars | `ANTHROPIC_API_KEY` wordt door bestaande routes gebruikt. Nieuwe `consolidatie-herzien` tak en `SUB_EFFORT_ANALYSE_PROMPT` gebruiken dezelfde key. | None — variabele naam onveranderd. |
| Build artifacts / installed packages | `.next/` build cache, `node_modules/`. Geen compile-time codegen zoals `programmaboek-context.ts` die in Phase 3 generated is — dat blijft. Als `zod` niet expliciet in package.json staat, moet het installed worden. | Verifieer in Wave 0: `npm ls zod`. Indien ontbreekt, installeren en `package.json` committen. |

**Runtime canonical question answered:** Na een repo-update blijven bestaande sessies werken omdat: (a) `Stap2ResultSchema` krijgt `vermogenGelijkenisGroepen` als `optional().default([])`, (b) `Stap4ResultSchema` krijgt `subEffortAnalysis` als `optional().default([])`, (c) `ConsolidatieAdviesItemSchema` krijgt `context` als `optional()`, (d) `VermogenClusterItemSchema.aanbeveling` krijgt een derde enum-optie `markeer_gelijkenis` (nieuwe AI-output past, oude data met `combineren`/`afstemmen`/`apart_houden` blijft valide).

## Common Pitfalls

### Pitfall 1: Zod schema breaking change op stap 2 enum

**What goes wrong:** Het uitbreiden van `VermogenClusterItemSchema.aanbeveling` met `markeer_gelijkenis` is technisch additief, maar als de AI voor de Phase 17-migratie nog `combineren` retourneert voor een vermogen-cluster, kan dat per ongeluk via auto-apply alsnog een vermogen-merge triggeren — in directe tegenspraak met D-25.

**Why it happens:** `StapConsolidatie.tsx` regel 122-137 filtert op `cluster.aanbeveling === "combineren"` voor vermogen-clusters en roept `mergeCapabilities` aan. Zonder extra guard blijft dit pad open.

**How to avoid:** In Wave 1 óók de auto-apply loop aanpassen: vermogen-clusters (de oude `vermogenClusters`) worden NIET meer auto-merged. Alleen inspanning-clusters. Expliciete comment: `// D-25 — vermogen-merge niet meer auto-toegepast`. En in `CROSS_ANALYSE_STAP2_PROMPT` instructie toevoegen dat `combineren` niet meer mag.

**Warning signs:** Oude sessie met `vermogenClusters[].aanbeveling === "combineren"` laadt → auto-apply merged per ongeluk → `mergeCapabilities` krijgt titel zonder title-guard te hebben gedraaid → mogelijke inconsistentie in organigram.

### Pitfall 2: Drieluik-drempel guard leak bij auto-apply

**What goes wrong:** Als `drieluikCtx` niet wordt doorgegeven aan `mergeEfforts` in auto-apply, faalt de guard niet — of erger: de guard wordt overgeslagen, en AI-geadviseerde clusters die de drempel niet halen worden toch gemerged.

**Why it happens:** De context-parameter is optioneel (backward compat voor bestaande tests). Programmeur vergeet hem door te geven.

**How to avoid:** In `StapConsolidatie.tsx` auto-apply useEffect ALTIJD `drieluikCtx` construeren en meegeven. In nieuwe test-cases expliciet een test toevoegen: "mergeEfforts WITHOUT drieluik context werkt nog (legacy), MET context throw bij ontbreken van groep". Documenteer het patroon in een JSDoc op `mergeEfforts`.

**Warning signs:** Tests slagen groen maar UI merged clusters die in het organigram geen drieluik zouden hebben.

### Pitfall 3: `DINSessionSchema` Zod parsing faalt op oude sessies

**What goes wrong:** Als `Stap2ResultSchema.vermogenGelijkenisGroepen` niet `.optional().default([])` is, faalt load van legacy sessies met `ZodError: Required`.

**Why it happens:** Phase 1 heeft `Stap2ResultSchema` gemaakt zonder het nieuwe veld; bestaande sessies hebben het veld niet. Default is vereist voor graceful degradation.

**How to avoid:** ALLE nieuwe schema-velden op top-level krijgen `.optional().default([])` of `.optional()` afhankelijk van type. Zie `Stap4ResultSchema.consolidatieAdvies` regel 446 voor het patroon (`.optional().default([])`).

**Warning signs:** Sessielijst laadt niet meer op home page; console-error `[kib] ZodError` of `[persistence] Supabase … ZodError`. `npm run build` blijft groen (TS weet niet van runtime failures).

### Pitfall 4: Hefboom-badge tooltip unieke per inspanning

**What goes wrong:** De hefboom-tooltip (D-32) toont "de drie vermogens", maar als het organigram meerdere groepen heeft, moet elke inspanning de juiste groep-context tonen — anders verwart de gebruiker.

**Why it happens:** Plat map-lookup op `vermogenGelijkenisGroepen` vindt mogelijk de eerste groep in plaats van de specifieke groep waar de inspanning onder valt.

**How to avoid:** In sub-effort rendering bewaar `groepId` mee in de data-attributes van de badge; lookup via `groepId` specifiek. Alternatief: render tooltip child binnen de groep-container zodat scope duidelijk is.

### Pitfall 5: `maxDuration = 300` timeout bij N sequentiële SUB_EFFORT_ANALYSE calls

**What goes wrong:** D-11 lockt 1 AI-call per groep. Als een sessie 5+ groepen heeft, kan de stap-4 branch in `/api/cross-analyse/route.ts` over 300s lopen (`export const maxDuration = 300;`). Vercel killt → 504.

**Why it happens:** Elke sub-analyse call is ~10-30s. 5 groepen = 50-150s, redelijk. 10+ groepen = risico.

**How to avoid:** (a) Monitor token-gebruik, cap efforts per groep op 20 (voor de AI-call, niet voor opslag), (b) stuur parallelle calls via `Promise.all()` als Claude SDK parallellisme support biedt, (c) fallback: skip sub-analyse bij >8 groepen en toon UI-warning. Aanbevolen: **parallelle calls** — Claude API staat concurrent requests toe.

**Warning signs:** `FUNCTION_INVOCATION_TIMEOUT` error in `CrossAnalyseWizard.tsx` regel 244-249.

### Pitfall 6: ClusterCard prop-explosion

**What goes wrong:** `ClusterCard` krijgt nieuwe `context: string`, `onHerzieAdvies: () => Promise<void>`, `isHerzienLoading: boolean`, `onContextChange: (s: string) => void` props erbij — teveel.

**How to avoid:** Bundel in één `herzieAdvies?: HerzieAdviesProps` object dat optioneel is; bestaande callers (readOnly mode) ongemoeid. Alternatief: losse custom hook `useHerzieAdvies(clusterTitel)` die state en fetch binnen `ClusterCard` managed — past bij React 19 pattern.

### Pitfall 7: Color-coded domein-secties onleesbaar in hefboomlaag bij leeg domein

**What goes wrong:** Bij lege domein-sectie (geen gebundelde inspanning) is de placeholder "Geen gezamenlijke inspanning" (D-28) moeilijk leesbaar op lichte pastel achtergrond.

**How to avoid:** Voor leeg-staat geen achtergrondkleur gebruiken — alleen dashed border met grijze tekst. Zie bestaand pattern in `StapConsolidatie.tsx` regel 362-374 (`border-dashed … opacity-60`).

## Code Examples

Verified patterns from official codebase sources:

### Example 1: Zod schema extensie met backward compat

```typescript
// src/lib/schemas.ts — uitbreiden na regel 298
// Source: verified against schemas.ts regel 300-329 en 445-462

export const VermogenGelijkenisGroepSchema = z.object({
  id: z.string(),
  vermogenIds: z.array(z.string()).min(1),
  gezamenlijkeOmschrijving: z.string(),
  reden: z.string(),
});

// Uitbreiden bestaande Stap2ResultSchema (regel 433-437)
export const Stap2ResultSchema = z.object({
  vermogenClusters: z.array(VermogenClusterItemSchema).optional().default([]),
  hefboomwerking: z.array(CrossAnalyseHefboomItemSchema).optional().default([]),
  // NIEUW:
  vermogenGelijkenisGroepen: z.array(VermogenGelijkenisGroepSchema).optional().default([]),
  samenvatting: z.string(),
});

// VermogenClusterItemSchema aanbeveling enum uitbreiden (regel 312)
export const VermogenClusterItemSchema = z.object({
  clusterTitel: z.string(),
  items: z.array(z.object({ id: z.string(), beschrijving: z.string(), sector: z.string() })),
  batenContext: z.array(z.object({ baat: z.string(), sector: z.string() })),
  advies: z.string(),
  // D-30: nieuwe variant toegevoegd, backward compat
  aanbeveling: z.enum(["combineren", "afstemmen", "apart_houden", "markeer_gelijkenis"]),
});

// SubEffortAdviesSchema (D-30)
export const SubEffortAdviesSchema = z.object({
  groepId: z.string(),
  domein: EffortDomainSchema,
  actie: z.enum(["combineren", "apart_houden"]),
  items: z.array(z.string()),
  reden: z.string(),
  voorgesteldeNaam: z.string().nullable().optional(),
});

// Stap4ResultSchema uitbreiden (regel 445-462)
export const Stap4ResultSchema = z.object({
  consolidatieAdvies: z.array(z.object({
    clusterTitel: z.string(),
    type: z.enum(["vermogen", "inspanning"]),
    aanbeveling: z.enum(["combineren", "afstemmen", "apart_houden"]),
    reden: z.string(),
    voorgesteldeNaam: z.string().nullable().optional(),
    afstemmingsStappen: z.array(z.string()).optional().default([]),
    // NIEUW (D-19):
    context: z.string().optional(),
  })).optional().default([]),
  citobreedInzicht: z.array(/* ... onveranderd ... */).optional().default([]),
  // NIEUW (D-30):
  subEffortAnalysis: z.array(SubEffortAdviesSchema).optional().default([]),
  samenvatting: z.string(),
});

// Type exports — automatisch via z.infer<>
export type VermogenGelijkenisGroep = z.infer<typeof VermogenGelijkenisGroepSchema>;
export type SubEffortAdvies = z.infer<typeof SubEffortAdviesSchema>;
```

### Example 2: Nieuwe `consolidatie-herzien` tak in `din-suggest/route.ts`

```typescript
// src/app/api/din-suggest/route.ts — uitbreiden na regel 67
// Source: verified against din-suggest/route.ts regel 32-67

// Zod schema voor response
const ConsolidatieHerzienResponseSchema = z.object({
  aanbeveling: z.enum(["combineren", "afstemmen", "apart_houden"]),
  reden: z.string(),
  voorgesteldeNaam: z.string().nullable().optional(),
  afstemmingsStappen: z.array(z.string()).optional().default([]),
});

// In POST handler, NA de bestaande consolidatie-advies tak:
if (type === "consolidatie-herzien" && body.clusterItems && body.origineelAdvies) {
  if (!process.env.ANTHROPIC_API_KEY) {
    return NextResponse.json(
      { success: false, error: "ANTHROPIC_API_KEY niet geconfigureerd." },
      { status: 503 }
    );
  }

  const systemPrompt = assembleSystemPrompt(
    CONSOLIDATIE_HERZIEN_PROMPT, // nieuw in prompts.ts
    "cross-analyse",
    undefined,
    extractKiBContext({ goals: body.kibGoals, scope: body.kibScope })
  );

  const userMessage = [
    `Cluster: "${body.clusterTitel}"`,
    `Items:\n${body.clusterItems.map((it: any) => `- ${it.beschrijving} (${it.sector}, ${it.domein})`).join("\n")}`,
    `Origineel AI-advies:\n${JSON.stringify(body.origineelAdvies, null, 2)}`,
    body.userContext ? `\nGebruikerscontext voor herziening:\n${body.userContext}` : "",
  ].filter(Boolean).join("\n\n");

  const result = await callClaudeWithValidation(
    ConsolidatieHerzienResponseSchema,
    systemPrompt,
    userMessage,
    { maxTokens: 2048, maxRetries: 1 }
  );

  if (!result.success) {
    return NextResponse.json({ success: false, error: result.error, retryable: true }, { status: 422 });
  }
  return NextResponse.json({ success: true, data: result.data });
}
```

### Example 3: Sub-effort analyse per groep in `api/cross-analyse/route.ts`

```typescript
// src/app/api/cross-analyse/route.ts — uitbreiden binnen stap === 4 branch
// Source: verified against route.ts regel 126-225

if (stap === 4) {
  // 1. Run bestaande CROSS_ANALYSE_STAP4_PROMPT — ongewijzigd
  const consolidatieResult = await callClaudeWithValidation(
    Stap4ResultSchema,
    assembleSystemPrompt(CROSS_ANALYSE_STAP4_PROMPT, "cross-analyse", undefined, kibContext),
    userMessage,
    { maxTokens: 16384, model: "claude-opus-4-6" }
  );
  if (!consolidatieResult.success) { /* ... */ }

  // 2. Haal VermogenGelijkenisGroepen uit body.stap2Result (D-11)
  const groepen = (body.stap2Result?.vermogenGelijkenisGroepen ?? []) as Array<{
    id: string; vermogenIds: string[]; gezamenlijkeOmschrijving: string; reden: string;
  }>;

  // 3. Per groep een SUB_EFFORT_ANALYSE call (parallel voor snelheid — Pitfall 5)
  const subAnalyses = await Promise.all(
    groepen.map(async (groep) => {
      const groepCaps = capsData.filter((c: any) => groep.vermogenIds.includes(c.id));
      const capIdSet = new Set(groep.vermogenIds);
      const groepEffortIds = new Set(
        (body.capabilityEffortMaps ?? [])
          .filter((m: any) => capIdSet.has(m.capabilityId))
          .map((m: any) => m.effortId)
      );
      const groepEfforts = effortsData.filter((e: any) => groepEffortIds.has(e.id));

      if (groepEfforts.length === 0) return []; // D-13 — skip empty

      const subResult = await callClaudeWithValidation(
        z.array(SubEffortAdviesSchema),
        assembleSystemPrompt(SUB_EFFORT_ANALYSE_PROMPT, "cross-analyse", undefined, kibContext),
        JSON.stringify({ groep, vermogens: groepCaps, efforts: groepEfforts }, null, 2),
        { maxTokens: 4096 }
      );
      return subResult.success ? subResult.data : [];
    })
  );

  return NextResponse.json({
    success: true,
    data: {
      analysis: {
        ...consolidatieResult.data,
        subEffortAnalysis: subAnalyses.flat(),
      },
      stap: 4,
    },
  });
}
```

### Example 4: Drieluik rendering met domein-balans badge

```tsx
// src/components/cross-analyse/StapSectorVertaling.tsx — volledig vervangen van
// regel 232-493 (shared caps + Variant B) met onderstaande structuur
// Source: pattern afgeleid van regel 22-34 DOMAIN_COLORS + regel 243-295 card-structuur

const DOMEIN_ORDER = ["mens", "processen", "data_systemen", "cultuur"] as const;

function DomainBalanceBadge({
  groepId,
  subEffortAnalysis,
}: { groepId: string; subEffortAnalysis: SubEffortAdvies[] }) {
  const coveredDomains = new Set(
    subEffortAnalysis
      .filter((s) => s.groepId === groepId && s.actie === "combineren")
      .map((s) => s.domein)
  );
  const missing = DOMEIN_ORDER.filter((d) => !coveredDomains.has(d));
  const count = coveredDomains.size;

  const style =
    count >= 3 ? "bg-green-50 text-green-700 border-green-200"
    : count === 2 ? "bg-amber-50 text-amber-700 border-amber-200"
    : "bg-red-50 text-red-700 border-red-200";

  return (
    <span className={`inline-block text-[10px] font-semibold border rounded-full px-2 py-0.5 ${style} mt-2`}>
      Dekt {count} van 4 domeinen{missing.length > 0 ? ` — mist ${missing.map((d) => DOMAIN_LABELS[d]).join(", ")}` : ""}
    </span>
  );
}
```

### Example 5: Legacy warning badge

```tsx
// In StapSectorVertaling.tsx, bij render van capabilities met consolidated=true
// Source: D-23, pattern afgeleid van SectorBadge styling
{cap.consolidated && (
  <span className="inline-block text-[10px] font-semibold bg-amber-50 text-amber-700 border border-amber-200 rounded px-1.5 py-0.5 mt-1">
    Legacy: vermogens-merge (niet meer toegepast in cross-analyse)
  </span>
)}
```

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| Shared caps = auto-merge van gelijkende sector-vermogens tot één record (`mergeCapabilities` in cross-analyse flow) | `VermogenGelijkenisGroep` markering zonder merge; drie vermogens blijven intact | 2026-04-17 (CONTEXT.md revision D-25..D-32) | Behoud sector-herkenning, methodisch correcter (baten/vermogens blijven sector-specifiek per programmaboek) |
| Variant A/B rendering (shared cap vs. shared effort over sector-caps) | Eén rendering-vorm: drieluik per `VermogenGelijkenisGroep` | 2026-04-17 (D-28 vervangt D-14/D-15) | Simpelere organigram-logica, voorspelbaar per-groep layout |
| Sub-effort analyse onder shared cap | Sub-effort analyse per `VermogenGelijkenisGroep` (input van 3 vermogens) | 2026-04-17 (D-31) | AI krijgt cross-sector context bij sub-analyse, beter advies |
| `consolidatieAdvies` bevat `type: "vermogen"` of `"inspanning"` | Cross-analyse stap 4 produceert alleen `type: "inspanning"` (vermogen-merges uit cross-analyse flow geschrapt) | 2026-04-17 (D-30) | Schema-filter op client; `type: "vermogen"` blijft schema-compatible voor legacy maar wordt niet meer geproduceerd |

**Deprecated/outdated:**
- **Variant B detection logic** (`StapSectorVertaling.tsx` regel 122-140): vervangen door drieluik-iteratie. Code blok VERWIJDEREN.
- **sharedCaps berekening** (`StapSectorVertaling.tsx` regel 104): niet meer rendering-anker; gebruikt nu alleen als legacy-detectie bron.
- **Auto-apply van vermogen-clusters met `aanbeveling === "combineren"`** (`StapConsolidatie.tsx` regel 122-137): vervangen door no-op met console.warn "vermogen-merge is geen cross-analyse actie meer".

## Open Questions

1. **Parallelle Anthropic API calls — is er rate-limiting?**
   - What we know: Claude API ondersteunt concurrent requests; Vercel Pro staat langere maxDuration toe (tot 300s reeds geconfigureerd).
   - What's unclear: Of Anthropic account een concurrent-request limit heeft dat 5-10 parallelle calls blokkeert.
   - Recommendation: In Wave 2 start met `Promise.all`; fallback `for (const groep of groepen)` sequentieel als 429-errors optreden. Meet via Vercel logs. Documenteer in plan-artefact.

2. **`vermogenGelijkenisGroepen` en re-analyse van stap 2 — wat te doen bij bestaande groepen?**
   - What we know: D-26 lockt dat AI ze genereert tijdens stap 2. D-12 lockt dat sub-analyse sticky is.
   - What's unclear: Bij opnieuw "Analyseer" in stap 2 — moeten bestaande `vermogenGelijkenisGroepen` IDs hergebruikt worden (stabiele IDs) of compleet opnieuw gegenereerd?
   - Recommendation: **Compleet opnieuw genereren** met nieuwe `crypto.randomUUID()`. Omdat (a) sub-effort analyse anyway opnieuw draait bij stap 4, (b) groepen zijn analyse-output, niet gebruikers-bewerkte entiteiten. Bestaande `stap4Result.subEffortAnalysis` wordt automatisch invalidated want oude `groepId`s bestaan niet meer.

3. **`mergeCapabilities` en title-guard in legacy-gebruik** — D-01 lockt dat title-guard ook in `mergeCapabilities` geldt. Maar D-25 zegt dat cross-analyse `mergeCapabilities` niet meer aanroept. Wie roept het dan nog aan?
   - What we know: `mergeCapabilities` is geëxporteerd uit `CrossAnalyseStep.tsx` regel 9-66 en alleen gebruikt in `StapConsolidatie.tsx` regel 131 + 169 + 195.
   - What's unclear: Of er externe call-sites zijn buiten de cross-analyse flow.
   - Recommendation: Grep via `Grep` tool `mergeCapabilities` door hele codebase in Wave 0; als alleen `StapConsolidatie` het aanroept, en D-25 zegt dat die flow niet meer aanroept → functie blijft bestaan voor tests maar wordt effectief dead code. Title-guard toch toevoegen voor zekerheid (D-01 lockt het expliciet voor beide functies).

4. **`consolidatie-herzien` response shape — ook voor vermogen-clusters?**
   - What we know: D-25 zegt dat stap 4 consolidatieAdvies geen `type: "vermogen"` meer produceert.
   - What's unclear: Als oude sessie nog vermogen-advies heeft, en gebruiker klikt daar "Herzie advies" — moet het werken?
   - Recommendation: Ja, omdat `consolidatieAdvies` nog bestaand vermogen-entries kan bevatten (legacy). `consolidatie-herzien` accepteert cluster items generiek; tak faalt niet op `type === "vermogen"`. Wel: herzien advies produceert geen `voorgesteldeNaam` als cluster-items vermogens zijn (nooit mergen) — gebruik response voor `afstemmen`-advies.

## Environment Availability

| Dependency | Required By | Available | Version | Fallback |
|------------|------------|-----------|---------|----------|
| Node.js | Next.js dev/build | ✓ | 16.8+ (inferred from Next 16.1) | — |
| npm | Package management | ✓ | — | — |
| `@anthropic-ai/sdk` | All AI calls | ✓ | 0.78.0 | — |
| `vitest` | Test runner | ✓ | 4.1.2 | — |
| `zod` | Schema validation | Verify in Wave 0 (`npm ls zod`) | — | `npm install zod` if missing |
| `ANTHROPIC_API_KEY` env | Runtime AI calls | ✓ (production + local `.env.local`) | — | Routes return graceful error if missing (already implemented pattern) |
| Supabase (service) | Dual persistence | ✓ (configured, not required for Phase 17 work) | — | localStorage-only mode works (isSupabaseConfigured guard) |
| Docker | Containerization | Not used | — | — |
| ffmpeg / media | Not needed | — | — | — |

**Missing dependencies with no fallback:** None.

**Missing dependencies with fallback:** `zod` — if missing from package.json explicitly, install in Wave 0 and commit. Given schemas.ts imports `z from "zod"` and builds pass, it is transitively available but explicit top-level dep is cleaner.

## Validation Architecture

### Test Framework

| Property | Value |
|----------|-------|
| Framework | vitest 4.1.2 |
| Config file | `vitest.config.ts` (alias `@/` → `./src`, include `src/**/*.test.ts`) |
| Quick run command | `npx vitest run src/lib/__tests__/consolidation.test.ts` |
| Full suite command | `npx vitest run` |
| Build verify | `npm run build` |
| Lint | `npm run lint` |

### Phase Requirements → Test Map

| Req ID | Behavior | Test Type | Automated Command | File Exists? |
|--------|----------|-----------|-------------------|-------------|
| R-CROSS-01 | Drieluik toont per groep 3 sector-badges en hefboom-badge | manual-only (UI) | — | N/A (human-verify) |
| R-CROSS-01 | Hefboom-badge toont 3 vermogens in tooltip | manual-only (UI) | — | N/A |
| R-CROSS-01 | Domein-balans badge kleurconventie (groen≥3, amber=2, rood≤1) | unit | `npx vitest run src/lib/__tests__/consolidation.test.ts` (uit te breiden met DomainBalanceBadge helper) | ✅ Wave 0 extension |
| R-CROSS-02 | `mergeEfforts` throws bij titel "Training PO-leerkrachten" | unit | `npx vitest run src/lib/__tests__/consolidation.test.ts -t "title guard rejects sector name"` | ✅ extend existing |
| R-CROSS-02 | `mergeEfforts` accepteert "Klantgesprek-methodiek" (neutraal) | unit | `npx vitest run src/lib/__tests__/consolidation.test.ts -t "title guard accepts neutral"` | ✅ extend |
| R-CROSS-02 | `mergeEfforts` throws bij cross-domein (mens + data_systemen) | unit | `npx vitest run src/lib/__tests__/consolidation.test.ts -t "domain guard rejects"` | ✅ extend |
| R-CROSS-02 | `mergeEfforts` throws bij ontbreken drieluik-drempel | unit | `npx vitest run src/lib/__tests__/consolidation.test.ts -t "drieluik threshold"` | ✅ extend |
| R-CROSS-02 | Word-boundary regex accepteert "Protocol" en "VOldoende" | unit | `npx vitest run src/lib/__tests__/consolidation.test.ts -t "word boundary false positives"` | ✅ extend |
| R-CROSS-02 | Title < 10 chars throws | unit | `npx vitest run src/lib/__tests__/consolidation.test.ts -t "min length"` | ✅ extend |
| R-CROSS-02 | `VermogenGelijkenisGroep` schema vereist alle 3 sectoren | unit | `npx vitest run src/lib/__tests__/cross-analyse-schema.test.ts -t "gelijkenis groep sectors"` | ❌ Wave 0 — new file or extend `cross-analyse-schema.test.ts` |
| R-CROSS-02 | `Stap2ResultSchema` backward compat (loading session zonder `vermogenGelijkenisGroepen`) | unit | `npx vitest run src/lib/__tests__/cross-analyse-schema.test.ts` | ❌ extend |
| R-CROSS-02 | `Stap4ResultSchema` accepteert `subEffortAnalysis[]` + backward compat zonder | unit | `npx vitest run src/lib/__tests__/cross-analyse-schema.test.ts` | ❌ extend |
| R-CROSS-02 | Auto-apply loop skipt guard-failures en incrementeert failedClusters | unit (via pure helper extraction) | `npx vitest run src/lib/__tests__/consolidation.test.ts -t "auto apply skip failure"` | ❌ Wave 0 — pure helper extractie nodig voor testbaarheid |
| R-CROSS-02 | `/api/din-suggest` `consolidatie-herzien` tak valideert Zod response | integration (optional) + manual | — | N/A — dekking via schema-test |
| R-CROSS-02 | Herzie-advies overwrite-gedrag in `stap4Result.consolidatieAdvies` | manual-only | — | N/A (UI click flow) |
| R-CROSS-01 / R-CROSS-02 | `SUB_EFFORT_ANALYSE_PROMPT` returnt geldige `SubEffortAdvies[]` voor een groep | integration (mocked, optional) + manual | — | N/A — dekking via schema-test |

### Sampling Rate

- **Per task commit:** `npx vitest run src/lib/__tests__/consolidation.test.ts src/lib/__tests__/cross-analyse-schema.test.ts` (de twee directe test-files voor Phase 17 changes). Runtime ~3-5s.
- **Per wave merge:** `npx vitest run` + `npm run build` + `npm run lint`. Runtime ~30-60s.
- **Phase gate:** Volledige suite groen + `npm run build` groen + human-verify checkpoint in Stap 4 UI: (a) drieluik rendert, (b) hefboom-badge tooltip toont 3 vermogens, (c) domein-balans badge toont correct count, (d) guard error banner verschijnt bij cross-domein merge, (e) herzie-advies knop werkt, (f) auto-apply skipt failer met toast.

### Wave 0 Gaps

- [ ] **Pure helper extractie voor auto-apply loop**: `extractAutoApplyResult(clusters, drieluikCtx): { merged, failed }` in `src/lib/consolidation-guards.ts` (of bovenaan `StapConsolidatie.tsx`). Zonder dit is auto-apply niet unit-testbaar (zit nu in `useEffect`).
- [ ] **`src/lib/__tests__/consolidation.test.ts` uitbreiding** — 7+ nieuwe test-cases per D-24:
  - `mergeEfforts` title-guard (sector name)
  - `mergeEfforts` title-guard (min length)
  - `mergeEfforts` title-guard (word-boundary false positives: "Protocol", "VOldoende", "Automatiseren")
  - `mergeEfforts` domain-guard (cross-domein throws)
  - `mergeEfforts` domain-guard (same-domein accepts)
  - `mergeEfforts` drieluik-threshold (throws zonder drieluik)
  - `mergeEfforts` drieluik-threshold (accepts met valid drieluik)
  - Auto-apply pure helper (skipt failers, telt merged/failed correct)
  - `mergeCapabilities` title-guard (backward compat: no crash zonder guard, mét guard throws)
- [ ] **`src/lib/__tests__/cross-analyse-schema.test.ts`** (bestaand uitbreiden):
  - `VermogenGelijkenisGroepSchema` accepteert valide data
  - `Stap2ResultSchema.parse()` met zonder `vermogenGelijkenisGroepen` → default []
  - `Stap2ResultSchema.parse()` met het veld → behouden
  - `VermogenClusterItemSchema.aanbeveling` accepteert `"markeer_gelijkenis"` naast bestaande 3
  - `SubEffortAdviesSchema` accepteert valide data
  - `Stap4ResultSchema` backward compat met legacy data (geen `subEffortAnalysis`, geen `context`)
- [ ] **Framework install check:** `npm ls zod vitest` — verifieer expliciet beide dependencies. Als `zod` impliciet is → `npm install zod` + commit.
- [ ] **No new test framework install needed** — vitest reeds actief, 20 test-files draaien groen in bestaande suite.

## Sources

### Primary (HIGH confidence)

- `CLAUDE.md` (project instructions) — Nederlandstalige UI, dual persistence pattern, Cito blauw, `npm run build` verificatie, GSD workflow enforcement, Kwaliteitseis verificatie bij elke feature.
- `.planning/phases/17-…/17-CONTEXT.md` — alle D-01..D-32 decisions, locked implementation constraints.
- `.planning/REQUIREMENTS.md` — R-CROSS-01, R-CROSS-02 scope.
- `.planning/ROADMAP.md` regel 276-303 — Phase 17 original scope (note: CONTEXT.md revisie takes precedence).
- `.planning/STATE.md` — accumulated decisions voor eerdere fasen (Phase 8, 11, 12, 13, 14, 16) die Phase 17 patterns informeren.
- `.planning/config.json` — `nyquist_validation: true`, `commit_docs: true`, `granularity: fine`.
- `src/components/steps/CrossAnalyseStep.tsx` regel 9-146 — `mergeCapabilities`/`mergeEfforts` pure function signatures + bestaande logic (geen guards).
- `src/components/cross-analyse/StapConsolidatie.tsx` regel 99-192 — auto-apply useEffect + handleMerge* handlers.
- `src/components/cross-analyse/shared/ConsolidationActionBar.tsx` regel 32-185 — state machine `showConfirm`/`showAfstemmingsAdvies`/`isGenerating`.
- `src/components/cross-analyse/StapSectorVertaling.tsx` regel 1-699 — complete Variant A/B rendering (zal vervangen worden door drieluik).
- `src/components/cross-analyse/shared/ClusterCard.tsx` regel 1-91 — prop signature.
- `src/components/cross-analyse/CrossAnalyseWizard.tsx` regel 95-540 — wizard state, stap 4 AI-call signature.
- `src/lib/schemas.ts` regel 300-486 — `VermogenClusterItemSchema`, `InspanningClusterItemSchema`, `Stap2/3/4ResultSchema`, `CrossAnalyseWizardStateSchema`.
- `src/lib/prompts.ts` regel 166-315 — stap 2/3/4 prompts (locked, uit te breiden).
- `src/app/api/din-suggest/route.ts` regel 32-67 — bestaande `consolidatie-advies` tak (pattern voor `consolidatie-herzien`).
- `src/app/api/cross-analyse/route.ts` regel 64-262 — stap endpoints, cumulative context, structured payload.
- `src/lib/ai-client.ts` regel 1-184 — `callClaudeWithValidation`, `extractJSON`, `parseAIResponse`.
- `src/lib/prompt-assembly.ts` regel 1-400 — `assembleSystemPrompt`, `extractKiBContext`, `buildSectorwerkBlock`, `buildCompletedGoalsContext`.
- `src/lib/stap5-focus.ts` regel 1-100 — `ConsolidationOrigin`, `getConsolidationOrigins`, `computeFocusView` (pattern voor groep-lookup).
- `src/lib/persistence.ts` — dual persistence implementation (geen wijzigingen nodig).
- `src/lib/__tests__/consolidation.test.ts` regel 1-225 — bestaande test patterns voor uitbreiding.
- `vitest.config.ts` — test runner config.
- `package.json` — dependencies + scripts (geen `test` script gedefinieerd — `npx vitest` direct).

### Secondary (MEDIUM confidence)

- Prior Phase contexts (via `.planning/phases/0{8,11,13,14}/*-CONTEXT.md`) — referenced decisions: Phase 8 D-09/D-10 consolidation + undo, Phase 11 D-11 handmatige Analyseer, Phase 13 D-04/D-05 kleurbadge conventies, Phase 14 Pitfall 2 defense in depth.
- `DOMAIN_COLORS` pattern convention — verified in 2+ locations (`StapSectorVertaling.tsx` + `StapConsolidatie.tsx`).

### Tertiary (LOW confidence)

- Claude API parallel rate limits — niet geverifieerd tegen Anthropic docs voor dit account; treated as Open Question 1.
- Exact zod dep resolution — `npm ls zod` verificatie nodig in Wave 0.

## Metadata

**Confidence breakdown:**
- Standard stack: **HIGH** — alle libraries zijn verified in `package.json` en actief in codebase; geen nieuwe deps behalve mogelijk explicit `zod`.
- Architecture: **HIGH** — alle patterns zijn verified via direct codelezen; drieluik-layout is compositioneel uit bestaande primitives.
- Pitfalls: **HIGH** — afgeleid uit explicit CONTEXT.md decisions en geobserveerde codebase patterns (Pitfall 1 is directe legacy-data situatie, Pitfall 5 volgt uit `maxDuration=300` config).
- Tests: **HIGH** — test framework actief, 20 bestaande tests geven patroon, uitbreiding-scope expliciet in D-24.
- Drieluik UI-layout: **MEDIUM** — verified primitives (CSS Grid, inline SVG, `SectorBadge`, `DOMAIN_COLORS`) maar precieze UX-finetuning (spacing, alignment, hefboom-pijl visuals) is discretie binnen Claude's Discretion (D-exacte Tailwind klassen).

**Research date:** 2026-04-17
**Valid until:** 2026-05-17 (30 days — stable codebase, locked decisions, geen fast-moving external deps)

**Key insight for the planner:** Phase 17 is fundamenteel een compositie-opdracht, geen greenfield. ~95% van de infrastructuur (AI-pipeline, persistence, schemas, state management, UI primitives) bestaat al. De echte vernieuwing zit in: (1) nieuw `VermogenGelijkenisGroep` concept in schema + prompts, (2) drieluik-rendering als vervanging van Variant A/B, (3) drempel-guard in `mergeEfforts`. Plan in 4 waves (schema+tests, guards+tests, AI+API, UI-rewrite) — elk endigt in groene build en commit. Wave 0 is uniek kritisch: pure helper extractie voor auto-apply maakt de hele Wave 1 unit-testbaar.
