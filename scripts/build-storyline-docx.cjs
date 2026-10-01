// ============================================================
// Markdown → Word (Cito-huisstijl) voor de storyline BV Dag.
//
//   node scripts/build-storyline-docx.cjs [input.md] [outputnaam.docx]
//
// Standaard: STORYLINE-BV-DAG.md (repo-root) →
//            "Storyline BV Dag - Klant in Zicht.docx" in de repo-root
//            én in ~/Downloads.
//
// Ondersteunde Markdown-subset (regel-voor-regel geparsed):
//   # Titel            documenttitel (Cito-blauw, lijn eronder)
//   ## Kop             sectiebalk (gevuld Cito-blauw, auto-nummer)
//   ### Kop            subkop (Cito-blauw, *cursief* toegestaan)
//   > tekst            notitieblok (teal accent)
//   - item             bullet
//   1. item            genummerde lijst
//   | a | b |          tabel (2e regel |---| = header-separator)
//   ---                horizontale lijn
//   [regie]            regieaanwijzing (cursief, grijs)
//   tekst              alinea; opeenvolgende regels = line breaks
//   inline: **bold** *italic* `code` [tekst](url)
//
// Kleursysteem identiek aan scripts/build-stappenplan-docx.cjs.
// ============================================================
const fs = require("fs");
const path = require("path");
const os = require("os");
const {
  Document, Packer, Paragraph, TextRun, WidthType,
  Table, TableRow, TableCell, BorderStyle, ShadingType, VerticalAlign,
  Footer, PageNumber, TabStopType, TableLayoutType, LineRuleType,
} = require("docx");

// ---- kleuren ----
const CITO = "003366";
const INK = "111827", INK2 = "3D4654", INK3 = "667085";
const GRIJS_BG = "F4F6F9";
const TEAL = "0891B2", TEAL_BG = "E6F6FA";
const AMBER = "B45309", AMBER_BG = "FFF7E6"; // beschikbaar voor varianten
const LIJN = "D0D0D0";

// ---- pagina (A4, marges 2 cm) ----
const MARGE = 1134;
const PAGINA_BREEDTE = 11906;
const PAGINA_HOOGTE = 16838;
const INHOUD_BREEDTE = PAGINA_BREEDTE - 2 * MARGE; // 9638 twips

const NB = { style: BorderStyle.NIL };
const NO_BORDERS = { top: NB, bottom: NB, left: NB, right: NB, insideHorizontal: NB, insideVertical: NB };
const DUN = { style: BorderStyle.SINGLE, size: 4, color: LIJN };
const DUNNE_RANDEN = { top: DUN, bottom: DUN, left: DUN, right: DUN, insideHorizontal: DUN, insideVertical: DUN };

// ============================================================
// Inline tokenizer: **bold**, *italic*, `code`, [tekst](url)
// ============================================================
function tokenize(text) {
  const out = [];
  let i = 0, bold = false, italic = false, buf = "";
  const flush = () => { if (buf) { out.push({ text: buf, bold, italic, code: false }); buf = ""; } };

  while (i < text.length) {
    const ch = text[i];

    // escapes: \* \` \[ \] \\ \_
    if (ch === "\\" && i + 1 < text.length && "*`[]\\_".includes(text[i + 1])) {
      buf += text[i + 1]; i += 2; continue;
    }

    // **bold** — altijd togglen; een onafgesloten ** wordt nooit als letterlijke tekst getoond
    if (text.startsWith("**", i)) {
      flush(); bold = !bold; i += 2; continue;
    }

    // *italic* — alleen als er een sluiting is, en niet bij losse sterretjes ("3 * 4")
    if (ch === "*") {
      const volgend = text[i + 1];
      if (italic || (volgend && volgend !== " " && text.indexOf("*", i + 1) !== -1)) {
        flush(); italic = !italic; i += 1; continue;
      }
      buf += "*"; i += 1; continue;
    }

    // `code`
    if (ch === "`") {
      const j = text.indexOf("`", i + 1);
      if (j > i) {
        flush();
        out.push({ text: text.slice(i + 1, j), bold, italic, code: true });
        i = j + 1; continue;
      }
    }

    // [tekst](url) → alleen de tekst
    if (ch === "[") {
      const m = /^\[([^\]]*)\]\(([^)]*)\)/.exec(text.slice(i));
      if (m) {
        flush();
        for (const t of tokenize(m[1])) {
          out.push({ text: t.text, bold: bold || t.bold, italic: italic || t.italic, code: t.code });
        }
        i += m[0].length; continue;
      }
    }

    buf += ch; i += 1;
  }
  flush();
  return out;
}

