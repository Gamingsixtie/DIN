// Expert mens — update mens-tekstvelden (motivatie + jaren[].activiteit/fase) in
// alle 4 scenarios + corrigeer "12 trainers faciliteren" naar "externe partij
// levert training; 12 Trainer/Adviseur A zelf cursist".
//
// Idempotent met marker stap7InterneUren.expertMensApplied = true.
// Alleen mens-velden raken. Geen commits.
//
// Categorie-classificatie (op basis van vUPI-data):
//   • leider (1)        : Yara HR-manager — inspanningsleider mens
//   • kernteam (5)      : 3 sectormanagers + Manager Klantcontact + HR-medewerker curriculum
//   • trainings_deelnemer (65) : 12 Trainer/Adviseur A (zelf cursist) + 47 frontline-cursisten
//                          + 6 ad-hoc-instromers (incl. Teamleider klantenservice als
//                          coördinator-deelnemer; in de data 1× geteld onder
//                          trainings_deelnemer als coördinator-rol)
//   • geconsulteerd (9) : 3 productmanagers DST + 2 productmanagers KLT + 2 marketeers
//                          + 1 junior marketeer Prof + 1 Teamleider Trainingen

import { createClient } from "@supabase/supabase-js";
import { readFileSync, existsSync, writeFileSync } from "fs";
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

const SESSION_ID = "d8b97442-ce8f-4134-b2c7-67dc8e3a3f93";
const supa = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
);

// ---------------------------------------------------------------------------
// Activiteit-tekst per scenario per jaar — gebaseerd op gemeten uren-curve.
// Werkpakketten (vier blokken):
//   1. Behoefte: nulmeting outside-in, casuïstiek-inventarisatie, externe
//      trainingspartner selecteren, deelnemerslijst vaststellen, kick-off.
//   2. Basis: voorbereiden trainingsblok 1 (curriculum afronden, deelnemers-
//      planning, leerdoelen verankeren bij leidinggevenden).
//   3. Vaardigheid: trainingsblok 1 (24u/cursist) + trainingsblok 2 (22u/cursist)
//      uitvoering door externe partij; coachings-on-the-job; tussen-evaluatie.
//   4. Borging: nazorg & evaluatie, opnemen in onboarding, jaarlijkse refresher,
//      overdracht aan lijn (Manager Klantcontact + HR).
// ---------------------------------------------------------------------------

type Fase = "Behoefte" | "Basis" | "Vaardigheid" | "Borging" | "Borging-licht";

interface JaarPlan {
  jaar: number;
  fase: Fase;
  activiteit: string;
}

// Gemeenschappelijke tekstbouwstenen
const ACT = {
  behoefte: "Behoefte-fase: nulmeting outside-in gespreksvaardigheid (1 sectormanager + Manager Klantcontact + HR-curriculumeigenaar leveren input), casuïstiek-inventarisatie via productmanagers en marketeers (geconsulteerd), selectie externe trainingspartij en contractering, vaststellen deelnemerslijst en kick-off met de 65 trainings-deelnemers (3 sectormanagers borgen sector-mandaat).",
  basis: "Basis-fase: externe partij rondt curriculumontwerp af in samenwerking met HR-curriculumeigenaar en Manager Klantcontact; planning van trainingsblok 1 voor 65 cursisten (12 Trainer/Adviseur A, 28 Klantenservice C, 7 Acc-C, 7 Mdw-binnendienst B, 5 Acc-C-Prof, 6 ad-hoc); leidinggevenden (sectormanagers + Manager Klantcontact) verankeren leerdoelen vóór start.",
  vaardigheid_blok1: "Vaardigheid-fase blok 1: externe partij voert trainingsblok 1 (24u/cursist) uit voor de 65 trainings-deelnemers — inclusief de 12 Trainer/Adviseur A als cursist; tussentijdse evaluatie door HR-curriculumeigenaar en Manager Klantcontact; sectormanagers borgen werkroostering.",
  vaardigheid_blok2: "Vaardigheid-fase blok 2: externe partij voert trainingsblok 2 (22u/cursist) uit met casuïstiek uit eigen werk; coaching-on-the-job door leidinggevenden (geen interne trainers — externe partij geeft training); tussen-evaluatie en bijsturing curriculum.",
  vaardigheid_combi: "Vaardigheid-fase: externe partij voert trainingsblok 1 (24u) en blok 2 (22u) uit voor 65 cursisten; casuïstiek-toetsing door productmanagers/marketeers; coaching-on-the-job door sectormanagers + Manager Klantcontact.",
  borging: "Borging-fase: nazorgcyclus en evaluatie van transferresultaten door HR-curriculumeigenaar; opnemen outside-in als vast onderdeel onboarding; jaarlijkse refresher via externe partij; overdracht naar lijn (Manager Klantcontact + sectormanagers) en gespreksvaardigheid in HRM-cyclus.",
  borging_licht: "Borging-licht: jaarlijkse korte refresher en monitoring door HR-curriculumeigenaar + Manager Klantcontact; outside-in opgenomen in HRM-cyclus, geen actieve trainingsuren meer; ad-hoc onboarding nieuwe medewerkers via standaard-curriculum.",
};

