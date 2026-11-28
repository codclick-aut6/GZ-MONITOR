import { isAttendantMessage, isClientMessage } from "./message-senders";

export type AuditOutcome = "all" | "human" | "ai_only";
export interface AuditSession { session_id: string; contact_name: string | null; created_at: string; paused_reason: string | null; assigned_to: string | null }
export interface AuditMessage { session_id: string; sender_type: string; sender_user_id?: string | null; sender_name?: string | null; content: string; metadata: { type?: string } | null; created_at: string }

const TAG: Record<string, string> = { ai: "IA", system: "SYS" };

export function wasHumanSession(s: AuditSession, msgs: readonly AuditMessage[]) {
  return s.paused_reason === "waiting_attendant" || s.paused_reason === "human_takeover" || !!s.assigned_to || msgs.some(isAttendantMessage);
}

function mediaLabel(meta: unknown) {
  const t = meta && typeof meta === "object" ? (meta as Record<string, unknown>)["type"] : undefined;
  return typeof t === "string" && t !== "text" ? `[${t}] ` : "";
}

/** Compact plain-text transcript: one line per message, consecutive same-sender lines merged. */
export function condenseConversations(sessions: readonly AuditSession[], messages: readonly AuditMessage[], outcome: AuditOutcome, limit: number) {
  const bySession = new Map<string, AuditMessage[]>();
  for (const m of messages) {
    const list = bySession.get(m.session_id) ?? [];
    list.push(m);
    bySession.set(m.session_id, list);
  }
  const blocks: string[] = [];
  let count = 0, total = 0;
  for (const s of sessions) {
    if (count >= limit) break;
    const msgs = (bySession.get(s.session_id) ?? []).slice().sort((a, b) => a.created_at.localeCompare(b.created_at));
    if (!msgs.length) continue;
    const human = wasHumanSession(s, msgs);
    if ((outcome === "human" && !human) || (outcome === "ai_only" && human)) continue;
    const lines: string[] = [];
    let last = "";
    for (const m of msgs) {
      const text = (mediaLabel(m.metadata) + m.content.replace(/\s+/g, " ").trim()).trim();
      if (!text) continue;
      const tag = isClientMessage(m) ? "C" : m.sender_type === "human" ? "AT (Celular)" : isAttendantMessage(m) ? `AT${m.sender_name ? ` (${m.sender_name})` : ""}` : TAG[m.sender_type] ?? m.sender_type;
      if (tag === last) lines[lines.length - 1] += ` / ${text}`;
      else lines.push(`${tag}: ${text}`);
      last = tag; total++;
    }
    const d = new Date(s.created_at);
    const stamp = `${String(d.getDate()).padStart(2, "0")}/${String(d.getMonth() + 1).padStart(2, "0")} ${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`;
    count++;
    blocks.push(`#${count} ${stamp}${human ? " [pediu atendente]" : ""}\n${lines.join("\n")}`);
  }
  const text = `Legenda: C=cliente, IA=agente, AT=atendente humano\n\n${blocks.join("\n\n")}`;
  return { text, sessions: count, messages: total, tokens: Math.ceil(text.length / 4) };
}
