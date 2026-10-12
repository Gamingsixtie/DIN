"use client";

// Stap 12 — tabblad "De vier punten": de vier (gele) punten uit de opmerking van Sanne
// (12-10) als vier kaarten met geel accent. Per punt wat er al is (uit de analyses, met
// citaat en vindplaats) en welke acties nog te doen zijn (met bron-label); leeg = "te bepalen".
// Berekening via berekenPuntenOverzicht (deterministisch, dezelfde functie als de export).
// Per punt een bewerkbare conclusie. Geen useSession: alles via props.

import { useMemo, useState } from "react";
import type { BronnenAnalyse } from "@/lib/schemas";
import { GEEL_PUNTEN, GEEL_PUNTEN_BRON } from "@/lib/bronnenanalyse-default";
import { berekenPuntenOverzicht } from "@/lib/bronnenanalyse-service";
import CitaatBadge from "@/components/bronnen/CitaatBadge";
import { KNOP_LINK, MeldingRegel, TeBepalen, type Melding } from "@/components/bronnen/BronnenRegisterTab";
import { Conclusie } from "@/components/bronnen/DekkingMatrixTab";

type Props = {
  ba: BronnenAnalyse;
  onWijzig: (nieuw: BronnenAnalyse) => void;
  werkstromen: { id: string; naam: string }[];
  onOpenBron: (bronId: string) => void;
};

export default function VierPuntenTab({ ba, onWijzig, onOpenBron }: Props) {
  const punten = useMemo(() => berekenPuntenOverzicht(ba), [ba]);
  const [melding, setMelding] = useState<Melding | null>(null);

  return (
    <div className="space-y-4">
      <div>
        <h3 className="text-lg font-bold text-[#003366]">De vier punten</h3>
        <p className="mt-0.5 text-sm text-gray-800">
          <span className="font-semibold">Bron:</span> {GEEL_PUNTEN_BRON}
        </p>
      </div>
      <MeldingRegel melding={melding} />

      <div className="grid gap-4 lg:grid-cols-2">
        {punten.map((p) => {
          const info = GEEL_PUNTEN.find((g) => g.id === p.punt);
          return (
            <article
              key={p.punt}
              className="overflow-hidden rounded-xl border border-yellow-300 border-l-4 border-l-yellow-400 bg-white"
              aria-label={`Punt ${p.nummer}: ${p.titel}`}
            >
              <header className="bg-yellow-100 px-4 py-3">
                <div className="flex items-start gap-3">
                  <span className="inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-yellow-400 text-sm font-bold text-gray-900">
                    {p.nummer}
                  </span>
                  <div>
                    <h4 className="text-base font-bold text-gray-900">{p.titel}</h4>
                    {info?.omschrijving && <p className="mt-0.5 text-sm text-gray-800">{info.omschrijving}</p>}
                  </div>
                </div>
                {p.noot && (
                  <p className="mt-2 rounded-md border border-yellow-500 bg-yellow-50 px-2 py-1 text-sm font-semibold text-gray-900">
                    Noot: {p.noot}
                  </p>
                )}
              </header>

              <div className="space-y-3 px-4 py-3">
                <section>
                  <h5 className="text-sm font-bold text-[#003366]">Wat is er al</h5>
                  {p.watErAl.length === 0 ? (
                    <p className="mt-1">
                      <TeBepalen />
                    </p>
                  ) : (
                    <ul className="mt-1 space-y-2">
                      {p.watErAl.map((w, i) => (
                        <li key={i} className="rounded-lg border border-slate-300 p-2">
                          <button type="button" className={KNOP_LINK + " text-sm"} onClick={() => onOpenBron(w.bronId)}>
                            {w.bronTitel || "—"}
                          </button>
                          <p className="mt-0.5 text-sm text-gray-900">{w.watErAlIs}</p>
                          <div className="mt-0.5">
                            <CitaatBadge citaat={w.citaat} vindplaats={w.vindplaats} geverifieerd={w.citaatGeverifieerd} compact />
                          </div>
                        </li>
                      ))}
                    </ul>
                  )}
                </section>

                <section>
                  <h5 className="text-sm font-bold text-[#003366]">Acties nog te doen</h5>
                  {p.acties.length === 0 ? (
                    <p className="mt-1">
                      <TeBepalen />
                    </p>
                  ) : (
                    <ul className="mt-1 list-disc space-y-1 pl-5 text-sm text-gray-900">
                      {p.acties.map((a, i) => (
                        <li key={i}>
                          {a.tekst} <span className="text-gray-700">(bron: {a.bron || "—"})</span>
                        </li>
                      ))}
                    </ul>
                  )}
                </section>

                <Conclusie
                  tekst={ba.puntConclusies[p.punt] ?? ""}
                  onOpslaan={(t) => {
                    onWijzig({ ...ba, puntConclusies: { ...ba.puntConclusies, [p.punt]: t.trim() } });
                    setMelding({ soort: "klaar", tekst: `Conclusie bij punt ${p.nummer} opgeslagen.` });
                  }}
                />
              </div>
            </article>
          );
        })}
      </div>
    </div>
  );
}
