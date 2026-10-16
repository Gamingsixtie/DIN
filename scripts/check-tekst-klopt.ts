// Gerichte check: na de TEKST_ONLY-klik, kloppen de motivatie/samenvatting/
// prioriteitAdvies-velden? Vergelijk per scenario per inspanning:
//   1. Absolute jaartallen aanwezig? → fout
//   2. Looptijd-claims ('over X jaar', '× N jaar')? → fout
//   3. Verboden frasering ('Finance gedragen', 'formatie-kader',
//      'vervolgfinanciering')? → fout
//   4. Zwaartepunt-claim correct? → bereken top-2 jaren uit verdelingPerJaar
//      en vergelijk met positie-label in tekst
//   5. Eenmalig-bedrag claim correct? → match met dossier-mid (€650K CRM,
//      €87.500 processen, €142.500 mens, €122.500 cultuur)
//   6. Scenario-totaal claim correct? → match met som verdelingPerJaar

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
    const k = t.substring(0, e).trim();
    const v = t.substring(e + 1).trim().replace(/^["']|["']$/g, "");
    if (!process.env[k]) process.env[k] = v;
  }
}
loadEnvFile(join(process.cwd(), ".env.local"));

const supa = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
);

type Cell = { jaar: number; euro: number; fase: string; activiteit?: string };
type Insp = {
  inspanningTitel: string;
  domein: string;
  motivatie?: string;
  verdelingPerJaar: Cell[];
};
type Scen = {
  jaarlijksBudgetEuro?: number;
  aantalJaren?: number;
  startJaar?: number;
  inspanningen?: Insp[];
  samenvatting?: string;
  prioriteitAdvies?: string;
};

const sessionId = process.argv[2] ?? "d8b97442-ce8f-4134-b2c7-67dc8e3a3f93";

// REGEX-CHECKS — gebruikt voor automatische detectie van fouten
const ABSOLUTE_JAARTAL = /\b(20[2-3]\d)\b/g; // 2020-2039
const LOOPTIJD_CLAIM = /\b(over|in|gedurende)\s+(\d+)\s+jaar\b|\b(\d+)[- ]?jarig\b|×\s*\d+\s*jaar\b/gi;
const VERBODEN = [
  /Finance\s+(gedragen|gedragen worden|gedragen kan worden|drag\w*)/i,
  /\bformatie[-\s]?kader\b/i,
  /vervolgfinanciering/i,
  /\baanloop[- ]?fase\b/i,
  /buiten deze cyclus vall\w+/i,
];

// POSITIE-LABEL bepalen voor een gegeven top-2 jaren binnen looptijd
function positieLabel(top2Jaren: number[], startJ: number, aantalJaren: number): string {
  const eersteDerde = startJ + Math.floor(aantalJaren / 3);
  const tweedeDerde = startJ + Math.floor((2 * aantalJaren) / 3);
  const eindJ = startJ + aantalJaren - 1;
  const inEerste = top2Jaren.filter((j) => j < eersteDerde).length;
  const inMidden = top2Jaren.filter((j) => j >= eersteDerde && j < tweedeDerde).length;
  const inLaatste = top2Jaren.filter((j) => j >= tweedeDerde).length;
  if (inEerste === 2) return "vroeg in de looptijd";
  if (inLaatste === 2) {
    if (top2Jaren.every((j) => j === eindJ)) return "in het slotjaar";
    return "in de achterste derde van de looptijd";
  }
  if (inMidden === 2) return "rond het midden van de looptijd";
  if (inEerste === 1 && inLaatste === 1) return "zowel vroeg als laat in de looptijd";
  if (inEerste === 1 && inMidden === 1) return "in de eerste helft van de looptijd";
  if (inMidden === 1 && inLaatste === 1) return "in de tweede helft van de looptijd";
  return "verspreid over de looptijd";
}

const DOSSIER_EENMALIG_MID: Record<string, number> = {
  data_systemen: 650000,
  processen: 87500,
  mens: 142500,
  cultuur: 122500,
};

const DOMAIN_LABEL: Record<string, string> = {
  data_systemen: "DATA & SYSTEMEN",
  processen: "PROCESSEN",
  mens: "MENS",
  cultuur: "CULTUUR",
};

function eurof(n: number): string {
  return `€${(n ?? 0).toLocaleString("nl-NL")}`;
}

