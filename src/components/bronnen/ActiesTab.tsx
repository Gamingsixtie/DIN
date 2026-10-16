"use client";

// Stap 12 — tabblad "Acties" (actiegericht, wens Pim):
// 1. "Dit kan nu in gang" per werkstroom, met onderbouwing (bron-titels) en status;
//    een voorstel wordt pas een actie na "Overnemen".
// 2. "Nog nodig / te bepalen" (gap-patroon StapBatenOverloop): wat ontbreekt, met bron-label.
// 3. "Voorstellen uit de analyse" uit voorstellenNogNodig: nooit automatisch toegevoegd,
//    alleen na "Overnemen".
// Geen useSession: alles via props. Ids worden nooit getoond.

import { useMemo, useState } from "react";
import type { BronnenAnalyse, GeelPunt, KanNuInGang, NogNodigItem } from "@/lib/schemas";
import { GEEL_PUNTEN, KAN_NU_STATUS_LABELS, NOG_NODIG_STATUS_LABELS, TE_BEPALEN } from "@/lib/bronnenanalyse-default";
import { actieveBronnen, bronLabel, voorstellenNogNodig } from "@/lib/bronnenanalyse-service";
import {
  Etiket,
  KAART,
  KNOP_LINK,
  KNOP_PRIMAIR,
  KNOP_SECUNDAIR,
  KNOP_WEG,
  LABEL,
  MeldingRegel,
  TeBepalen,
  VELD,
  type Melding,
} from "@/components/bronnen/BronnenRegisterTab";

type Props = {
  ba: BronnenAnalyse;
  onWijzig: (nieuw: BronnenAnalyse) => void;
  werkstromen: { id: string; naam: string }[];
  onOpenBron: (bronId: string) => void;
};

type KanNuStatus = KanNuInGang["status"];
type NogNodigStatus = NogNodigItem["status"];
const KAN_NU_STATUSSEN = Object.keys(KAN_NU_STATUS_LABELS) as KanNuStatus[];
const NOG_NODIG_STATUSSEN = Object.keys(NOG_NODIG_STATUS_LABELS) as NogNodigStatus[];
const HANDMATIG = "Handmatig toegevoegd";

const KAN_NU_KLEUR: Record<KanNuStatus, "blauw" | "groen" | "amber" | "grijs"> = {
  voorstel: "blauw",
  overgenomen: "amber",
  gestart: "groen",
  afgerond: "grijs",
};
const NOG_NODIG_KLEUR: Record<NogNodigStatus, "rood" | "amber" | "groen"> = {
  open: "rood",
  belegd: "amber",
  afgerond: "groen",
};

function nieuwId(): string {
  return typeof crypto !== "undefined" && "randomUUID" in crypto
    ? crypto.randomUUID()
    : `item-${Date.now()}-${Math.round(Math.random() * 1e6)}`;
}

