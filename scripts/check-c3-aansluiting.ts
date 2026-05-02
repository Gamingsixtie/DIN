// Check of "eenmalig + structureel cumulatief (met vanafJaar)" sluit op
// het werkelijke scenario-totaal per inspanning, voor alle scenarios.
// Gebruikt known-breakdowns waar beschikbaar, anders parseDossierRaming.

import { createClient } from "@supabase/supabase-js";
import { readFileSync, existsSync } from "fs";
import { join } from "path";
import { parseDossierRaming } from "../src/lib/dossier-parser";
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
  const { data } = await supa
    .from("din_sessions")
    .select("data")
    .eq("id", "d8b97442-ce8f-4134-b2c7-67dc8e3a3f93")
    .maybeSingle();
  if (!data) return;
  const wiz = (data.data as Record<string, unknown>).crossAnalyseWizard as
    | { stepResults?: Record<string, Record<string, unknown>> }
    | undefined;
  const stap4 = wiz?.stepResults?.stap4 as Record<string, unknown> | undefined;
  const sub = (stap4?.subEffortAnalysis as Array<Record<string, unknown>> | undefined) ?? [];
  const begroting = stap4?.begrotingAdvies as { scenarios?: Record<string, { aantalJaren?: number; inspanningen?: Array<Record<string, unknown>> } | null> } | undefined;

  for (const sk of ["optimaal", "plus20", "advies", "min20"] as const) {
    const sc = begroting?.scenarios?.[sk];
    if (!sc) continue;
    const aantalJaren = sc.aantalJaren ?? 0;
    const structJaren = Math.max(0, aantalJaren - 1);
    console.log(`\n=== ${sk.toUpperCase()} (${aantalJaren} jaar) ===`);
    console.log(`${"Inspanning".padEnd(48)} | ${"Werkelijk".padEnd(10)} | ${"Eenmalig".padEnd(10)} | ${"Struct cum".padEnd(10)} | ${"Som".padEnd(10)} | Verschil          | Bron`);
    for (const insp of sc.inspanningen ?? []) {
      const titel = (insp.inspanningTitel as string) ?? "?";
      const werkelijk = (insp.totaalEuro as number) ?? 0;
      const known = vindKnownBreakdown(titel);
      let eenmalig = 0;
      let structCum = 0;
      let bron = "—";
      if (known?.eenmalig) {
        bron = "known";
        eenmalig = (known.eenmalig.hoofdtotaalLow + known.eenmalig.hoofdtotaalHigh) / 2;
        if (known.structureel) structCum = structureelCumulatiefMid(known, aantalJaren);
      } else {
        const dossier = sub.find((s) => (s.titel as string) === titel);
        const kostenraming = ((dossier?.dossier as Record<string, unknown> | undefined)?.kostenraming as string | undefined) ?? "";
        if (kostenraming) {
          const parsed = parseDossierRaming(kostenraming);
          eenmalig = parsed.eenmaligMid;
          structCum = parsed.structureelMidPerJr * structJaren;
          bron = "parsed";
        }
      }
      const som = eenmalig + structCum;
      const verschil = werkelijk - som;
      const pct = som > 0 ? Math.round((verschil / som) * 100) : 0;
      const indicator = som === 0 ? "—" : Math.abs(pct) <= 10 ? "✓" : Math.abs(pct) <= 25 ? "~" : "✗";
      console.log(
        `${titel.slice(0, 48).padEnd(48)} | ${fmt(werkelijk).padEnd(10)} | ${fmt(eenmalig).padEnd(10)} | ${fmt(structCum).padEnd(10)} | ${fmt(som).padEnd(10)} | ${indicator} ${fmt(verschil).padEnd(10)} (${pct}%) | ${bron}`,
      );
    }
  }
}

main().catch(console.error);
