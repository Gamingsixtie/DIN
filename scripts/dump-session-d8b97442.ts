// Dumpt de volledige sessie-data van d8b97442 naar c:\tmp\session-d8b97442.json
// voor inhoudelijke audit (out-of-pocket alignment, fases, Cito-realisme).
import { createClient } from "@supabase/supabase-js";
import { readFileSync, existsSync, writeFileSync, mkdirSync } from "fs";
import { join, dirname } from "path";

function loadEnvFile(p: string) {
  if (!existsSync(p)) return;
  const c = readFileSync(p, "utf-8");
  for (const l of c.split(/\r?\n/)) {
    const t = l.trim();
    if (!t || t.startsWith("#")) continue;
    const e = t.indexOf("=");
    if (e === -1) continue;
    const k = t.substring(0, e).trim();
    const v = t.substring(e + 1).trim().replace(/^["']|["']$/g, "");
    if (!process.env[k]) process.env[k] = v;
  }
}
loadEnvFile(join(process.cwd(), ".env.local"));

const supa = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
);

const SESSION_ID = "d8b97442-ce8f-4134-b2c7-67dc8e3a3f93";
const OUT = "c:/tmp/session-d8b97442.json";

async function main() {
  const { data, error } = await supa
    .from("din_sessions")
    .select("data")
    .eq("id", SESSION_ID)
    .maybeSingle();
  if (error) throw error;
  if (!data) throw new Error("NO DATA");
  const dir = dirname(OUT);
  if (!existsSync(dir)) mkdirSync(dir, { recursive: true });
  writeFileSync(OUT, JSON.stringify(data.data, null, 2), "utf-8");

  const root = data.data as any;
  const efforts = root?.efforts ?? [];
  const stap4 = root?.crossAnalyseWizard?.stepResults?.stap4?.begrotingAdvies;
  const stap7 = root?.crossAnalyseWizard?.stepResults?.stap7InterneUren;
  const sels = stap7?.selectiePerDomein ?? {};
  console.log(`Wrote ${OUT}`);
  console.log(`efforts: ${efforts.length}`);
  console.log(
    `begroting scenarios: ${
      stap4 ? Object.keys(stap4.scenarios ?? {}).filter((k) => stap4.scenarios[k]).join(",") : "(none)"
    }`,
  );
  for (const dom of ["mens", "processen", "data_systemen", "cultuur"]) {
    const map = sels[dom] ?? {};
    const totalAantal = Object.values(map).reduce(
      (s: number, v: any) => s + (v?.aantal ?? 0),
      0,
    );
    const fnCount = Object.keys(map).length;
    console.log(`stap7.${dom}: ${fnCount} functies, ${totalAantal} personen`);
  }
}
main().catch((e) => {
  console.error("ERR:", e);
  process.exit(1);
});
