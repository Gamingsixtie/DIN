// Apply Stap 7 tekst-update mei 2026:
// 1. Cultuur: motivatie + per-jaar activiteit per scenario
// 2. Mens: motivatie + per-jaar activiteit per scenario (HR-mgr coordinator, alle sectormgrs, 12 trainers als cursist)
// 3. Data: functie-mutatie (-PO_a, -content_spec, hernoem+verschuif PO_b naar kernteam) + motivatie + activiteit
// 4. Processen: +4 geconsulteerden (commercieel mgr + 3 sectormgrs) + motivatie + activiteit
// Hercalc alle aggregaten. Idempotent via marker s7.tekstUpdateMeiApplied.
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

type Rol = {
  functieId?: string;
  functieNaam?: string;
  uren?: number;
  urenTotaal?: number;
  programmaPct?: number;
  lijnPct?: number;
  raadplegenPct?: number;
  categorie?: string;
  afdeling?: string;
  onderbouwing?: string;
  kosten?: number;
  uurtarief?: number;
  [k: string]: unknown;
};

type Jaar = {
  jaar: number;
  rollen?: Rol[];
  totaalUren?: number;
  programmaUren?: number;
  lijnUren?: number;
  raadplegenUren?: number;
  activiteit?: string;
  [k: string]: unknown;
};

type Domein = {
  domein: string;
  jaren?: Jaar[];
  totaalUren?: number;
  programmaUren?: number;
  lijnUren?: number;
  raadplegenUren?: number;
  motivatie?: string;
  programmaPct?: number;
  uren?: number;
  [k: string]: unknown;
};

type Scenario = {
  domeinen?: Domein[];
  jaren?: Array<{ jaar: number }>;
  startJaar?: number;
  uurtariefGebruikt?: number;
  totaalUren?: number;
  programmaUren?: number;
  lijnUren?: number;
  raadplegenUren?: number;
  totalenPerJaar?: Array<{ jaar: number; uren?: number; kosten?: number; programmaUren?: number; lijnUren?: number; raadplegenUren?: number }>;
  samenvatting?: string;
  samenvattingHandmatigBewerkt?: boolean;
  [k: string]: unknown;
};

// =====================================================================
// CULTUUR — tekst-update only
// =====================================================================

const CULTUUR_MOTIVATIE: Record<string, string> = {
  advies:
    "Yara (HR-manager) leidt het cultuurspoor als inspanningsleider; zij is HR-eigenaar van het leiderschapsprogramma 'Outside-in als gedeelde waarde'. Het kernteam telt 9 personen: Directeur Bedrijfsvoering, Manager Data & Technologie, drie sectormanagers (PO, VO, Professionals), Manager Klantcontact, Teamleider Proces Support en één HR-medewerker (uitvoering HRM-cyclus en 360°-instrument). Zij zijn tegelijk coalitie én deelnemer aan hun eigen leiderschapsprogramma — er zijn geen losse trainings-deelnemers. Het kernteam besteedt 50% van zijn uren aan programmatische cultuur-deliverables (in totaal 800u programma-uren over 4 jaar) en 50% aan lijn-uren waarin outside-in wordt geïntegreerd in de dagelijkse MT-aansturing (344u lijn). Er zijn 0u raadplegen-uren — cultuurverandering is intern MT-werk binnen de eigen organisatie en vraagt geen externe consultatie. Faseringskader: bewustwording → coalitievorming → acceptatie & rolmodelgedrag → adoptie → waardenverankering.",
  plus20:
    "Yara (HR-manager) leidt het cultuurspoor als inspanningsleider over een verlengde looptijd waarin de borgingsfase een extra jaar krijgt. Het kernteam telt 9 personen: Directeur Bedrijfsvoering, Manager Data & Technologie, drie sectormanagers (PO, VO, Professionals), Manager Klantcontact, Teamleider Proces Support en één HR-medewerker. Zij zijn tegelijk coalitie én deelnemer aan hun eigen leiderschapsprogramma. Het kernteam besteedt 50% van zijn uren aan programmatische cultuur-deliverables (877u programma-uren) en 50% aan lijn-uren waarin outside-in wordt geïntegreerd in de dagelijkse MT-aansturing (401u lijn). Er zijn 0u raadplegen-uren — cultuurverandering is intern MT-werk en vraagt geen externe consultatie. De extra borgings-tijd wordt benut voor doorlopende intervisie en jaarlijkse cultuurmeting nadat de externe begeleiding is afgebouwd.",
  optimaal:
    "Yara (HR-manager) leidt het cultuurspoor als inspanningsleider in het scenario met huidig budget en een ruimere looptijd voor stabiele verankering. Het kernteam telt 9 personen: Directeur Bedrijfsvoering, Manager Data & Technologie, drie sectormanagers (PO, VO, Professionals), Manager Klantcontact, Teamleider Proces Support en één HR-medewerker. Zij zijn tegelijk coalitie én deelnemer aan hun eigen leiderschapsprogramma. Het kernteam besteedt 50% van zijn uren aan programmatische cultuur-deliverables (957u programma-uren) en 50% aan lijn-uren waarin outside-in wordt geïntegreerd in de dagelijkse MT-aansturing (445u lijn). Er zijn 0u raadplegen-uren — cultuurverandering is intern MT-werk en vraagt geen externe consultatie. De ruimere looptijd geeft tijd voor borging in HR-cyclus, jaarlijkse cultuurmeting en formele overdracht naar de staande HRM-cyclus.",
  min20:
    "Yara (HR-manager) leidt het cultuurspoor als inspanningsleider over de langste looptijd, waarin de jaarlijkse intensiteit lager is, maar het programma langer doorloopt om verankering in de HR-cyclus en het MT-rolmodelgedrag duurzaam te maken. Het kernteam telt 9 personen: Directeur Bedrijfsvoering, Manager Data & Technologie, drie sectormanagers (PO, VO, Professionals), Manager Klantcontact, Teamleider Proces Support en één HR-medewerker. Zij zijn tegelijk coalitie én deelnemer aan hun eigen leiderschapsprogramma. Het kernteam besteedt 50% van zijn uren aan programmatische cultuur-deliverables (1.121u programma-uren) en 50% aan lijn-uren waarin outside-in wordt geïntegreerd in de dagelijkse MT-aansturing (611u lijn). Er zijn 0u raadplegen-uren — cultuurverandering is intern MT-werk en vraagt geen externe consultatie.",
};

