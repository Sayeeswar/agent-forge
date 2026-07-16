"""Menu item card: veg dot, name, description, price, add/stepper control."""
import reflex as rx
from cateringv3.theme import COLORS, CARD_STYLE
from cateringv3.state import CustomerOrderSelectionState as OS
from cateringv3.components.quantity_stepper import quantity_stepper


def _veg_dot() -> rx.Component:
    return rx.box(
        rx.box(
            width="8px",
            height="8px",
            border_radius="9999px",
            background=COLORS["green"],
        ),
        width="16px",
        height="16px",
        border=f"1.5px solid {COLORS['green']}",
        border_radius="3px",
        display="flex",
        align_items="center",
        justify_content="center",
    )


def food_card(item: dict) -> rx.Component:
    """Card for a single menu item. `item` arrives as a Var from `rx.foreach`,
    so `item["id"]`, `item["name"]`, `item["price"]` are Var (dict) accesses.
    `item["price"].to(str)` casts the numeric Var to a StringVar so it can
    sit alongside the literal "₹" as sibling text children.

    `item["id"]` on its own is an UNTYPED Var (because `OS.active_items` is
    typed `list[dict]`), and `OS.quantities[item_id]` in `quantity_stepper`
    requires a typed key or `ObjectVar.__getitem__` raises `VarTypeError` at
    component-build time. `.to(str)` casts it to a StringVar up front so the
    same typed `item_id` can safely be passed to `quantity_stepper`,
    `OS.cart.contains`, and `OS.add_item`.
    """
    item_id = item["id"].to(str)
    in_cart = OS.cart.contains(item_id)
    return rx.hstack(
        rx.vstack(
            rx.hstack(
                _veg_dot(),
                rx.text(item["name"], font_weight="600", color=COLORS["ink"]),
                align="center",
                spacing="2",
            ),
            rx.text(item["desc"], color=COLORS["muted"], font_size="13px"),
            rx.text(
                "₹", item["price"].to(str),
                font_weight="600", color=COLORS["ink"],
            ),
            align="start",
            spacing="1",
        ),
        rx.spacer(),
        rx.cond(
            in_cart,
            quantity_stepper(item_id),
            rx.button(
                "Add",
                on_click=OS.add_item(item_id),
                background=COLORS["terracotta_soft"],
                color=COLORS["terracotta"],
                border_radius="10px",
                font_weight="600",
                padding="8px 20px",
            ),
        ),
        width="100%",
        align="center",
        **CARD_STYLE,
    )
