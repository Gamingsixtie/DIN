/**
 * FINALE Stap 1 + Stap 7 — DIN-sessie d8b97442
 *
 * Idempotent script (marker: finaleStap1Stap7Applied).
 *
 * Voert door:
 *  1. Stap 1: 3 nieuwe custom-rollen toevoegen aan selectiePerDomein +
 *     customFunctiesPerDomein
 *       - mens: custom-hr-curriculum-mens (1) "HR-medewerker (curriculum + integratie)"
 *       - data_systemen: custom-mdw-bd-po (1) "Medewerker binnendienst (PO)"
 *       - data_systemen: custom-mdw-bd-vo (1) "Medewerker binnendienst (VO)"
 *  2. Stap 7 cleanup:
 *       - productmanager_int_zak definitief weg overal (sterke marker)
 *  3. Stap 7 herclassificatie mens + data_systemen volgens spec.
 *  4. Stap 7 split-rol data_systemen: accountmanager_c_prof_trainee (3)
 *     trainings_deelnemer naast bestaande accountmanager_c_prof (3) geconsulteerd.
 *  5. Stap 7 uren-niveaus per categorie + fase-detectie via
 *     begrotingAdvies.scenarios[].inspanningen[].verdelingPerJaar[].fase.
 *  6. Stap 7 pcts (programmaPct/lijnPct/raadplegenPct) per categorie.
 *  7. 2026 J1 half-jaar-cap (290u advies/plus20, 250u optimaal/min20):
 *     scaleerbare rollen ≠ trainings_deelnemer; verschil naar J2/J3 proportioneel.
 *  8. Aggregaten hercalculeren: jaar.totaalUren/programmaUren/lijnUren/raadplegenUren,
 *     domein.totaalUren/totaalKosten, scenario.totaalUren/totalenPerJaar.
 *  9. vUPI rollen ook bijwerken: urenTotaal = som over advies-scenario alle jaren.
 * 10. Sterke markers + audit-rapport.
 *
 * BELANGRIJK
 *  - Cultuur + processen worden NIET aangeraakt.
 *  - selectiePerDomein.aantal voor bestaande rollen blijft behouden.
 *  - Bestaande customs blijven (zoals custom-yara-* en custom-sven-*).
 *  - onderbouwing-tekst in vUPI: bestaande tekst wordt behouden indien aanwezig,
 *    anders aangevuld met categorie-context.
 */

import { createClient } from "@supabase/supabase-js";
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "fs";
import { join } from "path";

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
type Categorie = "leider" | "kernteam" | "trainings_deelnemer" | "geconsulteerd";
type Domein = "mens" | "data_systemen";

// ---------- spec ----------

// Stap 1 — nieuwe customs
const NIEUWE_CUSTOMS: Array<{
  domein: "mens" | "data_systemen";
  functieId: string;
  functieNaam: string;
  aantal: number;
  cluster: string;
  categorie: Categorie;
}> = [
  {
    domein: "mens",
    functieId: "custom-hr-curriculum-mens",
    functieNaam: "HR-medewerker (curriculum + integratie)",
    aantal: 1,
    cluster: "HR",
    categorie: "kernteam",
  },
  {
    domein: "data_systemen",
    functieId: "custom-mdw-bd-po",
    functieNaam: "Medewerker binnendienst (PO)",
    aantal: 1,
    cluster: "Sector PO",
    categorie: "kernteam",
  },
  {
    domein: "data_systemen",
    functieId: "custom-mdw-bd-vo",
    functieNaam: "Medewerker binnendienst (VO)",
    aantal: 1,
    cluster: "Sector VO",
    categorie: "kernteam",
  },
];

// Stap 7 — herclassificatie mens
const MENS_CATEGORIE: Record<string, Categorie> = {
  "custom-yara-mens-leider": "leider",
  sectormanager_po: "kernteam",
  sectormanager_vo: "kernteam",
  sectormanager_prof: "kernteam",
  manager_klantcontact: "kernteam",
  "custom-hr-curriculum-mens": "kernteam",
  klantenservice_c: "trainings_deelnemer",
  trainer_adviseur_a: "trainings_deelnemer",
  accountmanager_c: "trainings_deelnemer",
  mdw_binnendienst_b: "trainings_deelnemer",
  accountmanager_c_prof: "trainings_deelnemer",
  accountmanager_a: "trainings_deelnemer",
  accountmanager_b: "trainings_deelnemer",
  klantenservice_a: "trainings_deelnemer",
  klantenservice_b: "trainings_deelnemer",
  mdw_binnendienst_a: "trainings_deelnemer",
  teamleider_klantenservice: "trainings_deelnemer",
  productmanager_dst: "geconsulteerd",
  productmanager_klt: "geconsulteerd",
  campagne_marketeer_a: "geconsulteerd",
  campagne_marketeer_b: "geconsulteerd",
  junior_marketeer_prof: "geconsulteerd",
  teamleider_trainingen: "geconsulteerd",
};

// Stap 7 — herclassificatie data_systemen
const DATA_CATEGORIE: Record<string, Categorie> = {
  "custom-sven-data-leider": "leider",
  projectmanager_d: "kernteam",
  procesmanager_data: "kernteam",
  "custom-mdw-bd-po": "kernteam",
  "custom-mdw-bd-vo": "kernteam",
  mdw_binnendienst_a_prof: "kernteam",
  trainer_adviseur_a: "trainings_deelnemer",
  productmanager_dst: "trainings_deelnemer",
  productmanager_kib: "trainings_deelnemer",
  productmanager_klt: "trainings_deelnemer",
  productmanager_lib: "trainings_deelnemer",
  productmanager_nt2: "trainings_deelnemer",
  productmanager_cvvo: "trainings_deelnemer",
  sectormanager_po: "trainings_deelnemer",
  sectormanager_vo: "trainings_deelnemer",
  sectormanager_prof: "trainings_deelnemer",
  content_specialist: "trainings_deelnemer",
  manager_dt: "geconsulteerd",
  productowner_a_website: "geconsulteerd",
  productowner_b_producten: "geconsulteerd",
  business_info_analist_c: "geconsulteerd",
  manager_klantcontact: "geconsulteerd",
  campagne_marketeer_a: "geconsulteerd",
  campagne_marketeer_b: "geconsulteerd",
  junior_marketeer_prof: "geconsulteerd",
  teamleider_trainingen: "geconsulteerd",
  // De originele accountmanager_c_prof (3) blijft geconsulteerd; de
  // split-rol accountmanager_c_prof_trainee wordt apart toegevoegd.
  accountmanager_c_prof: "geconsulteerd",
  accountmanager_c_prof_trainee: "trainings_deelnemer",
};

