import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { Eye, EyeOff } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { signUpWithToken } from "@/lib/signup.functions";

export const Route = createFileRoute("/auth")({
  head: () => ({
    meta: [
      { title: "Entrar — GoodZap Monitor" },
      { name: "description", content: "Acesse o painel de monitoramento de conversas do WhatsApp." },
      { property: "og:title", content: "Entrar — GoodZap Monitor" },
      { property: "og:description", content: "Acesse o painel de monitoramento de conversas do WhatsApp." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: AuthPage,
});

function translateAuthError(msg: string): string {
  const m = msg.toLowerCase();
  if (m.includes("invalid login credentials")) return "E-mail ou senha inválidos.";
  if (m.includes("email not confirmed")) return "E-mail ainda não confirmado.";
  if (m.includes("rate limit") || m.includes("too many")) return "Muitas tentativas. Aguarde alguns minutos e tente novamente.";
  if (m.includes("already") && m.includes("registered")) return "Este e-mail já está cadastrado.";
  return `Erro: ${msg}`;
}

function AuthPage() {
  const navigate = useNavigate();
  const [mode, setMode] = useState<"login" | "signup">("login");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [token, setToken] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [info, setInfo] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setInfo(null);
    const cleanEmail = email.trim().toLowerCase();

    if (mode === "login") {
      const { error } = await supabase.auth.signInWithPassword({ email: cleanEmail, password });
      if (error) {
        setError(translateAuthError(error.message));
        setLoading(false);
        return;
      }
      navigate({ to: "/" });
    } else {
      try {
        const res = await signUpWithToken({ data: { name: name.trim(), email: cleanEmail, password, token: token.trim() } });
        if (!res.ok) {
          setError(translateAuthError(res.error));
          setLoading(false);
          return;
        }
      } catch {
        setError("Dados inválidos. Confira e tente novamente.");
        setLoading(false);
        return;
      }
      setToken("");
      setEmail(cleanEmail);
      setInfo("Conta criada! Agora faça login.");
      setMode("login");
    }
    setLoading(false);
  }

  const inputCls =
    "w-full rounded-md border border-input bg-background px-3 py-2 text-sm text-foreground outline-none focus:ring-2 focus:ring-ring";

  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      <div className="w-full max-w-sm rounded-xl border border-border bg-card p-8 shadow-sm">
        <div className="mb-6 text-center">
          <h1 className="text-2xl font-bold text-foreground">GoodZap Monitor</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Monitoramento de conversas do WhatsApp em tempo real
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          {mode === "signup" && (
            <div>
              <label htmlFor="name" className="mb-1 block text-sm font-medium text-foreground">
                Nome
              </label>
              <input
                id="name"
                type="text"
                required
                minLength={2}
                maxLength={100}
                autoComplete="name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className={inputCls}
                placeholder="Seu nome"
              />
            </div>
          )}
          <div>
            <label htmlFor="email" className="mb-1 block text-sm font-medium text-foreground">
              E-mail
            </label>
            <input
              id="email"
              type="email"
              required
              autoCapitalize="none"
              autoCorrect="off"
              spellCheck={false}
              autoComplete="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className={inputCls}
              placeholder="voce@empresa.com"
            />
          </div>
          <div>
            <label htmlFor="password" className="mb-1 block text-sm font-medium text-foreground">
              Senha
            </label>
            <div className="relative">
              <input
                id="password"
                type={showPassword ? "text" : "password"}
                required
                minLength={6}
                autoCapitalize="none"
                autoCorrect="off"
                spellCheck={false}
                autoComplete={mode === "login" ? "current-password" : "new-password"}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className={`${inputCls} pr-10`}
                placeholder="••••••••"
              />
              <button
                type="button"
                onClick={() => setShowPassword((v) => !v)}
                aria-label={showPassword ? "Ocultar senha" : "Mostrar senha"}
                className="absolute inset-y-0 right-0 flex items-center px-3 text-muted-foreground hover:text-foreground"
              >
                {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </button>
            </div>
          </div>
          {mode === "signup" && (
            <div>
              <label htmlFor="token" className="mb-1 block text-sm font-medium text-foreground">
                Token
              </label>
              <input
                id="token"
                type="text"
                required
                autoCapitalize="none"
                autoCorrect="off"
                value={token}
                onChange={(e) => setToken(e.target.value)}
                className={inputCls}
                placeholder="Seu token de acesso"
              />
            </div>
          )}

          {error && <p className="text-sm text-destructive">{error}</p>}
          {info && <p className="text-sm text-chart-2">{info}</p>}

          <button
            type="submit"
            disabled={loading}
            className="w-full rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90 disabled:opacity-50"
          >
            {loading ? "Aguarde..." : mode === "login" ? "Entrar" : "Criar conta"}
          </button>
        </form>

        <button
          onClick={() => {
            setMode(mode === "login" ? "signup" : "login");
            setError(null);
            setInfo(null);
          }}
          className="mt-4 w-full text-center text-sm text-muted-foreground hover:text-foreground"
        >
          {mode === "login" ? "Não tem conta? Criar uma" : "Já tem conta? Entrar"}
        </button>
      </div>
    </div>
  );
}
