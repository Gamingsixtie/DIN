"use client";

import { useState, useMemo } from "react";
import { useSession } from "@/lib/session-context";
import {
  SECTORS,
  SECTOR_COLORS,
  DOMAIN_LABELS,
  DOMAIN_COLORS,
  generateQuarters,
} from "@/lib/types";
import type {
  EffortDomain,
  DINEffort,
  SectorName,
  PlanningVoorstel,
} from "@/lib/types";
import { LoadingOverlay } from "@/components/cross-analyse/shared";

const NADER_TE_BEPALEN = "Nader te bepalen";
const QUARTERS_AVAILABLE = generateQuarters(8);

const DOMAIN_ORDER: EffortDomain[] = ["mens", "processen", "data_systemen", "cultuur"];

function SectorBadge({ sector }: { sector: string }) {
  const colors = SECTOR_COLORS[sector as SectorName] || "bg-gray-100 text-gray-700 border-gray-200";
  return (
    <span className={`inline-block px-1.5 py-0.5 rounded text-[10px] font-medium border ${colors}`}>
      {sector}
    </span>
  );
}

function formatPlanningDate(iso?: string): string {
  if (!iso) return "";
  try {
    return new Date(iso).toLocaleString("nl-NL", {
      day: "numeric",
      month: "short",
      hour: "2-digit",
      minute: "2-digit",
    });
  } catch {
    return "";
  }
}

