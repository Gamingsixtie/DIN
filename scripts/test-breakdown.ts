// Test parseBreakdown tegen kostenraming + motivatie van sessie d8b97442.

import { createClient } from "@supabase/supabase-js";
import { readFileSync, existsSync } from "fs";
import { join } from "path";
import { parseBreakdown, splitMotivatie } from "../src/lib/motivatie-parser";

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

const supa = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!);
const fmt = (n: number) => `€${n.toLocaleString("nl-NL")}`;

async function main() {
  const { data } = await supa.from("din_sessions").select("data")
    .eq("id", "d8b97442-ce8f-4134-b2c7-67dc8e3a3f93").maybeSingle();
  if (!data) { console.error("not found"); process.exit(1); }

  const wiz = (data.data as Record<string, unknown>).crossAnalyseWizard as
    | { stepResults?: Record<string, Record<string, unknown>> } | undefined;
  const stap4 = wiz?.stepResults?.stap4 as Record<string, unknown> | undefined;
  const sub = (stap4?.subEffortAnalysis as Array<Record<string, unknown>> | undefined) ?? [];
  const advies = (stap4?.begrotingAdvies as { scenarios?: Record<string, { inspanningen?: Array<Record<string, unknown>> } | null> } | undefined)?.scenarios?.advies;

  function dumpSection(title: string, text: string) {
    console.log(`\n--- ${title} ---`);
    if (!text.trim()) {
      console.log("(leeg)");
      return;
    }
    const result = parseBreakdown(text);
    if (result.unparsed) {
      console.log("(unparsed)");
      return;
    }
    for (const sec of [result.eenmalig, result.structureel]) {
      if (!sec) continue;
      const eenheid = sec.label === "structureel" ? "/jr" : "";
      console.log(`\n  [${sec.label.toUpperCase()}]`);
      console.log(`  Hoofdtotaal:        ${fmt(sec.hoofdtotaalLow)} – ${fmt(sec.hoofdtotaalHigh)}${eenheid}`);
      console.log(`  Sub-componenten:`);
      for (const c of sec.subComponenten) {
        const range = c.bedragLow === c.bedragHigh ? fmt(c.bedragLow) : `${fmt(c.bedragLow)}–${fmt(c.bedragHigh)}`;
        const naam = c.naam.slice(0, 60).padEnd(60, " ");
        console.log(`    • ${naam}  ${range}${c.isPerJaar ? "/jr" : ""}`);
      }
      console.log(`  Σ subs:             ${fmt(sec.somSubsLow)} – ${fmt(sec.somSubsHigh)}${eenheid}`);
      console.log(`  Buffer/overhead:    ${fmt(sec.bufferLow)} – ${fmt(sec.bufferHigh)}${eenheid}`);
      console.log(`  Sluit netjes aan:   ${sec.sluitNetjesAan ? "✓" : "✗"}`);
    }
  }

  for (const insp of sub) {
    const titel = insp.titel as string;
    const dossier = insp.dossier as Record<string, unknown> | undefined;
    const kostenraming = (dossier?.kostenraming as string | undefined) ?? "";

    const advInsp = advies?.inspanningen?.find((i) => i.inspanningTitel === titel);
    const motivatie = (advInsp?.motivatie as string | undefined) ?? "";
    const { onderbouwing } = splitMotivatie(motivatie);

    console.log("\n" + "=".repeat(100));
    console.log(`# ${titel}`);
    console.log("=".repeat(100));

    dumpSection("KOSTENRAMING (uit dossier)", kostenraming);
    dumpSection("MOTIVATIE — dossier-onderbouwing", onderbouwing);
  }
}

main().catch((e) => { console.error(e); process.exit(1); });
