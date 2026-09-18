/**
 * Lezing C — Herijking
 *
 * Vervolg op `lezing-c-correctie.ts`. Doet drie dingen in één pass:
 *
 * 1. Wijst `categorie` toe aan alle rol-records (zowel vUPI als scenarios) op basis van
 *    domein + functieId mapping (zelfde mapping als lezing-c-correctie.ts).
 * 2. Herijkt rol-uren per scenario per domein per jaar volgens Lezing-C kernteam-niveaus per
 *    categorie en fase-type (piek / niet-piek / borging).
 * 3. Herrekent vUPI-urenTotaal vanuit advies-scenario en zet realistische programmaPct per
 *    categorie (onderscheid functieprofiel/L&D = lijn vs nieuw programma-werk).
 * 4. Herrekent alle aggregaten (jaar, domein, scenario, programmaUren, lijnUren).
 *
 * Idempotent — checkt marker `lezingCHerijkingToegepast: true`.
 *
 * BEHOUD:
 *   - aantal in selectiePerDomein
 *   - onderbouwing-tekst per rol
 *
 * UPDATE:
 *   - rol.categorie (waar nog ontbrekend)
 *   - rol.uren, rol.kosten in scenarios
 *   - rol.urenTotaal, rol.programmaPct in vUPI
 *   - alle aggregaten op jaar / domein / scenario niveau
 */

import { createClient } from "@supabase/supabase-js";
import { readFileSync, existsSync, writeFileSync, mkdirSync } from "fs";
import { join } from "path";

// ---------- env ----------
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

type Categorie = "leider" | "kernteam" | "geconsulteerd" | "trainings-deelnemer";
type Domein = "mens" | "processen" | "data_systemen" | "cultuur";
type FaseType = "piek" | "niet-piek" | "borging";

// ---------- Categorie-mapping per domein op functieId ----------
// Zelfde mapping als lezing-c-correctie.ts.

const CAT_MENS: Record<string, Categorie> = {
  "custom-yara-mens-leider": "leider",
  teamleider_trainingen: "kernteam",
  manager_klantcontact: "kernteam",
  sectormanager_po: "kernteam",
  sectormanager_vo: "geconsulteerd",
  sectormanager_prof: "geconsulteerd",
  trainer_adviseur_a: "kernteam", // 12 trainers — kernteam-uitvoerend (curriculum + facilitatie)
  trainer_adviseur_a_senior_kernteam: "kernteam",
  trainer_adviseur_a_geconsulteerd: "geconsulteerd",
  accountmanager_c: "trainings-deelnemer",
  accountmanager_c_prof: "trainings-deelnemer",
  mdw_binnendienst_b: "trainings-deelnemer",
  klantenservice_c: "trainings-deelnemer",
  accountmanager_a: "geconsulteerd",
  accountmanager_b: "geconsulteerd",
  klantenservice_a: "geconsulteerd",
  klantenservice_b: "geconsulteerd",
  teamleider_klantenservice: "geconsulteerd",
  productmanager_dst: "geconsulteerd",
  productmanager_klt: "geconsulteerd",
  productmanager_int_zak: "geconsulteerd",
  campagne_marketeer_a: "geconsulteerd",
  campagne_marketeer_b: "geconsulteerd",
  junior_marketeer_prof: "geconsulteerd",
  mdw_binnendienst_a: "geconsulteerd",
};

const CAT_DATA: Record<string, Categorie> = {
  "custom-sven-data-leider": "leider",
  manager_dt: "kernteam",
  projectmanager_d: "kernteam",
  procesmanager_data: "kernteam",
  productowner_a_website: "kernteam",
  productowner_b_producten: "kernteam",
  business_info_analist_c: "kernteam",
  content_specialist: "kernteam",
  sectormanager_po: "geconsulteerd",
  sectormanager_vo: "geconsulteerd",
  sectormanager_prof: "geconsulteerd",
  productmanager_dst: "geconsulteerd",
  productmanager_kib: "geconsulteerd",
  productmanager_klt: "geconsulteerd",
  productmanager_lib: "geconsulteerd",
  productmanager_nt2: "geconsulteerd",
  productmanager_cvvo: "geconsulteerd",
  productmanager_int_zak: "geconsulteerd",
  trainer_adviseur_a: "geconsulteerd",
  campagne_marketeer_a: "geconsulteerd",
  campagne_marketeer_b: "geconsulteerd",
  junior_marketeer_prof: "geconsulteerd",
  manager_klantcontact: "geconsulteerd",
  accountmanager_c_prof: "geconsulteerd",
  mdw_binnendienst_a_prof: "geconsulteerd",
  teamleider_trainingen: "geconsulteerd",
};

const CAT_CULTUUR: Record<string, Categorie> = {
  "custom-yara-cultuur-leider": "leider",
  "custom-1777458764027-8mxzp": "kernteam", // HR-rol → kernteam-MT
  "custom-1777458764027-8mxzp_leider": "leider",
  "custom-1777458764027-8mxzp_kernteam": "kernteam",
  directeur_bv: "kernteam",
  manager_dt: "kernteam",
  sectormanager_po: "kernteam",
  sectormanager_vo: "kernteam",
  sectormanager_prof: "kernteam",
  manager_klantcontact: "kernteam",
  teamleider_ps: "kernteam",
};

const CAT_PROCESSEN: Record<string, Categorie> = {
  "custom-inspanningsleider-processen-tbd": "leider",
  procesmanager_data: "kernteam",
  projectmanager_d: "kernteam",
  procesondersteuner_po: "kernteam",
  procesondersteuner_vo: "kernteam",
  "custom-1777459472792-own3u": "kernteam",
};

