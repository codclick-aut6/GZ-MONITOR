import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

const schema = z.object({
  name: z.string().trim().min(2).max(100),
  email: z.string().trim().email().max(255),
  password: z.string().min(6).max(72),
  token: z.string().trim().min(1).max(200),
});

export const signUpWithToken = createServerFn({ method: "POST" })
  .inputValidator((d: unknown) => schema.parse(d))
  .handler(async ({ data }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    // Claim the token atomically: only succeeds if it exists and is unused.
    const { data: claimed, error: claimErr } = await supabaseAdmin
      .from("tokens")
      .update({ used: true })
      .eq("token", data.token)
      .eq("used", false)
      .select("id");
    if (claimErr) return { ok: false as const, error: "Não foi possível validar o token." };
    if (!claimed || claimed.length === 0) {
      return { ok: false as const, error: "Token inválido ou já utilizado." };
    }

    const { data: created, error: createErr } = await supabaseAdmin.auth.admin.createUser({
      email: data.email,
      password: data.password,
      email_confirm: true,
      user_metadata: { name: data.name },
    });
    if (!createErr && created.user) {
      await supabaseAdmin.from("profiles").update({ name: data.name }).eq("id", created.user.id);
    }
    if (createErr) {
      // Release the token so it can be reused.
      await supabaseAdmin.from("tokens").update({ used: false }).eq("id", claimed[0]!.id);
      return { ok: false as const, error: createErr.message };
    }
    return { ok: true as const };
  });
