"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { useSession } from "@/lib/session-context";
import { useToast } from "@/components/ui/Toast";
import { promoteProjectToEfforts, generateId } from "@/lib/din-service";
import type {
  ExternalProject,
  EffortDomain,
  EffortStatus,
  DINBenefit,
  DINCapability,
  DINEffort,
} from "@/lib/types";
import { generateQuarters } from "@/lib/types";
import type {
  ProjectPromotieResult,
  AIPromotedEffort,
  FindingSuggestion,
} from "@/lib/schemas";

// --- Types ---

interface ProjectPromotiePanelProps {
  project: ExternalProject;
  open: boolean;
  onClose: () => void;
}

// --- Constants (mirrored from ExterneProjectenPanel) ---

const DOMAINS: { key: EffortDomain; label: string }[] = [
  { key: "mens", label: "Mens" },
  { key: "processen", label: "Processen" },
  { key: "data_systemen", label: "Data & Systemen" },
  { key: "cultuur", label: "Cultuur" },
];

const DOMAIN_CHIP_CHECKED: Record<EffortDomain, string> = {
  mens: "bg-blue-500/10 text-blue-600 border-blue-500/30 font-medium",
  processen: "bg-green-600/10 text-green-600 border-green-600/30 font-medium",
  data_systemen: "bg-purple-600/10 text-purple-600 border-purple-600/30 font-medium",
  cultuur: "bg-amber-600/10 text-amber-600 border-amber-600/30 font-medium",
};

const STATUS_OPTIONS: { key: EffortStatus; label: string }[] = [
  { key: "gepland", label: "Gepland" },
  { key: "in_uitvoering", label: "In uitvoering" },
  { key: "afgerond", label: "Afgerond" },
  { key: "on_hold", label: "Gepauzeerd" },
];

const FINDING_TYPE_STYLE: Record<FindingSuggestion["type"], string> = {
  baat: "bg-din-baten text-white",
  vermogen: "bg-din-vermogens text-white",
  inspanning: "bg-din-inspanningen text-white",
};

const FINDING_TYPE_LABEL: Record<FindingSuggestion["type"], string> = {
  baat: "Baat",
  vermogen: "Vermogen",
  inspanning: "Inspanning",
};

// --- Component ---

