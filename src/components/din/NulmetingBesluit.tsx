"use client";

// Besluiten van de programma-architect die het DIN in de app raken (stap 11), elk met één klik
// door te voeren in stap 3. Via updateSession, dus eerst lokaal en dan naar Supabase, zoals elke
// wijziging in de app. Een besluit dat al is doorgevoerd, toont de balk niet meer; terugdraaien
// kan gewoon in stap 3 (inspanning weghalen, batenprofiel aanpassen).
//
// 1. 30-09-2026: de 0-meting is een inspanning over alle vier domeinen. Domein "overig"
//    (programmabreed), gekoppeld aan de drie vermogens, zoals de inspanningen Mens en Cultuur.
//    Alleen gesourcede gegevens: leider en resultaten uit het organigram, het plan van aanpak en
//    de tijdlijn; kostenraming en eigenaar blijven leeg ("te bepalen").
// 2. 01-10-2026: de bateneigenaren zijn de sectormanagers (in de batenprofielen stond de
//    Commercieel Manager). Per baat: "Sectormanager <sector>".

import { useSession } from "@/lib/session-context";
import { useToast } from "@/components/ui/Toast";
import { createEffort } from "@/lib/din-service";
import type { DINBenefit, DINEffort } from "@/lib/types";

const TITEL = "0-meting: meten van baten en vermogen";
const SECTOREN = ["PO", "VO", "Zakelijk"];

/** Staat de 0-meting al als inspanning in het DIN? */
export function heeftNulmeting(efforts: DINEffort[]): boolean {
  return efforts.some(
    (e) => !e.consolidated && (e.title ?? "").trim().toLowerCase().startsWith("0-meting") && e.domain === "overig"
  );
}

/** De bateneigenaar die bij een baat hoort: de sectormanager van die sector. */
function sectormanager(b: DINBenefit): string {
  return "Sectormanager " + b.sectorId;
}

/** Baten waarvan het batenprofiel nog een andere bateneigenaar noemt. */
export function batenZonderSectormanager(benefits: DINBenefit[]): DINBenefit[] {
  return benefits.filter(
    (b) => SECTOREN.includes(b.sectorId) && (b.profiel?.bateneigenaar ?? "").trim() !== sectormanager(b)
  );
}

function Balk(p: { titel: string; tekst: string; knop: string; on: () => void }) {
  return (
    <div className="flex flex-wrap items-center gap-3 rounded-xl border border-cito-blue/25 bg-[#eef3f9] px-4 py-3">
      <div className="min-w-0 flex-1">
        <p className="text-sm font-bold text-cito-blue">{p.titel}</p>
        <p className="mt-0.5 text-[13px] leading-snug text-gray-700">{p.tekst}</p>
      </div>
      <button
        type="button"
        onClick={p.on}
        className="shrink-0 rounded-lg bg-cito-blue px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-[#004a8f]"
      >
        {p.knop}
      </button>
    </div>
  );
}

export default function NulmetingBesluit() {
  const { session, updateSession } = useSession();
  const { addToast } = useToast();
  if (!session) return null;
  const vermogens = session.capabilities.filter((c) => !c.consolidated);
  const nulmetingOpen = !heeftNulmeting(session.efforts) && vermogens.length > 0;
  const batenOpen = batenZonderSectormanager(session.benefits);
  if (!nulmetingOpen && batenOpen.length === 0) return null;

  function voegNulmetingToe() {
    const basis = createEffort(
      "PO",
      "Het meten van baten en vermogen opbouwen, over alle vier domeinen: meetmodel, 0-meting (startwaarde per baten-KPI en een score per kernprincipe) en tussenmeting. Uitgevoerd door de werkstroom 0-meting.",
      "overig",
      TITEL
    );
    const inspanning: DINEffort = {
      ...basis,
      status: "in_uitvoering",
      quarter: "Nader te bepalen",
      opmerking: "Besluit programma-architect 30-09-2026 (stap 11): de 0-meting is een inspanning over alle vier domeinen.",
      dossier: {
        ...(basis.dossier ?? { eigenaar: "", inspanningsleider: "", verwachtResultaat: "", kostenraming: "", randvoorwaarden: "" }),
        inspanningsleider: "Pim (Cito-lead werkstroom 0-meting; 3sides-lead Sasja)",
        verwachtResultaat:
          "Gevalideerd meetmodel; startwaarde per baten-KPI en een score per kernprincipe (0-meting, oplevering oktober 2026 volgens de tijdlijn); tussenmeting januari–februari 2027 (tijdlijn).",
      },
    };
    try {
      updateSession((prev) => {
        if (heeftNulmeting(prev.efforts)) return {};
        return {
          efforts: [...prev.efforts, inspanning],
          capabilityEffortMaps: [
            ...prev.capabilityEffortMaps,
            ...vermogens.map((c) => ({ capabilityId: c.id, effortId: inspanning.id })),
          ],
        };
      });
      addToast("De 0-meting staat nu in het DIN, als inspanning over alle vier domeinen.", "success");
    } catch (err) {
      addToast("Toevoegen is niet gelukt: " + (err instanceof Error ? err.message : "onbekende fout"), "error");
    }
  }

  function zetSectormanagers() {
    try {
      updateSession((prev) => ({
        benefits: prev.benefits.map((b) =>
          SECTOREN.includes(b.sectorId) ? { ...b, profiel: { ...b.profiel, bateneigenaar: sectormanager(b) } } : b
        ),
      }));
      addToast("De bateneigenaren in de batenprofielen zijn nu de sectormanagers.", "success");
    } catch (err) {
      addToast("Doorvoeren is niet gelukt: " + (err instanceof Error ? err.message : "onbekende fout"), "error");
    }
  }

  return (
    <div className="space-y-2">
      {nulmetingOpen && (
        <Balk
          titel="Besluit 30-09: de 0-meting is een inspanning over alle vier domeinen"
          tekst='Zet haar in het DIN als programmabrede inspanning, gekoppeld aan de drie vermogens. Leider en resultaten komen uit het organigram, het plan van aanpak en de tijdlijn; eigenaar en kostenraming blijven "te bepalen".'
          knop="Toevoegen aan het DIN"
          on={voegNulmetingToe}
        />
      )}
      {batenOpen.length > 0 && (
        <Balk
          titel="Besluit 01-10: de bateneigenaren zijn de sectormanagers"
          tekst={`In ${batenOpen.length === 1 ? "één batenprofiel" : batenOpen.length + " batenprofielen"} staat nog een andere bateneigenaar (${[...new Set(batenOpen.map((b) => (b.profiel?.bateneigenaar ?? "").trim() || "leeg"))].join(", ")}). Zet per baat de sectormanager van die sector.`}
          knop="Doorvoeren in de batenprofielen"
          on={zetSectormanagers}
        />
      )}
    </div>
  );
}
