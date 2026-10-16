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
    process.env[t.substring(0, e).trim()] = t
      .substring(e + 1)
      .trim()
      .replace(/^["']|["']$/g, "");
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
  const stap4 = (
    (sess.crossAnalyseWizard as Record<string, unknown>)?.stepResults as Record<
      string,
      unknown
    >
  )?.stap4 as Record<string, unknown> | undefined;

  const subAn = stap4?.subEffortAnalysis;
  console.log("subEffortAnalysis type:", Array.isArray(subAn) ? "array" : typeof subAn);
  if (Array.isArray(subAn)) {
    console.log("Length:", subAn.length);
    console.log("First entry keys:", Object.keys(subAn[0] ?? {}));
    for (let i = 0; i < subAn.length; i++) {
      const item = subAn[i] as Record<string, unknown>;
      const t = (item.title ?? item.inspanningTitel ?? item.name ?? "—") as string;
      const dossier = item.dossier as Record<string, unknown> | undefined;
      console.log(`\n[${i}] ${t}`);
      if (dossier) {
        console.log(`  dossier keys: ${Object.keys(dossier).join(", ")}`);
        if (dossier.kostenraming) {
          const kr = dossier.kostenraming as string;
          console.log(`  kostenraming (full):\n    ${kr.replace(/\n/g, "\n    ")}`);
        }
      }
    }
  }
}
void main();
