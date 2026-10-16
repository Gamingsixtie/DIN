// Bewerkbalk voor handmatig aanpasbare pagina's (organigram, documenten):
// ✎ Bewerken → Opslaan · Annuleren · Terug naar voorstel-tekst (met bevestiging
// Ja/Nee), met daaronder een statusmelding die vanzelf verdwijnt, de uitleg van
// de bewerkmodus en (buiten de bewerkmodus) een optionele notitie.
// Geeft losse elementen terug (fragment), zodat de ouder de ruimte ertussen
// bepaalt (bijv. "space-y-4"). Alleen gebruiken binnen een client-component.

import { useEffect, useState, type ReactNode } from "react";
import { KNOP } from "@/components/bewerkbaar/stijl";

export interface Melding {
  tekst: string;
  soort: "ok" | "info";
}

/** Statusmelding die na `duurMs` milliseconden vanzelf verdwijnt. */
export function useMelding(duurMs = 3500) {
  const [melding, setMelding] = useState<Melding | null>(null);
  useEffect(() => {
    if (!melding) return;
    const t = setTimeout(() => setMelding(null), duurMs);
    return () => clearTimeout(t);
  }, [melding, duurMs]);
  return [melding, setMelding] as const;
}

const STANDAARD_HINT =
  "Bewerkmodus: de gele velden zijn aanpasbaar; met × en + haal je regels weg of voeg je ze toe. Niets wordt bewaard tot je op Opslaan klikt.";

export default function BewerkBalk(p: {
  /** uitleg links naast de knoppen */
  intro: ReactNode;
  edit: boolean;
  melding: Melding | null;
  onBewerken: () => void;
  onOpslaan: () => void;
  onAnnuleren: () => void;
  /** na bevestiging "Ja": de standaardtekst terugzetten in het concept */
  onHerstel: () => void;
  /** extra knoppen naast "✎ Bewerken" (alleen buiten de bewerkmodus) */
  extraKnoppen?: ReactNode;
  /** notitie onder de balk (alleen buiten de bewerkmodus), bijv. "Aangepaste versie…" */
  notitie?: ReactNode;
  /** uitleg in bewerkmodus; standaard de algemene uitleg */
  hint?: ReactNode;
}) {
  const [resetVraag, setResetVraag] = useState(false);

  return (
    <>
      <div
        className={
          p.edit
            ? "sticky top-2 z-40 flex flex-wrap items-center justify-between gap-3 rounded-xl border border-amber-300 bg-white/95 px-4 py-2.5 shadow-md backdrop-blur"
            : "flex flex-wrap items-start justify-between gap-3"
        }
      >
        {p.edit ? (
          <p className="text-sm font-semibold text-amber-900">
            Je bent aan het bewerken. Opslaan bewaart alles in de sessie; deze balk blijft in beeld.
          </p>
        ) : (
          <p className="text-sm text-gray-600 max-w-3xl">{p.intro}</p>
        )}
        <div className="flex flex-none flex-wrap gap-2">
          {!p.edit ? (
            <>
              <button
                type="button"
                onClick={p.onBewerken}
                className={`${KNOP} bg-cito-blue text-white hover:bg-cito-blue/90`}
              >
                ✎ Bewerken
              </button>
              {p.extraKnoppen}
            </>
          ) : (
            <>
              <button
                type="button"
                onClick={() => {
                  setResetVraag(false);
                  p.onOpslaan();
                }}
                className={`${KNOP} bg-emerald-600 text-white hover:bg-emerald-700`}
              >
                Opslaan
              </button>
              <button
                type="button"
                onClick={() => {
                  setResetVraag(false);
                  p.onAnnuleren();
                }}
                className={`${KNOP} border border-gray-300 text-gray-700 bg-white hover:bg-gray-50`}
              >
                Annuleren
              </button>
              {!resetVraag ? (
                <button
                  type="button"
                  onClick={() => setResetVraag(true)}
                  className={`${KNOP} border border-amber-300 text-amber-800 bg-amber-50 hover:bg-amber-100`}
                >
                  Terug naar voorstel-tekst
                </button>
              ) : (
                <span className="flex items-center gap-2 text-xs text-amber-900 bg-amber-50 border border-amber-300 rounded-lg px-3 py-2">
                  Alle aanpassingen vervangen door de voorstel-tekst?
                  <button
                    type="button"
                    onClick={() => {
                      setResetVraag(false);
                      p.onHerstel();
                    }}
                    className="font-bold underline"
                  >
                    Ja
                  </button>
                  <button type="button" onClick={() => setResetVraag(false)} className="underline">
                    Nee
                  </button>
                </span>
              )}
            </>
          )}
        </div>
      </div>

      {p.melding && (
        <div
          role="status"
          className={`text-sm rounded-lg px-4 py-2 border ${
            p.melding.soort === "ok"
              ? "bg-emerald-50 border-emerald-200 text-emerald-800"
              : "bg-blue-50 border-blue-200 text-blue-800"
          }`}
        >
          {p.melding.tekst}
        </div>
      )}
      {p.edit && (
        <div className="text-xs text-amber-900 bg-amber-50 border border-amber-200 rounded-lg px-4 py-2">
          {p.hint ?? STANDAARD_HINT}
        </div>
      )}
      {!p.edit && p.notitie && <div className="text-xs text-gray-500">{p.notitie}</div>}
    </>
  );
}
