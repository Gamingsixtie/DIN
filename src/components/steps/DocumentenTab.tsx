"use client";

// Stap 11 — tabblad "Documenten": documenten die het team later nog nodig heeft (verslagen,
// besluiten, versies van opleveringen van 3sides). Het bestand gaat via de serverroute
// /api/sessie-document naar Supabase Storage (bucket "sessie-documenten"); de gegevens erover
// (titel, door, hoort bij, opmerking, link) staan in session.sessieDocumenten en worden via
// updateSession bewaard (localStorage-first, daarna Supabase): iedereen met de link van de
// sessie ziet dezelfde lijst. Een document komt pas in de lijst na een geslaagde upload;
// verwijderen haalt eerst het bestand weg en pas daarna de regel uit de sessie — mislukt dat,
// dan blijft de regel staan. De naam in "Door" onthoudt de browser (localStorage).

import { useId, useMemo, useRef, useState, type ChangeEvent, type FormEvent, type ReactNode } from "react";
import { useSession } from "@/lib/session-context";
import { useToast } from "@/components/ui/Toast";
import type { SessieDocument } from "@/lib/schemas";
import { KNOP } from "@/components/bewerkbaar/stijl";

const MAX_MB = 25;
const MAX_BYTES = MAX_MB * 1024 * 1024;
/** localStorage-sleutel voor de naam in het veld "Door". */
const DOOR_SLEUTEL = "din_documenten_door";

/** Waar een document bij hoort: programmabreed, een van de werkstromen, of anders. */
const HOORT_BIJ = [
  "Programmabreed",
  "Adoptieframework",
  "Centrale datavoorziening klantcontact",
  "Klantreizen",
  "0-meting",
  "Anders",
] as const;

const INTRO =
  "Documenten die het team later nog nodig heeft: verslagen, besluiten, versies van opleveringen. Iedereen met de link ziet dezelfde lijst.";

// Huisstijl van stap 11: witte vlakken met een dunne rand, Cito-blauw als enige accent.
const PRIMAIR = `${KNOP} bg-cito-blue text-white hover:bg-cito-blue/90 disabled:cursor-not-allowed disabled:opacity-50`;
const SECUNDAIR = `${KNOP} border border-[#003366] bg-white text-[#003366] hover:bg-[#003366] hover:text-white`;
const KAARTKNOP = "inline-flex items-center gap-1 rounded-lg border px-3 py-1.5 text-sm font-semibold transition-colors";
const KAARTKNOP_OPENEN = `${KAARTKNOP} border-[#003366] bg-white text-[#003366] hover:bg-[#003366] hover:text-white`;
const KAARTKNOP_WEG = `${KAARTKNOP} border-red-200 bg-white text-red-700 hover:border-red-300 hover:bg-red-50`;
const VELD =
  "mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm font-normal text-gray-900 focus:border-[#003366] focus:outline-none focus:ring-1 focus:ring-[#003366]";
const LABEL = "block text-xs font-semibold text-gray-700";

// ---------- hulpfuncties ----------

type Soort = "pdf" | "xlsx" | "docx" | "pptx" | "afbeelding" | "anders";

/** Per bestandssoort: het etiket in het icoon, de kleur en de naam voor schermlezers. */
const SOORTEN: Record<Soort, { label: string; kleur: string; naam: string }> = {
  pdf: { label: "PDF", kleur: "#b91c1c", naam: "PDF-bestand" },
  xlsx: { label: "XLS", kleur: "#047857", naam: "Excel-bestand" },
  docx: { label: "DOC", kleur: "#1d4ed8", naam: "Word-bestand" },
  pptx: { label: "PPT", kleur: "#c2410c", naam: "PowerPoint-bestand" },
  afbeelding: { label: "IMG", kleur: "#6d28d9", naam: "Afbeelding" },
  anders: { label: "", kleur: "#64748b", naam: "Bestand" },
};

/** Bestandssoort op basis van de extensie, anders op het MIME-type. */
function bestandsSoort(naam: string, type: string): Soort {
  const ext = naam.toLowerCase().split(".").pop() ?? "";
  const mime = type.toLowerCase();
  if (ext === "pdf" || mime === "application/pdf") return "pdf";
  if (["xlsx", "xlsm", "xls", "csv"].includes(ext) || mime.includes("spreadsheet") || mime.includes("excel")) return "xlsx";
  if (["docx", "doc", "dotx"].includes(ext) || mime.includes("wordprocessingml") || mime === "application/msword") return "docx";
  if (["pptx", "ppt", "potx"].includes(ext) || mime.includes("presentationml") || mime.includes("powerpoint")) return "pptx";
  if (["png", "jpg", "jpeg", "gif", "webp", "svg", "heic"].includes(ext) || mime.startsWith("image/")) return "afbeelding";
  return "anders";
}

