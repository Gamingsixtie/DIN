"use client";

import { useState, useMemo } from "react";
import { useSession } from "@/lib/session-context";
import type { DINSession, BegrotingAdvies, Stap4Result, BegrotingScenario, InspanningBegroting } from "@/lib/types";
import { parseDossierRaming, type ParsedDossierRaming } from "@/lib/dossier-parser";
import { splitMotivatie, segmentText, parseBreakdown, type EuroMatch, type ParsedBreakdown, type BreakdownSection } from "@/lib/motivatie-parser";
import { vindRedenering } from "@/lib/component-redeneringen";
import { vindKnownBreakdown, structureelCumulatiefMid, type KnownSection } from "@/lib/known-breakdowns";
import { NotitieVoorClaude } from "./NotitieVoorClaude";
import {
  collectStakeholderRollen,
  collectReviewRollen,
  type Domein as Domein4,
  type StakeholderRol,
  type ReviewRol,
} from "@/lib/uren-aantal";

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
// Hoofdcomponent — wrapper die session uit context haalt (bestaande gedrag)
// ============================================================================

export default function BerekeningenStep({ mode = "full" }: { mode?: "full" | "export" } = {}) {
  const { session } = useSession();
  if (!session) return null;
  return <BerekeningenView session={session} mode={mode} />;
}

// ============================================================================
// View — neemt session als prop, geen context-afhankelijkheid. Hierdoor
// herbruikbaar in /programmaplan/[id] (publieke leesversie zonder
// SessionProvider) als bijlage in de export.
// ============================================================================

