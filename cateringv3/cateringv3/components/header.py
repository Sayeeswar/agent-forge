"""App header: logo, delivery date trigger, profile button, cart pill (phone only)."""
import reflex as rx
from cateringv3.theme import COLORS, FONT_SERIF
from cateringv3.state import CustomerOrderSelectionState as OS, StageOverlaysState as SO


def header() -> rx.Component:
    return rx.hstack(
        rx.text(
            "Sarthi",
            font_family=FONT_SERIF,
            font_size="24px",
            font_weight="700",
            color=COLORS["terracotta"],
        ),
        rx.button(
            rx.hstack(
                rx.text("Delivering "),
                rx.text(OS.selected_date),
                rx.text("▾"),
                spacing="1",
                align="center",
            ),
            on_click=SO.open_date_picker,
            variant="ghost",
            color=COLORS["muted"],
            font_size="13px",
        ),
        rx.spacer(),
        rx.button(
            "P",
            on_click=SO.open_profile,
            border_radius="9999px",
            width="36px",
            height="36px",
            background=COLORS["terracotta_soft"],
            color=COLORS["terracotta"],
            font_weight="700",
        ),
        rx.mobile_only(
            rx.button(
                rx.hstack(rx.text("Cart"), rx.badge(OS.cart_count), spacing="1"),
                on_click=SO.open_cart,
                background=COLORS["terracotta"],
                color="white",
                border_radius="9999px",
            ),
        ),
        width="100%",
        align="center",
        padding="12px 0",
        spacing="3",
    )
