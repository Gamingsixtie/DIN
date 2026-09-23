// Tweede pass: maak per-jaar verdeling smoother per inspanning.
// Aanpak:
//   1. Houd CRM en scenario-totalen onveranderd.
//   2. Compute doc-curve targets per inspanning per jaar.
//   3. Initialise cells op doc-curve.
//   4. Voor elk jaar > cap: reduceer mutable cells proportioneel naar hun share.
//   5. Per inspanning: het gereduceerde bedrag wordt verdeeld over jaren waar
//      die inspanning onder zijn doc-target zit én jaar nog cap-ruimte heeft.
//   6. Cito-floor J1: handle apart (buffer blijft 0 in J1).
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
type Insp = {
  inspanningTitel: string;
  domein?: string;
  totaalEuro?: number;
  verdelingPerJaar?: Cell[];
};
type Scen = {
  aantalJaren?: number;
  jaarlijksBudgetEuro?: number;
  inspanningen?: Insp[];
  totaalGeraamdEuro?: number;
  totalenPerJaar?: Array<{ jaar: number; euro: number; percentage?: number }>;
};
type ScenKey = "advies" | "plus20" | "optimaal" | "min20";

const MENS_PCT: Record<ScenKey, number[]> = {
  advies: [0.25, 0.35, 0.28, 0.12],
  plus20: [0.22, 0.28, 0.25, 0.15, 0.10],
  optimaal: [0.18, 0.22, 0.20, 0.14, 0.12, 0.09, 0.05],
  min20: [0.13, 0.17, 0.16, 0.12, 0.10, 0.08, 0.08, 0.07, 0.05, 0.04],
};
const PROC_K: Record<ScenKey, number[]> = {
  advies: [14, 38, 37, 25],
  plus20: [14, 38, 37, 25, 12],
  optimaal: [18, 44, 40, 12, 12, 12, 12],
  min20: [18, 44, 40, 12, 12, 12, 12, 12, 12, 12],
};
const CULT_PCT: Record<ScenKey, number[]> = {
  advies: [0.30, 0.35, 0.22, 0.13],
  plus20: [0.25, 0.28, 0.20, 0.17, 0.10],
  optimaal: [0.20, 0.22, 0.17, 0.15, 0.11, 0.09, 0.06],
  min20: [0.14, 0.17, 0.14, 0.13, 0.11, 0.09, 0.08, 0.06, 0.05, 0.03],
};
const CITO_FLOOR: Record<ScenKey, number> = {
  advies: 250_000,
  plus20: 250_000,
  optimaal: 250_000,
  min20: 200_000,
};

function findInsp(sc: Scen, key: "mens" | "proc" | "cult" | "crm" | "buffer"): Insp | undefined {
  const list = sc.inspanningen ?? [];
  if (key === "mens") return list.find((i) => i.inspanningTitel.toLowerCase().includes("gespreksvaardigh"));
  if (key === "proc") return list.find((i) => i.inspanningTitel.toLowerCase().includes("uniforme klantinformatie"));
  if (key === "cult") return list.find((i) => i.inspanningTitel.toLowerCase().includes("leiderschap"));
  if (key === "crm") return list.find((i) => i.inspanningTitel.toLowerCase().includes("crm"));
  if (key === "buffer") return list.find((i) => i.inspanningTitel.toLowerCase().includes("post onvoorzien"));
  return undefined;
}

// Round to nearest 1K
function r1k(x: number): number {
  return Math.round(x / 1000) * 1000;
}

