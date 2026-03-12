"use client";

import { useState } from "react";
import type { DINCapability, VermogensProfiel } from "@/lib/types";

interface CapabilitySuggestion {
  feedback?: string;
  title?: string;
  description: string;
  currentLevel: number;
  targetLevel: number;
  eigenaar?: string;
  huidieSituatie?: string;
  gewensteSituatie?: string;
}

type AanscherpVeld = "alles" | "titel" | "beschrijving" | "niveaus" | "profiel";

const VELD_LABELS: Record<AanscherpVeld, string> = {
  alles: "Alles",
  titel: "Titel",
  beschrijving: "Beschrijving",
  niveaus: "Niveaus",
  profiel: "Profiel",
};

// Zetvragen conform DIN-methodiek — helpen nadenken over de juiste formulering
const VERMOGEN_ZETVRAGEN = [
  { key: "watKunnenVraag", label: "Wat moet de organisatie beter KUNNEN (niet DOEN)?", placeholder: "Beschrijf een capaciteit, geen activiteit. Bijv: 'klantgesprekken voeren' i.p.v. 'training geven'" },
  { key: "waaromNodigVraag", label: "Waarom is dit vermogen nu onvoldoende?", placeholder: "Wat ontbreekt er? Kennis, ervaring, tooling, processen...?" },
  { key: "hoeHerkenVraag", label: "Hoe herken je dat het vermogen op gewenst niveau is?", placeholder: "Welk concreet gedrag of resultaat zie je dan?" },
];

interface CapabilityCardProps {
  capability: DINCapability;
  onChange: (updated: DINCapability) => void;
  onDelete: () => void;
  onAISuggest?: (userPrompt?: string) => Promise<CapabilitySuggestion | null>;
  sharedWithBenefits?: string[];
}

const LEVEL_LABELS: Record<number, string> = {
  1: "Minimaal",
  2: "Basis",
  3: "Gevorderd",
  4: "Goed",
  5: "Excellent",
};

function LevelSelector({
  label,
  value,
  onChange,
  color,
}: {
  label: string;
  value: number | undefined;
  onChange: (v: number) => void;
  color: "current" | "target";
}) {
  return (
    <div>
      <div className="text-[10px] text-gray-500 mb-1">{label}</div>
      <div className="flex gap-0.5">
        {[1, 2, 3, 4, 5].map((level) => {
          const isActive = value !== undefined && level <= value;
          return (
            <button
              key={level}
              onClick={() => onChange(level)}
              className={`w-6 h-6 rounded text-[10px] font-semibold transition-colors ${
                isActive
                  ? color === "current"
                    ? "bg-amber-400 text-amber-900"
                    : "bg-green-500 text-white"
                  : "bg-gray-100 text-gray-400 hover:bg-gray-200"
              }`}
              title={`${level} — ${LEVEL_LABELS[level]}`}
            >
              {level}
            </button>
          );
        })}
        {value !== undefined && (
          <span className="text-[9px] text-gray-400 ml-1 self-center">
            {LEVEL_LABELS[value]}
          </span>
        )}
      </div>
    </div>
  );
}

