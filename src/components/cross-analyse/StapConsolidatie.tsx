"use client";

import { useState, useEffect } from "react";
import { useSession } from "@/lib/session-context";
import {
  mergeCapabilities,
  undoMergeCapabilities,
  mergeEfforts,
  undoMergeEfforts,
} from "@/components/steps/CrossAnalyseStep";
import {
  computeAutoApplyResult,
  type DrieluikContext,
  type AutoApplyCluster,
} from "@/lib/consolidation-guards";
import { ClusterCard } from "./shared";
import type {
  DINSession,
  Stap2Result,
  Stap3Result,
  Stap4Result,
} from "@/lib/types";

interface StapConsolidatieProps {
  session: DINSession;
  stap2Result?: Stap2Result;
  stap3Result?: Stap3Result;
  stap4Result?: Stap4Result;
}

const AANBEVELING_STYLE: Record<string, { bg: string; text: string; border: string }> = {
  combineren: { bg: "bg-green-50", text: "text-green-700", border: "border-green-200" },
  afstemmen: { bg: "bg-amber-50", text: "text-amber-700", border: "border-amber-200" },
  apart_houden: { bg: "bg-gray-50", text: "text-gray-600", border: "border-gray-200" },
};

const AANBEVELING_LABEL: Record<string, string> = {
  combineren: "Combineren",
  afstemmen: "Afstemmen",
  apart_houden: "Apart houden",
};

const DOMEIN_META: Record<string, { label: string; bg: string; text: string; border: string; icon: string }> = {
  mens: {
    label: "Mens",
    bg: "bg-blue-50",
    text: "text-blue-700",
    border: "border-blue-200",
    icon: "M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z",
  },
  processen: {
    label: "Processen",
    bg: "bg-green-50",
    text: "text-green-700",
    border: "border-green-200",
    icon: "M4 6h16M4 12h16M4 18h16",
  },
  data_systemen: {
    label: "Data & Systemen",
    bg: "bg-purple-50",
    text: "text-purple-700",
    border: "border-purple-200",
    icon: "M4 7v10c0 2.21 3.582 4 8 4s8-1.79 8-4V7M4 7c0-2.21 3.582-4 8-4s8 1.79 8 4M4 7c0 2.21 3.582 4 8 4s8-1.79 8-4",
  },
  cultuur: {
    label: "Cultuur",
    bg: "bg-amber-50",
    text: "text-amber-700",
    border: "border-amber-200",
    icon: "M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z",
  },
};

const DOMEIN_ORDER = ["mens", "processen", "data_systemen", "cultuur"] as const;

