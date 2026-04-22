"use client";

import React, { useState, useEffect } from "react";
import { useSession } from "@/lib/session-context";
import { useToast } from "@/components/ui/Toast";
import type { DINSession, Stap4Result, EffortDomain } from "@/lib/types";
import type { SubEffortAdvies } from "@/lib/schemas";
import { computeFieldDiff, type FieldDiff } from "@/lib/diff";

const DOMAIN_LABELS: Record<EffortDomain, string> = {
  mens: "Mens",
  processen: "Processen",
  data_systemen: "Data & Systemen",
  cultuur: "Cultuur",
};

const DOMAIN_COLORS: Record<EffortDomain, { bg: string; border: string; text: string }> = {
  mens: { bg: "bg-blue-50", border: "border-blue-200", text: "text-blue-700" },
  processen: { bg: "bg-green-50", border: "border-green-200", text: "text-green-700" },
  data_systemen: { bg: "bg-purple-50", border: "border-purple-200", text: "text-purple-700" },
  cultuur: { bg: "bg-amber-50", border: "border-amber-200", text: "text-amber-700" },
};

export default function StapOptimaliseren({
  session,
  stap4Result,
  stap2Result,
  onStepCompleted,
}: {
  session: DINSession;
  stap4Result?: Stap4Result;
  stap2Result?: import("@/lib/types").Stap2Result;
  onStepCompleted?: () => void;
}): React.ReactElement {
  const { updateSession, saveNow } = useSession();
  const { addToast } = useToast();
  const [entries, setEntries] = useState<SubEffortAdvies[]>([]);
  const [savingIndex, setSavingIndex] = useState<number | null>(null);
  const [savedIndex, setSavedIndex] = useState<number | null>(null);
  const [optimizingIndex, setOptimizingIndex] = useState<number | null>(null);
  const [optimizeError, setOptimizeError] = useState<string | null>(null);

  // Per-kaart gerichte optimalisatie state
  type OptField = "titel" | "beschrijving" | "beargumentatie" | "vermogenImpact" | "dossier";
  const [optimizeFieldsByIdx, setOptimizeFieldsByIdx] = useState<Record<number, Set<OptField>>>({});
  const [userInstructieByIdx, setUserInstructieByIdx] = useState<Record<number, string>>({});

  // Pending AI-diff per kaart (Phase 19 substap 6.2) — geoptimaliseerde versie wordt eerst
  // getoond als before/after voordat de gebruiker deze toepast of verwerpt.
  type PendingDiff = {
    proposed: SubEffortAdvies;
    textDiffs: FieldDiff[]; // tekst-velden met word-level diff
    vermogenImpactChanged: boolean;
    dossierChanged: boolean;
  };
  const [pendingDiffByIdx, setPendingDiffByIdx] = useState<Record<number, PendingDiff>>({});

  // Business-case (per kaart) state
  const [bcModeByIdx, setBcModeByIdx] = useState<Record<number, "idle" | "loading-questions" | "answering" | "loading-estimate">>({});
  const [bcQuestionsByIdx, setBcQuestionsByIdx] = useState<Record<number, Array<{
    key: string;
    vraag: string;
    toelichting?: string;
    inputType: "text" | "number" | "select";
    opties?: string[];
    eenheid?: string;
  }>>>({});
  const [bcAnswersByIdx, setBcAnswersByIdx] = useState<Record<number, Record<string, string>>>({});
  const [bcResultByIdx, setBcResultByIdx] = useState<Record<number, {
    kostenraming: string;
    aannames: string[];
    risicos?: string[];
  }>>({});

  // Per-kaart: geselecteerde vragen voor AI-fineuten (scope-beperkt, rest
  // blijft onaangeroerd) + optionele instructie + loading-state.
  const [bcSelectedByIdx, setBcSelectedByIdx] = useState<Record<number, Set<string>>>({});
  const [bcRefineInstrByIdx, setBcRefineInstrByIdx] = useState<Record<number, string>>({});
  const [bcRefiningIdx, setBcRefiningIdx] = useState<number | null>(null);

  function toggleBcSelected(idx: number, key: string) {
    setBcSelectedByIdx((prev) => {
      const set = new Set(prev[idx] ?? []);
      if (set.has(key)) set.delete(key);
      else set.add(key);
      return { ...prev, [idx]: set };
    });
  }
  function selectAllBc(idx: number) {
    const qs = bcQuestionsByIdx[idx] ?? [];
    setBcSelectedByIdx((p) => ({ ...p, [idx]: new Set(qs.map((q) => q.key)) }));
  }
  function clearBcSelection(idx: number) {
    setBcSelectedByIdx((p) => ({ ...p, [idx]: new Set() }));
  }

  function getOptFields(idx: number): Set<OptField> {
    return (
      optimizeFieldsByIdx[idx] ??
      new Set<OptField>(["titel", "beschrijving", "beargumentatie", "vermogenImpact", "dossier"])
    );
  }
  function toggleOptField(idx: number, field: OptField) {
    setOptimizeFieldsByIdx((prev) => {
      const set = new Set(prev[idx] ?? getOptFields(idx));
      if (set.has(field)) set.delete(field);
      else set.add(field);
      return { ...prev, [idx]: set };
    });
  }

  // Begrotingsadvies state — 3-scenario model (jaarlijks budget vast).
  const [budgetEuro, setBudgetEuro] = useState<number>(250000);
  const [cyclusMaanden, setCyclusMaanden] = useState<number>(9);
  const [startJaar, setStartJaar] = useState<number>(new Date().getFullYear());
  const [begrotingLoading, setBegrotingLoading] = useState(false);
  const [begrotingError, setBegrotingError] = useState<string | null>(null);
  const [oudBegrotingGevonden, setOudBegrotingGevonden] = useState(false);
  const [finetuneInstructie, setFinetuneInstructie] = useState<string>("");
  const [finetuneOpen, setFinetuneOpen] = useState<boolean>(false);
  const [finetuneVersie, setFinetuneVersie] = useState<number>(1);
  const [laatsteFineutInstructie, setLaatsteFineutInstructie] = useState<string>("");

  const FINETUNE_VOORBEELDEN: ReadonlyArray<{ kort: string; instructie: string }> = [
    {
      kort: "Verleng Optimaal +1 jaar",
      instructie: "Verleng het Optimaal-scenario met 1 jaar omdat cultuurverandering en gedragsverankering meer tijd vragen — spreid de mens-trajecten over meer jaren.",
    },
    {
      kort: "Schuif data/systemen naar achter",
      instructie: "Schuif data/systemen-inspanningen volledig naar de laatste 2 jaar, want eerst moeten mens en processen helder zijn voordat we CRM gaan inrichten.",
    },
    {
      kort: "Concreter prioriteitAdvies",
      instructie: "Maak prioriteitAdvies concreter — benoem expliciet welke rollen/eigenaren elk traject moeten dragen (sectordirecteur, programmamanager, etc.).",
    },
    {
      kort: "Meer parallelle activiteit jaar 1",
      instructie: "Voeg meer parallelle activiteit toe in het startjaar — laat zachte kant (cultuur+mens) en harde kant (data/systemen+processen) tegelijk starten zodat het volledige jaarbudget benut wordt.",
    },
    {
      kort: "Splits per sector",
      instructie: "Splits de cultuur-inspanning in PO-, VO- en Zakelijk-deeltrajecten met een eigen rank en eigenaar — de sectoren zitten in andere transformatie-fases.",
    },
  ];

  type Domein = "mens" | "processen" | "data_systemen" | "cultuur";
  type ScenarioLabel = "optimaal" | "plus20" | "min20";
  type InspanningBegroting = {
    inspanningTitel: string;
    groepId?: string;
    domein: Domein;
    totaalEuro: number;
    percentageTotaal: number;
    motivatie: string;
    verdelingPerJaar: Array<{
      jaar: number;
      percentage: number;
      euro: number;
      fase: string;
      activiteit?: string;
    }>;
    volgorde: { rank: number; reden: string };
  };
  type Scenario = {
    label: ScenarioLabel;
    jaarlijksBudgetEuro: number;
    aantalJaren: number;
    totaalGeraamdEuro: number;
    inspanningen: InspanningBegroting[];
    totalenPerJaar: Array<{ jaar: number; euro: number; percentage: number }>;
    prioriteitAdvies: string;
    samenvatting: string;
  };
  type DrieScenarioAdvies = {
    jaarlijksBudgetBasis: number;
    startJaar: number;
    cyclusMaanden: number;
    scenarios: {
      optimaal: Scenario | null;
      plus20: Scenario | null;
      min20: Scenario | null;
    };
    vergelijking: string;
    partialFailures?: string[];
  };
  const [begrotingAdvies, setBegrotingAdvies] = useState<DrieScenarioAdvies | null>(null);

  useEffect(() => {
    if (stap4Result?.subEffortAnalysis) {
      const cloned = JSON.parse(JSON.stringify(stap4Result.subEffortAnalysis)) as SubEffortAdvies[];
      setEntries(cloned);
      // Hydrate business-case Q&A state uit entries — voorkomt verlies bij navigatie
      const qByIdx: Record<number, Array<{
        key: string;
        vraag: string;
        toelichting?: string;
        inputType: "text" | "number" | "select";
        opties?: string[];
        eenheid?: string;
      }>> = {};
      const aByIdx: Record<number, Record<string, string>> = {};
      const rByIdx: Record<number, { kostenraming: string; aannames: string[]; risicos?: string[] }> = {};
      const sByIdx: Record<number, Set<string>> = {};
      const iByIdx: Record<number, string> = {};
      const mByIdx: Record<number, "idle" | "loading-questions" | "answering" | "loading-estimate"> = {};
      cloned.forEach((e, idx) => {
        const bc = (e as unknown as { businessCase?: {
          questions?: typeof qByIdx[number];
          answers?: Record<string, string>;
          result?: { kostenraming: string; aannames?: string[]; risicos?: string[] };
          refineInstructie?: string;
          selectedKeys?: string[];
        }}).businessCase;
        if (!bc) return;
        if (bc.questions && bc.questions.length > 0) {
          qByIdx[idx] = bc.questions;
          mByIdx[idx] = "answering";
        }
        if (bc.answers) aByIdx[idx] = bc.answers;
        if (bc.result) rByIdx[idx] = { kostenraming: bc.result.kostenraming, aannames: bc.result.aannames ?? [], risicos: bc.result.risicos };
        if (bc.selectedKeys) sByIdx[idx] = new Set(bc.selectedKeys);
        if (bc.refineInstructie) iByIdx[idx] = bc.refineInstructie;
      });
      setBcQuestionsByIdx(qByIdx);
      setBcAnswersByIdx(aByIdx);
      setBcResultByIdx(rByIdx);
      setBcSelectedByIdx(sByIdx);
      setBcRefineInstrByIdx(iByIdx);
      setBcModeByIdx(mByIdx);
    }
    // Restore begrotingsadvies uit session. Detecteer oude shape (direct
    // inspanningen[]) vs nieuwe 3-scenario shape (scenarios.optimaal etc).
    const persisted = (stap4Result as unknown as { begrotingAdvies?: unknown })?.begrotingAdvies;
    const persistedObj = persisted as Record<string, unknown> | undefined;
    if (persistedObj && typeof persistedObj === "object") {
      const scenariosField = persistedObj.scenarios as
        | { optimaal?: unknown; plus20?: unknown; min20?: unknown }
        | undefined;
      // Nieuwe shape: scenarios object aanwezig met minimaal 1 niet-null scenario
      const heeftNieuweShape =
        scenariosField &&
        ("optimaal" in scenariosField ||
          "plus20" in scenariosField ||
          "min20" in scenariosField) &&
        (scenariosField.optimaal || scenariosField.plus20 || scenariosField.min20);
      if (heeftNieuweShape) {
        const nieuw = persistedObj as unknown as DrieScenarioAdvies;
        setBegrotingAdvies(nieuw);
        setBudgetEuro(nieuw.jaarlijksBudgetBasis);
        setCyclusMaanden(nieuw.cyclusMaanden);
        if (nieuw.startJaar) setStartJaar(nieuw.startJaar);
        setOudBegrotingGevonden(false);
      } else if (persistedObj.inspanningen || persistedObj.totalenPerJaar) {
        // Oude shape — banner tonen, niet renderen.
        setOudBegrotingGevonden(true);
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [stap4Result]);

  // Mirror business-case Q&A state op entries — entry.businessCase wordt
  // mee-gepersist via de bestaande entries-auto-persist effect hieronder.
  useEffect(() => {
    if (entries.length === 0) return;
    let dirty = false;
    const next = entries.map((e, idx) => {
      const desired = {
        questions: bcQuestionsByIdx[idx] ?? [],
        answers: bcAnswersByIdx[idx] ?? {},
        result: bcResultByIdx[idx],
        selectedKeys: Array.from(bcSelectedByIdx[idx] ?? []),
        refineInstructie: bcRefineInstrByIdx[idx] ?? "",
      };
      const current = (e as unknown as { businessCase?: typeof desired }).businessCase;
      // Vergelijk via JSON — voorkom no-op updates die infinite loops triggeren
      if (JSON.stringify(current ?? null) === JSON.stringify(desired)) return e;
      dirty = true;
      return { ...e, businessCase: desired } as SubEffortAdvies;
    });
    if (dirty) setEntries(next);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [bcQuestionsByIdx, bcAnswersByIdx, bcResultByIdx, bcSelectedByIdx, bcRefineInstrByIdx]);

  // Auto-persist entries naar sessie (debounced) — voorkomt dat edits verloren
  // gaan bij navigatie. De handmatige 'Opslaan' knop blijft werken voor directe
  // bevestiging, maar is niet meer vereist.
  useEffect(() => {
    if (entries.length === 0) return;
    const timer = setTimeout(() => {
      updateSession((prev) => {
        const currentWiz = prev.crossAnalyseWizard;
        const currentStap4 = currentWiz?.stepResults?.stap4;
        const prevSub = currentStap4?.subEffortAnalysis ?? [];
        // Vergelijk alleen op inhoud — voorkom no-op writes
        if (JSON.stringify(prevSub) === JSON.stringify(entries)) return prev;
        // NOOIT silent-droppen: als stap4 niet bestaat, init minimaal.
        return {
          ...prev,
          crossAnalyseWizard: {
            currentStep: currentWiz?.currentStep ?? 6,
            completedSteps: currentWiz?.completedSteps ?? [],
            wizardVersion: currentWiz?.wizardVersion ?? 2,
            ...currentWiz,
            stepResults: {
              ...(currentWiz?.stepResults ?? {}),
              stap4: {
                ...(currentStap4 ?? { samenvatting: "", subEffortAnalysis: [], consolidatieAdvies: [], citobreedInzicht: [] }),
                subEffortAnalysis: entries,
              },
            },
          },
        };
      });
    }, 800);
    return () => clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [entries]);

  if (!stap4Result?.subEffortAnalysis || stap4Result.subEffortAnalysis.length === 0) {
    return (
      <div className="text-center py-10">
        <p className="text-sm text-gray-600">
          Nog geen geconsolideerde cross-sectorale inspanningen om te optimaliseren.
        </p>
        <p className="text-xs text-gray-500 mt-2">
          Ga terug naar stap 5 (Consolidatie) en klik op <strong>Consolidatie-advies genereren</strong>.
          De AI maakt dan voor elk domein (Mens / Processen / Data &amp; Systemen / Cultuur) een
          cross-sectorale inspanning die hier verschijnt voor optimalisatie.
        </p>
      </div>
    );
  }

  function updateEntry(idx: number, updater: (e: SubEffortAdvies) => SubEffortAdvies) {
    setEntries((prev) => prev.map((e, i) => (i === idx ? updater(e) : e)));
    setSavedIndex(null);
  }

  function applyPendingDiff(idx: number) {
    const pending = pendingDiffByIdx[idx];
    if (!pending) return;
    setEntries((prev) => prev.map((e, i) => (i === idx ? pending.proposed : e)));
    setPendingDiffByIdx((p) => {
      const next = { ...p };
      delete next[idx];
      return next;
    });
    setSavedIndex(null);
  }

  function rejectPendingDiff(idx: number) {
    setPendingDiffByIdx((p) => {
      const next = { ...p };
      delete next[idx];
      return next;
    });
  }

  async function optimizeEntry(idx: number) {
    setOptimizingIndex(idx);
    setOptimizeError(null);
    const entry = entries[idx];

    // Focus-doel uit session (rank === 0 of eerste goal)
    const focusGoal = [...(session.goals ?? [])]
      .sort((a, b) => (a.rank ?? 999) - (b.rank ?? 999))[0] ?? null;
    const focusDoel = focusGoal
      ? {
          id: focusGoal.id,
          naam: focusGoal.name ?? "",
          beschrijving:
            focusGoal.description && focusGoal.description.trim().length > 0
              ? focusGoal.description
              : focusGoal.name ?? "",
        }
      : null;

    // Groep uit stap2Result obv entry.groepId
    const groep = stap2Result?.vermogenGelijkenisGroepen?.find((g) => g.id === entry.groepId) ?? null;
    if (!groep) {
      setOptimizeError("Groep niet gevonden in stap 2.");
      setOptimizingIndex(null);
      return;
    }

    const groepCaps = (session.capabilities ?? [])
      .filter((c) => groep.vermogenIds.includes(c.id))
      .map((c) => ({
        id: c.id,
        sectorId: c.sectorId,
        title: c.title ?? "",
        description: c.description ?? "",
        profielHuidig: c.profiel?.huidieSituatie ?? "",
        profielGewenst: c.profiel?.gewensteSituatie ?? "",
      }));

    const fields = Array.from(getOptFields(idx));
    const instructie = userInstructieByIdx[idx] ?? "";

    try {
      const res = await fetch("/api/optimaliseer-subeffort", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          entry,
          optimizeFields: fields,
          userInstructie: instructie,
          focusDoel,
          groep,
          vermogens: groepCaps,
          scope: session.scope,
          vision: session.vision,
        }),
      });
      const data = await res.json();
      if (!data.success || !data.data) {
        setOptimizeError(data.error ?? "AI-optimalisatie mislukt.");
        setOptimizingIndex(null);
        return;
      }
      // Client-side guard: stage alleen geselecteerde velden — gebruiker moet toepassen
      // of verwerpen via diff-panel (Phase 19 substap 6.2).
      const ai = data.data as SubEffortAdvies;
      const original = entry;
      const proposed: SubEffortAdvies = { ...original };
      if (fields.includes("titel") && ai.titel) {
        proposed.titel = ai.titel;
        proposed.voorgesteldeNaam = ai.voorgesteldeNaam ?? ai.titel;
      }
      if (fields.includes("beschrijving") && ai.beschrijving) {
        proposed.beschrijving = ai.beschrijving;
      }
      if (fields.includes("beargumentatie") && ai.beargumentatie) {
        proposed.beargumentatie = ai.beargumentatie;
      }
      if (fields.includes("vermogenImpact") && ai.vermogenImpact && ai.vermogenImpact.length > 0) {
        proposed.vermogenImpact = ai.vermogenImpact;
      }
      if (fields.includes("dossier") && ai.dossier) {
        proposed.dossier = ai.dossier;
      }

      const textDiffs: FieldDiff[] = [
        computeFieldDiff("titel", "Titel", original.titel, proposed.titel),
        computeFieldDiff("beschrijving", "Beschrijving — wat wordt er gedaan", original.beschrijving, proposed.beschrijving),
        computeFieldDiff("beargumentatie", "Onderbouwing — waarom dit cluster", original.beargumentatie, proposed.beargumentatie),
      ].filter((d) => d.gewijzigd);

      const vermogenImpactChanged =
        JSON.stringify(original.vermogenImpact ?? []) !== JSON.stringify(proposed.vermogenImpact ?? []);
      const dossierChanged =
        JSON.stringify(original.dossier ?? {}) !== JSON.stringify(proposed.dossier ?? {});

      setPendingDiffByIdx((p) => ({
        ...p,
        [idx]: { proposed, textDiffs, vermogenImpactChanged, dossierChanged },
      }));
      setOptimizingIndex(null);
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Netwerkfout";
      setOptimizeError(msg);
      setOptimizingIndex(null);
    }
  }

  async function runBusinessCaseQuestions(idx: number) {
    setBcModeByIdx((p) => ({ ...p, [idx]: "loading-questions" }));
    setOptimizeError(null);
    const entry = entries[idx];
    const focusGoal = [...(session.goals ?? [])]
      .sort((a, b) => (a.rank ?? 999) - (b.rank ?? 999))[0] ?? null;
    const focusDoel = focusGoal
      ? {
          naam: focusGoal.name ?? "",
          beschrijving:
            focusGoal.description && focusGoal.description.trim().length > 0
              ? focusGoal.description
              : focusGoal.name ?? "",
        }
      : null;

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 60_000); // 60s timeout

    try {
      const res = await fetch("/api/business-case", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          mode: "questions",
          entry,
          focusDoel,
          scope: session.scope,
          vision: session.vision,
        }),
        signal: controller.signal,
      });
      const data = await res.json();
      if (!data.success || !data.data?.questions) {
        setOptimizeError(data.error ?? "Vragen-genereren mislukt");
        return;
      }
      setBcQuestionsByIdx((p) => ({ ...p, [idx]: data.data.questions }));
      setBcAnswersByIdx((p) => ({ ...p, [idx]: p[idx] ?? {} }));
      setBcModeByIdx((p) => ({ ...p, [idx]: "answering" }));
      return;
    } catch (err) {
      const msg =
        err instanceof Error
          ? err.name === "AbortError"
            ? "Time-out na 60s — probeer opnieuw of pas de inspanning aan"
            : err.message
          : "Netwerkfout";
      setOptimizeError(msg);
    } finally {
      clearTimeout(timeoutId);
      // Als mode nog steeds loading is (dus geen answering-transitie), reset naar idle
      setBcModeByIdx((p) => (p[idx] === "loading-questions" ? { ...p, [idx]: "idle" } : p));
    }
  }

  async function refineSelectedBcAnswers(idx: number) {
    const selected = bcSelectedByIdx[idx];
    if (!selected || selected.size === 0) {
      setOptimizeError("Selecteer eerst minimaal één vraag om te fineuten.");
      return;
    }
    setBcRefiningIdx(idx);
    setOptimizeError(null);

    const entry = entries[idx];
    const allQuestions = bcQuestionsByIdx[idx] ?? [];
    const questionsToRefine = allQuestions.filter((q) => selected.has(q.key));
    const currentAnswers: Record<string, string> = {};
    for (const q of questionsToRefine) {
      currentAnswers[q.key] = bcAnswersByIdx[idx]?.[q.key] ?? "";
    }

    const focusGoal = [...(session.goals ?? [])]
      .sort((a, b) => (a.rank ?? 999) - (b.rank ?? 999))[0] ?? null;
    const focusDoel = focusGoal
      ? {
          naam: focusGoal.name ?? "",
          beschrijving:
            focusGoal.description && focusGoal.description.trim().length > 0
              ? focusGoal.description
              : focusGoal.name ?? "",
        }
      : null;

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 60_000);

    try {
      const res = await fetch("/api/business-case", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          mode: "refine-answers",
          entry,
          focusDoel,
          questionsToRefine,
          currentAnswers,
          userInstructie: bcRefineInstrByIdx[idx] ?? "",
          scope: session.scope,
          vision: session.vision,
        }),
        signal: controller.signal,
      });
      const data = await res.json();
      if (!data.success || !data.data?.suggestedAnswers) {
        setOptimizeError(data.error ?? "Fineuten mislukt");
        return;
      }
      const suggested = data.data.suggestedAnswers as Record<string, string>;
      setBcAnswersByIdx((p) => {
        const merged = { ...(p[idx] ?? {}) };
        for (const k of Object.keys(suggested)) {
          if (selected.has(k)) merged[k] = suggested[k];
        }
        return { ...p, [idx]: merged };
      });
    } catch (err) {
      const msg =
        err instanceof Error
          ? err.name === "AbortError"
            ? "Time-out na 60s — probeer opnieuw"
            : err.message
          : "Netwerkfout";
      setOptimizeError(msg);
    } finally {
      clearTimeout(timeoutId);
      setBcRefiningIdx(null);
    }
  }

  async function runBusinessCaseEstimate(idx: number) {
    setBcModeByIdx((p) => ({ ...p, [idx]: "loading-estimate" }));
    setOptimizeError(null);
    const entry = entries[idx];
    const questions = bcQuestionsByIdx[idx] ?? [];
    const answers = bcAnswersByIdx[idx] ?? {};

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 60_000);

    try {
      const res = await fetch("/api/business-case", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          mode: "estimate",
          entry,
          questions,
          answers,
          scope: session.scope,
          vision: session.vision,
        }),
        signal: controller.signal,
      });
      const data = await res.json();
      if (!data.success || !data.data?.kostenraming) {
        setOptimizeError(data.error ?? "Raming-genereren mislukt");
        setBcModeByIdx((p) => ({ ...p, [idx]: "answering" }));
        return;
      }
      setBcResultByIdx((p) => ({ ...p, [idx]: data.data }));
      setEntries((prev) =>
        prev.map((e, i) =>
          i === idx
            ? {
                ...e,
                dossier: {
                  eigenaar: e.dossier?.eigenaar ?? "",
                  inspanningsleider: e.dossier?.inspanningsleider ?? "",
                  verwachtResultaat: e.dossier?.verwachtResultaat ?? "",
                  randvoorwaarden: e.dossier?.randvoorwaarden ?? "",
                  kostenraming: data.data.kostenraming,
                },
              }
            : e
        )
      );
      setBcModeByIdx((p) => ({ ...p, [idx]: "idle" }));
    } catch (err) {
      const msg =
        err instanceof Error
          ? err.name === "AbortError"
            ? "Time-out na 60s — probeer opnieuw"
            : err.message
          : "Netwerkfout";
      setOptimizeError(msg);
      setBcModeByIdx((p) => ({ ...p, [idx]: "answering" }));
    } finally {
      clearTimeout(timeoutId);
    }
  }

  async function generateBegrotingsAdvies(opts?: {
    finetuneInstructie?: string;
    previousAdvies?: DrieScenarioAdvies | null;
  }) {
    setBegrotingLoading(true);
    setBegrotingError(null);

    const focusGoal = [...(session.goals ?? [])]
      .sort((a, b) => (a.rank ?? 999) - (b.rank ?? 999))[0] ?? null;
    const focusDoel = focusGoal
      ? {
          naam: focusGoal.name ?? "",
          beschrijving:
            focusGoal.description && focusGoal.description.trim().length > 0
              ? focusGoal.description
              : focusGoal.name ?? "",
        }
      : null;

    const inspanningen = entries
      .filter((e) => e.actie === "combineren")
      .map((e) => {
        const bc = (e as unknown as { businessCase?: {
          result?: { kostenraming: string; aannames?: string[]; risicos?: string[] };
        }}).businessCase;
        return {
          titel: e.titel ?? e.voorgesteldeNaam ?? `${e.domein} inspanning`,
          groepId: e.groepId,
          domein: e.domein,
          beschrijving: e.beschrijving ?? "",
          beargumentatie: e.beargumentatie ?? "",
          vermogenImpact: e.vermogenImpact ?? [],
          dossier: {
            eigenaar: e.dossier?.eigenaar ?? "",
            inspanningsleider: e.dossier?.inspanningsleider ?? "",
            verwachtResultaat: e.dossier?.verwachtResultaat ?? "",
            randvoorwaarden: e.dossier?.randvoorwaarden ?? "",
          },
          dossierKostenraming: e.dossier?.kostenraming ?? "",
          businessCaseAannames: bc?.result?.aannames ?? [],
          businessCaseRisicos: bc?.result?.risicos ?? [],
        };
      });

    if (inspanningen.length === 0) {
      setBegrotingError("Geen geconsolideerde inspanningen om te begroten.");
      setBegrotingLoading(false);
      return;
    }

    try {
      const res = await fetch("/api/begroting-advies", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          jaarlijksBudgetEuro: budgetEuro,
          cyclusMaanden,
          startJaar,
          focusDoel,
          inspanningen,
          scope: session.scope,
          vision: session.vision,
          finetuneInstructie: opts?.finetuneInstructie ?? "",
          previousAdvies: opts?.previousAdvies ?? null,
        }),
      });
      // Robust parse — Vercel/edge kan bij timeout HTML "An error occurred" terugsturen
      let data: { success?: boolean; data?: unknown; error?: string };
      const text = await res.text();
      try {
        data = JSON.parse(text);
      } catch {
        const hint = res.status === 504 || res.status === 502
          ? "Server-time-out — probeer opnieuw of vereenvoudig de inspanningen."
          : `Server-fout ${res.status}: ${text.slice(0, 120)}`;
        setBegrotingError(hint);
        setBegrotingLoading(false);
        return;
      }
      if (!data.success) {
        setBegrotingError(data.error ?? "Onbekende fout");
        setBegrotingLoading(false);
        return;
      }
      setBegrotingAdvies(data.data as DrieScenarioAdvies);
      setOudBegrotingGevonden(false);
      // Versie + laatste instructie bijhouden voor de versie-badge in de UI
      if (opts?.finetuneInstructie && opts.finetuneInstructie.trim().length > 0) {
        setFinetuneVersie((v) => v + 1);
        setLaatsteFineutInstructie(opts.finetuneInstructie);
      } else {
        // Eerste generatie of regenerate-from-scratch — reset versie
        setFinetuneVersie(1);
        setLaatsteFineutInstructie("");
      }
      // Persisteer in session — NOOIT silent-droppen: init minimaal als stap4 ontbreekt.
      updateSession((prev) => {
        const currentWiz = prev.crossAnalyseWizard;
        const currentStap4 = currentWiz?.stepResults?.stap4;
        return {
          ...prev,
          crossAnalyseWizard: {
            currentStep: currentWiz?.currentStep ?? 6,
            completedSteps: currentWiz?.completedSteps ?? [],
            wizardVersion: currentWiz?.wizardVersion ?? 2,
            ...currentWiz,
            stepResults: {
              ...(currentWiz?.stepResults ?? {}),
              stap4: {
                ...(currentStap4 ?? { samenvatting: "", subEffortAnalysis: [], consolidatieAdvies: [], citobreedInzicht: [] }),
                begrotingAdvies: data.data,
              } as NonNullable<typeof currentStap4>,
            },
          },
        };
      });
      // Force direct een Supabase-save + wacht op resultaat zodat we UI-feedback kunnen tonen.
      const version = await saveNow();
      if (version !== false) {
        addToast(`Begrotingsadvies opgeslagen (v${version})`, "success");
        onStepCompleted?.();
      } else {
        addToast("Opslaan naar cloud mislukt — wijzigingen staan lokaal opgeslagen. Probeer later opnieuw.", "error");
      }
      setBegrotingLoading(false);
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Netwerkfout";
      setBegrotingError(msg);
      setBegrotingLoading(false);
    }
  }

  async function saveEntry(idx: number) {
    setSavingIndex(idx);
    const updated = entries[idx];
    await new Promise((r) => setTimeout(r, 100));
    updateSession((prev) => {
      if (!prev.crossAnalyseWizard?.stepResults?.stap4) return prev;
      const newSubEffort = [...(prev.crossAnalyseWizard.stepResults.stap4.subEffortAnalysis ?? [])];
      newSubEffort[idx] = updated;
      return {
        ...prev,
        crossAnalyseWizard: {
          ...prev.crossAnalyseWizard,
          stepResults: {
            ...prev.crossAnalyseWizard.stepResults,
            stap4: {
              ...prev.crossAnalyseWizard.stepResults.stap4,
              subEffortAnalysis: newSubEffort,
            },
          },
        },
      };
    });
    setSavingIndex(null);
    setSavedIndex(idx);
    setTimeout(() => setSavedIndex(null), 2500);
  }

  // Groepeer entries per groepId → domein
  const grouped = new Map<string, SubEffortAdvies[]>();
  entries.forEach((e) => {
    const list = grouped.get(e.groepId) ?? [];
    list.push(e);
    grouped.set(e.groepId, list);
  });

  return (
    <div className="space-y-8">
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
        <p className="text-sm text-blue-900">
          Hier kun je de cross-sectorale inspanningen uit stap 4 verfijnen voordat ze in de eindview belanden.
          Per domein staan de geconsolideerde inspanningen. Pas velden zelf aan, of klik <strong>Optimaliseer met AI</strong> om je draft door Claude te laten verfijnen op basis van focus-doel en vermogen-profielen.
        </p>
      </div>

      {optimizeError && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-3">
          <p className="text-sm text-red-700">AI-optimalisatie faalde: {optimizeError}</p>
        </div>
      )}

      {Array.from(grouped.entries()).map(([groepId, groepEntries]) => (
        <div key={groepId} className="space-y-4">
          <h4 className="text-sm font-semibold text-gray-600 uppercase tracking-wider">
            Groep: {groepId}
          </h4>
          {groepEntries.map((entry) => {
            const idx = entries.findIndex((e) => e === entry);
            const colors = DOMAIN_COLORS[entry.domein];
            const isSaving = savingIndex === idx;
            const isSaved = savedIndex === idx;
            return (
              <div
                key={`${groepId}-${entry.domein}`}
                className={`border ${colors.border} ${colors.bg} rounded-lg p-4`}
              >
                <div className="flex items-center justify-between mb-3">
                  <p className={`text-xs font-bold uppercase tracking-wider ${colors.text}`}>
                    {DOMAIN_LABELS[entry.domein]}
                  </p>
                  <span className="text-[10px] text-gray-500">
                    {entry.actie === "combineren" ? "Combineren" : "Apart"}
                  </span>
                </div>

                <div className="space-y-3">
                  {/* 12-koloms grid: beschrijving-kolom dominant (8), details rechts (4) */}
                  <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
                    {/* Linkerkolom — titel, beschrijving (groot), beargumentatie */}
                    <div className="lg:col-span-8 space-y-3">
                      <div>
                        <label className="text-[11px] font-semibold text-gray-600 uppercase tracking-wider">
                          Titel
                        </label>
                        <input
                          type="text"
                          value={entry.titel ?? ""}
                          onChange={(e) =>
                            updateEntry(idx, (v) => ({ ...v, titel: e.target.value }))
                          }
                          className="w-full mt-1 px-3 py-2 text-sm border border-gray-300 rounded bg-white focus:outline-none focus:ring-2 focus:ring-[#003366]"
                          placeholder="Sectoroverstijgende inspanningstitel"
                        />
                      </div>

                      <div>
                        <label className="text-[11px] font-semibold text-gray-600 uppercase tracking-wider">
                          Beschrijving — wat wordt er gedaan
                        </label>
                        <textarea
                          value={entry.beschrijving ?? ""}
                          onChange={(e) =>
                            updateEntry(idx, (v) => ({ ...v, beschrijving: e.target.value }))
                          }
                          rows={10}
                          className="w-full mt-1 px-3 py-2 text-sm border border-gray-300 rounded bg-white focus:outline-none focus:ring-2 focus:ring-[#003366] min-h-[220px] resize-y leading-relaxed"
                          placeholder="Wat houdt deze cross-sectorale inspanning concreet in? Neem voldoende ruimte voor detail — dit is de kern van het cluster."
                        />
                      </div>

                      <div>
                        <label className="text-[11px] font-semibold text-gray-600 uppercase tracking-wider">
                          Onderbouwing — waarom dit cluster
                        </label>
                        <textarea
                          value={entry.beargumentatie ?? ""}
                          onChange={(e) =>
                            updateEntry(idx, (v) => ({ ...v, beargumentatie: e.target.value }))
                          }
                          rows={6}
                          className="w-full mt-1 px-3 py-2 text-sm border border-gray-300 rounded bg-white focus:outline-none focus:ring-2 focus:ring-[#003366] min-h-[140px] resize-y leading-relaxed"
                          placeholder="Welke originele inspanningen komen hier samen en waarom leveren ze samen meer op dan apart?"
                        />
                      </div>
                    </div>

                    {/* Rechterkolom — vermogen-impact + dossier, direct zichtbaar */}
                    <div className="lg:col-span-4 space-y-3">
                      {entry.vermogenImpact && entry.vermogenImpact.length > 0 && (
                        <div className="bg-white border border-gray-200 rounded p-3">
                          <p className="text-[10px] font-semibold text-gray-600 uppercase tracking-wider mb-1.5">
                            Welk vermogen bouwt dit op (per sector)
                          </p>
                          <ul className="space-y-1.5">
                            {entry.vermogenImpact.map((v, j) => (
                              <li key={j} className="text-[11px] text-gray-700 leading-snug">
                                <strong className="text-gray-800">{v.sectorId}:</strong> {v.impact}
                              </li>
                            ))}
                          </ul>
                        </div>
                      )}

                      <div className="bg-white border border-gray-200 rounded p-3">
                        <p className="text-[10px] font-semibold text-gray-600 uppercase tracking-wider mb-2">
                          Eigenaar, leider, kosten, randvoorwaarden
                        </p>
                        <div className="space-y-2">
                          {([
                            ["eigenaar", "Eigenaar"],
                            ["inspanningsleider", "Inspanningsleider"],
                            ["verwachtResultaat", "Verwacht resultaat"],
                            ["kostenraming", "Kostenraming"],
                            ["randvoorwaarden", "Randvoorwaarden"],
                          ] as const).map(([key, label]) => (
                            <div key={key}>
                              <label className="text-[10px] font-semibold text-gray-500">{label}</label>
                              <input
                                type="text"
                                value={entry.dossier?.[key] ?? ""}
                                onChange={(e) =>
                                  updateEntry(idx, (v) => ({
                                    ...v,
                                    dossier: {
                                      eigenaar: v.dossier?.eigenaar ?? "",
                                      inspanningsleider: v.dossier?.inspanningsleider ?? "",
                                      verwachtResultaat: v.dossier?.verwachtResultaat ?? "",
                                      kostenraming: v.dossier?.kostenraming ?? "",
                                      randvoorwaarden: v.dossier?.randvoorwaarden ?? "",
                                      [key]: e.target.value,
                                    },
                                  }))
                                }
                                className="w-full mt-0.5 px-2 py-1 text-xs border border-gray-300 rounded"
                              />
                            </div>
                          ))}
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* AI-optimalisatie diff-panel (Phase 19 substap 6.2) —
                      verschijnt na AI-call, gebruiker kan toepassen of verwerpen */}
                  {pendingDiffByIdx[idx] && (() => {
                    const pending = pendingDiffByIdx[idx];
                    const hasChanges =
                      pending.textDiffs.length > 0 ||
                      pending.vermogenImpactChanged ||
                      pending.dossierChanged;
                    return (
                      <div className="mt-3 pt-3 border-t border-gray-200 bg-white border-2 border-blue-300 rounded p-3 space-y-3">
                        <div className="flex items-center justify-between gap-2 flex-wrap">
                          <p className="text-[11px] font-semibold text-blue-800 uppercase tracking-wider">
                            AI-optimalisatie — wijzigingen voorgesteld
                          </p>
                          <div className="flex items-center gap-2">
                            <button
                              onClick={() => rejectPendingDiff(idx)}
                              className="text-[11px] px-2.5 py-1 rounded border border-gray-300 text-gray-700 bg-white hover:bg-gray-50"
                            >
                              Verwerpen
                            </button>
                            <button
                              onClick={() => applyPendingDiff(idx)}
                              disabled={!hasChanges}
                              className="text-[11px] px-2.5 py-1 rounded bg-blue-600 text-white hover:bg-blue-700 disabled:opacity-50"
                            >
                              Toepassen
                            </button>
                          </div>
                        </div>

                        {!hasChanges && (
                          <p className="text-[11px] text-gray-600 italic">
                            AI heeft geen inhoudelijke wijzigingen voorgesteld.
                          </p>
                        )}

                        {/* Tekstdiffs per veld */}
                        {pending.textDiffs.map((d) => (
                          <div key={d.field} className="space-y-1">
                            <p className="text-[10px] font-semibold text-gray-600 uppercase tracking-wider">
                              {d.label}
                            </p>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                              <div className="bg-red-50 border border-red-200 rounded p-2 text-[11px] leading-relaxed">
                                <p className="text-[9px] font-semibold text-red-700 uppercase tracking-wider mb-1">Vóór</p>
                                {d.segments.length === 0 ? (
                                  <span className="text-gray-400 italic">(leeg)</span>
                                ) : (
                                  d.segments
                                    .filter((s) => s.type !== "add")
                                    .map((s, i) =>
                                      s.type === "del" ? (
                                        <span key={i} className="bg-red-200/60 line-through text-red-900">
                                          {s.text}
                                        </span>
                                      ) : (
                                        <span key={i} className="text-gray-700">
                                          {s.text}
                                        </span>
                                      )
                                    )
                                )}
                              </div>
                              <div className="bg-green-50 border border-green-200 rounded p-2 text-[11px] leading-relaxed">
                                <p className="text-[9px] font-semibold text-green-700 uppercase tracking-wider mb-1">Na</p>
                                {d.segments.length === 0 ? (
                                  <span className="text-gray-400 italic">(leeg)</span>
                                ) : (
                                  d.segments
                                    .filter((s) => s.type !== "del")
                                    .map((s, i) =>
                                      s.type === "add" ? (
                                        <span key={i} className="bg-green-200/60 font-semibold text-green-900">
                                          {s.text}
                                        </span>
                                      ) : (
                                        <span key={i} className="text-gray-700">
                                          {s.text}
                                        </span>
                                      )
                                    )
                                )}
                              </div>
                            </div>
                          </div>
                        ))}

                        {/* Vermogen-impact diff (object-level) */}
                        {pending.vermogenImpactChanged && (
                          <div className="space-y-1">
                            <p className="text-[10px] font-semibold text-gray-600 uppercase tracking-wider">
                              Vermogen-impact per sector
                            </p>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                              <div className="bg-red-50 border border-red-200 rounded p-2 text-[11px]">
                                <p className="text-[9px] font-semibold text-red-700 uppercase tracking-wider mb-1">Vóór</p>
                                <ul className="space-y-1">
                                  {(entry.vermogenImpact ?? []).map((v, i) => (
                                    <li key={i}><strong>{v.sectorId}:</strong> {v.impact}</li>
                                  )) || <li className="italic text-gray-400">leeg</li>}
                                </ul>
                              </div>
                              <div className="bg-green-50 border border-green-200 rounded p-2 text-[11px]">
                                <p className="text-[9px] font-semibold text-green-700 uppercase tracking-wider mb-1">Na</p>
                                <ul className="space-y-1">
                                  {(pending.proposed.vermogenImpact ?? []).map((v, i) => (
                                    <li key={i}><strong>{v.sectorId}:</strong> {v.impact}</li>
                                  ))}
                                </ul>
                              </div>
                            </div>
                          </div>
                        )}

                        {/* Dossier diff (veld-level) */}
                        {pending.dossierChanged && (
                          <div className="space-y-1">
                            <p className="text-[10px] font-semibold text-gray-600 uppercase tracking-wider">
                              Dossier (eigenaar / leider / kosten / randvoorwaarden)
                            </p>
                            <div className="text-[11px] text-gray-700 space-y-0.5">
                              {(["eigenaar", "inspanningsleider", "verwachtResultaat", "kostenraming", "randvoorwaarden"] as const).map((k) => {
                                const oldVal = entry.dossier?.[k] ?? "";
                                const newVal = pending.proposed.dossier?.[k] ?? "";
                                if (oldVal === newVal) return null;
                                return (
                                  <div key={k} className="grid grid-cols-[120px_1fr] gap-2">
                                    <span className="font-semibold text-gray-500">{k}:</span>
                                    <span>
                                      <span className="bg-red-100 line-through text-red-900 px-1">{oldVal || "(leeg)"}</span>
                                      {" → "}
                                      <span className="bg-green-100 font-semibold text-green-900 px-1">{newVal || "(leeg)"}</span>
                                    </span>
                                  </div>
                                );
                              })}
                            </div>
                          </div>
                        )}
                      </div>
                    );
                  })()}

                  {/* Gerichte optimalisatie config */}
                  <div className="mt-3 pt-3 border-t border-gray-200 bg-white rounded p-3 space-y-2">
                    <p className="text-[11px] font-semibold text-gray-600 uppercase tracking-wider">
                      Optimaliseer met AI — gericht
                    </p>
                    <div className="flex flex-wrap gap-3 text-[11px]">
                      {([
                        ["titel", "Titel"],
                        ["beschrijving", "Beschrijving"],
                        ["beargumentatie", "Beargumentatie"],
                        ["vermogenImpact", "Vermogen-impact"],
                        ["dossier", "Dossier"],
                      ] as const).map(([key, label]) => {
                        const active = getOptFields(idx).has(key);
                        return (
                          <label key={key} className="inline-flex items-center gap-1.5 cursor-pointer">
                            <input
                              type="checkbox"
                              checked={active}
                              onChange={() => toggleOptField(idx, key)}
                              className="accent-[#003366]"
                            />
                            <span className="text-gray-700">{label}</span>
                          </label>
                        );
                      })}
                    </div>
                    <textarea
                      value={userInstructieByIdx[idx] ?? ""}
                      onChange={(e) =>
                        setUserInstructieByIdx((p) => ({ ...p, [idx]: e.target.value }))
                      }
                      rows={2}
                      placeholder="Specifieke wensen? Bijv: 'Maak de beargumentatie scherper op hefboom richting VO', of 'Concretere kostenraming met fasering'"
                      className="w-full px-2 py-1.5 text-xs border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-[#003366]"
                    />
                    <div className="flex items-center justify-between gap-2 flex-wrap">
                      <button
                        onClick={() => runBusinessCaseQuestions(idx)}
                        disabled={bcModeByIdx[idx] === "loading-questions" || bcModeByIdx[idx] === "loading-estimate"}
                        className="text-[11px] px-2.5 py-1 rounded border border-amber-400 text-amber-800 bg-amber-50 hover:bg-amber-100 disabled:opacity-50"
                        title="AI stelt vragen voor een onderbouwde kostenraming"
                      >
                        {bcModeByIdx[idx] === "loading-questions" ? "Vragen laden..." : "Business-case vragen (kostenraming)"}
                      </button>
                      <div className="flex items-center gap-2">
                        {isSaved && (
                          <span className="text-[11px] text-green-700 font-medium">Opgeslagen ✓</span>
                        )}
                        <button
                          onClick={() => optimizeEntry(idx)}
                          disabled={optimizingIndex !== null || getOptFields(idx).size === 0}
                          className="text-xs px-3 py-1.5 rounded border border-[#003366] text-[#003366] bg-white hover:bg-[#f0f4f8] disabled:opacity-50"
                        >
                          {optimizingIndex === idx ? "AI optimaliseert..." : "Optimaliseer geselecteerd"}
                        </button>
                        <button
                          onClick={() => saveEntry(idx)}
                          disabled={isSaving}
                          className="text-xs px-3 py-1.5 rounded bg-[#003366] text-white hover:bg-[#002244] disabled:opacity-50"
                        >
                          {isSaving ? "Opslaan..." : "Opslaan"}
                        </button>
                      </div>
                    </div>

                    {/* Business-case Q&A sectie */}
                    {bcModeByIdx[idx] === "answering" && bcQuestionsByIdx[idx] && (() => {
                      const selected = bcSelectedByIdx[idx] ?? new Set<string>();
                      const totalQs = bcQuestionsByIdx[idx]?.length ?? 0;
                      const isRefining = bcRefiningIdx === idx;
                      return (
                        <div className="mt-3 bg-amber-50 border border-amber-200 rounded p-3 space-y-2">
                          <div className="flex items-center justify-between gap-2 flex-wrap">
                            <p className="text-[11px] font-semibold text-amber-900 uppercase tracking-wider">
                              Business-case vragen — beantwoord of laat AI fineuten
                            </p>
                            <div className="flex items-center gap-2 text-[10px]">
                              <span className="text-amber-800">
                                {selected.size} van {totalQs} geselecteerd
                              </span>
                              <button
                                onClick={() => selectAllBc(idx)}
                                className="px-1.5 py-0.5 rounded border border-amber-300 text-amber-800 bg-white hover:bg-amber-100"
                              >
                                Alles
                              </button>
                              <button
                                onClick={() => clearBcSelection(idx)}
                                className="px-1.5 py-0.5 rounded border border-amber-300 text-amber-800 bg-white hover:bg-amber-100"
                              >
                                Geen
                              </button>
                            </div>
                          </div>
                          <p className="text-[10px] text-amber-800 leading-snug">
                            Vink vragen aan waar je AI wilt inzetten. Bij <strong>Fineut geselecteerde met AI</strong> wordt alleen voor díe vragen een voorstel gedaan — andere antwoorden blijven onaangeroerd.
                          </p>
                          {bcQuestionsByIdx[idx].map((q) => {
                            const isSel = selected.has(q.key);
                            return (
                              <div key={q.key} className={`${isSel ? "bg-amber-100/60 border border-amber-300" : "bg-white/60 border border-transparent"} rounded p-2`}>
                                <div className="flex items-start gap-2">
                                  <input
                                    type="checkbox"
                                    checked={isSel}
                                    onChange={() => toggleBcSelected(idx, q.key)}
                                    className="mt-0.5 accent-amber-600"
                                    title="Selecteer voor AI-fineuten"
                                  />
                                  <div className="flex-1 min-w-0">
                                    <label className="text-[11px] font-semibold text-gray-700">
                                      {q.vraag}
                                      {q.eenheid && <span className="text-gray-500 ml-1">({q.eenheid})</span>}
                                    </label>
                                    {q.toelichting && (
                                      <p className="text-[10px] text-gray-500 mb-1">{q.toelichting}</p>
                                    )}
                                    <textarea
                                      value={bcAnswersByIdx[idx]?.[q.key] ?? ""}
                                      onChange={(e) =>
                                        setBcAnswersByIdx((p) => ({
                                          ...p,
                                          [idx]: { ...(p[idx] ?? {}), [q.key]: e.target.value },
                                        }))
                                      }
                                      rows={2}
                                      placeholder="Vul een getal, range, omschrijving of 'weet ik niet' in…"
                                      className="w-full px-2 py-1 text-xs border border-gray-300 rounded resize-y leading-relaxed"
                                    />
                                  </div>
                                </div>
                              </div>
                            );
                          })}

                          {/* AI-fineut-paneel: alleen op geselecteerde vragen */}
                          <div className="pt-1 border-t border-amber-200 space-y-1.5">
                            <textarea
                              value={bcRefineInstrByIdx[idx] ?? ""}
                              onChange={(e) =>
                                setBcRefineInstrByIdx((p) => ({ ...p, [idx]: e.target.value }))
                              }
                              rows={2}
                              placeholder="Optionele AI-instructie voor de geselecteerde vragen (bv. 'minder ambitieus', 'focus op VO-sector', 'geef range + middenpunt')…"
                              className="w-full px-2 py-1 text-xs border border-amber-300 rounded resize-y leading-relaxed bg-white"
                            />
                            <div className="flex items-center justify-between gap-2 flex-wrap">
                              <button
                                onClick={() => refineSelectedBcAnswers(idx)}
                                disabled={isRefining || selected.size === 0}
                                className="text-[11px] px-2.5 py-1 rounded border border-amber-500 text-amber-900 bg-white hover:bg-amber-100 disabled:opacity-50"
                                title="AI fineut alleen de aangevinkte antwoorden"
                              >
                                {isRefining ? "AI fineut..." : `Fineut ${selected.size} geselecteerde met AI`}
                              </button>
                              <div className="flex items-center gap-2">
                                <button
                                  onClick={() => setBcModeByIdx((p) => ({ ...p, [idx]: "idle" }))}
                                  className="text-[11px] px-2.5 py-1 rounded border border-gray-300 text-gray-600 bg-white hover:bg-gray-50"
                                >
                                  Annuleer
                                </button>
                                <button
                                  onClick={() => runBusinessCaseEstimate(idx)}
                                  disabled={bcModeByIdx[idx] !== "answering"}
                                  className="text-[11px] px-2.5 py-1 rounded bg-amber-600 text-white hover:bg-amber-700 disabled:opacity-50"
                                >
                                  Genereer raming uit antwoorden
                                </button>
                              </div>
                            </div>
                          </div>
                        </div>
                      );
                    })()}
                    {bcModeByIdx[idx] === "loading-estimate" && (
                      <p className="text-[11px] text-amber-700 italic">AI berekent raming uit antwoorden...</p>
                    )}
                    {bcResultByIdx[idx] && (
                      <div className="mt-3 bg-green-50 border border-green-200 rounded p-3 space-y-1">
                        <p className="text-[11px] font-semibold text-green-900 uppercase tracking-wider">
                          Business-case raming — toegepast op kostenraming
                        </p>
                        <p className="text-[12px] text-gray-800">{bcResultByIdx[idx].kostenraming}</p>
                        {bcResultByIdx[idx].aannames.length > 0 && (
                          <div>
                            <p className="text-[10px] font-semibold text-gray-600 mt-1">Aannames:</p>
                            <ul className="list-disc list-inside text-[11px] text-gray-700">
                              {bcResultByIdx[idx].aannames.map((a, i) => <li key={i}>{a}</li>)}
                            </ul>
                          </div>
                        )}
                        {bcResultByIdx[idx].risicos && bcResultByIdx[idx].risicos!.length > 0 && (
                          <div>
                            <p className="text-[10px] font-semibold text-gray-600 mt-1">Risico&apos;s:</p>
                            <ul className="list-disc list-inside text-[11px] text-gray-700">
                              {bcResultByIdx[idx].risicos!.map((r, i) => <li key={i}>{r}</li>)}
                            </ul>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      ))}

      {/* ===== BEGROTINGSADVIES — 3 scenario's met vast jaarlijks budget ===== */}
      <div className="mt-10 pt-6 border-t-2 border-gray-200">
        <h3 className="text-lg font-semibold text-[#003366] mb-1">Begrotingsadvies — 3 scenario&apos;s op jaarlijks budget</h3>
        <p className="text-sm text-gray-600 mb-4 leading-relaxed">
          Voer het <strong>vaste jaarlijks budget</strong> in (bedrag per jaar dat beschikbaar is zolang het programma loopt).
          AI berekent drie scenario&apos;s die allemaal hetzelfde einddoel bereiken — alleen het tempo verschilt:
          <strong> Optimaal</strong> (jouw budget), <strong>+20%</strong> (sneller), <strong>−20%</strong> (langzamer).
          Outside-in volgorde voor SPEND-zwaartepunt: cultuur → mens → data/systemen → processen.
          <strong> Alle 4 domeinen starten parallel vanaf jaar 1</strong> — harde kant (data/systemen+processen) wacht NIET tot zachte kant (cultuur+mens) klaar is.
          <strong> Elk jaar moet het volledige budget worden opgemaakt</strong> (alleen het laatste jaar mag minder zijn — de rest valt vrij bij onderbesteding).
        </p>

        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 mb-3">
          <div>
            <label className="text-[11px] font-semibold text-gray-600 uppercase tracking-wider">
              Jaarlijks budget (€)
            </label>
            <input
              type="number"
              min={0}
              step={1000}
              value={budgetEuro}
              onChange={(e) => setBudgetEuro(Number(e.target.value) || 0)}
              className="w-full mt-1 px-3 py-2 text-sm border border-gray-300 rounded bg-white focus:outline-none focus:ring-2 focus:ring-[#003366]"
            />
            <p className="text-[10px] text-gray-500 mt-1">Vast bedrag per jaar — AI bepaalt hoeveel jaar nodig is.</p>
          </div>
          <div>
            <label className="text-[11px] font-semibold text-gray-600 uppercase tracking-wider">
              Cyclus (maanden)
            </label>
            <input
              type="number"
              min={1}
              max={24}
              value={cyclusMaanden}
              onChange={(e) => setCyclusMaanden(Number(e.target.value) || 1)}
              className="w-full mt-1 px-3 py-2 text-sm border border-gray-300 rounded bg-white focus:outline-none focus:ring-2 focus:ring-[#003366]"
            />
          </div>
          <div>
            <label className="text-[11px] font-semibold text-gray-600 uppercase tracking-wider">
              Startjaar
            </label>
            <input
              type="number"
              min={2020}
              max={2100}
              value={startJaar}
              onChange={(e) => setStartJaar(Number(e.target.value) || new Date().getFullYear())}
              className="w-full mt-1 px-3 py-2 text-sm border border-gray-300 rounded bg-white focus:outline-none focus:ring-2 focus:ring-[#003366]"
            />
          </div>
        </div>

        {oudBegrotingGevonden && !begrotingAdvies && (
          <div className="mb-3 bg-amber-50 border border-amber-200 rounded p-3">
            <p className="text-sm text-amber-900">
              <strong>Oud begrotingsadvies gevonden.</strong> Genereer opnieuw om de nieuwe 3-scenario-weergave te zien
              (optimaal / +20% / −20%).
            </p>
          </div>
        )}

        <button
          onClick={() => generateBegrotingsAdvies()}
          disabled={begrotingLoading}
          className="text-sm px-4 py-2 rounded bg-[#003366] text-white hover:bg-[#002244] disabled:opacity-50"
        >
          {begrotingLoading ? "AI rekent 3 scenario's door..." : "Genereer begrotingsadvies (3 scenario's)"}
        </button>

        {begrotingError && (
          <div className="mt-3 bg-red-50 border border-red-200 rounded-lg p-3">
            <p className="text-sm text-red-700">Begrotingsadvies faalde: {begrotingError}</p>
          </div>
        )}

        {begrotingAdvies && (() => {
          const scenarioVolgorde: Array<{
            key: ScenarioLabel;
            label: string;
            kleur: { banner: string; tekst: string; accent: string; kaart: string };
          }> = [
            {
              key: "optimaal",
              label: "Optimaal",
              kleur: {
                banner: "bg-[#003366]",
                tekst: "text-blue-100",
                accent: "text-[#003366]",
                kaart: "border-blue-200 bg-blue-50",
              },
            },
            {
              key: "plus20",
              label: "+20% budget (sneller)",
              kleur: {
                banner: "bg-green-800",
                tekst: "text-green-100",
                accent: "text-green-800",
                kaart: "border-green-200 bg-green-50",
              },
            },
            {
              key: "min20",
              label: "−20% budget (langzamer)",
              kleur: {
                banner: "bg-amber-800",
                tekst: "text-amber-100",
                accent: "text-amber-800",
                kaart: "border-amber-200 bg-amber-50",
              },
            },
          ];
          const partialFailures = begrotingAdvies.partialFailures ?? [];
          return (
            <div className="mt-6 space-y-6">
              {/* Partial-failure banner als 1-2 scenarios faalden */}
              {partialFailures.length > 0 && (
                <div className="bg-amber-50 border-2 border-amber-300 rounded-lg p-3">
                  <p className="text-sm text-amber-900">
                    <strong>Let op:</strong> {partialFailures.length} scenario{partialFailures.length === 1 ? "" : "'s"} faalde
                    ({partialFailures.join(", ")}). Probeer opnieuw of bewerk de inspanningen om de andere scenario&apos;s ook te genereren.
                  </p>
                </div>
              )}

              {/* Vergelijkingsbanner — 3 compact-kaartjes */}
              <div className="bg-white border-2 border-[#003366] rounded-lg p-4">
                <h4 className="text-sm font-semibold text-[#003366] mb-3">Scenario-vergelijking</h4>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  {scenarioVolgorde.map((sv) => {
                    const s = begrotingAdvies.scenarios[sv.key];
                    if (!s) {
                      return (
                        <div key={sv.key} className="border-2 border-gray-200 bg-gray-50 rounded p-3 opacity-60">
                          <p className="text-[10px] font-bold uppercase tracking-wider text-gray-500">{sv.label}</p>
                          <p className="text-sm font-medium text-gray-500 mt-2">— gefaald —</p>
                        </div>
                      );
                    }
                    return (
                      <div key={sv.key} className={`border-2 rounded p-3 ${sv.kleur.kaart}`}>
                        <p className={`text-[10px] font-bold uppercase tracking-wider ${sv.kleur.accent}`}>{sv.label}</p>
                        <p className="text-2xl font-bold text-gray-800 mt-1">
                          {s.aantalJaren} <span className="text-xs font-normal text-gray-500">jaar</span>
                        </p>
                        <p className="text-xs text-gray-600 mt-1">
                          € {s.jaarlijksBudgetEuro.toLocaleString("nl-NL")} / jaar
                        </p>
                        <p className="text-[11px] text-gray-500 mt-0.5">
                          Totaal: € {s.totaalGeraamdEuro.toLocaleString("nl-NL")}
                        </p>
                      </div>
                    );
                  })}
                </div>
                {begrotingAdvies.vergelijking && (
                  <p className="text-sm text-gray-700 mt-3 leading-relaxed italic">
                    {begrotingAdvies.vergelijking}
                  </p>
                )}

                {/* Versie-badge + prominente fineut-knop */}
                <div className="mt-4 pt-3 border-t border-gray-200 flex items-center justify-between gap-3 flex-wrap">
                  {finetuneVersie > 1 ? (
                    <p className="text-[11px] text-gray-500 italic">
                      Versie {finetuneVersie} — gefineut met:{" "}
                      <span className="text-gray-700">&quot;{laatsteFineutInstructie.slice(0, 80)}{laatsteFineutInstructie.length > 80 ? "…" : ""}&quot;</span>
                    </p>
                  ) : (
                    <p className="text-[11px] text-gray-500">
                      Niet tevreden? Stuur AI een instructie om de scenario&apos;s aan te passen.
                    </p>
                  )}
                  <button
                    onClick={() => setFinetuneOpen(true)}
                    disabled={begrotingLoading}
                    className="text-sm px-4 py-2 rounded bg-[#003366] text-white hover:bg-[#002244] disabled:opacity-50 font-medium shadow-sm"
                  >
                    ✎ Fineut met AI
                  </button>
                </div>
              </div>

              {/* Per scenario een blok — alleen voor succesvol gegenereerde scenarios */}
              {scenarioVolgorde.map((sv) => {
                const s = begrotingAdvies.scenarios[sv.key];
                if (!s) return null;
                const eindJaar = begrotingAdvies.startJaar + s.aantalJaren - 1;
                return (
                  <div key={sv.key} className="space-y-3">
                    {/* Scenario samenvattings-banner */}
                    <div className={`${sv.kleur.banner} text-white rounded-lg p-4`}>
                      <div className="flex items-start justify-between gap-3 flex-wrap">
                        <div className="flex-1 min-w-0">
                          <p className={`text-[11px] font-semibold uppercase tracking-wider ${sv.kleur.tekst} mb-1`}>
                            Scenario — {sv.label}
                          </p>
                          <p className="text-sm">{s.samenvatting}</p>
                          <p className={`text-xs ${sv.kleur.tekst} mt-2`}>
                            € {s.jaarlijksBudgetEuro.toLocaleString("nl-NL")} / jaar × {s.aantalJaren} jaar ({begrotingAdvies.startJaar}–{eindJaar})
                            {" = "}
                            <strong>€ {s.totaalGeraamdEuro.toLocaleString("nl-NL")}</strong>
                          </p>
                        </div>
                      </div>
                    </div>

                    {/* Scenario-tabel */}
                    <div className="bg-white border border-[#e2e8f0] rounded-lg p-4 overflow-x-auto">
                      <h4 className="text-sm font-semibold text-gray-700 mb-3">Meerjarige verdeling (outside-in)</h4>
                      <table className="w-full text-sm border-collapse">
                        <thead>
                          <tr className="border-b-2 border-gray-200">
                            <th className="text-left py-2 px-2 text-[10px] font-semibold text-gray-500 uppercase tracking-wider w-12">#</th>
                            <th className="text-left py-2 px-2 text-[10px] font-semibold text-gray-500 uppercase tracking-wider">Inspanning</th>
                            {Array.from({ length: s.aantalJaren }, (_, i) => begrotingAdvies.startJaar + i).map((jr) => (
                              <th key={jr} className="text-right py-2 px-2 text-[10px] font-semibold text-gray-500 uppercase tracking-wider">
                                {jr}
                              </th>
                            ))}
                            <th className="text-right py-2 px-2 text-[10px] font-semibold text-gray-500 uppercase tracking-wider">Totaal</th>
                          </tr>
                        </thead>
                        <tbody>
                          {[...s.inspanningen]
                            .sort((a, b) => a.volgorde.rank - b.volgorde.rank)
                            .map((insp, i) => {
                              const domColor = DOMAIN_COLORS[insp.domein];
                              return (
                                <tr key={i} className="border-b border-gray-100 hover:bg-gray-50 align-top">
                                  <td className="py-3 px-2">
                                    <span className={`inline-flex items-center justify-center w-7 h-7 rounded-full ${sv.kleur.banner} text-white text-xs font-bold`}>
                                      {insp.volgorde.rank}
                                    </span>
                                  </td>
                                  <td className="py-3 px-2">
                                    <p className={`text-[10px] font-bold uppercase tracking-wider ${domColor.text}`}>
                                      {DOMAIN_LABELS[insp.domein]}
                                    </p>
                                    <p className="text-sm font-semibold text-gray-800 mt-0.5 leading-snug">{insp.inspanningTitel}</p>
                                    <p className="text-[11px] text-gray-600 mt-1 italic leading-snug">
                                      Positie: {insp.volgorde.reden}
                                    </p>
                                    <p className="text-[11px] text-gray-600 mt-1 leading-snug">{insp.motivatie}</p>
                                  </td>
                                  {Array.from({ length: s.aantalJaren }, (_, k) => begrotingAdvies.startJaar + k).map((jr) => {
                                    const cell = insp.verdelingPerJaar.find((x) => x.jaar === jr);
                                    if (!cell || cell.euro === 0) {
                                      return (
                                        <td key={jr} className="text-right py-3 px-2 text-[11px] text-gray-300 align-top">—</td>
                                      );
                                    }
                                    return (
                                      <td key={jr} className="py-3 px-2 align-top min-w-[180px]">
                                        <p className="text-sm font-semibold text-gray-800 text-right">€ {cell.euro.toLocaleString("nl-NL")}</p>
                                        <p className="text-[10px] text-gray-500 text-right">{cell.percentage}%</p>
                                        <p className="text-[10px] text-gray-500 italic mt-0.5 text-right">{cell.fase}</p>
                                        {cell.activiteit && (
                                          <p className="text-[10px] text-gray-700 mt-1.5 leading-snug border-t border-gray-100 pt-1">
                                            {cell.activiteit}
                                          </p>
                                        )}
                                      </td>
                                    );
                                  })}
                                  <td className="text-right py-3 px-2">
                                    <p className={`text-sm font-bold ${sv.kleur.accent}`}>€ {insp.totaalEuro.toLocaleString("nl-NL")}</p>
                                    <p className="text-[10px] text-gray-500">{insp.percentageTotaal}%</p>
                                  </td>
                                </tr>
                              );
                            })}
                        </tbody>
                        <tfoot>
                          <tr className="border-t-2 border-gray-300 bg-gray-50">
                            <td className="py-2 px-2"></td>
                            <td className="py-2 px-2 text-[11px] font-semibold text-gray-700 uppercase tracking-wider">
                              Totaal per jaar
                            </td>
                            {Array.from({ length: s.aantalJaren }, (_, k) => begrotingAdvies.startJaar + k).map((jr) => {
                              const t = s.totalenPerJaar.find((x) => x.jaar === jr);
                              return (
                                <td key={jr} className="text-right py-2 px-2">
                                  <p className={`text-sm font-bold ${sv.kleur.accent}`}>€ {(t?.euro ?? 0).toLocaleString("nl-NL")}</p>
                                  <p className="text-[10px] text-gray-500">{t?.percentage ?? 0}%</p>
                                </td>
                              );
                            })}
                            <td className="text-right py-2 px-2">
                              <p className={`text-sm font-bold ${sv.kleur.accent}`}>€ {s.totaalGeraamdEuro.toLocaleString("nl-NL")}</p>
                            </td>
                          </tr>
                        </tfoot>
                      </table>
                    </div>

                    {/* Prioriteitadvies per scenario */}
                    <div className={`border rounded-lg p-4 ${sv.kleur.kaart}`}>
                      <h4 className={`text-sm font-semibold mb-2 ${sv.kleur.accent}`}>
                        Prioriteitadvies — outside-in volgorde
                      </h4>
                      <p className="text-sm text-gray-700 leading-relaxed whitespace-pre-wrap">
                        {s.prioriteitAdvies}
                      </p>
                    </div>
                  </div>
                );
              })}
            </div>
          );
        })()}
      </div>

      {/* ===== FINEUT-MODAL ===== */}
      {finetuneOpen && (
        <div
          className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4"
          onClick={() => {
            if (!begrotingLoading) {
              setFinetuneOpen(false);
              setFinetuneInstructie("");
            }
          }}
        >
          <div
            className="bg-white rounded-lg shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="p-5 border-b border-gray-200">
              <h3 className="text-lg font-semibold text-[#003366]">Begroting fineuten met AI</h3>
              <p className="text-sm text-gray-600 mt-1 leading-relaxed">
                Geef instructie hoe de scenario&apos;s anders moeten — een ander tempo, andere fasering,
                of een specifiekere prioriteit-onderbouwing. Of klik op een voorbeeld hieronder om te starten.
              </p>
            </div>
            <div className="p-5 space-y-4">
              <div>
                <p className="text-[11px] font-semibold text-gray-600 uppercase tracking-wider mb-2">
                  Voorbeelden — klik om in te vullen
                </p>
                <div className="flex flex-wrap gap-2">
                  {FINETUNE_VOORBEELDEN.map((vb) => (
                    <button
                      key={vb.kort}
                      onClick={() => setFinetuneInstructie(vb.instructie)}
                      disabled={begrotingLoading}
                      className="text-xs px-3 py-1.5 rounded-full border border-[#003366] text-[#003366] bg-white hover:bg-[#f0f4f8] disabled:opacity-50"
                      title={vb.instructie}
                    >
                      {vb.kort}
                    </button>
                  ))}
                </div>
              </div>
              <div>
                <label className="text-[11px] font-semibold text-gray-600 uppercase tracking-wider">
                  Instructie aan AI
                </label>
                <textarea
                  value={finetuneInstructie}
                  onChange={(e) => setFinetuneInstructie(e.target.value)}
                  rows={5}
                  placeholder="Bijvoorbeeld: 'Verleng Optimaal naar 7 jaar omdat cultuurverandering meer tijd vraagt' of 'Schuif data/systemen volledig naar de laatste 2 jaar'."
                  className="w-full mt-1 px-3 py-2 text-sm border border-gray-300 rounded bg-white focus:outline-none focus:ring-2 focus:ring-[#003366] resize-y leading-relaxed"
                />
                <p className="text-[10px] text-gray-500 mt-1">
                  Tip: wees specifiek over WAT en WAAROM. AI kent de huidige scenario&apos;s en past die aan op basis van je instructie.
                </p>
              </div>
              {begrotingError && (
                <div className="bg-red-50 border border-red-200 rounded p-2">
                  <p className="text-xs text-red-700">{begrotingError}</p>
                </div>
              )}
            </div>
            <div className="p-5 border-t border-gray-200 flex items-center justify-end gap-2">
              <button
                onClick={() => {
                  setFinetuneOpen(false);
                  setFinetuneInstructie("");
                }}
                disabled={begrotingLoading}
                className="text-sm px-4 py-2 rounded border border-gray-300 text-gray-700 bg-white hover:bg-gray-50 disabled:opacity-50"
              >
                Annuleer
              </button>
              <button
                onClick={async () => {
                  const instr = finetuneInstructie.trim();
                  if (!instr) {
                    setBegrotingError("Vul een fineut-instructie in.");
                    return;
                  }
                  await generateBegrotingsAdvies({
                    finetuneInstructie: instr,
                    previousAdvies: begrotingAdvies,
                  });
                  setFinetuneOpen(false);
                  setFinetuneInstructie("");
                }}
                disabled={begrotingLoading || !finetuneInstructie.trim()}
                className="text-sm px-4 py-2 rounded bg-[#003366] text-white hover:bg-[#002244] disabled:opacity-50 font-medium"
              >
                {begrotingLoading ? "AI rekent door..." : "Stuur naar AI"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
