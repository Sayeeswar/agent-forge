"""Cart, menu category, and delivery date selection."""
import datetime
import reflex as rx
from cateringv3 import data
from cateringv3.state import packing


class CustomerOrderSelectionState(rx.State):
    cart: dict[str, int] = {}
    active_category: str = "Rotis & Breads"
    selected_date: str = ""

    @rx.var
    def cart_count(self) -> int:
        return packing.total_portions(self.cart)

    @rx.var
    def items_total(self) -> int:
        return packing.items_total(self.cart)

    @rx.var
    def total_portions(self) -> int:
        return packing.total_portions(self.cart)

    @rx.var
    def items_total_display(self) -> str:
        return packing.money(self.items_total)

    @rx.var
    def is_cart_empty(self) -> bool:
        return len(self.cart) == 0

    @rx.var
    def active_items(self) -> list[dict]:
        return data.items_for(self.active_category)

    @rx.var
    def active_count_label(self) -> str:
        return f"{len(self.active_items)} items"

    @rx.var
    def quantities(self) -> dict[str, int]:
        return dict(self.cart)

    @rx.event
    def init_date(self):
        if not self.selected_date:
            today = datetime.date.today()
            self.selected_date = today.strftime("%a, %d %b").replace(" 0", " ")

    @rx.event
    def add_item(self, item_id: str):
        self.cart[item_id] = self.cart.get(item_id, 0) + 1
        # TODO(Task 7): reset packing

    @rx.event
    def inc(self, item_id: str):
        self.cart[item_id] = self.cart.get(item_id, 0) + 1
        # TODO(Task 7): reset packing

    @rx.event
    def dec(self, item_id: str):
        current = self.cart.get(item_id, 0)
        if current <= 1:
            self.cart.pop(item_id, None)
        else:
            self.cart[item_id] = current - 1
        # TODO(Task 7): reset packing

    @rx.event
    def set_category(self, name: str):
        self.active_category = name
        return rx.scroll_to("menu-list-top")

    @rx.event
    def select_date(self, date: str):
        self.selected_date = date
