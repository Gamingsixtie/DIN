// ============================================================
// "Van KPI's naar baten" — levend Word-document, ontworpen voor
// scanbaarheid: sectiebalken in kleur, stappen als tabellen met
// nummerblokken, doelen als twee kaarten naast elkaar.
// Inhoud 1-op-1 uit STAPPENPLAN-SKETCH.html.
// ============================================================
const fs = require("fs");
const path = require("path");
const os = require("os");
const {
  Document, Packer, Paragraph, TextRun, WidthType, AlignmentType,
  Table, TableRow, TableCell, BorderStyle, ShadingType, ExternalHyperlink,
  VerticalAlign,
} = require("docx");

// ---- kleuren (zelfde systeem als de sketch) ----
const CITO = "003366", BATEN = "0066CC", TEAL = "0891B2", PAARS = "6D28D9";
const AMBER = "B45309", GROEN = "047857", BLAUW = "2563EB", ORANJE = "D97706";
const INK = "111827", INK2 = "3D4654", INK3 = "667085";
const AMBER_BG = "FFF7E6", TEAL_BG = "E6F6FA", GRIJS_BG = "F4F6F9";

const NB = { style: BorderStyle.NIL };
const NO_BORDERS = { top: NB, bottom: NB, left: NB, right: NB, insideHorizontal: NB, insideVertical: NB };

const b = (t, o = {}) => new TextRun({ text: t, bold: true, color: INK, ...o });
const r = (t, o = {}) => new TextRun({ text: t, color: INK2, ...o });
const it = (t, o = {}) => new TextRun({ text: t, italics: true, color: INK2, ...o });

const spacer = (pts = 120) => new Paragraph({ spacing: { after: pts }, children: [] });

function p(children, o = {}) {
  return new Paragraph({ spacing: { after: 100 }, children, ...o });
}

// ---- sectiebalk: volle breedte, gekleurd, wit nummer + titel ----
function secband(nr, titel, kleur) {
  return new Table({
    width: { size: 100, type: WidthType.PERCENTAGE },
    borders: NO_BORDERS,
    rows: [new TableRow({
      children: [new TableCell({
        shading: { type: ShadingType.CLEAR, fill: kleur },
        margins: { top: 140, bottom: 140, left: 200, right: 200 },
        children: [new Paragraph({
          children: [
            new TextRun({ text: nr + "  ", bold: true, color: "FFFFFF", size: 26 }),
            new TextRun({ text: titel, bold: true, color: "FFFFFF", size: 26 }),
          ],
        })],
      })],
    })],
  });
}

// ---- notitieblok ----
function notitie(children, fill = AMBER_BG, accent = AMBER) {
  return new Table({
    width: { size: 100, type: WidthType.PERCENTAGE },
    borders: NO_BORDERS,
    rows: [new TableRow({
      children: [
        new TableCell({
          width: { size: 1.2, type: WidthType.PERCENTAGE },
          shading: { type: ShadingType.CLEAR, fill: accent },
          children: [new Paragraph({ children: [] })],
        }),
        new TableCell({
          shading: { type: ShadingType.CLEAR, fill },
          margins: { top: 110, bottom: 110, left: 170, right: 170 },
          children: [new Paragraph({ spacing: { after: 0 }, children })],
        }),
      ],
    })],
  });
}

