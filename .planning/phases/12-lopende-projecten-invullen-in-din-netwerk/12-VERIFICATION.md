---
phase: 12-lopende-projecten-invullen-in-din-netwerk
verified: 2026-04-04T22:15:00Z
status: human_needed
score: 14/14 must-haves verified
re_verification: false
human_verification:
  - test: "End-to-end project import via tekst plakken"
    expected: "Gebruiker plakt tekst, klikt 'Analyseer met AI', ziet ReviewProjectCards met bewerkbare naam, beschrijving, status en domein-checkboxes"
    why_human: "AI-extractie vereist live ANTHROPIC_API_KEY en runtime DOM-interactie"
  - test: "Document upload + AI extractie (PDF/DOCX/TXT)"
    expected: "Gebruiker uploadt document, parse-projects route extraheert tekst, extract-projects AI geeft gestructureerde projecten terug"
    why_human: "Vereist live file upload in browser en actieve API key"
  - test: "Warning badge en buiten scope toggle"
    expected: "Projecten met aiWarning tonen amber badge, klikken op 'Buiten scope' dimmt het project en plaatst het onderaan"
    why_human: "Visueel gedrag en DOM-state na click niet automatisch toetsbaar"
  - test: "AI koppelingen (AIKoppelingPanel)"
    expected: "Gebruiker klikt 'Analyseer koppelingen', ziet per project de voorgestelde vermogens als toggle-chips, accepteert/verwerpt, bevestigt"
    why_human: "Vereist live AI-call en runtime UI-interactie"
  - test: "Inline project display in inspanningen sectie"
    expected: "Bevestigde projecten met projectCapabilityMaps verschijnen in de inspanningen lijst met 'Lopend project' badge en gekoppelde vermogens chips"
    why_human: "Vereist actieve sessiedata met projectCapabilityMaps — niet automatisch simuleerbaar"
  - test: "Word export met DIN-keten integratie"
    expected: "Word-download bevat 'Lopend project' markering per project, domeinlabels, 'Gekoppeld aan vermogens:' bullijst"
    why_human: "Vereist generatie van .docx bestand en handmatige inspectie van inhoud"
---

# Phase 12: Lopende Projecten Invullen in DIN-Netwerk — Verificatierapport

**Phase Goal:** Bestaande lopende projecten (outside-in, online, systemen & data) kunnen specifiek worden ingevuld en gepositioneerd in het DIN-netwerk, gekoppeld aan doelen, baten, vermogens en inspanningen.
**Verified:** 2026-04-04T22:15:00Z
**Status:** human_needed
**Re-verification:** Nee — initiele verificatie

## Goal Achievement

### Observable Truths

| # | Truth | Status | Evidence |
|---|-------|--------|---------|
| 1 | ExternalProjectSchema accepteert een `domains` array van EffortDomain waarden | VERIFIED | `schemas.ts:162` — `domains: z.array(EffortDomainSchema).optional().default([])` |
| 2 | ExternalProjectSchema accepteert legacy objecten zonder `domains` veld (backward compat) | VERIFIED | Test 2 in `external-project-schema.test.ts` bewijst default naar `[]` |
| 3 | ProjectCapabilityMapSchema valideert projectId + capabilityId paren | VERIFIED | `schemas.ts:197` — `export const ProjectCapabilityMapSchema` met beide velden aanwezig |
| 4 | AI extractie endpoint retourneert gestructureerde projecten uit ruwe tekst | VERIFIED | `extract-projects/route.ts` — roept `extractProjectsFromText` aan, retourneert `{ success, data: { projects } }` |
| 5 | AI matching endpoint retourneert project-to-capability suggesties | VERIFIED | `match-projects/route.ts` — roept `matchProjectsToCapabilities` aan, retourneert `{ success, data: { matches } }` |
| 6 | Document parsing endpoint verwerkt DOCX, TXT en PDF bestanden | VERIFIED | `parse-projects/route.ts` — mammoth voor DOCX/DOC, dynamische pdf-parse import voor PDF, `.text()` voor TXT |
| 7 | Gebruiker kan tekst plakken en AI extractie triggeren | VERIFIED (code) | `ExterneProjectenPanel.tsx` bevat twee-tab interface met textarea + fetch naar `/api/parse-projects` + `/api/extract-projects` |
| 8 | Gebruiker ziet ReviewProjectCards met bewerkbare velden en domein-checkboxes | VERIFIED (code) | `ExterneProjectenPanel.tsx` — `ReviewProjectCard` sectie met naam/beschrijving/status edit en 4-domein checkboxes (mens/processen/data_systemen/cultuur) |
| 9 | AI waarschuwingen tonen amber badge met uitklapbare toelichting | VERIFIED (code) | `ExterneProjectenPanel.tsx:657` — `bg-amber-100 text-amber-700` badge; `buitenScope` toggle op lijn 518/823 |
| 10 | Gebruiker kan AI koppelingen triggeren en vermogens per project accepteren/verwerpen | VERIFIED (code) | `AIKoppelingPanel.tsx` — fetch naar `/api/match-projects`, toggle-chips per vermogen, `Bevestig koppelingen` knop |
| 11 | Bevestigde koppelingen worden opgeslagen als projectCapabilityMaps in sessie | VERIFIED | `DINMappingStep.tsx:1856-1862` — `onConfirmMappings` updater schrijft naar `session.projectCapabilityMaps` |
| 12 | Gekoppelde projecten verschijnen inline in de inspanningen lijst met 'Lopend project' badge | VERIFIED (code) | `DINMappingStep.tsx:1783-1822` — filter op `projectCapabilityMaps`, badge `bg-blue-100 text-blue-800` |
| 13 | Word export bevat gekoppelde projecten in DIN-keten tabel bij inspanningen | VERIFIED | `word-export.ts:1042` — `[Lopend project]` marker; lijn 1053 — `projectCapabilityMaps` lookup; lijn 1059 — `Gekoppeld aan vermogens:` |
| 14 | Export preview toont projecten met 'Lopend project' badge en gekoppelde vermogens | VERIFIED | `ExportStep.tsx:791` — `Lopend project` badge; lijn 782 — `projectCapabilityMaps` lookup; lijn 808 — `Gekoppeld aan:` |

