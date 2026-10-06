// Normaliseer activiteit-tekst per fase per inspanning over alle scenarios.
// Eén canonical activiteit per fase per domein-inspanning. Reader ziet
// dezelfde fase-naam EN dezelfde activiteit-tekst over scenarios — de
// scenario-verschillen horen in motivatie/samenvatting, niet in fase-detail.
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

// Canonical activiteit per fase per inspanning-titel (substring-match).
// Fase-naam moet exact matchen met FASE_CHAINS uit normalize-fases.ts.
const ACTIVITEITEN: Record<string, Record<string, string>> = {
  // CRM klantdashboard
  CRM: {
    "Analyse & architectuur": "Architectuurbesluit, platformkeuze (Dynamics-equivalent), datakwaliteit-scan op 7-8 bronsystemen, juridisch-technische analyse Stichting Cito-ontvlechting en opstellen migratiestrategie met go/no-go op 'schoon schip'.",
    "Leverancier-selectie": "Selectie externe implementatiepartner via gefaseerde vaste-prijs-contractering; finalisering scope en aanbestedingsbeslissing; opstellen contracten met escrow voor datakwaliteit-risico.",
    "Realisatie & integraties": "Externe implementatiepartner bouwt datamodel en koppelingen; eerste bronsysteemintegraties (4 van 7-8) en migratie deels vervuilde data; sectorinrichting PO en VO start; dubbele licentielast tijdens transitie begint.",
    "Realisatie - kern": "Bouw cross-sectoraal datamodel en eerste 4 bronsysteemintegraties; sectorinrichting PO en VO start; configuratie kern-CRM functionaliteit voor 85 gebruikers.",
    "Realisatie - integraties": "Afronding 7-8 bronsysteemintegraties, migratie van resterende data en koppeling Zakelijk-systemen; afronding sectorinrichting Zakelijk parallel.",
    "Acceptatie & uitrol": "Bouw Zakelijk-module, dashboardconfiguratie per sectorcontext, dubbele licentielast tijdens transitie en CRM-specialistentraining (5 specialisten × 6,5 dagen) plus training 85 eindgebruikers met externe schaduwbegeleiding.",
    "Acceptatie & sectoruitrol": "Bouw Zakelijk-module, dashboardconfiguratie per sectorcontext, training 85 eindgebruikers met externe schaduwbegeleiding en gefaseerde voorbereiding op go-live.",
    "Acceptatie & pilot": "Pilot voor PO en VO sectoren met 20 key users; valideren datakwaliteit, dashboards en sector-workflows; eerste opleidingsblok CRM-specialisten.",
    "Go-live & adoptie": "Gefaseerde go-live PO/VO en circa drie weken later Zakelijk; externe schaduwbegeleiding voor 85 eindgebruikers; ambassador-aanpak; uitfasering oude omgeving; eerste structurele licentielast.",
    "Go-live & uitrol": "Sectoruitrol Zakelijk en go-live cross-sectoraal; volledige adoptie met externe begeleiding; uitfasering oude bronsystemen.",
    "In beheer": "Overdracht naar interne beheerorganisatie, structurele CRM-licenties voor 85 gebruikers (~€63K/jaar), doorontwikkeling op basis van eerste gebruikspatronen en datakwaliteitsmonitoring.",
    "In beheer & optimalisatie": "Volledige overgang naar structureel beheer: licenties 85 gebruikers, doorontwikkeling dashboards op basis van gebruikersfeedback, uitfaseren oude omgeving en datakwaliteitsmonitoring.",
    "Stabilisatie & in beheer": "Overdracht naar beheerorganisatie, structurele CRM-licenties (~€63K), doorontwikkeling op basis van eerste gebruikspatronen en open issues uit go-live.",
    "Optimalisatie": "Finetuning dashboard-KPI's, cross-sectorale managementrapportage als nieuw normaal verankerd; volledige structurele licentie- en beheerlast; doorontwikkeling op basis van strategische rapportagebehoeften.",
    "Doorontwikkeling": "Structurele licentielast 85 gebruikers, kleine functionele uitbreidingen en datakwaliteitsverbetering op basis van rapportagebehoeften vanuit de drie sectoren.",
    "Continu verbeteren": "Doorlopende doorontwikkeling op basis van funnelinzichten uit drie sectoren; structureel beheer en licenties; jaarlijkse evaluatie van platform-fit.",
  },
  // Uniforme klantinformatieprocessen
  Uniforme: {
    "Inventarisatie & herontwerp": "Externe procesbegeleider start as-is-mapping per sector via Smartprocess, formele besluitvorming over funneldefinities en KPI-systematiek, eerste to-be procesontwerp en benoeming proceseigenaar per sector.",
    "Inventarisatie (as-is)": "As-is-mapping per sector via Smartprocess, formele besluitvorming over funneldefinities en KPI-systematiek, benoeming proceseigenaar per sector.",
    "Herontwerp (to-be)": "Externe procesbegeleider werkt rolspecifieke processen uit (accountmanager PO, relatiemanager VO, adviseur Zakelijk) parallel aan CRM-datamodel; vastleggingsprotocollen per funnelfase.",
    "Herontwerp (to-be) & pilot": "Werkgroep ontwerpt rolspecifieke procesbeschrijvingen en vastleggingsprotocollen per funnelfase; eerste pilot-sessies in Smartprocess; afstemming met CRM-datamodel.",
    "Pilot & sectorinkleuring": "Sectorvarianten uitwerken (PO, VO, Zakelijk), rolspecifieke procesbeschrijvingen, pilotsessies met rolhouders en koppeling aan CRM-bouw.",
    "Pilot & validatie": "Pilot-sessies per sector (PO, VO, Zakelijk), validatie procesontwerp met rolhouders, bijsturing op basis van praktijktoetsing.",
    "Uitrol": "Adoptie-werksessies in alle drie sectoren (9 sessies, halve dag per sector), koppeling vastleggingsprotocollen aan live CRM-functionaliteit en onboarding-programma voor nieuwe medewerkers.",
    "Uitrol & standaardisatie": "Adoptiesessies in alle sectoren, onboardingsprogramma voor nieuwe medewerkers, benoeming en activering proceseigenaren per sector.",
    "Standaardisatie": "Proceseigenaren bewaken naleving en handhaven funneldefinities; eerste cross-sectorale rapportage op uniforme proceskaders; afstemming met CRM-data.",
    "Standaardisatie & adoptie": "Doorlopende adoptie via proceseigenaren, kwartaalreviews op funnelconsistentie, onboarding nieuwe medewerkers en bijsturing op basis van CRM-funneldata.",
    "Continu verbeteren": "Doorlopend proceseigenaarschap (4-8 uur/maand per sector), kwartaalreviews op funnelconsistentie, onboarding nieuwe medewerkers en verfijning funneldefinities op basis van CRM-data.",
    "Continue verbetering": "Verfijning funneldefinities op basis van CRM-data en eerste commerciële stuurinzichten; herijking KPI-systematiek per sector.",
    "Verankering": "Proceskader volledig verankerd in lijn; afsluitende evaluatie en overdracht governance naar reguliere kwaliteitscyclus.",
  },
  // Gespreksvaardigheidstraining
  Gespreksvaardigheidstraining: {
    "Behoeftestelling & curriculumontwerp": "Nulmeting per sector, curriculumontwerp met sectorspecifieke casuïstiek (PO, VO, Zakelijk inclusief commerciële incentives sales), selectie externe trainingspartner met multi-sector B2B/onderwijs-ervaring en kick-off met deelnemersgroepen.",
    "Curriculumvalidatie & pilot": "Pilot eerste trainingsblok met kleine groep per sector, valideren curriculum en bijsturing voor brede uitrol; afstemming met leiderschapsprogramma en CRM-tijdlijn.",
    "Basistraining": "Eerste trainingsblok van drie maanden voor 66 deelnemers; gedragsgerichte coaching op gespreksregie en eerste praktijkopdrachten met echte klantcases per sector.",
    "Basistraining (blok 1)": "Eerste trainingsblok van drie maanden voor accountmanagers PO, relatiemanagers VO en sales/adviseurs Zakelijk; sectorspecifieke casusoefeningen en eerste evaluatie.",
    "Basistraining - blok 1": "Eerste trainingsblok van drie maanden voor 66 deelnemers; gedragsgerichte coaching op gespreksregie en eerste praktijkopdrachten met echte klantcases per sector.",
    "Basistraining - blok 2": "Tweede trainingsblok inclusief verdiepende gedragscoaching op gespreksregie; commerciële module voor sales (NPS, conversie, omzetgroei als incentive); tussenevaluatie en bijstelling per sector.",
    "Vaardigheidstraining": "Tweede trainingsblok inclusief verdiepende gedragscoaching op gespreksregie en commerciële module voor sales (NPS, conversie, omzetgroei als incentive); tussenevaluatie en bijstelling per sector.",
    "Vaardigheidstraining (blok 2)": "Verdiepende gedragscoaching op gespreksregie; commerciële module voor sales (NPS, conversie, omzetgroei als incentive); tussenevaluatie en bijstelling per sector.",
    "Vaardigheidstraining & toepassing": "Tweede trainingsblok gekoppeld aan de CRM-uitrol — deelnemers oefenen outside-in gesprekken op basis van het nieuwe dashboard; tussenevaluatie en bijsturing curriculum.",
    "Toepassing in praktijk": "On-the-job coaching gekoppeld aan eerste werkbare CRM-dashboards; intervisie tussen sectoren en eindevaluatie van het basisprogramma.",
    "Borging & nazorg": "Slotevaluatie, e-learning-borging voor nieuwe medewerkers en intervisie ter verankering van gespreksstandaarden; lichte nazorg via interne ambassadeurs.",
    "Borging (e-learning/nazorg)": "Onboarding-module nieuwe medewerkers en lichte nazorg via interne ambassadeurs; e-learning-borging voor gespreksstandaarden.",
    "Borging (e-learning)": "E-learning-module voor nieuwe medewerkers; onboarding-traject met gespreksstandaarden; lichte coördinatie via interne ambassadeurs.",
    "Borging in lijn": "Verankering gespreksstandaarden in lijn-management en HR-instrumentarium; doorlopend onboarding voor nieuwe medewerkers via e-learning.",
    "Borging": "Verankering gespreksstandaarden in lijn-management en HR-instrumentarium; doorlopend onboarding voor nieuwe medewerkers.",
    "Verankering": "Gespreksstandaarden volledig verankerd in functioneringscyclus en HR-instrumenten; afsluitende evaluatie en overdracht naar reguliere ontwikkel-cyclus.",
    "Continue ontwikkeling": "Doorlopende coaching, jaarlijkse refresher-sessies en verankering in HR-cyclus; afsluitende evaluatie van gedragsverandering.",
  },
  // Leiderschapsprogramma
  Leiderschapsprogramma: {
    "Bewustwording & coalitievorming": "Programma-ontwerp met externe begeleider, MT-besluit op beschermde sessietijd, eerste leiderschapsworkshops, gedragscontracten outside-in en MT-commitment-sessie.",
    "Urgentiebesef": "Programma-ontwerp en MT-commitment-sessie; eerste externe begeleidingsdagen; formele verankering van outside-in als beoordelingscriterium voor leidinggevenden.",
    "Coalitievorming": "Eerste leiderschapsworkshops, vorming kerngroep ambassadeurs over alle sectoren en gedragscontracten outside-in.",
    "Acceptatie & rolmodelgedrag": "Cross-sectorale leerkringen, gezamenlijke klantbezoeken PO/VO/Zakelijk, integratie outside-in als criterium in beoordelings- en functioneringscyclus en aanpassing 360°-feedbackinstrument in HRM-cyclus.",
    "Adoptie": "Intervisiesessies, 360°-feedback op leiderschapsgedrag, ritualisering van outside-in gedrag in MT-overleggen en eerste meting gedragsindicatoren bij leidinggevenden.",
    "Waardenverankering": "Slotmeting cultuurindicatoren, borging in HR-cyclus en doorlopend rolmodelgedrag MT zonder externe begeleiding; afnemende externe begeleiding.",
    "Borging in HR-cyclus": "Borging in functioneringscyclus en HR-instrumentarium; jaarlijkse cultuurmeting; afnemende externe begeleiding.",
    "Continue rolmodel-werking": "Doorlopende intervisie, lichte HR-coördinatie en jaarlijkse cultuurmeting; doorlopend rolmodelgedrag MT zonder externe begeleiding.",
    "Verankering": "Cultuurverandering volledig verankerd in HR-cyclus en MT-rituelen; eindevaluatie 12-18 maanden na slotmeting.",
    "Continue ontwikkeling": "Doorlopende cultuurontwikkeling met jaarlijkse refresh-sessies; verankering in onboarding nieuwe leidinggevenden.",
    "Verankering in lijn": "Cultuurkader volledig in lijn-management; doorlopend rolmodelgedrag verankerd in dagelijkse routines en formele HR-instrumenten.",
  },
};

