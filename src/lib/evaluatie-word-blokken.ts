// Word-export van de evaluatie (evaluatie-word.ts): per bloktype de weergave in Word.
// De opbouw volgt de app: dezelfde onderdelen, kolommen, volgorde en kopjes als
// BewerkbaarDocument.tsx en de blokken in src/components/bewerkbaar/blokken. Wat de app
// uitrekent (voortgangsbord, onderdelen op de werkstroomkaart, standlijn) rekent
// evaluatie-word-reken.ts op dezelfde manier uit.
//
// Wat alleen bij het scherm hoort, staat er niet in: keuzelijstjes, links binnen de pagina
// ("Hele tijdlijn", "Voortgangsbord"), en een Jira-koppeling zonder adres. Een bloktype
// dat hier niet bekend is, wordt overgeslagen met een melding in de console.

import { AlignmentType, ExternalHyperlink, TextRun } from "docx";
import type { Paragraph, ParagraphChild, Table, TableCell, TableRow } from "docx";
import type { DocBlok } from "@/lib/schemas";
import type { ExportVersie } from "@/lib/evaluatie-uitsnede";
import type { BlokVan } from "@/components/bewerkbaar/blok-typen";
import { splitsLeads } from "@/components/bewerkbaar/leads";
import { voortgangSoort } from "@/components/bewerkbaar/blokken/TijdlijnBlok";
import { NODIG_GROEPEN, nodigGroepen } from "@/components/bewerkbaar/blokken/VoortgangsbordBlok";
import {
  CHIP,
  FONT,
  G,
  GEEN,
  K,
  SYMBOOL,
  alinea,
  bol,
  cel,
  chip,
  heeft,
  hex,
  kader,
  kopCel,
  label,
  leeg,
  lijn,
  meng,
  metLabel,
  punt,
  rij,
  schoon,
  t,
  tab,
  tabel,
  tekstAlinea,
  vakje,
  verdeel,
  wit,
} from "@/lib/evaluatie-word-basis";
import type { Randen } from "@/lib/evaluatie-word-basis";
import {
  HORIZON_DAGEN,
  NUMMER_REGEL,
  accentKleur,
  alineas,
  balkKleur,
  beeldSoort,
  berekenStand,
  celVan,
  chipSoort,
  dag00,
  ddmmjjjj,
  domeinenVan,
  isJira,
  isLink,
  jaarIndeling,
  kleurVan,
  legeTelling,
  niveauKleur,
  onderdelenPerAnker,
  oordeelNaam,
  opSchema,
  planVan,
  procent,
  splitsBeeld,
  splitsBron,
  splitsSchakel,
  standlijn,
  statusSoort,
  telOp,
  voortgangPct,
} from "@/lib/evaluatie-word-reken";
import type { Alinea, BeeldSoort, Bord, GroepStand, Kaart, KaartOnderdeel, Onderdeel, Tijdlijn } from "@/lib/evaluatie-word-reken";

export type Inhoud = (Paragraph | Table)[];

/** Wat een blok nodig heeft van de rest van het document. */
export interface Ctx {
  versie: ExportVersie;
  /** bruikbare breedte van de pagina waarop het blok staat (twips) */
  breedte: number;
  vandaag: Date;
  /** de eerste tijdlijn, het eerste voortgangsbord en de werkstroomkaarten in de export (zoals useBlok in de app) */
  tijdlijn: Tijdlijn | null;
  bord: Bord | null;
  kaarten: Kaart[];
}

type Nodig = Bord["werkstromen"][number]["nodig"][number];
type Koppeling = Kaart["koppelingen"][number];

// ---------- kleine onderdelen ----------

/** Titel van een blok (tabel, lijst, bord): klein kopje in Cito-blauw. */
export function blokTitel(tekst: string): Paragraph {
  return alinea(t(tekst, { size: G.h3, bold: true, color: K.cito }), { voor: 120, na: 100, bijVolgende: true });
}

/** Legenda of bronregel onder een blok. */
function legenda(tekst: string, bijVolgende = false): Paragraph {
  return alinea(t(tekst, { size: G.fijn, color: K.inkt2 }), { voor: 80, na: 160, regel: 264, bijVolgende, bijeen: true });
}

/** Statusteken van 3sides (+, +/-, -) als gekleurd vakje; zonder status een open rondje. */
function statusRuns(status: string, size: number, metLeeg = true): TextRun[] {
  switch (statusSoort(status)) {
    case "plus":
      return vakje("+", "059669", K.wit, size);
    case "plusmin":
      return vakje("±", "D97706", K.wit, size);
    case "min":
      return vakje("−", "DC2626", K.wit, size);
    case "anders":
      return vakje(schoon(status), "94A3B8", K.wit, size);
    default:
      return metLeeg ? t("○", { size, color: "94A3B8", font: SYMBOOL }) : [];
  }
}

/** Voortgang (Loopt, Niet gestart, Afgerond) in de kleuren van de tijdlijn. */
function voortgangRuns(voortgang: string, size: number): TextRun[] {
  const v = schoon(voortgang);
  if (!v) return [];
  const soort = voortgangSoort(v);
  if (soort === "afgerond") return [...t("✓ ", { size, bold: true, color: K.groen, font: SYMBOOL }), ...t(v, { size, bold: true, color: K.groen })];
  if (soort === "niet") return t(v, { size, color: K.inkt2 });
  return t(v, { size, bold: true });
}

const spatie = (size: number) => t(" ", { size });

/** Afvinkbare regel: ☐ of ☑; afgevinkt = doorgestreept en gedempt. */
function vinkRegel(tekst: string, klaar: boolean, size: number, lijm = false): Paragraph {
  return punt(
    t(tekst, { size, color: klaar ? K.inkt3 : K.inkt, strike: klaar }),
    t(klaar ? "☑" : "☐", { size, color: klaar ? K.groen : K.cito, font: SYMBOOL }),
    { na: 50, inspring: 250, regel: 252, bijVolgende: lijm }
  );
}

/** Kopje van een groepje binnen "nog nodig": Van 3sides, Door Cito. */
function groepKop(tekst: string, eerste: boolean, lijm = false): Paragraph {
  return label(tekst, K.inkt2, { voor: eerste ? 0 : 80, na: 40, bijVolgende: lijm });
}

/**
 * "Nog nodig" in de groepjes "Van 3sides" en "Door Cito" (regels die met "Cito:" beginnen,
 * zonder voorvoegsel), elk alleen als er regels in staan: zoals het bord en de kaarten.
 */
function nodigLijst(items: readonly Nodig[], size: number, lijm = false): Paragraph[] {
  const groepen = nodigGroepen(items, (x) => schoon(x.tekst));
  const uit: Paragraph[] = [];
  for (const { sleutel, kop } of NODIG_GROEPEN) {
    const regels = groepen[sleutel].filter((r) => heeft(r.tekst));
    if (regels.length === 0) continue;
    uit.push(groepKop(kop, uit.length === 0, lijm));
    for (const r of regels) uit.push(vinkRegel(schoon(r.tekst), r.x.klaar === true, size, lijm));
  }
  return uit;
}

/**
 * De koppelingen van een werkstroomkaart, als namen met " · " ertussen; met een adres een
 * link. Een Jira-koppeling zonder adres is in de app een plek om de link in te vullen en
 * komt niet in de export.
 */
function koppelingRuns(kops: readonly Koppeling[], size: number): ParagraphChild[] | null {
  const zichtbaar = kops.filter((k) => {
    const url = schoon(k.url);
    if (isJira(schoon(k.label)) && !isLink(url)) return false;
    return heeft(k.label) || isLink(url);
  });
  if (zichtbaar.length === 0) return null;
  const uit: ParagraphChild[] = [];
  zichtbaar.forEach((k, i) => {
    if (i > 0) uit.push(...t("  ·  ", { size, color: K.inkt3 }));
    const url = schoon(k.url);
    const naam = schoon(k.label) || url;
    if (isLink(url)) {
      uit.push(
        new ExternalHyperlink({
          link: url,
          children: [new TextRun({ text: naam, font: FONT, size, color: K.cito, underline: {} })],
        })
      );
    } else {
      uit.push(...t(naam, { size, color: K.inkt }));
    }
  });
  return uit;
}

/** Domeinnamen als gekleurde vakjes (de chips op de kaart). */
function domeinRuns(ids: readonly string[] | undefined, size: number): TextRun[] {
  const uit: TextRun[] = [];
  for (const d of domeinenVan(ids)) {
    if (uit.length > 0) uit.push(...spatie(size));
    uit.push(...vakje(d.label, meng(d.kleur, 0.14), meng(d.kleur, 0.72, "000000"), size));
  }
  return uit;
}

