import { NextRequest, NextResponse } from "next/server";
import { promoteExternalProject } from "@/lib/ai-client";
import { extractKiBContext } from "@/lib/prompt-assembly";
import type { SectorplanAnalyseResult } from "@/lib/types";
import type { CompletedGoalContext } from "@/lib/prompt-assembly";

/**
 * POST /api/promote-project
 *
 * Phase 14 — Combined-shot AI call die een lopend project promoveert tot volwaardige
 * inspanning(en) in de DIN-keten. De AI levert in één response: baat-matches,
 * vermogen-matches, 1-4 split efforts en findings.
 *
 * Body:
 *   - project: ExternalProject (verplicht)
 *   - sectorBenefits: DINBenefit[]
 *   - sectorCapabilities: DINCapability[]
 *   - sectorName: string (verplicht)
 *   - kibGoals: programmadoelen voor KiB context
 *   - kibScope: scope voor KiB context
 *   - sectorAnalysis: SectorplanAnalyseResult | null
 *   - completedGoalItems: CompletedGoalContext | undefined
 *   - priorProjectCapabilityIds: string[] (Phase 12 koppelingen als extra context)
 *
 * Responses:
 *   - 200: { success: true, data: ProjectPromotieResult }
 *   - 400: { success: false, error } als project/sectorName ontbreken
 *   - 422: { success: false, error, retryable: true } bij AI-validatiefout
 *   - 500: { success: false, error } bij onverwachte serverfout
 *   - 503: { success: false, error } bij ontbrekende ANTHROPIC_API_KEY
 */
export const maxDuration = 60;

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const {
      project,
      sectorBenefits,
      sectorCapabilities,
      sectorName,
      kibGoals,
      kibScope,
      sectorAnalysis,
      completedGoalItems,
      priorProjectCapabilityIds,
    } = body;

    if (!project || !sectorName) {
      return NextResponse.json(
        { success: false, error: "project en sectorName zijn verplicht" },
        { status: 400 }
      );
    }

    if (!process.env.ANTHROPIC_API_KEY) {
      return NextResponse.json(
        {
          success: false,
          error: "ANTHROPIC_API_KEY niet geconfigureerd. AI-promotie niet beschikbaar.",
        },
        { status: 503 }
      );
    }

    const kibContext = extractKiBContext({ goals: kibGoals, scope: kibScope });

    const result = await promoteExternalProject(
      project,
      sectorBenefits || [],
      sectorCapabilities || [],
      sectorName,
      {
        kibContext,
        sectorAnalysis: sectorAnalysis as SectorplanAnalyseResult | null,
        completedGoalItems: completedGoalItems as CompletedGoalContext | undefined,
        priorProjectCapabilityIds,
      }
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
        error:
          error instanceof Error
            ? error.message
            : "Fout bij promotie-aanroep",
      },
      { status: 500 }
    );
  }
}
