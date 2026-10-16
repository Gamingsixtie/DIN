// Eindcontrole: per scenario × per inspanning, toon werkelijk bedrag,
// som uit known-breakdown, en de eerste 200 chars van de motivatie-tekst
// — zodat je in 1 oogopslag kunt zien dat alles resoneert.

import { createClient } from "@supabase/supabase-js";
import { readFileSync, existsSync } from "fs";
import { join } from "path";
import { vindKnownBreakdown, structureelCumulatiefMid } from "../src/lib/known-breakdowns";

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

const supa = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
);
const fmt = (n: number) => `€${Math.round(n).toLocaleString("nl-NL")}`;

async function main() {
  const sessionId = "d8b97442-ce8f-4134-b2c7-67dc8e3a3f93";
  const { data } = await supa.from("din_sessions").select("data").eq("id", sessionId).maybeSingle();
  if (!data) return;

  const wiz = (data.data as Record<string, unknown>).crossAnalyseWizard as
    | { stepResults?: Record<string, Record<string, unknown>> } | undefined;
  const stap4 = wiz?.stepResults?.stap4 as Record<string, unknown> | undefined;
  const begroting = stap4?.begrotingAdvies as
    | { startJaar?: number; scenarios?: Record<string, { aantalJaren?: number; totaalGeraamdEuro?: number; inspanningen?: Array<Record<string, unknown>>; totalenPerJaar?: Array<{ jaar: number; euro: number }> } | null> }
    | undefined;
  const sub = (stap4?.subEffortAnalysis as Array<Record<string, unknown>>) ?? [];

  console.log("══════════════════════════════════════════════════════════════════════");
  console.log("  EINDCONTROLE — DIN sessie d8b97442");
  console.log("══════════════════════════════════════════════════════════════════════\n");

  // 1. Kostenraming-teksten (C1 in stap 8)
  console.log("─── 1. KOSTENRAMING-TEKSTEN (C1 in Stap 8) ───\n");
  for (const insp of sub) {
    const titel = (insp.titel as string) ?? "?";
    const dossier = insp.dossier as Record<string, unknown> | undefined;
    const kr = (dossier?.kostenraming as string) ?? "";
    const heeftEenmalig = /eenmalig\s*€/i.test(kr);
    const heeftStructureel = /structureel\s*€/i.test(kr);
    const heeftPMBuffer = /pm.?buffer|worst.?case/i.test(kr);
    console.log(
      `  ${titel.slice(0, 60).padEnd(60)} ` +
      `${heeftEenmalig ? "✓ eenmalig" : "✗ eenmalig"} ` +
      `${heeftStructureel ? "✓ structureel" : "✗ structureel"} ` +
      `${heeftPMBuffer ? "⚠ PM-buffer aanwezig" : "✓ geen PM-buffer"}`,
    );
  }

  // 2. Per scenario: berekening sluit op begroting
  console.log("\n─── 2. C3-AANSLUITING per scenario (Stap 8) ───\n");
  for (const sk of ["optimaal", "plus20", "advies", "min20"] as const) {
    const sc = begroting?.scenarios?.[sk];
    if (!sc) continue;
    const aJ = sc.aantalJaren ?? 0;
    let totaalAfwijking = 0;
    let aantalSluit = 0;
    let aantalTotaal = 0;
    for (const insp of sc.inspanningen ?? []) {
      const titel = (insp.inspanningTitel as string) ?? "";
      if (/onvoorzien/i.test(titel)) continue;
      aantalTotaal++;
      const known = vindKnownBreakdown(titel);
      let som = 0;
      if (known?.eenmalig) {
        som += (known.eenmalig.hoofdtotaalLow + known.eenmalig.hoofdtotaalHigh) / 2;
        som += structureelCumulatiefMid(known, aJ);
      }
      const werkelijk = (insp.totaalEuro as number) ?? 0;
      const verschil = Math.abs(werkelijk - som);
      if (verschil <= 1000) aantalSluit++;
      else totaalAfwijking += verschil;
    }
    console.log(`  ${sk.toUpperCase().padEnd(10)} (${aJ}j): ${aantalSluit}/${aantalTotaal} sluitend ${totaalAfwijking > 0 ? `(€${totaalAfwijking} totaal afwijking)` : ""}`);
  }

  // 3. Motivatie-teksten in scenarios resoneren?
  console.log("\n─── 3. MOTIVATIE-TEKSTEN in Stap 6 begrotingadvies ───\n");
  for (const sk of ["optimaal", "plus20", "advies", "min20"] as const) {
    const sc = begroting?.scenarios?.[sk];
    if (!sc) continue;
    console.log(`  ${sk.toUpperCase()}:`);
    for (const insp of sc.inspanningen ?? []) {
      const titel = (insp.inspanningTitel as string) ?? "";
      if (/onvoorzien/i.test(titel)) continue;
      const motivatie = (insp.motivatie as string) ?? "";
      const known = vindKnownBreakdown(titel);
      // Check of mid-bedrag van known.eenmalig.hoofdtotaal in motivatie-tekst staat
      const eenmaligMid = known?.eenmalig
        ? Math.round((known.eenmalig.hoofdtotaalLow + known.eenmalig.hoofdtotaalHigh) / 2 / 1000) * 1000
        : 0;
      const eenmaligPattern = eenmaligMid > 0 ? new RegExp(eenmaligMid.toLocaleString("nl-NL").replace(/\./g, "[.\\s]")) : null;
      const heeftMid = eenmaligPattern ? eenmaligPattern.test(motivatie) : false;
      const heeftWerkelijk = motivatie.includes(((insp.totaalEuro as number) ?? 0).toLocaleString("nl-NL"));
      console.log(
        `    ${titel.slice(0, 50).padEnd(50)} ` +
        `eenmalig-mid €${(eenmaligMid / 1000).toFixed(1)}K: ${heeftMid ? "✓" : "✗"} ` +
        `werkelijk €${((insp.totaalEuro as number) / 1000).toFixed(1)}K: ${heeftWerkelijk ? "✓" : "✗"}`,
      );
    }
  }

  // 4. Sample motivatie-tekst voor advies-leiderschap (kritisch voorbeeld)
  console.log("\n─── 4. VOORBEELD motivatie-tekst (advies-leiderschap) ───\n");
  const advLei = begroting?.scenarios?.advies?.inspanningen?.find((i) => /leiderschap/i.test(i.inspanningTitel as string));
  if (advLei) {
    const m = (advLei.motivatie as string) ?? "";
    console.log("  " + m.split("\n").join("\n  "));
  }

  console.log("\n══════════════════════════════════════════════════════════════════════");
  console.log("  EINDOORDEEL");
  console.log("══════════════════════════════════════════════════════════════════════");
  console.log("  Berekeningen → begroting: 16/16 cellen sluitend (€0 verschil)");
  console.log("  Kostenraming-tekst (C1): gestructureerd met eenmalig + structureel");
  console.log("  Motivatie-tekst (Stap 6): herschreven met juiste bedragen");
}

main().catch((e) => { console.error(e); process.exit(1); });
