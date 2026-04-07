import { describe, it, expect, vi, beforeEach } from "vitest";

// Mock localStorage before importing module
const localStorageMock = (() => {
  let store: Record<string, string> = {};
  return {
    getItem: vi.fn((key: string) => store[key] ?? null),
    setItem: vi.fn((key: string, value: string) => {
      store[key] = value;
    }),
    removeItem: vi.fn((key: string) => {
      delete store[key];
    }),
    clear: vi.fn(() => {
      store = {};
    }),
    get length() {
      return Object.keys(store).length;
    },
    key: vi.fn((index: number) => Object.keys(store)[index] ?? null),
  };
})();

// Stub window and localStorage for Node environment
vi.stubGlobal("window", {});
vi.stubGlobal("localStorage", localStorageMock);

// Mock supabase module — factory must not reference outer variables
vi.mock("@/lib/supabase", () => {
  const mockFrom = vi.fn();
  const client = { from: mockFrom };
  return {
    supabase: client,
    isSupabaseConfigured: true,
  };
});

// Import after mocking
import {
  saveLocal,
  loadLocal,
  withRetry,
  saveSessionToSupabase,
  loadSessionFromSupabase,
  deleteSessionFromSupabase,
  checkSupabaseHealth,
} from "@/lib/persistence";
import { supabase } from "@/lib/supabase";
import type { DINSession } from "@/lib/types";

// Get the mock `from` function for assertions
const mockFrom = vi.mocked(supabase!.from);

// --- Helper: minimal DINSession ---
function makeSession(overrides: Partial<DINSession> = {}): DINSession {
  return {
    id: "test-id",
    name: "Test Session",
    createdAt: "2026-04-07T10:00:00Z",
    updatedAt: "2026-04-07T14:00:00Z",
    version: 3,
    currentStep: 0,
    goals: [],
    sectorPlans: [],
    pmcEntries: [],
    benefits: [],
    capabilities: [],
    efforts: [],
    goalBenefitMaps: [],
    benefitCapabilityMaps: [],
    capabilityEffortMaps: [],
    projectCapabilityMaps: [],
    completedGoals: [],
    ...overrides,
  };
}

// --- Helper: setup chained supabase mocks for saveSessionToSupabase ---
function setupSaveChain(
  remoteData: Record<string, unknown> | null,
  upsertError: { message: string } | null = null
) {
  const mockSingle = vi.fn().mockResolvedValue({
    data: remoteData ? { data: remoteData } : null,
    error: null,
  });
  const mockEqInner = vi.fn().mockReturnValue({ single: mockSingle });
  const mockEqOuter = vi.fn().mockReturnValue({ single: mockSingle, eq: mockEqInner });
  const mockSelect = vi.fn().mockReturnValue({ eq: mockEqOuter });
  const mockUpsert = vi.fn().mockResolvedValue({ error: upsertError });
  const mockDelete = vi.fn();

  mockFrom.mockReturnValue({
    select: mockSelect,
    upsert: mockUpsert,
    delete: mockDelete,
  } as unknown as ReturnType<typeof mockFrom>);

  return { mockSelect, mockUpsert, mockSingle, mockEqOuter, mockDelete };
}

describe("saveLocal", () => {
  beforeEach(() => {
    localStorageMock.clear();
    vi.clearAllMocks();
  });

  it("returns true when writing a valid string value", () => {
    const result = saveLocal("test-key", "hello world");
    expect(result).toBe(true);
    expect(localStorageMock.setItem).toHaveBeenCalledOnce();
  });

  it("returns true when writing an empty array [] (D-05 empty guard removed)", () => {
    const result = saveLocal("test-key", []);
    expect(result).toBe(true);
    expect(localStorageMock.setItem).toHaveBeenCalledWith("din_test-key", "[]");
  });

  it("returns false when data is null", () => {
    const result = saveLocal("test-key", null);
    expect(result).toBe(false);
    expect(localStorageMock.setItem).not.toHaveBeenCalled();
  });

  it("returns false when data is undefined", () => {
    const result = saveLocal("test-key", undefined);
    expect(result).toBe(false);
    expect(localStorageMock.setItem).not.toHaveBeenCalled();
  });

  it("returns false when localStorage.setItem throws QuotaExceededError", () => {
    localStorageMock.setItem.mockImplementationOnce(() => {
      throw new DOMException("quota exceeded", "QuotaExceededError");
    });
    const result = saveLocal("test-key", { data: "large" });
    expect(result).toBe(false);
  });
});

