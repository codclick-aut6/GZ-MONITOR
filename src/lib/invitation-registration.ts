import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/integrations/supabase/types";

export type InvitationRegistration = {
  name: string;
  email: string;
  password: string;
  token: string;
};

type RegistrationResult = { ok: true } | { ok: false; error: string };

// Called only inside the public signup server handler, with validated input.
export async function registerWithInvitation(
  admin: SupabaseClient<Database>,
  input: InvitationRegistration,
): Promise<RegistrationResult> {
  const { data: claimed, error: claimError } = await admin
    .from("tokens")
    .update({ used: true })
    .eq("token", input.token)
    .eq("used", false)
    .is("redeemed_by", null)
    .select("id")
    .maybeSingle();

  if (claimError) return { ok: false, error: "Não foi possível validar o token." };
  if (!claimed) return { ok: false, error: "Token inválido ou já utilizado." };
  const invitationId = claimed.id;

  async function releaseReservation(): Promise<boolean> {
    const { error } = await admin.from("tokens")
      .update({ used: false })
      .eq("id", invitationId)
      .eq("used", true)
      .is("redeemed_by", null);
    return !error;
  }

  const { data: created, error: createError } = await admin.auth.admin.createUser({
    email: input.email,
    password: input.password,
    email_confirm: true,
    user_metadata: { name: input.name },
  });

  if (createError || !created.user) {
    const released = await releaseReservation();
    return {
      ok: false,
      error: released
        ? createError?.message ?? "Não foi possível criar a conta. Tente novamente."
        : "Cadastro não concluído. Peça ao administrador para verificar o convite.",
    };
  }

  const { error: finalizeError } = await admin.rpc("complete_registration_token", {
    _token_id: invitationId,
    _user_id: created.user.id,
  });

  if (!finalizeError) return { ok: true };

  // Never recycle a token while a partially created account still exists.
  const { error: deleteError } = await admin.auth.admin.deleteUser(created.user.id);
  if (deleteError) {
    return { ok: false, error: "Cadastro não concluído. Peça ao administrador para verificar a conta e o convite." };
  }
  const released = await releaseReservation();
  return {
    ok: false,
    error: released
      ? "Não foi possível concluir o cadastro. Tente novamente."
      : "Cadastro não concluído. Peça ao administrador para verificar o convite.",
  };
}