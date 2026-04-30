// ============================================================
// Pure derivers voor Stap 5 (Programmaorganisatie / RASCI)
// ============================================================
// Leid de programmaorganisatie (kerngroep + domeineigenaren) en de
// "Gezamenlijke" RASCI (4 secties) deterministisch af uit de cross-analyse.
//
// Bron van waarheid:
//   - session.crossAnalyseWizard.stepResults.stap1.batenPerSector
//   - session.crossAnalyseWizard.stepResults.stap2.vermogenGelijkenisGroepen
//   - session.crossAnalyseWizard.stepResults.stap4.subEffortAnalysis (met dossier)
//
// Belangrijk:
//   - Pure functies, geen side-effects, geen AI-roundtrip
//   - "Veilig in de data": derivers raken bestaande clusterRasci/itemRasci
//     NIET aan; alleen het nieuwe gezamenlijkeRasci-veld
//   - Sync-merge: handmatige overrides (bron === "manual") blijven staan;
//     alleen "derived"-cellen worden bij re-sync vervangen
// ============================================================

import { DOMAIN_LABELS } from "@/lib/types";
import type {
  DINSession,
  ProgrammaRol,
  Programmaorganisatie,
  GezamenlijkRasciItem,
  GezamenlijkeRasciSectie,
  RasciRij,
  RasciLetter,
  EffortDomain,
  SubEffortAdvies,
} from "@/lib/types";

// ============================================================
// Helpers
// ============================================================

const ROL_INSPANNINGSLEIDER = "Inspanningsleider";
const ROL_BATENEIGENAAR = "Bateneigenaar";
const ROL_STUURGROEP = "Stuurgroep";
const ROL_DOMEINEIGENAAR_PREFIX = "Domeineigenaar";

