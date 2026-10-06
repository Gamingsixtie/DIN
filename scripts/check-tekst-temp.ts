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
  const s = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
  );
  const { data } = await s
    .from("din_sessions")
    .select("data")
    .eq("id", "d8b97442-ce8f-4134-b2c7-67dc8e3a3f93")
    .maybeSingle();
  if (!data) return;
  const sess = data.data as Record<string, unknown>;
  const beg = ((sess.crossAnalyseWizard as Record<string, unknown>)?.stepResults as Record<string, unknown>)
    ?.stap4 as Record<string, unknown> | undefined;
  const adv = beg?.begrotingAdvies as
    | { samenvattingTotaal?: string; tekstenSchoon?: boolean; scenarios?: Record<string, { samenvatting?: string; prioriteitAdvies?: string; inspanningen?: Array<{ inspanningTitel: string; motivatie?: string }> } | null> }
    | undefined;
  console.log("tekstenSchoon:", adv?.tekstenSchoon);
  console.log("samenvattingTotaal lengte:", adv?.samenvattingTotaal?.length ?? 0);
  console.log();
  for (const [k, sc] of Object.entries(adv?.scenarios ?? {})) {
    if (!sc) continue;
    console.log(`▌ ${k}`);
    console.log(`  samenvatting (${sc.samenvatting?.length ?? 0} chars): ${sc.samenvatting?.slice(0, 120)}…`);
    console.log(`  prioriteitAdvies (${sc.prioriteitAdvies?.length ?? 0} chars): ${sc.prioriteitAdvies?.slice(0, 120)}…`);
    for (const i of sc.inspanningen ?? []) {
      console.log(`    [${i.inspanningTitel.slice(0, 30)}] motivatie (${i.motivatie?.length ?? 0} chars)`);
    }
    console.log();
  }
}

void main();
