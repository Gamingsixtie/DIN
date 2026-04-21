import { NextRequest, NextResponse } from "next/server";
import { callClaudeWithValidation } from "@/lib/ai-client";
import { PlanningVoorstelSchema } from "@/lib/schemas";
import { PLANNING_PROMPT } from "@/lib/prompts";
import { assembleSystemPrompt, extractKiBContext } from "@/lib/prompt-assembly";
import type {
  DINEffort,
  ProgrammeGoal,
  Stap4Result,
  Stap5Result,
} from "@/lib/types";

export const maxDuration = 300;

type PlanningBody = {
  focusGoal: ProgrammeGoal | null;
  efforts: DINEffort[];
  stap4Result?: Stap4Result;
  stap5Result?: Stap5Result;
  availableQuarters: string[];
  kibGoals?: { name: string; description: string; rank: number }[];
  kibScope?: { inScope: string[]; outScope: string[] } | null;
  userFeedback?: string;
};

function truncate(text: string, maxChars: number): string {
  if (!text) return "";
  return text.length <= maxChars ? text : text.slice(0, maxChars) + "…";
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
    `\nAVAILABLE QUARTERS (gebruik ALLEEN deze strings voor voorgesteldKwartaal):`,
    body.availableQuarters.map((q) => `- ${q}`).join("\n")
  );

  // Inspanningen compact
  parts.push(`\nINSPANNINGEN (${body.efforts.length}):`);
  for (const e of body.efforts) {
    const dossierBits: string[] = [];
    if (e.dossier?.eigenaar) dossierBits.push(`eigenaar: ${e.dossier.eigenaar}`);
    if (e.dossier?.inspanningsleider) dossierBits.push(`leider: ${e.dossier.inspanningsleider}`);
    if (e.dossier?.kostenraming) dossierBits.push(`kosten: ${e.dossier.kostenraming}`);
    const dossier = dossierBits.length > 0 ? ` [${dossierBits.join(" | ")}]` : "";
    parts.push(
      `- id=${e.id} | sector=${e.sectorId} | domein=${e.domain} | "${e.title || e.description}"${dossier}`
    );
  }

  // Cross-analyse stap 4 — subEffortAnalysis (de geconsolideerde bundels)
  if (body.stap4Result?.subEffortAnalysis && body.stap4Result.subEffortAnalysis.length > 0) {
    parts.push(`\nCROSS-ANALYSE STAP 6 — GECONSOLIDEERDE CROSS-SECTORALE INSPANNINGEN (${body.stap4Result.subEffortAnalysis.length}):`);
    for (const s of body.stap4Result.subEffortAnalysis) {
      parts.push(
        `- groep=${s.groepId} | domein=${s.domein} | actie=${s.actie} | titel="${s.titel || s.voorgesteldeNaam || "(naamloos)"}"`
      );
      if (s.beschrijving) parts.push(`  beschrijving: ${truncate(s.beschrijving, 200)}`);
      if (s.beargumentatie) parts.push(`  hefboom: ${truncate(s.beargumentatie, 200)}`);
      if (s.items && s.items.length > 0) parts.push(`  effort-ids: ${s.items.join(", ")}`);
    }
  }

  // Cross-analyse stap 4 — citobreedInzicht (4 domeinen, strategisch)
  if (body.stap4Result?.citobreedInzicht && body.stap4Result.citobreedInzicht.length > 0) {
    parts.push(`\nCITO-BREDE DOMEIN-INZICHTEN:`);
    for (const i of body.stap4Result.citobreedInzicht) {
      parts.push(`- ${i.domein}: ${i.titel} — ${truncate(i.beschrijving, 150)}`);
    }
  }

  // Cross-analyse stap 5 — prioriteitsview voor focusdoel
  if (body.stap5Result) {
    if (body.stap5Result.inspanningReview && body.stap5Result.inspanningReview.length > 0) {
      parts.push(`\nBREEDTE-OORDEEL INSPANNINGEN (uit stap 7 prioriteitsview — gebruik voor fasering):`);
      for (const r of body.stap5Result.inspanningReview) {
        parts.push(
          `- effort=${r.inspanningId} | breedte=${r.breedteOordeel} | ${truncate(r.toelichting, 150)}`
        );
      }
    }
    if (body.stap5Result.batenDekking && body.stap5Result.batenDekking.length > 0) {
      const geraakt = body.stap5Result.batenDekking.filter((b) => b.wordtGeraakt).length;
      const total = body.stap5Result.batenDekking.length;
      parts.push(`\nBATEN-DEKKING FOCUSDOEL: ${geraakt}/${total} baten worden geraakt.`);
      const niet = body.stap5Result.batenDekking.filter((b) => !b.wordtGeraakt);
      if (niet.length > 0) {
        parts.push(`Niet-gedekte baten (overweeg dit bij volgorde):`);
        for (const b of niet.slice(0, 5)) {
          parts.push(`- baat=${b.baatId} (${b.sector}): ${truncate(b.risico || b.redenering, 120)}`);
        }
      }
    }
  }

  parts.push(
    `\nOPDRACHT: Stel een kwartaalplanning voor elke inspanning voor EN geef per cross-sectorale bundel een fasering met mijlpalen over 2-3 periodes. Respecteer de plannings-principes uit het systemprompt.`
  );

  if (body.userFeedback) {
    parts.push(`\nExtra instructies van de gebruiker: ${body.userFeedback}`);
  }

  return parts.join("\n");
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

    if (!body.efforts || body.efforts.length === 0) {
      return NextResponse.json(
        { success: false, error: "Geen inspanningen om te plannen." },
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

    // Use "cross-analyse" usecase — planning bouwt rechtstreeks voort op cross-analyse output
    // en krijgt daarmee dezelfde programmaboek-context + Cito-strategisch fundament mee.
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
      { maxTokens: 8192, model: "claude-opus-4-7" }
    );

    if (!result.success) {
      return NextResponse.json(
        { success: false, error: result.error, retryable: true },
        { status: 422 }
      );
    }

    // Post-validatie: gooi entries weg die verwijzen naar onbekende effort-ids
    // of kwartalen buiten availableQuarters (AI kan hallucineren).
    const validEffortIds = new Set(body.efforts.map((e) => e.id));
    const validQuarters = new Set(body.availableQuarters);

    const cleanInspanningPlanning = result.data.inspanningPlanning.filter(
      (p) => validEffortIds.has(p.inspanningId) && validQuarters.has(p.voorgesteldKwartaal)
    );

    return NextResponse.json({
      success: true,
      data: {
        ...result.data,
        inspanningPlanning: cleanInspanningPlanning,
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
