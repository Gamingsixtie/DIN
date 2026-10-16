// Rationaliseer mens-deelnemertal naar 47 in onderbouwing- en dossier-tekstvelden.
//
// In Stap 7 staan drie verschillende getallen voor "aantal deelnemers" van de
// gespreksvaardigheidstraining:
//   - selectiePerDomein.mens = 80 personen (incl. 12 Trainer/Adviseur A en
//     niet-deelnemende rollen zoals sectormanagers, manager klantcontact,
//     productmanagers etc.)
//   - vastgesteldeUrenPerInspanning mens-rollen-deelnemers = 47 personen
//     (7 acc + 5 acc-prof + 7 binnendienst + 28 klantenservice)
//   - tekst-velden bevatten 66/80 deelnemers door eerdere AI-aannames
//
// We consolideren op 47 (de werkelijke deelnemer-rollen). De 80 in
// selectiePerDomein blijft ongewijzigd — die telt ook trainers/sectormanagers
// als begeleidingsrol mee.
//
// Allowlist-aanpak: alleen specifieke paden waar context expliciet over
// trainings-deelnemers / cursisten / doelgroep gaat worden vervangen.
// User-input velden (vragenAntwoorden, businessCase.answers) worden NOOIT
// aangeraakt — die representeren de letterlijke gebruikersinvoer.
//
// Calculaties met 66 (66×8×6=3.168, 66×80=5.280, 66 medewerkers etc.) worden
// NIET stilzwijgend doorgerekend; in plaats daarvan worden ze in de logfile
// als "twijfel — handmatig nakijken" gemarkeerd.
//
// Idempotent: bij een tweede run zijn er geen "66 deelnemers" of "80 deelnemers"
// meer over op de allowlist-paden, dus geen wijzigingen.
//
// Gebruik: npx tsx scripts/rationaliseer-mens-deelnemertal.ts [--dry-run]

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
const NIEUW_AANTAL = 47;

const DRY_RUN = process.argv.includes("--dry-run");
// --from-backup <file> — lees session-state uit een backup-JSON i.p.v. Supabase.
// Combineert per definitie met dry-run: schrijft nooit naar Supabase, maar wel
// de audit-log. Handig om achteraf het audit-rapport te reconstrueren.
const fromBackupFlag = process.argv.indexOf("--from-backup");
const FROM_BACKUP =
  fromBackupFlag !== -1 && process.argv[fromBackupFlag + 1]
    ? process.argv[fromBackupFlag + 1]
    : null;

type Wijziging = {
  path: string;
  voor: string;
  na: string;
  reden: string;
};

type Twijfel = {
  path: string;
  fragment: string;
  reden: string;
};

const wijzigingen: Wijziging[] = [];
const twijfels: Twijfel[] = [];

/**
 * Vervangingen toepassen op een tekstveld. Geeft het nieuwe veld terug
 * (of dezelfde string als er niets veranderde).
 *
 * Regels:
 *  - "66 deelnemers" / "66 personen" / "66 cursisten" → "47 ..."
 *  - "80 deelnemers" / "80 personen" / "80 cursisten" → "47 ..."
 *  - "66 medewerkers" → "47 medewerkers" (alleen als context training is)
 *  - Calculaties met 66 of 80 (× X = Y) worden NIET aangepast — die
 *    moeten herberekend worden door de gebruiker.
 *
 * Idempotent: een al gerationaliseerde tekst (47 deelnemers) wordt niet
 * verder gewijzigd.
 */
