# Phase 12: Lopende Projecten Invullen in DIN-Netwerk - Research

**Researched:** 2026-04-04
**Domain:** DIN external project import, AI extraction, project-to-capability mapping
**Confidence:** HIGH

## Summary

Phase 12 extends the existing ExterneProjectenPanel in DINMappingStep to support structured import of existing ("lopende") projects via text paste or document upload, AI-powered extraction and parsing, multi-domain assignment, and AI-suggested linkage to DIN vermogens (capabilities). The phase builds heavily on established patterns: SectorWerkStep's upload/parse flow, callClaudeWithValidation for AI calls with Zod validation, and the existing mapping schema pattern (GoalBenefitMap, BenefitCapabilityMap, CapabilityEffortMap).

The primary technical challenges are: (1) adding PDF parsing capability (not yet in the project), (2) designing two new AI prompts (project extraction from text, project-to-capability matching), (3) extending the ExternalProject schema with a `domains` array while maintaining backward compatibility with existing data, and (4) creating a new ProjectCapabilityMap schema and integrating it into session state and the export pipeline.

**Primary recommendation:** Extend existing patterns (schema + AI client + mapping) rather than introducing new architectural concepts. Use pdf-parse for PDF support. Keep both new API routes thin — delegate to callClaudeWithValidation with new Zod schemas.

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions
- **D-01:** Twee invoermethoden: (1) groot tekstveld voor plakken, (2) document upload (PDF/DOCX). AI extraheert projecten.
- **D-02:** Na AI-extractie reviewt gebruiker en kan corrigeren/aanvullen (SectorWerkStep patroon).
- **D-03:** Projectvelden: naam, beschrijving, status, domein(en). ExternalProjectSchema uitbreiden met `domains` array.
- **D-04:** Projecten blijven per sector (sectorId) — niet cross-sectoraal.
- **D-05:** Bestaande statusopties behouden: gepland, in_uitvoering, afgerond, on_hold.
- **D-06:** AI-suggestie + handmatig bevestigen voor DIN-koppelingen.
- **D-07:** Koppeling in DINMappingStep — uitbreiding ExterneProjectenPanel, geen aparte wizard.
- **D-08:** Lopend project IS inspanning-achtig, kan meerdere domeinen raken. Na koppeling in DIN-keten.
- **D-09:** Projecten koppelen aan vermogens (niet baten). AI stelt project-vermogen koppelingen voor.
- **D-10:** Geen vaste categorieeen. Gebruikers voegen vrij projecten toe.
- **D-11:** Multi-domein veld als multi-select checkboxes.
- **D-12:** Gekoppelde projecten inline bij inspanningen, visueel onderscheidbaar (badge 'lopend project').
- **D-13:** AI waarschuwingsbadge (oranje) voor projecten die niet goed passen, met toelichting.
- **D-14:** In Word-export verschijnen projecten in DIN-keten tabel bij inspanningen.

### Claude's Discretion
- Exacte UI-ontwerp van tekst-import veld en document upload component
- Prompt-ontwerp voor AI-extractie van projecten uit klantreis-tekst
- Prompt-ontwerp voor AI-suggestie van project-vermogen koppelingen
- Multi-domein checkboxes UI
- Visuele stijl 'lopend project' badge
- Waarschuwingsbadge stijl en AI-toelichting tekst
- Schema-migratie strategie voor domains array
- Projecten in tabel-flow export opmaak

### Deferred Ideas (OUT OF SCOPE)
None — discussion stayed within phase scope
</user_constraints>

## Standard Stack

### Core
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| @anthropic-ai/sdk | 0.78.0 | AI calls for project extraction and capability matching | Already in project |
| zod | (existing) | Schema validation for AI responses and new data types | Already in project, all AI responses validated |
| mammoth | 1.11.0 | DOCX text extraction | Already in project for sectorplan parsing |
| pdf-parse | 2.4.5 | PDF text extraction | **NEW** — needed for D-01 PDF upload support |

### Supporting
| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| docx | 9.6.0 | Word export extension | Already in project — extend externalProjectsSection |

