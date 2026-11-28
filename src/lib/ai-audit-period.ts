import { format, subDays } from "date-fns";

export type AuditPeriodPreset = "today" | "yesterday" | 7 | 15 | "month";

export function auditPeriod(preset: AuditPeriodPreset, now = new Date()) {
  const end = preset === "yesterday" ? subDays(now, 1) : now;
  const start = preset === "month"
    ? new Date(now.getFullYear(), now.getMonth(), 1)
    : typeof preset === "number" ? subDays(now, preset) : end;
  return { from: format(start, "yyyy-MM-dd"), to: format(end, "yyyy-MM-dd") };
}