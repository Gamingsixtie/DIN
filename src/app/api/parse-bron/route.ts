// Stap 12 — Bronnenanalyse: platte tekst uit een bron.
// POST in drie vormen:
//  1. multipart/form-data met `file`
//  2. JSON { text, bestandsnaam? }            → type "txt" (of uit bestandsnaam)
//  3. JSON { url, bestandsnaam? }             → server-side ophalen, ALLEEN uit de eigen
//     Supabase-buckets sessie-documenten en 3sides-documenten (SSRF-guard, geen redirects).
// Antwoord: ParseBronResponse (bronnenanalyse-service). De tekst wordt niet opgeslagen en
// niet gelogd (alleen lengtes en foutmeldingen).

import { NextResponse } from "next/server";
import mammoth from "mammoth";
import {
  BRONTEKST_MAX,
  bronTypeUitBestandsnaam,
  type ParseBronResponse,
  type ParseFoutCode,
} from "@/lib/bronnenanalyse-service";
import { xlsxNaarTekst, pptxNaarTekst } from "@/lib/ooxml-tekst";
import type { BronType } from "@/lib/schemas";

export const runtime = "nodejs";
export const maxDuration = 60;

const MAX_MB = 25;
const MAX_BYTES = MAX_MB * 1024 * 1024;
const TOEGESTANE_BUCKETS = ["sessie-documenten", "3sides-documenten"];

function fout(code: ParseFoutCode, error: string, status: number) {
  const body: ParseBronResponse = { success: false, error, code };
  return NextResponse.json(body, { status });
}

/** Is de url een publiek object in één van de eigen buckets? */
function urlToegestaan(ruw: string): URL | null {
  const basis = (process.env.NEXT_PUBLIC_SUPABASE_URL ?? "").trim();
  if (!basis) return null;
  let doel: URL;
  let eigen: URL;
  try {
    doel = new URL(ruw);
    eigen = new URL(basis);
  } catch {
    return null;
  }
  if (doel.protocol !== "https:" && doel.protocol !== "http:") return null;
  if (doel.origin !== eigen.origin) return null;
  if (doel.username || doel.password) return null;
  // pad-traversal ("..") uitsluiten vóór de prefixvergelijking
  let pad: string;
  try {
    pad = decodeURIComponent(doel.pathname);
  } catch {
    return null;
  }
  if (/(^|\/)\.\.(\/|$)/.test(pad) || pad.includes("\\")) return null;
  const ok = TOEGESTANE_BUCKETS.some((b) => doel.pathname.startsWith(`/storage/v1/object/public/${b}/`));
  return ok ? doel : null;
}

function naamUitUrl(u: URL): string {
  const laatste = u.pathname.split("/").filter(Boolean).pop() ?? "";
  try {
    return decodeURIComponent(laatste);
  } catch {
    return laatste;
  }
}

/** Html-tags weghalen, blokelementen als regelovergang. */
function htmlNaarTekst(html: string): string {
  return html
    .replace(/<(script|style|head)\b[\s\S]*?<\/\1>/gi, "")
    .replace(/<br\s*\/?>/gi, "\n")
    .replace(/<\/(p|div|li|tr|h[1-6]|section|article)>/gi, "\n")
    .replace(/<[^>]+>/g, "")
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;|&apos;/g, "'")
    .replace(/[ \t]+\n/g, "\n")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

/** Leest een response-body met een hard maximum (ook zonder content-length). */
async function leesMetMaximum(res: Response): Promise<Buffer | null> {
  const lengte = Number(res.headers.get("content-length") ?? "0");
  if (lengte > MAX_BYTES) return null;
  if (!res.body) return Buffer.from(await res.arrayBuffer());
  const reader = res.body.getReader();
  const stukken: Uint8Array[] = [];
  let totaal = 0;
  for (;;) {
    const { done, value } = await reader.read();
    if (done) break;
    totaal += value.byteLength;
    if (totaal > MAX_BYTES) {
      await reader.cancel().catch(() => {});
      return null;
    }
    stukken.push(value);
  }
  return Buffer.concat(stukken);
}

const ONBEKEND_MELDING =
  "Dit bestandstype kan niet gelezen worden. Gebruik 'Plak tekst' (bijv. voor Outlook-berichten)";

