"""Reusable button atoms: primary (filled, full-width) and pill (outline)."""
import reflex as rx
from cateringv3.theme import COLORS


def primary_button(label, on_click=None, disabled=False, **kw) -> rx.Component:
    """Full-width, filled terracotta call-to-action button."""
    return rx.button(
        label,
        on_click=on_click,
        disabled=disabled,
        width="100%",
        height="52px",
        border_radius="14px",
        background=COLORS["terracotta"],
        color="white",
        font_weight="600",
        font_size="16px",
        opacity=rx.cond(disabled, 0.5, 1),
        **kw,
    )


def pill_button(label, on_click=None, **kw) -> rx.Component:
    """Outline pill button (transparent background, muted border)."""
    return rx.button(
        label,
        on_click=on_click,
        background="transparent",
        color=COLORS["ink"],
        border=f"1px solid {COLORS['muted']}",
        border_radius="9999px",
        padding="8px 16px",
        font_size="14px",
        **kw,
    )
