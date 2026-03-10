"use client";

import { useState, useEffect, useCallback } from "react";
import { useSession } from "@/lib/session-context";
import type {
  DINBenefit,
  DINCapability,
  DINEffort,
  EffortDomain,
  EffortStatus,
  SectorName,
  IntegratieAdviesResult,
  IntegratieAdviesItem,
  ExternalProject,
} from "@/lib/types";
import MarkdownContent from "@/components/ui/MarkdownContent";
import { SECTORS } from "@/lib/types";
import {
  createBenefit,
  createCapability,
  createEffort,
  generateId,
  getBenefitsByGoalAndSector,
} from "@/lib/din-service";
import BenefitCard from "@/components/din/BenefitCard";
import CapabilityCard from "@/components/din/CapabilityCard";
import EffortCard from "@/components/din/EffortCard";
import DINChainIndicator from "@/components/din/DINChainIndicator";
import MergedDINView from "@/components/din/MergedDINView";
import { generateVerrijktSectorplanDocument } from "@/lib/word-export";

type DINPhase = "per-sector" | "samengevoegd";

const DOMAINS: { key: EffortDomain; label: string }[] = [
  { key: "mens", label: "Mens" },
  { key: "processen", label: "Processen" },
  { key: "data_systemen", label: "Data & Systemen" },
  { key: "cultuur", label: "Cultuur" },
];

const DOMAIN_DOT_COLORS: Record<EffortDomain, string> = {
  mens: "bg-domain-mens",
  processen: "bg-domain-processen",
  data_systemen: "bg-domain-data",
  cultuur: "bg-domain-cultuur",
};

const DOMAIN_DOT_BG: Record<EffortDomain, string> = {
  mens: "bg-domain-mens/15",
  processen: "bg-domain-processen/15",
  data_systemen: "bg-domain-data/15",
  cultuur: "bg-domain-cultuur/15",
};