function vervang(tekst: string, path: string): string {
  if (typeof tekst !== "string") return tekst;
  let nieuw = tekst;

  // Patroon 1: "66 deelnemers / 66 personen / 66 cursisten / 66 medewerkers"
  //  → 47 deelnemers
  // Niet aanraken als gevolgd wordt door " × " of " x " of " * " (calculatie)
  nieuw = nieuw.replace(
    /\b66\s*(deelnemers?|personen|cursisten?|medewerkers?)\b(?!\s*[×x*])/gi,
    (match: string, woord: string) => {
      // Check: zit deze 66 in een calculatie zoals "66 × 80u = 5.280u"?
      // Als de match niet gevolgd wordt door × dan is het pure tekst.
      return `${NIEUW_AANTAL} ${woord}`;
    }
  );

  // Patroon 2: "80 deelnemers / 80 personen / 80 cursisten"
  //  → 47 deelnemers
  // (NB: 80u en 80% en 80 medewerkers (zonder context) niet vervangen)
  nieuw = nieuw.replace(
    /\b80\s*(deelnemers?|personen|cursisten?)\b(?!\s*[×x*])/gi,
    (match: string, woord: string) => `${NIEUW_AANTAL} ${woord}`
  );

  // Patroon 3: speciale samenstellingen
  // "66-deelnemers-aanname" → "47-deelnemers-aanname"
  nieuw = nieuw.replace(
    /\b66-(deelnemers?|personen|cursisten?)-(aanname|conform)\b/gi,
    (match: string, woord: string, suffix: string) =>
      `${NIEUW_AANTAL}-${woord}-${suffix}`
  );

  // Detectie-only: signaleer calculaties (× of x) die we niet kunnen veranderen
  const calcRe = /\b(66|80)\s*(deelnemers?|personen|medewerkers?)\s*[×x*]/gi;
  let m: RegExpExecArray | null;
  while ((m = calcRe.exec(tekst)) !== null) {
    const start = Math.max(0, m.index - 60);
    const end = Math.min(tekst.length, m.index + m[0].length + 80);
    twijfels.push({
      path,
      fragment: tekst.substring(start, end),
      reden: `Calculatie met ${m[1]} ${m[2]} — bevat doorrekening (× of x); handmatig herberekenen voor 47 deelnemers`,
    });
  }

  // Detectie-only: "33+33 deelnemers" (herfasering 66) signaleren
  if (/33\+33\s*deelnemers?/i.test(tekst)) {
    const idx = tekst.search(/33\+33\s*deelnemers?/i);
    twijfels.push({
      path,
      fragment: tekst.substring(Math.max(0, idx - 60), Math.min(tekst.length, idx + 100)),
      reden: "33+33 deelnemers — phasing-aanbeveling die uitgaat van 66 totale deelnemers; bij 47 wordt dit ~24+23",
    });
  }

  // Detectie-only: "3.168 deelnemersuren" en "5.280u" calculatie-resultaten
  if (/3\.168\s*deelnemersuren/i.test(tekst)) {
    const idx = tekst.search(/3\.168\s*deelnemersuren/i);
    twijfels.push({
      path,
      fragment: tekst.substring(Math.max(0, idx - 60), Math.min(tekst.length, idx + 100)),
      reden: "3.168 deelnemersuren = 66×8×6 — bij 47 deelnemers wordt dit 47×8×6 = 2.256",
    });
  }

  if (/5\.280u/i.test(tekst) && /66\s*deelnemers/i.test(tekst)) {
    const idx = tekst.search(/5\.280u/i);
    twijfels.push({
      path,
      fragment: tekst.substring(Math.max(0, idx - 60), Math.min(tekst.length, idx + 100)),
      reden: "5.280u = 66×80u — bij 47 deelnemers wordt dit 47×80u = 3.760u",
    });
  }

  if (/1\.584u/i.test(tekst) || /1\.452u/i.test(tekst) || /3\.036u/i.test(tekst)) {
    twijfels.push({
      path,
      fragment: tekst.substring(0, 200),
      reden:
        "Bevat blok-calculaties (1.584u/1.452u/3.036u) — afgeleid van 66 deelnemers; herberekenen voor 47",
    });
  }

  return nieuw;
}

/**
 * Geeft het stuk van de string rondom de eerste verschillende positie terug,
 * zodat de log-snippets de échte wijziging tonen (geen identieke koppen).
 */
