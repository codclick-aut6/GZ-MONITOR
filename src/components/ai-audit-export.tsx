import { useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { Copy, Download, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { getAuditData } from "@/lib/ai-audit.functions";
import { condenseConversations, type AuditOutcome } from "@/lib/ai-audit";
import { auditPeriod, type AuditPeriodPreset } from "@/lib/ai-audit-period";

export function AiAuditExport() {
  const fetchData = useServerFn(getAuditData);
  const [from, setFrom] = useState(() => auditPeriod(7).from);
  const [to, setTo] = useState(() => auditPeriod(7).to);
  const [outcome, setOutcome] = useState<AuditOutcome>("all");
  const [limit, setLimit] = useState(50);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [result, setResult] = useState<ReturnType<typeof condenseConversations> | null>(null);

  async function generate() {
    setBusy(true); setError(null); setResult(null);
    try {
      const start = new Date(`${from}T00:00:00`), end = new Date(`${to}T23:59:59`);
      const d = await fetchData({ data: { from: start.toISOString(), to: end.toISOString(), limit } });
      setResult(condenseConversations(d.sessions, d.messages, outcome, limit));
    } catch (e) { setError(e instanceof Error ? e.message : "Não foi possível gerar o relatório."); }
    finally { setBusy(false); }
  }
  function download() {
    if (!result) return;
    const url = URL.createObjectURL(new Blob([result.text], { type: "text/plain;charset=utf-8" }));
    const a = document.createElement("a"); a.href = url; a.download = `conversas_${from}_a_${to}.txt`;
    document.body.appendChild(a); a.click(); a.remove(); setTimeout(() => URL.revokeObjectURL(url), 30000);
  }
  const preset = (value: AuditPeriodPreset) => { const range = auditPeriod(value); setFrom(range.from); setTo(range.to); };
  const sel = "h-9 rounded-md border border-input bg-background px-2 text-sm text-foreground";

  return (
    <section className="rounded-lg border border-border bg-card p-4">
      <h2 className="flex items-center gap-2 text-sm font-semibold"><Sparkles className="size-4 text-muted-foreground" />Auditoria de IA</h2>
      <p className="mt-1 text-xs text-muted-foreground">Exporte as conversas em texto compacto para analisar o agente no ChatGPT ou Claude.</p>
      <div className="mt-4 flex flex-wrap gap-2">
        <Button size="sm" variant="outline" onClick={() => preset("today")}>Hoje</Button>
        <Button size="sm" variant="outline" onClick={() => preset("yesterday")}>Ontem</Button>
        <Button size="sm" variant="outline" onClick={() => preset(7)}>Últimos 7 dias</Button>
        <Button size="sm" variant="outline" onClick={() => preset(15)}>Últimos 15 dias</Button>
        <Button size="sm" variant="outline" onClick={() => preset("month")}>Mês atual</Button>
      </div>
      <div className="mt-3 grid gap-3 sm:grid-cols-4">
        <label className="text-xs">De<Input type="date" value={from} onChange={(e) => setFrom(e.target.value)} /></label>
        <label className="text-xs">Até<Input type="date" value={to} onChange={(e) => setTo(e.target.value)} /></label>
        <label className="flex flex-col text-xs">Desfecho<select className={sel} value={outcome} onChange={(e) => setOutcome(e.target.value as AuditOutcome)}><option value="all">Todas as conversas</option><option value="human">Pediram atendente</option><option value="ai_only">100% resolvidas pela IA</option></select></label>
        <label className="flex flex-col text-xs">Máximo de conversas<select className={sel} value={limit} onChange={(e) => setLimit(Number(e.target.value))}>{[20, 50, 100, 200].map((n) => <option key={n} value={n}>{n}</option>)}</select></label>
      </div>
      <Button className="mt-4" onClick={() => void generate()} disabled={busy || !from || !to}>{busy ? "Gerando..." : "Gerar relatório"}</Button>
      {error && <p role="alert" className="mt-3 text-sm text-destructive">{error}</p>}
      {result && <div className="mt-4 space-y-3">
        <p className="text-sm">{result.sessions} conversas · {result.messages} mensagens · ~{result.tokens.toLocaleString("pt-BR")} tokens</p>
        <div className="flex flex-wrap gap-2">
          <Button size="sm" onClick={() => void navigator.clipboard.writeText(result.text).then(() => { setCopied(true); setTimeout(() => setCopied(false), 2000); })}><Copy className="size-4" />{copied ? "Copiado!" : "Copiar"}</Button>
          <Button size="sm" variant="outline" onClick={download}><Download className="size-4" />Baixar .txt</Button>
        </div>
        <Textarea readOnly value={result.text} className="h-72 font-mono text-xs" />
      </div>}
    </section>
  );
}