// =====================================================================
// MENS — tekst-update only
// =====================================================================

const MENS_MOTIVATIE: Record<string, string> = {
  advies:
    "HR-manager (Yara) coördineert als inspanningsleider mens-domein het hele spoor — programmaorganisatie, niet operationele facilitering. Kernteam (5 personen) bestaat uit alle 3 sectormanagers (PO, VO, Zakelijk/Professionals), Manager Klantcontact en de HR-medewerker curriculum + integratie. Zij zetten lijnen uit en borgen de sector-doorvertaling — geen trainings-facilitering. Externe partij verzorgt de trainingen — ~46u contacttijd per cursist, opgesplitst in blok 1 (24u) en blok 2 (22u). De 65 trainings-deelnemers omvatten 28 Klantenservice medewerkers C, 12 Trainer/Adviseur A die zelf cursist zijn (zij geven Cito-product-trainingen klantgericht en moeten outside-in zelf beheersen — géén facilitatoren), 7 Accountmanagers C, 7 Medewerkers binnendienst B, 5 Accountmanagers C Professionals en 6 ad-hoc-instromers. Programma vs. lijn is expliciet verdeeld: kernteam programma 80% / lijn 20%; trainings-deelnemers programma 50% / lijn 50% (cursistijd tijdens werktijd telt deels als lijn — vandaar 1.632 lijn-uren in dit advies-totaal); inspanningsleider 90% / 10%. Raadplegen-uren (54u over 4 scenario-jaren) komen van 9 geconsulteerden — productmanagers (DST + KLT), 3 marketeers en de Teamleider Trainingen — die casuïstiek-input leveren en de externe trainingspartij coördineren op piek-momenten in 2027–2028.",
  plus20:
    "HR-manager (Yara) coördineert als inspanningsleider mens-domein. Plus20 strekt het advies-pakket met één extra borgingsjaar (2030) zodat de transfer naar de lijn beter beklijft. Kernteam (5 personen): alle 3 sectormanagers (PO, VO, Zakelijk/Professionals), Manager Klantcontact en HR-medewerker curriculum + integratie — zelfde rolverdeling als advies, geen trainings-facilitering. Externe partij verzorgt beide trainingsblokken voor 65 trainings-deelnemers waaronder de 12 Trainer/Adviseur A als zelf-cursist (geen interne trainers). Lijn-uren expliciet: 1.680u in dit scenario (kernteam 80/20, trainings-deelnemers 50/50, leider 90/10) — iets boven advies door extra borgings-cyclus. Raadplegen-uren expliciet: 54u door 9 geconsulteerden (productmanagers, marketeers, Teamleider Trainingen) — input-piek in 2027 en 2028 rondom curriculum-aanscherping. Pieken in 2027 en 2028; 2029 actieve borging met aanvullende casuïstiek-sessies; 2030 borging-licht in HRM-cyclus.",
  optimaal:
    "HR-manager (Yara) coördineert als inspanningsleider mens-domein over een langer pad: een aparte basis-fase in 2027 (curriculum en planning rustig laten landen) en pas trainingsblokken in 2028 en 2029. Kernteam (5 personen): alle 3 sectormanagers (PO, VO, Zakelijk/Professionals), Manager Klantcontact en HR-medewerker curriculum + integratie — zij verankeren leerdoelen vóór de eerste blok-start. Externe partij verzorgt de trainingen — 65 trainings-deelnemers, met 12 Trainer/Adviseur A als zelf-cursist (de externe trainer geeft de training; deze 12 zijn geen interne facilitatoren). Lijn-uren expliciet: 1.735u verdeeld over 7 jaar — iets hoger dan advies door langere borgings-staart (2030 actieve borging + 2031–2032 borging-licht). Raadplegen-uren expliciet: 54u door 9 geconsulteerden — input geconcentreerd in basisjaar 2027 en blok-1-jaar 2028. Pieken in 2028 en 2029; daarna structurele borging-cyclus.",
  min20:
    "HR-manager (Yara) coördineert als inspanningsleider mens-domein over 10 jaar — de blokken worden uitgesmeerd (blok 1 in 2028, blok 2 in 2030) zodat de jaarlijkse capaciteitsdruk lager blijft, met meerjarige borging tot 2035. Kernteam (5 personen): alle 3 sectormanagers (PO, VO, Zakelijk/Professionals), Manager Klantcontact en HR-medewerker curriculum + integratie — geen trainings-facilitering vanuit Cito. Externe partij verzorgt beide blokken voor 65 trainings-deelnemers, inclusief de 12 Trainer/Adviseur A als zelf-cursist (geen interne trainers — de externe partij voert blok 1 én blok 2 uit). Lijn-uren expliciet: 1.809u — het hoogste lijn-aandeel van alle scenario's omdat trainings-deelnemers (programma 50% / lijn 50%) over meer jaren participeren plus een lange borgings-staart 2031–2035. Raadplegen-uren expliciet: 54u door 9 geconsulteerden — input verdeeld tussen 2027 (basis) en 2028 (blok 1). Pieken in 2028 en 2030; 2029 tussen-borging; 2031 actieve borging; 2032–2035 borging-licht in HRM-cyclus.",
};

