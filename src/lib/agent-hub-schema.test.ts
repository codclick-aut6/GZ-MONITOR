import { readFileSync, readdirSync } from "node:fs";
import { describe, expect, it } from "vitest";

const migrations = readdirSync("supabase/migrations")
  .sort()
  .map((file) => readFileSync(`supabase/migrations/${file}`, "utf8"));
const schema = migrations.find((sql) => sql.includes("CREATE TABLE public.cardapio ("));
const functions = migrations.find((sql) => sql.includes("CREATE FUNCTION public.buscar_disparos_prontos("));
const roles = migrations.find((sql) => sql.includes("Compatibility metadata for imported Agent Hub invitations"));
const tables = [
  "cardapio", "cardapio2", "bebidas", "borda_recheada", "outros_produtos",
  "empresa_info", "area_entrega", "faixas_frete", "horario_empresa_goodzap",
  "horarios_goodzap", "keep_alive", "configuracoes_goodzap", "saudacoes_goodzap",
  "telefones_admin_goodzap", "numeros_especiais", "clientes", "pedidos_goodzap",
  "reservas", "clientes_clickflow", "promocoes_goodzap", "promocao_aniversario",
  "recuperacao_clientes", "webhooks_campanhas",
];

function tableSql(table: string) {
  if (!schema) throw new Error("Agent Hub table migration is missing");
  const start = schema.indexOf(`CREATE TABLE public.${table} (`);
  if (start < 0) throw new Error(`Missing table ${table}`);
  const end = schema.indexOf("CREATE TABLE public.", start + 1);
  return schema.slice(start, end < 0 ? schema.length : end);
}

describe("Agent Hub migration access rules", () => {
  it.each(tables)("%s is team-readable, admin-writable, and private", (table) => {
    const sql = tableSql(table);
    const create = sql.indexOf(`CREATE TABLE public.${table}`);
    const grant = sql.indexOf(`GRANT SELECT, INSERT, UPDATE, DELETE ON public.${table} TO authenticated`);
    const rls = sql.indexOf(`ALTER TABLE public.${table} ENABLE ROW LEVEL SECURITY`);
    const policy = sql.indexOf(`CREATE POLICY agent_hub_team_read ON public.${table}`);
    expect(create).toBe(0);
    expect(grant).toBeGreaterThan(create);
    expect(rls).toBeGreaterThan(grant);
    expect(policy).toBeGreaterThan(rls);
    expect(sql).toContain(`REVOKE ALL ON public.${table} FROM PUBLIC, anon, authenticated`);
    expect(sql).toContain(`GRANT ALL ON public.${table} TO service_role`);
    expect(sql).toContain("FOR SELECT TO authenticated USING (true)");
    expect(sql).toContain("FOR ALL TO authenticated USING (public.has_role(auth.uid(),'admin') OR public.has_role(auth.uid(),'super-admin')) WITH CHECK (public.has_role(auth.uid(),'admin') OR public.has_role(auth.uid(),'super-admin'))");
    expect(sql).toContain("EXECUTE FUNCTION public.update_updated_at_column()");
    expect(sql).not.toMatch(/GRANT[^;]+TO anon/);
  });

  it("preserves existing signup and roles instead of importing unsafe token role assignment", () => {
    expect(roles).toBeDefined();
    expect(roles).toContain("ADD VALUE IF NOT EXISTS 'user'");
    expect(roles).toContain("token_role public.app_role NOT NULL DEFAULT 'attendant'");
    const imported = [roles, schema, functions].join("\n");
    expect(imported).not.toMatch(/CREATE(?: OR REPLACE)? FUNCTION public\.(handle_new_user|assign_role_from_token|has_role)/);
    expect(imported).not.toMatch(/(?:UPDATE|DELETE FROM|ALTER TABLE) public\.(profiles|user_roles|whatsapp_sessions|whatsapp_messages|whatsapp_session_events)/);
  });

  it("does not add provider credential columns to team-readable tables", () => {
    expect(tableSql("empresa_info").split(");")[0]).not.toMatch(/\btoken\s+text/);
    expect(tableSql("webhooks_campanhas").split(");")[0]).not.toMatch(/\bcomunicacao_apikey\s+text/);
  });

  it.each(["promocoes_goodzap", "promocao_aniversario", "recuperacao_clientes"])("%s starts unscheduled without creating delivery jobs", (table) => {
    expect(tableSql(table)).toContain("agendamento_ativo boolean NOT NULL DEFAULT false");
    expect(functions).toContain(`ON public.${table} FOR EACH ROW EXECUTE FUNCTION public.tg_atualizar_next_run_at()`);
    expect([schema, functions].join("\n")).not.toMatch(/cron\.(schedule|alter_job)|net\.http_post|INSERT INTO public\./i);
  });

  it("keeps automation-only campaign reads inaccessible to anonymous and regular users", () => {
    expect(functions).toContain("REVOKE ALL ON FUNCTION public.buscar_disparos_prontos(integer) FROM PUBLIC,anon,authenticated");
    expect(functions).toContain("GRANT EXECUTE ON FUNCTION public.buscar_disparos_prontos(integer) TO service_role");
    expect(functions).not.toContain("SECURITY DEFINER");
  });
});