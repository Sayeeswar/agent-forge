import reflex as rx
from cateringv3.theme import COLORS
from cateringv3.components.bottom_sheet import bottom_sheet
from cateringv3.state.adminordersstate import AdminOrdersState


def _line_row(line) -> rx.Component:
    return rx.hstack(
        rx.text(
            line["name"],
            text_decoration=rx.cond(line["struck"], "line-through", "none"),
            color=rx.cond(line["struck"], COLORS["muted"], COLORS["ink"]),
        ),
        rx.text("×", line["qty"].to(str), color=COLORS["muted"]),
        rx.spacer(),
        rx.text("₹", line["subtotal"].to(str)),
        on_click=AdminOrdersState.toggle_strike(line["item_id"]),
        width="100%", align="center", spacing="2", padding="8px 0",
    )


def order_detail_sheet() -> rx.Component:
    return bottom_sheet(
        AdminOrdersState.show_order_sheet,
        rx.vstack(
            rx.hstack(
                rx.vstack(
                    rx.text(
                        AdminOrdersState.active_order_id_display, " · ",
                        AdminOrdersState.active_order_placed_display,
                        font_size="12px", color=COLORS["muted"],
                    ),
                    rx.text(AdminOrdersState.active_order_customer_name, font_weight="700"),
                    rx.text(AdminOrdersState.active_order_phone, font_size="13px", color=COLORS["muted"]),
                    align="start", spacing="0",
                ),
                rx.spacer(),
                rx.box(AdminOrdersState.active_order_payment_method,
                       background=COLORS["green_soft"], color=COLORS["green"],
                       border_radius="9999px", padding="2px 10px", font_size="11px"),
                width="100%", align="start",
            ),
            rx.box(
                "Tap items you can't fulfill to strike them. Save with strikes to convert to Partial, "
                "or mark the whole order completed.",
                font_size="12px", color=COLORS["terracotta"],
                background=COLORS["terracotta_soft"], border_radius="10px", padding="8px 12px",
            ),
            rx.foreach(AdminOrdersState.active_order_lines, _line_row),
            rx.hstack(
                rx.text("Original total", color=COLORS["muted"]),
                rx.spacer(),
                rx.text(AdminOrdersState.active_order_original_total_display),
                width="100%",
            ),
            rx.hstack(
                rx.text("Total", font_weight="700"),
                rx.spacer(),
                rx.text(AdminOrdersState.active_order_total_display, font_weight="700"),
                width="100%",
            ),
            rx.hstack(
                rx.button("Cancel order", on_click=AdminOrdersState.cancel_order, variant="ghost"),
                rx.button("Send SMS", on_click=AdminOrdersState.close_order, variant="ghost"),
                rx.cond(
                    AdminOrdersState.active_order_has_strikes,
                    rx.button(
                        "Save as Partial →",
                        on_click=AdminOrdersState.save_partial,
                        background=COLORS["terracotta"], color="white",
                    ),
                    rx.button(
                        "Mark completed →",
                        on_click=AdminOrdersState.mark_completed,
                        background=COLORS["terracotta"], color="white",
                    ),
                ),
                width="100%", spacing="2",
            ),
            rx.button("Save without completing", on_click=AdminOrdersState.save_partial, variant="ghost", width="100%"),
            width="100%", spacing="3",
        ),
    )
