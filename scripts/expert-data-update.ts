// Expert Data & Systemen — update tekst-velden voor data_systemen-domein
// in alle 4 scenarios + vUPI.data_systemen.rollen onderbouwingen.
//
// Idempotent via marker `expertDataApplied: true` op stap7InterneUren-niveau.
//
// Wijzigingen:
//  - scenarios[*].domeinen[data_systemen].motivatie — herschreven met juiste
//    rolclassificatie (Sven leider, Manager DT geconsulteerd, Trainer/Adv A
//    trainings-deelnemer ipv adoptie-verzorger), werkelijke uren-totaal en
//    27/26 trainings-deelnemers.
//  - scenarios[*].domeinen[data_systemen].jaren[].activiteit + .fase —
//    werkpakketten per fase (Analyse / Architectuur / Realisatie / Acceptatie /
//    Beheer / Optim / Doorontw / Continu), per scenario.
//  - vUPI.data_systemen.rollen[].onderbouwing — kritieke claim-correcties:
//      * manager_dt — niet "co-trekker", maar geconsulteerd-governance.
//      * projectmanager_d — kernteam-trekker, niet co-trekker met Manager DT.
//      * trainer_adviseur_a — trainings-deelnemer / CRM-key-user-onboarding,
//        niet "verzorgt adoptie".
//
// Alleen data_systemen-velden geraakt. Geen commits.
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
    const k = t.substring(0, e).trim();
    const v = t.substring(e + 1).trim().replace(/^["']|["']$/g, "");
    if (!process.env[k]) process.env[k] = v;
  }
}
loadEnvFile(join(process.cwd(), ".env.local"));

const SESSION_ID = "d8b97442-ce8f-4134-b2c7-67dc8e3a3f93";

type Rol = {
  uren?: number;
  aantal?: number;
  categorie?: string;
  functieId?: string;
  functieNaam?: string;
};
type Jaar = {
  jaar: number;
  fase?: string | null;
  activiteit?: string | null;
  totaalUren?: number;
  rollen?: Rol[];
};
type Domein = {
  domein: string;
  uren?: number;
  jaren?: Jaar[];
  motivatie?: string;
  samenvatting?: string;
};
type Scenario = {
  aantalJaren?: number;
  scenarioLabel?: string;
  totaalUren?: number;
  domeinen?: Domein[];
};

type VUPIRol = {
  functieId?: string;
  functieNaam?: string;
  categorie?: string;
  onderbouwing?: string;
};
type VUPIBlock = { domein?: string; rollen?: VUPIRol[] };

// =====================================================================
// Helpers
// =====================================================================

function dataDom(sc: Scenario): Domein | undefined {
  return (sc.domeinen ?? []).find((d) => d.domein === "data_systemen");
}

function categorieAantallen(dom: Domein) {
  // Per categorie: uren-totaal + unieke functieIds met max(aantal)
  const cat: Record<string, { uren: number; functies: Map<string, number> }> = {};
  for (const j of dom.jaren ?? []) {
    for (const r of j.rollen ?? []) {
      const c = r.categorie ?? "?";
      cat[c] = cat[c] ?? { uren: 0, functies: new Map() };
      cat[c].uren += r.uren ?? 0;
      const fid = r.functieId ?? "?";
      const cur = cat[c].functies.get(fid) ?? 0;
      cat[c].functies.set(fid, Math.max(cur, r.aantal ?? 1));
    }
  }
  const personen: Record<string, number> = {};
  for (const c of Object.keys(cat)) {
    let n = 0;
    for (const aantal of cat[c].functies.values()) n += aantal;
    personen[c] = n;
  }
  return { cat, personen };
}

// =====================================================================
// Motivatie generator per scenario
// =====================================================================

