// Programmaplan-comments — Word-style aanmerkingen op de publieke leesversie.
// Stuurgroep-leden of baten-eigenaren plaatsen comments op hoofdstuk- of
// paragraaf-niveau. Optioneel verwerken via AI tot een tekstvoorstel.

import { supabase } from "./supabase";

export type CommentScopeType = "chapter" | "paragraph";
export type CommentStatus = "open" | "resolved" | "applied" | "dismissed";

export interface ProgrammaplanComment {
  id: string;
  sessionId: string;
  scopeType: CommentScopeType;
  scopeId: string;
  scopeLabel: string | null;
  body: string;
  authorName: string | null;
  status: CommentStatus;
  aiSuggestion: string | null;
  aiAppliedText: string | null;
  createdAt: string;
  resolvedAt: string | null;
}

interface CommentRow {
  id: string;
  session_id: string;
  scope_type: CommentScopeType;
  scope_id: string;
  scope_label: string | null;
  body: string;
  author_name: string | null;
  status: CommentStatus;
  ai_suggestion: string | null;
  ai_applied_text: string | null;
  created_at: string;
  resolved_at: string | null;
}

function rowToComment(r: CommentRow): ProgrammaplanComment {
  return {
    id: r.id,
    sessionId: r.session_id,
    scopeType: r.scope_type,
    scopeId: r.scope_id,
    scopeLabel: r.scope_label,
    body: r.body,
    authorName: r.author_name,
    status: r.status,
    aiSuggestion: r.ai_suggestion,
    aiAppliedText: r.ai_applied_text,
    createdAt: r.created_at,
    resolvedAt: r.resolved_at,
  };
}

export async function loadComments(sessionId: string): Promise<ProgrammaplanComment[]> {
  if (!supabase) return [];
  const { data, error } = await supabase
    .from("programmaplan_comments")
    .select("*")
    .eq("session_id", sessionId)
    .order("created_at", { ascending: false });
  if (error) {
    console.error("[comments] load failed:", error);
    return [];
  }
  return (data as CommentRow[]).map(rowToComment);
}

export async function createComment(input: {
  sessionId: string;
  scopeType: CommentScopeType;
  scopeId: string;
  scopeLabel: string | null;
  body: string;
  authorName: string | null;
}): Promise<ProgrammaplanComment | null> {
  if (!supabase) return null;
  const { data, error } = await supabase
    .from("programmaplan_comments")
    .insert({
      session_id: input.sessionId,
      scope_type: input.scopeType,
      scope_id: input.scopeId,
      scope_label: input.scopeLabel,
      body: input.body,
      author_name: input.authorName,
    })
    .select("*")
    .single();
  if (error) {
    console.error("[comments] create failed:", error);
    return null;
  }
  return rowToComment(data as CommentRow);
}

export async function updateCommentStatus(
  id: string,
  status: CommentStatus
): Promise<boolean> {
  if (!supabase) return false;
  const patch: Partial<CommentRow> = { status };
  if (status === "resolved" || status === "dismissed" || status === "applied") {
    patch.resolved_at = new Date().toISOString();
  }
  const { error } = await supabase
    .from("programmaplan_comments")
    .update(patch)
    .eq("id", id);
  if (error) {
    console.error("[comments] update status failed:", error);
    return false;
  }
  return true;
}

export async function setAISuggestion(id: string, suggestion: string): Promise<boolean> {
  if (!supabase) return false;
  const { error } = await supabase
    .from("programmaplan_comments")
    .update({ ai_suggestion: suggestion })
    .eq("id", id);
  if (error) {
    console.error("[comments] set AI suggestion failed:", error);
    return false;
  }
  return true;
}

export async function applyAISuggestion(id: string, appliedText: string): Promise<boolean> {
  if (!supabase) return false;
  const { error } = await supabase
    .from("programmaplan_comments")
    .update({
      ai_applied_text: appliedText,
      status: "applied",
      resolved_at: new Date().toISOString(),
    })
    .eq("id", id);
  if (error) {
    console.error("[comments] apply suggestion failed:", error);
    return false;
  }
  return true;
}

export async function deleteComment(id: string): Promise<boolean> {
  if (!supabase) return false;
  const { error } = await supabase
    .from("programmaplan_comments")
    .delete()
    .eq("id", id);
  if (error) {
    console.error("[comments] delete failed:", error);
    return false;
  }
  return true;
}
