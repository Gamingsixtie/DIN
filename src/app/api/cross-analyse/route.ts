import { NextRequest, NextResponse } from "next/server";
import { generateCrossAnalyse } from "@/lib/ai-client";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

    if (!process.env.ANTHROPIC_API_KEY) {
      return NextResponse.json({
        success: true,
        data: { analysis: null, message: "ANTHROPIC_API_KEY niet geconfigureerd." },
      });
    }

    const analysis = await generateCrossAnalyse(body);

    return NextResponse.json({
      success: true,
      data: { analysis },
    });
  } catch (error) {
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : "Fout bij cross-analyse",
      },
      { status: 500 }
    );
  }
}
