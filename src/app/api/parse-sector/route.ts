import { NextRequest, NextResponse } from "next/server";
import mammoth from "mammoth";
import { z } from "zod";

// Validatie schema voor de response output
const ParseSectorResponseSchema = z.object({
  id: z.string(),
  sectorName: z.string().min(1),
  rawText: z.string().min(1),
  parsedContent: z.null(),
  uploadedAt: z.string(),
});

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const file = formData.get("file") as File | null;
    const sectorName = formData.get("sectorName") as string | null;

    if (!file || !sectorName) {
      return NextResponse.json(
        { success: false, error: "Bestand en sectornaam zijn verplicht" },
        { status: 400 }
      );
    }

    let rawText: string;

    if (file.name.endsWith(".docx") || file.name.endsWith(".doc")) {
      const arrayBuffer = await file.arrayBuffer();
      const buffer = Buffer.from(arrayBuffer);
      const result = await mammoth.extractRawText({ buffer });
      rawText = result.value;
    } else {
      rawText = await file.text();
    }

    if (!rawText || rawText.trim().length === 0) {
      return NextResponse.json(
        { success: false, error: "Bestand bevat geen tekst", retryable: false },
        { status: 422 }
      );
    }

    const responseData = {
      id: crypto.randomUUID(),
      sectorName,
      rawText,
      parsedContent: null,
      uploadedAt: new Date().toISOString(),
    };

    // Valideer de response structuur
    const validation = ParseSectorResponseSchema.safeParse(responseData);
    if (!validation.success) {
      return NextResponse.json(
        { success: false, error: "Onverwachte response structuur", retryable: false },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      data: validation.data,
    });
  } catch (error) {
    return NextResponse.json(
      {
        success: false,
        error:
          error instanceof Error
            ? error.message
            : "Fout bij verwerken sectorplan",
      },
      { status: 500 }
    );
  }
}
