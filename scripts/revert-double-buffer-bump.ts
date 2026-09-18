// Correctie: apply-risico-buffer-bump werd 2x gedraaid → CRM €48K te hoog
// per scenario. Trek €24K per CRM af + sync totalenPerJaar.
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

type Cell = { jaar: number; euro: number; fase?: string; activiteit?: string };
type Insp = { inspanningTitel: string; totaalEuro?: number; verdelingPerJaar?: Cell[] };
type Scen = { aantalJaren?: number; jaarlijksBudgetEuro?: number; inspanningen?: Insp[]; totaalGeraamdEuro?: number; totalenPerJaar?: Array<{ jaar: number; euro: number; percentage?: number }> };

async function main() {
  const s = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!);
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

  const TARGETS = { advies: 1_183_000, plus20: 1_294_000, optimaal: 1_514_000, min20: 1_843_500 };

  for (const [sk, sc] of Object.entries(adv.scenarios ?? {})) {
    if (!sc?.inspanningen) continue;
    const target = (TARGETS as Record<string, number>)[sk];
    if (!target) continue;
    const current = sc.totaalGeraamdEuro ?? 0;
    const delta = target - current;
    if (delta === 0) {
      console.log(`▌ ${sk}: al op target € ${target.toLocaleString("nl-NL")}`);
      continue;
    }
    const crm = sc.inspanningen.find((i) => i.inspanningTitel.includes("CRM"));
    if (!crm) continue;
    const oldCrmTotaal = crm.totaalEuro ?? 0;
    const newCrmTotaal = oldCrmTotaal + delta;
    crm.totaalEuro = newCrmTotaal;
    // Verdeel delta proportioneel over jaren > 2026
    const laterCells = (crm.verdelingPerJaar ?? []).filter((c) => c.jaar > startJaar);
    const sumLater = laterCells.reduce((s, c) => s + c.euro, 0);
    if (sumLater > 0) {
      let appliedDelta = 0;
      for (let i = 0; i < laterCells.length; i++) {
        const cell = laterCells[i];
        let cellDelta: number;
        if (i === laterCells.length - 1) {
          cellDelta = delta - appliedDelta;
        } else {
          cellDelta = Math.round((delta * cell.euro) / sumLater / 1000) * 1000;
        }
        cell.euro = Math.max(0, cell.euro + cellDelta);
        appliedDelta += cellDelta;
      }
    }
    sc.totaalGeraamdEuro = sc.inspanningen.reduce((s, i) => s + (i.totaalEuro ?? 0), 0);
    console.log(`▌ ${sk}: € ${current.toLocaleString("nl-NL")} → € ${sc.totaalGeraamdEuro.toLocaleString("nl-NL")} (delta ${delta >= 0 ? "+" : ""}€ ${delta.toLocaleString("nl-NL")} op CRM)`);

    // Recompute totalenPerJaar per scenario
    if (sc.totalenPerJaar) {
      for (const t of sc.totalenPerJaar) {
        let sum = 0;
        for (const ins of sc.inspanningen) {
          const cell = ins.verdelingPerJaar?.find((c) => c.jaar === t.jaar);
          sum += cell?.euro ?? 0;
        }
        t.euro = sum;
        if (sc.totaalGeraamdEuro && sc.totaalGeraamdEuro > 0) {
          t.percentage = Math.round((sum / sc.totaalGeraamdEuro) * 1000) / 10;
        }
      }
    }
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
  console.log("\n✓ Correcties weggeschreven naar Supabase.");
}

void main();
