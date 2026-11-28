import type { SupabaseClient } from "@supabase/supabase-js";
import { beforeEach, describe, expect, it, vi } from "vitest";
import type { Database } from "@/integrations/supabase/types";
import { registerWithInvitation } from "./invitation-registration";

const input = { name: "Doug", email: "doug@example.test", password: "test-password", token: "test-invitation" };

function fixture() {
  const claim = vi.fn().mockResolvedValue({ data: { id: "invitation-id" }, error: null });
  const release = vi.fn().mockResolvedValue({ error: null });
  const reservations: unknown[][] = [];
  const from = vi.fn(() => {
    const filters: unknown[] = [];
    const chain = {
      update: vi.fn((patch) => { filters.push(patch); return chain; }),
      eq: vi.fn((column, value) => { filters.push([column, value]); return chain; }),
      is: vi.fn((column, value) => { filters.push([column, value]); return chain; }),
      select: vi.fn(() => chain),
      maybeSingle: claim,
      then: (resolve: (value: unknown) => unknown, reject: (reason: unknown) => unknown) => release().then(resolve, reject),
    };
    reservations.push(filters);
    return chain;
  });
  const createUser = vi.fn().mockResolvedValue({ data: { user: { id: "new-user" } }, error: null });
  const deleteUser = vi.fn().mockResolvedValue({ error: null });
  const rpc = vi.fn().mockResolvedValue({ error: null });
  const client = { from, auth: { admin: { createUser, deleteUser } }, rpc } as unknown as SupabaseClient<Database>;
  return { client, claim, release, reservations, createUser, deleteUser, rpc };
}

describe("invitation signup", () => {
  let f: ReturnType<typeof fixture>;
  beforeEach(() => { f = fixture(); });

  it("reserves exactly the provided unused, unredeemed token before creating an account", async () => {
    await registerWithInvitation(f.client, input);
    expect(f.reservations[0]).toEqual([{ used: true }, ["token", "test-invitation"], ["used", false], ["redeemed_by", null]]);
    expect(f.claim.mock.invocationCallOrder[0]).toBeLessThan(f.createUser.mock.invocationCallOrder[0] ?? 0);
  });

  it("rejects an invalid or used token without creating any account", async () => {
    f.claim.mockResolvedValue({ data: null, error: null });
    expect(await registerWithInvitation(f.client, input)).toEqual({ ok: false, error: "Token inválido ou já utilizado." });
    expect(f.createUser).not.toHaveBeenCalled();
    expect(f.rpc).not.toHaveBeenCalled();
  });

  it("fails closed when reservation persistence fails", async () => {
    f.claim.mockResolvedValue({ data: null, error: { message: "failure" } });
    expect((await registerWithInvitation(f.client, input)).ok).toBe(false);
    expect(f.createUser).not.toHaveBeenCalled();
  });

  it("saves the name through signup metadata without accepting a caller-selected role", async () => {
    await registerWithInvitation(f.client, input);
    expect(f.createUser).toHaveBeenCalledWith({ email: "doug@example.test", password: "test-password", email_confirm: true, user_metadata: { name: "Doug" } });
  });

  it("finalizes the invitation role only for the user actually created", async () => {
    expect(await registerWithInvitation(f.client, input)).toEqual({ ok: true });
    expect(f.rpc).toHaveBeenCalledExactlyOnceWith("complete_registration_token", { _token_id: "invitation-id", _user_id: "new-user" });
    expect(f.release).not.toHaveBeenCalled();
  });

  it("releases only its unredeemed reservation after account creation fails", async () => {
    f.createUser.mockResolvedValue({ data: { user: null }, error: { message: "Email already registered" } });
    expect((await registerWithInvitation(f.client, input)).ok).toBe(false);
    expect(f.reservations[1]).toEqual([{ used: false }, ["id", "invitation-id"], ["used", true], ["redeemed_by", null]]);
    expect(f.rpc).not.toHaveBeenCalled();
  });

  it("does not claim success if Auth returns no user", async () => {
    f.createUser.mockResolvedValue({ data: { user: null }, error: null });
    expect((await registerWithInvitation(f.client, input)).ok).toBe(false);
    expect(f.release).toHaveBeenCalledOnce();
  });

  it("deletes the partial account before releasing an invitation if role completion fails", async () => {
    f.rpc.mockResolvedValue({ error: { message: "failure" } });
    expect((await registerWithInvitation(f.client, input)).ok).toBe(false);
    expect(f.deleteUser).toHaveBeenCalledExactlyOnceWith("new-user");
    expect(f.deleteUser.mock.invocationCallOrder[0]).toBeLessThan(f.release.mock.invocationCallOrder[0] ?? 0);
  });

  it("keeps the invitation reserved if the incomplete account cannot be removed", async () => {
    f.rpc.mockResolvedValue({ error: { message: "failure" } });
    f.deleteUser.mockResolvedValue({ error: { message: "failure" } });
    expect((await registerWithInvitation(f.client, input)).ok).toBe(false);
    expect(f.release).not.toHaveBeenCalled();
  });

  it("reports a failed reservation release instead of silently asking to retry", async () => {
    f.createUser.mockResolvedValue({ data: { user: null }, error: { message: "failure" } });
    f.release.mockResolvedValue({ error: { message: "failure" } });
    const result = await registerWithInvitation(f.client, input);
    expect(result).toEqual({ ok: false, error: "Cadastro não concluído. Peça ao administrador para verificar o convite." });
  });
});