// ---------- tekst, kader, lijst, tabel, kaarten ----------

function tekstBlok(b: BlokVan<"tekst">): Inhoud {
  return heeft(b.tekst) ? [tekstAlinea(schoon(b.tekst), {}, { na: 160 })] : [];
}

function calloutBlok(b: BlokVan<"callout">, ctx: Ctx): Inhoud {
  if (!heeft(b.titel) && !heeft(b.tekst)) return [];
  const toon = typeof b.toon === "string" ? b.toon : "info";
  const inhoud = heeft(b.tekst) ? [alinea(t(schoon(b.tekst), { size: G.body, color: toon === "besluit" ? K.inkt : toon === "let-op" ? "78350F" : "1E3A5F" }), { na: 0 })] : [];
  return [kader(inhoud, ctx.breedte, toon, schoon(b.titel)), wit()];
}

function lijstBlok(b: BlokVan<"lijst">): Inhoud {
  const items = (b.items ?? []).map(schoon).filter(Boolean);
  if (!heeft(b.titel) && items.length === 0) return [];
  const uit: Inhoud = [];
  if (heeft(b.titel)) uit.push(blokTitel(schoon(b.titel)));
  // stappen of agendapunten ("1 · …", "2 · …"): cijfers in plaats van puntjes, zoals de app
  const genummerd = items.length > 1 && items.every((s) => NUMMER_REGEL.test(s));
  items.forEach((s, i) => {
    const m = genummerd ? NUMMER_REGEL.exec(s) : null;
    const laatste = i === items.length - 1;
    if (m) uit.push(punt(metLabel(m[2]), t(m[1], { bold: true, color: K.cito }), { inspring: 340, na: laatste ? 180 : 90 }));
    else uit.push(punt(metLabel(s), bol(), { na: laatste ? 180 : 80 }));
  });
  return uit;
}

/** Kolombreedtes naar de hoeveelheid tekst per kolom, met een minimum zodat een woord niet breekt. */
function kolomBreedtes(kolommen: string[], rijen: string[][], totaal: number, size: number): number[] {
  const perTeken = size * 5.6; // ruwe breedte van een teken in twips bij deze lettergrootte
  const langsteWoord = (s: string) => Math.max(0, ...s.split(/[\s/-]+/).map((w) => w.length));
  const gewichten = kolommen.map((kop, c) => {
    const lengtes = rijen.map((r) => schoon(r[c]).length);
    const gem = lengtes.length > 0 ? lengtes.reduce((a, x) => a + x, 0) / lengtes.length : 0;
    const max = Math.max(0, ...lengtes);
    // evenredig met de tekst, met de langste cel het zwaarst: zo worden de rijen het minst hoog
    return Math.min(Math.max(kop.length, 0.3 * gem + 0.7 * max, 6), 400);
  });
  const minima = kolommen.map((kop, c) => {
    const woord = Math.min(18, Math.max(langsteWoord(kop), ...rijen.map((r) => langsteWoord(schoon(r[c])))));
    return Math.round(woord * perTeken + 260);
  });
  return verdeel(totaal, gewichten, minima);
}

function tabelBlok(b: BlokVan<"tabel">, ctx: Ctx): Inhoud {
  const kolommen = (b.kolommen ?? []).map(schoon);
  const n = kolommen.length;
  if (n === 0) return heeft(b.titel) ? [blokTitel(schoon(b.titel))] : [];
  const rijen = (b.rijen ?? []).map((r) => kolommen.map((_, c) => schoon((r ?? [])[c])));
  const size = n >= 6 ? G.fijn : G.tabel;
  const breedtes = kolomBreedtes(kolommen, rijen, ctx.breedte, size);
  const chipKolom = typeof b.chipKolom === "number" ? b.chipKolom : -1;

  const kop = rij(
    kolommen.map((k, c) => kopCel(k, breedtes[c], { size, midden: c === chipKolom })),
    { kop: true }
  );
  const lichaam = rijen.map((r, ri) => {
    // de laatste rij blijft bij de legenda eronder
    const bijVolgende = ri === rijen.length - 1 && heeft(b.legenda);
    return rij(
      r.map((v, c) => {
        if (c === chipKolom) {
          if (!v) return cel([], { breedte: breedtes[c] });
          const k = CHIP[chipSoort(v)];
          return cel([alinea(t(v, { size, bold: true, color: k.tekst }), { na: 0, regel: 252, uitlijning: AlignmentType.CENTER, bijVolgende })], {
            breedte: breedtes[c],
            vlak: k.vlak,
            midden: true,
          });
        }
        return cel([alinea(t(v, { size, bold: c === 0, color: K.inkt }), { na: 0, regel: 252, bijVolgende })], {
          breedte: breedtes[c],
          vlak: ri % 2 === 1 ? K.vlak : undefined,
        });
      }),
      // een rij met heel veel tekst mag breken, anders blijft er een halve pagina wit
      { breekbaar: r.some((v) => v.length > 900) }
    );
  });

  const uit: Inhoud = [];
  if (heeft(b.titel)) uit.push(blokTitel(schoon(b.titel)));
  uit.push(tabel(breedtes, [kop, ...lichaam]));
  uit.push(heeft(b.legenda) ? legenda(schoon(b.legenda)) : wit());
  return uit;
}

function kaartenBlok(b: BlokVan<"kaarten">, ctx: Ctx): Inhoud {
  const uit: Inhoud = [];
  const wLabel = Math.min(2400, Math.round(ctx.breedte * 0.26));
  for (const k of b.kaarten ?? []) {
    const regels = (k.regels ?? []).filter((r) => heeft(r.label) || heeft(r.waarde));
    if (!heeft(k.titel) && regels.length === 0) continue;
    const rijen: TableRow[] = [
      rij([
        cel(
          [
            alinea(t(schoon(k.titel), { size: G.h3, bold: true, color: K.cito }), { na: heeft(k.ondertitel) ? 30 : 0, bijVolgende: true }),
            ...(heeft(k.ondertitel) ? [alinea(t(schoon(k.ondertitel), { size: G.tabel, color: K.inkt2 }), { na: 0, bijVolgende: true })] : []),
          ],
          { breedte: ctx.breedte, span: 2, vlak: K.vlakBlauw, randen: { top: lijn(K.cito, 18), bottom: lijn(), left: lijn(), right: lijn() }, marge: [100, 140, 100, 140] }
        ),
      ]),
      ...regels.map((r) =>
        rij([
          cel([alinea(t(schoon(r.label), { size: G.tabel, bold: true, color: r.accent ? K.amber : K.inkt2 }), { na: 0 })], { breedte: wLabel, vlak: K.vlak }),
          cel([alinea(t(schoon(r.waarde), { size: G.tabel, bold: !!r.accent, color: r.accent ? K.amber : K.inkt }), { na: 0 })], { breedte: ctx.breedte - wLabel }),
        ])
      ),
    ];
    uit.push(tabel([wLabel, ctx.breedte - wLabel], rijen), wit());
  }
  return uit;
}

// ---------- werkstroomkaarten ----------

/** Maandbereik "jul → okt"; waar de tijdlijn geen maand noemt: "te bepalen". */
function bereikRuns(o: KaartOnderdeel, size: number): TextRun[] {
  const vaag = { size, italics: true, color: K.inkt3 };
  if (o.zonderMaand) return t("start en oplevering te bepalen", vaag);
  return [
    ...(o.start ? t(o.start, { size }) : t("start te bepalen", vaag)),
    ...t("  →  ", { size, color: K.inkt3 }),
    ...(o.oplevering ? t(o.oplevering, { size, bold: o.verstreken, color: o.verstreken ? K.rood : K.inkt }) : t("oplevering te bepalen", vaag)),
  ];
}

