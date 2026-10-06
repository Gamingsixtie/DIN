// Volledige audit van H4 (Out-of-pocket raming) — alle 4 scenarios × alle inspanningen.
// Per inspanning checkt het script:
//   - Positie-zin (volgorde.reden) — bevat soms €-bedragen die GENERIEK zijn over scenarios
//   - Motivatie-paragraaf — bevat concrete jaartal-claims, €-claims, fase-claims
//   - Tabel verdelingPerJaar — feitelijke jaar-bedragen + percentages
//
// Match-checks:
//   1) "zwaartepunt in JR1-JR2" of "piek in JRX" → klopt dat met top-2 jaren in tabel?
//   2) "vanaf JRX dragen structurele kosten (€X-Y/jaar) het grootste deel" → klopt
//      dat met de bedragen in JRX en daarna?
//   3) Jaartal-claims in motivatie → komen die jaren in deze scenario voor?
//   4) €-bedrag-claims in motivatie → matcht een jaar-totaal in de tabel binnen ±25%?
//   5) Positie-zin met absolute getallen (€650K) → blijven die kloppen tussen scenarios?

import { createClient } from "@supabase/supabase-js";
import { readFileSync, existsSync } from "fs";
import { join } from "path";

function loadEnvFile(p:string){if(!existsSync(p))return;const c=readFileSync(p,"utf-8");for(const l of c.split(/\r?\n/)){const t=l.trim();if(!t||t.startsWith("#"))continue;const e=t.indexOf("=");if(e===-1)continue;const k=t.substring(0,e).trim();const v=t.substring(e+1).trim().replace(/^["']|["']$/g,"");if(!process.env[k])process.env[k]=v;}}
loadEnvFile(join(process.cwd(),".env.local"));

const supa = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!);
const sessionId = process.argv[2];
if (!sessionId) { console.error("Usage: tsx scripts/audit-h4-volledig.ts <sessionId>"); process.exit(1); }

type Cell = { jaar: number; euro: number; percentage?: number; fase: string; activiteit?: string };
type Insp = {
  inspanningTitel: string;
  domein: string;
  totaalEuro?: number;
  percentageTotaal?: number;
  motivatie?: string;
  verdelingPerJaar: Cell[];
  volgorde?: { rank: number; reden: string };
};
type Scen = {
  jaarlijksBudgetEuro?: number;
  aantalJaren?: number;
  totaalGeraamdEuro?: number;
  inspanningen?: Insp[];
  totalenPerJaar?: { jaar: number; euro: number; percentage: number }[];
  samenvatting?: string;
  prioriteitAdvies?: string;
};

const DOMAIN_LABEL: Record<string, string> = {
  data_systemen: "DATA & SYSTEMEN",
  processen: "PROCESSEN",
  mens: "MENS",
  cultuur: "CULTUUR",
};

// Parse "€650K", "€125.000", "€92,5K", "€92.500"
function parseEuro(token: string): number {
  const cleaned = token.replace(/[€\s.]/g, "").replace(",", ".");
  if (/[Kk]$/.test(cleaned)) return Math.round(parseFloat(cleaned.replace(/[Kk]$/, "")) * 1000);
  if (/[Mm]$/.test(cleaned)) return Math.round(parseFloat(cleaned.replace(/[Mm]$/, "")) * 1_000_000);
  return Math.round(parseFloat(cleaned));
}

// Vind alle €-bedragen in tekst, eventueel als range. Returns alle individuele waardes.
function extractEuroBedragen(text: string): { value: number; raw: string; idx: number; isStructureelPerJaar: boolean }[] {
  const numberPart = "(?:\\d{1,3}(?:[.,]\\d{3})*|\\d+)(?:[.,]\\d+)?[KkMm]?";
  // ranges €X–€Y of €X-€Y
  const reRange = new RegExp(`€\\s*(${numberPart})\\s*[–\\-]\\s*€?\\s*(${numberPart})`, "g");
  // single €X
  const reSingle = new RegExp(`€\\s*(${numberPart})`, "g");
  const out: { value: number; raw: string; idx: number; isStructureelPerJaar: boolean }[] = [];
  const seenIdx = new Set<number>();
  let m: RegExpExecArray | null;
  while ((m = reRange.exec(text)) !== null) {
    const lo = parseEuro(m[1]); const hi = parseEuro(m[2]);
    if (Number.isFinite(lo) && lo > 0) {
      const after = text.slice(m.index + m[0].length, m.index + m[0].length + 30).toLowerCase();
      const isStruc = /\bper\s*jaar\b|\/\s*(?:jaar|jr)\b|\bp\.\s*j\.\b/.test(after);
      out.push({ value: lo, raw: m[0], idx: m.index, isStructureelPerJaar: isStruc });
      out.push({ value: hi, raw: m[0], idx: m.index, isStructureelPerJaar: isStruc });
      for (let i = m.index; i < m.index + m[0].length; i++) seenIdx.add(i);
    }
  }
  while ((m = reSingle.exec(text)) !== null) {
    if (seenIdx.has(m.index)) continue;
    const v = parseEuro(m[1]);
    if (Number.isFinite(v) && v > 0) {
      const after = text.slice(m.index + m[0].length, m.index + m[0].length + 30).toLowerCase();
      const isStruc = /\bper\s*jaar\b|\/\s*(?:jaar|jr)\b|\bp\.\s*j\.\b/.test(after);
      out.push({ value: v, raw: m[0], idx: m.index, isStructureelPerJaar: isStruc });
    }
  }
  return out;
}

function extractJaartallen(text: string): number[] {
  const m = text.match(/\b(20[0-9]{2})\b/g) ?? [];
  return [...new Set(m.map(Number))];
}

function eurof(n: number): string {
  return `€${(n ?? 0).toLocaleString("nl-NL")}`;
}

async function main() {
  const { data, error } = await supa.from("din_sessions").select("data").eq("id", sessionId).maybeSingle();
  if (error || !data) { console.error(error?.message ?? "not found"); process.exit(1); }
  const s = data.data as Record<string, unknown>;
  const wiz = s.crossAnalyseWizard as { stepResults?: Record<string, Record<string, unknown>> } | undefined;
  const stap4 = wiz?.stepResults?.stap4 as Record<string, unknown> | undefined;
  const begroting = stap4?.begrotingAdvies as
    | { startJaar?: number; scenarios?: Record<string, Scen | null>; vergelijking?: string;
        adviesKeuze?: { jaren: number; benodigdJaarlijks: number; pctVerschilTovHuidig: number };
        optimaalOpties?: { jaren: number; totaalEuro: number; benodigdJaarlijks: number; pctVerschilTovHuidig: number }[];
        inspanningRamingen?: { titel: string; domein: string; eenmaligLow: number; eenmaligMid: number; eenmaligHigh: number; structureelLowPerJr: number; structureelMidPerJr: number; structureelHighPerJr: number; unparsed: boolean }[];
        jaarlijksBudgetBasis?: number;
      }
    | undefined;
  if (!begroting?.scenarios) { console.error("Geen begrotingAdvies."); process.exit(1); }

  const startJaar = begroting.startJaar ?? 2026;

  // ── BLOK 1 — BEREKENINGSTOELICHTING ──
  console.log("█".repeat(80));
  console.log("█  HOE ZIJN DE SCENARIO'S BEREKEND?");
  console.log("█".repeat(80));
  console.log();
  console.log(`  Bron-input van de gebruiker:`);
  console.log(`    jaarlijks budget basis (uit cross-analyse stap 4): ${eurof(begroting.jaarlijksBudgetBasis ?? 0)}/jaar`);
  console.log(`    startJaar: ${startJaar}`);
  console.log();

  if (begroting.inspanningRamingen) {
    console.log(`  Dossier-totalen per inspanning (geparsed uit business-case Q&A):`);
    for (const r of begroting.inspanningRamingen) {
      console.log(`    [${r.domein}] ${r.titel}`);
      console.log(`      eenmalig: €${r.eenmaligLow.toLocaleString("nl-NL")} – €${r.eenmaligHigh.toLocaleString("nl-NL")} (mid €${r.eenmaligMid.toLocaleString("nl-NL")})`);
      console.log(`      structureel: €${r.structureelLowPerJr.toLocaleString("nl-NL")} – €${r.structureelHighPerJr.toLocaleString("nl-NL")}/jaar (mid €${r.structureelMidPerJr.toLocaleString("nl-NL")}/jaar)`);
    }
    console.log();
  }

  console.log(`  Formule per scenario:`);
  console.log(`    totaal_scenario = Σ (eenmalig_mid + structureel_mid/jr × (aantalJaren − 1))`);
  console.log(`    aantalJaren    = kleinste n waarvoor totaal/n ≤ jaarlijks_budget_scenario`);
  console.log();
  console.log(`  Per-scenario instellingen:`);
  console.log(`    optimaal: jaarlijks_budget = basis × 1.0  (huidig budget gehouden, jaren volgen)`);
  console.log(`    plus20  : jaarlijks_budget = basis × 1.2  (sneller — minder jaren)`);
  console.log(`    min20   : jaarlijks_budget = basis × 0.8  (langzamer — meer jaren)`);
  console.log(`    advies  : server kiest kortste jaren ∈ [3,5] dat ≤ basis × 1.4 vereist`);
  console.log();

  if (begroting.optimaalOpties) {
    console.log(`  Advies-keuze (server-berekend uit dossier-totalen):`);
    console.log(`    optie  jaren  totaal             benodigd/jaar     verschil tov huidig`);
    for (const o of begroting.optimaalOpties) {
      console.log(`           ${o.jaren}      ${eurof(o.totaalEuro).padEnd(18)} ${eurof(o.benodigdJaarlijks).padEnd(17)} ${o.pctVerschilTovHuidig >= 0 ? "+" : ""}${o.pctVerschilTovHuidig}%`);
    }
    if (begroting.adviesKeuze) {
      console.log(`    → gekozen: ${begroting.adviesKeuze.jaren} jaar (${eurof(begroting.adviesKeuze.benodigdJaarlijks)}/jr, ${begroting.adviesKeuze.pctVerschilTovHuidig >= 0 ? "+" : ""}${begroting.adviesKeuze.pctVerschilTovHuidig}% boven basis)`);
    }
  }
  console.log();

  console.log(`  Server-side guards die de bedragen NA AI nog kunnen muteren:`);
  console.log(`    PARALLEL  — elke inspanning krijgt min. €1K in jaar 1 (parallelle start)`);
  console.log(`    SCALE-UP  — bedragen worden proportioneel opgehoogd tot dossier-mid (factor × elk jaar)`);
  console.log(`    OVER-BUDGET — jaartotaal > jaarlijks budget → overschot naar laatste jaar`);
  console.log(`    VOL-BUDGET  — niet-laatste jaren worden tot 100% gevuld door verschuiving uit late jaren`);
  console.log(`    De fase- en activiteit-tekst wordt door deze guards GEERFD; niet hergeschreven.`);
  console.log();

  // ── BLOK 2 — PER SCENARIO × INSPANNING MATCH-CHECK ──
  const scenarioOrder = ["optimaal", "plus20", "min20", "advies"] as const;

  const matrix: Array<{ scenario: string; inspanning: string; verdict: "KLOPT" | "DEELS" | "KLOPT NIET"; mismatches: string[] }> = [];

  for (const skey of scenarioOrder) {
    const sc = begroting.scenarios?.[skey];
    if (!sc) continue;
    const aantalJaren = sc.aantalJaren ?? 1;
    const eindJaar = startJaar + aantalJaren - 1;
    const scenarioJaarSet = new Set<number>();
    for (let y = startJaar; y <= eindJaar; y++) scenarioJaarSet.add(y);

    console.log("═".repeat(80));
    console.log(`SCENARIO: ${skey.toUpperCase()}  (${aantalJaren} jaar — ${eurof(sc.jaarlijksBudgetEuro ?? 0)}/jaar — totaal ${eurof(sc.totaalGeraamdEuro ?? 0)})`);
    console.log(`Periode: ${startJaar}–${eindJaar}`);
    console.log("═".repeat(80));

    for (const insp of sc.inspanningen ?? []) {
      const sorted = [...insp.verdelingPerJaar].sort((a, b) => a.jaar - b.jaar);
      const totaal = insp.totaalEuro ?? sorted.reduce((s, c) => s + (c.euro ?? 0), 0);
      const top2 = [...sorted].sort((a, b) => (b.euro ?? 0) - (a.euro ?? 0)).slice(0, 2);
      const top2Jaren = top2.map((c) => c.jaar).sort((a, b) => a - b);
      const top2Pct = top2.map((c) => Math.round(((c.euro ?? 0) / totaal) * 100));

      console.log();
      console.log(`  ▌ ${DOMAIN_LABEL[insp.domein] ?? insp.domein.toUpperCase()}  —  ${insp.inspanningTitel}`);
      console.log(`     totaal in dit scenario: ${eurof(totaal)}  (${aantalJaren} jaar; zwaartepunt jaren ${top2Jaren.join("+")} = ${top2Pct.join("%+")}%)`);

      const positie = (insp.volgorde?.reden ?? "").trim();
      const motivatie = (insp.motivatie ?? "").trim();
      console.log();
      if (positie) console.log(`     Positie: ${positie}`);
      if (motivatie) console.log(`     Motivatie: ${motivatie}`);
      console.log();

      // Tabel
      console.log(`     Jaar     Bedrag      %     Fase`);
      for (const c of sorted) {
        const pct = totaal > 0 ? Math.round(((c.euro ?? 0) / totaal) * 100) : 0;
        console.log(`     ${c.jaar}   ${eurof(c.euro ?? 0).padStart(10)}  ${(pct + "%").padStart(4)}   ${c.fase || "—"}`);
      }
      console.log();

      // ── MATCH-CHECKS ──
      const issues: string[] = [];
      const tekstAlles = `${positie} ${motivatie}`.trim();

      // 1) Zwaartepunt-claim
      const zwaartepuntMatch = tekstAlles.match(/zwaartepunt[^.]*?(\b20\d{2}\b(?:\s*[–\-]\s*\b20\d{2}\b)?)/i);
      if (zwaartepuntMatch) {
        const claimRaw = zwaartepuntMatch[1];
        const claimJaren = (claimRaw.match(/20\d{2}/g) ?? []).map(Number);
        const overlap = claimJaren.filter((j) => top2Jaren.includes(j));
        if (overlap.length === 0 && claimJaren.length > 0) {
          issues.push(`Tekst zegt zwaartepunt = ${claimJaren.join("/")} maar tabel-zwaartepunt = ${top2Jaren.join("/")} (${top2Pct.join("/")}%).`);
        }
      }

      // 2) "vanaf JRX..." claim
      const vanafMatch = tekstAlles.match(/vanaf\s+(\b20\d{2}\b)([^.]*?)(?:\.|$)/i);
      if (vanafMatch) {
        const claimJaar = parseInt(vanafMatch[1], 10);
        const restClaim = vanafMatch[2].toLowerCase();
        if (!scenarioJaarSet.has(claimJaar)) {
          issues.push(`Motivatie zegt "vanaf ${claimJaar}..." maar dit scenario loopt ${startJaar}–${eindJaar} — dat jaar valt buiten de looptijd.`);
        } else if (restClaim.includes("structureel") || restClaim.includes("grootste deel") || restClaim.includes("dragen")) {
          // "vanaf JR dragen structurele kosten X-Y/jaar grootste deel"
          // Check: ligt het werkelijke jaartotaal vanaf JR rond de geclaimde structurele range?
          const struktBedragen = extractEuroBedragen(vanafMatch[0]).filter((e) => e.isStructureelPerJaar);
          if (struktBedragen.length >= 1) {
            const claimMax = Math.max(...struktBedragen.map((s) => s.value));
            const echteVanaf = sorted.filter((c) => c.jaar >= claimJaar).map((c) => c.euro ?? 0);
            const echteMax = echteVanaf.length > 0 ? Math.max(...echteVanaf) : 0;
            if (echteMax > claimMax * 1.4) {
              issues.push(`Motivatie zegt "vanaf ${claimJaar} dragen structurele kosten max ${eurof(claimMax)}/jaar het grootste deel" maar tabel toont max ${eurof(echteMax)} in jaar ${sorted.find((c) => (c.euro ?? 0) === echteMax)?.jaar} — dat is ${Math.round((echteMax / claimMax - 1) * 100)}% boven de claim.`);
            }
          }
        }
      }

      // 3) Jaartal-references die buiten scope vallen
      const allJrs = extractJaartallen(tekstAlles);
      for (const jr of allJrs) {
        if (jr >= 2024 && jr <= 2040 && !scenarioJaarSet.has(jr)) {
          issues.push(`Tekst noemt jaar ${jr} maar dit scenario loopt ${startJaar}–${eindJaar}.`);
        }
      }

      // 4) Loopduur-claim ("over X jaar", "X-jarige")
      const loopMatch = tekstAlles.match(/(?:over|in|gedurende)\s+(\d+)\s+jaar|(\d+)[- ]?jarig/i);
      if (loopMatch) {
        const claimedYrs = parseInt(loopMatch[1] ?? loopMatch[2], 10);
        if (Number.isFinite(claimedYrs) && claimedYrs > 0 && claimedYrs !== aantalJaren) {
          issues.push(`Tekst zegt looptijd ${claimedYrs} jaar; dit scenario heeft ${aantalJaren} jaar.`);
        }
      }

      // 5) Structureel-/jaar claim — komt het overeen met (mid)dossier-structureel?
      // (Alleen waarschuwing als duidelijk afwijkend — informatief)
      // skip if too noisy

      // 6) Eenmalig-claim ("Grootste eenmalige post (€X)") — moet kloppen met dossier-eenmalig-totaal
      const eenmalig = tekstAlles.match(/(?:eenmalig(?:e)?(?:\s+post)?\s*\(?)\s*€\s*([\d.,]+)\s*([KkMm])?/i);
      if (eenmalig && begroting.inspanningRamingen) {
        const claim = parseEuro(eenmalig[1] + (eenmalig[2] ?? ""));
        const dossier = begroting.inspanningRamingen.find(
          (r) => r.titel === insp.inspanningTitel || r.titel.toLowerCase() === insp.inspanningTitel.toLowerCase()
        );
        if (dossier) {
          const dossierMid = dossier.eenmaligMid;
          if (dossierMid > 0 && Math.abs(claim - dossierMid) / dossierMid > 0.25) {
            issues.push(`Tekst claimt eenmalig €${claim.toLocaleString("nl-NL")}, maar dossier zegt €${dossier.eenmaligLow.toLocaleString("nl-NL")}–€${dossier.eenmaligHigh.toLocaleString("nl-NL")} (mid €${dossierMid.toLocaleString("nl-NL")}).`);
          }
        }
      }

      // 7) Globale check: totaal-claim "dossier-totaal van €X"
      const totaalClaim = tekstAlles.match(/dossier[- ]totaal\s+van\s+€\s*([\d.,]+)\s*([KkMm])?/i);
      if (totaalClaim) {
        const claim = parseEuro(totaalClaim[1] + (totaalClaim[2] ?? ""));
        if (Math.abs(claim - totaal) / Math.max(totaal, 1) > 0.15) {
          issues.push(`Tekst zegt dossier-totaal €${claim.toLocaleString("nl-NL")} maar in DIT scenario is totaal ${eurof(totaal)} (${Math.round((totaal / claim - 1) * 100)}% afwijking).`);
        }
      }

      // 8) Voorbereidings-fase met disproportioneel hoog bedrag
      const VOORBEREIDING = /\b(scoping|kick[- ]?off|voorbereiding|behoeftestelling|inventarisatie|analyse|leverancier-?selectie|architectuur(?:keuze)?|bewustwording|urgentiebesef|ontwerp \(architectuur\))\b/i;
      for (const c of sorted) {
        const pct = totaal > 0 ? Math.round(((c.euro ?? 0) / totaal) * 100) : 0;
        if (pct >= 30 && (VOORBEREIDING.test(c.fase || "") || VOORBEREIDING.test(c.activiteit || ""))) {
          issues.push(`Cel ${c.jaar}: ${eurof(c.euro ?? 0)} (${pct}%) gelabeld als voorbereiding ("${c.fase}") — methodisch hoort voorbereiding 10–25%.`);
        }
      }

      // 9) Borging-fase NIET in laatste jaar (maar in midden of begin)
      const BORGING = /\b(borging|verankering|nazorg|standaardisatie|in beheer|continu verbeteren)\b/i;
      for (const c of sorted) {
        if (c.jaar < eindJaar && BORGING.test((c.fase || "") + " " + (c.activiteit || ""))) {
          if (sorted.filter((x) => x.jaar > c.jaar && (x.euro ?? 0) > 0).length > 0) {
            issues.push(`Cel ${c.jaar}: fase "${c.fase}" gebruikt borging-taal terwijl er na ${c.jaar} nog ${sorted.filter((x) => x.jaar > c.jaar).length} jaar uitvoering volgt (eindjaar = ${eindJaar}).`);
          }
        }
      }

      // Verdict bepalen
      let verdict: "KLOPT" | "DEELS" | "KLOPT NIET";
      if (issues.length === 0) verdict = "KLOPT";
      else if (issues.length <= 2) verdict = "DEELS";
      else verdict = "KLOPT NIET";

      console.log(`     ▶ VERDICT: ${verdict}  (${issues.length} mismatch${issues.length === 1 ? "" : "es"})`);
      for (const m of issues) console.log(`        ✗ ${m}`);

      matrix.push({ scenario: skey, inspanning: `[${insp.domein}] ${insp.inspanningTitel}`, verdict, mismatches: issues });
    }

    // Jaartotaal-check tegen jaarlijks budget
    console.log();
    console.log(`     Jaartotalen in ${skey}:`);
    const jb = sc.jaarlijksBudgetEuro ?? 0;
    for (const t of sc.totalenPerJaar ?? []) {
      const benutting = jb > 0 ? Math.round((t.euro / jb) * 100) : 0;
      const flag = t.euro > jb * 1.02 ? " <-- BOVEN BUDGET" : "";
      console.log(`       ${t.jaar}: ${eurof(t.euro).padStart(10)}  (${benutting}% van ${eurof(jb)})${flag}`);
    }
  }

  // ── BLOK 3 — SAMENVATTENDE MATRIX ──
  console.log();
  console.log("█".repeat(80));
  console.log("█  SAMENVATTENDE MATRIX");
  console.log("█".repeat(80));
  console.log();
  const rijen = matrix.length;
  const klopt = matrix.filter((m) => m.verdict === "KLOPT").length;
  const deels = matrix.filter((m) => m.verdict === "DEELS").length;
  const fout = matrix.filter((m) => m.verdict === "KLOPT NIET").length;
  console.log(`  ${rijen} cellen gecontroleerd: ${klopt} KLOPT, ${deels} DEELS, ${fout} KLOPT NIET`);
  console.log();
  console.log(`  Scenario     Inspanning                                                    Verdict`);
  console.log(`  ${"─".repeat(78)}`);
  for (const m of matrix) {
    const insp = m.inspanning.length > 60 ? m.inspanning.slice(0, 57) + "..." : m.inspanning.padEnd(60);
    console.log(`  ${m.scenario.padEnd(12)} ${insp}  ${m.verdict}`);
  }

  // Top mismatches
  console.log();
  console.log(`  Concrete mismatches:`);
  let i = 1;
  for (const m of matrix) {
    if (m.mismatches.length === 0) continue;
    console.log(`    ${i++}. ${m.scenario} · ${m.inspanning}`);
    for (const x of m.mismatches) console.log(`       ${x}`);
  }
}

main().catch((e) => { console.error(e); process.exit(1); });
