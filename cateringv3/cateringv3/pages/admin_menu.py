import reflex as rx
from cateringv3.theme import COLORS
from cateringv3.state.adminmenustate import AdminMenuState
from cateringv3.components.admin.menu_item_row import menu_item_row


def _tab_bar() -> rx.Component:
    def _tab(name, label):
        active = AdminMenuState.active_tab == name
        return rx.button(
            label, on_click=AdminMenuState.set_tab(name),
            background=rx.cond(active, "white", "transparent"),
            color=COLORS["ink"], border_radius="9999px", padding="8px 20px",
            font_weight=rx.cond(active, "700", "500"), flex="1",
        )

    return rx.hstack(
        _tab("edit", "Edit"), _tab("view", "View"), _tab("publish", "Publish"),
        background=COLORS["terracotta_soft"], border_radius="9999px", padding="4px",
        width="100%",
    )


def _category_chips() -> rx.Component:
    def _chip(row):
        active = AdminMenuState.active_category == row["name"]
        return rx.button(
            rx.hstack(rx.text(row["name"]), rx.badge(row["count"]), spacing="1"),
            on_click=AdminMenuState.set_category(row["name"]),
            background=rx.cond(active, COLORS["ink"], "transparent"),
            color=rx.cond(active, "white", COLORS["muted"]),
            border_radius="9999px", padding="8px 16px", font_size="14px",
            white_space="nowrap", flex_shrink="0",
        )

    return rx.hstack(
        rx.foreach(AdminMenuState.category_rows, _chip),
        overflow_x="auto", spacing="2", width="100%", padding_y="4px",
    )


def menu_page() -> rx.Component:
    return rx.vstack(
        _tab_bar(),
        _category_chips(),
        rx.cond(
            AdminMenuState.active_tab == "publish",
            rx.box(
                rx.text(AdminMenuState.ready_to_publish_label, font_weight="600"),
                rx.button("Publish →", on_click=AdminMenuState.publish,
                          background=COLORS["ink"], color="white", border_radius="10px"),
                width="100%", padding="12px",
            ),
        ),
        rx.cond(
            AdminMenuState.active_tab == "edit",
            rx.foreach(AdminMenuState.active_items, lambda item: menu_item_row(item, editable=True)),
            rx.foreach(AdminMenuState.active_items, lambda item: menu_item_row(item, editable=False)),
        ),
        width="100%",
        spacing="3",
    )
