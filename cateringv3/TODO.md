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
- [x] Executed inline (executing-plans skill), all 13 tasks committed on branch `sarthi-catering-app`.
- [x] `docs/reflex-sarthi.md` reference doc written — read it before writing any admin UI code.
- [x] `/admin` route mounted, browser smoke-tested: Orders tab (stats/filters/order-detail strike+save), Kitchen tab (stats/special orders/prep list), nav dropdown + section switch, Menu Edit→Publish→View round-trip. 35 pytest passing.
- [ ] Not yet done: Customers/Payments/Settings pages (nav rows are inert placeholders by design), tablet/desktop admin layout.
- [x] Postgres DB foundation wired: `db_url`/`async_db_url` config, `models.py` (Customer/Order/OrderItem/Payment) migrated, 500 rows/table seeded. Branch `feature/postgres-db-wiring`, spec at `docs/superpowers/specs/2026-08-07-postgres-db-wiring-design.md`.

## Next up: rewire state to real DB (not started)

- [ ] Swap state classes off mock/hardcoded data onto real queries against `models.py`, using the DB foundation above. Scope (which states, what order) still to be worked out — see DECISIONS.md once decided.

## Not in scope this round

- Login/registration screens (scrapped 2026-07-28).
- Customers / Payments / Settings nav items — shown in nav dropdown but inert.
