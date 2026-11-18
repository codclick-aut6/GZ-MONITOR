import { supabase } from "@/integrations/supabase/client";

const KEY = "webhook_url";
const LS_KEY = "goodzap_webhook_url";

/* eslint-disable @typescript-eslint/no-explicit-any */
const db = supabase as any;

let cachedUrl: string | null = null;

function readLocalFallback(): string {
  try {
    return window.localStorage.getItem(LS_KEY) ?? "";
  } catch {
    return "";
  }
}

export async function loadWebhookUrl(): Promise<string> {
  const { data, error } = await db
    .from("app_settings")
    .select("value")
    .eq("key", KEY)
    .maybeSingle();
  if (error) {
    // Sem permissão (ex.: attendant) — usa cache/local e não quebra o app.
    return cachedUrl ?? readLocalFallback();
  }
  cachedUrl = (data?.value as string | null) ?? "";
  return cachedUrl;
}

export function getWebhookUrl(): string {
  return cachedUrl ?? readLocalFallback();
}

export async function saveWebhookUrl(url: string): Promise<void> {
  const { error } = await db
    .from("app_settings")
    .upsert({ key: KEY, value: url }, { onConflict: "key" });
  if (error) throw new Error(error.message);
  cachedUrl = url;
}

export type HumanMessagePayload = {
  event: "human_message_sent";
  contact_phone: string;
  contact_name: string | null;
  message: string;
  session_id: string;
  message_id: string | null;
  sender_type: "human";
  sender_email: string | null;
  sender_name: string | null;
  /** Nome do atendente que assumiu a conversa */
  name: string | null;
  timestamp: string;
};

export type HumanTakeoverPayload = {
  event: "human_takeover";
  contact_phone: string;
  contact_name: string | null;
  session_id: string;
  attendant_id: string;
  name: string | null;
  timestamp: string;
};

export type WebhookPayload = HumanMessagePayload | HumanTakeoverPayload;

export async function postToWebhook(payload: WebhookPayload): Promise<void> {
  const url = getWebhookUrl();
  if (!url) {
    if (payload.event === "human_takeover") throw new Error("Webhook não configurado.");
    return;
  }
  const res = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  if (!res.ok) throw new Error(`Webhook respondeu HTTP ${res.status}`);
}
