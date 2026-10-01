// Forceer 2026 jaartotaal op €250.000 voor advies/plus20/optimaal scenarios.
// Cito-eis: 2026-budget is hard vastgesteld op €250K, mag NIET onderbesteed
// (anders vrijval + lager budget 2027). MIN20 cap is €200K dus die forceren
// we naar €200K (scenario-eigen cap).
//
// Per scenario per inspanning: bump 2026 proportioneel naar de huidige
// 2026-share. Trek het verschil af van het lichtste latere jaar van
// dezelfde inspanning. Insp.totaal blijft heilig (geen verloren euros).
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

const TARGET_2026: Record<string, number> = {
  advies: 250000,
  plus20: 250000,
  optimaal: 250000,
  min20: 200000, // MIN20 cap is €200K — niet €250K
};

type Cell = { jaar: number; euro: number; fase?: string; activiteit?: string };
type Insp = { inspanningTitel: string; totaalEuro?: number; verdelingPerJaar?: Cell[] };
type Scen = { aantalJaren?: number; jaarlijksBudgetEuro?: number; inspanningen?: Insp[]; totaalGeraamdEuro?: number };

async function main() {
  const s = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
  );
  const sessionId = "d8b97442-ce8f-4134-b2c7-67dc8e3a3f93";
  const { data } = await s.from("din_sessions").select("data").eq("id", sessionId).maybeSingle();
  if (!data) {
    console.error("Sessie niet gevonden");
    process.exit(1);
  }
  const sess = data.data as Record<string, unknown>;
  const wiz = sess.crossAnalyseWizard as Record<string, unknown>;
  const stap4 = (wiz.stepResults as Record<string, unknown>).stap4 as Record<string, unknown>;
  const adv = stap4.begrotingAdvies as { startJaar?: number; scenarios?: Record<string, Scen | null> };
  if (!adv.scenarios) {
    console.error("Geen scenarios");
    process.exit(1);
  }
  const startJaar = adv.startJaar ?? 2026;

  console.log("═".repeat(80));
  console.log("FORCEER 2026 JAARTOTAAL = TARGET (Cito-eis)");
  console.log("═".repeat(80));

  for (const [sk, sc] of Object.entries(adv.scenarios)) {
    if (!sc?.inspanningen) continue;
    const target = TARGET_2026[sk];
    if (!target) continue;

    // Huidige 2026 totaal
    let current2026 = 0;
    for (const ins of sc.inspanningen) {
      const cell = ins.verdelingPerJaar?.find((c) => c.jaar === startJaar);
      current2026 += cell?.euro ?? 0;
    }
    const delta = target - current2026;
    console.log(`▌ ${sk}: 2026 nu € ${current2026.toLocaleString("nl-NL")}, target € ${target.toLocaleString("nl-NL")}, delta ${delta >= 0 ? "+" : ""}€ ${delta.toLocaleString("nl-NL")}`);

    if (delta === 0) continue;

    // Per inspanning: bereken share o.b.v. huidige 2026
    for (const ins of sc.inspanningen) {
      const cell2026 = ins.verdelingPerJaar?.find((c) => c.jaar === startJaar);
      if (!cell2026) continue;
      const share = current2026 > 0 ? cell2026.euro / current2026 : 1 / sc.inspanningen.length;
      const inspDelta = Math.round((delta * share) / 1000) * 1000;
      if (inspDelta === 0) continue;

      cell2026.euro += inspDelta;

      // Trek af van lichtste latere jaar van DEZELFDE inspanning
      const laterCells = (ins.verdelingPerJaar ?? []).filter((c) => c.jaar > startJaar);
      if (laterCells.length === 0) continue;
      // Sort: jaren met meest ruimte (= hoogste euro) eerst trekken
      laterCells.sort((a, b) => b.euro - a.euro);
      let toRemove = inspDelta;
      for (const lc of laterCells) {
        if (toRemove <= 0) break;
        const canTake = Math.min(lc.euro, toRemove);
        lc.euro -= canTake;
        toRemove -= canTake;
      }
      console.log(`    [${ins.inspanningTitel.slice(0, 30)}] +€ ${inspDelta.toLocaleString("nl-NL")} naar 2026, getrokken uit latere jaren`);
    }

    // Verifieer insp.totaal niet veranderd
    for (const ins of sc.inspanningen) {
      const newSum = (ins.verdelingPerJaar ?? []).reduce((s, c) => s + c.euro, 0);
      const oldTotaal = ins.totaalEuro ?? 0;
      if (Math.abs(newSum - oldTotaal) > 1500) {
        console.warn(`    ⚠ ${ins.inspanningTitel.slice(0, 30)} drift: insp.totaal € ${oldTotaal.toLocaleString("nl-NL")} → cellsum € ${newSum.toLocaleString("nl-NL")}`);
      }
    }
  }

  const newData = {
    ...sess,
    crossAnalyseWizard: {
      ...(sess.crossAnalyseWizard as object),
      stepResults: {
        ...(wiz.stepResults ?? {}),
        stap4: { ...stap4, begrotingAdvies: adv },
      },
    },
  };
  const { error } = await s.from("din_sessions").update({ data: newData }).eq("id", sessionId);
  if (error) {
    console.error("FOUT:", error.message);
    process.exit(1);
  }
  console.log("\n✓ 2026 jaartotaal geforceerd op target voor alle scenarios.");
}

void main();
