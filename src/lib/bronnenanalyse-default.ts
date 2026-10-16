// Stap 12 — Bronnenanalyse: seed (register + analyses) en de merge met de sessie.
//
// CONTRACT voor wie dit bestand vult (ook de bulk-agents van spoor B):
//
// Bron (één ingang in het register)
// - id: stabiele slug, nooit tonen. Kleine letters, koppeltekens, zonder datum- of
//   versienummer tenzij nodig om uniek te zijn. Een oudere versie krijgt `-v<n>` en
//   `versieVan` = id van de nieuwste versie (de UI toont dan de titel daarvan).
// - titel: leesbare naam; bestandsnaam: originele bestandsnaam; type: bestandssoort;
//   datum: ISO-datum of leeg; herkomst: waar de bron vandaan komt; url: externe vindplaats
//   (Miro-bord, bucket); sessieDocumentId: koppeling naar een document uit stap 11.
// - bewerkt: true zodra iemand de bron of de analyse handmatig aanpast; de seed overschrijft
//   die dan nooit meer. verwijderd: tombstone; de seed brengt een verwijderde bron niet terug.
//
// BronAnalyse
// - samenvatting: max 600 tekens, in gewoon Nederlands.
// - status: bruikbaar = actueel en direct inzetbaar voor een werkstroom;
//   deels_bruikbaar = bruikbaar met aanvulling of deels actueel;
//   verouderd = vervangen door een nieuwere versie of door een besluit;
//   niet_geanalyseerd = nog niet gelezen (ook audio/video en Miro zolang niet doorgenomen).
// - dekking per werkstroom (werkstroom-id uit het organigram): wat de bron levert (dekt),
//   een LETTERLIJK citaat uit de bron (max 300 tekens) ALTIJD met vindplaats ("p. 4",
//   "[Dia 3]", "[Tabblad: Kosten]"), de geraakte domeinen en max 3 openPunten.
// - punten: bijdrage aan de vier punten (GEEL_PUNTEN): watErAlIs, citaat + vindplaats en
//   max 3 actiesNogTeDoen.
// - door: "seed" voor bulk-uitkomsten, "claude" voor analyses in de app, "handmatig" na bewerken.
//
// NogNodigItem: wat nog ontbreekt; tekst die niet in een bron staat is letterlijk "te bepalen";
//   `bron` (herkomst van het item) is verplicht.
// WerkstroomOordeel en KanNuInGang zijn VOORSTELLEN; het besluit ligt bij Pim/stuurgroep.
//
// Regels (din-model-toets en CLAUDE.md):
// - Wat niet in een bron staat: letterlijk "te bepalen", nooit zelf invullen.
// - Toets op vermogensdeel + domein, nooit op baat (de baat is de controle via de keten).
// - De drie funnel-/klantreisindelingen en STDC nooit samenvoegen.
// - Zes bouwstenen en het 90-dagenplan zijn extern materiaal onder de DIN-niveaus, geen
//   eigen niveau.
// - Bij ELKE wijziging van de seed BRONNENANALYSE_SEED_VERSIE ophogen.

import type { BronnenAnalyse, Bron, GeelPunt, BronStatus, BronHerkomst, BronType, AnalyseDoor } from "@/lib/schemas";
import { kloon } from "@/lib/organigram-default";

export const BRONNENANALYSE_SEED_VERSIE = 1;

export const TE_BEPALEN = "te bepalen";
export const VOORSTEL_LABEL = "Voorstel";

export interface GeelPuntInfo {
  id: GeelPunt;
  nummer: number;
  titel: string;
  omschrijving: string;
  noot?: string;
}

/** De vier punten uit de opmerking van Sanne (12-10). */
export const GEEL_PUNTEN: readonly GeelPuntInfo[] = [
  {
    id: "nulmeting_systemen",
    nummer: 1,
    titel: "Nulmeting huidige situatie",
    omschrijving: "Welke systemen bevatten klantdata, wie gebruikt wat, en waar is het dubbel of tegenstrijdig.",
    noot: "Hoort bij de werkstroom Datavoorziening, niet bij de 0-meting.",
  },
  {
    id: "klantcontactmomenten",
    nummer: 2,
    titel: "Klantcontactmomenten en klantgroepen per sector",
    omschrijving: "Welke klantcontactmomenten en klantgroepen er per sector zijn.",
  },
  {
    id: "gesprekken",
    nummer: 3,
    titel: "Gesprekken met medewerkers én klanten",
    omschrijving: "Gesprekken met medewerkers én klanten als eerste outside-in oefening.",
  },
  {
    id: "funnelmodel",
    nummer: 4,
    titel: "Eén funnelmodel vaststellen",
    omschrijving: "Eén funnelmodel vaststellen: definities, criteria, eigenaarschap en KPI's per fase.",
  },
];

export const GEEL_PUNTEN_BRON =
  "Opmerking Sanne (12-10) in 'Cito BV – Integraal klantbeeld en outside-in werken eerste stappen'";

export const BRON_STATUS_LABELS: Record<BronStatus, string> = {
  bruikbaar: "Bruikbaar",
  deels_bruikbaar: "Deels bruikbaar",
  verouderd: "Verouderd",
  niet_geanalyseerd: "Niet geanalyseerd",
};

