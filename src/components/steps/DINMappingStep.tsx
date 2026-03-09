"use client";

import { useState } from "react";
import { useSession } from "@/lib/session-context";
import type {
  DINBenefit,
  DINCapability,
  DINEffort,
  EffortDomain,
  SectorName,
  IntegratieAdviesResult,
  IntegratieAdviesItem,
} from "@/lib/types";
import { SECTORS, SECTOR_COLORS } from "@/lib/types";
import {
  createBenefit,
  createCapability,
  createEffort,
  getBenefitsByGoalAndSector,
} from "@/lib/din-service";
import BenefitCard from "@/components/din/BenefitCard";
import CapabilityCard from "@/components/din/CapabilityCard";
import EffortCard from "@/components/din/EffortCard";
import DINChainIndicator from "@/components/din/DINChainIndicator";
import MergedDINView from "@/components/din/MergedDINView";

type DINPhase = "per-sector" | "samengevoegd";

const DOMAINS: { key: EffortDomain; label: string }[] = [
  { key: "mens", label: "Mens" },
  { key: "processen", label: "Processen" },
  { key: "data_systemen", label: "Data & Systemen" },
  { key: "cultuur", label: "Cultuur" },
];

function SectorBadge({ sector }: { sector: string }) {
  const colors = SECTOR_COLORS[sector as SectorName] || "bg-gray-100 text-gray-700 border-gray-200";
  return (
    <span className={`inline-block px-1.5 py-0.5 rounded text-[10px] font-medium border ${colors}`}>
      {sector}
    </span>
  );
}

const DOMAIN_LABEL_MAP: Record<string, string> = {
  mens: "Mens",
  processen: "Processen",
  data_systemen: "Data & Systemen",
  cultuur: "Cultuur",
};

const ADVIES_SECTIONS: {
  key: keyof Omit<IntegratieAdviesResult, "sectorName">;
  color: string;
  borderColor: string;
  bgColor: string;
  iconColor: string;
}[] = [
  { key: "aansluiting", color: "text-green-700", borderColor: "border-green-200", bgColor: "bg-green-50", iconColor: "bg-green-500" },
  { key: "verrijking", color: "text-blue-700", borderColor: "border-blue-200", bgColor: "bg-blue-50", iconColor: "bg-blue-500" },
  { key: "aanvullingen", color: "text-amber-700", borderColor: "border-amber-200", bgColor: "bg-amber-50", iconColor: "bg-amber-500" },
  { key: "quickWins", color: "text-purple-700", borderColor: "border-purple-200", bgColor: "bg-purple-50", iconColor: "bg-purple-500" },
  { key: "aandachtspunten", color: "text-red-700", borderColor: "border-red-200", bgColor: "bg-red-50", iconColor: "bg-red-500" },
];

