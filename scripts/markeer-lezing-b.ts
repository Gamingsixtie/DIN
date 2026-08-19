// Markeer in Supabase dat de gebruiker bewust voor "Lezing B" heeft gekozen
// voor de interne uren-toewijzing per Stap 7:
//
//   Lezing B = aangemelde personen krijgen alleen uren als ze feitelijk
//              uitvoerend werk doen. Stakeholders en review-rollen leveren
//              input in een paar momenten per jaar maar staan niet als
//              uren-drager in vastgesteldeUrenPerInspanning.
//
//   Lezing A (verworpen) = iedereen die in selectiePerDomein staat krijgt
//              uren toegewezen, ook stakeholders/reviewers (~+1.000u
//              programma-breed).
//
// Marker: stap4.stap7InterneUren.interneUrenLezing = "B" met timestamp en
// toelichting. Idempotent — tweede run produceert geen wijziging.
import { createClient } from "@supabase/supabase-js";
import { existsSync, readFileSync } from "fs";
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

async function main() {
  const s = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
  );
  const { data } = await s
    .from("din_sessions")
    .select("data")
    .eq("id", SESSION_ID)
    .maybeSingle();
  if (!data) {
    console.error("Sessie niet gevonden:", SESSION_ID);
    process.exit(1);
  }
  const sess = data.data as Record<string, unknown>;
  const wiz = sess.crossAnalyseWizard as Record<string, unknown>;
  const stepResults = wiz.stepResults as Record<string, unknown>;
  const stap4 = stepResults.stap4 as Record<string, unknown>;
  const s7 = stap4.stap7InterneUren as Record<string, unknown>;

  const huidig = s7.interneUrenLezing as Record<string, unknown> | undefined;
  if (huidig?.lezing === "B") {
    console.log("✓ Marker reeds aanwezig — Lezing B vastgelegd op", huidig.timestamp);
    console.log("  Idempotent: geen wijziging nodig.");
    return;
  }

  const marker = {
    lezing: "B",
    timestamp: new Date().toISOString(),
    toelichting:
      "Aangemelde personen in selectiePerDomein krijgen alleen uren toegewezen in vastgesteldeUrenPerInspanning indien zij feitelijk uitvoerend werk doen (trainen, coördineren, deelnemen, sturen). Stakeholders (cat 2) en review-rollen (cat 3) zijn betrokken voor input/review maar dragen geen uren-belasting in de capaciteitstelling. Lezing A (alle aangemelde personen krijgen uren) is bewust verworpen omdat dat de werkelijke programma-belasting overschat door ~+1.000u toe te voegen voor rollen die geen capaciteit-belasting hebben.",
    overzicht: {
      mens: { aangemeld: 80, metUren: 64, stakeholder: 10, review: 1, overig: 5 },
      cultuur: { aangemeld: 9, metUren: 9, stakeholder: 0, review: 0 },
      data_systemen: { aangemeld: 39, metUren: 24, stakeholder: 12, review: 2, onbekend: 1 },
      processen: { aangemeld: 5, metUren: 5, stakeholder: 0, review: 0 },
    },
  };
  s7.interneUrenLezing = marker;

  const newData = {
    ...sess,
    crossAnalyseWizard: {
      ...wiz,
      stepResults: {
        ...stepResults,
        stap4: { ...stap4, stap7InterneUren: s7 },
      },
    },
  };

  const { error } = await s
    .from("din_sessions")
    .update({ data: newData })
    .eq("id", SESSION_ID);
  if (error) {
    console.error("FOUT:", error.message);
    process.exit(1);
  }
  console.log("✓ Marker geplaatst — Lezing B vastgelegd op", marker.timestamp);
  console.log("  Pad: stap4.stap7InterneUren.interneUrenLezing");
}

void main();