const CAT_PER_DOMEIN: Record<Domein, Record<string, Categorie>> = {
  mens: CAT_MENS,
  data_systemen: CAT_DATA,
  cultuur: CAT_CULTUUR,
  processen: CAT_PROCESSEN,
};

function setCategorieFromMap(rol: any, domein: Domein): boolean {
  const map = CAT_PER_DOMEIN[domein];
  if (!map) return false;
  const fid = rol.functieId;
  if (typeof fid !== "string") return false;
  if (map[fid]) {
    rol.categorie = map[fid];
    return true;
  }
  if (fid.endsWith("_senior_kernteam")) {
    rol.categorie = "kernteam";
    return true;
  }
  if (fid.endsWith("_geconsulteerd")) {
    rol.categorie = "geconsulteerd";
    return true;
  }
  if (fid.endsWith("_leider")) {
    rol.categorie = "leider";
    return true;
  }
  if (fid.endsWith("_kernteam")) {
    rol.categorie = "kernteam";
    return true;
  }
  return false;
}

// ---------- Lezing-C uren-niveaus per categorie + fase-type ----------

interface UrenNiveau {
  piek: number;
  nietPiek: number;
  borging: number;
}

const UREN_LEIDER: UrenNiveau = { piek: 80, nietPiek: 40, borging: 25 };
const UREN_KERNTEAM_UITV: UrenNiveau = { piek: 40, nietPiek: 15, borging: 10 };
const UREN_KERNTEAM_MT_CULTUUR: UrenNiveau = { piek: 30, nietPiek: 12, borging: 8 };
// Geconsulteerd en trainings-deelnemer: totaal-uren over hele looptijd, verdeeld over piek-jaren.
const UREN_GECONSULTEERD_TOTAAL = 6; // 3u eerste piek + 3u tweede piek
const UREN_TRAINING_BASIS = 24;
const UREN_TRAINING_VAARDIGHEID = 22;

// ---------- ProgrammaPct per categorie + (sub)variant ----------

const PROGRAMMA_PCT_DEFAULT = 1.0;

function programmaPctVoorRol(
  domein: Domein,
  categorie: Categorie | undefined,
  functieId: string,
): number {
  if (!categorie) return PROGRAMMA_PCT_DEFAULT;

  if (categorie === "leider") return 0.9;

  if (categorie === "kernteam") {
    // MT-cultuur (geen leider) → 0.50; rest van cultuur-kernteam ook MT-niveau.
    if (domein === "cultuur") return 0.5;
    if (domein === "data_systemen") return 0.85;
    if (domein === "processen") return 0.85;
    if (domein === "mens") return 0.8; // trainers
    return 0.85;
  }

  if (categorie === "trainings-deelnemer") return 0.5;
  if (categorie === "geconsulteerd") return 0.3;

  return PROGRAMMA_PCT_DEFAULT;
}

// ---------- Fase-type bepalen ----------

const FASE_PIEK_KEYWORDS = [
  "realisatie",
  "acceptatie",
  "pilot",
  "basis",
  "vaardigheid",
  "lev.sel",
  "leverancier",
  "uitrol",
  "go-live",
  "inrichten",
  "bouw",
  "implementatie",
  "training",
  "adoptie",
  "rolmodel",
  "coalitie",
  "uitrol",
  "herontwerp",
  "inventarisatie",
  "behoeftestelling",
  "curriculum",
];

const FASE_BORGING_KEYWORDS = [
  "borging",
  "beheer",
  "optim",
  "doorontw",
  "continu",
  "verank",
  "nazorg",
  "structureel",
  "evaluatie",
  "standaardisatie",
];

function bepaalFaseType(
  fase: string | undefined,
  jaarIndex: number,
  scenarioJaren: number,
): FaseType {
  const f = (fase ?? "").toLowerCase();
  // Lange scenarios + late jaren + borging-keywords → "borging"
  const isLang = scenarioJaren >= 7;
  const isLaat = jaarIndex >= 3; // jaar 4 of later (0-indexed)

  const isBorging = FASE_BORGING_KEYWORDS.some((k) => f.includes(k));
  const isPiek = FASE_PIEK_KEYWORDS.some((k) => f.includes(k));

  if (isPiek && !isBorging) return "piek";
  if (isBorging) {
    if (isLang && isLaat) return "borging";
    return "niet-piek";
  }
  // Geen match → niet-piek default
  return "niet-piek";
}

function bepaalLeiderUrenVoorJaar(faseType: FaseType): number {
  if (faseType === "piek") return UREN_LEIDER.piek;
  if (faseType === "borging") return UREN_LEIDER.borging;
  return UREN_LEIDER.nietPiek;
}

function bepaalKernteamUitvUrenVoorJaar(faseType: FaseType): number {
  if (faseType === "piek") return UREN_KERNTEAM_UITV.piek;
  if (faseType === "borging") return UREN_KERNTEAM_UITV.borging;
  return UREN_KERNTEAM_UITV.nietPiek;
}

function bepaalKernteamMTUrenVoorJaar(faseType: FaseType): number {
  if (faseType === "piek") return UREN_KERNTEAM_MT_CULTUUR.piek;
  if (faseType === "borging") return UREN_KERNTEAM_MT_CULTUUR.borging;
  return UREN_KERNTEAM_MT_CULTUUR.nietPiek;
}

