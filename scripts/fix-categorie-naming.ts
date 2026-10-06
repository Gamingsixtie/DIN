// Fix mismatch: data heeft `trainings-deelnemer` (met dash), UI verwacht
// `trainings_deelnemer` (met underscore). Vervang overal in stap7InterneUren.
// Idempotent.
import { createClient } from "@supabase/supabase-js";
import { existsSync, readFileSync } from "fs";
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
const OLD = "trainings-deelnemer";
const NEW = "trainings_deelnemer";

async function main() {
  const s = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!);
  const { data } = await s.from("din_sessions").select("data").eq("id", SESSION_ID).maybeSingle();
  if (!data) { console.error("not found"); process.exit(1); }
  const sess = data.data as Record<string, unknown>;
  const wiz = sess.crossAnalyseWizard as Record<string, unknown>;
  const stepResults = wiz.stepResults as Record<string, unknown>;
  const stap4 = stepResults.stap4 as Record<string, unknown>;
  const s7 = stap4.stap7InterneUren as Record<string, unknown>;

  let count = 0;

  // vUPI rollen
  const vUPI = s7.vastgesteldeUrenPerInspanning as Array<{ rollen: Array<Record<string, unknown>> }>;
  for (const grp of vUPI) {
    for (const rol of grp.rollen) {
      if (rol.categorie === OLD) { rol.categorie = NEW; count++; }
    }
  }

  // scenarios[].domeinen[].jaren[].rollen[]
  const scenarios = s7.scenarios as Record<string, { domeinen?: Array<{ jaren?: Array<{ rollen?: Array<Record<string, unknown>> }> }> }>;
  for (const sc of Object.values(scenarios)) {
    for (const dom of sc.domeinen ?? []) {
      for (const jaar of dom.jaren ?? []) {
        for (const rol of jaar.rollen ?? []) {
          if (rol.categorie === OLD) { rol.categorie = NEW; count++; }
        }
      }
    }
  }

  // Marker
  s7.categorieNamingFixed = { timestamp: new Date().toISOString(), count };

  const newData = { ...sess, crossAnalyseWizard: { ...wiz, stepResults: { ...stepResults, stap4: { ...stap4, stap7InterneUren: s7 } } } };
  const { error } = await s.from("din_sessions").update({ data: newData }).eq("id", SESSION_ID);
  if (error) { console.error(error.message); process.exit(1); }
  console.log(`✓ ${count} categorie-velden hernoemd: ${OLD} → ${NEW}`);
}

void main();
