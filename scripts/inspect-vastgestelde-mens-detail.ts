// Inspecteer vastgesteldeUrenPerInspanning[2] (mens) volledig om Taak-3
// consistentie-rapport te schrijven.
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

const SESSION_ID = "d8b97442-ce8f-4134-b2c7-67dc8e3a3f93";
const supa = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
);

async function main() {
  const { data } = await supa
    .from("din_sessions")
    .select("data")
    .eq("id", SESSION_ID)
    .maybeSingle();
  const stap4: any = data!.data?.crossAnalyseWizard?.stepResults?.stap4;
  const v = stap4?.stap7InterneUren?.vastgesteldeUrenPerInspanning?.[2];
  if (!v) {
    console.log("vastgesteldeUrenPerInspanning[2] niet aanwezig");
    return;
  }
  console.log("Inspanning:", v.inspanningTitel);
  console.log("Domein:", v.domein);
  console.log();
  let totaal = 0;
  for (const r of v.rollen ?? []) {
    console.log(`  ${r.functieNaam} (${r.functieId})  uren=${r.urenTotaal}  aantal=${r.aantal ?? "?"}`);
    totaal += r.urenTotaal ?? 0;
  }
  console.log(`\nTotaal: ${totaal}u`);

  // Selectie ophalen
  const sel: any = stap4?.stap7InterneUren?.selectiePerDomein?.mens;
  if (sel) {
    let n = 0;
    console.log("\nselectiePerDomein.mens:");
    for (const k of Object.keys(sel)) {
      console.log(`  ${k}: aantal=${sel[k].aantal}`);
      n += sel[k].aantal ?? 0;
    }
    console.log(`Totaal aantal: ${n}`);
  }
}
main().catch((e) => { console.error(e); process.exit(1); });
