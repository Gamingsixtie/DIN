"use client";

// Stap 10 — Organigram (korte versie), rechtstreeks in de app gerenderd en
// per kop en per naam handmatig aanpasbaar. De standaardinhoud staat in
// src/lib/organigram-default.ts; aanpassingen worden in de sessie bewaard
// (session.organigram, localStorage-first + Supabase via updateSession).
// De uitgebreide onderbouwing blijft een statische schets
// (public/schetsen/organigram-programmaleiding.html).

import { useEffect, useMemo, useState, type ReactNode } from "react";
import { useSession } from "@/lib/session-context";
import type { OrganigramData, OrganigramRij } from "@/lib/schemas";
import { DEFAULT_ORGANIGRAM, kloon, mergeOrganigram } from "@/lib/organigram-default";

const UITGEBREID_URL = "/schetsen/organigram-programmaleiding";
const STATISCH_URL = "/schetsen/organigram-kort";

type Upd = (fn: (d: OrganigramData) => void) => void;

const CSS = `
.ok{--cito:#003366;--verm:#0891b2;--ink:#111827;--ink2:#5b6573;--ink3:#9aa3b0;--line:#e7ebf0;--line2:#dde3ea;--amber:#b45309;font-size:13px;color:var(--ink);line-height:1.5}
.ok .ok-top{background:linear-gradient(135deg,#002a52,#004a88);color:#fff;border-radius:14px;padding:16px 20px}
.ok .ok-eyebrow{font-size:10.5px;text-transform:uppercase;letter-spacing:.14em;color:#9db9d6;font-weight:700}
.ok .ok-top h2{font-size:20px;font-weight:700;margin-top:4px;letter-spacing:-.01em}
.ok .ok-top p{color:#cdddf0;font-size:12px;margin-top:5px;font-style:italic}
.ok .ok-begrip{margin-top:10px;background:#fff;border:1px solid var(--line);border-radius:12px;padding:9px 13px;font-size:11px;color:var(--ink2);display:flex;gap:8px;flex-wrap:wrap;align-items:center}
.ok .ok-begrip.edit{flex-direction:column;align-items:stretch}
.ok .ok-bl{font-size:9px;font-weight:800;text-transform:uppercase;letter-spacing:.06em;color:var(--ink3)}
.ok .ok-eq{background:#f1f5f9;border:1px solid var(--line2);border-radius:6px;padding:2px 8px}
.ok .ok-eq b{color:var(--ink)}
.ok .ok-sec{margin-top:22px}
.ok .ok-kop{font-size:16px;font-weight:700;letter-spacing:-.01em}
.ok .ok-sub{font-size:11.5px;color:var(--ink3);margin:2px 0 10px}
.ok .ok-org{background:linear-gradient(180deg,#f2f6fb,#fff);border:1px solid rgba(0,51,102,.18);border-radius:16px;padding:16px 18px}
.ok .ok-sponsor{margin:0 auto 4px;max-width:360px;text-align:center;border:1.5px dashed rgba(0,51,102,.35);border-radius:9px;padding:5px 10px;background:#fff;font-size:10px;color:var(--ink2)}
.ok .ok-vline{width:2px;height:14px;background:rgba(0,51,102,.4);margin:0 auto}
.ok .ok-grid{display:grid;grid-template-columns:3fr 6fr 3fr;gap:14px;align-items:start}
.ok .ok-col{display:flex;flex-direction:column;align-items:center}
.ok .ok-group{width:100%;border:2px solid #cbd5e1;border-radius:9px;background:#f8fafc;padding:8px}
.ok .ok-gt{font-size:9.5px;text-transform:uppercase;letter-spacing:.06em;font-weight:800;color:#475569;text-align:center;margin-bottom:6px}
.ok .ok-gt small{font-weight:600;text-transform:none;letter-spacing:0;color:var(--ink3)}
.ok .ok-ritme > div{font-size:10.5px;color:var(--ink2);padding:4px 0;border-bottom:1px solid var(--line)}
.ok .ok-ritme > div:last-child{border-bottom:0}
.ok .ok-ritme b{color:var(--ink)}
.ok .ok-label{font-size:9.5px;text-transform:uppercase;letter-spacing:.06em;font-weight:800;color:var(--cito);text-align:center;margin-bottom:4px}
.ok .ok-box{border:2px solid var(--line2);border-radius:8px;padding:7px 10px;background:#fff;width:100%}
.ok .ok-box .r{font-size:11.5px;font-weight:700;line-height:1.3}
.ok .ok-box .n{font-size:10px;opacity:.85;margin-top:2px;line-height:1.4}
.ok .ok-box .s{font-size:9px;text-transform:uppercase;letter-spacing:.05em;opacity:.7;margin-top:2px}
.ok .ok-prim{background:var(--cito);border-color:var(--cito);color:#fff}
.ok .ok-prim .n,.ok .ok-prim .s{color:#dbe7f5;opacity:1}
.ok .ok-arch{background:#0e7490;border-color:#0e7490}
.ok .ok-side{background:#f8fafc;border-color:#cbd5e1;color:#334155}
.ok .ok-dom{background:#fffbeb;border-color:#fcd34d;color:#78350f}
.ok .ok-open{border-style:dashed;background:#fff;color:var(--ink2)}
.ok .ok-ws{background:#f8f5ff;border-color:#c4b5fd;color:#3b1d78}
.ok .ok-ws .n{color:#4c1d95;opacity:1}.ok .ok-ws .s{color:#6d28d9;opacity:1}
.ok .ok-maxw{width:100%;max-width:340px}
.ok .ok-pm{width:100%;border:2.5px solid var(--cito);border-radius:10px;background:#fff;padding:8px 9px}
.ok .ok-pm .ok-gt{color:var(--cito)}
.ok .ok-duo{display:grid;grid-template-columns:1fr 1fr;gap:6px}
.ok .ok-ps{font-size:9.5px;color:var(--ink2);text-align:center;margin-top:6px;line-height:1.4}
.ok .ok-wsg{border-color:#c4b5fd;background:#fbfaff}.ok .ok-wsg .ok-gt{color:#5b21b6}
.ok .ok-ring{display:grid;grid-template-columns:1fr 1fr;gap:6px}
.ok .ok-dom4{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:6px;width:100%}
.ok .ok-oper{margin-top:8px;width:100%;text-align:center;font-size:10.5px;color:var(--ink2);background:#f1f5f9;border:1px solid var(--line2);border-radius:8px;padding:6px 10px}
.ok .ok-stack{display:flex;flex-direction:column;gap:6px}
.ok .ok-hier{margin-top:12px;background:#e6f6fa;border:1px solid #b7e3ec;border-radius:11px;padding:9px 13px;font-size:12px;color:#0c5460;line-height:1.55}
.ok .ok-hier b{color:#083b44}
.ok .ok-scroll{overflow-x:auto}
.ok table.ok-t{width:100%;border-collapse:separate;border-spacing:0;font-size:10.5px;background:#fff;border:1px solid var(--line);border-radius:12px;overflow:hidden}
.ok .ok-t th{font-size:9px;text-transform:uppercase;letter-spacing:.05em;color:var(--ink3);padding:7px 8px;background:#f8fafc;border-bottom:1px solid var(--line);text-align:left;vertical-align:bottom;min-width:110px}
.ok .ok-t td{padding:7px 8px;border-bottom:1px solid var(--line);color:var(--ink2);vertical-align:top;line-height:1.4;min-width:110px}
.ok .ok-t tr:last-child td{border-bottom:0}
.ok .ok-t td.k{font-weight:700;color:var(--ink);min-width:130px}
.ok .ok-t td.x,.ok .ok-t th.x{min-width:0;width:28px;padding:4px}
.ok .ok-legend{font-size:10px;color:var(--ink3);margin-top:6px;line-height:1.45}
.ok .ok-ras{display:inline-block;min-width:18px;text-align:center;font-size:9.5px;font-weight:800;border-radius:4px;padding:1px 5px;border:1px solid;margin-right:3px}
.ok .ok-ras-R{background:#dbeafe;color:#1e40af;border-color:#93c5fd}
.ok .ok-ras-A{background:#fef3c7;color:#78350f;border-color:#f59e0b;font-weight:900}
.ok .ok-ras-S{background:#ecfdf5;color:#047857;border-color:#a7f3d0}
.ok .ok-ras-C{background:#f5f3ff;color:#6d28d9;border-color:#ddd6fe}
.ok .ok-ras-I{background:#f3f4f6;color:#4b5563;border-color:#d1d5db}
.ok .ok-ras-V{background:#ecfeff;color:#155e75;border-color:#a5f3fc}
.ok .ok-cards{display:grid;grid-template-columns:1fr 1fr;gap:12px}
.ok .ok-card{background:#fff;border:1px solid var(--line);border-top:5px solid #c4b5fd;border-radius:14px;padding:12px 14px}
.ok .ok-card h3{font-size:13px;font-weight:700;margin-bottom:6px;display:flex;gap:8px;align-items:center}
.ok .ok-card dl{display:grid;grid-template-columns:120px 1fr;gap:4px 8px;font-size:10.5px;margin:0}
.ok .ok-card dt{font-size:8.5px;font-weight:800;text-transform:uppercase;letter-spacing:.05em;color:var(--ink3);padding-top:2px}
.ok .ok-card dd{color:var(--ink2);line-height:1.45;margin:0}
.ok .ok-card dd b{color:var(--ink)}
.ok .ok-two{display:grid;grid-template-columns:1.2fr 1fr;gap:12px}
.ok .ok-kaart{background:#fff;border:1px solid var(--line);border-left:6px solid var(--cito);border-radius:14px;padding:12px 15px}
.ok .ok-kaart h3{font-size:12.5px;font-weight:700;margin-bottom:6px}
.ok .ok-kaart ul{list-style:none;margin:0;padding:0;display:flex;flex-direction:column;gap:5px}
.ok .ok-kaart li{font-size:11px;color:var(--ink2);line-height:1.45;padding-left:14px;position:relative}
.ok .ok-kaart li::before{content:"·";position:absolute;left:3px;font-weight:800;color:var(--ink3)}
.ok .ok-kaart li b{color:var(--ink)}
.ok .ok-advies{border-left-color:var(--verm)}
.ok .ok-openk{border-left-color:var(--amber)}
.ok .ok-openk li::before{content:"❓";font-size:9px;left:-1px;top:1px}
.ok .ok-foot{margin-top:18px;text-align:center;font-size:10.5px;color:var(--ink3);line-height:1.6}
.ok .ok-in{font:inherit;font-size:inherit;color:var(--ink);background:#fffbeb;border:1px solid #f59e0b;border-radius:5px;padding:2px 5px;width:100%;box-sizing:border-box;line-height:1.4;resize:vertical;display:block}
.ok .ok-prim .ok-in,.ok .ok-arch .ok-in{background:#fff;color:var(--ink)}
.ok .ok-knopje{font-size:10px;font-weight:700;border:1px solid #cbd5e1;background:#fff;border-radius:5px;padding:1px 7px;color:#334155;cursor:pointer;line-height:1.6;white-space:nowrap}
.ok .ok-knopje:hover{background:#f1f5f9}
.ok .ok-knopje.rood{color:#b91c1c;border-color:#fecaca}
.ok .ok-rij{display:flex;gap:6px;align-items:flex-start;width:100%}
.ok .ok-rij > .ok-in{flex:1}
.ok .ok-lijst-edit{display:flex;flex-direction:column;gap:6px;width:100%}
.ok .ok-lijst-edit li{padding-left:0}
.ok .ok-lijst-edit li::before{content:none}
@media(max-width:820px){.ok .ok-grid,.ok .ok-cards,.ok .ok-two,.ok .ok-duo,.ok .ok-ring{grid-template-columns:1fr}.ok .ok-dom4{grid-template-columns:1fr 1fr}}
`;

