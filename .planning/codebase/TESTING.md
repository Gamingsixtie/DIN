# Testing Patterns

**Analysis Date:** 2026-03-30

## Test Framework

**Status:** No testing infrastructure currently configured

**Runner:**
- Not detected. No Jest, Vitest, or other test runner in `package.json`
- No test configuration files found (`jest.config.js`, `vitest.config.ts`, etc.)

**Assertion Library:**
- Not configured

**Potential Setup Commands:**
- To add Jest: `npm install --save-dev jest @types/jest ts-jest`
- To add Vitest: `npm install --save-dev vitest @vitest/ui`
- Recommended: Vitest for Next.js projects (faster, ESM native, better TypeScript support)

---

## Current Testing State

**No test files detected** in the codebase (`src/**/*.test.ts`, `src/**/*.spec.ts`, etc.)

While the codebase lacks automated tests, it demonstrates testable patterns through:
1. Clear separation of concerns (services, components, utilities)
2. Dependency injection via function parameters
3. Mockable async dependencies (AI client, Supabase, localStorage)

---

## Recommended Testing Structure

### Test File Organization

**Location:** Co-located with source files

```
src/
├── lib/
│   ├── din-service.ts
│   ├── din-service.test.ts          # Unit tests for CRUD operations
│   ├── ai-client.ts
│   ├── ai-client.test.ts            # Mock Anthropic SDK
│   ├── persistence.test.ts          # Mock localStorage/Supabase
│   └── types.ts                     # No tests (type-only)
├── components/
│   ├── din/
│   │   ├── BenefitCard.tsx
│   │   ├── BenefitCard.test.tsx     # Component render + interaction tests
│   │   └── ...
│   └── steps/
│       ├── DINMappingStep.tsx
│       └── DINMappingStep.test.tsx
└── app/
    └── api/
        ├── din-mapping/
        │   ├── route.ts
        │   └── route.test.ts        # API route request/response tests
```

**Naming:** `*.test.ts` or `*.test.tsx` suffix (matches Next.js + Vitest convention)

---

## Testable Patterns in Codebase

### 1. Service Layer (Easy to Unit Test)

**File:** `src/lib/din-service.ts`

```typescript
// Pure functions with no side effects — ideal for testing
export function generateId(): string {
  return crypto.randomUUID();
}

export function createBenefit(
  goalId: string,
  sectorId: string,
  description: string,
  title?: string
): DINBenefit {
  return { id: generateId(), goalId, sectorId, title: title || "", description, profiel: {...} };
}

export function getBenefitsByGoalAndSector(
  benefits: DINBenefit[],
  goalId: string,
  sectorId: string
): DINBenefit[] {
  return benefits.filter(b => b.goalId === goalId && b.sectorId === sectorId);
}
```

**Test Pattern:**
```typescript
describe('din-service', () => {
  describe('createBenefit', () => {
    it('should create a benefit with required fields', () => {
      const benefit = createBenefit('goal1', 'PO', 'Test description');
      expect(benefit.goalId).toBe('goal1');
      expect(benefit.sectorId).toBe('PO');
      expect(benefit.id).toBeDefined();
    });
  });

  describe('getBenefitsByGoalAndSector', () => {
    it('should filter benefits by goal and sector', () => {
      const benefits = [
        createBenefit('g1', 'PO', 'desc1'),
        createBenefit('g1', 'VO', 'desc2'),
      ];
      const result = getBenefitsByGoalAndSector(benefits, 'g1', 'PO');
      expect(result).toHaveLength(1);
      expect(result[0].sectorId).toBe('PO');
    });
  });
});
```

### 2. Persistence Layer (Mockable)

**File:** `src/lib/persistence.ts`

Functions interact with `localStorage` and Supabase — ideal for mocking:

```typescript
export function loadLocal<T>(key: string): T | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = localStorage.getItem(STORAGE_PREFIX + key);
    if (!raw) return null;
    return JSON.parse(raw) as T;
  } catch {
    return null;
  }
}

export function saveLocal<T>(key: string, data: T): void {
  if (typeof window === "undefined") return;
  if (data === null || data === undefined) return;
  if (Array.isArray(data) && data.length === 0) return;
  try {
    localStorage.setItem(STORAGE_PREFIX + key, JSON.stringify(data));
  } catch (e) {
    console.error(`[persistence] localStorage write failed for ${key}:`, e);
  }
}
```

