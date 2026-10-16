// Upload van een document door het team (stap 11, tabblad Documenten) naar Supabase Storage,
// bucket "sessie-documenten" (publiek lezen, alleen de server schrijft). De service-role
// sleutel staat alleen op de server (.env.local / Vercel), nooit in de browser.
// POST multipart/form-data: file, sessionId. Antwoord: { success, data: { pad, url, grootte, type } }.
// DELETE ?pad=…: verwijdert het bestand (alleen binnen de map van die sessie).

import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

export const runtime = "nodejs";
export const maxDuration = 60;

const BUCKET = "sessie-documenten";
const MAX_MB = 25;

function server() {
  const url = (process.env.NEXT_PUBLIC_SUPABASE_URL ?? "").trim();
  const key = (process.env.SUPABASE_SERVICE_ROLE_KEY ?? "").trim();
  if (!url || !key) return null;
  return createClient(url, key, { auth: { persistSession: false } });
}

/** Veilige bestandsnaam: letters, cijfers, punt, streepje en underscore. */
function veilig(naam: string): string {
  return naam
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^A-Za-z0-9._-]+/g, "_")
    .replace(/_+/g, "_")
    .slice(0, 120);
}

async function zorgBucket(client: NonNullable<ReturnType<typeof server>>) {
  const { data } = await client.storage.getBucket(BUCKET);
  if (data) return;
  await client.storage.createBucket(BUCKET, { public: true, fileSizeLimit: MAX_MB * 1024 * 1024 });
}

export async function POST(req: Request) {
  try {
    const client = server();
    if (!client) {
      return NextResponse.json({ success: false, error: "Uploaden is niet ingesteld op de server (SUPABASE_SERVICE_ROLE_KEY ontbreekt)." }, { status: 503 });
    }
    const form = await req.formData();
    const file = form.get("file");
    const sessionId = String(form.get("sessionId") ?? "").trim();
    if (!(file instanceof File) || !sessionId || !/^[A-Za-z0-9-]+$/.test(sessionId)) {
      return NextResponse.json({ success: false, error: "Geen bestand of ongeldige sessie." }, { status: 400 });
    }
    if (file.size > MAX_MB * 1024 * 1024) {
      return NextResponse.json({ success: false, error: `Bestand is groter dan ${MAX_MB} MB.` }, { status: 413 });
    }
    await zorgBucket(client);
    const id = crypto.randomUUID().slice(0, 8);
    const pad = `${sessionId}/${id}-${veilig(file.name) || "document"}`;
    const bytes = Buffer.from(await file.arrayBuffer());
    const { error } = await client.storage.from(BUCKET).upload(pad, bytes, {
      contentType: file.type || "application/octet-stream",
      upsert: false,
    });
    if (error) return NextResponse.json({ success: false, error: error.message }, { status: 500 });
    const { data } = client.storage.from(BUCKET).getPublicUrl(pad);
    return NextResponse.json({ success: true, data: { pad, url: data.publicUrl, grootte: file.size, type: file.type || "" } });
  } catch (e) {
    return NextResponse.json({ success: false, error: e instanceof Error ? e.message : "Uploaden mislukt." }, { status: 500 });
  }
}

export async function DELETE(req: Request) {
  try {
    const client = server();
    if (!client) return NextResponse.json({ success: false, error: "Niet ingesteld op de server." }, { status: 503 });
    const pad = new URL(req.url).searchParams.get("pad") ?? "";
    if (!/^[A-Za-z0-9-]+\/[A-Za-z0-9._-]+$/.test(pad)) {
      return NextResponse.json({ success: false, error: "Ongeldig pad." }, { status: 400 });
    }
    const { error } = await client.storage.from(BUCKET).remove([pad]);
    if (error) return NextResponse.json({ success: false, error: error.message }, { status: 500 });
    return NextResponse.json({ success: true });
  } catch (e) {
    return NextResponse.json({ success: false, error: e instanceof Error ? e.message : "Verwijderen mislukt." }, { status: 500 });
  }
}
