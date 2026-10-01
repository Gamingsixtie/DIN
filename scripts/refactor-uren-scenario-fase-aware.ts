// Refactor §4.2 Interne uren — scenario- en fase-aware curve.
//
// Probleem (constatering door user):
//   De huidige stap7InterneUren heeft voor alle 4 scenario's vrijwel
//   identieke uren-curves (5.573–5.575 u, ~80% in J2+J3 / 2027-2028).
//   In min20 (10j) ligt CRM-Acceptatie inhoudelijk in 2030, maar de
//   uren staan op 2027 — capaciteit staat 3 jaar vóór het werk.
//
// Wat dit script doet (idempotent):
//   1. Per scenario × domein: herverdeel domein-totaal-uren over jaren
//      conform OOP-fase-curve uit stap4.begrotingAdvies (verdelingPerJaar[].fase),
//      mét fase-zwaarte-respect (heuristic per inspanning hieronder).
//   2. 2026 half-jaar-cap (start juni): J1 ≤ 290u (advies/plus20) of ≤ 250u
//      (optimaal/min20). Overschot doorschuiven naar J2.
//   3. CRM-staart 50–80u/jr in beheer/optim/doorontw-jaren
//      (Manager DT bilateralen + sectormanager-borging).
//   4. Min20 J8–J10: 50u/jr (≈20u procesmanager + 15u sectormanager + 15u Manager DT).
//   5. Schrijf terug: domeinen[].jaren[].rollen[]/totaalUren/totaalKosten,
//      domeinen[].totaalUren/totaalKosten, scen.totalenPerJaar (uren+kosten),
//      scen.totaalUren, scen.totaalKosten.
//
// Idempotentie: het script herleidt elke keer de uren-verdeling vanuit
//   - vastgesteldeUrenPerInspanning (per-domein totaal-uren basis, ongewijzigd)
//   - begrotingAdvies-fasering (per scenario)
//   en NIET vanuit de huidige scenario-uitsplitsing. Dus tweede run = idem.
//
// Gebruik:
//   npx tsx scripts/refactor-uren-scenario-fase-aware.ts            (dry-run)
//   npx tsx scripts/refactor-uren-scenario-fase-aware.ts --apply    (schrijven)

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

const SESSION_ID = "d8b97442-ce8f-4134-b2c7-67dc8e3a3f93";
const APPLY = process.argv.includes("--apply");

const supa = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
);

// ─────────────────────────────────────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────────────────────────────────────

type DomeinKey = "data_systemen" | "mens" | "cultuur" | "processen";
type ScenarioKey = "min20" | "advies" | "plus20" | "optimaal";

interface RolUren {
  functieId: string;
  functieNaam: string;
  afdeling?: string;
  uren: number;
  uurtarief: number;
  kosten: number;
}

interface JaarBlok {
  jaar: number;
  rollen: RolUren[];
  activiteit?: string;
  totaalUren?: number;
  totaalKosten?: number;
}

interface DomeinBlok {
  domein: string;
  jaren: JaarBlok[];
  koppeling?: string[];
  motivatie?: string;
  totaalUren?: number;
  totaalKosten?: number;
  uren?: number; // user noemde dat dit veld undefined was — vullen we
}

interface TotaalPerJaar {
  jaar: number;
  uren: number;
  kosten: number;
  urenBudget?: number;
  urenGap?: number;
}

interface ScenarioBlok {
  scenarioLabel?: string;
  startJaar?: number;
  aantalJaren?: number;
  uurtariefGebruikt?: number;
  domeinen?: DomeinBlok[];
  totalenPerJaar?: TotaalPerJaar[];
  totaalUren?: number;
  totaalKosten?: number;
  samenvatting?: string;
}

interface VerdelingPerJaar {
  jaar: number;
  fase: string;
  euro: number;
  activiteit?: string;
}

interface BegrotingInspanning {
  domein: string;
  inspanningTitel?: string;
  verdelingPerJaar?: VerdelingPerJaar[];
}

interface BegrotingScenario {
  label?: string;
  aantalJaren?: number;
  inspanningen?: BegrotingInspanning[];
}

interface VastgesteldeRol {
  functieId: string;
  functieNaam: string;
  afdeling?: string;
  urenTotaal: number;
}

interface VastgesteldeInspanning {
  domein: string;
  inspanningTitel?: string;
  rollen: VastgesteldeRol[];
}

// ─────────────────────────────────────────────────────────────────────────────
// Fase-zwaarte heuristic (per domein) — % van domein-totaal-uren binnen fase.
// We mappen elke fase-string uit begrotingAdvies naar één bucket.
// Fractie binnen een bucket wordt later evenredig over de jaren in die bucket
// verdeeld (een bucket kan meerdere jaren bevatten in lange scenario's).
// ─────────────────────────────────────────────────────────────────────────────

type Bucket = string;