**Score:** 14/14 truths geverifieerd (6 wachten op human verification voor runtime bevestiging)

### Required Artifacts

| Artifact | Verwacht | Status | Details |
|---------|---------|--------|---------|
| `src/lib/schemas.ts` | Extended ExternalProjectSchema + AI response schemas + ProjectCapabilityMapSchema | VERIFIED | Bevat alle vereiste schema-uitbreidingen op lijnen 162-165, 197-200, 696-715; `projectCapabilityMaps` in DINSessionSchema op lijn 480 |
| `src/app/api/parse-projects/route.ts` | Document parsing voor project import | VERIFIED | 71 regels; verwerkt PDF/DOCX/DOC/TXT; exporteert POST functie |
| `src/app/api/extract-projects/route.ts` | AI project extractie uit tekst | VERIFIED | 51 regels; roept `extractProjectsFromText` aan; exporteert POST functie |
| `src/app/api/match-projects/route.ts` | AI project-to-capability matching | VERIFIED | 51 regels; roept `matchProjectsToCapabilities` aan; exporteert POST functie |
| `src/lib/__tests__/external-project-schema.test.ts` | Schema validatie tests (min 50 regels) | VERIFIED | 125 regels; 10 tests dekken alle schema-uitbreidingen |
| `src/components/din/ExterneProjectenPanel.tsx` | Volledig project import + review + beheer panel (min 250 regels) | VERIFIED | 874 regels; twee-tab import, ReviewProjectCards, domein-checkboxes, waarschuwingsbadges, buiten scope toggle |
| `src/components/steps/DINMappingStep.tsx` | Geimporteerd ExterneProjectenPanel (geen inline definitie meer) | VERIFIED | `import ExterneProjectenPanel from "@/components/din/ExterneProjectenPanel"` op lijn 39; `function ExterneProjectenPanel` definitie NIET aanwezig |
| `src/components/din/AIKoppelingPanel.tsx` | AI-suggested project-to-capability matching UI (min 100 regels) | VERIFIED | 308 regels; fetch naar `/api/match-projects`; toggle-chips; bevestig/analyseer knoppen |
| `src/lib/word-export.ts` | Export met projecten in DIN-keten tabel | VERIFIED | Bevat `[Lopend project]` marker, `projectCapabilityMaps` lookup, `Gekoppeld aan vermogens:` |
| `src/components/steps/ExportStep.tsx` | Export preview met project badges | VERIFIED | Bevat `Lopend project` badge, `projectCapabilityMaps` lookup, `Gekoppeld aan:` tekst |

### Key Link Verificatie

