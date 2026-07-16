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
