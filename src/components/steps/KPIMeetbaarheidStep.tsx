"use client";

import { useState, useEffect, useRef } from "react";
import { useSession } from "@/lib/session-context";
import type {
  DINBenefit,
  DINCapability,
  DINEffort,
  EffortDomain,
  VermogensProfiel,
} from "@/lib/types";
import { DOMAIN_LABELS, DOMAIN_COLORS } from "@/lib/types";
import {
  THREESIDES_DOMEINEN,
  THREESIDES_MIJLPAAL,
  type ThreesidesDomeinData,
} from "@/lib/threesides-data";

// ============================================================
// KPI's & Meetbaarheid (Stap 9)
// ------------------------------------------------------------
// Scope: KPI's op BATEN en VERMOGENS. Inspanningen volgen later via
// het adoptie-framework (3sides) en staan hier alleen als notitie.
//
// Opslag-patroon (kritisch — moet persisteren):
//  - lokale useState voor de inputwaarde (snelle UX)
//  - bij onBlur roepen we updateSession aan, die alleen het specifieke
//    veld muteert via .map() over de array. Nooit hele arrays vervangen,
//    nooit null/undefined/lege array wegschrijven.
//  - updateSession regelt localStorage-first (session_<id>) + Supabase.
//
// Methodiek: geen verzonnen getallen als feit. Leeg blijft leeg — we
// vullen niets voor; alleen wat in de sessie staat of wat de gebruiker /
// AI expliciet invoert.
// ============================================================

// --- AI-contract types (POST /api/kpi-suggest) ---

interface KpiVraag {
  key?: string;
  vraag: string;
  placeholder?: string;
}

interface KpiVoorstel {
  indicator?: string;
  meetmethode?: string;
  currentValue?: string;
  targetValue?: string;
  measurementMoment?: string;
  eigenaar?: string;
  toelichting?: string;
}

// Patch die op een profiel kan worden toegepast. `bateneigenaar` hoort bij
// het batenprofiel, `eigenaar`/`kpiStatus` bij beide — vandaar de superset.
type KpiPatch = Partial<KpiVoorstel> & {
  bateneigenaar?: string;
  kpiStatus?: "concept" | "afgestemd";
};

type AiFase = "idle" | "vragen" | "voorstel";

// ============================================================
// Helpers
// ============================================================

const KPI_STATUS_LABEL: Record<"concept" | "afgestemd", string> = {
  concept: "Concept",
  afgestemd: "Afgestemd",
};

// Richttijd per fase in de sessie (seconden). Baten 25:00, Vermogens 20:00.
const RICHTTIJD_SEC: Record<"baten" | "vermogens", number> = {
  baten: 25 * 60,
  vermogens: 20 * 60,
};

// Outside-in volgorde (Cito): cultuur → mens → data/systemen → processen.
const DOMEIN_VOLGORDE: Exclude<EffortDomain, "overig">[] = [
  "cultuur",
  "mens",
  "data_systemen",
  "processen",
];

/** mm:ss uit seconden. Klamp op 0. */
function formatMMSS(totalSeconds: number): string {
  const s = Math.max(0, Math.floor(totalSeconds));
  const m = Math.floor(s / 60);
  const r = s % 60;
  return `${String(m).padStart(2, "0")}:${String(r).padStart(2, "0")}`;
}

// Hint bij het nulmeting-veld: in deze sessie leggen we de méthode vast, niet het getal.
const NULMETING_HINT =
  "In deze sessie leg je de méthode vast, niet het getal — de nulmeting wordt bij programmastart (Q3 2026) gemeten.";

// Selecteerbare meetvelden voor het AI-paneel (zoals BenefitCard's veld-selectie).
// `key` = veld in het AI-contract; `label` = knoptekst.
type KpiVeldKey =
  | "indicator"
  | "meetmethode"
  | "currentValue"
  | "targetValue"
  | "measurementMoment"
  | "eigenaar";

const KPI_VELD_KNOPPEN: { key: KpiVeldKey; label: string }[] = [
  { key: "indicator", label: "Indicator" },
  { key: "meetmethode", label: "Meetmethode" },
  { key: "currentValue", label: "Nulmeting" },
  { key: "targetValue", label: "Doelwaarde" },
  { key: "measurementMoment", label: "Meetmoment" },
  { key: "eigenaar", label: "Eigenaar" },
];

/** Lege VermogensProfiel die de verplichte schema-velden behoudt. */
function leegVermogensProfiel(cap: DINCapability): VermogensProfiel {
  return {
    eigenaar: cap.profiel?.eigenaar ?? "",
    huidieSituatie: cap.profiel?.huidieSituatie ?? "",
    gewensteSituatie: cap.profiel?.gewensteSituatie ?? "",
    indicator: cap.profiel?.indicator,
    meetmethode: cap.profiel?.meetmethode,
    currentValue: cap.profiel?.currentValue,
    targetValue: cap.profiel?.targetValue,
    measurementMoment: cap.profiel?.measurementMoment,
    kpiStatus: cap.profiel?.kpiStatus,
  };
}

// ============================================================
// Hoofdcomponent
// ============================================================

