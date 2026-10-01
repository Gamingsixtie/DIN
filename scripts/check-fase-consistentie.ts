// Check of fase + activiteit per inspanning consistent zijn over scenarios.
// Toont per inspanning: per scenario de fase-keten (jaar → fase) en
// flagt verschillen.
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

type Cell = { jaar: number; euro: number; fase?: string; activiteit?: string };
type Insp = { inspanningTitel: string; verdelingPerJaar?: Cell[]; motivatie?: string };

async function main() {
  const s = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
  );
  const { data } = await s
    .from("din_sessions")
    .select("data, updated_at")
    .eq("id", "d8b97442-ce8f-4134-b2c7-67dc8e3a3f93")
    .maybeSingle();
  if (!data) return;
  const sess = data.data as Record<string, unknown>;
  const adv = ((sess.crossAnalyseWizard as Record<string, unknown>)?.stepResults as Record<string, unknown>)
    ?.stap4 as Record<string, unknown> | undefined;
  const beg = adv?.begrotingAdvies as
    | { scenarios?: Record<string, { samenvatting?: string; inspanningen?: Insp[] } | null> }
    | undefined;

  console.log(`Versie: ${sess.version} | Updated: ${data.updated_at}\n`);

  // Per inspanning: fase per scenario per jaar
  const scOrder = ["advies", "plus20", "optimaal", "min20"] as const;
  const inspNames = new Set<string>();
  for (const sc of Object.values(beg?.scenarios ?? {})) {
    for (const i of sc?.inspanningen ?? []) inspNames.add(i.inspanningTitel);
  }

  for (const inspName of inspNames) {
    console.log("═".repeat(80));
    console.log(`INSPANNING: ${inspName}`);
    console.log("─".repeat(80));
    for (const sk of scOrder) {
      const sc = beg?.scenarios?.[sk];
      const ins = sc?.inspanningen?.find((i) => i.inspanningTitel === inspName);
      if (!ins) continue;
      const phases = (ins.verdelingPerJaar ?? [])
        .map((c) => `${c.jaar}: ${c.fase ?? "(geen fase)"}`)
        .join("\n      ");
      console.log(`  ▌ ${sk}:`);
      console.log(`      ${phases}`);
    }
    console.log();

    // Vergelijk fase-ketens — verzamel unieke fase-sets per scenario
    const phaseSets: Record<string, string[]> = {};
    for (const sk of scOrder) {
      const sc = beg?.scenarios?.[sk];
      const ins = sc?.inspanningen?.find((i) => i.inspanningTitel === inspName);
      if (!ins) continue;
      phaseSets[sk] = (ins.verdelingPerJaar ?? []).map((c) => c.fase ?? "");
    }

    // Toon de motivatie per scenario (kort)
    console.log("  MOTIVATIES (eerste 200 chars):");
    for (const sk of scOrder) {
      const sc = beg?.scenarios?.[sk];
      const ins = sc?.inspanningen?.find((i) => i.inspanningTitel === inspName);
      if (!ins) continue;
      console.log(`  ▌ ${sk}: ${ins.motivatie?.slice(0, 250) ?? "(geen)"}`);
    }
    console.log();
  }
}

void main();