function zonderExtensie(naam: string): string {
  const i = naam.lastIndexOf(".");
  return i > 0 ? naam.slice(0, i) : naam;
}

/** Bestandsgrootte leesbaar, Nederlands: "860 B", "412 kB", "1,2 MB". */
function formatGrootte(bytes?: number): string {
  if (!bytes || bytes <= 0) return "";
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${Math.max(1, Math.round(bytes / 1024))} kB`;
  const mb = bytes / (1024 * 1024);
  return `${mb.toLocaleString("nl-NL", { minimumFractionDigits: 1, maximumFractionDigits: 1 })} MB`;
}

function formatDatum(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "—";
  return d.toLocaleDateString("nl-NL", { day: "numeric", month: "long", year: "numeric" });
}

function onthoudenDoor(): string {
  if (typeof window === "undefined") return "";
  try {
    return window.localStorage.getItem(DOOR_SLEUTEL) ?? "";
  } catch {
    return "";
  }
}

function bewaarDoor(naam: string) {
  try {
    window.localStorage.setItem(DOOR_SLEUTEL, naam.trim());
  } catch {
    // Privémodus of volle opslag: dan onthouden we de naam niet.
  }
}

interface Antwoord {
  success?: boolean;
  error?: string;
  data?: { pad?: string; url?: string; grootte?: number; type?: string };
}

/** Antwoord van de serverroute; bij een antwoord zonder JSON (bijv. een te groot verzoek) null. */
async function leesAntwoord(res: Response): Promise<Antwoord | null> {
  try {
    return (await res.json()) as Antwoord;
  } catch {
    return null;
  }
}

function foutTekst(res: Response, json: Antwoord | null, standaard: string): string {
  if (json?.error) return json.error;
  if (res.status === 413) return `Het bestand is te groot voor de server (maximaal ${MAX_MB} MB).`;
  return `${standaard} (${res.status}).`;
}

/** Netwerkfouten komen in het Engels binnen ("Failed to fetch"); de rest is al Nederlands. */
function foutMelding(err: unknown, standaard: string): string {
  if (err instanceof TypeError || !(err instanceof Error) || !err.message) {
    return `${standaard}: geen verbinding met de server.`;
  }
  return err.message;
}

// ---------- tabblad ----------

export default function DocumentenTab() {
  const { session, updateSession } = useSession();
  const { addToast } = useToast();
  const sessieId = session?.id ?? "";
  const bron = session?.sessieDocumenten;
  const documenten = useMemo(() => [...(bron ?? [])].sort((a, b) => b.datum.localeCompare(a.datum)), [bron]);
  const [filter, setFilter] = useState("");

  // Filterchips: de onderdelen die voorkomen, in de vaste volgorde; onbekende waarden erachter.
  const telling = useMemo(() => {
    const t = new Map<string, number>();
    for (const d of documenten) {
      const bij = d.hoortBij || "Anders";
      t.set(bij, (t.get(bij) ?? 0) + 1);
    }
    const vast: string[] = HOORT_BIJ.filter((h) => t.has(h));
    const rest = [...t.keys()].filter((k) => !vast.includes(k)).sort((a, b) => a.localeCompare(b, "nl"));
    return { opties: [...vast, ...rest], per: t };
  }, [documenten]);
  const actieveFilter = telling.per.has(filter) ? filter : "";
  const getoond = actieveFilter ? documenten.filter((d) => (d.hoortBij || "Anders") === actieveFilter) : documenten;

  function opgeslagen(doc: SessieDocument) {
    updateSession((prev) => ({ sessieDocumenten: [doc, ...(prev.sessieDocumenten ?? [])] }));
    addToast("Document opgeslagen", "success");
  }

  /** Eerst het bestand weg, dan de regel uit de sessie; bij een fout blijft de regel staan. */
  async function verwijderen(doc: SessieDocument): Promise<boolean> {
    try {
      const res = await fetch(`/api/sessie-document?pad=${encodeURIComponent(doc.pad)}`, { method: "DELETE" });
      const json = await leesAntwoord(res);
      if (!res.ok || !json?.success) throw new Error(foutTekst(res, json, "Verwijderen mislukt"));
      updateSession((prev) => ({
        sessieDocumenten: (prev.sessieDocumenten ?? []).filter((d) => d.id !== doc.id),
      }));
      addToast("Document verwijderd", "success");
      return true;
    } catch (err) {
      addToast(foutMelding(err, "Verwijderen mislukt"), "error");
      return false;
    }
  }

  if (!session) return null;

  return (
    <div className="space-y-4" role="tabpanel" aria-label="Documenten">
      <section className="rounded-xl border border-cito-border bg-white px-4 py-3" aria-label="Document toevoegen">
        <h3 className="text-sm font-semibold text-[#003366]">Document toevoegen</h3>
        <p className="mt-1 text-xs text-gray-600">{INTRO}</p>
        <UploadFormulier sessieId={sessieId} onOpgeslagen={opgeslagen} />
      </section>

      <section className="space-y-3" aria-label="Geüploade documenten">
        <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
          <h3 className="text-sm font-semibold text-[#003366]">
            Documenten{" "}
            <span className="font-normal text-gray-600">
              ({documenten.length}
              {actieveFilter && getoond.length !== documenten.length ? `, ${getoond.length} getoond` : ""})
            </span>
          </h3>
          {documenten.length > 0 && (
            <div role="group" aria-label="Filter op onderdeel" className="flex flex-wrap items-center gap-2">
              <Chip actief={actieveFilter === ""} onClick={() => setFilter("")}>
                Alle
              </Chip>
              {telling.opties.map((o) => (
                <Chip key={o} actief={actieveFilter === o} onClick={() => setFilter(o)}>
                  {o} <span className="font-normal opacity-80">({telling.per.get(o)})</span>
                </Chip>
              ))}
            </div>
          )}
        </div>

        {documenten.length === 0 ? (
          <p className="rounded-xl border border-dashed border-gray-300 bg-white px-4 py-6 text-center text-sm text-gray-600">
            Nog geen documenten. Upload het eerste hierboven.
          </p>
        ) : getoond.length === 0 ? (
          <p className="rounded-xl border border-dashed border-gray-300 bg-white px-4 py-6 text-center text-sm text-gray-600">
            Geen documenten bij dit onderdeel.
          </p>
        ) : (
          <ul className="space-y-3">
            {getoond.map((d) => (
              <DocumentKaart key={d.id} doc={d} verwijderen={verwijderen} />
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}

// ---------- uploadformulier ----------

function UploadFormulier({ sessieId, onOpgeslagen }: { sessieId: string; onOpgeslagen: (doc: SessieDocument) => void }) {
  const { addToast } = useToast();
  const [bestand, setBestand] = useState<File | null>(null);
  const [titel, setTitel] = useState("");
  // De titel die uit de bestandsnaam kwam; zolang de titel daaraan gelijk is, volgt ze een nieuw bestand.
  const [autoTitel, setAutoTitel] = useState("");
  const [door, setDoor] = useState(onthoudenDoor);
  const [hoortBij, setHoortBij] = useState<string>(HOORT_BIJ[0]);
  const [opmerking, setOpmerking] = useState("");
  const [bezig, setBezig] = useState(false);
  const bestandRef = useRef<HTMLInputElement>(null);
  const idBestand = useId();
  const idTitel = useId();
  const idDoor = useId();
  const idHoortBij = useId();
  const idOpmerking = useId();

  const teGroot = bestand !== null && bestand.size > MAX_BYTES;
  const kanUploaden = bestand !== null && !teGroot && !bezig && sessieId !== "";

  function kiesBestand(e: ChangeEvent<HTMLInputElement>) {
    const f = e.target.files?.[0] ?? null;
    setBestand(f);
    const nieuw = f ? zonderExtensie(f.name) : "";
    if (titel.trim() === "" || titel === autoTitel) setTitel(nieuw);
    setAutoTitel(nieuw);
  }

  async function uploaden(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!bestand || !kanUploaden) return;
    bewaarDoor(door);
    setBezig(true);
    try {
      const form = new FormData();
      form.append("file", bestand);
      form.append("sessionId", sessieId);
      const res = await fetch("/api/sessie-document", { method: "POST", body: form });
      const json = await leesAntwoord(res);
      if (!res.ok || !json?.success || !json.data?.pad || !json.data.url) {
        throw new Error(foutTekst(res, json, "Uploaden mislukt"));
      }
      // Pas na een geslaagde upload komt het document in de sessie.
      onOpgeslagen({
        id: crypto.randomUUID(),
        titel: titel.trim() || zonderExtensie(bestand.name) || bestand.name,
        bestandsnaam: bestand.name,
        pad: json.data.pad,
        url: json.data.url,
        grootte: json.data.grootte ?? bestand.size,
        type: json.data.type || bestand.type || "",
        door: door.trim(),
        datum: new Date().toISOString(),
        hoortBij,
        opmerking: opmerking.trim(),
      });
      // Klaar voor het volgende document; naam en onderdeel blijven staan.
      setBestand(null);
      setTitel("");
      setAutoTitel("");
      setOpmerking("");
      if (bestandRef.current) bestandRef.current.value = "";
    } catch (err) {
      addToast(foutMelding(err, "Uploaden mislukt"), "error");
    } finally {
      setBezig(false);
    }
  }

  return (
    <form onSubmit={uploaden} className="mt-3 space-y-3">
      <div>
        <span className={LABEL}>Bestand</span>
        <div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-2">
          <input
            ref={bestandRef}
            id={idBestand}
            type="file"
            onChange={kiesBestand}
            disabled={bezig}
            className="peer sr-only"
            aria-describedby={`${idBestand}-hint`}
          />
          <label
            htmlFor={idBestand}
            className={`${SECUNDAIR} cursor-pointer peer-focus-visible:ring-2 peer-focus-visible:ring-[#003366] peer-focus-visible:ring-offset-2 peer-disabled:cursor-not-allowed peer-disabled:opacity-50`}
          >
            {bestand ? "Ander bestand kiezen" : "Bestand kiezen"}
          </label>
          {bestand ? (
            <span className={`min-w-0 break-words text-sm ${teGroot ? "text-red-700" : "text-gray-700"}`}>
              {bestand.name}
              {formatGrootte(bestand.size) && <span className="text-gray-600"> · {formatGrootte(bestand.size)}</span>}
            </span>
          ) : (
            <span className="text-sm text-gray-600">Nog geen bestand gekozen.</span>
          )}
        </div>
        <p id={`${idBestand}-hint`} className={`mt-1 text-xs ${teGroot ? "font-semibold text-red-700" : "text-gray-600"}`}>
          {teGroot
            ? `Dit bestand is groter dan ${MAX_MB} MB en kan niet worden geüpload.`
            : `Eén bestand per keer, maximaal ${MAX_MB} MB.`}
        </p>
      </div>

      <div className="grid gap-3 md:grid-cols-3">
        <label htmlFor={idTitel} className={LABEL}>
          Titel
          <input
            id={idTitel}
            type="text"
            value={titel}
            onChange={(e) => setTitel(e.target.value)}
            placeholder="Bijvoorbeeld: verslag stuurgroep 29 september"
            disabled={bezig}
            className={VELD}
          />
        </label>
        <label htmlFor={idDoor} className={LABEL}>
          Door
          <input
            id={idDoor}
            type="text"
            value={door}
            onChange={(e) => setDoor(e.target.value)}
            onBlur={() => bewaarDoor(door)}
            placeholder="Je naam"
            autoComplete="name"
            disabled={bezig}
            className={VELD}
          />
        </label>
        <label htmlFor={idHoortBij} className={LABEL}>
          Hoort bij
          <select
            id={idHoortBij}
            value={hoortBij}
            onChange={(e) => setHoortBij(e.target.value)}
            disabled={bezig}
            className={`${VELD} bg-white`}
          >
            {HOORT_BIJ.map((h) => (
              <option key={h} value={h}>
                {h}
              </option>
            ))}
          </select>
        </label>
      </div>

      <label htmlFor={idOpmerking} className={LABEL}>
        Opmerking <span className="font-normal text-gray-600">(niet verplicht)</span>
        <textarea
          id={idOpmerking}
          value={opmerking}
          onChange={(e) => setOpmerking(e.target.value)}
          rows={2}
          placeholder="Waar gaat het over, wat is er besloten, welke versie is dit?"
          disabled={bezig}
          className={`${VELD} resize-y`}
        />
      </label>

      <div className="flex flex-wrap items-center gap-3">
        <button type="submit" disabled={!kanUploaden} className={PRIMAIR}>
          {bezig ? "Bezig…" : "Uploaden"}
        </button>
        {bezig && bestand && (
          <span role="status" className="text-xs text-gray-600">
            Bezig met uploaden van {bestand.name}…
          </span>
        )}
      </div>
    </form>
  );
}

