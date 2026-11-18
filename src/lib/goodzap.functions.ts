import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { GOODZAP_DEFAULTS, canManageGoodZap, canManageSystem, fieldSchemas, tableSchema, validateGoodZapFields, type GoodZapData, type GoodZapRow, type GoodZapTable } from "./goodzap-model";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/integrations/supabase/types";

async function requireManager(supabase: SupabaseClient<Database>, userId: string, system = false) {
  const { data, error } = await supabase.from("user_roles").select("role").eq("user_id", userId);
  if (error) throw new Error("Não foi possível verificar suas permissões.");
  const roles = (data ?? []).map((r) => r.role);
  if (system ? !canManageSystem(roles) : !canManageGoodZap(roles)) throw new Error("Acesso restrito a administradores.");
  return roles;
}

export const getGoodZapSettings = createServerFn({ method: "POST" }).middleware([requireSupabaseAuth]).handler(async ({ context }): Promise<GoodZapData> => {
  const roles = await requireManager(context.supabase, context.userId);
  const tables = tableSchema.options.filter((t) => t !== "goodzap_sistema" || canManageSystem(roles));
  const rows: Record<GoodZapTable, GoodZapRow[]> = { configuracoes_goodzap: [], empresa_info: [], goodzap_sistema: [], horario_empresa_goodzap: [], numeros_especiais: [], promocoes_goodzap: [], saudacoes_goodzap: [], telefones_admin_goodzap: [] };
  await Promise.all(tables.map(async (table) => {
    if (table === "goodzap_sistema") {
      const { data, error } = await context.supabase.from("goodzap_sistema").select("id,instancia,debounce_segundos,atendimento_segundos,created_at,updated_at").eq("id", true);
      if (error) throw new Error("Não foi possível carregar as configurações de sistema.");
      rows.goodzap_sistema.push(...(data ?? []));
      return;
    }
    for (let offset = 0; ; offset += 500) {
      const key = table === "horario_empresa_goodzap" ? "dia_semana_id" : "id";
      const { data, error } = await context.supabase.from(table).select("*").order(key).range(offset, offset + 499);
      if (error) throw new Error("Não foi possível carregar as configurações do GoodZap.");
      if (data) for (const record of data) rows[table].push(record as GoodZapRow);
      if (!data || data.length < 500) break;
    }
  }));
  return { roles, rows };
});

const saveSchema = z.object({ table: tableSchema, id: z.number().int().safe().nullable(), fields: z.unknown() }).strict();
export const saveGoodZapSettings = createServerFn({ method: "POST" }).middleware([requireSupabaseAuth]).inputValidator((input: unknown) => saveSchema.parse(input)).handler(async ({ data, context }) => {
  await requireManager(context.supabase, context.userId, data.table === "goodzap_sistema");
  const fields = validateGoodZapFields(data.table, data.fields);
  if (data.table === "telefones_admin_goodzap" || data.table === "saudacoes_goodzap") {
    const { error } = await context.supabase.rpc("salvar_goodzap_exclusivo", { p_tabela: data.table, ...(data.id === null ? {} : { p_id: data.id }), p_dados: fields });
    if (error) throw new Error(error.message);
    return { ok: true };
  }
  // Validate each branch separately to preserve the table-specific insert contract.
  let result;
  if (data.table === "goodzap_sistema") {
    const { comunicacao_apikey, ...settings } = fieldSchemas.goodzap_sistema.parse(fields);
    const values = { ...settings, ...(comunicacao_apikey === undefined ? {} : { comunicacao_apikey }) };
    result = await context.supabase.from("goodzap_sistema").update(values).eq("id", true).select("id");
    if (!result.error && !result.data?.length) result = await context.supabase.from("goodzap_sistema").insert({ id: true, comunicacao_apikey: "", ...values }).select("id");
  } else if (data.table === "horario_empresa_goodzap") {
    if (data.id === null || data.id < 0 || data.id > 6) throw new Error("Dia inválido.");
    const values = fieldSchemas.horario_empresa_goodzap.parse(fields);
    result = await context.supabase.from("horario_empresa_goodzap").upsert({ dia_semana_id: data.id, ...values }, { onConflict: "dia_semana_id" }).select("dia_semana_id");
  } else if (data.table === "configuracoes_goodzap") {
    const values = fieldSchemas.configuracoes_goodzap.parse(fields);
    result = data.id === null ? await context.supabase.from("configuracoes_goodzap").insert(values).select("id") : await context.supabase.from("configuracoes_goodzap").update(values).eq("id", data.id).select("id");
  } else if (data.table === "empresa_info") {
    const values = fieldSchemas.empresa_info.parse(fields);
    result = data.id === null ? await context.supabase.from("empresa_info").insert(values).select("id") : await context.supabase.from("empresa_info").update(values).eq("id", data.id).select("id");
  } else if (data.table === "promocoes_goodzap") {
    const values = fieldSchemas.promocoes_goodzap.parse(fields);
    result = data.id === null ? await context.supabase.from("promocoes_goodzap").insert(values).select("id") : await context.supabase.from("promocoes_goodzap").update(values).eq("id", data.id).select("id");
  } else if (data.table === "numeros_especiais") {
    const values = fieldSchemas.numeros_especiais.parse(fields);
    result = data.id === null ? await context.supabase.from("numeros_especiais").insert(values).select("id") : await context.supabase.from("numeros_especiais").update(values).eq("id", data.id).select("id");
  } else throw new Error("Configuração inválida.");
  if (result.error) throw new Error(data.table === "goodzap_sistema" ? "Não foi possível salvar as configurações de sistema." : result.error.message);
  if (!result.data?.length) throw new Error("Registro alterado ou indisponível. Atualize a página.");
  return { ok: true };
});

