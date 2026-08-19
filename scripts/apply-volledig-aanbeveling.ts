// Voer document BEGROTING-AANBEVELING.md volledig door:
// 1) Mens nieuwe totalen + doc-curve (155/170/200/230K)
// 2) Processen nieuwe totalen + doc-K-bedragen (114/126/150/186K)
// 3) Cultuur nieuwe totalen + doc-curve (130/145/165/195K)
// 4) Revert €24K risico-buffer uit CRM (proportioneel uit cellen > J1)
// 5) Voeg aparte inspanning "Post onvoorzien (programma-breed)" toe
//    met €122/€135/€140/€17K, domein "overig". Geen post in J1 (Cito-floor).
// 6) Water-fill cap-respect over mens/proc/cult/buffer; J1 = exactly cap voor opt/min20.
// 7) Update motivatie + volgorde.reden volgens document.
// 8) Recompute totaalGeraamdEuro + totalenPerJaar.

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

const NEW_TOTALS: Record<"mens" | "proc" | "cult" | "buffer", Record<ScenKey, number>> = {
  mens: { advies: 155_000, plus20: 170_000, optimaal: 200_000, min20: 230_000 },
  proc: { advies: 114_000, plus20: 126_000, optimaal: 150_000, min20: 186_000 },
  cult: { advies: 130_000, plus20: 145_000, optimaal: 165_000, min20: 195_000 },
  buffer: { advies: 122_000, plus20: 135_000, optimaal: 140_000, min20: 17_000 },
};

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

const MENS_MOTIVATIE = `De cross-sectorale gespreksvaardigheidstraining vertaalt outside-in werken naar concreet, meetbaar gespreksgedrag bij 80 klantgerichte medewerkers verdeeld over PO, VO, Zakelijk en Professionals (uit Stap 7 selectiePerDomein, niet 66 zoals het oude dossier vermeldt). Dossier-onderbouwing: vast eenmalig € 75.000 (LMS-licentie € 30.000 voor 5+ jaar, content-ontwikkeling outside-in curriculum € 25.000, train-de-trainer voor 12 interne trainer/adviseurs A € 10.000, nulmeting + intake € 10.000) plus variabel kerntraject € 80.000 (externe trainingspartner twee blokken à circa € 31.500 voor 80 deelnemers + sessieondersteuning, locatie en materialen € 17.000). Voor langere scenario's komt daar jaarlijks circa € 15.000 refresh-sessie en € 5.000 onboarding nieuwe medewerkers vanaf jaar 4 bij. Cross-sectorale bundeling levert circa 30 % schaalvoordeel; geen executive-tarief aangenomen — vaste-prijs-contract bij start vereist. Het scenario-totaal in de tabel hangt af van het aantal jaren met onderhoud en onboarding.`;

const MENS_POSITIE = `Eenmalig trainingsblok met begrensde structurele last — vertaalt outside-in naar concreet gespreksgedrag bij 80 klantgerichte medewerkers verdeeld over vier sectoren.`;

const PROC_MOTIVATIE = `Uniforme klantinformatieprocessen en funnelgovernance worden cross-sectoraal ingericht door 5 interne uitvoerders die alle drie sectoren PO, VO en Professionals dekken: Projectmanager D, Procesmanager Data en Procesondersteuner per sector — inclusief de Procesondersteuner professionals als bewijs van volledige interne dekking. Dossier-onderbouwing: eenmalig € 55.000 – € 70.000 (middenpunt circa € 62.000) voor procesinventarisatie en herontwerp met externe procesbegeleider 20 dagen × € 800 (Cito-benchmark, € 16.000), sessiebegeleiding € 20.000 en methodieken/materialen € 7.500 — schaalvoordeel 30-40 % al verrekend; plus structureel € 10.000 – € 15.000 per jaar (mid € 12.000) voor proceseigenaarschap-borging via bestaande Smartprocess-tooling (geen separate licentiekost), aangevuld met € 10.000 cross-sectoraal governance-instrumentarium (KPI-template + integratie-format CRM) en € 6.000 sectorvariatie-buffer (10 % herbewerkingsrisico bij late funneldefinitie-besluiten). Het scenario-totaal in de tabel hangt af van hoe lang de structurele borgingsfase loopt.`;

