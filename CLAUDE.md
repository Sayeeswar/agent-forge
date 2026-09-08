# CLAUDE.md — working rules for this repository

Project: **PR Review Chat**. React frontend in `frontend/`, C# ASP.NET Core
backend in `backend/`. A shared, git-ignored `.env` at the repo root holds keys.

These rules are binding for any change made in this repo.

## Architecture: all LLM work lives in the C# backend

- **Every LLM / model-provider interaction happens in the backend (`backend/`),
  never in React.** This includes HTTP calls to OpenAI, OpenRouter, or any other
  model provider, and the prompts that drive them.
- The frontend **never** calls a model provider directly and **never** holds an
  API key. It only calls this project's own C# endpoints under `/api/*`
  (e.g. `POST /api/analyze`, `POST /api/keys/validate`, `POST /api/github/validate`).
- **Prompt text is authored and stored in C#** — system prompts, instruction
  templates, few-shot examples, and JSON schemas for structured output live in
  backend code (e.g. `backend/Services/CodeAnalyzer.cs`) or backend config
  (`backend/appsettings.json`). The frontend may forward the user's own typed
  message as an `instruction` value, but must not contain authored prompt text
  or default prompt strings.
- **Adding a model feature** = new/extended backend endpoint + service + prompt
  in C#, then only a thin `fetch` wrapper in `frontend/src/lib/*Api.js` that
  calls that endpoint. Never reach for a provider SDK or provider URL in the
  frontend.

## API keys and secrets

- Keys/tokens are validated and written to the repo-root `.env` by the **backend
  only**, on a successful validation call.
- `.env` and `.env.*` are git-ignored. Never commit a key or token. Never paste a
  real key into source, config, or a shell command.

## Testing and execution

- **Claude must never execute frontend tests, and must never run or drive the
  frontend UI for testing purposes.** The user performs all frontend testing and
  verification themselves.
- Claude *may*: compile/build the frontend (`npm run build`) as a correctness
  check, build and run the backend, run backend tests, hit backend endpoints
  with `curl`, and start the dev servers when asked.
- When a change is ready, Claude reports what changed and where, starts the
  servers if useful, and hands the running app to the user for frontend testing.

## Servers (for reference)

- Backend: `cd backend && dotnet run` → `http://localhost:5180`
- Frontend: `cd frontend && npm run dev` → `http://localhost:5173`
  (Vite proxies `/api` → `5180`)
