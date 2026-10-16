"use client";

import { createContext } from "react";

/**
 * Bewerken vanaf de plek waar je leest: een knop bij een blok of een kader opent het deel
 * waarin hij staat in bewerkmodus en houdt diezelfde plek in beeld. Null = hier kan niet
 * bewerkt worden (geen potlood per deel, of er wordt al een ander deel bewerkt).
 */
export const BewerkHierContext = createContext<((el: HTMLElement) => void) | null>(null);

/** Het blok heet `sectie:blokindex`, in weergave en in bewerkmodus; een kader `data-kader`. */
export const BLOK_ANKER = "data-bewerk-anker";

/**
 * Onthoudt waar `el` staat (blok, kader, hoogte in beeld), roept `open` aan en schuift daarna
 * hetzelfde blok of kader in bewerkmodus naar dezelfde hoogte. Zonder bekend blok: de sectie.
 */
export function bewerkOpPlek(el: HTMLElement, sectieId: string, open: () => void) {
  const blok = el.closest<HTMLElement>(`[${BLOK_ANKER}]`);
  const anker = blok?.getAttribute(BLOK_ANKER) ?? null;
  const kaderEl = el.closest<HTMLElement>("[data-kader]");
  const kader = kaderEl?.dataset.kader ?? null;
  const y = (kaderEl ?? blok ?? el).getBoundingClientRect().top;
  open();
  let n = 0;
  const zoek = () => {
    const sectie = document.getElementById("sec-" + sectieId);
    const doelBlok = anker && sectie ? sectie.querySelector<HTMLElement>(`.okd-blok-edit[${BLOK_ANKER}="${anker}"]`) : null;
    const doel = (doelBlok && kader !== null ? doelBlok.querySelector<HTMLElement>(`[data-kader="${kader}"]`) : null) ?? doelBlok;
    if (doel) {
      // onder de bewerkbalk, die bovenin beeld blijft
      window.scrollBy({ top: doel.getBoundingClientRect().top - Math.max(y, 120) });
      return;
    }
    if (++n < 40) requestAnimationFrame(zoek);
    else sectie?.scrollIntoView({ block: "start" });
  };
  requestAnimationFrame(zoek);
}