const DOMAIN_EFFORT_BTN: Record<EffortDomain, string> = {
  mens: "bg-domain-mens/10 hover:bg-domain-mens/20 border-domain-mens/20",
  processen: "bg-domain-processen/10 hover:bg-domain-processen/20 border-domain-processen/20",
  data_systemen: "bg-domain-data/10 hover:bg-domain-data/20 border-domain-data/20",
  cultuur: "bg-domain-cultuur/10 hover:bg-domain-cultuur/20 border-domain-cultuur/20",
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


const STATUS_OPTIONS: { key: EffortStatus; label: string; color: string }[] = [
  { key: "gepland", label: "Gepland", color: "bg-gray-100 text-gray-600" },
  { key: "in_uitvoering", label: "Actief", color: "bg-green-100 text-green-700" },
  { key: "afgerond", label: "Afgerond", color: "bg-blue-100 text-blue-700" },
  { key: "on_hold", label: "On hold", color: "bg-amber-100 text-amber-700" },
];

function ExterneProjectenPanel({
  currentSector,
  projects,
  onAdd,
  onUpdate,
  onDelete,
}: {
  currentSector: SectorName;
  projects: ExternalProject[];
  onAdd: () => void;
  onUpdate: (updated: ExternalProject) => void;
  onDelete: (id: string) => void;
}) {
  const [open, setOpen] = useState(projects.length > 0);
  const [editingId, setEditingId] = useState<string | null>(null);

  function cycleStatus(project: ExternalProject) {
    const order: EffortStatus[] = ["gepland", "in_uitvoering", "afgerond", "on_hold"];
    const idx = order.indexOf(project.status);
    const next = order[(idx + 1) % order.length];
    onUpdate({ ...project, status: next });
  }

  return (
    <div className="border border-gray-200 rounded-lg bg-gray-50/50 overflow-hidden">
      <button
        onClick={() => setOpen(!open)}
        className="w-full px-4 py-3 flex items-center justify-between text-left"
      >
        <div className="flex items-center gap-2">
          <span className="text-sm font-semibold text-gray-700">
            Lopende projecten
          </span>
          {projects.length > 0 && (
            <span className="text-xs text-gray-500 bg-gray-200 px-1.5 py-0.5 rounded">
              {projects.length}
            </span>
          )}
        </div>
        <span className="text-xs text-gray-400">{open ? "\u25B2" : "\u25BC"}</span>
      </button>

      {open && (
        <div className="px-4 pb-4 space-y-3">
          <p className="text-xs text-gray-400">
            Lopende projecten bij {currentSector} die vanwege hun kenmerken passen bij het programma Klant in Beeld.
          </p>

          {projects.map((p) => (
            <div key={p.id} className="group p-3 bg-white border border-gray-200 rounded-lg">
              {editingId === p.id ? (
                <div className="space-y-2">
                  <input
                    type="text"
                    defaultValue={p.name}
                    autoFocus
                    placeholder="Projectnaam"
                    className="w-full px-2 py-1.5 text-sm border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-cito-blue"
                    onBlur={(ev) => {
                      if (ev.target.value.trim() !== p.name) {
                        onUpdate({ ...p, name: ev.target.value.trim() });
                      }
                    }}
                    onKeyDown={(ev) => {
                      if (ev.key === "Enter") ev.currentTarget.blur();
                    }}
                  />
                  <textarea
                    defaultValue={p.description}
                    placeholder="Korte beschrijving van het project..."
                    className="w-full px-2 py-1.5 text-xs border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-cito-blue resize-y h-16"
                    onBlur={(ev) => {
                      if (ev.target.value.trim() !== p.description) {
                        onUpdate({ ...p, description: ev.target.value.trim() });
                      }
                    }}
                  />
                  <input
                    type="text"
                    defaultValue={p.relevance || ""}
                    placeholder="Waarom relevant voor het programma?"
                    className="w-full px-2 py-1.5 text-xs border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-cito-blue"
                    onBlur={(ev) => {
                      if (ev.target.value.trim() !== (p.relevance || "")) {
                        onUpdate({ ...p, relevance: ev.target.value.trim() });
                      }
                    }}
                  />
                  <div className="flex items-center gap-2">
                    <select
                      defaultValue={p.status}
                      className="text-xs px-2 py-1 border border-gray-300 rounded focus:outline-none"
                      onChange={(ev) => {
                        onUpdate({ ...p, status: ev.target.value as EffortStatus });
                      }}
                    >
                      {STATUS_OPTIONS.map((s) => (
                        <option key={s.key} value={s.key}>{s.label}</option>
                      ))}
                    </select>
                    <button
                      onClick={() => setEditingId(null)}
                      className="text-xs text-cito-blue hover:underline ml-auto"
                    >
                      Klaar
                    </button>
                  </div>
                </div>
              ) : (
                <div className="flex items-start gap-2">
                  <button
                    onClick={() => cycleStatus(p)}
                    title={`Status: ${STATUS_OPTIONS.find((s) => s.key === p.status)?.label}`}
                    className={`shrink-0 text-[10px] px-1.5 py-0.5 rounded mt-0.5 ${
                      STATUS_OPTIONS.find((s) => s.key === p.status)?.color || "bg-gray-100 text-gray-600"
                    }`}
                  >
                    {STATUS_OPTIONS.find((s) => s.key === p.status)?.label}
                  </button>
                  <div
                    className="flex-1 cursor-pointer hover:text-cito-blue min-w-0"
                    onClick={() => setEditingId(p.id)}
                    title="Klik om te bewerken"
                  >
                    <div className="text-sm font-medium text-gray-700 truncate">
                      {p.name || "(naamloos project)"}
                    </div>
                    {p.description && (
                      <div className="text-xs text-gray-500 mt-0.5 line-clamp-2">{p.description}</div>
                    )}
                    {p.relevance && (
                      <div className="text-[10px] text-cito-blue mt-1 italic">Relevantie: {p.relevance}</div>
                    )}
                  </div>
                  <button
                    onClick={() => onDelete(p.id)}
                    className="opacity-0 group-hover:opacity-100 text-red-400 hover:text-red-600 shrink-0 text-xs mt-0.5"
                    title="Verwijderen"
                  >
                    {"\u2715"}
                  </button>
                </div>
              )}
            </div>
          ))}

          {projects.length === 0 && (
            <p className="text-xs text-gray-400 italic py-2">
              Nog geen lopende projecten toegevoegd. Voeg projecten toe die passen bij Klant in Beeld.
            </p>
          )}

          <button
            onClick={onAdd}
            className="text-xs text-cito-blue hover:underline"
          >
            + Project toevoegen
          </button>
        </div>
      )}
    </div>
  );
}

function CompactCapabilityRow({
  capability,
  efforts,
  sharedWith,
  onExpand,
  onUnlink,
  onDelete,
}: {
  capability: DINCapability;
  efforts: DINEffort[];
  sharedWith: string[];
  onExpand: () => void;
  onUnlink: () => void;
  onDelete: () => void;
}) {
  const [confirmDel, setConfirmDel] = useState(false);

  // Groepeer inspanningen per domein voor visuele indicatoren
  const domainCounts = efforts.reduce((acc, e) => {
    acc[e.domain] = (acc[e.domain] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);

  return (
    <div
      className="flex items-center gap-3 px-3 py-2.5 bg-white rounded-lg border border-gray-100 hover:border-din-vermogens/30 group transition-colors cursor-pointer"
      onClick={onExpand}
    >
      {/* Kleur-indicator links */}
      <div className="w-1 h-8 rounded-full bg-din-vermogens/40 shrink-0" />

      <div className="flex-1 min-w-0">
        <span className="text-sm text-gray-700 block truncate">
          {capability.description || "(naamloos vermogen)"}
        </span>
        <div className="flex items-center gap-3 mt-1 flex-wrap">
          {/* Niveau-indicatoren */}
          {(capability.currentLevel || capability.targetLevel) && (
            <div className="flex items-center gap-1">
              {capability.currentLevel && (
                <span className="text-[10px] font-medium text-amber-600">{capability.currentLevel}/5</span>
              )}
              {capability.currentLevel && capability.targetLevel && (
                <span className="text-[10px] text-gray-300">{"\u2192"}</span>
              )}
              {capability.targetLevel && (
                <span className="text-[10px] font-medium text-green-600">{capability.targetLevel}/5</span>
              )}
            </div>
          )}

          {/* Domein-inspanning dots */}
          {efforts.length > 0 ? (
            <div className="flex items-center gap-1">
              {Object.entries(domainCounts).map(([domain, count]) => (
                <span
                  key={domain}
                  className={`inline-flex items-center gap-0.5 text-[9px] px-1.5 py-0.5 rounded ${DOMAIN_DOT_BG[domain as EffortDomain]} text-gray-500`}
                  title={`${DOMAINS.find(d => d.key === domain)?.label}: ${count} inspanning(en)`}
                >
                  <span className={`w-1.5 h-1.5 rounded-full ${DOMAIN_DOT_COLORS[domain as EffortDomain]}`} />
                  {count}
                </span>
              ))}
            </div>
          ) : (
            <span className="text-[10px] text-gray-300 italic">geen inspanningen</span>
          )}

          {/* Gedeeld met andere baten */}
          {sharedWith.length > 0 && (
            <span
              className="text-[10px] text-din-baten bg-din-baten/10 px-1.5 py-0.5 rounded-full"
              title={`Ook bij: ${sharedWith.join(", ")}`}
            >
              +{sharedWith.length} baten
            </span>
          )}
        </div>
      </div>

      {/* Acties */}
      <div className="flex items-center gap-1 shrink-0" onClick={(e) => e.stopPropagation()}>
        <button onClick={onExpand} className="text-xs text-gray-400 hover:text-cito-blue p-1" title="Bewerken">
          {"\u270E"}
        </button>
        <button
          onClick={onUnlink}
          className="text-xs text-gray-300 hover:text-amber-500 opacity-0 group-hover:opacity-100 transition-opacity p-1"
          title="Ontkoppel van deze baat"
        >
          {"\u2715"}
        </button>
        {confirmDel ? (
          <div className="flex items-center gap-1">
            <button onClick={onDelete} className="text-[10px] px-1.5 py-0.5 bg-red-500 text-white rounded font-medium">Ja</button>
            <button onClick={() => setConfirmDel(false)} className="text-[10px] px-1 py-0.5 text-gray-500">Nee</button>
          </div>
        ) : (
          <button
            onClick={() => setConfirmDel(true)}
            className="text-xs text-gray-300 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-opacity p-1"
            title="Verwijderen"
          >
            &#128465;
          </button>
        )}
      </div>
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
  const [isGeneratingPlan, setIsGeneratingPlan] = useState(false);
  const [verrijktSectorplan, setVerrijktSectorplanState] = useState<Record<string, string>>(
    session?.verrijkteSectorplannen || {}
  );
  const [showAdviesPanel, setShowAdviesPanel] = useState(false);
  const [integratieAdvies, setIntegratieAdviesState] = useState<Record<string, IntegratieAdviesResult | string>>(
    session?.integratieAdvies || {}
  );
  // Baat-sectie UX state
  const [collapsedBenefits, setCollapsedBenefits] = useState<Set<string>>(new Set());
  const [linkDropdownForBenefit, setLinkDropdownForBenefit] = useState<string | null>(null);
  const [expandedCapability, setExpandedCapability] = useState<string | null>(null);
  const [effortLinkDropdownForCap, setEffortLinkDropdownForCap] = useState<string | null>(null);

  // Undo state voor verwijderde items
  const [deletedItem, setDeletedItem] = useState<{
    type: "baat" | "vermogen" | "inspanning";
    item: DINBenefit | DINCapability | DINEffort;
    maps: { goalBenefitMaps?: { goalId: string; benefitId: string }[]; benefitCapabilityMaps?: { benefitId: string; capabilityId: string }[]; capabilityEffortMaps?: { capabilityId: string; effortId: string }[] };
  } | null>(null);
  const [undoTimer, setUndoTimer] = useState<ReturnType<typeof setTimeout> | null>(null);

  // Auto-dismiss undo toast na 8 seconden
  const dismissUndo = useCallback(() => {
    setDeletedItem(null);
    if (undoTimer) clearTimeout(undoTimer);
    setUndoTimer(null);
  }, [undoTimer]);

  useEffect(() => {
    return () => { if (undoTimer) clearTimeout(undoTimer); };
  }, [undoTimer]);

  // Wrapper: sla integratie-advies ook op in sessie (persistentie)
  function setIntegratieAdvies(updater: (prev: Record<string, IntegratieAdviesResult | string>) => Record<string, IntegratieAdviesResult | string>) {
    setIntegratieAdviesState((prev) => {
      const next = updater(prev);
      updateSession({ integratieAdvies: next });
      return next;
    });
  }

  // Wrapper: sla verrijkt sectorplan ook op in sessie
  function setVerrijktSectorplan(updater: Record<string, string> | ((prev: Record<string, string>) => Record<string, string>)) {
    setVerrijktSectorplanState((prev) => {
      const next = typeof updater === "function" ? updater(prev) : updater;
      updateSession({ verrijkteSectorplannen: next });
      return next;
    });
  }

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

  // Vermogens per doel: filter via benefitCapabilityMaps (DIN-keten)
  const goalBenefitIds = new Set(sectorBenefits.map((b) => b.id));
  const linkedCapIds = new Set(
    session.benefitCapabilityMaps
      .filter((m) => goalBenefitIds.has(m.benefitId))
      .map((m) => m.capabilityId)
  );
  // Fallback: als geen maps bestaan voor deze sector, toon alle sector-vermogens
  const allSectorCaps = session.capabilities.filter((c) => c.sectorId === activeSector);
  const hasCapMaps = allSectorCaps.some((c) =>
    session.benefitCapabilityMaps.some((m) => m.capabilityId === c.id)
  );
  const sectorCapabilities = hasCapMaps
    ? allSectorCaps.filter((c) => linkedCapIds.has(c.id))
    : allSectorCaps;

  // Inspanningen per doel: filter via capabilityEffortMaps (DIN-keten)
  const goalCapIds = new Set(sectorCapabilities.map((c) => c.id));
  const linkedEffortIds = new Set(
    session.capabilityEffortMaps
      .filter((m) => goalCapIds.has(m.capabilityId))
      .map((m) => m.effortId)
  );
  const allSectorEfforts = session.efforts.filter((e) => e.sectorId === activeSector);
  const hasEffortMaps = allSectorEfforts.some((e) =>
    session.capabilityEffortMaps.some((m) => m.effortId === e.id)
  );
  const sectorEfforts = hasEffortMaps
    ? allSectorEfforts.filter((e) => linkedEffortIds.has(e.id))
    : allSectorEfforts;

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
    const item = session!.benefits.find((b) => b.id === id);
    const maps = session!.goalBenefitMaps.filter((m) => m.benefitId === id);
    if (item) {
      if (undoTimer) clearTimeout(undoTimer);
      setDeletedItem({ type: "baat", item, maps: { goalBenefitMaps: maps } });
      setUndoTimer(setTimeout(() => setDeletedItem(null), 8000));
    }
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
    const item = session!.capabilities.find((c) => c.id === id);
    const maps = session!.benefitCapabilityMaps.filter((m) => m.capabilityId === id);
    if (item) {
      if (undoTimer) clearTimeout(undoTimer);
      setDeletedItem({ type: "vermogen", item, maps: { benefitCapabilityMaps: maps } });
      setUndoTimer(setTimeout(() => setDeletedItem(null), 8000));
    }
    updateSession({
      capabilities: session!.capabilities.filter((c) => c.id !== id),
      benefitCapabilityMaps: session!.benefitCapabilityMaps.filter(
        (m) => m.capabilityId !== id
      ),
    });
  }
  function addCapability() {
    const newCap = createCapability(activeSector, "");
    // DIN-keten: koppel aan alle baten van het huidige doel in deze sector
    const newMaps = sectorBenefits.map((b) => ({
      benefitId: b.id,
      capabilityId: newCap.id,
    }));
    updateSession({
      capabilities: [...session!.capabilities, newCap],
      benefitCapabilityMaps: [...session!.benefitCapabilityMaps, ...newMaps],
    });
  }
  function addCapabilityForBenefit(benefitId: string) {
    const newCap = createCapability(activeSector, "");
    updateSession({
      capabilities: [...session!.capabilities, newCap],
      benefitCapabilityMaps: [
        ...session!.benefitCapabilityMaps,
        { benefitId, capabilityId: newCap.id },
      ],
    });
  }
  function updateEffort(updated: DINEffort) {
    updateSession({
      efforts: session!.efforts.map((e) =>
        e.id === updated.id ? updated : e
      ),
    });
  }
  function deleteEffort(id: string) {
    const item = session!.efforts.find((e) => e.id === id);
    const maps = session!.capabilityEffortMaps.filter((m) => m.effortId === id);
    if (item) {
      if (undoTimer) clearTimeout(undoTimer);
      setDeletedItem({ type: "inspanning", item, maps: { capabilityEffortMaps: maps } });
      setUndoTimer(setTimeout(() => setDeletedItem(null), 8000));
    }
    updateSession({
      efforts: session!.efforts.filter((e) => e.id !== id),
      capabilityEffortMaps: session!.capabilityEffortMaps.filter(
        (m) => m.effortId !== id
      ),
    });
  }
  function addEffort(domain: EffortDomain) {
    const newEffort = createEffort(activeSector, "", domain);
    // DIN-keten: koppel aan alle vermogens van het huidige doel in deze sector
    const newMaps = sectorCapabilities.map((c) => ({
      capabilityId: c.id,
      effortId: newEffort.id,
    }));
    updateSession({
      efforts: [...session!.efforts, newEffort],
      capabilityEffortMaps: [...session!.capabilityEffortMaps, ...newMaps],
    });
  }
  function addEffortForCapability(capabilityId: string, domain: EffortDomain) {
    const newEffort = createEffort(activeSector, "", domain);
    updateSession({
      efforts: [...session!.efforts, newEffort],
      capabilityEffortMaps: [
        ...session!.capabilityEffortMaps,
        { capabilityId, effortId: newEffort.id },
      ],
    });
  }

  // --- Geneste DIN-keten helpers ---
  function getCapabilitiesForBenefit(benefitId: string) {
    const capIds = new Set(
      session!.benefitCapabilityMaps
        .filter((m) => m.benefitId === benefitId)
        .map((m) => m.capabilityId)
    );
    return allSectorCaps.filter((c) => capIds.has(c.id));
  }

  function getEffortsForCapability(capabilityId: string) {
    const effIds = new Set(
      session!.capabilityEffortMaps
        .filter((m) => m.capabilityId === capabilityId)
        .map((m) => m.effortId)
    );
    return allSectorEfforts.filter((e) => effIds.has(e.id));
  }

  function getUnlinkedCapabilities() {
    const linkedCapIds = new Set(
      session!.benefitCapabilityMaps
        .filter((m) => goalBenefitIds.has(m.benefitId))
        .map((m) => m.capabilityId)
    );
    return allSectorCaps.filter((c) => !linkedCapIds.has(c.id));
  }

  function getUnlinkedEfforts() {
    const allLinkedCapIds = new Set(sectorCapabilities.map((c) => c.id));
    const linkedEffortIds = new Set(
      session!.capabilityEffortMaps
        .filter((m) => allLinkedCapIds.has(m.capabilityId))
        .map((m) => m.effortId)
    );
    return allSectorEfforts.filter((e) => !linkedEffortIds.has(e.id));
  }

  function getOtherBenefitsForCapability(capId: string, currentBenefitId: string) {
    return session!.benefitCapabilityMaps
      .filter((m) => m.capabilityId === capId && m.benefitId !== currentBenefitId)
      .map((m) => sectorBenefits.find((b) => b.id === m.benefitId))
      .filter(Boolean)
      .map((b) => b!.description || "(naamloos)");
  }

  function linkCapabilityToBenefit(benefitId: string, capabilityId: string) {
    const exists = session!.benefitCapabilityMaps.some(
      (m) => m.benefitId === benefitId && m.capabilityId === capabilityId
    );
    if (exists) return;
    updateSession({
      benefitCapabilityMaps: [
        ...session!.benefitCapabilityMaps,
        { benefitId, capabilityId },
      ],
    });
    setLinkDropdownForBenefit(null);
  }

  function unlinkCapabilityFromBenefit(benefitId: string, capabilityId: string) {
    updateSession({
      benefitCapabilityMaps: session!.benefitCapabilityMaps.filter(
        (m) => !(m.benefitId === benefitId && m.capabilityId === capabilityId)
      ),
    });
  }

  function toggleCollapseBenefit(benefitId: string) {
    setCollapsedBenefits((prev) => {
      const next = new Set(prev);
      if (next.has(benefitId)) next.delete(benefitId);
      else next.add(benefitId);
      return next;
    });
  }

  function getAvailableCapsForBenefit(benefitId: string) {
    const linkedCapIds = new Set(
      session!.benefitCapabilityMaps
        .filter((m) => m.benefitId === benefitId)
        .map((m) => m.capabilityId)
    );
    return allSectorCaps.filter((c) => !linkedCapIds.has(c.id));
  }

  function linkEffortToCapability(capabilityId: string, effortId: string) {
    const exists = session!.capabilityEffortMaps.some(
      (m) => m.capabilityId === capabilityId && m.effortId === effortId
    );
    if (exists) return;
    updateSession({
      capabilityEffortMaps: [
        ...session!.capabilityEffortMaps,
        { capabilityId, effortId },
      ],
    });
    setEffortLinkDropdownForCap(null);
  }

  function unlinkEffortFromCapability(capabilityId: string, effortId: string) {
    updateSession({
      capabilityEffortMaps: session!.capabilityEffortMaps.filter(
        (m) => !(m.capabilityId === capabilityId && m.effortId === effortId)
      ),
    });
  }

  function getAvailableEffortsForCapability(capabilityId: string) {
    const linkedEffIds = new Set(
      session!.capabilityEffortMaps
        .filter((m) => m.capabilityId === capabilityId)
        .map((m) => m.effortId)
    );
    return allSectorEfforts.filter((e) => !linkedEffIds.has(e.id));
  }

  function getOtherCapsForEffort(effortId: string, currentCapId: string) {
    return session!.capabilityEffortMaps
      .filter((m) => m.effortId === effortId && m.capabilityId !== currentCapId)
      .map((m) => allSectorCaps.find((c) => c.id === m.capabilityId))
      .filter(Boolean)
      .map((c) => c!.description || "(naamloos)");
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
    return async (userPrompt?: string) => {
      return fetchAISuggestion("baat", {
        existingDescription: benefit.description || undefined,
        existingIndicator: benefit.profiel.indicator || undefined,
        existingOwner: benefit.profiel.indicatorOwner || undefined,
        existingCurrentValue: benefit.profiel.currentValue || undefined,
        existingTargetValue: benefit.profiel.targetValue || undefined,
        userPrompt: userPrompt || undefined,
        relatedBenefits: sectorBenefits
          .filter((b) => b.id !== benefit.id && b.description)
          .map((b) => b.description),
      });
    };
  }

  function makeCapabilitySuggest(cap: DINCapability) {
    return async (userPrompt?: string) => {
      return fetchAISuggestion("vermogen", {
        existingDescription: cap.description || undefined,
        userPrompt: userPrompt || undefined,
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
    return async (userPrompt?: string) => {
      const domainLabels: Record<string, string> = {
        mens: "Mens",
        processen: "Processen",
        data_systemen: "Data & Systemen",
        cultuur: "Cultuur",
      };
      return fetchAISuggestion("inspanning", {
        existingDescription: effort.description || undefined,
        domain: domainLabels[effort.domain] || effort.domain,
        userPrompt: userPrompt || undefined,
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
        body: JSON.stringify({
          goal,
          sectorPlan,
          sector: activeSector,
          allGoals: session!.goals.map((g) => ({ name: g.name, description: g.description })),
          sectorAnalysis: session!.sectorAnalyses?.[activeSector] || "",
        }),
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
        // DIN-keten: koppel alle niveaus aan elkaar
        // Doel → Baten
        const newGoalBenefitMaps = newBenefits.map((b: DINBenefit) => ({
          goalId: selectedGoal,
          benefitId: b.id,
        }));
        // Baten → Vermogens (elke baat aan elk vermogen binnen dit doel)
        const newBenCapMaps = newBenefits.flatMap((b: DINBenefit) =>
          newCaps.map((c: DINCapability) => ({
            benefitId: b.id,
            capabilityId: c.id,
          }))
        );
        // Vermogens → Inspanningen (elk vermogen aan elke inspanning)
        const newCapEffMaps = newCaps.flatMap((c: DINCapability) =>
          newEfforts.map((e: DINEffort) => ({
            capabilityId: c.id,
            effortId: e.id,
          }))
        );

        updateSession({
          benefits: [...session!.benefits, ...newBenefits],
          capabilities: [...session!.capabilities, ...newCaps],
          efforts: [...session!.efforts, ...newEfforts],
          goalBenefitMaps: [...session!.goalBenefitMaps, ...newGoalBenefitMaps],
          benefitCapabilityMaps: [...session!.benefitCapabilityMaps, ...newBenCapMaps],
          capabilityEffortMaps: [...session!.capabilityEffortMaps, ...newCapEffMaps],
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
          externalProjects: (session!.externalProjects || []).filter((p) => p.sectorId === activeSector),
          sectorAnalysis: session!.sectorAnalyses?.[activeSector] || "",
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
        setShowAdviesPanel(true);
      }
    } catch (e) {
      console.error("Integratie-advies mislukt:", e);
    } finally {
      setIsAnalyzingIntegratie(false);
    }
  }

  // --- Verrijkt sectorplan genereren ---
  async function handleGenerateVerrijktPlan() {
    setIsGeneratingPlan(true);
    try {
      // Integratie-advies als tekst meegeven
      let adviesText = "";
      const advies = integratieAdvies[activeSector];
      if (advies && typeof advies !== "string") {
        const sections = ["aansluiting", "verrijking", "aanvullingen", "quickWins", "aandachtspunten"] as const;
        adviesText = sections
          .map((key) => {
            const s = advies[key];
            if (!s) return "";
            return `${s.titel}: ${s.toelichting}\n${s.punten.map((p) => `- ${p}`).join("\n")}`;
          })
          .filter(Boolean)
          .join("\n\n");
      } else if (typeof advies === "string") {
        adviesText = advies;
      }

      const res = await fetch("/api/cross-analyse", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          type: "verrijkt-sectorplan",
          sector: activeSector,
          sectorPlan: sectorPlan?.rawText || "",
          goals: session!.goals.map((g) => ({ name: g.name, description: g.description })),
          benefits: session!.benefits
            .filter((b) => b.sectorId === activeSector)
            .map((b) => ({
              description: b.description,
              profiel: b.profiel,
            })),
          capabilities: sectorCapabilities.map((c) => ({
            description: c.description,
            currentLevel: c.currentLevel,
            targetLevel: c.targetLevel,
          })),
          efforts: sectorEfforts.map((e) => ({
            description: e.description,
            domain: e.domain,
            quarter: e.quarter,
            status: e.status,
          })),
          integratieAdvies: adviesText,
          externalProjects: (session!.externalProjects || []).filter((p) => p.sectorId === activeSector),
        }),
      });
      const data = await res.json();
      if (data.success && data.data?.analysis) {
        setVerrijktSectorplan((prev) => ({
          ...prev,
          [activeSector]: data.data.analysis,
        }));
      }
    } catch (e) {
      console.error("Verrijkt sectorplan genereren mislukt:", e);
    } finally {
      setIsGeneratingPlan(false);
    }
  }

  // --- Undo handler ---
  function handleUndo() {
    if (!deletedItem) return;
    const { type, item, maps } = deletedItem;
    if (type === "baat") {
      updateSession({
        benefits: [...session!.benefits, item as DINBenefit],
        goalBenefitMaps: [...session!.goalBenefitMaps, ...(maps.goalBenefitMaps || [])],
      });
    } else if (type === "vermogen") {
      updateSession({
        capabilities: [...session!.capabilities, item as DINCapability],
        benefitCapabilityMaps: [...session!.benefitCapabilityMaps, ...(maps.benefitCapabilityMaps || [])],
      });
    } else if (type === "inspanning") {
      updateSession({
        efforts: [...session!.efforts, item as DINEffort],
        capabilityEffortMaps: [...session!.capabilityEffortMaps, ...(maps.capabilityEffortMaps || [])],
      });
    }
    dismissUndo();
  }

  const deletedItemLabel = deletedItem
    ? deletedItem.type === "baat"
      ? `Baat "${(deletedItem.item as DINBenefit).description || "(naamloos)"}"`
      : deletedItem.type === "vermogen"
      ? `Vermogen "${(deletedItem.item as DINCapability).description || "(naamloos)"}"`
      : `Inspanning "${(deletedItem.item as DINEffort).description || "(naamloos)"}"`
    : "";

  return (
    <div className="space-y-4">
      {/* Undo toast */}
      {deletedItem && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 flex items-center gap-3 px-5 py-3 bg-gray-900 text-white rounded-xl shadow-lg animate-slide-in-right">
          <span className="text-sm">{deletedItemLabel} verwijderd</span>
          <button
            onClick={handleUndo}
            className="text-sm font-semibold text-cito-accent hover:text-white bg-white/10 px-3 py-1 rounded-lg transition-colors"
          >
            Terughalen
          </button>
          <button
            onClick={dismissUndo}
            className="text-gray-400 hover:text-white text-xs ml-1"
          >
            &#10005;
          </button>
        </div>
      )}

      {/* Loading overlay bij genereren verrijkt sectorplan */}
      {isGeneratingPlan && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-white/80 backdrop-blur-sm">
          <div className="flex flex-col items-center gap-4 p-8 bg-white rounded-2xl shadow-lg border border-gray-200 max-w-sm">
            <div className="w-12 h-12 border-3 border-cito-blue border-t-transparent rounded-full animate-spin" />
            <div className="text-center">
              <h3 className="text-base font-semibold text-cito-blue">
                Sectorplan wordt bijgewerkt...
              </h3>
              <p className="text-xs text-gray-500 mt-1">
                Programmadoelen KiB + DIN-items worden verwerkt in het sectorplan van {activeSector}
              </p>
            </div>
          </div>
        </div>
      )}

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
              {/* AI knoppen */}
              <div className="flex justify-end gap-2">
                <button
                  onClick={handleAIGenerate}
                  disabled={isGenerating}
                  className="px-4 py-2 bg-cito-accent text-white rounded-lg text-sm font-medium hover:bg-cito-blue disabled:opacity-50"
                >
                  {isGenerating
                    ? "Genereren..."
                    : "AI: Genereer DIN-netwerk"}
                </button>
                <button
                  onClick={handleIntegratieAdvies}
                  disabled={isAnalyzingIntegratie}
                  className="px-4 py-2 bg-white border border-cito-blue text-cito-blue rounded-lg text-sm font-medium hover:bg-cito-blue/5 disabled:opacity-50"
                >
                  {isAnalyzingIntegratie ? "Analyseren..." : "Integratie-advies"}
                </button>
                {integratieAdvies[activeSector] && (
                  <button
                    onClick={() => setShowAdviesPanel(true)}
                    className="px-3 py-2 bg-cito-blue/10 text-cito-blue rounded-lg text-sm hover:bg-cito-blue/20"
                    title="Bekijk integratie-advies"
                  >
                    {"\uD83D\uDCCB"}
                  </button>
                )}
              </div>

              {/* Baten — inklapbare secties met koppeling-beheer */}
              <div className="flex items-center justify-between">
                <div>
                  <h4 className="text-sm font-semibold text-cito-blue">
                    DIN-keten: Baten {"\u2192"} Vermogens {"\u2192"} Inspanningen
                  </h4>
                  <p className="text-xs text-gray-400 italic">
                    Per baat zie je de volledige keten: welke vermogens nodig zijn en welke inspanningen die opbouwen.
                  </p>
                </div>
                <button
                  onClick={addBenefit}
                  className="text-xs px-3 py-1.5 bg-din-baten/10 text-din-baten rounded-lg hover:bg-din-baten/20 font-medium"
                >
                  + Baat toevoegen
                </button>
              </div>

              {sectorBenefits.length === 0 && (
                <p className="text-sm text-gray-400 italic">
                  Nog geen baten. Voeg ze toe of laat AI genereren.
                </p>
              )}

              <div className="space-y-3">
                {sectorBenefits.map((benefit, bIdx) => {
                  const benefitCaps = getCapabilitiesForBenefit(benefit.id);
                  const isCollapsed = collapsedBenefits.has(benefit.id);
                  const availableCaps = getAvailableCapsForBenefit(benefit.id);
                  // Tel inspanningen voor deze baat (via vermogens)
                  const benefitEffortCount = benefitCaps.reduce(
                    (sum, cap) => sum + getEffortsForCapability(cap.id).length, 0
                  );

                  return (
                    <div key={benefit.id} className="border border-din-baten/25 rounded-xl overflow-hidden bg-white shadow-sm">
                      {/* Klikbare baat header */}
                      <button
                        onClick={() => toggleCollapseBenefit(benefit.id)}
                        className="w-full flex items-center gap-3 px-4 py-3 bg-din-baten/[0.04] hover:bg-din-baten/[0.08] transition-colors text-left"
                      >
                        <span className="w-7 h-7 rounded-lg bg-din-baten/10 text-din-baten font-bold text-sm flex items-center justify-center shrink-0">
                          B{bIdx + 1}
                        </span>
                        <span className="text-sm text-gray-700 truncate flex-1">
                          {benefit.description || "Nieuwe baat..."}
                        </span>
                        <span className="text-[10px] bg-din-vermogens/10 text-din-vermogens px-2 py-0.5 rounded-full shrink-0 font-medium">
                          {benefitCaps.length} verm.
                        </span>
                        <span className="text-[10px] bg-din-inspanningen/10 text-din-inspanningen px-2 py-0.5 rounded-full shrink-0 font-medium">
                          {benefitEffortCount} insp.
                        </span>
                        <span className="text-xs text-gray-400 shrink-0">{isCollapsed ? "\u25B6" : "\u25BC"}</span>
                      </button>

                      {/* Uitgeklapte inhoud */}
                      {!isCollapsed && (
                        <div className="p-4 space-y-4 border-t border-din-baten/10">
                          {/* BenefitCard */}
                          <BenefitCard
                            benefit={benefit}
                            onChange={updateBenefit}
                            onDelete={() => deleteBenefit(benefit.id)}
                            onAISuggest={makeBenefitSuggest(benefit)}
                          />

                          {/* Gekoppelde vermogens */}
                          <div>
                            <div className="flex items-center gap-2 mb-2">
                              <span className="w-1.5 h-4 bg-din-vermogens rounded-full" />
                              <span className="text-xs font-semibold text-din-vermogens">
                                Gekoppelde vermogens ({benefitCaps.length})
                              </span>
                            </div>

                            {benefitCaps.length === 0 && (
                              <p className="text-xs text-gray-400 italic ml-4 mb-2">
                                Nog geen vermogens gekoppeld aan deze baat.
                              </p>
                            )}

                            <div className="space-y-1.5">
                              {benefitCaps.map((cap) => {
                                const capEfforts = getEffortsForCapability(cap.id);
                                const sharedWith = getOtherBenefitsForCapability(cap.id, benefit.id);

                                if (expandedCapability === cap.id) {
                                  const capEffortsExpanded = getEffortsForCapability(cap.id);
                                  const availableEfforts = getAvailableEffortsForCapability(cap.id);
                                  return (
                                    <div key={cap.id} className="border border-din-vermogens/20 rounded-xl overflow-hidden bg-din-vermogens/[0.02]">
                                      {/* Vermogen header */}
                                      <div className="flex items-center justify-between px-3 py-2 bg-din-vermogens/[0.06] border-b border-din-vermogens/10">
                                        <div className="flex items-center gap-2">
                                          <span className="w-1.5 h-4 bg-din-vermogens rounded-full" />
                                          <span className="text-xs font-semibold text-din-vermogens">Vermogen bewerken</span>
                                        </div>
                                        <button
                                          onClick={() => { setExpandedCapability(null); setEffortLinkDropdownForCap(null); }}
                                          className="text-[10px] text-gray-400 hover:text-gray-600 px-2 py-1"
                                        >
                                          Inklappen {"\u25B2"}
                                        </button>
                                      </div>

                                      <div className="p-3 space-y-4">
                                        {/* CapabilityCard */}
                                        <CapabilityCard
                                          capability={cap}
                                          onChange={updateCapability}
                                          onDelete={() => deleteCapability(cap.id)}
                                          onAISuggest={makeCapabilitySuggest(cap)}
                                          sharedWithBenefits={sharedWith}
                                        />

                                        {/* Inspanningen bij dit vermogen */}
                                        <div>
                                          <div className="flex items-center gap-2 mb-2">
                                            <span className="w-1.5 h-4 bg-din-inspanningen rounded-full" />
                                            <span className="text-xs font-semibold text-din-inspanningen">
                                              Inspanningen bij dit vermogen ({capEffortsExpanded.length})
                                            </span>
                                          </div>

                                          {capEffortsExpanded.length === 0 && (
                                            <p className="text-xs text-gray-400 italic ml-4 mb-2">
                                              Nog geen inspanningen. Voeg er een toe per domein.
                                            </p>
                                          )}

                                          <div className="space-y-2">
                                            {capEffortsExpanded.map((effort) => {
                                              const otherCaps = getOtherCapsForEffort(effort.id, cap.id);
                                              return (
                                                <div key={effort.id}>
                                                  {otherCaps.length > 0 && (
                                                    <div className="mb-1 flex items-center gap-1 ml-1">
                                                      <span className="text-[9px] text-gray-400">Ook bij:</span>
                                                      {otherCaps.map((name, i) => (
                                                        <span key={i} className="text-[9px] px-1.5 py-0.5 bg-din-vermogens/10 text-din-vermogens rounded-full truncate max-w-[120px]">
                                                          {name}
                                                        </span>
                                                      ))}
                                                    </div>
                                                  )}
                                                  <div className="flex items-start gap-2">
                                                    <div className="flex-1 min-w-0">
                                                      <EffortCard
                                                        effort={effort}
                                                        onChange={updateEffort}
                                                        onDelete={() => deleteEffort(effort.id)}
                                                        onAISuggest={makeEffortSuggest(effort)}
                                                      />
                                                    </div>
                                                    <button
                                                      onClick={() => unlinkEffortFromCapability(cap.id, effort.id)}
                                                      className="shrink-0 text-[10px] text-gray-300 hover:text-amber-500 mt-3 transition-colors"
                                                      title="Ontkoppel inspanning van dit vermogen"
                                                    >
                                                      {"\u2715"}
                                                    </button>
                                                  </div>
                                                </div>
                                              );
                                            })}
                                          </div>

                                          {/* Inspanning toevoegen per domein */}
                                          <div className="flex items-center gap-2 mt-3 flex-wrap">
                                            <span className="text-[10px] text-gray-400 font-medium">+ Inspanning:</span>
                                            {DOMAINS.map((d) => (
                                              <button
                                                key={d.key}
                                                onClick={() => addEffortForCapability(cap.id, d.key)}
                                                className={`text-[10px] px-2 py-1 rounded-md font-medium transition-colors border ${DOMAIN_EFFORT_BTN[d.key]} text-gray-600`}
                                              >
                                                {d.label}
                                              </button>
                                            ))}
                                          </div>

                                          {/* Bestaande inspanning koppelen */}
                                          {availableEfforts.length > 0 && (
                                            <div className="mt-2">
                                              <button
                                                onClick={() => setEffortLinkDropdownForCap(
                                                  effortLinkDropdownForCap === cap.id ? null : cap.id
                                                )}
                                                className={`text-[10px] px-2.5 py-1 rounded-md font-medium transition-colors ${
                                                  effortLinkDropdownForCap === cap.id
                                                    ? "bg-din-inspanningen text-white"
                                                    : "text-gray-500 bg-gray-50 hover:bg-gray-100"
                                                }`}
                                              >
                                                Bestaande inspanning koppelen {effortLinkDropdownForCap === cap.id ? "\u25B2" : "\u25BC"}
                                              </button>

                                              {effortLinkDropdownForCap === cap.id && (
                                                <div className="mt-2 p-3 bg-white border border-gray-200 rounded-lg shadow-md max-h-48 overflow-y-auto">
                                                  <div className="text-[10px] font-semibold text-gray-500 mb-2">
                                                    Kies een inspanning om te koppelen:
                                                  </div>
                                                  <div className="space-y-1">
                                                    {availableEfforts.map((eff) => (
                                                      <button
                                                        key={eff.id}
                                                        onClick={() => linkEffortToCapability(cap.id, eff.id)}
                                                        className="w-full text-left px-2.5 py-2 text-sm hover:bg-din-inspanningen/10 rounded-md transition-colors flex items-center gap-2"
                                                      >
                                                        <span className={`w-2 h-2 rounded-full ${DOMAIN_DOT_COLORS[eff.domain]}`} />
                                                        <span className="text-gray-700 truncate">{eff.description || "(naamloos)"}</span>
                                                        {eff.quarter && <span className="text-[10px] text-gray-400 shrink-0">{eff.quarter}</span>}
                                                      </button>
                                                    ))}
                                                  </div>
                                                </div>
                                              )}
                                            </div>
                                          )}
                                        </div>
                                      </div>
                                    </div>
                                  );
                                }

                                return (
                                  <CompactCapabilityRow
                                    key={cap.id}
                                    capability={cap}
                                    efforts={capEfforts}
                                    sharedWith={sharedWith}
                                    onExpand={() => setExpandedCapability(cap.id)}
                                    onUnlink={() => unlinkCapabilityFromBenefit(benefit.id, cap.id)}
                                    onDelete={() => deleteCapability(cap.id)}
                                  />
                                );
                              })}
                            </div>

                            {/* Koppeling-acties */}
                            <div className="flex gap-2 mt-2">
                              <button
                                onClick={() => addCapabilityForBenefit(benefit.id)}
                                className="text-[11px] px-2.5 py-1 text-din-vermogens bg-din-vermogens/5 hover:bg-din-vermogens/15 rounded-md font-medium transition-colors"
                              >
                                + Nieuw vermogen
                              </button>
                              {availableCaps.length > 0 && (
                                <button
                                  onClick={() => setLinkDropdownForBenefit(
                                    linkDropdownForBenefit === benefit.id ? null : benefit.id
                                  )}
                                  className={`text-[11px] px-2.5 py-1 rounded-md font-medium transition-colors ${
                                    linkDropdownForBenefit === benefit.id
                                      ? "bg-din-vermogens text-white"
                                      : "text-gray-500 bg-gray-50 hover:bg-gray-100"
                                  }`}
                                >
                                  Bestaand koppelen {linkDropdownForBenefit === benefit.id ? "\u25B2" : "\u25BC"}
                                </button>
                              )}
                            </div>

                            {/* Koppeling dropdown */}
                            {linkDropdownForBenefit === benefit.id && (
                              <div className="mt-2 p-3 bg-white border border-gray-200 rounded-lg shadow-md max-h-48 overflow-y-auto">
                                <div className="text-[11px] font-semibold text-gray-500 mb-2">
                                  Kies een vermogen om te koppelen aan deze baat:
                                </div>
                                <div className="space-y-1">
                                  {availableCaps.map((cap) => (
                                    <button
                                      key={cap.id}
                                      onClick={() => linkCapabilityToBenefit(benefit.id, cap.id)}
                                      className="w-full text-left px-2.5 py-2 text-sm hover:bg-din-vermogens/10 rounded-md transition-colors border border-transparent hover:border-din-vermogens/20"
                                    >
                                      <span className="text-gray-700">{cap.description || "(naamloos)"}</span>
                                      {cap.currentLevel && cap.targetLevel && (
                                        <span className="text-[10px] text-gray-400 ml-2">
                                          {cap.currentLevel}/5 {"\u2192"} {cap.targetLevel}/5
                                        </span>
                                      )}
                                    </button>
                                  ))}
                                </div>
                                {availableCaps.length === 0 && (
                                  <p className="text-xs text-gray-400 italic">
                                    Alle vermogens zijn al gekoppeld aan deze baat.
                                  </p>
                                )}
                              </div>
                            )}
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>

              {/* Niet-gekoppelde items */}
              {(() => {
                const unlinkedCaps = getUnlinkedCapabilities();
                const unlinkedEffs = getUnlinkedEfforts();
                if (unlinkedCaps.length === 0 && unlinkedEffs.length === 0) return null;

                return (
                  <div className="space-y-3">
                    {/* Niet-gekoppelde vermogens */}
                    {unlinkedCaps.length > 0 && (
                      <details className="p-3 bg-amber-50/50 rounded-lg border border-amber-200/50">
                        <summary className="text-xs font-semibold text-amber-700 cursor-pointer select-none">
                          Niet-gekoppelde vermogens ({unlinkedCaps.length})
                          <span className="font-normal text-amber-500 ml-2">
                            Niet aan een baat gekoppeld
                          </span>
                        </summary>
                        <div className="mt-3 space-y-2">
                          {unlinkedCaps.map((c) => (
                            <CapabilityCard
                              key={c.id}
                              capability={c}
                              onChange={updateCapability}
                              onDelete={() => deleteCapability(c.id)}
                              onAISuggest={makeCapabilitySuggest(c)}
                            />
                          ))}
                        </div>
                      </details>
                    )}

                    {/* Niet-gekoppelde inspanningen */}
                    {unlinkedEffs.length > 0 && (
                      <details className="p-3 bg-amber-50/50 rounded-lg border border-amber-200/50">
                        <summary className="text-xs font-semibold text-amber-700 cursor-pointer select-none">
                          Niet-gekoppelde inspanningen ({unlinkedEffs.length})
                          <span className="font-normal text-amber-500 ml-2">
                            Niet aan een vermogen gekoppeld
                          </span>
                        </summary>
                        <div className="mt-3 space-y-2">
                          {unlinkedEffs.map((e) => (
                            <EffortCard
                              key={e.id}
                              effort={e}
                              onChange={updateEffort}
                              onDelete={() => deleteEffort(e.id)}
                              onAISuggest={makeEffortSuggest(e)}
                            />
                          ))}
                        </div>
                      </details>
                    )}
                  </div>
                );
              })()}

              {/* Externe projecten buiten het programma */}
              <ExterneProjectenPanel
                currentSector={activeSector}
                projects={(session.externalProjects || []).filter((p) => p.sectorId === activeSector)}
                onAdd={() => {
                  const newProject: ExternalProject = {
                    id: generateId(),
                    sectorId: activeSector,
                    name: "",
                    description: "",
                    status: "in_uitvoering",
                  };
                  updateSession({
                    externalProjects: [...(session.externalProjects || []), newProject],
                  });
                }}
                onUpdate={(updated) => {
                  updateSession({
                    externalProjects: (session.externalProjects || []).map((p) =>
                      p.id === updated.id ? updated : p
                    ),
                  });
                }}
                onDelete={(id) => {
                  updateSession({
                    externalProjects: (session.externalProjects || []).filter((p) => p.id !== id),
                  });
                }}
              />
            </div>
          </div>
        </>
      )}

      {/* Integratie-advies slide-out panel */}
      {showAdviesPanel && (
        <div className="fixed inset-0 z-50 flex justify-end">
          <div
            className="absolute inset-0 bg-black/30"
            onClick={() => setShowAdviesPanel(false)}
          />
          <div className="relative w-full max-w-lg bg-white shadow-xl overflow-y-auto animate-slide-in-right">
            <div className="sticky top-0 bg-white border-b border-gray-200 px-5 py-4 flex items-center justify-between z-10">
              <div>
                <h3 className="text-base font-semibold text-cito-blue">
                  Integratie-advies: {activeSector}
                </h3>
                <p className="text-xs text-gray-500 mt-0.5">
                  Hoe past het DIN-netwerk in het sectorplan?
                </p>
              </div>
              <button
                onClick={() => setShowAdviesPanel(false)}
                className="p-1 text-gray-400 hover:text-gray-600 text-lg"
              >
                {"\u2715"}
              </button>
            </div>
            <div className="p-5 space-y-3">
              {integratieAdvies[activeSector] ? (
                typeof integratieAdvies[activeSector] === "string" ? (
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
                )
              ) : (
                <div className="text-center py-8 text-gray-400 text-sm">
                  Klik &ldquo;Integratie-advies&rdquo; om AI-analyse te genereren.
                </div>
              )}

              {/* Vervolgactie: Verwerk in sectorplan */}
              {integratieAdvies[activeSector] && (
                <div className="border-t border-gray-200 pt-4 mt-4">
                  <div className="p-4 bg-cito-blue/5 border border-cito-blue/15 rounded-lg">
                    <div className="flex items-start gap-3 mb-3">
                      <svg className="w-5 h-5 text-cito-blue shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                      </svg>
                      <div>
                        <h4 className="text-sm font-semibold text-cito-blue">
                          Verwerk in sectorplan
                        </h4>
                        <p className="text-xs text-gray-500 mt-1 leading-relaxed">
                          Het oorspronkelijke sectorplan blijft volledig behouden. Er wordt een nieuw hoofdstuk &ldquo;Programma Klant in Beeld&rdquo; aan toegevoegd met de programmadoelen, DIN-baten, vermogens en inspanningen.
                        </p>
                      </div>
                    </div>
                    <button
                      onClick={handleGenerateVerrijktPlan}
                      disabled={isGeneratingPlan}
                      className="w-full px-4 py-3 bg-cito-blue text-white rounded-lg text-sm font-medium hover:bg-cito-blue-light disabled:opacity-50 flex items-center justify-center gap-2 transition-colors"
                    >
                      {isGeneratingPlan ? (
                        <>
                          <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                          Sectorplan wordt bijgewerkt...
                        </>
                      ) : (
                        <>
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                          </svg>
                          Genereer bijgewerkt sectorplan
                        </>
                      )}
                    </button>
                  </div>
                </div>
              )}

              {/* Bijgewerkt sectorplan resultaat */}
              {verrijktSectorplan[activeSector] && (
                <div className="border-t border-gray-200 pt-4 mt-4">
                  <div className="flex items-center justify-between mb-3">
                    <h4 className="text-sm font-semibold text-cito-blue">
                      Bijgewerkt sectorplan: {activeSector}
                    </h4>
                    <button
                      onClick={() =>
                        setVerrijktSectorplan((prev) => {
                          const next = { ...prev };
                          delete next[activeSector];
                          return next;
                        })
                      }
                      className="text-xs text-gray-400 hover:text-gray-600"
                    >
                      Sluiten
                    </button>
                  </div>
                  <div className="bg-white p-5 rounded-lg border border-gray-200 max-h-[60vh] overflow-y-auto">
                    <MarkdownContent content={verrijktSectorplan[activeSector]} />
                  </div>

                  {/* Download als Word */}
                  <button
                    onClick={async () => {
                      const blob = await generateVerrijktSectorplanDocument(
                        activeSector,
                        verrijktSectorplan[activeSector],
                        session.name
                      );
                      const url = URL.createObjectURL(blob);
                      const a = document.createElement("a");
                      a.href = url;
                      a.download = `Sectorplan-${activeSector}-KiB-${new Date().toISOString().slice(0, 10)}.docx`;
                      a.click();
                      URL.revokeObjectURL(url);
                    }}
                    className="w-full mt-3 px-4 py-3 bg-cito-blue text-white rounded-lg text-sm font-medium hover:bg-cito-blue-light flex items-center justify-center gap-2 transition-colors"
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                    </svg>
                    Download als Word (.docx)
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
