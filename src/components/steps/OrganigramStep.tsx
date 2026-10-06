"use client";

// Stap 10 — Organigram (korte versie), rechtstreeks in de app gerenderd en
// per kop en per naam handmatig aanpasbaar. De standaardinhoud staat in
// src/lib/organigram-default.ts; aanpassingen worden in de sessie bewaard
// (session.organigram, localStorage-first + Supabase via updateSession).
// De uitgebreide onderbouwing blijft een statische schets
// (public/schetsen/organigram-programmaleiding.html).
// De bouwstenen (velden, stijl, bewerkbalk) zijn gedeeld met andere bewerkbare
// pagina's: src/components/bewerkbaar/.

import { useEffect, useMemo, useState } from "react";
import { useSession } from "@/lib/session-context";
import type { OrganigramData } from "@/lib/schemas";
import { DEFAULT_ORGANIGRAM, kloon, mergeOrganigram } from "@/lib/organigram-default";
import { Lijst, RasCel, Tabel, V, metLabel } from "@/components/bewerkbaar/velden";
import { KNOP, OK_CSS } from "@/components/bewerkbaar/stijl";
import BewerkBalk, { useMelding } from "@/components/bewerkbaar/BewerkBalk";

const UITGEBREID_URL = "/schetsen/organigram-programmaleiding";
const STATISCH_URL = "/schetsen/organigram-kort";

type Upd = (fn: (d: OrganigramData) => void) => void;

// ---------- kop per sectie ----------

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
  const [melding, setMelding] = useMelding();
  const aangepast = Boolean(session?.organigram);

  useEffect(() => {
    if (!edit) setDraft(kloon(opgeslagen));
  }, [opgeslagen, edit]);

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
    setMelding({ tekst: "Opgeslagen in de sessie ✓", soort: "ok" });
  }
  function annuleren() {
    setDraft(kloon(opgeslagen));
    setEdit(false);
  }
  function herstel() {
    setDraft(kloon(DEFAULT_ORGANIGRAM));
    setMelding({ tekst: "Voorstel-tekst teruggezet — klik op Opslaan om dit te bewaren", soort: "info" });
  }

  return (
    <div className="space-y-4">
      <style>{OK_CSS}</style>

      <BewerkBalk
        intro="Programmaorganisatie van Klant in Zicht in het kort. Namen en teksten pas je hier zelf aan per kop; de aanpassingen worden in deze sessie bewaard. Status: voorstel, vast te stellen door de programma-eigenaar."
        edit={edit}
        melding={melding}
        onBewerken={() => setEdit(true)}
        onOpslaan={opslaan}
        onAnnuleren={annuleren}
        onHerstel={herstel}
        extraKnoppen={
          <a
            href={UITGEBREID_URL}
            target="_blank"
            rel="noopener noreferrer"
            className={`${KNOP} border border-cito-blue text-cito-blue bg-white hover:bg-cito-blue/5`}
          >
            Uitgebreide versie ↗
          </a>
        }
        notitie={
          aangepast ? (
            <>
              Aangepaste versie uit deze sessie. De oorspronkelijke voorstel-tekst staat op{" "}
              <a href={STATISCH_URL} target="_blank" rel="noopener noreferrer" className="underline">
                de statische pagina
              </a>
              .
            </>
          ) : null
        }
      />

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
                  <dt>Inhoudelijke kaders</dt>
                  <dd>
                    {edit ? (
                      <V v={w.kaders} on={(x) => upd((n) => void (n.werkstromen[i].kaders = x))} edit ml />
                    ) : (
                      metLabel(w.kaders, " — ")
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
                        kaders: "Pim, programma-architect — inhoudelijke kaders, toets en acceptatie",
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
