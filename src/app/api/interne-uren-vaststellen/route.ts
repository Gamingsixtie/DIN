import { NextRequest, NextResponse } from "next/server";
import { callClaudeWithValidation } from "@/lib/ai-client";
import { assembleSystemPrompt, extractKiBContext } from "@/lib/prompt-assembly";
import { z } from "zod";

export const maxDuration = 180;

// Stap 7 — fase 2b: AI verwerkt user-antwoorden op de gestelde vragen en
// produceert per inspanning per rol een uren-totaal (over de hele looptijd
// van het optimale scenario). Wordt vervolgens als HARDE input gebruikt
// door /api/interne-uren-advies.

type Domein = "cultuur" | "mens" | "data_systemen" | "processen";

const RolUrenSchema = z.object({
  functieId: z.string(),
  functieNaam: z.string(),
  afdeling: z.string().optional(),
  // Totaal uren over alle jaren van het OPTIMAAL scenario, OVER ALLE PERSONEN
  // van die rol (dus 3 personen × 200u/jr × 3 jaar = 1800u totaal).
  urenTotaal: z.number(),
  // Onderbouwing — verwijst expliciet naar het user-antwoord dat dit triggerde
  onderbouwing: z.string(),
});

const InspanningUrenSchema = z.object({
  groepId: z.string(),
  inspanningTitel: z.string(),
  domein: z.enum(["cultuur", "mens", "data_systemen", "processen"]),
  rollen: z.array(RolUrenSchema),
});

const VaststellenResponseSchema = z.object({
  inspanningen: z.array(InspanningUrenSchema),
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

type InspanningVragenAntwoorden = {
  groepId: string;
  inspanningTitel: string;
  domein: Domein;
  vragenAntwoorden: Array<{ vraag: string; antwoord: string }>;
};

function buildPrompt(
  inspanningen: Inspanning[],
  vragenAntwoorden: InspanningVragenAntwoorden[],
  toegestaneFunctiesPerDomein: Record<Domein, ToegestaneFunctie[]>,
  aantalJarenOptimaal: number
): string {
  return `Je bent programma-controller bij Cito BV. Je berekent op basis van de user-antwoorden op gerichte vragen het AANTAL UREN per rol per inspanning, voor het OPTIMAAL scenario van ${aantalJarenOptimaal} jaar.

**INPUT — vragen + antwoorden per inspanning:**
${vragenAntwoorden
  .map(
    (i) =>
      `\n[${i.groepId}] ${i.inspanningTitel} (${i.domein})\n${i.vragenAntwoorden
        .map((va, k) => `  ${k + 1}. V: ${va.vraag}\n     A: ${va.antwoord || "(geen antwoord)"}`)
        .join("\n")}`
  )
  .join("\n")}

**INPUT — inspanningen-context (uit stap 6):**
${JSON.stringify(inspanningen, null, 2)}

**INPUT — toegestane functies per domein (functie-id, naam, aantal personen):**
${(["cultuur", "mens", "data_systemen", "processen"] as const)
  .map((d) => {
    const lijst = toegestaneFunctiesPerDomein[d] ?? [];
    if (lijst.length === 0) return `- ${d.toUpperCase()}: GEEN`;
    return `- ${d.toUpperCase()}:\n${lijst
      .map((f) => `    ${f.naam} (id: ${f.id}, ${f.aantal} personen)`)
      .join("\n")}`;
  })
  .join("\n")}

**Taak — lever EXACT dit JSON-object:**
{
  "inspanningen": [
    {
      "groepId": "<exact zoals input>",
      "inspanningTitel": "<exact zoals input>",
      "domein": "cultuur" | "mens" | "data_systemen" | "processen",
      "rollen": [
        {
          "functieId": "<id uit toegestane functies van DIT domein>",
          "functieNaam": "<naam uit toegestane functies>",
          "afdeling": "<afdeling>",
          "urenTotaal": <int>,
          "onderbouwing": "<1-2 zinnen die expliciet refereren aan het user-antwoord en/of frequentie/duur die werd opgegeven>"
        },
        ...alle relevante rollen voor deze inspanning, uit de toegestane lijst van het domein
      ]
    },
    ...één blok per inspanning, in dezelfde volgorde als input
  ]
}

**HARDE REGELS:**
1. **urenTotaal = optelsom over alle ${aantalJarenOptimaal} jaren × alle personen in die rol**. Dus voor 3 accountmanagers × 200u/jr × 3 jaar = 1800u urenTotaal.
2. **Gebruik UITSLUITEND functies uit de toegestane lijst van het domein van die inspanning**. Geen andere rollen.
3. **Reken concreet vanuit de user-antwoorden**: als user zegt "wekelijks 2u → 100u/jr", dan urenTotaal voor 1 persoon × ${aantalJarenOptimaal} jaar = ${100 * aantalJarenOptimaal}u. Vermenigvuldig met aantal personen.
4. **Onderbouwing moet de afleiding tonen**: "User: '12 sessies × 4u' = 48u/jr × 3 jaar × 1 persoon = 144u".
5. **Realistische FTE-norm**: 1 FTE = ~1600 werkbare uren/jaar. Als de berekende uren > 1600u/jr/persoon → terugbrengen naar 1600u en motiveren in onderbouwing dat user-input bovenmatig was.
6. **Als user-antwoord leeg of onduidelijk is**: maak een conservatieve schatting (= laag eind van plausibel), en zeg dat in onderbouwing.
7. ALLEEN JSON, geen markdown, Nederlands.
`;
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const {
      inspanningen,
      vragenAntwoorden,
      toegestaneFunctiesPerDomein,
      aantalJarenOptimaal,
    } = body as {
      inspanningen?: Inspanning[];
      vragenAntwoorden?: InspanningVragenAntwoorden[];
      toegestaneFunctiesPerDomein?: Record<Domein, ToegestaneFunctie[]>;
      aantalJarenOptimaal?: number;
    };

    if (!inspanningen || !vragenAntwoorden || !toegestaneFunctiesPerDomein || !aantalJarenOptimaal) {
      return NextResponse.json(
        { success: false, error: "inspanningen, vragenAntwoorden, toegestaneFunctiesPerDomein en aantalJarenOptimaal zijn verplicht" },
        { status: 400 }
      );
    }

    const kibContext = extractKiBContext(body);
    const systemPrompt = assembleSystemPrompt(
      buildPrompt(inspanningen, vragenAntwoorden, toegestaneFunctiesPerDomein, aantalJarenOptimaal),
      "cross-analyse",
      undefined,
      kibContext
    );
    const userMessage = `Bereken uren per rol voor ${inspanningen.length} inspanningen op basis van user-antwoorden.`;

    const res = await callClaudeWithValidation(
      VaststellenResponseSchema,
      systemPrompt,
      userMessage,
      { maxTokens: 16384, retryDelayMs: 2000 }
    );

    if (!res.success) {
      console.error("[interne-uren-vaststellen] validation failed:", res.error);
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
