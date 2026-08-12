"use client";

import { useState, useEffect, useRef } from "react";
import { useSession } from "@/lib/session-context";
import KpiModelBlock from "@/components/programmaplan/KpiModelBlock";
import type {
  DINBenefit,
  DINCapability,
  DINEffort,
  DINSession,
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

// ------------------------------------------------------------
// Opslag-feedback: subtiele "✓ opgeslagen"-flash na een auto-save.
// De velden slaan op onBlur op (geen opslaan-knop). Deze hook toont kort
// een bevestiging zodat de gebruiker ziet dát/wanneer er opgeslagen is.
// flash() roep je ALLEEN aan als er daadwerkelijk opgeslagen werd.
// ------------------------------------------------------------
function useOpgeslagenFlash(duurMs = 1500): [boolean, () => void] {
  const [zichtbaar, setZichtbaar] = useState(false);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Opruimen bij unmount — geen setState op een verdwenen component.
  useEffect(() => {
    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, []);

  function flash() {
    if (timerRef.current) clearTimeout(timerRef.current);
    setZichtbaar(true);
    timerRef.current = setTimeout(() => {
      setZichtbaar(false);
      timerRef.current = null;
    }, duurMs);
  }

  return [zichtbaar, flash];
}

/** Kleine, rustige "✓ opgeslagen"-indicator met fade-out. */
function OpgeslagenFlash({ zichtbaar }: { zichtbaar: boolean }) {
  return (
    <span
      aria-hidden={!zichtbaar}
      className={`inline-flex items-center gap-1 text-[10px] font-semibold text-emerald-600 transition-opacity duration-500 ${
        zichtbaar ? "opacity-100" : "opacity-0"
      }`}
    >
      <span aria-hidden>✓</span> opgeslagen
    </span>
  );
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

/**
 * Ontdubbel inspanningen robuust.
 *
 * `session.efforts` bevat per-sector-duplicaten: ofwel met een
 * `consolidatedInto`-veld dat naar een canoniek item wijst, ofwel met
 * identieke titels. Een simpele `!consolidated`-filter pakt die niet, waardoor
 * elke inspanning ~9× per domein verschijnt. We groeperen op een stabiele
 * sleutel en houden per groep alléén het eerste item.
 *
 * Sleutel: `consolidatedInto` (de canonieke verwijzing) of, bij gebrek daaraan,
 * de genormaliseerde titel/omschrijving (title || description || id).
 */
function dedupEfforts(efforts: DINEffort[]): DINEffort[] {
  const gezien = new Set<string>();
  const uniek: DINEffort[] = [];
  for (const e of efforts) {
    const sleutel =
      e.consolidatedInto ??
      (e.title || e.description || e.id).trim().toLowerCase();
    if (gezien.has(sleutel)) continue;
    gezien.add(sleutel);
    uniek.push(e);
  }
  return uniek;
}

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
  const [modelOpen, setModelOpen] = useState(true);
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
  // Ontdubbel robuust: per-sector-duplicaten (consolidatedInto / identieke
  // titels) zorgden er anders voor dat elke inspanning ~9× per domein verscheen
  // — zowel in de InspanningenMap als in de 3sides-tracker-koppeling.
  const efforts = dedupEfforts(
    (session.efforts ?? []).filter((e) => !e.consolidated)
  );

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
      <div className="mt-4 flex flex-wrap items-center gap-2">
        <span className="text-[11px] font-semibold rounded-full px-3 py-1 bg-emerald-50 text-emerald-700 border border-emerald-200">
          Nu: KPI&apos;s op baten + vermogens
        </span>
        <span className="text-[11px] font-semibold rounded-full px-3 py-1 bg-gray-100 text-gray-500 border border-gray-200">
          Inspanningen later — via adoptie-framework (3sides)
        </span>
        {/* Rustige uitleg: er is bewust geen opslaan-knop. */}
        <span className="ml-auto inline-flex items-center gap-1.5 text-[11px] text-gray-500">
          <span aria-hidden className="text-emerald-500">✓</span>
          Wijzigingen worden automatisch opgeslagen
        </span>
      </div>

      {/* ---------- Definitief KPI-model (uitkomst stakeholdersessie) ---------- */}
      <div className="mt-4 bg-white border border-gray-200 rounded-xl shadow-sm overflow-hidden">
        <button
          onClick={() => setModelOpen((v) => !v)}
          className="w-full flex items-center justify-between px-4 py-3 text-left hover:bg-gray-50 transition-colors"
        >
          <div className="flex items-center gap-2">
            <span className="text-[10px] font-bold uppercase tracking-wide bg-cito-blue text-white rounded px-2 py-0.5">
              Vastgesteld
            </span>
            <span className="text-sm font-semibold text-gray-800">
              Definitief KPI-model — uitkomst stakeholdersessie
            </span>
          </div>
          <span className="text-gray-400 text-xs">
            {modelOpen ? "▲ inklappen" : "▼ uitklappen"}
          </span>
        </button>
        {modelOpen && (
          <div className="px-4 pb-4 border-t border-gray-100 pt-4">
            <KpiModelBlock />
          </div>
        )}
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
            {/* Display-merge: alle (niet-geconsolideerde) per-sector vermogens worden
                getoond als ÉÉN gedeeld, cross-sectoraal vermogen. De 3 onderliggende
                capabilities blijven volledig in session.capabilities — niets wordt
                verwijderd. KPI's op gedeeld niveau, maturity per sector. */}
            <GedeeldVermogenKaart
              capabilities={capabilities}
              updateSession={updateSession}
            />
          </div>
        )}
      </section>

      {/* ================= 3SIDES-TRACKER (punt 6) ================= */}
      <ThreesidesTracker efforts={efforts} updateSession={updateSession} overrides={session.threesidesOverrides} />

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
          <div className="mt-2">
            <span className="text-xs not-italic font-semibold text-[#0066cc]">Omschrijving — </span>
            <UitklapbareTekst
              tekst={benefit.description}
              clamp={2}
              className="text-xs text-gray-500 italic leading-relaxed"
            />
          </div>
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
// VERMOGENS — gedeelde (cross-sectorale) kaart
// ------------------------------------------------------------
// De gebruiker ziet ÉÉN gedeeld vermogen i.p.v. 3 losse kaarten. De 3
// onderliggende per-sector vermogens (Zakelijk/PO/VO) komen terug als subrijen
// en blijven volledig in session.capabilities — dit is een DISPLAY-merge, geen
// verwijdering. Maturity is per sector bewerkbaar (slaat op die capability op).
// De KPI-meetvariabelen + status staan op gedeeld niveau en worden bij opslaan
// naar ALLE gegroepeerde capabilities geschreven, zodat de data consistent is.
// ============================================================

/** Leesbare sectornaam voor een capability: relatedSectors[0] of sectorId. */
function sectorLabel(c: DINCapability): string {
  const uitRelated = c.relatedSectors?.find((s) => s && s.trim().length > 0);
  return (uitRelated || c.sectorId || "Onbekend").trim();
}

/**
 * Patch het profiel van ALLE gegroepeerde capabilities met dezelfde waarde,
 * in één updateSession-call (punt 2). Behoud de profiel-merge-guard: als een
 * profiel bestond, behouden we eigenaar/huidieSituatie/gewensteSituatie.
 * `groepIds` bepaalt welke capabilities geraakt worden; de rest blijft intact.
 */
function patchGroepProfiel(
  updateSession: ReturnType<typeof useSession>["updateSession"],
  groepIds: Set<string>,
  patch: Partial<VermogensProfiel>
) {
  updateSession((prev) => ({
    capabilities: prev.capabilities.map((c) => {
      if (!groepIds.has(c.id)) return c;
      const basis = c.profiel ?? leegVermogensProfiel(c);
      return { ...c, profiel: { ...basis, ...patch } };
    }),
  }));
}

// Minimale, defensieve shape voor de cross-analyse-uitkomst. crossAnalyseWizard
// is niet volledig getypt in DINSession — we lezen alleen wat we nodig hebben en
// casten via `unknown` om TS-fouten te vermijden. Verzin niets: alleen lezen.
type CrossAnalyseGedeeldVermogen = {
  stepResults?: {
    stap2?: {
      vermogenClusters?: { clusterTitel?: string }[];
      vermogenGelijkenisGroepen?: {
        gezamenlijkeOmschrijving?: string;
        reden?: string;
      }[];
    };
  };
};

/**
 * Lees de gezamenlijke (cross-sectorale) titel + omschrijving van het gedeelde
 * vermogen uit de cross-analyse (gedeelde-vermogens-stap, stap2).
 *  - titel = vermogenClusters[0].clusterTitel
 *  - omschrijving = het deel ná de "—" uit vermogenGelijkenisGroepen[0].gezamenlijkeOmschrijving
 *  - reden = vermogenGelijkenisGroepen[0].reden (onderbouwing waarom cross-sectoraal)
 * Defensief: optional chaining + cast naar minimale shape. Geeft `null` terug als
 * de data ontbreekt, zodat de kaart terugvalt op de "samengevoegd uit …"-weergave.
 * `reden` is optioneel (`undefined` als die ontbreekt → blokje wordt niet getoond).
 */
function leesGedeeldVermogenUitCrossAnalyse(
  session: DINSession
): { titel: string; omschrijving: string; reden?: string } | null {
  const wizard = session.crossAnalyseWizard as unknown as
    | CrossAnalyseGedeeldVermogen
    | undefined;
  const stap2 = wizard?.stepResults?.stap2;
  const titel = stap2?.vermogenClusters?.[0]?.clusterTitel?.trim();
  if (!titel) return null;

  // Omschrijving: alles ná het eerste "—" (em-dash). Valt terug op de hele
  // string als er geen em-dash in zit, en op "" als er niets na de dash staat.
  const ruweOmschrijving =
    stap2?.vermogenGelijkenisGroepen?.[0]?.gezamenlijkeOmschrijving?.trim() ?? "";
  const naDash = ruweOmschrijving.includes("—")
    ? ruweOmschrijving.split("—").slice(1).join("—").trim()
    : ruweOmschrijving;

  // Onderbouwing/reden uit de cross-analyse — waarom dit vermogen cross-sectoraal
  // is. Optioneel: blijft `undefined` als de data ontbreekt (geen blokje tonen).
  const reden =
    stap2?.vermogenGelijkenisGroepen?.[0]?.reden?.trim() || undefined;

  return { titel, omschrijving: naDash, reden };
}

function GedeeldVermogenKaart({
  capabilities,
  updateSession,
}: {
  capabilities: DINCapability[];
  updateSession: ReturnType<typeof useSession>["updateSession"];
}) {
  // Sessie nodig voor de cross-analyse-uitkomst (gedeelde-vermogens-titel).
  const { session } = useSession();
  // Gezamenlijke cross-sectorale titel + omschrijving uit het netwerk. `null`
  // als de cross-analyse-data ontbreekt → fallback op "samengevoegd uit …".
  const crossGedeeld = session
    ? leesGedeeldVermogenUitCrossAnalyse(session)
    : null;
  // Stabiele set van groep-IDs — alle gegroepeerde (niet-geconsolideerde)
  // capabilities horen tot dit ene gedeelde vermogen.
  const groepIds = new Set(capabilities.map((c) => c.id));
  // Representatief: de eerste gegroepeerde capability draagt de gedeelde
  // KPI-waarden (we schrijven bij opslaan naar alle 3, dus ze zijn identiek).
  const representant = capabilities[0];
  const sectoren = capabilities.map(sectorLabel);

  // Undo (punt 2): bewaar de profielen van ALLE gegroepeerde capabilities vóór
  // een AI-toepassing, zodat undo de hele groep terugzet.
  const [vorigeProfielen, setVorigeProfielen] = useState<Record<
    string,
    VermogensProfiel
  > | null>(null);

  // Schrijf één gedeelde meetvariabele weg naar ALLE gegroepeerde capabilities.
  function patchProfiel(patch: Partial<VermogensProfiel>) {
    patchGroepProfiel(updateSession, groepIds, patch);
  }

  // Maak een snapshot van de huidige profielen van de hele groep (voor undo).
  function maakSnapshot(): Record<string, VermogensProfiel> {
    const snap: Record<string, VermogensProfiel> = {};
    for (const c of capabilities) {
      snap[c.id] = c.profiel ? { ...c.profiel } : leegVermogensProfiel(c);
    }
    return snap;
  }

  // Herstel de profielen van de hele groep naar de bewaarde staat (punt 7).
  function herstelProfielen(snap: Record<string, VermogensProfiel>) {
    updateSession((prev) => ({
      capabilities: prev.capabilities.map((c) =>
        snap[c.id] ? { ...c, profiel: { ...snap[c.id] } } : c
      ),
    }));
  }

  // Maturity opslaan PER SECTOR — schrijft alleen naar die specifieke
  // capability, geclampt op 1–5. Maturity blijft dus per sector bewerkbaar.
  function setLevel(
    capId: string,
    veld: "currentLevel" | "targetLevel",
    value: number
  ) {
    const clamped = Math.max(1, Math.min(5, value));
    updateSession((prev) => ({
      capabilities: prev.capabilities.map((c) =>
        c.id === capId ? { ...c, [veld]: clamped } : c
      ),
    }));
  }

  // Gedeelde status uit de representant; toggle schrijft naar alle 3 (punt 4).
  const status = representant?.profiel?.kpiStatus ?? "concept";

  // Gedeelde KPI-waarden komen van de representant (na opslaan identiek voor alle).
  const gedeeld = representant?.profiel;

  // ---- Gecombineerde AI-context (punt 3) ----
  // Voeg de 3 as-is/to-be-teksten samen met sector-prefix en stel een
  // maturity-overzicht per sector samen, zodat het AI-voorstel cross-sectoraal
  // én specifiek wordt. currentLevel/targetLevel = de range over de groep.
  const huidigeRange = capabilities
    .map((c) => c.currentLevel)
    .filter((v): v is number => typeof v === "number");
  const gewensteRange = capabilities
    .map((c) => c.targetLevel)
    .filter((v): v is number => typeof v === "number");
  const minCurrent = huidigeRange.length ? Math.min(...huidigeRange) : undefined;
  const maxCurrent = huidigeRange.length ? Math.max(...huidigeRange) : undefined;
  const minTarget = gewensteRange.length ? Math.min(...gewensteRange) : undefined;
  const maxTarget = gewensteRange.length ? Math.max(...gewensteRange) : undefined;

  const huidieSituatieGecombineerd = capabilities
    .map((c) => `${sectorLabel(c)}: ${c.profiel?.huidieSituatie ?? "—"}`)
    .join(" | ");
  const gewensteSituatieGecombineerd = capabilities
    .map((c) => `${sectorLabel(c)}: ${c.profiel?.gewensteSituatie ?? "—"}`)
    .join(" | ");
  const maturityOverzicht = capabilities
    .map(
      (c) =>
        `${sectorLabel(c)}: as-is ${c.currentLevel ?? "?"} → to-be ${
          c.targetLevel ?? "?"
        }`
    )
    .join(" | ");

  // Punt A: ECHTE namen uit het DIN-netwerk — geen zelfbedachte kop. We tonen
  // letterlijk de title (fallback description) van elke gegroepeerde capability,
  // gekoppeld aan de sector, zodat zichtbaar is uit welke werkelijke vermogens
  // dit ene gedeelde vermogen is samengevoegd.
  const echteVermogens = capabilities.map((c) => ({
    sector: sectorLabel(c),
    naam: (c.title || c.description || "").trim(),
  }));
  // Voor de AI-payload geven we de ECHTE namen mee (geen verzonnen kop). Als er
  // geen titels zijn, valt het terug op een neutrale omschrijving.
  const gedeeldeTitel =
    echteVermogens.map((v) => v.naam).filter(Boolean).join(" / ") ||
    "Gedeeld cross-sectoraal vermogen";
  const sectorenTekst = sectoren.join(" · ");

  return (
    <div
      className="border rounded-xl bg-white shadow-sm overflow-hidden"
      style={{ borderColor: "#cdeef4" }}
    >
      {/* Kop — ÉÉN gedeeld vermogen. Bij voorkeur de GEZAMENLIJKE cross-sectorale
          titel + omschrijving uit de cross-analyse (gedeelde-vermogens-stap). Als
          die ontbreekt, valt de kaart terug op de "samengevoegd uit …"-weergave
          met de echte per-sector vermogen-namen (punt A). Niets verzonnen. */}
      <div className="px-4 py-3 border-b border-gray-100 bg-gradient-to-b from-white to-cyan-50/40">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <div className="text-[10px] font-bold uppercase tracking-wider text-[#0891b2]">
              Eén gedeeld vermogen · samengevoegd uit {capabilities.length} sectoren
            </div>
            {crossGedeeld ? (
              <>
                {/* Gezamenlijke titel uit het netwerk (clusterTitel) */}
                <div className="text-sm font-bold text-gray-800 mt-1 leading-snug">
                  {crossGedeeld.titel}
                </div>
                {/* Omschrijving uit het netwerk (deel ná de "—") */}
                {crossGedeeld.omschrijving && (
                  <p className="mt-1 text-xs text-gray-600 leading-relaxed">
                    {crossGedeeld.omschrijving}
                  </p>
                )}
                {/* Onderbouwing uit de cross-analyse — waarom dit vermogen
                    cross-sectoraal is. Subtiel blokje; alleen tonen als de
                    cross-analyse een `reden` heeft (niets verzonnen). */}
                {crossGedeeld.reden && (
                  <div className="mt-2 rounded-md border-l-2 border-[#0891b2]/40 bg-cyan-50/60 px-2.5 py-1.5">
                    <div className="text-[10px] font-semibold uppercase tracking-wide text-[#0891b2]">
                      Waarom cross-sectoraal:
                    </div>
                    <p className="mt-0.5 text-[11px] text-gray-600 leading-relaxed">
                      {crossGedeeld.reden}
                    </p>
                  </div>
                )}
                <div className="mt-1.5 text-[11px] text-gray-500 leading-relaxed">
                  <span className="font-semibold text-[#0891b2]">Gedeeld over:</span>{" "}
                  {sectorenTekst}
                </div>
              </>
            ) : (
              <>
                <div className="text-sm font-semibold text-gray-800 mt-1 leading-snug">
                  Gedeeld over {sectorenTekst}
                </div>
                {/* Fallback: samengevoegd uit de echte vermogen-namen uit het netwerk */}
                <div className="mt-1.5 text-xs text-gray-600 leading-relaxed">
                  <span className="font-semibold text-[#0891b2]">Samengevoegd uit:</span>{" "}
                  {echteVermogens.map((v, i) => (
                    <span key={i}>
                      {i > 0 && <span className="text-gray-300"> · </span>}
                      <span className="font-medium text-gray-700" title={`Sector: ${v.sector}`}>
                        «{v.naam || "—"}»
                      </span>
                    </span>
                  ))}
                </div>
              </>
            )}
          </div>
          <KpiStatusToggle
            status={status}
            onToggle={() =>
              patchProfiel({ kpiStatus: status === "concept" ? "afgestemd" : "concept" })
            }
          />
        </div>
        <p className="mt-2 text-xs text-gray-500 leading-relaxed">
          Eén cross-sectoraal vermogen, samengevoegd uit de per-sector vermogens hieronder.
          De meetvariabelen gelden voor de hele keten; maturity blijft per sector.
        </p>
      </div>

      {/* Per-sector subrijen — de 3 onderliggende vermogens komen hier terug */}
      <div className="px-4 py-3 bg-cyan-50/30 border-b border-gray-100 space-y-3">
        <div className="text-[10px] font-semibold uppercase tracking-wider text-[#0891b2]">
          Per sector — as-is → to-be (situatie read-only · maturity bewerkbaar)
        </div>
        {capabilities.map((c) => (
          <SectorSubrij key={c.id} capability={c} onSetLevel={setLevel} />
        ))}
        <p className="text-[10px] text-gray-400 leading-tight">
          Maturity 1–5 per sector. Schuift op per herijking (6–9 mnd / jaarlijks) zodra de
          KPI gehaald is. Situatie-teksten komen uit het DIN-netwerk.
        </p>
      </div>

      {/* Gedeelde meetvelden — één keer invullen, schrijft naar alle sectoren */}
      <div className="px-4 pt-3">
        <div className="text-[10px] font-semibold uppercase tracking-wider text-[#0891b2]">
          Gedeelde meetvariabelen — gelden voor alle {capabilities.length} sectoren
        </div>
      </div>
      <div className="px-4 py-4 grid grid-cols-1 sm:grid-cols-2 gap-3">
        <KpiVeld
          label="Indicator (meetbare KPI)"
          waarde={gedeeld?.indicator}
          placeholder="Waaraan zie je dat het vermogen groeit?"
          kolommen="full"
          onSave={(v) => patchProfiel({ indicator: v })}
        />
        <KpiVeld
          label="Nulmeting (startwaarde)"
          waarde={gedeeld?.currentValue}
          placeholder="Bijv. 'Nulmeting bij start' — geen verzonnen getal"
          hint={NULMETING_HINT}
          onSave={(v) => patchProfiel({ currentValue: v })}
        />
        <KpiVeld
          label="Doelwaarde"
          waarde={gedeeld?.targetValue}
          placeholder="Gewenste waarde"
          onSave={(v) => patchProfiel({ targetValue: v })}
        />
        <KpiVeld
          label="Meetmethode (hoe meten)"
          waarde={gedeeld?.meetmethode}
          placeholder="Bijv. maturity-assessment, audit"
          onSave={(v) => patchProfiel({ meetmethode: v })}
        />
        <KpiVeld
          label="Meetmoment"
          waarde={gedeeld?.measurementMoment}
          placeholder="Bijv. per herijking, jaarlijks"
          onSave={(v) => patchProfiel({ measurementMoment: v })}
        />
        <KpiVeld
          label="Eigenaar (gedeeld)"
          waarde={gedeeld?.eigenaar}
          placeholder="Wie is verantwoordelijk voor dit gedeelde vermogen?"
          kolommen="full"
          onSave={(v) => patchProfiel({ eigenaar: v })}
        />
      </div>

      {/* AI-paneel — GECOMBINEERDE cross-sectorale context (punt 3).
          Toepassen schrijft naar alle gegroepeerde capabilities (punt 2). */}
      <AiKpiPaneel
        level="vermogen"
        item={{ profiel: gedeeld } as DINCapability}
        apiItem={{
          title: gedeeldeTitel,
          description: `Cross-sectoraal vermogen, gedeeld over ${sectorenTekst}. Maturity per sector: ${maturityOverzicht}.`,
          indicator: gedeeld?.indicator,
          meetmethode: gedeeld?.meetmethode,
          currentValue: gedeeld?.currentValue,
          targetValue: gedeeld?.targetValue,
          measurementMoment: gedeeld?.measurementMoment,
          eigenaar: gedeeld?.eigenaar,
          // Samengevoegde as-is/to-be met sector-prefix — cross-sectoraal én specifiek.
          huidieSituatie: huidieSituatieGecombineerd,
          gewensteSituatie: gewensteSituatieGecombineerd,
          // Range over de groep (mag weggelaten zijn als geen levels gezet zijn).
          currentLevel: minCurrent,
          targetLevel: maxTarget,
          maturityRange: {
            currentMin: minCurrent,
            currentMax: maxCurrent,
            targetMin: minTarget,
            targetMax: maxTarget,
          },
          maturityPerSector: maturityOverzicht,
          sectoren,
        }}
        onApply={(patch) => {
          // Snapshot van de HELE groep vóór toepassen, zodat undo alles terugzet (punt 2).
          setVorigeProfielen(maakSnapshot());
          const { bateneigenaar, toelichting, ...rest } = patch;
          void bateneigenaar;
          void toelichting;
          // Schrijf naar ALLE gegroepeerde capabilities (punt 2 + 3).
          patchProfiel(rest);
        }}
        kanHerstellen={vorigeProfielen !== null}
        onUndo={() => {
          if (vorigeProfielen) {
            herstelProfielen(vorigeProfielen);
            setVorigeProfielen(null);
          }
        }}
      />
    </div>
  );
}

/**
 * Eén per-sector subrij binnen de gedeelde vermogen-kaart. Toont sector,
 * as-is → to-be situatie (read-only), eigenaar en de bewerkbare maturity
 * (slaat op die specifieke capability op).
 */
function SectorSubrij({
  capability,
  onSetLevel,
}: {
  capability: DINCapability;
  onSetLevel: (
    capId: string,
    veld: "currentLevel" | "targetLevel",
    value: number
  ) => void;
}) {
  const sector = sectorLabel(capability);
  const asIs = capability.profiel?.huidieSituatie?.trim();
  const toBe = capability.profiel?.gewensteSituatie?.trim();
  const eigenaar = capability.profiel?.eigenaar?.trim();

  return (
    <div className="rounded-lg border border-cyan-100 bg-white/70 px-3 py-2.5">
      <div className="flex items-center gap-2 flex-wrap">
        <span
          className="text-[10px] font-bold uppercase tracking-wider text-white px-2 py-0.5 rounded"
          style={{ background: "#0891b2" }}
        >
          {sector}
        </span>
        <span className="text-xs font-semibold text-gray-700 min-w-0 truncate">
          {capability.title || capability.description}
        </span>
        {eigenaar && (
          <span className="ml-auto text-[10px] text-gray-500">
            Eigenaar: <span className="font-medium text-gray-700">{eigenaar}</span>
          </span>
        )}
      </div>

      {/* As-is → to-be situatie (read-only) */}
      <div className="mt-2 grid grid-cols-1 sm:grid-cols-2 gap-2">
        <div className="rounded-md bg-gray-50 border border-gray-100 px-2.5 py-1.5">
          <div className="text-[9px] font-semibold uppercase tracking-wider text-gray-400">
            As-is (huidige situatie)
          </div>
          {asIs && asIs.length > 0 ? (
            <div className="mt-0.5">
              <UitklapbareTekst tekst={asIs} clamp={3} className="text-[11px] text-gray-600 leading-snug" />
            </div>
          ) : (
            <p className="text-[11px] text-gray-600 leading-snug mt-0.5">
              <span className="text-gray-300">—</span>
            </p>
          )}
        </div>
        <div className="rounded-md bg-cyan-50/60 border border-cyan-100 px-2.5 py-1.5">
          <div className="text-[9px] font-semibold uppercase tracking-wider text-[#0891b2]">
            To-be (gewenste situatie)
          </div>
          {toBe && toBe.length > 0 ? (
            <div className="mt-0.5">
              <UitklapbareTekst tekst={toBe} clamp={3} className="text-[11px] text-gray-700 leading-snug" />
            </div>
          ) : (
            <p className="text-[11px] text-gray-700 leading-snug mt-0.5">
              <span className="text-gray-300">—</span>
            </p>
          )}
        </div>
      </div>

      {/* Maturity per sector — bewerkbaar (slaat op deze capability op) */}
      <div className="mt-2.5 flex flex-wrap items-center gap-5">
        <MaturityStepper
          label="As-is (huidig)"
          value={capability.currentLevel}
          onChange={(v) => onSetLevel(capability.id, "currentLevel", v)}
        />
        <span className="text-[#0891b2] font-bold text-lg">→</span>
        <MaturityStepper
          label="To-be (gewenst)"
          value={capability.targetLevel}
          onChange={(v) => onSetLevel(capability.id, "targetLevel", v)}
          accent
        />
      </div>
    </div>
  );
}

// ============================================================
// AI-paneel (per item) — POST /api/kpi-suggest
// ============================================================

function AiKpiPaneel({
  level,
  item,
  apiItem,
  onApply,
  kanHerstellen,
  onUndo,
}: {
  level: "baat" | "vermogen";
  item: DINBenefit | DINCapability;
  // Optioneel: de payload die naar /api/kpi-suggest gaat. Bij een vermogen
  // sturen we hier de rijke context mee (as-is/to-be + maturity) zodat het
  // voorstel specifiek wordt i.p.v. generiek. Valt terug op `item`.
  apiItem?: Record<string, unknown>;
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

  // Payload-item voor de route: rijke context indien meegegeven (vermogen),
  // anders het ruwe item. Zo wordt het AI-voorstel specifiek i.p.v. generiek.
  const itemPayload: unknown = apiItem ?? item;

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
    const result = await callApi({ mode: "vragen", level, item: itemPayload });
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
      item: itemPayload,
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
      item: itemPayload,
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

type ThreesidesOverrides = NonNullable<DINSession["threesidesOverrides"]>;

function ThreesidesTracker({
  efforts,
  updateSession,
  overrides,
}: {
  efforts: DINEffort[];
  updateSession: ReturnType<typeof useSession>["updateSession"];
  overrides: ThreesidesOverrides | undefined;
}) {
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
          <ThreesidesDomeinKaart
            key={d.domein}
            data={d}
            efforts={efforts}
            updateSession={updateSession}
            overrides={overrides}
          />
        ))}
      </div>
    </section>
  );
}

