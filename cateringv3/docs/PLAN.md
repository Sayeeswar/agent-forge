# Current Plan

**Sarthi Admin App — complete.** Plan at `docs/superpowers/plans/2026-07-28-sarthi-admin-app.md` (commit `658819b`), spec at `docs/superpowers/specs/2026-07-28-sarthi-admin-app-design.md`. All 13 tasks executed inline (executing-plans skill) on branch `sarthi-catering-app`, one commit per task, browser-smoke-tested against a live server. 35 pytest passing.

## Task checklist (13/13 done)

1. [x] Mock orders data + order-total pure math (`admin_data.py`, `state/admin_logic.py` part 1) — TDD.
2. [x] Kitchen/stat aggregation pure math (`admin_logic.py` part 2) — TDD.
3. [x] `AdminNavState` (top-level section switch + nav dropdown flag).
4. [x] `AdminMenuState` (draft/published menu split, edit handlers).
5. [x] `AdminOrdersState` (orders list, filters, stats) + wire `AdminNavState.load_admin_data`.
6. [x] Order-detail sheet state (open/strike/save/complete/cancel) — appended to `AdminOrdersState`.
7. [x] Shared admin components: `stat_tile`, `nav_dropdown`.
8. [x] `base_page` decorator + `admin_header` component.
9. [x] `menu_item_row` (dual-mode view/edit).
10. [x] `order_card`, `order_detail_sheet`.
11. [x] `pages/admin_menu.py` (Edit/View/Publish tabs).
12. [x] `pages/admin_orders.py` (Orders/Kitchen tabs).
13. [x] Assemble `/admin`, mount the route, smoke-test, update TODO.md.

## Notable deviation mid-execution

Before Task 13, discovered the customer app's `pages/` folder had already been renamed to `customersec/` (pre-existing uncommitted change, not part of this plan). Committed that rename separately first (own commit, accurate message) before layering the `/admin` route addition into `cateringv3.py`, per user's explicit choice — kept the two unrelated changes out of the same commit.

## Smoke-test results (live browser, port 3000)

Orders tab: 6 mock orders, stat tiles (New 4 / Total 6 / Revenue ₹1545, 1 partial) all correct. Filter chips (Same-day 3 / Open 4 / Partial 1) narrow and toggle off correctly. Order-detail sheet: strike-to-recalculate and close all verified. Kitchen tab: Items 32 / Dishes 13 / Orders 5, both special orders with full notes, prep list aggregated and sorted correctly (e.g. Sambar "across 2 orders"). Nav dropdown: all 5 rows render, Orders/Edit menu switch sections. Menu: Edit tab writes draft only (View unaffected), Publish tab previews draft with "24 items ready · Publish →" bar, clicking Publish copies draft → published and View updates.

## Not in scope this round

Customers/Payments/Settings pages (nav rows intentionally inert), real SQLModel/DB wiring, tablet/desktop admin layout — see `TODO.md`.

See `DECISIONS.md` for the why behind the architecture choices baked into this plan.
