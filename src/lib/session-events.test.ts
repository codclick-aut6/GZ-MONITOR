import type { SupabaseClient } from "@supabase/supabase-js";
import { describe, expect, it, vi } from "vitest";
import type { Database } from "@/integrations/supabase/types";
import type { WhatsappMessage, WhatsappSession } from "./whatsapp-types";
import { assumeConversation, assumeConversationAndNotify, conversationHistory, type SessionAssignmentEvent } from "./session-events";

const timestamp = "2026-10-26T12:54:00.000Z";
const session: WhatsappSession = {
  id: "session-row", session_id: "conversation-1", contact_phone: "5511000000000",
  contact_name: "Test contact", status: "active", paused_reason: null,
  created_at: timestamp, updated_at: timestamp, closed_at: null, assigned_to: null, unread_count: 5,
};

function database(result: { data: { id: string } | null; error: Error | null }) {
  const query = {
    update: vi.fn().mockReturnThis(), eq: vi.fn().mockReturnThis(), is: vi.fn().mockReturnThis(),
    select: vi.fn().mockReturnThis(), maybeSingle: vi.fn().mockResolvedValue(result),
  };
  const from = vi.fn(() => query);
  return { client: { from } as unknown as Pick<SupabaseClient<Database>, "from">, from, query };
}

describe("internal assignment persistence", () => {
  it("assigns only the selected conversation without creating a WhatsApp message or altering unread counts", async () => {
    const db = database({ data: { id: session.id }, error: null });
    await assumeConversation(db.client, session, "user-1", timestamp);
    expect(db.from.mock.calls).toEqual([["whatsapp_sessions"]]);
    expect(db.query.update).toHaveBeenCalledWith({ assigned_to: "user-1", status: "paused", paused_reason: "human_takeover", updated_at: timestamp });
    expect(db.query.eq).toHaveBeenCalledWith("id", "session-row");
    expect(db.query.eq).toHaveBeenCalledWith("status", "active");
    expect(db.query.is).toHaveBeenCalledWith("assigned_to", null);
  });

  it("does not record another assignment when the same user already owns the conversation", async () => {
    const db = database({ data: { id: session.id }, error: null });
    await assumeConversation(db.client, { ...session, assigned_to: "user-1" }, "user-1", timestamp);
    expect(db.from).not.toHaveBeenCalled();
  });

  it("rejects closed conversations without writing an assignment", async () => {
    const db = database({ data: null, error: null });
    await expect(assumeConversation(db.client, { ...session, status: "closed" }, "user-1", timestamp)).rejects.toThrow();
    expect(db.from).not.toHaveBeenCalled();
  });

  it("checks the previous attendant before a transfer", async () => {
    const db = database({ data: { id: session.id }, error: null });
    await assumeConversation(db.client, { ...session, assigned_to: "user-2" }, "user-1", timestamp);
    expect(db.query.eq).toHaveBeenCalledWith("assigned_to", "user-2");
    expect(db.query.is).not.toHaveBeenCalled();
  });

  it("does not report success if another attendant changed the conversation", async () => {
    const db = database({ data: null, error: null });
    await expect(assumeConversation(db.client, session, "user-1", timestamp)).rejects.toThrow();
    expect(db.query.maybeSingle).toHaveBeenCalledOnce();
  });

  it("reports a failed save", async () => {
    const db = database({ data: null, error: new Error("Denied") });
    await expect(assumeConversation(db.client, session, "user-1", timestamp)).rejects.toThrow();
  });
});

