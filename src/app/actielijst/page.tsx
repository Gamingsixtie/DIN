"use client";

import { useEffect, useState } from "react";
import Link from "next/link";

// ============================================================
// Actielijst vakantie — levend document (apart tabblad)
// ------------------------------------------------------------
// Kern: de actielijst die Pim met Sanne bespreekt over wat er
// tijdens zijn vakantie-afwezigheid gedaan kan worden. Per actie
// afvinkbaar + ruimte voor opmerkingen. Opslag: localStorage
// (sync-first, app-patroon) — geen wie/wanneer-kolommen.
// ============================================================

const OPSLAG_KEY = "kiz_actielijst_vakantie_v1";

interface Actie {
  id: string;
  titel: string;
  detail: string;
  speerpunt?: boolean;
}

const ACTIES: Actie[] = [
  {
    id: "stakeholder-afspraken",
    titel: "Stakeholder-afspraken adoptie-framework",
    detail:
      "Het verhaal voorleggen aan de HR-manager, de sectormanagers en de commercieel manager. Via de sectormanagers ophalen welke teamleden we kunnen benaderen — bijvoorbeeld marketeers en productmanagers.",
    speerpunt: true,
  },
  {
    id: "quick-wins",
    titel: "Quick wins valideren",
    detail:
      "Staan in het KPI-model (Data & Systemen: contactgegevens centraliseren + koppeling Maileon ↔ CRM, doorlopend spoor) — kloppen ze en lopen ze?",
  },
  {
    id: "gesprek-3sides",
    titel: "Gesprek met 3sides — Cultuur & Mens bewaken",
    detail:
      "De 3sides-prio ligt bij Data & Systemen en Processen; voor Cultuur & Mens staan wél inspanningen — actief in de gaten houden.",
  },
  {
    id: "check-analysefase",
    titel: "Check analysefase 2026",
    detail:
      "Loopt de analyse volgens de planning: nulmeting · adoptie-framework · klantinformatie-landschap & CRM in kaart?",
  },
  {
    id: "projectorganisatie",
    titel: "Projectorganisatie & meetingritme opzetten",
    detail:
      "Overlegstructuur organiseren: meetings met 3sides en de overige overleggen/gremia.",
  },
  {
    id: "evaluatie-kib",
    titel: "Evaluatie Klant in Beeld",
    detail: "Inplannen en opnemen — belangrijk actiepunt.",
  },
];

interface ActieStand {
  af: boolean;
  opmerking: string;
}

type Stand = Record<string, ActieStand>;

function laadStand(): Stand {
  try {
    const raw = localStorage.getItem(OPSLAG_KEY);
    if (!raw) return {};
    return JSON.parse(raw) as Stand;
  } catch (e) {
    console.error("[actielijst] laden mislukt:", e);
    return {};
  }
}

function bewaarStand(stand: Stand) {
  try {
    localStorage.setItem(OPSLAG_KEY, JSON.stringify(stand));
  } catch (e) {
    console.error("[actielijst] opslaan mislukt:", e);
  }
}

function OpmerkingVeld({
  waarde,
  onOpslaan,
}: {
  waarde: string;
  onOpslaan: (v: string) => void;
}) {
  const [tekst, setTekst] = useState(waarde);
  const [flash, setFlash] = useState(false);

  // Sync als de opgeslagen waarde van buitenaf verandert (eerste load).
  useEffect(() => {
    setTekst(waarde);
  }, [waarde]);

  const gewijzigd = tekst !== waarde;

  return (
    <div className="mt-3">
      <textarea
        value={tekst}
        onChange={(e) => setTekst(e.target.value)}
        placeholder="Opmerkingen…"
        rows={2}
        className="w-full text-sm border border-gray-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-cito-blue/30 focus:border-cito-blue placeholder:text-gray-400"
      />
      <div className="mt-1.5 flex items-center gap-2">
        <button
          onClick={() => {
            onOpslaan(tekst);
            setFlash(true);
            setTimeout(() => setFlash(false), 2000);
          }}
          disabled={!gewijzigd}
          className={`text-xs font-semibold px-3 py-1.5 rounded-lg border transition-colors ${
            gewijzigd
              ? "bg-cito-blue text-white border-cito-blue hover:bg-cito-blue-light"
              : "bg-gray-100 text-gray-400 border-gray-200 cursor-default"
          }`}
        >
          Opslaan
        </button>
        {flash && (
          <span className="text-[11px] text-emerald-600 font-medium">✓ opgeslagen</span>
        )}
        {gewijzigd && !flash && (
          <span className="text-[11px] text-amber-600">niet-opgeslagen wijziging</span>
        )}
      </div>
    </div>
  );
}