// ---- stappenrij: nummerblok + inhoud (titel / tekst / met wie) ----
function stap(nr, kleur, titelRuns, tekstRuns, metWie, tag) {
  const inhoud = [
    new Paragraph({
      spacing: { after: 40 },
      children: [
        ...titelRuns,
        ...(tag ? [new TextRun({ text: "   " + tag, bold: true, color: INK3, size: 16 })] : []),
      ],
    }),
  ];
  if (tekstRuns && tekstRuns.length) {
    inhoud.push(new Paragraph({ spacing: { after: metWie ? 40 : 0 }, children: tekstRuns }));
  }
  if (metWie) {
    inhoud.push(new Paragraph({
      spacing: { after: 0 },
      children: [new TextRun({ text: "Met wie:  ", bold: true, color: kleur, size: 18 }), new TextRun({ text: metWie, color: INK2, size: 18 })],
    }));
  }
  return new TableRow({
    cantSplit: true,
    children: [
      new TableCell({
        width: { size: 7, type: WidthType.PERCENTAGE },
        shading: { type: ShadingType.CLEAR, fill: kleur },
        verticalAlign: VerticalAlign.TOP,
        margins: { top: 110, bottom: 110, left: 60, right: 60 },
        children: [new Paragraph({
          alignment: AlignmentType.CENTER,
          children: [new TextRun({ text: String(nr), bold: true, color: "FFFFFF", size: 24 })],
        })],
      }),
      new TableCell({
        shading: { type: ShadingType.CLEAR, fill: "F5F7FA" },
        margins: { top: 130, bottom: 130, left: 190, right: 190 },
        children: inhoud,
      }),
    ],
  });
}
function stappenTabel(rows) {
  const uit = [];
  const legeCel = () => new TableCell({
    borders: NO_BORDERS,
    children: [new Paragraph({ spacing: { after: 0, line: 130 }, children: [new TextRun({ text: "", size: 8 })] })],
  });
  rows.forEach((rij, i) => {
    uit.push(rij);
    if (i < rows.length - 1) uit.push(new TableRow({ children: [legeCel(), legeCel()] }));
  });
  return new Table({ width: { size: 100, type: WidthType.PERCENTAGE }, borders: NO_BORDERS, rows: uit });
}

// ---- domeinkop (subkop met kleuraccent) ----
function domkop(titel, meta, kleur) {
  return new Paragraph({
    spacing: { before: 240, after: 80 },
    children: [
      new TextRun({ text: titel, bold: true, color: kleur, size: 22 }),
      new TextRun({ text: "   " + meta, color: INK3, size: 16 }),
    ],
  });
}

// ---- keten (samenhang): 4 kolommen, gekleurde koppen ----
function ketenTabel() {
  const kol = (titel, kleur, status, tekstRuns) => new TableCell({
    width: { size: 25, type: WidthType.PERCENTAGE },
    margins: { top: 0, bottom: 0, left: 0, right: 80 },
    borders: NO_BORDERS,
    children: [
      new Table({
        width: { size: 100, type: WidthType.PERCENTAGE },
        borders: NO_BORDERS,
        rows: [
          new TableRow({
            children: [new TableCell({
              shading: { type: ShadingType.CLEAR, fill: kleur },
              margins: { top: 80, bottom: 80, left: 120, right: 120 },
              children: [new Paragraph({ children: [new TextRun({ text: titel, bold: true, color: "FFFFFF", size: 19 })] })],
            })],
          }),
          new TableRow({
            children: [new TableCell({
              shading: { type: ShadingType.CLEAR, fill: GRIJS_BG },
              margins: { top: 90, bottom: 100, left: 120, right: 120 },
              children: [
                new Paragraph({ spacing: { after: 40 }, children: [new TextRun({ text: status, bold: true, color: kleur, size: 15 })] }),
                new Paragraph({ spacing: { after: 0 }, children: tekstRuns.map((x) => { x.size = 16; return new TextRun(x); }) }),
              ],
            })],
          }),
        ],
      }),
    ],
  });
  return new Table({
    width: { size: 100, type: WidthType.PERCENTAGE },
    borders: NO_BORDERS,
    rows: [new TableRow({
      children: [
        kol("Baten-KPI's", BATEN, "✓ VASTGESTELD", [
          { text: "Waarop we sturen. ", bold: true, color: INK },
          { text: "KPI's per sector vastgesteld — de ", color: INK2 },
          { text: "start- en doelwaarden ontbreken nog", bold: true, color: AMBER },
          { text: "; die volgen uit de analysefase.", color: INK2 },
        ]),
        kol("← Vermogen", TEAL, "METING IN OPBOUW", [
          { text: "Wat we moeten kunnen. ", bold: true, color: INK },
          { text: "Zelfscore per sector (1–5): Zakelijk 3 · PO 2 · VO 2, ambitie 5. Nog een gevoel — de echte stand per domein komt uit de analysefase.", color: INK2 },
        ]),
        kol("← Analysefase '26", TEAL, "Q3–Q4 · DE MOTOR", [
          { text: "Maakt de KPI's meetbaar en gemeten", bold: true, color: INK },
          { text: ", en vertaalt de gap naar een concreet pakket per domein.", color: INK2 },
        ]),
        kol("← Inspanningen", PAARS, "3SIDES VOERT UIT", [
          { text: "Wat we doen. ", bold: true, color: INK },
          { text: "Per domein, afvinkbaar (klaar j/n) — met quick wins parallel voor zichtbaar resultaat.", color: INK2 },
        ]),
      ],
    })],
  });
}