function AdviesCard({ section, color, borderColor, bgColor, iconColor }: {
  section: IntegratieAdviesItem;
  color: string;
  borderColor: string;
  bgColor: string;
  iconColor: string;
}) {
  const [open, setOpen] = useState(true);
  return (
    <div className={`border ${borderColor} rounded-lg ${bgColor} overflow-hidden`}>
      <button
        onClick={() => setOpen(!open)}
        className="w-full px-4 py-3 flex items-center justify-between text-left"
      >
        <div className="flex items-center gap-2">
          <span className={`w-2.5 h-2.5 rounded-full ${iconColor} shrink-0`} />
          <span className={`text-sm font-semibold ${color}`}>{section.titel}</span>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-xs text-gray-400">{section.punten.length} punten</span>
          <span className="text-xs text-gray-400">{open ? "\u25B2" : "\u25BC"}</span>
        </div>
      </button>
      {open && (
        <div className="px-4 pb-4">
          <p className="text-xs text-gray-500 italic mb-3">{section.toelichting}</p>
          {section.punten.length > 0 ? (
            <ul className="space-y-2">
              {section.punten.map((punt, i) => (
                <li key={i} className="flex items-start gap-2 text-sm text-gray-700">
                  <span className={`mt-1.5 w-1.5 h-1.5 rounded-full ${iconColor} shrink-0`} />
                  <span>{punt}</span>
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-xs text-gray-400 italic">Geen items ge\u00EFdentificeerd.</p>
          )}
        </div>
      )}
    </div>
  );
}

function LopendeInspanningenPanel({
  currentSector,
  allEfforts,
  currentSectorEfforts,
}: {
  currentSector: SectorName;
  allEfforts: DINEffort[];
  currentSectorEfforts: DINEffort[];
}) {
  const [open, setOpen] = useState(false);

  const otherEfforts = allEfforts.filter(
    (e) => e.sectorId !== currentSector && e.description.trim() !== ""
  );

  const bySector: Record<string, DINEffort[]> = {};
  otherEfforts.forEach((e) => {
    if (!bySector[e.sectorId]) bySector[e.sectorId] = [];
    bySector[e.sectorId].push(e);
  });

  // Overlap-detectie: zoek inspanningen met gedeelde woorden
  function findOverlaps() {
    const overlaps: { current: DINEffort; other: DINEffort }[] = [];
    const currentDescs = currentSectorEfforts
      .filter((e) => e.description.trim())
      .map((e) => ({
        effort: e,
        words: new Set(e.description.toLowerCase().split(/\s+/).filter((w) => w.length > 3)),
      }));

    otherEfforts.forEach((other) => {
      const otherWords = new Set(
        other.description.toLowerCase().split(/\s+/).filter((w) => w.length > 3)
      );
      currentDescs.forEach(({ effort: current, words }) => {
        const shared = [...words].filter((w) => otherWords.has(w));
        if (shared.length >= 2) {
          overlaps.push({ current, other });
        }
      });
    });
    return overlaps;
  }

  const overlaps = findOverlaps();

  if (otherEfforts.length === 0) return null;

  return (
    <div className="border border-amber-200 rounded-lg bg-amber-50/50 overflow-hidden">
      <button
        onClick={() => setOpen(!open)}
        className="w-full px-4 py-3 flex items-center justify-between text-left"
      >
        <div className="flex items-center gap-2">
          <span className="text-sm text-amber-600">{"\uD83D\uDD0D"}</span>
          <span className="text-sm font-semibold text-amber-800">
            Lopende inspanningen andere sectoren
          </span>
          <span className="text-xs text-amber-600 bg-amber-100 px-1.5 py-0.5 rounded">
            {otherEfforts.length}
          </span>
          {overlaps.length > 0 && (
            <span className="text-xs text-red-600 bg-red-100 px-1.5 py-0.5 rounded font-medium">
              {overlaps.length} mogelijke overlap(s)
            </span>
          )}
        </div>
        <span className="text-xs text-gray-400">{open ? "\u25B2" : "\u25BC"}</span>
      </button>

      {open && (
        <div className="px-4 pb-4 space-y-4">
          {/* Overlap waarschuwingen */}
          {overlaps.length > 0 && (
            <div className="p-3 bg-red-50 border border-red-200 rounded-lg">
              <h5 className="text-xs font-semibold text-red-700 mb-2">
                Mogelijke overlap met {currentSector}
              </h5>
              <div className="space-y-2">
                {overlaps.slice(0, 5).map((o, i) => (
                  <div key={i} className="text-xs text-gray-700 flex items-start gap-2">
                    <span className="text-red-400 mt-0.5 shrink-0">!</span>
                    <div>
                      <span className="font-medium">{currentSector}:</span>{" "}
                      &ldquo;{o.current.description}&rdquo;
                      <span className="mx-1 text-gray-400">~</span>
                      <SectorBadge sector={o.other.sectorId} />{" "}
                      &ldquo;{o.other.description}&rdquo;
                      {o.other.quarter && (
                        <span className="text-gray-400 ml-1">({o.other.quarter})</span>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Per sector overzicht */}
          {Object.entries(bySector).map(([sector, efforts]) => (
            <div key={sector}>
              <div className="flex items-center gap-2 mb-2">
                <SectorBadge sector={sector} />
                <span className="text-xs font-medium text-gray-600">
                  {efforts.length} inspanningen
                </span>
              </div>
              <div className="grid grid-cols-2 gap-2 ml-4">
                {(["mens", "processen", "data_systemen", "cultuur"] as EffortDomain[]).map((domain) => {
                  const domainEfforts = efforts.filter((e) => e.domain === domain);
                  if (domainEfforts.length === 0) return null;
                  return (
                    <div key={domain}>
                      <div className="text-[10px] font-medium text-gray-500 mb-0.5">
                        {DOMAIN_LABEL_MAP[domain]}
                      </div>
                      {domainEfforts.map((e) => (
                        <div key={e.id} className="text-xs text-gray-600 flex items-center gap-1 py-0.5">
                          <span className="text-gray-300">-</span>
                          <span className="flex-1">{e.description || "(naamloos)"}</span>
                          {e.quarter && (
                            <span className="text-gray-400 text-[10px]">{e.quarter}</span>
                          )}
                          {e.status === "in_uitvoering" && (
                            <span className="text-[10px] bg-green-100 text-green-700 px-1 rounded">actief</span>
                          )}
                        </div>
                      ))}
                    </div>
                  );
                })}
              </div>
            </div>
          ))}

          {/* Domein-totalen */}
          <div className="pt-2 border-t border-amber-200">
            <div className="text-xs font-medium text-gray-500 mb-1">
              Totaal per domein (alle sectoren)
            </div>
            <div className="flex gap-4">
              {(["mens", "processen", "data_systemen", "cultuur"] as EffortDomain[]).map((domain) => {
                const count = allEfforts.filter((e) => e.domain === domain).length;
                return (
                  <div key={domain} className="text-center">
                    <div className="text-sm font-bold text-cito-blue">{count}</div>
                    <div className="text-[10px] text-gray-400">{DOMAIN_LABEL_MAP[domain]}</div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default function DINMappingStep() {
  const { session, updateSession, setCurrentStep } = useSession();
  const [phase, setPhase] = useState<DINPhase>("per-sector");
  const [activeSector, setActiveSector] = useState<SectorName>("PO");
  const [activeGoalId, setActiveGoalId] = useState<string | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const [isAnalyzingIntegratie, setIsAnalyzingIntegratie] = useState(false);
  const [integratieAdvies, setIntegratieAdvies] = useState<Record<string, IntegratieAdviesResult | string>>({});

  if (!session) return null;

  if (session.goals.length === 0) {
    return (
      <div className="text-center py-8">
        <p className="text-gray-500">
          Geen doelen beschikbaar. Importeer eerst KiB-data in stap 1 (KiB
          Import).
        </p>
        <button
          onClick={() => setCurrentStep("import")}
          className="mt-3 px-4 py-2 bg-cito-blue text-white rounded-lg text-sm font-medium hover:bg-cito-blue-light"
        >
          Ga naar KiB Import
        </button>
      </div>
    );
  }

  const selectedGoal = activeGoalId || session.goals[0]?.id;

  const sectorPlan = session.sectorPlans.find(
    (s) => s.sectorName === activeSector
  );
  const sectorBenefits = selectedGoal
    ? getBenefitsByGoalAndSector(session.benefits, selectedGoal, activeSector)
    : [];
  const sectorCapabilities = session.capabilities.filter(
    (c) => c.sectorId === activeSector
  );
  const sectorEfforts = session.efforts.filter(
    (e) => e.sectorId === activeSector
  );

  // Voortgang per sector
  function getSectorProgress(sector: SectorName) {
    const hasBenefits = session!.benefits.some((b) => b.sectorId === sector);
    const hasEfforts = session!.efforts.some((e) => e.sectorId === sector);
    const hasCaps = session!.capabilities.some((c) => c.sectorId === sector);
    if (hasBenefits && hasEfforts && hasCaps) return "compleet";
    if (hasBenefits || hasEfforts || hasCaps) return "bezig";
    return "leeg";
  }

  // --- CRUD functies ---
  function updateBenefit(updated: DINBenefit) {
    updateSession({
      benefits: session!.benefits.map((b) =>
        b.id === updated.id ? updated : b
      ),
    });
  }
  function deleteBenefit(id: string) {
    updateSession({
      benefits: session!.benefits.filter((b) => b.id !== id),
      goalBenefitMaps: session!.goalBenefitMaps.filter(
        (m) => m.benefitId !== id
      ),
    });
  }
  function addBenefit() {
    if (!selectedGoal) return;
    const newBenefit = createBenefit(selectedGoal, activeSector, "");
    updateSession({
      benefits: [...session!.benefits, newBenefit],
      goalBenefitMaps: [
        ...session!.goalBenefitMaps,
        { goalId: selectedGoal, benefitId: newBenefit.id },
      ],
    });
  }
  function updateCapability(updated: DINCapability) {
    updateSession({
      capabilities: session!.capabilities.map((c) =>
        c.id === updated.id ? updated : c
      ),
    });
  }
  function deleteCapability(id: string) {
    updateSession({
      capabilities: session!.capabilities.filter((c) => c.id !== id),
      benefitCapabilityMaps: session!.benefitCapabilityMaps.filter(
        (m) => m.capabilityId !== id
      ),
    });
  }
  function addCapability() {
    const newCap = createCapability(activeSector, "");
    updateSession({ capabilities: [...session!.capabilities, newCap] });
  }
  function updateEffort(updated: DINEffort) {
    updateSession({
      efforts: session!.efforts.map((e) =>
        e.id === updated.id ? updated : e
      ),
    });
  }
  function deleteEffort(id: string) {
    updateSession({
      efforts: session!.efforts.filter((e) => e.id !== id),
      capabilityEffortMaps: session!.capabilityEffortMaps.filter(
        (m) => m.effortId !== id
      ),
    });
  }
  function addEffort(domain: EffortDomain) {
    const newEffort = createEffort(activeSector, "", domain);
    updateSession({ efforts: [...session!.efforts, newEffort] });
  }

  // --- Per-item AI suggesties ---
  async function fetchAISuggestion(
    type: "baat" | "vermogen" | "inspanning",
    extra: Record<string, unknown> = {}
  ) {
    const goal = session!.goals.find((g) => g.id === selectedGoal);
    const context: Record<string, unknown> = {
      sector: activeSector,
      goalName: goal?.name,
      goalDescription: goal?.description,
      sectorPlanText: sectorPlan?.rawText,
      ...extra,
    };
    const res = await fetch("/api/din-suggest", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ type, context }),
    });
    const data = await res.json();
    if (data.success && data.data?.suggestion) {
      return data.data.suggestion;
    }
    return null;
  }

  function makeBenefitSuggest(benefit: DINBenefit) {
    return async () => {
      return fetchAISuggestion("baat", {
        existingDescription: benefit.description || undefined,
        relatedBenefits: sectorBenefits
          .filter((b) => b.id !== benefit.id && b.description)
          .map((b) => b.description),
      });
    };
  }

  function makeCapabilitySuggest(cap: DINCapability) {
    return async () => {
      return fetchAISuggestion("vermogen", {
        existingDescription: cap.description || undefined,
        relatedBenefits: sectorBenefits
          .filter((b) => b.description)
          .map((b) => b.description),
        relatedCapabilities: sectorCapabilities
          .filter((c) => c.id !== cap.id && c.description)
          .map((c) => c.description),
      });
    };
  }

  function makeEffortSuggest(effort: DINEffort) {
    return async () => {
      const domainLabels: Record<string, string> = {
        mens: "Mens",
        processen: "Processen",
        data_systemen: "Data & Systemen",
        cultuur: "Cultuur",
      };
      return fetchAISuggestion("inspanning", {
        existingDescription: effort.description || undefined,
        domain: domainLabels[effort.domain] || effort.domain,
        relatedCapabilities: sectorCapabilities
          .filter((c) => c.description)
          .map((c) => c.description),
      });
    };
  }

  // --- AI volledig DIN genereren ---
  async function handleAIGenerate() {
    if (!selectedGoal) return;
    setIsGenerating(true);
    try {
      const goal = session!.goals.find((g) => g.id === selectedGoal);
      const res = await fetch("/api/din-mapping", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ goal, sectorPlan, sector: activeSector }),
      });
      const data = await res.json();
      if (data.success && data.data) {
        const newBenefits = (data.data.benefits || []).map(
          (b: Partial<DINBenefit>) => ({
            ...createBenefit(selectedGoal, activeSector, ""),
            ...b,
            goalId: selectedGoal,
            sectorId: activeSector,
          })
        );
        const newCaps = (data.data.capabilities || []).map(
          (c: Partial<DINCapability>) => ({
            ...createCapability(activeSector, ""),
            ...c,
            sectorId: activeSector,
          })
        );
        const newEfforts = (data.data.efforts || []).map(
          (e: Partial<DINEffort>) => ({
            ...createEffort(activeSector, "", "mens"),
            ...e,
            sectorId: activeSector,
          })
        );
        updateSession({
          benefits: [...session!.benefits, ...newBenefits],
          capabilities: [...session!.capabilities, ...newCaps],
          efforts: [...session!.efforts, ...newEfforts],
          goalBenefitMaps: [
            ...session!.goalBenefitMaps,
            ...newBenefits.map((b: DINBenefit) => ({
              goalId: selectedGoal,
              benefitId: b.id,
            })),
          ],
        });
      }
    } catch (e) {
      console.error("AI generatie mislukt:", e);
    } finally {
      setIsGenerating(false);
    }
  }

  // --- Integratie-advies ---
  async function handleIntegratieAdvies() {
    setIsAnalyzingIntegratie(true);
    try {
      const res = await fetch("/api/cross-analyse", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          type: "sector-integratie",
          sector: activeSector,
          sectorPlan: sectorPlan?.rawText || "",
          goals: session!.goals,
          benefits: session!.benefits.filter((b) => b.sectorId === activeSector),
          capabilities: sectorCapabilities,
          efforts: sectorEfforts,
        }),
      });
      const data = await res.json();
      if (data.success && data.data?.analysis) {
        let parsed: IntegratieAdviesResult | string;
        try {
          const raw = data.data.analysis as string;
          // Strip markdown code fences if present
          const cleaned = raw
            .replace(/^```(?:json)?\s*/i, "")
            .replace(/\s*```\s*$/i, "")
            .trim();
          const json = JSON.parse(cleaned);
          parsed = {
            sectorName: activeSector,
            aansluiting: json.aansluiting,
            verrijking: json.verrijking,
            aanvullingen: json.aanvullingen,
            quickWins: json.quickWins,
            aandachtspunten: json.aandachtspunten,
          } as IntegratieAdviesResult;
        } catch {
          // Fallback: platte tekst als JSON parsing faalt
          parsed = data.data.analysis;
        }
        setIntegratieAdvies((prev) => ({
          ...prev,
          [activeSector]: parsed,
        }));
      }
    } catch (e) {
      console.error("Integratie-advies mislukt:", e);
    } finally {
      setIsAnalyzingIntegratie(false);
    }
  }

  return (
    <div className="space-y-4">
      {/* Fase toggle */}
      <div className="flex items-center gap-1 p-1 bg-gray-100 rounded-lg w-fit">
        <button
          onClick={() => setPhase("per-sector")}
          className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
            phase === "per-sector"
              ? "bg-white text-cito-blue shadow-sm"
              : "text-gray-500 hover:text-gray-700"
          }`}
        >
          Per Sector Invullen
        </button>
        <button
          onClick={() => setPhase("samengevoegd")}
          className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
            phase === "samengevoegd"
              ? "bg-white text-cito-blue shadow-sm"
              : "text-gray-500 hover:text-gray-700"
          }`}
        >
          Samengevoegd DIN-Netwerk
        </button>
      </div>

      {/* Fase B: Samengevoegd */}
      {phase === "samengevoegd" && (
        <div className="space-y-4">
          <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg text-sm text-gray-700">
            <strong>Samengevoegd overzicht:</strong> Alle sectoren gecombineerd in
            één DIN-netwerk. Per doel zie je welke baten, vermogens en inspanningen
            per sector zijn ingevuld. Gedeelde vermogens worden als synergie
            gemarkeerd.
          </div>
          <MergedDINView
            session={session}
            onSwitchToEdit={() => setPhase("per-sector")}
            onDeleteBenefit={deleteBenefit}
            onDeleteCapability={deleteCapability}
            onDeleteEffort={deleteEffort}
          />
        </div>
      )}

      {/* Fase A: Per Sector */}
      {phase === "per-sector" && (
        <>
          <DINChainIndicator />

          {/* Sector tabs met voortgang */}
          <div className="flex gap-1 border-b border-gray-200">
            {SECTORS.map((sector) => {
              const progress = getSectorProgress(sector);
              return (
                <button
                  key={sector}
                  onClick={() => {
                    setActiveSector(sector);
                    setActiveGoalId(null);
                  }}
                  className={`px-5 py-2.5 text-sm font-medium border-b-2 transition-colors flex items-center gap-2 ${
                    activeSector === sector
                      ? "border-cito-blue text-cito-blue"
                      : "border-transparent text-gray-500 hover:text-gray-700"
                  }`}
                >
                  {sector}
                  <span
                    className={`inline-block w-2 h-2 rounded-full ${
                      progress === "compleet"
                        ? "bg-green-500"
                        : progress === "bezig"
                        ? "bg-amber-400"
                        : "bg-gray-300"
                    }`}
                  />
                </button>
              );
            })}
          </div>

          {/* Actieve sector header */}
          <div className="px-4 py-3 bg-cito-blue/5 border border-cito-blue/20 rounded-lg">
            <div className="text-sm font-semibold text-cito-blue">
              DIN-netwerk voor sector: {activeSector}
            </div>
            <div className="text-xs text-gray-500 mt-0.5">
              Selecteer links een doel en vul rechts de baten, vermogens en
              inspanningen in. Gebruik de AI-knoppen per item voor hulp.
            </div>
          </div>

          <div className="flex gap-6">
            {/* Doelen sidebar */}
            <div className="w-56 shrink-0">
              <h4 className="text-xs font-semibold text-gray-500 uppercase mb-2">
                Doelen
              </h4>
              <div className="space-y-1">
                {session.goals
                  .sort((a, b) => a.rank - b.rank)
                  .map((goal) => {
                    const hasBenefits = session.benefits.some(
                      (b) =>
                        b.goalId === goal.id && b.sectorId === activeSector
                    );
                    return (
                      <button
                        key={goal.id}
                        onClick={() => setActiveGoalId(goal.id)}
                        className={`w-full text-left px-3 py-2 rounded-lg text-sm transition-colors ${
                          selectedGoal === goal.id
                            ? "bg-cito-blue text-white"
                            : "text-gray-700 hover:bg-gray-100"
                        }`}
                      >
                        {goal.rank}. {goal.name}
                        {hasBenefits && (
                          <span className="ml-1 text-green-400">{"\u25CF"}</span>
                        )}
                      </button>
                    );
                  })}
              </div>
            </div>

            {/* DIN Editor */}
            <div className="flex-1 space-y-6">
              {/* AI genereer knop */}
              <div className="flex justify-end">
                <button
                  onClick={handleAIGenerate}
                  disabled={isGenerating}
                  className="px-4 py-2 bg-cito-accent text-white rounded-lg text-sm font-medium hover:bg-cito-blue disabled:opacity-50"
                >
                  {isGenerating
                    ? "Genereren..."
                    : "AI: Genereer DIN-netwerk"}
                </button>
              </div>

              {/* Baten */}
              <div>
                <div className="flex items-center justify-between mb-1">
                  <h4 className="text-sm font-semibold text-din-baten">
                    Baten — welke effecten wil {activeSector} bereiken?
                  </h4>
                  <button
                    onClick={addBenefit}
                    className="text-xs text-cito-blue hover:underline"
                  >
                    + Baat toevoegen
                  </button>
                </div>
                <p className="text-xs text-gray-400 mb-2 italic">
                  Hoe-vraag: Welke effecten wil {activeSector} bereiken voor dit
                  doel?
                </p>
                <div className="space-y-2">
                  {sectorBenefits.map((b) => (
                    <BenefitCard
                      key={b.id}
                      benefit={b}
                      onChange={updateBenefit}
                      onDelete={() => deleteBenefit(b.id)}
                      onAISuggest={makeBenefitSuggest(b)}
                    />
                  ))}
                  {sectorBenefits.length === 0 && (
                    <p className="text-sm text-gray-400 italic">
                      Nog geen baten. Voeg ze toe of laat AI genereren.
                    </p>
                  )}
                </div>
              </div>

              {/* Vermogens */}
              <div>
                <div className="flex items-center justify-between mb-1">
                  <h4 className="text-sm font-semibold text-din-vermogens">
                    Vermogens — wat moet {activeSector} kunnen?
                  </h4>
                  <button
                    onClick={addCapability}
                    className="text-xs text-cito-blue hover:underline"
                  >
                    + Vermogen toevoegen
                  </button>
                </div>
                <p className="text-xs text-gray-400 mb-2 italic">
                  Hoe-vraag: Wat moet {activeSector} kunnen om deze baten te
                  realiseren?
                </p>
                <div className="space-y-2">
                  {sectorCapabilities.map((c) => (
                    <CapabilityCard
                      key={c.id}
                      capability={c}
                      onChange={updateCapability}
                      onDelete={() => deleteCapability(c.id)}
                      onAISuggest={makeCapabilitySuggest(c)}
                    />
                  ))}
                  {sectorCapabilities.length === 0 && (
                    <p className="text-sm text-gray-400 italic">
                      Nog geen vermogens voor {activeSector}.
                    </p>
                  )}
                </div>
              </div>

              {/* Inspanningen per domein */}
              <div>
                <h4 className="text-sm font-semibold text-din-inspanningen mb-1">
                  Inspanningen — wat moet {activeSector} doen?
                </h4>
                <p className="text-xs text-gray-400 mb-2 italic">
                  Hoe-vraag: Welke concrete activiteiten bouwen de vermogens op?
                  Verdeeld over 4 domeinen.
                </p>
                <div className="grid grid-cols-2 gap-4 items-start">
                  {DOMAINS.map((domain) => {
                    const domainEfforts = sectorEfforts.filter(
                      (e) => e.domain === domain.key
                    );
                    return (
                      <div key={domain.key} className="space-y-2 min-h-0">
                        <div className="flex items-center justify-between">
                          <span className="text-xs font-semibold text-gray-600">
                            {domain.label}
                          </span>
                          <button
                            onClick={() => addEffort(domain.key)}
                            className="text-xs text-cito-blue hover:underline"
                          >
                            +
                          </button>
                        </div>
                        {domainEfforts.map((e) => (
                          <EffortCard
                            key={e.id}
                            effort={e}
                            onChange={updateEffort}
                            onDelete={() => deleteEffort(e.id)}
                            onAISuggest={makeEffortSuggest(e)}
                          />
                        ))}
                        {domainEfforts.length === 0 && (
                          <p className="text-xs text-gray-400 italic">Geen</p>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Integratie-advies */}
              <div className="border border-cito-blue/20 rounded-lg overflow-hidden">
                <div className="px-4 py-3 bg-cito-blue/5 flex items-center justify-between">
                  <div>
                    <h4 className="text-sm font-semibold text-cito-blue">
                      Integratie-advies: {activeSector}
                    </h4>
                    <p className="text-xs text-gray-500 mt-0.5">
                      Hoe past het DIN-netwerk in het sectorplan van {activeSector}?
                    </p>
                  </div>
                  <button
                    onClick={handleIntegratieAdvies}
                    disabled={isAnalyzingIntegratie}
                    className="px-4 py-2 bg-cito-accent text-white rounded-lg text-sm font-medium hover:bg-cito-blue disabled:opacity-50 shrink-0"
                  >
                    {isAnalyzingIntegratie ? "Analyseren..." : "AI: Integratie-advies"}
                  </button>
                </div>
                {integratieAdvies[activeSector] && (
                  <div className="p-4 space-y-3">
                    {typeof integratieAdvies[activeSector] === "string" ? (
                      <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg">
                        <div className="text-sm text-gray-700 whitespace-pre-wrap">
                          {integratieAdvies[activeSector] as string}
                        </div>
                      </div>
                    ) : (
                      ADVIES_SECTIONS.map(({ key, color, borderColor, bgColor, iconColor }) => {
                        const advice = integratieAdvies[activeSector] as IntegratieAdviesResult;
                        const section = advice[key];
                        if (!section) return null;
                        return (
                          <AdviesCard
                            key={key}
                            section={section}
                            color={color}
                            borderColor={borderColor}
                            bgColor={bgColor}
                            iconColor={iconColor}
                          />
                        );
                      })
                    )}
                  </div>
                )}
              </div>

              {/* Lopende inspanningen andere sectoren */}
              <LopendeInspanningenPanel
                currentSector={activeSector}
                allEfforts={session.efforts}
                currentSectorEfforts={sectorEfforts}
              />
            </div>
          </div>
        </>
      )}
    </div>
  );
}
