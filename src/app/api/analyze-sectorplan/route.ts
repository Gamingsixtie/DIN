import { NextRequest, NextResponse } from "next/server";
import { callClaudeWithValidation } from "@/lib/ai-client";
import { AISectorplanAnalyseSchema } from "@/lib/schemas";
import { SECTORPLAN_ANALYSE_PROMPT } from "@/lib/prompts";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { sectorName, planText, goals } = body;

    if (!sectorName || !planText) {
      return NextResponse.json(
        { success: false, error: "Sectornaam en plantekst zijn verplicht" },
        { status: 400 }
      );
    }

    if (!process.env.ANTHROPIC_API_KEY) {
      return NextResponse.json({
        success: true,
        data: {
          analysis: null,
          message: "ANTHROPIC_API_KEY niet geconfigureerd. AI-analyse niet beschikbaar.",
        },
      });
    }

    const goalsArr = goals || [];
    const goalsText = goalsArr.length > 0
      ? goalsArr.map((g: { name: string; description: string }, i: number) => `${i + 1}. ${g.name}: ${g.description}`).join("\n")
      : "Nog geen programmadoelen beschikbaar.";

    const userMessage = `Sector: ${sectorName}

Programmadoelen:
${goalsText}

Sectorplan:
${planText.slice(0, 5000)}

Analyseer dit sectorplan en geef advies voor het DIN-netwerk.`;

    const result = await callClaudeWithValidation(
      AISectorplanAnalyseSchema,
      SECTORPLAN_ANALYSE_PROMPT,
      userMessage
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
        error:
          error instanceof Error
            ? error.message
            : "Fout bij sectorplan analyse",
      },
      { status: 500 }
    );
  }
}
