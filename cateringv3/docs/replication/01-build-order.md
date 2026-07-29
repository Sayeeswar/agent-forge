# Build Order

Numbered sequence. Each step assumes the previous ones exist.

## Universal pattern (both apps)

1. Pure logic module + pytest tests (TDD), zero Reflex imports. Money formatting, totals, aggregation — all here first.
2. Static/mock data module (`data.py`, `admin_data.py`) — real values, no placeholders.
3. Leaf state classes (no cross-state references) — e.g. `AdminMenuState`, `AdminOrdersState` core.
4. Hub/nav state that references the leaf states (`AdminNavState`, `StageOverlaysState`) — write its cross-state method LAST, as a second pass, because it needs states that don't exist yet when the hub file is first created. Use a `# TODO(Task N)` stub, replace once leaves exist.
5. Low-level shared components (buttons, tiles, chips) before composed components (cards, sheets) before layout decorators (`base_page`) — each layer imports the one before it.
6. Page-composition functions (`pages/*.py`) — import components, never define new business logic.
7. Route registration (`app.add_page`) — always last, always additive (one new line), never touches an existing route's registration.
8. Compile check (`reflex compile --dry`) → run server → browser smoke test — last step, after everything above is committed.

## Specific dependencies that bite if skipped

- Font files must exist in `assets/fonts/` before `theme.py`'s `FONT_FACE_CSS` references them.
- `theme.py` (tokens) before any component — every component imports `COLORS`/style dicts from it.
- `packing.py` / `admin_logic.py` (pure math) before the state class that calls it — write and test the math standalone first.
- `bottom_sheet.py` before any sheet/dropdown that reuses it (order-detail sheet, nav dropdown pattern).
- `nav_dropdown.py` before `base_page.py` (which imports it) before any page decorated with `@base_page`.
- Customer app's page folder (`customersec/`) must exist and its imports in `cateringv3.py` must be correct before adding the admin route — the app won't compile otherwise.

## Order that does NOT matter

- Which of two independent leaf states gets written first (e.g. `AdminMenuState` vs `AdminOrdersState` core) — no dependency between them.
- Component file creation order within the same layer (e.g. `stat_tile.py` vs `nav_dropdown.py`).
