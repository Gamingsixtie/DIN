"use client";

import { useState, useMemo } from "react";
import { useSession } from "@/lib/session-context";
import {
  DOMAIN_LABELS,
  DOMAIN_COLORS,
  generateQuarters,
} from "@/lib/types";
import type {
  EffortDomain,
  PlanningVoorstel,
  BundelPlanning,
  SubEffortAdvies,
} from "@/lib/types";
import { LoadingOverlay } from "@/components/cross-analyse/shared";

const QUARTERS_AVAILABLE = generateQuarters(8);

// Outside-in (Cito-specifiek): Cultuur → Mens → Data & Systemen → Processen
const DOMAIN_ORDER: EffortDomain[] = ["cultuur", "mens", "data_systemen", "processen"];

function makeBundelId(b: SubEffortAdvies): string {
  return `${b.groepId}:${b.domein}`;
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

function quarterIndex(q: string): number {
  return QUARTERS_AVAILABLE.indexOf(q);
}

export default function PrioriteringStep() {
  const { session, updateSession } = useSession();
  const [isGenerating, setIsGenerating] = useState(false);
  const [aiError, setAiError] = useState<string | null>(null);
  const [userFeedback, setUserFeedback] = useState("");
  const [editingBundelId, setEditingBundelId] = useState<string | null>(null);

  const bundels = useMemo<SubEffortAdvies[]>(() => {
    const stap4 = session?.crossAnalyseWizard?.stepResults?.stap4;
    return stap4?.subEffortAnalysis ?? [];
  }, [session]);

  const planningVoorstel = session?.planningVoorstel;

  const bundelPlanningMap = useMemo(() => {
    const m = new Map<string, BundelPlanning>();
    if (planningVoorstel?.bundelPlanning) {
      for (const p of planningVoorstel.bundelPlanning) {
        m.set(p.bundelId, p);
      }
    }
    return m;
  }, [planningVoorstel]);

  if (!session) return null;

  const stap4Complete = bundels.length > 0;

  if (!stap4Complete) {
    return (
      <div className="text-center py-16">
        <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-amber-50 flex items-center justify-center">
          <svg className="w-8 h-8 text-amber-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126zM12 15.75h.007v.008H12v-.008z" />
          </svg>
        </div>
        <p className="text-gray-600 font-medium mb-1">Nog geen gezamenlijke inspanningen beschikbaar</p>
        <p className="text-sm text-gray-400 max-w-md mx-auto">
          Rond eerst Cross-analyse stap 6 (&quot;Optimaliseren geconsolideerde inspanningen&quot;) af. Daar worden de 4 gezamenlijke cross-sectorale inspanningen (Cultuur / Mens / Data &amp; Systemen / Processen) vastgesteld waarop deze roadmap is gebaseerd.
        </p>
      </div>
    );
  }

  const totalBundels = bundels.length;
  const ingeplandCount = bundels.filter((b) => bundelPlanningMap.has(makeBundelId(b))).length;

  const cycli = useMemo(() => {
    const byCyclus = new Map<string, BundelPlanning[]>();
    if (planningVoorstel?.bundelPlanning) {
      for (const p of planningVoorstel.bundelPlanning) {
        const arr = byCyclus.get(p.cyclusLabel) ?? [];
        arr.push(p);
        byCyclus.set(p.cyclusLabel, arr);
      }
    }
    return Array.from(byCyclus.entries())
      .map(([label, items]) => {
        const minStart = Math.min(...items.map((i) => quarterIndex(i.startKwartaal)));
        return { label, items, startIdx: minStart };
      })
      .sort((a, b) => a.startIdx - b.startIdx);
  }, [planningVoorstel]);

  async function handleGenerate() {
    if (!session || !stap4Complete) return;

    setIsGenerating(true);
    setAiError(null);

    try {
      const focusGoal =
        [...session.goals].sort((a, b) => (a.rank ?? 999) - (b.rank ?? 999))[0] || null;

      const response = await fetch("/api/planning", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          focusGoal,
          stap4Result: session.crossAnalyseWizard?.stepResults?.stap4,
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

      updateSession(() => ({ planningVoorstel: data.data }));
      setUserFeedback("");
    } catch (err) {
      setAiError(err instanceof Error ? err.message : "Onbekende fout bij planning-voorstel.");
    } finally {
      setIsGenerating(false);
    }
  }

  function updateBundelKwartalen(
    bundelId: string,
    startKwartaal: string,
    eindKwartaal: string
  ) {
    if (!planningVoorstel) return;
    const nextPlanning = planningVoorstel.bundelPlanning.map((p) =>
      p.bundelId === bundelId ? { ...p, startKwartaal, eindKwartaal } : p
    );
    updateSession(() => ({
      planningVoorstel: { ...planningVoorstel, bundelPlanning: nextPlanning },
    }));
  }

  return (
    <div className="space-y-6">
      {isGenerating && (
        <LoadingOverlay
          title="AI stelt planning voor…"
          description="De AI plant de 4 gezamenlijke inspanningen in cycli van 6-9 maanden."
        />
      )}

      {/* Sectie 1: Header + stats */}
      <div className="bg-white border border-gray-200 rounded-xl p-5">
        <div className="mb-4">
          <h3 className="text-lg font-semibold text-cito-blue">Roadmap &amp; Planning</h3>
          <p className="text-xs text-gray-400 mt-0.5">
            Plan de 4 gezamenlijke cross-sectorale inspanningen (uit cross-analyse stap 6) in cycli van 6-9 maanden op een roadmap.
          </p>
        </div>

        <div className="grid grid-cols-3 gap-3">
          <div className="bg-gray-50 rounded-lg p-3 text-center">
            <div className="text-xl font-bold text-cito-blue">{totalBundels}</div>
            <div className="text-[10px] text-gray-500 uppercase tracking-wider font-medium">
              Gezamenlijke inspanningen
            </div>
          </div>
          <div className="bg-blue-50 rounded-lg p-3 text-center">
            <div className="text-xl font-bold text-cito-accent">{ingeplandCount}</div>
            <div className="text-[10px] text-cito-accent uppercase tracking-wider font-medium">Ingepland</div>
          </div>
          <div className="bg-indigo-50 rounded-lg p-3 text-center">
            <div className="text-xl font-bold text-indigo-600">{cycli.length || "—"}</div>
            <div className="text-[10px] text-indigo-600 uppercase tracking-wider font-medium">Cycli</div>
          </div>
        </div>
      </div>

      {/* Sectie 2: AI-voorstel */}
      <section className="bg-white border border-gray-200 rounded-xl overflow-hidden">
        <div className="px-5 py-4 border-b border-gray-100 flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-indigo-100 flex items-center justify-center">
            <svg className="w-4 h-4 text-indigo-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.813 15.904L9 18.75l-.813-2.846a4.5 4.5 0 00-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 003.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 003.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 00-3.09 3.09z" />
            </svg>
          </div>
          <div className="flex-1">
            <h3 className="text-sm font-semibold text-cito-blue">AI-planning-voorstel</h3>
            <p className="text-xs text-gray-400">
              Genereer op basis van de 4 gezamenlijke inspanningen een kwartaal-roadmap met cycli van 6-9 maanden en mijlpalen.
            </p>
          </div>
          {planningVoorstel?.gegenereerdOp && (
            <span className="text-[10px] text-gray-400">
              {formatPlanningDate(planningVoorstel.gegenereerdOp)}
            </span>
          )}
        </div>
        <div className="p-5 space-y-3">
          {planningVoorstel?.samenvatting && (
            <div className="p-4 rounded-lg bg-indigo-50/50 border border-indigo-100">
              <div className="text-xs font-semibold text-indigo-700 uppercase tracking-wider mb-1">
                AI-samenvatting
              </div>
              <p className="text-sm text-gray-700 leading-relaxed whitespace-pre-wrap">
                {planningVoorstel.samenvatting}
              </p>
            </div>
          )}

          <div>
            <label className="text-xs text-gray-500 mb-1 block">
              Optioneel: extra context voor het AI-voorstel (bijv. &quot;eerst Cultuur, dan parallel Mens en Data&quot;, &quot;geen start in Q4 ivm zomerperiode&quot;).
            </label>
            <textarea
              value={userFeedback}
              onChange={(e) => setUserFeedback(e.target.value)}
              disabled={isGenerating}
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
              disabled={isGenerating}
              className="px-4 py-2 min-h-[40px] bg-cito-blue text-white rounded-lg text-sm font-medium hover:bg-cito-blue-light disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
            >
              {planningVoorstel ? "Planning opnieuw genereren" : "Genereer planning-voorstel"}
            </button>
            {planningVoorstel && (
              <span className="text-xs text-gray-400">
                {planningVoorstel.bundelPlanning.length} bundels ingepland door AI
              </span>
            )}
          </div>
        </div>
      </section>

      {/* Sectie 3: Roadmap Gantt-view (4 bundels × kwartalen) */}
      <section className="bg-white border border-gray-200 rounded-xl overflow-hidden">
        <div className="px-5 py-4 border-b border-gray-100 flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-blue-100 flex items-center justify-center">
            <svg className="w-4 h-4 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 17.25v1.007a3 3 0 01-.879 2.122L7.5 21h9l-.621-.621A3 3 0 0115 18.257V17.25m6-12V15a2.25 2.25 0 01-2.25 2.25H5.25A2.25 2.25 0 013 15V5.25m18 0A2.25 2.25 0 0018.75 3H5.25A2.25 2.25 0 003 5.25m18 0V12a2.25 2.25 0 01-2.25 2.25H5.25A2.25 2.25 0 013 12V5.25" />
            </svg>
          </div>
          <div>
            <h3 className="text-sm font-semibold text-cito-blue">Roadmap — 4 gezamenlijke inspanningen</h3>
            <p className="text-xs text-gray-400">
              Elke balk toont 1 cross-sectorale inspanning die 6-9 maanden loopt. Klik op een balk om start/eind aan te passen.
            </p>
          </div>
        </div>
        <div className="p-5 overflow-x-auto">
          <div className="min-w-[900px]">
            {/* Header-rij met kwartalen */}
            <div
              className="grid gap-1.5 mb-2"
              style={{ gridTemplateColumns: `160px repeat(${QUARTERS_AVAILABLE.length}, minmax(90px, 1fr))` }}
            >
              <div />
              {QUARTERS_AVAILABLE.map((q) => (
                <div
                  key={q}
                  className="text-[11px] font-semibold text-gray-500 text-center py-1.5 border-b border-gray-100"
                >
                  {q}
                </div>
              ))}
            </div>

            {/* Rijen per bundel (outside-in volgorde: Cultuur → Mens → Data → Processen) */}
            {DOMAIN_ORDER.map((domain) => {
              const bundel = bundels.find((b) => b.domein === domain);
              if (!bundel) return null;
              const bundelId = makeBundelId(bundel);
              const plan = bundelPlanningMap.get(bundelId);
              const colors = DOMAIN_COLORS[domain];

              return (
                <div
                  key={domain}
                  className="grid gap-1.5 mb-2 relative"
                  style={{ gridTemplateColumns: `160px repeat(${QUARTERS_AVAILABLE.length}, minmax(90px, 1fr))` }}
                >
                  {/* Label kolom */}
                  <div
                    className={`flex flex-col justify-center gap-0.5 px-2 py-2 rounded-l-md ${colors.bg}`}
                    style={{ borderLeft: `3px solid ${colors.bar}` }}
                  >
                    <span className={`text-xs font-semibold uppercase tracking-wider ${colors.text}`}>
                      {DOMAIN_LABELS[domain]}
                    </span>
                    <span className="text-[10px] text-gray-600 line-clamp-2" title={bundel.titel}>
                      {bundel.titel || bundel.voorgesteldeNaam || "(titel volgt)"}
                    </span>
                  </div>

                  {/* Kwartaal-cellen (lege achtergrond) */}
                  {QUARTERS_AVAILABLE.map((q) => (
                    <div
                      key={q}
                      className="border border-gray-100 rounded-sm min-h-[54px] bg-gray-50/40"
                    />
                  ))}

                  {/* Bar overlay */}
                  {plan && (
                    <GanttBar
                      plan={plan}
                      bundel={bundel}
                      onClick={() =>
                        setEditingBundelId(editingBundelId === bundelId ? null : bundelId)
                      }
                      isEditing={editingBundelId === bundelId}
                      onQuarterChange={(start, eind) =>
                        updateBundelKwartalen(bundelId, start, eind)
                      }
                      onClose={() => setEditingBundelId(null)}
                    />
                  )}
                </div>
              );
            })}

            {/* Cyclus-legenda onderaan */}
            {cycli.length > 0 && (
              <div className="mt-4 flex flex-wrap gap-2">
                {cycli.map((c) => {
                  const eindIdx = Math.max(
                    ...c.items.map((i) => quarterIndex(i.eindKwartaal))
                  );
                  const start = QUARTERS_AVAILABLE[c.startIdx] || "?";
                  const eind = QUARTERS_AVAILABLE[eindIdx] || "?";
                  return (
                    <span
                      key={c.label}
                      className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-indigo-50 border border-indigo-100 text-xs text-indigo-700"
                    >
                      <span className="font-semibold">{c.label}</span>
                      <span className="text-indigo-400">•</span>
                      <span className="text-indigo-600">
                        {start} → {eind}
                      </span>
                      <span className="text-indigo-400">•</span>
                      <span className="text-indigo-500">{c.items.length} bundel(s)</span>
                    </span>
                  );
                })}
              </div>
            )}
          </div>

          {!planningVoorstel && (
            <div className="mt-4 p-3 rounded-lg bg-gray-50 border border-gray-200 text-sm text-gray-600 text-center">
              Genereer een AI-planning-voorstel om de balken op de roadmap te plaatsen.
            </div>
          )}
        </div>
      </section>

      {/* Sectie 4: Mijlpalen per bundel */}
      {planningVoorstel?.bundelPlanning && planningVoorstel.bundelPlanning.length > 0 && (
        <section className="bg-white border border-gray-200 rounded-xl overflow-hidden">
          <div className="px-5 py-4 border-b border-gray-100 flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-purple-100 flex items-center justify-center">
              <svg className="w-4 h-4 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12.75L11.25 15 15 9.75m-3-7.036A11.959 11.959 0 013.598 6 11.99 11.99 0 003 9.75c0 5.592 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.31-.21-2.571-.598-3.751h-.152c-3.196 0-6.1-1.248-8.25-3.285z" />
              </svg>
            </div>
            <div>
              <h3 className="text-sm font-semibold text-cito-blue">Mijlpalen &amp; risico&apos;s per bundel</h3>
              <p className="text-xs text-gray-400">
                De concrete resultaten en aandachtspunten per gezamenlijke inspanning.
              </p>
            </div>
          </div>
          <div className="p-5 grid grid-cols-1 md:grid-cols-2 gap-3">
            {[...planningVoorstel.bundelPlanning]
              .sort(
                (a, b) => quarterIndex(a.startKwartaal) - quarterIndex(b.startKwartaal)
              )
              .map((plan) => {
                const colors = DOMAIN_COLORS[plan.domein];
                return (
                  <div
                    key={plan.bundelId}
                    className={`rounded-lg border overflow-hidden bg-white`}
                    style={{ borderColor: colors.bar + "40" }}
                  >
                    <div
                      className={`px-3 py-2 ${colors.bg} flex items-center gap-2`}
                      style={{ borderLeft: `3px solid ${colors.bar}` }}
                    >
                      <span
                        className={`text-[10px] font-semibold uppercase tracking-wider ${colors.text}`}
                      >
                        {DOMAIN_LABELS[plan.domein]}
                      </span>
                      <span className="text-sm font-medium text-gray-800 flex-1 truncate" title={plan.titel}>
                        {plan.titel}
                      </span>
                      <span className="text-[10px] px-1.5 py-0.5 rounded bg-white/70 text-gray-600 font-medium shrink-0">
                        {plan.cyclusLabel}
                      </span>
                    </div>
                    <div className="p-3 space-y-2">
                      <div className="text-[11px] text-gray-500">
                        {plan.startKwartaal} → {plan.eindKwartaal}
                      </div>
                      {plan.beargumentatie && (
                        <p className="text-xs text-gray-600 italic leading-relaxed">
                          {plan.beargumentatie}
                        </p>
                      )}
                      {plan.mijlpalen && plan.mijlpalen.length > 0 && (
                        <ol className="space-y-1.5 pt-1">
                          {plan.mijlpalen.map((m, idx) => (
                            <li key={idx} className="text-xs flex gap-2">
                              <span className="shrink-0 px-1.5 py-0.5 rounded bg-gray-100 text-gray-600 font-medium">
                                {m.periode}
                              </span>
                              <span className="text-gray-700">{m.mijlpaal}</span>
                            </li>
                          ))}
                        </ol>
                      )}
                      {plan.risico && (
                        <div className="pt-2 border-t border-gray-100">
                          <p className="text-[11px] text-amber-700 italic">
                            <span className="font-medium not-italic">Risico: </span>
                            {plan.risico}
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
    </div>
  );
}

// --- Sub-componenten ---

function GanttBar({
  plan,
  bundel,
  onClick,
  isEditing,
  onQuarterChange,
  onClose,
}: {
  plan: BundelPlanning;
  bundel: SubEffortAdvies;
  onClick: () => void;
  isEditing: boolean;
  onQuarterChange: (start: string, eind: string) => void;
  onClose: () => void;
}) {
  const colors = DOMAIN_COLORS[plan.domein];
  const startIdx = quarterIndex(plan.startKwartaal);
  const eindIdx = quarterIndex(plan.eindKwartaal);

  if (startIdx < 0 || eindIdx < 0 || eindIdx < startIdx) return null;

  // Grid-kolom: kolom 1 = label, kolom 2 = eerste kwartaal → gridColumnStart = 2 + startIdx
  const colStart = 2 + startIdx;
  const colSpan = eindIdx - startIdx + 1;

  return (
    <>
      <button
        onClick={onClick}
        className={`relative rounded-md px-2 py-2 text-[11px] font-medium text-left hover:shadow-md transition-shadow flex items-center gap-1.5 overflow-hidden`}
        style={{
          gridColumnStart: colStart,
          gridColumnEnd: `span ${colSpan}`,
          gridRowStart: 1,
          marginTop: 2,
          marginBottom: 2,
          backgroundColor: colors.bar,
          color: "white",
        }}
        title={`${plan.startKwartaal} → ${plan.eindKwartaal} • ${plan.cyclusLabel}`}
      >
        <span className="shrink-0 text-[9px] px-1 py-0.5 rounded bg-white/30 font-bold">
          {plan.cyclusLabel}
        </span>
        <span className="truncate">{plan.titel || bundel.titel || "(naamloos)"}</span>
      </button>

      {isEditing && (
        <div
          className="absolute z-30 bg-white border border-gray-300 rounded-lg shadow-xl p-4 min-w-[320px]"
          style={{
            top: "100%",
            left: `calc((100% / ${QUARTERS_AVAILABLE.length + 1}) * ${colStart})`,
            marginTop: 6,
          }}
        >
          <div className="text-xs font-semibold text-gray-700 mb-2">{plan.titel}</div>
          <div className="grid grid-cols-2 gap-2 mb-3">
            <div>
              <label className="text-[10px] text-gray-500 block mb-1 uppercase tracking-wider">
                Start
              </label>
              <select
                value={plan.startKwartaal}
                onChange={(e) => onQuarterChange(e.target.value, plan.eindKwartaal)}
                className="w-full px-2 py-1.5 border border-gray-200 rounded text-xs bg-white focus:outline-none focus:ring-1 focus:ring-cito-blue/30"
              >
                {QUARTERS_AVAILABLE.map((q) => (
                  <option key={q} value={q}>
                    {q}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="text-[10px] text-gray-500 block mb-1 uppercase tracking-wider">
                Eind
              </label>
              <select
                value={plan.eindKwartaal}
                onChange={(e) => onQuarterChange(plan.startKwartaal, e.target.value)}
                className="w-full px-2 py-1.5 border border-gray-200 rounded text-xs bg-white focus:outline-none focus:ring-1 focus:ring-cito-blue/30"
              >
                {QUARTERS_AVAILABLE.map((q) => (
                  <option key={q} value={q}>
                    {q}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="text-[10px] text-gray-400 mb-2">
            Cyclus: <span className="font-medium text-gray-600">{plan.cyclusLabel}</span>
          </div>

          {plan.beargumentatie && (
            <div className="mt-2 pt-2 border-t border-gray-100">
              <div className="text-[10px] font-semibold text-indigo-600 uppercase tracking-wider mb-1">
                AI-beargumentatie
              </div>
              <p className="text-[11px] text-gray-600 leading-relaxed">{plan.beargumentatie}</p>
            </div>
          )}

          <div className="mt-3 flex justify-end">
            <button
              onClick={onClose}
              className="text-[11px] text-gray-500 hover:text-gray-700 px-2 py-1 rounded hover:bg-gray-100"
            >
              Sluiten
            </button>
          </div>
        </div>
      )}
    </>
  );
}
