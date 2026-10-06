// Dump volledige kostenraming-tekst per inspanning voor sessie d8b97442.
// Doel: zien wat er in de bron-tekst staat zodat Stap 8 die kan tonen i.p.v.
// zelf-verzonnen COMPONENT_BREAKDOWNS.
//
// Run: npx tsx scripts/dump-kostenraming-tekst.ts
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

async function main() {
  const sessionId = "d8b97442-ce8f-4134-b2c7-67dc8e3a3f93";
  const { data } = await supa.from("din_sessions").select("data").eq("id", sessionId).maybeSingle();
  if (!data) { console.error("not found"); process.exit(1); }

  const wiz = (data.data as Record<string, unknown>).crossAnalyseWizard as
    | { stepResults?: Record<string, Record<string, unknown>> }
    | undefined;
  const stap4 = wiz?.stepResults?.stap4 as Record<string, unknown> | undefined;
  const sub = (stap4?.subEffortAnalysis as Array<Record<string, unknown>> | undefined) ?? [];

  for (const i of sub) {
    const titel = i.titel as string;
    const dossier = i.dossier as Record<string, unknown> | undefined;
    const tekst = (dossier?.kostenraming as string | undefined) ?? "";
    const aannames = (i.businessCaseAannames as string[] | undefined) ?? [];
    const risicos = (i.businessCaseRisicos as string[] | undefined) ?? [];

    console.log("\n" + "═".repeat(100));
    console.log(`## ${titel}`);
    console.log("═".repeat(100));
    console.log("\n### Kostenraming-tekst (volledig):\n");
    console.log(tekst);
    console.log("\n### Business-case aannames:\n");
    for (const a of aannames) console.log(`  • ${a}`);
    console.log("\n### Business-case risico's:\n");
    for (const r of risicos) console.log(`  • ${r}`);
  }
}

main().catch((e) => { console.error(e); process.exit(1); });
