import { NextRequest, NextResponse } from "next/server";
import { importFromKiB } from "@/lib/kib-import";
import { KiBExportSchema } from "@/lib/schemas";
import mammoth from "mammoth";
import Anthropic from "@anthropic-ai/sdk";

export const maxDuration = 60;

/**
 * Gebruik AI om visie, doelen en scope uit vrije tekst te extraheren.
 * Dit wordt aangeroepen wanneer een Word-document geen JSON bevat.
 */
async function extractKiBFromText(text: string) {
  const client = new Anthropic();

  const response = await client.messages.create({
    model: "claude-sonnet-4-6",
    max_tokens: 4096,
    system: `Je bent een expert in het analyseren van programmaplannen en strategische documenten.
Je taak is om uit een document de volgende onderdelen te extraheren:

1. **Visie**: De programmavisie (uitgebreid en beknopt)
2. **Doelen**: De programmadoelen/strategische doelstellingen (naam, beschrijving, rang/prioriteit)
3. **Scope**: Wat binnen en buiten scope valt

Antwoord UITSLUITEND met een JSON object in dit formaat:
{
  "visie": {
    "uitgebreid": "Volledige visietekst",
    "beknopt": "Korte samenvatting van de visie in 1-2 zinnen"
  },
  "doelen": [
    {"naam": "Doel naam", "beschrijving": "Beschrijving van het doel", "rang": 1}
  ],
  "scope": {
    "binnen": ["Item binnen scope"],
    "buiten": ["Item buiten scope"]
  }
}

Regels:
- Rangschik doelen op prioriteit (1 = hoogste)
- Als een onderdeel niet in het document staat, laat het weg uit de JSON
- Geef maximaal 10 doelen
- De beschrijving moet concreet en informatief zijn
- Gebruik de exacte bewoordingen uit het document waar mogelijk`,
    messages: [
      {
        role: "user",
        content: `Analyseer het volgende document en extraheer visie, doelen en scope:\n\n${text.slice(0, 15000)}`,
      },
    ],
  });

  const textBlock = response.content.find((b) => b.type === "text");
  if (!textBlock || textBlock.type !== "text") return null;

  // Extraheer JSON uit de response
  const raw = textBlock.text;
  const jsonMatch = raw.match(/\{[\s\S]*\}/);
  if (!jsonMatch) return null;

  try {
    const parsed = JSON.parse(jsonMatch[0]);
    return parsed;
  } catch {
    return null;
  }
}

export async function POST(request: NextRequest) {
  try {
    const contentType = request.headers.get("content-type") || "";

    let rawText: string | null = null;
    let isWordFile = false;

    if (contentType.includes("multipart/form-data")) {
      const formData = await request.formData();
      const file = formData.get("file") as File | null;

      if (!file) {
        return NextResponse.json(
          { success: false, error: "Geen bestand ontvangen" },
          { status: 400 }
        );
      }

      isWordFile = file.name.endsWith(".docx") || file.name.endsWith(".doc");

      if (isWordFile) {
        const arrayBuffer = await file.arrayBuffer();
        const buffer = Buffer.from(arrayBuffer);
        const result = await mammoth.extractRawText({ buffer });
        rawText = result.value;
      } else {
        rawText = await file.text();
      }
    } else {
      rawText = await request.text();
    }

    if (!rawText || rawText.trim().length === 0) {
      return NextResponse.json(
        { success: false, error: "Leeg bestand ontvangen" },
        { status: 400 }
      );
    }

    // Stap 1: Probeer als JSON te parsen en valideer met Zod
    try {
      const parsed = JSON.parse(rawText);
      const validation = KiBExportSchema.safeParse(parsed);

      if (!validation.success) {
        const issues = validation.error.issues.map((i) => i.message).join(", ");
        return NextResponse.json(
          { success: false, error: `Ongeldig KiB-formaat: ${issues}`, retryable: false },
          { status: 422 }
        );
      }

      const result = importFromKiB(rawText);
      return NextResponse.json({
        success: true,
        data: result,
        source: "json",
      });
    } catch {
      // Geen geldig JSON — ga door naar AI-extractie
    }

    // Stap 2: Geen JSON — gebruik AI om visie/doelen/scope te extraheren
    const aiResult = await extractKiBFromText(rawText);

    if (!aiResult) {
      return NextResponse.json(
        {
          success: false,
          error: "Kon geen visie, doelen of scope uit het document extraheren. Probeer een ander bestand.",
        },
        { status: 422 }
      );
    }

    // Valideer de AI-output met het KiB schema (soepel — velden mogen ontbreken)
    const validation = KiBExportSchema.safeParse(aiResult);
    if (validation.success) {
      const result = importFromKiB(JSON.stringify(validation.data));
      return NextResponse.json({
        success: true,
        data: result,
        source: "ai",
      });
    }

    // Fallback: handmatig mappen als het schema niet past
    const vision = aiResult.visie
      ? {
          id: crypto.randomUUID(),
          uitgebreid: aiResult.visie.uitgebreid || "",
          beknopt: aiResult.visie.beknopt || "",
        }
      : null;

    const goals = Array.isArray(aiResult.doelen)
      ? aiResult.doelen.map(
          (d: { naam?: string; beschrijving?: string; rang?: number }, i: number) => ({
            id: crypto.randomUUID(),
            name: d.naam || `Doel ${i + 1}`,
            description: d.beschrijving || "",
            rank: d.rang || i + 1,
          })
        )
      : [];

    const scope = aiResult.scope
      ? {
          id: crypto.randomUUID(),
          inScope: Array.isArray(aiResult.scope.binnen) ? aiResult.scope.binnen : [],
          outScope: Array.isArray(aiResult.scope.buiten) ? aiResult.scope.buiten : [],
        }
      : null;

    if (!vision && goals.length === 0 && !scope) {
      return NextResponse.json(
        {
          success: false,
          error: "Geen bruikbare visie, doelen of scope gevonden in het document.",
        },
        { status: 422 }
      );
    }

    return NextResponse.json({
      success: true,
      data: { vision, goals, scope },
      source: "ai",
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
