// Stap 12 — Bronnenanalyse: pure functies (geen React, geen fetch) en de API-contracttypes
// die de routes (plan 2A) en de UI (plan 2B) delen.
// Let op: dit bestand mag NIET uit din-service importeren (din-service importeert hieruit).

import type {
  Bron,
  BronAnalyse,
  BronnenAnalyse,
  BronStatus,
  BronType,
  DINSession,
  EffortDomain,
  GeelPunt,
  NogNodigItem,
} from "@/lib/schemas";
import { GEEL_PUNTEN, TE_BEPALEN, mergeBronnenAnalyse } from "@/lib/bronnenanalyse-default";

// --- Grenzen -------------------------------------------------------------

export const CITAAT_MAX = 300;
export const SAMENVATTING_MAX = 600;
export const OPEN_PUNTEN_MAX = 3;
/** Maximale lengte van de geparste brontekst (parse-route). */
export const BRONTEKST_MAX = 200_000;
/** Maximale lengte van de tekst die naar de AI gaat. */
export const AI_TEKST_MAX = 30_000;

/** Bron-label voor gaten in de dekking. */
export const GAT_IN_DEKKING_BRON = "Gat in dekking — bronnenanalyse";

// --- API-contracttypes (gedeeld door routes en UI) -----------------------

export type ParseFoutCode = "geen_invoer" | "onbekend_type" | "te_groot" | "url_niet_toegestaan" | "parse_fout";

export type ParseBronResponse =
  | { success: true; rawText: string; tekens: number; afgekapt: boolean; type: BronType }
  | { success: false; error: string; code: ParseFoutCode };

export type AnalyseerBronRequest = {
  bron: { id: string; titel: string; bestandsnaam: string; type: BronType; datum: string };
  tekst: string;
  werkstromen: { id: string; naam: string; landtIn?: string }[];
};

export type AnalyseFoutCode = "geen_api_key" | "ongeldige_invoer" | "ai_fout";

export type AnalyseerBronResponse =
  | { success: true; analyse: BronAnalyse }
  | { success: false; error: string; code: AnalyseFoutCode };

export type WachtrijStatus = "wacht" | "bezig" | "klaar" | "fout";

export type WachtrijItem = { bronId: string; status: WachtrijStatus; melding?: string };

// --- Register ------------------------------------------------------------

/** Bronnen die niet verwijderd zijn. */
export function actieveBronnen(ba: BronnenAnalyse): Bron[] {
  return ba.bronnen.filter((b) => !b.verwijderd);
}

/** Actieve bronnen zonder analyse die de AI kan lezen (geen Miro, geen audio/video). */
export function bronnenZonderAnalyse(ba: BronnenAnalyse): Bron[] {
  return actieveBronnen(ba).filter((b) => !b.analyse && b.type !== "miro" && b.type !== "audio_video");
}

/** Titel van een bron; nooit een id tonen (CLAUDE.md regel 9). */
export function bronLabel(ba: BronnenAnalyse, bronId: string | undefined): string {
  if (!bronId) return "—";
  const b = ba.bronnen.find((x) => x.id === bronId);
  return b?.titel?.trim() ? b.titel : "—";
}

const EXTENSIE_TYPE: Record<string, BronType> = {
  pdf: "pdf",
  docx: "docx",
  doc: "doc",
  xlsx: "xlsx",
  xls: "xlsx",
  pptx: "pptx",
  txt: "txt",
  md: "md",
  eml: "eml",
  msg: "msg",
  html: "html",
  htm: "html",
  mp3: "audio_video",
  mp4: "audio_video",
  m4a: "audio_video",
  wav: "audio_video",
  mov: "audio_video",
  webm: "audio_video",
};

/** Bestandssoort op basis van de extensie. */
export function bronTypeUitBestandsnaam(naam: string): BronType {
  const m = /\.([a-z0-9]+)$/i.exec(naam.trim());
  if (!m) return "anders";
  return EXTENSIE_TYPE[m[1].toLowerCase()] ?? "anders";
}