const PLAN: Record<string, JaarPlan[]> = {
  // 4 jaar: 81 / 1885 / 1753 / 95
  advies: [
    { jaar: 2026, fase: "Behoefte", activiteit: ACT.behoefte },
    { jaar: 2027, fase: "Vaardigheid", activiteit: ACT.vaardigheid_blok1 + " Volume-jaar (zwaartepunt cursisturen 65 × 24u + facilitering)." },
    { jaar: 2028, fase: "Vaardigheid", activiteit: ACT.vaardigheid_blok2 + " Tweede volume-jaar (65 × 22u)." },
    { jaar: 2029, fase: "Borging", activiteit: ACT.borging + " In dit korte advies-scenario alleen één borgingsjaar — minimum-pakket." },
  ],
  // 5 jaar: 81 / 1885 / 1753 / 280 / 95
  plus20: [
    { jaar: 2026, fase: "Behoefte", activiteit: ACT.behoefte },
    { jaar: 2027, fase: "Vaardigheid", activiteit: ACT.vaardigheid_blok1 + " Volume-jaar trainingsblok 1." },
    { jaar: 2028, fase: "Vaardigheid", activiteit: ACT.vaardigheid_blok2 + " Volume-jaar trainingsblok 2." },
    { jaar: 2029, fase: "Borging", activiteit: ACT.borging + " Actieve borgingsjaar met aanvullende casuïstiek-sessies." },
    { jaar: 2030, fase: "Borging-licht", activiteit: ACT.borging_licht },
  ],
  // 7 jaar: 78 / 326 / 1885 / 1710 / 280 / 75 / 75
  optimaal: [
    { jaar: 2026, fase: "Behoefte", activiteit: ACT.behoefte },
    { jaar: 2027, fase: "Basis", activiteit: ACT.basis + " In dit optimaal-scenario aparte basis-jaar (geen trainingsblok dit jaar) zodat curriculum en planning rustig kunnen landen." },
    { jaar: 2028, fase: "Vaardigheid", activiteit: ACT.vaardigheid_blok1 + " Trainingsblok 1 in jaar 3, conform optimale fasering." },
    { jaar: 2029, fase: "Vaardigheid", activiteit: ACT.vaardigheid_blok2 + " Trainingsblok 2 in jaar 4." },
    { jaar: 2030, fase: "Borging", activiteit: ACT.borging + " Actieve borging direct na laatste blok." },
    { jaar: 2031, fase: "Borging-licht", activiteit: ACT.borging_licht },
    { jaar: 2032, fase: "Borging-licht", activiteit: ACT.borging_licht },
  ],
  // 10 jaar: 82 / 324 / 1883 / 280 / 1710 / 280 / 75 / 75 / 75 / 75
  min20: [
    { jaar: 2026, fase: "Behoefte", activiteit: ACT.behoefte },
    { jaar: 2027, fase: "Basis", activiteit: ACT.basis + " Uitgesmeerde basisjaar in min20 — extra ruimte voor casuïstiek-uitwerking." },
    { jaar: 2028, fase: "Vaardigheid", activiteit: ACT.vaardigheid_blok1 + " Trainingsblok 1 in jaar 3." },
    { jaar: 2029, fase: "Borging", activiteit: ACT.borging + " Tussen-borging tussen blok 1 en blok 2: transfer monitoren, casuïstiek aanscherpen." },
    { jaar: 2030, fase: "Vaardigheid", activiteit: ACT.vaardigheid_blok2 + " Trainingsblok 2 in jaar 5 — pieken kunnen niet verder uitgerekt door training-werklast." },
    { jaar: 2031, fase: "Borging", activiteit: ACT.borging + " Eerste borgings-jaar na blok 2." },
    { jaar: 2032, fase: "Borging-licht", activiteit: ACT.borging_licht },
    { jaar: 2033, fase: "Borging-licht", activiteit: ACT.borging_licht },
    { jaar: 2034, fase: "Borging-licht", activiteit: ACT.borging_licht },
    { jaar: 2035, fase: "Borging-licht", activiteit: ACT.borging_licht },
  ],
};

