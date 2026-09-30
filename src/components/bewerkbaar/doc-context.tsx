"use client";

// Context met het hele document, zodat een blok andere blokken kan lezen (bijv. het
// nodig-bord dat de opleveringen uit het tijdlijn-blok haalt). Alleen lezen.

import { createContext, useContext } from "react";
import type { BewerkbaarDocument as DocData, DocBlok } from "@/lib/schemas";

export const DocContext = createContext<DocData | null>(null);

export function useDoc(): DocData | null {
  return useContext(DocContext);
}

/** Eerste blok van een type in het document (over alle zichtbare secties). */
export function useBlok<T extends DocBlok["type"]>(type: T): Extract<DocBlok, { type: T }> | null {
  const doc = useContext(DocContext);
  if (!doc) return null;
  for (const s of doc.secties) {
    for (const b of s.blokken) if (b.type === type) return b as Extract<DocBlok, { type: T }>;
  }
  return null;
}
