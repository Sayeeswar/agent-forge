"""Shared page shell decorator: injects background + header/nav around a page's unique content."""
import reflex as rx
from cateringv3.theme import COLORS
from cateringv3.components.admin.admin_header import admin_header
from cateringv3.components.admin.nav_dropdown import nav_dropdown


def base_page(page_fn):
    def wrapper(*args, **kwargs) -> rx.Component:
        content = page_fn(*args, **kwargs)

        return rx.box(
            rx.box(
                admin_header(),
                nav_dropdown(),
                content,
                width="100%",
                max_width="430px",
                margin="0 auto",
                padding="0 16px",
            ),
            background=COLORS["cream"],
            min_height="100vh",
            width="100%",
        )

    wrapper.__name__ = page_fn.__name__
    return wrapper
