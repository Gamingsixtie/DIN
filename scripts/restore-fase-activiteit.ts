// Herstel fase + activiteit per cell in verdelingPerJaar uit backup.
// Match op cell-index per inspanning per scenario. Cijfers (euro) blijven
// onveranderd uit huidige Supabase-data; alleen fase + activiteit worden
// uit backup gekopieerd.
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

type Cell = { jaar: number; euro: number; fase?: string; activiteit?: string; percentage?: number };
type Insp = { inspanningTitel: string; verdelingPerJaar?: Cell[] };
type Scen = { inspanningen?: Insp[] };

async function main() {
  const s = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
  );
  const sessionId = "d8b97442-ce8f-4134-b2c7-67dc8e3a3f93";
  const backup = JSON.parse(readFileSync("backups/session-d8b97442-backup-2026-05-01.json", "utf-8"));
  const backupAdv = backup.crossAnalyseWizard.stepResults.stap4.begrotingAdvies;

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

  let restoredCells = 0;
  const newScenarios: Record<string, Scen | null> = {};
  for (const [sk, sc] of Object.entries(adv.scenarios)) {
    if (!sc) {
      newScenarios[sk] = null;
      continue;
    }
    const backupSc = backupAdv.scenarios?.[sk] as Scen | undefined;
    const newInsps: Insp[] = (sc.inspanningen ?? []).map((ins) => {
      const backupIns = backupSc?.inspanningen?.find((b) => b.inspanningTitel === ins.inspanningTitel);
      const newCells: Cell[] = (ins.verdelingPerJaar ?? []).map((cell, idx) => {
        const backupCell = backupIns?.verdelingPerJaar?.[idx];
        if (!backupCell) return cell;
        // Behoud huidige euro+jaar; restore fase + activiteit (en percentage uit backup als referentie)
        if (backupCell.fase || backupCell.activiteit) restoredCells++;
        return {
          ...cell,
          fase: cell.fase ?? backupCell.fase,
          activiteit: cell.activiteit ?? backupCell.activiteit,
        };
      });
      return { ...ins, verdelingPerJaar: newCells };
    });
    newScenarios[sk] = { ...sc, inspanningen: newInsps };
  }

  const newAdv = { ...adv, scenarios: newScenarios };
  const newData = {
    ...sess,
    crossAnalyseWizard: {
      ...(sess.crossAnalyseWizard as object),
      stepResults: {
        ...(wiz.stepResults ?? {}),
        stap4: { ...stap4, begrotingAdvies: newAdv },
      },
    },
  };
  const { error } = await s.from("din_sessions").update({ data: newData }).eq("id", sessionId);
  if (error) {
    console.error("FOUT:", error.message);
    process.exit(1);
  }
  console.log(`✓ ${restoredCells} cellen voorzien van fase + activiteit uit backup.`);
}

void main();
