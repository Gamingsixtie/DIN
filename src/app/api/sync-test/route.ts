import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

export async function GET() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!url || !key) {
    return NextResponse.json({ error: "Supabase niet geconfigureerd", url: !!url, key: !!key });
  }

  const supabase = createClient(url, key);
  const results: Record<string, unknown> = {};

  // 1. Test read
  try {
    const { data, error } = await supabase
      .from("din_sessions")
      .select("id, name, updated_at")
      .limit(10);
    results.read = error ? { error: error.message, code: error.code } : { count: data?.length, sessions: data };
  } catch (e) {
    results.read = { error: String(e) };
  }

  // 2. Test of sessie efforts heeft
  try {
    const { data } = await supabase.from("din_sessions").select("id, data").limit(10);
    if (data) {
      results.sessionDetails = data.map((s: { id: string; data: Record<string, unknown> }) => ({
        id: s.id,
        name: (s.data as Record<string, unknown>)?.name,
        effortCount: Array.isArray((s.data as Record<string, unknown>)?.efforts) ? ((s.data as Record<string, unknown>).efforts as unknown[]).length : 0,
        benefitCount: Array.isArray((s.data as Record<string, unknown>)?.benefits) ? ((s.data as Record<string, unknown>).benefits as unknown[]).length : 0,
        capabilityCount: Array.isArray((s.data as Record<string, unknown>)?.capabilities) ? ((s.data as Record<string, unknown>).capabilities as unknown[]).length : 0,
        version: (s.data as Record<string, unknown>)?.version,
      }));
    }
  } catch (e) {
    results.sessionDetails = { error: String(e) };
  }

  // 3. Test write (upsert een test-record, dan verwijderen)
  const testId = "test-sync-" + Date.now();
  try {
    const { error: writeError } = await supabase
      .from("din_sessions")
      .upsert({ id: testId, name: "sync-test", data: { test: true }, updated_at: new Date().toISOString() }, { onConflict: "id" });

    if (writeError) {
      results.write = { error: writeError.message, code: writeError.code, hint: writeError.hint, details: writeError.details };
    } else {
      results.write = { success: true };
      // Cleanup
      await supabase.from("din_sessions").delete().eq("id", testId);
    }
  } catch (e) {
    results.write = { error: String(e) };
  }

  return NextResponse.json(results);
}
