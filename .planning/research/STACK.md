# Technology Stack

**Project:** DIN (Doelen-Inspanningennetwerk) Programmamanagement App
**Researched:** 2026-03-30
**Research Mode:** Ecosystem — focused on four improvement areas

## Current Stack (Keep As-Is)

The existing stack is modern and well-chosen. These remain unchanged:

| Technology | Version | Purpose | Status |
|------------|---------|---------|--------|
| Next.js | ^16.1.0 | Full-stack framework | Keep |
| React | ^19.1.0 | UI framework | Keep |
| TypeScript | ^5.8.0 | Type safety | Keep |
| Tailwind CSS | ^4.1.0 | Styling | Keep |
| @anthropic-ai/sdk | ^0.78.0 | AI client (Claude) | Keep, upgrade pattern |
| docx | ^9.6.0 | Word export | Keep, extend usage |
| mammoth | ^1.11.0 | .doc/.docx import | Keep |
| Deployment: Vercel | — | Hosting | Keep |

---

## Recommended Additions

### 1. AI Structured Output: Zod

| Technology | Version | Purpose | Why |
|------------|---------|---------|-----|
| zod | ^3.24 | Schema validation for AI output | Guarantees type-safe AI responses; replaces fragile JSON.parse + manual validation |

**Confidence:** HIGH (Zod is the de facto standard for runtime validation in TypeScript)

**Rationale:** The current codebase asks Claude to "answer only as JSON" and then does manual `JSON.parse` with try/catch and regex extraction (`sectorAnalysis.match(/\{[\s\S]*\}/)`). This is brittle:
- Claude sometimes wraps JSON in markdown code fences
- Partial or malformed JSON causes silent failures
- No runtime type checking after parse

**What Zod solves:**
1. Define schemas that match TypeScript types (e.g., `DINMappingResponseSchema`)
2. Use `schema.safeParse()` on AI output for typed, validated results
3. Generate JSON Schema from Zod schemas to include in prompts (Claude follows JSON Schema well)
4. Get actionable error messages when AI output deviates

**Pattern:**
```typescript
import { z } from "zod";

const BatenProfielSchema = z.object({
  bateneigenaar: z.string().optional(),
  indicator: z.string(),
  indicatorOwner: z.string(),
  currentValue: z.string(),
  targetValue: z.string(),
});

const DINMappingResponseSchema = z.object({
  benefits: z.array(z.object({
    title: z.string(),
    description: z.string(),
    profiel: BatenProfielSchema,
  })),
  capabilities: z.array(z.object({
    title: z.string(),
    description: z.string(),
    currentLevel: z.number().min(1).max(5),
    targetLevel: z.number().min(1).max(5),
  })),
  efforts: z.array(z.object({
    title: z.string(),
    description: z.string(),
    domain: z.enum(["mens", "processen", "data_systemen", "cultuur"]),
    quarter: z.string().optional(),
  })),
});

// In AI client: validate response
const parsed = DINMappingResponseSchema.safeParse(JSON.parse(cleanedResponse));
if (!parsed.success) {
  // Retry with error context, or return partial data
}
```

**What NOT to use:**
- `io-ts` — more complex API, smaller ecosystem, less adoption
- `yup` — less TypeScript-native, weaker inference
- `ajv` (raw JSON Schema) — no TypeScript type inference, separate schema maintenance

---

### 2. Wizard State Management: Zustand

| Technology | Version | Purpose | Why |
|------------|---------|---------|-----|
| zustand | ^5.0 | Cross-step state management | Lightweight, no providers needed, built-in persistence middleware |

**Confidence:** HIGH (Zustand is the most popular lightweight state manager for React)

**Rationale:** The current app stores all session data in a single `DINSession` object via `localStorage`. The problem is data flow between wizard steps:
- Step results (sectorwerk analysis) need to flow into DIN-mapping
- Cross-analyse needs aggregated data from all sectors
- Currently uses prop drilling and scattered `loadLocal`/`saveLocal` calls