// ---------------------------------------------------------------------------
// Motivatie-tekst per scenario — hergebruikt blok dat per scenario ingevuld wordt
// met werkelijk uren-totaal mens (lees uit data).
// ---------------------------------------------------------------------------
function bouwMotivatie(scen: string, totaalUrenMens: number, jaarUren: { j: number; u: number }[]): string {
  const looptijd = jaarUren.length;
  const piek = [...jaarUren].sort((a, b) => b.u - a.u).slice(0, 2).map((x) => x.j).sort();
  return [
    `Mens-domein totaal ${totaalUrenMens.toLocaleString("nl-NL")} uur over ${looptijd} jaar (${jaarUren[0].j}–${jaarUren[looptijd - 1].j}).`,
    `Doelgroep: 1 inspanningsleider (Yara, HR-manager — programmaorganisatie) + 5 kernteam (3 sectormanagers PO/VO/Prof + Manager Klantcontact + HR-medewerker curriculum-eigenaar; uitsluitend voor lijnen uitzetten en sector-borging — geen trainingsfacilitering) + ~65 trainings-deelnemers + ~9 geconsulteerden.`,
    `Externe partij levert de trainingen (~46u contacttijd per cursist, opgesplitst in blok 1 van 24u en blok 2 van 22u). De 65 trainings-deelnemers omvatten 28 Klantenservice medewerkers C, 12 Trainer/Adviseur A (zelf cursist — zij geven Cito-product-trainingen klantgericht en moeten outside-in zelf beheersen), 7 Accountmanagers C, 7 Medewerkers binnendienst B, 5 Accountmanagers C Professionals en ~6 ad-hoc-instromers (Teamleider klantenservice + overige Acc/KS/Mdw-binnendienst-rollen).`,
    `Geconsulteerden (~9): productmanagers (DST + KLT) en marketeers leveren casuïstiek-input voor het curriculum; Teamleider Trainingen coördineert de externe trainingspartij. Geen interne trainingsfacilitering door Cito — externe trainer voert beide blokken uit.`,
    `Programma-vs-lijn: programma-uren betreffen leider, kernteam, trainings-deelnemers (cursisturen + voorbereiding) en geconsulteerden; lijn-uren (regulier coachen door leidinggevenden) zitten niet in dit totaal.`,
    `Cito-kerndoel-koppeling: gespreksvaardigheid outside-in op alle frontline-rollen — past direct bij Cito-doel om commerciële slagkracht en klantrelaties te verdiepen; volume (65 cursisten × 46u = 2.990 cursisturen) reflecteert het bredere bereik over de drie sectoren.`,
    `Pieken in ${piek.join(" en ")} (trainingsblokken); overige jaren: voorbereiding en borging.`,
  ].join(" ");
}

// ---------------------------------------------------------------------------
// Onderbouwing-correcties voor vUPI mens-rollen waar "trainers faciliteren" of
// "facilitering" foutief stond. Alleen velden raken die deze fout bevatten.
// ---------------------------------------------------------------------------
function corrigeerOnderbouwingTrainers(o: string | undefined, functieId: string): string | undefined {
  if (!o) return o;
  let n = o;
  // Generieke vervangingen — externe partij levert training
  n = n
    .replace(/12 trainers faciliteren intern/gi, "externe partij levert training; 12 Trainer/Adviseur A zijn zelf cursist")
    .replace(/12 trainers faciliteren/gi, "externe partij levert training; 12 Trainer/Adviseur A zijn zelf cursist")
    .replace(/12 Trainer\/Adviseur A faciliteren/gi, "externe partij levert training; 12 Trainer/Adviseur A zijn zelf cursist");

  // Specifiek voor de trainer_adviseur_a-rij — herschrijf de onderbouwing volledig
  if (functieId === "trainer_adviseur_a") {
    n = "12 Trainer/Adviseur A zijn ZELF cursist (zij geven Cito-product-trainingen klantgericht en moeten outside-in zelf beheersen) — externe partij levert de training. Per cursist 46u contacttijd (24u blok 1 in 2027 + 22u blok 2 in 2028) = 12 × 46u = 552u. Geen interne facilitering door deze rol — coördinatie loopt via externe partij + Teamleider Trainingen.";
  }
  return n;
}

