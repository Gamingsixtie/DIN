// Vervang "66 deelnemers" door "80 deelnemers" in alle teksten in de
// session-data. Programmamanager-correctie: stap 6 toont nog 66.

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

const PATTERNS: Array<{ regex: RegExp; replace: string }> = [
  { regex: /\b66 deelnemers\b/g, replace: "80 deelnemers" },
  { regex: /\b66\s*deelnemers\b/g, replace: "80 deelnemers" },
  { regex: /voor 66\b/g, replace: "voor 80" },
  { regex: /\b66 medewerkers\b/g, replace: "80 medewerkers" },
];

interface Vondst {
  pad: string;
  context: string;
}

const vondsten: Vondst[] = [];

function walk(obj: unknown, pad: string): unknown {
  if (typeof obj === "string") {
    let nieuwe = obj;
    for (const p of PATTERNS) {
      if (p.regex.test(nieuwe)) {
        const matchPos = nieuwe.search(p.regex);
        const ctx = nieuwe.substring(Math.max(0, matchPos - 30), Math.min(nieuwe.length, matchPos + 60));
        vondsten.push({ pad, context: ctx });
        nieuwe = nieuwe.replace(p.regex, p.replace);
      }
    }
    return nieuwe;
  }
  if (Array.isArray(obj)) {
    return obj.map((item, i) => walk(item, `${pad}[${i}]`));
  }
  if (obj && typeof obj === "object") {
    const out: Record<string, unknown> = {};
    for (const [k, v] of Object.entries(obj as Record<string, unknown>)) {
      out[k] = walk(v, `${pad}.${k}`);
    }
    return out;
  }
  return obj;
}

async function main() {
  const sessionId = "d8b97442-ce8f-4134-b2c7-67dc8e3a3f93";
  const { data: row } = await supa.from("din_sessions").select("data").eq("id", sessionId).maybeSingle();
  if (!row) { console.error("not found"); process.exit(1); }

  const data = row.data as Record<string, unknown>;
  const nieuw = walk(data, "data") as Record<string, unknown>;

  console.log(`Gevonden ${vondsten.length} plekken met "66 deelnemers":\n`);
  for (const v of vondsten.slice(0, 30)) {
    console.log(`  ${v.pad}`);
    console.log(`    ...${v.context}...\n`);
  }
  if (vondsten.length > 30) console.log(`  (+${vondsten.length - 30} meer)`);

  if (vondsten.length === 0) {
    console.log("Niets te wijzigen.");
    return;
  }

  nieuw.version = ((nieuw.version as number | undefined) ?? 0) + 1;
  nieuw.updatedAt = new Date().toISOString();

  const { error } = await supa
    .from("din_sessions")
    .update({ data: nieuw, updated_at: new Date().toISOString() })
    .eq("id", sessionId);
  if (error) { console.error("write fail:", error.message); process.exit(1); }
  console.log(`\n✓ ${vondsten.length} plekken bijgewerkt (version ${nieuw.version})`);
}

main().catch((e) => { console.error(e); process.exit(1); });
