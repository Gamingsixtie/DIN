// REVERT — Stille selecties mens Cat 1 — sessie d8b97442
//
// Verwijdert de 5 Cat-1 mens-toevoegingen die ten onrechte zijn doorgevoerd door
// scripts/uitvoeren-stille-selecties-mens.ts. De gebruiker had de 64 mens-personen-
// met-uren bewust zo vastgesteld; de 16 zonder uren waren géén "stille selecties"
// maar een bewuste keuze.
//
// Wel weghalen (Cat 1 mens-toevoegingen):
//   - accountmanager_a (1p, ~46u advies-basis)
//   - accountmanager_b (1p, ~46u)
//   - klantenservice_a (1p, ~46u)
//   - klantenservice_b (1p, ~46u)
//   - teamleider_klantenservice (1p, ~40u)
//
// LAAT STAAN:
//   - Cat 2 stakeholder-vlaggen op selectiePerDomein.mens[id].stakeholder = true
//   - Cat 3 review-vlag op selectiePerDomein.mens.mdw_binnendienst_a.reviewVereist = true
//   - selectiePerDomein.mens.*.aantal (80 personen-metadata is correct)
//   - Cat 1 toevoegingen in data_systemen (Manager Klantcontact + Accountmanager C Prof)
//
// Wat dit script doet:
//   1. Backup van huidige sessie naar backup-revert-mens-cat1-<ts>.json
//   2. Verwijder uit vastgesteldeUrenPerInspanning[mens].rollen[] de 5 entries
//   3. Verwijder uit elke scenarios[*].domeinen[mens].jaren[].rollen[] de 5 entries
//   4. Hercalculeer per jaar: jaar.totaalUren / jaar.totaalKosten
//   5. Hercalculeer per scenario: mens-domein totaalUren/Kosten,
//      scenario.totalenPerJaar[].uren/kosten/urenGap, scenario.totaalUren/Kosten,
//      scenario.programmaUren/lijnUren (som over domeinen × programmaPct)
//   6. Verwijder marker stilleSelectiesMensDoorgevoerd
//   7. Schrijf marker stilleSelectiesMensCat1Reverted = { timestamp, ... }
//
// Idempotent — bij 2e run is marker stilleSelectiesMensCat1Reverted aanwezig en
// wordt het werk overgeslagen.
//
// Usage: npx tsx scripts/revert-stille-selecties-mens-cat1.ts

import { createClient } from "@supabase/supabase-js";
import { readFileSync, existsSync, writeFileSync } from "fs";
import { join } from "path";