// tokens → TextRuns.  base = { size, color, bold, italics, font }
// opties: boldColor (kleur voor bold-delen; null = basiskleur behouden), codeSize
function runs(text, base = {}, opties = {}) {
  const boldColor = opties.boldColor === undefined ? INK : opties.boldColor;
  return tokenize(text).map((t) => {
    const o = { ...base, text: t.text };
    if (t.bold) { o.bold = true; if (boldColor) o.color = boldColor; }
    if (t.italic) o.italics = true;
    if (t.code) { o.font = "Consolas"; o.size = opties.codeSize || 20; }
    return new TextRun(o);
  });
}

// meerdere regels → runs gescheiden door line breaks
function runsMetBreaks(regels, base, opties) {
  const out = [];
  regels.forEach((regel, idx) => {
    if (idx > 0) out.push(new TextRun({ break: 1 }));
    out.push(...runs(regel, base, opties));
  });
  return out;
}

// ============================================================
// Blok-helpers
// ============================================================

// bijna-nulhoge alinea om ruimte vóór/na een tabel te maken
function gap(before, after) {
  return new Paragraph({
    spacing: { before: before || 0, after: after || 0, line: 20, lineRule: LineRuleType.EXACT },
    children: [new TextRun({ text: "", size: 2 })],
  });
}

function titel(tekst) {
  return new Paragraph({
    spacing: { before: 0, after: 240 },
    border: { bottom: { style: BorderStyle.SINGLE, size: 8, color: CITO, space: 6 } },
    children: runs(tekst, { bold: true, color: CITO, size: 40 }, { boldColor: null }),
  });
}

function secband(nr, tekst) {
  const kinderen = [];
  if (nr) kinderen.push(new TextRun({ text: nr + ".  ", bold: true, color: "FFFFFF", size: 26 }));
  kinderen.push(...runs(tekst, { bold: true, color: "FFFFFF", size: 26 }, { boldColor: null }));
  return [
    gap(320, 0),
    new Table({
      width: { size: 100, type: WidthType.PERCENTAGE },
      borders: NO_BORDERS,
      rows: [new TableRow({
        cantSplit: true,
        children: [new TableCell({
          shading: { type: ShadingType.CLEAR, fill: CITO },
          margins: { top: 140, bottom: 140, left: 200, right: 200 },
          children: [new Paragraph({ spacing: { after: 0 }, children: kinderen })],
        })],
      })],
    }),
    gap(0, 120),
  ];
}

function subkop(tekst, size = 24) {
  return new Paragraph({
    spacing: { before: 260, after: 60 },
    keepNext: true,
    children: runs(tekst, { bold: true, color: CITO, size }, { boldColor: null }),
  });
}

function notitie(regels, fill = TEAL_BG, accent = TEAL) {
  return [
    gap(60, 0),
    new Table({
      width: { size: 100, type: WidthType.PERCENTAGE },
      borders: NO_BORDERS,
      rows: [new TableRow({
        cantSplit: true,
        children: [
          new TableCell({
            width: { size: 1.2, type: WidthType.PERCENTAGE },
            shading: { type: ShadingType.CLEAR, fill: accent },
            children: [new Paragraph({ children: [] })],
          }),
          new TableCell({
            shading: { type: ShadingType.CLEAR, fill },
            margins: { top: 110, bottom: 110, left: 170, right: 170 },
            children: [new Paragraph({
              spacing: { after: 0 },
              children: runsMetBreaks(regels, { size: 20, color: INK2 }),
            })],
          }),
        ],
      })],
    }),
    gap(0, 120),
  ];
}

