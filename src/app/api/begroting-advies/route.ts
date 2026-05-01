import { NextRequest, NextResponse } from "next/server";
import { callClaudeWithValidation } from "@/lib/ai-client";
import { assembleSystemPrompt, extractKiBContext } from "@/lib/prompt-assembly";
import {
  parseDossierRaming,
  berekenMinimumJaren,
  totaalBenodigdBudget,
  budgetAdvies as berekenBudgetAdvies,
  berekenOptimaalOpties,
  type ParsedDossierRaming,
  type OptimaalOptie,
} from "@/lib/dossier-parser";
import { z } from "zod";

export const maxDuration = 300;

// Phase 19 — 3-scenario begrotingsadvies.
// Mental model: dossier-raming is HEILIG. Jaarlijks budget × aantal jaren
// volgt uit de dossiers — niet andersom. Server berekent vooraf het minimum
// aantal jaren per scenario uit parseDossierRaming(); AI mag dit NIET
// verlagen om te 'comprimeren'. Bij optimaal-jaren > 6 retourneren we een
// budgetAdvies — meer budget per jaar nodig om in 5–6 jaar af te ronden.
//
// Drie scenarios:
//   - optimaal  — jaarlijksBudget (user input, typisch €250K)
//   - plus20    — jaarlijksBudget × 1.2 (sneller)
//   - min20     — jaarlijksBudget × 0.8 (langzamer)
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
  label: z.enum(["optimaal", "plus20", "min20", "advies"]),
  jaarlijksBudgetEuro: z.number().optional(),
  aantalJaren: z.number().int().min(1).max(15),
  inspanningen: z.array(InspanningBegrotingSchema),
  prioriteitAdvies: z.string(),
  samenvatting: z.string(),
});

type ScenarioAI = z.infer<typeof ScenarioAISchema>;