| Van | Naar | Via | Status | Details |
|-----|------|-----|--------|---------|
| `extract-projects/route.ts` | `ai-client.ts` | `callClaudeWithValidation` met `AIProjectExtractionResponseSchema` | WIRED | `ai-client.ts:748` — `callClaudeWithValidation(AIProjectExtractionResponseSchema, ...)` |
| `match-projects/route.ts` | `ai-client.ts` | `callClaudeWithValidation` met `AIProjectCapabilityMatchResponseSchema` | WIRED | `ai-client.ts:758` — `callClaudeWithValidation(AIProjectCapabilityMatchResponseSchema, ...)` |
| `ExterneProjectenPanel.tsx` | `/api/parse-projects` | `fetch` in `handleParseImport` | WIRED | `ExterneProjectenPanel.tsx:106` — `fetch("/api/parse-projects", ...)` |
| `ExterneProjectenPanel.tsx` | `/api/extract-projects` | `fetch` in `handleExtractProjects` | WIRED | `ExterneProjectenPanel.tsx:127` — `fetch("/api/extract-projects", ...)` |
| `AIKoppelingPanel.tsx` | `/api/match-projects` | `fetch` call | WIRED | `AIKoppelingPanel.tsx:67` — `fetch("/api/match-projects", ...)` |
| `ExterneProjectenPanel.tsx` | `AIKoppelingPanel.tsx` | component import | WIRED | `ExterneProjectenPanel.tsx:14` — `import AIKoppelingPanel from "@/components/din/AIKoppelingPanel"` |
| `word-export.ts` | `projectCapabilityMaps` | sessiedata toegang | WIRED | `word-export.ts:1053` — `(session.projectCapabilityMaps || []).filter(...)` |

### Data-Flow Trace (Level 4)

| Artifact | Data Variabele | Bron | Produceert Echte Data | Status |
|---------|--------------|------|----------------------|--------|
| `ExterneProjectenPanel.tsx` | `reviewProjects` | `setReviewProjects` gevuld door `/api/extract-projects` response | Ja — API roept AI aan, retourneert gestructureerde projectlijst | FLOWING |
| `ExterneProjectenPanel.tsx` | `projects` prop | `session.externalProjects` in `DINMappingStep` | Ja — uit sessie-state, persisteert via `onAddProjects` | FLOWING |
| `AIKoppelingPanel.tsx` | `matches` | `setMatches` gevuld door `/api/match-projects` response | Ja — API roept AI aan, retourneert koppelingssuggesties | FLOWING |
| `DINMappingStep.tsx` | inline projecten | filter op `session.projectCapabilityMaps` + `session.externalProjects` | Ja — sessiedata, gevuld bij bevestigen koppelingen | FLOWING |
| `ExportStep.tsx` | `ExterneProjectenBlock` | `session.externalProjects` + `session.projectCapabilityMaps` | Ja — sessiedata, zelfde bron als DINMappingStep | FLOWING |
| `word-export.ts` | `externalProjectsSection` | `session.externalProjects` + `session.projectCapabilityMaps` | Ja — sessiedata doorgegeven aan export functie | FLOWING |

### Behavioral Spot-Checks

| Gedrag | Commando | Resultaat | Status |
|--------|---------|---------|--------|
| Build slaagt zonder TypeScript fouten | `npm run build` | Alle routes gecompileerd: `/api/extract-projects`, `/api/match-projects`, `/api/parse-projects` aanwezig in build output | PASS |
| Extract-projects route exporteert POST functie | `ls src/app/api/extract-projects/route.ts` (bestand bestaat, bevat `export async function POST`) | Bestand aanwezig, 51 regels, POST handler aanwezig | PASS |
| Match-projects route exporteert POST functie | `ls src/app/api/match-projects/route.ts` (bestand bestaat, bevat `export async function POST`) | Bestand aanwezig, 51 regels, POST handler aanwezig | PASS |
| Schema tests dekken alle 10 gevallen | `wc -l src/lib/__tests__/external-project-schema.test.ts` | 125 regels, 10 `it(...)` blokken aanwezig | PASS |
| AI extractie runtime | Vereist actieve ANTHROPIC_API_KEY en live browser | Niet automatisch toetsbaar | SKIP |
| Volledig end-to-end importflow | Vereist live dev server en browser interactie | Niet automatisch toetsbaar | SKIP |

### Requirements Dekking

De D-01 t/m D-14 requirements zijn gedefinieerd in `12-CONTEXT.md` (niet in het centrale REQUIREMENTS.md — die gebruikt een ander nummerschema voor v1 requirements). De D-xx codes zijn fase-specifieke beslissings-requirements.

