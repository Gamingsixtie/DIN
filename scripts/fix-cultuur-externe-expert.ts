// Fix: cultuur-motivaties herschrijven om externe cultuur-expert te benoemen
// (onafhankelijke leiding van MT-rolmodel-traject — buiten interne uren-begroting).
// Idempotent via marker s7.cultuurExterneExpertFixed.
import { createClient } from "@supabase/supabase-js";
import { existsSync, readFileSync } from "fs";
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

const SESSION_ID = "d8b97442-ce8f-4134-b2c7-67dc8e3a3f93";

const CULTUUR_MOTIVATIE: Record<string, string> = {
  advies:
    "Yara (HR-manager) leidt het cultuurspoor als interne inspanningsleider en is HR-eigenaar van het leiderschapsprogramma 'Outside-in als gedeelde waarde'. Een onafhankelijke externe cultuur-expert wordt ingeschakeld om het programma inhoudelijk te leiden — die onafhankelijke blik is cruciaal omdat het MT zelf onderwerp van de cultuurverandering is en niet zijn eigen rolmodel-werk kan beoordelen (externe inhuur loopt buiten de interne uren-begroting). Het kernteam telt 9 personen: Directeur Bedrijfsvoering, Manager Data & Technologie, drie sectormanagers (PO, VO, Professionals), Manager Klantcontact, Teamleider Proces Support en één HR-medewerker (uitvoering HRM-cyclus en 360°-instrument). Zij zijn tegelijk coalitie én deelnemer aan hun eigen leiderschapsprogramma — er zijn geen losse interne trainings-deelnemers. Het kernteam besteedt 50% van zijn uren aan programmatische cultuur-deliverables (in totaal 800u programma-uren over 4 jaar) en 50% aan lijn-uren waarin outside-in wordt geïntegreerd in de dagelijkse MT-aansturing (344u lijn). 0u raadplegen-uren van interne collega's — er zijn geen interne geconsulteerden; de inhoudelijke onafhankelijke leiding zit bij de externe cultuur-expert (externe inhuur). Faseringskader: bewustwording → coalitievorming → acceptatie & rolmodelgedrag → adoptie → waardenverankering.",
  plus20:
    "Yara (HR-manager) leidt het cultuurspoor als interne inspanningsleider over een verlengde looptijd waarin de borgingsfase een extra jaar krijgt. Een onafhankelijke externe cultuur-expert leidt het programma inhoudelijk — die externe blik is cruciaal omdat het MT zelf onderwerp van de cultuurverandering is (externe inhuur, buiten de interne uren-begroting). Het kernteam telt 9 personen: Directeur Bedrijfsvoering, Manager Data & Technologie, drie sectormanagers (PO, VO, Professionals), Manager Klantcontact, Teamleider Proces Support en één HR-medewerker. Zij zijn tegelijk coalitie én deelnemer aan hun eigen leiderschapsprogramma. Het kernteam besteedt 50% van zijn uren aan programmatische cultuur-deliverables (877u programma-uren) en 50% aan lijn-uren waarin outside-in wordt geïntegreerd in de dagelijkse MT-aansturing (401u lijn). 0u raadplegen-uren van interne collega's — onafhankelijke leiding ligt bij de externe cultuur-expert. De extra borgings-tijd wordt benut voor doorlopende intervisie en jaarlijkse cultuurmeting nadat de externe begeleiding wordt afgebouwd.",
  optimaal:
    "Yara (HR-manager) leidt het cultuurspoor als interne inspanningsleider in het scenario met huidig budget en een ruimere looptijd voor stabiele verankering. Een onafhankelijke externe cultuur-expert leidt het programma inhoudelijk — die externe blik is cruciaal omdat het MT zelf onderwerp van de cultuurverandering is (externe inhuur, buiten de interne uren-begroting). Het kernteam telt 9 personen: Directeur Bedrijfsvoering, Manager Data & Technologie, drie sectormanagers (PO, VO, Professionals), Manager Klantcontact, Teamleider Proces Support en één HR-medewerker. Zij zijn tegelijk coalitie én deelnemer aan hun eigen leiderschapsprogramma. Het kernteam besteedt 50% van zijn uren aan programmatische cultuur-deliverables (957u programma-uren) en 50% aan lijn-uren waarin outside-in wordt geïntegreerd in de dagelijkse MT-aansturing (445u lijn). 0u raadplegen-uren van interne collega's — onafhankelijke leiding ligt bij de externe cultuur-expert. De ruimere looptijd geeft tijd voor borging in HR-cyclus, jaarlijkse cultuurmeting en formele overdracht naar de staande HRM-cyclus.",
  min20:
    "Yara (HR-manager) leidt het cultuurspoor als interne inspanningsleider over de langste looptijd, waarin de jaarlijkse intensiteit lager is, maar het programma langer doorloopt om verankering in de HR-cyclus en het MT-rolmodelgedrag duurzaam te maken. Een onafhankelijke externe cultuur-expert leidt het programma inhoudelijk — die externe blik is cruciaal omdat het MT zelf onderwerp van de cultuurverandering is (externe inhuur, buiten de interne uren-begroting). Het kernteam telt 9 personen: Directeur Bedrijfsvoering, Manager Data & Technologie, drie sectormanagers (PO, VO, Professionals), Manager Klantcontact, Teamleider Proces Support en één HR-medewerker. Zij zijn tegelijk coalitie én deelnemer aan hun eigen leiderschapsprogramma. Het kernteam besteedt 50% van zijn uren aan programmatische cultuur-deliverables (1.121u programma-uren) en 50% aan lijn-uren waarin outside-in wordt geïntegreerd in de dagelijkse MT-aansturing (611u lijn). 0u raadplegen-uren van interne collega's — onafhankelijke leiding ligt bij de externe cultuur-expert.",
};

