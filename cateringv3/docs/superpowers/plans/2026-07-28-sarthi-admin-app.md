# Sarthi Admin App Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build the Sarthi admin experience — Menu (draft/view/publish) and Orders (list + order-detail + Kitchen prep) — as a new Reflex route `/admin`, fully separate from the customer app, per `docs/superpowers/specs/2026-07-28-sarthi-admin-app-design.md`.

**Architecture:** New page tree at `/admin`. `AdminNavState` drives which top-level section renders (`orders` | `menu`) and the hamburger nav dropdown. `AdminMenuState` holds a draft/published menu split (Edit writes draft, View reads published, Publish previews draft then copies it into published). `AdminOrdersState` holds mock orders, order-detail sheet state (open/strike/save/complete/cancel), and Kitchen-tab aggregates. All stats/aggregation math lives in pure, pytest-covered `state/admin_logic.py` — states only call it and expose display-ready computed vars. A `base_page` decorator (new, documented in `docs/reflex-sarthi.md`) wraps the single `/admin` page with shared chrome (header, nav dropdown).

**Tech Stack:** Reflex 0.9.6 (Python), reuses existing `theme.py` tokens and `components/{buttons,bottom_sheet,background}.py` (import-only), pytest for the pure logic layer.

## Global Constraints

- **Reflex version:** 0.9.6 — verify every Reflex API against reflex-docs skill or installed source before use; never guess component/prop/event names.
- **Backend-only logic:** No arithmetic, string-joining, or business conditionals in the component tree. Components read display-ready `State.<var>` only. All math/formatting lives in `state/admin_logic.py` pure functions or state computed vars.
- **File/function caps:** ≤ 300 lines per file, ≤ 40 lines per function.
- **Components:** Never `rx.html()` or `rx.el`. Prefer `rx.box / vstack / hstack / flex / grid / card / dialog / drawer / foreach / cond / match`. Reuse the existing button/chip-row pattern from `components/category_chips.py` for segmented tab bars — do not introduce `rx.tabs`.
- **Data:** Mock hardcoded (no SQLModel/DB this round). Menu data is seeded from the customer app's real `data.ITEMS`/`data.CATEGORIES` — never the artifact's invented 8-category content.
- **Auth:** None. No login gate on `/admin`.
- **Responsive scope:** Phone-width only (~430px column). No tablet/desktop layout for the admin app.
- **Guard rail:** Never touch/read/write `pages/{menu,cart,delivery_date,profile_drawer,containers,success}.py` or `state/{customerorderstate,customerpackingstate,stageoverlaystate}.py`. `theme.py` and `components/{buttons,bottom_sheet,background}.py` are import-only, never modified. `state/packing.py` is also left untouched — admin defines its own tiny `money()` helper in `admin_logic.py` rather than importing across, to keep the admin app fully decoupled.
- **Git:** Work only on branch `sarthi-catering-app` (already checked out). Never commit to `main`/`master`. Commit after each task.
- **Process:** Log every bash command run to `docs/Bashcommands.md`. Run the full `pytest` suite (not just the new file) before each commit. Update `TODO.md` as tasks complete.

---

### Task 1: Mock orders data + order-total pure math

**Files:**
- Create: `cateringv3/admin_data.py`
- Create: `cateringv3/state/admin_logic.py`
- Test: `tests/test_admin_logic.py`
- Test: `tests/test_admin_orders_data.py`

**Interfaces:**
- Consumes: `cateringv3.data.ITEMS_BY_ID`.
- Produces:
  - `admin_data.MOCK_ORDERS: list[dict]` — each order: `{id, customer_name, phone, items: dict[str,int], payment_method: "online"|"cash", placed_display: str, is_same_day: bool, status: "open"|"partial"|"completed"|"cancelled", struck_item_ids: list[str], is_special: bool, special_note: str}`.
  - `admin_logic.money(n: int) -> str`
  - `admin_logic.order_line_items(order: dict) -> list[dict]` — `[{item_id, name, qty, price, subtotal, struck: bool}, ...]`
  - `admin_logic.order_items_summary(order: dict) -> str` — `"2× Paneer Paratha · 4× Ghee Phulka"`
  - `admin_logic.order_original_total(order: dict) -> int`
  - `admin_logic.order_total(order: dict) -> int` (excludes struck items)

- [ ] **Step 1: Write failing tests**

```python
# tests/test_admin_logic.py
from cateringv3.state import admin_logic


def _order(items, struck=None, **overrides):
    base = {
        "id": "O-0001",
        "customer_name": "Test Customer",
        "phone": "+91 90000 00000",
        "items": items,
        "payment_method": "online",
        "placed_display": "Placed today",
        "is_same_day": False,
        "status": "open",
        "struck_item_ids": struck or [],
        "is_special": False,
        "special_note": "",
    }
    base.update(overrides)
    return base


def test_money_format():
    assert admin_logic.money(85) == "₹85"
    assert admin_logic.money(0) == "₹0"


def test_order_line_items_shape_and_struck_flag():
    order = _order({"paneer-paratha": 2, "puri": 1}, struck=["puri"])
    lines = admin_logic.order_line_items(order)
    by_id = {l["item_id"]: l for l in lines}
    assert by_id["paneer-paratha"] == {
        "item_id": "paneer-paratha", "name": "Paneer Paratha",
        "qty": 2, "price": 80, "subtotal": 160, "struck": False,
    }
    assert by_id["puri"]["struck"] is True
    assert by_id["puri"]["subtotal"] == 15


def test_order_items_summary_joins_qty_and_name():
    order = _order({"paneer-paratha": 2, "puri": 1})
    assert admin_logic.order_items_summary(order) == "2× Paneer Paratha · 1× Puri"


def test_order_original_total_ignores_strikes():
    order = _order({"paneer-paratha": 1, "puri": 2}, struck=["puri"])
    assert admin_logic.order_original_total(order) == 80 + 30


def test_order_total_excludes_struck_items():
    order = _order({"paneer-paratha": 1, "puri": 2}, struck=["puri"])
    assert admin_logic.order_total(order) == 80
```

```python
# tests/test_admin_orders_data.py
from cateringv3 import data
from cateringv3 import admin_data


def test_all_order_items_reference_real_menu():
    for order in admin_data.MOCK_ORDERS:
        for item_id in order["items"]:
            assert item_id in data.ITEMS_BY_ID, f"{item_id} is not a real menu item"


def test_order_ids_unique():
    ids = [o["id"] for o in admin_data.MOCK_ORDERS]
    assert len(ids) == len(set(ids))


def test_at_least_two_special_orders():
    specials = [o for o in admin_data.MOCK_ORDERS if o["is_special"]]
    assert len(specials) >= 2
```

- [ ] **Step 2: Run tests, verify they fail**

Run: `python -m pytest tests/test_admin_logic.py tests/test_admin_orders_data.py -v`
Expected: FAIL — `ModuleNotFoundError: No module named 'cateringv3.state.admin_logic'` (and `cateringv3.admin_data`).

- [ ] **Step 3: Write `admin_data.py`**

