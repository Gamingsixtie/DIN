// Fix: zet programmaPct/lijnPct/raadplegenPct per categorie correct.
// Vorige driedeling-script heeft uniform 0.5/0.5/0 gezet ipv per categorie.
// Plus: verwijder productmanager_int_zak (weer teruggekomen via browser-tab).
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

// Pcts per categorie + domein-context
function pctsVoor(categorie: string | undefined, domein: string): { p: number; l: number; r: number } {
  switch (categorie) {
    case "leider":
      return { p: 0.9, l: 0.1, r: 0 };
    case "kernteam":
      // MT-cultuur 50/50, anders 80/20
      return domein === "cultuur" ? { p: 0.5, l: 0.5, r: 0 } : { p: 0.8, l: 0.2, r: 0 };
    case "trainings_deelnemer":
    case "trainings-deelnemer":
      return { p: 0.5, l: 0.5, r: 0 };
    case "geconsulteerd":
      return { p: 0, l: 0, r: 1.0 };
    default:
      return { p: 0.7, l: 0.3, r: 0 };
  }
}

async function main() {
  const s = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!);
  const { data } = await s.from("din_sessions").select("data").eq("id", SESSION_ID).maybeSingle();
  const sess = data!.data as Record<string, unknown>;
  const wiz = sess.crossAnalyseWizard as Record<string, unknown>;
  const stepResults = wiz.stepResults as Record<string, unknown>;
  const stap4 = stepResults.stap4 as Record<string, unknown>;
  const s7 = stap4.stap7InterneUren as Record<string, unknown>;

  // 1. Verwijder int_zak overal (weer)
  const sel = s7.selectiePerDomein as Record<string, Record<string, unknown>>;
  for (const dom of ["mens", "data_systemen"]) {
    if (sel[dom]?.["productmanager_int_zak"]) {
      delete sel[dom]["productmanager_int_zak"];
      console.log(`  - selectiePerDomein.${dom}: int_zak weg`);
    }
  }

  const vUPI = s7.vastgesteldeUrenPerInspanning as Array<{ domein: string; rollen: Array<Record<string, unknown>> }>;
  for (const grp of vUPI) {
    const before = grp.rollen.length;
    grp.rollen = grp.rollen.filter((r) => r.functieId !== "productmanager_int_zak");
    if (grp.rollen.length < before) console.log(`  - vUPI[${grp.domein}]: int_zak weg`);
  }

  const scenarios = s7.scenarios as Record<string, { domeinen?: Array<{ domein: string; jaren?: Array<{ rollen?: Array<Record<string, unknown>>; totaalUren?: number; totaalKosten?: number }>; totaalUren?: number; totaalKosten?: number; programmaUren?: number; lijnUren?: number; raadplegenUren?: number; programmaPct?: number }>; totaalUren?: number; totaalKosten?: number; programmaUren?: number; lijnUren?: number; raadplegenUren?: number; totalenPerJaar?: Array<{ jaar: number; uren?: number; kosten?: number; programmaUren?: number; lijnUren?: number; raadplegenUren?: number }> }>;

  for (const sc of Object.values(scenarios)) {
    for (const dom of sc.domeinen ?? []) {
      for (const jaar of dom.jaren ?? []) {
        if (!jaar.rollen) continue;
        jaar.rollen = jaar.rollen.filter((r) => r.functieId !== "productmanager_int_zak");
      }
    }
  }

  // 2. Pcts per categorie - zowel vUPI als per scenario
  let updates = 0;

  for (const grp of vUPI) {
    for (const rol of grp.rollen) {
      const pcts = pctsVoor(rol.categorie as string | undefined, grp.domein);
      rol.programmaPct = pcts.p;
      rol.lijnPct = pcts.l;
      rol.raadplegenPct = pcts.r;
      updates++;
    }
  }

  for (const [scenKey, sc] of Object.entries(scenarios)) {
    for (const dom of sc.domeinen ?? []) {
      for (const jaar of dom.jaren ?? []) {
        for (const rol of jaar.rollen ?? []) {
          const pcts = pctsVoor(rol.categorie as string | undefined, dom.domein);
          rol.programmaPct = pcts.p;
          rol.lijnPct = pcts.l;
          rol.raadplegenPct = pcts.r;
          updates++;
        }
      }

      // Hercalculeer per-jaar uren-totalen + 3 uren-types
      let domTotU = 0;
      let domProgU = 0;
      let domLijnU = 0;
      let domRaadU = 0;
      for (const jaar of dom.jaren ?? []) {
        let jaarU = 0, jaarP = 0, jaarL = 0, jaarR = 0;
        for (const rol of jaar.rollen ?? []) {
          const u = (rol.uren as number) ?? 0;
          jaarU += u;
          jaarP += u * ((rol.programmaPct as number) ?? 0);
          jaarL += u * ((rol.lijnPct as number) ?? 0);
          jaarR += u * ((rol.raadplegenPct as number) ?? 0);
        }
        jaar.totaalUren = jaarU;
        (jaar as Record<string, unknown>).programmaUren = Math.round(jaarP);
        (jaar as Record<string, unknown>).lijnUren = Math.round(jaarL);
        (jaar as Record<string, unknown>).raadplegenUren = Math.round(jaarR);
        domTotU += jaarU;
        domProgU += jaarP;
        domLijnU += jaarL;
        domRaadU += jaarR;
      }
      dom.totaalUren = domTotU;
      dom.programmaUren = Math.round(domProgU);
      dom.lijnUren = Math.round(domLijnU);
      dom.raadplegenUren = Math.round(domRaadU);
      dom.programmaPct = domTotU > 0 ? domProgU / domTotU : 0;
    }

    // Scenario-niveau aggregaten
    const scTotU = (sc.domeinen ?? []).reduce((a, d) => a + (d.totaalUren ?? 0), 0);
    sc.totaalUren = scTotU;
    sc.programmaUren = (sc.domeinen ?? []).reduce((a, d) => a + (d.programmaUren ?? 0), 0);
    sc.lijnUren = (sc.domeinen ?? []).reduce((a, d) => a + (d.lijnUren ?? 0), 0);
    sc.raadplegenUren = (sc.domeinen ?? []).reduce((a, d) => a + (d.raadplegenUren ?? 0), 0);

    if (sc.totalenPerJaar) {
      for (const t of sc.totalenPerJaar) {
        let u = 0, p = 0, l = 0, r = 0;
        for (const dom of sc.domeinen ?? []) {
          const j = (dom.jaren ?? []).find((x) => (x as { jaar?: number }).jaar === t.jaar) as Record<string, unknown> | undefined;
          if (!j) continue;
          u += (j.totaalUren as number) ?? 0;
          p += (j.programmaUren as number) ?? 0;
          l += (j.lijnUren as number) ?? 0;
          r += (j.raadplegenUren as number) ?? 0;
        }
        t.uren = u;
        t.programmaUren = p;
        t.lijnUren = l;
        t.raadplegenUren = r;
      }
    }

    console.log(`  ${scenKey}: totaal=${scTotU} prog=${sc.programmaUren} lijn=${sc.lijnUren} raadplegen=${sc.raadplegenUren}`);
  }

  s7.pctsPerCategorieFix = { timestamp: new Date().toISOString(), updates };

  const newData = { ...sess, crossAnalyseWizard: { ...wiz, stepResults: { ...stepResults, stap4: { ...stap4, stap7InterneUren: s7 } } } };
  const { error } = await s.from("din_sessions").update({ data: newData }).eq("id", SESSION_ID);
  if (error) { console.error(error.message); process.exit(1); }
  console.log(`\n✓ ${updates} rollen bijgewerkt met pcts per categorie + int_zak weg.`);
}

void main();
