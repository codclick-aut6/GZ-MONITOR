import { describe, expect, it } from "vitest";
import { condenseConversations, wasHumanSession } from "./ai-audit";
const s = (id: string, reason: string | null = null) => ({ session_id: id, contact_name: null, created_at: "2026-11-20T10:00:00Z", paused_reason: reason, assigned_to: null });
const m = (sid: string, t: string, c: string, at: string) => ({ session_id: sid, sender_type: t, content: c, metadata: {}, created_at: at });
const msgs = [m("a", "contact", "oi", "1"), m("a", "contact", "quero pizza", "2"), m("a", "ai", "claro", "3"), m("b", "contact", "atendente", "1")];
describe("condenseConversations", () => {
  it("merges consecutive messages from the same sender", () => {
    expect(condenseConversations([s("a")], msgs, "all", 10).text).toContain("C: oi / quero pizza\nIA: claro");
  });
  it("filters only sessions that asked for an attendant", () => {
    expect(condenseConversations([s("a"), s("b", "human_takeover")], msgs, "human", 10).sessions).toBe(1);
  });
  it("counts waiting_attendant requests in human audit without an assignment or reply", () => {
    expect(wasHumanSession(s("b", "waiting_attendant"), [])).toBe(true);
    expect(condenseConversations([s("a"), s("b", "waiting_attendant")], msgs, "human", 10).sessions).toBe(1);
  });
  it("excludes waiting_attendant requests from AI-only audit", () => {
    expect(condenseConversations([s("a"), s("b", "waiting_attendant")], msgs, "ai_only", 10).sessions).toBe(1);
  });
  it("does not count an unrelated pause alone as a human request", () => {
    expect(wasHumanSession(s("a", "Outra pausa"), [])).toBe(false);
  });
  it("respects the session limit", () => {
    expect(condenseConversations([s("a"), s("b")], msgs, "all", 1).sessions).toBe(1);
  });
  it("includes attendant messages and their persisted sender name in human audit", () => {
    const attendant = { ...m("a", "attendant", "Olá", "4"), sender_user_id: "user-1", sender_name: "Doug" };
    const result = condenseConversations([s("a")], [...msgs, attendant], "human", 10);
    expect(result.sessions).toBe(1);
    expect(result.text).toContain("AT (Doug): Olá");
  });
  it("counts phone replies without an account as human intervention", () => {
    expect(wasHumanSession(s("a"), [{ ...m("a", "human", "oi", "1"), sender_user_id: null }])).toBe(true);
  });
  it("excludes phone-assisted conversations from AI-only results", () => {
    const phone = { ...m("a", "human", "Resposta pelo celular", "4"), sender_user_id: null };
    expect(condenseConversations([s("a")], [...msgs, phone], "ai_only", 10).sessions).toBe(0);
    expect(condenseConversations([s("a")], [...msgs, phone], "human", 10).sessions).toBe(1);
  });
});
