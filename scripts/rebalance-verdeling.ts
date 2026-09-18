// Lifecycle-aware herverdeling per inspanning per scenario.
// Totaal per inspanning blijft gelijk, alleen verdelingPerJaar wordt herzien
// volgens de domein-specifieke fase-cyclus (PRINCE2/BiSL voor IT, S-curve
// voor training, etc.).
//
// Run dry-run:   npx tsx scripts/rebalance-verdeling.ts
// Run + apply:   npx tsx scripts/rebalance-verdeling.ts --apply

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

const APPLY = process.argv.includes("--apply");
const sessionId = "d8b97442-ce8f-4134-b2c7-67dc8e3a3f93";

// Lifecycle-percentages per domein per aantalJaren. Som = 100.
// data_systemen (IT, PRINCE2/BiSL): U-curve, piek midden (realisatie+acceptatie)
// mens (training): S-curve, piek jaar 2-3 (uitrol), tail (borging)
// cultuur (verandering): geleidelijke piek midden, lange tail
// processen (BPM): vroege piek jaar 1-2 (ontwerp+pilot+uitrol), tail (verbetering)
const CURVES: Record<string, Record<number, number[]>> = {
  data_systemen: {
    4: [15, 35, 35, 15],
    5: [12, 25, 30, 22, 11],
    // 7 jr: peak jaar 3 (realisatie), niet jaar 4 (klopt beter met PRINCE2)
    7: [10, 20, 25, 18, 12, 10, 5],
    10: [5, 10, 14, 18, 18, 14, 10, 6, 3, 2],
  },
  mens: {
    4: [15, 40, 35, 10],
    5: [10, 30, 35, 18, 7],
    7: [8, 20, 25, 20, 15, 8, 4],
    10: [5, 15, 20, 18, 14, 10, 8, 5, 3, 2],
  },
  cultuur: {
    4: [20, 35, 30, 15],
    5: [15, 25, 25, 20, 15],
    // 7 jr: tail iets dikker — verankering blijft belangrijk in jaar 6-7
    7: [10, 16, 20, 18, 15, 12, 9],
    10: [8, 12, 14, 14, 12, 12, 10, 8, 6, 4],
  },
  processen: {
    4: [25, 35, 25, 15],
    5: [20, 30, 25, 15, 10],
    7: [15, 22, 20, 15, 12, 10, 6],
    10: [10, 18, 18, 15, 12, 8, 7, 5, 4, 3],
  },
};

type Inspanning = {
  inspanningTitel: string;
  domein: string;
  totaalEuro?: number;
  verdelingPerJaar?: Array<{ jaar: number; euro: number }>;
};
type Scenario = {
  scenarioLabel?: string;
  jaarlijksBudgetEuro?: number;
  aantalJaren?: number;
  totaalGeraamdEuro?: number;
  inspanningen?: Inspanning[];
};

function applyCurve(insp: Inspanning, startJaar: number, aantalJaren: number): Inspanning {
  const curve = CURVES[insp.domein]?.[aantalJaren];
  const totaal = insp.totaalEuro ?? 0;
  if (!curve || totaal <= 0) return insp;
  // Verdeel totaal volgens curve, rond op 1000
  const raw = curve.map((p) => (totaal * p) / 100);
  const rounded = raw.map((v) => Math.round(v / 1000) * 1000);
  // Corrigeer rounding-drift: schuif verschil naar grootste cel
  const drift = totaal - rounded.reduce((s, v) => s + v, 0);
  if (drift !== 0) {
    let maxIdx = 0;
    for (let i = 1; i < rounded.length; i++) if (rounded[i] > rounded[maxIdx]) maxIdx = i;
    rounded[maxIdx] += drift;
  }
  const newVerdeling = rounded.map((euro, i) => ({ jaar: startJaar + i, euro }));
  return { ...insp, verdelingPerJaar: newVerdeling };
}