export const deleteGoodZapRecord = createServerFn({ method: "POST" }).middleware([requireSupabaseAuth]).inputValidator((input: unknown) => z.object({ table: tableSchema, id: z.number().int().safe() }).strict().parse(input)).handler(async ({ data, context }) => {
  await requireManager(context.supabase, context.userId);
  if (data.table !== "telefones_admin_goodzap" && data.table !== "promocoes_goodzap" && data.table !== "saudacoes_goodzap" && data.table !== "numeros_especiais") throw new Error("Esta configuração não pode ser excluída.");
  const { data: deleted, error } = await context.supabase.from(data.table).delete().eq("id", data.id).select("id");
  if (error) throw new Error(error.message);
  if (!deleted?.length) throw new Error("Registro não encontrado.");
  return { ok: true };
});
const DAYS = ["Domingo", "Segunda-feira", "Terça-feira", "Quarta-feira", "Quinta-feira", "Sexta-feira", "Sábado"];
// Fills only missing default records; never overwrites saved settings.
export const restoreGoodZapDefaults = createServerFn({ method: "POST" }).middleware([requireSupabaseAuth]).handler(async ({ context }) => {
  await requireManager(context.supabase, context.userId, true);
  const db = context.supabase;
  const fail = (e: { message: string } | null) => { if (e) throw new Error("Não foi possível restaurar os padrões: " + e.message); };
  const sys = await db.from("goodzap_sistema").select("id").eq("id", true); fail(sys.error);
  if (!sys.data?.length) fail((await db.from("goodzap_sistema").insert({ id: true, instancia: "", comunicacao_apikey: "", debounce_segundos: GOODZAP_DEFAULTS.debounce_segundos, atendimento_segundos: GOODZAP_DEFAULTS.atendimento_segundos })).error);
  const cfg = await db.from("configuracoes_goodzap").select("id").limit(1); fail(cfg.error);
  if (!cfg.data?.length) fail((await db.from("configuracoes_goodzap").insert({ goodzap_status: "desativado", distancia_maxima: GOODZAP_DEFAULTS.distancia_maxima })).error);
  const days = await db.from("horario_empresa_goodzap").select("dia_semana_id"); fail(days.error);
  const have = new Set((days.data ?? []).map((d) => d.dia_semana_id));
  const missing = DAYS.map((nome, i) => ({ dia_semana_id: i, dia_semana_nome: nome, abre_as: "18:00", fecha_as: "23:00", ativo: false })).filter((d) => !have.has(d.dia_semana_id));
  if (missing.length) fail((await db.from("horario_empresa_goodzap").insert(missing)).error);
  return { ok: true, created: missing.length };
});
