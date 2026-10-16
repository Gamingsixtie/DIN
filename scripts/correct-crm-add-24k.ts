// Correctie: apply-volledig-aanbeveling werd 2× gedraaid → CRM €24K te laag
// per scenario. Voeg €24K terug op CRM, proportioneel over cellen > 2026.
// Re-sync totalenPerJaar + scenario.totaalGeraamdEuro daarna.
// Targets na fix:
//   ADVIES CRM €817K, scen €1338K
//   PLUS20 CRM €910K, scen €1486K
//   OPTIMAAL CRM €1095K, scen €1750K (cap exact)
//   MIN20 CRM €1372K, scen €2000K (cap exact)
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
type Scen = {
  aantalJaren?: number;
  jaarlijksBudgetEuro?: number;
  inspanningen?: Insp[];
  totaalGeraamdEuro?: number;
  totalenPerJaar?: Array<{ jaar: number; euro: number; percentage?: number }>;
};

const TARGETS_CRM: Record<string, number> = {
  advies: 817_000,
  plus20: 910_000,
  optimaal: 1_095_000,
  min20: 1_372_000,
};

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
    const target = TARGETS_CRM[sk];
    if (!target) continue;
    const cap = sc.jaarlijksBudgetEuro ?? 0;
    const aantalJaren = sc.aantalJaren ?? 4;
    const jaren = Array.from({ length: aantalJaren }, (_, i) => startJaar + i);

    const crm = sc.inspanningen.find((i) => i.inspanningTitel.toLowerCase().includes("crm"));
    if (!crm) {
      console.warn(`Skip ${sk}: geen CRM`);
      continue;
    }
    const current = crm.totaalEuro ?? 0;
    const delta = target - current;
    if (delta === 0) {
      console.log(`▌ ${sk}: CRM al op € ${target.toLocaleString("nl-NL")}`);
      continue;
    }

    // Verdeel delta proportioneel over cellen > 2026, maar respecteer cap per jaar
    const laterCells = (crm.verdelingPerJaar ?? []).filter((c) => c.jaar > startJaar);
    // Sorteer op headroom (cap minus huidig total per jaar)
    const yearTotals: Record<number, number> = {};
    for (const j of jaren) yearTotals[j] = 0;
    for (const ins of sc.inspanningen) {
      for (const c of ins.verdelingPerJaar ?? []) {
        yearTotals[c.jaar] = (yearTotals[c.jaar] ?? 0) + c.euro;
      }
    }

    let toAdd = delta;
    // Eerst proberen: proportioneel toevoegen aan latere cellen, max headroom cap
    const sumLater = laterCells.reduce((s, c) => s + c.euro, 0);
    if (sumLater > 0) {
      // bereken proportionele bijdrage per cel
      for (let pass = 0; pass < 20 && toAdd > 0; pass++) {
        let didAdd = false;
        for (const c of laterCells) {
          if (toAdd <= 0) break;
          const headroom = cap - yearTotals[c.jaar];
          if (headroom <= 0) continue;
          const propShare = sumLater > 0 ? Math.round(((delta * c.euro) / sumLater) / 1000) * 1000 : 0;
          let chunk = Math.min(propShare > 0 ? propShare : 1000, headroom, toAdd);
          if (chunk <= 0) continue;
          c.euro += chunk;
          yearTotals[c.jaar] += chunk;
          toAdd -= chunk;
          didAdd = true;
        }
        if (!didAdd) break;
      }
    }

    crm.totaalEuro = (crm.totaalEuro ?? 0) + (delta - toAdd);
    if (toAdd > 0) {
      console.warn(`  ⚠ ${sk}: kon nog € ${toAdd.toLocaleString("nl-NL")} niet kwijt — cap blokkeert`);
    }

    // Recompute scenario totaalEuro per inspanning (consistency)
    for (const ins of sc.inspanningen) {
      ins.totaalEuro = (ins.verdelingPerJaar ?? []).reduce((s, c) => s + c.euro, 0);
    }
    sc.totaalGeraamdEuro = sc.inspanningen.reduce((s, i) => s + (i.totaalEuro ?? 0), 0);
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

    console.log(
      `▌ ${sk}: CRM € ${current.toLocaleString("nl-NL")} → € ${
        crm.totaalEuro!.toLocaleString("nl-NL")
      }, scen € ${sc.totaalGeraamdEuro.toLocaleString("nl-NL")}`,
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
  console.log("\n✓ CRM-correctie weggeschreven naar Supabase.");
}

void main();
