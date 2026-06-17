/**
 * Native, BEWERKBARE PowerPoint van de medewerkers-deck "Klant in Beeld -> Klant in Zicht".
 * Echte tekstvakken + vormen (handmatig te bewerken) + placeholder-vlakken voor illustraties.
 * Run:  node scripts/build-medewerkers-pptx-native.cjs
 */
const PptxGen = require("pptxgenjs");
const P = new PptxGen();
P.defineLayout({ name: "D", width: 13.333, height: 7.5 });
P.layout = "D";
const W = 13.333, H = 7.5, F = "Segoe UI";
const C = { cito: "003366", teal: "159a86", green: "7bc043", navy: "1b3a5b", panel: "EEF1F6", ink: "243244", sub: "6B7A8D", line: "E5E9EF", grey: "94A3B8", lgrey: "CBD5E1" };
const DOM = { cultuur: "D97706", mens: "2563EB", data: "7C3AED", proces: "059669" };
const S = P.ShapeType;
const LOGO = require("path").join(__dirname, "..", "public", "klant-in-zicht.png");

const header = (s, title, subtitle, color) => {
  s.addShape(S.rect, { x: 0, y: 0, w: W, h: 1.1, fill: { color } });
  s.addText(title, { x: 0.55, y: 0.1, w: W - 1.1, h: subtitle ? 0.56 : 0.9, fontFace: F, fontSize: 28, bold: true, color: "FFFFFF", valign: "middle" });
  if (subtitle) s.addText(subtitle, { x: 0.55, y: 0.64, w: W - 1.1, h: 0.34, fontFace: F, fontSize: 14, color: "DCE6EF", valign: "middle" });
};
const cardBg = (s, x, y, w, h, opt = {}) => {
  const o = { x, y, w, h, rectRadius: opt.r || 0.1, fill: { color: opt.fill || "FFFFFF" } };
  if (opt.trans != null) o.fill.transparency = opt.trans;
  if (!opt.noLine) o.line = opt.line || { color: C.line, width: 1 };
  s.addShape(S.roundRect, o);
};
const placeholder = (s, x, y, w, h, label, color) => {
  s.addShape(S.roundRect, { x, y, w, h, rectRadius: 0.12, fill: { color: "FBFCFE" }, line: { color, width: 1.5, dashType: "dash" } });
  s.addText([{ text: label + "\n", options: { fontSize: 14, bold: true, color } }, { text: "illustratie volgt", options: { fontSize: 10, color: C.sub } }], { x, y, w, h, align: "center", valign: "middle", fontFace: F });
};

// ---------- 1. Titel ----------
let s = P.addSlide(); s.background = { color: "F5F8FC" };
s.addText("EEN UPDATE VOOR IEDEREEN BIJ CITO", { x: 0, y: 2.1, w: W, h: 0.4, align: "center", fontFace: F, fontSize: 13, bold: true, color: C.grey, charSpacing: 3 });
s.addText("Klant in Beeld", { x: 0, y: 2.55, w: W, h: 1.5, align: "center", fontFace: F, fontSize: 66, bold: true, color: C.cito });
s.addText("Waar staan we — en wat verandert er?", { x: 0, y: 4.2, w: W, h: 0.6, align: "center", fontFace: F, fontSize: 22, color: C.sub });

// ---------- 2. Agenda ----------
s = P.addSlide(); header(s, "Waar gaan we het over hebben?", null, C.teal);
const AGENDA = [["Even terugblikken", "wat is Klant in Beeld ook alweer?"], ["Groot nieuws", "Klant in Beeld krijgt een nieuwe naam"], ["Zo werken we", "een netwerk, vier domeinen"], ["Een quizje", "zijn we er met een domein?"], ["Samen met 3sides", "met wie we dit hebben gedaan"], ["Op de hoogte blijven", "intranet en bijeenkomsten"], ["Waar staan we straks?", "onze stip op de horizon"]];
AGENDA.forEach((a, i) => {
  const last = i === AGENDA.length - 1 && AGENDA.length % 2 === 1;
  const col = i % 2, row = Math.floor(i / 2);
  const y = 1.45 + row * 1.45, h = 1.25;
  const x = last ? 0.9 : 0.9 + col * 5.95;
  const w = last ? W - 1.8 : 5.5;
  cardBg(s, x, y, w, h, { fill: C.panel, noLine: true });
  s.addShape(S.ellipse, { x: x + 0.3, y: y + 0.33, w: 0.58, h: 0.58, fill: { color: C.cito } });
  s.addText(String(i + 1), { x: x + 0.3, y: y + 0.33, w: 0.58, h: 0.58, align: "center", valign: "middle", fontFace: F, fontSize: 17, bold: true, color: "FFFFFF" });
  s.addText(a[0], { x: x + 1.05, y: y + 0.22, w: w - 1.25, h: 0.45, fontFace: F, fontSize: 17, bold: true, color: C.ink, valign: "middle" });
  s.addText(a[1], { x: x + 1.05, y: y + 0.64, w: w - 1.25, h: 0.45, fontFace: F, fontSize: 12.5, color: C.sub, valign: "middle" });
});