```python
"""Mock admin orders. Item ids/prices always reference the real customer menu (data.py)."""

MOCK_ORDERS = [
    {
        "id": "O-2401",
        "customer_name": "Kavya Iyer",
        "phone": "+91 98452 71034",
        "items": {"paneer-paratha": 2, "ghee-phulka": 4, "dal-tadka": 1},
        "payment_method": "online",
        "placed_display": "Placed Yesterday 6:14 PM",
        "is_same_day": False,
        "status": "open",
        "struck_item_ids": [],
        "is_special": False,
        "special_note": "",
    },
    {
        "id": "O-2402",
        "customer_name": "Rohit S.",
        "phone": "+91 90000 11122",
        "items": {"puri": 6, "sambar": 2, "kachumber": 2},
        "payment_method": "cash",
        "placed_display": "Placed Yesterday 7:02 PM",
        "is_same_day": False,
        "status": "open",
        "struck_item_ids": [],
        "is_special": False,
        "special_note": "",
    },
    {
        "id": "O-2403",
        "customer_name": "Meera K.",
        "phone": "+91 98123 45678",
        "items": {"dal-makhani": 1, "plain-rice": 1},
        "payment_method": "online",
        "placed_display": "Placed Yesterday 8:31 PM",
        "is_same_day": False,
        "status": "completed",
        "struck_item_ids": [],
        "is_special": False,
        "special_note": "",
    },
    {
        "id": "O-2404",
        "customer_name": "Suresh V.",
        "phone": "+91 91234 56780",
        "items": {"paneer-butter-masala": 1, "ghee-chapathi": 4, "dal-fry": 1},
        "payment_method": "cash",
        "placed_display": "Placed 8:55 AM today",
        "is_same_day": True,
        "status": "open",
        "struck_item_ids": [],
        "is_special": True,
        "special_note": (
            "Pack the dal separately in a steel container if possible. "
            "Extra spice level for Suresh — he likes it really hot. "
            "Delivery between 12:30 and 1 pm only."
        ),
    },
    {
        "id": "O-2405",
        "customer_name": "Nisha A.",
        "phone": "+91 99887 66554",
        "items": {"bhindi-fry": 2, "sambar": 1},
        "payment_method": "online",
        "placed_display": "Placed 11:18 AM today",
        "is_same_day": True,
        "status": "open",
        "struck_item_ids": [],
        "is_special": True,
        "special_note": (
            'Birthday delivery — please include a small card with '
            '"Happy Birthday Aanya" if you can. Door no. 4B, call from gate.'
        ),
    },
    {
        "id": "O-2406",
        "customer_name": "Vinay D.",
        "phone": "+91 90909 09090",
        "items": {"chana-masala": 1, "jeera-rice": 1, "oilless-phulka": 4},
        "payment_method": "cash",
        "placed_display": "Placed 12:04 PM today",
        "is_same_day": True,
        "status": "partial",
        "struck_item_ids": ["oilless-phulka"],
        "is_special": False,
        "special_note": "",
    },
]
```

- [ ] **Step 4: Write `state/admin_logic.py`**

```python
"""Pure logic for admin orders: totals, summaries, kitchen aggregation. No Reflex imports."""
from cateringv3 import data


def money(n):
    return f"₹{n}"


def order_line_items(order):
    lines = []
    for item_id, qty in order["items"].items():
        item = data.ITEMS_BY_ID[item_id]
        lines.append({
            "item_id": item_id,
            "name": item["name"],
            "qty": qty,
            "price": item["price"],
            "subtotal": item["price"] * qty,
            "struck": item_id in order["struck_item_ids"],
        })
    return lines


def order_items_summary(order):
    parts = []
    for item_id, qty in order["items"].items():
        name = data.ITEMS_BY_ID[item_id]["name"]
        parts.append(f"{qty}× {name}")
    return " · ".join(parts)


def order_original_total(order):
    return sum(data.ITEMS_BY_ID[i]["price"] * q for i, q in order["items"].items())


def order_total(order):
    struck = set(order["struck_item_ids"])
    return sum(
        data.ITEMS_BY_ID[i]["price"] * q
        for i, q in order["items"].items()
        if i not in struck
    )
```

- [ ] **Step 5: Run tests, verify they pass**

Run: `python -m pytest tests/test_admin_logic.py tests/test_admin_orders_data.py -v`
Expected: PASS (8 passed)

- [ ] **Step 6: Log the commands, run full suite**

Append every command from Steps 2 and 5 to `docs/Bashcommands.md`. Then run: `python -m pytest -v`
Expected: all tests pass (existing customer-app tests + the new admin ones).

- [ ] **Step 7: Commit**

```bash
git add cateringv3/admin_data.py cateringv3/state/admin_logic.py tests/test_admin_logic.py tests/test_admin_orders_data.py docs/Bashcommands.md
git commit -m "feat: add mock admin orders data and order-total pure logic"
```

---

### Task 2: Kitchen/stat aggregation pure math

**Files:**
- Modify: `cateringv3/state/admin_logic.py`
- Test: `tests/test_admin_logic.py` (append)

**Interfaces:**
- Consumes: `admin_data.MOCK_ORDERS` shape from Task 1, `admin_logic.order_total`.
- Produces:
  - `admin_logic.new_count(orders) -> int`
  - `admin_logic.total_count(orders) -> int`
  - `admin_logic.revenue_total(orders) -> int`
  - `admin_logic.same_day_count(orders) -> int`
  - `admin_logic.open_count(orders) -> int`
  - `admin_logic.partial_count(orders) -> int`
  - `admin_logic.filter_orders(orders, filter_name: str) -> list[dict]` — `filter_name` in `""`, `"same_day"`, `"open"`, `"partial"`.
  - `admin_logic.items_to_prepare(orders) -> int`
  - `admin_logic.unique_dishes(orders) -> int`
  - `admin_logic.orders_delivering(orders) -> int`
  - `admin_logic.prep_list(orders) -> list[dict]` — `[{item_id, name, price, total_qty, order_count}, ...]` sorted by `total_qty` descending.
  - `admin_logic.special_orders(orders) -> list[dict]`

- [ ] **Step 1: Write failing tests**

Append to `tests/test_admin_logic.py`:

```python
def _orders_fixture():
    return [
        _order({"paneer-paratha": 2}, status="open", is_same_day=False),
        _order({"puri": 1}, status="open", is_same_day=True),
        _order({"paneer-paratha": 1}, status="completed", is_same_day=True),
        _order({"puri": 2}, struck=["puri"], status="partial", is_same_day=False),
        _order({"paneer-paratha": 1}, status="cancelled", is_same_day=False),
    ]


def test_counts():
    orders = _orders_fixture()
    assert admin_logic.new_count(orders) == 2       # the two "open" orders
    assert admin_logic.total_count(orders) == 4      # everything but cancelled
    assert admin_logic.same_day_count(orders) == 2   # open+today, completed+today (cancelled excluded already handled by total_count semantics, same_day_count also excludes cancelled)
    assert admin_logic.open_count(orders) == 2
    assert admin_logic.partial_count(orders) == 1


def test_revenue_total_excludes_cancelled_and_struck_items():
    orders = _orders_fixture()
    # open: 160, open: 15, completed: 80, partial: 0 (puri struck) => 160+15+80+0
    assert admin_logic.revenue_total(orders) == 160 + 15 + 80 + 0


def test_filter_orders():
    orders = _orders_fixture()
    assert len(admin_logic.filter_orders(orders, "")) == 4
    assert len(admin_logic.filter_orders(orders, "same_day")) == 2
    assert len(admin_logic.filter_orders(orders, "open")) == 2
    assert len(admin_logic.filter_orders(orders, "partial")) == 1


def test_kitchen_stats_use_open_and_partial_orders_only():
    orders = _orders_fixture()
    # active = the "open" x2 and "partial" x1 => items: paneer-paratha:2, puri:1, puri:2
    assert admin_logic.items_to_prepare(orders) == 2 + 1 + 2
    assert admin_logic.unique_dishes(orders) == 2       # paneer-paratha, puri
    assert admin_logic.orders_delivering(orders) == 3


def test_prep_list_aggregates_across_orders_sorted_desc():
    orders = _orders_fixture()
    rows = admin_logic.prep_list(orders)
    by_id = {r["item_id"]: r for r in rows}
    assert by_id["puri"] == {
        "item_id": "puri", "name": "Puri", "price": 15,
        "total_qty": 3, "order_count": 2,
    }
    assert by_id["paneer-paratha"]["total_qty"] == 2
    assert rows[0]["total_qty"] >= rows[-1]["total_qty"]


def test_special_orders_filters_active_and_flagged():
    orders = _orders_fixture()
    orders[0]["is_special"] = True   # open
    orders[2]["is_special"] = True   # completed — must be excluded
    assert [o["items"] for o in admin_logic.special_orders(orders)] == [{"paneer-paratha": 2}]
```

- [ ] **Step 2: Run tests, verify they fail**

Run: `python -m pytest tests/test_admin_logic.py -v`
Expected: FAIL — `AttributeError: module 'cateringv3.state.admin_logic' has no attribute 'new_count'`

