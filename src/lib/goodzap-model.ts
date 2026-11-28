import { z } from "zod";

export const GOODZAP_DEFAULTS = { distancia_maxima: 6, debounce_segundos: 45, atendimento_segundos: 0 };
export function canManageGoodZap(roles: string[]) {
  return roles.includes("admin") || roles.includes("super-admin");
}
export function canManageSystem(roles: string[]) {
  return roles.includes("super-admin");
}
export function isValidBrDate(value: string) {
  const m = /^(\d{2})\/(\d{2})\/(\d{4})$/.exec(value);
  if (!m) return false;
  const [d, mo, y] = [Number(m[1]), Number(m[2]), Number(m[3])];
  const date = new Date(Date.UTC(y, mo - 1, d));
  return date.getUTCFullYear() === y && date.getUTCMonth() === mo - 1 && date.getUTCDate() === d;
}
const text = z.string().trim().max(5000);
const phone = z.string().trim().regex(/^\+?[0-9 ()-]{8,25}$/, "Informe um telefone válido.");
export const fieldSchemas = {
  configuracoes_goodzap: z.object({ goodzap_status: z.enum(["ativo", "desativado"]), distancia_maxima: z.number().min(0).max(10000) }).strict(),
  empresa_info: z.object({ nome_empresa: text.min(1), telefone_empresa: phone, whatsapp_empresa: phone, cep_empresa: z.string().regex(/^\d{5}-?\d{3}$/, "Informe um CEP válido."), rua_empresa: text.min(1), numero_empresa: text.min(1), bairro_empresa: text.min(1), cidade_empresa: text.min(1) }).strict(),
  telefones_admin_goodzap: z.object({ numero_atendente: phone, numero_gerente: phone, ativa: z.boolean() }).strict(),
  horario_empresa_goodzap: z.object({ dia_semana_nome: z.string().min(1).max(30), abre_as: z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/), fecha_as: z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/), ativo: z.boolean() }).strict(),
  promocoes_goodzap: z.object({ promocao: text.min(1), regras: text, validade: z.string().trim().refine((v) => v === "" || isValidBrDate(v), "Informe a validade no formato dd/mm/aaaa."), utm: z.string().trim().max(500), ativa: z.boolean() }).strict(),
  saudacoes_goodzap: z.object({ saudacao: text.min(1), ativa: z.boolean() }).strict(),
  numeros_especiais: z.object({ nome: text.min(1), telefone: phone }).strict(),
  goodzap_sistema: z.object({ instancia: z.string().trim().max(200), debounce_segundos: z.number().int().min(0).max(3600), atendimento_segundos: z.number().int().min(0).max(86400), comunicacao_apikey: z.string().trim().max(4096).optional(), url_cardapio: z.union([z.literal(""), z.string().trim().url("Informe uma URL válida.").max(2000)]).optional() }).strict(),
};
export const tableSchema = z.enum(["configuracoes_goodzap", "empresa_info", "telefones_admin_goodzap", "horario_empresa_goodzap", "promocoes_goodzap", "saudacoes_goodzap", "numeros_especiais", "goodzap_sistema"]);
export type GoodZapTable = z.infer<typeof tableSchema>;
export function canAccessGoodZapTable(roles: string[], table: GoodZapTable) {
  return table === "promocoes_goodzap" ? canManageGoodZap(roles) : canManageSystem(roles);
}
export type GoodZapRow = Record<string, string | number | boolean | null>;
export type GoodZapData = { roles: string[]; rows: Record<GoodZapTable, GoodZapRow[]> };
export const editableLists: GoodZapTable[] = ["telefones_admin_goodzap", "promocoes_goodzap", "saudacoes_goodzap", "numeros_especiais"];
export function validateGoodZapFields(table: GoodZapTable, fields: unknown) {
  return fieldSchemas[table].parse(fields);
}

export type Field = { key: string; label: string; type?: "tel" | "number" | "time" | "textarea" | "password" | "url"; min?: number; max?: number };
export const COMPANY_FIELDS: Field[] = [
  { key: "nome_empresa", label: "Nome da empresa" }, { key: "telefone_empresa", label: "Telefone", type: "tel" },
  { key: "whatsapp_empresa", label: "WhatsApp", type: "tel" }, { key: "cep_empresa", label: "CEP" },
  { key: "rua_empresa", label: "Rua" }, { key: "numero_empresa", label: "Número" },
  { key: "bairro_empresa", label: "Bairro" }, { key: "cidade_empresa", label: "Cidade" },
];
export const LIST_SECTIONS: { table: GoodZapTable; title: string; fields: Field[]; active?: boolean; titleKey: string }[] = [
  { table: "telefones_admin_goodzap", title: "Telefones de contato", fields: [{ key: "numero_atendente", label: "Telefone do atendente", type: "tel" }, { key: "numero_gerente", label: "Telefone do gerente", type: "tel" }], active: true, titleKey: "numero_atendente" },
    { table: "saudacoes_goodzap", title: "Saudações", fields: [{ key: "saudacao", label: "Saudação", type: "textarea" }], active: true, titleKey: "saudacao" },
  { table: "numeros_especiais", title: "Números especiais", fields: [{ key: "nome", label: "Nome" }, { key: "telefone", label: "Telefone", type: "tel" }], titleKey: "nome" },
];export const CAMPAIGN_SECTION = { table: "promocoes_goodzap" as GoodZapTable, title: "Promoções", fields: [{ key: "promocao", label: "Nome da Promoção" }, { key: "validade", label: "Validade da Promoção (dd/mm/aaaa)" }, { key: "utm", label: "UTM da Promoção" }, { key: "regras", label: "Regras", type: "textarea" }] as Field[], active: true, titleKey: "promocao" };
