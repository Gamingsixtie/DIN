import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

export async function GET(request: Request) {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!url || !key) {
    return NextResponse.json({ error: "Supabase niet geconfigureerd" });
  }

  const supabase = createClient(url, key);
  const { searchParams } = new URL(request.url);
  const sessionId = searchParams.get("session") || "d8b97442-ce8f-4134-b2c7-67dc8e3a3f93";
  const results: Record<string, unknown> = {};

  // 1. Lees huidige sessie
  try {
    const { data, error } = await supabase
      .from("din_sessions")
      .select("id, name, data, updated_at")
      .eq("id", sessionId)
      .single();

    if (error) {
      results.read = { error: error.message, code: error.code };
    } else {
      const session = data.data as Record<string, unknown>;
      results.read = {
        name: session?.name,
        version: session?.version,
        effortCount: Array.isArray(session?.efforts) ? (session.efforts as unknown[]).length : 0,
        benefitCount: Array.isArray(session?.benefits) ? (session.benefits as unknown[]).length : 0,
        capabilityCount: Array.isArray(session?.capabilities) ? (session.capabilities as unknown[]).length : 0,
        goalCount: Array.isArray(session?.goals) ? (session.goals as unknown[]).length : 0,
        updatedAt: session?.updatedAt,
        dbUpdatedAt: data.updated_at,
      };
    }
  } catch (e) {
    results.read = { error: String(e) };
  }

  // 2. Test write — update echte sessie met timestamp marker
  try {
    // Lees eerst de huidige data
    const { data: current } = await supabase
      .from("din_sessions")
      .select("data")
      .eq("id", sessionId)
      .single();

    if (current?.data) {
      const session = current.data as Record<string, unknown>;
      const oldVersion = (session.version as number) || 0;
      const newVersion = oldVersion + 1;

      const { error: writeError } = await supabase
        .from("din_sessions")
        .upsert({
          id: sessionId,
          name: session.name as string,
          data: { ...session, version: newVersion, _syncTest: new Date().toISOString() },
          updated_at: new Date().toISOString(),
        }, { onConflict: "id" });

      if (writeError) {
        results.write = { error: writeError.message, code: writeError.code, hint: writeError.hint };
      } else {
        results.write = { success: true, oldVersion, newVersion };
      }
    }
  } catch (e) {
    results.write = { error: String(e) };
  }

  // 3. Verify — lees opnieuw
  try {
    const { data } = await supabase
      .from("din_sessions")
      .select("data")
      .eq("id", sessionId)
      .single();
    const session = data?.data as Record<string, unknown>;
    results.verify = {
      version: session?.version,
      syncTestMarker: session?._syncTest,
    };
  } catch (e) {
    results.verify = { error: String(e) };
  }

  return NextResponse.json(results, { headers: { "Cache-Control": "no-store" } });
}
