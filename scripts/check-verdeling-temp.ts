// Toon verdelingPerJaar voor advies-scenario
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
  const wiz = sess.crossAnalyseWizard as Record<string, unknown> | undefined;
  const stap4 = (wiz?.stepResults as Record<string, unknown> | undefined)?.stap4 as
    | Record<string, unknown>
    | undefined;
  const beg = stap4?.begrotingAdvies as
    | { startJaar?: number; scenarios?: Record<string, {
        scenarioLabel?: string;
        jaarlijksBudgetEuro?: number;
        aantalJaren?: number;
        totaalGeraamdEuro?: number;
        inspanningen?: Array<{
          inspanningTitel: string;
          domein: string;
          totaalEuro?: number;
          verdelingPerJaar?: Array<{ jaar: number; euro: number }>;
        }>;
      }> }
    | undefined;
  const startJaar = beg?.startJaar ?? 2026;
  for (const [k, sc] of Object.entries(beg?.scenarios ?? {})) {
    if (!sc) continue;
    console.log(
      `═ ${k.toUpperCase()} (${sc.aantalJaren} jr × € ${(sc.jaarlijksBudgetEuro ?? 0).toLocaleString("nl-NL")} cap = totaal € ${(sc.totaalGeraamdEuro ?? 0).toLocaleString("nl-NL")})`,
    );
    for (const i of sc.inspanningen ?? []) {
      const titel = i.inspanningTitel.slice(0, 40);
      const cells = (i.verdelingPerJaar ?? [])
        .sort((a, b) => a.jaar - b.jaar)
        .map((v) => `${v.jaar}:${(v.euro / 1000).toFixed(0)}K`)
        .join("  ");
      console.log(`  [${i.domein}] ${titel}: ${cells}`);
    }
    console.log();
  }
}

void main();
