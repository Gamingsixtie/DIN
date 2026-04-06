import { NextRequest, NextResponse } from "next/server";
import { callClaudeWithValidation } from "@/lib/ai-client";
import { AIDINMappingResponseSchema } from "@/lib/schemas";
import { DIN_MAPPING_PROMPT } from "@/lib/prompts";
import { assembleSystemPrompt, extractKiBContext, buildSectorwerkBlock, buildCompletedGoalsContext } from "@/lib/prompt-assembly";

export const maxDuration = 60;
import type { CompletedGoalContext } from "@/lib/prompt-assembly";
import type { SectorplanAnalyseResult } from "@/lib/types";
import { validateBaat, validateVermogen, validateInspanning } from "@/lib/din-validation";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { goal, sectorPlan, sector, allGoals, sectorAnalysis, kibGoals, kibScope, completedGoalItems } = body;
    const kibContext = extractKiBContext({ goals: kibGoals, scope: kibScope });

    if (!goal) {
      return NextResponse.json(
        { success: false, error: "Doel is verplicht" },
        { status: 400 }
      );
    }

    if (!process.env.ANTHROPIC_API_KEY) {
      return NextResponse.json({
        success: true,
        data: {
          benefits: [],
          capabilities: [],
          efforts: [],
          message: "ANTHROPIC_API_KEY niet geconfigureerd. Voeg items handmatig toe.",
        },
      });
    }

    // Bouw userMessage op (zelfde logica als generateDINMapping)
    const parts: string[] = [];
    parts.push(`Doel: ${goal.name}`);
    parts.push(`Beschrijving: ${goal.description}`);
    parts.push(`Sector: ${sector || "Algemeen"}`);

    if (allGoals && allGoals.length > 1) {
      parts.push("\nOverige KiB-programmadoelen (voor context):");
      allGoals
        .filter((g: { name: string }) => g.name !== goal.name)
        .forEach((g: { name: string; description?: string }, i: number) => {
          parts.push(`${i + 1}. ${g.name}${g.description ? `: ${g.description}` : ""}`);
        });
    }

    if (sectorPlan) {
      parts.push(`\nSectorplan ${sectorPlan.sectorName}:\n${sectorPlan.rawText.slice(0, 3000)}`);
    } else {
      parts.push("\nGeen sectorplan beschikbaar.");
    }

    if (sectorAnalysis && typeof sectorAnalysis === "object") {
      const sectorwerkBlock = buildSectorwerkBlock(sectorAnalysis as SectorplanAnalyseResult);
      if (sectorwerkBlock) {
        parts.push(`\nEerdere AI-analyse van het sectorplan:${sectorwerkBlock}`);
      }
    }

    parts.push(`\nGenereer het DIN-netwerk voor dit doel specifiek voor sector ${sector || "Algemeen"}.`);
    parts.push(`Baseer je op het sectorplan en de analyse daarvan. Zorg dat de baten, vermogens en inspanningen concreet aansluiten bij wat in het sectorplan staat.`);
    parts.push(`\nAntwoord als JSON met de volgende structuur:
{
  "benefits": [{"title": "Kort label in vergrotende trap (max 5 woorden)", "description": "Uitgebreide toelichting (1-2 zinnen)", "profiel": {"bateneigenaar": "Rol eindverantwoordelijke", "indicator": "Meetbare KPI", "indicatorOwner": "Rol meetverantwoordelijke", "currentValue": "Startwaarde", "targetValue": "Doelwaarde"}}],
  "capabilities": [{"title": "Kort label (wat moet de org KUNNEN)", "description": "Uitgebreide toelichting (1-2 zinnen)", "currentLevel": 2, "targetLevel": 4, "profiel": {"eigenaar": "Rol verantwoordelijk voor opbouw", "huidieSituatie": "Korte as-is beschrijving", "gewensteSituatie": "Korte to-be beschrijving"}}],
  "efforts": [{"title": "Kort actielabel met werkwoorden", "description": "Uitgebreide toelichting (1-2 zinnen)", "domain": "mens|processen|data_systemen|cultuur", "quarter": "Q1 2026", "dossier": {"eigenaar": "Opdrachtgever", "inspanningsleider": "Projectleider", "verwachtResultaat": "Beoogd resultaat", "kostenraming": "Raming + marge", "randvoorwaarden": "Voorwaarden voor start"}}]
}`);

    // System prompt: programmaboek + KiB context, dan sectorwerk-analyse (per D-06)
    let systemPrompt = assembleSystemPrompt(DIN_MAPPING_PROMPT, "din-mapping", undefined, kibContext);
    if (sectorAnalysis && typeof sectorAnalysis === "object") {
      systemPrompt += buildSectorwerkBlock(sectorAnalysis as SectorplanAnalyseResult);
    }
    // Eerder uitgewerkte doelen context (per D-08: na sectorwerk-context)
    if (completedGoalItems && Array.isArray(completedGoalItems) && completedGoalItems.length > 0) {
      systemPrompt += buildCompletedGoalsContext(completedGoalItems as CompletedGoalContext);
    }

    const result = await callClaudeWithValidation(
      AIDINMappingResponseSchema,
      systemPrompt,
      parts.join("\n"),
      { maxTokens: 8192 }
    );

    if (!result.success) {
      return NextResponse.json(
        { success: false, error: result.error, retryable: true },
        { status: 422 }
      );
    }

    // Post-validatie: methodiek-checks op AI-output
    const validated = result.data;
    const benefitResults = validated.benefits.map(b => validateBaat(b));
    const capabilityResults = validated.capabilities.map(c => validateVermogen(c));
    const effortResults = validated.efforts.map(e => validateInspanning(e));

    return NextResponse.json({
      success: true,
      data: {
        benefits: benefitResults.map(r => r.item),
        capabilities: capabilityResults.map(r => r.item),
        efforts: effortResults.map(r => r.item),
      },
      corrections: {
        benefits: benefitResults.map(r => r.corrections),
        capabilities: capabilityResults.map(r => r.corrections),
        efforts: effortResults.map(r => r.corrections),
      },
      warnings: [
        ...benefitResults.flatMap(r => r.warnings),
        ...capabilityResults.flatMap(r => r.warnings),
        ...effortResults.flatMap(r => r.warnings),
      ],
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
