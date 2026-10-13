// Stap 12 — Bronnenanalyse: AI-analyse van één bron.
// POST AnalyseerBronRequest → AnalyseerBronResponse (contract in bronnenanalyse-service).
// Server-side nabewerking: onbekende werkstroom- en punt-ids weg, citaat-verificatie tegen de
// VOLLEDIGE meegestuurde tekst (alleen markeren, niets weggooien), caps, door/datum/model.
// De documenttekst wordt niet opgeslagen en niet gelogd (alleen lengtes).

import { NextResponse } from "next/server";
import { z } from "zod";
import { callClaudeWithValidation } from "@/lib/ai-client";
import { assembleSystemPrompt } from "@/lib/prompt-assembly";
import { BRONNENANALYSE_PROMPT } from "@/lib/prompts";
import { AIBronAnalyseSchema, BronTypeSchema, type BronAnalyse } from "@/lib/schemas";
import {
  AI_TEKST_MAX,
  capBronAnalyse,
  verifieerCitaat,
  type AnalyseerBronResponse,
  type AnalyseFoutCode,
} from "@/lib/bronnenanalyse-service";
import { GEEL_PUNTEN } from "@/lib/bronnenanalyse-default";

export const runtime = "nodejs";
export const maxDuration = 300;

const MODEL = "claude-sonnet-5-5";
const AI_VELD_MAX = 400; // dekt / watErAlIs
const AI_REGEL_MAX = 200; // één open punt of actie

const RequestSchema = z.object({
  bron: z.object({
    id: z.string().min(1),
    titel: z.string(),
    bestandsnaam: z.string(),
    type: BronTypeSchema,
    datum: z.string(),
  }),
  tekst: z.string().refine((t) => t.trim().length > 0, { message: "De brontekst is leeg" }),
  werkstromen: z
    .array(z.object({ id: z.string().min(1), naam: z.string(), landtIn: z.string().optional() }))
    .min(1, { message: "Er is minstens één werkstroom nodig" }),
});

function fout(code: AnalyseFoutCode, error: string, status: number) {
  const body: AnalyseerBronResponse = { success: false, error, code };
  return NextResponse.json(body, { status });
}

export async function POST(request: Request) {
  // 1. Zonder API-sleutel geen AI — vóór elke andere stap
  if (!process.env.ANTHROPIC_API_KEY) {
    return fout(
      "geen_api_key",
      "De AI-analyse is niet beschikbaar: er is geen API-sleutel ingesteld (ANTHROPIC_API_KEY). Registreren en handmatig bewerken werkt wel.",
      503,
    );
  }

  // 2. Invoer valideren
  let ruw: unknown;
  try {
    ruw = await request.json();
  } catch {
    return fout("ongeldige_invoer", "Ongeldige invoer: de aanvraag is geen geldige JSON.", 400);
  }
  const parsed = RequestSchema.safeParse(ruw);
  if (!parsed.success) {
    const details = parsed.error.issues.map((i) => i.message).join(", ");
    return fout("ongeldige_invoer", `Ongeldige invoer: ${details}`, 400);
  }
  const { bron, tekst, werkstromen } = parsed.data;

  // 3. Prompt samenstellen
  const systemPrompt = assembleSystemPrompt(BRONNENANALYSE_PROMPT, "bronnenanalyse");
  const afgekapt = tekst.length > AI_TEKST_MAX;
  const aiTekst = afgekapt ? tekst.slice(0, AI_TEKST_MAX) : tekst;
  const werkstroomRegels = werkstromen
    .map((w) => `- ${w.id} — ${w.naam}${w.landtIn?.trim() ? ` (landt in: ${w.landtIn.trim()})` : ""}`)
    .join("\n");
  const puntRegels = GEEL_PUNTEN.map((p) => `- ${p.id} — ${p.titel}: ${p.omschrijving}${p.noot ? ` ${p.noot}` : ""}`).join(
    "\n",
  );

  const userMessage = `## Bron
Titel: ${bron.titel || "te bepalen"}
Bestandsnaam: ${bron.bestandsnaam || "te bepalen"}
Type: ${bron.type}
Datum: ${bron.datum || "te bepalen"}

## Werkstromen (gebruik uitsluitend deze ids in dekking[].werkstroom)
${werkstroomRegels}

## De vier punten (gebruik uitsluitend deze ids in punten[].punt)
${puntRegels}

## Brontekst${afgekapt ? ` (afgekapt: alleen het begin van de bron, de eerste ${AI_TEKST_MAX} tekens; de rest is niet meegestuurd)` : ""}
<<<BRON
${aiTekst}
BRON>>>

Analyseer deze bron volgens de instructies en antwoord alleen met het JSON-object.`;

  // 4. AI-aanroep met schema-validatie
  const resultaat = await callClaudeWithValidation(AIBronAnalyseSchema, systemPrompt, userMessage, {
    model: MODEL,
    maxTokens: 16000,
    effort: "medium",
  });
  if (!resultaat.success) {
    console.error(
      `[analyseer-bron] AI-analyse mislukt (tekstlengte ${tekst.length}, afgekapt ${afgekapt}):`,
      resultaat.error,
    );
    return fout(
      "ai_fout",
      "De AI-analyse is mislukt. Probeer het opnieuw, of vul de analyse handmatig in.",
      502,
    );
  }

  // 5. Nabewerking
  const werkstroomIds = new Set(werkstromen.map((w) => w.id));
  const puntIds = new Set<string>(GEEL_PUNTEN.map((p) => p.id));
  const ai = resultaat.data;

  // Extra grenzen op AI-uitvoer (T-12-17, sessieblob-grootte): hooguit één dekkingsregel per
  // werkstroom en één bijdrage per punt (in aantal), en een maximum per vrij tekstveld.
  // Alleen hier (AI), niet in capBronAnalyse: handmatige tekst wordt nooit stil ingekort.
  const AI_DEKKING_REGELS_MAX = werkstromen.length;
  const AI_PUNTEN_REGELS_MAX = GEEL_PUNTEN.length;
  const kort = (s: string, max: number) => (s.length > max ? `${s.slice(0, max - 1).trimEnd()}…` : s);
  const dekking = (ai.dekking ?? [])
    .filter((d) => werkstroomIds.has(d.werkstroom))
    .slice(0, AI_DEKKING_REGELS_MAX)
    .map((d) => ({
      ...d,
      dekt: kort(d.dekt ?? "", AI_VELD_MAX),
      openPunten: (d.openPunten ?? []).map((o) => kort(o, AI_REGEL_MAX)),
      citaatGeverifieerd: verifieerCitaat(d.citaat ?? "", tekst),
    }));
  const punten = (ai.punten ?? [])
    .filter((p) => puntIds.has(p.punt))
    .slice(0, AI_PUNTEN_REGELS_MAX)
    .map((p) => ({
      ...p,
      watErAlIs: kort(p.watErAlIs ?? "", AI_VELD_MAX),
      actiesNogTeDoen: (p.actiesNogTeDoen ?? []).map((x) => kort(x, AI_REGEL_MAX)),
      citaatGeverifieerd: verifieerCitaat(p.citaat ?? "", tekst),
    }));

  const gecapt = capBronAnalyse({ ...ai, dekking, punten });
  const analyse: BronAnalyse = {
    ...gecapt,
    door: "claude",
    geanalyseerdOp: new Date().toISOString(),
    model: MODEL,
  };

  // 6. Antwoord
  const body: AnalyseerBronResponse = { success: true, analyse };
  return NextResponse.json(body, { status: 200 });
}
