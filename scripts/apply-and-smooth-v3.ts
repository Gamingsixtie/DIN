// Combined: apply doc-aanbeveling + smooth distribution in één pass.
// Idempotent: gebruikt TARGET_TOTALS (niet delta) zodat herhaaldelijk runnen
// hetzelfde resultaat geeft. Geen CRM-revert via subtract-24K, maar via
// vervang-met-doc-totaal.
//
// Algorithm:
//   1. CRM blijft ongewijzigd (lifecycle-curve al in Supabase).
//      Wel: target CRM-totaal = 817/910/1095/1372K. Indien afwijking,
//      schaal CRM-cellen proportioneel naar doel.
//   2. Mens/Proc/Cult/Buffer: nieuwe totalen volgens doc.
//      Initialiseer cellen op doc-curve.
//   3. Greedy 1K-shifts om cap-overshoot, floor-undershoot en
//      doc-deviation te minimaliseren (preserveert per-insp totaal).
//   4. Update motivaties + posities.
//   5. Recompute scenario.totaalGeraamdEuro + totalenPerJaar.
//
// User MOET ALLE din-kappa tabs gesloten hebben — anders overschrijft browser
// de Supabase-write met stale localStorage data.

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
  motivatie?: string;
  volgorde?: { reden?: string; rank?: number };
};
type Scen = {
  aantalJaren?: number;
  jaarlijksBudgetEuro?: number;
  inspanningen?: Insp[];
  totaalGeraamdEuro?: number;
  totalenPerJaar?: Array<{ jaar: number; euro: number; percentage?: number }>;
};
type ScenKey = "advies" | "plus20" | "optimaal" | "min20";

const TARGET_TOTALS: Record<"crm" | "mens" | "proc" | "cult" | "buffer", Record<ScenKey, number>> = {
  crm: { advies: 817_000, plus20: 910_000, optimaal: 1_095_000, min20: 1_372_000 },
  mens: { advies: 155_000, plus20: 170_000, optimaal: 200_000, min20: 230_000 },
  proc: { advies: 114_000, plus20: 126_000, optimaal: 150_000, min20: 186_000 },
  cult: { advies: 130_000, plus20: 145_000, optimaal: 165_000, min20: 195_000 },
  // Buffer = cap-headroom na enforce J1=€250K hard. Niet meer 10% strict.
  // Per scenario: max-scen = 250 + (n-1)×capJaar2+. Buffer = max-scen - basisraming.
  // ADVIES: 250 + 3×341 = 1273K, basis 1216K → buffer 57K
  // PLUS20: 250 + 4×300 = 1450K, basis 1351K → buffer 99K
  // OPTIMAAL: 250 + 6×250 = 1750K, basis 1610K → buffer 140K
  // MIN20: 250 + 9×200 = 2050K, basis 1983K → buffer 67K
  buffer: { advies: 57_000, plus20: 99_000, optimaal: 140_000, min20: 67_000 },
};

// 2026-budget = €250K HARD voor alle scenario's (Cito-eis, niet -20% voor min20).
const J1_HARD = 250_000;

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
// Cito-eis: 2026 = €250K HARD voor alle scenario's
const CITO_FLOOR: Record<ScenKey, number> = {
  advies: 250_000,
  plus20: 250_000,
  optimaal: 250_000,
  min20: 250_000,
};

// Buffer-curve: piekt waar implementatie-risico hoogst is.
// Voor CRM-lifecycle: J1-2 = analyse + ontwerp (laag risico), J3-J5 = realisatie
// + integratie + acceptatie (piek-risico), J6+ = beheer (lager). Buffer in J1
// blijft 0 (Cito 2026-budget hard).
const BUFFER_PCT: Record<ScenKey, number[]> = {
  advies: [0, 0.25, 0.45, 0.30],                                    // 4j: piek J3
  plus20: [0, 0.18, 0.30, 0.32, 0.20],                              // 5j: piek J3-J4
  optimaal: [0, 0.10, 0.22, 0.25, 0.22, 0.15, 0.06],                // 7j: piek J3-J5
  min20: [0, 0.05, 0.12, 0.18, 0.22, 0.18, 0.12, 0.08, 0.05, 0.00], // 10j: piek J4-J5
};