// =====================================================================
// DATA — motivatie (NA mutatie)
// =====================================================================

const DATA_MOTIVATIE: Record<string, string> = {
  advies:
    "Sven (SIO) leidt het data & systemen-spoor als inspanningsleider; Manager Klantcontact / Commercieel manager coördineert de dagelijkse uitvoering binnen het commerciële proces (niet de Teamleider Trainingen, die uitsluitend de planning van de cascade-key-user-onboarding faciliteert). Kernteam (6 personen): Projectmanager D (cross-sectorale projectaansturing), Procesmanager / Data-analist Klant & Markt (data-architectuur, datakwaliteit, bronkoppelingen), drie Medewerkers binnendienst — één per sector PO, VO en Professionals — als outside-in frontline-vertegenwoordigers, én de Product Owner van de systemen als producteigenaar van het CRM-platform (ontwerpkeuzes, releaseprioriteiten, datamodel-governance richting leverancier en interne stuurgroep). Trainings-deelnemers (25 personen) zijn de cross-sectorale CRM-key-users: 12 Trainer/Adviseur A (cascade-key-users), 7 productmanagers (DST x2, KiB, KLT, LiB, NT2 overheid, CvVO), 3 sectormanagers (PO/VO/Prof) en 3 Accountmanager-C-Prof (sales-eindgebruiker key-user-training). Geconsulteerden (10 personen, 60u raadplegen-only): Manager Data & Technologie (governance via stuurgroep), Business informatieanalist C (datakwaliteit-scan), Manager Klantcontact (review klantenservice-flow), 3 marketeers, Teamleider Trainingen (planning cascade-onboarding) en 3 Acc-C-Prof (review-zijde). Externe inhuur: piek-jaren 2027–2028 implementatie/integraties (vaste-prijs partner met escrow op datakwaliteit) én niet-piek-jaren 2026 (analyse + leveranciersselectie) en 2029 (borgingsadvies + go-live-support). Programma- vs lijn-uren: kernteam 80/20, leider 90/10, trainings 70/30, geconsulteerden 0/0/100. Raadplegen-uren expliciet: 60u door 10 geconsulteerden.",
  plus20:
    "Sven (SIO) leidt als inspanningsleider; Manager Klantcontact / Commercieel manager coördineert de dagelijkse uitvoering. Plus20 strekt het advies-pakket over 5 jaar (2026–2030) met zwaartepunt 2027 (bouw) en 2028 (acceptatie); 2029 go-live; 2030 borging. Kernteam (6 personen) inclusief Product Owner van de systemen als producteigenaar van het CRM-platform. Trainings-deelnemers (25 personen) zonder Content Specialist; geconsulteerden (10 personen) zonder Productowner A website / Productowner B producten als geconsulteerden (PO_b is hernoemd en in kernteam, PO_a is verwijderd). Externe inhuur: 2027–2028 implementatie-piek én 2026 + 2029–2030 niet-piek-jaren (analyse-ondersteuning, go-live-coaching, borgingsadvies). Lijn-uren expliciet: ~371u; raadplegen-uren expliciet: 60u (NA mutatie).",
  optimaal:
    "Sven (SIO) leidt als inspanningsleider; Manager Klantcontact / Commercieel manager coördineert dagelijkse uitvoering. Optimaal strekt over 7 jaar (2026–2032) — gefaseerde uitrol met zwaartepunt 2028 (acceptatie + key-user) en 2029 (go-live cross-sectoraal); 2030–2032 zijn beheer-, optimalisatie- en doorontwikkelingsjaren. Kernteam (6 personen) inclusief Product Owner van de systemen — in dit scenario benadrukt aan release-roadmap en sectorvariant-governance. Trainings-deelnemers (25 personen) zonder Content Specialist; geconsulteerden (10 personen) zonder PO_a en PO_b. Externe inhuur: 2028–2029 implementatie- en uitrol-piek; 2026–2027 analyse-/bouw-fase met externe data-architecten; 2030–2032 borgings-advies + doorontwikkelings-capaciteit. Lijn-uren expliciet: ~426u; raadplegen-uren expliciet: 60u (NA mutatie).",
  min20:
    "Sven (SIO) leidt als inspanningsleider; Manager Klantcontact / Commercieel manager coördineert dagelijkse uitvoering. Min20 strekt over 10 jaar (2026–2035) met zwaartepunt 2027 (bouw) + 2028 (key-user-training) + 2030 (acceptatie & pilot) + 2031 (go-live). Kernteam (6 personen) inclusief Product Owner van de systemen. Trainings-deelnemers (25 personen) zonder Content Specialist; geconsulteerden (10 personen) zonder PO_a en PO_b. Externe inhuur: piek-jaren 2028 + 2030 (implementatie-partner); niet-piek-jaren 2026–2027 (analyse + leveranciersselectie), 2029 (integraties), 2031–2035 (beheer-coaching + optimalisatie). Lijn-uren expliciet: ~500u; raadplegen-uren expliciet: 60u (NA mutatie).",
};

