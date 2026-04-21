import { NextRequest, NextResponse } from "next/server";
import { callClaudeWithValidation } from "@/lib/ai-client";
import { assembleSystemPrompt, extractKiBContext } from "@/lib/prompt-assembly";
import { z } from "zod";

export const maxDuration = 300;

// Phase 18 — stap 6: holistisch begrotingsadvies over alle cross-sectorale inspanningen.
// Verdeelt totaalbudget in % per inspanning + prioriteits-advies + 2026 prognose.

const BegrotingsAdviesSchema = z.object({
  totaalBudgetEuro: z.number(),
  cyclusMaanden: z.number(),
  percentageVerdeling: z.array(
    z.object({
      inspanningTitel: z.string(),
      groepId: z.string().optional(),
      domein: z.enum(["mens", "processen", "data_systemen", "cultuur"]),
      percentage: z.number().min(0).max(100),
      bedragEuro: z.number(),
      motivatie: z.string(),
    })
  ),
  prioriteitAdvies: z.string(),
  prognose2026: z.string(),
  samenvatting: z.string(),
});

const PROMPT = `Je bent een programma-controller / begrotingsexpert binnen Cito BV (DIN-methodiek — Werken aan Programma's, Prevaas & Van Loon). Je maakt een realistisch begrotingsadvies voor cross-sectorale inspanningen.

Input JSON:
{
  "totaalBudgetEuro": <number — out-of-pocket budget in euros voor deze cyclus>,
  "cyclusMaanden": <number — hoe lang de huidige cyclus duurt>,
  "focusDoel": { naam, beschrijving },
  "inspanningen": [
    { titel, groepId, domein, beschrijving, beargumentatie, dossierKostenraming }
  ]
}

Taak — lever EXACT dit JSON-object:
{
  "totaalBudgetEuro": <kopieer uit input>,
  "cyclusMaanden": <kopieer uit input>,
  "percentageVerdeling": [
    { "inspanningTitel": "...", "groepId": "...", "domein": "mens|processen|data_systemen|cultuur", "percentage": <0-100>, "bedragEuro": <euros, afgerond op duizend>, "motivatie": "<1-2 zinnen waarom dit percentage>" }
  ],
  "prioriteitAdvies": "<2-4 zinnen: welke inspanning(en) eerst aanpakken in de cyclus van X maanden, waarom — redeneer vanuit hefboomwerking en afhankelijkheden>",
  "prognose2026": "<2-4 zinnen: wat hebben we in 2026 nodig om door te kunnen gaan? Denk aan vervolgbudget, afbouw-kosten, kritische afhankelijkheden die in jaar 2 geborgd moeten zijn — benoem grove orde van grootte in euros voor 2026>",
  "samenvatting": "<1 zin executive samenvatting>"
}

Regels:
- Som van percentages MOET precies 100 zijn. bedragEuro per inspanning = percentage/100 * totaalBudgetEuro, afgerond op €1.000.
- Gebruik \`bedragEuro\` met alleen cijfers (bv. 75000, niet "75.000" of "€75K").
- Redeneer methodisch: data-systemen is meestal kapitaalintensief (CRM/platforms), mens/cultuur vaak minder maar langere doorlooptijd, processen matig.
- Benoem in motivatie per regel 1 concrete reden (schaalvoordeel / kritieke afhankelijkheid / laagste regret / snelste hefboom).
- prioriteitAdvies denkt aan cyclus-lengte: 9 maanden is kort — welke kun je AF krijgen, welke kun je STARTEN en afbouwen in 2026.
- prognose2026: expliciet benoemen welk deel van de €X in 2026 nodig is om door te kunnen, en welk deel eenmalig was. Geef grove totaal 2026-raming in euros.
- Antwoord in het Nederlands, gebruik €-symbool (geen "EUR").
- ALLEEN JSON, geen prose errom.`;

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { totaalBudgetEuro, cyclusMaanden, focusDoel, inspanningen } = body as {
      totaalBudgetEuro?: number;
      cyclusMaanden?: number;
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

    const kibContext = extractKiBContext(body);
    const systemPrompt = assembleSystemPrompt(PROMPT, "cross-analyse", undefined, kibContext);

    const userMessage = JSON.stringify(
      {
        totaalBudgetEuro,
        cyclusMaanden,
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
      { maxTokens: 4096 }
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
