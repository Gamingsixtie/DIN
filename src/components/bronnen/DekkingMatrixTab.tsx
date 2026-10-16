"use client";

// Stap 12 — tabblad "Dekking per werkstroom".
// Bovenaan per werkstroom het oordeel (startklaar / deels / wacht op) — altijd een VOORSTEL
// tot Pim of de stuurgroep het vaststelt. Daaronder de matrix uit berekenDekkingMatrix
// (deterministisch, dezelfde functie als de Word-export): wat hebben we al, wat is bruikbaar,
// wat is nog nodig. Elke cel toont een bron-label of letterlijk "te bepalen".
// Per werkstroom een bewerkbare conclusie. Geen useSession: alles via props.

import { useMemo, useState, type ReactNode } from "react";
import type { BronnenAnalyse, WerkstroomOordeel } from "@/lib/schemas";
import { NOG_NODIG_STATUS_LABELS, OORDEEL_LABELS, TE_BEPALEN, VOORSTEL_LABEL } from "@/lib/bronnenanalyse-default";
import { berekenDekkingMatrix, type DekkingCel } from "@/lib/bronnenanalyse-service";
import CitaatBadge from "@/components/bronnen/CitaatBadge";
import {
  DomeinPillen,
  Etiket,
  KAART,
  KNOP_LINK,
  KNOP_PRIMAIR,
  KNOP_SECUNDAIR,
  LABEL,
  MeldingRegel,
  StatusBadge,
  TeBepalen,
  VELD,
  type Melding,
} from "@/components/bronnen/BronnenRegisterTab";

type Props = {
  ba: BronnenAnalyse;
  onWijzig: (nieuw: BronnenAnalyse) => void;
  werkstromen: { id: string; naam: string }[];
  onOpenBron: (bronId: string) => void;
};

type OordeelWaarde = WerkstroomOordeel["oordeel"];
const OORDELEN = Object.keys(OORDEEL_LABELS) as OordeelWaarde[];

const OORDEEL_STIJL: Record<OordeelWaarde, { rand: string; etiket: "groen" | "amber" | "rood" }> = {
  startklaar: { rand: "border-l-emerald-500", etiket: "groen" },
  deels_startklaar: { rand: "border-l-amber-500", etiket: "amber" },
  wacht_op: { rand: "border-l-orange-600", etiket: "rood" },
};

