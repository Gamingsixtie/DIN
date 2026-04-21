import { NextRequest, NextResponse } from "next/server";
import { callClaudeWithValidation } from "@/lib/ai-client";
import { assembleSystemPrompt, extractKiBContext } from "@/lib/prompt-assembly";
import { z } from "zod";

export const maxDuration = 300;

// Phase 18 — stap 6: business-case Q&A voor dossier.kostenraming.
// Eerst genereert AI concrete business-case vragen op basis van een inspanning;
// daarna verwerkt AI de antwoorden naar een scherpe eerste raming.

const QuestionsSchema = z.object({
  questions: z
    .array(
      z.object({
        key: z.string(),
        vraag: z.string(),
        toelichting: z.string().optional().default(""),
        inputType: z.enum(["text", "number", "select"]).default("text"),
        opties: z.array(z.string()).optional().default([]),
        eenheid: z.string().optional().default(""),
      })
    )
    .min(1)
    .max(12),
});

const EstimateSchema = z.object({
  kostenraming: z.string(),
  aannames: z.array(z.string()).min(1),
  risicos: z.array(z.string()).optional().default([]),
});

const QUESTIONS_PROMPT = `Je bent een business-case expert. Genereer 4-8 scherpe vragen die helpen bij het maken van een eerste kostenraming voor één cross-sectorale inspanning binnen Cito BV (PO + VO + Zakelijk).

Input JSON:
{
  "entry": { domein, titel, beschrijving, beargumentatie, vermogenImpact },
  "focusDoel": { naam, beschrijving }
}

Output: { "questions": [{ key, vraag, toelichting, inputType, opties?, eenheid? }, ...] }

Regels:
- Vragen moeten concreet rekenmateriaal opleveren voor kostenraming.
- Denk aan: aantal medewerkers per sector, looptijd, externe inhuur, platform-licenties, implementatie-uren, trainingsdagen, locaties.
- Stem vragen af op het domein: Mens → training/uren/FTE; Data & Systemen → licentie/integratie/hardware; Processen → procesdesign-uren/workshops; Cultuur → leiderschapsprogramma/coaching-dagen.
- inputType meestal "number" voor aantallen/FTE/euro's; "select" voor kort/middel/lang; "text" alleen wanneer echt vrije invoer nodig is.
- Eenheid duidelijk (FTE, uren, €, weken, licenties).
- Keys kort en snake_case.
- Geef tenminste 4, max 8 vragen.
- Alles in Nederlands, JSON only.`;

const ESTIMATE_PROMPT = `Je bent een business-case expert. Op basis van de antwoorden op business-case vragen maak je een eerste kostenraming (dossier.kostenraming) voor één cross-sectorale inspanning.

Input JSON:
{
  "entry": { domein, titel, beschrijving },
  "questions": [{ key, vraag, eenheid }],
  "answers": { "<key>": "<antwoord>" }
}

Output JSON:
{
  "kostenraming": "<2-3 zinnen met eerste raming; gebruik €-symbool, geef orde van grootte en looptijd, benoem welk deel eenmalig en welk structureel>",
  "aannames": ["<1 zin per aanname die de raming steunt>", ...],
  "risicos": ["<optioneel: 1 zin per risico dat de raming kan veranderen>"]
}

Regels:
- Gebruik de antwoorden verschillend per domein:
  Mens: FTE × trainings-dagtarief; content-ontwikkeling eenmalig
  Data & Systemen: licentie/jaar × jaren + implementatie-uren × rate; hardware eenmalig
  Processen: proces-design-uren × rate; workshops × aantal × cost
  Cultuur: coaching-dagen × rate; externe begeleider × dagen
- Rond op significante cijfers (€75K niet €74.367).
- Benoem schaalvoordeel als aantal sectoren > 1.
- Minstens 1 aanname, 0-3 risico's.
- Nederlands, € symbool, JSON only.`;

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { mode } = body as { mode?: "questions" | "estimate" };

    const kibContext = extractKiBContext(body);

    if (mode === "questions") {
      const systemPrompt = assembleSystemPrompt(QUESTIONS_PROMPT, "cross-analyse", undefined, kibContext);
      const userMessage = JSON.stringify({ entry: body.entry, focusDoel: body.focusDoel }, null, 2);
      const result = await callClaudeWithValidation(QuestionsSchema, systemPrompt, userMessage, { maxTokens: 2048 });
      if (!result.success) {
        return NextResponse.json({ success: false, error: "Vragen genereren mislukt" }, { status: 502 });
      }
      return NextResponse.json({ success: true, data: result.data });
    }

    if (mode === "estimate") {
      const systemPrompt = assembleSystemPrompt(ESTIMATE_PROMPT, "cross-analyse", undefined, kibContext);
      const userMessage = JSON.stringify(
        {
          entry: body.entry,
          questions: body.questions,
          answers: body.answers,
        },
        null,
        2
      );
      const result = await callClaudeWithValidation(EstimateSchema, systemPrompt, userMessage, { maxTokens: 2048 });
      if (!result.success) {
        return NextResponse.json({ success: false, error: "Raming genereren mislukt" }, { status: 502 });
      }
      return NextResponse.json({ success: true, data: result.data });
    }

    return NextResponse.json(
      { success: false, error: "mode is verplicht: 'questions' of 'estimate'" },
      { status: 400 }
    );
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Onbekende fout";
    return NextResponse.json({ success: false, error: msg }, { status: 500 });
  }
}
