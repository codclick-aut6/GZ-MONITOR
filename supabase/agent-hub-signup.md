# Unified invitation signup

The connected database now supports exact-token validation and authenticated, self-only invitation redemption. Token rows remain private; do not add anonymous table read policies.

The Monitor signup reserves the token server-side, creates a named account and completes the token-defined role through the service-only `complete_registration_token` function. If completion fails, it removes the newly created account before releasing the token. Existing profiles, the signup trigger and WhatsApp data remain unchanged.

## Separate GoodZap Agent Hub frontend

That project's snapshot is read-only from this chat. Its live frontend must be updated in the GoodZap Agent Hub chat; this database change alone cannot repair its direct anonymous `tokens` query.

Replace the pre-signup `.from("tokens").select("id, used").eq("token", ...).maybeSingle()` with:

```typescript
const { data: valid, error: tokenError } = await supabase.rpc(
  "validate_registration_token", { _token: token.trim() },
);
if (tokenError) throw tokenError;
if (!valid) throw new Error("Token inválido ou já utilizado.");
```

Preserve the `assign_role_from_token` call's argument names, but call it only after there is an authenticated session for the newly created user. The function rejects anonymous callers and any `_user_id` different from the authenticated user's ID. It takes the role only from the private token and consumes it atomically.

If email confirmation is enabled, Supabase signup does not return a session. Do not call the assignment RPC while anonymous or claim the invitation has been consumed. After email confirmation and sign-in, collect the invitation again and redeem it as the authenticated user. Do not persist the token in localStorage, a URL or user metadata.

Never grant anonymous `assign_role_from_token` execution or anonymous token-table access to bypass this requirement. Confirm the separate project's Supabase URL points to the unified database before publishing its update.

## Verification

- `src/lib/invitation-registration.test.ts`: reservation, name persistence input, successful completion, invalid tokens and cleanup failures.
- `supabase/tests/invitation-registration-regression.sql`: exact validation, all four roles, anonymous/other-account rejection, single-use, atomic rollback and service-only completion, with all fixture writes rolled back.
- Authenticated browser checks cannot be performed with the external unmanaged Supabase connection in this chat; do not treat public-form checks as successful account creation.