export default function KPIMeetbaarheidStep() {
  const { session, updateSession } = useSession();

  // Sessie-modus: focus i.p.v. verbergen. Stepper: baten -> vermogens -> klaar
  const [sessieModus, setSessieModus] = useState(false);
  const [actieveSectie, setActieveSectie] = useState<"baten" | "vermogens" | "klaar">("baten");

  // ---- Sessie-timer (punt 1) ----
  // Loopt zodra sessie-modus AAN staat. We bewaren het startmoment (ms) en
  // tikken elke seconde. Opruimen bij unmount / uit-zetten.
  const [verstrekenSec, setVerstrekenSec] = useState(0);
  const startRef = useRef<number | null>(null);

  useEffect(() => {
    if (!sessieModus) {
      startRef.current = null;
      setVerstrekenSec(0);
      return;
    }
    // Start (of herstart) de timer bij aanzetten.
    startRef.current = Date.now();
    setVerstrekenSec(0);
    const id = setInterval(() => {
      if (startRef.current != null) {
        setVerstrekenSec(Math.floor((Date.now() - startRef.current) / 1000));
      }
    }, 1000);
    return () => clearInterval(id);
  }, [sessieModus]);

  if (!session) {
    return (
      <div className="p-8 text-center text-gray-400 text-sm">Sessie laden…</div>
    );
  }

  const benefits = session.benefits ?? [];
  // Punt 8: toon ALLE niet-geconsolideerde vermogens (Zakelijk/PO/VO).
  const capabilities = (session.capabilities ?? []).filter((c) => !c.consolidated);
  // Punt 4: alle niet-geconsolideerde inspanningen (read-only context).
  const efforts = (session.efforts ?? []).filter((e) => !e.consolidated);

  const batenGedimd = sessieModus && actieveSectie !== "baten";
  const vermogensGedimd = sessieModus && actieveSectie !== "vermogens";

  // Richttijd voor de actieve fase (punt 1). "Klaar" heeft geen richttijd.
  const richttijd =
    actieveSectie === "baten"
      ? RICHTTIJD_SEC.baten
      : actieveSectie === "vermogens"
        ? RICHTTIJD_SEC.vermogens
        : null;
  const resterendSec = richttijd != null ? richttijd - verstrekenSec : null;

  return (
    <div className="max-w-[1300px] mx-auto px-1 pb-24">
      {/* ---------- Kop ---------- */}
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-2xl font-bold text-cito-blue tracking-tight">
            KPI&apos;s &amp; Meetbaarheid
          </h1>
          <p className="mt-1.5 text-sm text-gray-600 max-w-2xl leading-relaxed">
            Maak de keten meetbaar: per <b>baat</b> en per <b>vermogen</b> een
            indicator met nulmeting, doelwaarde en meetmoment. Geen verzonnen
            cijfers — leeg blijft leeg tot jij of de AI iets onderbouwt.
          </p>
        </div>
        <button
          onClick={() => {
            setSessieModus((v) => !v);
            if (!sessieModus) setActieveSectie("baten");
          }}
          className={`shrink-0 text-sm font-semibold px-4 py-2 rounded-lg border transition-colors ${
            sessieModus
              ? "bg-cito-blue text-white border-cito-blue"
              : "bg-white text-gray-700 border-gray-300 hover:border-cito-blue/40"
          }`}
        >
          {sessieModus ? "■ Sessie-modus aan" : "▶ Sessie-modus"}
        </button>
      </div>

      {/* ---------- Scope-notitie ---------- */}
      <div className="mt-4 flex flex-wrap gap-2">
        <span className="text-[11px] font-semibold rounded-full px-3 py-1 bg-emerald-50 text-emerald-700 border border-emerald-200">
          Nu: KPI&apos;s op baten + vermogens
        </span>
        <span className="text-[11px] font-semibold rounded-full px-3 py-1 bg-gray-100 text-gray-500 border border-gray-200">
          Inspanningen later — via adoptie-framework (3sides)
        </span>
      </div>

      {/* ---------- Niveau-band ---------- */}
      <div className="mt-4 flex items-center gap-1 bg-white border border-gray-200 rounded-xl px-4 py-3 shadow-sm">
        <BandLevel kleur="#003366" naam="Doel" meta="impact · lang" />
        <BandPijl />
        <BandLevel kleur="#0066cc" naam="Baten" meta={`${benefits.length} totaal`} />
        <BandPijl />
        <BandLevel kleur="#0891b2" naam="Vermogens" meta={`${capabilities.length} totaal`} />
        <BandPijl />
        <BandLevel kleur="#059669" naam="Inspanningen" meta="later · 3sides" gedimd />
      </div>

      {/* ---------- Sessie-stepper ---------- */}
      {sessieModus && (
        <div className="mt-4 flex items-center gap-3 flex-wrap bg-cito-blue/5 border border-cito-blue/15 rounded-xl px-4 py-3">
          <span className="text-[11px] font-semibold uppercase tracking-wider text-cito-blue/70">
            Sessie
          </span>
          <SessieStap
            actief={actieveSectie === "baten"}
            gereed={actieveSectie === "vermogens" || actieveSectie === "klaar"}
            label="1 · Baten"
            tijd="± 25 min"
            onClick={() => setActieveSectie("baten")}
          />
          <span className="text-gray-300">→</span>
          <SessieStap
            actief={actieveSectie === "vermogens"}
            gereed={actieveSectie === "klaar"}
            label="2 · Vermogens"
            tijd="± 20 min"
            onClick={() => setActieveSectie("vermogens")}
          />
          <span className="text-gray-300">→</span>
          <SessieStap
            actief={actieveSectie === "klaar"}
            gereed={false}
            label="Klaar"
            onClick={() => setActieveSectie("klaar")}
          />
          {/* Lopende timer (punt 1): verstreken + resterend t.o.v. richttijd */}
          <div className="ml-auto flex items-center gap-2">
            {actieveSectie !== "klaar" && richttijd != null && (
              <SessieTimer
                verstrekenSec={verstrekenSec}
                resterendSec={resterendSec ?? 0}
                richttijdSec={richttijd}
              />
            )}
            {actieveSectie !== "baten" && (
              <button
                onClick={() =>
                  setActieveSectie(actieveSectie === "klaar" ? "vermogens" : "baten")
                }
                className="text-xs px-3 py-1.5 rounded-lg border border-gray-300 bg-white text-gray-600 hover:border-cito-blue/40 font-medium"
              >
                ← Vorige
              </button>
            )}
            {actieveSectie !== "klaar" && (
              <button
                onClick={() =>
                  setActieveSectie(actieveSectie === "baten" ? "vermogens" : "klaar")
                }
                className="text-xs px-3 py-1.5 rounded-lg bg-cito-blue text-white hover:bg-cito-blue-dark font-medium"
              >
                Volgende →
              </button>
            )}
          </div>
        </div>
      )}

      {/* ================= BATEN ================= */}
      <section
        className={`mt-8 transition-opacity duration-200 ${
          batenGedimd ? "opacity-40 pointer-events-none select-none" : "opacity-100"
        }`}
      >
        <SectieKop
          kleur="#0066cc"
          nummer={1}
          titel="Baten — meetbaar maken"
          subtitel="Per baat: indicator, nulmeting, doelwaarde, horizon en meetmoment. Omschrijving komt uit het netwerk."
          telling={benefits.length}
        />
        {benefits.length === 0 ? (
          <LegeMelding tekst="Nog geen baten in deze sessie. Voeg ze toe in de DIN-mapping." />
        ) : (
          <div className="mt-4 space-y-4">
            {benefits.map((b) => (
              <BaatKpiKaart key={b.id} benefit={b} updateSession={updateSession} />
            ))}
          </div>
        )}
      </section>

      {/* ================= VERMOGENS ================= */}
      <section
        className={`mt-10 transition-opacity duration-200 ${
          vermogensGedimd ? "opacity-40 pointer-events-none select-none" : "opacity-100"
        }`}
      >
        <SectieKop
          kleur="#0891b2"
          nummer={2}
          titel="Vermogens — meetbaar maken"
          subtitel="Per vermogen: maturity (as-is → to-be) plus de meetvariabelen. Maturity schuift op per herijking als de KPI gehaald is."
          telling={capabilities.length}
        />
        {capabilities.length === 0 ? (
          <LegeMelding tekst="Nog geen vermogens in deze sessie. Voeg ze toe in de DIN-mapping." />
        ) : (
          <div className="mt-4 space-y-4">
            {capabilities.map((c) => (
              <VermogenKpiKaart key={c.id} capability={c} updateSession={updateSession} />
            ))}
          </div>
        )}
      </section>

      {/* ================= 3SIDES-TRACKER (punt 6) ================= */}
      <ThreesidesTracker efforts={efforts} />

      {/* ================= INSPANNINGEN-MAP (punt 4) ================= */}
      <InspanningenMap
        efforts={efforts}
        benefits={benefits}
        capabilities={capabilities}
      />

      {/* ---------- Voet ---------- */}
      <div className="mt-12 text-center text-xs text-gray-400">
        Baten meetbaar via batenprofiel · vermogens via maturity (as-is → to-be) ·
        inspanningen later via het adoptie-framework (3sides).
      </div>
    </div>
  );
}

// ============================================================
// Sessie-timer (punt 1)
// ============================================================

function SessieTimer({
  verstrekenSec,
  resterendSec,
  richttijdSec,
}: {
  verstrekenSec: number;
  resterendSec: number;
  richttijdSec: number;
}) {
  const over = resterendSec < 0;
  return (
    <div
      className={`flex items-center gap-2 text-xs font-semibold px-3 py-1.5 rounded-lg border tabular-nums ${
        over
          ? "bg-red-50 text-red-700 border-red-200"
          : "bg-white text-cito-blue border-cito-blue/20"
      }`}
      title={`Richttijd voor deze fase: ${formatMMSS(richttijdSec)}`}
    >
      <span aria-hidden>⏱</span>
      <span>{formatMMSS(verstrekenSec)}</span>
      <span className="text-gray-300">/</span>
      <span className="font-normal opacity-80">
        {over ? `+${formatMMSS(-resterendSec)} over` : `${formatMMSS(resterendSec)} resterend`}
      </span>
    </div>
  );
}

// ============================================================
// BATEN — kaart
// ============================================================

