// Stap 11, tabblad "Evaluatie 3sides": de Word-export van de uitsnede (evaluatie-uitsnede.ts),
// in twee versies:
// - voor 3sides: wat Cito aan 3sides communiceert, met de begeleidende brief;
// - intern ("Intern Cito" op elke pagina): alles, ook wat Cito zelf doet (het actiebord en per
//   kader een eigen blok), ons oordeel, de notities en de onderbouwing.
//
// Opbouw van het document:
//   (alleen voor 3sides) de begeleidende brief, op een eigen pagina;
//   het voorblad: de kop (titel, ondertitel, versie, status, datum; intern met de regel
//   "Intern Cito") en de inhoud (de agenda, de delen uit u.delen en de bronnen);
//   de agenda, op een eigen pagina (zoals in de afdrukweergave);
//   de delen uit u.delen (nu twee: planning en evaluatie), elk op een nieuwe pagina; een deel
//   met de tijdlijn of het voortgangsbord staat liggend, de rest staand;
//   de gebruikte documenten.
// Wat er wel en niet in staat, bepaalt maakUitsnede; dit bestand zet het alleen in Word.
// De blokken staan in evaluatie-word-blokken.ts, het rekenwerk van de app in
// evaluatie-word-reken.ts en de bouwstenen in evaluatie-word-basis.ts.
// Draait in de browser (Packer.toBlob).

import {
  AlignmentType,
  BorderStyle,
  Document,
  Footer,
  Header,
  HeadingLevel,
  LineRuleType,
  Packer,
  PageNumber,
  PageOrientation,
  Paragraph,
  ShadingType,
  TextRun,
} from "docx";
import type { ISectionOptions } from "docx";
import type { DocBlok, DocSectie } from "@/lib/schemas";
import type { EvaluatieUitsnede } from "@/lib/evaluatie-uitsnede";
import { A4, BREEDTE, FONT, G, K, MARGE, alinea, bol, heeft, label, punt, schoon, t, tab, tekstAlinea, wit } from "@/lib/evaluatie-word-basis";
import { blokInhoud, wilLiggend } from "@/lib/evaluatie-word-blokken";
import type { Ctx, Inhoud } from "@/lib/evaluatie-word-blokken";
import type { Bord, Kaart, Tijdlijn } from "@/lib/evaluatie-word-reken";

const INTERN_REGEL = "Intern Cito · voor de programma-eigenaar";

type Stand = "staand" | "liggend";

function pagina(stand: Stand): ISectionOptions["properties"] {
  return {
    page: {
      size: { width: A4.breedte, height: A4.hoogte, orientation: stand === "liggend" ? PageOrientation.LANDSCAPE : PageOrientation.PORTRAIT },
      margin: MARGE[stand],
    },
  };
}

function datumVoluit(d: Date): string {
  return d.toLocaleDateString("nl-NL", { day: "numeric", month: "long", year: "numeric" });
}

/**
 * Eerste blok van een type in de gegevens van de uitsnede (u.gegevens: de tijdlijn, het
 * voortgangsbord en de werkstroomkaarten uit de analyse), zoals useBlok in de app het in het
 * document vindt. Alleen om mee te rekenen; de werkstroomkaarten staan niet in de export.
 */
function eersteBlok<T extends DocBlok["type"]>(u: EvaluatieUitsnede, type: T): Extract<DocBlok, { type: T }> | null {
  for (const b of u.gegevens ?? []) if (b?.type === type) return b as Extract<DocBlok, { type: T }>;
  return null;
}

/** Horizontale lijn: een lege, heel lage alinea met een rand onderaan. */
function lijnAlinea(kleur: string, dikte: number, voor: number, na: number): Paragraph {
  return new Paragraph({
    spacing: { before: voor, after: na, line: 60, lineRule: LineRuleType.EXACT },
    border: { bottom: { style: BorderStyle.SINGLE, size: dikte, color: kleur, space: 1 } },
    children: [],
  });
}

// ---------- kop- en voettekst ----------

