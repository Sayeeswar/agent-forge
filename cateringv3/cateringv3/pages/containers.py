"""Containers stage: pack chips, add/auto-pack controls, container cards, pay."""
import reflex as rx
from cateringv3.theme import COLORS, FONT_SERIF, CARD_STYLE
from cateringv3.state import CustomerPackingState as PK, StageOverlaysState as SO
from cateringv3.components.buttons import primary_button, pill_button


def _chip(chip: dict) -> rx.Component:
    """One item-to-pack chip. `chip` is a dict Var from `PK.pack_chips`;
    `chip["id"]` is untyped (list[dict] values are generic) so it's cast
    with `.to(str)` before use as an event arg, matching `food_card`."""
    chip_id = chip["id"].to(str)
    return rx.button(
        rx.hstack(rx.text(chip["name"]), rx.text("×", chip["left"].to(str))),
        on_click=PK.select_item_to_pack(chip_id),
        disabled=chip["done"],
        background=rx.cond(chip["selected"], COLORS["terracotta"], COLORS["terracotta_soft"]),
        color=rx.cond(chip["selected"], "white", COLORS["terracotta"]),
        border_radius="9999px",
        opacity=rx.cond(chip["done"], 0.4, 1),
        flex_shrink="0",
    )


def _container_line(container_id, line: dict) -> rx.Component:
    """One packed line inside a container card. `line` is a dict Var from
    `card["lines"]`; `line["item_id"]` is cast with `.to(str)` before being
    passed to `remove_from_container` as an event arg."""
    return rx.hstack(
        rx.text(line["name"]),
        rx.spacer(),
        rx.text("×", line["qty"].to(str)),
        rx.button(
            "−",
            on_click=PK.remove_from_container(container_id, line["item_id"].to(str)),
            variant="ghost",
        ),
        width="100%",
        align="center",
    )


def _progress_bar(progress) -> rx.Component:
    """Filled progress bar; `progress` is an int Var (0-100) cast to a
    string percentage for the CSS width."""
    return rx.box(
        rx.box(
            width=progress.to(str) + "%", height="6px",
            background=COLORS["terracotta"], border_radius="9999px",
        ),
        width="100%", height="6px", background=COLORS["cream"], border_radius="9999px",
    )


def _container_card(card: dict) -> rx.Component:
    """One packed-container card. `card["id"]` is cast with `.to(int)` for
    the delete/pack-into/remove-line event args (container ids are ints)."""
    container_id = card["id"].to(int)
    return rx.vstack(
        rx.hstack(
            rx.text(card["size"], font_weight="600", color=COLORS["ink"]),
            rx.spacer(),
            rx.text(card["space_label"], color=COLORS["muted"], font_size="12px"),
            rx.button("×", on_click=PK.delete_container(container_id), variant="ghost"),
            width="100%", align="center",
        ),
        _progress_bar(card["progress"]),
        rx.foreach(card["lines"].to(list[dict]), lambda ln: _container_line(container_id, ln)),
        rx.button(
            "Tap to pack here", on_click=PK.pack_into(container_id),
            width="100%", background=COLORS["terracotta_soft"], color=COLORS["terracotta"],
            border_radius="10px",
        ),
        **CARD_STYLE, width="100%", spacing="2",
    )


def _add_controls() -> rx.Component:
    return rx.hstack(
        pill_button("+ Small", PK.add_container("Small")),
        pill_button("+ Medium", PK.add_container("Medium")),
        pill_button("+ Large", PK.add_container("Large")),
        pill_button("Auto-pack", PK.auto_pack),
        wrap="wrap", spacing="2",
    )


def containers_screen() -> rx.Component:
    return rx.vstack(
        rx.text(
            "Pack your order", font_family=FONT_SERIF, font_size="24px",
            font_weight="700", color=COLORS["ink"],
        ),
        rx.hstack(rx.foreach(PK.pack_chips, _chip), overflow_x="auto", width="100%"),
        _add_controls(),
        rx.foreach(PK.container_cards, _container_card),
        rx.text(PK.portions_left_label, color=COLORS["muted"]),
        primary_button(PK.pay_button_label, SO.pay, disabled=~PK.is_fully_packed),
        rx.button("Back", on_click=SO.back_to_menu, variant="ghost"),
        spacing="3", width="100%", max_width="600px", margin="0 auto", padding="16px",
    )
