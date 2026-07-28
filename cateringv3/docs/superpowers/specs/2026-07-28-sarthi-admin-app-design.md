# Sarthi Admin App Design

## Goal

Replicate the Sarthi admin experience — Menu (view/edit/publish) and Orders (order list, kitchen prep) — as a new Reflex route (`/admin`), separate from the existing customer ordering flow. Design source: two Claude Artifacts the user built (admin menu editor, admin orders/kitchen), inspected live via Playwright since they're client-rendered React bundles that static fetch can't read. Login/registration screens were scoped out of this round.

## Locked-in decisions

| Area | Decision |
| --- | --- |
| Data | Mock hardcoded, matching the pure-function + static-data pattern already used by the customer app. Real SQLModel/DB wiring is a later, separate task. |
| Auth | None for now. No login gate on `/admin`. |
| Route | New page tree at `/admin`, fully separate from the customer app's single page at `/`. |
| Responsive scope | Phone-width only (~430px column), matching the screenshots/artifacts. No tablet/desktop layout for admin yet. |
| Nav dropdown scope | All 5 items shown (Orders, Edit menu, Customers, Payments, Settings); only Orders and Edit menu are functional. The other 3 are visible but inert. |
| Menu data | Uses the customer app's real menu (`data.CATEGORIES` / `data.ITEMS` — 5 categories, 24 items). The artifact's own mock content (8 categories, 29 items, invented dish names) was mockup filler, not data to replicate, and is discarded. |
| Edit → View → Publish | Edit tab works on a **draft** copy. View tab renders the **published** snapshot. Publish copies draft → published. This is an internal-to-admin simulation; it does not write back into the customer app's `data.py` or affect what customers see — that cross-app sync is deferred to the real-DB phase. |

## Guard rail 
Strictly follow claude.md guardrails never disobey the guardrails

## Architecture

```
cateringv3/
  pages/
    admin.py             # shared chrome (header, nav dropdown) + section switch
    admin_menu.py         # Edit / View / Publish tabs
    admin_orders.py        # Orders tab + Kitchen tab
  state/
    adminnavstate.py       # AdminNavState: top-level section + nav dropdown open flag
    adminmenustate.py      # AdminMenuState: draft/published menu, edit handlers
    adminordersstate.py    # AdminOrdersState: orders, order-detail sheet, strikes
    admin_logic.py         # pure functions: stats, prep-list aggregation, partial totals
  components/
    admin/
      nav_dropdown.py
      stat_tile.py
      order_card.py
      order_detail_sheet.py
      menu_item_row.py     # dual-mode view/edit row
tests/
  test_admin_logic.py
```

`cateringv3.py` (app entry) gets one additive line — `app.add_page(admin, route="/admin")` — no change to the existing `/` registration.

Reuses (import-only, unmodified): `theme.py` tokens, `components/buttons.py`, `components/bottom_sheet.py`, `components/background.py`.

## Navigation model

Mirrors the customer app's `StageOverlaysState` pattern:

- `AdminNavState.section: str = "orders"` (`"orders" | "menu"`), `nav_open: bool = False`.
- `pages/admin.py` renders shared header chrome (logo button toggles `nav_open`; date pill; section title + subtitle) then delegates to `admin_orders.orders_page()` or `admin_menu.menu_page()` based on `section`.
- `components/admin/nav_dropdown.py` (shown when `nav_open`): 5 rows — Orders, Edit menu, Customers, Payments, Settings. Only the first two call `AdminNavState.set_section(...)`; the rest are visible, non-interactive.

## AdminMenuState

- `published_items: list[dict]` — seeded from `data.ITEMS` (copy).
- `draft_items: list[dict]` — working copy, mutated via Edit tab.
- `active_tab: str = "view"` (`"edit" | "view" | "publish"`).
- `active_category: str` — for the category-chip filter, shared across tabs.
- Handlers: `set_tab(tab)`, `set_category(name)`, `edit_item(item_id, field, value)`, `toggle_available(item_id)`, `add_item(category)`, `publish()` (draft → published, stamps `last_published_at`).
- Computed: category chip counts and `active_items` derived from whichever list matches `active_tab` — `draft_items` for Edit **and** Publish (Publish is a read-only preview of what's about to go live, with a bottom CTA bar: `"N items ready · Publish →"`), `published_items` for View.

## AdminOrdersState

- `orders: list[dict]` — mock; item names/prices drawn from `data.ITEMS_BY_ID` so they stay consistent with the real menu (not the artifact's invented dish names).
- `active_tab: str = "orders"` (`"orders" | "kitchen"`).
- `active_order_id: str | None = None` — drives the order-detail bottom sheet.
- `struck_items: dict[str, set[str]]` — per-order set of struck (unfulfillable) item ids.
- Handlers: `open_order(id)`, `close_order()`, `toggle_strike(order_id, item_id)`, `save_partial()`, `mark_completed()`, `cancel_order()`.
- Filter chips: `Same-day`, `Open`, `Partial` — `active_filter: str | None`.

## admin_logic.py (pure, pytest-covered)

- `new_count(orders)`, `total_count(orders)`, `revenue_total(orders)`.
- `same_day_count`, `open_count`, `partial_count` (filter chip counts).
- `order_total(order, struck_items)` — recalculates total after strikes.
- `items_to_prepare(orders)`, `unique_dishes(orders)`, `orders_delivering(orders)` (Kitchen stat tiles).
- `prep_list(orders)` — aggregates quantity per dish across all orders, with `"across N orders · ₹price each"` display strings.
- `special_orders(orders)` — filters orders flagged `is_special`.

## Order-detail sheet (reuses `bottom_sheet.py`)

Header: order id + placed time, customer name, phone, payment badge (`online`/`cash`). Instruction line: "Tap items you can't fulfill to strike them. Save with strikes to convert to Partial, or mark the whole order completed." Tappable item rows (struck = strikethrough style). Totals: `Original total` vs recalculated `Total`. Actions: `Cancel order`, `Send SMS` (both mocked/no-op, same pattern as the customer app's `pay` handler — shaped for real integration later), primary action toggles between `Mark completed →` and `Save as Partial →` depending on whether any items are struck. Secondary: `Save without completing`.

## Kitchen tab

3 stat tiles (Items to prepare, Dishes unique, Orders delivering) — pure-computed. Special-orders section: cards with note preview + "↓ Tap to read full note" expand. Prep list: per-dish aggregated rows (name, `"across N orders · ₹price each"`, `×qty`).

## Testing & verification

- `tests/test_admin_logic.py`: TDD for every pure function above (stat counts, prep-list aggregation, partial-total recalculation, special-order filtering) — same pattern as `packing.py`/`test_packing_totals.py`.
- No network/DB error handling needed (mock data, no auth). UI-level edge cases only: empty orders list, empty draft items, publish with 0 items (button stays enabled, no-ops — matching the customer app's Auto-pack no-op pattern).
- Verification depth: compile + run + click-through smoke test per screen, checked against the Playwright captures taken during this design session (screenshots banned per project rule; these captures are the reference instead).
## Codestructre 
- Maintain good code structre so that it will be asy when i make a models.py