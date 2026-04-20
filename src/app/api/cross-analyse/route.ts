import { NextRequest, NextResponse } from "next/server";
import { callClaudeWithValidation } from "@/lib/ai-client";
import { generateVerrijktSectorplan } from "@/lib/ai-client";
import {
  AICrossAnalyseSchema,
  Stap1ResultSchema,
  Stap2ResultSchema,
  Stap3ResultSchema,
  Stap4ResultSchema,
  Stap5ResultSchema,
  SubEffortAdviesSchema,
} from "@/lib/schemas";
import {
  CROSS_ANALYSE_PROMPT,
  CROSS_ANALYSE_STAP1_PROMPT,
  CROSS_ANALYSE_STAP2_PROMPT,
  CROSS_ANALYSE_STAP3_PROMPT,
  CROSS_ANALYSE_STAP4_PROMPT,
  CROSS_ANALYSE_STAP5_PROMPT,
  SUB_EFFORT_ANALYSE_PROMPT,
} from "@/lib/prompts";
import { assembleSystemPrompt, extractKiBContext } from "@/lib/prompt-assembly";
import { getFocusGoal } from "@/lib/stap5-focus";
import { z } from "zod";

export const maxDuration = 300;

function getStepConfig(stap: number): { prompt: string; schema: z.ZodSchema } | undefined {
  const configs: Record<number, { prompt: string; schema: z.ZodSchema }> = {
    1: { prompt: CROSS_ANALYSE_STAP1_PROMPT, schema: Stap1ResultSchema },
    2: { prompt: CROSS_ANALYSE_STAP2_PROMPT, schema: Stap2ResultSchema },
    3: { prompt: CROSS_ANALYSE_STAP3_PROMPT, schema: Stap3ResultSchema },
    4: { prompt: CROSS_ANALYSE_STAP4_PROMPT, schema: Stap4ResultSchema },
    5: { prompt: CROSS_ANALYSE_STAP5_PROMPT, schema: Stap5ResultSchema },
  };
  return configs[stap];
}

