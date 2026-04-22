import { NextRequest, NextResponse } from "next/server";
import { callClaudeWithValidation } from "@/lib/ai-client";
import { assembleSystemPrompt, extractKiBContext } from "@/lib/prompt-assembly";
import { citoFunctiesAlsPromptBlok } from "@/lib/cito-functies";
import { berekenGeindexeerdTarief } from "@/lib/uurtarief";
import { z } from "zod";

export const maxDuration = 300;

// Stap 7 — Interne uren-advies: AI bepaalt per scenario × domein × jaar welke
// Cito-rollen hoeveel uren nodig hebben, gekoppeld aan de stap 6 out-of-pocket
// fasering. 3 parallelle calls (één per scenario), analoog aan begroting-advies.

const RolAISchema = z.object({
  functieId: z.string(),
  functieNaam: z.string(),
  afdeling: z.string().optional(),
  uren: z.number(),
});

const DomeinJaarAISchema = z.object({
  jaar: z.number(),
  activiteit: z.string(),
  rollen: z.array(RolAISchema).min(1),
});

const DomeinAISchema = z.object({
  domein: z.enum(["cultuur", "mens", "data_systemen", "processen"]),
  koppeling: z.array(z.string()).optional().default([]),
  jaren: z.array(DomeinJaarAISchema),
  motivatie: z.string(),
});

const InterneUrenScenarioAISchema = z.object({
  scenarioLabel: z.enum(["optimaal", "plus20", "min20"]),
  domeinen: z.array(DomeinAISchema),
});

type InterneUrenScenarioAI = z.infer<typeof InterneUrenScenarioAISchema>;

// Ingebouwde rijk-shape (na server-enrichment met tarief + kosten + totalen)
type VerrijkteRol = {
  functieId: string;
  functieNaam: string;
  afdeling?: string;
  uren: number;
  uurtarief: number;
  kosten: number;
};
type VerrijkteJaar = {
  jaar: number;
  activiteit: string;
  rollen: VerrijkteRol[];
  totaalUren: number;
  totaalKosten: number;
};
type VerrijkteDomein = {
  domein: "cultuur" | "mens" | "data_systemen" | "processen";
  koppeling?: string[];
  jaren: VerrijkteJaar[];
  totaalUren: number;
  totaalKosten: number;
  motivatie: string;
};
type VerrijkteScenario = {
  scenarioLabel: "optimaal" | "plus20" | "min20";
  aantalJaren: number;
  startJaar: number;
  uurtariefGebruikt: number;
  domeinen: VerrijkteDomein[];
  totalenPerJaar: Array<{
    jaar: number;
    uren: number;
    kosten: number;
    urenBudget?: number;
    urenGap?: number; // voorstel − budget; positief = tekort, negatief = overschot
  }>;
  totaalUren: number;
  totaalKosten: number;
  samenvatting: string;
};

