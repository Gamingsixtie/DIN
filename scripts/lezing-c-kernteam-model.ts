/**
 * Lezing C — Kernteam-model doorvoeren op DIN-sessie d8b97442
 *
 * Voert het kernteam-model door:
 * - 4 categorieën met fase-gebaseerde uren:
 *   • Inspanningsleider: 80u piek / 40u niet-piek / 25u borging
 *   • Kernteam-lid:      40u piek / 15u niet-piek / 10u borging
 *   • Geconsulteerd:     6u totaal (3u Realisatie + 3u Acceptatie/Verankering)
 *   • Trainings-deelnemer (mens): 46u totaal (24u Basis + 22u Vaardigheid)
 *
 * Plus 4 cleanup-stappen:
 * 1. productmanager_int_zak verwijderen (mens + data_systemen)
 * 2. Trojka procesconsultants vervangen door 1 placeholder in programmaorganisatie.kerngroep
 * 3. Reset alle rollen + scenarios naar Lezing C-niveaus
 * 4. Marker omzetten naar Lezing C in stap4.stap7InterneUren.interneUrenLezing
 *
 * Idempotent — checkt marker `lezingCDoorgevoerd: true`.
 */

import { createClient } from "@supabase/supabase-js";
import { readFileSync, existsSync, writeFileSync, mkdirSync } from "fs";
import { join, dirname } from "path";

// ---------- env loader ----------
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

const supa = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
);

const SESSION_ID = "d8b97442-ce8f-4134-b2c7-67dc8e3a3f93";

// ---------- types ----------
type Categorie =
  | "inspanningsleider"
  | "kernteam"
  | "geconsulteerd"
  | "trainings_deelnemer"
  | "geen";

type Domein = "mens" | "processen" | "data_systemen" | "cultuur";

type RolKlassificatie = {
  functieId: string;
  functieNaam: string;
  afdeling: string;
  aantal: number;
  categorie: Categorie;
};

// ---------- afdeling lookup (uit bestaande data) ----------
const AFDELING_MAP: Record<string, string> = {
  // Data & Technologie
  manager_dt: "Data & Technologie",
  projectmanager_d: "Data & Technologie",
  business_info_analist_c: "Data & Technologie",
  productowner_a_website: "Data & Technologie",
  productowner_b_producten: "Data & Technologie",
  // Klant & Markt
  procesmanager_data: "Klant & Markt",
  // Trainingen
  trainer_adviseur_a: "Trainingen",
  teamleider_trainingen: "Trainingen",
  // Sectoren
  sectormanager_po: "Sector PO",
  sectormanager_vo: "Sector VO",
  sectormanager_prof: "Sector Professionals",
  productmanager_dst: "Sector PO",
  productmanager_kib: "Sector PO",
  productmanager_klt: "Sector PO",
  productmanager_lib: "Sector VO",
  productmanager_nt2: "Sector VO",
  productmanager_cvvo: "Sector VO",
  accountmanager_a: "Sector PO",
  accountmanager_b: "Sector VO",
  accountmanager_c: "Sector PO",
  accountmanager_c_prof: "Sector Professionals",
  mdw_binnendienst_a: "Sector PO",
  mdw_binnendienst_b: "Sector VO",
  mdw_binnendienst_a_prof: "Sector Professionals",
  junior_marketeer_prof: "Sector Professionals",
  // Klantcontact
  klantenservice_a: "Klantcontact",
  klantenservice_b: "Klantcontact",
  klantenservice_c: "Klantcontact",
  manager_klantcontact: "Klantcontact",
  teamleider_klantenservice: "Klantcontact",
  // Marketing
  campagne_marketeer_a: "Marketing",
  campagne_marketeer_b: "Marketing",
  content_specialist: "Marketing",
  // Procesondersteuning
  procesondersteuner_po: "Sector PO",
  procesondersteuner_vo: "Sector VO",
  // Cultuur-specifiek
  directeur_bv: "Directie",
  teamleider_ps: "Sector PO",
  // Custom
  "custom-1777458764027-8mxzp": "HR",
  "custom-1777459472792-own3u": "Sector Professionals",
  "custom-yara-mens-leider": "HR",
  "custom-sven-data-leider": "Data & Technologie",
  "custom-inspanningsleider-processen-tbd": "Klant & Markt",
};

const FUNCTIENAAM_MAP: Record<string, string> = {
  manager_dt: "Manager Data & Technologie",
  projectmanager_d: "Projectmanager D",
  business_info_analist_c: "Business informatieanalist C",
  productowner_a_website: "Productowner A website",
  productowner_b_producten: "Productowner B producten",
  procesmanager_data: "Procesmanager / Data-analist Klant & Markt",
  trainer_adviseur_a: "Trainer/Adviseur A",
  teamleider_trainingen: "Teamleider Trainingen",
  sectormanager_po: "Sectormanager PO",
  sectormanager_vo: "Sectormanager VO",
  sectormanager_prof: "Sectormanager Professionals",
  productmanager_dst: "Productmanager B (DST)",
  productmanager_kib: "Productmanager A (KiB)",
  productmanager_klt: "Productmanager B (KLT)",
  productmanager_lib: "Productmanager B (LiB)",
  productmanager_nt2: "Productmanager B (NT2 overheid)",
  productmanager_cvvo: "Productmanager B (CvVO)",
  accountmanager_a: "Accountmanager A",
  accountmanager_b: "Accountmanager B",
  accountmanager_c: "Accountmanager C",
  accountmanager_c_prof: "Accountmanager C (Professionals)",
  mdw_binnendienst_a: "Medewerker binnendienst A",
  mdw_binnendienst_b: "Medewerker binnendienst B",
  mdw_binnendienst_a_prof: "Medewerker binnendienst A (Professionals)",
  junior_marketeer_prof: "Junior Marketeer (Professionals)",
  klantenservice_a: "Klantenservice medewerker A",
  klantenservice_b: "Klantenservice medewerker B",
  klantenservice_c: "Klantenservice medewerker C",
  manager_klantcontact: "Manager Klantcontact",
  teamleider_klantenservice: "Teamleider klantenservice",
  campagne_marketeer_a: "Campagne Marketeer A",
  campagne_marketeer_b: "Campagne Marketeer B",
  content_specialist: "Content Specialist",
  procesondersteuner_po: "Procesondersteuner C (PO)",
  procesondersteuner_vo: "Procesondersteuner C (VO)",
  directeur_bv: "Directeur BV",
  teamleider_ps: "Teamleider Proces Support",
  "custom-1777458764027-8mxzp": "HR",
  "custom-1777459472792-own3u": "Procesondersteuner professionals",
  "custom-yara-mens-leider": "Yara — HR-manager (inspanningsleider Mens)",
  "custom-sven-data-leider": "Sven — SIO (inspanningsleider Data & Systemen)",
  "custom-inspanningsleider-processen-tbd": "Inspanningsleider Processen — naam nog te benoemen",
};

// ---------- Lezing C uren-niveaus ----------
const UREN_PIEK = {
  inspanningsleider: 80,
  kernteam: 40,
};
const UREN_NIET_PIEK = {
  inspanningsleider: 40,
  kernteam: 15,
};
const UREN_BORGING = {
  inspanningsleider: 25,
  kernteam: 10,
};
const UREN_GECONSULTEERD_TOTAAL = 6; // 3u Realisatie + 3u Acceptatie
const UREN_TRAININGS_BASIS = 24; // mens-blok 1
const UREN_TRAININGS_VAARDIGHEID = 22; // mens-blok 2

