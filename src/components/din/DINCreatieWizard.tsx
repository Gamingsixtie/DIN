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
  onGenerate: (results: WizardResult[]) => void;
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
  meetmethode?: string;
  measurementMoment?: string;
  // Vermogen-specifiek
  currentLevel?: number;
  targetLevel?: number;
  eigenaar?: string;
  huidieSituatie?: string;
  gewensteSituatie?: string;
  // Inspanning-specifiek
  domain?: EffortDomain; // Gekozen domein (vanuit domeinverkenning)
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

// --- Domeinverkenning vragen ---

const DOMEIN_VRAGEN: WizardQuestion[] = [
  {
    key: "gapReden",
    label: "Wat is de belangrijkste reden dat dit vermogen nu nog onvoldoende is?",
    placeholder: "Denk aan: ontbreken de juiste mensen/kennis? Zijn werkprocessen niet ingericht? Ontbreekt tooling/data? Of is het een kwestie van gedrag en mindset?",
    type: "textarea",
  },
  {
    key: "blokkade",
    label: "Wat blokkeert concreet het bereiken van het gewenste niveau?",
    placeholder: "Bijv: medewerkers missen de juiste training, er is geen eenduidig werkproces, het systeem ondersteunt dit niet, of de organisatiecultuur werkt tegen",
    type: "textarea",
  },
  {
    key: "succes",
    label: "Wanneer is de inspanning geslaagd? Wat is er dan anders?",
    placeholder: "Bijv: alle medewerkers gecertificeerd, nieuw proces live, systeem geïmplementeerd, gedragsverandering zichtbaar",
    type: "text",
  },
  {
    key: "lopend",
    label: "Zijn er al lopende activiteiten in deze richting? (optioneel)",
    placeholder: "Bijv: er loopt al een training, er is een systeemproject gestart, er is een cultuurprogramma",
    type: "text",
  },
];

const DOMAIN_LABELS: Record<EffortDomain, string> = {
  mens: "Mens",
  processen: "Processen",
  data_systemen: "Data & Systemen",
  cultuur: "Cultuur",
};

const DOMAIN_COLORS: Record<EffortDomain, { bg: string; border: string; text: string; dot: string }> = {
  mens: { bg: "bg-blue-50", border: "border-blue-300", text: "text-blue-700", dot: "bg-blue-500" },
  processen: { bg: "bg-green-50", border: "border-green-300", text: "text-green-700", dot: "bg-green-500" },
  data_systemen: { bg: "bg-purple-50", border: "border-purple-300", text: "text-purple-700", dot: "bg-purple-500" },
  cultuur: { bg: "bg-amber-50", border: "border-amber-300", text: "text-amber-700", dot: "bg-amber-500" },
};

const DOMAIN_DESCRIPTIONS: Record<EffortDomain, string> = {
  mens: "Opleiding, training, bemensing, competentieontwikkeling",
  processen: "Werkwijzen, procedures, governance, samenwerking",
  data_systemen: "IT-systemen, data-infrastructuur, tooling, integraties",
  cultuur: "Gedrag, mindset, waarden, leiderschapsontwikkeling",
};

interface DomeinRecommendation {
  aanbevolenDomein: EffortDomain;
  vertrouwen: "hoog" | "gemiddeld";
  redenering: string;
  alternatiefDomein: EffortDomain | null;
  alternatiefRedenering: string | null;
}

const LEVEL_LABELS: Record<number, string> = {
  1: "Minimaal",
  2: "Basis",
  3: "Gevorderd",
  4: "Goed",
  5: "Excellent",
};

