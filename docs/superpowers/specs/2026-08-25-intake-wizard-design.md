# New Session Intake Wizard — Design Spec

Date: 2026-08-25

## Purpose

Replace the single "topic name" prompt for creating a new session with an eight-step guided intake that captures who the learner is, then grounds the AI tutor in that context. Returning users get their profile pre-filled with a fast confirm-or-edit pass; first-time users start blank.

## Data model

Two localStorage-backed pieces, kept separate:

**1. `learningApp.profile`** — one shared, *live* profile (not per-session):
```json
{
  "learnerType": "school|university|self-directed",
  "level": "string (school: free text e.g. 'Class 10'; university: 'undergrad'|'postgrad'|'doctoral')",
  "university": "string (free text, university learners only)",
  "degree": "string (free text, e.g. 'M.Tech in Physics', university learners only)"
}
```
Fields present depend on `learnerType`:
- `school` → `level` only
- `university` → `level` + `university` + `degree`
- `self-directed` → none of the above

Editing this profile later does **not** retroactively change existing sessions' topic/subtopic/material — but since Learner/Level/University/Degree are not stored per-session at all (only referenced live from this shared profile for prompt-building at chat time), the *tutoring context* for old sessions does follow the current profile. This is a deliberate simplification confirmed with the user: there is one live profile, not per-session snapshots.

**2. Per-session fields** (added to the existing `topics[]` entries in `learningApp.state`):
```json
{
  "id": "uuid",
  "name": "string (the Topic — card title, unchanged)",
  "subtopic": "string (optional)",
  "material": "string (optional, e.g. 'NCERT Class 10 Physics')",
  "model": "string (existing field, unchanged)",
  "messages": [],
  "quizHistory": []
}
```

## Wizard flow

**Entry point:** Both Sidebar's "+ New Session" button and the empty-state's "Create Topic" button open the same `NewSessionWizard`, controlled from `App.jsx` via a single `showWizard` boolean.

**First-time user** (no saved `learningApp.profile`): wizard opens directly on the Learner step, blank.

**Returning user** (saved profile exists): wizard opens on an entry-summary screen:
> "Welcome back — {learnerType-appropriate summary, e.g. 'University student, M.Tech in Physics at XYZ'}. Still accurate?"
> Buttons: **Continue with this** / **Start Fresh**

- **Continue with this** → walks the branch-relevant profile steps (see below) pre-filled, each showing the current value with **Still true? Yes / Edit**. "Yes" advances immediately; "Edit" turns it into an editable field for that step.
- **Start Fresh** → identical to the first-time blank flow, starting at Learner.

**Branch-dependent step sequence** (after Learner is answered):

| Learner type | Steps |
|---|---|
| School | Learner → Level → Topic → Subtopic → Material → Review/Open |
| University | Learner → Level → University → Degree → Topic → Subtopic → Material → Review/Open |
| Self-directed | Learner → Topic → Subtopic → Material → Review/Open |

Step details:
1. **Learner** — three options: School / University / Self-directed.
2. **Level** — School: free-text input with 12 quick-pick chips (Class 1–12) above it, placeholder "e.g. Class 10". University: three options (Undergrad / Postgrad / Doctoral). Self-directed: step skipped.
3. **University** — free-text input for the institution name. Accepted as typed; no verification against any external database (none exists). University learners only.
4. **Degree** — free-text input for program (e.g. "M.Tech in Physics"), plus LLM-suggested chips: once a university name is entered, calls `POST /api/degrees` with `{ university, level }` and renders the returned degree names as clickable chips above the text field (clicking a chip fills the field; typing directly is always available). University learners only.
5. **Topic** — free-text input, main subject area for the session. Required.
6. **Subtopic** — free-text input, optional. Can be left blank ("skip" advances) — if blank, the AI is expected to infer it from conversation.
7. **Material** — free-text input, optional. Textbook/syllabus/course reference description, e.g. "NCERT Class 10 Physics."
8. **Review/Open** — summarizes every answered field with inline "Edit" links back to that step, plus a **Start Session** button. Clicking it: saves the profile portion to `learningApp.profile`, dispatches `ADD_TOPIC` with `{ name: topic, subtopic, material }`, closes the wizard, and selects the new session (chat opens, ready for the first message).

