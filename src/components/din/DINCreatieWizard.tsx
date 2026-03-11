"use client";

import { useState } from "react";
import type {
  ProgrammeGoal,
  DINBenefit,
  DINCapability,
  EffortDomain,
} from "@/lib/types";

// --- Types ---

interface WizardProps {
  type: "baat" | "vermogen" | "inspanning";
  sectorId: string;
  // Context-keten: bij welk parent-item hoort dit?
  parentGoal?: ProgrammeGoal;
  parentBenefit?: DINBenefit;
  parentCapability?: DINCapability;
  domain?: EffortDomain;
  sectorPlanText?: string;
  onGenerate: (result: WizardResult) => void;
  onCancel: () => void;
  onManual: () => void; // Fallback: handmatig invoeren (leeg item)
}

export interface WizardResult {
  title: string;
  description: string;
  // Baat-specifiek
  bateneigenaar?: string;
  indicator?: string;
  indicatorOwner?: string;
  currentValue?: string;
  targetValue?: string;
  // Vermogen-specifiek
  currentLevel?: number;
  targetLevel?: number;
  eigenaar?: string;
  huidieSituatie?: string;
  gewensteSituatie?: string;
  // Inspanning-specifiek
  quarter?: string;
  inspanningsEigenaar?: string;
  inspanningsleider?: string;
  verwachtResultaat?: string;
  kostenraming?: string;
  randvoorwaarden?: string;
}

// --- Vragenlijst-configuratie per type ---

interface WizardQuestion {
  key: string;
  label: string;
  placeholder: string;
  type: "text" | "textarea" | "level" | "quarter";
}

const BAAT_VRAGEN: WizardQuestion[] = [
  {
    key: "effect",
    label: "Welk gewenst effect wil je bereiken in de buitenwereld?",
    placeholder: "Denk aan: wat merkt de klant, de markt, de organisatie? Welk resultaat zie je?",
    type: "textarea",
  },
  {
    key: "doelgroep",
    label: "Bij wie is dit effect zichtbaar?",
    placeholder: "Bijv: leerlingen, scholen, werkgevers, klanten, medewerkers",
    type: "text",
  },
  {
    key: "indicatorHint",
    label: "Hoe zou je dit effect meetbaar maken?",
    placeholder: "Bijv: NPS-score, klanttevredenheid, doorlooptijd in dagen, conversie %",
    type: "text",
  },
  {
    key: "eigenaarHint",
    label: "Wie is eindverantwoordelijk voor realisatie?",
    placeholder: "Bijv: Sectormanager PO, Directeur VO, Manager Klantenservice",
    type: "text",
  },
];

const VERMOGEN_VRAGEN: WizardQuestion[] = [
  {
    key: "watKunnen",
    label: "Wat moet de organisatie beter KUNNEN om de baat te realiseren?",
    placeholder: "Denk aan een combinatie van mensen, processen, data en systemen",
    type: "textarea",
  },
  {
    key: "huidigNiveau",
    label: "Hoe staat het er nu voor? (1-5)",
    placeholder: "",
    type: "level",
  },
  {
    key: "gewenstNiveau",
    label: "Hoe moet het eruitzien? (1-5)",
    placeholder: "",
    type: "level",
  },
  {
    key: "eigenaarHint",
    label: "Wie is structureel verantwoordelijk voor dit vermogen?",
    placeholder: "Bijv: Manager ICT, Teamleider Klantenservice, Directeur PO",
    type: "text",
  },
];

const INSPANNING_VRAGEN: WizardQuestion[] = [
  {
    key: "activiteit",
    label: "Welke concrete activiteit of project is nodig?",
    placeholder: "Formuleer met werkwoorden: wat ga je DOEN? (bijv. 'training uitvoeren', 'systeem implementeren')",
    type: "textarea",
  },
  {
    key: "resultaat",
    label: "Wat levert dit concreet op voor het vermogen?",
    placeholder: "Welk resultaat maakt het vermogen sterker?",
    type: "textarea",
  },
  {
    key: "planning",
    label: "Wanneer zou dit moeten starten?",
    placeholder: "",
    type: "quarter",
  },
  {
    key: "opdrachtgever",
    label: "Wie geeft opdracht?",
    placeholder: "Bijv: Directeur PO, Manager ICT, Sectormanager VO",
    type: "text",
  },
];

const DOMAIN_LABELS: Record<EffortDomain, string> = {
  mens: "Mens",
  processen: "Processen",
  data_systemen: "Data & Systemen",
  cultuur: "Cultuur",
};

const LEVEL_LABELS: Record<number, string> = {
  1: "Minimaal",
  2: "Basis",
  3: "Gevorderd",
  4: "Goed",
  5: "Excellent",
};