interface FaseHeuristic {
  buckets: Record<Bucket, number>;
  match: (fase: string) => Bucket;
}

const HEURISTIC: Record<DomeinKey, FaseHeuristic> = {
  data_systemen: {
    // CRM — TUNING V2 (2026-05-03): Acceptatie zwaarder, Realisatie lichter
    // zodat CRM-uren-piek samenvalt met OOP-Acceptatie★-piek (key-user-
    // training + acceptatietest + go-live = capaciteitsintensief).
    // Som = 100% (15+25+35+25).
    buckets: {
      analyse: 0.15,
      realisatie: 0.25, // realisatie/leverancier-selectie (was 0.30)
      acceptatie: 0.35, // acceptatie/uitrol/go-live (was 0.30, nu zwaarder)
      beheer: 0.25, // beheer/optimalisatie/doorontwikkeling/continu
    },
    match: (fase: string): Bucket => {
      const f = fase.toLowerCase();
      if (/architect|analys|inventaris/.test(f)) return "analyse";
      if (/lever|selectie|realisat|integrati|bouw/.test(f)) return "realisatie";
      if (/accept|pilot|uitrol|go-?live|sectoruitrol|adoptie/.test(f)) return "acceptatie";
      if (/beheer|optimalis|doorontw|continu|verank|borg|standaardis/.test(f)) return "beheer";
      // Default fallback
      return "beheer";
    },
  },
  mens: {
    // Gespreksvaardigheidstraining
    buckets: {
      behoefte: 0.10, // behoeftestelling/curriculumontwerp/curriculumvalidatie
      basis: 0.35, // basistraining (blok 1)
      vaardigheid: 0.30, // vaardigheid/blok 2
      toepassing: 0.10, // toepassing in praktijk
      borging: 0.15, // borging/verankering/continu
    },
    match: (fase: string): Bucket => {
      const f = fase.toLowerCase();
      if (/behoefte|curriculum|nulmeting|intake|ontwerp/.test(f)) return "behoefte";
      if (/basis.*blok\s*1|basistraining\b(?!.*blok\s*2)|^basistraining$|basistraining\s*$|basistraining$/.test(f)) {
        // Specifiek "Basistraining" of "Basistraining - blok 1"
        return "basis";
      }
      if (/blok\s*1/.test(f)) return "basis";
      if (/blok\s*2|vaardigheid|tweede trainingsblok/.test(f)) return "vaardigheid";
      if (/toepassing|on.the.job|praktijk/.test(f)) return "toepassing";
      if (/borging|verank|continu|nazorg/.test(f)) return "borging";
      // "Vaardigheidstraining & toepassing" → vaardigheid (blok 2 dominant)
      if (/vaardig/.test(f)) return "vaardigheid";
      // "Basistraining" zonder blok-suffix in 4-jarig scenario combineert blok 1+2
      if (/basis/.test(f)) return "basis";
      return "borging";
    },
  },
  cultuur: {
    // Leiderschapsprogramma
    buckets: {
      bewust: 0.30, // bewustwording/urgentie/coalitie
      acceptatie: 0.30, // acceptatie/adoptie/leerkringen
      verank: 0.25, // verankering/borging in HR-cyclus
      continu: 0.15, // continu/jaarlijkse cultuurmeting
    },
    match: (fase: string): Bucket => {
      const f = fase.toLowerCase();
      if (/bewust|urgent|coalitie/.test(f)) return "bewust";
      if (/accept|adoptie|rolmodel|leerkring|waardenverankering/.test(f)) return "acceptatie";
      if (/borging in hr|verank|borging/.test(f)) return "verank";
      if (/continu|continue|rolmodel-werking/.test(f)) return "continu";
      return "verank";
    },
  },
  processen: {
    buckets: {
      inventaris: 0.15,
      heront: 0.30, // herontwerp/pilot/to-be — zwaarste blok
      uitrol: 0.25, // uitrol/standaardisatie
      continu: 0.30, // continu/verankering — schaalt mee met scenario-lengte
    },
    match: (fase: string): Bucket => {
      const f = fase.toLowerCase();
      if (/inventaris|as-is/.test(f)) return "inventaris";
      if (/heront|to-be|pilot|validatie/.test(f)) return "heront";
      if (/uitrol|standaardis/.test(f)) return "uitrol";
      if (/continu|continue|verank|borging/.test(f)) return "continu";
      return "continu";
    },
  },
};

// ─────────────────────────────────────────────────────────────────────────────
// CRM-staart en min20-staart (uitbreidingen op basis-uren)
// ─────────────────────────────────────────────────────────────────────────────

