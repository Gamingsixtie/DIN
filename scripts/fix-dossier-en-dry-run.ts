// Optie A — corrigeer de dossier-kostenramingen voor processen, data_systemen
// en cultuur (verwijder interne uren-componenten die in §4.2 horen) en doe
// daarna een dry-run begroting-advies-call met de gecorrigeerde data om te
// zien wat de nieuwe scenario-totalen worden.
//
// SCHRIJVEN naar Supabase = ja (dossier-kostenraming wordt aangepast).
// SCHRIJVEN van nieuwe begroting = nee (dat is dry-run; tonen wat het zou
// worden, eindbeslissing aan gebruiker).

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

const sessionId = process.argv[2] ?? "d8b97442-ce8f-4134-b2c7-67dc8e3a3f93";
const apiBase = process.argv[3] ?? "https://din-kappa.vercel.app";
const DRY_RUN_ONLY = process.argv.includes("--dry-run-only");

// Per domein: nieuwe dossier-kostenraming met interne uren weggehaald.
// Bedragen kloppen rekenkundig: oude eenmalig-range minus interne component.
const CORRECTIES: Record<string, { oudEenmalig: string; nieuweTekst: string; verlagingMid: number }> = {
  processen: {
    oudEenmalig: "€75.000–€100.000",
    verlagingMid: 25000, // interne werkgroepuren ~€20K-€30K → mid €25K
    nieuweTekst:
      "De eenmalige out-of-pocket investering voor het ontwerpen, inrichten en uitrollen van het uniforme klantproces-kader over drie sectoren wordt geraamd op €55.000–€70.000, verdeeld over een looptijd van circa 9 maanden; dit omvat externe procesbegeleiding (p.m. €25.000–€40.000) en sessiebegeleiding/onboarding (ca. €15.000–€25.000) en externe materialen/methodieken (ca. €5.000–€10.000). Structureel rekening houden met €10.000–€15.000 per jaar aan externe ondersteuning voor proceseigenaarschap-borging. NB: interne werkgroepuren (~€20.000–€30.000 schaduwkosten over de looptijd) en proceseigenaarschap-uren (4–8 uur/maand × 3 sectoren) zijn meegenomen in §4.2 Interne uren — niet in deze out-of-pocket-raming.",
  },
  data_systemen: {
    oudEenmalig: "€550K–€750K",
    verlagingMid: 110000, // 1.466 uur × €74 = ±€110K
    nieuweTekst:
      "De totale out-of-pocket investering voor het cross-sectoraal implementeren en inrichten van het integraal CRM-klantdashboard wordt geraamd op circa €440K–€640K eenmalig over de looptijd 2026–2028, met een PM-buffer van 30% zolang de Stichting Cito-afhankelijkheid en de platformkeuze nog open zijn (worst-case plafond circa €830K). De eenmalige kosten omvatten externe implementatie en dashboardbouw (€250K–€375K), datamigratie en 7–8 bronsysteemintegraties (€75K–€125K), training en adoptie-begeleiding voor 85 medewerkers inclusief externe schaduwbegeleiding (€40K–€55K) en dubbele licentielast tijdens de transitieperiode van 6–12 maanden (€30K–€60K). Structureel na go-live bedragen de kosten €75K–€110K per jaar, bestaande uit CRM-licenties voor 85 gebruikers op een Microsoft Dynamics-equivalent (€50K–€75K/jaar) en beheer plus doorontwikkeling (€25K–€35K/jaar). NB: interne capaciteitskosten (~1.466 uur × €74/uur = circa €110K opportunity-kosten) zijn meegenomen in §4.2 Interne uren — niet in deze out-of-pocket-raming.",
  },
  cultuur: {
    oudEenmalig: "€65.000–€75.000 eenmalig",
    verlagingMid: 32000, // ~€32K eenmalig interne uren (van totaal 740u × €77 = €57K, waarvan leeuwendeel eenmalig)
    nieuweTekst:
      "Het cross-sectorale leiderschapsprogramma 'Outside-in als gedeelde waarde' kent een totale out-of-pocket omvang van circa €60.000–€72.000 over vier jaar (2026–2029), waarvan circa €33.000–€43.000 eenmalig/intensief in 2026–2027 (programma-ontwerp, externe begeleiding €37.500, HR-instrumenten-aanpassing) en circa €25.000–€30.000 structureel in 2028–2029 als afnemende externe beheer- en borgingslast. De externe begeleider (≈15 dagen à €2.500 gemiddeld dagprijs) vertegenwoordigt circa €37.500 van de eenmalige out-of-pocket kosten. NB: interne uren (740u totaal à gemiddeld €77/u = circa €57.000) zijn meegenomen in §4.2 Interne uren — niet in deze out-of-pocket-raming.",
  },
};

