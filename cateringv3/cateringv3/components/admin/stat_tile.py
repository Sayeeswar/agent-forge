import reflex as rx
from cateringv3.theme import COLORS


_VARIANT_STYLE = {
    "default": {"background": COLORS["card"], "color": COLORS["ink"]},
    "highlight": {"background": COLORS["terracotta_soft"], "color": COLORS["terracotta"]},
    "dark": {"background": COLORS["ink"], "color": "white"},
}


def stat_tile(label, value, sublabel, variant="default") -> rx.Component:
    style = _VARIANT_STYLE[variant]

    return rx.vstack(
        rx.text(label, font_size="12px", color=style["color"], opacity="0.7"),
        rx.text(value, font_size="24px", font_weight="700", color=style["color"]),
        rx.text(sublabel, font_size="12px", color=style["color"], opacity="0.7"),
        background=style["background"],
        border_radius="14px",
        padding="12px",
        align="start",
        spacing="1",
        flex="1",
    )
