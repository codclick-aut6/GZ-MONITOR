import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { registerWithInvitation } from "./invitation-registration";

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
    return registerWithInvitation(supabaseAdmin, data);
  });