// ---------- lijst ----------

function Chip({ actief, onClick, children }: { actief: boolean; onClick: () => void; children: ReactNode }) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={actief}
      className={
        "rounded-full border px-3 py-1 text-xs font-semibold transition-colors " +
        (actief ? "border-[#003366] bg-[#003366] text-white" : "border-slate-300 bg-white text-[#003366] hover:border-[#003366]")
      }
    >
      {children}
    </button>
  );
}

/** Pagina met omgevouwen hoek; onderin een band met de soort, of regels als die onbekend is. */
function BestandsIcoon({ soort }: { soort: Soort }) {
  const s = SOORTEN[soort];
  return (
    <svg width="34" height="42" viewBox="0 0 34 42" role="img" aria-label={s.naam} className="mt-0.5 flex-none">
      <path
        d="M3 1.5h18l10 10v27a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2v-35a2 2 0 0 1 2-2Z"
        fill="#fff"
        stroke={s.kleur}
        strokeWidth="1.6"
        strokeLinejoin="round"
      />
      <path d="M21 1.5v10h10" fill="none" stroke={s.kleur} strokeWidth="1.6" strokeLinejoin="round" />
      {s.label ? (
        <>
          <rect x="1" y="22" width="30" height="13" rx="2" fill={s.kleur} />
          <text x="16" y="31.8" textAnchor="middle" fontSize="10" fontWeight="800" fill="#fff" letterSpacing=".08em">
            {s.label}
          </text>
        </>
      ) : (
        <path d="M8 22h16M8 27h16M8 32h10" fill="none" stroke={s.kleur} strokeWidth="1.6" strokeLinecap="round" />
      )}
    </svg>
  );
}