function slug(s: string): string {
  return s
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

/** Stabiele slug uit de titel; bij een botsing -2, -3, … */
export function maakBronId(titel: string, bestaandeIds: Iterable<string>): string {
  const bestaand = new Set(bestaandeIds);
  const basis = slug(titel) || "bron";
  if (!bestaand.has(basis)) return basis;
  let n = 2;
  while (bestaand.has(`${basis}-${n}`)) n += 1;
  return `${basis}-${n}`;
}

// --- Caps ----------------------------------------------------------------

/** Kapt af op max tekens (inclusief het weglatingsteken). */
export function capTekst(s: string, max: number): string {
  if (!s) return "";
  if (s.length <= max) return s;
  return s.slice(0, Math.max(0, max - 1)).trimEnd() + "…";
}

/** Dwingt de lengtes af: citaat 300, samenvatting 600, openPunten en actiesNogTeDoen max 3. */
export function capBronAnalyse<T extends Pick<BronAnalyse, "samenvatting" | "dekking" | "punten">>(a: T): T {
  return {
    ...a,
    samenvatting: capTekst(a.samenvatting ?? "", SAMENVATTING_MAX),
    dekking: (a.dekking ?? []).map((d) => ({
      ...d,
      citaat: capTekst(d.citaat ?? "", CITAAT_MAX),
      vindplaats: d.vindplaats ?? "",
      domeinen: d.domeinen ?? [],
      openPunten: (d.openPunten ?? []).slice(0, OPEN_PUNTEN_MAX),
    })),
    punten: (a.punten ?? []).map((p) => ({
      ...p,
      citaat: capTekst(p.citaat ?? "", CITAAT_MAX),
      vindplaats: p.vindplaats ?? "",
      actiesNogTeDoen: (p.actiesNogTeDoen ?? []).slice(0, OPEN_PUNTEN_MAX),
    })),
  };
}

// --- Citaat-verificatie --------------------------------------------------

/** Kleine letters, typografische tekens naar ASCII, alle witruimte naar één spatie. */
export function normaliseerVoorVergelijk(s: string): string {
  return (s ?? "")
    .toLowerCase()
    .replace(/[‘’‚‛′]/g, "'")
    .replace(/[“”„‟″«»]/g, '"')
    .replace(/[‐‑‒–—―−]/g, "-")
    .replace(/…/g, "...")
    .replace(/\s+/g, " ")
    .trim();
}

/** Staat het citaat (genormaliseerd) letterlijk in de brontekst? Leeg citaat = false. */
export function verifieerCitaat(citaat: string, brontekst: string): boolean {
  const c = normaliseerVoorVergelijk(citaat);
  if (!c) return false;
  return normaliseerVoorVergelijk(brontekst).includes(c);
}

// --- Muteren (geeft altijd een nieuw object terug) ----------------------

/**
 * Zet de analyse van een bron. `bewerkt` beschermt alleen een BESTAANDE analyse: een handmatig
 * bewerkte analyse wordt alleen overschreven met forceer: true (dan is hij daarna niet meer
 * "bewerkt"). Een bron zonder analyse mag altijd geanalyseerd worden — ook als er een oude
 * `bewerkt: true` op staat van alleen een metadata-wijziging.
 */
export function pasAnalyseToe(
  ba: BronnenAnalyse,
  bronId: string,
  analyse: BronAnalyse,
  opties: { forceer?: boolean } = {},
): BronnenAnalyse {
  return {
    ...ba,
    bronnen: ba.bronnen.map((b) => {
      if (b.id !== bronId) return b;
      if (b.bewerkt && b.analyse && !opties.forceer) return b;
      return { ...b, analyse: capBronAnalyse(analyse), bewerkt: false };
    }),
  };
}

/**
 * Past velden van een bron aan. Heeft de bron een analyse, dan wordt hij als handmatig bewerkt
 * gemarkeerd (de seed/AI overschrijft die analyse dan niet meer). Zonder analyse is er niets te
 * beschermen: `bewerkt` blijft false, zodat de eerste analyse gewoon wordt toegepast.
 */
export function bewerkBron(ba: BronnenAnalyse, bronId: string, wijziging: Partial<Bron>): BronnenAnalyse {
  return {
    ...ba,
    bronnen: ba.bronnen.map((b) => {
      if (b.id !== bronId) return b;
      const samengevoegd: Bron = { ...b, ...wijziging, id: b.id };
      const nieuw: Bron = { ...samengevoegd, bewerkt: Boolean(samengevoegd.analyse) };
      if (nieuw.analyse) nieuw.analyse = { ...nieuw.analyse, door: "handmatig" };
      return nieuw;
    }),
  };
}

/** Lege analyse als startpunt voor handmatig invullen. */
function legeAnalyse(): BronAnalyse {
  return {
    samenvatting: "",
    status: "niet_geanalyseerd",
    dekking: [],
    punten: [],
    door: "handmatig",
    geanalyseerdOp: new Date().toISOString(),
  };
}

/** Past de analyse van een bron aan via een mutator; markeert als handmatig bewerkt. */
export function bewerkAnalyse(
  ba: BronnenAnalyse,
  bronId: string,
  mutator: (a: BronAnalyse) => BronAnalyse,
): BronnenAnalyse {
  return {
    ...ba,
    bronnen: ba.bronnen.map((b) => {
      if (b.id !== bronId) return b;
      const huidig = b.analyse ? { ...b.analyse } : legeAnalyse();
      const nieuw: BronAnalyse = { ...mutator(huidig), door: "handmatig" };
      const resultaat: Bron = { ...b, bewerkt: true, analyse: capBronAnalyse(nieuw) };
      return resultaat;
    }),
  };
}

// --- Dekking per werkstroom (deterministisch, geen AI) -------------------

export type DekkingCel = {
  bronId: string;
  bronTitel: string;
  status: BronStatus;
  dekt: string;
  citaat: string;
  vindplaats: string;
  citaatGeverifieerd?: boolean;
  domeinen: EffortDomain[];
};

export type DekkingRij = {
  werkstroom: string;
  naam: string;
  watHebbenWeAl: DekkingCel[];
  bruikbaar: DekkingCel[];
  nogNodig: NogNodigItem[];
  openPuntenUitBronnen: { tekst: string; bronId: string; bronTitel: string }[];
  /** true als er geen bruikbare dekking is: de UI toont "te bepalen" */
  teBepalen: boolean;
};

function isBruikbaar(status: BronStatus): boolean {
  return status === "bruikbaar" || status === "deels_bruikbaar";
}

export function berekenDekkingMatrix(
  ba: BronnenAnalyse,
  werkstromen: { id: string; naam: string }[],
): DekkingRij[] {
  const bronnen = actieveBronnen(ba).filter((b) => b.analyse);
  return werkstromen.map((w) => {
    const watHebbenWeAl: DekkingCel[] = [];
    const openPuntenUitBronnen: DekkingRij["openPuntenUitBronnen"] = [];
    for (const b of bronnen) {
      const a = b.analyse!;
      for (const d of a.dekking ?? []) {
        if (d.werkstroom !== w.id) continue;
        watHebbenWeAl.push({
          bronId: b.id,
          bronTitel: b.titel,
          status: a.status,
          dekt: d.dekt,
          citaat: d.citaat ?? "",
          vindplaats: d.vindplaats ?? "",
          citaatGeverifieerd: d.citaatGeverifieerd,
          domeinen: d.domeinen ?? [],
        });
        for (const tekst of d.openPunten ?? []) {
          openPuntenUitBronnen.push({ tekst, bronId: b.id, bronTitel: b.titel });
        }
      }
    }
    const bruikbaar = watHebbenWeAl.filter((c) => isBruikbaar(c.status));
    const nogNodig = ba.nogNodig.filter(
      (n) => n.werkstroom === w.id && (n.status === "open" || n.status === "belegd"),
    );
    return {
      werkstroom: w.id,
      naam: w.naam,
      watHebbenWeAl,
      bruikbaar,
      nogNodig,
      openPuntenUitBronnen,
      teBepalen: bruikbaar.length === 0,
    };
  });
}

// --- De vier punten ------------------------------------------------------

export type PuntOverzicht = {
  punt: GeelPunt;
  titel: string;
  nummer: number;
  noot?: string;
  watErAl: {
    bronId: string;
    bronTitel: string;
    watErAlIs: string;
    citaat: string;
    vindplaats: string;
    citaatGeverifieerd?: boolean;
  }[];
  acties: { tekst: string; bron: string }[];
  /** true als er nog niets is: de UI toont "te bepalen" */
  teBepalen: boolean;
};

export function berekenPuntenOverzicht(ba: BronnenAnalyse): PuntOverzicht[] {
  const bronnen = actieveBronnen(ba).filter((b) => b.analyse);
  return GEEL_PUNTEN.map((gp) => {
    const watErAl: PuntOverzicht["watErAl"] = [];
    const acties: PuntOverzicht["acties"] = [];
    for (const b of bronnen) {
      for (const p of b.analyse!.punten ?? []) {
        if (p.punt !== gp.id) continue;
        watErAl.push({
          bronId: b.id,
          bronTitel: b.titel,
          watErAlIs: p.watErAlIs,
          citaat: p.citaat ?? "",
          vindplaats: p.vindplaats ?? "",
          citaatGeverifieerd: p.citaatGeverifieerd,
        });
        for (const tekst of p.actiesNogTeDoen ?? []) acties.push({ tekst, bron: b.titel });
      }
    }
    for (const n of ba.nogNodig) {
      if (n.punt === gp.id && n.status !== "afgerond") acties.push({ tekst: n.tekst, bron: n.bron });
    }
    return {
      punt: gp.id,
      titel: gp.titel,
      nummer: gp.nummer,
      noot: gp.noot,
      watErAl,
      acties,
      teBepalen: watErAl.length === 0,
    };
  });
}

// --- Voorstellen voor "nog nodig" (nooit automatisch toegevoegd) --------

/** Korte deterministische hash (djb2) voor stabiele voorstel-ids. */
function hash(s: string): string {
  let h = 5381;
  for (let i = 0; i < s.length; i++) h = ((h << 5) + h + s.charCodeAt(i)) | 0;
  return (h >>> 0).toString(36);
}

export function voorstellenNogNodig(
  ba: BronnenAnalyse,
  werkstromen: { id: string; naam: string }[],
): NogNodigItem[] {
  const bestaandeIds = new Set(ba.nogNodig.map((n) => n.id));
  const bestaandeTeksten = new Set(ba.nogNodig.map((n) => normaliseerVoorVergelijk(n.tekst)));
  const uit: NogNodigItem[] = [];
  const gezien = new Set<string>();

  function voegToe(item: NogNodigItem, tekstSleutel?: string) {
    if (bestaandeIds.has(item.id) || gezien.has(item.id)) return;
    if (tekstSleutel !== undefined) {
      if (bestaandeTeksten.has(tekstSleutel) || gezien.has("t:" + tekstSleutel)) return;
      gezien.add("t:" + tekstSleutel);
    }
    gezien.add(item.id);
    uit.push(item);
  }

  const matrix = berekenDekkingMatrix(ba, werkstromen);
  for (const rij of matrix) {
    if (rij.teBepalen) {
      voegToe({
        id: `voorstel-gat-${rij.werkstroom}`,
        tekst: TE_BEPALEN,
        werkstroom: rij.werkstroom,
        actie: "",
        status: "open",
        bron: GAT_IN_DEKKING_BRON,
        bewerkt: false,
      });
    }
    for (const op of rij.openPuntenUitBronnen) {
      const sleutel = normaliseerVoorVergelijk(op.tekst);
      if (!sleutel) continue;
      voegToe(
        {
          id: `voorstel-open-${rij.werkstroom}-${hash(sleutel)}`,
          tekst: op.tekst,
          werkstroom: rij.werkstroom,
          actie: "",
          status: "open",
          bron: op.bronTitel || "—",
          bewerkt: false,
        },
        sleutel,
      );
    }
  }

  for (const p of berekenPuntenOverzicht(ba)) {
    if (p.watErAl.length === 0) {
      voegToe({
        id: `voorstel-punt-${p.punt}`,
        tekst: TE_BEPALEN,
        punt: p.punt,
        actie: "",
        status: "open",
        bron: GAT_IN_DEKKING_BRON,
        bewerkt: false,
      });
    }
  }
  return uit;
}

// --- Voortgang van de stap ----------------------------------------------

/** Is de bron echt geanalyseerd (analyse aanwezig en status niet "niet geanalyseerd")? */
export function isGeanalyseerd(b: Bron): boolean {
  return !!b.analyse && b.analyse.status !== "niet_geanalyseerd";
}

/**
 * Voortgang van stap 12: geanalyseerde actieve bronnen gedeeld door alle actieve bronnen
 * (Miro en audio/video tellen mee in de noemer).
 */
export function bronnenStapCompletion(session: DINSession): { percentage: number; details: string } {
  const ba = mergeBronnenAnalyse(session.bronnenAnalyse as Partial<BronnenAnalyse> | undefined);
  const actief = actieveBronnen(ba);
  if (actief.length === 0) return { percentage: 0, details: "Nog geen bronnen" };
  const geanalyseerd = actief.filter(isGeanalyseerd).length;
  return {
    percentage: Math.round((geanalyseerd / actief.length) * 100),
    details: `${actief.length} bronnen, ${geanalyseerd} geanalyseerd`,
  };
}