// ---------- fase classifier ----------
type FaseType = "piek" | "borging" | "trainings_basis" | "trainings_vaardigheid" | "realisatie_consult" | "acceptatie_consult" | "niet_piek" | "geen";

function classifyFase(fase: string, jaarIndex: number, aantalJaren: number, domein: string): FaseType {
  const f = fase.toLowerCase();

  // Trainings-deelnemers: alleen voor mens
  if (domein === "mens") {
    if (/basistraining/.test(f) || /^basis$/.test(f) || /^basis /.test(f)) return "trainings_basis";
    if (/vaardigheidstraining/.test(f) || /vaardigheid/.test(f)) return "trainings_vaardigheid";
  }

  // Borging-jaren: alleen vanaf jaar 4 (index 3) in lange scenario's (>= 7j)
  const isLangScenario = aantalJaren >= 7;
  const isBorgingJaar = isLangScenario && jaarIndex >= 3;
  const borgingPattern = /(beheer|optim|doorontw|continu|continue|verank|borging|standaardisatie|waardenverank|rolmodel-werking|ontwikkeling|borging in lijn|borging in hr|in beheer|in lijn)/;

  if (isBorgingJaar && borgingPattern.test(f)) return "borging";

  // Piek-jaren: Realisatie / Acceptatie / Pilot / Basis(training) / Uitrol / Adoptie / Go-live / Toepassing / Rolmodelgedrag
  if (/realisatie/.test(f)) return "piek";
  if (/acceptatie/.test(f)) return "piek";
  if (/pilot/.test(f)) return "piek";
  if (/basistraining/.test(f)) return "piek"; // is ook trainings_basis (dubbel-gebruik: kernteam blijft pieken in dat jaar)
  if (/vaardigheid/.test(f)) return "piek";
  if (/uitrol/.test(f) && !borgingPattern.test(f)) return "piek";
  if (/^adoptie/.test(f)) return "piek";
  if (/go-live/.test(f)) return "piek";
  if (/toepassing/.test(f)) return "piek";
  if (/rolmodelgedrag/.test(f)) return "piek";

  // Reservering / Onvoorzien — nvt voor uren-toedeling
  if (/reservering|onvoorzien/.test(f)) return "geen";

  // Borging-fase maar in vroeg jaar (korte scenario's): tellen als niet-piek
  if (borgingPattern.test(f)) return "niet_piek";

  // Rest: niet-piek (Analyse, Behoeftestelling, Curriculum, Bewustwording, Coalitie, Urgentie, Leverancier, Herontwerp, Inventarisatie)
  return "niet_piek";
}

// helper: jaar in piek-realisatie (voor geconsulteerd: 3u in eerste piek-jaar)
function isFirstPiekJaar(faseTypes: FaseType[], idx: number): boolean {
  // first jaarIndex with type 'piek'
  const firstPiek = faseTypes.findIndex((t) => t === "piek");
  return firstPiek !== -1 && idx === firstPiek;
}
function isSecondPiekJaar(faseTypes: FaseType[], idx: number): boolean {
  const piekJaren = faseTypes
    .map((t, i) => (t === "piek" ? i : -1))
    .filter((i) => i !== -1);
  if (piekJaren.length < 2) {
    // fallback: laatste piek of laatste jaar
    return idx === piekJaren[piekJaren.length - 1];
  }
  return idx === piekJaren[1];
}

// ---------- per-domein classificatie van rollen ----------

