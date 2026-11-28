import { describe, expect, it, vi } from "vitest";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/integrations/supabase/types";
import type { WhatsappMessage } from "./whatsapp-types";
import { isAttendantMessage, isClientMessage, messageSenderLabel, persistAttendantMessage } from "./message-senders";

const message: WhatsappMessage = {
  id: "message-1", session_id: "session-1", contact_phone: "5511000000000",
  sender_type: "attendant", sender_user_id: "user-1", sender_name: "Doug",
  content: "Olá", metadata: {}, created_at: "2026-11-28T11:05:00Z",
};

describe("message sender identity", () => {
  it("classifies attendant as a team message, not a client", () => {
    expect(isAttendantMessage(message)).toBe(true);
    expect(isClientMessage(message)).toBe(false);
  });
  it("preserves the sender name after a profile changes or disappears", () => {
    expect(messageSenderLabel(message, { "user-1": "Novo nome" })).toBe("Doug");
    expect(messageSenderLabel(message, {})).toBe("Doug");
  });
  it.each([null, "user-1"])("classifies phone replies as human intervention with sender_user_id %s", (sender_user_id) => {
    const phone = { ...message, sender_type: "human" as const, sender_user_id };
    expect(isAttendantMessage(phone)).toBe(true);
    expect(isClientMessage(phone)).toBe(false);
  });
  it.each(["client", "contact"])("preserves %s without an account as a client", (sender_type) => {
    const incoming = { sender_type, sender_user_id: null };
    expect(isClientMessage(incoming)).toBe(true);
    expect(isAttendantMessage(incoming)).toBe(false);
  });
  it.each(["ai", "system"])("does not treat %s as a client or attendant", (sender_type) => {
    expect(isClientMessage({ sender_type })).toBe(false);
    expect(isAttendantMessage({ sender_type })).toBe(false);
  });
});

describe("attendant message persistence", () => {
  function database(error: Error | null = null) {
    const saved = { id: message.id, sender_user_id: "user-1", sender_name: "Doug", created_at: message.created_at };
    const query = { insert: vi.fn().mockReturnThis(), select: vi.fn().mockReturnThis(), single: vi.fn().mockResolvedValue({ data: error ? null : saved, error }) };
    const from = vi.fn(() => query);
    return { query, saved, client: { from } as unknown as Pick<SupabaseClient<Database>, "from"> };
  }
  it("stores attendant and reads the authenticated identity back instead of supplying a name", async () => {
    const db = database();
    expect(await persistAttendantMessage(db.client, message, "Olá")).toEqual(db.saved);
    expect(db.query.insert).toHaveBeenCalledWith({ session_id: "session-1", contact_phone: "5511000000000", sender_type: "attendant", content: "Olá" });
    expect(db.query.single).toHaveBeenCalledOnce();
  });
  it("rejects failed persistence so the message is not reported as saved", async () => {
    const db = database(new Error("Denied"));
    await expect(persistAttendantMessage(db.client, message, "Olá")).rejects.toThrow("Não foi possível registrar");
  });
});