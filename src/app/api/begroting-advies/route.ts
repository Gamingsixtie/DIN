import { NextRequest, NextResponse } from "next/server";
import { callClaudeWithValidation } from "@/lib/ai-client";
import { assembleSystemPrompt, extractKiBContext } from "@/lib/prompt-assembly";
import { z } from "zod";

export const maxDuration = 300;

// Phase 19 (substap 6.3/6.4) — meerjarig begrotingsadvies.
// Vervangt eenjarige verdeling door:
//  - verdelingPerJaar: per inspanning × jaar percentage/euro/fase
//  - totalenPerJaar: globaal per jaar
//  - volgorde: outside-in ranking per inspanning (rank + reden)
//  - budgetDekking: indicator of geraamde kosten binnen beschikbaar budget passen
//
// Oude velden (percentageVerdeling, prognose2026) blijven optioneel voor backward compat
// maar de UI gebruikt de nieuwe velden.

const VerdelingPerJaarItemSchema = z.object({
  jaar: z.number(),
  percentage: z.number().min(0).max(100),
  euro: z.number(),
  fase: z.string(), // bv. "Voorbereiding", "Uitrol", "Borging"
});

const InspanningBegrotingSchema = z.object({
  inspanningTitel: z.string(),
  groepId: z.string().optional(),
  domein: z.enum(["mens", "processen", "data_systemen", "cultuur"]),
  totaalEuro: z.number(),
  percentageTotaal: z.number().min(0).max(100),
  motivatie: z.string(),
  verdelingPerJaar: z.array(VerdelingPerJaarItemSchema),
  volgorde: z.object({
    rank: z.number().int().min(1),
    reden: z.string(),
  }),
});

const TotaalPerJaarSchema = z.object({
  jaar: z.number(),
  euro: z.number(),
  percentage: z.number().min(0).max(100),
});

const BegrotingsAdviesSchema = z.object({
  totaalBudgetEuro: z.number(),
  cyclusMaanden: z.number(),
  startJaar: z.number(),
  aantalJaren: z.number(),
  inspanningen: z.array(InspanningBegrotingSchema),
  totalenPerJaar: z.array(TotaalPerJaarSchema),
  budgetDekking: z.object({
    binnenBudget: z.boolean(),
    totaalGeraamd: z.number(),
    tekortOfOverschot: z.number(), // positief = overschot, negatief = tekort
    toelichting: z.string(),
  }),
  prioriteitAdvies: z.string(),
  samenvatting: z.string(),
});

