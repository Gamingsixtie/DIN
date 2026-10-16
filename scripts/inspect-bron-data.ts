// Dump kostenraming + motivatie + parsed sub-componenten voor alle
// inspanningen in sessie d8b97442. Gebruikt om te zien welke structurele
// componenten Cito heeft opgegeven en wat al/niet gedekt is in
// component-redeneringen.ts.

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
    process.env[t.substring(0, e).trim()] = t
      .substring(e + 1)
      .trim()
      .replace(/^["']|["']$/g, "");
  }
}
loadEnvFile(join(process.cwd(), ".env.local"));

const supa = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
);

const fmt = (n: number) =>
  n === 0 ? "—" : `€${Math.round(n).toLocaleString("nl-NL")}`;

async function main() {
  const sessionId = "d8b97442-ce8f-4134-b2c7-67dc8e3a3f93";
  const { data } = await supa
    .from("din_sessions")
    .select("data")
    .eq("id", sessionId)
    .maybeSingle();
  if (!data) {
    console.error("not found");
    process.exit(1);
  }

  const wiz = (data.data as Record<string, unknown>).crossAnalyseWizard as
    | { stepResults?: Record<string, Record<string, unknown>> }
    | undefined;
  const stap4 = wiz?.stepResults?.stap4 as
    | Record<string, unknown>
    | undefined;
  const sub =
    (stap4?.subEffortAnalysis as Array<Record<string, unknown>> | undefined) ??
    [];
  const advies = (
    stap4?.begrotingAdvies as
      | { scenarios?: Record<string, { inspanningen?: Array<Record<string, unknown>> } | null> }
      | undefined
  )?.scenarios?.advies;

  for (const insp of sub) {
    const titel = insp.titel as string;
    const domein = insp.domein as string;
    const dossier = insp.dossier as Record<string, unknown> | undefined;
    const kostenraming = (dossier?.kostenraming as string | undefined) ?? "";

    const advInsp = advies?.inspanningen?.find(
      (i) => i.inspanningTitel === titel,
    );
    const motivatie = (advInsp?.motivatie as string | undefined) ?? "";
    const { onderbouwing } = splitMotivatie(motivatie);

    console.log("\n" + "=".repeat(100));
    console.log(`# ${titel}    [${domein}]`);
    console.log("=".repeat(100));

    // Print kostenraming + motivatie kort
    console.log("\n--- Kostenraming ---");
    console.log(kostenraming.slice(0, 1500));

    console.log("\n--- Motivatie onderbouwing (extract) ---");
    console.log(onderbouwing.slice(0, 1500));

    // Parse breakdown van kostenraming
    const parsed = parseBreakdown(kostenraming);
    if (!parsed.unparsed) {
      for (const sec of [parsed.eenmalig, parsed.structureel]) {
        if (!sec) continue;
        console.log(`\n  [${sec.label.toUpperCase()}] hoofdtotaal ${fmt(sec.hoofdtotaalLow)}–${fmt(sec.hoofdtotaalHigh)}`);
        for (const c of sec.subComponenten) {
          const range =
            c.bedragLow === c.bedragHigh
              ? fmt(c.bedragLow)
              : `${fmt(c.bedragLow)}–${fmt(c.bedragHigh)}`;
          console.log(`    • ${c.naam.slice(0, 70).padEnd(70)}  ${range}`);
        }
      }
    }

    // Search PM-buffer mention
    if (
      kostenraming.match(/pm.?buffer/i) ||
      motivatie.match(/pm.?buffer/i) ||
      kostenraming.match(/30\s?%/i) ||
      motivatie.match(/30\s?%/i)
    ) {
      console.log("\n  ⚠ Vermelding van PM-buffer of 30% gevonden");
      const bron = kostenraming + "\n" + motivatie;
      const matches = bron.match(/[^.]*(pm.?buffer|30\s?%)[^.]*\./gi);
      matches?.slice(0, 4).forEach((m) => console.log(`    > ${m.trim()}`));
    }
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