async function main() {
  const { data, error } = await supa
    .from("din_sessions")
    .select("data, updated_at")
    .eq("id", sessionId)
    .maybeSingle();
  if (error || !data) {
    console.error(error?.message ?? "not found");
    process.exit(1);
  }
  const s = data.data as Record<string, unknown>;
  const wiz = s.crossAnalyseWizard as
    | { stepResults?: Record<string, Record<string, unknown>> }
    | undefined;
  const begroting = wiz?.stepResults?.stap4?.begrotingAdvies as
    | { startJaar?: number; scenarios?: Record<string, Scen | null>; tekstenSchoon?: boolean }
    | undefined;
  if (!begroting?.scenarios) {
    console.error("Geen begrotingAdvies");
    process.exit(1);
  }

  console.log("═".repeat(80));
  console.log("CHECK — kloppen de tekstvelden na de TEKST_ONLY-klik?");
  console.log("═".repeat(80));
  console.log(`Sessie: ${sessionId}`);
  console.log(`Versie: v${(s as { version?: number }).version}`);
  console.log(`Laatst opgeslagen: ${data.updated_at}`);
  console.log(`tekstenSchoon-vlag: ${begroting.tekstenSchoon}`);
  console.log();

  const startJ = begroting.startJaar ?? 2026;
  const scenarioKeys = ["optimaal", "plus20", "min20", "advies"] as const;
  let totaalChecks = 0;
  let totaalFouten = 0;

  type Verdict = { tekst: string; fouten: string[] };

  for (const skey of scenarioKeys) {
    const sc = begroting.scenarios?.[skey];
    if (!sc) continue;
    const aantalJaren = sc.aantalJaren ?? 1;
    const eindJ = startJ + aantalJaren - 1;

    console.log("─".repeat(80));
    console.log(`▌ ${skey.toUpperCase()}  (${aantalJaren} jaar — periode ${startJ}–${eindJ})`);
    console.log("─".repeat(80));

    function checkTekst(tekst: string, context: string, expectedZwaartepuntLabel?: string): Verdict {
      const fouten: string[] = [];
      // 1. Absolute jaartallen
      const jrs = [...tekst.matchAll(ABSOLUTE_JAARTAL)].map((m) => parseInt(m[1], 10));
      const jrsBuitenDossier = jrs.filter((j) => j >= 2020 && j <= 2039);
      if (jrsBuitenDossier.length > 0) {
        fouten.push(`Absolute jaartallen gevonden: ${[...new Set(jrsBuitenDossier)].join(", ")}`);
      }
      // 2. Looptijd-claim
      const looptijdMatches = [...tekst.matchAll(LOOPTIJD_CLAIM)];
      if (looptijdMatches.length > 0) {
        fouten.push(`Looptijd-claim gevonden: ${looptijdMatches.map((m) => m[0]).join(", ")}`);
      }
      // 3. Verboden frasering
      for (const re of VERBODEN) {
        const m = tekst.match(re);
        if (m) fouten.push(`Verboden frasering: "${m[0]}"`);
      }
      // 4. Zwaartepunt-label match
      if (expectedZwaartepuntLabel) {
        // Alleen relevant voor inspanning-motivatie. Check of TEKST een
        // zwaartepunt-uitspraak bevat en of die overeenkomt met expected.
        const zwaartepunt = tekst.match(/zwaartepunt[^.]*?\./i);
        if (zwaartepunt) {
          const lower = zwaartepunt[0].toLowerCase();
          const expectedLower = expectedZwaartepuntLabel.toLowerCase();
          // Zoek of een van de keywords uit het verwachte label voorkomt
          const keywords = expectedLower.split(/\s+/).filter((w) => w.length > 4);
          const overlap = keywords.filter((kw) => lower.includes(kw));
          if (overlap.length === 0) {
            fouten.push(
              `Zwaartepunt-claim ("${zwaartepunt[0].trim().slice(0, 80)}") matcht niet met server-berekend label "${expectedZwaartepuntLabel}".`,
            );
          }
        }
      }
      return { tekst: context, fouten };
    }

    function dumpVerdict(v: Verdict) {
      totaalChecks++;
      if (v.fouten.length === 0) {
        console.log(`  ✅ ${v.tekst}`);
      } else {
        totaalFouten++;
        console.log(`  ❌ ${v.tekst}`);
        for (const f of v.fouten) console.log(`     - ${f}`);
      }
    }

    // SAMENVATTING
    if (sc.samenvatting) {
      console.log(`\n[SAMENVATTING] "${sc.samenvatting.slice(0, 200)}${sc.samenvatting.length > 200 ? "…" : ""}"`);
      dumpVerdict(checkTekst(sc.samenvatting, "Samenvatting", undefined));
    }

    // PRIORITEITADVIES
    if (sc.prioriteitAdvies) {
      console.log(`\n[PRIORITEITADVIES] (${sc.prioriteitAdvies.length} chars)`);
      dumpVerdict(checkTekst(sc.prioriteitAdvies, "PrioriteitAdvies", undefined));
    }

    // MOTIVATIES PER INSPANNING
    console.log("\n[MOTIVATIES PER INSPANNING]");
    for (const insp of sc.inspanningen ?? []) {
      // Bereken werkelijk top-2 zwaartepunt
      const sorted = [...insp.verdelingPerJaar].sort((a, b) => (b.euro ?? 0) - (a.euro ?? 0));
      const top2 = sorted.slice(0, 2).filter((c) => (c.euro ?? 0) > 0);
      const top2Jaren = top2.map((c) => c.jaar).sort((a, b) => a - b);
      const totaal = insp.verdelingPerJaar.reduce((s, c) => s + (c.euro ?? 0), 0);
      const top2Pct = top2.map((c) => (totaal > 0 ? Math.round(((c.euro ?? 0) / totaal) * 100) : 0));
      const expectedLabel = positieLabel(top2Jaren, startJ, aantalJaren);

      console.log(`\n  ▸ [${DOMAIN_LABEL[insp.domein]}] ${insp.inspanningTitel}`);
      console.log(`    Top-2 jaren (uit verdelingPerJaar): ${top2Jaren.join(" + ")} (${top2Pct.join("% + ")}%)`);
      console.log(`    Verwacht positie-label (server-berekend): "${expectedLabel}"`);
      console.log(`    Scenario-totaal van deze inspanning: ${eurof(totaal)}`);
      console.log(`    Motivatie-tekst: "${(insp.motivatie ?? "").slice(0, 200)}${(insp.motivatie ?? "").length > 200 ? "…" : ""}"`);

      const motivatieFouten: string[] = [];
      const tekst = insp.motivatie ?? "";

      // Standaard regex-checks
      const r = checkTekst(tekst, "", expectedLabel);
      motivatieFouten.push(...r.fouten);

      // Eenmalig-bedrag check
      const eenmaligMid = DOSSIER_EENMALIG_MID[insp.domein];
      const eenmaligMatch = tekst.match(/eenmalig[^.]*?€\s*([\d.,]+)\s*([KkMm])?/i);
      if (eenmaligMatch && eenmaligMid) {
        const cleaned = eenmaligMatch[1].replace(/[€\s.]/g, "").replace(",", ".");
        let claim = parseFloat(cleaned);
        if (eenmaligMatch[2] && /[Kk]/.test(eenmaligMatch[2])) claim *= 1000;
        if (eenmaligMatch[2] && /[Mm]/.test(eenmaligMatch[2])) claim *= 1_000_000;
        if (Number.isFinite(claim) && Math.abs(claim - eenmaligMid) / eenmaligMid > 0.25) {
          motivatieFouten.push(
            `Eenmalig-claim € ${claim.toLocaleString("nl-NL")} wijkt >25% af van dossier-mid € ${eenmaligMid.toLocaleString("nl-NL")}.`,
          );
        }
      }

      // Scenario-totaal claim check (alleen als het LETTERLIJK staat in tekst)
      const totaalClaim = tekst.match(/dossier[- ]totaal[^.]*?€\s*([\d.,]+)\s*([KkMm])?/i);
      if (totaalClaim) {
        const cleaned = totaalClaim[1].replace(/[€\s.]/g, "").replace(",", ".");
        let claim = parseFloat(cleaned);
        if (totaalClaim[2] && /[Kk]/.test(totaalClaim[2])) claim *= 1000;
        if (totaalClaim[2] && /[Mm]/.test(totaalClaim[2])) claim *= 1_000_000;
        if (Number.isFinite(claim) && Math.abs(claim - totaal) / Math.max(totaal, 1) > 0.05) {
          motivatieFouten.push(
            `Scenario-totaal claim ${eurof(claim)} wijkt >5% af van werkelijk scenario-totaal ${eurof(totaal)}.`,
          );
        }
      }

      totaalChecks++;
      if (motivatieFouten.length === 0) {
        console.log(`    ✅ Motivatie klopt`);
      } else {
        totaalFouten++;
        console.log(`    ❌ Motivatie heeft ${motivatieFouten.length} probleem(en):`);
        for (const f of motivatieFouten) console.log(`       - ${f}`);
      }
    }

    console.log();
  }

  console.log("═".repeat(80));
  console.log(`EINDRESULTAAT: ${totaalChecks - totaalFouten}/${totaalChecks} checks geslaagd`);
  if (totaalFouten === 0) {
    console.log("✅ Alle tekst-velden kloppen — TEKST_ONLY-klik heeft volledig gewerkt.");
  } else {
    console.log(`❌ ${totaalFouten} probleem(en) gevonden. Detail per scenario hierboven.`);
  }
  console.log("═".repeat(80));
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