// =====================================================================
// PROCESSEN — motivatie (NA toevoeging 4 geconsulteerden)
// =====================================================================

const PROCESSEN_MOTIVATIE: Record<string, string> = {
  advies:
    "Inspanningsleider Processen (TBD — naam nog te benoemen door de stuurgroep; mogelijke kandidaten: Projectmanager D of een externe procesconsultant met cross-sectorale ervaring). Kernteam van 5 personen (Procesmanager / Data-analist Klant & Markt + Projectmanager D + drie Procesondersteuners C voor PO, VO en Professionals) ontwerpt en stuurt funnel-governance, vastleggingsprotocollen en CVM-cyclus. Geconsulteerden: commercieel manager + 3 sectormanagers (PO/VO/Prof) raadplegen op cruciale funnel/CVM-besluiten — 24u raadplegen-uren totaal (4 personen × 6u over de looptijd, geconcentreerd in piek-jaren 2027–2028 rond pilot, sectorvarianten en uitrol). Geen aparte trainings-deelnemers — proces-aanpassingen worden via cultuur- en mens-spoor geadopteerd; sectoradoptie loopt via de eigen procesondersteuners en niet via een aparte trainingsdoelgroep. Lijn-uren expliciet: kernteam draait op programma 0,8 / lijn 0,2 (leider 0,9 / 0,1); 133u lijn-belasting verdeeld over de looptijd. Raadplegen-uren expliciet: 24u (commercieel manager 6u + 3× sectormanager 6u).",
  plus20:
    "Inspanningsleider Processen (TBD — naam nog te benoemen; mogelijke kandidaten: Projectmanager D of externe procesconsultant). Kernteam van 5 personen (Procesmanager K&M + Projectmanager D + 3 Procesondersteuners) ontwerpt en stuurt funnel-governance en CVM-cyclus over 5 jaar. Geconsulteerden: commercieel manager + 3 sectormanagers (PO/VO/Prof) raadplegen op cruciale funnel/CVM-besluiten — 24u raadplegen-uren totaal (4 personen × 6u, piek 2027–2028). Geen aparte trainings-deelnemers — proces-aanpassingen worden via cultuur- en mens-spoor geadopteerd. Lijn-uren expliciet: kernteam programma 0,8 / lijn 0,2 (leider 0,9 / 0,1); 176u lijn-belasting verdeeld over de looptijd. Raadplegen-uren expliciet: 24u.",
  optimaal:
    "Inspanningsleider Processen (TBD — naam nog te benoemen; mogelijke kandidaten: Projectmanager D of externe procesconsultant). Kernteam van 5 personen (Procesmanager K&M + Projectmanager D + 3 Procesondersteuners) ontwerpt en stuurt funnel-governance en CVM-cyclus over 7 jaar — ruimer afgewogen tempo dan advies, met meer ruimte voor doorontwikkeling. Geconsulteerden: commercieel manager + 3 sectormanagers (PO/VO/Prof) raadplegen op cruciale funnel/CVM-besluiten — 24u raadplegen-uren totaal (4 personen × 6u, piek 2027–2028). Geen aparte trainings-deelnemers — proces-aanpassingen worden via cultuur- en mens-spoor geadopteerd. Lijn-uren expliciet: kernteam programma 0,8 / lijn 0,2 (leider 0,9 / 0,1); 222u lijn-belasting verdeeld over de looptijd. Raadplegen-uren expliciet: 24u.",
  min20:
    "Inspanningsleider Processen (TBD — naam nog te benoemen; mogelijke kandidaten: Projectmanager D of externe procesconsultant). Kernteam van 5 personen (Procesmanager K&M + Projectmanager D + 3 Procesondersteuners) ontwerpt en stuurt funnel-governance en CVM-cyclus over 10 jaar — bewust laag tempo om belasting te spreiden. Geconsulteerden: commercieel manager + 3 sectormanagers (PO/VO/Prof) raadplegen op cruciale funnel/CVM-besluiten — 24u raadplegen-uren totaal (4 personen × 6u, piek 2028–2029 — uitrol-fase schuift in min20 één jaar door). Geen aparte trainings-deelnemers — proces-aanpassingen worden via cultuur- en mens-spoor geadopteerd. Lijn-uren expliciet: kernteam programma 0,8 / lijn 0,2 (leider 0,9 / 0,1); 260u lijn-belasting verdeeld over de looptijd. Raadplegen-uren expliciet: 24u.",
};