// MENS — 78 personen ná int_zak verwijderen (was 80, -2 = 78)
// Inspanningsleider (1): Yara
// Kernteam (5): 2 senior trainers + teamleider_trainingen + manager_klantcontact + sectormanager_po
// Trainings-deelnemers (47): accountmanager_c (7) + accountmanager_c_prof (5) + mdw_binnendienst_b (7) + klantenservice_c (28)
// Geconsulteerd (rest, ~25)
function classifyMensRollen(): RolKlassificatie[] {
  const rollen: RolKlassificatie[] = [];

  // Inspanningsleider: Yara (custom-yara-mens-leider, 1 persoon)
  rollen.push({
    functieId: "custom-yara-mens-leider",
    functieNaam: FUNCTIENAAM_MAP["custom-yara-mens-leider"],
    afdeling: AFDELING_MAP["custom-yara-mens-leider"],
    aantal: 1,
    categorie: "inspanningsleider",
  });

  // Kernteam (5):
  // - 2 senior Trainer/Adviseur A — splitsen in trainer_adviseur_a_senior_kernteam (2) + trainer_adviseur_a (10 geconsulteerd)
  rollen.push({
    functieId: "trainer_adviseur_a_senior_kernteam",
    functieNaam: "Trainer/Adviseur A (senior kernteam)",
    afdeling: "Trainingen",
    aantal: 2,
    categorie: "kernteam",
  });
  rollen.push({
    functieId: "teamleider_trainingen",
    functieNaam: FUNCTIENAAM_MAP.teamleider_trainingen,
    afdeling: AFDELING_MAP.teamleider_trainingen,
    aantal: 1,
    categorie: "kernteam",
  });
  rollen.push({
    functieId: "manager_klantcontact",
    functieNaam: FUNCTIENAAM_MAP.manager_klantcontact,
    afdeling: AFDELING_MAP.manager_klantcontact,
    aantal: 1,
    categorie: "kernteam",
  });
  rollen.push({
    functieId: "sectormanager_po",
    functieNaam: FUNCTIENAAM_MAP.sectormanager_po,
    afdeling: AFDELING_MAP.sectormanager_po,
    aantal: 1,
    categorie: "kernteam",
  });

  // Trainings-deelnemers (47):
  rollen.push({
    functieId: "accountmanager_c",
    functieNaam: FUNCTIENAAM_MAP.accountmanager_c,
    afdeling: AFDELING_MAP.accountmanager_c,
    aantal: 7,
    categorie: "trainings_deelnemer",
  });
  rollen.push({
    functieId: "accountmanager_c_prof",
    functieNaam: FUNCTIENAAM_MAP.accountmanager_c_prof,
    afdeling: AFDELING_MAP.accountmanager_c_prof,
    aantal: 5,
    categorie: "trainings_deelnemer",
  });
  rollen.push({
    functieId: "mdw_binnendienst_b",
    functieNaam: FUNCTIENAAM_MAP.mdw_binnendienst_b,
    afdeling: AFDELING_MAP.mdw_binnendienst_b,
    aantal: 7,
    categorie: "trainings_deelnemer",
  });
  rollen.push({
    functieId: "klantenservice_c",
    functieNaam: FUNCTIENAAM_MAP.klantenservice_c,
    afdeling: AFDELING_MAP.klantenservice_c,
    aantal: 28,
    categorie: "trainings_deelnemer",
  });

  // Geconsulteerd (~25):
  // 10 trainers (12 - 2 senior)
  rollen.push({
    functieId: "trainer_adviseur_a",
    functieNaam: FUNCTIENAAM_MAP.trainer_adviseur_a,
    afdeling: AFDELING_MAP.trainer_adviseur_a,
    aantal: 10,
    categorie: "geconsulteerd",
  });
  // 2 sectormanagers (sectormanager_vo + sectormanager_prof) — sectormanager_po is al kernteam
  rollen.push({
    functieId: "sectormanager_vo",
    functieNaam: FUNCTIENAAM_MAP.sectormanager_vo,
    afdeling: AFDELING_MAP.sectormanager_vo,
    aantal: 1,
    categorie: "geconsulteerd",
  });
  rollen.push({
    functieId: "sectormanager_prof",
    functieNaam: FUNCTIENAAM_MAP.sectormanager_prof,
    afdeling: AFDELING_MAP.sectormanager_prof,
    aantal: 1,
    categorie: "geconsulteerd",
  });
  // Productmanagers (na int_zak verwijderen): productmanager_dst (3) + productmanager_klt (2)
  rollen.push({
    functieId: "productmanager_dst",
    functieNaam: FUNCTIENAAM_MAP.productmanager_dst,
    afdeling: AFDELING_MAP.productmanager_dst,
    aantal: 3,
    categorie: "geconsulteerd",
  });
  rollen.push({
    functieId: "productmanager_klt",
    functieNaam: FUNCTIENAAM_MAP.productmanager_klt,
    afdeling: AFDELING_MAP.productmanager_klt,
    aantal: 2,
    categorie: "geconsulteerd",
  });
  // Marketeers (3): campagne_marketeer_a + campagne_marketeer_b + junior_marketeer_prof
  rollen.push({
    functieId: "campagne_marketeer_a",
    functieNaam: FUNCTIENAAM_MAP.campagne_marketeer_a,
    afdeling: AFDELING_MAP.campagne_marketeer_a,
    aantal: 1,
    categorie: "geconsulteerd",
  });
  rollen.push({
    functieId: "campagne_marketeer_b",
    functieNaam: FUNCTIENAAM_MAP.campagne_marketeer_b,
    afdeling: AFDELING_MAP.campagne_marketeer_b,
    aantal: 1,
    categorie: "geconsulteerd",
  });
  rollen.push({
    functieId: "junior_marketeer_prof",
    functieNaam: FUNCTIENAAM_MAP.junior_marketeer_prof,
    afdeling: AFDELING_MAP.junior_marketeer_prof,
    aantal: 1,
    categorie: "geconsulteerd",
  });
  // Ad hoc trainees (4): accountmanager_a + accountmanager_b + klantenservice_a + klantenservice_b
  rollen.push({
    functieId: "accountmanager_a",
    functieNaam: FUNCTIENAAM_MAP.accountmanager_a,
    afdeling: AFDELING_MAP.accountmanager_a,
    aantal: 1,
    categorie: "geconsulteerd",
  });
  rollen.push({
    functieId: "accountmanager_b",
    functieNaam: FUNCTIENAAM_MAP.accountmanager_b,
    afdeling: AFDELING_MAP.accountmanager_b,
    aantal: 1,
    categorie: "geconsulteerd",
  });
  rollen.push({
    functieId: "klantenservice_a",
    functieNaam: FUNCTIENAAM_MAP.klantenservice_a,
    afdeling: AFDELING_MAP.klantenservice_a,
    aantal: 1,
    categorie: "geconsulteerd",
  });
  rollen.push({
    functieId: "klantenservice_b",
    functieNaam: FUNCTIENAAM_MAP.klantenservice_b,
    afdeling: AFDELING_MAP.klantenservice_b,
    aantal: 1,
    categorie: "geconsulteerd",
  });
  // teamleider_klantenservice + mdw_binnendienst_a
  rollen.push({
    functieId: "teamleider_klantenservice",
    functieNaam: FUNCTIENAAM_MAP.teamleider_klantenservice,
    afdeling: AFDELING_MAP.teamleider_klantenservice,
    aantal: 1,
    categorie: "geconsulteerd",
  });
  rollen.push({
    functieId: "mdw_binnendienst_a",
    functieNaam: FUNCTIENAAM_MAP.mdw_binnendienst_a,
    afdeling: AFDELING_MAP.mdw_binnendienst_a,
    aantal: 1,
    categorie: "geconsulteerd",
  });

  return rollen;
}

// DATA_SYSTEMEN — 38 personen (na int_zak verwijderen, was 39, -1 = 38) + 1 leider = 39
// Inspanningsleider (1): Sven
// Kernteam (7): Manager DT + Projectmanager D + Procesmanager K&M + 2 productowners + Business Info Analist C + Content Specialist
// Geconsulteerd (rest, ~30)
function classifyDataRollen(): RolKlassificatie[] {
  const rollen: RolKlassificatie[] = [];

  // Inspanningsleider: Sven
  rollen.push({
    functieId: "custom-sven-data-leider",
    functieNaam: FUNCTIENAAM_MAP["custom-sven-data-leider"],
    afdeling: AFDELING_MAP["custom-sven-data-leider"],
    aantal: 1,
    categorie: "inspanningsleider",
  });

  // Kernteam (7)
  for (const fid of [
    "manager_dt",
    "projectmanager_d",
    "procesmanager_data",
    "productowner_a_website",
    "productowner_b_producten",
    "business_info_analist_c",
    "content_specialist",
  ]) {
    rollen.push({
      functieId: fid,
      functieNaam: FUNCTIENAAM_MAP[fid],
      afdeling: AFDELING_MAP[fid],
      aantal: 1,
      categorie: "kernteam",
    });
  }

  // Geconsulteerd (~30)
  // 3 sectormanagers
  for (const fid of ["sectormanager_po", "sectormanager_vo", "sectormanager_prof"]) {
    rollen.push({
      functieId: fid,
      functieNaam: FUNCTIENAAM_MAP[fid],
      afdeling: AFDELING_MAP[fid],
      aantal: 1,
      categorie: "geconsulteerd",
    });
  }
  // 7 productmanagers (excl. int_zak): kib (1) + klt (1) + lib (1) + nt2 (1) + cvvo (1) + dst (2) = 7
  rollen.push({ functieId: "productmanager_kib", functieNaam: FUNCTIENAAM_MAP.productmanager_kib, afdeling: AFDELING_MAP.productmanager_kib, aantal: 1, categorie: "geconsulteerd" });
  rollen.push({ functieId: "productmanager_klt", functieNaam: FUNCTIENAAM_MAP.productmanager_klt, afdeling: AFDELING_MAP.productmanager_klt, aantal: 1, categorie: "geconsulteerd" });
  rollen.push({ functieId: "productmanager_lib", functieNaam: FUNCTIENAAM_MAP.productmanager_lib, afdeling: AFDELING_MAP.productmanager_lib, aantal: 1, categorie: "geconsulteerd" });
  rollen.push({ functieId: "productmanager_nt2", functieNaam: FUNCTIENAAM_MAP.productmanager_nt2, afdeling: AFDELING_MAP.productmanager_nt2, aantal: 1, categorie: "geconsulteerd" });
  rollen.push({ functieId: "productmanager_cvvo", functieNaam: FUNCTIENAAM_MAP.productmanager_cvvo, afdeling: AFDELING_MAP.productmanager_cvvo, aantal: 1, categorie: "geconsulteerd" });
  rollen.push({ functieId: "productmanager_dst", functieNaam: FUNCTIENAAM_MAP.productmanager_dst, afdeling: AFDELING_MAP.productmanager_dst, aantal: 2, categorie: "geconsulteerd" });
  // 12 trainer_adviseur_a
  rollen.push({ functieId: "trainer_adviseur_a", functieNaam: FUNCTIENAAM_MAP.trainer_adviseur_a, afdeling: AFDELING_MAP.trainer_adviseur_a, aantal: 12, categorie: "geconsulteerd" });
  // 3 marketeers
  rollen.push({ functieId: "campagne_marketeer_a", functieNaam: FUNCTIENAAM_MAP.campagne_marketeer_a, afdeling: AFDELING_MAP.campagne_marketeer_a, aantal: 1, categorie: "geconsulteerd" });
  rollen.push({ functieId: "campagne_marketeer_b", functieNaam: FUNCTIENAAM_MAP.campagne_marketeer_b, afdeling: AFDELING_MAP.campagne_marketeer_b, aantal: 1, categorie: "geconsulteerd" });
  rollen.push({ functieId: "junior_marketeer_prof", functieNaam: FUNCTIENAAM_MAP.junior_marketeer_prof, afdeling: AFDELING_MAP.junior_marketeer_prof, aantal: 1, categorie: "geconsulteerd" });
  // manager_klantcontact (1)
  rollen.push({ functieId: "manager_klantcontact", functieNaam: FUNCTIENAAM_MAP.manager_klantcontact, afdeling: AFDELING_MAP.manager_klantcontact, aantal: 1, categorie: "geconsulteerd" });
  // 3 accountmanager_c_prof
  rollen.push({ functieId: "accountmanager_c_prof", functieNaam: FUNCTIENAAM_MAP.accountmanager_c_prof, afdeling: AFDELING_MAP.accountmanager_c_prof, aantal: 3, categorie: "geconsulteerd" });
  // 1 mdw_binnendienst_a_prof
  rollen.push({ functieId: "mdw_binnendienst_a_prof", functieNaam: FUNCTIENAAM_MAP.mdw_binnendienst_a_prof, afdeling: AFDELING_MAP.mdw_binnendienst_a_prof, aantal: 1, categorie: "geconsulteerd" });
  // 1 teamleider_trainingen
  rollen.push({ functieId: "teamleider_trainingen", functieNaam: FUNCTIENAAM_MAP.teamleider_trainingen, afdeling: AFDELING_MAP.teamleider_trainingen, aantal: 1, categorie: "geconsulteerd" });

  return rollen;
}

