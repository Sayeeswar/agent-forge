"""Admin orders list, filters, and Kitchen-tab aggregates. Order-detail sheet logic lives in Task 6."""
import copy
import reflex as rx
from cateringv3 import admin_data
from cateringv3.state import admin_logic


class AdminOrdersState(rx.State):
    orders: list[dict] = []
    active_tab: str = "orders"
    active_filter: str = ""
    active_order_id: str = ""

    @rx.event
    def load_mock_orders(self):
        if not self.orders:
            self.orders = copy.deepcopy(admin_data.MOCK_ORDERS)

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
                "item_id": r["item_id"],
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