// =====================================================================
// MAIN
// =====================================================================

async function main() {
  const s = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!);
  const { data, error: readErr } = await s.from("din_sessions").select("data").eq("id", SESSION_ID).maybeSingle();
  if (readErr || !data) { console.error("Read error:", readErr); process.exit(1); }
  const sess = data.data as Record<string, unknown>;
  const wiz = sess.crossAnalyseWizard as Record<string, unknown>;
  const stepResults = wiz.stepResults as Record<string, unknown>;
  const stap4 = stepResults.stap4 as Record<string, unknown>;
  const s7 = stap4.stap7InterneUren as Record<string, unknown>;

  if (s7.tekstUpdateMeiApplied) {
    console.log("⏭ Marker tekstUpdateMeiApplied al aanwezig:", s7.tekstUpdateMeiApplied);
    console.log("   Script is idempotent — verwijder marker om opnieuw te draaien.");
    return;
  }

  const sel = s7.selectiePerDomein as Record<string, Record<string, Record<string, unknown>>>;
  const customs = (s7.customFunctiesPerDomein as Record<string, Array<Record<string, unknown>>>) || {};
  const vUPI = s7.vastgesteldeUrenPerInspanning as Array<{ domein?: string; rollen: Rol[] }>;
  const scenarios = s7.scenarios as Record<string, Scenario>;

  // ---------------------------------------------------------------------
  // STAP A: DATA functie-mutatie
  // ---------------------------------------------------------------------
  console.log("\n=== STAP A — Data functie-mutatie ===");

  // A1. Verwijder productowner_a_website + content_specialist uit selectiePerDomein.data_systemen
  if (sel.data_systemen?.productowner_a_website) {
    delete sel.data_systemen.productowner_a_website;
    console.log("✓ selectie data: productowner_a_website weg");
  }
  if (sel.data_systemen?.content_specialist) {
    delete sel.data_systemen.content_specialist;
    console.log("✓ selectie data: content_specialist weg");
  }

  // A2. Verschuif productowner_b_producten → kernteam (categorie-veld in selectie)
  if (sel.data_systemen?.productowner_b_producten) {
    sel.data_systemen.productowner_b_producten.categorie = "kernteam";
    console.log("✓ selectie data: productowner_b_producten → kernteam");
  }

  // A3. Voeg PO_b toe aan customFunctiesPerDomein.data_systemen met nieuwe naam
  if (!customs.data_systemen) customs.data_systemen = [];
  const existingPOb = customs.data_systemen.find((c) => c.id === "productowner_b_producten");
  if (existingPOb) {
    existingPOb.naam = "Product Owner van de systemen";
    existingPOb.cluster = "Data & Technologie";
  } else {
    customs.data_systemen.push({
      id: "productowner_b_producten",
      naam: "Product Owner van de systemen",
      cluster: "Data & Technologie",
    });
  }
  console.log("✓ customFuncties data: productowner_b_producten naam = 'Product Owner van de systemen'");

  // A4. vUPI[data] rollen — verwijder PO_a + content_spec, hernoem PO_b
  for (const grp of vUPI) {
    if (grp.domein !== "data_systemen") continue;
    const beforeLen = grp.rollen.length;
    grp.rollen = grp.rollen.filter((r) => r.functieId !== "productowner_a_website" && r.functieId !== "content_specialist");
    if (grp.rollen.length < beforeLen) console.log(`✓ vUPI data: -${beforeLen - grp.rollen.length} rollen (PO_a + content_spec)`);

    const POb = grp.rollen.find((r) => r.functieId === "productowner_b_producten");
    if (POb) {
      POb.functieNaam = "Product Owner van de systemen";
      POb.categorie = "kernteam";
      POb.urenTotaal = 110; // Optie A — kernteam-fasecurve consistent met andere kernteam-leden
      POb.programmaPct = 0.8;
      POb.lijnPct = 0.2;
      POb.raadplegenPct = 0;
      POb.afdeling = POb.afdeling || "Data & Technologie";
      POb.onderbouwing = "1 persoon × 110u over advies-scenario (4 jaar) — producteigenaar CRM-platform: ontwerpkeuzes, releaseprioriteiten, datamodel-governance richting leverancier, interne stuurgroep. Fase-curve 5/45/44/15 conform overige kernteam-leden.";
      console.log("✓ vUPI data: PO_b → 'Product Owner van de systemen' kernteam 110u");
    }
  }

  // A5. scenarios[].data.jaren[].rollen — verwijder PO_a + content_spec, hervorm PO_b kernteam-curve
  // Strategy: kopieer fasecurve van projectmanager_d in elk scenario per jaar
  for (const [scKey, sc] of Object.entries(scenarios)) {
    const dataDom = sc.domeinen?.find((d) => d.domein === "data_systemen");
    if (!dataDom?.jaren) continue;

    for (const jaar of dataDom.jaren) {
      if (!jaar.rollen) continue;

      // Verwijder PO_a + content_spec
      jaar.rollen = jaar.rollen.filter((r) => r.functieId !== "productowner_a_website" && r.functieId !== "content_specialist");

      // Vind projectmanager_d in dit jaar als referentie voor PO_b uren
      const refKernteam = jaar.rollen.find((r) => r.functieId === "projectmanager_d") || jaar.rollen.find((r) => r.functieId === "procesmanager_data");
      const POb = jaar.rollen.find((r) => r.functieId === "productowner_b_producten");
      if (POb) {
        POb.functieNaam = "Product Owner van de systemen";
        POb.categorie = "kernteam";
        POb.programmaPct = 0.8;
        POb.lijnPct = 0.2;
        POb.raadplegenPct = 0;
        if (refKernteam) {
          POb.uren = refKernteam.uren ?? 0;
          POb.kosten = refKernteam.kosten ?? 0;
          POb.uurtarief = refKernteam.uurtarief ?? POb.uurtarief;
        } else {
          POb.uren = 0;
          POb.kosten = 0;
        }
      }
    }
    console.log(`✓ ${scKey} data: PO_a/content_spec weg, PO_b kernteam-curve gekopieerd van projectmanager_d`);
  }

  // ---------------------------------------------------------------------
  // STAP B: PROCESSEN functie-toevoeging
  // ---------------------------------------------------------------------
  console.log("\n=== STAP B — Processen +4 geconsulteerden ===");

  // B1. Custom-functie commercieel-manager
  if (!customs.processen) customs.processen = [];
  if (!customs.processen.some((c) => c.id === "custom-commercieel-manager")) {
    customs.processen.push({
      id: "custom-commercieel-manager",
      naam: "Commercieel manager",
      cluster: "Commercieel",
    });
    console.log("✓ custom processen: commercieel manager toegevoegd");
  }

  // B2. selectiePerDomein.processen — 4 entries
  if (!sel.processen) sel.processen = {};
  const newConsults: Array<{ id: string; naam: string }> = [
    { id: "custom-commercieel-manager", naam: "Commercieel manager" },
    { id: "sectormanager_po", naam: "Sectormanager PO" },
    { id: "sectormanager_vo", naam: "Sectormanager VO" },
    { id: "sectormanager_prof", naam: "Sectormanager Professionals" },
  ];
  for (const nc of newConsults) {
    if (!sel.processen[nc.id]) {
      sel.processen[nc.id] = { aantal: 1, categorie: "geconsulteerd" };
      console.log(`✓ selectie processen: ${nc.id} toegevoegd (geconsulteerd)`);
    } else {
      sel.processen[nc.id].categorie = "geconsulteerd";
    }
  }

  // B3. vUPI[processen] rollen — 4 nieuwe rollen
  const procesGrp = vUPI.find((g) => g.domein === "processen");
  if (procesGrp) {
    const onderbouwingen: Record<string, string> = {
      "custom-commercieel-manager": "Geraadpleegd op funnel-design en CVM-cyclus — commerciële proces-input voor cruciale besluiten over funnelfasen, vastleggingsprotocollen en commerciële sturing op klantinformatie.",
      "sectormanager_po": "Raadplegen op funnel-implementatie en sector-specifieke proces-aanpassingen tijdens piek-jaren — borgt aansluiting op PO-werkpraktijk en draagvlak in eigen sector.",
      "sectormanager_vo": "Raadplegen op funnel-implementatie en sector-specifieke proces-aanpassingen tijdens piek-jaren — borgt aansluiting op VO-werkpraktijk en draagvlak in eigen sector.",
      "sectormanager_prof": "Raadplegen op funnel-implementatie en sector-specifieke proces-aanpassingen tijdens piek-jaren — borgt aansluiting op Professionals-werkpraktijk en draagvlak in eigen sector.",
    };
    for (const nc of newConsults) {
      if (procesGrp.rollen.some((r) => r.functieId === nc.id)) continue;
      procesGrp.rollen.push({
        functieId: nc.id,
        functieNaam: nc.naam,
        afdeling: nc.id.startsWith("sectormanager") ? "Sector" : "Commercieel",
        urenTotaal: 6,
        categorie: "geconsulteerd",
        programmaPct: 0,
        lijnPct: 0,
        raadplegenPct: 1.0,
        onderbouwing: onderbouwingen[nc.id],
      });
      console.log(`✓ vUPI processen: ${nc.id} toegevoegd 6u`);
    }
  }

  // B4. Per scenario: voeg per consult-rol 3u toe in 2 piek-jaren
  // Piek-jaren: advies/plus20/optimaal = 2027 + 2028. min20 = 2028 + 2029.
  const piekJaren: Record<string, [number, number]> = {
    advies: [2027, 2028],
    plus20: [2027, 2028],
    optimaal: [2027, 2028],
    min20: [2028, 2029],
  };
  for (const [scKey, sc] of Object.entries(scenarios)) {
    const procesDom = sc.domeinen?.find((d) => d.domein === "processen");
    if (!procesDom?.jaren) continue;
    const tarief = sc.uurtariefGebruikt ?? 70;
    const [pjr1, pjr2] = piekJaren[scKey] ?? [2027, 2028];

    for (const jaar of procesDom.jaren) {
      if (!jaar.rollen) jaar.rollen = [];
      const isPiek = jaar.jaar === pjr1 || jaar.jaar === pjr2;
      if (!isPiek) continue;

      const indexF = Math.pow(1.05, jaar.jaar - 2025);
      for (const nc of newConsults) {
        if (jaar.rollen.some((r) => r.functieId === nc.id)) continue;
        jaar.rollen.push({
          functieId: nc.id,
          functieNaam: nc.naam,
          afdeling: nc.id.startsWith("sectormanager") ? "Sector" : "Commercieel",
          uren: 3,
          kosten: Math.round(3 * tarief * indexF),
          uurtarief: Math.round(tarief * indexF),
          categorie: "geconsulteerd",
          programmaPct: 0,
          lijnPct: 0,
          raadplegenPct: 1.0,
        });
      }
    }
    console.log(`✓ ${scKey} processen: 4 consults × 3u toegevoegd in ${pjr1} + ${pjr2}`);
  }

  // ---------------------------------------------------------------------
  // STAP C: TEKST-UPDATE motivaties + activiteiten
  // ---------------------------------------------------------------------
  console.log("\n=== STAP C — Motivaties bijwerken ===");

  for (const [scKey, sc] of Object.entries(scenarios)) {
    if (!sc.domeinen) continue;
    for (const dom of sc.domeinen) {
      let nieuw: string | null = null;
      if (dom.domein === "cultuur") nieuw = CULTUUR_MOTIVATIE[scKey] ?? null;
      else if (dom.domein === "mens") nieuw = MENS_MOTIVATIE[scKey] ?? null;
      else if (dom.domein === "data_systemen") nieuw = DATA_MOTIVATIE[scKey] ?? null;
      else if (dom.domein === "processen") nieuw = PROCESSEN_MOTIVATIE[scKey] ?? null;
      if (nieuw) {
        dom.motivatie = nieuw;
        console.log(`✓ ${scKey} ${dom.domein}: motivatie bijgewerkt`);
      }
    }
  }

  // ---------------------------------------------------------------------
  // STAP D: Per-jaar activiteit-strings updaten (mens 2027 + processen uitrol-jaar)
  // ---------------------------------------------------------------------
  console.log("\n=== STAP D — Activiteit-strings ===");

  const mensActiviteit2027 =
    "[Vaardigheid-fase blok 1] Externe partij voert trainingsblok 1 (24u/cursist) uit voor 65 cursisten, waaronder de 12 Trainer/Adviseur A als zelf-cursist (zij faciliteren niet — zij volgen de training). Tussentijdse evaluatie door HR-curriculumeigenaar en Manager Klantcontact; alle 3 sectormanagers borgen werkroostering. Volume-jaar (zwaartepunt 65 × 24u = 1.560 cursisturen + voorbereiding).";
  const mensActiviteit2027plus20 = mensActiviteit2027;

  // Per-scenario per-jaar mens 2027 vervang (alleen advies + plus20 hebben blok 1 in 2027)
  for (const scKey of ["advies", "plus20"]) {
    const sc = scenarios[scKey];
    const mensDom = sc?.domeinen?.find((d) => d.domein === "mens");
    const j2027 = mensDom?.jaren?.find((j) => j.jaar === 2027);
    if (j2027) {
      j2027.activiteit = scKey === "advies" ? mensActiviteit2027 : mensActiviteit2027plus20;
      console.log(`✓ ${scKey} mens 2027: activiteit bijgewerkt (12 trainers als zelf-cursist)`);
    }
  }

  // Processen — vervang "21 medewerkers"-claim in uitrol-jaar
  const procesUitrolVervang: Record<string, number> = {
    advies: 2028,
    plus20: 2028,
    optimaal: 2028,
    min20: 2029,
  };
  const procesUitrolTekst: Record<string, string> = {
    advies:
      "[Uitrol & borging funnel-werking] Brede uitrol vastleggingsprotocollen in werkpraktijk; 9 multidisciplinaire deliverable-sessies (3 per sector) voor adoptie via de eigen procesondersteuners; onboardingsprogramma voor nieuwe medewerkers operationeel; structureel proceseigenaarschap start onder regie van Procesmanager K&M; Projectmanager D coördineert sessies. Tweede raadpleeg-moment: commercieel manager + 3 sectormanagers worden geraadpleegd voor sector-specifieke aanpassingen, CVM-cyclus-review en validatie funneldefinities (3u per consult).",
    plus20:
      "[Uitrol & borging funnel-werking] Brede uitrol vastleggingsprotocollen in werkpraktijk; 9 multidisciplinaire deliverable-sessies (3 per sector) voor adoptie via de eigen procesondersteuners; onboardingsprogramma voor nieuwe medewerkers operationeel; structureel proceseigenaarschap start onder regie van Procesmanager K&M. Tweede raadpleeg-moment: commercieel manager + 3 sectormanagers worden geraadpleegd voor sector-specifieke aanpassingen en CVM-cyclus-review (3u per consult).",
    optimaal:
      "[Uitrol & borging funnel-werking] Brede uitrol vastleggingsprotocollen in werkpraktijk; 9 multidisciplinaire deliverable-sessies (3 per sector) voor adoptie via de eigen procesondersteuners; onboardingsprogramma voor nieuwe medewerkers operationeel; structureel proceseigenaarschap start onder regie van Procesmanager K&M; Projectmanager D coördineert sessies. Tweede raadpleeg-moment: commercieel manager + 3 sectormanagers worden geraadpleegd voor sector-specifieke aanpassingen, CVM-cyclus-review en harmonisatie met live-CRM (3u per consult).",
    min20:
      "[Uitrol & borging funnel-werking] Brede uitrol vastleggingsprotocollen in werkpraktijk; 9 multidisciplinaire deliverable-sessies (3 per sector) voor adoptie via de eigen procesondersteuners; onboardingsprogramma voor nieuwe medewerkers operationeel; structureel proceseigenaarschap start onder regie van Procesmanager K&M; Projectmanager D coördineert sessies. Tweede raadpleeg-moment: commercieel manager + 3 sectormanagers worden geraadpleegd voor sector-specifieke aanpassingen en CVM-cyclus-review (3u per consult).",
  };

  for (const [scKey, jaarNr] of Object.entries(procesUitrolVervang)) {
    const sc = scenarios[scKey];
    const procDom = sc?.domeinen?.find((d) => d.domein === "processen");
    const jaar = procDom?.jaren?.find((j) => j.jaar === jaarNr);
    if (jaar) {
      jaar.activiteit = procesUitrolTekst[scKey];
      console.log(`✓ ${scKey} processen ${jaarNr}: '21 medewerkers'-claim vervangen`);
    }
  }

  // ---------------------------------------------------------------------
  // STAP E: Hercalc aggregaten
  // ---------------------------------------------------------------------
  console.log("\n=== STAP E — Hercalc aggregaten ===");

  for (const sc of Object.values(scenarios)) {
    let scTotU = 0, scP = 0, scL = 0, scR = 0;
    for (const dom of sc.domeinen ?? []) {
      let domTotU = 0, domP = 0, domL = 0, domR = 0;
      for (const jaar of dom.jaren ?? []) {
        let jU = 0, jP = 0, jL = 0, jR = 0;
        for (const rol of jaar.rollen ?? []) {
          const u = (rol.uren as number) ?? 0;
          jU += u;
          jP += u * ((rol.programmaPct as number) ?? 0);
          jL += u * ((rol.lijnPct as number) ?? 0);
          jR += u * ((rol.raadplegenPct as number) ?? 0);
        }
        jaar.totaalUren = jU;
        jaar.programmaUren = Math.round(jP);
        jaar.lijnUren = Math.round(jL);
        jaar.raadplegenUren = Math.round(jR);
        domTotU += jU; domP += jP; domL += jL; domR += jR;
      }
      dom.totaalUren = domTotU;
      dom.uren = domTotU;
      dom.programmaUren = Math.round(domP);
      dom.lijnUren = Math.round(domL);
      dom.raadplegenUren = Math.round(domR);
      dom.programmaPct = domTotU > 0 ? domP / domTotU : 0;
      scTotU += domTotU; scP += domP; scL += domL; scR += domR;
    }
    sc.totaalUren = scTotU;
    sc.programmaUren = Math.round(scP);
    sc.lijnUren = Math.round(scL);
    sc.raadplegenUren = Math.round(scR);
    if (sc.totalenPerJaar) {
      for (const t of sc.totalenPerJaar) {
        let u = 0, p = 0, l = 0, r = 0;
        for (const dom of sc.domeinen ?? []) {
          const j = (dom.jaren ?? []).find((x) => x.jaar === t.jaar);
          if (!j) continue;
          u += j.totaalUren ?? 0;
          p += j.programmaUren ?? 0;
          l += j.lijnUren ?? 0;
          r += j.raadplegenUren ?? 0;
        }
        t.uren = u;
        t.programmaUren = p;
        t.lijnUren = l;
        t.raadplegenUren = r;
      }
    }
  }

  // Marker
  s7.tekstUpdateMeiApplied = {
    timestamp: new Date().toISOString(),
    domeinen: ["cultuur", "mens", "data_systemen", "processen"],
    mutaties: {
      data: ["-productowner_a_website", "-content_specialist", "+productowner_b_producten naar kernteam (hernoemd 'Product Owner van de systemen')"],
      processen: ["+custom-commercieel-manager (geconsulteerd)", "+sectormanager_po/vo/prof (geconsulteerd)"],
    },
  };

  // Save
  s7.customFunctiesPerDomein = customs;
  s7.selectiePerDomein = sel;
  s7.vastgesteldeUrenPerInspanning = vUPI;
  s7.scenarios = scenarios;

  const newData = {
    ...sess,
    crossAnalyseWizard: {
      ...wiz,
      stepResults: {
        ...stepResults,
        stap4: { ...stap4, stap7InterneUren: s7 },
      },
    },
  };
  const { error } = await s.from("din_sessions").update({ data: newData }).eq("id", SESSION_ID);
  if (error) { console.error("Write error:", error.message); process.exit(1); }

  console.log("\n✓ Tekst-update mei toegepast.");
  for (const [k, sc] of Object.entries(scenarios)) {
    console.log(`  ${k}: totaal=${sc.totaalUren}u prog=${sc.programmaUren} lijn=${sc.lijnUren} raadplegen=${sc.raadplegenUren}`);
  }
}

void main();
