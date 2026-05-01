// Vervang motivatie + volgorde.reden met SCENARIO-AGNOSTIC versies.
// Reden: vorige canonical bevatte scenario-totalen ("doel-totaal circa
// €910.000") die per scenario verschillen → onjuist als 1-op-1 gekopieerd.
// Nieuwe canonical noemt alleen DOSSIER-bedragen (constant) en scope.
// Scenario-totaal staat al in de tabel rechts; hoeft niet in motivatie.
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

// Scenario-agnostic motivatie + positie per inspanning (substring-match).
// Geen scenario-totalen; alleen dossier-bedragen (heilig) en business case.
const CANONICAL: Record<string, { motivatie: string; positie: string }> = {
  CRM: {
    positie:
      "Grootste eenmalige post en technische enabler — zonder werkend CRM blijft outside-in op schaal een belofte.",
    motivatie:
      "Het CRM is het technische fundament onder outside-in werken: zonder werkend cross-sectoraal klantdashboard blijft outside-in op schaal onuitvoerbaar. Dossier-onderbouwing: eenmalig € 440.000 – € 640.000 voor implementatie, datamigratie en 7-8 bronsysteemintegraties (middenpunt circa € 540.000); plus structureel € 92.500 per jaar voor licenties (85 gebruikers op een Microsoft Dynamics-equivalent, ~ € 63.000) en beheer plus doorontwikkeling (~ € 30.000). De business case rust op een externe implementatiepartner (1.500-2.500 consultanturen), juridisch-technische ontvlechting van Stichting Cito en dubbele licentielast tijdens de transitiefase. Het scenario-totaal in de tabel hangt af van hoe lang de structurele beheerfase loopt — hoe langer, hoe hoger het cumulatief totaal.",
  },
  Uniforme: {
    positie:
      "Strategische enabler met klein eenmalig budget — uniforme klantprocessen verbinden CRM-data aan dagelijkse werkroutines.",
    motivatie:
      "Uniforme klantinformatieprocessen en funnelgovernance zijn de schakel tussen het CRM-fundament en het dagelijkse handelen van medewerkers. Dossier-onderbouwing: eenmalig € 55.000 – € 70.000 voor procesinventarisatie, herontwerp en sectorinkleuring (externe procesbegeleider circa 20 dagen à € 800, plus 9 multidisciplinaire werksessies en cross-sectoraal schaalvoordeel 30-40 %); plus structureel € 12.500 per jaar voor proceseigenaarschap-borging via Smartprocess. De aannames noemen 21 betrokken medewerkers en parallelle ontwikkeling met de CRM-architectuur. Het scenario-totaal in de tabel varieert met hoe lang de structurele borgingsfase loopt.",
  },
  Gespreksvaardigheidstraining: {
    positie:
      "Eenmalig trainingsblok met begrensde structurele last — vertaalt outside-in naar concreet gespreksgedrag.",
    motivatie:
      "De cross-sectorale gespreksvaardigheidstraining vertaalt outside-in werken naar concreet, meetbaar gespreksgedrag in PO, VO en Zakelijk. Dossier-onderbouwing: eenmalig € 125.000 – € 160.000 (middenpunt circa € 142.500) voor twee trainingsblokken van drie maanden voor 66 deelnemers, plus circa € 10.000 nulmeting/intake en circa € 52.000 externe trainingspartner (twee blokken à circa € 26.000), inclusief commerciële module voor sales (NPS, conversie, omzetgroei als incentive). Cross-sectorale bundeling levert circa 30 % schaalvoordeel. Geen significante structurele kosten — borging via e-learning en interne ambassadeurs. Het scenario-totaal in de tabel verschilt licht door verschillende borgingsperiodes.",
  },
  Leiderschapsprogramma: {
    positie:
      "In euro klein, in belang #2 — zonder zichtbaar voorgeleefd outside-in gedrag wordt het CRM niet gebruikt zoals bedoeld.",
    motivatie:
      "Het leiderschapsprogramma 'outside-in als gedeelde waarde' is in euro de kleinste post (doelgroep van 9 leidinggevenden plus 2 HR-coördinatoren), maar inhoudelijk de tweede hefboom: zonder zichtbaar voorgeleefd outside-in gedrag wordt het CRM niet gebruikt zoals bedoeld en blijft de cultuurverandering oppervlakkig. Dossier-onderbouwing: eenmalig € 33.000 – € 43.000 voor programma-ontwerp en externe begeleider (~ 15 dagen à gemiddeld € 2.500 = circa € 37.500), plus HR-instrumentarium-aanpassing; plus structureel € 25.000 – € 30.000 in latere jaren voor afnemende externe begeleiding en HR-borging. Cross-sectorale aanpak verbindt leiders PO/VO/Zakelijk in gemeenschappelijke leerkringen en gedragscontracten. Het scenario-totaal in de tabel verschilt door looptijd van de structurele borgingsfase.",
  },
};

type Insp = {
  inspanningTitel: string;
  motivatie?: string;
  volgorde?: { reden?: string; rank?: number };
};
type Scen = { inspanningen?: Insp[] };

function findCanonical(titel: string): { motivatie: string; positie: string } | null {
  for (const key of Object.keys(CANONICAL)) {
    if (titel.includes(key)) return CANONICAL[key];
  }
  return null;
}

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
  let missing = new Set<string>();
  for (const sc of Object.values(adv.scenarios)) {
    if (!sc) continue;
    for (const ins of sc.inspanningen ?? []) {
      const can = findCanonical(ins.inspanningTitel);
      if (!can) {
        missing.add(ins.inspanningTitel);
        continue;
      }
      if (ins.motivatie !== can.motivatie) {
        ins.motivatie = can.motivatie;
        updated++;
      }
      if (ins.volgorde && ins.volgorde.reden !== can.positie) {
        ins.volgorde.reden = can.positie;
        updated++;
      }
    }
  }
  if (missing.size > 0) {
    console.log("WAARSCHUWING — geen canonical voor:");
    for (const m of missing) console.log("  ", m);
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
  console.log(`✓ ${updated} velden vervangen door scenario-agnostische canonical (geen scenario-totalen meer in motivatie/positie).`);
}

void main();
