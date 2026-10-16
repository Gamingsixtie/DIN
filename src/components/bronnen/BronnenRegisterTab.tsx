"use client";

// Stap 12 — tabblad "Bronnenregister": alle bronnen met type, datum, herkomst, versie en
// status, plus "Bron toevoegen" (upload, plak tekst of alleen registreren).
// Geen useSession: alles via props, zodat BronnenAnalyseStep de enige schrijver is.
// Dit bestand exporteert ook de kleine gedeelde bouwstenen (badges, knopstijlen, datum)
// voor de andere tabbladen van stap 12.

import { useId, useMemo, useRef, useState, type ChangeEvent, type ReactNode } from "react";
import type { Bron, BronHerkomst, BronnenAnalyse, BronStatus, BronType, EffortDomain } from "@/lib/schemas";
import { BRON_STATUS_LABELS, BRON_TYPE_LABELS, HERKOMST_LABELS, TE_BEPALEN } from "@/lib/bronnenanalyse-default";
import { actieveBronnen, bewerkBron, bronLabel, isGeanalyseerd, maakBronId } from "@/lib/bronnenanalyse-service";

// ---------- gedeelde stijl en bouwstenen ----------

export const KNOP_PRIMAIR =
  "inline-flex items-center gap-1.5 rounded-lg bg-[#003366] px-3 py-1.5 text-sm font-semibold text-white transition-colors hover:bg-[#002244] disabled:cursor-not-allowed disabled:opacity-50";
export const KNOP_SECUNDAIR =
  "inline-flex items-center gap-1.5 rounded-lg border border-[#003366] bg-white px-3 py-1.5 text-sm font-semibold text-[#003366] transition-colors hover:bg-[#003366] hover:text-white disabled:cursor-not-allowed disabled:opacity-50";
export const KNOP_WEG =
  "inline-flex items-center gap-1.5 rounded-lg border border-red-300 bg-white px-3 py-1.5 text-sm font-semibold text-red-800 transition-colors hover:bg-red-50 disabled:cursor-not-allowed disabled:opacity-50";
export const KNOP_LINK = "text-left font-semibold text-[#003366] underline decoration-[#003366]/40 underline-offset-2 hover:decoration-[#003366]";
export const VELD =
  "mt-1 w-full rounded-lg border border-gray-400 bg-white px-3 py-2 text-sm text-gray-900 focus:border-[#003366] focus:outline-none focus:ring-1 focus:ring-[#003366]";
export const LABEL = "block text-xs font-semibold text-gray-800";
export const KAART = "rounded-xl border border-slate-300 bg-white p-4";

export const STATUS_STIJL: Record<BronStatus, string> = {
  bruikbaar: "bg-emerald-100 text-emerald-900 border-emerald-300",
  deels_bruikbaar: "bg-amber-100 text-amber-900 border-amber-300",
  verouderd: "bg-gray-200 text-gray-800 border-gray-400",
  niet_geanalyseerd: "bg-white text-[#003366] border-[#003366]",
};

export function StatusBadge({ status }: { status: BronStatus }) {
  return (
    <span
      className={
        "inline-block whitespace-nowrap rounded-full border px-2.5 py-0.5 text-xs font-semibold " + STATUS_STIJL[status]
      }
    >
      {BRON_STATUS_LABELS[status]}
    </span>
  );
}

/** Een klein etiket, bijv. "Voorstel". */
export function Etiket({ children, kleur = "blauw" }: { children: ReactNode; kleur?: "blauw" | "groen" | "amber" | "rood" | "grijs" }) {
  const stijl = {
    blauw: "bg-blue-50 text-[#003366] border-[#003366]/40",
    groen: "bg-emerald-100 text-emerald-900 border-emerald-300",
    amber: "bg-amber-100 text-amber-900 border-amber-300",
    rood: "bg-red-100 text-red-900 border-red-300",
    grijs: "bg-gray-100 text-gray-800 border-gray-400",
  }[kleur];
  return (
    <span className={"inline-block whitespace-nowrap rounded-full border px-2 py-0.5 text-xs font-semibold " + stijl}>
      {children}
    </span>
  );
}

