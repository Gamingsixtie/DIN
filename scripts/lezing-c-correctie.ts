/**
 * Lezing C — Correctie
 *
 * Corrigeert drie problemen die de eerdere Lezing-C-doorvoer niet correct heeft afgerond:
 *
 * 1. `categorie` veld ontbreekt op alle rollen (vUPI + scenarios) — UI kan geen onderscheid
 *    maken tussen Leider / Kernteam / Trainings-deelnemer / Geconsulteerd.
 * 2. Inspanningsleiders ontbreken (Yara mens, Sven data, TBD processen).
 * 3. `productmanager_int_zak` is teruggekomen vanuit stale localStorage — definitief weg
 *    met sterke marker.
 *
 * Idempotent — checkt marker `lezingCCorrectieToegepast: true`.
 *
 * Behoudt bestaande velden (uren, kosten, urenTotaal, onderbouwing) — alleen toevoegen of
 * cleanup. Doet GEEN volledige Lezing-C herrekening; patcht alleen de bovengenoemde
 * problemen op de huidige state.
 */

import { createClient } from "@supabase/supabase-js";
import { readFileSync, existsSync, writeFileSync, mkdirSync } from "fs";
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

type Categorie = "leider" | "kernteam" | "geconsulteerd" | "trainings-deelnemer";
type Domein = "mens" | "processen" | "data_systemen" | "cultuur";

// ---------- Categorie-mapping per domein o.b.v. functieId ----------
// Conform brief sectie "Stap 3 — Voeg `categorie` veld toe aan ALLE rollen".

const CAT_MENS: Record<string, Categorie> = {
  "custom-yara-mens-leider": "leider",
  teamleider_trainingen: "kernteam",
  manager_klantcontact: "kernteam",
  sectormanager_po: "kernteam", // 1 representant
  sectormanager_vo: "geconsulteerd",
  sectormanager_prof: "geconsulteerd",
  // trainer_adviseur_a: split — 2 senior kernteam, 10 geconsulteerd. We gebruiken 'geconsulteerd'
  // als dominante mapping omdat er geen split-entry is. Suffix '_senior_kernteam' wordt apart
  // afgehandeld (zie code), evenals '_geconsulteerd'.
  trainer_adviseur_a: "geconsulteerd",
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
  // Cultuur-leider: gebruik bestaande HR-rol als leider OF nieuwe custom-yara-cultuur-leider
  "custom-yara-cultuur-leider": "leider",
  "custom-1777458764027-8mxzp": "leider", // bestaande HR-rol → Yara is HR-manager → leider
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
  "custom-1777459472792-own3u": "kernteam", // procesondersteuner professionals (custom)
};

const CAT_PER_DOMEIN: Record<Domein, Record<string, Categorie>> = {
  mens: CAT_MENS,
  data_systemen: CAT_DATA,
  cultuur: CAT_CULTUUR,
  processen: CAT_PROCESSEN,
};

// ---------- Leider-record templates ----------

interface LeiderTpl {
  functieId: string;
  functieNaam: string;
  afdeling: string;
  urenTotaalAdvies: number; // urenTotaal voor advies-scenario (4j)
  programmaPct: number;
  onderbouwing: string;
  placeholderTBD?: boolean;
  tbdToelichting?: string;
}

const LEIDERS: Record<string, LeiderTpl> = {
  "custom-yara-mens-leider": {
    functieId: "custom-yara-mens-leider",
    functieNaam: "Yara — HR-manager (inspanningsleider Mens)",
    afdeling: "HR",
    urenTotaalAdvies: 240,
    programmaPct: 0.85,
    onderbouwing:
      "Inspanningsleider mens-domein conform programmaorganisatie. Trekker van gespreksvaardigheidstraining outside-in. Lezing-C-niveau: 80u/jr piek + 40u/jr niet-piek.",
  },
  "custom-sven-data-leider": {
    functieId: "custom-sven-data-leider",
    functieNaam: "Sven — SIO (inspanningsleider Data & Systemen)",
    afdeling: "Data & Technologie",
    urenTotaalAdvies: 240,
    programmaPct: 0.85,
    onderbouwing:
      "Inspanningsleider data & systemen-domein conform programmaorganisatie. Trekker van CRM/datafundament-keten. Lezing-C-niveau: 80u/jr piek + 40u/jr niet-piek.",
  },
  "custom-inspanningsleider-processen-tbd": {
    functieId: "custom-inspanningsleider-processen-tbd",
    functieNaam: "Inspanningsleider Processen — naam nog te benoemen",
    afdeling: "TBD",
    urenTotaalAdvies: 240,
    programmaPct: 0.85,
    onderbouwing:
      "Inspanningsleider processen-domein conform programmaorganisatie. Lezing-C-niveau: 80u/jr piek + 40u/jr niet-piek. Naam nog te bepalen in stuurgroep.",
    placeholderTBD: true,
    tbdToelichting:
      "Mogelijk Projectmanager D of andere kandidaat — beslissing in stuurgroep nog te nemen",
  },
};

