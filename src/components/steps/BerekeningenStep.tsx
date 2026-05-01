"use client";

import { useState, useMemo } from "react";
import { useSession } from "@/lib/session-context";
import type { DINSession, BegrotingAdvies, Stap4Result } from "@/lib/types";

// --- Helpers -----------------------------------------------------------------

function formatEur(n: number | undefined | null): string {
  if (typeof n !== "number" || !isFinite(n)) return "—";
  return `€ ${Math.round(n).toLocaleString("nl-NL")}`;
}

function formatEurK(n: number | undefined | null): string {
  if (typeof n !== "number" || !isFinite(n)) return "—";
  if (Math.abs(n) >= 1_000_000) return `€ ${(n / 1_000_000).toFixed(2)}M`;
  if (Math.abs(n) >= 1_000) return `€ ${Math.round(n / 1_000)}K`;
  return `€ ${Math.round(n)}`;
}

function pct(num: number, denom: number): string {
  if (denom <= 0) return "—";
  return `${Math.round((num / denom) * 100)}%`;
}

const SCENARIO_KEYS = ["optimaal", "plus20", "advies", "min20"] as const;
type ScenarioKey = (typeof SCENARIO_KEYS)[number];

const SCENARIO_META: Record<ScenarioKey, { label: string; band: string; ring: string; accent: string }> = {
  optimaal: { label: "Huidig budget", band: "bg-[#003366]", ring: "ring-[#003366]/30", accent: "text-[#003366]" },
  plus20: { label: "+20% (sneller)", band: "bg-emerald-700", ring: "ring-emerald-700/30", accent: "text-emerald-700" },
  advies: { label: "Optimaal (advies)", band: "bg-purple-700", ring: "ring-purple-700/30", accent: "text-purple-700" },
  min20: { label: "−20% (langzamer)", band: "bg-amber-700", ring: "ring-amber-700/30", accent: "text-amber-700" },
};

const DOMAIN_LABEL: Record<string, string> = {
  mens: "Mens",
  processen: "Processen",
  data_systemen: "Data & Systemen",
  cultuur: "Cultuur",
};

const DOMAIN_DOT: Record<string, string> = {
  mens: "bg-blue-500",
  processen: "bg-emerald-600",
  data_systemen: "bg-purple-600",
  cultuur: "bg-amber-600",
};

// Tolerantie voor som-controle (afronding op duizendtallen kan kleine
// afwijking geven). 0,5% van het scenariototaal of €5.000, hoogste wint.
function tolerantie(scenarioTotaal: number): number {
  return Math.max(5_000, Math.round(scenarioTotaal * 0.005));
}

// --- Component ---------------------------------------------------------------

export default function BerekeningenStep() {
  const { session } = useSession();
  const [openScenario, setOpenScenario] = useState<ScenarioKey | null>("optimaal");

  if (!session) return null;

  const stap4 = (session.crossAnalyseWizard?.stepResults as { stap4?: Stap4Result } | undefined)?.stap4;
  const begroting = stap4?.begrotingAdvies as BegrotingAdvies | undefined;

  const beschikbareScenarios: ScenarioKey[] = SCENARIO_KEYS.filter(
    (k) => !!begroting?.scenarios?.[k]
  );

  return (
    <div className="space-y-6">
      <Header />

      {!begroting && <GeenBegrotingPlaceholder />}

      {begroting && beschikbareScenarios.length === 0 && (
        <div className="bg-amber-50 border border-amber-200 rounded-lg p-4 text-sm text-amber-900">
          Er is een begrotingsadvies-record, maar geen enkel scenario is gevuld. Genereer scenario&apos;s
          in <strong>Cross-analyse · Stap 6 (Optimaliseren)</strong>.
        </div>
      )}

      {begroting && beschikbareScenarios.length > 0 && (
        <>
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
                open={openScenario === k}
                onToggle={() => setOpenScenario(openScenario === k ? null : k)}
              />
            ))}
          </div>
        </>
      )}

      <BinnenkortBlok />
    </div>
  );
}

// --- Sub-componenten ---------------------------------------------------------

