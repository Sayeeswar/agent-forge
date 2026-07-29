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
