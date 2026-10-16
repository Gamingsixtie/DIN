// Tijdelijk diagnose-script — toont de huidige stap7InterneUren state
// per scenario. Run: npx tsx scripts/check-uren-temp.ts
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
    process.env[t.substring(0, e).trim()] = t.substring(e + 1).trim().replace(/^["']|["']$/g, "");
  }
}
loadEnvFile(join(process.cwd(), ".env.local"));

async function main() {
  const s = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
  );

  const { data } = await s
    .from("din_sessions")
    .select("data, updated_at")
    .eq("id", "d8b97442-ce8f-4134-b2c7-67dc8e3a3f93")
    .maybeSingle();

  if (!data) {
    console.log("Sessie niet gevonden");
    process.exit(1);
  }

  const sess = data.data as Record<string, unknown>;
  const wiz = sess.crossAnalyseWizard as { stepResults?: Record<string, unknown>; currentStep?: number; completedSteps?: number[] } | undefined;

  console.log("Versie:", sess.version, "| Updated:", data.updated_at);
  console.log("currentStep:", wiz?.currentStep, "completedSteps:", wiz?.completedSteps);
  console.log("stepResults keys:", Object.keys(wiz?.stepResults ?? {}));
  console.log();

  // stap7InterneUren is genest binnen stap4 (niet direct onder stepResults)
  const stap4 = wiz?.stepResults?.stap4 as Record<string, unknown> | undefined;
  const stap7 = stap4?.stap7InterneUren as Record<string, unknown> | undefined;

  if (!stap7) {
    console.log("Geen stap7-data — zoeken in alle stepResults:");
    for (const [k, v] of Object.entries(wiz?.stepResults ?? {})) {
      const keys = Object.keys(v as object);
      console.log(`  ${k}: keys = ${keys.slice(0, 8).join(", ")}${keys.length > 8 ? "..." : ""}`);
    }
    return;
  }

  // Toon optimaal per domein (alle scenarios geven vergelijkbare totalen)
  const optimaal = (stap7.scenarios as Record<string, unknown>)?.optimaal as
    | { domeinen?: Array<{ domein: string; totaalUren?: number; totaalKosten?: number; jaren: Array<{ jaar: number; totaalUren?: number; rollen: Array<{ functieNaam: string; uren: number; uurtarief: number }> }> }> }
    | undefined;
  if (optimaal?.domeinen) {
    console.log("=== OPTIMAAL — per domein ===");
    for (const d of optimaal.domeinen) {
      console.log(`▌ ${d.domein}: ${(d.totaalUren ?? 0).toLocaleString("nl-NL")} uren | € ${(d.totaalKosten ?? 0).toLocaleString("nl-NL")}`);
      const rollenTotaal: Record<string, number> = {};
      for (const j of d.jaren) {
        for (const r of j.rollen) {
          rollenTotaal[r.functieNaam] = (rollenTotaal[r.functieNaam] ?? 0) + r.uren;
        }
      }
      for (const [rol, u] of Object.entries(rollenTotaal).sort((a, b) => b[1] - a[1])) {
        console.log(`    ${rol}: ${u.toLocaleString("nl-NL")} uren`);
      }
    }
    console.log();
  }
  const scenarios = stap7.scenarios as Record<string, unknown> | undefined;
  console.log("Scenarios:", Object.keys(scenarios ?? {}));
  console.log();

  for (const [key, scen] of Object.entries(scenarios ?? {})) {
    if (!scen) continue;
    const sc = scen as {
      scenarioLabel?: string;
      startJaar?: number;
      aantalJaren?: number;
      totaalUren?: number;
      totaalKosten?: number;
      totalenPerJaar?: Array<{ jaar: number; uren: number; kosten: number; urenBudget?: number }>;
    };
    console.log("▌", key, "|", sc.scenarioLabel ?? "");
    console.log("  startJaar:", sc.startJaar, "| aantalJaren:", sc.aantalJaren);
    console.log(
      "  Totaal:",
      (sc.totaalUren ?? 0).toLocaleString("nl-NL"),
      "uren |",
      (sc.totaalKosten ?? 0).toLocaleString("nl-NL"),
      "eur",
    );
    if (sc.totalenPerJaar) {
      for (const t of sc.totalenPerJaar) {
        console.log(
          "   ",
          t.jaar,
          "→",
          t.uren.toLocaleString("nl-NL"),
          "uren |",
          (t.kosten ?? 0).toLocaleString("nl-NL"),
          "eur",
        );
      }
    }
    console.log();
  }
}

void main();
