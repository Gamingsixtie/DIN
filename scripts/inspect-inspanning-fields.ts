// Check welke velden er per inspanning in scenario.inspanningen[] staan voor
// sessie d8b97442. Specifiek of eenmaligMid / structureelMidPerJr aanwezig
// zijn (gezet door begroting-advies route.ts regels 1115-1125).
//
// Run: npx tsx scripts/inspect-inspanning-fields.ts
// READ-ONLY.

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

async function main() {
  const { data } = await supa.from("din_sessions").select("data").eq("id", sessionId).maybeSingle();
  if (!data) { console.error("not found"); process.exit(1); }

  const wiz = (data.data as Record<string, unknown>).crossAnalyseWizard as
    | { stepResults?: Record<string, Record<string, unknown>> }
    | undefined;
  const stap4 = wiz?.stepResults?.stap4 as Record<string, unknown> | undefined;
  const begroting = stap4?.begrotingAdvies as
    | { scenarios?: Record<string, { inspanningen?: Array<Record<string, unknown>> } | null> }
    | undefined;

  const scenarios = begroting?.scenarios ?? {};
  for (const [k, sc] of Object.entries(scenarios)) {
    if (!sc) continue;
    console.log(`\n══ Scenario: ${k} ══`);
    const ins = sc.inspanningen ?? [];
    if (ins.length === 0) {
      console.log("  geen inspanningen");
      continue;
    }
    const first = ins[0];
    console.log("  Velden in inspanningen[0]:");
    for (const key of Object.keys(first)) {
      const v = (first as Record<string, unknown>)[key];
      const t = typeof v;
      const preview =
        Array.isArray(v) ? `Array(${v.length})` :
        v === null ? "null" :
        t === "object" ? "Object" :
        t === "string" ? `"${(v as string).slice(0, 50)}"` :
        String(v);
      console.log(`    ${key.padEnd(28)}  ${t.padEnd(8)}  ${preview}`);
    }

    // Specifiek de raming-velden voor alle inspanningen
    console.log("\n  Raming-velden per inspanning:");
    for (const i of ins) {
      const titel = (i as Record<string, unknown>).inspanningTitel as string;
      const eMid = (i as Record<string, unknown>).eenmaligMid;
      const eLow = (i as Record<string, unknown>).eenmaligLow;
      const eHigh = (i as Record<string, unknown>).eenmaligHigh;
      const sMid = (i as Record<string, unknown>).structureelMidPerJr;
      const sLow = (i as Record<string, unknown>).structureelLowPerJr;
      const sHigh = (i as Record<string, unknown>).structureelHighPerJr;
      const tot = (i as Record<string, unknown>).totaalEuro;
      console.log(
        `    ${(titel ?? "?").slice(0, 50).padEnd(52)} ` +
        `eenm[${eLow ?? "—"}/${eMid ?? "—"}/${eHigh ?? "—"}] ` +
        `str[${sLow ?? "—"}/${sMid ?? "—"}/${sHigh ?? "—"}]/jr ` +
        `tot=${tot ?? "—"}`
      );
    }
    break; // genoeg met één scenario
  }
}

main().catch((e) => { console.error(e); process.exit(1); });
