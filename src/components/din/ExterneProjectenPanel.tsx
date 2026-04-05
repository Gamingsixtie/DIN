"use client";

import { useState } from "react";
import type {
  ExternalProject,
  DINCapability,
  EffortDomain,
  EffortStatus,
  SectorName,
  ProjectCapabilityMap,
} from "@/lib/types";
import { DOMAIN_LABELS, STATUS_LABELS, STATUS_STYLES } from "@/lib/types";
import { generateId, undoProjectPromotion } from "@/lib/din-service";
import { useSession } from "@/lib/session-context";
import { useToast } from "@/components/ui/Toast";
import AIKoppelingPanel from "@/components/din/AIKoppelingPanel";
import ProjectPromotiePanel from "@/components/din/ProjectPromotiePanel";

// --- Types ---

interface ExterneProjectenPanelProps {
  currentSector: SectorName;
  projects: ExternalProject[];
  /**
   * Phase 14: projecten die al gepromoveerd zijn (promotedAt gezet).
   * Apart doorgegeven zodat de `projects` prop uitsluitend actieve projecten
   * bevat (defense-in-depth Pitfall 5) terwijl de "Toon gepromoveerde"
   * toggle alsnog de volledige audit-lijst kan tonen.
   */
  promotedProjects?: ExternalProject[];
  onAddProjects: (projects: ExternalProject[]) => void;
  onUpdate: (updated: ExternalProject) => void;
  onDelete: (id: string) => void;
  capabilities: DINCapability[];
  existingMaps: ProjectCapabilityMap[];
  onConfirmMappings: (maps: ProjectCapabilityMap[]) => void;
}

interface ReviewProject {
  tempId: string;
  name: string;
  description: string;
  status: EffortStatus;
  domains: EffortDomain[];
  aiWarning?: string;
  confirmed: boolean;
}

// --- Constants ---

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

const DOMAIN_BORDER_COLORS: Record<EffortDomain, string> = {
  mens: "#2563eb",
  processen: "#059669",
  data_systemen: "#7c3aed",
  cultuur: "#d97706",
};

const STATUS_OPTIONS: { key: EffortStatus; label: string; color: string }[] = (
  Object.entries(STATUS_LABELS) as [EffortStatus, string][]
).map(([key, label]) => ({ key, label, color: STATUS_STYLES[key] }));

// --- Component ---

