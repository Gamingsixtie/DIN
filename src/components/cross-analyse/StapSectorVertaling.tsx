"use client";

import { useState } from "react";
import { SectorBadge } from "./shared";
import { computeFocusView } from "@/lib/stap5-focus";
import type { DINSession, Stap5Result, SectorName } from "@/lib/types";

interface StapSectorVertalingProps {
  session: DINSession;
  result?: Stap5Result;
}

// CHAIN_COLORS — accent (10% rule), border-l-4 only
const CHAIN_BORDER = {
  doelen: "border-l-[#003366]",
  baten: "border-l-[#0066cc]",
  vermogens: "border-l-[#0891b2]",
  inspanningen: "border-l-[#059669]",
} as const;

const SECTORS_ORDER: readonly SectorName[] = ["PO", "VO", "Zakelijk"] as const;

export default function StapSectorVertaling({ session, result }: StapSectorVertalingProps) {
  const [buitenScopeOpen, setBuitenScopeOpen] = useState(false);

  // Empty state A — geen doelen
  if (session.goals.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-12 text-center">
        <p className="text-sm font-semibold text-gray-700">Nog geen doelen beschikbaar</p>
        <p className="text-[13px] text-gray-500 mt-1">
          Importeer eerst de KiB-uitkomsten in stap 1.
        </p>
      </div>
    );
  }

  const view = computeFocusView(session);
  if (!view) {
    // Should not happen when goals.length > 0, but TypeScript narrowing
    return null;
  }

  const { focusGoal, focusBenefits, focusCaps, focusEfforts, outOfScopeCaps, outOfScopeEfforts } = view;

  // Empty state B — focusdoel maar geen cross-sector vermogens
  const hasCrossSectorData = focusCaps.length > 0;

  // Group baten per sector
  const batenGroupedBySector = SECTORS_ORDER.map((sectorKey) => ({
    sector: sectorKey,
    baten: focusBenefits.filter((b) => b.sectorId === sectorKey),
  }));

  return (
    <div className="space-y-8">
      {/* Intro */}
      <div>
        <p className="text-[13px] text-gray-700 leading-relaxed">
          Dit is de scherpste hefboom: de keten doel → baten → vermogens → inspanningen voor uw hoogste prioriteit.
          We tonen alleen het eerste doel omdat daar het meeste mandaat en de hoogste urgentie zit. Niet-geconsolideerde
          items zijn niet verdwenen — u vindt ze onderaan in &lsquo;Buiten scope voor nu&rsquo; en pakt ze later op.
        </p>
      </div>

      {/* Block 1: FocusDoelCard */}
      <section
        className={`bg-white border border-[#e2e8f0] rounded-lg p-6 border-l-4 ${CHAIN_BORDER.doelen}`}
        aria-labelledby="focus-doel-title"
      >
        <p className="text-[11px] font-semibold text-gray-500 uppercase tracking-wider">
          Focusdoel — prioriteit 1
        </p>
        <h4 id="focus-doel-title" className="text-lg font-semibold text-[#003366] mt-1">
          {focusGoal.name || focusGoal.description}
        </h4>
      </section>

      {/* Block 2: BatenPerSectorGroup */}
      <section aria-labelledby="baten-heading">
        <h4 id="baten-heading" className="text-sm font-semibold text-gray-700">
          Baten onder dit doel — per sector
        </h4>
        <p className="text-[13px] text-gray-500 mt-1 mb-4">
          Groen = deze baat wordt geraakt door de cross-sector aanpak. Rood = risico dat deze baat niet wordt gerealiseerd.
        </p>
        <div className="space-y-4">
          {batenGroupedBySector.map(({ sector, baten }) => (
            <div key={sector} className="space-y-2">
              <div className="flex items-center gap-2">
                <SectorBadge sector={sector} />
                <span className="text-[11px] font-semibold text-gray-500">
                  {baten.length} {baten.length === 1 ? "baat" : "baten"}
                </span>
              </div>
              {baten.length === 0 ? (
                <p className="text-[13px] text-gray-400 pl-3">Geen baten in deze sector onder dit doel.</p>
              ) : (
                <div className="space-y-2">
                  {baten.map((baat) => {
                    const dekking = result?.batenDekking.find((d) => d.baatId === baat.id);
                    const wordtGeraakt = dekking?.wordtGeraakt;
                    return (
                      <div
                        key={baat.id}
                        className={`border-l-4 ${CHAIN_BORDER.baten} bg-white border border-[#e2e8f0] rounded-r-lg pl-3 pr-3 py-2`}
                      >
                        <div className="flex items-start justify-between gap-2">
                          <span className="text-[13px] text-gray-700 flex-1">
                            {baat.title || baat.description}
                          </span>
                          {dekking ? (
                            wordtGeraakt ? (
                              <span className="text-[11px] font-semibold bg-green-50 text-green-700 border border-green-200 rounded px-1.5 py-0.5 whitespace-nowrap">
                                geraakt
                              </span>
                            ) : (
                              <span className="text-[11px] font-semibold bg-red-50 text-red-700 border border-red-200 rounded px-1.5 py-0.5 whitespace-nowrap">
                                risico
                              </span>
                            )
                          ) : (
                            <span
                              className="w-2 h-2 rounded-full bg-gray-300 shrink-0 mt-1.5"
                              aria-label="Wachten op AI-analyse"
                            />
                          )}
                        </div>
                        {dekking && !wordtGeraakt && dekking.risico && (
                          <p className="text-[13px] text-red-700 mt-1">
                            <span className="font-semibold">Risico: </span>
                            {dekking.risico}
                          </p>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          ))}
        </div>
      </section>

      {/* Block 3: CrossSectorVermogensList */}
      <section aria-labelledby="vermogens-heading">
        <h4 id="vermogens-heading" className="text-sm font-semibold text-gray-700 mb-3">
          Cross-sector vermogens die hefboom leveren
        </h4>
        {focusCaps.length === 0 ? (
          <div className="bg-white border border-[#e2e8f0] rounded-lg p-4">
            <p className="text-[13px] text-gray-600">
              Dit doel heeft nog geen cross-sector vermogens. Voer stap 4 (Consolidatie) uit of voeg gedeelde vermogens
              toe in de DIN-mapping, en kom daarna terug naar stap 5.
            </p>
          </div>
        ) : (
          <div className="space-y-2">
            {focusCaps.map((cap) => {
              const review = result?.vermogenReview.find((r) => r.vermogenId === cap.id);
              return (
                <div
                  key={cap.id}
                  className={`border-l-4 ${CHAIN_BORDER.vermogens} bg-white border border-[#e2e8f0] rounded-r-lg pl-3 pr-3 py-3`}
                >
                  <div className="flex items-start justify-between gap-2">
                    <span className="text-[13px] text-gray-700 flex-1">
                      {cap.title || cap.description}
                    </span>
                    <div className="flex gap-0.5 shrink-0">
                      {(cap.relatedSectors ?? []).map((s) => (
                        <SectorBadge key={s} sector={s} />
                      ))}
                    </div>
                  </div>
                  {review ? (
                    <div className="mt-2 text-[13px] text-gray-600">
                      <p className="leading-relaxed">{review.hefboomAnalyse}</p>
                      {review.suggestieAanscherping && (
                        <p className="mt-1 text-gray-500">
                          <span className="font-semibold">Aanscherping: </span>
                          {review.suggestieAanscherping}
                        </p>
                      )}
                    </div>
                  ) : (
                    <div className="mt-2 flex items-center gap-1.5">
                      <span
                        className="w-2 h-2 rounded-full bg-gray-300"
                        aria-label="Wachten op AI-analyse"
                      />
                      <span className="text-[11px] text-gray-400">AI-analyse nog niet gedraaid</span>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </section>

      {/* Block 4: GedeeldeInspanningenList */}
      <section aria-labelledby="inspanningen-heading">
        <h4 id="inspanningen-heading" className="text-sm font-semibold text-gray-700 mb-3">
          Gedeelde inspanningen onder deze vermogens
        </h4>
        {focusEfforts.length === 0 ? (
          <div className="bg-white border border-[#e2e8f0] rounded-lg p-4">
            <p className="text-[13px] text-gray-600">
              Nog geen gedeelde inspanningen. Stap 3 (Inspanningen-overlap) moet zijn doorlopen.
            </p>
          </div>
        ) : (
          <div className="space-y-2">
            {focusEfforts.map((effort) => {
              const review = result?.inspanningReview.find((r) => r.inspanningId === effort.id);
              const badgeClass =
                review?.breedteOordeel === "dekt_volledig"
                  ? "bg-green-50 text-green-700 border-green-200"
                  : review?.breedteOordeel === "moet_verbreed"
                  ? "bg-amber-50 text-amber-700 border-amber-200"
                  : review?.breedteOordeel === "mist_aspect"
                  ? "bg-red-50 text-red-700 border-red-200"
                  : "";
              const badgeLabel =
                review?.breedteOordeel === "dekt_volledig"
                  ? "dekt volledig"
                  : review?.breedteOordeel === "moet_verbreed"
                  ? "moet verbreed"
                  : review?.breedteOordeel === "mist_aspect"
                  ? "mist aspect"
                  : null;
              const sectors = (effort.responsibleSector ?? "")
                .split(",")
                .map((s) => s.trim())
                .filter(Boolean);
              return (
                <div
                  key={effort.id}
                  className={`border-l-4 ${CHAIN_BORDER.inspanningen} bg-white border border-[#e2e8f0] rounded-r-lg pl-3 pr-3 py-3`}
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex-1">
                      <p className="text-[13px] text-gray-700">{effort.title || effort.description}</p>
                      {sectors.length > 0 && (
                        <div className="flex gap-0.5 mt-1">
                          {sectors.map((s) => (
                            <SectorBadge key={s} sector={s} />
                          ))}
                        </div>
                      )}
                    </div>
                    {badgeLabel ? (
                      <span
                        className={`text-[11px] font-semibold border rounded px-1.5 py-0.5 whitespace-nowrap ${badgeClass}`}
                      >
                        {badgeLabel}
                      </span>
                    ) : (
                      <span
                        className="w-2 h-2 rounded-full bg-gray-300 shrink-0 mt-1.5"
                        aria-label="Wachten op AI-analyse"
                      />
                    )}
                  </div>
                  {review?.toelichting && (
                    <p className="mt-2 text-[13px] text-gray-600 leading-relaxed">{review.toelichting}</p>
                  )}
                  {review?.breedteOordeel === "moet_verbreed" && review.suggestieVerbreding && (
                    <p className="mt-1 text-[13px] text-amber-700">
                      <span className="font-semibold">Suggestie: </span>
                      {review.suggestieVerbreding}
                    </p>
                  )}
                  {review?.breedteOordeel === "mist_aspect" && review.suggestieVerbreding && (
                    <p className="mt-1 text-[13px] text-red-700">
                      <span className="font-semibold">Mist: </span>
                      {review.suggestieVerbreding}
                    </p>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </section>

      {/* Block 5: AISamenvattingBlock */}
      <section aria-labelledby="samenvatting-heading">
        <h4 id="samenvatting-heading" className="text-sm font-semibold text-gray-700 mb-2">
          AI-samenvatting
        </h4>
        {result?.samenvatting ? (
          <div className="bg-white border border-[#e2e8f0] rounded-lg p-4">
            <p className="text-[13px] text-gray-700 leading-relaxed">{result.samenvatting}</p>
          </div>
        ) : (
          <div className="bg-gray-50 border border-[#e2e8f0] rounded-lg p-4">
            <p className="text-[13px] text-gray-500">
              {hasCrossSectorData
                ? "De structurele keten staat klaar. Klik op 'Analyseer eerste doel' voor de AI-review van hefboomwerking en baten-dekking."
                : "Klik op 'Analyseer' om de hefboomanalyse, breedtebeoordeling en baten-dekking voor dit doel te zien."}
            </p>
          </div>
        )}
      </section>

      {/* Block 6: BuitenScopeFooter */}
      <div className="mt-12">
        <button
          onClick={() => setBuitenScopeOpen((v) => !v)}
          className="w-full min-h-[44px] flex items-center justify-between px-4 py-3 bg-gray-50 border border-[#e2e8f0] rounded-lg text-left hover:bg-gray-100 transition-colors"
          aria-expanded={buitenScopeOpen}
        >
          <span className="text-[13px] text-gray-700">
            <span className="font-semibold">Buiten scope voor nu</span>
            {" — "}
            {outOfScopeCaps.length} vermogens en {outOfScopeEfforts.length} inspanningen
          </span>
          <span className="text-[11px] font-semibold text-gray-500">
            {buitenScopeOpen ? "Verberg details" : "Toon details"}
          </span>
        </button>
        {buitenScopeOpen && (
          <div className="mt-3 px-4 py-3 bg-white border border-[#e2e8f0] rounded-lg space-y-3">
            <p className="text-[13px] text-gray-600">
              Deze items zijn niet geconsolideerd tot cross-sector hefbomen voor dit doel. Ze blijven beschikbaar voor
              latere doelen of vervolgstappen.
            </p>
            {outOfScopeCaps.length > 0 && (
              <div>
                <h5 className="text-[11px] font-semibold text-gray-500 uppercase tracking-wider mb-1">Vermogens</h5>
                <ul className="space-y-1">
                  {outOfScopeCaps.map((c) => (
                    <li key={c.id} className="text-[13px] text-gray-700 flex items-center gap-2">
                      <span className="flex-1">{c.title || c.description}</span>
                      {c.sectorId && <SectorBadge sector={c.sectorId} />}
                    </li>
                  ))}
                </ul>
              </div>
            )}
            {outOfScopeEfforts.length > 0 && (
              <div>
                <h5 className="text-[11px] font-semibold text-gray-500 uppercase tracking-wider mb-1">Inspanningen</h5>
                <ul className="space-y-1">
                  {outOfScopeEfforts.map((e) => (
                    <li key={e.id} className="text-[13px] text-gray-700 flex items-center gap-2">
                      <span className="flex-1">{e.title || e.description}</span>
                      {e.sectorId && <SectorBadge sector={e.sectorId} />}
                    </li>
                  ))}
                </ul>
              </div>
            )}
            {outOfScopeCaps.length === 0 && outOfScopeEfforts.length === 0 && (
              <p className="text-[13px] text-gray-500">Er zijn geen items buiten scope.</p>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
