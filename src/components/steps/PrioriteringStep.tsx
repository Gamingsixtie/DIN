"use client";

import { useState, useMemo, useEffect } from "react";
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

// Subset van het begrotings-advies dat we nodig hebben om te projecteren naar kwartalen.
// Matcht shape uit StapOptimaliseren.tsx / /api/begroting-advies route.
type BegrotingInspanning = {
  inspanningTitel: string;
  groepId?: string;
  domein: EffortDomain;
  verdelingPerJaar: Array<{ jaar: number; euro: number }>;
  volgorde?: { rank: number };
};
type BegrotingScenario = {
  aantalJaren: number;
  inspanningen: BegrotingInspanning[];
};
type BegrotingAdvies = {
  startJaar: number;
  scenarios?: {
    optimaal?: BegrotingScenario | null;
    plus20?: BegrotingScenario | null;
    min20?: BegrotingScenario | null;
  };
};

/** Converteer (jaar, kwartaal-nr) naar label zoals in QUARTERS_AVAILABLE. */
function yearToQuarterLabel(jaar: number, kwartaal: 1 | 2 | 3 | 4): string {
  return `Q${kwartaal} ${jaar}`;
}

/** Clamp een kwartaal-label naar de beschikbare range. */
function clampQuarter(label: string, fallbackStart: boolean): string {
  if (QUARTERS_AVAILABLE.includes(label)) return label;
  return fallbackStart ? QUARTERS_AVAILABLE[0] : QUARTERS_AVAILABLE[QUARTERS_AVAILABLE.length - 1];
}

/**
 * Projecteer begrotings-advies (optimaal scenario) naar bundelPlanning.
 * Per bundel: eerste jaar met euro > 0 → Q1; laatste jaar met euro > 0 → Q4.
 * Clampt aan de beschikbare 8 kwartalen.
 */
function projectBegrotingToBundels(
  advies: BegrotingAdvies,
  displayBundels: DisplayBundel[]
): BundelPlanning[] {
  const scenario = advies.scenarios?.optimaal || advies.scenarios?.plus20 || advies.scenarios?.min20;
  if (!scenario?.inspanningen || scenario.inspanningen.length === 0) return [];

  const out: BundelPlanning[] = [];
  for (const d of displayBundels) {
    // Match op groepId+domein indien mogelijk, anders alleen op domein.
    const match =
      scenario.inspanningen.find(
        (i) => i.groepId && `${i.groepId}:${i.domein}` === d.bundelId && i.domein === d.domein
      ) || scenario.inspanningen.find((i) => i.domein === d.domein);
    if (!match) continue;

    const actiefJaren = match.verdelingPerJaar.filter((j) => j.euro > 0).map((j) => j.jaar);
    if (actiefJaren.length === 0) continue;

    const startJaar = Math.min(...actiefJaren);
    const eindJaar = Math.max(...actiefJaren);
    const startLabel = clampQuarter(yearToQuarterLabel(startJaar, 1), true);
    const eindLabel = clampQuarter(yearToQuarterLabel(eindJaar, 4), false);

    const rank = match.volgorde?.rank ?? startJaar - advies.startJaar + 1;

    out.push({
      bundelId: d.bundelId,
      domein: d.domein,
      titel: match.inspanningTitel || d.defaultTitel,
      startKwartaal: startLabel,
      eindKwartaal: eindLabel,
      cyclusLabel: `Cyclus ${Math.max(1, rank)}`,
      beargumentatie: `Overgenomen uit begrotingsadvies (jaar ${startJaar}–${eindJaar}).`,
      afhankelijkVan: [],
      mijlpalen: [],
    });
  }
  return out;
}

// Default placeholder-titels per domein wanneer cross-analyse nog niet is gedaan.
const PLACEHOLDER_TITELS: Record<EffortDomain, string> = {
  cultuur: "Gezamenlijke cultuur-inspanning",
  mens: "Gezamenlijke mens-inspanning",
  data_systemen: "Gezamenlijke data & systemen-inspanning",
  processen: "Gezamenlijke processen-inspanning",
};

