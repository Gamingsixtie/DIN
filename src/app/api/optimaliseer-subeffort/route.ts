import { NextRequest, NextResponse } from "next/server";
import { callClaudeWithValidation } from "@/lib/ai-client";
import { SubEffortAdviesSchema } from "@/lib/schemas";
import { assembleSystemPrompt, extractKiBContext } from "@/lib/prompt-assembly";

export const maxDuration = 300;

// Phase 18 (stap 6): verfijnt één user-bewerkte SubEffortAdvies entry met AI.
// Behoudt user-intent (items, groepId, domein, actie) en verbetert titel/
// beschrijving/beargumentatie/vermogenImpact/dossier waar nodig.
const OPTIMALISEER_PROMPT = `Je bent een expert in programmamanagement (DIN-methodiek, Werken aan Programma's — Prevaas & Van Loon, Hfst 11.3 Inspanningendossier).

Je krijgt één cross-sectorale inspanning die een gebruiker aan het verfijnen is, samen met context (focusDoel, groep, sector-vermogens). Taak: herschrijf de velden zo dat ze methodisch scherper en consistenter zijn, terwijl je de intentie van de gebruiker respecteert.

Input JSON:
{
  "entry": { huidige SubEffortAdvies met user-edits },
  "focusDoel": { id, naam, beschrijving },
  "groep": { id, vermogenIds, gezamenlijkeOmschrijving, reden },
  "vermogens": [{ id, sectorId, title, description, profielHuidig, profielGewenst }]
}

Regels voor optimalisatie:
- Behoud \`groepId\`, \`domein\`, \`actie\`, \`items\` EXACT zoals in input (user heeft die bewust gekozen).
- Verfijn \`titel\` naar sectoroverstijgende actielabel met werkwoord, max 10 woorden, GEEN PO/VO/Zakelijk substrings. Houdt dicht bij user-draft maar maakt helder en scherp.
- Verfijn \`beschrijving\` naar 2-3 scherpe zinnen: wat houdt de bundel in, concreet over welke sectoren, welke scope. Gebruik focusDoel.beschrijving voor inkleuring.
- Verfijn \`beargumentatie\` naar HEFBOOM-redenering: één inspanning → drie vermogens → drie baten → focus-doel. Benoem schaalvoordeel expliciet. Bij actie "combineren": benoem alle drie sectoren. Bij een domein waar sector-input ontbrak: leg uit waarom die sector toch meegaat via profielGewenst.
- \`voorgesteldeNaam\` moet IDENTIEK zijn aan \`titel\` bij actie "combineren"; bij "apart_houden" is \`null\`.
- Verfijn \`vermogenImpact\` — EXACT één entry per sector uit groep.vermogenIds. SectorId en vermogenId komen uit input.vermogens. Impact in sector-specifieke taal (leerkrachten/schoolleiders/accountmanagers), op basis van profielGewenst.
- Verfijn \`dossier\` (5 velden): Nederlandse rolnamen (Directie, Programmamanager, Business Process Owner, CIO, IT-architect, Opleidingsregisseur); €-symbool in kostenraming (niet "EUR"); randvoorwaarden concreet genoeg om gate te zijn voor start.
- Leeg user-veld? Vul het zinvol in op basis van context. Ingevuld door user? Verfijn maar behoud kern.
- \`reden\` veld (Phase 17 legacy): behoud user-input, herformulier alleen bij onleesbaarheid.

EINDCHECK: je output MOET precies één SubEffortAdvies-object zijn (geen array). Alle Phase 17 + Phase 18 velden aanwezig. Valid JSON, geen prose. Antwoord in het Nederlands.`;

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { entry, focusDoel, groep, vermogens } = body as {
      entry: unknown;
      focusDoel: unknown;
      groep: unknown;
      vermogens: unknown;
    };

    if (!entry || !groep) {
      return NextResponse.json(
        { success: false, error: "Ontbrekende invoer: entry en groep zijn verplicht." },
        { status: 400 }
      );
    }

    const kibContext = extractKiBContext(body);
    const systemPrompt = assembleSystemPrompt(
      OPTIMALISEER_PROMPT,
      "cross-analyse",
      undefined,
      kibContext
    );

    const userMessage = JSON.stringify(
      { entry, focusDoel: focusDoel ?? null, groep, vermogens: vermogens ?? [] },
      null,
      2
    );

    const result = await callClaudeWithValidation(
      SubEffortAdviesSchema,
      systemPrompt,
      userMessage,
      { maxTokens: 4096 }
    );

    if (!result.success) {
      return NextResponse.json(
        { success: false, error: "AI-optimalisatie mislukt na validatie." },
        { status: 502 }
      );
    }

    return NextResponse.json({ success: true, data: result.data });
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Onbekende fout";
    return NextResponse.json({ success: false, error: msg }, { status: 500 });
  }
}
