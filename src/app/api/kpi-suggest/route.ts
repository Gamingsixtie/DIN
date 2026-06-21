import { NextRequest, NextResponse } from "next/server";
import { callClaudeWithValidation } from "@/lib/ai-client";
import {
  KpiVragenSchema,
  KpiVoorstelSchema,
  KPI_VRAGEN_PROMPT,
  KPI_VOORSTEL_PROMPT,
  KPI_CORRECTIE_PROMPT,
} from "@/lib/kpi-suggest-prompt";

export const maxDuration = 300;

type KpiMode = "vragen" | "voorstel" | "correctie";
type KpiLevel = "baat" | "vermogen";

interface KpiItem {
  title?: string;
  description?: string;
  indicator?: string;
  meetmethode?: string;
  currentValue?: string;
  targetValue?: string;
  measurementMoment?: string;
  eigenaar?: string;
  indicatorOwner?: string;
}

interface KpiSuggestBody {
  mode?: KpiMode;
  level?: KpiLevel;
  item?: KpiItem;
  sector?: string;
  goalName?: string;
  answers?: Record<string, string>;
  userCorrection?: string;
}

const LEVEL_LABEL: Record<KpiLevel, string> = {
  baat: "Baat (gewenst effect in de buitenwereld — outcome-KPI)",
  vermogen: "Vermogen (capaciteit — meet via volwassenheid/maturity + observeerbare indicatoren)",
};

/** Bouw het user-message met alle beschikbare context. */
function buildUserMessage(body: KpiSuggestBody): string {
  const { level, item = {}, sector, goalName, answers, userCorrection } = body;
  const parts: string[] = [];

  parts.push(`Niveau: ${LEVEL_LABEL[level as KpiLevel]}`);
  if (sector) parts.push(`Sector: ${sector}`);
  if (goalName) parts.push(`Programmadoel: ${goalName}`);

  if (item.title) parts.push(`Titel: "${item.title}"`);
  if (item.description) parts.push(`Beschrijving: "${item.description}"`);

  // Huidige (deels) ingevulde meetvariabelen — bij 'correctie' is dit het vorige voorstel.
  const huidig: string[] = [];
  if (item.indicator) huidig.push(`Indicator: "${item.indicator}"`);
  if (item.meetmethode) huidig.push(`Meetmethode: "${item.meetmethode}"`);
  if (item.currentValue) huidig.push(`Nulmeting/huidige waarde: "${item.currentValue}"`);
  if (item.targetValue) huidig.push(`Doelwaarde: "${item.targetValue}"`);
  if (item.measurementMoment) huidig.push(`Meetmoment: "${item.measurementMoment}"`);
  if (item.eigenaar) huidig.push(`Eigenaar: "${item.eigenaar}"`);
  if (item.indicatorOwner) huidig.push(`Meetverantwoordelijke: "${item.indicatorOwner}"`);
  if (huidig.length > 0) {
    parts.push(
      `${body.mode === "correctie" ? "VORIGE voorstel (meetvariabelen)" : "Huidige meetvariabelen"}:\n${huidig.join("\n")}`
    );
  }

  // Antwoorden op de eerdere zetvragen.
  if (answers) {
    const ingevuld = Object.entries(answers).filter(
      ([, v]) => typeof v === "string" && v.trim()
    );
    if (ingevuld.length > 0) {
      parts.push(
        `ANTWOORDEN OP DE ZETVRAGEN:\n${ingevuld.map(([k, v]) => `${k}: ${v}`).join("\n")}`
      );
    }
  }

  // Correctie van de gebruiker (prioriteit bij modus 'correctie').
  if (body.mode === "correctie" && userCorrection) {
    parts.push(`GEBRUIKERSCORRECTIE (prioriteit — verwerk dit):\n${userCorrection}`);
  }

  return parts.join("\n\n");
}

export async function POST(request: NextRequest) {
  try {
    const body = (await request.json()) as KpiSuggestBody;
    const { mode, level } = body;

    if (!mode || !["vragen", "voorstel", "correctie"].includes(mode)) {
      return NextResponse.json(
        { success: false, error: "Mode moet 'vragen', 'voorstel' of 'correctie' zijn" },
        { status: 400 }
      );
    }
    if (!level || !["baat", "vermogen"].includes(level)) {
      return NextResponse.json(
        { success: false, error: "Level moet 'baat' of 'vermogen' zijn" },
        { status: 400 }
      );
    }

    // Graceful afhandeling zonder API key — geen exception, wel duidelijke melding.
    if (!process.env.ANTHROPIC_API_KEY) {
      return NextResponse.json(
        { success: false, error: "ANTHROPIC_API_KEY niet geconfigureerd. AI-suggesties niet beschikbaar." },
        { status: 503 }
      );
    }

    const userMessage = buildUserMessage(body);

    if (mode === "vragen") {
      const result = await callClaudeWithValidation(
        KpiVragenSchema,
        KPI_VRAGEN_PROMPT,
        userMessage,
        { maxTokens: 2048, maxRetries: 1 }
      );

      if (!result.success) {
        console.error("[kpi-suggest] AI validation failed (vragen):", result.error);
        return NextResponse.json(
          { success: false, error: result.error, retryable: true },
          { status: 422 }
        );
      }

      return NextResponse.json({
        success: true,
        data: { questions: result.data.questions },
      });
    }

    // mode === "voorstel" | "correctie"
    const systemPrompt = mode === "correctie" ? KPI_CORRECTIE_PROMPT : KPI_VOORSTEL_PROMPT;

    const result = await callClaudeWithValidation(
      KpiVoorstelSchema,
      systemPrompt,
      userMessage,
      { maxTokens: 2048, maxRetries: 1 }
    );

    if (!result.success) {
      console.error(`[kpi-suggest] AI validation failed (${mode}):`, result.error);
      return NextResponse.json(
        { success: false, error: result.error, retryable: true },
        { status: 422 }
      );
    }

    return NextResponse.json({
      success: true,
      data: { suggestion: result.data.suggestion },
    });
  } catch (error) {
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : "Fout bij KPI-suggestie genereren",
      },
      { status: 500 }
    );
  }
}
