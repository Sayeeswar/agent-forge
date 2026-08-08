"""Admin orders list, filters, and Kitchen-tab aggregates. Order-detail sheet logic lives in Task 6."""
import reflex as rx
from sqlalchemy.orm import selectinload

from cateringv3.models import Order
from cateringv3.state import admin_logic


class AdminOrdersState(rx.State):
    orders: list[dict] = []
    active_tab: str = "orders"
    active_filter: str = ""
    active_order_id: str = ""

    @rx.event
    def load_orders(self):
        if self.orders:
            return
        with rx.session() as session:
            rows = session.exec(
                Order.select().options(
                    selectinload(Order.customer),
                    selectinload(Order.items),
                    selectinload(Order.payment),
                )
            ).all()
            self.orders = [admin_logic.order_to_dict(o) for o in rows]

    @rx.event
    def set_tab(self, tab: str):
        self.active_tab = tab

    @rx.event
    def set_filter(self, name: str):
        self.active_filter = "" if self.active_filter == name else name

    @rx.var
    def new_count(self) -> int:
        return admin_logic.new_count(self.orders)

    @rx.var
    def total_count(self) -> int:
        return admin_logic.total_count(self.orders)

    @rx.var
    def revenue_display(self) -> str:
        return admin_logic.money(admin_logic.revenue_total(self.orders))

    @rx.var
    def same_day_count(self) -> int:
        return admin_logic.same_day_count(self.orders)

    @rx.var
    def open_count(self) -> int:
        return admin_logic.open_count(self.orders)

    @rx.var
    def partial_count(self) -> int:
        return admin_logic.partial_count(self.orders)

    @rx.var
    def has_partial(self) -> bool:
        return self.partial_count > 0

    @rx.var
    def items_to_prepare(self) -> int:
        return admin_logic.items_to_prepare(self.orders)

    @rx.var
    def unique_dishes(self) -> int:
        return admin_logic.unique_dishes(self.orders)

    @rx.var
    def orders_delivering(self) -> int:
        return admin_logic.orders_delivering(self.orders)

    @rx.var
    def prep_list_display(self) -> list[dict]:
        rows = admin_logic.prep_list(self.orders)
        out = []
        for r in rows:
            plural = "s" if r["order_count"] != 1 else ""
            out.append({
                "name": r["name"],
                "meta": f"across {r['order_count']} order{plural} · {admin_logic.money(r['price'])} each",
                "qty_display": f"×{r['total_qty']}",
            })
        return out

    @rx.var
    def special_orders_display(self) -> list[dict]:
        out = []
        for o in admin_logic.special_orders(self.orders):
            out.append({
                "id": o["id"],
                "customer_name": o["customer_name"],
                "items_summary": admin_logic.order_items_summary(o),
                "note": o["special_note"],
            })
        return out

    @rx.var
    def orders_display(self) -> list[dict]:
        visible = admin_logic.filter_orders(self.orders, self.active_filter)
        out = []
        for o in visible:
            out.append({
                "id": o["id"],
                "customer_name": o["customer_name"],
                "items_summary": admin_logic.order_items_summary(o),
                "placed_display": o["placed_display"],
                "payment_method": o["payment_method"],
                "total_display": admin_logic.money(admin_logic.order_total(o)),
                "is_special": o["is_special"],
            })
        return out

    def _find_order(self, order_id: str):
        for o in self.orders:
            if o["id"] == order_id:
                return o
        return None

    @rx.var
    def show_order_sheet(self) -> bool:
        return self.active_order_id != ""

    @rx.var
    def active_order_lines(self) -> list[dict]:
        order = self._find_order(self.active_order_id)
        if order is None:
            return []
        return admin_logic.order_line_items(order)

    @rx.var
    def active_order_id_display(self) -> str:
        order = self._find_order(self.active_order_id)
        return order["id"] if order else ""

    @rx.var
    def active_order_placed_display(self) -> str:
        order = self._find_order(self.active_order_id)
        return order["placed_display"] if order else ""

    @rx.var
    def active_order_customer_name(self) -> str:
        order = self._find_order(self.active_order_id)
        return order["customer_name"] if order else ""

    @rx.var
    def active_order_phone(self) -> str:
        order = self._find_order(self.active_order_id)
        return order["phone"] if order else ""

    @rx.var
    def active_order_payment_method(self) -> str:
        order = self._find_order(self.active_order_id)
        return order["payment_method"] if order else ""

    @rx.var
    def active_order_original_total_display(self) -> str:
        order = self._find_order(self.active_order_id)
        return admin_logic.money(admin_logic.order_original_total(order)) if order else ""

    @rx.var
    def active_order_total_display(self) -> str:
        order = self._find_order(self.active_order_id)
        return admin_logic.money(admin_logic.order_total(order)) if order else ""

    @rx.var
    def active_order_has_strikes(self) -> bool:
        order = self._find_order(self.active_order_id)
        return bool(order and any(line["struck"] for line in order["items"]))

    @rx.event
    def open_order(self, order_id: str):
        self.active_order_id = order_id

    @rx.event
    def close_order(self):
        self.active_order_id = ""

    @rx.event
    def toggle_strike(self, item_id: str):
        order = self._find_order(self.active_order_id)
        if order is None:
            return
        for line in order["items"]:
            if line["item_id"] == item_id:
                line["struck"] = not line["struck"]

    @rx.event
    def save_partial(self):
        order = self._find_order(self.active_order_id)
        if order is not None:
            has_struck = any(line["struck"] for line in order["items"])
            order["status"] = "partial" if has_struck else "open"
        self.close_order()

    @rx.event
    def mark_completed(self):
        order = self._find_order(self.active_order_id)
        if order is not None:
            order["status"] = "completed"
        self.close_order()

    @rx.event
    def cancel_order(self):
        order = self._find_order(self.active_order_id)
        if order is not None:
            order["status"] = "cancelled"
        self.close_order()
