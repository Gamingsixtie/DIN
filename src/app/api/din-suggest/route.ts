import { NextRequest, NextResponse } from "next/server";
import { suggestDINItem, createDINItem, recommendDomain } from "@/lib/ai-client";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { type, context, mode } = body;

    if (!type || !["baat", "vermogen", "inspanning"].includes(type)) {
      return NextResponse.json(
        { success: false, error: "Type moet 'baat', 'vermogen' of 'inspanning' zijn" },
        { status: 400 }
      );
    }

    if (!context?.sector) {
      return NextResponse.json(
        { success: false, error: "Sector is verplicht" },
        { status: 400 }
      );
    }

    if (!process.env.ANTHROPIC_API_KEY) {
      return NextResponse.json({
        success: true,
        data: {
          suggestion: null,
          message: "ANTHROPIC_API_KEY niet geconfigureerd. AI-suggesties niet beschikbaar.",
        },
      });
    }

    let raw: string;

    if (mode === "domain-recommend") {
      // Domein-aanbeveling: analyseer gap en stel domein voor
      raw = await recommendDomain(context);
    } else if (mode === "create") {
      // Geleide creatie-modus: genereer nieuw item op basis van vragenlijst
      raw = await createDINItem(type, context);
    } else {
      // Default: aanscherp-modus (bestaand item verbeteren)
      raw = await suggestDINItem(type, context);
    }

    // Parse JSON uit het antwoord
    let suggestion = null;
    try {
      // Probeer direct te parsen
      suggestion = JSON.parse(raw);
    } catch {
      // Probeer JSON uit het antwoord te extracten
      const jsonMatch = raw.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        try {
          suggestion = JSON.parse(jsonMatch[0]);
        } catch {
          // Fallback: geef raw text terug
          suggestion = { description: raw, _raw: true };
        }
      } else {
        suggestion = { description: raw, _raw: true };
      }
    }

    return NextResponse.json({
      success: true,
      data: { suggestion },
    });
  } catch (error) {
    return NextResponse.json(
      {
        success: false,
        error:
          error instanceof Error
            ? error.message
            : "Fout bij AI-suggestie genereren",
      },
      { status: 500 }
    );
  }
}
