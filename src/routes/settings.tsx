import { createFileRoute, useNavigate, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { loadWebhookUrl, saveWebhookUrl } from "@/lib/webhook";

export const Route = createFileRoute("/settings")({
  head: () => ({
    meta: [
      { title: "Configurações — GoodZap Monitor" },
      { name: "description", content: "Configure a URL do webhook do n8n para envio de mensagens humanas ao WhatsApp." },
      { property: "og:title", content: "Configurações — GoodZap Monitor" },
      { property: "og:description", content: "Configure a URL do webhook do n8n para envio de mensagens humanas ao WhatsApp." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: SettingsPage,
});

/* eslint-disable @typescript-eslint/no-explicit-any */
const db = supabase as any;

function isValidUrl(value: string) {
  try {
    const url = new URL(value);
    return url.protocol === "https:" || url.protocol === "http:";
  } catch {
    return false;
  }
}

function SettingsPage() {
  const navigate = useNavigate();
  const [checkingAuth, setCheckingAuth] = useState(true);
  const [isSuperAdmin, setIsSuperAdmin] = useState(false);
  const [url, setUrl] = useState("");
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [testing, setTesting] = useState(false);
  const [testResult, setTestResult] = useState<{ ok: boolean; message: string } | null>(null);

  useEffect(() => {
    supabase.auth.getUser().then(async ({ data }) => {
      if (!data.user) {
        navigate({ to: "/auth" });
        return;
      }
      const { data: roles } = await db
        .from("user_roles")
        .select("role")
        .eq("user_id", data.user.id);
      const roleList = (roles ?? []).map((r: { role: string }) => r.role);
      setIsSuperAdmin(roleList.includes("super-admin"));
      setUrl(await loadWebhookUrl());
      setCheckingAuth(false);
    });
  }, [navigate]);

  async function handleSave() {
    setSaved(false);
    setTestResult(null);
    const trimmed = url.trim();
    if (trimmed && !isValidUrl(trimmed)) {
      setError("Informe uma URL válida começando com http:// ou https://");
      return;
    }
    setError(null);
    try {
      await saveWebhookUrl(trimmed);
      setSaved(true);
      window.setTimeout(() => setSaved(false), 2000);
    } catch {
      setError("Não foi possível salvar. Verifique se você tem permissão de super-admin.");
    }
  }

  async function handleTest() {
    const trimmed = url.trim();
    if (!isValidUrl(trimmed)) {
      setTestResult({ ok: false, message: "Informe uma URL válida antes de testar." });
      return;
    }
    setTesting(true);
    setTestResult(null);
    try {
      const res = await fetch(trimmed, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          event: "webhook_test",
          timestamp: new Date().toISOString(),
          message: "Teste de conexão do GoodZap Monitor",
        }),
      });
      setTestResult(
        res.ok
          ? { ok: true, message: `Conexão OK (HTTP ${res.status}). O n8n recebeu o teste.` }
          : { ok: false, message: `O webhook respondeu com erro HTTP ${res.status}.` },
      );
    } catch {
      setTestResult({
        ok: false,
        message: "Não foi possível alcançar o webhook. Verifique a URL e se o fluxo do n8n está ativo.",
      });
    } finally {
      setTesting(false);
    }
  }

  if (checkingAuth) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <p className="text-sm text-muted-foreground">Carregando...</p>
      </div>
    );
  }

  return (
    <div className="flex min-h-dvh flex-col bg-background">
      <header className="flex items-center justify-between border-b border-border bg-card px-4 py-3">
        <div className="flex items-center gap-2">
          <h1 className="text-lg font-bold text-foreground">Configurações</h1>
        </div>
        <Link
          to="/"
          className="rounded-md border border-input px-3 py-1.5 text-sm text-foreground transition-colors hover:bg-accent"
        >
          ← Voltar
        </Link>
      </header>

      <main className="mx-auto w-full max-w-xl flex-1 px-4 py-6">
        <section className="rounded-lg border border-border bg-card p-4">
          <h2 className="text-sm font-semibold text-foreground">Configuração de URL do Webhook</h2>
          <p className="mt-1 text-xs text-muted-foreground">
            Quando um atendente enviar uma mensagem, o app fará um POST para esta URL (webhook do
            n8n) com o telefone do contato, a sessão e o texto da mensagem. O n8n então envia ao
            WhatsApp via UZAPI. A URL fica salva no banco de dados e é compartilhada por toda a
            equipe.
          </p>

          {!isSuperAdmin && (
            <p className="mt-3 rounded-md bg-chart-4/15 px-3 py-2 text-xs text-chart-4">
              Somente super-admins podem alterar esta configuração. Você pode visualizar, mas não
              editar.
            </p>
          )}

          <label htmlFor="webhook-url" className="mt-4 block text-xs font-medium text-foreground">
            URL do Webhook (n8n)
          </label>
          <input
            id="webhook-url"
            type="url"
            value={url}
            disabled={!isSuperAdmin}
            onChange={(e) => {
              setUrl(e.target.value);
              setSaved(false);
              setError(null);
            }}
            placeholder="https://seu-n8n.exemplo.com/webhook/whatsapp-send"
            className="mt-1.5 w-full rounded-md border border-input bg-background px-3 py-2 text-sm text-foreground outline-none focus:ring-2 focus:ring-ring disabled:cursor-not-allowed disabled:opacity-60"
            autoComplete="off"
            spellCheck={false}
          />
          {error && (
            <p role="alert" className="mt-1.5 text-xs text-destructive">
              {error}
            </p>
          )}

          <div className="mt-3 flex flex-wrap items-center gap-2">
            <Button onClick={handleSave} size="sm" disabled={!isSuperAdmin}>
              {saved ? "Salvo!" : "Salvar"}
            </Button>
            <Button onClick={handleTest} size="sm" variant="outline" disabled={testing}>
              {testing ? "Testando..." : "Testar Conexão"}
            </Button>
          </div>

          {testResult && (
            <p
              role="status"
              className={`mt-3 rounded-md px-3 py-2 text-xs ${
                testResult.ok ? "bg-chart-2/15 text-chart-2" : "bg-destructive/10 text-destructive"
              }`}
            >
              {testResult.message}
            </p>
          )}
        </section>
      </main>
    </div>
  );
}