- [ ] **Step 3: Append the aggregation functions**

Append to `cateringv3/state/admin_logic.py`:

```python
_ACTIVE_STATUSES = ("open", "partial")


def new_count(orders):
    return sum(1 for o in orders if o["status"] == "open")


def total_count(orders):
    return sum(1 for o in orders if o["status"] != "cancelled")


def revenue_total(orders):
    return sum(order_total(o) for o in orders if o["status"] != "cancelled")


def same_day_count(orders):
    return sum(1 for o in orders if o["is_same_day"] and o["status"] != "cancelled")


def open_count(orders):
    return sum(1 for o in orders if o["status"] == "open")


def partial_count(orders):
    return sum(1 for o in orders if o["status"] == "partial")


def filter_orders(orders, filter_name):
    visible = [o for o in orders if o["status"] != "cancelled"]
    if filter_name == "same_day":
        return [o for o in visible if o["is_same_day"]]
    if filter_name == "open":
        return [o for o in visible if o["status"] == "open"]
    if filter_name == "partial":
        return [o for o in visible if o["status"] == "partial"]
    return visible


def _active_orders(orders):
    return [o for o in orders if o["status"] in _ACTIVE_STATUSES]


def items_to_prepare(orders):
    return sum(qty for o in _active_orders(orders) for qty in o["items"].values())


def unique_dishes(orders):
    ids = {item_id for o in _active_orders(orders) for item_id in o["items"]}
    return len(ids)


def orders_delivering(orders):
    return len(_active_orders(orders))


def prep_list(orders):
    totals = {}
    order_counts = {}
    for o in _active_orders(orders):
        for item_id, qty in o["items"].items():
            totals[item_id] = totals.get(item_id, 0) + qty
            order_counts[item_id] = order_counts.get(item_id, 0) + 1
    rows = [
        {
            "item_id": item_id,
            "name": data.ITEMS_BY_ID[item_id]["name"],
            "price": data.ITEMS_BY_ID[item_id]["price"],
            "total_qty": qty,
            "order_count": order_counts[item_id],
        }
        for item_id, qty in totals.items()
    ]
    rows.sort(key=lambda r: r["total_qty"], reverse=True)
    return rows


def special_orders(orders):
    return [o for o in _active_orders(orders) if o["is_special"]]
```

- [ ] **Step 4: Run tests, verify they pass**

Run: `python -m pytest tests/test_admin_logic.py -v`
Expected: PASS (all tests in the file)

- [ ] **Step 5: Run whole suite, log commands, commit**

Run: `python -m pytest -v`
Expected: all pass. Append the run commands to `docs/Bashcommands.md`.

```bash
git add cateringv3/state/admin_logic.py tests/test_admin_logic.py docs/Bashcommands.md
git commit -m "feat: add kitchen/stat aggregation pure logic with tests"
```

---

### Task 3: AdminNavState

**Files:**
- Create: `cateringv3/state/adminnavstate.py`

