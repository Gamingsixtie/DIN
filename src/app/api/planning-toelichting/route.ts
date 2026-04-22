import { NextRequest, NextResponse } from "next/server";
import Anthropic from "@anthropic-ai/sdk";
import type { BundelPlanning } from "@/lib/types";

export const maxDuration = 120;

type ToelichtingBody = {
  toelichting: string;
  bundels?: BundelPlanning[];
  mode?: "polish" | "enrich";
};

const POLISH_PROMPT = `Je bent een redacteur die programmamanagement-toelichtingen polijst.

Neem de gegeven toelichting van een programmamanager over de roadmap en verbeter:
- Nederlandse spelling en grammatica (formeel Nederlands).
- Zinsbouw — maak het bondig, zakelijk, helder.
- Structuur — als er meerdere punten zijn, gebruik korte alinea's of bullets waar logisch.
- Inhoud ONGEWIJZIGD laten — voeg geen nieuwe ideeën toe, vat alleen beter samen wat er staat.

Als context krijg je eventueel de 4 gezamenlijke cross-sectorale inspanningen en hun planning, zodat je de toelichting daaraan kunt spiegelen.

Antwoord ALLEEN met de verbeterde tekst — geen uitleg, geen markdown-wrap, geen prefix/suffix.`;

const ENRICH_PROMPT = `Je bent een programmamanagement-adviseur die toelichtingen verrijkt.

Neem de gegeven toelichting van een programmamanager over de roadmap en verrijk die:
- Behoud de kern-intentie van de schrijver.
- Voeg 1-2 relevante aanvullingen toe die voor stakeholders nuttig zijn (bijv. hoe de cycli samenhangen, welke randvoorwaarden er gelden, welke risico's op hoog niveau spelen).
- Houd het zakelijk en bondig — maximaal 4-6 zinnen of 3-5 bullets.

Als context krijg je eventueel de 4 gezamenlijke cross-sectorale inspanningen en hun planning.

Antwoord ALLEEN met de verrijkte tekst — geen uitleg, geen markdown-wrap, geen prefix/suffix.`;

export async function POST(request: NextRequest) {
  try {
    const body = (await request.json()) as ToelichtingBody;

    if (!process.env.ANTHROPIC_API_KEY) {
      return NextResponse.json(
        { success: false, error: "ANTHROPIC_API_KEY niet geconfigureerd." },
        { status: 500 }
      );
    }

    const tekst = (body.toelichting || "").trim();
    if (!tekst) {
      return NextResponse.json(
        { success: false, error: "Geen toelichting om te verbeteren." },
        { status: 400 }
      );
    }

    const mode = body.mode === "enrich" ? "enrich" : "polish";
    const systemPrompt = mode === "enrich" ? ENRICH_PROMPT : POLISH_PROMPT;

    // Context compact opbouwen
    const contextParts: string[] = [];
    if (body.bundels && body.bundels.length > 0) {
      contextParts.push("CONTEXT — de 4 gezamenlijke inspanningen uit de roadmap:");
      for (const b of body.bundels) {
        contextParts.push(
          `- ${b.domein}: "${b.titel}" (${b.cyclusLabel}, ${b.startKwartaal} → ${b.eindKwartaal})`
        );
      }
    }
    contextParts.push("\nTOELICHTING VAN DE PROGRAMMAMANAGER:");
    contextParts.push(tekst);

    const client = new Anthropic({ timeout: 90_000 });
    const response = await client.messages.create({
      model: "claude-sonnet-4-6",
      max_tokens: 1024,
      system: systemPrompt,
      messages: [{ role: "user", content: contextParts.join("\n") }],
    });

    const textBlock = response.content.find((b) => b.type === "text");
    const improved = textBlock ? textBlock.text.trim() : "";

    if (!improved) {
      return NextResponse.json(
        { success: false, error: "AI gaf een leeg antwoord." },
        { status: 422 }
      );
    }

    return NextResponse.json({
      success: true,
      data: { toelichting: improved, mode },
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Onbekende fout";
    console.error("[planning-toelichting] fout:", message);
    return NextResponse.json(
      { success: false, error: message },
      { status: 500 }
    );
  }
}
