// Read-only inspect: dump huidige state voor mei-fix
import { createClient } from "@supabase/supabase-js";
import { existsSync, readFileSync, writeFileSync } from "fs";
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

const SESSION_ID = "d8b97442-ce8f-4134-b2c7-67dc8e3a3f93";

async function main() {
  const s = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!);
  const { data } = await s.from("din_sessions").select("data").eq("id", SESSION_ID).maybeSingle();
  const sess = data!.data as Record<string, unknown>;
  const wiz = sess.crossAnalyseWizard as Record<string, unknown>;
  const stepResults = wiz.stepResults as Record<string, unknown>;
  const stap4 = stepResults.stap4 as Record<string, unknown>;
  const s7 = stap4.stap7InterneUren as Record<string, unknown>;

  const scenarios = s7.scenarios as Record<string, { domeinen?: Array<{ domein: string; motivatie?: string; jaren?: Array<{ jaar: number; activiteit?: string }> }> }>;

  const out: Record<string, unknown> = {};
  for (const [scKey, sc] of Object.entries(scenarios)) {
    out[scKey] = {};
    for (const dom of sc.domeinen ?? []) {
      if (dom.domein !== "mens" && dom.domein !== "data_systemen") continue;
      const o = (out[scKey] as Record<string, unknown>);
      o[dom.domein] = {
        motivatie: dom.motivatie,
        jaren: (dom.jaren ?? []).map((j) => ({ jaar: j.jaar, activiteit: j.activiteit })),
      };
    }
  }

  const sel = s7.selectiePerDomein as Record<string, Record<string, unknown>>;
  out._dataSelectie = sel.data_systemen;

  const vUPI = s7.vastgesteldeUrenPerInspanning as Array<{ domein: string; rollen: Array<Record<string, unknown>> }>;
  const dataGrp = vUPI.find((g) => g.domein === "data_systemen");
  out._dataVUPI_acc = dataGrp?.rollen.filter((r) => String(r.functieId).includes("accountmanager_c_prof"));

  writeFileSync(join(process.cwd(), "tmp-mei-state.json"), JSON.stringify(out, null, 2));
  console.log("✓ Dump geschreven naar tmp-mei-state.json");
}

void main();
