# Phase 16: Supabase dual persistence — stabiliteit, sync en verificatie - Context

**Gathered:** 2026-04-07
**Status:** Ready for planning

<domain>
## Phase Boundary

Stabiliseer de localStorage-first + Supabase async dual persistence zodat alle sessiedata betrouwbaar online wordt opgeslagen. Elke wijziging moet gegarandeerd naar Supabase geschreven worden (met retry bij fouten), de gebruiker moet sync-status kunnen zien, en de integriteit tussen localStorage en Supabase moet verifieerbaar zijn.

</domain>

<decisions>
## Implementation Decisions

### Sync-status & Feedback
- **D-01:** Subtiele sync-badge in een footer/statusbalk: groen = gesynct, oranje = bezig, rood = fout
- **D-02:** Badge verschijnt in een nieuwe footer/statusbalk onderaan het scherm (niet in de header)
- **D-03:** Bij langdurige Supabase-onbereikbaarheid: badge rood + automatische retry-queue. Zodra Supabase weer bereikbaar is, worden opgestapelde wijzigingen automatisch gesynct

### Conflict Resolution
- **D-04:** Nieuwste wint: vergelijk updatedAt timestamps — de nieuwste versie overschrijft de andere
- **D-05:** Single-device gebruik: één apparaat per sessie. Supabase is voor backup/herstel, geen real-time multi-device sync
- **D-06:** Session_list ook naar Supabase syncen. Bestaande `loadSessionListFromSupabase` wordt uitgebreid zodat bij verlies van localStorage alle sessies teruggehaald kunnen worden

### Schema-richting
- **D-07:** JSON blob behouden als opslagpatroon in `din_sessions` tabel. Geen migratie naar genormaliseerd schema — past bij single-user localStorage-first architectuur
- **D-08:** Version counter toevoegen aan sessie voor optimistic locking. Oplopend versienummer bij elke save; bij save checken of Supabase-versie niet hoger is dan verwacht

### Verificatie & Tests
- **D-09:** Unit tests voor persistence.ts (mock Supabase) + in-app health-check
- **D-10:** Health-check op homepage toont: Supabase bereikbaar (ja/nee), aantal sessies in Supabase, laatste sync-tijd. Subtiel in de footer

### Supabase Connectie & Betrouwbaar Opslaan
- **D-11:** saveSessionToSupabase wordt afgewacht (await) met automatische retry (max 3x) bij fouten. Badge toont sync-status. localStorage blijft altijd eerst geschreven
- **D-12:** Graceful degradation: als NEXT_PUBLIC_SUPABASE_URL of ANON_KEY ontbreken, werkt de app offline-only (localStorage). Badge toont 'Offline modus'. Supabase is optioneel
- **D-13:** Ongebruikte dualSave/dualLoad generics opruimen. Nieuwe retry-logica komt in de Supabase-specifieke functies

### Claude's Discretion
- Exacte retry-strategie (exponential backoff, interval, max queue size)
- Footer/statusbalk styling en animatie
- Unit test structuur en mock-patronen
- Version counter implementatiedetails (field naam, initiële waarde)

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Persistence Layer
- `src/lib/persistence.ts` — Huidige dual persistence implementatie (localStorage + Supabase)
- `src/lib/supabase.ts` — Supabase client configuratie
- `src/lib/session-context.tsx` — SessionProvider met alle save/load aanroepen

### Data Model
- `src/lib/types.ts` — DINSession type definitie (version field moet hier toegevoegd)
- `supabase-schema.sql` — Database schema referentie (JSON blob patroon behouden per D-07)

### UI Integration Points
- `src/app/page.tsx` — Homepage met sessie-overzicht (health-check locatie)
- `src/app/sessies/[id]/page.tsx` — Sessie pagina (footer/statusbalk locatie)

### Existing Tests
- `src/lib/__tests__/persistence.test.ts` — Bestaande persistence tests (uitbreiden)

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
- `saveSessionToSupabase` / `loadSessionFromSupabase`: bestaande Supabase CRUD — wordt uitgebreid met retry-logica
- `loadSessionListFromSupabase`: al beschikbaar voor session_list sync (D-06)
- Toast systeem (`useToast`): beschikbaar voor fout-meldingen naast de badge
- `addToastRef` patroon: bewezen aanpak voor side-effects in state updaters

### Established Patterns
- localStorage-first, Supabase async: vastgesteld in Phase 2, consistent doorgetrokken
- Functional updaters in `setSession`: voorkomt race conditions
- `queueMicrotask` voor side-effects buiten React state updater
- Fire-and-forget Supabase calls: **wordt vervangen** door await + retry (D-11)

### Integration Points
- `session-context.tsx` `updateSession`: alle saves gaan hierdoor — centraal punt voor retry-logica
- `session-context.tsx` `loadSession`: conflict resolution bij laden zit hier
- `page.tsx` useEffect: sessie-lijst laden — health-check komt hier
- Nieuwe footer component: moet in de layout of per-page wrapper

</code_context>

<specifics>
## Specific Ideas

- Gebruiker benadrukte expliciet: "alles online wordt opgeslagen ook als er aanpassingen komen" — betrouwbare sync is de kerneis
- Retry-queue moet persistent zijn (localStorage) zodat wijzigingen niet verloren gaan bij page refresh tijdens Supabase-storing

</specifics>

<deferred>
## Deferred Ideas

None — discussion stayed within phase scope

</deferred>

---

*Phase: 16-supabase-dual-persistence-stabiliteit-sync-en-verificatie*
*Context gathered: 2026-04-07*
