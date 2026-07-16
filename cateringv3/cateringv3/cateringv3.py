"""Sarthi catering ordering app — single page, overlay + stage driven."""
import reflex as rx
from cateringv3.theme import COLORS
from cateringv3.state import CustomerOrderSelectionState as OS, StageOverlaysState as SO
from cateringv3.components.background import page_shell
from cateringv3.components.header import header
from cateringv3.components.bottom_sheet import bottom_sheet
from cateringv3.pages.menu import menu_list
from cateringv3.pages.cart import cart_body
from cateringv3.pages.delivery_date import date_picker_sheet, date_picker_modal
from cateringv3.pages.profile_drawer import profile_drawer
from cateringv3.pages.containers import containers_screen
from cateringv3.pages.success import success_screen


def _cart_sheet() -> rx.Component:
    """Phone-only cart bottom sheet: explicit Done button + cart body."""
    return bottom_sheet(
        SO.show_cart,
        rx.vstack(
            rx.button("Done", on_click=SO.close_cart, variant="ghost"),
            cart_body(),
            spacing="3",
            width="100%",
        ),
    )


def _menu_stage() -> rx.Component:
    """Menu + cart + date-picker + profile stage (design's default screen)."""
    phone = rx.vstack(header(), menu_list(), width="100%")
    left = rx.vstack(header(), menu_list(), width="100%")
    right = cart_body()  # persistent cart pane on tablet
    return rx.fragment(
        page_shell(phone, left, right),
        rx.mobile_only(_cart_sheet()),
        rx.mobile_only(date_picker_sheet()),
        rx.tablet_and_desktop(date_picker_modal()),
        profile_drawer(),
    )


def index() -> rx.Component:
    return rx.box(
        rx.match(
            SO.stage,
            ("containers", containers_screen()),
            ("success", success_screen()),
            _menu_stage(),
        ),
        background=COLORS["cream"],
        min_height="100vh",
        width="100%",
    )


app = rx.App()
app.add_page(index, route="/", on_load=OS.init_date)