const PROC_POSITIE = `Strategische enabler met klein eenmalig budget — uniforme klantprocessen verbinden CRM-data aan dagelijkse werkroutines, intern uitgevoerd door procesondersteuners per sector.`;

const CULT_MOTIVATIE = `Het leiderschapsprogramma 'outside-in als gedeelde waarde' richt zich op 9 leidinggevenden plus 2 HR coördinerend (kringgesprek-pattern, deelnemers gelijk aan uitvoerders). In euro klein, in belang #2: zonder zichtbaar voorgeleefd outside-in gedrag wordt het CRM niet gebruikt zoals bedoeld en blijft de cultuurverandering oppervlakkig. Dossier-onderbouwing: eenmalig externe begeleider 15 dagen × € 2.500 (€ 37.500) plus executive-tarief reservering € 20.000 (coaches kunnen oplopen tot € 4.000/dag), individuele coaching 9 lg × € 4.000 (€ 36.000) en HR-instrumentarium-aanpassing functioneringscyclus + 360°-integratie (€ 15.000); plus structureel 360°-feedback tool licentie € 5.000/jaar over de looptijd, jaarlijkse cultuurmeting vanaf jaar 3 (€ 2.500 per meting) voor borging van verankering 12-18 maanden na slottraject, en onboarding nieuwe leiders € 2.000/jaar vanaf jaar 5. Het scenario-totaal in de tabel hangt af van het aantal jaren onderhoud, cultuurmeting en onboarding nieuwe leiders.`;

const CULT_POSITIE = `In euro klein, in belang #2 — zonder zichtbaar voorgeleefd outside-in gedrag wordt het CRM niet gebruikt zoals bedoeld en blijft outside-in een hol begrip.`;

const BUFFER_MOTIVATIE = `Post onvoorzien voor programma-brede risico's bij implementatie: scope-uitloop, marktrisico tarieven externe partners, herbewerking bij late besluiten, en onvoorziene integratie-issues tussen CRM, processen en HR-tooling. Hoogte is circa 10 % van basisraming voor scenario's met cap-headroom (Snelste, +20%, Huidig); voor het langste scenario (-20%) past binnen de cap slechts een symbolische post (cap-headroom dwingt buffer naar nul) — een signaal dat dit scenario weinig veerkracht heeft bij realisatie van risico's. De post wordt niet pre-toegewezen aan een specifiek domein; vrijval bij het uitblijven van risico's komt terug in het programma-budget. Niet opgenomen in jaar 1 omdat het Cito 2026-budget hard is vastgesteld op € 250.000 (€ 200.000 voor het langste scenario) en geen ruimte laat voor onvoorzien in dat jaar.`;

const BUFFER_POSITIE = `Programma-brede vangnet — geen domein-specifieke post; dekt onvoorziene kosten over alle vier de inspanningen.`;

function findInsp(sc: Scen, key: "mens" | "proc" | "cult" | "crm" | "buffer"): Insp | undefined {
  if (!sc.inspanningen) return undefined;
  const list = sc.inspanningen;
  if (key === "mens") return list.find((i) => i.inspanningTitel.toLowerCase().includes("gespreksvaardigh"));
  if (key === "proc") return list.find((i) => i.inspanningTitel.toLowerCase().includes("uniforme klantinformatie"));
  if (key === "cult") return list.find((i) => i.inspanningTitel.toLowerCase().includes("leiderschap"));
  if (key === "crm") return list.find((i) => i.inspanningTitel.toLowerCase().includes("crm"));
  if (key === "buffer") return list.find((i) => i.inspanningTitel.toLowerCase().includes("post onvoorzien"));
  return undefined;
}

function getYearTotals(sc: Scen, jaren: number[]): Record<number, number> {
  const result: Record<number, number> = {};
  for (const j of jaren) result[j] = 0;
  for (const ins of sc.inspanningen ?? []) {
    for (const c of ins.verdelingPerJaar ?? []) {
      result[c.jaar] = (result[c.jaar] ?? 0) + c.euro;
    }
  }
  return result;
}

