// Verwijder de rol `productmanager_int_zak` (Productmanager A Internationaal &
// Zakelijk, Sector Professionals) uit Stap 7 — deze functie bestaat niet meer.
//
// Verwijdert uit:
//  - selectiePerDomein.mens (aantal 2)
//  - selectiePerDomein.data_systemen (aantal 1)
//  - vastgesteldeUrenPerInspanning[mens].rollen
//  - vastgesteldeUrenPerInspanning[data_systemen].rollen
//  - scenarios[*].domeinen[mens|data_systemen].jaren[].rollen
//
// Hercalculeert: domein-totalen, jaar-totalen, scenario.totalenPerJaar,
// scenario.totaalUren/totaalKosten/programmaUren/lijnUren.
// Idempotent met marker `productmanagerIntZakVerwijderd`.
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

type RolUren = { functieId: string; urenTotaal?: number; aantal?: number };
type Jaar = { jaar: number; totaalUren?: number; totaalKosten?: number; rollen?: RolUren[] };
type Domein = { domein: string; totaalUren?: number; totaalKosten?: number; uren?: number; jaren?: Jaar[]; programmaPct?: number; programmaUren?: number; lijnUren?: number };
type Scenario = { totaalUren?: number; totaalKosten?: number; programmaUren?: number; lijnUren?: number; domeinen?: Domein[]; totalenPerJaar?: Array<{ jaar: number; uren?: number; kosten?: number }>; uurtariefGebruikt?: number; startJaar?: number };

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
    console.error("Sessie niet gevonden:", SESSION_ID);
    process.exit(1);
  }
  const sess = data.data as Record<string, unknown>;
  const wiz = sess.crossAnalyseWizard as Record<string, unknown>;
  const stepResults = wiz.stepResults as Record<string, unknown>;
  const stap4 = stepResults.stap4 as Record<string, unknown>;
  const s7 = stap4.stap7InterneUren as Record<string, unknown>;

  const marker = s7.productmanagerIntZakVerwijderd as { reverted?: boolean } | undefined;
  if (marker?.reverted === true) {
    console.log("✓ Reeds verwijderd — idempotent.");
    return;
  }

  let mutaties = 0;

  // 1. selectiePerDomein
  const sel = s7.selectiePerDomein as Record<string, Record<string, { aantal: number }>>;
  for (const dom of ["mens", "data_systemen"]) {
    if (sel[dom]?.[TARGET_ID]) {
      const aantal = sel[dom][TARGET_ID].aantal;
      delete sel[dom][TARGET_ID];
      console.log(`  - selectiePerDomein.${dom}: rol verwijderd (aantal ${aantal})`);
      mutaties++;
    }
  }

  // 2. vastgesteldeUrenPerInspanning
  const vastgesteld = s7.vastgesteldeUrenPerInspanning as Array<{ domein: string; rollen: RolUren[] }>;
  for (const grp of vastgesteld) {
    const idx = grp.rollen.findIndex((r) => r.functieId === TARGET_ID);
    if (idx >= 0) {
      const removed = grp.rollen.splice(idx, 1);
      console.log(`  - vastgesteldeUrenPerInspanning[${grp.domein}]: rol verwijderd (urenTotaal ${removed[0]?.urenTotaal})`);
      mutaties++;
    }
  }

  // 3. scenarios — verwijder uit jaren.rollen + hercalculeer aggregaten
  const scenarios = s7.scenarios as Record<string, Scenario>;
  for (const [scenKey, sc] of Object.entries(scenarios)) {
    if (!sc?.domeinen) continue;
    const tarief = sc.uurtariefGebruikt ?? 70;
    const startJaar = sc.startJaar ?? 2026;

    for (const dom of sc.domeinen) {
      if (dom.domein !== "mens" && dom.domein !== "data_systemen") continue;
      if (!dom.jaren) continue;

      // Verwijder rol per jaar
      for (const jaar of dom.jaren) {
        if (!jaar.rollen) continue;
        const idx = jaar.rollen.findIndex((r) => r.functieId === TARGET_ID);
        if (idx >= 0) {
          jaar.rollen.splice(idx, 1);
        }
      }

      // Hercalculeer per-jaar-totalen voor dit domein
      for (const jaar of dom.jaren) {
        const u = (jaar.rollen ?? []).reduce((acc, r) => acc + (r.urenTotaal ?? 0), 0);
        const indexF = Math.pow(1.05, jaar.jaar - 2025);
        jaar.totaalUren = u;
        jaar.totaalKosten = Math.round(u * tarief * indexF);
      }

      // Hercalculeer domein-totalen
      const domTotU = (dom.jaren ?? []).reduce((acc, j) => acc + (j.totaalUren ?? 0), 0);
      const domTotK = (dom.jaren ?? []).reduce((acc, j) => acc + (j.totaalKosten ?? 0), 0);
      dom.totaalUren = domTotU;
      dom.uren = domTotU;
      dom.totaalKosten = domTotK;
      // programmaUren / lijnUren — gebruik domein.programmaPct
      const pct = typeof dom.programmaPct === "number" ? dom.programmaPct : 0.75;
      dom.programmaUren = Math.round(domTotU * pct);
      dom.lijnUren = domTotU - dom.programmaUren;
    }

    // Hercalculeer scenario-totalen + totalenPerJaar
    const scTotU = (sc.domeinen ?? []).reduce((acc, d) => acc + (d.totaalUren ?? 0), 0);
    const scTotK = (sc.domeinen ?? []).reduce((acc, d) => acc + (d.totaalKosten ?? 0), 0);
    sc.totaalUren = scTotU;
    sc.totaalKosten = scTotK;
    sc.programmaUren = (sc.domeinen ?? []).reduce((acc, d) => acc + (d.programmaUren ?? 0), 0);
    sc.lijnUren = scTotU - (sc.programmaUren ?? 0);

    // totalenPerJaar — vul opnieuw uit alle domein.jaren
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

    console.log(`  · scenario ${scenKey}: totaalUren=${scTotU}, totaalKosten=${scTotK}`);
  }

  // 4. Update Lezing-marker overzicht
  const lezing = s7.interneUrenLezing as Record<string, unknown> | undefined;
  if (lezing?.overzicht) {
    const overzicht = lezing.overzicht as Record<string, { aangemeld?: number; metUren?: number; [k: string]: unknown }>;
    if (overzicht.mens) {
      const oudMens = overzicht.mens.aangemeld ?? 80;
      overzicht.mens.aangemeld = Math.max(0, oudMens - 2);
      overzicht.mens.metUren = overzicht.mens.aangemeld;
    }
    if (overzicht.data_systemen) {
      const oudDs = overzicht.data_systemen.aangemeld ?? 39;
      overzicht.data_systemen.aangemeld = Math.max(0, oudDs - 1);
      overzicht.data_systemen.metUren = overzicht.data_systemen.aangemeld;
    }
  }

  // 5. Marker
  s7.productmanagerIntZakVerwijderd = {
    reverted: true,
    timestamp: new Date().toISOString(),
    reden: "Functie Productmanager A (Internationaal & Zakelijk) bestaat niet meer in organisatie",
    mutaties,
  };

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
  console.log(`\n✓ Productmanager Internationaal & Zakelijk verwijderd — ${mutaties} mutaties.`);
}

void main();
