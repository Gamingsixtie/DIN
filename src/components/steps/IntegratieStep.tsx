"use client";

// Stap 11 — "Programma × 3sides", met twee tabbladen:
// 1. Analyse: programmaplan en Doelen-Inspanningennetwerk (DIN) naast alles wat 3sides
//    heeft opgeleverd (src/lib/integratie-3sides-default.ts).
// 2. Naslag: de kern van alle 3sides-documenten, per document met paginanummer of
//    tabblad (src/lib/kern-3sides-default.ts). Direct te openen met ?stap=integratie&tab=kern.
// Beide per kop en per cel handmatig aanpasbaar; aanpassingen worden in de sessie bewaard
// (session.documenten[sleutel], localStorage-first + Supabase via updateSession).
// Intern Cito: bewust geen statische of openbare versie.

import { useMemo, useState } from "react";
import { useSession } from "@/lib/session-context";
import type { BewerkbaarDocument as DocData } from "@/lib/schemas";
import { DEFAULT_INTEGRATIE_3SIDES, INTEGRATIE_SLEUTEL } from "@/lib/integratie-3sides-default";
import { DEFAULT_KERN_3SIDES, KERN_3SIDES_SLEUTEL } from "@/lib/kern-3sides-default";
import { kloon, mergeDocument } from "@/lib/bewerkbaar-document";
import BewerkBalk, { useMelding } from "@/components/bewerkbaar/BewerkBalk";
import BewerkbaarDocument from "@/components/bewerkbaar/BewerkbaarDocument";

const HINT =
  "Bewerkmodus: de gele velden zijn aanpasbaar; met × en + haal je secties, regels, rijen, kaarten en lagen weg of voeg je ze toe. Niets wordt bewaard tot je op Opslaan klikt.";

const TABBLADEN = [
  {
    id: "analyse",
    label: "Analyse: programma × 3sides",
    sleutel: INTEGRATIE_SLEUTEL,
    standaard: DEFAULT_INTEGRATIE_3SIDES,
    intro:
      "Integratie-analyse: programmaplan en Doelen-Inspanningennetwerk (DIN) naast alles wat 3sides heeft opgeleverd. Intern Cito, ter voorbereiding van de sessie van maandag. Namen en teksten pas je per kop zelf aan; aanpassingen worden in deze sessie bewaard.",
  },
  {
    id: "kern",
    label: "Naslag: kern van de 3sides-documenten",
    sleutel: KERN_3SIDES_SLEUTEL,
    standaard: DEFAULT_KERN_3SIDES,
    intro:
      "Samenvatting van alle documenten van 3sides in de map '3sides input': per document de kern, met paginanummer of tabblad. Persoonlijke naslag van de programma-architect; de analyse voor de sessie staat in het andere tabblad.",
  },
] as const;

type Tabblad = (typeof TABBLADEN)[number];

function beginTab(): number {
  if (typeof window === "undefined") return 0;
  const i = TABBLADEN.findIndex((t) => t.id === new URLSearchParams(window.location.search).get("tab"));
  return i < 0 ? 0 : i;
}

export default function IntegratieStep() {
  const [actief, setActief] = useState(beginTab);
  const tab = TABBLADEN[actief];

  return (
    <div className="space-y-4">
      <div role="tablist" aria-label="Onderdelen van stap 11" className="flex flex-wrap gap-2">
        {TABBLADEN.map((t, i) => (
          <button
            key={t.id}
            type="button"
            role="tab"
            aria-selected={i === actief}
            onClick={() => setActief(i)}
            className={
              "px-4 py-2 rounded-lg text-sm font-semibold border transition-colors " +
              (i === actief
                ? "bg-[#003366] text-white border-[#003366]"
                : "bg-white text-[#003366] border-slate-300 hover:border-[#003366]")
            }
          >
            {t.label}
          </button>
        ))}
      </div>
      {/* key: bij wisselen van tabblad start de bewerkstatus opnieuw */}
      <DocumentTab key={tab.id} tab={tab} />
    </div>
  );
}

function DocumentTab({ tab }: { tab: Tabblad }) {
  const { session, updateSession } = useSession();
  const bewaard = session?.documenten?.[tab.sleutel];
  const opgeslagen = useMemo(() => mergeDocument(tab.standaard, bewaard), [tab.standaard, bewaard]);
  const [edit, setEdit] = useState(false);
  // Concept; wordt bij het starten van de bewerkmodus gevuld met de opgeslagen versie.
  const [draft, setDraft] = useState<DocData>(opgeslagen);
  const [melding, setMelding] = useMelding();

  function bewerken() {
    setDraft(kloon(opgeslagen));
    setEdit(true);
  }
  function opslaan() {
    const klaar = kloon(draft);
    updateSession((prev) => ({
      documenten: { ...(prev.documenten ?? {}), [tab.sleutel]: klaar },
    }));
    setEdit(false);
    setMelding({ tekst: "Opgeslagen in de sessie ✓", soort: "ok" });
  }
  function annuleren() {
    setDraft(kloon(opgeslagen));
    setEdit(false);
  }
  function herstel() {
    setDraft(kloon(tab.standaard));
    setMelding({ tekst: "Voorstel-tekst teruggezet — klik op Opslaan om dit te bewaren", soort: "info" });
  }

  return (
    <div className="space-y-4" role="tabpanel" aria-label={tab.label}>
      <BewerkBalk
        intro={tab.intro}
        edit={edit}
        melding={melding}
        onBewerken={bewerken}
        onOpslaan={opslaan}
        onAnnuleren={annuleren}
        onHerstel={herstel}
        hint={HINT}
        notitie={
          bewaard
            ? "Aangepaste versie uit deze sessie. De oorspronkelijke voorstel-tekst zet je terug via ✎ Bewerken → Terug naar voorstel-tekst."
            : null
        }
      />

      <BewerkbaarDocument doc={edit ? draft : opgeslagen} edit={edit} onChange={setDraft} />
    </div>
  );
}
