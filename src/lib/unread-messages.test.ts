import type { SupabaseClient } from "@supabase/supabase-js";
import { describe, expect, it, vi } from "vitest";
import type { Database } from "@/integrations/supabase/types";
import { acknowledgeSessionRead, contactUnreadCount, sessionStatusPatch } from "./unread-messages";

function database(initialUnread: number, options: { incoming?: number; fail?: boolean } = {}) {
  let storedUnread = initialUnread;
  let executed = false;
  const filters = new Map<string, unknown>();
  const builder = {
    update: vi.fn().mockReturnThis(),
    eq: vi.fn((key: string, value: unknown) => { filters.set(key, value); return builder; }),
    select: vi.fn().mockReturnThis(),
    maybeSingle: vi.fn(() => ({
      then(resolve: (result: unknown) => unknown) {
        executed = true;
        storedUnread += options.incoming ?? 0;
        if (options.fail) return Promise.resolve(resolve({ data: null, error: new Error("Denied") }));
        if (filters.get("unread_count") !== storedUnread) {
          return Promise.resolve(resolve({ data: null, error: null }));
        }
        storedUnread = 0;
        return Promise.resolve(resolve({ data: { unread_count: storedUnread }, error: null }));
      },
    })),
  };
  const client = { from: vi.fn(() => builder) } as unknown as Pick<SupabaseClient<Database>, "from">;
  return { client, builder, filters, reload: () => storedUnread, executed: () => executed };
}

describe("persisted unread badges", () => {
  it("executes the write and keeps read messages at zero after reload", async () => {
    const db = database(5);
    expect(await acknowledgeSessionRead(db.client, "session-1", 5)).toBe(0);
    expect(db.executed()).toBe(true);
    expect(db.reload()).toBe(0);
    expect(db.filters.get("session_id")).toBe("session-1");
    expect(db.builder.update).toHaveBeenCalledWith({ unread_count: 0 });
  });

  it("does not reset messages that arrive while the read is being saved", async () => {
    const db = database(5, { incoming: 1 });
    expect(await acknowledgeSessionRead(db.client, "session-1", 5)).toBeNull();
    expect(db.reload()).toBe(6);
  });

  it("reports a failed save instead of pretending the conversation is read", async () => {
    const db = database(5, { fail: true });
    await expect(acknowledgeSessionRead(db.client, "session-1", 5)).rejects.toThrow("Denied");
    expect(db.reload()).toBe(5);
  });

  it("persists zero together with the closed status", () => {
    expect(sessionStatusPatch("closed", "2026-10-22T21:11:00.000Z")).toEqual({
      status: "closed", closed_at: "2026-10-22T21:11:00.000Z",
      updated_at: "2026-10-22T21:11:00.000Z", unread_count: 0,
    });
  });

  it("excludes closed sessions from the contact unread badge", () => {
    expect(contactUnreadCount([
      { status: "closed", unread_count: 9 },
      { status: "active", unread_count: 2 },
      { status: "paused", unread_count: 1 },
    ])).toBe(3);
  });
});