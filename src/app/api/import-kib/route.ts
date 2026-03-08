import { NextRequest, NextResponse } from "next/server";
import { importFromKiB } from "@/lib/kib-import";

export async function POST(request: NextRequest) {
  try {
    const body = await request.text();
    const result = importFromKiB(body);

    return NextResponse.json({
      success: true,
      data: result,
    });
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