function generateRolId(): string {
  return typeof crypto !== "undefined" && "randomUUID" in crypto
    ? crypto.randomUUID()
    : `rol_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
}

function normName(s: string | undefined | null): string {
  return (s ?? "").toLowerCase().trim().replace(/\s+/g, " ");
}

// Eerste woord (voornaam) — voor cross-bundel dedup ("Yara" == "Yara( HR business partner)")
function firstNameKey(s: string | undefined | null): string {
  const n = normName(s);
  if (!n) return "";
  // Strip leading parens/brackets, dan eerste woord
  const m = n.replace(/^[(\[]/, "").match(/^[a-z]+/);
  return m ? m[0] : n;
}

function nonEmpty(s: string | undefined | null): boolean {
  return typeof s === "string" && s.trim().length > 0;
}

// Split een komma-lijst (collectief eigenaar) naar individuele strings.
// "Jasper, Bert Thijs, Leontine, Meryl" → 4 namen
// "het MT" → 1 rol
// "Manager Data & Technologie" → 1 rol
function splitEigenaarCollectief(raw: string): string[] {
  const s = raw.trim();
  if (!s) return [];
  if (!s.includes(",")) return [s];
  return s.split(",").map((x) => x.trim()).filter((x) => x.length > 0);
}

// Split een inspanningsleider-string. Detecteert "per sector" / "per regio" → 3 sector-rollen.
// "Procesconsultants ( per sector)" → ["Procesconsultant PO", "Procesconsultant VO", "Procesconsultant Zakelijk"]
// "Yara( HR business partner)" → ["Yara"] met functie "HR business partner"
// "Sven (SIO)" → ["Sven"] met functie "SIO"
function parseInspanningsleider(raw: string): { naam: string; functie: string }[] {
  const s = raw.trim();
  if (!s) return [];
  // Per-sector splitsing
  if (/per\s+sector/i.test(s) || /per\s+regio/i.test(s)) {
    const basis = s.replace(/\s*\(?\s*per\s+(sector|regio)\s*\)?/i, "").replace(/\s+/g, " ").trim();
    // Maak enkelvoud van "Procesconsultants" → "Procesconsultant"
    const enkelvoud = basis.replace(/s$/i, "");
    return [
      { naam: `${enkelvoud} PO`, functie: `${basis} (PO)` },
      { naam: `${enkelvoud} VO`, functie: `${basis} (VO)` },
      { naam: `${enkelvoud} Zakelijk`, functie: `${basis} (Zakelijk)` },
    ];
  }
  // Naam met functie tussen haakjes: "Yara (HR business partner)" → naam=Yara, functie=HR..
  const m = s.match(/^([^(]+?)\s*\(([^)]+)\)\s*$/);
  if (m) return [{ naam: m[1].trim(), functie: m[2].trim() }];
  return [{ naam: s, functie: "" }];
}

// ============================================================
// 1) Programmaorganisatie afleiden uit cross-analyse
// ============================================================

export type DerivedProgrammaorganisatieResult = {
  next: Programmaorganisatie;
  toegevoegdKerngroep: number;
  toegevoegdStuurgroep: number;
  toegevoegdBateneigenaren: number;
  toegevoegdKlankbordgroep: number;
  verwijderdDuplicaten: number;
  ongewijzigd: boolean;
};

/**
 * Vult programmaorganisatie deterministisch aan op basis van cross-analyse + DIN data.
 *
 * Strategie:
 *  - STUURGROEP ← `dossier.eigenaar` (collectief, gesplitst op komma's, "het MT" als 1 rol)
 *  - KERNGROEP — INSPANNINGSLEIDERS ← `dossier.inspanningsleider` (per-sector splitsen,
 *    voornaam-dedup zodat Yara 1 rol blijft over meerdere bundels)
 *  - KERNGROEP — BATENEIGENAREN ← `benefit.profiel.bateneigenaar` (per baat, naam-dedup)
 *  - DOMEINEIGENAREN-lijst ongewijzigd (handmatig)
 *  - OPDRACHTGEVER, PROGRAMMAMANAGER, KLANKBORDGROEP ongewijzigd
 *
 * Cross-deduplicatie: dezelfde persoon (naam) wordt nooit 2x toegevoegd over de buckets heen.
 * Domeineigenaar-duplicaten in kerngroep (oudere auto-fill bug) worden opgeschoond.
 */
export function deriveProgrammaorganisatie(
  session: DINSession,
  current: Programmaorganisatie
): DerivedProgrammaorganisatieResult {
  const subEffort = session.crossAnalyseWizard?.stepResults?.stap4?.subEffortAnalysis ?? [];
  const bundels = subEffort.filter(
    (s) => s.actie === "combineren" && s.dossier && (nonEmpty(s.dossier.eigenaar) || nonEmpty(s.dossier.inspanningsleider))
  );

  // Bestaande namen over ALLE buckets — voorkom dat dezelfde persoon 2x wordt toegevoegd
  const bestaandePersonen = new Set<string>();
  const allCurrent: ProgrammaRol[] = [
    ...(current.opdrachtgever ? [current.opdrachtgever] : []),
    ...(current.programmamanager ? [current.programmamanager] : []),
    ...(current.kerngroep ?? []),
    ...(current.stuurgroep ?? []),
    ...(current.domeineigenaren ?? []),
    ...(current.klankbordgroep ?? []),
  ];
  for (const r of allCurrent) {
    const naam = normName(r.naam);
    if (naam) bestaandePersonen.add(naam);
    const fn = firstNameKey(r.naam);
    if (fn) bestaandePersonen.add(`firstname:${fn}`);
  }

  // ---- 1) STUURGROEP uit dossier.eigenaar (collectief) ----
  // Filter PM uit eventuele bestaande stuurgroep — programmamanager hoort niet
  // formeel in de stuurgroep (geen stemrecht, eigen rol-bucket).
  // Directeur Cito en Directeur IV/IT BLIJVEN als ze er staan — die horen erin.
  const pmNaamNorm = normName(current.programmamanager?.naam);
  const pmFirstName = firstNameKey(current.programmamanager?.naam);
  const stuurgroepGefilterd = (current.stuurgroep ?? []).filter((r) => {
    const naam = normName(r.naam);
    const fn = firstNameKey(r.naam);
    if (pmNaamNorm && naam === pmNaamNorm) return false;
    if (pmFirstName && fn && fn === pmFirstName) return false;
    return true;
  });

  const stuurgroepKandidaten = new Set<string>();
  for (const s of bundels) {
    const raw = (s.dossier?.eigenaar ?? "").trim();
    if (!raw) continue;
    for (const naam of splitEigenaarCollectief(raw)) {
      // Filter "het MT" en collectieve aanduidingen — geen aparte rol
      const norm = normName(naam);
      if (norm === "het mt" || norm === "mt" || norm.startsWith("het management")) continue;
      stuurgroepKandidaten.add(naam);
    }
  }
  const huidigeStuurgroepNorm = new Set(
    stuurgroepGefilterd.map((r) => normName(r.naam) || normName(r.rol))
  );
  const huidigeStuurgroepFirstNames = new Set(
    stuurgroepGefilterd.map((r) => firstNameKey(r.naam)).filter(Boolean)
  );
  const nieuweStuurgroep: ProgrammaRol[] = [...stuurgroepGefilterd];
  let toegevoegdStuurgroep = 0;
  for (const naam of stuurgroepKandidaten) {
    const sleutel = normName(naam);
    const fnSleutel = firstNameKey(naam);
    if (huidigeStuurgroepNorm.has(sleutel)) continue;
    if (fnSleutel && huidigeStuurgroepFirstNames.has(fnSleutel)) continue;
    // Cross-bucket dedup: als deze persoon al opdrachtgever / PM / kerngroep / domein-eigenaar is — skip
    if (bestaandePersonen.has(sleutel)) continue;
    if (fnSleutel && bestaandePersonen.has(`firstname:${fnSleutel}`)) continue;
    nieuweStuurgroep.push({
      id: generateRolId(),
      rol: ROL_STUURGROEP,
      naam,
      functie: "Senior management — collectief eindverantwoordelijk",
      sector: "Programmabreed",
      mandaat: "Stuurgroep-lid: keurt majeure scope/budget/mijlpaal-wijzigingen goed",
      toelichting: "Afgeleid uit cross-analyse stap 4 (dossier.eigenaar collectief).",
    });
    toegevoegdStuurgroep++;
    bestaandePersonen.add(sleutel);
    if (fnSleutel) bestaandePersonen.add(`firstname:${fnSleutel}`);
  }

  // ---- 2) KERNGROEP — INSPANNINGSLEIDERS uit dossier.inspanningsleider ----
  // Dedup op voornaam-key zodat "Yara" en "Yara( HR business partner)" 1 rol worden
  type InspLeider = { naam: string; functie: string; bundels: string[] };
  const inspLeiderMap = new Map<string, InspLeider>();
  for (const s of bundels) {
    const raw = (s.dossier?.inspanningsleider ?? "").trim();
    if (!raw) continue;
    const domLabel = DOMAIN_LABELS[s.domein] ?? s.domein;
    for (const parsed of parseInspanningsleider(raw)) {
      const key = firstNameKey(parsed.naam) || normName(parsed.naam);
      const existing = inspLeiderMap.get(key);
      if (existing) {
        existing.bundels.push(domLabel);
        if (!existing.functie && parsed.functie) existing.functie = parsed.functie;
      } else {
        inspLeiderMap.set(key, { naam: parsed.naam, functie: parsed.functie, bundels: [domLabel] });
      }
    }
  }

  const nieuweKerngroep: ProgrammaRol[] = [...(current.kerngroep ?? [])];
  let toegevoegdKerngroep = 0;
  for (const [key, leider] of inspLeiderMap) {
    if (bestaandePersonen.has(`firstname:${key}`)) continue;
    if (bestaandePersonen.has(normName(leider.naam))) continue;
    const bundelsLabel = leider.bundels.join(" + ");
    nieuweKerngroep.push({
      id: generateRolId(),
      rol: ROL_INSPANNINGSLEIDER,
      naam: leider.naam,
      functie: leider.functie || `Trekt bundel${leider.bundels.length > 1 ? "s" : ""} ${bundelsLabel}`,
      sector: "",
      mandaat: `Trekt cross-sectorale bundel${leider.bundels.length > 1 ? "s" : ""}: ${bundelsLabel}`,
      toelichting: "Afgeleid uit cross-analyse stap 4 (dossier.inspanningsleider).",
    });
    toegevoegdKerngroep++;
    bestaandePersonen.add(`firstname:${key}`);
    bestaandePersonen.add(normName(leider.naam));
  }

  // ---- 3) KERNGROEP — BATENEIGENAREN uit benefit.profiel.bateneigenaar ----
  // Per unieke bateneigenaar 1 kerngroep-rol; toelichting noemt voor welke baten
  type BatenEig = { naam: string; baten: string[] };
  const batenEigMap = new Map<string, BatenEig>();
  for (const b of session.benefits ?? []) {
    const raw = (b.profiel?.bateneigenaar ?? "").trim();
    if (!raw) continue;
    const titel = b.title || b.description?.slice(0, 60) || "";
    const key = normName(raw);
    const existing = batenEigMap.get(key);
    if (existing) {
      if (titel) existing.baten.push(titel);
    } else {
      batenEigMap.set(key, { naam: raw, baten: titel ? [titel] : [] });
    }
  }

  let toegevoegdBateneigenaren = 0;
  for (const [key, eig] of batenEigMap) {
    if (bestaandePersonen.has(key)) continue;
    if (bestaandePersonen.has(`firstname:${firstNameKey(eig.naam)}`)) continue;
    const batenList = eig.baten.length > 0 ? eig.baten.slice(0, 3).join(" · ") + (eig.baten.length > 3 ? ` +${eig.baten.length - 3}` : "") : "";
    nieuweKerngroep.push({
      id: generateRolId(),
      rol: ROL_BATENEIGENAAR,
      naam: eig.naam,
      functie: "Eindverantwoordelijk batenrealisatie",
      sector: "",
      mandaat: `Bateneigenaar voor ${eig.baten.length} ba${eig.baten.length === 1 ? "at" : "ten"}`,
      toelichting: batenList ? `Baten: ${batenList}` : "",
    });
    toegevoegdBateneigenaren++;
    bestaandePersonen.add(key);
  }

  // ---- 4) Klankbordgroep — 3 lege klant-rollen (1 per sector) als bucket leeg is ----
  let toegevoegdKlankbordgroep = 0;
  let nieuweKlankbordgroep = current.klankbordgroep ?? [];
  if (nieuweKlankbordgroep.length === 0) {
    const sectoren: Array<{ sector: string; rolLabel: string }> = [
      { sector: "PO", rolLabel: "Klantvertegenwoordiger PO" },
      { sector: "VO", rolLabel: "Klantvertegenwoordiger VO" },
      { sector: "Zakelijk", rolLabel: "Klantvertegenwoordiger Zakelijk" },
    ];
    nieuweKlankbordgroep = sectoren.map((s) => ({
      id: generateRolId(),
      rol: s.rolLabel,
      naam: "",
      functie: `Externe klantvertegenwoordiger sector ${s.sector}`,
      sector: s.sector,
      mandaat: "Reflectie en advies — geen besluitvormingsmandaat",
      toelichting: "Vul de naam in van de klant die deze sector vertegenwoordigt.",
    }));
    toegevoegdKlankbordgroep = sectoren.length;
  }

  // ---- 5) Opschonen: verwijder Domeineigenaar-duplicaten in kerngroep ----
  // Als er een rol staat met rol-prefix "Domeineigenaar" in kerngroep EN dezelfde rol-label
  // in domeineigenaren-lijst → verwijder uit kerngroep.
  const domeineigenarenLabels = new Set(
    (current.domeineigenaren ?? [])
      .map((r) => normName(r.rol))
      .filter((s) => s.length > 0)
  );
  let verwijderdDuplicaten = 0;
  const opgeschoondKerngroep = nieuweKerngroep.filter((r) => {
    const rolNorm = normName(r.rol);
    if (rolNorm.startsWith("domeineigenaar") && domeineigenarenLabels.has(rolNorm)) {
      verwijderdDuplicaten++;
      return false;
    }
    return true;
  });

  const ongewijzigd =
    toegevoegdKerngroep === 0 &&
    toegevoegdStuurgroep === 0 &&
    toegevoegdBateneigenaren === 0 &&
    toegevoegdKlankbordgroep === 0 &&
    verwijderdDuplicaten === 0;

  const next: Programmaorganisatie = {
    ...current,
    kerngroep: opgeschoondKerngroep,
    stuurgroep: nieuweStuurgroep,
    klankbordgroep: nieuweKlankbordgroep,
    // domeineigenaren ongewijzigd — gebruiker beheert handmatig
  };

  return {
    next,
    toegevoegdKerngroep,
    toegevoegdStuurgroep,
    toegevoegdBateneigenaren,
    toegevoegdKlankbordgroep,
    verwijderdDuplicaten,
    ongewijzigd,
  };
}

// ============================================================
// 2) Gezamenlijke RASCI afleiden uit cross-analyse
// ============================================================

export type DeriveDiagnostiek = {
  sectie: GezamenlijkeRasciSectie;
  itemId: string;
  reden: string;
};

export type DerivedRasciResult = {
  items: GezamenlijkRasciItem[];
  diagnostiek: DeriveDiagnostiek[];
};

type RolLookup = {
  byId: Map<string, ProgrammaRol>;        // rolId → rol-record (voor sector/functie lookup)
  byNaam: Map<string, string>;            // norm naam → rolId
  byFirstName: Map<string, string>;       // voornaam-key → rolId (Yara-match)
  byRolLabel: Map<string, string>;        // norm rol-label → rolId
  opdrachtgeverId: string | null;
  programmamanagerId: string | null;
  domeineigenaarPerDomein: Map<EffortDomain, string>;
  // Domeineigenaren staan typisch in de aparte `domeineigenaren`-lijst, maar
  // kunnen ook in kerngroep zitten — we zoeken in álle rollen op rol-label.
  bateneigenaarIds: Set<string>;          // rol-records met rol = "Bateneigenaar"
  inspanningsleiderIds: Set<string>;      // rol-records met rol = "Inspanningsleider"
  stuurgroepIds: string[];
  kerngroepIds: string[];
  klankbordgroepIds: string[];
};

function buildRolLookup(po: Programmaorganisatie): RolLookup {
  const byId = new Map<string, ProgrammaRol>();
  const byNaam = new Map<string, string>();
  const byFirstName = new Map<string, string>();
  const byRolLabel = new Map<string, string>();
  const bateneigenaarIds = new Set<string>();
  const inspanningsleiderIds = new Set<string>();

  // first-write wint zodat eerder toegevoegde buckets (kerngroep) niet
  // worden overschreven door later toegevoegde (stuurgroep). Dit is cruciaal
  // voor inspanningsleider-matching: Yara staat én in kerngroep (Inspanningsleider)
  // én in stuurgroep (HR-manager). Bij RASCI gezamenlijke inspanningen krijgt
  // stuurgroep-Yara A, en kerngroep-Yara moet R krijgen — dus byNaam moet
  // de kerngroep-id behouden, niet de stuurgroep-id.
  const addRol = (r: ProgrammaRol | undefined) => {
    if (!r) return;
    byId.set(r.id, r);
    if (nonEmpty(r.naam)) {
      const k = normName(r.naam);
      if (!byNaam.has(k)) byNaam.set(k, r.id);
    }
    const fn = firstNameKey(r.naam);
    if (fn && !byFirstName.has(fn)) byFirstName.set(fn, r.id);
    if (nonEmpty(r.rol)) {
      const rk = normName(r.rol);
      if (!byRolLabel.has(rk)) byRolLabel.set(rk, r.id);
    }
    const rolNorm = normName(r.rol);
    if (rolNorm === normName(ROL_BATENEIGENAAR)) bateneigenaarIds.add(r.id);
    if (rolNorm === normName(ROL_INSPANNINGSLEIDER)) inspanningsleiderIds.add(r.id);
  };
  // Volgorde: kerngroep EERST, dan rest. Dit zorgt dat kerngroep-rollen
  // (Inspanningsleider) prevaleren in byNaam-lookup voor RASCI-matching.
  for (const r of po.kerngroep ?? []) addRol(r);
  addRol(po.opdrachtgever);
  addRol(po.programmamanager);
  for (const r of po.stuurgroep ?? []) addRol(r);
  for (const r of po.domeineigenaren ?? []) addRol(r);
  for (const r of po.klankbordgroep ?? []) addRol(r);

  // Zoek domeineigenaren in álle rollen op rol-label, niet alleen in
  // `domeineigenaren`-lijst (bestaande sessies hebben ze in kerngroep).
  const domeineigenaarPerDomein = new Map<EffortDomain, string>();
  const allRollen: ProgrammaRol[] = [
    ...(po.opdrachtgever ? [po.opdrachtgever] : []),
    ...(po.programmamanager ? [po.programmamanager] : []),
    ...(po.kerngroep ?? []),
    ...(po.stuurgroep ?? []),
    ...(po.domeineigenaren ?? []),
    ...(po.klankbordgroep ?? []),
  ];
  for (const r of allRollen) {
    const label = (r.rol ?? "").toLowerCase();
    if (!label.startsWith("domeineigenaar")) continue;
    if (label.includes("mens") && !domeineigenaarPerDomein.has("mens")) domeineigenaarPerDomein.set("mens", r.id);
    else if (label.includes("processen") && !domeineigenaarPerDomein.has("processen")) domeineigenaarPerDomein.set("processen", r.id);
    else if ((label.includes("data") || label.includes("systemen")) && !domeineigenaarPerDomein.has("data_systemen")) domeineigenaarPerDomein.set("data_systemen", r.id);
    else if (label.includes("cultuur") && !domeineigenaarPerDomein.has("cultuur")) domeineigenaarPerDomein.set("cultuur", r.id);
  }

  return {
    byId,
    byNaam,
    byFirstName,
    byRolLabel,
    opdrachtgeverId: po.opdrachtgever?.id ?? null,
    programmamanagerId: po.programmamanager?.id ?? null,
    domeineigenaarPerDomein,
    bateneigenaarIds,
    inspanningsleiderIds,
    stuurgroepIds: (po.stuurgroep ?? []).map((r) => r.id),
    kerngroepIds: (po.kerngroep ?? []).map((r) => r.id),
    klankbordgroepIds: (po.klankbordgroep ?? []).map((r) => r.id),
  };
}

function findRolByNaam(lookup: RolLookup, naam: string): string | null {
  const key = normName(naam);
  if (!key) return null;
  // Eerst exacte match
  const exact = lookup.byNaam.get(key);
  if (exact) return exact;
  // Fallback: voornaam-key (matcht "Yara" met "Yara( HR business partner)")
  const fn = firstNameKey(naam);
  if (fn) return lookup.byFirstName.get(fn) ?? null;
  return null;
}

function derivedRij(rolId: string, letter: RasciLetter): RasciRij {
  return { rolId, letter, bron: "derived" };
}

/**
 * Verzamel inspanningsleider-ids per sector uit de cross-analyse.
 * Voor elke betrokken sector binnen een subEffort (via vermogenImpact) telt de
 * inspanningsleider als sectortrekker.
 */
function buildSectortrekkerIndex(
  subEffort: SubEffortAdvies[],
  lookup: RolLookup
): Map<string, Set<string>> {
  // sectorId → Set<rolId>
  const out = new Map<string, Set<string>>();
  for (const s of subEffort) {
    const naam = (s.dossier?.inspanningsleider ?? "").trim();
    if (!naam) continue;
    const rolId = findRolByNaam(lookup, naam);
    if (!rolId) continue;
    const sectoren = new Set<string>(
      (s.vermogenImpact ?? []).map((v) => v.sectorId).filter(nonEmpty)
    );
    for (const sec of sectoren) {
      if (!out.has(sec)) out.set(sec, new Set());
      out.get(sec)!.add(rolId);
    }
  }
  return out;
}

/**
 * Mode #1: Sector-baten — per sector × baat een rij.
 */
function deriveSectorBaten(
  session: DINSession,
  lookup: RolLookup,
  sectortrekker: Map<string, Set<string>>,
  diagnostiek: DeriveDiagnostiek[]
): GezamenlijkRasciItem[] {
  const stap1 = session.crossAnalyseWizard?.stepResults?.stap1;
  if (!stap1) return [];

  // Lookup bateneigenaar per baat-titel
  const bateneigenaarByTitel = new Map<string, string>();
  for (const b of session.benefits ?? []) {
    const titel = (b.title || b.description || "").trim();
    const eig = (b.profiel?.bateneigenaar ?? "").trim();
    if (titel && eig) bateneigenaarByTitel.set(normName(titel), eig);
  }

  const out: GezamenlijkRasciItem[] = [];
  for (const sectorBlock of stap1.batenPerSector ?? []) {
    const sectorId = sectorBlock.sector;
    for (const baat of sectorBlock.baten ?? []) {
      const titel = baat.titel;
      const itemId = `bs:${sectorId}:${titel}`;
      const rijen: RasciRij[] = [];
      const usedIds = new Set<string>();

      // A: bateneigenaar — zoek match. Fallback: opdrachtgever (Cito-realiteit:
      // als bateneigenaar = "Commercieel Manager" valt dit samen met opdrachtgever).
      const eigNaam = bateneigenaarByTitel.get(normName(titel));
      let aId: string | null = null;
      if (eigNaam) aId = findRolByNaam(lookup, eigNaam);
      if (!aId && lookup.opdrachtgeverId) aId = lookup.opdrachtgeverId;
      if (aId) {
        rijen.push(derivedRij(aId, "A"));
        usedIds.add(aId);
      } else if (eigNaam) {
        diagnostiek.push({ sectie: "sector_baten", itemId, reden: `Bateneigenaar "${eigNaam}" niet in programmaorganisatie` });
      }

      // R: sectortrekkers van die sector (inspanningsleiders die deze sector raken)
      const trekkers = sectortrekker.get(sectorId);
      if (trekkers) {
        for (const rolId of trekkers) {
          if (!usedIds.has(rolId)) {
            rijen.push(derivedRij(rolId, "R"));
            usedIds.add(rolId);
          }
        }
      }
      // Aanvulling: stuurgroep-leden met sector === sectorId krijgen R (sectormanager
      // is verantwoordelijk dat er in de operatie iets mee wordt gedaan)
      for (const id of lookup.stuurgroepIds) {
        const rol = lookup.byId.get(id);
        if (!rol) continue;
        if ((rol.sector ?? "").trim().toUpperCase() === sectorId.toUpperCase() && !usedIds.has(id)) {
          rijen.push(derivedRij(id, "R"));
          usedIds.add(id);
        }
      }

      // C: programmamanager
      if (lookup.programmamanagerId && !usedIds.has(lookup.programmamanagerId)) {
        rijen.push(derivedRij(lookup.programmamanagerId, "C"));
        usedIds.add(lookup.programmamanagerId);
      }

      // I: stuurgroep + klant uit klankbordgroep van die sector
      for (const id of lookup.stuurgroepIds) {
        if (!usedIds.has(id)) {
          rijen.push(derivedRij(id, "I"));
          usedIds.add(id);
        }
      }
      for (const id of lookup.klankbordgroepIds) {
        const rol = lookup.byId.get(id);
        if (!rol) continue;
        if ((rol.sector ?? "").trim().toUpperCase() === sectorId.toUpperCase() && !usedIds.has(id)) {
          rijen.push(derivedRij(id, "I"));
          usedIds.add(id);
        }
      }

      out.push({
        sectie: "sector_baten",
        itemId,
        itemTitel: `${sectorId}: ${titel}`,
        meta: { sector: sectorId, doelNaam: baat.doelNaam ?? "" },
        rijen,
        toelichting: "",
      });
    }
  }
  return out;
}

/**
 * Mode #2: Gezamenlijke vermogens — per VermogenGelijkenisGroep een rij.
 */
function deriveGezamenlijkeVermogens(
  session: DINSession,
  lookup: RolLookup,
  diagnostiek: DeriveDiagnostiek[]
): GezamenlijkRasciItem[] {
  const groepen = session.crossAnalyseWizard?.stepResults?.stap2?.vermogenGelijkenisGroepen ?? [];
  const subEffort = session.crossAnalyseWizard?.stepResults?.stap4?.subEffortAnalysis ?? [];
  if (groepen.length === 0) return [];

  const out: GezamenlijkRasciItem[] = [];
  for (const groep of groepen) {
    const itemId = groep.id;

    // Welke sub-efforts horen bij deze groep?
    const subsForGroep = subEffort.filter((s) => s.groepId === groep.id);

    // Meest voorkomende domein binnen deze groep
    const domCounter = new Map<EffortDomain, number>();
    for (const s of subsForGroep) {
      domCounter.set(s.domein, (domCounter.get(s.domein) ?? 0) + 1);
    }
    let topDom: EffortDomain | null = null;
    let topCount = 0;
    for (const [d, c] of domCounter) {
      if (c > topCount) { topDom = d; topCount = c; }
    }

    const rijen: RasciRij[] = [];
    const usedIds = new Set<string>();

    // A: domeineigenaar van het overheersende domein
    const aRolId = topDom ? lookup.domeineigenaarPerDomein.get(topDom) ?? null : null;
    if (aRolId) {
      rijen.push(derivedRij(aRolId, "A"));
      usedIds.add(aRolId);
    } else if (topDom) {
      diagnostiek.push({ sectie: "gezamenlijke_vermogens", itemId, reden: `Geen domeineigenaar voor domein "${DOMAIN_LABELS[topDom] ?? topDom}"` });
    }

    // R: inspanningsleider(s) van bijbehorende subEfforts (uniek, na voornaam-dedup
    // matchen meerdere "Procesconsultant per sector"-items met aparte rol-records)
    for (const s of subsForGroep) {
      const leiderRaw = (s.dossier?.inspanningsleider ?? "").trim();
      if (!leiderRaw) continue;
      for (const l of parseInspanningsleider(leiderRaw)) {
        const id = findRolByNaam(lookup, l.naam);
        if (id && !usedIds.has(id)) {
          rijen.push(derivedRij(id, "R"));
          usedIds.add(id);
        }
      }
    }

    // S: programmamanager (hands-on betrokken)
    if (lookup.programmamanagerId && !usedIds.has(lookup.programmamanagerId)) {
      rijen.push(derivedRij(lookup.programmamanagerId, "S"));
      usedIds.add(lookup.programmamanagerId);
    }

    // I: stuurgroep + klankbordgroep (geïnformeerd via rapportage)
    for (const id of lookup.stuurgroepIds) {
      if (!usedIds.has(id)) {
        rijen.push(derivedRij(id, "I"));
        usedIds.add(id);
      }
    }
    for (const id of lookup.klankbordgroepIds) {
      if (!usedIds.has(id)) {
        rijen.push(derivedRij(id, "I"));
        usedIds.add(id);
      }
    }

    out.push({
      sectie: "gezamenlijke_vermogens",
      itemId,
      itemTitel: groep.gezamenlijkeOmschrijving,
      meta: { reden: groep.reden ?? "", domein: topDom ?? "" },
      rijen,
      toelichting: "",
    });
  }
  return out;
}

/**
 * Mode #3: Gezamenlijke inspanningen — per subEffortAnalysis-item met dossier.
 */
function deriveGezamenlijkeInspanningen(
  session: DINSession,
  lookup: RolLookup,
  diagnostiek: DeriveDiagnostiek[]
): GezamenlijkRasciItem[] {
  const subEffort = session.crossAnalyseWizard?.stepResults?.stap4?.subEffortAnalysis ?? [];
  // Filter: alleen `actie === "combineren"` — dezelfde filter die planning/begroting/uren
  // gebruiken (StapOptimaliseren.tsx:712). Dit zijn de daadwerkelijke cross-sectorale
  // bundels (typisch ~4, 1 per domein); de `apart_houden`-entries zijn geen gezamenlijke
  // inspanningen en horen niet in de RASCI-matrix.
  const bundels = subEffort.filter(
    (s) => s.actie === "combineren" && s.dossier && (nonEmpty(s.dossier.eigenaar) || nonEmpty(s.dossier.inspanningsleider))
  );
  // Dedup per domein: als er meerdere bundels per domein zijn (meerdere VermogenGelijkenisGroepen
  // die op hetzelfde domein combineren), pak die met meest complete dossier per domein.
  const perDomein = new Map<string, typeof bundels[number]>();
  for (const b of bundels) {
    const huidig = perDomein.get(b.domein);
    if (!huidig) {
      perDomein.set(b.domein, b);
      continue;
    }
    // Pak die met beide eigenaar+inspanningsleider boven slechts één van de twee
    const huidigVol = nonEmpty(huidig.dossier?.eigenaar) && nonEmpty(huidig.dossier?.inspanningsleider);
    const nieuwVol = nonEmpty(b.dossier?.eigenaar) && nonEmpty(b.dossier?.inspanningsleider);
    if (nieuwVol && !huidigVol) perDomein.set(b.domein, b);
  }
  const itemsMetDossier = Array.from(perDomein.values());

  const out: GezamenlijkRasciItem[] = [];
  for (const s of itemsMetDossier) {
    const itemId = `${s.groepId}:${s.domein}`;
    const titel = s.titel || s.voorgesteldeNaam || `${DOMAIN_LABELS[s.domein] ?? s.domein} bundel`;
    const rijen: RasciRij[] = [];
    const usedIds = new Set<string>();

    // A: OPDRACHTGEVER + STUURGROEP COLLECTIEF — samen eindverantwoordelijk
    // Opdrachtgever (Commercieel Manager / bateneigenaar) krijgt A op gezamenlijke
    // inspanningen omdat zij ook eindverantwoordelijk is voor batenrealisatie.
    // Stuurgroep-leden krijgen óók A (collectief). Meerdere A's geldt hier als 1
    // collectieve A — voor "gezamenlijke_inspanningen" sectie wordt dit niet als
    // RASCI-overtreding gezien (zie validateGezamenlijkeRasci).
    const eigNaam = (s.dossier?.eigenaar ?? "").trim();
    if (lookup.opdrachtgeverId && !usedIds.has(lookup.opdrachtgeverId)) {
      rijen.push(derivedRij(lookup.opdrachtgeverId, "A"));
      usedIds.add(lookup.opdrachtgeverId);
    }
    if (lookup.stuurgroepIds.length > 0) {
      for (const id of lookup.stuurgroepIds) {
        if (!usedIds.has(id)) {
          rijen.push(derivedRij(id, "A"));
          usedIds.add(id);
        }
      }
    } else if (!lookup.opdrachtgeverId) {
      // Fallback alleen als geen opdrachtgever én geen stuurgroep
      if (eigNaam) {
        const aId = findRolByNaam(lookup, eigNaam);
        if (aId) {
          rijen.push(derivedRij(aId, "A"));
          usedIds.add(aId);
        } else {
          diagnostiek.push({ sectie: "gezamenlijke_inspanningen", itemId, reden: `Geen opdrachtgever / stuurgroep — vul eerst programmaorganisatie` });
        }
      } else if (lookup.domeineigenaarPerDomein.get(s.domein)) {
        const id = lookup.domeineigenaarPerDomein.get(s.domein)!;
        rijen.push(derivedRij(id, "A"));
        usedIds.add(id);
      }
    }

    // R: dossier.inspanningsleider — kan meerdere personen zijn (Procesconsultants per sector)
    // Vind alle rollen die matchen op voornaam-key (parseInspanningsleider levert ze al gesplitst op)
    const leiderRaw = (s.dossier?.inspanningsleider ?? "").trim();
    if (leiderRaw) {
      const leiders = parseInspanningsleider(leiderRaw);
      let matched = 0;
      for (const l of leiders) {
        const rId = findRolByNaam(lookup, l.naam);
        if (rId && !usedIds.has(rId)) {
          rijen.push(derivedRij(rId, "R"));
          usedIds.add(rId);
          matched++;
        }
      }
      if (matched === 0) {
        diagnostiek.push({ sectie: "gezamenlijke_inspanningen", itemId, reden: `Inspanningsleider "${leiderRaw}" niet in programmaorganisatie` });
      }
    }

    // S: domeineigenaar van het domein (Support — bewaakt samenhang)
    const domeineigenaarId = lookup.domeineigenaarPerDomein.get(s.domein);
    if (domeineigenaarId && !usedIds.has(domeineigenaarId)) {
      rijen.push(derivedRij(domeineigenaarId, "S"));
      usedIds.add(domeineigenaarId);
    }

    // S: programmamanager (hands-on betrokken bij uitvoering, niet alleen consult)
    if (lookup.programmamanagerId && !usedIds.has(lookup.programmamanagerId)) {
      rijen.push(derivedRij(lookup.programmamanagerId, "S"));
      usedIds.add(lookup.programmamanagerId);
    }

    // (Opdrachtgever heeft al A — niet extra C)

    // I: klankbordgroep (geïnformeerd, geen mandaat)
    for (const id of lookup.klankbordgroepIds) {
      if (!usedIds.has(id)) {
        rijen.push(derivedRij(id, "I"));
        usedIds.add(id);
      }
    }

    out.push({
      sectie: "gezamenlijke_inspanningen",
      itemId,
      itemTitel: titel,
      meta: {
        domein: s.domein,
        actie: s.actie,
        eigenaarNaam: eigNaam,
        inspanningsleiderNaam: leiderRaw,
      },
      rijen,
      toelichting: s.beargumentatie || s.beschrijving || s.reden || "",
    });
  }
  return out;
}

/**
 * Mode #4: Programmagovernance — vaste 4 rijen.
 */
function deriveProgrammagovernance(lookup: RolLookup): GezamenlijkRasciItem[] {
  type GovRow = { itemId: string; titel: string; aId: string | null; rIds: (string | null)[]; cIds: (string | null)[]; iIds: (string | null)[] };

  // Voor Baten-review: sectormanagers zijn stuurgroep-leden met sector-veld gevuld
  const sectormanagerIds = lookup.stuurgroepIds.filter((id) => {
    const r = lookup.byId.get(id);
    return r && nonEmpty(r.sector) && (r.sector ?? "").toLowerCase() !== "programmabreed";
  });

  const rows: GovRow[] = [
    {
      itemId: "gov:besluitvorming",
      titel: "Besluitvorming go/no-go (scope, budget, mijlpalen)",
      aId: lookup.opdrachtgeverId,
      rIds: [lookup.programmamanagerId],
      cIds: lookup.stuurgroepIds,
      iIds: [...lookup.kerngroepIds, ...lookup.klankbordgroepIds],
    },
    {
      itemId: "gov:rapportage",
      titel: "Voortgangsrapportage (kwartaal)",
      aId: lookup.programmamanagerId,
      rIds: [...Array.from(lookup.domeineigenaarPerDomein.values()), ...lookup.inspanningsleiderIds],
      cIds: [lookup.opdrachtgeverId],
      iIds: [...lookup.stuurgroepIds, ...lookup.klankbordgroepIds],
    },
    {
      itemId: "gov:escalatie",
      titel: "Risico-escalatie en herijking",
      aId: lookup.programmamanagerId,
      rIds: Array.from(lookup.domeineigenaarPerDomein.values()),
      cIds: [lookup.opdrachtgeverId],
      iIds: lookup.stuurgroepIds,
    },
    {
      itemId: "gov:baten_review",
      titel: "Baten-realisatie review",
      aId: lookup.opdrachtgeverId,
      rIds: [lookup.programmamanagerId],
      cIds: sectormanagerIds.length > 0 ? sectormanagerIds : Array.from(lookup.domeineigenaarPerDomein.values()),
      iIds: [...lookup.stuurgroepIds, ...lookup.klankbordgroepIds],
    },
  ];

  return rows.map((row) => {
    const rijen: RasciRij[] = [];
    const used = new Set<string>();
    if (row.aId) {
      rijen.push(derivedRij(row.aId, "A"));
      used.add(row.aId);
    }
    for (const id of row.rIds) {
      if (id && !used.has(id)) {
        rijen.push(derivedRij(id, "R"));
        used.add(id);
      }
    }
    for (const id of row.cIds) {
      if (id && !used.has(id)) {
        rijen.push(derivedRij(id, "C"));
        used.add(id);
      }
    }
    for (const id of row.iIds) {
      if (id && !used.has(id)) {
        rijen.push(derivedRij(id, "I"));
        used.add(id);
      }
    }
    return {
      sectie: "programmagovernance" as const,
      itemId: row.itemId,
      itemTitel: row.titel,
      meta: {},
      rijen,
      toelichting: "",
    };
  });
}

/**
 * Hoofd-deriver: produceert alle 4 secties.
 */
export function deriveGezamenlijkeRasci(session: DINSession): DerivedRasciResult {
  const po = session.programmaorganisatie;
  const diagnostiek: DeriveDiagnostiek[] = [];

  if (!po) {
    return { items: [], diagnostiek: [{ sectie: "programmagovernance", itemId: "n/a", reden: "Geen programmaorganisatie gedefinieerd" }] };
  }

  const lookup = buildRolLookup(po);
  const subEffort = session.crossAnalyseWizard?.stepResults?.stap4?.subEffortAnalysis ?? [];
  const sectortrekker = buildSectortrekkerIndex(subEffort, lookup);

  const items: GezamenlijkRasciItem[] = [
    ...deriveSectorBaten(session, lookup, sectortrekker, diagnostiek),
    ...deriveGezamenlijkeVermogens(session, lookup, diagnostiek),
    ...deriveGezamenlijkeInspanningen(session, lookup, diagnostiek),
    ...deriveProgrammagovernance(lookup),
  ];

  return { items, diagnostiek };
}

// ============================================================
// 3) Sync-merge — handmatige overrides bewaren
// ============================================================

/**
 * Merge nieuw afgeleide items met bestaande items.
 *
 * Per item (op basis van sectie+itemId):
 *   - bestaande rij met bron === "manual" → behouden, derived versie negeren
 *   - bestaande rij met bron !== "manual" (derived of legacy) → vervangen door derived
 *   - nieuwe derived rij die niet bestond → toevoegen
 *
 * Items die er nu wel zijn maar in derived ontbreken → verwijderen tenzij ALLE rijen manual zijn.
 *
 * Toelichting per item: bestaande wint als niet-leeg.
 */
export function mergeGezamenlijkeRasci(
  bestaand: GezamenlijkRasciItem[],
  nieuwAfgeleid: GezamenlijkRasciItem[]
): GezamenlijkRasciItem[] {
  const key = (i: GezamenlijkRasciItem) => `${i.sectie}::${i.itemId}`;
  const bestaandMap = new Map(bestaand.map((i) => [key(i), i] as const));
  const nieuwMap = new Map(nieuwAfgeleid.map((i) => [key(i), i] as const));

  const out: GezamenlijkRasciItem[] = [];

  // 1) Loop nieuw afgeleide items
  for (const nieuw of nieuwAfgeleid) {
    const k = key(nieuw);
    const oud = bestaandMap.get(k);
    if (!oud) {
      out.push(nieuw);
      continue;
    }
    // Merge: behoud manual-rijen uit oud; vervang derived/legacy door nieuwe derived.
    const manualOud = (oud.rijen ?? []).filter((r) => r.bron === "manual");
    const manualRolIds = new Set(manualOud.map((r) => r.rolId));
    const nieuwDerived = (nieuw.rijen ?? []).filter((r) => !manualRolIds.has(r.rolId));
    out.push({
      ...nieuw,
      // Manual eerst (zichtbare voorrang), dan derived
      rijen: [...manualOud, ...nieuwDerived],
      toelichting: oud.toelichting && oud.toelichting.trim().length > 0 ? oud.toelichting : nieuw.toelichting,
    });
  }

  // 2) Items die in bestaand zijn maar niet meer afgeleid:
  //    - als ALLE rijen manual zijn → behouden (gebruiker heeft handmatig opgevoerd)
  //    - anders verwijderen
  for (const oud of bestaand) {
    const k = key(oud);
    if (nieuwMap.has(k)) continue;
    const allManual = (oud.rijen ?? []).every((r) => r.bron === "manual");
    if (allManual && (oud.rijen ?? []).length > 0) {
      out.push(oud);
    }
  }

  return out;
}

// ============================================================
// 4) Cell-update helpers
// ============================================================

/**
 * Wijzig of verwijder de letter voor een specifieke (item, rolId) combinatie.
 * Door gebruiker veroorzaakte wijzigingen krijgen automatisch bron === "manual".
 */
export function setGezamenlijkRasciCell(
  items: GezamenlijkRasciItem[],
  sectie: GezamenlijkeRasciSectie,
  itemId: string,
  rolId: string,
  letter: RasciLetter | null
): GezamenlijkRasciItem[] {
  return items.map((item) => {
    if (item.sectie !== sectie || item.itemId !== itemId) return item;
    let nextRijen = (item.rijen ?? []).filter((r) => r.rolId !== rolId);
    if (letter !== null) {
      nextRijen = [...nextRijen, { rolId, letter, bron: "manual" }];
    }
    return { ...item, rijen: nextRijen };
  });
}

/**
 * Tel A-cellen per rol over alle items — voor overload-check (>4 = waarschuwing).
 */
export function computeRolOverloadGezamenlijk(
  items: GezamenlijkRasciItem[]
): Map<string, number> {
  const counts = new Map<string, number>();
  for (const item of items) {
    for (const rij of item.rijen ?? []) {
      if (rij.letter === "A") {
        counts.set(rij.rolId, (counts.get(rij.rolId) ?? 0) + 1);
      }
    }
  }
  return counts;
}

// ============================================================
// 5) Validatie — RASCI regels per rij
// ============================================================

export type RasciRijProbleem = {
  itemId: string;
  sectie: GezamenlijkeRasciSectie;
  reden: "geen_a" | "meerdere_a" | "geen_r";
};

export function validateGezamenlijkeRasci(items: GezamenlijkRasciItem[]): RasciRijProbleem[] {
  const out: RasciRijProbleem[] = [];
  for (const item of items) {
    const aCount = (item.rijen ?? []).filter((r) => r.letter === "A").length;
    const rCount = (item.rijen ?? []).filter((r) => r.letter === "R").length;
    if (aCount === 0) out.push({ itemId: item.itemId, sectie: item.sectie, reden: "geen_a" });
    // Voor "gezamenlijke_inspanningen" is meerdere A toegestaan (stuurgroep collectief).
    // Voor andere secties geldt nog steeds "exact 1 A".
    else if (aCount > 1 && item.sectie !== "gezamenlijke_inspanningen") {
      out.push({ itemId: item.itemId, sectie: item.sectie, reden: "meerdere_a" });
    }
    if (rCount === 0) out.push({ itemId: item.itemId, sectie: item.sectie, reden: "geen_r" });
  }
  return out;
}

// ============================================================
// 6) Sectie-meta voor UI
// ============================================================

export const SECTIE_LABELS: Record<GezamenlijkeRasciSectie, string> = {
  sector_baten: "Sector-baten",
  gezamenlijke_vermogens: "Gezamenlijke vermogens",
  gezamenlijke_inspanningen: "Gezamenlijke inspanningen",
  programmagovernance: "Programmagovernance",
};

export const SECTIE_TOELICHTING: Record<GezamenlijkeRasciSectie, string> = {
  sector_baten: "Per sector × baat (uit cross-analyse stap 1) — A = bateneigenaar, R = sectortrekker",
  gezamenlijke_vermogens: "Per drieluik-vermogen (uit cross-analyse stap 2) — A = domeineigenaar dominant domein",
  gezamenlijke_inspanningen: "Per cross-sectorale bundel (uit cross-analyse stap 4) — A/R direct uit dossier",
  programmagovernance: "Programmaritueel — besluitvorming, rapportage, escalatie, baten-realisatie",
};

export const SECTIE_VOLGORDE: GezamenlijkeRasciSectie[] = [
  "sector_baten",
  "gezamenlijke_vermogens",
  "gezamenlijke_inspanningen",
  "programmagovernance",
];
