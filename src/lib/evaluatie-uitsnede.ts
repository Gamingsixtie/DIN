// Stap 11, tabblad "Evaluatie 3sides": de uitsnede uit de analyse voor de programma-eigenaar.
// Drie delen uit het analyse-document (src/lib/integratie-3sides-default.ts), in deze volgorde:
// wat er per werkstroom ligt, de planning met wat er is geleverd, en de evaluatie op zes kaders.
// Het actiebord "Wat Cito zelf moet doen" hoort er niet bij. Het tabblad, de afdrukweergave
// (PDF) en de Word-export gebruiken dezelfde keuze, zodat ze niet uit elkaar lopen.
//
// Het tabblad toont de delen uit het echte document (zelfde gegevens, zelfde blok-indexen);
// het gebruikt alleen UITSNEDE_SECTIES en inUitsnede(). De export werkt op een losse kopie
// (maakUitsnede): alleen-lezen, hernummerd naar deel 1 tot en met 3, en in de versie voor
// 3sides zonder wat intern is. Die kopie gaat nooit terug naar de sessie.

import type { BewerkbaarDocument, DocBlok, DocSectie } from "@/lib/schemas";
import { GESPREK_AGENDA, GESPREK_BRIEF } from "@/lib/evaluatie-gesprek-default";

/**
 * De sectie-id's uit de analyse die op het tabblad Evaluatie 3sides staan, in volgorde:
 * eerst het overzicht (de tijdlijn, wat opvalt, wat er is geleverd), dan de evaluatie.
 * De werkstroomkaarten (deel 4) staan er niet bij: die beschrijven de werkstromen in detail
 * en horen bij de analyse; voor de evaluatie telt wat is toegezegd en wat er is geleverd.
 */
export const UITSNEDE_SECTIES = ["planning", "evaluatie"] as const;

export type UitsnedeSectie = (typeof UITSNEDE_SECTIES)[number];

/** Voor wie de export is: intern (programma-eigenaar) of om aan 3sides te overhandigen. */
export type ExportVersie = "intern" | "3sides";

/** Sectie-id van de bronnenlijst in de analyse. */
const BRONNEN_SECTIE = "documenten";

/** Het actiebord van Cito: een tabel die per groep als bord wordt getoond (groepKolom). */
export function isActiebord(b: DocBlok): boolean {
  return b.type === "tabel" && b.groepKolom !== undefined;
}

/** Leeswijzer voor intern gebruik: een kader met toon "info" in het deel Evaluatie. */
function isInterneNotitie(sectieId: string, b: DocBlok): boolean {
  return sectieId === "evaluatie" && b.type === "callout" && b.toon === "info";
}

/**
 * Het voortgangsbord: per werkstroom de stand van elk onderdeel en wat nog nodig is. Het
 * hoort bij de analyse en het tabblad Voortgang; voor de evaluatie herhaalt het de tijdlijn
 * en de tabel "Toegezegd en geleverd", dus het staat niet op het tabblad en niet in de export.
 */
function isVoortgangsbord(b: DocBlok): boolean {
  return b.type === "voortgangsbord";
}

/** Uitleg over de bediening in de app: een kader met toon "info" in het deel Planning. Niet in de export. */
function isBediening(sectieId: string, b: DocBlok): boolean {
  return sectieId === "planning" && b.type === "callout" && b.toon === "info";
}

/**
 * Staat dit blok op het tabblad Evaluatie 3sides? Wat we aan 3sides communiceren: kort en
 * gericht. Dus niet het actiebord van Cito, niet de interne notitie bij de evaluatie en niet
 * het voortgangsbord.
 */
export function inUitsnede(sectieId: string, b: DocBlok): boolean {
  return (
    (UITSNEDE_SECTIES as readonly string[]).includes(sectieId) &&
    !isActiebord(b) &&
    !isInterneNotitie(sectieId, b) &&
    !isVoortgangsbord(b) &&
    // uitleg over de bediening hoort bij de analyse, niet bij de evaluatie
    !isBediening(sectieId, b)
  );
}

/** De secties waaruit het tabblad Evaluatie intern put, in volgorde. */
export const INTERN_SECTIES = ["evaluatie", "planning"] as const;

/**
 * Staat dit blok op het tabblad Evaluatie intern? De hele evaluatie (met de interne notitie),
 * en uit het deel Planning alleen het actiebord: wat Cito zelf doet.
 */
export function inInternTab(sectieId: string, b: DocBlok): boolean {
  return sectieId === "evaluatie" || (sectieId === "planning" && isActiebord(b));
}