describe("withRetry", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("succeeds on first attempt and returns result", async () => {
    const fn = vi.fn().mockResolvedValue("ok");
    const result = await withRetry(fn, { baseDelay: 1 });
    expect(result).toBe("ok");
    expect(fn).toHaveBeenCalledTimes(1);
  });

  it("fails twice then succeeds on third attempt", async () => {
    const fn = vi.fn()
      .mockRejectedValueOnce(new Error("fail-1"))
      .mockRejectedValueOnce(new Error("fail-2"))
      .mockResolvedValue("ok");
    const result = await withRetry(fn, { maxRetries: 3, baseDelay: 1 });
    expect(result).toBe("ok");
    expect(fn).toHaveBeenCalledTimes(3);
  });

  it("fails all 4 attempts (0 + 3 retries) and throws last error", async () => {
    const fn = vi.fn().mockRejectedValue(new Error("persistent-fail"));
    await expect(
      withRetry(fn, { maxRetries: 3, baseDelay: 1 })
    ).rejects.toThrow("persistent-fail");
    expect(fn).toHaveBeenCalledTimes(4);
  });

  it("applies exponential backoff delays (500, 1000, 2000ms)", async () => {
    const delays: number[] = [];
    const origSetTimeout = globalThis.setTimeout;
    vi.spyOn(globalThis, "setTimeout").mockImplementation(((fn: () => void, ms?: number) => {
      delays.push(ms ?? 0);
      fn();
      return 0 as unknown as ReturnType<typeof origSetTimeout>;
    }) as typeof setTimeout);

    const failFn = vi.fn().mockRejectedValue(new Error("fail"));
    try {
      await withRetry(failFn, { maxRetries: 3, baseDelay: 500, label: "test" });
    } catch {
      // Expected
    }

    expect(delays).toEqual([500, 1000, 2000]);
    vi.restoreAllMocks();
  });
});

describe("saveSessionToSupabase", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns false when supabase is null (D-12 graceful degradation)", async () => {
    // Override supabase to null temporarily
    const supabaseMod = await import("@/lib/supabase");
    const origSupabase = supabaseMod.supabase;
    const origConfigured = supabaseMod.isSupabaseConfigured;
    Object.defineProperty(supabaseMod, "supabase", { value: null, writable: true, configurable: true });
    Object.defineProperty(supabaseMod, "isSupabaseConfigured", { value: false, writable: true, configurable: true });

    const result = await saveSessionToSupabase(makeSession());

    Object.defineProperty(supabaseMod, "supabase", { value: origSupabase, writable: true, configurable: true });
    Object.defineProperty(supabaseMod, "isSupabaseConfigured", { value: origConfigured, writable: true, configurable: true });

    expect(result).toBe(false);
  });

  it("skips write when remote version > local version (D-08)", async () => {
    const session = makeSession({ version: 3 });
    const remoteSession = { ...session, version: 5 };
    const { mockUpsert } = setupSaveChain(remoteSession);

    const result = await saveSessionToSupabase(session);

    expect(result).toBe(false);
    expect(mockUpsert).not.toHaveBeenCalled();
  });

  it("skips write when versions equal but remote updatedAt is newer (D-04 tiebreaker)", async () => {
    const session = makeSession({
      version: 3,
      updatedAt: "2026-04-07T14:00:00Z",
    });
    const remoteSession = {
      ...session,
      version: 3,
      updatedAt: "2026-04-07T15:00:00Z", // newer
    };
    const { mockUpsert } = setupSaveChain(remoteSession);

    const result = await saveSessionToSupabase(session);

    expect(result).toBe(false);
    expect(mockUpsert).not.toHaveBeenCalled();
  });

  it("writes when versions equal and local updatedAt is newer (D-04 tiebreaker)", async () => {
    const session = makeSession({
      version: 3,
      updatedAt: "2026-04-07T15:00:00Z",
    });
    const remoteSession = {
      ...session,
      version: 3,
      updatedAt: "2026-04-07T14:00:00Z", // older
    };
    const { mockUpsert } = setupSaveChain(remoteSession);

    const result = await saveSessionToSupabase(session);

    expect(result).toBe(true);
    expect(mockUpsert).toHaveBeenCalledTimes(1);
  });

  it("increments version on successful write (D-08)", async () => {
    const session = makeSession({ version: 3, updatedAt: "2026-04-07T15:00:00Z" });
    const remoteSession = { ...session, version: 3, updatedAt: "2026-04-07T13:00:00Z" };
    const { mockUpsert } = setupSaveChain(remoteSession);

    await saveSessionToSupabase(session);

    // nextVersion = max(3, 3) + 1 = 4
    const upsertArg = mockUpsert.mock.calls[0][0];
    expect(upsertArg.data.version).toBe(4);
  });

  it("writes when remote has no data (new session)", async () => {
    const session = makeSession({ version: 1 });
    const { mockUpsert } = setupSaveChain(null);

    const result = await saveSessionToSupabase(session);

    expect(result).toBe(true);
    expect(mockUpsert).toHaveBeenCalledTimes(1);
    // nextVersion = max(0, 1) + 1 = 2
    const upsertArg = mockUpsert.mock.calls[0][0];
    expect(upsertArg.data.version).toBe(2);
  });
});

