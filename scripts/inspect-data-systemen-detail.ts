// READ-ONLY: dump data_systemen vast records met aantallen volgens selectiePerDomein
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
    const key = t.substring(0, e).trim();
    const val = t.substring(e + 1).trim().replace(/^["']|["']$/g, "");
    if (!process.env[key]) process.env[key] = val;
  }
}
loadEnvFile(join(process.cwd(), ".env.local"));
const SESSION_ID = "d8b97442-ce8f-4134-b2c7-67dc8e3a3f93";
const supa = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!);

type Json = Record<string, unknown>;

async function main() {
  const { data: row } = await supa.from("din_sessions").select("data").eq("id", SESSION_ID).maybeSingle();
  const sess = (row as { data: Json }).data;
  const stap7 = ((sess.crossAnalyseWizard as Json)?.stepResults as Json)?.stap4 as Json;
  const s7 = (stap7.stap7InterneUren as Json);
  const sel = (s7.selectiePerDomein as Record<string, Record<string, Record<string, unknown>>>).data_systemen ?? {};
  const vast = (s7.vastgesteldeUrenPerInspanning as Array<{ domein: string; rollen: Array<{ functieId: string; functieNaam: string; urenTotaal: number; afdeling?: string }> }>).find((x) => x.domein === "data_systemen");
  console.log("=== data_systemen vastgesteldeUren met aantal-mapping uit selectiePerDomein ===");
  let totaalPersonen = 0;
  for (const r of vast?.rollen ?? []) {
    const ent = sel[r.functieId];
    const aantal = (ent?.aantal as number | undefined) ?? "(niet in selectie!)";
    if (typeof aantal === "number") totaalPersonen += aantal;
    console.log(`  ${r.functieId}  (${r.functieNaam})  aantal=${aantal}  uren=${r.urenTotaal}`);
  }
  console.log(`\nTotaal personen-met-uren via selectie-aantal mapping: ${totaalPersonen}`);

  console.log("\n=== Cat 1 user-akkoord IDs (volgens audit DOORGEVOERD) ===");
  console.log("  - manager_klantcontact (1p, 28u advies-basis)");
  console.log("  - accountmanager_c_prof (3p, 108u advies-basis)");
  console.log("  → Cat-1 toevoegingen = 4 personen / 2 IDs");

  console.log("\n=== Originele vast-IDs zonder cat-1 (vóór data_systemen Cat-1) ===");
  console.log(`  vast-IDs nu: ${vast?.rollen.length}`);
  console.log(`  - 2 cat-1 IDs (manager_klantcontact, accountmanager_c_prof)`);
  console.log(`  = ${(vast?.rollen.length ?? 0) - 2} originele IDs`);
}

main().catch((e) => { console.error(e); process.exit(1); });
