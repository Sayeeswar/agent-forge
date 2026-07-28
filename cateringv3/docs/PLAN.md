# Current Plan

Active plan: **Sarthi Admin App** — full plan at `docs/superpowers/plans/2026-07-28-sarthi-admin-app.md` (commit `658819b`), spec at `docs/superpowers/specs/2026-07-28-sarthi-admin-app-design.md`.

## Task checklist (13 tasks, none started yet)

1. Mock orders data + order-total pure math (`admin_data.py`, `state/admin_logic.py` part 1) — TDD.
2. Kitchen/stat aggregation pure math (`admin_logic.py` part 2) — TDD.
3. `AdminNavState` (top-level section switch + nav dropdown flag).
4. `AdminMenuState` (draft/published menu split, edit handlers).
5. `AdminOrdersState` (orders list, filters, stats) + wire `AdminNavState.load_admin_data`.
6. Order-detail sheet state (open/strike/save/complete/cancel) — appended to `AdminOrdersState`.
7. Shared admin components: `stat_tile`, `nav_dropdown`.
8. `base_page` decorator + `admin_header` component.
9. `menu_item_row` (dual-mode view/edit).
10. `order_card`, `order_detail_sheet`.
11. `pages/admin_menu.py` (Edit/View/Publish tabs).
12. `pages/admin_orders.py` (Orders/Kitchen tabs).
13. Assemble `/admin`, mount the route, smoke-test, update TODO.md.

## Execution mode

Not yet chosen — options are subagent-driven (fresh subagent per task, review between tasks) or inline execution (this session, batch with checkpoints). Update this line once decided.

See `TODO.md` for the lighter running status; see `DECISIONS.md` for the why behind the architecture choices baked into this plan.