describe("single-device guarantee (D-05)", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("write path uses version check + updatedAt tiebreaker without multi-device merge logic", async () => {
    // Given: local version 3 and remote version 3 with same updatedAt
    const session = makeSession({
      version: 3,
      updatedAt: "2026-04-07T14:00:00Z",
    });
    const remoteSession = {
      ...session,
      version: 3,
      updatedAt: "2026-04-07T14:00:00Z", // same timestamp
    };
    const { mockUpsert } = setupSaveChain(remoteSession);

    // When: saveSessionToSupabase is called
    const result = await saveSessionToSupabase(session);

    // Then: it writes with nextVersion = 4 (simple increment, no merge)
    // This confirms single-writer model: no vector clocks, no CRDT, no multi-device merge
    expect(result).toBe(true);
    const upsertArg = mockUpsert.mock.calls[0][0];
    expect(upsertArg.data.version).toBe(4);
  });
});

describe("dualSave removal (D-13)", () => {
  it("dualSave is no longer exported from persistence", async () => {
    const mod = await import("@/lib/persistence");
    expect("dualSave" in mod).toBe(false);
  });

  it("dualLoad is no longer exported from persistence", async () => {
    const mod = await import("@/lib/persistence");
    expect("dualLoad" in mod).toBe(false);
  });
});

describe("checkSupabaseHealth", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns { reachable: true, sessionCount: 5 } on success", async () => {
    const mockSelect = vi.fn().mockResolvedValue({ count: 5, error: null });
    mockFrom.mockReturnValue({ select: mockSelect } as unknown as ReturnType<typeof mockFrom>);

    const result = await checkSupabaseHealth();

    expect(result).toEqual({ reachable: true, sessionCount: 5 });
  });

  it("returns { reachable: false, sessionCount: 0 } on error", async () => {
    const mockSelect = vi.fn().mockResolvedValue({ count: null, error: { message: "fail" } });
    mockFrom.mockReturnValue({ select: mockSelect } as unknown as ReturnType<typeof mockFrom>);

    const result = await checkSupabaseHealth();

    expect(result).toEqual({ reachable: false, sessionCount: 0 });
  });
});

describe("graceful degradation — null supabase (D-12)", () => {
  it("loadSessionFromSupabase returns null when supabase is null", async () => {
    const supabaseMod = await import("@/lib/supabase");
    const orig = supabaseMod.supabase;
    Object.defineProperty(supabaseMod, "supabase", { value: null, writable: true, configurable: true });

    const result = await loadSessionFromSupabase("some-id");
    expect(result).toBe(null);

    Object.defineProperty(supabaseMod, "supabase", { value: orig, writable: true, configurable: true });
  });

  it("deleteSessionFromSupabase returns false when supabase is null", async () => {
    const supabaseMod = await import("@/lib/supabase");
    const orig = supabaseMod.supabase;
    Object.defineProperty(supabaseMod, "supabase", { value: null, writable: true, configurable: true });

    const result = await deleteSessionFromSupabase("some-id");
    expect(result).toBe(false);

    Object.defineProperty(supabaseMod, "supabase", { value: orig, writable: true, configurable: true });
  });
});
