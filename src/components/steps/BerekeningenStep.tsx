"use client";

import { useState, useMemo } from "react";
import { useSession } from "@/lib/session-context";
import type { DINSession, BegrotingAdvies, Stap4Result, BegrotingScenario, InspanningBegroting } from "@/lib/types";
import { parseDossierRaming, type ParsedDossierRaming } from "@/lib/dossier-parser";
import { splitMotivatie, segmentText, parseBreakdown, type EuroMatch, type ParsedBreakdown, type BreakdownSection } from "@/lib/motivatie-parser";
import { vindRedenering } from "@/lib/component-redeneringen";
import { vindKnownBreakdown, structureelCumulatiefMid, type KnownSection } from "@/lib/known-breakdowns";
import { NotitieVoorClaude } from "./NotitieVoorClaude";

// Map een hardcoded KnownSection naar de BreakdownSection-shape die
// BreakdownTabel begrijpt. Gebruikt als fallback wanneer parseBreakdown geen
// netjes-aansluitende uitsplitsing uit de tekst kan halen.
function knownSectionAlsBreakdown(
  k: KnownSection,
  label: "eenmalig" | "structureel",
): BreakdownSection {
  const subComponenten = k.subComponenten.map((c) => ({
    naam: c.naam,
    bedragLow: c.bedragLow,
    bedragHigh: c.bedragHigh,
    bedragRaw: `€${c.bedragLow}–€${c.bedragHigh}`,
    isPerJaar: c.isPerJaar,
    vanafJaar: null,
    formule: null,
    rauwFragment: c.naam,
  }));
  const somSubsLow = subComponenten.reduce((s, c) => s + c.bedragLow, 0);
  const somSubsHigh = subComponenten.reduce((s, c) => s + c.bedragHigh, 0);
  return {
    label,
    hoofdtotaalLow: k.hoofdtotaalLow,
    hoofdtotaalHigh: k.hoofdtotaalHigh,
    subComponenten,
    somSubsLow,
    somSubsHigh,
    bufferLow: k.hoofdtotaalLow - somSubsLow,
    bufferHigh: k.hoofdtotaalHigh - somSubsHigh,
    sluitNetjesAan: true,
    rauwTekst: "",
    bufferContext: null,
  };
}

// ============================================================================
// Helpers
// ============================================================================

function formatEur(n: number | undefined | null): string {
  if (typeof n !== "number" || !isFinite(n)) return "—";
  return `€ ${Math.round(n).toLocaleString("nl-NL")}`;
}

function formatEurMln(n: number | undefined | null): string {
  if (typeof n !== "number" || !isFinite(n)) return "—";
  if (Math.abs(n) >= 1_000_000) return `€ ${(n / 1_000_000).toFixed(2)} mln`;
  if (Math.abs(n) >= 10_000) return `€ ${Math.round(n / 1000)}K`;
  return `€ ${Math.round(n).toLocaleString("nl-NL")}`;
}

function pct(num: number, denom: number): string {
  if (!isFinite(num) || !isFinite(denom) || denom <= 0) return "—";
  return `${Math.round((num / denom) * 100)}%`;
}

const SCENARIO_KEYS = ["optimaal", "plus20", "advies", "min20"] as const;
type ScenarioKey = (typeof SCENARIO_KEYS)[number];

const SCENARIO_META: Record<ScenarioKey, { label: string; band: string; ring: string; accent: string; uitleg: string }> = {
  optimaal: {
    label: "Huidig budget",
    band: "bg-[#003366]",
    ring: "ring-[#003366]/30",
    accent: "text-[#003366]",
    uitleg: "Het Cito-norm-budget blijft ongewijzigd; het aantal jaren volgt uit hoeveel tijd nodig is om alle dossier-totalen te dekken bij dat jaarlijkse plafond.",
  },
  plus20: {
    label: "+20% (sneller)",
    band: "bg-emerald-700",
    ring: "ring-emerald-700/30",
    accent: "text-emerald-700",
    uitleg: "20% méér jaarbudget; daardoor kortere doorlooptijd. Plafond = afgerond Cito-budget × 1,20.",
  },
  advies: {
    label: "Snelste scenario",
    band: "bg-purple-700",
    ring: "ring-purple-700/30",
    accent: "text-purple-700",
    uitleg: "Het kortste haalbare scenario binnen 3 tot 5 jaar dat nog bekostbaar is voor Cito (jaarbudget ≤ Cito-norm × 1,40). De rekenkundige uitkomst kan een fractie zijn — bijvoorbeeld 3,5 jaar — en wordt naar boven afgerond naar hele jaren. Voor deze sessie: 4 jaar.",
  },
  min20: {
    label: "−20% (langzamer)",
    band: "bg-amber-700",
    ring: "ring-amber-700/30",
    accent: "text-amber-700",
    uitleg: "20% minder jaarbudget; daardoor langere doorlooptijd en hogere cumulatieve structurele last. Plafond = afgerond Cito-budget × 0,80.",
  },
};

const DOMAIN_LABEL: Record<string, string> = {
  mens: "Mens",
  processen: "Processen",
  data_systemen: "Data & Systemen",
  cultuur: "Cultuur",
  overig: "Programma-breed",
};

const DOMAIN_DOT: Record<string, string> = {
  mens: "bg-blue-500",
  processen: "bg-emerald-600",
  data_systemen: "bg-purple-600",
  cultuur: "bg-amber-600",
  overig: "bg-gray-500",
};

const DOMAIN_BG: Record<string, string> = {
  mens: "bg-blue-50 border-blue-200",
  processen: "bg-emerald-50 border-emerald-200",
  data_systemen: "bg-purple-50 border-purple-200",
  cultuur: "bg-amber-50 border-amber-200",
  overig: "bg-gray-50 border-gray-200",
};

function tolerantie(scenarioTotaal: number): number {
  return Math.max(5_000, Math.round(scenarioTotaal * 0.005));
}

// ============================================================================
// Hoofdcomponent
// ============================================================================

export default function BerekeningenStep() {
  const { session } = useSession();
  const [openScenario, setOpenScenario] = useState<ScenarioKey | null>("advies");

  if (!session) return null;

  const stap4 = (session.crossAnalyseWizard?.stepResults as { stap4?: Stap4Result } | undefined)?.stap4;
  const begroting = stap4?.begrotingAdvies as BegrotingAdvies | undefined;
  const subEffortAnalysis = (stap4?.subEffortAnalysis as Array<{
    titel?: string;
    domein?: string;
    dossier?: { kostenraming?: string };
  }> | undefined) ?? [];

  const beschikbareScenarios: ScenarioKey[] = SCENARIO_KEYS.filter(
    (k) => !!begroting?.scenarios?.[k]
  );

  return (
    <div className="space-y-6">
      <Header begroting={begroting} />

      {!begroting && <GeenBegrotingPlaceholder />}

      {begroting && beschikbareScenarios.length === 0 && (
        <div className="bg-amber-50 border border-amber-200 rounded-lg p-4 text-sm text-amber-900">
          Er is een begrotingsadvies-record, maar geen enkel scenario is gevuld. Genereer scenario&apos;s
          in <strong>Cross-analyse · Stap 6 (Optimaliseren)</strong>.
        </div>
      )}

      {begroting && beschikbareScenarios.length > 0 && (
        <>
          <NotitieVoorClaude
            scope={{ kind: "globaal" }}
            titel="Algemeen — geldt voor alle scenario's"
            hint="Schrijf hier wat je wilt dat Claude leest bij de volgende ronde. Dingen die voor alle scenario's gelden (bv. een aanpassing in tarieven, een verkeerd label, structurele uitleg). Per scenario zit er onderaan elke kaart een eigen notitieblok."
          />
          <Begrippenlijst />
          <MinMidMaxToelichting />

          <ScenarioPicker
            beschikbaar={beschikbareScenarios}
            actief={openScenario}
            onPick={setOpenScenario}
            session={session}
            begroting={begroting}
          />

          <div className="space-y-4">
            {beschikbareScenarios.map((k) => (
              <ScenarioBerekeningKaart
                key={k}
                scenarioKey={k}
                begroting={begroting}
                subEffortAnalysis={subEffortAnalysis}
                open={openScenario === k}
                onToggle={() => setOpenScenario(openScenario === k ? null : k)}
              />
            ))}
          </div>
        </>
      )}
    </div>
  );
}

// ============================================================================
// Header
// ============================================================================