async function main() {
  const s = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!);
  const { data, error: readErr } = await s.from("din_sessions").select("data").eq("id", SESSION_ID).maybeSingle();
  if (readErr || !data) { console.error("Read error:", readErr); process.exit(1); }
  const sess = data.data as Record<string, unknown>;
  const wiz = sess.crossAnalyseWizard as Record<string, unknown>;
  const stepResults = wiz.stepResults as Record<string, unknown>;
  const stap4 = stepResults.stap4 as Record<string, unknown>;
  const s7 = stap4.stap7InterneUren as Record<string, unknown>;

  if (s7.cultuurExterneExpertFixed) {
    console.log("⏭ Marker cultuurExterneExpertFixed al aanwezig:", s7.cultuurExterneExpertFixed);
    return;
  }

  const scenarios = s7.scenarios as Record<string, { domeinen?: Array<{ domein: string; motivatie?: string }> }>;
  let updates = 0;
  for (const [scKey, sc] of Object.entries(scenarios)) {
    const cultuur = sc.domeinen?.find((d) => d.domein === "cultuur");
    if (!cultuur) continue;
    const nieuw = CULTUUR_MOTIVATIE[scKey];
    if (!nieuw) continue;
    cultuur.motivatie = nieuw;
    updates++;
    console.log(`✓ ${scKey} cultuur: motivatie bijgewerkt (externe expert benoemd)`);
  }

  s7.cultuurExterneExpertFixed = { timestamp: new Date().toISOString(), updates };

  const newData = {
    ...sess,
    crossAnalyseWizard: {
      ...wiz,
      stepResults: { ...stepResults, stap4: { ...stap4, stap7InterneUren: s7 } },
    },
  };
  const { error } = await s.from("din_sessions").update({ data: newData }).eq("id", SESSION_ID);
  if (error) { console.error("Write error:", error.message); process.exit(1); }
  console.log(`\n✓ ${updates} cultuur-motivaties bijgewerkt met externe expert.`);
}

void main();