/**
 * Staat dit blok in de export? Voor 3sides als op het tabblad; intern komt het actiebord
 * erbij. De uitleg over de bediening en het voortgangsbord staan in geen van beide.
 */
function inExport(sectieId: string, b: DocBlok, versie: ExportVersie): boolean {
  if (isBediening(sectieId, b) || isVoortgangsbord(b)) return false;
  if (versie === "3sides") return inUitsnede(sectieId, b);
  return (UITSNEDE_SECTIES as readonly string[]).includes(sectieId);
}

// ---------- de export: een losse, alleen-lezen kopie ----------

export interface UitsnedeDeel {
  /** nummer in de export: 1, 2, 3 */
  nummer: number;
  /** de sectie in de analyse waar dit deel uit komt */
  bron: UitsnedeSectie;
  /** kopie van de sectie: gefilterd, hernummerd, verwijzingen bijgewerkt */
  sectie: DocSectie;
}

export interface EvaluatieUitsnede {
  versie: ExportVersie;
  titel: string;
  ondertitel: string;
  status: string;
  /** de begeleidende brief; alleen in de versie voor 3sides, en alleen als hij inhoud heeft */
  brief: DocSectie | null;
  /** de agenda voor het evaluatiegesprek; null als hij leeg is */
  agenda: DocSectie | null;
  delen: UitsnedeDeel[];
  /**
   * Gegevens waar blokken in de delen mee rekenen, ook als hun eigen deel niet in de export
   * staat: de werkstroomkaarten, de tijdlijn en het voortgangsbord uit de analyse (kopieën,
   * met dezelfde verwijzingen als de delen). Alleen om mee te rekenen, niet om te tonen.
   */
  gegevens: DocBlok[];
  /** de gebruikte documenten (platte tekst, zonder linktekens) */
  bronnen: string[];
}

/** Bloktypes waar het voortgangsbord en de kaarten in de app mee rekenen (DocContext). */
const GEGEVENS_TYPES: readonly DocBlok["type"][] = ["werkstromen", "tijdlijn", "voortgangsbord"];

/** "4 · Titel" → "Titel". */
const NUMMER_VOORAAN = /^\s*\d{1,2}\s*·\s*/;

/** Expliciete linktekens "[[Plan van aanpak]]" → "Plan van aanpak". */
export function zonderLinktekens(tekst: string): string {
  return tekst.replace(/\[\[([^\]]+)\]\]/g, "$1");
}

/** Elke tekst in een waarde (diep) door `fn`; structuur, getallen en booleans blijven. */
function diep<T>(v: T, fn: (s: string) => string): T {
  if (typeof v === "string") return fn(v) as unknown as T;
  if (Array.isArray(v)) return v.map((x) => diep(x, fn)) as unknown as T;
  if (v && typeof v === "object") {
    const uit: Record<string, unknown> = {};
    for (const [k, x] of Object.entries(v as Record<string, unknown>)) uit[k] = diep(x, fn);
    return uit as T;
  }
  return v;
}

// "deel 4", "Deel 12", ook "deel 5 en 7": zelfde vorm als in bron-context.tsx.
const N = "(1[0-5]|[1-9])";
const DEEL = new RegExp(`(?<![\\p{L}\\p{N}])([Dd])eel\\s${N}(?!\\p{N})(?:(\\s(?:en|of|tot en met|t/m)\\s)${N}(?!\\p{N}))?`, "gu");
// In de versie voor 3sides: een verwijzing naar een deel dat er niet in zit, verdwijnt met
// het leesteken of de haakjes eromheen ("(deel 7)", ", deel 7", "; besluitpunt deel 7").
const TUSSEN_HAAKJES = new RegExp(`\\s*\\((?:zie\\s)?(?:[\\p{L}]+\\s)?[Dd]eel\\s${N}(?!\\p{N})\\)`, "gu");
const NA_LEESTEKEN = new RegExp(`[,;]\\s(?:zie\\s)?(?:[\\p{L}]+\\s)?[Dd]eel\\s${N}(?!\\p{N})(?=[)\\s.,;]|$)`, "gu");

/**
 * Verwijzingen "deel N" omzetten naar de nummering van de export. Een deel dat in de export
 * zit, krijgt zijn nieuwe nummer. Een deel dat er niet in zit: intern "deel N van de analyse";
 * in de versie voor 3sides valt de verwijzing weg (of wordt "de analyse van Cito").
 */
