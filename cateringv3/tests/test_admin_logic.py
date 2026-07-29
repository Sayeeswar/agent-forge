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
    assert admin_logic.same_day_count(orders) == 2   # open+today, completed+today
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