async function bufferNaarTekst(type: BronType, buffer: Buffer): Promise<string | null> {
  switch (type) {
    case "pdf": {
      // Dynamische import via /lib/pdf-parse.js om de debug-test-file
      // bug van pdf-parse's index.js bij bundling te vermijden.
      const pdfParseMod = (await import(
        // @ts-expect-error - pdf-parse heeft geen types voor submodule path
        "pdf-parse/lib/pdf-parse.js"
      )) as { default: (buf: Buffer) => Promise<{ text: string }> };
      const pdfData = await pdfParseMod.default(buffer);
      return pdfData.text;
    }
    case "docx":
    case "doc": {
      const result = await mammoth.extractRawText({ buffer });
      return result.value;
    }
    case "txt":
    case "md":
    case "eml":
      return buffer.toString("utf-8");
    case "html":
      return htmlNaarTekst(buffer.toString("utf-8"));
    case "xlsx":
      return xlsxNaarTekst(buffer);
    case "pptx":
      return pptxNaarTekst(buffer);
    default:
      return null;
  }
}

export async function POST(request: Request) {
  try {
    const contentType = request.headers.get("content-type") ?? "";
    let type: BronType;
    let rawText: string | null = null;

    if (contentType.includes("multipart/form-data")) {
      const formData = await request.formData();
      const file = formData.get("file");
      if (!file || typeof file === "string") {
        return fout("geen_invoer", "Er is geen bestand meegestuurd.", 400);
      }
      if (file.size > MAX_BYTES) {
        return fout("te_groot", `Het bestand is groter dan ${MAX_MB} MB.`, 413);
      }
      type = bronTypeUitBestandsnaam(file.name ?? "");
      if (["msg", "miro", "audio_video", "anders"].includes(type)) {
        return fout("onbekend_type", ONBEKEND_MELDING, 422);
      }
      rawText = await bufferNaarTekst(type, Buffer.from(await file.arrayBuffer()));
    } else {
      let body: { text?: unknown; url?: unknown; bestandsnaam?: unknown };
      try {
        body = await request.json();
      } catch {
        return fout("geen_invoer", "Ongeldige invoer: stuur een bestand, tekst of url mee.", 400);
      }
      const bestandsnaam = typeof body.bestandsnaam === "string" ? body.bestandsnaam : "";

      if (typeof body.text === "string") {
        if (body.text.trim().length === 0) {
          return fout("geen_invoer", "De geplakte tekst is leeg.", 400);
        }
        const uitNaam = bestandsnaam ? bronTypeUitBestandsnaam(bestandsnaam) : "txt";
        type = uitNaam === "md" || uitNaam === "eml" || uitNaam === "msg" ? uitNaam : "txt";
        rawText = body.text;
      } else if (typeof body.url === "string" && body.url.trim()) {
        const doel = urlToegestaan(body.url.trim());
        if (!doel) {
          return fout(
            "url_niet_toegestaan",
            "Deze url wordt niet opgehaald: alleen bestanden uit de eigen documentopslag (sessie-documenten of 3sides-documenten) zijn toegestaan.",
            400,
          );
        }
        type = bronTypeUitBestandsnaam(bestandsnaam || naamUitUrl(doel));
        if (["msg", "miro", "audio_video", "anders"].includes(type)) {
          return fout("onbekend_type", ONBEKEND_MELDING, 422);
        }
        const res = await fetch(doel.toString(), { redirect: "error", cache: "no-store" });
        if (!res.ok) {
          console.error(`[parse-bron] ophalen mislukt: HTTP ${res.status}`);
          return fout("parse_fout", `Het bestand kon niet worden opgehaald (HTTP ${res.status}).`, 422);
        }
        const buffer = await leesMetMaximum(res);
        if (!buffer) return fout("te_groot", `Het bestand is groter dan ${MAX_MB} MB.`, 413);
        rawText = await bufferNaarTekst(type, buffer);
      } else {
        return fout("geen_invoer", "Stuur een bestand, tekst of url mee.", 400);
      }
    }

    if (rawText === null) {
      return fout("onbekend_type", ONBEKEND_MELDING, 422);
    }
    const schoon = rawText.replace(/\r\n/g, "\n").replace(/\u0000/g, "");
    if (schoon.trim().length === 0) {
      return fout("parse_fout", "In deze bron is geen leesbare tekst gevonden (bijv. een gescande pdf).", 422);
    }
    const afgekapt = schoon.length > BRONTEKST_MAX;
    const tekst = afgekapt ? schoon.slice(0, BRONTEKST_MAX) : schoon;
    const body: ParseBronResponse = { success: true, rawText: tekst, tekens: tekst.length, afgekapt, type };
    return NextResponse.json(body, { status: 200 });
  } catch (error) {
    console.error("[parse-bron] fout bij lezen:", error instanceof Error ? error.message : error);
    return fout(
      "parse_fout",
      "De bron kon niet gelezen worden. Controleer of het bestand niet beschadigd of beveiligd is, of gebruik 'Plak tekst'.",
      422,
    );
  }
}
