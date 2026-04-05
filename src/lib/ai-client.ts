// AI Client — Claude API wrapper voor DIN-mapping
// Gebruikt Anthropic SDK server-side

import Anthropic from "@anthropic-ai/sdk";
import { z } from "zod";
import {
  DIN_MAPPING_PROMPT,
  CROSS_ANALYSE_PROMPT,
  SECTOR_INTEGRATIE_PROMPT,
  BATENPROFIEL_PROMPT,
  SECTORPLAN_ANALYSE_PROMPT,
  VERRIJKT_SECTORPLAN_PROMPT,
  DIN_SUGGEST_BAAT_PROMPT,
  DIN_SUGGEST_VERMOGEN_PROMPT,
  DIN_SUGGEST_INSPANNING_PROMPT,
  DIN_CREATE_BAAT_PROMPT,
  DIN_CREATE_VERMOGEN_PROMPT,
  DIN_CREATE_INSPANNING_PROMPT,
  DIN_DOMAIN_RECOMMEND_PROMPT,
  PROJECT_EXTRACTION_PROMPT,
  PROJECT_CAPABILITY_MATCHING_PROMPT,
  PROJECT_PROMOTIE_PROMPT,
} from "./prompts";
import {
  AIProjectExtractionResponseSchema,
  AIProjectCapabilityMatchResponseSchema,
  ProjectPromotieResultSchema,
} from "./schemas";
import {
  assembleSystemPrompt,
  buildSectorwerkBlock,
  buildCompletedGoalsContext,
} from "./prompt-assembly";
import type { KiBContext, CompletedGoalContext } from "./prompt-assembly";
import type {
  ExternalProject,
  DINBenefit,
  DINCapability,
  SectorplanAnalyseResult,
} from "./types";

function getClient(): Anthropic {
  return new Anthropic();
}

async function callClaude(
  systemPrompt: string,
  userMessage: string,
  maxTokens?: number,
  model: "claude-sonnet-4-6" | "claude-opus-4-6" = "claude-sonnet-4-6"
): Promise<string> {
  const client = getClient();
  const response = await client.messages.create({
    model,
    max_tokens: maxTokens || 4096,
    system: systemPrompt,
    messages: [{ role: "user", content: userMessage }],
  });

  const textBlock = response.content.find((b) => b.type === "text");
  return textBlock ? textBlock.text : "";
}

// ============================================================
// AI Response parsing & validation (per D-01, D-02, D-03, D-04)
// ============================================================

export type ParseResult<T> =
  | { success: true; data: T }
  | { success: false; error: string; retryable: boolean };

/**
 * Extract JSON uit een AI response string.
 * Verwijdert markdown code blocks en zoekt naar het eerste valide JSON object.
 */
export function extractJSON(raw: string): string | null {
  if (!raw || raw.trim().length === 0) return null;

  const cleaned = raw
    .replace(/^```(?:json)?\s*/i, "")
    .replace(/\s*```\s*$/i, "")
    .trim();

  // Probeer de hele cleaned string als JSON te parsen
  try {
    JSON.parse(cleaned);
    return cleaned;
  } catch { /* ga door naar regex fallback */ }

  // Fallback: zoek naar JSON object in de tekst
  const match = cleaned.match(/\{[\s\S]*\}/);
  if (match) {
    try {
      JSON.parse(match[0]);
      return match[0];
    } catch { /* geen valide JSON gevonden */ }
  }

  return null;
}

/**
 * Parse en valideer een AI response string tegen een Zod schema.
 * Retourneert ParseResult met data bij succes, of foutmelding met retryable flag.
 */
export function parseAIResponse<T>(raw: string, schema: z.ZodType<T>): ParseResult<T> {
  const jsonStr = extractJSON(raw);
  if (!jsonStr) {
    return {
      success: false,
      error: "Geen geldig JSON in AI-antwoord",
      retryable: true,
    };
  }

  let parsed: unknown;
  try {
    parsed = JSON.parse(jsonStr);
  } catch {
    return {
      success: false,
      error: "Ongeldig JSON formaat",
      retryable: true,
    };
  }

  const result = schema.safeParse(parsed);
  if (!result.success) {
    const issues = result.error.issues.map((i) => i.message).join(", ");
    return {
      success: false,
      error: `Onverwachte AI-structuur: ${issues}`,
      retryable: true,
    };
  }

  return { success: true, data: result.data };
}