// CRM-staart: in alle scenario's J4+: 50–80u/jr key-user-bewaking +
// sectormanager-borging zolang CRM-licenties + beheer doorlopen.
// We splitsen 65u/jr (midden van 50–80) als volgt:
//   - Manager Data & Technologie: 25u/jr (CRM-bilateralen + bewaking)
//   - Sectormanager PO: 12u/jr
//   - Sectormanager VO: 12u/jr
//   - Sectormanager Professionals: 12u/jr  (samen 36u sectormanager-borging)
//   - Manager Klantcontact: 4u/jr
// Totaal: 65u/jr.

const CRM_STAART_UREN = {
  manager_dt: 25,
  sectormanager_po: 12,
  sectormanager_vo: 12,
  sectormanager_prof: 12,
  manager_klantcontact: 4,
} as const;

// Min20 J8–J10 structurele staart (~50u/jr cross-domein, alleen min20)
//   - processen: 20u/jr (procesmanager_data — proceseigenaarschap-borging)
//   - cultuur:   15u/jr (sectormanagers samen — jaarlijkse cultuurmeting)
//   - data_sys:  15u/jr (manager_dt — extra CRM-bewaking, naast CRM-staart)

// ─────────────────────────────────────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────────────────────────────────────

function computeUurtarief(jaar: number, basistarief: number, refjaar: number, indexpct: number): number {
  const jaren = jaar - refjaar;
  const tarief = basistarief * Math.pow(1 + indexpct, jaren);
  return Math.round(tarief);
}

// J1-cap (2026 half-jaar): voor advies/plus20 ≤ 290u, optimaal/min20 ≤ 250u.
function getJ1Cap(skey: ScenarioKey): number {
  if (skey === "advies" || skey === "plus20") return 290;
  return 250;
}

function isCRMStaartFase(fase: string): boolean {
  const f = fase.toLowerCase();
  return /beheer|optimalis|doorontw|continu/.test(f);
}

// ─────────────────────────────────────────────────────────────────────────────
// Per scenario × domein: jaarverdeling op basis van fase-buckets
// ─────────────────────────────────────────────────────────────────────────────

function bepaalUrenPerJaar(
  domein: DomeinKey,
  totaalUrenDomein: number,
  inspanning: BegrotingInspanning | undefined,
  scenarioJaren: number[],
): Map<number, number> {
  const result = new Map<number, number>();
  for (const j of scenarioJaren) result.set(j, 0);

  if (!inspanning?.verdelingPerJaar?.length) return result;

  const heur = HEURISTIC[domein];

  // Map elk jaar in begrotingAdvies naar een bucket
  const jaarBuckets: { jaar: number; bucket: Bucket }[] = inspanning.verdelingPerJaar.map((v) => ({
    jaar: v.jaar,
    bucket: heur.match(v.fase),
  }));

  // Bereken per bucket hoeveel jaren erin zitten (om binnen-bucket-verdeling te doen)
  const bucketJaren = new Map<Bucket, number[]>();
  for (const jb of jaarBuckets) {
    if (!bucketJaren.has(jb.bucket)) bucketJaren.set(jb.bucket, []);
    bucketJaren.get(jb.bucket)!.push(jb.jaar);
  }

  // Voor elk jaar: bucketgewicht / aantal-jaren-in-bucket × totaalUrenDomein
  for (const jb of jaarBuckets) {
    const bucketGewicht = heur.buckets[jb.bucket] ?? 0;
    const aantalInBucket = bucketJaren.get(jb.bucket)!.length;
    const fractieVoorDitJaar = bucketGewicht / aantalInBucket;
    const uren = totaalUrenDomein * fractieVoorDitJaar;
    result.set(jb.jaar, (result.get(jb.jaar) ?? 0) + uren);
  }

  // Buckets die NIET voorkomen in dit scenario (bijv. "leverancier-selectie"
  // bestaat alleen in min20 en optimaal): hun gewicht moet alsnog landen.
  // We herverdelen ontbrekend gewicht proportioneel naar de overige bucket-jaren.
  const aanwezigeBuckets = new Set(jaarBuckets.map((j) => j.bucket));
  let ontbrekendGewicht = 0;
  for (const [b, w] of Object.entries(heur.buckets)) {
    if (!aanwezigeBuckets.has(b)) ontbrekendGewicht += w;
  }
  if (ontbrekendGewicht > 0) {
    // Verdeel ontbrekend gewicht over alle aanwezige jaren proportioneel aan
    // hun huidige aandeel
    const huidigTotaal = Array.from(result.values()).reduce((s, x) => s + x, 0);
    if (huidigTotaal > 0) {
      const extraTotaal = totaalUrenDomein * ontbrekendGewicht;
      for (const [jaar, uren] of result.entries()) {
        const aandeel = uren / huidigTotaal;
        result.set(jaar, uren + extraTotaal * aandeel);
      }
    }
  }

  return result;
}

