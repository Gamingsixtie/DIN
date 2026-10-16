// Generiek bewerkbaar document (o.a. stap 11 "Programma × 3sides"): hulpfuncties
// om de standaardinhoud (src/lib/*-default.ts) te combineren met wat de gebruiker
// in de sessie heeft aangepast (session.documenten[<sleutel>]).
// Of een opgeslagen versie nog op de huidige voorsteltekst rust, en wat er gebeurt als
// die is bijgewerkt, bepaalt src/lib/doc-versie.ts (oplossen); dit bestand doet alleen
// het samenvoegen.

import type { BewerkbaarDocument, DocSectie } from "@/lib/schemas";

/** Diepe kopie; de documenten bevatten alleen platte JSON-gegevens. */
export function kloon<T>(x: T): T {
  return JSON.parse(JSON.stringify(x)) as T;
}

/**
 * Legt de opgeslagen (mogelijk gedeeltelijke) sessie-inhoud over de standaard.
 * - niets opgeslagen → kopie van de standaard;
 * - titel, ondertitel en status uit de opgeslagen versie zodra die gezet zijn;
 * - secties: de opgeslagen secties in hun eigen volgorde, aangevuld (achteraan)
 *   met elke standaardsectie waarvan de id er nog niet in staat. Zo verschijnt een
 *   later toegevoegde standaardsectie ook in een eerder opgeslagen sessie.
 * `basis` (de voorsteltekst onder de opgeslagen versie) gaat niet mee: die zet de
 * aanroeper bij het opslaan (doc-versie.ts, metBasis).
 */
export function mergeDocument(
  std: BewerkbaarDocument,
  saved?: Partial<BewerkbaarDocument> | null
): BewerkbaarDocument {
  const basis = kloon(std);
  if (!saved) return basis;
  const opgeslagen = kloon(saved);
  const secties = opgeslagen.secties ?? [];
  const aanwezig = new Set(secties.map((s) => s.id));
  return {
    titel: opgeslagen.titel ?? basis.titel,
    ondertitel: opgeslagen.ondertitel ?? basis.ondertitel,
    status: opgeslagen.status ?? basis.status,
    secties: [...secties, ...basis.secties.filter((s) => !aanwezig.has(s.id))],
  };
}

// Een verwijderde sectie blijft als lege markering (zelfde id, zonder titel, intro
// en blokken) in het document staan. Anders zou mergeDocument een verwijderde
// standaardsectie bij het laden meteen weer toevoegen. Weergave en inhoudsopgave
// slaan zulke secties over; "Terug naar voorstel-tekst" haalt ze weer terug.

/** Lege markering voor een verwijderde sectie. */
export function verwijderdeSectie(id: string): DocSectie {
  return { id, titel: "", intro: "", blokken: [] };
}

/** Is dit de markering van een verwijderde sectie? (Een nieuwe sectie heeft altijd een blok.) */
export function isVerwijderd(s: DocSectie): boolean {
  return s.blokken.length === 0 && !s.titel && !s.intro;
}

/** De secties die getoond worden (zonder verwijderde). */
export function zichtbareSecties(doc: BewerkbaarDocument): DocSectie[] {
  return doc.secties.filter((s) => !isVerwijderd(s));
}