export default function ExterneProjectenPanel({
  currentSector,
  projects,
  promotedProjects: promotedProjectsProp,
  onAddProjects,
  onUpdate,
  onDelete,
  capabilities,
  existingMaps,
  onConfirmMappings,
}: ExterneProjectenPanelProps) {
  const [open, setOpen] = useState(projects.length > 0);
  const [activeTab, setActiveTab] = useState<"text" | "upload">("text");
  const [importText, setImportText] = useState("");
  const [importFile, setImportFile] = useState<File | null>(null);
  const [isParsing, setIsParsing] = useState(false);
  const [parseError, setParseError] = useState<string | null>(null);
  const [parseSuccess, setParseSuccess] = useState<string | null>(null);
  const [reviewProjects, setReviewProjects] = useState<ReviewProject[]>([]);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [showPromoted, setShowPromoted] = useState(false);
  const [activePromotionProjectId, setActivePromotionProjectId] = useState<
    string | null
  >(null);

  const { updateSession } = useSession();
  const { addToast } = useToast();

  // Separate in-scope, buiten-scope, and gepromoveerde projecten (Phase 14 D-08).
  // Pitfall 5 defense-in-depth: promotedProjects kunnen via aparte prop
  // doorgegeven worden; als fallback (en als veiligheid) filteren we ook
  // intern op !p.promotedAt zodat gepromoveerde projecten nooit in de
  // actieve lijst belanden.
  const inScopeProjects = projects.filter(
    (p) => !p.buitenScope && !p.promotedAt
  );
  const buitenScopeProjects = projects.filter((p) => p.buitenScope);
  const promotedProjects = (
    promotedProjectsProp ?? projects.filter((p) => p.promotedAt)
  )
    .slice()
    .sort((a, b) => (b.promotedAt || "").localeCompare(a.promotedAt || ""));

  function handleUndoPromotion(project: ExternalProject) {
    const n = (project.promotedToEffortIds || []).length;
    const confirmed = window.confirm(
      `Promotie terugdraaien?\n\nDit verwijdert de ${n} inspanningen die uit dit project zijn afgeleid en herstelt de project \u2192 vermogen koppelingen. Bevindingen die al zijn toegevoegd aan de DIN-keten blijven bestaan.`
    );
    if (!confirmed) return;
    updateSession((prev) => undoProjectPromotion(prev, project.id));
    addToast(
      "Promotie teruggedraaid. Project staat weer in de actieve lijst.",
      "success"
    );
  }

  // --- Import flow ---

  async function handleParseImport() {
    setIsParsing(true);
    setParseError(null);
    setParseSuccess(null);

    try {
      let rawText = "";

      if (activeTab === "upload" && importFile) {
        // Vercel serverless functions hebben een harde 4.5MB body limit.
        // Check client-side om een duidelijke melding te geven.
        const MAX_SIZE = 4 * 1024 * 1024; // 4 MB marge onder Vercel limit
        if (importFile.size > MAX_SIZE) {
          throw new Error(
            `Dit bestand is ${(importFile.size / 1024 / 1024).toFixed(1)} MB en overschrijdt de maximale uploadgrootte van 4 MB. ` +
              `Exporteer de PDF in lagere resolutie, splits het document, of kopieer de tekst en gebruik het tabblad "Tekst plakken".`
          );
        }

        // Step 1: Parse document via /api/parse-projects
        const formData = new FormData();
        formData.append("file", importFile);
        const parseRes = await fetch("/api/parse-projects", {
          method: "POST",
          body: formData,
        });
        // Robuuste error-handling: response is niet altijd JSON
        // (bijv. Vercel's plain-text 413 "Request Entity Too Large").
        const parseText = await parseRes.text();
        let parseData: { success?: boolean; error?: string; data?: { rawText: string } };
        try {
          parseData = JSON.parse(parseText);
        } catch {
          if (parseRes.status === 413 || /request entity too large/i.test(parseText)) {
            throw new Error(
              "Het bestand is te groot voor upload (limiet 4 MB). " +
                'Splits het document of gebruik het tabblad "Tekst plakken".'
            );
          }
          throw new Error(
            `Het bestand kon niet worden verwerkt (status ${parseRes.status}). ${parseText.slice(0, 120)}`
          );
        }
        if (!parseRes.ok || !parseData.success) {
          throw new Error(
            parseData.error ||
              "Het bestand kon niet worden verwerkt. Gebruik een .docx, .txt of .pdf bestand."
          );
        }
        rawText = parseData.data!.rawText;
      } else if (activeTab === "text" && importText.trim()) {
        rawText = importText.trim();
      } else {
        setParseError("Plak tekst of upload een document om te analyseren.");
        setIsParsing(false);
        return;
      }

      // Step 2: Extract projects via /api/extract-projects
      const extractRes = await fetch("/api/extract-projects", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ rawText, sectorName: currentSector }),
      });
      const extractData = await extractRes.json();
      if (!extractRes.ok || !extractData.success) {
        throw new Error(
          extractData.error ||
            "Het analyseren van de tekst is mislukt. Controleer of de tekst projectbeschrijvingen bevat en probeer het opnieuw."
        );
      }

      const extracted: ReviewProject[] = (extractData.data.projects || []).map(
        (p: { name: string; description: string; status?: EffortStatus; domains?: EffortDomain[]; aiWarning?: string }) => ({
          tempId: crypto.randomUUID(),
          name: p.name,
          description: p.description,
          status: p.status || "in_uitvoering",
          domains: p.domains || [],
          aiWarning: p.aiWarning,
          confirmed: false,
        })
      );

      setReviewProjects(extracted);
      setParseSuccess(`${extracted.length} projecten gevonden en klaar voor review.`);
    } catch (err) {
      setParseError(
        err instanceof Error
          ? err.message
          : "Het analyseren van de tekst is mislukt. Controleer of de tekst projectbeschrijvingen bevat en probeer het opnieuw."
      );
    } finally {
      setIsParsing(false);
    }
  }

  // --- Review actions ---

  function confirmProject(tempId: string) {
    setReviewProjects((prev) =>
      prev.map((p) => (p.tempId === tempId ? { ...p, confirmed: true } : p))
    );
  }

  function confirmAll() {
    setReviewProjects((prev) => prev.map((p) => ({ ...p, confirmed: true })));
  }

  function removeReviewProject(tempId: string) {
    setReviewProjects((prev) => prev.filter((p) => p.tempId !== tempId));
  }

  function updateReviewProject(tempId: string, updates: Partial<ReviewProject>) {
    setReviewProjects((prev) =>
      prev.map((p) => (p.tempId === tempId ? { ...p, ...updates } : p))
    );
  }

  function toggleReviewDomain(tempId: string, domain: EffortDomain) {
    setReviewProjects((prev) =>
      prev.map((p) => {
        if (p.tempId !== tempId) return p;
        const has = p.domains.includes(domain);
        return {
          ...p,
          domains: has
            ? p.domains.filter((d) => d !== domain)
            : [...p.domains, domain],
        };
      })
    );
  }

  function saveConfirmedProjects() {
    const confirmed = reviewProjects.filter((p) => p.confirmed);
    if (confirmed.length === 0) return;

    const newProjects: ExternalProject[] = confirmed.map((p) => ({
      id: generateId(),
      sectorId: currentSector,
      name: p.name,
      description: p.description,
      status: p.status,
      domains: p.domains,
      linkedCapabilityIds: [],
      aiWarning: p.aiWarning,
      buitenScope: false,
    }));

    onAddProjects(newProjects);
    setReviewProjects([]);
    setParseSuccess(null);
    setImportText("");
    setImportFile(null);
  }

  // Save when all are confirmed
  const allConfirmed =
    reviewProjects.length > 0 && reviewProjects.every((p) => p.confirmed);
  if (allConfirmed && reviewProjects.length > 0) {
    // Auto-save confirmed projects on next render
    setTimeout(() => saveConfirmedProjects(), 0);
  }

  // --- Existing project edit helpers ---

  function cycleStatus(project: ExternalProject) {
    const order: EffortStatus[] = [
      "gepland",
      "in_uitvoering",
      "afgerond",
      "on_hold",
    ];
    const idx = order.indexOf(project.status);
    const next = order[(idx + 1) % order.length];
    onUpdate({ ...project, status: next });
  }

  function getLeftBorderColor(project: ExternalProject | ReviewProject): string {
    const domains = "domains" in project ? project.domains : [];
    if (!domains || domains.length === 0) return "#d1d5db";
    return DOMAIN_BORDER_COLORS[domains[0]] || "#d1d5db";
  }

  // --- Render ---

  return (
    <div className="border border-gray-200 rounded-lg bg-gray-50/50 overflow-hidden">
      {/* Collapsible header */}
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
        <span className="text-xs text-gray-400">
          {open ? "\u25B2" : "\u25BC"}
        </span>
      </button>

      {open && (
        <div className="px-4 pb-4 space-y-4">
          <p className="text-xs text-gray-400">
            Lopende projecten bij {currentSector} die passen bij het programma.
            Importeer uit tekst of document.
          </p>

          {/* === Import Panel === */}
          <div className="space-y-3">
            {/* Tab bar */}
            <div className="flex gap-4 border-b border-gray-200">
              <button
                onClick={() => setActiveTab("text")}
                className={`pb-2 text-sm font-semibold ${
                  activeTab === "text"
                    ? "border-b-2 border-cito-blue text-cito-blue"
                    : "text-gray-500"
                }`}
              >
                Tekst plakken
              </button>
              <button
                onClick={() => setActiveTab("upload")}
                className={`pb-2 text-sm font-semibold ${
                  activeTab === "upload"
                    ? "border-b-2 border-cito-blue text-cito-blue"
                    : "text-gray-500"
                }`}
              >
                Document uploaden
              </button>
            </div>

            {/* Tab content */}
            {activeTab === "text" ? (
              <textarea
                value={importText}
                onChange={(e) => setImportText(e.target.value)}
                placeholder="Plak hier de klantreis-informatie, projectbeschrijvingen of Miro-export..."
                className="w-full px-3 py-3 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-1 focus:ring-cito-blue resize-y"
                style={{ minHeight: "160px" }}
              />
            ) : (
              <label
                className={`block ${isParsing ? "pointer-events-none opacity-60" : "cursor-pointer"}`}
              >
                <div className="flex flex-col items-center justify-center gap-2 px-6 py-8 border-2 border-dashed border-gray-300 rounded-lg hover:border-cito-blue hover:bg-blue-50/50 transition-colors">
                  {isParsing ? (
                    <div className="w-8 h-8 border-2 border-cito-blue border-t-transparent rounded-full animate-spin" />
                  ) : (
                    <svg
                      className="w-8 h-8 text-gray-400"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={1.5}
                        d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12"
                      />
                    </svg>
                  )}
                  <span className="text-sm text-gray-600">
                    {importFile
                      ? importFile.name
                      : "Upload projectdocument"}
                  </span>
                  <span className="text-xs text-gray-400">
                    .docx, .txt of .pdf
                  </span>
                </div>
                <input
                  type="file"
                  accept=".docx,.txt,.pdf"
                  className="hidden"
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    if (file) setImportFile(file);
                  }}
                />
              </label>
            )}

            {/* Parse button */}
            <button
              onClick={handleParseImport}
              disabled={
                isParsing ||
                (activeTab === "text" ? !importText.trim() : !importFile)
              }
              className="px-4 py-2 bg-cito-blue text-white text-sm font-semibold rounded-lg hover:bg-cito-blue-light disabled:opacity-50 flex items-center gap-2"
            >
              {isParsing ? (
                <>
                  <span className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  Bezig met analyseren...
                </>
              ) : (
                "Analyseer met AI"
              )}
            </button>

            {/* Feedback bars */}
            {parseError && (
              <div className="bg-red-100 text-red-700 rounded p-2 text-xs">
                {parseError}
              </div>
            )}
            {parseSuccess && (
              <div className="bg-green-100 text-green-700 rounded p-2 text-xs">
                {parseSuccess}
              </div>
            )}
          </div>

          {/* === Review Cards === */}
          {reviewProjects.length > 0 && (
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-gray-600">
                  Review ({reviewProjects.filter((p) => p.confirmed).length}/
                  {reviewProjects.length} bevestigd)
                </span>
                <button
                  onClick={confirmAll}
                  className="px-3 py-2 bg-cito-blue text-white text-xs rounded hover:bg-cito-blue-light"
                >
                  Alles bevestigen
                </button>
              </div>

              {reviewProjects.map((rp) => (
                <div
                  key={rp.tempId}
                  className={`group p-4 bg-white border rounded-lg ${
                    rp.confirmed
                      ? "border-green-200 bg-green-50/30"
                      : rp.aiWarning
                        ? "border-gray-200"
                        : "border-gray-200"
                  }`}
                  style={{
                    borderLeftWidth: "3px",
                    borderLeftColor: rp.aiWarning
                      ? "#f59e0b"
                      : getLeftBorderColor(rp),
                  }}
                >
                  {/* Top row: name + warning badge + actions */}
                  <div className="flex items-start gap-2">
                    <div className="flex-1 min-w-0">
                      <input
                        type="text"
                        value={rp.name}
                        onChange={(e) =>
                          updateReviewProject(rp.tempId, {
                            name: e.target.value,
                          })
                        }
                        placeholder="Projectnaam"
                        className="w-full text-sm font-semibold text-gray-800 bg-transparent border-none outline-none focus:ring-0 p-0"
                      />
                      <textarea
                        value={rp.description}
                        onChange={(e) =>
                          updateReviewProject(rp.tempId, {
                            description: e.target.value,
                          })
                        }
                        placeholder="Beschrijving..."
                        className="w-full text-xs text-gray-600 mt-1 bg-transparent border-none outline-none focus:ring-0 p-0 resize-none"
                        rows={2}
                      />
                    </div>

                    {/* Warning badge */}
                    {rp.aiWarning && <WarningBadge warning={rp.aiWarning} />}

                    {/* Confirm / checkmark */}
                    {rp.confirmed ? (
                      <span className="text-green-600 shrink-0" title="Bevestigd">
                        {"\u2713"}
                      </span>
                    ) : (
                      <button
                        onClick={() => confirmProject(rp.tempId)}
                        className="text-xs text-cito-blue hover:underline shrink-0"
                      >
                        Project bevestigen
                      </button>
                    )}
                  </div>

                  {/* Status + domain row */}
                  <div className="flex flex-wrap items-center gap-2 mt-2">
                    <select
                      value={rp.status}
                      onChange={(e) =>
                        updateReviewProject(rp.tempId, {
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

                    {/* Domain checkboxes */}
                    {DOMAINS.map((d) => {
                      const checked = rp.domains.includes(d.key);
                      return (
                        <button
                          key={d.key}
                          onClick={() =>
                            toggleReviewDomain(rp.tempId, d.key)
                          }
                          className={`px-2 py-1 text-xs rounded-full border cursor-pointer ${
                            checked
                              ? DOMAIN_CHIP_CHECKED[d.key]
                              : "border-gray-300 text-gray-500 bg-white hover:border-gray-400"
                          }`}
                        >
                          {d.label}
                        </button>
                      );
                    })}
                  </div>

                  {/* Bottom actions */}
                  <div className="flex items-center gap-3 mt-2">
                    {rp.aiWarning && !rp.confirmed && (
                      <button
                        onClick={() => removeReviewProject(rp.tempId)}
                        className="text-xs text-amber-600 hover:text-amber-800 underline"
                      >
                        Buiten scope
                      </button>
                    )}
                    <button
                      onClick={() => removeReviewProject(rp.tempId)}
                      className="text-xs text-red-400 hover:text-red-600 opacity-0 group-hover:opacity-100"
                    >
                      Verwijderen
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* === Existing project list === */}
          {inScopeProjects.length > 0 && (
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-gray-500">
                  Bevestigde projecten ({inScopeProjects.length})
                </span>
                {promotedProjects.length > 0 && (
                  <button
                    type="button"
                    onClick={() => setShowPromoted((v) => !v)}
                    className="text-xs text-gray-600 hover:text-cito-blue underline"
                  >
                    {showPromoted
                      ? "Verberg gepromoveerde projecten"
                      : `Toon gepromoveerde projecten (${promotedProjects.length})`}
                  </button>
                )}
              </div>
              {inScopeProjects.map((p) => (
                <div key={p.id}>
                  <ExistingProjectCard
                    project={p}
                    isEditing={editingId === p.id}
                    onStartEdit={() => setEditingId(p.id)}
                    onStopEdit={() => setEditingId(null)}
                    onUpdate={onUpdate}
                    onDelete={onDelete}
                    cycleStatus={cycleStatus}
                    onRequestPromotion={() =>
                      setActivePromotionProjectId(p.id)
                    }
                    isPromotionActive={activePromotionProjectId === p.id}
                  />
                  {activePromotionProjectId === p.id && (
                    <ProjectPromotiePanel
                      project={p}
                      open={true}
                      onClose={() => setActivePromotionProjectId(null)}
                    />
                  )}
                </div>
              ))}
            </div>
          )}

          {/* AI Koppeling Panel — match projects to capabilities */}
          {inScopeProjects.length > 0 && (
            <AIKoppelingPanel
              projects={inScopeProjects}
              capabilities={capabilities}
              sectorName={currentSector}
              existingMaps={existingMaps}
              onConfirmMappings={onConfirmMappings}
            />
          )}

          {/* Edge case: toggle-knop tonen als er alleen gepromoveerde projecten zijn */}
          {inScopeProjects.length === 0 && promotedProjects.length > 0 && (
            <div className="flex items-center justify-end">
              <button
                type="button"
                onClick={() => setShowPromoted((v) => !v)}
                className="text-xs text-gray-600 hover:text-cito-blue underline"
              >
                {showPromoted
                  ? "Verberg gepromoveerde projecten"
                  : `Toon gepromoveerde projecten (${promotedProjects.length})`}
              </button>
            </div>
          )}

          {/* Gepromoveerde projecten (Phase 14 D-08) — alleen zichtbaar bij toggle */}
          {showPromoted && (
            <div className="space-y-2 mt-2">
              <span className="text-xs font-semibold text-gray-400">
                Gepromoveerde projecten ({promotedProjects.length})
              </span>
              {promotedProjects.length === 0 ? (
                <div className="text-center py-4 bg-gray-50 border border-gray-200 rounded-lg">
                  <p className="text-sm font-medium text-gray-500">
                    Nog geen gepromoveerde projecten
                  </p>
                  <p className="text-xs text-gray-400 mt-1">
                    Zodra je een lopend project promoveert, verschijnt het
                    hier voor audit en terugdraaien.
                  </p>
                </div>
              ) : (
                promotedProjects.map((p) => (
                  <div
                    key={`promoted-${p.id}`}
                    className="group p-3 bg-gray-50 border border-gray-200 rounded-lg opacity-60 relative"
                  >
                    <div className="absolute top-2 right-2">
                      <span className="bg-green-100 text-green-700 text-xs font-semibold px-2 py-1 rounded">
                        Gepromoveerd
                      </span>
                    </div>
                    <div className="pr-24">
                      <div className="text-sm font-medium text-gray-700">
                        {p.name || "(naamloos project)"}
                      </div>
                      {p.description && (
                        <div className="text-xs text-gray-500 mt-0.5 line-clamp-2">
                          {p.description}
                        </div>
                      )}
                      <div className="text-[10px] text-gray-400 mt-1">
                        Gepromoveerd naar{" "}
                        {(p.promotedToEffortIds || []).length} inspanning(en)
                      </div>
                    </div>
                    <div className="mt-2">
                      <button
                        type="button"
                        onClick={() => handleUndoPromotion(p)}
                        className="text-sm text-red-600 hover:text-red-700 underline"
                      >
                        Promotie terugdraaien
                      </button>
                    </div>
                  </div>
                ))
              )}
            </div>
          )}

          {/* Buiten scope projects (dimmed at bottom) */}
          {buitenScopeProjects.length > 0 && (
            <div className="space-y-2 mt-2">
              <span className="text-xs font-semibold text-gray-400">
                Buiten scope ({buitenScopeProjects.length})
              </span>
              {buitenScopeProjects.map((p) => (
                <div
                  key={p.id}
                  className="group p-3 bg-gray-50 border border-gray-200 rounded-lg opacity-50"
                >
                  <div className="flex items-start gap-2">
                    <div className="flex-1 min-w-0">
                      <div className="text-sm font-medium text-gray-500 line-through truncate">
                        {p.name || "(naamloos project)"}
                      </div>
                      {p.description && (
                        <div className="text-xs text-gray-400 mt-0.5 line-clamp-2">
                          {p.description}
                        </div>
                      )}
                    </div>
                    <button
                      onClick={() =>
                        onUpdate({ ...p, buitenScope: false })
                      }
                      className="text-xs text-amber-600 hover:text-amber-800 underline shrink-0"
                    >
                      Terug in scope
                    </button>
                    <button
                      onClick={() => onDelete(p.id)}
                      className="opacity-0 group-hover:opacity-100 text-red-400 hover:text-red-600 shrink-0 text-xs"
                      title="Verwijderen"
                    >
                      {"\u2715"}
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Empty state */}
          {projects.length === 0 && reviewProjects.length === 0 && (
            <div className="text-center py-4">
              <p className="text-sm font-medium text-gray-500">
                Nog geen lopende projecten
              </p>
              <p className="text-xs text-gray-400 mt-1">
                Voeg lopende projecten toe door tekst te plakken of een document
                te uploaden. De AI extraheert automatisch projectnamen en
                beschrijvingen.
              </p>
            </div>
          )}

          {/* Manual add link */}
          <button
            onClick={() => {
              onAddProjects([
                {
                  id: generateId(),
                  sectorId: currentSector,
                  name: "",
                  description: "",
                  status: "in_uitvoering",
                  domains: [],
                  linkedCapabilityIds: [],
                  buitenScope: false,
                },
              ]);
            }}
            className="text-xs text-cito-blue hover:underline"
          >
            + Project toevoegen
          </button>
        </div>
      )}
    </div>
  );
}

// --- Sub-components ---

function WarningBadge({ warning }: { warning: string }) {
  const [expanded, setExpanded] = useState(false);

  return (
    <div className="relative shrink-0">
      <button
        onClick={() => setExpanded(!expanded)}
        className="px-2 py-1 text-xs font-medium bg-amber-100 text-amber-700 rounded-full flex items-center gap-1"
      >
        <svg
          className="w-3 h-3"
          fill="currentColor"
          viewBox="0 0 20 20"
        >
          <path
            fillRule="evenodd"
            d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z"
            clipRule="evenodd"
          />
        </svg>
        Pas niet goed
      </button>
      {expanded && (
        <div className="absolute top-full right-0 mt-1 z-10 text-xs text-amber-600 bg-amber-50 p-2 rounded border border-amber-200 shadow-sm max-w-xs">
          {warning}
        </div>
      )}
    </div>
  );
}

function ExistingProjectCard({
  project,
  isEditing,
  onStartEdit,
  onStopEdit,
  onUpdate,
  onDelete,
  cycleStatus,
  onRequestPromotion,
  isPromotionActive,
}: {
  project: ExternalProject;
  isEditing: boolean;
  onStartEdit: () => void;
  onStopEdit: () => void;
  onUpdate: (updated: ExternalProject) => void;
  onDelete: (id: string) => void;
  cycleStatus: (project: ExternalProject) => void;
  onRequestPromotion: () => void;
  isPromotionActive: boolean;
}) {
  const statusOpt = STATUS_OPTIONS.find((s) => s.key === project.status);

  function toggleDomain(domain: EffortDomain) {
    const domains = project.domains || [];
    const has = domains.includes(domain);
    onUpdate({
      ...project,
      domains: has ? domains.filter((d) => d !== domain) : [...domains, domain],
    });
  }

  return (
    <div
      className="group p-3 bg-white border border-gray-200 rounded-lg"
      style={{
        borderLeftWidth: "3px",
        borderLeftColor:
          project.aiWarning
            ? "#f59e0b"
            : project.domains && project.domains.length > 0
              ? DOMAIN_BORDER_COLORS[project.domains[0]]
              : "#d1d5db",
      }}
    >
      {isEditing ? (
        <div className="space-y-2">
          <input
            type="text"
            defaultValue={project.name}
            autoFocus
            placeholder="Projectnaam"
            className="w-full px-2 py-1.5 text-sm border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-cito-blue"
            onBlur={(ev) => {
              if (ev.target.value.trim() !== project.name) {
                onUpdate({ ...project, name: ev.target.value.trim() });
              }
            }}
            onKeyDown={(ev) => {
              if (ev.key === "Enter") ev.currentTarget.blur();
            }}
          />
          <textarea
            defaultValue={project.description}
            placeholder="Korte beschrijving van het project..."
            className="w-full px-2 py-1.5 text-xs border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-cito-blue resize-y h-16"
            onBlur={(ev) => {
              if (ev.target.value.trim() !== project.description) {
                onUpdate({ ...project, description: ev.target.value.trim() });
              }
            }}
          />
          <input
            type="text"
            defaultValue={project.relevance || ""}
            placeholder="Waarom relevant voor het programma?"
            className="w-full px-2 py-1.5 text-xs border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-cito-blue"
            onBlur={(ev) => {
              if (ev.target.value.trim() !== (project.relevance || "")) {
                onUpdate({ ...project, relevance: ev.target.value.trim() });
              }
            }}
          />
          <div className="flex items-center gap-2">
            <select
              defaultValue={project.status}
              className="text-xs px-2 py-1 border border-gray-300 rounded focus:outline-none"
              onChange={(ev) => {
                onUpdate({
                  ...project,
                  status: ev.target.value as EffortStatus,
                });
              }}
            >
              {STATUS_OPTIONS.map((s) => (
                <option key={s.key} value={s.key}>
                  {s.label}
                </option>
              ))}
            </select>
            <button
              onClick={onStopEdit}
              className="text-xs text-cito-blue hover:underline ml-auto"
            >
              Klaar
            </button>
          </div>
        </div>
      ) : (
        <>
          <div className="flex items-start gap-2">
            <button
              onClick={() => cycleStatus(project)}
              title={`Status: ${statusOpt?.label}`}
              className={`shrink-0 text-[10px] px-1.5 py-0.5 rounded mt-0.5 ${
                statusOpt?.color || "bg-gray-100 text-gray-600"
              }`}
            >
              {statusOpt?.label}
            </button>
            <div
              className="flex-1 cursor-pointer hover:text-cito-blue min-w-0"
              onClick={onStartEdit}
              title="Klik om te bewerken"
            >
              <div className="text-sm font-medium text-gray-700 truncate">
                {project.name || "(naamloos project)"}
              </div>
              {project.description && (
                <div className="text-xs text-gray-500 mt-0.5 line-clamp-2">
                  {project.description}
                </div>
              )}
              {project.relevance && (
                <div className="text-[10px] text-cito-blue mt-1 italic">
                  Relevantie: {project.relevance}
                </div>
              )}
            </div>

            {/* Warning badge + buiten scope toggle */}
            {project.aiWarning && (
              <div className="flex items-center gap-1 shrink-0">
                <WarningBadge warning={project.aiWarning} />
                <button
                  onClick={() =>
                    onUpdate({ ...project, buitenScope: true })
                  }
                  className="text-xs text-amber-600 hover:text-amber-800 underline ml-1"
                >
                  Buiten scope
                </button>
              </div>
            )}

            <button
              onClick={() => onDelete(project.id)}
              className="opacity-0 group-hover:opacity-100 text-red-400 hover:text-red-600 shrink-0 text-xs mt-0.5"
              title="Verwijderen"
            >
              {"\u2715"}
            </button>
          </div>

          {/* Domain chips */}
          {project.domains && project.domains.length > 0 && (
            <div className="flex flex-wrap gap-1 mt-2">
              {project.domains.map((d) => (
                <span
                  key={d}
                  className={`px-2 py-0.5 text-xs rounded-full border ${DOMAIN_CHIP_CHECKED[d]}`}
                >
                  {DOMAIN_LABELS[d]}
                </span>
              ))}
            </div>
          )}

          {/* Editable domain chips on click */}
          <div className="flex flex-wrap gap-1 mt-1">
            {DOMAINS.filter(
              (d) => !(project.domains || []).includes(d.key)
            ).map((d) => (
              <button
                key={d.key}
                onClick={() => toggleDomain(d.key)}
                className="px-2 py-0.5 text-xs rounded-full border border-gray-300 text-gray-400 bg-white hover:border-gray-400 opacity-0 group-hover:opacity-100 transition-opacity"
                title={`${d.label} toevoegen`}
              >
                + {d.label}
              </button>
            ))}
          </div>

          {/* Promotion action row (Phase 14) */}
          <div className="flex items-center justify-end mt-2 pt-2 border-t border-gray-100">
            <button
              type="button"
              disabled={!project.description || isPromotionActive}
              title={
                !project.description
                  ? "Voeg eerst een projectbeschrijving toe."
                  : isPromotionActive
                    ? "Promotie-panel is al geopend."
                    : undefined
              }
              onClick={onRequestPromotion}
              className="px-3 py-2 text-sm font-semibold bg-cito-blue text-white rounded hover:bg-cito-blue/90 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Promoveer naar inspanningen
            </button>
          </div>
        </>
      )}
    </div>
  );
}
