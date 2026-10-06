// READ-ONLY: verifieer per domein:
//   selectiePerDomein totaal personen vs vastgesteldeUrenPerInspanning totaal personen-met-uren
// Gebruikt selectiePerDomein.<domein>.<id>.aantal als bron voor het aantal per ID.
// Voor vastgesteldeUrenPerInspanning telt elk rol-record als personen via:
//   selectiePerDomein[domein][functieId].aantal (zelfde aantal als in selectie)
// — want vastgesteldeUrenPerInspanning heeft géén eigen aantal-veld; de uren zijn al
// het cumulatieve totaal voor alle personen in die rol.

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

type Json = Record<string, unknown>;

async function main() {
  const supa = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
  );

  const { data: row } = await supa
    .from("din_sessions")
    .select("data")
    .eq("id", SESSION_ID)
    .maybeSingle();
  const sess = (row as { data: Json }).data;
  const stap4 = ((sess.crossAnalyseWizard as Json)?.stepResults as Json)?.stap4 as Json;
  const stap7 = stap4.stap7InterneUren as Json;

  const sel = stap7.selectiePerDomein as Record<string, Record<string, Record<string, unknown>>>;
  const vast = stap7.vastgesteldeUrenPerInspanning as Array<{
    domein: string;
    rollen: Array<{ functieId: string; functieNaam: string; urenTotaal: number }>;
  }>;

  const domeinen = ["mens", "cultuur", "data_systemen", "processen"];

  console.log("\n=== Verificatie aantallen per domein ===");
  console.log(
    "domein | sel-IDs | sel-personen | vast-IDs | vast-personen-met-uren | verschil-IDs | verschil-personen | uren-totaal",
  );
  console.log("-".repeat(110));

  type Row = {
    domein: string;
    selIDs: number;
    selPersonen: number;
    vastIDs: number;
    vastPersonenMetUren: number;
    verschilIDs: number;
    verschilPersonen: number;
    urenTotaal: number;
    stilleIDs: Array<{ id: string; aantal: number; reason: string }>;
  };
  const rows: Row[] = [];

  for (const dom of domeinen) {
    const selDom = sel?.[dom] ?? {};
    const selIds = Object.keys(selDom);
    let selPersonen = 0;
    for (const id of selIds) {
      const ent = selDom[id];
      const aantal = (ent?.aantal as number | undefined) ?? 1;
      selPersonen += aantal;
    }

    const vastBlok = vast.find((b) => b.domein === dom);
    const vastIds = vastBlok?.rollen.map((r) => r.functieId) ?? [];
    let vastPersonenMetUren = 0;
    let urenTotaal = 0;
    for (const r of vastBlok?.rollen ?? []) {
      // Bepaal aantal uit selectiePerDomein (of 1 als niet aanwezig — custom rol)
      const ent = selDom[r.functieId];
      const aantal = (ent?.aantal as number | undefined) ?? 1;
      vastPersonenMetUren += aantal;
      urenTotaal += r.urenTotaal ?? 0;
    }

    // Stille IDs = selectie-IDs zonder vastgestelde-uren-record
    const vastIdSet = new Set(vastIds);
    const stilleIDs: Array<{ id: string; aantal: number; reason: string }> = [];
    for (const id of selIds) {
      if (!vastIdSet.has(id)) {
        const ent = selDom[id];
        const aantal = (ent?.aantal as number | undefined) ?? 1;
        const reasons: string[] = [];
        if (ent?.stakeholder === true) reasons.push("stakeholder");
        if (ent?.reviewVereist === true) reasons.push("reviewVereist");
        if (reasons.length === 0) reasons.push("niet gemarkeerd");
        stilleIDs.push({ id, aantal, reason: reasons.join("+") });
      }
    }

    rows.push({
      domein: dom,
      selIDs: selIds.length,
      selPersonen,
      vastIDs: vastIds.length,
      vastPersonenMetUren,
      verschilIDs: selIds.length - vastIds.length,
      verschilPersonen: selPersonen - vastPersonenMetUren,
      urenTotaal,
      stilleIDs,
    });

    console.log(
      `${dom.padEnd(15)} | ${String(selIds.length).padStart(7)} | ${String(selPersonen).padStart(12)} | ${String(vastIds.length).padStart(8)} | ${String(vastPersonenMetUren).padStart(22)} | ${String(selIds.length - vastIds.length).padStart(12)} | ${String(selPersonen - vastPersonenMetUren).padStart(17)} | ${String(urenTotaal).padStart(11)}`,
    );
  }

  console.log("\n=== Stille IDs per domein (selectiePerDomein-IDs zonder uren) ===");
  for (const r of rows) {
    if (r.stilleIDs.length === 0) {
      console.log(`  ${r.domein}: GEEN stille IDs`);
      continue;
    }
    const cat2 = r.stilleIDs.filter((x) => x.reason.includes("stakeholder")).length;
    const cat3 = r.stilleIDs.filter((x) => x.reason.includes("reviewVereist")).length;
    const niet = r.stilleIDs.filter((x) => x.reason === "niet gemarkeerd").length;
    const personenTotaal = r.stilleIDs.reduce((s, x) => s + x.aantal, 0);
    console.log(
      `  ${r.domein}: ${r.stilleIDs.length} IDs / ${personenTotaal} personen (cat2-stakeholder=${cat2} IDs, cat3-review=${cat3} IDs, niet-gemarkeerd=${niet} IDs)`,
    );
    for (const s of r.stilleIDs) {
      console.log(`     - ${s.id} (aantal=${s.aantal}) → ${s.reason}`);
    }
  }

  // Save to JSON
  writeFileSync(
    join(process.cwd(), "AUDIT-REVERT-VERIFICATIE.json"),
    JSON.stringify({ rows, scenarioMarker: stap7.stilleSelectiesMensCat1Reverted ?? null }, null, 2),
    "utf-8",
  );
  console.log("\n✓ → AUDIT-REVERT-VERIFICATIE.json");

  // Scenario totalen check
  console.log("\n=== Scenario totalen na revert ===");
  const scenarios = stap7.scenarios as Record<string, { totaalUren?: number; domeinen: Array<{ domein: string; totaalUren?: number }> }>;
  const verwacht = {
    advies: { scenario: 5762, mens: 3022 },
    plus20: { scenario: 5860, mens: 3021 },
    optimaal: { scenario: 5934, mens: 3021 },
    min20: { scenario: 6307, mens: 3019 },
  } as const;
  for (const [sk, sc] of Object.entries(scenarios)) {
    if (!sc) continue;
    const mens = sc.domeinen.find((d) => d.domein === "mens");
    const exp = (verwacht as Record<string, { scenario: number; mens: number }>)[sk];
    const okScen = exp ? sc.totaalUren === exp.scenario : true;
    const okMens = exp ? mens?.totaalUren === exp.mens : true;
    console.log(
      `  ${sk}: scenario=${sc.totaalUren}u (verwacht ${exp?.scenario}, ${okScen ? "OK" : "MISMATCH"}) | mens=${mens?.totaalUren}u (verwacht ${exp?.mens}, ${okMens ? "OK" : "MISMATCH"})`,
    );
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
