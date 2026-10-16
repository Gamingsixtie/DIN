// Markeert alle open Claude-notities op een sessie als 'opgepakt'.
// Gebruik: npx tsx scripts/markeer-notities-opgepakt.ts [session-id] [--only=<id>]
// Default sessie: d8b97442
//
// Optimistic-locking via session.version: leest huidige versie uit Supabase,
// wijzigt status, schrijft terug. Als de gebruiker tussendoor de UI heeft
// bijgewerkt (nieuwere version), faalt de write — dan moet je het opnieuw
// proberen na de UI te refreshen.

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

interface ClaudeNotitie {
  id: string;
  tekst: string;
  createdAt: string;
  status: "open" | "opgepakt";
}

async function main() {
  const userArgs = process.argv.slice(2);
  const sessionId =
    userArgs.find((a) => !a.startsWith("--") && /^[0-9a-f-]{36}$/i.test(a)) ??
    "d8b97442-ce8f-4134-b2c7-67dc8e3a3f93";
  const onlyArg = userArgs.find((a) => a.startsWith("--only="));
  const onlyId = onlyArg?.split("=")[1];

  const { data: row, error: readErr } = await supa
    .from("din_sessions")
    .select("data")
    .eq("id", sessionId)
    .maybeSingle();
  if (readErr || !row) {
    console.error("Sessie niet gevonden:", readErr?.message);
    process.exit(1);
  }

  const data = row.data as Record<string, unknown>;
  const huidigeVersion = (data.version as number | undefined) ?? 0;
  const wiz = data.crossAnalyseWizard as
    | { stepResults?: Record<string, Record<string, unknown>> }
    | undefined;
  const stap8 = wiz?.stepResults?.stap8 as
    | { claudeNotes?: { globaal?: ClaudeNotitie[]; perScenario?: Record<string, ClaudeNotitie[]> } }
    | undefined;
  const notes = stap8?.claudeNotes;

  if (!notes) {
    console.log("Geen notities gevonden — niets te doen.");
    return;
  }

  let aantalGewijzigd = 0;
  const markeer = (lijst: ClaudeNotitie[] | undefined): ClaudeNotitie[] | undefined => {
    if (!lijst) return lijst;
    return lijst.map((n) => {
      if (n.status === "open" && (!onlyId || n.id === onlyId)) {
        aantalGewijzigd++;
        return { ...n, status: "opgepakt" as const };
      }
      return n;
    });
  };

  const nieuweNotes = {
    ...notes,
    globaal: markeer(notes.globaal),
    perScenario: notes.perScenario
      ? Object.fromEntries(Object.entries(notes.perScenario).map(([k, v]) => [k, markeer(v)]))
      : notes.perScenario,
  };

  if (aantalGewijzigd === 0) {
    console.log("Niets te markeren — alle notities zijn al opgepakt.");
    return;
  }

  // Patch session.data
  ((wiz!.stepResults!.stap8 as Record<string, unknown>).claudeNotes as unknown) = nieuweNotes;

  const newVersion = huidigeVersion + 1;
  data.version = newVersion;
  data.updatedAt = new Date().toISOString();

  const { error: writeErr } = await supa
    .from("din_sessions")
    .update({ data, updated_at: new Date().toISOString() })
    .eq("id", sessionId);

  if (writeErr) {
    console.error("Schrijven mislukt:", writeErr.message);
    process.exit(1);
  }

  console.log(`✓ ${aantalGewijzigd} notitie(s) gemarkeerd als opgepakt (version ${huidigeVersion} → ${newVersion})`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
