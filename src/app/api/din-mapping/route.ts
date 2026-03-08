import { NextRequest, NextResponse } from "next/server";
import { generateDINMapping } from "@/lib/ai-client";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { goal, sectorPlan, sector } = body;

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

    const result = await generateDINMapping(goal, sectorPlan || null, sector || "Algemeen");

    let parsed;
    try {
      const jsonMatch = result.match(/\{[\s\S]*\}/);
      parsed = jsonMatch ? JSON.parse(jsonMatch[0]) : null;
    } catch {
      parsed = null;
    }

    return NextResponse.json({
      success: true,
      data: parsed || { benefits: [], capabilities: [], efforts: [], rawResponse: result },
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
