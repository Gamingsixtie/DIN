"use client";

// Stap 11 — "Programma × 3sides", met twee tabbladen:
// 1. Analyse: programmaplan en Doelen-Inspanningennetwerk (DIN) naast alles wat 3sides
//    heeft opgeleverd (src/lib/integratie-3sides-default.ts).
// 2. Naslag: de kern van alle 3sides-documenten, per document met paginanummer of
//    tabblad (src/lib/kern-3sides-default.ts). Direct te openen met ?stap=integratie&tab=kern.
// Beide per kop en per cel handmatig aanpasbaar; aanpassingen worden in de sessie bewaard
// (session.documenten[sleutel], localStorage-first + Supabase via updateSession).
// Boven de tabbladen de instelling "Vindplaatsen" (session.koppelingen): de map met de
// 3sides-documenten en het Jira-bord. Met een ingevulde map worden alle paginaverwijzingen
// in de documenten links naar het document op die pagina (bron-context.tsx).
// Intern Cito: bewust geen statische of openbare versie.

import { useId, useMemo, useState } from "react";
import { useSession } from "@/lib/session-context";
import type { BewerkbaarDocument as DocData } from "@/lib/schemas";
import { DEFAULT_INTEGRATIE_3SIDES, INTEGRATIE_SLEUTEL } from "@/lib/integratie-3sides-default";
import { DEFAULT_KERN_3SIDES, KERN_3SIDES_SLEUTEL } from "@/lib/kern-3sides-default";
import { kloon, mergeDocument } from "@/lib/bewerkbaar-document";
import BewerkBalk, { useMelding } from "@/components/bewerkbaar/BewerkBalk";
import BewerkbaarDocument from "@/components/bewerkbaar/BewerkbaarDocument";
import { BronProvider, bronUrl } from "@/components/bewerkbaar/bron-context";
import { KNOP } from "@/components/bewerkbaar/stijl";

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

/** Link-knop naast de tabbladen (zelfde maat als de tabbladen). */
const LINKKNOP =
  "ml-auto inline-flex items-center gap-1.5 px-4 py-2 rounded-lg text-sm font-semibold border border-[#003366] bg-white text-[#003366] hover:bg-[#003366] hover:text-white transition-colors";

export default function IntegratieStep() {
  const { session } = useSession();
  const [actief, setActief] = useState(beginTab);
  const tab = TABBLADEN[actief];
  const documentenBasis = session?.koppelingen?.documentenBasis ?? "";
  const jira = (session?.koppelingen?.jira ?? "").trim();

  return (
    <div className="space-y-4">
      <Vindplaatsen />

      <div role="tablist" aria-label="Onderdelen van stap 11" className="flex flex-wrap items-center gap-2">
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
        {jira && (
          <a
            href={jira}
            target="_blank"
            rel="noopener noreferrer"
            className={LINKKNOP}
            title="Opent het Jira-bord van 3sides in een nieuw tabblad"
          >
            Jira-bord <span aria-hidden="true">↗</span>
          </a>
        )}
      </div>
      {/* key: bij wisselen van tabblad start de bewerkstatus opnieuw */}
      <BronProvider documentenBasis={documentenBasis} jira={jira}>
        <DocumentTab key={tab.id} tab={tab} />
      </BronProvider>
    </div>
  );
}

// ---------- vindplaatsen ----------

/** Ziet de link eruit als een map op een schijf? Die kan de browser vanuit de app niet openen. */
function isSchijfpad(s: string): boolean {
  return /^(?:[a-zA-Z]:[\\/]|\\\\|file:)/i.test(s.trim());
}

/**
 * Compacte, inklapbare regel boven de tabbladen: de map met de 3sides-documenten en het
 * Jira-bord. Opslaan bij verlaten van een veld of met de knop; waarden in session.koppelingen.
 */
