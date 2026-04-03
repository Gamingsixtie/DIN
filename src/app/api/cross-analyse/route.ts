import { NextRequest, NextResponse } from "next/server";
import { callClaudeWithValidation } from "@/lib/ai-client";
import { generateVerrijktSectorplan } from "@/lib/ai-client";
import { AICrossAnalyseSchema } from "@/lib/schemas";
import { CROSS_ANALYSE_PROMPT } from "@/lib/prompts";
import { assembleSystemPrompt, extractKiBContext } from "@/lib/prompt-assembly";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

    const kibContext = extractKiBContext({ goals: body.kibGoals, scope: body.kibScope });

    if (!process.env.ANTHROPIC_API_KEY) {
      return NextResponse.json({
        success: true,
        data: { analysis: null, message: "ANTHROPIC_API_KEY niet geconfigureerd." },
      });
    }

    if (body.type === "verrijkt-sectorplan") {
      // Verrijkt sectorplan: retourneert prose — geen JSON schema validatie
      const analysis = await generateVerrijktSectorplan({
        sector: body.sector || "",
        sectorPlan: body.sectorPlan || "",
        goals: body.goals || [],
        benefits: body.benefits || [],
        capabilities: body.capabilities || [],
        efforts: body.efforts || [],
        externalProjects: body.externalProjects || [],
      });

      return NextResponse.json({
        success: true,
        data: { analysis },
      });
    }

    // Default: cross-analyse over alle sectoren
    const userMessage = `Analyseer de volgende DIN-data:\n${JSON.stringify(body, null, 2).slice(0, 15000)}`;

    const result = await callClaudeWithValidation(
      AICrossAnalyseSchema,
      assembleSystemPrompt(CROSS_ANALYSE_PROMPT, "cross-analyse", undefined, kibContext),
      userMessage,
      { maxTokens: 8192, model: "claude-opus-4-6" }
    );

    if (!result.success) {
      return NextResponse.json(
        { success: false, error: result.error, retryable: true },
        { status: 422 }
      );
    }

    // Return gevalideerd object (client hoeft niet meer te parsen)
    return NextResponse.json({
      success: true,
      data: { analysis: result.data },
    });
  } catch (error) {
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : "Fout bij cross-analyse",
      },
      { status: 500 }
    );
  }
}