// Pcts per categorie
function pctsVoor(categorie: Categorie | undefined, domein: string): {
  programmaPct: number;
  lijnPct: number;
  raadplegenPct: number;
} {
  if (!categorie) return { programmaPct: 0, lijnPct: 0, raadplegenPct: 0 };
  switch (categorie) {
    case "leider":
      return { programmaPct: 0.9, lijnPct: 0.1, raadplegenPct: 0 };
    case "kernteam":
      return { programmaPct: 0.8, lijnPct: 0.2, raadplegenPct: 0 };
    case "trainings_deelnemer":
      // mens: 50/50, data: 70/30
      return domein === "data_systemen"
        ? { programmaPct: 0.7, lijnPct: 0.3, raadplegenPct: 0 }
        : { programmaPct: 0.5, lijnPct: 0.5, raadplegenPct: 0 };
    case "geconsulteerd":
      return { programmaPct: 0, lijnPct: 0, raadplegenPct: 1 };
  }
}

// Uren-niveaus per categorie
const UREN_LEIDER = { piek: 80, nietPiek: 40, borging: 25 };
const UREN_KERNTEAM = { piek: 40, nietPiek: 15, borging: 10 };
const UREN_TRAINING_MENS = { basis: 24, vaardigheid: 22 };
const UREN_TRAINING_DATA = { realisatie: 14, acceptatie: 14 };
const UREN_GECONSULTEERD_PER_PIEK = 3;

// 2026 J1 half-jaar caps
const J1_CAP: Record<string, number> = {
  advies: 290,
  plus20: 290,
  optimaal: 250,
  min20: 250,
};

// ---------- fase classification ----------
type FaseCategorie =
  | "piek"
  | "niet_piek"
  | "borging"
  | "trainings_basis"
  | "trainings_vaardigheid"
  | "data_realisatie"
  | "data_acceptatie"
  | "geen";

function classifyFase(
  fase: string,
  jaarIndex: number,
  aantalJaren: number,
  domein: string,
): FaseCategorie {
  const f = (fase ?? "").toLowerCase();

  // Mens — trainings-fasen
  if (domein === "mens") {
    if (/basistraining/.test(f) || /^basis$/.test(f)) return "trainings_basis";
    if (/vaardigheidstraining/.test(f) || /vaardigheid/.test(f))
      return "trainings_vaardigheid";
  }

  // Data — realisatie/acceptatie-fasen voor trainings-deelnemers (CRM key-user)
  if (domein === "data_systemen") {
    if (/realisatie/.test(f)) return "data_realisatie";
    if (/acceptatie/.test(f)) return "data_acceptatie";
  }

  // Borging-jaren in lange scenario's
  const borgingPattern =
    /(beheer|optim|doorontw|continu|continue|verank|borging|standaardisatie|waardenverank|rolmodel-werking|in beheer|in lijn)/;
  const isLangScenario = aantalJaren >= 7;
  const isBorgingJaar = isLangScenario && jaarIndex >= 4;
  if (isBorgingJaar && borgingPattern.test(f)) return "borging";

  // Piek-fasen
  if (/realisatie/.test(f)) return "piek";
  if (/acceptatie/.test(f)) return "piek";
  if (/pilot/.test(f)) return "piek";
  if (/basistraining/.test(f)) return "piek";
  if (/vaardigheid/.test(f)) return "piek";
  if (/uitrol/.test(f) && !borgingPattern.test(f)) return "piek";
  if (/^adoptie/.test(f)) return "piek";
  if (/go-live/.test(f)) return "piek";
  if (/toepassing/.test(f)) return "piek";
  if (/rolmodelgedrag/.test(f)) return "piek";

  if (/reservering|onvoorzien/.test(f)) return "geen";

  if (borgingPattern.test(f)) return "niet_piek";

  return "niet_piek";
}

// Detect "first peak" and "second peak" indices for geconsulteerd
function findFirstTweePieken(faseTypes: FaseCategorie[]): [number, number] | null {
  const piekIdx = faseTypes
    .map((t, i) =>
      t === "piek" ||
      t === "trainings_basis" ||
      t === "trainings_vaardigheid" ||
      t === "data_realisatie" ||
      t === "data_acceptatie"
        ? i
        : -1,
    )
    .filter((i) => i !== -1);
  if (piekIdx.length >= 2) return [piekIdx[0], piekIdx[1]];
  if (piekIdx.length === 1) return [piekIdx[0], piekIdx[0]];
  return null;
}

