// AI Client — Claude API wrapper voor DIN-mapping
// Gebruikt Anthropic SDK server-side

import Anthropic from "@anthropic-ai/sdk";
import {
  DIN_MAPPING_PROMPT,
  CROSS_ANALYSE_PROMPT,
  SECTOR_INTEGRATIE_PROMPT,
  PROGRAMMAPLAN_PROMPT,
  BATENPROFIEL_PROMPT,
  SECTORPLAN_ANALYSE_PROMPT,
  VERRIJKT_SECTORPLAN_PROMPT,
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
  "benefits": [{"description": "...", "profiel": {"indicator": "...", "indicatorOwner": "...", "currentValue": "...", "targetValue": "..."}}],
  "capabilities": [{"description": "..."}],
  "efforts": [{"description": "...", "domain": "mens|processen|data_systemen|cultuur", "quarter": "Q1 2026"}]
}`);

  return callClaude(DIN_MAPPING_PROMPT, parts.join("\n"));
}

export async function generateCrossAnalyse(
  data: Record<string, unknown>
): Promise<string> {
  const userMessage = `Analyseer de volgende DIN-data:\n${JSON.stringify(data, null, 2).slice(0, 6000)}`;
  return callClaude(CROSS_ANALYSE_PROMPT, userMessage);
}

export async function generateSectorIntegratie(data: {
  sector: string;
  sectorPlan: string;
  goals: { name: string; description: string }[];
  benefits: { description: string; profiel?: { indicator?: string; targetValue?: string } }[];
  capabilities: { description: string; currentLevel?: number; targetLevel?: number }[];
  efforts: { description: string; domain: string; quarter?: string; status?: string }[];
  externalProjects?: { name: string; description: string; status: string; relevance?: string }[];
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

  parts.push("\n--- Lopende projecten BUITEN het programma ---");
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

  parts.push("\n--- Oorspronkelijk sectorplan ---");
  if (data.sectorPlan && data.sectorPlan.trim().length > 0 && !data.sectorPlan.startsWith("[")) {
    parts.push(data.sectorPlan.slice(0, 5000));
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

  parts.push("\nSchrijf nu het verrijkte sectorplan dat het oorspronkelijke plan combineert met alle DIN-items en KiB-doelen.");

  return callClaude(VERRIJKT_SECTORPLAN_PROMPT, parts.join("\n"));
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
