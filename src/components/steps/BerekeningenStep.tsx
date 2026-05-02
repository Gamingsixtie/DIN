"use client";

import { useState, useMemo } from "react";
import { useSession } from "@/lib/session-context";
import type { DINSession, BegrotingAdvies, Stap4Result, BegrotingScenario, InspanningBegroting } from "@/lib/types";
import { parseDossierRaming, type ParsedDossierRaming } from "@/lib/dossier-parser";
import { splitMotivatie, segmentText, parseBreakdown, type EuroMatch, type ParsedBreakdown, type BreakdownSection } from "@/lib/motivatie-parser";

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
      <h2 className="text-2xl font-bold mb-2">Hoe komen we aan de bedragen in §4.1?</h2>
      <p className="text-sm text-blue-100 leading-relaxed max-w-3xl">
        Deze pagina is een <strong>afspiegeling van het begrotingadvies in Stap 6</strong>. Voor elk
        scenario zie je hoe het jaarbudget-plafond is bepaald, hoe het scenario-totaal is opgebouwd,
        hoe het bedrag per inspanning ontstaat (vanuit de kostenraming uit het dossier en de motivatie),
        hoe het over de jaren is verdeeld en welke automatische aanpassingen zijn toegepast om
        binnen de jaargrenzen te passen.
      </p>
      {begroting && (
        <p className="text-xs text-blue-200/80 mt-3">
          Startjaar: <strong className="text-white">{begroting.startJaar}</strong> ·
          Cito-norm jaarbudget (basis): <strong className="text-white">{formatEur(begroting.jaarlijksBudgetBasis)}</strong> ·
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
    { term: "Jaarbudget-plafond (cap)", uitleg: "Het maximale bedrag dat per jaar uitgegeven mag worden voor het programma." },
    { term: "Eenmalig", uitleg: "Kosten die je één keer maakt: implementatie, opzet, opleiding, eerste licenties." },
    { term: "Structureel", uitleg: "Terugkerende jaarlijkse last: licenties, beheer, doorontwikkeling, borging." },
    { term: "Bottom-up", uitleg: "Berekening van onderaf: tel alle componenten op om het totaal te vinden." },
    { term: "Min / Mid / Max", uitleg: "Bandbreedte van een raming. Min = gunstige aannames, Mid = middenwaarde (gehanteerd), Max = ongunstige aannames." },
    { term: "Lifecycle-curve", uitleg: "Hoe de uitgaven zich over de jaren verdelen. IT: piek in realisatie. Training: piek in vaardigheidstraining. Cultuur: lange staart voor verankering." },
    { term: "Scenario", uitleg: "Een keuze in tempo: hetzelfde programma over 4, 5, 7 of 10 jaar — andere doorlooptijd, andere piek per jaar, andere cumulatieve last." },
    { term: "Drift", uitleg: "Verschil tussen wat je 'bottom-up' uit het dossier zou verwachten en het werkelijke scenario-bedrag. Vaak verklaarbaar door interne-uren-aftrek of motivatie-aanvullingen." },
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
            Ondergrens: minimum aantal uren / kleinste schaling / scherpste schaalvoordelen volledig benut.
          </p>
        </div>
        <div className="rounded bg-white border-2 border-[#003366] px-3 py-2">
          <p>
            <span className="font-mono font-semibold text-[#003366]">Mid</span>{" "}
            <span className="text-gray-700">— middenwaarde (gehanteerd)</span>
          </p>
          <p className="text-[11px] text-gray-600 mt-1">
            <strong>Dit bedrag wordt gebruikt in alle scenario&apos;s</strong> en in §4.1 begroting.
            De centrale schatting waarop de stuurgroep akkoord geeft.
          </p>
        </div>
        <div className="rounded bg-white border border-amber-200 px-3 py-2">
          <p>
            <span className="font-mono font-semibold text-rose-700">Max</span>{" "}
            <span className="text-gray-700">— ongunstige aannames</span>
          </p>
          <p className="text-[11px] text-gray-600 mt-1">
            Bovengrens: ruimere uren / grotere schaling. Delta Max−Mid is wat de risico-buffer dekt.
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
                {s?.aantalJaren ?? 0} jaar · max/jr {formatEurMln(s?.jaarlijksBudgetEuro ?? 0)}
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
    capFormule = `Het kortste scenario binnen 3 tot 5 jaar dat past met jaarbudget ≤ Cito-norm × 1,40 (${formatEur(jaarlijksBudgetBasis * 1.4)}). Berekend: ${formatEur(cap)}/jr × ${aantalJaren} jaar.`;
  }

  return (
    <div>
      <SectieKop nummer="A" titel="Scenario-input — hoe zijn de parameters bepaald?" />
      <div className="rounded-lg border border-gray-200 bg-gray-50/50 p-4 space-y-4">
        <p className="text-sm text-gray-700 leading-relaxed">
          <strong>{meta.label}.</strong> {meta.uitleg}
        </p>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Stat label="Jaarbudget-plafond (cap)" value={formatEur(cap)} sub="per jaar" mono />
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
                <>Berekend als minimum aantal jaren waarop alle dossier-totalen (eenmalig + structureel × jaren) passen binnen het jaarlijkse plafond. Hoe groter de dossier-mids en/of hoe kleiner de cap, des te meer jaren nodig. Resultaat: <strong>{aantalJaren} jaar</strong>.</>
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
          <strong className="text-blue-900">Belangrijk om te weten:</strong> het jaarbudget-plafond
          ({formatEur(cap)}/jr) is geen toezegging dat dit bedrag elk jaar beschikbaar is. Het is een{" "}
          <strong>maximum</strong>: je kunt niet méér dan dit per jaar uitgeven, en je krijgt alleen
          wat in deze raming staat. Het scenario is zo opgesteld dat de jaartotalen niet boven dit
          plafond uitkomen (zie Sectie D).
        </div>
      </div>
    </div>
  );
}

