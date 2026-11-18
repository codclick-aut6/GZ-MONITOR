import { createMiddleware } from "@tanstack/react-start";
import { supabase } from "./client";

export const attachSupabaseAuth = createMiddleware({ type: "function" }).client(async ({ next }) => {
  const { data } = await supabase.auth.getSession();
  const headers = new Headers();
  if (data.session?.access_token) headers.set("Authorization", `Bearer ${data.session.access_token}`);
  return next({ headers });
});