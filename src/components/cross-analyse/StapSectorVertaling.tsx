"use client";

import React, { useState } from "react";
import { SectorBadge } from "./shared";
import { computeFocusView } from "@/lib/stap5-focus";
import type { ConsolidationOrigin } from "@/lib/stap5-focus";
import type {
  DINSession,
  Stap2Result,
  Stap4Result,
  Stap5Result,
  SectorName,
  DINBenefit,
  DINCapability,
  EffortDomain,
} from "@/lib/types";
import type {
  VermogenGelijkenisGroep,
  SubEffortAdvies,
  SubEffortDossier,
  SubEffortVermogenImpact,
} from "@/lib/schemas";

interface StapSectorVertalingProps {
  session: DINSession;
  result?: Stap5Result;
  stap2Result?: Stap2Result;
  stap4Result?: Stap4Result;
  // Compact mode voor inbedding in het programmaplan-export.
  // Toont alleen: focusdoel, baten per sector, drieluik per VermogenGelijkenisGroep.
  // Verbergt: sector-impact tabel, AI-samenvatting, buiten-scope details,
  // overeenkomsten-analyse, vermogens-per-sector overzicht.
  compact?: boolean;
}

const SECTORS_ORDER: readonly SectorName[] = ["PO", "VO", "Zakelijk"] as const;

const DOMAIN_LABELS: Record<EffortDomain, string> = {
  mens: "Mens",
  processen: "Processen",
  data_systemen: "Data & Systemen",
  cultuur: "Cultuur",
  overig: "Overig",
};

const DOMAIN_COLORS: Record<EffortDomain, { bg: string; border: string; text: string }> = {
  mens: { bg: "bg-blue-50", border: "border-blue-200", text: "text-blue-700" },
  processen: { bg: "bg-green-50", border: "border-green-200", text: "text-green-700" },
  data_systemen: { bg: "bg-purple-50", border: "border-purple-200", text: "text-purple-700" },
  cultuur: { bg: "bg-amber-50", border: "border-amber-200", text: "text-amber-700" },
  overig: { bg: "bg-gray-50", border: "border-gray-300", text: "text-gray-700" },
};

const DOMEIN_ORDER: readonly EffortDomain[] = ["mens", "processen", "data_systemen", "cultuur"] as const;

// --- Phase 18 (R-CROSS-03): VermogenImpact lijst per sub-effort advies ---
function VermogenImpactSectie({
  impacts,
  testIdBase,
}: {
  impacts: SubEffortVermogenImpact[];
  testIdBase: string;
}): React.ReactElement | null {
  if (!impacts || impacts.length === 0) return null;
  return (
    <section className="mt-3 pt-3 border-t border-gray-200">
      <p className="text-[10px] font-semibold text-gray-500 uppercase tracking-wider mb-2">
        Vermogen-impact per sector
      </p>
      <ul className="space-y-1.5">
        {impacts.map((v) => (
          <li
            key={`${v.sectorId}-${v.vermogenId}`}
            className="flex items-start gap-2"
            data-testid={`${testIdBase}-${v.sectorId}`}
          >
            <SectorBadge sector={v.sectorId} />
            <span className="text-[12px] text-gray-700 flex-1 leading-snug">{v.impact}</span>
          </li>
        ))}
      </ul>
    </section>
  );
}