// Uren per jaar voor 1 persoon, gegeven categorie + fase-types
function urenPerJaarPerPersoon(
  categorie: Categorie,
  domein: Domein,
  faseTypes: FaseCategorie[],
): number[] {
  const aantalJaren = faseTypes.length;
  const uren = new Array(aantalJaren).fill(0);

  if (categorie === "leider" || categorie === "kernteam") {
    const lvl = categorie === "leider" ? UREN_LEIDER : UREN_KERNTEAM;
    for (let i = 0; i < aantalJaren; i++) {
      const t = faseTypes[i];
      if (t === "geen") continue;
      if (t === "borging") uren[i] = lvl.borging;
      else if (
        t === "piek" ||
        t === "trainings_basis" ||
        t === "trainings_vaardigheid" ||
        t === "data_realisatie" ||
        t === "data_acceptatie"
      )
        uren[i] = lvl.piek;
      else uren[i] = lvl.nietPiek;
    }
  } else if (categorie === "trainings_deelnemer") {
    if (domein === "mens") {
      // 24u in basis-jaar + 22u in vaardigheid-jaar (uit fase-detectie)
      let basisIdx = faseTypes.findIndex((t) => t === "trainings_basis");
      let vaardIdx = faseTypes.findIndex((t) => t === "trainings_vaardigheid");
      // Fallback: gebruik eerste 2 piek-jaren als geen training-fases gevonden
      if (basisIdx === -1 || vaardIdx === -1) {
        const pieken = findFirstTweePieken(faseTypes);
        if (pieken) {
          if (basisIdx === -1) basisIdx = pieken[0];
          if (vaardIdx === -1 || vaardIdx === basisIdx) vaardIdx = pieken[1];
        }
      }
      if (basisIdx !== -1) uren[basisIdx] = UREN_TRAINING_MENS.basis;
      if (vaardIdx !== -1 && vaardIdx !== basisIdx)
        uren[vaardIdx] = UREN_TRAINING_MENS.vaardigheid;
      else if (vaardIdx === basisIdx && basisIdx !== -1)
        uren[basisIdx] = UREN_TRAINING_MENS.basis + UREN_TRAINING_MENS.vaardigheid;
    } else {
      // data: 14u realisatie + 14u acceptatie
      let realIdx = faseTypes.findIndex((t) => t === "data_realisatie");
      let accIdx = faseTypes.findIndex((t) => t === "data_acceptatie");
      if (realIdx === -1 || accIdx === -1) {
        const pieken = findFirstTweePieken(faseTypes);
        if (pieken) {
          if (realIdx === -1) realIdx = pieken[0];
          if (accIdx === -1 || accIdx === realIdx) accIdx = pieken[1];
        }
      }
      if (realIdx !== -1) uren[realIdx] = UREN_TRAINING_DATA.realisatie;
      if (accIdx !== -1 && accIdx !== realIdx)
        uren[accIdx] = UREN_TRAINING_DATA.acceptatie;
      else if (accIdx === realIdx && realIdx !== -1)
        uren[realIdx] = UREN_TRAINING_DATA.realisatie + UREN_TRAINING_DATA.acceptatie;
    }
  } else if (categorie === "geconsulteerd") {
    const pieken = findFirstTweePieken(faseTypes);
    if (pieken) {
      uren[pieken[0]] += UREN_GECONSULTEERD_PER_PIEK;
      if (pieken[1] !== pieken[0]) uren[pieken[1]] += UREN_GECONSULTEERD_PER_PIEK;
      else uren[pieken[0]] = 6;
    }
  }
  return uren;
}

// ---------- aggregate helpers ----------

