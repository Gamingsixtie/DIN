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
  const wiz = s.crossAnalyseWizard as Record<string, unknown>;
  const stepResults = wiz?.stepResults as Record<string, Record<string, unknown>>;

  // The consolidated efforts feeding begroting come from stap3.inspanningClusters
  // (or possibly stap4.consolidatieAdvies). Dump both.
  const stap3 = stepResults?.stap3;
  const stap4 = stepResults?.stap4;

  console.log("=== stap3.inspanningClusters ===");
  const ic = stap3?.inspanningClusters as Array<Record<string, unknown>> | undefined;
  if (ic) {
    for (const c of ic) {
      console.log(`\n[${c.domein}] ${c.titel ?? c.voorgesteldeNaam}  (actie=${c.actie})`);
      const dossier = c.dossier as Record<string, unknown> | undefined;
      const bc = c.businessCase as Record<string, unknown> | undefined;
      const bcResult = bc?.result as Record<string, unknown> | undefined;
      console.log(`  kostenraming: ${dossier?.kostenraming ?? "<leeg>"}`);
      const aannames = bcResult?.aannames as string[] | undefined;
      if (aannames?.length) {
        console.log(`  aannames:`);
        for (const a of aannames) console.log(`    - ${a}`);
      }
      const risicos = bcResult?.risicos as string[] | undefined;
      if (risicos?.length) {
        console.log(`  risicos:`);
        for (const r of risicos) console.log(`    - ${r}`);
      }
    }
  } else {
    console.log("geen inspanningClusters");
  }

  console.log("\n\n=== stap4.consolidatieAdvies ===");
  const ca = stap4?.consolidatieAdvies as Array<Record<string, unknown>> | Record<string, unknown> | undefined;
  console.log(JSON.stringify(ca, null, 2)?.slice(0, 2000));
}
main().catch(e => { console.error(e); process.exit(1); });
