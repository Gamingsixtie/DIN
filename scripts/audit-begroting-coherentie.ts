// Audit: per scenario per inspanning per jaar - resoneren fase + activiteit met het bedrag?
// Inputs: één sessie-id (default = laatste sessie met begroting).
// Output: rapport met per (scenario × inspanning × jaar):
//   - euro
//   - percentage van inspannings-totaal
//   - fase-label
//   - activiteit-tekst
//   - DETECTIES van inconsistenties:
//      * placeholder-tekst van server-guards ("Opschaling en verdere uitrol",
//        "Verankering en duurzame borging", "Parallelle start in jaar 1")
//      * "scoping"/"voorbereiding"/"kick-off" terwijl euro hoog is (>30% van totaal)
//      * "uitrol"/"realisatie"/"opschaling" terwijl euro laag is (<10% van totaal)
//      * "borging"/"verankering"/"nazorg" maar NIET in laatste jaar
//      * Activiteit verwijst naar specifiek jaartal dat NIET klopt
//      * Lege/missende fase of activiteit
//      * Bedrag hoger dan 100% van jaarlijksBudgetEuro (wijst op guard-shift)

import { createClient } from "@supabase/supabase-js";
import { readFileSync, existsSync } from "fs";
import { join } from "path";

function loadEnvFile(path: string) {
  if (!existsSync(path)) return;
  const content = readFileSync(path, "utf-8");
  for (const line of content.split(/\r?\n/)) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const eq = trimmed.indexOf("=");
    if (eq === -1) continue;
    const key = trimmed.substring(0, eq).trim();
    const val = trimmed.substring(eq + 1).trim().replace(/^["']|["']$/g, "");
    if (!process.env[key]) process.env[key] = val;
  }
}
loadEnvFile(join(process.cwd(), ".env.local"));

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
const sessionId = process.argv[2] ?? "d8b97442-..."; // overschrijf met cli arg

const supa = createClient(SUPABASE_URL, KEY);

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
};

const PLACEHOLDER_PATTERNS = [
  { pattern: /^Opschaling en verdere uitrol van het traject\.?$/i, label: "VOL-BUDGET-GUARD placeholder (mid-fase)" },
  { pattern: /^Verankering en duurzame borging van het resultaat\.?$/i, label: "OVER-BUDGET-GUARD placeholder (eind-fase)" },
  { pattern: /^Parallelle start in jaar 1 — scoping en voorbereiding\.?$/i, label: "PARALLEL-GUARD placeholder (jaar 1)" },
];

const VOORBEREIDING_KEYWORDS = /\b(scoping|kick[- ]?off|voorbereiding|behoeftestelling|inventarisatie|analyse|leverancier-?selectie|architectuur(?:keuze)?|ontwerp(?: \(architectuur\))?|bewustwording|urgentiebesef)\b/i;
const UITROL_KEYWORDS = /\b(uitrol|realisatie|implementatie|opschaling|vaardigheidstraining|adoptie|bouw)\b/i;
const BORGING_KEYWORDS = /\b(borging|verankering|nazorg|standaardisatie|in beheer|continu verbeteren)\b/i;

