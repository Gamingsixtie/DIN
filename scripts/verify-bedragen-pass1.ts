/**
 * verify-bedragen-pass1.ts
 *
 * READ-ONLY verificatie van bedragen-correctheid in §4.1 begroting
 * voor DIN sessie d8b97442.
 *
 * Per scenario:
 *  1. Per jaar: Σ inspanningen[].verdelingPerJaar[i].euro waar jaar=startJaar+i  ==  totalenPerJaar[i].euro
 *  2. Σ totalenPerJaar[].euro  ==  scenario.totaalGeraamdEuro
 *  3. Geen jaar overschrijdt scenario.jaarlijksBudgetEuro
 *  4. Per inspanning: Σ verdelingPerJaar[].euro  ==  inspanning.totaalEuro
 *
 * Output:
 *  - Console: korte pass/fail summary + critical issues
 *  - File: AUDIT-bedragen-pass1.md
 */
import { createClient } from "@supabase/supabase-js";
import { readFileSync, existsSync, writeFileSync } from "fs";
import { join } from "path";

const SESSION_ID = "d8b97442-ce8f-4134-b2c7-67dc8e3a3f93";
const TOLERANCE = 1; // €1 tolerance for rounding

// ─── Verwachte targets ────────────────────────────────────────────────
const EXPECTED: Record<string, { cap: number; totaal: number }> = {
  advies: { cap: 341_000, totaal: 1_159_000 },
  plus20: { cap: 300_000, totaal: 1_270_000 },
  optimaal: { cap: 250_000, totaal: 1_490_000 },
  min20: { cap: 200_000, totaal: 1_819_500 }, // backup-data laat 1.819.500 zien
};

