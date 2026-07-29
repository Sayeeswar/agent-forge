"""Payment success stage: receipt card and WhatsApp confirmation notice."""
import reflex as rx
from cateringv3.theme import COLORS, FONT_SERIF
from cateringv3.state import StageOverlaysState as SO, CustomerOrderSelectionState as OS
from cateringv3.components.buttons import primary_button


def _row(label: str, value) -> rx.Component:
    return rx.hstack(
        rx.text(label, color=COLORS["muted"]),
        rx.spacer(),
        rx.text(value, font_weight="600", color=COLORS["ink"]),
        width="100%",
    )


def _check_badge() -> rx.Component:
    return rx.box(
        rx.text("✓", font_size="32px", color="white"),
        width="64px", height="64px", border_radius="9999px",
        background=COLORS["green"], display="flex",
        align_items="center", justify_content="center",
    )


def _receipt_card() -> rx.Component:
    return rx.vstack(
        _row("Order number", SO.order_number),
        _row("Delivery", OS.selected_date),
        _row("Containers", SO.receipt_container_count.to(str)),
        _row("Paid via", "UPI · Razorpay"),
        spacing="2", width="100%",
        background=COLORS["card"], border_radius="16px", padding="16px",
    )


def _whatsapp_notice() -> rx.Component:
    return rx.box(
        rx.text("We'll send a WhatsApp confirmation shortly.", color=COLORS["green"]),
        background=COLORS["green_soft"], border_radius="12px", padding="12px", width="100%",
    )


def success_screen() -> rx.Component:
    return rx.center(
        rx.vstack(
            _check_badge(),
            rx.text(
                "Payment received", font_family=FONT_SERIF, font_size="24px",
                font_weight="700", color=COLORS["ink"],
            ),
            rx.text(SO.paid_total_display, " paid successfully", color=COLORS["muted"]),
            _receipt_card(),
            _whatsapp_notice(),
            primary_button("Back to menu", SO.back_to_menu),
            spacing="4", max_width="420px", width="100%", padding="24px",
        ),
        min_height="100vh", width="100%",
    )