### Alternatives Considered
| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| pdf-parse | pdfjs-dist | pdfjs-dist is larger (1.5MB+), pdf-parse is simpler for text extraction |

**Installation:**
```bash
npm install pdf-parse
```

**Version verification:** pdf-parse 2.4.5 confirmed via npm registry 2026-04-04.

## Architecture Patterns

### Recommended Changes Structure
```
src/
├── lib/
│   ├── schemas.ts              # Extend ExternalProjectSchema + add ProjectCapabilityMapSchema + AI response schemas
│   ├── types.ts                # Re-export new types
│   ├── din-service.ts          # Add project CRUD helpers
│   ├── ai-client.ts            # Add generateProjectExtraction() + generateProjectCapabilityMapping()
│   ├── prompts.ts              # Add PROJECT_EXTRACTION_PROMPT + PROJECT_CAPABILITY_MAPPING_PROMPT
│   └── word-export.ts          # Extend externalProjectsSection for DIN-chain integration
├── app/
│   └── api/
│       ├── parse-projects/     # NEW: document parsing for project import (PDF/DOCX/TXT)
│       ├── extract-projects/   # NEW: AI extraction of projects from text
│       └── match-projects/     # NEW: AI project-to-capability matching
└── components/
    └── steps/
        └── DINMappingStep.tsx  # Replace ExterneProjectenPanel with expanded version
```

### Pattern 1: Schema Extension with Backward Compatibility
**What:** Add `domains` array to ExternalProjectSchema as optional with default migration
**When to use:** When extending existing schemas that have persisted data in localStorage
**Example:**
```typescript
// In schemas.ts — extend ExternalProjectSchema
export const ExternalProjectSchema = z.object({
  id: z.string(),
  sectorId: z.string(),
  name: z.string(),
  description: z.string(),
  status: EffortStatusSchema,
  relevance: z.string().optional(),
  // NEW fields
  domains: z.array(EffortDomainSchema).optional().default([]),
  linkedCapabilityIds: z.array(z.string()).optional().default([]),
  aiWarning: z.string().optional(),  // AI toelichting if project doesn't fit
  buitenScope: z.boolean().optional().default(false),
});
```
**Key:** Use `.optional().default([])` for backward compatibility with existing data (established pattern from Phase 5).

### Pattern 2: New Mapping Schema
**What:** ProjectCapabilityMap linking external projects to DIN capabilities
**When to use:** For the project-to-vermogen koppeling (D-09)
**Example:**
```typescript
export const ProjectCapabilityMapSchema = z.object({
  projectId: z.string(),
  capabilityId: z.string(),
});

// Add to DINSessionSchema:
projectCapabilityMaps: z.array(ProjectCapabilityMapSchema).optional().default([]),
```

### Pattern 3: AI Extraction with Zod Validation (existing pattern)
**What:** callClaudeWithValidation with a Zod schema for structured project extraction
**When to use:** For both AI operations (extraction + mapping)
**Example:**
```typescript
// AI response schema for project extraction
export const AIExtractedProjectSchema = z.object({
  name: z.string(),
  description: z.string(),
  status: EffortStatusSchema.optional().default("in_uitvoering"),
  domains: z.array(EffortDomainSchema).optional().default([]),
  aiWarning: z.string().optional(),
});

export const AIProjectExtractionResponseSchema = z.object({
  projects: z.array(AIExtractedProjectSchema).max(20),
});

// AI response schema for capability matching
export const AIProjectCapabilityMatchSchema = z.object({
  projectId: z.string(),
  suggestedCapabilityIds: z.array(z.string()),
  confidence: z.enum(["hoog", "gemiddeld", "laag"]),
  toelichting: z.string(),
  warning: z.string().optional(),
});

export const AIProjectCapabilityMatchResponseSchema = z.object({
  matches: z.array(AIProjectCapabilityMatchSchema),
});
```

### Pattern 4: Import Panel with Tabs (reuse SectorWerkStep)
**What:** Two-tab interface (text paste + document upload) inside ExterneProjectenPanel
**When to use:** For the project import interface
**How:** Follow SectorWerkStep's upload handler pattern: formData → /api/parse-projects → rawText → /api/extract-projects → AI structured response → ReviewProjectCards

