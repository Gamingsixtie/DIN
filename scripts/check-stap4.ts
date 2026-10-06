// Inspecteer wat er onder stap 4 (cross-analyse) is opgeslagen.
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

const supa = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
);

async function main() {
  const { data } = await supa.from("din_sessions").select("data")
    .eq("id", "d8b97442-ce8f-4134-b2c7-67dc8e3a3f93").maybeSingle();
  if (!data) return;
  const d = data.data as Record<string, unknown>;

  console.log("=== Top-level keys in session.data ===");
  for (const k of Object.keys(d).sort()) {
    const v = d[k];
    let descr: string;
    if (Array.isArray(v)) descr = `array[${v.length}]`;
    else if (v === null) descr = "null";
    else if (typeof v === "object") descr = `object{${Object.keys(v as object).length}}`;
    else descr = String(v).slice(0, 50);
    console.log(`  ${k}: ${descr}`);
  }

  // CrossAnalyseWizard specifically
  const wiz = d.crossAnalyseWizard as Record<string, unknown> | undefined;
  console.log("\n=== crossAnalyseWizard ===");
  if (wiz) {
    console.log(`  currentStep: ${wiz.currentStep}`);
    console.log(`  completedSteps: ${JSON.stringify(wiz.completedSteps)}`);
    console.log(`  wizardVersion: ${wiz.wizardVersion}`);
    const sr = wiz.stepResults as Record<string, unknown> | undefined;
    if (sr) {
      console.log(`  stepResults keys: ${Object.keys(sr).join(", ")}`);
      for (const [k, v] of Object.entries(sr)) {
        if (!v) continue;
        const vObj = v as Record<string, unknown>;
        console.log(`    ${k}: ${Object.keys(vObj).slice(0, 6).join(", ")}${Object.keys(vObj).length > 6 ? "..." : ""}`);
      }
    } else {
      console.log("  (geen stepResults)");
    }
  } else {
    console.log("  (crossAnalyseWizard ontbreekt in session)");
  }

  // Look for cross-analyse hoofdstap data (NIET in wizard)
  console.log("\n=== Mogelijke 'stap 4' kandidaten op top-level ===");
  for (const k of ["crossAnalyse", "aiCrossAnalyse", "synergieMatrix", "synergyMatrix", "crossAnalyseResult"]) {
    if (k in d) {
      const v = d[k];
      console.log(`  ✓ ${k}: ${Array.isArray(v) ? `array[${v.length}]` : typeof v === "object" ? `object` : "value"}`);
    } else {
      console.log(`  ✗ ${k}: niet aanwezig`);
    }
  }
}
main().catch(console.error);
