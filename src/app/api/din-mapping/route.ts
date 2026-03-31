import { NextRequest, NextResponse } from "next/server";
import { callClaudeWithValidation } from "@/lib/ai-client";
import { AIDINMappingResponseSchema } from "@/lib/schemas";
import { DIN_MAPPING_PROMPT } from "@/lib/prompts";
import { assembleSystemPrompt } from "@/lib/prompt-assembly";

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

    if (sectorAnalysis) {
      let analysisSummary = sectorAnalysis;
      try {
        const jsonMatch = sectorAnalysis.match(/\{[\s\S]*\}/);
        if (jsonMatch) {
          const parsed = JSON.parse(jsonMatch[0]);
          if (parsed.samenvatting) {
            const summaryParts: string[] = [];
            summaryParts.push(`Samenvatting: ${parsed.samenvatting}`);
            if (parsed.aansluiting?.punten?.length) {
              summaryParts.push(`\nAansluiting op KiB-doelen:\n${parsed.aansluiting.punten.map((p: string) => `- ${p}`).join("\n")}`);
            }
            if (parsed.baten?.punten?.length) {
              summaryParts.push(`\nVoorgestelde baten:\n${parsed.baten.punten.map((p: string) => `- ${p}`).join("\n")}`);
            }
            if (parsed.vermogens?.punten?.length) {
              summaryParts.push(`\nBenodigde vermogens:\n${parsed.vermogens.punten.map((p: string) => `- ${p}`).join("\n")}`);
            }
            if (parsed.inspanningen) {
              const domains = { mens: "Mens", processen: "Processen", data_systemen: "Data & Systemen", cultuur: "Cultuur" };
              const domainParts: string[] = [];
              for (const [key, label] of Object.entries(domains)) {
                const items = parsed.inspanningen[key];
                if (items?.length) {
                  domainParts.push(`  ${label}: ${items.map((i: string) => i).join("; ")}`);
                }
              }
              if (domainParts.length) {
                summaryParts.push(`\nVoorgestelde inspanningen:\n${domainParts.join("\n")}`);
              }
            }
            if (parsed.aandachtspunten?.punten?.length) {
              summaryParts.push(`\nAandachtspunten:\n${parsed.aandachtspunten.punten.map((p: string) => `- ${p}`).join("\n")}`);
            }
            analysisSummary = summaryParts.join("\n");
          }
        }
      } catch { /* gebruik originele string */ }
      parts.push(`\nEerdere AI-analyse van het sectorplan:\n${analysisSummary.slice(0, 3000)}`);
    }

    parts.push(`\nGenereer het DIN-netwerk voor dit doel specifiek voor sector ${sector || "Algemeen"}.`);
    parts.push(`Baseer je op het sectorplan en de analyse daarvan. Zorg dat de baten, vermogens en inspanningen concreet aansluiten bij wat in het sectorplan staat.`);
    parts.push(`\nAntwoord als JSON met de volgende structuur:
{
  "benefits": [{"title": "Kort label in vergrotende trap (max 5 woorden)", "description": "Uitgebreide toelichting (1-2 zinnen)", "profiel": {"bateneigenaar": "Rol eindverantwoordelijke", "indicator": "Meetbare KPI", "indicatorOwner": "Rol meetverantwoordelijke", "currentValue": "Startwaarde", "targetValue": "Doelwaarde"}}],
  "capabilities": [{"title": "Kort label (wat moet de org KUNNEN)", "description": "Uitgebreide toelichting (1-2 zinnen)", "currentLevel": 2, "targetLevel": 4, "profiel": {"eigenaar": "Rol verantwoordelijk voor opbouw", "huidieSituatie": "Korte as-is beschrijving", "gewensteSituatie": "Korte to-be beschrijving"}}],
  "efforts": [{"title": "Kort actielabel met werkwoorden", "description": "Uitgebreide toelichting (1-2 zinnen)", "domain": "mens|processen|data_systemen|cultuur", "quarter": "Q1 2026", "dossier": {"eigenaar": "Opdrachtgever", "inspanningsleider": "Projectleider", "verwachtResultaat": "Beoogd resultaat", "kostenraming": "Raming + marge", "randvoorwaarden": "Voorwaarden voor start"}}]
}`);

    const result = await callClaudeWithValidation(
      AIDINMappingResponseSchema,
      assembleSystemPrompt(DIN_MAPPING_PROMPT, "din-mapping"),
      parts.join("\n"),
      { maxTokens: 8192 }
    );

    if (!result.success) {
      return NextResponse.json(
        { success: false, error: result.error, retryable: true },
        { status: 422 }
      );
    }

    return NextResponse.json({
      success: true,
      data: result.data,
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
