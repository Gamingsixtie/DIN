import { NextRequest, NextResponse } from "next/server";
import mammoth from "mammoth";

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

    return NextResponse.json({
      success: true,
      data: {
        id: crypto.randomUUID(),
        sectorName,
        rawText,
        parsedContent: null,
        uploadedAt: new Date().toISOString(),
      },
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
