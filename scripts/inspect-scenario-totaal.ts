// Inspect scenario object structure to find total + jaarTotalen.
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
  const adv = ((sess.crossAnalyseWizard as Record<string, unknown>)?.stepResults as Record<string, unknown>)
    ?.stap4 as Record<string, unknown> | undefined;
  const beg = adv?.begrotingAdvies as Record<string, unknown> | undefined;
  console.log("Top-level keys begrotingAdvies:", Object.keys(beg ?? {}));
  const scenarios = (beg?.scenarios ?? {}) as Record<string, Record<string, unknown> | null>;
  for (const sk of Object.keys(scenarios)) {
    const sc = scenarios[sk];
    if (!sc) continue;
    console.log(`\n=== ${sk} ===`);
    console.log("Keys:", Object.keys(sc));
    // Check if there's a totaalEuro in another shape
    if ("inspanningen" in sc) {
      const insp = sc.inspanningen as Array<{ verdelingPerJaar?: Array<{ jaar: number; euro: number }> }>;
      let totaal = 0;
      const yearMap = new Map<number, number>();
      for (const i of insp ?? []) {
        for (const c of i.verdelingPerJaar ?? []) {
          totaal += c.euro;
          yearMap.set(c.jaar, (yearMap.get(c.jaar) ?? 0) + c.euro);
        }
      }
      const years = [...yearMap.keys()].sort();
      console.log(`Berekend totaal: € ${totaal.toLocaleString("nl-NL")}`);
      console.log(`Jaren: ${years.length} (${years[0]} – ${years[years.length - 1]})`);
      for (const y of years) {
        console.log(`  ${y}: € ${yearMap.get(y)!.toLocaleString("nl-NL")}`);
      }
    }
  }
}
void main();