// ---------- 3. Inleiding ----------
s = P.addSlide(); header(s, "Even terugblikken", null, C.cito);
s.addText("We willen onze klanten écht begrijpen — en daar elke dag naar handelen.", { x: 1.2, y: 2.3, w: W - 2.4, h: 1.4, align: "center", fontFace: F, fontSize: 30, bold: true, color: C.cito });
s.addText("Met Klant in Beeld hebben we samen de basis gelegd: van losse signalen naar één gedeeld beeld van wat scholen, docenten en leerlingen nodig hebben. Niet vanuit onszelf, maar van buiten naar binnen — outside-in.", { x: 1.6, y: 4.0, w: W - 3.2, h: 1.6, align: "center", fontFace: F, fontSize: 18, color: C.sub, lineSpacingMultiple: 1.2 });

// ---------- 4. Opgeleverd overzicht ----------
s = P.addSlide(); header(s, "Wat heeft het opgeleverd?", "De projectgroep Klant in Beeld dook in de wereld van onze gebruikers", C.cito);
s.addText("In elke sector gingen collega's hard aan de slag. Via interviews en analyses brachten we de belangrijkste klantreizen en interne processen in kaart — wat leidde tot een helder overzicht van knelpunten én kansen, direct vertaald naar ontwerpcriteria en prioriteiten. De eerste oplossingsrichtingen staan in de steigers.", { x: 1.4, y: 1.5, w: W - 2.8, h: 1.3, align: "center", fontFace: F, fontSize: 16, color: C.ink, lineSpacingMultiple: 1.15 });
const TOT = [["24", "interviews"], ["9", "klantreizen"], ["5", "interne proceskaarten"], ["3", "sectoren aan de slag"]];
TOT.forEach((t, i) => {
  const w = 2.7, gap = 0.4, x = (W - (4 * w + 3 * gap)) / 2 + i * (w + gap), y = 3.2;
  cardBg(s, x, y, w, 1.7, { fill: C.panel, noLine: true });
  s.addText(t[0], { x, y: y + 0.25, w, h: 0.9, align: "center", fontFace: F, fontSize: 44, bold: true, color: C.cito });
  s.addText(t[1], { x, y: y + 1.15, w, h: 0.4, align: "center", fontFace: F, fontSize: 14, color: C.sub });
});
s.addText("Per sector — PO, VO en Professionals — hierna de oogst.", { x: 0, y: 5.3, w: W, h: 0.4, align: "center", fontFace: F, fontSize: 16, bold: true, color: C.sub });

