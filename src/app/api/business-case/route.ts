import { NextRequest, NextResponse } from "next/server";
import { callClaudeWithValidation } from "@/lib/ai-client";
import { assembleSystemPrompt, extractKiBContext } from "@/lib/prompt-assembly";
import { z } from "zod";

export const maxDuration = 300;

// Phase 18 — stap 6: business-case Q&A voor dossier.kostenraming.
// Eerst genereert AI concrete business-case vragen op basis van een inspanning;
// daarna verwerkt AI de antwoorden naar een scherpe eerste raming.

// inputType is altijd "text" zodat gebruiker ook beschrijvende antwoorden kan
// geven (bv. "ongeveer 40 man, verschillend per sector", "weten we nog niet
// precies"). De AI verwerkt vrije tekst in de estimate-stap.
const QuestionsSchema = z.object({
  questions: z
    .array(
      z.object({
        key: z.string(),
        vraag: z.string(),
        toelichting: z.string().optional().default(""),
        inputType: z.literal("text").optional().default("text"),
        opties: z.array(z.string()).optional().default([]),
        eenheid: z.string().optional().default(""),
      })
    )
    .min(1)
    .max(12),
});

const EstimateSchema = z.object({
  kostenraming: z.string(),
  aannames: z.array(z.string()).min(1),
  risicos: z.array(z.string()).optional().default([]),
});

// Gericht fineuten: alleen voor door de gebruiker geselecteerde vragen een
// AI-voorstel voor het antwoord teruggeven. De overige antwoorden blijven
// onaangeroerd — geen full-regen.
const RefineAnswersSchema = z.object({
  suggestedAnswers: z.record(z.string(), z.string()),
});

const QUESTIONS_PROMPT = `Je bent een business-case expert. Genereer 4-8 scherpe vragen die helpen bij het maken van een eerste kostenraming voor één cross-sectorale inspanning binnen Cito BV (PO + VO + Zakelijk).

Input JSON:
{
  "entry": { domein, titel, beschrijving, beargumentatie, vermogenImpact },
  "focusDoel": { naam, beschrijving }
}

Output: { "questions": [{ key, vraag, toelichting, inputType, opties?, eenheid? }, ...] }

Regels:
- Vragen moeten concreet rekenmateriaal opleveren voor kostenraming, MAAR ook ruimte laten voor omschrijvingen. Gebruiker is niet altijd zeker van getallen.
- Denk aan: aantal medewerkers per sector, looptijd, externe inhuur, platform-licenties, implementatie-uren, trainingsdagen, locaties.
- Stem vragen af op het domein: Mens → training/uren/FTE; Data & Systemen → licentie/integratie/hardware; Processen → procesdesign-uren/workshops; Cultuur → leiderschapsprogramma/coaching-dagen.
- **inputType is ALTIJD "text"** — geen number, geen select. Zo kan gebruiker ook antwoorden geven zoals "circa 40, meer voor VO" of "weten we nog niet precies, schatting 60". De estimate-AI verwerkt vrije tekst.
- Formuleer vragen zo dat zowel een getal als een omschrijving werkt. Stel niet "Hoeveel FTE?" maar "Hoeveel FTE of medewerkers — een schatting of range mag ook".
- Eenheid duidelijk benoemen in het veld \`eenheid\` (FTE, uren, €, weken, licenties) zodat gebruiker context heeft.
- Keys kort en snake_case.
- **VERPLICHT — voeg ook 2 vragen toe over INTERNE UREN van Cito-medewerkers** (niet alleen out-of-pocket):
  1. "Welke Cito-rollen verwacht je nodig voor deze inspanning? Denk aan: Sectormanager PO/VO/Professionals, Productmanager, Toetsdeskundige A/B/C, Manager Data & Technologie, Trainer/Adviseur, Procesmanager, Projectmanager." (key: \`interne_rollen\`, eenheid: rol-namen)
  2. "Hoeveel interne uren per rol per jaar verwacht je? Range of ruwe schatting mag." (key: \`interne_uren_per_rol\`, eenheid: uren/jaar)
  Die antwoorden worden gebruikt voor de interne-uren-planning in stap 7 — belangrijk om die apart uit te vragen naast externe kosten.
- Geef tenminste 6, max 10 vragen (inclusief de 2 interne-uren vragen).
- Alles in Nederlands, JSON only.`;