function werkstroomKaart(k: Kaart, ctx: Ctx, perAnker: Map<string, KaartOnderdeel[]> | null, metTijdlijn: boolean): Table {
  const B = ctx.breedte;
  const wLabel = 1700;
  const wPeriode = 2550;
  const wStatus = 1500;
  const kol = [wLabel, B - wLabel - wPeriode - wStatus, wPeriode, wStatus];
  const wInhoud = B - wLabel;
  const doms = domeinenVan(k.domeinen);
  const accent = hex(accentKleur(doms));
  const accentDonker = meng(accent, 0.75, "000000");
  const s = G.tabel;
  const id = schoon(k.id);

  const labelCel = (tekst: string, o: { kleur?: string; rijen?: number } = {}) =>
    cel([alinea(t(tekst, { size: G.label, bold: true, color: o.kleur ?? K.cito, allCaps: true, spatie: 10 }), { na: 0, voor: 20 })], {
      breedte: wLabel,
      vlak: K.vlak,
      rijen: o.rijen,
      marge: [90, 100, 90, 140],
    });
  const inhoudCel = (inhoud: Paragraph[]) => cel(inhoud, { breedte: wInhoud, span: 3, marge: [90, 140, 90, 140] });
  // Geen "bij volgende" in deze rijen: een kaart is ongeveer een pagina hoog, en rijen die aan
  // elkaar vastzitten geven dan halflege pagina's. Alleen de kop blijft bij de eerste rij.
  const deel = (titel: string, inhoud: Paragraph[], kleur?: string) => rij([labelCel(titel, { kleur }), inhoudCel(inhoud)]);

  // kop: naam, naam bij 3sides, domeinen, leads en bron
  const kop: Paragraph[] = [alinea(t(schoon(k.naam) || "Werkstroom zonder naam", { size: 28, bold: true, color: K.cito }), { na: 50, bijVolgende: true })];
  const onder: TextRun[] = [];
  if (heeft(k.bijnaam)) onder.push(...t("3sides: ", { size: s, bold: true, color: K.inkt2 }), ...t(schoon(k.bijnaam), { size: s, color: K.inkt2 }));
  const chips = domeinRuns(k.domeinen, G.fijn);
  if (chips.length > 0) {
    if (onder.length > 0) onder.push(...t("     ", { size: s }));
    onder.push(...chips);
  }
  if (onder.length > 0) kop.push(alinea(onder, { na: 70, bijVolgende: true }));
  const leads = splitsLeads(schoon(k.leads));
  if (leads.length > 0) {
    const runs: TextRun[] = [];
    leads.forEach((l, i) => {
      if (i > 0) runs.push(...t("     ", { size: s }));
      if (l.rol) runs.push(...t(l.rol + "  ", { size: G.label, bold: true, color: K.inkt3, allCaps: true, spatie: 10 }));
      runs.push(...t(l.naam, { size: G.body, bold: true }));
    });
    kop.push(alinea(runs, { na: heeft(k.bron) ? 40 : 0, bijVolgende: true }));
  }
  if (heeft(k.bron)) {
    kop.push(
      alinea([...t("Bron  ", { size: G.label, bold: true, color: K.inkt3, allCaps: true, spatie: 10 }), ...t(schoon(k.bron), { size: s, color: K.inkt2 })], {
        na: 0,
        bijVolgende: true,
      })
    );
  }
  const rijen: TableRow[] = [
    rij([
      cel(kop, {
        breedte: B,
        span: 4,
        vlak: meng(accent, 0.06),
        randen: { top: lijn(accent, 36), bottom: lijn(), left: lijn(), right: lijn() },
        marge: [130, 160, 120, 160],
      }),
    ]),
  ];

  // Waarom
  rijen.push(deel("Waarom", [heeft(k.waarom) ? alinea(t(schoon(k.waarom), { size: G.body }), { na: 0 }) : leeg("te bepalen", s, { na: 0 })]));

  // Resultaten
  const resultaten = (k.resultaten ?? []).map(schoon).filter(Boolean);
  rijen.push(
    deel(
      "Resultaten",
      resultaten.length > 0
        ? resultaten.map((r, i) => punt(metLabel(r, { size: s }), bol(accent, s), { na: i === resultaten.length - 1 ? 0 : 50, regel: 252 }))
        : [leeg("te bepalen", s, { na: 0 })]
    )
  );

  // Planning
  const stappen = (k.planning ?? []).filter((x) => heeft(x.wanneer) || heeft(x.wat));
  rijen.push(
    deel(
      "Planning",
      stappen.length > 0
        ? stappen.map((x, i) =>
            alinea([...t(heeft(x.wanneer) ? schoon(x.wanneer) : "te bepalen", { size: s, bold: true, color: accentDonker }), tab(), ...t(schoon(x.wat), { size: s })], {
              na: i === stappen.length - 1 ? 0 : 50,
              links: 1350,
              hangend: 1350,
              tabLinks: 1350,
              regel: 252,
            })
          )
        : [leeg("te bepalen", s, { na: 0 })]
    )
  );

  // Onderdelen in de tijdlijn: alleen als de kaart een tijdlijngroep heeft
  const onderdelen = (id && perAnker?.get(id)) || null;
  if (metTijdlijn && onderdelen !== null) {
    if (onderdelen.length === 0) {
      rijen.push(deel("Onderdelen in de tijdlijn", [leeg("Nog geen onderdelen in de tijdlijn", s, { na: 0 })]));
    } else {
      const dun: Randen = { top: lijn(), bottom: lijn(), left: GEEN, right: GEEN };
      onderdelen.forEach((o, i) => {
        const naam: TextRun[] = t(schoon(o.naam) || "Onderdeel zonder naam", { size: s, color: o.verstreken ? K.rood : K.inkt, bold: o.verstreken });
        if (o.verstreken) naam.push(...t("  verstreken", { size: G.label, bold: true, color: K.rood, allCaps: true, spatie: 10 }));
        const status: TextRun[] = [...statusRuns(o.status, G.fijn), ...spatie(s), ...voortgangRuns(o.voortgang, G.fijn)];
        const cellen: TableCell[] = [
          cel([alinea(naam, { na: 0, regel: 252 })], { breedte: kol[1], randen: { ...dun, left: lijn() }, marge: [55, 80, 55, 140] }),
          cel([alinea(bereikRuns(o, G.fijn), { na: 0, regel: 252 })], { breedte: kol[2], randen: dun, marge: [55, 80, 55, 80] }),
          cel([alinea(status, { na: 0, regel: 252 })], { breedte: kol[3], randen: { ...dun, right: lijn() }, marge: [55, 100, 55, 80] }),
        ];
        rijen.push(rij(i === 0 ? [labelCel("Onderdelen in de tijdlijn", { rijen: onderdelen.length }), ...cellen] : cellen));
      });
    }
  }

  // In het DIN: van inspanning via vermogen naar baat
  const pad = (k.dinPad ?? []).map(schoon).filter(Boolean).map(splitsSchakel);
  rijen.push(
    deel(
      "In het DIN",
      pad.length > 0
        ? pad.map((x, i) => {
            const kleur = meng(hex(niveauKleur(x.prefix)), 0.85, "000000");
            return alinea(
              [
                ...(x.prefix ? t(x.prefix + "  ", { size: G.label, bold: true, color: kleur, allCaps: true, spatie: 10 }) : []),
                ...t(x.rest, { size: s }),
              ],
              { na: i === pad.length - 1 ? 0 : 60, regel: 252 }
            );
          })
        : [leeg("te bepalen", s, { na: 0 })]
    )
  );

  // Nog nodig: de regels uit het voortgangsbord, anders de eigen lijst van de kaart
  const bordRegels = id ? ((ctx.bord?.werkstromen ?? []).find((w) => schoon(w.anker) === id)?.nodig ?? []) : [];
  const uitBord = nodigGroepen(bordRegels, (x) => schoon(x.tekst));
  const heeftBord = [...uitBord.van3sides, ...uitBord.doorCito].some((r) => heeft(r.tekst));
  let nodig: Paragraph[];
  let open: boolean;
  if (heeftBord) {
    nodig = nodigLijst(bordRegels, s);
    open = [...uitBord.van3sides, ...uitBord.doorCito].some((r) => r.x.klaar !== true && heeft(r.tekst));
  } else {
    const eigen = nodigGroepen(k.aanvullen ?? [], (x) => schoon(x));
    nodig = [];
    for (const { sleutel, kop: groep } of NODIG_GROEPEN) {
      const regels = eigen[sleutel].filter((r) => heeft(r.tekst));
      if (regels.length === 0) continue;
      nodig.push(groepKop(groep, nodig.length === 0));
      for (const r of regels) nodig.push(punt(t(schoon(r.tekst), { size: s }), bol(K.amber, s), { na: 50, regel: 252 }));
    }
    open = nodig.length > 0;
    if (nodig.length === 0) nodig = [leeg("Geen open punten", s, { na: 0 })];
  }
  rijen.push(deel("Nog nodig", nodig, open ? K.amber : undefined));

  // Documenten en status
  const kops = koppelingRuns(k.koppelingen ?? [], s);
  rijen.push(deel("Documenten en status", [kops ? alinea(kops, { na: 0, regel: 264 }) : leeg("Nog geen documenten gekoppeld", s, { na: 0 })]));

  return tabel(kol, rijen);
}

