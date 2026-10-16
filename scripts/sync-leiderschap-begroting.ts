// Pas leiderschap-totaalEuro per scenario aan zodat berekening (uit
// known-breakdowns) sluit op begroting in §4.1.
//
// Doelwaarden (uit BEGROTING-AANBEVELING.md):
//   optimaal: €165.000 → €161.000  (-€4.000)
//   plus20:   €145.000 → €142.000  (-€3.000)
//   advies:   €130.000 → €132.500  (+€2.500)
//   min20:    €195.000 → €189.500  (-€5.500)
//
// verdelingPerJaar wordt proportioneel bijgesteld, scenario.totaalGeraamdEuro
// gaat met het delta mee.

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

const TARGETS: Record<string, number> = {
  optimaal: 161_000,
  plus20: 142_000,
  advies: 132_500,
  min20: 189_500,
};

async function main() {
  const sessionId = "d8b97442-ce8f-4134-b2c7-67dc8e3a3f93";
  const { data: row, error: readErr } = await supa
    .from("din_sessions").select("data").eq("id", sessionId).maybeSingle();
  if (readErr || !row) { console.error("not found"); process.exit(1); }

  const data = row.data as Record<string, unknown>;
  const wiz = data.crossAnalyseWizard as { stepResults?: Record<string, Record<string, unknown>> } | undefined;
  const stap4 = wiz?.stepResults?.stap4 as Record<string, unknown> | undefined;
  const begroting = stap4?.begrotingAdvies as
    | { scenarios?: Record<string, { totaalGeraamdEuro?: number; inspanningen?: Array<Record<string, unknown>> } | null> }
    | undefined;
  if (!begroting?.scenarios) { console.error("no scenarios"); process.exit(1); }

  for (const [sk, target] of Object.entries(TARGETS)) {
    const sc = begroting.scenarios[sk];
    if (!sc) { console.log(`(${sk}) scenario niet aanwezig — overslaan`); continue; }
    const insp = (sc.inspanningen ?? []).find((i) => /leiderschap/i.test(i.inspanningTitel as string));
    if (!insp) { console.log(`(${sk}) leiderschap niet gevonden — overslaan`); continue; }

    const huidig = (insp.totaalEuro as number) ?? 0;
    const delta = target - huidig;
    console.log(`(${sk}) leiderschap: ${fmt(huidig)} → ${fmt(target)}  (delta ${delta >= 0 ? "+" : ""}${fmt(delta)})`);
    if (delta === 0) continue;

    insp.totaalEuro = target;

    const verd = insp.verdelingPerJaar as Array<{ jaar: number; euro: number; fase?: string }> | undefined;
    if (verd && verd.length > 0) {
      const totaalOud = verd.reduce((s, v) => s + (v.euro ?? 0), 0);
      if (totaalOud > 0) {
        const factor = target / totaalOud;
        let lopend = 0;
        for (let i = 0; i < verd.length; i++) {
          if (i === verd.length - 1) {
            verd[i].euro = target - lopend;
          } else {
            const nieuw = Math.round(((verd[i].euro ?? 0) * factor) / 1000) * 1000;
            verd[i].euro = nieuw;
            lopend += nieuw;
          }
        }
        const sumNieuw = verd.reduce((s, v) => s + (v.euro ?? 0), 0);
        console.log(`  verdeling: ${verd.map((v) => `${v.jaar}:${fmt(v.euro)}`).join(", ")}  Σ=${fmt(sumNieuw)}`);
      }
    }

    const oudTotaal = sc.totaalGeraamdEuro ?? 0;
    sc.totaalGeraamdEuro = oudTotaal + delta;
    console.log(`  scenario.totaalGeraamdEuro: ${fmt(oudTotaal)} → ${fmt(sc.totaalGeraamdEuro)}`);
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
