# Agent Hub schema staging

The current database has the 23 business tables inferred from the source project's generated types and recorded migrations. The seven existing panel tables, auth trigger, WhatsApp lifecycle and scheduled closing job are unchanged. The legacy `user` enum label and `tokens.token_role` were added. The trigger still defaults new accounts to `attendant`; explicit invitation redemption now assigns the token-defined role atomically without changing that trigger. See `agent-hub-signup.md` for the secure compatibility flow.

## Deliberate differences

- New tables have `updated_at` and an update trigger. All are private, authenticated-readable, and admin/super-admin writable; service automation has explicit grants. No anonymous catalogue access was imported.
- `empresa_info.token` and `webhooks_campanhas.comunicacao_apikey` were omitted. Do not include credentials in exports; keep them in n8n credentials or project secrets.
- Campaign tables start empty and inactive. Scheduling calculations are installed, but no campaign sender or periodic HTTP callback was copied.
- Metrics retain the source's explicit `atualizar_metricas_clientes()` refresh, not an invented order trigger. Campaign retrieval uses the last recorded JSON payload behavior and is executable only by service automation.
- Unsafe legacy public role-assignment functions and public configuration functions were not copied. `get_full_config` has no recorded body in the snapshot and is not recreated by guessing.
- The snapshot does not include original creation statements for most business tables. JS types cannot distinguish text/date/time/timestamps or exact numeric precision. Text fields without recorded DDL remain text; numeric fields use numeric and numeric IDs use bigint identity. Exact defaults, unique constraints and external dependencies must be compared with a source schema export before switching production automation.

## Next steps

1. Open the **GoodZap Agent Hub** chat and request CSV exports for the 23 business tables, excluding provider credentials, plus a schema-only export to verify original types, defaults, indexes, constraints and functions. This project's snapshot access cannot read its live records.
2. Upload those exports in this project. Do not migrate `auth.users`, `profiles`, `user_roles` or `tokens` blindly; existing panel accounts and invitations stay authoritative.
3. Import preserved IDs and reference values; preserve opt-outs and delivery history. Keep campaigns inactive during staging. After explicit identity imports, advance each identity sequence to the highest imported ID.
4. Check record counts, JSON fields, date fields and `buscar_disparos_prontos` payloads using representative n8n inputs; confirm catalogue media remain reachable or transfer them through this project's asset/storage flow.
5. Switch n8n Supabase/Postgres credentials only after import verification. Stop the old campaign sender before enabling the new sender to avoid duplicate sends. Existing panel webhook and session closing job are unchanged.

## Regression checks

`src/lib/agent-hub-schema.test.ts` checks migration grants, policies, credential omission, default invitation role and inactive staging. Run alongside the existing lifecycle tests.

`supabase/tests/agent-hub-regression.sql` verifies the live schema, campaign timezone calculation, campaign disable, JSON persistence and explicit order metric refresh. Its temporary rows and updates are rolled back in subtransactions; it uses explicit negative IDs so sequences are not consumed.