/** Inspanningsdomeinen in de Cito-outside-in volgorde. */
export const DOMEIN_VOLGORDE: EffortDomain[] = ["cultuur", "mens", "data_systemen", "processen", "overig"];
export const DOMEIN_INFO: Record<EffortDomain, { label: string; kleur: string }> = {
  cultuur: { label: "Cultuur", kleur: "#d97706" },
  mens: { label: "Mens", kleur: "#2563eb" },
  data_systemen: { label: "Data & Systemen", kleur: "#7c3aed" },
  processen: { label: "Processen", kleur: "#059669" },
  overig: { label: "Overig", kleur: "#475569" },
};

export function DomeinPillen({ domeinen }: { domeinen: EffortDomain[] }) {
  const gesorteerd = DOMEIN_VOLGORDE.filter((d) => domeinen.includes(d));
  if (gesorteerd.length === 0) return null;
  return (
    <span className="inline-flex flex-wrap gap-1">
      {gesorteerd.map((d) => (
        <span
          key={d}
          className="inline-block rounded-full px-2 py-0.5 text-xs font-semibold text-white"
          style={{ backgroundColor: DOMEIN_INFO[d].kleur }}
        >
          {DOMEIN_INFO[d].label}
        </span>
      ))}
    </span>
  );
}

/** Letterlijk "te bepalen", donkergrijs (niet lichtgrijs). */
export function TeBepalen({ prefix }: { prefix?: string }) {
  return (
    <span className="text-sm italic text-gray-700">
      {prefix ? `${prefix}: ` : ""}
      {TE_BEPALEN}
    </span>
  );
}

export type Melding = { soort: "klaar" | "fout"; tekst: string };

export function MeldingRegel({ melding }: { melding: Melding | null }) {
  if (!melding) return null;
  return (
    <p
      role={melding.soort === "fout" ? "alert" : "status"}
      className={
        "rounded-lg border px-3 py-2 text-sm font-semibold " +
        (melding.soort === "fout"
          ? "border-red-300 bg-red-50 text-red-900"
          : "border-emerald-300 bg-emerald-50 text-emerald-900")
      }
    >
      {melding.tekst}
    </p>
  );
}

export function Spinner() {
  return (
    <span
      aria-hidden
      className="inline-block h-4 w-4 animate-spin rounded-full border-2 border-current border-r-transparent align-[-2px]"
    />
  );
}

export function formatDatum(iso: string | undefined): string {
  if (!iso) return "—";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "—";
  return d.toLocaleDateString("nl-NL", { day: "2-digit", month: "2-digit", year: "numeric" });
}

