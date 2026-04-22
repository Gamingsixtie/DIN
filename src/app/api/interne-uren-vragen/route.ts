import { NextRequest, NextResponse } from "next/server";
import { callClaudeWithValidation } from "@/lib/ai-client";
import { assembleSystemPrompt, extractKiBContext } from "@/lib/prompt-assembly";
import { z } from "zod";

export const maxDuration = 120;

// Stap 7 — fase 2: AI stelt per inspanning gerichte vragen om realistische
// uren-schattingen te onderbouwen. Endpoint 1 van 2 (gevolgd door /vaststellen).

type Domein = "cultuur" | "mens" | "data_systemen" | "processen";

const VraagSchema = z.object({
  id: z.string(),
  vraag: z.string(),
  voorbeeldAntwoord: z.string().optional(),
});

const InspanningVragenSchema = z.object({
  groepId: z.string(),
  inspanningTitel: z.string(),
  domein: z.enum(["cultuur", "mens", "data_systemen", "processen"]),
  vragen: z.array(VraagSchema).min(2).max(5),
});

const VragenResponseSchema = z.object({
  inspanningen: z.array(InspanningVragenSchema),
});

type ToegestaneFunctie = {
  id: string;
  naam: string;
  afdeling: string;
  schaal?: number;
  aantal: number;
  custom?: boolean;
};

type Inspanning = {
  inspanningTitel: string;
  groepId: string;
  domein: Domein;
  motivatie?: string;
  verdelingPerJaar?: Array<{ jaar: number; euro: number; fase: string; activiteit?: string }>;
  businessCaseInterneRollen?: string;
  businessCaseInterneUren?: string;
};

function buildPrompt(
  inspanningen: Inspanning[],
  toegestaneFunctiesPerDomein: Record<Domein, ToegestaneFunctie[]>
): string {
  return `Je bent programma-controller bij Cito BV. Je helpt de programma-eigenaar om realistische interne uren-schattingen te maken voor de inspanningen in een DIN-programma.

**Doel:** stel per inspanning 3 gerichte, korte vragen die nodig zijn om het aantal interne uren per rol GOED te kunnen schatten. De vragen moeten de AANNAMES boven tafel halen die de uren-schatting bepalen — denk aan frequentie van bijeenkomsten, omvang van leveringen, mate van betrokkenheid, etc.

**INPUT — inspanningen (uit stap 6 begroting):**
${JSON.stringify(inspanningen, null, 2)}

**INPUT — toegestane functies per domein (door gebruiker geselecteerd, met aantal personen):**
${(["cultuur", "mens", "data_systemen", "processen"] as const)
  .map((d) => {
    const lijst = toegestaneFunctiesPerDomein[d] ?? [];
    if (lijst.length === 0) return `- ${d.toUpperCase()}: GEEN functies geselecteerd`;
    return `- ${d.toUpperCase()}: ${lijst.map((f) => `${f.naam} (${f.aantal}p)`).join(", ")}`;
  })
  .join("\n")}

**Taak — lever EXACT dit JSON-object:**
{
  "inspanningen": [
    {
      "groepId": "<groepId van de inspanning>",
      "inspanningTitel": "<titel>",
      "domein": "cultuur" | "mens" | "data_systemen" | "processen",
      "vragen": [
        {
          "id": "v1",
          "vraag": "<korte concrete vraag, NL>",
          "voorbeeldAntwoord": "<bijv. 'wekelijks 2u' of '12 sessies à 4u'>"
        },
        ...3 vragen totaal
      ]
    },
    ...één blok per inspanning, in dezelfde volgorde
  ]
}

**REGELS:**
1. Per inspanning EXACT 3 vragen. Korte, concrete vragen.
2. Vragen moeten gericht zijn op het aantal UREN dat de geselecteerde rollen voor die inspanning nodig hebben — niet op out-of-pocket euro's of strategie.
3. Vragen sluiten aan bij de inspanning-titel + activiteiten (zie verdelingPerJaar.activiteit).
4. Voorbeelden van goede vragen:
   - "Hoe vaak per maand komt de stuurgroep voor deze inspanning bijeen, en hoe lang per keer?"
   - "Hoeveel kick-off + reviewsessies plant je in jaar 1 voor de Sectormanager PO?"
   - "Hoeveel uur per week besteedt de Productowner aan de architectuur-keuze in jaar 1?"
   - "Aantal opleidingsmomenten × deelnemers × duur, wie faciliteert?"
5. Verwijs in de vraag naar de SPECIFIEKE rol(len) uit de toegestane functies van dat domein.
6. voorbeeldAntwoord = kort voorbeeld zodat de gebruiker begrijpt wat voor antwoord verwacht wordt (NIET als waarheid).
7. Gebruik geen rollen die NIET in de toegestane lijst staan voor het domein.
8. ALLEEN JSON, geen markdown, Nederlands.
`;
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { inspanningen, toegestaneFunctiesPerDomein } = body as {
      inspanningen?: Inspanning[];
      toegestaneFunctiesPerDomein?: Record<Domein, ToegestaneFunctie[]>;
    };

    if (!inspanningen || inspanningen.length === 0) {
      return NextResponse.json(
        { success: false, error: "inspanningen is verplicht (uit stap 6 optimaal scenario)" },
        { status: 400 }
      );
    }
    if (!toegestaneFunctiesPerDomein) {
      return NextResponse.json(
        { success: false, error: "toegestaneFunctiesPerDomein is verplicht (functie-selectie uit fase 1)" },
        { status: 400 }
      );
    }

    const kibContext = extractKiBContext(body);
    const systemPrompt = assembleSystemPrompt(
      buildPrompt(inspanningen, toegestaneFunctiesPerDomein),
      "cross-analyse",
      undefined,
      kibContext
    );
    const userMessage = `Stel uren-vragen op voor ${inspanningen.length} inspanningen.`;

    const res = await callClaudeWithValidation(
      VragenResponseSchema,
      systemPrompt,
      userMessage,
      { maxTokens: 8192, retryDelayMs: 2000 }
    );

    if (!res.success) {
      console.error("[interne-uren-vragen] validation failed:", res.error);
      return NextResponse.json(
        { success: false, error: res.error ?? "AI gaf geen geldig antwoord" },
        { status: 200 }
      );
    }

    return NextResponse.json({ success: true, data: res.data });
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Onbekende fout";
    return NextResponse.json({ success: false, error: msg }, { status: 500 });
  }
}
