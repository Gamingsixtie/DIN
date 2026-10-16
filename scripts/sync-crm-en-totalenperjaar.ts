// Twee fixes in één:
// (3) CRM advies + min20: totaalEuro €500 oppen zodat berekening sluit
//     (€817K → €817.500 en €1.372K → €1.372.500). verdelingPerJaar
//     en scenario.totaalGeraamdEuro mee aanpassen.
// (1) scenario.totalenPerJaar herrekenen op basis van de huidige
//     inspanningen.verdelingPerJaar — anders staat de check
//     "controleer" voor alle scenarios.

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

const supa = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
);
const fmt = (n: number) => `€${Math.round(n).toLocaleString("nl-NL")}`;

const CRM_TARGETS: Record<string, number> = {
  advies: 817_500,
  min20: 1_372_500,
};

interface Verd { jaar: number; euro: number; fase?: string }

async function main() {
  const sessionId = "d8b97442-ce8f-4134-b2c7-67dc8e3a3f93";
  const { data: row, error: readErr } = await supa
    .from("din_sessions").select("data").eq("id", sessionId).maybeSingle();
  if (readErr || !row) { console.error("not found"); process.exit(1); }

  const data = row.data as Record<string, unknown>;
  const wiz = data.crossAnalyseWizard as { stepResults?: Record<string, Record<string, unknown>> } | undefined;
  const stap4 = wiz?.stepResults?.stap4 as Record<string, unknown> | undefined;
  const begroting = stap4?.begrotingAdvies as
    | { startJaar?: number; scenarios?: Record<string, { aantalJaren?: number; totaalGeraamdEuro?: number; inspanningen?: Array<Record<string, unknown>>; totalenPerJaar?: Array<{ jaar: number; euro: number }> } | null> }
    | undefined;
  if (!begroting?.scenarios) { console.error("no scenarios"); process.exit(1); }

  // Stap A — CRM €500 oppen voor advies + min20
  console.log("=== A. CRM €500-fix ===");
  for (const [sk, target] of Object.entries(CRM_TARGETS)) {
    const sc = begroting.scenarios[sk];
    if (!sc) continue;
    const insp = (sc.inspanningen ?? []).find((i) => /crm.klantdashboard/i.test(i.inspanningTitel as string));
    if (!insp) { console.log(`(${sk}) crm niet gevonden`); continue; }
    const huidig = (insp.totaalEuro as number) ?? 0;
    const delta = target - huidig;
    console.log(`(${sk}) crm: ${fmt(huidig)} → ${fmt(target)}  (${delta >= 0 ? "+" : ""}${fmt(delta)})`);
    if (delta === 0) continue;
    insp.totaalEuro = target;
    const verd = insp.verdelingPerJaar as Verd[] | undefined;
    if (verd && verd.length > 0) {
      // €500 toevoegen aan laatste jaar
      verd[verd.length - 1].euro = (verd[verd.length - 1].euro ?? 0) + delta;
    }
    sc.totaalGeraamdEuro = (sc.totaalGeraamdEuro ?? 0) + delta;
  }

  // Stap B — scenario.totalenPerJaar herrekenen voor alle scenarios
  console.log("\n=== B. totalenPerJaar herrekenen ===");
  for (const sk of Object.keys(begroting.scenarios)) {
    const sc = begroting.scenarios[sk];
    if (!sc?.inspanningen || !sc.aantalJaren) continue;
    const startJaar = begroting.startJaar ?? 2026;
    const jaren = Array.from({ length: sc.aantalJaren }, (_, i) => startJaar + i);
    const nieuw: Array<{ jaar: number; euro: number }> = jaren.map((jaar) => {
      let euro = 0;
      for (const insp of sc.inspanningen ?? []) {
        const verd = insp.verdelingPerJaar as Verd[] | undefined;
        const jaarRij = verd?.find((v) => v.jaar === jaar);
        euro += jaarRij?.euro ?? 0;
      }
      return { jaar, euro };
    });
    sc.totalenPerJaar = nieuw;
    const sumNieuw = nieuw.reduce((s, t) => s + t.euro, 0);
    console.log(`(${sk}) totalenPerJaar: ${nieuw.map((t) => `${t.jaar}:${fmt(t.euro)}`).join(", ")}  Σ=${fmt(sumNieuw)} vs scenario.totaal=${fmt(sc.totaalGeraamdEuro ?? 0)}`);
  }

  data.version = ((data.version as number | undefined) ?? 0) + 1;
  data.updatedAt = new Date().toISOString();

  const { error: writeErr } = await supa
    .from("din_sessions")
    .update({ data, updated_at: new Date().toISOString() })
    .eq("id", sessionId);
  if (writeErr) { console.error("write fail:", writeErr.message); process.exit(1); }
  console.log(`\n✓ Klaar (version ${data.version})`);
}

main().catch((e) => { console.error(e); process.exit(1); });
