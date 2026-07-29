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
