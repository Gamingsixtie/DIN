import { NextRequest, NextResponse } from "next/server";
import { generateProgrammaPlan } from "@/lib/ai-client";
import { z } from "zod";

// Validatie schema voor de request input
const ExportRequestSchema = z.object({
  sessionData: z.record(z.string(), z.unknown()),
});

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

    // Valideer request input met Zod
    const parseResult = ExportRequestSchema.safeParse(body);
    if (!parseResult.success) {
      const issues = parseResult.error.issues.map((i) => i.message).join(", ");
      return NextResponse.json(
        { success: false, error: `Ongeldige request: ${issues}` },
        { status: 400 }
      );
    }

    const { sessionData } = parseResult.data;

    if (!process.env.ANTHROPIC_API_KEY) {
      return NextResponse.json({
        success: true,
        data: { plan: null, message: "ANTHROPIC_API_KEY niet geconfigureerd." },
      });
    }

    // Export genereert prose (markdown) — geen JSON schema validatie op AI output
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