// ---------- Cultuur sub-classificatie: MT vs uitvoerend ----------
// Cultuur kernteam = MT (Directeur BV, sectormanagers, Manager Klantcontact, Manager DT,
// Teamleider Proces Support, HR-uitvoerders die geen leider zijn).
// Behandel ALLE niet-leider cultuur-kernteam als MT-niveau.
function isCultuurMTKernteam(functieId: string): boolean {
  if (functieId === "directeur_bv") return true;
  if (functieId === "manager_dt") return true;
  if (functieId === "manager_klantcontact") return true;
  if (functieId === "sectormanager_po") return true;
  if (functieId === "sectormanager_vo") return true;
  if (functieId === "sectormanager_prof") return true;
  if (functieId === "teamleider_ps") return true;
  if (functieId === "custom-1777458764027-8mxzp") return true; // HR-rol → kernteam-MT-niveau
  return false;
}

// ---------- Tarief-helper ----------

function tariefVoorJaar(jaar: number, basis: number, indexatie: number, refJaar: number): number {
  return Math.round(basis * Math.pow(1 + indexatie, jaar - refJaar));
}

// ---------- Fase per scenario per domein per jaar (vanuit begrotingAdvies) ----------

interface FaseMap {
  // [scenarioKey][domein][jaar] = fase
  [skey: string]: { [dom in Domein]?: { [jaar: number]: string } };
}

function buildFaseMap(begrotingAdvies: any): FaseMap {
  const out: FaseMap = {};
  if (!begrotingAdvies?.scenarios) return out;
  for (const skey of Object.keys(begrotingAdvies.scenarios)) {
    const sc = begrotingAdvies.scenarios[skey];
    out[skey] = {};
    for (const i of sc?.inspanningen ?? []) {
      const dom = i.domein as Domein;
      if (!dom || dom === ("overig" as any)) continue;
      out[skey][dom] = out[skey][dom] ?? {};
      for (const v of i.verdelingPerJaar ?? []) {
        if (typeof v.jaar === "number" && typeof v.fase === "string") {
          out[skey][dom]![v.jaar] = v.fase;
        }
      }
    }
  }
  return out;
}

// ---------- Bepaal piek-jaar-indices per (scenario, domein) ----------

function piekJaarIndicesVoor(
  faseMap: FaseMap,
  skey: string,
  dom: Domein,
  jaren: number[],
  scenarioJaren: number,
): number[] {
  const result: number[] = [];
  for (let i = 0; i < jaren.length; i++) {
    const j = jaren[i];
    const fase = faseMap[skey]?.[dom]?.[j];
    if (bepaalFaseType(fase, i, scenarioJaren) === "piek") result.push(i);
  }
  return result;
}

// ---------- main ----------

