import { useState, type ReactNode } from "react";
import { useServerFn } from "@tanstack/react-start";
import { ArrowLeft, Building2, Clock3, Contact, Gift, MapPin, MessageSquare, Pencil, Plus, Save, Settings2, ShieldCheck, Trash2, X } from "lucide-react";
import { Link } from "@tanstack/react-router";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { canManageSystem, CAMPAIGN_SECTION, COMPANY_FIELDS, LIST_SECTIONS, validateGoodZapFields, type Field, type GoodZapData, type GoodZapRow, type GoodZapTable } from "@/lib/goodzap-model";
import { AiAuditExport } from "@/components/ai-audit-export";
import { saveGoodZapSettings, deleteGoodZapRecord, restoreGoodZapDefaults } from "@/lib/goodzap.functions";

type SaveAction = (table: GoodZapTable, id: number | null, fields: GoodZapRow) => Promise<boolean>;
function Section({ title, icon, action, children }: { title: string; icon: ReactNode; action?: ReactNode; children: ReactNode }) {
  return <section className="border-b border-border py-7 last:border-0"><div className="mb-5 flex items-center justify-between gap-3"><h2 className="flex items-center gap-2 text-base font-semibold">{icon}{title}</h2>{action}</div>{children}</section>;
}
function Fields({ fields, values, setValues, disabled }: { fields: Field[]; values: GoodZapRow; setValues: (values: GoodZapRow) => void; disabled?: boolean }) {
  return <div className="grid gap-4 sm:grid-cols-2">{fields.map((field) => <label key={field.key} className={field.type === "textarea" ? "col-span-full" : ""}>
    <span className="mb-1.5 block text-xs font-medium text-muted-foreground">{field.label}</span>
    {field.type === "textarea" ? <Textarea aria-label={field.label} value={String(values[field.key] ?? "")} disabled={disabled} rows={4} maxLength={5000} onChange={(e) => setValues({ ...values, [field.key]: e.target.value })} /> : <Input aria-label={field.label} type={field.type ?? "text"} min={field.min} max={field.max} maxLength={field.type === "number" ? undefined : field.type === "password" ? 4096 : 200} autoComplete={field.type === "password" ? "new-password" : undefined} value={String(values[field.key] ?? "")} disabled={disabled} onChange={(e) => setValues({ ...values, [field.key]: field.type === "number" ? (e.target.value === "" ? "" : Number(e.target.value)) : e.target.value })} />}
  </label>)}</div>;
}
function SingleForm({ table, row, fields, save, busy }: { table: GoodZapTable; row: GoodZapRow | undefined; fields: Field[]; save: SaveAction; busy: boolean }) {
  const [values, setValues] = useState<GoodZapRow>(() => Object.fromEntries(fields.filter((f) => f.type !== "password").map((f) => [f.key, row?.[f.key] ?? ""])));
  return <form className="space-y-4" onSubmit={(e) => { e.preventDefault(); void save(table, typeof row?.['id'] === "number" ? row['id'] : null, values); }}>
    <Fields fields={fields} values={values} setValues={(next) => { if (next['comunicacao_apikey'] === "") { const { comunicacao_apikey: omitted, ...rest } = next; void omitted; setValues(rest); } else setValues(next); }} disabled={busy} />
    <Button size="sm" type="submit" disabled={busy}><Save />Salvar</Button>
  </form>;
}
function Hours({ rows, save, busy }: { rows: GoodZapRow[]; save: SaveAction; busy: boolean }) {
  const [editing, setEditing] = useState<number | null>(null);
  const [values, setValues] = useState<GoodZapRow>({});
  return <div className="divide-y divide-border">{rows.map((row) => {
    const id = Number(row['dia_semana_id']);
    const edit = editing === id;
    const current = edit ? values : row;
    const fields = { dia_semana_nome: String(current['dia_semana_nome']), abre_as: String(current['abre_as']), fecha_as: String(current['fecha_as']), ativo: Boolean(current['ativo']) };
    return <div key={id} className="grid grid-cols-[1fr_auto] items-center gap-3 py-3 sm:grid-cols-[140px_1fr_auto_auto]">
      <span className="text-sm font-medium">{String(row['dia_semana_nome'])}</span>
      <div className="order-3 col-span-2 flex min-w-0 items-center gap-2 sm:order-none sm:col-span-1">
        {edit ? <><Input aria-label={`Abertura ${row['dia_semana_nome']}`} type="time" className="w-32 min-w-0" value={String(values['abre_as'])} onChange={(e) => setValues({ ...values, abre_as: e.target.value })} /><span className="text-xs text-muted-foreground">até</span><Input aria-label={`Fechamento ${row['dia_semana_nome']}`} type="time" className="w-32 min-w-0" value={String(values['fecha_as'])} onChange={(e) => setValues({ ...values, fecha_as: e.target.value })} /></> : <span className="text-sm text-muted-foreground">{`${row['abre_as'] ?? "--:--"} — ${row['fecha_as'] ?? "--:--"}`}</span>}
      </div>
      <label className="flex items-center gap-2 text-xs"><Switch aria-label={`Aberto ${row['dia_semana_nome']}`} checked={Boolean(current['ativo'])} disabled={busy} onCheckedChange={(ativo) => { if (edit) setValues({ ...values, ativo }); else void save("horario_empresa_goodzap", id, { ...fields, ativo }); }} /><span>{current['ativo'] ? "Aberto" : "Fechado"}</span></label>
      <div className="order-4 flex gap-1 sm:order-none">
        {edit ? <><Button size="icon" variant="ghost" title="Salvar horário" aria-label={`Salvar ${row['dia_semana_nome']}`} disabled={busy} onClick={async () => { if (await save("horario_empresa_goodzap", id, fields)) setEditing(null); }}><Save /></Button><Button size="icon" variant="ghost" title="Cancelar edição" aria-label="Cancelar edição" disabled={busy} onClick={() => setEditing(null)}><X /></Button></> : <Button size="icon" variant="ghost" title="Editar horário" aria-label={`Editar ${row['dia_semana_nome']}`} disabled={busy} onClick={() => { setEditing(id); setValues(fields); }}><Pencil /></Button>}
      </div>
    </div>;
  })}</div>;
}