function motivatieDataSystemen(skey: string, dom: Domein): string {
  const aantalJaren =
    skey === "min20" ? 10 : skey === "advies" ? 4 : skey === "plus20" ? 5 : 7;
  const lab =
    skey === "min20"
      ? "−20%-scenario (10 jaar)"
      : skey === "advies"
        ? "advies-scenario (4 jaar)"
        : skey === "plus20"
          ? "+20%-scenario (5 jaar)"
          : "optimaal-scenario (7 jaar)";

  const totUren = dom.uren ?? dom.jaren?.reduce((a, j) => a + (j.totaalUren ?? 0), 0) ?? 0;
  const { cat, personen } = categorieAantallen(dom);

  const leiderU = cat.leider?.uren ?? 0;
  const kernU = cat.kernteam?.uren ?? 0;
  const trU = cat.trainings_deelnemer?.uren ?? 0;
  const conU = cat.geconsulteerd?.uren ?? 0;

  const trN = personen.trainings_deelnemer ?? 0;
  const conN = personen.geconsulteerd ?? 0;
  const kernN = personen.kernteam ?? 0;

  return [
    `Totaal ${totUren.toLocaleString("nl-NL")} interne uren werklast voor het integraal CRM-klantdashboard cross-sectoraal, verdeeld over ${aantalJaren} jaar conform stap-6 fasering — bij dit ${lab} ${
      skey === "advies" || skey === "plus20" ? "intensiever per jaar" : "uitgesmeerder per jaar"
    } met zwaartepunt 2027 (architectuur + bouw) en 2028 (acceptatie + key-user-training).`,
    "",
    `Programmaorganisatie: Sven (SIO) is inspanningsleider Data & Systemen (${leiderU}u), niet Manager Data & Technologie. Het multidisciplinaire kernteam (${kernN} personen, ${kernU}u) bestaat uit Projectmanager D (cross-sectorale projectaansturing), Procesmanager Klant & Markt (data-architectuur en cross-sectorale klant-data-koppeling) en drie Medewerkers binnendienst — één per sector PO/VO/Professionals — als outside-in frontline-vertegenwoordiging die dagelijks klantgegevens verwerkt en daarmee primaire eindgebruiker-input levert in het ontwerp.`,
    "",
    `Trainings-deelnemers (${trN} personen, ${trU}u) zijn de cross-sectorale CRM-key-users die zelf opgeleid worden om CRM-functionaliteit te beheersen voor klantkennis, productattributen en sector-dashboard-gebruik: 12 Trainer/Adviseur A (cascade-key-users — zij gebruiken het CRM voor klantkennis bij trainingen), 7 productmanagers (eindgebruiker-input op product-attributen), 3 sectormanagers (sector-dashboard-gebruik), 1 Content Specialist (gebruikersgidsen + helpdesk-FAQ) en 3 Accountmanager-C-Prof split (sales-eindgebruiker key-user-training). De Trainer/Adviseurs zijn deelnemer aan deze CRM-onboarding — externe implementatiepartner verzorgt de organisatie-brede adoptie-begeleiding.`,
    "",
    `Geconsulteerden (${conN} personen, ${conU}u) zijn de governance-zijde: Manager Data & Technologie heeft een governance-rol via stuurgroep, niet doorlopend uitvoerend; twee Productowners (website + producten) leveren review op website-/product-integratie; Business informatieanalist C analyseert op specifieke beslismomenten; Manager Klantcontact + 3 marketeers (Campagne A/B + Junior Prof) leveren campagne-data → CRM; Teamleider Trainingen coördineert nulmeting; en 3 Accountmanager-C-Prof split aan de review-zijde naast hun deelname aan de key-user-training.`,
    "",
    `Cito-realisme: cross-sectoraal CRM raakt circa ${kernN + trN} actieve interne medewerkers in Data & Technologie, Klant & Markt, alle drie de sectoren en Trainingen — ruim binnen de ~124 FTE-capaciteit. Past bij Cito-kerndoel efficiëntie kernprocessen + cross-sectorale klant-data ontsluiten.`,
  ].join("\n");
}

// =====================================================================
// Activiteit + fase per scenario × jaar
// =====================================================================