**What Zustand solves:**
1. Single store for `DINSession` with typed actions (addBenefit, updateGoal, etc.)
2. Built-in `persist` middleware that replaces the manual `persistence.ts` localStorage layer
3. `subscribeWithSelector` for components that only need part of the session
4. No Context providers needed — works with Next.js App Router seamlessly
5. Computed/derived data via selectors (e.g., "all benefits for sector PO, goal X")

**Pattern:**
```typescript
import { create } from "zustand";
import { persist } from "zustand/middleware";

interface DINStore {
  session: DINSession;
  // Actions
  setGoals: (goals: ProgrammeGoal[]) => void;
  addBenefit: (benefit: DINBenefit) => void;
  getSectorBenefits: (sectorId: string) => DINBenefit[];
  // Cross-step data flow
  getSectorAnalysisForMapping: (sectorId: string) => string | null;
  // ...
}

export const useDINStore = create<DINStore>()(
  persist(
    (set, get) => ({
      session: createEmptySession(),
      setGoals: (goals) => set((s) => ({ session: { ...s.session, goals } })),
      addBenefit: (benefit) => set((s) => ({
        session: { ...s.session, benefits: [...s.session.benefits, benefit] }
      })),
      getSectorBenefits: (sectorId) =>
        get().session.benefits.filter((b) => b.sectorId === sectorId),
      getSectorAnalysisForMapping: (sectorId) =>
        get().session.sectorAnalyses?.[sectorId] ?? null,
    }),
    { name: "din_session", storage: createJSONStorage(() => localStorage) }
  )
);
```

**What NOT to use:**
- `Redux Toolkit` — overkill for single-user app with ~15 state actions, boilerplate-heavy
- `jotai` — atomic model is elegant but less natural for a single large session object
- `React Context + useReducer` — causes unnecessary re-renders, no built-in persistence
- `@tanstack/react-query` — great for server state, but DIN session is client-first state

---

### 3. Network Visualization: @xyflow/react (React Flow)

| Technology | Version | Purpose | Why |
|------------|---------|---------|-----|
| @xyflow/react | ^12.4 | Interactive DIN network graph | Purpose-built for node-based graphs with React; handles layout, zoom, pan, connections |

**Confidence:** HIGH (React Flow is the dominant React graph/node library, 25k+ GitHub stars)

**Rationale:** The current `DINNetworkGraph.tsx` renders the DIN chain as expandable cards with Tailwind CSS. This works for small datasets but fails to show:
- Cross-sector connections (shared capabilities/efforts)
- The full network topology (Doelen -> Baten -> Vermogens -> Inspanningen)
- Leverage points (nodes with many connections)
- Gaps (disconnected nodes)

The DIN methodology is fundamentally a directed acyclic graph (DAG). It needs graph visualization.

**What React Flow provides:**
1. Node types per DIN level (Goal nodes, Benefit nodes, Capability nodes, Effort nodes) with custom React components
2. Edge connections showing the mapping relationships
3. Automatic layout via dagre or elkjs (hierarchical left-to-right or top-to-bottom)
4. Interactive: click nodes to edit, hover for details, zoom to focus on one chain
5. Mini-map for navigation in larger networks
6. Export to image (for presentations)

**Supporting layout library:**

| Technology | Version | Purpose | Why |
|------------|---------|---------|-----|
| @dagrejs/dagre | ^1.1 | Automatic DAG layout | Positions nodes in hierarchical layers; lightweight |

**Confidence:** MEDIUM (dagre is stable but maintenance is sporadic; elkjs is an alternative if dagre causes issues)