export const OORDEEL_LABELS: Record<"startklaar" | "deels_startklaar" | "wacht_op", string> = {
  startklaar: "Startklaar",
  deels_startklaar: "Deels startklaar",
  wacht_op: "Wacht op …",
};

export const HERKOMST_LABELS: Record<BronHerkomst, string> = {
  downloads: "Downloads",
  desktop: "Bureaublad",
  project: "Projectmap",
  miro: "Miro",
  mail: "Mail",
  microspace: "Microspace",
  platform: "Platform (3sides-documenten)",
  upload: "Geüpload in stap 12",
  anders: "Anders",
};

export const BRON_TYPE_LABELS: Record<BronType, string> = {
  pdf: "PDF",
  docx: "Word",
  doc: "Word (oud)",
  xlsx: "Excel",
  pptx: "PowerPoint",
  txt: "Tekst",
  md: "Markdown",
  eml: "Mail",
  msg: "Mail (Outlook)",
  html: "Webpagina",
  miro: "Miro-bord",
  audio_video: "Audio/video",
  anders: "Anders",
};

export const NOG_NODIG_STATUS_LABELS: Record<"open" | "belegd" | "afgerond", string> = {
  open: "Open",
  belegd: "Belegd",
  afgerond: "Afgerond",
};

export const KAN_NU_STATUS_LABELS: Record<"voorstel" | "overgenomen" | "gestart" | "afgerond", string> = {
  voorstel: "Voorstel",
  overgenomen: "Overgenomen",
  gestart: "Gestart",
  afgerond: "Afgerond",
};

export const DOOR_LABELS: Record<AnalyseDoor, string> = {
  claude: "Geanalyseerd door Claude",
  seed: "Seed-analyse (bulk)",
  handmatig: "Handmatig bewerkt",
};

/** Stand van het register van de 3sides-documenten (bucket 3sides-documenten). */
const REGISTER_DATUM = "2026-09-29";

function platformBron(id: string, titel: string, bestandsnaam: string, type: BronType): Bron {
  return { id, titel, bestandsnaam, type, datum: REGISTER_DATUM, herkomst: "platform", bewerkt: false, verwijderd: false };
}

function miroBron(nr: number, url: string): Bron {
  return {
    id: `miro-klantreis-${nr}`,
    titel: `Miro-bord klantreizen ${nr}`,
    bestandsnaam: "",
    type: "miro",
    datum: "",
    herkomst: "miro",
    url,
    bewerkt: false,
    verwijderd: false,
  };
}

export const DEFAULT_BRONNEN_ANALYSE: BronnenAnalyse = {
  bronnen: [
    // De 11 documenten van 3sides (zelfde ids als BRON_DOCUMENTEN in bron-context.tsx)
    platformBron("plan-van-aanpak", "Plan van aanpak", "Cito_-_Plan_van_Aanpak.pdf", "pdf"),
    platformBron("meetinstrument", "0-meting meetinstrument", "0-meting_meetinstrument_-_WiP.pdf", "pdf"),
    platformBron("adoptieframework", "Adoptieframework", "Cito_DIN_Adoptie_Framework_-_WiP.pdf", "pdf"),
    platformBron("bv-dag", "BV-dag", "BV-dag-229-final.pdf", "pdf"),
    platformBron("blueprint", "Blueprint klantreis", "Blueprint_Klantreis_-_Draft.xlsx", "xlsx"),
    platformBron("tijdlijn", "Project tijdlijn", "Cito_-_Project_tijdlijn_-_Klant_in_zicht.xlsx", "xlsx"),
    platformBron("datapunten", "Data punten ter input KPI", "Data_punten_ter_input_KPI.xlsx", "xlsx"),
    platformBron("data-tech", "Cito Data & Tech", "Cito_Data_&_Tech.pdf", "pdf"),
    platformBron(
      "praatplaat-funnel",
      "Praatplaat marketing & sales funnel",
      "Praatplaat_Marketing__Sales_funnel.pdf",
      "pdf",
    ),
    platformBron(
      "praatplaat-proces",
      "Praatplaat marketing & sales proces",
      "Praatplaat_Marketing__Sales_proces.pdf",
      "pdf",
    ),
    platformBron("evaluatie-kib", "Evaluatie van Klant in Beeld", "Evaluatie_Klant_in_Beeld.xlsx", "xlsx"),
    // De drie Miro-borden met klantreizen
    miroBron(1, "https://miro.com/app/board/uXjVJiIy0ak=/"),
    miroBron(2, "https://miro.com/app/board/uXjVJdneZog=/"),
    miroBron(3, "https://miro.com/app/board/uXjVIqJEGks=/"),
  ],
  nogNodig: [],
  werkstroomOordelen: [],
  kanNuInGang: [],
  werkstroomConclusies: {},
  puntConclusies: {},
  antwoordDoel: "",
  doeltoets: "",
  opmerkingen: [],
  seedVersie: BRONNENANALYSE_SEED_VERSIE,
};

