import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/integrations/supabase/types";
import type { WhatsappMessage, WhatsappSession } from "./whatsapp-types";
import type { HumanTakeoverPayload } from "./webhook";

export interface SessionAssignmentEvent {
  id: string;
  session_id: string;
  event_type: "assignment";
  attendant_id: string | null;
  attendant_name: string;
  created_at: string;
}

export type ConversationHistoryItem =
  | { kind: "message"; value: WhatsappMessage }
  | { kind: "assignment"; value: SessionAssignmentEvent };

export function conversationHistory(
  sessionId: string,
  messages: readonly WhatsappMessage[],
  events: readonly SessionAssignmentEvent[],
): ConversationHistoryItem[] {
  return [
    ...messages.filter((m) => m.session_id === sessionId).map((value) => ({ kind: "message" as const, value })),
    ...events.filter((e) => e.session_id === sessionId).map((value) => ({ kind: "assignment" as const, value })),
  ].sort((a, b) => a.value.created_at.localeCompare(b.value.created_at) || a.value.id.localeCompare(b.value.id));
}

/** The database trigger records the notice atomically; never insert a WhatsApp message here. */
export async function assumeConversation(
  client: Pick<SupabaseClient<Database>, "from">,
  session: WhatsappSession,
  userId: string,
  timestamp: string,
): Promise<boolean> {
  if (session.status === "closed") throw new Error("Esta conversa já foi encerrada.");
  if (session.assigned_to === userId) return false;
  let query = client.from("whatsapp_sessions").update({
    assigned_to: userId,
    status: "paused",
    paused_reason: "human_takeover",
    updated_at: timestamp,
  }).eq("id", session.id).eq("status", session.status);
  query = session.assigned_to
    ? query.eq("assigned_to", session.assigned_to)
    : query.is("assigned_to", null);
  const { data, error } = await query.select("id").maybeSingle();
  if (error) throw new Error("Não foi possível assumir a conversa. Tente novamente.");
  if (!data) throw new Error("A conversa foi alterada por outro atendente. Confira e tente novamente.");
  return true;
}

/** Notify automation only after assignment persists; delivery failure must not undo the claim. */
export async function assumeConversationAndNotify(
  client: Pick<SupabaseClient<Database>, "from">,
  session: WhatsappSession,
  userId: string,
  attendantName: string | null,
  timestamp: string,
  notify: (payload: HumanTakeoverPayload) => Promise<void>,
): Promise<{ assigned: boolean; notificationError: string | null }> {
  const assigned = await assumeConversation(client, session, userId, timestamp);
  if (!assigned) return { assigned: false, notificationError: null };
  try {
    await notify({
      event: "human_takeover",
      contact_phone: session.contact_phone,
      contact_name: session.contact_name,
      session_id: session.session_id,
      attendant_id: userId,
      name: attendantName,
      timestamp,
    });
    return { assigned: true, notificationError: null };
  } catch {
    return {
      assigned: true,
      notificationError: "Conversa assumida, mas não foi possível avisar o n8n. Verifique o webhook em Configurações.",
    };
  }
}