function Header({ begroting }: { begroting?: BegrotingAdvies }) {
  return (
    <div className="bg-gradient-to-br from-[#003366] to-[#1a4d8a] text-white rounded-xl p-6">
      <div className="text-[10px] uppercase tracking-[0.25em] text-blue-200 mb-2">
        Stap 8 — Audit van de begroting
      </div>
      <h2 className="text-2xl font-bold mb-2">Hoe komen we aan de bedragen in de begroting?</h2>
      <p className="text-sm text-blue-100 leading-relaxed max-w-3xl">
        Deze pagina laat per scenario zien hoe de begroting is opgebouwd:
      </p>
      <ul className="text-sm text-blue-100 leading-relaxed list-disc ml-5 mt-2 space-y-0.5">
        <li>hoe het jaarbudget-plafond is bepaald;</li>
        <li>hoe het scenario-totaal is opgebouwd uit de afzonderlijke inspanningen;</li>
        <li>hoe het bedrag per inspanning ontstaat (uit de kostenraming en motivatie in het dossier);</li>
        <li>hoe het over de jaren is verdeeld;</li>
        <li>welke automatische aanpassingen zijn toegepast om binnen de jaargrenzen te passen.</li>
      </ul>
      {begroting && (
        <p className="text-xs text-blue-200/80 mt-3">
          Startjaar: <strong className="text-white">{begroting.startJaar}</strong> ·
          Jaarbudget volgens Cito-richtlijn: <strong className="text-white">{formatEur(begroting.jaarlijksBudgetBasis)}</strong> ·
          Cyclus: <strong className="text-white">{begroting.cyclusMaanden} maanden</strong>
        </p>
      )}
    </div>
  );
}

function GeenBegrotingPlaceholder() {
  return (
    <div className="bg-white border-2 border-dashed border-gray-300 rounded-xl p-10 text-center">
      <p className="text-sm font-medium text-gray-700 mb-1">Nog geen begrotingsadvies</p>
      <p className="text-xs text-gray-500 max-w-md mx-auto">
        Ga naar <strong>Cross-analyse · Stap 6 (Optimaliseren)</strong> en genereer het
        begrotingsadvies. De berekeningen op deze pagina worden automatisch gevuld vanuit die data.
      </p>
    </div>
  );
}

// ============================================================================
// Begrippenlijst + Min/Mid/Max — altijd zichtbaar bovenin
// ============================================================================

function Begrippenlijst() {
  const items: Array<{ term: string; uitleg: string }> = [
    { term: "Jaarbudget-plafond", uitleg: "Het maximale bedrag dat per jaar uitgegeven mag worden voor het programma." },
    { term: "Eenmalig", uitleg: "Kosten die je één keer maakt: implementatie, opzet, opleiding, eerste licenties." },
    { term: "Structureel", uitleg: "Terugkerende jaarlijkse last: licenties, beheer, doorontwikkeling, borging." },
    { term: "Optelling", uitleg: "Bedragen van afzonderlijke componenten bij elkaar opgeteld om het hoofdtotaal te krijgen." },
    { term: "Min / Mid / Max", uitleg: "Bandbreedte van een raming. Min = gunstige aannames, Mid = middenwaarde (gehanteerd), Max = ongunstige aannames." },
    { term: "Lifecycle-curve", uitleg: "Hoe de uitgaven zich over de jaren verdelen. IT: piek in realisatie. Training: piek in vaardigheidstraining. Cultuur: lange staart voor verankering." },
    { term: "Scenario", uitleg: "Een keuze in tempo: hetzelfde programma over 4, 5, 7 of 10 jaar — andere doorlooptijd, andere piek per jaar, andere cumulatieve last." },
    { term: "Dossier-totaal", uitleg: "Het bedrag dat uit de oorspronkelijke kostenraming in het dossier volgt: eenmalige investering plus structurele last × aantal jaren." },
    { term: "Aanpassing tijdens optimalisatie", uitleg: "Wanneer het werkelijke bedrag afwijkt van het dossier-bedrag — meestal omdat interne uren apart worden geboekt in de paragraaf interne uren." },
  ];
  return (
    <details className="bg-white border border-gray-200 rounded-xl overflow-hidden">
      <summary className="cursor-pointer px-5 py-3 hover:bg-gray-50 flex items-center justify-between">
        <span className="text-sm font-semibold text-[#003366]">📖 Begrippenlijst</span>
        <span className="text-xs text-gray-500">Klik om alle termen op deze pagina te zien</span>
      </summary>
      <div className="px-5 pb-4 grid grid-cols-1 md:grid-cols-2 gap-3 text-sm">
        {items.map((item) => (
          <div key={item.term} className="border-l-2 border-[#003366]/30 pl-3">
            <p className="font-semibold text-gray-800">{item.term}</p>
            <p className="text-xs text-gray-600 mt-0.5">{item.uitleg}</p>
          </div>
        ))}
      </div>
    </details>
  );
}

function MinMidMaxToelichting() {
  return (
    <div className="rounded-xl border border-amber-300 bg-amber-50/70 p-5">
      <p className="text-sm font-semibold text-amber-900">
        Wat betekenen <span className="font-mono">Min</span> / <span className="font-mono">Mid</span> /{" "}
        <span className="font-mono">Max</span>?
      </p>
      <p className="text-xs text-amber-900/80 mt-1.5 leading-relaxed">
        Elke kostenraming heeft een <strong>onzekerheidsbandbreedte</strong>: uur-tarieven liggen
        markt-conform vast, maar het exacte aantal uren of gebruikers kan binnen een aannemelijke
        range vallen. We tonen drie waarden:
      </p>
      <div className="mt-3 grid grid-cols-1 md:grid-cols-3 gap-2 text-xs">
        <div className="rounded bg-white border border-amber-200 px-3 py-2">
          <p>
            <span className="font-mono font-semibold text-emerald-700">Min</span>{" "}
            <span className="text-gray-700">— gunstige aannames</span>
          </p>
          <p className="text-[11px] text-gray-600 mt-1">
            Ondergrens: minimum aantal uren / kleinste schaling / maximale schaalvoordelen meegenomen.
          </p>
        </div>
        <div className="rounded bg-white border-2 border-[#003366] px-3 py-2">
          <p>
            <span className="font-mono font-semibold text-[#003366]">Mid</span>{" "}
            <span className="text-gray-700">— middenwaarde (gehanteerd)</span>
          </p>
          <p className="text-[11px] text-gray-600 mt-1">
            <strong>Dit bedrag wordt gebruikt in alle scenario&apos;s</strong> en in de begroting.
            De centrale schatting waarop de stuurgroep akkoord geeft.
          </p>
        </div>
        <div className="rounded bg-white border border-amber-200 px-3 py-2">
          <p>
            <span className="font-mono font-semibold text-rose-700">Max</span>{" "}
            <span className="text-gray-700">— ongunstige aannames</span>
          </p>
          <p className="text-[11px] text-gray-600 mt-1">
            Bovengrens: ruimere uren / grotere schaling. Het verschil tussen Max en Mid is wat de risico-buffer afdekt.
          </p>
        </div>
      </div>
      <p className="text-xs text-amber-900/80 mt-3 leading-relaxed">
        <strong>Tussen scenarios verandert de inhoud niet</strong> — de Mid-bedragen per inspanning
        zijn gelijk. Wat verschilt is het <strong>aantal jaren</strong> waarover de structurele last
        wordt gespreid en wanneer pieken vallen.
      </p>
    </div>
  );
}

// ============================================================================
// Scenario-picker
// ============================================================================

