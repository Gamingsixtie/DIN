// Fix Stap 7 mei-correcties:
// A. Verwijder accountmanager_c_prof (geconsulteerd, 18u, 3 personen) — split-rol weg
// B. Mens 2026 (alle scenarios): "1 sectormanager" → "3 sectormanagers"
// C. Data plus20 motivatie: bijzin "(PO_b ... PO_a)" weg
// D. Data optimaal/min20 motivatie: "zonder PO_a en PO_b" verduidelijken
// E. Data 2026 advies/min20/optimaal: "Productowners" weg uit consult-claim
// F. Data 2027 plus20: "Productowners + BIA-C" → "Product Owner van de systemen + Business informatieanalist C"
// G. Data 2028 alle scenarios: 26 → 25 trainings-deelnemers, Content Specialist weg, 3 Acc-C-Prof claim weg
// H. Data 2029 plus20 + 2031 min20: "Procesmanager K&M" → "Product Owner van de systemen" voor uitfasering
// I. Data 2029 advies + 2030 optimaal + 2032 min20: "Content Specialist" weg
// Idempotent via marker s7.meiCorrectiesApplied.
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
    process.env[t.substring(0, e).trim()] = t.substring(e + 1).trim().replace(/^["']|["']$/g, "");
  }
}
loadEnvFile(join(process.cwd(), ".env.local"));

const SESSION_ID = "d8b97442-ce8f-4134-b2c7-67dc8e3a3f93";

// =====================================================================
// Data motivaties (clean — geen technische PO_a/PO_b notatie, 7 geconsulteerden NA acc-c-prof verwijdering)
// =====================================================================
const DATA_MOTIVATIE: Record<string, string> = {
  advies:
    "Sven (SIO) leidt het data & systemen-spoor als inspanningsleider; Manager Klantcontact / Commercieel manager coördineert de dagelijkse uitvoering binnen het commerciële proces (niet de Teamleider Trainingen, die uitsluitend de planning van de cascade-key-user-onboarding faciliteert). Kernteam (6 personen): Projectmanager D (cross-sectorale projectaansturing), Procesmanager / Data-analist Klant & Markt (data-architectuur, datakwaliteit, bronkoppelingen), drie Medewerkers binnendienst — één per sector PO, VO en Professionals — als outside-in frontline-vertegenwoordigers, én de Product Owner van de systemen als producteigenaar van het CRM-platform (ontwerpkeuzes, releaseprioriteiten, datamodel-governance richting leverancier en interne stuurgroep). Trainings-deelnemers (25 personen) zijn de cross-sectorale CRM-key-users: 12 Trainer/Adviseur A (cascade-key-users), 7 productmanagers (DST x2, KiB, KLT, LiB, NT2 overheid, CvVO), 3 sectormanagers (PO/VO/Prof) en 3 Accountmanager-C-Prof (sales-eindgebruiker key-user-training). Geconsulteerden (7 personen, 42u raadplegen-only): Manager Data & Technologie (governance via stuurgroep), Business informatieanalist C (datakwaliteit-scan), Manager Klantcontact (review klantenservice-flow), 3 marketeers (Campagne A/B + Junior Prof) en Teamleider Trainingen (planning cascade-onboarding). Externe inhuur: piek-jaren 2027–2028 implementatie/integraties (vaste-prijs partner met escrow op datakwaliteit) én niet-piek-jaren 2026 (analyse + leveranciersselectie) en 2029 (borgingsadvies + go-live-support). Programma- vs lijn-uren: kernteam 80/20, leider 90/10, trainings 70/30, geconsulteerden 0/0/100. Raadplegen-uren expliciet: 42u door 7 geconsulteerden.",
  plus20:
    "Sven (SIO) leidt als inspanningsleider; Manager Klantcontact / Commercieel manager coördineert de dagelijkse uitvoering. Plus20 strekt het advies-pakket over 5 jaar (2026–2030) met zwaartepunt 2027 (bouw) en 2028 (acceptatie); 2029 go-live; 2030 borging. Kernteam (6 personen) inclusief Product Owner van de systemen als producteigenaar van het CRM-platform. Trainings-deelnemers (25 personen): 12 Trainer/Adviseur A, 7 productmanagers, 3 sectormanagers en 3 Accountmanager-C-Prof. Geconsulteerden (7 personen, 42u): Manager Data & Technologie, Business informatieanalist C, Manager Klantcontact, 3 marketeers en Teamleider Trainingen. Externe inhuur: 2027–2028 implementatie-piek én 2026 + 2029–2030 niet-piek-jaren (analyse-ondersteuning, go-live-coaching, borgingsadvies). Lijn-uren expliciet: ~371u; raadplegen-uren expliciet: 42u.",
  optimaal:
    "Sven (SIO) leidt als inspanningsleider; Manager Klantcontact / Commercieel manager coördineert dagelijkse uitvoering. Optimaal strekt over 7 jaar (2026–2032) — gefaseerde uitrol met zwaartepunt 2028 (acceptatie + key-user) en 2029 (go-live cross-sectoraal); 2030–2032 zijn beheer-, optimalisatie- en doorontwikkelingsjaren. Kernteam (6 personen) inclusief Product Owner van de systemen — in dit scenario benadrukt aan release-roadmap en sectorvariant-governance. Trainings-deelnemers (25 personen): 12 Trainer/Adviseur A, 7 productmanagers, 3 sectormanagers en 3 Accountmanager-C-Prof. Geconsulteerden (7 personen, 42u): Manager DT, Business informatieanalist C, Manager Klantcontact, 3 marketeers en Teamleider Trainingen. Externe inhuur: 2028–2029 implementatie- en uitrol-piek; 2026–2027 analyse-/bouw-fase met externe data-architecten; 2030–2032 borgings-advies + doorontwikkelings-capaciteit. Lijn-uren expliciet: ~426u; raadplegen-uren expliciet: 42u.",
  min20:
    "Sven (SIO) leidt als inspanningsleider; Manager Klantcontact / Commercieel manager coördineert dagelijkse uitvoering. Min20 strekt over 10 jaar (2026–2035) met zwaartepunt 2027 (bouw) + 2028 (key-user-training) + 2030 (acceptatie & pilot) + 2031 (go-live). Kernteam (6 personen) inclusief Product Owner van de systemen. Trainings-deelnemers (25 personen): 12 Trainer/Adviseur A, 7 productmanagers, 3 sectormanagers en 3 Accountmanager-C-Prof. Geconsulteerden (7 personen, 42u): Manager DT, Business informatieanalist C, Manager Klantcontact, 3 marketeers en Teamleider Trainingen. Externe inhuur: piek-jaren 2028 + 2030 (implementatie-partner); niet-piek-jaren 2026–2027 (analyse + leveranciersselectie), 2029 (integraties), 2031–2035 (beheer-coaching + optimalisatie). Lijn-uren expliciet: ~500u; raadplegen-uren expliciet: 42u.",
};

