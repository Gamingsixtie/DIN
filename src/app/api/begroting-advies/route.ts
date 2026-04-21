import { NextRequest, NextResponse } from "next/server";
import { callClaudeWithValidation } from "@/lib/ai-client";
import { assembleSystemPrompt, extractKiBContext } from "@/lib/prompt-assembly";
import { z } from "zod";

export const maxDuration = 300;

// Phase 19 — 3-scenario begrotingsadvies.
// Mental model: jaarlijksBudget is VAST. De vraag is niet of alles past,
// maar hoeveel jaar nodig is om alles af te maken. Daarom drie scenarios:
//   - optimaal  — jaarlijksBudget (user input, typisch €250K)
//   - plus20    — jaarlijksBudget × 1.2 (sneller)
//   - min20     — jaarlijksBudget × 0.8 (langzamer)
// Elk scenario bepaalt zelf aantalJaren o.b.v. benodigde kosten.

const VerdelingPerJaarItemSchema = z.object({
  jaar: z.number(),
  percentage: z.number().min(0).max(100),
  euro: z.number(),
  fase: z.string(),
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

const ScenarioSchema = z.object({
  label: z.enum(["optimaal", "plus20", "min20"]),
  jaarlijksBudgetEuro: z.number(),
  aantalJaren: z.number().int().min(1).max(15),
  totaalGeraamdEuro: z.number(),
  inspanningen: z.array(InspanningBegrotingSchema),
  totalenPerJaar: z.array(TotaalPerJaarSchema),
  prioriteitAdvies: z.string(),
  samenvatting: z.string(),
});

const DrieScenarioAdviesSchema = z.object({
  jaarlijksBudgetBasis: z.number(),
  startJaar: z.number(),
  cyclusMaanden: z.number(),
  scenarios: z.object({
    optimaal: ScenarioSchema,
    plus20: ScenarioSchema,
    min20: ScenarioSchema,
  }),
  vergelijking: z.string(),
});

const PROMPT = `Je bent een programma-controller / begrotingsexpert binnen Cito BV (DIN-methodiek — Werken aan Programma's, Prevaas & Van Loon). Je maakt een REALISTISCH meerjarig begrotingsadvies in DRIE scenario's.

**BELANGRIJK — JAARLIJKS BUDGET IS VAST.** De gebruiker heeft €X per jaar beschikbaar zolang het programma loopt. Je berekent NIET of alles binnen één totaalbudget past. Je berekent: gegeven jaarlijks budget, hoeveel jaar is nodig om alle inspanningen volledig uit te voeren?

Input JSON:
{
  "jaarlijksBudgetEuro": <number — basis jaarlijks budget, bv. 250000>,
  "cyclusMaanden": <number>,
  "startJaar": <number, bv. 2026>,
  "focusDoel": { naam, beschrijving },
  "inspanningen": [
    { titel, groepId, domein, beschrijving, beargumentatie, dossierKostenraming }
  ]
}

Taak — lever EXACT dit JSON-object:
{
  "jaarlijksBudgetBasis": <kopieer jaarlijksBudgetEuro>,
  "startJaar": <kopieer>,
  "cyclusMaanden": <kopieer>,
  "scenarios": {
    "optimaal":  { ...Scenario met jaarlijksBudgetEuro = jaarlijksBudgetBasis × 1.0 },
    "plus20":    { ...Scenario met jaarlijksBudgetEuro = jaarlijksBudgetBasis × 1.2 },
    "min20":     { ...Scenario met jaarlijksBudgetEuro = jaarlijksBudgetBasis × 0.8 }
  },
  "vergelijking": "<2-3 zinnen: wat onderscheidt de scenario's qua tempo en consequenties>"
}

Elk Scenario heeft deze structuur:
{
  "label": "optimaal" | "plus20" | "min20",
  "jaarlijksBudgetEuro": <euro per jaar voor dít scenario>,
  "aantalJaren": <integer, MINIMAAL noodzakelijk om alles af te maken binnen dat budget — geen rek>,
  "totaalGeraamdEuro": <som van alle inspanning.totaalEuro>,
  "inspanningen": [
    {
      "inspanningTitel": "...",
      "groepId": "...",
      "domein": "mens|processen|data_systemen|cultuur",
      "totaalEuro": <afgerond op duizend>,
      "percentageTotaal": <% van totaalGeraamdEuro>,
      "motivatie": "<1-2 zinnen>",
      "verdelingPerJaar": [
        { "jaar": <startJaar>, "percentage": <0-100 van deze totaalEuro>, "euro": <afgerond>, "fase": "<Voorbereiding | Uitrol | Opschaling | Borging>" },
        ...tot aantalJaren jaren
      ],
      "volgorde": { "rank": <1..N unieke outside-in ranking>, "reden": "<1 zin>" }
    }
  ],
  "totalenPerJaar": [
    { "jaar": <startJaar>, "euro": <som dit jaar>, "percentage": <van jaarlijksBudget> },
    ...
  ],
  "prioriteitAdvies": "<3-5 zinnen: wat eerst, wat later, outside-in motivering>",
  "samenvatting": "<1-2 zinnen executive summary van dít scenario>"
}

HARDE REGELS:
1. **Alle 3 scenario's bereiken HETZELFDE EINDDOEL** — álle inspanningen worden volledig uitgevoerd. Alleen het tempo verschilt.
2. **aantalJaren is MINIMAAL noodzakelijk** gegeven jaarlijksBudgetEuro van dat scenario. Niet kunstmatig verlengen, niet opzettelijk rekken.
   - plus20 (€XXX K/jr): sneller → minder jaren dan optimaal.
   - min20 (€XXX K/jr): langzamer → meer jaren dan optimaal.
   - Realistische verhouding: plus20 ≈ optimaal − 1 jaar; min20 ≈ optimaal + 1-2 jaar. Absolute getallen hangen af van geraamde totaalkosten.
3. **Per jaar in elk scenario: som van totalenPerJaar[jaar].euro ≤ jaarlijksBudgetEuro van dat scenario.** Geen overschrijding van het jaarlijks budget in welk jaar dan ook.
4. **Som van verdelingPerJaar[*].percentage per inspanning = precies 100.**
5. **Outside-in volgorde (volgorde.rank):** rank 1 = cultuur (bereidheid), rank 2-3 = mens (competenties), rank 4-5 = processen (werkwijzen), rank 6+ = data/systemen (CRM, tooling). Motiveer afwijkingen. Uniek per scenario.
6. **Realistische fasering per inspanning:**
   - Cultuur: zwaar jaar 1, afnemend borging
   - Mens: start jaar 1, piek midden, borging eind
   - Processen: ontwerp jaar 1-2, uitrol jaar 2-3
   - Data/Systemen: start pas als processen helder zijn — laatste jaren
7. **Totaal geraamde kosten ZIJN GELIJK over scenarios** (zelfde inspanningen worden uitgevoerd). Verschil zit in aantalJaren × jaarlijksBudget.
8. Alle euros als integers (bv. 75000).
9. Antwoord in Nederlands. ALLEEN JSON. Geen markdown, geen prose eromheen.`;

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const {
      jaarlijksBudgetEuro,
      cyclusMaanden,
      startJaar,
      focusDoel,
      inspanningen,
    } = body as {
      jaarlijksBudgetEuro?: number;
      cyclusMaanden?: number;
      startJaar?: number;
      focusDoel?: unknown;
      inspanningen?: unknown;
    };

    if (!jaarlijksBudgetEuro || typeof jaarlijksBudgetEuro !== "number" || jaarlijksBudgetEuro <= 0) {
      return NextResponse.json(
        { success: false, error: "jaarlijksBudgetEuro is verplicht en > 0" },
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

    const kibContext = extractKiBContext(body);
    const systemPrompt = assembleSystemPrompt(PROMPT, "cross-analyse", undefined, kibContext);

    const userMessage = JSON.stringify(
      {
        jaarlijksBudgetEuro,
        cyclusMaanden,
        startJaar: effectiefStartJaar,
        focusDoel: focusDoel ?? null,
        inspanningen,
      },
      null,
      2
    );

    const result = await callClaudeWithValidation(
      DrieScenarioAdviesSchema,
      systemPrompt,
      userMessage,
      { maxTokens: 10000 }
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