function ThreesidesDomeinKaart({
  data,
  efforts,
  updateSession,
  overrides,
}: {
  data: ThreesidesDomeinData;
  efforts: DINEffort[];
  updateSession: ReturnType<typeof useSession>["updateSession"];
  overrides: ThreesidesOverrides | undefined;
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
        {/* Punt B: bewerkbare deliverables — klaar-toggle + inline tekst, gepersisteerd
            naar session.threesidesOverrides (key = "domein:index"). */}
        {data.deliverables.map((dlv, index) => (
          <ThreesidesDeliverableRij
            key={`${data.domein}:${index}`}
            domein={data.domein}
            index={index}
            standaardLabel={dlv.label}
            override={overrides?.[`${data.domein}:${index}`]}
            updateSession={updateSession}
          />
        ))}
        <div className="text-[9px] text-amber-700 pt-1">uit raming Plus20</div>

        {/* Punt C: sales/marketing-funnel + quick wins (alleen data & systemen). */}
        {data.funnel && (
          <div
            className="mt-2.5 rounded-lg px-3 py-2 border"
            style={{ background: "#f6f1fe", borderColor: "#e4d8fb" }}
          >
            <div className="text-[9px] font-bold uppercase tracking-wider" style={{ color: "#6d28d9" }}>
              Sales/marketing-funnel
            </div>
            <p className="mt-0.5 text-[11px] leading-relaxed" style={{ color: "#4c1d95" }}>
              {data.funnel}
            </p>
          </div>
        )}
        {data.quickWins && data.quickWins.length > 0 && (
          <div
            className="mt-2 rounded-lg px-3 py-2 border"
            style={{ background: "#f6f1fe", borderColor: "#e4d8fb" }}
          >
            <div className="text-[9px] font-bold uppercase tracking-wider" style={{ color: "#6d28d9" }}>
              Quick wins
            </div>
            <ul className="mt-1 space-y-1">
              {data.quickWins.map((qw, i) => (
                <li
                  key={i}
                  className="flex items-start gap-1.5 text-[11px] leading-relaxed"
                  style={{ color: "#4c1d95" }}
                >
                  <span aria-hidden style={{ color: "#6d28d9" }}>•</span>
                  <span>{qw}</span>
                </li>
              ))}
            </ul>
          </div>
        )}

        {/* Bewerkbaar 3sides-KPI/target-veld — ná deliverables en funnel/quick-wins.
            Persisteert naar session.threesidesOverrides (key = "domein:_kpi").
            `data` + `overrides` worden meegegeven zodat de ✨AI-knop het domein,
            de 2026-fase en de (eventueel aangepaste) deliverables als context kan
            meesturen naar /api/kpi-suggest. */}
        <ThreesidesKpiVeld
          data={data}
          override={overrides?.[`${data.domein}:_kpi`]}
          overrides={overrides}
          updateSession={updateSession}
        />

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

// ------------------------------------------------------------
// Eén bewerkbare 3sides-deliverable-rij (punt B).
// - klaar-toggle (knop) schakelt de status om
// - tekst is inline bewerkbaar (default = standaardLabel, of override-tekst)
// Beide persisteren naar session.threesidesOverrides via updateSession; we
// patchen ALLEEN de specifieke key (domein:index) — nooit het hele object
// leeg overschrijven. Tekst slaat op onBlur op, met change-guard.
// ------------------------------------------------------------
function ThreesidesDeliverableRij({
  domein,
  index,
  standaardLabel,
  override,
  updateSession,
}: {
  domein: ThreesidesDomeinData["domein"];
  index: number;
  standaardLabel: string;
  override: { klaar?: boolean; tekst?: string } | undefined;
  updateSession: ReturnType<typeof useSession>["updateSession"];
}) {
  const key = `${domein}:${index}`;
  const klaar = override?.klaar ?? false;
  // Effectieve tekst: override-tekst als die er is, anders de standaard-label.
  const effectieveTekst = override?.tekst ?? standaardLabel;

  // Lokale input-state voor snelle UX; persisteert op onBlur.
  const [tekst, setTekst] = useState(effectieveTekst);
  // "✓ opgeslagen"-flash, hergebruik van de gedeelde helper.
  const [opgeslagenZichtbaar, flashOpgeslagen] = useOpgeslagenFlash();

  // Houd de lokale input in sync wanneer de override van buitenaf wijzigt
  // (bijv. na undo). Alleen overschrijven als de waarde echt afwijkt.
  useEffect(() => {
    setTekst(effectieveTekst);
  }, [effectieveTekst]);

  function toggleKlaar() {
    const nieuweKlaar = !klaar;
    updateSession((prev) => ({
      threesidesOverrides: {
        ...(prev.threesidesOverrides ?? {}),
        [key]: { ...(prev.threesidesOverrides?.[key] ?? {}), klaar: nieuweKlaar },
      },
    }));
    flashOpgeslagen();
  }

  function opslaanTekst() {
    const nieuweTekst = tekst.trim();
    // Change-guard: alleen schrijven als de tekst daadwerkelijk veranderd is
    // t.o.v. wat effectief getoond wordt. Lege tekst valt terug op standaard.
    if (nieuweTekst === effectieveTekst.trim()) return;
    updateSession((prev) => ({
      threesidesOverrides: {
        ...(prev.threesidesOverrides ?? {}),
        [key]: {
          ...(prev.threesidesOverrides?.[key] ?? {}),
          tekst: nieuweTekst.length > 0 ? nieuweTekst : standaardLabel,
        },
      },
    }));
    flashOpgeslagen();
  }

  return (
    <div className="flex items-start gap-2 text-xs text-gray-700">
      {/* Klaar-toggle (klaar j/n) — knop schakelt de status om */}
      <button
        type="button"
        onClick={toggleKlaar}
        aria-pressed={klaar}
        title={klaar ? "Gereed — klik om terug te zetten" : "Markeer als gereed"}
        className={`mt-0.5 w-4 h-4 rounded grid place-items-center text-[10px] font-bold shrink-0 border transition-colors ${
          klaar
            ? "text-white border-transparent"
            : "bg-white border-gray-300 text-transparent hover:border-violet-400"
        }`}
        style={klaar ? { background: "#6d28d9", borderColor: "#6d28d9" } : undefined}
      >
        ✓
      </button>
      {/* Inline bewerkbare deliverable-tekst */}
      <div className="min-w-0 flex-1">
        <input
          value={tekst}
          onChange={(e) => setTekst(e.target.value)}
          onBlur={opslaanTekst}
          onKeyDown={(e) => {
            if (e.key === "Enter") e.currentTarget.blur();
          }}
          placeholder={standaardLabel}
          className={`w-full bg-transparent text-xs leading-snug px-1 py-0.5 -ml-1 rounded border border-transparent hover:border-violet-200 focus:border-violet-300 focus:bg-white focus:outline-none focus:ring-1 focus:ring-violet-200 ${
            klaar ? "line-through text-gray-400" : "text-gray-700"
          }`}
        />
        <div className="-ml-0.5">
          <OpgeslagenFlash zichtbaar={opgeslagenZichtbaar} />
        </div>
      </div>
    </div>
  );
}

// ------------------------------------------------------------
// 3sides-KPI AI-voorstel (POST /api/kpi-suggest, level "3sides").
// Eén meetbare oplevering-KPI (klaar j/n) voor de uitvoeringspartner — géén
// klant-effect. kpi + meetmoment + toelichting.
// ------------------------------------------------------------
interface Threesides3sidesVoorstel {
  kpi?: string;
  meetmoment?: string;
  toelichting?: string;
}

// ------------------------------------------------------------
// Bewerkbaar 3sides-KPI/target-veld per domein.
// Vrij tekstveld waarin de gebruiker de meetbare 3sides-KPI/target voor dít
// domein vastlegt. Persisteert naar session.threesidesOverrides via updateSession;
// we patchen ALLEEN de key "domein:_kpi" (spread van het bestaande object) —
// nooit het hele object leeg overschrijven. Opslaan op onBlur, met change-guard.
//
// Daarnaast: een ✨AI-knop die een meetbare oplevering-KPI voorstelt op basis
// van het domein, de 2026-fase en de (eventueel aangepaste) deliverables. Het
// voorstel kan met "Toepassen" in dit veld gezet en opgeslagen worden — via
// hetzelfde "domein:_kpi"-opslagpatroon.
// ------------------------------------------------------------
function ThreesidesKpiVeld({
  data,
  override,
  overrides,
  updateSession,
}: {
  data: ThreesidesDomeinData;
  override: { klaar?: boolean; tekst?: string } | undefined;
  overrides: ThreesidesOverrides | undefined;
  updateSession: ReturnType<typeof useSession>["updateSession"];
}) {
  const domein = data.domein;
  const key = `${domein}:_kpi`;
  // Effectieve waarde: override-tekst als die er is, anders leeg.
  const effectieveTekst = override?.tekst ?? "";

  // Lokale input-state voor snelle UX; persisteert op onBlur.
  const [tekst, setTekst] = useState(effectieveTekst);
  // "✓ opgeslagen"-flash, hergebruik van de gedeelde helper.
  const [opgeslagenZichtbaar, flashOpgeslagen] = useOpgeslagenFlash();

  // --- AI-voorstel-state ---
  const [aiLoading, setAiLoading] = useState(false);
  const [aiFout, setAiFout] = useState<string | null>(null);
  const [aiRetryable, setAiRetryable] = useState(false);
  const [aiVoorstel, setAiVoorstel] = useState<Threesides3sidesVoorstel | null>(null);

  // Houd de lokale input in sync wanneer de override van buitenaf wijzigt
  // (bijv. na undo). Alleen overschrijven als de waarde echt afwijkt.
  useEffect(() => {
    setTekst(effectieveTekst);
  }, [effectieveTekst]);

  // Schrijf een tekst naar het "domein:_kpi"-veld via het bestaande patroon:
  // ALLEEN deze key patchen (spread van het bestaande object), change-guard,
  // ✓-flash. Wordt gebruikt door zowel onBlur als "Toepassen".
  function schrijfTekst(nieuweRuw: string) {
    const nieuweTekst = nieuweRuw.trim();
    // Change-guard: alleen schrijven als de tekst daadwerkelijk veranderd is.
    if (nieuweTekst === effectieveTekst.trim()) return;
    updateSession((prev) => ({
      threesidesOverrides: {
        ...(prev.threesidesOverrides ?? {}),
        [key]: { ...(prev.threesidesOverrides?.[key] ?? {}), tekst: nieuweTekst },
      },
    }));
    flashOpgeslagen();
  }

  function opslaan() {
    schrijfTekst(tekst);
  }

  // Vraag een AI-voorstel voor de 3sides-oplevering-KPI. We sturen het domein,
  // de 2026-fase en de EFFECTIEVE deliverable-teksten mee (override-tekst als die
  // er is, anders het standaard-label) — zo volgt het voorstel de bewerkingen.
  async function vraagAiVoorstel() {
    setAiLoading(true);
    setAiFout(null);
    setAiRetryable(false);
    setAiVoorstel(null);
    try {
      const deliverables = data.deliverables.map(
        (d, i) => overrides?.[`${domein}:${i}`]?.tekst ?? d.label
      );
      const res = await fetch("/api/kpi-suggest", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          mode: "voorstel",
          level: "3sides",
          domein,
          fase: data.fase2026,
          deliverables,
        }),
      });
      const json = await res.json();
      if (!res.ok || json?.success === false) {
        setAiRetryable(Boolean(json?.retryable));
        setAiFout(json?.error || "AI-verzoek mislukt. Probeer het opnieuw.");
        return;
      }
      const suggestion = (json?.data?.suggestion ??
        json?.suggestion) as Threesides3sidesVoorstel | undefined;
      if (!suggestion?.kpi) {
        setAiRetryable(true);
        setAiFout("Geen bruikbaar voorstel ontvangen. Probeer het opnieuw.");
        return;
      }
      setAiVoorstel(suggestion);
    } catch (e) {
      console.error("[kpi-suggest][3sides]", e);
      setAiRetryable(true);
      setAiFout("Verbinding mislukt. Probeer het opnieuw.");
    } finally {
      setAiLoading(false);
    }
  }

  // Pas de voorgestelde KPI toe: zet 'm in het veld én sla op (zelfde patroon).
  function pasVoorstelToe() {
    if (!aiVoorstel?.kpi) return;
    const nieuw = aiVoorstel.kpi.trim();
    setTekst(nieuw);
    schrijfTekst(nieuw);
    setAiVoorstel(null);
  }

  return (
    <div
      className="mt-2.5 rounded-lg px-3 py-2 border"
      style={{ background: "#f6f1fe", borderColor: "#e4d8fb" }}
    >
      <div className="flex items-center justify-between gap-2">
        <div className="text-[9px] font-bold uppercase tracking-wider" style={{ color: "#6d28d9" }}>
          3sides-KPI (invullen)
        </div>
        <div className="flex items-center gap-2">
          <OpgeslagenFlash zichtbaar={opgeslagenZichtbaar} />
          <button
            type="button"
            onClick={vraagAiVoorstel}
            disabled={aiLoading}
            title="AI stelt een meetbare oplevering-KPI voor (klaar j/n) op basis van de deliverables"
            className="text-[10px] font-bold px-2 py-0.5 rounded-md border transition-colors disabled:opacity-50"
            style={{ background: "#fff", borderColor: "#c4b5fd", color: "#6d28d9" }}
          >
            {aiLoading ? "Bezig…" : "✨ AI"}
          </button>
        </div>
      </div>
      <input
        value={tekst}
        onChange={(e) => setTekst(e.target.value)}
        onBlur={opslaan}
        onKeyDown={(e) => {
          if (e.key === "Enter") e.currentTarget.blur();
        }}
        placeholder="bv. datakwaliteits-scan gereed (j/n) · richting CRM bepaald"
        className="mt-1 w-full bg-white text-[11px] leading-relaxed px-2 py-1 rounded-md border border-violet-200 text-violet-900 placeholder:text-violet-300 focus:border-violet-400 focus:outline-none focus:ring-1 focus:ring-violet-300"
      />

      {/* AI-fout + retry */}
      {aiFout && (
        <div className="mt-1.5 p-1.5 bg-red-50 border border-red-200 rounded text-[10px] text-red-600 leading-snug">
          {aiFout}
          {aiRetryable && (
            <button
              type="button"
              onClick={vraagAiVoorstel}
              className="ml-1.5 underline font-medium"
            >
              Opnieuw proberen
            </button>
          )}
        </div>
      )}

      {/* AI-voorstel — ter inspiratie; "Toepassen" zet de KPI in het veld + slaat op */}
      {aiVoorstel?.kpi && (
        <div
          className="mt-2 rounded-lg px-2.5 py-2 border"
          style={{ background: "#fff", borderColor: "#c4b5fd" }}
        >
          <div className="flex items-center justify-between gap-2">
            <span className="text-[9px] font-bold uppercase tracking-wider" style={{ color: "#6d28d9" }}>
              ✨ AI-voorstel ter inspiratie
            </span>
            <button
              type="button"
              onClick={() => setAiVoorstel(null)}
              className="text-[10px] text-gray-400 hover:text-gray-600"
              title="Voorstel verbergen"
            >
              ✕
            </button>
          </div>
          <p className="mt-1 text-[11px] font-semibold leading-snug" style={{ color: "#4c1d95" }}>
            {aiVoorstel.kpi}
          </p>
          {aiVoorstel.meetmoment && (
            <p className="mt-0.5 text-[10px] text-gray-500 leading-snug">
              <span className="font-semibold">Meetmoment: </span>
              {aiVoorstel.meetmoment}
            </p>
          )}
          {aiVoorstel.toelichting && (
            <p className="mt-0.5 text-[10px] text-gray-500 italic leading-snug">
              {aiVoorstel.toelichting}
            </p>
          )}
          <div className="mt-1.5 flex items-center gap-2">
            <button
              type="button"
              onClick={pasVoorstelToe}
              className="text-[10px] font-semibold px-2.5 py-1 rounded-md text-white transition-colors"
              style={{ background: "#6d28d9" }}
            >
              Toepassen
            </button>
            <span className="text-[9px] text-violet-400 italic">jij beslist</span>
          </div>
        </div>
      )}
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

// Lookup: domein → totale Plus20-kostenraming (over de looptijd). Bron:
// THREESIDES_DOMEINEN (data €910K · mens €183K · cultuur €142K · processen €126K).
// We tonen deze Plus20-raming PRIMAIR per inspanning i.p.v. de generieke
// effort.kostenraming.
const PLUS20_RAMING_PER_DOMEIN: Partial<Record<EffortDomain, string>> =
  Object.fromEntries(
    THREESIDES_DOMEINEN.map((d) => [d.domein, d.budgetTotaalPlus20])
  ) as Partial<Record<EffortDomain, string>>;

function InspanningKaart({ effort, kleur }: { effort: DINEffort; kleur: string }) {
  const d = effort.dossier;
  const eigenaar = d?.eigenaar?.trim();
  const leider = d?.inspanningsleider?.trim();
  // Primaire raming = Plus20 per domein. De generieke effort.kostenraming tonen
  // we alleen nog klein/secundair (zie onder).
  const plus20Raming = PLUS20_RAMING_PER_DOMEIN[effort.domain];
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
          {/* Primaire raming = Plus20 (per domein). Valt terug op de generieke
              kostenraming als er voor dit domein geen Plus20-bedrag is. */}
          {plus20Raming ? (
            <div className="min-w-0">
              <div className="text-[10px] font-semibold uppercase tracking-wider text-amber-600">
                Raming Plus20
              </div>
              <div
                className="text-xs font-semibold text-gray-800 truncate"
                title={plus20Raming}
              >
                {plus20Raming}
              </div>
              {/* Generieke kostenraming klein/secundair eronder (alleen als die
                  afwijkt — anders weglaten). */}
              {kosten && kosten.length > 0 && (
                <div className="text-[10px] text-gray-400 truncate" title={kosten}>
                  basisraming: {kosten}
                </div>
              )}
            </div>
          ) : (
            <MetaVeld label="Kostenraming" waarde={kosten} />
          )}
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

/**
 * Read-only lange tekst die standaard met line-clamp wordt ingekort en bij
 * klik volledig uitklapt (punt C). Toont alleen een "meer/minder"-toggle als de
 * tekst daadwerkelijk te lang is om binnen `clamp` regels te passen — anders
 * gewoon de volledige tekst. Detectie via scrollHeight > clientHeight.
 */
function UitklapbareTekst({
  tekst,
  clamp = 2,
  className = "",
}: {
  tekst: string;
  clamp?: 2 | 3 | 4;
  className?: string;
}) {
  const [open, setOpen] = useState(false);
  const [afgekapt, setAfgekapt] = useState(false);
  const pRef = useRef<HTMLParagraphElement | null>(null);

  // Meet of de tekst in ingeklapte staat wordt afgekapt; alleen dan tonen we
  // de toggle. Hermeten bij tekstwijziging.
  useEffect(() => {
    const el = pRef.current;
    if (!el) return;
    if (!open) {
      setAfgekapt(el.scrollHeight - 1 > el.clientHeight);
    }
  }, [tekst, open]);

  const clampClass = open
    ? ""
    : clamp === 2
      ? "line-clamp-2"
      : clamp === 3
        ? "line-clamp-3"
        : "line-clamp-4";

  return (
    <div>
      <p
        ref={pRef}
        onClick={() => afgekapt && setOpen((v) => !v)}
        className={`${clampClass} ${afgekapt ? "cursor-pointer" : ""} ${className}`}
        title={afgekapt ? (open ? "Klik om in te klappen" : "Klik om volledig te tonen") : undefined}
      >
        {tekst}
      </p>
      {afgekapt && (
        <button
          type="button"
          onClick={() => setOpen((v) => !v)}
          className="mt-0.5 text-[10px] font-semibold text-cito-blue hover:underline"
        >
          {open ? "− Minder" : "+ Meer"}
        </button>
      )}
    </div>
  );
}

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

/**
 * Bewerkbaar veld met lokale state; persisteert op onBlur via onSave.
 *
 * Punt C: auto-groeiende textarea i.p.v. een input op één regel, zodat lange
 * teksten volledig leesbaar zijn. De textarea groeit mee met de inhoud (we
 * resetten de hoogte en zetten 'm op scrollHeight bij elke wijziging). Enter
 * voegt een nieuwe regel toe (textarea-default); opslaan blijft op onBlur.
 * Opslag-patroon ongewijzigd: lokale state → onBlur → change-guard → onSave →
 * "✓ opgeslagen"-flash.
 */
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
  // Subtiele opslag-bevestiging na een daadwerkelijke onBlur-save.
  const [opgeslagen, flashOpgeslagen] = useOpgeslagenFlash();
  const textareaRef = useRef<HTMLTextAreaElement | null>(null);

  // Houd lokale state in sync als de sessiewaarde extern verandert (bv. AI-toepassen).
  const [vorigeWaarde, setVorigeWaarde] = useState(waarde ?? "");
  if ((waarde ?? "") !== vorigeWaarde) {
    setVorigeWaarde(waarde ?? "");
    setLokaal(waarde ?? "");
  }

  // Auto-grow: reset hoogte en groei naar scrollHeight. Draait bij elke
  // waarde-wijziging (typen én externe sync), zodat de hele tekst zichtbaar is.
  useEffect(() => {
    const el = textareaRef.current;
    if (!el) return;
    el.style.height = "auto";
    el.style.height = `${el.scrollHeight}px`;
  }, [lokaal]);

  return (
    <div className={kolommen === "full" ? "sm:col-span-2" : undefined}>
      <div className="flex items-center justify-between gap-2 mb-1">
        <label className="text-[11px] font-medium text-gray-500">{label}</label>
        <OpgeslagenFlash zichtbaar={opgeslagen} />
      </div>
      <textarea
        ref={textareaRef}
        rows={1}
        value={lokaal}
        onChange={(e) => setLokaal(e.target.value)}
        onBlur={() => {
          // Alleen wegschrijven als er daadwerkelijk iets veranderde.
          if (lokaal !== (waarde ?? "")) {
            onSave(lokaal);
            flashOpgeslagen();
          }
        }}
        placeholder={placeholder}
        className="w-full px-2.5 py-1.5 border border-gray-200 rounded-md text-sm leading-snug resize-none overflow-hidden focus:outline-none focus:ring-1 focus:ring-cito-blue/30 focus:border-cito-blue/40"
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
  // Maturity slaat direct op via updateSession; flash na een geslaagde wijziging.
  const [opgeslagen, flashOpgeslagen] = useOpgeslagenFlash();

  // Clamp-bewuste wijziging: alleen opslaan/flashen als de waarde echt verandert.
  function wijzig(nieuw: number) {
    const clamped = Math.max(1, Math.min(5, nieuw));
    if (clamped === value) return;
    onChange(clamped);
    flashOpgeslagen();
  }

  return (
    <div>
      <div className="flex items-center gap-2 mb-1">
        <div className="text-[10px] font-semibold uppercase tracking-wider text-gray-400">
          {label}
        </div>
        <OpgeslagenFlash zichtbaar={opgeslagen} />
      </div>
      <div className="flex items-center gap-2">
        <button
          onClick={() => wijzig(huidig - 1)}
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
          onClick={() => wijzig(huidig + 1)}
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
  // De toggle slaat direct op via updateSession; flash na elke wissel.
  const [opgeslagen, flashOpgeslagen] = useOpgeslagenFlash();

  return (
    <div className="shrink-0 flex items-center gap-1.5">
      <OpgeslagenFlash zichtbaar={opgeslagen} />
      <button
        onClick={() => {
          onToggle();
          flashOpgeslagen();
        }}
        className={`text-[11px] font-semibold px-2.5 py-1 rounded-full border transition-colors ${
          afgestemd
            ? "bg-emerald-50 text-emerald-700 border-emerald-300"
            : "bg-amber-50 text-amber-700 border-amber-300"
        }`}
        title="Klik om de afstem-status te wisselen"
      >
        {afgestemd ? "✓ " : "○ "}
        {KPI_STATUS_LABEL[status]}
      </button>
    </div>
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
