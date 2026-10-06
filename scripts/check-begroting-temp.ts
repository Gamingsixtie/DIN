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
    .select("data, updated_at")
    .eq("id", "d8b97442-ce8f-4134-b2c7-67dc8e3a3f93")
    .maybeSingle();
  if (!data) return;
  const sess = data.data as Record<string, unknown>;
  const wiz = sess.crossAnalyseWizard as Record<string, unknown> | undefined;
  const stap4 = (wiz?.stepResults as Record<string, unknown> | undefined)?.stap4 as
    | Record<string, unknown>
    | undefined;
  const beg = stap4?.begrotingAdvies as
    | { jaarlijksBudgetBasis?: number; scenarios?: Record<string, { scenarioLabel?: string; jaarlijksBudgetEuro?: number; aantalJaren?: number; totaalGeraamdEuro?: number }> }
    | undefined;
  console.log("Versie:", sess.version, "| Updated:", data.updated_at);
  console.log("jaarlijksBudgetBasis:", beg?.jaarlijksBudgetBasis);
  console.log();
  for (const [k, sc] of Object.entries(beg?.scenarios ?? {})) {
    if (!sc) continue;
    console.log(
      `${k}: budget/jr € ${(sc.jaarlijksBudgetEuro ?? 0).toLocaleString("nl-NL")} × ${sc.aantalJaren} jr = totaal € ${(sc.totaalGeraamdEuro ?? 0).toLocaleString("nl-NL")}`,
    );
  }
}

void main();