export function herschrijfVerwijzingen(tekst: string, kaart: ReadonlyMap<number, number>, versie: ExportVersie): string {
  let t = tekst;
  if (versie === "3sides") {
    const weg = (m: string, n: string) => (kaart.has(Number(n)) ? m : "");
    t = t.replace(TUSSEN_HAAKJES, weg).replace(NA_LEESTEKEN, weg);
  }
  return t.replace(DEEL, (m: string, d: string, a: string, voeg: string | undefined, b: string | undefined) => {
    const na = kaart.get(Number(a));
    if (b === undefined || voeg === undefined) {
      if (na !== undefined) return `${d}eel ${na}`;
      return versie === "intern" ? `${d}eel ${a} van de analyse` : "de analyse van Cito";
    }
    const nb = kaart.get(Number(b));
    if (na !== undefined && nb !== undefined) return `${d}eel ${na}${voeg}${nb}`;
    if (na !== undefined) return versie === "intern" ? `${d}eel ${na}${voeg}deel ${b} van de analyse` : `${d}eel ${na}`;
    if (nb !== undefined) return versie === "intern" ? `${d}eel ${a} van de analyse${voeg}deel ${nb}` : `${d}eel ${nb}`;
    return versie === "intern" ? `${d}eel ${a}${voeg}${b} van de analyse` : "de analyse van Cito";
  });
}

/** Nummer uit een sectietitel ("5 · Planning" → 5); zonder nummer null. */
function titelNummer(titel: string): number | null {
  const m = titel.match(/^\s*(\d{1,2})\s*·/);
  return m ? Number(m[1]) : null;
}

/**
 * Een blok voor de export. In de versie voor 3sides: de evaluatie zonder ons interne oordeel,
 * de notitie en de onderbouwing per kader; en zonder de leeswijzer voor intern gebruik
 * (een kader met toon "info" in het deel Evaluatie). null = het blok vervalt.
 */
function exportBlok(sectieId: string, b: DocBlok, versie: ExportVersie): DocBlok | null {
  if (versie !== "3sides") return b;
  if (isInterneNotitie(sectieId, b)) return null;
  if (b.type === "evaluatie") {
    // alleen wat over 3sides gaat: geen "wat Cito zelf doet", geen "aan zet", geen oordeel, notitie of onderbouwing
    return {
      ...b,
      kaders: b.kaders.map((k) => ({ ...k, aanZetCito: "", actieBij: "", oordeel: "", notitie: "", secties: [] })),
    };
  }
  return b;
}

/**
 * Een regel uit de bronnenlijst voor de versie die naar 3sides gaat: de interne regels
 * (het eigen overleg van Cito, de stappen in de app) krijgen een zakelijke vorm zonder wat
 * alleen voor intern gebruik is. Andere regels blijven zoals ze zijn.
 */
function bronVoor3sides(regel: string, tekstVoor3sides: string): string | null {
  if (/programmaoverleg van Cito van 01-10/i.test(regel)) {
    return "Ons programmaoverleg van 01-10-2026, zonder 3sides (in dit stuk: overleg 01-10): gebruikt voor waarnemingen van ons programmateam, zonder namen";
  }
  if (/^\s*Programma:/i.test(regel)) {
    return "Onze eigen stukken: het Doelen-Inspanningennetwerk (stand 29-09-2026), het stappenplan analysefase (19-08-2026) en het organigram (voorstel)";
  }
  // Een document dat in deze versie nergens wordt aangehaald, staat niet in de lijst
  // (de dag van de BV en de evaluatie van Klant in Beeld komen alleen in de onderbouwing voor).
  if (/BV-dag/i.test(regel) && !/BV-dag|evaluatie Klant in Beeld/i.test(tekstVoor3sides)) return null;
  return regel;
}

// "het actiebord (deel 5)", "(actiebord, deel 5)": het actiebord zit niet in de export, dus
// die verwijzing wijst naar de analyse en niet naar een deel van dit stuk.
const ACTIEBORD_DEEL = new RegExp(`actiebord(?:\\s*\\(deel\\s${N}\\)|,\\s*deel\\s${N}(?!\\p{N}))`, "giu");
// Een kale verwijzing "(actiebord)" of "het actiebord" krijgt dezelfde toevoeging.
const ACTIEBORD_KAAL = /actiebord(?!\s+in de analyse)/giu;

/** Verwijzingen naar het actiebord wijzen in de export naar de analyse. */
function actiebordInAnalyse(t: string): string {
  return t.replace(ACTIEBORD_DEEL, "actiebord").replace(ACTIEBORD_KAAL, (m) => m + " in de analyse");
}

