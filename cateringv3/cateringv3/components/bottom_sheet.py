"""Fixed dimmed-backdrop overlay + rounded sheet, shown when open_var is true."""
import reflex as rx
from cateringv3.theme import SHEET_STYLE


def bottom_sheet(open_var, *body):
    """Bottom sheet overlay.

    The backdrop intentionally has no on_click handler: taps on the dimmed
    area must NOT dismiss the sheet (design rule #14). Dismissal happens via
    explicit close buttons placed inside `body` by the caller.
    """
    return rx.cond(
        open_var,
        rx.box(
            rx.box(position="fixed", inset="0", background="rgba(0,0,0,0.4)"),
            rx.box(
                *body,
                position="fixed",
                bottom="0",
                left="0",
                right="0",
                max_height="85vh",
                overflow_y="auto",
                z_index="50",
                margin="0 auto",
                max_width="430px",
                **SHEET_STYLE,
            ),
            position="fixed",
            inset="0",
            z_index="40",
        ),
    )
