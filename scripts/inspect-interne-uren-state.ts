// Inspect interne uren state in Supabase voor sessie d8b97442.
// Output:
//   - selectiePerDomein per domein (rol → aantal personen)
//   - customFunctiesPerDomein (custom-rol-IDs → namen)
//   - urenAdvies per scenario per domein per fase per rol
//   - totale uren per scenario
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
    process.env[t.substring(0, e).trim()] = t.substring(e + 1).trim().replace(/^["']|["']$/g, "");
  }
}
loadEnvFile(join(process.cwd(), ".env.local"));

async function main() {
  const s = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
  );
  const sessionId = "d8b97442-ce8f-4134-b2c7-67dc8e3a3f93";
  const { data } = await s.from("din_sessions").select("data").eq("id", sessionId).maybeSingle();
  if (!data) {
    console.error("not found");
    process.exit(1);
  }
  const sess = data.data as Record<string, unknown>;
  const wiz = sess.crossAnalyseWizard as Record<string, unknown>;
  const stepResults = wiz.stepResults as Record<string, unknown>;

  // Dump full stap-states relevant for interne uren
  const dump: Record<string, unknown> = {
    stap1: stepResults.stap1,
    stap4: stepResults.stap4,
    stap5: stepResults.stap5,
    stap6: stepResults.stap6,
    stap7: stepResults.stap7,
    stap8: stepResults.stap8,
  };

  // Print summary
  console.log("═".repeat(80));
  console.log("INTERNE UREN STATE — sessie d8b97442");
  console.log("═".repeat(80));

  for (const [k, v] of Object.entries(dump)) {
    if (!v) continue;
    console.log(`\n--- ${k} ---`);
    const obj = v as Record<string, unknown>;
    console.log(`Keys: ${Object.keys(obj).join(", ")}`);
  }

  // Stap 7 detail (interne uren is hier)
  const stap4 = dump.stap4 as Record<string, unknown> | undefined;
  if (stap4) {
    const stap7Uren = stap4.stap7InterneUren as Record<string, unknown> | undefined;
    if (stap7Uren) {
      console.log("\n═".repeat(40));
      console.log("STAP 7 INTERNE UREN");
      console.log("═".repeat(40));
      console.log(`Keys: ${Object.keys(stap7Uren).join(", ")}`);

      // selectiePerDomein
      const sel = stap7Uren.selectiePerDomein as Record<string, unknown> | undefined;
      if (sel) {
        console.log("\n--- selectiePerDomein ---");
        for (const [domein, rollen] of Object.entries(sel)) {
          console.log(`\n  [${domein}]`);
          if (Array.isArray(rollen)) {
            for (const r of rollen) {
              const ro = r as Record<string, unknown>;
              console.log(`    ${ro.rolId} (${ro.aantal}) ${ro.label ? "— " + ro.label : ""}`);
            }
          }
        }
      }

      const cust = stap7Uren.customFunctiesPerDomein as Record<string, unknown> | undefined;
      if (cust) {
        console.log("\n--- customFunctiesPerDomein ---");
        for (const [domein, lijst] of Object.entries(cust)) {
          console.log(`  [${domein}]`);
          if (Array.isArray(lijst)) {
            for (const f of lijst) {
              const fo = f as Record<string, unknown>;
              console.log(`    ${fo.id} → "${fo.naam}" (cluster: ${fo.cluster ?? "-"})`);
            }
          }
        }
      }
    }

    const advies = stap4.interneUrenAdvies as Record<string, unknown> | undefined;
    if (advies) {
      console.log("\n═".repeat(40));
      console.log("INTERNE UREN ADVIES (stap4)");
      console.log("═".repeat(40));
      console.log(`Keys: ${Object.keys(advies).join(", ")}`);

      const scenarios = advies.scenarios as Record<string, unknown> | undefined;
      if (scenarios) {
        for (const [sk, sc] of Object.entries(scenarios)) {
          if (!sc) continue;
          console.log(`\n${sk.toUpperCase()}:`);
          const so = sc as Record<string, unknown>;
          console.log(`  keys: ${Object.keys(so).join(", ")}`);
          if ("totaalUren" in so) console.log(`  totaalUren: ${so.totaalUren}`);
          if ("urenPerJaar" in so && Array.isArray(so.urenPerJaar)) {
            const upj = so.urenPerJaar as Array<Record<string, unknown>>;
            console.log(`  urenPerJaar: ${upj.map((u) => `${u.jaar}:${u.uren}`).join("  ")}`);
          }
        }
      }
    }
  }

  // Write full snapshot to file for agents
  const outPath = join(process.cwd(), "INTERNE-UREN-SNAPSHOT.json");
  writeFileSync(outPath, JSON.stringify(dump, null, 2), "utf-8");
  console.log(`\n✓ Full snapshot written to ${outPath}`);
}

void main();
