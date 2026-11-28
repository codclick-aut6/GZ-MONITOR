import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/integrations/supabase/types";
import { SENDER_LABEL, type WhatsappMessage } from "./whatsapp-types";

type Sender = { sender_type: string; sender_user_id?: string | null };

export function isAttendantMessage(message: Sender): boolean {
  return message.sender_type === "attendant" || message.sender_type === "human";
}

export function isClientMessage(message: Sender): boolean {
  return message.sender_type === "client" || message.sender_type === "contact";
}

export function messageSenderLabel(message: WhatsappMessage, profiles: Readonly<Record<string, string>>): string {
  if (message.sender_type === "human") return SENDER_LABEL.human;
  if (isClientMessage(message)) return SENDER_LABEL.client;
  if (isAttendantMessage(message)) {
    return message.sender_name?.trim() || (message.sender_user_id ? profiles[message.sender_user_id] : null) || SENDER_LABEL.attendant;
  }
  return SENDER_LABEL[message.sender_type];
}

/** Database trigger derives the sender's identity and name from the authenticated session. */
export async function persistAttendantMessage(
  client: Pick<SupabaseClient<Database>, "from">,
  session: { session_id: string; contact_phone: string },
  content: string,
) {
  const { data, error } = await client.from("whatsapp_messages").insert({
    session_id: session.session_id, contact_phone: session.contact_phone,
    sender_type: "attendant", content,
  }).select("id, sender_user_id, sender_name, created_at").single();
  if (error || !data) throw new Error("Não foi possível registrar a mensagem. Tente novamente.");
  return data;
}