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

async function main() {
  const s = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
  );
  const { data } = await s
    .from("din_sessions")
    .select("data")
    .eq("id", "d8b97442-ce8f-4134-b2c7-67dc8e3a3f93")
    .maybeSingle();
  if (!data) return;
  const sess = data.data as Record<string, unknown>;
  const adv = ((sess.crossAnalyseWizard as Record<string, unknown>)?.stepResults as Record<string, unknown>)
    ?.stap4 as Record<string, unknown> | undefined;
  const beg = adv?.begrotingAdvies as
    | { scenarios?: Record<string, { inspanningen?: Array<{ inspanningTitel: string; verdelingPerJaar?: Array<{ jaar: number; fase?: string; activiteit?: string }> }> } | null> }
    | undefined;

  for (const sk of ["advies", "plus20"]) {
    const sc = beg?.scenarios?.[sk];
    const crm = sc?.inspanningen?.find((i) => i.inspanningTitel.includes("CRM"));
    if (!crm) continue;
    const cell0 = crm.verdelingPerJaar?.[0];
    console.log(`=== ${sk} CRM cell 0 (${cell0?.jaar}) ===`);
    console.log(`Fase: ${cell0?.fase}`);
    console.log(`Activiteit:\n${cell0?.activiteit}`);
    console.log();
  }
}

void main();
