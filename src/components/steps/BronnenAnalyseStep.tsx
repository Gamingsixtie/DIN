"use client";

// Stap 12 — "Bronnenanalyse".
// Doel (opdracht Sanne, 12-10): per werkstroom zicht op wat we al hebben, wat daarvan
// bruikbaar is en wat nog ontbreekt — actiegericht, zodat duidelijk wordt wat nu al in
// gang kan. Vijf tabbladen (componenten in src/components/bronnen/):
// 1. Bronnenregister: alle bronnen (3sides-documenten, Miro-borden, mail, uploads) met
//    type, datum, herkomst, versie en status; bron toevoegen (upload, plak tekst, registreren).
// 2. Analyse per bron: wat elke bron dekt per werkstroom, met citaat en vindplaats;
//    bewerkbaar, plus de wachtrij "Analyseer nieuwe bronnen".
// 3. Dekking per werkstroom: oordeel (voorstel) en de matrix al / bruikbaar / nog nodig.
// 4. De vier punten: wat er al is voor de vier punten van Sanne, en wat nog te doen is.
// 5. Acties: wat nu in gang kan, wat nog nodig is en voorstellen uit de analyse.
// Direct te openen met ?stap=bronnen&tab=<antwoord|register|analyse|dekking|punten|acties>.
//
// Deze stap is de ENIGE schrijver van session.bronnenAnalyse (de tabbladen krijgen alles via
// props). Opslag: schrijf() → updateSession (localStorage eerst, dan Supabase); na een
// AI-batch of upload ook saveNow(). Nooit lege state opslaan. De wachtrij werkt op een ref
// met de laatste waarde, zodat bron 2 de uitkomst van bron 1 niet overschrijft.
// Geplakte tekst blijft alleen in het geheugen; de sessie bevat nooit documenttekst.

import { useEffect, useMemo, useRef, useState } from "react";
import { useSession } from "@/lib/session-context";
import type { Bron, BronHerkomst, BronnenAnalyse, SessieDocument } from "@/lib/schemas";
import { mergeOrganigram } from "@/lib/organigram-default";
import { mergeBronnenAnalyse } from "@/lib/bronnenanalyse-default";
import {
  bronTypeUitBestandsnaam,
  bronnenZonderAnalyse,
  maakBronId,
  pasAnalyseToe,
  type AnalyseerBronRequest,
  type AnalyseerBronResponse,
  type ParseBronResponse,
  type WachtrijItem,
  type WachtrijStatus,
} from "@/lib/bronnenanalyse-service";
import BronnenRegisterTab, { MeldingRegel, Spinner, vandaagIso, type Melding } from "@/components/bronnen/BronnenRegisterTab";
import BronAnalysePaneel from "@/components/bronnen/BronAnalysePaneel";
import DekkingMatrixTab from "@/components/bronnen/DekkingMatrixTab";
import VierPuntenTab from "@/components/bronnen/VierPuntenTab";
import ActiesTab from "@/components/bronnen/ActiesTab";
import AntwoordDoelTab from "@/components/bronnen/AntwoordDoelTab";
import BronnenExport from "@/components/bronnen/BronnenExport";

const TABBLADEN = [
  { id: "antwoord", label: "Antwoord op het doel" },
  { id: "register", label: "Bronnenregister" },
  { id: "analyse", label: "Analyse per bron" },
  { id: "dekking", label: "Dekking per werkstroom" },
  { id: "punten", label: "De vier punten" },
  { id: "acties", label: "Acties" },
] as const;

function beginTab(): number {
  if (typeof window === "undefined") return 0;
  const i = TABBLADEN.findIndex((t) => t.id === new URLSearchParams(window.location.search).get("tab"));
  return i < 0 ? 0 : i;
}

/** Zet het tabblad in de url, zonder navigatie; ?stap=bronnen erbij zodat de link na herladen klopt. */
function zetUrl(tabId: string) {
  const url = new URL(window.location.href);
  url.searchParams.set("stap", "bronnen");
  url.searchParams.set("tab", tabId);
  window.history.replaceState(window.history.state, "", url);
}

const MAX_MB = 25;
const MAX_BYTES = MAX_MB * 1024 * 1024;
const OPSLAG_FOUT = "Opslaan in de database mislukt; lokaal bewaard.";
const GEEN_BESTAND =
  "Geen bestand of tekst gekoppeld — upload het bestand of gebruik 'Plak tekst'.";
