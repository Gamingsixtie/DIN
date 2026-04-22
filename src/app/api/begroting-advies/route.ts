import { NextRequest, NextResponse } from "next/server";
import { callClaudeWithValidation } from "@/lib/ai-client";
import { assembleSystemPrompt, extractKiBContext } from "@/lib/prompt-assembly";
import { z } from "zod";

export const maxDuration = 300;

// Phase 19 — 3-scenario begrotingsadvies.
// Mental model: jaarlijksBudget is VAST. De vraag is niet of alles past,
// maar hoeveel jaar nodig is om alles af te maken. Daarom drie scenarios:
//   - optimaal  — jaarlijksBudget (user input, typisch €250K)
//   - plus20    — jaarlijksBudget × 1.2 (sneller)
//   - min20     — jaarlijksBudget × 0.8 (langzamer)
// Elk scenario bepaalt zelf aantalJaren o.b.v. benodigde kosten.
//
// Implementatie: 3 parallelle AI-calls (één per scenario) i.p.v. één grote
// call. Dat voorkomt token-limiet-afkappen en levert stabielere output.

// Schemas verzacht — alle percentage-velden tolerant ([-5, 105]) of optional;
// totaalEuro wordt door server berekend uit verdelingPerJaar; totalenPerJaar
// en totaalGeraamdEuro worden volledig server-side gevuld.
const VerdelingPerJaarItemSchema = z.object({
  jaar: z.number(),
  percentage: z.number().min(-5).max(110).optional(),
  euro: z.number(),
  fase: z.string(),
});

const InspanningBegrotingSchema = z.object({
  inspanningTitel: z.string(),
  groepId: z.string().optional(),
  domein: z.enum(["mens", "processen", "data_systemen", "cultuur"]),
  totaalEuro: z.number().optional(),
  percentageTotaal: z.number().min(-5).max(110).optional(),
  motivatie: z.string(),
  verdelingPerJaar: z.array(VerdelingPerJaarItemSchema),
  volgorde: z.object({
    rank: z.number().int().min(1),
    reden: z.string(),
  }),
});

const TotaalPerJaarSchema = z.object({
  jaar: z.number(),
  euro: z.number(),
  percentage: z.number().min(-5).max(110),
});

// AI-output schema — alleen wat AI nodig heeft te leveren.
const ScenarioAISchema = z.object({
  label: z.enum(["optimaal", "plus20", "min20"]),
  jaarlijksBudgetEuro: z.number().optional(),
  aantalJaren: z.number().int().min(1).max(15),
  inspanningen: z.array(InspanningBegrotingSchema),
  prioriteitAdvies: z.string(),
  samenvatting: z.string(),
});

type ScenarioAI = z.infer<typeof ScenarioAISchema>;

// Volle Scenario-shape (na server-enrichment) — wat we naar de client sturen.
type Scenario = {
  label: "optimaal" | "plus20" | "min20";
  jaarlijksBudgetEuro: number;
  aantalJaren: number;
  totaalGeraamdEuro: number;
  inspanningen: Array<{
    inspanningTitel: string;
    groepId?: string;
    domein: "mens" | "processen" | "data_systemen" | "cultuur";
    totaalEuro: number;
    percentageTotaal: number;
    motivatie: string;
    verdelingPerJaar: Array<{
      jaar: number;
      percentage: number;
      euro: number;
      fase: string;
    }>;
    volgorde: { rank: number; reden: string };
  }>;
  totalenPerJaar: z.infer<typeof TotaalPerJaarSchema>[];
  prioriteitAdvies: string;
  samenvatting: string;
};