**Navigation:** Back/Next buttons on every step (except the first, no Back; and Review, no Next — just Start Session). A step indicator reads "Step X of N" where N is computed from the active branch's step count.

## Backend & LLM integration

**New endpoint — `POST /api/degrees`**
- Body: `{ university: string, level?: string }`
- Prompts the LLM for a JSON array of degree/program names commonly offered at that university (using the same JSON-extraction/retry pattern as `/api/quiz`).
- On failure or empty result, falls back to a small generic list (e.g. `["B.Sc", "B.Tech", "M.Sc", "M.Tech", "PhD"]`) so the step never dead-ends.
- Response: `{ degrees: string[] }`

**Extending `/api/chat` and `/api/quiz`**
- Frontend now also sends `profile` (`{ learnerType, level, university, degree }`, whichever fields apply), `subtopic`, and `material` in the request body, alongside the existing `topic` and `model`.
- Backend builds a richer system prompt, omitting any blank piece, roughly:
  > "You are a friendly, encouraging tutor. You're teaching a {level} {learnerType} student{at university}{studying degree}. Focus on {topic}{, specifically subtopic}. Ground your answers in: {material}."
- If `profile`/`subtopic`/`material` are absent (e.g. a session created before this feature existed), the prompt falls back to the original simpler wording — no crash, no blank-field artifacts.

## Component structure

- `client/src/state/useLearnerProfile.js` — new hook, mirrors `useAppState.js`'s localStorage pattern but for the single profile object under key `learningApp.profile`.
- `client/src/components/NewSessionWizard.jsx` + `NewSessionWizard.module.css` — new; **replaces `NewSessionModal.jsx` entirely** (that file and its CSS module are deleted). Internally manages: current step, form values, branch computation from `learnerType`, and renders the entry-summary / per-step / review sub-views. Calls `onComplete({ profile, topic, subtopic, material })` and `onCancel()`.
- `client/src/App.jsx` — owns `showWizard` boolean (opened by either Sidebar's or EmptyState's button, passed down as `onOpenWizard`); `handleCompleteWizard` saves the profile via `useLearnerProfile` and dispatches `ADD_TOPIC` with the new fields; passes `profile`/subtopic/material through to `fetchChatReply`/`fetchQuiz` calls.
- `client/src/state/topicsReducer.js` — `ADD_TOPIC` action accepts and stores `subtopic`/`material` (defaulting to empty string if omitted).
- `client/src/components/Sidebar.jsx` / `EmptyState.jsx` — their "+ New Session" / "Create Topic" buttons call a passed-in `onOpenWizard` instead of managing local modal state.
- `client/src/api.js` — `fetchChatReply`/`fetchQuiz` extended to accept and forward `profile`/`subtopic`/`material`.
- `server/routes/degrees.js` — new route module, registered in `server/index.js`.
- `server/routes/chat.js` / `server/routes/quiz.js` — system-prompt construction extended per above.

## Error handling

- `/api/degrees` failure: falls back to generic degree list (see above), no error shown to user — the step remains usable.
- All other error handling (chat/quiz failures, retry bubbles) unchanged from the existing spec.

## Out of scope

- File upload for Material (text description only).
- LLM-suggested chips for Topic/Subtopic (Degree only).
- Multiple saved learner profiles (one shared profile only).
- Per-session frozen snapshots of Learner/Level/University/Degree (explicitly deferred — profile is live/shared).

## Testing

- Manual click-through: first-time blank wizard for each of the three learner-type branches (School/University/Self-directed), confirming correct step sequence and skip logic.
- Manual click-through: returning-user entry screen, both "Continue with this" (per-field Still-true/Edit) and "Start Fresh" paths.
- Manual: Degree step chip suggestions populate after entering a university name; selecting a chip fills the field; free text still works if the LLM call fails.
- Manual: created session's chat opens with the enriched system prompt in effect (verify via a chat reply that reflects the stated level/topic, when an API key is configured).
- Manual: confirm old sessions created before this feature (missing `subtopic`/`material`) still render and chat normally.
