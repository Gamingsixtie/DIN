// READ-ONLY: dump huidige state van mens-domein om revert te plannen.
// Inspecteert:
//   - vastgesteldeUrenPerInspanning[mens].rollen[] (welke functieIds, hoeveel uren totaal)
//   - scenarios[*].domeinen[mens].jaren[].rollen[] (welke 5 cat1-IDs zitten waar)
//   - scenarios[*] totaal uren/kosten
//   - selectiePerDomein per domein vs vastgesteldeUrenPerInspanning per domein (counts)
//
// Schrijft niets naar Supabase.

import { createClient } from "@supabase/supabase-js";
import { readFileSync, existsSync, writeFileSync } from "fs";
import { join } from "path";

function loadEnvFile(p: string) {
  if (!existsSync(p)) return;
  const c = readFileSync(p, "utf-8");
  for (const l of c.split(/\r?\n/)) {
    const t = l.trim();
    if (!t || t.startsWith("#")) continue;
    const e = t.indexOf("=");
    if (e === -1) continue;
    const key = t.substring(0, e).trim();
    const val = t.substring(e + 1).trim().replace(/^["']|["']$/g, "");
    if (!process.env[key]) process.env[key] = val;
  }
}
loadEnvFile(join(process.cwd(), ".env.local"));

const SESSION_ID = "d8b97442-ce8f-4134-b2c7-67dc8e3a3f93";
const REVERT_IDS = new Set([
  "accountmanager_a",
  "accountmanager_b",
  "klantenservice_a",
  "klantenservice_b",
  "teamleider_klantenservice",
]);

type Json = Record<string, unknown>;

async function main() {
  const supa = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
  );

  const { data: row, error } = await supa
    .from("din_sessions")
    .select("data, updated_at")
    .eq("id", SESSION_ID)
    .maybeSingle();

  if (error || !row) {
    console.error("Sessie niet gevonden:", error);
    process.exit(1);
  }

  console.log(`updated_at: ${(row as { updated_at: string }).updated_at}`);

  const sess = (row as { data: Json }).data;
  const stap4 =
    ((sess.crossAnalyseWizard as Json)?.stepResults as Json)?.stap4 as Json;
  const stap7 = stap4.stap7InterneUren as Json;

  if (!stap7) {
    console.error("Geen stap7 — stop");
    process.exit(1);
  }

  // Marker check
  console.log("\n=== Markers ===");
  console.log(
    "stilleSelectiesMensDoorgevoerd:",
    JSON.stringify((stap7.stilleSelectiesMensDoorgevoerd as Json) ?? null, null, 2)?.slice(0, 200),
  );
  console.log(
    "stilleSelectiesMensCat1Reverted:",
    JSON.stringify((stap7.stilleSelectiesMensCat1Reverted as Json) ?? null, null, 2),
  );

  // Vastgestelde uren — counts per domein
  const vastgesteld = stap7.vastgesteldeUrenPerInspanning as Array<{
    domein: string;
    rollen: Array<{ functieId: string; functieNaam: string; urenTotaal: number; aantal?: number }>;
  }>;

  console.log("\n=== vastgesteldeUrenPerInspanning per domein ===");
  for (const blok of vastgesteld) {
    const aantalSum = blok.rollen.reduce((s, r) => s + (r.aantal ?? 1), 0);
    console.log(
      `  ${blok.domein}: ${blok.rollen.length} rollen, sum-aantal=${aantalSum}`,
    );
    if (blok.domein === "mens") {
      console.log("    Mens-rollen:");
      for (const r of blok.rollen) {
        const tag = REVERT_IDS.has(r.functieId) ? " ← REVERT" : "";
        console.log(
          `      - ${r.functieId} (${r.functieNaam}) aantal=${r.aantal ?? "(geen)"} urenTotaal=${r.urenTotaal}${tag}`,
        );
      }
    }
  }

  // Selectie per domein
  const selectiePerDomein = stap7.selectiePerDomein as Json;
  console.log("\n=== selectiePerDomein counts ===");
  if (selectiePerDomein && typeof selectiePerDomein === "object") {
    for (const [dom, val] of Object.entries(selectiePerDomein as Record<string, Record<string, Json>>)) {
      const ids = Object.keys(val);
      let aantalSum = 0;
      for (const id of ids) {
        const ent = val[id] as Record<string, unknown>;
        const aantal = (ent?.aantal as number | undefined) ?? 1;
        aantalSum += aantal;
      }
      console.log(`  ${dom}: ${ids.length} IDs, sum-aantal=${aantalSum}`);
    }
  }

  // Scenario totalen
  const scenarios = stap7.scenarios as Record<string, Json | null>;
  console.log("\n=== Scenario totalen (huidig) ===");
  for (const [scKey, sc] of Object.entries(scenarios)) {
    if (!sc) continue;
    const scenario = sc as {
      totaalUren?: number;
      totaalKosten?: number;
      domeinen: Array<{ domein: string; totaalUren?: number; totaalKosten?: number; jaren: Array<{ rollen: Array<{ functieId: string; uren: number }> }> }>;
    };
    const mensDom = scenario.domeinen.find((d) => d.domein === "mens");
    let cat1MensUrenInScenario = 0;
    if (mensDom) {
      for (const j of mensDom.jaren) {
        for (const r of j.rollen) {
          if (REVERT_IDS.has(r.functieId)) cat1MensUrenInScenario += r.uren;
        }
      }
    }
    console.log(
      `  ${scKey}: scenario-totaal=${scenario.totaalUren}u, mens-domein=${mensDom?.totaalUren}u; cat1-mens-uren-in-scenario=${cat1MensUrenInScenario}u`,
    );
  }

  // Save snapshot
  writeFileSync(
    join(process.cwd(), "AUDIT-PRE-REVERT-MENS-CAT1.json"),
    JSON.stringify(
      {
        scenarios: Object.fromEntries(
          Object.entries(scenarios).map(([k, v]) => {
            if (!v) return [k, null];
            const sc = v as { totaalUren?: number; totaalKosten?: number; domeinen: Array<{ domein: string; totaalUren?: number; totaalKosten?: number }> };
            return [
              k,
              {
                totaalUren: sc.totaalUren,
                totaalKosten: sc.totaalKosten,
                mens: sc.domeinen.find((d) => d.domein === "mens"),
              },
            ];
          }),
        ),
        marker: stap7.stilleSelectiesMensDoorgevoerd ?? null,
      },
      null,
      2,
    ),
    "utf-8",
  );
  console.log("\n✓ Snapshot → AUDIT-PRE-REVERT-MENS-CAT1.json");
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
