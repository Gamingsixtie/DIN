import { NextRequest, NextResponse } from "next/server";
import { analyzeSectorPlan } from "@/lib/ai-client";

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

    const analysis = await analyzeSectorPlan(sectorName, planText, goals || []);

    return NextResponse.json({
      success: true,
      data: { analysis },
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
