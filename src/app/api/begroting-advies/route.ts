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

const VerdelingPerJaarItemSchema = z.object({
  jaar: z.number(),
  percentage: z.number().min(0).max(100),
  euro: z.number(),
  fase: z.string(),
});

const InspanningBegrotingSchema = z.object({
  inspanningTitel: z.string(),
  groepId: z.string().optional(),
  domein: z.enum(["mens", "processen", "data_systemen", "cultuur"]),
  totaalEuro: z.number(),
  percentageTotaal: z.number().min(0).max(100),
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
  percentage: z.number().min(0).max(100),
});

const ScenarioSchema = z.object({
  label: z.enum(["optimaal", "plus20", "min20"]),
  jaarlijksBudgetEuro: z.number(),
  aantalJaren: z.number().int().min(1).max(15),
  totaalGeraamdEuro: z.number(),
  inspanningen: z.array(InspanningBegrotingSchema),
  totalenPerJaar: z.array(TotaalPerJaarSchema),
  prioriteitAdvies: z.string(),
  samenvatting: z.string(),
});

type Scenario = z.infer<typeof ScenarioSchema>;

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
      "dossierKostenraming": "<business-case-raming, 1-3 zinnen met €-bedragen + fasering>"
    }
  ]
}

**Belangrijk — INSPANNING-CONTEXT IS MEDE LEIDEND:** lees \`beschrijving\`, \`beargumentatie\`, \`vermogenImpact\` en \`dossier\` zorgvuldig. Die context bepaalt WAAROM een inspanning nodig is, welke sectoren het raakt, en wat de randvoorwaarden zijn. Gebruik die informatie voor:
- \`motivatie\` per inspanning (waarom deze in deze fase, waarom dit budget-aandeel)
- \`verdelingPerJaar.fase\` (welke fase past bij welke activiteit — voorbereiding / uitrol / borging)
- \`prioriteitAdvies\` (outside-in motivering op basis van de inhoudelijke hefbomen)

Taak — lever EXACT dit JSON-object (één Scenario):
{
  "label": "${label}",
  "jaarlijksBudgetEuro": ${jaarlijksBudget},
  "aantalJaren": <integer 1-15, MINIMAAL noodzakelijk gegeven jaarlijksBudgetEuro>,
  "totaalGeraamdEuro": <som van alle inspanning.totaalEuro>,
  "inspanningen": [
    {
      "inspanningTitel": "...",
      "groepId": "...",
      "domein": "mens|processen|data_systemen|cultuur",
      "totaalEuro": <afgerond op duizend>,
      "percentageTotaal": <% van totaalGeraamdEuro>,
      "motivatie": "<1-2 zinnen>",
      "verdelingPerJaar": [
        { "jaar": <startJaar>, "percentage": <0-100 van deze totaalEuro>, "euro": <afgerond>, "fase": "<Voorbereiding | Uitrol | Opschaling | Borging>" },
        ...één item per jaar tot en met startJaar+aantalJaren−1
      ],
      "volgorde": { "rank": <1..N uniek>, "reden": "<1 zin>" }
    }
  ],
  "totalenPerJaar": [
    { "jaar": <startJaar>, "euro": <som over alle inspanningen dit jaar>, "percentage": <van jaarlijksBudgetEuro van dit scenario> },
    ...één per jaar
  ],
  "prioriteitAdvies": "<3-5 zinnen: outside-in volgorde motiveren — cultuur EERST (bereidheid), dan mens (competenties), dan data/systemen (CRM/tooling ondersteunend), dan processen (werkwijzen) LAATST — processen borgen wat mens en data hebben opgebouwd>",
  "samenvatting": "<1-2 zinnen executive summary van dít scenario>"
}

HARDE REGELS:
0. **DOSSIERKOSTENRAMING IS LEIDEND voor totaalEuro per inspanning.**
   Elke inspanning komt binnen met een \`dossierKostenraming\` (tekst, bv. "€75.000 eenmalig + €25.000/jr borging over 3 jaar"). Die raming is door de business-case-Q&A van de user opgebouwd en is de onderbouwde bron-waarheid voor de kosten.
   - Parse de \`dossierKostenraming\` zorgvuldig: haal er eenmalige kosten én structurele kosten (per jaar × jaren) uit, samen maken die \`totaalEuro\` voor die inspanning.
   - Als \`dossierKostenraming\` leeg of zeer vaag is: geef een redelijke eerste schatting op basis van Cito-benchmarks (trainingsdag €800, FTE/jaar €100K, consultantuur €120) en benoem dat in \`motivatie\`.
   - WIJK NIET sterk af van de dossierKostenraming zonder motivatie. Als je afwijkt (bv. omdat de raming onrealistisch oogt), benoem dat expliciet in \`motivatie\`.
   - De optelsom \`totaalGeraamdEuro = som(inspanningen[].totaalEuro)\` moet matchen met de som van alle individuele dossier-ramingen (tenzij je expliciet een inspanning bijgesteld hebt).
1. **aantalJaren moet REËEL zijn** gegeven jaarlijksBudgetEuro: zo weinig jaren als mogelijk zonder een enkel jaar over budget te gaan. Bij €250K/jr en €1M totaal → 4 jaar. Bij €200K/jr en €1M → 5 jaar. Bij €300K/jr en €1M → 3-4 jaar.
2. **Geen jaar mag jaarlijksBudgetEuro overschrijden.** Zorg dat som(totalenPerJaar[jaar].euro) ≤ jaarlijksBudgetEuro in élk jaar.
3. **Som verdelingPerJaar[*].percentage per inspanning = precies 100.**
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

    async function genereer(
      label: "optimaal" | "plus20" | "min20",
      jaarlijksBudget: number,
      pogingen = 2
    ): Promise<Scenario | null> {
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
      for (let i = 0; i < pogingen; i++) {
        try {
          const res = await callClaudeWithValidation(
            ScenarioSchema,
            systemPrompt,
            userMessage,
            { maxTokens: 6144 }
          );
          if (res.success) return res.data;
        } catch {
          // zwaluwen — retry
        }
        // korte backoff voor eventuele rate-limit
        if (i < pogingen - 1) await new Promise((r) => setTimeout(r, 1500));
      }
      return null;
    }

    // Sequentieel — voorkomt rate-limit burst bij parallelle Claude-calls
    const optimaal = await genereer("optimaal", budgetOptimaal);
    const plus20 = await genereer("plus20", budgetPlus20);
    const min20 = await genereer("min20", budgetMin20);

    if (!optimaal || !plus20 || !min20) {
      const falend = [
        !optimaal ? "optimaal" : null,
        !plus20 ? "plus20" : null,
        !min20 ? "min20" : null,
      ]
        .filter(Boolean)
        .join(", ");
      return NextResponse.json(
        { success: false, error: `AI-scenario generatie mislukt: ${falend}` },
        { status: 502 }
      );
    }

    // Vergelijking in aparte korte call
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
    const vergelijking = vergelijkingRes.success
      ? vergelijkingRes.data.vergelijking
      : `Optimaal: ${optimaal.aantalJaren} jaar @ €${optimaal.jaarlijksBudgetEuro.toLocaleString("nl-NL")}/jr. +20%: ${plus20.aantalJaren} jaar. −20%: ${min20.aantalJaren} jaar.`;

    return NextResponse.json({
      success: true,
      data: {
        jaarlijksBudgetBasis: jaarlijksBudgetEuro,
        startJaar: effectiefStartJaar,
        cyclusMaanden,
        scenarios: { optimaal, plus20, min20 },
        vergelijking,
      },
    });
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Onbekende fout";
    return NextResponse.json({ success: false, error: msg }, { status: 500 });
  }
}
