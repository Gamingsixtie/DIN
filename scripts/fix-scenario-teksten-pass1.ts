// Surgical text-replace voor 3 issues uit AUDIT-tekst-consistency-pass1.md:
//  1. optimaal.samenvatting:    "circa € 1.441.000" → "circa € 1.490.000"
//  2. optimaal.prioriteitAdvies: "circa € 910.000" CRM doel-totaal → "circa € 1.095.000"
//  3. min20.prioriteitAdvies:    "€87.500 structureel via Smartprocess" → "€ 12.500/jaar structureel via Smartprocess"
//
// Geen AI-call. Geen UI-changes. Alleen de twee strings per scenario worden
// aangepast; rest van de tekst blijft byte-voor-byte gelijk.
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
    process.env[t.substring(0, e).trim()] = t
      .substring(e + 1)
      .trim()
      .replace(/^["']|["']$/g, "");
  }
}
loadEnvFile(join(process.cwd(), ".env.local"));

type ScenTexts = {
  samenvatting?: string;
  prioriteitAdvies?: string;
};

type Replacement = {
  scenario: "optimaal" | "min20";
  veld: "samenvatting" | "prioriteitAdvies";
  pattern: RegExp;
  replacement: string;
  label: string;
};

const REPLACEMENTS: Replacement[] = [
  {
    scenario: "optimaal",
    veld: "samenvatting",
    pattern: /circa €\s?1\.441\.000/g,
    replacement: "circa € 1.490.000",
    label: "Fix 1 — optimaal.samenvatting: € 1.441.000 → € 1.490.000",
  },
  {
    scenario: "optimaal",
    veld: "prioriteitAdvies",
    pattern: /circa €\s?910\.000/g,
    replacement: "circa € 1.095.000",
    label: "Fix 2 — optimaal.prioriteitAdvies: CRM € 910.000 → € 1.095.000",
  },
  {
    scenario: "min20",
    veld: "prioriteitAdvies",
    pattern: /€\s?87\.500 structureel via Smartprocess/g,
    replacement: "€ 12.500/jaar structureel via Smartprocess",
    label: "Fix 3 — min20.prioriteitAdvies: €87.500 → € 12.500/jaar (Smartprocess)",
  },
];

function excerpt(s: string, needle: string, span = 80): string {
  const idx = s.indexOf(needle);
  if (idx === -1) return "(niet gevonden)";
  const start = Math.max(0, idx - span);
  const end = Math.min(s.length, idx + needle.length + span);
  return (start > 0 ? "…" : "") + s.slice(start, end) + (end < s.length ? "…" : "");
}

async function main() {
  const s = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
  );
  const sessionId = "d8b97442-ce8f-4134-b2c7-67dc8e3a3f93";
  const { data, error: loadErr } = await s
    .from("din_sessions")
    .select("data")
    .eq("id", sessionId)
    .maybeSingle();
  if (loadErr) {
    console.error("LOAD FOUT:", loadErr.message);
    process.exit(1);
  }
  if (!data) {
    console.error("Sessie niet gevonden");
    process.exit(1);
  }

  const sess = data.data as Record<string, unknown>;
  const wiz = sess.crossAnalyseWizard as Record<string, unknown> | undefined;
  const stap4 = (wiz?.stepResults as Record<string, unknown> | undefined)?.stap4 as
    | Record<string, unknown>
    | undefined;
  const adv = stap4?.begrotingAdvies as
    | { scenarios?: Record<string, ScenTexts | null> }
    | undefined;
  if (!adv?.scenarios) {
    console.error("Geen begrotingAdvies.scenarios gevonden");
    process.exit(1);
  }

  console.log("=".repeat(80));
  console.log("FIX SCENARIO-TEKSTEN PASS 1 — sessie", sessionId);
  console.log("=".repeat(80));

  type Result = { label: string; matchedBefore: number; matchedAfter: number; before: string; after: string };
  const results: Result[] = [];

  for (const r of REPLACEMENTS) {
    const scen = adv.scenarios[r.scenario];
    if (!scen) {
      console.warn(`  ! scenario "${r.scenario}" niet gevonden — overgeslagen`);
      continue;
    }
    const original = scen[r.veld] ?? "";
    const matchesBefore = (original.match(r.pattern) ?? []).length;
    const replaced = original.replace(r.pattern, r.replacement);
    const matchesAfter = (replaced.match(r.pattern) ?? []).length;
    scen[r.veld] = replaced;

    results.push({
      label: r.label,
      matchedBefore: matchesBefore,
      matchedAfter: matchesAfter,
      before: excerpt(original, original.match(r.pattern)?.[0] ?? "", 60),
      after: excerpt(replaced, r.replacement, 60),
    });

    console.log(`\n${r.label}`);
    console.log(`  matches voor : ${matchesBefore}`);
    console.log(`  matches na   : ${matchesAfter}`);
    if (matchesBefore === 0) {
      console.log(`  ! geen match — pattern: ${r.pattern}`);
    } else {
      console.log(`  voor : ${results[results.length - 1].before}`);
      console.log(`  na   : ${results[results.length - 1].after}`);
    }
  }

  // Schrijf alleen weg als er minstens 1 vervanging is gedaan
  const totalReplacements = results.reduce((acc, r) => acc + r.matchedBefore, 0);
  if (totalReplacements === 0) {
    console.log("\n! Geen enkele match gevonden — geen write naar Supabase.");
    process.exit(0);
  }

  const newData = {
    ...sess,
    crossAnalyseWizard: {
      ...(sess.crossAnalyseWizard as object),
      stepResults: {
        ...(wiz?.stepResults ?? {}),
        stap4: { ...(stap4 ?? {}), begrotingAdvies: adv },
      },
    },
  };

  const { error: writeErr } = await s
    .from("din_sessions")
    .update({ data: newData })
    .eq("id", sessionId);
  if (writeErr) {
    console.error("\nWRITE FOUT:", writeErr.message);
    process.exit(1);
  }

  console.log(`\n✓ Geschreven naar Supabase. Totaal vervangingen: ${totalReplacements}`);

  // Re-load + verifieer
  console.log("\n--- VERIFICATIE (re-load uit Supabase) ---");
  const { data: verify } = await s
    .from("din_sessions")
    .select("data")
    .eq("id", sessionId)
    .maybeSingle();
  if (!verify) {
    console.error("Verificatie-load faalde");
    process.exit(1);
  }
  const vSess = verify.data as Record<string, unknown>;
  const vWiz = vSess.crossAnalyseWizard as Record<string, unknown>;
  const vStap4 = (vWiz.stepResults as Record<string, unknown>).stap4 as Record<string, unknown>;
  const vAdv = vStap4.begrotingAdvies as { scenarios?: Record<string, ScenTexts | null> };

  for (const r of REPLACEMENTS) {
    const scen = vAdv.scenarios?.[r.scenario];
    if (!scen) continue;
    const txt = scen[r.veld] ?? "";
    const stillThere = (txt.match(r.pattern) ?? []).length;
    const containsNew = txt.includes(r.replacement);
    console.log(
      `  ${r.scenario}.${r.veld}: oude pattern matches=${stillThere} | bevat nieuwe waarde="${r.replacement}"=${containsNew}`,
    );
  }
}

void main();
