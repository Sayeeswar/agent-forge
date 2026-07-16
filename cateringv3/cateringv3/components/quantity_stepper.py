"""Minus/quantity/plus stepper bound to CustomerOrderSelectionState.cart."""
import reflex as rx
from cateringv3.theme import COLORS
from cateringv3.state import CustomerOrderSelectionState as OS


def _btn(symbol: str, on_click) -> rx.Component:
    return rx.button(
        symbol,
        on_click=on_click,
        width="32px",
        height="32px",
        border_radius="8px",
        background=COLORS["terracotta"],
        color="white",
        font_size="18px",
        padding="0",
    )


def quantity_stepper(item_id) -> rx.Component:
    """Render `- qty +` for a cart item.

    `item_id` MUST be a typed StringVar (or plain `str`) — `OS.quantities`
    is an `ObjectVar`, and `ObjectVar.__getitem__` raises `VarTypeError` at
    component-build time if the key Var is untyped. `food_card` guarantees
    this by casting with `item["id"].to(str)` before calling here.

    Callers must also only mount this when the item is already in the cart
    (`food_card` guards with `rx.cond(OS.cart.contains(item_id), ...)`) so
    the displayed quantity is always a real number, never `undefined`.
    """
    return rx.hstack(
        _btn("−", OS.dec(item_id)),
        rx.text(
            OS.quantities[item_id].to(str),
            width="24px",
            text_align="center",
            font_weight="600",
            color=COLORS["ink"],
        ),
        _btn("+", OS.inc(item_id)),
        align="center",
        spacing="2",
    )