export default function ActiesTab({ ba, onWijzig, werkstromen, onOpenBron }: Props) {
  const [melding, setMelding] = useState<Melding | null>(null);
  const naamVan = useMemo(() => new Map(werkstromen.map((w) => [w.id, w.naam])), [werkstromen]);
  const puntTitel = (p: GeelPunt | undefined) => {
    const g = GEEL_PUNTEN.find((x) => x.id === p);
    return g ? `${g.nummer}. ${g.titel}` : "";
  };

  function meld(tekst: string) {
    setMelding({ soort: "klaar", tekst });
  }

  // ---- Dit kan nu in gang ----
  function zetKanNu(item: KanNuInGang, tekst: string) {
    const bestaat = ba.kanNuInGang.some((k) => k.id === item.id);
    onWijzig({
      ...ba,
      kanNuInGang: bestaat
        ? ba.kanNuInGang.map((k) => (k.id === item.id ? { ...item, bewerkt: true } : k))
        : [...ba.kanNuInGang, { ...item, bewerkt: true }],
    });
    meld(tekst);
  }
  function verwijderKanNu(item: KanNuInGang) {
    if (!window.confirm(`Actie "${item.actie}" verwijderen?`)) return;
    onWijzig({ ...ba, kanNuInGang: ba.kanNuInGang.filter((k) => k.id !== item.id) });
    meld("Actie verwijderd.");
  }

  // Groepen in de volgorde van het organigram; onbekende werkstroom-ids in één groep "—".
  const groepen = useMemo(() => {
    const g: { id: string; naam: string; items: KanNuInGang[] }[] = werkstromen.map((w) => ({
      id: w.id,
      naam: w.naam,
      items: ba.kanNuInGang.filter((k) => k.werkstroom === w.id),
    }));
    const rest = ba.kanNuInGang.filter((k) => !naamVan.has(k.werkstroom));
    if (rest.length > 0) g.push({ id: "", naam: "Werkstroom —", items: rest });
    return g;
  }, [ba.kanNuInGang, werkstromen, naamVan]);

  // ---- Nog nodig ----
  function zetNogNodig(item: NogNodigItem, tekst: string) {
    const bestaat = ba.nogNodig.some((n) => n.id === item.id);
    onWijzig({
      ...ba,
      nogNodig: bestaat
        ? ba.nogNodig.map((n) => (n.id === item.id ? { ...item, bewerkt: true } : n))
        : [...ba.nogNodig, { ...item, bewerkt: true }],
    });
    meld(tekst);
  }

  const voorstellen = useMemo(() => {
    const bestaand = new Set(ba.nogNodig.map((n) => n.id));
    return voorstellenNogNodig(ba, werkstromen).filter((v) => !bestaand.has(v.id));
  }, [ba, werkstromen]);

  const [nieuwKanNu, setNieuwKanNu] = useState(false);
  const [nieuwNogNodig, setNieuwNogNodig] = useState(false);

  return (
    <div className="space-y-4">
      <MeldingRegel melding={melding} />

      <section className={KAART} aria-label="Dit kan nu in gang">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div>
            <h3 className="text-lg font-bold text-[#003366]">Dit kan nu in gang</h3>
            <p className="mt-0.5 text-sm text-gray-700">
              Acties die op basis van de bronnen nu al kunnen starten. Een voorstel wordt pas een actie na “Overnemen”.
            </p>
          </div>
          {!nieuwKanNu && (
            <button type="button" className={KNOP_SECUNDAIR} onClick={() => setNieuwKanNu(true)}>
              + Actie toevoegen
            </button>
          )}
        </div>

        {nieuwKanNu && (
          <div className="mt-3">
            <KanNuFormulier
              ba={ba}
              werkstromen={werkstromen}
              item={{ id: nieuwId(), actie: "", werkstroom: werkstromen[0]?.id ?? "", onderbouwing: [], status: "overgenomen", bewerkt: true }}
              onOpslaan={(item) => {
                zetKanNu(item, "Actie toegevoegd.");
                setNieuwKanNu(false);
              }}
              onAnnuleren={() => setNieuwKanNu(false)}
            />
          </div>
        )}

        {ba.kanNuInGang.length === 0 && !nieuwKanNu ? (
          <p className="mt-3">
            <TeBepalen prefix="Nog geen acties" />
          </p>
        ) : (
          <div className="mt-3 space-y-4">
            {groepen
              .filter((g) => g.items.length > 0)
              .map((g) => (
                <div key={g.id || "onbekend"}>
                  <h4 className="border-b border-slate-300 pb-1 text-sm font-bold text-gray-900">{g.naam}</h4>
                  <ul className="mt-2 space-y-2">
                    {g.items.map((k) => (
                      <KanNuRij
                        key={k.id}
                        ba={ba}
                        item={k}
                        werkstromen={werkstromen}
                        onOpenBron={onOpenBron}
                        onWijzig={(nieuw, tekst) => zetKanNu(nieuw, tekst)}
                        onVerwijder={() => verwijderKanNu(k)}
                      />
                    ))}
                  </ul>
                </div>
              ))}
          </div>
        )}
      </section>

      <section className={KAART} aria-label="Nog nodig / te bepalen">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div>
            <h3 className="text-lg font-bold text-[#003366]">Nog nodig / te bepalen</h3>
            <p className="mt-0.5 text-sm text-gray-700">Wat nog ontbreekt per werkstroom of punt, altijd met de bron erbij.</p>
          </div>
          {!nieuwNogNodig && (
            <button type="button" className={KNOP_SECUNDAIR} onClick={() => setNieuwNogNodig(true)}>
              + Toevoegen
            </button>
          )}
        </div>

        {nieuwNogNodig && (
          <div className="mt-3">
            <NogNodigFormulier
              werkstromen={werkstromen}
              item={{ id: nieuwId(), tekst: "", werkstroom: werkstromen[0]?.id, actie: "", status: "open", bron: HANDMATIG, bewerkt: true }}
              onOpslaan={(item) => {
                zetNogNodig(item, "Toegevoegd aan ‘Nog nodig’.");
                setNieuwNogNodig(false);
              }}
              onAnnuleren={() => setNieuwNogNodig(false)}
            />
          </div>
        )}

        {ba.nogNodig.length === 0 && !nieuwNogNodig ? (
          <p className="mt-3">
            <TeBepalen prefix="Nog niets vastgelegd" />
          </p>
        ) : (
          <ul className="mt-3 space-y-2">
            {ba.nogNodig.map((n) => (
              <NogNodigRij
                key={n.id}
                item={n}
                werkstromen={werkstromen}
                waar={[n.werkstroom ? naamVan.get(n.werkstroom) ?? "—" : "", puntTitel(n.punt)].filter(Boolean).join(" · ")}
                onWijzig={(nieuw, tekst) => zetNogNodig(nieuw, tekst)}
              />
            ))}
          </ul>
        )}
      </section>

      <section className={KAART} aria-label="Voorstellen uit de analyse">
        <h3 className="text-lg font-bold text-[#003366]">Voorstellen uit de analyse</h3>
        <p className="mt-0.5 text-sm text-gray-700">
          Gaten in de dekking en open punten uit de bronnen. Ze komen pas in ‘Nog nodig’ als je ze overneemt.
        </p>
        {voorstellen.length === 0 ? (
          <p className="mt-3 text-sm text-gray-900">Geen nieuwe voorstellen.</p>
        ) : (
          <ul className="mt-3 space-y-2">
            {voorstellen.map((v) => (
              <li key={v.id} className="flex flex-wrap items-start justify-between gap-3 rounded-lg border border-dashed border-[#003366]/50 p-3">
                <div>
                  <p className={"text-sm " + (v.tekst === TE_BEPALEN ? "italic text-gray-700" : "text-gray-900")}>
                    {v.tekst === TE_BEPALEN ? "Gat in de dekking: te bepalen" : v.tekst}
                  </p>
                  <p className="mt-0.5 text-xs text-gray-800">
                    {[v.werkstroom ? naamVan.get(v.werkstroom) ?? "—" : "", puntTitel(v.punt)].filter(Boolean).join(" · ")}
                    {" · "}Bron: {v.bron || "—"}
                  </p>
                </div>
                <button
                  type="button"
                  className={KNOP_PRIMAIR}
                  onClick={() => zetNogNodig({ ...v, bewerkt: true }, "Voorstel overgenomen in ‘Nog nodig’.")}
                >
                  Overnemen
                </button>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}

// ---------- Dit kan nu in gang: rij en formulier ----------

function KanNuRij({
  ba,
  item,
  werkstromen,
  onOpenBron,
  onWijzig,
  onVerwijder,
}: {
  ba: BronnenAnalyse;
  item: KanNuInGang;
  werkstromen: { id: string; naam: string }[];
  onOpenBron: (id: string) => void;
  onWijzig: (nieuw: KanNuInGang, tekst: string) => void;
  onVerwijder: () => void;
}) {
  const [edit, setEdit] = useState(false);
  const onderbouwing = item.onderbouwing.filter((id) => bronLabel(ba, id) !== "—");

  if (edit) {
    return (
      <li>
        <KanNuFormulier
          ba={ba}
          werkstromen={werkstromen}
          item={item}
          onOpslaan={(n) => {
            onWijzig(n, "Actie bijgewerkt.");
            setEdit(false);
          }}
          onAnnuleren={() => setEdit(false)}
        />
      </li>
    );
  }

  return (
    <li className="rounded-lg border border-slate-300 p-3">
      <div className="flex flex-wrap items-start justify-between gap-2">
        <p className="text-sm font-semibold text-gray-900">{item.actie.trim() ? item.actie : TE_BEPALEN}</p>
        <Etiket kleur={KAN_NU_KLEUR[item.status]}>{KAN_NU_STATUS_LABELS[item.status]}</Etiket>
      </div>
      <p className="mt-1 text-sm text-gray-800">
        <span className="font-semibold">Onderbouwing: </span>
        {onderbouwing.length === 0 ? (
          <span className="italic text-gray-700">{TE_BEPALEN}</span>
        ) : (
          onderbouwing.map((id, i) => (
            <span key={id}>
              {i > 0 && ", "}
              <button type="button" className={KNOP_LINK} onClick={() => onOpenBron(id)}>
                {bronLabel(ba, id)}
              </button>
            </span>
          ))
        )}
      </p>
      <div className="mt-2 flex flex-wrap items-center gap-2">
        {item.status === "voorstel" && (
          <button type="button" className={KNOP_PRIMAIR} onClick={() => onWijzig({ ...item, status: "overgenomen" }, "Voorstel overgenomen.")}>
            Overnemen
          </button>
        )}
        <label className="inline-flex items-center gap-1.5 text-xs font-semibold text-gray-800">
          Status
          <select
            className="rounded-lg border border-gray-400 bg-white px-2 py-1 text-sm text-gray-900"
            value={item.status}
            onChange={(e) =>
              onWijzig({ ...item, status: e.target.value as KanNuStatus }, `Status gewijzigd naar ${KAN_NU_STATUS_LABELS[e.target.value as KanNuStatus]}.`)
            }
          >
            {KAN_NU_STATUSSEN.map((s) => (
              <option key={s} value={s}>
                {KAN_NU_STATUS_LABELS[s]}
              </option>
            ))}
          </select>
        </label>
        <button type="button" className={KNOP_SECUNDAIR} onClick={() => setEdit(true)}>
          Bewerken
        </button>
        <button type="button" className={KNOP_WEG} onClick={onVerwijder}>
          Verwijderen
        </button>
      </div>
    </li>
  );
}

function KanNuFormulier({
  ba,
  werkstromen,
  item,
  onOpslaan,
  onAnnuleren,
}: {
  ba: BronnenAnalyse;
  werkstromen: { id: string; naam: string }[];
  item: KanNuInGang;
  onOpslaan: (n: KanNuInGang) => void;
  onAnnuleren: () => void;
}) {
  const [concept, setConcept] = useState<KanNuInGang>(item);
  const [fout, setFout] = useState<Melding | null>(null);
  const bronnen = actieveBronnen(ba);

  return (
    <div className="space-y-2 rounded-lg border border-yellow-300 bg-yellow-50/60 p-3">
      <label className={LABEL}>
        Actie
        <textarea className={VELD} value={concept.actie} onChange={(e) => setConcept({ ...concept, actie: e.target.value })} />
      </label>
      <div className="grid gap-2 sm:grid-cols-2">
        <label className={LABEL}>
          Werkstroom
          <select className={VELD} value={concept.werkstroom} onChange={(e) => setConcept({ ...concept, werkstroom: e.target.value })}>
            <option value="">— kies —</option>
            {werkstromen.map((w) => (
              <option key={w.id} value={w.id}>
                {w.naam}
              </option>
            ))}
          </select>
        </label>
        <label className={LABEL}>
          Status
          <select
            className={VELD}
            value={concept.status}
            onChange={(e) => setConcept({ ...concept, status: e.target.value as KanNuStatus })}
          >
            {KAN_NU_STATUSSEN.map((s) => (
              <option key={s} value={s}>
                {KAN_NU_STATUS_LABELS[s]}
              </option>
            ))}
          </select>
        </label>
      </div>
      <fieldset>
        <legend className={LABEL}>Onderbouwing (bronnen)</legend>
        <div className="mt-1 grid max-h-48 gap-1 overflow-y-auto rounded-lg border border-gray-300 bg-white p-2 sm:grid-cols-2">
          {bronnen.map((b) => (
            <label key={b.id} className="inline-flex items-center gap-1.5 text-sm text-gray-900">
              <input
                type="checkbox"
                checked={concept.onderbouwing.includes(b.id)}
                onChange={(e) =>
                  setConcept({
                    ...concept,
                    onderbouwing: e.target.checked
                      ? [...concept.onderbouwing, b.id]
                      : concept.onderbouwing.filter((x) => x !== b.id),
                  })
                }
              />
              {b.titel}
            </label>
          ))}
        </div>
      </fieldset>
      <MeldingRegel melding={fout} />
      <div className="flex flex-wrap gap-2">
        <button
          type="button"
          className={KNOP_PRIMAIR}
          onClick={() => {
            if (!concept.actie.trim() || !concept.werkstroom) {
              setFout({ soort: "fout", tekst: "Vul de actie in en kies een werkstroom." });
              return;
            }
            onOpslaan({ ...concept, actie: concept.actie.trim() });
          }}
        >
          Opslaan
        </button>
        <button type="button" className={KNOP_SECUNDAIR} onClick={onAnnuleren}>
          Annuleren
        </button>
      </div>
    </div>
  );
}

// ---------- Nog nodig: rij en formulier ----------

function NogNodigRij({
  item,
  werkstromen,
  waar,
  onWijzig,
}: {
  item: NogNodigItem;
  werkstromen: { id: string; naam: string }[];
  waar: string;
  onWijzig: (nieuw: NogNodigItem, tekst: string) => void;
}) {
  const [edit, setEdit] = useState(false);

  if (edit) {
    return (
      <li>
        <NogNodigFormulier
          werkstromen={werkstromen}
          item={item}
          onOpslaan={(n) => {
            onWijzig(n, "Bijgewerkt.");
            setEdit(false);
          }}
          onAnnuleren={() => setEdit(false)}
        />
      </li>
    );
  }

  return (
    <li className="rounded-lg border border-slate-300 p-3">
      <div className="flex flex-wrap items-start justify-between gap-2">
        <p className={"text-sm font-semibold " + (item.tekst === TE_BEPALEN ? "italic text-gray-700" : "text-gray-900")}>
          {item.tekst || TE_BEPALEN}
        </p>
        <Etiket kleur={NOG_NODIG_KLEUR[item.status]}>{NOG_NODIG_STATUS_LABELS[item.status]}</Etiket>
      </div>
      <p className="mt-1 text-sm text-gray-800">
        {waar && <span className="font-semibold">{waar} · </span>}
        {item.status === "open" ? "Voorgestelde actie: " : "Actie: "}
        {item.actie.trim() ? item.actie : <span className="italic text-gray-700">{TE_BEPALEN}</span>}
      </p>
      <p className="mt-0.5 text-xs font-semibold text-gray-800">Bron: {item.bron || "—"}</p>
      <div className="mt-2 flex flex-wrap gap-2">
        {item.status === "open" && (
          <button type="button" className={KNOP_SECUNDAIR} onClick={() => onWijzig({ ...item, status: "belegd" }, "Gemarkeerd als belegd.")}>
            Belegd
          </button>
        )}
        {item.status !== "afgerond" && (
          <button
            type="button"
            className={KNOP_SECUNDAIR}
            onClick={() => onWijzig({ ...item, status: "afgerond" }, "Gemarkeerd als afgerond.")}
          >
            Afgerond
          </button>
        )}
        {item.status === "belegd" && (
          <button type="button" className={KNOP_SECUNDAIR} onClick={() => onWijzig({ ...item, status: "open" }, "Terug naar open.")}>
            Terug naar open
          </button>
        )}
        <button type="button" className={KNOP_SECUNDAIR} onClick={() => setEdit(true)}>
          Bewerken
        </button>
      </div>
    </li>
  );
}

function NogNodigFormulier({
  werkstromen,
  item,
  onOpslaan,
  onAnnuleren,
}: {
  werkstromen: { id: string; naam: string }[];
  item: NogNodigItem;
  onOpslaan: (n: NogNodigItem) => void;
  onAnnuleren: () => void;
}) {
  const [concept, setConcept] = useState<NogNodigItem>(item);
  const [fout, setFout] = useState<Melding | null>(null);
  // Een afgerond item kan niet terug naar open of belegd.
  const statussen = item.status === "afgerond" ? (["afgerond"] as NogNodigStatus[]) : NOG_NODIG_STATUSSEN;

  return (
    <div className="space-y-2 rounded-lg border border-yellow-300 bg-yellow-50/60 p-3">
      <label className={LABEL}>
        Wat is er nodig (onbekend: “te bepalen”)
        <textarea className={VELD} value={concept.tekst} onChange={(e) => setConcept({ ...concept, tekst: e.target.value })} />
      </label>
      <div className="grid gap-2 sm:grid-cols-3">
        <label className={LABEL}>
          Werkstroom
          <select
            className={VELD}
            value={concept.werkstroom ?? ""}
            onChange={(e) => setConcept({ ...concept, werkstroom: e.target.value || undefined })}
          >
            <option value="">— geen —</option>
            {werkstromen.map((w) => (
              <option key={w.id} value={w.id}>
                {w.naam}
              </option>
            ))}
          </select>
        </label>
        <label className={LABEL}>
          Punt
          <select
            className={VELD}
            value={concept.punt ?? ""}
            onChange={(e) => setConcept({ ...concept, punt: (e.target.value || undefined) as GeelPunt | undefined })}
          >
            <option value="">— geen —</option>
            {GEEL_PUNTEN.map((g) => (
              <option key={g.id} value={g.id}>
                {g.nummer}. {g.titel}
              </option>
            ))}
          </select>
        </label>
        <label className={LABEL}>
          Status
          <select
            className={VELD}
            value={concept.status}
            onChange={(e) => setConcept({ ...concept, status: e.target.value as NogNodigStatus })}
          >
            {statussen.map((s) => (
              <option key={s} value={s}>
                {NOG_NODIG_STATUS_LABELS[s]}
              </option>
            ))}
          </select>
        </label>
      </div>
      <label className={LABEL}>
        Actie
        <input className={VELD} value={concept.actie} onChange={(e) => setConcept({ ...concept, actie: e.target.value })} />
      </label>
      <label className={LABEL}>
        Bron (verplicht)
        <input className={VELD} value={concept.bron} onChange={(e) => setConcept({ ...concept, bron: e.target.value })} />
      </label>
      <MeldingRegel melding={fout} />
      <div className="flex flex-wrap gap-2">
        <button
          type="button"
          className={KNOP_PRIMAIR}
          onClick={() => {
            if (!concept.bron.trim()) {
              setFout({ soort: "fout", tekst: "Het bron-veld is verplicht." });
              return;
            }
            if (!concept.werkstroom && !concept.punt) {
              setFout({ soort: "fout", tekst: "Kies een werkstroom of een punt." });
              return;
            }
            onOpslaan({ ...concept, tekst: concept.tekst.trim() || TE_BEPALEN, actie: concept.actie.trim(), bron: concept.bron.trim() });
          }}
        >
          Opslaan
        </button>
        <button type="button" className={KNOP_SECUNDAIR} onClick={onAnnuleren}>
          Annuleren
        </button>
      </div>
    </div>
  );
}