export default function CapabilityCard({
  capability,
  onChange,
  onDelete,
  onAISuggest,
  sharedWithBenefits,
}: CapabilityCardProps) {
  const [expanded, setExpanded] = useState(false);
  const [isAILoading, setIsAILoading] = useState(false);
  const [aiError, setAiError] = useState(false);
  const [aiSuggestion, setAiSuggestion] = useState<CapabilitySuggestion | null>(null);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [showAIPanel, setShowAIPanel] = useState(false);
  const [selectedVelden, setSelectedVelden] = useState<Set<AanscherpVeld>>(new Set(["alles"]));
  const [userPrompt, setUserPrompt] = useState("");
  const [zetvraagAntwoorden, setZetvraagAntwoorden] = useState<Record<string, string>>({});
  const [previousState, setPreviousState] = useState<DINCapability | null>(null);
  const [showTip, setShowTip] = useState(false);

  const profiel: VermogensProfiel = capability.profiel || { eigenaar: "", huidieSituatie: "", gewensteSituatie: "" };

  const gap =
    capability.targetLevel && capability.currentLevel
      ? capability.targetLevel - capability.currentLevel
      : undefined;

  // Completeness check — vermogensprofiel conform methodiek
  const missing: string[] = [];
  if (!capability.title && !capability.description) missing.push("titel");
  if (!capability.currentLevel) missing.push("huidig niveau");
  if (!capability.targetLevel) missing.push("gewenst niveau");
  if (!profiel.eigenaar) missing.push("eigenaar");
  if (!profiel.huidieSituatie) missing.push("huidige situatie");
  if (!profiel.gewensteSituatie) missing.push("gewenste situatie");

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
      // Zetvragen-antwoorden meesturen
      const filledAnswers = VERMOGEN_ZETVRAGEN.filter((z) => zetvraagAntwoorden[z.key]?.trim());
      if (filledAnswers.length > 0) {
        prefix += "\n\nDe gebruiker heeft de volgende zetvragen beantwoord:\n";
        filledAnswers.forEach((z) => {
          prefix += `- ${z.label} → ${zetvraagAntwoorden[z.key]}\n`;
        });
        prefix += "\nGebruik deze antwoorden om een scherper en methodiek-conformer voorstel te doen.\n";
      }
      const result = await onAISuggest((prefix + (userPrompt || "")) || undefined);
      if (result) {
        setAiSuggestion(result);
        setExpanded(true);
      }
    } catch (e) {
      console.error("AI suggestie mislukt:", e);
      setAiError(true);
    } finally {
      setIsAILoading(false);
    }
  }

  function applySuggestion(fields?: AanscherpVeld[]) {
    if (!aiSuggestion) return;
    setPreviousState({ ...capability, profiel: capability.profiel ? { ...capability.profiel } : undefined });

    const applyAll = !fields || fields.includes("alles");
    const applySet = new Set(fields || ["alles"]);
    const updated = { ...capability, profiel: { ...(capability.profiel || { eigenaar: "", huidieSituatie: "", gewensteSituatie: "" }) } };

    if (applyAll || applySet.has("titel")) {
      if (aiSuggestion.title) updated.title = aiSuggestion.title;
    }
    if (applyAll || applySet.has("beschrijving")) {
      if (aiSuggestion.description) updated.description = aiSuggestion.description;
    }
    if (applyAll || applySet.has("niveaus")) {
      if (aiSuggestion.currentLevel) updated.currentLevel = aiSuggestion.currentLevel;
      if (aiSuggestion.targetLevel) updated.targetLevel = aiSuggestion.targetLevel;
    }
    if (applyAll || applySet.has("profiel")) {
      if (aiSuggestion.eigenaar) updated.profiel!.eigenaar = aiSuggestion.eigenaar;
      if (aiSuggestion.huidieSituatie) updated.profiel!.huidieSituatie = aiSuggestion.huidieSituatie;
      if (aiSuggestion.gewensteSituatie) updated.profiel!.gewensteSituatie = aiSuggestion.gewensteSituatie;
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
    <div className="border border-cyan-200 rounded-lg p-3 bg-cyan-50/50 min-w-0 overflow-hidden">
      <div className="flex items-start gap-2 min-w-0">
        <div className="flex-1 min-w-0 space-y-1">
          <input
            value={capability.title || ""}
            onChange={(e) =>
              onChange({ ...capability, title: e.target.value })
            }
            className="w-full font-semibold text-sm bg-transparent border-b border-transparent hover:border-gray-300 focus:border-cito-blue focus:outline-none"
            placeholder="Titel: wat moet de organisatie KUNNEN? (bijv. 'Klantgesprek-methodiek')"
          />
          <textarea
            value={capability.description}
            onChange={(e) =>
              onChange({ ...capability, description: e.target.value })
            }
            rows={2}
            className="w-full text-sm text-gray-600 bg-transparent border border-transparent hover:border-gray-200 focus:border-cito-blue/50 focus:outline-none rounded px-1 py-0.5 resize-none"
            placeholder="Toelichting: welke combinatie van mensen, processen, data en systemen? (1-2 zinnen)"
          />
          {missing.length > 0 && !expanded && (
            <p className="text-[10px] text-amber-500">
              Ontbreekt: {missing.join(", ")}
            </p>
          )}
        </div>
        <div className="flex gap-1.5 shrink-0 items-center">
          {onAISuggest && (
            <button
              onClick={() => setShowAIPanel(!showAIPanel)}
              disabled={isAILoading}
              className={`text-xs px-2 py-1 rounded-md font-medium transition-colors disabled:opacity-50 ${
                showAIPanel
                  ? "bg-cito-accent text-white"
                  : "bg-cito-accent/10 text-cito-accent hover:bg-cito-accent/20"
              }`}
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
            >
              Ongedaan
            </button>
          )}
          {gap !== undefined && gap > 0 && (
            <span
              className={`text-[10px] px-1.5 py-0.5 rounded font-medium ${
                gap >= 3
                  ? "bg-red-100 text-red-700"
                  : gap >= 2
                  ? "bg-amber-100 text-amber-700"
                  : "bg-green-100 text-green-700"
              }`}
            >
              +{gap}
            </span>
          )}
          <button
            onClick={() => setExpanded(!expanded)}
            aria-expanded={expanded}
            className="text-xs text-gray-400 hover:text-cito-blue px-1"
            title={expanded ? "Inklappen" : "Profiel bewerken"}
          >
            {expanded ? "\u25B2" : "\u25BC"}
          </button>
          {confirmDelete ? (
            <div className="flex items-center gap-1 ml-1">
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

      {/* Gedeeld met andere baten */}
      {sharedWithBenefits && sharedWithBenefits.length > 0 && (
        <div className="mt-1 flex flex-wrap gap-1 items-center">
          <span className="text-[10px] text-gray-400">Ook bij:</span>
          {sharedWithBenefits.map((label, i) => (
            <span key={i} className="text-[10px] px-1.5 py-0.5 bg-din-baten/10 text-din-baten rounded-full truncate max-w-[150px]">
              {label}
            </span>
          ))}
        </div>
      )}

      {/* AI Panel: zetvragen + selectie + prompt */}
      {showAIPanel && !aiSuggestion && (
        <div className="mt-3 p-3 bg-cito-accent/5 border border-cito-accent/20 rounded-lg space-y-3">
          <div className="flex items-center justify-between mb-1">
            <span className="text-xs font-semibold text-cito-accent">Aanscherpen met zetvragen</span>
            <button onClick={() => setShowAIPanel(false)} className="text-xs text-gray-400 hover:text-gray-600">&#10005;</button>
          </div>

          {/* Zetvragen */}
          <div className="space-y-2 p-2.5 bg-cyan-50/50 border border-cyan-100 rounded-lg">
            <div className="text-[10px] text-cyan-600 font-medium uppercase tracking-wider">Zetvragen (optioneel, helpt AI scherper formuleren)</div>
            {VERMOGEN_ZETVRAGEN.map((z) => (
              <div key={z.key}>
                <label className="text-[11px] font-medium text-gray-700 block mb-0.5">{z.label}</label>
                <input
                  value={zetvraagAntwoorden[z.key] || ""}
                  onChange={(e) => setZetvraagAntwoorden((prev) => ({ ...prev, [z.key]: e.target.value }))}
                  className="w-full text-xs px-2 py-1.5 border border-gray-200 rounded-md focus:outline-none focus:ring-1 focus:ring-cyan-300 bg-white"
                  placeholder={z.placeholder}
                />
              </div>
            ))}
          </div>

          {/* Veld-selectie */}
          <div>
            <div className="text-[10px] text-gray-500 mb-1">Welke velden aanscherpen?</div>
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
          </div>

          {/* Extra vrije prompt */}
          <div className="flex gap-2 items-center">
            <input
              value={userPrompt}
              onChange={(e) => setUserPrompt(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleAISuggest()}
              className="flex-1 text-xs px-2 py-1.5 border border-gray-200 rounded-md focus:outline-none focus:ring-1 focus:ring-cito-accent/50 bg-white"
              placeholder="Optioneel: extra instructie"
            />
            <button
              onClick={handleAISuggest}
              disabled={isAILoading}
              className="text-xs px-3 py-1.5 bg-cito-accent text-white rounded-md hover:bg-cito-blue transition-colors font-medium shrink-0 disabled:opacity-50"
            >
              {isAILoading ? "Bezig..." : "Aanscherpen"}
            </button>
          </div>
          {aiError && (
            <p className="text-red-500 text-xs mt-1">AI-suggestie mislukt. Probeer het opnieuw.</p>
          )}
        </div>
      )}

      {/* AI Suggestie */}
      {aiSuggestion && (
        <div className="mt-3 p-3 bg-cito-accent/5 border border-cito-accent/20 rounded-lg space-y-3">
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
            {aiSuggestion.title && aiSuggestion.title !== (capability.title || "") && (
              <div className="flex items-start gap-2 text-xs bg-white/60 rounded px-2 py-1.5">
                <span className="font-medium text-gray-500 w-20 shrink-0">Titel</span>
                <div className="flex-1 min-w-0">
                  {capability.title && <div className="text-gray-400 line-through truncate">{capability.title}</div>}
                  <div className="text-gray-700 font-medium">{aiSuggestion.title}</div>
                </div>
                <button onClick={() => applySuggestion(["titel"])} className="text-[10px] px-2 py-0.5 bg-cito-accent/10 text-cito-accent rounded hover:bg-cito-accent/20 font-medium shrink-0">Toepassen</button>
              </div>
            )}
            {aiSuggestion.description && aiSuggestion.description !== capability.description && (
              <div className="flex items-start gap-2 text-xs bg-white/60 rounded px-2 py-1.5">
                <span className="font-medium text-gray-500 w-20 shrink-0">Beschrijving</span>
                <div className="flex-1 min-w-0">
                  {capability.description && <div className="text-gray-400 line-through truncate">{capability.description}</div>}
                  <div className="text-gray-700">{aiSuggestion.description}</div>
                </div>
                <button onClick={() => applySuggestion(["beschrijving"])} className="text-[10px] px-2 py-0.5 bg-cito-accent/10 text-cito-accent rounded hover:bg-cito-accent/20 font-medium shrink-0">Toepassen</button>
              </div>
            )}
            {(aiSuggestion.currentLevel || aiSuggestion.targetLevel) && (
              <div className="flex items-start gap-2 text-xs bg-white/60 rounded px-2 py-1.5">
                <span className="font-medium text-gray-500 w-20 shrink-0">Niveaus</span>
                <div className="flex-1">
                  <span className="text-amber-600">{aiSuggestion.currentLevel}/5</span>
                  {" \u2192 "}
                  <span className="text-green-600">{aiSuggestion.targetLevel}/5</span>
                </div>
                <button onClick={() => applySuggestion(["niveaus"])} className="text-[10px] px-2 py-0.5 bg-cito-accent/10 text-cito-accent rounded hover:bg-cito-accent/20 font-medium shrink-0">Toepassen</button>
              </div>
            )}
            {(aiSuggestion.eigenaar || aiSuggestion.huidieSituatie || aiSuggestion.gewensteSituatie) && (
              <div className="space-y-1">
                {aiSuggestion.eigenaar && aiSuggestion.eigenaar !== (profiel.eigenaar || "") && (
                  <div className="flex items-start gap-2 text-xs bg-white/60 rounded px-2 py-1.5">
                    <span className="font-medium text-gray-500 w-20 shrink-0">Eigenaar</span>
                    <div className="flex-1 min-w-0">
                      {profiel.eigenaar && <div className="text-gray-400 line-through truncate">{profiel.eigenaar}</div>}
                      <div className="text-gray-700">{aiSuggestion.eigenaar}</div>
                    </div>
                  </div>
                )}
                {aiSuggestion.huidieSituatie && aiSuggestion.huidieSituatie !== (profiel.huidieSituatie || "") && (
                  <div className="flex items-start gap-2 text-xs bg-white/60 rounded px-2 py-1.5">
                    <span className="font-medium text-gray-500 w-20 shrink-0">Huidige sit.</span>
                    <div className="flex-1 min-w-0">
                      {profiel.huidieSituatie && <div className="text-gray-400 line-through truncate">{profiel.huidieSituatie}</div>}
                      <div className="text-gray-700">{aiSuggestion.huidieSituatie}</div>
                    </div>
                  </div>
                )}
                {aiSuggestion.gewensteSituatie && aiSuggestion.gewensteSituatie !== (profiel.gewensteSituatie || "") && (
                  <div className="flex items-start gap-2 text-xs bg-white/60 rounded px-2 py-1.5">
                    <span className="font-medium text-gray-500 w-20 shrink-0">Gewenste sit.</span>
                    <div className="flex-1 min-w-0">
                      {profiel.gewensteSituatie && <div className="text-gray-400 line-through truncate">{profiel.gewensteSituatie}</div>}
                      <div className="text-gray-700">{aiSuggestion.gewensteSituatie}</div>
                    </div>
                  </div>
                )}
                <div className="flex justify-end">
                  <button onClick={() => applySuggestion(["profiel"])} className="text-[10px] px-2 py-0.5 bg-cito-accent/10 text-cito-accent rounded hover:bg-cito-accent/20 font-medium">Profiel toepassen</button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Compact score weergave */}
      {!expanded && (capability.currentLevel || capability.targetLevel) && (
        <div className="mt-1.5 flex items-center gap-3 text-[10px] text-gray-500">
          {capability.currentLevel && (
            <span>Nu: <span className="font-medium text-amber-600">{capability.currentLevel}/5</span></span>
          )}
          {capability.targetLevel && (
            <span>Doel: <span className="font-medium text-green-600">{capability.targetLevel}/5</span></span>
          )}
        </div>
      )}

      {expanded && (
        <div className="mt-3 space-y-3">
          <div className="flex items-center gap-2 px-1">
            <span className="text-[10px] text-gray-400 italic">
              Vermogensprofiel volgens DIN-methodiek (Wijnen &amp; Van der Tak, Hfst 10)
            </span>
            <button
              onClick={() => setShowTip(!showTip)}
              className="text-[10px] px-1.5 py-0.5 rounded-full bg-cyan-100 text-cyan-700 hover:bg-cyan-200 transition-colors font-medium"
              title="Hoe formuleer ik een goed vermogen?"
            >
              ?
            </button>
          </div>
          {showTip && (
            <div className="p-3 bg-cyan-50 border border-cyan-200 rounded-lg text-xs text-cyan-900 space-y-2">
              <div className="font-semibold">Hoe formuleer ik een goed vermogen?</div>
              <div>
                Een vermogen is een <span className="font-medium">specifieke combinatie</span> van mensen, processen, data en systemen die samen waarde toevoegen.
              </div>
              <div className="flex flex-wrap gap-1.5">
                <span className="px-2 py-0.5 bg-white rounded border border-cyan-200 text-[11px]">&quot;Klantgesprek-methodiek&quot;</span>
                <span className="px-2 py-0.5 bg-white rounded border border-cyan-200 text-[11px]">&quot;Data-analyse competentie&quot;</span>
                <span className="px-2 py-0.5 bg-white rounded border border-cyan-200 text-[11px]">&quot;Digitaal toetsplatform&quot;</span>
              </div>
              <div className="text-cyan-700 space-y-1">
                <div>&bull; Beschrijf de <span className="font-medium">combinatie</span> &mdash; niet slechts &eacute;&eacute;n onderdeel (alleen IT of alleen mensen)</div>
                <div>&bull; Een vermogen is een <span className="font-medium">hefboom</span> voor de baat &mdash; het is wat de organisatie moet <span className="italic">kunnen</span> om de baat te realiseren</div>
                <div className="pl-4 text-[11px] text-cyan-600">Voorbeeld: baat = &quot;Hogere klanttevredenheid&quot; &rarr; vermogen = &quot;Klantgesprek-methodiek&quot; (de combinatie van training, processen en tooling die medewerkers in staat stelt klantgericht te werken)</div>
                <div>&bull; Werk uit met <span className="font-medium">as-is</span> (huidige situatie) en <span className="font-medium">to-be</span> (gewenste situatie)</div>
                <div>&bull; Kan concreet zijn (&quot;klantenservice&quot;) of holistisch (&quot;lerend vermogen&quot;)</div>
                <div>&bull; Zes aspecten: processen, data, mensen, organisatie, technologie, cultuur</div>
              </div>
              <div className="text-[10px] text-cyan-500 italic mt-1">Bron: &quot;Werken aan Programma&apos;s&quot;, Hfst 10 &mdash; De benodigde vermogens uitwerken</div>
            </div>
          )}
          <div className="flex gap-6">
            <LevelSelector
              label="Huidig niveau"
              value={capability.currentLevel}
              onChange={(v) => onChange({ ...capability, currentLevel: v })}
              color="current"
            />
            <LevelSelector
              label="Gewenst niveau"
              value={capability.targetLevel}
              onChange={(v) => onChange({ ...capability, targetLevel: v })}
              color="target"
            />
          </div>
          <div className="grid grid-cols-2 gap-3 text-sm">
            <div className="col-span-2">
              <label className="text-xs text-gray-500">Vermogenseigenaar (structureel verantwoordelijk voor opbouw en borging)</label>
              <input
                value={profiel.eigenaar}
                onChange={(e) =>
                  onChange({
                    ...capability,
                    profiel: { ...profiel, eigenaar: e.target.value },
                  })
                }
                className="w-full px-2 py-1 border border-gray-200 rounded text-sm focus:outline-none focus:ring-1 focus:ring-cito-blue/30"
                placeholder="Wie bewaakt dit vermogen structureel? (bijv. Directeur PO, Manager Klantenservice)"
              />
            </div>
            <div>
              <label className="text-xs text-gray-500">Huidige situatie (as-is)</label>
              <textarea
                value={profiel.huidieSituatie}
                onChange={(e) =>
                  onChange({
                    ...capability,
                    profiel: { ...profiel, huidieSituatie: e.target.value },
                  })
                }
                rows={2}
                className="w-full px-2 py-1 border border-gray-200 rounded text-sm focus:outline-none focus:ring-1 focus:ring-cito-blue/30 resize-none"
                placeholder="Hoe staat het er nu voor? Wat kan de organisatie al?"
              />
            </div>
            <div>
              <label className="text-xs text-gray-500">Gewenste situatie (to-be)</label>
              <textarea
                value={profiel.gewensteSituatie}
                onChange={(e) =>
                  onChange({
                    ...capability,
                    profiel: { ...profiel, gewensteSituatie: e.target.value },
                  })
                }
                rows={2}
                className="w-full px-2 py-1 border border-gray-200 rounded text-sm focus:outline-none focus:ring-1 focus:ring-cito-blue/30 resize-none"
                placeholder="Hoe moet het eruitzien? Wat moet de organisatie kunnen?"
              />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
