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
