// Verify huidige Supabase state na mei-correcties
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
  const { data } = await s.from("din_sessions").select("data, updated_at").eq("id", SESSION_ID).maybeSingle();
  const sess = data!.data as Record<string, unknown>;
  const wiz = sess.crossAnalyseWizard as Record<string, unknown>;
  const stepResults = wiz.stepResults as Record<string, unknown>;
  const stap4 = stepResults.stap4 as Record<string, unknown>;
  const s7 = stap4.stap7InterneUren as Record<string, unknown>;

  console.log("Updated_at:", (data as { updated_at?: string })?.updated_at);
  console.log("\nMarkers:");
  console.log("  tekstUpdateMeiApplied:", s7.tekstUpdateMeiApplied);
  console.log("  cultuurExterneExpertFixed:", s7.cultuurExterneExpertFixed);
  console.log("  meiCorrectiesApplied:", s7.meiCorrectiesApplied);

  const scenarios = s7.scenarios as Record<string, { totaalUren?: number; raadplegenUren?: number }>;
  console.log("\nScenario-totalen in Supabase:");
  for (const [k, sc] of Object.entries(scenarios)) {
    console.log(`  ${k}: totaal=${sc.totaalUren}u raadplegen=${sc.raadplegenUren}u`);
  }

  // Check accountmanager_c_prof aanwezig?
  const sel = s7.selectiePerDomein as Record<string, Record<string, unknown>>;
  console.log("\naccountmanager_c_prof in selectie.data_systemen:", !!sel.data_systemen?.accountmanager_c_prof);
  const vUPI = s7.vastgesteldeUrenPerInspanning as Array<{ domein?: string; rollen: Array<Record<string, unknown>> }>;
  const dataGrp = vUPI.find((g) => g.domein === "data_systemen");
  console.log("accountmanager_c_prof in vUPI[data].rollen:", dataGrp?.rollen.some((r) => r.functieId === "accountmanager_c_prof"));
}

void main();
