# DIN — Doelen-Inspanningennetwerk

Vervolg-app op "Klant in Beeld" (KiB). Deze app vertaalt programmadoelen naar concrete **baten, vermogens en inspanningen** via het Doelen-Inspanningennetwerk (DIN).

## Commands

```bash
npm run dev          # Development server (localhost:3000)
npm run build        # Production build
npm run lint         # ESLint
npx vercel --prod    # Deploy naar productie
```

## Methodiek — DIN Framework

**Bron:** "Werken aan Programma's" (Prevaas & Van Loon), gebaseerd op Wijnen & Van der Tak (2002).
**Referentiedocument:** `docs/programmaboek.doc` — het volledige programmaboek met de methodiek.

### Wat is DIN?

DIN is een **instrument** — het woord staat voor **Doelen-Inspanningennetwerk**, niet voor drie losse letters. Het netwerk verbindt vier niveaus in een logische keten:

```
Doelen → Baten → Vermogens → Inspanningen
```

### De vier niveaus

| Niveau | Betekenis | Voorbeeld |
|---|---|---|
| **Doelen** | Programmadoelstellingen (uit KiB) | "Outside-in competentie organisatiebreed verankeren" |
| **Baten** | Gewenste effecten in de buitenwereld (klant, markt, organisatie) | "NPS stijgt van 32 naar 45" |
| **Vermogens** | Wat de organisatie moet *kunnen* om baten te realiseren | "Medewerkers beheersen klantgesprek-methodiek" |
| **Inspanningen** | Concrete projecten en activiteiten die vermogens opbouwen | "Training outside-in werken (Q2 2026)" |

### Batenprofielen

Elke baat heeft een **batenprofiel** met:
- Omschrijving
- Meetbare indicator
- Eigenaar
- Huidige waarde
- Gewenste waarde
- Meetmoment

### 4 Inspanningsdomeinen

Inspanningen worden ingedeeld in vier domeinen:

| Domein | Kleur | Voorbeelden |
|---|---|---|
| **Mens** | `#2563eb` (blauw) | Opleiding, training, bemensing, competentieontwikkeling |
| **Processen** | `#059669` (groen) | Werkwijzen, procedures, governance, samenwerking |
| **Data & Systemen** | `#7c3aed` (paars) | IT-systemen, data-infrastructuur, tooling, integraties |
| **Cultuur** | `#d97706` (amber) | Gedrag, mindset, waarden, leiderschapsontwikkeling |

### Redeneerrichtingen

- **Hoe-vraag** (rechts → links): "Hoe bereiken we dit doel?" → baten → vermogens → inspanningen
- **Waartoe-vraag** (links → rechts): "Waartoe dient deze inspanning?" → vermogen → baat → doel

### Veranderstrategie

Tussen doelen/baten en vermogens/inspanningen ligt de **veranderstrategie**: de keuze hoe de organisatie de gewenste verandering wil realiseren.

## Input voor de app

### 1. Uit KiB (importeren)
- Vastgestelde visie (uitgebreid + beknopt)
- Top-doelen (na dot voting)
- Scope (in/buiten)

### 2. Sectorplannen (uploaden/invoeren)
- PO-sectorplan
- VO-sectorplan
- Zakelijk/Professionals-sectorplan
- Data & Tech roadmap

### 3. Product-marktcombinaties (invoeren/importeren)
- Welke producten/diensten × welke marktsegmenten
- Huidige performance per combinatie
- Strategische prioriteit per combinatie

## App Flow (6 stappen)

1. **Import & Opzet** — KiB-import, sectorplannen upload, PMC-definitie
2. **DIN-Mapping per doel** — Per doel: baten (met profielen), vermogens, inspanningen
3. **Cross-analyse** — Synergie-matrix, hefboomwerking, gap-analyse
4. **Prioritering & Planning** — Dot voting, tijdlijn, afhankelijkheden
5. **Sectorplan-integratie** — Per sector: welke baten, vermogens, inspanningen
6. **Export** — Programmaplan, sectorale vertalingen, DIN-overzicht, roadmap

## Architectuur

### Stack
- **Next.js 16** + TypeScript + Tailwind CSS 4
- **Supabase** voor database en auth
- **Vercel** voor hosting/deployment
- **App Router** (src/app/ directory)

### Branding
- Cito blauw: `#003366` (cito-blue)
- Alle UI en AI output in het **Nederlands** (nl-NL)
- Geen Engelse termen in de interface

### Dual Persistence Patroon

Geleerde lessen uit KiB — altijd volgen:
1. **localStorage EERST schrijven** (synchronous), dan Supabase (async)
2. **Nooit lege state opslaan** — check altijd of data aanwezig is voor je schrijft
3. **Deduplicatie van IDs** bij AI-hergeneratie — voorkom dubbele records
4. **Sync-first**: localStorage is de bron van waarheid tijdens de sessie

