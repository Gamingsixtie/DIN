// Compleet verwijder-script voor productmanager_int_zak — gebruikt CORRECTE
// velden (rol.uren / rol.kosten in jaren[].rollen[], rol.urenTotaal in
// vastgesteldeUrenPerInspanning).
//
// Idempotent met marker `productmanagerIntZakVerwijderd_v2`.
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
    process.env[t.substring(0, e).trim()] = t
      .substring(e + 1)
      .trim()
      .replace(/^["']|["']$/g, "");
  }
}
loadEnvFile(join(process.cwd(), ".env.local"));

const SESSION_ID = "d8b97442-ce8f-4134-b2c7-67dc8e3a3f93";
const TARGET_ID = "productmanager_int_zak";

type RolJaar = { functieId?: string; uren?: number; kosten?: number };
type RolVast = { functieId?: string; urenTotaal?: number };
type Jaar = { jaar: number; totaalUren?: number; totaalKosten?: number; rollen?: RolJaar[] };
type Domein = { domein: string; totaalUren?: number; totaalKosten?: number; uren?: number; jaren?: Jaar[]; programmaPct?: number; programmaUren?: number; lijnUren?: number };
type Scenario = { totaalUren?: number; totaalKosten?: number; programmaUren?: number; lijnUren?: number; domeinen?: Domein[]; totalenPerJaar?: Array<{ jaar: number; uren?: number; kosten?: number }> };

async function main() {
  const s = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
  );
  const { data } = await s
    .from("din_sessions")
    .select("data")
    .eq("id", SESSION_ID)
    .maybeSingle();
  if (!data) {
    console.error("Sessie niet gevonden");
    process.exit(1);
  }
  const sess = data.data as Record<string, unknown>;
  const wiz = sess.crossAnalyseWizard as Record<string, unknown>;
  const stepResults = wiz.stepResults as Record<string, unknown>;
  const stap4 = stepResults.stap4 as Record<string, unknown>;
  const s7 = stap4.stap7InterneUren as Record<string, unknown>;

  // 1. selectiePerDomein
  const sel = s7.selectiePerDomein as Record<string, Record<string, { aantal: number }>>;
  let removedSel = 0;
  for (const dom of ["mens", "data_systemen"]) {
    if (sel[dom]?.[TARGET_ID]) {
      delete sel[dom][TARGET_ID];
      removedSel++;
    }
  }
  console.log(`selectiePerDomein: ${removedSel} domein-entries verwijderd`);

  // 2. vastgesteldeUrenPerInspanning
  const vastgesteld = s7.vastgesteldeUrenPerInspanning as Array<{ domein: string; rollen: RolVast[] }>;
  let removedVast = 0;
  for (const grp of vastgesteld) {
    const idx = grp.rollen.findIndex((r) => r.functieId === TARGET_ID);
    if (idx >= 0) {
      grp.rollen.splice(idx, 1);
      removedVast++;
    }
  }
  console.log(`vastgesteldeUrenPerInspanning: ${removedVast} rollen verwijderd`);

  // 3. scenarios — verwijder uit jaren[].rollen[] + hercalculeer met CORRECTE velden
  const scenarios = s7.scenarios as Record<string, Scenario>;
  let removedScen = 0;
  for (const [scenKey, sc] of Object.entries(scenarios)) {
    if (!sc?.domeinen) continue;

    for (const dom of sc.domeinen) {
      if (!dom.jaren) continue;

      // Verwijder rol per jaar
      for (const jaar of dom.jaren) {
        if (!jaar.rollen) continue;
        const before = jaar.rollen.length;
        jaar.rollen = jaar.rollen.filter((r) => r.functieId !== TARGET_ID);
        removedScen += before - jaar.rollen.length;
      }

      // Hercalculeer jaar-totalen uit rol.uren/kosten (CORRECTE veld)
      for (const jaar of dom.jaren) {
        const u = (jaar.rollen ?? []).reduce((acc, r) => acc + (r.uren ?? 0), 0);
        const k = (jaar.rollen ?? []).reduce((acc, r) => acc + (r.kosten ?? 0), 0);
        jaar.totaalUren = u;
        jaar.totaalKosten = k;
      }

      // Domein-totalen
      const domTotU = (dom.jaren ?? []).reduce((acc, j) => acc + (j.totaalUren ?? 0), 0);
      const domTotK = (dom.jaren ?? []).reduce((acc, j) => acc + (j.totaalKosten ?? 0), 0);
      dom.totaalUren = domTotU;
      dom.uren = domTotU;
      dom.totaalKosten = domTotK;
      const pct = typeof dom.programmaPct === "number" ? dom.programmaPct : 0.75;
      dom.programmaUren = Math.round(domTotU * pct);
      dom.lijnUren = domTotU - dom.programmaUren;
    }

    // Scenario-totalen
    const scTotU = (sc.domeinen ?? []).reduce((acc, d) => acc + (d.totaalUren ?? 0), 0);
    const scTotK = (sc.domeinen ?? []).reduce((acc, d) => acc + (d.totaalKosten ?? 0), 0);
    sc.totaalUren = scTotU;
    sc.totaalKosten = scTotK;
    sc.programmaUren = (sc.domeinen ?? []).reduce((acc, d) => acc + (d.programmaUren ?? 0), 0);
    sc.lijnUren = scTotU - (sc.programmaUren ?? 0);

    // totalenPerJaar
    if (sc.totalenPerJaar) {
      for (const t of sc.totalenPerJaar) {
        let uren = 0;
        let kosten = 0;
        for (const dom of sc.domeinen ?? []) {
          const j = (dom.jaren ?? []).find((x) => x.jaar === t.jaar);
          uren += j?.totaalUren ?? 0;
          kosten += j?.totaalKosten ?? 0;
        }
        t.uren = uren;
        t.kosten = kosten;
      }
    }

    console.log(`  ${scenKey}: ${scTotU}u (mens=${sc.domeinen.find((d) => d.domein === "mens")?.totaalUren}, data=${sc.domeinen.find((d) => d.domein === "data_systemen")?.totaalUren})`);
  }
  console.log(`scenarios: ${removedScen} jaar-entries verwijderd`);

  // 4. Update Lezing-marker overzicht
  const lezing = s7.interneUrenLezing as { overzicht?: Record<string, { aangemeld?: number; metUren?: number }> } | undefined;
  if (lezing?.overzicht) {
    if (lezing.overzicht.mens) {
      lezing.overzicht.mens.aangemeld = 78;
      lezing.overzicht.mens.metUren = 78;
    }
    if (lezing.overzicht.data_systemen) {
      lezing.overzicht.data_systemen.aangemeld = 38;
      lezing.overzicht.data_systemen.metUren = 38;
    }
  }

  // 5. Marker
  s7.productmanagerIntZakVerwijderd_v2 = {
    reverted: true,
    timestamp: new Date().toISOString(),
    reden: "Functie Productmanager A (Internationaal & Zakelijk) bestaat niet meer in organisatie",
    selRemoved: removedSel,
    vastRemoved: removedVast,
    scenJaarEntriesRemoved: removedScen,
  };
  // Verwijder oude foutieve marker
  delete s7.productmanagerIntZakVerwijderd;

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
  const { error } = await s
    .from("din_sessions")
    .update({ data: newData })
    .eq("id", SESSION_ID);
  if (error) {
    console.error("FOUT:", error.message);
    process.exit(1);
  }
  console.log("\n✓ Productmanager Internationaal & Zakelijk volledig verwijderd.");
}

void main();
