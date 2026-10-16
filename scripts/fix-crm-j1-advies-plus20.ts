// ADVIES + PLUS20 hebben CRM €793K en €886K (24K te laag).
// Voeg €24K toe aan CRM 2026-cel (heeft headroom — onder cap).
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

type Cell = { jaar: number; euro: number };
type Insp = { inspanningTitel: string; totaalEuro?: number; verdelingPerJaar?: Cell[] };
type Scen = {
  aantalJaren?: number;
  jaarlijksBudgetEuro?: number;
  inspanningen?: Insp[];
  totaalGeraamdEuro?: number;
  totalenPerJaar?: Array<{ jaar: number; euro: number; percentage?: number }>;
};

const TARGETS: Record<string, number> = { advies: 817_000, plus20: 910_000 };

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
  const stap4 = (wiz.stepResults as Record<string, unknown>).stap4 as Record<string, unknown>;
  const adv = stap4.begrotingAdvies as { startJaar?: number; scenarios?: Record<string, Scen | null> };
  const startJaar = adv.startJaar ?? 2026;

  for (const [sk, sc] of Object.entries(adv.scenarios ?? {})) {
    if (!sc?.inspanningen) continue;
    const target = TARGETS[sk];
    if (!target) continue;
    const crm = sc.inspanningen.find((i) => i.inspanningTitel.toLowerCase().includes("crm"));
    if (!crm) continue;
    const current = crm.totaalEuro ?? 0;
    const delta = target - current;
    if (delta <= 0) continue;
    const j1 = (crm.verdelingPerJaar ?? []).find((c) => c.jaar === startJaar);
    if (!j1) continue;
    j1.euro += delta;
    crm.totaalEuro = target;
    sc.totaalGeraamdEuro = sc.inspanningen.reduce((s, i) => s + (i.totaalEuro ?? 0), 0);
    if (sc.totalenPerJaar) {
      const t2026 = sc.totalenPerJaar.find((t) => t.jaar === startJaar);
      if (t2026) t2026.euro += delta;
      // Re-percentages
      for (const t of sc.totalenPerJaar) {
        if (sc.totaalGeraamdEuro && sc.totaalGeraamdEuro > 0) {
          t.percentage = Math.round((t.euro / sc.totaalGeraamdEuro) * 1000) / 10;
        }
      }
    }
    console.log(
      `▌ ${sk}: CRM € ${current.toLocaleString("nl-NL")} → € ${target.toLocaleString("nl-NL")}, scen € ${sc.totaalGeraamdEuro.toLocaleString("nl-NL")}`,
    );
  }

  const newData = {
    ...sess,
    crossAnalyseWizard: {
      ...(sess.crossAnalyseWizard as object),
      stepResults: { ...(wiz.stepResults ?? {}), stap4: { ...stap4, begrotingAdvies: adv } },
    },
  };
  const { error } = await s.from("din_sessions").update({ data: newData }).eq("id", sessionId);
  if (error) {
    console.error("FOUT:", error.message);
    process.exit(1);
  }
  console.log("\n✓ ADVIES + PLUS20 CRM J1 +24K.");
}

void main();