// ─────────────────────────────────────────────────────────────────────────────
// Roltoewijzing binnen een jaar — proportioneel aan de domein-rol-mix uit
// vastgesteldeUrenPerInspanning, met een lichte fase-bias:
//   - In "deelnemers-zware" jaren (mens basis/vaardigheid) krijgen de
//     deelnemer-rollen meer gewicht (hun natuurlijke aandeel is al groot).
//   - In "trekker-zware" jaren (analyse/borging) krijgen leiding/trainer/HR
//     meer gewicht.
// We gebruiken hier puur proportionele toewijzing op basis van urenTotaal
// per rol (uit vastgesteldeUrenPerInspanning) — dat is de bron van waarheid
// voor de rolmix. Fase-bias toepassen zou nieuwe parameters introduceren;
// proportioneel houdt het deterministisch en eenvoudig.
// ─────────────────────────────────────────────────────────────────────────────

function verdeelUrenOverRollen(
  totaalUrenJaar: number,
  rollenBasis: VastgesteldeRol[],
  uurtarief: number,
): RolUren[] {
  if (totaalUrenJaar <= 0 || !rollenBasis.length) return [];
  const totaalBasis = rollenBasis.reduce((s, r) => s + r.urenTotaal, 0);
  if (totaalBasis <= 0) return [];

  const result: RolUren[] = [];
  let toegekend = 0;
  for (let i = 0; i < rollenBasis.length; i++) {
    const r = rollenBasis[i];
    let uren: number;
    if (i === rollenBasis.length - 1) {
      // Laatste rol: rest om afrondingsverlies te vermijden
      uren = Math.max(0, Math.round(totaalUrenJaar - toegekend));
    } else {
      uren = Math.round((r.urenTotaal / totaalBasis) * totaalUrenJaar);
      toegekend += uren;
    }
    if (uren <= 0) continue;
    result.push({
      functieId: r.functieId,
      functieNaam: r.functieNaam,
      afdeling: r.afdeling,
      uren,
      uurtarief,
      kosten: uren * uurtarief,
    });
  }
  return result;
}

// ─────────────────────────────────────────────────────────────────────────────
// Half-jaar-cap toepassen voor 2026 — overschot doorschuiven naar 2027
// ─────────────────────────────────────────────────────────────────────────────

function pasJ1CapToe(
  urenPerJaar: Map<number, number>,
  startJaar: number,
  cap: number,
): Map<number, number> {
  const result = new Map(urenPerJaar);
  const j1 = result.get(startJaar) ?? 0;
  const j2Key = startJaar + 1;
  if (j1 > cap) {
    const overschot = j1 - cap;
    result.set(startJaar, cap);
    if (result.has(j2Key)) {
      result.set(j2Key, (result.get(j2Key) ?? 0) + overschot);
    } else {
      // Geen J2 in scenario — laat overschot weglekken (zou alleen bij 1-jarig kunnen)
    }
  }
  return result;
}

// ─────────────────────────────────────────────────────────────────────────────
// Bouw het volledige scenario opnieuw op
// ─────────────────────────────────────────────────────────────────────────────

interface BasisInput {
  vastgesteldeUren: Record<DomeinKey, VastgesteldeInspanning | undefined>;
  begrotingScenario: BegrotingScenario;
  basistarief: number;
  refjaar: number;
  indexpct: number;
  startJaar: number;
}

