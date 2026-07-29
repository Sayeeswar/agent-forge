import reflex as rx
from cateringv3.theme import COLORS, CARD_STYLE
from cateringv3.state.adminordersstate import AdminOrdersState


def order_card(order) -> rx.Component:
    return rx.vstack(
        rx.hstack(
            rx.text(order["id"], font_weight="700", color=COLORS["ink"]),
            rx.text(order["customer_name"], color=COLORS["muted"]),
            rx.cond(
                order["is_special"],
                rx.box("★ Special", background="#F6E6DC", color=COLORS["terracotta"],
                       border_radius="9999px", padding="2px 10px", font_size="11px"),
            ),
            rx.spacer(),
            rx.box(
                order["payment_method"],
                background=rx.cond(order["payment_method"] == "online", COLORS["green_soft"], COLORS["terracotta_soft"]),
                color=rx.cond(order["payment_method"] == "online", COLORS["green"], COLORS["terracotta"]),
                border_radius="9999px", padding="2px 10px", font_size="11px",
            ),
            width="100%", align="center", spacing="2",
        ),
        rx.text(order["items_summary"], font_size="13px", color=COLORS["muted"]),
        rx.hstack(
            rx.text(order["placed_display"], font_size="12px", color=COLORS["muted"]),
            rx.spacer(),
            rx.text(order["total_display"], font_weight="700", color=COLORS["ink"]),
            width="100%", align="center",
        ),
        on_click=AdminOrdersState.open_order(order["id"]),
        width="100%", align="start", spacing="2", **CARD_STYLE,
    )
