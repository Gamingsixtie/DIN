import { describe, test, expect, vi, beforeEach } from "vitest";
import { z } from "zod";
import { extractJSON, parseAIResponse } from "@/lib/ai-client";

// Schema voor tests
const TestSchema = z.object({
  benefits: z.array(z.object({ title: z.string() })).optional().default([]),
  capabilities: z.array(z.object({ title: z.string() })).optional().default([]),
  efforts: z.array(z.object({ title: z.string() })).optional().default([]),
});

// ============================================================
// extractJSON tests
// ============================================================

describe("extractJSON", () => {
  test("puur JSON object -> retourneert JSON string", () => {
    const result = extractJSON('{"key":"value"}');
    expect(result).toBe('{"key":"value"}');
  });

  test("markdown code block met json tag -> retourneert JSON string", () => {
    const result = extractJSON('```json\n{"key":"value"}\n```');
    expect(result).toBe('{"key":"value"}');
  });

  test("tekst rondom JSON -> extraheert JSON object", () => {
    const result = extractJSON('Hier is het antwoord:\n{"key":"value"}\nKlaar.');
    expect(result).toBe('{"key":"value"}');
  });

  test("geen JSON aanwezig -> retourneert null", () => {
    const result = extractJSON("geen json hier");
    expect(result).toBeNull();
  });

  test("lege string -> retourneert null", () => {
    const result = extractJSON("");
    expect(result).toBeNull();
  });

  test("markdown code block zonder json tag -> retourneert JSON string", () => {
    const result = extractJSON('```\n{"nested":{"a":1}}\n```');
    expect(result).toBe('{"nested":{"a":1}}');
  });
});

// ============================================================
// parseAIResponse tests
// ============================================================

describe("parseAIResponse", () => {
  test("valide JSON met correcte structuur -> success: true", () => {
    const input = '{"benefits":[],"capabilities":[],"efforts":[]}';
    const result = parseAIResponse(input, TestSchema);
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data).toEqual({
        benefits: [],
        capabilities: [],
        efforts: [],
      });
    }
  });

  test("geen JSON in tekst -> success: false met 'Geen geldig JSON'", () => {
    const result = parseAIResponse("geen json", TestSchema);
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error).toContain("Geen geldig JSON");
      expect(result.retryable).toBe(true);
    }
  });

  test("onverwachte structuur -> success: false met 'Onverwachte AI-structuur'", () => {
    const StrictSchema = z.object({
      requiredField: z.string(),
    });
    const result = parseAIResponse('{"invalid": true}', StrictSchema);
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error).toContain("Onverwachte AI-structuur");
      expect(result.retryable).toBe(true);
    }
  });

  test("markdown-wrapped JSON -> success: true", () => {
    const input = '```json\n{"benefits":[],"capabilities":[],"efforts":[]}\n```';
    const result = parseAIResponse(input, TestSchema);
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data).toEqual({
        benefits: [],
        capabilities: [],
        efforts: [],
      });
    }
  });
});

// ============================================================
// callClaudeWithValidation tests (met gemockte Anthropic SDK)
// ============================================================

const mockCreate = vi.fn();

vi.mock("@anthropic-ai/sdk", () => {
  return {
    default: class MockAnthropic {
      messages = { create: mockCreate };
    },
  };
});

describe("callClaudeWithValidation", () => {
  beforeEach(() => {
    mockCreate.mockReset();
  });

  test("eerste poging valide JSON -> retourneert success zonder retry", async () => {
    const { callClaudeWithValidation } = await import("@/lib/ai-client");

    mockCreate.mockResolvedValueOnce({
      content: [{ type: "text", text: '{"benefits":[],"capabilities":[],"efforts":[]}' }],
    });

    const result = await callClaudeWithValidation(
      TestSchema,
      "system prompt",
      "user message"
    );

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data).toEqual({
        benefits: [],
        capabilities: [],
        efforts: [],
      });
    }
    expect(mockCreate).toHaveBeenCalledTimes(1);
  });

  test("eerste 2 pogingen ongeldig, 3e geldig -> retourneert success na 2 retries", async () => {
    const { callClaudeWithValidation } = await import("@/lib/ai-client");

    mockCreate
      .mockResolvedValueOnce({
        content: [{ type: "text", text: "geen json" }],
      })
      .mockResolvedValueOnce({
        content: [{ type: "text", text: "nog steeds geen json" }],
      })
      .mockResolvedValueOnce({
        content: [{ type: "text", text: '{"benefits":[],"capabilities":[],"efforts":[]}' }],
      });

    const result = await callClaudeWithValidation(
      TestSchema,
      "system prompt",
      "user message"
    );

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data).toEqual({
        benefits: [],
        capabilities: [],
        efforts: [],
      });
    }
    expect(mockCreate).toHaveBeenCalledTimes(3);
  });

  test("alle 3 pogingen ongeldig -> retourneert failure", async () => {
    const { callClaudeWithValidation } = await import("@/lib/ai-client");

    mockCreate
      .mockResolvedValueOnce({
        content: [{ type: "text", text: "geen json 1" }],
      })
      .mockResolvedValueOnce({
        content: [{ type: "text", text: "geen json 2" }],
      })
      .mockResolvedValueOnce({
        content: [{ type: "text", text: "geen json 3" }],
      });

    const result = await callClaudeWithValidation(
      TestSchema,
      "system prompt",
      "user message"
    );

    expect(result.success).toBe(false);
  });

  test("callClaude wordt maximaal 3 keer aangeroepen (1 + 2 retries)", async () => {
    const { callClaudeWithValidation } = await import("@/lib/ai-client");

    mockCreate
      .mockResolvedValueOnce({
        content: [{ type: "text", text: "fail 1" }],
      })
      .mockResolvedValueOnce({
        content: [{ type: "text", text: "fail 2" }],
      })
      .mockResolvedValueOnce({
        content: [{ type: "text", text: "fail 3" }],
      })
      .mockResolvedValueOnce({
        content: [{ type: "text", text: '{"benefits":[],"capabilities":[],"efforts":[]}' }],
      });

    await callClaudeWithValidation(TestSchema, "system prompt", "user message");

    // Mag maximaal 3 keer aangeroepen worden (1 + 2 retries)
    expect(mockCreate).toHaveBeenCalledTimes(3);
  });
});
