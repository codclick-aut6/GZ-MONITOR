import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";

/* eslint-disable @typescript-eslint/no-explicit-any */
const db = supabase as any;

const IDLE_OPTIONS = [5, 10, 15, 20, 30, 60, 120];
const CHECK_OPTIONS = [2, 5, 10, 15, 20, 30, 60];

export function AutoCloseSettings({ canEdit }: { canEdit: boolean }) {
  const [idle, setIdle] = useState(10);
  const [check, setCheck] = useState(20);
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);

  useEffect(() => {
    db.from("app_settings")
      .select("key,value")
      .in("key", ["session_idle_minutes", "session_check_minutes"])
      .then(({ data }: { data: { key: string; value: string }[] | null }) => {
        for (const r of data ?? []) {
          const n = Number(r.value);
          if (!Number.isFinite(n)) continue;
          if (r.key === "session_idle_minutes") setIdle(n);
          if (r.key === "session_check_minutes") setCheck(n);
        }
      });
  }, []);

  async function save() {
    setSaving(true);
    setMsg(null);
    const { error } = await db.rpc("update_session_auto_close", {
      p_idle_minutes: idle,
      p_check_minutes: check,
    });
    setSaving(false);
    setMsg(error ? { ok: false, text: error.message || "Não foi possível salvar." } : { ok: true, text: "Salvo!" });
  }

  const select =
    "mt-1.5 w-full rounded-md border border-input bg-background px-3 py-2 text-sm text-foreground outline-none focus:ring-2 focus:ring-ring disabled:opacity-60";

  return (
    <section className="mt-4 rounded-lg border border-border bg-card p-4">
      <h2 className="text-sm font-semibold text-foreground">Encerramento automático de sessões</h2>
      <p className="mt-1 text-xs text-muted-foreground">
        Conversas sem nenhuma mensagem pelo tempo definido são encerradas na próxima checagem.
      </p>
      <label htmlFor="idle" className="mt-4 block text-xs font-medium text-foreground">Tempo de inatividade</label>
      <select id="idle" className={select} disabled={!canEdit} value={idle} onChange={(e) => setIdle(Number(e.target.value))}>
        {[...new Set([...IDLE_OPTIONS, idle])].sort((a, b) => a - b).map((m) => (
          <option key={m} value={m}>{m} minutos</option>
        ))}
      </select>
      <label htmlFor="check" className="mt-3 block text-xs font-medium text-foreground">Frequência da checagem</label>
      <select id="check" className={select} disabled={!canEdit} value={check} onChange={(e) => setCheck(Number(e.target.value))}>
        {CHECK_OPTIONS.map((m) => (
          <option key={m} value={m}>A cada {m} minutos ({Math.round(1440 / m)}x por dia)</option>
        ))}
      </select>
      <p className="mt-3 rounded-md bg-muted px-3 py-2 text-xs text-muted-foreground">
        Uma conversa parada será encerrada entre {idle} e {idle + check} minutos após a última mensagem.
      </p>
      <div className="mt-3 flex items-center gap-2">
        <Button size="sm" onClick={save} disabled={!canEdit || saving}>{saving ? "Salvando..." : "Salvar"}</Button>
        {msg && <span role="status" className={`text-xs ${msg.ok ? "text-chart-2" : "text-destructive"}`}>{msg.text}</span>}
      </div>
    </section>
  );
}
