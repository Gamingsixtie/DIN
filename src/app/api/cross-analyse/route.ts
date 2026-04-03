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
    // Build structured user message with entity IDs for reliable matching
    const goalsData = (body.goals || []).map((g: { id: string; name: string; description?: string }) => ({
      id: g.id, name: g.name, description: g.description || "",
    }));
    const benefitsData = (body.benefits || []).map((b: { id: string; goalId: string; sectorId: string; title?: string; description: string }) => ({
      id: b.id, goalId: b.goalId, sectorId: b.sectorId, title: b.title || "", description: b.description,
    }));
    const capsData = (body.capabilities || []).map((c: { id: string; sectorId: string; title?: string; description: string }) => ({
      id: c.id, sectorId: c.sectorId, title: c.title || "", description: c.description,
    }));
    const effortsData = (body.efforts || []).map((e: { id: string; sectorId: string; title?: string; description: string; domain: string }) => ({
      id: e.id, sectorId: e.sectorId, title: e.title || "", description: e.description, domain: e.domain,
    }));
    const projectsData = (body.externalProjects || []).map((p: { id: string; name: string; description: string; sectorId: string; status: string }) => ({
      id: p.id, name: p.name, description: p.description, sectorId: p.sectorId, status: p.status,
    }));

    const structuredData = {
      doelen: goalsData,
      baten: benefitsData,
      vermogens: capsData,
      inspanningen: effortsData,
      lopendeProjecten: projectsData,
      koppelingen: {
        goalBenefitMaps: body.goalBenefitMaps || [],
        benefitCapabilityMaps: body.benefitCapabilityMaps || [],
        capabilityEffortMaps: body.capabilityEffortMaps || [],
      },
    };

    let userMessage = `Analyseer de volgende DIN-data over alle sectoren heen.\nGebruik de id-velden om items te identificeren in je clusters.\n\n${JSON.stringify(structuredData, null, 2).slice(0, 20000)}`;

    if (body.userFeedback) {
      userMessage += `\n\nExtra instructies van de gebruiker: ${body.userFeedback}`;
    }

    const result = await callClaudeWithValidation(
      AICrossAnalyseSchema,
      assembleSystemPrompt(CROSS_ANALYSE_PROMPT, "cross-analyse", undefined, kibContext),
      userMessage,
      { maxTokens: 16384, model: "claude-opus-4-6" }
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