// Volle Scenario-shape (na server-enrichment) — wat we naar de client sturen.
type Scenario = {
  label: "optimaal" | "plus20" | "min20" | "advies";
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
  label: "optimaal" | "plus20" | "min20" | "advies",
  jaarlijksBudget: number,
  fixedAantalJaren: number,
  dossierMetaTekst: string,
  finetune?: { instructie: string; vorigeScenario: unknown },
  zwaartepuntInjectie?: string
): string {
  const intro =
    label === "optimaal"
      ? "SCENARIO HUIDIG BUDGET — gebruiker's jaarlijks budget ongewijzigd; aantal jaren volgt uit de dossiers."
      : label === "plus20"
      ? "SCENARIO +20% — 20% méér budget per jaar; daardoor minder jaren nodig."
      : label === "min20"
      ? "SCENARIO −20% — 20% mínder budget per jaar; daardoor meer jaren nodig."
      : `SCENARIO OPTIMAAL (ADVIES) — server koos het kortste haalbare aantal jaren binnen [3,5] dat realistisch op te brengen is voor Cito gegeven het huidige budgetniveau. In jouw \`samenvatting\` MOET je expliciet motiveren waarom precies dit aantal jaren (${fixedAantalJaren}) optimaal is. Gebruik kwalitatieve argumenten zoals:\n  - Cultuurverandering vraagt minimaal 3 jaar voor verankering (bewustwording → adoptie → verankering vergt meerdere praktijkcycli);\n  - CRM-implementatie kan technisch in 2-3 jaar maar adoptie + datakwaliteit vergt nog 1 extra jaar;\n  - Outside-in gespreksvaardigheid vraagt 2 trainingsblokken + praktijkborging — minimaal 18-24 maanden actieve uitvoering;\n  - Bekostigingsrealisme: de benodigde jaarlijkse uitgaven moeten substantieel maar verantwoord zijn ten opzichte van het huidige budget — een uitlegbare stijging die binnen de programmabegroting past en niet afhankelijk is van een buiten-budgettaire dekking.\nVerzin GEEN concrete cijfers die niet uit dossier-aannames volgen — blijf kwalitatief in de motivatie. Vermijd expliciet het noemen van een formatie-kader, vaste percentage-grenzen of "stabiele jaren" — zulke framings horen niet thuis in de samenvatting.`;

  const finetuneBlock = finetune
    ? `\n\n**FINETUNE-VERZOEK VAN DE GEBRUIKER:**\n"${finetune.instructie}"\n\nDe gebruiker heeft een eerdere versie van dit scenario gezien en wil aanpassingen. Vorige versie:\n${JSON.stringify(finetune.vorigeScenario, null, 2)}\n\nRespecteer de instructie en pas de juiste velden aan (verdelingPerJaar, fasering, motivatie, prioriteitAdvies, samenvatting). Houd onveranderde delen consistent met de vorige versie. **aantalJaren staat vast — pas die NIET aan.**\n`
    : "";

  // Server-side berekend zwaartepunt per inspanning + relatieve positie-label.
  // Voorkomt dat AI verkeerde zwaartepunt-claims maakt (bijv. "richting slotjaar"
  // terwijl top-2 jaren in middenjaren liggen). AI hoeft niet te redeneren —
  // de positie-label staat letterlijk in de prompt.
  const zwaartepuntBlock = zwaartepuntInjectie
    ? `\n\n**SERVER-BEREKEND ZWAARTEPUNT PER INSPANNING (gebruik exact deze positie-labels in motivatie/samenvatting):**\n${zwaartepuntInjectie}\n`
    : "";

  return `Je bent een programma-controller/begrotingsexpert binnen Cito BV (DIN-methodiek — Werken aan Programma's, Prevaas & Van Loon). Je produceert ÉÉN begrotingsscenario.${finetuneBlock}${zwaartepuntBlock}

**MENTAL MODEL — DOSSIER IS HEILIG, JAREN ZIJN BEREKEND:**
Het aantal jaren én de totaalkosten per inspanning zijn al SERVER-SIDE berekend uit \`dossierKostenraming\` + \`businessCaseAannames\`. Jouw taak is **alleen verdelen**: hoe loopt elke inspanning over de gegeven jaren? Je mag de dossier-totalen NOOIT verlagen om in een budget-cap te passen — als het krap is, is dat al verwerkt in het aantal jaren.

${intro}

**VAST VOOR DIT SCENARIO:**
- jaarlijks budget: **€ ${jaarlijksBudget.toLocaleString("nl-NL")}**
- aantal jaren: **${fixedAantalJaren}** (server-berekend op basis van dossier-totalen — NIET aanpassen)

**DOSSIER-TOTALEN PER INSPANNING (server-berekend):**
${dossierMetaTekst}

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
  "aantalJaren": ${fixedAantalJaren},
  "inspanningen": [
    {
      "inspanningTitel": "...",
      "groepId": "...",
      "domein": "mens|processen|data_systemen|cultuur",
      "motivatie": "<1-2 zinnen — verwijs naar businessCaseAannames + dossier-totaal. GEEN absolute jaartallen (geen '2027-2028'), GEEN looptijd-claims ('over X jaar', 'X-jarige cyclus'), GEEN claim over wanneer het zwaartepunt valt in jaartallen. Gebruik relatieve aanduidingen: 'in de bouwjaren', 'rond het midden van de looptijd', 'in de achterste derde', 'in het slotjaar', 'tegen het einde'. Reden: jaartallen en looptijd worden door scenario bepaald, dus alleen relatieve aanduidingen blijven kloppen wanneer guards bedragen verschuiven.>",
      "verdelingPerJaar": [
        { "jaar": <startJaar>, "euro": <afgerond op duizend>, "fase": "<domein-passende fase, zie regel 7>", "activiteit": "<1-2 ZINNEN concreet wat er DIT JAAR voor DEZE inspanning gebeurt — geen herhaling tussen jaren>" },
        ...één item per jaar tot en met startJaar+${fixedAantalJaren}−1 (= ${fixedAantalJaren} items totaal)
      ],
      "volgorde": { "rank": <1..N uniek>, "reden": "<1 zin>" }
    }
  ],
  "prioriteitAdvies": "<4-6 zinnen: motiveer de BUDGET-VERHOUDING data/systemen > cultuur > mens > processen vanuit outside-in perspectief — leg uit waarom CRM het fundament is (grootste eenmalige post + technisch enabler), waarom cultuur #2 budget krijgt (zonder draagvlak geen adoptie van CRM en geen waarde uit outside-in), waarom mens #3 (gespreksvaardigheid vertaalt cultuur naar klant), en waarom processen het minst krijgen (borgings-werk in laatste fase). Sluit af met: alle 4 domeinen starten parallel in jaar 1, ranking gaat over budget-aandeel niet over startmoment. GEEN absolute jaartallen, GEEN looptijd-aantallen.>",
  "samenvatting": "<1-2 zinnen executive summary van dít scenario. GEEN absolute jaartallen, GEEN looptijd-aantallen — gebruik relatieve aanduidingen.>"
}

**LET OP:**
- \`aantalJaren\` is **${fixedAantalJaren}** — neem dit getal exact over, kies geen ander.
- Lever GEEN \`totaalEuro\`, \`percentageTotaal\`, \`totalenPerJaar\` of \`totaalGeraamdEuro\` — die worden SERVER-SIDE berekend.
- Lever GEEN \`percentage\` per jaar — die wordt server-side berekend.
- Houd \`verdelingPerJaar[].euro\` afgerond op duizend.

HARDE REGELS:
0. **DOSSIER-TOTAAL PER INSPANNING IS HEILIG.**
   Hierboven staat per inspanning een \`Doel-totaal\` (server-berekend midpunt + structureel × jaren) met een \`Min\` (ondergrens dossier-raming). De som van \`verdelingPerJaar[].euro\` per inspanning **MOET binnen [Min, Doel-totaal × 1.05]** vallen.
   - Verlaag NOOIT een inspanning onder de \`Min\` om aan budgetregels te voldoen.
   - VERZIN GEEN getallen die niet in \`businessCaseAannames\` of \`dossierKostenraming\` staan. Bij vage aannames: blijf in \`motivatie\` kwalitatief.
   - Als beide leeg zijn: gebruik Cito-benchmarks (trainingsdag €800/persoon, FTE/jaar €100K, consultantuur €120) en benoem dat in \`motivatie\`.
1. **aantalJaren is GEGEVEN: ${fixedAantalJaren}.** Niet aanpassen — het is server-berekend uit dossier-totalen / jaarlijksBudget. Verzet je niet door minder jaren te kiezen "om compacter te zijn" — dan moet je dossier-bedragen verlagen, en dat is verboden.
2. **Som van \`verdelingPerJaar[].euro\` per JAAR over alle inspanningen ≤ jaarlijksBudgetEuro.** Geen jaar-overschrijding.
3. **Som van \`verdelingPerJaar[].euro\` per INSPANNING ≥ \`Min\` (dossier-ondergrens) en ~ \`Doel-totaal\` (midpunt).** Streefwaarde is het Doel-totaal; tolerantie tot −5% (Min als absolute vloer) en +5% (mag iets hoger). Buiten deze band wordt het scenario afgekeurd.
4. **Streef naar gelijkmatige budget-benutting per jaar (80–100% van jaarlijksBudget).**
   - Onderbesteding van 1–2 jaar is acceptabel als het noodzakelijk is om dossier-totalen te respecteren (regel 0 staat boven regel 4).
   - Het laatste jaar mag een afrondingsjaar zijn met lager bedrag.
   - **Voorkeur**: jaren 1 t/m N−1 zitten op 85–100% van het jaarlijks budget. Als dat niet kan zonder dossier-bedragen te overschrijden, plan dan een afrondingsjaar; regel 0 weegt zwaarder dan deze regel.
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
6. **RANKING — gebaseerd op totaalEuro descending; CRM altijd #1:**
   - rank 1 = **Data/Systemen** ALTIJD (grootste budget — CRM is technisch fundament en grootste eenmalige post; zonder werkend CRM blijft outside-in onuitvoerbaar op schaal).
   - rank 2-4 = de overige drie domeinen op basis van \`totaalEuro\` descending. In Cito-context betekent dit dat cultuur in € klein blijft (dossier-bedrag van 9 leidinggevenden + extern), terwijl mens en processen iets groter zijn — dus ranking volgt €.
   - **In \`prioriteitAdvies\` MOET je expliciet uitleggen dat cultuur in EURO klein is (omdat de cultuur-Q&A een kleine doelgroep van leidinggevenden bedient) maar in BELANG #2 staat: zonder cultuurverandering en draagvlak wordt het CRM niet gebruikt zoals bedoeld en blijft outside-in een hol begrip.** Eurogrootte ≠ inhoudelijk belang — beide moeten in de motivatie staan, separaat.
   - De rank bepaalt de \`volgorde.rank\` waarde en de display-volgorde in de tabel. Alle 4 domeinen starten parallel in jaar 1, ranking gaat over budget-aandeel niet over startmoment.
7. **Realistische fasering per inspanning + activiteits-tekst per jaar — ALLE DOMEINEN STARTEN PARALLEL IN JAAR 1:**
   - Cultuur: START jaar 1 met piek (bewustwording, leiderschapsworkshops), afnemend (borging) → meest budget jaar 1-2
   - Mens: START jaar 1 (kick-off training + ontwerp curricula), piek middenjaren (training aan volle breedte), borging eind → over alle jaren verdeeld
   - Data/Systemen: START jaar 1 (architectuur-keuze, leverancier-selectie, eerste tooling), bouw + integratie middenjaren, optimalisatie eind → NIET wachten tot jaar 3
   - Processen: START jaar 1 (eerste proces-mapping en quick-wins), uitrol middenjaren, standaardisatie + borging eind → NIET wachten tot mens "klaar" is
   - **Activiteit-tekst per jaar moet hierbij aansluiten** en is concreet: "Bewustwordingsworkshops PO-leiders + waardenverkenning kerngroep" voor cultuur jaar 1; "CRM-leverancier selectie + architectuur-besluit" voor data/systemen jaar 1; "Quick-win procesmapping + standaard-template ontwerp" voor processen jaar 1. Geen herhaling tussen jaren — elke activiteit-tekst is uniek per (inspanning × jaar).
   - **FASE-TERMINOLOGIE — methodologisch en domein-passend (geen generiek "Voorbereiding/Uitrol/Borging" herhalen).** Kies per inspanning × jaar een fase-label uit de methodiek die bij dat domein past. Richtlijn:
     - **Cultuur** (veranderkundige fases): Bewustwording → Acceptatie → Adoptie → Verankering. Of: Urgentiebesef → Coalitievorming → Waardenverankering → Rolmodel-gedrag.
     - **Mens** (competentie-ontwikkeling): Behoeftestelling → Curriculumontwerp → Basistraining → Vaardigheidstraining → Toepassing in praktijk → Borging (e-learning/nazorg).
     - **Data/Systemen** (IT-lifecycle — PRINCE2 / BiSL): Analyse → Ontwerp (architectuur) → Leverancier-selectie → Realisatie (bouw) → Acceptatie (tests/pilot) → In beheer → Optimalisatie.
     - **Processen** (BPM-lifecycle): Inventarisatie (as-is) → Herontwerp (to-be) → Pilot → Uitrol → Standaardisatie → Continu verbeteren.
   - Kies het fase-label dat beste past bij de concrete activiteit van dat jaar, niet willekeurig. Elk jaar mag een ander label hebben binnen dezelfde inspanning — het sjabloon-effect ("Voorbereiding/Uitrol/Borging" telkens) is expliciet verboden.
8. Alle euros als integers (75000, niet "€75K"). In activiteit-teksten en samenvattingen: schrijf bedragen voluit ("€ 63.000") of voorgevoegd met "circa" wanneer benaderend ("circa € 63.000"). Gebruik **GEEN** tilde "~" als afkorting voor "circa", **GEEN** afkortingen als "€63K", en **GEEN** voorgaand minteken. Bedragen zijn altijd positief; uitgaven worden zonder minteken weergegeven.
9. Antwoord in Nederlands. ALLEEN JSON, geen markdown, geen prose eromheen.
10. **GEEN ABSOLUTE JAARTALLEN OF LOOPTIJD-CLAIMS in \`motivatie\`, \`prioriteitAdvies\` en \`samenvatting\`.**
    Schrijf in deze drie velden NOOIT:
    - Concrete jaartallen ("in 2027", "vanaf 2028", "zwaartepunt 2027–2028", "tot en met 2029").
    - Looptijd-aantallen ("over 4 jaar", "in 5 jaar", "× 9 jaar", "in jaar 4").
    - Cyclus-claims ("4-jarige cyclus", "3-jarige aanpak").
    - Specifieke jaar-tot-jaar fasering ("in 2026 starten we, in 2028 piekt het").
    Schrijf WEL relatief:
    - "in het startjaar", "in het slotjaar", "in de bouwjaren", "in de uitrol-jaren", "rond het midden van de looptijd", "in de achterste derde", "tegen het einde", "in de eerste twee jaren", "in de laatste fase".
    - Bij zwaartepunt: "het zwaartepunt valt in de bouw- en migratiefase" — niet "het zwaartepunt valt in 2027–2028".
    REDEN: jaartallen en looptijd verschillen per scenario (4/5/7/10 jaar), en server-guards kunnen bedragen tussen jaren verschuiven NA jouw tekst. Absolute jaartallen worden dan onwaar. Relatieve aanduidingen blijven onder alle scenario's en alle guard-mutaties kloppen.
    UITZONDERING: \`verdelingPerJaar[].activiteit\` (regel 7) is per definitie aan één specifiek jaar gebonden — daar mag je wel concreet over dat jaar schrijven, maar zonder andere jaartallen erin te noemen.
11. **VANGNET — INTERNE UREN HOREN NIET IN DEZE OUT-OF-POCKET RAMING.**
    De \`dossierKostenraming\`-tekst per inspanning kan in oudere data nog interne uren-componenten bevatten (bv. "interne capaciteitskosten 1.466 uur × €74/uur = €110K", "interne werkgroepuren €20K-€30K", "interne uren 740u à €77/u"). Deze posten zijn opportunity-kosten en horen in §4.2 Interne uren — NIET in de out-of-pocket-tabel die jij hier maakt.
    - Als de dossier-tekst dergelijke interne componenten noemt: TREK ZE AF van het eenmalig + structureel totaal voordat je verdelingPerJaar opstelt.
    - Voorbeelden van wel meenemen: externe partner, externe trainer, externe procesbegeleider, externe consultant (ook als ingehuurd voor "interne capaciteit"), licenties, software, hardware, dubbele licentielast tijdens transitie, externe materialen.
    - Voorbeelden van NIET meenemen: interne FTE-tarief × uren, interne werkgroepuren, intern projectleiderschap-uren, interne curricuulumontwikkeling, interne proceseigenaarschap-tijd.
    - In je \`motivatie\`: noem de interne uren NIET als onderdeel van het out-of-pocket-totaal. Eventueel mag je opmerken "(interne uren staan in §4.2)" als duidelijkheidshalve toelichting, maar reken ze niet mee.
12. **CONSISTENTE FASE-ACTIVITEITEN PER INSPANNING OVER SCENARIOS — geen verwarring tussen scenarios.**
    Dezelfde inspanning is in elk scenario hetzelfde project met dezelfde scope en dezelfde lifecycle-fases. Alleen het TEMPO verschilt per scenario (4 jr = sneller, 7 jr = uitgesmeerder). De ACTIVITEITEN PER FASE moeten daarom inhoudelijk consistent zijn over alle scenarios — alleen welk JAAR een fase landt verschilt.
    - **CRM (data_systemen)**: in elk scenario start je met "Analyse + ontwerp + leverancier-selectie" (analyse-fase), gevolgd door "Realisatie + integratie van bronsystemen" (realisatie-fase), dan "Acceptatie + uitrol naar 85 gebruikers" (uitrol-fase), eindigend met "In beheer + optimalisatie" (beheer-fase). De volgorde + activiteiten-set is identiek; alleen welke jaren gepland staat schuift.
    - **Mens (training)**: in elk scenario "Behoeftestelling + curriculumontwerp" → "Basistraining" → "Vaardigheidstraining + toepassing in praktijk" → "Borging via e-learning". Niet plotseling in 4-jarig "alleen training" en in 7-jarig "ontwerp + training + nazorg".
    - **Cultuur (leiderschap)**: in elk scenario "Bewustwording + coalitievorming" → "Leiderschapsworkshops + kerngroep" → "Acceptatie + adoptie via rolmodel-gedrag" → "Verankering in HR-instrumenten".
    - **Processen (BPM)**: in elk scenario "Inventarisatie as-is" → "Herontwerp to-be + pilot" → "Uitrol cross-sectoraal" → "Standaardisatie + continu verbeteren".
    - REDEN: als de gebruiker advies-scenario en optimaal-scenario naast elkaar leest, ziet hij voor dezelfde inspanning dezelfde fase-keten — alleen versneld of uitgesmeerd. Verschillende activiteiten per scenario voor dezelfde inspanning = verwarring + ondermijnt geloofwaardigheid.
    - Concreet: als advies-scenario voor CRM jaar 2 "Realisatie van CRM-platform + 7 bronsysteemintegraties" zegt, dan moet optimaal-scenario voor CRM-realisatie ook praten over hetzelfde aantal bronsysteemintegraties + dezelfde scope, alleen in een ander jaar.
13. **CONSISTENTE MOTIVATIE + POSITIE PER INSPANNING OVER SCENARIOS — geen scenario-noise.**
    Per inspanning is \`motivatie\` en \`volgorde.reden\` (positie-label) IDENTIEK over alle scenarios. Dezelfde inspanning beschrijft hetzelfde dossier — waarom we dit doen, business case, scope. Dat staat los van scenario-tempo.
    - **Wat WEL per scenario verschilt**: \`samenvatting\` (beschrijft dit scenario als geheel) en \`prioriteitAdvies\` (welke domein-volgorde gegeven dit budget-cap). Die mogen scenario-specifiek zijn.
    - **Wat NIET per scenario verschilt**: \`motivatie\` per inspanning (= waarom doen we deze inspanning, dossier-onderbouwing) en \`volgorde.reden\` (= positie-label, waarom is deze rangorde).
    - Concreet: schrijf de \`motivatie\` voor CRM één keer; gebruik EXACT dezelfde tekst in advies, plus20, optimaal en min20. Idem voor \`volgorde.reden\`. AI vertaalt scenario-context in samenvatting/prioriteitAdvies, NIET in motivatie/positie.
    - REDEN: lezer vergelijkt scenarios kolom-voor-kolom. Als motivatie van CRM in advies "Het CRM is het technische fundament" zegt en in plus20 "Het dossier raamt €440K-€640K" → onverklaarbaar onderscheid → vragen over geloofwaardigheid.
    - **GEEN SCENARIO-TOTALEN IN MOTIVATIE.** Noem in \`motivatie\` GEEN cumulatieve scenario-bedragen ("doel-totaal circa € 910.000", "totaal € 1.125.000", "deze post bedraagt € 817K"). Die verschillen per scenario en zijn fout als 1-op-1 gekopieerd. Noem WEL dossier-bedragen die heilig zijn ongeacht scenario: eenmalig (€ 440-640K) en jaarlijks structureel (€ 92.500/jaar). Sluit eventueel af met "Het scenario-totaal in de tabel hangt af van de looptijd". Het scenario-totaal staat al in de tabel rechts; hoeft niet in motivatie.`;
}