### Anti-Patterns to Avoid
- **Single domain field:** Do NOT keep the old single-domain approach — D-03 explicitly requires a `domains` array
- **Direct project-baat linking:** D-09 says projects link to vermogens, not baten
- **Creating separate step/page:** D-07 says everything stays in DINMappingStep ExterneProjectenPanel
- **Skipping review step:** D-02 requires user review before saving AI-extracted projects

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| PDF text extraction | Custom PDF parser | pdf-parse | PDF parsing has edge cases with encoding, fonts, layouts |
| DOCX text extraction | Custom DOCX reader | mammoth (already in project) | Handles complex DOCX structures |
| JSON extraction from AI | Manual string parsing | extractJSON + parseAIResponse (existing) | Handles markdown fences, partial JSON, Zod validation |
| AI retry logic | Manual retry loops | callClaudeWithValidation (existing) | 2 silent retries + Zod validation built in |
| ID generation | Custom ID logic | generateId (crypto.randomUUID) from din-service | Already the standard |

**Key insight:** Every AI-calling pattern in this project uses callClaudeWithValidation with a Zod schema. The two new AI operations (extraction + matching) must follow this exact pattern — no exceptions.

## Common Pitfalls

### Pitfall 1: Backward Compatibility with Existing ExternalProject Data
**What goes wrong:** Existing sessions have ExternalProject objects without `domains`, `linkedCapabilityIds`, or `aiWarning` fields. Loading crashes or loses data.
**Why it happens:** localStorage has persisted data with the old schema shape.
**How to avoid:** Use `.optional().default([])` for all new array fields. Use `.optional()` for new string fields. Zod `.default()` handles migration automatically when parsing.
**Warning signs:** TypeErrors on `.map()` or `.length` of undefined on new fields.

### Pitfall 2: PDF Parsing in Next.js API Routes
**What goes wrong:** pdf-parse uses fs internally for test fixtures, which can cause issues in serverless environments.
**Why it happens:** The library tries to load a test PDF on import in some versions.
**How to avoid:** Import pdf-parse dynamically in the API route only when needed. Test with actual PDF files before deploying.
**Warning signs:** Build errors mentioning `fs` module or `test/data` paths.

### Pitfall 3: DINMappingStep File Size (2028 lines)
**What goes wrong:** Adding all new components inline makes the file unmaintainable (already 2028 lines).
**Why it happens:** ExterneProjectenPanel is currently defined inside DINMappingStep.tsx.
**How to avoid:** Extract the new enhanced ExterneProjectenPanel into its own component file (`src/components/din/ExterneProjectenPanel.tsx`). Import it back into DINMappingStep.
**Warning signs:** File exceeds 2500 lines, component functions exceed 300 lines.

### Pitfall 4: AI Capability Matching Needs Existing Capability IDs
**What goes wrong:** AI cannot match projects to capabilities that don't exist yet.
**Why it happens:** If user imports projects before creating any DIN capabilities for the sector.
**How to avoid:** Only show "Analyseer koppelingen" button when capabilities exist for the current sector. Show helpful message otherwise.
**Warning signs:** Empty matching results, confused users.

### Pitfall 5: Session Update Race Conditions with Multiple Projects
**What goes wrong:** Batch-confirming multiple projects simultaneously causes state overwrites.
**Why it happens:** Multiple updateSession calls in quick succession use stale `prev` state.
**How to avoid:** Use a single updateSession call for batch operations (e.g., "Alles bevestigen"). Collect all changes, apply in one functional updater.
**Warning signs:** Only last project saved, others disappear.

## Code Examples

### Example 1: Extended ExternalProject Schema
```typescript
// Source: Based on existing ExternalProjectSchema at schemas.ts:155-162
export const ExternalProjectSchema = z.object({
  id: z.string(),
  sectorId: z.string(),
  name: z.string(),
  description: z.string(),
  status: EffortStatusSchema,
  relevance: z.string().optional(),
  // Phase 12 additions
  domains: z.array(EffortDomainSchema).optional().default([]),
  linkedCapabilityIds: z.array(z.string()).optional().default([]),
  aiWarning: z.string().optional(),
  buitenScope: z.boolean().optional().default(false),
});
```