// Smooth-distribute helper:
// - cells[i]: integer K-bedrag (round 1K) per jaar
// - docTarget[i]: doc-curve target per jaar (raw, niet gerond)
// - yearTotals[i]: huidige som per jaar (incl andere inspanningen, om cap te checken)
// - cap: max per jaar
// - total: per-inspanning totaal (must preserved)
// - skipJ1: buffer mag niet in J1 (true voor buffer)
function smoothCells(
  cells: number[],
  docTarget: number[],
  yearTotals: number[],
  cap: number,
  total: number,
  skipJ1 = false,
) {
  const n = cells.length;
  // Iteratief: schuif van over-target cell naar onder-target cell mits cap toelaat
  for (let iter = 0; iter < 200; iter++) {
    let bestShift = 0;
    let bestFrom = -1;
    let bestTo = -1;
    for (let i = 0; i < n; i++) {
      if (skipJ1 && i === 0) continue;
      const overI = cells[i] - docTarget[i];
      if (overI <= 1000) continue;
      for (let k = 0; k < n; k++) {
        if (k === i) continue;
        if (skipJ1 && k === 0) continue;
        const underK = docTarget[k] - cells[k];
        if (underK <= 1000) continue;
        const yearRoomK = cap - yearTotals[k];
        if (yearRoomK <= 0) continue;
        // Shift = min van: hoeveel i over zit, hoeveel k onder zit, hoeveel ruimte k nog heeft
        const shift = Math.min(overI, underK, yearRoomK);
        const sh = r1k(shift);
        if (sh < 1000) continue;
        if (sh > bestShift) {
          bestShift = sh;
          bestFrom = i;
          bestTo = k;
        }
      }
    }
    if (bestShift === 0) break;
    cells[bestFrom] -= bestShift;
    cells[bestTo] += bestShift;
    yearTotals[bestFrom] -= bestShift;
    yearTotals[bestTo] += bestShift;
  }
  // Ensure total preserved (rounding kan kleine afwijking geven)
  const sum = cells.reduce((s, x) => s + x, 0);
  const diff = total - sum;
  if (diff !== 0) {
    // Voeg/verwijder bij cell waar het past zonder cap-overschrijding
    for (let i = n - 1; i >= 0; i--) {
      if (skipJ1 && i === 0) continue;
      if (diff > 0 && yearTotals[i] + diff <= cap) {
        cells[i] += diff;
        yearTotals[i] += diff;
        break;
      }
      if (diff < 0 && cells[i] >= -diff) {
        cells[i] += diff;
        yearTotals[i] += diff;
        break;
      }
    }
  }
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

  console.log("═".repeat(80));
  console.log("SMOOTH DISTRIBUTION — herschik cells naar doc-curve, respecteer cap");
  console.log("═".repeat(80));

  for (const [sk, sc] of Object.entries(adv.scenarios ?? {})) {
    if (!sc?.inspanningen) continue;
    const aantalJaren = sc.aantalJaren ?? 4;
    const cap = sc.jaarlijksBudgetEuro ?? 0;
    const floor = CITO_FLOOR[sk as ScenKey] ?? 0;
    const jaren = Array.from({ length: aantalJaren }, (_, i) => startJaar + i);

    const crm = findInsp(sc, "crm");
    const mens = findInsp(sc, "mens");
    const proc = findInsp(sc, "proc");
    const cult = findInsp(sc, "cult");
    const buffer = findInsp(sc, "buffer");
    if (!crm || !mens || !proc || !cult) {
      console.warn(`Skip ${sk} — missing baseline insp`);
      continue;
    }

    // Compute doc-target per inspanning per jaar (raw, ongerond)
    const mensTotal = mens.totaalEuro ?? 0;
    const procTotal = proc.totaalEuro ?? 0;
    const cultTotal = cult.totaalEuro ?? 0;
    const bufferTotal = buffer ? buffer.totaalEuro ?? 0 : 0;

    const mensDoc = (MENS_PCT[sk as ScenKey] ?? []).map((p) => p * mensTotal);
    const procDoc = (PROC_K[sk as ScenKey] ?? []).map((k) => k * 1000);
    const cultDoc = (CULT_PCT[sk as ScenKey] ?? []).map((p) => p * cultTotal);
    const bufferDoc = jaren.map((_, i) =>
      i === 0 || jaren.length <= 1 ? 0 : bufferTotal / (jaren.length - 1),
    );

    // Initialize cells op doc-curve, gerond op 1K
    let mensCells = mensDoc.map(r1k);
    let procCells = procDoc.map(r1k);
    let cultCells = cultDoc.map(r1k);
    let bufferCells = bufferDoc.map(r1k);
    // Adjust last cell voor exact totaal
    function fixSum(cells: number[], target: number) {
      const sum = cells.reduce((s, x) => s + x, 0);
      const diff = target - sum;
      if (diff !== 0) cells[cells.length - 1] += diff;
    }
    fixSum(mensCells, mensTotal);
    fixSum(procCells, procTotal);
    fixSum(cultCells, cultTotal);
    fixSum(bufferCells, bufferTotal);

    // CRM cells gesorteerd op jaar
    const crmCells = jaren.map((j) => (crm.verdelingPerJaar ?? []).find((c) => c.jaar === j)?.euro ?? 0);

    // YearTotals incl alle 5
    const yearTotals = jaren.map(
      (_, i) => crmCells[i] + mensCells[i] + procCells[i] + cultCells[i] + bufferCells[i],
    );

    // Phase 1: Voor elk jaar over cap: schaal mutable cells proportioneel om binnen cap te komen.
    //          Het verschil wordt later via smoothCells per inspanning herverdeeld.
    for (let i = 0; i < jaren.length; i++) {
      if (yearTotals[i] <= cap) continue;
      const excess = yearTotals[i] - cap;
      const mutSum = mensCells[i] + procCells[i] + cultCells[i] + bufferCells[i];
      if (mutSum <= 0) continue;
      const mensReduce = r1k(excess * mensCells[i] / mutSum);
      const procReduce = r1k(excess * procCells[i] / mutSum);
      const cultReduce = r1k(excess * cultCells[i] / mutSum);
      const bufferReduce = r1k(excess * bufferCells[i] / mutSum);
      mensCells[i] -= mensReduce;
      procCells[i] -= procReduce;
      cultCells[i] -= cultReduce;
      bufferCells[i] -= bufferReduce;
      yearTotals[i] -= mensReduce + procReduce + cultReduce + bufferReduce;
    }

    // Phase 2: Per inspanning — smooth naar doc-curve.
    smoothCells(mensCells, mensDoc, yearTotals, cap, mensTotal, false);
    smoothCells(procCells, procDoc, yearTotals, cap, procTotal, false);
    smoothCells(cultCells, cultDoc, yearTotals, cap, cultTotal, false);
    smoothCells(bufferCells, bufferDoc, yearTotals, cap, bufferTotal, true);

    // Phase 3: Cito-floor J1 — total[J1] >= floor. Mens/Proc/Cult als donor uit latere jaren.
    let j1Total = crmCells[0] + mensCells[0] + procCells[0] + cultCells[0] + bufferCells[0];
    if (j1Total < floor) {
      let toFill = floor - j1Total;
      // Take from later years, prefer cells that are over their doc-target
      for (let k = jaren.length - 1; k > 0 && toFill > 0; k--) {
        const candidates: { cells: number[]; target: number; idx: number }[] = [
          { cells: mensCells, target: mensDoc[k], idx: k },
          { cells: procCells, target: procDoc[k], idx: k },
          { cells: cultCells, target: cultDoc[k], idx: k },
        ];
        // Sort by amount over doc-target (highest first)
        candidates.sort((a, b) => (b.cells[b.idx] - b.target) - (a.cells[a.idx] - a.target));
        for (const c of candidates) {
          if (toFill <= 0) break;
          const take = Math.min(c.cells[k], toFill);
          if (take <= 0) continue;
          c.cells[k] -= take;
          c.cells[0] += take;
          yearTotals[k] -= take;
          yearTotals[0] += take;
          toFill -= take;
        }
      }
    }

    // Phase 4: re-smooth na floor-fix (kleine ripples)
    smoothCells(mensCells, mensDoc, yearTotals, cap, mensTotal, false);
    smoothCells(procCells, procDoc, yearTotals, cap, procTotal, false);
    smoothCells(cultCells, cultDoc, yearTotals, cap, cultTotal, false);
    smoothCells(bufferCells, bufferDoc, yearTotals, cap, bufferTotal, true);

    // Schrijf cells terug, behoud fase/activiteit per index
    function writeCells(insp: Insp, newCells: number[]) {
      const old = insp.verdelingPerJaar ?? [];
      insp.verdelingPerJaar = jaren.map((j, i) => ({
        jaar: j,
        euro: Math.max(0, newCells[i]),
        fase: old[i]?.fase,
        activiteit: old[i]?.activiteit,
      }));
      insp.totaalEuro = newCells.reduce((s, x) => s + x, 0);
    }
    writeCells(mens, mensCells);
    writeCells(proc, procCells);
    writeCells(cult, cultCells);
    if (buffer) writeCells(buffer, bufferCells);

    // Recompute scenario.totaalGeraamdEuro + totalenPerJaar
    sc.totaalGeraamdEuro = sc.inspanningen.reduce((s, i) => s + (i.totaalEuro ?? 0), 0);
    sc.totalenPerJaar = jaren.map((j) => {
      let sum = 0;
      for (const ins of sc.inspanningen!) {
        const cell = ins.verdelingPerJaar?.find((c) => c.jaar === j);
        sum += cell?.euro ?? 0;
      }
      const pct =
        sc.totaalGeraamdEuro && sc.totaalGeraamdEuro > 0
          ? Math.round((sum / sc.totaalGeraamdEuro) * 1000) / 10
          : 0;
      return { jaar: j, euro: sum, percentage: pct };
    });

    // Logging
    console.log(`\n▌ ${sk.toUpperCase()}: scen-totaal € ${(sc.totaalGeraamdEuro / 1000).toFixed(0)}K`);
    console.log(`   mens: ${mensCells.map((c) => (c / 1000).toFixed(0)).join("/")}K (totaal ${(mens.totaalEuro! / 1000).toFixed(0)}K)`);
    console.log(`   proc: ${procCells.map((c) => (c / 1000).toFixed(0)).join("/")}K (totaal ${(proc.totaalEuro! / 1000).toFixed(0)}K)`);
    console.log(`   cult: ${cultCells.map((c) => (c / 1000).toFixed(0)).join("/")}K (totaal ${(cult.totaalEuro! / 1000).toFixed(0)}K)`);
    if (buffer) {
      console.log(`   buf:  ${bufferCells.map((c) => (c / 1000).toFixed(0)).join("/")}K (totaal ${(buffer.totaalEuro! / 1000).toFixed(0)}K)`);
    }
    for (let i = 0; i < jaren.length; i++) {
      const t = yearTotals[i];
      const status = t > cap ? "✗cap" : i === 0 && t < floor ? "✗floor" : "✓";
      console.log(`   ${jaren[i]}: € ${(t / 1000).toFixed(0)}K (cap ${cap / 1000}K)  ${status}`);
    }
  }

  console.log("\n" + "═".repeat(80));
  const newData = {
    ...sess,
    crossAnalyseWizard: {
      ...(sess.crossAnalyseWizard as object),
      stepResults: { ...(wiz.stepResults ?? {}), stap4: { ...stap4, begrotingAdvies: adv } },
    },
  };
  const { error } = await s.from("din_sessions").update({ data: newData }).eq("id", sessionId);
  if (error) {
    console.error("FOUT:", error.message);
    process.exit(1);
  }
  console.log("\n✓ Smooth-distribution toegepast.");
}

void main();
