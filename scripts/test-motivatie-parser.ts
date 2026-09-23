// Test motivatie-parser tegen echte motivatie-teksten van sessie d8b97442.
// Run: npx tsx scripts/test-motivatie-parser.ts

import { createClient } from "@supabase/supabase-js";
import { readFileSync, existsSync } from "fs";
import { join } from "path";
import { parseMotivatie } from "../src/lib/motivatie-parser";

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

const fmt = (n: number) => `€ ${n.toLocaleString("nl-NL")}`;

async function main() {
  const { data } = await supa.from("din_sessions").select("data")
    .eq("id", "d8b97442-ce8f-4134-b2c7-67dc8e3a3f93").maybeSingle();
  if (!data) { console.error("not found"); process.exit(1); }

  const wiz = (data.data as Record<string, unknown>).crossAnalyseWizard as
    | { stepResults?: Record<string, Record<string, unknown>> }
    | undefined;
  const stap4 = wiz?.stepResults?.stap4 as Record<string, unknown> | undefined;
  const begroting = stap4?.begrotingAdvies as
    | { scenarios?: Record<string, { aantalJaren?: number; inspanningen?: Array<{ inspanningTitel: string; motivatie?: string; totaalEuro?: number }> } | null> }
    | undefined;

  // Test op één scenario (advies) — motivatie is identiek over scenarios
  const scen = begroting?.scenarios?.advies;
  if (!scen) { console.error("no scenario"); process.exit(1); }

  for (const insp of scen.inspanningen ?? []) {
    console.log("\n" + "═".repeat(100));
    console.log(`## ${insp.inspanningTitel}`);
    console.log(`Werkelijk totaal in advies: ${fmt(insp.totaalEuro ?? 0)}  (4 jaar)`);
    console.log("═".repeat(100));

    const parsed = parseMotivatie(insp.motivatie);
    if (parsed.unparsed) {
      console.log("⚠ UNPARSED");
      console.log(`raw: ${(insp.motivatie ?? "").slice(0, 200)}…`);
      continue;
    }

    if (parsed.inleiding) {
      console.log("\n**Inleiding:**");
      console.log(`  ${parsed.inleiding.slice(0, 200)}${parsed.inleiding.length > 200 ? "…" : ""}`);
    }

    console.log(`\n**Eenmalig (Σ low/mid/high):** ${fmt(parsed.totaalEenmaligLow)} / ${fmt(parsed.totaalEenmaligMid)} / ${fmt(parsed.totaalEenmaligHigh)}`);
    if (parsed.eenmalig.length > 0) {
      for (const c of parsed.eenmalig) {
        const formuleStr = c.formule ? ` [formule: "${c.formule}"]` : "";
        const toelStr = c.toelichting ? ` (toel: ${c.toelichting})` : "";
        const range = c.bedragLow !== c.bedragHigh ? `${fmt(c.bedragLow)}–${fmt(c.bedragHigh)}` : fmt(c.bedragMid);
        console.log(`  • ${c.context.padEnd(50, " ").slice(0, 50)} ${range}${formuleStr}${toelStr}`);
      }
    }

    console.log(`\n**Structureel (Σ low/mid/high per jaar):** ${fmt(parsed.totaalStructureelLowPerJr)} / ${fmt(parsed.totaalStructureelMidPerJr)} / ${fmt(parsed.totaalStructureelHighPerJr)}`);
    if (parsed.structureel.length > 0) {
      for (const c of parsed.structureel) {
        const formuleStr = c.formule ? ` [formule: "${c.formule}"]` : "";
        const toelStr = c.toelichting ? ` (toel: ${c.toelichting})` : "";
        const range = c.bedragLow !== c.bedragHigh ? `${fmt(c.bedragLow)}–${fmt(c.bedragHigh)}` : fmt(c.bedragMid);
        const vanaf = c.vanafJaar ? ` (vanaf jaar ${c.vanafJaar})` : "";
        console.log(`  • ${c.context.padEnd(50, " ").slice(0, 50)} ${range}/jr${vanaf}${formuleStr}${toelStr}`);
      }
    }

    // Bottom-up vs werkelijk
    const aantalJaren = scen.aantalJaren ?? 4;
    const structureleJaren = Math.max(0, aantalJaren - 1);
    const bottomUpMid = parsed.totaalEenmaligMid + parsed.totaalStructureelMidPerJr * structureleJaren;
    const drift = (insp.totaalEuro ?? 0) - bottomUpMid;
    console.log(`\n**Bottom-up berekening (advies, ${aantalJaren}j):** ${fmt(parsed.totaalEenmaligMid)} eenmalig + ${fmt(parsed.totaalStructureelMidPerJr)}/jr × ${structureleJaren}j = ${fmt(bottomUpMid)}`);
    console.log(`**Werkelijk:** ${fmt(insp.totaalEuro ?? 0)}`);
    console.log(`**Δ drift:** ${drift >= 0 ? "+" : ""}${fmt(drift)}`);
  }
}

main().catch((e) => { console.error(e); process.exit(1); });
