// Inspect PO_b uren per jaar per scenario
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
  const { data } = await s.from("din_sessions").select("data").eq("id", SESSION_ID).maybeSingle();
  const sess = data!.data as Record<string, unknown>;
  const wiz = sess.crossAnalyseWizard as Record<string, unknown>;
  const stepResults = wiz.stepResults as Record<string, unknown>;
  const stap4 = stepResults.stap4 as Record<string, unknown>;
  const s7 = stap4.stap7InterneUren as Record<string, unknown>;
  const scenarios = s7.scenarios as Record<string, { domeinen?: Array<{ domein: string; jaren?: Array<{ jaar: number; rollen?: Array<Record<string, unknown>> }> }> }>;

  for (const [scKey, sc] of Object.entries(scenarios)) {
    const data_dom = sc.domeinen?.find((d) => d.domein === "data_systemen");
    if (!data_dom?.jaren) continue;
    console.log(`\n=== ${scKey} ===`);
    for (const jaar of data_dom.jaren) {
      const pob = jaar.rollen?.find((r) => r.functieId === "productowner_b_producten");
      const pmd = jaar.rollen?.find((r) => r.functieId === "projectmanager_d");
      console.log(`  ${jaar.jaar}: PO_b=${pob?.uren ?? "missing"}u, PM_D=${pmd?.uren ?? "missing"}u`);
    }
  }
}

void main();
