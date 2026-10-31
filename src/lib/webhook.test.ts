import { beforeEach, describe, expect, it, vi } from "vitest";
import { loadWebhookUrl, postToWebhook, type HumanTakeoverPayload } from "./webhook";

const settings = vi.hoisted(() => ({ value: "" }));
vi.mock("@/integrations/supabase/client", () => ({
  supabase: {
    from: () => ({
      select: () => ({
        eq: () => ({ maybeSingle: async () => ({ data: { value: settings.value }, error: null }) }),
      }),
    }),
  },
}));

const payload: HumanTakeoverPayload = {
  event: "human_takeover", contact_phone: "5511000000000", contact_name: "Cliente",
  session_id: "conversation-1", attendant_id: "user-1", name: "Doug",
  timestamp: "2026-10-29T03:17:00.000Z",
};

describe("takeover webhook delivery", () => {
  beforeEach(async () => {
    vi.unstubAllGlobals();
    settings.value = "https://automation.example.test/webhook/attendance";
    await loadWebhookUrl();
  });

  it("posts the takeover event as JSON to the saved webhook without customer message fields", async () => {
    const fetch = vi.fn().mockResolvedValue({ ok: true });
    vi.stubGlobal("fetch", fetch);
    await postToWebhook(payload);
    expect(fetch).toHaveBeenCalledExactlyOnceWith(settings.value, {
      method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload),
    });
    const request = fetch.mock.calls[0];
    if (!request) throw new Error("Expected a webhook request");
    const delivered = JSON.parse(request[1].body);
    expect(delivered.event).toBe("human_takeover");
    expect(delivered.name).toBe("Doug");
    expect(delivered).not.toHaveProperty("message");
    expect(delivered).not.toHaveProperty("message_id");
  });

  it("reports HTTP delivery failures", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue({ ok: false, status: 500 }));
    await expect(postToWebhook(payload)).rejects.toThrow("HTTP 500");
  });

  it("does not silently report delivery when no webhook is configured", async () => {
    settings.value = "";
    await loadWebhookUrl();
    const fetch = vi.fn();
    vi.stubGlobal("fetch", fetch);
    await expect(postToWebhook(payload)).rejects.toThrow();
    expect(fetch).not.toHaveBeenCalled();
  });
});