// ============================================================================
// Sectie B — Bottom-up scenario-totaal
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
        titel="Bottom-up: scenario-totaal opbouw"
        hint="Tel alle inspanningen op, gesorteerd op prioriteit (rank). Moet exact het scenario-totaal zijn."
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
          <span className="font-semibold text-gray-700">Σ alle inspanningen</span>
          <span className="font-bold text-[#003366]">{formatEur(sumInspanningen)}</span>
        </div>
        <div className="flex items-center justify-between text-xs text-gray-500">
          <span>Scenario-totaal (zoals opgeslagen)</span>
          <span className="font-mono">{formatEur(totaalScenario)}</span>
        </div>
        {!matchOk && (
          <div className="rounded bg-red-50 border border-red-200 p-2 text-xs text-red-800">
            ⚠ Verschil van {formatEur(Math.abs(sumInspanningen - totaalScenario))} — buiten tolerantie ({formatEur(tol)}).
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
        hint="Voor elke inspanning de complete keten: kostenraming uit dossier → motivatie met componenten → bottom-up berekening → werkelijk in scenario → verdeling per jaar."
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
  const structureleJaren = Math.max(0, aantalJaren - 1);
  const parsed: ParsedDossierRaming = useMemo(
    () => parseDossierRaming(kostenramingTekst),
    [kostenramingTekst]
  );

  const doelTotaalMid = parsed.eenmaligMid + parsed.structureelMidPerJr * structureleJaren;
  const minTotaal = parsed.eenmaligLow + parsed.structureelLowPerJr * structureleJaren;
  const drift = (insp.totaalEuro ?? 0) - doelTotaalMid;
  const driftPct = doelTotaalMid > 0 ? (drift / doelTotaalMid) * 100 : 0;

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
        {/* C1: Dossier-bron */}
        {!isOverig && (
          <SubSectie nummer="C1" titel="Uit het dossier — wat zegt de kostenraming?">
            {kostenramingTekst ? (
              <>
                <div className="rounded bg-gray-50 border border-gray-200 p-3 text-sm leading-relaxed text-gray-700">
                  <TekstMetEuroHighlights tekst={kostenramingTekst} />
                </div>
                <BreakdownPaneel tekst={kostenramingTekst} bron="kostenraming" />
                <ParserOutputPaneel
                  parsed={parsed}
                  structureleJaren={structureleJaren}
                  aantalJaren={aantalJaren}
                  doelTotaal={doelTotaalMid}
                  minTotaal={minTotaal}
                />
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
          <MotivatiePaneel motivatie={insp.motivatie} />
        </SubSectie>

        {/* C3: Bottom-up berekening */}
        {!isOverig && parsed.eenmaligMid > 0 && (
          <SubSectie
            nummer="C3"
            titel="Bottom-up berekening voor dit scenario"
            hint={`Dossier-mid eenmalig + structureel-mid × ${structureleJaren} structurele jaren (= aantalJaren − 1, want jaar 1 telt als opstart)`}
          >
            <div className="rounded-lg border border-gray-200 bg-gray-50/50 p-4 font-mono text-sm space-y-1">
              <div className="flex items-baseline justify-between">
                <span>Eenmalig (mid)</span>
                <span>{formatEur(parsed.eenmaligMid)}</span>
              </div>
              <div className="flex items-baseline justify-between">
                <span>+ {structureleJaren} jaar × {formatEur(parsed.structureelMidPerJr)}/jr structureel</span>
                <span>{formatEur(parsed.structureelMidPerJr * structureleJaren)}</span>
              </div>
              <div className="border-t-2 border-gray-300 pt-1 mt-1 flex items-baseline justify-between font-bold text-[#003366]">
                <span>= Doel-totaal (richtlijn voor AI)</span>
                <span>{formatEur(doelTotaalMid)}</span>
              </div>
              <div className="text-xs text-gray-500 mt-2 pt-2 border-t border-gray-200 font-sans">
                <p>
                  De AI moest binnen <strong>[Min {formatEur(minTotaal)}, Doel × 1,05 = {formatEur(doelTotaalMid * 1.05)}]</strong> blijven (uit de begroting-advies prompt).
                </p>
              </div>
            </div>
          </SubSectie>
        )}

        {/* C4: Werkelijk + drift */}
        <SubSectie
          nummer={isOverig ? "C2" : "C4"}
          titel="Werkelijk in dit scenario + drift-analyse"
        >
          <div className="rounded-lg border border-gray-200 bg-white p-4 space-y-2">
            <div className="flex items-baseline justify-between">
              <span className="text-sm text-gray-600">Werkelijk inspanning-totaal</span>
              <span className="font-mono font-bold text-lg text-gray-900">{formatEur(insp.totaalEuro)}</span>
            </div>
            {!isOverig && parsed.eenmaligMid > 0 && (
              <>
                <div className="flex items-baseline justify-between text-xs text-gray-500">
                  <span>Doel-totaal bottom-up</span>
                  <span className="font-mono">{formatEur(doelTotaalMid)}</span>
                </div>
                <div
                  className={`flex items-baseline justify-between text-sm font-semibold ${
                    Math.abs(drift) < tolerantie(insp.totaalEuro ?? 0)
                      ? "text-emerald-700"
                      : drift > 0
                      ? "text-amber-700"
                      : "text-blue-700"
                  }`}
                >
                  <span>Δ drift</span>
                  <span className="font-mono">
                    {drift >= 0 ? "+" : ""}
                    {formatEur(drift)} ({driftPct >= 0 ? "+" : ""}{Math.round(driftPct)}%)
                  </span>
                </div>
                <DriftVerklaring drift={drift} domein={insp.domein} />
              </>
            )}
            {isOverig && (
              <p className="text-xs text-gray-600 italic mt-1">
                Deze post heeft geen dossier-raming; het bedrag volgt uit een vaste formule (~10% van basisraming, behalve bij min20 waar cap-headroom de buffer naar nul dwingt).
              </p>
            )}
          </div>
        </SubSectie>

        {/* C5: Verdeling per jaar */}
        <SubSectie
          nummer={isOverig ? "C3" : "C5"}
          titel="Verdeling per jaar"
          hint="Hoe is het inspanning-totaal over de jaren verdeeld? Per cell: bedrag, fase, percentage."
        >
          <VerdelingPerJaarTabel insp={insp} startJaar={startJaar} aantalJaren={aantalJaren} />
        </SubSectie>
      </div>
    </details>
  );
}

function ParserOutputPaneel({
  parsed,
  structureleJaren,
  aantalJaren,
  doelTotaal,
  minTotaal,
}: {
  parsed: ParsedDossierRaming;
  structureleJaren: number;
  aantalJaren: number;
  doelTotaal: number;
  minTotaal: number;
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
      <p className="font-semibold text-gray-700 mb-2">Wat de tekstparser eruit haalt (basis voor scenario-berekening):</p>
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
      <p className="text-[11px] text-gray-500 mt-3 pt-2 border-t border-gray-100">
        Voor dit scenario van <strong>{aantalJaren} jaar</strong> ({structureleJaren} structurele jaren):
        Doel-totaal <strong className="text-gray-700">{formatEur(doelTotaal)}</strong>,
        Min-grens <strong className="text-gray-700">{formatEur(minTotaal)}</strong>.
      </p>
    </div>
  );
}

function MotivatiePaneel({ motivatie }: { motivatie: string }) {
  if (!motivatie?.trim()) {
    return <p className="text-xs text-gray-500 italic">Geen motivatie beschikbaar.</p>;
  }
  const { inleiding, onderbouwing } = splitMotivatie(motivatie);
  return (
    <div className="space-y-3">
      {inleiding && (
        <div className="text-sm text-gray-700 leading-relaxed">
          <TekstMetEuroHighlights tekst={inleiding} />
        </div>
      )}
      {onderbouwing && (
        <>
          <div className="rounded bg-blue-50/50 border border-blue-200 p-3">
            <p className="text-[10px] uppercase tracking-wider font-semibold text-blue-900 mb-1.5">
              Dossier-onderbouwing — componenten en bedragen
            </p>
            <div className="text-sm text-gray-800 leading-relaxed">
              <TekstMetEuroHighlights tekst={onderbouwing} />
            </div>
          </div>
          <BreakdownPaneel tekst={onderbouwing} bron="motivatie" />
        </>
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

function BreakdownPaneel({ tekst, bron }: { tekst: string; bron: "kostenraming" | "motivatie" }) {
  const parsed: ParsedBreakdown = useMemo(() => parseBreakdown(tekst), [tekst]);
  if (parsed.unparsed) return null;

  const eenmaligToon = parsed.eenmalig?.sluitNetjesAan && parsed.eenmalig.subComponenten.length >= 2;
  const structureelToon = parsed.structureel?.sluitNetjesAan && parsed.structureel.subComponenten.length >= 2;
  if (!eenmaligToon && !structureelToon) return null;

  const bronLabel = bron === "kostenraming" ? "uit de kostenraming-tekst" : "uit de motivatie";

  return (
    <div className="rounded-lg border-2 border-emerald-300 bg-emerald-50/40 p-4 space-y-3">
      <p className="text-[10px] uppercase tracking-wider font-bold text-emerald-900">
        Uitsplitsing per component ({bronLabel})
      </p>
      {eenmaligToon && parsed.eenmalig && (
        <BreakdownTabel section={parsed.eenmalig} />
      )}
      {structureelToon && parsed.structureel && (
        <BreakdownTabel section={parsed.structureel} />
      )}
    </div>
  );
}

function BreakdownTabel({ section }: { section: BreakdownSection }) {
  const eenheid = section.label === "structureel" ? "/jr" : "";
  const titel = section.label === "structureel" ? "Structureel per jaar" : "Eenmalig";

  function fmtRange(low: number, high: number): string {
    if (low === high) return formatEur(low);
    return `${formatEur(low)} – ${formatEur(high)}`;
  }

  const bufferGroot = section.bufferLow > 0 || section.bufferHigh > 0;
  const bufferKlein = Math.abs(section.bufferLow) < 5000 && Math.abs(section.bufferHigh) < 5000;

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
          {section.subComponenten.map((c, i) => (
            <tr key={i} className="border-t border-gray-100 hover:bg-gray-50/50">
              <td className="px-3 py-1.5 text-gray-800">
                {c.naam}
                {c.vanafJaar !== null && (
                  <span className="text-[10px] text-gray-500 ml-1">(vanaf jaar {c.vanafJaar})</span>
                )}
              </td>
              <td className="px-3 py-1.5 text-right font-mono text-gray-700">
                {fmtRange(c.bedragLow, c.bedragHigh)}{eenheid}
              </td>
            </tr>
          ))}
        </tbody>
        <tfoot>
          <tr className="bg-gray-50 border-t-2 border-gray-300">
            <td className="px-3 py-1.5 text-right font-semibold text-gray-700">Σ componenten</td>
            <td className="px-3 py-1.5 text-right font-mono font-bold text-gray-900">
              {fmtRange(section.somSubsLow, section.somSubsHigh)}{eenheid}
            </td>
          </tr>
          {!bufferKlein && bufferGroot && (
            <tr className="bg-blue-50/40">
              <td className="px-3 py-1.5 text-right text-blue-900 italic" title="Verschil tussen hoofdtotaal en sub-componenten — typisch buffer of overhead">
                + buffer / overhead
              </td>
              <td className="px-3 py-1.5 text-right font-mono text-blue-900">
                {fmtRange(section.bufferLow, section.bufferHigh)}{eenheid}
              </td>
            </tr>
          )}
          <tr className="bg-emerald-50/60 border-t border-emerald-200">
            <td className="px-3 py-1.5 text-right font-bold text-emerald-900">= Hoofdtotaal</td>
            <td className="px-3 py-1.5 text-right font-mono font-bold text-emerald-900">
              {fmtRange(section.hoofdtotaalLow, section.hoofdtotaalHigh)}{eenheid}
              <span className="ml-1">✓</span>
            </td>
          </tr>
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

function DriftVerklaring({ drift, domein }: { drift: number; domein: string }) {
  if (Math.abs(drift) < 5000) {
    return <p className="text-xs text-gray-600 mt-1">Bedrag valt netjes binnen tolerantie van het bottom-up doel.</p>;
  }
  let uitleg: string;
  if (drift < 0) {
    if (domein === "data_systemen") {
      uitleg = "Scenario ligt onder het bottom-up doel. Meest waarschijnlijke oorzaak: interne capaciteits­kosten (bv. CRM ~1.466 uur × €74) zijn afgetrokken — die staan in §4.2 Interne uren, niet in deze out-of-pocket-raming.";
    } else if (domein === "processen") {
      uitleg = "Scenario ligt onder het bottom-up doel. Vermoedelijk afgetrokken: interne werkgroep- en proceseigenaarschap-uren — die staan in §4.2.";
    } else {
      uitleg = "Scenario ligt onder het bottom-up doel — vermoedelijk door interne-uren-aftrek of cap-respect (water-fill heeft jaartotalen verlaagd).";
    }
  } else {
    if (domein === "cultuur") {
      uitleg = "Scenario ligt boven het bottom-up doel. Reden: de motivatie hanteert aanvullende Cito-context (executive-tarief reservering, individuele coaching, HR-instrumentarium) bovenop het oorspronkelijke dossier-bedrag.";
    } else {
      uitleg = "Scenario ligt boven het bottom-up doel — door scale-up guard die naar dossier-mid optilt, of door aanvullende componenten in de motivatie.";
    }
  }
  return <p className="text-xs text-gray-600 mt-1.5 italic leading-relaxed">{uitleg}</p>;
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
            <th className="px-3 py-2 font-semibold text-right">% v. inspanning</th>
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
            <td colSpan={2} className="px-3 py-1.5 text-right text-gray-700">Σ over alle jaren</td>
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
            Activiteit per jaar (uit AI-motivatie)
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
        titel="Jaartotalen — verdeling, cap-respect en automatische aanpassingen"
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
                    title={j1MetCitoNorm ? "Jaar 1 op Cito-norm €250K (hard, mag boven scenario-cap uitkomen)" : undefined}
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

      <ServerGuardsUitleg scenario={scenario} startJaar={startJaar} cap={cap} aantalJaren={aantalJaren} />
    </div>
  );
}

function ServerGuardsUitleg({
  scenario,
  startJaar,
  cap,
  aantalJaren,
}: {
  scenario: BegrotingScenario;
  startJaar: number;
  cap: number;
  aantalJaren: number;
}) {
  const inspanningen = scenario.inspanningen ?? [];
  const totalenPerJaar = scenario.totalenPerJaar ?? [];
  const eindJaar = startJaar + aantalJaren - 1;

  const startTotaal = totalenPerJaar.find((t) => t.jaar === startJaar)?.euro ?? 0;
  const j1OpCitoNorm = Math.abs(startTotaal - 250_000) < 1000;
  const eindOnderCap = (totalenPerJaar.find((t) => t.jaar === eindJaar)?.euro ?? 0) < cap * 0.95;
  const allesParallelStart = inspanningen.every((insp) => {
    const startCell = insp.verdelingPerJaar.find((v) => v.jaar === startJaar);
    return (startCell?.euro ?? 0) > 0 || insp.domein === "overig"; // Post onvoorzien mag jaar 1 op €0
  });
  const middenJarenOpCap = totalenPerJaar
    .filter((t) => t.jaar > startJaar && t.jaar < eindJaar)
    .every((t) => Math.abs(t.euro - cap) < cap * 0.05);

  return (
    <div className="mt-4 rounded-lg border border-gray-200 bg-gray-50/50 p-4">
      <p className="text-[10px] uppercase tracking-wider font-semibold text-gray-700 mb-2">
        Automatische aanpassingen (na AI-generatie)
      </p>
      <p className="text-xs text-gray-600 mb-3 leading-relaxed">
        Na de AI-generatie passen vier automatische regels het scenario aan zodat het binnen de
        jaargrenzen past. Hier zie je welke regels vermoedelijk hebben gewerkt:
      </p>
      <ul className="space-y-2 text-xs">
        <GuardItem
          actief={allesParallelStart}
          naam="Parallelle start in jaar 1"
          uitleg={`Elke inspanning moet in ${startJaar} (jaar 1) een non-zero bedrag hebben — geen wachten. Als de AI €0 voorstelt, wordt automatisch €1.000 naar jaar 1 verschoven.`}
        />
        <GuardItem
          actief={j1OpCitoNorm}
          naam="Cito-norm in startjaar"
          uitleg={`Het startjaar past exact op het Cito-norm-budget (${formatEur(250_000)}). Voor alle 4 scenario's (inclusief min20 en plus20) is jaar 1 gebonden aan deze hard-eis.`}
        />
        <GuardItem
          actief={true}
          naam="Ophogen tot dossier-middenwaarde"
          uitleg="Als de AI onder de dossier-mid blijft, wordt elke inspanning proportioneel opgehoogd tot het mid-bedrag. Voorkomt dat het scenario kunstmatig goedkoper lijkt dan het dossier."
        />
        <GuardItem
          actief={middenJarenOpCap}
          naam="Vol-budget regel"
          uitleg={`Niet-laatste jaren worden naar exact ${formatEur(cap)} (plafond) gevuld door bedragen uit latere jaren naar voren te schuiven. Het laatste jaar (${eindJaar}) mag onder het plafond komen — dat is het afrondingsjaar.`}
        />
        <GuardItem
          actief={eindOnderCap}
          naam="Cap-overschrijding voorkomen"
          uitleg="Als een jaar boven het plafond komt, wordt het overschot naar het laatste jaar geschoven. Hierdoor blijft elk jaar ≤ plafond × 1,001 (kleine marge voor afronding)."
        />
      </ul>
    </div>
  );
}

function GuardItem({ actief, naam, uitleg }: { actief: boolean; naam: string; uitleg: string }) {
  return (
    <li className="flex items-start gap-2">
      <span className={`mt-0.5 ${actief ? "text-emerald-600" : "text-gray-300"}`}>{actief ? "✓" : "○"}</span>
      <div className="flex-1">
        <span className={`font-semibold ${actief ? "text-gray-800" : "text-gray-400"}`}>{naam}</span>
        <p className="text-gray-600 leading-relaxed">{uitleg}</p>
      </div>
    </li>
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
      uitleg: `Hoogste jaarbedrag: ${formatEur(Math.max(0, ...totalenPerJaar.map((t) => t.euro)))} versus plafond ${formatEur(cap)}. Jaar 1 (${startJaar}) is uitgezonderd: dat staat hard op de Cito-norm van €250.000 — dat kan boven de scenario-cap uitkomen voor min20 (cap €200K).`,
    },
    {
      label: "Per inspanning klopt de jaarverdeling met het inspanning-totaal",
      ok: inspanningen.every((insp) => {
        const sum = (insp.verdelingPerJaar ?? []).reduce((s, v) => s + (v.euro ?? 0), 0);
        return Math.abs(sum - (insp.totaalEuro ?? 0)) <= tolerantie(insp.totaalEuro ?? 0);
      }),
      uitleg: "Voor elke inspanning telt de jaar-verdeling op tot het inspanning-totaal (binnen tolerantie van max(€5.000, 0,5%)).",
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
            {allOk ? "Alle berekeningen kloppen" : "Discrepantie gevonden — zie details"}
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
