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
        from cateringv3.state.adminordersstate import AdminOrdersState
        from cateringv3.state.adminmenustate import AdminMenuState
        orders_state = await self.get_state(AdminOrdersState)
        orders_state.load_mock_orders()
        menu_state = await self.get_state(AdminMenuState)
        menu_state.load_menu()
