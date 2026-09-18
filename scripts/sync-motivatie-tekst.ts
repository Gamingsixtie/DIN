// Herschrijft de motivatie-tekst per scenario × per inspanning in
// scenarios.<key>.inspanningen[i].motivatie zodat hij de juiste bedragen
// uit known-breakdowns.ts gebruikt. Tekst-template is gelijk over alle
// scenarios voor dezelfde inspanning; alleen het cumulatief-structureel-
// totaal varieert per scenario (aantal actieve jaren × bedrag).
//
// Geen aanpassingen aan totalen/verdelingPerJaar — alleen tekst.

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

const fmt = (n: number) => `€${Math.round(n).toLocaleString("nl-NL")}`;

interface MotivatieGenerator {
  match: RegExp;
  label: string;
  /** Genereer motivatie-tekst voor dit scenario met N jaren. */
  generate: (aantalJaren: number, totaalEuro: number) => string;
}

const GENERATORS: MotivatieGenerator[] = [
  // ─────────────────────────────────────────────────────────────────────
  // CRM (data_systemen) — €540K eenmalig + €92.5K/jr structureel vanaf jr 2
  // ─────────────────────────────────────────────────────────────────────
  {
    match: /crm.klantdashboard/i,
    label: "CRM",
    generate: (aantalJaren, totaalEuro) => {
      const structJaren = Math.max(0, aantalJaren - 1);
      const structCum = 92_500 * structJaren;
      return (
        "Cross-sectoraal Microsoft Dynamics-klantdashboard voor 85 gebruikers, gefaseerd over " +
        `${aantalJaren} jaar (${aantalJaren === 4 ? "advies — snelste haalbaar" : aantalJaren === 5 ? "+20% sneller" : aantalJaren === 7 ? "huidig Cito-budget" : "−20% langzamer"}). ` +
        "**Eenmalig € 440.000 – € 640.000 (mid € 540.000)** voor externe implementatie + dashboardbouw " +
        "(1.500–2.500 consultanturen × € 150–170/u, mid € 312.500), datamigratie + 7–8 bronsysteem-" +
        "integraties (€ 75K–€ 125K, mid € 100K), training en adoptie-begeleiding 85 medewerkers " +
        "(€ 40K–€ 55K, mid € 47.500) en dubbele licentielast tijdens 6–12 mnd transitie van de " +
        "huidige Dynamics-omgeving (€ 30K–€ 60K, mid € 45K). " +
        "**Structureel € 75K–€ 110K per jaar vanaf jaar 2** (na go-live): MS Dynamics 365 Pro-licenties " +
        "85 gebruikers × € 55–65/m (€ 50K–€ 75K/jr) + beheer + doorontwikkeling 0,3 FTE intern " +
        "(€ 25K–€ 35K/jr). " +
        `Voor dit ${aantalJaren}-jarig scenario: € 540.000 eenmalig + ${structJaren} structurele ` +
        `jaren × € 92.500/jr = ${fmt(structCum)} → totaal ${fmt(totaalEuro)}. ` +
        "NB: interne capaciteitskosten (~1.466 u × € 74/u ≈ € 110K opportunity) staan in § 4.2 Interne uren."
      );
    },
  },

  // ─────────────────────────────────────────────────────────────────────
  // Gespreksvaardigheid (mens) — €142.5K eenmalig + €20K/jr (refresh+onb)
  // vanaf jaar 4
  // ─────────────────────────────────────────────────────────────────────
  {
    match: /gespreksvaardigh/i,
    label: "Gespreksvaardigheid (mens)",
    generate: (aantalJaren, totaalEuro) => {
      const refreshJaren = Math.max(0, aantalJaren - 4 + 1);
      const structCum = 20_000 * refreshJaren;
      return (
        "Cross-sectorale gespreksvaardigheidstraining outside-in voor 80 deelnemers in 2 " +
        `trainings-blokken, looptijd ${aantalJaren} jaar. ` +
        "**Eenmalig € 125.000 – € 160.000 (mid € 142.500)**: LMS-licentie 5 jaar vooruitbetaald " +
        "(€ 30K), content-ontwikkeling outside-in curriculum 25–30 dagen × € 850/dag (€ 25K), " +
        "train-de-trainer 12 interne adviseurs × 2 dagen externe trainer (€ 10K), nulmeting + " +
        "intake-sessies 80 deelnemers (€ 10K), kerntraject 2 blokken × 12–13 dagen × € 2.500/dag " +
        "(€ 63K) en sessieondersteuning + locatie + materialen (€ 17K). " +
        "**Structureel € 15.000 – € 20.000/jaar vanaf jaar 4** voor verankering: refresh-sessies " +
        "3–4×/jr × € 3.500–4.500 (€ 12K–€ 18K) + onboarding nieuwe medewerkers (€ 3K–€ 7K). " +
        `Voor dit ${aantalJaren}-jarig scenario: € 142.500 eenmalig + ${refreshJaren} actieve ` +
        `refresh-jaren × € 20.000 = ${fmt(structCum)} → totaal ${fmt(totaalEuro)}. ` +
        "NB: interne deelname-uren van de 80 deelnemers staan in § 4.2 Interne uren."
      );
    },
  },

  // ─────────────────────────────────────────────────────────────────────
  // Uniforme klantbenadering (processen) — €78K eenmalig + €12K/jr
  // structureel vanaf jaar 2
  // ─────────────────────────────────────────────────────────────────────
  {
    match: /uniforme/i,
    label: "Uniforme klantbenadering (processen)",
    generate: (aantalJaren, totaalEuro) => {
      const structJaren = Math.max(0, aantalJaren - 1);
      const structCum = 12_000 * structJaren;
      return (
        "Cross-sectoraal inrichten van uniforme klantinformatieprocessen + funnelgovernance over " +
        `3 sectoren (PO, VO, Zakelijk), looptijd ${aantalJaren} jaar. ` +
        "**Eenmalig € 70.000 – € 86.000 (mid € 78.000)**: externe procesbegeleiding 20 dagen × " +
        "€ 800 + uitrol-coördinatie 11–30 extra dagen (€ 25K–€ 40K, mid € 32.500), " +
        "sessiebegeleiding 9 multidisciplinaire werksessies × € 1.700–€ 2.800 (€ 15K–€ 25K, " +
        "mid € 20K), externe materialen + methodieken BiSL/Lean (€ 5K–€ 10K, mid € 7.500), " +
        "cross-sectoraal governance-instrumentarium KPI-template + integratie-format CRM (€ 10K) " +
        "en sectorvariatie-buffer 10% herbewerkingsrisico (€ 5K–€ 7K, mid € 6K). " +
        "**Structureel € 10.000 – € 15.000/jaar vanaf jaar 2**: proceseigenaarschap-borging " +
        "via bestaande Smartprocess-tooling (geen extra licentiekost) + 14–18 dagen externe " +
        "ondersteuning × € 700–850/dag = € 10K–€ 15K/jr. " +
        `Voor dit ${aantalJaren}-jarig scenario: € 78.000 eenmalig + ${structJaren} jaar × € 12.000 ` +
        `= ${fmt(structCum)} → totaal ${fmt(totaalEuro)}. ` +
        "NB: interne werkgroep-uren en proceseigenaarschap-uren staan in § 4.2 Interne uren."
      );
    },
  },

  // ─────────────────────────────────────────────────────────────────────
  // Leiderschap (cultuur) — €107.5K eenmalig bruto + structureel met
  // gemengde vanafJaar (360° vanaf jr 1, cultuurmeting jr 3, onboarding jr 5)
  // ─────────────────────────────────────────────────────────────────────
  {
    match: /leiderschap/i,
    label: "Leiderschap (cultuur)",
    generate: (aantalJaren, totaalEuro) => {
      const dr360 = Math.max(0, aantalJaren - 1 + 1);
      const drCultuurmeting = Math.max(0, aantalJaren - 3 + 1);
      const drOnboarding = Math.max(0, aantalJaren - 5 + 1);
      const cum360 = 5_000 * dr360;
      const cumCM = 2_500 * drCultuurmeting;
      const cumOB = 2_000 * drOnboarding;
      const structCum = cum360 + cumCM + cumOB;
      const onboardingZin =
        drOnboarding > 0
          ? `onboarding nieuwe leiders (€ 2K/jr vanaf jaar 5) = ${drOnboarding} actieve jaren × € 2K = ${fmt(cumOB)}`
          : `onboarding nieuwe leiders (€ 2K/jr vanaf jaar 5) — start na looptijd, n.v.t. in dit ${aantalJaren}-jarig scenario`;
      const cultuurmetingZin =
        drCultuurmeting > 0
          ? `cultuurmeting (€ 2.500/jr vanaf jaar 3) = ${drCultuurmeting} jr × € 2.500 = ${fmt(cumCM)}`
          : `cultuurmeting (€ 2.500/jr vanaf jaar 3) — n.v.t. in dit korte scenario`;
      return (
        "Cross-sectoraal leiderschapsprogramma 'Outside-in als gedeelde waarde' voor 9 " +
        `leidinggevenden + 2 HR coördinerend, looptijd ${aantalJaren} jaar. ` +
        "**Eenmalig € 95.000 – € 120.000 (mid € 107.500)** bruto: externe begeleider 15 dagen × " +
        "€ 2.500/dag senior leiderschapsconsultant (€ 33K–€ 42K, mid € 37.500), executive-tarief " +
        "reservering top-coaches MT-niveau € 4.000/dag, 1–2 trajecten (€ 15K–€ 25K, mid € 20K), " +
        "individuele coaching 9 leidinggevenden × € 4.000/traject NIP/NOLOC-coach (€ 32K–€ 40K, " +
        "mid € 36K) en HR-instrumentarium-aanpassing functioneringscyclus + 360°-integratie " +
        "(€ 13K–€ 17K, mid € 15K). " +
        "**Structureel € 7.500 – € 11.500/jaar gemiddeld**: 360°-feedback tool licentie € 5K/jr " +
        `vanaf jaar 1 = ${dr360} jr × € 5K = ${fmt(cum360)}; ` +
        cultuurmetingZin + "; " + onboardingZin + ". " +
        `Voor dit ${aantalJaren}-jarig scenario: € 107.500 eenmalig + cumulatief structureel ` +
        `${fmt(structCum)} → totaal ${fmt(totaalEuro)}. ` +
        "**Disclaimer**: scenariobedragen worden op bruto-basis berekend. De kostenraming-tekst " +
        "kan verwijzen naar out-of-pocket totalen (€ 60K–€ 72K) — die zijn ná aftrek van " +
        "interne uren (740 u × € 77/u ≈ € 57K, in § 4.2 Interne uren), niet van de bedragen " +
        "in § 4.1 begroting."
      );
    },
  },
];

