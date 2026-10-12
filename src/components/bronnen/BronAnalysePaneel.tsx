"use client";

// Stap 12 — tabblad "Analyse per bron": links de bronnen, rechts de analyse van de gekozen
// bron (samenvatting, status, dekking per werkstroom met citaat en vindplaats, bijdrage aan
// de vier punten). Bewerkbaar (bewerken → Opslaan/Annuleren, patroon OrganigramStep); elke
// bewerking gaat via bewerkAnalyse/bewerkBron en zet "Handmatig bewerkt".
// Bovenaan de wachtrij "Analyseer nieuwe bronnen" met voortgang per bron.
// Geen useSession: alles via props. Citaat-verificatiebadges volgen in fase 3.

import { useMemo, useState } from "react";
import type { Bron, BronAnalyse, BronDekking, BronnenAnalyse, BronPuntBijdrage, BronStatus, EffortDomain, GeelPunt } from "@/lib/schemas";
import { BRON_STATUS_LABELS, BRON_TYPE_LABELS, DOOR_LABELS, GEEL_PUNTEN } from "@/lib/bronnenanalyse-default";
import {
  actieveBronnen,
  bewerkAnalyse,
  bronLabel,
  bronnenZonderAnalyse,
  type WachtrijItem,
} from "@/lib/bronnenanalyse-service";
import {
  Citaat,
  DOMEIN_INFO,
  DOMEIN_VOLGORDE,
  DomeinPillen,
  Etiket,
  KAART,
  KNOP_PRIMAIR,
  KNOP_SECUNDAIR,
  KNOP_WEG,
  LABEL,
  MeldingRegel,
  Spinner,
  StatusBadge,
  TeBepalen,
  VELD,
  bronStatus,
  formatDatum,
  type Melding,
} from "@/components/bronnen/BronnenRegisterTab";

type Props = {
  ba: BronnenAnalyse;
  onWijzig: (nieuw: BronnenAnalyse) => void;
  werkstromen: { id: string; naam: string }[];
  geselecteerdeBronId: string | null;
  onSelecteer: (id: string) => void;
  wachtrij: WachtrijItem[];
  wachtrijBezig: boolean;
  onAnalyseerNieuw: () => void;
  onHeranalyseer: (bronId: string) => void;
};

const STATUSSEN = Object.keys(BRON_STATUS_LABELS) as BronStatus[];

function kloon<T>(x: T): T {
  return JSON.parse(JSON.stringify(x)) as T;
}

function legeAnalyse(): BronAnalyse {
  return { samenvatting: "", status: "niet_geanalyseerd", dekking: [], punten: [], door: "handmatig", geanalyseerdOp: new Date().toISOString() };
}

/** Regels uit een textarea (één per regel), lege regels weg, max 3. */
function regels(s: string): string[] {
  return s
    .split("\n")
    .map((x) => x.trim())
    .filter(Boolean)
    .slice(0, 3);
}