// ---- doelenkaart (Q3/Q4 naast elkaar) ----
function doelKolom(titel, sub, items, mijlpaal) {
  const kids = [
    new Paragraph({ spacing: { after: 20 }, children: [new TextRun({ text: titel, bold: true, color: INK, size: 21 })] }),
    new Paragraph({ spacing: { after: 90 }, children: [new TextRun({ text: sub, color: INK3, size: 16 })] }),
  ];
  for (const item of items) {
    kids.push(new Paragraph({ spacing: { after: 70 }, children: [new TextRun({ text: "☐  ", color: INK3, size: 19 }), ...item] }));
  }
  kids.push(new Paragraph({
    spacing: { before: 60, after: 0 },
    shading: { type: ShadingType.CLEAR, fill: TEAL_BG },
    children: [new TextRun({ text: " Mijlpaal 3sides: " + mijlpaal + " ", bold: true, color: "0C5460", size: 16 })],
  }));
  return new TableCell({
    width: { size: 50, type: WidthType.PERCENTAGE },
    margins: { top: 130, bottom: 130, left: 170, right: 170 },
    borders: { top: { style: BorderStyle.SINGLE, size: 22, color: TEAL }, bottom: { style: BorderStyle.SINGLE, size: 4, color: "E7EBF0" }, left: { style: BorderStyle.SINGLE, size: 4, color: "E7EBF0" }, right: { style: BorderStyle.SINGLE, size: 4, color: "E7EBF0" } },
    children: kids,
  });
}

// ---- domeinkaart (compact, voor 2x2 raster) ----
function domCard(titel, meta, kleur, items) {
  const kids = [
    new Paragraph({ spacing: { after: 20 }, children: [new TextRun({ text: titel, bold: true, color: kleur, size: 21 })] }),
    new Paragraph({ spacing: { after: 90 }, children: [new TextRun({ text: meta, color: INK2, size: 16 })] }),
  ];
  for (const item of items) {
    kids.push(new Paragraph({
      spacing: { after: 50 },
      children: [
        new TextRun({ text: item.n + "  ", bold: true, color: kleur, size: 19 }),
        new TextRun({ text: item.t, color: INK, size: 19 }),
        new TextRun({ text: "  " + item.q, bold: true, color: INK3, size: 15 }),
      ],
    }));
  }
  return new TableCell({
    width: { size: 50, type: WidthType.PERCENTAGE },
    margins: { top: 120, bottom: 120, left: 160, right: 160 },
    borders: { top: { style: BorderStyle.SINGLE, size: 22, color: kleur }, bottom: { style: BorderStyle.SINGLE, size: 4, color: "E7EBF0" }, left: { style: BorderStyle.SINGLE, size: 4, color: "E7EBF0" }, right: { style: BorderStyle.SINGLE, size: 4, color: "E7EBF0" } },
    children: kids,
  });
}

// ---- verandermanagement 2x2 ----
function vmCel(titel, tekst) {
  return new TableCell({
    width: { size: 50, type: WidthType.PERCENTAGE },
    margins: { top: 110, bottom: 110, left: 150, right: 150 },
    borders: { top: NB, bottom: NB, right: NB, left: { style: BorderStyle.SINGLE, size: 18, color: ORANJE } },
    shading: { type: ShadingType.CLEAR, fill: "FFFDF8" },
    children: [
      new Paragraph({ spacing: { after: 40 }, children: [new TextRun({ text: titel, bold: true, color: "92400E", size: 19 })] }),
      new Paragraph({ spacing: { after: 0 }, children: [new TextRun({ text: tekst, color: INK2, size: 18 })] }),
    ],
  });
}