function tariefVoorJaar(jaar: number, basisTarief: number, indexatie: number, refJaar: number): number {
  return Math.round(basisTarief * Math.pow(1 + indexatie, jaar - refJaar));
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
  const s7 = root?.crossAnalyseWizard?.stepResults?.stap4?.stap7InterneUren;
  if (!s7) throw new Error("stap7InterneUren niet gevonden");

  // Idempotency check
  if (s7.finaleStap1Stap7Applied === true) {
    console.log("[idempotent] finaleStap1Stap7Applied is al true; geen wijzigingen.");
    return;
  }

  // Pre-state backup
  const backupDir = "c:/tmp";
  if (!existsSync(backupDir)) mkdirSync(backupDir, { recursive: true });
  const ts = new Date().toISOString().replace(/[:.]/g, "-");
  const backupPath = `${backupDir}/backup-finale-${ts}.json`;
  writeFileSync(backupPath, JSON.stringify(root, null, 2), "utf-8");
  console.log(`[backup] saved to ${backupPath}`);

  const ba = root.crossAnalyseWizard.stepResults.stap4.begrotingAdvies;
  if (!ba?.scenarios) throw new Error("begrotingAdvies.scenarios niet gevonden");

  // Pre-state samenvatting
  const preState: Record<string, any> = {};
  for (const skey of Object.keys(s7.scenarios ?? {})) {
    const sc = s7.scenarios[skey];
    if (!sc) continue;
    preState[skey] = {
      totaalUren: sc.totaalUren,
      j1: 0,
      perDomein: {} as Record<string, number>,
    };
    for (const idx of Object.keys(sc.domeinen ?? {})) {
      const d = sc.domeinen[idx];
      preState[skey].perDomein[d.domein] = d.totaalUren ?? d.uren ?? 0;
      const j1 = (d.jaren ?? [])[0];
      if (j1) {
        preState[skey].j1 += (j1.rollen ?? []).reduce(
          (s: number, r: any) => s + (r.uren ?? 0),
          0,
        );
      }
    }
  }

  const auditLog: string[] = [];
  const log = (m: string) => {
    console.log(m);
    auditLog.push(m);
  };

  // ============ STAP 1 — nieuwe customs ============
  log("\n[stap 1] Nieuwe customs toevoegen...");
  s7.selectiePerDomein = s7.selectiePerDomein ?? {};
  s7.customFunctiesPerDomein = s7.customFunctiesPerDomein ?? {};
  for (const dom of ["mens", "data_systemen", "cultuur", "processen"]) {
    s7.selectiePerDomein[dom] = s7.selectiePerDomein[dom] ?? {};
    s7.customFunctiesPerDomein[dom] = s7.customFunctiesPerDomein[dom] ?? [];
  }

  for (const c of NIEUWE_CUSTOMS) {
    if (!s7.selectiePerDomein[c.domein][c.functieId]) {
      s7.selectiePerDomein[c.domein][c.functieId] = {
        aantal: c.aantal,
        functieNaam: c.functieNaam,
        cluster: c.cluster,
      };
      log(`  + selectiePerDomein.${c.domein}.${c.functieId} (aantal=${c.aantal})`);
    }
    const arr = s7.customFunctiesPerDomein[c.domein] as Array<any>;
    if (!arr.find((x) => x.id === c.functieId)) {
      arr.push({ id: c.functieId, naam: c.functieNaam, cluster: c.cluster });
      log(`  + customFunctiesPerDomein.${c.domein} <- ${c.functieId}`);
    }
  }

  // Split-rol data_systemen — accountmanager_c_prof_trainee
  const SPLIT_TRAINEE_ID = "accountmanager_c_prof_trainee";
  const SPLIT_TRAINEE_NAAM = "Accountmanager C (Professionals) — trainee";
  if (!s7.selectiePerDomein.data_systemen[SPLIT_TRAINEE_ID]) {
    s7.selectiePerDomein.data_systemen[SPLIT_TRAINEE_ID] = {
      aantal: 3,
      functieNaam: SPLIT_TRAINEE_NAAM,
      cluster: "Sector Professionals",
    };
    log(`  + selectiePerDomein.data_systemen.${SPLIT_TRAINEE_ID} (aantal=3, split-rol)`);
  }
  const dsCustoms = s7.customFunctiesPerDomein.data_systemen as Array<any>;
  if (!dsCustoms.find((x) => x.id === SPLIT_TRAINEE_ID)) {
    dsCustoms.push({
      id: SPLIT_TRAINEE_ID,
      naam: SPLIT_TRAINEE_NAAM,
      cluster: "Sector Professionals",
    });
    log(`  + customFunctiesPerDomein.data_systemen <- ${SPLIT_TRAINEE_ID}`);
  }

  // ============ STAP 7 cleanup — int_zak ============
  log("\n[stap 7 cleanup] productmanager_int_zak definitief weg...");
  for (const dom of ["mens", "data_systemen", "cultuur", "processen"]) {
    if (s7.selectiePerDomein[dom]?.productmanager_int_zak) {
      delete s7.selectiePerDomein[dom].productmanager_int_zak;
      log(`  - selectiePerDomein.${dom}.productmanager_int_zak`);
    }
    const cf = s7.customFunctiesPerDomein[dom] as Array<any> | undefined;
    if (cf) {
      const before = cf.length;
      s7.customFunctiesPerDomein[dom] = cf.filter((x) => x.id !== "productmanager_int_zak");
      if (s7.customFunctiesPerDomein[dom].length < before)
        log(`  - customFunctiesPerDomein.${dom} <- productmanager_int_zak`);
    }
  }
  // vUPI
  const vupi = s7.vastgesteldeUrenPerInspanning;
  if (Array.isArray(vupi)) {
    for (const grp of vupi) {
      const before = grp.rollen?.length ?? 0;
      grp.rollen = (grp.rollen ?? []).filter(
        (r: any) => r.functieId !== "productmanager_int_zak",
      );
      if (grp.rollen.length < before) log(`  - vUPI[${grp.domein}] <- productmanager_int_zak`);
    }
  } else if (vupi && typeof vupi === "object") {
    for (const k of Object.keys(vupi)) {
      const grp = vupi[k];
      const before = grp.rollen?.length ?? 0;
      grp.rollen = (grp.rollen ?? []).filter(
        (r: any) => r.functieId !== "productmanager_int_zak",
      );
      if (grp.rollen.length < before)
        log(`  - vUPI[${k}](${grp.domein}) <- productmanager_int_zak`);
    }
  }
  // scenarios
  for (const skey of Object.keys(s7.scenarios ?? {})) {
    const sc = s7.scenarios[skey];
    if (!sc) continue;
    const domeinen = Array.isArray(sc.domeinen) ? sc.domeinen : Object.values(sc.domeinen ?? {});
    for (const d of domeinen as any[]) {
      for (const j of d.jaren ?? []) {
        const before = j.rollen?.length ?? 0;
        j.rollen = (j.rollen ?? []).filter((r: any) => r.functieId !== "productmanager_int_zak");
        if (j.rollen.length < before) {
          log(`  - scenario[${skey}].${d.domein}.jaar${j.jaar} <- int_zak`);
        }
      }
    }
  }

  // ============ STAP 7 — herclassificatie + uren ============
  log("\n[stap 7] Herclassificatie mens + data_systemen + uren-niveaus...");

  const tarief = s7.uurtariefSettings?.basisTarief ?? 70;
  const indexatie = s7.uurtariefSettings?.indexatiePercentage ?? 0.05;
  const refJaar = s7.uurtariefSettings?.referentiejaar ?? 2025;

  // Helper: get aantal voor een functieId in een domein (uit selectiePerDomein)
  function aantalVoor(domein: string, functieId: string): number {
    return s7.selectiePerDomein?.[domein]?.[functieId]?.aantal ?? 1;
  }

  // Helper: classify per jaar voor een domein in een scenario
  function getFaseTypes(skey: string, domein: string): { faseTypes: FaseCategorie[]; jaren: number[] } {
    const baSc = ba.scenarios[skey];
    if (!baSc) return { faseTypes: [], jaren: [] };
    const ins = (baSc.inspanningen ?? []).find((i: any) => i.domein === domein);
    if (!ins) return { faseTypes: [], jaren: [] };
    const verd = ins.verdelingPerJaar ?? [];
    const aantalJaren = baSc.aantalJaren ?? verd.length;
    const faseTypes: FaseCategorie[] = verd.map((v: any, i: number) =>
      classifyFase(v.fase, i, aantalJaren, domein),
    );
    const jaren: number[] = verd.map((v: any) => v.jaar);
    return { faseTypes, jaren };
  }

  // Helper: getCategorie voor een functieId per domein
  function getCategorie(domein: string, functieId: string): Categorie | undefined {
    if (domein === "mens") return MENS_CATEGORIE[functieId];
    if (domein === "data_systemen") return DATA_CATEGORIE[functieId];
    return undefined; // cultuur+processen niet aanraken
  }

  // -------- Voor mens/data_systemen: rollen-set per scenario hercalculeren --------
  for (const skey of Object.keys(s7.scenarios ?? {})) {
    const sc = s7.scenarios[skey];
    if (!sc) continue;

    const domeinKeys = Array.isArray(sc.domeinen)
      ? sc.domeinen.map((_: any, i: number) => i)
      : Object.keys(sc.domeinen ?? {});

    for (const dKey of domeinKeys) {
      const dEntry = sc.domeinen[dKey];
      const dom = dEntry.domein as string;
      if (dom !== "mens" && dom !== "data_systemen") continue;

      const { faseTypes, jaren } = getFaseTypes(skey, dom);
      if (jaren.length === 0) continue;

      // Bepaal welke rollen we willen (uit selectiePerDomein voor dit domein)
      const sel = s7.selectiePerDomein[dom] ?? {};
      const newJaren = jaren.map((jr) => ({ jaar: jr, rollen: [] as any[] }));

      for (const fid of Object.keys(sel)) {
        const cat = getCategorie(dom, fid);
        if (!cat) {
          // onbekend — sla over (mag niet voorkomen)
          continue;
        }
        const aantal = sel[fid]?.aantal ?? 1;
        const upPP = urenPerJaarPerPersoon(cat, dom as Domein, faseTypes);
        for (let i = 0; i < jaren.length; i++) {
          const upp = upPP[i];
          if (upp <= 0) continue;
          const totUren = upp * aantal;
          const tj = tariefVoorJaar(jaren[i], tarief, indexatie, refJaar);
          const pcts = pctsVoor(cat, dom);
          newJaren[i].rollen.push({
            functieId: fid,
            functieNaam: sel[fid]?.functieNaam ?? fid,
            uren: totUren,
            urenPerPersoon: upp,
            aantal,
            uurtarief: tj,
            kosten: totUren * tj,
            categorie: cat,
            programmaPct: pcts.programmaPct,
            lijnPct: pcts.lijnPct,
            raadplegenPct: pcts.raadplegenPct,
          });
        }
      }
      dEntry.jaren = newJaren;
    }
  }

  // -------- 2026 J1 half-jaar-cap --------
  log("\n[stap 7] 2026 J1 half-jaar-cap toepassen...");
  for (const skey of Object.keys(s7.scenarios ?? {})) {
    const sc = s7.scenarios[skey];
    if (!sc) continue;
    const cap = J1_CAP[skey];
    if (!cap) continue;

    const domeinKeys = Array.isArray(sc.domeinen)
      ? sc.domeinen.map((_: any, i: number) => i)
      : Object.keys(sc.domeinen ?? {});

    // Verzamel J1-rollen (jaar 2026) over ALLE domeinen
    let j1Huidig = 0;
    type J1Ref = { dKey: any; dEntry: any; jaarObj: any; rolIdx: number; rol: any };
    const j1Refs: J1Ref[] = [];
    for (const dKey of domeinKeys) {
      const dEntry = sc.domeinen[dKey];
      const j2026 = (dEntry.jaren ?? []).find((j: any) => j.jaar === 2026);
      if (!j2026) continue;
      for (let i = 0; i < (j2026.rollen ?? []).length; i++) {
        const r = j2026.rollen[i];
        j1Huidig += r.uren ?? 0;
        j1Refs.push({ dKey, dEntry, jaarObj: j2026, rolIdx: i, rol: r });
      }
    }

    if (j1Huidig <= cap) {
      log(`  [${skey}] J1=${j1Huidig}u ≤ cap ${cap}u — geen schaling.`);
      continue;
    }

    const factor = cap / j1Huidig;
    log(`  [${skey}] J1=${j1Huidig}u > cap ${cap}u — factor ${factor.toFixed(4)}.`);

    // Schaal alleen niet-trainings_deelnemer rollen, en distribueer surplus naar J2/J3
    // proportioneel aan huidige J2/J3-uren van die rol.
    for (const ref of j1Refs) {
      const r = ref.rol;
      if (r.categorie === "trainings_deelnemer") continue;
      const oudeUren = r.uren ?? 0;
      const nieuweUren = Math.round(oudeUren * factor);
      const surplus = oudeUren - nieuweUren;
      r.uren = nieuweUren;
      r.urenPerPersoon = r.aantal > 0 ? Math.round(nieuweUren / r.aantal) : nieuweUren;
      r.kosten = nieuweUren * (r.uurtarief ?? tariefVoorJaar(2026, tarief, indexatie, refJaar));

      if (surplus <= 0) continue;

      // Vind dezelfde rol in J2 en J3 binnen hetzelfde domein
      const j2 = (ref.dEntry.jaren ?? []).find((j: any) => j.jaar === 2027);
      const j3 = (ref.dEntry.jaren ?? []).find((j: any) => j.jaar === 2028);
      const r2 = j2?.rollen?.find((x: any) => x.functieId === r.functieId);
      const r3 = j3?.rollen?.find((x: any) => x.functieId === r.functieId);
      const j2u = r2?.uren ?? 0;
      const j3u = r3?.uren ?? 0;
      const total23 = j2u + j3u;
      let toJ2 = surplus, toJ3 = 0;
      if (total23 > 0) {
        toJ2 = Math.round((j2u / total23) * surplus);
        toJ3 = surplus - toJ2;
      } else if (r2 && r3) {
        toJ2 = Math.round(surplus / 2);
        toJ3 = surplus - toJ2;
      } else if (r3 && !r2) {
        toJ2 = 0;
        toJ3 = surplus;
      }
      if (r2 && toJ2 > 0) {
        r2.uren = (r2.uren ?? 0) + toJ2;
        r2.urenPerPersoon = r2.aantal > 0 ? Math.round(r2.uren / r2.aantal) : r2.uren;
        r2.kosten = r2.uren * (r2.uurtarief ?? tariefVoorJaar(2027, tarief, indexatie, refJaar));
      } else if (!r2 && j2 && toJ2 > 0) {
        // rol bestaat niet in J2 — voeg toe
        const tj = tariefVoorJaar(2027, tarief, indexatie, refJaar);
        const pcts = pctsVoor(r.categorie, ref.dEntry.domein);
        j2.rollen.push({
          functieId: r.functieId,
          functieNaam: r.functieNaam,
          uren: toJ2,
          urenPerPersoon: r.aantal > 0 ? Math.round(toJ2 / r.aantal) : toJ2,
          aantal: r.aantal,
          uurtarief: tj,
          kosten: toJ2 * tj,
          categorie: r.categorie,
          programmaPct: pcts.programmaPct,
          lijnPct: pcts.lijnPct,
          raadplegenPct: pcts.raadplegenPct,
        });
      }
      if (r3 && toJ3 > 0) {
        r3.uren = (r3.uren ?? 0) + toJ3;
        r3.urenPerPersoon = r3.aantal > 0 ? Math.round(r3.uren / r3.aantal) : r3.uren;
        r3.kosten = r3.uren * (r3.uurtarief ?? tariefVoorJaar(2028, tarief, indexatie, refJaar));
      } else if (!r3 && j3 && toJ3 > 0) {
        const tj = tariefVoorJaar(2028, tarief, indexatie, refJaar);
        const pcts = pctsVoor(r.categorie, ref.dEntry.domein);
        j3.rollen.push({
          functieId: r.functieId,
          functieNaam: r.functieNaam,
          uren: toJ3,
          urenPerPersoon: r.aantal > 0 ? Math.round(toJ3 / r.aantal) : toJ3,
          aantal: r.aantal,
          uurtarief: tj,
          kosten: toJ3 * tj,
          categorie: r.categorie,
          programmaPct: pcts.programmaPct,
          lijnPct: pcts.lijnPct,
          raadplegenPct: pcts.raadplegenPct,
        });
      }
    }
  }

  // -------- Aggregaten hercalculeren --------
  log("\n[stap 7] Aggregaten hercalculeren...");
  for (const skey of Object.keys(s7.scenarios ?? {})) {
    const sc = s7.scenarios[skey];
    if (!sc) continue;

    const domeinKeys = Array.isArray(sc.domeinen)
      ? sc.domeinen.map((_: any, i: number) => i)
      : Object.keys(sc.domeinen ?? {});

    let scTotU = 0;
    let scTotK = 0;
    let scProg = 0;
    let scLijn = 0;
    let scRaad = 0;
    const totPerJaar: Record<number, { uren: number; kosten: number; prog: number; lijn: number; raad: number }> = {};

    for (const dKey of domeinKeys) {
      const d = sc.domeinen[dKey];
      let domU = 0,
        domK = 0,
        domProg = 0,
        domLijn = 0,
        domRaad = 0;

      for (const j of d.jaren ?? []) {
        let jU = 0,
          jK = 0,
          jP = 0,
          jL = 0,
          jR = 0;
        for (const r of j.rollen ?? []) {
          const u = r.uren ?? 0;
          const k = r.kosten ?? 0;
          jU += u;
          jK += k;
          jP += u * (r.programmaPct ?? 0);
          jL += u * (r.lijnPct ?? 0);
          jR += u * (r.raadplegenPct ?? 0);
        }
        j.totaalUren = jU;
        j.totaalKosten = jK;
        j.programmaUren = Math.round(jP);
        j.lijnUren = Math.round(jL);
        j.raadplegenUren = Math.round(jR);

        domU += jU;
        domK += jK;
        domProg += jP;
        domLijn += jL;
        domRaad += jR;

        totPerJaar[j.jaar] = totPerJaar[j.jaar] ?? { uren: 0, kosten: 0, prog: 0, lijn: 0, raad: 0 };
        totPerJaar[j.jaar].uren += jU;
        totPerJaar[j.jaar].kosten += jK;
        totPerJaar[j.jaar].prog += jP;
        totPerJaar[j.jaar].lijn += jL;
        totPerJaar[j.jaar].raad += jR;
      }

      d.totaalUren = domU;
      d.uren = domU; // legacy alias
      d.totaalKosten = domK;
      d.programmaUren = Math.round(domProg);
      d.lijnUren = Math.round(domLijn);
      d.raadplegenUren = Math.round(domRaad);
      d.programmaPct = domU > 0 ? domProg / domU : 0;

      scTotU += domU;
      scTotK += domK;
      scProg += domProg;
      scLijn += domLijn;
      scRaad += domRaad;
    }

    sc.totaalUren = scTotU;
    sc.totaalKosten = scTotK;
    sc.programmaUren = Math.round(scProg);
    sc.lijnUren = Math.round(scLijn);
    sc.raadplegenUren = Math.round(scRaad);

    // totalenPerJaar: behoud urenBudget
    const urenBudgetMap: Record<number, number> = {};
    for (const t of sc.totalenPerJaar ?? []) {
      urenBudgetMap[t.jaar] = t.urenBudget ?? 540;
    }
    const sortedJaren = Object.keys(totPerJaar)
      .map((x) => Number(x))
      .sort((a, b) => a - b);
    sc.totalenPerJaar = sortedJaren.map((jr) => {
      const tj = totPerJaar[jr];
      const ub = urenBudgetMap[jr] ?? 540;
      return {
        jaar: jr,
        uren: tj.uren,
        kosten: tj.kosten,
        programmaUren: Math.round(tj.prog),
        lijnUren: Math.round(tj.lijn),
        raadplegenUren: Math.round(tj.raad),
        urenBudget: ub,
        urenGap: tj.uren - ub,
      };
    });
  }

  // -------- vUPI rollen bijwerken --------
  log("\n[stap 7] vUPI rollen bijwerken (urenTotaal = som over advies-scenario)...");
  const adviesSc = s7.scenarios.advies;

  function vupiUpdateForDomein(grp: any) {
    const dom = grp.domein;
    if (dom !== "mens" && dom !== "data_systemen") return;

    // Build map: functieId -> { totaalUren over advies-jaren, totaalKosten, urenPerPersoon-totaal, aantal, categorie }
    const adviesDomKey = Array.isArray(adviesSc.domeinen)
      ? adviesSc.domeinen.findIndex((d: any) => d.domein === dom)
      : Object.keys(adviesSc.domeinen).find((k) => adviesSc.domeinen[k].domein === dom);
    if (adviesDomKey === -1 || adviesDomKey === undefined) return;
    const adviesDom = adviesSc.domeinen[adviesDomKey as any];

    const totMap: Record<string, { uren: number; kosten: number; aantal: number; cat: Categorie; functieNaam: string; afdeling?: string }> = {};
    for (const j of adviesDom.jaren ?? []) {
      for (const r of j.rollen ?? []) {
        const fid = r.functieId;
        if (!totMap[fid]) {
          totMap[fid] = {
            uren: 0,
            kosten: 0,
            aantal: r.aantal,
            cat: r.categorie,
            functieNaam: r.functieNaam,
          };
        }
        totMap[fid].uren += r.uren ?? 0;
        totMap[fid].kosten += r.kosten ?? 0;
      }
    }

    // Build new rollen array — gebaseerd op selectiePerDomein om volgorde stabiel te houden
    const sel = s7.selectiePerDomein[dom] ?? {};
    const newRollen: any[] = [];
    for (const fid of Object.keys(sel)) {
      const cat = getCategorie(dom, fid);
      if (!cat) continue;
      const tot = totMap[fid];
      const aantal = sel[fid]?.aantal ?? 1;
      const urenTotaal = tot?.uren ?? 0;
      const urenPerPersoon = aantal > 0 ? Math.round(urenTotaal / aantal) : urenTotaal;
      const pcts = pctsVoor(cat, dom);

      // Behoud bestaande onderbouwing-tekst
      const bestaand = (grp.rollen ?? []).find((x: any) => x.functieId === fid);
      const onderbouwing =
        bestaand?.onderbouwing ??
        `Categorie ${cat}: ${aantal} persoon/personen × ${urenPerPersoon}u over advies-scenario (4 jaar).`;

      newRollen.push({
        functieId: fid,
        functieNaam: sel[fid]?.functieNaam ?? bestaand?.functieNaam ?? fid,
        afdeling: bestaand?.afdeling ?? sel[fid]?.cluster,
        urenTotaal,
        aantal,
        categorie: cat,
        programmaPct: pcts.programmaPct,
        lijnPct: pcts.lijnPct,
        raadplegenPct: pcts.raadplegenPct,
        onderbouwing,
      });
    }
    grp.rollen = newRollen;
  }

  if (Array.isArray(vupi)) {
    for (const grp of vupi) vupiUpdateForDomein(grp);
  } else if (vupi && typeof vupi === "object") {
    for (const k of Object.keys(vupi)) vupiUpdateForDomein(vupi[k]);
  }

  // -------- Markers ============
  s7.finaleStap1Stap7Applied = true;
  s7.productmanagerIntZakDefinitiefWeg = true;
  s7.finaleStap1Stap7AppliedMeta = {
    timestamp: new Date().toISOString(),
    versie: 1,
    cleanupActies: [
      "productmanager_int_zak definitief weg uit selectiePerDomein, customFunctiesPerDomein, vUPI, alle scenario.jaren.rollen",
      "3 nieuwe customs toegevoegd: custom-hr-curriculum-mens (mens), custom-mdw-bd-po + custom-mdw-bd-vo (data_systemen)",
      "Split-rol accountmanager_c_prof_trainee toegevoegd in data_systemen",
      "mens + data_systemen herclassificatie (leider/kernteam/trainings_deelnemer/geconsulteerd)",
      "uren-niveaus per categorie (leider 80/40/25, kernteam 40/15/10, trainings-mens 24+22, trainings-data 14+14, geconsulteerd 3+3)",
      "pcts per categorie (leider 0.9/0.1/0, kernteam 0.8/0.2/0, trainings-mens 0.5/0.5/0, trainings-data 0.7/0.3/0, geconsulteerd 0/0/1)",
      "2026 J1 half-jaar-cap: advies/plus20=290u, optimaal/min20=250u — surplus naar J2/J3 proportioneel",
      "vUPI urenTotaal hercalculeerd op basis van advies-scenario som per rol",
      "cultuur + processen ongewijzigd",
    ],
  };

  // ============ SAVE ============
  log("\n[save] Schrijven naar Supabase...");
  const { error: upErr } = await supa
    .from("din_sessions")
    .update({ data: root, updated_at: new Date().toISOString() })
    .eq("id", SESSION_ID);
  if (upErr) throw upErr;
  log("[save] OK.");

  // ============ POST-state samenvatting ============
  const postState: Record<string, any> = {};
  for (const skey of Object.keys(s7.scenarios ?? {})) {
    const sc = s7.scenarios[skey];
    if (!sc) continue;
    postState[skey] = {
      totaalUren: sc.totaalUren,
      j1: 0,
      perDomein: {} as Record<string, number>,
    };
    for (const idx of Object.keys(sc.domeinen ?? {})) {
      const d = sc.domeinen[idx];
      postState[skey].perDomein[d.domein] = d.totaalUren ?? 0;
      const j1 = (d.jaren ?? []).find((j: any) => j.jaar === 2026);
      if (j1) {
        postState[skey].j1 += (j1.rollen ?? []).reduce(
          (s: number, r: any) => s + (r.uren ?? 0),
          0,
        );
      }
    }
  }

  log("\n=== VOOR/NA SCENARIO TOTALEN ===");
  for (const skey of Object.keys(preState)) {
    const pre = preState[skey];
    const post = postState[skey];
    log(`\n[${skey}]`);
    log(`  totaalUren: ${pre.totaalUren} → ${post.totaalUren}`);
    log(`  J1 (2026):  ${pre.j1} → ${post.j1} (cap=${J1_CAP[skey] ?? "-"})`);
    for (const dom of new Set([...Object.keys(pre.perDomein), ...Object.keys(post.perDomein)])) {
      log(`  ${dom.padEnd(15)}: ${pre.perDomein[dom] ?? 0} → ${post.perDomein[dom] ?? 0}`);
    }
  }

  // ============ Per domein per categorie aantal personen ============
  log("\n=== PER DOMEIN PER CATEGORIE (aantal personen) ===");
  const personenPerDomeinCat: Record<string, Record<string, number>> = {};
  for (const dom of ["mens", "data_systemen"]) {
    personenPerDomeinCat[dom] = { leider: 0, kernteam: 0, trainings_deelnemer: 0, geconsulteerd: 0 };
    const sel = s7.selectiePerDomein[dom] ?? {};
    for (const fid of Object.keys(sel)) {
      const cat = getCategorie(dom, fid);
      if (!cat) continue;
      personenPerDomeinCat[dom][cat] += sel[fid]?.aantal ?? 1;
    }
    log(`\n${dom}:`);
    for (const cat of Object.keys(personenPerDomeinCat[dom])) {
      log(`  ${cat.padEnd(20)}: ${personenPerDomeinCat[dom][cat]}`);
    }
  }

  // ============ Audit-rapport ============
  const lines: string[] = [];
  lines.push("# AUDIT — Finale Stap 1 + Stap 7 (DIN-sessie d8b97442)");
  lines.push("");
  lines.push(`Sessie-ID: ${SESSION_ID}`);
  lines.push(`Timestamp: ${new Date().toISOString()}`);
  lines.push(`Backup: ${backupPath}`);
  lines.push("");
  lines.push("## Cleanup-acties");
  for (const a of s7.finaleStap1Stap7AppliedMeta.cleanupActies) {
    lines.push(`- ${a}`);
  }
  lines.push("");
  lines.push("## Toegevoegde rollen (selectiePerDomein + customFunctiesPerDomein)");
  for (const c of NIEUWE_CUSTOMS) {
    lines.push(`- **${c.domein}** — \`${c.functieId}\` "${c.functieNaam}" (aantal=${c.aantal}, cluster=${c.cluster}, categorie=${c.categorie})`);
  }
  lines.push(`- **data_systemen** — \`accountmanager_c_prof_trainee\` "Accountmanager C (Professionals) — trainee" (aantal=3, cluster=Sector Professionals, categorie=trainings_deelnemer) — split-rol naast bestaande accountmanager_c_prof (3, geconsulteerd)`);
  lines.push("");
  lines.push("## Aantal personen per domein per categorie (na herclassificatie)");
  lines.push("");
  lines.push("| Domein | Leider | Kernteam | Trainings-deelnemer | Geconsulteerd | Totaal |");
  lines.push("|---|---:|---:|---:|---:|---:|");
  for (const dom of ["mens", "data_systemen"]) {
    const c = personenPerDomeinCat[dom];
    const tot = c.leider + c.kernteam + c.trainings_deelnemer + c.geconsulteerd;
    lines.push(`| ${dom} | ${c.leider} | ${c.kernteam} | ${c.trainings_deelnemer} | ${c.geconsulteerd} | ${tot} |`);
  }
  lines.push("");
  lines.push("## Voor/na scenario-totalen");
  lines.push("");
  lines.push("| Scenario | totaalUren VOOR | totaalUren NA | J1 (2026) VOOR | J1 NA | J1-cap |");
  lines.push("|---|---:|---:|---:|---:|---:|");
  for (const skey of Object.keys(preState)) {
    const pre = preState[skey];
    const post = postState[skey];
    lines.push(`| ${skey} | ${pre.totaalUren} | ${post.totaalUren} | ${pre.j1} | ${post.j1} | ${J1_CAP[skey] ?? "-"} |`);
  }
  lines.push("");
  lines.push("## Voor/na per scenario per domein (totaalUren)");
  for (const skey of Object.keys(preState)) {
    lines.push(`\n### ${skey}`);
    lines.push("");
    lines.push("| Domein | VOOR | NA | Δ |");
    lines.push("|---|---:|---:|---:|");
    const pre = preState[skey];
    const post = postState[skey];
    const allD = new Set([...Object.keys(pre.perDomein), ...Object.keys(post.perDomein)]);
    for (const dom of allD) {
      const v = pre.perDomein[dom] ?? 0;
      const n = post.perDomein[dom] ?? 0;
      lines.push(`| ${dom} | ${v} | ${n} | ${n - v >= 0 ? "+" : ""}${n - v} |`);
    }
  }
  lines.push("");
  lines.push("## Markers gezet");
  lines.push(`- \`finaleStap1Stap7Applied\` = true`);
  lines.push(`- \`productmanagerIntZakDefinitiefWeg\` = true`);
  lines.push(`- \`finaleStap1Stap7AppliedMeta\` met timestamp + cleanup-acties`);
  lines.push("");
  lines.push("## Live-write");
  lines.push(`- Tabel: \`din_sessions\``);
  lines.push(`- Veld: \`data\` (JSONB)`);
  lines.push(`- updated_at gezet`);
  lines.push("");
  lines.push("## Idempotency");
  lines.push("Tweede uitvoering van dit script geeft `[idempotent] finaleStap1Stap7Applied is al true; geen wijzigingen.` en exit zonder writes.");
  lines.push("");
  lines.push("## Logfile-regels (raw)");
  lines.push("```");
  for (const line of auditLog) lines.push(line);
  lines.push("```");

  const auditPath = "c:/Users/pdebu/Projects VS code/DIN/AUDIT-FINALE-STAP1-STAP7.md";
  writeFileSync(auditPath, lines.join("\n"), "utf-8");
  console.log(`\n[audit] geschreven naar ${auditPath}`);

  console.log("\nKLAAR.");
}

main().catch((e) => {
  console.error("ERR:", e);
  process.exit(1);
});