function buildCumulativeContext(body: Record<string, unknown>): string {
  let context = "";
  if (body.stap1Result) {
    const s1 = body.stap1Result as { samenvatting?: string };
    context += `\nEERDERE ANALYSE - Stap 1 (Baten-overloop):\n${s1.samenvatting || ""}`;
  }
  if (body.stap2Result) {
    const s2 = body.stap2Result as { samenvatting?: string };
    context += `\nEERDERE ANALYSE - Stap 2 (Vermogen-clusters):\n${s2.samenvatting || ""}`;
  }
  if (body.stap3Result) {
    const s3 = body.stap3Result as { samenvatting?: string };
    context += `\nEERDERE ANALYSE - Stap 3 (Inspanning-clusters):\n${s3.samenvatting || ""}`;
  }
  if (body.stap4Result) {
    const s4 = body.stap4Result as { samenvatting?: string };
    context += `\nEERDERE ANALYSE - Stap 4 (Consolidatie-advies):\n${s4.samenvatting || ""}`;
  }
  // Cap at ~3000 chars to prevent token budget explosion
  if (context.length > 3000) {
    const truncated = context.slice(0, 3000);
    const lastSentence = truncated.lastIndexOf(".");
    context = lastSentence > 2500 ? truncated.slice(0, lastSentence + 1) : truncated;
  }
  return context;
}

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

    // Per-step wizard invocation (D-11)
    const stap = body.stap as number | undefined;
    if (stap && stap >= 1 && stap <= 5) {
      const config = getStepConfig(stap);
      if (!config) {
        return NextResponse.json(
          { success: false, error: `Ongeldige stap: ${stap}` },
          { status: 400 }
        );
      }

      // D-09 — Stap 5 versmalt payload tot focusdoel + focus-scope items
      // getFocusGoal gebruikt dezelfde expressie als client (src/lib/stap5-focus.ts)
      let payloadForPrompt: unknown = structuredData;
      if (stap === 5) {
        const rawGoals = (body.goals || []) as Array<{ id: string; name?: string; description?: string; rank?: number }>;
        const focusGoal = getFocusGoal(rawGoals);
        if (focusGoal) {
          const goalBenefitMaps = (body.goalBenefitMaps || []) as Array<{ goalId: string; benefitId: string }>;
          const benefitCapabilityMaps = (body.benefitCapabilityMaps || []) as Array<{ benefitId: string; capabilityId: string }>;
          const capabilityEffortMaps = (body.capabilityEffortMaps || []) as Array<{ capabilityId: string; effortId: string }>;

          const focusBenefitIds = new Set(
            goalBenefitMaps.filter((m) => m.goalId === focusGoal.id).map((m) => m.benefitId)
          );
          const focusBenefits = benefitsData.filter((b: { id: string }) => focusBenefitIds.has(b.id));

          const rawCaps = (body.capabilities || []) as Array<{ id: string; relatedSectors?: string[]; consolidated?: boolean }>;
          const activeCapIds = new Set(rawCaps.filter((c) => !c.consolidated).map((c) => c.id));
          const sharedCapIds = new Set(
            rawCaps
              .filter((c) => !c.consolidated && (c.relatedSectors?.length ?? 0) > 1)
              .map((c) => c.id)
          );
          const focusCapIds = new Set(
            benefitCapabilityMaps
              .filter((m) => focusBenefitIds.has(m.benefitId) && sharedCapIds.has(m.capabilityId))
              .map((m) => m.capabilityId)
          );
          const focusCaps = capsData.filter((c: { id: string }) => focusCapIds.has(c.id) && activeCapIds.has(c.id));

          const rawEfforts = (body.efforts || []) as Array<{ id: string; responsibleSector?: string; consolidated?: boolean }>;
          const activeEffortIds = new Set(rawEfforts.filter((e) => !e.consolidated).map((e) => e.id));
          const sharedEffortIds = new Set(
            rawEfforts
              .filter((e) => !e.consolidated && (e.responsibleSector?.includes(",") ?? false))
              .map((e) => e.id)
          );
          const focusEffortIds = new Set(
            capabilityEffortMaps
              .filter((m) => focusCapIds.has(m.capabilityId) && sharedEffortIds.has(m.effortId))
              .map((m) => m.effortId)
          );
          const focusEfforts = effortsData.filter((e: { id: string }) => focusEffortIds.has(e.id) && activeEffortIds.has(e.id));

          payloadForPrompt = {
            focusDoel: { id: focusGoal.id, naam: focusGoal.name ?? focusGoal.description ?? "" },
            baten: focusBenefits,
            gedeeldeVermogens: focusCaps,
            gedeeldeInspanningen: focusEfforts,
            koppelingen: {
              goalBenefitMaps: goalBenefitMaps.filter((m) => m.goalId === focusGoal.id),
              benefitCapabilityMaps: benefitCapabilityMaps.filter(
                (m) => focusBenefitIds.has(m.benefitId) && focusCapIds.has(m.capabilityId)
              ),
              capabilityEffortMaps: capabilityEffortMaps.filter(
                (m) => focusCapIds.has(m.capabilityId) && focusEffortIds.has(m.effortId)
              ),
            },
          };
        }
      }

      const cumulativeContext = buildCumulativeContext(body);
      let userMessage = `Analyseer de volgende DIN-data over alle sectoren heen.\nGebruik de id-velden om items te identificeren in je clusters.\n\n${JSON.stringify(payloadForPrompt, null, 2).slice(0, 20000)}`;
      if (cumulativeContext) {
        userMessage += `\n\n${cumulativeContext}`;
      }
      if (body.userFeedback) {
        userMessage += `\n\nExtra instructies van de gebruiker: ${body.userFeedback}`;
      }

      const result = await callClaudeWithValidation(
        config.schema,
        assembleSystemPrompt(config.prompt, "cross-analyse", undefined, kibContext),
        userMessage,
        { maxTokens: 16384, model: "claude-opus-4-7" }
      );

      if (!result.success) {
        return NextResponse.json(
          { success: false, error: result.error, retryable: true },
          { status: 422 }
        );
      }

      // --- D-10/D-11 (Phase 17): sub-effort analyse per VermogenGelijkenisGroep (alleen stap 4) ---
      // Voor elke drieluik-groep uit stap 2 roepen we parallel SUB_EFFORT_ANALYSE_PROMPT aan.
      // Groepen zonder gekoppelde efforts worden geskipt (D-13: geen verspilde tokens).
      let subEffortAnalysisFlat: Array<z.infer<typeof SubEffortAdviesSchema>> = [];

      if (stap === 4) {
        const groepen =
          (body.stap2Result as {
            vermogenGelijkenisGroepen?: Array<{
              id: string;
              vermogenIds: string[];
              gezamenlijkeOmschrijving: string;
              reden: string;
            }>;
          } | undefined)?.vermogenGelijkenisGroepen ?? [];

        const capEffortMapsLocal = (body.capabilityEffortMaps ?? []) as Array<{
          capabilityId: string;
          effortId: string;
        }>;

        // --- Phase 18 (R-CROSS-03): focus-doel als leidraad + profiel-context per vermogen ---
        const rawGoals = (body.goals || []) as Array<{
          id: string;
          name?: string;
          description?: string;
          rank?: number;
        }>;
        const focusGoal = getFocusGoal(rawGoals);
        // Fallback op name wanneer description leeg is (R5 decision — zie Plan 18-04 frontmatter).
        // KiB-imports leveren altijd name, niet altijd description; terugvallen op name houdt inkleuring werkzaam.
        const focusDoelContext = focusGoal
          ? {
              id: focusGoal.id,
              naam: focusGoal.name ?? "",
              beschrijving:
                (focusGoal.description && focusGoal.description.trim().length > 0)
                  ? focusGoal.description
                  : (focusGoal.name ?? ""),
            }
          : null;

        const rawCaps = (body.capabilities || []) as Array<{
          id: string;
          profiel?: {
            huidieSituatie?: string;
            gewensteSituatie?: string;
          };
        }>;

        const subAnalyses = await Promise.all(
          groepen.map(async (groep) => {
            const capIdSet = new Set(groep.vermogenIds);
            const groepVermogens = capsData.filter((c: { id: string }) => capIdSet.has(c.id));
            const groepEffortIdSet = new Set(
              capEffortMapsLocal
                .filter((m) => capIdSet.has(m.capabilityId))
                .map((m) => m.effortId)
            );
            const groepEfforts = effortsData.filter((e: { id: string }) =>
              groepEffortIdSet.has(e.id)
            );

            if (groepEfforts.length === 0) {
              // D-13: skip AI-call — geen gekoppelde efforts
              return [];
            }

            const subSystemPrompt = assembleSystemPrompt(
              SUB_EFFORT_ANALYSE_PROMPT,
              "cross-analyse",
              undefined,
              kibContext
            );

            // Phase 18: verrijk groepVermogens met profielHuidig/Gewenst voor sector-verankering in AI-output
            const groepVermogensRich = groepVermogens.map(
              (v: { id: string; sectorId: string; title: string; description: string }) => {
                const raw = rawCaps.find((r) => r.id === v.id);
                return {
                  ...v,
                  profielHuidig: raw?.profiel?.huidieSituatie ?? "",
                  profielGewenst: raw?.profiel?.gewensteSituatie ?? "",
                };
              }
            );

            const subUserMessage = JSON.stringify(
              {
                focusDoel: focusDoelContext,        // Phase 18: leidraad voor inkleuring
                groep,
                vermogens: groepVermogensRich,       // Phase 18: verrijkt met profiel-velden
                efforts: groepEfforts,
              },
              null,
              2
            );

            const subResult = await callClaudeWithValidation(
              z.array(SubEffortAdviesSchema),
              subSystemPrompt,
              subUserMessage,
              { maxTokens: 8192 }  // Phase 18: rijke response met 5 extra velden + dossier
            );

            let entries = subResult.success ? subResult.data : [];

            // Phase 18: garandeer 4 entries per groep (mens/processen/data_systemen/cultuur).
            // Als AI een of meer domeinen oversloeg: gerichte retry alleen voor die domeinen.
            const ALL_DOMAINS = ["mens", "processen", "data_systemen", "cultuur"] as const;
            const present = new Set(entries.map((e) => e.domein));
            const missing = ALL_DOMAINS.filter((d) => !present.has(d));

            if (missing.length > 0 && subResult.success) {
              const retryMessage = JSON.stringify(
                {
                  focusDoel: focusDoelContext,
                  groep,
                  vermogens: groepVermogensRich,
                  efforts: groepEfforts,
                  _retry_instructie: `Je vorige response miste de volgende domeinen: ${missing.join(", ")}. Lever ALLEEN voor deze ontbrekende domeinen nieuwe SubEffortAdvies entries (${missing.length} stuk(s)), met actie "combineren", volledige Phase 18-velden en vermogenImpact voor alle 3 sectoren uit groep.vermogenIds. Als voor een domein geen efforts in input staan: zet items: [] en leid de inspanning af uit focusDoel.beschrijving + alle drie vermogen-profielen.`,
                  _reeds_aanwezig: Array.from(present),
                },
                null,
                2
              );
              const retryResult = await callClaudeWithValidation(
                z.array(SubEffortAdviesSchema),
                subSystemPrompt,
                retryMessage,
                { maxTokens: 8192 }
              );
              if (retryResult.success && retryResult.data.length > 0) {
                entries = [
                  ...entries,
                  ...retryResult.data.filter((e) => missing.includes(e.domein as typeof ALL_DOMAINS[number])),
                ];
              }
            }

            return entries;
          })
        );

        subEffortAnalysisFlat = subAnalyses.flat();
      }

      return NextResponse.json({
        success: true,
        data: {
          analysis:
            stap === 4
              ? { ...(result.data as object), subEffortAnalysis: subEffortAnalysisFlat }
              : result.data,
          stap,
        },
      });
    }

    // Default: full cross-analyse over alle sectoren (backward compat)
    let userMessage = `Analyseer de volgende DIN-data over alle sectoren heen.\nGebruik de id-velden om items te identificeren in je clusters.\n\n${JSON.stringify(structuredData, null, 2).slice(0, 20000)}`;

    if (body.userFeedback) {
      userMessage += `\n\nExtra instructies van de gebruiker: ${body.userFeedback}`;
    }

    const result = await callClaudeWithValidation(
      AICrossAnalyseSchema,
      assembleSystemPrompt(CROSS_ANALYSE_PROMPT, "cross-analyse", undefined, kibContext),
      userMessage,
      { maxTokens: 16384, model: "claude-opus-4-7" }
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
