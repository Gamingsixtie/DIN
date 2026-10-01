// Print scenario-teksten (samenvatting + prioriteitAdvies) en vergelijking
// + nieuwe scen-totalen, om handmatig te checken of teksten nog resoneren.

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
  const sessionId = "d8b97442-ce8f-4134-b2c7-67dc8e3a3f93";
  const { data } = await s.from("din_sessions").select("data").eq("id", sessionId).maybeSingle();
  if (!data) {
    console.error("not found");
    process.exit(1);
  }
  const sess = data.data as Record<string, unknown>;
  const wiz = sess.crossAnalyseWizard as Record<string, unknown>;
  const stap4 = (wiz.stepResults as Record<string, unknown>).stap4 as Record<string, unknown>;
  const adv = stap4.begrotingAdvies as {
    vergelijking?: string;
    scenarios?: Record<
      string,
      {
        scenarioLabel?: string;
        samenvatting?: string;
        prioriteitAdvies?: string;
        totaalGeraamdEuro?: number;
        aantalJaren?: number;
        jaarlijksBudgetEuro?: number;
      } | null
    >;
  };

  console.log("═".repeat(80));
  console.log("VERGELIJKING-TEKST (boven scenario-tabellen)");
  console.log("═".repeat(80));
  if (adv.vergelijking) {
    console.log(adv.vergelijking);
  } else {
    console.log("(geen vergelijking-tekst)");
  }

  for (const [sk, sc] of Object.entries(adv.scenarios ?? {})) {
    if (!sc) continue;
    console.log("\n" + "═".repeat(80));
    console.log(
      `SCENARIO: ${sk.toUpperCase()} (${sc.scenarioLabel ?? "?"}) — totaal € ${(sc.totaalGeraamdEuro ?? 0).toLocaleString("nl-NL")} (${sc.aantalJaren ?? "?"}j × € ${(sc.jaarlijksBudgetEuro ?? 0).toLocaleString("nl-NL")}/jr)`,
    );
    console.log("═".repeat(80));
    console.log("\n--- samenvatting ---");
    console.log(sc.samenvatting ?? "(leeg)");
    console.log("\n--- prioriteitAdvies ---");
    console.log(sc.prioriteitAdvies ?? "(leeg)");
  }
}

void main();
