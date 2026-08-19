// Dry run: roep de live begroting-advies API aan met TEKST_ONLY: prefix,
// op basis van sessie d8b97442. Schrijf NIETS terug naar Supabase — alleen
// de nieuwe teksten tonen naast de oude, zodat Pim kan zien wat de knop
// daadwerkelijk zou opleveren.

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

type Insp = {
  inspanningTitel: string;
  groepId?: string;
  domein: string;
  motivatie?: string;
  verdelingPerJaar: { jaar: number; euro: number; fase: string; activiteit?: string }[];
};
type Scen = {
  jaarlijksBudgetEuro?: number;
  aantalJaren?: number;
  totaalGeraamdEuro?: number;
  inspanningen?: Insp[];
  samenvatting?: string;
  prioriteitAdvies?: string;
};

async function main() {
  console.log(`Sessie ophalen: ${sessionId}`);
  const { data, error } = await supa
    .from("din_sessions")
    .select("data")
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
  const begroting = stap4?.begrotingAdvies as
    | {
        startJaar?: number;
        cyclusMaanden?: number;
        jaarlijksBudgetBasis?: number;
        scenarios?: Record<string, Scen | null>;
      }
    | undefined;
  if (!begroting?.scenarios) {
    console.error("Geen begrotingAdvies in deze sessie.");
    process.exit(1);
  }

  // Reconstrueer inspanningen-payload uit het bestaande advies. Voor een
  // TEKST_ONLY call gebruikt de server de inspanningen NIET om bedragen te
  // muteren — die komen letterlijk uit previousAdvies — dus minimale
  // payload is voldoende. We pakken titel/domein uit het optimaal-scenario
  // omdat dat altijd aanwezig is.
  const optimaal = begroting.scenarios.optimaal;
  if (!optimaal?.inspanningen) {
    console.error("Geen inspanningen in optimaal scenario.");
    process.exit(1);
  }

  // Pak focusDoel uit eerste goal
  const goals = (s.goals as { name?: string; description?: string; rank?: number }[] | undefined) ?? [];
  const focusGoal = [...goals].sort((a, b) => (a.rank ?? 999) - (b.rank ?? 999))[0];
  const focusDoel = focusGoal
    ? { naam: focusGoal.name ?? "", beschrijving: focusGoal.description ?? focusGoal.name ?? "" }
    : null;

  // Probeer dossierKostenraming uit consolidatieAdvies te halen — daar staat
  // de business-case-output. Als het er niet is, lege string.
  const consolidatieAdvies = (stap4?.consolidatieAdvies as
    | Array<{
        groepId?: string;
        titel?: string;
        domein?: string;
        beschrijving?: string;
        beargumentatie?: string;
        vermogenImpact?: unknown[];
        dossier?: {
          eigenaar?: string;
          inspanningsleider?: string;
          verwachtResultaat?: string;
          randvoorwaarden?: string;
          kostenraming?: string;
        };
        businessCase?: {
          result?: { kostenraming?: string; aannames?: string[]; risicos?: string[] };
        };
      }>
    | undefined) ?? [];

  function findConsol(titel: string, groepId?: string) {
    return consolidatieAdvies.find(
      (c) =>
        (groepId && c.groepId === groepId) ||
        c.titel === titel ||
        c.titel?.toLowerCase() === titel.toLowerCase(),
    );
  }

  const inspanningen = optimaal.inspanningen.map((i) => {
    const c = findConsol(i.inspanningTitel, i.groepId);
    return {
      titel: i.inspanningTitel,
      groepId: i.groepId,
      domein: i.domein,
      beschrijving: c?.beschrijving ?? "",
      beargumentatie: c?.beargumentatie ?? "",
      vermogenImpact: c?.vermogenImpact ?? [],
      dossier: {
        eigenaar: c?.dossier?.eigenaar ?? "",
        inspanningsleider: c?.dossier?.inspanningsleider ?? "",
        verwachtResultaat: c?.dossier?.verwachtResultaat ?? "",
        randvoorwaarden: c?.dossier?.randvoorwaarden ?? "",
      },
      dossierKostenraming: c?.dossier?.kostenraming ?? c?.businessCase?.result?.kostenraming ?? "",
      businessCaseAannames: c?.businessCase?.result?.aannames ?? [],
      businessCaseRisicos: c?.businessCase?.result?.risicos ?? [],
    };
  });

  const payload = {
    jaarlijksBudgetEuro: begroting.jaarlijksBudgetBasis ?? 250000,
    cyclusMaanden: begroting.cyclusMaanden ?? 12,
    startJaar: begroting.startJaar ?? 2026,
    focusDoel,
    inspanningen,
    scope: s.scope,
    vision: s.vision,
    finetuneInstructie:
      `TEKST_ONLY: Herschrijf de motivatie (per inspanning), samenvatting en prioriteitAdvies van dit scenario.

DOEL: alleen jaartallen en looptijd-claims weghalen — alle andere onderbouwing behouden.

REGEL A — VERWIJDER:
- Absolute jaartallen ('2027', '2028', 'tot 2031', '2026-2029').
- Looptijd-aantallen ('over 4 jaar', 'in 5 jaar', '× 9 jaar', 'jaar 4').
- Cyclus-claims ('4-jarige cyclus', '3-jarige aanpak').
- Specifieke jaar-tot-jaar fasering met jaartallen ('2026 starten, 2028 piek').
Vervang door relatieve aanduidingen: 'in het startjaar', 'in de bouwjaren', 'in de uitrol-jaren', 'rond het midden van de looptijd', 'in de achterste derde', 'in het slotjaar', 'tegen het einde'.

REGEL B — BEHOUD:
- Dossier-bedragen uit business-case Q&A (€650K eenmalig, €92.500/jaar structureel, €52K trainer, €37.500 begeleider, €87.500 procesinrichting, etc.). Die zijn dossier-feiten die over alle scenarios universeel zijn — die MOETEN in de motivatie blijven staan om de raming inzichtelijk te houden.
- Concrete onderbouwingen: aantallen consultanturen, bronsystemen, deelnemers, dagen externe begeleiding — die blijven staan zolang ze geen jaartal of looptijd noemen.

REGEL C — SCENARIO-TOTALEN MOETEN KLOPPEN:
Als je een scenario-totaal noemt ('dossier-totaal €X', 'totaal €Y'), MOET dat bedrag exact gelijk zijn aan de som van verdelingPerJaar[].euro voor díe inspanning in dít scenario. Verzin GEEN bedragen die niet uit de tabel volgen. Bij twijfel: laat het bedrag weg.

REGEL D — ZWAARTEPUNT-CLAIMS MOETEN KLOPPEN:
Als je een zwaartepunt noemt, bepaal dat door letterlijk te kijken naar de top-2 jaren met het hoogste euro-bedrag in verdelingPerJaar voor díe inspanning in dít scenario. Vertaal die jaar-positie relatief:
- Top-2 jaren in eerste 1/3 → 'zwaartepunt vroeg in de looptijd' / 'in de bouwjaren'
- Top-2 jaren in middelste 1/3 → 'zwaartepunt rond het midden van de looptijd'
- Top-2 jaren in laatste 1/3 → 'zwaartepunt in de achterste derde van de looptijd' (NIET 'in het slotjaar' tenzij het ECHT alleen het laatste jaar is)
- Top-2 verdeeld over begin én eind → 'zwaartepunt zowel in startjaar als slotjaar' (typisch voor 4-jarige scenario's met opstart-piek + structurele licentielast)
Niet generiek 'richting het slotjaar' zeggen als de top-2 jaren ervóór liggen — dat is misleidend. Tel de jaren en wees precies.

REGEL E — LANGE LOOPTIJDEN (min20 / langzamer): GEEN VERVOLGFINANCIERING-CLAIMS:
Bij scenario's met lange looptijd (bijvoorbeeld 8+ jaar) wordt het volledige programma binnen die jaren uitgevoerd — alle dossier-bedragen, alle inspanningen, eenmalig + structureel beheer. Het is GEEN 'aanloopfase' en er is GEEN 'vervolgfinanciering' nodig. Schrijf NIET dat 'verdere CRM-bouw, uitrol en borging buiten deze cyclus vallen' — dat is feitelijk onjuist; alle activiteiten zitten in de scenario-tabel. Beschrijf het lange scenario juist als 'rustige cadans waarin alle inspanningen volledig landen, met meer ademruimte tussen de fases'.`,
    previousAdvies: begroting,
  };

  console.log(`API: ${apiBase}/api/begroting-advies`);
  console.log(`Payload size: ${JSON.stringify(payload).length} chars`);
  console.log(`Inspanningen: ${inspanningen.length}`);
  console.log("→ TEKST_ONLY-call uitvoeren (4 scenarios parallel, ~30-60s op Opus 4.7)...");
  console.log();
  const t0 = Date.now();

  const res = await fetch(`${apiBase}/api/begroting-advies`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  const text = await res.text();
  const dt = Date.now() - t0;
  console.log(`HTTP ${res.status} in ${(dt / 1000).toFixed(1)}s — body ${text.length} chars`);

  if (!res.ok) {
    console.error("Response (eerste 500 chars):");
    console.error(text.slice(0, 500));
    process.exit(1);
  }

  let parsed: { success?: boolean; data?: unknown; error?: string };
  try {
    parsed = JSON.parse(text);
  } catch {
    console.error("Non-JSON response:");
    console.error(text.slice(0, 500));
    process.exit(1);
  }
  if (!parsed.success) {
    console.error(`API zei success=false: ${parsed.error}`);
    process.exit(1);
  }

  const nieuw = parsed.data as {
    scenarios?: Record<string, Scen | null>;
    tekstenSchoon?: boolean;
  };

  console.log();
  console.log("═".repeat(80));
  console.log("RESULTAAT — voor/na vergelijking per scenario");
  console.log("═".repeat(80));
  console.log(`tekstenSchoon vlag in response: ${nieuw.tekstenSchoon}`);
  console.log();

  const scenarioKeys = ["optimaal", "plus20", "min20", "advies"] as const;
  for (const skey of scenarioKeys) {
    const oud = begroting.scenarios?.[skey];
    const nw = nieuw.scenarios?.[skey];
    if (!oud || !nw) continue;

    console.log("─".repeat(80));
    console.log(`▌ SCENARIO: ${skey.toUpperCase()}  (${oud.aantalJaren} jaar)`);
    console.log("─".repeat(80));

    console.log("\n[ SAMENVATTING ]");
    console.log("VOOR:");
    console.log(`  ${oud.samenvatting ?? "—"}`);
    console.log("NA:");
    console.log(`  ${nw.samenvatting ?? "—"}`);

    console.log("\n[ PRIORITEITADVIES ]");
    console.log("VOOR:");
    console.log(`  ${(oud.prioriteitAdvies ?? "—").slice(0, 400)}${(oud.prioriteitAdvies ?? "").length > 400 ? "…" : ""}`);
    console.log("NA:");
    console.log(`  ${(nw.prioriteitAdvies ?? "—").slice(0, 400)}${(nw.prioriteitAdvies ?? "").length > 400 ? "…" : ""}`);

    console.log("\n[ MOTIVATIES PER INSPANNING ]");
    for (const oudInsp of oud.inspanningen ?? []) {
      const nwInsp = nw.inspanningen?.find(
        (i) =>
          i.inspanningTitel === oudInsp.inspanningTitel ||
          i.inspanningTitel.toLowerCase() === oudInsp.inspanningTitel.toLowerCase(),
      );
      console.log(`  ▸ ${oudInsp.inspanningTitel}`);
      console.log(`    VOOR: ${(oudInsp.motivatie ?? "—").slice(0, 250)}${(oudInsp.motivatie ?? "").length > 250 ? "…" : ""}`);
      console.log(`    NA:   ${(nwInsp?.motivatie ?? "—").slice(0, 250)}${(nwInsp?.motivatie ?? "").length > 250 ? "…" : ""}`);
    }

    // Cijfers-check: verifieer dat verdelingPerJaar ongewijzigd is
    let cijfersGelijk = true;
    for (const oudInsp of oud.inspanningen ?? []) {
      const nwInsp = nw.inspanningen?.find(
        (i) =>
          i.inspanningTitel === oudInsp.inspanningTitel ||
          i.inspanningTitel.toLowerCase() === oudInsp.inspanningTitel.toLowerCase(),
      );
      if (!nwInsp) {
        cijfersGelijk = false;
        break;
      }
      if (JSON.stringify(oudInsp.verdelingPerJaar) !== JSON.stringify(nwInsp.verdelingPerJaar)) {
        cijfersGelijk = false;
        console.log(`    ❌ verdelingPerJaar gewijzigd voor ${oudInsp.inspanningTitel}`);
      }
    }
    console.log();
    console.log(
      `[ CIJFERS-CHECK ] ${cijfersGelijk ? "✅ verdelingPerJaar identiek aan vóór de call" : "❌ verdelingPerJaar GEWIJZIGD — onverwacht!"}`,
    );
    console.log();
  }

  console.log("═".repeat(80));
  console.log("DRY RUN AFGEROND — er is NIETS naar Supabase geschreven.");
  console.log("Sessie d8b97442 staat nog precies zoals voor de call.");
  console.log("═".repeat(80));
}

main().catch((e) => {
  console.error("FOUT:", e);
  process.exit(1);
});