function werkstromenBlok(b: BlokVan<"werkstromen">, ctx: Ctx): Inhoud {
  const kaarten = b.kaarten ?? [];
  if (kaarten.length === 0) return [];
  const perAnker = ctx.tijdlijn ? onderdelenPerAnker(ctx.tijdlijn, dag00(ctx.vandaag)) : null;
  const heeftGroep = (k: Kaart) => !!schoon(k.id) && !!perAnker?.has(schoon(k.id));
  const metTijdlijn = perAnker !== null && kaarten.some(heeftGroep);
  const uit: Inhoud = [];
  for (const k of kaarten) uit.push(werkstroomKaart(k, ctx, perAnker, metTijdlijn), wit(260));
  return uit;
}

// ---------- tijdlijn ----------

function tijdlijnBlok(b: Tijdlijn, ctx: Ctx): Inhoud {
  const maanden = (b.maanden ?? []).map(schoon);
  const groepen = b.groepen ?? [];
  const n = maanden.length;
  if (n === 0 || groepen.length === 0) return [];

  const B = ctx.breedte;
  const liggend = B > 12000;
  const wStatus = liggend ? 1800 : 1500;
  const wMaand = Math.floor((B - wStatus - (liggend ? 4300 : 2700)) / n);
  const wOnderdeel = B - wStatus - wMaand * n;
  const kol = [wOnderdeel, wStatus, ...Array.from({ length: n }, () => wMaand)];
  const s = liggend ? G.fijn : 17;

  const jaren = jaarIndeling(b.jaren, n);
  const jaarVan = (i: number) => jaren.find((j) => i >= j.van && i < j.van + j.aantal)?.label ?? "";
  const maand = (i: number) => `${maanden[i] ?? ""} ${jaarVan(i)}`.trim();
  const grenzen = jaren.map((j) => j.van).filter((i) => i > 0 && i < n);
  const stand = standlijn(b, maanden, n, ctx.vandaag);
  // een maand is voorbij als hij helemaal links van de standlijn ligt
  const voorbij = (i: number) => stand !== null && (i + 1) / n <= stand.frac + 1e-9;
  const nuIdx = stand?.idx ?? -1;
  const NU = "FDE68A";

  // kop: jaren boven de maanden; beide regels herhalen op een volgende pagina
  const kopRijen: TableRow[] = [];
  const bedekt = jaren.reduce((a, j) => a + j.aantal, 0);
  const metJaren = jaren.length > 0;
  if (metJaren) {
    kopRijen.push(
      rij(
        [
          kopCel("Onderdeel", kol[0], { size: s, rijen: 2 }),
          kopCel("Status", kol[1], { size: s, rijen: 2 }),
          ...jaren.map((j) => kopCel(schoon(j.label), wMaand * j.aantal, { size: s, span: j.aantal, midden: true })),
          ...(bedekt < n ? [kopCel("", wMaand * (n - bedekt), { size: s, span: n - bedekt })] : []),
        ],
        { kop: true }
      )
    );
  }
  const maandCellen = maanden.map((m, i) =>
    cel([alinea(t(m, { size: G.label, bold: true, color: i === nuIdx ? K.cito : K.inkt2 }), { na: 0, uitlijning: AlignmentType.CENTER, bijVolgende: true })], {
      breedte: wMaand,
      vlak: i === nuIdx ? NU : voorbij(i) ? "DFE6EF" : "EEF2F7",
      randen: { top: lijn(K.rand), bottom: lijn(K.rand), right: lijn(K.rand), left: lijn(grenzen.includes(i) ? K.inkt3 : K.rand, grenzen.includes(i) ? 12 : 4) },
      marge: [50, 20, 50, 20],
      midden: true,
    })
  );
  kopRijen.push(rij(metJaren ? maandCellen : [kopCel("Onderdeel", kol[0], { size: s }), kopCel("Status", kol[1], { size: s }), ...maandCellen], { kop: true }));

  // wat de legenda moet tonen
  const vlag = { niet: false, af: false, vaag: false, door: false };
  const gebruikt = new Set<string>();
  let alleVier = false;

  const rijen: TableRow[] = [...kopRijen];
  for (const g of groepen) {
    const ds = domeinenVan(g.domeinen);
    for (const d of ds) gebruikt.add(d.id);
    if (ds.length >= 4) alleVier = true;
    const kleur = hex(balkKleur(ds));
    const bijnaam = schoon(g.bijnaam);
    rijen.push(
      rij([
        cel(
          [
            alinea(
              [
                ...t(schoon(g.naam), { size: G.body, bold: true, color: K.cito }),
                ...(bijnaam ? t("     " + (/^3sides\b/i.test(bijnaam) ? bijnaam : "3sides: " + bijnaam), { size: s, color: K.inkt2 }) : []),
              ],
              { na: 0, bijVolgende: true }
            ),
          ],
          {
            breedte: B,
            span: n + 2,
            vlak: meng(kleur, 0.07),
            randen: { top: lijn(K.rand), bottom: lijn(), right: lijn(), left: lijn(kleur, 36) },
            marge: [70, 110, 70, 130],
          }
        ),
      ])
    );
    for (const r of g.rijen ?? []) {
      const cellen = Array.from({ length: n }, (_, i) => celVan((r.cellen ?? [])[i]));
      const plan = planVan(cellen);
      const soort = voortgangSoort(r.voortgang);
      if (plan) {
        if (soort === "niet") vlag.niet = true;
        if (soort === "afgerond") vlag.af = true;
        if (!plan.startGemarkeerd || plan.eind === "open") vlag.vaag = true;
        if (plan.eind === "door") vlag.door = true;
      }
      const balk = soort === "afgerond" ? meng(kleur, 0.95) : soort === "niet" ? meng(kleur, 0.2) : meng(kleur, 0.5);
      const teken = soort === "afgerond" ? K.wit : meng(kleur, 0.6, "000000");
      const status: TextRun[] = [...statusRuns(schoon(r.status), s), ...spatie(s), ...voortgangRuns(r.voortgang, s)];
      rijen.push(
        rij([
          cel([alinea(t(schoon(r.activiteit) || "Onderdeel zonder naam", { size: s }), { na: 0, regel: 250 })], { breedte: kol[0], marge: [50, 90, 50, 130], midden: true }),
          cel([alinea(status, { na: 0, regel: 250 })], { breedte: kol[1], marge: [50, 60, 50, 90], midden: true }),
          ...cellen.map((c, i) => {
            const door = plan !== null && plan.eind === "door" && i === n - 1 && c === "loopt";
            const symbool = c === "start" ? "▶" : c === "oplevering" ? "◆" : door ? "→" : "";
            return cel(
              symbool
                ? [alinea(t(symbool, { size: c === "oplevering" ? 18 : 15, color: teken, font: SYMBOOL, bold: true }), { na: 0, regel: 240, uitlijning: AlignmentType.CENTER })]
                : [],
              {
                breedte: wMaand,
                vlak: c !== "" ? balk : voorbij(i) ? "F6F8FB" : undefined,
                randen: {
                  top: lijn(),
                  bottom: lijn(),
                  right: lijn(),
                  left: lijn(grenzen.includes(i) ? K.inkt3 : K.lijn, grenzen.includes(i) ? 12 : 4),
                },
                marge: [30, 0, 30, 0],
                midden: true,
              }
            );
          }),
        ])
      );
    }
  }

  // legenda: de tekens, de status en de domeinkleuren, als in de app
  const klein = { size: G.fijn, color: K.inkt2 };
  const staal = (vlak: string) => t("     ", { size: G.fijn, vlak });
  const tussen = () => t("      ", klein);
  const sleutel: TextRun[] = [
    ...t("▶", { size: G.fijn, color: "475569", font: SYMBOOL }),
    ...t(" start", klein),
    ...tussen(),
    ...staal("94A3B8"),
    ...t(" loopt", klein),
    ...tussen(),
    ...t("◆", { size: G.fijn, color: "475569", font: SYMBOOL }),
    ...t(" oplevering", klein),
  ];
  if (vlag.niet) sleutel.push(...tussen(), ...staal("DDE3EA"), ...t(" niet gestart", klein));
  if (vlag.af) sleutel.push(...tussen(), ...staal("475569"), ...t(" afgerond", klein));
  if (vlag.vaag) sleutel.push(...tussen(), ...t("balk zonder ▶ of ◆: start of oplevering te bepalen", klein));
  if (vlag.door) sleutel.push(...tussen(), ...t("→ loopt door na " + maand(n - 1), klein));
  if (stand !== null) sleutel.push(...tussen(), ...staal(NU), ...t(" " + (stand.label || "standlijn"), klein));

  const sleutel2: TextRun[] = [
    ...t("Status  ", { size: G.label, bold: true, color: K.inkt3, allCaps: true, spatie: 10 }),
    ...statusRuns("+", G.fijn),
    ...spatie(G.fijn),
    ...statusRuns("+/-", G.fijn),
    ...spatie(G.fijn),
    ...statusRuns("-", G.fijn),
    ...spatie(G.fijn),
    ...statusRuns("", G.fijn),
    ...t(" geen", klein),
  ];
  const domeinSleutel = domeinenVan([...gebruikt]);
  if (domeinSleutel.length > 0) {
    sleutel2.push(...tussen(), ...t("Domein  ", { size: G.label, bold: true, color: K.inkt3, allCaps: true, spatie: 10 }));
    // volgorde van de app: cultuur, mens, data en systemen, processen
    for (const d of domeinenVan(["cultuur", "mens", "data", "processen"]).filter((x) => gebruikt.has(x.id))) {
      sleutel2.push(...staal(hex(d.kleur)), ...t(" " + d.label + "   ", klein));
    }
    if (alleVier) sleutel2.push(...staal(K.cito), ...t(" alle vier", klein));
  }

  const uit: Inhoud = [];
  if (heeft(b.titel)) uit.push(blokTitel(schoon(b.titel)));
  uit.push(tabel(kol, rijen));
  uit.push(alinea(sleutel, { voor: 110, na: 50 }), alinea(sleutel2, { na: heeft(b.legenda) ? 50 : 200 }));
  if (heeft(b.legenda)) uit.push(legenda(schoon(b.legenda)));
  return uit;
}