function applyCellsFromPct(insp: Insp, total: number, pcts: number[], jaren: number[]) {
  const raw = pcts.map((p) => Math.round((total * p) / 1000) * 1000);
  const sum = raw.reduce((s, x) => s + x, 0);
  raw[raw.length - 1] += total - sum;
  const oldCells = insp.verdelingPerJaar ?? [];
  insp.verdelingPerJaar = jaren.map((j, i) => ({
    jaar: j,
    euro: Math.max(0, raw[i] ?? 0),
    fase: oldCells[i]?.fase,
    activiteit: oldCells[i]?.activiteit,
  }));
  insp.totaalEuro = total;
}

function applyCellsFromK(insp: Insp, total: number, kAmounts: number[], jaren: number[]) {
  const raw = kAmounts.map((k) => k * 1000);
  const sum = raw.reduce((s, x) => s + x, 0);
  raw[raw.length - 1] += total - sum;
  const oldCells = insp.verdelingPerJaar ?? [];
  insp.verdelingPerJaar = jaren.map((j, i) => ({
    jaar: j,
    euro: Math.max(0, raw[i] ?? 0),
    fase: oldCells[i]?.fase,
    activiteit: oldCells[i]?.activiteit,
  }));
  insp.totaalEuro = total;
}

function subtractFromCrmLater(crm: Insp, amount: number, startJaar: number) {
  const cells = crm.verdelingPerJaar ?? [];
  const laterCells = cells.filter((c) => c.jaar > startJaar);
  const sumLater = laterCells.reduce((s, c) => s + c.euro, 0);
  if (sumLater <= 0) return;
  let applied = 0;
  for (let i = 0; i < laterCells.length; i++) {
    const c = laterCells[i];
    let delta: number;
    if (i === laterCells.length - 1) {
      delta = amount - applied;
    } else {
      delta = Math.round((amount * c.euro) / sumLater / 1000) * 1000;
    }
    c.euro = Math.max(0, c.euro - delta);
    applied += delta;
  }
  crm.totaalEuro = (crm.totaalEuro ?? 0) - amount;
}

function shiftCell(insp: Insp, fromIdx: number, toIdx: number, amount: number, minLeft = 0): number {
  const from = insp.verdelingPerJaar?.[fromIdx];
  const to = insp.verdelingPerJaar?.[toIdx];
  if (!from || !to) return 0;
  if (amount <= 0) return 0;
  const moved = Math.max(0, Math.min(amount, from.euro - minLeft));
  if (moved <= 0) return 0;
  from.euro -= moved;
  to.euro += moved;
  return moved;
}

function waterFillCap(
  sc: Scen,
  jaren: number[],
  cap: number,
  floor: number,
  mutableKeys: ("mens" | "proc" | "cult" | "buffer")[],
) {
  const mutable: Insp[] = [];
  for (const k of mutableKeys) {
    const ins = findInsp(sc, k);
    if (ins) mutable.push(ins);
  }
  const bufferInsp = findInsp(sc, "buffer");

  // Bidirectional: voor elke over-cap jaar zoek ELK ander jaar met headroom
  for (let attempt = 0; attempt < 100; attempt++) {
    const totals = getYearTotals(sc, jaren);
    let didShift = false;
    for (let i = 0; i < jaren.length; i++) {
      const j = jaren[i];
      const overshoot = totals[j] - cap;
      if (overshoot <= 0) continue;
      let toMove = overshoot;
      // Bezoek alle andere jaren — eerst latere (vasthouden aan lifecycle), dan eerdere
      const candidatesK: number[] = [];
      for (let k = i + 1; k < jaren.length; k++) candidatesK.push(k);
      for (let k = i - 1; k >= 0; k--) candidatesK.push(k);
      for (const k of candidatesK) {
        if (toMove <= 0) break;
        // J1 heeft mogelijk Cito-floor — niet boven cap mogen (cap bovenaan al gerespecteerd)
        // J1 minimum is floor; we mogen NIET J1 onder floor brengen door eraf te halen,
        // maar hier voegen we juist toe aan J1 (k=0). Dus alleen check: receiver onder cap.
        const headroom = cap - totals[jaren[k]];
        if (headroom <= 0) continue;
        const transferable = Math.min(toMove, headroom);
        const candidates = mutable
          .filter((ins) => (ins.verdelingPerJaar?.[i]?.euro ?? 0) > 0)
          .sort((a, b) => (b.verdelingPerJaar![i].euro - a.verdelingPerJaar![i].euro));
        let perRoundMoved = 0;
        for (const ins of candidates) {
          if (perRoundMoved >= transferable) break;
          // Buffer mag NIET in J1 belanden of uit J1 komen
          if (ins === bufferInsp && (i === 0 || k === 0)) continue;
          const moved = shiftCell(ins, i, k, transferable - perRoundMoved);
          perRoundMoved += moved;
        }
        toMove -= perRoundMoved;
        totals[j] -= perRoundMoved;
        totals[jaren[k]] += perRoundMoved;
        if (perRoundMoved > 0) didShift = true;
      }
    }
    if (!didShift) break;
  }
  // Suppress unused warning
  void floor;
}