function DocumentKaart({ doc, verwijderen }: { doc: SessieDocument; verwijderen: (doc: SessieDocument) => Promise<boolean> }) {
  const [vraag, setVraag] = useState(false);
  const [bezig, setBezig] = useState(false);
  const soort = bestandsSoort(doc.bestandsnaam, doc.type || "");
  const grootte = formatGrootte(doc.grootte);

  async function ja() {
    setBezig(true);
    const gelukt = await verwijderen(doc);
    // Gelukt: de kaart verdwijnt uit de lijst. Mislukt: de kaart blijft, met de knoppen.
    if (!gelukt) {
      setBezig(false);
      setVraag(false);
    }
  }

  return (
    <li className="rounded-xl border border-cito-border bg-white px-4 py-3">
      <div className="flex flex-wrap items-start gap-x-4 gap-y-3">
        <div className="flex min-w-0 flex-1 basis-64 gap-3">
          <BestandsIcoon soort={soort} />
          <div className="min-w-0 flex-1">
            <a
              href={doc.url}
              target="_blank"
              rel="noopener noreferrer"
              title={`Opent ${doc.bestandsnaam} in een nieuw tabblad`}
              className="break-words text-sm font-semibold text-[#003366] hover:underline"
            >
              {doc.titel || doc.bestandsnaam}
            </a>
            <p className="mt-0.5 break-words text-xs text-gray-600">
              {doc.bestandsnaam}
              {grootte && <> · {grootte}</>}
            </p>
            <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1.5 text-xs text-gray-600">
              <span className="inline-block rounded-full border border-[#c7d7ea] bg-[#eef4fb] px-2.5 py-0.5 font-semibold text-[#003366]">
                {doc.hoortBij || "Anders"}
              </span>
              <span>
                {doc.door ? `${doc.door} · ` : ""}
                {formatDatum(doc.datum)}
              </span>
            </div>
            {doc.opmerking && <p className="mt-2 whitespace-pre-line break-words text-sm text-gray-700">{doc.opmerking}</p>}
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2 sm:ml-auto">
          {vraag ? (
            <span
              role="group"
              aria-label="Verwijderen bevestigen"
              className="flex flex-wrap items-center gap-2 rounded-lg border border-amber-300 bg-amber-50 px-3 py-2 text-xs text-amber-900"
            >
              Zeker weten?
              <button type="button" onClick={ja} disabled={bezig} className="font-bold underline disabled:opacity-60">
                {bezig ? "Bezig…" : "Ja"}
              </button>
              <button type="button" onClick={() => setVraag(false)} disabled={bezig} className="underline disabled:opacity-60">
                Nee
              </button>
            </span>
          ) : (
            <>
              <a href={doc.url} target="_blank" rel="noopener noreferrer" className={KAARTKNOP_OPENEN}>
                Openen <span aria-hidden="true">↗</span>
              </a>
              <button type="button" onClick={() => setVraag(true)} className={KAARTKNOP_WEG}>
                Verwijderen
              </button>
            </>
          )}
        </div>
      </div>
    </li>
  );
}