/**
 * Roep Claude aan met automatische JSON validatie en retry logica.
 * Bij ongeldige response: maximaal 2 stille retries (per D-01).
 * Na alle pogingen gefaald: foutmelding met context (per D-02).
 */
export async function callClaudeWithValidation<T>(
  schema: z.ZodType<T>,
  systemPrompt: string,
  userMessage: string,
  options?: { maxTokens?: number; model?: string }
): Promise<{ success: true; data: T } | { success: false; error: string }> {
  const MAX_RETRIES = 2;
  let lastError = "";

  for (let attempt = 0; attempt <= MAX_RETRIES; attempt++) {
    const raw = await callClaude(
      systemPrompt,
      userMessage,
      options?.maxTokens,
      (options?.model as "claude-sonnet-4-6" | "claude-opus-4-6") || "claude-sonnet-4-6"
    );
    const result = parseAIResponse(raw, schema);
    if (result.success) {
      return { success: true, data: result.data };
    }
    lastError = result.error;
  }

  return { success: false, error: lastError };
}

export async function generateDINMapping(
  goal: { name: string; description: string },
  sectorPlan: { sectorName: string; rawText: string } | null,
  sector: string,
  allGoals?: { name: string; description: string }[],
  sectorAnalysis?: string
): Promise<string> {
  const parts: string[] = [];

  parts.push(`Doel: ${goal.name}`);
  parts.push(`Beschrijving: ${goal.description}`);
  parts.push(`Sector: ${sector}`);

  // Alle KiB-doelen als context
  if (allGoals && allGoals.length > 1) {
    parts.push("\nOverige KiB-programmadoelen (voor context):");
    allGoals
      .filter((g) => g.name !== goal.name)
      .forEach((g, i) => {
        parts.push(`${i + 1}. ${g.name}${g.description ? `: ${g.description}` : ""}`);
      });
  }

  // Sectorplan
  if (sectorPlan) {
    parts.push(`\nSectorplan ${sectorPlan.sectorName}:\n${sectorPlan.rawText.slice(0, 3000)}`);
  } else {
    parts.push("\nGeen sectorplan beschikbaar.");
  }

  // AI-analyse van het sectorplan (als die er is)
  if (sectorAnalysis) {
    // Probeer gestructureerde JSON-analyse leesbaar samen te vatten
    let analysisSummary = sectorAnalysis;
    try {
      const jsonMatch = sectorAnalysis.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        const parsed = JSON.parse(jsonMatch[0]);
        if (parsed.samenvatting) {
          const summaryParts: string[] = [];
          summaryParts.push(`Samenvatting: ${parsed.samenvatting}`);
          if (parsed.aansluiting?.punten?.length) {
            summaryParts.push(`\nAansluiting op KiB-doelen:\n${parsed.aansluiting.punten.map((p: string) => `- ${p}`).join("\n")}`);
          }
          if (parsed.baten?.punten?.length) {
            summaryParts.push(`\nVoorgestelde baten:\n${parsed.baten.punten.map((p: string) => `- ${p}`).join("\n")}`);
          }
          if (parsed.vermogens?.punten?.length) {
            summaryParts.push(`\nBenodigde vermogens:\n${parsed.vermogens.punten.map((p: string) => `- ${p}`).join("\n")}`);
          }
          if (parsed.inspanningen) {
            const domains = { mens: "Mens", processen: "Processen", data_systemen: "Data & Systemen", cultuur: "Cultuur" };
            const domainParts: string[] = [];
            for (const [key, label] of Object.entries(domains)) {
              const items = parsed.inspanningen[key];
              if (items?.length) {
                domainParts.push(`  ${label}: ${items.map((i: string) => i).join("; ")}`);
              }
            }
            if (domainParts.length) {
              summaryParts.push(`\nVoorgestelde inspanningen:\n${domainParts.join("\n")}`);
            }
          }
          if (parsed.aandachtspunten?.punten?.length) {
            summaryParts.push(`\nAandachtspunten:\n${parsed.aandachtspunten.punten.map((p: string) => `- ${p}`).join("\n")}`);
          }
          analysisSummary = summaryParts.join("\n");
        }
      }
    } catch { /* gebruik originele string */ }
    parts.push(`\nEerdere AI-analyse van het sectorplan:\n${analysisSummary.slice(0, 3000)}`);
  }

  parts.push(`\nGenereer het DIN-netwerk voor dit doel specifiek voor sector ${sector}.`);
  parts.push(`Baseer je op het sectorplan en de analyse daarvan. Zorg dat de baten, vermogens en inspanningen concreet aansluiten bij wat in het sectorplan staat.`);
  parts.push(`\nAntwoord als JSON met de volgende structuur:
{
  "benefits": [{"title": "Kort label in vergrotende trap (max 5 woorden)", "description": "Uitgebreide toelichting (1-2 zinnen)", "profiel": {"bateneigenaar": "Rol eindverantwoordelijke", "indicator": "Meetbare KPI", "indicatorOwner": "Rol meetverantwoordelijke", "currentValue": "Startwaarde", "targetValue": "Doelwaarde"}}],
  "capabilities": [{"title": "Kort label (wat moet de org KUNNEN)", "description": "Uitgebreide toelichting (1-2 zinnen)", "currentLevel": 2, "targetLevel": 4, "profiel": {"eigenaar": "Rol verantwoordelijk voor opbouw", "huidieSituatie": "Korte as-is beschrijving", "gewensteSituatie": "Korte to-be beschrijving"}}],
  "efforts": [{"title": "Kort actielabel met werkwoorden", "description": "Uitgebreide toelichting (1-2 zinnen)", "domain": "mens|processen|data_systemen|cultuur", "quarter": "Q1 2026", "dossier": {"eigenaar": "Opdrachtgever", "inspanningsleider": "Projectleider", "verwachtResultaat": "Beoogd resultaat", "kostenraming": "Raming + marge", "randvoorwaarden": "Voorwaarden vóór start"}}]
}`);

  return callClaude(DIN_MAPPING_PROMPT, parts.join("\n"), 8192);
}