// ---------- 5-7. Opgeleverd per sector ----------
const SECT = [
  { sector: "Primair Onderwijs", color: DOM.data, cijfers: [["8", "interviews"], ["11", "betrokkenen"], ["3", "klantreizen"], ["2", "proceskaarten"]], punten: ["2 klantreizen van scholen + 1 aparte KVS-klantreis", "2 interne proceskaarten: systemen, data & interne stappen", "Knelpunten, behoeften & kansen → ontwerpcriteria en prioriteiten", "Eerste oplossingsrichtingen mét KPI's — klaar om te valideren"], wie: "IB'ers, leerkrachten, beheerders & schoolleiders", foto: "Werksessie PO" },
  { sector: "Voortgezet Onderwijs", color: DOM.proces, cijfers: [["9", "interviews"], ["5", "klantreizen"], ["3", "proceskaarten"], ["8", "kansen (HKJ's)"]], punten: ["5 klantreizen: hoe scholen met onze producten werken én hoe ze dat ervaren", "3 interne proceskaarten: systemen, data & interne stappen", "Knelpunten & kansen → ontwerpcriteria en prioriteiten", "8 belangrijkste kansen (HKJ's) uitgewerkt tot concrete ideeën"], wie: "Docenten, kwaliteitsmedewerkers, schoolleiders & leerlingen", foto: "Werksessie VO" },
  { sector: "Professionals", color: "0E9E8E", cijfers: [["7", "externe interviews"], ["+", "interne interviews"], ["1", "diepgaande klantreis"], ["✓", "verbeterconcepten"]], punten: ["Eén klantreis — maar volledig end-to-end uitgewerkt: van aanvraag tot training, boven én onder de lijn van zichtbaarheid", "Externe én interne interviews: het proces voor klant én Cito helder in beeld", "Knelpunten & kansen → Hoe-Kun-Je's en ontwerpcriteria", "Ideeën uitgewerkt tot concrete verbeterconcepten — klaar om te valideren"], wie: "Docenten, opleidingscoördinatoren & examencommissieleden", foto: "Werksessie Professionals" },
];
SECT.forEach((sec) => {
  s = P.addSlide(); header(s, "Opgeleverd — " + sec.sector, null, sec.color);
  sec.cijfers.forEach((c, i) => {
    const w = 1.55, x = 0.6 + i * (w + 0.18), y = 1.55;
    cardBg(s, x, y, w, 1.1, { fill: sec.color, trans: 86, line: { color: sec.color, width: 1 } });
    s.addText(c[0], { x, y: y + 0.13, w, h: 0.55, align: "center", fontFace: F, fontSize: 24, bold: true, color: sec.color });
    s.addText(c[1], { x, y: y + 0.66, w, h: 0.34, align: "center", fontFace: F, fontSize: 11, color: C.sub });
  });
  s.addText(sec.punten.map((p) => ({ text: p, options: { bullet: { indent: 18 } } })), { x: 0.6, y: 3.0, w: 6.7, h: 3.4, fontFace: F, fontSize: 16, color: C.ink, lineSpacingMultiple: 1.15, paraSpaceAfter: 10 });
  placeholder(s, 7.7, 1.55, 5.0, 3.7, sec.foto, sec.color);
  s.addText([{ text: "Wie spraken we?  ", options: { bold: true, color: C.ink } }, { text: sec.wie, options: { color: C.sub } }], { x: 7.7, y: 5.4, w: 5.0, h: 0.7, fontFace: F, fontSize: 13 });
});

// ---------- 8. Naamswijziging ----------
s = P.addSlide(); s.background = { color: C.cito };
s.addText("GROOT NIEUWS", { x: 0, y: 1.6, w: W, h: 0.4, align: "center", fontFace: F, fontSize: 14, bold: true, color: "9FB4CB", charSpacing: 3 });
s.addText([{ text: "Klant in Beeld", options: { strike: true, color: "8AA0B8" } }, { text: "   →   ", options: { color: "B8C6D6" } }, { text: "Klant in ", options: { color: "FFFFFF" } }, { text: "Zicht", options: { color: C.green } }], { x: 0.5, y: 2.5, w: W - 1, h: 1.5, align: "center", fontFace: F, fontSize: 48, bold: true });
s.addText("We zetten de klant niet alleen even in beeld — we houden 'm blijvend in zicht. Van momentopname naar continu meebewegen.", { x: 1.8, y: 4.4, w: W - 3.6, h: 1.2, align: "center", fontFace: F, fontSize: 20, color: "DCE6EF", lineSpacingMultiple: 1.2 });

// ---------- 8b. Logo Klant in Zicht ----------
s = P.addSlide(); s.background = { color: "F5F8FC" };
s.addImage({ path: LOGO, x: 2.67, y: 1.15, w: 8, h: 4.7, sizing: { type: "contain", w: 8, h: 4.7 } });
s.addText("Vier domeinen. Eén klantbeeld.", { x: 0, y: 6.1, w: W, h: 0.6, align: "center", fontFace: F, fontSize: 22, color: C.sub });