/** ISO-datum (yyyy-mm-dd) van vandaag, lokaal. */
export function vandaagIso(): string {
  const d = new Date();
  const p = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`;
}

/** yyyy-mm-dd voor een <input type="date"> uit een (mogelijk volledige) ISO-datum. */
export function datumVoorVeld(iso: string | undefined): string {
  if (!iso) return "";
  const m = /^(\d{4}-\d{2}-\d{2})/.exec(iso);
  return m ? m[1] : "";
}

const TYPE_ICOON: Record<BronType, { letters: string; kleur: string }> = {
  pdf: { letters: "PDF", kleur: "#b91c1c" },
  docx: { letters: "DOC", kleur: "#1d4ed8" },
  doc: { letters: "DOC", kleur: "#1d4ed8" },
  xlsx: { letters: "XLS", kleur: "#047857" },
  pptx: { letters: "PPT", kleur: "#c2410c" },
  txt: { letters: "TXT", kleur: "#374151" },
  md: { letters: "MD", kleur: "#374151" },
  eml: { letters: "MAIL", kleur: "#0e7490" },
  msg: { letters: "MAIL", kleur: "#0e7490" },
  html: { letters: "WEB", kleur: "#4338ca" },
  miro: { letters: "MIRO", kleur: "#a16207" },
  audio_video: { letters: "A/V", kleur: "#6d28d9" },
  anders: { letters: "?", kleur: "#475569" },
};

export function TypeIcoon({ type }: { type: BronType }) {
  const i = TYPE_ICOON[type] ?? TYPE_ICOON.anders;
  return (
    <span
      title={BRON_TYPE_LABELS[type]}
      aria-label={BRON_TYPE_LABELS[type]}
      className="inline-flex h-7 min-w-[2.25rem] items-center justify-center rounded-md px-1 text-[10px] font-bold tracking-wide text-white"
      style={{ backgroundColor: i.kleur }}
    >
      {i.letters}
    </span>
  );
}

export function bronStatus(b: Bron): BronStatus {
  return b.analyse?.status ?? "niet_geanalyseerd";
}

const HERKOMSTEN = Object.keys(HERKOMST_LABELS) as BronHerkomst[];
const TYPES = Object.keys(BRON_TYPE_LABELS) as BronType[];

function zonderExtensie(naam: string): string {
  const i = naam.lastIndexOf(".");
  return i > 0 ? naam.slice(0, i) : naam;
}

// ---------- tabblad ----------

type Props = {
  ba: BronnenAnalyse;
  onWijzig: (nieuw: BronnenAnalyse) => void;
  onUpload: (file: File, titel: string, herkomst: BronHerkomst) => Promise<void>;
  onPlakTekst: (titel: string, tekst: string) => Promise<void>;
  bezig: boolean;
  melding: Melding | null;
  onOpenAnalyse: (bronId: string) => void;
};

type Concept = { titel: string; datum: string; herkomst: BronHerkomst; versieVan: string };

export default function BronnenRegisterTab({ ba, onWijzig, onUpload, onPlakTekst, bezig, melding, onOpenAnalyse }: Props) {
  const bronnen = useMemo(
    () =>
      [...actieveBronnen(ba)].sort((a, b) => {
        if (!a.datum && !b.datum) return a.titel.localeCompare(b.titel, "nl");
        if (!a.datum) return 1;
        if (!b.datum) return -1;
        return b.datum.localeCompare(a.datum);
      }),
    [ba],
  );
  const geanalyseerd = bronnen.filter(isGeanalyseerd).length;

  const [bewerkId, setBewerkId] = useState<string | null>(null);
  const [concept, setConcept] = useState<Concept | null>(null);
  const [lokaal, setLokaal] = useState<Melding | null>(null);

  function startBewerken(b: Bron) {
    setBewerkId(b.id);
    setConcept({ titel: b.titel, datum: datumVoorVeld(b.datum), herkomst: b.herkomst, versieVan: b.versieVan ?? "" });
    setLokaal(null);
  }

  function opslaan() {
    if (!bewerkId || !concept) return;
    if (!concept.titel.trim()) {
      setLokaal({ soort: "fout", tekst: "Een titel is verplicht." });
      return;
    }
    onWijzig(
      bewerkBron(ba, bewerkId, {
        titel: concept.titel.trim(),
        datum: concept.datum,
        herkomst: concept.herkomst,
        versieVan: concept.versieVan || undefined,
      }),
    );
    setBewerkId(null);
    setConcept(null);
    setLokaal({ soort: "klaar", tekst: "Bron bijgewerkt en opgeslagen." });
  }

  function verwijderen(b: Bron) {
    if (!window.confirm(`Bron "${b.titel}" uit het register verwijderen?`)) return;
    // Tombstone: nooit uit de array halen, zodat de seed hem niet terugbrengt.
    onWijzig({ ...ba, bronnen: ba.bronnen.map((x) => (x.id === b.id ? { ...x, verwijderd: true } : x)) });
    setLokaal({ soort: "klaar", tekst: `"${b.titel}" is verwijderd.` });
  }

  return (
    <div className="space-y-4">
      <section className={KAART} aria-label="Bronnenregister">
        <div className="flex flex-wrap items-baseline justify-between gap-2">
          <h3 className="text-lg font-bold text-[#003366]">Bronnenregister</h3>
          <p className="text-sm font-semibold text-gray-800">
            {bronnen.length} bronnen · {geanalyseerd} geanalyseerd
          </p>
        </div>
        <div className="mt-2">
          <MeldingRegel melding={lokaal} />
        </div>

        {bronnen.length === 0 ? (
          <p className="mt-4 text-sm text-gray-900">Nog geen bronnen geregistreerd. Voeg hieronder de eerste toe.</p>
        ) : (
          <div className="mt-3 overflow-x-auto">
            <table className="w-full border-collapse text-sm text-gray-900">
              <thead>
                <tr className="border-b-2 border-[#003366] text-left text-[#003366]">
                  <th className="py-2 pr-3 font-semibold">
                    <span className="sr-only">Type</span>
                  </th>
                  <th className="py-2 pr-3 font-semibold">Titel</th>
                  <th className="py-2 pr-3 font-semibold">Datum</th>
                  <th className="py-2 pr-3 font-semibold">Herkomst</th>
                  <th className="py-2 pr-3 font-semibold">Versie van</th>
                  <th className="py-2 pr-3 font-semibold">Status</th>
                  <th className="py-2 font-semibold">
                    <span className="sr-only">Acties</span>
                  </th>
                </tr>
              </thead>
              <tbody>
                {bronnen.map((b) =>
                  bewerkId === b.id && concept ? (
                    <tr key={b.id} className="border-b border-slate-200 bg-yellow-50 align-top">
                      <td className="py-2 pr-3">
                        <TypeIcoon type={b.type} />
                      </td>
                      <td className="py-2 pr-3">
                        <label className={LABEL}>
                          Titel
                          <input
                            className={VELD}
                            value={concept.titel}
                            onChange={(e) => setConcept({ ...concept, titel: e.target.value })}
                          />
                        </label>
                      </td>
                      <td className="py-2 pr-3">
                        <label className={LABEL}>
                          Datum
                          <input
                            type="date"
                            className={VELD}
                            value={concept.datum}
                            onChange={(e) => setConcept({ ...concept, datum: e.target.value })}
                          />
                        </label>
                      </td>
                      <td className="py-2 pr-3">
                        <label className={LABEL}>
                          Herkomst
                          <select
                            className={VELD}
                            value={concept.herkomst}
                            onChange={(e) => setConcept({ ...concept, herkomst: e.target.value as BronHerkomst })}
                          >
                            {HERKOMSTEN.map((h) => (
                              <option key={h} value={h}>
                                {HERKOMST_LABELS[h]}
                              </option>
                            ))}
                          </select>
                        </label>
                      </td>
                      <td className="py-2 pr-3">
                        <label className={LABEL}>
                          Versie van
                          <select
                            className={VELD}
                            value={concept.versieVan}
                            onChange={(e) => setConcept({ ...concept, versieVan: e.target.value })}
                          >
                            <option value="">— geen —</option>
                            {bronnen
                              .filter((x) => x.id !== b.id)
                              .map((x) => (
                                <option key={x.id} value={x.id}>
                                  {x.titel}
                                </option>
                              ))}
                          </select>
                        </label>
                      </td>
                      <td className="py-2 pr-3">
                        <StatusBadge status={bronStatus(b)} />
                      </td>
                      <td className="py-2">
                        <div className="flex flex-col gap-1.5">
                          <button type="button" className={KNOP_PRIMAIR} onClick={opslaan}>
                            Opslaan
                          </button>
                          <button
                            type="button"
                            className={KNOP_SECUNDAIR}
                            onClick={() => {
                              setBewerkId(null);
                              setConcept(null);
                            }}
                          >
                            Annuleren
                          </button>
                        </div>
                      </td>
                    </tr>
                  ) : (
                    <tr key={b.id} className="border-b border-slate-200 align-top">
                      <td className="py-2 pr-3">
                        <TypeIcoon type={b.type} />
                      </td>
                      <td className="py-2 pr-3">
                        <button type="button" className={KNOP_LINK} onClick={() => onOpenAnalyse(b.id)}>
                          {b.titel}
                        </button>
                        {b.bestandsnaam && <div className="text-sm text-gray-700">{b.bestandsnaam}</div>}
                        {b.url && (
                          <a
                            href={b.url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="mt-0.5 inline-block text-sm font-semibold text-[#003366] underline"
                          >
                            {b.type === "miro" ? "Open bord" : "Open bestand"} ↗
                          </a>
                        )}
                      </td>
                      <td className="whitespace-nowrap py-2 pr-3">{formatDatum(b.datum)}</td>
                      <td className="py-2 pr-3">{HERKOMST_LABELS[b.herkomst] ?? "—"}</td>
                      <td className="py-2 pr-3">{b.versieVan ? bronLabel(ba, b.versieVan) : "—"}</td>
                      <td className="py-2 pr-3">
                        <StatusBadge status={bronStatus(b)} />
                      </td>
                      <td className="py-2">
                        <div className="flex flex-wrap gap-1.5">
                          <button type="button" className={KNOP_SECUNDAIR} onClick={() => startBewerken(b)}>
                            Bewerken
                          </button>
                          <button type="button" className={KNOP_WEG} onClick={() => verwijderen(b)}>
                            Verwijderen
                          </button>
                        </div>
                      </td>
                    </tr>
                  ),
                )}
              </tbody>
            </table>
          </div>
        )}
      </section>

      <BronToevoegen ba={ba} onWijzig={onWijzig} onUpload={onUpload} onPlakTekst={onPlakTekst} bezig={bezig} melding={melding} />
    </div>
  );
}

// ---------- bron toevoegen ----------

type Modus = "upload" | "plak" | "registreer";

function BronToevoegen({
  ba,
  onWijzig,
  onUpload,
  onPlakTekst,
  bezig,
  melding,
}: Pick<Props, "ba" | "onWijzig" | "onUpload" | "onPlakTekst" | "bezig" | "melding">) {
  const [modus, setModus] = useState<Modus>("upload");
  const [lokaal, setLokaal] = useState<Melding | null>(null);
  const id = useId();

  // upload
  const [bestand, setBestand] = useState<File | null>(null);
  const [uploadTitel, setUploadTitel] = useState("");
  const [uploadHerkomst, setUploadHerkomst] = useState<BronHerkomst>("upload");
  const bestandRef = useRef<HTMLInputElement>(null);

  // plak tekst
  const [plakTitel, setPlakTitel] = useState("");
  const [plakTekst, setPlakTekst] = useState("");

  // alleen registreren
  const [regTitel, setRegTitel] = useState("");
  const [regType, setRegType] = useState<BronType>("pdf");
  const [regDatum, setRegDatum] = useState("");
  const [regHerkomst, setRegHerkomst] = useState<BronHerkomst>("downloads");
  const [regUrl, setRegUrl] = useState("");

  function kiesBestand(e: ChangeEvent<HTMLInputElement>) {
    const f = e.target.files?.[0] ?? null;
    setBestand(f);
    if (f) setUploadTitel(zonderExtensie(f.name));
  }

  async function uploaden() {
    if (!bestand) {
      setLokaal({ soort: "fout", tekst: "Kies eerst een bestand." });
      return;
    }
    setLokaal(null);
    await onUpload(bestand, uploadTitel.trim() || zonderExtensie(bestand.name), uploadHerkomst);
    setBestand(null);
    setUploadTitel("");
    if (bestandRef.current) bestandRef.current.value = "";
  }

  async function plakken() {
    if (!plakTitel.trim() || !plakTekst.trim()) {
      setLokaal({ soort: "fout", tekst: "Vul een titel en de tekst in." });
      return;
    }
    setLokaal(null);
    await onPlakTekst(plakTitel.trim(), plakTekst);
    setPlakTitel("");
    setPlakTekst("");
  }

  function registreren() {
    if (!regTitel.trim()) {
      setLokaal({ soort: "fout", tekst: "Een titel is verplicht." });
      return;
    }
    const url = regUrl.trim();
    if (url && !/^https?:\/\//i.test(url)) {
      setLokaal({ soort: "fout", tekst: "De link moet beginnen met http:// of https://." });
      return;
    }
    const nieuw: Bron = {
      id: maakBronId(regTitel, ba.bronnen.map((b) => b.id)),
      titel: regTitel.trim(),
      bestandsnaam: "",
      type: regType,
      datum: regDatum,
      herkomst: regHerkomst,
      ...(url ? { url } : {}),
      // Nieuwe bron: nog niet bewerkt, zodat een latere analyse gewoon wordt toegepast.
      bewerkt: false,
      verwijderd: false,
    };
    onWijzig({ ...ba, bronnen: [...ba.bronnen, nieuw] });
    setLokaal({ soort: "klaar", tekst: `"${nieuw.titel}" is geregistreerd.` });
    setRegTitel("");
    setRegDatum("");
    setRegUrl("");
  }

  const tabKnop = (m: Modus, label: string) => (
    <button
      type="button"
      onClick={() => {
        setModus(m);
        setLokaal(null);
      }}
      aria-pressed={modus === m}
      className={
        "rounded-lg border px-3 py-1.5 text-sm font-semibold transition-colors " +
        (modus === m ? "border-[#003366] bg-[#003366] text-white" : "border-slate-400 bg-white text-[#003366] hover:border-[#003366]")
      }
    >
      {label}
    </button>
  );

  return (
    <section className={KAART} aria-label="Bron toevoegen">
      <h3 className="text-lg font-bold text-[#003366]">Bron toevoegen</h3>
      <p className="mt-1 text-sm text-gray-700">
        Upload een bestand, plak tekst (bijvoorbeeld uit een Outlook-mail) of registreer alleen een bron die buiten de app
        staat, zoals een Miro-bord.
      </p>
      <div className="mt-3 flex flex-wrap gap-2">
        {tabKnop("upload", "Bestand uploaden")}
        {tabKnop("plak", "Plak tekst")}
        {tabKnop("registreer", "Alleen registreren")}
      </div>

      <div className="mt-4 space-y-3">
        {modus === "upload" && (
          <div className="grid gap-3 sm:grid-cols-2">
            <label className={LABEL + " sm:col-span-2"} htmlFor={`${id}-bestand`}>
              Bestand (PDF, Word, Excel, PowerPoint, tekst, mail of webpagina)
              <input
                id={`${id}-bestand`}
                ref={bestandRef}
                type="file"
                accept=".pdf,.docx,.doc,.xlsx,.pptx,.txt,.md,.eml,.html"
                onChange={kiesBestand}
                className={VELD}
              />
            </label>
            <label className={LABEL}>
              Titel
              <input className={VELD} value={uploadTitel} onChange={(e) => setUploadTitel(e.target.value)} />
            </label>
            <label className={LABEL}>
              Herkomst
              <select
                className={VELD}
                value={uploadHerkomst}
                onChange={(e) => setUploadHerkomst(e.target.value as BronHerkomst)}
              >
                {HERKOMSTEN.map((h) => (
                  <option key={h} value={h}>
                    {HERKOMST_LABELS[h]}
                  </option>
                ))}
              </select>
            </label>
            <div className="sm:col-span-2">
              <button type="button" className={KNOP_PRIMAIR} disabled={bezig || !bestand} onClick={() => void uploaden()}>
                {bezig ? (
                  <>
                    <Spinner /> Bezig met uploaden…
                  </>
                ) : (
                  "Uploaden en toevoegen"
                )}
              </button>
            </div>
          </div>
        )}

        {modus === "plak" && (
          <div className="space-y-3">
            <label className={LABEL}>
              Titel
              <input className={VELD} value={plakTitel} onChange={(e) => setPlakTitel(e.target.value)} />
            </label>
            <label className={LABEL}>
              Tekst (wordt alleen gebruikt voor de analyse en niet in de sessie bewaard)
              <textarea
                className={VELD + " min-h-[160px]"}
                value={plakTekst}
                onChange={(e) => setPlakTekst(e.target.value)}
              />
            </label>
            <button type="button" className={KNOP_PRIMAIR} disabled={bezig} onClick={() => void plakken()}>
              {bezig ? (
                <>
                  <Spinner /> Bezig…
                </>
              ) : (
                "Toevoegen en analyseren"
              )}
            </button>
          </div>
        )}

        {modus === "registreer" && (
          <div className="grid gap-3 sm:grid-cols-2">
            <label className={LABEL}>
              Titel
              <input className={VELD} value={regTitel} onChange={(e) => setRegTitel(e.target.value)} />
            </label>
            <label className={LABEL}>
              Type
              <select className={VELD} value={regType} onChange={(e) => setRegType(e.target.value as BronType)}>
                {TYPES.map((t) => (
                  <option key={t} value={t}>
                    {BRON_TYPE_LABELS[t]}
                  </option>
                ))}
              </select>
            </label>
            <label className={LABEL}>
              Datum
              <input type="date" className={VELD} value={regDatum} onChange={(e) => setRegDatum(e.target.value)} />
            </label>
            <label className={LABEL}>
              Herkomst
              <select className={VELD} value={regHerkomst} onChange={(e) => setRegHerkomst(e.target.value as BronHerkomst)}>
                {HERKOMSTEN.map((h) => (
                  <option key={h} value={h}>
                    {HERKOMST_LABELS[h]}
                  </option>
                ))}
              </select>
            </label>
            <label className={LABEL + " sm:col-span-2"}>
              Link (optioneel, bijvoorbeeld het Miro-bord)
              <input className={VELD} value={regUrl} onChange={(e) => setRegUrl(e.target.value)} placeholder="https://" />
            </label>
            <div className="sm:col-span-2">
              <button type="button" className={KNOP_PRIMAIR} onClick={registreren}>
                Registreren
              </button>
            </div>
          </div>
        )}

        <MeldingRegel melding={lokaal} />
        <MeldingRegel melding={melding} />
      </div>
    </section>
  );
}
