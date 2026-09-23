import { NextRequest, NextResponse } from "next/server";
import { callClaudeWithValidation } from "@/lib/ai-client";
import {
  KpiVragenSchema,
  KpiVoorstelSchema,
  Kpi3sidesSchema,
  KPI_VRAGEN_PROMPT,
  KPI_VOORSTEL_PROMPT,
  KPI_CORRECTIE_PROMPT,
  KPI_3SIDES_PROMPT,
  buildVeldFocus,
  buildVragenFocus,
} from "@/lib/kpi-suggest-prompt";

export const maxDuration = 300;

type KpiMode = "vragen" | "voorstel" | "correctie";
type KpiLevel = "baat" | "vermogen" | "3sides";

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
  // Vermogen-context (voor een specifiek i.p.v. generiek voorstel)
  huidieSituatie?: string;
  gewensteSituatie?: string;
  currentLevel?: number;
  targetLevel?: number;
}

interface KpiSuggestBody {
  mode?: KpiMode;
  level?: KpiLevel;
  item?: KpiItem;
  sector?: string;
  goalName?: string;
  answers?: Record<string, string>;
  userCorrection?: string;
  // Optioneel: welke meetvelden de gebruiker wil laten aanscherpen.
  // Leeg/afwezig = alle velden (zoals BenefitCard's veld-selectie).
  velden?: string[];
  // 3sides-context (level === "3sides"): domein, 2026-fase en de afgesproken
  // deliverables waaruit de oplevering-KPI volgt.
  domein?: string;
  deliverables?: string[];
  fase?: string;
}

const LEVEL_LABEL: Record<KpiLevel, string> = {
  baat: "Baat (gewenst effect in de buitenwereld — outcome-KPI)",
  vermogen: "Vermogen (capaciteit — meet via volwassenheid/maturity + observeerbare indicatoren)",
  "3sides":
    "3sides-deliverable (uitvoeringspartner — KPI = oplevering klaar j/n, geen klant-effect)",
};

/** Bouw het user-message met alle beschikbare context. */
function buildUserMessage(body: KpiSuggestBody): string {
  const {
    level,
    item = {},
    sector,
    goalName,
    answers,
    userCorrection,
    velden,
    domein,
    deliverables,
    fase,
  } = body;
  const parts: string[] = [];

  parts.push(`Niveau: ${LEVEL_LABEL[level as KpiLevel]}`);
  if (sector) parts.push(`Sector: ${sector}`);
  if (goalName) parts.push(`Programmadoel: ${goalName}`);

  // 3sides-context: domein, 2026-fase en de afgesproken deliverables — de
  // bron waaruit de oplevering-KPI (klaar j/n) volgt.
  if (level === "3sides") {
    if (domein) parts.push(`Domein: ${domein}`);
    if (fase) parts.push(`2026-fase: ${fase}`);
    const dlv = (deliverables ?? []).filter((d) => typeof d === "string" && d.trim());
    if (dlv.length > 0) {
      parts.push(
        `Afgesproken deliverables (${dlv.length}):\n${dlv.map((d) => `- ${d}`).join("\n")}`
      );
    }
    return parts.join("\n\n");
  }

  if (item.title) parts.push(`Titel: "${item.title}"`);
  if (item.description) parts.push(`Beschrijving: "${item.description}"`);

  // Vermogen-context: as-is/to-be + maturity — cruciaal voor een SPECIFIEK vermogen-voorstel.
  if (item.huidieSituatie) parts.push(`Huidige situatie (as-is): "${item.huidieSituatie}"`);
  if (item.gewensteSituatie) parts.push(`Gewenste situatie (to-be): "${item.gewensteSituatie}"`);
  if (typeof item.currentLevel === "number" || typeof item.targetLevel === "number") {
    parts.push(`Maturity: nu ${item.currentLevel ?? "?"} → doel ${item.targetLevel ?? "?"} (schaal 1-5)`);
  }

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

  // Veld-focus. Bij 'vragen' richten we de zetvragen op de gekozen velden
  // (gerichter + minder); bij voorstel/correctie scherpen we alleen die velden aan.
  // Leeg = breed / alle velden.
  if (body.mode === "vragen") {
    const vfocus = buildVragenFocus(velden);
    if (vfocus) parts.push(vfocus.trim());
  } else {
    const focus = buildVeldFocus(velden);
    if (focus) parts.push(focus.trim());
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
    if (!level || !["baat", "vermogen", "3sides"].includes(level)) {
      return NextResponse.json(
        { success: false, error: "Level moet 'baat', 'vermogen' of '3sides' zijn" },
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

    // 3sides-oplevering-KPI: één meetbare deliverable-KPI (klaar j/n) voor de
    // uitvoeringspartner. Geen zetvragen/correctie-flow — direct een voorstel.
    if (level === "3sides") {
      const result = await callClaudeWithValidation(
        Kpi3sidesSchema,
        KPI_3SIDES_PROMPT,
        userMessage,
        { maxTokens: 1024, maxRetries: 1 }
      );

      if (!result.success) {
        console.error("[kpi-suggest] AI validation failed (3sides):", result.error);
        return NextResponse.json(
          { success: false, error: result.error, retryable: true },
          { status: 422 }
        );
      }

      return NextResponse.json({
        success: true,
        data: { suggestion: result.data.suggestion },
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