export function BerekeningenView({
  session,
  mode = "full",
}: {
  session: DINSession;
  mode?: "full" | "export";
}) {
  const [openScenario, setOpenScenario] = useState<ScenarioKey | null>("advies");
  const isExport = mode === "export";

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
      {!isExport && <Header begroting={begroting} />}

      {!begroting && <GeenBegrotingPlaceholder />}

      {begroting && beschikbareScenarios.length === 0 && (
        <div className="bg-amber-50 border border-amber-200 rounded-lg p-4 text-sm text-amber-900">
          Er is een begrotingsadvies-record, maar geen enkel scenario is gevuld. Genereer scenario&apos;s
          in <strong>Cross-analyse · Stap 6 (Optimaliseren)</strong>.
        </div>
      )}

      {begroting && beschikbareScenarios.length > 0 && (
        <>
          {!isExport && (
            <NotitieVoorClaude
              scope={{ kind: "globaal" }}
              titel="Algemeen — geldt voor alle scenario's"
              hint="Schrijf hier wat je wilt dat Claude leest bij de volgende ronde. Dingen die voor alle scenario's gelden (bv. een aanpassing in tarieven, een verkeerd label, structurele uitleg). Per scenario zit er onderaan elke kaart een eigen notitieblok."
            />
          )}
          <Begrippenlijst />
          <MinMidMaxToelichting />

          {!isExport && (
            <ScenarioPicker
              beschikbaar={beschikbareScenarios}
              actief={openScenario}
              onPick={setOpenScenario}
              session={session}
              begroting={begroting}
            />
          )}

          <div className="space-y-4">
            {beschikbareScenarios.map((k) => (
              <ScenarioBerekeningKaart
                key={k}
                scenarioKey={k}
                begroting={begroting}
                subEffortAnalysis={subEffortAnalysis}
                session={session}
                open={isExport ? true : openScenario === k}
                onToggle={() => setOpenScenario(openScenario === k ? null : k)}
                mode={mode}
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
                {formatEur(s?.totaalGeraamdEuro ?? 0)}
              </div>
              <div className="text-[11px] text-gray-500 mt-0.5">
                {s?.aantalJaren ?? 0} jaar · max per jaar {formatEur(s?.jaarlijksBudgetEuro ?? 0)}
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
  session,
  open,
  onToggle,
  mode = "full",
}: {
  scenarioKey: ScenarioKey;
  begroting: BegrotingAdvies;
  subEffortAnalysis: Array<{ titel?: string; domein?: string; dossier?: { kostenraming?: string } }>;
  session: DINSession;
  open: boolean;
  onToggle: () => void;
  mode?: "full" | "export";
}) {
  const scenario = begroting.scenarios?.[scenarioKey];
  const meta = SCENARIO_META[scenarioKey];
  const isExport = mode === "export";

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

  const kopInhoud = (
    <>
      <div>
        <div className="text-[10px] uppercase tracking-[0.2em] opacity-80">{meta.label}</div>
        <div className="text-base font-bold mt-0.5">
          {formatEur(totaalScenario)}
          <span className="text-xs font-normal opacity-80 ml-2">
            over {aantalJaren} jaar ({startJaar}–{startJaar + aantalJaren - 1}) · plafond{" "}
            {formatEur(cap)}/jaar
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
        {!isExport && (
          <svg
            className={`w-5 h-5 transition-transform ${open ? "rotate-180" : ""}`}
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
          </svg>
        )}
      </div>
    </>
  );

  return (
    <div className="bg-white border border-gray-200 rounded-xl overflow-hidden">
      {isExport ? (
        <div
          className={`w-full ${meta.band} text-white px-5 py-3 flex items-center justify-between text-left`}
        >
          {kopInhoud}
        </div>
      ) : (
        <button
          onClick={onToggle}
          className={`w-full ${meta.band} text-white px-5 py-3 flex items-center justify-between text-left`}
        >
          {kopInhoud}
        </button>
      )}

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

          <SectieF
            scenarioKey={scenarioKey}
            session={session}
            startJaar={startJaar}
            begrotingScenario={scenario}
          />

          {!isExport && (
            <NotitieVoorClaude
              scope={{ kind: "scenario", scenarioKey }}
              titel={`Scenario: ${meta.label}`}
              hint="Notities die alleen voor dit scenario gelden. Bijvoorbeeld: een specifiek bedrag dat hier afwijkt, een berekening die alleen in dit tempo onlogisch wordt, of een sectie die alleen voor dit scenario aanpassing nodig heeft."
            />
          )}
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

        {/* C2: Motivatie — alleen beschrijvende tekst (geen breakdown-tabel).
            De breakdown-tabel staat exclusief in C3 (zie hieronder). */}
        <SubSectie
          nummer={isOverig ? "C1" : "C2"}
          titel={isOverig ? "Onderbouwing van de post" : "Motivatie & onderbouwing — hoe komt het bedrag tot stand?"}
        >
          <MotivatiePaneel
            motivatie={insp.motivatie}
            inspanningTitel={insp.inspanningTitel}
            aantalJaren={aantalJaren}
            toonBreakdown={false}
          />
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
            motivatie={insp.motivatie}
            inspanningTitel={insp.inspanningTitel}
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
  motivatie,
  inspanningTitel,
}: {
  insp: InspanningBegroting;
  isOverig: boolean;
  parsed: ParsedDossierRaming;
  knownBreakdown: ReturnType<typeof vindKnownBreakdown>;
  aantalJaren: number;
  motivatie: string;
  inspanningTitel: string;
}) {
  const werkelijk = insp.totaalEuro ?? 0;
  // Breakdown-tabellen (uit C2 verhuisd) — bovenaan in C3. We nemen de
  // 'onderbouwing'-tekst uit de motivatie en geven die door aan
  // BreakdownPaneel; die kiest known-breakdown vóór parser-fallback (zelfde
  // logica als voorheen). Aanroepen vindKnownBreakdown / parseBreakdown /
  // vindRedenering blijven ongewijzigd binnen BreakdownPaneel/BreakdownTabel.
  const { onderbouwing } = splitMotivatie(motivatie ?? "");

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
    <div className="rounded-lg border-2 border-gray-300 bg-white p-4 space-y-4 shadow-sm">
      {/* Breakdown-tabel(len) bovenaan — verhuisd uit C2 zodat C3 hét
          berekening-blok is. Gebruikt dezelfde BreakdownPaneel-logica (known
          breakdown → parser-fallback). */}
      {!isOverig && onderbouwing && (
        <BreakdownPaneel
          tekst={onderbouwing}
          bron="motivatie"
          inspanningTitel={inspanningTitel}
          aantalJaren={aantalJaren}
        />
      )}
      {!isOverig && bron !== "geen" && (
        <div className="rounded bg-gray-50/70 border border-gray-200 p-3 font-mono text-xs space-y-1">
          <p className="text-[10px] uppercase tracking-wider font-bold text-gray-700 font-sans mb-1.5">
            Optelsom: eenmalig + structureel cumulatief
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

function MotivatiePaneel({
  motivatie,
  inspanningTitel,
  aantalJaren,
  toonBreakdown = true,
}: {
  motivatie: string;
  inspanningTitel: string;
  aantalJaren: number;
  // Default true voor backwards compat; in C2 zetten we 'm op false zodat
  // de breakdown-tabel exclusief in C3 wordt getoond. C2 toont dan alleen
  // de kwalitatieve inleiding (woorden, geen tabel).
  toonBreakdown?: boolean;
}) {
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
      {toonBreakdown && onderbouwing && (
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

  const hoogsteJaar = Math.max(0, ...totalenPerJaar.map((t) => t.euro));
  const checks: Array<{ label: string; ok: boolean; status?: "info"; uitleg: string }> = [
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
      label: "Verhouding piekjaar tot jaarbudget-plafond",
      ok: true,
      status: "info",
      uitleg: `Hoogste jaarbedrag: ${formatEur(hoogsteJaar)} versus plafond ${formatEur(cap)}${hoogsteJaar > cap ? ` — overschrijding ${formatEur(hoogsteJaar - cap)} (informatief; minimale piekjaar-afwijkingen zijn voor het bestuur acceptabel).` : " — binnen plafond."}`,
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
          {checks.map((c, i) => {
            const isInfo = c.status === "info";
            const symbol = isInfo ? "i" : c.ok ? "✓" : "✗";
            const symbolClass = isInfo
              ? "text-blue-600 font-bold"
              : c.ok
              ? "text-emerald-600"
              : "text-red-600";
            return (
              <li key={i} className="flex items-start gap-2 text-sm">
                <span className={symbolClass}>{symbol}</span>
                <div className="flex-1">
                  <span className="font-medium text-gray-800">{c.label}</span>
                  <p className="text-xs text-gray-600 mt-0.5">{c.uitleg}</p>
                </div>
              </li>
            );
          })}
        </ul>
      </div>
    </div>
  );
}

// ============================================================================
// Sectie F — Interne uren — capaciteitsbelasting eigen organisatie
// ============================================================================
//
// Aparte zelfstandige sectie naast de OOP-rekenscheme. Toont per scenario:
//   1. Hoofdgetal-kaart: totaal uren / programma-uren / lijn-uren
//   2. Per-jaar curve met piekjaar-badge
//   3. Per-domein bars (uren-aandeel binnen scenario)
//   4. Programma/lijn-toelichting (collapsible)
//   5. Capaciteitsdruk-context (informatief)
//
// Bron: stap4.stap7InterneUren.scenarios[scenarioKey]
//   - totaalUren / totaalKosten
//   - totalenPerJaar[]: { jaar, uren, kosten, urenBudget?, urenGap? }
//   - domeinen[]: { domein, totaalUren, totaalKosten, motivatie, jaren[], programmaPct? }
//
// Programma-pct per domein: gebruik veld als aanwezig, anders fallback naar
// vaste schattingen uit AUDIT-INTERNE-UREN-FASERING.md (data 85% / mens 70% /
// cultuur 75% / processen 55% — gemiddeld ~72%). Spec spreekt van fallback
// 0.75; we hanteren domein-specifiek default zodat de getoonde uitsplitsing
// dichter bij de werkelijke audit-bevinding ligt.

const PROGRAMMA_PCT_DEFAULT: Record<string, number> = {
  data_systemen: 0.85,
  mens: 0.70,
  cultuur: 0.75,
  processen: 0.55,
};

const DOMAIN_BAR_HEX: Record<string, string> = {
  mens: "#2563eb",
  processen: "#059669",
  data_systemen: "#7c3aed",
  cultuur: "#d97706",
};

const DOMAIN_LIJN_VOORBEELD: Record<string, string> = {
  data_systemen:
    "Stuurgroep-frequentie als governance + structureel CRM-beheer (~15% — vast in lijn).",
  mens:
    "Klantenservice-team krijgt sowieso jaarlijks gespreksvaardigheidsbijscholing (~30% deelnemertijd in standaard L&D-budget Klantcontact).",
  cultuur:
    "HRM-cyclus-borging en MT-discussies horen in de jaarcyclus van directie en HR (~25%).",
  processen:
    "Procesmanager-structureel-werk in functieprofiel zodra processen vastgesteld zijn (~45%).",
};

type UrenFTotalen = {
  jaar: number;
  uren: number;
  kosten: number;
  urenBudget?: number;
  urenGap?: number;
};
type UrenFRol = {
  functieId?: string;
  functieNaam?: string;
  afdeling?: string;
  uren: number;
  uurtarief?: number;
  kosten?: number;
};
type UrenFDomeinJaar = {
  jaar: number;
  activiteit?: string;
  totaalUren?: number;
  totaalKosten?: number;
  rollen?: UrenFRol[];
};
type UrenFDomein = {
  domein: string;
  motivatie?: string;
  totaalUren?: number;
  totaalKosten?: number;
  programmaPct?: number;
  // Interpretatie B (driedeling): programma / lijn / raadplegen-uren per domein.
  programmaUren?: number;
  lijnUren?: number;
  raadplegenUren?: number;
  jaren?: UrenFDomeinJaar[];
  koppeling?: string[];
};
type UrenFScenario = {
  aantalJaren?: number;
  startJaar?: number;
  uurtariefGebruikt?: number;
  totaalUren?: number;
  totaalKosten?: number;
  // Interpretatie B (driedeling) — top-niveau totalen.
  programmaUren?: number;
  lijnUren?: number;
  raadplegenUren?: number;
  domeinen?: UrenFDomein[];
  totalenPerJaar?: UrenFTotalen[];
};
type UrenFFunctieInput = {
  aantal: number;
  urenPerJaar?: number;
  stakeholder?: boolean;
  stakeholderToelichting?: string;
  reviewVereist?: boolean;
  reviewVraag?: string;
};
type UrenFCustomFunctie = { id: string; naam: string; schaal?: number };
type UrenFVastgesteldeRol = {
  functieId: string;
  functieNaam: string;
  afdeling?: string;
  urenTotaal: number;
  onderbouwing: string;
};
type UrenFVastgesteldeInspanning = {
  groepId: string;
  inspanningTitel: string;
  domein: string;
  rollen: UrenFVastgesteldeRol[];
};
// Categorie binnen het kernteam-model (Lezing C). Eén persoon hoort tot één
// categorie per inspanning. Default-uren-niveaus staan in LEZING_C_DEFAULTS.
type LezingCCategorie = "leider" | "kernteam" | "trainings_deelnemer" | "geconsulteerd";

// Defensieve normalisatie: oudere data kan categorie-namen met dash, spatie of
// in mixed-case bevatten (bv. "trainings-deelnemer" of "Trainings Deelnemer").
// Mapt elke variant naar de canonical interne vorm. Returns null voor
// onbekende categorieën zodat caller default-gedrag kan kiezen.
function normaliseerCategorie(raw: string | undefined): LezingCCategorie | null {
  if (!raw) return null;
  const norm = raw
    .toString()
    .trim()
    .toLowerCase()
    .replace(/[\s-]+/g, "_"); // unify spaces and dashes naar underscores
  if (norm === "leider") return "leider";
  if (norm === "geconsulteerd") return "geconsulteerd";
  if (
    norm === "trainings_deelnemer" ||
    norm === "training_deelnemer" ||
    norm === "trainingsdeelnemer"
  ) {
    return "trainings_deelnemer";
  }
  if (
    norm === "kernteam" ||
    norm === "kernteam_uitvoerend" ||
    norm === "kernteam_mt" ||
    norm === "kernteam_mt_cultuur"
  ) {
    return "kernteam";
  }
  return null;
}

// Uren-niveau per categorie — fase-gebaseerd (Lezing C). Wordt als ankerpunt
// gebruikt in F1 en als basis voor F2/F3-categorie-context als de werkelijke
// data deze structuur (nog) niet heeft.
type UrenNiveau = {
  piek?: number;        // u/jr in piek-jaar (Realisatie/Acceptatie)
  buitenPiek?: number;  // u/jr in niet-piek-jaar
  borging?: number;     // u/jr in borgings-jaar (typisch jaar 4+ in lange scenario's)
  totaal?: number;      // totaal-uren over volledige looptijd (alleen voor cat-2/cat-3-defaults)
};

// Optionele Lezing-C marker uit Supabase. Wordt door de doorvoer-agent geschreven.
// Hier alleen lezen — als afwezig: defaults gebruiken.
type InterneUrenLezingMarker = {
  lezing?: string;            // bv. "A" | "C"
  timestamp?: string;
  toelichting?: string;
  urenNiveaus?: Partial<Record<LezingCCategorie, UrenNiveau>>;
  // Optionele per-rol-mapping: functieId → categorie. Geeft F2/F3 een
  // betrouwbaardere categorie-uitsplitsing dan heuristiek.
  rolCategorieen?: Partial<Record<"cultuur" | "mens" | "data_systemen" | "processen", Record<string, LezingCCategorie>>>;
  // Optioneel: per-domein de inspanningsleider-naam (kan placeholder zijn).
  inspanningsleiders?: Partial<Record<"cultuur" | "mens" | "data_systemen" | "processen", { naam?: string; tbd?: boolean; rolLabel?: string }>>;
};

type UrenFAdvies = {
  scenarios?: Partial<Record<ScenarioKey, UrenFScenario | null>>;
  uurtariefSettings?: {
    basisTarief: number;
    referentiejaar: number;
    indexatiePercentage: number;
  };
  selectiePerDomein?: Partial<Record<"cultuur" | "mens" | "data_systemen" | "processen", Record<string, UrenFFunctieInput>>>;
  customFunctiesPerDomein?: Partial<Record<"cultuur" | "mens" | "data_systemen" | "processen", UrenFCustomFunctie[]>>;
  vastgesteldeUrenPerInspanning?: UrenFVastgesteldeInspanning[];
  // Lezing C — kernteam-model. Wordt door doorvoer-agent geschreven naar Supabase.
  interneUrenLezing?: InterneUrenLezingMarker;
};

// Default uren-niveaus voor Lezing C (kernteam-model). Worden gebruikt als
// fallback wanneer interneUrenLezing.urenNiveaus niet aanwezig is.
// Bron: AUDIT-KERNTEAM-MODEL.md — gangbaar voor Cito-context (~124 FTE).
const LEZING_C_DEFAULTS: Record<LezingCCategorie, UrenNiveau> = {
  leider: { piek: 80, buitenPiek: 40, borging: 25 },
  kernteam: { piek: 40, buitenPiek: 15, borging: 10 },
  geconsulteerd: { totaal: 6 },                      // 6u over hele looptijd
  trainings_deelnemer: { totaal: 46 },               // 46u contacttijd over 2 trainingsblokken
};

// Per-domein: standaard kernteam-grootte (5–7 personen volgens Kotter guiding
// coalition) voor weergave als geen werkelijke data beschikbaar is.
const LEZING_C_KERNTEAM_GROOTTE_DEFAULT: Record<string, number> = {
  mens: 5,
  data_systemen: 7,
  cultuur: 8,    // bevestigd in AUDIT: alle 8 MT-leden zijn kernteam
  processen: 5,
};

// Per-domein: of er trainings-deelnemers in dit domein voorkomen.
// Standaard alleen mens (gespreksvaardigheidstraining 47 cursisten).
const LEZING_C_HEEFT_TRAININGS_DEELNEMERS: Record<string, boolean> = {
  mens: true,
  data_systemen: false,
  cultuur: false,
  processen: false,
};

const LEZING_C_AANTAL_DEELNEMERS_DEFAULT: Record<string, number> = {
  mens: 47,
  data_systemen: 0,
  cultuur: 0,
  processen: 0,
};

// Per-domein: aantal geconsulteerden (cat-3 met 6u/looptijd elk).
const LEZING_C_GECONSULTEERDEN_DEFAULT: Record<string, number> = {
  mens: 25,
  data_systemen: 30,
  cultuur: 0,
  processen: 0,
};

const LEZING_C_CATEGORIE_LABEL: Record<LezingCCategorie, string> = {
  leider: "leider",
  kernteam: "kernteam",
  trainings_deelnemer: "trainings-deelnemer",
  geconsulteerd: "geconsulteerd",
};

const LEZING_C_CATEGORIE_KLEUR: Record<LezingCCategorie, string> = {
  leider: "bg-[#003366] text-white",
  kernteam: "bg-blue-100 text-blue-900 border border-blue-200",
  trainings_deelnemer: "bg-emerald-100 text-emerald-900 border border-emerald-200",
  geconsulteerd: "bg-gray-100 text-gray-700 border border-gray-200",
};

// Heuristiek: bepaal de categorie van een rol op basis van
// (a) expliciete rolCategorieen-mapping (Lezing C-data, indien aanwezig),
// (b) selectiePerDomein-flags (stakeholder/reviewVereist),
// (c) de naam/het functieId (voor inspanningsleiders).
function bepaalCategorie(
  domein: string,
  functieId: string,
  functieNaam: string | undefined,
  selectie: UrenFFunctieInput | undefined,
  lezingMarker: InterneUrenLezingMarker | undefined,
): LezingCCategorie {
  // 1. Expliciete mapping uit Lezing C — defensief genormaliseerd zodat
  //    oudere data met dash/spatie ("trainings-deelnemer") óók werkt.
  const dKey = domein as "cultuur" | "mens" | "data_systemen" | "processen";
  const expl = lezingMarker?.rolCategorieen?.[dKey]?.[functieId];
  const norm = normaliseerCategorie(expl as string | undefined);
  if (norm) return norm;

  // 2. Heuristiek op basis van selectie-flags
  if (selectie?.stakeholder === true) return "geconsulteerd";
  if (selectie?.reviewVereist === true) return "geconsulteerd";

  // 3. Heuristiek op functienaam of functieId (inspanningsleider in dossier
  //    of expliciet als custom-rol gemarkeerd door Lezing-C-doorvoer-agent)
  const lower = (functieNaam ?? "").toLowerCase();
  const idLower = functieId.toLowerCase();
  if (
    lower.includes("inspanningsleider") ||
    lower.includes("projectleider") ||
    lower.includes("projectmanager") ||
    // Custom-rol-IDs met "-leider" of "leider-" suffix/prefix die door
    // Lezing-C-doorvoer worden aangemaakt (bv. custom-yara-mens-leider)
    idLower.includes("-leider") ||
    idLower.includes("leider-") ||
    idLower.endsWith("-leider") ||
    functieId === "manager_klantcontact" ||
    functieId === "sio"
  ) {
    return "leider";
  }

  // 4. Mens-domein: hoge aantallen → trainings-deelnemers
  if (domein === "mens") {
    const aantal = selectie?.aantal ?? 1;
    // Klantenservice C, accountmanagers, mdw binnendienst → cursisten
    if (aantal >= 3 && (functieId.includes("klantenservice") || functieId.includes("accountmanager") || functieId.includes("mdw_binnendienst"))) {
      return "trainings_deelnemer";
    }
    // 47-mens-cursisten-cohort: alle entries met urenPerJaar 0 maar wel aantal
    if ((selectie?.urenPerJaar ?? 0) === 0 && aantal >= 1) {
      return "trainings_deelnemer";
    }
  }

  // 5. Default: kernteam (vakinhoudelijke uitvoerders)
  return "kernteam";
}

// Fase-zwaarte per domein. Voor data_systemen (CRM) is acceptatie zwaarder
// gemaakt zodat de uren-piek samenvalt met het OOP-Acceptatie★-jaar uit de
// begroting. De andere domeinen volgen een gelijkmatigere curve.
const FASE_ZWAARTE: Record<string, Record<string, number>> = {
  data_systemen: { analyse: 0.15, realisatie: 0.25, acceptatie: 0.35, beheer: 0.25 },
  mens: { analyse: 0.20, realisatie: 0.30, acceptatie: 0.30, beheer: 0.20 },
  processen: { analyse: 0.20, realisatie: 0.30, acceptatie: 0.25, beheer: 0.25 },
  cultuur: { analyse: 0.20, realisatie: 0.25, acceptatie: 0.25, beheer: 0.30 },
};

// Onderbouwing per (domein, fase) — waarom dit percentage? Wordt als hover-tooltip getoond
// in F1, zodat lezer kan reconstrueren waarom de fase-zwaarte zo is gekozen.
const FASE_ZWAARTE_ONDERBOUWING: Record<string, Record<string, string>> = {
  data_systemen: {
    analyse: "15% — bewust kort gehouden: architectuurkeuze + datakwaliteit-scan zijn intensief maar afgebakend (Q2-besluit + go/no-go ontvlechting Stichting Cito). De zware werk-uren komen pas bij realisatie en acceptatie.",
    realisatie: "25% — bouw datamodel + sectorinrichting PO/VO + migratie bronsystemen. Externe implementatiepartner doet zware bouw-uren; intern team coördineert/test → 25% intern is realistisch.",
    acceptatie: "35% (CRM-piek) — V2-tuning na piek-mismatch in V1: key-user-training + acceptatietest + go-live geven de zwaarste capaciteits-piek. Twaalf trainers begeleiden 49–85 eindgebruikers, sectormanagers borgen sector-eisen, Manager D&T trekt adoption. Hierdoor valt mens-uren-piek (training-faciliteit) in hetzelfde jaar als CRM-acceptatie — synchronisatie met OOP-begroting.",
    beheer: "25% — structureel beheer, doorontwikkeling op basis van gebruiksfeedback en optimalisatie funnelrapportages. Grootste deel valt in functieprofiel (Manager D&T 200u baseline) → vandaar relatief hoog beheer-percentage.",
  },
  mens: {
    analyse: "20% — nulmeting per sector + curriculumontwerp + selectie externe trainingspartner. 47 actieve deelnemers + 12 trainers in voorbereiding; verhoudingsgewijs lichter dan de trainingsblokken zelf.",
    realisatie: "30% — eerste trainingsblok (3 maanden voor 80 deelnemers): gespreksregie + vraag-achter-de-vraag-methodiek. 28 KS-medewerkers C × 24u + Accountmanagers + binnendienst → grootste brok contacttijd valt hier.",
    acceptatie: "30% — tweede trainingsblok + casusoefeningen op echte klantcontexten. Even zwaar als realisatie omdat in deze fase de toepassing gekoppeld wordt aan eerste CRM-data; gedragscoaching + intervisie.",
    beheer: "20% — borging + nazorg: e-learning, intervisie, gedragsindicatoren in functioneringsgesprekken. Afnemend gewicht omdat de meeste taken inschuiven in de bestaande HRM-cyclus.",
  },
  processen: {
    analyse: "20% — as-is procesmapping per sector in Smartprocess + werkgroepsessies funneldefinities + KPI-systematiek. Procesmanager Data + Projectmanager D als trekkers; relatief lichte fase want vooral werkgroep-frequentie.",
    realisatie: "30% — pilots met sectorvarianten (PO/VO/Zakelijk) parallel aan CRM-bouw. Drie Procesondersteuners (~66u elk in piekjaar) + externe procesbegeleiding 20 dagen. Zwaarste fase voor processen-domein.",
    acceptatie: "25% — uitrol bij ~21 betrokken medewerkers + onboardingsprogramma + start structureel proceseigenaarschap. Iets lichter dan realisatie omdat veel werk al in pilots is gedaan.",
    beheer: "25% — standaardisatie funnelgovernance + structureel proceseigenaarschap drie sectoren + eerste verbetercyclus op basis van CRM-rapportages. Procesmanager-werk schuift hier deels in functieprofiel (~45% lijn).",
  },
  cultuur: {
    analyse: "20% — programma-ontwerp leiderschapsprogramma + MT-commitment + eerste sessies cultureel vertrekpunt + gedragscontracten. HR (2 personen) als trekker; sectormanagers + directeur in lichte coalitievorming.",
    realisatie: "25% — intensieve sessies + gezamenlijke klantbezoeken + integratie outside-in als criterium in beoordelings-/functioneringscyclus. Iets lichter dan in mens omdat het over leiderschapscoaching gaat, niet over groepstraining van 80 deelnemers.",
    acceptatie: "25% — intervisiesessies cross-sectoraal + koppeling aan resultaten van mens- en CRM-spoor + eerste meting gedragsindicatoren. Even zwaar als realisatie om de outside-in-coalitie zichtbaar te maken.",
    beheer: "30% — verankering in HRM-cyclus + leren-en-presteren-gesprekken + cultuur als zelfdragend onderdeel. Hoog beheer-percentage omdat het programma alleen blijvend werkt als HR-cyclus het overneemt; vandaar zwaartepunt op borging.",
  },
};

// Mapt fase-tekst (zoals die in begrotingAdvies.inspanningen[].verdelingPerJaar[].fase
// voorkomt) naar de canonieke bucket in FASE_ZWAARTE.
function normaliseerFase(fase: string | undefined): string {
  if (!fase) return "onbekend";
  const f = fase.toLowerCase();
  if (f.includes("analyse") || f.includes("voorbereid")) return "analyse";
  if (f.includes("realisat") || f.includes("uitrol") || f.includes("bouw")) return "realisatie";
  if (f.includes("acceptat") || f.includes("ingebruikna")) return "acceptatie";
  if (f.includes("beheer") || f.includes("borging") || f.includes("nazorg")) return "beheer";
  return "onbekend";
}

const FASE_LABEL: Record<string, string> = {
  analyse: "Analyse",
  realisatie: "Realisatie",
  acceptatie: "Acceptatie",
  beheer: "Beheer",
  onbekend: "—",
};

function SectieF({
  scenarioKey,
  session,
  startJaar,
  begrotingScenario,
}: {
  scenarioKey: ScenarioKey;
  session: DINSession;
  startJaar: number;
  begrotingScenario: BegrotingScenario;
}) {
  const stap4 = (session.crossAnalyseWizard?.stepResults as
    | {
        stap4?: {
          stap7InterneUren?: UrenFAdvies;
          subEffortAnalysis?: Array<{
            groepId?: string;
            domein?: string;
            titel?: string;
            voorgesteldeNaam?: string | null;
            dossier?: { eigenaar?: string; inspanningsleider?: string };
          }>;
        };
      }
    | undefined)?.stap4;
  const interneUren = stap4?.stap7InterneUren ?? null;
  const interneUrenScen = interneUren?.scenarios?.[scenarioKey] ?? null;

  if (!interneUrenScen) {
    return (
      <div>
        <SectieKop
          nummer="F"
          titel="Interne uren — capaciteitsbelasting eigen organisatie"
          hint="Inzet van Cito-medewerkers naast de out-of-pocket-begroting. Niet ‘extra geld’, maar wel schaarse capaciteit."
        />
        <div className="rounded-lg border border-gray-200 bg-gray-50 p-4 text-xs text-gray-500 italic">
          Geen interne-uren-advies beschikbaar voor scenario&nbsp;
          <strong>{SCENARIO_META[scenarioKey].label}</strong>. Genereer in&nbsp;
          <strong>Cross-analyse · Stap 7 (Interne uren)</strong> de scenario&apos;s.
        </div>
      </div>
    );
  }

  const totaalUren = interneUrenScen.totaalUren ?? 0;
  const domeinen = interneUrenScen.domeinen ?? [];
  const totalenPerJaar: UrenFTotalen[] = interneUrenScen.totalenPerJaar ?? [];

  // Programma vs lijn vs raadplegen — per domein (interpretatie B: drie uren-types)
  // Lees scenario-niveau drieluik als beschikbaar (gezet door
  // `interpretatie-b-driedeling.ts`); val anders terug op per-domein-uitsplitsing.
  let programmaUren = 0;
  let lijnUren = 0;
  let raadplegenUren = 0;
  if (
    typeof interneUrenScen.programmaUren === "number" &&
    typeof interneUrenScen.lijnUren === "number"
  ) {
    programmaUren = interneUrenScen.programmaUren ?? 0;
    lijnUren = interneUrenScen.lijnUren ?? 0;
    raadplegenUren = interneUrenScen.raadplegenUren ?? 0;
  } else {
    for (const d of domeinen) {
      const dTot = d.totaalUren ?? 0;
      if (typeof d.programmaUren === "number" || typeof d.lijnUren === "number") {
        programmaUren += d.programmaUren ?? 0;
        lijnUren += d.lijnUren ?? 0;
        raadplegenUren += d.raadplegenUren ?? 0;
      } else {
        const pct =
          typeof d.programmaPct === "number" && d.programmaPct >= 0 && d.programmaPct <= 1
            ? d.programmaPct
            : PROGRAMMA_PCT_DEFAULT[d.domein] ?? 0.75;
        programmaUren += Math.round(dTot * pct);
        lijnUren += Math.round(dTot * (1 - pct));
      }
    }
  }
  const programmaAandeel = totaalUren > 0 ? Math.round((programmaUren / totaalUren) * 100) : 0;
  const lijnAandeel = totaalUren > 0 ? Math.round((lijnUren / totaalUren) * 100) : 0;
  const raadplegenAandeel = totaalUren > 0 ? Math.round((raadplegenUren / totaalUren) * 100) : 0;

  // Piekjaar
  let piekJaar: number | null = null;
  let piekUren = 0;
  for (const t of totalenPerJaar) {
    if ((t.uren ?? 0) > piekUren) {
      piekUren = t.uren ?? 0;
      piekJaar = t.jaar;
    }
  }
  const maxJaarUren = totalenPerJaar.reduce((m, t) => Math.max(m, t.uren ?? 0), 0);

  // Per-domein-bar — uren-aandeel binnen scenario, gesorteerd descending
  const sortedDomeinen = [...domeinen].sort(
    (a, b) => (b.totaalUren ?? 0) - (a.totaalUren ?? 0),
  );
  const maxDomeinUren = sortedDomeinen.reduce((m, d) => Math.max(m, d.totaalUren ?? 0), 0);

  // Capaciteitsdruk-context
  const j1 = totalenPerJaar.find((t) => t.jaar === startJaar) ?? null;
  const j1Cap = scenarioKey === "advies" || scenarioKey === "plus20" ? 290 : 250;
  const j1Note =
    j1 && j1.uren > 0
      ? `2026 = half-jaar — start juni → J1 cap op ~${j1Cap}u. Werkelijk in dit scenario: ${j1.uren.toLocaleString("nl-NL")}u.`
      : null;

  // Mens-piek 2027 risico (klantcontact-belasting)
  const mensJ2 =
    domeinen.find((d) => d.domein === "mens")?.jaren?.find((jr) => jr.jaar === startJaar + 1)
      ?.totaalUren ?? 0;
  const mensRisico =
    (scenarioKey === "advies" || scenarioKey === "plus20") && mensJ2 > 1000
      ? `Capaciteitsbreuk-risico Klantcontact ${startJaar + 1}: mens-domein piekt op ${mensJ2.toLocaleString("nl-NL")}u in dat jaar — bij 28 klantenservice-medewerkers × ~24u programma is dat single-largest belasting.`
      : null;

  return (
    <div>
      <SectieKop
        nummer="F"
        titel="Interne uren — capaciteitsbelasting eigen organisatie"
        hint="Inzet van Cito-medewerkers naast de out-of-pocket-begroting. Niet 'extra geld', maar wel schaarse capaciteit die over programma's en lijnwerk verdeeld moet worden."
      />

      <div className="space-y-4">
        {/* 1. Hoofdgetal-kaart — interpretatie B: drie uren-types + Totaal */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3">
          <KengetalKaart
            label="Totaal uren"
            waarde={totaalUren}
            sub={`over de hele looptijd (${interneUrenScen.aantalJaren ?? 0} jaar) — som data + mens + cultuur + processen`}
            accent="bg-[#003366]"
            mono
          />
          <KengetalKaart
            label="Programma-uren"
            waarde={programmaUren}
            sub={`écht extra te financieren capaciteit (${programmaAandeel}%) — leider 90% + kernteam 80% + cursist 50% + gecons. 0%, gewogen`}
            accent="bg-[#003366]"
            mono
          />
          <KengetalKaart
            label="Lijn-uren"
            waarde={lijnUren}
            sub={`functieprofielen / L&D-budget (${lijnAandeel}%) — rest na programma + raadplegen, bestaande jaarcyclus`}
            accent="bg-gray-600"
            mono
          />
          <KengetalKaart
            label="Raadplegen-uren"
            waarde={raadplegenUren}
            sub={`incidentele consultatie (${raadplegenAandeel}%) — geconsulteerden 100%, buiten programma- en lijn-toewijzing`}
            accent="bg-purple-700"
            mono
          />
        </div>

        {/* 2. Per-jaar-curve */}
        {totalenPerJaar.length > 0 && (
          <div className="rounded-lg border border-gray-200 bg-white p-4">
            <p className="text-[11px] uppercase tracking-wider font-bold text-gray-500 mb-3">
              Curve per jaar — wanneer valt de capaciteitsbelasting?
            </p>
            <div className="space-y-1.5">
              {totalenPerJaar.map((t) => {
                const isPiek = t.jaar === piekJaar && piekUren > 0;
                const w = maxJaarUren > 0 ? (t.uren / maxJaarUren) * 100 : 0;
                return (
                  <div key={t.jaar} className="flex items-center gap-3 text-xs">
                    <span className="font-mono text-gray-600 w-12 shrink-0">{t.jaar}</span>
                    <div className="flex-1 h-5 rounded bg-gray-100 overflow-hidden relative">
                      <div
                        className={`h-full ${isPiek ? "bg-[#003366]" : "bg-[#003366]/60"}`}
                        style={{ width: `${Math.max(0.5, w)}%` }}
                      />
                    </div>
                    <span
                      className={`font-mono tabular-nums w-20 text-right ${
                        isPiek ? "text-[#003366] font-bold" : "text-gray-700"
                      }`}
                    >
                      {(t.uren ?? 0).toLocaleString("nl-NL")} u
                    </span>
                    {isPiek ? (
                      <span className="text-[10px] uppercase tracking-wider font-bold text-white bg-[#003366] px-1.5 py-0.5 rounded shrink-0">
                        Piek
                      </span>
                    ) : (
                      <span className="w-12 shrink-0" />
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* 3. Per-domein-bar */}
        {sortedDomeinen.length > 0 && (
          <div className="rounded-lg border border-gray-200 bg-white p-4">
            <p className="text-[11px] uppercase tracking-wider font-bold text-gray-500 mb-3">
              Verdeling over domeinen — waar zit de inspanning?
            </p>
            <div className="space-y-2">
              {sortedDomeinen.map((d) => {
                const dTot = d.totaalUren ?? 0;
                const w = maxDomeinUren > 0 ? (dTot / maxDomeinUren) * 100 : 0;
                const aandeel = totaalUren > 0 ? Math.round((dTot / totaalUren) * 100) : 0;
                const hex = DOMAIN_BAR_HEX[d.domein] ?? "#6b7280";
                return (
                  <div key={d.domein} className="text-xs">
                    <div className="flex items-baseline justify-between gap-2 mb-1">
                      <span className="font-semibold text-gray-800">
                        {DOMAIN_LABEL[d.domein] ?? d.domein}
                      </span>
                      <span className="font-mono tabular-nums text-gray-700">
                        {dTot.toLocaleString("nl-NL")} u
                        <span className="text-gray-500 ml-1.5">({aandeel}%)</span>
                      </span>
                    </div>
                    <div className="h-3 rounded bg-gray-100 overflow-hidden">
                      <div
                        className="h-full rounded"
                        style={{ width: `${Math.max(0.5, w)}%`, backgroundColor: hex }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Footnote: 80→64 mens-discrepantie */}
            <p className="text-[10px] text-gray-500 italic leading-snug mt-3 pl-2 border-l-2 border-gray-300">
              Mens-domein heeft <strong className="not-italic font-semibold">80 betrokkenen</strong> in de
              selectie: 47 actieve trainings-deelnemers + 12 trainers + 3 sectormanagers + 1 Manager
              Klantcontact + 1 Teamleider Trainingen + ~16 stakeholders/begeleiders. De uren-tabel hierboven
              toont de 64 personen met daadwerkelijke uren-belasting; de stakeholders staan in F6 onder
              &lsquo;Betrokken stakeholders &amp; open beslispunten&rsquo;.
            </p>

            {/* Toelichting: persoon kan in meerdere domeinen voorkomen */}
            <details className="mt-3 rounded border border-blue-200 bg-blue-50 overflow-hidden">
              <summary className="cursor-pointer px-3 py-2 text-[11px] font-semibold text-blue-900 hover:bg-blue-100">
                Waarom kunnen personen in meerdere domeinen staan?
              </summary>
              <div className="px-3 pb-3 pt-1 text-[11px] text-blue-900 leading-relaxed space-y-2 border-t border-blue-200">
                <p>
                  Een persoon kan in twee of meer domeinen voorkomen omdat <strong>per domein een andere activiteit</strong> geldt — geen dubbeltelling. Het zijn verschillende werkpakketten in dezelfde rol.
                </p>
                <p>
                  <strong>Voorbeeld Manager Klantcontact:</strong>
                </p>
                <ul className="list-disc pl-4 space-y-0.5">
                  <li>
                    <strong>Mens</strong>: trainings-coördinatie-uren (40u — roosters maken voor klantenservice-team).
                  </li>
                  <li>
                    <strong>Data &amp; Systemen</strong>: CRM-stuurgroep- en adoption-uren (28u — andere activiteit).
                  </li>
                </ul>
                <p>
                  Sommige rollen zijn <strong className="text-purple-800">stakeholder zonder uren-belasting</strong> (review/input-rol bij CRM): die zie je in Stap 7 onder &lsquo;Functies geselecteerd&rsquo; met label <em>Stakeholder</em>, en in dit blok in F6 onder &lsquo;Betrokken stakeholders &amp; open beslispunten&rsquo; — zij leveren input maar krijgen geen uren toegewezen.
                </p>
                <p>
                  Andere rollen hebben label <strong className="text-amber-800">Review nodig</strong> (cat-3): handmatige beslissing nog open. Vraag onder de rol in F6 bepaalt of/hoeveel uren ze krijgen.
                </p>
              </div>
            </details>
          </div>
        )}

        {/* 4. Programma/lijn-toelichting — collapsible */}
        <details className="rounded-lg border border-gray-200 bg-white overflow-hidden">
          <summary className="cursor-pointer px-4 py-2.5 hover:bg-gray-50 text-sm font-semibold text-[#003366] flex items-center justify-between">
            <span>Programma vs. lijn — wat valt waar?</span>
            <span className="text-[11px] text-gray-500 font-normal">
              klik voor uitleg + per-domein
            </span>
          </summary>
          <div className="px-4 pb-4 pt-1 space-y-3 border-t border-gray-100">
            <div className="rounded bg-gray-50 border border-gray-200 p-3 text-xs text-gray-700 leading-relaxed">
              <p className="font-semibold text-gray-800 mb-1">Lijn-criterium (3 voorwaarden):</p>
              <ol className="list-decimal pl-5 space-y-0.5">
                <li>Werk past binnen een bestaand <strong>functieprofiel</strong>;</li>
                <li>Wordt gefinancierd uit een <strong>bestaand afdelingsbudget</strong>;</li>
                <li>Volgt een <strong>bestaande jaarcyclus</strong> (HRM-cyclus, L&amp;D-plan, beheer-cyclus).</li>
              </ol>
              <p className="text-[11px] text-gray-500 italic mt-2">
                Voldoet aan alle drie → lijn (geen extra capaciteit nodig). Anders → programma.
              </p>
            </div>
            <div className="space-y-2">
              {sortedDomeinen.map((d) => {
                const pct =
                  typeof d.programmaPct === "number" && d.programmaPct >= 0 && d.programmaPct <= 1
                    ? d.programmaPct
                    : PROGRAMMA_PCT_DEFAULT[d.domein] ?? 0.75;
                const lijnPct = Math.round((1 - pct) * 100);
                const progPct = Math.round(pct * 100);
                const dTot = d.totaalUren ?? 0;
                const progU = Math.round(dTot * pct);
                const lijnU = Math.round(dTot * (1 - pct));
                const hex = DOMAIN_BAR_HEX[d.domein] ?? "#6b7280";
                return (
                  <div key={d.domein} className="rounded border border-gray-200 p-3 text-xs">
                    <div className="flex items-baseline justify-between mb-1.5">
                      <span className="font-semibold text-gray-800 flex items-center gap-1.5">
                        <span
                          className="inline-block w-2 h-2 rounded-full"
                          style={{ backgroundColor: hex }}
                        />
                        {DOMAIN_LABEL[d.domein] ?? d.domein}
                      </span>
                      <span className="text-[11px] text-gray-500 tabular-nums">
                        {progPct}% prog · {lijnPct}% lijn
                      </span>
                    </div>
                    <div className="flex h-2 rounded overflow-hidden mb-1.5">
                      <div className="bg-emerald-600" style={{ width: `${progPct}%` }} />
                      <div className="bg-amber-500" style={{ width: `${lijnPct}%` }} />
                    </div>
                    <div className="flex justify-between text-[11px] tabular-nums mb-1">
                      <span className="text-emerald-700">
                        Programma: {progU.toLocaleString("nl-NL")} u
                      </span>
                      <span className="text-amber-700">
                        Lijn: {lijnU.toLocaleString("nl-NL")} u
                      </span>
                    </div>
                    <p className="text-[11px] text-gray-600 italic leading-snug">
                      {DOMAIN_LIJN_VOORBEELD[d.domein] ?? "Lijn-aandeel wordt verklaard door bestaande functieprofielen."}
                    </p>
                  </div>
                );
              })}
            </div>
          </div>
        </details>

        {/* 5. Capaciteitsdruk-context */}
        {(j1Note || mensRisico) && (
          <div
            className={`rounded-lg border-l-4 p-3 text-xs leading-relaxed ${
              mensRisico
                ? "border-amber-500 bg-amber-50 text-amber-900"
                : "border-blue-400 bg-blue-50 text-blue-900"
            }`}
          >
            <p className="font-semibold mb-1">Capaciteitsdruk-context</p>
            {j1Note && <p className="mb-1">{j1Note}</p>}
            {mensRisico && <p>{mensRisico}</p>}
          </div>
        )}

        {/* ──────────────────────────────────────────────────────────────────
            F1-F7 — Berekening-toelichting (analoog aan A-E voor OOP).
            Laat zien WAAR ELK GETAL VANDAAN KOMT, met formule.
            Lezing C (kernteam-model): 4 categorieën — leider / kernteam /
            trainings-deelnemer / geconsulteerd. Fase-gebaseerde uren-niveaus.
            ────────────────────────────────────────────────────────────── */}
        <div className="rounded-lg border-2 border-dashed border-[#003366]/30 bg-[#003366]/[0.02] p-4 space-y-6">
          <p className="text-[11px] uppercase tracking-wider font-bold text-[#003366]">
            Berekening-toelichting — hoe komen we aan deze uren?
          </p>

          <SubSectie
            nummer="F1"
            titel="Scenario-parameters & Lezing-C kernteam-model"
            hint="Vier categorieën per inspanning (leider / kernteam / trainings-deelnemer / geconsulteerd) met fase-gebaseerde uren-niveaus, plus de scenario-rekenparameters: looptijd, uurtarief met indexatie, J1-cap voor 2026 en fase-zwaarte per domein."
          >
            <UrenF1Parameters
              scenarioKey={scenarioKey}
              interneUrenScen={interneUrenScen}
              interneUren={interneUren}
              uurtariefSettings={interneUren?.uurtariefSettings}
              startJaar={startJaar}
            />
          </SubSectie>

          <SubSectie
            nummer="F2"
            titel="Optelling rollen → scenario-totaal (per categorie)"
            hint="Per domein per Lezing-C-categorie (leider / kernteam / trainings-deelnemer / geconsulteerd) → totaal-uren. Formule per cel (aantal × u/persoon) staat direct onder de cel."
          >
            <UrenF2Optelling
              interneUrenScen={interneUrenScen}
              interneUren={interneUren}
              uurtariefSettings={interneUren?.uurtariefSettings}
              startJaar={startJaar}
            />
          </SubSectie>

          <SubSectie
            nummer="F3"
            titel="Per-fase verdeling per domein — hoe komt het jaar-getal tot stand?"
            hint="Voor elk domein de keten: fase-curve (welke fase in welk jaar) → fase-zwaarte toegepast op domein-totaal → top-rollen met categorie-context (leider / kernteam / trainings-deelnemer / geconsulteerd) → programma vs lijn met formule."
          >
            <UrenF3PerDomein
              interneUrenScen={interneUrenScen}
              interneUren={interneUren}
              begrotingScenario={begrotingScenario}
              startJaar={startJaar}
            />
          </SubSectie>

          <SubSectie
            nummer="F4"
            titel="2026 J1-cap-toepassing — half-jaar-correctie"
            hint="Cito start juni 2026, dus J1 (2026) is een half-jaar. Bruto fase-zwaarte zou meer uren geven; het overschot is naar latere jaren herverdeeld."
          >
            <UrenF4J1Cap
              scenarioKey={scenarioKey}
              interneUrenScen={interneUrenScen}
              startJaar={startJaar}
            />
          </SubSectie>

          <SubSectie
            nummer="F5"
            titel="Categorieën & open beslispunten"
            hint="Per categorie: inspanningsleiders per inspanning (incl. eventuele TBD-placeholders), trainings-deelnemers (mens-cursisten), geconsulteerden per domein, en open beslispunten waarvoor nog handmatige review nodig is."
          >
            <UrenF5CategorieenBeslispunten
              session={session}
              interneUren={interneUren}
              stap4={stap4}
            />
          </SubSectie>

          {/* F6 mens-context — altijd zichtbaar binnen de open scenario-kaart.
              Hier expliciet uitgelicht met een randmarkering zodat het tussen
              de andere F-secties opvalt — het verklaart immers waarom het
              mens-totaal anders is dan de andere domeinen. */}
          <div className="rounded-lg border-2 border-[#003366]/40 bg-[#003366]/[0.02] p-2 -mx-2">
            <SubSectie
              nummer="F6"
              titel="Mens-domein context — waarom mens-totaal hoog lijkt"
              hint="Mens-totaal bevat ~2.162u cursist-contacttijd (47 medewerkers × 46u over 2 trainingsblokken). Trainings-deelnemers tellen 50% programma + 50% lijn (interpretatie B). Aftrekken cursisten: programma-organisatie-werk in mens is in lijn met de andere domeinen."
            >
              <UrenF6MensContext
                interneUrenScen={interneUrenScen}
                interneUren={interneUren}
              />
            </SubSectie>
          </div>

        </div>
      </div>
    </div>
  );
}

// ============================================================================
// F1 — Scenario-parameters (analoog aan SectieA)
// ============================================================================

function UrenF1Parameters({
  scenarioKey,
  interneUrenScen,
  interneUren,
  uurtariefSettings,
  startJaar,
}: {
  scenarioKey: ScenarioKey;
  interneUrenScen: UrenFScenario;
  interneUren: UrenFAdvies | null;
  uurtariefSettings?: { basisTarief: number; referentiejaar: number; indexatiePercentage: number };
  startJaar: number;
}) {
  const aantalJaren = interneUrenScen.aantalJaren ?? 0;
  const basisTarief = uurtariefSettings?.basisTarief ?? 70;
  const refJaar = uurtariefSettings?.referentiejaar ?? 2025;
  // Bron-data kan indexatie als 5 (percent-punten) of 0.05 (fractie) opslaan.
  // Normaliseer naar percent-punten (bv. 5 voor 5%).
  const indexPctRaw = uurtariefSettings?.indexatiePercentage ?? 5;
  const indexPct = indexPctRaw <= 1 ? indexPctRaw * 100 : indexPctRaw;
  const j1Cap = scenarioKey === "advies" || scenarioKey === "plus20" ? 290 : 250;
  const eindjaar = startJaar + Math.max(0, aantalJaren - 1);

  // Lezing-C uren-niveaus — lees uit data, fallback naar defaults.
  const lez = interneUren?.interneUrenLezing;
  const niveaus: Record<LezingCCategorie, UrenNiveau> = {
    leider: { ...LEZING_C_DEFAULTS.leider, ...(lez?.urenNiveaus?.leider ?? {}) },
    kernteam: { ...LEZING_C_DEFAULTS.kernteam, ...(lez?.urenNiveaus?.kernteam ?? {}) },
    trainings_deelnemer: { ...LEZING_C_DEFAULTS.trainings_deelnemer, ...(lez?.urenNiveaus?.trainings_deelnemer ?? {}) },
    geconsulteerd: { ...LEZING_C_DEFAULTS.geconsulteerd, ...(lez?.urenNiveaus?.geconsulteerd ?? {}) },
  };
  const heeftLezingC = lez?.lezing === "C";
  const heeftEigenNiveaus = !!lez?.urenNiveaus;

  // Toon de tarief-curve over de jaren
  const tarievenPerJaar: Array<{ jaar: number; tarief: number; factor: number }> = [];
  for (let i = 0; i < aantalJaren; i++) {
    const jaar = startJaar + i;
    const factor = Math.pow(1 + indexPct / 100, jaar - refJaar);
    tarievenPerJaar.push({ jaar, tarief: Math.round(basisTarief * factor), factor });
  }

  // Domein-fase-zwaarte als rij-tabel
  const domeinen: Array<keyof typeof FASE_ZWAARTE> = ["data_systemen", "mens", "processen", "cultuur"];

  return (
    <div className="rounded-lg border border-gray-200 bg-white p-4 space-y-4">
      {/* Lezing-C kernteam-model — info-block */}
      <div className="rounded-lg border-l-4 border-[#003366] bg-[#003366]/[0.04] p-3 space-y-2">
        <div className="flex items-center justify-between flex-wrap gap-2">
          <p className="text-[11px] uppercase tracking-wider font-bold text-[#003366]">
            Kernteam-model (Lezing&nbsp;C) — uren-niveaus per categorie
          </p>
          {heeftLezingC ? (
            <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-[#003366] text-white">
              Lezing C actief
            </span>
          ) : heeftEigenNiveaus ? (
            <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-emerald-100 border border-emerald-200 text-emerald-800">
              urenNiveaus uit data
            </span>
          ) : (
            <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-amber-100 border border-amber-200 text-amber-800">
              defaults — geen Lezing-C-data
            </span>
          )}
        </div>
        <p className="text-[11px] text-gray-700 leading-relaxed">
          Per inspanning <strong>4 categorieën</strong>: Inspanningsleider (1) +
          Kernteam (5–7 personen) + Trainings-deelnemers (alleen mens-cursisten) +
          Geconsulteerden (rest, lichte review-input). Fase-gebaseerd: kernteam zwaarder
          in piek-jaren, lichter in borging.
        </p>
        <div className="overflow-x-auto">
          <table className="w-full text-xs">
            <thead>
              <tr className="text-left border-b border-[#003366]/20">
                <th className="py-1.5 pr-2 font-semibold text-[#003366]">Categorie</th>
                <th className="py-1.5 px-2 font-mono text-right font-semibold text-[#003366]">Piek (Real./Acc.)</th>
                <th className="py-1.5 px-2 font-mono text-right font-semibold text-[#003366]">Buiten piek</th>
                <th className="py-1.5 px-2 font-mono text-right font-semibold text-[#003366]">
                  Borging (j4+)
                </th>
              </tr>
            </thead>
            <tbody>
              <tr className="border-b border-[#003366]/10">
                <td className="py-1.5 pr-2 font-medium text-gray-800">
                  <span className={`inline-block text-[10px] uppercase tracking-wider font-bold px-1.5 py-0.5 rounded mr-1.5 ${LEZING_C_CATEGORIE_KLEUR.leider}`}>
                    leider
                  </span>
                  Inspanningsleider (1)
                </td>
                <td className="py-1.5 px-2 font-mono text-right text-gray-800">{niveaus.leider.piek ?? "—"}u/jr</td>
                <td className="py-1.5 px-2 font-mono text-right text-gray-700">{niveaus.leider.buitenPiek ?? "—"}u/jr</td>
                <td className="py-1.5 px-2 font-mono text-right text-gray-600">{niveaus.leider.borging ?? "—"}u/jr</td>
              </tr>
              <tr className="border-b border-[#003366]/10">
                <td className="py-1.5 pr-2 font-medium text-gray-800">
                  <span className={`inline-block text-[10px] uppercase tracking-wider font-bold px-1.5 py-0.5 rounded mr-1.5 ${LEZING_C_CATEGORIE_KLEUR.kernteam}`}>
                    kernteam
                  </span>
                  Kernteam (5–7)
                </td>
                <td className="py-1.5 px-2 font-mono text-right text-gray-800">{niveaus.kernteam.piek ?? "—"}u/jr</td>
                <td className="py-1.5 px-2 font-mono text-right text-gray-700">{niveaus.kernteam.buitenPiek ?? "—"}u/jr</td>
                <td className="py-1.5 px-2 font-mono text-right text-gray-600">{niveaus.kernteam.borging ?? "—"}u/jr</td>
              </tr>
              <tr className="border-b border-[#003366]/10">
                <td className="py-1.5 pr-2 font-medium text-gray-800">
                  <span className={`inline-block text-[10px] uppercase tracking-wider font-bold px-1.5 py-0.5 rounded mr-1.5 ${LEZING_C_CATEGORIE_KLEUR.geconsulteerd}`}>
                    geconsulteerd
                  </span>
                  Geconsulteerd
                </td>
                <td colSpan={3} className="py-1.5 px-2 font-mono text-right text-gray-700">
                  totaal {niveaus.geconsulteerd.totaal ?? 6}u/looptijd
                </td>
              </tr>
              <tr>
                <td className="py-1.5 pr-2 font-medium text-gray-800">
                  <span className={`inline-block text-[10px] uppercase tracking-wider font-bold px-1.5 py-0.5 rounded mr-1.5 ${LEZING_C_CATEGORIE_KLEUR.trainings_deelnemer}`}>
                    trainings-deelnemer
                  </span>
                  Cursist (alleen mens)
                </td>
                <td colSpan={3} className="py-1.5 px-2 font-mono text-right text-gray-700">
                  totaal {niveaus.trainings_deelnemer.totaal ?? 46}u/looptijd ({LEZING_C_AANTAL_DEELNEMERS_DEFAULT.mens} cursisten, 2 trainings-blokken: Basis + Vaardigheid)
                </td>
              </tr>
            </tbody>
          </table>
        </div>
        {/* Inline formule-toelichtingen per categorie (vervangen tooltips). */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-1.5 text-[10px] text-gray-600 leading-snug pt-1.5 mt-1.5 border-t border-[#003366]/10">
          <div>
            <span className="font-semibold text-gray-700">Leider piek:</span> ~1 dag/week × 24–26 actieve weken/jr (PMI Class-2) — Realisatie/Acceptatie.
          </div>
          <div>
            <span className="font-semibold text-gray-700">Leider buiten piek:</span> ~halve dag/week × 24–26 weken (PMI) — Analyse/Borging-aanloop.
          </div>
          <div>
            <span className="font-semibold text-gray-700">Leider borging (j4+):</span> structureel afgeschaald — alleen review/sturing.
          </div>
          <div>
            <span className="font-semibold text-gray-700">Kernteam piek:</span> ~halve dag/week × 24–26 weken (PMI) — Realisatie/Acceptatie.
          </div>
          <div>
            <span className="font-semibold text-gray-700">Kernteam buiten piek:</span> ~2u/week × 24–26 weken — Analyse/Borging-aanloop.
          </div>
          <div>
            <span className="font-semibold text-gray-700">Kernteam borging (j4+):</span> minimale uitvoer — incidentele follow-up + evaluatie.
          </div>
          <div className="md:col-span-2">
            <span className="font-semibold text-gray-700">Geconsulteerd:</span> 3u in eerste piek-jaar (Realisatie/Basis) + 3u in tweede piek-jaar (Acceptatie/Vaardigheid) = 6u over hele looptijd — incidentele review-input.
          </div>
          <div className="md:col-span-2">
            <span className="font-semibold text-gray-700">Trainings-deelnemer:</span> {LEZING_C_AANTAL_DEELNEMERS_DEFAULT.mens} cursisten × {niveaus.trainings_deelnemer.totaal ?? 46}u contacttijd over 2 blokken (Basis + Vaardigheid) — telt 50% programma + 50% lijn (interpretatie B).
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
        <Stat
          label="Aantal jaren"
          value={`${aantalJaren} jaar`}
          sub={`${startJaar}–${eindjaar}`}
        />
        <Stat
          label="Uurtarief basis"
          value={`€ ${basisTarief}`}
          sub={`+ ${indexPct}%/jr indexatie vanaf ${refJaar}`}
          mono
        />
        <Stat
          label="2026 J1-cap"
          value={`${j1Cap} u`}
          sub="Cito start juni 2026 — half-jaar-niveau"
          mono
          highlight
        />
      </div>

      {/* Tarief-curve per jaar — met per-cel-formule */}
      <div className="rounded bg-gray-50/70 border border-gray-200 p-3">
        <p className="text-[10px] uppercase tracking-wider font-bold text-gray-700 mb-1.5">
          Tarief-curve per jaar (= € {basisTarief} × (1 + {indexPct}%)^(jaar − {refJaar}))
        </p>
        <p className="text-[11px] text-gray-600 italic mb-2 leading-snug">
          <strong className="not-italic">Waarom € {basisTarief} basis?</strong> Cito-conventie voor interne-uren-doorrekening (mix-tarief over alle schalen, exclusief sociale lasten en overhead — die zitten in de programma-OOP-begroting). <strong className="not-italic">Waarom {indexPct}%/jr?</strong> Conform CAO-loonkost-stijging onderwijs (2024–2026 ≈ 4,5–5%); 5% gekozen als conservatieve, eenduidige indexatie zodat het tarief voor het laatste programmajaar niet onderschat wordt. <strong className="not-italic">Waarom referentiejaar {refJaar}?</strong> Het tarief is vastgesteld bij start van de programma-voorbereiding (eind {refJaar}); jaar-1 ({startJaar}) zit dus al één index-stap hoger.
        </p>
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2 text-xs font-mono">
          {tarievenPerJaar.map((t) => {
            const exponent = t.jaar - refJaar;
            const exact = basisTarief * t.factor;
            return (
              <div
                key={t.jaar}
                className="rounded border border-gray-200 bg-white px-2 py-1.5"
              >
                <div className="flex items-baseline justify-between">
                  <span className="text-gray-500">{t.jaar}</span>
                  <span className="text-gray-800 font-semibold">€ {t.tarief}</span>
                </div>
                <div className="text-[9px] text-gray-500 leading-tight mt-0.5 font-sans">
                  € {basisTarief} × {(1 + indexPct/100).toFixed(2)}^{exponent} = € {exact.toFixed(2)}
                </div>
              </div>
            );
          })}
        </div>
        <p className="text-[10px] text-gray-500 italic mt-1.5">
          Voorbeeld jaar {startJaar}: € {basisTarief} × 1.05^{startJaar - refJaar} = € {(basisTarief * Math.pow(1 + indexPct/100, startJaar - refJaar)).toFixed(2)} → afgerond € {Math.round(basisTarief * Math.pow(1 + indexPct/100, startJaar - refJaar))}.
        </p>
      </div>

      {/* J1-cap-onderbouwing */}
      {(scenarioKey === "advies" || scenarioKey === "plus20") && (
        <div className="rounded bg-amber-50/60 border border-amber-200 p-3">
          <p className="text-[10px] uppercase tracking-wider font-bold text-amber-900 mb-1.5">
            Hoe komt de J1-cap van {j1Cap}u tot stand?
          </p>
          <div className="text-[11px] text-amber-900 leading-relaxed space-y-1">
            <p>
              <strong>Programma start juni {startJaar}</strong> — half kalenderjaar, dus structureel ~50% capaciteit beschikbaar t.o.v. een vol jaar.
            </p>
            <p className="font-mono">
              Cap = (gemiddeld scenario-jaar {Math.round((interneUrenScen.totaalUren ?? 0) / Math.max(1, aantalJaren)).toLocaleString("nl-NL")}u) × ½ × seizoens-correctie ≈ {j1Cap}u
            </p>
            <p className="text-[10px]">
              Voor advies (4j) en plus20 (5j) ligt de cap op <strong>290u</strong>: kortere doorlooptijd → hogere jaargemiddelden → hogere half-jaar-cap. Voor optimaal (7j) en min20 (10j) ligt de cap op 250u (langere looptijd → lager jaargemiddelde, dus lagere J1). De cap voorkomt dat fase-zwaarte het J1-bedrag onrealistisch hoog zet — analyse-fase is normaal 15–20% van het domein-totaal en in een vol jaar; bij een half jaar moet dit naar ~half teruggebracht worden.
            </p>
          </div>
        </div>
      )}

      {/* J1-cap-onderbouwing — optimaal & min20 (langere looptijd, lagere cap) */}
      {(scenarioKey === "optimaal" || scenarioKey === "min20") && (
        <div className="rounded bg-amber-50/60 border border-amber-200 p-3">
          <p className="text-[10px] uppercase tracking-wider font-bold text-amber-900 mb-1.5">
            Hoe komt de J1-cap van {j1Cap}u tot stand? ({scenarioKey === "optimaal" ? "optimaal — 7 jaar" : "min20 — 10 jaar"})
          </p>
          <div className="text-[11px] text-amber-900 leading-relaxed space-y-1">
            <p>
              <strong>Programma start juni {startJaar}</strong> — half kalenderjaar, dus structureel ~50% capaciteit beschikbaar t.o.v. een vol jaar.
            </p>
            <p className="font-mono">
              Cap = (gemiddeld scenario-jaar {Math.round((interneUrenScen.totaalUren ?? 0) / Math.max(1, aantalJaren)).toLocaleString("nl-NL")}u) × ½ × seizoens-correctie ≈ {j1Cap}u
            </p>
            <p className="text-[10px]">
              <strong>Waarom 250u (en niet 290u zoals bij advies/plus20)?</strong> Langere looptijden ({aantalJaren} jaar) verlagen het jaargemiddelde: het scenario-totaal ({(interneUrenScen.totaalUren ?? 0).toLocaleString("nl-NL")}u) wordt over méér jaren uitgesmeerd, dus zijn ook latere jaren minder zwaar. Een half-jaar-cap die proportioneel blijft komt dan op 250u uit — ~14% lager dan de 290u-cap voor 4–5-jaars-scenario&apos;s. Bovendien ligt voor {scenarioKey === "optimaal" ? "optimaal" : "min20"} de zware Acceptatie-fase pas in {scenarioKey === "optimaal" ? "2029" : "2030"}; J1 ({startJaar}) is een Analyse-jaar (15% fase-zwaarte voor data_systemen), wat bij gelijkmatige verdeling al laag uitvalt — de cap is dan een veiligheidsplafond, geen actieve correctie.
            </p>
            {scenarioKey === "min20" && (
              <p className="text-[10px]">
                <strong>Specifiek min20:</strong> de 10-jarige looptijd betekent een staart van ~50u/jr structureel werk in J8–J10 (2033–2035) voor doorontwikkeling, optimalisatie en continu verbeteren. Die staart drukt het jaargemiddelde nog verder omlaag, waardoor de 250u-cap voor J1 ruim genoeg blijkt — werkelijk J1 ≈ 264u (binnen 5%-tolerantie van de cap).
              </p>
            )}
          </div>
        </div>
      )}

      {/* Fase-zwaarte per domein — met onderbouwing per (domein, fase) */}
      <div className="rounded bg-gray-50/70 border border-gray-200 p-3">
        <p className="text-[10px] uppercase tracking-wider font-bold text-gray-700 mb-1.5">
          Fase-zwaarte per domein — hoe wordt domein-totaal over de fasen verdeeld?
        </p>
        <p className="text-[11px] text-gray-600 italic mb-2 leading-snug">
          <strong className="not-italic">Wat is fase-zwaarte?</strong> Een verdeel-sleutel: per (domein × fase) bepaalt het percentage welk deel van het domein-totaal in een fase-jaar valt. Som per domein-rij = 100%. Voor <strong className="not-italic">data_systemen (CRM)</strong> is <strong className="not-italic">Acceptatie</strong> bewust zwaarder gemaakt (35% i.p.v. 25%) zodat de uren-piek samenvalt met het OOP-Acceptatie★-jaar uit de begroting (V2-tuning na piek-mismatch in V1: training-uren én license/migratie-uren vallen samen in het jaar dat eindgebruikers het CRM gaan gebruiken — key-user-training, acceptatietest, go-live). De andere domeinen volgen een gelijkmatigere curve omdat hun werkpiek minder uitgesproken is.
        </p>
        <table className="w-full text-xs">
          <thead>
            <tr className="text-left border-b border-gray-300">
              <th className="py-1.5 pr-2 font-semibold text-gray-700">Domein</th>
              <th className="py-1.5 px-2 font-mono text-right font-semibold text-gray-700">Analyse</th>
              <th className="py-1.5 px-2 font-mono text-right font-semibold text-gray-700">Realisatie</th>
              <th className="py-1.5 px-2 font-mono text-right font-semibold text-gray-700">Acceptatie</th>
              <th className="py-1.5 px-2 font-mono text-right font-semibold text-gray-700">Beheer</th>
            </tr>
          </thead>
          <tbody>
            {domeinen.map((d) => {
              const fz = FASE_ZWAARTE[d];
              const isCrm = d === "data_systemen";
              return (
                <tr key={d} className="border-b border-gray-100 last:border-0">
                  <td className="py-1.5 pr-2 font-medium text-gray-800">
                    {DOMAIN_LABEL[d] ?? d}
                    {isCrm && <span className="ml-1 text-[10px] text-purple-700">(CRM-piek)</span>}
                  </td>
                  <td className="py-1.5 px-2 font-mono text-right text-gray-700">
                    {Math.round(fz.analyse * 100)}%
                  </td>
                  <td className="py-1.5 px-2 font-mono text-right text-gray-700">
                    {Math.round(fz.realisatie * 100)}%
                  </td>
                  <td className={`py-1.5 px-2 font-mono text-right ${isCrm ? "font-bold text-purple-700" : "text-gray-700"}`}>
                    {Math.round(fz.acceptatie * 100)}%
                  </td>
                  <td className="py-1.5 px-2 font-mono text-right text-gray-700">
                    {Math.round(fz.beheer * 100)}%
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
        {/* Inline onderbouwing per (domein × fase) — vervangt hover-tooltips. */}
        <div className="mt-2 space-y-2">
          {domeinen.map((d) => {
            const onderbouwing = FASE_ZWAARTE_ONDERBOUWING[d];
            const hex = DOMAIN_BAR_HEX[d] ?? "#6b7280";
            return (
              <details key={`onderb-${d}`} className="rounded border border-gray-200 bg-white">
                <summary className="cursor-pointer px-2 py-1.5 text-[11px] font-semibold text-gray-700 hover:bg-gray-50 flex items-center gap-1.5">
                  <span className="inline-block w-2 h-2 rounded-full" style={{ backgroundColor: hex }} />
                  Onderbouwing fase-zwaarte — {DOMAIN_LABEL[d] ?? d}
                </summary>
                <div className="px-3 py-2 border-t border-gray-100 space-y-1 text-[10px] text-gray-700 leading-snug">
                  <p><strong className="text-gray-800">Analyse ({Math.round(FASE_ZWAARTE[d].analyse * 100)}%):</strong> {onderbouwing.analyse}</p>
                  <p><strong className="text-gray-800">Realisatie ({Math.round(FASE_ZWAARTE[d].realisatie * 100)}%):</strong> {onderbouwing.realisatie}</p>
                  <p><strong className="text-gray-800">Acceptatie ({Math.round(FASE_ZWAARTE[d].acceptatie * 100)}%):</strong> {onderbouwing.acceptatie}</p>
                  <p><strong className="text-gray-800">Beheer ({Math.round(FASE_ZWAARTE[d].beheer * 100)}%):</strong> {onderbouwing.beheer}</p>
                </div>
              </details>
            );
          })}
        </div>
      </div>
    </div>
  );
}

// ============================================================================
// CategorieGroepsoverzichtF — werkelijke rollen per categorie over hele looptijd
// Toont per domein per Lezing-C-categorie de concrete rollen (naam + aantal +
// totaal-uren over alle scenario-jaren) gegroepeerd in vier blokken. Lost op:
// gebruiker zag in de per-jaar-tabellen geconsulteerden met 0u in jaren waar
// ze niet werken — deze view groepeert ze één keer per categorie zodat de
// echte verdeling zichtbaar wordt.
// ============================================================================

const CATEGORIE_VOLGORDE_F: LezingCCategorie[] = [
  "leider",
  "kernteam",
  "trainings_deelnemer",
  "geconsulteerd",
];

const CATEGORIE_UITLEG_F: Record<LezingCCategorie, string> = {
  leider: "Trekt de inspanning — eindverantwoordelijk voor voortgang en escalatie.",
  kernteam: "Doet uitvoerend werk — vakinhoudelijke taken (5–7 personen volgens Kotter guiding coalition).",
  trainings_deelnemer: "Volgt training als eindgebruiker — pure contacttijd (geen kernteam-rol).",
  geconsulteerd: "Levert incidenteel input/review op kritische momenten — geen continue belasting.",
};

const CATEGORIE_CHIP_BG_F: Record<LezingCCategorie, string> = {
  leider: "bg-[#003366]",
  kernteam: "bg-blue-500",
  trainings_deelnemer: "bg-emerald-500",
  geconsulteerd: "bg-gray-400",
};

const CATEGORIE_BLOK_BG_F: Record<LezingCCategorie, string> = {
  leider: "bg-[#003366]/[0.05] border-[#003366]/30",
  kernteam: "bg-blue-50 border-blue-200",
  trainings_deelnemer: "bg-emerald-50 border-emerald-200",
  geconsulteerd: "bg-gray-50 border-gray-200",
};

function CategorieGroepsoverzichtF({
  interneUrenScen,
  interneUren,
}: {
  interneUrenScen: UrenFScenario;
  interneUren: UrenFAdvies | null;
}) {
  const lez = interneUren?.interneUrenLezing;
  const aantalJaren = interneUrenScen.aantalJaren ?? 0;
  const domeinen = interneUrenScen.domeinen ?? [];
  // Per domein bouw een lijst van rollen per categorie op basis van werkelijke
  // jaar-rol-data (som over alle jaren).
  const perDomein = domeinen.map((d) => {
    const dKey = d.domein as "cultuur" | "mens" | "data_systemen" | "processen";
    const sel = interneUren?.selectiePerDomein?.[dKey] ?? {};
    type RolAgg = {
      functieId: string;
      functieNaam: string;
      afdeling?: string;
      aantal: number;
      totaalUren: number;
      jarenActief: Array<{ jaar: number; uren: number; activiteit: string }>;
      isStakeholder: boolean;
      isReview: boolean;
      isTbd: boolean;
      categorie: LezingCCategorie;
    };
    const perFunctie = new Map<string, RolAgg>();
    for (const jr of d.jaren ?? []) {
      for (const r of jr.rollen ?? []) {
        const fid = r.functieId ?? r.functieNaam ?? "onbekend";
        const selF = sel[fid];
        const cat = bepaalCategorie(d.domein, fid, r.functieNaam, selF, lez);
        const naamLower = (r.functieNaam ?? "").toLowerCase();
        const isTbd =
          naamLower.includes("nader te bepalen") ||
          naamLower.includes("nog te benoemen") ||
          naamLower.includes("tbd");
        const cur =
          perFunctie.get(fid) ??
          ({
            functieId: fid,
            functieNaam: r.functieNaam ?? fid,
            afdeling: r.afdeling,
            aantal: selF?.aantal ?? 1,
            totaalUren: 0,
            jarenActief: [],
            isStakeholder: selF?.stakeholder === true,
            isReview: selF?.reviewVereist === true,
            isTbd,
            categorie: cat,
          } as RolAgg);
        cur.totaalUren += r.uren ?? 0;
        if ((r.uren ?? 0) > 0) {
          cur.jarenActief.push({
            jaar: jr.jaar,
            uren: r.uren ?? 0,
            activiteit: jr.activiteit ?? "",
          });
        }
        perFunctie.set(fid, cur);
      }
    }
    const perCategorie: Record<LezingCCategorie, RolAgg[]> = {
      leider: [],
      kernteam: [],
      trainings_deelnemer: [],
      geconsulteerd: [],
    };
    for (const r of perFunctie.values()) {
      perCategorie[r.categorie].push(r);
    }
    for (const c of CATEGORIE_VOLGORDE_F) {
      perCategorie[c].sort((a, b) => b.totaalUren - a.totaalUren);
    }
    const totals: Record<
      LezingCCategorie,
      { personen: number; uren: number; rollen: number }
    > = {
      leider: { personen: 0, uren: 0, rollen: 0 },
      kernteam: { personen: 0, uren: 0, rollen: 0 },
      trainings_deelnemer: { personen: 0, uren: 0, rollen: 0 },
      geconsulteerd: { personen: 0, uren: 0, rollen: 0 },
    };
    for (const c of CATEGORIE_VOLGORDE_F) {
      for (const r of perCategorie[c]) {
        totals[c].personen += r.aantal;
        totals[c].uren += r.totaalUren;
        totals[c].rollen += 1;
      }
    }
    return { domein: d.domein, totaalUren: d.totaalUren ?? 0, perCategorie, totals };
  });

  return (
    <div className="rounded-lg border-2 border-[#003366]/30 bg-white overflow-hidden">
      <div className="bg-[#003366] text-white px-3 py-2 flex items-baseline justify-between gap-2 flex-wrap">
        <div>
          <p className="text-[10px] uppercase tracking-wider font-bold opacity-80">
            Werkelijke rollen per categorie — over hele scenario-looptijd
          </p>
          <p className="text-xs opacity-90">
            Per domein gegroepeerd zodat trainings-deelnemers en geconsulteerden zichtbaar zijn, ongeacht in welk jaar hun uren vallen
          </p>
        </div>
        <p className="text-[10px] italic opacity-80">
          {aantalJaren} jaar · som over alle scenario-jaren
        </p>
      </div>
      <div className="p-3 space-y-3">
        {perDomein.map((dInfo) => {
          const hex = DOMAIN_BAR_HEX[dInfo.domein] ?? "#6b7280";
          return (
            <div
              key={dInfo.domein}
              className="rounded border border-gray-200 bg-gray-50/50 p-2.5"
            >
              <div className="flex items-baseline justify-between gap-2 flex-wrap mb-2">
                <div className="flex items-center gap-1.5">
                  <span
                    className="inline-block w-2.5 h-2.5 rounded-full"
                    style={{ backgroundColor: hex }}
                  />
                  <span className="text-sm font-bold text-gray-800">
                    {DOMAIN_LABEL[dInfo.domein] ?? dInfo.domein}
                  </span>
                </div>
                <span className="text-[11px] font-mono tabular-nums text-gray-700">
                  {dInfo.totaalUren.toLocaleString("nl-NL")}u totaal
                </span>
              </div>
              <div className="space-y-1.5">
                {CATEGORIE_VOLGORDE_F.map((cat) => {
                  const rollen = dInfo.perCategorie[cat];
                  if (rollen.length === 0) return null;
                  const tot = dInfo.totals[cat];
                  const aandeelPct =
                    dInfo.totaalUren > 0
                      ? Math.round((tot.uren / dInfo.totaalUren) * 100)
                      : 0;
                  return (
                    <div
                      key={cat}
                      className={`rounded border-l-4 ${CATEGORIE_BLOK_BG_F[cat]} p-2`}
                    >
                      <div className="flex items-baseline justify-between gap-2 flex-wrap mb-1">
                        <div className="flex items-center gap-1.5 flex-wrap">
                          <span
                            className={`inline-block ${CATEGORIE_CHIP_BG_F[cat]} text-white text-[10px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded`}
                          >
                            {LEZING_C_CATEGORIE_LABEL[cat]}
                          </span>
                          <span className="text-[11px] font-semibold text-gray-800">
                            {tot.rollen} rol{tot.rollen === 1 ? "" : "len"} ·{" "}
                            {tot.personen} {tot.personen === 1 ? "persoon" : "personen"}
                          </span>
                        </div>
                        <span className="text-[11px] font-mono tabular-nums text-gray-700">
                          {tot.uren.toLocaleString("nl-NL")}u ({aandeelPct}%)
                        </span>
                      </div>
                      <p className="text-[10px] italic text-gray-600 leading-snug mb-1.5 pl-1">
                        {CATEGORIE_UITLEG_F[cat]}
                      </p>
                      <div className="space-y-1">
                        {rollen.map((r) => {
                          const urenLabel = r.isStakeholder
                            ? "Stakeholder (geen uren-belasting)"
                            : r.totaalUren === 0
                              ? "0u — geen actieve uren in dit scenario"
                              : `${r.totaalUren.toLocaleString("nl-NL")}u over ${aantalJaren}j`;
                          const jaarDetailKort = r.jarenActief
                            .map((j) => `${j.uren}u in ${j.jaar}`)
                            .join(" + ");
                          let aantalLabel = "";
                          if (r.aantal > 1) aantalLabel = ` (${r.aantal} personen)`;
                          return (
                            <div
                              key={r.functieId}
                              className="bg-white rounded border border-gray-200 px-2 py-1 text-xs flex items-baseline justify-between gap-2 flex-wrap"
                            >
                              <div className="flex items-baseline gap-1.5 flex-wrap min-w-0">
                                <span className="font-medium text-gray-900">
                                  {r.functieNaam}
                                </span>
                                {r.afdeling && (
                                  <span className="text-[10px] text-gray-500">
                                    ({r.afdeling})
                                  </span>
                                )}
                                {aantalLabel && (
                                  <span className="text-[10px] font-semibold text-gray-700">
                                    {aantalLabel}
                                  </span>
                                )}
                                {r.isStakeholder && (
                                  <span className="text-[9px] uppercase tracking-wider font-semibold text-purple-700 bg-purple-100 border border-purple-200 px-1 py-0 rounded">
                                    Stakeholder
                                  </span>
                                )}
                                {r.isReview && !r.isStakeholder && (
                                  <span className="text-[9px] uppercase tracking-wider font-semibold text-amber-800 bg-amber-100 border border-amber-300 px-1 py-0 rounded">
                                    Review nodig
                                  </span>
                                )}
                                {r.isTbd && (
                                  <span className="text-[9px] uppercase tracking-wider font-bold text-amber-800 bg-amber-100 border border-amber-300 px-1 py-0 rounded">
                                    TBD
                                  </span>
                                )}
                              </div>
                              <div className="text-right shrink-0">
                                <p className="font-mono tabular-nums text-gray-800 font-semibold">
                                  {urenLabel}
                                </p>
                                {!r.isStakeholder &&
                                  r.jarenActief.length > 0 &&
                                  r.jarenActief.length < aantalJaren && (
                                    <p className="text-[10px] text-gray-500 italic leading-tight">
                                      {jaarDetailKort}
                                    </p>
                                  )}
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ============================================================================
// F2 — Optelling rollen → scenario-totaal (analoog aan SectieB)
// ============================================================================

function UrenF2Optelling({
  interneUrenScen,
  interneUren,
  uurtariefSettings,
  startJaar,
}: {
  interneUrenScen: UrenFScenario;
  interneUren: UrenFAdvies | null;
  uurtariefSettings?: { basisTarief: number; referentiejaar: number; indexatiePercentage: number };
  startJaar: number;
}) {
  const domeinen = interneUrenScen.domeinen ?? [];
  const totaalUren = interneUrenScen.totaalUren ?? 0;
  const totaalKosten = interneUrenScen.totaalKosten ?? 0;
  // Normaliseer indexatie naar percent-punten (zoals F1)
  const indexPctRawF2 = uurtariefSettings?.indexatiePercentage ?? 5;
  const indexPctNorm = indexPctRawF2 <= 1 ? indexPctRawF2 * 100 : indexPctRawF2;
  const startTarief =
    interneUrenScen.uurtariefGebruikt ??
    (uurtariefSettings
      ? Math.round(
          uurtariefSettings.basisTarief *
            Math.pow(1 + indexPctNorm / 100, startJaar - uurtariefSettings.referentiejaar),
        )
      : 70);

  // Per domein: rollen-uniek + personen-totaal + som-uren + top-rollen voor breakdown
  type RolAggregaat = { naam: string; functieId: string; uren: number; aantalJaren: number };
  const rijen = domeinen.map((d) => {
    const jaren = d.jaren ?? [];
    // Aggregeer uren per functieId over alle jaren
    const perFunctie = new Map<string, RolAggregaat>();
    for (const jr of jaren) {
      for (const r of jr.rollen ?? []) {
        const key = r.functieId ?? r.functieNaam ?? "onbekend";
        const cur = perFunctie.get(key) ?? { naam: r.functieNaam ?? key, functieId: key, uren: 0, aantalJaren: 0 };
        cur.uren += r.uren ?? 0;
        cur.aantalJaren += 1;
        perFunctie.set(key, cur);
      }
    }
    const aantalRollen = perFunctie.size;
    const rollenAgg = Array.from(perFunctie.values()).sort((a, b) => b.uren - a.uren);
    const somUren = rollenAgg.reduce((s, v) => s + v.uren, 0);
    const dTot = d.totaalUren ?? somUren;
    // Interpretatie B: drie uren-types — lees scenario-data als gezet, anders formule.
    let progU: number;
    let lijnU: number;
    let raadpU: number;
    if (
      typeof d.programmaUren === "number" ||
      typeof d.lijnUren === "number"
    ) {
      progU = d.programmaUren ?? 0;
      lijnU = d.lijnUren ?? 0;
      raadpU = d.raadplegenUren ?? 0;
    } else {
      const pct =
        typeof d.programmaPct === "number" && d.programmaPct >= 0 && d.programmaPct <= 1
          ? d.programmaPct
          : PROGRAMMA_PCT_DEFAULT[d.domein] ?? 0.75;
      progU = Math.round(dTot * pct);
      lijnU = Math.round(dTot * (1 - pct));
      raadpU = 0;
    }
    const progPct = dTot > 0 ? Math.round((progU / dTot) * 100) : 0;
    const lijnPct = dTot > 0 ? Math.round((lijnU / dTot) * 100) : 0;
    const raadpPct = dTot > 0 ? Math.round((raadpU / dTot) * 100) : 0;
    return {
      domein: d.domein,
      aantalRollen,
      aantalKeren: rollenAgg.reduce((s, v) => s + v.aantalJaren, 0),
      somUren,
      dTot,
      progU,
      lijnU,
      raadpU,
      progPct,
      lijnPct,
      raadpPct,
      rollenAgg,
    };
  });

  const somAlleUren = rijen.reduce((s, r) => s + r.dTot, 0);
  const tol = Math.max(50, Math.round(totaalUren * 0.005));
  const matchOk = Math.abs(somAlleUren - totaalUren) <= tol;

  // Per-jaar-kosten-uitsplitsing voor de scenario-totaal kosten-formule
  const totalenPerJaar = interneUrenScen.totalenPerJaar ?? [];

  // ===== Lezing-C categorie-uitsplitsing per domein =====
  const lez = interneUren?.interneUrenLezing;
  const niveaus: Record<LezingCCategorie, UrenNiveau> = {
    leider: { ...LEZING_C_DEFAULTS.leider, ...(lez?.urenNiveaus?.leider ?? {}) },
    kernteam: { ...LEZING_C_DEFAULTS.kernteam, ...(lez?.urenNiveaus?.kernteam ?? {}) },
    trainings_deelnemer: { ...LEZING_C_DEFAULTS.trainings_deelnemer, ...(lez?.urenNiveaus?.trainings_deelnemer ?? {}) },
    geconsulteerd: { ...LEZING_C_DEFAULTS.geconsulteerd, ...(lez?.urenNiveaus?.geconsulteerd ?? {}) },
  };
  const aantalJrCateg = interneUrenScen.aantalJaren ?? 0;
  // Schatting jaarlijkse leider-uren = gem. piek-jaar + buiten-piek-jaren / loopjaar
  // Voor advies (4j): 1 piek + 2 buiten-piek + 1 borging ≈ (80 + 2×40 + 25)/4 = ~46u/jr → totaal 185u
  // Eenvoudige benadering: piek + (jaren-1) × buitenPiek (zonder borging-uitsplitsing
  // omdat we niet weten of er borgings-jaren in dit scenario zitten).
  function leiderTotaalPerInsp(): number {
    const piek = niveaus.leider.piek ?? 80;
    const buiten = niveaus.leider.buitenPiek ?? 40;
    const borging = niveaus.leider.borging ?? 25;
    if (aantalJrCateg <= 1) return piek;
    if (aantalJrCateg <= 3) return piek + (aantalJrCateg - 1) * buiten;
    // 4+ jaar: 1 piek + (j-2) buiten + 1 borging
    return piek + Math.max(0, aantalJrCateg - 2) * buiten + borging;
  }
  function kernteamTotaalPerPersoon(): number {
    const piek = niveaus.kernteam.piek ?? 40;
    const buiten = niveaus.kernteam.buitenPiek ?? 15;
    const borging = niveaus.kernteam.borging ?? 10;
    if (aantalJrCateg <= 1) return piek;
    if (aantalJrCateg <= 3) return piek + (aantalJrCateg - 1) * buiten;
    return piek + Math.max(0, aantalJrCateg - 2) * buiten + borging;
  }
  const leiderTot = leiderTotaalPerInsp();
  const kernteamTot = kernteamTotaalPerPersoon();
  const cursistTot = niveaus.trainings_deelnemer.totaal ?? 46;
  const geconsTot = niveaus.geconsulteerd.totaal ?? 6;

  // Per-domein categorieën — gebruik defaults voor aantal kernteam/cursist/gecons
  // Leider-naam komt uit interneUrenLezing.inspanningsleiders[d] of fallback
  const categorieRijen = rijen.map((r) => {
    const dKey = r.domein as "cultuur" | "mens" | "data_systemen" | "processen";
    const leiderInfo = lez?.inspanningsleiders?.[dKey];
    const leiderNaam = leiderInfo?.naam || (
      r.domein === "mens" || r.domein === "cultuur" ? "Yara" :
      r.domein === "data_systemen" ? "Sven" :
      r.domein === "processen" ? "TBD" : "—"
    );
    const leiderTbd = !!leiderInfo?.tbd || leiderNaam === "TBD";
    const kernteamN = LEZING_C_KERNTEAM_GROOTTE_DEFAULT[r.domein] ?? 5;
    const cursistN = LEZING_C_HEEFT_TRAININGS_DEELNEMERS[r.domein]
      ? (LEZING_C_AANTAL_DEELNEMERS_DEFAULT[r.domein] ?? 0)
      : 0;
    const geconsN = LEZING_C_GECONSULTEERDEN_DEFAULT[r.domein] ?? 0;

    const leiderUren = leiderTot;       // 1 leider × leiderTot
    const kernteamUren = kernteamN * kernteamTot;
    const cursistUren = cursistN * cursistTot;
    const geconsUren = geconsN * geconsTot;
    const totUren = leiderUren + kernteamUren + cursistUren + geconsUren;

    return {
      domein: r.domein,
      leiderNaam,
      leiderTbd,
      leiderUren,
      kernteamN,
      kernteamUren,
      cursistN,
      cursistUren,
      geconsN,
      geconsUren,
      totUren,
      werkelijkUren: r.dTot,
    };
  });

  return (
    <div className="rounded-lg border border-gray-200 bg-white p-4 space-y-3">
      {/* Categorie-groepsoverzicht — werkelijke rollen per categorie over hele
          looptijd. Geconsulteerden en trainings-deelnemers in één lijst per
          categorie zodat hun verdeling zichtbaar is, ongeacht in welk jaar
          hun uren vallen. */}
      <CategorieGroepsoverzichtF
        interneUrenScen={interneUrenScen}
        interneUren={interneUren}
      />

      {/* Lezing-C: per domein per categorie */}
      <div className="rounded bg-[#003366]/[0.03] border border-[#003366]/20 p-3">
        <p className="text-[10px] uppercase tracking-wider font-bold text-[#003366] mb-1.5">
          Lezing-C optelling — per domein per categorie (defaults / aggregaten)
        </p>
        <p className="text-[11px] text-gray-600 italic mb-2 leading-snug">
          <strong className="not-italic">Formule per cel:</strong> aantal × u/persoon × looptijd-correctie. De berekening staat onder elke cel zichtbaar.
          {lez?.lezing === "C" ? (
            <> Aantallen komen uit <code className="font-mono text-[10px] bg-gray-100 px-1 rounded">interneUrenLezing.rolCategorieen</code>; uren-niveaus uit <code className="font-mono text-[10px] bg-gray-100 px-1 rounded">interneUrenLezing.urenNiveaus</code>.</>
          ) : (
            <> Aantallen en niveaus zijn defaults (Lezing-C-marker nog niet in data). Bron: AUDIT-KERNTEAM-MODEL.md.</>
          )}
        </p>
        {/* Inline samenvatting van per-categorie-formules — vervangt cell-tooltips. */}
        <div className="mb-2 rounded bg-white border border-[#003366]/10 p-2 text-[10px] text-gray-600 leading-snug font-sans space-y-0.5">
          <p>
            <span className="font-semibold text-gray-700">Leider-totaal/insp:</span> 1p × {leiderTot}u (= piek {niveaus.leider.piek}u + {Math.max(0, aantalJrCateg - 2)} × buiten-piek {niveaus.leider.buitenPiek}u{aantalJrCateg >= 4 ? ` + borging ${niveaus.leider.borging}u` : ""}) over {aantalJrCateg}j.
          </p>
          <p>
            <span className="font-semibold text-gray-700">Kernteam-totaal/persoon:</span> {kernteamTot}u (= piek {niveaus.kernteam.piek}u + {Math.max(0, aantalJrCateg - 2)} × buiten-piek {niveaus.kernteam.buitenPiek}u{aantalJrCateg >= 4 ? ` + borging ${niveaus.kernteam.borging}u` : ""}).
          </p>
          <p>
            <span className="font-semibold text-gray-700">Cursist-totaal/persoon:</span> {cursistTot}u contacttijd over 2 trainings-blokken (Basis + Vaardigheid) — alleen mens-domein.
          </p>
          <p>
            <span className="font-semibold text-gray-700">Geconsulteerd-totaal/persoon:</span> {geconsTot}u/looptijd review-input.
          </p>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-xs">
            <thead>
              <tr className="text-left border-b-2 border-[#003366]/30">
                <th className="py-2 pr-2 font-semibold text-gray-700">Domein</th>
                <th className="py-2 px-2 font-mono text-right font-semibold text-gray-700">Leider</th>
                <th className="py-2 px-2 font-mono text-right font-semibold text-gray-700">Kernteam</th>
                <th className="py-2 px-2 font-mono text-right font-semibold text-gray-700">Trainings-deelnemer</th>
                <th className="py-2 px-2 font-mono text-right font-semibold text-gray-700">Geconsulteerd</th>
                <th className="py-2 px-2 font-mono text-right font-semibold text-[#003366]">Totaal Lezing-C</th>
              </tr>
            </thead>
            <tbody>
              {categorieRijen.map((c) => {
                const hex = DOMAIN_BAR_HEX[c.domein] ?? "#6b7280";
                return (
                  <tr key={c.domein} className="border-b border-[#003366]/10 last:border-0">
                    <td className="py-1.5 pr-2 font-medium text-gray-800">
                      <span className="inline-flex items-center gap-1.5">
                        <span className="inline-block w-2 h-2 rounded-full" style={{ backgroundColor: hex }} />
                        {DOMAIN_LABEL[c.domein] ?? c.domein}
                      </span>
                    </td>
                    <td className="py-1.5 px-2 font-mono text-right text-gray-800 align-top">
                      <div>
                        <span className="text-gray-700">{c.leiderNaam}</span>
                        {c.leiderTbd && (
                          <span className="ml-1 inline-block text-[9px] uppercase tracking-wider font-bold text-amber-800 bg-amber-100 border border-amber-300 px-1 py-0 rounded">
                            TBD
                          </span>
                        )}
                        <span className="ml-1.5 text-gray-900 font-semibold">{c.leiderUren}u</span>
                      </div>
                      <div className="text-[9px] text-gray-500 font-sans leading-tight mt-0.5">
                        1p × {leiderTot}u/looptijd
                      </div>
                    </td>
                    <td className="py-1.5 px-2 font-mono text-right text-gray-700 align-top">
                      <div>
                        {c.kernteamN}p × {kernteamTot}u = <strong className="text-gray-900">{c.kernteamUren.toLocaleString("nl-NL")}u</strong>
                      </div>
                      <div className="text-[9px] text-gray-500 font-sans leading-tight mt-0.5">
                        over {aantalJrCateg}j (piek + buiten-piek{aantalJrCateg >= 4 ? " + borging" : ""})
                      </div>
                    </td>
                    <td className="py-1.5 px-2 font-mono text-right text-gray-700 align-top">
                      {c.cursistN > 0 ? (
                        <>
                          <div>
                            {c.cursistN}p × {cursistTot}u = <strong className="text-gray-900">{c.cursistUren.toLocaleString("nl-NL")}u</strong>
                          </div>
                          <div className="text-[9px] text-gray-500 font-sans leading-tight mt-0.5">
                            2 trainings-blokken
                          </div>
                        </>
                      ) : (
                        <span className="text-gray-400">—</span>
                      )}
                    </td>
                    <td className="py-1.5 px-2 font-mono text-right text-gray-700 align-top">
                      {c.geconsN > 0 ? (
                        <>
                          <div>
                            {c.geconsN}p × {geconsTot}u = <strong className="text-gray-900">{c.geconsUren.toLocaleString("nl-NL")}u</strong>
                          </div>
                          <div className="text-[9px] text-gray-500 font-sans leading-tight mt-0.5">
                            review-input/looptijd
                          </div>
                        </>
                      ) : (
                        <span className="text-gray-400">—</span>
                      )}
                    </td>
                    <td className="py-1.5 px-2 font-mono text-right text-[#003366] font-bold align-top">
                      <div>{c.totUren.toLocaleString("nl-NL")}u</div>
                      <div className="text-[9px] text-gray-500 font-sans font-normal leading-tight mt-0.5">
                        werkelijk {c.werkelijkUren.toLocaleString("nl-NL")}u (Δ {c.werkelijkUren - c.totUren >= 0 ? "+" : ""}{(c.werkelijkUren - c.totUren).toLocaleString("nl-NL")}u)
                      </div>
                    </td>
                  </tr>
                );
              })}
              <tr className="border-t-2 border-[#003366] font-mono">
                <td className="py-2 pr-2 font-bold text-[#003366]">Totaal Lezing-C</td>
                <td className="py-2 px-2 text-right text-gray-800">
                  {categorieRijen.reduce((s, c) => s + c.leiderUren, 0).toLocaleString("nl-NL")}u
                </td>
                <td className="py-2 px-2 text-right text-gray-800">
                  {categorieRijen.reduce((s, c) => s + c.kernteamUren, 0).toLocaleString("nl-NL")}u
                </td>
                <td className="py-2 px-2 text-right text-gray-800">
                  {categorieRijen.reduce((s, c) => s + c.cursistUren, 0).toLocaleString("nl-NL")}u
                </td>
                <td className="py-2 px-2 text-right text-gray-800">
                  {categorieRijen.reduce((s, c) => s + c.geconsUren, 0).toLocaleString("nl-NL")}u
                </td>
                <td className="py-2 px-2 text-right font-bold text-[#003366]">
                  {categorieRijen.reduce((s, c) => s + c.totUren, 0).toLocaleString("nl-NL")}u
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>

      <p className="text-[10px] text-gray-500 italic leading-snug pl-2 border-l-2 border-gray-300">
        Onderstaande optelling per domein toont de driedeling <strong className="not-italic font-semibold">programma / lijn / raadplegen</strong> (interpretatie B). Lezing-C bovenstaande is de categorie-doorrekening; hieronder is de scenario-rol-data zoals doorgevoerd. <strong className="not-italic font-semibold">Raadplegen-uren</strong> = incidentele consultatie van geconsulteerden, valt buiten programma- en lijn-toewijzing.
      </p>
      <div className="rounded bg-gray-50/70 border border-gray-200 p-2 text-[10px] text-gray-600 leading-snug space-y-0.5">
        <p>
          <strong className="text-gray-700">Programma-pct rationale per categorie (interpretatie B):</strong> Leider 90% (werk valt buiten functieprofiel) · Kernteam-uitvoerend 80% (~20% L&amp;D-baseline) · Kernteam-MT cultuur 50% (voorbeeldgedrag valt half in lijn) · Trainings-deelnemer 50% (~16u standaard L&amp;D) · Geconsulteerd 0% (= raadplegen).
        </p>
        <p>
          <strong className="text-gray-700">Lijn-definitie:</strong> werk dat past binnen bestaand functieprofiel + bestaand afdelingsbudget + bestaande jaarcyclus (HRM/L&amp;D/beheer) — alleen wanneer alle drie waar zijn.
        </p>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-xs">
          <thead>
            <tr className="text-left border-b-2 border-gray-300">
              <th className="py-2 pr-2 font-semibold text-gray-700">Domein</th>
              <th className="py-2 px-2 font-mono text-right font-semibold text-gray-700">Rollen</th>
              <th className="py-2 px-2 font-mono text-right font-semibold text-gray-700">Rol×jaar</th>
              <th className="py-2 px-2 font-mono text-right font-semibold text-gray-700">Som-uren</th>
              <th className="py-2 px-2 font-mono text-right font-semibold text-[#003366]">Programma</th>
              <th className="py-2 px-2 font-mono text-right font-semibold text-gray-700">Lijn</th>
              <th className="py-2 px-2 font-mono text-right font-semibold text-purple-700">Raadplegen</th>
            </tr>
          </thead>
          <tbody>
            {rijen.map((r) => {
              const hex = DOMAIN_BAR_HEX[r.domein] ?? "#6b7280";
              const top3 = r.rollenAgg.slice(0, 3);
              return (
                <tr key={r.domein} className="border-b border-gray-100 last:border-0">
                  <td className="py-1.5 pr-2 font-medium text-gray-800 align-top">
                    <span className="inline-flex items-center gap-1.5">
                      <span className="inline-block w-2 h-2 rounded-full" style={{ backgroundColor: hex }} />
                      {DOMAIN_LABEL[r.domein] ?? r.domein}
                    </span>
                  </td>
                  <td className="py-1.5 px-2 font-mono text-right text-gray-700 align-top">
                    {r.aantalRollen}
                    <div className="text-[9px] text-gray-500 font-sans leading-tight mt-0.5">
                      unieke functieIds
                    </div>
                  </td>
                  <td className="py-1.5 px-2 font-mono text-right text-gray-500 align-top">
                    {r.aantalKeren}
                    <div className="text-[9px] text-gray-500 font-sans leading-tight mt-0.5">
                      ⌀ {r.aantalRollen > 0 ? (r.aantalKeren / r.aantalRollen).toFixed(1) : "—"} jr/rol
                    </div>
                  </td>
                  <td className="py-1.5 px-2 font-mono text-right text-gray-900 font-semibold align-top">
                    {r.dTot.toLocaleString("nl-NL")} u
                    {top3.length > 0 && (
                      <div className="text-[9px] text-gray-500 font-sans font-normal leading-tight mt-0.5">
                        top: {top3[0].naam} ({Math.round((top3[0].uren / r.dTot) * 100)}%)
                      </div>
                    )}
                  </td>
                  <td className="py-1.5 px-2 font-mono text-right text-[#003366] align-top">
                    {r.progU.toLocaleString("nl-NL")} u
                    <span className="text-[10px] text-gray-500 ml-1">({r.progPct}%)</span>
                    <div className="text-[9px] text-gray-500 font-sans leading-tight mt-0.5">
                      {r.dTot} × {r.progPct}%
                    </div>
                  </td>
                  <td className="py-1.5 px-2 font-mono text-right text-gray-700 align-top">
                    {r.lijnU.toLocaleString("nl-NL")} u
                    <span className="text-[10px] text-gray-500 ml-1">({r.lijnPct}%)</span>
                    <div className="text-[9px] text-gray-500 font-sans leading-tight mt-0.5">
                      {r.dTot} × {r.lijnPct}%
                    </div>
                  </td>
                  <td className={`py-1.5 px-2 font-mono text-right align-top ${r.raadpU > 0 ? "text-purple-700" : "text-gray-400"}`}>
                    {r.raadpU > 0 ? (
                      <>
                        {r.raadpU.toLocaleString("nl-NL")} u
                        <span className="text-[10px] text-gray-500 ml-1">({r.raadpPct}%)</span>
                        <div className="text-[9px] text-gray-500 font-sans leading-tight mt-0.5">
                          {r.dTot} × {r.raadpPct}%
                        </div>
                      </>
                    ) : (
                      <span>—</span>
                    )}
                  </td>
                </tr>
              );
            })}
            <tr className="border-t-2 border-[#003366] font-mono">
              <td className="py-2 pr-2 font-bold text-[#003366]">Totaal</td>
              <td className="py-2 px-2"></td>
              <td className="py-2 px-2"></td>
              <td className="py-2 px-2 text-right font-bold text-[#003366]">
                {somAlleUren.toLocaleString("nl-NL")} u
              </td>
              <td className="py-2 px-2 text-right font-bold text-[#003366]">
                {rijen.reduce((s, r) => s + r.progU, 0).toLocaleString("nl-NL")} u
              </td>
              <td className="py-2 px-2 text-right font-bold text-gray-700">
                {rijen.reduce((s, r) => s + r.lijnU, 0).toLocaleString("nl-NL")} u
              </td>
              <td className="py-2 px-2 text-right font-bold text-purple-700">
                {rijen.reduce((s, r) => s + r.raadpU, 0).toLocaleString("nl-NL")} u
              </td>
            </tr>
          </tbody>
        </table>
      </div>

      <div className="flex items-center justify-between text-xs text-gray-600">
        <span>Scenario-totaal (referentie)</span>
        <span className="font-mono">{totaalUren.toLocaleString("nl-NL")} u</span>
      </div>
      {!matchOk && totaalUren > 0 && (
        <div className="rounded bg-amber-50 border border-amber-200 p-2 text-xs text-amber-900">
          ⚠ Verschil van {Math.abs(somAlleUren - totaalUren).toLocaleString("nl-NL")} u — groter dan de toegestane afwijking ({tol} u). Doorgaans rounding op rol-niveau.
        </div>
      )}

      {/* Kosten-formule + per-jaar-uitsplitsing */}
      <div className="rounded bg-gray-50 border border-gray-200 p-3 font-mono text-[11px] space-y-1">
        <p className="text-[10px] uppercase tracking-wider font-bold text-gray-700 font-sans mb-1">
          Scenario-totaal kosten (geïndexeerd per jaar)
        </p>
        <div className="flex items-baseline justify-between">
          <span>Σ uren × tarief({startJaar}+i, basis € {uurtariefSettings?.basisTarief ?? 70})</span>
          <span className="font-bold text-gray-900">{formatEur(totaalKosten)}</span>
        </div>
        <p className="text-[10px] text-gray-500 font-sans italic">
          Kosten per jaar = uren × geïndexeerd tarief (basis × (1 + {indexPctNorm}%)^(jaar − {uurtariefSettings?.referentiejaar ?? 2025})). Tarief in jaar 1 ≈ € {startTarief}/u.
        </p>
        {totalenPerJaar.length > 0 && (
          <details className="mt-2 border-t border-gray-200 pt-1.5">
            <summary className="cursor-pointer text-[10px] uppercase tracking-wider font-bold text-gray-700 font-sans hover:text-[#003366]">
              Per-jaar-uitsplitsing (uren × tarief = kosten)
            </summary>
            <div className="mt-1.5 space-y-0.5">
              {totalenPerJaar.map((t) => {
                const tarief = uurtariefSettings
                  ? Math.round(uurtariefSettings.basisTarief * Math.pow(1 + indexPctNorm / 100, t.jaar - uurtariefSettings.referentiejaar))
                  : startTarief;
                const aandeel = totaalUren > 0 ? Math.round(((t.uren ?? 0) / totaalUren) * 100) : 0;
                return (
                  <div key={t.jaar} className="flex items-baseline justify-between gap-2 text-[11px]">
                    <span className="text-gray-700 w-12">{t.jaar}</span>
                    <span className="text-gray-500 flex-1">
                      {(t.uren ?? 0).toLocaleString("nl-NL")} u × € {tarief}
                    </span>
                    <span className="text-gray-900 font-semibold w-20 text-right">{formatEur(t.kosten ?? 0)}</span>
                    <span className="text-gray-400 text-[10px] w-8 text-right">{aandeel}%</span>
                  </div>
                );
              })}
              <div className="border-t border-gray-300 pt-1 mt-1 flex items-baseline justify-between gap-2 font-bold text-gray-800">
                <span>Σ</span>
                <span>{totaalUren.toLocaleString("nl-NL")} u</span>
                <span className="w-20 text-right">{formatEur(totaalKosten)}</span>
                <span className="w-8" />
              </div>
            </div>
            <p className="text-[10px] text-gray-500 font-sans italic mt-1.5">
              Aandeel-% per jaar laat de cap-curve zien: J1 (start juni) is laag (5–8%), piek in J3–J5 afhankelijk van scenario, daarna afbouw. Voor min20 zie je een lange staart van ~5% in J8–J10 — structureel beheer/doorontwikkeling.
            </p>
          </details>
        )}
      </div>
    </div>
  );
}

// ============================================================================
// F3 — Per-fase verdeling per domein (analoog aan SectieC)
// ============================================================================

function UrenF3PerDomein({
  interneUrenScen,
  interneUren,
  begrotingScenario,
  startJaar,
}: {
  interneUrenScen: UrenFScenario;
  interneUren: UrenFAdvies | null;
  begrotingScenario: BegrotingScenario;
  startJaar: number;
}) {
  const domeinen = interneUrenScen.domeinen ?? [];
  if (domeinen.length === 0) {
    return <p className="text-xs text-gray-500 italic">Geen domein-data beschikbaar.</p>;
  }
  const lezMarker = interneUren?.interneUrenLezing;
  const selectie = interneUren?.selectiePerDomein;
  return (
    <div className="space-y-2">
      {domeinen.map((d) => (
        <UrenF3DomeinKaart
          key={d.domein}
          domein={d}
          begrotingInspanningen={begrotingScenario.inspanningen ?? []}
          startJaar={startJaar}
          aantalJaren={begrotingScenario.aantalJaren ?? interneUrenScen.aantalJaren ?? 0}
          lezMarker={lezMarker}
          selectie={selectie}
        />
      ))}
    </div>
  );
}

function UrenF3DomeinKaart({
  domein,
  begrotingInspanningen,
  startJaar,
  aantalJaren,
  lezMarker,
  selectie,
}: {
  domein: UrenFDomein;
  begrotingInspanningen: InspanningBegroting[];
  startJaar: number;
  aantalJaren: number;
  lezMarker?: InterneUrenLezingMarker;
  selectie?: UrenFAdvies["selectiePerDomein"];
}) {
  const dKey = domein.domein;
  const dTot = domein.totaalUren ?? 0;
  const fz = FASE_ZWAARTE[dKey] ?? FASE_ZWAARTE.processen;
  const hex = DOMAIN_BAR_HEX[dKey] ?? "#6b7280";
  const jaren = domein.jaren ?? [];

  // F3.1: fase-curve uit begrotingAdvies — pak de inspanningen die in dit
  // domein vallen, neem voor elke jaar de eerst-genoemde fase als
  // representatief.
  const inspanningenVoorDomein = begrotingInspanningen.filter((i) => i.domein === dKey);
  const fasePerJaar: Map<number, string> = new Map();
  for (let i = 0; i < aantalJaren; i++) {
    const jaar = startJaar + i;
    const fasen = inspanningenVoorDomein
      .flatMap((insp) => insp.verdelingPerJaar.filter((v) => v.jaar === jaar))
      .map((v) => v.fase)
      .filter(Boolean);
    if (fasen.length > 0) {
      // Neem de meest voorkomende fase
      const counts = new Map<string, number>();
      for (const f of fasen) counts.set(f, (counts.get(f) ?? 0) + 1);
      const top = Array.from(counts.entries()).sort((a, b) => b[1] - a[1])[0];
      fasePerJaar.set(jaar, top[0]);
    }
  }

  // F3.2: fase-zwaarte toegepast → bereken bruto verdeling per jaar.
  // Som van actief-jaren-zwaarte normaliseren naar 100% zodat dTot exact verdeeld wordt.
  const brutoZwaartePerJaar: Map<number, number> = new Map();
  let zwaarteSom = 0;
  for (let i = 0; i < aantalJaren; i++) {
    const jaar = startJaar + i;
    const f = normaliseerFase(fasePerJaar.get(jaar));
    const z = fz[f] ?? 0.25;
    brutoZwaartePerJaar.set(jaar, z);
    zwaarteSom += z;
  }
  const brutoUrenPerJaar: Map<number, number> = new Map();
  for (const [jaar, z] of brutoZwaartePerJaar.entries()) {
    const u = zwaarteSom > 0 ? Math.round((z / zwaarteSom) * dTot) : 0;
    brutoUrenPerJaar.set(jaar, u);
  }

  // F3.3: top-3 rollen in piek-jaar (= jaar met hoogste werkelijke uren)
  let piekJaar = startJaar;
  let piekUren = 0;
  for (const jr of jaren) {
    const u = jr.totaalUren ?? 0;
    if (u > piekUren) {
      piekUren = u;
      piekJaar = jr.jaar;
    }
  }
  const piekJaarBlok = jaren.find((j) => j.jaar === piekJaar);

  // Piek-zwaarte-jaar: het jaar met de zwaarste fase-zwaarte voor dit domein.
  // Wordt gebruikt voor de gekleurde markering in F3.1 — werkt voor alle 4
  // domeinen, niet alleen data_systemen.
  let piekZwaarteJaar = startJaar;
  let piekZwaarteWaarde = -1;
  for (const [jaar, z] of brutoZwaartePerJaar.entries()) {
    if (z > piekZwaarteWaarde) {
      piekZwaarteWaarde = z;
      piekZwaarteJaar = jaar;
    }
  }
  const top3Rollen = (piekJaarBlok?.rollen ?? [])
    .slice()
    .sort((a, b) => (b.uren ?? 0) - (a.uren ?? 0))
    .slice(0, 3);

  // F3.4: programma vs lijn-berekening
  const pct =
    typeof domein.programmaPct === "number" && domein.programmaPct >= 0 && domein.programmaPct <= 1
      ? domein.programmaPct
      : PROGRAMMA_PCT_DEFAULT[dKey] ?? 0.75;
  const progU = Math.round(dTot * pct);
  const lijnU = Math.round(dTot * (1 - pct));
  const progPct = Math.round(pct * 100);
  const lijnPct = 100 - progPct;

  return (
    <details className="rounded-lg border border-gray-200 bg-white overflow-hidden">
      <summary className="cursor-pointer px-3 py-2 hover:bg-gray-50 flex items-center justify-between">
        <span className="flex items-center gap-2 text-sm font-semibold text-gray-800">
          <span className="inline-block w-2.5 h-2.5 rounded-full" style={{ backgroundColor: hex }} />
          {DOMAIN_LABEL[dKey] ?? dKey}
        </span>
        <span className="text-xs font-mono text-gray-700">
          {dTot.toLocaleString("nl-NL")} u
          <span className="text-[10px] text-gray-500 ml-2">piek {piekJaar} ({piekUren.toLocaleString("nl-NL")} u)</span>
        </span>
      </summary>

      <div className="px-4 pb-4 pt-2 space-y-4 border-t border-gray-100">
        {/* Leken-uitleg — bovenaan F3 per domein, vóór 3.1 */}
        <div
          className="rounded p-3 border-l-4"
          style={{ backgroundColor: hex + "10", borderColor: hex }}
        >
          <p className="text-sm font-semibold mb-1" style={{ color: hex }}>
            Wat doet deze sectie?
          </p>
          <p className="text-xs text-gray-800 leading-relaxed">
            We verdelen het totaal aantal uren ({dTot.toLocaleString("nl-NL")}u) over de jaren van het scenario, op basis van hoe zwaar elke fase is. Bijvoorbeeld: in een &ldquo;realisatie&rdquo;-jaar wordt meer gewerkt dan in een &ldquo;borging&rdquo;-jaar. Hieronder zie je per jaar welke fase domineert <strong className="font-semibold">(3.1)</strong>, hoe de bruto-verdeling wordt berekend <strong className="font-semibold">(3.2)</strong>, wie de meeste uren maakt in dat jaar <strong className="font-semibold">(3.3)</strong>, en hoeveel daarvan programma- vs lijn-werk is <strong className="font-semibold">(3.4)</strong>.
          </p>
        </div>

        {/* F3.1 Fase-curve */}
        <div>
          <p className="text-[10px] uppercase tracking-wider font-bold text-gray-600 mb-1.5">
            F3.1 — Fase-curve uit begrotingAdvies
          </p>
          <p className="text-xs text-gray-700 mb-1.5 leading-snug">
            <strong className="font-semibold">In het kort:</strong> per jaar bepalen welke fase (analyse / realisatie / acceptatie / beheer) domineert. Het jaar met de zwaarste fase voor dit domein krijgt een gekleurde markering — dat is het zwaartepunt-jaar.
          </p>
          <p className="text-[11px] text-gray-600 italic mb-1.5 leading-snug">
            Bron: <code className="font-mono text-[10px] bg-gray-100 px-1 rounded">begrotingAdvies.scenarios[{aantalJaren}j].inspanningen[{dKey}].verdelingPerJaar[i].fase</code>. Per jaar wordt de meest voorkomende fase-tekst genomen en gemapt naar de canonieke bucket (analyse / realisatie / acceptatie / beheer) via <code className="font-mono text-[10px] bg-gray-100 px-1 rounded">normaliseerFase()</code>. Niet-herkende fase-teksten (bv. &ldquo;Leverancier-selectie&rdquo;, &ldquo;Go-live &amp; adoptie&rdquo;, &ldquo;Doorontwikkeling&rdquo;, &ldquo;Continu verbeteren&rdquo;) krijgen fallback-zwaarte 25% — ruwweg een gelijkmatig vierde — om geen gat te laten vallen.
          </p>
          <div className="flex flex-wrap gap-1.5">
            {Array.from(brutoZwaartePerJaar.keys()).sort((a, b) => a - b).map((jaar) => {
              const f = fasePerJaar.get(jaar);
              const norm = normaliseerFase(f);
              // Piek-jaar = jaar met zwaarste fase voor dit domein (alle 4 domeinen krijgen
              // hun eigen kleur; niet meer alleen data_systemen + acceptatie).
              const isPiek = jaar === piekZwaarteJaar && norm !== "onbekend";
              const isFallback = norm === "onbekend";
              const zwaartePct = Math.round((fz[norm] ?? 0) * 100);
              return (
                <div
                  key={jaar}
                  className={`rounded border px-2 py-1.5 text-[11px] ${
                    isFallback
                      ? "border-amber-200 bg-amber-50/60 text-amber-900"
                      : isPiek
                      ? "font-semibold"
                      : "border-gray-200 bg-gray-50 text-gray-700"
                  }`}
                  style={
                    isPiek && !isFallback
                      ? {
                          backgroundColor: hex + "20",
                          borderColor: hex,
                          color: hex,
                        }
                      : undefined
                  }
                >
                  <div className="flex items-baseline gap-1">
                    <span className="font-mono">{jaar}</span>
                    <span className="mx-0.5 text-gray-400">→</span>
                    <span>{FASE_LABEL[norm] !== "—" ? FASE_LABEL[norm] : (f ?? "—")}</span>
                    {isPiek && <span className="ml-1">★</span>}
                    {isFallback && f && <span className="ml-1 text-[9px] uppercase">fb</span>}
                  </div>
                  <div className="text-[9px] font-sans leading-tight mt-0.5 opacity-80">
                    {isFallback ? "fallback 25% zwaarte" : `${zwaartePct}% zwaarte voor ${dKey}`}
                    {f && ` · raw: "${f}"`}
                  </div>
                </div>
              );
            })}
          </div>
          {inspanningenVoorDomein.length === 0 && (
            <p className="text-[11px] text-gray-500 italic mt-1">
              Geen inspanningen in begroting voor dit domein — fasen niet beschikbaar.
            </p>
          )}
          {/* Min20-staart toelichting voor data_systemen + processen */}
          {aantalJaren >= 9 && (dKey === "data_systemen" || dKey === "processen" || dKey === "mens" || dKey === "cultuur") && (
            <p className="text-[10px] text-amber-800 italic mt-1.5 leading-snug">
              <strong className="not-italic">Min20-staart (J8–J10 = {startJaar + 7}–{startJaar + 9}):</strong> de drie laatste jaren krijgen fase-teksten als &ldquo;Optimalisatie&rdquo;, &ldquo;Doorontwikkeling&rdquo;, &ldquo;Continu verbeteren&rdquo; en &ldquo;Verankering&rdquo; — die mappen niet 1-op-1 op de vier canonieke buckets. Resultaat: ~25% fallback-zwaarte per jaar, wat na normalisatie neerkomt op ~50u/jr structureel werk per domein. Concreet voor {DOMAIN_LABEL[dKey] ?? dKey}: J8–J10 ≈ {[7,8,9].map((idx) => `${jaren.find((jr) => jr.jaar === startJaar + idx)?.totaalUren ?? 0}u`).join(" / ")}. Dit is geen administratief artefact maar realistisch beheer/doorontwikkeling — bij langere doorlooptijd blijft een minimum-bezetting nodig om kennis levend te houden.
            </p>
          )}
        </div>

        {/* F3.2 Fase-zwaarte toegepast */}
        <div>
          <p className="text-[10px] uppercase tracking-wider font-bold text-gray-600 mb-1.5">
            F3.2 — Fase-zwaarte toegepast op {dTot.toLocaleString("nl-NL")} u
          </p>
          <p className="text-xs text-gray-700 mb-1.5 leading-snug">
            <strong className="font-semibold">In het kort:</strong> we rekenen per jaar uit hoeveel uren in dat jaar passen, op basis van hoe zwaar de fase telt. Je ziet eerst de bruto-verdeling (alleen op fase-zwaarte) en daarnaast wat er werkelijk uitkomt na rol-toewijzing.
          </p>
          <div className="rounded bg-gray-50 border border-gray-200 p-2.5 font-mono text-[11px] space-y-1">
            <div className="text-[10px] text-gray-500 font-sans leading-snug">
              <strong className="not-italic">Formule:</strong> bruto<sub>jaar</sub> = {dTot.toLocaleString("nl-NL")}u × (zwaarte<sub>jaar</sub> / Σzwaarte). De Σ over {aantalJaren} jaar = {Math.round(zwaarteSom * 100) / 100} (= som van fase-zwaartes per jaar uit FASE_ZWAARTE[<code className="font-mono">{dKey}</code>]; herhaalde fasen tellen meermaals mee, fallback 0.25 voor &ldquo;onbekend&rdquo;). De normalisatie zorgt dat Σbruto = {dTot.toLocaleString("nl-NL")}u (= dTot exact verdeeld). <strong className="not-italic">Werkelijk vs. bruto:</strong> verschil ontstaat door (1) J1-cap-correctie (zie F4 — alleen relevant als bruto J1 boven de J1-cap valt), (2) rol-aggregatie-rounding bij meerdere personen, en (3) de stille selecties uit F5 die in data_systemen extra uren brengen.
            </div>
            {Array.from(brutoUrenPerJaar.entries())
              .sort((a, b) => a[0] - b[0])
              .map(([jaar, brutoU]) => {
                const werkelijk = jaren.find((j) => j.jaar === jaar)?.totaalUren ?? 0;
                const z = brutoZwaartePerJaar.get(jaar) ?? 0;
                const f = fasePerJaar.get(jaar);
                const norm = normaliseerFase(f);
                const verschil = werkelijk - brutoU;
                const isPiekJaar = jaar === piekJaar;
                const aantalRollen = jaren.find((j) => j.jaar === jaar)?.rollen?.length ?? 0;
                return (
                  <div key={jaar} className="border-b border-gray-200 last:border-0 pb-1 last:pb-0">
                    <div className="flex items-baseline justify-between gap-2">
                      <span className="text-gray-700">
                        {jaar} ({FASE_LABEL[norm] !== "—" ? FASE_LABEL[norm] : (f ?? "—")}, zwaarte {Math.round(z * 100)}%)
                      </span>
                      <span className="text-gray-500 text-[10px]">
                        bruto {brutoU.toLocaleString("nl-NL")} u
                      </span>
                      <span className={`font-semibold ${isPiekJaar ? "text-purple-700" : "text-gray-900"}`}>
                        → werkelijk {werkelijk.toLocaleString("nl-NL")} u
                        {isPiekJaar && <span className="ml-1 text-[10px]">★piek</span>}
                      </span>
                    </div>
                    <div className="text-[9px] text-gray-500 font-sans leading-tight pl-2">
                      = {dTot}u × {(z * 100).toFixed(0)}% / {(zwaarteSom * 100).toFixed(0)}% = {brutoU}u bruto · werkelijk uit {aantalRollen} rollen · Δ {verschil >= 0 ? "+" : ""}{verschil}u
                    </div>
                  </div>
                );
              })}
            {/* Min20-staart annotatie voor data_systemen */}
            {aantalJaren >= 9 && dKey === "data_systemen" && (
              <p className="text-[10px] text-amber-800 font-sans italic mt-1.5 pt-1.5 border-t border-amber-200 leading-snug">
                <strong className="not-italic">Waarom ~50u/jr in J8–J10?</strong> De drie laatste jaren (Optimalisatie / Doorontwikkeling / Continu verbeteren) krijgen elk fallback-zwaarte 25% omdat hun fase-tekst niet 1-op-1 normaliseert. Som ({(0.25 * 3).toFixed(2)}) als deel van Σzwaarte ({zwaarteSom.toFixed(2)}) = {Math.round((0.75 / zwaarteSom) * 100)}% van {dTot}u ≈ {Math.round((0.75 / zwaarteSom) * dTot)}u over 3 jaar = ≈ {Math.round((0.75 / zwaarteSom) * dTot / 3)}u/jr per staart-jaar. Niet 30u (te lichte indexering, geen ruimte voor licentie-verlenging) en niet 80u (zou structureel beheer impliceren dat al in functieprofiel hoort) — 50u/jr is het smalle midden tussen functioneel beheer en programma-doorontwikkeling.
              </p>
            )}
          </div>
        </div>

        {/* F3.3 Top-3 rollen in piek-jaar */}
        {top3Rollen.length > 0 && (
          <div>
            <p className="text-[10px] uppercase tracking-wider font-bold text-gray-600 mb-1.5">
              F3.3 — Top-3 rollen in domein-piek-jaar {piekJaar} ({piekUren.toLocaleString("nl-NL")} u)
            </p>
            <p className="text-[11px] text-gray-600 italic mb-1.5 leading-snug">
              <strong className="not-italic">N.B.:</strong> dit is het piek-jaar van <em>dit domein</em> ({DOMAIN_LABEL[dKey] ?? dKey}, {dTot.toLocaleString("nl-NL")}u totaal) — niet noodzakelijk het piek-jaar van het scenario als geheel. Per domein valt de piek in een ander jaar afhankelijk van de fase-curve: data_systemen piekt in Acceptatie★ ({dKey === "data_systemen" ? piekJaar : "—"}), mens piekt in trainingsblok-jaar (vaak J3), processen piekt rond pilot/uitrol, cultuur is gelijkmatiger met lichte piek bij borging.
            </p>
            <div className="rounded bg-gray-50 border border-gray-200 p-2.5 font-mono text-[11px] space-y-1.5">
              {top3Rollen.map((r, i) => {
                const aandeel = piekUren > 0 ? Math.round(((r.uren ?? 0) / piekUren) * 100) : 0;
                const aandeelTotaal = dTot > 0 ? Math.round(((r.uren ?? 0) / dTot) * 100) : 0;
                const sel = r.functieId ? selectie?.[dKey as keyof NonNullable<typeof selectie>]?.[r.functieId] : undefined;
                const cat = bepaalCategorie(dKey, r.functieId ?? "", r.functieNaam, sel, lezMarker);
                return (
                  <div key={i} className="border-b border-gray-200 last:border-0 pb-1 last:pb-0">
                    <div className="flex items-baseline justify-between gap-2">
                      <span className="text-gray-700 truncate flex items-center gap-1.5 min-w-0">
                        <span className={`inline-block text-[9px] uppercase tracking-wider font-semibold px-1 py-0 rounded shrink-0 ${LEZING_C_CATEGORIE_KLEUR[cat]}`}>
                          {LEZING_C_CATEGORIE_LABEL[cat]}
                        </span>
                        <span className="truncate">{r.functieNaam ?? r.functieId ?? "Onbekend"}</span>
                      </span>
                      <span className="text-gray-900 font-semibold shrink-0">
                        {(r.uren ?? 0).toLocaleString("nl-NL")} u
                        <span className="text-[10px] text-gray-500 ml-1.5">({aandeel}%)</span>
                      </span>
                    </div>
                    <div className="text-[9px] text-gray-500 font-sans leading-tight pl-2 mt-0.5">
                      = {r.uren ?? 0}u / {piekUren}u piek = {aandeel}% · {aandeelTotaal}% van domein-totaal ({dTot}u over {aantalJaren}j)
                    </div>
                  </div>
                );
              })}
              {piekJaarBlok?.activiteit && (
                <p className="text-[10px] text-gray-500 font-sans italic mt-1.5 pt-1.5 border-t border-gray-200">
                  Activiteit dit jaar: {piekJaarBlok.activiteit}
                </p>
              )}
            </div>
          </div>
        )}

        {/* F3.4 Programma vs lijn-berekening */}
        <div>
          <p className="text-[10px] uppercase tracking-wider font-bold text-gray-600 mb-1.5">
            F3.4 — Programma vs. lijn (formule)
          </p>
          <div className="rounded bg-gray-50 border border-gray-200 p-2.5 font-mono text-[11px] space-y-1.5">
            <div>
              <div className="flex items-baseline justify-between">
                <span className="text-gray-700">{dKey} {dTot.toLocaleString("nl-NL")}u × {progPct}% prog</span>
                <span className="text-emerald-700 font-semibold">= {progU.toLocaleString("nl-NL")} u programma</span>
              </div>
              <div className="text-[9px] text-gray-500 font-sans leading-tight pl-2 mt-0.5">
                Bron: {typeof domein.programmaPct === "number"
                  ? `Stap 7 selectiePerDomein.${dKey}.programmaPct = ${(domein.programmaPct * 100).toFixed(0)}%`
                  : `fallback PROGRAMMA_PCT_DEFAULT[${dKey}] = ${Math.round((PROGRAMMA_PCT_DEFAULT[dKey] ?? 0.75) * 100)}%`}
              </div>
            </div>
            <div>
              <div className="flex items-baseline justify-between">
                <span className="text-gray-700">rest {lijnPct}%</span>
                <span className="text-amber-700 font-semibold">= {lijnU.toLocaleString("nl-NL")} u lijn</span>
              </div>
              <div className="text-[9px] text-gray-500 font-sans leading-tight pl-2 mt-0.5">
                = (1 − {progPct}%) × {dTot}u — werk dat past in bestaand functieprofiel + budget + jaarcyclus.
              </div>
            </div>
            <p className="text-[10px] text-gray-500 font-sans italic mt-1">
              {DOMAIN_LIJN_VOORBEELD[dKey] ?? "Lijn-aandeel volgt uit bestaande functieprofielen."}
            </p>
            {/* Min20 processen-staart: structureel proces-eigenaarschap valt zwaarder in lijn */}
            {aantalJaren >= 9 && dKey === "processen" && (
              <p className="text-[10px] text-amber-800 font-sans italic mt-1.5 pt-1.5 border-t border-amber-200 leading-snug">
                <strong className="not-italic">Min20-uitleg processen-staart:</strong> de standaard-split is {Math.round((PROGRAMMA_PCT_DEFAULT.processen) * 100)}% prog / {100 - Math.round((PROGRAMMA_PCT_DEFAULT.processen) * 100)}% lijn voor processen, omdat procesmanagement vanaf het jaar na de pilot grotendeels structureel werk wordt (Smartprocess-beheer + jaarlijkse evaluatiecyclus). Bij min20 (10j) is dat extra duidelijk: J6+ (2031+) zijn vrijwel volledig lijn — Procesmanager Data &amp; Klant heeft het werk in de standaard functieprofiel-cyclus opgenomen en de Procesondersteuners doen onderhouds-werk uit hun eigen team-budget. Het programma-aandeel ({progPct}%) wordt dus gedragen door de eerste 5 jaar; de staart van 5 jaar is overwegend lijn.
              </p>
            )}
          </div>
        </div>

        {domein.motivatie && (
          <p className="text-[11px] text-gray-600 italic leading-snug">
            <strong className="not-italic text-gray-700">Motivatie:</strong> {domein.motivatie}
          </p>
        )}
      </div>
    </details>
  );
}

// ============================================================================
// F4 — 2026 J1-cap-toepassing
// ============================================================================

function UrenF4J1Cap({
  scenarioKey,
  interneUrenScen,
  startJaar,
}: {
  scenarioKey: ScenarioKey;
  interneUrenScen: UrenFScenario;
  startJaar: number;
}) {
  const totalenPerJaar = interneUrenScen.totalenPerJaar ?? [];
  const j1 = totalenPerJaar.find((t) => t.jaar === startJaar);
  if (!j1) {
    return (
      <p className="text-xs text-gray-500 italic">
        Geen J1-jaar ({startJaar}) gevonden in scenario-totalen.
      </p>
    );
  }
  const j1Cap = scenarioKey === "advies" || scenarioKey === "plus20" ? 290 : 250;
  const aantalJaren = interneUrenScen.aantalJaren ?? 0;
  const totaalUren = interneUrenScen.totaalUren ?? 0;

  // Bruto fase-zwaarte zou — bij gelijkmatige verdeling — geven: totaal/aantalJaren
  // Echter J1 is een half-jaar dus de werkelijke bruto-claim per fase ligt
  // hoger dan die van de andere jaren. We tonen het verschil.
  const gemiddeld = aantalJaren > 0 ? Math.round(totaalUren / aantalJaren) : 0;
  const overschot = Math.max(0, gemiddeld - j1Cap);
  const j2plusJaren = Math.max(1, aantalJaren - 1);
  const overschotPerJaar = Math.round(overschot / j2plusJaren);
  const werkelijkJ1 = j1.uren ?? 0;
  const cappedOk = werkelijkJ1 <= j1Cap * 1.05;

  // Per-domein-uitsplitsing van werkelijke J1-uren
  const j1PerDomein = (interneUrenScen.domeinen ?? []).map((d) => {
    const jr = d.jaren?.find((x) => x.jaar === startJaar);
    return { domein: d.domein, uren: jr?.totaalUren ?? 0 };
  });

  return (
    <div className="rounded-lg border border-gray-200 bg-white p-4 space-y-3">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
        <Stat
          label={`${startJaar} bruto (gemiddeld)`}
          value={`${gemiddeld.toLocaleString("nl-NL")} u`}
          sub={`= ${totaalUren.toLocaleString("nl-NL")} u / ${aantalJaren} jaar (gelijkmatig, zonder fase-curve, zonder J1-cap)`}
          mono
        />
        <Stat
          label="J1-cap (half-jaar)"
          value={`${j1Cap} u`}
          sub={`${scenarioKey === "advies" || scenarioKey === "plus20" ? "advies/plus20: 290u (korte scenario's, hogere jaarbelasting toelaatbaar)" : "optimaal/min20: 250u (lange scenario's, lager jaargemiddelde)"}`}
          mono
          highlight
        />
        <Stat
          label={`${startJaar} werkelijk`}
          value={`${werkelijkJ1.toLocaleString("nl-NL")} u`}
          sub={cappedOk ? "binnen cap" : "boven cap — fase-curve domineert"}
          mono
        />
      </div>

      {/* J1 per-domein-uitsplitsing — voorheen alleen in tooltip. */}
      {j1PerDomein.length > 0 && (
        <div className="rounded bg-gray-50/70 border border-gray-200 p-2 text-[10px] text-gray-600 leading-snug font-sans">
          <p className="font-semibold text-gray-700 mb-0.5">J1 ({startJaar}) per domein</p>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-x-3 gap-y-0.5 font-mono">
            {j1PerDomein.map((p) => (
              <div key={p.domein} className="flex items-baseline justify-between">
                <span className="text-gray-600">{DOMAIN_LABEL[p.domein] ?? p.domein}</span>
                <span className="text-gray-800">{p.uren.toLocaleString("nl-NL")}u</span>
              </div>
            ))}
          </div>
          <p className="mt-1 font-mono">Σ = {werkelijkJ1.toLocaleString("nl-NL")}u ({cappedOk ? "binnen" : "boven"} cap {j1Cap}u)</p>
        </div>
      )}

      <div className="rounded bg-gray-50 border border-gray-200 p-3 font-mono text-[11px] space-y-1.5">
        <p className="text-[10px] uppercase tracking-wider font-bold text-gray-700 font-sans mb-1">
          Cap-toepassing — formule
        </p>
        <div>
          <div className="flex items-baseline justify-between">
            <span>Bruto bij gelijkmatige verdeling ({totaalUren.toLocaleString("nl-NL")}u / {aantalJaren}jr)</span>
            <span>{gemiddeld.toLocaleString("nl-NL")} u</span>
          </div>
          <div className="text-[9px] text-gray-500 font-sans leading-tight pl-2 mt-0.5">
            = scenario-totaal / aantal jaar — geen fase-curve, geen J1-cap.
          </div>
        </div>
        <div>
          <div className="flex items-baseline justify-between">
            <span>− J1-cap ({j1Cap}u, want {startJaar} = half-jaar)</span>
            <span>{j1Cap.toLocaleString("nl-NL")} u</span>
          </div>
          <div className="text-[9px] text-gray-500 font-sans leading-tight pl-2 mt-0.5">
            Cap = (gemiddeld jaar) × ½ × seizoens-correctie ≈ {Math.round(gemiddeld * 0.5)}u → {j1Cap}u (juni–dec ≠ exacte 50% door zomerstop + opstart-tempo).
          </div>
        </div>
        <div className="border-t border-gray-300 pt-1 mt-1">
          <div className="flex items-baseline justify-between text-gray-800 font-semibold">
            <span>Overschot herverdeeld over J2..Jn ({j2plusJaren} jaar)</span>
            <span>≈ {overschotPerJaar.toLocaleString("nl-NL")} u/jr extra</span>
          </div>
          <div className="text-[9px] text-gray-500 font-sans leading-tight pl-2 mt-0.5 font-normal">
            = {overschot}u / {j2plusJaren}j — theoretisch; werkelijk herverdeelt fase-zwaarte het proportioneel (Acceptatie krijgt het meeste).
          </div>
        </div>
        {/* J1 actuele situatie: cap actief of slapend? */}
        <div className="border-t border-gray-300 pt-1 mt-1 flex items-baseline justify-between text-[10px] font-sans">
          <span className="text-gray-600">Werkelijk J1 ({startJaar})</span>
          <span className={`font-mono font-semibold ${cappedOk ? "text-emerald-700" : "text-red-700"}`}>
            {werkelijkJ1.toLocaleString("nl-NL")} u {cappedOk ? "✓ binnen cap" : "⚠ boven cap"}
          </span>
        </div>
      </div>
      <p className="text-[11px] text-gray-600 italic leading-snug">
        <strong className="not-italic">Hoe werkt de cap in dit scenario?</strong> Omdat het programma in juni {startJaar} start, krijgt J1 maar een half kalenderjaar.
        De gelijkmatige-bruto van {gemiddeld.toLocaleString("nl-NL")}u {gemiddeld > j1Cap ? `ligt boven de ${j1Cap}u-cap; in theorie zou ${overschot}u overschot doorgeschoven worden` : `ligt al onder de ${j1Cap}u-cap, dus de cap is hier slapend`}.
        {" "}<strong className="not-italic">Maar:</strong> de werkelijke J1-uren ({werkelijkJ1.toLocaleString("nl-NL")}u) komen niet uit de gelijkmatige-formule maar uit de <em>fase-curve</em> (F3): J1 is een Analyse-jaar (15% fase-zwaarte voor data_systemen, 20% voor mens/cultuur/processen) en die zwaarte op zich houdt J1 al laag.
        {scenarioKey === "optimaal" && " Voor optimaal (7j) levert de fase-curve in J1 ongeveer 260u op — vlak onder de 250u-cap (5%-tolerantie aanvaard); de cap fungeert dus als veiligheidsplafond."}
        {scenarioKey === "min20" && " Voor min20 (10j) levert de fase-curve in J1 ongeveer 264u op — ook vlak boven de 250u-cap (5%-tolerantie). De staart van 50u/jr in J8–J10 verlaagt het jaargemiddelde, waardoor de cap rust kan houden."}
        {scenarioKey === "advies" && " Voor advies (4j) ligt het jaargemiddelde hoog (~1.440u); de cap moet hier actief het J1-bedrag terugbrengen."}
        {scenarioKey === "plus20" && " Voor plus20 (5j) ligt het jaargemiddelde rond 1.170u; de cap moet hier actief het J1-bedrag terugbrengen."}
        {" "}Het overschot wordt niet ineens naar één jaar gepompt, maar verdeelt zich proportioneel naar zwaarste fasen — meestal Acceptatie (J3–J4 voor advies/plus20, J3 voor optimaal, J5 voor min20).
      </p>
    </div>
  );
}

// ============================================================================
// F5 — Categorieën & open beslispunten (Lezing C)
// Toont per categorie:
//  - Inspanningsleiders per inspanning (incl. eventuele TBD-placeholders)
//  - Trainings-deelnemers (mens-cursisten)
//  - Geconsulteerden per domein
//  - Open beslispunten (cat-3, reviewVereist: true)
// ============================================================================

function UrenF5CategorieenBeslispunten({
  session,
  interneUren,
  stap4,
}: {
  session: DINSession;
  interneUren: UrenFAdvies | null;
  stap4?: {
    subEffortAnalysis?: Array<{
      groepId?: string;
      domein?: string;
      titel?: string;
      voorgesteldeNaam?: string | null;
      dossier?: { eigenaar?: string; inspanningsleider?: string };
    }>;
  };
}) {
  const stakeholders = collectStakeholderRollen(session);
  const reviews = collectReviewRollen(session);
  const lez = interneUren?.interneUrenLezing;

  // ── 1. Inspanningsleiders per inspanning (uit dossier.inspanningsleider) ──
  type LeiderRow = {
    domein: string;
    inspanning: string;
    leider: string;
    tbd: boolean;
  };
  const leidersUitData: LeiderRow[] = (stap4?.subEffortAnalysis ?? [])
    .filter((s) => s && s.dossier && s.domein)
    .map((s) => {
      const naam = (s.dossier?.inspanningsleider ?? "").trim();
      const isTbd =
        !naam ||
        /\b(nader te bepalen|tbd|onbekend|nog te benoemen)\b/i.test(naam) ||
        /\(.*nader te.*\)/i.test(naam);
      const inspanning = s.titel || s.voorgesteldeNaam || s.groepId || "Inspanning";
      return {
        domein: s.domein ?? "—",
        inspanning,
        leider: naam || "Inspanningsleider — naam nog te benoemen",
        tbd: isTbd,
      };
    });

  // Aanvullen vanuit interneUrenLezing.inspanningsleiders als data ontbreekt voor een domein
  const dom4: Domein4[] = ["cultuur", "mens", "data_systemen", "processen"];
  const leiderRows: LeiderRow[] = [...leidersUitData];
  for (const d of dom4) {
    if (leiderRows.some((r) => r.domein === d)) continue;
    const info = lez?.inspanningsleiders?.[d];
    if (info?.naam) {
      leiderRows.push({
        domein: d,
        inspanning: `Inspanning ${DOMAIN_LABEL[d] ?? d}`,
        leider: info.naam,
        tbd: !!info.tbd,
      });
    }
  }

  // ── 2. Trainings-deelnemers (alleen mens — 47 cursisten) ──
  const cursistN =
    LEZING_C_AANTAL_DEELNEMERS_DEFAULT.mens ?? 47;
  const cursistTot =
    lez?.urenNiveaus?.trainings_deelnemer?.totaal ??
    LEZING_C_DEFAULTS.trainings_deelnemer.totaal ??
    46;

  // ── 3. Geconsulteerden per domein (uit stakeholders + lichte review-input) ──
  // Hergebruik collectStakeholderRollen() — alle rollen met stakeholder: true.
  // Voor de UI-render filteren we per domein uit `stakeholders`.

  return (
    <div className="space-y-4">
      {/* Toelichting */}
      <div className="rounded bg-gray-50 border border-gray-200 p-3 text-xs text-gray-700 leading-relaxed">
        <p className="font-semibold text-gray-800 mb-1">Vier Lezing-C-categorieën in dit blok</p>
        <ul className="list-disc pl-5 space-y-0.5">
          <li><strong className="text-[#003366]">Inspanningsleiders</strong> — per inspanning één leider; TBD-pill als naam ontbreekt.</li>
          <li><strong className="text-emerald-800">Trainings-deelnemers</strong> — alleen mens-cursisten (47p × 46u contacttijd).</li>
          <li><strong className="text-purple-800">Geconsulteerden</strong> — leveren input/review, krijgen 6u/looptijd. Komt uit selectiePerDomein-flag <code className="font-mono text-[10px] bg-gray-100 px-1 rounded">stakeholder: true</code>.</li>
          <li><strong className="text-amber-800">Open beslispunten</strong> — handmatige review nodig (cat-3, <code className="font-mono text-[10px] bg-gray-100 px-1 rounded">reviewVereist: true</code>).</li>
        </ul>
      </div>

      {/* ── Inspanningsleiders ── */}
      <div className="rounded-lg border-2 border-[#003366]/30 bg-[#003366]/[0.04] overflow-hidden">
        <div className="bg-[#003366] px-3 py-2 flex items-center justify-between gap-2">
          <span className="text-[11px] uppercase tracking-wider font-bold text-white">
            Inspanningsleiders ({leiderRows.length})
          </span>
          <span className="text-[10px] text-white/80 font-mono">
            cat. leider — 1 persoon per inspanning
          </span>
        </div>
        <div className="p-3 space-y-2">
          {leiderRows.length === 0 && (
            <p className="text-[11px] text-gray-500 italic">
              Geen inspanningsleiders gevonden in <code className="font-mono text-[10px] bg-gray-100 px-1 rounded">subEffortAnalysis[].dossier.inspanningsleider</code>.
            </p>
          )}
          {leiderRows.map((r, i) => {
            const hex = DOMAIN_BAR_HEX[r.domein] ?? "#6b7280";
            return (
              <div
                key={`leid-${i}`}
                className="flex items-baseline justify-between gap-2 rounded border border-[#003366]/15 bg-white px-3 py-2"
              >
                <div className="flex items-center gap-2 min-w-0">
                  <span className="inline-block w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: hex }} />
                  <span className="text-[10px] uppercase tracking-wider font-semibold text-gray-500 shrink-0">
                    {DOMAIN_LABEL[r.domein] ?? r.domein}
                  </span>
                  <span className="text-xs text-gray-700 truncate">{r.inspanning}</span>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <span className="text-sm font-semibold text-gray-900">{r.leider}</span>
                  {r.tbd && (
                    <span className="text-[10px] uppercase tracking-wider font-bold text-amber-800 bg-amber-100 border border-amber-300 px-1.5 py-0.5 rounded">
                      TBD
                    </span>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* ── Trainings-deelnemers ── */}
      <div className="rounded-lg border-2 border-emerald-200 bg-emerald-50/30 overflow-hidden">
        <div className="bg-emerald-100 px-3 py-2 border-b border-emerald-200 flex items-center justify-between gap-2">
          <span className="text-[11px] uppercase tracking-wider font-bold text-emerald-800">
            Trainings-deelnemers — mens-cursisten ({cursistN})
          </span>
          <span className="text-[10px] text-emerald-700 font-mono">
            cat. trainings-deelnemer
          </span>
        </div>
        <div className="p-3 space-y-2 text-xs text-gray-700 leading-relaxed">
          <p>
            <strong className="text-emerald-900">{cursistN} cursisten</strong> ×&nbsp;
            <strong className="text-emerald-900">{cursistTot}u contacttijd</strong> over 2 trainings-blokken
            (Basis + Vaardigheid) ={" "}
            <strong className="text-emerald-900 font-mono">
              {(cursistN * cursistTot).toLocaleString("nl-NL")}u
            </strong>{" "}
            cursist-uren in mens-domein.
          </p>
          <p className="text-[11px] text-gray-600 italic leading-snug">
            Alle frontline-medewerkers (klantenservice, accountmanagers, mdw binnendienst) volgen het programma als eindgebruiker. Geen kernteam-rol; pure contacttijd. Zie F6 voor de impact op het mens-domein-totaal.
          </p>
        </div>
      </div>

      {/* ── Geconsulteerden per domein ── */}
      <div className="rounded-lg border-2 border-purple-200 bg-purple-50/30 overflow-hidden">
        <div className="bg-purple-100 px-3 py-2 border-b border-purple-200 flex items-center justify-between gap-2">
          <span className="text-[11px] uppercase tracking-wider font-bold text-purple-800">
            Geconsulteerden ({stakeholders.length}) — review/input, 6u/looptijd (3u Realisatie + 3u Acceptatie)
          </span>
          <span className="text-[10px] text-purple-700 font-mono">
            cat. geconsulteerd · {stakeholders.reduce((s, r) => s + r.aantal, 0)} personen
          </span>
        </div>
        <div className="p-3 space-y-3">
          {stakeholders.length === 0 && (
            <p className="text-[11px] text-gray-500 italic">
              Geen rollen met <code className="font-mono text-[10px] bg-gray-100 px-1 rounded">stakeholder: true</code> in selectiePerDomein.
              Defaults Lezing-C zijn ~25–30 geconsulteerden voor mens en data_systemen.
            </p>
          )}
          {dom4.map((dom) => {
            const inDom = stakeholders.filter((r) => r.domein === dom);
            if (inDom.length === 0) return null;
            return (
              <DomeinRolGroep key={`gec-${dom}`} domein={dom} accent="purple" rollen={inDom} type="stakeholder" />
            );
          })}
        </div>
      </div>

      {/* ── Open beslispunten ── */}
      {reviews.length > 0 && (
        <div className="rounded-lg border-2 border-amber-300 bg-amber-50/30 overflow-hidden">
          <div className="bg-amber-100 px-3 py-2 border-b border-amber-300 flex items-center justify-between gap-2">
            <span className="text-[11px] uppercase tracking-wider font-bold text-amber-800">
              Open beslispunten ({reviews.length}) — handmatige review nodig
            </span>
            <span className="text-[10px] text-amber-700 font-mono">
              {reviews.reduce((s, r) => s + r.aantal, 0)} personen · reviewVereist: true
            </span>
          </div>
          <div className="p-3 space-y-3">
            {dom4.map((dom) => {
              const inDom = reviews.filter((r) => r.domein === dom);
              if (inDom.length === 0) return null;
              return <DomeinRolGroep key={`rv-${dom}`} domein={dom} accent="amber" rollen={inDom} type="review" />;
            })}
          </div>
        </div>
      )}
    </div>
  );
}

// ============================================================================
// F6 — Mens-domein context: waarom mens-totaal hoog lijkt
// Aparte info-box met de trainings-footnote: 47 cursisten × 46u contacttijd
// over 2 trainings-blokken (Basis + Vaardigheid) = ~2.162u. Aftrekken cursisten:
// ~990u programma-organisatie-werk, in lijn met cultuur/data_systemen/processen.
// ============================================================================

function UrenF6MensContext({
  interneUrenScen,
  interneUren,
}: {
  interneUrenScen: UrenFScenario;
  interneUren: UrenFAdvies | null;
}) {
  const lez = interneUren?.interneUrenLezing;
  const cursistN = LEZING_C_AANTAL_DEELNEMERS_DEFAULT.mens ?? 47;
  const cursistTot =
    lez?.urenNiveaus?.trainings_deelnemer?.totaal ??
    LEZING_C_DEFAULTS.trainings_deelnemer.totaal ??
    46;
  const cursistUren = cursistN * cursistTot;

  // Werkelijke domein-totalen
  const domeinen = interneUrenScen.domeinen ?? [];
  const mens = domeinen.find((d) => d.domein === "mens");
  const data_sys = domeinen.find((d) => d.domein === "data_systemen");
  const cultuur = domeinen.find((d) => d.domein === "cultuur");
  const processen = domeinen.find((d) => d.domein === "processen");
  const mensTot = mens?.totaalUren ?? 0;
  const mensZonderCursisten = Math.max(0, mensTot - cursistUren);
  const cursistAandeel = mensTot > 0 ? Math.round((cursistUren / mensTot) * 100) : 0;

  return (
    <div className="rounded-lg border-l-4 border-[#003366] bg-[#003366]/[0.04] p-4 space-y-3">
      <p className="text-[11px] uppercase tracking-wider font-bold text-[#003366]">
        Waarom mens-totaal hoog lijkt
      </p>
      <p className="text-sm text-gray-800 leading-relaxed">
        Mens is met{" "}
        <strong className="text-[#003366] font-mono">~{mensTot.toLocaleString("nl-NL")}u</strong>{" "}
        het zwaarste domein, maar{" "}
        <strong className="text-[#003366]">~{cursistAandeel}% (~{cursistUren.toLocaleString("nl-NL")}u)</strong>{" "}
        bestaat uit cursist-contacttijd:{" "}
        <strong>{cursistN} medewerkers</strong> volgen elk{" "}
        <strong>{cursistTot}u</strong> outside-in-gespreksvaardigheidstraining over{" "}
        <strong>2 blokken</strong> (Basis + Vaardigheid).
      </p>
      <p className="text-[11px] text-gray-600 font-mono leading-snug bg-white/60 border border-[#003366]/10 rounded px-2 py-1">
        Formule: {cursistN}p × {cursistTot}u = {cursistUren.toLocaleString("nl-NL")}u / {mensTot.toLocaleString("nl-NL")}u mens-totaal × 100% = {cursistAandeel}%.
      </p>
      <div className="rounded bg-white border border-[#003366]/20 p-3 space-y-2 text-xs">
        <p className="text-[10px] uppercase tracking-wider font-bold text-gray-700 mb-1">
          Aftrekken cursisten — programma-organisatie-werk per domein
        </p>
        <table className="w-full font-mono">
          <tbody>
            <tr className="border-b border-gray-100">
              <td className="py-1 pr-2 text-gray-700">Mens-totaal</td>
              <td className="py-1 px-2 text-right text-gray-900">{mensTot.toLocaleString("nl-NL")}u</td>
              <td className="py-1 pl-2 text-right text-gray-500 text-[10px]">incl. cursisten</td>
            </tr>
            <tr className="border-b border-gray-100">
              <td className="py-1 pr-2 text-emerald-700">Mens − cursisten</td>
              <td className="py-1 px-2 text-right text-emerald-700 font-bold">
                {mensZonderCursisten.toLocaleString("nl-NL")}u
              </td>
              <td className="py-1 pl-2 text-right text-gray-500 text-[10px]">kernteam + leider + geconsulteerd</td>
            </tr>
            <tr className="border-b border-gray-100">
              <td className="py-1 pr-2 text-gray-700">Cultuur</td>
              <td className="py-1 px-2 text-right text-gray-900">{(cultuur?.totaalUren ?? 0).toLocaleString("nl-NL")}u</td>
              <td className="py-1 pl-2 text-right text-gray-400 text-[10px]">vergelijking</td>
            </tr>
            <tr className="border-b border-gray-100">
              <td className="py-1 pr-2 text-gray-700">Data &amp; Systemen</td>
              <td className="py-1 px-2 text-right text-gray-900">{(data_sys?.totaalUren ?? 0).toLocaleString("nl-NL")}u</td>
              <td className="py-1 pl-2 text-right text-gray-400 text-[10px]">vergelijking</td>
            </tr>
            <tr>
              <td className="py-1 pr-2 text-gray-700">Processen</td>
              <td className="py-1 px-2 text-right text-gray-900">{(processen?.totaalUren ?? 0).toLocaleString("nl-NL")}u</td>
              <td className="py-1 pl-2 text-right text-gray-400 text-[10px]">vergelijking</td>
            </tr>
          </tbody>
        </table>
        <p className="text-[11px] text-gray-600 italic leading-snug pt-1.5 border-t border-gray-100">
          De ~{mensZonderCursisten.toLocaleString("nl-NL")}u programma-organisatie-werk in mens is in lijn met de andere domeinen — het schijnbaar hoge totaal komt door de cursist-cohort, niet door extra programma-belasting op trekkers.
        </p>
      </div>
      {/* Interpretatie B — driedeling toelichting */}
      <div className="rounded bg-purple-50 border border-purple-200 p-3 text-[11px] text-purple-900 leading-relaxed">
        <p className="font-semibold text-purple-900 mb-1">
          Interpretatie B — driedeling van uren-types
        </p>
        <p>
          <strong>Trainings-deelnemers</strong> tellen <strong>50% programma + 50% lijn</strong>:
          van de {cursistTot}u/persoon zit ~16u standaard L&amp;D-baseline in de
          functieprofielen, de rest is nieuw curriculum.{" "}
          <strong>Geconsulteerden</strong> tellen <strong>volledig als raadplegen-uren</strong>{" "}
          — incidentele review/consultatie, valt buiten programma- en lijn-toewijzing.
        </p>
      </div>
    </div>
  );
}

// ============================================================================
// DomeinRolGroep — gedeelde helper voor F5 (geconsulteerden + open beslispunten)
// ============================================================================

function DomeinRolGroep({
  domein,
  accent,
  rollen,
  type,
}: {
  domein: Domein4;
  accent: "purple" | "amber";
  rollen: Array<StakeholderRol | ReviewRol>;
  type: "stakeholder" | "review";
}) {
  const hex = DOMAIN_BAR_HEX[domein] ?? "#6b7280";
  const labelClasses =
    accent === "purple"
      ? "text-[10px] font-semibold uppercase tracking-wider text-purple-700 bg-purple-100 border border-purple-200 px-1.5 py-0.5 rounded"
      : "text-[10px] font-semibold uppercase tracking-wider text-amber-800 bg-amber-100 border border-amber-300 px-1.5 py-0.5 rounded";
  const labelText = type === "stakeholder" ? "Stakeholder" : "Review nodig";

  return (
    <div>
      <div className="flex items-center gap-2 mb-1.5">
        <span className="inline-block w-2 h-2 rounded-full" style={{ backgroundColor: hex }} />
        <p className="text-[10px] uppercase tracking-wider font-bold text-gray-700">
          {DOMAIN_LABEL[domein] ?? domein}
        </p>
      </div>
      <table className="w-full text-xs">
        <thead>
          <tr className="text-left border-b border-gray-200">
            <th className="py-1 font-semibold text-gray-500">Rol</th>
            <th className="py-1 font-semibold text-gray-500 text-right w-20">Aantal</th>
            <th className="py-1 font-semibold text-gray-500 text-right w-24">Label</th>
            <th className="py-1 font-semibold text-gray-500 text-right w-16">Uren</th>
          </tr>
        </thead>
        <tbody>
          {rollen.map((r, i) => {
            const toel =
              type === "stakeholder"
                ? (r as StakeholderRol).toelichting
                : (r as ReviewRol).vraag;
            return (
              <tr key={`${r.functieId}-${i}`} className="border-b border-gray-50 last:border-b-0 align-top">
                <td className="py-1.5 pr-2">
                  <span className="text-gray-800 font-medium">{r.naam}</span>
                  {r.afdeling && <span className="text-[10px] text-gray-500 ml-1">({r.afdeling})</span>}
                  {toel && (
                    <p
                      className={`text-[10px] mt-0.5 leading-snug italic ${
                        type === "stakeholder" ? "text-purple-900" : "text-amber-900"
                      }`}
                    >
                      {type === "review" && (
                        <span className="not-italic font-semibold mr-1">Vraag:</span>
                      )}
                      {toel}
                    </p>
                  )}
                </td>
                <td className="py-1.5 px-1 text-right tabular-nums text-gray-700">{r.aantal}</td>
                <td className="py-1.5 px-1 text-right">
                  <span className={labelClasses}>{labelText}</span>
                </td>
                <td className="py-1.5 pl-1 text-right text-gray-400 tabular-nums">—</td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

function KengetalKaart({
  label,
  waarde,
  sub,
  accent,
  mono,
  title,
}: {
  label: string;
  waarde: number;
  sub: string;
  accent: string;
  mono?: boolean;
  title?: string;
}) {
  return (
    <div
      className={`rounded-lg border border-gray-200 bg-white overflow-hidden ${title ? "cursor-help" : ""}`}
      title={title}
    >
      <div className={`${accent} text-white text-[10px] uppercase tracking-wider font-bold px-3 py-1.5`}>
        {label}
      </div>
      <div className="px-3 py-3">
        <p className={`text-2xl font-bold text-gray-900 ${mono ? "font-mono" : ""} tabular-nums`}>
          {waarde.toLocaleString("nl-NL")}
          <span className="text-sm font-normal text-gray-500 ml-1">u</span>
        </p>
        <p className="text-[11px] text-gray-600 mt-1 leading-snug">{sub}</p>
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
  title,
}: {
  label: string;
  value: string;
  sub?: string;
  mono?: boolean;
  highlight?: boolean;
  title?: string;
}) {
  return (
    <div
      className={`rounded-lg border p-3 ${
        highlight ? "border-amber-300 bg-amber-50" : "border-gray-200 bg-white"
      } ${title ? "cursor-help" : ""}`}
      title={title}
    >
      <p className="text-[10px] uppercase tracking-wider text-gray-500 font-semibold">{label}</p>
      <p className={`text-base font-bold text-gray-900 mt-0.5 ${mono ? "font-mono" : ""}`}>{value}</p>
      {sub && <p className="text-[11px] text-gray-500 mt-0.5">{sub}</p>}
    </div>
  );
}
