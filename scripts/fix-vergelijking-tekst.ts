// Fix de stale `vergelijking`-tekst onder Stap 6 Optimaliseren scenario-kaartjes.
// Na cultuur-ophoging klopten de totalen niet meer:
//   huidig: €1.441K → €1.490K
//   advies: €1.125K → €1.159K
//   plus20: (was niet vermeld) → €1.270K
//   min20: (was niet vermeld) → €1.819,5K
// Ook de tekst zelf verduidelijkt: per scenario totalen + "snelste scenario".
//
// Veld: data.crossAnalyseWizard.stepResults.stap4.begrotingAdvies.vergelijking
// Sessie: d8b97442-ce8f-4134-b2c7-67dc8e3a3f93

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

const NIEUWE_TEKST =
  "Huidig budget (€ 250.000/jaar) heeft 7 jaar nodig (totaal € 1.490.000). " +
  "Met +20% budget (€ 300.000/jaar) loopt het in 5 jaar (totaal € 1.270.000), " +
  "met aparte optimalisatie-jaar in slotjaar voor doorontwikkeling. " +
  "Met −20% budget (€ 200.000/jaar) duurt het 10 jaar (totaal € 1.819.500). " +
  "Het snelste scenario (advies — € 341.000/jaar, 4 jaar — € 1.159.000 totaal, " +
  "+€ 91K boven Cito-norm in piek-jaren) is de kortst haalbare looptijd, " +
  "met beheer + optimalisatie samengeperst tot één slotjaar.";

async function main() {
  const { data, error } = await supa
    .from("din_sessions")
    .select("data")
    .eq("id", SESSION_ID)
    .maybeSingle();
  if (error) throw error;
  if (!data) throw new Error("Sessie niet gevonden");

  const root = data.data as any;
  const beg = root?.crossAnalyseWizard?.stepResults?.stap4?.begrotingAdvies;
  if (!beg) throw new Error("begrotingAdvies niet gevonden");

  const oud = beg.vergelijking ?? "";
  console.log("OUD:");
  console.log(oud);
  console.log("\nNIEUW:");
  console.log(NIEUWE_TEKST);
  console.log();

  if (oud === NIEUWE_TEKST) {
    console.log("Geen wijziging nodig — tekst is al up-to-date.");
    return;
  }

  beg.vergelijking = NIEUWE_TEKST;

  const { error: updErr } = await supa
    .from("din_sessions")
    .update({ data: root, updated_at: new Date().toISOString() })
    .eq("id", SESSION_ID);
  if (updErr) throw updErr;

  console.log("Update verstuurd. Verifieren via re-load...");

  const { data: verify, error: verifyErr } = await supa
    .from("din_sessions")
    .select("data")
    .eq("id", SESSION_ID)
    .maybeSingle();
  if (verifyErr) throw verifyErr;
  const nieuweWaarde =
    verify?.data?.crossAnalyseWizard?.stepResults?.stap4?.begrotingAdvies?.vergelijking;
  console.log("\nVERIFY (uit Supabase na update):");
  console.log(nieuweWaarde);
  if (nieuweWaarde === NIEUWE_TEKST) {
    console.log("\nOK — tekst is in Supabase bijgewerkt.");
  } else {
    console.log("\nFOUT — tekst komt niet overeen na re-load.");
  }
}

main().catch((e) => {
  console.error("Caught:", e);
  process.exit(1);
});
