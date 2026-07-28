# TODO

Running task list — lighter than PLAN.md, good for "what's left."

## Sarthi customer app (branch: sarthi-catering-app)

- [x] All 12 plan tasks committed (theme/data/packing logic → 3 states → components → pages → assembled page).
- [x] 21 pytest passing.
- [ ] Plan's final click-through smoke test vs the real screenshots — not yet run. Use Playwright, not `assets/*.png` reads (banned).

## Sarthi admin app (Menu editor + Orders/Kitchen)

- [x] Design captured live via Playwright from the two Artifact URLs (admin menu, admin orders).
- [x] Menu data conflict resolved — admin uses customer's real `data.py`, not the artifact's invented content.
- [x] Design spec written + committed: `docs/superpowers/specs/2026-07-28-sarthi-admin-app-design.md` (a48efc1).
- [x] Spec reviewed and approved by user.
- [x] Implementation plan written + committed: `docs/superpowers/plans/2026-07-28-sarthi-admin-app.md` (658819b), mirrored to `docs/PLAN.md`.
- [ ] Execution mode not chosen yet (subagent-driven vs inline) — see `docs/PLAN.md`.
- [ ] Build (13 tasks): pure order/kitchen math + TDD → `AdminNavState`/`AdminMenuState`/`AdminOrdersState` → `base_page` decorator + admin components → `pages/admin*.py` → mount `/admin` + smoke test.
- [ ] `docs/reflex-sarthi.md` reference doc written — read it before writing any admin UI code.

## Not in scope this round

- Login/registration screens (scrapped 2026-07-28).
- Customers / Payments / Settings nav items — shown in nav dropdown but inert.
- Real SQLModel/DB wiring for either app.
