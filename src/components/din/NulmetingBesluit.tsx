"use client";

// Besluit van de programma-architect (30-09-2026, stap 11): de 0-meting is een inspanning over
// alle vier domeinen. Deze balk zet die inspanning met één klik in het DIN: domein "overig"
// (programmabreed), gekoppeld aan de drie vermogens, zoals de inspanningen Mens en Cultuur.
// Via updateSession, dus eerst lokaal en dan naar Supabase, zoals elke wijziging in de app.
// Staat de inspanning er al, dan toont de balk niets. Weghalen kan gewoon in stap 3 (DIN-Mapping).
// Alleen gesourcede gegevens: leider en resultaten uit het organigram, het plan van aanpak en
// de tijdlijn; kostenraming en eigenaar blijven leeg ("te bepalen").

import { useSession } from "@/lib/session-context";
import { useToast } from "@/components/ui/Toast";
import { createEffort } from "@/lib/din-service";
import type { DINEffort } from "@/lib/types";

const TITEL = "0-meting: meten van baten en vermogen";

/** Staat de 0-meting al als inspanning in het DIN? */
export function heeftNulmeting(efforts: DINEffort[]): boolean {
  return efforts.some(
    (e) => !e.consolidated && (e.title ?? "").trim().toLowerCase().startsWith("0-meting") && e.domain === "overig"
  );
}

export default function NulmetingBesluit() {
  const { session, updateSession } = useSession();
  const { addToast } = useToast();
  if (!session || heeftNulmeting(session.efforts)) return null;
  const vermogens = session.capabilities.filter((c) => !c.consolidated);
  if (vermogens.length === 0) return null;

  function voegToe() {
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
      addToast(
        "Toevoegen is niet gelukt: " + (err instanceof Error ? err.message : "onbekende fout"),
        "error"
      );
    }
  }

  return (
    <div className="flex flex-wrap items-center gap-3 rounded-xl border border-cito-blue/25 bg-[#eef3f9] px-4 py-3">
      <div className="min-w-0 flex-1">
        <p className="text-sm font-bold text-cito-blue">
          Besluit 30-09: de 0-meting is een inspanning over alle vier domeinen
        </p>
        <p className="mt-0.5 text-[13px] leading-snug text-gray-700">
          Zet haar in het DIN als programmabrede inspanning, gekoppeld aan de drie vermogens. Leider en resultaten komen uit
          het organigram, het plan van aanpak en de tijdlijn; eigenaar en kostenraming blijven &quot;te bepalen&quot;.
        </p>
      </div>
      <button
        type="button"
        onClick={voegToe}
        className="shrink-0 rounded-lg bg-cito-blue px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-[#004a8f]"
      >
        Toevoegen aan het DIN
      </button>
    </div>
  );
}