// ---------- kleine bouwstenen ----------

function V(p: {
  v: string;
  on: (s: string) => void;
  edit: boolean;
  ml?: boolean;
  cls?: string;
  block?: boolean;
}) {
  if (!p.edit) {
    return p.block ? <div className={p.cls}>{p.v}</div> : <span className={p.cls}>{p.v}</span>;
  }
  const cls = "ok-in " + (p.cls ?? "");
  if (p.ml) {
    const rows = Math.min(8, Math.max(2, Math.ceil(p.v.length / 55)));
    return <textarea className={cls} value={p.v} rows={rows} onChange={(e) => p.on(e.target.value)} />;
  }
  return <input className={cls} value={p.v} onChange={(e) => p.on(e.target.value)} />;
}

/** "Label: rest" → vet label. */
function metLabel(s: string, scheider = ":"): ReactNode {
  const i = s.indexOf(scheider);
  if (i > 0 && i < 48) {
    return (
      <>
        <b>{s.slice(0, i + scheider.length)}</b>
        {s.slice(i + scheider.length)}
      </>
    );
  }
  return s;
}

function RasCel({ v }: { v: string }) {
  const delen = v.split(/\s+/).filter(Boolean);
  return (
    <>
      {delen.map((p, i) =>
        /^[RASCIV]$/.test(p) ? (
          <span key={i} className={"ok-ras ok-ras-" + p}>
            {p}
          </span>
        ) : (
          <span key={i}>{p} </span>
        )
      )}
    </>
  );
}

