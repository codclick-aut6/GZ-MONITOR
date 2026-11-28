# GoodZap — n8n HTTP Request

The `/admin` page manages general settings for `admin` / `super-admin` and system settings for `super-admin` only. This adds forms to the existing business tables; it does not enable automatic campaign delivery or change WhatsApp sessions.

## Fetch every setting in one request

Configure an n8n **HTTP Request** node:

- **Method:** `POST`
- **URL:** `https://oxcwbunodqtajshohfas.supabase.co/rest/v1/rpc/buscar_configuracoes_goodzap`
- **Authentication:** a saved n8n credential; never place real keys in exported workflows or browser code.
- **Headers:** `apikey: <Supabase service_role key>`; for the legacy JWT service key also `Authorization: Bearer <same service_role key>`; `Content-Type: application/json`.
- **Body:** JSON `{}`
- **Response format:** JSON

For new opaque `sb_secret_` keys, send `apikey` only, not an Authorization bearer containing that key. Anonymous keys and signed-in user JWTs cannot execute this RPC.

The result is one object, not a JSON-encoded string, with:

```json
{
  "versao": 1,
  "configuracoes_goodzap": [],
  "empresa_info": [],
  "telefones_admin_goodzap": [],
  "horario_empresa_goodzap": [],
  "promocoes_goodzap": [],
  "saudacoes_goodzap": [],
  "numeros_especiais": [],
  "sistema": {
    "instancia": "",
    "debounce_segundos": 45,
    "atendimento_segundos": 0
  }
}
```

Arrays contain **all** records, including inactive ones, with the original table column names. Empty tables return `[]`. Weekdays are ordered 0 (Sunday) through 6 (Saturday). Read active contact/greeting using `array.find(item => item.ativa === true)`; read all active promotions using `.filter(item => item.ativa === true)`. The existing response-minute fields remain in `configuracoes_goodzap`; the new timing values explicitly use **seconds** and do not overwrite those minute fields.

The current first general configuration is edited by the page; all existing configuration records are returned to avoid silently losing imported data. The initial configuration is `goodzap_status: "desativado"`, `distancia_maxima: 6`; weekdays start closed with `00:00` times, not invented opening hours. Adjust n8n to interpret `ativo` / `desativado` as appropriate before enabling the system.

## API Key

The communication API Key can be replaced in the masked field **API Key de comunicação** under **Sistema**, by super-admins only. Leave it empty to preserve the saved key. Saved keys are never fetched back into the browser or rendered, so enter a replacement to change it. The service-only RPC includes `sistema.comunicacao_apikey` for n8n use, but this guide intentionally does not show any sample key value. Map it into the provider node without logging or exporting response values. The Supabase service-role credential used to authenticate this RPC is separate from the communication API Key and must remain in n8n credentials.

The system key is not stored in `app_settings`, because that table is readable by the whole team. Only the system table's non-secret columns are readable by super-admins in the browser. Other administrators cannot read or change system settings.