// Reframe scenario.samenvatting + scenario.prioriteitAdvies voor "advies" en
// "plus20" zodat de stuurgroep-trade-off expliciet wordt.
//
// Achtergrond: in de praktijk gaat de keuze tussen plus20 (+20% budget,
// 5 jaar, ruimte voor optimalisatie) en advies (kortste haalbare looptijd,
// 4 jaar, snelst klaar maar minder optimalisatie-tijd). Plus20 heeft een
// aparte "Optimalisatie"-jaar (slotjaar: € 136K) waarin advies dat samenperst
// met beheer in jaar 4 (€ 168K).
//
// HUIDIG (= scenario "optimaal", € 250K/jr, 7 jaar) en MIN20 (€ 200K/jr,
// 10 jaar) blijven onveranderd — zij vormen baseline en ondergrens.
//
// Regels voor de teksten:
//  - GEEN scenario-totaal in euro's (varieert)
//  - Wel: jaarlijks plafond (€ 341K of € 300K) en aantal jaren (4 of 5)
//  - GEEN absolute jaartallen — relatief ("startjaar", "slotjaar")
//  - Wel concrete dossier-feiten (€ 440-640K eenmalig, € 92.5K/jaar structureel)
//  - Sluit samenvatting af met expliciete keuze-vraag aan de stuurgroep.
//
// Surgical replace: alleen advies + plus20, alleen samenvatting + prioriteitAdvies.
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

type ScenTexts = {
  samenvatting?: string;
  prioriteitAdvies?: string;
};

const NEW_TEKSTEN: Record<"advies" | "plus20", { samenvatting: string; prioriteitAdvies: string }> = {
  advies: {
    samenvatting:
      "Snelste haalbare scenario: vier jaar looptijd met een jaarlijks plafond van € 341.000 — dat is € 91.000 boven de Cito-norm en de hoogste cadans van alle vier de varianten. CRM-bouw, gespreksvaardigheidstraining en leiderschapsverankering lopen vanaf het startjaar parallel; in het slotjaar worden beheer en optimalisatie samengeperst tot één gecombineerde fase (€ 168K) zonder eigen optimalisatie-jaar. Trade-off: snelheid en momentum gaan hier vóór doorontwikkelings-ruimte — KPI-finetuning, nieuwe stuurrapportages en CRM-doorontwikkeling moeten meeliften op het beheerjaar. Wil de stuurgroep snelheid + minder optimalisatie? Kies advies. Wil de stuurgroep iets meer tijd + een serieus optimalisatie-traject? Kies plus20.",
    prioriteitAdvies:
      "Data/systemen krijgt het grootste budget-aandeel (rank 1) omdat het CRM-fundament de technische enabler is: zonder werkend cross-sectoraal klantdashboard blijven proactief handelen en funnelsturing onuitvoerbaar op schaal, en de eenmalige bouw-, migratie- en integratielast (€ 440.000–€ 640.000) plus € 92.500/jaar structureel zijn substantieel. Mens volgt op rank 2 omdat gespreksvaardigheid de cultuur naar klantgedrag vertaalt (66 deelnemers, twee trainingsblokken, circa 30% cross-sectoraal schaalvoordeel). Processen krijgen rank 3: één generiek kader voor drie sectorvarianten plus € 12.500/jaar structureel via Smartprocess — werk lift mee op de CRM-bouw. Cultuur staat in euro's rank 4 (negen leidinggevenden plus HR), inhoudelijk #2 als hefboom. Alle vier domeinen starten parallel in het startjaar — ranking gaat over budget-aandeel, niet over startmoment. Wat dit advies-scenario expliciet niet biedt: een eigenstandig optimalisatie-jaar. Beheer en optimalisatie zijn in het slotjaar gecombineerd in één fase, waardoor KPI-finetuning, nieuwe stuurrapportages en CRM-doorontwikkeling onder druk komen. Voor stuurgroepen die snelheid en momentum laten prevaleren boven een afgebakend doorontwikkelings-traject is dat een acceptabele trade-off; voor wie serieuze optimalisatie wil afdekken is plus20 de logischere keuze.",
  },
  plus20: {
    samenvatting:
      "Plus20-scenario: vijf jaar looptijd met een jaarlijks plafond van € 300.000 — dat is +20% boven de Cito-norm van € 250.000. CRM-bouw vormt het zwaartepunt rond het midden van de looptijd; cultuur, mens en processen lopen vanaf het startjaar parallel. Het onderscheidende kenmerk t.o.v. advies: een aparte optimalisatie-jaar in het slotjaar (€ 136K) waarin KPI-finetuning, nieuwe stuurrapportages en CRM-doorontwikkeling een eigen plek krijgen — los van structureel beheer. Trade-off: één jaar langer doorlopen en cumulatief iets meer kosten dan advies, in ruil voor een serieus afgebakend doorontwikkelings-traject. Wil de stuurgroep snelheid + minder optimalisatie? Kies advies. Wil de stuurgroep iets meer tijd + een serieus optimalisatie-traject? Kies plus20.",
    prioriteitAdvies:
      "Data/systemen krijgt het grootste budget-aandeel (rank 1): het CRM-klantdashboard is het technische fundament onder outside-in werken — zonder werkend, eenduidig systeem blijft de ambitie zonder ruggengraat, en de eenmalige bouw- en migratielast (€ 440.000–€ 640.000) plus € 92.500/jaar structureel is de grootste enkelvoudige post. Mens staat op rank 2 omdat gespreksvaardigheid de directe vertaling is van CRM-data en cultuur naar klantgedrag (66 deelnemers, twee trainingsblokken, € 52K externe partner). Cultuur staat in euro's op rank 3 (kleine doelgroep van negen leidinggevenden plus twee HR-coördinatoren) maar inhoudelijk op #2 — zonder zichtbaar voorgeleefd outside-in gedrag wordt het CRM niet gebruikt zoals bedoeld. Processen krijgen het kleinste aandeel (rank 4) door cross-sectoraal schaalvoordeel: één kader voor drie sectorvarianten plus € 12.500/jaar structureel. Alle vier domeinen starten parallel in het startjaar — ranking gaat over budget-aandeel, niet over startmoment. Doorslaggevend argument om plus20 te kiezen i.p.v. advies: dit scenario reserveert een eigenstandig optimalisatie-jaar in het slotjaar (€ 136K). Daarin vinden KPI-finetuning, nieuwe CRM-stuurrapportages en doorontwikkeling van het klantdashboard plaats — los van structureel beheer. Bij advies wordt deze ruimte samengeperst in een gecombineerd beheer- en optimalisatie-jaar, wat het doorontwikkelings-traject onder druk zet. Voor stuurgroepen die de CRM-stuurinformatie serieus willen door-ontwikkelen weegt het ene extra jaar plus de cumulatieve meerkost op tegen de geborgde optimalisatie-ruimte.",
  },
};