function activiteitMatrix(): Record<string, Record<number, { fase: string; activiteit: string }>> {
  // Per scenario, per jaar: fase + werkpakket. Aansluiten op stap-6
  // begroting verdelingPerJaar (waar mogelijk).

  return {
    advies: {
      // 4-jaars: 2026 analyse, 2027 architectuur+bouw, 2028 acceptatie+training, 2029 beheer/borging
      2026: {
        fase: "Analyse & architectuur",
        activiteit:
          "Architectuurkeuze cross-sectoraal datamodel + datakwaliteit-scan op 7-8 bronsystemen door Sven (leider) + kernteam (PM D, Procesmanager K&M, 3× Mdw binnendienst); kick-off + nulmeting met geconsulteerde Manager DT en Productowners; voorbereiding leveranciersselectie.",
      },
      2027: {
        fase: "Realisatie — kern & integraties",
        activiteit:
          "Bouw cross-sectoraal datamodel + eerste 4 bronsysteemintegraties; Procesmanager K&M leidt datakwaliteit en bronkoppelingen; Mdw binnendienst PO/VO/Prof valideren CRM-eindgebruiker-flow; sectormanagers reviewen sector-dashboard-conceptscherm.",
      },
      2028: {
        fase: "Acceptatie & key-user-training",
        activiteit:
          "Acceptatietest CRM-functionaliteit; cross-sectorale key-user-onboarding voor 26 trainings-deelnemers (12 Trainer/Adv A als cascade-key-users, 7 productmanagers, 3 sectormanagers, 3 Acc-C-Prof, 1 Content Specialist); externe implementatiepartner verzorgt organisatie-brede adoptie-begeleiding.",
      },
      2029: {
        fase: "Beheer & borging",
        activiteit:
          "Overdracht naar lijn-beheer Data & Technologie; structurele licentie + content-onderhoud (Content Specialist) + helpdesk-FAQ; borging proceseigenaarschap CRM bij Procesmanager K&M.",
      },
    },
    plus20: {
      // 5-jaars: extra borgingsjaar
      2026: {
        fase: "Analyse & architectuur",
        activiteit:
          "Architectuurkeuze + datakwaliteit-scan + leveranciersvoortraject; Sven als leider, kernteam (PM D + Procesmanager K&M + 3× Mdw binnendienst) als multidisciplinaire ontwerpers; geconsulteerde Manager DT in stuurgroep-governance.",
      },
      2027: {
        fase: "Realisatie — bouw + integraties",
        activiteit:
          "Bouw cross-sectoraal datamodel en bronsysteemintegraties; sectorinrichting PO en VO; review door Productowners (website + producten) en BIA-C op specifieke beslismomenten.",
      },
      2028: {
        fase: "Acceptatie & key-user-training",
        activiteit:
          "Pilot + acceptatietest met kernteam-binnendienst; key-user-onboarding voor 26 trainings-deelnemers; cross-sectorale review door 3 Acc-C-Prof aan zowel review-zijde als training-zijde.",
      },
      2029: {
        fase: "Go-live & uitrol",
        activiteit:
          "Sectoruitrol Zakelijk en go-live cross-sectoraal; volledige adoptie met externe implementatiepartner; uitfasering oude bronsystemen onder regie Procesmanager K&M.",
      },
      2030: {
        fase: "Beheer & borging",
        activiteit:
          "Structureel beheer + licentie + content-onderhoud; doorontwikkeling 0,3 FTE intern; afnemende programma-uren — werk verschuift naar lijn-Data & Technologie en proceseigenaarschap.",
      },
    },
    optimaal: {
      // 7-jaars
      2026: {
        fase: "Analyse & architectuur",
        activiteit:
          "Architectuurbesluit + datakwaliteit-scan + Stichting Cito-ontvlechting-analyse; Sven (leider) + kernteam (PM D + Procesmanager K&M + 3× Mdw binnendienst); geconsulteerd: Manager DT (governance-stuurgroep), Productowners en BIA-C op beslismomenten.",
      },
      2027: {
        fase: "Realisatie — bouw",
        activiteit:
          "Bouw cross-sectoraal datamodel + eerste 4 bronsysteemintegraties; Procesmanager K&M leidt datakwaliteit; Mdw binnendienst PO/VO/Prof als primaire eindgebruiker-vertegenwoordigers in functioneel ontwerp.",
      },
      2028: {
        fase: "Acceptatie & key-user-training",
        activiteit:
          "Acceptatietest + cross-sectorale key-user-onboarding voor 26 trainings-deelnemers (12 Trainer/Adv A cascade, 7 productmanagers, 3 sectormanagers, 3 Acc-C-Prof, 1 Content Specialist); externe implementatiepartner verzorgt organisatie-brede adoptie-begeleiding.",
      },
      2029: {
        fase: "Go-live & uitrol",
        activiteit:
          "Sectoruitrol + volledige cross-sectorale go-live; Mdw binnendienst sector-specifieke configuratie-validatie; Manager Klantcontact + marketeers leveren campagne-data → CRM-koppeling.",
      },
      2030: {
        fase: "Beheer & borging",
        activiteit:
          "Overdracht naar lijn-beheer; structurele licentie + content-onderhoud + helpdesk-FAQ door Content Specialist; doorontwikkeling 0,3 FTE intern.",
      },
      2031: {
        fase: "Optimalisatie",
        activiteit:
          "Finetuning dashboard-KPI's; cross-sectorale managementrapportage als nieuw normaal verankerd; structureel proceseigenaarschap CRM bij Procesmanager K&M.",
      },
      2032: {
        fase: "Doorontwikkeling",
        activiteit:
          "Structurele licentielast 85 gebruikers; kleine functionele uitbreidingen op basis van rapportagebehoeften vanuit drie sectoren; afnemende programma-uren.",
      },
    },
    min20: {
      // 10-jaars
      2026: {
        fase: "Analyse & architectuur",
        activiteit:
          "Architectuurkeuze + datakwaliteit-scan + Stichting Cito-ontvlechting-analyse; Sven leidt; kernteam (PM D + Procesmanager K&M + 3× Mdw binnendienst) ontwerpt cross-sectoraal datamodel; geconsulteerd: Manager DT in stuurgroep-governance, Productowners en BIA-C op beslismomenten.",
      },
      2027: {
        fase: "Leverancier-selectie",
        activiteit:
          "Selectie externe implementatiepartner via vaste-prijs-contractering; opstellen contracten met escrow voor datakwaliteit-risico; voorbereiding migratiestrategie door Procesmanager K&M en kernteam.",
      },
      2028: {
        fase: "Realisatie — kern + key-user-training",
        activiteit:
          "Bouw kern-CRM + eerste integraties; cross-sectorale key-user-onboarding voor 26 trainings-deelnemers (12 Trainer/Adv A cascade-key-users, 7 productmanagers, 3 sectormanagers, 3 Acc-C-Prof, 1 Content Specialist); externe implementatiepartner verzorgt organisatie-brede adoptie-begeleiding.",
      },
      2029: {
        fase: "Realisatie — integraties",
        activiteit:
          "Afronding 7-8 bronsysteemintegraties; migratie van resterende data + koppeling Zakelijk-systemen onder regie Procesmanager K&M en Mdw binnendienst-team.",
      },
      2030: {
        fase: "Acceptatie & pilot",
        activiteit:
          "Pilot voor PO en VO met 20 key users (Mdw binnendienst-team + sectormanagers); valideren datakwaliteit, sector-dashboards en workflows; tweede opleidingsblok CRM-specialisten.",
      },
      2031: {
        fase: "Go-live & uitrol",
        activiteit:
          "Sectoruitrol Zakelijk + cross-sectorale go-live; volledige adoptie met externe implementatiepartner; uitfasering oude bronsystemen.",
      },
      2032: {
        fase: "Beheer & borging",
        activiteit:
          "Overdracht naar lijn-beheer Data & Technologie; structurele licenties (~€63K/jr); content-onderhoud + helpdesk-FAQ door Content Specialist; doorontwikkeling 0,3 FTE intern.",
      },
      2033: {
        fase: "Optimalisatie",
        activiteit:
          "Finetuning dashboard-KPI's; cross-sectorale managementrapportage als nieuw normaal verankerd; volledige structurele licentie- en beheerlast.",
      },
      2034: {
        fase: "Doorontwikkeling",
        activiteit:
          "Kleine functionele uitbreidingen + datakwaliteitsverbetering op basis van rapportagebehoeften vanuit drie sectoren; afnemende programma-uren.",
      },
      2035: {
        fase: "Continu verbeteren",
        activiteit:
          "Doorlopende doorontwikkeling op basis van funnelinzichten; structureel beheer + licenties; jaarlijkse evaluatie van platform-fit door Procesmanager K&M en Manager DT.",
      },
    },
  };
}