// --- Phase 18 (R-CROSS-03): Dossier sectie met expand/collapse ---
// Default gesloten — progressive disclosure, layout-shift-vrij (UAT-2).
function DossierSectie({
  dossier,
  testId,
}: {
  dossier: SubEffortDossier;
  testId: string;
}): React.ReactElement | null {
  const [open, setOpen] = useState<boolean>(false);

  const entries: Array<[string, string]> = [
    ["Opdrachtgever", dossier.eigenaar ?? ""],
    ["Inspanningsleider", dossier.inspanningsleider ?? ""],
    ["Verwacht resultaat", dossier.verwachtResultaat ?? ""],
    ["Kostenraming", dossier.kostenraming ?? ""],
    ["Randvoorwaarden", dossier.randvoorwaarden ?? ""],
  ];
  const hasAny = entries.some(([, v]) => v && v.length > 0);
  if (!hasAny) return null;

  return (
    <section
      className="mt-3 pt-3 border-t border-gray-200"
      data-testid={testId}
    >
      <button
        type="button"
        onClick={() => setOpen((prev) => !prev)}
        aria-expanded={open}
        aria-controls={`${testId}-body`}
        className="flex items-center gap-2 w-full text-left text-[10px] font-semibold text-[#003366] uppercase tracking-wider hover:text-[#002244] focus:outline-none focus-visible:ring-2 focus-visible:ring-[#003366] rounded"
        data-testid={`${testId}-toggle`}
      >
        <span aria-hidden="true" className="inline-block w-3 text-gray-500">
          {open ? "▾" : "▸"}
        </span>
        <span>Inspanningendossier</span>
        <span className="ml-auto text-[9px] font-normal text-gray-400 normal-case tracking-normal">
          {open ? "(sluit)" : "(open)"}
        </span>
      </button>

      {open && (
        <div id={`${testId}-body`} className="mt-2">
          <p className="text-[9px] text-gray-400 italic mb-2">
            Rolnamen zijn AI-voorstel; pas aan op jouw Cito-context.
          </p>
          <dl className="space-y-1.5">
            {entries.map(([label, value]) =>
              value && value.length > 0 ? (
                <div
                  key={label}
                  className="grid grid-cols-[130px_1fr] gap-2 text-[12px]"
                >
                  <dt className="font-semibold text-gray-500">{label}</dt>
                  <dd className="text-gray-700 leading-snug">{value}</dd>
                </div>
              ) : null
            )}
          </dl>
        </div>
      )}
    </section>
  );
}

// --- Phase 17 D-29: Domain balance badge ---
function DomainBalanceBadge({
  groepId,
  subEffortAnalysis,
}: {
  groepId: string;
  subEffortAnalysis: SubEffortAdvies[];
}): React.ReactElement {
  const coveredDomains = new Set(
    subEffortAnalysis
      .filter((s) => s.groepId === groepId && s.actie === "combineren")
      .map((s) => s.domein)
  );
  const missing = DOMEIN_ORDER.filter((d) => !coveredDomains.has(d));
  const count = coveredDomains.size;
  const style =
    count >= 3
      ? "bg-green-50 text-green-700 border-green-200"
      : count === 2
      ? "bg-amber-50 text-amber-700 border-amber-200"
      : "bg-red-50 text-red-700 border-red-200";
  return (
    <span
      className={`inline-block text-[10px] font-semibold border rounded-full px-2 py-0.5 ${style} mt-2`}
      data-testid={`domain-balance-badge-${groepId}`}
    >
      Dekt {count} van 4 domeinen
      {missing.length > 0
        ? ` — mist ${missing.map((d) => DOMAIN_LABELS[d]).join(", ")}`
        : ""}
    </span>
  );
}

// --- Phase 17 D-32: Hefboom badge with tooltip ---
function HefboomBadge({
  vermogens,
}: {
  vermogens: Array<{ id: string; sectorId: string; title?: string; description: string }>;
}): React.ReactElement {
  return (
    <span className="relative group inline-block mt-1">
      <span className="inline-flex items-center gap-1 text-[10px] font-semibold text-teal-700 border border-teal-300 bg-teal-50 rounded-full px-2 py-0.5">
        <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M13 10V3L4 14h7v7l9-11h-7z"
          />
        </svg>
        Hefboom: raakt 3 sectoren via gelijkende vermogens
      </span>
      <span className="invisible group-hover:visible absolute left-0 top-full mt-1 z-10 bg-gray-900 text-white text-xs rounded p-2 shadow-lg min-w-[200px]">
        Gelijkende vermogens:
        <ul className="mt-1 space-y-0.5">
          {vermogens.map((v) => (
            <li key={v.id}>
              {v.sectorId}: {v.title || v.description}
            </li>
          ))}
        </ul>
      </span>
    </span>
  );
}

// --- Phase 17: Hefboompijlen (desktop only) ---
function HefboomPijlen(): React.ReactElement {
  return (
    <div className="hidden md:grid grid-cols-3 gap-3 my-2">
      {[0, 1, 2].map((i) => (
        <div key={i} className="flex justify-center">
          <svg className="w-6 h-6 text-teal-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M5 10l7-7m0 0l7 7m-7-7v18"
            />
          </svg>
        </div>
      ))}
    </div>
  );
}