function loadEnvFile(p: string) {
  if (!existsSync(p)) return;
  const c = readFileSync(p, "utf-8");
  for (const l of c.split(/\r?\n/)) {
    const t = l.trim();
    if (!t || t.startsWith("#")) continue;
    const e = t.indexOf("=");
    if (e === -1) continue;
    process.env[t.substring(0, e).trim()] = t
      .substring(e + 1)
      .trim()
      .replace(/^["']|["']$/g, "");
  }
}
loadEnvFile(join(process.cwd(), ".env.local"));

type VerdelingItem = { jaar: number; euro: number };
type Inspanning = {
  inspanningTitel: string;
  domein: string;
  totaalEuro?: number;
  verdelingPerJaar?: VerdelingItem[];
};
type TotaalPerJaar = { jaar: number; euro: number; percentage?: number };
type Scenario = {
  scenarioLabel?: string;
  jaarlijksBudgetEuro?: number;
  aantalJaren?: number;
  totaalGeraamdEuro?: number;
  inspanningen?: Inspanning[];
  totalenPerJaar?: TotaalPerJaar[];
};

type CheckResult = { pass: boolean; label: string; detail?: string };

function fmt(n: number): string {
  return `€ ${Math.round(n).toLocaleString("nl-NL")}`;
}

function nearEq(a: number, b: number, tol = TOLERANCE): boolean {
  return Math.abs(a - b) <= tol;
}

function verifyScenario(
  key: string,
  sc: Scenario,
  startJaar: number,
): { results: CheckResult[]; perJaar: { jaar: number; sumInsp: number; totaal: number }[] } {
  const results: CheckResult[] = [];
  const aantalJaren = sc.aantalJaren ?? 0;
  const cap = sc.jaarlijksBudgetEuro ?? 0;
  const totaalGeraamd = sc.totaalGeraamdEuro ?? 0;
  const inspanningen = sc.inspanningen ?? [];
  const totalenPerJaar = sc.totalenPerJaar ?? [];

  // ── Target check
  const exp = EXPECTED[key];
  if (exp) {
    results.push({
      pass: nearEq(cap, exp.cap),
      label: `target.cap`,
      detail: `verwacht ${fmt(exp.cap)}, gevonden ${fmt(cap)}`,
    });
    results.push({
      pass: nearEq(totaalGeraamd, exp.totaal),
      label: `target.totaal`,
      detail: `verwacht ${fmt(exp.totaal)}, gevonden ${fmt(totaalGeraamd)}`,
    });
  }

  // ── Check 1: Per jaar Σ inspanningen.verdelingPerJaar == totalenPerJaar[i].euro
  const perJaarRows: { jaar: number; sumInsp: number; totaal: number }[] = [];
  for (let i = 0; i < aantalJaren; i++) {
    const jaar = startJaar + i;
    let sumInsp = 0;
    for (const insp of inspanningen) {
      const v = (insp.verdelingPerJaar ?? []).find((vv) => vv.jaar === jaar);
      if (v) sumInsp += v.euro;
    }
    const tot = totalenPerJaar.find((t) => t.jaar === jaar);
    const totaalEuro = tot?.euro ?? 0;
    perJaarRows.push({ jaar, sumInsp, totaal: totaalEuro });
    results.push({
      pass: nearEq(sumInsp, totaalEuro),
      label: `check1.jaar=${jaar}`,
      detail: `Σ inspanningen=${fmt(sumInsp)}, totalenPerJaar=${fmt(totaalEuro)}, drift=${fmt(sumInsp - totaalEuro)}`,
    });
  }

  // ── Check 2: Σ totalenPerJaar == totaalGeraamd
  const sumTotalen = totalenPerJaar.reduce((a, b) => a + (b.euro ?? 0), 0);
  results.push({
    pass: nearEq(sumTotalen, totaalGeraamd),
    label: `check2.somTotalen`,
    detail: `Σ totalenPerJaar=${fmt(sumTotalen)}, totaalGeraamdEuro=${fmt(totaalGeraamd)}, drift=${fmt(sumTotalen - totaalGeraamd)}`,
  });

  // Bonus: Σ alle inspanningen.totaalEuro == totaalGeraamd
  const sumInspTotaal = inspanningen.reduce((a, b) => a + (b.totaalEuro ?? 0), 0);
  results.push({
    pass: nearEq(sumInspTotaal, totaalGeraamd),
    label: `check2b.somInspanningenTotaal`,
    detail: `Σ inspanningen.totaalEuro=${fmt(sumInspTotaal)}, totaalGeraamdEuro=${fmt(totaalGeraamd)}, drift=${fmt(sumInspTotaal - totaalGeraamd)}`,
  });

  // ── Check 3: Geen jaar > cap
  for (const row of perJaarRows) {
    results.push({
      pass: row.totaal <= cap + TOLERANCE,
      label: `check3.cap.jaar=${row.jaar}`,
      detail: `${fmt(row.totaal)} ${row.totaal <= cap + TOLERANCE ? "≤" : ">"} cap ${fmt(cap)}`,
    });
  }

  // ── Check 4: Per inspanning: Σ verdeling == totaalEuro
  for (const insp of inspanningen) {
    const sumVerd = (insp.verdelingPerJaar ?? []).reduce((a, b) => a + b.euro, 0);
    const tot = insp.totaalEuro ?? 0;
    results.push({
      pass: nearEq(sumVerd, tot),
      label: `check4.[${insp.domein}] ${insp.inspanningTitel.slice(0, 40)}`,
      detail: `Σ verdeling=${fmt(sumVerd)}, totaalEuro=${fmt(tot)}, drift=${fmt(sumVerd - tot)}`,
    });
  }

  return { results, perJaar: perJaarRows };
}

async function main() {
  const s = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
  );
  const { data, error } = await s
    .from("din_sessions")
    .select("data")
    .eq("id", SESSION_ID)
    .maybeSingle();
  if (error) throw error;
  if (!data) throw new Error("Sessie niet gevonden");

  const sess = data.data as Record<string, unknown>;
  const wiz = sess.crossAnalyseWizard as Record<string, unknown> | undefined;
  const stap4 = (wiz?.stepResults as Record<string, unknown> | undefined)?.stap4 as
    | Record<string, unknown>
    | undefined;
  const beg = stap4?.begrotingAdvies as
    | { startJaar?: number; scenarios?: Record<string, Scenario> }
    | undefined;

  if (!beg) throw new Error("begrotingAdvies niet gevonden");

  const startJaar = beg.startJaar ?? 2026;
  const scenarios = beg.scenarios ?? {};

  const md: string[] = [];
  md.push(`# AUDIT — Bedragen Pass 1 (§4.1 Begroting)`);
  md.push("");
  md.push(`**Sessie:** ${SESSION_ID}`);
  md.push(`**Start­jaar:** ${startJaar}`);
  md.push(`**Tolerantie:** ±€${TOLERANCE} (afronding)`);
  md.push(`**Datum:** ${new Date().toISOString().slice(0, 10)}`);
  md.push("");
  md.push("## Verwachte targets");
  md.push("");
  md.push("| Scenario | Cap (verwacht) | Totaal (verwacht) |");
  md.push("|---|---|---|");
  for (const [k, v] of Object.entries(EXPECTED)) {
    md.push(`| ${k} | ${fmt(v.cap)} | ${fmt(v.totaal)} |`);
  }
  md.push("");

  let allPass = true;
  const summary: Record<string, { pass: number; fail: number; failures: CheckResult[] }> = {};

  // Order
  const order = ["advies", "plus20", "optimaal", "min20"];
  for (const key of order) {
    const sc = scenarios[key];
    if (!sc) {
      md.push(`## ${key.toUpperCase()} — SCENARIO ONTBREEKT ❌`);
      md.push("");
      allPass = false;
      summary[key] = { pass: 0, fail: 1, failures: [{ pass: false, label: "scenario.ontbreekt" }] };
      continue;
    }

    md.push(`## ${key.toUpperCase()}`);
    md.push("");
    md.push(
      `- Aantal jaren: **${sc.aantalJaren}**`,
    );
    md.push(`- Cap: **${fmt(sc.jaarlijksBudgetEuro ?? 0)}/jaar**`);
    md.push(`- Totaal geraamd: **${fmt(sc.totaalGeraamdEuro ?? 0)}**`);
    md.push("");

    const { results, perJaar } = verifyScenario(key, sc, startJaar);
    const passes = results.filter((r) => r.pass).length;
    const fails = results.filter((r) => !r.pass);
    summary[key] = { pass: passes, fail: fails.length, failures: fails };
    if (fails.length > 0) allPass = false;

    md.push(
      `**Result:** ${fails.length === 0 ? "✓ ALL PASS" : `❌ ${fails.length} FAIL`} (${passes}/${results.length} checks)`,
    );
    md.push("");

    md.push("### Per-jaar overzicht");
    md.push("");
    md.push("| Jaar | Σ inspanningen | totalenPerJaar | Drift | Cap | Status |");
    md.push("|---|---|---|---|---|---|");
    const cap = sc.jaarlijksBudgetEuro ?? 0;
    for (const r of perJaar) {
      const drift = r.sumInsp - r.totaal;
      const overCap = r.totaal > cap + TOLERANCE;
      const driftOk = nearEq(r.sumInsp, r.totaal);
      const status = driftOk && !overCap ? "✓" : "❌";
      md.push(
        `| ${r.jaar} | ${fmt(r.sumInsp)} | ${fmt(r.totaal)} | ${fmt(drift)} | ${fmt(cap)} | ${status} |`,
      );
    }
    md.push("");

    if (fails.length > 0) {
      md.push("### Failures");
      md.push("");
      for (const f of fails) {
        md.push(`- ❌ **${f.label}** — ${f.detail ?? ""}`);
      }
      md.push("");
    }

    md.push("### Alle checks");
    md.push("");
    for (const r of results) {
      md.push(`- ${r.pass ? "✓" : "❌"} \`${r.label}\` — ${r.detail ?? ""}`);
    }
    md.push("");
  }

  md.push("## Eindoordeel");
  md.push("");
  if (allPass) {
    md.push("**✓ Alle bedragen kloppen** — geen drift gevonden in alle vier scenario's.");
  } else {
    md.push("**❌ Issues gevonden** — zie failures hierboven.");
    md.push("");
    md.push("### Samenvatting per scenario");
    md.push("");
    md.push("| Scenario | Pass | Fail |");
    md.push("|---|---|---|");
    for (const [k, v] of Object.entries(summary)) {
      md.push(`| ${k} | ${v.pass} | ${v.fail} |`);
    }
  }
  md.push("");

  const outPath = join(process.cwd(), "AUDIT-bedragen-pass1.md");
  writeFileSync(outPath, md.join("\n"), "utf-8");

  // ─── Console summary
  console.log(`\n══ Bedragen Pass 1 — sessie ${SESSION_ID.slice(0, 8)} ══\n`);
  for (const key of order) {
    const v = summary[key];
    if (!v) continue;
    const status = v.fail === 0 ? "✓ PASS" : `❌ FAIL (${v.fail})`;
    console.log(`  ${key.padEnd(10)} ${status} — ${v.pass}/${v.pass + v.fail} checks`);
  }
  console.log("");
  if (!allPass) {
    console.log("Critical issues:");
    for (const [k, v] of Object.entries(summary)) {
      for (const f of v.failures.slice(0, 3)) {
        console.log(`  [${k}] ${f.label}: ${f.detail ?? ""}`);
      }
    }
    console.log("");
  }
  console.log(`Eindoordeel: ${allPass ? "✓ alle bedragen kloppen" : "❌ issues gevonden"}`);
  console.log(`Rapport: ${outPath}\n`);
}

void main();
