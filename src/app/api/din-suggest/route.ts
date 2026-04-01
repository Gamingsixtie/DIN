import { NextRequest, NextResponse } from "next/server";
import { callClaudeWithValidation } from "@/lib/ai-client";
import {
  AISuggestBaatSchema,
  AISuggestVermogenSchema,
  AISuggestInspanningSchema,
  AIDomainRecommendSchema,
} from "@/lib/schemas";
import {
  DIN_SUGGEST_BAAT_PROMPT,
  DIN_SUGGEST_VERMOGEN_PROMPT,
  DIN_SUGGEST_INSPANNING_PROMPT,
  DIN_CREATE_BAAT_PROMPT,
  DIN_CREATE_VERMOGEN_PROMPT,
  DIN_CREATE_INSPANNING_PROMPT,
  DIN_DOMAIN_RECOMMEND_PROMPT,
} from "@/lib/prompts";
import { assembleSystemPrompt, extractKiBContext, type ProgrammaboekUseCase } from "@/lib/prompt-assembly";
import { validateBaat, validateVermogen, validateInspanning } from "@/lib/din-validation";
import type { z } from "zod";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { type, context, mode } = body;

    if (!type || !["baat", "vermogen", "inspanning"].includes(type)) {
      return NextResponse.json(
        { success: false, error: "Type moet 'baat', 'vermogen' of 'inspanning' zijn" },
        { status: 400 }
      );
    }

    if (!context?.sector) {
      return NextResponse.json(
        { success: false, error: "Sector is verplicht" },
        { status: 400 }
      );
    }

    const kibContext = extractKiBContext({ goals: body.kibGoals, scope: body.kibScope });

    if (!process.env.ANTHROPIC_API_KEY) {
      return NextResponse.json({
        success: true,
        data: {
          suggestion: null,
          message: "ANTHROPIC_API_KEY niet geconfigureerd. AI-suggesties niet beschikbaar.",
        },
      });
    }

    if (mode === "domain-recommend") {
      // Domein-aanbeveling
      const parts: string[] = [`Sector: ${context.sector}`];
      if (context.goalName) {
        parts.push(`Programmadoel: ${context.goalName}`);
        if (context.goalDescription) parts.push(`Doelbeschrijving: ${context.goalDescription}`);
      }
      if (context.benefitTitle || context.benefitDescription) {
        parts.push(`Baat: ${context.benefitTitle || context.benefitDescription}`);
        if (context.benefitIndicator) parts.push(`Indicator: ${context.benefitIndicator}`);
      }
      if (context.capabilityTitle || context.capabilityDescription) {
        parts.push(`Vermogen: ${context.capabilityTitle || context.capabilityDescription}`);
      }
      if (context.sectorPlanText) {
        parts.push(`Sectorplan (samenvatting):\n${context.sectorPlanText.slice(0, 2000)}`);
      }
      if (context.answers) {
        parts.push("\nANTWOORDEN OP VERKENNINGSVRAGEN:");
        for (const [key, value] of Object.entries(context.answers)) {
          if (typeof value === "string" && value.trim()) {
            parts.push(`${key}: ${value}`);
          }
        }
      }

      const result = await callClaudeWithValidation(
        AIDomainRecommendSchema,
        assembleSystemPrompt(DIN_DOMAIN_RECOMMEND_PROMPT, "domain-recommend", undefined, kibContext),
        parts.join("\n\n")
      );

      if (!result.success) {
        return NextResponse.json(
          { success: false, error: result.error, retryable: true },
          { status: 422 }
        );
      }

      return NextResponse.json({
        success: true,
        data: { suggestion: result.data },
      });
    }

    if (mode === "create") {
      // Geleide creatie-modus
      const promptMap = {
        baat: DIN_CREATE_BAAT_PROMPT,
        vermogen: DIN_CREATE_VERMOGEN_PROMPT,
        inspanning: DIN_CREATE_INSPANNING_PROMPT,
      };
      const schemaMap = {
        baat: AISuggestBaatSchema,
        vermogen: AISuggestVermogenSchema,
        inspanning: AISuggestInspanningSchema,
      };
      const createUseCaseMap: Record<string, ProgrammaboekUseCase> = {
        baat: "baat-create",
        vermogen: "vermogen-create",
        inspanning: "inspanning-create",
      };

      const parts: string[] = [`Sector: ${context.sector}`];

      // Domein BOVENAAN prominent plaatsen voor inspanningen
      if (context.domain && type === "inspanning") {
        parts.push(`\u26A0\uFE0F INSPANNINGSDOMEIN: ${context.domain}\nGenereer een inspanning die UITSLUITEND past binnen het domein "${context.domain}". Alle aspecten (titel, beschrijving, verwacht resultaat) moeten specifiek gericht zijn op dit domein.`);
      }

      if (context.goalName) {
        parts.push(`Programmadoel: ${context.goalName}`);
        if (context.goalDescription) parts.push(`Doelbeschrijving: ${context.goalDescription}`);
      }
      if (context.benefitTitle || context.benefitDescription) {
        parts.push(`Gerelateerde baat: ${context.benefitTitle || context.benefitDescription}`);
        if (context.benefitIndicator) parts.push(`Indicator: ${context.benefitIndicator}`);
      }
      if (context.capabilityTitle || context.capabilityDescription) {
        parts.push(`Gerelateerd vermogen: ${context.capabilityTitle || context.capabilityDescription}`);
      }
      if (context.domain && type !== "inspanning") {
        parts.push(`Domein: ${context.domain}`);
      }
      if (context.sectorPlanText) {
        parts.push(`Sectorplan (samenvatting):\n${context.sectorPlanText.slice(0, 2000)}`);
      }

      if (context.answers) {
        parts.push("\nANTWOORDEN VAN DE GEBRUIKER:");
        for (const [key, value] of Object.entries(context.answers)) {
          if (typeof value === "string" && value.trim()) {
            parts.push(`${key}: ${value}`);
          }
        }
      }

      // Domein ONDERAAN herhalen als afsluiting
      if (context.domain && type === "inspanning") {
        parts.push(`\nHERHALING: Genereer ALLEEN voor domein "${context.domain}". De titel, beschrijving en verwacht resultaat moeten uniek zijn voor dit domein en mogen NIET generiek zijn.`);
      }

      const result = await callClaudeWithValidation(
        schemaMap[type as keyof typeof schemaMap] as z.ZodType,
        assembleSystemPrompt(promptMap[type as keyof typeof promptMap], createUseCaseMap[type], undefined, kibContext),
        parts.join("\n\n")
      );

      if (!result.success) {
        return NextResponse.json(
          { success: false, error: result.error, retryable: true },
          { status: 422 }
        );
      }

      // Post-validatie op create-resultaat
      const createValidatorMap = {
        baat: validateBaat,
        vermogen: validateVermogen,
        inspanning: validateInspanning,
      };
      const createValidationResult = createValidatorMap[type as keyof typeof createValidatorMap](
        result.data as { title: string; [key: string]: unknown }
      );

      return NextResponse.json({
        success: true,
        data: {
          suggestion: createValidationResult.item,
          corrections: createValidationResult.corrections,
          warnings: createValidationResult.warnings,
        },
      });
    }

    // Default: aanscherp-modus (bestaand item verbeteren)
    const promptMap = {
      baat: DIN_SUGGEST_BAAT_PROMPT,
      vermogen: DIN_SUGGEST_VERMOGEN_PROMPT,
      inspanning: DIN_SUGGEST_INSPANNING_PROMPT,
    };
    const schemaMap = {
      baat: AISuggestBaatSchema,
      vermogen: AISuggestVermogenSchema,
      inspanning: AISuggestInspanningSchema,
    };
    const suggestUseCaseMap: Record<string, ProgrammaboekUseCase> = {
      baat: "baat-suggest",
      vermogen: "vermogen-suggest",
      inspanning: "inspanning-suggest",
    };

    const parts: string[] = [`Sector: ${context.sector}`];

    if (context.goalName) {
      parts.push(`Programmadoel: ${context.goalName}`);
      if (context.goalDescription) parts.push(`Doelbeschrijving: ${context.goalDescription}`);
    }
    if (context.sectorPlanText) {
      parts.push(`Sectorplan (samenvatting):\n${context.sectorPlanText.slice(0, 2000)}`);
    }
    if (context.existingTitle) {
      parts.push(`Bestaande titel: "${context.existingTitle}"`);
    }
    if (context.existingDescription) {
      parts.push(`Bestaande beschrijving: "${context.existingDescription}"\nVerbeter of vul aan.`);
    } else {
      parts.push("Er is nog geen beschrijving. Genereer een nieuwe suggestie.");
    }
    if (context.existingIndicator) {
      parts.push(`Huidige indicator: "${context.existingIndicator}"`);
    }
    if (context.existingOwner) {
      parts.push(`Huidige eigenaar: "${context.existingOwner}"`);
    }
    if (context.existingCurrentValue) {
      parts.push(`Huidige waarde: "${context.existingCurrentValue}"`);
    }
    if (context.existingTargetValue) {
      parts.push(`Gewenste waarde: "${context.existingTargetValue}"`);
    }
    if (context.existingMeetmethode) {
      parts.push(`Huidige meetmethode: "${context.existingMeetmethode}"`);
    }
    if (context.existingMeasurementMoment) {
      parts.push(`Huidig meetmoment: "${context.existingMeasurementMoment}"`);
    }
    // Vermogensprofiel context
    if (context.existingEigenaar) {
      parts.push(`Huidige eigenaar vermogen: "${context.existingEigenaar}"`);
    }
    if (context.existingHuidieSituatie) {
      parts.push(`Huidige situatie (as-is): "${context.existingHuidieSituatie}"`);
    }
    if (context.existingGewensteSituatie) {
      parts.push(`Gewenste situatie (to-be): "${context.existingGewensteSituatie}"`);
    }
    if (context.existingCurrentLevel) {
      parts.push(`Huidig niveau: ${context.existingCurrentLevel}/5`);
    }
    if (context.existingTargetLevel) {
      parts.push(`Gewenst niveau: ${context.existingTargetLevel}/5`);
    }
    // Inspanningsdossier context
    if (context.existingDossierEigenaar) {
      parts.push(`Huidige opdrachtgever: "${context.existingDossierEigenaar}"`);
    }
    if (context.existingQuarter) {
      parts.push(`Huidige planning: "${context.existingQuarter}"`);
    }
    if (context.existingInspanningsleider) {
      parts.push(`Huidige inspanningsleider: "${context.existingInspanningsleider}"`);
    }
    if (context.existingVerwachtResultaat) {
      parts.push(`Huidig verwacht resultaat: "${context.existingVerwachtResultaat}"`);
    }
    if (context.existingKostenraming) {
      parts.push(`Huidige kostenraming: "${context.existingKostenraming}"`);
    }
    if (context.existingRandvoorwaarden) {
      parts.push(`Huidige randvoorwaarden: "${context.existingRandvoorwaarden}"`);
    }
    if (context.userPrompt) {
      parts.push(`\nGEBRUIKERSINSTRUCTIE (prioriteit!): ${context.userPrompt}`);
    }
    if (context.relatedBenefits?.length) {
      parts.push(`Gerelateerde baten:\n${context.relatedBenefits.map((b: string, i: number) => `${i + 1}. ${b}`).join("\n")}`);
    }
    if (context.relatedCapabilities?.length) {
      parts.push(`Gerelateerde vermogens:\n${context.relatedCapabilities.map((c: string, i: number) => `${i + 1}. ${c}`).join("\n")}`);
    }
    if (context.domain) {
      parts.push(`Domein: ${context.domain}`);
    }

    const result = await callClaudeWithValidation(
      schemaMap[type as keyof typeof schemaMap] as z.ZodType,
      assembleSystemPrompt(promptMap[type as keyof typeof promptMap], suggestUseCaseMap[type], undefined, kibContext),
      parts.join("\n\n")
    );

    if (!result.success) {
      return NextResponse.json(
        { success: false, error: result.error, retryable: true },
        { status: 422 }
      );
    }

    // Post-validatie op suggest-resultaat
    const suggestValidatorMap = {
      baat: validateBaat,
      vermogen: validateVermogen,
      inspanning: validateInspanning,
    };
    const suggestValidationResult = suggestValidatorMap[type as keyof typeof suggestValidatorMap](
      result.data as { title: string; [key: string]: unknown }
    );

    return NextResponse.json({
      success: true,
      data: {
        suggestion: suggestValidationResult.item,
        corrections: suggestValidationResult.corrections,
        warnings: suggestValidationResult.warnings,
      },
    });
  } catch (error) {
    return NextResponse.json(
      {
        success: false,
        error:
          error instanceof Error
            ? error.message
            : "Fout bij AI-suggestie genereren",
      },
      { status: 500 }
    );
  }
}
