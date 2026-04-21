import { NextRequest, NextResponse } from "next/server";
import { callClaudeWithValidation } from "@/lib/ai-client";
import { SubEffortAdviesSchema } from "@/lib/schemas";
import { assembleSystemPrompt, extractKiBContext } from "@/lib/prompt-assembly";

export const maxDuration = 300;

// Phase 18 (stap 6): gerichte verfijning van een user-bewerkte SubEffortAdvies.
// User kan aangeven WELKE velden geoptimaliseerd moeten worden + specifieke wensen.

const OPTIMALISEER_PROMPT = `Je bent een expert in programmamanagement (DIN-methodiek, Werken aan Programma's — Prevaas & Van Loon, Hfst 11.3 Inspanningendossier).

Je krijgt één cross-sectorale inspanning die een gebruiker aan het verfijnen is, een lijst velden om te optimaliseren, en eventuele specifieke instructies van de gebruiker.

Input JSON:
{
  "entry": { huidige SubEffortAdvies met user-edits },
  "optimizeFields": ["titel" | "beschrijving" | "beargumentatie" | "vermogenImpact" | "dossier"],
  "userInstructie": "<optionele tekst van user: scherpingsrichting, focus, toon>",
  "focusDoel": { id, naam, beschrijving },
  "groep": { id, vermogenIds, gezamenlijkeOmschrijving, reden },
  "vermogens": [{ id, sectorId, title, description, profielHuidig, profielGewenst }]
}

Regels voor gerichte optimalisatie:
- Behoud \`groepId\`, \`domein\`, \`actie\`, \`items\` EXACT zoals in input.
- **Behoud ALLE velden die NIET in \`optimizeFields\` staan exact zoals ze nu zijn — tekst voor tekst.** Raak ze niet aan, ook niet stilistisch.
- Verbeter ALLEEN de velden die in \`optimizeFields\` staan, rekening houdend met \`userInstructie\` als die gegeven is.
- Bij "titel": sectoroverstijgende actielabel, max 10 woorden, GEEN PO/VO/Zakelijk substrings. Houd dicht bij user-draft. voorgesteldeNaam wordt automatisch IDENTIEK.
- Bij "beschrijving": 2-3 scherpe zinnen over wat de bundel inhoudt, welke scope over welke sectoren. Focus-doel voor inkleuring.
- Bij "beargumentatie": HEFBOOM-redenering (één inspanning → drie vermogens → drie baten → focus-doel). Schaalvoordeel expliciet. Bij sector zonder directe input: leg uit waarom die toch meegaat.
- Bij "vermogenImpact": EXACT één entry per sector uit groep.vermogenIds. Sector-specifieke taal (leerkrachten/schoolleiders/accountmanagers) obv profielGewenst.
- Bij "dossier": 5 velden (eigenaar / inspanningsleider / verwachtResultaat / kostenraming / randvoorwaarden). Nederlandse rolnamen, €-symbool in kostenraming, meetbare resultaten.
- \`userInstructie\` is LEIDEND binnen de toegestane velden — als user zegt "maak de kostenraming concreter", werk dat uit binnen dossier.

EINDCHECK: je output MOET precies één SubEffortAdvies-object zijn (geen array). Niet-gevraagde velden EXACT behouden. Valid JSON, geen prose. Antwoord in het Nederlands.`;

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { entry, focusDoel, groep, vermogens, optimizeFields, userInstructie } = body as {
      entry: unknown;
      focusDoel: unknown;
      groep: unknown;
      vermogens: unknown;
      optimizeFields?: string[];
      userInstructie?: string;
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

    // Default: alle velden als niet gespecificeerd
    const fields = optimizeFields && optimizeFields.length > 0
      ? optimizeFields
      : ["titel", "beschrijving", "beargumentatie", "vermogenImpact", "dossier"];

    const userMessage = JSON.stringify(
      {
        entry,
        optimizeFields: fields,
        userInstructie: userInstructie ?? "",
        focusDoel: focusDoel ?? null,
        groep,
        vermogens: vermogens ?? [],
      },
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