function bullet(tekst, niveau = 0) {
  const left = 360 + niveau * 360;
  return new Paragraph({
    indent: { left, hanging: 220 },
    spacing: { after: 60, line: 280 },
    children: [
      new TextRun({ text: "•  ", color: CITO, bold: true, size: 22 }),
      ...runs(tekst, { size: 22, color: INK2 }),
    ],
  });
}

function genummerd(nr, tekst, niveau = 0) {
  const left = 360 + niveau * 360;
  return new Paragraph({
    indent: { left, hanging: 220 },
    spacing: { after: 60, line: 280 },
    children: [
      new TextRun({ text: nr + ".  ", bold: true, color: CITO, size: 22 }),
      ...runs(tekst, { size: 22, color: INK2 }),
    ],
  });
}

function alinea(regels) {
  return new Paragraph({
    spacing: { after: 120, line: 300 },
    children: runsMetBreaks(regels, { size: 22, color: INK2 }),
  });
}

function regie(tekst) {
  return new Paragraph({
    spacing: { after: 120, line: 300 },
    children: runs(tekst, { size: 22, color: INK3, italics: true }, { boldColor: null }),
  });
}

function hr() {
  return new Paragraph({
    spacing: { before: 160, after: 200, line: 20, lineRule: LineRuleType.EXACT },
    border: { bottom: { style: BorderStyle.SINGLE, size: 6, color: LIJN, space: 1 } },
    children: [new TextRun({ text: "", size: 2 })],
  });
}

// ---- tabellen ----
function splitsCellen(regel) {
  let s = regel.trim();
  if (s.startsWith("|")) s = s.slice(1);
  if (s.endsWith("|") && !s.endsWith("\\|")) s = s.slice(0, -1);
  return s.split(/(?<!\\)\|/).map((c) => c.replace(/\\\|/g, "|").trim());
}
function isSeparator(regel) {
  const cellen = splitsCellen(regel);
  // lege cel toegestaan zodat "|---|---| " met trailing rommel niet stukgaat
  return cellen.length > 0 && cellen.some((c) => /^:?-+:?$/.test(c)) && cellen.every((c) => /^:?-+:?$/.test(c) || c === "");
}
function tekstLengte(md) {
  return tokenize(md).map((t) => t.text).join("").length;
}