/** Korte kopregel: de titel van het document links, de datum rechts, met een dunne lijn eronder. */
function kopregel(titel: string, datum: string, breedte: number): Header {
  return new Header({
    children: [
      alinea([...t(titel, { size: 16, color: K.inkt3 }), tab(), ...t(datum, { size: 16, color: K.inkt3 })], { na: 0, tabRechts: breedte }),
      lijnAlinea(K.lijn, 4, 30, 0),
    ],
  });
}

/** Voettekst: "Intern Cito" links (alleen intern) en "Pagina x van y" rechts. */
function voettekst(intern: boolean, breedte: number): Footer {
  return new Footer({
    children: [
      alinea(
        [
          ...(intern ? t("Intern Cito", { size: 16, bold: true, color: K.cito }) : []),
          tab(),
          new TextRun({ children: ["Pagina ", PageNumber.CURRENT, " van ", PageNumber.TOTAL_PAGES], font: FONT, size: 16, color: K.inkt3 }),
        ],
        { na: 0, tabRechts: breedte }
      ),
    ],
  });
}

// ---------- kop van het document ----------

/** Wat de versie bevat, in één regel in het titelblok. */
const VERSIE_REGEL = {
  intern: "Intern Cito: alles, ook wat Cito zelf doet, ons oordeel met de notities en de onderbouwing",
  "3sides": "Voor 3sides: wat we aan 3sides communiceren",
} as const;

/** Titelblok bovenaan: (intern) de regel "Intern Cito", titel, ondertitel, versie, status en datum. */
function documentKop(u: EvaluatieUitsnede, datum: string): Inhoud {
  const uit: Inhoud = [];
  if (u.versie === "intern") {
    uit.push(
      new Paragraph({
        spacing: { before: 0, after: 280, line: 320 },
        shading: { type: ShadingType.CLEAR, color: "auto", fill: K.cito },
        keepNext: true,
        children: t("  " + INTERN_REGEL, { size: G.tabel, bold: true, color: K.wit, spatie: 14 }),
      })
    );
  }
  uit.push(
    alinea(t(schoon(u.titel) || "Evaluatie 3sides", { size: G.titel, bold: true, color: K.cito }), {
      na: heeft(u.ondertitel) ? 80 : 180,
      regel: 250,
      bijVolgende: true,
    })
  );
  if (heeft(u.ondertitel)) uit.push(alinea(t(schoon(u.ondertitel), { size: 26, color: K.inkt2 }), { na: 200, bijVolgende: true }));
  const meta: [string, string][] = [
    ["Versie", VERSIE_REGEL[u.versie === "intern" ? "intern" : "3sides"]],
    ...(heeft(u.status) ? [["Status", schoon(u.status)] as [string, string]] : []),
    ["Datum", datum],
  ];
  meta.forEach(([naam, waarde], i) => {
    uit.push(
      alinea([...t(naam, { size: G.label, bold: true, color: K.inkt3, allCaps: true, spatie: 12 }), tab(), ...t(waarde, { size: G.body })], {
        na: i === meta.length - 1 ? 0 : 50,
        links: 1000,
        hangend: 1000,
        tabLinks: 1000,
        bijVolgende: true,
      })
    );
  });
  uit.push(lijnAlinea(K.cito, 18, 170, 300));
  return uit;
}

/** "1 · Planning en voortgang: de tijdlijn als basis" → hoofdtitel en ondertitel, zonder het nummer. */
function titelDelen(titel: string): { hoofd: string; sub: string } {
  const rest = schoon(titel).replace(/^\d+\s*·\s*/, "");
  const i = rest.indexOf(":");
  return i > 0 ? { hoofd: rest.slice(0, i).trim(), sub: rest.slice(i + 1).trim() } : { hoofd: rest, sub: "" };
}