async function main() {
  const { data, error } = await supa
    .from("din_sessions")
    .select("data")
    .eq("id", SESSION_ID)
    .maybeSingle();
  if (error) { console.error("read error", error); process.exit(1); }
  if (!data) { console.error("session niet gevonden"); process.exit(1); }

  const root: any = data.data;
  const stap4 = root?.crossAnalyseWizard?.stepResults?.stap4;
  const s7 = stap4?.stap7InterneUren;
  if (!s7) { console.error("stap7InterneUren ontbreekt"); process.exit(1); }

  const reeds = s7.expertMensApplied === true;
  if (reeds) {
    console.log("⚠ expertMensApplied=true — script is al eerder gedraaid. Doorgaan met re-apply (idempotent).");
  }

  // Audit-rapport buffer
  const audit: string[] = [];
  const log = (s = "") => { console.log(s); audit.push(s); };

  log("# AUDIT EXPERT-MENS — voor/na");
  log(`Sessie: ${SESSION_ID}`);
  log(`Gedraaid: ${new Date().toISOString()}`);
  log(`Reeds toegepast: ${reeds}`);

  // ----- 1) vUPI mens — corrigeer onderbouwing waar "trainers faciliteren" stond
  log("\n## 1) vUPI mens — onderbouwing-correcties (trainers faciliteren → externe partij)");
  const vUPI: any[] = s7.vastgesteldeUrenPerInspanning ?? [];
  for (const v of vUPI) {
    if (v.domein !== "mens") continue;
    for (const r of v.rollen ?? []) {
      const oud = r.onderbouwing;
      const nieuw = corrigeerOnderbouwingTrainers(oud, r.functieId);
      if (nieuw !== oud) {
        log(`\n• ${r.functieNaam} (${r.functieId})`);
        log(`  VOOR: ${String(oud ?? "").slice(0, 300)}${(oud ?? "").length > 300 ? "…" : ""}`);
        log(`  NA  : ${String(nieuw ?? "").slice(0, 300)}${(nieuw ?? "").length > 300 ? "…" : ""}`);
        r.onderbouwing = nieuw;
      }
    }
  }

  // ----- 2) Per scenario: motivatie + jaren[].fase/activiteit
  log("\n## 2) scenarios — motivatie + jaren[].activiteit/fase");
  const scenKeys = ["advies", "plus20", "optimaal", "min20"];
  for (const skey of scenKeys) {
    const sc = s7.scenarios?.[skey];
    if (!sc) { log(`\n### ${skey} — scenario niet aanwezig (overgeslagen)`); continue; }
    const ds = (sc.domeinen as any[]).find((d: any) => d.domein === "mens");
    if (!ds) { log(`\n### ${skey} — geen mens-domein (overgeslagen)`); continue; }

    log(`\n### scenario ${skey}`);

    // Werkelijke uren per jaar
    const jaarUren = (ds.jaren ?? []).map((j: any) => ({
      j: j.jaar,
      u: (j.rollen ?? []).reduce((s: number, r: any) => s + (r.uren ?? 0), 0),
    }));
    const totaal = jaarUren.reduce((s: number, x: { u: number }) => s + x.u, 0);
    log(`  totaal mens: ${totaal}u over ${jaarUren.length} jaar`);

    // Motivatie herschrijven
    const oudMotivatie = ds.motivatie ?? "";
    const nieuwMotivatie = bouwMotivatie(skey, totaal, jaarUren);
    log(`\n  motivatie VOOR: ${String(oudMotivatie).slice(0, 250)}${oudMotivatie.length > 250 ? "…" : ""}`);
    log(`  motivatie NA  : ${nieuwMotivatie.slice(0, 250)}…`);
    ds.motivatie = nieuwMotivatie;

    // Per jaar: fase + activiteit
    const plan = PLAN[skey] ?? [];
    log(`\n  jaren — fase + activiteit (${plan.length} jaren in plan, ${ds.jaren?.length ?? 0} in data):`);
    for (const j of ds.jaren ?? []) {
      const target = plan.find((p) => p.jaar === j.jaar);
      if (!target) {
        log(`    j=${j.jaar}: GEEN PLAN — overgeslagen (let op!)`);
        continue;
      }
      const oudAct = j.activiteit ?? "(leeg)";
      const oudFase = j.fase ?? "(leeg)";
      j.fase = target.fase;
      j.activiteit = target.activiteit;
      log(`    j=${j.jaar}: fase '${oudFase}' → '${target.fase}'; activiteit lengte ${oudAct.length}→${target.activiteit.length}`);
    }
  }

  // ----- 3) Marker zetten
  s7.expertMensApplied = true;
  s7.expertMensAppliedAt = new Date().toISOString();
  log(`\n## 3) Marker gezet: expertMensApplied=true (${s7.expertMensAppliedAt})`);

  // ----- 4) Schrijf terug naar Supabase
  const { error: upErr } = await supa
    .from("din_sessions")
    .update({ data: root, updated_at: new Date().toISOString() })
    .eq("id", SESSION_ID);
  if (upErr) {
    console.error("UPDATE FAILED:", upErr);
    process.exit(1);
  }
  log("\n## 4) Supabase update OK");

  // Schrijf audit-rapport (als TXT-buffer voor vervolgstap)
  writeFileSync(join(process.cwd(), "tmp-expert-mens-audit-buffer.txt"), audit.join("\n"), "utf-8");
  console.log("\n>>> klaar. Audit buffer in tmp-expert-mens-audit-buffer.txt");
}

main().catch((e) => { console.error(e); process.exit(1); });
