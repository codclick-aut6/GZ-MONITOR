import { describe, expect, it } from "vitest";
import { canAccessGoodZapTable, canManageGoodZap, canManageSystem, GOODZAP_DEFAULTS, tableSchema, validateGoodZapFields } from "./goodzap-model";

describe("GoodZap access and operational defaults", () => {
  it("denies admins access to every configuration table", () => {
    for (const table of tableSchema.options.filter((t) => t !== "promocoes_goodzap")) {
      expect(canAccessGoodZapTable(["admin"], table)).toBe(false);
    }
  });
  it("allows super-admins access to every configuration table", () => {
    for (const table of tableSchema.options) expect(canAccessGoodZapTable(["super-admin"], table)).toBe(true);
  });
  it("preserves admin campaign access without granting attendants access", () => {
    expect(canAccessGoodZapTable(["admin"], "promocoes_goodzap")).toBe(true);
    expect(canAccessGoodZapTable(["attendant"], "promocoes_goodzap")).toBe(false);
  });
  it("defaults delivery to 6 km", () => expect(GOODZAP_DEFAULTS.distancia_maxima).toBe(6));
  it("defaults debounce to 45 seconds", () => expect(GOODZAP_DEFAULTS.debounce_segundos).toBe(45));
  it("defaults attendant delay to 0 seconds", () => expect(GOODZAP_DEFAULTS.atendimento_segundos).toBe(0));
  it("allows only admin and super-admin to manage general settings", () => {
    expect(canManageGoodZap(["admin"])).toBe(true);
    expect(canManageGoodZap(["super-admin"])).toBe(true);
    expect(canManageGoodZap(["attendant"])).toBe(false);
    expect(canManageGoodZap(["user"])).toBe(false);
    expect(canManageGoodZap([])).toBe(false);
  });
  it("restricts system settings to super-admin", () => {
    expect(canManageSystem(["super-admin"])).toBe(true);
    expect(canManageSystem(["admin"])).toBe(false);
  });
  it("denies Configurações access to attendants", () => {
    expect(canManageSystem(["attendant"])).toBe(false);
  });
  it("denies Configurações access when no super-admin role is available", () => {
    expect(canManageSystem([])).toBe(false);
    expect(canManageSystem(["admin", "attendant"])).toBe(false);
  });
  it("rejects arbitrary provider field names", () => {
    expect(() => validateGoodZapFields("goodzap_sistema", { instancia: "test", debounce_segundos: 45, atendimento_segundos: 0, apikey: "not-a-real-secret" })).toThrow();
  });
  it("accepts a communication key replacement in the system schema only", () => {
    expect(() => validateGoodZapFields("goodzap_sistema", { instancia: "test", debounce_segundos: 45, atendimento_segundos: 0, comunicacao_apikey: "fixture-only" })).not.toThrow();
    expect(() => validateGoodZapFields("configuracoes_goodzap", { goodzap_status: "ativo", distancia_maxima: 6, comunicacao_apikey: "fixture-only" })).toThrow();
  });
  it("preserves the key when saving system timings without a replacement", () => {
    expect(validateGoodZapFields("goodzap_sistema", { instancia: "test", debounce_segundos: 45, atendimento_segundos: 0 })).not.toHaveProperty("comunicacao_apikey");
  });
  it("rejects invalid times and accepts closed midnight hours", () => {
    expect(() => validateGoodZapFields("horario_empresa_goodzap", { dia_semana_nome: "Domingo", abre_as: "25:00", fecha_as: "12:00", ativo: false })).toThrow();
    expect(validateGoodZapFields("horario_empresa_goodzap", { dia_semana_nome: "Domingo", abre_as: "00:00", fecha_as: "00:00", ativo: false })).toHaveProperty("ativo", false);
  });
  it("keeps independent promotion activation and excludes scheduling writes", () => {
    expect(validateGoodZapFields("promocoes_goodzap", { promocao: "Teste", regras: "", validade: "", utm: "", ativa: true })).toHaveProperty("ativa", true);
    expect(() => validateGoodZapFields("promocoes_goodzap", { promocao: "Teste", regras: "", validade: "", utm: "", ativa: true, agendamento_ativo: true })).toThrow();
  });
});

describe("promotion validity", () => {
  it("accepts dd/mm/aaaa and rejects other formats or impossible dates", () => {
    const base = { promocao: "P", regras: "", utm: "utm_source=whatsapp", ativa: true };
    expect(validateGoodZapFields("promocoes_goodzap", { ...base, validade: "31/12/2026" })).toHaveProperty("validade", "31/12/2026");
    expect(() => validateGoodZapFields("promocoes_goodzap", { ...base, validade: "2026-12-31" })).toThrow();
    expect(() => validateGoodZapFields("promocoes_goodzap", { ...base, validade: "31/02/2026" })).toThrow();
  });
});