// Pass 2: cap-respect via water-fill. Voor elke jaar > cap, herverdeel
// overschot proportioneel over jaren met capaciteit. Behoud per inspanning's
// totaal door alle bewegingen binnen één inspanning te doen — niet TUSSEN
// inspanningen.
function enforceCap(inspanningen: Inspanning[], aantalJaren: number, cap: number, startJaar: number): Inspanning[] {
  const insps = inspanningen.map((i) => ({
    ...i,
    verdelingPerJaar: (i.verdelingPerJaar ?? []).map((v) => ({ ...v })),
  }));
  // Itereer max 8 keer (convergeert meestal in 2-3)
  for (let iter = 0; iter < 8; iter++) {
    // Bereken jaartotalen
    const yearTotals = new Array(aantalJaren).fill(0) as number[];
    for (const i of insps) {
      for (const v of i.verdelingPerJaar ?? []) {
        const yIdx = v.jaar - startJaar;
        if (yIdx >= 0 && yIdx < aantalJaren) yearTotals[yIdx] += v.euro;
      }
    }
    // Vind grootste over-cap-jaar
    let worstIdx = -1;
    let worstOver = 0;
    for (let y = 0; y < aantalJaren; y++) {
      const over = yearTotals[y] - cap;
      if (over > worstOver) {
        worstOver = over;
        worstIdx = y;
      }
    }
    if (worstIdx === -1) break; // Klaar — alles binnen cap
    // Bereken doel-jaren met capaciteit
    const targets: { idx: number; capacity: number }[] = [];
    for (let y = 0; y < aantalJaren; y++) {
      if (y === worstIdx) continue;
      const c = cap - yearTotals[y];
      if (c > 0) targets.push({ idx: y, capacity: c });
    }
    if (targets.length === 0) break; // Geen ruimte → geef op
    const totalCapacity = targets.reduce((s, t) => s + t.capacity, 0);
    // Verlaag per inspanning bijdrage in worstIdx proportioneel; verhoog
    // dezelfde inspanning in target-jaren proportioneel naar capaciteit.
    for (const insp of insps) {
      const verd = insp.verdelingPerJaar ?? [];
      const cellWorst = verd.find((v) => v.jaar - startJaar === worstIdx);
      if (!cellWorst || cellWorst.euro <= 0) continue;
      const inspContribInWorst = cellWorst.euro;
      const inspShare = inspContribInWorst / yearTotals[worstIdx];
      const inspReduction = Math.round((worstOver * inspShare) / 1000) * 1000;
      if (inspReduction <= 0) continue;
      cellWorst.euro -= inspReduction;
      // Verdeel inspReduction over target-jaren
      let remaining = inspReduction;
      for (const t of targets) {
        const add = Math.round((inspReduction * (t.capacity / totalCapacity)) / 1000) * 1000;
        const cellTarget = verd.find((v) => v.jaar - startJaar === t.idx);
        if (cellTarget) {
          cellTarget.euro += add;
        } else {
          verd.push({ jaar: startJaar + t.idx, euro: add });
        }
        remaining -= add;
      }
      // Round-drift teruggeven aan worstIdx (compenseert) of aan grootste target
      if (remaining !== 0) {
        const largest = targets[0];
        const cellTarget = verd.find((v) => v.jaar - startJaar === largest.idx);
        if (cellTarget) cellTarget.euro += remaining;
      }
    }
  }
  // Herstel insp.totaal door drift in cellen
  for (const insp of insps) {
    const oldTotaal = insp.totaalEuro ?? 0;
    const newTotaal = (insp.verdelingPerJaar ?? []).reduce((s, v) => s + v.euro, 0);
    const drift = oldTotaal - newTotaal;
    if (drift !== 0 && (insp.verdelingPerJaar?.length ?? 0) > 0) {
      // Voeg drift toe aan grootste cel
      let maxIdx = 0;
      for (let i = 1; i < (insp.verdelingPerJaar?.length ?? 0); i++) {
        if ((insp.verdelingPerJaar?.[i].euro ?? 0) > (insp.verdelingPerJaar?.[maxIdx].euro ?? 0)) maxIdx = i;
      }
      if (insp.verdelingPerJaar) insp.verdelingPerJaar[maxIdx].euro += drift;
    }
  }
  return insps;
}