export default function ActielijstPagina() {
  const [stand, setStand] = useState<Stand>({});
  const [geladen, setGeladen] = useState(false);

  useEffect(() => {
    setStand(laadStand());
    setGeladen(true);
  }, []);

  function patch(id: string, deel: Partial<ActieStand>) {
    setStand((prev) => {
      const huidig = prev[id] ?? { af: false, opmerking: "" };
      const nieuw = { ...prev, [id]: { ...huidig, ...deel } };
      bewaarStand(nieuw);
      return nieuw;
    });
  }

  const klaar = ACTIES.filter((a) => stand[a.id]?.af).length;

  return (
    <main className="min-h-screen bg-cito-bg pb-16">
      <header className="bg-cito-blue text-white px-6 py-6">
        <div className="max-w-3xl mx-auto">
          <Link href="/" className="text-blue-200 text-sm hover:text-white">
            ← Terug
          </Link>
          <h1 className="text-3xl font-bold mt-1">Actielijst vakantie</h1>
          <p className="text-blue-200 mt-1">
            Te bespreken met Sanne: wat er tijdens mijn afwezigheid gedaan kan
            worden. Afvinken en opmerkingen toevoegen — alles wordt automatisch
            opgeslagen.
          </p>
        </div>
      </header>

      <div className="max-w-3xl mx-auto p-6 space-y-4">
        <div className="flex items-center justify-between">
          <span className="text-sm text-gray-600">
            <b className="text-cito-blue">{klaar}</b> van {ACTIES.length} gedaan
          </span>
          <span className="inline-flex items-center gap-1.5 text-[11px] text-gray-500">
            <span aria-hidden className="text-emerald-500">✓</span>
            Wijzigingen worden automatisch opgeslagen
          </span>
        </div>

        {ACTIES.map((a) => {
          const s = stand[a.id] ?? { af: false, opmerking: "" };
          return (
            <div
              key={a.id}
              className={`bg-white rounded-xl border p-4 shadow-sm transition-colors ${
                s.af ? "border-emerald-200 bg-emerald-50/40" : "border-cito-border"
              }`}
            >
              <div className="flex items-start gap-3">
                <button
                  onClick={() => patch(a.id, { af: !s.af })}
                  disabled={!geladen}
                  aria-label={s.af ? "Markeer als open" : "Markeer als gedaan"}
                  className={`flex-none w-6 h-6 rounded-md border-2 grid place-items-center text-sm font-bold transition-colors ${
                    s.af
                      ? "bg-emerald-500 border-emerald-500 text-white"
                      : "bg-white border-gray-300 text-transparent hover:border-cito-blue/50"
                  }`}
                >
                  ✓
                </button>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <h3
                      className={`font-semibold ${
                        s.af ? "text-gray-500 line-through" : "text-gray-900"
                      }`}
                    >
                      {a.titel}
                    </h3>
                    {a.speerpunt && (
                      <span className="text-[9px] font-bold uppercase tracking-wide bg-amber-500 text-white rounded px-1.5 py-0.5">
                        Speerpunt
                      </span>
                    )}
                  </div>
                  <p className="text-sm text-gray-600 mt-1 leading-relaxed">
                    {a.detail}
                  </p>
                  <OpmerkingVeld
                    waarde={s.opmerking}
                    onOpslaan={(v) => patch(a.id, { opmerking: v })}
                  />
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </main>
  );
}