type SubEffort = {
  titel?: string;
  domein?: string;
  dossier?: { kostenraming?: string };
  businessCase?: { result?: { kostenraming?: string } };
};

async function main() {
  const { data, error } = await supa
    .from("din_sessions")
    .select("data, updated_at")
    .eq("id", sessionId)
    .maybeSingle();
  if (error || !data) {
    console.error(error?.message ?? "not found");
    process.exit(1);
  }
  const s = data.data as Record<string, unknown>;
  const wiz = s.crossAnalyseWizard as
    | { stepResults?: Record<string, Record<string, unknown>> }
    | undefined;
  const stap4 = wiz?.stepResults?.stap4 as Record<string, unknown> | undefined;
  const sub = (stap4?.subEffortAnalysis as SubEffort[] | undefined) ?? [];
  const begroting = stap4?.begrotingAdvies as Record<string, unknown> | undefined;

  console.log("═".repeat(80));
  console.log("OPTIE A — Dossier-kostenraming corrigeren + dry-run nieuwe begroting");
  console.log("═".repeat(80));
  console.log(`Sessie: ${sessionId}`);
  console.log(`Versie nu: v${(s as { version?: number }).version}`);
  console.log(`API: ${apiBase}`);
  console.log(`Dry run only: ${DRY_RUN_ONLY ? "ja (geen Supabase-write)" : "nee — dossier wordt aangepast"}`);
  console.log();

  // ==== STAP 1: Apply corrections to dossier in-memory ====
  const newSub = sub.map((entry) => {
    const c = CORRECTIES[entry.domein ?? ""];
    if (!c) return entry;
    return {
      ...entry,
      dossier: { ...(entry.dossier ?? {}), kostenraming: c.nieuweTekst },
      businessCase: entry.businessCase
        ? {
            ...entry.businessCase,
            result: {
              ...(entry.businessCase.result ?? {}),
              kostenraming: c.nieuweTekst,
            },
          }
        : entry.businessCase,
    };
  });

  console.log("STAP 1 — DOSSIER-CORRECTIES");
  console.log("─".repeat(80));
  for (const entry of newSub) {
    const c = CORRECTIES[entry.domein ?? ""];
    if (!c) continue;
    console.log(`▌ ${entry.domein} — verlagingMid: € ${c.verlagingMid.toLocaleString("nl-NL")}`);
    console.log(`  oude eenmalig: ${c.oudEenmalig}`);
    console.log(`  nieuwe tekst (eerste 200 chars): ${c.nieuweTekst.slice(0, 200)}…`);
    console.log();
  }

  // ==== STAP 2: Schrijf nieuwe subEffortAnalysis naar Supabase (tenzij dry-run-only) ====
  if (!DRY_RUN_ONLY) {
    console.log("STAP 2 — SCHRIJVEN NAAR SUPABASE");
    console.log("─".repeat(80));
    const newData = {
      ...s,
      crossAnalyseWizard: {
        ...(s.crossAnalyseWizard as object),
        stepResults: {
          ...(wiz?.stepResults ?? {}),
          stap4: {
            ...(stap4 ?? {}),
            subEffortAnalysis: newSub,
          },
        },
      },
    };
    const { error: upErr } = await supa
      .from("din_sessions")
      .update({ data: newData })
      .eq("id", sessionId);
    if (upErr) {
      console.error("FOUT bij schrijven:", upErr.message);
      process.exit(1);
    }
    console.log("✓ Dossier-kostenraming bijgewerkt voor 3 domeinen.");
    console.log();
  } else {
    console.log("(STAP 2 OVERGESLAGEN — dry-run-only)\n");
  }

  // ==== STAP 3: Roep begroting-advies API aan met gecorrigeerde data ====
  console.log("STAP 3 — DRY RUN BEGROTING-ADVIES MET NIEUWE DOSSIER-TOTALEN");
  console.log("─".repeat(80));

  const optimaal = (begroting as { scenarios?: { optimaal?: { inspanningen?: Array<{ inspanningTitel: string; groepId?: string; domein: string }> } } } | undefined)?.scenarios?.optimaal;
  if (!optimaal?.inspanningen) {
    console.error("Geen optimaal scenario in huidige begroting.");
    process.exit(1);
  }

  // Reconstrueer inspanningen-payload met de NIEUWE dossier-kostenraming
  const inspanningenPayload = optimaal.inspanningen.map((i) => {
    const sourceEntry = newSub.find(
      (s) => s.titel === i.inspanningTitel || s.titel?.toLowerCase() === i.inspanningTitel.toLowerCase(),
    );
    return {
      titel: i.inspanningTitel,
      groepId: i.groepId,
      domein: i.domein,
      beschrijving: (sourceEntry as { beschrijving?: string })?.beschrijving ?? "",
      beargumentatie: (sourceEntry as { beargumentatie?: string })?.beargumentatie ?? "",
      vermogenImpact: (sourceEntry as { vermogenImpact?: unknown[] })?.vermogenImpact ?? [],
      dossier: {
        eigenaar: (sourceEntry as { dossier?: { eigenaar?: string } })?.dossier?.eigenaar ?? "",
        inspanningsleider: (sourceEntry as { dossier?: { inspanningsleider?: string } })?.dossier?.inspanningsleider ?? "",
        verwachtResultaat: (sourceEntry as { dossier?: { verwachtResultaat?: string } })?.dossier?.verwachtResultaat ?? "",
        randvoorwaarden: (sourceEntry as { dossier?: { randvoorwaarden?: string } })?.dossier?.randvoorwaarden ?? "",
      },
      dossierKostenraming: sourceEntry?.dossier?.kostenraming ?? "",
      businessCaseAannames: (sourceEntry as { businessCase?: { result?: { aannames?: string[] } } })?.businessCase?.result?.aannames ?? [],
      businessCaseRisicos: (sourceEntry as { businessCase?: { result?: { risicos?: string[] } } })?.businessCase?.result?.risicos ?? [],
    };
  });

  const goals = (s.goals as { name?: string; description?: string; rank?: number }[] | undefined) ?? [];
  const focusGoal = [...goals].sort((a, b) => (a.rank ?? 999) - (b.rank ?? 999))[0];
  const focusDoel = focusGoal
    ? { naam: focusGoal.name ?? "", beschrijving: focusGoal.description ?? focusGoal.name ?? "" }
    : null;

  // A2: forceer de oorspronkelijke looptijden zodat de dossier-correctie
  // alleen de bedragen verlaagt en niet ook de scenario-duur inkrimpt.
  type OudScen = { aantalJaren?: number; jaarlijksBudgetEuro?: number; totaalGeraamdEuro?: number; inspanningen?: Array<{ inspanningTitel: string; totaalEuro: number; domein: string }> };
  const oudScenariosForce = (begroting as { scenarios?: Record<string, OudScen | null> })?.scenarios ?? {};
  const forceAantalJaren = {
    optimaal: oudScenariosForce.optimaal?.aantalJaren,
    plus20: oudScenariosForce.plus20?.aantalJaren,
    min20: oudScenariosForce.min20?.aantalJaren,
    advies: oudScenariosForce.advies?.aantalJaren,
  };

  const payload = {
    jaarlijksBudgetEuro: (begroting as { jaarlijksBudgetBasis?: number } | undefined)?.jaarlijksBudgetBasis ?? 250000,
    cyclusMaanden: (begroting as { cyclusMaanden?: number } | undefined)?.cyclusMaanden ?? 12,
    startJaar: (begroting as { startJaar?: number } | undefined)?.startJaar ?? 2026,
    focusDoel,
    inspanningen: inspanningenPayload,
    scope: s.scope,
    vision: s.vision,
    finetuneInstructie: "",
    previousAdvies: null,
    forceAantalJaren,
  };
  console.log(`Geforceerde looptijden: optimaal=${forceAantalJaren.optimaal} plus20=${forceAantalJaren.plus20} min20=${forceAantalJaren.min20} advies=${forceAantalJaren.advies}`);

  console.log(`→ POST ${apiBase}/api/begroting-advies (~75s op Opus 4.7)...`);
  const t0 = Date.now();
  const res = await fetch(`${apiBase}/api/begroting-advies`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  const text = await res.text();
  const dt = Date.now() - t0;
  console.log(`HTTP ${res.status} in ${(dt / 1000).toFixed(1)}s`);

  if (!res.ok) {
    console.error("FOUT:", text.slice(0, 500));
    process.exit(1);
  }
  const parsed = JSON.parse(text) as { success?: boolean; data?: unknown; error?: string };
  if (!parsed.success) {
    console.error("API zei success=false:", parsed.error);
    process.exit(1);
  }

  const nieuw = parsed.data as {
    scenarios?: Record<string, { aantalJaren?: number; jaarlijksBudgetEuro?: number; totaalGeraamdEuro?: number; inspanningen?: Array<{ inspanningTitel: string; totaalEuro: number; domein: string }> } | null>;
    inspanningRamingen?: Array<{ titel: string; eenmaligMid: number }>;
  };

  console.log();
  console.log("STAP 4 — VERGELIJKING OUD vs NIEUW PER SCENARIO");
  console.log("═".repeat(80));

  const oudScenarios = (begroting as { scenarios?: Record<string, { aantalJaren?: number; jaarlijksBudgetEuro?: number; totaalGeraamdEuro?: number; inspanningen?: Array<{ inspanningTitel: string; totaalEuro: number; domein: string }> } | null> })?.scenarios ?? {};

  const scenarioKeys = ["optimaal", "plus20", "min20", "advies"] as const;
  for (const skey of scenarioKeys) {
    const oud = oudScenarios[skey];
    const nw = nieuw.scenarios?.[skey];
    if (!oud || !nw) continue;
    const oudT = oud.totaalGeraamdEuro ?? 0;
    const nwT = nw.totaalGeraamdEuro ?? 0;
    const verschil = nwT - oudT;
    const pct = oudT > 0 ? Math.round((verschil / oudT) * 100) : 0;
    console.log();
    console.log(`▌ ${skey.toUpperCase()}`);
    console.log(`  Oud totaal: € ${oudT.toLocaleString("nl-NL")} (${oud.aantalJaren} jaar × € ${oud.jaarlijksBudgetEuro?.toLocaleString("nl-NL")}/jr)`);
    console.log(`  NIEUW:      € ${nwT.toLocaleString("nl-NL")} (${nw.aantalJaren} jaar × € ${nw.jaarlijksBudgetEuro?.toLocaleString("nl-NL")}/jr)`);
    console.log(`  Verschil:   € ${verschil.toLocaleString("nl-NL")} (${pct >= 0 ? "+" : ""}${pct}%)`);
    console.log();
    console.log(`  Per inspanning:`);
    for (const oudInsp of oud.inspanningen ?? []) {
      const nwInsp = nw.inspanningen?.find(
        (n) => n.inspanningTitel === oudInsp.inspanningTitel || n.inspanningTitel.toLowerCase() === oudInsp.inspanningTitel.toLowerCase(),
      );
      const oT = oudInsp.totaalEuro ?? 0;
      const nT = nwInsp?.totaalEuro ?? 0;
      const v = nT - oT;
      console.log(`    [${oudInsp.domein}] ${oudInsp.inspanningTitel.slice(0, 50)}`);
      console.log(`      oud € ${oT.toLocaleString("nl-NL")} → nieuw € ${nT.toLocaleString("nl-NL")} (${v >= 0 ? "+" : ""}€ ${v.toLocaleString("nl-NL")})`);
    }
  }

  // ==== STAP 5: Schrijf nieuwe begroting naar Supabase (tenzij dry-run-only) ====
  if (!DRY_RUN_ONLY) {
    console.log();
    console.log("STAP 5 — NIEUWE BEGROTING SCHRIJVEN NAAR SUPABASE");
    console.log("─".repeat(80));
    // Re-fetch om laatste versie te krijgen (was net bijgewerkt door dossier-write)
    const { data: latest } = await supa
      .from("din_sessions")
      .select("data")
      .eq("id", sessionId)
      .single();
    const latestData = (latest?.data ?? s) as Record<string, unknown>;
    const latestWiz = latestData.crossAnalyseWizard as
      | { stepResults?: Record<string, Record<string, unknown>> }
      | undefined;
    const latestStap4 = latestWiz?.stepResults?.stap4 as Record<string, unknown> | undefined;
    const oldBegroting = latestStap4?.begrotingAdvies as Record<string, unknown> | undefined;
    // Behoud structuur van oude begroting (jaarlijksBudgetBasis, startJaar etc.)
    // maar overschrijf scenarios met nieuwe + zet tekstenSchoon=true.
    const newBegroting = {
      ...(oldBegroting ?? {}),
      scenarios: nieuw.scenarios,
      tekstenSchoon: true,
    };
    const newData = {
      ...latestData,
      crossAnalyseWizard: {
        ...(latestData.crossAnalyseWizard as object),
        stepResults: {
          ...(latestWiz?.stepResults ?? {}),
          stap4: {
            ...(latestStap4 ?? {}),
            begrotingAdvies: newBegroting,
          },
        },
      },
    };
    const { error: upErr2 } = await supa
      .from("din_sessions")
      .update({ data: newData })
      .eq("id", sessionId);
    if (upErr2) {
      console.error("FOUT bij begroting-write:", upErr2.message);
      process.exit(1);
    }
    console.log("✓ Nieuwe begroting met geforceerde looptijden + dossier-correctie opgeslagen.");
  }

  console.log();
  console.log("═".repeat(80));
  console.log(DRY_RUN_ONLY ? "DRY RUN AFGEROND." : "APPLY AFGEROND.");
  console.log(`- Dossier-kostenraming aangepast in Supabase: ${DRY_RUN_ONLY ? "NEE (dry-run-only)" : "JA"}`);
  console.log(`- Nieuwe begroting-scenarios opgeslagen: ${DRY_RUN_ONLY ? "NEE (dry-run)" : "JA"}`);
  console.log("═".repeat(80));
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
