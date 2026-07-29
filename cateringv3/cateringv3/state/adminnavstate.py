"""Top-level admin section switch (Orders vs Menu) and nav-dropdown open flag."""
import reflex as rx


class AdminNavState(rx.State):
    section: str = "orders"
    nav_open: bool = False

    @rx.event
    def set_section(self, name: str):
        self.section = name
        self.nav_open = False

    @rx.event
    def toggle_nav(self):
        self.nav_open = not self.nav_open

    @rx.event
    def close_nav(self):
        self.nav_open = False

    @rx.event
    async def load_admin_data(self):
        pass  # TODO(Task 5): call AdminOrdersState.load_mock_orders + AdminMenuState.load_menu