// ---------- 8c. Power-impressie: van kijken naar vooruitkijken ----------
s = P.addSlide(); s.background = { color: C.navy };
s.addText("VAN KIJKEN NAAR VOORUITKIJKEN", { x: 0, y: 0.9, w: W, h: 0.4, align: "center", fontFace: F, fontSize: 14, bold: true, color: "9FB4CB", charSpacing: 3 });
s.addText([{ text: "Een beeld is een momentopname.\n", options: { color: "FFFFFF" } }, { text: "Klant in Zicht", options: { color: C.green } }, { text: " is vooruitkijken.", options: { color: "FFFFFF" } }], { x: 1.0, y: 1.35, w: W - 2.0, h: 1.6, align: "center", fontFace: F, fontSize: 36, bold: true, lineSpacingMultiple: 1.05 });
const TRANS = [["Zien", "Begrijpen"], ["Reageren", "Anticiperen"], ["Kijken", "Vooruitkijken"], ["Leverancier", "Partner"]];
TRANS.forEach((t, i) => {
  const col = i % 2, row = Math.floor(i / 2);
  const w = 5.0, gap = 0.5, x = (W - (2 * w + gap)) / 2 + col * (w + gap), y = 3.55 + row * 0.95;
  s.addShape(S.roundRect, { x, y, w, h: 0.75, rectRadius: 0.38, fill: { color: "FFFFFF", transparency: 86 } });
  s.addText([{ text: t[0] + "   →   ", options: { color: "C7D3E0" } }, { text: t[1], options: { color: C.green, bold: true } }], { x, y, w, h: 0.75, align: "center", valign: "middle", fontFace: F, fontSize: 18 });
});
s.addText("Mens, cultuur, data en processen als één geheel — om de klant écht te kennen en duurzaam verbonden te blijven.", { x: 1.5, y: 5.65, w: W - 3.0, h: 0.9, align: "center", fontFace: F, fontSize: 16, color: "DCE6EF", lineSpacingMultiple: 1.15 });

// ---------- 9. DIN-netwerk intro ----------
s = P.addSlide(); header(s, "Zo werken we: één netwerk, vier domeinen", null, C.cito);
s.addText("Klant in Zicht wordt niet 'even geregeld'. Het lukt als we aan vier domeinen tegelijk werken — die samen één netwerk vormen.", { x: 1.6, y: 1.5, w: W - 3.2, h: 0.9, align: "center", fontFace: F, fontSize: 18, color: C.ink, lineSpacingMultiple: 1.15 });
const DOMS = [["Cultuur", DOM.cultuur], ["Mens", DOM.mens], ["Data & Systemen", DOM.data], ["Processen", DOM.proces]];
DOMS.forEach((d, i) => {
  const w = 2.8, gap = 0.4, x = (W - (4 * w + 3 * gap)) / 2 + i * (w + gap), y = 2.7;
  cardBg(s, x, y, w, 2.4);
  s.addShape(S.rect, { x, y, w, h: 0.12, fill: { color: d[1] } });
  placeholder(s, x + 0.5, y + 0.45, w - 1.0, 1.2, "icoon", d[1]);
  s.addText(d[0], { x, y: y + 1.75, w, h: 0.5, align: "center", fontFace: F, fontSize: 18, bold: true, color: d[1] });
});
s.addText("Maar… is één domein genoeg? Laten we het testen.", { x: 0, y: 5.4, w: W, h: 0.4, align: "center", fontFace: F, fontSize: 16, bold: true, color: C.sub });