function makeBundelIdFromStap4(b: SubEffortAdvies): string {
  return `${b.groepId}:${b.domein}`;
}

function makeManualBundelId(domein: EffortDomain): string {
  return `manual:${domein}`;
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

// "Display bundels" — altijd 4 entries (1 per domein).
// Als cross-analyse bundels zijn: gebruik die. Anders: 4 handmatige placeholders.
interface DisplayBundel {
  bundelId: string;
  domein: EffortDomain;
  defaultTitel: string;
  sourceDescription?: string;  // beschrijving uit stap 4 indien aanwezig
}

function buildDisplayBundels(stap4Bundels: SubEffortAdvies[]): DisplayBundel[] {
  return DOMAIN_ORDER.map((domein) => {
    const fromStap4 = stap4Bundels.find((b) => b.domein === domein);
    if (fromStap4) {
      return {
        bundelId: makeBundelIdFromStap4(fromStap4),
        domein,
        defaultTitel:
          fromStap4.titel || fromStap4.voorgesteldeNaam || PLACEHOLDER_TITELS[domein],
        sourceDescription: fromStap4.beschrijving,
      };
    }
    return {
      bundelId: makeManualBundelId(domein),
      domein,
      defaultTitel: PLACEHOLDER_TITELS[domein],
    };
  });
}

export default function PrioriteringStep() {
  const { session, updateSession } = useSession();
  const [isGenerating, setIsGenerating] = useState(false);
  const [aiError, setAiError] = useState<string | null>(null);
  const [userFeedback, setUserFeedback] = useState("");
  const [editingBundelId, setEditingBundelId] = useState<string | null>(null);
  const [toelichting, setToelichting] = useState<string>("");
  const [isPolishing, setIsPolishing] = useState(false);
  const [toelichtingError, setToelichtingError] = useState<string | null>(null);

  const stap4Bundels = useMemo<SubEffortAdvies[]>(() => {
    const stap4 = session?.crossAnalyseWizard?.stepResults?.stap4;
    return stap4?.subEffortAnalysis ?? [];
  }, [session]);

  const begrotingAdvies = useMemo<BegrotingAdvies | null>(() => {
    const stap4 = session?.crossAnalyseWizard?.stepResults?.stap4 as unknown as
      | { begrotingAdvies?: BegrotingAdvies }
      | undefined;
    return stap4?.begrotingAdvies ?? null;
  }, [session]);

  const hasBegrotingProjectie = useMemo(() => {
    if (!begrotingAdvies) return false;
    const s =
      begrotingAdvies.scenarios?.optimaal ||
      begrotingAdvies.scenarios?.plus20 ||
      begrotingAdvies.scenarios?.min20;
    return !!s?.inspanningen && s.inspanningen.length > 0;
  }, [begrotingAdvies]);

  const displayBundels = useMemo(() => buildDisplayBundels(stap4Bundels), [stap4Bundels]);

  const planningVoorstel = session?.planningVoorstel;

  // Sync toelichting uit session → local state bij wissel
  useEffect(() => {
    setToelichting(planningVoorstel?.toelichting || "");
  }, [planningVoorstel?.toelichting, session?.id]);

  // Auto-projectie uit begrotings-advies: alleen wanneer er NOG GEEN eigen
  // bundelPlanning is. Vult de 4 bundels met start/eind kwartaal obv de jaarverdeling.
  useEffect(() => {
    if (!session || !begrotingAdvies || !hasBegrotingProjectie) return;
    const huidige = planningVoorstel?.bundelPlanning ?? [];
    if (huidige.length > 0) return; // user heeft al iets — niet overschrijven
    const geprojecteerd = projectBegrotingToBundels(begrotingAdvies, displayBundels);
    if (geprojecteerd.length === 0) return;

    const existing = planningVoorstel ?? {
      bundelPlanning: [],
      samenvatting: "",
      toelichting: toelichting,
    };
    updateSession(() => ({
      planningVoorstel: {
        ...existing,
        bundelPlanning: geprojecteerd,
        samenvatting:
          existing.samenvatting ||
          "Eerste generieke planning automatisch geprojecteerd uit het begrotingsadvies (scenario optimaal).",
      },
    }));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [begrotingAdvies, hasBegrotingProjectie, session?.id]);

  function handleProjecteerUitBegroting() {
    if (!session || !begrotingAdvies) return;
    const geprojecteerd = projectBegrotingToBundels(begrotingAdvies, displayBundels);
    if (geprojecteerd.length === 0) return;
    const existing = planningVoorstel ?? {
      bundelPlanning: [],
      samenvatting: "",
      toelichting: toelichting,
    };
    updateSession(() => ({
      planningVoorstel: {
        ...existing,
        bundelPlanning: geprojecteerd,
        samenvatting:
          existing.samenvatting ||
          "Eerste generieke planning geprojecteerd uit het begrotingsadvies (scenario optimaal).",
      },
    }));
  }

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

  const stap4Complete = stap4Bundels.length > 0;
  const ingeplandCount = displayBundels.filter((d) => bundelPlanningMap.has(d.bundelId)).length;

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

      // Behoud bestaande toelichting bij hergeneratie
      const nextVoorstel: PlanningVoorstel = {
        ...data.data,
        toelichting: toelichting || data.data.toelichting || "",
      };
      updateSession(() => ({ planningVoorstel: nextVoorstel }));
      setUserFeedback("");
    } catch (err) {
      setAiError(err instanceof Error ? err.message : "Onbekende fout bij planning-voorstel.");
    } finally {
      setIsGenerating(false);
    }
  }

  function upsertBundel(
    bundelId: string,
    domein: EffortDomain,
    changes: Partial<BundelPlanning>
  ) {
    if (!session) return;
    const existing = bundelPlanningMap.get(bundelId);
    const display = displayBundels.find((d) => d.bundelId === bundelId);
    const newEntry: BundelPlanning = existing
      ? { ...existing, ...changes }
      : {
          bundelId,
          domein,
          titel: display?.defaultTitel || "",
          startKwartaal: QUARTERS_AVAILABLE[0],
          eindKwartaal: QUARTERS_AVAILABLE[Math.min(2, QUARTERS_AVAILABLE.length - 1)],
          cyclusLabel: "Cyclus 1",
          beargumentatie: "",
          afhankelijkVan: [],
          mijlpalen: [],
          ...changes,
        };

    const existingPlanning = planningVoorstel ?? {
      bundelPlanning: [],
      samenvatting: "",
      toelichting: toelichting,
    };
    const others = existingPlanning.bundelPlanning.filter((p) => p.bundelId !== bundelId);
    const nextVoorstel: PlanningVoorstel = {
      ...existingPlanning,
      bundelPlanning: [...others, newEntry],
    };
    updateSession(() => ({ planningVoorstel: nextVoorstel }));
  }

  function saveToelichting(text: string) {
    const existingPlanning = planningVoorstel ?? {
      bundelPlanning: [],
      samenvatting: "",
      toelichting: "",
    };
    updateSession(() => ({
      planningVoorstel: { ...existingPlanning, toelichting: text },
    }));
  }

  async function handlePolishToelichting(mode: "polish" | "enrich") {
    if (!toelichting.trim()) return;

    setIsPolishing(true);
    setToelichtingError(null);

    try {
      const response = await fetch("/api/planning-toelichting", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          toelichting,
          bundels: planningVoorstel?.bundelPlanning || [],
          mode,
        }),
      });

      const rawText = await response.text();
      let data: { success: boolean; error?: string; data?: { toelichting: string } };
      try {
        data = JSON.parse(rawText);
      } catch {
        setToelichtingError("Serverfout bij verbeteren van de toelichting.");
        return;
      }

      if (!data.success || !data.data) {
        setToelichtingError(data.error || "De AI kon de toelichting niet verbeteren.");
        return;
      }

      setToelichting(data.data.toelichting);
      saveToelichting(data.data.toelichting);
    } catch (err) {
      setToelichtingError(err instanceof Error ? err.message : "Onbekende fout.");
    } finally {
      setIsPolishing(false);
    }
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
            Plan de 4 gezamenlijke cross-sectorale inspanningen (één per domein) in cycli van 6-9 maanden op een roadmap.
          </p>
        </div>

        <div className="grid grid-cols-3 gap-3">
          <div className="bg-gray-50 rounded-lg p-3 text-center">
            <div className="text-xl font-bold text-cito-blue">{displayBundels.length}</div>
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

        {!stap4Complete && (
          <div className="mt-4 p-3 rounded-lg bg-amber-50 border border-amber-100 text-xs text-amber-700 flex items-start gap-2">
            <svg className="w-4 h-4 shrink-0 mt-0.5" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
            </svg>
            <span>
              <strong>Cross-analyse stap 6 is nog niet gedaan.</strong> Je kunt hieronder alvast handmatig de 4 gezamenlijke inspanningen titelen en plannen. De AI-voorstel-knop werkt pas wanneer stap 6 is afgerond.
            </span>
          </div>
        )}
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
              disabled={isGenerating || !stap4Complete}
              className="w-full p-3 border border-gray-300 rounded-lg text-sm min-h-[60px] max-h-[120px] resize-y placeholder-gray-400 disabled:bg-gray-50 disabled:text-gray-400"
              placeholder={
                stap4Complete
                  ? "Extra instructies voor de AI..."
                  : "Beschikbaar nadat cross-analyse stap 6 is afgerond."
              }
            />
          </div>

          {aiError && (
            <div className="p-3 rounded-lg bg-red-50 border border-red-200 text-sm text-red-700">
              <p className="font-medium">Planning-voorstel mislukt</p>
              <p className="text-xs mt-0.5">{aiError}</p>
            </div>
          )}

          <div className="flex items-center gap-3 flex-wrap">
            <button
              onClick={handleGenerate}
              disabled={isGenerating || !stap4Complete}
              className="px-4 py-2 min-h-[40px] bg-cito-blue text-white rounded-lg text-sm font-medium hover:bg-cito-blue-light disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
              title={stap4Complete ? undefined : "Beschikbaar na cross-analyse stap 6"}
            >
              {planningVoorstel?.bundelPlanning && planningVoorstel.bundelPlanning.length > 0
                ? "Planning opnieuw genereren"
                : "Genereer planning-voorstel"}
            </button>
            {hasBegrotingProjectie && (
              <button
                onClick={handleProjecteerUitBegroting}
                className="px-3 py-2 min-h-[40px] text-sm font-medium text-emerald-700 bg-emerald-50 hover:bg-emerald-100 rounded-lg border border-emerald-200 transition-colors inline-flex items-center gap-1.5"
                title="Projecteer de jaren uit het begrotingsadvies als start/eind per bundel"
              >
                <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h18M3 14h18m-9-4v8m-7 0h14a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
                </svg>
                Overnemen uit begroting
              </button>
            )}
            {planningVoorstel?.bundelPlanning && planningVoorstel.bundelPlanning.length > 0 && (
              <span className="text-xs text-gray-400">
                {planningVoorstel.bundelPlanning.length} bundels ingepland
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
              Klik op de balk (of op een domein zonder balk) om titel, cyclus en start/eind aan te passen.
            </p>
          </div>
        </div>
        <div className="p-5 overflow-x-auto">
          <div className="min-w-[900px]">
            {/* Header-rij met kwartalen */}
            <div
              className="grid gap-1.5 mb-2"
              style={{ gridTemplateColumns: `180px repeat(${QUARTERS_AVAILABLE.length}, minmax(90px, 1fr))` }}
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

            {/* 4 rijen (outside-in volgorde) — altijd zichtbaar */}
            {displayBundels.map((d) => {
              const plan = bundelPlanningMap.get(d.bundelId);
              const colors = DOMAIN_COLORS[d.domein];
              const isEditing = editingBundelId === d.bundelId;

              return (
                <div
                  key={d.bundelId}
                  className="grid gap-1.5 mb-2 relative"
                  style={{ gridTemplateColumns: `180px repeat(${QUARTERS_AVAILABLE.length}, minmax(90px, 1fr))` }}
                >
                  {/* Label kolom */}
                  <div
                    className={`flex flex-col justify-center gap-0.5 px-2 py-2 rounded-l-md ${colors.bg}`}
                    style={{ borderLeft: `3px solid ${colors.bar}` }}
                  >
                    <span className={`text-xs font-semibold uppercase tracking-wider ${colors.text}`}>
                      {DOMAIN_LABELS[d.domein]}
                    </span>
                    <span
                      className="text-[10px] text-gray-600 line-clamp-2"
                      title={plan?.titel || d.defaultTitel}
                    >
                      {plan?.titel || d.defaultTitel}
                    </span>
                  </div>

                  {/* Kwartaal-cellen (lege achtergrond) */}
                  {QUARTERS_AVAILABLE.map((q) => (
                    <button
                      key={q}
                      onClick={() => setEditingBundelId(isEditing ? null : d.bundelId)}
                      className="border border-gray-100 rounded-sm min-h-[54px] bg-gray-50/40 hover:bg-gray-100/60 transition-colors"
                      aria-label={`Bewerk ${DOMAIN_LABELS[d.domein]}`}
                      tabIndex={-1}
                    />
                  ))}

                  {/* Bar overlay wanneer plan aanwezig is */}
                  {plan ? (
                    <GanttBar
                      plan={plan}
                      defaultTitel={d.defaultTitel}
                      onClick={() => setEditingBundelId(isEditing ? null : d.bundelId)}
                    />
                  ) : (
                    <button
                      onClick={() => setEditingBundelId(isEditing ? null : d.bundelId)}
                      className="absolute right-2 top-1/2 -translate-y-1/2 text-[10px] text-gray-400 hover:text-cito-blue font-medium px-2 py-1 rounded border border-dashed border-gray-300 hover:border-cito-blue bg-white"
                      style={{ zIndex: 2 }}
                    >
                      + Plan deze inspanning
                    </button>
                  )}

                  {/* Edit popover */}
                  {isEditing && (
                    <BundelEditor
                      display={d}
                      plan={plan}
                      onSave={(changes) => upsertBundel(d.bundelId, d.domein, changes)}
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
        </div>
      </section>

      {/* Sectie 4: Mijlpalen per bundel (alleen als er planning is) */}
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

      {/* Sectie 5: Eigen toelichting + AI-polish */}
      <section className="bg-white border border-gray-200 rounded-xl overflow-hidden">
        <div className="px-5 py-4 border-b border-gray-100 flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-emerald-100 flex items-center justify-center">
            <svg className="w-4 h-4 text-emerald-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16.862 4.487l1.687-1.688a1.875 1.875 0 112.652 2.652L6.832 19.82a4.5 4.5 0 01-1.897 1.13l-2.685.8.8-2.685a4.5 4.5 0 011.13-1.897L16.863 4.487zm0 0L19.5 7.125" />
            </svg>
          </div>
          <div>
            <h3 className="text-sm font-semibold text-cito-blue">Eigen toelichting</h3>
            <p className="text-xs text-gray-400">
              Schrijf in eigen woorden hoe je de roadmap wilt uitvoeren. Optioneel laat je de AI de tekst polijsten of verrijken.
            </p>
          </div>
        </div>
        <div className="p-5 space-y-3">
          <textarea
            value={toelichting}
            onChange={(e) => setToelichting(e.target.value)}
            onBlur={() => saveToelichting(toelichting)}
            disabled={isPolishing}
            placeholder="Bijv: We starten cyclus 1 met Cultuur en Mens parallel, omdat de bereidheid eerst moet groeien. Data & Systemen volgt in cyclus 2 zodra de training-behoefte helder is. Processen sluiten we af in cyclus 3 om wat is opgebouwd te borgen..."
            className="w-full p-3 border border-gray-300 rounded-lg text-sm min-h-[140px] max-h-[320px] resize-y placeholder-gray-400 disabled:bg-gray-50 disabled:text-gray-400"
          />

          {toelichtingError && (
            <div className="p-3 rounded-lg bg-red-50 border border-red-200 text-sm text-red-700">
              {toelichtingError}
            </div>
          )}

          <div className="flex items-center gap-2 flex-wrap">
            <button
              onClick={() => handlePolishToelichting("polish")}
              disabled={isPolishing || !toelichting.trim()}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-indigo-700 bg-indigo-50 hover:bg-indigo-100 rounded-md border border-indigo-200 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
            >
              <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.813 15.904L9 18.75l-.813-2.846a4.5 4.5 0 00-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 003.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 003.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 00-3.09 3.09z" />
              </svg>
              {isPolishing ? "Bezig..." : "Verbeter zinnen (spelling & stijl)"}
            </button>
            <button
              onClick={() => handlePolishToelichting("enrich")}
              disabled={isPolishing || !toelichting.trim()}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-purple-700 bg-purple-50 hover:bg-purple-100 rounded-md border border-purple-200 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
            >
              <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6V4m0 2a2 2 0 100 4m0-4a2 2 0 110 4m-6 8a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4m6 6v10m6-2a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4" />
              </svg>
              {isPolishing ? "Bezig..." : "Verrijk met AI"}
            </button>
            <span className="text-[10px] text-gray-400 ml-1">
              Optioneel — alleen als je de tekst wilt laten verbeteren.
            </span>
          </div>
        </div>
      </section>
    </div>
  );
}

// --- Sub-componenten ---

function GanttBar({
  plan,
  defaultTitel,
  onClick,
}: {
  plan: BundelPlanning;
  defaultTitel: string;
  onClick: () => void;
}) {
  const colors = DOMAIN_COLORS[plan.domein];
  const startIdx = quarterIndex(plan.startKwartaal);
  const eindIdx = quarterIndex(plan.eindKwartaal);

  if (startIdx < 0 || eindIdx < 0 || eindIdx < startIdx) return null;

  const colStart = 2 + startIdx;
  const colSpan = eindIdx - startIdx + 1;

  return (
    <button
      onClick={onClick}
      className="relative rounded-md px-2 py-2 text-[11px] font-medium text-left hover:shadow-md transition-shadow flex items-center gap-1.5 overflow-hidden"
      style={{
        gridColumnStart: colStart,
        gridColumnEnd: `span ${colSpan}`,
        gridRowStart: 1,
        marginTop: 2,
        marginBottom: 2,
        backgroundColor: colors.bar,
        color: "white",
        zIndex: 3,
      }}
      title={`${plan.startKwartaal} → ${plan.eindKwartaal} • ${plan.cyclusLabel}`}
    >
      <span className="shrink-0 text-[9px] px-1 py-0.5 rounded bg-white/30 font-bold">
        {plan.cyclusLabel}
      </span>
      <span className="truncate">{plan.titel || defaultTitel}</span>
    </button>
  );
}

function BundelEditor({
  display,
  plan,
  onSave,
  onClose,
}: {
  display: DisplayBundel;
  plan?: BundelPlanning;
  onSave: (changes: Partial<BundelPlanning>) => void;
  onClose: () => void;
}) {
  const [titel, setTitel] = useState(plan?.titel || display.defaultTitel);
  const [startKwartaal, setStartKwartaal] = useState(
    plan?.startKwartaal || QUARTERS_AVAILABLE[0]
  );
  const [eindKwartaal, setEindKwartaal] = useState(
    plan?.eindKwartaal || QUARTERS_AVAILABLE[Math.min(2, QUARTERS_AVAILABLE.length - 1)]
  );
  const [cyclusLabel, setCyclusLabel] = useState(plan?.cyclusLabel || "Cyclus 1");

  function handleSave() {
    onSave({
      titel: titel.trim() || display.defaultTitel,
      startKwartaal,
      eindKwartaal,
      cyclusLabel: cyclusLabel.trim() || "Cyclus 1",
    });
    onClose();
  }

  const startIdx = quarterIndex(startKwartaal);
  const eindIdx = quarterIndex(eindKwartaal);
  const warning =
    eindIdx <= startIdx
      ? "Eindkwartaal moet na startkwartaal liggen."
      : eindIdx - startIdx < 2
      ? "Een cyclus duurt idealiter 6-9 maanden (minimaal 2 kwartalen)."
      : null;

  return (
    <div
      className="absolute z-30 bg-white border border-gray-300 rounded-lg shadow-xl p-4 min-w-[360px] max-w-[440px]"
      style={{ top: "100%", left: 180, marginTop: 6 }}
    >
      <div className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">
        {DOMAIN_LABELS[display.domein]}
      </div>

      <label className="text-[10px] text-gray-500 block mb-1 uppercase tracking-wider">
        Titel inspanning
      </label>
      <input
        value={titel}
        onChange={(e) => setTitel(e.target.value)}
        className="w-full px-2 py-1.5 border border-gray-200 rounded text-sm mb-3 focus:outline-none focus:ring-1 focus:ring-cito-blue/30"
        placeholder={display.defaultTitel}
      />

      {display.sourceDescription && (
        <div className="mb-3 p-2 bg-gray-50 border border-gray-100 rounded text-[11px] text-gray-500 leading-relaxed">
          <span className="font-medium text-gray-600">Uit cross-analyse:</span>{" "}
          {display.sourceDescription}
        </div>
      )}

      <div className="grid grid-cols-2 gap-2 mb-3">
        <div>
          <label className="text-[10px] text-gray-500 block mb-1 uppercase tracking-wider">
            Start
          </label>
          <select
            value={startKwartaal}
            onChange={(e) => setStartKwartaal(e.target.value)}
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
            value={eindKwartaal}
            onChange={(e) => setEindKwartaal(e.target.value)}
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

      <label className="text-[10px] text-gray-500 block mb-1 uppercase tracking-wider">
        Cyclus
      </label>
      <input
        value={cyclusLabel}
        onChange={(e) => setCyclusLabel(e.target.value)}
        className="w-full px-2 py-1.5 border border-gray-200 rounded text-xs mb-2 focus:outline-none focus:ring-1 focus:ring-cito-blue/30"
        placeholder="Cyclus 1"
      />

      {warning && (
        <div className="text-[10px] text-amber-700 bg-amber-50 border border-amber-100 rounded px-2 py-1 mb-2">
          {warning}
        </div>
      )}

      {plan?.beargumentatie && (
        <div className="mt-2 pt-2 border-t border-gray-100">
          <div className="text-[10px] font-semibold text-indigo-600 uppercase tracking-wider mb-1">
            AI-beargumentatie
          </div>
          <p className="text-[11px] text-gray-600 leading-relaxed">{plan.beargumentatie}</p>
        </div>
      )}

      <div className="mt-3 flex justify-end gap-2">
        <button
          onClick={onClose}
          className="text-[11px] text-gray-500 hover:text-gray-700 px-2 py-1 rounded hover:bg-gray-100"
        >
          Annuleren
        </button>
        <button
          onClick={handleSave}
          className="text-[11px] text-white bg-cito-blue hover:bg-cito-blue-light px-3 py-1 rounded font-medium"
        >
          Opslaan
        </button>
      </div>
    </div>
  );
}