function BaatKpiKaart({
  benefit,
  updateSession,
}: {
  benefit: DINBenefit;
  updateSession: ReturnType<typeof useSession>["updateSession"];
}) {
  // Undo (punt 2): bewaar het volledige profiel vóór een AI-toepassing.
  const [vorigProfiel, setVorigProfiel] = useState<DINBenefit["profiel"] | null>(null);

  // Schrijf één baten-profielveld weg zonder de rest van de array te raken.
  function patchProfiel(patch: Partial<DINBenefit["profiel"]>) {
    updateSession((prev) => ({
      benefits: prev.benefits.map((b) =>
        b.id === benefit.id ? { ...b, profiel: { ...b.profiel, ...patch } } : b
      ),
    }));
  }

  // Herstel het hele profiel naar de bewaarde staat (via updateSession — punt 7).
  function herstelProfiel(snapshot: DINBenefit["profiel"]) {
    updateSession((prev) => ({
      benefits: prev.benefits.map((b) =>
        b.id === benefit.id ? { ...b, profiel: { ...snapshot } } : b
      ),
    }));
  }

  const status = benefit.profiel.kpiStatus ?? "concept";

  return (
    <div className="border border-blue-200 rounded-xl bg-white shadow-sm overflow-hidden">
      {/* Kop: omschrijving uit het netwerk */}
      <div className="px-4 py-3 border-b border-gray-100 bg-gradient-to-b from-white to-blue-50/40">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <div className="text-[10px] font-bold uppercase tracking-wider text-[#0066cc]">
              Baat
            </div>
            <div className="text-sm font-semibold text-gray-800 mt-0.5 leading-snug">
              {benefit.title || benefit.description}
            </div>
          </div>
          <KpiStatusToggle
            status={status}
            onToggle={() =>
              patchProfiel({ kpiStatus: status === "concept" ? "afgestemd" : "concept" })
            }
          />
        </div>
        {benefit.title && (
          <p className="mt-2 text-xs text-gray-500 italic leading-relaxed">
            <span className="not-italic font-semibold text-[#0066cc]">Omschrijving — </span>
            {benefit.description}
          </p>
        )}
        <p className="mt-1 text-[10px] text-gray-400">Omschrijving uit het DIN-netwerk</p>
      </div>

      {/* Meetvelden */}
      <div className="px-4 py-4 grid grid-cols-1 sm:grid-cols-2 gap-3">
        <KpiVeld
          label="Indicator (meetbare KPI)"
          waarde={benefit.profiel.indicator}
          placeholder="Welke KPI meet deze baat?"
          kolommen="full"
          onSave={(v) => patchProfiel({ indicator: v })}
        />
        <KpiVeld
          label="Nulmeting (startwaarde)"
          waarde={benefit.profiel.currentValue}
          placeholder="Bijv. 'Nulmeting bij start' — geen verzonnen getal"
          hint={NULMETING_HINT}
          onSave={(v) => patchProfiel({ currentValue: v })}
        />
        <KpiVeld
          label="Doelwaarde"
          waarde={benefit.profiel.targetValue}
          placeholder="Gewenste waarde"
          onSave={(v) => patchProfiel({ targetValue: v })}
        />
        <KpiVeld
          label="Horizon"
          waarde={benefit.profiel.horizon}
          placeholder="Bijv. 2030 — gefaseerd"
          onSave={(v) => patchProfiel({ horizon: v })}
        />
        <KpiVeld
          label="Meetmoment"
          waarde={benefit.profiel.measurementMoment}
          placeholder="Bijv. ½-jaarlijks, jaarlijks"
          onSave={(v) => patchProfiel({ measurementMoment: v })}
        />
        <KpiVeld
          label="Meetmethode (hoe meten)"
          waarde={benefit.profiel.meetmethode}
          placeholder="Bijv. NPS-enquête, CRM-analyse"
          kolommen="full"
          onSave={(v) => patchProfiel({ meetmethode: v })}
        />
        <KpiVeld
          label="Bateneigenaar (eindverantwoordelijk)"
          waarde={benefit.profiel.bateneigenaar}
          placeholder="Bijv. Sectormanager PO"
          onSave={(v) => patchProfiel({ bateneigenaar: v })}
        />
        <KpiVeld
          label="Meetverantwoordelijke"
          waarde={benefit.profiel.indicatorOwner}
          placeholder="Wie voert de meting uit?"
          onSave={(v) => patchProfiel({ indicatorOwner: v })}
        />
      </div>

      {/* AI-paneel — map AI-velden naar het batenprofiel (eigenaar → bateneigenaar) */}
      <AiKpiPaneel
        level="baat"
        item={benefit}
        onApply={(patch) => {
          // Snapshot vóór toepassen, zodat undo altijd kan (punt 2).
          setVorigProfiel({ ...benefit.profiel });
          const { eigenaar, toelichting, ...rest } = patch;
          void toelichting;
          patchProfiel({
            ...rest,
            ...(eigenaar !== undefined ? { bateneigenaar: eigenaar } : {}),
          });
        }}
        kanHerstellen={vorigProfiel !== null}
        onUndo={() => {
          if (vorigProfiel) {
            herstelProfiel(vorigProfiel);
            setVorigProfiel(null);
          }
        }}
      />
    </div>
  );
}

// ============================================================
// VERMOGENS — kaart
// ============================================================

