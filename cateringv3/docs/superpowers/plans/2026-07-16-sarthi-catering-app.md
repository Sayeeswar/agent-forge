# Sarthi Catering App Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build componentized, fully-interactive mock of Sarthi catering ordering flow (menu → date → profile → cart → container packing → payment → success) as mobile-first, responsive Reflex single-page app matching 7 design screenshots.

**Architecture:** Single page at `/`. Menu = always-mounted base layer; overlays (cart, date picker, profile) toggle via boolean flags on nav state; `stage` swaps in full-screen `containers`/`success` takeovers. Business logic = pure functions in `packing.py` (unit-tested); three thin `rx.State` classes wire those functions to events, expose display-ready computed vars; UI only reads/displays `State.<var>`. Responsive shell uses `rx.mobile_only()` (phone column) and `rx.tablet_and_desktop()` (two-pane).

**Tech Stack:** Reflex 0.9.6 (Python), Tailwind V4 plugin, self-hosted `@font-face` fonts, pytest for pure logic layer.

## Global Constraints

- **Reflex version:** 0.9.6 — verify every Reflex API against reflex-docs skill or installed source before use; never guess component/prop/event names.
- **Backend-only logic:** No arithmetic, business conditionals, or formatting math in component tree. Pages/components read display-ready `State.<var>` only. All math lives in `packing.py` pure functions; states delegate to them.
- **File/function caps:** ≤ 300 lines per file, ≤ 40 lines per function.
- **Components:** Never `rx.html()`. Prefer `rx.box / vstack / hstack / flex / grid / card / dialog / drawer / foreach`. Rebuild designs w/ native Reflex components — no 1:1 HTML translation.
- **Folder layout:** `state/` package + `components/` + `pages/`, exactly as in spec's folder structure.
- **Git:** Work only on branch `sarthi-catering-app` (already checked out). Never commit to `main`/`master`. Commit after each task.
- **Guard rails:** Do NOT read or write `.web/`, `rxconfig.py`, `assets/favicon.ico`, existing `assets/*.png`, or `alembic/`. ONE sanctioned exception: create new `assets/fonts/` subfolder (spec Resolved decision #3).
- **Menu items:** Rotis & Breads are real (Paneer Paratha ₹80, Aloo Paratha ₹50, Puri ₹15, Oilless Phulka ₹10, Ghee Phulka ₹15, Ghee Chapathi ₹20); invent ~4–6 veg items each for Rice / Curries / Raw Salads / Dals. All items veg.
- **Container specs:** Small cap 3 / fee ₹5; Medium cap 6 / fee ₹8; Large cap 12 / fee ₹12.
- **Money:** All prices whole rupees (ints). Display as `"₹85"` (no decimals). 1 cart unit = 1 portion.
- **Mock user:** "Priya S.", orders_placed 12, balance "All paid up".

---

### Task 1: Theme tokens + self-hosted fonts

**Files:**
- Create: `cateringv3/theme.py`
- Create: `assets/fonts/` (download 2 `.woff2` files into it)

**Interfaces:**
- Produces: `theme.COLORS` (dict of 9 tokens), `theme.FONT_SERIF` (str), `theme.FONT_SANS` (str), `theme.FONT_FACE_CSS` (str of `@font-face` rules), shared style dicts `theme.CARD_STYLE`, `theme.PILL_STYLE`, `theme.SHEET_STYLE`.

- [ ] **Step 1: Download two font files**

Run (from repo root):
```bash
mkdir -p assets/fonts
curl -L -o assets/fonts/PlayfairDisplay.woff2 "https://raw.githubusercontent.com/google/fonts/main/ofl/playfairdisplay/PlayfairDisplay%5Bwght%5D.woff2"
curl -L -o assets/fonts/Inter.woff2 "https://raw.githubusercontent.com/google/fonts/main/ofl/inter/Inter%5Bopsz%2Cwght%5D.woff2"
ls -la assets/fonts/
```
Expected: two non-empty `.woff2` files listed. If either download 404s or < 10 KB, find current variable-font `.woff2` path in google/fonts repo (`ofl/playfairdisplay/`, `ofl/inter/`), retry; do NOT fall back to CDN `<link>` (offline/CSP requirement).

- [ ] **Step 2: Write `theme.py`**

```python
"""Visual system: color tokens, fonts, shared style dicts (approximated from screenshots)."""

COLORS = {
    "cream": "#F5EFE6",
    "card": "#FFFFFF",
    "terracotta": "#B5502E",
    "terracotta_soft": "#F6E6DC",
    "ink": "#241E1A",
    "muted": "#8A8178",
    "green": "#2E7D32",
    "green_soft": "#E8F0E9",
    "today_blue": "#DCE7F0",
}

FONT_SERIF = "Playfair Display, serif"
FONT_SANS = "Inter, sans-serif"

FONT_FACE_CSS = """
@font-face {
  font-family: 'Playfair Display';
  src: url('/fonts/PlayfairDisplay.woff2') format('woff2');
  font-weight: 400 900; font-display: swap;
}
@font-face {
  font-family: 'Inter';
  src: url('/fonts/Inter.woff2') format('woff2');
  font-weight: 100 900; font-display: swap;
}
"""

CARD_STYLE = {
    "background": COLORS["card"],
    "border_radius": "16px",
    "padding": "16px",
    "box_shadow": "0 1px 2px rgba(0,0,0,0.05)",
}

PILL_STYLE = {
    "border_radius": "9999px",
    "padding": "8px 16px",
    "font_size": "14px",
}

SHEET_STYLE = {
    "background": COLORS["card"],
    "border_radius": "24px 24px 0 0",
    "padding": "20px",
}
```

- [ ] **Step 3: Verify it imports**

Run:
```bash
python -c "from cateringv3 import theme; print(theme.COLORS['terracotta'], theme.FONT_SERIF)"
```
Expected: `#B5502E Playfair Display, serif`

- [ ] **Step 4: Commit**

```bash
git add cateringv3/theme.py assets/fonts/
git commit -m "feat: add theme tokens and self-hosted fonts"
```

---

### Task 2: Menu + container data

**Files:**
- Create: `cateringv3/data.py`
- Test: `tests/test_data.py`

**Interfaces:**
- Produces:
  - `data.CATEGORIES: list[str]` = `["Rotis & Breads", "Rice", "Curries", "Raw Salads", "Dals"]`
  - `data.ITEMS: list[dict]` — each `{id, category, name, desc, price, unit, veg: True}`
  - `data.ITEMS_BY_ID: dict[str, dict]`
  - `data.items_for(category: str) -> list[dict]`
  - `data.CONTAINER_SPECS: dict[str, dict]` = `{"Small": {"capacity": 3, "fee": 5}, "Medium": {"capacity": 6, "fee": 8}, "Large": {"capacity": 12, "fee": 12}}`

- [ ] **Step 1: Write failing test**

```python
# tests/test_data.py
from cateringv3 import data

def test_categories_exact():
    assert data.CATEGORIES == ["Rotis & Breads", "Rice", "Curries", "Raw Salads", "Dals"]

def test_real_rotis_items_present():
    breads = {i["name"]: i["price"] for i in data.items_for("Rotis & Breads")}
    assert breads["Paneer Paratha"] == 80
    assert breads["Aloo Paratha"] == 50
    assert breads["Puri"] == 15
    assert breads["Oilless Phulka"] == 10
    assert breads["Ghee Phulka"] == 15
    assert breads["Ghee Chapathi"] == 20

def test_every_category_has_items_all_veg_unique_ids():
    seen = set()
    for cat in data.CATEGORIES:
        items = data.items_for(cat)
        assert len(items) >= 4, f"{cat} needs >=4 items"
        for it in items:
            assert it["veg"] is True
            assert it["id"] not in seen
            seen.add(it["id"])
            assert set(it) == {"id", "category", "name", "desc", "price", "unit", "veg"}

def test_items_by_id_lookup():
    any_id = data.ITEMS[0]["id"]
    assert data.ITEMS_BY_ID[any_id]["name"] == data.ITEMS[0]["name"]

def test_container_specs():
    assert data.CONTAINER_SPECS["Small"] == {"capacity": 3, "fee": 5}
    assert data.CONTAINER_SPECS["Medium"] == {"capacity": 6, "fee": 8}
    assert data.CONTAINER_SPECS["Large"] == {"capacity": 12, "fee": 12}
```

- [ ] **Step 2: Run test, verify fail**

Run: `python -m pytest tests/test_data.py -v`
Expected: FAIL — `ModuleNotFoundError: No module named 'cateringv3.data'`

- [ ] **Step 3: Write `data.py`**

Write module so all tests pass. Use slug ids (`"paneer-paratha"`, etc.). Real breads verbatim from screenshot descriptions:
```python
"""Hardcoded menu data and container specifications. All items are vegetarian."""

CATEGORIES = ["Rotis & Breads", "Rice", "Curries", "Raw Salads", "Dals"]

def _item(id, category, name, desc, price, unit="per piece"):
    return {"id": id, "category": category, "name": name, "desc": desc,
            "price": price, "unit": unit, "veg": True}

ITEMS = [
    _item("paneer-paratha", "Rotis & Breads", "Paneer Paratha", "Stuffed cottage cheese", 80),
    _item("aloo-paratha", "Rotis & Breads", "Aloo Paratha", "Mashed potato & cumin", 50),
    _item("puri", "Rotis & Breads", "Puri", "Puffed deep-fried bread", 15),
    _item("oilless-phulka", "Rotis & Breads", "Oilless Phulka", "Light, dry-roasted on flame", 10),
    _item("ghee-phulka", "Rotis & Breads", "Ghee Phulka", "Flame-roasted, ghee brushed", 15),
    _item("ghee-chapathi", "Rotis & Breads", "Ghee Chapathi", "Soft layered, with ghee", 20),
    # Rice
    _item("jeera-rice", "Rice", "Jeera Rice", "Basmati tempered with cumin", 90, "per bowl"),
    _item("veg-pulao", "Rice", "Veg Pulao", "Mixed vegetables & whole spices", 120, "per bowl"),
    _item("curd-rice", "Rice", "Curd Rice", "Soft rice in seasoned yogurt", 70, "per bowl"),
    _item("lemon-rice", "Rice", "Lemon Rice", "Tangy peanuts & curry leaves", 80, "per bowl"),
    _item("plain-rice", "Rice", "Steamed Rice", "Plain basmati", 50, "per bowl"),
    # Curries
    _item("paneer-butter-masala", "Curries", "Paneer Butter Masala", "Cottage cheese in tomato gravy", 140, "per bowl"),
    _item("dal-tadka-curry", "Curries", "Mixed Veg Kurma", "Vegetables in coconut gravy", 110, "per bowl"),
    _item("chana-masala", "Curries", "Chana Masala", "Spiced chickpea curry", 100, "per bowl"),
    _item("aloo-gobi", "Curries", "Aloo Gobi", "Potato & cauliflower stir-fry", 90, "per bowl"),
    _item("bhindi-fry", "Curries", "Bhindi Fry", "Crisp okra with onions", 95, "per bowl"),
    # Raw Salads
    _item("kachumber", "Raw Salads", "Kachumber", "Cucumber, tomato & onion", 40, "per bowl"),
    _item("sprout-salad", "Raw Salads", "Sprout Salad", "Moong sprouts & lemon", 50, "per bowl"),
    _item("carrot-slaw", "Raw Salads", "Carrot Slaw", "Grated carrot & peanuts", 45, "per bowl"),
    _item("green-salad", "Raw Salads", "Garden Green Salad", "Lettuce, cucumber, capsicum", 55, "per bowl"),
    # Dals
    _item("dal-tadka", "Dals", "Dal Tadka", "Yellow lentils, ghee tempering", 80, "per bowl"),
    _item("dal-fry", "Dals", "Dal Fry", "Onion-tomato lentils", 85, "per bowl"),
    _item("dal-makhani", "Dals", "Dal Makhani", "Slow-cooked black lentils", 130, "per bowl"),
    _item("sambar", "Dals", "Sambar", "Lentils with vegetables & tamarind", 70, "per bowl"),
]

ITEMS_BY_ID = {i["id"]: i for i in ITEMS}

def items_for(category):
    return [i for i in ITEMS if i["category"] == category]

CONTAINER_SPECS = {
    "Small": {"capacity": 3, "fee": 5},
    "Medium": {"capacity": 6, "fee": 8},
    "Large": {"capacity": 12, "fee": 12},
}
```

- [ ] **Step 4: Run test, verify pass**

Run: `python -m pytest tests/test_data.py -v`
Expected: PASS (5 passed)

- [ ] **Step 5: Commit**

```bash
git add cateringv3/data.py tests/test_data.py
git commit -m "feat: add menu and container data with tests"
```

---

### Task 3: Pure totals, fee & capacity helpers

**Files:**
- Create: `cateringv3/state/__init__.py` (empty for now)
- Create: `cateringv3/state/packing.py`
- Test: `tests/test_packing_totals.py`

**Interfaces:**
- Consumes: `data.ITEMS_BY_ID`, `data.CONTAINER_SPECS`.
- Produces (all pure functions in `packing.py`):
  - `items_total(cart: dict[str,int]) -> int`
  - `total_portions(cart: dict[str,int]) -> int`
  - `container_fee(size: str) -> int`
  - `packing_fee(containers: list[dict]) -> int`
  - `container_used(container: dict) -> int` (sum of its packed qtys)
  - `portions_packed(containers: list[dict]) -> int`
  - `grand_total(cart, containers) -> int`
  - `money(n: int) -> str` → `"₹85"`
  - `make_order_number() -> str` → `"SAR-####"` (random 4 digits)

- [ ] **Step 1: Write failing test**

```python
# tests/test_packing_totals.py
import re
from cateringv3.state import packing

def test_items_total_sums_price_times_qty():
    assert packing.items_total({"paneer-paratha": 1, "puri": 2}) == 80 + 30

def test_total_portions_is_unit_count():
    assert packing.total_portions({"paneer-paratha": 1, "puri": 2}) == 3
    assert packing.total_portions({}) == 0

def test_container_fee_by_size():
    assert packing.container_fee("Small") == 5
    assert packing.container_fee("Medium") == 8
    assert packing.container_fee("Large") == 12

def test_packing_fee_sums_container_fees():
    containers = [
        {"id": 1, "size": "Small", "capacity": 3, "fee": 5, "items": {}},
        {"id": 2, "size": "Large", "capacity": 12, "fee": 12, "items": {}},
    ]
    assert packing.packing_fee(containers) == 17

def test_container_used_and_portions_packed():
    containers = [
        {"id": 1, "size": "Medium", "capacity": 6, "fee": 8, "items": {"puri": 2, "aloo-paratha": 1}},
        {"id": 2, "size": "Small", "capacity": 3, "fee": 5, "items": {"puri": 1}},
    ]
    assert packing.container_used(containers[0]) == 3
    assert packing.portions_packed(containers) == 4

def test_grand_total_is_items_plus_packing():
    cart = {"paneer-paratha": 1}
    containers = [{"id": 1, "size": "Small", "capacity": 3, "fee": 5, "items": {}}]
    assert packing.grand_total(cart, containers) == 85

def test_money_format():
    assert packing.money(85) == "₹85"
    assert packing.money(0) == "₹0"

def test_order_number_format():
    for _ in range(20):
        assert re.fullmatch(r"SAR-\d{4}", packing.make_order_number())
```

- [ ] **Step 2: Run test, verify fail**

Run: `python -m pytest tests/test_packing_totals.py -v`
Expected: FAIL — `ModuleNotFoundError: No module named 'cateringv3.state.packing'`

- [ ] **Step 3: Write helpers in `packing.py`**

```python
"""Pure logic for totals, fees, capacity and bin-packing. No Reflex imports."""
import random
from cateringv3 import data

def items_total(cart):
    return sum(data.ITEMS_BY_ID[i]["price"] * q for i, q in cart.items())

def total_portions(cart):
    return sum(cart.values())

def container_fee(size):
    return data.CONTAINER_SPECS[size]["fee"]

def packing_fee(containers):
    return sum(c["fee"] for c in containers)

def container_used(container):
    return sum(container["items"].values())

def portions_packed(containers):
    return sum(container_used(c) for c in containers)

def grand_total(cart, containers):
    return items_total(cart) + packing_fee(containers)

def money(n):
    return f"₹{n}"

def make_order_number():
    return f"SAR-{random.randint(0, 9999):04d}"
```

Also create empty `cateringv3/state/__init__.py`.

- [ ] **Step 4: Run test, verify pass**

Run: `python -m pytest tests/test_packing_totals.py -v`
Expected: PASS (8 passed)

- [ ] **Step 5: Commit**

```bash
git add cateringv3/state/__init__.py cateringv3/state/packing.py tests/test_packing_totals.py
git commit -m "feat: add pure totals/fee/capacity helpers with tests"
```

---

### Task 4: FFD auto-pack + unpacked-units helpers

**Files:**
- Modify: `cateringv3/state/packing.py`
- Test: `tests/test_ffd_pack.py`

**Interfaces:**
- Consumes: `data.CONTAINER_SPECS`, `packing.container_used`.
- Produces:
  - `unpacked_counts(cart: dict[str,int], containers: list[dict]) -> dict[str,int]` — per-item units in cart not yet packed (never negative).
  - `container_room(container: dict) -> int` — `capacity - used`.
  - `next_container_id(containers: list[dict]) -> int` — `max(id)+1` or `1`.
  - `ffd_pack(cart, containers) -> list[dict]` — returns NEW containers list: keeps existing containers + packs, places every currently-unpacked unit (First Fit Decreasing), opening new containers preferring LARGEST size to minimize container count. Pure; no mutation of input list/dicts.

- [ ] **Step 1: Write failing test**

```python
# tests/test_ffd_pack.py
from cateringv3.state import packing

def _small(id, items=None):
    return {"id": id, "size": "Small", "capacity": 3, "fee": 5, "items": dict(items or {})}

def test_unpacked_counts_subtracts_packed():
    cart = {"puri": 5, "aloo-paratha": 2}
    containers = [_small(1, {"puri": 2})]
    assert packing.unpacked_counts(cart, containers) == {"puri": 3, "aloo-paratha": 2}

def test_unpacked_counts_never_negative():
    assert packing.unpacked_counts({"puri": 1}, [_small(1, {"puri": 3})]) == {}

def test_container_room():
    assert packing.container_room(_small(1, {"puri": 1})) == 2

def test_next_container_id():
    assert packing.next_container_id([]) == 1
    assert packing.next_container_id([_small(1), _small(4)]) == 5

def test_ffd_fills_existing_before_opening_new():
    cart = {"puri": 4}
    containers = [_small(1, {"puri": 1})]  # room for 2 more
    out = packing.ffd_pack(cart, containers)
    assert packing.portions_packed(out) == 4
    # existing small filled to 3, remainder in a new container
    assert out[0]["items"]["puri"] == 3

def test_ffd_minimizes_containers_prefers_large():
    cart = {"puri": 12}
    out = packing.ffd_pack(cart, [])
    assert len(out) == 1 and out[0]["size"] == "Large"

def test_ffd_noop_when_nothing_unpacked():
    cart = {"puri": 3}
    containers = [_small(1, {"puri": 3})]
    out = packing.ffd_pack(cart, containers)
    assert packing.portions_packed(out) == 3 and len(out) == 1

def test_ffd_does_not_mutate_input():
    cart = {"puri": 2}
    containers = [_small(1)]
    packing.ffd_pack(cart, containers)
    assert containers[0]["items"] == {}
```

- [ ] **Step 2: Run test, verify fail**

Run: `python -m pytest tests/test_ffd_pack.py -v`
Expected: FAIL — `AttributeError: module ... has no attribute 'unpacked_counts'`

- [ ] **Step 3: Implement helpers**

Append to `packing.py`. Algorithm: build flat list of unpacked units, sort descending by ... units size-1 (1 portion each), ordering trivial for that part — "decreasing" applies to choosing largest NEW container. First fit into existing containers with room (current order), then open new containers largest-first to cover remainder count w/ fewest bins.

```python
import copy

def container_room(container):
    return container["capacity"] - container_used(container)

def unpacked_counts(cart, containers):
    packed = {}
    for c in containers:
        for i, q in c["items"].items():
            packed[i] = packed.get(i, 0) + q
    out = {}
    for i, q in cart.items():
        left = q - packed.get(i, 0)
        if left > 0:
            out[i] = left
    return out

def next_container_id(containers):
    return max((c["id"] for c in containers), default=0) + 1

def _new_container(cid, size):
    spec = data.CONTAINER_SPECS[size]
    return {"id": cid, "size": size, "capacity": spec["capacity"], "fee": spec["fee"], "items": {}}

def _place_one(container, item_id):
    container["items"][item_id] = container["items"].get(item_id, 0) + 1

def ffd_pack(cart, containers):
    result = copy.deepcopy(containers)
    # flatten unpacked units into a list of item ids
    units = []
    for item_id, n in unpacked_counts(cart, result).items():
        units.extend([item_id] * n)
    if not units:
        return result
    # first fit into existing containers with room
    for item_id in list(units):
        for c in result:
            if container_room(c) > 0:
                _place_one(c, item_id)
                units.remove(item_id)
                break
    # remainder -> new containers, largest capacity first to minimize count
    largest = max(data.CONTAINER_SPECS, key=lambda s: data.CONTAINER_SPECS[s]["capacity"])
    while units:
        c = _new_container(next_container_id(result), largest)
        result.append(c)
        while units and container_room(c) > 0:
            _place_one(c, units.pop())
    return result
```

- [ ] **Step 4: Run test, verify pass**

Run: `python -m pytest tests/test_ffd_pack.py -v`
Expected: PASS (8 passed)

- [ ] **Step 5: Run whole suite**

Run: `python -m pytest -v`
Expected: all pass (data + totals + ffd).

- [ ] **Step 6: Commit**

```bash
git add cateringv3/state/packing.py tests/test_ffd_pack.py
git commit -m "feat: add FFD auto-pack helpers with tests"
```

---

### Task 5: CustomerOrderSelectionState

**Files:**
- Create: `cateringv3/state/customerorderstate.py`

**Interfaces:**
- Consumes: `packing.items_total`, `packing.total_portions`, `packing.money`; `data`.
- Produces class `CustomerOrderSelectionState(rx.State)`:
  - Vars: `cart: dict[str,int] = {}`, `active_category: str = "Rotis & Breads"`, `selected_date: str = ""`.
  - Computed (sync): `cart_count -> int`, `items_total -> int`, `total_portions -> int`, `items_total_display -> str`, `active_items -> list[dict]`, `active_count_label -> str` (`"6 items"`), `is_cart_empty -> bool`.
  - Handlers: `init_date`, `add_item(item_id)`, `inc(item_id)`, `dec(item_id)`, `set_category(name)`, `select_date(date)`, `qty_of(item_id) -> int` (helper var-callable via computed dict `quantities`).
  - Emits `on_load` initializer `init_date` that sets `selected_date` to real today formatted `"Thu, 16 Jul"`.

> **Cross-state note:** `add_item`/`inc`/`dec` must reset packing. Since `CustomerPackingState` doesn't exist until Task 6, this task adds handlers WITHOUT reset call, leaves `# TODO(Task 7): reset packing` marker; Task 7 wires reset once both states exist. Keeps tasks independently compilable.

- [ ] **Step 1: Write the state**

```python
"""Cart, menu category, and delivery date selection."""
import datetime
import reflex as rx
from cateringv3 import data
from cateringv3.state import packing


class CustomerOrderSelectionState(rx.State):
    cart: dict[str, int] = {}
    active_category: str = "Rotis & Breads"
    selected_date: str = ""

    @rx.var
    def cart_count(self) -> int:
        return packing.total_portions(self.cart)

    @rx.var
    def items_total(self) -> int:
        return packing.items_total(self.cart)

    @rx.var
    def total_portions(self) -> int:
        return packing.total_portions(self.cart)

    @rx.var
    def items_total_display(self) -> str:
        return packing.money(self.items_total)

    @rx.var
    def is_cart_empty(self) -> bool:
        return len(self.cart) == 0

    @rx.var
    def active_items(self) -> list[dict]:
        return data.items_for(self.active_category)

    @rx.var
    def active_count_label(self) -> str:
        return f"{len(self.active_items)} items"

    @rx.var
    def quantities(self) -> dict[str, int]:
        return dict(self.cart)

    @rx.event
    def init_date(self):
        if not self.selected_date:
            today = datetime.date.today()
            self.selected_date = today.strftime("%a, %d %b").replace(" 0", " ")

    @rx.event
    def add_item(self, item_id: str):
        self.cart[item_id] = self.cart.get(item_id, 0) + 1
        # TODO(Task 7): reset packing

    @rx.event
    def inc(self, item_id: str):
        self.cart[item_id] = self.cart.get(item_id, 0) + 1
        # TODO(Task 7): reset packing

    @rx.event
    def dec(self, item_id: str):
        current = self.cart.get(item_id, 0)
        if current <= 1:
            self.cart.pop(item_id, None)
        else:
            self.cart[item_id] = current - 1
        # TODO(Task 7): reset packing

    @rx.event
    def set_category(self, name: str):
        self.active_category = name
        return rx.scroll_to("menu-list-top")

    @rx.event
    def select_date(self, date: str):
        self.selected_date = date
```

- [ ] **Step 2: Verify import + date format**

Run:
```bash
python -c "import cateringv3.state.customerorderstate as m; print('ok', m.CustomerOrderSelectionState.__name__)"
```
Expected: `ok CustomerOrderSelectionState`

Verify `rx.scroll_to` exists (reflex-docs / source) before relying on it; if API differs, drop return, rely on default scroll — leave `# TODO`, note in task report.

- [ ] **Step 3: Commit**

```bash
git add cateringv3/state/customerorderstate.py
git commit -m "feat: add CustomerOrderSelectionState (cart, category, date)"
```

---

### Task 6: CustomerPackingState + cross-state async computed vars

**Files:**
- Create: `cateringv3/state/customerpackingstate.py`

**Interfaces:**
- Consumes: `packing.*`, `data.CONTAINER_SPECS`, `CustomerOrderSelectionState.cart` / `.items_total` / `.total_portions`.
- Produces class `CustomerPackingState(rx.State)`:
  - Vars: `containers: list[dict] = []`, `selected_item_to_pack: str = ""` (empty string = none).
  - Sync computed: `packing_fee -> int`, `packing_fee_display -> str`, `portions_packed -> int`, `container_count -> int`, `has_containers -> bool`.
  - Async computed (cross-state, explicit `deps`): `grand_total -> int`, `grand_total_display -> str`, `portions_left -> int`, `is_fully_packed -> bool`, `pay_button_label -> str` (`"Pay ₹85 securely"`), `portions_left_label -> str` (`"2 portions left to pack"` / `"All packed!"`).
  - Handlers: `add_container(size)`, `delete_container(container_id)` (refund = just drop it; fee recomputes), `select_item_to_pack(item_id)`, `pack_into(container_id)` (one unit, auto-advance selection), `remove_from_container(container_id, item_id)`, `auto_pack` (async), `reset_packing`, `_advance_selection` (private, async).

- [ ] **Step 1: Write the state**

```python
"""Container packing: manual packs, auto-pack, and cross-state totals."""
import reflex as rx
from cateringv3 import data
from cateringv3.state import packing
from cateringv3.state.customerorderstate import CustomerOrderSelectionState


class CustomerPackingState(rx.State):
    containers: list[dict] = []
    selected_item_to_pack: str = ""

    # ---- sync computed (own state) ----
    @rx.var
    def packing_fee(self) -> int:
        return packing.packing_fee(self.containers)

    @rx.var
    def packing_fee_display(self) -> str:
        return packing.money(self.packing_fee)

    @rx.var
    def portions_packed(self) -> int:
        return packing.portions_packed(self.containers)

    @rx.var
    def container_count(self) -> int:
        return len(self.containers)

    @rx.var
    def has_containers(self) -> bool:
        return len(self.containers) > 0

    # ---- async computed (cross-state) ----
    @rx.var(deps=[CustomerOrderSelectionState.cart, containers])
    async def grand_total(self) -> int:
        order = await self.get_state(CustomerOrderSelectionState)
        return packing.grand_total(order.cart, self.containers)

    @rx.var(deps=[CustomerOrderSelectionState.cart, containers])
    async def grand_total_display(self) -> str:
        return packing.money(await self.grand_total)

    @rx.var(deps=[CustomerOrderSelectionState.cart, containers])
    async def portions_left(self) -> int:
        order = await self.get_state(CustomerOrderSelectionState)
        return packing.total_portions(order.cart) - self.portions_packed

    @rx.var(deps=[CustomerOrderSelectionState.cart, containers])
    async def is_fully_packed(self) -> bool:
        order = await self.get_state(CustomerOrderSelectionState)
        total = packing.total_portions(order.cart)
        return total > 0 and (total - self.portions_packed) == 0

    @rx.var(deps=[CustomerOrderSelectionState.cart, containers])
    async def pay_button_label(self) -> str:
        return f"Pay {await self.grand_total_display} securely"

    @rx.var(deps=[CustomerOrderSelectionState.cart, containers])
    async def portions_left_label(self) -> str:
        left = await self.portions_left
        return "All packed!" if left <= 0 else f"{left} portions left to pack"

    # ---- handlers ----
    @rx.event
    def add_container(self, size: str):
        spec = data.CONTAINER_SPECS[size]
        cid = packing.next_container_id(self.containers)
        self.containers.append({"id": cid, "size": size,
                                "capacity": spec["capacity"], "fee": spec["fee"], "items": {}})

    @rx.event
    def delete_container(self, container_id: int):
        self.containers = [c for c in self.containers if c["id"] != container_id]

    @rx.event
    def select_item_to_pack(self, item_id: str):
        self.selected_item_to_pack = item_id

    @rx.event
    async def pack_into(self, container_id: int):
        if not self.selected_item_to_pack:
            return
        item_id = self.selected_item_to_pack
        for c in self.containers:
            if c["id"] == container_id and packing.container_room(c) > 0:
                order = await self.get_state(CustomerOrderSelectionState)
                if packing.unpacked_counts(order.cart, self.containers).get(item_id, 0) > 0:
                    c["items"][item_id] = c["items"].get(item_id, 0) + 1
                break
        await self._advance_selection()

    @rx.event
    def remove_from_container(self, container_id: int, item_id: str):
        for c in self.containers:
            if c["id"] == container_id and item_id in c["items"]:
                c["items"][item_id] -= 1
                if c["items"][item_id] <= 0:
                    del c["items"][item_id]
                break

    @rx.event
    async def auto_pack(self):
        order = await self.get_state(CustomerOrderSelectionState)
        self.containers = packing.ffd_pack(order.cart, self.containers)

    @rx.event
    def reset_packing(self):
        self.containers = []
        self.selected_item_to_pack = ""

    async def _advance_selection(self):
        order = await self.get_state(CustomerOrderSelectionState)
        left = packing.unpacked_counts(order.cart, self.containers)
        if self.selected_item_to_pack in left:
            return
        self.selected_item_to_pack = next(iter(left), "")
```

- [ ] **Step 2: Verify import**

Run:
```bash
python -c "import cateringv3.state.customerpackingstate as m; print('ok', m.CustomerPackingState.__name__)"
```
Expected: `ok CustomerPackingState`

If `@rx.var(deps=[...])` mixing another state's var + local var name raises at import, consult reflex-docs for exact `deps` reference form (local var may need `CustomerPackingState.containers` — but class not bound yet inside own body). Known-safe fallback: reference only cross-state var in `deps` (`deps=[CustomerOrderSelectionState.cart]`), let local-var changes trigger recompute via normal tracking; adjust, note in task report.

- [ ] **Step 3: Commit**

```bash
git add cateringv3/state/customerpackingstate.py
git commit -m "feat: add CustomerPackingState with cross-state async totals"
```

---

### Task 7: StageOverlaysState + wire packing reset

**Files:**
- Create: `cateringv3/state/stageoverlaystate.py`
- Modify: `cateringv3/state/customerorderstate.py` (replace 3 `# TODO(Task 7)` markers)
- Modify: `cateringv3/state/__init__.py` (export all three states)

**Interfaces:**
- Consumes: `CustomerOrderSelectionState`, `CustomerPackingState`, `packing.make_order_number`, `packing.grand_total`.
- Produces class `StageOverlaysState(rx.State)`:
  - Vars: `stage="menu"`, `show_cart=False`, `show_date_picker=False`, `show_profile=False`, `user_name="Priya S."`, `orders_placed=12`, `balance_status="All paid up"`, `order_number=""`, `paid_total=0`, `receipt_container_count=0`.
  - Computed: `paid_total_display -> str`, `avatar_initial -> str`, `orders_placed_label -> str`.
  - Handlers: `open_cart/close_cart`, `open_date_picker/close_date_picker`, `open_profile/close_profile`, `go_to_containers`, `back_to_menu` (async, resets all three states), `pay` (async).
- `state/__init__.py` exports `CustomerOrderSelectionState`, `CustomerPackingState`, `StageOverlaysState`.

- [ ] **Step 1: Wire packing reset into order state**

In `customerorderstate.py`, add async reset helper, call from three handlers. Replace each `# TODO(Task 7): reset packing`, make handlers async:

```python
# add import at top:
from cateringv3.state.customerpackingstate import CustomerPackingState

    async def _reset_packing(self):
        pk = await self.get_state(CustomerPackingState)
        pk.reset_packing()

    @rx.event
    async def add_item(self, item_id: str):
        self.cart[item_id] = self.cart.get(item_id, 0) + 1
        await self._reset_packing()

    @rx.event
    async def inc(self, item_id: str):
        self.cart[item_id] = self.cart.get(item_id, 0) + 1
        await self._reset_packing()

    @rx.event
    async def dec(self, item_id: str):
        current = self.cart.get(item_id, 0)
        if current <= 1:
            self.cart.pop(item_id, None)
        else:
            self.cart[item_id] = current - 1
        await self._reset_packing()
```
> Note: import creates cycle (`customerpackingstate` imports `customerorderstate`). Import `CustomerPackingState` **inside** `_reset_packing` (local import) to avoid circular import at module load:
```python
    async def _reset_packing(self):
        from cateringv3.state.customerpackingstate import CustomerPackingState
        pk = await self.get_state(CustomerPackingState)
        pk.reset_packing()
```
Remove top-level `CustomerPackingState` import; keep only local one.

- [ ] **Step 2: Write `stageoverlaystate.py`**

```python
"""Navigation stage, overlay flags, mock user, and payment result."""
import reflex as rx
from cateringv3.state import packing
from cateringv3.state.customerorderstate import CustomerOrderSelectionState
from cateringv3.state.customerpackingstate import CustomerPackingState


class StageOverlaysState(rx.State):
    stage: str = "menu"
    show_cart: bool = False
    show_date_picker: bool = False
    show_profile: bool = False
    user_name: str = "Priya S."
    orders_placed: int = 12
    balance_status: str = "All paid up"
    order_number: str = ""
    paid_total: int = 0
    receipt_container_count: int = 0

    @rx.var
    def paid_total_display(self) -> str:
        return packing.money(self.paid_total)

    @rx.var
    def avatar_initial(self) -> str:
        return self.user_name[:1]

    @rx.var
    def orders_placed_label(self) -> str:
        return f"{self.orders_placed} orders placed"

    @rx.event
    def open_cart(self):
        self.show_cart = True

    @rx.event
    def close_cart(self):
        self.show_cart = False

    @rx.event
    def open_date_picker(self):
        self.show_date_picker = True

    @rx.event
    def close_date_picker(self):
        self.show_date_picker = False

    @rx.event
    def open_profile(self):
        self.show_profile = True

    @rx.event
    def close_profile(self):
        self.show_profile = False

    @rx.event
    def go_to_containers(self):
        self.show_cart = False
        self.stage = "containers"

    @rx.event
    async def pay(self):
        order = await self.get_state(CustomerOrderSelectionState)
        pk = await self.get_state(CustomerPackingState)
        self.paid_total = packing.grand_total(order.cart, pk.containers)
        self.receipt_container_count = len(pk.containers)
        self.order_number = packing.make_order_number()
        self.stage = "success"

    @rx.event
    async def back_to_menu(self):
        order = await self.get_state(CustomerOrderSelectionState)
        pk = await self.get_state(CustomerPackingState)
        order.cart = {}
        order.active_category = "Rotis & Breads"
        order.init_date()  # reset selected_date to today
        order.selected_date = ""  # force re-init
        order.init_date()
        pk.reset_packing()
        self.stage = "menu"
        self.show_cart = self.show_date_picker = self.show_profile = False
        self.order_number = ""
        self.paid_total = 0
        self.receipt_container_count = 0
```
> `back_to_menu` resets `selected_date` to today: set to `""` then call `init_date()` once (remove duplicate line above — keep single `order.selected_date = ""` followed by `order.init_date()`).

- [ ] **Step 3: Write `state/__init__.py`**

```python
from cateringv3.state.customerorderstate import CustomerOrderSelectionState
from cateringv3.state.customerpackingstate import CustomerPackingState
from cateringv3.state.stageoverlaystate import StageOverlaysState

__all__ = ["CustomerOrderSelectionState", "CustomerPackingState", "StageOverlaysState"]
```

- [ ] **Step 4: Verify all three states import together**

Run:
```bash
python -c "from cateringv3 import state; print(state.CustomerOrderSelectionState, state.CustomerPackingState, state.StageOverlaysState)"
```
Expected: three class reprs, no circular-import error.

- [ ] **Step 5: Run full logic suite (regression)**

Run: `python -m pytest -v`
Expected: all still pass.

- [ ] **Step 6: Commit**

```bash
git add cateringv3/state/
git commit -m "feat: add StageOverlaysState, wire packing reset, export states"
```

---

### Task 8: Reusable atom components (buttons, chips, stepper, food card)

**Files:**
- Create: `cateringv3/components/__init__.py` (empty)
- Create: `cateringv3/components/buttons.py`
- Create: `cateringv3/components/category_chips.py`
- Create: `cateringv3/components/quantity_stepper.py`
- Create: `cateringv3/components/food_card.py`

**Interfaces:**
- Consumes: `theme.COLORS`, states from `cateringv3.state`, `data`.
- Produces:
  - `buttons.primary_button(label, on_click, disabled=False, **kw) -> rx.Component` (terracotta, full-width, rounded).
  - `buttons.pill_button(label, on_click, **kw) -> rx.Component` (outline pill).
  - `category_chips.category_chips() -> rx.Component` — `rx.foreach(data.CATEGORIES, chip)`; active chip filled ink/terracotta.
  - `quantity_stepper.quantity_stepper(item_id) -> rx.Component` — `−  qty  +` bound to order state.
  - `food_card.food_card(item: dict) -> rx.Component` — veg dot, name, desc, price; shows "Add" when qty 0 else stepper.

- [ ] **Step 1: Write `buttons.py`**

```python
import reflex as rx
from cateringv3.theme import COLORS

def primary_button(label, on_click=None, disabled=False, **kw):
    return rx.button(
        label, on_click=on_click, disabled=disabled,
        width="100%", height="52px", border_radius="14px",
        background=COLORS["terracotta"], color="white",
        font_weight="600", font_size="16px",
        opacity=rx.cond(disabled, 0.5, 1), **kw,
    )

def pill_button(label, on_click=None, **kw):
    return rx.button(
        label, on_click=on_click,
        background="transparent", color=COLORS["ink"],
        border=f"1px solid {COLORS['muted']}", border_radius="9999px",
        padding="8px 16px", font_size="14px", **kw,
    )
```

- [ ] **Step 2: Write `quantity_stepper.py`**

```python
import reflex as rx
from cateringv3.theme import COLORS
from cateringv3.state import CustomerOrderSelectionState as OS

def _btn(symbol, on_click):
    return rx.button(symbol, on_click=on_click, width="32px", height="32px",
                     border_radius="8px", background=COLORS["terracotta"],
                     color="white", font_size="18px", padding="0")

def quantity_stepper(item_id):
    return rx.hstack(
        _btn("−", OS.dec(item_id)),
        rx.text(OS.quantities[item_id].to(str), width="24px", text_align="center",
                font_weight="600", color=COLORS["ink"]),
        _btn("+", OS.inc(item_id)),
        align="center", spacing="2",
    )
```
> Verify `OS.quantities[item_id]` var-indexing renders; if missing key errors in frontend, guard in component with `rx.cond(OS.cart.contains(item_id), ...)` or expose `qty_display` computed. Prefer state-side fix (backend-only rule).

- [ ] **Step 3: Write `category_chips.py`**

```python
import reflex as rx
from cateringv3.theme import COLORS
from cateringv3.state import CustomerOrderSelectionState as OS

def _chip(name):
    active = OS.active_category == name
    return rx.button(
        name, on_click=OS.set_category(name),
        background=rx.cond(active, COLORS["ink"], "transparent"),
        color=rx.cond(active, "white", COLORS["muted"]),
        border=rx.cond(active, "none", f"1px solid {COLORS['muted']}40"),
        border_radius="9999px", padding="8px 16px", font_size="14px",
        white_space="nowrap", flex_shrink="0",
    )

def category_chips():
    return rx.hstack(
        rx.foreach(OS.CATEGORIES_LIST, _chip),
        overflow_x="auto", spacing="2", width="100%", padding_y="4px",
    )
```
> `OS` has no `CATEGORIES_LIST`. Use module data instead: `rx.foreach(data.CATEGORIES, _chip)` — import `from cateringv3 import data`. Fix in actual code.

- [ ] **Step 4: Write `food_card.py`**

```python
import reflex as rx
from cateringv3.theme import COLORS, CARD_STYLE
from cateringv3.state import CustomerOrderSelectionState as OS
from cateringv3.components.quantity_stepper import quantity_stepper
from cateringv3.components.buttons import pill_button

def _veg_dot():
    return rx.box(rx.box(width="8px", height="8px", border_radius="9999px",
                         background=COLORS["green"]),
                  width="16px", height="16px", border=f"1.5px solid {COLORS['green']}",
                  border_radius="3px", display="flex", align_items="center",
                  justify_content="center")

def food_card(item):
    item_id = item["id"]
    in_cart = OS.cart.contains(item_id)
    return rx.hstack(
        rx.vstack(
            rx.hstack(_veg_dot(), rx.text(item["name"], font_weight="600",
                      color=COLORS["ink"]), align="center", spacing="2"),
            rx.text(item["desc"], color=COLORS["muted"], font_size="13px"),
            rx.text("₹", item["price"].to(str), font_weight="600",
                    color=COLORS["ink"]),
            align="start", spacing="1",
        ),
        rx.spacer(),
        rx.cond(in_cart,
                quantity_stepper(item_id),
                rx.button("Add", on_click=OS.add_item(item_id),
                          background=COLORS["terracotta_soft"], color=COLORS["terracotta"],
                          border_radius="10px", font_weight="600", padding="8px 20px")),
        width="100%", align="center", **CARD_STYLE,
    )
```
> `item` here is Var (from `rx.foreach`), so `item["id"]`, `item["name"]`, `item["price"]` are Var accesses — correct. `rx.text("₹", item["price"].to(str))` concatenates; verify rendering.

- [ ] **Step 5: Compile-check components import**

Run:
```bash
python -c "from cateringv3.components import buttons, category_chips, quantity_stepper, food_card; print('components ok')"
```
Expected: `components ok` (fix `CATEGORIES_LIST` → `data.CATEGORIES` issue first).

- [ ] **Step 6: Commit**

```bash
git add cateringv3/components/
git commit -m "feat: add atom components (buttons, chips, stepper, food card)"
```

---

### Task 9: Shell, header, bottom sheet

**Files:**
- Create: `cateringv3/components/background.py`
- Create: `cateringv3/components/header.py`
- Create: `cateringv3/components/bottom_sheet.py`

**Interfaces:**
- Consumes: `theme`, states.
- Produces:
  - `background.page_shell(phone_body, left_pane, right_pane) -> rx.Component` — cream full-bleed; `rx.mobile_only(phone column, max_width 430px)` + `rx.tablet_and_desktop(two-pane: left flex + right ~420px)`.
  - `header.header() -> rx.Component` — "Sarthi" serif logo, "Delivering <date> ▾" (opens date picker), profile icon (opens profile), Cart pill w/ count badge (phone only — `rx.mobile_only`).
  - `bottom_sheet.bottom_sheet(open_var, body, on_close=None) -> rx.Component` — fixed overlay + dimmed backdrop (backdrop does NOT close, #14) + rounded sheet; visible when `open_var` true.

- [ ] **Step 1: Write `bottom_sheet.py`**

```python
import reflex as rx
from cateringv3.theme import COLORS, SHEET_STYLE

def bottom_sheet(open_var, *body):
    return rx.cond(
        open_var,
        rx.box(
            rx.box(position="fixed", inset="0", background="rgba(0,0,0,0.4)"),
            rx.box(*body, position="fixed", bottom="0", left="0", right="0",
                   max_height="85vh", overflow_y="auto", z_index="50",
                   margin="0 auto", max_width="430px", **SHEET_STYLE),
            position="fixed", inset="0", z_index="40",
        ),
    )
```
> Backdrop box has no `on_click` — taps do nothing (#14). On tablet, date picker is a modal, not this sheet (handled in Task 10).

- [ ] **Step 2: Write `header.py`**

```python
import reflex as rx
from cateringv3.theme import COLORS, FONT_SERIF
from cateringv3.state import CustomerOrderSelectionState as OS, StageOverlaysState as SO

def header():
    return rx.hstack(
        rx.text("Sarthi", font_family=FONT_SERIF, font_size="24px",
                font_weight="700", color=COLORS["terracotta"]),
        rx.button(
            rx.hstack(rx.text("Delivering "), rx.text(OS.selected_date), rx.text("▾"),
                      spacing="1", align="center"),
            on_click=SO.open_date_picker, variant="ghost",
            color=COLORS["muted"], font_size="13px",
        ),
        rx.spacer(),
        rx.button("P", on_click=SO.open_profile, border_radius="9999px",
                  width="36px", height="36px", background=COLORS["terracotta_soft"],
                  color=COLORS["terracotta"], font_weight="700"),
        rx.mobile_only(
            rx.button(
                rx.hstack(rx.text("Cart"), rx.badge(OS.cart_count), spacing="1"),
                on_click=SO.open_cart, background=COLORS["terracotta"], color="white",
                border_radius="9999px",
            ),
        ),
        width="100%", align="center", padding="12px 0", spacing="3",
    )
```

- [ ] **Step 3: Write `background.py`**

```python
import reflex as rx
from cateringv3.theme import COLORS, FONT_FACE_CSS

def page_shell(phone_body, left_pane, right_pane):
    return rx.box(
        rx.el.style(FONT_FACE_CSS),
        rx.mobile_only(
            rx.box(phone_body, width="100%", max_width="430px", margin="0 auto",
                   padding="0 16px"),
        ),
        rx.tablet_and_desktop(
            rx.hstack(
                rx.box(left_pane, flex="1", height="100vh", overflow_y="auto",
                       padding="0 24px"),
                rx.box(right_pane, width="420px", height="100vh", overflow_y="auto",
                       background=COLORS["card"], padding="24px"),
                spacing="0", width="100%", align="start",
            ),
        ),
        background=COLORS["cream"], min_height="100vh", width="100%",
        font_family="Inter, sans-serif",
    )
```
> Verify `rx.el.style` exists for injecting `@font-face` CSS (reflex-docs). If not, use `rx.html`-free alternative: pass font CSS via `app.add_page(..., style=...)` or `rx.App(stylesheets=[...])`. Since `rx.html()` banned, prefer `rx.el.style(FONT_FACE_CSS)`; confirm in source. Note resolution in task report.

- [ ] **Step 4: Compile-check**

Run:
```bash
python -c "from cateringv3.components import background, header, bottom_sheet; print('shell ok')"
```
Expected: `shell ok`

- [ ] **Step 5: Commit**

```bash
git add cateringv3/components/background.py cateringv3/components/header.py cateringv3/components/bottom_sheet.py
git commit -m "feat: add responsive shell, header, bottom sheet"
```

---

### Task 10: Menu, cart, and delivery-date pages

**Files:**
- Create: `cateringv3/pages/__init__.py` (empty)
- Create: `cateringv3/pages/menu.py`
- Create: `cateringv3/pages/cart.py`
- Create: `cateringv3/pages/delivery_date.py`

**Interfaces:**
- Consumes: components, states, `data`.
- Produces:
  - `menu.menu_list() -> rx.Component` — anchor `id="menu-list-top"`, section title + `active_count_label`, `rx.foreach(OS.active_items, food_card)`.
  - `cart.cart_body() -> rx.Component` — delivery reminder w/ "Change" (reopens date picker), line items w/ steppers, summary (items total, container hint), `primary_button("Choose containers →", SO.go_to_containers)`, empty-state text.
  - `delivery_date.date_picker_sheet() -> rx.Component` — phone bottom sheet; `delivery_date.date_picker_modal() -> rx.Component` — tablet `rx.dialog`. Both use `delivery_date.calendar()`.
  - `delivery_date.calendar() -> rx.Component` — real month grid (see below).

- [ ] **Step 1: Add calendar computed var to order state**

Real functional calendar logic = math → backend. Add to `CustomerOrderSelectionState`:
```python
    cal_year: int = 0
    cal_month: int = 0  # 1-12

    @rx.event
    def init_date(self):
        today = datetime.date.today()
        if not self.selected_date:
            self.selected_date = today.strftime("%a, %d %b").replace(" 0", " ")
        if self.cal_month == 0:
            self.cal_year, self.cal_month = today.year, today.month

    @rx.var
    def calendar_weeks(self) -> list[list[dict]]:
        import calendar as _cal
        today = datetime.date.today()
        weeks = []
        for week in _cal.Calendar(firstweekday=6).monthdatescalendar(self.cal_year, self.cal_month):
            row = []
            for d in week:
                in_month = d.month == self.cal_month
                row.append({
                    "day": d.day if in_month else 0,
                    "label": d.strftime("%a, %d %b").replace(" 0", " ") if in_month else "",
                    "is_today": d == today,
                    "disabled": (not in_month) or d < today,
                })
            weeks.append(row)
        return weeks

    @rx.var
    def cal_month_label(self) -> str:
        return datetime.date(self.cal_year, self.cal_month, 1).strftime("%B %Y")

    @rx.event
    def prev_month(self):
        self.cal_month -= 1
        if self.cal_month < 1:
            self.cal_month, self.cal_year = 12, self.cal_year - 1

    @rx.event
    def next_month(self):
        self.cal_month += 1
        if self.cal_month > 12:
            self.cal_month, self.cal_year = 1, self.cal_year + 1
```
Verify import: `python -c "import cateringv3.state.customerorderstate"`.

- [ ] **Step 2: Write `menu.py`**

```python
import reflex as rx
from cateringv3.theme import COLORS, FONT_SERIF
from cateringv3.state import CustomerOrderSelectionState as OS
from cateringv3.components.category_chips import category_chips
from cateringv3.components.food_card import food_card

def menu_list():
    return rx.vstack(
        rx.box(id="menu-list-top"),
        category_chips(),
        rx.hstack(
            rx.text(OS.active_category, font_family=FONT_SERIF, font_size="20px",
                    font_weight="700", color=COLORS["ink"]),
            rx.spacer(),
            rx.text(OS.active_count_label, color=COLORS["muted"], font_size="13px"),
            width="100%", align="center",
        ),
        rx.foreach(OS.active_items, food_card),
        spacing="3", width="100%", padding_bottom="24px",
    )
```

- [ ] **Step 3: Write `cart.py`**

```python
import reflex as rx
from cateringv3.theme import COLORS, FONT_SERIF, CARD_STYLE
from cateringv3.state import CustomerOrderSelectionState as OS, StageOverlaysState as SO
from cateringv3 import data
from cateringv3.components.quantity_stepper import quantity_stepper
from cateringv3.components.buttons import primary_button

def _line(entry):
    item_id, qty = entry[0], entry[1]
    item = data.ITEMS_BY_ID  # note: dict lookup by Var below
    return rx.hstack(
        rx.text(item_id), rx.spacer(), quantity_stepper(item_id),
        width="100%", align="center",
    )

def cart_body():
    return rx.vstack(
        rx.text("Your order", font_family=FONT_SERIF, font_size="22px",
                font_weight="700", color=COLORS["ink"]),
        rx.box(
            rx.hstack(rx.text("Delivering ", OS.selected_date, color=COLORS["ink"]),
                      rx.spacer(),
                      rx.button("Change", on_click=SO.open_date_picker, variant="ghost",
                                color=COLORS["terracotta"]),
                      width="100%"),
            background=COLORS["green_soft"], border_radius="12px", padding="12px",
            width="100%",
        ),
        rx.cond(
            OS.is_cart_empty,
            rx.text("Add dishes to start your order.", color=COLORS["muted"]),
            rx.vstack(
                rx.foreach(OS.cart, _line),
                rx.divider(),
                rx.hstack(rx.text("Items total"), rx.spacer(),
                          rx.text(OS.items_total_display, font_weight="700"), width="100%"),
                rx.text("Containers chosen next", color=COLORS["muted"], font_size="13px"),
                primary_button("Choose containers →", SO.go_to_containers),
                spacing="3", width="100%",
            ),
        ),
        spacing="4", width="100%",
    )
```
> `_line` needs real item name/price. `entry` from `rx.foreach(dict)` yields `(key, value)` Var tuples. Look up name via state computed instead of `data.ITEMS_BY_ID` in component (backend-only). Add `OS.cart_lines -> list[dict]` computed var returning `[{"id","name","price","qty","line_total_display"}]`, foreach over that. Implement `cart_lines` in order state; rewrite `_line` to read `line["name"]`, `line["qty"]`, `quantity_stepper(line["id"])`. Do this rather than computing in component.

- [ ] **Step 3b: Add `cart_lines` computed var to order state**

```python
    @rx.var
    def cart_lines(self) -> list[dict]:
        out = []
        for item_id, qty in self.cart.items():
            it = data.ITEMS_BY_ID[item_id]
            out.append({"id": item_id, "name": it["name"], "qty": qty,
                        "price": it["price"],
                        "line_total_display": packing.money(it["price"] * qty)})
        return out
```
Then `rx.foreach(OS.cart_lines, _line)` with `_line(line)` reading `line["name"]`, `quantity_stepper(line["id"])`, `line["line_total_display"]`.

- [ ] **Step 4: Write `delivery_date.py`**

```python
import reflex as rx
from cateringv3.theme import COLORS, FONT_SERIF
from cateringv3.state import CustomerOrderSelectionState as OS, StageOverlaysState as SO
from cateringv3.components.buttons import primary_button

def _day_cell(cell):
    return rx.cond(
        cell["day"] == 0,
        rx.box(width="40px", height="40px"),
        rx.button(
            cell["day"].to(str),
            on_click=OS.select_date(cell["label"]),
            disabled=cell["disabled"],
            width="40px", height="40px", border_radius="9999px", padding="0",
            background=rx.cond(OS.selected_date == cell["label"], COLORS["terracotta"], "transparent"),
            color=rx.cond(OS.selected_date == cell["label"], "white", COLORS["ink"]),
            border=rx.cond(cell["is_today"], f"2px solid {COLORS['today_blue']}", "none"),
            opacity=rx.cond(cell["disabled"], 0.3, 1),
        ),
    )

def calendar():
    return rx.vstack(
        rx.hstack(
            rx.button("‹", on_click=OS.prev_month, variant="ghost"),
            rx.text(OS.cal_month_label, font_weight="600", color=COLORS["ink"]),
            rx.button("›", on_click=OS.next_month, variant="ghost"),
            justify="between", width="100%", align="center",
        ),
        rx.foreach(OS.calendar_weeks,
                   lambda week: rx.hstack(rx.foreach(week, _day_cell),
                                          justify="between", width="100%")),
        rx.box(rx.text("Tip: order a day ahead for large trays.", color=COLORS["green"],
                       font_size="13px"),
               background=COLORS["green_soft"], border_radius="10px", padding="10px", width="100%"),
        primary_button("Done", SO.close_date_picker),
        spacing="3", width="100%",
    )

def date_picker_modal():
    return rx.dialog.root(
        rx.dialog.content(
            rx.dialog.title("Pick delivery date", font_family=FONT_SERIF),
            calendar(),
        ),
        open=SO.show_date_picker,
    )
```
> Phone uses `bottom_sheet(SO.show_date_picker, calendar())` (wired in Task 12). Tablet uses `date_picker_modal()`. Verify `rx.dialog` API in reflex-docs. Weekday header row (Sun…Sat) can be added as static `rx.hstack` of labels above weeks.

- [ ] **Step 5: Compile-check pages import**

Run:
```bash
python -c "from cateringv3.pages import menu, cart, delivery_date; print('pages A ok')"
```
Expected: `pages A ok`

- [ ] **Step 6: Commit**

```bash
git add cateringv3/pages/__init__.py cateringv3/pages/menu.py cateringv3/pages/cart.py cateringv3/pages/delivery_date.py cateringv3/state/customerorderstate.py
git commit -m "feat: add menu, cart, and functional calendar pages"
```

---

### Task 11: Profile drawer, containers, success pages

**Files:**
- Create: `cateringv3/pages/profile_drawer.py`
- Create: `cateringv3/pages/containers.py`
- Create: `cateringv3/pages/success.py`

**Interfaces:**
- Consumes: components, states.
- Produces:
  - `profile_drawer.profile_drawer() -> rx.Component` — `rx.drawer`, right side on phone / left on tablet (#12), avatar, name, stat cards, stub links.
  - `containers.containers_screen() -> rx.Component` — full-screen stage: item chips to pack, add S/M/L, Auto-pack, per-container cards w/ progress, status footer, Pay button (`disabled=~is_fully_packed`).
  - `success.success_screen() -> rx.Component` — full-screen receipt.

- [ ] **Step 1: Add packing display computed vars (backend-only) to `CustomerPackingState`**

Containers screen needs display-ready per-container and per-item data. Add:
```python
    @rx.var
    def container_cards(self) -> list[dict]:
        cards = []
        for c in self.containers:
            used = packing.container_used(c)
            lines = [{"item_id": i, "name": data.ITEMS_BY_ID[i]["name"], "qty": q}
                     for i, q in c["items"].items()]
            cards.append({
                "id": c["id"], "size": c["size"], "capacity": c["capacity"],
                "used": used, "room": c["capacity"] - used,
                "space_label": f"{used} of {c['capacity']} space used",
                "progress": int(used / c["capacity"] * 100) if c["capacity"] else 0,
                "lines": lines,
            })
        return cards

    @rx.var
    async def pack_chips(self) -> list[dict]:
        order = await self.get_state(CustomerOrderSelectionState)
        left = packing.unpacked_counts(order.cart, self.containers)
        chips = []
        for item_id, qty in order.cart.items():
            chips.append({
                "id": item_id, "name": data.ITEMS_BY_ID[item_id]["name"],
                "left": left.get(item_id, 0),
                "selected": self.selected_item_to_pack == item_id,
                "done": left.get(item_id, 0) == 0,
            })
        return chips
```
Add `deps=[CustomerOrderSelectionState.cart, containers, selected_item_to_pack]` on async `pack_chips` if needed; verify import.

- [ ] **Step 2: Write `containers.py`**

```python
import reflex as rx
from cateringv3.theme import COLORS, FONT_SERIF, CARD_STYLE
from cateringv3.state import CustomerPackingState as PK, StageOverlaysState as SO
from cateringv3.components.buttons import primary_button, pill_button

def _chip(chip):
    return rx.button(
        rx.hstack(rx.text(chip["name"]), rx.text("×", chip["left"].to(str))),
        on_click=PK.select_item_to_pack(chip["id"]),
        disabled=chip["done"],
        background=rx.cond(chip["selected"], COLORS["terracotta"], COLORS["terracotta_soft"]),
        color=rx.cond(chip["selected"], "white", COLORS["terracotta"]),
        border_radius="9999px", opacity=rx.cond(chip["done"], 0.4, 1),
    )

def _container_card(card):
    return rx.vstack(
        rx.hstack(rx.text(card["size"], font_weight="600"), rx.spacer(),
                  rx.text(card["space_label"], color=COLORS["muted"], font_size="12px"),
                  rx.button("×", on_click=PK.delete_container(card["id"]), variant="ghost"),
                  width="100%", align="center"),
        rx.box(rx.box(width=card["progress"].to(str) + "%", height="6px",
                      background=COLORS["terracotta"], border_radius="9999px"),
               width="100%", height="6px", background=COLORS["cream"], border_radius="9999px"),
        rx.foreach(card["lines"], lambda ln: rx.hstack(
            rx.text(ln["name"]), rx.spacer(), rx.text("x", ln["qty"].to(str)),
            rx.button("−", on_click=PK.remove_from_container(card["id"], ln["item_id"]),
                      variant="ghost"), width="100%")),
        rx.button("Tap to pack here", on_click=PK.pack_into(card["id"]),
                  width="100%", background=COLORS["terracotta_soft"], color=COLORS["terracotta"],
                  border_radius="10px"),
        **CARD_STYLE, width="100%", spacing="2",
    )

def containers_screen():
    return rx.vstack(
        rx.text("Pack your order", font_family=FONT_SERIF, font_size="24px",
                font_weight="700", color=COLORS["ink"]),
        rx.hstack(rx.foreach(PK.pack_chips, _chip), overflow_x="auto", width="100%"),
        rx.hstack(
            pill_button("+ Small", PK.add_container("Small")),
            pill_button("+ Medium", PK.add_container("Medium")),
            pill_button("+ Large", PK.add_container("Large")),
            pill_button("Auto-pack", PK.auto_pack),
            wrap="wrap", spacing="2",
        ),
        rx.foreach(PK.container_cards, _container_card),
        rx.text(PK.portions_left_label, color=COLORS["muted"]),
        primary_button(PK.pay_button_label, SO.pay, disabled=~PK.is_fully_packed),
        rx.button("← Back", on_click=SO.back_to_menu, variant="ghost"),
        spacing="3", width="100%", max_width="600px", margin="0 auto", padding="16px",
    )
```

- [ ] **Step 3: Write `success.py`**

```python
import reflex as rx
from cateringv3.theme import COLORS, FONT_SERIF
from cateringv3.state import StageOverlaysState as SO, CustomerOrderSelectionState as OS
from cateringv3.components.buttons import primary_button

def _row(label, value):
    return rx.hstack(rx.text(label, color=COLORS["muted"]), rx.spacer(),
                     rx.text(value, font_weight="600", color=COLORS["ink"]), width="100%")

def success_screen():
    return rx.center(
        rx.vstack(
            rx.box(rx.text("✓", font_size="32px", color="white"),
                   width="64px", height="64px", border_radius="9999px",
                   background=COLORS["green"], display="flex",
                   align_items="center", justify_content="center"),
            rx.text("Payment received", font_family=FONT_SERIF, font_size="24px",
                    font_weight="700", color=COLORS["ink"]),
            rx.text(SO.paid_total_display, " paid successfully", color=COLORS["muted"]),
            rx.vstack(
                _row("Order number", SO.order_number),
                _row("Delivery", OS.selected_date),
                _row("Containers", SO.receipt_container_count.to(str)),
                _row("Paid via", "UPI · Razorpay"),
                spacing="2", width="100%",
                background=COLORS["card"], border_radius="16px", padding="16px",
            ),
            rx.box(rx.text("We'll send a WhatsApp confirmation shortly.", color=COLORS["green"]),
                   background=COLORS["green_soft"], border_radius="12px", padding="12px", width="100%"),
            primary_button("Back to menu", SO.back_to_menu),
            spacing="4", max_width="420px", width="100%", padding="24px",
        ),
        min_height="100vh", width="100%",
    )
```

- [ ] **Step 4: Write `profile_drawer.py`**

```python
import reflex as rx
from cateringv3.theme import COLORS, FONT_SERIF, CARD_STYLE
from cateringv3.state import StageOverlaysState as SO

def _stat(label, value):
    return rx.vstack(rx.text(value, font_weight="700", color=COLORS["ink"]),
                     rx.text(label, color=COLORS["muted"], font_size="12px"),
                     **CARD_STYLE, spacing="1")

def _drawer_body():
    return rx.vstack(
        rx.hstack(rx.text("Profile", font_family=FONT_SERIF, font_size="20px",
                          font_weight="700"), rx.spacer(),
                  rx.button("×", on_click=SO.close_profile, variant="ghost"),
                  width="100%"),
        rx.hstack(rx.box(SO.avatar_initial, width="48px", height="48px",
                         border_radius="9999px", background=COLORS["terracotta_soft"],
                         color=COLORS["terracotta"], display="flex",
                         align_items="center", justify_content="center", font_weight="700"),
                  rx.text(SO.user_name, font_weight="600"), align="center", spacing="3"),
        rx.hstack(_stat("Orders placed", SO.orders_placed.to(str)),
                  _stat("Balance", SO.balance_status), width="100%"),
        rx.text("Order history on WhatsApp", color=COLORS["terracotta"]),
        rx.text("Saved addresses", color=COLORS["ink"]),
        rx.text("Sign out", color=COLORS["muted"]),
        spacing="4", width="100%", padding="20px",
    )

def profile_drawer():
    return rx.fragment(
        rx.mobile_only(rx.drawer.root(
            rx.drawer.overlay(), rx.drawer.portal(rx.drawer.content(
                _drawer_body(), width="320px", background=COLORS["cream"])),
            open=SO.show_profile, direction="right")),
        rx.tablet_and_desktop(rx.drawer.root(
            rx.drawer.overlay(), rx.drawer.portal(rx.drawer.content(
                _drawer_body(), width="360px", background=COLORS["cream"])),
            open=SO.show_profile, direction="left")),
    )
```
> Verify `rx.drawer` composition (`root/overlay/portal/content`, `open`, `direction`) against reflex-docs before finalizing; adjust to real API, note it. Backdrop must NOT auto-close beyond X (#14) — if drawer closes on overlay click by default, wire `on_open_change` to keep controlled, or accept drawer's standard behavior and document deviation in task report for user decision.

- [ ] **Step 5: Compile-check**

Run:
```bash
python -c "from cateringv3.pages import profile_drawer, containers, success; print('pages B ok')"
```
Expected: `pages B ok`

- [ ] **Step 6: Commit**

```bash
git add cateringv3/pages/profile_drawer.py cateringv3/pages/containers.py cateringv3/pages/success.py cateringv3/state/customerpackingstate.py
git commit -m "feat: add profile drawer, containers, and success pages"
```

---

### Task 12: Assemble the page + run/smoke-test

**Files:**
- Modify: `cateringv3/cateringv3.py`

**Interfaces:**
- Consumes: everything. Produces `rx.App` page.

- [ ] **Step 1: Rewrite `cateringv3.py`**

```python
"""Sarthi catering ordering app — single page, overlay + stage driven."""
import reflex as rx
from cateringv3.theme import COLORS
from cateringv3.state import CustomerOrderSelectionState as OS, StageOverlaysState as SO
from cateringv3.components.background import page_shell
from cateringv3.components.header import header
from cateringv3.components.bottom_sheet import bottom_sheet
from cateringv3.pages.menu import menu_list
from cateringv3.pages.cart import cart_body
from cateringv3.pages.delivery_date import calendar, date_picker_modal
from cateringv3.pages.profile_drawer import profile_drawer
from cateringv3.pages.containers import containers_screen
from cateringv3.pages.success import success_screen


def _menu_stage():
    phone = rx.vstack(header(), menu_list(), width="100%")
    left = rx.vstack(header(), menu_list(), width="100%")
    right = cart_body()  # persistent cart pane on tablet
    return rx.fragment(
        page_shell(phone, left, right),
        rx.mobile_only(bottom_sheet(SO.show_cart, rx.vstack(
            rx.button("Done", on_click=SO.close_cart, variant="ghost"), cart_body()))),
        rx.mobile_only(bottom_sheet(SO.show_date_picker, calendar())),
        rx.tablet_and_desktop(date_picker_modal()),
        profile_drawer(),
    )


def index() -> rx.Component:
    return rx.box(
        rx.match(
            SO.stage,
            ("containers", containers_screen()),
            ("success", success_screen()),
            _menu_stage(),
        ),
        background=COLORS["cream"], min_height="100vh",
    )


app = rx.App()
app.add_page(index, route="/", on_load=OS.init_date)
```
> Verify `rx.match` for stage switching (or use nested `rx.cond`). Confirm `on_load` accepts event handler. Adjust per reflex-docs.

- [ ] **Step 2: Compile the app**

Follow reflex-process-management skill. Start app:
```bash
reflex run
```
Expected: compiles w/ no Python/Reflex errors, serves on `localhost:3000`. If errors, fix per skill's investigation steps (most likely: Var API mismatch flagged in earlier task's verify note).

- [ ] **Step 3: Click-through smoke test (per spec Verification, #4)**

Using Playwright MCP browser, visit `http://localhost:3000` and confirm each w/o crashing:
1. Menu renders; category chips switch items; "Add" adds → stepper appears; − at qty 1 removes line.
2. Header date opens date picker; pick date; past dates disabled; month nav works; Done closes.
3. Profile icon opens drawer; close works.
4. Cart (phone: Cart button; tablet: right pane) shows lines + items total; "Choose containers" goes to containers stage.
5. Containers: add S/M/L; select item chip; tap container to pack one unit; Auto-pack fills; progress + "space used" update; Pay disabled until fully packed.
6. Pay → success screen shows order number `SAR-####`, total, container count; "Back to menu" returns and resets (cart empty, date back to today).
7. Resize browser to tablet width (≥ 768px), confirm two-pane layout appears, cart is persistent right pane.

Record any visual gaps vs `assets/01`–`07`; fix obvious ones (spacing, color, font). Do NOT do screenshot-diff pass.

- [ ] **Step 4: Stop app, run full test suite**

Run: `python -m pytest -v`
Expected: all logic tests pass.

- [ ] **Step 5: Commit**

```bash
git add cateringv3/cateringv3.py
git commit -m "feat: assemble Sarthi single-page app with stage/overlay routing"
```

---

## Self-Review

**Spec coverage:**
- Goal / full flow → Tasks 8–12 (all 7 screens). ✓
- 3-state model, backend-only logic → Tasks 5–7; all math in `packing.py` (Tasks 3–4). ✓
- Responsive shell `mobile_only` / `tablet_and_desktop`, two-pane, containers/success full-screen, tablet left-drawer profile, tablet date modal → Task 9 (`page_shell`), Task 11 (drawer sides), Task 10/12 (date modal). ✓
- Resolved decisions: #1 empty-cart Pay (`is_fully_packed` guard, Task 6) ✓; #2 cart edit resets packing (Task 7) ✓; #3 self-host fonts under `assets/fonts/` (Task 1) ✓; #4 smoke test only (Task 12) ✓; #5 real calendar (Task 10) ✓; #6 1 unit=1 portion (`total_portions`, Task 3) ✓; #7 one unit/tap (`pack_into`, Task 6) ✓; #8 random `SAR-####` (`make_order_number`, Task 3) ✓; #9 computed today default (`init_date`, Task 5) ✓; #10 auto-pack augments (`ffd_pack` keeps existing, Task 4) ✓; #11 fewest containers/prefer large (Task 4) ✓; #12 left drawer on tablet (Task 11) ✓; #13 delete refunds fee (`delete_container`, Task 6) ✓; #14 explicit-dismiss only (backdrop no on_click, Task 9) ✓; #15 auto-advance selection (`_advance_selection`, Task 6) ✓; #16 − at qty1 removes line (`dec`, Task 5) ✓; #17 back_to_menu resets date (Task 7) ✓; #18 Auto-pack always enabled (Task 11 button, no disabled) ✓; #19 category switch scrolls top (`set_category` + `menu-list-top` anchor, Tasks 5/10) ✓.
- Data: real breads + invented veg, container specs (Task 2). ✓
- Theme tokens + fonts (Task 1). ✓

**Placeholder scan:** No "TBD/TODO-in-final-code" — only `# TODO(Task 7)` markers explicitly created in Task 5, explicitly removed in Task 7. Every code step shows real code.

**Type consistency:** container dict shape `{id,size,capacity,fee,items:{item_id:qty}}` consistent across `packing.py`, `add_container`, `ffd_pack`, `container_cards`. `selected_item_to_pack` is `str` ("" = none) everywhere. `cart` is `dict[str,int]` throughout. Money always via `packing.money`. Order number `SAR-####` produced by `make_order_number`, consumed by `pay` → `order_number`.

**Known verification points flagged for implementer** (each has fallback noted in its step): `rx.scroll_to`, `OS.quantities[item_id]` var-indexing, `rx.el.style` for `@font-face`, `@rx.var(deps=[...])` referencing local var inside class body, `rx.dialog` / `rx.drawer` composition and `direction`, `rx.match`, `on_load` accepting event handler. These are Reflex-API confirmations to make against reflex-docs/source during implementation, not design gaps.