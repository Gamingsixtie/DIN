import { NextRequest, NextResponse } from "next/server";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { benefits, capabilities, efforts, goals } = body;

    if (!goals || !benefits) {
      return NextResponse.json(
        { success: false, error: "Doelen en baten zijn verplicht" },
        { status: 400 }
      );
    }

    // TODO: AI cross-analyse met CROSS_ANALYSE_PROMPT
    return NextResponse.json({
      success: true,
      data: {
        synergies: [],
        gaps: [],
        leveragePoints: [],
        domainBalance: {
          mens: 0,
          processen: 0,
          data_systemen: 0,
          cultuur: 0,
        },
        message:
          "Cross-analyse AI integratie nog te implementeren. Gebruik CROSS_ANALYSE_PROMPT uit lib/prompts.ts.",
      },
    });
  } catch (error) {
    return NextResponse.json(
      {
        success: false,
        error:
          error instanceof Error
            ? error.message
            : "Fout bij cross-analyse",
      },
      { status: 500 }
    );
  }
}