const ESTIMATE_PROMPT = `Je bent een business-case expert. Op basis van de antwoorden op business-case vragen maak je een eerste kostenraming (dossier.kostenraming) voor één cross-sectorale inspanning.

Input JSON:
{
  "entry": { domein, titel, beschrijving },
  "questions": [{ key, vraag, eenheid }],
  "answers": { "<key>": "<antwoord>" }
}

Output JSON:
{
  "kostenraming": "<2-3 zinnen met eerste raming; gebruik €-symbool, geef orde van grootte en looptijd, benoem welk deel eenmalig en welk structureel>",
  "aannames": ["<1 zin per aanname die de raming steunt>", ...],
  "risicos": ["<optioneel: 1 zin per risico dat de raming kan veranderen>"]
}

Regels:
- **Antwoorden kunnen vrije tekst zijn.** Verwerk zowel concrete getallen ("40 FTE") als omschrijvingen ("ongeveer 30-50, meer in VO dan PO", "weten we nog niet", "in de orde van €100K").
  Als een antwoord een range of schatting geeft: gebruik het middenpunt en vermeld de onzekerheid in aannames.
  Als een antwoord "onbekend" of leeg is: gebruik redelijke Cito-benchmarks (trainingsdag €800, FTE/jaar €100K, consultantuur €120) en zet dat in aannames.
- Gebruik de antwoorden verschillend per domein:
  Mens: FTE × trainings-dagtarief; content-ontwikkeling eenmalig
  Data & Systemen: licentie/jaar × jaren + implementatie-uren × rate; hardware eenmalig
  Processen: proces-design-uren × rate; workshops × aantal × cost
  Cultuur: coaching-dagen × rate; externe begeleider × dagen
- Rond op significante cijfers (€75K niet €74.367).
- Benoem schaalvoordeel als aantal sectoren > 1.
- Minstens 1 aanname, 0-3 risico's.
- **HARDE REGEL — INTERNE UREN HOREN NIET IN DEZE OUT-OF-POCKET KOSTENRAMING.**
  De \`kostenraming\` is bedoeld voor de §4.1 Out-of-pocket-tabel: alleen externe
  kasuitgaven (licenties, externe inhuur, software, hardware, externe trainers,
  externe procesbegeleiders, externe coaches). Interne uren van Cito-medewerkers
  zijn opportunity-kosten en horen in §4.2 Interne uren — NIET in deze raming.
  Concreet:
  - NEEM NIET MEE in de eenmalige of structurele bedragen: interne FTE × tarief,
    interne werkgroepuren, interne curricuulumontwikkeling-uren, interne
    proceseigenaarschap-uren, interne uren van projectleiders/architecten/HR.
  - WEL MEENEMEN: alle externe kasuitgaven inclusief externe inhuur die als
    "interne capaciteit" wordt ingezet (bv. externe consultants).
  - Als een antwoord interne uren noemt (bv. "740u intern à €77/u"): vermeld die
    alleen in \`aannames\` met de expliciete tekst "interne uren — wordt in §4.2
    Interne uren geboekt, niet in deze out-of-pocket raming". Zet die euro's
    NIET op in de \`kostenraming\`-tekst en NIET in de eenmalige/structurele
    totalen.
- Nederlands, € symbool, JSON only.`;

