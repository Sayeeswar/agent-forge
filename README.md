# PR Review Chat

A chat interface for reviewing GitHub PRs and local code with an AI assistant.

- **Frontend:** React (this repo, `frontend/`)
- **Backend:** C# (later modules)

## Module 1 — Chat UI shell (current)

Frontend only. UI and input handling on placeholder/sample data. No backend, no GitHub
API, no review logic — those come in later modules.

What Module 1 includes:

- Claude-style chat window: message history + input box.
- Model-selector dropdown (placeholder model list).
- "+" menu in the composer: paste a GitHub PR link, or give a local file/folder path.
- A source switcher — a PR link and a local path are stored independently; one is active.
- Collapsible right-side code panel. Opens on demand or auto-opens when a canned reply
  proposes code. Shows code only; explanations stay in the chat.
- "Make changes to the code" button in the panel: enabled when the active source is a
  local path (click shows a stub path prompt with no effect), disabled for a GitHub PR
  source. Real apply logic is a later module.
- Spinner with cycling placeholder status messages while a reply is "loading";
  replies then render all at once (no streaming).

### Run

```bash
cd frontend
npm install
npm run dev
```

Then open the printed dev URL (default `http://localhost:5173`).
