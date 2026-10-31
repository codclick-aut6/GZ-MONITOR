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