// ---------- 10-13. Quiz per domein ----------
const QUIZ = [
  { label: "Cultuur", color: DOM.cultuur, vraag: "Stel: iederéén bij Cito ademt 'de klant centraal'.", uitleg: "Zonder de juiste vaardigheden, processen én systemen blijft het bij mooie intenties." },
  { label: "Mens", color: DOM.mens, vraag: "Stel: we trainen iedereen tot kampioen klantgesprekken.", uitleg: "Zonder ondersteunende processen, data en een cultuur die het draagt, zakt het zo weer weg." },
  { label: "Data & Systemen", color: DOM.data, vraag: "Stel: we hebben het mooiste klant-dashboard van Nederland.", uitleg: "Een systeem zonder gedrag, proces en cultuur is… een hele dure database." },
  { label: "Processen", color: DOM.proces, vraag: "Stel: onze processen staan tot in de puntjes op papier.", uitleg: "Zonder mensen die ze beheersen, data die ze voedt en cultuur die ze draagt, blijft het papier." },
];
QUIZ.forEach((q) => {
  s = P.addSlide(); header(s, "Het domein " + q.label, "Quizvraag — zijn we er met dít ene domein?", q.color);
  placeholder(s, 0.8, 2.0, 4.2, 3.9, "Illustratie: " + q.label, q.color);
  s.addText(q.vraag, { x: 5.5, y: 2.0, w: 7.2, h: 1.4, fontFace: F, fontSize: 26, bold: true, color: C.ink, lineSpacingMultiple: 1.05 });
  s.addText("Zijn we er dan?", { x: 5.5, y: 3.45, w: 7.2, h: 0.5, fontFace: F, fontSize: 22, bold: true, color: C.sub });
  cardBg(s, 5.5, 4.1, 1.5, 0.8, { fill: "FFFFFF", line: { color: C.lgrey, width: 1.5 }, r: 0.4 });
  s.addText("JA", { x: 5.5, y: 4.1, w: 1.5, h: 0.8, align: "center", valign: "middle", fontFace: F, fontSize: 20, bold: true, color: C.grey });
  s.addShape(S.roundRect, { x: 7.2, y: 4.1, w: 1.9, h: 0.8, rectRadius: 0.4, fill: { color: q.color } });
  s.addText("NEE", { x: 7.2, y: 4.1, w: 1.9, h: 0.8, align: "center", valign: "middle", fontFace: F, fontSize: 22, bold: true, color: "FFFFFF" });
  s.addText(q.uitleg, { x: 5.5, y: 5.2, w: 7.2, h: 1.2, fontFace: F, fontSize: 18, color: C.ink, lineSpacingMultiple: 1.15 });
});

// ---------- 14. Payoff ----------
s = P.addSlide(); s.background = { color: C.navy };
s.addText("Pas als alle vier samen bewegen, komt de klant écht in zicht.", { x: 1.2, y: 1.8, w: W - 2.4, h: 2.0, align: "center", fontFace: F, fontSize: 38, bold: true, color: "FFFFFF", lineSpacingMultiple: 1.05 });
DOMS.forEach((d, i) => {
  const w = 2.7, gap = 0.35, x = (W - (4 * w + 3 * gap)) / 2 + i * (w + gap), y = 4.4;
  s.addShape(S.roundRect, { x, y, w, h: 0.7, rectRadius: 0.35, fill: { color: d[1] } });
  s.addText(d[0], { x, y, w, h: 0.7, align: "center", valign: "middle", fontFace: F, fontSize: 16, bold: true, color: "FFFFFF" });
});
s.addText("Cultuur · Mens · Data & Systemen · Processen — als één netwerk.", { x: 0, y: 5.6, w: W, h: 0.5, align: "center", fontFace: F, fontSize: 18, color: "DCE6EF" });

// ---------- 15. Samenwerking 3sides ----------
s = P.addSlide(); header(s, "Dit deden we niet alleen", "Samen met onze partner 3sides", C.navy);
s.addText([{ text: "Met ", options: { color: C.cito } }, { text: "3sides", options: { color: C.teal } }, { text: " als partner hebben we de aanpak gebouwd én in gang gezet.", options: { color: C.cito } }], { x: 1.2, y: 1.6, w: W - 2.4, h: 1.0, align: "center", fontFace: F, fontSize: 28, bold: true });
const THREE = [["Strategie", "samen de richting en aanpak bepaald"], ["Samen doen", "schouder aan schouder in de uitvoering"], ["Vaart houden", "voortgang waar kennis of capaciteit ontbreekt"]];
THREE.forEach((t, i) => {
  const w = 3.6, gap = 0.5, x = (W - (3 * w + 2 * gap)) / 2 + i * (w + gap), y = 3.0;
  cardBg(s, x, y, w, 2.6);
  s.addShape(S.rect, { x, y, w, h: 0.12, fill: { color: C.teal } });
  placeholder(s, x + 1.1, y + 0.45, w - 2.2, 1.0, "icoon", C.teal);
  s.addText(t[0], { x, y: y + 1.6, w, h: 0.5, align: "center", fontFace: F, fontSize: 18, bold: true, color: C.ink });
  s.addText(t[1], { x: x + 0.3, y: y + 2.05, w: w - 0.6, h: 0.5, align: "center", fontFace: F, fontSize: 13, color: C.sub });
});

