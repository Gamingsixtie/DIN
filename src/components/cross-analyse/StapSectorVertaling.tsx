"use client";

import { useState } from "react";
import { SectorBadge } from "./shared";
import { computeFocusView } from "@/lib/stap5-focus";
import type {
  DINSession,
  Stap5Result,
  SectorName,
  DINBenefit,
  DINCapability,
  DINEffort,
} from "@/lib/types";

interface StapSectorVertalingProps {
  session: DINSession;
  result?: Stap5Result;
}

const SECTORS_ORDER: readonly SectorName[] = ["PO", "VO", "Zakelijk"] as const;

const DOMAIN_LABELS: Record<string, string> = {
  mens: "Mens",
  processen: "Processen",
  data_systemen: "Data & Systemen",
  cultuur: "Cultuur",
};

const DOMAIN_COLORS: Record<string, string> = {
  mens: "bg-blue-50 text-blue-700 border-blue-200",
  processen: "bg-green-50 text-green-700 border-green-200",
  data_systemen: "bg-purple-50 text-purple-700 border-purple-200",
  cultuur: "bg-amber-50 text-amber-700 border-amber-200",
};

export default function StapSectorVertaling({ session, result }: StapSectorVertalingProps) {
  const [buitenScopeOpen, setBuitenScopeOpen] = useState(false);

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
  if (!view) return null;

  const { focusGoal, focusBenefits, focusCaps, focusEfforts, outOfScopeCaps, outOfScopeEfforts } = view;

  // Build hierarchical chain: Baat → Vermogens → Inspanningen
  const benefitCapMaps = session.benefitCapabilityMaps ?? [];
  const capEffMaps = session.capabilityEffortMaps ?? [];

  const focusCapSet = new Set(focusCaps.map((c) => c.id));
  const focusEffortSet = new Set(focusEfforts.map((e) => e.id));

  // For each benefit, find linked capabilities (within focus scope)
  function getCapsForBenefit(benefitId: string): DINCapability[] {
    const capIds = benefitCapMaps
      .filter((m) => m.benefitId === benefitId)
      .map((m) => m.capabilityId)
      .filter((id) => focusCapSet.has(id));
    return focusCaps.filter((c) => capIds.includes(c.id));
  }

  // For each capability, find linked efforts (within focus scope)
  function getEffortsForCap(capId: string): DINEffort[] {
    const effIds = capEffMaps
      .filter((m) => m.capabilityId === capId)
      .map((m) => m.effortId)
      .filter((id) => focusEffortSet.has(id));
    return focusEfforts.filter((e) => effIds.includes(e.id));
  }

  // Find efforts not linked to any focus cap (orphans)
  const linkedEffortIds = new Set(
    focusCaps.flatMap((cap) =>
      capEffMaps
        .filter((m) => m.capabilityId === cap.id)
        .map((m) => m.effortId)
    )
  );
  const orphanEfforts = focusEfforts.filter((e) => !linkedEffortIds.has(e.id));

  // Find caps not linked to any focus benefit (orphans)
  const linkedCapIds = new Set(
    focusBenefits.flatMap((b) =>
      benefitCapMaps
        .filter((m) => m.benefitId === b.id)
        .map((m) => m.capabilityId)
    )
  );
  const orphanCaps = focusCaps.filter((c) => !linkedCapIds.has(c.id));

  // Group baten per sector for display
  const batenBySector = SECTORS_ORDER.map((s) => ({
    sector: s,
    baten: focusBenefits.filter((b) => b.sectorId === s),
  })).filter(({ baten }) => baten.length > 0);

  // Sector origin text for efforts
  function sectorOriginText(effort: DINEffort): string {
    const sectors = (effort.responsibleSector ?? "")
      .split(",")
      .map((s) => s.trim())
      .filter(Boolean);
    if (sectors.length <= 1) return "";
    return sectors.join(" + ");
  }

  return (
    <div className="space-y-8">
      {/* Intro */}
      <div>
        <p className="text-[13px] text-gray-700 leading-relaxed">
          Het geconsolideerde DIN-netwerk voor uw hoogste prioriteit. De keten toont per baat welke
          vermogens en inspanningen daaraan werken — na consolidatie uit stap 4. Per inspanning ziet u
          de sectorale herkomst en het domein.
        </p>
      </div>

      {/* Focusdoel */}
      <section className="bg-white border border-[#e2e8f0] rounded-lg p-6 border-l-4 border-l-[#003366]">
        <p className="text-[11px] font-semibold text-gray-500 uppercase tracking-wider">
          Focusdoel — prioriteit 1
        </p>
        <h4 className="text-lg font-semibold text-[#003366] mt-1">
          {focusGoal.name || focusGoal.description}
        </h4>
      </section>

      {/* Hierarchische DIN-keten per sector */}
      {batenBySector.map(({ sector, baten }) => (
        <section key={sector} className="space-y-3">
          <div className="flex items-center gap-2">
            <SectorBadge sector={sector} />
            <span className="text-[11px] font-semibold text-gray-500">
              {baten.length} {baten.length === 1 ? "baat" : "baten"}
            </span>
          </div>

          {baten.map((baat) => {
            const dekking = result?.batenDekking.find((d) => d.baatId === baat.id);
            const caps = getCapsForBenefit(baat.id);

            return (
              <div key={baat.id} className="space-y-0">
                {/* Baat */}
                <div className="border-l-4 border-l-[#0066cc] bg-white border border-[#e2e8f0] rounded-tr-lg rounded-br-lg pl-4 pr-4 py-3">
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex-1">
                      <p className="text-[11px] font-semibold text-[#0066cc] uppercase tracking-wider mb-0.5">Baat</p>
                      <p className="text-[13px] font-medium text-gray-800">
                        {baat.title || baat.description}
                      </p>
                    </div>
                    {dekking ? (
                      dekking.wordtGeraakt ? (
                        <span className="text-[11px] font-semibold bg-green-50 text-green-700 border border-green-200 rounded px-1.5 py-0.5 whitespace-nowrap">
                          geraakt
                        </span>
                      ) : (
                        <span className="text-[11px] font-semibold bg-red-50 text-red-700 border border-red-200 rounded px-1.5 py-0.5 whitespace-nowrap">
                          risico
                        </span>
                      )
                    ) : (
                      <span className="w-2 h-2 rounded-full bg-gray-300 shrink-0 mt-1.5" />
                    )}
                  </div>
                  {dekking && !dekking.wordtGeraakt && dekking.risico && (
                    <p className="text-[12px] text-red-600 mt-1">
                      <span className="font-semibold">Risico: </span>{dekking.risico}
                    </p>
                  )}
                  {dekking?.wordtGeraakt && dekking.redenering && (
                    <p className="text-[12px] text-gray-500 mt-1">{dekking.redenering}</p>
                  )}
                </div>

                {/* Vermogens onder deze baat */}
                {caps.length > 0 && (
                  <div className="ml-6 space-y-0">
                    {caps.map((cap) => {
                      const review = result?.vermogenReview.find((r) => r.vermogenId === cap.id);
                      const efforts = getEffortsForCap(cap.id);

                      return (
                        <div key={cap.id} className="space-y-0">
                          {/* Vermogen */}
                          <div className="border-l-4 border-l-[#0891b2] bg-white border border-[#e2e8f0] rounded-tr-lg rounded-br-lg pl-4 pr-4 py-3 mt-1">
                            <div className="flex items-start justify-between gap-2">
                              <div className="flex-1">
                                <p className="text-[11px] font-semibold text-[#0891b2] uppercase tracking-wider mb-0.5">Vermogen</p>
                                <p className="text-[13px] font-medium text-gray-800">
                                  {cap.title || cap.description}
                                </p>
                              </div>
                              <div className="flex gap-0.5 shrink-0">
                                {(cap.relatedSectors ?? []).map((s) => (
                                  <SectorBadge key={s} sector={s} />
                                ))}
                              </div>
                            </div>
                            {review && (
                              <div className="mt-2 text-[12px] text-gray-600">
                                <p className="leading-relaxed">{review.hefboomAnalyse}</p>
                                {review.suggestieAanscherping && (
                                  <p className="mt-1 text-gray-500">
                                    <span className="font-semibold">Aanscherping: </span>
                                    {review.suggestieAanscherping}
                                  </p>
                                )}
                              </div>
                            )}
                          </div>

                          {/* Inspanningen onder dit vermogen */}
                          {efforts.length > 0 && (
                            <div className="ml-6 space-y-1 mt-1">
                              {efforts.map((effort) => {
                                const efReview = result?.inspanningReview.find((r) => r.inspanningId === effort.id);
                                const sectorText = sectorOriginText(effort);
                                const domainLabel = DOMAIN_LABELS[effort.domain] || effort.domain;
                                const domainColor = DOMAIN_COLORS[effort.domain] || "bg-gray-50 text-gray-600 border-gray-200";

                                return (
                                  <div
                                    key={effort.id}
                                    className="border-l-4 border-l-[#059669] bg-white border border-[#e2e8f0] rounded-tr-lg rounded-br-lg pl-4 pr-4 py-2.5"
                                  >
                                    <div className="flex items-start justify-between gap-2">
                                      <div className="flex-1">
                                        <div className="flex items-center gap-2 mb-0.5">
                                          <p className="text-[11px] font-semibold text-[#059669] uppercase tracking-wider">Inspanning</p>
                                          <span className={`text-[10px] font-semibold border rounded px-1 py-0.5 ${domainColor}`}>
                                            {domainLabel}
                                          </span>
                                        </div>
                                        <p className="text-[13px] text-gray-800">
                                          {effort.title || effort.description}
                                        </p>
                                        {sectorText && (
                                          <p className="text-[11px] text-gray-400 mt-0.5">
                                            Sectoren: {sectorText}
                                          </p>
                                        )}
                                      </div>
                                      {efReview?.breedteOordeel && (
                                        <span
                                          className={`text-[11px] font-semibold border rounded px-1.5 py-0.5 whitespace-nowrap ${
                                            efReview.breedteOordeel === "dekt_volledig"
                                              ? "bg-green-50 text-green-700 border-green-200"
                                              : efReview.breedteOordeel === "moet_verbreed"
                                              ? "bg-amber-50 text-amber-700 border-amber-200"
                                              : "bg-red-50 text-red-700 border-red-200"
                                          }`}
                                        >
                                          {efReview.breedteOordeel === "dekt_volledig"
                                            ? "dekt volledig"
                                            : efReview.breedteOordeel === "moet_verbreed"
                                            ? "moet verbreed"
                                            : "mist aspect"}
                                        </span>
                                      )}
                                    </div>
                                    {efReview?.toelichting && (
                                      <p className="mt-1 text-[12px] text-gray-600">{efReview.toelichting}</p>
                                    )}
                                    {efReview?.suggestieVerbreding && (
                                      <p className="mt-1 text-[12px] text-amber-700">
                                        <span className="font-semibold">Suggestie: </span>{efReview.suggestieVerbreding}
                                      </p>
                                    )}
                                  </div>
                                );
                              })}
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            );
          })}
        </section>
      ))}

      {/* Orphan capabilities (gekoppeld aan focusdoel maar niet aan specifieke baat) */}
      {orphanCaps.length > 0 && (
        <section className="space-y-2">
          <h4 className="text-sm font-semibold text-gray-700">
            Overige cross-sector vermogens
            <span className="text-xs font-normal text-gray-400 ml-2">
              (gekoppeld aan dit doel, niet aan een specifieke baat)
            </span>
          </h4>
          {orphanCaps.map((cap) => {
            const efforts = getEffortsForCap(cap.id);
            const review = result?.vermogenReview.find((r) => r.vermogenId === cap.id);
            return (
              <div key={cap.id}>
                <div className="border-l-4 border-l-[#0891b2] bg-white border border-[#e2e8f0] rounded-tr-lg rounded-br-lg pl-4 pr-4 py-3">
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex-1">
                      <p className="text-[11px] font-semibold text-[#0891b2] uppercase tracking-wider mb-0.5">Vermogen</p>
                      <p className="text-[13px] font-medium text-gray-800">{cap.title || cap.description}</p>
                    </div>
                    <div className="flex gap-0.5 shrink-0">
                      {(cap.relatedSectors ?? []).map((s) => (
                        <SectorBadge key={s} sector={s} />
                      ))}
                    </div>
                  </div>
                  {review && (
                    <p className="mt-2 text-[12px] text-gray-600">{review.hefboomAnalyse}</p>
                  )}
                </div>
                {efforts.length > 0 && (
                  <div className="ml-6 space-y-1 mt-1">
                    {efforts.map((effort) => (
                      <div key={effort.id} className="border-l-4 border-l-[#059669] bg-white border border-[#e2e8f0] rounded-tr-lg rounded-br-lg pl-4 pr-4 py-2">
                        <p className="text-[13px] text-gray-800">{effort.title || effort.description}</p>
                        {sectorOriginText(effort) && (
                          <p className="text-[11px] text-gray-400 mt-0.5">Sectoren: {sectorOriginText(effort)}</p>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            );
          })}
        </section>
      )}

      {/* Orphan efforts (niet gekoppeld aan een vermogen) */}
      {orphanEfforts.length > 0 && (
        <section className="space-y-2">
          <h4 className="text-sm font-semibold text-gray-700">
            Overige gedeelde inspanningen
            <span className="text-xs font-normal text-gray-400 ml-2">
              (niet gekoppeld aan een cross-sector vermogen)
            </span>
          </h4>
          {orphanEfforts.map((effort) => (
            <div key={effort.id} className="border-l-4 border-l-[#059669] bg-white border border-[#e2e8f0] rounded-tr-lg rounded-br-lg pl-4 pr-4 py-2.5">
              <p className="text-[13px] text-gray-800">{effort.title || effort.description}</p>
              {sectorOriginText(effort) && (
                <p className="text-[11px] text-gray-400 mt-0.5">Sectoren: {sectorOriginText(effort)}</p>
              )}
            </div>
          ))}
        </section>
      )}

      {/* AI-samenvatting */}
      {result?.samenvatting && (
        <section>
          <h4 className="text-sm font-semibold text-gray-700 mb-2">AI-samenvatting</h4>
          <div className="bg-white border border-[#e2e8f0] rounded-lg p-4">
            <p className="text-[13px] text-gray-700 leading-relaxed">{result.samenvatting}</p>
          </div>
        </section>
      )}

      {!result?.samenvatting && (
        <div className="bg-gray-50 border border-[#e2e8f0] rounded-lg p-4">
          <p className="text-[13px] text-gray-500">
            {focusCaps.length > 0
              ? "De keten staat klaar. Klik op \u2018Analyseer eerste doel\u2019 voor de AI-review van hefboomwerking en baten-dekking."
              : "Klik op \u2018Analyseer\u2019 om de hefboomanalyse, breedtebeoordeling en baten-dekking voor dit doel te zien."}
          </p>
        </div>
      )}

      {/* Buiten scope */}
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
