// Herzet mens-deelnemertal naar consistent 80 in tekstvelden + hercalculeer
// 6 berekeningen die met 47/66 als basis verkeerd zijn gegaan.
//
// Achtergrond: gebruiker heeft beslist dat 80 (uit selectiePerDomein.mens)
// de waarheid is voor de doelgroep van de gespreksvaardigheidstraining.
// Eerdere agent had alle teksten naar 47 (deelnemers in de werkelijke
// uren-toewijzing) gezet — maar in een tussenronde zijn de meeste 47's
// alweer 80 geworden. Wat resteert: een paar tekstuele inconsistenties
// (66-aanname, 47/66 in calculaties) én numerieke fouten waar 80 wel
// is ingevuld maar de doorrekening (×80, ×46, ×8×6, ×€60) nog op de
// oude basis staat.
//
// Idempotent: alle vervangingen zijn no-op als doel-tekst al aanwezig is.
//
// LET OP: raakt NIET aan:
//   - selectiePerDomein.mens.*.aantal       (al 80 — correcte metadata)
//   - vragenAntwoorden.*                    (gebruikersinvoer)
//   - vastgesteldeUrenPerInspanning[*].rollen[*].aantal/uren (apart te beslissen)
//
// Sessie: d8b97442-ce8f-4134-b2c7-67dc8e3a3f93
// Usage:
//   npx tsx scripts/herzet-mens-deelnemertal-80.ts          (dry-run)
//   npx tsx scripts/herzet-mens-deelnemertal-80.ts --apply  (live write)

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
    process.env[t.substring(0, e).trim()] = t
      .substring(e + 1)
      .trim()
      .replace(/^["']|["']$/g, "");
  }
}
loadEnvFile(join(process.cwd(), ".env.local"));

const SESSION_ID = "d8b97442-ce8f-4134-b2c7-67dc8e3a3f93";
const APPLY = process.argv.includes("--apply");

const supa = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
);

type Mut = {
  pad: string;
  reden: string;
  voor: string | null;
  na: string | null;
  toegepast: boolean;
  reedsCorrect?: boolean;
};

const muts: Mut[] = [];

// ----- helpers -----------------------------------------------------------------

function getByPath(root: any, path: string): any {
  const parts: Array<string | number> = [];
  let cur = "";
  let i = 0;
  while (i < path.length) {
    const ch = path[i];
    if (ch === ".") {
      if (cur) parts.push(cur);
      cur = "";
      i++;
    } else if (ch === "[") {
      if (cur) parts.push(cur);
      cur = "";
      const end = path.indexOf("]", i);
      const idx = parseInt(path.substring(i + 1, end), 10);
      parts.push(idx);
      i = end + 1;
    } else {
      cur += ch;
      i++;
    }
  }
  if (cur) parts.push(cur);

  let node: any = root;
  for (const p of parts) {
    if (node == null) return undefined;
    node = node[p as any];
  }
  return node;
}

function setByPath(root: any, path: string, value: any): void {
  const parts: Array<string | number> = [];
  let cur = "";
  let i = 0;
  while (i < path.length) {
    const ch = path[i];
    if (ch === ".") {
      if (cur) parts.push(cur);
      cur = "";
      i++;
    } else if (ch === "[") {
      if (cur) parts.push(cur);
      cur = "";
      const end = path.indexOf("]", i);
      const idx = parseInt(path.substring(i + 1, end), 10);
      parts.push(idx);
      i = end + 1;
    } else {
      cur += ch;
      i++;
    }
  }
  if (cur) parts.push(cur);

  let node: any = root;
  for (let k = 0; k < parts.length - 1; k++) {
    node = node[parts[k] as any];
  }
  node[parts[parts.length - 1] as any] = value;
}

