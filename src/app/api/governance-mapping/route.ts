import { NextRequest, NextResponse } from "next/server";
import { callClaudeWithValidation } from "@/lib/ai-client";
import {
  AIProgrammaorganisatieSchema,
  AIGovernanceRasciResponseSchema,
} from "@/lib/schemas";
import {
  GOVERNANCE_ORGANISATIE_PROMPT,
  GOVERNANCE_RASCI_PROMPT,
} from "@/lib/prompts";
import { assembleSystemPrompt, extractKiBContext } from "@/lib/prompt-assembly";
import type {
  DINBenefit,
  DINCapability,
  DINEffort,
  SectorName,
  VermogenClusterItem,
  InspanningClusterItem,
  Programmaorganisatie,
} from "@/lib/types";

export const maxDuration = 300;

type OrganisatieBody = {
  mode: "organisatie";
  goals?: { name: string; description: string; rank: number }[];
  scope?: { inScope: string[]; outScope: string[] } | null;
  sectors?: SectorName[];
  benefits?: DINBenefit[];
  capabilities?: DINCapability[];
  efforts?: DINEffort[];
};

type RasciBody = {
  mode: "rasci";
  goals?: { name: string; description: string; rank: number }[];
  scope?: { inScope: string[]; outScope: string[] } | null;
  programmaorganisatie: Programmaorganisatie;
  vermogenClusters?: VermogenClusterItem[];
  inspanningClusters?: InspanningClusterItem[];
};

function truncate(text: string, maxChars: number): string {
  if (text.length <= maxChars) return text;
  return text.slice(0, maxChars) + "…";
}

function buildOrganisatieUserMessage(body: OrganisatieBody): string {
  const parts: string[] = [];

  const sectors = body.sectors ?? ["PO", "VO", "Zakelijk"];
  parts.push(`SECTOREN IN PROGRAMMA: ${sectors.join(", ")}`);

  // Doel-overzicht
  if (body.goals && body.goals.length > 0) {
    parts.push("\nPROGRAMMADOELEN:");
    for (const g of body.goals.slice().sort((a, b) => a.rank - b.rank)) {
      parts.push(`- [${g.rank}] ${g.name} — ${truncate(g.description, 120)}`);
    }
  }

  // Verdeling efforts per domein — helpt AI bij domeineigenaren
  if (body.efforts && body.efforts.length > 0) {
    const perDomein: Record<string, number> = {
      mens: 0,
      processen: 0,
      data_systemen: 0,
      cultuur: 0,
    };
    for (const e of body.efforts) {
      if (e.domain in perDomein) perDomein[e.domain]++;
    }
    parts.push("\nVERDELING INSPANNINGEN PER DOMEIN:");
    parts.push(
      `- Mens: ${perDomein.mens}, Processen: ${perDomein.processen}, Data & Systemen: ${perDomein.data_systemen}, Cultuur: ${perDomein.cultuur}`
    );
  }

  // Top-eigenaren uit dossiers
  if (body.efforts && body.efforts.length > 0) {
    const eigenaarCount = new Map<string, number>();
    const leiderCount = new Map<string, number>();
    for (const e of body.efforts) {
      const eig = e.dossier?.eigenaar?.trim();
      const leider = e.dossier?.inspanningsleider?.trim();
      if (eig) eigenaarCount.set(eig, (eigenaarCount.get(eig) ?? 0) + 1);
      if (leider) leiderCount.set(leider, (leiderCount.get(leider) ?? 0) + 1);
    }
    const topEigenaren = [...eigenaarCount.entries()]
      .sort((a, b) => b[1] - a[1])
      .slice(0, 8);
    const topLeiders = [...leiderCount.entries()]
      .sort((a, b) => b[1] - a[1])
      .slice(0, 8);
    if (topEigenaren.length) {
      parts.push("\nMEEST VOORKOMENDE OPDRACHTGEVERS (uit inspanning-dossiers):");
      for (const [rol, n] of topEigenaren) {
        parts.push(`- ${rol} (${n}×)`);
      }
    }
    if (topLeiders.length) {
      parts.push("\nMEEST VOORKOMENDE INSPANNINGSLEIDERS:");
      for (const [rol, n] of topLeiders) {
        parts.push(`- ${rol} (${n}×)`);
      }
    }
  }

  // Bateneigenaren
  if (body.benefits && body.benefits.length > 0) {
    const batenEig = new Map<string, number>();
    for (const b of body.benefits) {
      const e = b.profiel?.bateneigenaar?.trim();
      if (e) batenEig.set(e, (batenEig.get(e) ?? 0) + 1);
    }
    const top = [...batenEig.entries()].sort((a, b) => b[1] - a[1]).slice(0, 6);
    if (top.length) {
      parts.push("\nBATENEIGENAREN (uit batenprofielen):");
      for (const [rol, n] of top) {
        parts.push(`- ${rol} (${n}×)`);
      }
    }
  }

  parts.push(
    "\nOPDRACHT: Stel een complete, passende programmaorganisatie op (opdrachtgever, programmamanager, kerngroep, stuurgroep, klankbordgroep, domeineigenaren per Mens/Processen/Data & Systemen/Cultuur, besluitvormingsritme, escalatiepad). Respecteer de paritaire Cito-sectorverdeling. Gebruik ROLNAMEN/functies (geen persoonsnamen)."
  );

  return parts.join("\n");
}

