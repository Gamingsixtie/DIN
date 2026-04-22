import { NextRequest, NextResponse } from "next/server";
import { callClaudeWithValidation } from "@/lib/ai-client";
import { PlanningVoorstelSchema } from "@/lib/schemas";
import { PLANNING_PROMPT } from "@/lib/prompts";
import { assembleSystemPrompt, extractKiBContext } from "@/lib/prompt-assembly";
import type { ProgrammeGoal, Stap4Result, SubEffortAdvies } from "@/lib/types";

export const maxDuration = 300;

type PlanningBody = {
  focusGoal: ProgrammeGoal | null;
  stap4Result?: Stap4Result;
  availableQuarters: string[];
  kibGoals?: { name: string; description: string; rank: number }[];
  kibScope?: { inScope: string[]; outScope: string[] } | null;
  userFeedback?: string;
};

function truncate(text: string, maxChars: number): string {
  if (!text) return "";
  return text.length <= maxChars ? text : text.slice(0, maxChars) + "…";
}

function makeBundelId(b: SubEffortAdvies): string {
  return `${b.groepId}:${b.domein}`;
}

function buildUserMessage(body: PlanningBody): string {
  const parts: string[] = [];

  if (body.focusGoal) {
    parts.push(
      `FOCUSDOEL: [${body.focusGoal.rank}] ${body.focusGoal.name}`,
      `Beschrijving: ${truncate(body.focusGoal.description || "", 300)}`
    );
  }

  parts.push(
    `\nAVAILABLE QUARTERS (gebruik ALLEEN deze strings voor startKwartaal en eindKwartaal):`,
    body.availableQuarters.map((q) => `- ${q}`).join("\n")
  );

  const bundels = body.stap4Result?.subEffortAnalysis ?? [];
  parts.push(`\n4 GEZAMENLIJKE CROSS-SECTORALE INSPANNINGEN (uit cross-analyse stap 6 — 1 per domein):`);
  for (const b of bundels) {
    parts.push(
      `- bundelId=${makeBundelId(b)} | domein=${b.domein} | titel="${b.titel || b.voorgesteldeNaam || "(naamloos)"}"`
    );
    if (b.beschrijving) parts.push(`  beschrijving: ${truncate(b.beschrijving, 250)}`);
    if (b.beargumentatie) parts.push(`  hefboom-logica: ${truncate(b.beargumentatie, 200)}`);
    if (b.dossier?.eigenaar) parts.push(`  eigenaar: ${b.dossier.eigenaar}`);
    if (b.dossier?.kostenraming) parts.push(`  kostenraming: ${b.dossier.kostenraming}`);
  }

  // Cito-brede domein-inzichten — kan helpen bij cyclus-volgorde
  if (body.stap4Result?.citobreedInzicht && body.stap4Result.citobreedInzicht.length > 0) {
    parts.push(`\nCITO-BREDE DOMEIN-INZICHTEN (context voor cyclus-keuze):`);
    for (const i of body.stap4Result.citobreedInzicht) {
      parts.push(`- ${i.domein}: ${i.titel} — ${truncate(i.beschrijving, 150)}`);
    }
  }

  parts.push(
    `\nOPDRACHT: Plan de 4 bundels in cycli van 6-9 maanden (2-3 kwartalen) met start- en eindkwartaal, cyclusLabel, 2-3 mijlpalen per bundel en 1 risico-regel. Respecteer de Cito-outside-in volgorde (Cultuur → Mens → Data & Systemen → Processen).`
  );

  if (body.userFeedback) {
    parts.push(`\nExtra instructies van de gebruiker: ${body.userFeedback}`);
  }

  return parts.join("\n");
}

function quarterIndex(q: string, available: string[]): number {
  return available.indexOf(q);
}

export async function POST(request: NextRequest) {
  try {
    const body = (await request.json()) as PlanningBody;

    if (!process.env.ANTHROPIC_API_KEY) {
      return NextResponse.json(
        { success: false, error: "ANTHROPIC_API_KEY niet geconfigureerd." },
        { status: 500 }
      );
    }

    const bundels = body.stap4Result?.subEffortAnalysis ?? [];
    if (bundels.length === 0) {
      return NextResponse.json(
        {
          success: false,
          error:
            "Geen gezamenlijke inspanningen gevonden — rond eerst cross-analyse stap 6 (Optimaliseren) af.",
        },
        { status: 400 }
      );
    }

    if (!body.availableQuarters || body.availableQuarters.length === 0) {
      return NextResponse.json(
        { success: false, error: "Geen kwartalen beschikbaar voor planning." },
        { status: 400 }
      );
    }

    const kibContext = extractKiBContext({
      goals: body.kibGoals,
      scope: body.kibScope ?? undefined,
    });

    const systemPrompt = assembleSystemPrompt(
      PLANNING_PROMPT,
      "cross-analyse",
      undefined,
      kibContext
    );

    const userMessage = buildUserMessage(body);

    const result = await callClaudeWithValidation(
      PlanningVoorstelSchema,
      systemPrompt,
      userMessage,
      { maxTokens: 6144, model: "claude-opus-4-7" }
    );

    if (!result.success) {
      return NextResponse.json(
        { success: false, error: result.error, retryable: true },
        { status: 422 }
      );
    }

    const validBundelIds = new Set(bundels.map((b) => makeBundelId(b)));
    const validQuarters = new Set(body.availableQuarters);

    // Post-validatie:
    //  - bundelId moet bestaan
    //  - start/eind-kwartaal moet geldig zijn
    //  - eindKwartaal moet ≥ 1 kwartaal na startKwartaal liggen (corrigeer als <)
    const cleanBundelPlanning = result.data.bundelPlanning
      .filter(
        (p) =>
          validBundelIds.has(p.bundelId) &&
          validQuarters.has(p.startKwartaal) &&
          validQuarters.has(p.eindKwartaal)
      )
      .map((p) => {
        const si = quarterIndex(p.startKwartaal, body.availableQuarters);
        const ei = quarterIndex(p.eindKwartaal, body.availableQuarters);
        if (ei <= si) {
          // Forceer minimum 2 kwartalen (6 maanden) — als AI korter plant, rek eind op
          const minEnd = Math.min(si + 2, body.availableQuarters.length - 1);
          return { ...p, eindKwartaal: body.availableQuarters[minEnd] };
        }
        return p;
      });

    return NextResponse.json({
      success: true,
      data: {
        ...result.data,
        bundelPlanning: cleanBundelPlanning,
        gegenereerdOp: new Date().toISOString(),
      },
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Onbekende fout";
    console.error("[planning] fout:", message);
    return NextResponse.json(
      { success: false, error: message },
      { status: 500 }
    );
  }
}