function VermogenKpiKaart({
  capability,
  updateSession,
}: {
  capability: DINCapability;
  updateSession: ReturnType<typeof useSession>["updateSession"];
}) {
  // Undo (punt 2): bewaar het volledige profiel vóór een AI-toepassing.
  const [vorigProfiel, setVorigProfiel] = useState<VermogensProfiel | null>(null);

  // Schrijf één meetvariabele van het vermogensprofiel weg.
  // Als profiel undefined is, maken we een nieuw object dat de verplichte
  // schema-velden behoudt (eigenaar / huidieSituatie / gewensteSituatie).
  function patchProfiel(patch: Partial<VermogensProfiel>) {
    updateSession((prev) => ({
      capabilities: prev.capabilities.map((c) => {
        if (c.id !== capability.id) return c;
        const basis = c.profiel ?? leegVermogensProfiel(c);
        return { ...c, profiel: { ...basis, ...patch } };
      }),
    }));
  }

  // Herstel het hele profiel naar de bewaarde staat (via updateSession — punt 7).
  function herstelProfiel(snapshot: VermogensProfiel) {
    updateSession((prev) => ({
      capabilities: prev.capabilities.map((c) =>
        c.id === capability.id ? { ...c, profiel: { ...snapshot } } : c
      ),
    }));
  }

  // Maturity opslaan, geclampt op 1–5.
  function setLevel(veld: "currentLevel" | "targetLevel", value: number) {
    const clamped = Math.max(1, Math.min(5, value));
    updateSession((prev) => ({
      capabilities: prev.capabilities.map((c) =>
        c.id === capability.id ? { ...c, [veld]: clamped } : c
      ),
    }));
  }

  const status = capability.profiel?.kpiStatus ?? "concept";

  return (
    <div className="border rounded-xl bg-white shadow-sm overflow-hidden" style={{ borderColor: "#cdeef4" }}>
      {/* Kop */}
      <div className="px-4 py-3 border-b border-gray-100 bg-gradient-to-b from-white to-cyan-50/40">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <div className="text-[10px] font-bold uppercase tracking-wider text-[#0891b2]">
              Vermogen
            </div>
            <div className="text-sm font-semibold text-gray-800 mt-0.5 leading-snug">
              {capability.title || capability.description}
            </div>
          </div>
          <KpiStatusToggle
            status={status}
            onToggle={() =>
              patchProfiel({ kpiStatus: status === "concept" ? "afgestemd" : "concept" })
            }
          />
        </div>
        {capability.title && (
          <p className="mt-2 text-xs text-gray-500 leading-relaxed">{capability.description}</p>
        )}
      </div>

      {/* Maturity-ladder */}
      <div className="px-4 py-3 bg-cyan-50/30 border-b border-gray-100 flex flex-wrap items-center gap-6">
        <MaturityStepper
          label="As-is (huidig)"
          value={capability.currentLevel}
          onChange={(v) => setLevel("currentLevel", v)}
        />
        <span className="text-[#0891b2] font-bold text-lg">→</span>
        <MaturityStepper
          label="To-be (gewenst)"
          value={capability.targetLevel}
          onChange={(v) => setLevel("targetLevel", v)}
          accent
        />
        <p className="text-[10px] text-gray-400 max-w-[220px] leading-tight">
          Maturity 1–5. Schuift op per herijking (6–9 mnd / jaarlijks) zodra de KPI gehaald is.
        </p>
      </div>

      {/* Meetvelden */}
      <div className="px-4 py-4 grid grid-cols-1 sm:grid-cols-2 gap-3">
        <KpiVeld
          label="Indicator (meetbare KPI)"
          waarde={capability.profiel?.indicator}
          placeholder="Waaraan zie je dat het vermogen groeit?"
          kolommen="full"
          onSave={(v) => patchProfiel({ indicator: v })}
        />
        <KpiVeld
          label="Nulmeting (startwaarde)"
          waarde={capability.profiel?.currentValue}
          placeholder="Bijv. 'Nulmeting bij start' — geen verzonnen getal"
          hint={NULMETING_HINT}
          onSave={(v) => patchProfiel({ currentValue: v })}
        />
        <KpiVeld
          label="Doelwaarde"
          waarde={capability.profiel?.targetValue}
          placeholder="Gewenste waarde"
          onSave={(v) => patchProfiel({ targetValue: v })}
        />
        <KpiVeld
          label="Meetmethode (hoe meten)"
          waarde={capability.profiel?.meetmethode}
          placeholder="Bijv. maturity-assessment, audit"
          onSave={(v) => patchProfiel({ meetmethode: v })}
        />
        <KpiVeld
          label="Meetmoment"
          waarde={capability.profiel?.measurementMoment}
          placeholder="Bijv. per herijking, jaarlijks"
          onSave={(v) => patchProfiel({ measurementMoment: v })}
        />
        <KpiVeld
          label="Eigenaar"
          waarde={capability.profiel?.eigenaar}
          placeholder="Wie is verantwoordelijk voor dit vermogen?"
          kolommen="full"
          onSave={(v) => patchProfiel({ eigenaar: v })}
        />
      </div>

      {/* AI-paneel — map AI-velden naar het vermogensprofiel (drop bateneigenaar/horizon) */}
      <AiKpiPaneel
        level="vermogen"
        item={capability}
        onApply={(patch) => {
          // Snapshot vóór toepassen, zodat undo altijd kan (punt 2).
          setVorigProfiel(capability.profiel ? { ...capability.profiel } : leegVermogensProfiel(capability));
          const { bateneigenaar, toelichting, ...rest } = patch;
          void bateneigenaar;
          void toelichting;
          patchProfiel(rest);
        }}
        kanHerstellen={vorigProfiel !== null}
        onUndo={() => {
          if (vorigProfiel) {
            herstelProfiel(vorigProfiel);
            setVorigProfiel(null);
          }
        }}
      />
    </div>
  );
}

// ============================================================
// AI-paneel (per item) — POST /api/kpi-suggest
// ============================================================

