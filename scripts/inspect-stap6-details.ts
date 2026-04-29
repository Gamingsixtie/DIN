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
  const stap4 = ((s.crossAnalyseWizard as Record<string, unknown>)?.stepResults as Record<string, Record<string, unknown>>)?.stap4;
  const b = stap4?.begrotingAdvies as Record<string, unknown> | undefined;
  if (!b) return;
  const sc = b.scenarios as Record<string, Record<string, unknown> | null>;

  for (const lbl of ["optimaal", "plus20", "min20"]) {
    const s2 = sc[lbl];
    if (!s2) continue;
    console.log(`\n========== ${lbl.toUpperCase()} (€${s2.jaarlijksBudgetEuro}/jr × ${s2.aantalJaren} jaar = totaal €${s2.totaalGeraamdEuro}) ==========`);
    const insps = s2.inspanningen as Array<Record<string, unknown>>;
    for (const insp of insps) {
      console.log(`\n  [${insp.domein}] ${insp.inspanningTitel}  → totaal €${insp.totaalEuro} (${insp.percentageTotaal}%)`);
      console.log(`     motivatie: ${String(insp.motivatie).slice(0, 200)}`);
      const v = insp.verdelingPerJaar as Array<Record<string, unknown>>;
      for (const item of v) {
        console.log(`     ${item.jaar}: €${item.euro}  ${item.fase}  — ${String(item.activiteit ?? "").slice(0, 100)}`);
      }
    }
    const tpj = s2.totalenPerJaar as Array<Record<string, unknown>>;
    console.log(`  Totalen per jaar:`);
    for (const t of tpj) {
      console.log(`     ${t.jaar}: €${t.euro} (${t.percentage}%)`);
    }
  }

  // Show what input the AI got — read din_efforts and dossierKostenraming
  console.log("\n\n========== INSPANNINGEN INPUT (din_efforts) ==========");
  const efforts = s.din_efforts as Array<Record<string, unknown>> | undefined;
  if (efforts) {
    for (const e of efforts) {
      console.log(`\n  [${e.domain}] ${e.title ?? e.description}`);
      console.log(`     dossierKostenraming: ${e.dossierKostenraming ?? "<leeg>"}`);
      const aannames = e.businessCaseAannames as string[] | undefined;
      if (aannames?.length) {
        console.log(`     aannames:`);
        for (const a of aannames) console.log(`       - ${a}`);
      }
      const risicos = e.businessCaseRisicos as string[] | undefined;
      if (risicos?.length) {
        console.log(`     risicos:`);
        for (const r of risicos) console.log(`       - ${r}`);
      }
    }
  }
}
main().catch(e => { console.error(e); process.exit(1); });
