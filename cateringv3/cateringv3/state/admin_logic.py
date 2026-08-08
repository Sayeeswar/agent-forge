"""Pure logic for admin orders: totals, summaries, kitchen aggregation. No Reflex imports."""
from datetime import datetime


def money(n):
    return f"₹{n}"


def order_line_items(order):
    return [
        {**line, "subtotal": line["price"] * line["qty"]}
        for line in order["items"]
    ]


def order_items_summary(order):
    return " · ".join(f"{line['qty']}× {line['name']}" for line in order["items"])


def order_original_total(order):
    return sum(line["price"] * line["qty"] for line in order["items"])


def order_total(order):
    return sum(line["price"] * line["qty"] for line in order["items"] if not line["struck"])


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
    return sum(line["qty"] for o in _active_orders(orders) for line in o["items"])


def unique_dishes(orders):
    names = {line["name"] for o in _active_orders(orders) for line in o["items"]}
    return len(names)


def orders_delivering(orders):
    return len(_active_orders(orders))


def prep_list(orders):
    totals = {}
    order_counts = {}
    prices = {}
    for o in _active_orders(orders):
        for line in o["items"]:
            name = line["name"]
            totals[name] = totals.get(name, 0) + line["qty"]
            order_counts[name] = order_counts.get(name, 0) + 1
            prices[name] = line["price"]
    rows = [
        {"name": name, "price": prices[name], "total_qty": qty, "order_count": order_counts[name]}
        for name, qty in totals.items()
    ]
    rows.sort(key=lambda r: r["total_qty"], reverse=True)
    return rows


def special_orders(orders):
    return [o for o in _active_orders(orders) if o["is_special"]]


def derived_status(status: str, has_struck: bool) -> str:
    if status == "cancelled":
        return "cancelled"
    if status == "delivered":
        return "completed"
    return "partial" if has_struck else "open"


def _placed_display(ordered_at: datetime) -> str:
    delta_days = (datetime.utcnow().date() - ordered_at.date()).days
    time_str = ordered_at.strftime("%I:%M %p").lstrip("0")
    if delta_days == 0:
        return f"Placed {time_str} today"
    if delta_days == 1:
        return f"Placed Yesterday {time_str}"
    return f"Placed {ordered_at.strftime('%b %d')} {time_str}"


def order_to_dict(order) -> dict:
    items = [
        {
            "item_id": str(oi.id), "name": oi.product_name,
            "qty": oi.quantity, "price": oi.unit_price, "struck": oi.struck,
        }
        for oi in order.items
    ]
    has_struck = any(line["struck"] for line in items)
    return {
        "id": order.order_number,
        "customer_name": order.customer.name,
        "phone": order.customer.phone,
        "items": items,
        "payment_method": order.payment.method if order.payment else "cash",
        "placed_display": _placed_display(order.ordered_at),
        "is_same_day": order.ordered_at.date() == datetime.utcnow().date(),
        "status": derived_status(order.status, has_struck),
        "is_special": bool(order.notes),
        "special_note": order.notes or "",
    }
