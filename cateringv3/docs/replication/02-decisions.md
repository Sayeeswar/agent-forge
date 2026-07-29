# Decisions — Non-Obvious Choices + Why

One line each. Don't re-litigate these.

- **One state class per feature, never shared.** Why: hard rule — keeps files under the 300-line cap, keeps concerns testable in isolation.
- **All business math in pure functions (`packing.py`, `admin_logic.py`), states only call + expose computed vars.** Why: hard rule — UI must be display-only, no arithmetic in the component tree.
- **Customer app is a single page (`/`) with `stage` + overlay bool flags, not multi-route.** Why: matches the design's flow — menu is always-mounted base layer, cart/date/profile are overlays, containers/success are full-screen takeovers.
- **Admin app is a separate route (`/admin`), not a new `stage` value on the customer app's state.** Why: admin and customer are independent subsystems (decomposition rule) — different data, different nav model, no shared lifecycle.
- **Mock hardcoded data for both apps; real SQLModel/DB deferred.** Why: matches current fidelity; premature DB wiring would be rework once real schema is designed.
- **No auth on `/admin` this round.** Why: login/registration was explicitly scoped out — don't gate a route with auth that doesn't exist yet.
- **Admin menu data reconciled to the customer app's real `data.py` (5 categories, 24 items), not the Claude Artifact's own mock content (8 categories, 29 items).** Why: the artifact's content was visual filler for the mockup, not literal data to replicate — the real menu is the actual source of truth admin should edit.
- **Edit → View → Publish = draft vs. published snapshot, internal to `AdminMenuState` only.** Why: edits are staged; Publish copies draft → published. Does not write back into the customer app's `data.py` — that cross-app sync is a separate, later, real-DB-phase task.
- **`base_page` decorator (new) wraps shared chrome around page content.** Why: hard-learned lesson — repeating header/background per page function was error-prone; the decorator makes page functions return only unique content.
- **Admin is phone-width only (~430px), no tablet/desktop layout.** Why: matches the actual admin screenshots/artifacts — no admin desktop design exists to build against.
- **Fonts self-hosted under `assets/fonts/`.** Why: offline/CSP requirement — no CDN `<link>` allowed, even though `assets/` is otherwise guard-railed.
- **Auto-pack (FFD) goal = fewest containers, augments existing containers rather than repacking from scratch.** Why: resolved via direct interview — overrides earlier "cheapest-fitting" spec wording.
- **Verification depth = compile + run + click-through smoke test, not full screenshot-diff.** Why: resolved gap — screenshot-diff was overkill for this fidelity level; Playwright accessibility-tree snapshot is enough signal.
- **`admin_logic.py` defines its own tiny `money()` instead of importing the customer app's `packing.py`.** Why: keeps the admin app fully decoupled from anything customer-adjacent, even a small shared utility — avoids a cross-app dependency that could complicate later guard-rail enforcement.
- **Design reference source = Claude Artifacts + live Playwright inspection, not `assets/*.png`.** Why: screenshot reads were banned to save tokens; artifacts are client-rendered React bundles that static fetch can't read anyway, so Playwright was the only working method regardless.
