// Gedeelde typen en constanten voor de bloktypes van het bewerkbare document
// (BewerkbaarDocument en de losse blokken in ./blokken).

import type { DocBlok } from "@/lib/schemas";

export type BlokVan<T extends DocBlok["type"]> = Extract<DocBlok, { type: T }>;
/** Past een kopie van het blok aan; de wijziging gaat via de sectie naar boven. */
export type Zet<T> = (fn: (x: T) => void) => void;
/** Props van een los blok: data, bewerkmodus, wijzigen en de beschikbare linkdoelen. */
export type LosBlokProps<T extends DocBlok["type"]> = {
  b: BlokVan<T>;
  edit: boolean;
  zet: Zet<BlokVan<T>>;
  /** element-ids die in het document bestaan (bijv. "sec-kort", "wk-adoptie", "tl-data") */
  ankers: ReadonlySet<string>;
};

// De vier domeinen van het DIN, in de Cito outside-in volgorde, met de vaste kleuren.
export const DOMEINEN: { id: string; label: string; kleur: string }[] = [
  { id: "cultuur", label: "Cultuur", kleur: "#d97706" },
  { id: "mens", label: "Mens", kleur: "#2563eb" },
  { id: "data", label: "Data & Systemen", kleur: "#7c3aed" },
  { id: "processen", label: "Processen", kleur: "#059669" },
];

export function domein(id: string): { id: string; label: string; kleur: string } | undefined {
  return DOMEINEN.find((d) => d.id === id.trim().toLowerCase());
}