/** De inhoud onder het titelblok: de agenda, de delen (zoveel als u.delen er heeft) en de bronnen. */
function inhoudsLijst(u: EvaluatieUitsnede): Inhoud {
  const regels: { nr: string; hoofd: string; sub: string }[] = [
    ...(u.agenda ? [{ nr: "Agenda", ...titelDelen(u.agenda.titel) }] : []),
    ...(u.delen ?? []).map((d) => ({ nr: "Deel " + d.nummer, ...titelDelen(d.sectie.titel) })),
    ...((u.bronnen ?? []).some((x) => heeft(x)) ? [{ nr: "Bronnen", hoofd: "Gebruikte documenten", sub: "" }] : []),
  ];
  if (regels.length === 0) return [];
  const wNr = 1250;
  return [
    label("Inhoud", K.inkt3, { na: 90 }),
    ...regels.map((r) =>
      alinea(
        [
          ...t(r.nr, { size: G.label, bold: true, color: K.cito, allCaps: true, spatie: 10 }),
          tab(),
          ...t(r.hoofd, { size: G.body, bold: true, color: K.cito }),
          ...(r.sub ? t(": " + r.sub, { size: G.body, color: K.inkt2 }) : []),
        ],
        { na: 90, links: wNr, hangend: wNr, tabLinks: wNr }
      )
    ),
  ];
}

// ---------- secties ----------

/** Kop van een deel, de agenda of de bronnen. */
function kop(tekst: string, size: number = G.h1, voor = 0): Paragraph {
  return new Paragraph({
    heading: HeadingLevel.HEADING_1,
    spacing: { before: voor, after: 150, line: 264 },
    keepNext: true,
    children: t(tekst, { size, bold: true, color: K.cito }),
  });
}

/** Titel, inleiding en blokken van één sectie. */
function sectieInhoud(s: DocSectie, ctx: Ctx): Inhoud {
  const uit: Inhoud = [];
  if (heeft(s.titel)) uit.push(kop(schoon(s.titel)));
  // de inleiding: iets groter en gedempt, zoals de ondertitel van een deel in de app
  if (heeft(s.intro)) uit.push(tekstAlinea(schoon(s.intro), { size: 22, color: K.inkt2 }, { na: 240, regel: 288 }));
  for (const b of s.blokken ?? []) uit.push(...blokInhoud(b, ctx));
  return uit;
}

/**
 * De brief: geen hoofdstukkop, alleen de alinea's met ruimte ertussen, zoals ze in de brief
 * staan (plaats en datum, aanhef, tekst, groet, naam). Staat er in de brief zelf geen
 * regel met plaats en datum (een korte regel met "datum" of een jaartal), dan komt de
 * exportdatum rechtsboven.
 */
function briefInhoud(s: DocSectie, datum: string, ctx: Ctx): Inhoud {
  const uit: Inhoud = [];
  const blokken = s.blokken ?? [];
  const eigenDatum = blokken
    .slice(0, 3)
    .some((b) => b?.type === "tekst" && schoon(b.tekst).length <= 60 && /\b20\d{2}\b|\bdatum\b/i.test(schoon(b.tekst)));
  if (!eigenDatum) uit.push(alinea(t(datum, { size: 22, color: K.inkt2 }), { na: 560, uitlijning: AlignmentType.RIGHT }));
  let eerste = true;
  for (const b of blokken) {
    if (b?.type === "tekst") {
      if (!heeft(b.tekst)) continue;
      // de eerste regel (plaats en datum) krijgt wat extra ruimte eronder, zoals in een brief
      const kort = eerste && eigenDatum && schoon(b.tekst).length <= 60;
      uit.push(alinea(t(schoon(b.tekst), { size: 22, color: kort ? K.inkt2 : K.inkt }), { voor: eerste ? 300 : 0, na: kort ? 520 : 230, regel: 300 }));
      eerste = false;
    } else {
      uit.push(...blokInhoud(b, ctx));
    }
  }
  return uit;
}

function bronnenInhoud(bronnen: string[], losseSectie: boolean): Inhoud {
  const items = bronnen.map(schoon).filter(Boolean);
  if (items.length === 0) return [];
  return [
    ...(losseSectie ? [] : [wit(200)]),
    kop("Gebruikte documenten", G.h2, losseSectie ? 0 : 160),
    // de lijst blijft bij de kop en bij elkaar: past hij niet meer, dan gaat hij in zijn geheel naar de volgende pagina
    ...items.map((x, i) => punt(t(x, { size: G.tabel }), bol(K.cito, G.tabel), { na: 60, regel: 258, bijVolgende: i < items.length - 1 })),
  ];
}