export default function ProjectPromotiePanel({
  project,
  open,
  onClose,
}: ProjectPromotiePanelProps) {
  const { session, updateSession } = useSession();
  const { addToast } = useToast();

  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<ProjectPromotieResult | null>(null);

  const [acceptedBenefitIds, setAcceptedBenefitIds] = useState<Set<string>>(
    new Set()
  );
  const [acceptedCapabilityIds, setAcceptedCapabilityIds] = useState<
    Set<string>
  >(new Set());
  const [keptEfforts, setKeptEfforts] = useState<AIPromotedEffort[]>([]);
  const [transientFindings, setTransientFindings] = useState<
    FindingSuggestion[]
  >([]);
  const [findingInFlight, setFindingInFlight] = useState<Set<number>>(
    new Set()
  );

  const quarterOptions = generateQuarters(8);

  // Ref to avoid stale closures on the AI fetch retry
  const projectRef = useRef(project);
  projectRef.current = project;

  // --- AI fetch ---

  const fetchPromotion = useCallback(async () => {
    if (!session) return;

    setIsLoading(true);
    setError(null);
    setResult(null);

    try {
      const currentProject = projectRef.current;
      const sectorBenefits = (session.benefits || []).filter(
        (b) => b.sectorId === currentProject.sectorId
      );
      const sectorCapabilities = (session.capabilities || []).filter(
        (c) => c.sectorId === currentProject.sectorId && !c.consolidated
      );
      const priorProjectCapabilityIds = (session.projectCapabilityMaps || [])
        .filter((m) => m.projectId === currentProject.id)
        .map((m) => m.capabilityId);

      const res = await fetch("/api/promote-project", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          project: currentProject,
          sectorBenefits,
          sectorCapabilities,
          sectorName: currentProject.sectorId,
          kibGoals: session.goals || [],
          kibScope: session.scope,
          sectorAnalysis: session.sectorAnalyses?.[currentProject.sectorId],
          completedGoalItems: undefined,
          priorProjectCapabilityIds,
        }),
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(
          data.error ||
            "Promotie mislukt. Controleer je verbinding en probeer opnieuw."
        );
      }

      const promotieResult = data.data as ProjectPromotieResult;
      setResult(promotieResult);

      // Pre-check all AI-suggested benefit/capability matches per D-04
      setAcceptedBenefitIds(
        new Set(promotieResult.benefitMatches.map((m) => m.benefitId))
      );
      setAcceptedCapabilityIds(
        new Set(promotieResult.capabilityMatches.map((m) => m.capabilityId))
      );
      setKeptEfforts(promotieResult.splitEfforts);
      setTransientFindings(promotieResult.findings);
      setFindingInFlight(new Set());
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Promotie mislukt. Controleer je verbinding en probeer opnieuw."
      );
    } finally {
      setIsLoading(false);
    }
  }, [session]);

  useEffect(() => {
    if (open && !result && !isLoading && !error) {
      fetchPromotion();
    }
  }, [open, result, isLoading, error, fetchPromotion]);

  if (!open) return null;
  if (!session) return null;

  // --- Handlers ---

  function toggleBenefitAccepted(benefitId: string) {
    setAcceptedBenefitIds((prev) => {
      const next = new Set(prev);
      if (next.has(benefitId)) next.delete(benefitId);
      else next.add(benefitId);
      return next;
    });
  }

  function toggleCapabilityAccepted(capabilityId: string) {
    setAcceptedCapabilityIds((prev) => {
      const next = new Set(prev);
      if (next.has(capabilityId)) next.delete(capabilityId);
      else next.add(capabilityId);
      return next;
    });
  }

  function updateEffortAt(index: number, patch: Partial<AIPromotedEffort>) {
    setKeptEfforts((prev) =>
      prev.map((e, i) => (i === index ? { ...e, ...patch } : e))
    );
  }

  function removeEffortAt(index: number) {
    setKeptEfforts((prev) => prev.filter((_, i) => i !== index));
  }

  function handleAddFinding(finding: FindingSuggestion, index: number) {
    if (findingInFlight.has(index)) return;
    setFindingInFlight((prev) => new Set(prev).add(index));

    updateSession((prev) => {
      if (finding.type === "vermogen") {
        const newCap: DINCapability = {
          id: generateId(),
          sectorId: finding.targetSector,
          title: finding.beschrijving.slice(0, 60),
          description: finding.toelichting || finding.beschrijving,
          relatedSectors: [finding.targetSector],
          profiel: {
            eigenaar: "",
            huidieSituatie: "",
            gewensteSituatie: "",
          },
        };
        return {
          capabilities: [...(prev.capabilities || []), newCap],
        };
      }
      if (finding.type === "inspanning") {
        const newEffort: DINEffort = {
          id: generateId(),
          sectorId: finding.targetSector,
          title: finding.beschrijving.slice(0, 60),
          description: finding.beschrijving,
          domain: finding.domain || "processen",
          status: "gepland",
          dependencies: [],
          originProjectId: project.id,
        };
        return {
          efforts: [...(prev.efforts || []), newEffort],
        };
      }
      if (finding.type === "baat") {
        // Baat-findings hebben nog geen goal context (Open Question uit 14-RESEARCH).
        // We maken de baat aan met goalId="" zodat de user hem later kan koppelen
        // in stap DIN-Mapping. Toast geeft expliciet deze instructie.
        const newBenefit: DINBenefit = {
          id: generateId(),
          goalId: "",
          sectorId: finding.targetSector,
          title: finding.beschrijving.slice(0, 60),
          description: finding.beschrijving,
          profiel: {
            bateneigenaar: "",
            indicator: "",
            indicatorOwner: "",
            currentValue: "",
            targetValue: "",
          },
        };
        return {
          benefits: [...(prev.benefits || []), newBenefit],
        };
      }
      return {};
    });

    setTransientFindings((prev) => prev.filter((_, i) => i !== index));
    setFindingInFlight((prev) => {
      const next = new Set(prev);
      next.delete(index);
      return next;
    });

    const label = FINDING_TYPE_LABEL[finding.type];
    if (finding.type === "baat") {
      addToast(
        `${label} toegevoegd \u2014 koppel deze aan een doel in stap DIN-Mapping.`,
        "success"
      );
    } else {
      addToast(`${label} toegevoegd aan DIN-keten.`, "success");
    }
  }

  function handleConfirm() {
    if (!result) return;
    if (keptEfforts.length < 1) {
      addToast(
        "Er moet minimaal \u00E9\u00E9n inspanning overblijven om te promoveren.",
        "error"
      );
      return;
    }
    const selections = {
      acceptedBenefitIds: Array.from(acceptedBenefitIds),
      acceptedCapabilityIds: Array.from(acceptedCapabilityIds),
      keptEfforts,
      // Findings zijn al incrementeel toegevoegd via handleAddFinding — niet dubbel toepassen.
      acceptedFindings: [],
    };
    updateSession((prev) =>
      promoteProjectToEfforts(prev, project.id, result, selections)
    );
    addToast(
      `Project gepromoveerd naar ${keptEfforts.length} inspanning(en).`,
      "success"
    );
    onClose();
  }

  // --- Render helpers ---

  const sectorBenefits = (session.benefits || []).filter(
    (b) => b.sectorId === project.sectorId
  );
  const sectorCapabilities = (session.capabilities || []).filter(
    (c) => c.sectorId === project.sectorId && !c.consolidated
  );

  return (
    <div className="collapse-wrapper mt-3">
      <div>
        <div className="bg-white border-2 border-cito-blue/30 rounded-lg shadow-sm overflow-hidden">
          {/* Header */}
          <div className="px-6 py-4 border-b border-gray-200 bg-gradient-to-br from-cito-blue/5 to-white flex items-start gap-3">
            <div className="flex-1 min-w-0">
              <h3 className="text-lg font-semibold text-gray-900">
                Projectpromotie: {project.name}
              </h3>
              <p className="text-sm text-gray-600 mt-1">
                De AI heeft dit project door de DIN-keten gepositioneerd.
                Controleer de voorstellen en bevestig om de inspanningen toe
                te voegen.
              </p>
            </div>
            <button
              type="button"
              onClick={onClose}
              className="shrink-0 text-gray-400 hover:text-gray-700 text-xl leading-none p-1"
              title="Sluiten"
              aria-label="Sluiten"
            >
              {"\u00D7"}
            </button>
          </div>

          {/* Body */}
          <div className="px-6 py-6">
            {isLoading && (
              <div className="flex items-center justify-center gap-3 py-10">
                <span className="w-5 h-5 border-2 border-cito-blue border-t-transparent rounded-full animate-spin" />
                <span className="text-sm text-gray-700">
                  Bezig met promoveren{"\u2026"}
                </span>
              </div>
            )}

            {error && !isLoading && (
              <div className="space-y-3">
                <div className="bg-red-100 text-red-700 rounded p-3 text-sm">
                  {error}
                </div>
                <button
                  type="button"
                  onClick={() => {
                    setError(null);
                    fetchPromotion();
                  }}
                  className="px-4 py-2 bg-cito-blue text-white text-sm font-semibold rounded hover:bg-cito-blue/90"
                >
                  Opnieuw proberen
                </button>
              </div>
            )}

            {!isLoading && !error && result && (
              <div className="space-y-6">
                {/* Section 1: Baat-koppelingen */}
                <section>
                  <h4 className="text-lg font-semibold text-gray-900 mb-3">
                    1. Voorgestelde baat-koppelingen
                  </h4>
                  {result.benefitMatches.length === 0 ? (
                    <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
                      <p className="text-sm font-semibold text-gray-700">
                        Geen bestaande baten gevonden
                      </p>
                      <p className="text-xs text-gray-500 mt-1">
                        De AI heeft geen bestaande baten herkend die bij dit
                        project passen. Bekijk de bevindingen hieronder voor
                        voorgestelde nieuwe baten.
                      </p>
                    </div>
                  ) : (
                    <ul className="space-y-2">
                      {result.benefitMatches.map((match) => {
                        const benefit = sectorBenefits.find(
                          (b) => b.id === match.benefitId
                        );
                        if (!benefit) return null;
                        const checked = acceptedBenefitIds.has(
                          match.benefitId
                        );
                        return (
                          <li
                            key={match.benefitId}
                            className="flex items-start gap-3 p-3 bg-white border border-gray-200 rounded-lg hover:border-cito-blue/40"
                          >
                            <input
                              type="checkbox"
                              checked={checked}
                              onChange={() =>
                                toggleBenefitAccepted(match.benefitId)
                              }
                              className="mt-1 shrink-0 h-4 w-4 accent-cito-blue"
                            />
                            <div className="flex-1 min-w-0">
                              <p className="text-base font-semibold text-cito-blue">
                                {benefit.title || benefit.description}
                              </p>
                              {benefit.title && (
                                <p className="text-xs text-gray-600 mt-0.5 line-clamp-2">
                                  {benefit.description}
                                </p>
                              )}
                              <p className="text-xs text-gray-500 mt-1 italic">
                                {match.toelichting}
                              </p>
                            </div>
                          </li>
                        );
                      })}
                    </ul>
                  )}
                </section>

                {/* Section 2: Vermogen-koppelingen */}
                <section>
                  <h4 className="text-lg font-semibold text-gray-900 mb-3">
                    2. Voorgestelde vermogen-koppelingen
                  </h4>
                  {result.capabilityMatches.length === 0 ? (
                    <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
                      <p className="text-sm font-semibold text-gray-700">
                        Geen bestaande vermogens gevonden
                      </p>
                      <p className="text-xs text-gray-500 mt-1">
                        De AI heeft geen bestaande vermogens herkend.
                        Overweeg eerst een vermogen aan te maken via de
                        bevindingen hieronder.
                      </p>
                    </div>
                  ) : (
                    <ul className="space-y-2">
                      {result.capabilityMatches.map((match) => {
                        const cap = sectorCapabilities.find(
                          (c) => c.id === match.capabilityId
                        );
                        if (!cap) return null;
                        const checked = acceptedCapabilityIds.has(
                          match.capabilityId
                        );
                        return (
                          <li
                            key={match.capabilityId}
                            className="flex items-start gap-3 p-3 bg-white border border-gray-200 rounded-lg hover:border-cito-blue/40"
                          >
                            <input
                              type="checkbox"
                              checked={checked}
                              onChange={() =>
                                toggleCapabilityAccepted(match.capabilityId)
                              }
                              className="mt-1 shrink-0 h-4 w-4 accent-cito-blue"
                            />
                            <div className="flex-1 min-w-0">
                              <p className="text-base font-semibold text-cito-blue">
                                {cap.title || cap.description}
                              </p>
                              {cap.title && (
                                <p className="text-xs text-gray-600 mt-0.5 line-clamp-2">
                                  {cap.description}
                                </p>
                              )}
                              <p className="text-xs text-gray-500 mt-1 italic">
                                {match.toelichting}
                              </p>
                            </div>
                          </li>
                        );
                      })}
                    </ul>
                  )}
                </section>

                {/* Section 3: Inspanningen-splitsing */}
                <section>
                  <h4 className="text-lg font-semibold text-gray-900 mb-3">
                    3. Inspanningen-splitsing
                  </h4>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {keptEfforts.map((effort, i) => (
                      <div
                        key={i}
                        className="bg-white border border-gray-200 rounded-lg p-4 space-y-2"
                      >
                        <input
                          type="text"
                          value={effort.title}
                          onChange={(e) =>
                            updateEffortAt(i, { title: e.target.value })
                          }
                          placeholder="Inspanning titel"
                          className="w-full text-base font-semibold text-gray-900 bg-transparent border-none outline-none focus:ring-1 focus:ring-cito-blue rounded px-1"
                        />
                        <textarea
                          value={effort.description}
                          onChange={(e) =>
                            updateEffortAt(i, {
                              description: e.target.value,
                            })
                          }
                          placeholder="Korte beschrijving..."
                          rows={2}
                          className="w-full text-sm text-gray-700 bg-transparent border border-gray-100 outline-none focus:ring-1 focus:ring-cito-blue rounded px-2 py-1 resize-y"
                        />
                        {effort.rationale && (
                          <p className="text-xs text-gray-500 italic">
                            {effort.rationale}
                          </p>
                        )}
                        {/* Domain chips */}
                        <div className="flex flex-wrap gap-1.5 pt-1">
                          {DOMAINS.map((d) => {
                            const active = effort.domain === d.key;
                            return (
                              <button
                                key={d.key}
                                type="button"
                                onClick={() =>
                                  updateEffortAt(i, { domain: d.key })
                                }
                                className={`px-2 py-1 text-xs rounded-full border cursor-pointer ${
                                  active
                                    ? DOMAIN_CHIP_CHECKED[d.key]
                                    : "border-gray-300 text-gray-500 bg-white hover:border-gray-400"
                                }`}
                              >
                                {d.label}
                              </button>
                            );
                          })}
                        </div>
                        {/* Status + quarter row */}
                        <div className="flex items-center gap-2 pt-1">
                          <select
                            value={effort.status || "in_uitvoering"}
                            onChange={(e) =>
                              updateEffortAt(i, {
                                status: e.target.value as EffortStatus,
                              })
                            }
                            className="text-xs px-2 py-1 border border-gray-200 rounded"
                          >
                            {STATUS_OPTIONS.map((s) => (
                              <option key={s.key} value={s.key}>
                                {s.label}
                              </option>
                            ))}
                          </select>
                          <select
                            value={effort.quarter || ""}
                            onChange={(e) =>
                              updateEffortAt(i, {
                                quarter: e.target.value || undefined,
                              })
                            }
                            className="text-xs px-2 py-1 border border-gray-200 rounded"
                          >
                            <option value="">Kwartaal{"\u2026"}</option>
                            {quarterOptions.map((q) => (
                              <option key={q} value={q}>
                                {q}
                              </option>
                            ))}
                          </select>
                        </div>
                        {/* Remove link — only when more than 1 effort remains */}
                        {keptEfforts.length > 1 && (
                          <div className="pt-1">
                            <button
                              type="button"
                              onClick={() => removeEffortAt(i)}
                              className="text-xs text-amber-600 hover:text-amber-800 underline"
                            >
                              Verwijder deze effort
                            </button>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                </section>

                {/* Section 4: Bevindingen */}
                <section>
                  <h4 className="text-lg font-semibold text-gray-900 mb-3">
                    4. Bevindingen {"\u2014"} extra DIN-elementen
                  </h4>
                  {transientFindings.length === 0 ? (
                    <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
                      <p className="text-sm font-semibold text-gray-700">
                        Geen extra bevindingen
                      </p>
                      <p className="text-xs text-gray-500 mt-1">
                        De AI heeft geen aanvullende DIN-elementen
                        voorgesteld voor dit project.
                      </p>
                    </div>
                  ) : (
                    <ul className="space-y-3">
                      {transientFindings.map((finding, idx) => (
                        <li
                          key={`${finding.type}-${idx}-${finding.beschrijving.slice(0, 20)}`}
                          className="bg-amber-50 border border-amber-200 rounded-lg p-4"
                        >
                          <div className="flex items-start gap-3">
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-2 mb-1">
                                <span
                                  className={`text-xs font-semibold px-2 py-0.5 rounded ${FINDING_TYPE_STYLE[finding.type]}`}
                                >
                                  {FINDING_TYPE_LABEL[finding.type]}
                                </span>
                                <span className="text-xs text-gray-500">
                                  Sector: {finding.targetSector}
                                </span>
                              </div>
                              <p className="text-sm font-semibold text-gray-900">
                                {finding.beschrijving}
                              </p>
                              {finding.toelichting && (
                                <p className="text-xs text-gray-600 mt-1">
                                  {finding.toelichting}
                                </p>
                              )}
                            </div>
                            <button
                              type="button"
                              disabled={findingInFlight.has(idx)}
                              onClick={() => handleAddFinding(finding, idx)}
                              className="shrink-0 text-cito-blue text-sm font-semibold hover:underline disabled:opacity-50"
                            >
                              Voeg toe aan DIN
                            </button>
                          </div>
                        </li>
                      ))}
                    </ul>
                  )}
                </section>
              </div>
            )}
          </div>

          {/* Sticky action bar */}
          {!isLoading && !error && result && (
            <div className="sticky bottom-0 px-6 py-4 border-t border-gray-200 bg-white flex items-center justify-between gap-3">
              <button
                type="button"
                onClick={onClose}
                className="text-sm text-gray-600 hover:text-gray-900"
              >
                Annuleren
              </button>
              <button
                type="button"
                onClick={handleConfirm}
                disabled={keptEfforts.length < 1}
                className="px-4 py-2 bg-cito-blue text-white rounded font-semibold hover:bg-cito-blue/90 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Bevestig promotie ({keptEfforts.length})
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
