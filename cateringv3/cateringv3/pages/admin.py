import reflex as rx
from cateringv3.components.base_page import base_page
from cateringv3.state.adminnavstate import AdminNavState
from cateringv3.pages.admin_menu import menu_page
from cateringv3.pages.admin_orders import orders_page


@base_page
def admin() -> rx.Component:
    return rx.cond(AdminNavState.section == "menu", menu_page(), orders_page())