function tabel(regels) {
  let header = null;
  let body = regels.map(splitsCellen);
  if (regels.length >= 2 && isSeparator(regels[1])) {
    header = body[0];
    body = body.slice(2);
  }
  const kolommen = Math.max(header ? header.length : 0, ...body.map((r) => r.length), 1);
  const pad = (r) => { const k = r.slice(); while (k.length < kolommen) k.push(""); return k; };
  if (header) header = pad(header);
  body = body.map(pad);

  // kolombreedtes: evenredig, tenzij de eerste kolom heel kort is
  const alleRijen = [...(header ? [header] : []), ...body];
  const maxEerste = Math.max(0, ...alleRijen.map((r) => tekstLengte(r[0])));
  let pct;
  if (kolommen > 1 && maxEerste <= 6) {
    const rest = (100 - 7) / (kolommen - 1);
    pct = [7, ...Array(kolommen - 1).fill(rest)];
  } else if (kolommen > 1 && maxEerste <= 10) {
    const rest = (100 - 12) / (kolommen - 1);
    pct = [12, ...Array(kolommen - 1).fill(rest)];
  } else {
    pct = Array(kolommen).fill(100 / kolommen);
  }
  const dxa = pct.map((p) => Math.round((INHOUD_BREEDTE * p) / 100));

  const cel = (md, kol, isHeader, even) => new TableCell({
    width: { size: dxa[kol], type: WidthType.DXA },
    shading: isHeader
      ? { type: ShadingType.CLEAR, fill: CITO }
      : (even ? { type: ShadingType.CLEAR, fill: GRIJS_BG } : undefined),
    margins: { top: 70, bottom: 70, left: 110, right: 110 },
    verticalAlign: VerticalAlign.TOP,
    children: [new Paragraph({
      spacing: { after: 0, line: 260 },
      children: isHeader
        ? runs(md, { bold: true, color: "FFFFFF", size: 19 }, { boldColor: null, codeSize: 18 })
        : runs(md, { color: INK, size: 19 }, { boldColor: INK, codeSize: 18 }),
    })],
  });

  const rows = [];
  if (header) {
    rows.push(new TableRow({
      cantSplit: true,
      tableHeader: true,
      children: header.map((c, k) => cel(c, k, true, false)),
    }));
  }
  body.forEach((r, i) => {
    rows.push(new TableRow({
      cantSplit: true,
      children: r.map((c, k) => cel(c, k, false, i % 2 === 1)),
    }));
  });

  return [
    gap(60, 0),
    new Table({
      width: { size: 100, type: WidthType.PERCENTAGE },
      layout: TableLayoutType.FIXED,
      columnWidths: dxa,
      borders: DUNNE_RANDEN,
      rows,
    }),
    gap(0, 120),
  ];
}

