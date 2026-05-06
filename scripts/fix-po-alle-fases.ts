// Fix: Product Owner van de systemen krijgt uren in ELKE fase/jaar van data_systemen.
// Kopieert PM_D-uren waar PO_b ontbreekt. Idempotent via marker.
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

async function main() {
  const s = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!);
  const { data, error: rErr } = await s.from("din_sessions").select("data").eq("id", SESSION_ID).maybeSingle();
  if (rErr || !data) { console.error(rErr); process.exit(1); }
  const sess = data.data as Record<string, unknown>;
  const wiz = sess.crossAnalyseWizard as Record<string, unknown>;
  const stepResults = wiz.stepResults as Record<string, unknown>;
  const stap4 = stepResults.stap4 as Record<string, unknown>;
  const s7 = stap4.stap7InterneUren as Record<string, unknown>;

  if (s7.poAlleFasesApplied) {
    console.log("⏭ Marker poAlleFasesApplied al aanwezig:", s7.poAlleFasesApplied);
    return;
  }

  const scenarios = s7.scenarios as Record<string, { domeinen?: Array<{ domein: string; jaren?: Array<{ jaar: number; rollen?: Array<Record<string, unknown>> }> }> }>;

  let added = 0;
  for (const [scKey, sc] of Object.entries(scenarios)) {
    const dataDom = sc.domeinen?.find((d) => d.domein === "data_systemen");
    if (!dataDom?.jaren) continue;
    for (const jaar of dataDom.jaren) {
      if (!jaar.rollen) jaar.rollen = [];
      const pob = jaar.rollen.find((r) => r.functieId === "productowner_b_producten");
      if (pob && (pob.uren as number) > 0) continue; // al aanwezig
      // Kopieer van projectmanager_d
      const pmd = jaar.rollen.find((r) => r.functieId === "projectmanager_d");
      if (!pmd) continue;
      if (pob) {
        pob.uren = pmd.uren;
        pob.kosten = pmd.kosten;
        pob.uurtarief = pmd.uurtarief;
        pob.functieNaam = "Product Owner van de systemen";
        pob.categorie = "kernteam";
        pob.programmaPct = 0.8;
        pob.lijnPct = 0.2;
        pob.raadplegenPct = 0;
      } else {
        jaar.rollen.push({
          functieId: "productowner_b_producten",
          functieNaam: "Product Owner van de systemen",
          afdeling: "Data & Technologie",
          uren: pmd.uren,
          kosten: pmd.kosten,
          uurtarief: pmd.uurtarief,
          categorie: "kernteam",
          programmaPct: 0.8,
          lijnPct: 0.2,
          raadplegenPct: 0,
        });
      }
      added++;
      console.log(`✓ ${scKey} ${jaar.jaar}: PO_b ${pmd.uren}u toegevoegd (kopie PM_D)`);
    }
  }

  // Update vUPI[data].rollen — herbereken urenTotaal voor PO_b op basis van advies-scenario optellen
  const vUPI = s7.vastgesteldeUrenPerInspanning as Array<{ domein?: string; rollen: Array<Record<string, unknown>> }>;
  const dataGrp = vUPI.find((g) => g.domein === "data_systemen");
  if (dataGrp) {
    const adviesScen = scenarios.advies;
    const adviesData = adviesScen?.domeinen?.find((d) => d.domein === "data_systemen");
    let advTot = 0;
    for (const j of adviesData?.jaren ?? []) {
      const p = j.rollen?.find((r) => r.functieId === "productowner_b_producten");
      advTot += (p?.uren as number) ?? 0;
    }
    const pobUPI = dataGrp.rollen.find((r) => r.functieId === "productowner_b_producten");
    if (pobUPI) {
      pobUPI.urenTotaal = advTot;
      pobUPI.onderbouwing = `1 persoon × ${advTot}u over advies-scenario (4 jaar) — producteigenaar CRM-platform actief in elke fase: analyse (2026), bouw (2027), acceptatie (2028), borging (2029). Ontwerpkeuzes, releaseprioriteiten, datamodel-governance richting leverancier en interne stuurgroep continu.`;
      console.log(`✓ vUPI data PO_b: urenTotaal = ${advTot}u`);
    }
  }

  // Hercalc aggregaten
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
        (jaar as Record<string, unknown>).totaalUren = jU;
        (jaar as Record<string, unknown>).programmaUren = Math.round(jP);
        (jaar as Record<string, unknown>).lijnUren = Math.round(jL);
        (jaar as Record<string, unknown>).raadplegenUren = Math.round(jR);
        domTotU += jU; domP += jP; domL += jL; domR += jR;
      }
      (dom as Record<string, unknown>).totaalUren = domTotU;
      (dom as Record<string, unknown>).uren = domTotU;
      (dom as Record<string, unknown>).programmaUren = Math.round(domP);
      (dom as Record<string, unknown>).lijnUren = Math.round(domL);
      (dom as Record<string, unknown>).raadplegenUren = Math.round(domR);
      (dom as Record<string, unknown>).programmaPct = domTotU > 0 ? domP / domTotU : 0;
      scTotU += domTotU; scP += domP; scL += domL; scR += domR;
    }
    (sc as Record<string, unknown>).totaalUren = scTotU;
    (sc as Record<string, unknown>).programmaUren = Math.round(scP);
    (sc as Record<string, unknown>).lijnUren = Math.round(scL);
    (sc as Record<string, unknown>).raadplegenUren = Math.round(scR);
    const tjP = (sc as { totalenPerJaar?: Array<{ jaar: number; uren?: number; programmaUren?: number; lijnUren?: number; raadplegenUren?: number }> }).totalenPerJaar;
    if (tjP) {
      for (const t of tjP) {
        let u = 0, p = 0, l = 0, r = 0;
        for (const dom of sc.domeinen ?? []) {
          const j = (dom.jaren ?? []).find((x) => x.jaar === t.jaar) as Record<string, unknown> | undefined;
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
  }

  s7.poAlleFasesApplied = { timestamp: new Date().toISOString(), added };
  const newData = { ...sess, crossAnalyseWizard: { ...wiz, stepResults: { ...stepResults, stap4: { ...stap4, stap7InterneUren: s7 } } } };
  const { error } = await s.from("din_sessions").update({ data: newData }).eq("id", SESSION_ID);
  if (error) { console.error("Write error:", error.message); process.exit(1); }
  console.log(`\n✓ ${added} jaar-records voor PO_b toegevoegd. Eindstand:`);
  for (const [k, sc] of Object.entries(scenarios)) {
    const sca = sc as { totaalUren?: number };
    console.log(`  ${k}: totaal=${sca.totaalUren}u`);
  }
}

void main();
