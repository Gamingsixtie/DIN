// Normaliseer fase-namen per inspanning over alle scenarios.
// Voor elk domein: fixed fase-chain per aantalJaren. Per cell-index krijg
// je de standaard fase-naam — identiek over alle scenarios.
// Activiteit-tekst blijft uit backup (mag per scenario verschillen, want
// scope-context kan verschillen).
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

// Standaard fase-chains per domein per aantalJaren.
// Fases moeten EXACT consistent zijn over scenarios voor dezelfde
// inspanning bij dezelfde cell-index (alleen naam, niet bedrag).
const FASE_CHAINS: Record<string, Record<number, string[]>> = {
  data_systemen: {
    4: ["Analyse & architectuur", "Realisatie & integraties", "Acceptatie & uitrol", "In beheer & optimalisatie"],
    5: ["Analyse & architectuur", "Realisatie & integraties", "Acceptatie & uitrol", "In beheer", "Optimalisatie"],
    7: [
      "Analyse & architectuur",
      "Leverancier-selectie",
      "Realisatie & integraties",
      "Acceptatie & sectoruitrol",
      "Go-live & adoptie",
      "In beheer",
      "Optimalisatie",
    ],
    10: [
      "Analyse & architectuur",
      "Leverancier-selectie",
      "Realisatie - kern",
      "Realisatie - integraties",
      "Acceptatie & pilot",
      "Go-live & uitrol",
      "In beheer",
      "Optimalisatie",
      "Doorontwikkeling",
      "Continu verbeteren",
    ],
  },
  mens: {
    4: ["Behoeftestelling & curriculumontwerp", "Basistraining", "Vaardigheidstraining & toepassing", "Borging & nazorg"],
    5: [
      "Behoeftestelling & curriculumontwerp",
      "Basistraining",
      "Vaardigheidstraining",
      "Toepassing in praktijk",
      "Borging & nazorg",
    ],
    7: [
      "Behoeftestelling & curriculumontwerp",
      "Curriculumvalidatie & pilot",
      "Basistraining",
      "Vaardigheidstraining",
      "Toepassing in praktijk",
      "Borging & nazorg",
      "Verankering",
    ],
    10: [
      "Behoeftestelling & curriculumontwerp",
      "Curriculumvalidatie & pilot",
      "Basistraining - blok 1",
      "Basistraining - blok 2",
      "Vaardigheidstraining",
      "Toepassing in praktijk",
      "Borging & nazorg",
      "Borging in lijn",
      "Verankering",
      "Continue ontwikkeling",
    ],
  },
  cultuur: {
    4: ["Bewustwording & coalitievorming", "Acceptatie & rolmodelgedrag", "Adoptie", "Waardenverankering"],
    5: [
      "Bewustwording & coalitievorming",
      "Acceptatie & rolmodelgedrag",
      "Adoptie",
      "Waardenverankering",
      "Continue rolmodel-werking",
    ],
    7: [
      "Bewustwording & coalitievorming",
      "Acceptatie & rolmodelgedrag",
      "Adoptie",
      "Waardenverankering",
      "Borging in HR-cyclus",
      "Continue rolmodel-werking",
      "Verankering",
    ],
    10: [
      "Urgentiebesef",
      "Coalitievorming",
      "Acceptatie & rolmodelgedrag",
      "Adoptie",
      "Waardenverankering",
      "Borging in HR-cyclus",
      "Continue rolmodel-werking",
      "Verankering",
      "Continue ontwikkeling",
      "Verankering in lijn",
    ],
  },
  processen: {
    4: ["Inventarisatie & herontwerp", "Pilot & sectorinkleuring", "Uitrol & standaardisatie", "Continu verbeteren"],
    5: ["Inventarisatie (as-is)", "Herontwerp (to-be) & pilot", "Uitrol", "Standaardisatie", "Continu verbeteren"],
    7: [
      "Inventarisatie (as-is)",
      "Herontwerp (to-be)",
      "Pilot & validatie",
      "Uitrol",
      "Standaardisatie",
      "Continu verbeteren",
      "Verankering",
    ],
    10: [
      "Inventarisatie (as-is)",
      "Herontwerp (to-be)",
      "Pilot & validatie",
      "Uitrol",
      "Standaardisatie",
      "Standaardisatie & adoptie",
      "Continu verbeteren",
      "Continu verbeteren",
      "Continue verbetering",
      "Verankering",
    ],
  },
};

type Cell = { jaar: number; euro: number; fase?: string; activiteit?: string };
type Insp = { inspanningTitel: string; domein?: string; verdelingPerJaar?: Cell[] };
type Scen = { aantalJaren?: number; inspanningen?: Insp[] };

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

  let updated = 0;
  for (const sc of Object.values(adv.scenarios)) {
    if (!sc) continue;
    const aantal = sc.aantalJaren ?? 0;
    for (const ins of sc.inspanningen ?? []) {
      const chain = FASE_CHAINS[ins.domein ?? ""]?.[aantal];
      if (!chain) {
        console.warn(`Geen fase-chain voor ${ins.domein} × ${aantal} jaar`);
        continue;
      }
      for (let i = 0; i < (ins.verdelingPerJaar?.length ?? 0); i++) {
        const cell = ins.verdelingPerJaar![i];
        const newFase = chain[Math.min(i, chain.length - 1)];
        if (cell.fase !== newFase) {
          cell.fase = newFase;
          updated++;
        }
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
  console.log(`✓ ${updated} fase-namen genormaliseerd over alle scenarios.`);
}

void main();
