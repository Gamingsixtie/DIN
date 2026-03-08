import { NextRequest, NextResponse } from "next/server";
import { generateProgrammaPlan } from "@/lib/ai-client";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { sessionData } = body;

    if (!sessionData) {
      return NextResponse.json(
        { success: false, error: "Sessiedata is verplicht" },
        { status: 400 }
      );
    }

    if (!process.env.ANTHROPIC_API_KEY) {
      return NextResponse.json({
        success: true,
        data: { plan: null, message: "ANTHROPIC_API_KEY niet geconfigureerd." },
      });
    }

    const plan = await generateProgrammaPlan(sessionData);

    return NextResponse.json({
      success: true,
      data: { plan },
    });
  } catch (error) {
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : "Fout bij export generatie",
      },
      { status: 500 }
    );
  }
}
