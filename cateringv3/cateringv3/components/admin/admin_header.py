import reflex as rx
from cateringv3.theme import COLORS, FONT_SERIF
from cateringv3.state.adminnavstate import AdminNavState


def admin_header() -> rx.Component:
    return rx.hstack(
        rx.button(
            "S",
            on_click=AdminNavState.toggle_nav,
            width="40px",
            height="40px",
            border_radius="10px",
            background=COLORS["ink"],
            color="white",
            font_weight="700",
            font_family=FONT_SERIF,
        ),
        rx.vstack(
            rx.text(
                rx.cond(AdminNavState.section == "menu", "Menu", "Orders"),
                font_family=FONT_SERIF,
                font_size="22px",
                font_weight="700",
                color=COLORS["ink"],
            ),
            spacing="0",
            align="start",
        ),
        rx.spacer(),
        rx.box(
            rx.text("Tomorrow ▾", font_size="13px", color=COLORS["muted"]),
            border=f"1px solid {COLORS['muted']}40",
            border_radius="9999px",
            padding="6px 14px",
        ),
        width="100%",
        align="center",
        padding="12px 0",
        spacing="3",
    )
