# PR Review Chat

A chat app that reviews code with an LLM. Point it at a **GitHub pull request** or
a **local file**, connect your own OpenAI / OpenRouter key, and an assistant
reviews the code: findings (what's wrong, why, file + line, severity) show in the
chat, and suggested **before/after** fixes show in a collapsible side panel.
Follow-up questions in the chat continue the review.

- **Frontend:** React + Vite (`frontend/`) — UI only. It calls the backend's
  `/api/*` endpoints, never a model provider, and never holds a key.
- **Backend:** C# ASP.NET Core, `net10.0` (`backend/`) — all provider/LLM calls
  and all prompt text live here. Validated keys are written to a git-ignored
  `.env` at the repo root.

See [`CLAUDE.md`](CLAUDE.md) for the binding architecture rules.

## What it does

1. **Connect providers.** A "Connect API" popup takes an OpenAI or OpenRouter API
   key and a GitHub personal-access token. The backend validates each with a real
   call (`chat/completions` ping for LLM keys, `GET /user` for GitHub) and only
   writes it to `.env` on success. Status dots by the model dropdown show what's
   connected; a validated key survives a restart.
2. **Pick a source** from the composer's "+" menu:
   - **GitHub PR link** → the backend fetches the PR (metadata, changed files,
     per-file diff, and each file's full content at the PR head) and renders it
     in the panel.
   - **Local file path** → the backend checks the path exists and is a file
     (not a folder), **auto-exports a `.ipynb`** to a Python script (code cells
     concatenated, magics commented out, markdown kept as comments) and reviews
     that, sends images to a vision model, rejects other binaries (spreadsheets,
     PDF, archives) with a "convert to text first" note, and reads text/code
     as-is.
3. **Review.** "Analyse this PR" (or submitting a file) sends the code to the
   model selected in the dropdown. The backend prompts for a structured JSON
   result and returns:
   - **findings** — syntax / type / logic / failing-test / lint issues plus
     clean-code checks (naming, DRY, SOLID, error handling, security basics,
     performance, language idioms, consistency), each with a root cause,
     `file:line`, and severity **Low / Medium / High**.
   - **suggestions** — corrected code as before/after pairs.
   The chat shows explanations only (no code); the panel shows the code only.
4. **Iterate.** While a PR or file is active, chat messages are real follow-up
   calls. To keep token cost down, the file/PR content is sent **once**; each
   follow-up sends only the conversation so far plus the new question.

## Run

Backend (terminal 1):

```bash
cd backend
dotnet run
```

Serves `http://localhost:5180`.

Frontend (terminal 2):

```bash
cd frontend
npm install
npm run dev
```

Open `http://localhost:5173` (Vite proxies `/api` to the backend).

## Backend endpoints

| Endpoint | Purpose |
| --- | --- |
| `POST /api/keys/validate` | Validate an OpenAI/OpenRouter key; write to `.env` on success |
| `GET  /api/keys/status` | Per-provider connected state (from `.env`) |
| `POST /api/github/validate` | Validate a GitHub token via `GET /user`; write `GITHUB_TOKEN` on success |
| `GET  /api/github/status` | GitHub connected state |
| `GET  /api/github/pr?url=` | Fetch a PR: metadata + files + diffs + file content |
| `POST /api/analyze` | Structured LLM review of supplied code / images |
| `POST /api/file/review` | Validate a local file path and route it to the analyzer |

## Configuration

- **`.env`** (repo root, git-ignored, written by the backend — never commit):
  `OPENAI_API_KEY`, `OPENROUTER_API_KEY`, `GITHUB_TOKEN`.
- **`backend/appsettings.json`** — tunables under `ApiKeys` (provider URLs,
  validation models), `GitHub` (file/content caps), `Analysis` (input/token
  caps, temperature), `FileReview` (max file / image bytes).

## Not in scope yet

- Running the reviewed code — sandboxed execution is a separate module.
- Applying fixes to disk — the panel's "Make changes to the code" button is a
  stub.
- Folder review — the local-file flow is file-only.
- Extracting content from Excel/PDF/other binaries — returns an "unsupported"
  message.
- The composer's canned placeholder replies remain only when no PR/file source
  is active.