**Pattern:**
```typescript
// Map DIN data to React Flow nodes
const nodes: Node[] = [
  ...session.goals.map(g => ({
    id: `goal-${g.id}`,
    type: "dinGoal",
    data: g,
    position: { x: 0, y: 0 }, // dagre computes this
  })),
  ...session.benefits.map(b => ({
    id: `benefit-${b.id}`,
    type: "dinBenefit",
    data: b,
    position: { x: 0, y: 0 },
  })),
  // ... capabilities, efforts
];

const edges: Edge[] = [
  ...session.goalBenefitMaps.map(m => ({
    id: `gb-${m.goalId}-${m.benefitId}`,
    source: `goal-${m.goalId}`,
    target: `benefit-${m.benefitId}`,
  })),
  // ... benefit-capability, capability-effort
];
```

**What NOT to use:**
- `d3` directly — too low-level, requires manual React integration, not declarative
- `vis-network` — not React-native, imperative API, harder to style
- `cytoscape.js` — powerful but React integration is weak; better for academic/bioinformatics
- `mermaid` — static diagrams only, no interactivity
- `sigma.js` — optimized for huge graphs (100k+ nodes), overkill for DIN's ~50-200 nodes

---

### 4. Word Export Enhancement: docx (existing) + Better Patterns

| Technology | Version | Purpose | Why |
|------------|---------|---------|-----|
| docx | ^9.6 (already installed) | Word generation | Already in use; needs pattern improvement, not library replacement |

**Confidence:** HIGH (docx is the standard Node.js Word generation library)

**Rationale:** The current `word-export.ts` already uses `docx` competently with Cito styling. The improvements are architectural, not library-level:

1. **Template patterns** — Extract reusable document building blocks (table styles, section templates)
2. **DIN network table** — Generate a proper matrix table (Goals x Baten x Vermogens x Inspanningen) for the programmaplan
3. **Table of Contents** — docx supports `TableOfContents` natively; currently not used
4. **Numbered headings** — Use docx's `NumberingConfig` for proper heading numbering
5. **Images from canvas** — For including the DIN network graph as an image in the Word doc

**Additional library for graph-to-image:**

| Technology | Version | Purpose | Why |
|------------|---------|---------|-----|
| html-to-image | ^1.11 | Capture React Flow graph as PNG | Converts DOM nodes to images; works with React Flow's container |

**Confidence:** MEDIUM (html-to-image works well but has edge cases with SVG rendering)

**Alternative:** React Flow has a built-in `toObject()` and viewport export. For simple export, the `@xyflow/react` `getNodesBounds` + `getViewportForBounds` + `toPng` pattern from their docs may suffice without an extra library.

**What NOT to use:**
- `pdfkit` / `jspdf` — PDF is not the requirement; Word is
- `officegen` — abandoned, last release 2020
- `open-docx` / `docxtemplater` — template-based approach; harder to programmatically compose complex documents than docx's builder pattern
- `puppeteer` for HTML-to-Word — heavy, server-side Chrome dependency, not Vercel-friendly

---

### 5. AI Prompt Engineering: Anthropic SDK Features (No New Library)

| Technology | Version | Purpose | Why |
|------------|---------|---------|-----|
| @anthropic-ai/sdk | ^0.78 (existing) | Claude API | Use existing SDK features better: prefill, system prompts, temperature control |

**Confidence:** HIGH (based on Anthropic SDK documentation)

**What to improve (no new dependencies):**

1. **Prefilled assistant responses** — Force JSON output by starting the assistant turn with `{`:
   ```typescript
   messages: [
     { role: "user", content: userMessage },
     { role: "assistant", content: "{" } // Forces JSON output
   ]
   ```
   This eliminates the "markdown code fence" problem entirely.

2. **Temperature control** — Currently not set (defaults to 1.0). For structured DIN output, use `temperature: 0.3` for consistency and `temperature: 0.7` for creative suggestions.

3. **Programmaboek as cached system context** — The `docs/programmaboek.doc` methodology text should be extracted once and included in the system prompt. Anthropic supports prompt caching for system prompts, reducing latency and cost for repeated calls.