// CULTUUR — 9 personen
// Inspanningsleider (1): Yara (custom-1777458764027-8mxzp)
// Kernteam (8): alle 8 overige (Directeur BV, Manager DT, sectormanagers PO/VO/Prof, Manager Klantcontact, Teamleider PS) — N.B. dat is 7. We voegen ook 1 ontbrekende rol toe.
//   Brief noemt: 8 = Directeur BV (1) + Manager DT (1) + sectormanagers PO/VO/Prof (3) + Manager Klantcontact (1) + Teamleider PS (1) = 7.
//   Maar het bestaande veld bevat ook custom-1777458764027-8mxzp met aantal=2 (twee HR-medewerkers).
//   We volgen de brief: Yara = 1 leider; rest 8 kernteam → alle bestaande 8 (incl. de 7 uit selectie + 1 extra HR-medewerker).
// We splitsen custom HR rol in: yara_cultuur_leider (1) + hr_medewerker_kernteam (1)
function classifyCultuurRollen(): RolKlassificatie[] {
  const rollen: RolKlassificatie[] = [];

  // Inspanningsleider: Yara — hergebruik custom-1777458764027-8mxzp met aantal 1 én label
  rollen.push({
    functieId: "custom-1777458764027-8mxzp_leider",
    functieNaam: "Yara — HR-manager (inspanningsleider Cultuur)",
    afdeling: "HR",
    aantal: 1,
    categorie: "inspanningsleider",
  });
  // Kernteam (8): tweede HR-medewerker + Directeur BV + Manager DT + 3 sectormanagers + Manager Klantcontact + Teamleider PS
  rollen.push({
    functieId: "custom-1777458764027-8mxzp_kernteam",
    functieNaam: "HR-medewerker (kernteam Cultuur)",
    afdeling: "HR",
    aantal: 1,
    categorie: "kernteam",
  });
  rollen.push({ functieId: "directeur_bv", functieNaam: FUNCTIENAAM_MAP.directeur_bv, afdeling: AFDELING_MAP.directeur_bv, aantal: 1, categorie: "kernteam" });
  rollen.push({ functieId: "manager_dt", functieNaam: FUNCTIENAAM_MAP.manager_dt, afdeling: AFDELING_MAP.manager_dt, aantal: 1, categorie: "kernteam" });
  rollen.push({ functieId: "sectormanager_po", functieNaam: FUNCTIENAAM_MAP.sectormanager_po, afdeling: AFDELING_MAP.sectormanager_po, aantal: 1, categorie: "kernteam" });
  rollen.push({ functieId: "sectormanager_vo", functieNaam: FUNCTIENAAM_MAP.sectormanager_vo, afdeling: AFDELING_MAP.sectormanager_vo, aantal: 1, categorie: "kernteam" });
  rollen.push({ functieId: "sectormanager_prof", functieNaam: FUNCTIENAAM_MAP.sectormanager_prof, afdeling: AFDELING_MAP.sectormanager_prof, aantal: 1, categorie: "kernteam" });
  rollen.push({ functieId: "manager_klantcontact", functieNaam: FUNCTIENAAM_MAP.manager_klantcontact, afdeling: AFDELING_MAP.manager_klantcontact, aantal: 1, categorie: "kernteam" });
  rollen.push({ functieId: "teamleider_ps", functieNaam: FUNCTIENAAM_MAP.teamleider_ps, afdeling: AFDELING_MAP.teamleider_ps, aantal: 1, categorie: "kernteam" });

  return rollen;
}

// PROCESSEN — 5 + 1 placeholder = 6 personen
// Inspanningsleider TBD (1): custom-inspanningsleider-processen-tbd
// Kernteam (5): procesmanager_data + projectmanager_d + procesondersteuner_po + procesondersteuner_vo + custom (procesondersteuner_prof)
function classifyProcessenRollen(): RolKlassificatie[] {
  const rollen: RolKlassificatie[] = [];

  rollen.push({
    functieId: "custom-inspanningsleider-processen-tbd",
    functieNaam: FUNCTIENAAM_MAP["custom-inspanningsleider-processen-tbd"],
    afdeling: AFDELING_MAP["custom-inspanningsleider-processen-tbd"],
    aantal: 1,
    categorie: "inspanningsleider",
  });
  rollen.push({ functieId: "procesmanager_data", functieNaam: FUNCTIENAAM_MAP.procesmanager_data, afdeling: AFDELING_MAP.procesmanager_data, aantal: 1, categorie: "kernteam" });
  rollen.push({ functieId: "projectmanager_d", functieNaam: FUNCTIENAAM_MAP.projectmanager_d, afdeling: AFDELING_MAP.projectmanager_d, aantal: 1, categorie: "kernteam" });
  rollen.push({ functieId: "procesondersteuner_po", functieNaam: FUNCTIENAAM_MAP.procesondersteuner_po, afdeling: AFDELING_MAP.procesondersteuner_po, aantal: 1, categorie: "kernteam" });
  rollen.push({ functieId: "procesondersteuner_vo", functieNaam: FUNCTIENAAM_MAP.procesondersteuner_vo, afdeling: AFDELING_MAP.procesondersteuner_vo, aantal: 1, categorie: "kernteam" });
  rollen.push({ functieId: "custom-1777459472792-own3u", functieNaam: FUNCTIENAAM_MAP["custom-1777459472792-own3u"], afdeling: AFDELING_MAP["custom-1777459472792-own3u"], aantal: 1, categorie: "kernteam" });

  return rollen;
}

