import { describe, expect, it } from "vitest";
import { canManageGoodZap, canManageSystem, GOODZAP_DEFAULTS, validateGoodZapFields } from "./goodzap-model";

describe("GoodZap access and operational defaults", () => {
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
    expect(validateGoodZapFields("promocoes_goodzap", { promocao: "Teste", regras: "", ativa: true })).toHaveProperty("ativa", true);
    expect(() => validateGoodZapFields("promocoes_goodzap", { promocao: "Teste", regras: "", ativa: true, agendamento_ativo: true })).toThrow();
  });
});