### Database Schema

```sql
-- Import uit KiB
programme_goals (id, name, description, rank, source_session_id)
programme_vision (id, uitgebreid, beknopt, source_session_id)
programme_scope (id, in_scope[], out_scope[])

-- Sectorplannen
sector_plans (id, sector_name, raw_text, parsed_content, uploaded_at)

-- Product-marktcombinaties
pmc_entries (id, product, market_segment, priority, current_performance)

-- DIN-keten
din_benefits (id, goal_id FK, description, indicator, indicator_owner,
              current_value, target_value, measurement_moment)
din_capabilities (id, description, related_sectors[])
din_efforts (id, description, domain, quarter, responsible_sector, status, dependencies[])
-- domain: 'mens' | 'processen' | 'data_systemen' | 'cultuur'

-- Koppelingen
goal_benefit_map (goal_id, benefit_id)
benefit_capability_map (benefit_id, capability_id)
capability_effort_map (capability_id, effort_id)
effort_pmc_map (effort_id, pmc_id)
effort_sector_map (effort_id, sector_plan_id)
```

### AI Prompts

1. **DIN-mapping**: doel + sectorplannen → baten, vermogens, inspanningen
2. **Cross-analyse**: alle DIN-netwerken → synergieën, gaps, hefbomen
3. **Sectorplan-integratie**: sectorplan + inspanningen → sectorale vertaling
4. **Programmaplan**: alle DIN-data → samenhangend document
5. **Batenprofiel**: baat → meetbare indicator, eigenaar, waarden

## Projectstructuur

```
DIN/
├── CLAUDE.md                          # Dit bestand
├── docs/
│   └── programmaboek.doc             # Methodiek referentie (Prevaas & Van Loon)
├── Documents/
│   └── plan-vervolg-app.md           # Volledig projectplan
├── src/
│   ├── app/
│   │   ├── layout.tsx                # Root layout (nl-NL, Cito branding)
│   │   ├── page.tsx                  # Home: sessie kiezen/aanmaken
│   │   ├── globals.css               # Tailwind + Cito/DIN tokens
│   │   ├── api/
│   │   │   ├── import-kib/           # Import KiB uitkomsten
│   │   │   ├── parse-sector/         # Sectorplan parsing
│   │   │   ├── din-mapping/          # AI DIN-keten generatie
│   │   │   ├── cross-analyse/        # Synergie/gap analyse
│   │   │   └── export/               # Programmaplan export
│   │   └── sessies/
│   │       └── [id]/
│   │           ├── page.tsx          # Sessie flow
│   │           ├── feedback/         # Async feedback
│   │           └── stemmen/          # Dot voting
│   ├── components/
│   │   ├── steps/                    # Stap-componenten (Import, DIN, Cross, etc.)
│   │   ├── din/                      # DIN-specifieke componenten
│   │   ├── feedback/                 # Hergebruik uit KiB
│   │   └── ui/                       # Hergebruik uit KiB
│   └── lib/
│       ├── types.ts                  # TypeScript types
│       ├── persistence.ts            # Dual persistence (sync-first)
│       ├── session-context.tsx        # Session state management
│       ├── din-service.ts            # DIN CRUD operaties
│       ├── kib-import.ts             # KiB data import
│       └── prompts.ts               # DIN-specifieke AI prompts
├── supabase-schema.sql               # Database schema
└── .claude/
    └── skills/                       # AI agent skills (van pim-skills repo)
        ├── pim-dev-skill/
        ├── frontend-design/
        ├── interface-design/
        ├── klant-in-beeld/
        ├── ui-design-system/
        └── web-asset-generator/
```

## Skills (van pim-skills repo)

De volgende skills zijn beschikbaar in `.claude/skills/`:

| Skill | Gebruik voor |
|---|---|
| `pim-dev-skill` | Next.js/React + Python dev, Cito context, debuggen |
| `frontend-design` | Opvallende, productie-grade frontend interfaces |
| `interface-design` | Dashboards, admin panels, SaaS apps met craft |
| `klant-in-beeld` | KiB operaties: sessies, deploys, ID-fixes |
| `ui-design-system` | Design tokens, kleurpaletten, typografie, spacing |
| `web-asset-generator` | Favicons, app icons, social media images |

## Domain Rules

- KiB-import is altijd het startpunt: visie, doelen (top 5), scope
- Sectorplannen: PO, VO, Zakelijk/Professionals, Data & Tech
- Product-marktcombinaties met prioriteit en performance
- Async feedback en dot voting hergebruik uit KiB-patronen
- DIN = Doelen-Inspanningennetwerk — gebruik altijd de volledige term bij eerste vermelding
