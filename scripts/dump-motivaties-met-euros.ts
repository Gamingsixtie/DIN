// Dump per inspanning de `motivatie` met daarin alle euro-bedragen
// gehighlight + per-jaar markeringen + "vanaf jaar N" markeringen.
// Helpt verifiëren dat de UI-rendering (segmentText) correct werkt.
//
// Motivatie is identiek over scenarios (zie audit-tekst-consistency.ts +
// set-scenario-agnostic-motivaties.ts). We pakken daarom het eerste
// niet-lege scenario om motivatie per inspanning op te halen.
//
// READ-ONLY — schrijft niets.
//
// Run: npx tsx scripts/dump-motivaties-met-euros.ts

import { createClient } from "@supabase/supabase-js";
import { readFileSync, existsSync } from "fs";
import { join } from "path";
import {
  splitMotivatie,
  findEuroMatches,
  segmentText,
  type EuroMatch,
} from "../src/lib/motivatie-parser";

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

const SESSION_ID = "d8b97442-ce8f-4134-b2c7-67dc8e3a3f93";

type Insp = {
  inspanningTitel: string;
  domein?: string;
  motivatie?: string;
};
type Scen = {
  inspanningen?: Insp[];
};

function eurFmt(n: number): string {
  return `€${n.toLocaleString("nl-NL")}`;
}

function fmtRange(m: EuroMatch): string {
  if (m.low === m.high) return eurFmt(m.low);
  return `${eurFmt(m.low)}–${eurFmt(m.high)}`;
}

