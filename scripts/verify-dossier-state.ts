// Diagnose: wat staat er feitelijk in Supabase voor sessie d8b97442?
// Toont:
//   1. Per inspanning de huidige dossier.kostenraming (eerste 250 chars)
//   2. Of het woord "interne uren" / "intern" / "740u" / "1466 uur" voorkomt
//   3. Per scenario de totaal-bedragen
//   4. Wanneer de sessie laatst is gemodificeerd
//
// Run: npx tsx scripts/verify-dossier-state.ts
//
// SCHRIJFT NIETS NAAR SUPABASE — read-only.

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

const sessionId = process.argv[2] ?? "d8b97442-ce8f-4134-b2c7-67dc8e3a3f93";

type SubEffort = {
  titel?: string;
  domein?: string;
  dossier?: { kostenraming?: string };
};

type Scenario = {
  totaalGeraamdEuro?: number;
  jaarlijksBudgetEuro?: number;
  aantalJaren?: number;
  inspanningen?: Array<{ inspanningTitel: string; totaalEuro?: number }>;
};

async function main() {
  const { data, error } = await supa
    .from("din_sessions")
    .select("data, updated_at")
    .eq("id", sessionId)
    .maybeSingle();

  if (error || !data) {
    console.error(error?.message ?? "Sessie niet gevonden");
    process.exit(1);
  }

  const s = data.data as Record<string, unknown>;
  const wiz = s.crossAnalyseWizard as
    | { stepResults?: Record<string, Record<string, unknown>> }
    | undefined;
  const stap4 = wiz?.stepResults?.stap4 as Record<string, unknown> | undefined;
  const sub = (stap4?.subEffortAnalysis as SubEffort[] | undefined) ?? [];
  const begroting = stap4?.begrotingAdvies as
    | { startJaar?: number; scenarios?: Record<string, Scenario | null> }
    | undefined;

  console.log("═".repeat(80));
  console.log("VERIFY DOSSIER + BEGROTING STATE — read-only diagnose");
  console.log("═".repeat(80));
  console.log(`Sessie: ${sessionId}`);
  console.log(`DB-versie: v${(s as { version?: number }).version}`);
  console.log(`Laatst gemodificeerd: ${data.updated_at}`);
  console.log();

  // ==== STAP 1: dossier.kostenraming per inspanning (alleen processen/data_systemen/cultuur) ====
  console.log("STAP 1 — DOSSIER.KOSTENRAMING (per inspanning)");
  console.log("─".repeat(80));
  for (const e of sub) {
    const dom = e.domein ?? "?";
    const titel = e.titel ?? "(geen titel)";
    const kost = e.dossier?.kostenraming ?? "";
    const bevatIntern = /intern|740u|1466 uur|1.466 uur|werkgroepuren|capaciteitskost/i.test(kost);
    console.log(`▌ [${dom}] ${titel}`);
    console.log(`  Lengte: ${kost.length} chars`);
    console.log(`  Bevat interne-uren-tekst? ${bevatIntern ? "JA — nog niet gecorrigeerd" : "NEE — schoon"}`);
    console.log(`  Eerste 250 chars: ${kost.slice(0, 250).replace(/\n/g, " ")}…`);
    console.log();
  }

  // ==== STAP 2: scenario-totalen ====
  console.log("STAP 2 — SCENARIO-TOTALEN UIT BEGROTING");
  console.log("─".repeat(80));
  if (!begroting?.scenarios) {
    console.log("Geen begroting.scenarios in stap4 — wizard heeft nog niets gegenereerd.");
  } else {
    for (const [key, sc] of Object.entries(begroting.scenarios)) {
      if (!sc) {
        console.log(`▌ ${key}: (null — niet gegenereerd)`);
        continue;
      }
      const totaal = sc.totaalGeraamdEuro ?? 0;
      const perJaar = sc.jaarlijksBudgetEuro ?? 0;
      const aantal = sc.aantalJaren ?? 0;
      console.log(
        `▌ ${key}: € ${totaal.toLocaleString("nl-NL")} totaal — € ${perJaar.toLocaleString(
          "nl-NL",
        )} × ${aantal} jaar`,
      );
      if (sc.inspanningen) {
        for (const i of sc.inspanningen) {
          console.log(`    ${i.inspanningTitel}: € ${(i.totaalEuro ?? 0).toLocaleString("nl-NL")}`);
        }
      }
    }
  }

  console.log();
  console.log("═".repeat(80));
  console.log("CONCLUSIE");
  console.log("─".repeat(80));
  const dossierBevatIntern = sub.some((e) =>
    /intern|740u|1466 uur|1.466 uur|werkgroepuren|capaciteitskost/i.test(e.dossier?.kostenraming ?? ""),
  );
  if (dossierBevatIntern) {
    console.log("⚠ Dossier-kostenraming bevat NOG STEEDS interne-uren-tekst.");
    console.log("  → Het correctie-script (fix-dossier-en-dry-run.ts) is NIET succesvol gedraaid,");
    console.log("    of niet voor deze sessie. Dit verklaart waarom Herrekenen geen ander resultaat geeft.");
    console.log("  → Volgende stap: draai `npx tsx scripts/fix-dossier-en-dry-run.ts` (zonder --dry-run-only).");
  } else {
    console.log("✓ Dossier-kostenraming bevat geen interne-uren-tekst meer — correct gecorrigeerd.");
    console.log("  → Als Herrekenen in de wizard tóch oude bedragen toont:");
    console.log("    - Hard refresh (Ctrl+Shift+R) om localStorage uit Supabase te resyncen.");
    console.log("    - Of localStorage handmatig wissen (zie dev-tools → Application → Local Storage).");
  }
}

void main();