async function main() {
  const s = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
  );
  const sessionId = "d8b97442-ce8f-4134-b2c7-67dc8e3a3f93";

  const { data, error: loadErr } = await s
    .from("din_sessions")
    .select("data")
    .eq("id", sessionId)
    .maybeSingle();
  if (loadErr) {
    console.error("LOAD FOUT:", loadErr.message);
    process.exit(1);
  }
  if (!data) {
    console.error("Sessie niet gevonden");
    process.exit(1);
  }

  const sess = data.data as Record<string, unknown>;
  const wiz = sess.crossAnalyseWizard as Record<string, unknown> | undefined;
  const stap4 = (wiz?.stepResults as Record<string, unknown> | undefined)?.stap4 as
    | Record<string, unknown>
    | undefined;
  const adv = stap4?.begrotingAdvies as
    | { scenarios?: Record<string, ScenTexts | null> }
    | undefined;
  if (!adv?.scenarios) {
    console.error("Geen begrotingAdvies.scenarios gevonden");
    process.exit(1);
  }

  console.log("=".repeat(80));
  console.log("REFRAME advies + plus20 — sessie", sessionId);
  console.log("=".repeat(80));

  let updated = 0;
  for (const sk of ["advies", "plus20"] as const) {
    const scen = adv.scenarios[sk];
    if (!scen) {
      console.warn(`  ! scenario "${sk}" niet gevonden — overgeslagen`);
      continue;
    }
    const newTexts = NEW_TEKSTEN[sk];

    console.log(`\n--- ${sk} ---`);
    const oldSam = scen.samenvatting ?? "";
    const oldAdv = scen.prioriteitAdvies ?? "";

    if (oldSam !== newTexts.samenvatting) {
      scen.samenvatting = newTexts.samenvatting;
      updated++;
      console.log(`  samenvatting     : ${oldSam.length} → ${newTexts.samenvatting.length} chars`);
    } else {
      console.log(`  samenvatting     : ongewijzigd (${oldSam.length} chars)`);
    }
    if (oldAdv !== newTexts.prioriteitAdvies) {
      scen.prioriteitAdvies = newTexts.prioriteitAdvies;
      updated++;
      console.log(
        `  prioriteitAdvies : ${oldAdv.length} → ${newTexts.prioriteitAdvies.length} chars`,
      );
    } else {
      console.log(`  prioriteitAdvies : ongewijzigd (${oldAdv.length} chars)`);
    }
  }

  if (updated === 0) {
    console.log("\nGeen wijzigingen — geen write naar Supabase.");
    process.exit(0);
  }

  const newData = {
    ...sess,
    crossAnalyseWizard: {
      ...(sess.crossAnalyseWizard as object),
      stepResults: {
        ...(wiz?.stepResults ?? {}),
        stap4: { ...(stap4 ?? {}), begrotingAdvies: adv },
      },
    },
  };

  const { error: writeErr } = await s
    .from("din_sessions")
    .update({ data: newData })
    .eq("id", sessionId);
  if (writeErr) {
    console.error("\nWRITE FOUT:", writeErr.message);
    process.exit(1);
  }
  console.log(`\n✓ Geschreven naar Supabase. Velden bijgewerkt: ${updated}`);

  // Verifieer via re-load
  console.log("\n--- VERIFICATIE (re-load uit Supabase) ---");
  const { data: verify } = await s
    .from("din_sessions")
    .select("data")
    .eq("id", sessionId)
    .maybeSingle();
  if (!verify) {
    console.error("Verificatie-load faalde");
    process.exit(1);
  }
  const vSess = verify.data as Record<string, unknown>;
  const vAdv = (((vSess.crossAnalyseWizard as Record<string, unknown>)?.stepResults as Record<
    string,
    unknown
  >)?.stap4 as Record<string, unknown>)?.begrotingAdvies as
    | { scenarios?: Record<string, ScenTexts | null> }
    | undefined;

  for (const sk of ["advies", "plus20"] as const) {
    const scen = vAdv?.scenarios?.[sk];
    if (!scen) continue;
    const sam = scen.samenvatting ?? "";
    const pa = scen.prioriteitAdvies ?? "";
    console.log(`  ${sk}.samenvatting     : ${sam.length} chars`);
    console.log(`  ${sk}.prioriteitAdvies : ${pa.length} chars`);
  }

  // Specifieke framing-checks
  console.log("\n--- FRAMING CHECKS ---");
  const adviesSam = vAdv?.scenarios?.advies?.samenvatting ?? "";
  const plus20Sam = vAdv?.scenarios?.plus20?.samenvatting ?? "";
  const adviesAdv = vAdv?.scenarios?.advies?.prioriteitAdvies ?? "";
  const plus20Adv = vAdv?.scenarios?.plus20?.prioriteitAdvies ?? "";

  const checks: Array<{ label: string; ok: boolean }> = [
    {
      label: "advies.samenvatting bevat 'Snelste' of 'snelste'",
      ok: /[Ss]nelste/.test(adviesSam),
    },
    {
      label: "advies.samenvatting bevat 'minder optimalisatie' of 'samengeperst'",
      ok: /minder optimalisatie|samengeperst/i.test(adviesSam),
    },
    {
      label: "advies.samenvatting bevat keuze-vraag aan stuurgroep",
      ok: /Kies advies\?|Kies advies\.|Kies plus20/.test(adviesSam),
    },
    {
      label: "plus20.samenvatting bevat 'aparte optimalisatie' of 'doorontwikkeling'",
      ok: /aparte optimalisatie|doorontwikkeling/i.test(plus20Sam),
    },
    {
      label: "plus20.samenvatting bevat keuze-vraag aan stuurgroep",
      ok: /Kies advies|Kies plus20/.test(plus20Sam),
    },
    {
      label: "advies.prioriteitAdvies benoemt gecombineerde beheer/optimalisatie-fase",
      ok: /gecombineerd|samengeperst/i.test(adviesAdv),
    },
    {
      label: "plus20.prioriteitAdvies benadrukt eigenstandig optimalisatie-jaar",
      ok: /eigenstandig|aparte/i.test(plus20Adv) && /optimalisatie/i.test(plus20Adv),
    },
  ];
  for (const c of checks) console.log(`  ${c.ok ? "✓" : "✗"} ${c.label}`);
}

void main();
