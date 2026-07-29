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