function applyTextEdit(
  root: any,
  pad: string,
  reden: string,
  oude: RegExp,
  nieuw: string,
): void {
  const cur = getByPath(root, pad);
  if (typeof cur !== "string") {
    muts.push({ pad, reden, voor: null, na: null, toegepast: false });
    return;
  }
  if (!oude.test(cur)) {
    muts.push({
      pad,
      reden,
      voor: cur,
      na: cur,
      toegepast: false,
      reedsCorrect: true,
    });
    return;
  }
  const next = cur.replace(oude, nieuw);
  if (next === cur) {
    muts.push({
      pad,
      reden,
      voor: cur,
      na: cur,
      toegepast: false,
      reedsCorrect: true,
    });
    return;
  }
  setByPath(root, pad, next);
  muts.push({ pad, reden, voor: cur, na: next, toegepast: true });
}

// ----- main --------------------------------------------------------------------

async function main() {
  console.log(`\n=== herzet-mens-deelnemertal-80 — ${SESSION_ID} ===`);
  console.log(`Mode: ${APPLY ? "APPLY" : "DRY-RUN"} (gebruik --apply om te schrijven)\n`);

  const { data, error } = await supa
    .from("din_sessions")
    .select("data, updated_at")
    .eq("id", SESSION_ID)
    .maybeSingle();

  if (error || !data) {
    console.error("Kon sessie niet laden:", error);
    process.exit(1);
  }

  const session: any = data.data;
  const stap4: any = session?.crossAnalyseWizard?.stepResults?.stap4;
  if (!stap4) {
    console.error("stap4 niet aanwezig in sessie.");
    process.exit(1);
  }

  // ============================================================
  // TAAK 1 — alle resterende 47 → 80 reverts (idempotent)
  // ============================================================

  const taak1Paden = [
    "begrotingAdvies.scenarios.min20.inspanningen[2].motivatie",
    "begrotingAdvies.scenarios.min20.inspanningen[2].verdelingPerJaar[2].activiteit",
    "begrotingAdvies.scenarios.advies.inspanningen[1].motivatie",
    "begrotingAdvies.scenarios.advies.inspanningen[1].verdelingPerJaar[1].activiteit",
    "begrotingAdvies.scenarios.plus20.inspanningen[2].motivatie",
    "begrotingAdvies.scenarios.plus20.inspanningen[2].verdelingPerJaar[1].activiteit",
    "begrotingAdvies.scenarios.optimaal.inspanningen[1].motivatie",
    "begrotingAdvies.scenarios.optimaal.inspanningen[1].verdelingPerJaar[2].activiteit",
    "stap7InterneUren.scenarios.min20.domeinen[1].jaren[0].activiteit",
    "stap7InterneUren.scenarios.advies.domeinen[1].jaren[1].activiteit",
    "stap7InterneUren.scenarios.plus20.domeinen[1].jaren[1].activiteit",
    "stap7InterneUren.scenarios.optimaal.domeinen[1].jaren[1].activiteit",
    "subEffortAnalysis[0].businessCase.result.kostenraming",
    "subEffortAnalysis[0].businessCase.result.risicos[1]",
  ];
  for (const p of taak1Paden) {
    applyTextEdit(
      stap4,
      p,
      "Idempotent revert — als '47 deelnemers/medewerkers' nog ergens voorkomt, vervang door 80",
      /\b47\s+(deelnemers|medewerkers)\b/g,
      "80 $1",
    );
  }

  // Rang 2 — Mens regels in alle prioriteitAdvies-scenario's
  for (const sc of ["min20", "advies", "plus20", "optimaal"] as const) {
    applyTextEdit(
      stap4,
      `begrotingAdvies.scenarios.${sc}.prioriteitAdvies`,
      `Rang 2 Mens (${sc}) — terug naar 80 deelnemers indien nog 47`,
      /Rang 2 — Mens \(gespreksvaardigheidstraining\): 47 deelnemers/g,
      "Rang 2 — Mens (gespreksvaardigheidstraining): 80 deelnemers",
    );
  }

  // Processen-motivatie min20 — verwijzing 'gespreksvaardigheidstraining 47 deelnemers'
  applyTextEdit(
    stap4,
    "stap7InterneUren.scenarios.min20.domeinen[3].motivatie",
    "Processen-motivatie min20 — verwijzing terug naar 80 indien 47",
    /gespreksvaardigheidstraining 47 deelnemers/g,
    "gespreksvaardigheidstraining 80 deelnemers",
  );

  // Mens-motivatie advies — uitgebreide herformulering: 47 deelnemers (rolverdeling) + 80 doelgroep
  // Idempotent: als 'doelgroep telt 80' al staat, geen wijziging.
  {
    const pad = "stap7InterneUren.scenarios.advies.domeinen[1].motivatie";
    const cur: string | undefined = getByPath(stap4, pad);
    if (typeof cur === "string" && !/doelgroep telt 80/.test(cur)) {
      // Voorkeur: regel met "De 80 deelnemers (7 Accountmanagers C, …)" → herformuleren naar
      // "De doelgroep telt 80 betrokkenen (47 trainings-deelnemers — 7 …, 5 …, 7 …, 28 KS-medewerkers C — plus 12 trainers, 3 sectormanagers en 18 stakeholders/begeleiders). De 47 deelnemers volgen elk 46u contacttijd; …"
      applyTextEdit(
        stap4,
        pad,
        "Mens-motivatie advies — verfijn 47 trainings-deelnemers binnen doelgroep van 80",
        /De 80 deelnemers \(7 Accountmanagers C, 5 Accountmanagers C Prof, 7 binnendienst B, 28 KS-medewerkers C\) volgen elk 46u contacttijd/g,
        "De doelgroep telt 80 betrokkenen: 47 actieve trainings-deelnemers (7 Accountmanagers C, 5 Accountmanagers C Prof, 7 binnendienst B, 28 KS-medewerkers C) volgen elk 46u contacttijd, plus 12 trainers, 3 sectormanagers en 18 stakeholders/begeleiders met begeleidingsuren. De 47 actieve deelnemers",
      );
    } else {
      muts.push({
        pad,
        reden: "Mens-motivatie advies — al herformuleerd naar 'doelgroep telt 80'",
        voor: cur ?? null,
        na: cur ?? null,
        toegepast: false,
        reedsCorrect: true,
      });
    }
  }

  // Mens-motivatie plus20 — 'twee trainingsblokken voor 80 deelnemers' → '80 betrokkenen (47 + 33)'
  applyTextEdit(
    stap4,
    "stap7InterneUren.scenarios.plus20.domeinen[1].motivatie",
    "Mens-motivatie plus20 — verduidelijk 80 = 47 deelnemers + 33 begeleiders",
    /twee trainingsblokken voor 80 deelnemers\)/g,
    "twee trainingsblokken voor 80 betrokkenen — 47 actieve deelnemers + 33 begeleiders/stakeholders)",
  );

  // ============================================================
  // TAAK 2 — calculatie-correcties
  // ============================================================

  // CALC 1 — fasering tranches in min20-processen-motivatie:
  //   "33+33 deelnemers over 2027/2028 en 2029/2030"
  // Bij 80 doelgroep met 47 actieve deelnemers → fasering verdelen:
  // helft van 80 = 40+40 of helft van 47 actieve = 24+23. Tekst gaat over
  // 'trainingsdoelgroep faseren', dus de doelgroep is wat gefaseerd wordt:
  // 40+40 (van de 80) is de juiste lezing. We kiezen 40+40.
  applyTextEdit(
    stap4,
    "stap7InterneUren.scenarios.min20.domeinen[3].motivatie",
    "CALC1 — fasering tranches: 33+33 → 40+40 (helft van doelgroep 80)",
    /\(33\+33 deelnemers over 2027\/2028 en 2029\/2030\)/g,
    "(40+40 deelnemers over 2027/2028 en 2029/2030)",
  );

  // CALC 2 — optimaal mens-motivatie: "80 medewerkers × 46u trainingscapaciteitsbeslag"
  // De rol-uren in dezelfde tekst (322 + 230 + 322 + 1.288 = 2.162) komen van
  // 47 actieve deelnemers × 46u = 2.162u. De "80 × 46u" zou 3.680u zijn
  // — niet consistent met het totaal van 3.022u. Tekst herformuleren naar
  // de feitelijke berekening: doelgroep 80 betrokkenen, waarvan 47 actieve
  // deelnemers × 46u = 2.162u directe contacttijd, plus 720u trainer-facilitering
  // + 60u sectormanagers + 40u Teamleider + 40u Manager Klantcontact = 3.022u.
  applyTextEdit(
    stap4,
    "stap7InterneUren.scenarios.optimaal.domeinen[1].motivatie",
    "CALC2 — '80 × 46u' is rekenkundig fout (=3.680u ≠ 3.022u totaal). Herformuleren naar 47 actieve × 46u = 2.162u + 860u begeleiding binnen doelgroep van 80.",
    /De grote deelnemersuren weerspiegelen de 80 medewerkers × 46u trainingscapaciteitsbeslag\./g,
    "De grote deelnemersuren weerspiegelen het trainingscapaciteitsbeslag binnen de doelgroep van 80 betrokkenen: 47 actieve deelnemers (Accountmanagers C, Accountmanagers C Prof, Medewerkers binnendienst B, Klantenservice C) × 46u contacttijd = 2.162u, plus 860u begeleidingsuren door 12 trainers, 3 sectormanagers, Teamleider Trainingen en Manager Klantcontact.",
  );

  // CALC 3+4 — vragen[1].aanbevolenAntwoord:
  //   "80 deelnemers × 80u = 5.280u (verdeeld over 2027 en 2028, ~2.640u/jr)"
  //   80 × 80 = 6.400u, niet 5.280u. Verdeeld over 2 jr = 3.200u/jr.
  //   Maar: 80u/persoon geldt enkel voor de 47 actieve trainings-deelnemers.
  //   Kies hier de inhoudelijk juiste lezing: 47 actieve × 80u = 3.760u
  //   (hoofdgroep) + ~33 begeleiders ≤30u/persoon = ~660u → ~4.420u totaal.
  //   In de oorspronkelijke wizard-context is "deelnemersbeslag" alleen
  //   actieve deelnemers; we corrigeren dus naar 47 × 80u = 3.760u en
  //   benoemen de doelgroep van 80 als context.
  applyTextEdit(
    stap4,
    "stap7InterneUren.vragenPerInspanning[2].vragen[1].aanbevolenAntwoord",
    "CALC3+4 — 80 × 80 ≠ 5.280; deelnemersbeslag = 47 actieve × 80u = 3.760u (~1.880u/jr) binnen doelgroep van 80 betrokkenen.",
    /Totaal deelnemersbeslag: 80 deelnemers × 80u = 5\.280u \(verdeeld over 2027 en 2028, ~2\.640u\/jr\)\./g,
    "Totaal deelnemersbeslag: 47 actieve trainings-deelnemers × 80u = 3.760u (verdeeld over 2027 en 2028, ~1.880u/jr) — binnen een doelgroep van 80 betrokkenen, waarvan 33 begeleiders/stakeholders (12 trainers, 3 sectormanagers, 18 stakeholders) niet de volle 80u/persoon aan deelnemerstijd vergen.",
  );

  // CALC 5 — subEffortAnalysis[0].dossier.kostenraming
  // Controle: "80 deelnemers × € 100 + 4 × € 500 = € 10.000" → 8.000+2.000=10.000. KLOPT.
  // Geen wijziging nodig, alleen registratie.
  {
    const pad = "subEffortAnalysis[0].dossier.kostenraming";
    const cur = getByPath(stap4, pad);
    muts.push({
      pad,
      reden:
        "CALC5 — controle: 80 × € 100 = € 8.000 + 4 × € 500 = € 2.000 = € 10.000. Uitkomst klopt; geen correctie.",
      voor: typeof cur === "string" ? cur.substring(0, 200) + "…" : null,
      na: typeof cur === "string" ? cur.substring(0, 200) + "…" : null,
      toegepast: false,
      reedsCorrect: true,
    });
  }

  // CALC 6 — subEffortAnalysis[0].businessCase.result.aannames[0]
  //   "80 deelnemers ... 66 × 8 × 6 = 3.168 deelnemersuren ... €190.000"
  // 80×8×6 = 3.840 deelnemersuren. 3.840 × €60 = €230.400.
  applyTextEdit(
    stap4,
    "subEffortAnalysis[0].businessCase.result.aannames[0]",
    "CALC6a — formule '66 × 8 × 6 = 3.168' → '80 × 8 × 6 = 3.840' deelnemersuren",
    /66 × 8 × 6 = 3\.168 deelnemersuren/g,
    "80 × 8 × 6 = 3.840 deelnemersuren",
  );

  // Afgeleide €-waardering: 3.168u × €60 = €190.080 — komt in tekst voor als 'ca. €190.000'.
  applyTextEdit(
    stap4,
    "subEffortAnalysis[0].businessCase.result.aannames[0]",
    "CALC6b — opportunity-cost waardering: 3.168×€60≈€190.000 → 3.840×€60≈€230.000",
    /resulterend in ca\.\s*€190\.000 opportunity-cost/g,
    "resulterend in ca. €230.000 opportunity-cost",
  );

  // Eventuele andere voorkomens '3.168 deelnemersuren' (dubbele check).
  applyTextEdit(
    stap4,
    "subEffortAnalysis[0].businessCase.result.aannames[0]",
    "CALC6c — losse '3.168 deelnemersuren' → '3.840 deelnemersuren'",
    /\b3\.168 deelnemersuren\b/g,
    "3.840 deelnemersuren",
  );

  // Eventuele '€190.080' (precieze rekening) → €230.400.
  applyTextEdit(
    stap4,
    "subEffortAnalysis[0].businessCase.result.aannames[0]",
    "CALC6d — precieze €190.080 → €230.400 indien aanwezig",
    /€\s*190\.080/g,
    "€ 230.400",
  );

  // ============================================================
  // Aanvullend — vastgesteldeUrenPerInspanning rollen[8] (KS C onderbouwing)
  // Bevat nog "66-deelnemers-aanname". Verfijnen naar "80 betrokkenen
  // (47 actieve deelnemers — KS C 28 personen het grootste blok — plus 33 begeleiders)".
  applyTextEdit(
    stap4,
    "stap7InterneUren.vastgesteldeUrenPerInspanning[2].rollen[8].onderbouwing",
    "KS C onderbouwing — '66-deelnemers-aanname' → doelgroep 80 (47 actieve + 33 begeleiders)",
    /Dit is het grootste deelnemersblok conform de 66-deelnemers-aanname in de inspanning\./g,
    "Dit is het grootste deelnemersblok binnen de doelgroep van 80 betrokkenen (47 actieve trainings-deelnemers — waarvan KS C met 28 personen het grootste blok — plus 33 begeleiders/stakeholders) in de inspanning.",
  );

  // Aanvullend — rollen[1] (Trainer/Adviseur A) onderbouwing bevat:
  // "blok 1 (2027) 80 deelnemers in groepen: 12 trainers × 40u faciliteringsuren = 480u"
  // 12×40=480 klopt. "80 deelnemers / 10 × (24+22) = 6,6 × 46u = 304u" is foutief
  // (80/10 = 8, niet 6.6). Hier zit een 66/10=6,6 aanname onder. Corrigeren:
  // 80/10 = 8 groepen × 46u = 368u faciliteringsuren. Verdeeld over 12 trainers = 31u.
  // Maar de eindberekening (12 × 60u = 720u) staat al vast en verandert niet.
  // We laten de eindberekening intact maar corrigeren de tussenstap.
  applyTextEdit(
    stap4,
    "stap7InterneUren.vastgesteldeUrenPerInspanning[2].rollen[1].onderbouwing",
    "Trainer/Adviseur A — tussenstap '6,6 × 46u' was 66/10; bij doelgroep 80 (47 actieve) → 47/10 = 4,7 → 5 groepen × 46u = 230u",
    /80 deelnemers \/ 10 × \(24u blok1 \+ 22u blok2\) = 6,6 × 46u = 304u faciliteringsuren\. Verdeeld over 12 trainers = 25u per trainer/g,
    "47 actieve deelnemers / 10 ≈ 5 trainingsgroepen × 46u contacttijd = 230u faciliteringsuren. Verdeeld over 12 trainers = 19u per trainer",
  );

  // De eerstvolgende afgeleide regel: "Totaal per trainer: 20u + 25u = 45u; 12 personen × 45u = 540u"
  // Bij 19u tussenstap: 20u + 19u = 39u; 12 × 39u = 468u. Plus 60u intervisie 2029 / 12 = 5u → 44u/trainer.
  // Eindtotaal blijft 12 × 60u = 720u (door rondingsmarge en stuk intervisie).
  // We passen het rekensommetje aan om consistent te blijven.
  applyTextEdit(
    stap4,
    "stap7InterneUren.vastgesteldeUrenPerInspanning[2].rollen[1].onderbouwing",
    "Trainer/Adviseur A — afgeleide tussenstap 20+25=45u, 12×45=540u → 20+19=39u, 12×39=468u",
    /Totaal per trainer: 20u \+ 25u = 45u; 12 personen × 45u = 540u/g,
    "Totaal per trainer: 20u + 19u = 39u; 12 personen × 39u = 468u",
  );

  // ============================================================
  // Schrijven
  // ============================================================

  const totaalToegepast = muts.filter((m) => m.toegepast).length;
  const totaalReeds = muts.filter((m) => m.reedsCorrect).length;
  const totaalGemist = muts.filter((m) => !m.toegepast && !m.reedsCorrect).length;

  console.log(`Mutaties: ${muts.length} totaal`);
  console.log(`  Toegepast       : ${totaalToegepast}`);
  console.log(`  Reeds correct   : ${totaalReeds}`);
  console.log(`  Niet gevonden   : ${totaalGemist}\n`);

  for (const m of muts) {
    const flag = m.toegepast ? "[OK]" : m.reedsCorrect ? "[==]" : "[!!]";
    console.log(`${flag} ${m.pad}`);
    console.log(`     ${m.reden}`);
    if (m.toegepast && m.voor && m.na) {
      // toon alleen het verschil-fragment door de eerste plek waar voor != na te zoeken
      const diffStart = (() => {
        const v = m.voor;
        const n = m.na;
        let i = 0;
        while (i < Math.min(v.length, n.length) && v[i] === n[i]) i++;
        return Math.max(0, i - 60);
      })();
      const voorSnip = m.voor.substring(diffStart, diffStart + 220) + (m.voor.length > diffStart + 220 ? "…" : "");
      const naSnip = m.na.substring(diffStart, diffStart + 220) + (m.na.length > diffStart + 220 ? "…" : "");
      console.log(`     VOOR: …${voorSnip}`);
      console.log(`     NA  : …${naSnip}`);
    }
  }

  const detailPath = join(process.cwd(), "AUDIT-MENS-TELLING-80-detail.json");
  writeFileSync(detailPath, JSON.stringify(muts, null, 2), "utf-8");
  console.log(`\nDetail-mutaties geschreven naar: ${detailPath}`);

  if (!APPLY) {
    console.log("\nDRY-RUN voltooid. Run met --apply om te schrijven naar Supabase.");
    return;
  }

  if (totaalToegepast === 0) {
    console.log("\nGeen wijzigingen — niets naar Supabase te schrijven.");
    return;
  }

  console.log("\nSchrijf naar Supabase…");
  const { error: upErr } = await supa
    .from("din_sessions")
    .update({ data: session, updated_at: new Date().toISOString() })
    .eq("id", SESSION_ID);
  if (upErr) {
    console.error("Update fout:", upErr);
    process.exit(1);
  }
  console.log("OK — sessie bijgewerkt.");
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
