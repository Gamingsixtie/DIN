// Hoe het evaluatieblok (stap 11, deel 8) wordt getoond.
// - "intern": alles. De bevinding, de feiten, wat we van 3sides vragen en de vraag voor het
//   gesprek, en daarbij wat alleen voor Cito is: wat Cito zelf doet, ons oordeel met de
//   notitie en de onderbouwing. Zo staat het in de analyse en op het tabblad Evaluatie intern.
// - "extern": alleen wat we aan 3sides communiceren. Zo staat het op het tabblad
//   Evaluatie 3sides: helemaal gericht op 3sides, zonder wat Cito zelf nog moet doen.
// De export volgt dezelfde tweedeling via evaluatie-uitsnede.ts (versie "3sides" of "intern").

import { createContext } from "react";

export type EvaluatieWeergave = "intern" | "extern";

/** Standaard "intern"; het tabblad Evaluatie 3sides zet "extern". */
export const EvaluatieWeergaveContext = createContext<EvaluatieWeergave>("intern");
