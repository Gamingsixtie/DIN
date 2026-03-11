"use client";

import { useState } from "react";
import type { DINEffort, EffortDomain, InspanningsDossier } from "@/lib/types";

interface EffortSuggestion {
  feedback?: string;
  description: string;
  quarter: string;
  eigenaar?: string;
  inspanningsleider?: string;
  verwachtResultaat?: string;
  kostenraming?: string;
  randvoorwaarden?: string;
}

type AanscherpVeld = "alles" | "beschrijving" | "planning" | "dossier";

const VELD_LABELS: Record<AanscherpVeld, string> = {
  alles: "Alles",
  beschrijving: "Beschrijving",
  planning: "Planning",
  dossier: "Dossier",
};

interface EffortCardProps {
  effort: DINEffort;
  onChange: (updated: DINEffort) => void;
  onDelete: () => void;
  onAISuggest?: (userPrompt?: string) => Promise<EffortSuggestion | null>;
}

const DOMAIN_COLORS: Record<EffortDomain, { bg: string; text: string }> = {
  mens: { bg: "bg-domain-mens/10", text: "text-domain-mens" },
  processen: { bg: "bg-domain-processen/10", text: "text-domain-processen" },
  data_systemen: { bg: "bg-domain-data/10", text: "text-domain-data" },
  cultuur: { bg: "bg-domain-cultuur/10", text: "text-domain-cultuur" },
};

const DOMAIN_LABELS: Record<EffortDomain, string> = {
  mens: "Mens",
  processen: "Processen",
  data_systemen: "Data & Systemen",
  cultuur: "Cultuur",
};

