import { NextRequest, NextResponse } from "next/server";
import mammoth from "mammoth";

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const file = formData.get("file") as File | null;
    const text = formData.get("text") as string | null;

    // Minimaal tekst of bestand nodig
    if (!file && (!text || text.trim().length === 0)) {
      return NextResponse.json(
        { success: false, error: "Tekst of bestand is verplicht" },
        { status: 400 }
      );
    }

    let rawText: string;

    if (file) {
      const fileName = file.name.toLowerCase();

      if (fileName.endsWith(".pdf")) {
        // Dynamische import via /lib/pdf-parse.js om de debug-test-file
        // bug van pdf-parse's index.js bij bundling te vermijden.
        const pdfParseMod = (await import(
          // @ts-expect-error - pdf-parse heeft geen types voor submodule path
          "pdf-parse/lib/pdf-parse.js"
        )) as { default: (buf: Buffer) => Promise<{ text: string }> };
        const pdfParse = pdfParseMod.default;
        const arrayBuffer = await file.arrayBuffer();
        const buffer = Buffer.from(arrayBuffer);
        const pdfData = await pdfParse(buffer);
        rawText = pdfData.text;
      } else if (fileName.endsWith(".docx") || fileName.endsWith(".doc")) {
        const arrayBuffer = await file.arrayBuffer();
        const buffer = Buffer.from(arrayBuffer);
        const result = await mammoth.extractRawText({ buffer });
        rawText = result.value;
      } else if (fileName.endsWith(".txt")) {
        rawText = await file.text();
      } else {
        return NextResponse.json(
          { success: false, error: "Ongeldig bestandstype. Gebruik .pdf, .docx, .doc of .txt" },
          { status: 400 }
        );
      }
    } else {
      // Platte tekst via text-veld
      rawText = text!;
    }

    if (!rawText || rawText.trim().length === 0) {
      return NextResponse.json(
        { success: false, error: "Bestand bevat geen tekst" },
        { status: 422 }
      );
    }

    return NextResponse.json({
      success: true,
      data: { rawText },
    });
  } catch (error) {
    return NextResponse.json(
      {
        success: false,
        error:
          error instanceof Error
            ? error.message
            : "Fout bij verwerken projectdocument",
      },
      { status: 500 }
    );
  }
}
