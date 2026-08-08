# tests/test_admin_logic.py
from datetime import datetime, timedelta

from cateringv3.state import admin_logic


def _line(item_id="li-1", name="Paneer Paratha", qty=2, price=80, struck=False):
    return {"item_id": item_id, "name": name, "qty": qty, "price": price, "struck": struck}


def _order(items, **overrides):
    base = {
        "id": "ZS-20260807-0001",
        "customer_name": "Test Customer",
        "phone": "+91 90000 00000",
        "items": items,
        "payment_method": "online",
        "placed_display": "Placed today",
        "is_same_day": False,
        "status": "open",
        "is_special": False,
        "special_note": "",
    }
    base.update(overrides)
    return base


def test_money_format():
    assert admin_logic.money(85) == "₹85"
    assert admin_logic.money(0) == "₹0"


def test_order_line_items_shape_and_struck_flag():
    order = _order([
        _line("li-1", "Paneer Paratha", 2, 80, struck=False),
        _line("li-2", "Puri", 1, 15, struck=True),
    ])
    lines = admin_logic.order_line_items(order)
    by_id = {l["item_id"]: l for l in lines}
    assert by_id["li-1"] == {
        "item_id": "li-1", "name": "Paneer Paratha",
        "qty": 2, "price": 80, "subtotal": 160, "struck": False,
    }
    assert by_id["li-2"]["struck"] is True
    assert by_id["li-2"]["subtotal"] == 15


def test_order_items_summary_joins_qty_and_name():
    order = _order([_line("li-1", "Paneer Paratha", 2, 80), _line("li-2", "Puri", 1, 15)])
    assert admin_logic.order_items_summary(order) == "2× Paneer Paratha · 1× Puri"


def test_order_original_total_ignores_strikes():
    order = _order([_line("li-1", "Paneer Paratha", 1, 80), _line("li-2", "Puri", 2, 15, struck=True)])
    assert admin_logic.order_original_total(order) == 80 + 30


def test_order_total_excludes_struck_items():
    order = _order([_line("li-1", "Paneer Paratha", 1, 80), _line("li-2", "Puri", 2, 15, struck=True)])
    assert admin_logic.order_total(order) == 80


def _orders_fixture():
    return [
        _order([_line("a", "Paneer Paratha", 2, 80)], status="open", is_same_day=False),
        _order([_line("b", "Puri", 1, 15)], status="open", is_same_day=True),
        _order([_line("c", "Paneer Paratha", 1, 80)], status="completed", is_same_day=True),
        _order([_line("d", "Puri", 2, 15, struck=True)], status="partial", is_same_day=False),
        _order([_line("e", "Paneer Paratha", 1, 80)], status="cancelled", is_same_day=False),
    ]


def test_counts():
    orders = _orders_fixture()
    assert admin_logic.new_count(orders) == 2
    assert admin_logic.total_count(orders) == 4
    assert admin_logic.same_day_count(orders) == 2
    assert admin_logic.open_count(orders) == 2
    assert admin_logic.partial_count(orders) == 1


def test_revenue_total_excludes_cancelled_and_struck_items():
    orders = _orders_fixture()
    assert admin_logic.revenue_total(orders) == 160 + 15 + 80 + 0


def test_filter_orders():
    orders = _orders_fixture()
    assert len(admin_logic.filter_orders(orders, "")) == 4
    assert len(admin_logic.filter_orders(orders, "same_day")) == 2
    assert len(admin_logic.filter_orders(orders, "open")) == 2
    assert len(admin_logic.filter_orders(orders, "partial")) == 1


def test_kitchen_stats_use_open_and_partial_orders_only():
    orders = _orders_fixture()
    assert admin_logic.items_to_prepare(orders) == 2 + 1 + 2
    assert admin_logic.unique_dishes(orders) == 2
    assert admin_logic.orders_delivering(orders) == 3


def test_prep_list_aggregates_across_orders_sorted_desc():
    orders = _orders_fixture()
    rows = admin_logic.prep_list(orders)
    by_name = {r["name"]: r for r in rows}
    assert by_name["Puri"] == {"name": "Puri", "price": 15, "total_qty": 3, "order_count": 2}
    assert by_name["Paneer Paratha"]["total_qty"] == 2
    assert rows[0]["total_qty"] >= rows[-1]["total_qty"]


def test_special_orders_filters_active_and_flagged():
    orders = _orders_fixture()
    orders[0]["is_special"] = True
    orders[2]["is_special"] = True
    assert [o["items"] for o in admin_logic.special_orders(orders)] == [[_line("a", "Paneer Paratha", 2, 80)]]


def test_derived_status_maps_enum_and_struck():
    assert admin_logic.derived_status("cancelled", has_struck=False) == "cancelled"
    assert admin_logic.derived_status("delivered", has_struck=True) == "completed"
    assert admin_logic.derived_status("confirmed", has_struck=True) == "partial"
    assert admin_logic.derived_status("pending", has_struck=False) == "open"


class _FakeCustomer:
    def __init__(self, name, phone):
        self.name = name
        self.phone = phone


class _FakeItem:
    def __init__(self, id, product_name, quantity, unit_price, struck):
        self.id = id
        self.product_name = product_name
        self.quantity = quantity
        self.unit_price = unit_price
        self.struck = struck


class _FakePayment:
    def __init__(self, method):
        self.method = method


class _FakeOrder:
    def __init__(self, **kw):
        self.order_number = kw.get("order_number", "ZS-20260807-0001")
        self.customer = kw.get("customer", _FakeCustomer("Kavya Iyer", "+91 98452 71034"))
        self.items = kw.get("items", [_FakeItem(1, "Paneer Paratha", 2, 80.0, False)])
        self.payment = kw.get("payment", _FakePayment("online"))
        self.notes = kw.get("notes", None)
        self.ordered_at = kw.get("ordered_at", datetime.utcnow())
        self.status = kw.get("status", "pending")


def test_order_to_dict_maps_fields():
    order = _FakeOrder(notes="Extra spicy please")
    d = admin_logic.order_to_dict(order)
    assert d["id"] == "ZS-20260807-0001"
    assert d["customer_name"] == "Kavya Iyer"
    assert d["phone"] == "+91 98452 71034"
    assert d["payment_method"] == "online"
    assert d["is_special"] is True
    assert d["special_note"] == "Extra spicy please"
    assert d["items"] == [{"item_id": "1", "name": "Paneer Paratha", "qty": 2, "price": 80.0, "struck": False}]


def test_order_to_dict_is_same_day():
    today_order = _FakeOrder(ordered_at=datetime.utcnow())
    old_order = _FakeOrder(ordered_at=datetime.utcnow() - timedelta(days=3))
    assert admin_logic.order_to_dict(today_order)["is_same_day"] is True
    assert admin_logic.order_to_dict(old_order)["is_same_day"] is False