/**
 * Gaat de begeleidende brief mee (tabblad, Word en PDF voor 3sides)? Op verzoek van het
 * programmateam (05-10-2026) voorlopig niet; de tekst blijft in de sessie bewaard en komt
 * terug door dit op true te zetten.
 */
export const BRIEF_MEESTUREN = false;

/** Sectie met inhoud? (een lege agenda of brief komt niet in de export) */
function metInhoud(s: DocSectie | undefined): s is DocSectie {
  return !!s && s.blokken.length > 0;
}

/**
 * De export als losse kopie: de drie delen uit de analyse (zonder actiebord en zonder de
 * bedieningsuitleg), hernummerd naar 1 tot en met 3 met bijgewerkte verwijzingen, plus de
 * agenda, de bronnenlijst en, in de versie voor 3sides, de begeleidende brief.
 * `analyse` en `gesprek` zijn de opgeloste documenten (doc-versie.ts: oplossen(...).doc).
 */
export function maakUitsnede(analyse: BewerkbaarDocument, gesprek: BewerkbaarDocument, versie: ExportVersie): EvaluatieUitsnede {
  const gekozen = UITSNEDE_SECTIES.map((id) => analyse.secties.find((s) => s.id === id)).filter(
    (s): s is DocSectie => !!s
  );
  // oud nummer (uit de titel in de analyse) → nieuw nummer in de export
  const kaart = new Map<number, number>();
  gekozen.forEach((s, i) => {
    const oud = titelNummer(s.titel);
    if (oud !== null) kaart.set(oud, i + 1);
  });
  // Voor 3sides zit het actiebord er niet in: een verwijzing ernaar wijst dan naar de analyse.
  // Intern zit het actiebord er wel in (in het deel Planning); "deel N" loopt daar gewoon mee.
  const tekst = (t: string) => herschrijfVerwijzingen(versie === "3sides" ? actiebordInAnalyse(t) : t, kaart, versie);

  const delen: UitsnedeDeel[] = gekozen.map((s, i) => {
    const blokken = s.blokken
      .filter((b) => inExport(s.id, b, versie))
      .map((b) => exportBlok(s.id, b, versie))
      .filter((b): b is DocBlok => b !== null);
    const sectie: DocSectie = diep({ ...s, blokken }, tekst);
    sectie.titel = `${i + 1} · ${s.titel.replace(NUMMER_VOORAAN, "")}`;
    return { nummer: i + 1, bron: s.id as UitsnedeSectie, sectie };
  });

  const agenda = gesprek.secties.find((s) => s.id === GESPREK_AGENDA);
  const brief = gesprek.secties.find((s) => s.id === GESPREK_BRIEF);
  const lijst = analyse.secties.find((s) => s.id === BRONNEN_SECTIE)?.blokken.find((b) => b.type === "lijst");
  const alleTekst = versie === "3sides" ? JSON.stringify(delen) : "";
  const bronnen = (lijst && lijst.type === "lijst" ? lijst.items : [])
    .filter((x) => !/^\s*Niet gebruikt/i.test(x))
    .map((x) => (versie === "3sides" ? bronVoor3sides(x, alleTekst) : x))
    .filter((x): x is string => x !== null)
    .map((x) => zonderLinktekens(tekst(x)));

  return {
    versie,
    titel: gesprek.titel,
    ondertitel: gesprek.ondertitel ?? "",
    status: gesprek.status ?? "",
    brief: BRIEF_MEESTUREN && versie === "3sides" && metInhoud(brief) ? diep(brief, tekst) : null,
    agenda: metInhoud(agenda) ? diep(agenda, tekst) : null,
    delen,
    gegevens: diep(
      analyse.secties.flatMap((s) => s.blokken.filter((b) => GEGEVENS_TYPES.includes(b.type))),
      tekst
    ),
    bronnen,
  };
}

/** Bestandsnaam voor de export, bijvoorbeeld "Evaluatie-3sides-intern-2026-10-05.docx". */
export function exportBestandsnaam(versie: ExportVersie, extensie: "docx" | "pdf", datum: Date = new Date()): string {
  const d = `${datum.getFullYear()}-${String(datum.getMonth() + 1).padStart(2, "0")}-${String(datum.getDate()).padStart(2, "0")}`;
  return `Evaluatie-3sides-${versie === "intern" ? "intern" : "voor-3sides"}-${d}.${extensie}`;
}