// =====================================================================
// vUPI rol-onderbouwing correcties
// =====================================================================

function vupiOnderbouwingen(): Record<string, string> {
  // Map: functieId -> nieuwe onderbouwing (alleen waar foute claim staat)
  return {
    manager_dt:
      "Categorie geconsulteerd: Manager Data & Technologie heeft een governance-rol via stuurgroep — niet doorlopend uitvoerend kernteam-trekker. Tijdens kick-off + leveranciersselectie + escalatiemomenten consultatie; verder lijn-verantwoordelijkheid. Bron: programmaorganisatie expliciet (Sven SIO is inspanningsleider, niet Manager DT). 1 persoon × ~6u over advies-scenario (4 jaar) → bredere belasting in stuurgroep-momenten zit in lijn-rol.",
    projectmanager_d:
      "Categorie kernteam: Projectmanager D leidt cross-sectorale projectaansturing namens kernteam onder Sven (SIO) als inspanningsleider. Trekkersrol op werkgroepoverleg, voortgangsrapportage en cross-sectorale afstemming PO/VO/Prof. 1 persoon × 110u over advies-scenario (4 jaar) — gemiddeld 27u/jr met zwaartepunt 2026–2027 (kick-off + bouw) en afnemend naar 2028–2029.",
    procesmanager_data:
      "Categorie kernteam: Procesmanager / Data-analist Klant & Markt verzorgt data-architectuur + cross-sectorale klant-data-koppeling — vakmatige inhoud op datamodel, datakwaliteit-scan, bronsysteemintegraties en acceptatietests. 1 persoon × 110u over advies-scenario (4 jaar) met piek in 2027 (architectuur + bouw).",
    "custom-sven-data-leider":
      "Categorie leider: Sven — SIO als programma-organisatie-eigenaar Data & Systemen. Inspanningsleider voor het integraal CRM-klantdashboard cross-sectoraal: stuurgroep-voorzitter, escalatiepunt en eindverantwoordelijk voor cross-sectorale alignment. Lezing C: 80u/jr piek + 40u/jr niet-piek + 25u/jr borging — 240u over advies-scenario (4 jaar).",
    "custom-mdw-bd-po":
      "Categorie kernteam: Medewerker binnendienst (PO) is outside-in frontline-vertegenwoordiging Sector PO — verwerkt klantgegevens dagelijks in CRM en levert daarmee primaire eindgebruiker-input in het functioneel ontwerp + acceptatietest. 1 persoon × 110u over advies-scenario (4 jaar).",
    "custom-mdw-bd-vo":
      "Categorie kernteam: Medewerker binnendienst (VO) is outside-in frontline-vertegenwoordiging Sector VO — verwerkt klantgegevens dagelijks in CRM en levert daarmee primaire eindgebruiker-input in het functioneel ontwerp + acceptatietest. 1 persoon × 110u over advies-scenario (4 jaar).",
    mdw_binnendienst_a_prof:
      "Categorie kernteam: Medewerker binnendienst A (Professionals) is outside-in frontline-vertegenwoordiging Sector Professionals — verwerkt klantgegevens dagelijks in CRM en levert daarmee primaire eindgebruiker-input in het functioneel ontwerp + acceptatietest. 1 persoon × 110u over advies-scenario (4 jaar).",
    trainer_adviseur_a:
      "Categorie trainings_deelnemer: 12 Trainer/Adviseur A nemen deel aan de cross-sectorale CRM-key-user-onboarding — zij gebruiken het CRM voor klantkennis bij trainingen (cascade-key-users) en moeten daarom zelf opgeleid worden. Zij verzorgen NIET de organisatie-brede adoptie/onboarding (dat doet de externe implementatiepartner). Inzet: 8u nulmeting (2026) + 32u CRM-key-user-onboarding (2028) = 40u/persoon × 12 personen = 480u programma-basis × 70% = 336u programma-uren.",
    teamleider_trainingen:
      "Categorie geconsulteerd: Teamleider Trainingen coördineert nulmeting (2026) en faciliteert de planning van CRM-key-user-onboarding voor de 12 Trainer/Adviseurs in 2028 — coördinerende rol, geen kernteam-positie. 1 persoon × 6u over advies-scenario (raadpleegbasis) — bredere coördinatietijd zit in lijn-functie.",
    sectormanager_po:
      "Categorie trainings_deelnemer: Sectormanager PO is sector-dashboard-gebruiker — neemt deel aan key-user-onboarding om sector-specifieke CRM-rapportages voor PO te beheersen + reviewt sector-inrichting. 1 persoon × 28u over advies-scenario (4 jaar).",
    sectormanager_vo:
      "Categorie trainings_deelnemer: Sectormanager VO is sector-dashboard-gebruiker — neemt deel aan key-user-onboarding om sector-specifieke CRM-rapportages voor VO te beheersen + reviewt sector-inrichting. 1 persoon × 28u over advies-scenario (4 jaar).",
    sectormanager_prof:
      "Categorie trainings_deelnemer: Sectormanager Professionals is sector-dashboard-gebruiker — neemt deel aan key-user-onboarding om sector-specifieke CRM-rapportages voor Professionals te beheersen + reviewt sector-inrichting. 1 persoon × 28u over advies-scenario (4 jaar).",
    accountmanager_c_prof:
      "Categorie geconsulteerd: 3 Accountmanager C (Professionals) leveren review aan de sales-eindgebruiker-zijde — input op CRM-stuurgroep, acceptatietest en sectorconfiguratie. Naast deze review-rol nemen dezelfde 3 personen deel als trainings_deelnemer (split-rol) aan de key-user-training (zie accountmanager_c_prof_trainee). 3 personen × 6u over advies-scenario (raadpleegbasis).",
    accountmanager_c_prof_trainee:
      "Categorie trainings_deelnemer: 3 Accountmanager C (Professionals) — split-rol — als sales-eindgebruiker key-user-training voor CRM. Verschillend van geconsulteerd-rol (review-zijde): hier deelname aan de cross-sectorale key-user-onboarding zelf. 3 personen × 28u over advies-scenario (4 jaar).",
    business_info_analist_c:
      "Categorie geconsulteerd: Business informatieanalist C analyseert op specifieke beslismomenten (datakwaliteit-scan, bronsysteemintegraties, acceptatietests) — geen doorlopend kernteam-werk. 1 persoon × 6u over advies-scenario (raadpleegbasis).",
    productowner_a_website:
      "Categorie geconsulteerd: Productowner A website levert review op website-/leads-CRM-integratie — geen doorlopend kernteam-werk. 1 persoon × 6u over advies-scenario (raadpleegbasis).",
    productowner_b_producten:
      "Categorie geconsulteerd: Productowner B producten levert review op product-data-CRM-koppeling — geen doorlopend kernteam-werk. 1 persoon × 6u over advies-scenario (raadpleegbasis).",
    manager_klantcontact:
      "Categorie geconsulteerd: Manager Klantcontact levert review aan stuurgroep + acceptatietest klantenservice-team-flow + adoption-leiderschap binnen klantenservice. 1 persoon × 6u over advies-scenario (raadpleegbasis).",
    campagne_marketeer_a:
      "Categorie geconsulteerd: Campagne Marketeer A levert campagne-data → CRM voor leads (PO) — voornamelijk in realisatiejaren wanneer CRM ingericht wordt. 1 persoon × 6u over advies-scenario (raadpleegbasis).",
    campagne_marketeer_b:
      "Categorie geconsulteerd: Campagne Marketeer B levert campagne-data → CRM voor leads (VO) — voornamelijk in realisatiejaren wanneer CRM ingericht wordt. 1 persoon × 6u over advies-scenario (raadpleegbasis).",
    junior_marketeer_prof:
      "Categorie geconsulteerd: Junior Marketeer (Professionals) ondersteunt campagne-data-aanlevering CRM voor Professionals-leads — geen doorlopend kernteam-werk. 1 persoon × 6u over advies-scenario (raadpleegbasis).",
    content_specialist:
      "Categorie trainings_deelnemer: Content Specialist neemt deel aan CRM-key-user-onboarding voor content-onderhoud + gebruikersgidsen + helpdesk-FAQ — eindgebruiker-rol. 1 persoon × 28u over advies-scenario (4 jaar).",
    productmanager_dst:
      "Categorie trainings_deelnemer: 2 Productmanager B (DST) leveren product-attributen voor CRM-datamodel (eindgebruiker-input) + acceptatietest + sector-specifieke configuratie. Trainings-deelnemer aan key-user-onboarding. 2 personen × 28u over advies-scenario (4 jaar).",
    productmanager_kib:
      "Categorie trainings_deelnemer: 1 Productmanager A (KiB) levert multi-product-input voor CRM-datamodel (KiB-portfolio) + acceptatietest + multi-product configuratie. Trainings-deelnemer aan key-user-onboarding. 1 persoon × 28u over advies-scenario (4 jaar).",
    productmanager_klt:
      "Categorie trainings_deelnemer: 1 Productmanager B (KLT) levert product-attributen voor CRM-datamodel + acceptatietest + sector-specifieke configuratie. Trainings-deelnemer aan key-user-onboarding. 1 persoon × 28u over advies-scenario (4 jaar).",
    productmanager_lib:
      "Categorie trainings_deelnemer: 1 Productmanager B (LiB) levert product-attributen voor CRM-datamodel + acceptatietest + sector-specifieke configuratie. Trainings-deelnemer aan key-user-onboarding. 1 persoon × 28u over advies-scenario (4 jaar).",
    productmanager_nt2:
      "Categorie trainings_deelnemer: 1 Productmanager B (NT2 overheid) levert product-attributen voor CRM-datamodel + acceptatietest + sector-specifieke configuratie. Trainings-deelnemer aan key-user-onboarding. 1 persoon × 28u over advies-scenario (4 jaar).",
    productmanager_cvvo:
      "Categorie trainings_deelnemer: 1 Productmanager B (CvVO) levert product-attributen voor CRM-datamodel + acceptatietest + sector-specifieke configuratie. Trainings-deelnemer aan key-user-onboarding. 1 persoon × 28u over advies-scenario (4 jaar).",
  };
}