// ---------- voortgangsbord ----------

/** Regel in een lijst met onderdelen: naam, maand, status (alleen bij verstreken) en voortgang. */
function onderdeelRegel(o: Onderdeel, size: number, p: { metWerkstroom?: boolean; verstreken?: boolean; maand?: string; lijm?: boolean } = {}): Paragraph {
  const klein = size - 1;
  const naam = t(schoon(o.rij.activiteit) || "Onderdeel zonder naam", { size, bold: !!p.verstreken, color: p.verstreken ? K.rood : K.inkt });
  const rest: TextRun[] = [];
  const voeg = (runs: TextRun[]) => {
    if (runs.length === 0) return;
    if (rest.length > 0) rest.push(...t("  ·  ", { size: klein, color: K.inkt3 }));
    rest.push(...runs);
  };
  if (p.metWerkstroom && o.rij.groepNaam) voeg(t(schoon(o.rij.groepNaam), { size: klein, color: K.inkt2 }));
  const maand = p.maand ?? o.maand;
  if (maand) voeg(t(maand, { size: klein, bold: true, color: p.verstreken ? K.amber : K.inkt2 }));
  if (p.verstreken) voeg(statusRuns(o.rij.status, klein, false));
  voeg(voortgangRuns(o.rij.voortgang, klein));
  // de naam op de eerste regel, daaronder klein de werkstroom, de maand, de status en de voortgang
  const inhoud: ParagraphChild[] = rest.length > 0 ? [...naam, new TextRun({ break: 1, text: "", font: FONT, size: klein }), ...rest] : naam;
  return punt(inhoud, bol(p.verstreken ? K.rood : K.inkt3, size), { na: 55, inspring: 200, regel: 250, bijVolgende: p.lijm });
}

/** Kolom op het bord: een kopje en een korte lijst, of de tekst voor "leeg". */
function bordKolom(kop: string, kleur: string, regels: Paragraph[], leegTekst: string, size: number, o: { voor?: number; lijm?: boolean } = {}): Paragraph[] {
  return [
    alinea(t(kop, { size, bold: true, color: kleur }), { voor: o.voor ?? 0, na: 60, bijVolgende: o.lijm }),
    ...(regels.length > 0 ? regels : [leeg(leegTekst, size, { na: 0, bijVolgende: o.lijm })]),
  ];
}

function bordWerkstroom(w: Bord["werkstromen"][number], stand: GroepStand | null, kaart: Kaart | null, ctx: Ctx): Table {
  const B = ctx.breedte;
  const breed = B > 12000;
  const s = G.fijn;
  // "nog nodig" heeft de langste regels en krijgt daarom de helft van de breedte
  const wNodig = breed ? 7200 : Math.round(B * 0.46);
  const wLinks = Math.floor((B - wNodig) / 2);
  const kol = [wLinks, B - wNodig - wLinks, wNodig];

  const ds = stand?.domeinen ?? domeinenVan(kaart?.domeinen);
  const kleur = hex(kleurVan(ds));
  const naam = schoon(w.naam) || stand?.naam || schoon(kaart?.naam) || "Werkstroom zonder naam";
  const tel = stand?.telling ?? legeTelling();
  const schema = opSchema(tel);
  const pct = voortgangPct(tel);
  const lijst = stand?.onderdelen ?? [];
  const verstreken = lijst.filter((o) => o.verstreken);
  const komend = lijst.filter((o) => o.komend).sort((a, b) => (a.rij.opleverDatum?.getTime() ?? 0) - (b.rij.opleverDatum?.getTime() ?? 0));
  const afgerond = lijst.filter((o) => o.soort === "afgerond");
  const zonderDatum = lijst.filter((o) => o.rij.opleverDatum === null && o.soort !== "afgerond");
  const geleverd = (w.geleverd ?? []).map(schoon).filter(Boolean);

  // kop: naam, de telling en de voortgang
  const sub = stand
    ? `${tel.totaal} ${tel.totaal === 1 ? "onderdeel" : "onderdelen"}` + (tel.niet > 0 ? ` · ${tel.niet} niet gestart` : "") + (schema !== null ? ` · op schema ${procent(schema)}` : "")
    : "geen tijdlijngroep gekoppeld: voortgang te bepalen";
  const voortgang = pct === null ? "geen onderdelen in de tijdlijn" : `${tel.afgerond} van ${tel.totaal} afgerond, ${tel.loopt} loopt`;
  const kop = [
    alinea(
      [...t(naam, { size: 24, bold: true, color: K.cito }), tab(), ...t("Voortgang  ", { size: G.label, bold: true, color: K.inkt3, allCaps: true, spatie: 10 }), ...t(procent(pct), { size: 24, bold: true })],
      { na: 30, bijVolgende: true, tabRechts: B - 320 }
    ),
    alinea([...t(sub, { size: s, color: stand ? K.inkt2 : K.amber }), tab(), ...t(voortgang, { size: s, color: K.inkt2 })], { na: 0, bijVolgende: true, tabRechts: B - 320 }),
  ];

  // alle alinea's van de rij "bij volgende": zo blijft de rij bij de voet eronder
  const lijm = true;
  const nodig = (w.nodig ?? []).length === 0 ? [] : nodigLijst(w.nodig ?? [], s, lijm);
  const kolMarge: [number, number, number, number] = [90, 130, 90, 130];

  // Eén rij met drie vakken, zoals het raster van de app: links verstreken met afgerond
  // eronder, in het midden wat eraan komt met zonder opleverdatum eronder, rechts nog nodig
  // over de volle hoogte. De kop blijft bij de rij; een werkstroom breekt niet over twee pagina's.
  const rijen: TableRow[] = [
    rij([
      cel(kop, {
        breedte: B,
        span: 3,
        vlak: meng(kleur, 0.06),
        randen: { top: lijn(), bottom: lijn(), right: lijn(), left: lijn(kleur, 36) },
        marge: [110, 160, 100, 160],
      }),
    ]),
    rij(
      [
        cel(
          [
            ...bordKolom("Verstreken en nog niet afgerond", K.amber, verstreken.map((o) => onderdeelRegel(o, s, { verstreken: true, lijm })), stand ? "geen" : "te bepalen", s, { lijm }),
            ...bordKolom("Afgerond", K.groen, afgerond.map((o) => onderdeelRegel(o, s, { lijm })), stand ? "nog niets afgerond" : "te bepalen", s, { voor: 200, lijm }),
          ],
          { breedte: kol[0], marge: kolMarge }
        ),
        cel(
          [
            ...bordKolom(`Komt eraan, komende ${HORIZON_DAGEN} dagen`, K.inkt, komend.map((o) => onderdeelRegel(o, s, { lijm })), stand ? "geen oplevering gepland" : "te bepalen", s, { lijm }),
            ...bordKolom(
              "Zonder opleverdatum",
              K.inkt2,
              zonderDatum.map((o) => onderdeelRegel(o, s, { maand: o.rij.startIndex !== null ? "start " + o.start : "geen start", lijm })),
              stand ? "alle onderdelen hebben een oplevering" : "te bepalen",
              s,
              { voor: 200, lijm }
            ),
          ],
          { breedte: kol[1], marge: kolMarge }
        ),
        cel(bordKolom("Nog nodig", K.inkt, nodig, "niets open", s, { lijm }), { breedte: kol[2], marge: kolMarge, vlak: K.vlak }),
      ]
    ),
  ];

  // voet: documenten en status, en wat 3sides als geleverd meldt
  const kops = koppelingRuns(kaart?.koppelingen ?? [], s);
  const voet: Paragraph[] = [
    alinea([...t("Documenten en status   ", { size: s, bold: true }), ...(kops ?? t("nog geen documenten gekoppeld", { size: s, italics: true, color: K.inkt3 }))], {
      na: geleverd.length > 0 ? 50 : 0,
      regel: 252,
    }),
  ];
  if (geleverd.length > 0) {
    voet.push(alinea([...t("Geleverd volgens 3sides   ", { size: s, bold: true }), ...t(geleverd.join("  ·  "), { size: s, color: K.inkt2 })], { na: 0, regel: 252 }));
  }
  rijen.push(rij([cel(voet, { breedte: B, span: 3, marge: [90, 160, 90, 160] })]));

  return tabel(kol, rijen);
}

