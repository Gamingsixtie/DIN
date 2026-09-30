// Zet de 3sides-documenten uit de map "3sides input" in Supabase Storage (public bucket
// "3sides-documenten"), zodat de paginaverwijzingen in stap 11 naar het document op de
// juiste pagina springen. Vereist SUPABASE_SERVICE_ROLE_KEY in .env.local (geheim; nooit
// committen). Gebruik: NODE_OPTIONS=--use-system-ca node scripts/upload-3sides-documenten.cjs [map]

const fs = require("fs");
const path = require("path");
const { createClient } = require("@supabase/supabase-js");

const BUCKET = "3sides-documenten";
const MAP = process.argv[2] || "C:\\Users\\pdebu\\Desktop\\3sides input";

const env = Object.fromEntries(
  fs
    .readFileSync(path.join(__dirname, "..", ".env.local"), "utf8")
    .split(/\r?\n/)
    .filter((l) => l.includes("="))
    .map((l) => [l.slice(0, l.indexOf("=")).trim(), l.slice(l.indexOf("=") + 1).trim().replace(/^"|"$/g, "")])
);
const sleutel = env.SUPABASE_SERVICE_ROLE_KEY;
if (!sleutel) {
  console.error("SUPABASE_SERVICE_ROLE_KEY ontbreekt in .env.local");
  process.exit(1);
}
const sb = createClient(env.NEXT_PUBLIC_SUPABASE_URL, sleutel);
const TYPES = { ".pdf": "application/pdf", ".xlsx": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" };

(async () => {
  const bestaand = await sb.storage.listBuckets();
  if (!(bestaand.data || []).some((b) => b.name === BUCKET)) {
    const c = await sb.storage.createBucket(BUCKET, { public: true, fileSizeLimit: 20 * 1024 * 1024 });
    if (c.error) throw c.error;
    console.log("bucket aangemaakt:", BUCKET);
  }
  const bestanden = fs
    .readdirSync(MAP)
    .filter((f) => !/\(\d+\)/.test(f) && !/^Aantallen besteld/i.test(f) && TYPES[path.extname(f).toLowerCase()]);
  for (const f of bestanden) {
    const inhoud = fs.readFileSync(path.join(MAP, f));
    const r = await sb.storage.from(BUCKET).upload(f, inhoud, { contentType: TYPES[path.extname(f).toLowerCase()], upsert: true });
    console.log(r.error ? "FOUT " + f + ": " + r.error.message : "ok " + f + " (" + inhoud.length + " bytes)");
  }
  const { data } = sb.storage.from(BUCKET).getPublicUrl("Cito_-_Plan_van_Aanpak.pdf");
  console.log("vindplaats (basis):", data.publicUrl.replace(/\/Cito_-_Plan_van_Aanpak\.pdf$/, ""));
})().catch((e) => {
  console.error(e);
  process.exit(1);
});