// =====================================================================
// Main
// =====================================================================

async function main() {
  const s = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
  );
  const { data, error } = await s
    .from("din_sessions")
    .select("data")
    .eq("id", SESSION_ID)
    .maybeSingle();
  if (error) throw error;
  if (!data) throw new Error("NO DATA");
  const sess = data.data as Record<string, unknown>;
  const wiz = sess.crossAnalyseWizard as Record<string, unknown>;
  const stepResults = wiz.stepResults as Record<string, unknown>;
  const stap4 = stepResults.stap4 as Record<string, unknown>;
  const s7 = stap4.stap7InterneUren as Record<string, unknown>;

  // Idempotentie-check
  if ((s7 as Record<string, unknown>).expertDataApplied === true) {
    console.log("[idempotent] expertDataApplied=true — geen wijzigingen.");
    return;
  }

  const scenarios = s7.scenarios as Record<string, Scenario>;
  const actMatrix = activiteitMatrix();

  let scenariosUpdated = 0;
  let jarenUpdated = 0;
  for (const [skey, sc] of Object.entries(scenarios)) {
    const dom = dataDom(sc);
    if (!dom) continue;
    // Motivatie
    dom.motivatie = motivatieDataSystemen(skey, dom);
    // Activiteit + fase per jaar
    const map = actMatrix[skey] ?? {};
    for (const j of dom.jaren ?? []) {
      const m = map[j.jaar];
      if (m) {
        j.fase = m.fase;
        j.activiteit = m.activiteit;
        jarenUpdated++;
      }
    }
    scenariosUpdated++;
    console.log(
      `[scenario ${skey}] motivatie=${dom.motivatie.length} chars; ${
        (dom.jaren ?? []).length
      } jaren met fase+activiteit`,
    );
  }

  // vUPI rollen onderbouwingen
  const vUPIBlocks = (s7 as Record<string, unknown>)
    .vastgesteldeUrenPerInspanning as VUPIBlock[];
  let rollenUpdated = 0;
  if (Array.isArray(vUPIBlocks)) {
    const dataBlock = vUPIBlocks.find((b) => b.domein === "data_systemen");
    if (dataBlock?.rollen) {
      const ond = vupiOnderbouwingen();
      for (const r of dataBlock.rollen) {
        const fid = r.functieId ?? "";
        if (fid in ond) {
          r.onderbouwing = ond[fid];
          rollenUpdated++;
        }
      }
    }
  }

  // Marker
  (s7 as Record<string, unknown>).expertDataApplied = true;
  (s7 as Record<string, unknown>).expertDataAppliedMeta = {
    versie: 1,
    timestamp: new Date().toISOString(),
    scope: "data_systemen-domein: motivatie + jaar.fase/activiteit + vUPI-rollen-onderbouwing",
    correcties: [
      "Sven (custom-sven-data-leider) bevestigd als leider — Manager DT NIET co-trekker",
      "Manager DT (manager_dt) bevestigd als geconsulteerd — onderbouwing herschreven",
      "Projectmanager D bevestigd als kernteam-trekker (niet co-trekker met Manager DT)",
      "Procesmanager K&M bevestigd als kernteam (data-architectuur)",
      "3× Mdw binnendienst PO/VO/Prof bevestigd als kernteam (outside-in frontline)",
      "12 Trainer/Adviseur A herclassificatie: trainings-deelnemer / CRM-key-user-onboarding (NIET 'verzorgt adoptie')",
      "Externe implementatiepartner verzorgt organisatie-brede adoptie/onboarding",
      "26 trainings-deelnemers (12 Trainer/Adv A + 7 productmanagers + 3 sectormanagers + 3 Acc-C-Prof + 1 Content Specialist) — verouderd '49 eindgebruikers + ambassadors' verwijderd",
      "12 geconsulteerden incl. Manager DT als governance-rol",
    ],
    scenariosUpdated,
    jarenUpdated,
    rollenUpdated,
  };

  console.log(
    `\n[summary] scenariosUpdated=${scenariosUpdated}, jarenUpdated=${jarenUpdated}, rollenUpdated=${rollenUpdated}`,
  );

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

  const { error: upErr } = await s
    .from("din_sessions")
    .update({ data: newData })
    .eq("id", SESSION_ID);
  if (upErr) {
    console.error("FOUT:", upErr.message);
    process.exit(1);
  }
  console.log("✓ Supabase bijgewerkt — data_systemen-velden gecorrigeerd.");
}

void main();
