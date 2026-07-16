"""Horizontal scrolling row of menu category chips."""
import reflex as rx
from cateringv3 import data
from cateringv3.theme import COLORS
from cateringv3.state import CustomerOrderSelectionState as OS


def _chip(name: str) -> rx.Component:
    active = OS.active_category == name
    return rx.button(
        name,
        on_click=OS.set_category(name),
        background=rx.cond(active, COLORS["ink"], "transparent"),
        color=rx.cond(active, "white", COLORS["muted"]),
        border=rx.cond(active, "none", f"1px solid {COLORS['muted']}40"),
        border_radius="9999px",
        padding="8px 16px",
        font_size="14px",
        white_space="nowrap",
        flex_shrink="0",
    )


def category_chips() -> rx.Component:
    """Scrollable chip row driven by the static category list in `data.py`.

    Note: `data.CATEGORIES` is a plain Python list (not a Var), so this is
    unrolled at build time into one `_chip(...)` call per category. Either
    a Python loop or `rx.foreach` works for a static list; `rx.foreach` is
    used here to stay consistent with the dynamic lists used elsewhere.
    """
    return rx.hstack(
        rx.foreach(data.CATEGORIES, _chip),
        overflow_x="auto",
        spacing="2",
        width="100%",
        padding_y="4px",
    )