function AiKpiPaneel({
  level,
  item,
  onApply,
  kanHerstellen,
  onUndo,
}: {
  level: "baat" | "vermogen";
  item: DINBenefit | DINCapability;
  onApply: (patch: KpiPatch) => void;
  // Undo (punt 2): paneel toont een "Ongedaan maken"-knop zodra er iets toegepast is.
  kanHerstellen: boolean;
  onUndo: () => void;
}) {
  const [open, setOpen] = useState(false);
  const [fase, setFase] = useState<AiFase>("idle");
  const [loading, setLoading] = useState(false);
  const [fout, setFout] = useState<string | null>(null);
  const [retryable, setRetryable] = useState(false);

  const [vragen, setVragen] = useState<KpiVraag[]>([]);
  const [antwoorden, setAntwoorden] = useState<Record<string, string>>({});
  const [voorstel, setVoorstel] = useState<KpiVoorstel | null>(null);
  const [correctie, setCorrectie] = useState("");
  // "✓ opgeslagen"-bevestiging na toepassen (punt 3). Transient.
  const [opgeslagen, setOpgeslagen] = useState(false);

  // Veld-selectie: lege set = alle velden (zoals BenefitCard's "Alles").
  const [selectedVelden, setSelectedVelden] = useState<Set<KpiVeldKey>>(new Set());

  function toggleVeld(veld: KpiVeldKey) {
    setSelectedVelden((prev) => {
      const next = new Set(prev);
      if (next.has(veld)) next.delete(veld);
      else next.add(veld);
      return next;
    });
  }

  // De geselecteerde velden als array; leeg = alles (geen filter/instructie).
  const geselecteerdeVelden = Array.from(selectedVelden);
  // Helper: moet een veld getoond/toegepast worden? Lege selectie = alles tonen.
  function veldActief(veld: KpiVeldKey): boolean {
    return selectedVelden.size === 0 || selectedVelden.has(veld);
  }

  // Markeer "✓ opgeslagen" — toepassen IS opslaan (punt 3). Transient bevestiging.
  function bevestigOpslag() {
    setOpgeslagen(true);
    window.setTimeout(() => setOpgeslagen(false), 2500);
  }

  // Pas één veld toe; map 'eigenaar' naar het juiste profielveld per niveau.
  function pasVeldToe(veld: KpiVeldKey, v: KpiVoorstel) {
    if (veld === "eigenaar") {
      onApply(level === "baat" ? { bateneigenaar: v.eigenaar } : { eigenaar: v.eigenaar });
    } else {
      onApply({ [veld]: v[veld] } as KpiPatch);
    }
    bevestigOpslag();
  }

  // "Alles toepassen" respecteert de veld-selectie: alleen actieve velden.
  function pasGeselecteerdeToe(v: KpiVoorstel) {
    KPI_VELD_KNOPPEN.forEach(({ key }) => {
      if (veldActief(key)) {
        // Direct toepassen zonder per-veld bevestiging te spammen.
        if (key === "eigenaar") {
          onApply(level === "baat" ? { bateneigenaar: v.eigenaar } : { eigenaar: v.eigenaar });
        } else {
          onApply({ [key]: v[key] } as KpiPatch);
        }
      }
    });
    bevestigOpslag();
  }

  async function callApi(body: Record<string, unknown>) {
    setLoading(true);
    setFout(null);
    setRetryable(false);
    try {
      const res = await fetch("/api/kpi-suggest", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const data = await res.json();
      // Ondersteun zowel { success, data } als een platte payload.
      if (!res.ok || data?.success === false) {
        setRetryable(Boolean(data?.retryable));
        setFout(data?.error || "AI-verzoek mislukt. Probeer het opnieuw.");
        return null;
      }
      return data?.data ?? data;
    } catch (e) {
      console.error("[kpi-suggest]", e);
      setRetryable(true);
      setFout("Verbinding mislukt. Probeer het opnieuw.");
      return null;
    } finally {
      setLoading(false);
    }
  }

  async function startVragen() {
    setOpen(true);
    const result = await callApi({ mode: "vragen", level, item });
    if (!result) return;
    const vs: KpiVraag[] = (result.vragen ?? result.questions ?? []).map(
      (v: unknown, i: number): KpiVraag => {
        if (typeof v === "string") return { key: `q${i}`, vraag: v };
        const obj = v as Record<string, unknown>;
        return {
          key: (obj.key as string) || `q${i}`,
          vraag: (obj.vraag as string) || (obj.label as string) || "",
          placeholder: obj.placeholder as string | undefined,
        };
      }
    );
    setVragen(vs);
    setFase("vragen");
  }

  async function vraagVoorstel() {
    const result = await callApi({
      mode: "voorstel",
      level,
      item,
      answers: antwoorden,
      velden: geselecteerdeVelden,
    });
    if (!result) return;
    setVoorstel(result.voorstel ?? result.suggestion ?? result);
    setFase("voorstel");
  }

  async function vraagCorrectie() {
    if (!correctie.trim()) return;
    const result = await callApi({
      mode: "correctie",
      level,
      item,
      answers: antwoorden,
      userCorrection: correctie,
      velden: geselecteerdeVelden,
    });
    if (!result) return;
    setVoorstel(result.voorstel ?? result.suggestion ?? result);
    setCorrectie("");
    setFase("voorstel");
  }

  function reset() {
    setOpen(false);
    setFase("idle");
    setVragen([]);
    setAntwoorden({});
    setVoorstel(null);
    setCorrectie("");
    setFout(null);
    setRetryable(false);
    setSelectedVelden(new Set());
    setOpgeslagen(false);
  }

  const huidig = item.profiel as Partial<KpiVoorstel> | undefined;

  // Stapnummer voor de genummerde flow-indicator (punt 3).
  const stapNr = fase === "voorstel" ? 3 : fase === "vragen" ? 2 : 1;

  return (
    <div className="px-4 py-3 border-t border-gray-100 bg-violet-50/30">
      {!open ? (
        <div className="flex items-center gap-2 flex-wrap">
          <button
            onClick={startVragen}
            disabled={loading}
            className="text-xs font-bold px-3 py-1.5 rounded-lg border border-violet-300 bg-gradient-to-b from-violet-50 to-violet-100 text-violet-700 hover:from-violet-100 hover:to-violet-200 transition-colors disabled:opacity-50"
          >
            {loading ? "Bezig…" : "✨ AI — help meetbaar maken"}
          </button>
          {/* Undo blijft beschikbaar ook nadat het paneel gesloten is (punt 2). */}
          {kanHerstellen && (
            <button
              onClick={onUndo}
              className="text-xs font-semibold px-3 py-1.5 rounded-lg bg-amber-100 text-amber-700 hover:bg-amber-200 transition-colors"
              title="Laatste AI-toepassing ongedaan maken"
            >
              ↩ Ongedaan maken
            </button>
          )}
          {opgeslagen && (
            <span className="text-xs font-semibold text-emerald-600 inline-flex items-center gap-1">
              ✓ opgeslagen
            </span>
          )}
          <span className="text-[10px] text-violet-500 italic">
            AI-voorstel ter inspiratie — jij beslist.
          </span>
        </div>
      ) : (
        <div className="space-y-3">
          {/* Genummerde flow-indicator (punt 3) — maakt duidelijk welke knop volgt */}
          <div className="flex items-center justify-between gap-2 flex-wrap">
            <div className="flex items-center gap-1.5 text-[10px] font-semibold">
              <FlowStap nr={1} label="Vragen" actief={stapNr === 1} gereed={stapNr > 1} />
              <span className="text-gray-300">›</span>
              <FlowStap nr={2} label="Aanscherpen" actief={stapNr === 2} gereed={stapNr > 2} />
              <span className="text-gray-300">›</span>
              <FlowStap nr={3} label="Toepassen = opslaan" actief={stapNr === 3} gereed={false} />
            </div>
            <div className="flex items-center gap-2">
              {kanHerstellen && (
                <button
                  onClick={onUndo}
                  className="text-xs font-semibold px-2.5 py-1 rounded-md bg-amber-100 text-amber-700 hover:bg-amber-200 transition-colors"
                  title="Laatste AI-toepassing ongedaan maken"
                >
                  ↩ Ongedaan maken
                </button>
              )}
              <button
                onClick={reset}
                className="text-xs text-gray-400 hover:text-gray-600"
              >
                ✕ Sluiten
              </button>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <span className="text-xs font-semibold text-violet-700">
              ✨ AI-voorstel meetbaarheid
            </span>
            <span className="text-[10px] text-violet-500 italic">
              ter inspiratie — jij beslist wat je toepast
            </span>
          </div>

          {/* Fout + retry */}
          {fout && (
            <div className="p-2 bg-red-50 border border-red-200 rounded-lg text-xs text-red-600">
              {fout}
              {retryable && (
                <button
                  onClick={fase === "vragen" || fase === "idle" ? startVragen : vraagVoorstel}
                  className="ml-2 underline font-medium"
                >
                  Opnieuw proberen
                </button>
              )}
            </div>
          )}

          {/* Fase: vragen — AI stelt EERST deze zetvragen, daarna kiest de
              gebruiker WELKE velden aangescherpt worden (zoals BenefitCard). */}
          {fase === "vragen" && (
            <div className="space-y-3">
              {/* Zetvragen */}
              <div className="space-y-2.5 p-2.5 bg-white/60 border border-violet-100 rounded-lg">
                <div className="text-[10px] text-violet-600 font-medium uppercase tracking-wider">
                  De AI stelt eerst deze vragen — beantwoord wat je kunt (optioneel)
                </div>
                {vragen.length === 0 && (
                  <p className="text-xs text-gray-500 italic">
                    Geen aanvullende vragen — vraag direct een voorstel aan.
                  </p>
                )}
                {vragen.map((v) => (
                  <div key={v.key}>
                    <label className="text-[11px] font-medium text-gray-700 block mb-0.5">
                      {v.vraag}
                    </label>
                    <input
                      value={antwoorden[v.key ?? ""] || ""}
                      onChange={(e) =>
                        setAntwoorden((prev) => ({ ...prev, [v.key ?? ""]: e.target.value }))
                      }
                      placeholder={v.placeholder || "Optioneel antwoord…"}
                      className="w-full text-xs px-2.5 py-1.5 border border-gray-200 rounded-md bg-white focus:outline-none focus:ring-1 focus:ring-violet-300"
                    />
                  </div>
                ))}
              </div>

              {/* Veld-selectie — kies welke velden de AI aanscherpt */}
              <div>
                <div className="text-[10px] text-gray-500 mb-1">
                  Welke velden mag de AI aanscherpen?&nbsp;
                  <span className="text-gray-400">(niets kiezen = alles)</span>
                </div>
                <div className="flex flex-wrap gap-1.5">
                  <button
                    onClick={() => setSelectedVelden(new Set())}
                    className={`text-[11px] px-2.5 py-1 rounded-full font-medium transition-colors ${
                      selectedVelden.size === 0
                        ? "bg-violet-600 text-white"
                        : "bg-white border border-gray-200 text-gray-600 hover:border-violet-300"
                    }`}
                  >
                    Alles
                  </button>
                  {KPI_VELD_KNOPPEN.map((veld) => (
                    <button
                      key={veld.key}
                      onClick={() => toggleVeld(veld.key)}
                      className={`text-[11px] px-2.5 py-1 rounded-full font-medium transition-colors ${
                        selectedVelden.has(veld.key)
                          ? "bg-violet-600 text-white"
                          : "bg-white border border-gray-200 text-gray-600 hover:border-violet-300"
                      }`}
                    >
                      {veld.label}
                    </button>
                  ))}
                </div>
              </div>

              <button
                onClick={vraagVoorstel}
                disabled={loading}
                className="text-xs font-semibold px-3 py-1.5 bg-violet-600 text-white rounded-lg hover:bg-violet-700 transition-colors disabled:opacity-50"
              >
                {loading ? "Bezig…" : "2 · Aanscherpen →"}
              </button>
            </div>
          )}

          {/* Fase: voorstel */}
          {fase === "voorstel" && voorstel && (
            <div className="space-y-3">
              {voorstel.toelichting && (
                <div className="p-2 bg-amber-50 border border-amber-200 rounded text-xs text-amber-800">
                  <span className="font-semibold">Toelichting: </span>
                  {voorstel.toelichting}
                </div>
              )}

              <div className="flex items-center justify-between gap-2">
                <span className="text-xs font-semibold text-violet-700">
                  Voorstel
                  {selectedVelden.size > 0 && (
                    <span className="ml-1.5 font-normal text-gray-500">
                      · gefocust op {geselecteerdeVelden.length} veld
                      {geselecteerdeVelden.length > 1 ? "en" : ""}
                    </span>
                  )}
                </span>
                <div className="flex items-center gap-2 shrink-0">
                  {opgeslagen && (
                    <span className="text-xs font-semibold text-emerald-600 inline-flex items-center gap-1">
                      ✓ opgeslagen
                    </span>
                  )}
                  <button
                    onClick={() => pasGeselecteerdeToe(voorstel)}
                    className="text-xs font-semibold px-3 py-1 bg-violet-600 text-white rounded-md hover:bg-violet-700 transition-colors"
                    title="Toepassen slaat direct op in de sessie"
                  >
                    3 · {selectedVelden.size > 0 ? "Selectie toepassen" : "Alles toepassen"} = opslaan
                  </button>
                </div>
              </div>

              {/* Na opslaan: expliciet door naar de volgende kaart (punt 3) */}
              {opgeslagen && (
                <div className="flex items-center justify-between gap-2 p-2 bg-emerald-50 border border-emerald-200 rounded-lg">
                  <span className="text-xs text-emerald-700">
                    Opgeslagen in de sessie. Je kunt door naar de volgende.
                  </span>
                  <button
                    onClick={reset}
                    className="text-xs font-semibold px-3 py-1 bg-emerald-600 text-white rounded-md hover:bg-emerald-700 transition-colors"
                  >
                    Sluiten / volgende →
                  </button>
                </div>
              )}

              <div className="space-y-1.5">
                {veldActief("indicator") && (
                  <VoorstelRij
                    label="Indicator"
                    huidig={huidig?.indicator}
                    voorgesteld={voorstel.indicator}
                    onApply={() => pasVeldToe("indicator", voorstel)}
                  />
                )}
                {veldActief("meetmethode") && (
                  <VoorstelRij
                    label="Meetmethode"
                    huidig={huidig?.meetmethode}
                    voorgesteld={voorstel.meetmethode}
                    onApply={() => pasVeldToe("meetmethode", voorstel)}
                  />
                )}
                {veldActief("currentValue") && (
                  <VoorstelRij
                    label="Nulmeting"
                    huidig={huidig?.currentValue}
                    voorgesteld={voorstel.currentValue}
                    onApply={() => pasVeldToe("currentValue", voorstel)}
                  />
                )}
                {veldActief("targetValue") && (
                  <VoorstelRij
                    label="Doelwaarde"
                    huidig={huidig?.targetValue}
                    voorgesteld={voorstel.targetValue}
                    onApply={() => pasVeldToe("targetValue", voorstel)}
                  />
                )}
                {veldActief("measurementMoment") && (
                  <VoorstelRij
                    label="Meetmoment"
                    huidig={huidig?.measurementMoment}
                    voorgesteld={voorstel.measurementMoment}
                    onApply={() => pasVeldToe("measurementMoment", voorstel)}
                  />
                )}
                {veldActief("eigenaar") && (
                  <VoorstelRij
                    label="Eigenaar"
                    huidig={
                      level === "baat"
                        ? (huidig as Partial<DINBenefit["profiel"]>)?.bateneigenaar
                        : (huidig as Partial<VermogensProfiel>)?.eigenaar
                    }
                    voorgesteld={voorstel.eigenaar}
                    onApply={() => pasVeldToe("eigenaar", voorstel)}
                  />
                )}
              </div>

              {/* Correctie */}
              <div className="pt-2 border-t border-violet-100">
                <label className="text-[11px] font-medium text-gray-600 block mb-1">
                  Klopt iets niet? Vertel waarom — AI past het voorstel aan.
                </label>
                <div className="flex gap-2">
                  <input
                    value={correctie}
                    onChange={(e) => setCorrectie(e.target.value)}
                    onKeyDown={(e) => e.key === "Enter" && vraagCorrectie()}
                    placeholder="Dit klopt niet omdat…"
                    className="flex-1 text-xs px-2.5 py-1.5 border border-gray-200 rounded-md bg-white focus:outline-none focus:ring-1 focus:ring-violet-300"
                  />
                  <button
                    onClick={vraagCorrectie}
                    disabled={loading || !correctie.trim()}
                    className="text-xs font-semibold px-3 py-1.5 border border-violet-300 text-violet-700 rounded-md hover:bg-violet-50 transition-colors disabled:opacity-50 shrink-0"
                  >
                    Herzie
                  </button>
                </div>
              </div>
            </div>
          )}

          <p className="text-[10px] text-gray-400 italic">
            AI-voorstel ter inspiratie — geen verzonnen nulcijfers; jij beslist wat je toepast.
            Toepassen slaat direct op.
          </p>
        </div>
      )}
    </div>
  );
}

// Kleine stap-indicator voor de genummerde AI-flow (punt 3).
function FlowStap({
  nr,
  label,
  actief,
  gereed,
}: {
  nr: number;
  label: string;
  actief: boolean;
  gereed: boolean;
}) {
  return (
    <span
      className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full border ${
        actief
          ? "bg-violet-600 text-white border-violet-600"
          : gereed
            ? "bg-emerald-50 text-emerald-700 border-emerald-200"
            : "bg-white text-gray-400 border-gray-200"
      }`}
    >
      <span className="font-bold">{gereed && !actief ? "✓" : nr}</span>
      <span>{label}</span>
    </span>
  );
}

// ============================================================
// 3SIDES-TRACKER (punt 6) — gesourcede 2026-deliverables per domein
// ============================================================

function ThreesidesTracker({ efforts }: { efforts: DINEffort[] }) {
  return (
    <section className="mt-12">
      <SectieKop
        kleur="#6d28d9"
        nummer={3}
        titel="3sides — adoptie-framework & tracker"
        subtitel="3sides bouwt & trackt alle 4 domeinen in 2026. De 3sides-KPI is de oplevering (klaar j/n), niet het klant-effect."
        telling={THREESIDES_DOMEINEN.reduce((n, d) => n + d.deliverables.length, 0)}
      />

      {/* Tracker-balk */}
      <div className="mt-4 flex items-start gap-3 rounded-xl border px-4 py-3"
        style={{ background: "#f6f1fe", borderColor: "#e4d8fb" }}
      >
        <span
          className="w-6 h-6 rounded-md grid place-items-center text-white text-[11px] font-extrabold shrink-0"
          style={{ background: "#6d28d9" }}
        >
          3s
        </span>
        <p className="text-xs leading-relaxed" style={{ color: "#4c1d95" }}>
          <b style={{ color: "#6d28d9" }}>3sides · bouwt &amp; trackt</b> alle 4 domeinen in
          2026 — <b style={{ color: "#6d28d9" }}>3sides-KPI = oplevering (klaar j/n)</b>.
          <span className="ml-1 font-semibold">{THREESIDES_MIJLPAAL}.</span>
        </p>
      </div>

      {/* Definitie-regel */}
      <p className="mt-2 text-[11px] text-amber-700 bg-amber-50 border border-amber-200 rounded-lg px-3 py-2 leading-relaxed">
        <b>3sides-KPI = deliverable opgeleverd</b> — niet het klant-effect (dat is Cito&apos;s
        baat).
      </p>

      {/* Deliverables per domein */}
      <div className="mt-4 grid grid-cols-1 md:grid-cols-2 gap-3">
        {THREESIDES_DOMEINEN.map((d) => (
          <ThreesidesDomeinKaart key={d.domein} data={d} efforts={efforts} />
        ))}
      </div>
    </section>
  );
}

function ThreesidesDomeinKaart({
  data,
  efforts,
}: {
  data: ThreesidesDomeinData;
  efforts: DINEffort[];
}) {
  const kleur = DOMAIN_COLORS[data.domein].bar;
  // Koppel deliverables aan de inspanning(en) van dit domein (punt 6).
  const domeinEfforts = efforts.filter((e) => e.domain === data.domein);

  return (
    <div
      className="rounded-xl border bg-white shadow-sm overflow-hidden"
      style={{ borderColor: "#e9edf2", borderLeft: `3px solid ${kleur}` }}
    >
      <div className="px-3.5 py-2.5 border-b border-gray-100 flex items-center gap-2 flex-wrap">
        <span
          className="text-[10px] font-bold uppercase tracking-wider text-white px-2 py-0.5 rounded"
          style={{ background: kleur }}
        >
          {DOMAIN_LABELS[data.domein]}
        </span>
        <span className="text-[11px] font-semibold text-gray-600">
          {data.fase2026} 2026
        </span>
        <span className="text-[11px] font-bold text-gray-700">· {data.budget2026}</span>
        <span
          className="ml-auto text-[9px] font-bold px-2 py-0.5 rounded-full"
          style={{ background: "#f4eefe", color: "#6d28d9", border: "1px solid #e2d4fb" }}
        >
          3sides
        </span>
      </div>

      <div className="px-3.5 py-3 space-y-1.5">
        <div className="text-[10px] font-semibold uppercase tracking-wider text-gray-400">
          2026-deliverables · klaar j/n
        </div>
        {data.deliverables.map((dlv) => (
          <div key={dlv.label} className="flex items-start gap-2 text-xs text-gray-700">
            {/* Statische/illustratieve checkbox (klaar j/n) */}
            <span
              className="mt-0.5 w-3.5 h-3.5 rounded border border-gray-300 bg-white shrink-0"
              aria-hidden
            />
            <span className="leading-snug">{dlv.label}</span>
          </div>
        ))}
        <div className="text-[9px] text-amber-700 pt-1">uit raming Plus20</div>

        {data.verdereJaren && (
          <div className="text-[10px] text-gray-400 pt-1.5 border-t border-gray-100 mt-1.5">
            Latere jaren: {data.verdereJaren}
          </div>
        )}

        {/* Gekoppelde inspanning(en) uit de map (punt 6 ↔ punt 4) */}
        {domeinEfforts.length > 0 && (
          <div className="pt-2 border-t border-gray-100 mt-1.5 space-y-1">
            <div className="text-[9px] font-semibold uppercase tracking-wider text-gray-400">
              Gekoppelde inspanning{domeinEfforts.length > 1 ? "en" : ""}
            </div>
            {domeinEfforts.map((e) => (
              <div key={e.id} className="text-[11px] text-gray-600 leading-snug">
                · {e.title || e.description}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

// ============================================================
// INSPANNINGEN-MAP (punt 4) — read-only context, per domein
// ============================================================

function InspanningenMap({
  efforts,
  benefits,
  capabilities,
}: {
  efforts: DINEffort[];
  benefits: DINBenefit[];
  capabilities: DINCapability[];
}) {
  // Resolve naar leesbare context (geen UUIDs in user-facing tekst — CLAUDE.md).
  void benefits;
  void capabilities;

  return (
    <section className="mt-12">
      <SectieKop
        kleur="#059669"
        nummer={4}
        titel="Inspanningen — overzicht (context)"
        subtitel="Read-only: alle inspanningen per domein. KPI's vul je hier niet in — die volgen later via het adoptie-framework (3sides)."
        telling={efforts.length}
      />

      <p className="mt-3 text-[11px] text-gray-500 bg-gray-50 border border-gray-200 rounded-lg px-3 py-2 leading-relaxed">
        <b>KPI&apos;s volgen later</b> — via het adoptie-framework (3sides). Hieronder alleen
        context: titel, eigenaar, inspanningsleider, planning en kostenraming.
      </p>

      {efforts.length === 0 ? (
        <LegeMelding tekst="Nog geen inspanningen in deze sessie. Voeg ze toe in de DIN-mapping." />
      ) : (
        <div className="mt-4 space-y-5">
          {DOMEIN_VOLGORDE.map((domein) => {
            const groep = efforts.filter((e) => e.domain === domein);
            if (groep.length === 0) return null;
            const kleur = DOMAIN_COLORS[domein].bar;
            return (
              <div key={domein}>
                <div className="flex items-center gap-2 mb-2">
                  <span
                    className="text-[11px] font-bold uppercase tracking-wider text-white px-2.5 py-0.5 rounded"
                    style={{ background: kleur }}
                  >
                    {DOMAIN_LABELS[domein]}
                  </span>
                  <span className="text-[11px] text-gray-400">{groep.length}</span>
                </div>
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
                  {groep.map((e) => (
                    <InspanningKaart key={e.id} effort={e} kleur={kleur} />
                  ))}
                </div>
              </div>
            );
          })}

          {/* Inspanningen zonder (herkenbaar) domein — toon onder "Overig". */}
          {(() => {
            const rest = efforts.filter(
              (e) => !DOMEIN_VOLGORDE.includes(e.domain as Exclude<EffortDomain, "overig">)
            );
            if (rest.length === 0) return null;
            const kleur = DOMAIN_COLORS.overig.bar;
            return (
              <div>
                <div className="flex items-center gap-2 mb-2">
                  <span
                    className="text-[11px] font-bold uppercase tracking-wider text-white px-2.5 py-0.5 rounded"
                    style={{ background: kleur }}
                  >
                    {DOMAIN_LABELS.overig}
                  </span>
                  <span className="text-[11px] text-gray-400">{rest.length}</span>
                </div>
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
                  {rest.map((e) => (
                    <InspanningKaart key={e.id} effort={e} kleur={kleur} />
                  ))}
                </div>
              </div>
            );
          })()}
        </div>
      )}
    </section>
  );
}

function InspanningKaart({ effort, kleur }: { effort: DINEffort; kleur: string }) {
  const d = effort.dossier;
  const eigenaar = d?.eigenaar?.trim();
  const leider = d?.inspanningsleider?.trim();
  const kosten = d?.kostenraming?.trim();
  const resultaat = d?.verwachtResultaat?.trim();

  return (
    <div
      className="rounded-xl border bg-white shadow-sm overflow-hidden"
      style={{ borderColor: "#e9edf2", borderLeft: `3px solid ${kleur}` }}
    >
      <div className="px-3.5 py-2.5 border-b border-gray-100">
        <div className="flex items-start justify-between gap-2">
          <div className="text-sm font-semibold text-gray-800 leading-snug min-w-0">
            {effort.title || effort.description}
          </div>
          <span
            className="text-[9px] font-bold uppercase tracking-wider text-white px-2 py-0.5 rounded shrink-0"
            style={{ background: kleur }}
          >
            {DOMAIN_LABELS[effort.domain]}
          </span>
        </div>
      </div>

      <div className="px-3.5 py-3 space-y-2">
        <div className="grid grid-cols-2 gap-x-3 gap-y-2">
          <MetaVeld label="Eigenaar" waarde={eigenaar} />
          <MetaVeld label="Inspanningsleider" waarde={leider} />
          <MetaVeld label="Planning" waarde={effort.quarter} />
          <MetaVeld label="Kostenraming" waarde={kosten} />
        </div>
        {resultaat && (
          <div className="pt-1">
            <div className="text-[10px] font-semibold uppercase tracking-wider text-gray-400 mb-0.5">
              Verwacht resultaat
            </div>
            <p className="text-[11px] text-gray-600 leading-relaxed line-clamp-3">
              {resultaat}
            </p>
          </div>
        )}
        <div className="text-[10px] text-violet-600 bg-violet-50 border border-violet-100 rounded-md px-2 py-1 mt-1">
          KPI&apos;s volgen later — via het adoptie-framework (3sides).
        </div>
      </div>
    </div>
  );
}

function MetaVeld({ label, waarde }: { label: string; waarde?: string }) {
  return (
    <div className="min-w-0">
      <div className="text-[10px] font-semibold uppercase tracking-wider text-gray-400">
        {label}
      </div>
      <div className="text-xs text-gray-700 truncate" title={waarde || undefined}>
        {waarde && waarde.length > 0 ? waarde : <span className="text-gray-300">—</span>}
      </div>
    </div>
  );
}

// ============================================================
// Kleine presentatie-componenten
// ============================================================

function VoorstelRij({
  label,
  huidig,
  voorgesteld,
  onApply,
}: {
  label: string;
  huidig?: string;
  voorgesteld?: string;
  onApply: () => void;
}) {
  if (!voorgesteld || voorgesteld === (huidig || "")) return null;
  return (
    <div className="flex items-start gap-2 text-xs bg-white/70 rounded px-2 py-1.5">
      <span className="font-medium text-gray-500 w-20 shrink-0">{label}</span>
      <div className="flex-1 min-w-0">
        {huidig && <div className="text-gray-400 line-through truncate">{huidig}</div>}
        <div className="text-gray-700">{voorgesteld}</div>
      </div>
      <button
        onClick={onApply}
        className="text-[10px] px-2 py-0.5 bg-violet-100 text-violet-700 rounded hover:bg-violet-200 transition-colors font-medium shrink-0"
      >
        Toepassen
      </button>
    </div>
  );
}

/** Bewerkbaar veld met lokale state; persisteert op onBlur via onSave. */
function KpiVeld({
  label,
  waarde,
  placeholder,
  onSave,
  kolommen = "single",
  hint,
}: {
  label: string;
  waarde: string | undefined;
  placeholder: string;
  onSave: (value: string) => void;
  kolommen?: "single" | "full";
  hint?: string;
}) {
  const [lokaal, setLokaal] = useState(waarde ?? "");

  // Houd lokale state in sync als de sessiewaarde extern verandert (bv. AI-toepassen).
  const [vorigeWaarde, setVorigeWaarde] = useState(waarde ?? "");
  if ((waarde ?? "") !== vorigeWaarde) {
    setVorigeWaarde(waarde ?? "");
    setLokaal(waarde ?? "");
  }

  return (
    <div className={kolommen === "full" ? "sm:col-span-2" : undefined}>
      <label className="text-[11px] font-medium text-gray-500 block mb-1">{label}</label>
      <input
        value={lokaal}
        onChange={(e) => setLokaal(e.target.value)}
        onBlur={() => {
          // Alleen wegschrijven als er daadwerkelijk iets veranderde.
          if (lokaal !== (waarde ?? "")) onSave(lokaal);
        }}
        placeholder={placeholder}
        className="w-full px-2.5 py-1.5 border border-gray-200 rounded-md text-sm focus:outline-none focus:ring-1 focus:ring-cito-blue/30 focus:border-cito-blue/40"
      />
      {hint && (
        <p className="mt-1 text-[10px] text-amber-600 leading-snug flex items-start gap-1">
          <span aria-hidden>ⓘ</span>
          <span>{hint}</span>
        </p>
      )}
    </div>
  );
}

function MaturityStepper({
  label,
  value,
  onChange,
  accent = false,
}: {
  label: string;
  value: number | undefined;
  onChange: (v: number) => void;
  accent?: boolean;
}) {
  const huidig = value ?? 1;
  return (
    <div>
      <div className="text-[10px] font-semibold uppercase tracking-wider text-gray-400 mb-1">
        {label}
      </div>
      <div className="flex items-center gap-2">
        <button
          onClick={() => onChange(huidig - 1)}
          disabled={huidig <= 1}
          className="w-7 h-7 rounded-md border border-gray-300 bg-white text-gray-600 font-bold hover:border-cito-blue/40 disabled:opacity-30"
          aria-label="Verlaag maturity"
        >
          −
        </button>
        <div className="flex items-center gap-1.5">
          {value === undefined ? (
            <span className="text-xs text-gray-400 italic px-1">niet gezet</span>
          ) : (
            <span
              className={`text-base font-bold tabular-nums ${
                accent ? "text-[#d97706]" : "text-[#0891b2]"
              }`}
            >
              {huidig}
            </span>
          )}
          <span className="text-[10px] text-gray-400">/ 5</span>
        </div>
        <button
          onClick={() => onChange(huidig + 1)}
          disabled={huidig >= 5}
          className="w-7 h-7 rounded-md border border-gray-300 bg-white text-gray-600 font-bold hover:border-cito-blue/40 disabled:opacity-30"
          aria-label="Verhoog maturity"
        >
          +
        </button>
      </div>
    </div>
  );
}

function KpiStatusToggle({
  status,
  onToggle,
}: {
  status: "concept" | "afgestemd";
  onToggle: () => void;
}) {
  const afgestemd = status === "afgestemd";
  return (
    <button
      onClick={onToggle}
      className={`shrink-0 text-[11px] font-semibold px-2.5 py-1 rounded-full border transition-colors ${
        afgestemd
          ? "bg-emerald-50 text-emerald-700 border-emerald-300"
          : "bg-amber-50 text-amber-700 border-amber-300"
      }`}
      title="Klik om de afstem-status te wisselen"
    >
      {afgestemd ? "✓ " : "○ "}
      {KPI_STATUS_LABEL[status]}
    </button>
  );
}

function SectieKop({
  kleur,
  nummer,
  titel,
  subtitel,
  telling,
}: {
  kleur: string;
  nummer: number;
  titel: string;
  subtitel: string;
  telling: number;
}) {
  return (
    <div className="flex items-start gap-3">
      <div
        className="w-8 h-8 rounded-lg grid place-items-center text-white font-bold text-sm shrink-0"
        style={{ background: kleur }}
      >
        {nummer}
      </div>
      <div className="min-w-0">
        <div className="flex items-center gap-2 flex-wrap">
          <h2 className="text-lg font-bold text-gray-800">{titel}</h2>
          <span
            className="text-[11px] font-semibold px-2 py-0.5 rounded-full"
            style={{ background: `${kleur}1a`, color: kleur }}
          >
            {telling}
          </span>
        </div>
        <p className="text-xs text-gray-500 mt-0.5 max-w-2xl leading-relaxed">{subtitel}</p>
      </div>
    </div>
  );
}

function BandLevel({
  kleur,
  naam,
  meta,
  gedimd = false,
}: {
  kleur: string;
  naam: string;
  meta: string;
  gedimd?: boolean;
}) {
  return (
    <div className={`flex flex-col gap-0.5 px-3 flex-1 min-w-0 ${gedimd ? "opacity-50" : ""}`}>
      <div className="text-xs font-bold flex items-center gap-1.5" style={{ color: kleur }}>
        <span className="w-2 h-2 rounded-full" style={{ background: kleur }} />
        {naam}
      </div>
      <div className="text-[10px] text-gray-400 truncate">{meta}</div>
    </div>
  );
}

function BandPijl() {
  return <span className="text-gray-300 text-sm shrink-0">›</span>;
}

function SessieStap({
  actief,
  gereed,
  label,
  tijd,
  onClick,
}: {
  actief: boolean;
  gereed: boolean;
  label: string;
  tijd?: string;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className={`text-xs font-semibold px-3 py-1.5 rounded-lg border transition-colors ${
        actief
          ? "bg-cito-blue text-white border-cito-blue"
          : gereed
            ? "bg-emerald-50 text-emerald-700 border-emerald-200"
            : "bg-white text-gray-500 border-gray-300 hover:border-cito-blue/40"
      }`}
    >
      {gereed && !actief ? "✓ " : ""}
      {label}
      {tijd && <span className="ml-1.5 font-normal opacity-70">{tijd}</span>}
    </button>
  );
}

function LegeMelding({ tekst }: { tekst: string }) {
  return (
    <div className="mt-4 p-6 text-center text-sm text-gray-400 border border-dashed border-gray-200 rounded-xl bg-gray-50/50">
      {tekst}
    </div>
  );
}