function voortgangsbordBlok(b: Bord, ctx: Ctx): Inhoud {
  const B = ctx.breedte;
  const tl = ctx.tijdlijn;
  const s = G.fijn;
  const { groepen, onderdelen } = berekenStand(tl, ctx.vandaag);
  const werkstromen = b.werkstromen ?? [];
  const programmabreed = b.programmabreed ?? [];

  // Programmabreed: alle onderdelen uit de tijdlijn, ook van groepen die niet op het bord staan.
  const totaal = legeTelling();
  for (const o of onderdelen) telOp(totaal, o);
  const verstrekenAlle = onderdelen.filter((o) => o.verstreken);
  const dag = dag00(ctx.vandaag);
  const eerstvolgende = onderdelen
    .filter((o) => o.rij.opleverDatum !== null && o.soort !== "afgerond" && o.rij.opleverDatum >= dag)
    .sort((a, c) => (a.rij.opleverDatum?.getTime() ?? 0) - (c.rij.opleverDatum?.getTime() ?? 0))
    .slice(0, 5);
  const opAnker = new Map(groepen.filter((g) => g.anker).map((g) => [g.anker, g]));
  const kaartOpId = new Map(ctx.kaarten.map((k) => [schoon(k.id), k]));

  const uit: Inhoud = [];
  const datum = ctx.vandaag.toLocaleDateString("nl-NL", { weekday: "long", day: "numeric", month: "long", year: "numeric" });
  uit.push(alinea(t(schoon(b.titel) || "Voortgangsbord", { size: G.h2, bold: true, color: K.cito }), { voor: 200, na: 40, bijVolgende: true }));
  uit.push(
    alinea(
      [
        ...t("Stand van ", { size: G.tabel, color: K.inkt2 }),
        ...t(datum, { size: G.tabel, bold: true }),
        ...t(` (${ddmmjjjj(ctx.vandaag)}) · berekend uit de tijdlijn in dit document`, { size: G.tabel, color: K.inkt2 }),
      ],
      { na: 140, bijVolgende: true }
    )
  );
  if (!tl) {
    uit.push(
      kader(
        [alinea(t("Geen tijdlijn in dit document: de voortgang, wat verstreken is en wat eraan komt zijn te bepalen zodra de tijdlijn erin staat.", { size: G.tabel, color: "78350F" }), { na: 0 })],
        B,
        "let-op"
      ),
      wit()
    );
  }

  // tellers
  const tellers: { n: number; naam: string; kleur: string; vlak?: string; rand?: string }[] = [
    { n: totaal.totaal, naam: "onderdelen in de tijdlijn", kleur: K.inkt },
    { n: totaal.afgerond, naam: "afgerond", kleur: K.groen },
    { n: totaal.verstreken, naam: "verstreken, niet afgerond", kleur: totaal.verstreken > 0 ? K.amber : K.inkt, vlak: totaal.verstreken > 0 ? "FFFBEB" : undefined, rand: totaal.verstreken > 0 ? "FCD34D" : undefined },
    { n: totaal.komend, naam: `opleveringen komende ${HORIZON_DAGEN} dagen`, kleur: K.cito },
    { n: totaal.zonderDatum, naam: "zonder opleverdatum", kleur: totaal.zonderDatum > 0 ? K.inkt2 : K.inkt },
  ];
  const wTeller = verdeel(B, tellers.map(() => 1));
  uit.push(
    tabel(wTeller, [
      rij(
        tellers.map((x, i) => {
          const rand = lijn(x.rand ?? K.rand);
          return cel(
            [
              alinea(t(String(x.n), { size: 40, bold: true, color: x.kleur }), { na: 0, regel: 240 }),
              alinea(t(x.naam, { size: G.label, bold: true, color: x.vlak ? "92400E" : K.inkt2, allCaps: true, spatie: 8 }), { na: 0 }),
            ],
            { breedte: wTeller[i], vlak: x.vlak, randen: { top: rand, bottom: rand, left: rand, right: rand }, marge: [110, 140, 110, 160] }
          );
        })
      ),
    ]),
    wit(220)
  );

  // per werkstroom
  if (werkstromen.length === 0) uit.push(leeg("Nog geen werkstromen op het bord.", G.tabel, { na: 160 }));
  for (const w of werkstromen) {
    const anker = schoon(w.anker);
    uit.push(bordWerkstroom(w, (anker && opAnker.get(anker)) || null, (anker && kaartOpId.get(anker)) || null, ctx), wit(220));
  }

  // onderaan: programmabreed nodig, eerstvolgende opleveringen, alles wat verstreken is
  const wPaneel = verdeel(B, [1, 1, 1]);
  const paneelKop = (titel: string, sub: string, aantal: number, kleur: string): Paragraph[] => [
    alinea([...t(titel, { size: G.h3, bold: true, color: kleur }), ...t("   "), ...vakje(String(aantal), kleur === K.amber ? "FFF7ED" : "EEF3F9", kleur, G.tabel)], { na: 40, bijVolgende: true }),
    alinea(t(sub, { size: s, color: K.inkt2 }), { na: 100, regel: 252, bijVolgende: true }),
  ];
  const openProgrammabreed = programmabreed.filter((x) => !x.klaar).length;
  // alle alinea's van de panelen "bij volgende": de rij blijft bij de uitleg eronder
  const nodigBreed = programmabreed.length === 0 ? [] : nodigLijst(programmabreed, s, true);
  const paneelMarge: [number, number, number, number] = [130, 160, 130, 160];
  uit.push(
    tabel(wPaneel, [
      rij(
        [
          cel(
            [
              ...paneelKop("Nog nodig voor het hele programma", "Wat we programmabreed van 3sides vragen.", openProgrammabreed, K.cito),
              ...(nodigBreed.length > 0 ? nodigBreed : [leeg("niets open", s, { na: 0, bijVolgende: true })]),
            ],
            { breedte: wPaneel[0], marge: paneelMarge }
          ),
          cel(
            [
              ...paneelKop("Eerstvolgende opleveringen", "Alle werkstromen, vanaf vandaag, uit de tijdlijn.", eerstvolgende.length, K.cito),
              ...(eerstvolgende.length > 0 ? eerstvolgende.map((o) => onderdeelRegel(o, s, { metWerkstroom: true, lijm: true })) : [leeg(tl ? "geen opleveringen gepland" : "te bepalen", s, { na: 0, bijVolgende: true })]),
            ],
            { breedte: wPaneel[1], marge: paneelMarge }
          ),
          cel(
            [
              ...paneelKop("Verstreken en nog niet afgerond", "Alle werkstromen: de opleverdatum is voorbij, het onderdeel staat niet op Afgerond.", verstrekenAlle.length, K.amber),
              ...(verstrekenAlle.length > 0 ? verstrekenAlle.map((o) => onderdeelRegel(o, s, { metWerkstroom: true, verstreken: true, lijm: true })) : [leeg(tl ? "geen" : "te bepalen", s, { na: 0, bijVolgende: true })]),
            ],
            { breedte: wPaneel[2], marge: paneelMarge }
          ),
        ]
      ),
    ])
  );

  // hoe het bord rekent (de vaste uitleg van de app, zonder de zin over de bediening)
  uit.push(
    legenda(
      "Zo rekent het bord: de cijfers per werkstroom komen uit de tijdlijn en gaan uit van vandaag. Voortgang is het aantal afgeronde onderdelen van het totaal; " +
        "wat loopt, telt nog niet mee. Op schema zijn de opleveringen waarvan de datum nog niet voorbij is. Verstreken: de opleverdatum is voorbij en het onderdeel " +
        `staat niet op Afgerond. Komt eraan: oplevering binnen ${HORIZON_DAGEN} dagen. Zonder opleverdatum: er staat geen oplevering in de tijdlijn; die onderdelen ` +
        "tellen mee in het totaal, maar niet bij verstreken of komt eraan.",
      heeft(b.legenda)
    )
  );
  if (heeft(b.legenda)) uit.push(legenda(schoon(b.legenda)));
  return uit;
}