export default function PrioriteringStep() {
  const { session, updateSession } = useSession();
  const [isGenerating, setIsGenerating] = useState(false);
  const [aiError, setAiError] = useState<string | null>(null);
  const [userFeedback, setUserFeedback] = useState("");
  const [editingEffortId, setEditingEffortId] = useState<string | null>(null);

  const allEfforts = useMemo(
    () => (session ? session.efforts.filter((e) => !e.consolidated) : []),
    [session]
  );

  const planningVoorstel = session?.planningVoorstel;

  const stap4Complete =
    !!session?.crossAnalyseWizard?.stepResults?.stap4?.subEffortAnalysis &&
    session.crossAnalyseWizard.stepResults.stap4.subEffortAnalysis.length > 0;

  const beargumentatieMap = useMemo(() => {
    const m = new Map<string, string>();
    if (planningVoorstel?.inspanningPlanning) {
      for (const p of planningVoorstel.inspanningPlanning) {
        m.set(p.inspanningId, p.beargumentatie);
      }
    }
    return m;
  }, [planningVoorstel]);

  const afhankelijkhedenMap = useMemo(() => {
    const m = new Map<string, string[]>();
    if (planningVoorstel?.inspanningPlanning) {
      for (const p of planningVoorstel.inspanningPlanning) {
        if (p.afhankelijkVan && p.afhankelijkVan.length > 0) {
          m.set(p.inspanningId, p.afhankelijkVan);
        }
      }
    }
    return m;
  }, [planningVoorstel]);

  if (!session) return null;

  if (allEfforts.length === 0) {
    return (
      <div className="text-center py-16">
        <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-gray-100 flex items-center justify-center">
          <svg className="w-8 h-8 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M3 12h18M3 6h18M3 18h18" />
          </svg>
        </div>
        <p className="text-gray-500 font-medium mb-1">Nog geen inspanningen om te plannen</p>
        <p className="text-sm text-gray-400">
          Doorloop eerst de DIN-Mapping en Cross-analyse stappen.
        </p>
      </div>
    );
  }

  const totaal = allEfforts.length;
  const ingepland = allEfforts.filter((e) => e.quarter && e.quarter !== NADER_TE_BEPALEN).length;
  const nietIngepland = totaal - ingepland;

  async function handleGenerate() {
    if (!session || !stap4Complete) return;

    setIsGenerating(true);
    setAiError(null);

    try {
      const focusGoal = [...session.goals]
        .sort((a, b) => (a.rank ?? 999) - (b.rank ?? 999))[0] || null;

      const response = await fetch("/api/planning", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          focusGoal,
          efforts: allEfforts,
          stap4Result: session.crossAnalyseWizard?.stepResults?.stap4,
          stap5Result: session.crossAnalyseWizard?.stepResults?.stap5,
          availableQuarters: QUARTERS_AVAILABLE,
          kibGoals: session.goals,
          kibScope: session.scope,
          userFeedback: userFeedback || undefined,
        }),
      });

      const rawText = await response.text();
      let data: { success: boolean; error?: string; data?: PlanningVoorstel };
      try {
        data = JSON.parse(rawText);
      } catch {
        setAiError(
          response.status === 504
            ? "De planning-analyse duurde te lang (timeout). Probeer het opnieuw."
            : `Serverfout (${response.status}). Probeer het opnieuw.`
        );
        return;
      }

      if (!data.success || !data.data) {
        setAiError(data.error || "Het planning-voorstel is mislukt. Probeer het opnieuw.");
        return;
      }

      const voorstel = data.data;

      // Persisteer voorstel + pas kwartalen toe op efforts
      updateSession((prev) => {
        const quartersById = new Map<string, string>();
        for (const p of voorstel.inspanningPlanning) {
          quartersById.set(p.inspanningId, p.voorgesteldKwartaal);
        }
        return {
          planningVoorstel: voorstel,
          efforts: prev.efforts.map((e) => {
            const nieuwKwartaal = quartersById.get(e.id);
            if (!nieuwKwartaal) return e;
            return { ...e, quarter: nieuwKwartaal };
          }),
        };
      });

      setUserFeedback("");
    } catch (err) {
      setAiError(err instanceof Error ? err.message : "Onbekende fout bij planning-voorstel.");
    } finally {
      setIsGenerating(false);
    }
  }

  function updateQuarter(effortId: string, quarter: string) {
    updateSession((prev) => ({
      efforts: prev.efforts.map((e) =>
        e.id === effortId ? { ...e, quarter: quarter || undefined } : e
      ),
    }));
  }

  // Roadmap-matrix: per domein × kwartaal lijst met inspanningen
  const roadmapMatrix = useMemo(() => {
    const matrix: Record<EffortDomain, Record<string, DINEffort[]>> = {
      mens: {},
      processen: {},
      data_systemen: {},
      cultuur: {},
    };
    for (const q of QUARTERS_AVAILABLE) {
      for (const d of DOMAIN_ORDER) matrix[d][q] = [];
    }
    for (const e of allEfforts) {
      const q = e.quarter && e.quarter !== NADER_TE_BEPALEN ? e.quarter : null;
      if (!q || !QUARTERS_AVAILABLE.includes(q)) continue;
      if (!matrix[e.domain][q]) matrix[e.domain][q] = [];
      matrix[e.domain][q].push(e);
    }
    return matrix;
  }, [allEfforts]);

  const onbepaaldEfforts = allEfforts.filter(
    (e) => !e.quarter || e.quarter === NADER_TE_BEPALEN || !QUARTERS_AVAILABLE.includes(e.quarter)
  );

  // Balans-check: te veel in 1 domein × kwartaal, of ongebalanceerde verdeling
  const overloadCells: { domein: EffortDomain; quarter: string; count: number }[] = [];
  for (const d of DOMAIN_ORDER) {
    for (const q of QUARTERS_AVAILABLE) {
      const count = roadmapMatrix[d][q].length;
      if (count > 4) overloadCells.push({ domein: d, quarter: q, count });
    }
  }

  return (
    <div className="space-y-6">
      {isGenerating && (
        <LoadingOverlay
          title="AI stelt planning voor…"
          description="De AI bepaalt op basis van de cross-analyse welke kwartalen bij welke inspanningen passen."
        />
      )}

      {/* Sectie 1: Header + stats */}
      <div className="bg-white border border-gray-200 rounded-xl p-5">
        <div className="mb-4">
          <h3 className="text-lg font-semibold text-cito-blue">Roadmap & Planning</h3>
          <p className="text-xs text-gray-400 mt-0.5">
            Leg op basis van de cross-analyse (stap 4) een kwartaalplanning neer voor alle inspanningen, per domein.
          </p>
        </div>

        <div className="grid grid-cols-4 gap-3">
          <div className="bg-gray-50 rounded-lg p-3 text-center">
            <div className="text-xl font-bold text-cito-blue">{totaal}</div>
            <div className="text-[10px] text-gray-500 uppercase tracking-wider font-medium">Totaal inspanningen</div>
          </div>
          <div className="bg-blue-50 rounded-lg p-3 text-center">
            <div className="text-xl font-bold text-cito-accent">{ingepland}</div>
            <div className="text-[10px] text-cito-accent uppercase tracking-wider font-medium">Ingepland</div>
          </div>
          <div className="bg-amber-50 rounded-lg p-3 text-center">
            <div className="text-xl font-bold text-amber-600">{nietIngepland}</div>
            <div className="text-[10px] text-amber-600 uppercase tracking-wider font-medium">Nader te bepalen</div>
          </div>
          <div className="bg-gray-50 rounded-lg p-3 text-center">
            <div className="text-xl font-bold text-gray-600">
              {planningVoorstel ? "Ja" : "Nee"}
            </div>
            <div className="text-[10px] text-gray-500 uppercase tracking-wider font-medium">AI-voorstel aanwezig</div>
          </div>
        </div>
      </div>

      {/* Sectie 2: AI-voorstel */}
      <section className="bg-white border border-gray-200 rounded-xl overflow-hidden">
        <div className="px-5 py-4 border-b border-gray-100 flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-indigo-100 flex items-center justify-center">
            <svg className="w-4 h-4 text-indigo-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.813 15.904L9 18.75l-.813-2.846a4.5 4.5 0 00-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 003.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 003.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 00-3.09 3.09zM18.259 8.715L18 9.75l-.259-1.035a3.375 3.375 0 00-2.455-2.456L14.25 6l1.036-.259a3.375 3.375 0 002.455-2.456L18 2.25l.259 1.035a3.375 3.375 0 002.456 2.456L21.75 6l-1.035.259a3.375 3.375 0 00-2.456 2.456zM16.894 20.567L16.5 21.75l-.394-1.183a2.25 2.25 0 00-1.423-1.423L13.5 18.75l1.183-.394a2.25 2.25 0 001.423-1.423l.394-1.183.394 1.183a2.25 2.25 0 001.423 1.423l1.183.394-1.183.394a2.25 2.25 0 00-1.423 1.423z" />
            </svg>
          </div>
          <div className="flex-1">
            <h3 className="text-sm font-semibold text-cito-blue">AI-planning-voorstel</h3>
            <p className="text-xs text-gray-400">
              Genereer op basis van de cross-analyse stap 6 (geconsolideerde bundels) en stap 7 (prioriteitsview) een voorstel voor kwartaalplanning en cluster-fasering.
            </p>
          </div>
          {planningVoorstel?.gegenereerdOp && (
            <span className="text-[10px] text-gray-400">
              {formatPlanningDate(planningVoorstel.gegenereerdOp)}
            </span>
          )}
        </div>
        <div className="p-5 space-y-3">
          {!stap4Complete && (
            <div className="p-3 rounded-lg bg-amber-50 border border-amber-200 text-sm text-amber-700 flex items-start gap-2">
              <svg className="w-4 h-4 shrink-0 mt-0.5" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M8.485 2.495c.673-1.167 2.357-1.167 3.03 0l6.28 10.875c.673 1.167-.17 2.625-1.516 2.625H3.72c-1.347 0-2.189-1.458-1.515-2.625L8.485 2.495zM10 5a.75.75 0 01.75.75v3.5a.75.75 0 01-1.5 0v-3.5A.75.75 0 0110 5zm0 9a1 1 0 100-2 1 1 0 000 2z" clipRule="evenodd" />
              </svg>
              <div>
                <p className="font-medium">Cross-analyse stap 6 nog niet voltooid</p>
                <p className="text-xs mt-0.5">
                  Rond eerst de cross-analyse af (stap 6 &quot;Optimaliseren&quot;) zodat er geconsolideerde cross-sectorale inspanningen zijn om op te plannen.
                </p>
              </div>
            </div>
          )}

          {planningVoorstel?.samenvatting && (
            <div className="p-4 rounded-lg bg-indigo-50/50 border border-indigo-100">
              <div className="text-xs font-semibold text-indigo-700 uppercase tracking-wider mb-1">
                AI-samenvatting
              </div>
              <p className="text-sm text-gray-700 leading-relaxed">{planningVoorstel.samenvatting}</p>
            </div>
          )}

          <div>
            <label className="text-xs text-gray-500 mb-1 block">
              Optioneel: extra context voor het AI-voorstel (bijv. &quot;eerst alle Mens-inspanningen starten&quot;, &quot;geen parallelle IT-releases in Q3&quot;).
            </label>
            <textarea
              value={userFeedback}
              onChange={(e) => setUserFeedback(e.target.value)}
              disabled={isGenerating || !stap4Complete}
              className="w-full p-3 border border-gray-300 rounded-lg text-sm min-h-[60px] max-h-[120px] resize-y placeholder-gray-400 disabled:bg-gray-50 disabled:text-gray-400"
              placeholder="Extra instructies voor de AI..."
            />
          </div>

          {aiError && (
            <div className="p-3 rounded-lg bg-red-50 border border-red-200 text-sm text-red-700">
              <p className="font-medium">Planning-voorstel mislukt</p>
              <p className="text-xs mt-0.5">{aiError}</p>
            </div>
          )}

          <div className="flex items-center gap-3">
            <button
              onClick={handleGenerate}
              disabled={isGenerating || !stap4Complete}
              className="px-4 py-2 min-h-[40px] bg-cito-blue text-white rounded-lg text-sm font-medium hover:bg-cito-blue-light disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
            >
              {planningVoorstel ? "Planning opnieuw genereren" : "Genereer planning-voorstel"}
            </button>
            {planningVoorstel && (
              <span className="text-xs text-gray-400">
                {planningVoorstel.inspanningPlanning.length} inspanningen ingepland door AI
              </span>
            )}
          </div>
        </div>
      </section>

      {/* Sectie 3: Roadmap-grid (domein × kwartaal) */}
      <section className="bg-white border border-gray-200 rounded-xl overflow-hidden">
        <div className="px-5 py-4 border-b border-gray-100 flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-blue-100 flex items-center justify-center">
            <svg className="w-4 h-4 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 7.5L7.5 3m0 0L12 7.5M7.5 3v13.5m13.5 0L16.5 21m0 0L12 16.5m4.5 4.5V7.5" />
            </svg>
          </div>
          <div>
            <h3 className="text-sm font-semibold text-cito-blue">Roadmap — Domein × Kwartaal</h3>
            <p className="text-xs text-gray-400">
              Klik op een inspanning om het kwartaal aan te passen. AI-beargumentatie verschijnt in het pop-over.
            </p>
          </div>
        </div>
        <div className="p-5 overflow-x-auto">
          <div className="min-w-[900px]">
            {/* Header-rij met kwartalen */}
            <div
              className="grid gap-1.5 mb-2"
              style={{ gridTemplateColumns: `120px repeat(${QUARTERS_AVAILABLE.length}, minmax(110px, 1fr))` }}
            >
              <div />
              {QUARTERS_AVAILABLE.map((q) => (
                <div key={q} className="text-[11px] font-semibold text-gray-500 text-center py-1.5 border-b border-gray-100">
                  {q}
                </div>
              ))}
            </div>

            {/* Rijen per domein */}
            {DOMAIN_ORDER.map((domain) => {
              const colors = DOMAIN_COLORS[domain];
              return (
                <div
                  key={domain}
                  className="grid gap-1.5 mb-1.5"
                  style={{ gridTemplateColumns: `120px repeat(${QUARTERS_AVAILABLE.length}, minmax(110px, 1fr))` }}
                >
                  <div
                    className={`flex items-center gap-1.5 px-2 py-2 rounded-l-md ${colors.bg} ${colors.text}`}
                    style={{ borderLeft: `3px solid ${colors.bar}` }}
                  >
                    <span className="text-xs font-semibold uppercase tracking-wider">
                      {DOMAIN_LABELS[domain]}
                    </span>
                  </div>
                  {QUARTERS_AVAILABLE.map((q) => {
                    const cellEfforts = roadmapMatrix[domain][q];
                    const isOverload = cellEfforts.length > 4;
                    return (
                      <div
                        key={q}
                        className={`border rounded-md p-1 min-h-[60px] space-y-1 ${
                          isOverload
                            ? "border-red-300 bg-red-50/30"
                            : cellEfforts.length > 0
                            ? `${colors.border} bg-white`
                            : "border-gray-100 bg-gray-50/40"
                        }`}
                      >
                        {cellEfforts.map((e) => (
                          <RoadmapChip
                            key={e.id}
                            effort={e}
                            beargumentatie={beargumentatieMap.get(e.id)}
                            afhankelijkVan={afhankelijkhedenMap.get(e.id) || []}
                            allEfforts={allEfforts}
                            isEditing={editingEffortId === e.id}
                            onToggleEdit={() =>
                              setEditingEffortId(editingEffortId === e.id ? null : e.id)
                            }
                            onQuarterChange={(q2) => {
                              updateQuarter(e.id, q2);
                              setEditingEffortId(null);
                            }}
                          />
                        ))}
                      </div>
                    );
                  })}
                </div>
              );
            })}
          </div>

          {/* Nader te bepalen lane */}
          {onbepaaldEfforts.length > 0 && (
            <div className="mt-5 border border-amber-200 rounded-lg p-3 bg-amber-50/30">
              <div className="text-xs font-semibold text-amber-700 mb-2 flex items-center gap-1.5">
                <svg className="w-3.5 h-3.5" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M8.485 2.495c.673-1.167 2.357-1.167 3.03 0l6.28 10.875c.673 1.167-.17 2.625-1.516 2.625H3.72c-1.347 0-2.189-1.458-1.515-2.625L8.485 2.495zM10 5a.75.75 0 01.75.75v3.5a.75.75 0 01-1.5 0v-3.5A.75.75 0 0110 5zm0 9a1 1 0 100-2 1 1 0 000 2z" clipRule="evenodd" />
                </svg>
                Nader te bepalen ({onbepaaldEfforts.length})
              </div>
              <div className="grid grid-cols-2 md:grid-cols-3 gap-1.5">
                {onbepaaldEfforts.map((e) => (
                  <RoadmapChip
                    key={e.id}
                    effort={e}
                    beargumentatie={beargumentatieMap.get(e.id)}
                    afhankelijkVan={afhankelijkhedenMap.get(e.id) || []}
                    allEfforts={allEfforts}
                    isEditing={editingEffortId === e.id}
                    onToggleEdit={() =>
                      setEditingEffortId(editingEffortId === e.id ? null : e.id)
                    }
                    onQuarterChange={(q2) => {
                      updateQuarter(e.id, q2);
                      setEditingEffortId(null);
                    }}
                  />
                ))}
              </div>
            </div>
          )}
        </div>
      </section>

      {/* Sectie 4: Cluster-fasering */}
      {planningVoorstel?.clusterFasering && planningVoorstel.clusterFasering.length > 0 && (
        <section className="bg-white border border-gray-200 rounded-xl overflow-hidden">
          <div className="px-5 py-4 border-b border-gray-100 flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-purple-100 flex items-center justify-center">
              <svg className="w-4 h-4 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3.75 3v11.25A2.25 2.25 0 006 16.5h2.25M3.75 3h-1.5m1.5 0h16.5m0 0h1.5m-1.5 0v11.25A2.25 2.25 0 0118 16.5h-2.25m-7.5 0h7.5m-7.5 0l-1 3m8.5-3l1 3m0 0l.5 1.5m-.5-1.5h-9.5m0 0l-.5 1.5" />
              </svg>
            </div>
            <div>
              <h3 className="text-sm font-semibold text-cito-blue">Cluster-fasering</h3>
              <p className="text-xs text-gray-400">
                Per cross-sectorale bundel: periodes, mijlpalen en risico&apos;s.
              </p>
            </div>
          </div>
          <div className="p-5 grid grid-cols-1 md:grid-cols-2 gap-3">
            {planningVoorstel.clusterFasering.map((cluster, idx) => {
              const colors = DOMAIN_COLORS[cluster.domein];
              return (
                <div
                  key={`${cluster.clusterTitel}-${idx}`}
                  className={`rounded-lg border ${colors.border} overflow-hidden`}
                >
                  <div
                    className={`px-3 py-2 ${colors.bg} flex items-center gap-2`}
                    style={{ borderLeft: `3px solid ${colors.bar}` }}
                  >
                    <span className={`text-[10px] font-semibold uppercase tracking-wider ${colors.text}`}>
                      {DOMAIN_LABELS[cluster.domein]}
                    </span>
                    <span className="text-sm font-medium text-gray-800 flex-1 truncate" title={cluster.clusterTitel}>
                      {cluster.clusterTitel}
                    </span>
                  </div>
                  <div className="p-3 space-y-2">
                    {cluster.fases && cluster.fases.length > 0 && (
                      <ol className="space-y-1.5">
                        {cluster.fases.map((fase, fidx) => (
                          <li key={fidx} className="text-xs flex gap-2">
                            <span className="shrink-0 px-1.5 py-0.5 rounded bg-gray-100 text-gray-600 font-medium">
                              {fase.periode}
                            </span>
                            <span className="text-gray-700">{fase.mijlpaal}</span>
                          </li>
                        ))}
                      </ol>
                    )}
                    {cluster.risico && (
                      <div className="pt-2 border-t border-gray-100">
                        <p className="text-[11px] text-amber-700 italic">
                          <span className="font-medium not-italic">Risico: </span>
                          {cluster.risico}
                        </p>
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </section>
      )}

      {/* Sectie 5: Balans-check */}
      <section className="bg-white border border-gray-200 rounded-xl overflow-hidden">
        <div className="px-5 py-4 border-b border-gray-100 flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-emerald-100 flex items-center justify-center">
            <svg className="w-4 h-4 text-emerald-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </div>
          <div>
            <h3 className="text-sm font-semibold text-cito-blue">Balans-check</h3>
            <p className="text-xs text-gray-400">Signalen over overvolle kwartalen en domein-dekking.</p>
          </div>
        </div>
        <div className="p-5 space-y-3">
          {/* Per-sector: tel hoeveel inspanningen ingepland vs niet */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            {SECTORS.map((sector) => {
              const sEfforts = allEfforts.filter((e) => e.sectorId === sector);
              const sIngepland = sEfforts.filter(
                (e) => e.quarter && e.quarter !== NADER_TE_BEPALEN && QUARTERS_AVAILABLE.includes(e.quarter)
              ).length;
              const sTotal = sEfforts.length;
              const pct = sTotal > 0 ? Math.round((sIngepland / sTotal) * 100) : 0;
              const sectorColors = SECTOR_COLORS[sector];
              return (
                <div key={sector} className={`rounded-lg border p-3 ${sectorColors}`}>
                  <div className="font-semibold text-sm mb-1.5">{sector}</div>
                  {sTotal === 0 ? (
                    <p className="text-xs opacity-60">Geen inspanningen</p>
                  ) : (
                    <>
                      <div className="flex items-center justify-between text-xs mb-1">
                        <span>
                          {sIngepland} / {sTotal} ingepland
                        </span>
                        <span className="font-bold">{pct}%</span>
                      </div>
                      <div className="h-1.5 bg-white/50 rounded-full overflow-hidden">
                        <div
                          className="h-full bg-cito-blue rounded-full transition-all"
                          style={{ width: `${pct}%` }}
                        />
                      </div>
                    </>
                  )}
                </div>
              );
            })}
          </div>

          {overloadCells.length > 0 && (
            <div className="p-3 rounded-lg bg-red-50 border border-red-200">
              <p className="text-sm font-medium text-red-700 mb-1">Kwartalen met &gt;4 inspanningen in één domein:</p>
              <ul className="text-xs text-red-600 space-y-0.5">
                {overloadCells.map((c) => (
                  <li key={`${c.domein}-${c.quarter}`}>
                    • {DOMAIN_LABELS[c.domein]} in {c.quarter}: {c.count} inspanningen — overweeg spreiden
                  </li>
                ))}
              </ul>
            </div>
          )}

          {nietIngepland === 0 && overloadCells.length === 0 && (
            <div className="p-3 rounded-lg bg-green-50 border border-green-200 text-sm text-green-700 flex items-center gap-2">
              <svg className="w-4 h-4 shrink-0" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.857-9.809a.75.75 0 00-1.214-.882l-3.483 4.79-1.88-1.88a.75.75 0 10-1.06 1.061l2.5 2.5a.75.75 0 001.137-.089l4-5.5z" clipRule="evenodd" />
              </svg>
              <span>
                <strong>Gebalanceerd:</strong> alle inspanningen zijn ingepland en geen enkel domein × kwartaal is overvol.
              </span>
            </div>
          )}
        </div>
      </section>
    </div>
  );
}

// --- Sub-componenten ---

function RoadmapChip({
  effort,
  beargumentatie,
  afhankelijkVan,
  allEfforts,
  isEditing,
  onToggleEdit,
  onQuarterChange,
}: {
  effort: DINEffort;
  beargumentatie?: string;
  afhankelijkVan: string[];
  allEfforts: DINEffort[];
  isEditing: boolean;
  onToggleEdit: () => void;
  onQuarterChange: (quarter: string) => void;
}) {
  const domainColor = DOMAIN_COLORS[effort.domain].bar;

  const afhankelijkVanTitles = afhankelijkVan
    .map((id) => {
      const e = allEfforts.find((x) => x.id === id);
      return e ? e.title || e.description : null;
    })
    .filter((t): t is string => !!t);

  return (
    <div className="relative">
      <button
        onClick={onToggleEdit}
        className="w-full text-left bg-white border border-gray-200 rounded-md p-1.5 shadow-sm hover:border-cito-blue/50 hover:shadow transition-all"
        style={{ borderLeft: `3px solid ${domainColor}` }}
        title={effort.title || effort.description}
      >
        <div className="flex items-start gap-1.5">
          <SectorBadge sector={effort.sectorId} />
          <span className="text-[11px] text-gray-700 line-clamp-2 flex-1 leading-tight">
            {effort.title || effort.description || "(naamloos)"}
          </span>
          {beargumentatie && (
            <span className="shrink-0 text-[9px] px-1 rounded bg-indigo-50 text-indigo-600 font-medium" title="AI-beargumentatie beschikbaar">
              AI
            </span>
          )}
        </div>
        {effort.dossier?.eigenaar && (
          <div className="mt-0.5 text-[9px] text-gray-400 truncate">
            {effort.dossier.eigenaar}
          </div>
        )}
      </button>

      {isEditing && (
        <div className="absolute z-20 left-0 right-0 mt-1 bg-white border border-gray-300 rounded-lg shadow-xl p-3 min-w-[260px]">
          <div className="text-xs font-semibold text-gray-700 mb-2">
            {effort.title || effort.description || "(naamloos)"}
          </div>
          <label className="text-[10px] text-gray-500 block mb-1 uppercase tracking-wider">
            Kwartaal
          </label>
          <select
            value={effort.quarter || ""}
            onChange={(e) => onQuarterChange(e.target.value)}
            className="w-full px-2 py-1.5 border border-gray-200 rounded text-xs bg-white focus:outline-none focus:ring-1 focus:ring-cito-blue/30"
          >
            <option value="">— Nader te bepalen —</option>
            {QUARTERS_AVAILABLE.map((q) => (
              <option key={q} value={q}>
                {q}
              </option>
            ))}
          </select>

          {beargumentatie && (
            <div className="mt-3 pt-2 border-t border-gray-100">
              <div className="text-[10px] font-semibold text-indigo-600 uppercase tracking-wider mb-1">
                AI-beargumentatie
              </div>
              <p className="text-[11px] text-gray-600 leading-relaxed">{beargumentatie}</p>
            </div>
          )}

          {afhankelijkVanTitles.length > 0 && (
            <div className="mt-2 pt-2 border-t border-gray-100">
              <div className="text-[10px] font-semibold text-amber-600 uppercase tracking-wider mb-1">
                Afhankelijk van
              </div>
              <ul className="text-[11px] text-gray-600 space-y-0.5">
                {afhankelijkVanTitles.map((t, i) => (
                  <li key={i}>• {t}</li>
                ))}
              </ul>
            </div>
          )}

          <div className="mt-3 flex justify-end">
            <button
              onClick={onToggleEdit}
              className="text-[11px] text-gray-500 hover:text-gray-700 px-2 py-1 rounded hover:bg-gray-100"
            >
              Sluiten
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