// Wizard stappen voor inspanningen (met domeinverkenning)
type InspanningPhase = "context" | "domeinverkenning" | "domeinkeuze" | "vragen" | "preview";
// Standaard stappen voor baat/vermogen
type StandardPhase = "context" | "vragen" | "preview";

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
  const [previews, setPreviews] = useState<WizardResult[]>([]);
  const [error, setError] = useState<string | null>(null);

  // Domeinverkenning state (alleen voor inspanningen zonder vooraf gekozen domein)
  const needsDomainDiscovery = type === "inspanning" && !domain;
  const [domeinAntwoorden, setDomeinAntwoorden] = useState<Record<string, string>>({});
  const [domeinRecommendation, setDomeinRecommendation] = useState<DomeinRecommendation | null>(null);
  // Multi-select: meerdere domeinen kunnen gekozen worden
  const [gekozenDomeinen, setGekozenDomeinen] = useState<EffortDomain[]>(domain ? [domain] : []);
  const [isDomeinLoading, setIsDomeinLoading] = useState(false);
  const [phase, setPhase] = useState<InspanningPhase | StandardPhase>(
    needsDomainDiscovery ? "domeinverkenning" : "vragen"
  );
  const [generateProgress, setGenerateProgress] = useState<string>("");

  // Per-domein flow: bij meerdere domeinen doorloop je elk domein apart
  const [currentDomeinIndex, setCurrentDomeinIndex] = useState(0);
  const [confirmedPreviews, setConfirmedPreviews] = useState<WizardResult[]>([]);

  const questions = type === "baat" ? BAAT_VRAGEN : type === "vermogen" ? VERMOGEN_VRAGEN : INSPANNING_VRAGEN;

  const typeLabel = type === "baat" ? "baat" : type === "vermogen" ? "vermogen" : "inspanning";

  function updateAnswer(key: string, value: string) {
    setAnswers((prev) => ({ ...prev, [key]: value }));
  }

  function updateDomeinAnswer(key: string, value: string) {
    setDomeinAntwoorden((prev) => ({ ...prev, [key]: value }));
  }

  function toggleDomein(d: EffortDomain) {
    setGekozenDomeinen((prev) =>
      prev.includes(d) ? prev.filter((x) => x !== d) : [...prev, d]
    );
  }

  // Controleer of minimaal de eerste vraag ingevuld is
  const canGenerate = questions.length > 0 && (answers[questions[0].key] || "").trim().length > 2;
  const canAnalyzeDomain = (domeinAntwoorden["gapReden"] || "").trim().length > 5;

  // --- Domein-analyse ---
  async function handleDomeinAnalyse() {
    setIsDomeinLoading(true);
    setError(null);
    try {
      const context: Record<string, unknown> = {
        sector: sectorId,
        answers: domeinAntwoorden,
      };
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
      if (sectorPlanText) {
        context.sectorPlanText = sectorPlanText;
      }

      const res = await fetch("/api/din-suggest", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ type: "inspanning", context, mode: "domain-recommend" }),
      });

      const data = await res.json();
      if (data.success && data.data?.suggestion) {
        const s = data.data.suggestion;
        const rec: DomeinRecommendation = {
          aanbevolenDomein: s.aanbevolenDomein || "mens",
          vertrouwen: s.vertrouwen || "gemiddeld",
          redenering: s.redenering || "",
          alternatiefDomein: s.alternatiefDomein || null,
          alternatiefRedenering: s.alternatiefRedenering || null,
        };
        setDomeinRecommendation(rec);
        // Pre-select: aanbevolen domein altijd, alternatief ook als het er is
        const preSelected: EffortDomain[] = [rec.aanbevolenDomein];
        if (rec.alternatiefDomein) {
          preSelected.push(rec.alternatiefDomein);
        }
        setGekozenDomeinen(preSelected);
        setPhase("domeinkeuze");
      } else {
        setError("AI kon geen domein aanbevelen. Kies handmatig een domein.");
        setPhase("domeinkeuze");
      }
    } catch (e) {
      console.error("Domein-analyse mislukt:", e);
      setError("Fout bij domeinanalyse. Kies handmatig een domein.");
      setPhase("domeinkeuze");
    } finally {
      setIsDomeinLoading(false);
    }
  }

  // --- AI generatie voor één domein ---
  async function generateForDomain(targetDomain: EffortDomain): Promise<WizardResult | null> {
    const context: Record<string, unknown> = {
      sector: sectorId,
      answers: {
        ...domeinAntwoorden,
        ...answers,
      },
    };

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
    context.domain = DOMAIN_LABELS[targetDomain];
    if (sectorPlanText) {
      context.sectorPlanText = sectorPlanText;
    }

    const res = await fetch("/api/din-suggest", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ type: "inspanning", context, mode: "create" }),
    });

    const data = await res.json();
    if (data.success && data.data?.suggestion) {
      const s = data.data.suggestion;
      return {
        title: s.title || "",
        description: s.description || "",
        domain: targetDomain,
        quarter: s.quarter,
        inspanningsEigenaar: s.eigenaar,
        inspanningsleider: s.inspanningsleider,
        verwachtResultaat: s.verwachtResultaat,
        kostenraming: s.kostenraming,
        randvoorwaarden: s.randvoorwaarden,
      };
    }
    return null;
  }

  // --- AI generatie: per domein apart (inspanningen) of single (baat/vermogen) ---
  async function handleGenerate() {
    setIsGenerating(true);
    setError(null);
    setPreviews([]);

    try {
      if (type === "inspanning" && gekozenDomeinen.length > 0) {
        // Genereer alleen voor het HUIDIGE domein
        const currentDomain = gekozenDomeinen[currentDomeinIndex];
        setGenerateProgress(`${DOMAIN_LABELS[currentDomain]} genereren...`);
        try {
          const result = await generateForDomain(currentDomain);
          setGenerateProgress("");
          if (result) {
            setPreviews([result]);
            setPhase("preview");
          } else {
            setError(`AI kon geen inspanning genereren voor ${DOMAIN_LABELS[currentDomain]}. Probeer het opnieuw.`);
          }
        } catch {
          setGenerateProgress("");
          setError(`Fout bij genereren voor ${DOMAIN_LABELS[currentDomain]}. Probeer het opnieuw.`);
        }
      } else {
        // Baat of vermogen: enkele generatie
        const context: Record<string, unknown> = {
          sector: sectorId,
          answers,
        };
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
        const effectiveDomain = gekozenDomeinen[0] || domain;
        if (effectiveDomain) {
          context.domain = DOMAIN_LABELS[effectiveDomain];
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
          if (type === "baat") {
            result.bateneigenaar = s.bateneigenaar;
            result.indicator = s.indicator;
            result.indicatorOwner = s.indicatorOwner;
            result.currentValue = s.currentValue;
            result.targetValue = s.targetValue;
            result.meetmethode = s.meetmethode;
            result.measurementMoment = s.measurementMoment;
          } else if (type === "vermogen") {
            result.currentLevel = s.currentLevel;
            result.targetLevel = s.targetLevel;
            result.eigenaar = s.eigenaar;
            result.huidieSituatie = s.huidieSituatie;
            result.gewensteSituatie = s.gewensteSituatie;
          }
          setPreviews([result]);
          setPhase("preview");
        } else {
          setError("AI kon geen suggestie genereren. Probeer het opnieuw of voer handmatig in.");
        }
      }
    } catch (e) {
      console.error("Creatie mislukt:", e);
      setError("Fout bij genereren. Controleer je internetverbinding.");
      setGenerateProgress("");
    } finally {
      setIsGenerating(false);
    }
  }

  function handleApply() {
    if (type === "inspanning" && gekozenDomeinen.length > 1) {
      // Multi-domein: bevestig huidig domein, ga naar volgende
      const currentPreview = previews[0];
      if (currentPreview) {
        const newConfirmed = [...confirmedPreviews, currentPreview];
        const nextIndex = currentDomeinIndex + 1;

        if (nextIndex < gekozenDomeinen.length) {
          // Nog meer domeinen te doen → reset en ga naar vragen voor volgend domein
          setConfirmedPreviews(newConfirmed);
          setCurrentDomeinIndex(nextIndex);
          setPreviews([]);
          setAnswers({}); // Reset vragen voor volgend domein
          setError(null);
          setPhase("vragen");
        } else {
          // Alle domeinen afgerond → pas alles toe
          onGenerate(newConfirmed);
        }
      }
    } else {
      // Single domein of baat/vermogen: direct toepassen
      if (previews.length > 0) {
        onGenerate(previews);
      }
    }
  }

  function removePreview(index: number) {
    setPreviews((prev) => prev.filter((_, i) => i !== index));
  }

  // --- Context weergave ---
  function renderContext() {
    return (
      <div className="p-3 rounded-lg border bg-gray-50 border-gray-200 text-xs text-gray-700">
        {parentGoal && (
          <div className="flex items-start gap-2 mb-1">
            <span className="text-[10px] px-1.5 py-0.5 bg-din-doelen/10 text-din-doelen rounded font-semibold shrink-0">Doel</span>
            <span>{parentGoal.name}</span>
          </div>
        )}
        {type === "baat" && parentGoal && (
          <div className="ml-4 text-gray-500">
            Nieuwe baat voor dit programmadoel
          </div>
        )}
        {parentBenefit && (
          <div className="flex items-start gap-2 mb-1 ml-4">
            <span className="text-[10px] px-1.5 py-0.5 bg-din-baten/10 text-din-baten rounded font-semibold shrink-0">Baat</span>
            <span>{parentBenefit.title || parentBenefit.description}</span>
            {parentBenefit.profiel?.indicator && (
              <span className="text-gray-400 shrink-0">KPI: {parentBenefit.profiel.indicator}</span>
            )}
          </div>
        )}
        {type === "vermogen" && parentBenefit && (
          <div className="ml-8 text-gray-500">
            Nieuw vermogen voor deze baat
          </div>
        )}
        {parentCapability && (
          <div className="flex items-start gap-2 mb-1 ml-8">
            <span className="text-[10px] px-1.5 py-0.5 bg-din-vermogens/10 text-din-vermogens rounded font-semibold shrink-0">Vermogen</span>
            <span>{parentCapability.title || parentCapability.description}</span>
            {parentCapability.currentLevel && parentCapability.targetLevel && (
              <span className="text-gray-400 shrink-0">({parentCapability.currentLevel}/5 &rarr; {parentCapability.targetLevel}/5)</span>
            )}
          </div>
        )}
        {type === "inspanning" && parentCapability && (
          <div className="ml-12 text-gray-500">
            {gekozenDomeinen.length > 0 ? (
              <span>
                Nieuwe inspanning{gekozenDomeinen.length > 1 ? "en" : ""} &mdash; {gekozenDomeinen.map((d) => (
                  <span key={d} className={`font-semibold ${DOMAIN_COLORS[d].text}`}>
                    {DOMAIN_LABELS[d]}{gekozenDomeinen.indexOf(d) < gekozenDomeinen.length - 1 ? ", " : ""}
                  </span>
                ))}
              </span>
            ) : domain ? (
              <span>Nieuwe inspanning &mdash; domein: <span className="font-semibold">{DOMAIN_LABELS[domain]}</span></span>
            ) : (
              <span>Nieuwe inspanning &mdash; domein wordt bepaald</span>
            )}
          </div>
        )}
        <div className="mt-1 text-[10px] opacity-70">Sector: {sectorId}</div>
      </div>
    );
  }

  // --- Domeinverkenning renderen ---
  function renderDomeinVerkenning() {
    return (
      <div className="space-y-3">
        <div className="text-xs font-medium text-gray-600">
          Beantwoord de vragen zodat AI kan bepalen in welk domein de inspanning het best past
        </div>

        {DOMEIN_VRAGEN.map((q) => (
          <div key={q.key}>
            <label className="text-xs font-medium text-gray-700 block mb-1">
              {q.label}
            </label>
            {q.type === "textarea" ? (
              <textarea
                value={domeinAntwoorden[q.key] || ""}
                onChange={(e) => updateDomeinAnswer(q.key, e.target.value)}
                rows={2}
                className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-cito-accent/30 focus:border-cito-accent/50 bg-white resize-none"
                placeholder={q.placeholder}
              />
            ) : (
              <input
                value={domeinAntwoorden[q.key] || ""}
                onChange={(e) => updateDomeinAnswer(q.key, e.target.value)}
                className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-cito-accent/30 focus:border-cito-accent/50 bg-white"
                placeholder={q.placeholder}
              />
            )}
          </div>
        ))}

        {error && (
          <div className="p-2 bg-red-50 border border-red-200 rounded-lg text-xs text-red-700">
            {error}
          </div>
        )}

        <div className="flex justify-end pt-2">
          <button
            onClick={handleDomeinAnalyse}
            disabled={!canAnalyzeDomain || isDomeinLoading}
            className="text-sm px-4 py-2 bg-cito-accent text-white rounded-lg hover:bg-cito-blue transition-colors font-medium disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
          >
            {isDomeinLoading ? (
              <>
                <span className="inline-block animate-spin">&#9881;</span>
                Domein analyseren...
              </>
            ) : (
              "Analyseer domein met AI"
            )}
          </button>
        </div>
      </div>
    );
  }

  // --- Domeinkeuze renderen (multi-select) ---
  function renderDomeinKeuze() {
    const allDomains: EffortDomain[] = ["mens", "processen", "data_systemen", "cultuur"];

    return (
      <div className="space-y-3">
        {/* AI-aanbeveling tonen */}
        {domeinRecommendation && (
          <div className={`p-3 rounded-lg border-2 ${DOMAIN_COLORS[domeinRecommendation.aanbevolenDomein].border} ${DOMAIN_COLORS[domeinRecommendation.aanbevolenDomein].bg}`}>
            <div className="flex items-center gap-2 mb-1.5">
              <span className={`w-2.5 h-2.5 rounded-full ${DOMAIN_COLORS[domeinRecommendation.aanbevolenDomein].dot}`} />
              <span className={`text-sm font-semibold ${DOMAIN_COLORS[domeinRecommendation.aanbevolenDomein].text}`}>
                Aanbevolen: {DOMAIN_LABELS[domeinRecommendation.aanbevolenDomein]}
              </span>
              <span className={`text-[10px] px-1.5 py-0.5 rounded-full font-medium ${
                domeinRecommendation.vertrouwen === "hoog"
                  ? "bg-green-100 text-green-700"
                  : "bg-amber-100 text-amber-700"
              }`}>
                {domeinRecommendation.vertrouwen === "hoog" ? "Hoog vertrouwen" : "Gemiddeld vertrouwen"}
              </span>
            </div>
            <p className="text-xs text-gray-700 leading-relaxed">
              {domeinRecommendation.redenering}
            </p>
            {domeinRecommendation.alternatiefDomein && domeinRecommendation.alternatiefRedenering && (
              <p className="text-[11px] text-gray-500 mt-1.5 pt-1.5 border-t border-gray-200">
                Ook relevant: <span className="font-medium">{DOMAIN_LABELS[domeinRecommendation.alternatiefDomein]}</span> &mdash; {domeinRecommendation.alternatiefRedenering}
              </p>
            )}
          </div>
        )}

        {/* Domein-keuze: multi-select */}
        <div className="text-xs font-medium text-gray-600">
          {domeinRecommendation
            ? "Selecteer de domeinen waarvoor je inspanningen wilt genereren (meerdere mogelijk):"
            : "Kies de inspanningsdomein(en):"}
        </div>
        <div className="grid grid-cols-2 gap-2">
          {allDomains.map((d) => {
            const isSelected = gekozenDomeinen.includes(d);
            const isRecommended = domeinRecommendation?.aanbevolenDomein === d;
            const isAlternative = domeinRecommendation?.alternatiefDomein === d;
            const colors = DOMAIN_COLORS[d];
            return (
              <button
                key={d}
                onClick={() => toggleDomein(d)}
                className={`p-3 rounded-lg border-2 text-left transition-all ${
                  isSelected
                    ? `${colors.border} ${colors.bg} shadow-sm`
                    : "border-gray-200 bg-white hover:border-gray-300"
                }`}
              >
                <div className="flex items-center gap-2">
                  {/* Checkbox */}
                  <div className={`w-4 h-4 rounded border-2 flex items-center justify-center shrink-0 transition-colors ${
                    isSelected
                      ? `${colors.border} ${colors.dot}`
                      : "border-gray-300 bg-white"
                  }`}>
                    {isSelected && (
                      <svg className="w-2.5 h-2.5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                      </svg>
                    )}
                  </div>
                  <span className={`text-sm font-semibold ${isSelected ? colors.text : "text-gray-600"}`}>
                    {DOMAIN_LABELS[d]}
                  </span>
                  {isRecommended && (
                    <span className="text-[9px] px-1.5 py-0.5 bg-cito-accent/10 text-cito-accent rounded-full font-medium ml-auto">
                      Aanbevolen
                    </span>
                  )}
                  {isAlternative && !isRecommended && (
                    <span className="text-[9px] px-1.5 py-0.5 bg-gray-100 text-gray-500 rounded-full font-medium ml-auto">
                      Alternatief
                    </span>
                  )}
                </div>
                <p className="text-[11px] text-gray-500 mt-1 ml-6">
                  {DOMAIN_DESCRIPTIONS[d]}
                </p>
              </button>
            );
          })}
        </div>

        {gekozenDomeinen.length > 1 && (
          <div className="p-2 bg-blue-50 border border-blue-200 rounded-lg text-xs text-blue-700">
            {gekozenDomeinen.length} domeinen geselecteerd &mdash; elk domein wordt apart uitgewerkt met eigen vragen en AI-generatie
          </div>
        )}

        {error && (
          <div className="p-2 bg-red-50 border border-red-200 rounded-lg text-xs text-red-700">
            {error}
          </div>
        )}

        <div className="flex justify-end pt-2">
          <button
            onClick={() => {
              setError(null);
              setPhase("vragen");
            }}
            disabled={gekozenDomeinen.length === 0}
            className="text-sm px-4 py-2 bg-cito-accent text-white rounded-lg hover:bg-cito-blue transition-colors font-medium disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {gekozenDomeinen.length > 1
              ? `${gekozenDomeinen.length} domeinen bevestigd — Inspanningen formuleren`
              : gekozenDomeinen.length === 1
                ? `Bevestig: ${DOMAIN_LABELS[gekozenDomeinen[0]]} — Inspanning formuleren`
                : "Selecteer minimaal 1 domein"}
          </button>
        </div>
      </div>
    );
  }

  // --- Preview renderen (meerdere resultaten) ---
  function renderPreview() {
    if (previews.length === 0) return null;

    return (
      <div className="space-y-3">
        {/* Reeds bevestigde domeinen tonen */}
        {confirmedPreviews.length > 0 && (
          <div className="p-2 bg-green-50 border border-green-200 rounded-lg text-xs text-green-700">
            {confirmedPreviews.map((cp, i) => (
              <span key={i}>
                {cp.domain && <span className={`font-semibold ${DOMAIN_COLORS[cp.domain].text}`}>{DOMAIN_LABELS[cp.domain]}</span>}
                {cp.title && <span className="text-gray-600"> — {cp.title}</span>}
                {i < confirmedPreviews.length - 1 && <span className="mx-1">|</span>}
              </span>
            ))}
            <span className="ml-1 text-green-600">&#10003;</span>
          </div>
        )}

        <div className="flex items-center justify-between">
          <span className="text-xs font-semibold text-gray-700">
            {type === "inspanning" && gekozenDomeinen.length > 1 && previews[0]?.domain
              ? `${DOMAIN_LABELS[previews[0].domain]} — AI-gegenereerde inspanning`
              : "AI-gegenereerd resultaat"}
          </span>
          <div className="flex gap-2">
            <button
              onClick={handleApply}
              className="text-xs px-3 py-1.5 bg-cito-accent text-white rounded-md hover:bg-cito-blue transition-colors font-medium"
            >
              {type === "inspanning" && gekozenDomeinen.length > 1
                ? currentDomeinIndex + 1 < gekozenDomeinen.length
                  ? `Bevestig & ${DOMAIN_LABELS[gekozenDomeinen[currentDomeinIndex + 1]]} starten`
                  : `Bevestig & alle ${gekozenDomeinen.length} toepassen`
                : "Toepassen"}
            </button>
            <button
              onClick={() => { setPreviews([]); setPhase("vragen"); handleGenerate(); }}
              className="text-xs px-3 py-1.5 bg-gray-100 text-gray-600 rounded-md hover:bg-gray-200 transition-colors font-medium"
            >
              Opnieuw
            </button>
            <button
              onClick={() => { setPreviews([]); setPhase("vragen"); }}
              className="text-xs px-2 py-1 text-gray-500 hover:text-gray-700"
            >
              Bewerken
            </button>
          </div>
        </div>

        {previews.map((preview, idx) => {
          const previewDomain = preview.domain;
          const domainColor = previewDomain ? DOMAIN_COLORS[previewDomain] : null;

          return (
            <div key={idx} className={`bg-white border rounded-lg p-3 space-y-2 ${
              domainColor ? `${domainColor.border}` : "border-gray-200"
            }`}>
              {/* Domein-header bij meerdere resultaten */}
              {previews.length > 1 && previewDomain && (
                <div className="flex items-center justify-between mb-1">
                  <div className="flex items-center gap-2">
                    <span className={`w-2.5 h-2.5 rounded-full ${domainColor?.dot}`} />
                    <span className={`text-xs font-semibold ${domainColor?.text}`}>
                      {DOMAIN_LABELS[previewDomain]}
                    </span>
                  </div>
                  <button
                    onClick={() => removePreview(idx)}
                    className="text-[10px] text-gray-400 hover:text-red-500"
                    title="Deze inspanning verwijderen"
                  >
                    &#10005;
                  </button>
                </div>
              )}

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
                  {previews.length === 1 && preview.domain && <PreviewField label="Domein" value={DOMAIN_LABELS[preview.domain]} />}
                  {preview.quarter && <PreviewField label="Planning" value={preview.quarter} />}
                  {preview.inspanningsEigenaar && <PreviewField label="Opdrachtgever" value={preview.inspanningsEigenaar} />}
                  {preview.inspanningsleider && <PreviewField label="Inspanningsleider" value={preview.inspanningsleider} />}
                  {preview.verwachtResultaat && <PreviewField label="Verwacht resultaat" value={preview.verwachtResultaat} />}
                  {preview.kostenraming && <PreviewField label="Kostenraming" value={preview.kostenraming} />}
                  {preview.randvoorwaarden && <PreviewField label="Randvoorwaarden" value={preview.randvoorwaarden} />}
                </div>
              )}
            </div>
          );
        })}
      </div>
    );
  }

  // --- Vragen renderen ---
  function renderVragen() {
    return (
      <div className="space-y-3">
        {/* Bij multi-domein: toon welk domein nu aan de beurt is */}
        {type === "inspanning" && gekozenDomeinen.length > 1 && (
          <div className={`p-2.5 rounded-lg border-2 ${DOMAIN_COLORS[gekozenDomeinen[currentDomeinIndex]].border} ${DOMAIN_COLORS[gekozenDomeinen[currentDomeinIndex]].bg}`}>
            <div className="flex items-center gap-2">
              <span className={`w-2.5 h-2.5 rounded-full ${DOMAIN_COLORS[gekozenDomeinen[currentDomeinIndex]].dot}`} />
              <span className={`text-sm font-semibold ${DOMAIN_COLORS[gekozenDomeinen[currentDomeinIndex]].text}`}>
                Domein {currentDomeinIndex + 1}/{gekozenDomeinen.length}: {DOMAIN_LABELS[gekozenDomeinen[currentDomeinIndex]]}
              </span>
            </div>
            <p className="text-[11px] text-gray-600 mt-1 ml-[18px]">
              Beantwoord de vragen specifiek voor een inspanning in het domein {DOMAIN_LABELS[gekozenDomeinen[currentDomeinIndex]]}.
              {confirmedPreviews.length > 0 && (
                <span className="text-green-600 font-medium"> ({confirmedPreviews.length} domein{confirmedPreviews.length > 1 ? "en" : ""} al bevestigd)</span>
              )}
            </p>
          </div>
        )}

        <div className="text-xs font-medium text-gray-600">
          {type === "inspanning" && gekozenDomeinen.length > 1
            ? `Beantwoord de vragen voor domein "${DOMAIN_LABELS[gekozenDomeinen[currentDomeinIndex]]}"`
            : `Beantwoord de vragen — AI genereert een methodiek-conforme ${typeLabel}`}
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
        <div className="flex justify-between items-center pt-2">
          {needsDomainDiscovery && (
            <button
              onClick={() => setPhase("domeinkeuze")}
              className="text-[11px] text-gray-500 hover:text-gray-700"
            >
              &larr; Domein wijzigen
            </button>
          )}
          <div className="flex-1" />
          <button
            onClick={handleGenerate}
            disabled={!canGenerate || isGenerating}
            className="text-sm px-4 py-2 bg-cito-accent text-white rounded-lg hover:bg-cito-blue transition-colors font-medium disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
          >
            {isGenerating ? (
              <>
                <span className="inline-block animate-spin">&#9881;</span>
                {generateProgress || "Genereren..."}
              </>
            ) : gekozenDomeinen.length > 1 ? (
              `Genereer ${DOMAIN_LABELS[gekozenDomeinen[currentDomeinIndex]]} inspanning`
            ) : (
              "Genereer met AI"
            )}
          </button>
        </div>
      </div>
    );
  }

  const borderColor = type === "baat" ? "border-blue-200" : type === "vermogen" ? "border-cyan-200" : "border-orange-200";
  const bgColor = type === "baat" ? "bg-blue-50/30" : type === "vermogen" ? "bg-cyan-50/30" : "bg-orange-50/30";
  const accentColor = type === "baat" ? "text-blue-700" : type === "vermogen" ? "text-cyan-700" : "text-orange-700";

  // Stap-indicator voor inspanningen met domeinverkenning
  const inspanningSteps = needsDomainDiscovery
    ? [
        { key: "domeinverkenning", label: "Verkenning" },
        { key: "domeinkeuze", label: "Domein" },
        { key: "vragen", label: "Details" },
        { key: "preview", label: "Resultaat" },
      ]
    : [
        { key: "vragen", label: "Details" },
        { key: "preview", label: "Resultaat" },
      ];

  const currentStepIndex = inspanningSteps.findIndex((s) => s.key === phase);

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

      {/* Stap-indicator voor inspanningen met domeinverkenning */}
      {type === "inspanning" && needsDomainDiscovery && (
        <div className="flex items-center gap-1">
          {inspanningSteps.map((step, idx) => (
            <div key={step.key} className="flex items-center gap-1">
              <div className={`text-[10px] px-2 py-1 rounded-full font-medium ${
                idx < currentStepIndex
                  ? "bg-cito-accent text-white"
                  : idx === currentStepIndex
                    ? "bg-cito-accent/20 text-cito-accent border border-cito-accent/30"
                    : "bg-gray-100 text-gray-400"
              }`}>
                {idx < currentStepIndex ? "\u2713" : idx + 1}. {step.label}
              </div>
              {idx < inspanningSteps.length - 1 && (
                <span className="text-gray-300 text-[10px]">&rarr;</span>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Context */}
      {renderContext()}

      {/* Content per fase */}
      {phase === "domeinverkenning" && renderDomeinVerkenning()}
      {phase === "domeinkeuze" && renderDomeinKeuze()}
      {phase === "vragen" && renderVragen()}
      {phase === "preview" && renderPreview()}
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
