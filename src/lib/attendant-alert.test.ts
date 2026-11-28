import { describe, expect, it } from "vitest";
import { isHumanRequest } from "./attendant-alert";

const waiting = { status: "paused", assigned_to: null, paused_reason: "waiting_attendant" };

describe("isHumanRequest", () => {
  it("alerts for a paused unassigned waiting_attendant session", () => {
    expect(isHumanRequest(waiting)).toBe(true);
  });
  it("does not alert for Mensagem enviada pelo celular", () => {
    expect(isHumanRequest({ ...waiting, paused_reason: "Mensagem enviada pelo celular" })).toBe(false);
  });
  it("does not alert for a persisted human_takeover assignment", () => {
    expect(isHumanRequest({ ...waiting, paused_reason: "human_takeover", assigned_to: "attendant-1" })).toBe(false);
  });
  it("does not alert for unassigned legacy human_takeover", () => {
    expect(isHumanRequest({ ...waiting, paused_reason: "human_takeover" })).toBe(false);
  });
  it("stops alerting once waiting_attendant is assigned", () => {
    expect(isHumanRequest({ ...waiting, assigned_to: "attendant-1" })).toBe(false);
  });
  it.each(["active", "closed"])("does not alert for %s sessions", (status) => {
    expect(isHumanRequest({ ...waiting, status })).toBe(false);
  });
  it.each([null, "Outra pausa"])("does not alert for pause reason %s", (paused_reason) => {
    expect(isHumanRequest({ ...waiting, paused_reason })).toBe(false);
  });
  it("does not alert for missing sessions", () => {
    expect(isHumanRequest(null)).toBe(false);
    expect(isHumanRequest(undefined)).toBe(false);
  });
});