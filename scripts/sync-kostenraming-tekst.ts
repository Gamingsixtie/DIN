// Herschrijft de kostenraming-tekst in subEffortAnalysis (Stap 4) voor alle
// 4 hoofd-inspanningen zodat de tekst 1-op-1 overeenkomt met de breakdown
// in known-breakdowns.ts (C2-tabel) en met de scenariobedragen in §4.1.
//
// Zonder deze fix zien gebruikers verschillende getallen in C1 (kostenraming-
// citaat) en C2 (breakdown-tabel), wat tot verwarring leidt — speciaal bij
// leiderschap (out-of-pocket €60-72K vs bruto €108K) en processen (motivatie
// noemt governance + sectorvariatie die in kostenraming-tekst ontbreken).

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

interface Update {
  match: RegExp;
  nieuweTekst: string;
  label: string;
}

const UPDATES: Update[] = [
  {
    label: "CRM-klantdashboard (data_systemen)",
    match: /crm.klantdashboard/i,
    nieuweTekst:
      "De totale out-of-pocket investering voor het cross-sectoraal implementeren en inrichten van het integraal CRM-klantdashboard kent twee delen.\n\n" +
      "**Eenmalig € 440.000 – € 640.000**, opgebouwd uit:\n" +
      "• Externe implementatie en dashboardbouw — 1.500–2.500 consultanturen × € 150–170/u senior CRM-consultant NL (Berenschot 2026) = € 250.000–€ 375.000\n" +
      "• Datamigratie en 7–8 bronsysteem-integraties — 80–150 ontwikkeluren per koppeling × € 100–130/u + datacleaning = € 75.000–€ 125.000\n" +
      "• Training en adoptie-begeleiding voor 85 medewerkers + externe schaduwbegeleiding = € 40.000–€ 55.000\n" +
      "• Dubbele licentielast 6–12 maanden parallel-runtime huidige Dynamics-omgeving (85 gebruikers × € 55–65/maand × 6–12 mnd) = € 30.000–€ 60.000\n\n" +
      "**Structureel € 75.000 – € 110.000 per jaar vanaf jaar 2 (na go-live)**:\n" +
      "• CRM-licenties 85 gebruikers Microsoft Dynamics 365 Customer Engagement Pro (Microsoft Pricing 2025: € 55–65/maand) = € 50.000–€ 75.000/jaar\n" +
      "• Beheer + doorontwikkeling — 0,3 FTE intern + functioneel beheer = € 25.000–€ 35.000/jaar\n\n" +
      "NB: interne capaciteitskosten (~1.466 uur × € 74/u ≈ € 110.000 opportunity-kosten) zijn meegenomen in § 4.2 Interne uren — niet in deze out-of-pocket-raming.",
  },
  {
    label: "Gespreksvaardigheidstraining (mens)",
    match: /gespreksvaardigh/i,
    nieuweTekst:
      "De totale out-of-pocket investering voor de cross-sectorale gespreksvaardigheidstraining outside-in kent twee delen.\n\n" +
      "**Eenmalig € 125.000 – € 160.000 (middenwaarde € 142.500)**, opgebouwd uit:\n" +
      "• LMS-licentie 5 jaar vooruitbetaald (~€ 6.000/jaar × 5 = € 30.000) — vergelijkbare aanbieders TalentLMS, Easy LMS, AbsorbLMS\n" +
      "• Content-ontwikkeling outside-in curriculum — 25–30 dagen × € 850/dag curriculum-ontwerper NL = € 21.000–€ 30.000\n" +
      "• Train-de-trainer voor 12 interne trainer/adviseurs — 2 dagen × € 5.000/dag externe trainer = € 10.000\n" +
      "• Nulmeting + intake-sessies — 80 deelnemers × € 100 digitaal assessment + 4 sector-intakes × € 500 = € 10.000\n" +
      "• Kerntraject — 2 trainingsblokken × 12–13 dagen × € 2.500/dag externe trainingspartner outside-in = € 54.000–€ 72.000 (afgerond € 63.000) voor 80 deelnemers\n" +
      "• Sessieondersteuning + locatie + materialen = € 12.000–€ 22.000\n\n" +
      "**Structureel € 15.000 – € 20.000 per jaar vanaf jaar 4 (verankering)**:\n" +
      "• Refresh-sessies 3–4×/jaar × € 3.500–4.500/sessie = € 12.000–€ 18.000/jaar\n" +
      "• Onboarding nieuwe medewerkers 8–12 instromers × € 400–600 micro-leertraject = € 3.000–€ 7.000/jaar\n\n" +
      "NB: interne deelname-uren van de 80 deelnemers (verzuimde productietijd) zijn meegenomen in § 4.2 Interne uren — niet in deze out-of-pocket-raming.",
  },
  {
    label: "Uniforme klantbenadering (processen)",
    match: /uniforme/i,
    nieuweTekst:
      "De out-of-pocket investering voor het cross-sectoraal inrichten van uniforme klantinformatieprocessen + funnelgovernance kent twee delen.\n\n" +
      "**Eenmalig € 70.000 – € 86.000 (middenwaarde € 78.000)**, opgebouwd uit:\n" +
      "• Externe procesbegeleiding 20 dagen × € 800/dag + 11–30 extra dagen voor uitrol over 3 sectoren = € 25.000–€ 40.000\n" +
      "• Sessiebegeleiding 9 multidisciplinaire werksessies (3 sessies × 3 sectoren PO/VO/Zakelijk) × € 1.700–€ 2.800/sessie = € 15.000–€ 25.000\n" +
      "• Externe materialen / methodieken — BiSL/Lean-licenties + Cito-specifieke content-aanpassing = € 5.000–€ 10.000\n" +
      "• Cross-sectoraal governance-instrumentarium — KPI-template + integratie-format CRM = € 10.000\n" +
      "• Sectorvariatie-buffer — 10% herbewerkingsrisico bij late funneldefinitie-besluiten = € 5.000–€ 7.000\n\n" +
      "**Structureel € 10.000 – € 15.000 per jaar vanaf jaar 2**:\n" +
      "• Proceseigenaarschap-borging via bestaande Smartprocess-tooling — 14–18 dagen/jaar externe ondersteuning × € 700–850/dag = € 10.000–€ 15.000/jaar\n\n" +
      "NB: interne werkgroep- en proceseigenaarschap-uren zijn meegenomen in § 4.2 Interne uren — niet in deze out-of-pocket-raming.",
  },
  {
    label: "Leiderschapsprogramma (cultuur)",
    match: /leiderschap/i,
    nieuweTekst:
      "De out-of-pocket investering voor het cross-sectorale leiderschapsprogramma 'Outside-in als gedeelde waarde' (9 leidinggevenden + 2 HR coördinerend) kent twee delen.\n\n" +
      "**Eenmalig € 95.000 – € 120.000 (middenwaarde € 107.500)**, opgebouwd uit:\n" +
      "• Externe begeleider programma-ontwerp en uitvoering — 15 dagen × € 2.500/dag senior leiderschapsconsultant (Berenschot 2026) = € 33.000–€ 42.000 (middenwaarde € 37.500)\n" +
      "• Executive-tarief reservering MT-coaching — top-coaches (NIP/NOLOC) tot € 4.000/dag, 1–2 trajecten = € 15.000–€ 25.000 (middenwaarde € 20.000)\n" +
      "• Individuele coaching — 9 leidinggevenden × € 4.000 per traject (~5 sessies × € 800/sessie NIP-coach) = € 32.000–€ 40.000 (middenwaarde € 36.000)\n" +
      "• HR-instrumentarium-aanpassing functioneringscyclus + 360°-integratie — 360°-tool config + 3–5 dagen HR-adviseur × € 850/dag = € 13.000–€ 17.000 (middenwaarde € 15.000)\n\n" +
      "**Structureel € 7.500 – € 11.500 per jaar (gemiddeld over de looptijd)**:\n" +
      "• 360°-feedback tool licentie vanaf jaar 1 (Effectory/Performance360/GreatPlaceToWork) = € 4.000–€ 6.000/jaar\n" +
      "• Jaarlijkse cultuurmeting vanaf jaar 3 (kleine MT-populatie) = € 2.000–€ 3.000/jaar\n" +
      "• Onboarding nieuwe leiders vanaf jaar 5 (1–2 instromers/jaar × € 1.000–€ 2.000 micro-traject) = € 1.500–€ 2.500/jaar\n\n" +
      "NB: interne uren — totaal 740 u × gemiddeld € 77/u = circa € 57.000 — zijn meegenomen in § 4.2 Interne uren en niet in deze out-of-pocket-raming.",
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
  const sub = stap4?.subEffortAnalysis as Array<Record<string, unknown>> | undefined;
  if (!sub) { console.error("no subEffortAnalysis"); process.exit(1); }

  for (const update of UPDATES) {
    const insp = sub.find((s) => update.match.test(s.titel as string));
    if (!insp) { console.log(`(${update.label}) niet gevonden — overslaan`); continue; }
    const dossier = (insp.dossier ??= {}) as Record<string, unknown>;
    const oude = (dossier.kostenraming as string | undefined) ?? "";
    dossier.kostenraming = update.nieuweTekst;
    console.log(`✓ ${update.label}: kostenraming bijgewerkt (${oude.length} chars → ${update.nieuweTekst.length} chars)`);
  }

  data.version = ((data.version as number | undefined) ?? 0) + 1;
  data.updatedAt = new Date().toISOString();

  const { error: writeErr } = await supa
    .from("din_sessions")
    .update({ data, updated_at: new Date().toISOString() })
    .eq("id", sessionId);
  if (writeErr) { console.error("write fail:", writeErr.message); process.exit(1); }
  console.log(`\n✓ Klaar (version ${data.version})`);
}

main().catch((e) => { console.error(e); process.exit(1); });
