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
  // CONCREET aanbevolen antwoord obv Cito-context (bureaucratisch, sectoraal, hiërarchisch)
  // Dit wordt als pre-fill in de UI getoond zodat user direct iets bruikbaars heeft
  aanbevolenAntwoord: z.string(),
  // Optionele extra context: waarom deze schatting realistisch is voor Cito
  toelichtingAanbeveling: z.string().optional(),
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

**ORGANISATIE-CONTEXT (Cito BV) — gebruik dit voor je aanbevolen schattingen:**
- Cito is een middelgrote, **bureaucratische en hiërarchische organisatie** (~700 medewerkers). Beslissingen vergen meerdere afstemmings- en goedkeuringsrondes.
- Drie sectoren: PO (basisonderwijs), VO (voortgezet), Professionals (zakelijk). Elke sector heeft een eigen sectormanager + productmanagers + toetsdeskundigen.
- **Vergader-cultuur**: stuurgroepen komen typisch 1× per kwartaal bijeen (2-3u), werkgroepen 2× per maand (1.5-2u), kick-offs 1-2 dagen, reviews 0.5-1 dag.
- **Voorbereidingstijd is significant**: voor elke inhoudelijke sessie van 2u rekent een trekkende rol typisch 2-4u voorbereiding (slides, agenda, stakeholderafstemming).
- **Cross-sectorale afstemming** kost relatief veel tijd: 1 cross-sectoraal initiatief raakt minimaal 3 sectormanagers + Directie BV → maandelijks afstem-overleg van ~1u + bilaterale afstemmingen.
- Toetsdeskundigen + Inhoudsspecialisten worden op meerdere programma's tegelijk ingezet → realistisch 10-20% FTE per programma (160-320u/jr).
- Sectormanagers + Directieleden: trekkers in jaar 1 typisch 15-25% FTE (240-400u), in latere jaren 5-10% FTE (80-160u).
- Productowners + Business informatieanalisten op data/systemen-trajecten: vaak 30-50% FTE per jaar (480-800u) tijdens uitrol.
- Klantcontact / Accountmanagers (3-15 personen per sector): 5-10% FTE bijdrage aan programma-borging is normaal.

**Doel:** stel per inspanning EXACT 3 gerichte korte vragen die nodig zijn om het aantal interne uren per rol GOED te kunnen schatten — EN geef per vraag een CONCREET aanbevolen antwoord dat past bij de bovenstaande Cito-context. De gebruiker krijgt dat antwoord als pre-fill en kan het overschrijven.

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
      "groepId": "<EXACT de groepId uit de input — letterlijk overnemen, niet wijzigen>",
      "inspanningTitel": "<titel>",
      "domein": "cultuur" | "mens" | "data_systemen" | "processen",
      "vragen": [
        {
          "id": "v1",
          "vraag": "<korte concrete vraag, NL>",
          "aanbevolenAntwoord": "<CONCREET antwoord met getallen — passend bij Cito-context, bijv. 'Stuurgroep 4× per jaar à 2u, dus 8u per persoon per jaar'>",
          "toelichtingAanbeveling": "<1 zin waarom dit realistisch is voor Cito (bureaucratisch / sectoraal / cross-team)>"
        },
        ...EXACT 3 vragen
      ]
    },
    ...één blok per inspanning, in dezelfde volgorde als input. Gebruik EXACT de groepId zoals die in de input staat — geen verzonnen ids.
  ]
}

**REGELS:**
1. Per inspanning EXACT 3 vragen. Korte, concrete vragen.
2. Vragen moeten gericht zijn op het aantal UREN dat de geselecteerde rollen voor die inspanning nodig hebben — niet op out-of-pocket euro's of strategie.
3. Vragen sluiten aan bij de inspanning-titel + activiteiten (zie verdelingPerJaar.activiteit).
4. **aanbevolenAntwoord MOET concreet zijn met getallen/frequentie** — geen wollige tekst. Voorbeelden:
   - "Maandelijks afstemoverleg 1u + 1 stuurgroep per kwartaal 2u = ~20u/jr per persoon"
   - "Kick-off 2 dagen + 4 reviewsessies à 0.5 dag in jaar 1 = ~6 dagen = 48u trekker, 16u deelnemer"
   - "12 sessies × 4u + 50% voorbereidingstijd = 72u per facilitator"
5. Verwijs in de vraag naar de SPECIFIEKE rol(len) uit de toegestane functies van dat domein.
6. **Onderbouw je aanbevolen schatting met de Cito-context hierboven** (bureaucratisch, sectoraal, vergader-cultuur).
7. Gebruik geen rollen die NIET in de toegestane lijst staan voor het domein.
8. **groepId in output moet LETTERLIJK gelijk zijn aan groepId in input** — kopieer 1-op-1.
9. ALLEEN JSON, geen markdown, Nederlands.
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