const VergelijkingSchema = z.object({
  vergelijking: z.string(),
});

function vergelijkingsPrompt(): string {
  return `Je geeft een korte vergelijking (3-4 zinnen, Nederlands) van VIER begrotingsscenario's die ALLEMAAL hetzelfde einddoel bereiken, maar verschillen in tempo en jaarlijks budget.

Input JSON:
{
  "huidigBudget": { aantalJaren, jaarlijksBudgetEuro, totaalGeraamdEuro },
  "plus20":       { aantalJaren, jaarlijksBudgetEuro, totaalGeraamdEuro },
  "min20":        { aantalJaren, jaarlijksBudgetEuro, totaalGeraamdEuro },
  "advies":       { aantalJaren, jaarlijksBudgetEuro, totaalGeraamdEuro }
}

\`huidigBudget\` houdt jaarlijks budget gelijk en laat aantalJaren volgen uit dossier-totalen. \`plus20\` en \`min20\` schalen het jaarlijks budget. \`advies\` is het AI-aanbevolen scenario: kortste haalbare looptijd binnen [3,5] jaar dat nog bekostbaar is voor Cito.

Output:
{ "vergelijking": "<3-4 zinnen die de 4 scenario's duiden: tempo-verschillen in jaartallen, wat dat betekent voor organisatie-belasting, en waarom \`advies\` het meest pragmatische scenario is.>" }

Regels: Nederlands, 3-4 zinnen, JSON only.`;
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
      forceAantalJaren,
    } = body as {
      jaarlijksBudgetEuro?: number;
      cyclusMaanden?: number;
      startJaar?: number;
      focusDoel?: unknown;
      inspanningen?: unknown;
      finetuneInstructie?: string;
      previousAdvies?: unknown;
      // Optioneel: per scenario expliciet aantal jaren forceren. Wordt
      // gebruikt voor de "A2"-flow waarbij dossier-correcties worden
      // toegepast zonder dat de looptijden inkrimpen — methodische zuiverheid:
      // de fysieke uitvoeringstijd verandert niet door een rekenkundige fix.
      forceAantalJaren?: Partial<Record<"optimaal" | "plus20" | "min20" | "advies", number>>;
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

    // Parse dossier-ramingen per inspanning. Dit voorkomt dat AI bedragen
    // comprimeert om in budget × jaren te passen — we berekenen vooraf het
    // benodigde aantal jaren en geven dossier-totalen + Min-grens mee.
    type InspIn = {
      titel?: string;
      domein?: string;
      dossierKostenraming?: string;
    };
    const inspsArr = inspanningen as InspIn[];
    const ramingenPerInsp: Array<{
      titel: string;
      domein: string;
      raming: ParsedDossierRaming;
    }> = inspsArr.map((i, idx) => ({
      titel: i.titel ?? `Inspanning ${idx + 1}`,
      domein: i.domein ?? "",
      raming: parseDossierRaming(i.dossierKostenraming),
    }));

    // Bereken minimum jaren per scenario op basis van dossier-totalen.
    // GEEN harde cap meer: aantalJaren volgt vrij uit dossier-totaal /
    // jaarlijksBudget zodat dossier-bedragen (vooral CRM-min) ALTIJD
    // worden overgenomen. Eventuele lange uitlopers (>6 jaar) zijn een
    // signaal dat budget structureel te krap is — dan toont UI nog steeds
    // het budgetAdvies-banner.
    const MAX_JAREN_GEVEL = 15; // absolute bovengrens, alleen safeguard
    const minOptimaal = berekenMinimumJaren(
      ramingenPerInsp.map((r) => r.raming),
      budgetOptimaal,
      "mid",
      MAX_JAREN_GEVEL
    );
    const minPlus20 = berekenMinimumJaren(
      ramingenPerInsp.map((r) => r.raming),
      budgetPlus20,
      "mid",
      MAX_JAREN_GEVEL
    );
    const minMin20 = berekenMinimumJaren(
      ramingenPerInsp.map((r) => r.raming),
      budgetMin20,
      "mid",
      MAX_JAREN_GEVEL
    );

    // Budget-advies: tonen wanneer huidig-budget-scenario meer dan 6 jaar
    // nodig heeft (= signaal dat budget structureel te krap is voor
    // gewenste 5-jaarlijkse uitvoering). Dit is informatief, niet beperkend
    // — het scenario zelf wordt gewoon volledig op basis van dossier
    // gegenereerd, ongeacht het aantal jaren.
    const HUIDIG_BUDGET_DREMPEL_JAREN = 6;
    const budgetAdviesData =
      minOptimaal.jaren > HUIDIG_BUDGET_DREMPEL_JAREN
        ? berekenBudgetAdvies({
            jaarlijksBudgetEuro: budgetOptimaal,
            ramingen: ramingenPerInsp.map((r) => ({ titel: r.titel, raming: r.raming })),
            doelJaren: 5,
          })
        : null;

    // ADVIES-scenario: server kiest kortste haalbare aantal jaren binnen
    // [3,5] dat nog bekostbaar is voor Cito (drempel: max +40% boven huidig
    // budget). Bij geen haalbare keuze: pak het langste scenario (=5 jaar,
    // laagste budget). AI doet vervolgens alleen de jaar-verdeling op de
    // gekozen looptijd + budget.
    const optimaalOpties: OptimaalOptie[] = berekenOptimaalOpties(
      ramingenPerInsp.map((r) => r.raming),
      budgetOptimaal,
      3,
      5
    );
    const ADVIES_BUDGET_DREMPEL_PCT = 40; // max +40% boven huidig budget = bekostbaar
    function kiesAdviesScenario(opties: OptimaalOptie[]): OptimaalOptie {
      // Sorteer kort→lang. Pak kortste die binnen drempel valt.
      const haalbaar = opties
        .filter((o) => o.pctVerschilTovHuidig <= ADVIES_BUDGET_DREMPEL_PCT)
        .sort((a, b) => a.jaren - b.jaren);
      if (haalbaar.length > 0) return haalbaar[0];
      // Geen enkele optie binnen +40%: pak het langste (= laagste budget per jaar).
      return [...opties].sort((a, b) => b.jaren - a.jaren)[0];
    }
    const adviesKeuze = kiesAdviesScenario(optimaalOpties);

    // Bouw dossier-meta tekst per scenario voor in de prompt
    function dossierMetaTekst(scenarioJaren: number): string {
      const structureleJaren = Math.max(0, scenarioJaren - 1);
      return ramingenPerInsp
        .map((r) => {
          const eenmalig = r.raming.eenmaligMid;
          const struc = r.raming.structureelMidPerJr;
          const doelTotaal = eenmalig + struc * structureleJaren;
          const minTotaal = r.raming.eenmaligLow + r.raming.structureelLowPerJr * structureleJaren;
          if (r.raming.unparsed || doelTotaal === 0) {
            return `- **${r.titel}** (${r.domein}): Doel-totaal onbekend — dossier-raming kon niet geparseerd worden, val terug op kwalitatieve schatting.`;
          }
          const strucDeel = struc > 0
            ? ` (waarvan €${(struc * structureleJaren).toLocaleString("nl-NL")} structureel = €${struc.toLocaleString("nl-NL")}/jaar × ${structureleJaren} jaar)`
            : "";
          return `- **${r.titel}** (${r.domein}): Doel-totaal €${doelTotaal.toLocaleString("nl-NL")}${strucDeel}; Min €${minTotaal.toLocaleString("nl-NL")}.`;
        })
        .join("\n");
    }

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

      // (Voorheen: TWEEDE GUARD die geld VAN latere jaren NAAR eerdere jaren
      // shiftte om 100%-jaar-benutting af te dwingen — VERWIJDERD per
      // 2026-04-29 omdat dit dossier-totalen onrealistisch hoog comprimeerde
      // in jaar 1 en bv. CRM-realisatie in jaar 2 op €62K duwde. Dossier is
      // nu heilig: aantalJaren wordt server-side gekozen zodat de bedragen
      // gewoon passen, en onderbesteding in 1-2 jaar is acceptabel.)
      const totalGuardedInsps = aiInspsParallelGuarded.map((insp) => ({
        ...insp,
        verdelingPerJaar: insp.verdelingPerJaar.map((v) => ({ ...v })),
      }));

      // SCALE-UP GUARD: schaal elke inspanning naar dossier-mid als AI
      // eronder is gebleven. Voorkomt dossier-tekorten in scenarios met
      // ruime aantalJaren (huidig budget, min20). Verspreidt het tekort
      // proportioneel over de jaren zodat fasering behouden blijft.
      // Voor 'advies'-scenario (vaste 4 jaar) waar mid-totaal exact in cap
      // past, doet deze stap meestal niets — AI zit daar al op mid.
      for (const insp of totalGuardedInsps) {
        const ramingMatch = ramingenPerInsp.find(
          (r) =>
            r.titel === insp.inspanningTitel ||
            r.titel.toLowerCase() === insp.inspanningTitel.toLowerCase()
        );
        if (!ramingMatch || ramingMatch.raming.unparsed) continue;
        const huidigTotaal = insp.verdelingPerJaar.reduce(
          (s, v) => s + (v.euro ?? 0),
          0
        );
        const structureleJaren = Math.max(0, ai.aantalJaren - 1);
        const doelTotaal =
          ramingMatch.raming.eenmaligMid +
          ramingMatch.raming.structureelMidPerJr * structureleJaren;
        const minTotaal =
          ramingMatch.raming.eenmaligLow +
          ramingMatch.raming.structureelLowPerJr * structureleJaren;
        if (doelTotaal === 0 || minTotaal === 0) continue;
        // Schaal altijd naar dossier-mid, tenzij AI al ≥ 98% van mid heeft.
        // Voorkomt dat AI op min blijft hangen (en scenario kunstmatig
        // goedkoper lijkt dan dossier-realistisch). Garandeert consistente
        // mid-totalen tussen scenarios — verschillen komen dan ALLEEN uit
        // structureel × jaren, niet uit AI-conservatisme.
        if (huidigTotaal >= doelTotaal * 0.98) continue;
        const factor = huidigTotaal > 0 ? doelTotaal / huidigTotaal : 0;
        if (huidigTotaal > 0 && factor > 1) {
          // Proportioneel ophogen, afronden op duizend
          for (const v of insp.verdelingPerJaar) {
            v.euro = Math.round(((v.euro ?? 0) * factor) / 1000) * 1000;
          }
          console.log(
            `[begroting-advies] scale-up ${insp.inspanningTitel}: €${huidigTotaal.toLocaleString("nl-NL")} → ~€${doelTotaal.toLocaleString("nl-NL")} (factor ${factor.toFixed(2)})`
          );
        } else if (huidigTotaal === 0) {
          // AI gaf alle jaren €0: verdeel mid evenredig
          const perJaar = Math.round(doelTotaal / insp.verdelingPerJaar.length / 1000) * 1000;
          for (const v of insp.verdelingPerJaar) {
            v.euro = perJaar;
          }
          console.log(
            `[begroting-advies] scale-up van €0 ${insp.inspanningTitel}: spread €${doelTotaal} over ${insp.verdelingPerJaar.length} jaar`
          );
        }
      }

      // GUARD: overschrijding reduceren.
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

      // VOL-BUDGET GUARD: vul niet-laatste jaren proactief tot ze precies
      // jaarlijksBudget uitgeven. Schuift bedragen VAN latere jaren NAAR
      // vroege jaren (preserve totaal per inspanning). Stop wanneer er geen
      // surplus meer in latere jaren beschikbaar is. Het laatste jaar mag
      // dan onder budget komen (= afrondingsjaar).
      for (let yr = startJ; yr <= eindJ - 1; yr++) {
        let huidigTotaal = totalGuardedInsps.reduce(
          (s, insp) => s + (insp.verdelingPerJaar.find((v) => v.jaar === yr)?.euro ?? 0),
          0
        );
        let veiligheidsTeller = 0;
        while (huidigTotaal < jaarlijksBudget && veiligheidsTeller < 50) {
          veiligheidsTeller++;
          const tekort = jaarlijksBudget - huidigTotaal;
          // Zoek het grootste bedrag in een later jaar (eindJ inclusief — daar mag
          // resultbedrag staan). We nemen daarvan en shift naar huidig jaar.
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
      | { scenarios?: { optimaal?: unknown; plus20?: unknown; min20?: unknown; advies?: unknown } }
      | undefined)?.scenarios;
    const trimmedInstructie = (finetuneInstructie ?? "").trim();
    const isFinetune = trimmedInstructie.length > 0 && !!prevScenarios;

    // TEKST_ONLY-modus: prefix in finetune-instructie betekent dat AI alleen
    // motivatie/prioriteitAdvies/samenvatting mag herschrijven. Server kopieert
    // ALLE cijfers, fase-labels en activiteit-teksten LETTERLIJK terug uit
    // previousAdvies — zodat bedragen heilig blijven ongeacht wat AI of guards
    // doen. Gebruikt door de "🔁 Herschrijf alleen teksten"-knop in de wizard.
    const TEKST_ONLY_PREFIX = "TEKST_ONLY:";
    const isTekstOnly =
      isFinetune && trimmedInstructie.startsWith(TEKST_ONLY_PREFIX);

    // Bereken server-side zwaartepunt per inspanning vanuit previousAdvies.
    // Wordt alleen geïnjecteerd in TEKST_ONLY-mode of bij finetune zodat
    // AI de top-2 jaren niet hoeft te raden. Bij eerste generatie (geen
    // previousAdvies) is er nog geen verdeling om uit te lezen.
    type PrevInsp = {
      inspanningTitel?: string;
      verdelingPerJaar?: { jaar: number; euro: number }[];
    };
    type PrevScen = { aantalJaren?: number; startJaar?: number; inspanningen?: PrevInsp[] };
    function zwaartepuntTekst(label: "optimaal" | "plus20" | "min20" | "advies"): string {
      const prev = (prevScenarios?.[label] as PrevScen | null | undefined);
      if (!prev?.inspanningen || !prev.aantalJaren) return "";
      const aantalJaren = prev.aantalJaren;
      const startJ = prev.startJaar ?? effectiefStartJaar;
      const eindJ = startJ + aantalJaren - 1;

      function positieLabel(top2Jaren: number[]): string {
        // Sorteer en bepaal positie binnen 3 segmenten: vroeg / midden / laat.
        const eersteDerde = startJ + Math.floor(aantalJaren / 3);
        const tweedeDerde = startJ + Math.floor((2 * aantalJaren) / 3);
        const inEerste = top2Jaren.filter((j) => j < eersteDerde).length;
        const inMidden = top2Jaren.filter((j) => j >= eersteDerde && j < tweedeDerde).length;
        const inLaatste = top2Jaren.filter((j) => j >= tweedeDerde).length;
        if (inEerste === 2) return "vroeg in de looptijd (in de eerste twee jaren)";
        if (inLaatste === 2) {
          // Onderscheid 'achterste derde' vs 'in het slotjaar'
          if (top2Jaren.every((j) => j === eindJ)) return "in het slotjaar";
          return "in de achterste derde van de looptijd";
        }
        if (inMidden === 2) return "rond het midden van de looptijd";
        if (inEerste === 1 && inLaatste === 1) return "zowel vroeg als laat in de looptijd (start-piek plus structurele uitloop)";
        if (inEerste === 1 && inMidden === 1) return "in de eerste helft van de looptijd";
        if (inMidden === 1 && inLaatste === 1) return "in de tweede helft van de looptijd";
        return "verspreid over de looptijd";
      }

      const lijnen: string[] = [];
      for (const insp of prev.inspanningen) {
        if (!insp.verdelingPerJaar?.length || !insp.inspanningTitel) continue;
        const sorted = [...insp.verdelingPerJaar].sort((a, b) => (b.euro ?? 0) - (a.euro ?? 0));
        const top2 = sorted.slice(0, 2).filter((c) => (c.euro ?? 0) > 0);
        if (top2.length === 0) continue;
        const top2Jaren = top2.map((c) => c.jaar).sort((a, b) => a - b);
        const totaal = insp.verdelingPerJaar.reduce((s, c) => s + (c.euro ?? 0), 0);
        const top2Pct = top2.map((c) => (totaal > 0 ? Math.round(((c.euro ?? 0) / totaal) * 100) : 0));
        const label2 = positieLabel(top2Jaren);
        lijnen.push(
          `- **${insp.inspanningTitel}**: top-2 jaren met hoogste bedrag = jaar ${top2Jaren.join(" + ")} (${top2Pct.join("% + ")}%). Positie-label: "${label2}". Beschrijf het zwaartepunt voor deze inspanning EXACT als "${label2}" — geen jaartallen, geen andere positie-bewoordingen.`
        );
      }
      if (lijnen.length === 0) return "";
      const looptijdLabel =
        aantalJaren <= 4 ? "compact"
        : aantalJaren <= 6 ? "evenwichtig"
        : aantalJaren <= 8 ? "ruim"
        : "lang uitgesmeerd";
      return `Looptijd dit scenario: ${aantalJaren} jaar (${looptijdLabel}). VOLLEDIG programma loopt binnen deze jaren — GEEN aanloop-fase, GEEN vervolgfinanciering nodig.\n\n${lijnen.join("\n")}`;
    }

    async function genereer(
      label: "optimaal" | "plus20" | "min20" | "advies",
      jaarlijksBudget: number,
      fixedAantalJaren: number,
      _staggerMs: number
    ): Promise<Scenario | null> {
      // Stagger uitgeschakeld — alle 4 scenarios starten direct parallel om
      // binnen Vercel's 60s timeout te blijven (anders +600ms voor advies-call).
      try {
        const finetuneArg = isFinetune
          ? { instructie: trimmedInstructie, vorigeScenario: prevScenarios?.[label] ?? null }
          : undefined;
        const dossierMd = dossierMetaTekst(fixedAantalJaren);
        const zwInj = isFinetune ? zwaartepuntTekst(label) : "";
        const systemPrompt = assembleSystemPrompt(
          scenarioPrompt(label, jaarlijksBudget, fixedAantalJaren, dossierMd, finetuneArg, zwInj),
          "cross-analyse",
          undefined,
          kibContext
        );
        const userMessage = JSON.stringify(
          {
            ...scenarioInput,
            jaarlijksBudgetEuro: jaarlijksBudget,
            aantalJaren: fixedAantalJaren,
          },
          null,
          2
        );
        const res = await callClaudeWithValidation(
          ScenarioAISchema,
          systemPrompt,
          userMessage,
          {
            maxTokens: 8192,
            retryDelayMs: 1000,
            // Opus 4.7 — hoogste inhoudelijke kwaliteit voor DIN-context
            // (Prevaas/Van Loon, outside-in, Cito-realiteit). Vercel Pro
            // Fluid Compute met maxDuration=300s ondersteunt deze runtime.
            model: "claude-opus-4-7",
          }
        );
        if (res.success) {
          // Forceer aantalJaren naar de server-berekende waarde —
          // AI mag deze niet overrulen, ook al staat het in het schema.
          const overruled = { ...res.data, aantalJaren: fixedAantalJaren };
          const enriched = enrichScenario(overruled, jaarlijksBudget);

          // TEKST_ONLY-garantie: in deze modus mag AI alleen de drie tekst-
          // velden veranderen. Server kopieert ALLE cijfers, fase-labels en
          // activiteit-teksten letterlijk terug uit previousAdvies.
          if (isTekstOnly) {
            const prev = (prevScenarios?.[label] ?? null) as Scenario | null;
            if (prev) {
              // Alleen samenvatting + prioriteitAdvies (top-level) en
              // motivatie (per inspanning) uit de nieuwe AI-output overnemen.
              // Alle cijfers, fase-labels, activiteit-teksten, totalen,
              // percentages, looptijd: letterlijk uit previousAdvies.
              return {
                ...prev,
                samenvatting: enriched.samenvatting,
                prioriteitAdvies: enriched.prioriteitAdvies,
                inspanningen: prev.inspanningen.map((prevInsp) => {
                  const match = enriched.inspanningen.find(
                    (i) =>
                      i.inspanningTitel === prevInsp.inspanningTitel ||
                      i.inspanningTitel.toLowerCase() ===
                        prevInsp.inspanningTitel.toLowerCase()
                  );
                  return {
                    ...prevInsp,
                    motivatie: match?.motivatie ?? prevInsp.motivatie,
                  };
                }),
              };
            }
          }

          return enriched;
        }
        console.error(`[begroting-advies] ${label} validation failed:`, res.error);
        return null;
      } catch (err) {
        console.error(`[begroting-advies] ${label} threw:`, err);
        return null;
      }
    }

    // Per scenario: gebruik geforceerde aantalJaren als opgegeven, anders
    // server-berekend minimum. Geforceerde waarden komen uit de A2-flow
    // (dossier-correctie zonder looptijd-verkorting).
    const jOptimaal = forceAantalJaren?.optimaal ?? minOptimaal.jaren;
    const jPlus20 = forceAantalJaren?.plus20 ?? minPlus20.jaren;
    const jMin20 = forceAantalJaren?.min20 ?? minMin20.jaren;
    const jAdvies = forceAantalJaren?.advies ?? adviesKeuze.jaren;
    const [optimaal, plus20, min20, advies] = await Promise.all([
      genereer("optimaal", budgetOptimaal, jOptimaal, 0),
      genereer("plus20", budgetPlus20, jPlus20, 200),
      genereer("min20", budgetMin20, jMin20, 400),
      genereer("advies", adviesKeuze.benodigdJaarlijks, jAdvies, 600),
    ]);

    // === Cross-scenario consistentie-enforcer ===
    // Per inspanning: motivatie + volgorde.reden IDENTIEK over alle scenarios.
    // Canonical = optimaal scenario (richtlijn HARDE REGEL 13).
    // Beschermt tegen AI die regel 13 negeert.
    {
      const scenarios: Record<string, Scenario | null> = { optimaal, plus20, min20, advies };
      const canonical = scenarios.optimaal;
      if (canonical?.inspanningen) {
        const motByInsp: Record<string, string> = {};
        const posByInsp: Record<string, string> = {};
        for (const i of canonical.inspanningen) {
          if (i.motivatie) motByInsp[i.inspanningTitel] = i.motivatie;
          if (i.volgorde?.reden) posByInsp[i.inspanningTitel] = i.volgorde.reden;
        }
        for (const [k, sc] of Object.entries(scenarios)) {
          if (!sc || k === "optimaal") continue;
          for (const ins of sc.inspanningen ?? []) {
            const newMot = motByInsp[ins.inspanningTitel];
            const newPos = posByInsp[ins.inspanningTitel];
            if (newMot) ins.motivatie = newMot;
            if (newPos && ins.volgorde) ins.volgorde.reden = newPos;
          }
        }
      }
    }

    // Per fase: activiteit IDENTIEK per inspanning waar zelfde fase-naam voorkomt.
    // Eerste cell met die fase is canonical voor die inspanning.
    {
      const scenarios: Record<string, Scenario | null> = { optimaal, plus20, min20, advies };
      // Bouw per inspanning een map: fase-naam -> activiteit (uit eerste keer dat fase voorkomt)
      // Dan in tweede pass: hervul activiteit per cell met die canonical
      const activiteitPerInspFase: Record<string, Record<string, string>> = {};
      for (const sc of Object.values(scenarios)) {
        if (!sc?.inspanningen) continue;
        for (const ins of sc.inspanningen) {
          if (!activiteitPerInspFase[ins.inspanningTitel]) {
            activiteitPerInspFase[ins.inspanningTitel] = {};
          }
          const lib = activiteitPerInspFase[ins.inspanningTitel];
          for (const cell of ins.verdelingPerJaar ?? []) {
            if (cell.fase && cell.activiteit && !lib[cell.fase]) {
              lib[cell.fase] = cell.activiteit;
            }
          }
        }
      }
      for (const sc of Object.values(scenarios)) {
        if (!sc?.inspanningen) continue;
        for (const ins of sc.inspanningen) {
          const lib = activiteitPerInspFase[ins.inspanningTitel];
          if (!lib) continue;
          for (const cell of ins.verdelingPerJaar ?? []) {
            if (cell.fase && lib[cell.fase]) {
              cell.activiteit = lib[cell.fase];
            }
          }
        }
      }
    }

    // Server-side validatie per inspanning: totaalEuro moet ≥ 90% × dossier-
    // ondergrens zijn. Onder die drempel is het scenario verdacht (AI heeft
    // bedragen alsnog gecomprimeerd ondanks instructies). We loggen + voegen
    // metadata toe; we verwerpen niet — UI kan waarschuwen.
    function validateAgainstDossier(scenario: Scenario | null): {
      ok: boolean;
      tekorten: Array<{ titel: string; geleverd: number; minimaal: number }>;
    } {
      if (!scenario) return { ok: true, tekorten: [] };
      const tekorten: Array<{ titel: string; geleverd: number; minimaal: number }> = [];
      const structureleJaren = Math.max(0, scenario.aantalJaren - 1);
      for (const insp of scenario.inspanningen) {
        const match = ramingenPerInsp.find(
          (r) => r.titel === insp.inspanningTitel || r.titel.toLowerCase() === insp.inspanningTitel.toLowerCase()
        );
        if (!match || match.raming.unparsed || match.raming.eenmaligLow === 0) continue;
        const minTotaal =
          match.raming.eenmaligLow + match.raming.structureelLowPerJr * structureleJaren;
        const drempel = Math.round(minTotaal * 0.9);
        if (insp.totaalEuro < drempel) {
          tekorten.push({
            titel: insp.inspanningTitel,
            geleverd: insp.totaalEuro,
            minimaal: minTotaal,
          });
        }
      }
      if (tekorten.length > 0) {
        console.warn(`[begroting-advies] dossier-validation tekorten:`, tekorten);
      }
      return { ok: tekorten.length === 0, tekorten };
    }
    const validatieOptimaal = validateAgainstDossier(optimaal);
    const validatiePlus20 = validateAgainstDossier(plus20);
    const validatieMin20 = validateAgainstDossier(min20);
    const validatieAdvies = validateAgainstDossier(advies);

    // Bij minimaal 1 succesvolle scenario: stuur die terug; client kan
    // partial-result tonen met waarschuwing voor de gefaalde scenarios.
    const falend = [
      !optimaal ? "optimaal" : null,
      !plus20 ? "plus20" : null,
      !min20 ? "min20" : null,
      !advies ? "advies" : null,
    ].filter(Boolean) as string[];

    if (!optimaal && !plus20 && !min20 && !advies) {
      return NextResponse.json(
        {
          success: false,
          error: "Alle 4 scenario's faalden — controleer Vercel-logs voor details, of probeer opnieuw.",
        },
        { status: 200 }
      );
    }

    // Vergelijking — server-side template (geen extra AI-call) zodat we
    // binnen Vercel's 60s timeout blijven. AI's motivatie zit al in elke
    // scenario.samenvatting; deze tekst is een neutrale 4-scenario duiding.
    const allOk = optimaal && plus20 && min20 && advies;
    let vergelijking = "";
    if (allOk) {
      const fmt = (n: number) => `€${n.toLocaleString("nl-NL")}`;
      vergelijking =
        `Huidig budget (${fmt(optimaal.jaarlijksBudgetEuro)}/jaar) heeft ${optimaal.aantalJaren} jaar nodig (totaal ${fmt(optimaal.totaalGeraamdEuro)}). ` +
        `Met +20% budget (${fmt(plus20.jaarlijksBudgetEuro)}/jaar) loopt het in ${plus20.aantalJaren} jaar. ` +
        `Met −20% budget (${fmt(min20.jaarlijksBudgetEuro)}/jaar) duurt het ${min20.aantalJaren} jaar. ` +
        `Het advies-scenario (${fmt(advies.jaarlijksBudgetEuro)}/jaar, ${advies.aantalJaren} jaar — ${fmt(advies.totaalGeraamdEuro)} totaal) is de kortst haalbare looptijd binnen 3-5 jaar die nog binnen +40% boven huidig budget valt.`;
    } else {
      vergelijking = `Niet alle scenario's konden gegenereerd worden — gefaald: ${falend.join(", ")}.`;
    }

    // Aggregeer dossier-validatie-tekorten per scenario voor de UI
    const dossierValidatie = {
      optimaal: validatieOptimaal,
      plus20: validatiePlus20,
      min20: validatieMin20,
      advies: validatieAdvies,
    };

    return NextResponse.json({
      success: true,
      data: {
        jaarlijksBudgetBasis: jaarlijksBudgetEuro,
        startJaar: effectiefStartJaar,
        cyclusMaanden,
        scenarios: { optimaal, plus20, min20, advies },
        vergelijking,
        partialFailures: falend.length > 0 ? falend : undefined,
        // Tekst-coherentie vlag: alle motivatie/samenvatting/prioriteitAdvies
        // velden komen uit de huidige prompt (regel 10: geen absolute jaartallen
        // of looptijd-claims). Dit signaleert aan de export dat de
        // "tekst-coherentie"-banner in §4.1 verborgen mag worden.
        tekstenSchoon: true,
        // Server-side gebruikersfeedback over budget-haalbaarheid
        budgetAdvies: budgetAdviesData,
        dossierValidatie,
        // Optimaal-scenario keuze + alle 3 opties (3/4/5 jaar) zodat UI ze
        // kan tonen in een 'waarom dit advies'-toelichting.
        adviesKeuze,
        optimaalOpties,
        // Per-inspanning dossier-componenten (eenmalig + structureel/jr) zodat
        // UI kan uitleggen waarom totalen per scenario verschillen.
        inspanningRamingen: ramingenPerInsp.map((r) => ({
          titel: r.titel,
          domein: r.domein,
          eenmaligLow: r.raming.eenmaligLow,
          eenmaligMid: r.raming.eenmaligMid,
          eenmaligHigh: r.raming.eenmaligHigh,
          structureelLowPerJr: r.raming.structureelLowPerJr,
          structureelMidPerJr: r.raming.structureelMidPerJr,
          structureelHighPerJr: r.raming.structureelHighPerJr,
          unparsed: r.raming.unparsed,
        })),
        // Totaal benodigd realistisch budget — voor transparantie in UI
        dossierTotalen: {
          totaalLowOverGekozenJaren: totaalBenodigdBudget(
            ramingenPerInsp.map((r) => r.raming),
            Math.max(0, minOptimaal.jaren - 1),
            "low"
          ),
          totaalMidOverGekozenJaren: totaalBenodigdBudget(
            ramingenPerInsp.map((r) => r.raming),
            Math.max(0, minOptimaal.jaren - 1),
            "mid"
          ),
          totaalHighOverGekozenJaren: totaalBenodigdBudget(
            ramingenPerInsp.map((r) => r.raming),
            Math.max(0, minOptimaal.jaren - 1),
            "high"
          ),
          minOptimaalJaren: minOptimaal.jaren,
          minOptimaalCapped: minOptimaal.capped,
        },
      },
    });
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Onbekende fout";
    return NextResponse.json({ success: false, error: msg }, { status: 500 });
  }
}