async function main() {
  const s = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
  );
  const { data } = await s
    .from("din_sessions")
    .select("data, updated_at")
    .eq("id", sessionId)
    .maybeSingle();
  if (!data) {
    console.error("Sessie niet gevonden");
    process.exit(1);
  }
  const sess = data.data as Record<string, unknown>;
  const wiz = sess.crossAnalyseWizard as Record<string, unknown> | undefined;
  const stap4 = (wiz?.stepResults as Record<string, unknown> | undefined)?.stap4 as
    | Record<string, unknown>
    | undefined;
  const beg = stap4?.begrotingAdvies as
    | { startJaar?: number; scenarios?: Record<string, Scenario | null> }
    | undefined;
  if (!beg?.scenarios) {
    console.error("Geen begroting in stap4");
    process.exit(1);
  }
  const startJaar = beg.startJaar ?? 2026;

  console.log("═".repeat(80));
  console.log(`REBALANCE VERDELING — ${APPLY ? "APPLY (schrijft naar Supabase)" : "DRY-RUN"}`);
  console.log("═".repeat(80));
  console.log(`Versie: ${(sess as { version?: number }).version} | Updated: ${data.updated_at}`);
  console.log();

  const newScenarios: Record<string, Scenario | null> = {};
  for (const [k, sc] of Object.entries(beg.scenarios)) {
    if (!sc) {
      newScenarios[k] = null;
      continue;
    }
    const aantal = sc.aantalJaren ?? 0;
    const cap = sc.jaarlijksBudgetEuro ?? 0;
    // Pass 1: lifecycle-curves
    const curved = (sc.inspanningen ?? []).map((i) => applyCurve(i, startJaar, aantal));
    // Pass 2: cap-respect (water-fill: schuif overschot naar jaren met capaciteit)
    const newInspanningen = enforceCap(curved, aantal, cap, startJaar);
    // Recompute scenario totaal
    const newTotaal = newInspanningen.reduce((s, i) => s + (i.totaalEuro ?? 0), 0);
    newScenarios[k] = { ...sc, inspanningen: newInspanningen, totaalGeraamdEuro: newTotaal };

    console.log(`▌ ${k.toUpperCase()} (${aantal} jr × € ${(sc.jaarlijksBudgetEuro ?? 0).toLocaleString("nl-NL")} cap)`);
    // Toon per jaar oud vs nieuw totaal
    const oldByYear: Record<number, number> = {};
    const newByYear: Record<number, number> = {};
    for (const i of sc.inspanningen ?? []) {
      for (const v of i.verdelingPerJaar ?? []) {
        oldByYear[v.jaar] = (oldByYear[v.jaar] ?? 0) + v.euro;
      }
    }
    for (const i of newInspanningen) {
      for (const v of i.verdelingPerJaar ?? []) {
        newByYear[v.jaar] = (newByYear[v.jaar] ?? 0) + v.euro;
      }
    }
    for (let y = startJaar; y < startJaar + aantal; y++) {
      const o = oldByYear[y] ?? 0;
      const n = newByYear[y] ?? 0;
      const cap = sc.jaarlijksBudgetEuro ?? 0;
      const overCap = n > cap ? " ⚠ > scenario-cap" : "";
      const overCito = n > 250000 ? " ⚠ > €250K Cito" : "";
      console.log(`  ${y}: € ${o.toLocaleString("nl-NL")} → € ${n.toLocaleString("nl-NL")}${overCap}${overCito}`);
    }
    // Per inspanning detail
    for (let idx = 0; idx < newInspanningen.length; idx++) {
      const ni = newInspanningen[idx];
      const oi = sc.inspanningen?.[idx];
      if (!oi) continue;
      const oldCells = (oi.verdelingPerJaar ?? []).map((v) => `${v.jaar}:${(v.euro / 1000).toFixed(0)}`).join(" ");
      const newCells = (ni.verdelingPerJaar ?? []).map((v) => `${v.jaar}:${(v.euro / 1000).toFixed(0)}`).join(" ");
      console.log(`    [${ni.domein}] ${ni.inspanningTitel.slice(0, 38)}`);
      console.log(`      OUD: ${oldCells}`);
      console.log(`      NIEUW: ${newCells}`);
    }
    console.log();
  }

  if (!APPLY) {
    console.log("─".repeat(80));
    console.log("DRY-RUN — geen wijzigingen geschreven. Run met --apply om te bewaren.");
    return;
  }

  // ==== APPLY: write to Supabase ====
  const newBegroting = { ...beg, scenarios: newScenarios };
  const newData = {
    ...sess,
    crossAnalyseWizard: {
      ...(sess.crossAnalyseWizard as object),
      stepResults: {
        ...(wiz?.stepResults ?? {}),
        stap4: {
          ...(stap4 ?? {}),
          begrotingAdvies: newBegroting,
        },
      },
    },
  };
  const { error } = await s.from("din_sessions").update({ data: newData }).eq("id", sessionId);
  if (error) {
    console.error("FOUT:", error.message);
    process.exit(1);
  }
  console.log("─".repeat(80));
  console.log("✓ Nieuwe verdeling opgeslagen in Supabase.");
}

void main();