export default function DekkingMatrixTab({ ba, onWijzig, werkstromen, onOpenBron }: Props) {
  const matrix = useMemo(() => berekenDekkingMatrix(ba, werkstromen), [ba, werkstromen]);
  const [melding, setMelding] = useState<Melding | null>(null);

  function zetOordeel(werkstroom: string, wijziging: Partial<WerkstroomOordeel>, tekst: string) {
    const bestaand = ba.werkstroomOordelen.find((o) => o.werkstroom === werkstroom);
    const nieuw: WerkstroomOordeel = {
      werkstroom,
      oordeel: bestaand?.oordeel ?? "deels_startklaar",
      wachtOp: bestaand?.wachtOp ?? "",
      toelichting: bestaand?.toelichting ?? "",
      voorstel: bestaand?.voorstel ?? true,
      ...wijziging,
      bewerkt: true,
    };
    onWijzig({
      ...ba,
      werkstroomOordelen: bestaand
        ? ba.werkstroomOordelen.map((o) => (o.werkstroom === werkstroom ? nieuw : o))
        : [...ba.werkstroomOordelen, nieuw],
    });
    setMelding({ soort: "klaar", tekst });
  }

  function zetConclusie(werkstroom: string, tekst: string) {
    onWijzig({ ...ba, werkstroomConclusies: { ...ba.werkstroomConclusies, [werkstroom]: tekst.trim() } });
    setMelding({ soort: "klaar", tekst: "Conclusie opgeslagen." });
  }

  if (werkstromen.length === 0) {
    return (
      <section className={KAART}>
        <p className="text-sm text-gray-900">Er staan nog geen werkstromen in het organigram (stap 10).</p>
      </section>
    );
  }

  return (
    <div className="space-y-4">
      <MeldingRegel melding={melding} />

      <section aria-label="Oordeel per werkstroom">
        <h3 className="text-lg font-bold text-[#003366]">Oordeel per werkstroom</h3>
        <p className="mt-0.5 text-sm text-gray-700">
          Kan de werkstroom starten? Elk oordeel is een voorstel; het besluit ligt bij Pim en de stuurgroep.
        </p>
        <div className="mt-3 grid gap-3 md:grid-cols-2">
          {werkstromen.map((w) => (
            <OordeelKaart
              key={w.id}
              naam={w.naam}
              oordeel={ba.werkstroomOordelen.find((o) => o.werkstroom === w.id)}
              onOpslaan={(wijziging) => zetOordeel(w.id, wijziging, `Oordeel voor ${w.naam} opgeslagen.`)}
            />
          ))}
        </div>
      </section>

      <section aria-label="Dekkingsmatrix" className={KAART}>
        <h3 className="text-lg font-bold text-[#003366]">Dekking per werkstroom</h3>
        <p className="mt-0.5 text-sm text-gray-700">
          Per werkstroom wat de bronnen al leveren, wat daarvan bruikbaar is en wat nog nodig is. Klik op een bron om de
          analyse te openen.
        </p>
        <div className="mt-3 hidden grid-cols-[minmax(140px,1fr)_2fr_2fr_2fr] gap-3 border-b-2 border-[#003366] pb-2 text-sm font-semibold text-[#003366] lg:grid">
          <span>Werkstroom</span>
          <span>Wat hebben we al</span>
          <span>Bruikbaar</span>
          <span>Nog nodig</span>
        </div>
        <div className="divide-y divide-slate-300">
          {matrix.map((rij) => (
            <div key={rij.werkstroom} className="py-3">
              <div className="grid gap-3 lg:grid-cols-[minmax(140px,1fr)_2fr_2fr_2fr]">
                <div className="text-sm font-bold text-gray-900">{rij.naam}</div>
                <Kolom titel="Wat hebben we al">
                  {rij.watHebbenWeAl.length === 0 ? (
                    <TeBepalen />
                  ) : (
                    rij.watHebbenWeAl.map((c, i) => <Cel key={i} cel={c} onOpenBron={onOpenBron} />)
                  )}
                </Kolom>
                <Kolom titel="Bruikbaar">
                  {rij.bruikbaar.length === 0 ? (
                    <TeBepalen />
                  ) : (
                    rij.bruikbaar.map((c, i) => <Cel key={i} cel={c} onOpenBron={onOpenBron} />)
                  )}
                </Kolom>
                <Kolom titel="Nog nodig">
                  {rij.nogNodig.length === 0 && rij.openPuntenUitBronnen.length === 0 ? (
                    <TeBepalen />
                  ) : (
                    <ul className="space-y-1.5">
                      {rij.nogNodig.map((n) => (
                        <li key={n.id} className="text-sm text-gray-900">
                          <span className={n.tekst === TE_BEPALEN ? "italic text-gray-700" : ""}>{n.tekst}</span>
                          {n.actie && <span className="text-gray-800"> — {n.actie}</span>}
                          <div className="mt-0.5 flex flex-wrap items-center gap-1.5 text-xs text-gray-800">
                            <Etiket kleur="grijs">{NOG_NODIG_STATUS_LABELS[n.status]}</Etiket>
                            <span>Bron: {n.bron || "—"}</span>
                          </div>
                        </li>
                      ))}
                      {rij.openPuntenUitBronnen.map((o, i) => (
                        <li key={`o${i}`} className="text-sm text-gray-900">
                          {o.tekst}
                          <div className="mt-0.5 text-xs text-gray-800">
                            Open punt uit{" "}
                            <button type="button" className={KNOP_LINK} onClick={() => onOpenBron(o.bronId)}>
                              {o.bronTitel || "—"}
                            </button>
                          </div>
                        </li>
                      ))}
                    </ul>
                  )}
                </Kolom>
              </div>
              <Conclusie
                tekst={ba.werkstroomConclusies[rij.werkstroom] ?? ""}
                onOpslaan={(t) => zetConclusie(rij.werkstroom, t)}
              />
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}

// ---------- onderdelen ----------

function Kolom({ titel, children }: { titel: string; children: ReactNode }) {
  return (
    <div className="space-y-2">
      <p className="text-xs font-semibold text-[#003366] lg:hidden">{titel}</p>
      {children}
    </div>
  );
}

function Cel({ cel, onOpenBron }: { cel: DekkingCel; onOpenBron: (id: string) => void }) {
  return (
    <div className="rounded-lg border border-slate-300 p-2">
      <div className="flex flex-wrap items-center gap-1.5">
        <button type="button" className={KNOP_LINK + " text-sm"} onClick={() => onOpenBron(cel.bronId)}>
          {cel.bronTitel || "—"}
        </button>
        <StatusBadge status={cel.status} />
      </div>
      <p className="mt-1 line-clamp-3 text-sm text-gray-900">{cel.dekt}</p>
      {cel.domeinen.length > 0 && (
        <div className="mt-1">
          <DomeinPillen domeinen={cel.domeinen} />
        </div>
      )}
      {cel.citaat.trim() && (
        // Een niet letterlijk teruggevonden citaat staat standaard open, zodat de waarschuwing zichtbaar is.
        <details className="mt-1" open={cel.citaatGeverifieerd === false}>
          <summary className="cursor-pointer text-xs font-semibold text-[#003366]">Citaat en vindplaats</summary>
          <div className="mt-1">
            <CitaatBadge citaat={cel.citaat} vindplaats={cel.vindplaats} geverifieerd={cel.citaatGeverifieerd} compact />
          </div>
        </details>
      )}
    </div>
  );
}

function OordeelKaart({
  naam,
  oordeel,
  onOpslaan,
}: {
  naam: string;
  oordeel: WerkstroomOordeel | undefined;
  onOpslaan: (wijziging: Partial<WerkstroomOordeel>) => void;
}) {
  const [edit, setEdit] = useState(false);
  const [waarde, setWaarde] = useState<OordeelWaarde>(oordeel?.oordeel ?? "deels_startklaar");
  const [wachtOp, setWachtOp] = useState(oordeel?.wachtOp ?? "");
  const [toelichting, setToelichting] = useState(oordeel?.toelichting ?? "");

  function start() {
    setWaarde(oordeel?.oordeel ?? "deels_startklaar");
    setWachtOp(oordeel?.wachtOp ?? "");
    setToelichting(oordeel?.toelichting ?? "");
    setEdit(true);
  }

  const stijl = oordeel ? OORDEEL_STIJL[oordeel.oordeel] : null;

  return (
    <div className={"rounded-xl border border-slate-300 border-l-4 bg-white p-4 " + (stijl?.rand ?? "border-l-slate-400")}>
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h4 className="text-base font-bold text-gray-900">{naam}</h4>
        {oordeel?.voorstel !== false ? <Etiket kleur="blauw">{VOORSTEL_LABEL}</Etiket> : <Etiket kleur="groen">Vastgesteld</Etiket>}
      </div>

      {!edit ? (
        <>
          <div className="mt-2">
            {oordeel ? (
              <Etiket kleur={stijl!.etiket}>
                {oordeel.oordeel === "wacht_op"
                  ? `Wacht op ${oordeel.wachtOp.trim() ? oordeel.wachtOp : TE_BEPALEN}`
                  : OORDEEL_LABELS[oordeel.oordeel]}
              </Etiket>
            ) : (
              <TeBepalen prefix="Oordeel" />
            )}
          </div>
          {oordeel?.toelichting?.trim() && <p className="mt-2 text-sm text-gray-900">{oordeel.toelichting}</p>}
          <div className="mt-3 flex flex-wrap gap-2">
            <button type="button" className={KNOP_SECUNDAIR} onClick={start}>
              {oordeel ? "Bewerken" : "Oordeel invullen"}
            </button>
            {oordeel && oordeel.voorstel !== false && (
              <button type="button" className={KNOP_SECUNDAIR} onClick={() => onOpslaan({ voorstel: false })}>
                Vastgesteld
              </button>
            )}
            {oordeel && oordeel.voorstel === false && (
              <button type="button" className={KNOP_SECUNDAIR} onClick={() => onOpslaan({ voorstel: true })}>
                Terug naar voorstel
              </button>
            )}
          </div>
        </>
      ) : (
        <div className="mt-2 space-y-2">
          <label className={LABEL}>
            Oordeel
            <select className={VELD} value={waarde} onChange={(e) => setWaarde(e.target.value as OordeelWaarde)}>
              {OORDELEN.map((o) => (
                <option key={o} value={o}>
                  {OORDEEL_LABELS[o]}
                </option>
              ))}
            </select>
          </label>
          {waarde === "wacht_op" && (
            <label className={LABEL}>
              Wacht op
              <input className={VELD} value={wachtOp} onChange={(e) => setWachtOp(e.target.value)} />
            </label>
          )}
          <label className={LABEL}>
            Toelichting
            <textarea className={VELD} value={toelichting} onChange={(e) => setToelichting(e.target.value)} />
          </label>
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              className={KNOP_PRIMAIR}
              onClick={() => {
                onOpslaan({
                  oordeel: waarde,
                  wachtOp: waarde === "wacht_op" ? wachtOp.trim() : "",
                  toelichting: toelichting.trim(),
                });
                setEdit(false);
              }}
            >
              Opslaan
            </button>
            <button type="button" className={KNOP_SECUNDAIR} onClick={() => setEdit(false)}>
              Annuleren
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

/** Bewerkbare conclusie (patroon OrganigramStep: bewerken → Opslaan/Annuleren). */
export function Conclusie({ tekst, onOpslaan }: { tekst: string; onOpslaan: (t: string) => void }) {
  const [edit, setEdit] = useState(false);
  const [concept, setConcept] = useState(tekst);
  return (
    <div className="mt-3 rounded-lg bg-slate-50 px-3 py-2">
      {!edit ? (
        <div className="flex flex-wrap items-start justify-between gap-2">
          <p className="text-sm text-gray-900">
            <span className="font-semibold text-[#003366]">Conclusie: </span>
            {tekst.trim() ? tekst : <span className="italic text-gray-700">{TE_BEPALEN}</span>}
          </p>
          <button
            type="button"
            className={KNOP_SECUNDAIR}
            onClick={() => {
              setConcept(tekst);
              setEdit(true);
            }}
          >
            Conclusie bewerken
          </button>
        </div>
      ) : (
        <div className="space-y-2">
          <label className={LABEL}>
            Conclusie
            <textarea className={VELD} value={concept} onChange={(e) => setConcept(e.target.value)} />
          </label>
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              className={KNOP_PRIMAIR}
              onClick={() => {
                onOpslaan(concept);
                setEdit(false);
              }}
            >
              Opslaan
            </button>
            <button type="button" className={KNOP_SECUNDAIR} onClick={() => setEdit(false)}>
              Annuleren
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
