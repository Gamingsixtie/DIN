// AI Client — Claude API wrapper voor DIN-mapping
// Gebruikt Anthropic SDK server-side

import Anthropic from "@anthropic-ai/sdk";
import {
  DIN_MAPPING_PROMPT,
  CROSS_ANALYSE_PROMPT,
  PROGRAMMAPLAN_PROMPT,
  BATENPROFIEL_PROMPT,
  SECTORPLAN_ANALYSE_PROMPT,
  DIN_SUGGEST_BAAT_PROMPT,
  DIN_SUGGEST_VERMOGEN_PROMPT,
  DIN_SUGGEST_INSPANNING_PROMPT,
} from "./prompts";

function getClient(): Anthropic {
  return new Anthropic();
}

async function callClaude(
  systemPrompt: string,
  userMessage: string
): Promise<string> {
  const client = getClient();
  const response = await client.messages.create({
    model: "claude-sonnet-4-6",
    max_tokens: 4096,
    system: systemPrompt,
    messages: [{ role: "user", content: userMessage }],
  });

  const textBlock = response.content.find((b) => b.type === "text");
  return textBlock ? textBlock.text : "";
}

export async function generateDINMapping(
  goal: { name: string; description: string },
  sectorPlan: { sectorName: string; rawText: string } | null,
  sector: string
): Promise<string> {
  const userMessage = `
Doel: ${goal.name}
Beschrijving: ${goal.description}

Sector: ${sector}
${sectorPlan ? `Sectorplan ${sectorPlan.sectorName}:\n${sectorPlan.rawText.slice(0, 3000)}` : "Geen sectorplan beschikbaar."}

Genereer het DIN-netwerk voor dit doel specifiek voor sector ${sector}.

Antwoord als JSON met de volgende structuur:
{
  "benefits": [{"description": "...", "profiel": {"indicator": "...", "indicatorOwner": "...", "currentValue": "...", "targetValue": "..."}}],
  "capabilities": [{"description": "..."}],
  "efforts": [{"description": "...", "domain": "mens|processen|data_systemen|cultuur", "quarter": "Q1 2026"}]
}`;

  return callClaude(DIN_MAPPING_PROMPT, userMessage);
}

export async function generateCrossAnalyse(
  data: Record<string, unknown>
): Promise<string> {
  const userMessage = `Analyseer de volgende DIN-data:\n${JSON.stringify(data, null, 2).slice(0, 6000)}`;
  return callClaude(CROSS_ANALYSE_PROMPT, userMessage);
}

export async function generateProgrammaPlan(
  sessionData: Record<string, unknown>
): Promise<string> {
  const userMessage = `Genereer een programmaplan op basis van:\n${JSON.stringify(sessionData, null, 2).slice(0, 6000)}`;
  return callClaude(PROGRAMMAPLAN_PROMPT, userMessage);
}

export async function generateBatenprofiel(
  benefit: { description: string }
): Promise<string> {
  const userMessage = `Baat: ${benefit.description}\n\nStel een volledig batenprofiel op.`;
  return callClaude(BATENPROFIEL_PROMPT, userMessage);
}

export async function suggestDINItem(
  type: "baat" | "vermogen" | "inspanning",
  context: {
    sector: string;
    goalName?: string;
    goalDescription?: string;
    sectorPlanText?: string;
    existingDescription?: string;
    relatedBenefits?: string[];
    relatedCapabilities?: string[];
    domain?: string;
  }
): Promise<string> {
  const promptMap = {
    baat: DIN_SUGGEST_BAAT_PROMPT,
    vermogen: DIN_SUGGEST_VERMOGEN_PROMPT,
    inspanning: DIN_SUGGEST_INSPANNING_PROMPT,
  };

  const parts: string[] = [`Sector: ${context.sector}`];

  if (context.goalName) {
    parts.push(`Programmadoel: ${context.goalName}`);
    if (context.goalDescription) parts.push(`Doelbeschrijving: ${context.goalDescription}`);
  }
  if (context.sectorPlanText) {
    parts.push(`Sectorplan (samenvatting):\n${context.sectorPlanText.slice(0, 2000)}`);
  }
  if (context.existingDescription) {
    parts.push(`Bestaande beschrijving: "${context.existingDescription}"\nVerbeter of vul aan.`);
  } else {
    parts.push("Er is nog geen beschrijving. Genereer een nieuwe suggestie.");
  }
  if (context.relatedBenefits?.length) {
    parts.push(`Gerelateerde baten:\n${context.relatedBenefits.map((b, i) => `${i + 1}. ${b}`).join("\n")}`);
  }
  if (context.relatedCapabilities?.length) {
    parts.push(`Gerelateerde vermogens:\n${context.relatedCapabilities.map((c, i) => `${i + 1}. ${c}`).join("\n")}`);
  }
  if (context.domain) {
    parts.push(`Domein: ${context.domain}`);
  }

  return callClaude(promptMap[type], parts.join("\n\n"));
}

export async function analyzeSectorPlan(
  sectorName: string,
  planText: string,
  goals: { name: string; description: string }[]
): Promise<string> {
  const goalsText = goals.length > 0
    ? goals.map((g, i) => `${i + 1}. ${g.name}: ${g.description}`).join("\n")
    : "Nog geen programmadoelen beschikbaar.";

  const userMessage = `Sector: ${sectorName}

Programmadoelen:
${goalsText}

Sectorplan:
${planText.slice(0, 5000)}

Analyseer dit sectorplan en geef advies voor het DIN-netwerk.`;

  return callClaude(SECTORPLAN_ANALYSE_PROMPT, userMessage);
}