export default function BronAnalysePaneel({
  ba,
  onWijzig,
  werkstromen,
  geselecteerdeBronId,
  onSelecteer,
  wachtrij,
  wachtrijBezig,
  onAnalyseerNieuw,
  onHeranalyseer,
}: Props) {
  const bronnen = actieveBronnen(ba);
  const nieuw = bronnenZonderAnalyse(ba).length;
  const bron = bronnen.find((b) => b.id === geselecteerdeBronId) ?? bronnen[0] ?? null;

  const klaar = wachtrij.filter((w) => w.status === "klaar").length;
  const fout = wachtrij.filter((w) => w.status === "fout").length;

  return (
    <div className="space-y-4">
      <section className={KAART} aria-label="Analyseer nieuwe bronnen">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h3 className="text-lg font-bold text-[#003366]">Analyse per bron</h3>
            <p className="mt-0.5 text-sm text-gray-700">
              Alleen bronnen zonder analyse worden geanalyseerd, één voor één. Miro-borden en audio/video worden buiten de
              app geanalyseerd.
            </p>
          </div>
          <button type="button" className={KNOP_PRIMAIR} disabled={nieuw === 0 || wachtrijBezig} onClick={onAnalyseerNieuw}>
            {wachtrijBezig ? <Spinner /> : null}
            Analyseer nieuwe bronnen ({nieuw})
          </button>
        </div>

        {wachtrij.length > 0 && (
          <div className="mt-3 rounded-lg border border-slate-300 bg-slate-50 p-3">
            <p className="text-sm font-semibold text-gray-900" role="status">
              {klaar} van {wachtrij.length} geanalyseerd
              {fout > 0 ? ` · ${fout} mislukt` : ""}
              {wachtrijBezig ? " · bezig…" : ""}
            </p>
            <ul className="mt-2 space-y-1">
              {wachtrij.map((w) => (
                <li key={w.bronId} className="flex flex-wrap items-center gap-2 text-sm text-gray-900">
                  <span className="font-semibold">{bronLabel(ba, w.bronId)}</span>
                  {w.status === "wacht" && <Etiket kleur="grijs">Wacht</Etiket>}
                  {w.status === "bezig" && (
                    <span className="inline-flex items-center gap-1 text-sm font-semibold text-[#003366]">
                      <Spinner /> Bezig
                    </span>
                  )}
                  {w.status === "klaar" && <Etiket kleur="groen">Klaar</Etiket>}
                  {w.status === "fout" && (
                    <>
                      <Etiket kleur="rood">Fout</Etiket>
                      {w.melding && <span className="text-sm text-red-900">{w.melding}</span>}
                    </>
                  )}
                </li>
              ))}
            </ul>
          </div>
        )}
      </section>

      <div className="grid gap-4 lg:grid-cols-[minmax(220px,1fr)_3fr]">
        <nav aria-label="Bronnen" className={KAART + " p-2"}>
          {bronnen.length === 0 ? (
            <p className="p-2 text-sm text-gray-900">Nog geen bronnen.</p>
          ) : (
            <ul className="space-y-1">
              {bronnen.map((b) => (
                <li key={b.id}>
                  <button
                    type="button"
                    onClick={() => onSelecteer(b.id)}
                    aria-current={bron?.id === b.id}
                    className={
                      "flex w-full flex-col items-start gap-1 rounded-lg px-3 py-2 text-left text-sm transition-colors " +
                      (bron?.id === b.id ? "bg-[#003366] text-white" : "text-gray-900 hover:bg-slate-100")
                    }
                  >
                    <span className="font-semibold">{b.titel}</span>
                    <StatusBadge status={bronStatus(b)} />
                  </button>
                </li>
              ))}
            </ul>
          )}
        </nav>

        {bron ? (
          <BronDetail
            key={bron.id}
            ba={ba}
            bron={bron}
            onWijzig={onWijzig}
            werkstromen={werkstromen}
            wachtrijBezig={wachtrijBezig}
            onHeranalyseer={onHeranalyseer}
          />
        ) : (
          <section className={KAART}>
            <p className="text-sm text-gray-900">Kies links een bron.</p>
          </section>
        )}
      </div>
    </div>
  );
}

// ---------- detail van één bron ----------

