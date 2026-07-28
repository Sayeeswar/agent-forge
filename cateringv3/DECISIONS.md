# Decisions

Architectural choices and why. Read before structural changes so settled calls don't get re-litigated.

## Customer app (Sarthi ordering flow)

- **Three-state split**: `CustomerOrderSelectionState` (cart/menu/date), `CustomerPackingState` (container packing + cross-state async totals), `StageOverlaysState` (stage/overlays/mock user/payment result). Why: keeps each state focused, testable, under the 300-line file cap.
- **UI is display-only; all logic in backend** — `_private` helper methods + `@rx.var` computed vars returning display-ready strings/values. Why: hard user rule — no arithmetic or business conditionals in the component tree.
- **Single page at `/`** with `stage` + boolean overlay flags, not multiple routes. Why: menu is the always-mounted base layer; cart/date/profile are overlays, containers/success are full-screen takeovers — this matches the screenshots' flow better than page navigation.
- **Fonts self-hosted** under `assets/fonts/` (one sanctioned exception to the "don't touch assets" guard rail). Why: offline/CSP requirement — no CDN `<link>`.
- **Payment mocked**, shaped so real Razorpay drops in later. Why: no payment integration in this phase, but don't want a rewrite later.
- **Auto-pack (FFD) goal = fewest containers**, augments existing containers rather than repacking from scratch. Why: resolved via grill-me interview 2026-07-16 — overrides earlier "cheapest-fitting" spec prose.
- **Verification depth = compile + run + click-through smoke test**, not full Playwright screenshot-diff. Why: resolved gap #4 — screenshot-diff was overkill for this fidelity level.

## Admin app (Menu editor + Orders/Kitchen)

- **Mock hardcoded data**, no SQLModel/DB yet. Why: matches the customer app's current fidelity; real DB wiring is a deliberately separate later task.
- **No auth on `/admin`.** Why: login/registration sub-project was scoped out this round.
- **New route `/admin`**, fully separate page tree from the customer app's single page at `/`. Why: admin and customer are independent subsystems (per brainstorming's decomposition rule), not overlays on the same page.
- **Phone-width only** (~430px), no tablet/desktop layout. Why: matches the actual admin screenshots/artifacts; no desktop admin design exists yet.
- **Menu data reconciled to the customer app's real `data.py`** (5 categories, 24 items) — NOT the artifact's own invented mock content (8 categories, 29 items, dish names like "Mango Ghashi"). Why: the artifact's content was mockup filler for visual design purposes; the real menu is the actual source of truth admin should edit.
- **Edit → View → Publish = draft vs. published snapshot**, internal to `AdminMenuState` only. Why: user clarified (2026-07-28) that edits are staged and only take effect on Publish; this does not yet write back into the customer app's `data.py` — cross-app sync is deferred to the real-DB phase.
- **Guard rail**: while building the admin app, never touch/read/write the customer app's pages or states (`pages/{menu,cart,delivery_date,profile_drawer,containers,success}.py`, `state/{customerorderstate,customerpackingstate,stageoverlaystate}.py`). Shared primitives (`theme.py`, `components/{buttons,bottom_sheet,background}.py`) stay importable but unmodified. Why: explicit user instruction, added to CLAUDE.md 2026-07-28.
- **Design reference for admin work is Claude Artifacts + live Playwright inspection**, not `assets/*.png`. Why: user banned reading `assets/*.png` (screenshot ban, 2026-07-28) to save tokens; artifacts are client-rendered React bundles that static `WebFetch` can't read, so Playwright navigate + snapshot/screenshot is the working method.