function Vindplaatsen() {
  const { session, updateSession } = useSession();
  const opgeslagenBasis = session?.koppelingen?.documentenBasis ?? "";
  const opgeslagenJira = session?.koppelingen?.jira ?? "";
  const [basis, setBasis] = useState(opgeslagenBasis);
  const [jira, setJira] = useState(opgeslagenJira);
  // De velden volgen de sessie zodra die (later) laadt of elders verandert.
  const [vorige, setVorige] = useState({ basis: opgeslagenBasis, jira: opgeslagenJira });
  if (vorige.basis !== opgeslagenBasis || vorige.jira !== opgeslagenJira) {
    setVorige({ basis: opgeslagenBasis, jira: opgeslagenJira });
    setBasis(opgeslagenBasis);
    setJira(opgeslagenJira);
  }
  const [open, setOpen] = useState(false);
  const [melding, setMelding] = useMelding();
  const idBasis = useId();
  const idJira = useId();

  const ingevuld = [opgeslagenBasis.trim() && "documentenmap", opgeslagenJira.trim() && "Jira-bord"].filter(Boolean);
  const stand = ingevuld.length === 0 ? "nog niet ingevuld" : ingevuld.join(" en ") + " ingevuld";
  const gewijzigd = basis.trim() !== opgeslagenBasis || jira.trim() !== opgeslagenJira;
  const proef = useMemo(() => bronUrl(basis, "plan-van-aanpak", 2), [basis]);

  function opslaan(alleenBijWijziging: boolean) {
    if (alleenBijWijziging && !gewijzigd) return;
    const b = basis.trim();
    const j = jira.trim();
    updateSession((prev) => ({ koppelingen: { ...(prev.koppelingen ?? {}), documentenBasis: b, jira: j } }));
    setMelding({ tekst: "Opgeslagen in de sessie ✓", soort: "ok" });
  }

  return (
    <section className="rounded-xl border border-cito-border bg-white" aria-label="Vindplaatsen">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        aria-expanded={open}
        className="flex w-full flex-wrap items-center gap-x-3 gap-y-1 px-4 py-2.5 text-left"
      >
        <span className="text-sm font-semibold text-[#003366]">
          <span aria-hidden="true" className="mr-1.5 inline-block text-xs">
            {open ? "▾" : "▸"}
          </span>
          Vindplaatsen
        </span>
        <span className="text-xs text-gray-500">{stand}</span>
        {!open && ingevuld.length < 2 && (
          <span className="text-xs text-gray-400">
            · vul de links in en paginaverwijzingen worden klikbaar
          </span>
        )}
      </button>

      {open && (
        <div className="space-y-3 border-t border-cito-border px-4 pb-4 pt-3">
          <p className="text-xs text-gray-600">
            Vul de link in; alle paginaverwijzingen in dit stuk worden dan links naar het document op die pagina.
            Gebruik een weblink naar de map (bijvoorbeeld SharePoint of OneDrive); de bestandsnaam komt er automatisch achter.
          </p>
          <div className="grid gap-3 md:grid-cols-2">
            <label htmlFor={idBasis} className="block text-xs font-semibold text-gray-700">
              Map met de 3sides-documenten (link)
              <input
                id={idBasis}
                type="url"
                value={basis}
                onChange={(e) => setBasis(e.target.value)}
                onBlur={() => opslaan(true)}
                placeholder="https://…/3sides input"
                spellCheck={false}
                className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm font-normal text-gray-900 focus:border-[#003366] focus:outline-none focus:ring-1 focus:ring-[#003366]"
              />
            </label>
            <label htmlFor={idJira} className="block text-xs font-semibold text-gray-700">
              Jira-bord (link)
              <input
                id={idJira}
                type="url"
                value={jira}
                onChange={(e) => setJira(e.target.value)}
                onBlur={() => opslaan(true)}
                placeholder="https://….atlassian.net/jira/…"
                spellCheck={false}
                className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm font-normal text-gray-900 focus:border-[#003366] focus:outline-none focus:ring-1 focus:ring-[#003366]"
              />
            </label>
          </div>
          {isSchijfpad(basis) && (
            <p className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-900" role="note">
              Dit is een map op een schijf. Zo&apos;n link kan de browser vanuit de app niet openen; gebruik de weblink van
              de map (SharePoint of OneDrive: Kopieer koppeling).
            </p>
          )}
          <div className="flex flex-wrap items-center gap-3">
            <button
              type="button"
              onClick={() => opslaan(false)}
              className={`${KNOP} bg-cito-blue text-white hover:bg-cito-blue/90`}
            >
              Opslaan
            </button>
            {proef && (
              <a
                href={proef}
                target="_blank"
                rel="noopener noreferrer"
                className="text-xs text-[#003366] underline decoration-dotted underline-offset-2 hover:decoration-solid"
                title={proef}
              >
                Test: open plan van aanpak p. 2 <span aria-hidden="true">↗</span>
              </a>
            )}
            {melding && (
              <span
                role="status"
                className={`text-xs rounded-lg px-3 py-1.5 border ${
                  melding.soort === "ok"
                    ? "bg-emerald-50 border-emerald-200 text-emerald-800"
                    : "bg-blue-50 border-blue-200 text-blue-800"
                }`}
              >
                {melding.tekst}
              </span>
            )}
          </div>
        </div>
      )}
    </section>
  );
}

// ---------- document ----------

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