function loadEnvFile(p: string) {
  if (!existsSync(p)) return;
  const c = readFileSync(p, "utf-8");
  for (const l of c.split(/\r?\n/)) {
    const t = l.trim();
    if (!t || t.startsWith("#")) continue;
    const e = t.indexOf("=");
    if (e === -1) continue;
    const key = t.substring(0, e).trim();
    const val = t.substring(e + 1).trim().replace(/^["']|["']$/g, "");
    if (!process.env[key]) process.env[key] = val;
  }
}
loadEnvFile(join(process.cwd(), ".env.local"));

const SESSION_ID = "d8b97442-ce8f-4134-b2c7-67dc8e3a3f93";

const REVERT_IDS = new Set<string>([
  "accountmanager_a",
  "accountmanager_b",
  "klantenservice_a",
  "klantenservice_b",
  "teamleider_klantenservice",
]);

type Json = Record<string, unknown>;

type Rol = {
  functieId: string;
  functieNaam: string;
  afdeling?: string;
  uren: number;
  uurtarief?: number;
  kosten?: number;
};
type Jaar = {
  jaar: number;
  rollen: Rol[];
  activiteit?: string;
  totaalUren: number;
  totaalKosten: number;
};
type Domein = {
  domein: string;
  jaren: Jaar[];
  totaalUren: number;
  totaalKosten: number;
  motivatie?: string;
  programmaPct?: number;
};
type TotaalPerJaar = {
  jaar: number;
  uren: number;
  kosten: number;
  urenBudget?: number;
  urenGap?: number;
};
type Scenario = {
  aantalJaren: number;
  domeinen: Domein[];
  totalenPerJaar: TotaalPerJaar[];
  totaalUren: number;
  totaalKosten: number;
  programmaUren?: number;
  lijnUren?: number;
  uurtariefGebruikt?: number;
};

async function main() {
  const supa = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
  );

  const { data: row, error } = await supa
    .from("din_sessions")
    .select("data")
    .eq("id", SESSION_ID)
    .maybeSingle();

  if (error || !row) {
    console.error("Sessie niet gevonden:", error);
    process.exit(1);
  }

  const sess = (row as { data: Json }).data;

  // Backup
  const backupPath = join(process.cwd(), `backup-revert-mens-cat1-${Date.now()}.json`);
  writeFileSync(backupPath, JSON.stringify(sess, null, 2), "utf-8");
  console.log(`[backup] ${backupPath}`);

  const stap4 = ((sess.crossAnalyseWizard as Json)?.stepResults as Json)?.stap4 as Json;
  const stap7 = stap4?.stap7InterneUren as Json;
  if (!stap7) {
    console.error("Geen stap7InterneUren-state — afgebroken");
    process.exit(1);
  }

  // Idempotent guard
  const reeds = (stap7.stilleSelectiesMensCat1Reverted as Json | undefined) ?? null;
  if (reeds && (reeds as { revertCompleted?: boolean }).revertCompleted) {
    console.log("[idempotent] Revert is al uitgevoerd — niets te doen.");
    console.log("Marker:", JSON.stringify(reeds, null, 2));
    return;
  }

  const log: string[] = [];
  const oudeTotalen: Record<
    string,
    { totaalUren: number; totaalKosten: number; mensTotaalUren: number; mensTotaalKosten: number; programmaUren?: number; lijnUren?: number }
  > = {};
  const nieuweTotalen: Record<
    string,
    { totaalUren: number; totaalKosten: number; mensTotaalUren: number; mensTotaalKosten: number; programmaUren?: number; lijnUren?: number }
  > = {};
  const verwijderdPerScenario: Record<
    string,
    { trainees: number; coordinator: number; uren: number; kosten: number }
  > = {};

  // ───── 1. vastgesteldeUrenPerInspanning[mens] — verwijder 5 rollen ─────
  const vastgesteld = stap7.vastgesteldeUrenPerInspanning as Array<{
    domein: string;
    rollen: Array<{ functieId: string; functieNaam: string; urenTotaal: number }>;
  }>;
  const mensBlok = vastgesteld.find((b) => b.domein === "mens");
  if (!mensBlok) {
    console.error("mens-blok niet gevonden in vastgesteldeUrenPerInspanning");
    process.exit(1);
  }

  const before = mensBlok.rollen.length;
  const verwijderdVastgesteld: string[] = [];
  mensBlok.rollen = mensBlok.rollen.filter((r) => {
    if (REVERT_IDS.has(r.functieId)) {
      verwijderdVastgesteld.push(`${r.functieId} (${r.functieNaam}, ${r.urenTotaal}u)`);
      return false;
    }
    return true;
  });
  log.push(
    `[vastgesteld] mens-rollen: ${before} → ${mensBlok.rollen.length} (${verwijderdVastgesteld.length} verwijderd: ${verwijderdVastgesteld.join("; ")})`,
  );

  // ───── 2. scenarios[*].domeinen[mens] — verwijder rollen, hercalculeer ─────
  const scenarios = stap7.scenarios as Record<string, Scenario | null>;

  for (const [scKey, sc] of Object.entries(scenarios)) {
    if (!sc) continue;
    const mensDom = sc.domeinen.find((d) => d.domein === "mens");
    if (!mensDom) {
      log.push(`[scenario:${scKey}] geen mens-domein, overslaan`);
      continue;
    }

    oudeTotalen[scKey] = {
      totaalUren: sc.totaalUren,
      totaalKosten: sc.totaalKosten,
      mensTotaalUren: mensDom.totaalUren,
      mensTotaalKosten: mensDom.totaalKosten,
      programmaUren: sc.programmaUren,
      lijnUren: sc.lijnUren,
    };

    let traineesUrenWeg = 0;
    let coordUrenWeg = 0;
    let totaalUrenWeg = 0;
    let totaalKostenWeg = 0;

    for (const jaar of mensDom.jaren) {
      const before = jaar.rollen.length;
      let urenWeg = 0;
      let kostenWeg = 0;
      jaar.rollen = jaar.rollen.filter((r) => {
        if (REVERT_IDS.has(r.functieId)) {
          const u = r.uren ?? 0;
          const k = r.kosten ?? (u * (r.uurtarief ?? 74));
          urenWeg += u;
          kostenWeg += k;
          if (r.functieId === "teamleider_klantenservice") coordUrenWeg += u;
          else traineesUrenWeg += u;
          return false;
        }
        return true;
      });
      // Hercalculeer jaar-totalen vanuit overgebleven rollen (rebuild from truth)
      jaar.totaalUren = jaar.rollen.reduce((s, r) => s + (r.uren ?? 0), 0);
      jaar.totaalKosten = jaar.rollen.reduce(
        (s, r) => s + (r.kosten ?? (r.uren ?? 0) * (r.uurtarief ?? 74)),
        0,
      );
      totaalUrenWeg += urenWeg;
      totaalKostenWeg += kostenWeg;

      // Update totalenPerJaar voor deze jaar
      const tpj = sc.totalenPerJaar?.find((t) => t.jaar === jaar.jaar);
      if (tpj) {
        tpj.uren = (tpj.uren ?? 0) - urenWeg;
        tpj.kosten = (tpj.kosten ?? 0) - kostenWeg;
        if (typeof tpj.urenBudget === "number") {
          tpj.urenGap = tpj.uren - tpj.urenBudget;
        }
      }
      void before;
    }

    // Hercalculeer mens-domein totalen
    mensDom.totaalUren = mensDom.jaren.reduce((s, j) => s + (j.totaalUren ?? 0), 0);
    mensDom.totaalKosten = mensDom.jaren.reduce((s, j) => s + (j.totaalKosten ?? 0), 0);

    // Hercalculeer scenario totalen vanuit som over alle domeinen
    sc.totaalUren = sc.domeinen.reduce((s, d) => s + (d.totaalUren ?? 0), 0);
    sc.totaalKosten = sc.domeinen.reduce((s, d) => s + (d.totaalKosten ?? 0), 0);

    // Hercalculeer programmaUren / lijnUren (som over domeinen × programmaPct)
    let progU = 0;
    let lijnU = 0;
    for (const d of sc.domeinen) {
      const pct = typeof d.programmaPct === "number" ? d.programmaPct : 1;
      const u = d.totaalUren ?? 0;
      progU += u * pct;
      lijnU += u * (1 - pct);
    }
    if (typeof sc.programmaUren === "number") sc.programmaUren = Math.round(progU);
    if (typeof sc.lijnUren === "number") sc.lijnUren = Math.round(lijnU);

    nieuweTotalen[scKey] = {
      totaalUren: sc.totaalUren,
      totaalKosten: sc.totaalKosten,
      mensTotaalUren: mensDom.totaalUren,
      mensTotaalKosten: mensDom.totaalKosten,
      programmaUren: sc.programmaUren,
      lijnUren: sc.lijnUren,
    };
    verwijderdPerScenario[scKey] = {
      trainees: traineesUrenWeg,
      coordinator: coordUrenWeg,
      uren: totaalUrenWeg,
      kosten: totaalKostenWeg,
    };

    log.push(
      `[scenario:${scKey}] -${totaalUrenWeg}u (trainees ${traineesUrenWeg}u + coord ${coordUrenWeg}u, -€${totaalKostenWeg.toLocaleString("nl-NL")}); mens ${oudeTotalen[scKey].mensTotaalUren}u → ${nieuweTotalen[scKey].mensTotaalUren}u; scenario ${oudeTotalen[scKey].totaalUren}u → ${nieuweTotalen[scKey].totaalUren}u`,
    );
  }

  // ───── 3. Markers ─────
  delete (stap7 as Record<string, unknown>).stilleSelectiesMensDoorgevoerd;
  (stap7 as Record<string, unknown>).stilleSelectiesMensCat1Reverted = {
    timestamp: new Date().toISOString(),
    revertCompleted: true,
    reden:
      "User-correctie: 5 Cat-1 mens-toevoegingen waren géén stille selecties maar bewuste keuze om geen uren toe te kennen. Cat 2 (stakeholders) en Cat 3 (review) UI-vlaggen op selectiePerDomein.mens blijven staan. data_systemen Cat-1 (manager_klantcontact + accountmanager_c_prof) blijft staan (had user-akkoord).",
    verwijderdVastgesteld,
    oudeTotalen,
    nieuweTotalen,
    verwijderdPerScenario,
  };

  // ───── 4. Persist ─────
  const { error: upErr } = await supa
    .from("din_sessions")
    .update({ data: sess })
    .eq("id", SESSION_ID);
  if (upErr) {
    console.error("Update faalde:", upErr);
    process.exit(1);
  }

  console.log("\n=== UITGEVOERD ===");
  for (const l of log) console.log("  " + l);
  console.log(`\n✓ Supabase bijgewerkt voor sessie ${SESSION_ID}`);

  console.log("\n=== TOTALEN VOOR/NA ===");
  for (const [k, oud] of Object.entries(oudeTotalen)) {
    const nieuw = nieuweTotalen[k];
    if (!nieuw) continue;
    console.log(
      `  ${k}: scenario ${oud.totaalUren}u → ${nieuw.totaalUren}u (${nieuw.totaalUren - oud.totaalUren}u) | mens ${oud.mensTotaalUren}u → ${nieuw.mensTotaalUren}u (${nieuw.mensTotaalUren - oud.mensTotaalUren}u) | progU ${oud.programmaUren ?? "—"} → ${nieuw.programmaUren ?? "—"}`,
    );
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