const GEEN_SLEUTEL =
  "De AI-analyse is niet beschikbaar: er is geen API-sleutel ingesteld. Registreren en handmatig bewerken werkt wel.";
const GEEN_ANTWOORD = "De analyse duurde te lang of de server gaf geen antwoord";
const GEEN_ANTWOORD_LEZEN = "Het lezen van het bestand duurde te lang of de server gaf geen antwoord";

/** Publieke storage-url van het eigen Supabase-project; alleen daarvandaan mag de parse-route lezen. */
const STORAGE_PREFIX = (() => {
  const basis = (process.env.NEXT_PUBLIC_SUPABASE_URL ?? "").trim().replace(/\/+$/, "");
  return basis ? `${basis}/storage/v1/object/public/` : "";
})();

/** JSON van een antwoord; bij een antwoord zonder JSON (bijv. te groot verzoek) null. */
async function leesJson<T>(res: Response): Promise<T | null> {
  try {
    return (await res.json()) as T;
  } catch {
    return null;
  }
}

function zonderExtensie(naam: string): string {
  const i = naam.lastIndexOf(".");
  return i > 0 ? naam.slice(0, i) : naam;
}

/** Is er iets om op te slaan? (CLAUDE.md: nooit lege state wegschrijven.) */
function heeftInhoud(ba: BronnenAnalyse): boolean {
  return (
    ba.bronnen.length > 0 || ba.nogNodig.length > 0 || ba.kanNuInGang.length > 0 || ba.werkstroomOordelen.length > 0
  );
}