function BronDetail({
  ba,
  bron,
  onWijzig,
  werkstromen,
  wachtrijBezig,
  onHeranalyseer,
}: {
  ba: BronnenAnalyse;
  bron: Bron;
  onWijzig: (nieuw: BronnenAnalyse) => void;
  werkstromen: { id: string; naam: string }[];
  wachtrijBezig: boolean;
  onHeranalyseer: (bronId: string) => void;
}) {
  const [edit, setEdit] = useState(false);
  const [draft, setDraft] = useState<BronAnalyse>(() => kloon(bron.analyse ?? legeAnalyse()));
  const [melding, setMelding] = useState<Melding | null>(null);

  const naamVan = useMemo(() => new Map(werkstromen.map((w) => [w.id, w.naam])), [werkstromen]);
  const werkstroomNaam = (id: string) => naamVan.get(id) ?? "—";
  const buitenApp = bron.type === "miro" || bron.type === "audio_video";
  const a = bron.analyse;

  function startBewerken() {
    setDraft(kloon(bron.analyse ?? legeAnalyse()));
    setEdit(true);
    setMelding(null);
  }

  function opslaan() {
    // Lege regels opruimen; open punten en acties: één per regel, max 3.
    const dekking = draft.dekking
      .filter((d) => d.werkstroom || d.dekt.trim())
      .map((d) => ({ ...d, dekt: d.dekt.trim(), openPunten: regels(d.openPunten.join("\n")) }));
    if (dekking.some((d) => !d.werkstroom || !d.dekt)) {
      setMelding({ soort: "fout", tekst: "Kies bij elke dekkingsregel een werkstroom en vul in wat de bron dekt." });
      return;
    }
    const punten = draft.punten
      .filter((p) => p.watErAlIs.trim())
      .map((p) => ({ ...p, watErAlIs: p.watErAlIs.trim(), actiesNogTeDoen: regels(p.actiesNogTeDoen.join("\n")) }));
    onWijzig(
      bewerkAnalyse(ba, bron.id, () => ({
        ...draft,
        samenvatting: draft.samenvatting.trim(),
        dekking,
        punten,
        geanalyseerdOp: new Date().toISOString(),
      })),
    );
    setEdit(false);
    setMelding({ soort: "klaar", tekst: "Analyse opgeslagen (handmatig bewerkt)." });
  }

  function heranalyseer() {
    if (
      bron.bewerkt &&
      !window.confirm("Deze analyse is handmatig bewerkt. Opnieuw analyseren overschrijft je bewerkingen. Doorgaan?")
    ) {
      return;
    }
    onHeranalyseer(bron.id);
  }

  const zetDekking = (i: number, w: Partial<BronDekking>) =>
    setDraft((d) => ({ ...d, dekking: d.dekking.map((x, j) => (j === i ? { ...x, ...w } : x)) }));
  const zetPunt = (i: number, w: Partial<BronPuntBijdrage>) =>
    setDraft((d) => ({ ...d, punten: d.punten.map((x, j) => (j === i ? { ...x, ...w } : x)) }));

  return (
    <section className={KAART + " space-y-4"} aria-label={`Analyse van ${bron.titel}`}>
      <header className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h3 className="text-lg font-bold text-[#003366]">{bron.titel}</h3>
          <p className="mt-0.5 text-sm text-gray-700">
            {BRON_TYPE_LABELS[bron.type]} · {formatDatum(bron.datum)}
            {bron.versieVan ? ` · versie van ${bronLabel(ba, bron.versieVan)}` : ""}
          </p>
          <div className="mt-2 flex flex-wrap items-center gap-2">
            {a ? (
              <Etiket kleur={a.door === "handmatig" ? "amber" : "blauw"}>
                {DOOR_LABELS[a.door]}
                {a.door === "claude" ? ` · ${formatDatum(a.geanalyseerdOp)}` : ""}
                {a.door === "handmatig" && a.geanalyseerdOp ? ` · ${formatDatum(a.geanalyseerdOp)}` : ""}
              </Etiket>
            ) : (
              <Etiket kleur="grijs">Nog niet geanalyseerd</Etiket>
            )}
            {bron.url && (
              <a href={bron.url} target="_blank" rel="noopener noreferrer" className="text-sm font-semibold text-[#003366] underline">
                {bron.type === "miro" ? "Open bord" : "Open bestand"} ↗
              </a>
            )}
          </div>
        </div>
        {!edit && (
          <div className="flex flex-wrap gap-2">
            <button type="button" className={KNOP_SECUNDAIR} onClick={startBewerken}>
              {a ? "Bewerken" : "Handmatig invullen"}
            </button>
            {!buitenApp && (
              <button type="button" className={KNOP_SECUNDAIR} disabled={wachtrijBezig} onClick={heranalyseer}>
                {a ? "Opnieuw analyseren" : "Nu analyseren"}
              </button>
            )}
          </div>
        )}
      </header>

      <MeldingRegel melding={melding} />

      {!edit && !a && (
        <p className="rounded-lg border border-dashed border-slate-400 bg-slate-50 px-3 py-3 text-sm text-gray-900">
          {buitenApp
            ? "Analyse buiten de app; zie bronnenanalyse. Je kunt de uitkomst hier handmatig invullen."
            : "Deze bron is nog niet geanalyseerd. Klik op 'Analyseer nieuwe bronnen' of vul de analyse handmatig in."}
        </p>
      )}

      {!edit && a && (
        <>
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <h4 className="text-sm font-bold text-[#003366]">Samenvatting</h4>
              <StatusBadge status={a.status} />
            </div>
            <p className="mt-1 text-sm text-gray-900">{a.samenvatting.trim() ? a.samenvatting : <TeBepalen />}</p>
          </div>

          <div>
            <h4 className="text-sm font-bold text-[#003366]">Dekking per werkstroom</h4>
            {a.dekking.length === 0 ? (
              <p className="mt-1">
                <TeBepalen />
              </p>
            ) : (
              <ul className="mt-2 space-y-2">
                {a.dekking.map((d, i) => (
                  <li key={i} className="rounded-lg border border-slate-300 p-3">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="text-sm font-bold text-gray-900">{werkstroomNaam(d.werkstroom)}</span>
                      <DomeinPillen domeinen={d.domeinen} />
                    </div>
                    <p className="mt-1 text-sm text-gray-900">{d.dekt}</p>
                    <div className="mt-1">
                      <Citaat citaat={d.citaat} vindplaats={d.vindplaats} />
                    </div>
                    {d.openPunten.length > 0 && (
                      <div className="mt-1">
                        <p className="text-xs font-semibold text-gray-800">Open punten</p>
                        <ul className="list-disc pl-5 text-sm text-gray-900">
                          {d.openPunten.map((o, j) => (
                            <li key={j}>{o}</li>
                          ))}
                        </ul>
                      </div>
                    )}
                  </li>
                ))}
              </ul>
            )}
          </div>

          <div>
            <h4 className="text-sm font-bold text-[#003366]">Bijdrage aan de vier punten</h4>
            {a.punten.length === 0 ? (
              <p className="mt-1">
                <TeBepalen />
              </p>
            ) : (
              <ul className="mt-2 space-y-2">
                {a.punten.map((p, i) => {
                  const gp = GEEL_PUNTEN.find((g) => g.id === p.punt);
                  return (
                    <li key={i} className="rounded-lg border-l-4 border-yellow-400 bg-yellow-50 p-3">
                      <p className="text-sm font-bold text-gray-900">
                        {gp ? `${gp.nummer}. ${gp.titel}` : "—"}
                      </p>
                      <p className="mt-1 text-sm text-gray-900">{p.watErAlIs}</p>
                      <div className="mt-1">
                        <Citaat citaat={p.citaat} vindplaats={p.vindplaats} />
                      </div>
                      {p.actiesNogTeDoen.length > 0 && (
                        <div className="mt-1">
                          <p className="text-xs font-semibold text-gray-800">Acties nog te doen</p>
                          <ul className="list-disc pl-5 text-sm text-gray-900">
                            {p.actiesNogTeDoen.map((x, j) => (
                              <li key={j}>{x}</li>
                            ))}
                          </ul>
                        </div>
                      )}
                    </li>
                  );
                })}
              </ul>
            )}
          </div>
        </>
      )}

      {edit && (
        <div className="space-y-4 rounded-lg border border-yellow-300 bg-yellow-50/60 p-3">
          <div className="grid gap-3 sm:grid-cols-[3fr_1fr]">
            <label className={LABEL}>
              Samenvatting (max 600 tekens)
              <textarea
                className={VELD + " min-h-[90px]"}
                maxLength={600}
                value={draft.samenvatting}
                onChange={(e) => setDraft({ ...draft, samenvatting: e.target.value })}
              />
            </label>
            <label className={LABEL}>
              Status
              <select
                className={VELD}
                value={draft.status}
                onChange={(e) => setDraft({ ...draft, status: e.target.value as BronStatus })}
              >
                {STATUSSEN.map((s) => (
                  <option key={s} value={s}>
                    {BRON_STATUS_LABELS[s]}
                  </option>
                ))}
              </select>
            </label>
          </div>

          <fieldset className="space-y-2">
            <legend className="text-sm font-bold text-[#003366]">Dekking per werkstroom</legend>
            {draft.dekking.map((d, i) => (
              <div key={i} className="space-y-2 rounded-lg border border-slate-300 bg-white p-3">
                <div className="grid gap-2 sm:grid-cols-2">
                  <label className={LABEL}>
                    Werkstroom
                    <select className={VELD} value={d.werkstroom} onChange={(e) => zetDekking(i, { werkstroom: e.target.value })}>
                      <option value="">— kies —</option>
                      {werkstromen.map((w) => (
                        <option key={w.id} value={w.id}>
                          {w.naam}
                        </option>
                      ))}
                    </select>
                  </label>
                  <label className={LABEL}>
                    Vindplaats (bijv. p. 4, [Dia 3])
                    <input className={VELD} value={d.vindplaats} onChange={(e) => zetDekking(i, { vindplaats: e.target.value })} />
                  </label>
                </div>
                <label className={LABEL}>
                  Wat dekt de bron
                  <textarea className={VELD} value={d.dekt} onChange={(e) => zetDekking(i, { dekt: e.target.value })} />
                </label>
                <label className={LABEL}>
                  Letterlijk citaat (max 300 tekens)
                  <textarea
                    className={VELD}
                    maxLength={300}
                    value={d.citaat}
                    onChange={(e) => zetDekking(i, { citaat: e.target.value })}
                  />
                </label>
                <div>
                  <p className={LABEL}>Domeinen</p>
                  <div className="mt-1 flex flex-wrap gap-3">
                    {DOMEIN_VOLGORDE.map((dom: EffortDomain) => (
                      <label key={dom} className="inline-flex items-center gap-1.5 text-sm text-gray-900">
                        <input
                          type="checkbox"
                          checked={d.domeinen.includes(dom)}
                          onChange={(e) =>
                            zetDekking(i, {
                              domeinen: e.target.checked ? [...d.domeinen, dom] : d.domeinen.filter((x) => x !== dom),
                            })
                          }
                        />
                        <span className="font-semibold" style={{ color: DOMEIN_INFO[dom].kleur }}>
                          {DOMEIN_INFO[dom].label}
                        </span>
                      </label>
                    ))}
                  </div>
                </div>
                <label className={LABEL}>
                  Open punten (één per regel, max 3)
                  <textarea
                    className={VELD}
                    value={d.openPunten.join("\n")}
                    onChange={(e) => zetDekking(i, { openPunten: e.target.value.split("\n").slice(0, 3) })}
                  />
                </label>
                <button
                  type="button"
                  className={KNOP_WEG}
                  onClick={() => setDraft((x) => ({ ...x, dekking: x.dekking.filter((_, j) => j !== i) }))}
                >
                  Regel verwijderen
                </button>
              </div>
            ))}
            <button
              type="button"
              className={KNOP_SECUNDAIR}
              onClick={() =>
                setDraft((x) => ({
                  ...x,
                  dekking: [...x.dekking, { werkstroom: "", dekt: "", citaat: "", vindplaats: "", domeinen: [], openPunten: [] }],
                }))
              }
            >
              + Dekkingsregel
            </button>
          </fieldset>

          <fieldset className="space-y-2">
            <legend className="text-sm font-bold text-[#003366]">Bijdrage aan de vier punten</legend>
            {draft.punten.map((p, i) => (
              <div key={i} className="space-y-2 rounded-lg border-l-4 border-yellow-400 bg-white p-3">
                <div className="grid gap-2 sm:grid-cols-2">
                  <label className={LABEL}>
                    Punt
                    <select className={VELD} value={p.punt} onChange={(e) => zetPunt(i, { punt: e.target.value as GeelPunt })}>
                      {GEEL_PUNTEN.map((g) => (
                        <option key={g.id} value={g.id}>
                          {g.nummer}. {g.titel}
                        </option>
                      ))}
                    </select>
                  </label>
                  <label className={LABEL}>
                    Vindplaats
                    <input className={VELD} value={p.vindplaats} onChange={(e) => zetPunt(i, { vindplaats: e.target.value })} />
                  </label>
                </div>
                <label className={LABEL}>
                  Wat er al is
                  <textarea className={VELD} value={p.watErAlIs} onChange={(e) => zetPunt(i, { watErAlIs: e.target.value })} />
                </label>
                <label className={LABEL}>
                  Letterlijk citaat (max 300 tekens)
                  <textarea className={VELD} maxLength={300} value={p.citaat} onChange={(e) => zetPunt(i, { citaat: e.target.value })} />
                </label>
                <label className={LABEL}>
                  Acties nog te doen (één per regel, max 3)
                  <textarea
                    className={VELD}
                    value={p.actiesNogTeDoen.join("\n")}
                    onChange={(e) => zetPunt(i, { actiesNogTeDoen: e.target.value.split("\n").slice(0, 3) })}
                  />
                </label>
                <button
                  type="button"
                  className={KNOP_WEG}
                  onClick={() => setDraft((x) => ({ ...x, punten: x.punten.filter((_, j) => j !== i) }))}
                >
                  Punt verwijderen
                </button>
              </div>
            ))}
            <button
              type="button"
              className={KNOP_SECUNDAIR}
              onClick={() =>
                setDraft((x) => ({
                  ...x,
                  punten: [...x.punten, { punt: GEEL_PUNTEN[0].id, watErAlIs: "", citaat: "", vindplaats: "", actiesNogTeDoen: [] }],
                }))
              }
            >
              + Bijdrage aan een punt
            </button>
          </fieldset>

          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              className={KNOP_PRIMAIR}
              onClick={opslaan}
            >
              Opslaan
            </button>
            <button
              type="button"
              className={KNOP_SECUNDAIR}
              onClick={() => {
                setEdit(false);
                setDraft(kloon(bron.analyse ?? legeAnalyse()));
              }}
            >
              Annuleren
            </button>
          </div>
        </div>
      )}
    </section>
  );
}