async function main() {
  console.log(`\n=== Lezing C — Herijking voor sessie ${SESSION_ID} ===\n`);

  const { data, error } = await supa
    .from("din_sessions")
    .select("data, updated_at")
    .eq("id", SESSION_ID)
    .maybeSingle();
  if (error) throw error;
  if (!data) throw new Error("NO DATA");

  const root: any = data.data;
  const stap4 = root?.crossAnalyseWizard?.stepResults?.stap4;
  const s7 = stap4?.stap7InterneUren;
  const ba = stap4?.begrotingAdvies;
  if (!s7) throw new Error("stap7InterneUren niet gevonden");

  // Idempotency
  if (s7.lezingCHerijkingToegepast === true) {
    console.log("[idempotent] lezingCHerijkingToegepast is al true; niets te doen.");
    process.exit(0);
  }

  // Backup
  const backupDir = "c:/tmp";
  if (!existsSync(backupDir)) mkdirSync(backupDir, { recursive: true });
  const ts = new Date().toISOString().replace(/[:.]/g, "-");
  const backupPath = `${backupDir}/session-d8b97442-pre-herijking-${ts}.json`;
  writeFileSync(backupPath, JSON.stringify(root, null, 2), "utf-8");
  console.log(`[backup] saved to ${backupPath}\n`);

  // Pre-state capture
  const pre: Record<string, {
    totaalUren: number;
    totaalKosten: number;
    programmaUren: number;
    perDomein: Record<string, { uren: number; kosten: number; }>;
    perCategorie: Record<string, { aantalRollen: number; uren: number }>;
  }> = {};
  for (const skey of Object.keys(s7.scenarios ?? {})) {
    const sc = s7.scenarios[skey];
    if (!sc) continue;
    pre[skey] = {
      totaalUren: sc.totaalUren ?? 0,
      totaalKosten: sc.totaalKosten ?? 0,
      programmaUren: sc.programmaUren ?? 0,
      perDomein: {},
      perCategorie: {},
    };
    for (const idx of Object.keys(sc.domeinen ?? {})) {
      const d = sc.domeinen[idx];
      pre[skey].perDomein[d.domein] = {
        uren: d.totaalUren ?? 0,
        kosten: d.totaalKosten ?? 0,
      };
      for (const j of d.jaren ?? []) {
        for (const r of j.rollen ?? []) {
          const c = r.categorie ?? "onbekend";
          pre[skey].perCategorie[c] = pre[skey].perCategorie[c] ?? { aantalRollen: 0, uren: 0 };
          pre[skey].perCategorie[c].aantalRollen++;
          pre[skey].perCategorie[c].uren += r.uren ?? 0;
        }
      }
    }
  }

  const settings = s7.uurtariefSettings ?? {};
  const basisTarief = settings.basisTarief ?? 70;
  const indexatie = settings.indexatiePercentage ?? 0.05;
  const refJaar = settings.referentiejaar ?? 2025;

  const faseMap = buildFaseMap(ba);

  // ====================================================================
  // STAP 0 — Categorie-veld toewijzen waar nog niet gezet
  // ====================================================================
  console.log("[stap 0] Categorie toewijzen aan rollen waar nog ontbrekend...\n");

  const catStats: Record<Domein, { totaal: number; gezet: number; alAanwezig: number; geenMatch: string[] }> = {
    mens: { totaal: 0, gezet: 0, alAanwezig: 0, geenMatch: [] },
    data_systemen: { totaal: 0, gezet: 0, alAanwezig: 0, geenMatch: [] },
    cultuur: { totaal: 0, gezet: 0, alAanwezig: 0, geenMatch: [] },
    processen: { totaal: 0, gezet: 0, alAanwezig: 0, geenMatch: [] },
  };

  // vUPI
  for (const idx of Object.keys(s7.vastgesteldeUrenPerInspanning ?? {})) {
    const e = s7.vastgesteldeUrenPerInspanning[idx];
    if (!e?.domein || !Array.isArray(e.rollen)) continue;
    const dom = e.domein as Domein;
    if (!catStats[dom]) continue;
    for (const r of e.rollen) {
      catStats[dom].totaal++;
      if (r.categorie) {
        catStats[dom].alAanwezig++;
        continue;
      }
      const matched = setCategorieFromMap(r, dom);
      if (matched) catStats[dom].gezet++;
      else catStats[dom].geenMatch.push(`vUPI/${r.functieId}`);
    }
  }

  // scenarios
  for (const skey of Object.keys(s7.scenarios ?? {})) {
    const sc = s7.scenarios[skey];
    if (!sc?.domeinen) continue;
    for (const idx of Object.keys(sc.domeinen)) {
      const d = sc.domeinen[idx];
      const dom = d.domein as Domein;
      if (!catStats[dom]) continue;
      for (const j of d.jaren ?? []) {
        for (const r of j.rollen ?? []) {
          if (r.categorie) continue;
          const matched = setCategorieFromMap(r, dom);
          if (!matched) {
            const tag = `scen[${skey}].${dom}/${r.functieId}`;
            if (!catStats[dom].geenMatch.includes(tag)) {
              catStats[dom].geenMatch.push(tag);
            }
          }
        }
      }
    }
  }

  for (const dom of Object.keys(catStats) as Domein[]) {
    const s = catStats[dom];
    console.log(
      `  ${dom.padEnd(15)}: ${s.gezet} gezet | ${s.alAanwezig} al aanwezig | ${s.totaal} vUPI-totaal | ${s.geenMatch.length} zonder match`,
    );
    if (s.geenMatch.length > 0 && s.geenMatch.length <= 8) {
      for (const m of s.geenMatch) console.log(`    ! ${m}`);
    }
  }

  // ====================================================================
  // STAP 1 — Per scenario per domein per jaar herrekenen vanuit categorie
  // ====================================================================
  console.log("\n[stap 1] Rol-uren herijken per scenario per domein per jaar...\n");

  const rolStats: Record<string, { aantalAangepast: number; }> = {};
  function bumpStat(skey: string) {
    rolStats[skey] = rolStats[skey] ?? { aantalAangepast: 0 };
    rolStats[skey].aantalAangepast++;
  }

  for (const skey of Object.keys(s7.scenarios ?? {})) {
    const sc = s7.scenarios[skey];
    if (!sc?.domeinen) continue;
    const scenarioJaren =
      sc.aantalJaren ?? Object.values<any>(sc.domeinen)[0]?.jaren?.length ?? 4;

    for (const idx of Object.keys(sc.domeinen)) {
      const d = sc.domeinen[idx];
      const dom = d.domein as Domein;
      const jaren = d.jaren ?? [];
      const jaarNummers = jaren.map((j: any) => j.jaar as number);

      // Bereken piek-jaar-indices voor dit (scenario, domein) — nodig voor geconsulteerd /
      // trainings-deelnemer.
      const piekIdx = piekJaarIndicesVoor(faseMap, skey, dom, jaarNummers, scenarioJaren);

      for (let i = 0; i < jaren.length; i++) {
        const j = jaren[i];
        const fase = faseMap[skey]?.[dom]?.[j.jaar];
        const faseType = bepaalFaseType(fase, i, scenarioJaren);
        const tarief = tariefVoorJaar(j.jaar, basisTarief, indexatie, refJaar);
        const isPiek = piekIdx.includes(i);
        const piekVolgnummer = piekIdx.indexOf(i); // 0 = eerste piek, 1 = tweede piek, ...

        if (!Array.isArray(j.rollen)) continue;
        for (const r of j.rollen) {
          const cat: Categorie | undefined = r.categorie;
          // Bepaal aantal personen voor deze rol uit selectiePerDomein
          const sel = s7.selectiePerDomein?.[dom]?.[r.functieId];
          const aantalPersonen = typeof sel?.aantal === "number" ? sel.aantal : 1;

          let urenPerPersoon = 0;

          if (cat === "leider") {
            urenPerPersoon = bepaalLeiderUrenVoorJaar(faseType);
          } else if (cat === "kernteam") {
            // Cultuur MT-niveau vs kernteam-uitvoerend
            if (dom === "cultuur" && isCultuurMTKernteam(r.functieId)) {
              urenPerPersoon = bepaalKernteamMTUrenVoorJaar(faseType);
            } else {
              urenPerPersoon = bepaalKernteamUitvUrenVoorJaar(faseType);
            }
          } else if (cat === "trainings-deelnemer") {
            // Trainings-deelnemer: 24u in piek-fase=Basis, 22u in piek-fase=Vaardigheid; rest 0.
            if (isPiek) {
              const f = (fase ?? "").toLowerCase();
              if (f.includes("basis")) urenPerPersoon = UREN_TRAINING_BASIS;
              else if (f.includes("vaardigheid")) urenPerPersoon = UREN_TRAINING_VAARDIGHEID;
              else urenPerPersoon = 0;
            } else {
              urenPerPersoon = 0;
            }
          } else if (cat === "geconsulteerd") {
            // 3u in eerste piek + 3u in tweede piek. Anders 0.
            if (isPiek && piekVolgnummer === 0) urenPerPersoon = 3;
            else if (isPiek && piekVolgnummer === 1) urenPerPersoon = 3;
            else urenPerPersoon = 0;
          } else {
            // Geen categorie: behoud bestaande uren onveranderd, sla rol over.
            continue;
          }

          const totaalUrenRol = urenPerPersoon * aantalPersonen;
          const totaalKostenRol = totaalUrenRol * tarief;
          if (r.uren !== totaalUrenRol || r.kosten !== totaalKostenRol) {
            r.uren = totaalUrenRol;
            r.kosten = totaalKostenRol;
            r.uurtarief = tarief;
            bumpStat(skey);
          }
        }
      }
    }
  }

  for (const skey of Object.keys(rolStats)) {
    console.log(`  [${skey}] aangepaste rol-records: ${rolStats[skey].aantalAangepast}`);
  }

  // ====================================================================
  // STAP 2 — Aggregaten hercalculeren per scenario per domein per jaar
  // ====================================================================
  console.log("\n[stap 2] Aggregaten herrekenen...\n");

  for (const skey of Object.keys(s7.scenarios ?? {})) {
    const sc = s7.scenarios[skey];
    if (!sc?.domeinen) continue;

    const totalenPerJaarMap: Record<number, { uren: number; kosten: number; programmaUren: number }> = {};
    let scTotaalUren = 0;
    let scTotaalKosten = 0;
    let scProgrammaUren = 0;

    for (const idx of Object.keys(sc.domeinen)) {
      const d = sc.domeinen[idx];
      const dom = d.domein as Domein;
      let domTotaalUren = 0;
      let domTotaalKosten = 0;
      let domProgrammaUren = 0;

      for (const j of d.jaren ?? []) {
        let jaarUren = 0;
        let jaarKosten = 0;
        let jaarProgrammaUren = 0;
        for (const r of j.rollen ?? []) {
          jaarUren += r.uren ?? 0;
          jaarKosten += r.kosten ?? 0;
          const pct = programmaPctVoorRol(dom, r.categorie, r.functieId);
          jaarProgrammaUren += (r.uren ?? 0) * pct;
        }
        j.totaalUren = jaarUren;
        j.totaalKosten = jaarKosten;
        domTotaalUren += jaarUren;
        domTotaalKosten += jaarKosten;
        domProgrammaUren += jaarProgrammaUren;

        totalenPerJaarMap[j.jaar] = totalenPerJaarMap[j.jaar] ?? {
          uren: 0,
          kosten: 0,
          programmaUren: 0,
        };
        totalenPerJaarMap[j.jaar].uren += jaarUren;
        totalenPerJaarMap[j.jaar].kosten += jaarKosten;
        totalenPerJaarMap[j.jaar].programmaUren += jaarProgrammaUren;
      }
      d.uren = domTotaalUren;
      d.totaalUren = domTotaalUren;
      d.totaalKosten = domTotaalKosten;
      d.programmaUren = Math.round(domProgrammaUren);
      d.lijnUren = domTotaalUren - d.programmaUren;
      scTotaalUren += domTotaalUren;
      scTotaalKosten += domTotaalKosten;
      scProgrammaUren += domProgrammaUren;
    }

    sc.totaalUren = scTotaalUren;
    sc.totaalKosten = scTotaalKosten;
    sc.programmaUren = Math.round(scProgrammaUren);
    sc.lijnUren = scTotaalUren - sc.programmaUren;

    // Behoud bestaande urenBudget per jaar
    const urenBudgetMap: Record<number, number> = {};
    for (const t of sc.totalenPerJaar ?? []) {
      urenBudgetMap[t.jaar] = t.urenBudget ?? 540;
    }
    sc.totalenPerJaar = Object.keys(totalenPerJaarMap)
      .map(Number)
      .sort((a, b) => a - b)
      .map((j) => {
        const ub = urenBudgetMap[j] ?? 540;
        const uren = totalenPerJaarMap[j].uren;
        return {
          jaar: j,
          uren,
          kosten: totalenPerJaarMap[j].kosten,
          urenBudget: ub,
          urenGap: uren - ub,
        };
      });
  }

  // ====================================================================
  // STAP 3 — vUPI urenTotaal hercalculeren vanuit advies-scenario
  // ====================================================================
  console.log("[stap 3] vUPI urenTotaal + programmaPct hercalculeren...\n");

  // Per (domein, functieId) → som van rol.uren over alle jaren in advies-scenario.
  const urenTotaalPerDomFunctie: Record<string, number> = {};
  const adviesSc = s7.scenarios?.advies;
  if (adviesSc?.domeinen) {
    for (const idx of Object.keys(adviesSc.domeinen)) {
      const d = adviesSc.domeinen[idx];
      for (const j of d.jaren ?? []) {
        for (const r of j.rollen ?? []) {
          const k = `${d.domein}::${r.functieId}`;
          urenTotaalPerDomFunctie[k] = (urenTotaalPerDomFunctie[k] ?? 0) + (r.uren ?? 0);
        }
      }
    }
  }

  let vUPIUpdated = 0;
  for (const idx of Object.keys(s7.vastgesteldeUrenPerInspanning ?? {})) {
    const e = s7.vastgesteldeUrenPerInspanning[idx];
    if (!e?.domein || !Array.isArray(e.rollen)) continue;
    const dom = e.domein as Domein;
    for (const r of e.rollen) {
      const cat: Categorie | undefined = r.categorie;
      const k = `${dom}::${r.functieId}`;
      const sel = s7.selectiePerDomein?.[dom]?.[r.functieId];
      const aantalPersonen = typeof sel?.aantal === "number" ? sel.aantal : 1;
      let nieuwUrenTotaal: number;

      if (urenTotaalPerDomFunctie[k] !== undefined) {
        nieuwUrenTotaal = urenTotaalPerDomFunctie[k];
      } else if (cat === "geconsulteerd") {
        // Geconsulteerd: 6u totaal × aantalPersonen
        nieuwUrenTotaal = UREN_GECONSULTEERD_TOTAAL * aantalPersonen;
      } else if (cat === "trainings-deelnemer") {
        nieuwUrenTotaal = (UREN_TRAINING_BASIS + UREN_TRAINING_VAARDIGHEID) * aantalPersonen;
      } else {
        // Geen scenario-data → behoud bestaande urenTotaal
        continue;
      }

      const nieuwePct = programmaPctVoorRol(dom, cat, r.functieId);

      if (r.urenTotaal !== nieuwUrenTotaal || r.programmaPct !== nieuwePct) {
        r.urenTotaal = nieuwUrenTotaal;
        r.programmaPct = nieuwePct;
        vUPIUpdated++;
      }
    }
  }
  console.log(`  vUPI rol-records bijgewerkt: ${vUPIUpdated}`);

  // ====================================================================
  // STAP 4 — Lezing-marker zetten
  // ====================================================================
  console.log("\n[stap 4] Marker zetten...\n");

  const interneUrenLezing = s7.interneUrenLezing ?? {};
  interneUrenLezing.herijking = {
    timestamp: new Date().toISOString(),
    versie: 1,
    urenNiveaus: {
      leider: { piek: UREN_LEIDER.piek, nietPiek: UREN_LEIDER.nietPiek, borging: UREN_LEIDER.borging },
      kernteamUitvoerend: {
        piek: UREN_KERNTEAM_UITV.piek,
        nietPiek: UREN_KERNTEAM_UITV.nietPiek,
        borging: UREN_KERNTEAM_UITV.borging,
      },
      kernteamMTCultuur: {
        piek: UREN_KERNTEAM_MT_CULTUUR.piek,
        nietPiek: UREN_KERNTEAM_MT_CULTUUR.nietPiek,
        borging: UREN_KERNTEAM_MT_CULTUUR.borging,
      },
      geconsulteerd: { totaalLooptijd: UREN_GECONSULTEERD_TOTAAL, verdelingsToelichting: "3u eerste piek + 3u tweede piek" },
      trainingsDeelnemer: {
        basis: UREN_TRAINING_BASIS,
        vaardigheid: UREN_TRAINING_VAARDIGHEID,
        totaal: UREN_TRAINING_BASIS + UREN_TRAINING_VAARDIGHEID,
      },
    },
    programmaPctPerCategorie: {
      leider: 0.9,
      kernteamUitvoerendData: 0.85,
      kernteamUitvoerendMens: 0.8,
      kernteamUitvoerendProcessen: 0.85,
      kernteamMTCultuur: 0.5,
      trainingsDeelnemer: 0.5,
      geconsulteerd: 0.3,
    },
    motivatie:
      "Bestaande rollen herijkt volgens kernteam-niveaus. ProgrammaPct per categorie: leider 0.90, kernteam-uitvoerend 0.85 (data/processen) / 0.80 (mens-trainers), kernteam-MT cultuur 0.50, trainings-deelnemers 0.50 (16u L&D = lijn), geconsulteerd 0.30 (review-tijd grotendeels in lopende afdelingstijd).",
  };
  s7.interneUrenLezing = interneUrenLezing;

  s7.lezingCHerijkingToegepast = true;
  s7.lezingCHerijkingMeta = {
    timestamp: new Date().toISOString(),
    versie: 1,
    acties: [
      "Rol-uren per scenario per domein per jaar herijkt volgens Lezing-C kernteam-niveaus",
      "vUPI urenTotaal hercalculeerd vanuit advies-scenario",
      "programmaPct per categorie gezet (leider 0.90, kernteam 0.50–0.85, trainings 0.50, geconsulteerd 0.30)",
      "Aggregaten (jaar/domein/scenario) volledig herrekend",
    ],
  };

  // ====================================================================
  // STAP 5 — Opslaan
  // ====================================================================
  const { error: upErr } = await supa
    .from("din_sessions")
    .update({ data: root, updated_at: new Date().toISOString() })
    .eq("id", SESSION_ID);
  if (upErr) throw upErr;
  console.log("[opslaan] OK\n");

  // ====================================================================
  // VERIFICATIE + AUDIT
  // ====================================================================
  console.log("=== VERIFICATIE ===\n");

  const post: Record<string, {
    totaalUren: number;
    totaalKosten: number;
    programmaUren: number;
    lijnUren: number;
    perDomein: Record<string, { uren: number; kosten: number; programmaUren: number; lijnUren: number }>;
    perCategorie: Record<string, { aantalRollen: number; uren: number; aantalPersonen: number }>;
    perJaar: { jaar: number; uren: number; kosten: number; urenBudget: number; urenGap: number }[];
  }> = {};

  for (const skey of Object.keys(s7.scenarios ?? {})) {
    const sc = s7.scenarios[skey];
    post[skey] = {
      totaalUren: sc.totaalUren ?? 0,
      totaalKosten: sc.totaalKosten ?? 0,
      programmaUren: sc.programmaUren ?? 0,
      lijnUren: sc.lijnUren ?? 0,
      perDomein: {},
      perCategorie: {},
      perJaar: sc.totalenPerJaar ?? [],
    };
    for (const idx of Object.keys(sc.domeinen ?? {})) {
      const d = sc.domeinen[idx];
      post[skey].perDomein[d.domein] = {
        uren: d.totaalUren ?? 0,
        kosten: d.totaalKosten ?? 0,
        programmaUren: d.programmaUren ?? 0,
        lijnUren: d.lijnUren ?? 0,
      };
      for (const j of d.jaren ?? []) {
        for (const r of j.rollen ?? []) {
          const c = r.categorie ?? "onbekend";
          post[skey].perCategorie[c] = post[skey].perCategorie[c] ?? {
            aantalRollen: 0,
            uren: 0,
            aantalPersonen: 0,
          };
          post[skey].perCategorie[c].aantalRollen++;
          post[skey].perCategorie[c].uren += r.uren ?? 0;
          // aantalPersonen op basis van selectiePerDomein
          const sel = s7.selectiePerDomein?.[d.domein]?.[r.functieId];
          if (typeof sel?.aantal === "number") {
            post[skey].perCategorie[c].aantalPersonen += 0; // niet aggregeren over jaren — alleen in audit logs ergens
          }
        }
      }
    }
  }

  console.log("Voor / na per scenario:\n");
  console.log("scenario | preTot | postTot | progr | lijn | budget per jaar (max-gap)");
  console.log("-".repeat(85));
  for (const skey of ["advies", "plus20", "optimaal", "min20"]) {
    const p = pre[skey];
    const q = post[skey];
    if (!p || !q) continue;
    const maxGap = Math.max(...(q.perJaar ?? []).map((x) => x.urenGap));
    console.log(
      `${skey.padEnd(8)} | ${String(p.totaalUren).padStart(6)} | ${String(q.totaalUren).padStart(7)} | ${String(q.programmaUren).padStart(5)} | ${String(q.lijnUren).padStart(4)} | ${maxGap}`,
    );
  }

  console.log("\nPer categorie (advies-scenario, post):");
  for (const [cat, info] of Object.entries(post.advies.perCategorie)) {
    console.log(`  ${cat.padEnd(20)}: ${info.aantalRollen} rol-records, ${info.uren}u`);
  }

  // Audit-rapport markdown
  const lines: string[] = [];
  lines.push(`# Audit — Lezing-C Herijking`);
  lines.push("");
  lines.push(`**Sessie:** ${SESSION_ID}`);
  lines.push(`**Datum:** ${new Date().toISOString()}`);
  lines.push(`**Backup:** \`${backupPath}\``);
  lines.push("");
  lines.push("## Doel");
  lines.push("");
  lines.push(
    "Bestaande rollen herijken naar Lezing-C kernteam-niveaus per categorie + scenariofase. ProgrammaPct per categorie realistisch zetten (functieprofiel/L&D = lijn vs nieuw programma-werk).",
  );
  lines.push("");
  lines.push("## Uren-niveaus per categorie + fase");
  lines.push("");
  lines.push("| Categorie | Piek | Niet-piek | Borging |");
  lines.push("|---|---:|---:|---:|");
  lines.push(
    `| Leider | ${UREN_LEIDER.piek}u | ${UREN_LEIDER.nietPiek}u | ${UREN_LEIDER.borging}u |`,
  );
  lines.push(
    `| Kernteam-uitvoerend | ${UREN_KERNTEAM_UITV.piek}u | ${UREN_KERNTEAM_UITV.nietPiek}u | ${UREN_KERNTEAM_UITV.borging}u |`,
  );
  lines.push(
    `| Kernteam-MT (cultuur) | ${UREN_KERNTEAM_MT_CULTUUR.piek}u | ${UREN_KERNTEAM_MT_CULTUUR.nietPiek}u | ${UREN_KERNTEAM_MT_CULTUUR.borging}u |`,
  );
  lines.push(`| Geconsulteerd | totaal ${UREN_GECONSULTEERD_TOTAAL}u looptijd (3u eerste + 3u tweede piek) | | |`);
  lines.push(`| Trainings-deelnemer | totaal ${UREN_TRAINING_BASIS + UREN_TRAINING_VAARDIGHEID}u looptijd (24 Basis + 22 Vaardigheid) | | |`);
  lines.push("");

  lines.push("## ProgrammaPct per categorie");
  lines.push("");
  lines.push("| Categorie | programmaPct | Reden |");
  lines.push("|---|---:|---|");
  lines.push("| Leider | 0,90 | Programmacoördinatie en trekrol = nieuwe activiteit |");
  lines.push("| Kernteam-uitvoerend data | 0,85 | CRM-implementatie, key-user-tijd = grotendeels nieuw werk |");
  lines.push("| Kernteam-uitvoerend mens | 0,80 | Curriculum + facilitatie = nieuw, kleine overlap L&D-functieprofiel |");
  lines.push("| Kernteam-uitvoerend processen | 0,85 | Procesinventarisatie + adoptie = nieuw |");
  lines.push("| Kernteam-MT cultuur | 0,50 | MT-tijd grotendeels in bestaande cyclus; outside-in = beperkt extra |");
  lines.push("| Trainings-deelnemers mens | 0,50 | 16u/persoon = standaard L&D (lijn). Rest = nieuw outside-in (programma) |");
  lines.push("| Geconsulteerd | 0,30 | Review-momenten grotendeels in lopende afdelingstijd (lijn) |");
  lines.push("");

  lines.push("## Voor / na per scenario");
  lines.push("");
  lines.push("| Scenario | Pre totaal | Post totaal | Δ uren | Programma | Lijn | Pre kosten | Post kosten |");
  lines.push("|---|---:|---:|---:|---:|---:|---:|---:|");
  for (const skey of ["advies", "plus20", "optimaal", "min20"]) {
    const p = pre[skey];
    const q = post[skey];
    if (!p || !q) continue;
    const delta = q.totaalUren - p.totaalUren;
    lines.push(
      `| ${skey} | ${p.totaalUren.toLocaleString("nl-NL")} | ${q.totaalUren.toLocaleString("nl-NL")} | ${delta >= 0 ? "+" : ""}${delta.toLocaleString("nl-NL")} | ${q.programmaUren.toLocaleString("nl-NL")} | ${q.lijnUren.toLocaleString("nl-NL")} | €${p.totaalKosten.toLocaleString("nl-NL")} | €${q.totaalKosten.toLocaleString("nl-NL")} |`,
    );
  }
  lines.push("");

  lines.push("## Per scenario per domein (post)");
  lines.push("");
  for (const skey of ["advies", "plus20", "optimaal", "min20"]) {
    const sc = s7.scenarios[skey];
    if (!sc) continue;
    lines.push(`### ${skey} (${sc.aantalJaren ?? "?"}j)`);
    lines.push("");
    lines.push("| Domein | Uren | Kosten | Programma | Lijn |");
    lines.push("|---|---:|---:|---:|---:|");
    for (const idx of Object.keys(sc.domeinen ?? {})) {
      const d = sc.domeinen[idx];
      lines.push(
        `| ${d.domein} | ${(d.totaalUren ?? 0).toLocaleString("nl-NL")} | €${(d.totaalKosten ?? 0).toLocaleString("nl-NL")} | ${(d.programmaUren ?? 0).toLocaleString("nl-NL")} | ${(d.lijnUren ?? 0).toLocaleString("nl-NL")} |`,
      );
    }
    lines.push("");
  }

  lines.push("## Per scenario per categorie (post)");
  lines.push("");
  for (const skey of ["advies", "plus20", "optimaal", "min20"]) {
    const q = post[skey];
    if (!q) continue;
    lines.push(`### ${skey}`);
    lines.push("");
    lines.push("| Categorie | Aantal rol-records | Totaal uren |");
    lines.push("|---|---:|---:|");
    for (const [cat, info] of Object.entries(q.perCategorie)) {
      lines.push(`| ${cat} | ${info.aantalRollen} | ${info.uren.toLocaleString("nl-NL")} |`);
    }
    lines.push("");
  }

  lines.push("## Vergelijking met voorstel");
  lines.push("");
  lines.push("| Scenario | Voorstel ~ | Post | Δ vs voorstel |");
  lines.push("|---|---:|---:|---:|");
  const voorstel: Record<string, number> = {
    advies: 6100,
    plus20: 6700,
    optimaal: 6950,
    min20: 8000,
  };
  for (const skey of ["advies", "plus20", "optimaal", "min20"]) {
    const q = post[skey];
    if (!q) continue;
    const v = voorstel[skey];
    const delta = q.totaalUren - v;
    lines.push(
      `| ${skey} | ${v.toLocaleString("nl-NL")} | ${q.totaalUren.toLocaleString("nl-NL")} | ${delta >= 0 ? "+" : ""}${delta.toLocaleString("nl-NL")} |`,
    );
  }
  lines.push("");

  lines.push("## Per jaar (post) — uren vs urenBudget");
  lines.push("");
  for (const skey of ["advies", "plus20", "optimaal", "min20"]) {
    const q = post[skey];
    if (!q) continue;
    lines.push(`### ${skey}`);
    lines.push("");
    lines.push("| Jaar | Uren | Budget | Gap |");
    lines.push("|---|---:|---:|---:|");
    for (const t of q.perJaar) {
      lines.push(
        `| ${t.jaar} | ${t.uren.toLocaleString("nl-NL")} | ${t.urenBudget.toLocaleString("nl-NL")} | ${t.urenGap >= 0 ? "+" : ""}${t.urenGap.toLocaleString("nl-NL")} |`,
      );
    }
    lines.push("");
  }

  const auditPath = "c:/Users/pdebu/Projects VS code/DIN/AUDIT-LEZING-C-HERIJKING.md";
  writeFileSync(auditPath, lines.join("\n"), "utf-8");
  console.log(`\n[audit] geschreven: ${auditPath}`);

  // Audit-data JSON voor traceability
  writeFileSync(
    "c:/tmp/lezing-c-herijking-audit.json",
    JSON.stringify({ pre, post, rolStats, vUPIUpdated }, null, 2),
    "utf-8",
  );

  console.log("\nKLAAR.\n");
}

main().catch((e) => {
  console.error("ERR:", e);
  process.exit(1);
});