describe("human takeover webhook", () => {
  it("sends human_takeover with the claiming attendant's name and contact only after assignment persists", async () => {
    const db = database({ data: { id: session.id }, error: null });
    const notify = vi.fn().mockResolvedValue(undefined);
    const result = await assumeConversationAndNotify(db.client, session, "user-1", "Doug", timestamp, notify);
    expect(result).toEqual({ assigned: true, notificationError: null });
    expect(notify).toHaveBeenCalledExactlyOnceWith({
      event: "human_takeover", contact_phone: "5511000000000", contact_name: "Test contact",
      session_id: "conversation-1", attendant_id: "user-1", name: "Doug", timestamp,
    });
    const writeOrder = db.query.maybeSingle.mock.invocationCallOrder[0];
    const notificationOrder = notify.mock.invocationCallOrder[0];
    if (writeOrder === undefined || notificationOrder === undefined) throw new Error("Expected both assignment and notification");
    expect(writeOrder).toBeLessThan(notificationOrder);
    expect(db.from.mock.calls).toEqual([["whatsapp_sessions"]]);
  });

  it("waits for a pending database write before notifying n8n", async () => {
    const db = database({ data: { id: session.id }, error: null });
    let completeWrite: ((result: { data: { id: string }; error: null }) => void) | undefined;
    db.query.maybeSingle.mockImplementation(() => new Promise((resolve) => { completeWrite = resolve; }));
    const notify = vi.fn().mockResolvedValue(undefined);
    const pending = assumeConversationAndNotify(db.client, session, "user-1", "Doug", timestamp, notify);
    expect(notify).not.toHaveBeenCalled();
    if (!completeWrite) throw new Error("Expected a pending assignment write");
    completeWrite({ data: { id: session.id }, error: null });
    await pending;
    expect(notify).toHaveBeenCalledOnce();
  });

  it("does not notify n8n for an unchanged assignment", async () => {
    const db = database({ data: { id: session.id }, error: null });
    const notify = vi.fn();
    expect(await assumeConversationAndNotify(db.client, { ...session, assigned_to: "user-1" }, "user-1", "Doug", timestamp, notify))
      .toEqual({ assigned: false, notificationError: null });
    expect(notify).not.toHaveBeenCalled();
    expect(db.from).not.toHaveBeenCalled();
  });

  it.each([
    ["a stale claim", session, { data: null, error: null }],
    ["a rejected save", session, { data: null, error: new Error("Denied") }],
    ["a closed session", { ...session, status: "closed" as const }, { data: null, error: null }],
  ])("does not notify n8n for %s", async (_label, currentSession, result) => {
    const db = database(result);
    const notify = vi.fn();
    await expect(assumeConversationAndNotify(db.client, currentSession, "user-1", "Doug", timestamp, notify)).rejects.toThrow();
    expect(notify).not.toHaveBeenCalled();
  });

  it("keeps the successful assignment and reports a webhook failure without creating a WhatsApp message", async () => {
    const db = database({ data: { id: session.id }, error: null });
    const notify = vi.fn().mockRejectedValue(new Error("HTTP 500"));
    const result = await assumeConversationAndNotify(db.client, session, "user-1", "Doug", timestamp, notify);
    expect(result.assigned).toBe(true);
    expect(result.notificationError).not.toBeNull();
    expect(db.query.update).toHaveBeenCalledOnce();
    expect(db.from.mock.calls).toEqual([["whatsapp_sessions"]]);
    expect(notify).toHaveBeenCalledOnce();
  });
});

describe("conversation history", () => {
  it("keeps internal events in chronological order and only in their corresponding conversation", () => {
    const message: WhatsappMessage = { id: "message-1", session_id: session.session_id, contact_phone: session.contact_phone, sender_type: "human", sender_user_id: null, content: "Hello", metadata: {}, created_at: "2026-10-26T12:53:00.000Z" };
    const event: SessionAssignmentEvent = { id: "event-1", session_id: session.session_id, event_type: "assignment", attendant_id: "user-1", attendant_name: "Test user", created_at: timestamp };
    const history = conversationHistory(session.session_id, [message], [event, { ...event, id: "event-other", session_id: "other-session" }]);
    expect(history.map((item) => [item.kind, item.value.id])).toEqual([["message", "message-1"], ["assignment", "event-1"]]);
    expect(conversationHistory("other-session", [message], [event])).toEqual([]);
  });
});