// ---------- uren-berekening per rol per scenario ----------

// Bepaal jaar-uren voor een rol-klassificatie gegeven faseTypes per jaar
function urenPerJaarVoorRol(
  rol: RolKlassificatie,
  faseTypes: FaseType[],
): number[] {
  const aantalJaren = faseTypes.length;
  const uren = new Array(aantalJaren).fill(0);

  if (rol.categorie === "inspanningsleider" || rol.categorie === "kernteam") {
    const lvl = rol.categorie === "inspanningsleider" ? "inspanningsleider" : "kernteam";
    for (let i = 0; i < aantalJaren; i++) {
      const t = faseTypes[i];
      if (t === "geen") continue;
      if (t === "borging") uren[i] = UREN_BORGING[lvl];
      else if (t === "piek" || t === "trainings_basis" || t === "trainings_vaardigheid") {
        uren[i] = UREN_PIEK[lvl];
      } else {
        uren[i] = UREN_NIET_PIEK[lvl];
      }
    }
  } else if (rol.categorie === "trainings_deelnemer") {
    // 24u in trainings_basis-jaar + 22u in trainings_vaardigheid-jaar
    for (let i = 0; i < aantalJaren; i++) {
      const t = faseTypes[i];
      if (t === "trainings_basis") uren[i] = UREN_TRAININGS_BASIS;
      else if (t === "trainings_vaardigheid") uren[i] = UREN_TRAININGS_VAARDIGHEID;
    }
    // Als geen 'trainings_basis' fase gevonden: gebruik eerste piek als basis
    const heeftBasis = faseTypes.some((t) => t === "trainings_basis");
    const heeftVaard = faseTypes.some((t) => t === "trainings_vaardigheid");
    if (!heeftBasis || !heeftVaard) {
      // fallback: piek-jaren krijgen verdeling 24/22
      const piekIdx = faseTypes
        .map((t, i) => (t === "piek" || t === "trainings_basis" || t === "trainings_vaardigheid" ? i : -1))
        .filter((i) => i !== -1);
      if (piekIdx.length >= 2 && !heeftBasis && !heeftVaard) {
        uren[piekIdx[0]] = UREN_TRAININGS_BASIS;
        uren[piekIdx[1]] = UREN_TRAININGS_VAARDIGHEID;
      } else if (piekIdx.length === 1) {
        uren[piekIdx[0]] = UREN_TRAININGS_BASIS + UREN_TRAININGS_VAARDIGHEID;
      }
    }
  } else if (rol.categorie === "geconsulteerd") {
    // 6u totaal: 3u in eerste piek-jaar + 3u in tweede piek-jaar (Acceptatie)
    // Voor mens-context: 3u in trainings_basis + 3u in verankering/borging
    const piekIdx = faseTypes
      .map((t, i) => (t === "piek" || t === "trainings_basis" || t === "trainings_vaardigheid" ? i : -1))
      .filter((i) => i !== -1);
    if (piekIdx.length >= 2) {
      uren[piekIdx[0]] = 3;
      uren[piekIdx[1]] = 3;
    } else if (piekIdx.length === 1) {
      uren[piekIdx[0]] = UREN_GECONSULTEERD_TOTAAL;
    } else {
      // verdeel over 2 middelste jaren
      const mid = Math.floor(aantalJaren / 2);
      uren[Math.max(0, mid - 1)] = 3;
      uren[Math.min(aantalJaren - 1, mid)] = 3;
    }
  }

  return uren;
}

// ---------- main ----------