const doc = new Document({
  styles: { default: { document: { run: { font: "Calibri", size: 20 }, paragraph: { spacing: { line: 264 } } } } },
  sections: [{
    properties: { page: { margin: { top: 900, bottom: 900, left: 1000, right: 1000 } } },
    children: [
      // ===== TITELBLOK =====
      new Table({
        width: { size: 100, type: WidthType.PERCENTAGE },
        borders: NO_BORDERS,
        rows: [new TableRow({
          children: [new TableCell({
            shading: { type: ShadingType.CLEAR, fill: CITO },
            margins: { top: 260, bottom: 260, left: 260, right: 260 },
            children: [
              new Paragraph({ spacing: { after: 60 }, children: [new TextRun({ text: "PROGRAMMA KLANT IN ZICHT", bold: true, color: "9DB9D6", size: 16 })] }),
              new Paragraph({ spacing: { after: 80 }, children: [new TextRun({ text: "Van vastgestelde KPI's naar gerealiseerde baten", bold: true, color: "FFFFFF", size: 34 })] }),
              new Paragraph({ spacing: { after: 0 }, children: [new TextRun({ text: "„De KPI's staan en het vermogen voelt als 2–3. Wat gaan we nu precies doen, in welke volgorde, wie doet wat — en hoe pakt 3sides de analysefase aan?”", italics: true, color: "CDDDF0", size: 19 })] }),
            ],
          })],
        })],
      }),
      spacer(80),
      notitie([
        b("Levend document — ", { color: AMBER }),
        r("na elk gesprek werken we dit bij.  ", ),
        r("Laatst bijgewerkt: 19 augustus 2026.", { color: INK3 }),
      ]),
      spacer(60),

      // ===== 1 SAMENHANG =====
      secband("1", "De samenhang in één oogopslag", CITO),
      spacer(60),
      p([r("Inspanningen bouwen het vermogen, het vermogen levert de baten — de analysefase is de schakel die het concreet maakt. Lees van rechts naar links:")]),
      ketenTabel(),
      spacer(80),
      notitie([
        b("Dit moet er concreet gebeuren: ", { color: "083B44" }),
        r("het plan hieronder uitvoeren, mét de Q3/Q4-doelen — dan zijn startwaarden, doelwaarden, indicatoren en de vervolg-inspanningen geen aannames meer, maar besluiten."),
      ], TEAL_BG, TEAL),
      spacer(40),
      notitie([
        b("Status: eerste schets — eerst valideren met de juiste stakeholders.  ", { color: AMBER }),
        r("Drie vragen aan tafel: "),
        b("① Is dit wat we willen?  ② Halen we hiermee álles uit de analysefase?  ③ Is helder waaróm we dit doen en wat het moet opleveren?"),
        r("  Er komen altijd nieuwe vraagstukken bij — dit overzicht beweegt mee."),
      ]),
      // ===== 2 DOELEN (start op eigen pagina, past dan op 1 pagina) =====
      new Paragraph({ pageBreakBefore: true, spacing: { after: 0 }, children: [] }),
      secband("2", "De doelen van de analysefase   —   vaststellen met de programma-eigenaar", TEAL),
      spacer(60),
      p([
        b("Dit is de kern van dit document — deze doelen zijn waar we naartoe werken. "),
        r("Ze zijn een voorstel voor de analysefase: in de gesprekken die volgen — zoals we die eerder rond de KPI's voerden — kunnen ze nog concreter worden. Toetsbare einddoelen, klaar j/n — geen verzonnen getallen. De mijlpalen komen uit het goedgekeurde 3sides-voorstel."),
      ]),
      new Table({
        width: { size: 100, type: WidthType.PERCENTAGE },
        borders: NO_BORDERS,
        rows: [new TableRow({
          cantSplit: true,
          children: [
            doelKolom("Eind Q3 2026", "meetbaar, gemeten & gericht", [
              [b("Élke baten-KPI compleet ingevuld"), r(" — per KPI vijf dingen op papier: "), b("wat"), r(" meten we (definitie) · "), b("waar"), r(" komt het getal vandaan · "), b("hoe vaak"), r(" · "), b("waar staan we nu"), r(" (startwaarde) · "), b("waar willen we heen en wanneer"), r(" (doelwaarde mét datum). Doelwaarden + vermogen-indicatoren: in één vervolgsessie direct na de nulmeting.")],
              [b("Inspanningsteam per domein samengesteld"), r(" — inspanningsleider + teamleden uit de sectoren, die de activiteiten daadwerkelijk uitvoeren.")],
              [b("De echte stand per onderdeel bekend"), r(" — data & systemen · processen · mens · cultuur: gemeten, in plaats van op gevoel.")],
              [b("Pilotgroep gestart"), r(" in 1 sector.")],
            ], "adoptie-framework gereed & gedragen door het programmateam"),
            doelKolom("Eind Q4 2026", "concreet & besluitklaar", [
              [b("Per onderdeel een concreet pakket vervolg-inspanningen voor 2027"), r(" — wat er moet gebeuren om te groeien, elk onderbouwd met: "), b("welke baat wordt hier beter van?")],
              [b("Richting CRM bepaald"), r(" (formele keuze ~april '27).")],
              [b("Eerste quick win zichtbaar gerealiseerd"), r(".")],
            ], "pilot draait, eerste gedragsdata beschikbaar"),
          ],
        })],
      }),
      // ===== 3 HET PLAN (start op eigen pagina) =====
      new Paragraph({ pageBreakBefore: true, spacing: { after: 0 }, children: [] }),
      secband("3", "Het plan — de analysefase per domein, op prioriteit", PAARS),
      spacer(60),
      notitie([
        b("Eerste aanzet — wat tot nu toe is bepaald en opgeschreven.  ", { color: AMBER }),
        r("Elke activiteit dient de doelen uit deel 2. De verdere specificatie (wie · wat · per week) komt uit de analysefase zelf — onderdeel van de opdracht aan 3sides (deel 4)."),
      ]),
      spacer(40),
      p([
        b("Prioriteit:  1 · Data & Systemen   →   2 · Processen   →   3 · Mens   →   4 · Cultuur"),
      ]),
      p([
        r("Alle vier de domeinen lopen in 2026 "), b("tegelijk"), r(" — lagere prioriteit betekent níét „later” of „niet doen”, maar waar de meeste capaciteit en nadruk zit. Data & Systemen en Processen "), b("starten naast elkaar"), r(" (sessie: „niet los, de één eerder dan de ander”) — het funnelontwerp bepaalt immers wélke data nodig is. Mens en Cultuur lopen mee en worden actief bewaakt."),
      ]),

      domkop("Fundament — programma-breed", "3sides · programmamanagers", CITO),
      stappenTabel([
        stap(1, CITO, [b("Iedereen opnieuw meenemen")], [r("Het verhaal vertellen — wat, waarom, wat merk je ervan — en de visie & missie kort hervalideren.")], "3sides · MT · sectormanagers · teams", "Q3"),
        stap(2, CITO, [b("Inspanningsleiders & teams bepalen")], [r("De "), b("domeineigenaren zijn al belegd"), r(" — die nemen we hierin mee. In deze stap bepalen we per domein de "), b("inspanningsleider"), r(" (beoogd: Cultuur & Mens — HR-manager · Data & Systemen — Product Owner · Processen — nog te benoemen) en stellen we het "), b("team daarvan"), r(" samen: teamleden uit de sectoren (marketeers, productmanagers — op te halen via de sectormanagers). Dit doen we samen met 3sides — zij weten wat de analysefase per domein aan mensen vraagt.")], "3sides · domeineigenaren · sectormanagers", "Q3"),
        stap(3, CITO, [b("Meetprotocol per baten-KPI — afspreken hóé we meten")], [
          b("Wat we doen: "),
          r("per baten-KPI vullen we sámen met de sectormanagers het meetprotocol in — vijf vragen per KPI: "),
          b("wát"), r(" meten we precies (wat telt wel en niet mee) · "),
          b("wáár"), r(" komt het getal vandaan (welk systeem of welke bron) · "),
          b("in welke eenheid"), r(" (aantal, percentage, dagen) · "),
          b("hoe vaak"), r(" meten we · "),
          b("wie"), r(" levert het getal aan. In dezelfde ronde lopen we de "),
          b("KPI's zélf nog één keer langs"),
          r(", zodat iedereen er expliciet akkoord op geeft. "),
          b("Resultaat: "),
          r("een ingevuld en geaccordeerd meetprotocol per KPI, vastgelegd bij het KPI-model ("),
          new ExternalHyperlink({ children: [new TextRun({ text: "stap 9 in de app", style: "Hyperlink" })], link: "https://din-kappa.vercel.app/sessies/d8b97442-ce8f-4134-b2c7-67dc8e3a3f93" }),
          r(" · programmaplan H3.1) — daarmee kan de nulmeting (stap 5) direct draaien. "),
          b("Voorbeeld"), r(" — voor de KPI „churn / klantbehoud” spreken we af: wat telt precies als „verloren klant”, uit welk systeem het aantal komt, dat we in aantallen per jaar meten en wie het cijfer aanlevert. Zonder die afspraken meet iedereen iets anders en zijn metingen niet vergelijkbaar."),
        ], "3sides · eerst sectormanagers (akkoord) → strategisch marketeer + commercieel manager → MT", "Q3"),
        stap(4, CITO, [b("Adoptie-framework bouwen & vaststellen")], [b("Wat we doen: "), r("in werksessies vertalen we de klantreizen volgens de vaste logica klantreis → klantbehoefte → kritisch contactmoment → gewenst medewerkergedrag → competenties → KPI's: per rol leggen we vast welk gedrag we op de kritische contactmomenten willen zien en welke competenties daarvoor nodig zijn — die meetpunten worden de vermogen-indicatoren. Daarnaast richten we het Adoptie Team met ambassadeurs per sector in. "), b("Resultaat: "), r("een adoptie-framework dat gereed & gedragen is door het programmateam (mijlpaal Q3) + de basis voor de vermogen-indicatoren (stap 6).")], "3sides · sectormanagers + teamleden per rol (marketeers, productmanagers)", "Q3"),
        stap(5, CITO, [b("Nulmeting uitvoeren")], [b("Wat we doen: "), r("3sides voert het meetprotocol (stap 3) voor het eerst uit: per KPI het huidige getal ophalen uit de afgesproken bron; de meetverantwoordelijken leveren de data. Daarnaast meten we de echte stand per domein. "), b("Resultaat: "), r("de startwaarde van elke KPI + de stand per domein — de feitelijke basis voor de doelwaarden (stap 6) en het pakket vervolg-inspanningen.")], "3sides voert uit · meetverantwoordelijken leveren de bronnen", "Q3"),
        stap(6, CITO, [b("Vervolgsessie — direct na de nulmeting")], [b("Wat we doen: "), r("in één sessie leggen we per KPI de doelwaarde vast (haalbaar t.o.v. de startwaarde, mét datum) en kiezen we de vermogen-indicatoren uit het adoptie-framework (stap 4), mét een eigenaar per indicator. "), b("Resultaat: "), r("elke KPI compleet — definitie · startwaarde · doelwaarde mét datum · eigenaar — plus vastgestelde vermogen-indicatoren; daarmee is doel 1 van de analysefase (deel 2) gehaald.")], "3sides · eerst sectormanagers (akkoord) → strategisch marketeer + commercieel manager", "Q3/Q4"),
        stap(7, CITO, [b("Pilot starten in 1 sector")], [b("Wat we doen: "), r("in de pilotsector (keuze: nog te bepalen) brengen we de nieuwe werkwijze in de praktijk — funnelprocessen toepassen, klantcontact vastleggen, gedrag per rol oefenen zoals in het adoptie-framework beschreven. Klein beginnen, bewijzen dat het werkt, dan uitrollen (2e sector Q4 · 3e Q1 '27). "), b("Resultaat: "), r("de eerste échte gedragsdata + een bewezen aanpak voor de uitrol.")], "3sides · sectormanager pilotsector + team", "Q3"),
      ]),
      spacer(50),
      notitie([
        b("Volgorde & samenspel: ", { color: "083B44" }),
        r("draagvlak → protocol → framework → nulmeting → vervolgsessie → pilot. 3sides assisteert bij élke stap — voorbereiden, faciliteren, tempo houden. En het adoptie-framework ligt als paraplu óver alle vier de domeinen: ook techniek (CRM) heeft een adoptiekant — zó gaat de verandering leven in de organisatie."),
      ], TEAL_BG, TEAL),
      spacer(70),
      domkop("De analysefase per domein — op prioriteit", "prio 1 → 4 · alle vier lopen in 2026 tegelijk", CITO),
      p([
        b("Topic leads & teams: "),
        r("3sides levert voor Data & Systemen en Processen een "),
        b("topic lead"),
        r(" — een inhoudelijke trekker die de activiteiten van dat domein aanstuurt en het tempo bewaakt (senior op richting, medior op uitvoering, specialisten op afroep). Op basis van deze activiteiten stellen we per domein ook de "),
        b("inspanningsteams"),
        r(" samen (fundament, stap 2) — inclusief het team voor de analysefase. Die kunnen in samenstelling "),
        b("verschillen"),
        r(": de analyse vraagt deels andere mensen dan de uitvoering daarna."),
      ]),
      new Table({
        width: { size: 100, type: WidthType.PERCENTAGE },
        borders: NO_BORDERS,
        rows: [
          new TableRow({ cantSplit: true, children: [
            domCard("Prio 1 · Data & Systemen", "topic lead 3sides · inspanningsleider: Product Owner", PAARS, [
              { n: "1", t: "Klantinformatie-landschap + huidig CRM in kaart (8 bronnen)", q: "Q3" },
              { n: "2", t: "Quick wins: contactgegevens + Maileon ↔ CRM", q: "doorlopend" },
              { n: "3", t: "Klantreis als vertrekpunt → welke data hebben wíj nodig", q: "Q3–Q4" },
              { n: "4", t: "Datakwaliteit-eisen vanuit het funnelontwerp", q: "Q3–Q4" },
              { n: "5", t: "Klantreis → CRM-requirements (data · integratie)", q: "Q4" },
              { n: "6", t: "Platformopties → richting CRM (keuze ~april '27)", q: "Q4" },
            ]),
            domCard("Prio 2 · Processen", "topic lead 3sides · inspanningsleider: n.t.b.", GROEN, [
              { n: "1", t: "Klantreizen → funnelprocessen, incl. customer loops", q: "Q3–Q4" },
              { n: "2", t: "Eenduidig Customer Success-proces + contactmomenten", q: "Q4" },
            ]),
          ]}),
          new TableRow({ cantSplit: true, children: [
            domCard("Prio 3 · Mens", "inspanningsleider: HR-manager", BLAUW, [
              { n: "1", t: "Curriculumontwerp vaardigheidstraining (met HR)", q: "2026" },
              { n: "2", t: "Eerste intervisiegroepen live", q: "Q4" },
            ]),
            domCard("Prio 4 · Cultuur", "inspanningsleider: HR-manager · gedragen door MT", ORANJE, [
              { n: "1", t: "Leiderschapsaanpak → MT-besluit → 1e sessie gepland", q: "2026" },
              { n: "2", t: "Rituelen: klantverhalen · reflectie · klantbezoeken", q: "2026" },
              { n: "3", t: "Ambassadeurs per sector aangehaakt", q: "Q4" },
            ]),
          ]}),
        ],
      }),
      spacer(40),
      notitie([
        b("Bewaking: ", { color: AMBER }),
        r("de 3sides-prioriteit ligt bij Data & Systemen en Processen — de programmamanager houdt samen met 3sides de domeinen Mens en Cultuur actief in de gaten."),
      ]),
      spacer(60),

      // ===== 4 OPDRACHT 3SIDES =====
      secband("4", "Onze opdracht aan 3sides — wij voeren de regie", PAARS),
      spacer(60),
      p([r("Cito is opdrachtgever: wíj bepalen wat er nodig is, 3sides levert daarop — niet andersom. 3sides levert de topic leads voor Data & Systemen en Processen (senior op richting, medior op uitvoering, specialisten op afroep). Op basis van dit plan verwachten wij binnen de eerste weken:")]),
      stappenTabel([
        stap(1, PAARS, [b("Assistentie bij élke stap van het fundament")], [r("Óók bij „iedereen opnieuw meenemen”: voorbereiden, faciliteren en tempo houden. Zo benutten we de samenwerking optimaal en zetten we elke stap goed voorbereid en in het juiste tempo.")], null, null),
        stap(2, PAARS, [b("Plan van aanpak per domein volgens ónze prioritering")], [r("Wie, wat, wanneer — per week/maand in Q3–Q4.")], null, null),
        stap(3, PAARS, [b("Het meetprotocol per baten-KPI")], [r("Zodat de nulmeting direct kan draaien.")], null, null),
        stap(4, PAARS, [b("De nulmeting mét uitsplitsing per onderdeel")], [r("Niet alleen per sector, ook per domein.")], null, null),
        stap(5, PAARS, [b("Eind Q4: het pakket vervolg-inspanningen 2027 + kandidaat-indicatoren per domein")], [r("Elk onderbouwd met de baat die het dient — wij toetsen elk voorstel en besluiten.")], null, null),
        stap(6, PAARS, [b("Voortgang zichtbaar")], [r("Wekelijkse rapportage + kwartaalritme met de programmamanagers; bij stilstand escaleren wij via het afgesproken pad.")], null, null),
        stap(7, PAARS, [b("Zichtbaar aanwezig bij Cito")], [r("Werk regelmatig op locatie, sluit aan bij overleggen en wees aanspreekbaar voor de teams — de zichtbaarheid van 3sides draagt bij aan het draagvlak voor de verandering.")], null, null),
      ]),
      spacer(60),

      // ===== 5 VERANDERMANAGEMENT =====
      secband("5", "Mensen meenemen — de verandermanagement-laag", ORANJE),
      spacer(60),
      p([r("Meten alleen verandert niets. Deze vier lijnen lopen dwars door het plan heen — zo nemen we sectormanagers en stakeholders mee (bron: sessie + 3sides-voorstel).")]),
      new Table({
        width: { size: 100, type: WidthType.PERCENTAGE },
        borders: NO_BORDERS,
        rows: [
          new TableRow({
            children: [
              vmCel("1 · Richting en commitment vanuit het MT", "Het MT geeft de richting: het „MT-besluit” over de leiderschapsaanpak, en heldere afspraken over mandaat en prioriteit. Zo ziet de organisatie dat dit programma er écht toe doet — en kunnen de teams met vertrouwen aan de slag."),
              vmCel("2 · Beweging van binnenuit", "Een Adoptie Team met ambassadeurs per sector zorgt voor draagvlak en borging, aangevuld met intervisiegroepen (Q4) — „verandering beklijft als mensen het zelf dragen.” Sector voor sector via de pilot: niet alleen koplopers, het hele team."),
            ],
          }),
          new TableRow({
            children: [
              vmCel("3 · Zichtbare successen", "De quick wins worden direct geïmplementeerd en successen worden zichtbaar gemaakt en gedeeld — dat houdt energie en commitment hoog terwijl de analyse loopt."),
              vmCel("4 · Voorleven & verankeren", "Leiderschap leeft voor (klantbezoeken · sensing · klantverhalen delen) en in 2027 wordt de adoptie geborgd in de lijnorganisatie — een blijvende werkwijze, geen project dat wegzakt."),
            ],
          }),
        ],
      }),
      spacer(100),
      new Paragraph({
        alignment: AlignmentType.CENTER,
        children: [new TextRun({ text: "Bronnen: stakeholdersessie · goedgekeurd 3sides-voorstel · 3sides adoptie-framework · Werken aan Programma's (H8 baten · H9 veranderstrategie) · DIN-netwerk/programmaplan", size: 15, color: INK3 })],
      }),
    ],
  }],
});

(async () => {
  const buf = await Packer.toBuffer(doc);
  const naam = "Van KPI's naar baten — stappenplan analysefase.docx";
  for (const uit of [path.join(__dirname, "..", naam), path.join(os.homedir(), "Downloads", naam)]) {
    try {
      fs.writeFileSync(uit, buf);
      console.log("Geschreven: " + uit);
    } catch (e) {
      console.log("Overgeslagen (bestand in gebruik in Word?): " + uit);
    }
  }
})();
