import { NextRequest, NextResponse } from "next/server";

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

    const rawText = await file.text();

    // TODO: AI parsing van sectorplan
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
