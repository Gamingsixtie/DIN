// Praatplaat "Antwoord op het doel" (stap 12): vorm van de inhoud in session.bronnenAnalyse.antwoordDoel.
// De inhoud zelf staat in de sessie (niet in de code); deze module beschrijft alleen de vorm.

export type DomeinId = "cultuur" | "mens" | "data" | "processen";

export interface PpDomein { id: DomeinId; naam: string; kleur: string; vermogen: string }
export interface PpNu { wat: string; waarom: string; vlag?: string; id?: string }
export interface WachtItem { id?: string; wat: string; afhankelijk: string; fase?: string; zelf: "ja" | "deels" | "nee"; hoe: string; nodig: string; wanneer: string; bron?: string }
export interface WachtOp3sidesData { titel: string; toelichting: string; kern: string; werkstromen: { naam: string; samenvatting: string; items: WachtItem[] }[] }
export interface PpPunt { nr: number; label: string; voorbehoud?: string }
export interface PpWerkstroom {
  id: string;
  naam: string;
  domeinen: DomeinId[];
  vermogensdeel: string;
  citoLead: string;
  sidesLead: string;
  leadNoot?: string;
  stand: string;
  punten: PpPunt[];
  bouwstenen: number[];
  extraLabels?: string[];
  doeltoets?: { oordeel: string; kort?: string };
  ligt: string[];
  ontbreekt: string[];
  nu: PpNu[];
}
export interface PpPlanItem { wat: string; fase: string; tot?: string; extra?: string; label?: string; vlag?: string; parkeer?: boolean }
export interface Praatplaat {
  versie: 2;
  titel: string;
  document: string;
  vraag: string;
  stand: string;
  kern: { kop: string; tekst: string }[];
  doel: { tekst: string; noot: string };
  baten: { sectoren: { naam: string; noot: string }[]; kpi: { kop: string; tekst: string } };
  domeinen: PpDomein[];
  werkstromen: PpWerkstroom[];
  wachtOp3sides?: WachtOp3sidesData;
  doeltoetsKern?: { oordeel: string; punten: string[]; advies?: string };
  /** AI voor commerciële marketing en sales, en agents voor de uitvoering (analyse 16-10). */
  ai?: { punten: string[]; advies?: string; agents?: string };
  besluiten: { vraag: string; wie: string }[];
  legenda: string[];
  uitwerking: {
    punten: { nr: number; titel: string; ligt: string[]; moet: string[]; plek: string; wie: string }[];
    bouwstenen: { nr: number; naam: string; werkstroom: string; vermogensdeel: string; domeinlabel: string; domeinen: DomeinId[]; opmerking: string }[];
    planning: {
      toelichting: string;
      fasen: { id: string; label: string; week: string }[];
      werkstromen: { naam: string; domeinen: DomeinId[]; items: PpPlanItem[] }[];
    };
    gaten: { gat: string; voorstel: string; wie: string }[];
  };
}

export function leesPraatplaat(tekst: string | undefined | null): Praatplaat | null {
  if (!tekst) return null;
  try {
    const p = JSON.parse(tekst);
    return p && p.versie === 2 ? (p as Praatplaat) : null;
  } catch {
    return null;
  }
}

/** Kleuren van de domeinen in volgorde, voor balken en stroken. */
export function domeinKleuren(p: Praatplaat, ids: DomeinId[]): string[] {
  return ids.map((id) => p.domeinen.find((d) => d.id === id)?.kleur ?? "#003366");
}

/** Geelmarkering zoals in het document van de opdracht (de gele punten). */
export const MARKEER = "linear-gradient(180deg, transparent 12%, #fde047 12%, #fde047 88%, transparent 88%)";
