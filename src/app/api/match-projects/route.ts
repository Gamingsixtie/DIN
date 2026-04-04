import { NextRequest, NextResponse } from "next/server";
import { matchProjectsToCapabilities } from "@/lib/ai-client";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { projects, capabilities, sectorName } = body;

    if (!projects || !capabilities || !sectorName) {
      return NextResponse.json(
        { success: false, error: "projects, capabilities en sectorName zijn verplicht" },
        { status: 400 }
      );
    }

    if (!process.env.ANTHROPIC_API_KEY) {
      return NextResponse.json({
        success: true,
        data: {
          matches: [],
          message: "ANTHROPIC_API_KEY niet geconfigureerd. AI-matching niet beschikbaar.",
        },
      });
    }

    const result = await matchProjectsToCapabilities(projects, capabilities, sectorName);

    if (!result.success) {
      return NextResponse.json(
        { success: false, error: result.error, retryable: true },
        { status: 422 }
      );
    }

    return NextResponse.json({
      success: true,
      data: { matches: result.data.matches },
    });
  } catch (error) {
    return NextResponse.json(
      {
        success: false,
        error:
          error instanceof Error
            ? error.message
            : "Fout bij AI-projectmatching",
      },
      { status: 500 }
    );
  }
}
