// Verificatie: doorrekent alle som-relaties in §4.1 begroting.
// Per scenario:
//   1. Σ cells per inspanning == insp.totaalEuro
//   2. Σ cells per jaar  == scenario.totalenPerJaar[i].euro
//   3. Σ insp.totaalEuro == scenario.totaalGeraamdEuro
//   4. Σ totalenPerJaar  == scenario.totaalGeraamdEuro
//   5. J1 == €250K (Cito-eis)
//   6. Per-jaar totaal ≤ jaarlijksBudgetEuro (cap)
//   7. scenario.totaalGeraamdEuro ≤ jaarlijksBudgetEuro × aantalJaren

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

type Cell = { jaar: number; euro: number };
type Insp = { inspanningTitel: string; domein?: string; totaalEuro?: number; verdelingPerJaar?: Cell[] };
type Scen = {
  aantalJaren?: number;
  jaarlijksBudgetEuro?: number;
  inspanningen?: Insp[];
  totaalGeraamdEuro?: number;
  totalenPerJaar?: Array<{ jaar: number; euro: number; percentage?: number }>;
};

const J1_HARD = 250_000;
const TOL = 500; // tolerantie 500 euro voor afronding

function eur(n: number): string {
  return `€${n.toLocaleString("nl-NL")}`;
}

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
  const adv = stap4.begrotingAdvies as { startJaar?: number; scenarios?: Record<string, Scen | null> };
  const startJaar = adv.startJaar ?? 2026;

  const issues: string[] = [];
  const log = (s: string) => issues.push(s);

  console.log("═".repeat(80));
  console.log("VERIFICATIE — §4.1 begroting alle som-checks");
  console.log("═".repeat(80));

  for (const [sk, sc] of Object.entries(adv.scenarios ?? {})) {
    if (!sc?.inspanningen) {
      log(`✗ ${sk}: geen inspanningen`);
      continue;
    }
    const aantalJaren = sc.aantalJaren ?? 4;
    const cap = sc.jaarlijksBudgetEuro ?? 0;
    const jaren = Array.from({ length: aantalJaren }, (_, i) => startJaar + i);

    console.log(`\n▌ ${sk.toUpperCase()} — ${aantalJaren}j × ${eur(cap)}/jaar = max ${eur(cap * aantalJaren)}`);

    let scenIssues = 0;

    // 1. Per inspanning: Σ cells == totaalEuro
    for (const ins of sc.inspanningen) {
      const cellSum = (ins.verdelingPerJaar ?? []).reduce((s, c) => s + c.euro, 0);
      const recorded = ins.totaalEuro ?? 0;
      if (Math.abs(cellSum - recorded) > TOL) {
        const msg = `   ✗ [${sk}/${ins.inspanningTitel.slice(0, 30)}] Σcells=${eur(cellSum)} ≠ totaalEuro=${eur(recorded)}`;
        console.log(msg);
        log(msg);
        scenIssues++;
      }
    }

    // 2. Per jaar: Σ cells == totalenPerJaar[i].euro (als bestaat)
    for (const j of jaren) {
      let cellSum = 0;
      for (const ins of sc.inspanningen) {
        cellSum += ins.verdelingPerJaar?.find((c) => c.jaar === j)?.euro ?? 0;
      }
      const tpj = sc.totalenPerJaar?.find((t) => t.jaar === j);
      const recorded = tpj?.euro ?? 0;
      if (sc.totalenPerJaar && Math.abs(cellSum - recorded) > TOL) {
        const msg = `   ✗ [${sk}/${j}] Σcells=${eur(cellSum)} ≠ totalenPerJaar=${eur(recorded)}`;
        console.log(msg);
        log(msg);
        scenIssues++;
      }
    }

    // 3. Σ insp.totaalEuro == scenario.totaalGeraamdEuro
    const sumInspanningen = sc.inspanningen.reduce((s, i) => s + (i.totaalEuro ?? 0), 0);
    const recordedScen = sc.totaalGeraamdEuro ?? 0;
    if (Math.abs(sumInspanningen - recordedScen) > TOL) {
      const msg = `   ✗ [${sk}] Σinspanningen=${eur(sumInspanningen)} ≠ totaalGeraamdEuro=${eur(recordedScen)}`;
      console.log(msg);
      log(msg);
      scenIssues++;
    }

    // 4. Σ totalenPerJaar == scenario.totaalGeraamdEuro
    if (sc.totalenPerJaar) {
      const sumTpj = sc.totalenPerJaar.reduce((s, t) => s + t.euro, 0);
      if (Math.abs(sumTpj - recordedScen) > TOL) {
        const msg = `   ✗ [${sk}] ΣtotalenPerJaar=${eur(sumTpj)} ≠ totaalGeraamdEuro=${eur(recordedScen)}`;
        console.log(msg);
        log(msg);
        scenIssues++;
      }
    }

    // 5. J1 == €250K
    let j1Total = 0;
    for (const ins of sc.inspanningen) {
      j1Total += ins.verdelingPerJaar?.find((c) => c.jaar === startJaar)?.euro ?? 0;
    }
    if (Math.abs(j1Total - J1_HARD) > TOL) {
      const msg = `   ✗ [${sk}/2026] totaal=${eur(j1Total)} ≠ J1_HARD=${eur(J1_HARD)} (Cito-eis)`;
      console.log(msg);
      log(msg);
      scenIssues++;
    } else {
      console.log(`   ✓ 2026 = ${eur(j1Total)} (Cito-eis)`);
    }

    // 6. Per jaar totaal ≤ cap (J1 mag op cap, anderen ≤ cap)
    for (let i = 0; i < jaren.length; i++) {
      const j = jaren[i];
      let yt = 0;
      for (const ins of sc.inspanningen) {
        yt += ins.verdelingPerJaar?.find((c) => c.jaar === j)?.euro ?? 0;
      }
      const yearCap = i === 0 ? J1_HARD : cap;
      if (yt > yearCap + TOL) {
        const msg = `   ✗ [${sk}/${j}] €${(yt / 1000).toFixed(0)}K > cap €${(yearCap / 1000).toFixed(0)}K (overschrijdt €${((yt - yearCap) / 1000).toFixed(0)}K)`;
        console.log(msg);
        log(msg);
        scenIssues++;
      }
    }

    // 7. Scen totaal ≤ cap × n (max-budget)
    const maxBudget = cap * aantalJaren + (J1_HARD - cap); // J1=250 in min20 geeft +50K extra
    if (recordedScen > maxBudget + TOL) {
      const msg = `   ✗ [${sk}] scen-totaal=${eur(recordedScen)} > max-budget=${eur(maxBudget)}`;
      console.log(msg);
      log(msg);
      scenIssues++;
    }

    // Per inspanning: laat actual totaal en per-jaar verdeling zien
    console.log(`   scen-totaal: ${eur(recordedScen)}`);
    console.log(`   inspanningen:`);
    for (const ins of sc.inspanningen) {
      const cells = (ins.verdelingPerJaar ?? [])
        .sort((a, b) => a.jaar - b.jaar)
        .map((c) => `${(c.euro / 1000).toFixed(0)}`.padStart(3))
        .join("/");
      console.log(`     [${(ins.domein ?? "?").padEnd(13)}] ${ins.inspanningTitel.slice(0, 40).padEnd(42)} ${cells}K → ${eur(ins.totaalEuro ?? 0)}`);
    }

    // Per jaar totalen
    if (sc.totalenPerJaar) {
      const yearLine = sc.totalenPerJaar
        .sort((a, b) => a.jaar - b.jaar)
        .map((t) => `${t.jaar}:${eur(t.euro)}`)
        .join("  ");
      console.log(`   per jaar: ${yearLine}`);
    }

    if (scenIssues === 0) {
      console.log(`   ✓ ALLE checks PASS voor ${sk}`);
    } else {
      console.log(`   ✗ ${scenIssues} issue(s) voor ${sk}`);
    }
  }

  console.log("\n" + "═".repeat(80));
  if (issues.length === 0) {
    console.log("✓ VERIFICATIE GESLAAGD — alle berekeningen kloppen voor alle scenario's.");
  } else {
    console.log(`✗ VERIFICATIE: ${issues.length} issue(s):`);
    for (const i of issues) console.log("  " + i);
  }
}

void main();
