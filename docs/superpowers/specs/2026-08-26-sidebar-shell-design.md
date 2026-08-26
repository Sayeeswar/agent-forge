# Sidebar Shell (Module 1 of 4) — Design Spec

Date: 2026-08-26

## Context

This is Module 1 of a 4-part sidebar redesign, modeled on a reference app's structure (nav rail + Previous Sessions cards + collapse behavior) but adapted to this app's existing chat/session model. The 4 modules, each with its own spec and approval gate before moving on:

1. **Sidebar shell** (this spec) — collapse/expand, nav routing, Previous Sessions cards, sessions grid view.
2. Technique Bank — persistent cross-session map of problem-solving techniques (topic regions, square/circle/diamond nodes by technique kind). Deferred to its own spec.
3. Skills — deferred to its own spec (content/meaning of the "N on" badge not yet defined).
4. Settings — deferred to its own spec (content not yet defined).

Modules 2–4 are represented in this module only as placeholder panels ("Coming soon"), reachable via nav but with no real content yet.

**Explicitly out of scope for this module:** a "Start" nav item (dropped per user decision — the reference image's 5-item nav becomes 4 items here: Session, Technique Bank, Skills, Settings).

## Data model

Each topic (session) gains one new field:
```json
{
  "lastActivityAt": "ISO 8601 timestamp string"
}
```
- Set at creation time (`ADD_TOPIC`).
- Updated to "now" every time `ADD_MESSAGE` fires for that topic.
- Drives both the relative-date label ("today"/"2d"/"4d") and the sort order of the Previous Sessions list (most recently active first).
- Sessions created before this feature existed won't have this field; treat missing `lastActivityAt` as "no date to show" rather than crashing (fall back to not rendering a date badge for that card).

## Routing

New state in `App.jsx`: `activePanel`, one of:
- `null` (default) — main area shows the `ChatWindow` for `selectedTopicId`, or `EmptyState` if none selected. Unchanged from current behavior.
- `'sessions'` — main area shows the full `SessionsGrid` (all sessions, 2-column scrollable).
- `'techniqueBank'` | `'skills'` | `'settings'` — main area shows `PlaceholderPanel` with that title.

Transitions:
- Clicking a session card (in the sidebar's compact list, or in the full grid) → `selectedTopicId = card's id`, `activePanel = null`.
- Clicking "Session" in the nav → `activePanel = 'sessions'` (does not change `selectedTopicId`).
- Clicking "Technique Bank" / "Skills" / "Settings" in the nav → `activePanel` set to that value.
- Completing the New Session wizard (existing flow, unchanged) → `selectedTopicId = new id`, `activePanel = null`.
- The currently active nav item is visually highlighted: "Session" is highlighted when `activePanel === 'sessions'` OR (`activePanel === null` AND `selectedTopicId` is set); Technique Bank/Skills/Settings highlighted when `activePanel` matches.

## Sidebar structure

**Header:** brand ("📚 Tutor", unchanged copy) + a collapse/expand toggle button.

**New Session button:** unchanged behavior (opens the existing `NewSessionWizard`), full-width with label when expanded.

**Nav list** (4 items, each with an icon + label + optional badge):
- **Session** — badge shows total session count (e.g. "7"), or "none yet" when zero.
- **Technique Bank** — no badge for now (Module 2 defines it).
- **Skills** — no badge for now (Module 3 defines the "N on" meaning).
- **Settings** — no badge.

**Previous Sessions section:**
- Section header: "Previous Sessions" + a count badge showing the total number of sessions.
- Lists the 3 most-recently-active sessions (by `lastActivityAt` descending) as cards — see Session Card below.
- If more than 3 sessions exist, a line below the list reads "{N} more behind the header" where N = total − 3.
- Clicking a card opens that session (see Routing above).

**Session Card** (shared between this compact list and the full grid):
- Topic name (title).
- Relative date label ("today", "2d", "4d"; blank/omitted if `lastActivityAt` missing).
- A short preview: the most recent message's text, truncated (CSS `text-overflow: ellipsis`, single line). Empty state ("No messages yet") if the session has no messages.

**Collapsed state** (toggled by the header button):
- Sidebar width shrinks to an icon-only rail (~64px).
- Brand shrinks to just the icon/emoji.
- New Session becomes an icon-only button.
- Nav items show icon only; label available as a native `title` tooltip on hover.
- Previous Sessions section is hidden entirely (no room for cards at this width).
- **Model picker (`ModelPicker.jsx`) receives zero code changes.** Its trigger button already has `flex: 1` label with `overflow: hidden; text-overflow: ellipsis; white-space: nowrap` — at the narrower rail width this simply compresses visually (the colored dot and chevron stay visible, the label truncates) with no layout breakage. It remains pinned via the same `margin-top: auto` mechanism regardless of collapsed/expanded state.
- Collapse state lives in local `Sidebar` component state (not persisted, not lifted to `App`) since nothing outside the sidebar needs to know about it.

## Sessions grid view (`SessionsGrid.jsx`)

Shown in the main content area when `activePanel === 'sessions'`. A 2-column, vertically scrollable grid of `SessionCard`s for every session (same sort: most-recently-active first). Clicking a card opens that session. If there are zero sessions, shows a simple "No sessions yet — start one from the sidebar" message instead of an empty grid.

## Placeholder panel (`PlaceholderPanel.jsx`)

Generic component taking a `title` prop, rendering a centered "《title》 is coming soon" message in the main content area. Used for Technique Bank, Skills, and Settings until their own modules are implemented.

## Component structure

- `client/src/relativeDate.js` — `formatRelativeDate(isoString): string`, pure function, no dependencies.
- `client/src/components/SessionCard.jsx` + `.module.css` — props: `{ topic, onClick }`. Renders title/date/preview as described above.
- `client/src/components/SessionsGrid.jsx` + `.module.css` — props: `{ topics, onSelectTopic }`.
- `client/src/components/PlaceholderPanel.jsx` + `.module.css` — props: `{ title }`.
- `client/src/components/Sidebar.jsx` — internal restructure: adds collapse state, nav list, reworked Previous Sessions section (using `SessionCard`); gains new props `activePanel`, `onNavigate(panel)`, `sessionCount`. `ModelPicker.jsx` import/usage unchanged.
- `client/src/App.jsx` — owns `activePanel` state; computes the sorted topics list (by `lastActivityAt` desc) once and passes slices of it down; renders `ChatWindow`/`EmptyState`/`SessionsGrid`/`PlaceholderPanel` based on `activePanel`/`selectedTopicId`.
- `client/src/state/topicsReducer.js` — `ADD_TOPIC` sets `lastActivityAt: new Date().toISOString()`; `ADD_MESSAGE` sets `lastActivityAt` to "now" on the matching topic.

## Error handling

- Missing `lastActivityAt` on older sessions: card renders without a date rather than throwing or showing "Invalid Date".
- Empty sessions list: both the compact sidebar section and `SessionsGrid` show a friendly empty message instead of rendering nothing.

## Testing

- Manual: create 4+ sessions, confirm only 3 show in the sidebar's compact list plus an accurate "N more behind the header" line.
- Manual: click "Session" nav, confirm the full grid shows all sessions in 2 columns, scrollable, and clicking a card opens that session's chat.
- Manual: click Technique Bank / Skills / Settings, confirm each shows its placeholder panel and the corresponding nav item highlights.
- Manual: collapse the sidebar, confirm the model picker is still visible/functional (compressed, not broken), nav icons still clickable via tooltip-labeled icons, then expand again and confirm full layout returns.
- Manual: send a message in a session, confirm its card's relative date and preview text update and it re-sorts to the top of Previous Sessions.