**Interfaces:**
- Produces class `AdminNavState(rx.State)`:
  - Vars: `section: str = "orders"` (`"orders" | "menu"`), `nav_open: bool = False`.
  - Handlers: `set_section(name)`, `toggle_nav()`, `close_nav()`, `load_admin_data()` (async — calls the loader on `AdminOrdersState` and `AdminMenuState`; those are defined in Tasks 4-5, so this task adds the method with a `# TODO(Task 5): wire loaders` marker and Task 5's final step replaces it).

- [ ] **Step 1: Write the state**

```python
"""Top-level admin section switch (Orders vs Menu) and nav-dropdown open flag."""
import reflex as rx


class AdminNavState(rx.State):
    section: str = "orders"
    nav_open: bool = False

    @rx.event
    def set_section(self, name: str):
        self.section = name
        self.nav_open = False

    @rx.event
    def toggle_nav(self):
        self.nav_open = not self.nav_open

    @rx.event
    def close_nav(self):
        self.nav_open = False

    @rx.event
    async def load_admin_data(self):
        pass  # TODO(Task 5): call AdminOrdersState.load_mock_orders + AdminMenuState.load_menu
```

- [ ] **Step 2: Verify it imports**

Run:
```bash
python -c "import cateringv3.state.adminnavstate as m; print('ok', m.AdminNavState.__name__)"
```
Expected: `ok AdminNavState`

- [ ] **Step 3: Log the command, commit**

```bash
git add cateringv3/state/adminnavstate.py docs/Bashcommands.md
git commit -m "feat: add AdminNavState for section switch and nav dropdown"
```

---

### Task 4: AdminMenuState (draft/published menu)

**Files:**
- Create: `cateringv3/state/adminmenustate.py`

**Interfaces:**
- Consumes: `cateringv3.data.ITEMS`, `data.CATEGORIES`, `data.items_for`.
- Produces class `AdminMenuState(rx.State)`:
  - Vars: `published_items: list[dict] = []`, `draft_items: list[dict] = []`, `active_tab: str = "view"` (`"edit" | "view" | "publish"`), `active_category: str = ""`.
  - Computed: `active_items -> list[dict]`, `category_rows -> list[dict]` (`[{name, count}, ...]`), `draft_item_count -> int`, `ready_to_publish_label -> str` (`"24 items ready · Publish →"`).
  - Handlers: `load_menu()`, `set_tab(tab)`, `set_category(name)`, `update_name(item_id, value)`, `update_price(item_id, value)`, `update_desc(item_id, value)`, `update_unit(item_id, value)`, `toggle_available(item_id)`, `add_item(category)`, `publish()`.

- [ ] **Step 1: Write the state**

```python
"""Admin menu: draft (Edit) vs published (View) snapshot, Publish copies draft -> published."""
import copy
import reflex as rx
from cateringv3 import data


class AdminMenuState(rx.State):
    published_items: list[dict] = []
    draft_items: list[dict] = []
    active_tab: str = "view"
    active_category: str = ""

    @rx.event
    def load_menu(self):
        if self.published_items:
            return
        seeded = [dict(item, available=True) for item in data.ITEMS]
        self.published_items = copy.deepcopy(seeded)
        self.draft_items = copy.deepcopy(seeded)
        self.active_category = data.CATEGORIES[0]

    @rx.var
    def _active_source(self) -> list[dict]:
        return self.draft_items if self.active_tab in ("edit", "publish") else self.published_items

    @rx.var
    def active_items(self) -> list[dict]:
        return [i for i in self._active_source if i["category"] == self.active_category]

    @rx.var
    def category_rows(self) -> list[dict]:
        source = self._active_source
        return [
            {"name": cat, "count": sum(1 for i in source if i["category"] == cat)}
            for cat in data.CATEGORIES
        ]

    @rx.var
    def draft_item_count(self) -> int:
        return len(self.draft_items)

    @rx.var
    def ready_to_publish_label(self) -> str:
        return f"{self.draft_item_count} items ready · Publish →"

    @rx.event
    def set_tab(self, tab: str):
        self.active_tab = tab

    @rx.event
    def set_category(self, name: str):
        self.active_category = name

    def _find_draft(self, item_id: str):
        for item in self.draft_items:
            if item["id"] == item_id:
                return item
        return None

    @rx.event
    def update_name(self, item_id: str, value: str):
        item = self._find_draft(item_id)
        if item is not None:
            item["name"] = value

    @rx.event
    def update_price(self, item_id: str, value: str):
        item = self._find_draft(item_id)
        if item is not None and value.isdigit():
            item["price"] = int(value)

    @rx.event
    def update_desc(self, item_id: str, value: str):
        item = self._find_draft(item_id)
        if item is not None:
            item["desc"] = value

    @rx.event
    def update_unit(self, item_id: str, value: str):
        item = self._find_draft(item_id)
        if item is not None:
            item["unit"] = value

    @rx.event
    def toggle_available(self, item_id: str):
        item = self._find_draft(item_id)
        if item is not None:
            item["available"] = not item["available"]

    @rx.event
    def add_item(self, category: str):
        new_id = f"draft-item-{len(self.draft_items) + 1}"
        self.draft_items.append({
            "id": new_id, "category": category, "name": "New item",
            "desc": "", "price": 0, "unit": "per pc", "veg": True, "available": True,
        })

    @rx.event
    def publish(self):
        self.published_items = copy.deepcopy(self.draft_items)
```

- [ ] **Step 2: Verify it imports**

Run:
```bash
python -c "import cateringv3.state.adminmenustate as m; print('ok', m.AdminMenuState.__name__)"
```
Expected: `ok AdminMenuState`

Verify `@rx.var` on a name starting with `_` (`_active_source`) is treated as a private-to-backend computed var not exposed to the frontend, per reflex-docs. If Reflex requires a different convention for "computed var used only by other computed vars, never rendered directly", rename to a plain public `active_source` and note it in the task report — functionality is unaffected either way.

- [ ] **Step 3: Log the command, commit**

```bash
git add cateringv3/state/adminmenustate.py docs/Bashcommands.md
git commit -m "feat: add AdminMenuState with draft/published menu split"
```

---

### Task 5: AdminOrdersState (orders list, filters, stats)

**Files:**
- Create: `cateringv3/state/adminordersstate.py`
- Modify: `cateringv3/state/adminnavstate.py` (replace the `load_admin_data` TODO)

**Interfaces:**
- Consumes: `admin_data.MOCK_ORDERS`, `admin_logic.*` from Tasks 1-2.
- Produces class `AdminOrdersState(rx.State)`:
  - Vars: `orders: list[dict] = []`, `active_tab: str = "orders"` (`"orders" | "kitchen"`), `active_filter: str = ""`, `active_order_id: str = ""`.
  - Computed (stats): `new_count`, `total_count`, `revenue_display`, `same_day_count`, `open_count`, `partial_count`, `has_partial -> bool`.
  - Computed (kitchen): `items_to_prepare`, `unique_dishes`, `orders_delivering`, `prep_list_display -> list[dict]`, `special_orders_display -> list[dict]`.
  - Computed (list): `orders_display -> list[dict]`.
  - Handlers: `load_mock_orders()`, `set_tab(tab)`, `set_filter(name)`.

- [ ] **Step 1: Write the state**

```python
"""Admin orders list, filters, and Kitchen-tab aggregates. Order-detail sheet logic lives in Task 6."""
import copy
import reflex as rx
from cateringv3 import admin_data
from cateringv3.state import admin_logic


class AdminOrdersState(rx.State):
    orders: list[dict] = []
    active_tab: str = "orders"
    active_filter: str = ""
    active_order_id: str = ""

    @rx.event
    def load_mock_orders(self):
        if not self.orders:
            self.orders = copy.deepcopy(admin_data.MOCK_ORDERS)

    @rx.event
    def set_tab(self, tab: str):
        self.active_tab = tab

    @rx.event
    def set_filter(self, name: str):
        self.active_filter = "" if self.active_filter == name else name

    @rx.var
    def new_count(self) -> int:
        return admin_logic.new_count(self.orders)

    @rx.var
    def total_count(self) -> int:
        return admin_logic.total_count(self.orders)

    @rx.var
    def revenue_display(self) -> str:
        return admin_logic.money(admin_logic.revenue_total(self.orders))

    @rx.var
    def same_day_count(self) -> int:
        return admin_logic.same_day_count(self.orders)

    @rx.var
    def open_count(self) -> int:
        return admin_logic.open_count(self.orders)

    @rx.var
    def partial_count(self) -> int:
        return admin_logic.partial_count(self.orders)

    @rx.var
    def has_partial(self) -> bool:
        return self.partial_count > 0

    @rx.var
    def items_to_prepare(self) -> int:
        return admin_logic.items_to_prepare(self.orders)

    @rx.var
    def unique_dishes(self) -> int:
        return admin_logic.unique_dishes(self.orders)

    @rx.var
    def orders_delivering(self) -> int:
        return admin_logic.orders_delivering(self.orders)

    @rx.var
    def prep_list_display(self) -> list[dict]:
        rows = admin_logic.prep_list(self.orders)
        out = []
        for r in rows:
            plural = "s" if r["order_count"] != 1 else ""
            out.append({
                "item_id": r["item_id"],
                "name": r["name"],
                "meta": f"across {r['order_count']} order{plural} · {admin_logic.money(r['price'])} each",
                "qty_display": f"×{r['total_qty']}",
            })
        return out

    @rx.var
    def special_orders_display(self) -> list[dict]:
        out = []
        for o in admin_logic.special_orders(self.orders):
            out.append({
                "id": o["id"],
                "customer_name": o["customer_name"],
                "items_summary": admin_logic.order_items_summary(o),
                "note": o["special_note"],
            })
        return out

    @rx.var
    def orders_display(self) -> list[dict]:
        visible = admin_logic.filter_orders(self.orders, self.active_filter)
        out = []
        for o in visible:
            out.append({
                "id": o["id"],
                "customer_name": o["customer_name"],
                "items_summary": admin_logic.order_items_summary(o),
                "placed_display": o["placed_display"],
                "payment_method": o["payment_method"],
                "total_display": admin_logic.money(admin_logic.order_total(o)),
                "is_special": o["is_special"],
            })
        return out
```

- [ ] **Step 2: Wire the loader into `AdminNavState.load_admin_data`**

In `adminnavstate.py`, replace the `load_admin_data` body:

```python
    @rx.event
    async def load_admin_data(self):
        from cateringv3.state.adminordersstate import AdminOrdersState
        from cateringv3.state.adminmenustate import AdminMenuState
        orders_state = await self.get_state(AdminOrdersState)
        orders_state.load_mock_orders()
        menu_state = await self.get_state(AdminMenuState)
        menu_state.load_menu()
```

Use local imports (inside the method) to avoid a circular import between `adminnavstate.py` and the two other state modules, matching the same pattern the customer app uses in `customerorderstate.py`'s `_reset_packing`.

- [ ] **Step 3: Verify import and no circular-import error**

Run:
```bash
python -c "from cateringv3.state.adminnavstate import AdminNavState; from cateringv3.state.adminordersstate import AdminOrdersState; print('ok')"
```
Expected: `ok`

- [ ] **Step 4: Run full suite, log commands, commit**

Run: `python -m pytest -v`
Expected: all pass.

```bash
git add cateringv3/state/adminordersstate.py cateringv3/state/adminnavstate.py docs/Bashcommands.md
git commit -m "feat: add AdminOrdersState with filters and kitchen stats"
```

---

### Task 6: Order-detail sheet state (open/strike/save/complete/cancel)

**Files:**
- Modify: `cateringv3/state/adminordersstate.py`

**Interfaces:**
- Consumes: `admin_logic.order_line_items`, `order_original_total`, `order_total`.
- Produces (added to `AdminOrdersState`):
  - Computed: `show_order_sheet -> bool`, `active_order_lines -> list[dict]`, `active_order_id_display`, `active_order_placed_display`, `active_order_customer_name`, `active_order_phone`, `active_order_payment_method`, `active_order_original_total_display`, `active_order_total_display`, `active_order_has_strikes -> bool`.
  - Handlers: `open_order(order_id)`, `close_order()`, `toggle_strike(item_id)`, `save_partial()`, `mark_completed()`, `cancel_order()`.

- [ ] **Step 1: Append to `adminordersstate.py`**

```python
    def _find_order(self, order_id: str):
        for o in self.orders:
            if o["id"] == order_id:
                return o
        return None

    @rx.var
    def show_order_sheet(self) -> bool:
        return self.active_order_id != ""

    @rx.var
    def active_order_lines(self) -> list[dict]:
        order = self._find_order(self.active_order_id)
        if order is None:
            return []
        return admin_logic.order_line_items(order)

    @rx.var
    def active_order_id_display(self) -> str:
        order = self._find_order(self.active_order_id)
        return order["id"] if order else ""

    @rx.var
    def active_order_placed_display(self) -> str:
        order = self._find_order(self.active_order_id)
        return order["placed_display"] if order else ""

    @rx.var
    def active_order_customer_name(self) -> str:
        order = self._find_order(self.active_order_id)
        return order["customer_name"] if order else ""

    @rx.var
    def active_order_phone(self) -> str:
        order = self._find_order(self.active_order_id)
        return order["phone"] if order else ""

    @rx.var
    def active_order_payment_method(self) -> str:
        order = self._find_order(self.active_order_id)
        return order["payment_method"] if order else ""

    @rx.var
    def active_order_original_total_display(self) -> str:
        order = self._find_order(self.active_order_id)
        return admin_logic.money(admin_logic.order_original_total(order)) if order else ""

    @rx.var
    def active_order_total_display(self) -> str:
        order = self._find_order(self.active_order_id)
        return admin_logic.money(admin_logic.order_total(order)) if order else ""

    @rx.var
    def active_order_has_strikes(self) -> bool:
        order = self._find_order(self.active_order_id)
        return bool(order and order["struck_item_ids"])

    @rx.event
    def open_order(self, order_id: str):
        self.active_order_id = order_id

    @rx.event
    def close_order(self):
        self.active_order_id = ""

    @rx.event
    def toggle_strike(self, item_id: str):
        order = self._find_order(self.active_order_id)
        if order is None:
            return
        if item_id in order["struck_item_ids"]:
            order["struck_item_ids"].remove(item_id)
        else:
            order["struck_item_ids"].append(item_id)

    @rx.event
    def save_partial(self):
        order = self._find_order(self.active_order_id)
        if order is not None:
            order["status"] = "partial" if order["struck_item_ids"] else "open"
        self.close_order()

    @rx.event
    def mark_completed(self):
        order = self._find_order(self.active_order_id)
        if order is not None:
            order["status"] = "completed"
        self.close_order()

    @rx.event
    def cancel_order(self):
        order = self._find_order(self.active_order_id)
        if order is not None:
            order["status"] = "cancelled"
        self.close_order()
```

- [ ] **Step 2: Verify import**

Run:
```bash
python -c "from cateringv3.state.adminordersstate import AdminOrdersState; print('ok')"
```
Expected: `ok`

- [ ] **Step 3: Run full suite, log commands, commit**

Run: `python -m pytest -v`
Expected: all pass.

```bash
git add cateringv3/state/adminordersstate.py docs/Bashcommands.md
git commit -m "feat: add order-detail sheet logic (strike, save partial, complete, cancel)"
```

---

### Task 7: Shared admin components — `stat_tile`, `nav_dropdown`

**Files:**
- Create: `cateringv3/components/admin/__init__.py` (empty)
- Create: `cateringv3/components/admin/stat_tile.py`
- Create: `cateringv3/components/admin/nav_dropdown.py`

**Interfaces:**
- Consumes: `theme.COLORS`, `AdminNavState`.
- Produces:
  - `stat_tile.stat_tile(label: str, value, sublabel: str, variant: str = "default") -> rx.Component` — `variant` in `"default" | "highlight" | "dark"` (matches the New/Total/Revenue tile styles).
  - `nav_dropdown.nav_dropdown() -> rx.Component`.

- [ ] **Step 1: Write `stat_tile.py`**

```python
import reflex as rx
from cateringv3.theme import COLORS


_VARIANT_STYLE = {
    "default": {"background": COLORS["card"], "color": COLORS["ink"]},
    "highlight": {"background": COLORS["terracotta_soft"], "color": COLORS["terracotta"]},
    "dark": {"background": COLORS["ink"], "color": "white"},
}


def stat_tile(label, value, sublabel, variant="default") -> rx.Component:
    style = _VARIANT_STYLE[variant]

    return rx.vstack(
        rx.text(label, font_size="12px", color=style["color"], opacity="0.7"),
        rx.text(value, font_size="24px", font_weight="700", color=style["color"]),
        rx.text(sublabel, font_size="12px", color=style["color"], opacity="0.7"),
        background=style["background"],
        border_radius="14px",
        padding="12px",
        align="start",
        spacing="1",
        flex="1",
    )
```

- [ ] **Step 2: Write `nav_dropdown.py`**

Each row's highlight state is a real Var comparison (`AdminNavState.section == "orders"`), not a Python bool — so the label weight/background/color inside `_row` must branch with `rx.cond`, not a plain `if/else`.

```python
import reflex as rx
from cateringv3.theme import COLORS
from cateringv3.state.adminnavstate import AdminNavState


def _row(icon: str, label: str, active, on_click=None) -> rx.Component:
    return rx.hstack(
        rx.box(
            icon,
            width="28px",
            height="28px",
            border_radius="8px",
            background=COLORS["terracotta_soft"],
            color=COLORS["terracotta"],
            display="flex",
            align_items="center",
            justify_content="center",
            font_weight="700",
            font_size="13px",
        ),
        rx.text(
            label,
            font_weight=rx.cond(active, "700", "500"),
            color=rx.cond(active, "white", COLORS["ink"]),
        ),
        on_click=on_click,
        background=rx.cond(active, COLORS["ink"], "transparent"),
        border_radius="10px",
        padding="10px 12px",
        width="100%",
        align="center",
        spacing="3",
    )


def nav_dropdown() -> rx.Component:
    return rx.cond(
        AdminNavState.nav_open,
        rx.vstack(
            rx.text(
                "SARTHI · CLIENT",
                font_size="11px",
                color=COLORS["muted"],
                padding="4px 12px",
            ),
            _row("O", "Orders", AdminNavState.section == "orders", AdminNavState.set_section("orders")),
            _row("M", "Edit menu", AdminNavState.section == "menu", AdminNavState.set_section("menu")),
            _row("C", "Customers", False),
            _row("$", "Payments", False),
            _row("⚙", "Settings", False),
            background=COLORS["card"],
            border_radius="14px",
            box_shadow="0 4px 16px rgba(0,0,0,0.12)",
            padding="8px",
            width="220px",
            position="absolute",
            top="60px",
            left="0",
            z_index="30",
            spacing="1",
            align="start",
        ),
    )
```

- [ ] **Step 3: Compile-check**

Run:
```bash
python -c "from cateringv3.components.admin import stat_tile, nav_dropdown; print('ok')"
```
Expected: `ok`

Verify `rx.cond` accepts a plain Python `False` (used for the Customers/Payments/Settings rows, which are permanently inactive) alongside Var comparisons in the other two rows — if it requires a Var on both branches, use `rx.Var.create(False)` for those three calls instead.

- [ ] **Step 4: Log the command, commit**

```bash
git add cateringv3/components/admin/__init__.py cateringv3/components/admin/stat_tile.py cateringv3/components/admin/nav_dropdown.py docs/Bashcommands.md
git commit -m "feat: add stat_tile and nav_dropdown admin components"
```

---

### Task 8: `base_page` decorator + admin header component

**Files:**
- Create: `cateringv3/components/base_page.py`
- Create: `cateringv3/components/admin/admin_header.py`

**Interfaces:**
- Consumes: `theme.COLORS`, `theme.FONT_SERIF`, `AdminNavState`, `components/admin/nav_dropdown.py` (Task 7).
- Produces:
  - `base_page.base_page(page_fn) -> Callable` — decorator per `docs/reflex-sarthi.md` section 5.
  - `admin_header.admin_header() -> rx.Component` — "S" logo button (toggles nav), section title, date pill (static display text — no real calendar wiring this round).

- [ ] **Step 1: Write `admin_header.py`**

```python
import reflex as rx
from cateringv3.theme import COLORS, FONT_SERIF
from cateringv3.state.adminnavstate import AdminNavState


def admin_header() -> rx.Component:
    return rx.hstack(
        rx.button(
            "S",
            on_click=AdminNavState.toggle_nav,
            width="40px",
            height="40px",
            border_radius="10px",
            background=COLORS["ink"],
            color="white",
            font_weight="700",
            font_family=FONT_SERIF,
        ),
        rx.vstack(
            rx.text(
                rx.cond(AdminNavState.section == "menu", "Menu", "Orders"),
                font_family=FONT_SERIF,
                font_size="22px",
                font_weight="700",
                color=COLORS["ink"],
            ),
            spacing="0",
            align="start",
        ),
        rx.spacer(),
        rx.box(
            rx.text("Tomorrow ▾", font_size="13px", color=COLORS["muted"]),
            border=f"1px solid {COLORS['muted']}40",
            border_radius="9999px",
            padding="6px 14px",
        ),
        width="100%",
        align="center",
        padding="12px 0",
        spacing="3",
    )
```

- [ ] **Step 2: Write `base_page.py`**

```python
"""Shared page shell decorator: injects background + header/nav around a page's unique content."""
import reflex as rx
from cateringv3.theme import COLORS
from cateringv3.components.admin.admin_header import admin_header
from cateringv3.components.admin.nav_dropdown import nav_dropdown


def base_page(page_fn):
    def wrapper(*args, **kwargs) -> rx.Component:
        content = page_fn(*args, **kwargs)

        return rx.box(
            rx.box(
                admin_header(),
                nav_dropdown(),
                content,
                width="100%",
                max_width="430px",
                margin="0 auto",
                padding="0 16px",
            ),
            background=COLORS["cream"],
            min_height="100vh",
            width="100%",
        )

    wrapper.__name__ = page_fn.__name__
    return wrapper
```

- [ ] **Step 3: Compile-check**

Run:
```bash
python -c "from cateringv3.components.base_page import base_page; print('ok')"
```
Expected: `ok`

- [ ] **Step 4: Log the command, commit**

```bash
git add cateringv3/components/base_page.py cateringv3/components/admin/admin_header.py docs/Bashcommands.md
git commit -m "feat: add base_page decorator and admin header component"
```

---

### Task 9: Menu component — `menu_item_row` (dual-mode view/edit)

**Files:**
- Create: `cateringv3/components/admin/menu_item_row.py`

**Interfaces:**
- Consumes: `theme.COLORS`, `theme.CARD_STYLE`, `AdminMenuState`.
- Produces: `menu_item_row.menu_item_row(item, editable: bool) -> rx.Component` — `item` is a `Var[dict]` from `rx.foreach(AdminMenuState.active_items, ...)`.

- [ ] **Step 1: Write the component**

```python
import reflex as rx
from cateringv3.theme import COLORS, CARD_STYLE
from cateringv3.state.adminmenustate import AdminMenuState


def _view_row(item) -> rx.Component:
    return rx.hstack(
        rx.vstack(
            rx.text(item["name"], font_weight="600", color=COLORS["ink"]),
            rx.text(item["desc"], font_size="13px", color=COLORS["muted"]),
            align="start", spacing="1",
        ),
        rx.spacer(),
        rx.vstack(
            rx.text("₹", item["price"].to(str), font_weight="600", color=COLORS["ink"]),
            rx.text(item["unit"], font_size="11px", color=COLORS["muted"]),
            align="end", spacing="1",
        ),
        width="100%", align="center", **CARD_STYLE,
    )


def _edit_row(item) -> rx.Component:
    item_id = item["id"].to(str)
    return rx.vstack(
        rx.hstack(
            rx.input(
                value=item["name"], on_change=AdminMenuState.update_name(item_id),
                background="transparent", font_weight="600",
            ),
            rx.hstack(
                rx.text("₹", color=COLORS["muted"]),
                rx.input(
                    value=item["price"].to(str), on_change=AdminMenuState.update_price(item_id),
                    width="70px",
                ),
                align="center", spacing="1",
            ),
            width="100%", spacing="3",
        ),
        rx.input(
            value=item["desc"], on_change=AdminMenuState.update_desc(item_id),
            font_size="13px", background="transparent",
        ),
        rx.input(
            value=item["unit"], on_change=AdminMenuState.update_unit(item_id),
            font_size="12px", background="transparent", width="120px",
        ),
        rx.hstack(
            rx.switch(
                checked=item["available"],
                on_change=lambda _: AdminMenuState.toggle_available(item_id),
            ),
            rx.text("Available today", font_size="13px", color=COLORS["muted"]),
            align="center", spacing="2",
        ),
        width="100%", align="start", spacing="2", **CARD_STYLE,
    )


def menu_item_row(item, editable: bool) -> rx.Component:
    return _edit_row(item) if editable else _view_row(item)
```

> `editable` is a plain Python bool (chosen once when the parent page builds the `rx.foreach` call for the current tab — the tab itself, not each row, decides view-vs-edit), so the `if/else` in `menu_item_row` is normal Python branching, not a Reflex Var condition. This is safe. The `rx.switch(on_change=lambda _: ...)` binding needs a compile-check — verify `rx.switch`'s `on_change` signature against reflex-docs before relying on the lambda-with-ignored-arg form; if `on_change` requires a handler that takes no extra args (switches often just toggle), drop the lambda and pass `AdminMenuState.toggle_available(item_id)` directly.

- [ ] **Step 2: Compile-check**

Run:
```bash
python -c "from cateringv3.components.admin.menu_item_row import menu_item_row; print('ok')"
```
Expected: `ok`

- [ ] **Step 3: Log the command, commit**

```bash
git add cateringv3/components/admin/menu_item_row.py docs/Bashcommands.md
git commit -m "feat: add dual-mode menu_item_row component"
```

---

### Task 10: Orders components — `order_card`, `order_detail_sheet`

**Files:**
- Create: `cateringv3/components/admin/order_card.py`
- Create: `cateringv3/components/admin/order_detail_sheet.py`

**Interfaces:**
- Consumes: `theme.COLORS`, `theme.CARD_STYLE`, `components/bottom_sheet.py`, `AdminOrdersState`.
- Produces:
  - `order_card.order_card(order) -> rx.Component` — `order` is a `Var[dict]` from `rx.foreach(AdminOrdersState.orders_display, ...)`.
  - `order_detail_sheet.order_detail_sheet() -> rx.Component` — reads `AdminOrdersState.show_order_sheet` / `active_order_*` vars directly (no params).

- [ ] **Step 1: Write `order_card.py`**

```python
import reflex as rx
from cateringv3.theme import COLORS, CARD_STYLE
from cateringv3.state.adminordersstate import AdminOrdersState


def order_card(order) -> rx.Component:
    return rx.vstack(
        rx.hstack(
            rx.text(order["id"], font_weight="700", color=COLORS["ink"]),
            rx.text(order["customer_name"], color=COLORS["muted"]),
            rx.cond(
                order["is_special"],
                rx.box("★ Special", background="#F6E6DC", color=COLORS["terracotta"],
                       border_radius="9999px", padding="2px 10px", font_size="11px"),
            ),
            rx.spacer(),
            rx.box(
                order["payment_method"],
                background=rx.cond(order["payment_method"] == "online", COLORS["green_soft"], COLORS["terracotta_soft"]),
                color=rx.cond(order["payment_method"] == "online", COLORS["green"], COLORS["terracotta"]),
                border_radius="9999px", padding="2px 10px", font_size="11px",
            ),
            width="100%", align="center", spacing="2",
        ),
        rx.text(order["items_summary"], font_size="13px", color=COLORS["muted"]),
        rx.hstack(
            rx.text(order["placed_display"], font_size="12px", color=COLORS["muted"]),
            rx.spacer(),
            rx.text(order["total_display"], font_weight="700", color=COLORS["ink"]),
            width="100%", align="center",
        ),
        on_click=AdminOrdersState.open_order(order["id"]),
        width="100%", align="start", spacing="2", **CARD_STYLE,
    )
```

- [ ] **Step 2: Write `order_detail_sheet.py`**

```python
import reflex as rx
from cateringv3.theme import COLORS
from cateringv3.components.bottom_sheet import bottom_sheet
from cateringv3.state.adminordersstate import AdminOrdersState


def _line_row(line) -> rx.Component:
    return rx.hstack(
        rx.text(
            line["name"],
            text_decoration=rx.cond(line["struck"], "line-through", "none"),
            color=rx.cond(line["struck"], COLORS["muted"], COLORS["ink"]),
        ),
        rx.text("×", line["qty"].to(str), color=COLORS["muted"]),
        rx.spacer(),
        rx.text("₹", line["subtotal"].to(str)),
        on_click=AdminOrdersState.toggle_strike(line["item_id"]),
        width="100%", align="center", spacing="2", padding="8px 0",
    )


def order_detail_sheet() -> rx.Component:
    return bottom_sheet(
        AdminOrdersState.show_order_sheet,
        rx.vstack(
            rx.hstack(
                rx.vstack(
                    rx.text(
                        AdminOrdersState.active_order_id_display, " · ",
                        AdminOrdersState.active_order_placed_display,
                        font_size="12px", color=COLORS["muted"],
                    ),
                    rx.text(AdminOrdersState.active_order_customer_name, font_weight="700"),
                    rx.text(AdminOrdersState.active_order_phone, font_size="13px", color=COLORS["muted"]),
                    align="start", spacing="0",
                ),
                rx.spacer(),
                rx.box(AdminOrdersState.active_order_payment_method,
                       background=COLORS["green_soft"], color=COLORS["green"],
                       border_radius="9999px", padding="2px 10px", font_size="11px"),
                width="100%", align="start",
            ),
            rx.box(
                "Tap items you can't fulfill to strike them. Save with strikes to convert to Partial, "
                "or mark the whole order completed.",
                font_size="12px", color=COLORS["terracotta"],
                background=COLORS["terracotta_soft"], border_radius="10px", padding="8px 12px",
            ),
            rx.foreach(AdminOrdersState.active_order_lines, _line_row),
            rx.hstack(
                rx.text("Original total", color=COLORS["muted"]),
                rx.spacer(),
                rx.text(AdminOrdersState.active_order_original_total_display),
                width="100%",
            ),
            rx.hstack(
                rx.text("Total", font_weight="700"),
                rx.spacer(),
                rx.text(AdminOrdersState.active_order_total_display, font_weight="700"),
                width="100%",
            ),
            rx.hstack(
                rx.button("Cancel order", on_click=AdminOrdersState.cancel_order, variant="ghost"),
                rx.button("Send SMS", on_click=AdminOrdersState.close_order, variant="ghost"),
                rx.cond(
                    AdminOrdersState.active_order_has_strikes,
                    rx.button(
                        "Save as Partial →",
                        on_click=AdminOrdersState.save_partial,
                        background=COLORS["terracotta"], color="white",
                    ),
                    rx.button(
                        "Mark completed →",
                        on_click=AdminOrdersState.mark_completed,
                        background=COLORS["terracotta"], color="white",
                    ),
                ),
                width="100%", spacing="2",
            ),
            rx.button("Save without completing", on_click=AdminOrdersState.save_partial, variant="ghost", width="100%"),
            width="100%", spacing="3",
        ),
    )
```

The primary action is two separate buttons switched by `rx.cond` at the component level (not one button with a conditionally-chosen `on_click` handler) — `on_click` needs one fixed handler per button at build time, and `rx.cond` reliably switches between two *components*, which is the proven pattern already used elsewhere in this plan (e.g. `nav_dropdown`'s row highlighting).

- [ ] **Step 3: Compile-check**

Run:
```bash
python -c "from cateringv3.components.admin.order_card import order_card; from cateringv3.components.admin.order_detail_sheet import order_detail_sheet; print('ok')"
```
Expected: `ok`

- [ ] **Step 4: Log the command, commit**

```bash
git add cateringv3/components/admin/order_card.py cateringv3/components/admin/order_detail_sheet.py docs/Bashcommands.md
git commit -m "feat: add order_card and order_detail_sheet components"
```

---

### Task 11: `pages/admin_menu.py` (Edit / View / Publish tabs)

**Files:**
- Create: `cateringv3/pages/admin_menu.py`

**Interfaces:**
- Consumes: `AdminMenuState` (`active_tab`, `active_category`, `category_rows`, `active_items`, `ready_to_publish_label`), `components/admin/menu_item_row.py`. The tab bar and category chips are built inline here (matching `components/category_chips.py`'s row-of-buttons style) rather than imported, since that file is category-specific to the customer app, not a generic tab-bar helper.
- Produces: `admin_menu.menu_page() -> rx.Component`.

- [ ] **Step 1: Write the page**

```python
import reflex as rx
from cateringv3.theme import COLORS
from cateringv3.state.adminmenustate import AdminMenuState
from cateringv3.components.admin.menu_item_row import menu_item_row


def _tab_bar() -> rx.Component:
    def _tab(name, label):
        active = AdminMenuState.active_tab == name
        return rx.button(
            label, on_click=AdminMenuState.set_tab(name),
            background=rx.cond(active, "white", "transparent"),
            color=COLORS["ink"], border_radius="9999px", padding="8px 20px",
            font_weight=rx.cond(active, "700", "500"), flex="1",
        )

    return rx.hstack(
        _tab("edit", "Edit"), _tab("view", "View"), _tab("publish", "Publish"),
        background=COLORS["terracotta_soft"], border_radius="9999px", padding="4px",
        width="100%",
    )


def _category_chips() -> rx.Component:
    def _chip(row):
        active = AdminMenuState.active_category == row["name"]
        return rx.button(
            rx.hstack(rx.text(row["name"]), rx.badge(row["count"]), spacing="1"),
            on_click=AdminMenuState.set_category(row["name"]),
            background=rx.cond(active, COLORS["ink"], "transparent"),
            color=rx.cond(active, "white", COLORS["muted"]),
            border_radius="9999px", padding="8px 16px", font_size="14px",
            white_space="nowrap", flex_shrink="0",
        )

    return rx.hstack(
        rx.foreach(AdminMenuState.category_rows, _chip),
        overflow_x="auto", spacing="2", width="100%", padding_y="4px",
    )


def menu_page() -> rx.Component:
    return rx.vstack(
        _tab_bar(),
        _category_chips(),
        rx.cond(
            AdminMenuState.active_tab == "publish",
            rx.box(
                rx.text(AdminMenuState.ready_to_publish_label, font_weight="600"),
                rx.button("Publish →", on_click=AdminMenuState.publish,
                          background=COLORS["ink"], color="white", border_radius="10px"),
                width="100%", padding="12px",
            ),
        ),
        rx.cond(
            AdminMenuState.active_tab == "edit",
            rx.foreach(AdminMenuState.active_items, lambda item: menu_item_row(item, editable=True)),
            rx.foreach(AdminMenuState.active_items, lambda item: menu_item_row(item, editable=False)),
        ),
        width="100%",
        spacing="3",
    )
```

`editable` is a plain Python bool chosen once per branch at build time (the tab decides view-vs-edit for every row, not each row individually — see Task 9's note), so the two separate `rx.foreach` calls inside `rx.cond` is the correct shape, not a per-row `if`.

Menu data loads via `AdminNavState.load_admin_data`, wired to `app.add_page(..., on_load=...)` in Task 13 — `menu_page()` itself doesn't need its own load hook.

- [ ] **Step 2: Compile-check**

Run:
```bash
python -c "from cateringv3.pages.admin_menu import menu_page; print('ok')"
```
Expected: `ok`

Verify `rx.badge` accepts an `int`-typed Var (`row["count"]`) the same way the customer app's `header.py` already does with `rx.badge(OS.cart_count)`.

- [ ] **Step 3: Log the command, commit**

```bash
git add cateringv3/pages/admin_menu.py docs/Bashcommands.md
git commit -m "feat: add admin menu page with Edit/View/Publish tabs"
```

---

### Task 12: `pages/admin_orders.py` (Orders / Kitchen tabs)

**Files:**
- Create: `cateringv3/pages/admin_orders.py`

**Interfaces:**
- Consumes: `AdminOrdersState`, `components/admin/{stat_tile,order_card,order_detail_sheet}.py`.
- Produces: `admin_orders.orders_page() -> rx.Component`.

- [ ] **Step 1: Write the page**

```python
import reflex as rx
from cateringv3.theme import COLORS
from cateringv3.state.adminordersstate import AdminOrdersState
from cateringv3.components.admin.stat_tile import stat_tile
from cateringv3.components.admin.order_card import order_card
from cateringv3.components.admin.order_detail_sheet import order_detail_sheet


def _section_tab_bar() -> rx.Component:
    def _tab(name, label, count):
        active = AdminOrdersState.active_tab == name
        return rx.button(
            rx.hstack(rx.text(label), rx.badge(count), spacing="1"),
            on_click=AdminOrdersState.set_tab(name),
            background=rx.cond(active, "white", "transparent"),
            border_radius="9999px", padding="8px 16px", flex="1",
        )

    return rx.hstack(
        _tab("orders", "Orders", AdminOrdersState.total_count),
        _tab("kitchen", "Kitchen", AdminOrdersState.items_to_prepare),
        background=COLORS["terracotta_soft"], border_radius="9999px", padding="4px", width="100%",
    )


def _filter_chip(name, label, count) -> rx.Component:
    active = AdminOrdersState.active_filter == name
    return rx.button(
        rx.hstack(rx.text(label), rx.badge(count), spacing="1"),
        on_click=AdminOrdersState.set_filter(name),
        background=rx.cond(active, COLORS["ink"], "transparent"),
        color=rx.cond(active, "white", COLORS["ink"]),
        border_radius="9999px", padding="8px 16px", border=f"1px solid {COLORS['muted']}40",
    )


def _orders_tab() -> rx.Component:
    return rx.vstack(
        rx.hstack(
            stat_tile("New", AdminOrdersState.new_count, "to confirm", variant="highlight"),
            stat_tile("Total", AdminOrdersState.total_count, "orders today"),
            stat_tile("Revenue", AdminOrdersState.revenue_display,
                      rx.cond(AdminOrdersState.has_partial, "1 partial", ""), variant="dark"),
            width="100%", spacing="2",
        ),
        rx.hstack(
            _filter_chip("same_day", "Same-day", AdminOrdersState.same_day_count),
            _filter_chip("open", "Open", AdminOrdersState.open_count),
            _filter_chip("partial", "Partial", AdminOrdersState.partial_count),
            spacing="2",
        ),
        rx.foreach(AdminOrdersState.orders_display, order_card),
        width="100%", spacing="3",
    )


def _special_order_card(order) -> rx.Component:
    return rx.vstack(
        rx.hstack(
            rx.text(order["id"], font_weight="700"),
            rx.text(order["customer_name"], color=COLORS["muted"]),
            width="100%",
        ),
        rx.text(order["items_summary"], font_size="13px", color=COLORS["muted"]),
        rx.text(order["note"], font_size="13px"),
        width="100%", align="start", spacing="1", padding="12px",
        background=COLORS["card"], border_radius="14px",
    )


def _prep_row(row) -> rx.Component:
    return rx.hstack(
        rx.vstack(
            rx.text(row["name"], font_weight="600"),
            rx.text(row["meta"], font_size="12px", color=COLORS["muted"]),
            align="start", spacing="0",
        ),
        rx.spacer(),
        rx.text(row["qty_display"], font_weight="700"),
        width="100%", align="center", padding="8px 0",
    )


def _kitchen_tab() -> rx.Component:
    return rx.vstack(
        rx.hstack(
            stat_tile("Items", AdminOrdersState.items_to_prepare, "to prepare"),
            stat_tile("Dishes", AdminOrdersState.unique_dishes, "unique"),
            stat_tile("Orders", AdminOrdersState.orders_delivering, "delivering"),
            width="100%", spacing="2",
        ),
        rx.text("Special orders", font_weight="700"),
        rx.foreach(AdminOrdersState.special_orders_display, _special_order_card),
        rx.text("Prep list", font_weight="700"),
        rx.foreach(AdminOrdersState.prep_list_display, _prep_row),
        width="100%", spacing="3",
    )


def orders_page() -> rx.Component:
    return rx.box(
        _section_tab_bar(),
        rx.cond(AdminOrdersState.active_tab == "kitchen", _kitchen_tab(), _orders_tab()),
        order_detail_sheet(),
        width="100%",
    )
```

- [ ] **Step 2: Compile-check**

Run:
```bash
python -c "from cateringv3.pages.admin_orders import orders_page; print('ok')"
```
Expected: `ok`

Verify `rx.badge` exists with this call signature (`rx.badge(count)`) against reflex-docs — the customer app's `header.py` already uses `rx.badge(OS.cart_count)`, so this is a proven pattern; just confirm it still applies to an `int`-typed Var here (`total_count`, `items_to_prepare`, etc.) the same way.

- [ ] **Step 3: Log the command, commit**

```bash
git add cateringv3/pages/admin_orders.py docs/Bashcommands.md
git commit -m "feat: add admin orders page with Orders/Kitchen tabs"
```

---

### Task 13: Assemble `/admin`, mount the route, smoke-test

**Files:**
- Create: `cateringv3/pages/admin.py`
- Modify: `cateringv3/cateringv3.py` (add one import + one `app.add_page` call — no change to the existing `/` line)

**Interfaces:**
- Consumes: `base_page`, `AdminNavState`, `pages/admin_menu.py`, `pages/admin_orders.py`.
- Produces: `admin.admin() -> rx.Component`, registered at route `/admin`.

- [ ] **Step 1: Write `pages/admin.py`**

```python
import reflex as rx
from cateringv3.components.base_page import base_page
from cateringv3.state.adminnavstate import AdminNavState
from cateringv3.pages.admin_menu import menu_page
from cateringv3.pages.admin_orders import orders_page


@base_page
def admin() -> rx.Component:
    return rx.cond(AdminNavState.section == "menu", menu_page(), orders_page())
```

- [ ] **Step 2: Modify `cateringv3.py`**

Add one import near the other `from cateringv3.pages...` imports:

```python
from cateringv3.pages.admin import admin
from cateringv3.state.adminnavstate import AdminNavState
```

Add one line directly after the existing `app.add_page(index, route="/", on_load=OS.init_date)`:

```python
app.add_page(admin, route="/admin", on_load=AdminNavState.load_admin_data)
```

The existing `/` registration is untouched — this is purely additive per the guard rail.

- [ ] **Step 3: Compile-check**

Run:
```bash
python -c "from cateringv3.cateringv3 import app; print('ok', [r.route for r in app.pages.values()] if hasattr(app, 'pages') else 'app loaded')"
```
Expected: no import errors. If `app.pages` isn't the right attribute to introspect registered routes on this Reflex version, drop that part of the check — the absence of an exception is what matters here.

- [ ] **Step 4: Run + smoke-test in a browser**

Follow the reflex-process-management skill to compile and run the app. Once running, navigate to `/admin` and click through:
1. Orders tab loads with 6 mock orders, correct New/Total/Revenue stat tiles.
2. Filter chips (Same-day/Open/Partial) narrow the list and toggle off on second click.
3. Tapping an order card opens the detail sheet; tapping a line item strikes it and the Total recalculates; "Save without completing" and the primary action both close the sheet.
4. Kitchen tab shows the 3 stat tiles, the 2 special orders with their notes, and the aggregated prep list.
5. The "S" logo opens the nav dropdown; "Edit menu" switches to the Menu section with the real 5-category/24-item menu.
6. Edit tab: editing a name/price/desc/unit updates the draft; toggling "Available today" flips it. View tab still shows the last-published (unedited) content. Publish tab shows the draft with the "Publish →" bar; clicking it copies draft into published, and View now reflects the changes.

Note any Reflex API mismatches found during this pass, fix them, and re-run the affected compile-check from that task.

- [ ] **Step 5: Run full suite one last time, log commands**

Run: `python -m pytest -v`
Expected: all pass (customer app tests + all admin_logic tests).

- [ ] **Step 6: Update `TODO.md` and `docs/PLAN.md`**

Mark the admin-app build items in `TODO.md` as done; update `docs/PLAN.md` to note the plan is fully implemented and smoke-tested.

- [ ] **Step 7: Commit**

```bash
git add cateringv3/pages/admin.py cateringv3/cateringv3.py docs/Bashcommands.md TODO.md docs/PLAN.md
git commit -m "feat: assemble /admin route with nav-driven section switch"
```
