"""Navigation stage, overlay flags, mock user, and payment result."""
import reflex as rx
from cateringv3.state import packing
from cateringv3.state.customerorderstate import CustomerOrderSelectionState
from cateringv3.state.customerpackingstate import CustomerPackingState


class StageOverlaysState(rx.State):
    stage: str = "menu"
    show_cart: bool = False
    show_date_picker: bool = False
    show_profile: bool = False
    user_name: str = "Priya S."
    orders_placed: int = 12
    balance_status: str = "All paid up"
    order_number: str = ""
    paid_total: int = 0
    receipt_container_count: int = 0

    @rx.var
    def paid_total_display(self) -> str:
        return packing.money(self.paid_total)

    @rx.var
    def avatar_initial(self) -> str:
        return self.user_name[:1]

    @rx.var
    def orders_placed_label(self) -> str:
        return f"{self.orders_placed} orders placed"

    @rx.event
    def open_cart(self):
        self.show_cart = True

    @rx.event
    def close_cart(self):
        self.show_cart = False

    @rx.event
    def open_date_picker(self):
        self.show_date_picker = True

    @rx.event
    def close_date_picker(self):
        self.show_date_picker = False

    @rx.event
    def open_profile(self):
        self.show_profile = True

    @rx.event
    def close_profile(self):
        self.show_profile = False

    @rx.event
    def go_to_containers(self):
        self.show_cart = False
        self.stage = "containers"

    @rx.event
    async def pay(self):
        order = await self.get_state(CustomerOrderSelectionState)
        pk = await self.get_state(CustomerPackingState)
        self.paid_total = packing.grand_total(order.cart, pk.containers)
        self.receipt_container_count = len(pk.containers)
        self.order_number = packing.make_order_number()
        self.stage = "success"

    @rx.event
    async def back_to_menu(self):
        order = await self.get_state(CustomerOrderSelectionState)
        pk = await self.get_state(CustomerPackingState)
        order.cart = {}
        order.active_category = "Rotis & Breads"
        order.selected_date = ""
        order.init_date()
        pk.reset_packing()
        self.stage = "menu"
        self.show_cart = self.show_date_picker = self.show_profile = False
        self.order_number = ""
        self.paid_total = 0
        self.receipt_container_count = 0
