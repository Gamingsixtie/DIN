import { NextRequest, NextResponse } from "next/server";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { goal, sectorPlans } = body;

    if (!goal) {
      return NextResponse.json(
        { success: false, error: "Doel is verplicht" },
        { status: 400 }
      );
    }

    // TODO: AI DIN-mapping met DIN_MAPPING_PROMPT
    // Genereert: baten (met profielen), vermogens, inspanningen per doel
    return NextResponse.json({
      success: true,
      data: {
        goalId: goal.id,
        benefits: [],
        capabilities: [],
        efforts: [],
        message:
          "DIN-mapping AI integratie nog te implementeren. Gebruik de DIN_MAPPING_PROMPT uit lib/prompts.ts.",
      },
    });
  } catch (error) {
    return NextResponse.json(
      {
        success: false,
        error:
          error instanceof Error
            ? error.message
            : "Fout bij DIN-mapping generatie",
      },
      { status: 500 }
    );
  }
}