function bouwScenarioOpnieuw(
  skey: ScenarioKey,
  input: BasisInput,
  oudScen?: ScenarioBlok,
): ScenarioBlok {
  const { vastgesteldeUren, begrotingScenario, basistarief, refjaar, indexpct, startJaar } = input;
  const aantalJaren = begrotingScenario.aantalJaren ?? oudScen?.aantalJaren ?? 4;
  const scenarioJaren = Array.from({ length: aantalJaren }, (_, i) => startJaar + i);

  const j1Cap = getJ1Cap(skey);

  const nieuwDomeinen: DomeinBlok[] = [];

  // ───────────────────────────────────────────────────────────────────────
  // Eerst: bereken voor alle 4 domeinen de RAW uren-per-jaar verdeling
  // ───────────────────────────────────────────────────────────────────────
  const rawPerDomein: Record<DomeinKey, Map<number, number>> = {
    data_systemen: new Map(),
    mens: new Map(),
    cultuur: new Map(),
    processen: new Map(),
  };
  for (const domein of ["data_systemen", "mens", "cultuur", "processen"] as DomeinKey[]) {
    const basis = vastgesteldeUren[domein];
    if (!basis) continue;
    const totaalUrenBasis = basis.rollen.reduce((s, r) => s + r.urenTotaal, 0);
    const inspanning = begrotingScenario.inspanningen?.find((i) => i.domein === domein);
    const upj = bepaalUrenPerJaar(domein, totaalUrenBasis, inspanning, scenarioJaren);

    // Min20 J8-J10 staart toevoegen
    if (skey === "min20") {
      const min20StaartPerDomein: Partial<Record<DomeinKey, number>> = {
        processen: 20,
        cultuur: 15,
        data_systemen: 15,
      };
      const extra = min20StaartPerDomein[domein] ?? 0;
      if (extra > 0) {
        for (const j of [2033, 2034, 2035]) {
          if (upj.has(j)) upj.set(j, (upj.get(j) ?? 0) + extra);
        }
      }
    }
    rawPerDomein[domein] = upj;
  }

  // ───────────────────────────────────────────────────────────────────────
  // Pas J1-cap COLLECTIEF toe: cap geldt voor som van alle 4 domeinen.
  // Bij overschrijding: schaal alle 4 domeinen proportioneel terug, en
  // verdeel overschot per-domein PROPORTIONEEL over de overige jaren
  // (J2..Jn), op basis van hun reeds toegewezen uren-aandeel. Dit voorkomt
  // dat het overschot kunstmatig op J2 (Realisatie) belandt — wat de
  // CRM-uren-piek 1 jaar VOOR het OOP-Acceptatie★-jaar zou plaatsen.
  // Door proportionele herverdeling blijft de natuurlijke fase-curve
  // intact (Acceptatie blijft de piek omdat dat de zwaarste bucket is).
  // ───────────────────────────────────────────────────────────────────────
  const j1TotaalSom = (["data_systemen", "mens", "cultuur", "processen"] as DomeinKey[])
    .map((d) => rawPerDomein[d].get(startJaar) ?? 0)
    .reduce((s, x) => s + x, 0);

  if (j1TotaalSom > j1Cap) {
    const factor = j1Cap / j1TotaalSom;
    for (const d of ["data_systemen", "mens", "cultuur", "processen"] as DomeinKey[]) {
      const m = rawPerDomein[d];
      const oudJ1 = m.get(startJaar) ?? 0;
      const nieuwJ1 = oudJ1 * factor;
      const overschot = oudJ1 - nieuwJ1;
      m.set(startJaar, nieuwJ1);
      // Verdeel overschot proportioneel over alle jaren ná J1
      const overigeJaren = scenarioJaren.filter((j) => j !== startJaar);
      const overigeSom = overigeJaren
        .map((j) => m.get(j) ?? 0)
        .reduce((s, x) => s + x, 0);
      if (overigeSom > 0 && overigeJaren.length > 0) {
        for (const j of overigeJaren) {
          const huidig = m.get(j) ?? 0;
          const aandeel = huidig / overigeSom;
          m.set(j, huidig + overschot * aandeel);
        }
      } else if (overigeJaren.length > 0) {
        // Fallback: gelijk verdeeld als overigeSom 0 is
        const perJaar = overschot / overigeJaren.length;
        for (const j of overigeJaren) {
          m.set(j, (m.get(j) ?? 0) + perJaar);
        }
      }
    }
  }

  for (const domein of ["data_systemen", "mens", "cultuur", "processen"] as DomeinKey[]) {
    const basis = vastgesteldeUren[domein];
    if (!basis) continue;

    const inspanning = begrotingScenario.inspanningen?.find(
      (i) => i.domein === domein,
    );

    let urenPerJaar = rawPerDomein[domein];

    // Stap 5: maak per jaar de rol-uitsplitsing
    const jaren: JaarBlok[] = [];
    const oudDomBlok = oudScen?.domeinen?.find((d) => d.domein === domein);
    for (const jaar of scenarioJaren) {
      // J1 floor-rounden zodat collectieve cap niet door rounding wordt overschreden
      const raw = urenPerJaar.get(jaar) ?? 0;
      const totaalJaar = jaar === startJaar ? Math.floor(raw) : Math.round(raw);
      const uurtarief = computeUurtarief(jaar, basistarief, refjaar, indexpct);

      // Bouw rollen — eerst proportioneel aan basis
      let rollen: RolUren[] = [];

      // Voor data_systemen + CRM-staart: bereken hoeveel uren naar staart-rollen gaan
      let mainTotaal = totaalJaar;
      const staartRollen: RolUren[] = [];

      if (domein === "data_systemen") {
        const fase = inspanning?.verdelingPerJaar?.find((v) => v.jaar === jaar)?.fase ?? "";
        if (isCRMStaartFase(fase)) {
          // CRM-staart-uren reserveren — komen BOVENOP de fase-uren
          for (const [fid, uren] of Object.entries(CRM_STAART_UREN)) {
            // Vind functienaam en afdeling uit basis-rollen of fallback
            let functieNaam = fid;
            let afdeling: string | undefined;
            const basisRol = basis.rollen.find((r) => r.functieId === fid);
            if (basisRol) {
              functieNaam = basisRol.functieNaam;
              afdeling = basisRol.afdeling;
            } else {
              if (fid === "sectormanager_po") {
                functieNaam = "Sectormanager PO";
                afdeling = "Sector PO";
              } else if (fid === "sectormanager_vo") {
                functieNaam = "Sectormanager VO";
                afdeling = "Sector VO";
              } else if (fid === "sectormanager_prof") {
                functieNaam = "Sectormanager Professionals";
                afdeling = "Sector Professionals";
              } else if (fid === "manager_klantcontact") {
                functieNaam = "Manager Klantcontact";
                afdeling = "Klantcontact";
              } else if (fid === "manager_dt") {
                functieNaam = "Manager Data & Technologie";
                afdeling = "Data & Technologie";
              }
            }
            staartRollen.push({
              functieId: fid,
              functieNaam,
              afdeling,
              uren,
              uurtarief,
              kosten: uren * uurtarief,
            });
          }
        }
      }

      // Voor min20 J8-J10: voeg specifieke staart-rollen toe ipv proportioneel
      if (skey === "min20" && [2033, 2034, 2035].includes(jaar)) {
        if (domein === "processen") {
          rollen.push({
            functieId: "procesmanager_data",
            functieNaam: "Procesmanager / Data-analist Klant & Markt",
            afdeling: "Klant & Markt",
            uren: 20,
            uurtarief,
            kosten: 20 * uurtarief,
          });
          mainTotaal -= 20;
        } else if (domein === "cultuur") {
          // 15u: 5u per sectormanager
          for (const fid of ["sectormanager_po", "sectormanager_vo", "sectormanager_prof"]) {
            const basisRol = basis.rollen.find((r) => r.functieId === fid);
            const naam = basisRol?.functieNaam ?? fid;
            const afd = basisRol?.afdeling;
            rollen.push({
              functieId: fid,
              functieNaam: naam,
              afdeling: afd,
              uren: 5,
              uurtarief,
              kosten: 5 * uurtarief,
            });
          }
          mainTotaal -= 15;
        }
        // data_systemen wordt al via CRM-staart afgehandeld (manager_dt 25u
        // dekt ook deze 15u extra). We tellen niets dubbel.
      }

      // Hoofd-rollen proportioneel aan basis
      if (mainTotaal > 0) {
        const hoofdRollen = verdeelUrenOverRollen(mainTotaal, basis.rollen, uurtarief);
        // Merge: als rol al in `rollen` zit (bv. sectormanager via min20-staart), tel uren op
        for (const r of hoofdRollen) {
          const idx = rollen.findIndex((x) => x.functieId === r.functieId);
          if (idx >= 0) {
            rollen[idx].uren += r.uren;
            rollen[idx].kosten = rollen[idx].uren * uurtarief;
          } else {
            rollen.push(r);
          }
        }
      }

      // CRM-staart-rollen toevoegen / mergen
      for (const sr of staartRollen) {
        const idx = rollen.findIndex((x) => x.functieId === sr.functieId);
        if (idx >= 0) {
          rollen[idx].uren += sr.uren;
          rollen[idx].kosten = rollen[idx].uren * uurtarief;
        } else {
          rollen.push(sr);
        }
      }

      // Bereken finale totaalJaar (incl. staart-uren als ze van toepassing zijn)
      const finaalJaarTotaal = rollen.reduce((s, r) => s + r.uren, 0);
      const finaalJaarKosten = rollen.reduce((s, r) => s + r.kosten, 0);

      // Hergebruik activiteit uit oude jaarblok als die er was — anders
      // genereer korte fase-titel
      const oudJaarBlok = oudDomBlok?.jaren?.find((j) => j.jaar === jaar);
      const fase = inspanning?.verdelingPerJaar?.find((v) => v.jaar === jaar)?.fase ?? "";
      const activiteitFromBegrot = inspanning?.verdelingPerJaar?.find((v) => v.jaar === jaar)?.activiteit;

      jaren.push({
        jaar,
        rollen,
        activiteit: oudJaarBlok?.activiteit ?? activiteitFromBegrot ?? fase,
        totaalUren: finaalJaarTotaal,
        totaalKosten: finaalJaarKosten,
      });
    }

    const domTotaalUren = jaren.reduce((s, j) => s + (j.totaalUren ?? 0), 0);
    const domTotaalKosten = jaren.reduce((s, j) => s + (j.totaalKosten ?? 0), 0);

    nieuwDomeinen.push({
      domein,
      jaren,
      koppeling: oudDomBlok?.koppeling ?? ["g1"],
      motivatie: oudDomBlok?.motivatie,
      totaalUren: domTotaalUren,
      totaalKosten: domTotaalKosten,
      uren: domTotaalUren, // expliciet vullen (was undefined)
    });
  }

  // Scenario-totalen
  const totalenPerJaar: TotaalPerJaar[] = scenarioJaren.map((jaar) => {
    let uren = 0;
    let kosten = 0;
    for (const d of nieuwDomeinen) {
      const jb = d.jaren.find((j) => j.jaar === jaar);
      uren += jb?.totaalUren ?? 0;
      kosten += jb?.totaalKosten ?? 0;
    }
    // Behoud urenBudget uit oude data (dat is de jaarcapaciteit, niet onze taak)
    const oudT = oudScen?.totalenPerJaar?.find((t) => t.jaar === jaar);
    const urenBudget = oudT?.urenBudget;
    return {
      jaar,
      uren,
      kosten,
      urenBudget,
      urenGap: urenBudget !== undefined ? uren - urenBudget : undefined,
    };
  });

  const totaalUren = nieuwDomeinen.reduce((s, d) => s + (d.totaalUren ?? 0), 0);
  const totaalKosten = nieuwDomeinen.reduce((s, d) => s + (d.totaalKosten ?? 0), 0);

  // uurtariefGebruikt: behoud bestaande, of bereken voor middenjaar
  const uurtariefGebruikt =
    oudScen?.uurtariefGebruikt ?? computeUurtarief(startJaar + 1, basistarief, refjaar, indexpct);

  return {
    scenarioLabel: skey,
    startJaar,
    aantalJaren,
    uurtariefGebruikt,
    domeinen: nieuwDomeinen,
    totalenPerJaar,
    totaalUren,
    totaalKosten,
    samenvatting: oudScen?.samenvatting,
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// Main
// ─────────────────────────────────────────────────────────────────────────────

async function main() {
  console.log("═".repeat(80));
  console.log("REFACTOR §4.2 INTERNE UREN — scenario- en fase-aware");
  console.log("═".repeat(80));
  console.log(`Sessie: ${SESSION_ID}`);
  console.log(`Mode:   ${APPLY ? "APPLY (schrijven naar Supabase)" : "DRY RUN"}`);
  console.log();

  const { data, error } = await supa
    .from("din_sessions")
    .select("data")
    .eq("id", SESSION_ID)
    .maybeSingle();
  if (error || !data) {
    console.error(error?.message ?? "session not found");
    process.exit(1);
  }
  const sess = data.data as Record<string, unknown>;
  const wiz = sess.crossAnalyseWizard as
    | { stepResults?: Record<string, Record<string, unknown>> }
    | undefined;
  const stap4 = wiz?.stepResults?.stap4 as Record<string, unknown> | undefined;
  if (!stap4) {
    console.error("Geen stap4 in deze sessie.");
    process.exit(1);
  }

  const stap7 = stap4.stap7InterneUren as
    | {
        scenarios?: Record<string, ScenarioBlok | null>;
        uurtariefSettings?: { basisTarief: number; referentiejaar: number; indexatiePercentage: number };
        vastgesteldeUrenPerInspanning?: VastgesteldeInspanning[];
      }
    | undefined;
  if (!stap7?.scenarios) {
    console.error("Geen stap7InterneUren.scenarios in deze sessie.");
    process.exit(1);
  }
  const begroting = stap4.begrotingAdvies as
    | { scenarios?: Record<string, BegrotingScenario | null>; startJaar?: number }
    | undefined;
  if (!begroting?.scenarios) {
    console.error("Geen begrotingAdvies.scenarios in deze sessie.");
    process.exit(1);
  }

  const tarief = stap7.uurtariefSettings ?? { basisTarief: 70, referentiejaar: 2025, indexatiePercentage: 0.05 };
  const startJaar = begroting.startJaar ?? 2026;

  // Index vastgestelde uren per domein
  const vastgesteldMap: Record<DomeinKey, VastgesteldeInspanning | undefined> = {
    data_systemen: undefined,
    mens: undefined,
    cultuur: undefined,
    processen: undefined,
  };
  for (const i of stap7.vastgesteldeUrenPerInspanning ?? []) {
    vastgesteldMap[i.domein as DomeinKey] = i;
  }

  // Diagnostiek: per-domein basis-totaal
  console.log("Per-domein basis (uit vastgesteldeUrenPerInspanning):");
  for (const d of ["data_systemen", "mens", "cultuur", "processen"] as DomeinKey[]) {
    const insp = vastgesteldMap[d];
    if (!insp) continue;
    const tot = insp.rollen.reduce((s, r) => s + r.urenTotaal, 0);
    console.log(`  ${d.padEnd(15)} → ${tot.toLocaleString("nl-NL")} u (${insp.rollen.length} rollen)`);
  }
  console.log();

  const nieuweScenarios: Record<string, ScenarioBlok | null> = { ...stap7.scenarios };
  const scenarioKeys: ScenarioKey[] = ["advies", "plus20", "optimaal", "min20"];

  for (const skey of scenarioKeys) {
    const oudScen = stap7.scenarios[skey] ?? undefined;
    const begrotScen = begroting.scenarios[skey];
    if (!oudScen || !begrotScen) {
      console.log(`▌ ${skey.toUpperCase()} — overgeslagen (ontbrekende data)`);
      continue;
    }

    const nieuw = bouwScenarioOpnieuw(
      skey,
      {
        vastgesteldeUren: vastgesteldMap,
        begrotingScenario: begrotScen,
        basistarief: tarief.basisTarief,
        refjaar: tarief.referentiejaar,
        indexpct: tarief.indexatiePercentage,
        startJaar,
      },
      oudScen,
    );
    nieuweScenarios[skey] = nieuw;

    // ─────────────────────────────────────────────────────────
    // Vergelijking print
    // ─────────────────────────────────────────────────────────
    console.log("─".repeat(80));
    console.log(`▌ ${skey.toUpperCase()}  (${nieuw.aantalJaren} jaar)`);
    console.log("─".repeat(80));

    // OOP-fase per CRM-jaar (data_systemen) ter referentie
    const crmFases = begrotScen.inspanningen?.find((i) => i.domein === "data_systemen")?.verdelingPerJaar ?? [];
    if (crmFases.length) {
      console.log(`  CRM OOP-fase per jaar:`);
      for (const f of crmFases) {
        console.log(`    ${f.jaar}: ${f.fase}`);
      }
    }

    // Oud vs nieuw uren-curve per jaar
    console.log();
    console.log(`  Uren-curve per jaar (oud → nieuw):`);
    const alleJaren = Array.from(
      new Set([
        ...(oudScen.totalenPerJaar?.map((t) => t.jaar) ?? []),
        ...(nieuw.totalenPerJaar?.map((t) => t.jaar) ?? []),
      ]),
    ).sort((a, b) => a - b);
    for (const jaar of alleJaren) {
      const oud = oudScen.totalenPerJaar?.find((t) => t.jaar === jaar)?.uren ?? 0;
      const n = nieuw.totalenPerJaar?.find((t) => t.jaar === jaar)?.uren ?? 0;
      const delta = n - oud;
      const sign = delta >= 0 ? "+" : "";
      console.log(`    ${jaar}: ${oud.toString().padStart(5)} → ${n.toString().padStart(5)}  (${sign}${delta} u)`);
    }

    // Scenario totaal
    console.log();
    console.log(
      `  Scenario-totaal:  ${(oudScen.totaalUren ?? 0).toLocaleString("nl-NL")} u → ${(nieuw.totaalUren ?? 0).toLocaleString("nl-NL")} u  ` +
        `(€ ${(oudScen.totaalKosten ?? 0).toLocaleString("nl-NL")} → € ${(nieuw.totaalKosten ?? 0).toLocaleString("nl-NL")})`,
    );

    // J1-cap verificatie
    const cap = getJ1Cap(skey);
    const j1Uren = nieuw.totalenPerJaar?.find((t) => t.jaar === startJaar)?.uren ?? 0;
    const capStatus = j1Uren <= cap ? "OK" : "OVERSCHREDEN";
    console.log(`  J1-cap (${cap} u): ${j1Uren} u → ${capStatus}`);

    // Per-domein per jaar
    console.log();
    console.log(`  Per-domein × jaar (nieuw, alleen domeinen-totalen):`);
    for (const d of nieuw.domeinen ?? []) {
      const oudD = oudScen.domeinen?.find((x) => x.domein === d.domein);
      console.log(
        `    [${d.domein}]  totaal: ${(oudD?.totaalUren ?? 0).toLocaleString("nl-NL")} → ${(d.totaalUren ?? 0).toLocaleString("nl-NL")} u`,
      );
      const cells = (d.jaren ?? [])
        .map((j) => {
          const oudJ = oudD?.jaren?.find((x) => x.jaar === j.jaar);
          const oudU = oudJ?.totaalUren ?? 0;
          const nU = j.totaalUren ?? 0;
          return `${j.jaar}: ${oudU}→${nU}`;
        })
        .join("  ");
      console.log(`        ${cells}`);
    }

    console.log();
  }

  // ─────────────────────────────────────────────────────────
  // Schrijf terug
  // ─────────────────────────────────────────────────────────
  if (APPLY) {
    console.log("═".repeat(80));
    console.log("SCHRIJVEN NAAR SUPABASE…");

    const newStap7 = { ...stap7, scenarios: nieuweScenarios };
    const newData = {
      ...sess,
      crossAnalyseWizard: {
        ...(sess.crossAnalyseWizard as object),
        stepResults: {
          ...(wiz?.stepResults ?? {}),
          stap4: {
            ...stap4,
            stap7InterneUren: newStap7,
          },
        },
      },
    };
    const { error: upErr } = await supa.from("din_sessions").update({ data: newData }).eq("id", SESSION_ID);
    if (upErr) {
      console.error("FOUT:", upErr.message);
      process.exit(1);
    }
    console.log("✓ Refactor opgeslagen in stap7InterneUren.scenarios.");
  } else {
    console.log("═".repeat(80));
    console.log("DRY RUN AFGEROND — er is NIETS naar Supabase geschreven.");
    console.log("Run met --apply om de refactor definitief te maken.");
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