// ============================================================
// Parser: Markdown-regels → docx-elementen
// ============================================================
function parseMarkdown(md) {
  const regels = md.replace(/^﻿/, "").split(/\r?\n/);
  const uit = [];
  let alineaBuf = [];
  let quoteBuf = [];
  let tabelBuf = [];
  let h2Teller = 0;

  const sluitAlinea = () => { if (alineaBuf.length) { uit.push(alinea(alineaBuf)); alineaBuf = []; } };
  const sluitQuote = () => { if (quoteBuf.length) { uit.push(...notitie(quoteBuf)); quoteBuf = []; } };
  const sluitTabel = () => { if (tabelBuf.length) { uit.push(...tabel(tabelBuf)); tabelBuf = []; } };
  const sluitAlles = () => { sluitAlinea(); sluitQuote(); sluitTabel(); };

  for (const ruw of regels) {
    const regel = ruw.replace(/\s+$/, "");
    const getrimd = regel.trim();

    // lege regel → sluit alles
    if (getrimd === "") { sluitAlles(); continue; }

    // tabelregel
    if (getrimd.startsWith("|")) {
      sluitAlinea(); sluitQuote();
      tabelBuf.push(getrimd);
      continue;
    }
    sluitTabel();

    // blockquote
    if (/^>/.test(getrimd)) {
      sluitAlinea();
      quoteBuf.push(getrimd.replace(/^>\s?/, ""));
      continue;
    }
    sluitQuote();

    // horizontale lijn
    if (/^(-{3,}|\*{3,}|_{3,})$/.test(getrimd)) { sluitAlinea(); uit.push(hr()); continue; }

    // koppen
    let m;
    if ((m = /^#\s+(.*)$/.exec(getrimd))) { sluitAlinea(); uit.push(titel(m[1].trim())); continue; }
    if ((m = /^##\s+(.*)$/.exec(getrimd))) {
      sluitAlinea();
      const kop = m[1].trim();
      let nr = null;
      if (!/^\d/.test(kop)) { h2Teller += 1; nr = String(h2Teller); }
      uit.push(...secband(nr, kop));
      continue;
    }
    if ((m = /^###\s+(.*)$/.exec(getrimd))) { sluitAlinea(); uit.push(subkop(m[1].trim(), 24)); continue; }
    if ((m = /^#{4,6}\s+(.*)$/.exec(getrimd))) { sluitAlinea(); uit.push(subkop(m[1].trim(), 22)); continue; }

    // lijsten (met inspring-niveau)
    const inspring = regel.length - regel.replace(/^\s+/, "").length;
    const niveau = Math.min(3, Math.floor(inspring / 2));
    if ((m = /^[-*+]\s+(.*)$/.exec(getrimd))) { sluitAlinea(); uit.push(bullet(m[1], niveau)); continue; }
    if ((m = /^(\d+)[.)]\s+(.*)$/.exec(getrimd))) { sluitAlinea(); uit.push(genummerd(m[1], m[2], niveau)); continue; }

    // regieaanwijzing: hele regel tussen [ ]
    if (/^\[[^\]]*\]$/.test(getrimd)) { sluitAlinea(); uit.push(regie(getrimd)); continue; }

    // gewone tekst → alinea (opeenvolgende regels = line breaks)
    alineaBuf.push(getrimd);
  }
  sluitAlles();
  return uit;
}

// ============================================================
// Document
// ============================================================
function bouwDocument(md) {
  const inhoud = parseMarkdown(md);
  return new Document({
    creator: "Cito — programma Klant in Zicht",
    title: "Storyline BV Dag — Klant in Zicht",
    styles: {
      default: {
        document: { run: { font: "Calibri", size: 22, color: INK2 }, paragraph: { spacing: { line: 276 } } },
      },
    },
    sections: [{
      properties: {
        page: {
          size: { width: PAGINA_BREEDTE, height: PAGINA_HOOGTE }, // A4
          margin: { top: MARGE, bottom: MARGE, left: MARGE, right: MARGE },
        },
      },
      footers: {
        default: new Footer({
          children: [new Paragraph({
            tabStops: [{ type: TabStopType.RIGHT, position: INHOUD_BREEDTE }],
            spacing: { before: 0, after: 0 },
            border: { top: { style: BorderStyle.SINGLE, size: 4, color: LIJN, space: 4 } },
            children: [
              new TextRun({ text: "Storyline BV Dag — Klant in Zicht", size: 16, color: INK3 }),
              new TextRun({ text: "\t", size: 16, color: INK3 }),
              new TextRun({ children: [PageNumber.CURRENT], size: 16, color: INK3 }),
            ],
          })],
        }),
      },
      children: inhoud.length ? inhoud : [alinea(["(leeg document)"])],
    }],
  });
}

// ============================================================
// CLI
// ============================================================
(async () => {
  const repoRoot = path.join(__dirname, "..");
  const inputArg = process.argv[2] || "STORYLINE-BV-DAG.md";
  const outputNaam = process.argv[3] || "Storyline BV Dag - Klant in Zicht.docx";

  let input = path.isAbsolute(inputArg) ? inputArg : path.resolve(process.cwd(), inputArg);
  if (!fs.existsSync(input)) input = path.join(repoRoot, inputArg);
  if (!fs.existsSync(input)) {
    console.error("Invoerbestand niet gevonden: " + inputArg);
    process.exit(1);
  }

  const md = fs.readFileSync(input, "utf8");
  console.log("Invoer: " + input + " (" + md.length + " tekens, " + md.split(/\r?\n/).length + " regels)");

  const doc = bouwDocument(md);
  const buf = await Packer.toBuffer(doc);

  const doelen = [path.join(repoRoot, outputNaam), path.join(os.homedir(), "Downloads", outputNaam)];
  let geschreven = 0;
  for (const uit of doelen) {
    try {
      fs.writeFileSync(uit, buf);
      console.log("Geschreven: " + uit + " (" + buf.length + " bytes)");
      geschreven += 1;
    } catch (e) {
      console.log("Overgeslagen (" + (e && e.code ? e.code : "fout") + " — bestand in gebruik in Word?): " + uit);
    }
  }
  if (geschreven === 0) {
    console.error("Geen enkel bestand kon worden geschreven.");
    process.exit(1);
  }
})().catch((e) => {
  console.error("Fout bij bouwen van het document:", e && e.message ? e.message : e);
  process.exit(1);
});