export default function BronnenAnalyseStep() {
  const { session, updateSession, saveNow } = useSession();
  const [actief, setActief] = useState(beginTab);
  const tab = TABBLADEN[actief];

  const ba = useMemo(
    () => mergeBronnenAnalyse(session?.bronnenAnalyse as Partial<BronnenAnalyse> | undefined),
    [session?.bronnenAnalyse],
  );
  const organigramWerkstromen = useMemo(() => mergeOrganigram(session?.organigram).werkstromen, [session?.organigram]);
  const werkstromen = useMemo(
    () => organigramWerkstromen.map((w) => ({ id: w.id, naam: w.naam })),
    [organigramWerkstromen],
  );

  // Laatste waarde voor de (asynchrone) wachtrij en uploads.
  const baRef = useRef<BronnenAnalyse>(ba);
  useEffect(() => {
    baRef.current = ba;
  }, [ba]);
  const documentenRef = useRef<SessieDocument[]>(session?.sessieDocumenten ?? []);
  useEffect(() => {
    documentenRef.current = session?.sessieDocumenten ?? [];
  }, [session?.sessieDocumenten]);
  const werkstromenRef = useRef(organigramWerkstromen);
  useEffect(() => {
    werkstromenRef.current = organigramWerkstromen;
  }, [organigramWerkstromen]);

  const [geselecteerdeBronId, setGeselecteerdeBronId] = useState<string | null>(null);
  const [uploadBezig, setUploadBezig] = useState(false);
  const [uploadMelding, setUploadMelding] = useState<Melding | null>(null);
  const [wachtrij, setWachtrij] = useState<WachtrijItem[]>([]);
  const [wachtrijBezig, setWachtrijBezig] = useState(false);
  const [stapMelding, setStapMelding] = useState<Melding | null>(null);
  const [opslagMelding, setOpslagMelding] = useState<Melding | null>(null);

  function kies(i: number) {
    zetUrl(TABBLADEN[i].id);
    setActief(i);
  }

  function openBron(id: string) {
    setGeselecteerdeBronId(id);
    kies(TABBLADEN.findIndex((t) => t.id === "analyse"));
  }

  /** Schrijft de bronnenanalyse (localStorage eerst via updateSession). false = niet geschreven. */
  function schrijf(nieuw: BronnenAnalyse): boolean {
    if (!heeftInhoud(nieuw)) {
      console.error("[bronnenanalyse] lege bronnenanalyse niet opgeslagen");
      setOpslagMelding({ soort: "fout", tekst: "Niet opgeslagen: de bronnenanalyse zou leeg worden." });
      return false;
    }
    baRef.current = nieuw;
    updateSession(() => ({ bronnenAnalyse: nieuw }));
    setOpslagMelding(null);
    return true;
  }

  /** Direct naar Supabase (na AI-batches en uploads); bij een fout een rode melding. */
  async function bewaarDirect(): Promise<boolean> {
    // Eén tick wachten zodat de laatste updateSession verwerkt is.
    await new Promise((r) => setTimeout(r, 0));
    const versie = await saveNow();
    if (versie === false) {
      setOpslagMelding({ soort: "fout", tekst: OPSLAG_FOUT });
      return false;
    }
    return true;
  }

  // ---------- upload ----------

  async function onUpload(file: File, titel: string, herkomst: BronHerkomst): Promise<void> {
    if (!session) return;
    if (file.size > MAX_BYTES) {
      setUploadMelding({ soort: "fout", tekst: `Het bestand is te groot (maximaal ${MAX_MB} MB).` });
      return;
    }
    setUploadBezig(true);
    setUploadMelding(null);
    try {
      const form = new FormData();
      form.append("file", file);
      form.append("sessionId", session.id);
      const res = await fetch("/api/sessie-document", { method: "POST", body: form });
      const json = await leesJson<{
        success?: boolean;
        error?: string;
        data?: { pad?: string; url?: string; grootte?: number; type?: string };
      }>(res);
      if (!res.ok || !json?.success || !json.data?.pad || !json.data.url) {
        const fout =
          json?.error ??
          (res.status === 413 ? `Het bestand is te groot voor de server (maximaal ${MAX_MB} MB).` : `Uploaden mislukt (${res.status}).`);
        throw new Error(fout);
      }
      const nu = new Date().toISOString();
      const schoneTitel = titel.trim() || zonderExtensie(file.name) || file.name;
      const doc: SessieDocument = {
        id: crypto.randomUUID(),
        titel: schoneTitel,
        bestandsnaam: file.name,
        pad: json.data.pad,
        url: json.data.url,
        grootte: json.data.grootte ?? file.size,
        type: json.data.type || file.type || "",
        door: "",
        datum: nu,
        hoortBij: "Programmabreed",
        opmerking: "Toegevoegd via Bronnenanalyse",
      };
      const huidig = baRef.current;
      const bron: Bron = {
        id: maakBronId(schoneTitel, huidig.bronnen.map((b) => b.id)),
        titel: schoneTitel,
        bestandsnaam: file.name,
        type: bronTypeUitBestandsnaam(file.name),
        datum: vandaagIso(),
        herkomst,
        sessieDocumentId: doc.id,
        url: doc.url,
        bewerkt: false,
        verwijderd: false,
      };
      const nieuw: BronnenAnalyse = { ...huidig, bronnen: [...huidig.bronnen, bron] };
      // Document en bron in één schrijfactie (localStorage eerst).
      baRef.current = nieuw;
      documentenRef.current = [doc, ...documentenRef.current];
      updateSession((prev) => ({
        sessieDocumenten: [doc, ...(prev.sessieDocumenten ?? [])],
        bronnenAnalyse: nieuw,
      }));
      setUploadMelding({ soort: "klaar", tekst: "Bron toegevoegd. Klik op 'Analyseer nieuwe bronnen' om hem te laten analyseren." });
      await bewaarDirect();
    } catch (err) {
      const tekst =
        err instanceof TypeError || !(err instanceof Error) || !err.message
          ? "Uploaden mislukt: geen verbinding met de server."
          : err.message;
      console.error("[bronnenanalyse] upload", err);
      setUploadMelding({ soort: "fout", tekst });
    } finally {
      setUploadBezig(false);
    }
  }

  // ---------- plak tekst ----------

  async function onPlakTekst(titel: string, tekst: string): Promise<void> {
    const huidig = baRef.current;
    const bron: Bron = {
      id: maakBronId(titel, huidig.bronnen.map((b) => b.id)),
      titel: titel.trim(),
      bestandsnaam: "",
      type: "txt",
      datum: vandaagIso(),
      herkomst: "anders",
      bewerkt: false,
      verwijderd: false,
    };
    if (!schrijf({ ...huidig, bronnen: [...huidig.bronnen, bron] })) return;
    setUploadMelding({ soort: "klaar", tekst: `"${bron.titel}" toegevoegd; de analyse loopt.` });
    openBron(bron.id);
    // De geplakte tekst gaat alleen naar de analyse en wordt niet bewaard.
    await analyseerBronnen([bron.id], { tekstPerBron: { [bron.id]: tekst } });
  }

  // ---------- wachtrij ----------

  function zetStatus(bronId: string, status: WachtrijStatus, melding?: string) {
    setWachtrij((w) => w.map((x) => (x.bronId === bronId ? { ...x, status, melding } : x)));
  }

  async function haalTekst(bron: Bron, tekstPerBron?: Record<string, string>): Promise<{ tekst: string } | { fout: string }> {
    const geplakt = tekstPerBron?.[bron.id];
    if (geplakt !== undefined) return { tekst: geplakt };

    const doc = bron.sessieDocumentId ? documentenRef.current.find((d) => d.id === bron.sessieDocumentId) : undefined;
    const eigenUrl = bron.url && STORAGE_PREFIX && bron.url.startsWith(STORAGE_PREFIX) ? bron.url : undefined;
    const url = doc?.url ?? eigenUrl;
    if (!url) return { fout: GEEN_BESTAND };

    const res = await fetch("/api/parse-bron", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ url, bestandsnaam: bron.bestandsnaam || doc?.bestandsnaam || bron.titel }),
    });
    const json = await leesJson<ParseBronResponse>(res);
    if (!json) {
      console.error("[bronnenanalyse] parse zonder JSON-antwoord", res.status);
      return { fout: `${GEEN_ANTWOORD_LEZEN} (${res.status}).` };
    }
    if (!json.success) return { fout: json.error };
    return { tekst: json.rawText };
  }

  async function analyseerBronnen(
    ids: string[],
    opts: { tekstPerBron?: Record<string, string>; forceer?: boolean } = {},
  ): Promise<void> {
    if (ids.length === 0 || wachtrijBezig) return;
    setWachtrij(ids.map((bronId) => ({ bronId, status: "wacht" as WachtrijStatus })));
    setWachtrijBezig(true);
    setStapMelding(null);
    let klaar = 0;
    let mislukt = 0;
    let geenSleutel = false;

    for (let i = 0; i < ids.length; i++) {
      const id = ids[i];
      const bron = baRef.current.bronnen.find((b) => b.id === id);
      if (!bron) {
        zetStatus(id, "fout", "Bron niet gevonden.");
        mislukt += 1;
        continue;
      }
      zetStatus(id, "bezig");
      try {
        const t = await haalTekst(bron, opts.tekstPerBron);
        if ("fout" in t) {
          zetStatus(id, "fout", t.fout);
          mislukt += 1;
          continue;
        }

        const body: AnalyseerBronRequest = {
          bron: { id: bron.id, titel: bron.titel, bestandsnaam: bron.bestandsnaam ?? "", type: bron.type, datum: bron.datum ?? "" },
          tekst: t.tekst,
          // Uit het organigram, zodat bewerkingen van stap 10 doorwerken.
          werkstromen: werkstromenRef.current.map((w) => ({ id: w.id, naam: w.naam, landtIn: w.landtIn })),
        };
        const res = await fetch("/api/analyseer-bron", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(body),
        });
        const json = await leesJson<AnalyseerBronResponse>(res);
        if (!json) {
          // Geen JSON-body: typisch een time-out (504) of storing van het platform.
          console.error("[bronnenanalyse] analyse zonder JSON-antwoord", res.status);
          zetStatus(id, "fout", `${GEEN_ANTWOORD} (${res.status}).`);
          mislukt += 1;
          continue;
        }
        if (!json.success) {
          if (json.code === "geen_api_key") {
            // Zonder sleutel heeft doorgaan geen zin: één melding bovenaan de stap, niet per bron.
            geenSleutel = true;
            break;
          }
          zetStatus(id, "fout", json.error);
          mislukt += 1;
          continue;
        }

        // pasAnalyseToe beschermt alleen een bestaande, handmatig bewerkte analyse.
        if (!schrijf(pasAnalyseToe(baRef.current, id, json.analyse, { forceer: opts.forceer === true }))) {
          zetStatus(id, "fout", "Niet opgeslagen.");
          mislukt += 1;
          continue;
        }
        zetStatus(id, "klaar");
        klaar += 1;
      } catch (err) {
        console.error("[bronnenanalyse] analyse", err);
        zetStatus(id, "fout", "Verbinding mislukt");
        mislukt += 1;
      }
    }

    setWachtrijBezig(false);
    if (geenSleutel) {
      // De niet-verwerkte bronnen blijven gewoon "Niet geanalyseerd"; geen herhaalde foutregels.
      setWachtrij((w) => w.filter((x) => x.status === "klaar" || x.status === "fout"));
      setStapMelding({
        soort: "fout",
        tekst:
          klaar + mislukt > 0
            ? `${GEEN_SLEUTEL} (${klaar} geanalyseerd, ${mislukt} mislukt vóór deze melding.)`
            : GEEN_SLEUTEL,
      });
    } else {
      setStapMelding({
        soort: mislukt > 0 ? "fout" : "klaar",
        tekst: `${klaar} geanalyseerd, ${mislukt} mislukt.`,
      });
    }
    if (klaar > 0) await bewaarDirect();
  }

  function onAnalyseerNieuw() {
    void analyseerBronnen(bronnenZonderAnalyse(baRef.current).map((b) => b.id));
  }

  function onHeranalyseer(id: string) {
    // De bevestiging bij een handmatig bewerkte bron zit al in het paneel.
    void analyseerBronnen([id], { forceer: true });
  }

  const klaarAantal = wachtrij.filter((w) => w.status === "klaar" || w.status === "fout").length;

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="min-w-0 flex-1">
          <h2 className="text-2xl font-bold text-[#003366]">Bronnenanalyse</h2>
          <p className="mt-1 text-sm text-gray-700">
            Alle bronnen op een rij: wat we per werkstroom al hebben, wat daarvan bruikbaar is en wat nog ontbreekt — en
            wat nu al in gang kan.
          </p>
        </div>
        {/* Word-export, zichtbaar op elk tabblad. */}
        <div className="w-full lg:w-auto lg:max-w-sm">
          <BronnenExport />
        </div>
      </div>

      <div role="tablist" aria-label="Onderdelen van stap 12" className="flex flex-wrap items-center gap-2">
        {TABBLADEN.map((t, i) => (
          <button
            key={t.id}
            type="button"
            role="tab"
            aria-selected={i === actief}
            onClick={() => kies(i)}
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

      {wachtrijBezig && tab.id !== "analyse" && (
        <p role="status" className="flex items-center gap-2 rounded-lg border border-[#003366]/40 bg-blue-50 px-3 py-2 text-sm font-semibold text-[#003366]">
          <Spinner /> Analyse loopt: {klaarAantal} van {wachtrij.length} verwerkt
        </p>
      )}
      <MeldingRegel melding={stapMelding} />
      <MeldingRegel melding={opslagMelding} />

      <div role="tabpanel" aria-label={tab.label}>
        {tab.id === "antwoord" && <AntwoordDoelTab ba={ba} onNaarTab={(id) => kies(TABBLADEN.findIndex((x) => x.id === id))} />}
        {tab.id === "register" && (
          <BronnenRegisterTab
            ba={ba}
            onWijzig={schrijf}
            onUpload={onUpload}
            onPlakTekst={onPlakTekst}
            bezig={uploadBezig || wachtrijBezig}
            melding={uploadMelding}
            onOpenAnalyse={openBron}
          />
        )}
        {tab.id === "analyse" && (
          <BronAnalysePaneel
            ba={ba}
            onWijzig={schrijf}
            werkstromen={werkstromen}
            geselecteerdeBronId={geselecteerdeBronId}
            onSelecteer={setGeselecteerdeBronId}
            wachtrij={wachtrij}
            wachtrijBezig={wachtrijBezig}
            onAnalyseerNieuw={onAnalyseerNieuw}
            onHeranalyseer={onHeranalyseer}
          />
        )}
        {tab.id === "dekking" && (
          <DekkingMatrixTab ba={ba} onWijzig={schrijf} werkstromen={werkstromen} onOpenBron={openBron} />
        )}
        {tab.id === "punten" && <VierPuntenTab ba={ba} onWijzig={schrijf} werkstromen={werkstromen} onOpenBron={openBron} />}
        {tab.id === "acties" && <ActiesTab ba={ba} onWijzig={schrijf} werkstromen={werkstromen} onOpenBron={openBron} />}
      </div>
    </div>
  );
}
