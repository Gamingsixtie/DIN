import { createClient } from "@supabase/supabase-js";
import { readFileSync, existsSync } from "fs";
import { join } from "path";

function loadEnvFile(path: string) {
  if (!existsSync(path)) return;
  const content = readFileSync(path, "utf-8");
  for (const line of content.split(/\r?\n/)) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const eq = trimmed.indexOf("=");
    if (eq === -1) continue;
    const key = trimmed.substring(0, eq).trim();
    const val = trimmed.substring(eq + 1).trim().replace(/^["']|["']$/g, "");
    if (!process.env[key]) process.env[key] = val;
  }
}
loadEnvFile(join(process.cwd(), ".env.local"));

const supa = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!);

async function main() {
  const { data } = await supa.from("din_sessions").select("data").eq("id", process.argv[2]).maybeSingle();
  const s = data!.data as Record<string, unknown>;
  const wiz = s.crossAnalyseWizard as { stepResults?: Record<string, Record<string, unknown>> };
  const stap4 = wiz.stepResults?.stap4!;
  const stap7 = stap4.stap7InterneUren as Record<string, unknown>;

  console.log("STAP7 keys:", Object.keys(stap7 ?? {}));
  console.log("\nSelectiePerDomein:", JSON.stringify(stap7.selectiePerDomein, null, 2));
  console.log("\nCustomFunctiesPerDomein:", JSON.stringify(stap7.customFunctiesPerDomein, null, 2));
  console.log("\nurenBudgetStart:", stap7.urenBudgetStart);

  const vast = stap7.vastgesteldeUrenPerInspanning as unknown[] | undefined;
  console.log("\nvastgesteldeUrenPerInspanning:");
  if (vast) {
    for (const v of vast) {
      const vv = v as Record<string, unknown>;
      const rollen = vv.rollen as Array<Record<string, unknown>>;
      console.log(`  [${vv.domein}] groepId=${vv.groepId} "${(vv.inspanningTitel as string).slice(0, 40)}" rollen=${rollen.length}`);
      for (const r of rollen) {
        console.log(`     - ${r.functieNaam} (id=${r.functieId}) urenTotaal=${r.urenTotaal}`);
      }
    }
  }

  // Scenario output — is er al een plus20 advies dat faalde?
  const scenarios = stap7.scenarios as Record<string, unknown> | undefined;
  if (scenarios) {
    for (const label of ["optimaal", "plus20", "min20"]) {
      const sc = scenarios[label] as Record<string, unknown> | null;
      console.log(`\nStap7.${label}:`, sc === null ? "NULL" : `${Object.keys(sc).length} keys, samenvatting="${(sc.samenvatting as string)?.slice(0, 60)}"`);
    }
  }
}
main().catch(e => { console.error(e); process.exit(1); });
