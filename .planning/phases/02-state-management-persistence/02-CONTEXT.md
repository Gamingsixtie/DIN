# Phase 2: State Management & Persistence - Context

**Gathered:** 2026-03-31
**Status:** Ready for planning

<domain>
## Phase Boundary

Race conditions en dataverlies in de sessie-opslag oplossen. Twee snelle bewerkingen achter elkaar moeten beide behouden blijven. State updates gebruiken functionele updaters die altijd de laatste state lezen. Persistence-laag wordt betrouwbaar gemaakt (lege arrays, foutfeedback, save-indicator).

</domain>

<decisions>
## Implementation Decisions

### State Management Aanpak
- **D-01:** React Context behouden — geen migratie naar externe state library (Zustand/Jotai). Minimale wijziging, lost het kernprobleem op.
- **D-02:** `updateSession` wordt omgebouwd naar functionele callback API: `updateSession(prev => ({ benefits: [...prev.benefits, newBenefit] }))`. Alle 30+ callsites worden gemigreerd.
- **D-03:** `setCurrentStep` krijgt dezelfde functionele updater-fix — consistent patroon door de hele context.
- **D-04:** De oude `updateSession(Partial<DINSession>)` API verdwijnt volledig — alleen de callback-variant blijft.

### Persistence — Lege Data
- **D-05:** De lege-array guard in `saveLocal` wordt volledig verwijderd. Lege arrays zijn valide data (bijv. alle baten verwijderd van een doel).
- **D-06:** Een lege session_list is gewoon "geen sessies" — homepage toont dan het aanmaakscherm.

### Foutfeedback bij Opslaan
- **D-07:** Generiek toast-systeem opzetten: `ToastProvider` + `useToast()` hook, herbruikbaar voor alle meldingen in de app (ook AI-fouten in latere fases).
- **D-08:** `saveLocal` retourneert `boolean` (true/false) in plaats van void. Persistence-laag blijft puur, UI-logica zit in de context.
- **D-09:** `updateSession` controleert de return-waarde van saveLocal en triggert een toast bij falen: "Opslaan mislukt — ruim browsergegevens op of exporteer je sessie."

### Data-integriteit bij Crash
- **D-10:** Laatste save wint — geen extra transactie/rollback mechanisme. Met functionele updaters is elke save een volledig sessie-object. Acceptabel risico voor single-user app.
- **D-11:** Subtiele "Opgeslagen [tijdstip]" indicator in de sessie-header, vergelijkbaar met Google Docs. Geeft vertrouwen zonder ruimte in te nemen.

### Claude's Discretion
- Exacte implementatie van het toast-systeem (animaties, positionering, auto-dismiss timing)
- Hoe de "Opgeslagen" indicator precies wordt gepositioneerd in de bestaande header
- Volgorde van migratie van de 30+ callsites (welke components eerst)
- Of saveLocal intern nog logging doet naast de boolean return

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### State Management (te refactoren)
- `src/lib/session-context.tsx` — Huidige SessionProvider met updateSession (closure-probleem), setCurrentStep, loadSession, createSession
- `src/lib/persistence.ts` — saveLocal (lege-array guard), loadLocal, dualSave, dualLoad, deduplicateById

### Callers van updateSession (alle moeten gemigreerd)
- `src/components/steps/DINMappingStep.tsx` — 15+ updateSession calls, meeste met spread van session arrays
- `src/components/steps/SectorWerkStep.tsx` — 3 updateSession calls (sectorAnalyses, sectorPlans)
- `src/components/steps/ImportStep.tsx` — 3 updateSession calls (goals, vision, scope)
- `src/components/steps/PrioriteringStep.tsx` — 2 updateSession calls (benefits status updates)

### Types (uit Phase 1)
- `src/lib/types.ts` — DINSession interface, AppStep type, alle entity types

### Methodiek
- `docs/programmaboek.doc` — DIN-methodiek referentie (niet direct relevant voor deze fase, maar context voor domeinbegrippen)

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
- `src/lib/persistence.ts` — loadLocal/saveLocal/removeLocal/deduplicateById al aanwezig, moeten aangepast maar niet herschreven
- `src/lib/session-context.tsx` — SessionProvider structuur blijft, intern mechanisme verandert
- `src/components/ui/` — Bestaande UI-directory voor toast-component

### Established Patterns
- **API response pattern**: `{ success: boolean, error?: string }` — toast-systeem kan hierop aansluiten
- **Error handling**: `console.error()` met `[persistence]` prefix — kan aangevuld met toast
- **State via Context**: `useSession()` hook is het enige access point — migratie is centraal

### Integration Points
- `SessionProvider` in `src/app/sessies/[id]/page.tsx` — wrapper waar ToastProvider naast moet
- Alle step-components importeren `useSession()` — de callback-API is een breaking change voor alle callers
- `src/app/page.tsx` — Homepage gebruikt loadLocal/saveLocal direct voor session_list

</code_context>

<specifics>
## Specific Ideas

- Toast-notificatie bij save-fout: "Opslaan mislukt — ruim browsergegevens op of exporteer je sessie." Niet-blokkerend, verdwijnt na ~5 seconden.
- "Opgeslagen 14:32" indicator in sessie-header, subtiel en niet-opdringerig, vergelijkbaar met Google Docs stijl
- Het toast-systeem wordt generiek opgezet zodat het herbruikbaar is voor AI-foutmeldingen (Phase 1 D-03 retryable feedback) en andere meldingen in latere fases

</specifics>

<deferred>
## Deferred Ideas

None — discussion stayed within phase scope

</deferred>

---

*Phase: 02-state-management-persistence*
*Context gathered: 2026-03-31*