const MENS_MOTIVATIE = `De cross-sectorale gespreksvaardigheidstraining vertaalt outside-in werken naar concreet, meetbaar gespreksgedrag bij 80 klantgerichte medewerkers verdeeld over PO, VO, Zakelijk en Professionals (uit Stap 7 selectiePerDomein, niet 66 zoals het oude dossier vermeldt). Dossier-onderbouwing: vast eenmalig € 75.000 (LMS-licentie € 30.000 voor 5+ jaar, content-ontwikkeling outside-in curriculum € 25.000, train-de-trainer voor 12 interne trainer/adviseurs A € 10.000, nulmeting + intake € 10.000) plus variabel kerntraject € 80.000 (externe trainingspartner twee blokken à circa € 31.500 voor 80 deelnemers + sessieondersteuning, locatie en materialen € 17.000). Voor langere scenario's komt daar jaarlijks circa € 15.000 refresh-sessie en € 5.000 onboarding nieuwe medewerkers vanaf jaar 4 bij. Cross-sectorale bundeling levert circa 30 % schaalvoordeel; geen executive-tarief aangenomen — vaste-prijs-contract bij start vereist. Het scenario-totaal in de tabel hangt af van het aantal jaren met onderhoud en onboarding.`;
const MENS_POSITIE = `Eenmalig trainingsblok met begrensde structurele last — vertaalt outside-in naar concreet gespreksgedrag bij 80 klantgerichte medewerkers verdeeld over vier sectoren.`;

const PROC_MOTIVATIE = `Uniforme klantinformatieprocessen en funnelgovernance worden cross-sectoraal ingericht door 5 interne uitvoerders die alle drie sectoren PO, VO en Professionals dekken: Projectmanager D, Procesmanager Data en Procesondersteuner per sector — inclusief de Procesondersteuner professionals als bewijs van volledige interne dekking. Dossier-onderbouwing: eenmalig € 55.000 – € 70.000 (middenpunt circa € 62.000) voor procesinventarisatie en herontwerp met externe procesbegeleider 20 dagen × € 800 (Cito-benchmark, € 16.000), sessiebegeleiding € 20.000 en methodieken/materialen € 7.500 — schaalvoordeel 30-40 % al verrekend; plus structureel € 10.000 – € 15.000 per jaar (mid € 12.000) voor proceseigenaarschap-borging via bestaande Smartprocess-tooling (geen separate licentiekost), aangevuld met € 10.000 cross-sectoraal governance-instrumentarium (KPI-template + integratie-format CRM) en € 6.000 sectorvariatie-buffer (10 % herbewerkingsrisico bij late funneldefinitie-besluiten). Het scenario-totaal in de tabel hangt af van hoe lang de structurele borgingsfase loopt.`;
const PROC_POSITIE = `Strategische enabler met klein eenmalig budget — uniforme klantprocessen verbinden CRM-data aan dagelijkse werkroutines, intern uitgevoerd door procesondersteuners per sector.`;

const CULT_MOTIVATIE = `Het leiderschapsprogramma 'outside-in als gedeelde waarde' richt zich op 9 leidinggevenden plus 2 HR coördinerend (kringgesprek-pattern, deelnemers gelijk aan uitvoerders). In euro klein, in belang #2: zonder zichtbaar voorgeleefd outside-in gedrag wordt het CRM niet gebruikt zoals bedoeld en blijft de cultuurverandering oppervlakkig. Dossier-onderbouwing: eenmalig externe begeleider 15 dagen × € 2.500 (€ 37.500) plus executive-tarief reservering € 20.000 (coaches kunnen oplopen tot € 4.000/dag), individuele coaching 9 lg × € 4.000 (€ 36.000) en HR-instrumentarium-aanpassing functioneringscyclus + 360°-integratie (€ 15.000); plus structureel 360°-feedback tool licentie € 5.000/jaar over de looptijd, jaarlijkse cultuurmeting vanaf jaar 3 (€ 2.500 per meting) voor borging van verankering 12-18 maanden na slottraject, en onboarding nieuwe leiders € 2.000/jaar vanaf jaar 5. Het scenario-totaal in de tabel hangt af van het aantal jaren onderhoud, cultuurmeting en onboarding nieuwe leiders.`;
const CULT_POSITIE = `In euro klein, in belang #2 — zonder zichtbaar voorgeleefd outside-in gedrag wordt het CRM niet gebruikt zoals bedoeld en blijft outside-in een hol begrip.`;

const BUFFER_MOTIVATIE = `Post onvoorzien voor programma-brede risico's bij implementatie: scope-uitloop, marktrisico tarieven externe partners, herbewerking bij late besluiten, en onvoorziene integratie-issues tussen CRM, processen en HR-tooling. Hoogte is circa 10 % van basisraming voor scenario's met cap-headroom (Snelste, +20%, Huidig); voor het langste scenario (-20%) past binnen de cap slechts een symbolische post (cap-headroom dwingt buffer naar nul) — een signaal dat dit scenario weinig veerkracht heeft bij realisatie van risico's. De post wordt niet pre-toegewezen aan een specifiek domein; vrijval bij het uitblijven van risico's komt terug in het programma-budget. Niet opgenomen in jaar 1 omdat het Cito 2026-budget hard is vastgesteld op € 250.000 (€ 200.000 voor het langste scenario) en geen ruimte laat voor onvoorzien in dat jaar.`;
const BUFFER_POSITIE = `Programma-brede vangnet — geen domein-specifieke post; dekt onvoorziene kosten over alle vier de inspanningen.`;

