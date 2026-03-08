import { NextRequest, NextResponse } from "next/server";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { sessionData, format } = body;

    if (!sessionData) {
      return NextResponse.json(
        { success: false, error: "Sessiedata is verplicht" },
        { status: 400 }
      );
    }

    // TODO: Programmaplan export generatie met PROGRAMMAPLAN_PROMPT
    return NextResponse.json({
      success: true,
      data: {
        format: format || "json",
        message:
          "Export functionaliteit nog te implementeren. Gebruik PROGRAMMAPLAN_PROMPT uit lib/prompts.ts.",
      },
    });
  } catch (error) {
    return NextResponse.json(
      {
        success: false,
        error:
          error instanceof Error
            ? error.message
            : "Fout bij export generatie",
      },
      { status: 500 }
    );
  }
}