function ScenarioPicker({
  beschikbaar,
  actief,
  onPick,
  begroting,
}: {
  beschikbaar: ScenarioKey[];
  actief: ScenarioKey | null;
  onPick: (k: ScenarioKey) => void;
  session: DINSession;
  begroting: BegrotingAdvies;
}) {
  return (
    <div className="bg-white border border-gray-200 rounded-xl p-4">
      <p className="text-[10px] uppercase tracking-wider font-semibold text-gray-500 mb-2">
        Snel naar scenario
      </p>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2">
        {beschikbaar.map((k) => {
          const meta = SCENARIO_META[k];
          const s = begroting.scenarios?.[k];
          const isActief = actief === k;
          return (
            <button
              key={k}
              onClick={() => onPick(k)}
              className={`text-left rounded-lg border-2 p-3 transition-all ${
                isActief
                  ? `border-current ${meta.accent} bg-white shadow-sm ring-2 ${meta.ring}`
                  : "border-gray-200 hover:border-gray-300 bg-white"
              }`}
            >
              <div className={`text-[10px] uppercase tracking-wider font-bold ${meta.accent}`}>
                {meta.label}
              </div>
              <div className="text-lg font-bold text-gray-800 mt-1 font-mono">
                {formatEurMln(s?.totaalGeraamdEuro ?? 0)}
              </div>
              <div className="text-[11px] text-gray-500 mt-0.5">
                {s?.aantalJaren ?? 0} jaar · max per jaar {formatEurMln(s?.jaarlijksBudgetEuro ?? 0)}
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
}

// ============================================================================
// Per scenario — kaart met alle secties
// ============================================================================

function ScenarioBerekeningKaart({
  scenarioKey,
  begroting,
  subEffortAnalysis,
  open,
  onToggle,
}: {
  scenarioKey: ScenarioKey;
  begroting: BegrotingAdvies;
  subEffortAnalysis: Array<{ titel?: string; domein?: string; dossier?: { kostenraming?: string } }>;
  open: boolean;
  onToggle: () => void;
}) {
  const scenario = begroting.scenarios?.[scenarioKey];
  const meta = SCENARIO_META[scenarioKey];

  if (!scenario) return null;

  const startJaar = begroting.startJaar;
  const aantalJaren = scenario.aantalJaren;
  const cap = scenario.jaarlijksBudgetEuro;
  const totaalScenario = scenario.totaalGeraamdEuro;
  const inspanningen = scenario.inspanningen ?? [];

  const sumInspanningen = inspanningen.reduce((s, i) => s + (i.totaalEuro ?? 0), 0);
  const sumJaartotalen = (scenario.totalenPerJaar ?? []).reduce((s, t) => s + t.euro, 0);
  const tol = tolerantie(totaalScenario);
  const allOk =
    Math.abs(sumInspanningen - totaalScenario) <= tol &&
    Math.abs(sumJaartotalen - totaalScenario) <= tol &&
    (scenario.totalenPerJaar ?? []).every((t) => {
      const effectieveCap = t.jaar === startJaar ? Math.max(cap, 250_000) : cap;
      return t.euro <= effectieveCap * 1.001;
    }) &&
    inspanningen.every((insp) => {
      const sum = (insp.verdelingPerJaar ?? []).reduce((s, v) => s + (v.euro ?? 0), 0);
      return Math.abs(sum - (insp.totaalEuro ?? 0)) <= tolerantie(insp.totaalEuro ?? 0);
    });

  return (
    <div className="bg-white border border-gray-200 rounded-xl overflow-hidden">
      <button
        onClick={onToggle}
        className={`w-full ${meta.band} text-white px-5 py-3 flex items-center justify-between text-left`}
      >
        <div>
          <div className="text-[10px] uppercase tracking-[0.2em] opacity-80">{meta.label}</div>
          <div className="text-base font-bold mt-0.5">
            {formatEurMln(totaalScenario)}
            <span className="text-xs font-normal opacity-80 ml-2">
              over {aantalJaren} jaar ({startJaar}–{startJaar + aantalJaren - 1}) · plafond{" "}
              {formatEurMln(cap)}/jaar
            </span>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <span
            className={`text-[10px] uppercase tracking-wider font-bold px-2 py-1 rounded ${
              allOk ? "bg-emerald-500/30 text-emerald-50" : "bg-red-500/40 text-red-50"
            }`}
          >
            {allOk ? "✓ klopt" : "⚠ controleren"}
          </span>
          <svg
            className={`w-5 h-5 transition-transform ${open ? "rotate-180" : ""}`}
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
          </svg>
        </div>
      </button>

      {open && (
        <div className="p-5 space-y-7">
          <SectieA
            scenarioKey={scenarioKey}
            scenario={scenario}
            startJaar={startJaar}
            jaarlijksBudgetBasis={begroting.jaarlijksBudgetBasis}
          />
          <SectieB
            scenario={scenario}
            inspanningen={inspanningen}
            sumInspanningen={sumInspanningen}
            totaalScenario={totaalScenario}
            tol={tol}
          />
          <SectieC
            inspanningen={inspanningen}
            subEffortAnalysis={subEffortAnalysis}
            scenario={scenario}
            startJaar={startJaar}
          />
          <SectieD
            scenario={scenario}
            cap={cap}
            startJaar={startJaar}
            aantalJaren={aantalJaren}
          />
          <SectieE
            scenario={scenario}
            sumInspanningen={sumInspanningen}
            sumJaartotalen={sumJaartotalen}
            totaalScenario={totaalScenario}
            cap={cap}
            tol={tol}
            inspanningen={inspanningen}
            startJaar={startJaar}
          />

          <NotitieVoorClaude
            scope={{ kind: "scenario", scenarioKey }}
            titel={`Scenario: ${meta.label}`}
            hint="Notities die alleen voor dit scenario gelden. Bijvoorbeeld: een specifiek bedrag dat hier afwijkt, een berekening die alleen in dit tempo onlogisch wordt, of een sectie die alleen voor dit scenario aanpassing nodig heeft."
          />
        </div>
      )}
    </div>
  );
}

// ============================================================================
// Sectie A — Hoe is dit scenario tot stand gekomen?
// ============================================================================

function SectieA({
  scenarioKey,
  scenario,
  startJaar,
  jaarlijksBudgetBasis,
}: {
  scenarioKey: ScenarioKey;
  scenario: BegrotingScenario;
  startJaar: number;
  jaarlijksBudgetBasis: number;
}) {
  const meta = SCENARIO_META[scenarioKey];
  const cap = scenario.jaarlijksBudgetEuro;
  const aantalJaren = scenario.aantalJaren;

  let capFormule: string;
  if (scenarioKey === "optimaal") {
    capFormule = `afgerond op duizend van Cito-norm = ${formatEur(jaarlijksBudgetBasis)} → ${formatEur(cap)}`;
  } else if (scenarioKey === "plus20") {
    capFormule = `${formatEur(jaarlijksBudgetBasis)} × 1,20 = ${formatEur(jaarlijksBudgetBasis * 1.2)} → afgerond ${formatEur(cap)}`;
  } else if (scenarioKey === "min20") {
    capFormule = `${formatEur(jaarlijksBudgetBasis)} × 0,80 = ${formatEur(jaarlijksBudgetBasis * 0.8)} → afgerond ${formatEur(cap)}`;
  } else {
    capFormule = `Het kortste scenario in 3 tot 5 jaar dat nog bekostbaar is voor Cito. Bekostbaar betekent: jaarbudget mag maximaal 40% bovenop de Cito-norm liggen — dus maximaal ${formatEur(jaarlijksBudgetBasis * 1.4)}/jaar (= ${formatEur(jaarlijksBudgetBasis)} × 1,40). Voor dit scenario: ${formatEur(cap)}/jr × ${aantalJaren} jaar = ${formatEur(cap * aantalJaren)} totaal.`;
  }

  return (
    <div>
      <SectieKop nummer="A" titel="Scenario-input — hoe zijn de parameters bepaald?" />
      <div className="rounded-lg border border-gray-200 bg-gray-50/50 p-4 space-y-4">
        <p className="text-sm text-gray-700 leading-relaxed">
          <strong>{meta.label}.</strong> {meta.uitleg}
        </p>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Stat label="Jaarbudget-plafond" value={formatEur(cap)} sub="per jaar" mono />
          <Stat
            label="Aantal jaren"
            value={`${aantalJaren} jaar`}
            sub={`${startJaar}–${startJaar + aantalJaren - 1}`}
          />
        </div>

        <div className="rounded bg-white border border-gray-200 p-3 text-xs space-y-2">
          <div>
            <p className="font-semibold text-gray-700 mb-0.5">Hoe is het jaarbudget-plafond berekend?</p>
            <p className="text-gray-600 font-mono">{capFormule}</p>
          </div>
          <div>
            <p className="font-semibold text-gray-700 mb-0.5">Hoe is het aantal jaren bepaald?</p>
            <p className="text-gray-600">
              {scenarioKey === "advies" ? (
                <>Het kortste haalbare scenario binnen 3 tot 5 jaar dat alle dossier-totalen kan dekken binnen het jaarbudget. De rekenkundige uitkomst kan een fractie zijn (bijvoorbeeld 3,5 jaar); deze wordt naar boven afgerond naar hele jaren omdat planning in hele jaren werkt. Resultaat voor dit scenario: <strong>{aantalJaren} jaar</strong>.</>
              ) : (
                <>Berekend als minimum aantal jaren waarop alle dossier-totalen (eenmalig + structureel × jaren) passen binnen het jaarlijkse plafond. Hoe groter de geraamde middenwaarden en/of hoe kleiner het plafond, des te meer jaren nodig. Resultaat: <strong>{aantalJaren} jaar</strong>.</>
              )}
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-1 gap-3">
          <Stat
            label="Scenario-totaal (begroot)"
            value={formatEur(scenario.totaalGeraamdEuro)}
            sub="dit is wat we aanvragen — som van alle inspanningen"
            mono
          />
        </div>

        <div className="rounded bg-blue-50/50 border border-blue-200 p-3 text-xs text-gray-700 leading-relaxed">
          <strong className="text-blue-900">Waarom een uitloop:</strong> we plannen het scenario in
          hele jaren omdat de praktijk leert dat er altijd onverwachte zaken bij komen — ziekte,
          ad-hoc urgente prioriteiten, vertraging bij externe partners. Het rekenkundige minimum
          (bijvoorbeeld 3,5 jaar) wordt daarom naar boven afgerond naar hele jaren ({aantalJaren}{" "}
          jaar in dit scenario), zodat er ruimte is voor dit soort onvoorzienheden zonder dat het
          eindresultaat in gevaar komt.
        </div>
      </div>
    </div>
  );
}

// ============================================================================
// Sectie B — Optelling van inspanningen tot scenario-totaal
// ============================================================================

function SectieB({
  scenario,
  inspanningen,
  sumInspanningen,
  totaalScenario,
  tol,
}: {
  scenario: BegrotingScenario;
  inspanningen: InspanningBegroting[];
  sumInspanningen: number;
  totaalScenario: number;
  tol: number;
}) {
  const sortedByRank = [...inspanningen].sort(
    (a, b) => (a.volgorde?.rank ?? 99) - (b.volgorde?.rank ?? 99)
  );
  const matchOk = Math.abs(sumInspanningen - totaalScenario) <= tol;

  return (
    <div>
      <SectieKop
        nummer="B"
        titel="Optelling: scenario-totaal opbouw"
        hint="Tel alle inspanningen op, gesorteerd op prioriteit. Moet exact het scenario-totaal zijn."
      />
      <div className="space-y-2">
        {sortedByRank.map((insp, idx) => (
          <InspanningRangoorde
            key={insp.inspanningTitel}
            insp={insp}
            idx={idx}
            totaalScenario={totaalScenario}
          />
        ))}
        <div className="border-t-2 border-[#003366] pt-2 mt-3 flex items-center justify-between font-mono text-sm">
          <span className="font-semibold text-gray-700">Totaal alle inspanningen</span>
          <span className="font-bold text-[#003366]">{formatEur(sumInspanningen)}</span>
        </div>
        <div className="flex items-center justify-between text-xs text-gray-500">
          <span>Scenario-totaal (referentie)</span>
          <span className="font-mono">{formatEur(totaalScenario)}</span>
        </div>
        {!matchOk && (
          <div className="rounded bg-red-50 border border-red-200 p-2 text-xs text-red-800">
            ⚠ Verschil van {formatEur(Math.abs(sumInspanningen - totaalScenario))} — groter dan de toegestane afwijking ({formatEur(tol)}).
          </div>
        )}
      </div>
      {scenario.samenvatting && (
        <p className="mt-3 text-xs text-gray-600 italic leading-relaxed">
          <strong className="not-italic text-gray-700">Samenvatting van het scenario:</strong> {scenario.samenvatting}
        </p>
      )}
    </div>
  );
}

function InspanningRangoorde({
  insp,
  idx,
  totaalScenario,
}: {
  insp: InspanningBegroting;
  idx: number;
  totaalScenario: number;
}) {
  const rank = insp.volgorde?.rank ?? idx + 1;
  const reden = insp.volgorde?.reden ?? "";
  const percentage = totaalScenario > 0 ? (insp.totaalEuro / totaalScenario) * 100 : 0;
  return (
    <div className={`rounded-lg border p-3 ${DOMAIN_BG[insp.domein] ?? "bg-gray-50 border-gray-200"}`}>
      <div className="flex items-start gap-3">
        <div className="flex-shrink-0 w-8 h-8 rounded-full bg-white border-2 border-current flex items-center justify-center font-bold text-sm">
          {rank}
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-baseline gap-2 flex-wrap">
            <span className={`w-2 h-2 rounded-full ${DOMAIN_DOT[insp.domein] ?? "bg-gray-400"}`} />
            <span className="font-semibold text-sm text-gray-800">{insp.inspanningTitel}</span>
            <span className="text-[11px] text-gray-500">({DOMAIN_LABEL[insp.domein] ?? insp.domein})</span>
          </div>
          {reden && <p className="text-xs text-gray-600 mt-1 italic leading-snug">&ldquo;{reden}&rdquo;</p>}
          <div className="mt-1.5 flex items-center gap-3">
            <div className="flex-1 h-1.5 bg-white rounded-full overflow-hidden">
              <div
                className={`h-full ${DOMAIN_DOT[insp.domein] ?? "bg-gray-400"}`}
                style={{ width: `${Math.min(100, percentage)}%` }}
              />
            </div>
            <span className="text-[11px] text-gray-500 font-mono w-10 text-right">
              {Math.round(percentage)}%
            </span>
          </div>
        </div>
        <div className="text-right flex-shrink-0">
          <div className="font-mono font-bold text-gray-900">{formatEur(insp.totaalEuro)}</div>
        </div>
      </div>
    </div>
  );
}

// ============================================================================
// Sectie C — Per inspanning de complete keten
// ============================================================================

function SectieC({
  inspanningen,
  subEffortAnalysis,
  scenario,
  startJaar,
}: {
  inspanningen: InspanningBegroting[];
  subEffortAnalysis: Array<{ titel?: string; domein?: string; dossier?: { kostenraming?: string } }>;
  scenario: BegrotingScenario;
  startJaar: number;
}) {
  return (
    <div>
      <SectieKop
        nummer="C"
        titel="Per inspanning — van dossier tot scenario-bedrag"
        hint="Voor elke inspanning de complete keten: kostenraming uit dossier → motivatie met componenten → berekening dossier-totaal → werkelijk in scenario → verdeling per jaar."
      />
      <div className="space-y-3">
        {inspanningen.map((insp) => (
          <InspanningKeten
            key={insp.inspanningTitel}
            insp={insp}
            kostenramingTekst={
              subEffortAnalysis.find(
                (s) =>
                  (s.titel ?? "").toLowerCase() === insp.inspanningTitel.toLowerCase()
              )?.dossier?.kostenraming ?? ""
            }
            scenario={scenario}
            startJaar={startJaar}
          />
        ))}
      </div>
    </div>
  );
}

function InspanningKeten({
  insp,
  kostenramingTekst,
  scenario,
  startJaar,
}: {
  insp: InspanningBegroting;
  kostenramingTekst: string;
  scenario: BegrotingScenario;
  startJaar: number;
}) {
  const aantalJaren = scenario.aantalJaren;
  const parsed: ParsedDossierRaming = useMemo(
    () => parseDossierRaming(kostenramingTekst),
    [kostenramingTekst]
  );
  const knownBreakdown = useMemo(
    () => vindKnownBreakdown(insp.inspanningTitel),
    [insp.inspanningTitel]
  );

  const isOverig = insp.domein === "overig";

  return (
    <details className={`rounded-lg border-2 overflow-hidden ${DOMAIN_BG[insp.domein] ?? "bg-gray-50 border-gray-200"}`}>
      <summary className="cursor-pointer px-4 py-3 hover:bg-white/50 list-none">
        <div className="flex items-center gap-3">
          <span className={`w-2 h-2 rounded-full ${DOMAIN_DOT[insp.domein] ?? "bg-gray-400"}`} />
          <div className="flex-1 min-w-0">
            <span className="font-semibold text-sm text-gray-800">{insp.inspanningTitel}</span>
            <span className="text-[11px] text-gray-500 ml-2">({DOMAIN_LABEL[insp.domein] ?? insp.domein})</span>
          </div>
          <span className="font-mono text-sm font-semibold text-gray-900">{formatEur(insp.totaalEuro)}</span>
        </div>
      </summary>

      <div className="px-5 pb-5 pt-1 space-y-5 bg-white border-t border-current/20">
        {/* C1: Letterlijke kostenraming-tekst uit het dossier. Geen
            range-samenvatting of breakdown — die staan in C2, want één
            plek waar bedragen worden opgebouwd voorkomt verwarring. */}
        {!isOverig && (
          <SubSectie nummer="C1" titel="Uit het dossier — wat zegt de kostenraming?">
            {kostenramingTekst ? (
              <>
                <div className="rounded bg-gray-50 border border-gray-200 p-3 text-sm leading-relaxed text-gray-700">
                  <TekstMetEuroHighlights tekst={kostenramingTekst} />
                </div>
                <PMBufferDisclaimer tekst={kostenramingTekst} />
                <p className="text-[11px] text-gray-500 italic">
                  Dit is het letterlijke citaat uit het dossier. De uitsplitsing van de bedragen — eenmalig en structureel, per component, met berekening en bron — staat in <strong>C2</strong> hieronder.
                </p>
              </>
            ) : (
              <p className="text-xs text-gray-500 italic">
                Geen kostenraming-tekst gevonden in dossier voor deze inspanning.
              </p>
            )}
          </SubSectie>
        )}

        {/* C2: Motivatie */}
        <SubSectie
          nummer={isOverig ? "C1" : "C2"}
          titel={isOverig ? "Onderbouwing van de post" : "Motivatie & onderbouwing — hoe komt het bedrag tot stand?"}
        >
          <MotivatiePaneel motivatie={insp.motivatie} inspanningTitel={insp.inspanningTitel} aantalJaren={aantalJaren} />
        </SubSectie>

        {/* C3: Bedrag in dit scenario — toon de optelsom die sluit op het
            werkelijke scenariobedrag. Voor inspanningen met een known-
            breakdown (mens, processen, leiderschap) gebruiken we die als
            bron — eenmalig + per structurele component (bedrag × actieve
            jaren, op basis van vanafJaar). Voor inspanningen zonder
            known-breakdown (CRM) vallen we terug op parseDossierRaming uit
            de kostenraming-tekst. */}
        <SubSectie
          nummer={isOverig ? "C2" : "C3"}
          titel="Bedrag in dit scenario"
        >
          <C3Samenstelling
            insp={insp}
            isOverig={isOverig}
            parsed={parsed}
            knownBreakdown={knownBreakdown}
            aantalJaren={aantalJaren}
          />
        </SubSectie>

        {/* C4 (was C5): Verdeling per jaar */}
        <SubSectie
          nummer={isOverig ? "C3" : "C4"}
          titel="Verdeling per jaar"
          hint="Hoe is het inspanning-totaal over de jaren verdeeld? Per regel: bedrag, fase, percentage."
        >
          <VerdelingPerJaarTabel insp={insp} startJaar={startJaar} aantalJaren={aantalJaren} />
        </SubSectie>
      </div>
    </details>
  );
}

function C3Samenstelling({
  insp,
  isOverig,
  parsed,
  knownBreakdown,
  aantalJaren,
}: {
  insp: InspanningBegroting;
  isOverig: boolean;
  parsed: ParsedDossierRaming;
  knownBreakdown: ReturnType<typeof vindKnownBreakdown>;
  aantalJaren: number;
}) {
  const werkelijk = insp.totaalEuro ?? 0;

  // Bepaal eenmalig + structureel cumulatief.
  // 1. Voor inspanningen met een known-breakdown gebruiken we die (sluit
  //    typisch op de motivatie en daarmee op het werkelijke scenariobedrag).
  // 2. Anders fallback op parseDossierRaming (eenmalig × structureleJaren).
  let eenmaligMid = 0;
  let structureelCumul = 0;
  let structureelDetail: { naam: string; bedrag: number; jaren: number }[] = [];
  let bron: "known" | "parsed" | "geen" = "geen";

  if (knownBreakdown?.eenmalig) {
    bron = "known";
    eenmaligMid =
      (knownBreakdown.eenmalig.hoofdtotaalLow + knownBreakdown.eenmalig.hoofdtotaalHigh) / 2;
    if (knownBreakdown.structureel) {
      structureelCumul = structureelCumulatiefMid(knownBreakdown, aantalJaren);
      structureelDetail = knownBreakdown.structureel.subComponenten.map((c) => {
        const start = c.vanafJaar ?? 1;
        const jaren = Math.max(0, aantalJaren - start + 1);
        return { naam: c.naam, bedrag: c.bedragMid, jaren };
      });
    }
  } else if (parsed.eenmaligMid > 0 || parsed.structureelMidPerJr > 0) {
    bron = "parsed";
    eenmaligMid = parsed.eenmaligMid;
    const sJ = Math.max(0, aantalJaren - 1);
    structureelCumul = parsed.structureelMidPerJr * sJ;
    if (parsed.structureelMidPerJr > 0) {
      structureelDetail = [
        { naam: "Structureel (gemiddeld per jaar)", bedrag: parsed.structureelMidPerJr, jaren: sJ },
      ];
    }
  }

  const som = eenmaligMid + structureelCumul;
  const verschil = werkelijk - som;
  const verschilPct = som > 0 ? Math.round((verschil / som) * 100) : 0;
  const sluitGoed = som > 0 && Math.abs(verschilPct) <= 10;

  return (
    <div className="rounded-lg border border-gray-200 bg-white p-4 space-y-3">
      {!isOverig && bron !== "geen" && (
        <div className="rounded bg-gray-50/70 border border-gray-200 p-3 font-mono text-xs space-y-1">
          <p className="text-[10px] uppercase tracking-wider font-bold text-gray-700 font-sans mb-1.5">
            Hoe het bedrag is opgebouwd
          </p>
          <div className="flex items-baseline justify-between">
            <span>Eenmalig (mid)</span>
            <span>{formatEur(eenmaligMid)}</span>
          </div>
          {structureelDetail.map((s, i) => (
            <div key={i} className="flex items-baseline justify-between">
              <span className="pr-2">
                + {s.naam}: {formatEur(s.bedrag)}/jr × {s.jaren} {s.jaren === 1 ? "jaar" : "jaren"}
              </span>
              <span>{formatEur(s.bedrag * s.jaren)}</span>
            </div>
          ))}
          <div className="border-t border-gray-300 pt-1 mt-1 flex items-baseline justify-between text-gray-600">
            <span>Som eenmalig + structureel cumulatief</span>
            <span>{formatEur(som)}</span>
          </div>
        </div>
      )}
      <div className="flex items-baseline justify-between border-t border-gray-200 pt-3">
        <span className="text-sm text-gray-600">
          {isOverig ? "Inspanning-totaal voor dit scenario" : "Inspanning-totaal in §4.1 begroting"}
        </span>
        <span className="font-mono font-bold text-lg text-gray-900">{formatEur(werkelijk)}</span>
      </div>
      {!isOverig && bron !== "geen" && (
        <div
          className={`text-xs rounded px-2 py-1 inline-block ${
            sluitGoed
              ? "bg-emerald-50 text-emerald-800 border border-emerald-200"
              : "bg-amber-50 text-amber-900 border border-amber-200"
          }`}
        >
          {sluitGoed
            ? `✓ Som sluit aan op begroting (verschil ${formatEur(verschil)}, ${verschilPct}%) — kleine bijstelling door optimalisatie binnen jaarbudget-plafond.`
            : `Verschil met begroting: ${formatEur(verschil)} (${verschilPct > 0 ? "+" : ""}${verschilPct}%) — wijst op optimalisatie of een afwijkende basis. Zie de motivatie hieronder voor de exacte samenstelling.`}
        </div>
      )}
      <p className="text-xs text-gray-500 italic">
        {isOverig
          ? "Deze post heeft geen dossier-raming; het bedrag volgt uit een vaste formule (ongeveer 10% van de basisraming als reserve voor onvoorziene zaken — bij het krappe scenario kan deze reserve op nul uitkomen omdat het jaarbudget al volledig benut is)."
          : "Eventuele bandbreedte op de onderliggende ramingen wordt programma-breed opgevangen via de aparte post onvoorzien. Interne uren zijn niet in deze §4.1 begroting opgenomen — die worden in stap 7 (§4.2 Interne uren) apart berekend."}
      </p>
    </div>
  );
}

function PMBufferDisclaimer({ tekst }: { tekst: string }) {
  // Detecteert vermeldingen van een "PM-buffer" of "worst-case plafond" in
  // de kostenraming-tekst. Het dossier benoemt soms een buffer (typisch
  // 30%) als afhankelijkheids-disclaimer voor open vraagstukken (bv.
  // platformkeuze, juridische ontvlechting). Dat is bewust GEEN onderdeel
  // van de scenariobedragen — de programma-brede post onvoorzien vangt
  // bandbreedte op. Hier maken we expliciet dat het puur informatief is.
  const heeftPMBuffer = /pm.?buffer|worst.?case\s*plafond/i.test(tekst);
  if (!heeftPMBuffer) return null;
  return (
    <div className="rounded-lg border-2 border-blue-300 bg-blue-50 p-3 text-xs text-blue-900 leading-relaxed">
      <p className="font-semibold mb-1">
        Let op — de PM-buffer en het worst-case plafond uit de tekst hierboven
        zitten <em>niet</em> in de scenariobedragen.
      </p>
      <p>
        De buffer is een afhankelijkheids-toelichting in het dossier voor
        situaties waarin een externe factor (bv. juridisch-technische
        ontvlechting van Stichting Cito of de definitieve platformkeuze) nog
        open is. Eventuele bandbreedte wordt programma-breed opgevangen via
        de aparte post onvoorzien (zie B). Als die externe factoren anders
        uitvallen — bijvoorbeeld als de Stichting meebetaalt — verandert de
        raming alsnog en wordt deze opnieuw opgesteld.
      </p>
    </div>
  );
}

function ParserOutputPaneel({
  parsed,
}: {
  parsed: ParsedDossierRaming;
}) {
  if (parsed.unparsed) {
    return (
      <div className="rounded bg-amber-50 border border-amber-200 p-3 text-xs text-amber-800">
        ⚠ De kostenraming-tekst kon niet automatisch worden geparseerd. Het scenario valt terug op een kwalitatieve schatting.
      </div>
    );
  }
  return (
    <div className="rounded border border-gray-200 bg-white p-3 text-xs">
      <p className="font-semibold text-gray-700 mb-2">Samenvatting van bovenstaande tekst (basis voor scenario-berekening):</p>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <div>
          <p className="text-[10px] uppercase tracking-wider text-gray-500">Eenmalig</p>
          <p className="font-mono">
            {formatEur(parsed.eenmaligLow)} – {formatEur(parsed.eenmaligHigh)}
          </p>
          <p className="text-gray-500">middenwaarde {formatEur(parsed.eenmaligMid)}</p>
        </div>
        <div>
          <p className="text-[10px] uppercase tracking-wider text-gray-500">Structureel per jaar</p>
          {parsed.structureelMidPerJr > 0 ? (
            <>
              <p className="font-mono">
                {formatEur(parsed.structureelLowPerJr)} – {formatEur(parsed.structureelHighPerJr)}/jr
              </p>
              <p className="text-gray-500">middenwaarde {formatEur(parsed.structureelMidPerJr)}/jr</p>
            </>
          ) : (
            <p className="text-gray-500 italic">geen structurele kosten geraamd</p>
          )}
        </div>
      </div>
    </div>
  );
}

function MotivatiePaneel({ motivatie, inspanningTitel, aantalJaren }: { motivatie: string; inspanningTitel: string; aantalJaren: number }) {
  if (!motivatie?.trim()) {
    return <p className="text-xs text-gray-500 italic">Geen motivatie beschikbaar.</p>;
  }
  // Toon alleen de motivatie-INLEIDING (kwalitatieve context) — niet de
  // dossier-onderbouwing-tekst die door AI is gegenereerd in stap 6 en
  // mogelijk niet meer resoneert met de actuele breakdown-tabel. De tabel
  // (BreakdownPaneel) is leidend voor cijfers; resoneert met C3.
  const { inleiding, onderbouwing } = splitMotivatie(motivatie);
  return (
    <div className="space-y-3">
      {inleiding && (
        <div className="text-sm text-gray-700 leading-relaxed">
          <TekstMetEuroHighlights tekst={inleiding} />
        </div>
      )}
      {onderbouwing && (
        <BreakdownPaneel tekst={onderbouwing} bron="motivatie" inspanningTitel={inspanningTitel} aantalJaren={aantalJaren} />
      )}
    </div>
  );
}

// ============================================================================
// BreakdownPaneel — render een uitsplitsing-tabel uit een tekst
// ============================================================================
//
// Pakt parseBreakdown(tekst) en toont per blok (eenmalig / structureel) een
// tabel met sub-componenten en Σ-check. Toont ALLEEN wanneer de parser een
// netjes-aansluitende uitsplitsing oplevert (zodat we geen verkeerde tabel
// tonen wanneer de tekst geen duidelijke breakdown heeft).

function BreakdownPaneel({
  tekst,
  bron,
  inspanningTitel,
  aantalJaren,
}: {
  tekst: string;
  bron: "kostenraming" | "motivatie";
  inspanningTitel: string;
  aantalJaren?: number;
}) {
  const parsed: ParsedBreakdown = useMemo(() => parseBreakdown(tekst), [tekst]);

  // Known-breakdown krijgt VOORRANG boven parser. Reden: known-breakdown is
  // de bron die ook in C3 wordt gebruikt voor de optelsom; door hier ook
  // known te tonen klopt C2 met C3. Parser is fallback voor inspanningen
  // zonder known-breakdown. Alleen toegepast op de motivatie — kostenraming
  // toont geen breakdown-tabel meer (alleen tekst + range-samenvatting).
  const known = bron === "motivatie" ? vindKnownBreakdown(inspanningTitel) : null;

  const parsedEenmaligToon = !parsed.unparsed && parsed.eenmalig?.sluitNetjesAan && parsed.eenmalig.subComponenten.length >= 2;
  const parsedStructureelToon = !parsed.unparsed && parsed.structureel?.sluitNetjesAan && parsed.structureel.subComponenten.length >= 2;

  const eenmaligSection: BreakdownSection | null =
    known?.eenmalig
      ? knownSectionAlsBreakdown(known.eenmalig, "eenmalig")
      : parsedEenmaligToon && parsed.eenmalig
      ? parsed.eenmalig
      : null;

  const structureelSection: BreakdownSection | null =
    known?.structureel
      ? knownSectionAlsBreakdown(known.structureel, "structureel")
      : parsedStructureelToon && parsed.structureel
      ? parsed.structureel
      : null;

  if (!eenmaligSection && !structureelSection) return null;

  // Bouw header-tekst met expliciet hoofdtotaal voor zowel eenmalig als
  // structureel, zodat direct duidelijk is wat we gaan opbouwen in de tabel.
  const eenmaligLabel = eenmaligSection
    ? `${formatEur(eenmaligSection.hoofdtotaalLow)}–${formatEur(eenmaligSection.hoofdtotaalHigh)} eenmalig`
    : null;
  const structureelLabel = structureelSection
    ? `${formatEur(structureelSection.hoofdtotaalLow)}–${formatEur(structureelSection.hoofdtotaalHigh)}/jr structureel`
    : null;
  const headerSamenvatting = [eenmaligLabel, structureelLabel].filter(Boolean).join(" + ");

  return (
    <div className="rounded-lg border-2 border-emerald-300 bg-emerald-50/40 p-4 space-y-3">
      <div>
        <p className="text-[10px] uppercase tracking-wider font-bold text-emerald-900">
          Hoe komt het bedrag tot stand?
        </p>
        <p className="text-sm font-bold text-emerald-950 mt-0.5">{headerSamenvatting}</p>
        <p className="text-[11px] text-emerald-900/70 italic mt-0.5">
          Per component: bedrag uit motivatie, met formule, tarief-bron en aantal-bron. De optelsom hieronder is de input voor C3.
        </p>
      </div>
      {known?.disclaimer && (
        <div className="rounded-lg border border-amber-300 bg-amber-50 p-3 text-xs text-amber-900 leading-relaxed">
          <span className="font-semibold">Toelichting bij deze breakdown: </span>
          {known.disclaimer}
        </div>
      )}
      {eenmaligSection && (
        <BreakdownTabel section={eenmaligSection} inspanningTitel={inspanningTitel} aantalJaren={aantalJaren} known={known} />
      )}
      {structureelSection && (
        <BreakdownTabel section={structureelSection} inspanningTitel={inspanningTitel} aantalJaren={aantalJaren} known={known} />
      )}
    </div>
  );
}

function BreakdownTabel({
  section,
  inspanningTitel,
  aantalJaren,
  known,
}: {
  section: BreakdownSection;
  inspanningTitel: string;
  aantalJaren?: number;
  known?: ReturnType<typeof vindKnownBreakdown>;
}) {
  const eenheid = section.label === "structureel" ? "/jr" : "";
  const titel = section.label === "structureel" ? "Structureel per jaar" : "Eenmalig";

  function fmtRange(low: number, high: number): string {
    if (low === high) return formatEur(low);
    return `${formatEur(low)} – ${formatEur(high)}`;
  }

  // Filter componenten met vanafJaar > aantalJaren — die dragen €0 bij in
  // dit scenario en zouden alleen verwarring scheppen (bv. "Onboarding
  // vanaf jaar 5" in een 4-jarig advies-scenario).
  const subs =
    aantalJaren && section.label === "structureel"
      ? section.subComponenten.filter((c) => {
          // Pak vanafJaar uit known-breakdown indien beschikbaar (parser
          // kent geen vanafJaar). Mapping op naam-substring (lowercase).
          const knownComp = known?.structureel?.subComponenten.find((kc) =>
            c.naam.toLowerCase().includes(kc.naam.toLowerCase().slice(0, 20)) ||
            kc.naam.toLowerCase().includes(c.naam.toLowerCase().slice(0, 20)),
          );
          const vanaf = knownComp?.vanafJaar ?? c.vanafJaar ?? 1;
          return vanaf <= aantalJaren;
        })
      : section.subComponenten;

  // Cumulatief structureel-totaal voor lange scenarios — directeur ziet
  // dan ook wat €X/jr betekent over de looptijd.
  let cumulatiefMid = 0;
  let cumulatiefBron: string | null = null;
  if (aantalJaren && section.label === "structureel" && known?.structureel) {
    for (const kc of known.structureel.subComponenten) {
      const start = kc.vanafJaar ?? 1;
      const actiefJaren = Math.max(0, aantalJaren - start + 1);
      cumulatiefMid += kc.bedragMid * actiefJaren;
    }
    cumulatiefBron = `Cumulatief over ${aantalJaren} jaren (per component bedrag × actieve jaren): ${formatEur(cumulatiefMid)}`;
  }

  return (
    <div className="rounded-lg border border-gray-200 bg-white overflow-hidden">
      <div className="bg-gray-50 px-3 py-2 border-b border-gray-200">
        <p className="text-[11px] uppercase tracking-wider font-bold text-gray-700">{titel}</p>
        <p className="text-base font-bold text-gray-900 font-mono mt-0.5">
          {fmtRange(section.hoofdtotaalLow, section.hoofdtotaalHigh)}{eenheid}
        </p>
      </div>
      <table className="w-full text-xs">
        <thead className="bg-gray-50/50">
          <tr className="text-left uppercase tracking-wider text-[10px] text-gray-500 border-t border-gray-200">
            <th className="px-3 py-1.5 font-semibold">Component</th>
            <th className="px-3 py-1.5 font-semibold text-right">Bedrag</th>
          </tr>
        </thead>
        <tbody>
          {subs.map((c, i) => {
            const redenering = vindRedenering(inspanningTitel, c.naam);
            const berekeningTekst = c.formule ?? redenering?.berekening ?? null;
            const knownComp = known?.structureel?.subComponenten.find((kc) =>
              c.naam.toLowerCase().includes(kc.naam.toLowerCase().slice(0, 20)) ||
              kc.naam.toLowerCase().includes(c.naam.toLowerCase().slice(0, 20)),
            );
            const vanafJaarEffectief = knownComp?.vanafJaar ?? c.vanafJaar;
            return (
              <tr key={i} className="border-t border-gray-100 hover:bg-gray-50/50 align-top">
                <td className="px-3 py-2 text-gray-800">
                  <div className="font-medium">{c.naam}</div>
                  {berekeningTekst && (
                    <div className="text-[11px] text-blue-700 mt-1 leading-relaxed">
                      <span className="font-semibold">Berekening:</span> {berekeningTekst}
                    </div>
                  )}
                  {redenering?.tariefBron && (
                    <div className="text-[10px] text-gray-500 mt-0.5 italic leading-relaxed">
                      <span className="not-italic font-semibold">Tarief-bron:</span> {redenering.tariefBron}
                    </div>
                  )}
                  {redenering?.aantalBron && (
                    <div className="text-[10px] text-gray-500 mt-0.5 italic leading-relaxed">
                      <span className="not-italic font-semibold">Aantal-bron:</span> {redenering.aantalBron}
                    </div>
                  )}
                  {section.label === "structureel" && vanafJaarEffectief && vanafJaarEffectief > 1 && aantalJaren && (
                    <div className="text-[10px] text-gray-500 mt-0.5">
                      Vanaf jaar {vanafJaarEffectief} = {Math.max(0, aantalJaren - vanafJaarEffectief + 1)} actieve jaren in dit scenario
                    </div>
                  )}
                </td>
                <td className="px-3 py-2 text-right font-mono text-gray-700 whitespace-nowrap">
                  {fmtRange(c.bedragLow, c.bedragHigh)}{eenheid}
                </td>
              </tr>
            );
          })}
        </tbody>
        <tfoot>
          <tr className="bg-emerald-50/60 border-t-2 border-emerald-200">
            <td className="px-3 py-1.5 text-right font-bold text-emerald-900">Hoofdtotaal</td>
            <td className="px-3 py-1.5 text-right font-mono font-bold text-emerald-900">
              {fmtRange(section.hoofdtotaalLow, section.hoofdtotaalHigh)}{eenheid}
            </td>
          </tr>
          {cumulatiefBron && cumulatiefMid > 0 && (
            <tr className="bg-gray-50 border-t border-gray-200">
              <td colSpan={2} className="px-3 py-1.5 text-[11px] text-gray-600 italic">
                {cumulatiefBron}
              </td>
            </tr>
          )}
        </tfoot>
      </table>
    </div>
  );
}

function TekstMetEuroHighlights({ tekst }: { tekst: string }) {
  const segments = useMemo(() => segmentText(tekst), [tekst]);
  return (
    <span>
      {segments.map((seg, i) => {
        if (seg.type === "text") return <span key={i}>{seg.content}</span>;
        const e = seg.euro as EuroMatch;
        const isPerJaar = e.isPerJaar;
        const cls = isPerJaar
          ? "bg-emerald-100 border border-emerald-300 text-emerald-900"
          : "bg-yellow-100 border border-yellow-300 text-yellow-900";
        return (
          <span
            key={i}
            className={`inline-block px-1.5 py-0.5 rounded font-mono text-[12px] font-semibold mx-0.5 ${cls}`}
            title={isPerJaar ? "Structurele last per jaar" : "Eenmalig bedrag"}
          >
            {seg.content}
            {isPerJaar && <span className="text-[9px] ml-0.5 opacity-70">/jr</span>}
          </span>
        );
      })}
    </span>
  );
}

function VerdelingPerJaarTabel({
  insp,
  startJaar,
  aantalJaren,
}: {
  insp: InspanningBegroting;
  startJaar: number;
  aantalJaren: number;
}) {
  const jaren = Array.from({ length: aantalJaren }, (_, i) => startJaar + i);
  const cells = jaren.map((j) => insp.verdelingPerJaar.find((v) => v.jaar === j) ?? null);
  const sumCells = cells.reduce((s, c) => s + (c?.euro ?? 0), 0);
  const matchOk = Math.abs(sumCells - insp.totaalEuro) <= tolerantie(insp.totaalEuro);
  const heeftActiviteit = insp.verdelingPerJaar.some((v) => v.activiteit);

  return (
    <div className="overflow-x-auto rounded-lg border border-gray-200">
      <table className="w-full text-xs">
        <thead className="bg-gray-50">
          <tr className="text-left uppercase tracking-wider text-[10px] text-gray-500">
            <th className="px-3 py-2 font-semibold">Jaar</th>
            <th className="px-3 py-2 font-semibold">Fase</th>
            <th className="px-3 py-2 font-semibold text-right">Bedrag</th>
            <th className="px-3 py-2 font-semibold text-right">Aandeel</th>
          </tr>
        </thead>
        <tbody>
          {jaren.map((j, idx) => {
            const cell = cells[idx];
            const euro = cell?.euro ?? 0;
            const cellPct = insp.totaalEuro > 0 ? Math.round((euro / insp.totaalEuro) * 100) : 0;
            return (
              <tr key={j} className="border-t border-gray-100">
                <td className="px-3 py-1.5 font-mono">{j}</td>
                <td className="px-3 py-1.5 text-gray-700">{cell?.fase ?? "—"}</td>
                <td className="px-3 py-1.5 text-right font-mono">
                  {euro > 0 ? formatEur(euro) : <span className="text-gray-300">—</span>}
                </td>
                <td className="px-3 py-1.5 text-right text-gray-500 tabular-nums">{cellPct}%</td>
              </tr>
            );
          })}
        </tbody>
        <tfoot>
          <tr className="bg-gray-50 border-t-2 border-gray-300 font-semibold">
            <td colSpan={2} className="px-3 py-1.5 text-right text-gray-700">Totaal over alle jaren</td>
            <td className="px-3 py-1.5 text-right font-mono text-[#003366]">{formatEur(sumCells)}</td>
            <td className="px-3 py-1.5 text-right">
              {matchOk ? (
                <span className="text-emerald-600 font-bold" title="Klopt met inspanning-totaal">✓</span>
              ) : (
                <span className="text-red-600 font-bold" title={`Verschil ${formatEur(Math.abs(sumCells - insp.totaalEuro))}`}>✗</span>
              )}
            </td>
          </tr>
          <tr className="bg-gray-50 text-xs text-gray-500">
            <td colSpan={2} className="px-3 py-1 text-right">Inspanning-totaal (referentie)</td>
            <td className="px-3 py-1 text-right font-mono">{formatEur(insp.totaalEuro)}</td>
            <td />
          </tr>
        </tfoot>
      </table>
      {heeftActiviteit && (
        <details className="border-t border-gray-200 px-3 py-2 bg-white">
          <summary className="cursor-pointer text-[11px] text-gray-500 hover:text-gray-700">
            Activiteit per jaar (uit dossier)
          </summary>
          <ul className="mt-1.5 space-y-0.5 text-xs text-gray-600">
            {insp.verdelingPerJaar.filter((v) => v.activiteit).map((v) => (
              <li key={v.jaar}>
                <span className="font-mono text-gray-500">{v.jaar}:</span> {v.activiteit}
              </li>
            ))}
          </ul>
        </details>
      )}
    </div>
  );
}

// ============================================================================
// Sectie D — Jaartotalen + cap-respect + automatische regels
// ============================================================================

function SectieD({
  scenario,
  cap,
  startJaar,
  aantalJaren,
}: {
  scenario: BegrotingScenario;
  cap: number;
  startJaar: number;
  aantalJaren: number;
}) {
  const jaren = Array.from({ length: aantalJaren }, (_, i) => startJaar + i);
  const inspanningen = scenario.inspanningen ?? [];
  const totalenPerJaar = scenario.totalenPerJaar ?? [];

  const officieelPerJaar: Record<number, number> = {};
  for (const t of totalenPerJaar) officieelPerJaar[t.jaar] = t.euro;

  return (
    <div>
      <SectieKop
        nummer="D"
        titel="Jaartotalen — verdeling per jaar"
        hint="Per jaar: alle inspanningen + totaal + % van het jaarbudget-plafond benut."
      />
      <div className="overflow-x-auto rounded-lg border border-gray-200">
        <table className="w-full text-sm">
          <thead className="bg-gray-50">
            <tr className="text-left text-[10px] uppercase tracking-wider text-gray-500">
              <th className="px-3 py-2 font-semibold sticky left-0 bg-gray-50 z-10">Inspanning</th>
              {jaren.map((j) => (
                <th key={j} className="px-3 py-2 font-semibold text-right">{j}</th>
              ))}
              <th className="px-3 py-2 font-semibold text-right">Totaal</th>
            </tr>
          </thead>
          <tbody>
            {inspanningen.map((insp) => {
              const cellsByJaar: Record<number, number> = {};
              for (const v of insp.verdelingPerJaar) cellsByJaar[v.jaar] = v.euro;
              return (
                <tr key={insp.inspanningTitel} className="border-t border-gray-100 hover:bg-gray-50/50">
                  <td className="px-3 py-2 sticky left-0 bg-white z-10">
                    <div className="flex items-center gap-1.5">
                      <span className={`w-2 h-2 rounded-full ${DOMAIN_DOT[insp.domein] ?? "bg-gray-400"}`} />
                      <span className="text-gray-800 font-medium text-xs">{insp.inspanningTitel}</span>
                    </div>
                  </td>
                  {jaren.map((j) => {
                    const v = cellsByJaar[j] ?? 0;
                    return (
                      <td key={j} className="px-3 py-2 text-right font-mono text-xs text-gray-700">
                        {v > 0 ? formatEur(v) : <span className="text-gray-300">—</span>}
                      </td>
                    );
                  })}
                  <td className="px-3 py-2 text-right font-mono font-semibold text-gray-900">
                    {formatEur(insp.totaalEuro)}
                  </td>
                </tr>
              );
            })}
          </tbody>
          <tfoot>
            <tr className="bg-gray-50 border-t-2 border-gray-300 font-semibold">
              <td className="px-3 py-2 sticky left-0 bg-gray-50 z-10 text-gray-700">Totaal per jaar</td>
              {jaren.map((j) => (
                <td key={j} className="px-3 py-2 text-right font-mono text-[#003366]">
                  {formatEur(officieelPerJaar[j] ?? 0)}
                </td>
              ))}
              <td className="px-3 py-2 text-right font-mono text-[#003366]">
                {formatEur(jaren.reduce((s, j) => s + (officieelPerJaar[j] ?? 0), 0))}
              </td>
            </tr>
            <tr className="bg-white border-t border-gray-200">
              <td className="px-3 py-2 sticky left-0 bg-white z-10 text-gray-500 text-xs">
                % van plafond ({formatEur(cap)})
              </td>
              {jaren.map((j) => {
                const v = officieelPerJaar[j] ?? 0;
                const isJ1 = j === startJaar;
                const effectieveCap = isJ1 ? Math.max(cap, 250_000) : cap;
                const p = effectieveCap > 0 ? v / effectieveCap : 0;
                const overcap = p > 1.001;
                const j1MetCitoNorm = isJ1 && Math.abs(v - 250_000) < 1000 && cap < 250_000;
                return (
                  <td
                    key={j}
                    className={`px-3 py-2 text-right text-xs tabular-nums ${
                      overcap ? "text-red-600 font-bold" : j1MetCitoNorm ? "text-amber-700" : "text-gray-500"
                    }`}
                    title={j1MetCitoNorm ? "Jaar 1 staat vast op de Cito-richtlijn van €250.000 — dit kan in krappe scenario's hoger zijn dan het scenario-plafond." : undefined}
                  >
                    {pct(v, cap)}
                    {overcap && <span className="ml-0.5">⚠</span>}
                    {j1MetCitoNorm && <span className="ml-0.5">*</span>}
                  </td>
                );
              })}
              <td />
            </tr>
          </tfoot>
        </table>
      </div>

    </div>
  );
}

// ============================================================================
// Sectie E — Som-controle in volzinnen
// ============================================================================

function SectieE({
  scenario,
  sumInspanningen,
  sumJaartotalen,
  totaalScenario,
  cap,
  tol,
  inspanningen,
  startJaar,
}: {
  scenario: BegrotingScenario;
  sumInspanningen: number;
  sumJaartotalen: number;
  totaalScenario: number;
  cap: number;
  tol: number;
  inspanningen: InspanningBegroting[];
  startJaar: number;
}) {
  const totalenPerJaar = scenario.totalenPerJaar ?? [];

  const checks: Array<{ label: string; ok: boolean; uitleg: string }> = [
    {
      label: "De som van alle inspanningen klopt met het scenario-totaal",
      ok: Math.abs(sumInspanningen - totaalScenario) <= tol,
      uitleg: `Som inspanningen ${formatEur(sumInspanningen)} versus scenario-totaal ${formatEur(totaalScenario)} — verschil ${formatEur(Math.abs(sumInspanningen - totaalScenario))} (toegestaan: ${formatEur(tol)}).`,
    },
    {
      label: "De jaartotalen tellen op tot het scenario-totaal",
      ok: Math.abs(sumJaartotalen - totaalScenario) <= tol,
      uitleg: `Som jaartotalen ${formatEur(sumJaartotalen)} versus scenario-totaal ${formatEur(totaalScenario)} — verschil ${formatEur(Math.abs(sumJaartotalen - totaalScenario))} (toegestaan: ${formatEur(tol)}).`,
    },
    {
      label: "Geen jaar overschrijdt het jaarbudget-plafond (uitzondering: jaar 1 mag op €250K Cito-norm staan)",
      ok: totalenPerJaar.every((t) => {
        const effectieveCap = t.jaar === startJaar ? Math.max(cap, 250_000) : cap;
        return t.euro <= effectieveCap * 1.001;
      }),
      uitleg: `Hoogste jaarbedrag: ${formatEur(Math.max(0, ...totalenPerJaar.map((t) => t.euro)))} versus plafond ${formatEur(cap)}. Jaar 1 (${startJaar}) is uitgezonderd: dat staat vast op de Cito-richtlijn van €250.000 — dit kan voor het krappe scenario (plafond €200K) hoger uitkomen dan het scenario-plafond.`,
    },
    {
      label: "Per inspanning klopt de jaarverdeling met het inspanning-totaal",
      ok: inspanningen.every((insp) => {
        const sum = (insp.verdelingPerJaar ?? []).reduce((s, v) => s + (v.euro ?? 0), 0);
        return Math.abs(sum - (insp.totaalEuro ?? 0)) <= tolerantie(insp.totaalEuro ?? 0);
      }),
      uitleg: "Voor elke inspanning telt de jaar-verdeling op tot het inspanning-totaal (binnen een afwijking van €5.000 of 0,5% van het bedrag — wat van de twee groter is).",
    },
  ];
  const allOk = checks.every((c) => c.ok);
  void scenario;

  return (
    <div>
      <SectieKop
        nummer="E"
        titel="Som-controle"
        hint="Sluiten alle deelsommen aan op de scenario-totalen en het plafond?"
      />
      <div
        className={`rounded-lg border-2 p-4 ${
          allOk ? "border-emerald-300 bg-emerald-50" : "border-red-300 bg-red-50"
        }`}
      >
        <div className="flex items-center gap-2 mb-3">
          <span className={`w-6 h-6 rounded-full text-white flex items-center justify-center text-xs font-bold ${allOk ? "bg-emerald-600" : "bg-red-600"}`}>
            {allOk ? "✓" : "!"}
          </span>
          <span className={`font-semibold ${allOk ? "text-emerald-900" : "text-red-900"}`}>
            {allOk ? "Alle berekeningen kloppen" : "Verschil gevonden — zie details"}
          </span>
        </div>
        <ul className="space-y-2">
          {checks.map((c, i) => (
            <li key={i} className="flex items-start gap-2 text-sm">
              <span className={c.ok ? "text-emerald-600" : "text-red-600"}>{c.ok ? "✓" : "✗"}</span>
              <div className="flex-1">
                <span className="font-medium text-gray-800">{c.label}</span>
                <p className="text-xs text-gray-600 mt-0.5">{c.uitleg}</p>
              </div>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}

// ============================================================================
// UI primitives
// ============================================================================

function SectieKop({ nummer, titel, hint }: { nummer: string; titel: string; hint?: string }) {
  return (
    <div className="mb-3">
      <div className="flex items-center gap-2">
        <span className="min-w-7 h-7 px-2 rounded-md bg-[#003366] text-white text-xs font-bold flex items-center justify-center">
          {nummer}
        </span>
        <h3 className="text-base font-semibold text-[#003366]">{titel}</h3>
      </div>
      {hint && <p className="text-xs text-gray-500 mt-1 ml-9 leading-relaxed">{hint}</p>}
    </div>
  );
}

function SubSectie({ nummer, titel, hint, children }: { nummer: string; titel: string; hint?: string; children: React.ReactNode }) {
  return (
    <div>
      <div className="flex items-center gap-2 mb-2">
        <span className="text-[10px] font-mono text-[#003366] font-bold bg-[#003366]/10 px-1.5 py-0.5 rounded">
          {nummer}
        </span>
        <h4 className="text-sm font-semibold text-gray-800">{titel}</h4>
      </div>
      {hint && <p className="text-[11px] text-gray-500 mb-2 ml-6 italic">{hint}</p>}
      <div className="ml-6">{children}</div>
    </div>
  );
}

function Stat({
  label,
  value,
  sub,
  mono,
  highlight,
}: {
  label: string;
  value: string;
  sub?: string;
  mono?: boolean;
  highlight?: boolean;
}) {
  return (
    <div
      className={`rounded-lg border p-3 ${
        highlight ? "border-amber-300 bg-amber-50" : "border-gray-200 bg-white"
      }`}
    >
      <p className="text-[10px] uppercase tracking-wider text-gray-500 font-semibold">{label}</p>
      <p className={`text-base font-bold text-gray-900 mt-0.5 ${mono ? "font-mono" : ""}`}>{value}</p>
      {sub && <p className="text-[11px] text-gray-500 mt-0.5">{sub}</p>}
    </div>
  );
}