type Editor = { table: GoodZapTable; id: number | null; fields: Field[]; active: boolean; title: string; values: GoodZapRow };
export function GoodZapSettings({ data, reload }: { data: GoodZapData; reload: () => Promise<void> }) {
  const saveFn = useServerFn(saveGoodZapSettings);
  const deleteFn = useServerFn(deleteGoodZapRecord);
  const restoreFn = useServerFn(restoreGoodZapDefaults);
  const [confirmRestore, setConfirmRestore] = useState(false);
  async function restore() {
    setBusy(true); setFeedback(null);
    try { await restoreFn(); setConfirmRestore(false); await reload(); setRevision((r) => r + 1); setFeedback({ ok: true, text: "Padrões de configurações restaurados." }); }
    catch (error) { setFeedback({ ok: false, text: error instanceof Error ? error.message : "Não foi possível restaurar." }); }
    finally { setBusy(false); }
  }
  const [busy, setBusy] = useState(false);
  const [feedback, setFeedback] = useState<{ ok: boolean; text: string } | null>(null);
  const [editor, setEditor] = useState<Editor | null>(null);
  const [deleting, setDeleting] = useState<{ table: GoodZapTable; id: number; name: string } | null>(null);
  const [revision, setRevision] = useState(0);
  const config = data.rows.configuracoes_goodzap[0];
  const company = data.rows.empresa_info[0];
  const system = data.rows.goodzap_sistema[0];
  const [distance, setDistance] = useState(Number(config?.['distancia_maxima'] ?? 6));
  const isActive = ["ativo", "ativa", "active"].includes(String(config?.['goodzap_status'] ?? "").toLowerCase());
  async function save(table: GoodZapTable, id: number | null, fields: GoodZapRow) {
    setFeedback(null);
    try { validateGoodZapFields(table, fields); } catch (error) {
      setFeedback({ ok: false, text: error instanceof Error ? ("issues" in error ? "Confira os campos preenchidos: " + (error as { issues: { message: string }[] }).issues[0]?.message : error.message) : "Confira os dados." });
      return false;
    }
    setBusy(true);
    let persisted = false;
    try {
      await saveFn({ data: { table, id, fields } });
      persisted = true;
      await reload();
      setRevision((r) => r + 1);
      setFeedback({ ok: true, text: "Alterações salvas." });
      return true;
    } catch (error) {
      setFeedback({ ok: false, text: persisted ? "Salvo, mas não foi possível atualizar a tela. Recarregue a página." : error instanceof Error ? error.message : "Não foi possível salvar." });
      return false;
    } finally { setBusy(false); }
  }
  function openEditor(section: typeof LIST_SECTIONS[number], row?: GoodZapRow) {
    setFeedback(null);
    setEditor({ table: section.table, id: typeof row?.['id'] === "number" ? row['id'] : null, title: section.title, fields: section.fields, active: Boolean(section.active), values: { ...Object.fromEntries(section.fields.map((f) => [f.key, row?.[f.key] ?? ""])), ...(section.active ? { ativa: Boolean(row?.['ativa']) } : {}) } });
  }
  async function remove() {
    if (!deleting) return;
    setBusy(true); setFeedback(null);
    try { await deleteFn({ data: { table: deleting.table, id: deleting.id } }); setDeleting(null); await reload(); setFeedback({ ok: true, text: "Registro excluído." }); }
    catch (error) { setFeedback({ ok: false, text: error instanceof Error ? error.message : "Não foi possível excluir." }); }
    finally { setBusy(false); }
  }
  const icons = { telefones_admin_goodzap: <Contact className="size-4 text-muted-foreground" />, promocoes_goodzap: <Gift className="size-4 text-muted-foreground" />, saudacoes_goodzap: <MessageSquare className="size-4 text-muted-foreground" />, numeros_especiais: <ShieldCheck className="size-4 text-muted-foreground" /> };
  function listSection(section: typeof LIST_SECTIONS[number]) {
    return <Section key={section.table} title={section.title} icon={icons[section.table as keyof typeof icons]} action={<Button size="sm" variant="outline" disabled={busy} onClick={() => openEditor(section)}><Plus />Adicionar</Button>}>
      {data.rows[section.table].length === 0 ? <p className="py-3 text-sm text-muted-foreground">Nenhum registro cadastrado.</p> : <div className="divide-y divide-border">{data.rows[section.table].map((row) => <div key={String(row['id'])} className="flex items-start justify-between gap-3 py-4">
        <div className="min-w-0 flex-1">{section.table === "telefones_admin_goodzap" ? section.fields.map((f) => <p key={f.key} className="text-sm"><span className="text-xs text-muted-foreground">{f.label}: </span><span className="font-medium">{String(row[f.key] ?? "—")}</span></p>) : <><p className="whitespace-pre-wrap break-words text-sm font-medium">{String(row[section.titleKey])}</p>{section.fields.filter((f) => f.key !== section.titleKey).map((f) => <p key={f.key} className="mt-1 whitespace-pre-wrap break-words text-xs text-muted-foreground">{section.table === "promocoes_goodzap" && f.type !== "textarea" ? `${f.label.replace(" (dd/mm/aaaa)", "")}: ${row[f.key] || "—"}` : String(row[f.key] ?? "")}</p>)}</>}</div>
        <div className="flex shrink-0 flex-wrap items-center justify-end gap-1">
          {section.active && <Switch className="mr-2" aria-label={`Ativar ${row[section.titleKey]}`} checked={Boolean(row['ativa'])} disabled={busy} onCheckedChange={(ativa) => void save(section.table, Number(row['id']), { ...Object.fromEntries(section.fields.map((f) => [f.key, row[f.key] ?? ""])), ativa })} />}
          <Button size="icon" variant="ghost" title="Editar" aria-label={`Editar ${row[section.titleKey]}`} disabled={busy} onClick={() => openEditor(section, row)}><Pencil /></Button>
          <Button size="icon" variant="ghost" className="text-destructive" title="Excluir" aria-label={`Excluir ${row[section.titleKey]}`} disabled={busy} onClick={() => { setFeedback(null); setDeleting({ table: section.table, id: Number(row['id']), name: String(row[section.titleKey]) }); }}><Trash2 /></Button>
        </div>
      </div>)}</div>}
    </Section>;
  }
  return <div className="min-h-dvh bg-background text-foreground">
    <header className="border-b border-border"><div className="mx-auto flex max-w-5xl items-center justify-between gap-3 px-4 py-4 sm:px-8"><div className="flex items-center gap-3"><span className="flex size-9 items-center justify-center rounded-md bg-chart-2/15 text-chart-2"><Settings2 className="size-5" /></span><h1 className="text-xl font-bold">GoodZap</h1></div><Button asChild variant="outline" size="sm"><Link to="/"><ArrowLeft />Atendimento</Link></Button></div></header>
    <main className="mx-auto max-w-5xl px-4 py-6 sm:px-8">
      <Tabs defaultValue={canManageSystem(data.roles) ? "gerais" : "campanhas"}><TabsList className="mb-1 h-auto max-w-full flex-wrap">{canManageSystem(data.roles) && <TabsTrigger value="gerais">Configurações Gerais</TabsTrigger>}<TabsTrigger value="campanhas">Campanhas</TabsTrigger><TabsTrigger value="auditoria">Auditoria de IA</TabsTrigger>{canManageSystem(data.roles) && <TabsTrigger value="sistema">Sistema</TabsTrigger>}</TabsList>
        {feedback && <p role={feedback.ok ? "status" : "alert"} className={`sticky top-2 z-20 my-3 rounded-md border bg-background p-3 text-sm ${feedback.ok ? "border-chart-2 text-chart-2" : "border-destructive text-destructive"}`}>{feedback.text}</p>}
        {canManageSystem(data.roles) && <TabsContent value="gerais">
          <Section title="Status GoodZap" icon={<Settings2 className="size-4 text-muted-foreground" />}><div className={`flex items-center justify-between gap-4 border-l-4 px-4 py-3 ${isActive ? "border-chart-2 bg-chart-2/10" : "border-destructive bg-destructive/5"}`}><div><p className={`text-sm font-semibold ${isActive ? "text-chart-2" : "text-destructive"}`}>{isActive ? "Sistema Ativo" : "Sistema Inativo"}</p><p className="mt-1 text-xs text-muted-foreground">{isActive ? "O GoodZap está respondendo automaticamente" : "O GoodZap está pausado e não responde mensagens"}</p></div><Switch aria-label="Ativar GoodZap" checked={isActive} disabled={busy} onCheckedChange={(active) => void save("configuracoes_goodzap", typeof config?.['id'] === "number" ? config['id'] : null, { goodzap_status: active ? "ativo" : "desativado", distancia_maxima: Number(config?.['distancia_maxima'] ?? 6) })} /></div></Section>
          <Section title="Informações da Empresa" icon={<Building2 className="size-4 text-muted-foreground" />}><SingleForm key={`company-${revision}`} table="empresa_info" row={company} fields={COMPANY_FIELDS} save={save} busy={busy} /></Section>
          {LIST_SECTIONS[0] && listSection(LIST_SECTIONS[0])}
          <Section title="Horário de Funcionamento" icon={<Clock3 className="size-4 text-muted-foreground" />}><Hours rows={data.rows.horario_empresa_goodzap} save={save} busy={busy} /></Section>
          <Section title="Entrega" icon={<MapPin className="size-4 text-muted-foreground" />}><form className="flex flex-wrap items-end gap-3" onSubmit={(e) => { e.preventDefault(); void save("configuracoes_goodzap", typeof config?.['id'] === "number" ? config['id'] : null, { goodzap_status: isActive ? "ativo" : "desativado", distancia_maxima: distance }); }}><label><span className="mb-1.5 block text-xs font-medium text-muted-foreground">Distância máxima (km)</span><Input aria-label="Distância máxima (km)" type="number" min="0" max="10000" step="0.1" value={distance} disabled={busy} onChange={(e) => setDistance(Number(e.target.value))} className="w-40" /></label><Button size="sm" type="submit" disabled={busy}><Save />Salvar</Button></form></Section>
          {LIST_SECTIONS.slice(1).map(listSection)}
        </TabsContent>}
        <TabsContent value="campanhas">{listSection(CAMPAIGN_SECTION)}</TabsContent>
        <TabsContent value="auditoria"><AiAuditExport /></TabsContent>
        {canManageSystem(data.roles) && <TabsContent value="sistema"><Section title="Comunicação e Tempos" icon={<Settings2 className="size-4 text-muted-foreground" />}><SingleForm key={`system-${revision}`} table="goodzap_sistema" row={system} fields={[{ key: "instancia", label: "Instância" }, { key: "comunicacao_apikey", label: "API Key de comunicação", type: "password" }, { key: "url_cardapio", label: "URL do Cardápio", type: "url" }, { key: "debounce_segundos", label: "Debounce ativo (segundos)", type: "number", min: 0, max: 3600 }, { key: "atendimento_segundos", label: "Tempo para Atendimento (segundos)", type: "number", min: 0, max: 86400 }]} save={save} busy={busy} /></Section>
          <Section title="Padrões de Configurações" icon={<Settings2 className="size-4 text-muted-foreground" />}><div className="flex flex-wrap items-center justify-between gap-3 py-3"><p className="max-w-lg text-sm text-muted-foreground">Cria os registros que estiverem faltando (sistema, status/entrega e os 7 dias de horário) com valores padrão. Dados já salvos não são alterados.</p><Button variant="outline" disabled={busy} onClick={() => setConfirmRestore(true)}>Restaurar Padrões de Configurações</Button></div></Section>
          <Dialog open={confirmRestore} onOpenChange={setConfirmRestore}><DialogContent><DialogHeader><DialogTitle>Restaurar Padrões de Configurações?</DialogTitle></DialogHeader><p className="text-sm text-muted-foreground">Os registros ausentes serão criados com os valores padrão. Configurações existentes serão mantidas.</p><DialogFooter><Button variant="outline" onClick={() => setConfirmRestore(false)}>Cancelar</Button><Button disabled={busy} onClick={() => void restore()}>Restaurar</Button></DialogFooter></DialogContent></Dialog></TabsContent>}
      </Tabs>
    </main>
    <Dialog open={editor !== null} onOpenChange={(open) => { if (!open && !busy) setEditor(null); }}><DialogContent className="max-h-[85dvh] overflow-y-auto"><DialogHeader><DialogTitle>{editor?.id === null ? "Adicionar" : "Editar"} — {editor?.title}</DialogTitle></DialogHeader>{editor && <form className="space-y-5" onSubmit={async (e) => { e.preventDefault(); if (await save(editor.table, editor.id, editor.values)) setEditor(null); }}><Fields fields={editor.fields} values={editor.values} setValues={(values) => setEditor({ ...editor, values })} disabled={busy} />{editor.active && <label className="flex items-center gap-3 text-sm"><Switch aria-label="Registro ativo" checked={Boolean(editor.values['ativa'])} disabled={busy} onCheckedChange={(ativa) => setEditor({ ...editor, values: { ...editor.values, ativa } })} />Ativo</label>}{feedback && !feedback.ok && <p role="alert" className="text-sm text-destructive">{feedback.text}</p>}<DialogFooter><Button variant="outline" type="button" disabled={busy} onClick={() => setEditor(null)}>Cancelar</Button><Button type="submit" disabled={busy}><Save />{busy ? "Salvando..." : "Salvar"}</Button></DialogFooter></form>}</DialogContent></Dialog>
    <Dialog open={deleting !== null} onOpenChange={(open) => { if (!open && !busy) setDeleting(null); }}><DialogContent><DialogHeader><DialogTitle>Excluir registro?</DialogTitle></DialogHeader><p className="break-words text-sm text-muted-foreground">{deleting?.name}</p>{feedback && !feedback.ok && <p role="alert" className="text-sm text-destructive">{feedback.text}</p>}<DialogFooter><Button variant="outline" disabled={busy} onClick={() => setDeleting(null)}>Cancelar</Button><Button variant="destructive" disabled={busy} onClick={() => void remove()}><Trash2 />Excluir</Button></DialogFooter></DialogContent></Dialog>
  </div>;
}