**Test Pattern:**
```typescript
describe('persistence', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  describe('saveLocal and loadLocal', () => {
    it('should save and retrieve data from localStorage', () => {
      const testData = { id: '1', name: 'Test' };
      saveLocal('test_key', testData);

      const loaded = loadLocal<typeof testData>('test_key');
      expect(loaded).toEqual(testData);
    });

    it('should not save empty arrays', () => {
      saveLocal('empty', []);
      const loaded = loadLocal('empty');
      expect(loaded).toBeNull();
    });

    it('should handle parse errors gracefully', () => {
      localStorage.setItem('din_bad_json', 'invalid{json}');
      const loaded = loadLocal('bad_json');
      expect(loaded).toBeNull();
    });
  });
});
```

### 3. API Route Handlers (Request/Response Testing)

**File:** `src/app/api/din-mapping/route.ts`

```typescript
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { goal, sectorPlan, sector, allGoals, sectorAnalysis } = body;

    if (!goal) {
      return NextResponse.json(
        { success: false, error: "Doel is verplicht" },
        { status: 400 }
      );
    }

    const result = await generateDINMapping(...);

    return NextResponse.json({
      success: true,
      data: parsed || { benefits: [], capabilities: [], efforts: [] },
    });
  } catch (error) {
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : "Fout bij DIN-mapping generatie",
      },
      { status: 500 }
    );
  }
}
```

**Test Pattern with Vitest:**
```typescript
describe('/api/din-mapping', () => {
  it('should return 400 when goal is missing', async () => {
    const request = new Request('http://localhost/api/din-mapping', {
      method: 'POST',
      body: JSON.stringify({ sectorPlan: null }),
    });

    const response = await POST(request as NextRequest);
    const data = await response.json();

    expect(response.status).toBe(400);
    expect(data.success).toBe(false);
    expect(data.error).toBe("Doel is verplicht");
  });

  it('should generate DIN mapping on valid input', async () => {
    const request = new Request('http://localhost/api/din-mapping', {
      method: 'POST',
      body: JSON.stringify({
        goal: { name: 'Test', description: 'Test description' },
        sector: 'PO',
      }),
    });

    const response = await POST(request as NextRequest);
    expect(response.status).toBe(200);
  });
});
```

### 4. React Component Testing (User Interactions)

**File:** `src/components/din/BenefitCard.tsx`

**Key interactive behaviors to test:**
- Expanding/collapsing detail panel
- Adding/editing benefit fields
- AI suggestion workflow
- Undo functionality
- Delete confirmation flow

**Test Pattern with Vitest + @testing-library/react:**
```typescript
import { render, screen, fireEvent } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import BenefitCard from './BenefitCard';

describe('BenefitCard', () => {
  const mockBenefit: DINBenefit = {
    id: '1',
    goalId: 'g1',
    sectorId: 'PO',
    title: 'Test Benefit',
    description: 'Test description',
    profiel: {
      bateneigenaar: '',
      indicator: '',
      indicatorOwner: '',
      currentValue: '',
      targetValue: '',
    },
  };

  it('should render benefit title and description', () => {
    render(
      <BenefitCard
        benefit={mockBenefit}
        onChange={() => {}}
        onDelete={() => {}}
      />
    );

    expect(screen.getByDisplayValue('Test Benefit')).toBeInTheDocument();
    expect(screen.getByDisplayValue('Test description')).toBeInTheDocument();
  });

  it('should expand details when clicking expand button', async () => {
    const user = userEvent.setup();
    render(
      <BenefitCard
        benefit={mockBenefit}
        onChange={() => {}}
        onDelete={() => {}}
      />
    );

    const expandButton = screen.getByRole('button', { name: /expand|profiel/ });
    await user.click(expandButton);

    expect(screen.getByLabelText(/bateneigenaar/i)).toBeInTheDocument();
  });

  it('should call onChange when title is edited', async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();
    render(
      <BenefitCard
        benefit={mockBenefit}
        onChange={onChange}
        onDelete={() => {}}
      />
    );

    const titleInput = screen.getByDisplayValue('Test Benefit');
    await user.clear(titleInput);
    await user.type(titleInput, 'New Title');

    expect(onChange).toHaveBeenCalled();
  });

  it('should show delete confirmation on delete button click', async () => {
    const user = userEvent.setup();
    render(
      <BenefitCard
        benefit={mockBenefit}
        onChange={() => {}}
        onDelete={() => {}}
      />
    );

    const deleteButton = screen.getByTitle(/verwijderen/i);
    await user.click(deleteButton);

    expect(screen.getByText(/verwijderen/i)).toBeInTheDocument();
  });
});
```

