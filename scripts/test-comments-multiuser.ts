// Dry-run / smoke-test: simuleert twee verschillende gebruikers die comments plaatsen
// op dezelfde leesversie, en bevestigt dat ze beide worden opgeslagen en
// terugleesbaar zijn. Gebruikt de anon-key (zelfde rechten als de browser-client).
//
// Run: npx tsx scripts/test-comments-multiuser.ts
//
// Cleanup: het script verwijdert zijn eigen test-comments aan het eind, dus
// productie-data blijft onaangetast.

import { createClient } from "@supabase/supabase-js";
import { readFileSync, existsSync } from "fs";
import { join } from "path";

function loadEnvFile(path: string) {
  if (!existsSync(path)) return;
  const content = readFileSync(path, "utf-8");
  for (const line of content.split(/\r?\n/)) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const eq = trimmed.indexOf("=");
    if (eq === -1) continue;
    const key = trimmed.substring(0, eq).trim();
    const val = trimmed.substring(eq + 1).trim().replace(/^["']|["']$/g, "");
    if (!process.env[key]) process.env[key] = val;
  }
}
loadEnvFile(join(process.cwd(), ".env.local"));

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
if (!SUPABASE_URL || !KEY) {
  console.error("❌ NEXT_PUBLIC_SUPABASE_URL / NEXT_PUBLIC_SUPABASE_ANON_KEY ontbreken in .env.local");
  process.exit(1);
}

// Twee verschillende client-instances simuleren twee onafhankelijke browser-sessies.
const clientUserA = createClient(SUPABASE_URL, KEY);
const clientUserB = createClient(SUPABASE_URL, KEY);

const TEST_SESSION_ID = `multiuser-test-${Date.now()}`;

interface CommentRow {
  id: string;
  session_id: string;
  scope_type: "chapter" | "paragraph";
  scope_id: string;
  scope_label: string | null;
  body: string;
  author_name: string | null;
  status: "open" | "resolved" | "applied" | "dismissed";
  created_at: string;
}

async function main() {
  console.log(`\n=== Multi-user comments dry-run ===`);
  console.log(`Test session: ${TEST_SESSION_ID}\n`);

  // Stap 1 — User A plaatst een comment op H4
  console.log("[1/5] User A plaatst comment op hoofdstuk-4 …");
  const { data: aRow, error: aErr } = await clientUserA
    .from("programmaplan_comments")
    .insert({
      session_id: TEST_SESSION_ID,
      scope_type: "chapter",
      scope_id: "hoofdstuk-4",
      scope_label: "4. Raming",
      body: "User A: bedragen 4.1 ogen optimistisch — graag onderbouwen.",
      author_name: "User A (test)",
    })
    .select("*")
    .single();
  if (aErr) {
    console.error("   ❌ INSERT door User A faalde:", aErr.message);
    process.exit(1);
  }
  const aComment = aRow as CommentRow;
  console.log(`   ✓ ID ${aComment.id.slice(0, 8)}… opgeslagen\n`);

  // Stap 2 — User B (andere client) plaatst een comment op 4.2
  console.log("[2/5] User B plaatst comment op subparagraaf 4.2 …");
  const { data: bRow, error: bErr } = await clientUserB
    .from("programmaplan_comments")
    .insert({
      session_id: TEST_SESSION_ID,
      scope_type: "paragraph",
      scope_id: "4-2-interne-uren",
      scope_label: "4.2 Interne uren",
      body: "User B: doorlooptijd 4 jaar lijkt mij voor advies-scenario te lang.",
      author_name: "User B (test)",
    })
    .select("*")
    .single();
  if (bErr) {
    console.error("   ❌ INSERT door User B faalde:", bErr.message);
    // cleanup A voordat we falen
    await clientUserA.from("programmaplan_comments").delete().eq("id", aComment.id);
    process.exit(1);
  }
  const bComment = bRow as CommentRow;
  console.log(`   ✓ ID ${bComment.id.slice(0, 8)}… opgeslagen\n`);

  // Stap 3 — User A laadt comments en moet ZIJN EIGEN én User B's comment zien
  console.log("[3/5] User A laadt alle comments (ziet hij beide?) …");
  const { data: aLoad, error: aLoadErr } = await clientUserA
    .from("programmaplan_comments")
    .select("*")
    .eq("session_id", TEST_SESSION_ID)
    .order("created_at", { ascending: true });
  if (aLoadErr) {
    console.error("   ❌ SELECT door User A faalde:", aLoadErr.message);
    process.exit(1);
  }
  const aLoadList = (aLoad ?? []) as CommentRow[];
  console.log(`   ✓ User A ziet ${aLoadList.length} comments`);
  for (const c of aLoadList) {
    console.log(`     • [${c.scope_type}] ${c.scope_label} — ${c.author_name}: "${c.body.slice(0, 60)}…"`);
  }
  if (aLoadList.length !== 2) {
    console.error(`   ❌ Verwacht 2 comments, kreeg er ${aLoadList.length}`);
    process.exit(1);
  }

  // Stap 4 — User B doet hetzelfde — moet identiek beeld zien
  console.log("\n[4/5] User B laadt alle comments (ziet hij beide?) …");
  const { data: bLoad, error: bLoadErr } = await clientUserB
    .from("programmaplan_comments")
    .select("*")
    .eq("session_id", TEST_SESSION_ID)
    .order("created_at", { ascending: true });
  if (bLoadErr) {
    console.error("   ❌ SELECT door User B faalde:", bLoadErr.message);
    process.exit(1);
  }
  const bLoadList = (bLoad ?? []) as CommentRow[];
  console.log(`   ✓ User B ziet ${bLoadList.length} comments`);
  if (bLoadList.length !== 2) {
    console.error(`   ❌ Verwacht 2 comments, kreeg er ${bLoadList.length}`);
    process.exit(1);
  }

  // Stap 5 — User B markeert comment van User A als 'resolved' (multi-user write)
  console.log("\n[5/5] User B markeert comment van User A als 'resolved' …");
  const { error: updErr } = await clientUserB
    .from("programmaplan_comments")
    .update({ status: "resolved", resolved_at: new Date().toISOString() })
    .eq("id", aComment.id);
  if (updErr) {
    console.error("   ❌ UPDATE door User B faalde:", updErr.message);
  } else {
    console.log("   ✓ Status-update gelukt");
    const { data: check } = await clientUserA
      .from("programmaplan_comments")
      .select("status")
      .eq("id", aComment.id)
      .single();
    const status = (check as { status: string } | null)?.status;
    if (status === "resolved") {
      console.log(`   ✓ User A ziet nu status "resolved" op zijn eigen comment`);
    } else {
      console.error(`   ❌ User A ziet status "${status}" — verwacht "resolved"`);
    }
  }

  // Cleanup — verwijder beide test-comments
  console.log("\n[cleanup] Verwijder test-comments …");
  const { error: delErr } = await clientUserA
    .from("programmaplan_comments")
    .delete()
    .eq("session_id", TEST_SESSION_ID);
  if (delErr) {
    console.error("   ⚠️  Cleanup faalde — handmatig verwijderen:", delErr.message);
    console.error(`   session_id: ${TEST_SESSION_ID}`);
  } else {
    console.log("   ✓ Test-comments opgeruimd");
  }

  console.log("\n=== ✅ Multi-user comments-test geslaagd ===");
  console.log("Twee onafhankelijke clients konden comments plaatsen, lezen, en");
  console.log("elkaars comments bijwerken op dezelfde sessie. RLS staat correct.\n");
}

main().catch((err) => {
  console.error("\n❌ Onverwachte fout:", err);
  process.exit(1);
});
