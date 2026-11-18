<!-- LOVABLE:BEGIN -->
> [!IMPORTANT]
> This project is connected to [Lovable](https://lovable.dev). Avoid rewriting
> published git history — force pushing, or rebasing/amending/squashing commits
> that are already pushed — as it rewrites history on Lovable's side and the
> user will likely lose their project history.
>
> Commits you push to the connected branch sync back to Lovable and show up in
> the editor, so keep the branch in a working state.
<!-- LOVABLE:END -->

- Fetch WhatsApp messages for the selected session with pagination rather than a global row limit, so recent conversations remain visible as history grows.
- Keep unread acknowledgement and badge aggregation in the shared unread-message module: await the Supabase write after history loads, check the observed count before resetting, and apply local zero only after persistence succeeds so reloads and concurrent arrivals stay consistent.
- Keep closed-session unread counts at zero with a database trigger as well as the close action, because n8n can update sessions independently of the interface.
- Run focused Vitest tests for unread-message persistence and lifecycle rules; database migration regressions must roll back their temporary test data.
- Persist assignment notices in the team-only `whatsapp_session_events` table via an atomic session-update trigger and merge them into the selected conversation timeline; separate events avoid WhatsApp delivery and unread side effects. Guard assignment updates against a changed status or assignee to prevent stale claims.
- Coordinate panel claims and automation through `assumeConversationAndNotify`: emit a typed webhook event only after a persisted assignment change, and report delivery failures separately without undoing assignment or inserting WhatsApp messages.
- Merge Agent Hub business tables additively; preserve the panel's auth trigger, role policies, token claims and WhatsApp lifecycle, because imported schema must not change active attendance or grant privileges.
- Keep imported business data team-readable and admin-writable through RLS; omit provider credentials from business tables and do not activate campaign delivery during schema staging, because copying structure must not expose secrets or duplicate sends.
- Keep invitation rows private; expose only exact-token boolean validation and authenticated self-only role redemption through invoker RPC wrappers over a non-exposed schema, because anonymous table access or caller-selected account IDs enable privilege escalation.
- Coordinate signup through registerWithInvitation: reserve once, create the account, finalize its token-defined role atomically, and remove a failed partial account before recycling the reservation, because account creation and database transactions cannot share a transaction.
- Place GoodZap management under the client-only authenticated layout and validate roles and allowlisted fields in authenticated server functions; RLS remains the write boundary and preserves attendance routes.
- Store system settings in a super-admin-only singleton; the communication key is write-only in the UI with column-level read revocation and excluded from server page projections, but included in the service-only n8n RPC; never log or echo credential values.
- Use the atomic exclusive-settings RPC and partial unique indexes for greetings and contact groups so concurrent activations cannot leave multiple active records.