// ---------- helpers ----------

function setCategorieFromMap(rol: any, domein: Domein): boolean {
  const map = CAT_PER_DOMEIN[domein];
  if (!map) return false;
  const fid = rol.functieId;
  if (typeof fid !== "string") return false;
  // 1. exacte match
  if (map[fid]) {
    rol.categorie = map[fid];
    return true;
  }
  // 2. suffix-rules
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

function tariefVoorJaar(jaar: number, basis: number, indexatie: number, refJaar: number): number {
  return Math.round(basis * Math.pow(1 + indexatie, jaar - refJaar));
}

// ---------- main ----------

async function main() {
  console.log(`\n=== Lezing C — Correctie voor sessie ${SESSION_ID} ===\n`);

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

  // Idempotency
  if (s7.lezingCCorrectieToegepast === true) {
    console.log("[idempotent] lezingCCorrectieToegepast is al true; niets te doen.");
    process.exit(0);
  }

  // Backup
  const backupDir = "c:/tmp";
  if (!existsSync(backupDir)) mkdirSync(backupDir, { recursive: true });
  const ts = new Date().toISOString().replace(/[:.]/g, "-");
  const backupPath = `${backupDir}/session-d8b97442-pre-correctie-${ts}.json`;
  writeFileSync(backupPath, JSON.stringify(root, null, 2), "utf-8");
  console.log(`[backup] saved to ${backupPath}\n`);

  // Capture pre-totalen per scenario per domein (uren) voor audit
  const pre: Record<string, { totaalUren: number; perDomein: Record<string, number> }> = {};
  for (const skey of Object.keys(s7.scenarios ?? {})) {
    const sc = s7.scenarios[skey];
    if (!sc) continue;
    pre[skey] = { totaalUren: sc.totaalUren ?? 0, perDomein: {} };
    for (const idx of Object.keys(sc.domeinen ?? {})) {
      const d = sc.domeinen[idx];
      pre[skey].perDomein[d.domein] = d.totaalUren ?? 0;
    }
  }

  // ====================================================================
  // STAP 1 — Verwijder productmanager_int_zak (stevig + idempotent marker)
  // ====================================================================
  console.log("[stap 1] Verwijder productmanager_int_zak overal...");
  let removedCounter = 0;

  // selectiePerDomein
  for (const dom of ["mens", "data_systemen"] as const) {
    if (s7.selectiePerDomein?.[dom]?.productmanager_int_zak) {
      delete s7.selectiePerDomein[dom].productmanager_int_zak;
      console.log(`  - selectiePerDomein.${dom}.productmanager_int_zak verwijderd`);
      removedCounter++;
    }
  }

  // vUPI rollen
  for (const idx of Object.keys(s7.vastgesteldeUrenPerInspanning ?? {})) {
    const e = s7.vastgesteldeUrenPerInspanning[idx];
    if (!Array.isArray(e?.rollen)) continue;
    const before = e.rollen.length;
    e.rollen = e.rollen.filter((r: any) => r.functieId !== "productmanager_int_zak");
    if (e.rollen.length < before) {
      console.log(`  - vUPI[${idx}] (${e.domein}): ${before - e.rollen.length} int_zak rol(len) verwijderd`);
      removedCounter++;
    }
  }

  // scenarios[*].domeinen[*].jaren[*].rollen[*]
  for (const skey of Object.keys(s7.scenarios ?? {})) {
    const sc = s7.scenarios[skey];
    if (!sc?.domeinen) continue;
    for (const idx of Object.keys(sc.domeinen)) {
      const d = sc.domeinen[idx];
      if (!Array.isArray(d.jaren)) continue;
      for (const j of d.jaren) {
        if (!Array.isArray(j.rollen)) continue;
        const before = j.rollen.length;
        j.rollen = j.rollen.filter((r: any) => r.functieId !== "productmanager_int_zak");
        if (j.rollen.length < before) removedCounter++;
      }
    }
  }
  console.log(`  → ${removedCounter} int_zak verwijderingen totaal\n`);

  // Sterke marker
  s7.productmanagerIntZakDefinitiefWeg = {
    reden: "Functie bestaat niet meer",
    verwijderdOp: new Date().toISOString(),
    bevestigingsBron: "Lezing-C-correctie 2026-05-03",
  };

  // ====================================================================
  // STAP 2 — Voeg leiders toe als ze ontbreken
  // ====================================================================
  console.log("[stap 2] Leiders toevoegen waar nodig...");

  s7.customFunctiesPerDomein = s7.customFunctiesPerDomein ?? {};
  for (const dom of ["mens", "processen", "data_systemen", "cultuur"]) {
    s7.customFunctiesPerDomein[dom] = s7.customFunctiesPerDomein[dom] ?? [];
  }
  s7.selectiePerDomein = s7.selectiePerDomein ?? {};
  for (const dom of ["mens", "processen", "data_systemen", "cultuur"]) {
    s7.selectiePerDomein[dom] = s7.selectiePerDomein[dom] ?? {};
  }

  const leiderToewijzing: { id: string; domein: Domein; toegevoegd: string[] }[] = [];

  function ensureLeider(domein: Domein, leiderId: string) {
    const tpl = LEIDERS[leiderId];
    if (!tpl) throw new Error(`onbekende leider ${leiderId}`);
    const acties: string[] = [];

    // selectiePerDomein
    if (!s7.selectiePerDomein[domein][leiderId]) {
      s7.selectiePerDomein[domein][leiderId] = { aantal: 1 };
      acties.push("selectie");
    }

    // customFunctiesPerDomein
    const cfd = s7.customFunctiesPerDomein[domein] as any[];
    if (!cfd.find((c) => c.id === leiderId)) {
      cfd.push({
        id: leiderId,
        naam: tpl.functieNaam,
        cluster: "Inspanningsleider",
      });
      acties.push("customFuncties");
    }

    leiderToewijzing.push({ id: leiderId, domein, toegevoegd: acties });
  }

  ensureLeider("mens", "custom-yara-mens-leider");
  ensureLeider("data_systemen", "custom-sven-data-leider");
  ensureLeider("processen", "custom-inspanningsleider-processen-tbd");

  for (const lt of leiderToewijzing) {
    if (lt.toegevoegd.length === 0) {
      console.log(`  - ${lt.domein}/${lt.id}: al aanwezig`);
    } else {
      console.log(`  - ${lt.domein}/${lt.id}: toegevoegd in ${lt.toegevoegd.join(", ")}`);
    }
  }

  // Voeg leider-records toe aan vUPI[domein].rollen[] indien afwezig
  // Map domein → vUPI key
  const vUPIKeyPerDomein: Record<string, string> = {};
  for (const idx of Object.keys(s7.vastgesteldeUrenPerInspanning ?? {})) {
    const e = s7.vastgesteldeUrenPerInspanning[idx];
    if (e?.domein) vUPIKeyPerDomein[e.domein] = idx;
  }
  function ensureVUPIKey(domein: string): string {
    if (vUPIKeyPerDomein[domein]) return vUPIKeyPerDomein[domein];
    let n = 0;
    while (s7.vastgesteldeUrenPerInspanning[String(n)]) n++;
    const k = String(n);
    s7.vastgesteldeUrenPerInspanning[k] = { domein, rollen: [] };
    vUPIKeyPerDomein[domein] = k;
    return k;
  }

  function addLeiderToVUPI(domein: Domein, leiderId: string) {
    const tpl = LEIDERS[leiderId];
    const k = ensureVUPIKey(domein);
    const entry = s7.vastgesteldeUrenPerInspanning[k];
    entry.rollen = entry.rollen ?? [];
    if (entry.rollen.find((r: any) => r.functieId === leiderId)) {
      return false;
    }
    const rec: any = {
      functieId: leiderId,
      functieNaam: tpl.functieNaam,
      afdeling: tpl.afdeling,
      urenTotaal: tpl.urenTotaalAdvies,
      categorie: "leider",
      programmaPct: tpl.programmaPct,
      onderbouwing: tpl.onderbouwing,
    };
    if (tpl.placeholderTBD) {
      rec.placeholderTBD = true;
      rec.tbdToelichting = tpl.tbdToelichting;
    }
    entry.rollen.push(rec);
    return true;
  }

  console.log("\n  vUPI leider-records:");
  for (const [dom, lid] of [
    ["mens", "custom-yara-mens-leider"],
    ["data_systemen", "custom-sven-data-leider"],
    ["processen", "custom-inspanningsleider-processen-tbd"],
  ] as [Domein, string][]) {
    const added = addLeiderToVUPI(dom, lid);
    console.log(`  - vUPI[${dom}]/${lid}: ${added ? "toegevoegd" : "al aanwezig"}`);
  }

  // Voeg leider-records toe aan scenarios[*].domeinen[*].jaren[*].rollen[]
  // Lezing-C uren-niveaus: 80u piek / 40u niet-piek / 25u borging.
  // We bepalen per jaar of het 'piek' is (op basis van de bestaande rol-uren in dat jaar:
  // als de hoogste bestaande rol veel uren heeft, is het een piek-jaar; anders niet-piek).
  // Eenvoudiger: gebruik aandeel jaar-uren / max jaar-uren als signaal. Maar nog simpeler:
  // gebruik de jaar-totaal van het domein zelf als 'maatstaf':
  //   - max-jaar in dat domein = piek = 80
  //   - jaren met jaar-totaal > 50% van max = niet-piek = 40
  //   - rest (heel laag of geen activiteit) = 25 (borging) of 0
  // Voor 4-jaars scenario (advies): 240u totaal verwacht (80+40+40+80, of 80+80+40+40, etc.)
  // Voor 7+ jaars scenario: borging in latere jaren.

  function bepaalLeiderUrenPerJaar(jaarTotaalUren: number[], aantalJaren: number): number[] {
    if (jaarTotaalUren.length === 0) return [];
    const max = Math.max(...jaarTotaalUren);
    if (max === 0) return new Array(jaarTotaalUren.length).fill(0);
    const isLang = aantalJaren >= 7;
    const result = jaarTotaalUren.map((jt, i) => {
      if (jt === 0) return 0;
      const ratio = jt / max;
      if (isLang && i >= 3 && ratio < 0.4) return 25; // borging-jaar in lange scenarios
      if (ratio >= 0.7) return 80; // piek
      if (ratio >= 0.3) return 40; // niet-piek
      return 25; // borging / lichte-fase
    });
    return result;
  }

  const settings = s7.uurtariefSettings ?? {};
  const basisTarief = settings.basisTarief ?? 70;
  const indexatie = settings.indexatiePercentage ?? 0.05;
  const refJaar = settings.referentiejaar ?? 2025;

  for (const skey of Object.keys(s7.scenarios ?? {})) {
    const sc = s7.scenarios[skey];
    if (!sc?.domeinen) continue;
    const aantalJaren = sc.aantalJaren ?? Object.values<any>(sc.domeinen)[0]?.jaren?.length ?? 4;

    for (const idx of Object.keys(sc.domeinen)) {
      const d = sc.domeinen[idx];
      const dom = d.domein as Domein;
      const leiderForDom: Record<Domein, string | null> = {
        mens: "custom-yara-mens-leider",
        data_systemen: "custom-sven-data-leider",
        processen: "custom-inspanningsleider-processen-tbd",
        cultuur: null, // cultuur heeft geen aparte leider-toevoeging in deze correctie
      };
      const leiderId = leiderForDom[dom];
      if (!leiderId) continue;
      const tpl = LEIDERS[leiderId];
      const jaren = d.jaren ?? [];
      // Hoeveel uren had elk jaar al? Som van de bestaande rol-uren.
      const jaarTotalen = jaren.map((j: any) =>
        (j.rollen ?? []).reduce((s: number, r: any) => s + (r.uren ?? 0), 0),
      );
      const leiderUrenPerJaar = bepaalLeiderUrenPerJaar(jaarTotalen, aantalJaren);

      for (let i = 0; i < jaren.length; i++) {
        const j = jaren[i];
        j.rollen = j.rollen ?? [];
        // Is leider er al?
        if (j.rollen.find((r: any) => r.functieId === leiderId)) continue;
        const uren = leiderUrenPerJaar[i] ?? 0;
        if (uren === 0) continue;
        const jaar = j.jaar;
        const tj = tariefVoorJaar(jaar, basisTarief, indexatie, refJaar);
        const rec: any = {
          uren,
          kosten: uren * tj,
          afdeling: tpl.afdeling,
          functieId: leiderId,
          uurtarief: tj,
          functieNaam: tpl.functieNaam,
          categorie: "leider",
        };
        if (tpl.placeholderTBD) rec.placeholderTBD = true;
        j.rollen.push(rec);
      }
    }
  }

  // ====================================================================
  // STAP 3 — Voeg `categorie` veld toe aan ALLE rollen
  // ====================================================================
  console.log("\n[stap 3] categorie-veld toevoegen aan alle rollen...");

  const categorieStats: Record<Domein, {
    totaalRollen: number;
    methCategorie: number;
    zonderMatch: { functieId: string; locatie: string }[];
    perCategorie: Record<string, number>;
  }> = {
    mens: { totaalRollen: 0, methCategorie: 0, zonderMatch: [], perCategorie: {} },
    data_systemen: { totaalRollen: 0, methCategorie: 0, zonderMatch: [], perCategorie: {} },
    cultuur: { totaalRollen: 0, methCategorie: 0, zonderMatch: [], perCategorie: {} },
    processen: { totaalRollen: 0, methCategorie: 0, zonderMatch: [], perCategorie: {} },
  };

  // vUPI
  for (const idx of Object.keys(s7.vastgesteldeUrenPerInspanning ?? {})) {
    const e = s7.vastgesteldeUrenPerInspanning[idx];
    if (!e?.domein || !Array.isArray(e.rollen)) continue;
    const dom = e.domein as Domein;
    if (!categorieStats[dom]) continue;
    for (const r of e.rollen) {
      categorieStats[dom].totaalRollen++;
      const before = r.categorie;
      const matched = setCategorieFromMap(r, dom);
      if (matched || before) {
        categorieStats[dom].methCategorie++;
        const c = r.categorie ?? before;
        categorieStats[dom].perCategorie[c] = (categorieStats[dom].perCategorie[c] ?? 0) + 1;
      } else {
        categorieStats[dom].zonderMatch.push({
          functieId: r.functieId ?? "(onbekend)",
          locatie: `vUPI[${idx}]`,
        });
      }
    }
  }

  // scenarios
  for (const skey of Object.keys(s7.scenarios ?? {})) {
    const sc = s7.scenarios[skey];
    if (!sc?.domeinen) continue;
    for (const idx of Object.keys(sc.domeinen)) {
      const d = sc.domeinen[idx];
      const dom = d.domein as Domein;
      if (!categorieStats[dom]) continue;
      for (const j of d.jaren ?? []) {
        for (const r of j.rollen ?? []) {
          // For scenarios: don't double-count in stats (already counted via vUPI per domein)
          const matched = setCategorieFromMap(r, dom);
          if (!matched && !r.categorie) {
            // Track unmatched in scenarios separately
            const exists = categorieStats[dom].zonderMatch.some(
              (z) => z.functieId === r.functieId && z.locatie.startsWith(`scen[${skey}]`),
            );
            if (!exists) {
              categorieStats[dom].zonderMatch.push({
                functieId: r.functieId ?? "(onbekend)",
                locatie: `scen[${skey}].${dom}`,
              });
            }
          }
        }
      }
    }
  }

  for (const dom of Object.keys(categorieStats) as Domein[]) {
    const s = categorieStats[dom];
    console.log(`  ${dom.padEnd(15)}: ${s.methCategorie}/${s.totaalRollen} rollen met categorie | per cat: ${JSON.stringify(s.perCategorie)}`);
    if (s.zonderMatch.length > 0) {
      console.log(`    ! zonder match (${s.zonderMatch.length}):`);
      for (const z of s.zonderMatch.slice(0, 10)) {
        console.log(`      - ${z.functieId} @ ${z.locatie}`);
      }
    }
  }

  // ====================================================================
  // STAP 4 — Hercalculeer aggregaten
  // ====================================================================
  console.log("\n[stap 4] Aggregaten herrekenen...");

  for (const skey of Object.keys(s7.scenarios ?? {})) {
    const sc = s7.scenarios[skey];
    if (!sc?.domeinen) continue;

    // Per-jaar totalen (gevuld vanuit alle domeinen)
    const totalenPerJaarMap: Record<number, { uren: number; kosten: number }> = {};

    let scTotaalUren = 0;
    let scTotaalKosten = 0;
    let scProgrammaUren = 0;

    for (const idx of Object.keys(sc.domeinen)) {
      const d = sc.domeinen[idx];
      let domTotaalUren = 0;
      let domTotaalKosten = 0;
      let domProgrammaUren = 0;
      for (const j of d.jaren ?? []) {
        let jaarUren = 0;
        let jaarKosten = 0;
        for (const r of j.rollen ?? []) {
          jaarUren += r.uren ?? 0;
          jaarKosten += r.kosten ?? 0;
          // programmaUren: alle rollen zijn programmatime tenzij anders
          // Voor leiders gebruiken we tpl.programmaPct; voor andere rollen 1.0
          const pct = LEIDERS[r.functieId]?.programmaPct ?? 1.0;
          domProgrammaUren += (r.uren ?? 0) * pct;
        }
        j.totaalUren = jaarUren;
        j.totaalKosten = jaarKosten;
        domTotaalUren += jaarUren;
        domTotaalKosten += jaarKosten;
        totalenPerJaarMap[j.jaar] = totalenPerJaarMap[j.jaar] ?? { uren: 0, kosten: 0 };
        totalenPerJaarMap[j.jaar].uren += jaarUren;
        totalenPerJaarMap[j.jaar].kosten += jaarKosten;
      }
      d.uren = domTotaalUren; // bestaand veld dat in sommige plekken gebruikt wordt
      d.totaalUren = domTotaalUren;
      d.totaalKosten = domTotaalKosten;
      d.programmaUren = Math.round(domProgrammaUren);
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
  // STAP 5 — Marker zetten + opslaan
  // ====================================================================
  console.log("\n[stap 5] Marker zetten + naar Supabase schrijven...");

  s7.lezingCCorrectieToegepast = true;
  s7.lezingCCorrectieMeta = {
    timestamp: new Date().toISOString(),
    versie: 1,
    cleanupActies: [
      "productmanager_int_zak verwijderd uit selectiePerDomein, vUPI en scenarios",
      "Sterke marker productmanagerIntZakDefinitiefWeg geplaatst",
      "Leiders toegevoegd: Yara (mens), Sven (data), TBD (processen)",
      "categorie-veld toegevoegd aan alle rollen in vUPI en scenarios",
      "Aggregaten herrekend (jaar, domein, scenario, programmaUren, lijnUren)",
    ],
  };

  const { error: upErr } = await supa
    .from("din_sessions")
    .update({ data: root, updated_at: new Date().toISOString() })
    .eq("id", SESSION_ID);
  if (upErr) throw upErr;
  console.log("  → opslag OK");

  // ====================================================================
  // VERIFICATIE
  // ====================================================================
  console.log("\n=== VERIFICATIE ===\n");

  console.log("Voor/Na uren per scenario:");
  for (const skey of Object.keys(s7.scenarios)) {
    const sc = s7.scenarios[skey];
    console.log(`\n[${skey}]`);
    for (const idx of Object.keys(sc.domeinen)) {
      const d = sc.domeinen[idx];
      const preU = pre[skey]?.perDomein[d.domein] ?? 0;
      const postU = d.totaalUren ?? 0;
      const delta = postU - preU;
      console.log(
        `  ${d.domein.padEnd(15)} pre=${String(preU).padStart(6)}u → post=${String(postU).padStart(6)}u  Δ${delta >= 0 ? "+" : ""}${delta}u`,
      );
    }
    const preTot = pre[skey].totaalUren;
    const postTot = sc.totaalUren;
    console.log(
      `  ${"TOTAAL".padEnd(15)} pre=${String(preTot).padStart(6)}u → post=${String(postTot).padStart(6)}u  Δ${postTot - preTot >= 0 ? "+" : ""}${postTot - preTot}u | progr=${sc.programmaUren} | lijn=${sc.lijnUren}`,
    );
  }

  console.log("\nMarker:");
  console.log(`  lezingCCorrectieToegepast = ${s7.lezingCCorrectieToegepast}`);
  console.log(`  productmanagerIntZakDefinitiefWeg = ${JSON.stringify(s7.productmanagerIntZakDefinitiefWeg)}`);

  console.log("\nLeiders aanwezig:");
  console.log(`  selectie.mens.custom-yara-mens-leider                    : ${!!s7.selectiePerDomein.mens["custom-yara-mens-leider"]}`);
  console.log(`  selectie.data_systemen.custom-sven-data-leider           : ${!!s7.selectiePerDomein.data_systemen["custom-sven-data-leider"]}`);
  console.log(`  selectie.processen.custom-inspanningsleider-processen-tbd: ${!!s7.selectiePerDomein.processen["custom-inspanningsleider-processen-tbd"]}`);

  console.log("\nint_zak weg:");
  console.log(`  selectie.mens.productmanager_int_zak                  : ${!s7.selectiePerDomein.mens?.productmanager_int_zak} (moet true)`);
  console.log(`  selectie.data_systemen.productmanager_int_zak         : ${!s7.selectiePerDomein.data_systemen?.productmanager_int_zak} (moet true)`);

  // Check vUPI int_zak
  let vUPIIntZakCount = 0;
  for (const idx of Object.keys(s7.vastgesteldeUrenPerInspanning ?? {})) {
    const e = s7.vastgesteldeUrenPerInspanning[idx];
    vUPIIntZakCount += (e?.rollen ?? []).filter((r: any) => r.functieId === "productmanager_int_zak").length;
  }
  console.log(`  vUPI int_zak rol-aantal                              : ${vUPIIntZakCount} (moet 0)`);

  // Check scenarios int_zak
  let scIntZakCount = 0;
  for (const skey of Object.keys(s7.scenarios ?? {})) {
    const sc = s7.scenarios[skey];
    for (const idx of Object.keys(sc.domeinen ?? {})) {
      const d = sc.domeinen[idx];
      for (const j of d.jaren ?? []) {
        scIntZakCount += (j.rollen ?? []).filter((r: any) => r.functieId === "productmanager_int_zak").length;
      }
    }
  }
  console.log(`  scenarios int_zak rol-aantal                         : ${scIntZakCount} (moet 0)`);

  // Categorie-coverage check
  console.log("\nCategorie-coverage in scenarios:");
  for (const skey of Object.keys(s7.scenarios)) {
    const sc = s7.scenarios[skey];
    const perDomCounts: Record<string, { totaal: number; methCat: number }> = {};
    for (const idx of Object.keys(sc.domeinen ?? {})) {
      const d = sc.domeinen[idx];
      perDomCounts[d.domein] = { totaal: 0, methCat: 0 };
      for (const j of d.jaren ?? []) {
        for (const r of j.rollen ?? []) {
          perDomCounts[d.domein].totaal++;
          if (r.categorie) perDomCounts[d.domein].methCat++;
        }
      }
    }
    console.log(`  [${skey}] ${Object.entries(perDomCounts).map(([k, v]) => `${k}=${v.methCat}/${v.totaal}`).join(", ")}`);
  }

  // Audit-data uitschrijven
  const auditData = {
    sessionId: SESSION_ID,
    timestamp: new Date().toISOString(),
    backupFile: backupPath,
    pre,
    post: Object.fromEntries(
      Object.keys(s7.scenarios).map((skey) => [
        skey,
        {
          totaalUren: s7.scenarios[skey].totaalUren,
          totaalKosten: s7.scenarios[skey].totaalKosten,
          programmaUren: s7.scenarios[skey].programmaUren,
          lijnUren: s7.scenarios[skey].lijnUren,
          perDomein: Object.fromEntries(
            Object.values<any>(s7.scenarios[skey].domeinen).map((d: any) => [
              d.domein,
              { totaalUren: d.totaalUren, totaalKosten: d.totaalKosten, programmaUren: d.programmaUren },
            ]),
          ),
        },
      ]),
    ),
    intZakRemoved: removedCounter,
    leidersToegevoegd: leiderToewijzing,
    categorieStats,
  };
  writeFileSync("c:/tmp/lezing-c-correctie-audit-data.json", JSON.stringify(auditData, null, 2), "utf-8");
  console.log(`\n[audit-data] saved to c:/tmp/lezing-c-correctie-audit-data.json`);

  console.log("\nKLAAR.\n");
}

main().catch((e) => {
  console.error("ERR:", e);
  process.exit(1);
});