function buildRasciUserMessage(body: RasciBody): string {
  const parts: string[] = [];

  // Programmaorganisatie compact doorgeven
  parts.push("BESCHIKBARE ROLLEN (gebruik ROL-strings exact):");
  const po = body.programmaorganisatie;
  if (po.opdrachtgever?.rol) parts.push(`- ${po.opdrachtgever.rol} (opdrachtgever)`);
  if (po.programmamanager?.rol) parts.push(`- ${po.programmamanager.rol} (programmamanager)`);
  for (const k of po.kerngroep ?? []) if (k.rol) parts.push(`- ${k.rol} (kerngroep)`);
  for (const s of po.stuurgroep ?? []) if (s.rol) parts.push(`- ${s.rol} (stuurgroep)`);
  for (const d of po.domeineigenaren ?? []) if (d.rol) parts.push(`- ${d.rol} (domeineigenaar)`);
  for (const k of po.klankbordgroep ?? []) if (k.rol) parts.push(`- ${k.rol} (klankbordgroep)`);

  // Vermogen-clusters
  if (body.vermogenClusters && body.vermogenClusters.length > 0) {
    parts.push("\nVERMOGEN-CLUSTERS (cross-sectoraal):");
    for (const c of body.vermogenClusters) {
      parts.push(`- "${c.clusterTitel}": ${truncate(c.advies || "", 140)}`);
    }
  }

  // Inspanning-clusters
  if (body.inspanningClusters && body.inspanningClusters.length > 0) {
    parts.push("\nINSPANNING-CLUSTERS (cross-sectoraal):");
    for (const c of body.inspanningClusters) {
      const domeinen = [...new Set(c.items.map((i) => i.domein))].join(", ");
      parts.push(`- "${c.clusterTitel}" (${domeinen}): ${truncate(c.advies || "", 140)}`);
    }
  }

  parts.push(
    "\nOPDRACHT: Geef per cluster een RASCI-rij met EXACT 1 A en minstens 1 R. Gebruik alleen rollen uit de lijst hierboven — referentie via rolLabel = exact de ROL-string."
  );

  return parts.join("\n");
}

export async function POST(request: NextRequest) {
  try {
    const body = (await request.json()) as OrganisatieBody | RasciBody;

    if (!process.env.ANTHROPIC_API_KEY) {
      return NextResponse.json(
        { success: false, error: "ANTHROPIC_API_KEY niet geconfigureerd." },
        { status: 500 }
      );
    }

    const kibContext = extractKiBContext({ goals: body.goals, scope: body.scope ?? undefined });

    if (body.mode === "organisatie") {
      const systemPrompt = assembleSystemPrompt(
        GOVERNANCE_ORGANISATIE_PROMPT,
        "governance-organisatie",
        undefined,
        kibContext
      );
      const userMessage = buildOrganisatieUserMessage(body);

      const result = await callClaudeWithValidation(
        AIProgrammaorganisatieSchema,
        systemPrompt,
        userMessage,
        { maxTokens: 3000, model: "claude-sonnet-4-6" }
      );

      if (!result.success) {
        return NextResponse.json(
          { success: false, error: result.error },
          { status: 500 }
        );
      }
      return NextResponse.json({ success: true, data: result.data });
    }

    if (body.mode === "rasci") {
      if (!body.programmaorganisatie) {
        return NextResponse.json(
          { success: false, error: "Programmaorganisatie ontbreekt — vul die eerst in." },
          { status: 400 }
        );
      }
      const systemPrompt = assembleSystemPrompt(
        GOVERNANCE_RASCI_PROMPT,
        "governance-rasci",
        undefined,
        kibContext
      );
      const userMessage = buildRasciUserMessage(body);

      const result = await callClaudeWithValidation(
        AIGovernanceRasciResponseSchema,
        systemPrompt,
        userMessage,
        { maxTokens: 4000, model: "claude-opus-4-7" }
      );

      if (!result.success) {
        return NextResponse.json(
          { success: false, error: result.error },
          { status: 500 }
        );
      }
      return NextResponse.json({ success: true, data: result.data });
    }

    return NextResponse.json(
      { success: false, error: `Onbekende mode: ${(body as { mode?: string }).mode}` },
      { status: 400 }
    );
  } catch (err) {
    const message = err instanceof Error ? err.message : "Onbekende fout";
    console.error("[governance-mapping] fout:", message);
    return NextResponse.json(
      { success: false, error: message },
      { status: 500 }
    );
  }
}