### Example 2: New API Route Pattern (parse-projects)
```typescript
// Source: Based on existing parse-sector/route.ts pattern
import { NextRequest, NextResponse } from "next/server";
import mammoth from "mammoth";

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const file = formData.get("file") as File | null;
    const text = formData.get("text") as string | null;

    let rawText: string;

    if (file) {
      if (file.name.endsWith(".pdf")) {
        const pdfParse = (await import("pdf-parse")).default;
        const buffer = Buffer.from(await file.arrayBuffer());
        const result = await pdfParse(buffer);
        rawText = result.text;
      } else if (file.name.endsWith(".docx") || file.name.endsWith(".doc")) {
        const buffer = Buffer.from(await file.arrayBuffer());
        const result = await mammoth.extractRawText({ buffer });
        rawText = result.value;
      } else {
        rawText = await file.text();
      }
    } else if (text) {
      rawText = text;
    } else {
      return NextResponse.json(
        { success: false, error: "Tekst of bestand is verplicht" },
        { status: 400 }
      );
    }

    return NextResponse.json({ success: true, data: { rawText } });
  } catch (error) {
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : "Fout bij verwerken" },
      { status: 500 }
    );
  }
}
```

### Example 3: Session State Update for Batch Confirm
```typescript
// Source: Based on existing updateSession pattern in DINMappingStep
function handleConfirmAll(reviewProjects: ReviewProject[]) {
  const newProjects: ExternalProject[] = reviewProjects.map(rp => ({
    id: generateId(),
    sectorId: activeSector,
    name: rp.name,
    description: rp.description,
    status: rp.status,
    domains: rp.domains,
    aiWarning: rp.aiWarning,
  }));

  // Single updateSession call for all projects (avoid race conditions)
  updateSession(prev => ({
    externalProjects: [
      ...(prev.externalProjects || []).filter(p => p.sectorId !== activeSector || !newProjects.some(np => np.name === p.name)),
      ...newProjects,
    ],
  }));
}
```

### Example 4: Capability Mapping Update
```typescript
// Source: Based on existing capabilityEffortMaps pattern
function handleConfirmMappings(projectId: string, capabilityIds: string[]) {
  updateSession(prev => ({
    projectCapabilityMaps: [
      ...(prev.projectCapabilityMaps || []).filter(m => m.projectId !== projectId),
      ...capabilityIds.map(capId => ({ projectId, capabilityId: capId })),
    ],
  }));
}
```

## Validation Architecture

### Test Framework
| Property | Value |
|----------|-------|
| Framework | vitest (already configured) |
| Config file | vitest.config.ts (exists) |
| Quick run command | `npx vitest run --reporter=verbose` |
| Full suite command | `npx vitest run` |

### Phase Requirements to Test Map
| Req ID | Behavior | Test Type | Automated Command | File Exists? |
|--------|----------|-----------|-------------------|-------------|
| D-03 | ExternalProjectSchema validates with domains array | unit | `npx vitest run src/lib/__tests__/external-project-schema.test.ts -t "domains"` | Wave 0 |
| D-03 | Backward compat: old ExternalProject (no domains) parses correctly | unit | `npx vitest run src/lib/__tests__/external-project-schema.test.ts -t "backward"` | Wave 0 |
| D-09 | ProjectCapabilityMapSchema validates | unit | `npx vitest run src/lib/__tests__/external-project-schema.test.ts -t "mapping"` | Wave 0 |
| D-01 | AI extraction response validates against schema | unit | `npx vitest run src/lib/__tests__/external-project-schema.test.ts -t "extraction"` | Wave 0 |
| D-06 | AI capability match response validates against schema | unit | `npx vitest run src/lib/__tests__/external-project-schema.test.ts -t "match"` | Wave 0 |

### Sampling Rate
- **Per task commit:** `npx vitest run --reporter=verbose`
- **Per wave merge:** `npx vitest run && npm run build`
- **Phase gate:** Full suite green + build green before /gsd:verify-work