// ---------- evaluatie ----------
// Per kader één tabel, in de opbouw van het evaluatiebord (EvaluatieBlok.tsx): de kop met
// nummer, vraag en het eerste beeld; daaronder het eerste beeld voluit en wie aan zet is, de
// feiten met hun bron, "Wie is aan zet" in twee zijden (Cito, dan 3sides) en de vraag voor
// het gesprek. Alleen intern: ons oordeel met de notitie en de onderbouwing (met "Wat we
// toetsen" erboven), iets kleiner gezet.

type Kader = BlokVan<"evaluatie">["kaders"][number];

/** Kleuren van het eerste beeld (.ev-beeld-* en de strook links van het kader in de app). */
const BEELD: Record<BeeldSoort, { vlak: string; tekst: string; rand: string; balk: string }> = {
  ja: { vlak: "ECFDF5", tekst: "047857", rand: "A7F3D0", balk: "059669" },
  deels: { vlak: "EFF6FF", tekst: "1D4ED8", rand: "BFDBFE", balk: "2563EB" },
  needeels: { vlak: "FFFBEB", tekst: "92400E", rand: "FCD34D", balk: "D97706" },
  nee: { vlak: "FEF3F2", tekst: "B42318", rand: "FECDCA", balk: "B42318" },
  grijs: { vlak: "F1F5F9", tekst: "4A5565", rand: "CBD5E1", balk: "94A3B8" },
};

/** De rolverdeling boven de kaders: Cito en 3sides, elk met de rol uit het blok. */
function rolverdeling(rolCito: string, rol3sides: string, B: number): Table {
  const wLabel = 1700;
  const wCito = Math.floor((B - wLabel) / 2);
  const kol = [wLabel, wCito, B - wLabel - wCito];
  const rand = lijn(K.rand);
  const marge: [number, number, number, number] = [100, 150, 100, 150];
  return tabel(kol, [
    rij([
      cel([alinea(t("Rolverdeling", { size: G.label, bold: true, color: K.inkt2, allCaps: true, spatie: 12 }), { na: 0 })], {
        breedte: kol[0],
        vlak: K.vlak,
        randen: { top: rand, bottom: rand, left: rand, right: rand },
        marge,
        midden: true,
      }),
      cel([alinea([...t("Cito", { size: G.body, bold: true, color: K.wit }), ...(rolCito ? t("   " + rolCito, { size: G.tabel, color: "DBE7F5" }) : [])], { na: 0 })], {
        breedte: kol[1],
        vlak: K.cito,
        randen: { top: lijn(K.cito), bottom: lijn(K.cito), left: lijn(K.cito), right: lijn(K.cito) },
        marge,
        midden: true,
      }),
      cel([alinea([...t("3sides", { size: G.body, bold: true }), ...(rol3sides ? t("   " + rol3sides, { size: G.tabel, color: K.inkt2 }) : [])], { na: 0 })], {
        breedte: kol[2],
        vlak: "F1F5F9",
        randen: { top: rand, bottom: rand, left: rand, right: rand },
        marge,
        midden: true,
      }),
    ]),
  ]);
}

