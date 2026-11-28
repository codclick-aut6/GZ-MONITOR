import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/integrations/supabase/types";
import type { SessionStatus } from "@/lib/whatsapp-types";

/** Await the query: Supabase builders do not execute until awaited. */
export async function acknowledgeSessionRead(
  client: Pick<SupabaseClient<Database>, "from">,
  sessionId: string,
  observedUnread: number,
): Promise<number | null> {
  if (observedUnread <= 0) return null;
  const { data, error } = await client
    .from("whatsapp_sessions")
    .update({ unread_count: 0 })
    .eq("session_id", sessionId)
    // Do not erase messages that arrived after the history fetch started.
    .eq("unread_count", observedUnread)
    .select("unread_count")
    .maybeSingle();

  if (error) throw error;
  return data?.unread_count ?? null;
}

export function contactUnreadCount(
  sessions: ReadonlyArray<{ status: SessionStatus; unread_count: number }>,
): number {
  return sessions.reduce(
    (sum, session) => sum + (session.status === "closed" ? 0 : session.unread_count),
    0,
  );
}

export function sessionStatusPatch(status: SessionStatus, timestamp: string) {
  return {
    status,
    updated_at: timestamp,
    ...(status === "closed" ? { closed_at: timestamp, unread_count: 0 } : {}),
    ...(status === "paused" ? { paused_reason: "human_takeover" } : {}),
    ...(status === "active" ? { paused_reason: null } : {}),
  };
}