export default function StapConsolidatie({
  session,
  stap2Result,
  stap3Result,
  stap4Result,
}: StapConsolidatieProps) {
  const { updateSession } = useSession();

  const [mergedCapClusters, setMergedCapClusters] = useState<Map<string, string>>(new Map());
  const [mergedEffClusters, setMergedEffClusters] = useState<Map<string, string>>(new Map());
  const [reviewedClusters, setReviewedClusters] = useState<Set<string>>(new Set());
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  // Phase 17 Wave 3 — failed auto-apply clusters + review + herzie state
  const [failedClusterKeys, setFailedClusterKeys] = useState<Set<string>>(new Set());
  const [clusterReasons, setClusterReasons] = useState<Record<string, string>>({});
  const [clusterContexts, setClusterContexts] = useState<Record<string, string>>({});
  const [herzienLoadingKeys, setHerzienLoadingKeys] = useState<Set<string>>(new Set());

  // Toast auto-clear
  useEffect(() => {
    if (toastMessage) {
      const timer = setTimeout(() => setToastMessage(null), 4000);
      return () => clearTimeout(timer);
    }
  }, [toastMessage]);

  const [autoApplied, setAutoApplied] = useState(false);

  const vermogenClusters = stap2Result?.vermogenClusters ?? [];
  const inspanningClusters = stap3Result?.inspanningClusters ?? [];
  const hasAnyClusters = vermogenClusters.length > 0 || inspanningClusters.length > 0;

  // Zoek voorgesteldeNaam uit stap4 advies voor een cluster
  function findSuggestedTitle(clusterTitel: string): string | undefined {
    if (!stap4Result?.consolidatieAdvies) return undefined;
    const advies = stap4Result.consolidatieAdvies.find(
      (a) => a.clusterTitel === clusterTitel && a.voorgesteldeNaam
    );
    return advies?.voorgesteldeNaam ?? undefined;
  }

  // --- Phase 17 Wave 3: Auto-apply "combineren" via 3-stappen pattern (W-5 fix) ---
  //
  // BELANGRIJK: React 19 Strict Mode dispatcht reducers tweemaal tijdens development.
  // Een setState binnen een updateSession(prev => ...) reducer is een anti-pattern
  // dat tot dubbele updates leidt. Het 3-stappen pattern borgt veiligheid:
  //  A) Pure compute buiten React state — muteer alleen lokale vars.
  //  B) updateSession met een pure reducer die alleen de voorberekende session returnt.
  //  C) Aparte setState calls buiten de reducer.
  useEffect(() => {
    if (autoApplied) return;
    const hasCombineren =
      inspanningClusters.some((c) => c.aanbeveling === "combineren");
    if (!hasCombineren) return;

    setAutoApplied(true);

    // === STAP A — Pure compute BUITEN React state ===
    const drieluikCtx: DrieluikContext = {
      gelijkenisGroepen: stap2Result?.vermogenGelijkenisGroepen ?? [],
      capEffortMaps: session.capabilityEffortMaps,
    };

    const clusters: AutoApplyCluster[] = inspanningClusters
      .filter((c) => c.aanbeveling === "combineren")
      .map((c) => {
        const ids = c.items.map((it) => it.id);
        return {
          key: [...ids].sort().join(","),
          itemIds: ids,
          suggestedTitle: findSuggestedTitle(c.clusterTitel),
        };
      });

    let updatedSession = session;
    const newMergeKeyMap = new Map(mergedEffClusters);
    const alreadyMerged = new Set(mergedEffClusters.keys());

    const mergeFn = (ids: string[], title?: string) => {
      updatedSession = mergeEfforts(updatedSession, ids, title, drieluikCtx);
      const sharedId = updatedSession.efforts[updatedSession.efforts.length - 1]?.id;
      if (sharedId) {
        newMergeKeyMap.set([...ids].sort().join(","), sharedId);
      }
    };

    const result = computeAutoApplyResult(clusters, alreadyMerged, mergeFn);

    // === STAP B — updateSession met voorberekende session (reducer is PUUR) ===
    updateSession(() => updatedSession);

    // === STAP C — aparte setState calls BUITEN de reducer ===
    setMergedEffClusters(() => newMergeKeyMap);
    setFailedClusterKeys(new Set(result.failedKeys));
    setClusterReasons(result.reasons);

    const mergedN = result.mergedKeys.length;
    const failedN = result.failedKeys.length;
    const summary =
      failedN > 0
        ? `${mergedN} cluster${mergedN !== 1 ? "s" : ""} samengevoegd, ${failedN} vereisen review`
        : `${mergedN} cluster${mergedN !== 1 ? "s" : ""} samengevoegd`;
    if (mergedN > 0 || failedN > 0) setToastMessage(summary);

    // Opmerking D-25: vermogen-clusters met "combineren" worden NIET meer auto-toegepast
    // in cross-analyse flow. mergeCapabilities blijft geëxporteerd voor legacy handmatige
    // use, maar Wave 2 prompt stelt "markeer_gelijkenis" voor op vermogens i.p.v. combineren.
  }, [stap2Result, stap3Result, stap4Result, autoApplied]); // eslint-disable-line react-hooks/exhaustive-deps

  // --- Consolidation handlers (per D-10 -- reuse existing pure functions) ---

  function handleMergeCapabilities(clusterItemIds: string[], clusterTitel?: string) {
    const title = clusterTitel ? findSuggestedTitle(clusterTitel) : undefined;
    // Phase 17: guard throws worden naar ConsolidationActionBar gepropageerd via try/catch in tryMerge.
    // Hier gebeurt de throw buiten de reducer — dus de reducer wordt niet gerold.
    let sharedId: string | undefined;
    updateSession((prev) => {
      const result = mergeCapabilities(prev, clusterItemIds, title);
      sharedId = result.capabilities[result.capabilities.length - 1]?.id;
      return result;
    });
    if (sharedId) {
      const key = [...clusterItemIds].sort().join(",");
      setMergedCapClusters((p) => new Map(p).set(key, sharedId!));
    }
    setToastMessage("Items samengevoegd");
  }

  function handleMergeEfforts(clusterItemIds: string[], clusterTitel?: string) {
    const title = clusterTitel ? findSuggestedTitle(clusterTitel) : undefined;
    // Pass DrieluikContext so D-27 drieluik-threshold wordt afgedwongen bij handmatig merge
    const drieluikCtx: DrieluikContext = {
      gelijkenisGroepen: stap2Result?.vermogenGelijkenisGroepen ?? [],
      capEffortMaps: session.capabilityEffortMaps,
    };
    let sharedId: string | undefined;
    // LET OP: mergeEfforts kan throw bij D-01/D-02/D-27 guards. Die throw wordt
    // doorgegeven via updateSession (synchroon in huidige implementatie).
    // ConsolidationActionBar catch't 'm in tryMerge().
    const merged = mergeEfforts(session, clusterItemIds, title, drieluikCtx);
    sharedId = merged.efforts[merged.efforts.length - 1]?.id;
    updateSession(() => merged);
    if (sharedId) {
      const key = [...clusterItemIds].sort().join(",");
      setMergedEffClusters((p) => new Map(p).set(key, sharedId!));
    }
    setToastMessage("Items samengevoegd");
  }

  function handleUndoMergeCap(sharedIdArg: string) {
    updateSession((prev) => undoMergeCapabilities(prev, sharedIdArg));
    setMergedCapClusters((prev) => {
      const next = new Map(prev);
      for (const [key, val] of next.entries()) {
        if (val === sharedIdArg) next.delete(key);
      }
      return next;
    });
    setToastMessage("Samenvoeging ongedaan gemaakt");
  }

  function handleUndoMergeEff(sharedIdArg: string) {
    updateSession((prev) => undoMergeEfforts(prev, sharedIdArg));
    setMergedEffClusters((prev) => {
      const next = new Map(prev);
      for (const [key, val] of next.entries()) {
        if (val === sharedIdArg) next.delete(key);
      }
      return next;
    });
    setToastMessage("Samenvoeging ongedaan gemaakt");
  }

  function handleReviewCluster(key: string) {
    setReviewedClusters((prev) => new Set(prev).add(key));
  }

  function getAfstemmingsStappen(clusterTitel: string): string[] {
    if (!stap4Result?.consolidatieAdvies) return [];
    const advies = stap4Result.consolidatieAdvies.find(
      (a) => a.clusterTitel === clusterTitel && a.aanbeveling === "afstemmen"
    );
    return advies?.afstemmingsStappen ?? [];
  }

  async function handleGenerateAdvice(
    clusterTitel: string,
    type: "vermogen" | "inspanning",
    items: { id: string; beschrijving: string; sector: string }[]
  ): Promise<string[]> {
    const itemDescriptions = items.map((it) => `- ${it.beschrijving} (${it.sector})`).join("\n");

    const response = await fetch("/api/din-suggest", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        type: "consolidatie-advies",
        prompt: `Je bent een expert in programmamanagement (DIN-methodiek).

Geef 3-4 concrete, actiegerichte stappen om de volgende ${type === "vermogen" ? "vermogens" : "inspanningen"} op elkaar af te stemmen ZONDER ze samen te voegen tot één item.

Cluster: "${clusterTitel}"
Items:
${itemDescriptions}

Geef per stap een korte, concrete actie die de programmamanager kan uitvoeren. Denk aan:
- Harmonisatie van KPI's of definities
- Gezamenlijk eigenaarschap of governance
- Gedeelde meetings of rapportages
- Afstemming van tijdlijnen
- Gezamenlijke kwaliteitscriteria

Antwoord als JSON array van strings: ["stap 1", "stap 2", "stap 3"]
Antwoord in het Nederlands.`,
      }),
    });

    if (!response.ok) return ["Kon geen advies genereren. Probeer het opnieuw."];

    const data = await response.json();
    if (data.data?.suggestions && Array.isArray(data.data.suggestions)) {
      return data.data.suggestions;
    }
    return ["Kon geen advies genereren. Probeer het opnieuw."];
  }

  // --- Phase 17 Wave 3 (D-19 + B-4 fix): Herzie-advies handler met subEffortAnalysis cache-invalidatie ---
  async function handleHerzieAdvies(
    clusterTitel: string,
    clusterItems: { id: string; beschrijving: string; sector: string }[],
    userContext: string
  ): Promise<void> {
    // Stash context for visual confirmation (cluster context saved)
    setClusterContexts((p) => ({ ...p, [clusterTitel]: userContext }));
    setHerzienLoadingKeys((prev) => new Set(prev).add(clusterTitel));

    try {
      const advies = stap4Result?.consolidatieAdvies?.find(
        (a) => a.clusterTitel === clusterTitel
      );

      const res = await fetch("/api/din-suggest", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          type: "consolidatie-herzien",
          clusterTitel,
          clusterItems,
          origineelAdvies: advies,
          userContext,
          kibGoals: session.goals,
          kibScope: session.scope,
        }),
      });

      const data = await res.json();

      if (data.success && stap4Result) {
        // === D-12 / B-4 fix — invalideer subEffortAnalysis voor getroffen groep(en) ===
        // Bepaal welke VermogenGelijkenisGroep(en) via capabilityEffortMap gelinkt zijn aan
        // de inspanningen in dit herziene cluster. subEffortAnalysis-entries met die groepId
        // worden verwijderd zodat een volgende Analyseer-run ze opnieuw genereert.
        const vermogenGelijkenisGroepen = stap2Result?.vermogenGelijkenisGroepen ?? [];
        const clusterEffortIds = clusterItems.map((it) => it.id);
        const affectedCapIds = clusterEffortIds.flatMap((iid) =>
          session.capabilityEffortMaps
            .filter((m) => m.effortId === iid)
            .map((m) => m.capabilityId)
        );
        const affectedGroepIds = new Set(
          vermogenGelijkenisGroepen
            .filter((g) => g.vermogenIds.some((vid) => affectedCapIds.includes(vid)))
            .map((g) => g.id)
        );
        const filteredSub =
          stap4Result.subEffortAnalysis?.filter(
            (s) => !affectedGroepIds.has(s.groepId)
          ) ?? [];

        // Overschrijf cluster in consolidatieAdvies + schrijf gefilterde subEffortAnalysis terug
        updateSession((prev) => {
          const updated = prev.crossAnalyseWizard?.stepResults?.stap4;
          if (!updated) return prev;
          const newConsolidatieAdvies = updated.consolidatieAdvies.map((a) =>
            a.clusterTitel === clusterTitel
              ? { ...a, ...data.data, context: userContext }
              : a
          );
          return {
            ...prev,
            crossAnalyseWizard: {
              ...prev.crossAnalyseWizard!,
              stepResults: {
                ...prev.crossAnalyseWizard!.stepResults,
                stap4: {
                  ...updated,
                  consolidatieAdvies: newConsolidatieAdvies,
                  subEffortAnalysis: filteredSub,
                },
              },
            },
          };
        });
        setToastMessage("Advies herzien");
      } else {
        setToastMessage(data.error || "Herzien mislukt");
      }
    } catch (err) {
      setToastMessage(err instanceof Error ? err.message : "Herzien mislukt");
    } finally {
      setHerzienLoadingKeys((prev) => {
        const next = new Set(prev);
        next.delete(clusterTitel);
        return next;
      });
    }
  }

  // --- No clusters available ---

  if (!hasAnyClusters) {
    return (
      <div className="flex flex-col items-center justify-center py-12 text-center">
        <div className="w-10 h-10 rounded-full bg-gray-100 flex items-center justify-center mb-3">
          <svg className="w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
          </svg>
        </div>
        <p className="text-sm text-gray-500 font-medium">Voer eerst stap 2 en 3 uit om clusters te zien</p>
        <p className="text-xs text-gray-400 mt-1">De consolidatie-stap werkt met de clusters uit de voorgaande analyses.</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Intro */}
      <div className="bg-gray-50 border border-gray-200 rounded-lg p-3">
        <p className="text-xs text-gray-600">
          Dit is de beslissingsstap: beoordeel per cluster of items <strong>samengevoegd</strong>,
          <strong> afgestemd</strong> of <strong>apart gehouden</strong> moeten worden. Samengevoegde
          items verschijnen als één gedeelde entiteit in het nieuwe DIN-netwerk (stap 5) en in de prioritering.
        </p>
      </div>

      {/* Toast message */}
      {toastMessage && (
        <div className="fixed top-4 right-4 z-50 bg-cito-blue text-white px-4 py-3 rounded-lg shadow-lg text-sm font-medium animate-fade-in">
          {toastMessage}
        </div>
      )}

      {/* Stap 5 consolidatie — volledige uitwerking van de 4 cross-sectorale inspanningen per domein */}
      {stap4Result?.subEffortAnalysis && stap4Result.subEffortAnalysis.length > 0 && (
        <>
          <div className="bg-[#003366] text-white rounded-lg p-5">
            <p className="text-[10px] font-semibold uppercase tracking-wider text-blue-200 mb-1">
              Geconsolideerde cross-sectorale inspanningen
            </p>
            <h4 className="text-base font-semibold mb-2">
              {stap4Result.subEffortAnalysis.filter((e) => e.actie === "combineren").length} inspanningen klaar voor optimalisatie (stap 6)
            </h4>
            <p className="text-sm text-blue-100 leading-relaxed">
              Volledige uitwerking per domein hieronder. Klik <strong>Volgende</strong> om ze te verfijnen in stap 6.
            </p>
            <div className="mt-3 grid grid-cols-2 sm:grid-cols-4 gap-2">
              {(["mens", "processen", "data_systemen", "cultuur"] as const).map((dom) => {
                const count = stap4Result.subEffortAnalysis.filter(
                  (e) => e.domein === dom && e.actie === "combineren"
                ).length;
                const meta = DOMEIN_META[dom];
                return (
                  <div key={dom} className="bg-white/10 border border-white/20 rounded px-2 py-1.5 text-center">
                    <p className="text-[10px] font-bold uppercase tracking-wider text-blue-100">{meta.label}</p>
                    <p className="text-lg font-semibold">{count}</p>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Rijke uitwerking per domein — read-only view, gedetailleerd zoals stap 6 maar zonder edits */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            {stap4Result.subEffortAnalysis.map((entry, i) => {
              const meta = DOMEIN_META[entry.domein];
              return (
                <div key={i} className={`border ${meta.border} ${meta.bg} rounded-lg p-4`}>
                  <div className="flex items-center justify-between mb-3 gap-2 flex-wrap">
                    <p className={`text-[10px] font-bold uppercase tracking-wider ${meta.text}`}>
                      {meta.label}
                    </p>
                    <span
                      className={`text-[9px] font-semibold px-1.5 py-0.5 rounded ${
                        entry.actie === "combineren"
                          ? "bg-green-100 text-green-700"
                          : "bg-gray-100 text-gray-600"
                      }`}
                    >
                      {entry.actie === "combineren" ? "Combineren" : "Apart"}
                    </span>
                  </div>
                  {(entry.titel || entry.voorgesteldeNaam) && (
                    <h4 className="text-sm font-semibold text-[#003366] mb-2 leading-snug">
                      {entry.titel || entry.voorgesteldeNaam}
                    </h4>
                  )}
                  {entry.beschrijving && (
                    <p className="text-[13px] text-gray-700 leading-relaxed mb-3">{entry.beschrijving}</p>
                  )}
                  {entry.beargumentatie && (
                    <section className="mb-3 pt-3 border-t border-gray-200">
                      <p className="text-[10px] font-semibold text-gray-500 uppercase tracking-wider mb-1">
                        Waarom cross-sectoraal opbouwen?
                      </p>
                      <p className="text-[12px] text-gray-700 leading-relaxed">{entry.beargumentatie}</p>
                    </section>
                  )}
                  {entry.vermogenImpact && entry.vermogenImpact.length > 0 && (
                    <section className="mt-3 pt-3 border-t border-gray-200">
                      <p className="text-[10px] font-semibold text-gray-500 uppercase tracking-wider mb-2">
                        Vermogen-impact per sector
                      </p>
                      <ul className="space-y-1.5">
                        {entry.vermogenImpact.map((v, j) => (
                          <li key={j} className="text-[12px] text-gray-700 leading-snug">
                            <strong className="text-gray-800">{v.sectorId}:</strong> {v.impact}
                          </li>
                        ))}
                      </ul>
                    </section>
                  )}
                  {entry.dossier && (
                    <section className="mt-3 pt-3 border-t border-gray-200">
                      <p className="text-[10px] font-semibold text-gray-500 uppercase tracking-wider mb-2">
                        Inspanningendossier
                      </p>
                      <dl className="space-y-1.5">
                        {([
                          ["Opdrachtgever", entry.dossier.eigenaar],
                          ["Inspanningsleider", entry.dossier.inspanningsleider],
                          ["Huidige situatie → verwacht resultaat", entry.dossier.verwachtResultaat],
                          ["Kostenraming", entry.dossier.kostenraming],
                          ["Randvoorwaarden / hoe we meten", entry.dossier.randvoorwaarden],
                        ] as const).map(([label, value]) =>
                          value && value.length > 0 ? (
                            <div key={label} className="grid grid-cols-[150px_1fr] gap-2 text-[12px]">
                              <dt className="font-semibold text-gray-500">{label}</dt>
                              <dd className="text-gray-700 leading-snug">{value}</dd>
                            </div>
                          ) : null
                        )}
                      </dl>
                    </section>
                  )}
                </div>
              );
            })}
          </div>
        </>
      )}

      {/* AI consolidatie-advies (verborgen onder details — referentie-only) */}
      {stap4Result && stap4Result.consolidatieAdvies.length > 0 && (
        <details className="space-y-3 bg-gray-50 border border-gray-200 rounded-lg p-3">
          <summary className="text-xs text-gray-600 cursor-pointer font-semibold">
            Referentie: AI consolidatie-advies per cluster (los van de 4 domein-inspanningen hierboven) — klik om te openen
          </summary>
          <div className="mt-3 space-y-3">
          <h5 className="text-sm font-semibold text-gray-700">AI consolidatie-advies (referentie)</h5>
          <div className="grid gap-3 sm:grid-cols-2">
            {stap4Result.consolidatieAdvies.map((advies, i) => {
              const style = AANBEVELING_STYLE[advies.aanbeveling] || AANBEVELING_STYLE.apart_houden;
              return (
                <div
                  key={i}
                  className={`${style.bg} border ${style.border} rounded-lg p-3`}
                >
                  <div className="flex items-start gap-2">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="text-sm font-semibold text-gray-800 truncate">{advies.clusterTitel}</span>
                        <span className={`inline-block px-1.5 py-0.5 rounded text-[10px] font-semibold ${style.text} ${style.bg} border ${style.border}`}>
                          {AANBEVELING_LABEL[advies.aanbeveling] || advies.aanbeveling}
                        </span>
                      </div>
                      <span className="text-[10px] text-gray-400 uppercase tracking-wider">
                        {advies.type === "vermogen" ? "Vermogen" : "Inspanning"}
                      </span>
                      <p className="text-xs text-gray-600 mt-1">{advies.reden}</p>
                      {advies.voorgesteldeNaam && (
                        <p className="text-xs text-gray-500 mt-1 italic">
                          Voorgestelde naam: {advies.voorgesteldeNaam}
                        </p>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
          {stap4Result.samenvatting && (
            <div className="bg-gray-50 border border-gray-200 rounded-lg p-3 mt-2">
              <p className="text-xs text-gray-600">{stap4Result.samenvatting}</p>
            </div>
          )}
          </div>
        </details>
      )}

      {/* Cito-breed inzicht per domein */}
      {stap4Result && stap4Result.citobreedInzicht && stap4Result.citobreedInzicht.length > 0 && (
        <div className="space-y-3">
          <div>
            <h5 className="text-sm font-semibold text-gray-700">Cito-breed inzicht per domein</h5>
            <p className="text-xs text-gray-500 mt-0.5">
              Ook als items niet geconsolideerd worden: dit zijn de kansen die Cito-breed (organisatie-overstijgend) kunnen gelden — per inspanningsdomein.
            </p>
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            {DOMEIN_ORDER.map((domein) => {
              const inzicht = stap4Result.citobreedInzicht!.find((i) => i.domein === domein);
              const meta = DOMEIN_META[domein];
              if (!inzicht) {
                return (
                  <div
                    key={domein}
                    className={`${meta.bg} border ${meta.border} border-dashed rounded-lg p-3 opacity-60`}
                  >
                    <div className="flex items-center gap-2 mb-1">
                      <svg className={`w-4 h-4 ${meta.text}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d={meta.icon} />
                      </svg>
                      <span className={`text-xs font-semibold ${meta.text}`}>{meta.label}</span>
                    </div>
                    <p className="text-[11px] text-gray-500 italic">Geen inzicht beschikbaar voor dit domein.</p>
                  </div>
                );
              }
              return (
                <div
                  key={domein}
                  className={`${meta.bg} border ${meta.border} rounded-lg p-3`}
                >
                  <div className="flex items-center gap-2 mb-1.5">
                    <svg className={`w-4 h-4 ${meta.text}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d={meta.icon} />
                    </svg>
                    <span className={`text-[10px] font-bold uppercase tracking-wider ${meta.text}`}>{meta.label}</span>
                  </div>
                  <p className="text-sm font-semibold text-gray-800 leading-snug">{inzicht.titel}</p>
                  <p className="text-xs text-gray-700 mt-1 leading-relaxed">{inzicht.beschrijving}</p>
                  {inzicht.onderbouwing && (
                    <p className="text-[11px] text-gray-600 mt-1.5 italic">
                      <span className="font-semibold not-italic">Waarom Cito-breed: </span>
                      {inzicht.onderbouwing}
                    </p>
                  )}
                  {inzicht.relevanteItems && inzicht.relevanteItems.length > 0 && (
                    <div className="mt-2 flex flex-wrap gap-1">
                      {inzicht.relevanteItems.map((item, i) => (
                        <span
                          key={i}
                          className={`text-[10px] ${meta.bg} ${meta.text} border ${meta.border} px-1.5 py-0.5 rounded`}
                        >
                          {item}
                        </span>
                      ))}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Vermogen clusters section */}
      {vermogenClusters.length > 0 && (
        <div className="space-y-3">
          <h5 className="text-sm font-semibold text-teal-700">
            Gedeelde vermogens <span className="text-xs font-normal text-gray-400">(uit stap 2)</span>
            <span className="ml-2 text-xs font-normal text-gray-400">· {vermogenClusters.length} clusters</span>
          </h5>
          <div className="space-y-3">
            {vermogenClusters.map((cluster, idx) => {
              const key = cluster.items.map((it) => it.id).sort().join(",");
              const isMerged = mergedCapClusters.has(key);
              const sharedId = mergedCapClusters.get(key);
              const isReviewed = reviewedClusters.has(key);

              return (
                <ClusterCard
                  key={idx}
                  cluster={cluster}
                  type="vermogen"
                  onMerge={(ids) => handleMergeCapabilities(ids, cluster.clusterTitel)}
                  isMerged={isMerged}
                  onUndo={handleUndoMergeCap}
                  sharedId={sharedId}
                  onReview={() => handleReviewCluster(key)}
                  isReviewed={isReviewed}
                  readOnly={false}
                  afstemmingsStappen={getAfstemmingsStappen(cluster.clusterTitel)}
                  onGenerateAdvice={() => handleGenerateAdvice(cluster.clusterTitel, "vermogen", cluster.items)}
                />
              );
            })}
          </div>
        </div>
      )}

      {/* Phase 18 (R-CROSS-03): inspanning-cluster handmatige review is verwijderd.
          De 4 domein-inspanningen uit stap 4 (Phase 18 sub-effort analyse) zijn
          leidend en worden in stap 6 (Optimaliseren) verfijnd. Geen parallel
          handmatig merge-spoor meer om conflicten te voorkomen. */}
    </div>
  );
}