function scenarioPrompt(
  label: "optimaal" | "plus20" | "min20",
  jaarlijksBudget: number
): string {
  const intro =
    label === "optimaal"
      ? "SCENARIO OPTIMAAL — het jaarlijks budget van de gebruiker ongewijzigd. Geef een realistisch plan."
      : label === "plus20"
      ? "SCENARIO +20% — 20% méér budget per jaar. Daardoor gaat de uitvoering SNELLER: minder jaren nodig, werk per jaar intensiever."
      : "SCENARIO −20% — 20% mínder budget per jaar. Daardoor gaat de uitvoering LANGZAMER: meer jaren nodig, werk per jaar extensiever.";

  return `Je bent een programma-controller/begrotingsexpert binnen Cito BV (DIN-methodiek — Werken aan Programma's, Prevaas & Van Loon). Je produceert ÉÉN begrotingsscenario.

**JAARLIJKS BUDGET IS VAST.** Bepaal hoeveel jaar nodig is om ALLE inspanningen volledig uit te voeren, gegeven het jaarlijks budget. Niet af-schalen, niet uitdunnen — álle inspanningen moeten er volledig in.

${intro}

**Voor dit scenario gebruik je het jaarlijks budget: € ${jaarlijksBudget.toLocaleString("nl-NL")}.**

Input JSON:
{
  "jaarlijksBudgetEuro": ${jaarlijksBudget},
  "cyclusMaanden": <number>,
  "startJaar": <number>,
  "focusDoel": { naam, beschrijving },
  "inspanningen": [
    {
      "titel": "<cross-sectorale inspanning-naam>",
      "groepId": "<ID van gedeeld vermogen>",
      "domein": "mens|processen|data_systemen|cultuur",
      "beschrijving": "<wat wordt er gedaan>",
      "beargumentatie": "<waarom dit cluster — hefboom-onderbouwing>",
      "vermogenImpact": [{ "sectorId": "po|vo|zakelijk", "impact": "<wat het vermogen oplevert voor die sector>" }],
      "dossier": { "eigenaar", "inspanningsleider", "verwachtResultaat", "randvoorwaarden" },
      "dossierKostenraming": "<business-case-raming, 1-3 zinnen met €-bedragen + fasering>",
      "businessCaseAannames": ["<aanname die de raming onderbouwt>", ...],
      "businessCaseRisicos": ["<risico dat de raming kan veranderen>", ...]
    }
  ]
}

**Belangrijk — INSPANNING-CONTEXT IS MEDE LEIDEND:** lees \`beschrijving\`, \`beargumentatie\`, \`vermogenImpact\` en \`dossier\` zorgvuldig. Die context bepaalt WAAROM een inspanning nodig is, welke sectoren het raakt, en wat de randvoorwaarden zijn. Gebruik die informatie voor:
- \`motivatie\` per inspanning (waarom deze in deze fase, waarom dit budget-aandeel)
- \`verdelingPerJaar.fase\` (welke fase past bij welke activiteit — voorbereiding / uitrol / borging)
- \`prioriteitAdvies\` (outside-in motivering op basis van de inhoudelijke hefbomen)

**Business-case aannames + risico's gebruiken:** \`businessCaseAannames\` zijn de onderbouwingen die de raming dragen — getallen, tarieven, looptijden, schaalveronderstellingen die door de business-case-Q&A zijn opgehaald bij de gebruiker. \`businessCaseRisicos\` zijn factoren die de raming kunnen veranderen (bv. tariefsveranderingen, scope-creep, afhankelijkheden). Beide zijn LEEG of kort als de gebruiker ze nog niet heeft ingevuld — verzin in dat geval GEEN getallen of details, blijf abstract. Gebruik deze velden voor:
- \`motivatie\` per inspanning te onderbouwen door letterlijk te verwijzen naar de aannames die de gebruiker zelf heeft opgegeven (NOOIT zelf cijfers verzinnen die er niet staan)
- In de fasering rekening houden met genoemde risico's (bv. risico-vol traject later plannen voor onzekerheid-afname)
- In \`samenvatting\` of \`prioriteitAdvies\` benoemen welke aannames kritisch zijn voor het slagen binnen budget

Taak — lever EXACT dit JSON-object (één Scenario, MINIMAAL veld-set):
{
  "label": "${label}",
  "aantalJaren": <integer 1-15, MINIMAAL noodzakelijk gegeven jaarlijksBudgetEuro>,
  "inspanningen": [
    {
      "inspanningTitel": "...",
      "groepId": "...",
      "domein": "mens|processen|data_systemen|cultuur",
      "motivatie": "<1-2 zinnen — verwijs naar businessCaseAannames waar relevant>",
      "verdelingPerJaar": [
        { "jaar": <startJaar>, "euro": <afgerond op duizend>, "fase": "<Voorbereiding | Uitrol | Opschaling | Borging>" },
        ...één item per jaar tot en met startJaar+aantalJaren−1
      ],
      "volgorde": { "rank": <1..N uniek>, "reden": "<1 zin>" }
    }
  ],
  "prioriteitAdvies": "<3-5 zinnen: outside-in volgorde motiveren — cultuur EERST (bereidheid), dan mens (competenties), dan data/systemen (CRM/tooling ondersteunend), dan processen (werkwijzen) LAATST — processen borgen wat mens en data hebben opgebouwd>",
  "samenvatting": "<1-2 zinnen executive summary van dít scenario>"
}

**LET OP:**
- Lever GEEN \`totaalEuro\`, \`percentageTotaal\`, \`totalenPerJaar\` of \`totaalGeraamdEuro\` — die wordt SERVER-SIDE berekend uit jouw \`verdelingPerJaar\`. Focus op de jaarlijkse euros en fasering.
- Lever GEEN \`percentage\` per jaar — die wordt server-side berekend.
- Houd \`verdelingPerJaar[].euro\` afgerond op duizend.

HARDE REGELS:
0. **DOSSIERKOSTENRAMING + BUSINESSCASEAANNAMES ZIJN LEIDEND voor de euros per jaar.**
   Elke inspanning komt binnen met een \`dossierKostenraming\` (raming-tekst uit business-case-Q&A) plus \`businessCaseAannames\` (de aantallen, tarieven, looptijden die de raming dragen).
   - Parse \`dossierKostenraming\` zorgvuldig: haal er eenmalige kosten én structurele kosten (per jaar × jaren) uit. Verdeel die over je \`verdelingPerJaar[].euro\`.
   - Aantallen komen ALTIJD uit \`businessCaseAannames\` of uit \`dossierKostenraming\`. **VERZIN NOOIT zelf aantallen** die er niet in staan — blijf in \`motivatie\` kwalitatief ("aantal nog te bepalen").
   - Als beide leeg/vaag zijn: conservatieve grove schatting op Cito-benchmarks (trainingsdag €800/persoon, FTE/jaar €100K, consultantuur €120). Benoem in \`motivatie\` dat dit fallback is.
   - WIJK NIET sterk af van de dossierKostenraming zonder motivatie.
1. **aantalJaren moet REËEL zijn** gegeven het jaarlijks budget: zo weinig jaren als mogelijk zonder een enkel jaar over budget te gaan. Bij €250K/jr en €1M totaal → 4 jaar. Bij €200K/jr en €1M → 5 jaar. Bij €300K/jr en €1M → 3-4 jaar.
2. **Som van \`verdelingPerJaar[].euro\` per JAAR over alle inspanningen ≤ jaarlijksBudgetEuro.** Geen overschrijding van het jaarlijks budget in welk jaar dan ook.
3. **Som van \`verdelingPerJaar[].euro\` per INSPANNING moet de totale dossier-raming benaderen** (eenmalige + structurele kosten samen).
4. **Outside-in volgorde — STRIKT deze ranking (Cito-specifiek, NIET de klassieke Prevaas-volgorde):**
   - rank 1 = Cultuur (bereidheid — zijn ze bereid te doen wat ze beloven? — moet eerst)
   - rank 2 = Mens (competenties, gesprekvaardigheid — volgt direct na cultuur, kan parallel starten)
   - rank 3 = Data/Systemen (CRM, tooling — ondersteunt mens bij het werk, moet klaar zijn voor de processen gestandaardiseerd worden)
   - rank 4 = Processen (werkwijzen — LAATST omdat processen borgen wat mens + data al hebben opgebouwd)
   **Processen komt ALTIJD als laatste. Data/Systemen komt VOOR Processen.** Volgorde van domeinen in de lijst: Cultuur → Mens → Data/Systemen → Processen.
5. **Realistische fasering per inspanning:**
   - Cultuur: piek jaar 1 (bewustwording), afnemend (borging)
   - Mens: start jaar 1, piek middenjaren (training aan volle breedte), borging eind
   - Data/Systemen: ontwerp en bouw middenjaren (CRM, tooling klaar krijgen voor gebruik)
   - Processen: uitrol en borging LAATST (processen slaan mens-gedrag + data-gebruik vast als werkwijze)
6. Alle euros als integers (75000, niet "€75K").
7. Antwoord in Nederlands. ALLEEN JSON, geen markdown, geen prose eromheen.`;
}