function scenarioPrompt(
  scenarioLabel: "optimaal" | "plus20" | "min20",
  scenarioData: {
    aantalJaren: number;
    startJaar: number;
    jaarlijksBudgetEuro: number;
    inspanningen: Array<{
      inspanningTitel: string;
      groepId?: string;
      domein: string;
      motivatie: string;
      verdelingPerJaar: Array<{ jaar: number; euro: number; fase: string; activiteit?: string }>;
      businessCaseInterneRollen?: string;
      businessCaseInterneUren?: string;
    }>;
  },
  toegestaneFuncties?: Array<{ id: string; naam: string; afdeling: string; schaal: number }>,
  urenBudgetPerJaar?: Array<{ jaar: number; urenBudget: number }>
): string {
  const tag =
    scenarioLabel === "optimaal"
      ? "OPTIMAAL (basis tempo)"
      : scenarioLabel === "plus20"
      ? "+20% budget (sneller)"
      : "−20% budget (langzamer)";
  return `Je bent programma-controller bij Cito BV. Je plant de INTERNE UREN van Cito-medewerkers voor EÉN scenario (${tag}) van de DIN-programma-begroting.

**Input — scenario uit stap 6 (AI-begroting out-of-pocket):**
- aantalJaren: ${scenarioData.aantalJaren}
- startJaar: ${scenarioData.startJaar}
- jaarlijksBudgetEuro (out-of-pocket): € ${scenarioData.jaarlijksBudgetEuro.toLocaleString("nl-NL")}
- inspanningen (per inspanning per jaar: fase, activiteit, out-of-pocket euros)

${
  urenBudgetPerJaar && urenBudgetPerJaar.length > 0
    ? `**UREN-BUDGET NORM per jaar (beschikbaar vanuit Finance voor programma-interne uren) — toon een GAP als je totaal voorstel afwijkt:**
${urenBudgetPerJaar.map((u) => `  - ${u.jaar}: ${u.urenBudget.toLocaleString("nl-NL")} uren beschikbaar`).join("\n")}
\nStreef ernaar binnen dit uren-budget per jaar te blijven. Als het programma MEER uren vraagt dan beschikbaar is: BENOEM dit expliciet in de motivatie per domein (gap = voorstel − budget). Onderbesteding is ook OK — maar niet als dat betekent dat werk blijft liggen.

`
    : ""
}**TOEGESTANE FUNCTIES — de gebruiker heeft DEZE rollen geselecteerd voor deze analyse. Kies UITSLUITEND hieruit; gebruik geen enkele functie die hier NIET in staat.**
${
  toegestaneFuncties && toegestaneFuncties.length > 0
    ? toegestaneFuncties
        .map((f) => `  - ${f.naam} (id: ${f.id}, afdeling: ${f.afdeling}, schaal ${f.schaal})`)
        .join("\n")
    : citoFunctiesAlsPromptBlok()
}

**Taak — lever EXACT dit JSON-object voor dit ene scenario:**
{
  "scenarioLabel": "${scenarioLabel}",
  "domeinen": [
    {
      "domein": "cultuur" | "mens" | "data_systemen" | "processen",
      "koppeling": ["<groepId van inspanning(en) in dit domein>"],
      "jaren": [
        {
          "jaar": <startJaar>,
          "activiteit": "<1-2 zinnen wat CONCREET gedaan wordt, sluit aan bij stap-6 activiteit>",
          "rollen": [
            { "functieId": "<id uit organogram>", "functieNaam": "<naam uit organogram>", "afdeling": "<afdeling>", "uren": <int> }
          ]
        },
        ...één per jaar tot en met startJaar + aantalJaren − 1
      ],
      "motivatie": "<1-3 zinnen waarom deze rollen en dit tempo>"
    },
    ...exact 4 domeinen (cultuur, mens, data_systemen, processen), in die volgorde
  ]
}

**HARDE REGELS:**
1. **Gebruik UITSLUITEND functieId + functieNaam uit de TOEGESTANE FUNCTIES-lijst hierboven.** Geen enkele andere rol. Geen verzonnen rollen. Geen trainers of andere functies die NIET in die lijst staan. Als een echt nodig specialisme ontbreekt in de toegestane lijst: gebruik functieId "extern" en functieNaam "Externe <specialisme>" — maar bij voorkeur kies je iets uit de toegestane lijst.
2. **Aansluiten bij stap 6 fasering:** dezelfde jaren, activiteiten die matchen bij wat in dat jaar voor die inspanning gepland is. Als stap 6 zegt "CRM-leverancier selectie + architectuur-besluit" in jaar 1 voor data/systemen, dan horen daar rollen bij als "Manager Data & Technologie", "Business informatieanalist C", "Productowner" — MITS die in de toegestane lijst staan.
3. **Realistische uren per rol per jaar.** 1 FTE = ~1600 werkbare uren/jaar. Voor een rol die 10% op dit programma zit = 160 uur/jr. Voor zware trekkers (Sectormanager op cultuur in jaar 1) = 300-500u. Voor experts die af en toe bijspringen = 40-120u.
4. **Per domein minimaal 2-3 rollen per jaar uit de toegestane lijst**, soms meer bij grote inspanningen. Vermijd 10+ rollen per jaar (onoverzichtelijk). Als het domein weinig passende toegestane rollen heeft: houd het compact met 1-2 rollen.
5. **Domein → rol-richtlijn (alleen toepassen als die rol in de toegestane lijst staat):**
   - **Cultuur**: Directeur BV, Sectormanagers (PO/VO/Professionals), Manager Klantcontact, Projectmanager D, Campagne Marketeer
   - **Mens**: Content Specialist, Toetsdeskundigen A/B/C (PO/VO/Professionals), Medewerker Media Support
   - **Data/Systemen**: Manager Data & Technologie, Productowners, Business informatieanalist C, Procesmanager Data, Productmanager A/B (per sector), Onderwijskundig onderzoeker C
   - **Processen**: Teamleider PS, Procesondersteuner C (per sector), Projectmanager C/D, Kwaliteitsmanager, Medewerker Proces Support A-E, Inkoper B
6. **Gebruik ook de business-case antwoorden** (businessCaseInterneRollen + businessCaseInterneUren) als die er zijn — dat zijn door de user zelf opgegeven rollen/uren, respecteer die aannames.
7. **Motivatie per domein:** benoem concreet welke rol WAAROM nodig is; verwijs waar mogelijk naar de inspanning-activiteit uit stap 6.
8. ALLEEN JSON, geen markdown, Nederlands.

**Input-data (inspanningen):**
${JSON.stringify(scenarioData.inspanningen, null, 2)}
`;
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const {
      scenarios,
      uurtariefSettings,
      inspanningenMeta,
      toegestaneFuncties,
      urenBudgetPerJaar,
      finetuneInstructie,
      previousAdvies,
    } = body as {
      scenarios?: Record<
        "optimaal" | "plus20" | "min20",
        {
          aantalJaren: number;
          startJaar: number;
          jaarlijksBudgetEuro: number;
          inspanningen: Array<{
            inspanningTitel: string;
            groepId?: string;
            domein: string;
            motivatie: string;
            verdelingPerJaar: Array<{ jaar: number; euro: number; fase: string; activiteit?: string }>;
          }>;
        } | null
      >;
      uurtariefSettings?: {
        basisTarief: number;
        referentiejaar: number;
        indexatiePercentage: number;
      };
      inspanningenMeta?: Array<{
        groepId?: string;
        businessCaseInterneRollen?: string;
        businessCaseInterneUren?: string;
      }>;
      toegestaneFuncties?: Array<{ id: string; naam: string; afdeling: string; schaal: number }>;
      urenBudgetPerJaar?: Array<{ jaar: number; urenBudget: number }>;
      finetuneInstructie?: string;
      previousAdvies?: unknown;
    };

    if (!scenarios) {
      return NextResponse.json(
        { success: false, error: "scenarios is verplicht (uit stap 6)" },
        { status: 400 }
      );
    }
    if (!uurtariefSettings) {
      return NextResponse.json(
        { success: false, error: "uurtariefSettings is verplicht" },
        { status: 400 }
      );
    }

    const kibContext = extractKiBContext(body);

    // Merge business-case interne-uren antwoorden in de inspanningen
    function enrichInspanningen(
      inspanningen: Array<{
        inspanningTitel: string;
        groepId?: string;
        domein: string;
        motivatie: string;
        verdelingPerJaar: Array<{ jaar: number; euro: number; fase: string; activiteit?: string }>;
      }>
    ) {
      if (!inspanningenMeta) return inspanningen;
      return inspanningen.map((i) => {
        const meta = inspanningenMeta.find((m) => m.groepId === i.groepId);
        return { ...i, ...meta };
      });
    }

    async function genereer(
      label: "optimaal" | "plus20" | "min20",
      staggerMs: number
    ): Promise<VerrijkteScenario | null> {
      const scenario = scenarios?.[label];
      if (!scenario) return null;
      if (staggerMs > 0) await new Promise((r) => setTimeout(r, staggerMs));
      try {
        const enrichedInsps = enrichInspanningen(scenario.inspanningen);
        const finetuneBlock =
          finetuneInstructie && finetuneInstructie.trim().length > 0
            ? `\n\n**FINETUNE-VERZOEK:** "${finetuneInstructie.trim()}"\nPas de uren/rollen aan naar de instructie. Vorige versie:\n${JSON.stringify((previousAdvies as { scenarios?: Record<string, unknown> })?.scenarios?.[label] ?? null, null, 2)}\n`
            : "";
        const systemPrompt = assembleSystemPrompt(
          scenarioPrompt(label, { ...scenario, inspanningen: enrichedInsps }, toegestaneFuncties, urenBudgetPerJaar) + finetuneBlock,
          "cross-analyse",
          undefined,
          kibContext
        );
        const userMessage = `Genereer interne-uren-plan voor scenario: ${label}`;
        const res = await callClaudeWithValidation(
          InterneUrenScenarioAISchema,
          systemPrompt,
          userMessage,
          { maxTokens: 8192, retryDelayMs: 2000 }
        );
        if (!res.success) {
          console.error(`[interne-uren-advies] ${label} validation failed:`, res.error);
          return null;
        }
        return verrijkScenario(res.data, {
          aantalJaren: scenario.aantalJaren,
          startJaar: scenario.startJaar,
          uurtariefSettings: uurtariefSettings!,
        });
      } catch (err) {
        console.error(`[interne-uren-advies] ${label} threw:`, err);
        return null;
      }
    }

    function verrijkScenario(
      ai: InterneUrenScenarioAI,
      ctx: {
        aantalJaren: number;
        startJaar: number;
        uurtariefSettings: { basisTarief: number; referentiejaar: number; indexatiePercentage: number };
      }
    ): VerrijkteScenario {
      const domeinen: VerrijkteDomein[] = ai.domeinen.map((d) => {
        const jaren: VerrijkteJaar[] = d.jaren.map((jr) => {
          const tarief = berekenGeindexeerdTarief(
            ctx.uurtariefSettings.basisTarief,
            ctx.uurtariefSettings.referentiejaar,
            ctx.uurtariefSettings.indexatiePercentage,
            jr.jaar
          );
          const rollen: VerrijkteRol[] = jr.rollen.map((r) => ({
            ...r,
            uurtarief: tarief,
            kosten: Math.round(r.uren * tarief),
          }));
          const totaalUren = rollen.reduce((s, r) => s + r.uren, 0);
          const totaalKosten = rollen.reduce((s, r) => s + r.kosten, 0);
          return { ...jr, rollen, totaalUren, totaalKosten };
        });
        const totaalUren = jaren.reduce((s, j) => s + j.totaalUren, 0);
        const totaalKosten = jaren.reduce((s, j) => s + j.totaalKosten, 0);
        return { ...d, jaren, totaalUren, totaalKosten };
      });

      // Totalen per jaar (over alle domeinen)
      const totalenPerJaar: Array<{ jaar: number; uren: number; kosten: number; urenBudget?: number; urenGap?: number }> = [];
      for (let i = 0; i < ctx.aantalJaren; i++) {
        const jaar = ctx.startJaar + i;
        let uren = 0;
        let kosten = 0;
        for (const d of domeinen) {
          const jr = d.jaren.find((j) => j.jaar === jaar);
          if (jr) {
            uren += jr.totaalUren;
            kosten += jr.totaalKosten;
          }
        }
        const budgetEntry = urenBudgetPerJaar?.find((b) => b.jaar === jaar);
        const urenBudget = budgetEntry?.urenBudget;
        const urenGap = urenBudget !== undefined ? uren - urenBudget : undefined;
        totalenPerJaar.push({ jaar, uren, kosten, urenBudget, urenGap });
      }

      const totaalUren = totalenPerJaar.reduce((s, j) => s + j.uren, 0);
      const totaalKosten = totalenPerJaar.reduce((s, j) => s + j.kosten, 0);
      const startTarief = berekenGeindexeerdTarief(
        ctx.uurtariefSettings.basisTarief,
        ctx.uurtariefSettings.referentiejaar,
        ctx.uurtariefSettings.indexatiePercentage,
        ctx.startJaar
      );
      return {
        scenarioLabel: ai.scenarioLabel,
        aantalJaren: ctx.aantalJaren,
        startJaar: ctx.startJaar,
        uurtariefGebruikt: startTarief,
        domeinen,
        totalenPerJaar,
        totaalUren,
        totaalKosten,
        samenvatting: `${totaalUren.toLocaleString("nl-NL")} interne uren × ~€${startTarief}/u = € ${totaalKosten.toLocaleString("nl-NL")} over ${ctx.aantalJaren} jaar.`,
      };
    }

    const [optimaal, plus20, min20] = await Promise.all([
      genereer("optimaal", 0),
      genereer("plus20", 200),
      genereer("min20", 400),
    ]);

    const partialFailures = [
      !optimaal ? "optimaal" : null,
      !plus20 ? "plus20" : null,
      !min20 ? "min20" : null,
    ].filter(Boolean) as string[];

    if (!optimaal && !plus20 && !min20) {
      return NextResponse.json(
        {
          success: false,
          error: "Alle 3 scenario's faalden — controleer Vercel-logs of probeer opnieuw.",
        },
        { status: 200 }
      );
    }

    return NextResponse.json({
      success: true,
      data: {
        uurtariefSettings,
        scenarios: { optimaal, plus20, min20 },
        partialFailures,
      },
    });
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Onbekende fout";
    return NextResponse.json({ success: false, error: msg }, { status: 500 });
  }
}
