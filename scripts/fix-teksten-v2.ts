// Herschrijf vergelijking + per-scenario samenvatting + prioriteitAdvies zodat
// teksten exact resoneren met nieuwe bedragen (€1.273/€1.450/€1.750/€2.050K),
// J1=€250K hard, 80 deelnemers, 5 inspanningen incl. Post onvoorzien, en
// correcte rang-volgorde (CRM > Mens > Cult > Proc > Post onvoorzien).
import { createClient } from "@supabase/supabase-js";
import { readFileSync, existsSync } from "fs";
import { join } from "path";

function loadEnvFile(p: string) {
  if (!existsSync(p)) return;
  const c = readFileSync(p, "utf-8");
  for (const l of c.split(/\r?\n/)) {
    const t = l.trim();
    if (!t || t.startsWith("#")) continue;
    const e = t.indexOf("=");
    if (e === -1) continue;
    process.env[t.substring(0, e).trim()] = t.substring(e + 1).trim().replace(/^["']|["']$/g, "");
  }
}
loadEnvFile(join(process.cwd(), ".env.local"));

type Scen = {
  scenarioLabel?: string;
  samenvatting?: string;
  prioriteitAdvies?: string;
  totaalGeraamdEuro?: number;
  aantalJaren?: number;
  jaarlijksBudgetEuro?: number;
};
type ScenKey = "advies" | "plus20" | "optimaal" | "min20";

const VERGELIJKING = `De vier scenario's voeren dezelfde transformatie uit — CRM-fundament, cultuurborging, gespreksvaardigheidstraining, procesinrichting plus een programma-brede post onvoorzien — maar verschillen in tempo. Het 2026-budget is in alle vier scenario's hard vastgesteld op € 250.000 (Cito-eis: niet onderbesteden, anders vrijval); daarna varieert het jaarlijks plafond per scenario.

• Snelste (4 jaar, € 341.000/jaar in 2027-2029): totaal € 1.273.000. Compactste looptijd, meeste momentum, vraagt veerkracht in piek-jaren.
• +20% budget (5 jaar, € 300.000/jaar in 2027-2030): totaal € 1.450.000. Meer ruimte voor parallel testen en gefaseerde uitrol.
• Huidig budget (7 jaar, € 250.000/jaar in 2027-2032): totaal € 1.750.000. Standaard-tempo, lagere piek per jaar, langere borgingstail.
• −20% budget (10 jaar, € 200.000/jaar in 2027-2035): totaal € 2.050.000. Hoogste cumulatief omdat structureel beheer 9 jaar loopt; door cap-druk weinig veerkracht voor risico-realisatie.

Onder de vier inhoudelijke inspanningen staat per scenario een vijfde regel: Post onvoorzien (programma-breed). Dit is de risico-buffer voor implementatie-onzekerheid (scope-uitloop, marktrisico tarieven externe partners, herbewerking, integratie-issues). Hoogte is circa 10 % van basisraming waar cap-headroom dat toelaat (Snelste € 57K, +20% € 99K, Huidig € 140K), voor −20% € 67K (cap-druk dwingt buffer naar minder dan 4 %). De buffer piekt in realisatie/integratie/acceptatie-jaren en is € 0 in 2026 (Cito-budget hard). Vrijval bij uitblijven van risico's komt terug in het programma-budget.`;

const PRIORITEIT_BASE = `De budget-rangorde volgt de outside-in logica en is in alle vier scenario's identiek (alleen tempo verschilt):

Rang 1 — Data & Systemen (CRM): grootste eenmalige post (€ 440.000 – € 640.000, middenpunt circa € 565.000) plus structureel circa € 92.500 per jaar voor 85 gebruikers, beheer en doorontwikkeling. Het CRM is het technische fundament — zonder werkend cross-sectoraal klantdashboard blijft outside-in op schaal onuitvoerbaar.

Rang 2 — Mens (gespreksvaardigheidstraining): 80 deelnemers (uit Stap 7 selectiePerDomein, verspreid over PO, VO, Zakelijk en Professionals; niet 66 zoals oude dossier-aanname). Vast eenmalig € 75.000 (LMS € 30.000, content-ontwikkeling € 25.000, train-de-trainer € 10.000, nulmeting € 10.000) plus variabel kerntraject € 80.000 (externe trainingspartner twee blokken à circa € 31.500 voor 80 personen + sessieondersteuning). Voor langere scenario's komt jaarlijks circa € 15.000 refresh-sessie en € 5.000 onboarding nieuwe medewerkers vanaf jaar 4 erbij.

Rang 3 — Cultuur (leiderschapsprogramma): doelgroep 9 leidinggevenden plus 2 HR-coördinerend (kringgesprek-pattern). Eenmalig externe begeleider 15 dagen × € 2.500 = € 37.500, executive-tarief reservering € 20.000, individuele coaching 9 × € 4.000 = € 36.000, HR-instrumentarium-aanpassing € 15.000; structureel 360°-feedback tool € 5.000 per jaar, jaarlijkse cultuurmeting vanaf jaar 3 en onboarding nieuwe leiders vanaf jaar 5. In euro klein, in inhoudelijk belang nadrukkelijk de tweede hefboom: zonder zichtbaar voorgeleefd outside-in gedrag wordt het CRM niet gebruikt zoals bedoeld.

Rang 4 — Processen (uniforme klantinformatieprocessen + funnelgovernance): 5 interne uitvoerders dekken alle 3 sectoren (Projectmanager D, Procesmanager Data en Procesondersteuner per sector, inclusief Procesondersteuner Professionals — bewijs van volledige interne dekking). Eenmalig € 78.000 (procesbegeleiding € 62.000 + governance-instrumentarium € 10.000 + sectorvariatie-buffer € 6.000) plus structureel circa € 12.000 per jaar via bestaande Smartprocess-tooling (geen separate licentiekost).

Rang 5 — Post onvoorzien (programma-breed): 10 % van basisraming waar cap dat toelaat. Geen domein-specifieke post; dekt risico-realisatie over de hele scope. Vrijval bij uitblijven van risico's komt terug in het programma-budget. Niet opgenomen in jaar 1 (Cito 2026-budget hard vastgesteld).

Eurogrootte ≠ inhoudelijk belang. Cultuur is qua euro rang 3 maar inhoudelijk de tweede hefboom — zonder voorgeleefd outside-in gedrag wordt het CRM niet gebruikt zoals bedoeld en blijft de transformatie hol. De vier inhoudelijke domeinen starten parallel in 2026 met inventarisatie, architectuurkeuze, curriculumontwerp en MT-coalitievorming; de rangorde gaat over budget-aandeel, niet over startmoment. Post onvoorzien is in 2026 € 0 (Cito-budget hard vastgesteld) en bouwt op vanaf 2027 in de risico-piek-jaren rond CRM-realisatie, integratie en acceptatie.`;

const SAMENVATTING: Record<ScenKey, string> = {
  advies: `Compactste scenario van vier jaar waarin alle vier domeinen parallel starten in 2026 (€ 250.000 jaarbudget conform Cito-eis) met inventarisatie, architectuurkeuze, curriculumontwerp en MT-bewustwording. In 2027-2028 ligt het zwaartepunt met CRM-realisatie, eerste trainingsblok en intensieve leiderschapssessies — daar piekt ook de programma-brede post onvoorzien (realisatie/integratie/acceptatie-risico). 2029 is acceptatie, tweede trainingsblok plus borging in HR-instrumenten. Kortere looptijd is niet realistisch omdat cultuurverandering meerdere praktijkcycli vraagt en CRM na technische oplevering datakwaliteit- en gewenningstijd nodig heeft; uitsmeren naar langer zou momentum en urgentie uit het programma halen.`,

  plus20: `Vijfjarig scenario met € 300.000 jaarplafond vanaf 2027 (2026 hard € 250.000, Cito-eis). De extra ruimte tegenover Snelste komt uit een meer gefaseerde uitrol: bouw en migratie van het CRM verspreiden zich over twee jaar, het tweede trainingsblok valt later, en de programma-brede post onvoorzien kan dichter bij volle 10 % van de basisraming uitkomen. In 2030 verschuift het profiel naar structureel beheer, intervisie, jaarlijkse cultuurmeting en governance-borging. Kritisch voor binnen budget blijven zijn de aannames rond externe implementatiepartner, het architectuurbesluit op de Stichting Cito-afhankelijkheid en het tariefniveau van leiderschapscoaches.`,

  optimaal: `Standaard-tempo over zeven jaar binnen het bestaande jaarbudget van € 250.000 (ook 2026 hard, Cito-eis). Het zwaartepunt van CRM-realisatie en datamigratie ligt rond het midden van de looptijd in jaar 3-4; processen zijn vroeg in de eerste helft zwaarder om funneldefinities op tijd technisch te vertalen; mens-vaardigheidstraining heeft zijn zwaartepunt rond jaar 3-5 met de twee trainingsblokken; cultuur piekt in de eerste helft en zakt af tot lichte borging tegen het einde. Programma-brede post onvoorzien volgt de implementatie-risicocurve met piek in jaar 3-5. Kritisch voor binnen budget blijven zijn architectuurbesluit Stichting Cito, externe tarieven CRM-partner en leiderschapscoach, plus de datakwaliteit-go/no-go op de bronsystemen.`,

  min20: `Tienjarig uitgesmeerd scenario met € 200.000 jaarplafond vanaf 2027 (2026 hard € 250.000 conform Cito-eis). De krappe jaarcap dwingt het zwaartepunt eenmalige investeringen rond de bouw- en migratiejaren in het midden van de looptijd, gevolgd door negen jaar structurele licentie- en borgingslast. Programma-brede post onvoorzien is hier het kleinste in proportie (€ 67.000 ≈ 3 % van basisraming) omdat cap-headroom geen ruimere buffer toelaat — een signaal dat dit scenario weinig veerkracht heeft bij scope-uitloop of marktrisico op tarieven. Stichting Cito-afhankelijkheid en datakwaliteit-scan in de eerste twee jaren bepalen of de buffer kan worden afgebouwd of juist aangesproken.`,
};

async function main() {
  const s = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
  );
  const sessionId = "d8b97442-ce8f-4134-b2c7-67dc8e3a3f93";
  const { data } = await s.from("din_sessions").select("data").eq("id", sessionId).maybeSingle();
  if (!data) {
    console.error("not found");
    process.exit(1);
  }
  const sess = data.data as Record<string, unknown>;
  const wiz = sess.crossAnalyseWizard as Record<string, unknown>;
  const stap4 = (wiz.stepResults as Record<string, unknown>).stap4 as Record<string, unknown>;
  const adv = stap4.begrotingAdvies as {
    vergelijking?: string;
    scenarios?: Record<string, Scen | null>;
  };

  // 1. Vergelijking
  adv.vergelijking = VERGELIJKING;

  // 2. Per scenario
  for (const sk of ["advies", "plus20", "optimaal", "min20"] as ScenKey[]) {
    const sc = adv.scenarios?.[sk];
    if (!sc) continue;
    sc.samenvatting = SAMENVATTING[sk];
    sc.prioriteitAdvies = PRIORITEIT_BASE;
  }

  const newData = {
    ...sess,
    crossAnalyseWizard: {
      ...(sess.crossAnalyseWizard as object),
      stepResults: { ...(wiz.stepResults ?? {}), stap4: { ...stap4, begrotingAdvies: adv } },
    },
  };
  const { error } = await s.from("din_sessions").update({ data: newData }).eq("id", sessionId);
  if (error) {
    console.error("FOUT:", error.message);
    process.exit(1);
  }
  console.log("✓ Vergelijking + 4× samenvatting + 4× prioriteitAdvies bijgewerkt.");
}

void main();
