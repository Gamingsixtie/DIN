// Restore programmaorganisatie + RASCI volgens chat-afspraken voor sessie d8b97442.
// Vervangt de huidige (kapotte) state met een complete, consistente versie.
// Gebruik: npx tsx scripts/restore-programmaorganisatie.ts [--dry-run]

import { createClient } from "@supabase/supabase-js";
import { readFileSync, existsSync } from "fs";
import { join } from "path";
import { randomUUID } from "crypto";

function loadEnvFile(path: string) {
  if (!existsSync(path)) return;
  for (const line of readFileSync(path, "utf-8").split(/\r?\n/)) {
    const t = line.trim();
    if (!t || t.startsWith("#")) continue;
    const eq = t.indexOf("=");
    if (eq === -1) continue;
    const k = t.substring(0, eq).trim();
    const v = t.substring(eq + 1).trim().replace(/^["']|["']$/g, "");
    if (!process.env[k]) process.env[k] = v;
  }
}
loadEnvFile(join(process.cwd(), ".env.local"));
const supa = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!);

const SESSION_ID = "d8b97442-ce8f-4134-b2c7-67dc8e3a3f93";
const DRY_RUN = process.argv.includes("--dry-run");

type Rol = {
  id: string;
  rol: string;
  naam: string;
  functie: string;
  sector: string;
  mandaat: string;
  toelichting: string;
};

const r = (rol: string, naam: string, functie: string, sector: string, mandaat: string, toelichting: string = ""): Rol => ({
  id: randomUUID(),
  rol,
  naam,
  functie,
  sector,
  mandaat,
  toelichting,
});

const programmaorganisatie = {
  opdrachtgever: r(
    "Programma-eigenaar / opdrachtgever",
    "Meryl Widdershoven",
    "Commercieel Manager",
    "Programmabreed",
    "Eindverantwoordelijk voor realisatie van het programma. Mandaat over baten, vermogens en inspanningen. Mag sectormanagers overrullen wanneer programmabelang dat vraagt. Goedkeurt scope/budget/planning. Hamerslag in stuurgroep.",
    "Wezenlijk verschil met sectormanagers (die domeineigenaar of bateneigenaar kunnen zijn): de opdrachtgever heeft realisatie-mandaat over de hele programmaketen. Sectormanagers zijn binnen het programma volgend, ook al zijn ze in de lijn senior. De opdrachtgever is actief betrokken bij de uitvoering en werkt daarin nauw samen met de programmamanager. Tevens bateneigenaar (Commercieel Manager) — eindverantwoordelijk dat baten binnen het programma worden gerealiseerd.",
  ),
  programmamanager: r(
    "Programmamanager",
    "Pim de Burger",
    "Programmamanager",
    "Programmabreed",
    "Geen eigen beslissingsmandaat — beslissingen liggen bij de programma-eigenaar/opdrachtgever. Dagelijkse leiding programma; rapporteert aan opdrachtgever. Bewaakt samenhang DIN-keten en cross-sectorale afstemming. Voorzitter kerngroep; agendeert stuurgroep. Actief betrokken bij uitvoering — bilateraal met inspanningsleiders maandelijks als basisritme; meer waar nodig (bewust geen wekelijkse cadans om vergadercultuur te vermijden).",
    "Niet alleen orkestrator: PM is nauw betrokken bij de uitvoering om continuïteit en samenhang tussen programma en inspanningen te borgen. Werkt nauw samen met de opdrachtgever, die ook bij uitvoering aansluit — heldere taakverdeling: PM is hands-on ondersteunend (S in RASCI), opdrachtgever wordt geconsulteerd op majeure stappen (C in RASCI) en is via stuurgroep collectief eindverantwoordelijk (A).",
  ),
  stuurgroep: [
    r("Stuurgroep", "Jasper", "Sectormanager PO", "PO", "Vertegenwoordigt PO-belang in stuurgroep; goedkeurt scope/budget/planning binnen PO."),
    r("Stuurgroep", "Bert Thijs", "Sectormanager VO", "VO", "Vertegenwoordigt VO-belang in stuurgroep."),
    r("Stuurgroep", "Leontine", "Sectormanager Zakelijk", "Zakelijk", "Vertegenwoordigt Zakelijk-belang in stuurgroep."),
    r("Stuurgroep", "Cornelis", "Manager Data & Technologie", "Programmabreed", "Bewaakt data/IT-haalbaarheid; senior IT-stakeholder."),
    r("Stuurgroep", "Yara", "HR-manager", "Programmabreed", "Bewaakt mens/organisatie-aspecten. Tevens inspanningsleider Mens + Cultuur (kerngroep)."),
    r("Stuurgroep", "George", "Manager Finance", "Programmabreed", "Bewaakt financiële kaders en budget."),
    r("Stuurgroep", "Roel", "Directeur Cito", "Programmabreed", "Eindverantwoordelijk Cito-directie — bewaakt strategische lijn en organisatie-impact."),
    r("Stuurgroep", "Pieta", "Directeur IV/IT", "Programmabreed", "Bewaakt IV/IT-portfolio en architectuur op directieniveau; heeft formele invloed op IT-keuzes die het programma raken."),
  ],
  domeineigenaren: [
    r(
      "Domeineigenaar Mens",
      "Meryl, Jasper, Bert Thijs, Leontine",
      "Sectormanagers + Commercieel Manager (collectief)",
      "Programmabreed",
      "Collectief domeineigenaar — bewaakt samenhang van Mens-vermogens en -inspanningen over de drie sectoren.",
      "Collectief van 4 personen die ook lid zijn van de stuurgroep / opdrachtgeverschap.",
    ),
    r(
      "Domeineigenaar Processen",
      "Meryl, Jasper, Bert Thijs, Leontine",
      "Sectormanagers + Commercieel Manager (collectief)",
      "Programmabreed",
      "Collectief domeineigenaar — bewaakt samenhang van Processen-vermogens cross-sector.",
      "Zelfde collectief als Mens en Cultuur.",
    ),
    r(
      "Domeineigenaar Data & Systemen",
      "Cornelis",
      "Manager Data & Technologie",
      "Programmabreed",
      "Bewaakt samenhang van Data & Systemen-vermogens en -inspanningen over de sectoren.",
      "Individueel domeineigenaarschap — Cornelis voert de regie op data/IT.",
    ),
    r(
      "Domeineigenaar Cultuur",
      "Meryl, Jasper, Bert Thijs, Leontine",
      "Sectormanagers + Commercieel Manager (collectief)",
      "Programmabreed",
      "Collectief domeineigenaar — bewaakt samenhang van Cultuur-vermogens cross-sector.",
      "Zelfde collectief als Mens en Processen.",
    ),
  ],
  kerngroep: [
    r("Inspanningsleider", "Yara", "HR-manager / inspanningsleider Mens + Cultuur", "Programmabreed",
      "Trekt cross-sectorale bundels Mens + Cultuur. Werkt samen met domeineigenaren en programmamanager.",
      "Heeft 2 petten: HR-manager (stuurgroep) + inspanningsleider (kerngroep)."),
    r("Inspanningsleider", "Procesconsultant PO", "Procesconsultant per sector (PO)", "PO",
      "Trekt de PO-component van de Processen-bundel.",
      "Naam nog te bepalen."),
    r("Inspanningsleider", "Procesconsultant VO", "Procesconsultant per sector (VO)", "VO",
      "Trekt de VO-component van de Processen-bundel.",
      "Naam nog te bepalen."),
    r("Inspanningsleider", "Procesconsultant Zakelijk", "Procesconsultant per sector (Zakelijk)", "Zakelijk",
      "Trekt de Zakelijk-component van de Processen-bundel.",
      "Naam nog te bepalen."),
    r("Inspanningsleider", "Sven", "SIO / inspanningsleider Data & Systemen", "Programmabreed",
      "Trekt de cross-sectorale bundel Data & Systemen (CRM-klantdashboard).",
      ""),
  ],
  klankbordgroep: [
    r("Klantvertegenwoordiger PO", "", "Externe klantvertegenwoordiger sector PO", "PO",
      "Reflectie en advies — geen besluitvormingsmandaat.",
      "Vul de naam in van de klant die deze sector vertegenwoordigt."),
    r("Klantvertegenwoordiger VO", "", "Externe klantvertegenwoordiger sector VO", "VO",
      "Reflectie en advies — geen besluitvormingsmandaat.",
      "Vul de naam in van de klant die deze sector vertegenwoordigt."),
    r("Klantvertegenwoordiger Zakelijk", "", "Externe klantvertegenwoordiger sector Zakelijk", "Zakelijk",
      "Reflectie en advies — geen besluitvormingsmandaat.",
      "Vul de naam in van de klant die deze sector vertegenwoordigt."),
  ],
  besluitvormingsritme: "Stuurgroep: maandelijks (te bepalen). Kerngroep: maandelijks bilateraal PM met inspanningsleiders. Klankbordgroep: per kwartaal.",
  escalatiepad: "Inspanningsleider → Domeineigenaar → Programmamanager → Opdrachtgever (Meryl, ook voorzitter stuurgroep).",
  aiToelichting: "",
};

async function main() {
  console.log(`Restoring programmaorganisatie voor sessie ${SESSION_ID}${DRY_RUN ? " [DRY RUN]" : ""}\n`);

  const { data: row } = await supa.from("din_sessions").select("data").eq("id", SESSION_ID).maybeSingle();
  if (!row) {
    console.error("Sessie niet gevonden");
    process.exit(1);
  }
  const session = row.data as Record<string, unknown>;

  // Toon wat er staat
  const huidigPo = session.programmaorganisatie as Record<string, unknown> | undefined;
  console.log("HUIDIG:");
  console.log(`  Opdrachtgever: ${(huidigPo?.opdrachtgever as Record<string, string> | undefined)?.naam || "(leeg)"}`);
  console.log(`  PM:            ${(huidigPo?.programmamanager as Record<string, string> | undefined)?.naam || "(leeg)"}`);
  console.log(`  Stuurgroep:    ${((huidigPo?.stuurgroep ?? []) as unknown[]).length} leden`);
  console.log(`  Domeineig.:    ${((huidigPo?.domeineigenaren ?? []) as unknown[]).length} leden`);
  console.log(`  Kerngroep:     ${((huidigPo?.kerngroep ?? []) as unknown[]).length} leden`);
  console.log(`  Klankbord:     ${((huidigPo?.klankbordgroep ?? []) as unknown[]).length} leden`);

  console.log("\nNIEUW (volgens chat):");
  console.log(`  Opdrachtgever: ${programmaorganisatie.opdrachtgever.naam}`);
  console.log(`  PM:            ${programmaorganisatie.programmamanager.naam}`);
  console.log(`  Stuurgroep:    ${programmaorganisatie.stuurgroep.length} leden`);
  console.log(`  Domeineig.:    ${programmaorganisatie.domeineigenaren.length} leden`);
  console.log(`  Kerngroep:     ${programmaorganisatie.kerngroep.length} leden`);
  console.log(`  Klankbord:     ${programmaorganisatie.klankbordgroep.length} leden`);

  if (DRY_RUN) {
    console.log("\n[DRY RUN] geen wijziging in database");
    return;
  }

  // RASCI: leeggooien — de UI sync-knop kan hem opnieuw genereren met juiste programmaorganisatie
  const nieuw = {
    ...session,
    programmaorganisatie,
    gezamenlijkeRasci: [],
    updatedAt: new Date().toISOString(),
  };

  const { error } = await supa.from("din_sessions").update({ data: nieuw, updated_at: new Date().toISOString() }).eq("id", SESSION_ID);
  if (error) {
    console.error("FOUT bij opslaan:", error);
    process.exit(1);
  }
  console.log("\n✓ Programmaorganisatie hersteld. RASCI is leeggemaakt — klik in de UI op 'Vul alles in 1 klik' (of de sync-knop) om RASCI te regenereren.");
}

main().catch(console.error);