export async function generateCrossAnalyse(
  data: Record<string, unknown>
): Promise<string> {
  const userMessage = `Analyseer de volgende DIN-data:\n${JSON.stringify(data, null, 2).slice(0, 15000)}`;
  return callClaude(CROSS_ANALYSE_PROMPT, userMessage, 8192, "claude-opus-4-6");
}

export async function generateSectorIntegratie(data: {
  sector: string;
  sectorPlan: string;
  goals: { name: string; description: string }[];
  benefits: { description: string; profiel?: { indicator?: string; targetValue?: string } }[];
  capabilities: { description: string; currentLevel?: number; targetLevel?: number }[];
  efforts: { description: string; domain: string; quarter?: string; status?: string }[];
  externalProjects?: { name: string; description: string; status: string; relevance?: string }[];
  sectorAnalysis?: string;
}): Promise<string> {
  const domainLabels: Record<string, string> = {
    mens: "Mens",
    processen: "Processen",
    data_systemen: "Data & Systemen",
    cultuur: "Cultuur",
  };

  const parts: string[] = [];
  parts.push(`=== Sector: ${data.sector} ===`);

  parts.push("\n--- KiB Programmadoelen ---");
  if (data.goals.length > 0) {
    data.goals.forEach((g, i) => {
      parts.push(`${i + 1}. ${g.name}${g.description ? `: ${g.description}` : ""}`);
    });
  } else {
    parts.push("Nog geen doelen beschikbaar.");
  }

  parts.push("\n--- Sectorplan ---");
  if (data.sectorPlan && data.sectorPlan.trim().length > 0 && !data.sectorPlan.startsWith("[")) {
    parts.push(data.sectorPlan.slice(0, 4000));
  } else {
    parts.push("Geen sectorplan beschikbaar.");
  }

  parts.push("\n--- Huidige DIN-baten voor deze sector ---");
  if (data.benefits.length > 0) {
    data.benefits.forEach((b, i) => {
      let line = `${i + 1}. ${b.description}`;
      if (b.profiel?.indicator) line += ` (indicator: ${b.profiel.indicator}, doel: ${b.profiel.targetValue || "?"})`;
      parts.push(line);
    });
  } else {
    parts.push("Nog geen baten ingevuld.");
  }

  parts.push("\n--- Huidige DIN-vermogens voor deze sector ---");
  if (data.capabilities.length > 0) {
    data.capabilities.forEach((c, i) => {
      let line = `${i + 1}. ${c.description}`;
      if (c.currentLevel && c.targetLevel) line += ` (niveau: ${c.currentLevel}/5 \u2192 ${c.targetLevel}/5)`;
      parts.push(line);
    });
  } else {
    parts.push("Nog geen vermogens ingevuld.");
  }

  parts.push("\n--- Huidige DIN-inspanningen voor deze sector ---");
  if (data.efforts.length > 0) {
    const byDomain: Record<string, typeof data.efforts> = {};
    data.efforts.forEach((e) => {
      const domain = domainLabels[e.domain] || e.domain;
      if (!byDomain[domain]) byDomain[domain] = [];
      byDomain[domain].push(e);
    });
    Object.entries(byDomain).forEach(([domain, efforts]) => {
      parts.push(`  ${domain}:`);
      efforts.forEach((e) => {
        let line = `    - ${e.description}`;
        if (e.quarter) line += ` (${e.quarter})`;
        if (e.status && e.status !== "gepland") line += ` [${e.status}]`;
        parts.push(line);
      });
    });
  } else {
    parts.push("Nog geen inspanningen ingevuld.");
  }

  if (data.sectorAnalysis) {
    parts.push("\n--- Eerdere AI-analyse van het sectorplan ---");
    let analysisSummary = data.sectorAnalysis;
    try {
      const jsonMatch = data.sectorAnalysis.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        const parsed = JSON.parse(jsonMatch[0]);
        if (parsed.samenvatting) {
          const summaryParts: string[] = [];
          summaryParts.push(`Samenvatting: ${parsed.samenvatting}`);
          if (parsed.aansluiting?.punten?.length) {
            summaryParts.push(`Aansluiting op KiB-doelen:\n${parsed.aansluiting.punten.map((p: string) => `- ${p}`).join("\n")}`);
          }
          if (parsed.baten?.punten?.length) {
            summaryParts.push(`Voorgestelde baten:\n${parsed.baten.punten.map((p: string) => `- ${p}`).join("\n")}`);
          }
          if (parsed.vermogens?.punten?.length) {
            summaryParts.push(`Benodigde vermogens:\n${parsed.vermogens.punten.map((p: string) => `- ${p}`).join("\n")}`);
          }
          if (parsed.inspanningen) {
            const domains = { mens: "Mens", processen: "Processen", data_systemen: "Data & Systemen", cultuur: "Cultuur" };
            const domainParts: string[] = [];
            for (const [key, label] of Object.entries(domains)) {
              const items = parsed.inspanningen[key];
              if (items?.length) {
                domainParts.push(`  ${label}: ${items.map((i: string) => i).join("; ")}`);
              }
            }
            if (domainParts.length) {
              summaryParts.push(`Voorgestelde inspanningen:\n${domainParts.join("\n")}`);
            }
          }
          if (parsed.aandachtspunten?.punten?.length) {
            summaryParts.push(`Aandachtspunten:\n${parsed.aandachtspunten.punten.map((p: string) => `- ${p}`).join("\n")}`);
          }
          analysisSummary = summaryParts.join("\n\n");
        }
      }
    } catch { /* gebruik originele string */ }
    parts.push(analysisSummary.slice(0, 3000));
  }

  parts.push("\n--- Lopende projecten passend bij KiB ---");
  if (data.externalProjects && data.externalProjects.length > 0) {
    data.externalProjects.forEach((p, i) => {
      let line = `${i + 1}. ${p.name}`;
      if (p.description) line += `: ${p.description}`;
      line += ` [${p.status}]`;
      if (p.relevance) line += ` — Relevantie: ${p.relevance}`;
      parts.push(line);
    });
  } else {
    parts.push("Geen externe projecten geregistreerd.");
  }

  parts.push("\nGeef concreet integratie-advies voor deze sector. Verwijs naar specifieke items hierboven, inclusief externe projecten waar relevant.");

  return callClaude(SECTOR_INTEGRATIE_PROMPT, parts.join("\n"));
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
    existingTitle?: string;
    existingDescription?: string;
    existingIndicator?: string;
    existingOwner?: string;
    existingCurrentValue?: string;
    existingTargetValue?: string;
    userPrompt?: string;
    relatedBenefits?: string[];
    relatedCapabilities?: string[];
    domain?: string;
    // Vermogensprofiel velden
    existingEigenaar?: string;
    existingHuidieSituatie?: string;
    existingGewensteSituatie?: string;
    existingCurrentLevel?: number;
    existingTargetLevel?: number;
    // Baten meetmethode velden
    existingMeetmethode?: string;
    existingMeasurementMoment?: string;
    // Inspanningsdossier velden
    existingDossierEigenaar?: string;
    existingQuarter?: string;
    existingInspanningsleider?: string;
    existingVerwachtResultaat?: string;
    existingKostenraming?: string;
    existingRandvoorwaarden?: string;
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
  if (context.existingTitle) {
    parts.push(`Bestaande titel: "${context.existingTitle}"`);
  }
  if (context.existingDescription) {
    parts.push(`Bestaande beschrijving: "${context.existingDescription}"\nVerbeter of vul aan.`);
  } else {
    parts.push("Er is nog geen beschrijving. Genereer een nieuwe suggestie.");
  }
  if (context.existingIndicator) {
    parts.push(`Huidige indicator: "${context.existingIndicator}"`);
  }
  if (context.existingOwner) {
    parts.push(`Huidige eigenaar: "${context.existingOwner}"`);
  }
  if (context.existingCurrentValue) {
    parts.push(`Huidige waarde: "${context.existingCurrentValue}"`);
  }
  if (context.existingTargetValue) {
    parts.push(`Gewenste waarde: "${context.existingTargetValue}"`);
  }
  if (context.existingMeetmethode) {
    parts.push(`Huidige meetmethode: "${context.existingMeetmethode}"`);
  }
  if (context.existingMeasurementMoment) {
    parts.push(`Huidig meetmoment: "${context.existingMeasurementMoment}"`);
  }
  // Vermogensprofiel context
  if (context.existingEigenaar) {
    parts.push(`Huidige eigenaar vermogen: "${context.existingEigenaar}"`);
  }
  if (context.existingHuidieSituatie) {
    parts.push(`Huidige situatie (as-is): "${context.existingHuidieSituatie}"`);
  }
  if (context.existingGewensteSituatie) {
    parts.push(`Gewenste situatie (to-be): "${context.existingGewensteSituatie}"`);
  }
  if (context.existingCurrentLevel) {
    parts.push(`Huidig niveau: ${context.existingCurrentLevel}/5`);
  }
  if (context.existingTargetLevel) {
    parts.push(`Gewenst niveau: ${context.existingTargetLevel}/5`);
  }
  // Inspanningsdossier context
  if (context.existingDossierEigenaar) {
    parts.push(`Huidige opdrachtgever: "${context.existingDossierEigenaar}"`);
  }
  if (context.existingQuarter) {
    parts.push(`Huidige planning: "${context.existingQuarter}"`);
  }
  if (context.existingInspanningsleider) {
    parts.push(`Huidige inspanningsleider: "${context.existingInspanningsleider}"`);
  }
  if (context.existingVerwachtResultaat) {
    parts.push(`Huidig verwacht resultaat: "${context.existingVerwachtResultaat}"`);
  }
  if (context.existingKostenraming) {
    parts.push(`Huidige kostenraming: "${context.existingKostenraming}"`);
  }
  if (context.existingRandvoorwaarden) {
    parts.push(`Huidige randvoorwaarden: "${context.existingRandvoorwaarden}"`);
  }
  if (context.userPrompt) {
    parts.push(`\nGEBRUIKERSINSTRUCTIE (prioriteit!): ${context.userPrompt}`);
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

export async function generateVerrijktSectorplan(data: {
  sector: string;
  sectorPlan: string;
  goals: { name: string; description: string }[];
  benefits: { description: string; profiel?: { indicator?: string; indicatorOwner?: string; currentValue?: string; targetValue?: string } }[];
  capabilities: { description: string; currentLevel?: number; targetLevel?: number }[];
  efforts: { description: string; domain: string; quarter?: string; status?: string }[];
  integratieAdvies?: string;
  externalProjects?: { name: string; description: string; status: string; relevance?: string }[];
}): Promise<string> {
  const domainLabels: Record<string, string> = {
    mens: "Mens",
    processen: "Processen",
    data_systemen: "Data & Systemen",
    cultuur: "Cultuur",
  };

  const parts: string[] = [];
  parts.push(`=== Verrijkt sectorplan voor: ${data.sector} ===`);

  parts.push("\n--- KiB Programmadoelen ---");
  data.goals.forEach((g, i) => {
    parts.push(`${i + 1}. ${g.name}${g.description ? `: ${g.description}` : ""}`);
  });

  parts.push("\n--- Oorspronkelijk sectorplan (VOLLEDIG overnemen in het bijgewerkte plan) ---");
  if (data.sectorPlan && data.sectorPlan.trim().length > 0 && !data.sectorPlan.startsWith("[")) {
    parts.push(data.sectorPlan.slice(0, 10000));
  } else {
    parts.push("Geen oorspronkelijk sectorplan beschikbaar.");
  }

  parts.push("\n--- DIN-baten voor deze sector ---");
  data.benefits.forEach((b, i) => {
    let line = `${i + 1}. ${b.description}`;
    if (b.profiel) {
      if (b.profiel.indicator) line += `\n   Indicator: ${b.profiel.indicator}`;
      if (b.profiel.indicatorOwner) line += `\n   Eigenaar: ${b.profiel.indicatorOwner}`;
      if (b.profiel.currentValue) line += `\n   Huidige waarde: ${b.profiel.currentValue}`;
      if (b.profiel.targetValue) line += `\n   Gewenste waarde: ${b.profiel.targetValue}`;
    }
    parts.push(line);
  });

  parts.push("\n--- DIN-vermogens voor deze sector ---");
  data.capabilities.forEach((c, i) => {
    let line = `${i + 1}. ${c.description}`;
    if (c.currentLevel && c.targetLevel) line += ` (niveau: ${c.currentLevel}/5 \u2192 ${c.targetLevel}/5)`;
    parts.push(line);
  });

  parts.push("\n--- DIN-inspanningen voor deze sector ---");
  const byDomain: Record<string, typeof data.efforts> = {};
  data.efforts.forEach((e) => {
    const domain = domainLabels[e.domain] || e.domain;
    if (!byDomain[domain]) byDomain[domain] = [];
    byDomain[domain].push(e);
  });
  Object.entries(byDomain).forEach(([domain, efforts]) => {
    parts.push(`  ${domain}:`);
    efforts.forEach((e) => {
      let line = `    - ${e.description}`;
      if (e.quarter) line += ` (${e.quarter})`;
      if (e.status && e.status !== "gepland") line += ` [${e.status}]`;
      parts.push(line);
    });
  });

  if (data.integratieAdvies) {
    parts.push("\n--- Integratie-advies ---");
    parts.push(data.integratieAdvies.slice(0, 3000));
  }

  if (data.externalProjects && data.externalProjects.length > 0) {
    parts.push("\n--- Externe projecten ---");
    data.externalProjects.forEach((p, i) => {
      let line = `${i + 1}. ${p.name}`;
      if (p.description) line += `: ${p.description}`;
      line += ` [${p.status}]`;
      if (p.relevance) line += ` — ${p.relevance}`;
      parts.push(line);
    });
  }

  parts.push("\nSchrijf nu het bijgewerkte sectorplan. Neem het oorspronkelijke sectorplan VOLLEDIG over (alle bestaande onderwerpen blijven staan) en voeg een nieuw hoofdstuk 'Programma Klant in Beeld' toe met alle DIN-items.");

  return callClaude(VERRIJKT_SECTORPLAN_PROMPT, parts.join("\n"), 16384);
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

export async function recommendDomain(
  context: {
    sector: string;
    goalName?: string;
    goalDescription?: string;
    benefitTitle?: string;
    benefitDescription?: string;
    benefitIndicator?: string;
    capabilityTitle?: string;
    capabilityDescription?: string;
    sectorPlanText?: string;
    answers: Record<string, string>;
  }
): Promise<string> {
  const parts: string[] = [`Sector: ${context.sector}`];

  // DIN-keten context
  if (context.goalName) {
    parts.push(`Programmadoel: ${context.goalName}`);
    if (context.goalDescription) parts.push(`Doelbeschrijving: ${context.goalDescription}`);
  }
  if (context.benefitTitle || context.benefitDescription) {
    parts.push(`Baat: ${context.benefitTitle || context.benefitDescription}`);
    if (context.benefitIndicator) parts.push(`Indicator: ${context.benefitIndicator}`);
  }
  if (context.capabilityTitle || context.capabilityDescription) {
    parts.push(`Vermogen: ${context.capabilityTitle || context.capabilityDescription}`);
  }
  if (context.sectorPlanText) {
    parts.push(`Sectorplan (samenvatting):\n${context.sectorPlanText.slice(0, 2000)}`);
  }

  // Antwoorden op verkenningsvragen
  parts.push("\nANTWOORDEN OP VERKENNINGSVRAGEN:");
  for (const [key, value] of Object.entries(context.answers)) {
    if (value.trim()) {
      parts.push(`${key}: ${value}`);
    }
  }

  return callClaude(DIN_DOMAIN_RECOMMEND_PROMPT, parts.join("\n\n"));
}

export async function createDINItem(
  type: "baat" | "vermogen" | "inspanning",
  context: {
    sector: string;
    goalName?: string;
    goalDescription?: string;
    benefitTitle?: string;
    benefitDescription?: string;
    benefitIndicator?: string;
    capabilityTitle?: string;
    capabilityDescription?: string;
    sectorPlanText?: string;
    domain?: string;
    answers: Record<string, string>;
  }
): Promise<string> {
  const promptMap = {
    baat: DIN_CREATE_BAAT_PROMPT,
    vermogen: DIN_CREATE_VERMOGEN_PROMPT,
    inspanning: DIN_CREATE_INSPANNING_PROMPT,
  };

  const parts: string[] = [`Sector: ${context.sector}`];

  // Domein BOVENAAN prominent plaatsen voor inspanningen
  if (context.domain && type === "inspanning") {
    parts.push(`⚠️ INSPANNINGSDOMEIN: ${context.domain}\nGenereer een inspanning die UITSLUITEND past binnen het domein "${context.domain}". Alle aspecten (titel, beschrijving, verwacht resultaat) moeten specifiek gericht zijn op dit domein.`);
  }

  // Context-keten tonen
  if (context.goalName) {
    parts.push(`Programmadoel: ${context.goalName}`);
    if (context.goalDescription) parts.push(`Doelbeschrijving: ${context.goalDescription}`);
  }
  if (context.benefitTitle || context.benefitDescription) {
    parts.push(`Gerelateerde baat: ${context.benefitTitle || context.benefitDescription}`);
    if (context.benefitIndicator) parts.push(`Indicator: ${context.benefitIndicator}`);
  }
  if (context.capabilityTitle || context.capabilityDescription) {
    parts.push(`Gerelateerd vermogen: ${context.capabilityTitle || context.capabilityDescription}`);
  }
  if (context.domain && type !== "inspanning") {
    parts.push(`Domein: ${context.domain}`);
  }
  if (context.sectorPlanText) {
    parts.push(`Sectorplan (samenvatting):\n${context.sectorPlanText.slice(0, 2000)}`);
  }

  // Antwoorden van de vragenlijst
  parts.push("\nANTWOORDEN VAN DE GEBRUIKER:");
  for (const [key, value] of Object.entries(context.answers)) {
    if (value.trim()) {
      parts.push(`${key}: ${value}`);
    }
  }

  // Domein ONDERAAN herhalen als afsluiting
  if (context.domain && type === "inspanning") {
    parts.push(`\nHERHALING: Genereer ALLEEN voor domein "${context.domain}". De titel, beschrijving en verwacht resultaat moeten uniek zijn voor dit domein en mogen NIET generiek zijn.`);
  }

  return callClaude(promptMap[type], parts.join("\n\n"));
}

// --- Phase 12: External Project functions ---

export async function extractProjectsFromText(
  rawText: string,
  sectorName: string
): Promise<{ success: true; data: z.infer<typeof AIProjectExtractionResponseSchema> } | { success: false; error: string }> {
  const systemPrompt = PROJECT_EXTRACTION_PROMPT;
  const userMessage = `Sector: ${sectorName}\n\nTekst om te analyseren:\n${rawText.slice(0, 12000)}`;
  return callClaudeWithValidation(AIProjectExtractionResponseSchema, systemPrompt, userMessage, { maxTokens: 4096 });
}

export async function matchProjectsToCapabilities(
  projects: { id: string; name: string; description: string; domains: string[] }[],
  capabilities: { id: string; description: string; sectorId: string }[],
  sectorName: string
): Promise<{ success: true; data: z.infer<typeof AIProjectCapabilityMatchResponseSchema> } | { success: false; error: string }> {
  const systemPrompt = PROJECT_CAPABILITY_MATCHING_PROMPT;
  const userMessage = `Sector: ${sectorName}\n\nProjecten:\n${JSON.stringify(projects, null, 2)}\n\nBeschikbare vermogens:\n${JSON.stringify(capabilities, null, 2)}`;
  return callClaudeWithValidation(AIProjectCapabilityMatchResponseSchema, systemPrompt, userMessage, { maxTokens: 4096 });
}

// ============================================================
// Phase 14 — Project Promotie (D-02, D-05, D-14)
// ============================================================
// Combined-shot AI call: benefit matches + capability matches + 1-4 split efforts + findings.
// Uses Opus 4.6 voor multi-concept redenering en layered system prompt (programmaboek +
// KiB + sectorwerk + eerder-uitgewerkte-doelen) voor methodiek-conformiteit.

export async function promoteExternalProject(
  project: ExternalProject,
  sectorBenefits: DINBenefit[],
  sectorCapabilities: DINCapability[],
  sectorName: string,
  options: {
    kibContext?: KiBContext | null;
    sectorAnalysis?: SectorplanAnalyseResult | null;
    completedGoalItems?: CompletedGoalContext;
    priorProjectCapabilityIds?: string[];
  }
): Promise<
  | { success: true; data: z.infer<typeof ProjectPromotieResultSchema> }
  | { success: false; error: string }
> {
  // Assemble layered system prompt (programmaboek + KiB + sectorwerk + completed goals).
  // De "inspanning-create" useCase injecteert PROGRAMMABOEK_INSPANNINGEN zodat de AI
  // de inspanningendossier-structuur correct weet te vullen.
  let systemPrompt = assembleSystemPrompt(
    PROJECT_PROMOTIE_PROMPT,
    "inspanning-create",
    undefined,
    options.kibContext
  );
  if (options.sectorAnalysis) {
    systemPrompt += buildSectorwerkBlock(options.sectorAnalysis);
  }
  if (options.completedGoalItems && options.completedGoalItems.length > 0) {
    systemPrompt += buildCompletedGoalsContext(options.completedGoalItems);
  }

  // Build user message met gestructureerde IDs (Pitfall 2: voorkomt ID-hallucinatie)
  const parts: string[] = [];
  parts.push(`Sector: ${sectorName}`);
  parts.push(`\nTe promoveren project:`);
  parts.push(`- Naam: ${project.name}`);
  parts.push(`- Beschrijving: ${project.description}`);
  parts.push(`- Status: ${project.status}`);
  if (project.domains?.length) {
    parts.push(`- Domeinen: ${project.domains.join(", ")}`);
  }
  if (project.relevance) {
    parts.push(`- Relevantie: ${project.relevance}`);
  }
  if (options.priorProjectCapabilityIds?.length) {
    parts.push(
      `- Eerder (Phase 12) gekoppeld aan vermogens: ${options.priorProjectCapabilityIds.join(", ")}`
    );
  }

  parts.push(
    `\nBeschikbare DIN-baten voor sector ${sectorName} (gebruik benefitId in response):`
  );
  parts.push(
    JSON.stringify(
      sectorBenefits.map((b) => ({
        id: b.id,
        title: b.title || b.description.slice(0, 60),
        description: b.description,
        indicator: b.profiel?.indicator,
      })),
      null,
      2
    )
  );

  parts.push(
    `\nBeschikbare DIN-vermogens voor sector ${sectorName} (gebruik capabilityId in response):`
  );
  parts.push(
    JSON.stringify(
      sectorCapabilities.map((c) => ({
        id: c.id,
        title: c.title || c.description.slice(0, 60),
        description: c.description,
      })),
      null,
      2
    )
  );

  parts.push(
    `\nPromoveer het project volgens de DIN-methodiek. Retourneer JSON volgens het schema in de system-prompt.`
  );

  const result = await callClaudeWithValidation(
    ProjectPromotieResultSchema,
    systemPrompt,
    parts.join("\n"),
    { maxTokens: 8192, model: "claude-opus-4-6" }
  );

  if (!result.success) {
    return result;
  }

  // Pitfall 2 safeguard: filter capabilityMatches / benefitMatches op bekende IDs.
  // De AI kan soms hallucineren of description i.p.v. id teruggeven — drop die rijen
  // voordat downstream code orphan mappings aanmaakt in de DIN-keten.
  const knownBenefitIds = new Set(sectorBenefits.map((b) => b.id));
  const knownCapabilityIds = new Set(sectorCapabilities.map((c) => c.id));

  const filteredBenefitMatches = result.data.benefitMatches.filter((m) => {
    if (knownBenefitIds.has(m.benefitId)) return true;
    console.warn(
      "[promoteExternalProject] Dropped invalid benefitId from AI response:",
      m.benefitId
    );
    return false;
  });
  const filteredCapabilityMatches = result.data.capabilityMatches.filter((m) => {
    if (knownCapabilityIds.has(m.capabilityId)) return true;
    console.warn(
      "[promoteExternalProject] Dropped invalid capabilityId from AI response:",
      m.capabilityId
    );
    return false;
  });

  return {
    success: true,
    data: {
      ...result.data,
      benefitMatches: filteredBenefitMatches,
      capabilityMatches: filteredCapabilityMatches,
    },
  };
}
