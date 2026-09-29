"use client";

// Stap 11 — "Programma × 3sides": integratie-analyse van het programmaplan en het
// Doelen-Inspanningennetwerk (DIN) naast alles wat 3sides heeft opgeleverd, per kop
// en per cel handmatig aanpasbaar. De standaardinhoud staat in
// src/lib/integratie-3sides-default.ts; aanpassingen worden in de sessie bewaard
// (session.documenten[INTEGRATIE_SLEUTEL], localStorage-first + Supabase via
// updateSession). Intern Cito: bewust geen statische of openbare versie.

import { useMemo, useState } from "react";
import { useSession } from "@/lib/session-context";
import type { BewerkbaarDocument as DocData } from "@/lib/schemas";
import { DEFAULT_INTEGRATIE_3SIDES, INTEGRATIE_SLEUTEL } from "@/lib/integratie-3sides-default";
import { kloon, mergeDocument } from "@/lib/bewerkbaar-document";
import BewerkBalk, { useMelding } from "@/components/bewerkbaar/BewerkBalk";
import BewerkbaarDocument from "@/components/bewerkbaar/BewerkbaarDocument";

export default function IntegratieStep() {
  const { session, updateSession } = useSession();
  const bewaard = session?.documenten?.[INTEGRATIE_SLEUTEL];
  const opgeslagen = useMemo(() => mergeDocument(DEFAULT_INTEGRATIE_3SIDES, bewaard), [bewaard]);
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
      documenten: { ...(prev.documenten ?? {}), [INTEGRATIE_SLEUTEL]: klaar },
    }));
    setEdit(false);
    setMelding({ tekst: "Opgeslagen in de sessie ✓", soort: "ok" });
  }
  function annuleren() {
    setDraft(kloon(opgeslagen));
    setEdit(false);
  }
  function herstel() {
    setDraft(kloon(DEFAULT_INTEGRATIE_3SIDES));
    setMelding({ tekst: "Voorstel-tekst teruggezet — klik op Opslaan om dit te bewaren", soort: "info" });
  }

  return (
    <div className="space-y-4">
      <BewerkBalk
        intro="Integratie-analyse: programmaplan en Doelen-Inspanningennetwerk (DIN) naast alles wat 3sides heeft opgeleverd. Intern Cito, ter voorbereiding van de sessie van maandag. Namen en teksten pas je per kop zelf aan; aanpassingen worden in deze sessie bewaard."
        edit={edit}
        melding={melding}
        onBewerken={bewerken}
        onOpslaan={opslaan}
        onAnnuleren={annuleren}
        onHerstel={herstel}
        hint="Bewerkmodus: de gele velden zijn aanpasbaar; met × en + haal je secties, regels, rijen, kaarten en lagen weg of voeg je ze toe. Niets wordt bewaard tot je op Opslaan klikt."
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