// --- Component ---

export default function DINCreatieWizard({
  type,
  sectorId,
  parentGoal,
  parentBenefit,
  parentCapability,
  domain,
  sectorPlanText,
  onGenerate,
  onCancel,
  onManual,
}: WizardProps) {
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [isGenerating, setIsGenerating] = useState(false);
  const [preview, setPreview] = useState<WizardResult | null>(null);
  const [error, setError] = useState<string | null>(null);

  const questions = type === "baat" ? BAAT_VRAGEN : type === "vermogen" ? VERMOGEN_VRAGEN : INSPANNING_VRAGEN;

  const typeLabel = type === "baat" ? "baat" : type === "vermogen" ? "vermogen" : "inspanning";
  const typeColor = type === "baat" ? "blue" : type === "vermogen" ? "cyan" : "orange";

  function updateAnswer(key: string, value: string) {
    setAnswers((prev) => ({ ...prev, [key]: value }));
  }

  // Controleer of minimaal de eerste vraag ingevuld is
  const canGenerate = questions.length > 0 && (answers[questions[0].key] || "").trim().length > 2;

  async function handleGenerate() {
    setIsGenerating(true);
    setError(null);
    try {
      const context: Record<string, unknown> = {
        sector: sectorId,
        answers,
      };

      // Context-keten meesturen
      if (parentGoal) {
        context.goalName = parentGoal.name;
        context.goalDescription = parentGoal.description;
      }
      if (parentBenefit) {
        context.benefitTitle = parentBenefit.title || parentBenefit.description;
        context.benefitDescription = parentBenefit.description;
        context.benefitIndicator = parentBenefit.profiel?.indicator;
      }
      if (parentCapability) {
        context.capabilityTitle = parentCapability.title || parentCapability.description;
        context.capabilityDescription = parentCapability.description;
      }
      if (domain) {
        context.domain = DOMAIN_LABELS[domain];
      }
      if (sectorPlanText) {
        context.sectorPlanText = sectorPlanText;
      }

      const res = await fetch("/api/din-suggest", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ type, context, mode: "create" }),
      });

      const data = await res.json();
      if (data.success && data.data?.suggestion) {
        const s = data.data.suggestion;
        const result: WizardResult = {
          title: s.title || "",
          description: s.description || "",
        };
        // Type-specifieke velden
        if (type === "baat") {
          result.bateneigenaar = s.bateneigenaar;
          result.indicator = s.indicator;
          result.indicatorOwner = s.indicatorOwner;
          result.currentValue = s.currentValue;
          result.targetValue = s.targetValue;
        } else if (type === "vermogen") {
          result.currentLevel = s.currentLevel;
          result.targetLevel = s.targetLevel;
          result.eigenaar = s.eigenaar;
          result.huidieSituatie = s.huidieSituatie;
          result.gewensteSituatie = s.gewensteSituatie;
        } else {
          result.quarter = s.quarter;
          result.inspanningsEigenaar = s.eigenaar;
          result.inspanningsleider = s.inspanningsleider;
          result.verwachtResultaat = s.verwachtResultaat;
          result.kostenraming = s.kostenraming;
          result.randvoorwaarden = s.randvoorwaarden;
        }
        setPreview(result);
      } else {
        setError("AI kon geen suggestie genereren. Probeer het opnieuw of voer handmatig in.");
      }
    } catch (e) {
      console.error("Creatie mislukt:", e);
      setError("Fout bij genereren. Controleer je internetverbinding.");
    } finally {
      setIsGenerating(false);
    }
  }

  function handleApply() {
    if (preview) {
      onGenerate(preview);
    }
  }

  // --- Context weergave ---
  function renderContext() {
    const contextColor = type === "baat" ? "bg-blue-50 border-blue-200 text-blue-800" : type === "vermogen" ? "bg-cyan-50 border-cyan-200 text-cyan-800" : "bg-orange-50 border-orange-200 text-orange-800";

    return (
      <div className={`p-3 rounded-lg border text-xs ${contextColor}`}>
        {type === "baat" && parentGoal && (
          <div>
            <span className="font-semibold">Nieuwe baat voor doel:</span>{" "}
            <span className="font-medium">{parentGoal.name}</span>
            {parentGoal.description && (
              <span className="text-gray-600 block mt-0.5">{parentGoal.description.slice(0, 120)}{parentGoal.description.length > 120 ? "\u2026" : ""}</span>
            )}
          </div>
        )}
        {type === "vermogen" && parentBenefit && (
          <div>
            <span className="font-semibold">Nieuw vermogen voor baat:</span>{" "}
            <span className="font-medium">{parentBenefit.title || parentBenefit.description}</span>
            {parentBenefit.profiel?.indicator && (
              <span className="block mt-0.5">Indicator: {parentBenefit.profiel.indicator} | Doel: {parentBenefit.profiel.targetValue || "?"}</span>
            )}
          </div>
        )}
        {type === "inspanning" && parentCapability && (
          <div>
            <span className="font-semibold">Nieuwe inspanning voor vermogen:</span>{" "}
            <span className="font-medium">{parentCapability.title || parentCapability.description}</span>
            {domain && (
              <span className="block mt-0.5">Domein: {DOMAIN_LABELS[domain]}</span>
            )}
          </div>
        )}
        <div className="mt-1 text-[10px] opacity-70">Sector: {sectorId}</div>
      </div>
    );
  }

  // --- Preview renderen ---
  function renderPreview() {
    if (!preview) return null;

    return (
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <span className="text-xs font-semibold text-gray-700">AI-gegenereerd resultaat</span>
          <div className="flex gap-2">
            <button
              onClick={handleApply}
              className="text-xs px-3 py-1.5 bg-cito-accent text-white rounded-md hover:bg-cito-blue transition-colors font-medium"
            >
              Toepassen
            </button>
            <button
              onClick={() => { setPreview(null); handleGenerate(); }}
              className="text-xs px-3 py-1.5 bg-gray-100 text-gray-600 rounded-md hover:bg-gray-200 transition-colors font-medium"
            >
              Opnieuw
            </button>
            <button
              onClick={() => setPreview(null)}
              className="text-xs px-2 py-1 text-gray-500 hover:text-gray-700"
            >
              Bewerken
            </button>
          </div>
        </div>

        <div className="bg-white border border-gray-200 rounded-lg p-3 space-y-2">
          <div>
            <span className="text-[10px] text-gray-400 uppercase tracking-wide">Titel</span>
            <div className="text-sm font-semibold text-gray-800">{preview.title}</div>
          </div>
          <div>
            <span className="text-[10px] text-gray-400 uppercase tracking-wide">Beschrijving</span>
            <div className="text-sm text-gray-600">{preview.description}</div>
          </div>

          {type === "baat" && (
            <div className="grid grid-cols-2 gap-2 pt-2 border-t border-gray-100">
              {preview.bateneigenaar && <PreviewField label="Bateneigenaar" value={preview.bateneigenaar} />}
              {preview.indicator && <PreviewField label="Indicator" value={preview.indicator} />}
              {preview.indicatorOwner && <PreviewField label="Meetverantw." value={preview.indicatorOwner} />}
              {preview.currentValue && <PreviewField label="Startwaarde" value={preview.currentValue} />}
              {preview.targetValue && <PreviewField label="Doelwaarde" value={preview.targetValue} />}
            </div>
          )}
          {type === "vermogen" && (
            <div className="grid grid-cols-2 gap-2 pt-2 border-t border-gray-100">
              {preview.currentLevel && <PreviewField label="Huidig niveau" value={`${preview.currentLevel}/5 — ${LEVEL_LABELS[preview.currentLevel] || ""}`} />}
              {preview.targetLevel && <PreviewField label="Gewenst niveau" value={`${preview.targetLevel}/5 — ${LEVEL_LABELS[preview.targetLevel] || ""}`} />}
              {preview.eigenaar && <PreviewField label="Eigenaar" value={preview.eigenaar} />}
              {preview.huidieSituatie && <PreviewField label="Huidige situatie" value={preview.huidieSituatie} />}
              {preview.gewensteSituatie && <PreviewField label="Gewenste situatie" value={preview.gewensteSituatie} />}
            </div>
          )}
          {type === "inspanning" && (
            <div className="grid grid-cols-2 gap-2 pt-2 border-t border-gray-100">
              {preview.quarter && <PreviewField label="Planning" value={preview.quarter} />}
              {preview.inspanningsEigenaar && <PreviewField label="Opdrachtgever" value={preview.inspanningsEigenaar} />}
              {preview.inspanningsleider && <PreviewField label="Inspanningsleider" value={preview.inspanningsleider} />}
              {preview.verwachtResultaat && <PreviewField label="Verwacht resultaat" value={preview.verwachtResultaat} />}
              {preview.kostenraming && <PreviewField label="Kostenraming" value={preview.kostenraming} />}
              {preview.randvoorwaarden && <PreviewField label="Randvoorwaarden" value={preview.randvoorwaarden} />}
            </div>
          )}
        </div>
      </div>
    );
  }

  const borderColor = type === "baat" ? "border-blue-200" : type === "vermogen" ? "border-cyan-200" : "border-orange-200";
  const bgColor = type === "baat" ? "bg-blue-50/30" : type === "vermogen" ? "bg-cyan-50/30" : "bg-orange-50/30";
  const accentColor = type === "baat" ? "text-blue-700" : type === "vermogen" ? "text-cyan-700" : "text-orange-700";

  return (
    <div className={`border-2 ${borderColor} rounded-xl p-4 ${bgColor} space-y-4`}>
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className={`text-sm font-semibold ${accentColor}`}>
            Nieuwe {typeLabel} aanmaken
          </span>
          <span className="text-[10px] px-2 py-0.5 bg-cito-accent/10 text-cito-accent rounded-full font-medium">
            AI-gestuurd
          </span>
        </div>
        <div className="flex gap-2">
          <button
            onClick={onManual}
            className="text-[11px] px-2.5 py-1 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-md transition-colors"
          >
            Handmatig invoeren
          </button>
          <button
            onClick={onCancel}
            className="text-xs text-gray-400 hover:text-gray-600"
          >
            &#10005;
          </button>
        </div>
      </div>

      {/* Stap 1: Context */}
      {renderContext()}

      {/* Stap 2: Vragenlijst of Preview */}
      {preview ? (
        renderPreview()
      ) : (
        <div className="space-y-3">
          <div className="text-xs font-medium text-gray-600">
            Beantwoord de vragen — AI genereert een methodiek-conforme {typeLabel}
          </div>

          {questions.map((q) => (
            <div key={q.key}>
              <label className="text-xs font-medium text-gray-700 block mb-1">
                {q.label}
              </label>
              {q.type === "text" && (
                <input
                  value={answers[q.key] || ""}
                  onChange={(e) => updateAnswer(q.key, e.target.value)}
                  className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-cito-accent/30 focus:border-cito-accent/50 bg-white"
                  placeholder={q.placeholder}
                />
              )}
              {q.type === "textarea" && (
                <textarea
                  value={answers[q.key] || ""}
                  onChange={(e) => updateAnswer(q.key, e.target.value)}
                  rows={2}
                  className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-cito-accent/30 focus:border-cito-accent/50 bg-white resize-none"
                  placeholder={q.placeholder}
                />
              )}
              {q.type === "level" && (
                <div className="flex gap-1 mt-1">
                  {[1, 2, 3, 4, 5].map((level) => {
                    const isActive = parseInt(answers[q.key] || "0") >= level;
                    return (
                      <button
                        key={level}
                        onClick={() => updateAnswer(q.key, String(level))}
                        className={`w-10 h-8 rounded-lg text-xs font-semibold transition-colors ${
                          isActive
                            ? q.key === "huidigNiveau"
                              ? "bg-amber-400 text-amber-900"
                              : "bg-green-500 text-white"
                            : "bg-gray-100 text-gray-400 hover:bg-gray-200"
                        }`}
                        title={LEVEL_LABELS[level]}
                      >
                        {level}
                      </button>
                    );
                  })}
                  {answers[q.key] && (
                    <span className="text-[11px] text-gray-400 self-center ml-2">
                      {LEVEL_LABELS[parseInt(answers[q.key])] || ""}
                    </span>
                  )}
                </div>
              )}
              {q.type === "quarter" && (
                <select
                  value={answers[q.key] || ""}
                  onChange={(e) => updateAnswer(q.key, e.target.value)}
                  className="px-3 py-2 border border-gray-200 rounded-lg bg-white text-sm focus:outline-none focus:ring-2 focus:ring-cito-accent/30"
                >
                  <option value="">Kies kwartaal...</option>
                  <option value="Q1 2026">Q1 2026</option>
                  <option value="Q2 2026">Q2 2026</option>
                  <option value="Q3 2026">Q3 2026</option>
                  <option value="Q4 2026">Q4 2026</option>
                  <option value="Q1 2027">Q1 2027</option>
                  <option value="Q2 2027">Q2 2027</option>
                  <option value="Nader te bepalen">Nader te bepalen</option>
                </select>
              )}
            </div>
          ))}

          {error && (
            <div className="p-2 bg-red-50 border border-red-200 rounded-lg text-xs text-red-700">
              {error}
            </div>
          )}

          {/* Genereer-knop */}
          <div className="flex justify-end pt-2">
            <button
              onClick={handleGenerate}
              disabled={!canGenerate || isGenerating}
              className="text-sm px-4 py-2 bg-cito-accent text-white rounded-lg hover:bg-cito-blue transition-colors font-medium disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
            >
              {isGenerating ? (
                <>
                  <span className="inline-block animate-spin">&#9881;</span>
                  Genereren...
                </>
              ) : (
                "Genereer met AI"
              )}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

function PreviewField({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <span className="text-[10px] text-gray-400">{label}</span>
      <div className="text-xs text-gray-700">{value}</div>
    </div>
  );
}
