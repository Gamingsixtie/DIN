// Verify uitvoering — check huidige Supabase-state
import { createClient } from "@supabase/supabase-js";
import { readFileSync, existsSync } from "fs";
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

async function main() {
  const supa = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
  );
  const { data } = await supa.from("din_sessions").select("data").eq("id", "d8b97442-ce8f-4134-b2c7-67dc8e3a3f93").maybeSingle();
  const stap7 = (data!.data as Record<string, unknown>).crossAnalyseWizard;
  // @ts-expect-error nested
  const s = stap7.stepResults.stap4.stap7InterneUren;

  console.log("=== vastgesteldeUrenPerInspanning data_systemen ===");
  // @ts-expect-error nested
  const dsv = s.vastgesteldeUrenPerInspanning.find((x) => x.domein === "data_systemen");
  // @ts-expect-error nested
  for (const r of dsv.rollen) console.log(`  - ${r.functieId}: ${r.urenTotaal}u`);

  console.log("\n=== stilleSelectiesDoorgevoerd ===");
  console.log(JSON.stringify(s.stilleSelectiesDoorgevoerd, null, 2));

  console.log("\n=== selectiePerDomein.data_systemen markers ===");
  const dsSel = s.selectiePerDomein.data_systemen;
  for (const [fid, obj] of Object.entries(dsSel as Record<string, Record<string, unknown>>)) {
    if (obj.stakeholder || obj.reviewVereist) {
      console.log(`  ${fid}: stakeholder=${obj.stakeholder ?? "-"}, reviewVereist=${obj.reviewVereist ?? "-"}`);
      if (obj.stakeholderToelichting) console.log(`    stakeholderToelichting: ${(obj.stakeholderToelichting as string).slice(0, 100)}…`);
      if (obj.reviewVraag) console.log(`    reviewVraag: ${(obj.reviewVraag as string).slice(0, 100)}…`);
    }
  }

  console.log("\n=== Scenario data_systemen domain — manager_klantcontact + accountmanager_c_prof ===");
  for (const [scKey, sc] of Object.entries(s.scenarios as Record<string, unknown>)) {
    if (!sc) continue;
    // @ts-expect-error nested
    const ds = sc.domeinen.find((d) => d.domein === "data_systemen");
    if (!ds) continue;
    let mgr = 0, acc = 0;
    for (const j of ds.jaren) {
      for (const r of j.rollen) {
        if (r.functieId === "manager_klantcontact") mgr += r.uren;
        if (r.functieId === "accountmanager_c_prof") acc += r.uren;
      }
    }
    console.log(`  ${scKey}: mgr_klantcontact=${mgr}u  acc_c_prof=${acc}u  ds-totaal=${ds.totaalUren}u  scen-totaal=${sc.totaalUren}u`);
  }
}

void main();