function diffSnippet(voor: string, na: string, max = 300): { voor: string; na: string } {
  // Zoek eerste positie waar ze verschillen
  const len = Math.min(voor.length, na.length);
  let firstDiff = -1;
  for (let i = 0; i < len; i++) {
    if (voor[i] !== na[i]) {
      firstDiff = i;
      break;
    }
  }
  if (firstDiff === -1) {
    return {
      voor: voor.length > max ? voor.substring(0, max) + "…" : voor,
      na: na.length > max ? na.substring(0, max) + "…" : na,
    };
  }
  const start = Math.max(0, firstDiff - 80);
  const ellipsisPre = start > 0 ? "…" : "";
  const ellipsisPost = (s: string, end: number) => (end < s.length ? "…" : "");
  const endVoor = Math.min(voor.length, firstDiff + max - 80);
  const endNa = Math.min(na.length, firstDiff + max - 80);
  return {
    voor: ellipsisPre + voor.substring(start, endVoor) + ellipsisPost(voor, endVoor),
    na: ellipsisPre + na.substring(start, endNa) + ellipsisPost(na, endNa),
  };
}

/**
 * Probeert een vervanging toe te passen en logt de wijziging.
 * Pad-functies (getter/setter) zorgen dat we kunnen muteren in het object.
 */
function probeer(
  obj: Record<string, unknown>,
  key: string,
  pathLabel: string,
  reden: string
) {
  const huidige = obj[key];
  if (typeof huidige !== "string") return;
  const nieuw = vervang(huidige, pathLabel);
  if (nieuw !== huidige) {
    const snip = diffSnippet(huidige, nieuw);
    wijzigingen.push({
      path: pathLabel,
      voor: snip.voor,
      na: snip.na,
      reden,
    });
    obj[key] = nieuw;
  }
}

