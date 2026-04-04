import { NextRequest, NextResponse } from "next/server";
import { extractProjectsFromText } from "@/lib/ai-client";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { rawText, sectorName } = body;

    if (!rawText || !sectorName) {
      return NextResponse.json(
        { success: false, error: "rawText en sectorName zijn verplicht" },
        { status: 400 }
      );
    }

    if (!process.env.ANTHROPIC_API_KEY) {
      return NextResponse.json({
        success: true,
        data: {
          projects: [],
          message: "ANTHROPIC_API_KEY niet geconfigureerd. AI-extractie niet beschikbaar.",
        },
      });
    }

    const result = await extractProjectsFromText(rawText, sectorName);

    if (!result.success) {
      return NextResponse.json(
        { success: false, error: result.error, retryable: true },
        { status: 422 }
      );
    }

    return NextResponse.json({
      success: true,
      data: { projects: result.data.projects },
    });
  } catch (error) {
    return NextResponse.json(
      {
        success: false,
        error:
          error instanceof Error
            ? error.message
            : "Fout bij AI-projectextractie",
      },
      { status: 500 }
    );
  }
}
