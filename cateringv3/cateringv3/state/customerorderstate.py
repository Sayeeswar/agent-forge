"""Cart, menu category, and delivery date selection."""
import datetime
import reflex as rx
from cateringv3 import data
from cateringv3.state import packing


class CustomerOrderSelectionState(rx.State):
    cart: dict[str, int] = {}
    active_category: str = "Rotis & Breads"
    selected_date: str = ""
    cal_year: int = 0
    cal_month: int = 0  # 1-12

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

    @rx.var
    def cart_lines(self) -> list[dict]:
        out = []
        for item_id, qty in self.cart.items():
            it = data.ITEMS_BY_ID[item_id]
            out.append({
                "id": item_id,
                "name": it["name"],
                "qty": qty,
                "price": it["price"],
                "line_total_display": packing.money(it["price"] * qty),
            })
        return out

    @rx.var
    def calendar_weeks(self) -> list[list[dict]]:
        import calendar as _cal
        today = datetime.date.today()
        weeks = []
        for week in _cal.Calendar(firstweekday=6).monthdatescalendar(self.cal_year, self.cal_month):
            row = []
            for d in week:
                in_month = d.month == self.cal_month
                row.append({
                    "day": d.day if in_month else 0,
                    "label": d.strftime("%a, %d %b").replace(" 0", " ") if in_month else "",
                    "is_today": d == today,
                    "disabled": (not in_month) or d < today,
                })
            weeks.append(row)
        return weeks

    @rx.var
    def cal_month_label(self) -> str:
        return datetime.date(self.cal_year, self.cal_month, 1).strftime("%B %Y")

    @rx.event
    def init_date(self):
        today = datetime.date.today()
        if not self.selected_date:
            self.selected_date = today.strftime("%a, %d %b").replace(" 0", " ")
        if self.cal_month == 0:
            self.cal_year, self.cal_month = today.year, today.month

    async def _reset_packing(self):
        # Local import avoids a circular import: customerpackingstate imports
        # CustomerOrderSelectionState at module load time.
        from cateringv3.state.customerpackingstate import CustomerPackingState
        pk = await self.get_state(CustomerPackingState)
        pk.reset_packing()

    @rx.event
    async def add_item(self, item_id: str):
        self.cart[item_id] = self.cart.get(item_id, 0) + 1
        await self._reset_packing()

    @rx.event
    async def inc(self, item_id: str):
        self.cart[item_id] = self.cart.get(item_id, 0) + 1
        await self._reset_packing()

    @rx.event
    async def dec(self, item_id: str):
        current = self.cart.get(item_id, 0)
        if current <= 1:
            self.cart.pop(item_id, None)
        else:
            self.cart[item_id] = current - 1
        await self._reset_packing()

    @rx.event
    def set_category(self, name: str):
        self.active_category = name
        return rx.scroll_to("menu-list-top")

    @rx.event
    def select_date(self, date: str):
        self.selected_date = date

    @rx.event
    def prev_month(self):
        self.cal_month -= 1
        if self.cal_month < 1:
            self.cal_month, self.cal_year = 12, self.cal_year - 1

    @rx.event
    def next_month(self):
        self.cal_month += 1
        if self.cal_month > 12:
            self.cal_month, self.cal_year = 1, self.cal_year + 1