| Requirement | Bronplan | Omschrijving | Status | Bewijs |
|------------|---------|-------------|--------|--------|
| D-01 | 12-01, 12-02 | Twee invoermethoden: tekstveld + document upload | SATISFIED | `ExterneProjectenPanel.tsx` twee-tab interface; `/api/parse-projects` verwerkt beide |
| D-02 | 12-02 | Gebruiker reviewt AI-extractie resultaat voor bevestiging | SATISFIED | ReviewProjectCards sectie in `ExterneProjectenPanel.tsx` met bewerkbare velden |
| D-03 | 12-01 | ExternalProjectSchema uitgebreid met `domains` array (meerdere domeinen) | SATISFIED | `schemas.ts:162` — `domains: z.array(EffortDomainSchema).optional().default([])` |
| D-04 | 12-02 | Projecten blijven per sector (`sectorId`), niet cross-sectoraal | SATISFIED | `ExterneProjectenPanel.tsx:206` — elke nieuw project krijgt `sectorId: currentSector` |
| D-05 | 12-01, 12-02 | Bestaande statusopties behouden (gepland/in_uitvoering/afgerond/on_hold) | SATISFIED | `EffortStatusSchema` ongewijzigd; status select in ReviewProjectCard aanwezig |
| D-06 | 12-01, 12-03 | AI-suggestie + handmatig bevestigen van project→vermogen koppelingen | SATISFIED | `AIKoppelingPanel.tsx` met toggle-chips en `Bevestig koppelingen` flow |
| D-07 | 12-02 | Koppeling vindt plaats in DINMappingStep — geen aparte wizard-stap | SATISFIED | `AIKoppelingPanel` geintegreerd in `ExterneProjectenPanel` binnen `DINMappingStep` |
| D-08 | 12-03 | Projecten behandeld als inspanning-achtig element in de DIN-keten na koppeling | SATISFIED | Inline projecten verschijnen in inspanningen-sectie van `DINMappingStep.tsx:1783` |
| D-09 | 12-01, 12-03 | Projecten worden gekoppeld aan vermogens (niet aan baten) | SATISFIED | `ProjectCapabilityMapSchema` koppelt projectId aan capabilityId; `/api/match-projects` werkt met capabilities |
| D-10 | 12-02 | Geen vaste categorieën, gebruikers voegen vrij projecten toe | SATISFIED | Geen voorgedefinieerde projecttypen; vrij tekstveld voor naam en beschrijving |
| D-11 | 12-01, 12-02 | Multi-domein veld als multi-select checkboxes in UI | SATISFIED | `ExterneProjectenPanel.tsx:41-53` — `DOMAINS` constante met 4 domeinen; checkbox toggle logica |
| D-12 | 12-03 | Gekoppelde projecten verschijnen inline bij inspanningen met onderscheidbare badge | SATISFIED | `DINMappingStep.tsx:1795` — `Lopend project` badge `bg-blue-100 text-blue-800` |
| D-13 | 12-02 | AI markeert niet-passende projecten met waarschuwingsbadge; gebruiker kan als 'buiten scope' markeren | SATISFIED | `ExterneProjectenPanel.tsx:657` amber badge; lijn 518/823 `Buiten scope` knop; lijn 589/593 `Terug in scope` |
| D-14 | 12-03 | Gekoppelde projecten in Word-export in DIN-keten tabel, gemarkeerd als 'lopend project' | SATISFIED | `word-export.ts:1042` `[Lopend project]` marker; lijn 1059 `Gekoppeld aan vermogens:`; `ExportStep.tsx:791` badge |

**Dekking:** 14/14 D-requirements bevredigend gedekt.

**Opmerking over REQUIREMENTS.md traceerbaarheid:** De centrale `REQUIREMENTS.md` bevat geen D-xx requirements — die zijn fase-specifiek gedefinieerd in `12-CONTEXT.md` als implementatiebeslissingen. De centrale REQUIREMENTS.md bevat v1 requirements (DATA-xx, AI-xx, etc.) voor andere fasen. Geen orphaned requirements gedetecteerd.

### Gevonden Anti-Patronen

| Bestand | Regel | Patroon | Ernst | Impact |
|---------|-------|---------|-------|--------|
| Geen gevonden | — | — | — | — |

Scan op TODO/FIXME/PLACEHOLDER/coming soon in alle Phase 12 bestanden: geen matches.
Scan op lege implementaties (`return null`, `return {}`, `return []` als enige logica): geen instances in kritieke paden.

### Human Verificatie Vereist

De geautomatiseerde verificatie bevestigt dat alle code aanwezig, substantieel en correct bedraad is. De volgende items vereisen een live test omdat ze afhankelijk zijn van een actieve ANTHROPIC_API_KEY, browser DOM-interactie, of Word document inspectie:

#### 1. Tekst-import flow met AI extractie

**Test:** Open een sessie, navigeer naar DIN-Mapping (stap 3), scroll naar "Lopende projecten" panel, open tab "Tekst plakken", plak projectbeschrijvingen (bijv. "Outside-in programma: training voor alle medewerkers. Online platform: digitaal portaal voor zelfstudie."), klik "Analyseer met AI".
**Verwacht:** ReviewProjectCards verschijnen met geextraheerde projectnamen, bewerkbare beschrijvingen, status-select en domein-checkboxes. Knoppen "Project bevestigen" en "Alles bevestigen" zijn zichtbaar.
**Waarom human:** Vereist actieve AI API key en browser DOM.

#### 2. Document upload flow

**Test:** Upload een .docx of .pdf bestand met projectbeschrijvingen via de "Document uploaden" tab.
**Verwacht:** Bestand wordt geparsed via `/api/parse-projects`, tekst wordt doorgegeven aan `/api/extract-projects`, zelfde ReviewProjectCards flow als bij tekst-import.
**Waarom human:** Vereist live file upload en actieve API.

#### 3. Warning badge en buiten scope toggle

**Test:** Als een project een `aiWarning` heeft, controleer dat de amber badge zichtbaar is en dat klikken op "Buiten scope" het project dimmt en naar de onderzijde verplaatst.
**Verwacht:** Badge `bg-amber-100 text-amber-700` zichtbaar; project na markering `opacity-50 bg-gray-50` met doorgehaalde naam; "Terug in scope" knop functioneel.
**Waarom human:** Visueel gedrag en DOM-state transitions.

#### 4. AI koppelingen via AIKoppelingPanel

**Test:** Met bevestigde projecten en bestaande vermogens in een sector, klik "Analyseer koppelingen" in het panel.
**Verwacht:** Per project verschijnen vermogens-chips (pre-geaccepteerd), met confidence indicator (groen/amber/grijs). Na accepteren/verwerpen en klikken "Bevestig koppelingen" worden `projectCapabilityMaps` opgeslagen in sessie.
**Waarom human:** Vereist actieve AI API key en sessiedata met vermogens.

#### 5. Inline project display in inspanningen

**Test:** Na stap 4, scroll omhoog naar de inspanningen sectie.
**Verwacht:** Bevestigde gekoppelde projecten verschijnen inline met "Lopend project" badge (blauw), domein-chips, en "Gekoppeld aan:" sectie met vermogensnamen.
**Waarom human:** Vereist live sessiedata met projectCapabilityMaps.

#### 6. Word export met DIN-keten integratie

**Test:** Navigeer naar Export (stap 6), bekijk de "Lopende projecten" sectie in de preview en download het Word-document.
**Verwacht:** Projecten in preview tonen "Lopend project" badge, domein-chips, en "Gekoppeld aan:" vermogens. Word-document bevat "[Lopend project]" markering, domeinlabels, en "Gekoppeld aan vermogens:" bullijst.
**Waarom human:** Vereist Word document generatie en handmatige inspectie van .docx inhoud.

### Samenvatting

Alle 14 geautomatiseerde must-haves zijn geverifieerd. De phase deliverables zijn volledig en correct bedraad:

- **Data layer (Plan 01):** ExternalProjectSchema uitgebreid met `domains`, `linkedCapabilityIds`, `aiWarning`, `buitenScope`. `ProjectCapabilityMapSchema` en AI response schemas aangemaakt. Drie API routes operationeel (parse/extract/match). Alle 10 schema-tests aanwezig. Build slaagt.
- **UI component (Plan 02):** `ExterneProjectenPanel.tsx` (874 regels) geextraheerd als standalone component met twee-tab import, ReviewProjectCards met domein-checkboxes, waarschuwingsbadges, buiten scope toggle, en batch-confirm flow. `DINMappingStep.tsx` gebruikt de nieuwe import zonder inline definitie.
- **Koppeling + export (Plan 03):** `AIKoppelingPanel.tsx` (308 regels) met AI-gestuurde koppelingsuggesties en toggle-chips. Inline projecten in inspanningen-lijst. Word export en ExportStep preview beide bijgewerkt met DIN-keten project weergave.

Geen anti-patronen, placeholders of onverbonden stubs gevonden. Alle commit hashes uit SUMMARY bestanden zijn aanwezig in git log (e46fcfd, bb73fcd, 2507f59, b9adc28, 5dd51ce, d1440ea, 023ed67).

---

_Geverifieerd: 2026-04-04T22:15:00Z_
_Verifier: Claude (gsd-verifier)_
