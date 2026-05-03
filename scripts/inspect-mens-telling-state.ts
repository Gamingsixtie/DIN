// Read-only: dump huidige state van alle 25+6 mens-telling velden uit sessie
// d8b97442 om te zien of we naar 47 of 80 moeten reverten / hercalculeren.
import { createClient } from "@supabase/supabase-js";
import { readFileSync, existsSync, writeFileSync } from "fs";
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

const SESSION_ID = "d8b97442-ce8f-4134-b2c7-67dc8e3a3f93";
const supa = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
);

function getByPath(root: any, path: string): any {
  const parts: Array<string | number> = [];
  let cur = "";
  let i = 0;
  while (i < path.length) {
    const ch = path[i];
    if (ch === ".") {
      if (cur) parts.push(cur);
      cur = "";
      i++;
    } else if (ch === "[") {
      if (cur) parts.push(cur);
      cur = "";
      const end = path.indexOf("]", i);
      const idx = parseInt(path.substring(i + 1, end), 10);
      parts.push(idx);
      i = end + 1;
    } else {
      cur += ch;
      i++;
    }
  }
  if (cur) parts.push(cur);
  let node: any = root;
  for (const p of parts) {
    if (node == null) return undefined;
    node = node[p as any];
  }
  return node;
}

const PATHS = [
  "begrotingAdvies.scenarios.min20.inspanningen[2].motivatie",
  "begrotingAdvies.scenarios.min20.inspanningen[2].verdelingPerJaar[2].activiteit",
  "begrotingAdvies.scenarios.min20.prioriteitAdvies",
  "begrotingAdvies.scenarios.advies.inspanningen[1].motivatie",
  "begrotingAdvies.scenarios.advies.inspanningen[1].verdelingPerJaar[1].activiteit",
  "begrotingAdvies.scenarios.advies.prioriteitAdvies",
  "begrotingAdvies.scenarios.plus20.inspanningen[2].motivatie",
  "begrotingAdvies.scenarios.plus20.inspanningen[2].verdelingPerJaar[1].activiteit",
  "begrotingAdvies.scenarios.plus20.prioriteitAdvies",
  "begrotingAdvies.scenarios.optimaal.inspanningen[1].motivatie",
  "begrotingAdvies.scenarios.optimaal.inspanningen[1].verdelingPerJaar[2].activiteit",
  "begrotingAdvies.scenarios.optimaal.prioriteitAdvies",
  "stap7InterneUren.scenarios.min20.domeinen[1].jaren[0].activiteit",
  "stap7InterneUren.scenarios.min20.domeinen[3].motivatie",
  "stap7InterneUren.scenarios.advies.domeinen[1].motivatie",
  "stap7InterneUren.scenarios.advies.domeinen[1].jaren[1].activiteit",
  "stap7InterneUren.scenarios.plus20.domeinen[1].motivatie",
  "stap7InterneUren.scenarios.plus20.domeinen[1].jaren[1].activiteit",
  "stap7InterneUren.scenarios.optimaal.domeinen[1].motivatie",
  "stap7InterneUren.scenarios.optimaal.domeinen[1].jaren[1].activiteit",
  "stap7InterneUren.vastgesteldeUrenPerInspanning[2].rollen[1].onderbouwing",
  "stap7InterneUren.vastgesteldeUrenPerInspanning[2].rollen[8].onderbouwing",
  "stap7InterneUren.vragenPerInspanning[2].vragen[1].aanbevolenAntwoord",
  "subEffortAnalysis[0].dossier.kostenraming",
  "subEffortAnalysis[0].businessCase.result.kostenraming",
  "subEffortAnalysis[0].businessCase.result.aannames[0]",
  "subEffortAnalysis[0].businessCase.result.risicos[1]",
];

async function main() {
  const { data } = await supa
    .from("din_sessions")
    .select("data, updated_at")
    .eq("id", SESSION_ID)
    .maybeSingle();
  const stap4: any = data!.data?.crossAnalyseWizard?.stepResults?.stap4;
  console.log(`updated_at: ${data!.updated_at}\n`);

  const out: any[] = [];
  for (const p of PATHS) {
    const v = getByPath(stap4, p);
    const txt = typeof v === "string" ? v : JSON.stringify(v);
    const has47 = /\b47\s+(?:deelnemers|medewerkers)\b/.test(txt || "");
    const has80 = /\b80\s+(?:deelnemers|medewerkers|betrokkenen)\b/.test(txt || "");
    const has66 = /\b66\s+(?:deelnemers|medewerkers)\b/.test(txt || "");
    console.log(`PATH: ${p}`);
    console.log(`  has47=${has47}  has80=${has80}  has66=${has66}`);
    if (txt) {
      const snippet = txt.length > 350 ? txt.substring(0, 350) + "…" : txt;
      console.log(`  >> ${snippet}\n`);
    } else {
      console.log(`  >> (geen waarde)\n`);
    }
    out.push({ path: p, has47, has80, has66, value: txt });
  }
  writeFileSync(
    join(process.cwd(), "AUDIT-MENS-STATE-DUMP.json"),
    JSON.stringify(out, null, 2),
    "utf-8",
  );
}
main().catch((e) => { console.error(e); process.exit(1); });
