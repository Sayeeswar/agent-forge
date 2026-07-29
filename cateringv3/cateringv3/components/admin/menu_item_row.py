import reflex as rx
from cateringv3.theme import COLORS, CARD_STYLE
from cateringv3.state.adminmenustate import AdminMenuState


def _view_row(item) -> rx.Component:
    return rx.hstack(
        rx.vstack(
            rx.text(item["name"], font_weight="600", color=COLORS["ink"]),
            rx.text(item["desc"], font_size="13px", color=COLORS["muted"]),
            align="start", spacing="1",
        ),
        rx.spacer(),
        rx.vstack(
            rx.text("₹", item["price"].to(str), font_weight="600", color=COLORS["ink"]),
            rx.text(item["unit"], font_size="11px", color=COLORS["muted"]),
            align="end", spacing="1",
        ),
        width="100%", align="center", **CARD_STYLE,
    )


def _edit_row(item) -> rx.Component:
    item_id = item["id"].to(str)
    return rx.vstack(
        rx.hstack(
            rx.input(
                value=item["name"], on_change=AdminMenuState.update_name(item_id),
                background="transparent", font_weight="600",
            ),
            rx.hstack(
                rx.text("₹", color=COLORS["muted"]),
                rx.input(
                    value=item["price"].to(str), on_change=AdminMenuState.update_price(item_id),
                    width="70px",
                ),
                align="center", spacing="1",
            ),
            width="100%", spacing="3",
        ),
        rx.input(
            value=item["desc"], on_change=AdminMenuState.update_desc(item_id),
            font_size="13px", background="transparent",
        ),
        rx.input(
            value=item["unit"], on_change=AdminMenuState.update_unit(item_id),
            font_size="12px", background="transparent", width="120px",
        ),
        rx.hstack(
            rx.switch(
                checked=item["available"],
                on_change=lambda _: AdminMenuState.toggle_available(item_id),
            ),
            rx.text("Available today", font_size="13px", color=COLORS["muted"]),
            align="center", spacing="2",
        ),
        width="100%", align="start", spacing="2", **CARD_STYLE,
    )


def menu_item_row(item, editable: bool) -> rx.Component:
    return _edit_row(item) if editable else _view_row(item)