/** kloon die undefined doorlaat (JSON.parse(undefined) zou gooien). */
function kloonOpt<T>(x: T | undefined): T | undefined {
  return x === undefined ? undefined : kloon(x);
}

/** Vult ontbrekende defaults van een bron aan (oudere sessies). */
function vulBron(b: Bron): Bron {
  return {
    ...b,
    bestandsnaam: b.bestandsnaam ?? "",
    datum: b.datum ?? "",
    bewerkt: b.bewerkt ?? false,
    verwijderd: b.verwijderd ?? false,
    analyse: b.analyse
      ? {
          ...b.analyse,
          dekking: (b.analyse.dekking ?? []).map((d) => ({
            ...d,
            citaat: d.citaat ?? "",
            vindplaats: d.vindplaats ?? "",
            domeinen: d.domeinen ?? [],
            openPunten: d.openPunten ?? [],
          })),
          punten: (b.analyse.punten ?? []).map((p) => ({
            ...p,
            citaat: p.citaat ?? "",
            vindplaats: p.vindplaats ?? "",
            actiesNogTeDoen: p.actiesNogTeDoen ?? [],
          })),
        }
      : undefined,
  };
}

/**
 * Lijsten op sleutel samenvoegen: sessie wint, seed vult aan. Een item dat in de sessie
 * "afgerond" is, gaat nooit terug naar een andere status.
 */
function mergeOpSleutel<T>(seed: T[], sessie: T[] | undefined, sleutel: (x: T) => string, vul: (x: T) => T): T[] {
  if (!sessie) return seed.map(vul);
  const resultaat = sessie.map(vul);
  const aanwezig = new Set(resultaat.map(sleutel));
  for (const s of seed) {
    if (!aanwezig.has(sleutel(s))) resultaat.push(vul(s));
  }
  return resultaat;
}

/** Legt de opgeslagen (mogelijk gedeeltelijke) bronnenanalyse over de seed. */
export function mergeBronnenAnalyse(opgeslagen?: Partial<BronnenAnalyse> | null): BronnenAnalyse {
  const basis = kloon(DEFAULT_BRONNEN_ANALYSE);
  if (!opgeslagen) return basis;
  const sessieVersie = typeof opgeslagen.seedVersie === "number" ? opgeslagen.seedVersie : 0;

  // Bronnen op id: sessie wint; tombstones blijven; seed vult aan.
  let bronnen: Bron[];
  if (!opgeslagen.bronnen) {
    bronnen = basis.bronnen;
  } else {
    const seedOpId = new Map(basis.bronnen.map((b) => [b.id, b]));
    bronnen = opgeslagen.bronnen.map((origineel) => {
      const b = vulBron(kloon(origineel));
      const seed = seedOpId.get(b.id);
      if (!seed || b.verwijderd || b.bewerkt || !seed.analyse) return b;
      const sessieZonderAnalyse = !b.analyse;
      const verouderdeSeedAnalyse =
        sessieVersie < BRONNENANALYSE_SEED_VERSIE && b.analyse?.door === "seed";
      if (sessieZonderAnalyse || verouderdeSeedAnalyse) return { ...b, analyse: kloon(seed.analyse) };
      return b;
    });
    const aanwezig = new Set(bronnen.map((b) => b.id));
    for (const s of basis.bronnen) {
      if (!aanwezig.has(s.id)) bronnen.push(s);
    }
  }

  const nogNodig = mergeOpSleutel(basis.nogNodig, kloonOpt(opgeslagen.nogNodig), (x) => x.id, (x) => ({
    ...x,
    actie: x.actie ?? "",
    status: x.status ?? "open",
    bewerkt: x.bewerkt ?? false,
  }));
  const kanNuInGang = mergeOpSleutel(basis.kanNuInGang, kloonOpt(opgeslagen.kanNuInGang), (x) => x.id, (x) => ({
    ...x,
    onderbouwing: x.onderbouwing ?? [],
    status: x.status ?? "voorstel",
    bewerkt: x.bewerkt ?? false,
  }));
  const werkstroomOordelen = mergeOpSleutel(
    basis.werkstroomOordelen,
    kloonOpt(opgeslagen.werkstroomOordelen),
    (x) => x.werkstroom,
    (x) => ({
      ...x,
      wachtOp: x.wachtOp ?? "",
      toelichting: x.toelichting ?? "",
      voorstel: x.voorstel ?? true,
      bewerkt: x.bewerkt ?? false,
    }),
  );

  return {
    bronnen,
    nogNodig,
    werkstroomOordelen,
    kanNuInGang,
    werkstroomConclusies: { ...basis.werkstroomConclusies, ...(opgeslagen.werkstroomConclusies ?? {}) },
    puntConclusies: { ...basis.puntConclusies, ...(opgeslagen.puntConclusies ?? {}) },
    antwoordDoel: opgeslagen.antwoordDoel || basis.antwoordDoel || "",
    doeltoets: opgeslagen.doeltoets || basis.doeltoets || "",
    opmerkingen: kloon(opgeslagen.opmerkingen ?? []),
    seedVersie: BRONNENANALYSE_SEED_VERSIE,
  };
}
