import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";

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

// Import after mocking
import { saveLocal, dualSave, loadLocal } from "@/lib/persistence";

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

describe("dualSave", () => {
  beforeEach(() => {
    localStorageMock.clear();
    vi.clearAllMocks();
  });

  it("propagates boolean return from saveLocal (true on success)", async () => {
    const result = await dualSave("test-key", { value: 42 });
    expect(result).toBe(true);
  });

  it("propagates boolean return from saveLocal (false on failure)", async () => {
    localStorageMock.setItem.mockImplementationOnce(() => {
      throw new DOMException("quota exceeded", "QuotaExceededError");
    });
    const result = await dualSave("test-key", { value: 42 });
    expect(result).toBe(false);
  });
});
