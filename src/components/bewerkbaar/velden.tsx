// Kleine bouwstenen voor handmatig aanpasbare pagina's (organigram, documenten):
// een tekst die in bewerkmodus een invoerveld wordt, lijst en tabel met × en +,
// RASCI-cel, keuzelijst en knopjes. Stijl: de .ok-klassen uit ./stijl.ts.
// Alleen gebruiken binnen een client-component (de props bevatten functies).

import type { ReactNode } from "react";
import type { OrganigramRij } from "@/lib/schemas";

/** Tekst; in bewerkmodus een invoerveld (ml = meerregelig). */
export function V(p: {
  v: string;
  on: (s: string) => void;
  edit: boolean;
  ml?: boolean;
  cls?: string;
  block?: boolean;
  /** placeholder in bewerkmodus */
  ph?: string;
}) {
  if (!p.edit) {
    return p.block ? <div className={p.cls}>{p.v}</div> : <span className={p.cls}>{p.v}</span>;
  }
  const cls = "ok-in " + (p.cls ?? "");
  if (p.ml) {
    const rows = Math.min(8, Math.max(2, Math.ceil(p.v.length / 55)));
    return (
      <textarea
        className={cls}
        value={p.v}
        rows={rows}
        placeholder={p.ph}
        onChange={(e) => p.on(e.target.value)}
      />
    );
  }
  return <input className={cls} value={p.v} placeholder={p.ph} onChange={(e) => p.on(e.target.value)} />;
}

/** "Label: rest" → vet label. */
export function metLabel(s: string, scheider = ":"): ReactNode {
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

export function RasCel({ v }: { v: string }) {
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

export function Lijst(p: {
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

/** Tabel met een vet labelkolom en per rij cellen (organigram: rollen, KPI's, RASCI). */
export function Tabel(p: {
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

/** Keuzelijst in de stijl van de bewerkvelden (bijv. kleur van een laag). */
export function Keuze<T extends string>(p: {
  v: T;
  opties: readonly { waarde: T; label: string }[];
  on: (v: T) => void;
  titel: string;
}) {
  return (
    <select
      className="ok-in ok-keuze"
      value={p.v}
      title={p.titel}
      aria-label={p.titel}
      onChange={(e) => p.on(e.target.value as T)}
    >
      {p.opties.map((o) => (
        <option key={o.waarde} value={o.waarde}>
          {o.label}
        </option>
      ))}
    </select>
  );
}

/** Rood ×-knopje om iets te verwijderen. */
export function WegKnop(p: { titel: string; on: () => void; label?: string }) {
  return (
    <button type="button" className="ok-knopje rood" title={p.titel} aria-label={p.titel} onClick={p.on}>
      {p.label ?? "×"}
    </button>
  );
}

/** Knopje om iets toe te voegen ("+ regel", "+ rij", …). */
export function PlusKnop(p: { label: string; on: () => void }) {
  return (
    <button type="button" className="ok-knopje" onClick={p.on}>
      {p.label}
    </button>
  );
}