// ---------- het document ----------

/** Het Word-document (.docx) als Blob, klaar om te downloaden. */
export async function maakEvaluatieWord(u: EvaluatieUitsnede): Promise<Blob> {
  const vandaag = new Date();
  const datum = datumVoluit(vandaag);
  const intern = u.versie === "intern";
  const titel = schoon(u.titel) || "Evaluatie 3sides";
  const delen = u.delen ?? [];

  // waar de blokken mee rekenen: de tijdlijn, het voortgangsbord en de werkstroomkaarten (u.gegevens)
  const tijdlijn: Tijdlijn | null = eersteBlok(u, "tijdlijn");
  const bord: Bord | null = eersteBlok(u, "voortgangsbord");
  const kaarten: Kaart[] = eersteBlok(u, "werkstromen")?.kaarten ?? [];
  const ctx = (stand: Stand): Ctx => ({ versie: u.versie, breedte: BREEDTE[stand], vandaag, tijdlijn, bord, kaarten });

  const koppen = { staand: kopregel(titel, datum, BREEDTE.staand), liggend: kopregel(titel, datum, BREEDTE.liggend) };
  const voeten = { staand: voettekst(intern, BREEDTE.staand), liggend: voettekst(intern, BREEDTE.liggend) };
  const stukken: { stand: Stand; inhoud: Inhoud; metKopregel: boolean }[] = [];

  // 1 · alleen voor 3sides: de begeleidende brief, eerst en op een eigen pagina (zonder kopregel)
  if (!intern && u.brief) stukken.push({ stand: "staand", inhoud: briefInhoud(u.brief, datum, ctx("staand")), metKopregel: false });

  // 2 · het voorblad: de kop van het document met de inhoud eronder; de agenda op een eigen
  // pagina, zodat een langere agenda niet met één regel over de paginarand loopt
  stukken.push({ stand: "staand", inhoud: [...documentKop(u, datum), ...inhoudsLijst(u)], metKopregel: true });
  if (u.agenda) stukken.push({ stand: "staand", inhoud: sectieInhoud(u.agenda, ctx("staand")), metKopregel: true });

  // 3 · de delen, elk op een nieuwe pagina; liggend waar de tijdlijn of het bord dat vraagt
  for (const d of delen) {
    const stand: Stand = (d.sectie.blokken ?? []).some(wilLiggend) ? "liggend" : "staand";
    stukken.push({ stand, inhoud: sectieInhoud(d.sectie, ctx(stand)), metKopregel: true });
  }

  // 4 · de gebruikte documenten: achter het laatste deel als dat staand is, anders op een eigen pagina
  const laatste = stukken[stukken.length - 1];
  if (laatste.stand === "staand") laatste.inhoud.push(...bronnenInhoud(u.bronnen ?? [], false));
  else {
    const bronnen = bronnenInhoud(u.bronnen ?? [], true);
    if (bronnen.length > 0) stukken.push({ stand: "staand", inhoud: bronnen, metKopregel: true });
  }

  const doc = new Document({
    creator: "Cito",
    lastModifiedBy: "Cito",
    title: titel,
    description: intern ? INTERN_REGEL : "Versie voor 3sides",
    styles: {
      default: { document: { run: { font: FONT, size: G.body, color: K.inkt, language: { value: "nl-NL" } } } },
      paragraphStyles: [
        {
          id: "Heading1",
          name: "Heading 1",
          basedOn: "Normal",
          next: "Normal",
          quickFormat: true,
          run: { font: FONT, size: G.h1, bold: true, color: K.cito },
        },
      ],
    },
    sections: stukken.map(
      (s): ISectionOptions => ({
        properties: pagina(s.stand),
        headers: s.metKopregel ? { default: koppen[s.stand] } : undefined,
        footers: { default: voeten[s.stand] },
        children: s.inhoud,
      })
    ),
  });

  return Packer.toBlob(doc);
}
