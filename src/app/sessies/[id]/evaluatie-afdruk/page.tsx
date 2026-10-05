"use client";

// Afdrukweergave van het tabblad "Evaluatie 3sides" (stap 11): /sessies/<id>/evaluatie-afdruk
// ?versie=intern|3sides (standaard intern), met &afdrukken=1 opent het afdrukvenster vanzelf.
// De PDF maak je met het afdrukvenster van de browser (Bestemming: Opslaan als PDF).
//
// De sessie komt uit dezelfde bron als de sessiepagina: eerst localStorage (din_session_<id>,
// zie persistence.ts), en alleen als die er niet is uit Supabase. Deze pagina leest alleen:
// geen SessionProvider, geen opslag, ook niet als Supabase een nieuwere versie heeft (de
// sessiepagina neemt die over; hier telt wat in deze browser op het tabblad staat). Verandert
// de sessie in een ander tabblad, dan volgt deze weergave (storage-gebeurtenis).

import { Suspense, useEffect, useMemo, useState, useSyncExternalStore } from "react";
import type { ReactNode } from "react";
import { useParams, useSearchParams } from "next/navigation";
import type { DINSession } from "@/lib/types";
import { loadSessionFromSupabase } from "@/lib/persistence";
import type { ExportVersie } from "@/lib/evaluatie-uitsnede";
import Afdruk from "./Afdruk";
import { afdrukCss } from "./stijl";

/** Sleutel van de sessie in localStorage: het voorvoegsel "din_" van persistence.ts plus session_<id>. */
function sleutel(id: string): string {
  return "din_session_" + id;
}

function volgOpslag(bijWijziging: () => void): () => void {
  window.addEventListener("storage", bijWijziging);
  return () => window.removeEventListener("storage", bijWijziging);
}

/** De sessie als tekst uit localStorage (alleen lezen); null als ze er niet is of opslag niet kan. */
function leesOpslag(id: string): string | null {
  try {
    return window.localStorage.getItem(sleutel(id));
  } catch {
    return null;
  }
}

function ontleed(ruw: string | null): DINSession | null {
  if (!ruw) return null;
  try {
    return JSON.parse(ruw) as DINSession;
  } catch {
    return null;
  }
}

function Melding({ titel, children }: { titel: string; children: ReactNode }) {
  return (
    <div className="evp">
      <style>{afdrukCss("")}</style>
      <div className="evp-melding" role="status">
        <h1>{titel}</h1>
        {children}
      </div>
    </div>
  );
}

function AfdrukPagina() {
  const { id } = useParams<{ id: string }>();
  const zoek = useSearchParams();
  const versie: ExportVersie = zoek.get("versie") === "3sides" ? "3sides" : "intern";
  const afdrukken = zoek.get("afdrukken") === "1";

  // localStorage eerst; op de server (en bij het eerste tekenen) is er nog niets.
  const ruw = useSyncExternalStore(
    volgOpslag,
    () => leesOpslag(id),
    () => null
  );
  const lokaal = useMemo(() => ontleed(ruw), [ruw]);

  // Alleen zonder lokale sessie: uit Supabase lezen (niets bewaren).
  const [remote, setRemote] = useState<{ id: string; session: DINSession | null } | null>(null);
  useEffect(() => {
    if (lokaal || !id) return;
    let actief = true;
    void loadSessionFromSupabase(id).then((s) => {
      if (actief) setRemote({ id, session: s });
    });
    return () => {
      actief = false;
    };
  }, [id, lokaal]);

  const session = lokaal ?? (remote && remote.id === id ? remote.session : null);
  const terug = `/sessies/${encodeURIComponent(id)}?stap=integratie&tab=evaluatie`;

  if (!session) {
    const gezocht = !lokaal && remote !== null && remote.id === id;
    return gezocht ? (
      <Melding titel="Deze sessie is hier niet gevonden">
        <p>
          De afdrukweergave leest de sessie uit deze browser. Open de sessie eerst in de app en kies daar op het tabblad
          Evaluatie 3sides opnieuw voor PDF.
        </p>
        <p>
          <a className="evp-terug" href={terug}>
            ← Naar de sessie
          </a>
        </p>
      </Melding>
    ) : (
      <Melding titel="Afdrukweergave laden…">
        <p>De evaluatie wordt klaargezet.</p>
      </Melding>
    );
  }

  return (
    <div className="evp" data-versie={versie}>
      <Afdruk session={session} versie={versie} afdrukken={afdrukken} />
    </div>
  );
}

export default function EvaluatieAfdrukPage() {
  return (
    <Suspense fallback={null}>
      <AfdrukPagina />
    </Suspense>
  );
}