const REFINE_ANSWERS_PROMPT = `Je bent een business-case expert voor Cito BV (PO + VO + Zakelijk). De gebruiker heeft een set vragen gekregen voor een kostenraming. Voor een SUBSET van die vragen wil de gebruiker dat jij een realistisch antwoord voorstelt — de rest blijft onaangeroerd.

Input JSON:
{
  "entry": { domein, titel, beschrijving, beargumentatie, vermogenImpact },
  "focusDoel": { naam, beschrijving },
  "questionsToRefine": [{ key, vraag, toelichting, eenheid }],
  "currentAnswers": { "<key>": "<huidig antwoord of leeg>" },
  "userInstructie": "<optioneel: specifieke wensen van de gebruiker>"
}

Output JSON:
{
  "suggestedAnswers": {
    "<key>": "<voorgesteld antwoord — 1-3 regels, redelijk onderbouwd>",
    ...
  }
}

Regels:
- Geef ALLEEN antwoorden voor de keys in "questionsToRefine" — niks extra.
- Gebruik Cito-context: PO ≈ 6000 leerkrachten, VO ≈ 3000 docenten, Zakelijk-professionals-markt. Trainingsdag ≈ €800 p.p., FTE/jaar ≈ €100K, consultantuur ≈ €120.
- Als er een currentAnswer is: verfijn/aanscherp dat antwoord (respecteer de richting van de gebruiker), niet overschrijven met iets totaal anders.
- Als currentAnswer leeg is: stel een realistische eerste schatting voor.
- Vermeld altijd een range of orde van grootte als dat helpt ("40-60 medewerkers, ±50 als middenpunt").
- Antwoorden mogen vrij tekstueel zijn — omschrijving + getal mag ("ongeveer 40 per sector, verdeeld over 2 jaar").
- Pas de eenheid toe uit de vraag (FTE / uren / € / weken / licenties).
- Respecteer userInstructie als aanwezig (bv. "minder ambitieus", "focus op VO-sector").
- Nederlands, JSON only, geen markdown.`;

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { mode } = body as { mode?: "questions" | "estimate" | "refine-answers" };

    const kibContext = extractKiBContext(body);

    if (mode === "questions") {
      const systemPrompt = assembleSystemPrompt(QUESTIONS_PROMPT, "cross-analyse", undefined, kibContext);
      const userMessage = JSON.stringify({ entry: body.entry, focusDoel: body.focusDoel }, null, 2);
      const result = await callClaudeWithValidation(QuestionsSchema, systemPrompt, userMessage, { maxTokens: 2048 });
      if (!result.success) {
        return NextResponse.json({ success: false, error: "Vragen genereren mislukt" }, { status: 502 });
      }
      return NextResponse.json({ success: true, data: result.data });
    }

    if (mode === "estimate") {
      const systemPrompt = assembleSystemPrompt(ESTIMATE_PROMPT, "cross-analyse", undefined, kibContext);
      const userMessage = JSON.stringify(
        {
          entry: body.entry,
          questions: body.questions,
          answers: body.answers,
        },
        null,
        2
      );
      const result = await callClaudeWithValidation(EstimateSchema, systemPrompt, userMessage, { maxTokens: 2048 });
      if (!result.success) {
        return NextResponse.json({ success: false, error: "Raming genereren mislukt" }, { status: 502 });
      }
      return NextResponse.json({ success: true, data: result.data });
    }

    if (mode === "refine-answers") {
      const systemPrompt = assembleSystemPrompt(REFINE_ANSWERS_PROMPT, "cross-analyse", undefined, kibContext);
      const userMessage = JSON.stringify(
        {
          entry: body.entry,
          focusDoel: body.focusDoel,
          questionsToRefine: body.questionsToRefine,
          currentAnswers: body.currentAnswers,
          userInstructie: body.userInstructie ?? "",
        },
        null,
        2
      );
      const result = await callClaudeWithValidation(RefineAnswersSchema, systemPrompt, userMessage, { maxTokens: 2048 });
      if (!result.success) {
        return NextResponse.json({ success: false, error: "Fineuten mislukt" }, { status: 502 });
      }
      return NextResponse.json({ success: true, data: result.data });
    }

    return NextResponse.json(
      { success: false, error: "mode is verplicht: 'questions' | 'estimate' | 'refine-answers'" },
      { status: 400 }
    );
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Onbekende fout";
    return NextResponse.json({ success: false, error: msg }, { status: 500 });
  }
}
