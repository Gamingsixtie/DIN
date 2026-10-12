// Stap 12 — Bronnenanalyse: platte tekst uit Excel (.xlsx) en PowerPoint (.pptx) via jszip.
// Alleen server-side (Node). XML wordt met reguliere expressies gelezen (geen extra dependency).
// Vindplaatsen blijven zichtbaar in de tekst: "[Tabblad: naam]", "r3: …", "[Dia n]",
// "[Notities dia n]", zodat de AI een citaat met vindplaats kan geven.

import JSZip from "jszip";
import { BRONTEKST_MAX } from "@/lib/bronnenanalyse-service";

/** Decodeert XML-entities (benoemd en numeriek). */
export function decodeXmlEntities(s: string): string {
  return s.replace(/&(#x[0-9a-fA-F]+|#[0-9]+|amp|lt|gt|quot|apos);/g, (_m, e: string) => {
    switch (e) {
      case "amp":
        return "&";
      case "lt":
        return "<";
      case "gt":
        return ">";
      case "quot":
        return '"';
      case "apos":
        return "'";
      default: {
        const code = e.startsWith("#x") ? parseInt(e.slice(2), 16) : parseInt(e.slice(1), 10);
        if (!Number.isFinite(code) || code < 0 || code > 0x10ffff) return "";
        try {
          return String.fromCodePoint(code);
        } catch {
          return "";
        }
      }
    }
  });
}

/** Leest de waarde van een attribuut uit een tag-string. */
function attr(tag: string, naam: string): string | undefined {
  const m = new RegExp(`\\s${naam}="([^"]*)"`).exec(tag);
  return m ? decodeXmlEntities(m[1]) : undefined;
}

/** Alle tekst binnen <t>-elementen (ook <x:t> of rich-text runs) aaneen. */
function tTeksten(xml: string, tagNaam: string): string {
  const re = new RegExp(`<${tagNaam}(?:\\s[^>]*)?>([\\s\\S]*?)</${tagNaam}>`, "g");
  let uit = "";
  let m: RegExpExecArray | null;
  while ((m = re.exec(xml)) !== null) uit += decodeXmlEntities(m[1]);
  return uit;
}

async function laadZip(buffer: Buffer | ArrayBuffer): Promise<JSZip> {
  return JSZip.loadAsync(buffer);
}

async function leesBestand(zip: JSZip, pad: string): Promise<string | null> {
  const f = zip.file(pad);
  if (!f) return null;
  return f.async("string");
}

/** Bouwt de uitvoer op en stopt boven BRONTEKST_MAX (bescherming tegen zip-bommen). */
class Uitvoer {
  private delen: string[] = [];
  private lengte = 0;
  vol = false;
  regel(s: string) {
    if (this.vol) return;
    this.delen.push(s);
    this.lengte += s.length + 1;
    if (this.lengte > BRONTEKST_MAX) this.vol = true;
  }
  tekst(): string {
    const t = this.delen.join("\n");
    return t.length > BRONTEKST_MAX ? t.slice(0, BRONTEKST_MAX) : t;
  }
}

/** Normaliseert een relatief doelpad uit workbook.xml.rels naar een pad binnen de zip. */
function xlPad(target: string): string {
  let t = target.replace(/\\/g, "/");
  if (t.startsWith("/")) return t.slice(1);
  if (t.startsWith("../")) t = t.slice(3);
  else t = "xl/" + t;
  return t;
}

