"use client";

// Sectie "AI voor marketing en sales, en agents" in het tabblad Doeltoets (stap 12). Toont de uitkomst van de
// AI-analyse (16-10): het antwoord, de plaat per domein en fase, de huidige inzet, waar AI helpt per sector, de
// varianten met het advies, de aanvullingen op het fasenplan, de risico's (voor de FG), de agents en de besluiten.
// Inhoud uit de sessie (bronnenAnalyse.doeltoets, sleutel "ai"), niet uit de code. Tolerant: ontbrekende velden
// worden overgeslagen.

/* eslint-disable @typescript-eslint/no-explicit-any */
type Los = any;

const lijst = (x: unknown): Los[] => (Array.isArray(x) ? x : []);
const tekst = (x: unknown): string => (x === undefined || x === null ? "" : typeof x === "string" ? x : Array.isArray(x) ? x.map(tekst).join(", ") : typeof x === "object" ? Object.values(x as object).filter((v) => typeof v === "string").join(" · ") : String(x));

// Domeinkleuren uit de DIN-methodiek (Cito-volgorde: cultuur, mens, Data & Systemen, processen)
const DOMEIN_KLEUR: [RegExp, string][] = [
  [/cultuur/i, "#d97706"],
  [/mens/i, "#2563eb"],
  [/data/i, "#7c3aed"],
  [/proces/i, "#059669"],
];
const domeinKleur = (naam: string) => DOMEIN_KLEUR.find(([r]) => r.test(naam))?.[1] ?? "#475569";

function Label({ children }: { children: React.ReactNode }) {
  return <p className="text-[11px] font-extrabold uppercase tracking-wider text-[#003366]">{children}</p>;
}

