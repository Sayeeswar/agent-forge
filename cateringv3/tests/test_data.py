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