/** Excel (.xlsx) naar platte tekst: per tabblad "[Tabblad: naam]" en per rij "r<n>: a | b | c". */
export async function xlsxNaarTekst(buffer: Buffer | ArrayBuffer): Promise<string> {
  const zip = await laadZip(buffer);
  const workbook = await leesBestand(zip, "xl/workbook.xml");
  if (!workbook) throw new Error("Geen geldig Excel-bestand (workbook ontbreekt)");

  // r:id → doelpad
  const rels = (await leesBestand(zip, "xl/_rels/workbook.xml.rels")) ?? "";
  const relMap = new Map<string, string>();
  for (const m of rels.matchAll(/<Relationship\b[^>]*>/g)) {
    const id = attr(m[0], "Id");
    const target = attr(m[0], "Target");
    if (id && target) relMap.set(id, xlPad(target));
  }

  // gedeelde teksten
  const sst = (await leesBestand(zip, "xl/sharedStrings.xml")) ?? "";
  const shared: string[] = [];
  for (const m of sst.matchAll(/<si\b[^>]*>([\s\S]*?)<\/si>/g)) {
    // fonetische hulptekst (<rPh>) overslaan
    shared.push(tTeksten(m[1].replace(/<rPh\b[\s\S]*?<\/rPh>/g, ""), "t"));
  }

  const uit = new Uitvoer();
  const bladen = [...workbook.matchAll(/<sheet\b[^>]*\/?>/g)];
  let index = 0;
  for (const s of bladen) {
    if (uit.vol) break;
    index += 1;
    const naam = attr(s[0], "name") ?? `Blad ${index}`;
    const rid = attr(s[0], "r:id");
    const pad = (rid && relMap.get(rid)) || `xl/worksheets/sheet${index}.xml`;
    const xml = await leesBestand(zip, pad);
    if (!xml) continue;

    uit.regel(`[Tabblad: ${naam}]`);
    let rijTeller = 0;
    for (const r of xml.matchAll(/<row\b([^>]*)>([\s\S]*?)<\/row>/g)) {
      if (uit.vol) break;
      rijTeller += 1;
      const rijNr = attr(` ${r[1]}`, "r") ?? String(rijTeller);
      const waarden: string[] = [];
      for (const c of r[2].matchAll(/<c\b([^>]*?)(?:\/>|>([\s\S]*?)<\/c>)/g)) {
        const cAttrs = ` ${c[1]}`;
        const inhoud = c[2] ?? "";
        const t = attr(cAttrs, "t");
        let waarde = "";
        if (t === "s") {
          const v = /<v>([\s\S]*?)<\/v>/.exec(inhoud);
          const i = v ? parseInt(v[1], 10) : NaN;
          waarde = Number.isFinite(i) ? (shared[i] ?? "") : "";
        } else if (t === "inlineStr") {
          waarde = tTeksten(inhoud, "t");
        } else {
          const v = /<v>([\s\S]*?)<\/v>/.exec(inhoud);
          waarde = v ? decodeXmlEntities(v[1]) : "";
          if (t === "b") waarde = waarde === "1" ? "WAAR" : waarde === "0" ? "ONWAAR" : waarde;
        }
        waarde = waarde.replace(/\s+/g, " ").trim();
        if (waarde) waarden.push(waarde);
      }
      if (waarden.length === 0) continue;
      uit.regel(`r${rijNr}: ${waarden.join(" | ")}`);
    }
    uit.regel("");
  }
  return uit.tekst().trim();
}

/** Tekst per alinea (<a:p>) uit een slide- of notitie-XML. */
function alineas(xml: string): string[] {
  const uit: string[] = [];
  for (const p of xml.matchAll(/<a:p\b[^>]*>([\s\S]*?)<\/a:p>/g)) {
    const tekst = tTeksten(p[1].replace(/<a:br\b[^>]*\/>/g, "<a:t> </a:t>"), "a:t")
      .replace(/\s+/g, " ")
      .trim();
    if (tekst) uit.push(tekst);
  }
  return uit;
}

/** PowerPoint (.pptx) naar platte tekst: per dia "[Dia n]" en eventuele "[Notities dia n]". */
export async function pptxNaarTekst(buffer: Buffer | ArrayBuffer): Promise<string> {
  const zip = await laadZip(buffer);
  const slides = Object.keys(zip.files)
    .map((pad) => {
      const m = /^ppt\/slides\/slide(\d+)\.xml$/.exec(pad);
      return m ? { pad, n: parseInt(m[1], 10) } : null;
    })
    .filter((x): x is { pad: string; n: number } => x !== null)
    .sort((a, b) => a.n - b.n);
  if (slides.length === 0) throw new Error("Geen geldig PowerPoint-bestand (geen dia's gevonden)");

  const uit = new Uitvoer();
  for (const s of slides) {
    if (uit.vol) break;
    const xml = (await leesBestand(zip, s.pad)) ?? "";
    uit.regel(`[Dia ${s.n}]`);
    for (const a of alineas(xml)) uit.regel(a);

    const notities = await leesBestand(zip, `ppt/notesSlides/notesSlide${s.n}.xml`);
    if (notities) {
      // dianummer-plaatshouder in notities overslaan
      const regels = alineas(notities).filter((r) => !/^\d+$/.test(r));
      if (regels.length > 0) {
        uit.regel(`[Notities dia ${s.n}]`);
        for (const r of regels) uit.regel(r);
      }
    }
    uit.regel("");
  }
  return uit.tekst().trim();
}
