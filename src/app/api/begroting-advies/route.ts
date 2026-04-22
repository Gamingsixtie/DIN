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

// Schemas verzacht — alle percentage-velden tolerant ([-5, 110]) of optional;
// totaalEuro wordt door server berekend uit verdelingPerJaar; totalenPerJaar
// en totaalGeraamdEuro worden volledig server-side gevuld.
// activiteit (NIEUW) — 1-2 zinnen per jaar wat CONCREET in dat jaar gebeurt.
const VerdelingPerJaarItemSchema = z.object({
  jaar: z.number(),
  percentage: z.number().min(-5).max(110).optional(),
  euro: z.number(),
  fase: z.string(),
  activiteit: z.string().optional(),
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
      activiteit?: string;
    }>;
    volgorde: { rank: number; reden: string };
  }>;
  totalenPerJaar: z.infer<typeof TotaalPerJaarSchema>[];
  prioriteitAdvies: string;
  samenvatting: string;
};

function scenarioPrompt(
  label: "optimaal" | "plus20" | "min20",
  jaarlijksBudget: number,
  finetune?: { instructie: string; vorigeScenario: unknown }
): string {
  const intro =
    label === "optimaal"
      ? "SCENARIO OPTIMAAL — het jaarlijks budget van de gebruiker ongewijzigd. Geef een realistisch plan."
      : label === "plus20"
      ? "SCENARIO +20% — 20% méér budget per jaar. Daardoor gaat de uitvoering SNELLER: minder jaren nodig, werk per jaar intensiever."
      : "SCENARIO −20% — 20% mínder budget per jaar. Daardoor gaat de uitvoering LANGZAMER: meer jaren nodig, werk per jaar extensiever.";

  const finetuneBlock = finetune
    ? `\n\n**FINETUNE-VERZOEK VAN DE GEBRUIKER:**\n"${finetune.instructie}"\n\nDe gebruiker heeft een eerdere versie van dit scenario gezien en wil aanpassingen. Vorige versie:\n${JSON.stringify(finetune.vorigeScenario, null, 2)}\n\nRespecteer de instructie en pas de juiste velden aan (aantalJaren, verdelingPerJaar, fasering, motivatie, prioriteitAdvies, samenvatting). Houd onveranderde delen consistent met de vorige versie.\n`
    : "";

  return `Je bent een programma-controller/begrotingsexpert binnen Cito BV (DIN-methodiek — Werken aan Programma's, Prevaas & Van Loon). Je produceert ÉÉN begrotingsscenario.${finetuneBlock}

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
        { "jaar": <startJaar>, "euro": <afgerond op duizend>, "fase": "<Voorbereiding | Uitrol | Opschaling | Borging>", "activiteit": "<1-2 ZINNEN concreet wat er DIT JAAR voor DEZE inspanning gebeurt — geen herhaling tussen jaren>" },
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
4. **ELK JAAR MOET HET VOLLEDIGE JAARLIJKSBUDGET WORDEN OPGEMAAKT — 100%, NOOIT ERONDER.**
   - Voor ELK jaar van \`startJaar\` tot en met \`startJaar + aantalJaren − 2\` (= alle jaren BEHALVE het laatste): som van \`verdelingPerJaar[jaar].euro\` over alle inspanningen MOET PRECIES \`jaarlijksBudgetEuro\` zijn — 100% benutting, geen onderbesteding.
   - Alleen het LAATSTE jaar (\`startJaar + aantalJaren − 1\`) mag een lager bedrag hebben (de afrondings-rest van het programma).
   - **BEDRIJFSECONOMISCHE NOODZAAK (Cito-realiteit):** jaarlijks budget dat NIET volledig besteed wordt heeft DUBBELE schade:
     (a) het ongebruikte bedrag valt vrij in datzelfde jaar (geen carry-over naar volgend jaar mogelijk), én
     (b) het opvolgende jaarbudget wordt door Finance verlaagd op basis van de werkelijke besteding van het vorige jaar — twee jaar onderbesteding kan het budget structureel halveren.
     Dit is geen organisatorische eis maar een financiële noodzaak om de meerjarenfinanciering veilig te stellen. Activiteit + budget moeten 1-op-1 lopen.
   - Voorbeeld bij €250K/jr en aantalJaren=4 (startjaar 2026): jaren 2026, 2027 en 2028 MOETEN samen ongeveer €250K per jaar uitgeven (€237.5K-€250K). Alleen 2029 mag minder zijn (bv. €100K als afrondingsjaar).
   - Plan zoveel parallelle activiteit (cultuur+mens samen, of harde+zachte kant tegelijk) dat het budget elk jaar tot het laatste volledig benut wordt. ALS er minder werk is dan budget toelaat: kies dan een korter aantalJaren in plaats van te onderbesteden.
5. **HARDE KANT EN ZACHTE KANT MOETEN PARALLEL — VANAF JAAR 1.**
   Dit is de belangrijkste regel naast de budget-opmaak. **Geen enkel domein mag wachten** tot een ander domein "klaar" is. Alle 4 domeinen MOETEN al in het startjaar (\`startJaar\`) een non-zero \`euro\`-bedrag hebben in hun \`verdelingPerJaar\`.
   - **Zachte kant** (cultuur + mens): leiderschapsprogramma's en gesprekvaardigheidstraining starten in jaar 1 en versterken elkaar.
   - **Harde kant** (data/systemen + processen): CRM-bouw, tooling-keuze, proces-ontwerp starten OOK in jaar 1 — die kan NIET wachten tot mens of cultuur "klaar" is. Wachten betekent dat in jaar 4 nog steeds geen werkende systemen er zijn — onacceptabel.
   - Beide kanten lopen tegelijk binnen het jaarbudget. Combineer en stagger binnen elk jaar; geen sequentiële domein-blokken.
   - **FASE-REALISTISCHE VERDELING per inspanning** (verhouding moet aansluiten bij wat in dat jaar gedaan wordt):
     - **Voorbereiding** (jaar 1, soms ook 2): typisch 10-25% van de inspannings-totaalkosten. Werk: scoping, ontwerp, leverancier-selectie, kick-off, eerste pilots.
     - **Uitrol** (middenjaren): typisch 50-65% van de totaalkosten — de zwaarste fase. Werk: trainingen aan volle breedte, CRM-bouw + integratie, proces-implementatie.
     - **Borging** (laatste jaar(en)): typisch 15-25% — verankering, evaluatie, doorlopende ondersteuning.
   - Outside-in geldt voor SPEND-zwaartepunt en RANKING (rank 1-4), NIET voor wanneer iets begint. Cultuur en mens hebben hun zwaartepunt vroeg (uitrol-fase eerder), data/systemen en processen midden-tot-laat (uitrol verder in tijd) — maar ze starten allemaal in jaar 1 met voorbereiding.
6. **Outside-in volgorde — voor RANKING (zwaartepunt-prioriteit), NIET voor sequentiële uitvoering:**
   - rank 1 = Cultuur (bereidheid — hoogste startzwaartepunt)
   - rank 2 = Mens (competenties — start parallel met cultuur, piek middenjaren)
   - rank 3 = Data/Systemen (CRM, tooling — start in jaar 1 maar piek midden-tot-laat)
   - rank 4 = Processen (werkwijzen — start in jaar 1 maar grootste deel borging in latere jaren)
   **De rank bepaalt de \`volgorde.rank\` waarde en de display-volgorde in de tabel. Ranking ≠ "begint pas later". Alle 4 domeinen starten parallel.** Volgorde van domeinen in de lijst (display): Cultuur → Mens → Data/Systemen → Processen.
7. **Realistische fasering per inspanning + activiteits-tekst per jaar — ALLE DOMEINEN STARTEN PARALLEL IN JAAR 1:**
   - Cultuur: START jaar 1 met piek (bewustwording, leiderschapsworkshops), afnemend (borging) → meest budget jaar 1-2
   - Mens: START jaar 1 (kick-off training + ontwerp curricula), piek middenjaren (training aan volle breedte), borging eind → over alle jaren verdeeld
   - Data/Systemen: START jaar 1 (architectuur-keuze, leverancier-selectie, eerste tooling), bouw + integratie middenjaren, optimalisatie eind → NIET wachten tot jaar 3
   - Processen: START jaar 1 (eerste proces-mapping en quick-wins), uitrol middenjaren, standaardisatie + borging eind → NIET wachten tot mens "klaar" is
   - **Activiteit-tekst per jaar moet hierbij aansluiten** en is concreet: "Bewustwordingsworkshops PO-leiders + waardenverkenning kerngroep" voor cultuur jaar 1; "CRM-leverancier selectie + architectuur-besluit" voor data/systemen jaar 1; "Quick-win procesmapping + standaard-template ontwerp" voor processen jaar 1. Geen herhaling tussen jaren — elke activiteit-tekst is uniek per (inspanning × jaar).
   - **FASE-TERMINOLOGIE — methodologisch en domein-passend (geen generiek "Voorbereiding/Uitrol/Borging" herhalen).** Kies per inspanning × jaar een fase-label uit de methodiek die bij dat domein past. Richtlijn:
     - **Cultuur** (veranderkundige fases — Kotter / ADKAR): Bewustwording → Acceptatie → Adoptie → Verankering. Of: Urgentiebesef → Coalitievorming → Waardenverankering → Rolmodel-gedrag.
     - **Mens** (competentie-ontwikkeling): Behoeftestelling → Curriculumontwerp → Basistraining → Vaardigheidstraining → Toepassing in praktijk → Borging (e-learning/nazorg).
     - **Data/Systemen** (IT-lifecycle — PRINCE2 / BiSL): Analyse → Ontwerp (architectuur) → Leverancier-selectie → Realisatie (bouw) → Acceptatie (tests/pilot) → In beheer → Optimalisatie.
     - **Processen** (BPM-lifecycle): Inventarisatie (as-is) → Herontwerp (to-be) → Pilot → Uitrol → Standaardisatie → Continu verbeteren.
   - Kies het fase-label dat beste past bij de concrete activiteit van dat jaar, niet willekeurig. Elk jaar mag een ander label hebben binnen dezelfde inspanning — het sjabloon-effect ("Voorbereiding/Uitrol/Borging" telkens) is expliciet verboden.
8. Alle euros als integers (75000, niet "€75K").
9. Antwoord in Nederlands. ALLEEN JSON, geen markdown, geen prose eromheen.`;
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
      finetuneInstructie,
      previousAdvies,
    } = body as {
      jaarlijksBudgetEuro?: number;
      cyclusMaanden?: number;
      startJaar?: number;
      focusDoel?: unknown;
      inspanningen?: unknown;
      finetuneInstructie?: string;
      previousAdvies?: unknown;
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

      // Server-side ENFORCEMENT: elke inspanning MOET in startjaar een non-zero
      // bedrag hebben (parallelle uitvoering = geen wachten). De HOOGTE volgt
      // fase-logica (voorbereiding klein, uitrol groot, borging klein) — AI
      // bepaalt zelf de verhoudingen op basis van \`fase\`. We forceren alleen
      // een minimaal symbolisch bedrag (€1000) als startCell volledig €0 is.
      const aiInspsParallelGuarded = ai.inspanningen.map((insp) => {
        const verdeling = insp.verdelingPerJaar.map((v) => ({ ...v }));
        const startCell = verdeling.find((v) => v.jaar === startJ);
        const totaal = verdeling.reduce((s, v) => s + (v.euro ?? 0), 0);
        if (totaal === 0) return insp;
        const huidigStart = startCell?.euro ?? 0;
        // Geen vast 10% meer — AI bepaalt fase-realistische verhouding.
        // Alleen ingrijpen als startjaar VOLLEDIG €0 is (= "wachten", verboden).
        if (huidigStart > 0) return { ...insp, verdelingPerJaar: verdeling };
        const minStartEuro = 1000; // Symbolisch — AI moet zelf realistischer ratio kiezen
        const tekort = minStartEuro - huidigStart;
        // Pak het grootste niet-startjaar en haal er tekort vandaan
        const nietStart = verdeling.filter((v) => v.jaar !== startJ);
        nietStart.sort((a, b) => (b.euro ?? 0) - (a.euro ?? 0));
        let nogTeShiften = tekort;
        for (const cell of nietStart) {
          if (nogTeShiften <= 0) break;
          const beschikbaar = Math.max(0, (cell.euro ?? 0) - 1000); // laat min 1k staan
          const shift = Math.min(beschikbaar, nogTeShiften);
          if (shift > 0) {
            cell.euro = (cell.euro ?? 0) - shift;
            nogTeShiften -= shift;
          }
        }
        const verschoven = tekort - nogTeShiften;
        if (verschoven > 0) {
          // Kies fase-label afhankelijk van domein (methodologisch)
          const domeinStartFase: Record<string, string> = {
            cultuur: "Bewustwording",
            mens: "Behoeftestelling",
            data_systemen: "Analyse",
            processen: "Inventarisatie",
          };
          const startFase = domeinStartFase[insp.domein] ?? "Scoping";
          if (startCell) {
            startCell.euro = (startCell.euro ?? 0) + verschoven;
            if (!startCell.activiteit || startCell.activiteit.trim().length === 0) {
              startCell.activiteit = "Parallelle start in jaar 1 — scoping en voorbereiding.";
            }
            if (!startCell.fase || startCell.fase.trim().length === 0) {
              startCell.fase = startFase;
            }
          } else {
            verdeling.push({
              jaar: startJ,
              euro: verschoven,
              fase: startFase,
              activiteit: "Parallelle start in jaar 1 — scoping en voorbereiding.",
            });
          }
        }
        verdeling.sort((a, b) => a.jaar - b.jaar);
        return { ...insp, verdelingPerJaar: verdeling };
      });

      // TWEEDE GUARD: per-jaar-totaal enforcement.
      // Eis: voor ELK jaar van startJ t/m eindJ-1 (= alle BEHALVE laatste):
      // som van inspanningen[i].verdelingPerJaar[jaar].euro >= 95% × jaarlijksBudget.
      // Als tekort: shift uit het GROOTSTE bedrag in een later jaar van de
      // grootste inspanning, totdat target gehaald is of er niets meer kan.
      const totalGuardedInsps = aiInspsParallelGuarded.map((insp) => ({
        ...insp,
        verdelingPerJaar: insp.verdelingPerJaar.map((v) => ({ ...v })),
      }));
      // 100% target — user-eis: optimistisch scenario MOET het volle bedrag besteden
      const minPerYear = jaarlijksBudget;
      for (let yr = startJ; yr <= eindJ - 1; yr++) {
        let huidigTotaal = totalGuardedInsps.reduce(
          (s, insp) => s + (insp.verdelingPerJaar.find((v) => v.jaar === yr)?.euro ?? 0),
          0
        );
        let veiligheidsTeller = 0;
        while (huidigTotaal < minPerYear && veiligheidsTeller < 50) {
          veiligheidsTeller++;
          const tekort = minPerYear - huidigTotaal;
          // Zoek het grootste bedrag in latere jaren (eindJ inclusief — laatste jaar mag korter)
          let bestInsp: typeof totalGuardedInsps[number] | null = null;
          let bestCell: { jaar: number; euro: number; fase: string; activiteit?: string } | null = null;
          let bestAmount = 0;
          for (const insp of totalGuardedInsps) {
            for (const cell of insp.verdelingPerJaar) {
              if (cell.jaar > yr && (cell.euro ?? 0) > bestAmount) {
                bestAmount = cell.euro ?? 0;
                bestInsp = insp;
                bestCell = cell;
              }
            }
          }
          if (!bestInsp || !bestCell || bestAmount <= 0) break;
          // GEEN buffer — user-eis is 'altijd 100%, niks eronder'.
          // Mag de hele cell leeggehaald worden indien nodig.
          const shift = Math.min(tekort, bestAmount);
          if (shift <= 0) break;
          bestCell.euro = (bestCell.euro ?? 0) - shift;
          // Voeg toe aan het current-year cell van diezelfde inspanning
          const targetCell = bestInsp.verdelingPerJaar.find((v) => v.jaar === yr);
          const domeinMidFase: Record<string, string> = {
            cultuur: "Adoptie",
            mens: "Vaardigheidstraining",
            data_systemen: "Realisatie",
            processen: "Uitrol",
          };
          const midFase = domeinMidFase[bestInsp.domein] ?? "Uitrol";
          if (targetCell) {
            targetCell.euro = (targetCell.euro ?? 0) + shift;
            if (!targetCell.activiteit || targetCell.activiteit.trim().length === 0) {
              targetCell.activiteit = "Opschaling en verdere uitrol van het traject.";
            }
            if (!targetCell.fase || targetCell.fase.trim().length === 0) {
              targetCell.fase = midFase;
            }
          } else {
            bestInsp.verdelingPerJaar.push({
              jaar: yr,
              euro: shift,
              fase: midFase,
              activiteit: "Opschaling en verdere uitrol van het traject.",
            });
            bestInsp.verdelingPerJaar.sort((a, b) => a.jaar - b.jaar);
          }
          huidigTotaal += shift;
        }
      }

      // DERDE GUARD: overschrijding reduceren.
      // Als een jaar > jaarlijksBudget, shift het teveel naar het laatste jaar.
      // Herhaal voor alle jaren (ook laatste mag boven budget als er werk is,
      // maar liever niet). We gaan van vroeg naar laat, zodat overshoot
      // naar achteren vloeit.
      for (let yr = startJ; yr <= eindJ; yr++) {
        let huidigTotaal = totalGuardedInsps.reduce(
          (s, insp) => s + (insp.verdelingPerJaar.find((v) => v.jaar === yr)?.euro ?? 0),
          0
        );
        let veiligheidsTeller = 0;
        while (huidigTotaal > jaarlijksBudget && veiligheidsTeller < 50) {
          veiligheidsTeller++;
          const overschot = huidigTotaal - jaarlijksBudget;
          // Zoek de inspanning met het grootste bedrag IN DIT jaar — neem daar af
          let bestInsp: typeof totalGuardedInsps[number] | null = null;
          let bestCell: { jaar: number; euro: number; fase: string; activiteit?: string } | null = null;
          let bestAmount = 0;
          for (const insp of totalGuardedInsps) {
            const cell = insp.verdelingPerJaar.find((v) => v.jaar === yr);
            if (cell && (cell.euro ?? 0) > bestAmount) {
              bestAmount = cell.euro ?? 0;
              bestInsp = insp;
              bestCell = cell;
            }
          }
          if (!bestInsp || !bestCell || bestAmount <= 0) break;
          const shift = Math.min(overschot, bestAmount);
          bestCell.euro = (bestCell.euro ?? 0) - shift;
          // Shift naar het LAATSTE jaar van diezelfde inspanning (of eerstvolgende ruimte)
          const laatsteCell = bestInsp.verdelingPerJaar.find((v) => v.jaar === eindJ);
          const domeinEindFase: Record<string, string> = {
            cultuur: "Verankering",
            mens: "Borging en nazorg",
            data_systemen: "In beheer",
            processen: "Standaardisatie",
          };
          const eindFase = domeinEindFase[bestInsp.domein] ?? "Borging";
          if (laatsteCell) {
            laatsteCell.euro = (laatsteCell.euro ?? 0) + shift;
            if (!laatsteCell.activiteit || laatsteCell.activiteit.trim().length === 0) {
              laatsteCell.activiteit = "Verankering en duurzame borging van het resultaat.";
            }
            if (!laatsteCell.fase || laatsteCell.fase.trim().length === 0) {
              laatsteCell.fase = eindFase;
            }
          } else {
            bestInsp.verdelingPerJaar.push({
              jaar: eindJ,
              euro: shift,
              fase: eindFase,
              activiteit: "Verankering en duurzame borging van het resultaat.",
            });
            bestInsp.verdelingPerJaar.sort((a, b) => a.jaar - b.jaar);
          }
          huidigTotaal -= shift;
        }
      }

      const enrichedInsps = totalGuardedInsps.map((insp) => {
        // Som per inspanning over alle jaren = totaalEuro
        const totaalEuro = insp.verdelingPerJaar.reduce((s, v) => s + (v.euro ?? 0), 0);
        return {
          ...insp,
          totaalEuro,
          verdelingPerJaar: insp.verdelingPerJaar.map((v) => ({
            jaar: v.jaar,
            euro: v.euro,
            fase: v.fase,
            activiteit: v.activiteit,
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

    // Bij finetune: pak de vorige scenario uit previousAdvies om als context mee
    // te geven aan AI. Helpt om consistentie te bewaren met onveranderde delen.
    const prevScenarios = (previousAdvies as
      | { scenarios?: { optimaal?: unknown; plus20?: unknown; min20?: unknown } }
      | undefined)?.scenarios;
    const trimmedInstructie = (finetuneInstructie ?? "").trim();
    const isFinetune = trimmedInstructie.length > 0 && !!prevScenarios;

    async function genereer(
      label: "optimaal" | "plus20" | "min20",
      jaarlijksBudget: number,
      staggerMs: number
    ): Promise<Scenario | null> {
      // Stagger startup om rate-limit-burst bij parallelle calls te voorkomen
      if (staggerMs > 0) await new Promise((r) => setTimeout(r, staggerMs));
      try {
        const finetuneArg = isFinetune
          ? { instructie: trimmedInstructie, vorigeScenario: prevScenarios?.[label] ?? null }
          : undefined;
        const systemPrompt = assembleSystemPrompt(
          scenarioPrompt(label, jaarlijksBudget, finetuneArg),
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