const VergelijkingSchema = z.object({
  vergelijking: z.string(),
});

function vergelijkingsPrompt(): string {
  return `Je geeft een korte vergelijking (2-3 zinnen, Nederlands) van drie begrotingsscenario's die ALLEMAAL hetzelfde einddoel bereiken, maar verschillen in tempo.

Input JSON:
{
  "optimaal": { aantalJaren, jaarlijksBudgetEuro, totaalGeraamdEuro },
  "plus20":   { aantalJaren, jaarlijksBudgetEuro, totaalGeraamdEuro },
  "min20":    { aantalJaren, jaarlijksBudgetEuro, totaalGeraamdEuro }
}

Output:
{ "vergelijking": "<2-3 zinnen die de 3 scenario's duiden: hoeveel jaar verschil, wat dat betekent voor tempo en organisatie-belasting. Benoem concrete jaartallen.>" }

Regels: Nederlands, 2-3 zinnen, JSON only.`;
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const {
      jaarlijksBudgetEuro,
      cyclusMaanden,
      startJaar,
      focusDoel,
      inspanningen,
    } = body as {
      jaarlijksBudgetEuro?: number;
      cyclusMaanden?: number;
      startJaar?: number;
      focusDoel?: unknown;
      inspanningen?: unknown;
    };

    if (!jaarlijksBudgetEuro || typeof jaarlijksBudgetEuro !== "number" || jaarlijksBudgetEuro <= 0) {
      return NextResponse.json(
        { success: false, error: "jaarlijksBudgetEuro is verplicht en > 0" },
        { status: 400 }
      );
    }
    if (!cyclusMaanden || typeof cyclusMaanden !== "number" || cyclusMaanden <= 0) {
      return NextResponse.json(
        { success: false, error: "cyclusMaanden is verplicht en > 0" },
        { status: 400 }
      );
    }
    if (!Array.isArray(inspanningen) || inspanningen.length === 0) {
      return NextResponse.json(
        { success: false, error: "inspanningen moet een niet-lege array zijn" },
        { status: 400 }
      );
    }

    const effectiefStartJaar =
      typeof startJaar === "number" && startJaar > 2000 ? startJaar : new Date().getFullYear();

    const kibContext = extractKiBContext(body);

    // Pre-compute jaarlijks budgets per scenario (rond op duizend)
    const budgetOptimaal = Math.round(jaarlijksBudgetEuro / 1000) * 1000;
    const budgetPlus20 = Math.round((jaarlijksBudgetEuro * 1.2) / 1000) * 1000;
    const budgetMin20 = Math.round((jaarlijksBudgetEuro * 0.8) / 1000) * 1000;

    const scenarioInput = {
      cyclusMaanden,
      startJaar: effectiefStartJaar,
      focusDoel: focusDoel ?? null,
      inspanningen,
    };

    // Verrijk AI-output met server-berekende totalen (voorkomt validation
    // failures op percentage-bounds en garandeert math-correctheid).
    function enrichScenario(ai: ScenarioAI, jaarlijksBudget: number): Scenario {
      const startJ = effectiefStartJaar;
      const eindJ = startJ + ai.aantalJaren - 1;
      const enrichedInsps = ai.inspanningen.map((insp) => {
        // Som per inspanning over alle jaren = totaalEuro
        const totaalEuro = insp.verdelingPerJaar.reduce((s, v) => s + (v.euro ?? 0), 0);
        return {
          ...insp,
          totaalEuro,
          verdelingPerJaar: insp.verdelingPerJaar.map((v) => ({
            jaar: v.jaar,
            euro: v.euro,
            fase: v.fase,
            // Server-berekende percentage; clamp [0,100]
            percentage:
              totaalEuro > 0
                ? Math.max(0, Math.min(100, Math.round((v.euro / totaalEuro) * 100)))
                : 0,
          })),
        };
      });
      const totaalGeraamdEuro = enrichedInsps.reduce((s, i) => s + i.totaalEuro, 0);
      const enrichedInspsWithPct = enrichedInsps.map((insp) => ({
        ...insp,
        percentageTotaal:
          totaalGeraamdEuro > 0
            ? Math.max(0, Math.min(100, Math.round((insp.totaalEuro / totaalGeraamdEuro) * 100)))
            : 0,
      }));
      // totalenPerJaar — som over alle inspanningen per jaar
      const totalenPerJaar: Scenario["totalenPerJaar"] = [];
      for (let jr = startJ; jr <= eindJ; jr++) {
        const euro = enrichedInspsWithPct.reduce(
          (s, i) => s + (i.verdelingPerJaar.find((v) => v.jaar === jr)?.euro ?? 0),
          0
        );
        totalenPerJaar.push({
          jaar: jr,
          euro,
          percentage:
            jaarlijksBudget > 0
              ? Math.max(0, Math.min(110, Math.round((euro / jaarlijksBudget) * 100)))
              : 0,
        });
      }
      return {
        label: ai.label,
        jaarlijksBudgetEuro: jaarlijksBudget,
        aantalJaren: ai.aantalJaren,
        totaalGeraamdEuro,
        inspanningen: enrichedInspsWithPct,
        totalenPerJaar,
        prioriteitAdvies: ai.prioriteitAdvies,
        samenvatting: ai.samenvatting,
      };
    }

    async function genereer(
      label: "optimaal" | "plus20" | "min20",
      jaarlijksBudget: number,
      staggerMs: number
    ): Promise<Scenario | null> {
      // Stagger startup om rate-limit-burst bij parallelle calls te voorkomen
      if (staggerMs > 0) await new Promise((r) => setTimeout(r, staggerMs));
      try {
        const systemPrompt = assembleSystemPrompt(
          scenarioPrompt(label, jaarlijksBudget),
          "cross-analyse",
          undefined,
          kibContext
        );
        const userMessage = JSON.stringify(
          { ...scenarioInput, jaarlijksBudgetEuro: jaarlijksBudget },
          null,
          2
        );
        const res = await callClaudeWithValidation(
          ScenarioAISchema,
          systemPrompt,
          userMessage,
          { maxTokens: 8192, retryDelayMs: 2000 }
        );
        if (res.success) {
          return enrichScenario(res.data, jaarlijksBudget);
        }
        console.error(`[begroting-advies] ${label} validation failed:`, res.error);
        return null;
      } catch (err) {
        console.error(`[begroting-advies] ${label} threw:`, err);
        return null;
      }
    }

    const [optimaal, plus20, min20] = await Promise.all([
      genereer("optimaal", budgetOptimaal, 0),
      genereer("plus20", budgetPlus20, 200),
      genereer("min20", budgetMin20, 400),
    ]);

    // Bij minimaal 1 succesvolle scenario: stuur die terug; client kan
    // partial-result tonen met waarschuwing voor de gefaalde scenarios.
    const falend = [
      !optimaal ? "optimaal" : null,
      !plus20 ? "plus20" : null,
      !min20 ? "min20" : null,
    ].filter(Boolean) as string[];

    if (!optimaal && !plus20 && !min20) {
      return NextResponse.json(
        {
          success: false,
          error: "Alle 3 scenario's faalden — controleer Vercel-logs voor details, of probeer opnieuw.",
        },
        { status: 200 }
      );
    }

    // Vergelijking in aparte korte call — alleen als alle 3 succesvol
    const allOk = optimaal && plus20 && min20;
    let vergelijking = "";
    if (allOk) {
      const vergelijkingSystem = assembleSystemPrompt(
        vergelijkingsPrompt(),
        "cross-analyse",
        undefined,
        kibContext
      );
      const vergelijkingUserMsg = JSON.stringify(
        {
          optimaal: {
            aantalJaren: optimaal.aantalJaren,
            jaarlijksBudgetEuro: optimaal.jaarlijksBudgetEuro,
            totaalGeraamdEuro: optimaal.totaalGeraamdEuro,
          },
          plus20: {
            aantalJaren: plus20.aantalJaren,
            jaarlijksBudgetEuro: plus20.jaarlijksBudgetEuro,
            totaalGeraamdEuro: plus20.totaalGeraamdEuro,
          },
          min20: {
            aantalJaren: min20.aantalJaren,
            jaarlijksBudgetEuro: min20.jaarlijksBudgetEuro,
            totaalGeraamdEuro: min20.totaalGeraamdEuro,
          },
        },
        null,
        2
      );
      const vergelijkingRes = await callClaudeWithValidation(
        VergelijkingSchema,
        vergelijkingSystem,
        vergelijkingUserMsg,
        { maxTokens: 512 }
      );
      vergelijking = vergelijkingRes.success
        ? vergelijkingRes.data.vergelijking
        : `Optimaal: ${optimaal.aantalJaren} jaar @ €${optimaal.jaarlijksBudgetEuro.toLocaleString("nl-NL")}/jr. +20%: ${plus20.aantalJaren} jaar. −20%: ${min20.aantalJaren} jaar.`;
    } else {
      vergelijking = `Niet alle scenario's konden gegenereerd worden — gefaald: ${falend.join(", ")}.`;
    }

    return NextResponse.json({
      success: true,
      data: {
        jaarlijksBudgetBasis: jaarlijksBudgetEuro,
        startJaar: effectiefStartJaar,
        cyclusMaanden,
        scenarios: { optimaal, plus20, min20 },
        vergelijking,
        partialFailures: falend.length > 0 ? falend : undefined,
      },
    });
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Onbekende fout";
    return NextResponse.json({ success: false, error: msg }, { status: 500 });
  }
}
