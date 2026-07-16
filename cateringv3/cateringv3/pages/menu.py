"""Menu list page body: category chips, section header, and food cards."""
import reflex as rx
from cateringv3.theme import COLORS, FONT_SERIF
from cateringv3.state import CustomerOrderSelectionState as OS
from cateringv3.components.category_chips import category_chips
from cateringv3.components.food_card import food_card


def menu_list() -> rx.Component:
    """Scrollable menu section: chips, active category header, item cards.

    `id="menu-list-top"` is the scroll target used by `OS.set_category` via
    `rx.scroll_to`, so switching category chips jumps back to the top of
    the list.
    """
    return rx.vstack(
        rx.box(id="menu-list-top"),
        category_chips(),
        rx.hstack(
            rx.text(
                OS.active_category,
                font_family=FONT_SERIF,
                font_size="20px",
                font_weight="700",
                color=COLORS["ink"],
            ),
            rx.spacer(),
            rx.text(OS.active_count_label, color=COLORS["muted"], font_size="13px"),
            width="100%",
            align="center",
        ),
        rx.foreach(OS.active_items, food_card),
        spacing="3",
        width="100%",
        padding_bottom="24px",
    )
