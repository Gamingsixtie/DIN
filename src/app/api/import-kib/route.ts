import { NextRequest, NextResponse } from "next/server";
import { importFromKiB } from "@/lib/kib-import";
import mammoth from "mammoth";

export async function POST(request: NextRequest) {
  try {
    const contentType = request.headers.get("content-type") || "";

    let jsonText: string;

    if (contentType.includes("multipart/form-data")) {
      const formData = await request.formData();
      const file = formData.get("file") as File | null;

      if (!file) {
        return NextResponse.json(
          { success: false, error: "Geen bestand ontvangen" },
          { status: 400 }
        );
      }

      if (file.name.endsWith(".docx") || file.name.endsWith(".doc")) {
        const arrayBuffer = await file.arrayBuffer();
        const buffer = Buffer.from(arrayBuffer);
        const result = await mammoth.extractRawText({ buffer });
        jsonText = result.value;
      } else {
        jsonText = await file.text();
      }
    } else {
      jsonText = await request.text();
    }

    // Probeer als JSON te parsen
    try {
      const result = importFromKiB(jsonText);
      return NextResponse.json({
        success: true,
        data: result,
      });
    } catch {
      // Als JSON parsing faalt, stuur de ruwe tekst terug voor handmatige verwerking
      return NextResponse.json({
        success: true,
        data: {
          rawText: jsonText,
          vision: null,
          goals: [],
          scope: null,
        },
      });
    }
  } catch (error) {
    return NextResponse.json(
      {
        success: false,
        error:
          error instanceof Error
            ? error.message
            : "Onbekende fout bij KiB import",
      },
      { status: 400 }
    );
  }
}
