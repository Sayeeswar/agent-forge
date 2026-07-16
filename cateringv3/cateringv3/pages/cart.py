"""Cart sheet/dialog body: delivery reminder, line items, and summary."""
import reflex as rx
from cateringv3.theme import COLORS, FONT_SERIF
from cateringv3.state import CustomerOrderSelectionState as OS, StageOverlaysState as SO
from cateringv3.components.quantity_stepper import quantity_stepper
from cateringv3.components.buttons import primary_button


def _line(line: dict) -> rx.Component:
    """Single cart line. `line` is a dict Var from `OS.cart_lines` (backend
    already resolved id -> name/price/line_total); `line["id"]` is untyped
    (list[dict] values are generic), so it's cast with `.to(str)` before
    being passed to `quantity_stepper`, matching the pattern in `food_card`.
    """
    item_id = line["id"].to(str)
    return rx.hstack(
        rx.vstack(
            rx.text(line["name"], font_weight="600", color=COLORS["ink"]),
            rx.text(line["line_total_display"], color=COLORS["muted"], font_size="13px"),
            align="start",
            spacing="1",
        ),
        rx.spacer(),
        quantity_stepper(item_id),
        width="100%",
        align="center",
    )


def _delivery_reminder() -> rx.Component:
    return rx.box(
        rx.hstack(
            rx.text("Delivering ", OS.selected_date, color=COLORS["ink"]),
            rx.spacer(),
            rx.button(
                "Change",
                on_click=SO.open_date_picker,
                variant="ghost",
                color=COLORS["terracotta"],
            ),
            width="100%",
            align="center",
        ),
        background=COLORS["green_soft"],
        border_radius="12px",
        padding="12px",
        width="100%",
    )


def cart_body() -> rx.Component:
    return rx.vstack(
        rx.text(
            "Your order",
            font_family=FONT_SERIF,
            font_size="22px",
            font_weight="700",
            color=COLORS["ink"],
        ),
        _delivery_reminder(),
        rx.cond(
            OS.is_cart_empty,
            rx.text("Add dishes to start your order.", color=COLORS["muted"]),
            rx.vstack(
                rx.foreach(OS.cart_lines, _line),
                rx.divider(),
                rx.hstack(
                    rx.text("Items total"),
                    rx.spacer(),
                    rx.text(OS.items_total_display, font_weight="700"),
                    width="100%",
                ),
                rx.text("Containers chosen next", color=COLORS["muted"], font_size="13px"),
                primary_button("Choose containers →", SO.go_to_containers),
                spacing="3",
                width="100%",
            ),
        ),
        spacing="4",
        width="100%",
    )