function Header() {
  return (
    <div className="bg-gradient-to-br from-[#003366] to-[#1a4d8a] text-white rounded-xl p-6">
      <div className="text-[10px] uppercase tracking-[0.25em] text-blue-200 mb-2">
        Stap 8 — Audit
      </div>
      <h2 className="text-2xl font-bold mb-2">Berekeningen — out-of-pocket per scenario</h2>
      <p className="text-sm text-blue-100 leading-relaxed max-w-3xl">
        Transparante audit-pagina: per scenario zie je exact hoe het bedrag uit §4.1 is opgebouwd.
        Welke inspanningen, welke verdeling per jaar, en of de som klopt met het scenariototaal en
        de jaarlijkse cap. Pure read-only — voor stuurgroep-verantwoording.
      </p>
    </div>
  );
}

function GeenBegrotingPlaceholder() {
  return (
    <div className="bg-white border-2 border-dashed border-gray-300 rounded-xl p-10 text-center">
      <div className="w-12 h-12 rounded-full bg-gray-100 mx-auto flex items-center justify-center mb-4">
        <svg className="w-6 h-6 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 17v-2m3 2v-4m3 4v-6m2 10H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
        </svg>
      </div>
      <p className="text-sm font-medium text-gray-700 mb-1">Nog geen begrotingsadvies</p>
      <p className="text-xs text-gray-500 max-w-md mx-auto">
        Ga naar <strong>Cross-analyse · Stap 6 (Optimaliseren)</strong> en genereer het
        begrotingsadvies. De berekeningen op deze pagina worden automatisch gevuld.
      </p>
    </div>
  );
}

function BinnenkortBlok() {
  return (
    <div className="bg-gray-50 border border-gray-200 rounded-xl p-4">
      <p className="text-xs uppercase tracking-wider text-gray-500 font-semibold mb-1">
        Komt later
      </p>
      <ul className="text-sm text-gray-600 space-y-0.5 list-disc ml-5">
        <li>§4.2 Interne uren — berekeningen per rol × jaar × tarief</li>
        <li>§4.3 Totaalberekeningen — out-of-pocket + interne uren samen</li>
      </ul>
    </div>
  );
}

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
        Snel-navigatie
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
                {formatEurK(s?.totaalGeraamdEuro ?? 0)}
              </div>
              <div className="text-[11px] text-gray-500 mt-0.5">
                {s?.aantalJaren ?? 0} jr · cap {formatEurK(s?.jaarlijksBudgetEuro ?? 0)}/jr
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
}