// =====================================================================
// Data per-jaar activiteit-fixes (alleen jaren met issues)
// =====================================================================
const DATA_ACTIVITEIT_FIXES: Record<string, Record<number, string>> = {
  advies: {
    2026: "Architectuurkeuze cross-sectoraal datamodel + datakwaliteit-scan op 7-8 bronsystemen door Sven (leider) + kernteam (PM D, Procesmanager K&M, 3× Mdw binnendienst, Product Owner van de systemen); kick-off + nulmeting met geconsulteerde Manager DT en Business informatieanalist C; voorbereiding leveranciersselectie met externe data-architect.",
    2028: "Acceptatietest CRM-functionaliteit; cross-sectorale key-user-onboarding voor 25 trainings-deelnemers (12 Trainer/Adviseur A als cascade-key-users, 7 productmanagers, 3 sectormanagers, 3 Acc-C-Prof als trainee); Product Owner van de systemen voert review uit op acceptatie-criteria, sectorvariant-fit en sales-eindgebruiker-flow; externe implementatiepartner verzorgt organisatie-brede adoptie-begeleiding.",
    2029: "Overdracht naar lijn-beheer Data & Technologie; structurele licentie + helpdesk-FAQ; borging proceseigenaarschap CRM bij Procesmanager K&M en Product Owner van de systemen; Product Owner van de systemen voert borgings-review uit (datakwaliteit, adoptie-graad per sector, KPI-uitlezing).",
  },
  plus20: {
    2026: "Architectuurkeuze + datakwaliteit-scan + leveranciersvoortraject; Sven als leider, kernteam (PM D + Procesmanager K&M + 3× Mdw binnendienst + Product Owner van de systemen) als multidisciplinaire ontwerpers; geconsulteerde Manager DT in stuurgroep-governance.",
    2027: "Bouw cross-sectoraal datamodel en bronsysteemintegraties; sectorinrichting PO en VO; review door Product Owner van de systemen en Business informatieanalist C op specifieke beslismomenten.",
    2028: "Pilot + acceptatietest met kernteam-binnendienst (incl. Product Owner van de systemen); key-user-onboarding voor 25 trainings-deelnemers (12 Trainer/Adviseur A, 7 productmanagers, 3 sectormanagers, 3 Acc-C-Prof als trainee); Product Owner van de systemen voert review uit op acceptatie-criteria, sectorvariant-fit en sales-eindgebruiker-flow.",
    2029: "Sectoruitrol Zakelijk en go-live cross-sectoraal; volledige adoptie met externe implementatiepartner; uitfasering oude bronsystemen onder regie van de Product Owner van de systemen.",
    2030: "Structureel beheer + licentie + content-onderhoud; doorontwikkeling 0,3 FTE intern; afnemende programma-uren — werk verschuift naar lijn-Data & Technologie en proceseigenaarschap.",
  },
  optimaal: {
    2026: "Architectuurbesluit + datakwaliteit-scan + Stichting Cito-ontvlechting-analyse; Sven (leider) + kernteam (PM D + Procesmanager K&M + 3× Mdw binnendienst + Product Owner van de systemen); geconsulteerd: Manager DT (governance-stuurgroep) en Business informatieanalist C op beslismomenten.",
    2028: "Acceptatietest + cross-sectorale key-user-onboarding voor 25 trainings-deelnemers (12 Trainer/Adviseur A cascade, 7 productmanagers, 3 sectormanagers, 3 Acc-C-Prof als trainee); Product Owner van de systemen voert review uit op acceptatie-criteria, sectorvariant-fit en sales-eindgebruiker-flow; externe implementatiepartner verzorgt organisatie-brede adoptie-begeleiding.",
    2029: "Sectoruitrol + volledige cross-sectorale go-live; uitfasering oude bronsystemen onder regie van de Product Owner van de systemen, ondersteund door Mdw binnendienst-team; Manager Klantcontact + marketeers leveren campagne-data → CRM-koppeling.",
    2030: "Overdracht naar lijn-beheer; structurele licentie + content-onderhoud + helpdesk-FAQ; doorontwikkeling 0,3 FTE intern.",
  },
  min20: {
    2026: "Architectuurkeuze + datakwaliteit-scan + Stichting Cito-ontvlechting-analyse; Sven leidt; kernteam (PM D + Procesmanager K&M + 3× Mdw binnendienst + Product Owner van de systemen) ontwerpt cross-sectoraal datamodel; geconsulteerd: Manager DT in stuurgroep-governance, Business informatieanalist C op beslismomenten.",
    2028: "Bouw kern-CRM + eerste integraties; cross-sectorale key-user-onboarding voor 25 trainings-deelnemers (12 Trainer/Adviseur A cascade-key-users, 7 productmanagers, 3 sectormanagers, 3 Acc-C-Prof als trainee); Product Owner van de systemen voert review uit op acceptatie-criteria + sales-flow; externe implementatiepartner verzorgt organisatie-brede adoptie-begeleiding.",
    2029: "Afronding 7-8 bronsysteemintegraties; migratie van resterende data + koppeling Zakelijk-systemen onder regie van de Product Owner van de systemen, ondersteund door Mdw binnendienst-team.",
    2031: "Sectoruitrol Zakelijk + cross-sectorale go-live; volledige adoptie met externe implementatiepartner; uitfasering oude bronsystemen onder regie van de Product Owner van de systemen.",
    2032: "Overdracht naar lijn-beheer Data & Technologie; structurele licenties (~€63K/jr); content-onderhoud + helpdesk-FAQ; doorontwikkeling 0,3 FTE intern.",
  },
};

