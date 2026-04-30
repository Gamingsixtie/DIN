import { NextRequest, NextResponse } from "next/server";

export const maxDuration = 60;

// AI-rewrite voor een lezer-opmerking op een programmaplan-paragraaf.
// Genereert een korte (2-4 zin) herziene tekst die de opmerking adresseert.
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { scopeType, scopeLabel, commentBody } = body as {
      scopeType?: string;
      scopeLabel?: string;
      commentBody?: string;
    };

    if (!commentBody || !commentBody.trim()) {
      return NextResponse.json({ success: false, error: "Opmerking is leeg." }, { status: 400 });
    }

    if (!process.env.ANTHROPIC_API_KEY) {
      return NextResponse.json({
        success: false,
        error: "ANTHROPIC_API_KEY niet geconfigureerd.",
      });
    }

    const { default: Anthropic } = await import("@anthropic-ai/sdk");
    const client = new Anthropic();

    const locatie = scopeType === "chapter" ? "hoofdstuk" : "paragraaf";
    const prompt = `Je bent een redacteur van een Nederlands programmaplan voor Cito (educatieve organisatie). \
Het document is opgebouwd volgens "Werken aan Programma's" (Prevaas & Van Loon) — DIN-methodiek met vier \
niveaus: doelen → baten → vermogens → inspanningen, verdeeld over de domeinen cultuur, mens, data & \
systemen en processen.

Een lezer (stuurgroep, baten-eigenaar of bestuurder) heeft op het volgende ${locatie} een opmerking gemaakt:

${locatie.charAt(0).toUpperCase() + locatie.slice(1)}: ${scopeLabel || "(onbekend)"}

Opmerking van de lezer:
"""
${commentBody.trim()}
"""

Schrijf een korte herziene tekst van 2 tot 4 zinnen die deze opmerking adresseert en kan worden \
toegevoegd of de bestaande tekst kan vervangen op het genoemde ${locatie}. Houd de toon zakelijk, \
helder en in goed ABN-Nederlands. Sluit aan bij de stijl van een programmaplan voor een directie/stuurgroep. \
Vermijd jargon en uitroepen. Geef alleen de herziene tekst zelf, zonder meta-toelichting, zonder \
introducerende zinnen, zonder aanhalingstekens.`;

    const msg = await client.messages.create({
      model: "claude-sonnet-4-6",
      max_tokens: 600,
      messages: [{ role: "user", content: prompt }],
    });

    const text = msg.content
      .filter((b) => b.type === "text")
      .map((b) => ("text" in b ? b.text : ""))
      .join("")
      .trim();

    if (!text) {
      return NextResponse.json({ success: false, error: "Leeg AI-antwoord." });
    }

    return NextResponse.json({ success: true, suggestion: text });
  } catch (err) {
    console.error("[comments-rewrite] error:", err);
    return NextResponse.json(
      { success: false, error: err instanceof Error ? err.message : "Onbekende fout" },
      { status: 500 }
    );
  }
}
