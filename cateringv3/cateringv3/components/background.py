"""Cream full-bleed responsive page shell: single column on phone, two-pane on tablet+."""
import reflex as rx
from cateringv3.theme import COLORS, FONT_FACE_CSS


def page_shell(phone_body, left_pane, right_pane) -> rx.Component:
    return rx.box(
        rx.el.style(FONT_FACE_CSS),
        rx.mobile_only(
            rx.box(
                phone_body,
                width="100%",
                max_width="430px",
                margin="0 auto",
                padding="0 16px",
            ),
        ),
        rx.tablet_and_desktop(
            rx.hstack(
                rx.box(
                    left_pane,
                    flex="1",
                    height="100vh",
                    overflow_y="auto",
                    padding="0 24px",
                ),
                rx.box(
                    right_pane,
                    width="420px",
                    height="100vh",
                    overflow_y="auto",
                    background=COLORS["card"],
                    padding="24px",
                ),
                spacing="0",
                width="100%",
                align="start",
            ),
        ),
        background=COLORS["cream"],
        min_height="100vh",
        width="100%",
        font_family="Inter, sans-serif",
    )