function evaluatieKader(k: Kader, nr: number, b: BlokVan<"evaluatie">, ctx: Ctx): Table {
  const B = ctx.breedte;
  const intern = ctx.versie === "intern";
  // raster: nummer | label | … | … | chip; de helft van de breedte valt na kolom 3
  const wNr = 640;
  const wLabel = 1500;
  const wChip = 2250;
  const half = Math.floor(B / 2);
  const kol = [wNr, wLabel, half - wNr - wLabel, B - half - wChip, wChip];
  const marge: [number, number, number, number] = [110, 170, 110, 190];

  const { kop: chipTekst, zin } = splitsBeeld(schoon(k.beeld));
  const kleur = BEELD[chipTekst ? beeldSoort(chipTekst) : "grijs"];
  // de strook links volgt het eerste beeld, zoals in de app
  const strook = lijn(kleur.balk, 30);
  const buiten = lijn(K.rand);
  const titel = schoon(k.titel).replace(/^\d+\s*·\s*/, "");
  const rijen: TableRow[] = [];
  const heel = (inhoud: Paragraph[], o: { vlak?: string; breekbaar?: boolean } = {}) =>
    rij([cel(inhoud, { breedte: B, span: 5, vlak: o.vlak, randen: { top: lijn(), bottom: lijn(), left: strook, right: buiten }, marge })], { breekbaar: o.breekbaar });

  // kop: nummer, de vraag en het eerste beeld als gekleurd vak; herhaalt op een volgende pagina
  const boven = lijn(K.cito, 12);
  rijen.push(
    rij(
      [
        cel([alinea(t(String(nr), { size: 30, bold: true, color: K.wit }), { na: 0, uitlijning: AlignmentType.CENTER, bijVolgende: true })], {
          breedte: wNr,
          vlak: K.cito,
          randen: { top: boven, bottom: lijn(K.cito), left: lijn(K.cito, 30), right: lijn(K.cito) },
          midden: true,
        }),
        cel(
          [
            alinea(t(titel || "Kader zonder titel", { size: 25, bold: true, color: K.cito }), { na: heeft(k.ondertitel) ? 30 : 0, regel: 264, bijVolgende: true }),
            ...(heeft(k.ondertitel) ? [alinea(t(schoon(k.ondertitel), { size: G.tabel, color: K.inkt2 }), { na: 0, bijVolgende: true })] : []),
          ],
          {
            breedte: chipTekst ? B - wNr - wChip : B - wNr,
            span: chipTekst ? 3 : 4,
            vlak: K.vlakBlauw,
            randen: { top: boven, bottom: lijn(K.rand), left: lijn(K.rand), right: chipTekst ? lijn(K.rand) : buiten },
            marge: [120, 150, 120, 150],
            midden: true,
          }
        ),
        ...(chipTekst
          ? [
              cel([alinea(t(chipTekst, { size: G.body, bold: true, color: kleur.tekst }), { na: 0, regel: 252, uitlijning: AlignmentType.CENTER, bijVolgende: true })], {
                breedte: wChip,
                vlak: kleur.vlak,
                randen: { top: boven, bottom: lijn(kleur.rand), left: lijn(kleur.rand), right: lijn(kleur.rand) },
                midden: true,
              }),
            ]
          : []),
      ],
      { kop: true }
    )
  );

  // het eerste beeld voluit, met rechts wie aan zet is (de kop van het kader in de app)
  const actieBij = schoon(k.actieBij);
  // "bij volgende" op elke alinea van deze rij: zo begint een kader nooit met alleen de kop
  // onderaan een pagina, maar altijd met het eerste beeld en de feiten erbij
  const lijm = { bijVolgende: true };
  const beeldCel = zin ? [label("Eerste beeld · voorstel", kleur.tekst, lijm), alinea(t(zin, { size: G.body }), { na: 0, ...lijm })] : null;
  const aanZetCel = actieBij ? [label("Aan zet", K.inkt2, lijm), alinea(t(actieBij, { size: G.body, bold: true }), { na: 0, ...lijm })] : null;
  if (beeldCel && aanZetCel) {
    rijen.push(
      rij([
        cel(beeldCel, { breedte: B - wChip, span: 4, vlak: meng(kleur.vlak, 0.6), randen: { top: lijn(), bottom: lijn(), left: strook, right: lijn() }, marge }),
        cel(aanZetCel, { breedte: wChip, randen: { top: lijn(), bottom: lijn(), left: lijn(), right: buiten }, marge: [110, 120, 110, 150] }),
      ])
    );
  } else if (beeldCel) {
    rijen.push(heel(beeldCel, { vlak: meng(kleur.vlak, 0.6) }));
  } else if (aanZetCel) {
    rijen.push(heel(aanZetCel));
  }

  // de feiten, genummerd, met de bron op een eigen, rustiger regel
  const punten = (k.punten ?? []).map(schoon).filter(Boolean);
  if (punten.length > 0) {
    rijen.push(
      heel(
        [
          label("Feiten"),
          ...punten.map((p, i) => {
            const { kern, bron } = splitsBron(p);
            return punt(
              [...t(kern, { size: G.body }), ...(bron ? [new TextRun({ break: 1, text: bron, font: FONT, size: G.fijn, color: K.inkt2 })] : [])],
              t(String(i + 1), { size: G.body, bold: true, color: K.cito }),
              { na: i === punten.length - 1 ? 0 : 90, inspring: 330 }
            );
          }),
        ],
        { breekbaar: punten.join("").length > 1400 }
      )
    );
  }

  // wie is aan zet: Cito (heeft de lead) en 3sides (voert uit), met de rol uit het blok
  const zetCito = schoon(k.aanZetCito);
  const zet3 = schoon(k.aanZet3sides);
  if (zetCito || zet3) {
    const rolCito = schoon(b.rolCito);
    const rol3 = schoon(b.rol3sides);
    const wR = B - half;
    rijen.push(
      rij([
        cel([label("Wie is aan zet", K.inkt2, { na: 0, bijVolgende: true })], {
          breedte: B,
          span: 5,
          randen: { top: lijn(), bottom: GEEN, left: strook, right: buiten },
          marge: [110, 170, 50, 190],
        }),
      ])
    );
    const zijdeKop = (naam: string, rol: string, donker: boolean) =>
      alinea([...t(naam, { size: G.body, bold: true, color: donker ? K.wit : K.inkt }), ...(rol ? t("   " + rol, { size: G.tabel, color: donker ? "DBE7F5" : K.inkt2 }) : [])], {
        na: 0,
        bijVolgende: true,
      });
    const zijdeTekst = (tekst: string) => (tekst ? alinea(t(tekst, { size: G.body }), { na: 0 }) : leeg("Geen actie genoemd.", G.body, { na: 0 }));
    rijen.push(
      rij([
        cel([zijdeKop("Cito", rolCito, true)], {
          breedte: half,
          span: 3,
          vlak: K.cito,
          randen: { top: lijn(K.cito), bottom: lijn(K.cito), left: strook, right: lijn(K.cito) },
          marge: [80, 150, 80, 190],
        }),
        cel([zijdeKop("3sides", rol3, false)], {
          breedte: wR,
          span: 2,
          vlak: "F1F5F9",
          randen: { top: lijn(K.rand), bottom: lijn(K.rand), left: lijn(K.rand), right: buiten },
          marge: [80, 150, 80, 150],
        }),
      ]),
      rij([
        cel([zijdeTekst(zetCito)], { breedte: half, span: 3, randen: { top: lijn(), bottom: lijn(), left: strook, right: lijn(K.rand) }, marge }),
        cel([zijdeTekst(zet3)], { breedte: wR, span: 2, randen: { top: lijn(), bottom: lijn(), left: lijn(K.rand), right: buiten }, marge: [110, 170, 110, 150] }),
      ])
    );
  }

  // de vraag voor het gesprek
  if (heeft(k.vraag3sides)) {
    rijen.push(heel([label("Vraag voor het gesprek", K.cito), alinea(t(schoon(k.vraag3sides), { size: G.body, bold: true, color: K.cito }), { na: 0 })], { vlak: K.vlakBlauw }));
  }

  // alleen intern: ons oordeel met de notitie, en de onderbouwing
  if (intern) {
    const o = oordeelNaam(schoon(k.oordeel));
    rijen.push(
      heel(
        [
          alinea(
            [
              ...t("Ons oordeel (intern)     ", { size: G.label, bold: true, color: K.cito, allCaps: true, spatie: 12 }),
              ...(o.ingevuld ? chip(o.naam, o.soort, G.body) : t(o.naam, { size: G.body, italics: true, color: K.inkt3 })),
            ],
            { na: heeft(k.notitie) ? 70 : 0 }
          ),
          ...(heeft(k.notitie) ? [alinea(t(schoon(k.notitie), { size: G.body }), { na: 0 })] : []),
        ],
        { vlak: K.vlak }
      )
    );

    const secties = (k.secties ?? []).filter((x) => heeft(x.label) || heeft(x.tekst));
    const onderbouwing: { kopje: string; alineas: Alinea[] }[] = [
      ...(heeft(k.vraag) ? [{ kopje: "Wat we toetsen", alineas: [{ chip: "", label: "", tekst: schoon(k.vraag) }] }] : []),
      ...secties.map((x) => ({ kopje: schoon(x.label), alineas: alineas(schoon(x.tekst)) })),
    ];
    if (onderbouwing.length > 0) {
      rijen.push(
        rij([
          cel([alinea(t("Onderbouwing (intern)", { size: G.label, bold: true, color: K.inkt2, allCaps: true, spatie: 12 }), { na: 0, bijVolgende: true })], {
            breedte: B,
            span: 5,
            randen: { top: lijn(K.rand), bottom: lijn(), left: strook, right: buiten },
            marge: [100, 170, 80, 190],
          }),
        ])
      );
      const wL = wNr + wLabel;
      for (const x of onderbouwing) {
        const lengte = x.alineas.reduce((a, y) => a + y.tekst.length, 0);
        const tekst = x.alineas.map((a, i) => {
          const runs: TextRun[] = [];
          if (a.chip) {
            const c = BEELD[beeldSoort(a.chip)];
            runs.push(...vakje(a.chip, c.vlak, c.tekst, G.fijn), ...spatie(G.fijn));
          }
          if (a.label) runs.push(...t(a.label + " ", { size: G.fijn, bold: true }));
          runs.push(...t(a.tekst, { size: G.fijn }));
          return alinea(runs, { na: i === x.alineas.length - 1 ? 0 : 70, regel: 258 });
        });
        rijen.push(
          rij(
            [
              cel([alinea(t(x.kopje, { size: G.label, bold: true, color: K.inkt2, allCaps: true, spatie: 8 }), { na: 0, voor: 20, regel: 250 })], {
                breedte: wL,
                span: 2,
                vlak: K.vlak,
                randen: { top: lijn(), bottom: lijn(), left: strook, right: lijn() },
                marge: [90, 100, 90, 190],
              }),
              cel(tekst.length > 0 ? tekst : [alinea(t("—", { size: G.fijn, color: K.inkt3 }), { na: 0 })], {
                breedte: B - wL,
                span: 3,
                randen: { top: lijn(), bottom: lijn(), left: lijn(), right: buiten },
                marge: [90, 150, 90, 130],
              }),
            ],
            // lange onderbouwing mag over de paginarand lopen; korte blijft bij elkaar
            { breekbaar: lengte > 700 }
          )
        );
      }
    }
  }

  // onderrand van het kader: de laatste rij sluit af met de buitenrand
  return tabel(kol, rijen);
}

function evaluatieBlok(b: BlokVan<"evaluatie">, ctx: Ctx): Inhoud {
  const kaders = b.kaders ?? [];
  const uit: Inhoud = [];
  if (heeft(b.titel)) uit.push(blokTitel(schoon(b.titel)));
  if (heeft(b.intro)) uit.push(tekstAlinea(schoon(b.intro), {}, { na: 160 }));
  if (heeft(b.rolCito) || heeft(b.rol3sides)) uit.push(rolverdeling(schoon(b.rolCito), schoon(b.rol3sides), ctx.breedte), wit(260));
  kaders.forEach((k, i) => uit.push(evaluatieKader(k, i + 1, b, ctx), wit(240)));
  if (heeft(b.legenda)) uit.push(legenda(schoon(b.legenda)));
  return uit;
}

// ---------- alle blokken ----------

/** Eén blok in Word. Een onbekend of niet-ondersteund bloktype geeft niets, met een melding in de console. */
export function blokInhoud(b: DocBlok, ctx: Ctx): Inhoud {
  switch (b?.type) {
    case "tekst":
      return tekstBlok(b);
    case "callout":
      return calloutBlok(b, ctx);
    case "lijst":
      return lijstBlok(b);
    case "tabel":
      return tabelBlok(b, ctx);
    case "kaarten":
      return kaartenBlok(b, ctx);
    case "werkstromen":
      return werkstromenBlok(b, ctx);
    case "tijdlijn":
      return tijdlijnBlok(b, ctx);
    case "voortgangsbord":
      return voortgangsbordBlok(b, ctx);
    case "evaluatie":
      return evaluatieBlok(b, ctx);
    default:
      console.warn("[evaluatie-word] bloktype niet in de Word-export, overgeslagen:", (b as { type?: unknown } | null)?.type);
      return [];
  }
}

/** Past dit blok alleen goed op een liggende pagina? (tijdlijn, voortgangsbord, tabel met veel kolommen) */
export function wilLiggend(b: DocBlok): boolean {
  return b?.type === "tijdlijn" || b?.type === "voortgangsbord" || (b?.type === "tabel" && (b.kolommen ?? []).length >= 6);
}