function Tabel({ koppen, rijen }: { koppen: string[]; rijen: (string | React.ReactNode)[][] }) {
  if (!rijen.length) return null;
  return (
    <div className="overflow-x-auto rounded-xl border border-slate-300 bg-white">
      <table className="w-full min-w-[720px] text-[13px]">
        <thead>
          <tr className="bg-[#003366] text-left text-xs font-bold uppercase tracking-wide text-white">{koppen.map((k) => <th key={k} className="px-3 py-2">{k}</th>)}</tr>
        </thead>
        <tbody>
          {rijen.map((r, i) => (
            <tr key={i} className="border-t border-slate-200 align-top odd:bg-white even:bg-slate-50">
              {r.map((c, j) => <td key={j} className={"px-3 py-2 text-gray-900" + (j === 0 ? " font-semibold" : "")}>{c}</td>)}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function Uitklap({ titel, children }: { titel: string; children: React.ReactNode }) {
  return (
    <details className="rounded-xl border border-slate-300 bg-white px-4 py-3">
      <summary className="cursor-pointer text-sm font-semibold text-[#003366] underline">{titel}</summary>
      <div className="mt-3">{children}</div>
    </details>
  );
}

export default function AiDoeltoets({ ai }: { ai: Los }) {
  if (!ai || typeof ai !== "object") return null;
  const antwoord = lijst(ai.kort?.antwoord);
  const plaat = ai.plaat ?? {};
  const plaatKoppen = lijst(plaat.kop).map(tekst);
  const helpt = lijst(ai.waarAIHelptPerSector?.rijen);
  const kaarten = lijst(ai.kansen?.kaarten);
  const sectoren = [...new Set(kaarten.map((k) => tekst(k.sector)))].filter(Boolean);
  const advies = ai.advies ?? {};
  const agents = ai.agents ?? {};
  const sleutelActiviteiten = ai.sleutel?.activiteiten && typeof ai.sleutel.activiteiten === "object" ? Object.entries(ai.sleutel.activiteiten as Record<string, unknown>) : [];

  return (
    <div className="space-y-5">
      {/* Status en vraag */}
      <div className="rounded-xl border-2 border-[#003366] bg-white p-5">
        {ai.kort?.status && <p className="text-xs font-bold text-gray-800">{tekst(ai.kort.status)}</p>}
        {ai.kort?.vraag?.citaat && <p className="mt-1 text-sm italic text-gray-900">“{tekst(ai.kort.vraag.citaat)}”{ai.kort.bron ? <span className="not-italic text-xs text-gray-700"> ({tekst(ai.kort.bron)})</span> : null}</p>}
        {antwoord.length > 0 && (
          <ol className="mt-4 grid gap-3 md:grid-cols-2 xl:grid-cols-3">
            {antwoord.map((z, i) => (
              <li key={i} className="rounded-xl border border-slate-300 bg-white p-3" style={{ borderTop: "4px solid #003366" }}>
                <p className="text-sm font-extrabold text-gray-900">{tekst(z.kop)}</p>
                <p className="mt-1 text-[13px] leading-snug text-gray-900">{tekst(z.tekst ?? z)}</p>
              </li>
            ))}
          </ol>
        )}
      </div>

      {/* De AI-proef: de lopende crawler (besluit Pim) */}
      {ai.aiProef && (
        <div className="overflow-hidden rounded-xl border-2 border-[#7c3aed] bg-white">
          <div className="bg-[#7c3aed] px-4 py-2 text-white">
            <p className="text-sm font-extrabold">{tekst(ai.aiProef.titel) || "De AI-proef"}</p>
          </div>
          <div className="space-y-3 p-4">
            {ai.aiProef.citaat && <p className="text-sm italic text-gray-900">“{tekst(ai.aiProef.citaat)}”{ai.aiProef.bron ? <span className="not-italic text-xs text-gray-700"> ({tekst(ai.aiProef.bron)})</span> : null}</p>}
            {ai.aiProef.sector?.citaat && <p className="text-sm italic text-gray-900">“{tekst(ai.aiProef.sector.citaat)}”{ai.aiProef.sector.bron ? <span className="not-italic text-xs text-gray-700"> ({tekst(ai.aiProef.sector.bron)})</span> : null}</p>}
            {ai.aiProef.wat && <p className="text-[13px] text-gray-900">{tekst(ai.aiProef.wat)}</p>}
            {ai.aiProef.sector?.wat && <p className="text-[13px] text-gray-900"><span className="font-bold">Sector: </span>{tekst(ai.aiProef.sector.wat)}</p>}
            {lijst(ai.aiProef.regels).length > 0 && (
              <Tabel
                koppen={["Fase", "Activiteit", "Week", "Wat er gebeurt", "Klaar als", "Eigenaar"]}
                rijen={lijst(ai.aiProef.regels).map((r) => [tekst(r.fase), `${tekst(r.activiteit)} ${tekst(r.titel)}`.trim(), tekst(r.week), tekst(r.kort), tekst(r.klaarAls), tekst(r.eigenaar)])}
              />
            )}
            {lijst(ai.aiProef.waarom).length > 0 && (
              <ul className="space-y-1.5">
                {lijst(ai.aiProef.waarom).map((w, i) => (
                  <li key={i} className="flex gap-2 text-[13px] leading-snug text-gray-900"><span aria-hidden="true" className="font-bold text-[#7c3aed]">→</span><span>{w.kop ? <span className="font-bold">{tekst(w.kop)} </span> : null}{tekst(w.tekst ?? w)}</span></li>
                ))}
              </ul>
            )}
            <div className="grid gap-2 md:grid-cols-2">
              {ai.aiProef.persoonsgegevens && <p className="rounded-lg bg-amber-50 border border-amber-400 px-3 py-2 text-[13px] text-gray-900"><span className="font-bold">Privacy: </span>{tekst(ai.aiProef.persoonsgegevens)}</p>}
              {ai.aiProef.teBepalen && <p className="rounded-lg bg-slate-50 border border-slate-300 px-3 py-2 text-[13px] text-gray-900"><span className="font-bold">Te bepalen: </span>{tekst(ai.aiProef.teBepalen)}</p>}
            </div>
            {(ai.aiProef.bronnen || ai.aiProef.dinPlek) && <p className="text-xs text-gray-800">{[tekst(ai.aiProef.dinPlek), tekst(ai.aiProef.bronnen)].filter(Boolean).join(" · ")}</p>}
          </div>
        </div>
      )}

      {/* Plaat per domein en fase */}
      {lijst(plaat.rijen).length > 0 && (
        <div className="space-y-2">
          <Label>De plaat: waar AI landt, per domein en fase (voorstel)</Label>
          <div className="overflow-x-auto rounded-xl border border-slate-300 bg-white">
            <table className="w-full min-w-[820px] text-[13px]">
              <thead>
                <tr className="bg-[#003366] text-left text-xs font-bold uppercase tracking-wide text-white">
                  {(plaatKoppen.length ? plaatKoppen : ["Domein", "Fase 1", "Fase 2", "Fase 3", "Later"]).map((k) => <th key={k} className="px-3 py-2">{k}</th>)}
                </tr>
              </thead>
              <tbody>
                {lijst(plaat.rijen).map((r, i) => (
                  <tr key={i} className="border-t border-slate-200 align-top">
                    <td className="px-3 py-2 font-bold text-white" style={{ background: domeinKleur(tekst(r.domein)) }}>{tekst(r.domein)}</td>
                    {["fase1", "fase2", "fase3", "later"].map((f) => <td key={f} className="px-3 py-2 text-gray-900">{tekst(r[f])}</td>)}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {plaat.uitleg && <p className="text-xs text-gray-800">{tekst(plaat.uitleg)}</p>}
        </div>
      )}

      {/* Huidige inzet */}
      {lijst(ai.initiatieven).length > 0 && (
        <div className="space-y-2">
          <Label>Hoe AI nu wordt ingezet</Label>
          <Tabel
            koppen={["Wat", "Wat het doet", "Stand", "Sectoren", "Bron"]}
            rijen={lijst(ai.initiatieven).map((x) => [tekst(x.naam), tekst(x.wat), tekst(x.stand), tekst(x.sectoren), tekst(x.bron)])}
          />
          {ai.kort?.documentatieNoot && <p className="text-xs text-gray-800">{tekst(ai.kort.documentatieNoot)}</p>}
        </div>
      )}

      {/* Waar AI helpt per sector */}
      {helpt.length > 0 && (
        <div className="space-y-2">
          <Label>Waar AI helpt, per sector: eerst het knelpunt uit de bron, dan de toepassing (voorstel)</Label>
          <Tabel
            koppen={["Sector en kans", "Knelpunt (bron)", "AI-toepassing (voorstel)", "Vermogensdeel en domein", "Activiteit en wanneer"]}
            rijen={helpt.map((r) => [tekst(r.sectorEnKans), tekst(r.knelpunt), tekst(r.aiToepassing), tekst(r.vermogensdeelEnDomein), tekst(r.activiteitEnWanneer)])}
          />
        </div>
      )}
      {kaarten.length > 0 && (
        <Uitklap titel={`Alle kansen per sector (${kaarten.length})`}>
          <div className="grid gap-3 lg:grid-cols-2">
            {(sectoren.length ? sectoren : [""]).map((s) => (
              <div key={s} className="space-y-2">
                {s && <p className="text-sm font-extrabold text-gray-900">{s}</p>}
                {kaarten.filter((k) => tekst(k.sector) === s).map((k, i) => (
                  <article key={i} className="rounded-lg border border-slate-200 p-3" style={{ borderLeft: `4px solid ${domeinKleur(tekst(k.domein))}` }}>
                    <p className="text-[13px] font-bold text-gray-900">{tekst(k.titel)}</p>
                    <p className="text-xs text-gray-800"><span className="font-bold">Knelpunt:</span> {tekst(k.knelpunt)}</p>
                    <p className="text-xs text-gray-900"><span className="font-bold">AI (voorstel):</span> {tekst(k.aiToepassing)}</p>
                    {k.randvoorwaarde && <p className="text-xs text-gray-800"><span className="font-bold">Eerst:</span> {tekst(k.randvoorwaarde)}</p>}
                    <p className="text-xs text-gray-800">{[tekst(k.vermogensdeel), tekst(k.domein), tekst(k.drager), tekst(k.wanneer)].filter(Boolean).join(" · ")}</p>
                  </article>
                ))}
              </div>
            ))}
          </div>
        </Uitklap>
      )}

      {/* Varianten en advies */}
      {lijst(ai.varianten).length > 0 && (
        <div className="space-y-2">
          <Label>Per werkstroom of een apart onderdeel? De varianten</Label>
          <Tabel
            koppen={["Variant", "Wat", "Uitkomst van de toets"]}
            rijen={lijst(ai.varianten).map((v) => [tekst(v.naam), tekst(v.wat), tekst(v.uitkomst)])}
          />
        </div>
      )}
      {advies.variant && (
        <div className="rounded-xl border-2 border-emerald-600 bg-white p-4">
          <p className="text-sm font-extrabold text-emerald-900">Advies (voorstel): {tekst(advies.variant)}</p>
          <ul className="mt-2 space-y-1.5">
            {lijst(advies.waarom).map((w, i) => (
              <li key={i} className="flex gap-2 text-[13px] leading-snug text-gray-900">
                <span aria-hidden="true" className="font-bold text-emerald-700">→</span>
                <span>{w.kop ? <span className="font-bold">{tekst(w.kop)}: </span> : null}{tekst(w.tekst ?? w)}</span>
              </li>
            ))}
          </ul>
          {advies.besluitBij && <p className="mt-2 text-xs text-gray-800"><span className="font-bold">Besluit:</span> {tekst(advies.besluitBij)}</p>}
          {advies.alsToch && <p className="mt-1 text-xs text-gray-800"><span className="font-bold">Als de stuurgroep toch iets anders wil:</span> {tekst(advies.alsToch)}</p>}
        </div>
      )}

      {/* Fasenplan */}
      {lijst(ai.fasenplanKern).length > 0 && (
        <div className="space-y-2">
          <Label>In het fasenplan: aanvullingen op bestaande activiteiten (voorstel)</Label>
          <Tabel
            koppen={["Activiteit", "Week", "Aanvulling", "Eigenaar", "Eerste stap", "Klaar als"]}
            rijen={lijst(ai.fasenplanKern).map((f) => [tekst(f.activiteit), tekst(f.week), tekst(f.aanvulling), tekst(f.eigenaar), tekst(f.eersteStap), tekst(f.klaarAls)])}
          />
        </div>
      )}
      {lijst(ai.fasenplanAanvulling).length > 0 && (
        <Uitklap titel={`Alle aanvullingen op het fasenplan (${lijst(ai.fasenplanAanvulling).length})`}>
          <Tabel
            koppen={["Fase", "Activiteit", "Aanvulling", "Week", "Eigenaar", "Klaar als"]}
            rijen={lijst(ai.fasenplanAanvulling).map((f) => [tekst(f.fase), tekst(f.titel) || tekst(f.activiteit), tekst(f.aanvulling), tekst(f.week), tekst(f.eigenaar), tekst(f.klaarAls)])}
          />
        </Uitklap>
      )}

      {/* Risico's */}
      {lijst(ai.risicos?.kern).length > 0 && (
        <div className="space-y-2">
          <Label>Risico's en regels: aandachtspunten, te toetsen door de FG</Label>
          <Tabel
            koppen={["Risico", "Wat we zien", "Beheersing", "Waar"]}
            rijen={lijst(ai.risicos.kern).map((r) => [tekst(r.risico), tekst(r.watWeZien), tekst(r.beheersing), tekst(r.activiteit)])}
          />
          {lijst(ai.risicos.vragenFG).length > 0 && (
            <Uitklap titel={`Vragen voor de FG (${lijst(ai.risicos.vragenFG).length})`}>
              <ol className="space-y-1.5">{lijst(ai.risicos.vragenFG).map((v, i) => <li key={i} className="text-[13px] text-gray-900"><span className="font-bold">{tekst(v.nr) || i + 1}.</span> {tekst(v.vraag)}{v.raakt ? <span className="text-xs text-gray-700"> · raakt: {tekst(v.raakt)}</span> : null}</li>)}</ol>
            </Uitklap>
          )}
        </div>
      )}

      {/* Agents */}
      {(lijst(agents.inHetKort).length > 0 || lijst(agents.perDrager).length > 0) && (
        <div className="space-y-3 rounded-xl border border-slate-300 bg-slate-50 p-4">
          <Label>Agents voor de uitvoering en voor het programmamanagementteam (voorstel; bouwen is het laatste backlog-item)</Label>
          {lijst(agents.inHetKort).length > 0 && (
            <dl className="grid gap-2 md:grid-cols-2">
              {lijst(agents.inHetKort).map((q, i) => (
                <div key={i} className="rounded-lg border border-slate-200 bg-white p-3">
                  <dt className="text-[13px] font-bold text-gray-900">{tekst(q.vraag)}</dt>
                  <dd className="text-[13px] text-gray-900">{tekst(q.antwoord)}</dd>
                </div>
              ))}
            </dl>
          )}
          <Tabel
            koppen={["Drager", "Activiteiten", "Ja", "Deels", "Nee", "Helpt het meest"]}
            rijen={lijst(agents.perDrager).map((r) => [tekst(r.drager), tekst(r.activiteiten), tekst(r.ja), tekst(r.deels), tekst(r.nee), tekst(r.helptHetMeest)])}
          />
          <Tabel
            koppen={["Programmamanagementteam", "De agent maakt", "De mens", "Voorwaarde"]}
            rijen={lijst(agents.programmamanagementteam).map((r) => [tekst(r.functie), tekst(r.agentMaakt), tekst(r.mens), tekst(r.voorwaarde)])}
          />
          {lijst(agents.volgorde).length > 0 && (
            <ol className="space-y-1.5">{lijst(agents.volgorde).map((v, i) => <li key={i} className="text-[13px] text-gray-900"><span className="font-bold">{tekst(v.stap) || i + 1}. {tekst(v.wat)}</span>{v.waarom ? <span className="block text-xs text-gray-800">{tekst(v.waarom)}</span> : null}</li>)}</ol>
          )}
        </div>
      )}

      {/* Besluiten en te bepalen */}
      {lijst(ai.besluiten).length > 0 && (
        <div className="space-y-2">
          <Label>Besluiten over AI en agents</Label>
          <ol className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
            {lijst(ai.besluiten).map((b, i) => (
              <li key={i} className="rounded-xl border-2 border-amber-400 bg-amber-50 p-3">
                <p className="text-[13px] font-bold text-gray-900">{tekst(b.besluit)}</p>
                <p className="text-xs text-gray-800">{[b.wie && `Besluit: ${tekst(b.wie)}`, b.wanneer && `Wanneer: ${tekst(b.wanneer)}`].filter(Boolean).join(" · ")}</p>
                {b.standaardlezing && <p className="mt-1 text-xs text-gray-800"><span className="font-bold">Onze lezing (voorstel):</span> {tekst(b.standaardlezing)}</p>}
              </li>
            ))}
          </ol>
        </div>
      )}
      {lijst(ai.teBepalen?.lijst).length > 0 && (
        <Uitklap titel={`Nog te bepalen (${lijst(ai.teBepalen.lijst).length})`}>
          <Tabel koppen={["Wat", "Hoe", "Wanneer"]} rijen={lijst(ai.teBepalen.lijst).map((t) => [tekst(t.wat), tekst(t.hoe), tekst(t.wanneer)])} />
        </Uitklap>
      )}

      {/* Sleutel en bronnen */}
      {(sleutelActiviteiten.length > 0 || lijst(ai.bronnen?.lijst).length > 0) && (
        <Uitklap titel="Sleutel bij de codes en bronnen">
          <div className="grid gap-4 lg:grid-cols-2">
            {sleutelActiviteiten.length > 0 && (
              <div>
                <Label>Activiteiten in het fasenplan</Label>
                <ul className="mt-1 space-y-1">{sleutelActiviteiten.map(([code, v]) => <li key={code} className="text-xs text-gray-900"><span className="font-bold">{code}</span> {tekst(v)}</li>)}</ul>
              </div>
            )}
            {lijst(ai.bronnen?.lijst).length > 0 && (
              <div>
                <Label>Bronnen</Label>
                <ul className="mt-1 space-y-1">{lijst(ai.bronnen.lijst).map((b, i) => <li key={i} className="text-xs text-gray-900"><span className="font-bold">{tekst(b.code)}</span> {tekst(b.bron)}{b.vindplaats ? ` · ${tekst(b.vindplaats)}` : ""}</li>)}</ul>
              </div>
            )}
          </div>
        </Uitklap>
      )}
    </div>
  );
}