async function main() {
  const s = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!);
  const { data, error: readErr } = await s.from("din_sessions").select("data").eq("id", SESSION_ID).maybeSingle();
  if (readErr || !data) { console.error("Read error:", readErr); process.exit(1); }
  const sess = data.data as Record<string, unknown>;
  const wiz = sess.crossAnalyseWizard as Record<string, unknown>;
  const stepResults = wiz.stepResults as Record<string, unknown>;
  const stap4 = stepResults.stap4 as Record<string, unknown>;
  const s7 = stap4.stap7InterneUren as Record<string, unknown>;

  if (s7.meiCorrectiesApplied) {
    console.log("⏭ Marker meiCorrectiesApplied al aanwezig:", s7.meiCorrectiesApplied);
    return;
  }

  // -------------------------------------------------------------------
  // STAP A — Verwijder accountmanager_c_prof (geconsulteerd) overal
  // -------------------------------------------------------------------
  console.log("\n=== STAP A — accountmanager_c_prof (geconsulteerd) verwijderen ===");
  const sel = s7.selectiePerDomein as Record<string, Record<string, unknown>>;
  if (sel.data_systemen?.accountmanager_c_prof) {
    delete sel.data_systemen.accountmanager_c_prof;
    console.log("✓ selectie data: accountmanager_c_prof weg");
  }

  const vUPI = s7.vastgesteldeUrenPerInspanning as Array<{ domein?: string; rollen: Array<Record<string, unknown>> }>;
  for (const grp of vUPI) {
    if (grp.domein !== "data_systemen") continue;
    const before = grp.rollen.length;
    grp.rollen = grp.rollen.filter((r) => r.functieId !== "accountmanager_c_prof");
    if (grp.rollen.length < before) console.log(`✓ vUPI data: -${before - grp.rollen.length} rol (acc_c_prof)`);
  }

  const scenarios = s7.scenarios as Record<string, { domeinen?: Array<{ domein: string; motivatie?: string; jaren?: Array<{ jaar: number; activiteit?: string; rollen?: Array<Record<string, unknown>> }> }> }>;
  for (const [scKey, sc] of Object.entries(scenarios)) {
    const dataDom = sc.domeinen?.find((d) => d.domein === "data_systemen");
    if (!dataDom?.jaren) continue;
    let removed = 0;
    for (const jaar of dataDom.jaren) {
      if (!jaar.rollen) continue;
      const before = jaar.rollen.length;
      jaar.rollen = jaar.rollen.filter((r) => r.functieId !== "accountmanager_c_prof");
      removed += before - jaar.rollen.length;
    }
    if (removed > 0) console.log(`✓ scenarios.${scKey} data: -${removed} acc_c_prof rol-records`);
  }

  // -------------------------------------------------------------------
  // STAP B — Mens 2026 activiteit: "1 sectormanager" → "3 sectormanagers"
  // -------------------------------------------------------------------
  console.log("\n=== STAP B — Mens 2026 activiteit ===");
  for (const [scKey, sc] of Object.entries(scenarios)) {
    const mensDom = sc.domeinen?.find((d) => d.domein === "mens");
    const j2026 = mensDom?.jaren?.find((j) => j.jaar === 2026);
    if (j2026?.activiteit && j2026.activiteit.includes("(1 sectormanager + Manager Klantcontact + HR-curriculumeigenaar leveren input)")) {
      j2026.activiteit = j2026.activiteit.replace(
        "(1 sectormanager + Manager Klantcontact + HR-curriculumeigenaar leveren input)",
        "(3 sectormanagers + Manager Klantcontact + HR-curriculumeigenaar leveren input)"
      );
      console.log(`✓ ${scKey} mens 2026: 1 → 3 sectormanagers`);
    }
  }

  // -------------------------------------------------------------------
  // STAP C — Data motivaties (alle scenarios) — clean versie
  // -------------------------------------------------------------------
  console.log("\n=== STAP C — Data motivaties bijwerken ===");
  for (const [scKey, sc] of Object.entries(scenarios)) {
    const dataDom = sc.domeinen?.find((d) => d.domein === "data_systemen");
    if (dataDom && DATA_MOTIVATIE[scKey]) {
      dataDom.motivatie = DATA_MOTIVATIE[scKey];
      console.log(`✓ ${scKey} data: motivatie bijgewerkt (clean, 7 geconsulteerden)`);
    }
  }

  // -------------------------------------------------------------------
  // STAP D — Data per-jaar activiteit-fixes
  // -------------------------------------------------------------------
  console.log("\n=== STAP D — Data per-jaar activiteit-fixes ===");
  for (const [scKey, sc] of Object.entries(scenarios)) {
    const dataDom = sc.domeinen?.find((d) => d.domein === "data_systemen");
    if (!dataDom?.jaren) continue;
    const fixes = DATA_ACTIVITEIT_FIXES[scKey];
    if (!fixes) continue;
    for (const jaar of dataDom.jaren) {
      if (fixes[jaar.jaar]) {
        jaar.activiteit = fixes[jaar.jaar];
        console.log(`✓ ${scKey} data ${jaar.jaar}: activiteit bijgewerkt`);
      }
    }
  }

  // -------------------------------------------------------------------
  // STAP E — Hercalc aggregaten (acc_c_prof verwijdering effect)
  // -------------------------------------------------------------------
  console.log("\n=== STAP E — Hercalc aggregaten ===");
  for (const sc of Object.values(scenarios)) {
    let scTotU = 0, scP = 0, scL = 0, scR = 0;
    for (const dom of sc.domeinen ?? []) {
      let domTotU = 0, domP = 0, domL = 0, domR = 0;
      for (const jaar of dom.jaren ?? []) {
        let jU = 0, jP = 0, jL = 0, jR = 0;
        for (const rol of jaar.rollen ?? []) {
          const u = (rol.uren as number) ?? 0;
          jU += u;
          jP += u * ((rol.programmaPct as number) ?? 0);
          jL += u * ((rol.lijnPct as number) ?? 0);
          jR += u * ((rol.raadplegenPct as number) ?? 0);
        }
        (jaar as Record<string, unknown>).totaalUren = jU;
        (jaar as Record<string, unknown>).programmaUren = Math.round(jP);
        (jaar as Record<string, unknown>).lijnUren = Math.round(jL);
        (jaar as Record<string, unknown>).raadplegenUren = Math.round(jR);
        domTotU += jU; domP += jP; domL += jL; domR += jR;
      }
      (dom as Record<string, unknown>).totaalUren = domTotU;
      (dom as Record<string, unknown>).uren = domTotU;
      (dom as Record<string, unknown>).programmaUren = Math.round(domP);
      (dom as Record<string, unknown>).lijnUren = Math.round(domL);
      (dom as Record<string, unknown>).raadplegenUren = Math.round(domR);
      (dom as Record<string, unknown>).programmaPct = domTotU > 0 ? domP / domTotU : 0;
      scTotU += domTotU; scP += domP; scL += domL; scR += domR;
    }
    (sc as Record<string, unknown>).totaalUren = scTotU;
    (sc as Record<string, unknown>).programmaUren = Math.round(scP);
    (sc as Record<string, unknown>).lijnUren = Math.round(scL);
    (sc as Record<string, unknown>).raadplegenUren = Math.round(scR);
    const tjP = (sc as { totalenPerJaar?: Array<{ jaar: number; uren?: number; programmaUren?: number; lijnUren?: number; raadplegenUren?: number }> }).totalenPerJaar;
    if (tjP) {
      for (const t of tjP) {
        let u = 0, p = 0, l = 0, r = 0;
        for (const dom of sc.domeinen ?? []) {
          const j = (dom.jaren ?? []).find((x) => x.jaar === t.jaar) as Record<string, unknown> | undefined;
          if (!j) continue;
          u += (j.totaalUren as number) ?? 0;
          p += (j.programmaUren as number) ?? 0;
          l += (j.lijnUren as number) ?? 0;
          r += (j.raadplegenUren as number) ?? 0;
        }
        t.uren = u;
        t.programmaUren = p;
        t.lijnUren = l;
        t.raadplegenUren = r;
      }
    }
  }

  s7.meiCorrectiesApplied = {
    timestamp: new Date().toISOString(),
    fixes: ["B-mens-2026-3sectormgrs", "C-data-motivaties-clean", "D-data-jaar-activiteiten", "A-acc_c_prof-verwijderd"],
  };

  const newData = {
    ...sess,
    crossAnalyseWizard: {
      ...wiz,
      stepResults: { ...stepResults, stap4: { ...stap4, stap7InterneUren: s7 } },
    },
  };
  const { error } = await s.from("din_sessions").update({ data: newData }).eq("id", SESSION_ID);
  if (error) { console.error("Write error:", error.message); process.exit(1); }

  console.log("\n✓ Mei-correcties toegepast.");
  for (const [k, sc] of Object.entries(scenarios)) {
    const sca = sc as { totaalUren?: number; programmaUren?: number; lijnUren?: number; raadplegenUren?: number };
    console.log(`  ${k}: totaal=${sca.totaalUren}u prog=${sca.programmaUren} lijn=${sca.lijnUren} raadplegen=${sca.raadplegenUren}`);
  }
}

void main();