function ScenarioBerekeningKaart({
  scenarioKey,
  begroting,
  open,
  onToggle,
}: {
  scenarioKey: ScenarioKey;
  begroting: BegrotingAdvies;
  open: boolean;
  onToggle: () => void;
}) {
  const scenario = begroting.scenarios?.[scenarioKey];
  const meta = SCENARIO_META[scenarioKey];
  if (!scenario) return null;

  const startJaar = begroting.startJaar;
  const aantalJaren = scenario.aantalJaren;
  const jaren = useMemo(
    () => Array.from({ length: aantalJaren }, (_, i) => startJaar + i),
    [startJaar, aantalJaren]
  );

  const cap = scenario.jaarlijksBudgetEuro;
  const totaalScenario = scenario.totaalGeraamdEuro;
  const tol = tolerantie(totaalScenario);

  // --- Sectie B: per inspanning -------------------------------------------
  const inspanningen = scenario.inspanningen ?? [];
  const sumInspanningen = inspanningen.reduce((s, i) => s + (i.totaalEuro ?? 0), 0);
  const inspanningenDelta = sumInspanningen - totaalScenario;

  // --- Sectie C: per jaar ---------------------------------------------------
  // Bouw een matrix: rows = inspanning, cols = jaar
  const perJaarPerInspanning = inspanningen.map((insp) => {
    const cells: Record<number, number> = {};
    for (const v of insp.verdelingPerJaar ?? []) {
      cells[v.jaar] = (cells[v.jaar] ?? 0) + (v.euro ?? 0);
    }
    return { titel: insp.inspanningTitel, domein: insp.domein, totaal: insp.totaalEuro, cells };
  });

  // Per-jaar som over alle inspanningen
  const totalenPerJaarFromInsp: Record<number, number> = {};
  for (const insp of perJaarPerInspanning) {
    for (const j of jaren) {
      totalenPerJaarFromInsp[j] = (totalenPerJaarFromInsp[j] ?? 0) + (insp.cells[j] ?? 0);
    }
  }

  // Officiële totalenPerJaar (uit scenario)
  const officieelPerJaar: Record<number, number> = {};
  for (const t of scenario.totalenPerJaar ?? []) {
    officieelPerJaar[t.jaar] = t.euro;
  }

  const sumJaartotalen = jaren.reduce((s, j) => s + (officieelPerJaar[j] ?? 0), 0);
  const jaartotalenDelta = sumJaartotalen - totaalScenario;

  // --- Sectie D: som-controle ----------------------------------------------
  const checks: { label: string; ok: boolean; uitleg: string }[] = [
    {
      label: "Σ inspanning-totalen = scenario-totaal",
      ok: Math.abs(inspanningenDelta) <= tol,
      uitleg: `Som inspanningen ${formatEur(sumInspanningen)} vs scenario ${formatEur(totaalScenario)} — verschil ${formatEur(Math.abs(inspanningenDelta))} (tolerantie ${formatEur(tol)}).`,
    },
    {
      label: "Σ jaartotalen = scenario-totaal",
      ok: Math.abs(jaartotalenDelta) <= tol,
      uitleg: `Som jaartotalen ${formatEur(sumJaartotalen)} vs scenario ${formatEur(totaalScenario)} — verschil ${formatEur(Math.abs(jaartotalenDelta))} (tolerantie ${formatEur(tol)}).`,
    },
    {
      label: "Geen jaar boven cap (€/jaar)",
      ok: jaren.every((j) => (officieelPerJaar[j] ?? 0) <= cap + tol),
      uitleg: `Hoogste jaarbedrag: ${formatEur(Math.max(...jaren.map((j) => officieelPerJaar[j] ?? 0)))} — cap ${formatEur(cap)}.`,
    },
    {
      label: "Σ verdelingPerJaar (per inspanning) = inspanning-totaal",
      ok: inspanningen.every((insp) => {
        const sum = (insp.verdelingPerJaar ?? []).reduce((s, v) => s + (v.euro ?? 0), 0);
        return Math.abs(sum - (insp.totaalEuro ?? 0)) <= tolerantie(insp.totaalEuro ?? 0);
      }),
      uitleg: "Voor elke inspanning telt de jaar-verdeling op tot het inspanning-totaal.",
    },
  ];

  const allOk = checks.every((c) => c.ok);

  return (
    <div className="bg-white border border-gray-200 rounded-xl overflow-hidden">
      {/* Banner / toggle */}
      <button
        onClick={onToggle}
        className={`w-full ${meta.band} text-white px-5 py-3 flex items-center justify-between text-left`}
      >
        <div>
          <div className="text-[10px] uppercase tracking-[0.2em] opacity-80">{meta.label}</div>
          <div className="text-base font-bold mt-0.5">
            {formatEurK(totaalScenario)}
            <span className="text-xs font-normal opacity-80 ml-2">
              over {aantalJaren} jaar ({startJaar}–{startJaar + aantalJaren - 1}) · cap {formatEurK(cap)}/jr
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
        <div className="p-5 space-y-6">
          <SectieA cap={cap} aantalJaren={aantalJaren} startJaar={startJaar} totaalScenario={totaalScenario} />
          <SectieB
            inspanningen={inspanningen}
            sumInspanningen={sumInspanningen}
            totaalScenario={totaalScenario}
            tol={tol}
          />
          <SectieC
            jaren={jaren}
            perJaarPerInspanning={perJaarPerInspanning}
            officieelPerJaar={officieelPerJaar}
            totalenPerJaarFromInsp={totalenPerJaarFromInsp}
            cap={cap}
          />
          <SectieD checks={checks} allOk={allOk} />
        </div>
      )}
    </div>
  );
}

// --- Sectie A — Scenario input ------------------------------------------------