type Cell = { jaar: number; euro: number; fase?: string; activiteit?: string };
type Insp = { inspanningTitel: string; verdelingPerJaar?: Cell[] };
type Scen = { inspanningen?: Insp[] };

function findActiviteitLib(titel: string): Record<string, string> | null {
  for (const key of Object.keys(ACTIVITEITEN)) {
    if (titel.includes(key)) return ACTIVITEITEN[key];
  }
  return null;
}

async function main() {
  const s = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
  );
  const sessionId = "d8b97442-ce8f-4134-b2c7-67dc8e3a3f93";
  const { data } = await s.from("din_sessions").select("data").eq("id", sessionId).maybeSingle();
  if (!data) {
    console.error("Sessie niet gevonden");
    process.exit(1);
  }
  const sess = data.data as Record<string, unknown>;
  const wiz = sess.crossAnalyseWizard as Record<string, unknown>;
  const stap4 = (wiz.stepResults as Record<string, unknown>).stap4 as Record<string, unknown>;
  const adv = stap4.begrotingAdvies as { scenarios?: Record<string, Scen | null> };
  if (!adv.scenarios) {
    console.error("Geen scenarios");
    process.exit(1);
  }

  let updated = 0;
  let missingFases = new Set<string>();
  for (const sc of Object.values(adv.scenarios)) {
    if (!sc) continue;
    for (const ins of sc.inspanningen ?? []) {
      const lib = findActiviteitLib(ins.inspanningTitel);
      if (!lib) {
        console.warn(`Geen activiteit-library voor "${ins.inspanningTitel}"`);
        continue;
      }
      for (const cell of ins.verdelingPerJaar ?? []) {
        const fase = cell.fase ?? "";
        const canonical = lib[fase];
        if (!canonical) {
          missingFases.add(`${ins.inspanningTitel.slice(0, 30)} :: ${fase}`);
          continue;
        }
        if (cell.activiteit !== canonical) {
          cell.activiteit = canonical;
          updated++;
        }
      }
    }
  }

  if (missingFases.size > 0) {
    console.log("WAARSCHUWING — geen canonical activiteit gevonden voor fases:");
    for (const f of missingFases) console.log("  ", f);
    console.log();
  }

  const newData = {
    ...sess,
    crossAnalyseWizard: {
      ...(sess.crossAnalyseWizard as object),
      stepResults: {
        ...(wiz.stepResults ?? {}),
        stap4: { ...stap4, begrotingAdvies: adv },
      },
    },
  };
  const { error } = await s.from("din_sessions").update({ data: newData }).eq("id", sessionId);
  if (error) {
    console.error("FOUT:", error.message);
    process.exit(1);
  }
  console.log(`✓ ${updated} activiteit-teksten genormaliseerd over alle scenarios.`);
}

void main();