async function main() {
  const supa = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );

  console.log("═".repeat(80));
  console.log(
    `RATIONALISEER MENS-DEELNEMERTAL → ${NIEUW_AANTAL} (sessie ${SESSION_ID.slice(0, 8)})`
  );
  const mode = FROM_BACKUP
    ? `FROM-BACKUP "${FROM_BACKUP}" (audit-only, geen Supabase-schrijfactie)`
    : DRY_RUN
      ? "DRY-RUN (geen schrijfactie)"
      : "LIVE (schrijft naar Supabase)";
  console.log(`Mode: ${mode}`);
  console.log("═".repeat(80));

  let sess: Record<string, unknown>;
  if (FROM_BACKUP) {
    if (!existsSync(FROM_BACKUP)) {
      console.error(`Backup-bestand niet gevonden: ${FROM_BACKUP}`);
      process.exit(1);
    }
    sess = JSON.parse(readFileSync(FROM_BACKUP, "utf-8")) as Record<string, unknown>;
  } else {
    const { data, error } = await supa
      .from("din_sessions")
      .select("data")
      .eq("id", SESSION_ID)
      .maybeSingle();

    if (error) {
      console.error("Supabase fout:", error.message);
      process.exit(1);
    }
    if (!data) {
      console.error("Sessie niet gevonden");
      process.exit(1);
    }

    sess = data.data as Record<string, unknown>;
  }
  const wiz = sess.crossAnalyseWizard as Record<string, unknown> | undefined;
  const stap4 =
    ((wiz?.stepResults as Record<string, unknown> | undefined) || {}).stap4 as
      | Record<string, unknown>
      | undefined;
  if (!stap4) {
    console.error("Stap 4 niet gevonden");
    process.exit(1);
  }

  // ─── 1. begrotingAdvies.scenarios.*.inspanningen[*].motivatie + verdelingPerJaar[*].activiteit ───
  const begrotingAdvies = stap4.begrotingAdvies as
    | { scenarios?: Record<string, Record<string, unknown> | null> }
    | undefined;

  if (begrotingAdvies?.scenarios) {
    for (const [scKey, sc] of Object.entries(begrotingAdvies.scenarios)) {
      if (!sc) continue;
      const insp = sc.inspanningen as Array<Record<string, unknown>> | undefined;
      if (!insp) continue;

      for (let i = 0; i < insp.length; i++) {
        const item = insp[i];
        if (item.domein !== "mens") continue;

        // motivatie
        probeer(
          item,
          "motivatie",
          `stap4.begrotingAdvies.scenarios.${scKey}.inspanningen[${i}].motivatie`,
          "AI-motivatie van de mens-inspanning — doelgroep-aantal corrigeren"
        );

        // verdelingPerJaar[*].activiteit
        const vpj = item.verdelingPerJaar as Array<Record<string, unknown>> | undefined;
        if (vpj) {
          for (let j = 0; j < vpj.length; j++) {
            probeer(
              vpj[j],
              "activiteit",
              `stap4.begrotingAdvies.scenarios.${scKey}.inspanningen[${i}].verdelingPerJaar[${j}].activiteit`,
              "AI-jaaractiviteit voor de mens-inspanning — doelgroep-aantal corrigeren"
            );
          }
        }
      }

      // prioriteitAdvies (per scenario)
      probeer(
        sc as Record<string, unknown>,
        "prioriteitAdvies",
        `stap4.begrotingAdvies.scenarios.${scKey}.prioriteitAdvies`,
        "AI-prioriteitsadvies — bevat 80 deelnemers verwijzing in Rang 2 (Mens)"
      );
    }
  }

  // ─── 2. stap7InterneUren.scenarios.*.domeinen[*] (mens = idx 1, processen = idx 3) ───
  const stap7 = stap4.stap7InterneUren as Record<string, unknown> | undefined;
  if (stap7?.scenarios) {
    const scenariosObj = stap7.scenarios as Record<string, Record<string, unknown> | null>;
    for (const [scKey, sc] of Object.entries(scenariosObj)) {
      if (!sc) continue;
      const domeinen = sc.domeinen as Array<Record<string, unknown>> | undefined;
      if (!domeinen) continue;

      for (let d = 0; d < domeinen.length; d++) {
        const dom = domeinen[d];
        const domNaam = (dom.naam as string) || (dom.domein as string) || `idx${d}`;

        // motivatie van het domein
        probeer(
          dom,
          "motivatie",
          `stap4.stap7InterneUren.scenarios.${scKey}.domeinen[${d}/${domNaam}].motivatie`,
          "AI-domein-motivatie — bevat verwijzing naar gespreksvaardigheidstraining-doelgroep"
        );

        const jaren = dom.jaren as Array<Record<string, unknown>> | undefined;
        if (jaren) {
          for (let j = 0; j < jaren.length; j++) {
            probeer(
              jaren[j],
              "activiteit",
              `stap4.stap7InterneUren.scenarios.${scKey}.domeinen[${d}/${domNaam}].jaren[${j}].activiteit`,
              "AI-jaaractiviteit binnen domein — doelgroep-aantal corrigeren"
            );
          }
        }
      }
    }
  }

  // ─── 3. stap7InterneUren.vragenPerInspanning[*].vragen[*].aanbevolenAntwoord ───
  // (AI-suggesties; deze tekst staat naast de gebruiker-antwoord)
  const vragenPerInsp = stap7?.vragenPerInspanning as
    | Array<Record<string, unknown>>
    | undefined;
  if (vragenPerInsp) {
    for (let i = 0; i < vragenPerInsp.length; i++) {
      if (vragenPerInsp[i].domein !== "mens") continue;
      const vragen = vragenPerInsp[i].vragen as Array<Record<string, unknown>> | undefined;
      if (!vragen) continue;
      for (let v = 0; v < vragen.length; v++) {
        probeer(
          vragen[v],
          "aanbevolenAntwoord",
          `stap4.stap7InterneUren.vragenPerInspanning[${i}].vragen[${v}].aanbevolenAntwoord`,
          "AI-aanbevolen antwoord (geen gebruikersinvoer) — doelgroep-aantal corrigeren"
        );
        probeer(
          vragen[v],
          "toelichtingAanbeveling",
          `stap4.stap7InterneUren.vragenPerInspanning[${i}].vragen[${v}].toelichtingAanbeveling`,
          "AI-toelichting bij de aanbeveling"
        );
      }
    }
  }

  // ─── 4. stap7InterneUren.vastgesteldeUrenPerInspanning[*].rollen[*].onderbouwing ───
  // (AI-onderbouwing per rol)
  const vast = stap7?.vastgesteldeUrenPerInspanning as
    | Array<Record<string, unknown>>
    | undefined;
  if (vast) {
    for (let i = 0; i < vast.length; i++) {
      if (vast[i].domein !== "mens") continue;
      const rollen = vast[i].rollen as Array<Record<string, unknown>> | undefined;
      if (!rollen) continue;
      for (let r = 0; r < rollen.length; r++) {
        probeer(
          rollen[r],
          "onderbouwing",
          `stap4.stap7InterneUren.vastgesteldeUrenPerInspanning[${i}].rollen[${r}/${rollen[r].functieId}].onderbouwing`,
          "AI-onderbouwing van uren-totaal per rol — doelgroep-aantal corrigeren"
        );
      }
    }
  }

  // ─── 5. subEffortAnalysis[*].dossier.kostenraming + businessCase.result.* ───
  // BELANGRIJK: businessCase.answers wordt NIET aangeraakt — dat is letterlijke
  // gebruikersinvoer.
  const subAnal = stap4.subEffortAnalysis as Array<Record<string, unknown>> | undefined;
  if (subAnal) {
    for (let i = 0; i < subAnal.length; i++) {
      if (subAnal[i].domein !== "mens") continue;

      const dossier = subAnal[i].dossier as Record<string, unknown> | undefined;
      if (dossier) {
        probeer(
          dossier,
          "kostenraming",
          `stap4.subEffortAnalysis[${i}].dossier.kostenraming`,
          "AI-rendered dossier kostenraming — bevat '80 deelnemers' verwijzingen"
        );
        probeer(
          dossier,
          "verwachtResultaat",
          `stap4.subEffortAnalysis[${i}].dossier.verwachtResultaat`,
          "AI-rendered verwacht resultaat"
        );
        probeer(
          dossier,
          "randvoorwaarden",
          `stap4.subEffortAnalysis[${i}].dossier.randvoorwaarden`,
          "AI-rendered randvoorwaarden"
        );
      }

      const bc = subAnal[i].businessCase as
        | { result?: Record<string, unknown> | null }
        | undefined;
      if (bc?.result) {
        probeer(
          bc.result,
          "kostenraming",
          `stap4.subEffortAnalysis[${i}].businessCase.result.kostenraming`,
          "AI-rendered businessCase kostenraming — bevat '66 deelnemers' verwijzingen"
        );

        const aannames = bc.result.aannames as string[] | undefined;
        if (Array.isArray(aannames)) {
          for (let a = 0; a < aannames.length; a++) {
            const huidig = aannames[a];
            const nieuw = vervang(
              huidig,
              `stap4.subEffortAnalysis[${i}].businessCase.result.aannames[${a}]`
            );
            if (nieuw !== huidig) {
              const snip = diffSnippet(huidig, nieuw);
              wijzigingen.push({
                path: `stap4.subEffortAnalysis[${i}].businessCase.result.aannames[${a}]`,
                voor: snip.voor,
                na: snip.na,
                reden: "AI-aanname over deelnemertal",
              });
              aannames[a] = nieuw;
            }
          }
        }

        const risicos = bc.result.risicos as string[] | undefined;
        if (Array.isArray(risicos)) {
          for (let r = 0; r < risicos.length; r++) {
            const huidig = risicos[r];
            const nieuw = vervang(
              huidig,
              `stap4.subEffortAnalysis[${i}].businessCase.result.risicos[${r}]`
            );
            if (nieuw !== huidig) {
              const snip = diffSnippet(huidig, nieuw);
              wijzigingen.push({
                path: `stap4.subEffortAnalysis[${i}].businessCase.result.risicos[${r}]`,
                voor: snip.voor,
                na: snip.na,
                reden: "AI-risicobeschrijving — doelgroep-aantal corrigeren",
              });
              risicos[r] = nieuw;
            }
          }
        }

        const success = bc.result.successFactoren as string[] | undefined;
        if (Array.isArray(success)) {
          for (let r = 0; r < success.length; r++) {
            const huidig = success[r];
            if (typeof huidig !== "string") continue;
            const nieuw = vervang(
              huidig,
              `stap4.subEffortAnalysis[${i}].businessCase.result.successFactoren[${r}]`
            );
            if (nieuw !== huidig) {
              const snip = diffSnippet(huidig, nieuw);
              wijzigingen.push({
                path: `stap4.subEffortAnalysis[${i}].businessCase.result.successFactoren[${r}]`,
                voor: snip.voor,
                na: snip.na,
                reden: "AI-succesfactor",
              });
              success[r] = nieuw;
            }
          }
        }
      }

      // beschrijving / beargumentatie / vermogenImpact
      probeer(
        subAnal[i],
        "beschrijving",
        `stap4.subEffortAnalysis[${i}].beschrijving`,
        "Beschrijving van de mens-inspanning"
      );
      probeer(
        subAnal[i],
        "beargumentatie",
        `stap4.subEffortAnalysis[${i}].beargumentatie`,
        "Beargumentatie van de mens-inspanning"
      );
      probeer(
        subAnal[i],
        "vermogenImpact",
        `stap4.subEffortAnalysis[${i}].vermogenImpact`,
        "Vermogenimpact-tekst"
      );
    }
  }

  // ─── Ontdubbel twijfels op basis van pad+fragment ───
  const seenTwijfels = new Set<string>();
  const uniekeTwijfels: Twijfel[] = [];
  for (const t of twijfels) {
    const key = `${t.path}|${t.fragment.substring(0, 80)}`;
    if (seenTwijfels.has(key)) continue;
    seenTwijfels.add(key);
    uniekeTwijfels.push(t);
  }

  console.log(`\nWijzigingen voorbereid: ${wijzigingen.length}`);
  console.log(`Twijfels (handmatig nakijken): ${uniekeTwijfels.length}`);

  // ─── Schrijf logfile ───
  const datum = new Date().toISOString().slice(0, 19).replace("T", " ");
  const logLines: string[] = [];
  logLines.push("# AUDIT — Rationalisatie mens-deelnemertal naar 47");
  logLines.push("");
  logLines.push(`**Sessie:** ${SESSION_ID}`);
  logLines.push(`**Datum:** ${datum}`);
  const modeLabel = FROM_BACKUP
    ? `FROM-BACKUP "${FROM_BACKUP}" (audit-only — Supabase niet aangeraakt door deze run)`
    : DRY_RUN
      ? "DRY-RUN (niet weggeschreven)"
      : "LIVE (Supabase bijgewerkt)";
  logLines.push(`**Mode:** ${modeLabel}`);
  logLines.push(`**Doel:** Tekstvelden harmoniseren naar 47 trainings-deelnemers`);
  logLines.push("");
  logLines.push("## Achtergrond");
  logLines.push("");
  logLines.push(
    "Stap 7 kende drie deelnemertallen voor de gespreksvaardigheidstraining: 80 in `selectiePerDomein.mens` (incl. 12 trainers en 3 sectormanagers als begeleiders), 66 in oudere AI-aannames en dossier-teksten, en 47 in de werkelijke uren-toewijzingen (`vastgesteldeUrenPerInspanning`). Dit script consolideert tekstvelden op 47 — de feitelijke deelnemer-rollen (7 Accountmanager C + 5 Accountmanager C Prof + 7 Medewerker binnendienst B + 28 Klantenservice C). De metadata in `selectiePerDomein.mens` blijft ongemoeid."
  );
  logLines.push("");
  logLines.push("## Velden niet aangeraakt (gebruikersinvoer)");
  logLines.push("");
  logLines.push("- `crossAnalyseWizard.stepResults.stap4.stap7InterneUren.vragenAntwoorden.insp-2-mens.{v1,v2,v3}` — letterlijke gebruikersantwoorden");
  logLines.push("- `crossAnalyseWizard.stepResults.stap4.subEffortAnalysis[0].businessCase.answers.interne_uren_per_rol` — letterlijke gebruikersinvoer");
  logLines.push("- `selectiePerDomein.mens.*.aantal` — metadata van de selectie (correct: 80 inclusief begeleiders)");
  logLines.push("");
  logLines.push(`## Wijzigingen (${wijzigingen.length})`);
  logLines.push("");

  if (wijzigingen.length === 0) {
    logLines.push("_Geen wijzigingen — alle allowlist-paden zijn al gerationaliseerd._");
  } else {
    for (let i = 0; i < wijzigingen.length; i++) {
      const w = wijzigingen[i];
      logLines.push(`### ${i + 1}. \`${w.path}\``);
      logLines.push("");
      logLines.push(`**Reden:** ${w.reden}`);
      logLines.push("");
      logLines.push("**Voor:**");
      logLines.push("```");
      logLines.push(w.voor);
      logLines.push("```");
      logLines.push("");
      logLines.push("**Na:**");
      logLines.push("```");
      logLines.push(w.na);
      logLines.push("```");
      logLines.push("");
    }
  }

  logLines.push(`## Twijfels — handmatig nakijken (${uniekeTwijfels.length})`);
  logLines.push("");
  if (uniekeTwijfels.length === 0) {
    logLines.push("_Geen twijfels._");
  } else {
    logLines.push(
      "Onderstaande velden bevatten calculaties of phasing-aannames die de oorspronkelijke 66/80 als basis hadden. Een naïeve string-vervanging zou de berekening klopt-niet maken; daarom worden ze ter handmatige inspectie genoteerd."
    );
    logLines.push("");
    for (let i = 0; i < uniekeTwijfels.length; i++) {
      const t = uniekeTwijfels[i];
      logLines.push(`### ${i + 1}. \`${t.path}\``);
      logLines.push("");
      logLines.push(`**Reden:** ${t.reden}`);
      logLines.push("");
      logLines.push("**Fragment:**");
      logLines.push("```");
      logLines.push(t.fragment);
      logLines.push("```");
      logLines.push("");
    }
  }

  const outPath = join(process.cwd(), "AUDIT-MENS-TELLING.md");
  writeFileSync(outPath, logLines.join("\n"), "utf-8");
  console.log(`\n✓ Audit-log geschreven: ${outPath}`);

  // ─── Schrijf naar Supabase ───
  if (FROM_BACKUP) {
    console.log("\n[FROM-BACKUP] alleen audit-log gegenereerd — Supabase niet aangeraakt.");
    return;
  }
  if (DRY_RUN) {
    console.log("\n[DRY-RUN] geen Supabase-update uitgevoerd.");
    return;
  }
  if (wijzigingen.length === 0) {
    console.log("\nGeen wijzigingen — Supabase-update overgeslagen.");
    return;
  }

  const newData = {
    ...sess,
    crossAnalyseWizard: {
      ...(sess.crossAnalyseWizard as object),
      stepResults: {
        ...((wiz?.stepResults as Record<string, unknown> | undefined) ?? {}),
        stap4,
      },
    },
  };

  const { error: updErr } = await supa
    .from("din_sessions")
    .update({ data: newData })
    .eq("id", SESSION_ID);

  if (updErr) {
    console.error("FOUT bij Supabase-update:", updErr.message);
    process.exit(1);
  }
  console.log(`\n✓ Supabase bijgewerkt — ${wijzigingen.length} tekstvelden gerationaliseerd naar ${NIEUW_AANTAL} deelnemers.`);
}

main().catch((e) => {
  console.error(e instanceof Error ? e.message : e);
  process.exit(1);
});
