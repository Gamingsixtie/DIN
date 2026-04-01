import { NextRequest, NextResponse } from "next/server";
import { callClaudeWithValidation } from "@/lib/ai-client";
import { generateVerrijktSectorplan } from "@/lib/ai-client";
import { AICrossAnalyseSchema, AIIntegratieAdviesSchema } from "@/lib/schemas";
import { CROSS_ANALYSE_PROMPT, SECTOR_INTEGRATIE_PROMPT } from "@/lib/prompts";
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
        integratieAdvies: body.integratieAdvies || "",
        externalProjects: body.externalProjects || [],
      });

      return NextResponse.json({
        success: true,
        data: { analysis },
      });
    }

    if (body.type === "sector-integratie") {
      // Sector integratie: gebruik AIIntegratieAdviesSchema
      const domainLabels: Record<string, string> = {
        mens: "Mens",
        processen: "Processen",
        data_systemen: "Data & Systemen",
        cultuur: "Cultuur",
      };

      const parts: string[] = [];
      parts.push(`=== Sector: ${body.sector || ""} ===`);

      parts.push("\n--- KiB Programmadoelen ---");
      const goals = body.goals || [];
      if (goals.length > 0) {
        goals.forEach((g: { name: string; description?: string }, i: number) => {
          parts.push(`${i + 1}. ${g.name}${g.description ? `: ${g.description}` : ""}`);
        });
      } else {
        parts.push("Nog geen doelen beschikbaar.");
      }

      parts.push("\n--- Sectorplan ---");
      const sectorPlan = body.sectorPlan || "";
      if (sectorPlan && sectorPlan.trim().length > 0 && !sectorPlan.startsWith("[")) {
        parts.push(sectorPlan.slice(0, 4000));
      } else {
        parts.push("Geen sectorplan beschikbaar.");
      }

      parts.push("\n--- Huidige DIN-baten voor deze sector ---");
      const benefits = body.benefits || [];
      if (benefits.length > 0) {
        benefits.forEach((b: { description: string; profiel?: { indicator?: string; targetValue?: string } }, i: number) => {
          let line = `${i + 1}. ${b.description}`;
          if (b.profiel?.indicator) line += ` (indicator: ${b.profiel.indicator}, doel: ${b.profiel.targetValue || "?"})`;
          parts.push(line);
        });
      } else {
        parts.push("Nog geen baten ingevuld.");
      }

      parts.push("\n--- Huidige DIN-vermogens voor deze sector ---");
      const capabilities = body.capabilities || [];
      if (capabilities.length > 0) {
        capabilities.forEach((c: { description: string; currentLevel?: number; targetLevel?: number }, i: number) => {
          let line = `${i + 1}. ${c.description}`;
          if (c.currentLevel && c.targetLevel) line += ` (niveau: ${c.currentLevel}/5 \u2192 ${c.targetLevel}/5)`;
          parts.push(line);
        });
      } else {
        parts.push("Nog geen vermogens ingevuld.");
      }

      parts.push("\n--- Huidige DIN-inspanningen voor deze sector ---");
      const efforts = body.efforts || [];
      if (efforts.length > 0) {
        const byDomain: Record<string, { description: string; quarter?: string; status?: string; domain: string }[]> = {};
        efforts.forEach((e: { description: string; domain: string; quarter?: string; status?: string }) => {
          const domain = domainLabels[e.domain] || e.domain;
          if (!byDomain[domain]) byDomain[domain] = [];
          byDomain[domain].push(e);
        });
        Object.entries(byDomain).forEach(([domain, effortItems]) => {
          parts.push(`  ${domain}:`);
          effortItems.forEach((e) => {
            let line = `    - ${e.description}`;
            if (e.quarter) line += ` (${e.quarter})`;
            if (e.status && e.status !== "gepland") line += ` [${e.status}]`;
            parts.push(line);
          });
        });
      } else {
        parts.push("Nog geen inspanningen ingevuld.");
      }

      if (body.sectorAnalysis) {
        parts.push("\n--- Eerdere AI-analyse van het sectorplan ---");
        let analysisSummary = body.sectorAnalysis;
        try {
          const jsonMatch = body.sectorAnalysis.match(/\{[\s\S]*\}/);
          if (jsonMatch) {
            const parsed = JSON.parse(jsonMatch[0]);
            if (parsed.samenvatting) {
              const summaryParts: string[] = [];
              summaryParts.push(`Samenvatting: ${parsed.samenvatting}`);
              if (parsed.aansluiting?.punten?.length) {
                summaryParts.push(`Aansluiting op KiB-doelen:\n${parsed.aansluiting.punten.map((p: string) => `- ${p}`).join("\n")}`);
              }
              if (parsed.baten?.punten?.length) {
                summaryParts.push(`Voorgestelde baten:\n${parsed.baten.punten.map((p: string) => `- ${p}`).join("\n")}`);
              }
              if (parsed.vermogens?.punten?.length) {
                summaryParts.push(`Benodigde vermogens:\n${parsed.vermogens.punten.map((p: string) => `- ${p}`).join("\n")}`);
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
                  summaryParts.push(`Voorgestelde inspanningen:\n${domainParts.join("\n")}`);
                }
              }
              if (parsed.aandachtspunten?.punten?.length) {
                summaryParts.push(`Aandachtspunten:\n${parsed.aandachtspunten.punten.map((p: string) => `- ${p}`).join("\n")}`);
              }
              analysisSummary = summaryParts.join("\n\n");
            }
          }
        } catch { /* gebruik originele string */ }
        parts.push(analysisSummary.slice(0, 3000));
      }

      const externalProjects = body.externalProjects || [];
      parts.push("\n--- Lopende projecten passend bij KiB ---");
      if (externalProjects.length > 0) {
        externalProjects.forEach((p: { name: string; description?: string; status: string; relevance?: string }, i: number) => {
          let line = `${i + 1}. ${p.name}`;
          if (p.description) line += `: ${p.description}`;
          line += ` [${p.status}]`;
          if (p.relevance) line += ` \u2014 Relevantie: ${p.relevance}`;
          parts.push(line);
        });
      } else {
        parts.push("Geen externe projecten geregistreerd.");
      }

      parts.push("\nGeef concreet integratie-advies voor deze sector. Verwijs naar specifieke items hierboven, inclusief externe projecten waar relevant.");

      const result = await callClaudeWithValidation(
        AIIntegratieAdviesSchema,
        assembleSystemPrompt(SECTOR_INTEGRATIE_PROMPT, "cross-analyse", undefined, kibContext),
        parts.join("\n")
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