async function main() {
  const { data, error } = await supa.from("din_sessions").select("data").eq("id", sessionId).maybeSingle();
  if (error || !data) { console.error(error?.message ?? "not found"); process.exit(1); }
  const s = data.data as Record<string, unknown>;
  const wiz = s.crossAnalyseWizard as { stepResults?: Record<string, Record<string, unknown>> } | undefined;
  const begroting = wiz?.stepResults?.stap4?.begrotingAdvies as
    | { startJaar?: number; scenarios?: Record<string, Scen | null> }
    | undefined;
  if (!begroting?.scenarios) {
    console.error("Geen begrotingAdvies in deze sessie.");
    process.exit(1);
  }
  const startJaar = begroting.startJaar ?? 2026;

  const scenarioKeys = ["optimaal", "plus20", "min20", "advies"] as const;
  const findings: { key: string; severity: "hard" | "zacht" | "info"; msg: string }[] = [];

  for (const skey of scenarioKeys) {
    const sc = begroting.scenarios?.[skey];
    if (!sc) continue;
    const aantalJaren = sc.aantalJaren ?? 1;
    const eindJaar = startJaar + aantalJaren - 1;
    const jaarlijksBudget = sc.jaarlijksBudgetEuro ?? 0;
    const insps = sc.inspanningen ?? [];

    console.log(`\n${"=".repeat(80)}`);
    console.log(`SCENARIO: ${skey}  (${aantalJaren} jaar, €${jaarlijksBudget.toLocaleString("nl-NL")}/jaar)`);
    console.log(`Periode: ${startJaar}–${eindJaar}`);
    console.log("=".repeat(80));

    for (const insp of insps) {
      const totaal = insp.totaalEuro ?? insp.verdelingPerJaar.reduce((a, b) => a + (b.euro ?? 0), 0);
      console.log(`\n[${insp.domein}] ${insp.inspanningTitel}  — totaal €${totaal.toLocaleString("nl-NL")}`);
      const sorted = [...insp.verdelingPerJaar].sort((a, b) => a.jaar - b.jaar);
      for (const c of sorted) {
        const pct = totaal > 0 ? Math.round(((c.euro ?? 0) / totaal) * 100) : 0;
        const eursStr = `€${(c.euro ?? 0).toLocaleString("nl-NL")}`.padStart(11);
        const pctStr = `${pct}%`.padStart(4);
        const fase = (c.fase ?? "").trim();
        const act = (c.activiteit ?? "").trim();
        console.log(`  ${c.jaar}  ${eursStr}  ${pctStr}  fase="${fase || "—"}"`);
        console.log(`           activiteit: ${act || "—"}`);

        const ctxKey = `${skey} · ${insp.inspanningTitel} · ${c.jaar}`;

        // 1. Placeholder-detectie (server-guard schreef de tekst)
        for (const pp of PLACEHOLDER_PATTERNS) {
          if (pp.pattern.test(act)) {
            findings.push({
              key: ctxKey,
              severity: "hard",
              msg: `Placeholder-tekst (${pp.label}) — server-guard heeft hier geld gestopt zonder dat AI/dossier dit beschreef. Activiteit zegt niets specifieks over wat het bedrag dekt.`,
            });
          }
        }

        // 2. Lege fase/activiteit
        if (!fase) findings.push({ key: ctxKey, severity: "hard", msg: "Lege fase-label." });
        if (!act) findings.push({ key: ctxKey, severity: "hard", msg: "Lege activiteit-tekst." });

        // 3. Hoge euro maar 'voorbereiding'-taal in fase OF activiteit
        if (pct >= 30 && (VOORBEREIDING_KEYWORDS.test(fase) || VOORBEREIDING_KEYWORDS.test(act))) {
          findings.push({
            key: ctxKey,
            severity: "hard",
            msg: `Bedrag is ${pct}% van inspannings-totaal (€${(c.euro ?? 0).toLocaleString("nl-NL")}) maar fase/activiteit ademt "voorbereiding" (scoping/kick-off/analyse). Disproportie tussen tekst en geld.`,
          });
        }

        // 4. Lage euro maar 'uitrol/opschaling'-taal
        if (pct > 0 && pct <= 10 && (UITROL_KEYWORDS.test(fase) || UITROL_KEYWORDS.test(act))) {
          findings.push({
            key: ctxKey,
            severity: "zacht",
            msg: `Bedrag is slechts ${pct}% (€${(c.euro ?? 0).toLocaleString("nl-NL")}) maar fase/activiteit zegt "uitrol/opschaling/realisatie". Disproportie.`,
          });
        }

        // 5. Borging/verankering maar NIET in laatste jaar
        const isLaatst = c.jaar === eindJaar;
        if (!isLaatst && (BORGING_KEYWORDS.test(fase) || BORGING_KEYWORDS.test(act))) {
          findings.push({
            key: ctxKey,
            severity: "zacht",
            msg: `Fase/activiteit gebruikt "borging/verankering/nazorg" maar dit is jaar ${c.jaar}, eindjaar = ${eindJaar}. Borging hoort doorgaans in slotjaar.`,
          });
        }

        // 6. Activiteit verwijst expliciet naar een ander jaartal
        const yearMatch = act.match(/\b(20\d{2})\b/g);
        if (yearMatch) {
          const refs = yearMatch.map(Number).filter((y) => y !== c.jaar && y >= startJaar && y <= eindJaar);
          if (refs.length > 0) {
            findings.push({
              key: ctxKey,
              severity: "info",
              msg: `Activiteit-tekst noemt jaartal(len) ${refs.join(", ")} maar staat in jaarcel ${c.jaar}. Mogelijk verschoven door guard.`,
            });
          }
        }

        // 7. Cell euro > 100% van jaarlijks budget — hoogst onwaarschijnlijk maar geeft signaal
        if (jaarlijksBudget > 0 && (c.euro ?? 0) > jaarlijksBudget) {
          findings.push({
            key: ctxKey,
            severity: "hard",
            msg: `Eén inspanning trekt €${(c.euro ?? 0).toLocaleString("nl-NL")} dit jaar (> hele jaarbudget €${jaarlijksBudget.toLocaleString("nl-NL")}).`,
          });
        }
      }
    }

    // 8. Som per jaar vs jaarlijks budget — moet ≤ jaarlijksBudget
    const totalenPerJaar = sc.totalenPerJaar ?? [];
    console.log("\nTotalen per jaar (vs jaarlijks budget):");
    for (const t of totalenPerJaar) {
      const benutting = jaarlijksBudget > 0 ? Math.round((t.euro / jaarlijksBudget) * 100) : 0;
      const flag = t.euro > jaarlijksBudget ? "  <-- OVER BUDGET" : benutting < 70 ? "  (laag)" : "";
      console.log(`  ${t.jaar}  €${t.euro.toLocaleString("nl-NL")}  (${benutting}% van jaarbudget)${flag}`);
      if (t.euro > jaarlijksBudget) {
        findings.push({
          key: `${skey} · jaar ${t.jaar} totaal`,
          severity: "hard",
          msg: `Jaartotaal (€${t.euro.toLocaleString("nl-NL")}) overschrijdt jaarlijks budget (€${jaarlijksBudget.toLocaleString("nl-NL")}).`,
        });
      }
    }
  }

  console.log("\n" + "=".repeat(80));
  console.log(`AUDIT-RESULTAAT: ${findings.length} bevindingen`);
  console.log("=".repeat(80));

  const hard = findings.filter((f) => f.severity === "hard");
  const zacht = findings.filter((f) => f.severity === "zacht");
  const info = findings.filter((f) => f.severity === "info");

  console.log(`\nHARDE bevindingen (${hard.length}):`);
  for (const f of hard) console.log(`  ✗ ${f.key}\n    ${f.msg}`);
  console.log(`\nZACHTE bevindingen (${zacht.length}):`);
  for (const f of zacht) console.log(`  ! ${f.key}\n    ${f.msg}`);
  console.log(`\nINFO (${info.length}):`);
  for (const f of info) console.log(`  i ${f.key}\n    ${f.msg}`);
}

main().catch((e) => { console.error(e); process.exit(1); });