---

## Mocking Patterns

### Mocking AI Client

**File:** `src/lib/ai-client.ts`

```typescript
// In test setup (vitest.config.ts or test file)
vi.mock('@/lib/ai-client', () => ({
  generateDINMapping: vi.fn(() => Promise.resolve(
    JSON.stringify({
      benefits: [{ title: 'Mock Benefit', description: 'Mock' }],
      capabilities: [],
      efforts: [],
    })
  )),
}));
```

### Mocking Next.js Router

```typescript
const mockPush = vi.fn();
vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: mockPush }),
}));
```

### Mocking localStorage

```typescript
describe('with localStorage', () => {
  beforeEach(() => {
    const store: Record<string, string> = {};

    vi.stubGlobal('localStorage', {
      getItem: (key: string) => store[key] ?? null,
      setItem: (key: string, value: string) => { store[key] = value; },
      removeItem: (key: string) => { delete store[key]; },
      clear: () => Object.keys(store).forEach(k => delete store[k]),
    });
  });

  it('should persist data', () => {
    saveLocal('test', { id: '1' });
    expect(loadLocal('test')).toEqual({ id: '1' });
  });
});
```

---

## What to Mock / What NOT to Mock

**What to Mock:**
- External APIs (Anthropic Claude, Supabase)
- Browser APIs (localStorage, sessionStorage)
- Next.js router/navigation
- File system operations

**What NOT to Mock:**
- Pure utility functions (`generateId()`, `createBenefit()`, `getBenefitsByGoal()`)
- Data validation logic
- Type definitions
- Business logic — test actual implementations

---

## Coverage Targets

**Recommended Coverage Goals:**
- `src/lib/` services: 80%+ (CRUD, filtering, utilities)
- `src/app/api/` routes: 75%+ (happy path + error cases)
- `src/components/` interactive components: 70%+ (user interactions, state changes)
- Do not force 100% — diminishing returns on trivial code

**View Coverage:**
```bash
# After configuring test runner
npm run test:coverage
```

---

## Test Types

### Unit Tests

**Scope:** Individual functions/utilities in isolation

**Examples:**
- `din-service.ts` utility functions
- `persistence.ts` save/load operations
- Type utilities and validators

**Execution:** Fast (<5ms each)

### Integration Tests

**Scope:** Multiple modules working together within a feature

**Examples:**
- API route handling request → validation → AI client → response
- Component with session context + persistence
- DIN workflow (benefit creation → capability mapping → effort assignment)

**Execution:** Moderate speed (50-200ms each)

### E2E Tests

**Framework:** Not currently in use

**Recommended:** Playwright for Next.js app E2E testing
- Test full user journeys (import KiB → map DIN → export)
- Requires Playwright setup: `npm install --save-dev @playwright/test`

---

## Running Tests (After Setup)

**Vitest is recommended for this project:**

```bash
# Install Vitest + testing libraries
npm install --save-dev vitest @vitest/ui @testing-library/react @testing-library/jest-dom

# Run all tests
npm run test

# Run in watch mode
npm run test:watch

# Run with UI
npm run test:ui

# Generate coverage report
npm run test:coverage
```

**Add to package.json scripts:**
```json
{
  "scripts": {
    "test": "vitest run",
    "test:watch": "vitest",
    "test:ui": "vitest --ui",
    "test:coverage": "vitest run --coverage"
  }
}
```

---

*Testing analysis: 2026-03-30*