async function main() {
  const { data, error } = await supa
    .from("din_sessions")
    .select("data, updated_at")
    .eq("id", SESSION_ID)
    .maybeSingle();
  if (error) throw error;
  if (!data) throw new Error("NO DATA");

  const root: any = data.data;

  // Idempotency-check
  const s7 = root?.crossAnalyseWizard?.stepResults?.stap4?.stap7InterneUren;
  if (!s7) throw new Error("stap7InterneUren niet gevonden");
  if (s7.lezingCDoorgevoerd === true) {
    console.log("[idempotent] lezingCDoorgevoerd is al true; niets te doen.");
    process.exit(0);
  }

  // Backup
  const backupDir = "c:/tmp";
  if (!existsSync(backupDir)) mkdirSync(backupDir, { recursive: true });
  const ts = new Date().toISOString().replace(/[:.]/g, "-");
  writeFileSync(
    `${backupDir}/session-d8b97442-pre-lezingC-${ts}.json`,
    JSON.stringify(root, null, 2),
    "utf-8",
  );
  console.log(`[backup] saved to ${backupDir}/session-d8b97442-pre-lezingC-${ts}.json`);

  // Capture pre-totalen
  const prePerScenarioPerDomein: Record<string, Record<string, number>> = {};
  const ba = root.crossAnalyseWizard.stepResults.stap4.begrotingAdvies;
  for (const k of Object.keys(s7.scenarios ?? {})) {
    const sc = s7.scenarios[k];
    if (!sc) continue;
    prePerScenarioPerDomein[k] = {};
    for (const idx of Object.keys(sc.domeinen ?? {})) {
      const d = sc.domeinen[idx];
      prePerScenarioPerDomein[k][d.domein] = d.uren ?? d.totaalUren ?? 0;
    }
  }

  // ===== STAP 1: Cleanup int_zak =====
  console.log("\n[stap 1] Cleanup productmanager_int_zak...");
  // selectiePerDomein
  if (s7.selectiePerDomein?.mens?.productmanager_int_zak) {
    delete s7.selectiePerDomein.mens.productmanager_int_zak;
    console.log("  - removed selectiePerDomein.mens.productmanager_int_zak");
  }
  if (s7.selectiePerDomein?.data_systemen?.productmanager_int_zak) {
    delete s7.selectiePerDomein.data_systemen.productmanager_int_zak;
    console.log("  - removed selectiePerDomein.data_systemen.productmanager_int_zak");
  }
  // vastgesteldeUrenPerInspanning
  for (const idx of Object.keys(s7.vastgesteldeUrenPerInspanning ?? {})) {
    const entry = s7.vastgesteldeUrenPerInspanning[idx];
    if (!entry?.rollen) continue;
    const before = entry.rollen.length;
    entry.rollen = entry.rollen.filter((r: any) => r.functieId !== "productmanager_int_zak");
    if (entry.rollen.length < before) {
      console.log(`  - removed productmanager_int_zak from vUPI[${idx}] (${entry.domein})`);
    }
  }

  // ===== STAP 2: Trojka procesconsultants vervangen door 1 placeholder =====
  console.log("\n[stap 2] Trojka procesconsultants vervangen...");
  if (root.programmaorganisatie?.kerngroep) {
    const before = root.programmaorganisatie.kerngroep.length;
    root.programmaorganisatie.kerngroep = root.programmaorganisatie.kerngroep.filter(
      (m: any) => !["Procesconsultant PO", "Procesconsultant VO", "Procesconsultant Zakelijk"].includes(m.naam),
    );
    const after = root.programmaorganisatie.kerngroep.length;
    console.log(`  - removed ${before - after} trojka-entries`);
    // Voeg 1 placeholder toe (idempotent)
    const exists = root.programmaorganisatie.kerngroep.some(
      (m: any) => m.naam === "TBD" && m.functie === "Inspanningsleider Processen",
    );
    if (!exists) {
      root.programmaorganisatie.kerngroep.push({
        id: crypto.randomUUID(),
        naam: "TBD",
        functie: "Inspanningsleider Processen",
        inspanning: "Processen",
        rol: "Inspanningsleider",
        sector: "Programmabreed",
        mandaat: "Trekt de cross-sectorale Processen-bundel; naam nog te benoemen.",
        toelichting: "Mogelijk Projectmanager D of andere kandidaat — beslissing in stuurgroep nog te nemen.",
      });
      console.log("  - added TBD-placeholder Inspanningsleider Processen");
    }
  }

  // ===== STAP 3a: selectiePerDomein bijwerken voor nieuwe leiders/placeholders =====
  console.log("\n[stap 3a] selectiePerDomein leiders/placeholders toevoegen...");
  // Yara mens-leider: nieuwe entry, en sectormanager_po blijft (nu in mens-kernteam)
  if (!s7.selectiePerDomein.mens["custom-yara-mens-leider"]) {
    s7.selectiePerDomein.mens["custom-yara-mens-leider"] = {
      aantal: 1,
      functieNaam: FUNCTIENAAM_MAP["custom-yara-mens-leider"],
    };
    console.log("  - added selectiePerDomein.mens.custom-yara-mens-leider (1)");
  }
  // Sven data-leider
  if (!s7.selectiePerDomein.data_systemen["custom-sven-data-leider"]) {
    s7.selectiePerDomein.data_systemen["custom-sven-data-leider"] = {
      aantal: 1,
      functieNaam: FUNCTIENAAM_MAP["custom-sven-data-leider"],
    };
    console.log("  - added selectiePerDomein.data_systemen.custom-sven-data-leider (1)");
  }
  // Placeholder-leider processen
  if (!s7.selectiePerDomein.processen["custom-inspanningsleider-processen-tbd"]) {
    s7.selectiePerDomein.processen["custom-inspanningsleider-processen-tbd"] = {
      aantal: 1,
      functieNaam: FUNCTIENAAM_MAP["custom-inspanningsleider-processen-tbd"],
      placeholderTBD: true,
      tbdToelichting: "Mogelijk Projectmanager D of andere kandidaat — beslissing in stuurgroep nog te nemen",
    };
    console.log("  - added selectiePerDomein.processen.custom-inspanningsleider-processen-tbd (1)");
  }
  // Cultuur Yara: hergebruik custom-1777458764027-8mxzp (was 2 personen)
  // Splitsen in _leider (1) + _kernteam (1)
  if (s7.selectiePerDomein.cultuur["custom-1777458764027-8mxzp"]) {
    delete s7.selectiePerDomein.cultuur["custom-1777458764027-8mxzp"];
  }
  s7.selectiePerDomein.cultuur["custom-1777458764027-8mxzp_leider"] = {
    aantal: 1,
    functieNaam: "Yara — HR-manager (inspanningsleider Cultuur)",
  };
  s7.selectiePerDomein.cultuur["custom-1777458764027-8mxzp_kernteam"] = {
    aantal: 1,
    functieNaam: "HR-medewerker (kernteam Cultuur)",
  };
  console.log("  - cultuur HR-rol gesplitst in _leider (1) + _kernteam (1)");

  // Mens: trainer_adviseur_a (12) splitsen in senior_kernteam (2) + restende geconsulteerd (10)
  if (s7.selectiePerDomein.mens.trainer_adviseur_a) {
    s7.selectiePerDomein.mens.trainer_adviseur_a = {
      ...(s7.selectiePerDomein.mens.trainer_adviseur_a ?? {}),
      aantal: 10,
      functieNaam: FUNCTIENAAM_MAP.trainer_adviseur_a,
    };
  }
  s7.selectiePerDomein.mens.trainer_adviseur_a_senior_kernteam = {
    aantal: 2,
    functieNaam: "Trainer/Adviseur A (senior kernteam)",
  };
  console.log("  - mens trainer_adviseur_a gesplitst in 10 (geconsulteerd) + 2 senior_kernteam");

  // ===== STAP 3b: customFunctiesPerDomein bijwerken =====
  console.log("\n[stap 3b] customFunctiesPerDomein bijwerken...");
  s7.customFunctiesPerDomein = s7.customFunctiesPerDomein ?? {};
  for (const dom of ["mens", "processen", "data_systemen", "cultuur"]) {
    s7.customFunctiesPerDomein[dom] = s7.customFunctiesPerDomein[dom] ?? [];
  }
  // Mens leider
  if (!s7.customFunctiesPerDomein.mens.find((c: any) => c.id === "custom-yara-mens-leider")) {
    s7.customFunctiesPerDomein.mens.push({
      id: "custom-yara-mens-leider",
      naam: FUNCTIENAAM_MAP["custom-yara-mens-leider"],
    });
  }
  // Data leider
  if (!s7.customFunctiesPerDomein.data_systemen.find((c: any) => c.id === "custom-sven-data-leider")) {
    s7.customFunctiesPerDomein.data_systemen.push({
      id: "custom-sven-data-leider",
      naam: FUNCTIENAAM_MAP["custom-sven-data-leider"],
    });
  }
  // Processen placeholder-leider
  if (!s7.customFunctiesPerDomein.processen.find((c: any) => c.id === "custom-inspanningsleider-processen-tbd")) {
    s7.customFunctiesPerDomein.processen.push({
      id: "custom-inspanningsleider-processen-tbd",
      naam: FUNCTIENAAM_MAP["custom-inspanningsleider-processen-tbd"],
    });
  }
  // Cultuur split
  s7.customFunctiesPerDomein.cultuur = (s7.customFunctiesPerDomein.cultuur ?? []).filter(
    (c: any) => c.id !== "custom-1777458764027-8mxzp",
  );
  if (!s7.customFunctiesPerDomein.cultuur.find((c: any) => c.id === "custom-1777458764027-8mxzp_leider")) {
    s7.customFunctiesPerDomein.cultuur.push({
      id: "custom-1777458764027-8mxzp_leider",
      naam: "Yara — HR-manager (inspanningsleider Cultuur)",
    });
  }
  if (!s7.customFunctiesPerDomein.cultuur.find((c: any) => c.id === "custom-1777458764027-8mxzp_kernteam")) {
    s7.customFunctiesPerDomein.cultuur.push({
      id: "custom-1777458764027-8mxzp_kernteam",
      naam: "HR-medewerker (kernteam Cultuur)",
    });
  }

  // ===== STAP 3c: Klassifceer rollen per domein =====
  const rollenPerDomein: Record<Domein, RolKlassificatie[]> = {
    mens: classifyMensRollen(),
    data_systemen: classifyDataRollen(),
    cultuur: classifyCultuurRollen(),
    processen: classifyProcessenRollen(),
  };

  // ===== STAP 3d: vastgesteldeUrenPerInspanning herrekenen =====
  console.log("\n[stap 3d] vastgesteldeUrenPerInspanning herrekenen (Lezing C)...");

  // Build a base scenario fase-classificatie via 'advies' (4 jaar) — voor uren-totaal
  // We baseren totaal-uren per rol op het advies-scenario (4 jaar, geen borgingsjaren)
  function adviesFaseTypesVoorDomein(domein: string): FaseType[] {
    const sc = ba.scenarios.advies;
    const ins = (sc.inspanningen ?? []).find((i: any) => i.domein === domein);
    if (!ins) return [];
    const jaren = ins.verdelingPerJaar ?? [];
    return jaren.map((v: any, idx: number) =>
      classifyFase(v.fase, idx, sc.aantalJaren, domein),
    );
  }

  // Determine which numeric key corresponds to which domein in vastgesteldeUrenPerInspanning
  const idxPerDomein: Record<string, string> = {};
  for (const idx of Object.keys(s7.vastgesteldeUrenPerInspanning)) {
    const entry = s7.vastgesteldeUrenPerInspanning[idx];
    if (entry?.domein) idxPerDomein[entry.domein] = idx;
  }
  // If a domein is missing, find first free key
  function ensureIdx(domein: string): string {
    if (idxPerDomein[domein]) return idxPerDomein[domein];
    let n = 0;
    while (s7.vastgesteldeUrenPerInspanning[String(n)]) n++;
    const k = String(n);
    s7.vastgesteldeUrenPerInspanning[k] = { domein, rollen: [] };
    idxPerDomein[domein] = k;
    return k;
  }

  for (const dom of ["mens", "data_systemen", "cultuur", "processen"] as Domein[]) {
    const faseTypes = adviesFaseTypesVoorDomein(dom);
    const klass = rollenPerDomein[dom];
    const k = ensureIdx(dom);
    const newRollen: any[] = [];
    for (const r of klass) {
      const urenPerJaar = urenPerJaarVoorRol(r, faseTypes);
      const totaalPerPersoon = urenPerJaar.reduce((s, u) => s + u, 0);
      const totaal = totaalPerPersoon * r.aantal;
      newRollen.push({
        functieId: r.functieId,
        functieNaam: r.functieNaam,
        afdeling: r.afdeling,
        urenTotaal: totaal,
        aantal: r.aantal,
        categorie: r.categorie,
        onderbouwing: `Lezing C — ${r.categorie}: ${r.aantal} persoon/personen × ${totaalPerPersoon}u (advies-scenario, 4 jaar). Per jaar: ${urenPerJaar.join("+")}u. Niveaus: piek ${r.categorie === "inspanningsleider" ? UREN_PIEK.inspanningsleider : r.categorie === "kernteam" ? UREN_PIEK.kernteam : "—"}u, niet-piek ${r.categorie === "inspanningsleider" ? UREN_NIET_PIEK.inspanningsleider : r.categorie === "kernteam" ? UREN_NIET_PIEK.kernteam : "—"}u.`,
      });
    }
    s7.vastgesteldeUrenPerInspanning[k] = {
      domein: dom,
      rollen: newRollen,
    };
    console.log(`  - vUPI[${k}] (${dom}): ${newRollen.length} rollen, totaal ${newRollen.reduce((s, r) => s + r.urenTotaal, 0)}u`);
  }

  // ===== STAP 3e: scenarios[].domeinen[].jaren[].rollen[] herrekenen =====
  console.log("\n[stap 3e] scenarios[].domeinen[].jaren[].rollen[] herrekenen...");
  const tarief = s7.uurtariefSettings?.basisTarief ?? 70;
  const indexatie = s7.uurtariefSettings?.indexatiePercentage ?? 0.05;
  const refJaar = s7.uurtariefSettings?.referentiejaar ?? 2025;
  function tariefVoorJaar(jaar: number): number {
    const jrDelta = jaar - refJaar;
    return Math.round(tarief * Math.pow(1 + indexatie, jrDelta));
  }

  for (const skey of Object.keys(s7.scenarios ?? {})) {
    const sc = s7.scenarios[skey];
    if (!sc) continue;
    const baSc = ba.scenarios[skey];
    if (!baSc) continue;

    // For each domein in this scenario, recompute jaren[].rollen[]
    for (const idx of Object.keys(sc.domeinen ?? {})) {
      const dEntry = sc.domeinen[idx];
      const dom = dEntry.domein as Domein;
      if (!["mens", "data_systemen", "cultuur", "processen"].includes(dom)) continue;

      // Find the matching inspanning in begrotingAdvies for this scenario+domein
      const ins = (baSc.inspanningen ?? []).find((i: any) => i.domein === dom);
      if (!ins) {
        console.warn(`  ! [${skey}.${dom}] geen begrotingAdvies-inspanning gevonden`);
        continue;
      }
      const verdJaar = ins.verdelingPerJaar ?? [];
      const aantalJaren = baSc.aantalJaren ?? verdJaar.length;
      // Classify per jaar
      const faseTypes: FaseType[] = verdJaar.map((v: any, i: number) =>
        classifyFase(v.fase, i, aantalJaren, dom),
      );
      const jaren: number[] = verdJaar.map((v: any) => v.jaar);

      const klass = rollenPerDomein[dom];

      // Build new jaren-array
      const newJaren = jaren.map((jr) => ({
        jaar: jr,
        rollen: [] as any[],
      }));

      let domeinTotaalUren = 0;
      let domeinTotaalKosten = 0;

      for (const r of klass) {
        const urenPerJaar = urenPerJaarVoorRol(r, faseTypes);
        for (let i = 0; i < jaren.length; i++) {
          const urenPerPersoon = urenPerJaar[i];
          if (!urenPerPersoon) continue;
          const totUren = urenPerPersoon * r.aantal;
          const tj = tariefVoorJaar(jaren[i]);
          const kosten = totUren * tj;
          newJaren[i].rollen.push({
            uren: totUren,
            kosten,
            afdeling: r.afdeling,
            functieId: r.functieId,
            uurtarief: tj,
            functieNaam: r.functieNaam,
            aantal: r.aantal,
            urenPerPersoon,
            categorie: r.categorie,
          });
          domeinTotaalUren += totUren;
          domeinTotaalKosten += kosten;
        }
      }

      sc.domeinen[idx] = {
        ...dEntry,
        jaren: newJaren,
        uren: domeinTotaalUren,
        totaalUren: domeinTotaalUren,
        totaalKosten: domeinTotaalKosten,
      };
    }

    // Recompute scenario-totalen
    let scTotUren = 0;
    let scTotKosten = 0;
    const totalenPerJaar: Record<number, { uren: number; kosten: number }> = {};
    for (const idx of Object.keys(sc.domeinen)) {
      const d = sc.domeinen[idx];
      scTotUren += d.totaalUren ?? 0;
      scTotKosten += d.totaalKosten ?? 0;
      for (const j of (d.jaren ?? [])) {
        totalenPerJaar[j.jaar] = totalenPerJaar[j.jaar] ?? { uren: 0, kosten: 0 };
        for (const r of (j.rollen ?? [])) {
          totalenPerJaar[j.jaar].uren += r.uren ?? 0;
          totalenPerJaar[j.jaar].kosten += r.kosten ?? 0;
        }
      }
    }
    sc.totaalUren = scTotUren;
    sc.totaalKosten = scTotKosten;
    // Behoud bestaande urenBudget per jaar
    const urenBudgetMap: Record<number, number> = {};
    for (const t of (sc.totalenPerJaar ?? [])) {
      urenBudgetMap[t.jaar] = t.urenBudget ?? 540;
    }
    sc.totalenPerJaar = Object.keys(totalenPerJaar)
      .map(Number)
      .sort((a, b) => a - b)
      .map((j) => {
        const ub = urenBudgetMap[j] ?? 540;
        const uren = totalenPerJaar[j].uren;
        return {
          jaar: j,
          uren,
          kosten: totalenPerJaar[j].kosten,
          urenBudget: ub,
          urenGap: uren - ub,
        };
      });
  }

  // ===== STAP 4: Marker Lezing C =====
  console.log("\n[stap 4] Marker Lezing C plaatsen...");
  // Per-domein tellingen + categorie-totalen per scenario
  const overzicht: Record<string, any> = {};
  for (const dom of ["mens", "data_systemen", "cultuur", "processen"] as Domein[]) {
    const klass = rollenPerDomein[dom];
    const totaalAantal = klass.reduce((s, r) => s + r.aantal, 0);
    const perCategorie: Record<string, number> = {};
    for (const r of klass) {
      perCategorie[r.categorie] = (perCategorie[r.categorie] ?? 0) + r.aantal;
    }
    overzicht[dom] = {
      aangemeld: totaalAantal,
      inspanningsleider: perCategorie.inspanningsleider ?? 0,
      kernteam: perCategorie.kernteam ?? 0,
      geconsulteerd: perCategorie.geconsulteerd ?? 0,
      trainings_deelnemer: perCategorie.trainings_deelnemer ?? 0,
    };
  }
  // Categorie-totalen per scenario
  const perScenario: Record<string, any> = {};
  for (const skey of Object.keys(s7.scenarios)) {
    const sc = s7.scenarios[skey];
    perScenario[skey] = {
      totaalUren: sc.totaalUren,
      totaalKosten: sc.totaalKosten,
      perDomein: {} as Record<string, number>,
    };
    for (const idx of Object.keys(sc.domeinen)) {
      const d = sc.domeinen[idx];
      perScenario[skey].perDomein[d.domein] = d.totaalUren;
    }
  }

  s7.interneUrenLezing = {
    lezing: "C",
    timestamp: new Date().toISOString(),
    toelichting:
      "Kernteam-model: per inspanning 1 inspanningsleider + 5–8 kernteam-leden (uitvoerend) + trainings-deelnemers (mens-cursisten) + geconsulteerden (lichte review-input). Fase-gebaseerd: kernteam zwaarder in piek-jaren, lichter in borging. Lezing A (alle aangemelden naar rolfunctie) verworpen want gaf onrealistisch hoge totalen voor stakeholder-rollen.",
    overzicht,
    perScenario,
  };
  s7.lezingCDoorgevoerd = true;
  s7.lezingCDoorgevoerdMeta = {
    timestamp: new Date().toISOString(),
    versie: 1,
    cleanupActies: [
      "productmanager_int_zak verwijderd uit mens + data_systemen",
      "trojka procesconsultants vervangen door 1 TBD-placeholder",
      "alle rollen herrekend naar Lezing C-niveaus (80/40/25 leider, 40/15/10 kernteam, 6 geconsulteerd, 46 trainings-deelnemer)",
      "marker omgezet naar lezing=C",
    ],
  };

  // ===== Save =====
  console.log("\n[save] Schrijven naar Supabase...");
  const { error: upErr } = await supa
    .from("din_sessions")
    .update({ data: root, updated_at: new Date().toISOString() })
    .eq("id", SESSION_ID);
  if (upErr) throw upErr;
  console.log("[save] OK.");

  // ===== Verificatie + rapport-data =====
  console.log("\n=== VERIFICATIE ===");
  console.log("\nVoor/Na uren per scenario per domein:");
  for (const skey of Object.keys(s7.scenarios)) {
    console.log(`\n[${skey}]`);
    const sc = s7.scenarios[skey];
    for (const idx of Object.keys(sc.domeinen)) {
      const d = sc.domeinen[idx];
      const pre = prePerScenarioPerDomein[skey]?.[d.domein] ?? "?";
      const post = d.totaalUren ?? 0;
      console.log(`  ${d.domein.padEnd(15)} pre=${String(pre).padStart(6)}u → post=${String(post).padStart(6)}u`);
    }
    console.log(`  TOTAAL          pre=${String(Object.values(prePerScenarioPerDomein[skey] ?? {}).reduce((s: number, v: any) => s + v, 0)).padStart(6)}u → post=${String(sc.totaalUren).padStart(6)}u`);
  }
  console.log("\nMarker:", JSON.stringify(s7.interneUrenLezing.lezing));
  console.log("lezingCDoorgevoerd:", s7.lezingCDoorgevoerd);
  console.log("Yara mens-leider aanwezig:", !!s7.selectiePerDomein.mens["custom-yara-mens-leider"]);
  console.log("Sven data-leider aanwezig:", !!s7.selectiePerDomein.data_systemen["custom-sven-data-leider"]);
  console.log("Placeholder-leider processen aanwezig:", !!s7.selectiePerDomein.processen["custom-inspanningsleider-processen-tbd"]);
  console.log("int_zak weg uit mens:", !s7.selectiePerDomein.mens.productmanager_int_zak);
  console.log("int_zak weg uit data:", !s7.selectiePerDomein.data_systemen.productmanager_int_zak);
  const trojkaWeg = !root.programmaorganisatie.kerngroep.some((m: any) =>
    ["Procesconsultant PO", "Procesconsultant VO", "Procesconsultant Zakelijk"].includes(m.naam),
  );
  console.log("Trojka procesconsultants weg uit programmaorganisatie:", trojkaWeg);

  // Write audit-data file
  const auditData = {
    sessionId: SESSION_ID,
    timestamp: new Date().toISOString(),
    cleanupActies: s7.lezingCDoorgevoerdMeta.cleanupActies,
    classificatie: {
      mens: rollenPerDomein.mens,
      data_systemen: rollenPerDomein.data_systemen,
      cultuur: rollenPerDomein.cultuur,
      processen: rollenPerDomein.processen,
    },
    voorNa: Object.fromEntries(
      Object.keys(s7.scenarios).map((skey) => [
        skey,
        {
          pre: prePerScenarioPerDomein[skey],
          post: Object.fromEntries(
            Object.values<any>(s7.scenarios[skey].domeinen).map((d: any) => [d.domein, d.totaalUren]),
          ),
        },
      ]),
    ),
    overzicht,
    perScenario,
  };
  writeFileSync(
    `c:/tmp/lezing-c-audit-data.json`,
    JSON.stringify(auditData, null, 2),
    "utf-8",
  );
  console.log(`\n[audit] data saved to c:/tmp/lezing-c-audit-data.json`);

  console.log("\nKLAAR.");
}

main().catch((e) => {
  console.error("ERR:", e);
  process.exit(1);
});
