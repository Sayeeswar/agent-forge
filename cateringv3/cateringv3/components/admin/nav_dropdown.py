import reflex as rx
from cateringv3.theme import COLORS
from cateringv3.state.adminnavstate import AdminNavState


def _row(icon: str, label: str, active, on_click=None) -> rx.Component:
    return rx.hstack(
        rx.box(
            icon,
            width="28px",
            height="28px",
            border_radius="8px",
            background=COLORS["terracotta_soft"],
            color=COLORS["terracotta"],
            display="flex",
            align_items="center",
            justify_content="center",
            font_weight="700",
            font_size="13px",
        ),
        rx.text(
            label,
            font_weight=rx.cond(active, "700", "500"),
            color=rx.cond(active, "white", COLORS["ink"]),
        ),
        on_click=on_click,
        background=rx.cond(active, COLORS["ink"], "transparent"),
        border_radius="10px",
        padding="10px 12px",
        width="100%",
        align="center",
        spacing="3",
    )


def nav_dropdown() -> rx.Component:
    return rx.cond(
        AdminNavState.nav_open,
        rx.vstack(
            rx.text(
                "SARTHI · CLIENT",
                font_size="11px",
                color=COLORS["muted"],
                padding="4px 12px",
            ),
            _row("O", "Orders", AdminNavState.section == "orders", AdminNavState.set_section("orders")),
            _row("M", "Edit menu", AdminNavState.section == "menu", AdminNavState.set_section("menu")),
            _row("C", "Customers", False),
            _row("$", "Payments", False),
            _row("⚙", "Settings", False),
            background=COLORS["card"],
            border_radius="14px",
            box_shadow="0 4px 16px rgba(0,0,0,0.12)",
            padding="8px",
            width="220px",
            position="absolute",
            top="60px",
            left="0",
            z_index="30",
            spacing="1",
            align="start",
        ),
    )
