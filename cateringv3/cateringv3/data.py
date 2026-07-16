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