function Lijst(p: {
  items: string[];
  edit: boolean;
  on: (items: string[]) => void;
  render?: (s: string) => ReactNode;
  cls?: string;
  ml?: boolean;
}) {
  const render = p.render ?? ((s: string) => metLabel(s));
  if (!p.edit) {
    return (
      <ul className={p.cls}>
        {p.items.map((s, i) => (
          <li key={i}>{render(s)}</li>
        ))}
      </ul>
    );
  }
  const zet = (i: number, s: string) => p.on(p.items.map((x, j) => (j === i ? s : x)));
  return (
    <ul className={"ok-lijst-edit " + (p.cls ?? "")}>
      {p.items.map((s, i) => (
        <li key={i} className="ok-rij">
          <V v={s} on={(x) => zet(i, x)} edit ml={p.ml ?? true} />
          <button
            type="button"
            className="ok-knopje rood"
            title="Regel verwijderen"
            onClick={() => p.on(p.items.filter((_, j) => j !== i))}
          >
            ×
          </button>
        </li>
      ))}
      <li>
        <button type="button" className="ok-knopje" onClick={() => p.on([...p.items, ""])}>
          + regel
        </button>
      </li>
    </ul>
  );
}

function Tabel(p: {
  kolommen: string[];
  rijen: OrganigramRij[];
  edit: boolean;
  onKolommen: (k: string[]) => void;
  onRijen: (r: OrganigramRij[]) => void;
  eersteKop?: string;
  cel?: (v: string) => ReactNode;
  ml?: boolean;
}) {
  const cel = p.cel ?? ((v: string) => v);
  const zetKolom = (i: number, s: string) => p.onKolommen(p.kolommen.map((x, j) => (j === i ? s : x)));
  const zetLabel = (r: number, s: string) =>
    p.onRijen(p.rijen.map((rij, j) => (j === r ? { ...rij, label: s } : rij)));
  const zetCel = (r: number, c: number, s: string) =>
    p.onRijen(
      p.rijen.map((rij, j) =>
        j === r ? { ...rij, cellen: rij.cellen.map((x, k) => (k === c ? s : x)) } : rij
      )
    );
  return (
    <div className="ok-scroll">
      <table className="ok-t">
        <thead>
          <tr>
            <th>{p.eersteKop ?? ""}</th>
            {p.kolommen.map((k, i) => (
              <th key={i}>
                <V v={k} on={(s) => zetKolom(i, s)} edit={p.edit} />
              </th>
            ))}
            {p.edit && <th className="x" />}
          </tr>
        </thead>
        <tbody>
          {p.rijen.map((rij, r) => (
            <tr key={r}>
              <td className="k">
                <V v={rij.label} on={(s) => zetLabel(r, s)} edit={p.edit} />
              </td>
              {p.kolommen.map((_, c) => (
                <td key={c}>
                  {p.edit ? (
                    <V v={rij.cellen[c] ?? ""} on={(s) => zetCel(r, c, s)} edit ml={p.ml ?? true} />
                  ) : (
                    cel(rij.cellen[c] ?? "")
                  )}
                </td>
              ))}
              {p.edit && (
                <td className="x">
                  <button
                    type="button"
                    className="ok-knopje rood"
                    title="Rij verwijderen"
                    onClick={() => p.onRijen(p.rijen.filter((_, j) => j !== r))}
                  >
                    ×
                  </button>
                </td>
              )}
            </tr>
          ))}
          {p.edit && (
            <tr>
              <td colSpan={p.kolommen.length + 2}>
                <button
                  type="button"
                  className="ok-knopje"
                  onClick={() =>
                    p.onRijen([...p.rijen, { label: "", cellen: p.kolommen.map(() => "") }])
                  }
                >
                  + rij
                </button>
              </td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  );
}

function Kop(p: { sleutel: keyof OrganigramData["secties"]; d: OrganigramData; edit: boolean; upd: Upd }) {
  const s = p.d.secties[p.sleutel];
  return (
    <>
      <V
        v={s.titel}
        on={(x) => p.upd((d) => void (d.secties[p.sleutel].titel = x))}
        edit={p.edit}
        cls="ok-kop"
        block
      />
      {(p.edit || s.intro) && (
        <V
          v={s.intro}
          on={(x) => p.upd((d) => void (d.secties[p.sleutel].intro = x))}
          edit={p.edit}
          ml
          cls="ok-sub"
          block
        />
      )}
    </>
  );
}

// ---------- de stap ----------

export default function OrganigramStep() {
  const { session, updateSession } = useSession();
  const opgeslagen = useMemo(() => mergeOrganigram(session?.organigram), [session?.organigram]);
  const [edit, setEdit] = useState(false);
  const [draft, setDraft] = useState<OrganigramData>(() => kloon(opgeslagen));
  const [melding, setMelding] = useState<{ tekst: string; soort: "ok" | "info" } | null>(null);
  const [resetVraag, setResetVraag] = useState(false);
  const aangepast = Boolean(session?.organigram);

  useEffect(() => {
    if (!edit) setDraft(kloon(opgeslagen));
  }, [opgeslagen, edit]);

  useEffect(() => {
    if (!melding) return;
    const t = setTimeout(() => setMelding(null), 3500);
    return () => clearTimeout(t);
  }, [melding]);

  const d = edit ? draft : opgeslagen;
  const upd: Upd = (fn) =>
    setDraft((prev) => {
      const n = kloon(prev);
      fn(n);
      return n;
    });

  function opslaan() {
    const klaar = kloon(draft);
    updateSession(() => ({ organigram: klaar }));
    setEdit(false);
    setResetVraag(false);
    setMelding({ tekst: "Opgeslagen in de sessie ✓", soort: "ok" });
  }
  function annuleren() {
    setDraft(kloon(opgeslagen));
    setEdit(false);
    setResetVraag(false);
  }
  function herstel() {
    setDraft(kloon(DEFAULT_ORGANIGRAM));
    setResetVraag(false);
    setMelding({ tekst: "Voorstel-tekst teruggezet — klik op Opslaan om dit te bewaren", soort: "info" });
  }

  const knop = "px-4 py-2 rounded-lg text-sm font-semibold transition-colors";

  return (
    <div className="space-y-4">
      <style>{CSS}</style>

      <div className="flex flex-wrap items-start justify-between gap-3">
        <p className="text-sm text-gray-600 max-w-3xl">
          Programmaorganisatie van Klant in Zicht in het kort. Namen en teksten pas je hier zelf aan
          per kop; de aanpassingen worden in deze sessie bewaard. Status: voorstel, vast te stellen
          door de programma-eigenaar.
        </p>
        <div className="flex flex-none flex-wrap gap-2">
          {!edit ? (
            <>
              <button
                type="button"
                onClick={() => setEdit(true)}
                className={`${knop} bg-cito-blue text-white hover:bg-cito-blue/90`}
              >
                ✎ Bewerken
              </button>
              <a
                href={UITGEBREID_URL}
                target="_blank"
                rel="noopener noreferrer"
                className={`${knop} border border-cito-blue text-cito-blue bg-white hover:bg-cito-blue/5`}
              >
                Uitgebreide versie ↗
              </a>
            </>
          ) : (
            <>
              <button
                type="button"
                onClick={opslaan}
                className={`${knop} bg-emerald-600 text-white hover:bg-emerald-700`}
              >
                Opslaan
              </button>
              <button
                type="button"
                onClick={annuleren}
                className={`${knop} border border-gray-300 text-gray-700 bg-white hover:bg-gray-50`}
              >
                Annuleren
              </button>
              {!resetVraag ? (
                <button
                  type="button"
                  onClick={() => setResetVraag(true)}
                  className={`${knop} border border-amber-300 text-amber-800 bg-amber-50 hover:bg-amber-100`}
                >
                  Terug naar voorstel-tekst
                </button>
              ) : (
                <span className="flex items-center gap-2 text-xs text-amber-900 bg-amber-50 border border-amber-300 rounded-lg px-3 py-2">
                  Alle aanpassingen vervangen door de voorstel-tekst?
                  <button type="button" onClick={herstel} className="font-bold underline">
                    Ja
                  </button>
                  <button type="button" onClick={() => setResetVraag(false)} className="underline">
                    Nee
                  </button>
                </span>
              )}
            </>
          )}
        </div>
      </div>

      {melding && (
        <div
          role="status"
          className={`text-sm rounded-lg px-4 py-2 border ${
            melding.soort === "ok"
              ? "bg-emerald-50 border-emerald-200 text-emerald-800"
              : "bg-blue-50 border-blue-200 text-blue-800"
          }`}
        >
          {melding.tekst}
        </div>
      )}
      {edit && (
        <div className="text-xs text-amber-900 bg-amber-50 border border-amber-200 rounded-lg px-4 py-2">
          Bewerkmodus: de gele velden zijn aanpasbaar; met × en + haal je regels weg of voeg je ze toe.
          Niets wordt bewaard tot je op Opslaan klikt.
        </div>
      )}
      {!edit && aangepast && (
        <div className="text-xs text-gray-500">
          Aangepaste versie uit deze sessie. De oorspronkelijke voorstel-tekst staat op{" "}
          <a href={STATISCH_URL} target="_blank" rel="noopener noreferrer" className="underline">
            de statische pagina
          </a>
          .
        </div>
      )}

      <div className="ok rounded-xl border border-cito-border bg-[#eef1f5] p-4 sm:p-6">
        <div className="ok-top">
          <div className="ok-eyebrow">Programma Klant in Zicht · programmaorganisatie</div>
          <h2>Wie doet wat in Klant in Zicht — in het kort</h2>
          <p>
            Eén organigram, vijf rollen, vier werkstromen, het overlegritme en de afspraken uit de
            stuurgroep- en programmateam-meeting. Wat ontbreekt of open is, staat met een vraagteken.
          </p>
        </div>

        {/* begrippen */}
        <div className={"ok-begrip" + (edit ? " edit" : "")}>
          <span className="ok-bl">Begrippen</span>
          {edit ? (
            <Lijst items={d.begrippen} edit on={(x) => upd((n) => void (n.begrippen = x))} />
          ) : (
            d.begrippen.map((b, i) => (
              <span key={i} className="ok-eq">
                {metLabel(b, " = ")}
              </span>
            ))
          )}
        </div>

        {/* 1 organigram */}
        <div className="ok-sec">
          <Kop sleutel="organigram" d={d} edit={edit} upd={upd} />
          <div className="ok-org">
            <div className="ok-sponsor">
              <V v={d.sponsorgroep} on={(x) => upd((n) => void (n.sponsorgroep = x))} edit={edit} ml={edit} />
            </div>
            <div className="ok-vline" />
            <div className="ok-grid">
              {/* links: overlegritme */}
              <div className="ok-col">
                <div className="ok-group">
                  <div className="ok-gt">
                    Overlegritme <small>· uit de meeting</small>
                  </div>
                  <div className="ok-ritme">
                    {d.overlegritme.map((o, i) =>
                      edit ? (
                        <div key={i} className="ok-rij" style={{ flexDirection: "column", gap: 3 }}>
                          <div className="ok-rij">
                            <V v={o.naam} on={(x) => upd((n) => void (n.overlegritme[i].naam = x))} edit />
                            <button
                              type="button"
                              className="ok-knopje rood"
                              onClick={() => upd((n) => void n.overlegritme.splice(i, 1))}
                            >
                              ×
                            </button>
                          </div>
                          <V v={o.ritme} on={(x) => upd((n) => void (n.overlegritme[i].ritme = x))} edit ml />
                        </div>
                      ) : (
                        <div key={i}>
                          <b>{o.naam}</b> — {o.ritme}
                        </div>
                      )
                    )}
                    {edit && (
                      <div>
                        <button
                          type="button"
                          className="ok-knopje"
                          onClick={() => upd((n) => void n.overlegritme.push({ naam: "", ritme: "" }))}
                        >
                          + overleg
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {/* midden */}
              <div className="ok-col">
                <div className="ok-maxw">
                  <div className="ok-label">
                    <V v={d.programmaEigenaar.rol} on={(x) => upd((n) => void (n.programmaEigenaar.rol = x))} edit={edit} />
                  </div>
                  <div className="ok-box ok-prim">
                    <div className="r">
                      <V v={d.programmaEigenaar.naam} on={(x) => upd((n) => void (n.programmaEigenaar.naam = x))} edit={edit} />
                    </div>
                    <div className="n">
                      <V v={d.programmaEigenaar.toelichting} on={(x) => upd((n) => void (n.programmaEigenaar.toelichting = x))} edit={edit} ml />
                    </div>
                  </div>
                </div>
                <div className="ok-vline" />
                <div className="ok-pm">
                  <div className="ok-gt">Programmamanagement · één blok</div>
                  <div className="ok-duo">
                    <div className="ok-box ok-prim">
                      <div className="r">
                        <V v={d.programmamanager.naam} on={(x) => upd((n) => void (n.programmamanager.naam = x))} edit={edit} />
                        {" · "}
                        <V v={d.programmamanager.rol} on={(x) => upd((n) => void (n.programmamanager.rol = x))} edit={edit} />
                      </div>
                      <div className="n">
                        <V v={d.programmamanager.toelichting} on={(x) => upd((n) => void (n.programmamanager.toelichting = x))} edit={edit} ml />
                      </div>
                    </div>
                    <div className="ok-box ok-prim ok-arch">
                      <div className="r">
                        <V v={d.architect.naam} on={(x) => upd((n) => void (n.architect.naam = x))} edit={edit} />
                        {" · "}
                        <V v={d.architect.rol} on={(x) => upd((n) => void (n.architect.rol = x))} edit={edit} />
                      </div>
                      <div className="n">
                        <V v={d.architect.toelichting} on={(x) => upd((n) => void (n.architect.toelichting = x))} edit={edit} ml />
                      </div>
                    </div>
                  </div>
                  <div className="ok-ps">
                    <V v={d.pmToelichting} on={(x) => upd((n) => void (n.pmToelichting = x))} edit={edit} ml />
                  </div>
                </div>
                <div className="ok-vline" />

                <div className="ok-group ok-wsg">
                  <div className="ok-gt">
                    Programmateam · de vier werkstromen <small>· Cito-lead + 3sides-lead + team uit de sectoren</small>
                  </div>
                  <div className="ok-ring">
                    {d.werkstromen.map((w, i) => (
                      <div key={w.id} className="ok-box ok-ws">
                        <div className="r">
                          <V v={w.naam} on={(x) => upd((n) => void (n.werkstromen[i].naam = x))} edit={edit} />
                        </div>
                        {edit ? (
                          <div className="n" style={{ display: "grid", gap: 3 }}>
                            <V v={w.citoLead} on={(x) => upd((n) => void (n.werkstromen[i].citoLead = x))} edit />
                            <V v={w.citoLeadFunctie} on={(x) => upd((n) => void (n.werkstromen[i].citoLeadFunctie = x))} edit />
                            <V v={w.sidesLead} on={(x) => upd((n) => void (n.werkstromen[i].sidesLead = x))} edit />
                            <V v={w.domeineigenaar} on={(x) => upd((n) => void (n.werkstromen[i].domeineigenaar = x))} edit />
                            <V v={w.landtIn} on={(x) => upd((n) => void (n.werkstromen[i].landtIn = x))} edit />
                            <span style={{ fontSize: 9, color: "#6d28d9" }}>
                              velden: Cito-lead · functie Cito-lead · 3sides-lead · domeineigenaar · landt in
                            </span>
                          </div>
                        ) : (
                          <>
                            <div className="n">
                              Cito-lead: <b>{w.citoLead}</b>
                              {w.citoLeadFunctie ? ` (${w.citoLeadFunctie})` : ""} · 3sides-lead: <b>{w.sidesLead}</b>
                              {w.domeineigenaar ? <> · domeineigenaar: {w.domeineigenaar}</> : null}
                            </div>
                            <div className="s">landt in {w.landtIn}</div>
                          </>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
                <div className="ok-vline" />

                <div style={{ width: "100%" }}>
                  <div className="ok-label" style={{ color: "#b45309" }}>
                    Domeineigenaren · dragen het resultaat in de lijn · in de stuurgroep op uitnodiging
                  </div>
                  <div className="ok-dom4">
                    {d.domeinen.map((dm, i) => (
                      <div key={i} className={"ok-box ok-dom" + (/n\.t\.b|❓/.test(dm.eigenaar) ? " ok-open" : "")}>
                        <div className="r">
                          <V v={dm.domein} on={(x) => upd((n) => void (n.domeinen[i].domein = x))} edit={edit} />
                        </div>
                        <div className="n">
                          <V v={dm.eigenaar} on={(x) => upd((n) => void (n.domeinen[i].eigenaar = x))} edit={edit} />
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
                <div className="ok-oper">
                  <V v={d.staandeOrganisatie} on={(x) => upd((n) => void (n.staandeOrganisatie = x))} edit={edit} ml={edit} />
                </div>
              </div>

              {/* rechts: stuurgroep */}
              <div className="ok-col">
                <div className="ok-group">
                  <div className="ok-gt">
                    Stuurgroep KIZ <small>· besluitvormend</small>
                  </div>
                  <div className="ok-stack">
                    {d.stuurgroep.map((s, i) => (
                      <div key={i} className="ok-box ok-side">
                        <div className="r ok-rij">
                          <V v={s.naam} on={(x) => upd((n) => void (n.stuurgroep[i].naam = x))} edit={edit} />
                          {edit && (
                            <button
                              type="button"
                              className="ok-knopje rood"
                              onClick={() => upd((n) => void n.stuurgroep.splice(i, 1))}
                            >
                              ×
                            </button>
                          )}
                        </div>
                        <div className="s">
                          <V v={s.rol} on={(x) => upd((n) => void (n.stuurgroep[i].rol = x))} edit={edit} />
                        </div>
                      </div>
                    ))}
                    {edit && (
                      <button
                        type="button"
                        className="ok-knopje"
                        onClick={() => upd((n) => void n.stuurgroep.push({ naam: "", rol: "" }))}
                      >
                        + lid
                      </button>
                    )}
                    <div className="ok-box ok-open">
                      <div className="n">
                        <V v={d.stuurgroepNoot} on={(x) => upd((n) => void (n.stuurgroepNoot = x))} edit={edit} ml={edit} />
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
            <div className="ok-hier">
              <b>Hiërarchie in één zin:</b>{" "}
              <V v={d.hierarchie} on={(x) => upd((n) => void (n.hierarchie = x))} edit={edit} ml />
            </div>
          </div>
        </div>

        {/* 2 vijf rollen */}
        <div className="ok-sec">
          <Kop sleutel="rollen" d={d} edit={edit} upd={upd} />
          <Tabel
            kolommen={d.rollenKolommen}
            rijen={d.rollenRijen}
            edit={edit}
            onKolommen={(k) => upd((n) => void (n.rollenKolommen = k))}
            onRijen={(r) => upd((n) => void (n.rollenRijen = r))}
          />
          <div className="ok-legend">
            <V v={d.rollenLegenda} on={(x) => upd((n) => void (n.rollenLegenda = x))} edit={edit} ml />
          </div>
        </div>

        {/* 3 werkstromen */}
        <div className="ok-sec">
          <Kop sleutel="werkstromen" d={d} edit={edit} upd={upd} />
          <div className="ok-cards">
            {d.werkstromen.map((w, i) => (
              <div key={w.id} className="ok-card">
                <h3>
                  <V v={w.naam} on={(x) => upd((n) => void (n.werkstromen[i].naam = x))} edit={edit} />
                  {edit && (
                    <button
                      type="button"
                      className="ok-knopje rood"
                      title="Werkstroom verwijderen"
                      onClick={() => upd((n) => void n.werkstromen.splice(i, 1))}
                    >
                      ×
                    </button>
                  )}
                </h3>
                <dl>
                  <dt>Cito-lead</dt>
                  <dd>
                    {edit ? (
                      <>
                        <V v={w.citoLead} on={(x) => upd((n) => void (n.werkstromen[i].citoLead = x))} edit />
                        <V v={w.citoLeadFunctie} on={(x) => upd((n) => void (n.werkstromen[i].citoLeadFunctie = x))} edit />
                      </>
                    ) : (
                      <>
                        <b>{w.citoLead}</b>
                        {w.citoLeadFunctie ? ` — ${w.citoLeadFunctie}` : ""}
                      </>
                    )}
                  </dd>
                  <dt>3sides-lead</dt>
                  <dd>
                    {edit ? (
                      <V v={w.sidesLead} on={(x) => upd((n) => void (n.werkstromen[i].sidesLead = x))} edit />
                    ) : (
                      <b>{w.sidesLead}</b>
                    )}
                  </dd>
                  <dt>Domeineigenaar</dt>
                  <dd>
                    <V v={w.domeineigenaar} on={(x) => upd((n) => void (n.werkstromen[i].domeineigenaar = x))} edit={edit} />
                  </dd>
                  <dt>Landt in</dt>
                  <dd>
                    <V v={w.landtIn} on={(x) => upd((n) => void (n.werkstromen[i].landtIn = x))} edit={edit} />
                  </dd>
                  <dt>Resultaat 2026 · tot nu toe besproken</dt>
                  <dd>
                    <V v={w.resultaat} on={(x) => upd((n) => void (n.werkstromen[i].resultaat = x))} edit={edit} ml />
                  </dd>
                  <dt>Output-KPI · voorlopig</dt>
                  <dd>
                    <V v={w.outputKpi} on={(x) => upd((n) => void (n.werkstromen[i].outputKpi = x))} edit={edit} ml />
                  </dd>
                  <dt>Plan van aanpak</dt>
                  <dd>
                    <V v={w.planVanAanpak} on={(x) => upd((n) => void (n.werkstromen[i].planVanAanpak = x))} edit={edit} ml />
                  </dd>
                </dl>
              </div>
            ))}
            {edit && (
              <button
                type="button"
                className="ok-knopje"
                style={{ alignSelf: "start" }}
                onClick={() =>
                  upd(
                    (n) =>
                      void n.werkstromen.push({
                        id: "ws-" + Date.now().toString(36),
                        naam: "Nieuwe werkstroom",
                        citoLead: "",
                        citoLeadFunctie: "",
                        sidesLead: "",
                        domeineigenaar: "",
                        landtIn: "",
                        resultaat: "",
                        outputKpi: "",
                        planVanAanpak: "Te maken ❓",
                      })
                  )
                }
              >
                + werkstroom
              </button>
            )}
          </div>
          <div className="ok-legend">
            <V v={d.werkstromenLegenda} on={(x) => upd((n) => void (n.werkstromenLegenda = x))} edit={edit} ml />
          </div>
        </div>

        {/* 4 KPI's per laag */}
        <div className="ok-sec">
          <Kop sleutel="kpi" d={d} edit={edit} upd={upd} />
          <Tabel
            kolommen={d.kpiKolommen.slice(1)}
            rijen={d.kpiRijen}
            edit={edit}
            eersteKop={d.kpiKolommen[0]}
            onKolommen={(k) => upd((n) => void (n.kpiKolommen = [n.kpiKolommen[0] ?? "Laag", ...k]))}
            onRijen={(r) => upd((n) => void (n.kpiRijen = r))}
          />
        </div>

        {/* 5 RASCI */}
        <div className="ok-sec">
          <Kop sleutel="rasci" d={d} edit={edit} upd={upd} />
          <Tabel
            kolommen={d.rasciKolommen}
            rijen={d.rasciRijen}
            edit={edit}
            eersteKop="Onderdeel"
            ml={false}
            onKolommen={(k) => upd((n) => void (n.rasciKolommen = k))}
            onRijen={(r) => upd((n) => void (n.rasciRijen = r))}
            cel={(v) => <RasCel v={v} />}
          />
          <div className="ok-legend">
            <V v={d.rasciLegenda} on={(x) => upd((n) => void (n.rasciLegenda = x))} edit={edit} ml />
          </div>
        </div>

        {/* 6 meeting, advies, open punten */}
        <div className="ok-sec">
          <Kop sleutel="meeting" d={d} edit={edit} upd={upd} />
          <div className="ok-two">
            <div className="ok-kaart">
              <h3>Samenvatting stuurgroep- en programmateam-meeting</h3>
              <Lijst items={d.meeting} edit={edit} on={(x) => upd((n) => void (n.meeting = x))} />
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
              <div className="ok-kaart ok-advies">
                <h3>Advies</h3>
                <Lijst items={d.advies} edit={edit} on={(x) => upd((n) => void (n.advies = x))} />
              </div>
              <div className="ok-kaart ok-openk">
                <h3>Open punten</h3>
                <Lijst items={d.openPunten} edit={edit} on={(x) => upd((n) => void (n.openPunten = x))} />
              </div>
            </div>
          </div>
        </div>

        <div className="ok-foot">
          Korte versie · de uitgebreide versie bevat de onderbouwing uit Werken aan Programma&#39;s
          (Prevaas &amp; Van Loon), de verhouding programmamanager ↔ architect, de route van een
          resultaat en de werkstromen met praktijkvoorbeelden
          <br />
          <V v={d.bronnen} on={(x) => upd((n) => void (n.bronnen = x))} edit={edit} ml={edit} />
        </div>
      </div>
    </div>
  );
}
