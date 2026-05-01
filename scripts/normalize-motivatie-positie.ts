// Normaliseer motivatie + volgorde.reden (positie) per inspanning over
// alle scenarios. Canonical = optimaal scenario (meestal rijkste tekst).
// Resultaat: zelfde inspanning heeft identieke motivatie + positie over
// alle 4 scenarios. Per-scenario verschillen blijven alleen in
// scenario.samenvatting + scenario.prioriteitAdvies.
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

type Insp = {
  inspanningTitel: string;
  motivatie?: string;
  volgorde?: { reden?: string; rank?: number };
};
type Scen = { inspanningen?: Insp[] };

async function main() {
  const s = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
  );
  const sessionId = "d8b97442-ce8f-4134-b2c7-67dc8e3a3f93";
  const { data } = await s.from("din_sessions").select("data").eq("id", sessionId).maybeSingle();
  if (!data) {
    console.error("Sessie niet gevonden");
    process.exit(1);
  }
  const sess = data.data as Record<string, unknown>;
  const wiz = sess.crossAnalyseWizard as Record<string, unknown>;
  const stap4 = (wiz.stepResults as Record<string, unknown>).stap4 as Record<string, unknown>;
  const adv = stap4.begrotingAdvies as { scenarios?: Record<string, Scen | null> };
  if (!adv.scenarios) {
    console.error("Geen scenarios");
    process.exit(1);
  }

  // Canonical = optimaal scenario
  const canonical = adv.scenarios.optimaal;
  if (!canonical?.inspanningen) {
    console.error("Geen optimaal scenario als canonical");
    process.exit(1);
  }

  const motivatieByInsp: Record<string, string> = {};
  const positieByInsp: Record<string, string> = {};
  for (const i of canonical.inspanningen) {
    if (i.motivatie) motivatieByInsp[i.inspanningTitel] = i.motivatie;
    if (i.volgorde?.reden) positieByInsp[i.inspanningTitel] = i.volgorde.reden;
  }
  console.log(`Canonical (optimaal): ${Object.keys(motivatieByInsp).length} motivaties, ${Object.keys(positieByInsp).length} posities.`);

  let updated = 0;
  for (const [sk, sc] of Object.entries(adv.scenarios)) {
    if (!sc || sk === "optimaal") continue;
    for (const ins of sc.inspanningen ?? []) {
      const newMot = motivatieByInsp[ins.inspanningTitel];
      const newPos = positieByInsp[ins.inspanningTitel];
      if (newMot && ins.motivatie !== newMot) {
        ins.motivatie = newMot;
        updated++;
      }
      if (newPos && ins.volgorde && ins.volgorde.reden !== newPos) {
        ins.volgorde.reden = newPos;
        updated++;
      }
    }
  }

  const newData = {
    ...sess,
    crossAnalyseWizard: {
      ...(sess.crossAnalyseWizard as object),
      stepResults: {
        ...(wiz.stepResults ?? {}),
        stap4: { ...stap4, begrotingAdvies: adv },
      },
    },
  };
  const { error } = await s.from("din_sessions").update({ data: newData }).eq("id", sessionId);
  if (error) {
    console.error("FOUT:", error.message);
    process.exit(1);
  }
  console.log(`✓ ${updated} velden (motivatie + positie) genormaliseerd over scenarios. Canonical = optimaal.`);
}

void main();
