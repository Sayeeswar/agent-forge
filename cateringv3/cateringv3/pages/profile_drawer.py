"""Profile drawer: right side on phone, left side on tablet+ (design #12).

Uses `rx.drawer` (Vaul-based primitive, see
`reflex_components_radix.primitives.drawer`). Composition verified against
the installed package source: `rx.drawer.root` takes `open` (controlled
open state) and `direction` ("left"/"right"/"top"/"bottom"), and wraps
`rx.drawer.overlay()` + `rx.drawer.portal(rx.drawer.content(...))`.

Design rule #14 (explicit-dismiss only): `DrawerRoot` exposes a
`dismissible` prop — "When False, dragging, clicking outside, pressing
esc, etc. will not close the drawer." Set `dismissible=False` here so the
only way to close is the explicit X button (`SO.close_profile`), which is
the same rule `bottom_sheet.py` documents for the cart/date sheets.
"""
import reflex as rx
from cateringv3.theme import COLORS, FONT_SERIF, CARD_STYLE
from cateringv3.state import StageOverlaysState as SO


def _stat(label: str, value) -> rx.Component:
    return rx.vstack(
        rx.text(value, font_weight="700", color=COLORS["ink"]),
        rx.text(label, color=COLORS["muted"], font_size="12px"),
        **CARD_STYLE, spacing="1",
    )


def _header() -> rx.Component:
    return rx.hstack(
        rx.text("Profile", font_family=FONT_SERIF, font_size="20px", font_weight="700"),
        rx.spacer(),
        rx.button("×", on_click=SO.close_profile, variant="ghost"),
        width="100%", align="center",
    )


def _avatar_row() -> rx.Component:
    return rx.hstack(
        rx.box(
            SO.avatar_initial, width="48px", height="48px",
            border_radius="9999px", background=COLORS["terracotta_soft"],
            color=COLORS["terracotta"], display="flex",
            align_items="center", justify_content="center", font_weight="700",
        ),
        rx.text(SO.user_name, font_weight="600", color=COLORS["ink"]),
        align="center", spacing="3",
    )


def _drawer_body() -> rx.Component:
    return rx.vstack(
        _header(),
        _avatar_row(),
        rx.hstack(
            _stat("Orders placed", SO.orders_placed.to(str)),
            _stat("Balance", SO.balance_status),
            width="100%",
        ),
        rx.text("Order history on WhatsApp", color=COLORS["terracotta"]),
        rx.text("Saved addresses", color=COLORS["ink"]),
        rx.text("Sign out", color=COLORS["muted"]),
        spacing="4", width="100%", padding="20px",
    )


def _drawer(direction: str, width: str) -> rx.Component:
    # `DrawerContent`'s base style pins all four edges to 0 (full-screen);
    # the side the panel should NOT touch must be reset to "auto" so it
    # actually sits at the given `width` on the correct edge instead of
    # stretching edge-to-edge.
    side_style = (
        {"left": "0", "right": "auto"} if direction == "left"
        else {"right": "0", "left": "auto"}
    )
    return rx.drawer.root(
        rx.drawer.overlay(),
        rx.drawer.portal(
            rx.drawer.content(
                _drawer_body(),
                width=width, height="100%", background=COLORS["cream"],
                **side_style,
            ),
        ),
        open=SO.show_profile,
        direction=direction,
        dismissible=False,
    )


def profile_drawer() -> rx.Component:
    return rx.fragment(
        rx.mobile_only(_drawer("right", "320px")),
        rx.tablet_and_desktop(_drawer("left", "360px")),
    )