async function main() {
  const supa = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
  );

  const { data, error } = await supa
    .from("din_sessions")
    .select("data")
    .eq("id", SESSION_ID)
    .maybeSingle();

  if (error || !data) {
    console.error("✗ Sessie niet gevonden:", error?.message ?? "no row");
    process.exit(1);
  }

  const sess = data.data as Record<string, unknown>;
  const wiz = sess.crossAnalyseWizard as { stepResults?: Record<string, unknown> } | undefined;
  const stap4 = wiz?.stepResults?.stap4 as Record<string, unknown> | undefined;
  const adv = stap4?.begrotingAdvies as
    | { scenarios?: Record<string, Scen | null> }
    | undefined;

  if (!adv?.scenarios) {
    console.error("✗ begrotingAdvies.scenarios ontbreekt");
    process.exit(1);
  }

  // Verzamel per inspanning de motivatie. Voorkeur: 'advies' scenario.
  // Fallback: eerste scenario met inspanningen.
  const scenarioVoorkeur = ["advies", "optimaal", "plus20", "min20"];
  let bronScenario: Scen | null = null;
  let bronKey = "";
  for (const k of scenarioVoorkeur) {
    const sc = adv.scenarios[k];
    if (sc && (sc.inspanningen?.length ?? 0) > 0) {
      bronScenario = sc;
      bronKey = k;
      break;
    }
  }
  if (!bronScenario) {
    for (const [k, sc] of Object.entries(adv.scenarios)) {
      if (sc && (sc.inspanningen?.length ?? 0) > 0) {
        bronScenario = sc;
        bronKey = k;
        break;
      }
    }
  }
  if (!bronScenario) {
    console.error("✗ Geen scenario met inspanningen gevonden");
    process.exit(1);
  }

  console.log("═".repeat(90));
  console.log(`MOTIVATIE-DUMP MET EURO-HIGHLIGHTS  (bron: scenario "${bronKey}")`);
  console.log("═".repeat(90));
  console.log(
    `Sessie: ${SESSION_ID.slice(0, 8)}  |  ${bronScenario.inspanningen?.length ?? 0} inspanningen\n`,
  );

  // Optionele consistentie-check: motivatie identiek over scenarios.
  const inconsistent: string[] = [];
  for (const ins of bronScenario.inspanningen ?? []) {
    const ref = (ins.motivatie ?? "").trim();
    for (const [k, sc] of Object.entries(adv.scenarios)) {
      if (k === bronKey || !sc) continue;
      const other = sc.inspanningen?.find((i) => i.inspanningTitel === ins.inspanningTitel);
      const otherMot = (other?.motivatie ?? "").trim();
      if (other && otherMot !== ref) {
        inconsistent.push(`"${ins.inspanningTitel}" verschilt tussen ${bronKey} en ${k}`);
      }
    }
  }
  if (inconsistent.length > 0) {
    console.log("⚠ Motivatie wijkt af tussen scenarios (zou identiek moeten zijn):");
    for (const i of inconsistent) console.log(`  - ${i}`);
    console.log("");
  } else {
    console.log("✓ Motivatie is identiek over alle scenarios.\n");
  }

  for (const ins of bronScenario.inspanningen ?? []) {
    const motivatie = (ins.motivatie ?? "").trim();
    if (!motivatie) {
      console.log(`## ${ins.inspanningTitel}`);
      console.log(`  (motivatie leeg)\n`);
      continue;
    }

    const { inleiding, onderbouwing } = splitMotivatie(motivatie);

    console.log(`## ${ins.inspanningTitel}`);
    console.log(`Domein: ${ins.domein ?? "?"}`);
    console.log("");

    console.log(`**Inleiding**:`);
    console.log(inleiding ? inleiding : "(leeg)");
    console.log("");

    console.log(`**Onderbouwing**:`);
    console.log(onderbouwing ? onderbouwing : "(leeg — geen 'Dossier-onderbouwing:' marker gevonden)");
    console.log("");

    // Euro-detectie op de hele motivatie (zoals UI dit doet via segmentText).
    const matchesAll = findEuroMatches(motivatie);
    const matchesInleiding = findEuroMatches(inleiding);
    const matchesOnderbouwing = findEuroMatches(onderbouwing);

    console.log(`  Euro-bedragen gevonden: ${matchesAll.length} stuks  (inleiding: ${matchesInleiding.length}, onderbouwing: ${matchesOnderbouwing.length})`);

    // Toon per match raw + low/high + classificatie
    for (const m of matchesAll) {
      const tag = m.isPerJaar
        ? "(per jaar)"
        : m.vanafJaar !== null
        ? `(vanaf jaar ${m.vanafJaar})`
        : "(eenmalig/onbepaald)";
      const padded = fmtRange(m).padEnd(28);
      console.log(`    ${padded} ${tag}`);
    }

    // Som-indicaties
    const eenmaligTotaal = matchesAll
      .filter((m) => !m.isPerJaar)
      .reduce((s, m) => s + Math.round((m.low + m.high) / 2), 0);
    const perJaarTotaal = matchesAll
      .filter((m) => m.isPerJaar)
      .reduce((s, m) => s + Math.round((m.low + m.high) / 2), 0);

    console.log("");
    console.log(`  Som eenmalig (mid):                    ${eurFmt(eenmaligTotaal)}`);
    console.log(`  Som per-jaar (mid, alle structureel):  ${eurFmt(perJaarTotaal)}`);

    // "Vanaf jaar N" markeringen
    const vanafs = matchesAll
      .filter((m) => m.vanafJaar !== null)
      .map((m) => m.vanafJaar as number);
    const uniqVanafs = Array.from(new Set(vanafs)).sort((a, b) => a - b);
    console.log(
      `  "Vanaf jaar N" markeringen: ${vanafs.length}${uniqVanafs.length > 0 ? ` (jaren: ${uniqVanafs.join(", ")})` : ""}`,
    );

    // Sanity-check: segmentText geeft text+euro segmenten die samen de hele
    // tekst dekken (UI render-pad). Validatie: concat segmenten == origineel.
    const segments = segmentText(motivatie);
    const recomposed = segments.map((s) => s.content).join("");
    const segmentsOk = recomposed === motivatie;
    const euroSegs = segments.filter((s) => s.type === "euro").length;
    console.log(
      `  segmentText: ${segments.length} segmenten (waarvan ${euroSegs} euro), reconstructie ${segmentsOk ? "✓" : "✗ (UI render-bug!)"}`,
    );

    console.log("");
    console.log("─".repeat(90));
    console.log("");
  }
}

main().catch((e) => {
  console.error("✗ Fataal:", e);
  process.exit(2);
});
