# File Manifest

One line per key file. Boilerplate (`__init__.py`, `__pycache__`) skipped.

## Shared

- `theme.py` — color tokens, fonts, shared style dicts (`CARD_STYLE`, `PILL_STYLE`, `SHEET_STYLE`).
- `data.py` — real customer menu: `CATEGORIES`, `ITEMS`, `ITEMS_BY_ID`, `items_for()`, `CONTAINER_SPECS`.
- `admin_data.py` — mock admin orders (`MOCK_ORDERS`), item ids always reference `data.ITEMS_BY_ID`.
- `components/buttons.py` — `primary_button`, `pill_button` (customer app's terracotta variants).
- `components/bottom_sheet.py` — reusable bottom-sheet overlay; reused by both cart sheet and admin order-detail sheet.
- `components/background.py` — customer app's `page_shell` (phone column + tablet two-pane).
- `components/base_page.py` — admin app's decorator: injects header/nav/background around a page's unique content.
- `cateringv3.py` — app entry: registers `/` (customer) and `/admin` (admin) routes.

## Customer app (`customersec/`, `state/customer*`)

- `state/packing.py` — pure math: totals, fees, capacity, FFD auto-pack, order-number generation.
- `state/customerorderstate.py` — cart, menu category, delivery date.
- `state/customerpackingstate.py` — container packing + cross-state async totals.
- `state/stageoverlaystate.py` — stage/overlay flags, mock user, payment result.
- `customersec/menu.py`, `cart.py`, `delivery_date.py`, `profile_drawer.py`, `containers.py`, `success.py` — one screen/section each.

## Admin app (`pages/admin*`, `state/admin*`, `components/admin/`)

- `state/admin_logic.py` — pure math: order totals/summaries, kitchen stat aggregation, prep-list aggregation.
- `state/adminnavstate.py` — top-level section switch (`orders`/`menu`), nav-dropdown open flag, cross-state data loader.
- `state/adminmenustate.py` — draft/published menu split, edit handlers, publish.
- `state/adminordersstate.py` — orders list, filters, kitchen stats, order-detail sheet (open/strike/save/complete/cancel).
- `components/admin/stat_tile.py` — New/Total/Revenue and Kitchen stat tile, 3 color variants.
- `components/admin/nav_dropdown.py` — 5-row nav popover (2 functional, 3 inert).
- `components/admin/admin_header.py` — "S" logo + section title + date pill.
- `components/admin/menu_item_row.py` — dual-mode (view/edit) menu item row.
- `components/admin/order_card.py` — order list card (id, customer, items summary, payment badge, total).
- `components/admin/order_detail_sheet.py` — strike-to-partial order detail bottom sheet.
- `pages/admin_menu.py` — Edit/View/Publish tab bar + category chips + item rows.
- `pages/admin_orders.py` — Orders/Kitchen tab bar + stat tiles + filter chips + order list / prep list.
- `pages/admin.py` — `@base_page`-decorated root: switches between menu/orders pages by `AdminNavState.section`.

## Tests

- `tests/test_data.py` — customer menu data shape.
- `tests/test_packing_totals.py`, `tests/test_ffd_pack.py` — customer app pure-logic math.
- `tests/test_admin_logic.py` — order totals/summaries + kitchen/stat aggregation math.
- `tests/test_admin_orders_data.py` — mock order data references real menu ids, unique ids, ≥2 special orders.

## Docs (workflow files, not code)

- `CLAUDE.md` — standing orders, always loaded.
- `DECISIONS.md` — architectural choices + why (source for this doc set's 02-decisions.md).
- `docs/PLAN.md` — current active plan, kept in sync across `/compact`.
- `TODO.md` — running task list.
- `docs/reflex-sarthi.md` — design-system + UI-conventions checklist (tokens, layout rules, `base_page` pattern).
