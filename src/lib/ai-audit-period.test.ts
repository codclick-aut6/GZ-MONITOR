import { describe, expect, it } from "vitest";
import { auditPeriod } from "./ai-audit-period";

describe("AI audit calendar presets", () => {
  it("Hoje selects only the current local day, including late evening", () => {
    expect(auditPeriod("today", new Date(2026, 10, 23, 21, 19))).toEqual({ from: "2026-11-23", to: "2026-11-23" });
  });
  it("Ontem selects only the previous local day", () => {
    expect(auditPeriod("yesterday", new Date(2026, 10, 23, 21, 19))).toEqual({ from: "2026-11-22", to: "2026-11-22" });
  });
  it("Ontem crosses month and year boundaries", () => {
    expect(auditPeriod("yesterday", new Date(2026, 0, 1, 0, 19))).toEqual({ from: "2025-12-31", to: "2025-12-31" });
  });
});