// --- Expandable merge-herkomst (legacy) ---
function MergeHerkomst({ origins }: { origins: ConsolidationOrigin[] }) {
  const [open, setOpen] = useState(false);
  if (origins.length === 0) return null;

  return (
    <div className="mt-2">
      <button
        onClick={() => setOpen((v) => !v)}
        className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-teal-50 border border-teal-200 text-[10px] font-semibold text-teal-700 hover:bg-teal-100 transition-colors"
      >
        <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4" />
        </svg>
        Samengevoegd uit {origins.length} sector-items
        <svg className={`w-3 h-3 transition-transform ${open ? "rotate-180" : ""}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </button>
      {open && (
        <div className="mt-1.5 ml-2 space-y-1">
          {origins.map((o) => (
            <div key={o.originalId} className="flex items-center gap-1.5 text-[11px] text-teal-600">
              <span className="w-1 h-1 rounded-full bg-teal-400 shrink-0" />
              <span>{o.originalTitle}</span>
              <SectorBadge sector={o.originalSector} />
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// --- Connector lijn ---
function Connector({ className }: { className?: string }) {
  return (
    <div className={`flex justify-center ${className ?? ""}`}>
      <div className="w-0.5 h-5 bg-gray-300" />
    </div>
  );
}

export default function StapSectorVertaling({
  session,
  result,
  stap2Result,
  stap4Result,
  compact = false,
}: StapSectorVertalingProps) {
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

  const { focusGoal, focusBenefits, focusCaps, outOfScopeCaps, outOfScopeEfforts, consolidationMap } = view;

  // --- Phase 17 Wave 3 data ---
  const vermogenGelijkenisGroepen: VermogenGelijkenisGroep[] =
    stap2Result?.vermogenGelijkenisGroepen ?? [];
  const subEffortAnalysis: SubEffortAdvies[] = stap4Result?.subEffortAnalysis ?? [];

  // Baten per sector voor de onderste tabel
  const batenBySector = SECTORS_ORDER.map((s) => ({
    sector: s,
    baten: focusBenefits.filter((b) => b.sectorId === s),
  })).filter(({ baten }) => baten.length > 0);

  return (
    <div className="space-y-6">
      {/* Intro */}
      <div>
        <p className="text-[13px] text-gray-700 leading-relaxed">
          Het organigram voor het focusdoel. Per groep van <span className="font-semibold text-teal-700">gelijkende sector-vermogens</span>
          {" "}tonen we drie parallelle vermogens (PO/VO/Zakelijk) met daaronder de hefboomlaag: welke
          inspanningen per domein gezamenlijk opgepakt kunnen worden.
        </p>
      </div>

      {/* ===== ORGANIGRAM ===== */}

      {/* NIVEAU 1: Focusdoel */}
      <div className="bg-[#003366] text-white rounded-lg p-5 text-center shadow-sm">
        <p className="text-[10px] font-semibold uppercase tracking-wider text-blue-200 mb-1">
          Focusdoel — prioriteit 1
        </p>
        <h4 className="text-base font-semibold">
          {focusGoal.name || focusGoal.description}
        </h4>
      </div>

      <Connector />

      {/* NIVEAU 2: Baten per sector (horizontaal) */}
      {focusBenefits.length > 0 && (
        <div>
          <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-wider text-center mb-2">
            Baten per sector
          </p>
          <div className="grid gap-2" style={{ gridTemplateColumns: `repeat(${Math.min(batenBySector.length, 3)}, 1fr)` }}>
            {batenBySector.map(({ sector, baten }) => (
              <div key={sector} className="space-y-1.5">
                <div className="flex justify-center">
                  <SectorBadge sector={sector} />
                </div>
                {baten.map((baat) => {
                  const dekking = result?.batenDekking?.find((d) => d.baatId === baat.id);
                  return (
                    <div key={baat.id} className="border-l-3 border-l-[#0066cc] bg-white border border-[#e2e8f0] rounded-r-lg pl-3 pr-3 py-2">
                      <div className="flex items-start justify-between gap-1">
                        <p className="text-[12px] font-medium text-gray-800 flex-1">
                          {baat.title || baat.description}
                        </p>
                        {dekking && (
                          <span className={`text-[9px] font-semibold border rounded px-1 py-0.5 shrink-0 ${
                            dekking.wordtGeraakt
                              ? "bg-green-50 text-green-700 border-green-200"
                              : "bg-red-50 text-red-700 border-red-200"
                          }`}>
                            {dekking.wordtGeraakt ? "geraakt" : "risico"}
                          </span>
                        )}
                      </div>
                      {dekking && !dekking.wordtGeraakt && dekking.risico && (
                        <p className="text-[10px] text-red-600 mt-0.5">{dekking.risico}</p>
                      )}
                    </div>
                  );
                })}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Connector baten → drieluiken */}
      {vermogenGelijkenisGroepen.length > 0 && <Connector />}

      {/* NIVEAU 3: Drieluik-rendering per VermogenGelijkenisGroep (D-28) */}
      {vermogenGelijkenisGroepen.length > 0 && (
        <div>
          <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-wider text-center mb-3">
            Gelijkende sector-vermogens — hefboomgroepen
          </p>
          <div className="space-y-4">
            {vermogenGelijkenisGroepen.map((groep) => {
              const groepVermogens = session.capabilities.filter((c) =>
                groep.vermogenIds.includes(c.id)
              );
              if (groepVermogens.length === 0) return null;

              const groepSubAnalyses = subEffortAnalysis.filter(
                (s) => s.groepId === groep.id
              );

              return (
                <section
                  key={groep.id}
                  className="bg-teal-50/30 border border-teal-200 rounded-xl p-5"
                  data-testid={`vermogen-gelijkenis-groep-${groep.id}`}
                >
                  {/* BOVEN: rationale-kop + domein-balans */}
                  <div className="mb-4 text-center">
                    <p className="text-[10px] font-bold text-teal-700 uppercase tracking-wider mb-1">
                      Gelijkende vermogens — hefboomgroep
                    </p>
                    <p className="text-sm font-semibold text-gray-800">
                      {groep.gezamenlijkeOmschrijving}
                    </p>
                    {groep.reden && (
                      <p className="text-xs text-gray-500 mt-1 italic">{groep.reden}</p>
                    )}
                    <DomainBalanceBadge
                      groepId={groep.id}
                      subEffortAnalysis={subEffortAnalysis}
                    />
                  </div>

                  {/* MIDDEN: drie parallelle sector-vermogen-kaarten */}
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-3 mb-3">
                    {groepVermogens.map((cap: DINCapability) => {
                      const review = result?.vermogenReview?.find((r) => r.vermogenId === cap.id);
                      return (
                        <div
                          key={cap.id}
                          className="bg-white border-2 border-teal-300 rounded-lg p-3"
                          data-testid={`vermogen-card-${cap.id}`}
                        >
                          <div className="flex items-center justify-between mb-1 gap-1">
                            <SectorBadge sector={cap.sectorId || ""} />
                            {cap.consolidated && (
                              <span className="inline-block text-[10px] font-semibold bg-amber-50 text-amber-700 border border-amber-200 rounded px-1.5 py-0.5">
                                Legacy: vermogens-merge
                              </span>
                            )}
                          </div>
                          <p className="text-sm font-medium text-gray-800">
                            {cap.title || cap.description}
                          </p>
                          {cap.title && cap.description && cap.description !== cap.title && (
                            <p className="text-xs text-gray-500 mt-1">{cap.description}</p>
                          )}
                          {review && (
                            <p className="text-[11px] text-gray-600 mt-2 leading-snug">
                              {review.hefboomAnalyse}
                            </p>
                          )}
                        </div>
                      );
                    })}
                  </div>

                  {/* Hefboom-pijlen (desktop only) */}
                  <HefboomPijlen />

                  {/* ONDER: hefboomlaag per domein */}
                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-3 mt-2">
                    {DOMEIN_ORDER.map((domein) => {
                      const advies = groepSubAnalyses.find((s) => s.domein === domein);
                      const colors = DOMAIN_COLORS[domein];

                      if (!advies) {
                        return (
                          <div
                            key={domein}
                            className="border border-dashed border-gray-300 rounded-lg p-3 opacity-60"
                            data-testid={`hefboomlaag-${groep.id}-${domein}-empty`}
                          >
                            <p className={`text-[10px] font-bold uppercase tracking-wider ${colors.text} mb-1`}>
                              {DOMAIN_LABELS[domein]}
                            </p>
                            <p className="text-xs text-gray-400">Geen gezamenlijke inspanning</p>
                          </div>
                        );
                      }

                      const relatedEfforts = session.efforts.filter((e) =>
                        advies.items.includes(e.id)
                      );

                      return (
                        <div
                          key={domein}
                          className={`border ${colors.border} ${colors.bg} rounded-lg p-4`}
                          data-testid={`sub-effort-rich-${groep.id}-${domein}`}
                        >
                          {/* Header-strip: domein + actie-badge + hefboom-badge */}
                          <div className="flex items-center justify-between mb-3 gap-2 flex-wrap">
                            <p className={`text-[10px] font-bold uppercase tracking-wider ${colors.text}`}>
                              {DOMAIN_LABELS[domein]}
                            </p>
                            <div className="flex items-center gap-1">
                              <span
                                className={`text-[9px] font-semibold px-1.5 py-0.5 rounded ${
                                  advies.actie === "combineren"
                                    ? "bg-green-100 text-green-700"
                                    : "bg-gray-100 text-gray-600"
                                }`}
                              >
                                {advies.actie === "combineren" ? "Combineren" : "Apart"}
                              </span>
                              {advies.actie === "combineren" && (
                                <HefboomBadge vermogens={groepVermogens} />
                              )}
                            </div>
                          </div>

                          {/* Titel (Phase 18) — fallback op voorgesteldeNaam (Phase 17) */}
                          {(advies.titel || advies.voorgesteldeNaam) && (
                            <h4
                              className="text-sm font-semibold text-[#003366] mb-2 leading-snug"
                              data-testid={`sub-effort-titel-${groep.id}-${domein}`}
                            >
                              {advies.titel || advies.voorgesteldeNaam}
                            </h4>
                          )}

                          {/* Beschrijving (Phase 18) */}
                          {advies.beschrijving && (
                            <p className="text-[13px] text-gray-700 leading-relaxed mb-3">
                              {advies.beschrijving}
                            </p>
                          )}

                          {/* Beargumentatie (Phase 18) */}
                          {advies.beargumentatie && (
                            <section className="mb-3 pt-3 border-t border-gray-200">
                              <p className="text-[10px] font-semibold text-gray-500 uppercase tracking-wider mb-1">
                                Waarom cross-sectoraal opbouwen?
                              </p>
                              <p className="text-[12px] text-gray-700 leading-relaxed">
                                {advies.beargumentatie}
                              </p>
                            </section>
                          )}

                          {/* VermogenImpact per sector (Phase 18) */}
                          {advies.vermogenImpact && advies.vermogenImpact.length > 0 && (
                            <VermogenImpactSectie
                              impacts={advies.vermogenImpact}
                              testIdBase={`vermogen-impact-${groep.id}-${domein}`}
                            />
                          )}

                          {/* Dossier (Phase 18) — expand/collapse, default gesloten */}
                          {advies.dossier && (
                            <DossierSectie
                              dossier={advies.dossier}
                              testId={`sub-effort-dossier-${groep.id}-${domein}`}
                            />
                          )}

                          {/* Legacy reden (Phase 17 backward-compat) — alleen als beargumentatie ontbreekt */}
                          {!advies.beargumentatie && advies.reden && (
                            <p className="text-[11px] text-gray-600 mb-2 leading-snug">
                              {advies.reden}
                            </p>
                          )}

                          {/* Gebundelde inspanningen (legacy bullet-lijst) */}
                          {relatedEfforts.length > 0 && (
                            <section className="mt-3 pt-3 border-t border-gray-200">
                              <p className="text-[10px] font-semibold text-gray-500 uppercase tracking-wider mb-1">
                                Gebundelde inspanningen
                              </p>
                              <ul className="text-[11px] text-gray-700 space-y-0.5">
                                {relatedEfforts.map((eff) => (
                                  <li key={eff.id}>• {eff.title || eff.description}</li>
                                ))}
                              </ul>
                            </section>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </section>
              );
            })}
          </div>
        </div>
      )}

      {/* Legacy: consolidated caps die NIET in een drieluik-groep zitten — toon als individuele kaarten met amber legacy-warning */}
      {(() => {
        const groepCapIds = new Set(vermogenGelijkenisGroepen.flatMap((g) => g.vermogenIds));
        const legacyConsolidatedCaps = focusCaps.filter(
          (c) => c.consolidated && !groepCapIds.has(c.id)
        );
        if (legacyConsolidatedCaps.length === 0) return null;
        return (
          <div className="mt-4">
            <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-wider text-center mb-2">
              Legacy samengevoegde vermogens
            </p>
            <div className="space-y-2">
              {legacyConsolidatedCaps.map((cap) => {
                const origins = consolidationMap.get(cap.id) ?? [];
                return (
                  <div
                    key={cap.id}
                    className="bg-white border-2 border-amber-300 rounded-lg p-3"
                  >
                    <div className="flex items-center justify-between mb-1 gap-1">
                      <SectorBadge sector={cap.sectorId || ""} />
                      <span className="inline-block text-[10px] font-semibold bg-amber-50 text-amber-700 border border-amber-200 rounded px-1.5 py-0.5">
                        Legacy: vermogens-merge (niet meer toegepast in cross-analyse)
                      </span>
                    </div>
                    <p className="text-sm font-medium text-gray-800">
                      {cap.title || cap.description}
                    </p>
                    {origins.length > 0 && <MergeHerkomst origins={origins} />}
                  </div>
                );
              })}
            </div>
          </div>
        );
      })()}

      {/* Fallback: als er GEEN vermogenGelijkenisGroepen zijn, toon empty state */}
      {vermogenGelijkenisGroepen.length === 0 && (
        <div className="bg-gray-50 border border-gray-200 rounded-lg p-4 text-center">
          <p className="text-sm text-gray-600">
            Nog geen vermogen-gelijkenis-groepen gedetecteerd. Doorloop stap 3 (Gedeelde vermogens)
            om gelijkende sector-vermogens te markeren.
          </p>
        </div>
      )}

      {/* ====== Onderstaande secties zijn alleen voor de wizard, niet voor het programmaplan-export ====== */}
      {!compact && (
        <>
      {/* ===== SECTOR-IMPACT TABEL ===== */}
      {batenBySector.length > 0 && (
        <section className="mt-8">
          <h4 className="text-sm font-semibold text-gray-700 mb-3">Per sector: wat gaan we bereiken?</h4>
          <div className="bg-white border border-[#e2e8f0] rounded-lg overflow-hidden">
            <table className="w-full text-[12px]">
              <thead>
                <tr className="bg-gray-50 border-b border-[#e2e8f0]">
                  <th className="text-left px-3 py-2 text-[10px] font-semibold text-gray-500 uppercase tracking-wider w-[80px]">Sector</th>
                  <th className="text-left px-3 py-2 text-[10px] font-semibold text-gray-500 uppercase tracking-wider">Baten</th>
                  <th className="text-left px-3 py-2 text-[10px] font-semibold text-gray-500 uppercase tracking-wider">Gelijkende vermogens</th>
                  <th className="text-left px-3 py-2 text-[10px] font-semibold text-gray-500 uppercase tracking-wider">Gezamenlijke inspanningen</th>
                </tr>
              </thead>
              <tbody>
                {batenBySector.map(({ sector, baten }) => {
                  // Welke gelijkenisgroepen hebben een vermogen uit deze sector?
                  const sectorGroepen = vermogenGelijkenisGroepen.filter((g) =>
                    session.capabilities.some(
                      (c) => g.vermogenIds.includes(c.id) && c.sectorId === sector
                    )
                  );
                  const sectorCapNames = sectorGroepen
                    .flatMap((g) =>
                      session.capabilities
                        .filter((c) => g.vermogenIds.includes(c.id) && c.sectorId === sector)
                        .map((c) => c.title || c.description)
                    );
                  // Welke gezamenlijke inspanningen (combineren) komen voort uit deze groepen?
                  const sectorGroepIds = new Set(sectorGroepen.map((g) => g.id));
                  const sharedEffortTitles = subEffortAnalysis
                    .filter((s) => sectorGroepIds.has(s.groepId) && s.actie === "combineren")
                    .map((s) => s.voorgesteldeNaam || `(${DOMAIN_LABELS[s.domein]} cluster)`);

                  return (
                    <tr key={sector} className="border-b border-[#e2e8f0] last:border-b-0 align-top">
                      <td className="px-3 py-2.5">
                        <SectorBadge sector={sector} />
                      </td>
                      <td className="px-3 py-2.5">
                        {baten.map((b) => (
                          <p key={b.id} className="text-gray-700">{b.title || b.description}</p>
                        ))}
                      </td>
                      <td className="px-3 py-2.5">
                        {sectorCapNames.length > 0
                          ? sectorCapNames.map((name, i) => (
                              <p key={i} className="text-gray-700 font-semibold">{name}</p>
                            ))
                          : <p className="text-gray-400 italic">-</p>}
                      </td>
                      <td className="px-3 py-2.5">
                        {sharedEffortTitles.length > 0
                          ? sharedEffortTitles.map((t, i) => (
                              <p key={i} className="text-gray-700 font-semibold">{t}</p>
                            ))
                          : <p className="text-gray-400 italic">-</p>}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
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
            {vermogenGelijkenisGroepen.length > 0
              ? "De drieluik-keten staat klaar. Klik op \u2018Analyseer eerste doel\u2019 voor de AI-review."
              : focusCaps.length > 0
              ? "Er zijn nog geen gelijkende sector-vermogens gegroepeerd. Ga terug naar stap 3 om drieluiken te markeren."
              : "Klik op \u2018Analyseer\u2019 om de hefboomanalyse en baten-dekking voor dit doel te zien."}
          </p>
        </div>
      )}

      {/* Buiten scope */}
      <div className="mt-8">
        <button
          onClick={() => setBuitenScopeOpen((v) => !v)}
          className="w-full min-h-[44px] flex items-center justify-between px-4 py-3 bg-gray-50 border border-[#e2e8f0] rounded-lg text-left hover:bg-gray-100 transition-colors"
          aria-expanded={buitenScopeOpen}
        >
          <span className="text-[13px] text-gray-700">
            <span className="font-semibold">Buiten scope voor nu</span>
            {" \u2014 "}
            {outOfScopeCaps.length} vermogens en {outOfScopeEfforts.length} inspanningen
          </span>
          <span className="text-[11px] font-semibold text-gray-500">
            {buitenScopeOpen ? "Verberg details" : "Toon details"}
          </span>
        </button>
        {buitenScopeOpen && (
          <div className="mt-3 px-4 py-3 bg-white border border-[#e2e8f0] rounded-lg space-y-3">
            <p className="text-[13px] text-gray-600">
              Deze items zijn niet gegroepeerd in een drieluik voor dit doel.
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

      {/* ===== OVEREENKOMSTEN-ANALYSE — baten + vermogens per sector ===== */}
      <OvereenkomstenAnalyse
        focusBenefits={focusBenefits}
        focusCaps={focusCaps}
        vermogenGelijkenisGroepen={vermogenGelijkenisGroepen}
      />
        </>
      )}
    </div>
  );
}

// --- Phase 18 (R-CROSS-03): Overeenkomsten-analyse baten + vermogens ---
// Tekstuele samenvatting onderaan stap 6: waar liggen baten-thema's parallel per sector,
// en welke vermogens zijn gelijkenis-groepen (basis voor de cross-sectorale inspanningen hierboven).
function OvereenkomstenAnalyse({
  focusBenefits,
  focusCaps,
  vermogenGelijkenisGroepen,
}: {
  focusBenefits: DINBenefit[];
  focusCaps: DINCapability[];
  vermogenGelijkenisGroepen: VermogenGelijkenisGroep[];
}): React.ReactElement | null {
  if (focusBenefits.length === 0 && focusCaps.length === 0) return null;

  const batenBySector = SECTORS_ORDER.map((s) => ({
    sector: s,
    items: focusBenefits.filter((b) => b.sectorId === s),
  })).filter(({ items }) => items.length > 0);

  const capsBySector = SECTORS_ORDER.map((s) => ({
    sector: s,
    items: focusCaps.filter((c) => c.sectorId === s),
  })).filter(({ items }) => items.length > 0);

  return (
    <div className="mt-8 border-t-2 border-gray-200 pt-6">
      <h3 className="text-lg font-semibold text-[#003366] mb-1">Overeenkomsten-analyse</h3>
      <p className="text-[13px] text-gray-600 mb-5 leading-relaxed">
        Baten en vermogens blijven per sector — hier benoemen we expliciet waar sectoren inhoudelijk parallel
        lopen, zodat de cross-sectorale inspanningen hierboven hun basis helder hebben.
      </p>

      {/* Baten-thema's per sector, zij-aan-zij */}
      {batenBySector.length > 0 && (
        <section className="mb-6">
          <h4 className="text-sm font-semibold text-gray-700 mb-2">Baten per sector — parallelle uitwerkingen van dezelfde doelstelling</h4>
          <div className="grid gap-3" style={{ gridTemplateColumns: `repeat(${batenBySector.length}, 1fr)` }}>
            {batenBySector.map(({ sector, items }) => (
              <div key={sector} className="bg-white border border-[#e2e8f0] rounded-lg p-3">
                <div className="mb-2"><SectorBadge sector={sector} /></div>
                <ul className="space-y-1">
                  {items.map((b) => (
                    <li key={b.id} className="text-[12px] text-gray-700 leading-snug">
                      • {b.title || b.description}
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
          <p className="text-[11px] text-gray-500 italic mt-2">
            Elke sector vertaalt de focus-doelstelling naar de eigen klantcontext (leerkrachten / schoolleiders / opdrachtgevers).
            De thema&apos;s lopen parallel — dezelfde onderliggende ambitie, sector-eigen formulering.
          </p>
        </section>
      )}

      {/* Vermogen-gelijkenis-groepen */}
      {vermogenGelijkenisGroepen.length > 0 && (
        <section className="mb-6">
          <h4 className="text-sm font-semibold text-gray-700 mb-2">Vermogen-overeenkomsten — methodisch verwant per sector</h4>
          <ul className="space-y-3">
            {vermogenGelijkenisGroepen.map((groep) => {
              const groepCaps = focusCaps.filter((c) => groep.vermogenIds.includes(c.id));
              return (
                <li key={groep.id} className="bg-white border border-[#e2e8f0] rounded-lg p-3">
                  <p className="text-[13px] font-semibold text-gray-800">{groep.gezamenlijkeOmschrijving}</p>
                  {groep.reden && (
                    <p className="text-[12px] text-gray-600 italic mt-1 mb-2">{groep.reden}</p>
                  )}
                  <div className="flex flex-wrap gap-2 mt-2">
                    {groepCaps.map((c) => (
                      <span
                        key={c.id}
                        className="inline-flex items-center gap-1.5 bg-gray-50 border border-gray-200 rounded px-2 py-1 text-[11px]"
                      >
                        {c.sectorId && <SectorBadge sector={c.sectorId} />}
                        <span className="text-gray-700">{c.title || c.description}</span>
                      </span>
                    ))}
                  </div>
                </li>
              );
            })}
          </ul>
          <p className="text-[11px] text-gray-500 italic mt-2">
            Deze gelijkenis rechtvaardigt dat we de onderliggende inspanningen wél cross-sectoraal doen — zie de vier domein-kaarten hierboven.
          </p>
        </section>
      )}

      {/* Per sector vermogens-overzicht (referentie) */}
      {capsBySector.length > 0 && (
        <section>
          <h4 className="text-sm font-semibold text-gray-700 mb-2">Vermogens per sector — eigen identiteit</h4>
          <div className="grid gap-3" style={{ gridTemplateColumns: `repeat(${capsBySector.length}, 1fr)` }}>
            {capsBySector.map(({ sector, items }) => (
              <div key={sector} className="bg-white border border-[#e2e8f0] rounded-lg p-3">
                <div className="mb-2"><SectorBadge sector={sector} /></div>
                <ul className="space-y-1">
                  {items.map((c) => (
                    <li key={c.id} className="text-[12px] text-gray-700 leading-snug">
                      • {c.title || c.description}
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </section>
      )}
    </div>
  );
}
