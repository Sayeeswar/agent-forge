# Self-Learning AI Tutor — Design Spec

Date: 2026-08-25

## Purpose

A personal AI tutor web app. User picks/creates a topic, chats with an AI tutor about it, and can trigger a quiz mode for that topic. Rich, warm, friendly UI — not a bare chat box.

## Visual style

**Warm & Playful.** Cream background (`#FFF8F0`), coral accent (`#FF8A5B`), rounded chat bubbles (user messages right-aligned coral, AI messages left-aligned white with soft shadow), friendly sans-serif type. All colors/spacing defined as CSS variables in `theme.css` for easy tuning later.

## Architecture

- Single repo, two parts:
  - `client/` — React + Vite frontend, plain CSS Modules (no Tailwind/styled-components)
  - `server/` — small Express proxy holding the OpenAI API key
- `npm run dev` at repo root runs both concurrently (`concurrently` package) — Vite dev server + Express on separate ports, Vite proxies `/api/*` to Express in dev config
- No database, no auth. Single-user, browser-local scope.

## Frontend structure

- **`App.jsx`** — top-level layout: `Sidebar` (left) + `ChatWindow` (main), sidebar layout locked in from mockup review
- **`Sidebar`**
  - Topic list, user-defined: add / rename / delete custom topics (stored in app state)
  - Each topic holds one continuous chat thread (no separate "sessions" per topic) — clicking a topic in the sidebar loads that thread into `ChatWindow`
  - "New Topic" button opens small inline form (name only, no icon picker — keep simple)
- **`ChatWindow`**
  - Message bubbles per style above
  - Text input bar at bottom + send button
  - Header row with topic name + "Start Quiz" button
- **`QuizCard`** — rendered inline inside the chat message stream (not a fullscreen overlay — inline chat card style confirmed in mockup review)
  - Shows "QUIZ · Q1 of N", question text, options (multiple choice), highlights correct/incorrect after user picks
  - After quiz ends, a small summary bubble ("2/3 correct!") posts back into the chat like a normal AI message
- **Empty state** — when no topic exists/selected yet, main panel shows a friendly prompt to create the first topic (no bare blank screen)
- **`theme.css`** — CSS custom properties for all colors/radii/spacing used above

## Backend proxy (`server/index.js`)

- `dotenv` loads `OPENAI_API_KEY` server-side only; never sent to client
- `POST /api/chat`
  - Body: `{ topic: string, history: [{role, content}], message: string }`
  - Builds a system prompt from `topic` (e.g. "You are a friendly tutor teaching {topic}...")
  - Calls OpenAI chat completions (non-streaming) with `history + message`
  - Returns `{ reply: string }`
- `POST /api/quiz`
  - Body: `{ topic: string }`
  - Prompts OpenAI to return strict JSON: `{ question: string, options: string[3-4], correctIndex: number }`
  - Parses response; if JSON invalid, retries the request once server-side before returning a 500 error
- CORS restricted to the local dev origin (Vite's port)
- Responses are single complete messages — no streaming/SSE (simpler proxy + frontend, acceptable per user choice)

## Data model & persistence

- `localStorage` key `learningApp.state`:
  ```json
  {
    "topics": [
      {
        "id": "uuid",
        "name": "Math",
        "messages": [{ "role": "user|assistant", "content": "..." }],
        "quizHistory": [{ "date": "...", "score": "2/3" }]
      }
    ]
  }
  ```
- State saved to `localStorage` on every message send/receive and on quiz completion
- Loaded once on app mount into React state (`useState` + `useEffect`, no external state library needed at this scope)

## Error handling

- `/api/chat` or `/api/quiz` network/API failure → an inline error bubble in the chat ("Hmm, couldn't reach the tutor — try again") with a retry button that resends the last message
- Quiz generation failure (after server-side retry) → error card in place of the quiz card, with a "Try again" action
- No silent failures — every error path shows the user something actionable

## Out of scope (for this spec)

- Streaming responses
- Multi-user accounts / real backend database
- Fixed/curated topic list (topics are fully user-defined instead)
- Fullscreen quiz mode (inline card chosen instead)

## Testing

- Component-level: render `Sidebar`, `ChatWindow`, `QuizCard` in isolation with mock props, verify topic switching, message rendering, quiz option selection/feedback states
- Backend: unit test `/api/chat` and `/api/quiz` route handlers with a mocked OpenAI client (success case, malformed-JSON retry case, failure case)
- Manual: click through create topic → chat → start quiz → answer → see summary, confirm persists across page reload
