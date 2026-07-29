import reflex as rx
from cateringv3.theme import COLORS
from cateringv3.state.adminordersstate import AdminOrdersState
from cateringv3.components.admin.stat_tile import stat_tile
from cateringv3.components.admin.order_card import order_card
from cateringv3.components.admin.order_detail_sheet import order_detail_sheet


def _section_tab_bar() -> rx.Component:
    def _tab(name, label, count):
        active = AdminOrdersState.active_tab == name
        return rx.button(
            rx.hstack(rx.text(label), rx.badge(count), spacing="1"),
            on_click=AdminOrdersState.set_tab(name),
            background=rx.cond(active, "white", "transparent"),
            border_radius="9999px", padding="8px 16px", flex="1",
        )

    return rx.hstack(
        _tab("orders", "Orders", AdminOrdersState.total_count),
        _tab("kitchen", "Kitchen", AdminOrdersState.items_to_prepare),
        background=COLORS["terracotta_soft"], border_radius="9999px", padding="4px", width="100%",
    )


def _filter_chip(name, label, count) -> rx.Component:
    active = AdminOrdersState.active_filter == name
    return rx.button(
        rx.hstack(rx.text(label), rx.badge(count), spacing="1"),
        on_click=AdminOrdersState.set_filter(name),
        background=rx.cond(active, COLORS["ink"], "transparent"),
        color=rx.cond(active, "white", COLORS["ink"]),
        border_radius="9999px", padding="8px 16px", border=f"1px solid {COLORS['muted']}40",
    )


def _orders_tab() -> rx.Component:
    return rx.vstack(
        rx.hstack(
            stat_tile("New", AdminOrdersState.new_count, "to confirm", variant="highlight"),
            stat_tile("Total", AdminOrdersState.total_count, "orders today"),
            stat_tile("Revenue", AdminOrdersState.revenue_display,
                      rx.cond(AdminOrdersState.has_partial, "1 partial", ""), variant="dark"),
            width="100%", spacing="2",
        ),
        rx.hstack(
            _filter_chip("same_day", "Same-day", AdminOrdersState.same_day_count),
            _filter_chip("open", "Open", AdminOrdersState.open_count),
            _filter_chip("partial", "Partial", AdminOrdersState.partial_count),
            spacing="2",
        ),
        rx.foreach(AdminOrdersState.orders_display, order_card),
        width="100%", spacing="3",
    )


def _special_order_card(order) -> rx.Component:
    return rx.vstack(
        rx.hstack(
            rx.text(order["id"], font_weight="700"),
            rx.text(order["customer_name"], color=COLORS["muted"]),
            width="100%",
        ),
        rx.text(order["items_summary"], font_size="13px", color=COLORS["muted"]),
        rx.text(order["note"], font_size="13px"),
        width="100%", align="start", spacing="1", padding="12px",
        background=COLORS["card"], border_radius="14px",
    )


def _prep_row(row) -> rx.Component:
    return rx.hstack(
        rx.vstack(
            rx.text(row["name"], font_weight="600"),
            rx.text(row["meta"], font_size="12px", color=COLORS["muted"]),
            align="start", spacing="0",
        ),
        rx.spacer(),
        rx.text(row["qty_display"], font_weight="700"),
        width="100%", align="center", padding="8px 0",
    )


def _kitchen_tab() -> rx.Component:
    return rx.vstack(
        rx.hstack(
            stat_tile("Items", AdminOrdersState.items_to_prepare, "to prepare"),
            stat_tile("Dishes", AdminOrdersState.unique_dishes, "unique"),
            stat_tile("Orders", AdminOrdersState.orders_delivering, "delivering"),
            width="100%", spacing="2",
        ),
        rx.text("Special orders", font_weight="700"),
        rx.foreach(AdminOrdersState.special_orders_display, _special_order_card),
        rx.text("Prep list", font_weight="700"),
        rx.foreach(AdminOrdersState.prep_list_display, _prep_row),
        width="100%", spacing="3",
    )


def orders_page() -> rx.Component:
    return rx.box(
        _section_tab_bar(),
        rx.cond(AdminOrdersState.active_tab == "kitchen", _kitchen_tab(), _orders_tab()),
        order_detail_sheet(),
        width="100%",
    )