function findInsp(sc: Scen, key: "mens" | "proc" | "cult" | "crm" | "buffer"): Insp | undefined {
  const list = sc.inspanningen ?? [];
  if (key === "mens") return list.find((i) => i.inspanningTitel.toLowerCase().includes("gespreksvaardigh"));
  if (key === "proc") return list.find((i) => i.inspanningTitel.toLowerCase().includes("uniforme klantinformatie"));
  if (key === "cult") return list.find((i) => i.inspanningTitel.toLowerCase().includes("leiderschap"));
  if (key === "crm") return list.find((i) => i.inspanningTitel.toLowerCase().includes("crm"));
  if (key === "buffer") return list.find((i) => i.inspanningTitel.toLowerCase().includes("post onvoorzien"));
  return undefined;
}

function r1k(x: number): number {
  return Math.round(x / 1000) * 1000;
}

type Bag = {
  name: string;
  total: number;
  docCurve: number[];
  cells: number[];
  skipJ1: boolean;
};

// Greedy 1K-shifts to minimize cap-overshoot, floor-undershoot, doc-deviation
function allocate(jaren: number[], capPerYear: number[], floor: number, crmCells: number[], bags: Bag[]) {
  const capOf = (i: number) => capPerYear[i];
  // Initialize cells from docCurve
  for (const bag of bags) {
    bag.cells = bag.docCurve.map(r1k);
    const sum = bag.cells.reduce((s, x) => s + x, 0);
    bag.cells[bag.cells.length - 1] += bag.total - sum;
    // Ensure non-negative
    for (let i = 0; i < bag.cells.length; i++) {
      if (bag.cells[i] < 0) bag.cells[i] = 0;
    }
    // Re-fix sum
    const sum2 = bag.cells.reduce((s, x) => s + x, 0);
    if (sum2 !== bag.total) {
      // Add diff to cell with most room
      const diff = bag.total - sum2;
      const maxIdx = bag.skipJ1 ? 1 : 0;
      let bestI = maxIdx;
      for (let i = maxIdx; i < bag.cells.length; i++) {
        if (bag.cells[i] > bag.cells[bestI]) bestI = i;
      }
      bag.cells[bestI] += diff;
    }
  }

  function getYearTotal(i: number): number {
    return crmCells[i] + bags.reduce((s, b) => s + b.cells[i], 0);
  }

  const STEP = 1000;
  const MAX_ITER = 5000;

  for (let iter = 0; iter < MAX_ITER; iter++) {
    let bestShift: { bagIdx: number; from: number; to: number; amount: number; score: number } | null = null;

    // Priority 1: cap-overshoot
    for (let i = 0; i < jaren.length; i++) {
      const overshoot = getYearTotal(i) - capOf(i);
      if (overshoot < STEP) continue;
      // Find best (bag, k) to shift to
      for (let bIdx = 0; bIdx < bags.length; bIdx++) {
        const bag = bags[bIdx];
        if (bag.skipJ1 && i === 0) continue;
        if (bag.cells[i] < STEP) continue;
        for (let k = 0; k < jaren.length; k++) {
          if (k === i) continue;
          if (bag.skipJ1 && k === 0) continue;
          const yearRoomK = capOf(k) - getYearTotal(k);
          if (yearRoomK < STEP) continue;
          // Score: prefer shifts that reduce doc-deviation
          const overI = bag.cells[i] - bag.docCurve[i];
          const underK = bag.docCurve[k] - bag.cells[k];
          // High score = shift improves doc-fit
          const score = 1_000_000 + overI + underK; // priority cap-fix + doc-fit
          if (!bestShift || score > bestShift.score) {
            bestShift = { bagIdx: bIdx, from: i, to: k, amount: STEP, score };
          }
        }
      }
      if (bestShift && bestShift.score >= 1_000_000) break; // act on first cap-fix found
    }

    // Priority 2: floor-undershoot at J1
    if (!bestShift) {
      const j1Total = getYearTotal(0);
      const deficit = floor - j1Total;
      if (deficit >= STEP) {
        for (let bIdx = 0; bIdx < bags.length; bIdx++) {
          const bag = bags[bIdx];
          if (bag.skipJ1) continue;
          for (let k = 1; k < jaren.length; k++) {
            if (bag.cells[k] < STEP) continue;
            const overK = bag.cells[k] - bag.docCurve[k];
            const underJ1 = bag.docCurve[0] - bag.cells[0];
            const score = 500_000 + overK + underJ1;
            if (!bestShift || score > bestShift.score) {
              bestShift = { bagIdx: bIdx, from: k, to: 0, amount: STEP, score };
            }
          }
        }
      }
    }

    // Priority 3: smooth — reduce doc-deviation
    if (!bestShift) {
      for (let bIdx = 0; bIdx < bags.length; bIdx++) {
        const bag = bags[bIdx];
        for (let i = 0; i < jaren.length; i++) {
          if (bag.skipJ1 && i === 0) continue;
          const overI = bag.cells[i] - bag.docCurve[i];
          if (overI < STEP) continue;
          for (let k = 0; k < jaren.length; k++) {
            if (k === i) continue;
            if (bag.skipJ1 && k === 0) continue;
            const underK = bag.docCurve[k] - bag.cells[k];
            if (underK < STEP) continue;
            const yearRoomK = capOf(k) - getYearTotal(k);
            if (yearRoomK < STEP) continue;
            // Score: improvement in doc-fit
            const improvement = Math.min(overI, underK, STEP) * 2;
            if (!bestShift || improvement > bestShift.score) {
              bestShift = { bagIdx: bIdx, from: i, to: k, amount: STEP, score: improvement };
            }
          }
        }
      }
    }

    if (!bestShift) break;
    const bag = bags[bestShift.bagIdx];
    const amt = Math.min(bestShift.amount, bag.cells[bestShift.from]);
    if (amt <= 0) break;
    bag.cells[bestShift.from] -= amt;
    bag.cells[bestShift.to] += amt;
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
  console.log("APPLY + SMOOTH v3 — idempotent, doc-curves + greedy shifts");
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
    if (!crm || !mens || !proc || !cult) {
      console.warn(`Skip ${sk} — missing baseline insp`);
      continue;
    }

    // 1. Verzeker buffer-inspanning bestaat
    let buffer = findInsp(sc, "buffer");
    if (!buffer) {
      buffer = {
        inspanningTitel: "Post onvoorzien (programma-breed)",
        domein: "overig",
        totaalEuro: 0,
        verdelingPerJaar: jaren.map((j) => ({ jaar: j, euro: 0, fase: "Onvoorzien", activiteit: "Programma-brede risico-buffer" })),
        motivatie: BUFFER_MOTIVATIE,
        volgorde: { rank: 5, reden: BUFFER_POSITIE },
      };
      sc.inspanningen.push(buffer);
    }

    // 2. CRM cells naar target totaal — schaal proportioneel ALS afwijking
    const crmTarget = TARGET_TOTALS.crm[sk as ScenKey];
    const crmCurrent = crm.totaalEuro ?? (crm.verdelingPerJaar ?? []).reduce((s, c) => s + c.euro, 0);
    if (Math.abs(crmCurrent - crmTarget) >= 1000) {
      const factor = crmTarget / crmCurrent;
      let adjusted = (crm.verdelingPerJaar ?? []).map((c) => ({ ...c, euro: r1k(c.euro * factor) }));
      const sum = adjusted.reduce((s, c) => s + c.euro, 0);
      adjusted[adjusted.length - 1].euro += crmTarget - sum;
      crm.verdelingPerJaar = adjusted;
      crm.totaalEuro = crmTarget;
    } else {
      crm.totaalEuro = crmTarget; // exact
    }
    const crmCells = jaren.map((j) => (crm.verdelingPerJaar ?? []).find((c) => c.jaar === j)?.euro ?? 0);

    // 3. Mutable bags
    const mensTotal = TARGET_TOTALS.mens[sk as ScenKey];
    const procTotal = TARGET_TOTALS.proc[sk as ScenKey];
    const cultTotal = TARGET_TOTALS.cult[sk as ScenKey];
    const bufferTotal = TARGET_TOTALS.buffer[sk as ScenKey];

    const bags: Bag[] = [
      {
        name: "mens",
        total: mensTotal,
        docCurve: (MENS_PCT[sk as ScenKey] ?? []).map((p) => p * mensTotal),
        cells: [],
        skipJ1: false,
      },
      {
        name: "proc",
        total: procTotal,
        docCurve: (PROC_K[sk as ScenKey] ?? []).map((k) => k * 1000),
        cells: [],
        skipJ1: false,
      },
      {
        name: "cult",
        total: cultTotal,
        docCurve: (CULT_PCT[sk as ScenKey] ?? []).map((p) => p * cultTotal),
        cells: [],
        skipJ1: false,
      },
      {
        name: "buffer",
        total: bufferTotal,
        docCurve: (BUFFER_PCT[sk as ScenKey] ?? []).map((p) => p * bufferTotal),
        cells: [],
        skipJ1: true,
      },
    ];

    // J1 cap = €250K HARD; overige jaren = scenario.jaarlijksBudgetEuro
    const capPerYear = jaren.map((_, i) => (i === 0 ? J1_HARD : cap));
    allocate(jaren, capPerYear, floor, crmCells, bags);

    // 4. Schrijf cells terug
    function writeCells(insp: Insp, newCells: number[], defaultFase: string, defaultAct: string) {
      const old = insp.verdelingPerJaar ?? [];
      insp.verdelingPerJaar = jaren.map((j, i) => ({
        jaar: j,
        euro: Math.max(0, newCells[i]),
        fase: old[i]?.fase ?? defaultFase,
        activiteit: old[i]?.activiteit ?? defaultAct,
      }));
      insp.totaalEuro = newCells.reduce((s, x) => s + x, 0);
    }
    writeCells(mens, bags[0].cells, "Vaardigheidstraining", "Cross-sectorale gespreksvaardigheidstraining");
    writeCells(proc, bags[1].cells, "Uitrol", "Procesinventarisatie en herontwerp");
    writeCells(cult, bags[2].cells, "Adoptie", "Leiderschapscoaching en cultuurborging");
    writeCells(buffer, bags[3].cells, "Onvoorzien", "Programma-brede risico-buffer");
    // Buffer J1 specifiek
    if (buffer.verdelingPerJaar && buffer.verdelingPerJaar.length > 0) {
      buffer.verdelingPerJaar[0].fase = "Reservering";
      buffer.verdelingPerJaar[0].activiteit = "Geen post onvoorzien in jaar 1 — Cito 2026-budget hard vastgesteld";
    }

    // 5. Update motivaties + posities
    mens.motivatie = MENS_MOTIVATIE;
    if (mens.volgorde) mens.volgorde.reden = MENS_POSITIE;
    proc.motivatie = PROC_MOTIVATIE;
    if (proc.volgorde) proc.volgorde.reden = PROC_POSITIE;
    cult.motivatie = CULT_MOTIVATIE;
    if (cult.volgorde) cult.volgorde.reden = CULT_POSITIE;
    buffer.motivatie = BUFFER_MOTIVATIE;
    buffer.volgorde = { rank: 5, reden: BUFFER_POSITIE };

    // 6. Recompute scenario totals
    sc.totaalGeraamdEuro = sc.inspanningen.reduce((s, i) => s + (i.totaalEuro ?? 0), 0);
    sc.totalenPerJaar = jaren.map((j) => {
      let sum = 0;
      for (const ins of sc.inspanningen!) {
        const cell = ins.verdelingPerJaar?.find((c) => c.jaar === j);
        sum += cell?.euro ?? 0;
      }
      const pct = sc.totaalGeraamdEuro && sc.totaalGeraamdEuro > 0 ? Math.round((sum / sc.totaalGeraamdEuro) * 1000) / 10 : 0;
      return { jaar: j, euro: sum, percentage: pct };
    });

    // Logging
    console.log(`\n▌ ${sk.toUpperCase()}: scen-totaal € ${(sc.totaalGeraamdEuro / 1000).toFixed(0)}K (cap×n ${(cap * aantalJaren / 1000).toFixed(0)}K)`);
    for (const bag of bags) {
      console.log(`   ${bag.name.padEnd(6)}: ${bag.cells.map((c) => (c / 1000).toFixed(0).padStart(3)).join(" / ")}K  (totaal ${(bag.total / 1000).toFixed(0)}K)`);
    }
    console.log(`   crm   : ${crmCells.map((c) => (c / 1000).toFixed(0).padStart(3)).join(" / ")}K  (totaal ${(crm.totaalEuro! / 1000).toFixed(0)}K)`);
    for (let i = 0; i < jaren.length; i++) {
      let yt = crmCells[i];
      for (const bag of bags) yt += bag.cells[i];
      const status = yt > capPerYear[i] ? "✗cap" : i === 0 && yt < floor ? "✗floor" : "✓";
      console.log(`   ${jaren[i]}: € ${(yt / 1000).toFixed(0).padStart(4)}K  ${status}`);
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
  console.log("\n✓ Apply + smooth v3 toegepast en weggeschreven naar Supabase.");
}

void main();
