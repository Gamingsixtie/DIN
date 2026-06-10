/**
 * Converteer de live presentatie-deck naar PowerPoint.
 * - Rendert elke slide op 1920x1080 met de geïnstalleerde Chrome (puppeteer-core)
 * - Plaatst elke slide full-bleed op een 16:9 .pptx (pptxgenjs)
 *
 * Run:  node scripts/build-presentatie-pptx.cjs
 */
const fs = require("fs");
const path = require("path");
const puppeteer = require("puppeteer-core");
const PptxGen = require("pptxgenjs");

const CHROME = "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe";
const URL =
  "https://din-kappa.vercel.app/programmaplan/d8b97442-ce8f-4134-b2c7-67dc8e3a3f93/presentatie";
const OUT_DIR = path.join(require("os").tmpdir(), "din-slides");
const PPTX = "C:\\Users\\pdebu\\Downloads\\Programmaplan-Klant-in-Beeld.pptx";
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

(async () => {
  if (!fs.existsSync(OUT_DIR)) fs.mkdirSync(OUT_DIR, { recursive: true });
  const browser = await puppeteer.launch({
    executablePath: CHROME,
    headless: "new",
    args: ["--no-sandbox", "--ignore-certificate-errors", "--window-size=1920,1080"],
    defaultViewport: { width: 1920, height: 1080, deviceScaleFactor: 2 },
  });
  const page = await browser.newPage();
  await page.goto(URL, { waitUntil: "networkidle2", timeout: 120000 });

  // Wacht tot de deck geladen is (teller "x / n" verschijnt)
  await page.waitForFunction(
    () => [...document.querySelectorAll("span")].some((e) => /^\d+\s*\/\s*\d+$/.test(e.textContent.trim())),
    { timeout: 60000 }
  );
  const count = await page.evaluate(() => {
    for (const e of document.querySelectorAll("span")) {
      const m = e.textContent.trim().match(/^(\d+)\s*\/\s*(\d+)$/);
      if (m) return parseInt(m[2], 10);
    }
    return 0;
  });
  if (!count) throw new Error("Kon aantal slides niet bepalen");
  console.log("Slides:", count);

  // Full-bleed maken + alle chrome (balk, knoppen, teller) verbergen
  await page.evaluate(() => {
    const card = document.querySelector(".shadow-2xl");
    const wrapper = card.parentElement;
    const root = wrapper.parentElement;
    root.style.background = "#fff";
    wrapper.style.padding = "0";
    wrapper.style.inset = "0";
    card.style.maxWidth = "none";
    card.style.width = "100vw";
    card.style.height = "100vh";
    card.style.borderRadius = "0";
    card.style.boxShadow = "none";
    [...root.children].forEach((ch) => { if (ch !== wrapper) ch.style.display = "none"; });
  });

  await sleep(700);
  const files = [];
  for (let i = 0; i < count; i++) {
    const f = path.join(OUT_DIR, `slide-${String(i + 1).padStart(2, "0")}.png`);
    await page.screenshot({ path: f, clip: { x: 0, y: 0, width: 1920, height: 1080 } });
    files.push(f);
    console.log("captured", i + 1, "/", count);
    if (i < count - 1) { await page.keyboard.press("ArrowRight"); await sleep(450); }
  }
  await browser.close();

  // Bouw de PowerPoint (16:9, elke slide = full-bleed afbeelding)
  const pptx = new PptxGen();
  pptx.defineLayout({ name: "DECK", width: 13.333, height: 7.5 });
  pptx.layout = "DECK";
  for (const f of files) {
    const s = pptx.addSlide();
    s.addImage({ path: f, x: 0, y: 0, w: 13.333, h: 7.5 });
  }
  await pptx.writeFile({ fileName: PPTX });
  console.log("PPTX geschreven:", PPTX);
})().catch((e) => { console.error("FOUT:", e.message); process.exit(1); });