const PROMPT = `Je bent een programma-controller / begrotingsexpert binnen Cito BV (DIN-methodiek — Werken aan Programma's, Prevaas & Van Loon). Je maakt een REALISTISCH MEERJARIG begrotingsadvies voor cross-sectorale inspanningen.

Input JSON:
{
  "totaalBudgetEuro": <number — totaal beschikbaar out-of-pocket budget over de hele programmaperiode>,
  "cyclusMaanden": <number — duur huidige cyclus in maanden>,
  "startJaar": <number — eerste jaar, bv. 2026>,
  "aantalJaren": <number — hoeveel jaren te plannen, bv. 3>,
  "focusDoel": { naam, beschrijving },
  "inspanningen": [
    { titel, groepId, domein, beschrijving, beargumentatie, dossierKostenraming }
  ]
}

Taak — lever EXACT dit JSON-object:
{
  "totaalBudgetEuro": <kopieer>,
  "cyclusMaanden": <kopieer>,
  "startJaar": <kopieer>,
  "aantalJaren": <kopieer>,
  "inspanningen": [
    {
      "inspanningTitel": "...",
      "groepId": "...",
      "domein": "mens|processen|data_systemen|cultuur",
      "totaalEuro": <euros over alle jaren samen, afgerond op duizend>,
      "percentageTotaal": <percentage van totaalBudgetEuro>,
      "motivatie": "<1-2 zinnen>",
      "verdelingPerJaar": [
        { "jaar": <startJaar>, "percentage": <0-100 van totaalEuro>, "euro": <afgerond op duizend>, "fase": "<bv. Voorbereiding | Uitrol | Opschaling | Borging>" },
        ... één item per jaar tot en met startJaar+aantalJaren-1
      ],
      "volgorde": { "rank": <1..N, unieke ranking>, "reden": "<waarom deze positie>" }
    }
  ],
  "totalenPerJaar": [
    { "jaar": <startJaar>, "euro": <som over alle inspanningen dit jaar>, "percentage": <van totaalBudgetEuro> },
    ...
  ],
  "budgetDekking": {
    "binnenBudget": <boolean — past geraamd totaal binnen totaalBudgetEuro?>,
    "totaalGeraamd": <euros>,
    "tekortOfOverschot": <euros, positief = overschot, negatief = tekort>,
    "toelichting": "<1-2 zinnen: als tekort, welke inspanningen doorgeschoven/afgeschaald>"
  },
  "prioriteitAdvies": "<3-5 zinnen: welke inspanning eerst, welke later, waarom — benoem expliciet outside-in: cultuur/bereidheid eerst, dan mens/competenties, dan processen, dan data/systemen>",
  "samenvatting": "<1-2 zinnen executive samenvatting>"
}

HARDE REGELS:
1. **Budget mag NIET overschreden worden.** Als inspanningen samen meer kosten dan \`totaalBudgetEuro\`, dan MOET je prioriteren: schuif lagere prioriteit door naar latere jaren, schaal af, of haal uit scope. Zet \`binnenBudget: false\` en licht toe.
2. **Meerjarig spreiden — REALISTISCH:**
   - Cultuur/bereidheid: zwaar jaar 1 (bewustwording, commitment), afnemend jaar 2-3 (borging).
   - Mens/competenties: jaar 1 start, piek jaar 2 (training aan volle breedte), jaar 3 borging/verfijning.
   - Processen: jaar 1-2 ontwerp, jaar 2-3 uitrol.
   - Data/Systemen: jaar 2-3 (CRM kan pas worden ingeregeld als bekend is welke vragen gesteld moeten worden — volgt uit mens/processen).
3. **Som van \`verdelingPerJaar[*].percentage\` per inspanning MOET precies 100 zijn.**
4. **Outside-in volgorde:** rank 1 = cultuur (bereidheid — zijn ze bereid te doen wat ze beloven?), rank 2-3 = mens (competenties, gesprekvaardigheid — kan starten los van systemen), rank 4-5 = processen (volgen uit de vragen), rank 6+ = data/systemen (CRM wordt ingeregeld op wat genoteerd moet worden). Motiveer afwijkingen.
5. Alle \`euro\`-velden als integers (bv. \`75000\`, niet \`"€75K"\`).
6. Antwoord in het Nederlands, gebruik €-symbool waar nodig in toelichting.
7. ALLEEN JSON, geen prose errom.`;

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const {
      totaalBudgetEuro,
      cyclusMaanden,
      startJaar,
      aantalJaren,
      focusDoel,
      inspanningen,
    } = body as {
      totaalBudgetEuro?: number;
      cyclusMaanden?: number;
      startJaar?: number;
      aantalJaren?: number;
      focusDoel?: unknown;
      inspanningen?: unknown;
    };

    if (!totaalBudgetEuro || typeof totaalBudgetEuro !== "number" || totaalBudgetEuro <= 0) {
      return NextResponse.json(
        { success: false, error: "totaalBudgetEuro is verplicht en > 0" },
        { status: 400 }
      );
    }
    if (!cyclusMaanden || typeof cyclusMaanden !== "number" || cyclusMaanden <= 0) {
      return NextResponse.json(
        { success: false, error: "cyclusMaanden is verplicht en > 0" },
        { status: 400 }
      );
    }
    if (!Array.isArray(inspanningen) || inspanningen.length === 0) {
      return NextResponse.json(
        { success: false, error: "inspanningen moet een niet-lege array zijn" },
        { status: 400 }
      );
    }

    const effectiefStartJaar =
      typeof startJaar === "number" && startJaar > 2000 ? startJaar : new Date().getFullYear();
    const effectiefAantalJaren =
      typeof aantalJaren === "number" && aantalJaren >= 1 && aantalJaren <= 10 ? aantalJaren : 3;

    const kibContext = extractKiBContext(body);
    const systemPrompt = assembleSystemPrompt(PROMPT, "cross-analyse", undefined, kibContext);

    const userMessage = JSON.stringify(
      {
        totaalBudgetEuro,
        cyclusMaanden,
        startJaar: effectiefStartJaar,
        aantalJaren: effectiefAantalJaren,
        focusDoel: focusDoel ?? null,
        inspanningen,
      },
      null,
      2
    );

    const result = await callClaudeWithValidation(
      BegrotingsAdviesSchema,
      systemPrompt,
      userMessage,
      { maxTokens: 6144 }
    );

    if (!result.success) {
      return NextResponse.json(
        { success: false, error: "AI-begrotingsadvies validation failed" },
        { status: 502 }
      );
    }

    return NextResponse.json({ success: true, data: result.data });
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Onbekende fout";
    return NextResponse.json({ success: false, error: msg }, { status: 500 });
  }
}
