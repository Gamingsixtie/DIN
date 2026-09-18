// Verhoog cultuur dossier-totaal per scenario naar realistische niveaus.
// Audit-bevinding: €66K is onhaalbaar voor cross-sectorale leerkringen +
// borging over meer jaren. Nieuwe targets: 100/105/115/130K per scenario.
// Verdeling volgt cultuur-lifecycle (Bewustwording → Acceptatie → Adoptie
// → Verankering), met afnemende borging-tail.
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

// Per scenario per jaar bedragen voor cultuur (in duizenden euros).
// Bewustwording-startjaar substantieel; Acceptatie + Adoptie peak;
// Verankering afnemend. Bewust gerealiseerd = 1500u externe begeleider
// (€60K min) + €25K programma-ontwerp + €5-10K HR-instrumenten +
// €5-8K/jaar borging.
const CULTUUR_BEDRAGEN: Record<string, number[]> = {
  advies: [25, 30, 25, 20], // 4 jr → 100K
  plus20: [22, 27, 22, 18, 16], // 5 jr → 105K
  optimaal: [22, 22, 20, 18, 13, 12, 8], // 7 jr → 115K
  min20: [22, 20, 18, 15, 13, 12, 10, 8, 6, 6], // 10 jr → 130K
};

type Cell = { jaar: number; euro: number; fase?: string; activiteit?: string };
type Insp = { inspanningTitel: string; totaalEuro?: number; verdelingPerJaar?: Cell[] };
type Scen = { aantalJaren?: number; jaarlijksBudgetEuro?: number; inspanningen?: Insp[]; totaalGeraamdEuro?: number };

const TARGET_2026: Record<string, number> = {
  advies: 250000,
  plus20: 250000,
  optimaal: 250000,
  min20: 200000,
};

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
  const startJaar = adv.startJaar ?? 2026;

  console.log("═".repeat(80));
  console.log("CULTUUR BEDRAGEN OPHOGEN — realistische niveaus");
  console.log("═".repeat(80));

  for (const [sk, sc] of Object.entries(adv.scenarios ?? {})) {
    if (!sc?.inspanningen) continue;
    const cultuurInsp = sc.inspanningen.find((i) => i.inspanningTitel.includes("Leiderschapsprogramma"));
    if (!cultuurInsp) {
      console.warn(`Geen cultuur-inspanning in ${sk}`);
      continue;
    }
    const newBedragen = CULTUUR_BEDRAGEN[sk];
    if (!newBedragen) continue;

    const oldTotaal = cultuurInsp.totaalEuro ?? 0;
    const newCells: Cell[] = (cultuurInsp.verdelingPerJaar ?? []).map((c, i) => ({
      ...c,
      euro: (newBedragen[i] ?? 0) * 1000,
    }));
    const newTotaal = newCells.reduce((s, c) => s + c.euro, 0);
    cultuurInsp.verdelingPerJaar = newCells;
    cultuurInsp.totaalEuro = newTotaal;
    console.log(`▌ ${sk} cultuur: € ${oldTotaal.toLocaleString("nl-NL")} → € ${newTotaal.toLocaleString("nl-NL")} (+€ ${(newTotaal - oldTotaal).toLocaleString("nl-NL")})`);

    // Recompute scenario totaal
    const newScenarioTotaal = sc.inspanningen.reduce((s, i) => s + (i.totaalEuro ?? 0), 0);
    sc.totaalGeraamdEuro = newScenarioTotaal;
    console.log(`  scenario-totaal: € ${newScenarioTotaal.toLocaleString("nl-NL")}`);
  }

  // ==== Re-force 2026 = target want cultuur 2026 cells veranderd ====
  console.log("\n--- Re-balance 2026 totaal naar Cito-eis ---");
  for (const [sk, sc] of Object.entries(adv.scenarios ?? {})) {
    if (!sc?.inspanningen) continue;
    const target = TARGET_2026[sk];
    if (!target) continue;
    let current2026 = 0;
    for (const ins of sc.inspanningen) {
      const cell = ins.verdelingPerJaar?.find((c) => c.jaar === startJaar);
      current2026 += cell?.euro ?? 0;
    }
    const delta = target - current2026;
    if (Math.abs(delta) < 1000) {
      console.log(`▌ ${sk}: 2026 al op € ${current2026.toLocaleString("nl-NL")} (target € ${target.toLocaleString("nl-NL")})`);
      continue;
    }
    console.log(`▌ ${sk}: 2026 nu € ${current2026.toLocaleString("nl-NL")}, target € ${target.toLocaleString("nl-NL")}, delta ${delta >= 0 ? "+" : ""}€ ${delta.toLocaleString("nl-NL")}`);

    // Bump alleen NIET-cultuur insps (cultuur is nu vast volgens nieuwe curve)
    const otherInsps = sc.inspanningen.filter((i) => !i.inspanningTitel.includes("Leiderschapsprogramma"));
    let other2026 = 0;
    for (const ins of otherInsps) {
      const cell = ins.verdelingPerJaar?.find((c) => c.jaar === startJaar);
      other2026 += cell?.euro ?? 0;
    }
    for (const ins of otherInsps) {
      const cell2026 = ins.verdelingPerJaar?.find((c) => c.jaar === startJaar);
      if (!cell2026) continue;
      const share = other2026 > 0 ? cell2026.euro / other2026 : 1 / otherInsps.length;
      const inspDelta = Math.round((delta * share) / 1000) * 1000;
      if (inspDelta === 0) continue;
      cell2026.euro += inspDelta;
      const laterCells = (ins.verdelingPerJaar ?? []).filter((c) => c.jaar > startJaar);
      laterCells.sort((a, b) => b.euro - a.euro);
      let toRemove = inspDelta;
      for (const lc of laterCells) {
        if (toRemove <= 0 || (delta < 0 && lc.euro <= 0)) break;
        if (delta > 0) {
          const canTake = Math.min(lc.euro, toRemove);
          lc.euro -= canTake;
          toRemove -= canTake;
        } else {
          lc.euro -= toRemove;
          toRemove = 0;
        }
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
  console.log("\n✓ Cultuur-bedragen opgehoogd + 2026 hergebalanceerd.");
}

void main();