function SectieA({
  cap,
  aantalJaren,
  startJaar,
  totaalScenario,
}: {
  cap: number;
  aantalJaren: number;
  startJaar: number;
  totaalScenario: number;
}) {
  const theoMax = cap * aantalJaren;
  const benutting = theoMax > 0 ? totaalScenario / theoMax : 0;
  return (
    <div>
      <SectieKop nummer="A" titel="Scenario-input" hint="Welke begrenzingen gelden voor dit scenario?" />
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <Stat label="Cap (€/jaar)" value={formatEur(cap)} mono />
        <Stat label="Aantal jaren" value={`${aantalJaren} jr`} sub={`${startJaar}–${startJaar + aantalJaren - 1}`} />
        <Stat label="Theoretisch max" value={formatEur(theoMax)} mono sub="cap × jaren" />
        <Stat
          label="Benutting"
          value={pct(totaalScenario, theoMax)}
          sub={`${formatEur(totaalScenario)} / ${formatEur(theoMax)}`}
          highlight={benutting > 1.001}
        />
      </div>
    </div>
  );
}

// --- Sectie B — per inspanning ------------------------------------------------

function SectieB({
  inspanningen,
  sumInspanningen,
  totaalScenario,
  tol,
}: {
  inspanningen: NonNullable<NonNullable<BegrotingAdvies["scenarios"]["optimaal"]>>["inspanningen"];
  sumInspanningen: number;
  totaalScenario: number;
  tol: number;
}) {
  return (
    <div>
      <SectieKop
        nummer="B"
        titel="Berekening per inspanning"
        hint="Verdeling-per-jaar wordt opgeteld; de som moet overeenkomen met het inspanning-totaal."
      />
      <div className="overflow-x-auto rounded-lg border border-gray-200">
        <table className="w-full text-sm">
          <thead className="bg-gray-50">
            <tr className="text-left text-[10px] uppercase tracking-wider text-gray-500">
              <th className="px-3 py-2 font-semibold">Inspanning</th>
              <th className="px-3 py-2 font-semibold">Domein</th>
              <th className="px-3 py-2 font-semibold text-right"># jaar-cellen</th>
              <th className="px-3 py-2 font-semibold text-right">Σ verdeling</th>
              <th className="px-3 py-2 font-semibold text-right">Inspanning-totaal</th>
              <th className="px-3 py-2 font-semibold text-right">% van scenario</th>
              <th className="px-3 py-2 font-semibold text-center">Match</th>
            </tr>
          </thead>
          <tbody>
            {inspanningen.map((insp, i) => {
              const sumVerdeling = (insp.verdelingPerJaar ?? []).reduce(
                (s, v) => s + (v.euro ?? 0),
                0
              );
              const localTol = tolerantie(insp.totaalEuro ?? 0);
              const match = Math.abs(sumVerdeling - (insp.totaalEuro ?? 0)) <= localTol;
              return (
                <tr key={i} className="border-t border-gray-100 hover:bg-gray-50/50">
                  <td className="px-3 py-2 align-top">
                    <p className="font-medium text-gray-800">{insp.inspanningTitel}</p>
                  </td>
                  <td className="px-3 py-2 align-top">
                    <span className="inline-flex items-center gap-1.5 text-[11px] text-gray-700">
                      <span className={`w-2 h-2 rounded-full ${DOMAIN_DOT[insp.domein] ?? "bg-gray-400"}`} />
                      {DOMAIN_LABEL[insp.domein] ?? insp.domein}
                    </span>
                  </td>
                  <td className="px-3 py-2 align-top text-right text-gray-600 tabular-nums">
                    {(insp.verdelingPerJaar ?? []).length}
                  </td>
                  <td className="px-3 py-2 align-top text-right font-mono text-gray-700">
                    {formatEur(sumVerdeling)}
                  </td>
                  <td className="px-3 py-2 align-top text-right font-mono font-semibold text-gray-900">
                    {formatEur(insp.totaalEuro)}
                  </td>
                  <td className="px-3 py-2 align-top text-right text-gray-600 tabular-nums">
                    {pct(insp.totaalEuro ?? 0, totaalScenario)}
                  </td>
                  <td className="px-3 py-2 align-top text-center">
                    {match ? (
                      <span className="text-emerald-600 font-bold">✓</span>
                    ) : (
                      <span
                        className="text-red-600 font-bold"
                        title={`Verschil ${formatEur(Math.abs(sumVerdeling - (insp.totaalEuro ?? 0)))}`}
                      >
                        ✗
                      </span>
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
          <tfoot>
            <tr className="bg-gray-50 border-t-2 border-gray-300">
              <td colSpan={4} className="px-3 py-2 text-right font-semibold text-gray-700">
                Totaal inspanningen
              </td>
              <td className="px-3 py-2 text-right font-mono font-bold text-[#003366]">
                {formatEur(sumInspanningen)}
              </td>
              <td className="px-3 py-2 text-right text-gray-500 tabular-nums">
                {pct(sumInspanningen, totaalScenario)}
              </td>
              <td className="px-3 py-2 text-center">
                {Math.abs(sumInspanningen - totaalScenario) <= tol ? (
                  <span className="text-emerald-600 font-bold">✓</span>
                ) : (
                  <span className="text-red-600 font-bold">✗</span>
                )}
              </td>
            </tr>
            <tr className="bg-gray-50 border-t border-gray-200">
              <td colSpan={4} className="px-3 py-2 text-right text-xs text-gray-500">
                Scenario-totaal (referentie)
              </td>
              <td className="px-3 py-2 text-right font-mono text-xs text-gray-500">
                {formatEur(totaalScenario)}
              </td>
              <td colSpan={2} />
            </tr>
          </tfoot>
        </table>
      </div>
    </div>
  );
}

// --- Sectie C — per jaar ------------------------------------------------------

function SectieC({
  jaren,
  perJaarPerInspanning,
  officieelPerJaar,
  totalenPerJaarFromInsp,
  cap,
}: {
  jaren: number[];
  perJaarPerInspanning: Array<{ titel: string; domein: string; totaal: number; cells: Record<number, number> }>;
  officieelPerJaar: Record<number, number>;
  totalenPerJaarFromInsp: Record<number, number>;
  cap: number;
}) {
  return (
    <div>
      <SectieKop
        nummer="C"
        titel="Berekening per jaar"
        hint="Som per jaar over alle inspanningen, vergeleken met de cap én met het officiële totalenPerJaar veld uit het scenario."
      />
      <div className="overflow-x-auto rounded-lg border border-gray-200">
        <table className="w-full text-sm">
          <thead className="bg-gray-50">
            <tr className="text-left text-[10px] uppercase tracking-wider text-gray-500">
              <th className="px-3 py-2 font-semibold sticky left-0 bg-gray-50 z-10">Inspanning</th>
              {jaren.map((j) => (
                <th key={j} className="px-3 py-2 font-semibold text-right">
                  {j}
                </th>
              ))}
              <th className="px-3 py-2 font-semibold text-right">Totaal</th>
            </tr>
          </thead>
          <tbody>
            {perJaarPerInspanning.map((row, i) => {
              const sum = jaren.reduce((s, j) => s + (row.cells[j] ?? 0), 0);
              return (
                <tr key={i} className="border-t border-gray-100 hover:bg-gray-50/50">
                  <td className="px-3 py-2 sticky left-0 bg-white z-10">
                    <div className="flex items-center gap-1.5">
                      <span className={`w-2 h-2 rounded-full ${DOMAIN_DOT[row.domein] ?? "bg-gray-400"}`} />
                      <span className="text-gray-800 font-medium">{row.titel}</span>
                    </div>
                  </td>
                  {jaren.map((j) => {
                    const v = row.cells[j] ?? 0;
                    return (
                      <td key={j} className="px-3 py-2 text-right font-mono text-gray-700">
                        {v > 0 ? formatEur(v) : <span className="text-gray-300">—</span>}
                      </td>
                    );
                  })}
                  <td className="px-3 py-2 text-right font-mono font-semibold text-gray-900">
                    {formatEur(sum)}
                  </td>
                </tr>
              );
            })}
          </tbody>
          <tfoot>
            {/* Som-uit-inspanningen */}
            <tr className="bg-gray-50 border-t-2 border-gray-300 font-semibold">
              <td className="px-3 py-2 sticky left-0 bg-gray-50 z-10 text-gray-700">
                Σ uit inspanningen
              </td>
              {jaren.map((j) => (
                <td key={j} className="px-3 py-2 text-right font-mono text-[#003366]">
                  {formatEur(totalenPerJaarFromInsp[j] ?? 0)}
                </td>
              ))}
              <td className="px-3 py-2 text-right font-mono text-[#003366]">
                {formatEur(jaren.reduce((s, j) => s + (totalenPerJaarFromInsp[j] ?? 0), 0))}
              </td>
            </tr>
            {/* Officieel veld */}
            <tr className="bg-blue-50/40 border-t border-blue-100">
              <td className="px-3 py-2 sticky left-0 bg-blue-50/40 z-10 text-gray-600 text-xs">
                totalenPerJaar (scenario-veld)
              </td>
              {jaren.map((j) => (
                <td key={j} className="px-3 py-2 text-right font-mono text-xs text-gray-600">
                  {formatEur(officieelPerJaar[j] ?? 0)}
                </td>
              ))}
              <td className="px-3 py-2 text-right font-mono text-xs text-gray-600">
                {formatEur(jaren.reduce((s, j) => s + (officieelPerJaar[j] ?? 0), 0))}
              </td>
            </tr>
            {/* Cap-vergelijking */}
            <tr className="bg-white border-t border-gray-200">
              <td className="px-3 py-2 sticky left-0 bg-white z-10 text-gray-500 text-xs">
                Cap-benutting (% van €{cap.toLocaleString("nl-NL")})
              </td>
              {jaren.map((j) => {
                const v = officieelPerJaar[j] ?? totalenPerJaarFromInsp[j] ?? 0;
                const p = cap > 0 ? v / cap : 0;
                const overcap = p > 1.001;
                return (
                  <td
                    key={j}
                    className={`px-3 py-2 text-right text-xs tabular-nums ${
                      overcap ? "text-red-600 font-bold" : "text-gray-500"
                    }`}
                  >
                    {pct(v, cap)}
                    {overcap && <span className="ml-0.5">⚠</span>}
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

// --- Sectie D — som-controle --------------------------------------------------

function SectieD({
  checks,
  allOk,
}: {
  checks: { label: string; ok: boolean; uitleg: string }[];
  allOk: boolean;
}) {
  return (
    <div>
      <SectieKop nummer="D" titel="Som-controle" hint="Sluiten alle deelsommen aan op de scenario-totalen?" />
      <div
        className={`rounded-lg border-2 p-4 ${
          allOk ? "border-emerald-300 bg-emerald-50" : "border-red-300 bg-red-50"
        }`}
      >
        <div className="flex items-center gap-2 mb-3">
          {allOk ? (
            <>
              <span className="w-6 h-6 rounded-full bg-emerald-600 text-white flex items-center justify-center text-xs font-bold">
                ✓
              </span>
              <span className="font-semibold text-emerald-900">Alle berekeningen kloppen</span>
            </>
          ) : (
            <>
              <span className="w-6 h-6 rounded-full bg-red-600 text-white flex items-center justify-center text-xs font-bold">
                !
              </span>
              <span className="font-semibold text-red-900">Discrepantie gevonden — zie details</span>
            </>
          )}
        </div>
        <ul className="space-y-1.5">
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

// --- Kleine UI primitives -----------------------------------------------------

function SectieKop({ nummer, titel, hint }: { nummer: string; titel: string; hint?: string }) {
  return (
    <div className="mb-3">
      <div className="flex items-center gap-2">
        <span className="w-6 h-6 rounded-md bg-[#003366] text-white text-xs font-bold flex items-center justify-center">
          {nummer}
        </span>
        <h3 className="text-sm font-semibold text-[#003366]">{titel}</h3>
      </div>
      {hint && <p className="text-xs text-gray-500 mt-1 ml-8">{hint}</p>}
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
        highlight ? "border-amber-300 bg-amber-50" : "border-gray-200 bg-gray-50"
      }`}
    >
      <p className="text-[10px] uppercase tracking-wider text-gray-500 font-semibold">{label}</p>
      <p className={`text-base font-bold text-gray-900 mt-0.5 ${mono ? "font-mono" : ""}`}>{value}</p>
      {sub && <p className="text-[11px] text-gray-500 mt-0.5">{sub}</p>}
    </div>
  );
}
