/**
 * verify-e2e-pass3.ts
 *
 * Read-only end-to-end consistency check van §4.1 begroting voor sessie d8b97442.
 *
 * Secties:
 *   A. Motivatie-bedragen vs scenario-totalen
 *   B. samenvatting + prioriteitAdvies — verouderde bedragen
 *   C. Fase + activiteit consistency over scenarios per inspanning
 *   D. Cap-respect: jaartotalen ≤ jaarlijksBudgetEuro
 *
 * Output: AUDIT-e2e-pass3.md + korte stdout-rapportage.
 */
import { createClient } from "@supabase/supabase-js";
import { readFileSync, existsSync, writeFileSync } from "fs";
import { join } from "path";

// ---------- env loader ----------
function loadEnvFile(p: string) {
  if (!existsSync(p)) return;
  const c = readFileSync(p, "utf-8");
  for (const l of c.split(/\r?\n/)) {
    const t = l.trim();
    if (!t || t.startsWith("#")) continue;
    const e = t.indexOf("=");
    if (e === -1) continue;
    const k = t.substring(0, e).trim();
    const v = t.substring(e + 1).trim().replace(/^["']|["']$/g, "");
    if (!process.env[k]) process.env[k] = v;
  }
}
loadEnvFile(join(process.cwd(), ".env.local"));

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const SUPABASE_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
const SESSION_ID = "d8b97442-ce8f-4134-b2c7-67dc8e3a3f93";

// ---------- types ----------
type Cell = { jaar: number; euro: number; fase?: string; activiteit?: string };
type Insp = {
  inspanningId?: string;
  inspanningTitel: string;
  domein: string;
  totaalEuro?: number;
  motivatie?: string;
  verdelingPerJaar: Cell[];
};
type Scen = {
  label?: string;
  jaarlijksBudgetEuro?: number;
  aantalJaren?: number;
  totaalGeraamdEuro?: number;
  inspanningen?: Insp[];
  totalenPerJaar?: { jaar: number; euro: number }[];
  samenvatting?: string;
  prioriteitAdvies?: string;
};
type ScenKey = "advies" | "plus20" | "optimaal" | "min20";

// ---------- expected reference values ----------
type Expected = {
  // canonical motivatie-derived dossier-bedragen per inspanning (eenmalig + structureel/jaar)
  // structureel komt na realisatie (laatste fase / na go-live).
  motivatie: Record<
    string, // inspanning-titel-key (lowercased / pattern)
    {
      eenmaligLow: number;
      eenmaligHigh: number;
      structureelLow: number;
      structureelHigh: number;
    }
  >;
  // verwachte scenario-totaal per inspanning per scenario (uit prompt)
  perScenario: Record<
    ScenKey,
    {
      aantalJaren: number;
      scenarioTotaal: number;
      crm: number;
      mens: number;
      processen: number;
      cultuur: number;
    }
  >;
};

const EXPECTED: Expected = {
  motivatie: {
    crm: { eenmaligLow: 440_000, eenmaligHigh: 640_000, structureelLow: 92_500, structureelHigh: 92_500 },
    processen: { eenmaligLow: 55_000, eenmaligHigh: 70_000, structureelLow: 12_500, structureelHigh: 12_500 },
    mens: { eenmaligLow: 125_000, eenmaligHigh: 160_000, structureelLow: 0, structureelHigh: 0 },
    cultuur: { eenmaligLow: 33_000, eenmaligHigh: 43_000, structureelLow: 25_000, structureelHigh: 30_000 },
  },
  perScenario: {
    advies: { aantalJaren: 4, scenarioTotaal: 1_159_000, crm: 817_000, mens: 142_000, processen: 100_000, cultuur: 100_000 },
    plus20: { aantalJaren: 5, scenarioTotaal: 1_270_000, crm: 905_000, mens: 142_000, processen: 112_000, cultuur: 105_000 },
    optimaal: { aantalJaren: 7, scenarioTotaal: 1_490_000, crm: 1_095_000, mens: 144_000, processen: 137_000, cultuur: 115_000 },
    min20: { aantalJaren: 10, scenarioTotaal: 1_819_000, crm: 1_372_000, mens: 142_000, processen: 178_000, cultuur: 130_000 },
  },
};

// Inspanning matchers — domein-EERST, dan titel-fallback. Domein is in de data-laag canoniek.
function bucketOf(insp: Insp): "crm" | "processen" | "mens" | "cultuur" | null {
  const t = insp.inspanningTitel.toLowerCase();
  const d = insp.domein.toLowerCase();
  // Domein is leidend (cultuur > mens > processen > crm)
  if (d.includes("cultuur")) return "cultuur";
  if (d.includes("data")) return "crm";
  if (d.includes("proces")) return "processen";
  if (d.includes("mens")) return "mens";
  // Titel-fallback (alleen als domein onbekend)
  if (/cultuur|gedrag|mindset|waard|leiderschap/.test(t)) return "cultuur";
  if (/crm|systeem|data|salesforce/.test(t)) return "crm";
  if (/process|werkwijze|operating|ritmiek|samenwerk/.test(t)) return "processen";
  if (/training|opleiding|ontwikk|vaardighed|professional|coach/.test(t)) return "mens";
  return null;
}

// ---------- bedrag-extractor ----------
// Extract euro-bedragen + context (eenmalig vs structureel) uit motivatie-tekst.
type ExtractedAmount = { euro: number; isRange?: { low: number; high: number }; isStructureel: boolean; raw: string };

function extractAmountsFromMotivatie(text: string): ExtractedAmount[] {
  if (!text) return [];
  const out: ExtractedAmount[] = [];
  // Normaliseer tekst: spaties/non-breaking spaces
  const norm = text.replace(/ /g, " ");
  // Simpele heuristiek: sentence-segmentatie, dan per zin checken op euro-bedragen + structureel-flag
  const sentences = norm.split(/(?<=[.\n])\s+/);
  for (const sent of sentences) {
    // pattern: € 440K - 640K  /  € 440.000 – € 640.000  /  €92.500/jaar
    // we vangen: optionele lage-grens, dan hoge waarde
    const isStructureel =
      /per jaar|\/jaar|jaarlijks|structureel|borging(?:slast)?|onderhoud|licent|beheer|abonnement/i.test(sent);
    // per-zin: vind alle euro tokens
    const tokens: number[] = [];
    const re = /€?\s*(\d{1,3}(?:[. \s]\d{3})*(?:,\d+)?|\d+(?:[.,]\d+)?)\s*(K|k|m|M)?/g;
    let m: RegExpExecArray | null;
    while ((m = re.exec(sent)) !== null) {
      const numStr = m[1].replace(/[. \s]/g, "").replace(",", ".");
      const num = parseFloat(numStr);
      if (isNaN(num)) continue;
      const suffix = (m[2] ?? "").toUpperCase();
      let val = num;
      if (suffix === "K") val = num * 1_000;
      else if (suffix === "M") val = num * 1_000_000;
      // Heuristiek: een naakt getal zonder K/M onder 1000 negeren (jaartal/percentage/aantal)
      // Een getal dat een jaartal lijkt (2024-2035) negeren
      if (val >= 1900 && val <= 2100 && !suffix) continue;
      // < 5000 zonder suffix: waarschijnlijk geen euro maar percentage of aantal
      if (val < 5000 && !suffix) continue;
      tokens.push(val);
    }
    if (tokens.length === 0) continue;
    // Detecteer range: opeenvolgende tokens vormen een range (low – high) als beide > 5000 en verschil < 5x
    if (tokens.length >= 2 && /[-–—‒]/.test(sent)) {
      // Eerste twee = range
      const low = tokens[0];
      const high = tokens[1];
      if (low <= high && high / low <= 5) {
        out.push({ euro: high, isRange: { low, high }, isStructureel, raw: sent.trim().slice(0, 120) });
        // overige tokens als losse waarden
        for (let i = 2; i < tokens.length; i++) {
          out.push({ euro: tokens[i], isStructureel, raw: sent.trim().slice(0, 120) });
        }
        continue;
      }
    }
    for (const t of tokens) {
      out.push({ euro: t, isStructureel, raw: sent.trim().slice(0, 120) });
    }
  }
  return out;
}

// ---------- helpers ----------
function fmt(n: number): string {
  return `€ ${n.toLocaleString("nl-NL")}`;
}

function within(actual: number, expectedLow: number, expectedHigh: number, tolPct = 0): boolean {
  const tol = (expectedHigh * tolPct) / 100;
  return actual >= expectedLow - tol && actual <= expectedHigh + tol;
}

function withinTol(actual: number, expected: number, tolPct: number): boolean {
  const tol = expected * (tolPct / 100);
  return Math.abs(actual - expected) <= tol;
}

// ---------- main ----------
async function main() {
  const supa = createClient(SUPABASE_URL, SUPABASE_KEY);
  const { data, error } = await supa.from("din_sessions").select("data").eq("id", SESSION_ID).maybeSingle();
  if (error || !data) {
    console.error("Sessie niet geladen:", error?.message ?? "leeg");
    process.exit(1);
  }
  const sess = data.data as Record<string, unknown>;
  const wiz = sess.crossAnalyseWizard as { stepResults?: Record<string, Record<string, unknown>> } | undefined;
  const begroting = wiz?.stepResults?.stap4?.begrotingAdvies as
    | { startJaar?: number; scenarios?: Record<string, Scen | null> }
    | undefined;
  if (!begroting?.scenarios) {
    console.error("Geen begrotingAdvies in deze sessie.");
    process.exit(1);
  }

  const startJaar = begroting.startJaar ?? 2026;
  const scenarioKeys: ScenKey[] = ["advies", "plus20", "optimaal", "min20"];

  // ---- buffers ----
  type SectionRow = { key: string; status: "PASS" | "FAIL" | "WARN"; details: string };
  const sectieA: SectionRow[] = [];
  const sectieB: SectionRow[] = [];
  const sectieC: SectionRow[] = [];
  const sectieD: SectionRow[] = [];
  const summaryTabel: { scenario: string; aantalJaren: number; verwachtTotaal: number; actualTotaal: number; somInsp: number; status: string }[] = [];

  // ----------------------- Sectie A & D: per scenario -----------------------
  for (const skey of scenarioKeys) {
    const sc = begroting.scenarios?.[skey];
    if (!sc) {
      sectieA.push({ key: `${skey} · scenario`, status: "FAIL", details: "Scenario ontbreekt." });
      continue;
    }
    const expected = EXPECTED.perScenario[skey];
    const aantalJaren = sc.aantalJaren ?? 0;
    const insps = sc.inspanningen ?? [];

    // === A1. Motivatie-bedragen vs scenario-totaal per inspanning ===
    const bucketActual: Record<"crm" | "processen" | "mens" | "cultuur", number> = {
      crm: 0,
      processen: 0,
      mens: 0,
      cultuur: 0,
    };
    for (const insp of insps) {
      const totaal = insp.totaalEuro ?? insp.verdelingPerJaar.reduce((a, b) => a + (b.euro ?? 0), 0);
      const b = bucketOf(insp);
      if (b) bucketActual[b] += totaal;

      // A1: motivatie moet de canonical eenmalig+structureel bedragen bevatten als string-fragment.
      // Per bucket definiëren we welke fragmenten verwacht zijn (regex).
      const ref = b ? EXPECTED.motivatie[b] : null;
      const motivText = (insp.motivatie ?? "").replace(/ /g, " ");
      let mDetails = "";
      let mStatus: "PASS" | "FAIL" | "WARN" = "PASS";

      if (!ref) {
        mStatus = "WARN";
        mDetails = `Inspanning '${insp.inspanningTitel}' niet te bucketen (skip).`;
      } else {
        // Per-bucket required fragments (case-insensitive). Each fragment is a regex.
        const requiredByBucket: Record<string, RegExp[]> = {
          crm: [
            /eenmalig.*€\s*440[.\s]?000.*€\s*640[.\s]?000/is,
            /structureel\s*€\s*92[.\s]?500.*per jaar/is,
          ],
          processen: [
            /eenmalig.*€\s*55[.\s]?000.*€\s*70[.\s]?000/is,
            /structureel\s*€\s*12[.\s]?500.*per jaar/is,
          ],
          mens: [
            /eenmalig.*€\s*125[.\s]?000.*€\s*160[.\s]?000/is,
            /(geen significante structurele|borging via e[- ]learning|geen structurele)/i,
          ],
          cultuur: [
            /eenmalig.*€\s*33[.\s]?000.*€\s*43[.\s]?000/is,
            /structureel\s*€\s*25[.\s]?000.*€\s*30[.\s]?000/is,
          ],
        };
        const reqs = requiredByBucket[b!] ?? [];
        const missing: string[] = [];
        for (const re of reqs) {
          if (!re.test(motivText)) missing.push(re.source.slice(0, 70));
        }
        if (missing.length === 0) {
          mStatus = "PASS";
          mDetails = `motivatie bevat canonical eenmalig+structureel fragmenten.`;
        } else {
          mStatus = "FAIL";
          mDetails = `motivatie mist verwachte fragment(en): ${missing.join(" | ")}.`;
        }

        // A1b: cross-check totaal vs canonical-band [eenmalig + structureel*(aantalJaren-2)]
        const structJaren = Math.max(1, aantalJaren - 2);
        const verwachtMin = ref.eenmaligLow + ref.structureelLow * structJaren;
        const verwachtMax = ref.eenmaligHigh + ref.structureelHigh * structJaren;
        const ok = totaal >= verwachtMin * 0.7 && totaal <= verwachtMax * 1.4;
        mDetails += ` | totaal=${fmt(totaal)}, ref-band[${fmt(verwachtMin)}–${fmt(verwachtMax)}] over ${structJaren}j structureel → ${ok ? "binnen" : "BUITEN"}`;
        if (!ok && mStatus === "PASS") mStatus = "WARN";
      }

      sectieA.push({
        key: `A · ${skey} · ${insp.inspanningTitel}`,
        status: mStatus,
        details: mDetails,
      });
    }

    // A2: per-domein actual vs expected scenario.crm/mens/processen/cultuur
    const tolPct = 12; // 12% tolerantie voor afronding/spreiding
    const checks: { name: string; actual: number; expected: number }[] = [
      { name: "crm", actual: bucketActual.crm, expected: expected.crm },
      { name: "mens", actual: bucketActual.mens, expected: expected.mens },
      { name: "processen", actual: bucketActual.processen, expected: expected.processen },
      { name: "cultuur", actual: bucketActual.cultuur, expected: expected.cultuur },
    ];
    for (const c of checks) {
      const ok = withinTol(c.actual, c.expected, tolPct);
      sectieA.push({
        key: `A · ${skey} · domein-${c.name}`,
        status: ok ? "PASS" : "FAIL",
        details: `actual=${fmt(c.actual)} vs expected=${fmt(c.expected)} (tol ±${tolPct}%) → ${ok ? "binnen" : "BUITEN"}`,
      });
    }

    // A3: scenario.totaalGeraamdEuro vs expected.scenarioTotaal vs Σ inspanningen
    const somInspanningen = insps.reduce(
      (a, b) => a + (b.totaalEuro ?? b.verdelingPerJaar.reduce((p, q) => p + (q.euro ?? 0), 0)),
      0,
    );
    const totaalScen = sc.totaalGeraamdEuro ?? 0;
    const okSomVsScenario = withinTol(somInspanningen, totaalScen, 1);
    const okScenVsExp = withinTol(totaalScen, expected.scenarioTotaal, tolPct);
    summaryTabel.push({
      scenario: skey,
      aantalJaren,
      verwachtTotaal: expected.scenarioTotaal,
      actualTotaal: totaalScen,
      somInsp: somInspanningen,
      status: okSomVsScenario && okScenVsExp ? "PASS" : "FAIL",
    });
    sectieA.push({
      key: `A · ${skey} · scenario-totaal`,
      status: okSomVsScenario && okScenVsExp ? "PASS" : "FAIL",
      details: `Σ inspanningen=${fmt(somInspanningen)} ; scenario.totaalGeraamdEuro=${fmt(totaalScen)} ; expected≈${fmt(expected.scenarioTotaal)} (tol ±${tolPct}%) → som-vs-scen:${okSomVsScenario ? "PASS" : "FAIL"}, scen-vs-expected:${okScenVsExp ? "PASS" : "FAIL"}`,
    });

    // === D. Cap-respect: jaartotalen ≤ jaarlijksBudgetEuro ===
    const jaarlijksBudget = sc.jaarlijksBudgetEuro ?? 0;
    const totalenPerJaar = sc.totalenPerJaar ?? [];
    if (jaarlijksBudget <= 0) {
      sectieD.push({ key: `D · ${skey}`, status: "WARN", details: "jaarlijksBudgetEuro is 0 of ontbreekt — cap niet te valideren." });
    } else {
      let allOk = true;
      const overruns: string[] = [];
      for (const t of totalenPerJaar) {
        if (t.euro > jaarlijksBudget + 0.5) {
          allOk = false;
          overruns.push(`jaar ${t.jaar}: ${fmt(t.euro)} > budget ${fmt(jaarlijksBudget)}`);
        }
      }
      sectieD.push({
        key: `D · ${skey}`,
        status: allOk ? "PASS" : "FAIL",
        details: allOk
          ? `Alle ${totalenPerJaar.length} jaartotalen binnen jaarbudget ${fmt(jaarlijksBudget)}.`
          : `Overschrijdingen: ${overruns.join("; ")}`,
      });
    }

    // === B. Verouderde bedragen in samenvatting / prioriteitAdvies ===
    const samenv = sc.samenvatting ?? "";
    const prio = sc.prioriteitAdvies ?? "";
    // Specifieke verouderde patronen:
    type Forbidden = { pattern: RegExp; reden: string };
    const forbidden: Forbidden[] = [];
    if (skey === "optimaal") {
      forbidden.push({ pattern: /1[\.,\s]?441[\.,\s]?000/, reden: "Verouderd optimaal-totaal '€ 1.441.000' (moet €1.490K)." });
    }
    if (skey === "optimaal" || skey === "plus20" || skey === "advies" || skey === "min20") {
      // Algemene 910K voor CRM in prioriteitAdvies: alleen relevant voor scenarios waar CRM ≠ 905K
      if (skey === "optimaal") {
        forbidden.push({ pattern: /910[\.,\s]?000/, reden: "Verouderd CRM-bedrag '€ 910.000' in optimaal (moet €1.095K)." });
      }
    }
    if (skey === "min20") {
      forbidden.push({ pattern: /87[\.,\s]?500\s*(?:euro|€)?\s*(?:structureel|\/jaar|per jaar)/i, reden: "Verouderd processen-structureel '€87.500/jaar' in min20 (moet €12.500/jaar)." });
    }

    const hits: string[] = [];
    for (const f of forbidden) {
      if (f.pattern.test(samenv)) hits.push(`samenvatting bevat: ${f.reden}`);
      if (f.pattern.test(prio)) hits.push(`prioriteitAdvies bevat: ${f.reden}`);
    }

    // Algemene scan: alle euro-bedragen in samenvatting + prio, vergelijken tegen actual scenario-totalen
    const allText = `${samenv}\n${prio}`;
    const eurosNoemd = Array.from(allText.matchAll(/€\s?([\d. ]+)(?:\s?(K|k|m|M))?/g))
      .map((m) => {
        const numStr = m[1].replace(/[. ]/g, "");
        const n = parseFloat(numStr);
        const suffix = (m[2] ?? "").toUpperCase();
        if (isNaN(n)) return null;
        if (suffix === "K") return n * 1000;
        if (suffix === "M") return n * 1_000_000;
        return n;
      })
      .filter((n): n is number => n != null && n >= 1000);

    // Detecteer bedragen ≥ 100K die niet matchen met scenario-totaal of inspannings-totalen.
    // Plus: legitiem in tekst zijn ook canonical motivatie-bedragen (€440K, €640K, €100K, €92.5K etc.)
    // — die verschijnen vaak als 'eenmalig €440-640K plus €92.500/jaar structureel' onderbouwing.
    const canonicalBedragen = new Set<number>([
      // CRM eenmalig + structureel
      440_000, 540_000, 640_000, 92_500, 63_000, 30_000,
      // Processen
      55_000, 70_000, 12_500,
      // Mens
      125_000, 160_000, 142_500, 52_000, 26_000, 10_000,
      // Cultuur
      33_000, 43_000, 37_500, 25_000,
      // Doel-totalen / sector-categorieën die in tekst kunnen staan
      100_000, 66_000,
    ]);
    const knownTotals = new Set<number>([
      totaalScen,
      expected.scenarioTotaal,
      bucketActual.crm,
      bucketActual.mens,
      bucketActual.processen,
      bucketActual.cultuur,
      jaarlijksBudget,
      ...canonicalBedragen,
      ...insps.flatMap((i) => [
        i.totaalEuro ?? 0,
        ...i.verdelingPerJaar.map((c) => c.euro),
      ]),
    ]);
    const verdacht: number[] = [];
    for (const e of eurosNoemd) {
      if (e < 100_000) continue; // alleen grote bedragen
      let known = false;
      for (const k of knownTotals) {
        if (k > 0 && Math.abs(e - k) / Math.max(k, 1) <= 0.04) {
          known = true;
          break;
        }
      }
      if (!known) verdacht.push(e);
    }
    const verdachtUnique = [...new Set(verdacht)];

    if (hits.length > 0 || verdachtUnique.length > 0) {
      sectieB.push({
        key: `B · ${skey}`,
        status: "FAIL",
        details: [
          hits.length > 0 ? `Specifieke verouderde patronen: ${hits.join(" | ")}` : "",
          verdachtUnique.length > 0
            ? `Verdachte (niet-gematchte) bedragen ≥ €100K in tekst: ${verdachtUnique.map((v) => fmt(v)).join(", ")}`
            : "",
        ]
          .filter(Boolean)
          .join(" — "),
      });
    } else {
      sectieB.push({
        key: `B · ${skey}`,
        status: "PASS",
        details: `Geen verouderde patronen gevonden, alle ${eurosNoemd.length} genoemde bedragen matchen met actual scenario-data.`,
      });
    }
  }

  // ----------------------- Sectie C: fase + activiteit consistency =====
  // Per inspanning (gegroepeerd op title + domein): voor elke fase die in 2+ scenario's voorkomt,
  // check of fase-naam en activiteit-tekst identiek is.
  const groupKey = (i: Insp) => `${i.domein}::${i.inspanningTitel}`;
  // Map: groupKey -> faseLabel -> Set<activiteitText>
  const inspGroups = new Map<string, Map<string, Set<string>>>();
  // Tel ook in hoeveel scenarios elke fase voorkomt
  const inspFaseCount = new Map<string, Map<string, number>>();

  for (const skey of scenarioKeys) {
    const sc = begroting.scenarios?.[skey];
    if (!sc) continue;
    for (const insp of sc.inspanningen ?? []) {
      const gk = groupKey(insp);
      if (!inspGroups.has(gk)) inspGroups.set(gk, new Map());
      if (!inspFaseCount.has(gk)) inspFaseCount.set(gk, new Map());
      const fmap = inspGroups.get(gk)!;
      const fcount = inspFaseCount.get(gk)!;
      // Per scenario: tel elke fase éénmaal (zelfs als die over meerdere jaren spreidt)
      const seenFasesInThisScen = new Set<string>();
      for (const cell of insp.verdelingPerJaar) {
        const fase = (cell.fase ?? "").trim();
        const act = (cell.activiteit ?? "").trim();
        if (!fase) continue;
        if (!fmap.has(fase)) fmap.set(fase, new Set());
        if (act) fmap.get(fase)!.add(act);
        seenFasesInThisScen.add(fase);
      }
      for (const f of seenFasesInThisScen) {
        fcount.set(f, (fcount.get(f) ?? 0) + 1);
      }
    }
  }

  for (const [gk, fmap] of inspGroups) {
    const fcount = inspFaseCount.get(gk)!;
    let allOk = true;
    const issues: string[] = [];
    for (const [fase, acts] of fmap) {
      const count = fcount.get(fase) ?? 0;
      if (count >= 2) {
        if (acts.size > 1) {
          allOk = false;
          issues.push(`fase "${fase}" (in ${count} scenarios): ${acts.size} verschillende activiteit-teksten → ${[...acts].map((a) => `"${a.slice(0, 80)}"`).join(" | ")}`);
        }
      }
    }
    sectieC.push({
      key: `C · ${gk}`,
      status: allOk ? "PASS" : "FAIL",
      details: allOk ? `Alle gedeelde fases hebben identieke activiteit-tekst.` : issues.join(" ; "),
    });
  }

  // ----------------------- output -----------------------
  function statusGlyph(s: string): string {
    return s === "PASS" ? "PASS" : s === "FAIL" ? "FAIL" : "WARN";
  }

  const md: string[] = [];
  md.push(`# AUDIT — End-to-end pass 3 (sessie d8b97442)`);
  md.push(``);
  md.push(`Datum: ${new Date().toISOString()}`);
  md.push(`Scope: §4.1 begroting — motivatie ↔ totalen ↔ tekst ↔ cap-respect`);
  md.push(``);
  md.push(`## Samenvatting per scenario`);
  md.push(``);
  md.push(`| Scenario | Jaren | Verwacht totaal | Actual totaal | Σ inspanningen | Status |`);
  md.push(`|---|---|---|---|---|---|`);
  for (const r of summaryTabel) {
    md.push(`| ${r.scenario} | ${r.aantalJaren} | ${fmt(r.verwachtTotaal)} | ${fmt(r.actualTotaal)} | ${fmt(r.somInsp)} | ${r.status} |`);
  }
  md.push(``);

  function renderSection(title: string, rows: SectionRow[]) {
    md.push(`## ${title}`);
    md.push(``);
    const failed = rows.filter((r) => r.status === "FAIL").length;
    const warn = rows.filter((r) => r.status === "WARN").length;
    const pass = rows.filter((r) => r.status === "PASS").length;
    md.push(`Totaal: ${rows.length} checks — PASS=${pass}, WARN=${warn}, FAIL=${failed}`);
    md.push(``);
    md.push(`| # | Check | Status | Details |`);
    md.push(`|---|---|---|---|`);
    rows.forEach((r, i) => {
      md.push(`| ${i + 1} | ${r.key} | ${r.status} | ${r.details.replace(/\|/g, "\\|")} |`);
    });
    md.push(``);
  }
  renderSection("Sectie A — motivatie-bedragen vs scenario-totalen", sectieA);
  renderSection("Sectie B — verouderde bedragen in samenvatting & prioriteitAdvies", sectieB);
  renderSection("Sectie C — fase + activiteit consistency over scenarios", sectieC);
  renderSection("Sectie D — cap-respect (jaartotalen ≤ jaarlijksBudgetEuro)", sectieD);

  // Eindoordeel
  function sectStat(rows: SectionRow[]): "PASS" | "FAIL" | "WARN" {
    if (rows.some((r) => r.status === "FAIL")) return "FAIL";
    if (rows.some((r) => r.status === "WARN")) return "WARN";
    return "PASS";
  }
  const a = sectStat(sectieA);
  const b = sectStat(sectieB);
  const c = sectStat(sectieC);
  const d = sectStat(sectieD);
  const overall = a === "PASS" && b === "PASS" && c === "PASS" && d === "PASS" ? "PASS"
    : (a === "FAIL" || b === "FAIL" || c === "FAIL" || d === "FAIL") ? "FAIL" : "WARN";

  md.push(`## EINDOORDEEL`);
  md.push(``);
  md.push(`- Sectie A (motivatie ↔ totalen): **${a}**`);
  md.push(`- Sectie B (samenvatting/prioriteitAdvies): **${b}**`);
  md.push(`- Sectie C (fase/activiteit consistency): **${c}**`);
  md.push(`- Sectie D (cap-respect): **${d}**`);
  md.push(``);
  md.push(`**Overall: ${overall}**`);
  md.push(``);
  md.push(`Go/no-go user-deploy: ${overall === "PASS" ? "GO" : overall === "WARN" ? "GO met kanttekeningen (zie WARN)" : "NO-GO — los FAIL-bevindingen op vóór deploy"}`);

  const outPath = join(process.cwd(), "AUDIT-e2e-pass3.md");
  writeFileSync(outPath, md.join("\n"), "utf-8");
  console.log(`\nRapport geschreven naar: ${outPath}`);

  // ---- Korte chat-rapportage (max 12 regels) ----
  console.log(`\n--- KORTE RAPPORTAGE ---`);
  console.log(`Sectie A (motivatie ↔ totalen):  ${statusGlyph(a)}`);
  console.log(`Sectie B (sam./prio. teksten):    ${statusGlyph(b)}`);
  console.log(`Sectie C (fase/activiteit consist):${statusGlyph(c)}`);
  console.log(`Sectie D (cap-respect):           ${statusGlyph(d)}`);
  for (const r of summaryTabel) {
    console.log(`  ${r.scenario.padEnd(8)} verwacht=${fmt(r.verwachtTotaal)}  actual=${fmt(r.actualTotaal)}  Σ=${fmt(r.somInsp)} → ${r.status}`);
  }
  // critical issues
  const criticals = [
    ...sectieA.filter((r) => r.status === "FAIL").slice(0, 2),
    ...sectieB.filter((r) => r.status === "FAIL").slice(0, 2),
    ...sectieC.filter((r) => r.status === "FAIL").slice(0, 1),
    ...sectieD.filter((r) => r.status === "FAIL").slice(0, 1),
  ];
  if (criticals.length > 0) {
    console.log(`Critical issues:`);
    for (const c of criticals) console.log(`  - ${c.key}: ${c.details.slice(0, 150)}`);
  }
  console.log(`Eindoordeel: ${overall} → ${overall === "PASS" ? "GO" : overall === "WARN" ? "GO m.k." : "NO-GO"}`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