### Wave 0 Gaps
- [ ] `src/lib/__tests__/external-project-schema.test.ts` -- covers D-03, D-09, D-01, D-06 schema validation
- [ ] No new framework install needed (vitest already configured)

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| Single domain per project | Multi-domain array | Phase 12 | Schema migration needed |
| Manual project entry only | Text paste + document upload + AI extraction | Phase 12 | New API routes + AI prompts |
| Projects standalone (no DIN link) | Projects linked to capabilities | Phase 12 | New mapping schema + UI |
| Projects in separate export section | Projects inline in DIN-chain export | Phase 12 | Word export refactor |

## Open Questions

1. **PDF parsing reliability in Vercel serverless**
   - What we know: pdf-parse works in Node.js, mammoth already works in the project's API routes
   - What's unclear: Whether pdf-parse works reliably in Vercel's serverless function environment (some versions have fs-related issues)
   - Recommendation: Dynamic import + test with actual PDF before deploy. If it fails, fall back to DOCX/TXT only and document PDF as known limitation.

2. **AI prompt quality for project extraction from Miro text**
   - What we know: Miro copy-paste output is unstructured text with varying formatting
   - What's unclear: How reliably Claude can extract structured projects from messy Miro exports
   - Recommendation: Design prompt to be tolerant of varied input formats. Include examples in the system prompt. Add "Bezig met analyseren..." feedback so users know to wait.

## Environment Availability

| Dependency | Required By | Available | Version | Fallback |
|------------|------------|-----------|---------|----------|
| Node.js | Runtime | Yes | (inferred from Next.js 16) | -- |
| npm | Package management | Yes | -- | -- |
| pdf-parse | D-01 PDF upload | No (to install) | 2.4.5 (registry) | DOCX/TXT only |
| mammoth | D-01 DOCX upload | Yes | 1.11.0 | -- |
| @anthropic-ai/sdk | AI extraction + matching | Yes | 0.78.0 | -- |
| vitest | Testing | Yes | (configured) | -- |

**Missing dependencies with no fallback:**
- None blocking

**Missing dependencies with fallback:**
- pdf-parse: Install via npm. If Vercel deployment issues arise, restrict to DOCX/TXT upload.

## Sources

### Primary (HIGH confidence)
- `src/lib/schemas.ts` lines 155-162 -- Current ExternalProjectSchema definition
- `src/lib/schemas.ts` lines 167-181 -- Existing mapping schema patterns (GoalBenefitMap, BenefitCapabilityMap, CapabilityEffortMap)
- `src/lib/schemas.ts` lines 375-406 -- DINSessionSchema with optional fields + defaults pattern
- `src/lib/ai-client.ts` lines 82-118 -- parseAIResponse + extractJSON pattern
- `src/lib/ai-client.ts` lines 125+ -- callClaudeWithValidation pattern
- `src/components/steps/DINMappingStep.tsx` lines 80-240 -- Current ExterneProjectenPanel
- `src/components/steps/DINMappingStep.tsx` lines 1933-1961 -- ExterneProjectenPanel integration point
- `src/components/steps/SectorWerkStep.tsx` -- Upload + AI parse flow pattern
- `src/app/api/parse-sector/route.ts` -- Document parsing API route pattern
- `src/lib/word-export.ts` lines 1022-1060 -- Current externalProjectsSection
- `src/components/steps/ExportStep.tsx` lines 772-808 -- Current ExterneProjectenBlock

### Secondary (MEDIUM confidence)
- npm registry: pdf-parse 2.4.5 verified available
- CONTEXT.md decisions D-01 through D-14: all locked implementation decisions
- UI-SPEC: 12-UI-SPEC.md approved component specs and interaction patterns

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH - all existing libraries verified in codebase, only pdf-parse is new
- Architecture: HIGH - all patterns directly derived from existing codebase patterns
- Pitfalls: HIGH - based on actual codebase analysis (file sizes, schema patterns, state management)

**Research date:** 2026-04-04
**Valid until:** 2026-05-04 (stable codebase, no external dependency churn)