async function main() {
  const sessionId = "d8b97442-ce8f-4134-b2c7-67dc8e3a3f93";
  const { data: row, error: readErr } = await supa
    .from("din_sessions").select("data").eq("id", sessionId).maybeSingle();
  if (readErr || !row) { console.error("not found"); process.exit(1); }

  const data = row.data as Record<string, unknown>;
  const wiz = data.crossAnalyseWizard as { stepResults?: Record<string, Record<string, unknown>> } | undefined;
  const stap4 = wiz?.stepResults?.stap4 as Record<string, unknown> | undefined;
  const begroting = stap4?.begrotingAdvies as
    | { scenarios?: Record<string, { aantalJaren?: number; inspanningen?: Array<Record<string, unknown>> } | null> }
    | undefined;
  if (!begroting?.scenarios) { console.error("no scenarios"); process.exit(1); }

  let updates = 0;
  for (const [sk, sc] of Object.entries(begroting.scenarios)) {
    if (!sc?.inspanningen || !sc.aantalJaren) continue;
    console.log(`\n=== ${sk.toUpperCase()} (${sc.aantalJaren}j) ===`);
    for (const insp of sc.inspanningen) {
      const titel = (insp.inspanningTitel as string) ?? "";
      const totaalEuro = (insp.totaalEuro as number) ?? 0;
      const gen = GENERATORS.find((g) => g.match.test(titel));
      if (!gen) {
        console.log(`  (${titel.slice(0, 40)}) — geen generator (overslaan)`);
        continue;
      }
      const oudeMotivatie = (insp.motivatie as string) ?? "";
      const nieuweMotivatie = gen.generate(sc.aantalJaren, totaalEuro);
      insp.motivatie = nieuweMotivatie;
      updates++;
      console.log(`  ✓ ${gen.label}: motivatie geüpdatet (${oudeMotivatie.length} → ${nieuweMotivatie.length} chars)`);
    }
  }

  data.version = ((data.version as number | undefined) ?? 0) + 1;
  data.updatedAt = new Date().toISOString();

  const { error: writeErr } = await supa
    .from("din_sessions")
    .update({ data, updated_at: new Date().toISOString() })
    .eq("id", sessionId);
  if (writeErr) { console.error("write fail:", writeErr.message); process.exit(1); }
  console.log(`\n✓ Klaar: ${updates} motivatie-teksten gesynchroniseerd (version ${data.version})`);
}

main().catch((e) => { console.error(e); process.exit(1); });
