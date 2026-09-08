# PR Review Chat — backend (Module 2: API Key Configuration)

Minimal ASP.NET Core API (`net10.0`). Its only job in this module: validate an
OpenRouter / OpenAI API key with a real provider call and, on success, write it to
the repo-root `.env` file.

## Run

```bash
cd backend
dotnet run
```

Listens on `http://localhost:5180` (see `Properties/launchSettings.json`).
CORS allows the Vite dev server at `http://localhost:5173`.

## Endpoints

### `POST /api/keys/validate`

```json
{ "provider": "openai", "apiKey": "sk-..." }
```

Sends a tiny chat-completion (`ApiKeys:ValidationPrompt`, `max_tokens 5`) to the
provider. OpenRouter is tried against each model in `Models` until one answers
(or a 401/403 rejects the key outright); `attempts` lists every try. Response is
always HTTP 200; the `ok` flag carries pass/fail:

```json
{
  "ok": true,
  "provider": "openai",
  "request":  { "url": "...", "model": "gpt-4o-mini", "prompt": "Reply with the single word: pong" },
  "response": { "status": 200, "replyText": "pong", "body": null },
  "error": null,
  "attempts": [
    { "model": "liquid/lfm-2.5-2.6b:free", "status": 404, "ok": false, "error": "HTTP 404" },
    { "model": "nvidia/nemotron-3.5-lightning:free", "status": 200, "ok": true, "error": null }
  ]
}
```

On success the key is written to `.env` as `OPENAI_API_KEY=` / `OPENROUTER_API_KEY=`.
On failure `.env` is left untouched and `error` / `response.body` explain why.
The key is only ever placed in the outgoing `Authorization` header — it is never
echoed back or logged.

### `GET /api/keys/status`

```json
{ "openai": true, "openrouter": false }
```

Re-derived from `.env` on every call, so a validated key still reads as connected
after a restart.

## Configuration (`appsettings.json` → `ApiKeys`)

| Key | Purpose | Default |
| --- | --- | --- |
| `DotEnvPath` | Absolute path to `.env`. Empty = one level up from the backend. | `""` |
| `CorsOrigin` | Allowed browser origin. | `http://localhost:5173` |
| `ValidationPrompt` | Prompt sent to the provider. | `Reply with the single word: pong` |
| `MaxTokens` | `max_tokens` for the validation call. | `5` |
| `Providers.<name>.EnvVar` | `.env` key name. | `OPENAI_API_KEY` / `OPENROUTER_API_KEY` |
| `Providers.<name>.ChatCompletionsUrl` | Endpoint hit for validation. | provider default |
| `Providers.<name>.Model` | Single ping model (used when `Models` is empty). | `gpt-4o-mini` (openai) |
| `Providers.<name>.Models` | Ordered candidate models; tried until one accepts the key. | 4 free models (openrouter) |

> The OpenAI model defaults to `gpt-4o-mini` (there is no "gpt-10-mini"). Change
> `ApiKeys:Providers:openai:Model` if you want a different one.

## Not in this module

Using the stored keys to power analysis/review calls — that wiring comes later.