function ensureFloorAtJ1(
  sc: Scen,
  jaren: number[],
  floor: number,
  mutableKeys: ("mens" | "proc" | "cult")[],
) {
  // Buffer NOOIT in J1 — gebruik alleen mens/proc/cult als donor
  const mutable: Insp[] = [];
  for (const k of mutableKeys) {
    const ins = findInsp(sc, k);
    if (ins) mutable.push(ins);
  }
  for (let attempt = 0; attempt < 50; attempt++) {
    const totals = getYearTotals(sc, jaren);
    const j1 = jaren[0];
    const deficit = floor - totals[j1];
    if (deficit <= 0) break;
    let toFill = deficit;
    for (let k = jaren.length - 1; k > 0 && toFill > 0; k--) {
      const candidates = mutable
        .filter((ins) => (ins.verdelingPerJaar?.[k]?.euro ?? 0) > 0)
        .sort((a, b) => (b.verdelingPerJaar![k].euro - a.verdelingPerJaar![k].euro));
      for (const ins of candidates) {
        if (toFill <= 0) break;
        const moved = shiftCell(ins, k, 0, toFill);
        toFill -= moved;
      }
    }
    if (toFill === deficit) break; // niets verplaatst
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
  console.log("VOLLEDIGE AANBEVELING TOEPASSEN — Mens + Processen + Cultuur + Post onvoorzien");
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
      console.warn(`Skip ${sk} — missing baseline inspanning`);
      continue;
    }

    // 1. Revert CRM buffer-bump
    subtractFromCrmLater(crm, 24_000, startJaar);

    // 2. Apply Mens
    const mensTotal = NEW_TOTALS.mens[sk as ScenKey];
    const mensPct = MENS_PCT[sk as ScenKey];
    if (mensTotal && mensPct) {
      applyCellsFromPct(mens, mensTotal, mensPct, jaren);
      mens.motivatie = MENS_MOTIVATIE;
      if (mens.volgorde) mens.volgorde.reden = MENS_POSITIE;
    }

    // 3. Apply Processen
    const procTotal = NEW_TOTALS.proc[sk as ScenKey];
    const procK = PROC_K[sk as ScenKey];
    if (procTotal && procK) {
      applyCellsFromK(proc, procTotal, procK, jaren);
      proc.motivatie = PROC_MOTIVATIE;
      if (proc.volgorde) proc.volgorde.reden = PROC_POSITIE;
    }

    // 4. Apply Cultuur
    const cultTotal = NEW_TOTALS.cult[sk as ScenKey];
    const cultPct = CULT_PCT[sk as ScenKey];
    if (cultTotal && cultPct) {
      applyCellsFromPct(cult, cultTotal, cultPct, jaren);
      cult.motivatie = CULT_MOTIVATIE;
      if (cult.volgorde) cult.volgorde.reden = CULT_POSITIE;
    }

    // 5. Voeg "Post onvoorzien (programma-breed)" toe
    const bufferTotal = NEW_TOTALS.buffer[sk as ScenKey];
    sc.inspanningen = sc.inspanningen.filter(
      (i) => !i.inspanningTitel.toLowerCase().includes("post onvoorzien"),
    );
    if (bufferTotal && bufferTotal > 0) {
      const laterJaren = jaren.slice(1);
      const perJaar = Math.round(bufferTotal / laterJaren.length / 1000) * 1000;
      const cells: Cell[] = jaren.map((j, idx) => ({
        jaar: j,
        euro: idx === 0 ? 0 : perJaar,
        fase: idx === 0 ? "Reservering" : "Onvoorzien",
        activiteit:
          idx === 0
            ? "Geen post onvoorzien in jaar 1 — Cito 2026-budget hard vastgesteld"
            : "Programma-brede risico-buffer voor scope-uitloop, marktrisico tarieven, herbewerking en onvoorziene integratie-issues",
      }));
      const sumCells = cells.reduce((s, c) => s + c.euro, 0);
      const lastIdx = cells.length - 1;
      cells[lastIdx].euro = Math.max(0, cells[lastIdx].euro + (bufferTotal - sumCells));
      const newInsp: Insp = {
        inspanningTitel: "Post onvoorzien (programma-breed)",
        domein: "overig",
        totaalEuro: bufferTotal,
        verdelingPerJaar: cells,
        motivatie: BUFFER_MOTIVATIE,
        volgorde: { rank: 5, reden: BUFFER_POSITIE },
      };
      sc.inspanningen.push(newInsp);
    }

    // 6. Cap-water-fill (mutable: mens/proc/cult/buffer)
    waterFillCap(sc, jaren, cap, floor, ["mens", "proc", "cult", "buffer"]);

    // 7. Cito-floor (alleen mens/proc/cult als donor — buffer blijft 0 in J1)
    ensureFloorAtJ1(sc, jaren, floor, ["mens", "proc", "cult"]);

    // 8. Re-run cap-fill na floor-fix (kan nieuwe overschrijdingen veroorzaken)
    waterFillCap(sc, jaren, cap, floor, ["mens", "proc", "cult", "buffer"]);

    // 9. Recompute totaalEuro per inspanning (cellen kunnen herverdeeld zijn maar totaal moet kloppen)
    for (const ins of sc.inspanningen) {
      ins.totaalEuro = (ins.verdelingPerJaar ?? []).reduce((s, c) => s + c.euro, 0);
    }

    // 10. Recompute scenario.totaalGeraamdEuro + totalenPerJaar
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

    const finalTotals = getYearTotals(sc, jaren);
    console.log(
      `\n▌ ${sk.toUpperCase()}: scen-totaal € ${(sc.totaalGeraamdEuro / 1000).toFixed(0)}K (cap×jaren ${(
        (cap * aantalJaren) / 1000
      ).toFixed(0)}K, marge ${((cap * aantalJaren - sc.totaalGeraamdEuro) / 1000).toFixed(0)}K)`,
    );
    console.log(
      `   inspanningen: CRM ${(crm.totaalEuro! / 1000).toFixed(0)}K · Mens ${
        (mens.totaalEuro! / 1000).toFixed(0)
      }K · Proc ${(proc.totaalEuro! / 1000).toFixed(0)}K · Cult ${
        (cult.totaalEuro! / 1000).toFixed(0)
      }K · Buffer ${(NEW_TOTALS.buffer[sk as ScenKey] / 1000).toFixed(0)}K`,
    );
    for (let i = 0; i < jaren.length; i++) {
      const j = jaren[i];
      const t = finalTotals[j];
      const overCap = t > cap;
      const underFloor = i === 0 && t < floor;
      const status = overCap ? "✗cap" : underFloor ? "✗floor" : "✓";
      console.log(`   ${j}: € ${(t / 1000).toFixed(0)}K (cap ${cap / 1000}K)  ${status}`);
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
  console.log("\n✓ Volledige aanbeveling toegepast en weggeschreven naar Supabase.");
}

void main();
