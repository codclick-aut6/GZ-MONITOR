export type SessionStatus = "active" | "paused" | "closed";

export interface WhatsappSession {
  id: string;
  session_id: string;
  contact_phone: string;
  contact_name: string | null;
  status: SessionStatus;
  paused_reason: string | null;
  created_at: string;
  updated_at: string;
  closed_at: string | null;
  assigned_to: string | null;
  unread_count: number;
}

export type SenderType = "contact" | "ai" | "human";

export interface WhatsappMessage {
  id: string;
  session_id: string;
  contact_phone: string;
  sender_type: SenderType;
  sender_user_id: string | null;
  content: string;
  metadata: Record<string, unknown>;
  created_at: string;
}

export const STATUS_LABEL: Record<SessionStatus, string> = {
  active: "Ativo",
  paused: "Pausado",
  closed: "Encerrado",
};

export const SENDER_LABEL: Record<SenderType, string> = {
  contact: "Cliente",
  ai: "IA",
  human: "Atendente",
};