4. **Retry with schema errors** — When Zod validation fails, send the error message back to Claude as a follow-up turn asking for correction. This is a cheap retry that almost always works.

5. **Streaming for long responses** — `generateProgrammaPlan` uses 16384 tokens. Use streaming to show progress rather than making the user wait.

---

## Summary: New Dependencies

### Production Dependencies

```bash
npm install zod zustand @xyflow/react @dagrejs/dagre
```

| Package | Approx Size | Purpose |
|---------|-------------|---------|
| zod | ~57 kB | AI output validation |
| zustand | ~16 kB | State management |
| @xyflow/react | ~250 kB | Network visualization |
| @dagrejs/dagre | ~30 kB | Graph layout |

### Optional (Add If Needed)

```bash
npm install html-to-image
```

| Package | Approx Size | Purpose |
|---------|-------------|---------|
| html-to-image | ~15 kB | Graph screenshot for Word export |

### Dev Dependencies

No new dev dependencies needed. Existing ESLint + TypeScript setup is sufficient.

---

## Alternatives Considered

| Category | Recommended | Alternative | Why Not Alternative |
|----------|-------------|-------------|---------------------|
| Validation | zod | io-ts / yup | io-ts: complex FP API; yup: weaker TS inference |
| State | zustand | Redux Toolkit | Overkill for single-user, ~15 actions; boilerplate |
| State | zustand | jotai | Atomic model less natural for single session object |
| Graph viz | @xyflow/react | d3 | Low-level, not declarative, manual React integration |
| Graph viz | @xyflow/react | cytoscape | Poor React integration, academic focus |
| Graph layout | dagre | elkjs | elkjs is more powerful but heavier; dagre suffices for DIN's DAG |
| Word export | docx (keep) | docxtemplater | Template approach worse for dynamic programmatic docs |
| AI output | zod + prefill | langchain / vercel ai sdk | Heavy abstractions for a simple use case; direct SDK is cleaner |

---

## Architecture Impact

### Before (Current)

```
Component → loadLocal() → raw JSON → pass as props → manual parse in each step
AI call → string response → regex match → JSON.parse → hope it matches types
```

### After (Recommended)

```
Component → useDINStore() → typed selectors → auto-persistence
AI call → string response → cleanJSON → zod.safeParse() → typed result or retry
DIN data → React Flow nodes/edges → dagre layout → interactive graph
```

---

## Version Confidence

| Package | Recommended | Confidence | Notes |
|---------|-------------|------------|-------|
| zod | ^3.24 | MEDIUM | 3.x is current stable; exact minor version unverified (no web access) |
| zustand | ^5.0 | MEDIUM | 5.x released in 2024; exact latest unverified |
| @xyflow/react | ^12.4 | MEDIUM | 12.x is the v12 rebrand from reactflow; exact latest unverified |
| @dagrejs/dagre | ^1.1 | LOW | dagre was forked to @dagrejs; exact version unverified |
| html-to-image | ^1.11 | LOW | Exact latest unverified |
| docx | ^9.6 | HIGH | Already installed and working |
| @anthropic-ai/sdk | ^0.78 | HIGH | Already installed and working |

**Important:** All "MEDIUM" and "LOW" confidence versions should be verified with `npm view [package] version` before adding to package.json. I was unable to verify via npm due to tool restrictions in this session.

---

## Sources

- Codebase analysis: `package.json`, `src/lib/ai-client.ts`, `src/lib/prompts.ts`, `src/lib/word-export.ts`, `src/lib/persistence.ts`, `src/lib/types.ts`, `src/components/din/DINNetworkGraph.tsx`
- Training data knowledge (May 2025 cutoff) for library recommendations — flagged as MEDIUM confidence where applicable
- No web verification was possible in this session (WebSearch, WebFetch, and Bash tools were unavailable)

---

*Stack research: 2026-03-30*