// ---------- 16. Informeren ----------
s = P.addSlide(); header(s, "Hoe blijven we je op de hoogte houden?", null, C.green);
[["Op het intranet", "Regelmatige updates over de voortgang, mijlpalen en wat het voor jouw werk betekent.", C.cito], ["Informatiebijeenkomsten", "Momenten om mee te denken, vragen te stellen en samen verder te bouwen.", C.teal]].forEach((t, i) => {
  const w = 5.5, gap = 0.6, x = (W - (2 * w + gap)) / 2 + i * (w + gap), y = 2.3;
  cardBg(s, x, y, w, 2.4);
  s.addShape(S.rect, { x, y, w: 0.14, h: 2.4, fill: { color: t[2] } });
  placeholder(s, x + 0.4, y + 0.4, 1.3, 1.3, "icoon", t[2]);
  s.addText(t[0], { x: x + 1.9, y: y + 0.5, w: w - 2.2, h: 0.6, fontFace: F, fontSize: 22, bold: true, color: t[2] });
  s.addText(t[1], { x: x + 1.9, y: y + 1.15, w: w - 2.2, h: 1.1, fontFace: F, fontSize: 15, color: C.sub, lineSpacingMultiple: 1.15 });
});

// ---------- 17. Slot: waar staan we straks (power-vorm) ----------
s = P.addSlide(); s.background = { color: "FFFFFF" };
s.addText("WAAR STAAN WE STRAKS?", { x: 0, y: 0.8, w: W, h: 0.4, align: "center", fontFace: F, fontSize: 14, bold: true, color: C.grey, charSpacing: 3 });
const BODY = "334155", B = (text) => ({ text, options: { color: C.cito, bold: true } }), N = (text) => ({ text, options: { color: BODY } });
s.addText([
  N("Met het programma "), B("Klant in Zicht"), N(" maakt Cito BV de beweging van "), B("reactief leverancier naar proactieve strategische partner"),
  N(". Vertrekpunt daarbij is een "), B("outside-in perspectief"), N(": niet wat wij als organisatie te bieden hebben, maar "), B("wat klanten werkelijk nodig hebben"),
  N(", bepaalt hoe wij denken en handelen. Door "), B("mens, proces, systeem en cultuur"), N(" structureel met elkaar te verbinden, verankert Cito BV dit in de hele organisatie: "), B("we wachten niet op vragen, maar bouwen samen met klanten aan echte oplossingen"),
  N(". Het resultaat is een "), B("onderscheidende, datagedreven organisatie"), N(" die haar klanten "), B("écht kent en begrijpt"), N(", en op basis daarvan "), B("duurzame relaties"), N(" opbouwt, zodat zij "),
  { text: "het verschil maakt in elk ecosysteem", options: { color: C.teal, bold: true } }, N(" waarin zij actief is."),
], { x: 1.4, y: 1.65, w: W - 2.8, h: 5.3, align: "left", valign: "top", fontFace: F, fontSize: 21, lineSpacingMultiple: 1.3 });
s.addNotes("Volledige visietekst (achtergrond voor de presentator):\n\nMet het programma Klant in Zicht maakt Cito BV de beweging van reactief leverancier naar proactieve strategische partner. Vertrekpunt daarbij is een outside-in perspectief: niet wat wij als organisatie te bieden hebben, maar wat klanten werkelijk nodig hebben, bepaalt hoe wij denken en handelen. Door mens, proces, systeem en cultuur structureel met elkaar te verbinden, verankert Cito BV dit in de hele organisatie: we wachten niet op vragen, maar bouwen samen met klanten aan echte oplossingen. Het resultaat is een onderscheidende, datagedreven organisatie die haar klanten écht kent en begrijpt, en op basis daarvan duurzame relaties opbouwt, zodat zij het verschil maakt in elk ecosysteem waarin zij actief is.");

const OUT = "C:\\Users\\pdebu\\Downloads\\Klant-in-Zicht-Medewerkers-bewerkbaar.pptx";
P.writeFile({ fileName: OUT })
  .then((f) => console.log("PPTX (bewerkbaar) geschreven:", f))
  .catch((e) => {
    if (e.code === "EBUSY" || e.code === "EPERM") {
      const alt = OUT.replace(/\.pptx$/, "-" + Date.now() + ".pptx");
      console.warn("Bestand vergrendeld (open in PowerPoint?) — schrijf naar:", alt);
      return P.writeFile({ fileName: alt }).then((f) => console.log("PPTX (bewerkbaar) geschreven:", f));
    }
    console.error("FOUT:", e.code || e.message); process.exit(1);
  });