export default function EffortCard({
  effort,
  onChange,
  onDelete,
  onAISuggest,
}: EffortCardProps) {
  const colors = DOMAIN_COLORS[effort.domain];
  const [isAILoading, setIsAILoading] = useState(false);
  const [aiSuggestion, setAiSuggestion] = useState<EffortSuggestion | null>(null);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [showAIPanel, setShowAIPanel] = useState(false);
  const [selectedVelden, setSelectedVelden] = useState<Set<AanscherpVeld>>(new Set(["alles"]));
  const [userPrompt, setUserPrompt] = useState("");
  const [previousState, setPreviousState] = useState<DINEffort | null>(null);
  const [expanded, setExpanded] = useState(false);
  const [showTip, setShowTip] = useState(false);

  const dossier: InspanningsDossier = effort.dossier || {
    eigenaar: "",
    inspanningsleider: "",
    verwachtResultaat: "",
    kostenraming: "",
    randvoorwaarden: "",
  };

  // Completeness check — inspanningsdossier conform methodiek (Hfst 11.3)
  const missing: string[] = [];
  if (!effort.description) missing.push("beschrijving");
  if (!effort.quarter) missing.push("planning");
  if (!dossier.eigenaar) missing.push("eigenaar");
  if (!dossier.inspanningsleider) missing.push("inspanningsleider");
  if (!dossier.verwachtResultaat) missing.push("verwacht resultaat");

  function toggleVeld(veld: AanscherpVeld) {
    const next = new Set(selectedVelden);
    if (veld === "alles") {
      setSelectedVelden(new Set(["alles"]));
      return;
    }
    next.delete("alles");
    if (next.has(veld)) {
      next.delete(veld);
      if (next.size === 0) next.add("alles");
    } else {
      next.add(veld);
    }
    setSelectedVelden(next);
  }

  async function handleAISuggest() {
    if (!onAISuggest || isAILoading) return;
    setIsAILoading(true);
    try {
      let prefix = "";
      if (!selectedVelden.has("alles")) {
        const labels = Array.from(selectedVelden).map((v) => VELD_LABELS[v]);
        prefix = `Focus ALLEEN op: ${labels.join(", ")}. `;
      }
      const result = await onAISuggest((prefix + (userPrompt || "")) || undefined);
      if (result) {
        setAiSuggestion(result);
      }
    } catch (e) {
      console.error("AI suggestie mislukt:", e);
    } finally {
      setIsAILoading(false);
    }
  }

  function applySuggestion(fields?: AanscherpVeld[]) {
    if (!aiSuggestion) return;
    setPreviousState({ ...effort, dossier: effort.dossier ? { ...effort.dossier } : undefined });

    const applyAll = !fields || fields.includes("alles");
    const applySet = new Set(fields || ["alles"]);
    const updated = { ...effort, dossier: { ...dossier } };

    if (applyAll || applySet.has("beschrijving")) {
      if (aiSuggestion.description) updated.description = aiSuggestion.description;
    }
    if (applyAll || applySet.has("planning")) {
      if (aiSuggestion.quarter) updated.quarter = aiSuggestion.quarter;
    }
    if (applyAll || applySet.has("dossier")) {
      if (aiSuggestion.eigenaar) updated.dossier.eigenaar = aiSuggestion.eigenaar;
      if (aiSuggestion.inspanningsleider) updated.dossier.inspanningsleider = aiSuggestion.inspanningsleider;
      if (aiSuggestion.verwachtResultaat) updated.dossier.verwachtResultaat = aiSuggestion.verwachtResultaat;
      if (aiSuggestion.kostenraming) updated.dossier.kostenraming = aiSuggestion.kostenraming;
      if (aiSuggestion.randvoorwaarden) updated.dossier.randvoorwaarden = aiSuggestion.randvoorwaarden;
    }

    onChange(updated);
    setAiSuggestion(null);
    setShowAIPanel(false);
  }

  function handleUndo() {
    if (!previousState) return;
    onChange(previousState);
    setPreviousState(null);
  }

  return (
    <div className={`border rounded-lg p-3 ${colors.bg} border-gray-200 min-w-0 overflow-hidden`}>
      <div className="flex items-start justify-between gap-2 min-w-0">
        <div className="flex-1 min-w-0">
          <input
            value={effort.description}
            onChange={(e) =>
              onChange({ ...effort, description: e.target.value })
            }
            className="w-full text-sm bg-transparent border-b border-transparent hover:border-gray-300 focus:border-cito-blue focus:outline-none pb-0.5"
            placeholder="Concrete activiteit of project die een vermogen opbouwt (formuleer met werkwoorden)"
          />
          {missing.length > 0 && !expanded && (
            <p className="text-[10px] text-amber-500 mt-1">
              Ontbreekt: {missing.join(", ")}
            </p>
          )}
        </div>
        <div className="flex gap-1.5 items-center">
          {onAISuggest && (
            <button
              onClick={() => setShowAIPanel(!showAIPanel)}
              disabled={isAILoading}
              className={`text-xs px-2 py-1 rounded-md font-medium transition-colors disabled:opacity-50 ${
                showAIPanel
                  ? "bg-cito-accent text-white"
                  : "bg-cito-accent/10 text-cito-accent hover:bg-cito-accent/20"
              }`}
              title="AI analyseert en scherpt deze inspanning aan"
            >
              {isAILoading ? (
                <span className="inline-block animate-spin">&#9881;</span>
              ) : (
                "Aanscherpen"
              )}
            </button>
          )}
          {previousState && (
            <button
              onClick={handleUndo}
              className="text-xs px-2 py-1 rounded-md bg-amber-100 text-amber-700 hover:bg-amber-200 transition-colors font-medium"
              title="Laatste AI-wijziging ongedaan maken"
            >
              Ongedaan
            </button>
          )}
          <button
            onClick={() => setExpanded(!expanded)}
            className="text-xs text-gray-400 hover:text-cito-blue px-1"
            title={expanded ? "Inklappen" : "Dossier bewerken"}
          >
            {expanded ? "\u25B2" : "\u25BC"}
          </button>
          {confirmDelete ? (
            <div className="flex items-center gap-1">
              <button
                onClick={onDelete}
                className="text-[10px] px-2 py-0.5 rounded bg-red-500 text-white hover:bg-red-600 transition-colors font-medium"
              >
                Verwijderen
              </button>
              <button
                onClick={() => setConfirmDelete(false)}
                className="text-[10px] px-1.5 py-0.5 rounded text-gray-500 hover:text-gray-700 hover:bg-gray-100 transition-colors"
              >
                Annuleren
              </button>
            </div>
          ) : (
            <button
              onClick={() => setConfirmDelete(true)}
              className="text-xs text-gray-300 hover:text-red-500 px-1 transition-colors"
              title="Verwijderen"
            >
              &#128465;
            </button>
          )}
        </div>
      </div>

      {/* AI Panel: selectie + prompt */}
      {showAIPanel && !aiSuggestion && (
        <div className="mt-2 p-3 bg-cito-accent/5 border border-cito-accent/20 rounded-lg space-y-2">
          <div className="flex items-center justify-between mb-1">
            <span className="text-xs font-semibold text-cito-accent">Wat wil je aanscherpen?</span>
            <button onClick={() => setShowAIPanel(false)} className="text-xs text-gray-400 hover:text-gray-600">&#10005;</button>
          </div>
          <div className="flex flex-wrap gap-1.5">
            {(Object.keys(VELD_LABELS) as AanscherpVeld[]).map((veld) => (
              <button
                key={veld}
                onClick={() => toggleVeld(veld)}
                className={`text-[11px] px-2.5 py-1 rounded-full font-medium transition-colors ${
                  selectedVelden.has(veld)
                    ? "bg-cito-accent text-white"
                    : "bg-white border border-gray-200 text-gray-600 hover:border-cito-accent/50"
                }`}
              >
                {VELD_LABELS[veld]}
              </button>
            ))}
          </div>
          <div className="flex gap-2 items-center mt-2">
            <input
              value={userPrompt}
              onChange={(e) => setUserPrompt(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleAISuggest()}
              className="flex-1 text-xs px-2 py-1.5 border border-gray-200 rounded-md focus:outline-none focus:ring-1 focus:ring-cito-accent/50 bg-white"
              placeholder="Optioneel: wat wil je veranderen? (bijv. 'meer focus op training')"
            />
            <button
              onClick={handleAISuggest}
              disabled={isAILoading}
              className="text-xs px-3 py-1.5 bg-cito-accent text-white rounded-md hover:bg-cito-blue transition-colors font-medium shrink-0 disabled:opacity-50"
            >
              {isAILoading ? "Bezig..." : "Verstuur"}
            </button>
          </div>
        </div>
      )}

      {/* AI Suggestie met per-veld toepassen */}
      {aiSuggestion && (
        <div className="mt-2 p-3 bg-cito-accent/5 border border-cito-accent/20 rounded-lg space-y-3">
          {aiSuggestion.feedback && (
            <div className="p-2 bg-amber-50 border border-amber-200 rounded text-xs text-amber-800">
              <span className="font-semibold">Analyse: </span>
              {aiSuggestion.feedback}
            </div>
          )}
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-cito-accent">Suggestie</span>
            <div className="flex gap-2">
              <button
                onClick={() => applySuggestion(["alles"])}
                className="text-xs px-3 py-1 bg-cito-accent text-white rounded-md hover:bg-cito-blue transition-colors font-medium"
              >
                Alles toepassen
              </button>
              <button
                onClick={() => { setAiSuggestion(null); setShowAIPanel(false); }}
                className="text-xs px-2 py-1 text-gray-500 hover:text-gray-700"
              >
                Sluiten
              </button>
            </div>
          </div>
          <div className="space-y-1.5">
            {aiSuggestion.description && aiSuggestion.description !== effort.description && (
              <div className="flex items-start gap-2 text-xs bg-white/60 rounded px-2 py-1.5">
                <span className="font-medium text-gray-500 w-20 shrink-0">Beschrijving</span>
                <div className="flex-1 min-w-0">
                  {effort.description && <div className="text-gray-400 line-through truncate">{effort.description}</div>}
                  <div className="text-gray-700">{aiSuggestion.description}</div>
                </div>
                <button onClick={() => applySuggestion(["beschrijving"])} className="text-[10px] px-2 py-0.5 bg-cito-accent/10 text-cito-accent rounded hover:bg-cito-accent/20 font-medium shrink-0">Toepassen</button>
              </div>
            )}
            {aiSuggestion.quarter && aiSuggestion.quarter !== effort.quarter && (
              <div className="flex items-start gap-2 text-xs bg-white/60 rounded px-2 py-1.5">
                <span className="font-medium text-gray-500 w-20 shrink-0">Planning</span>
                <div className="flex-1 min-w-0">
                  {effort.quarter && <div className="text-gray-400 line-through">{effort.quarter}</div>}
                  <div className="text-gray-700">{aiSuggestion.quarter}</div>
                </div>
                <button onClick={() => applySuggestion(["planning"])} className="text-[10px] px-2 py-0.5 bg-cito-accent/10 text-cito-accent rounded hover:bg-cito-accent/20 font-medium shrink-0">Toepassen</button>
              </div>
            )}
            {(aiSuggestion.eigenaar || aiSuggestion.inspanningsleider || aiSuggestion.verwachtResultaat || aiSuggestion.kostenraming || aiSuggestion.randvoorwaarden) && (
              <div className="space-y-1">
                {aiSuggestion.eigenaar && aiSuggestion.eigenaar !== (dossier.eigenaar || "") && (
                  <div className="flex items-start gap-2 text-xs bg-white/60 rounded px-2 py-1.5">
                    <span className="font-medium text-gray-500 w-20 shrink-0">Eigenaar</span>
                    <div className="flex-1 min-w-0">
                      {dossier.eigenaar && <div className="text-gray-400 line-through truncate">{dossier.eigenaar}</div>}
                      <div className="text-gray-700">{aiSuggestion.eigenaar}</div>
                    </div>
                  </div>
                )}
                {aiSuggestion.inspanningsleider && aiSuggestion.inspanningsleider !== (dossier.inspanningsleider || "") && (
                  <div className="flex items-start gap-2 text-xs bg-white/60 rounded px-2 py-1.5">
                    <span className="font-medium text-gray-500 w-20 shrink-0">Leider</span>
                    <div className="flex-1 min-w-0">
                      {dossier.inspanningsleider && <div className="text-gray-400 line-through truncate">{dossier.inspanningsleider}</div>}
                      <div className="text-gray-700">{aiSuggestion.inspanningsleider}</div>
                    </div>
                  </div>
                )}
                {aiSuggestion.verwachtResultaat && aiSuggestion.verwachtResultaat !== (dossier.verwachtResultaat || "") && (
                  <div className="flex items-start gap-2 text-xs bg-white/60 rounded px-2 py-1.5">
                    <span className="font-medium text-gray-500 w-20 shrink-0">Resultaat</span>
                    <div className="flex-1 min-w-0">
                      {dossier.verwachtResultaat && <div className="text-gray-400 line-through truncate">{dossier.verwachtResultaat}</div>}
                      <div className="text-gray-700">{aiSuggestion.verwachtResultaat}</div>
                    </div>
                  </div>
                )}
                <div className="flex justify-end">
                  <button onClick={() => applySuggestion(["dossier"])} className="text-[10px] px-2 py-0.5 bg-cito-accent/10 text-cito-accent rounded hover:bg-cito-accent/20 font-medium">Dossier toepassen</button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      <div className="mt-2 flex items-center gap-2 text-xs">
        <span className={`font-medium ${colors.text}`}>
          {DOMAIN_LABELS[effort.domain]}
        </span>
        <select
          value={effort.quarter || ""}
          onChange={(e) => onChange({ ...effort, quarter: e.target.value })}
          className="px-2 py-0.5 border border-gray-200 rounded bg-white/70 text-xs focus:outline-none"
        >
          <option value="">Kwartaal...</option>
          <option value="Nader te bepalen">Nader te bepalen</option>
          <option value="Q1 2026">Q1 2026</option>
          <option value="Q2 2026">Q2 2026</option>
          <option value="Q3 2026">Q3 2026</option>
          <option value="Q4 2026">Q4 2026</option>
          <option value="Q1 2027">Q1 2027</option>
          <option value="Q2 2027">Q2 2027</option>
        </select>
        <select
          value={effort.status}
          onChange={(e) =>
            onChange({
              ...effort,
              status: e.target.value as DINEffort["status"],
            })
          }
          className="px-2 py-0.5 border border-gray-200 rounded bg-white/70 text-xs focus:outline-none"
        >
          <option value="gepland">Gepland</option>
          <option value="in_uitvoering">In uitvoering</option>
          <option value="afgerond">Afgerond</option>
          <option value="on_hold">On hold</option>
        </select>
      </div>

      {/* Inspanningsdossier — expandable profiel conform methodiek */}
      {expanded && (
        <div className="mt-3 space-y-3">
          <div className="flex items-center gap-2 px-1">
            <span className="text-[10px] text-gray-400 italic">
              Inspanningsdossier volgens DIN-methodiek (Wijnen &amp; Van der Tak, Hfst 11.3)
            </span>
            <button
              onClick={() => setShowTip(!showTip)}
              className="text-[10px] px-1.5 py-0.5 rounded-full bg-orange-100 text-orange-700 hover:bg-orange-200 transition-colors font-medium"
              title="Hoe formuleer ik een goede inspanning?"
            >
              ?
            </button>
          </div>
          {showTip && (
            <div className="p-3 bg-orange-50 border border-orange-200 rounded-lg text-xs text-orange-900 space-y-2">
              <div className="font-semibold">Hoe formuleer ik een goede inspanning?</div>
              <div>
                Formuleer inspanningen met <span className="font-medium">werkwoorden</span> &mdash; het is <span className="italic">werk</span> (werk = werkwoord).
              </div>
              <div className="flex flex-wrap gap-1.5">
                <span className="px-2 py-0.5 bg-white rounded border border-orange-200 text-[11px]">&quot;Training outside-in werken uitvoeren&quot;</span>
                <span className="px-2 py-0.5 bg-white rounded border border-orange-200 text-[11px]">&quot;CRM-systeem implementeren&quot;</span>
                <span className="px-2 py-0.5 bg-white rounded border border-orange-200 text-[11px]">&quot;Feedbackproces inrichten&quot;</span>
              </div>
              <div className="text-orange-700 space-y-1">
                <div>&bull; <span className="font-medium">Werkwoorden</span> gebruiken, niet zelfstandige naamwoorden (verschil met baten!)</div>
                <div>&bull; <span className="font-medium">Concreet</span> genoeg om er middelen (geld, mensen, tijd) aan te koppelen</div>
                <div>&bull; Niet te klein &mdash; cluster gerelateerde activiteiten, anders wordt het DIN onoverzichtelijk</div>
                <div>&bull; Altijd koppelen aan het <span className="font-medium">vermogen</span> waaraan het bijdraagt</div>
                <div>&bull; In &eacute;&eacute;n van de 4 domeinen: Mens, Processen, Data &amp; Systemen, Cultuur</div>
              </div>
              <div className="text-[10px] text-orange-500 italic mt-1">Bron: &quot;Werken aan Programma&apos;s&quot;, Hfst 11 &mdash; Overzicht en samenhang aanbrengen</div>
            </div>
          )}
          <div className="grid grid-cols-2 gap-3 text-sm">
            <div>
              <label className="text-xs text-gray-500">Opdrachtgever (geeft opdracht en is eindverantwoordelijk)</label>
              <input
                value={dossier.eigenaar}
                onChange={(e) =>
                  onChange({
                    ...effort,
                    dossier: { ...dossier, eigenaar: e.target.value },
                  })
                }
                className="w-full px-2 py-1 border border-gray-200 rounded text-sm focus:outline-none focus:ring-1 focus:ring-cito-blue/30"
                placeholder="Wie geeft opdracht voor dit project? (bijv. Directeur PO, Manager ICT)"
              />
            </div>
            <div>
              <label className="text-xs text-gray-500">Inspanningsleider (leidt de dagelijkse uitvoering)</label>
              <input
                value={dossier.inspanningsleider}
                onChange={(e) =>
                  onChange({
                    ...effort,
                    dossier: { ...dossier, inspanningsleider: e.target.value },
                  })
                }
                className="w-full px-2 py-1 border border-gray-200 rounded text-sm focus:outline-none focus:ring-1 focus:ring-cito-blue/30"
                placeholder="Wie leidt de uitvoering? (bijv. Projectleider Training, HR-adviseur)"
              />
            </div>
            <div className="col-span-2">
              <label className="text-xs text-gray-500">Verwacht resultaat</label>
              <textarea
                value={dossier.verwachtResultaat}
                onChange={(e) =>
                  onChange({
                    ...effort,
                    dossier: { ...dossier, verwachtResultaat: e.target.value },
                  })
                }
                rows={2}
                className="w-full px-2 py-1 border border-gray-200 rounded text-sm focus:outline-none focus:ring-1 focus:ring-cito-blue/30 resize-none"
                placeholder="Wat levert deze inspanning concreet op? Hoe draagt het bij aan het vermogen?"
              />
            </div>
            <div>
              <label className="text-xs text-gray-500">Kostenraming</label>
              <input
                value={dossier.kostenraming}
                onChange={(e) =>
                  onChange({
                    ...effort,
                    dossier: { ...dossier, kostenraming: e.target.value },
                  })
                }
                className="w-full px-2 py-1 border border-gray-200 rounded text-sm focus:outline-none focus:ring-1 focus:ring-cito-blue/30"
                placeholder="Eerste kostenraming + onzekerheidsmarge"
              />
            </div>
            <div>
              <label className="text-xs text-gray-500">Randvoorwaarden</label>
              <input
                value={dossier.randvoorwaarden}
                onChange={(e) =>
                  onChange({
                    ...effort,
                    dossier: { ...dossier, randvoorwaarden: e.target.value },
                  })
                }
                className="w-full px-2 py-1 border border-gray-200 rounded text-sm focus:outline-none focus:ring-1 focus:ring-cito-blue/30"
                placeholder="Faciliteiten en randvoorwaarden v&#243;&#243;r start"
              />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export { DOMAIN_LABELS, DOMAIN_COLORS };
