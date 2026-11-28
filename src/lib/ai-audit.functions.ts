import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { requireManager } from "./goodzap.functions";
import type { AuditMessage, AuditSession } from "./ai-audit";

export const getAuditData = createServerFn({ method: "POST" }).middleware([requireSupabaseAuth])
  .inputValidator((i: unknown) => z.object({ from: z.string().datetime(), to: z.string().datetime(), limit: z.number().int().min(1).max(500) }).strict().parse(i))
  .handler(async ({ data, context }) => {
    await requireManager(context.supabase, context.userId);
    const { data: sessions, error } = await context.supabase.from("whatsapp_sessions")
      .select("session_id, contact_name, created_at, paused_reason, assigned_to")
      .gte("created_at", data.from).lte("created_at", data.to).order("created_at", { ascending: false }).limit(data.limit * 3);
    if (error) throw new Error("Não foi possível carregar as conversas.");
    const ids = (sessions ?? []).map((s) => s.session_id);
    const messages: AuditMessage[] = [];
    for (let i = 0; i < ids.length; i += 100) {
      for (let from = 0; ; from += 1000) {
        const { data: rows, error: e } = await context.supabase.from("whatsapp_messages")
          .select("session_id, sender_type, sender_user_id, sender_name, content, metadata, created_at").in("session_id", ids.slice(i, i + 100))
          .order("created_at").range(from, from + 999);
        if (e) throw new Error("Não foi possível carregar as mensagens.");
        for (const r of rows ?? []) { const t = r.metadata && typeof r.metadata === "object" && !Array.isArray(r.metadata) ? (r.metadata as Record<string, unknown>)["type"] : undefined; messages.push({ session_id: r.session_id, sender_type: r.sender_type, sender_user_id: r.sender_user_id, sender_name: r.sender_name, content: r.content ?? "", created_at: r.created_at ?? "", metadata: typeof t === "string" ? { type: t } : null }); }
        if (!rows || rows.length < 1000) break;
      }
    }
    return { sessions: (sessions ?? []) as AuditSession[], messages };
  });
