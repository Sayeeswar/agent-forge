"""Delivery date picker: functional month calendar, phone sheet, tablet dialog."""
import reflex as rx
from cateringv3.theme import COLORS, FONT_SERIF
from cateringv3.state import CustomerOrderSelectionState as OS, StageOverlaysState as SO
from cateringv3.components.buttons import primary_button
from cateringv3.components.bottom_sheet import bottom_sheet

_WEEKDAY_LABELS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"]


def _day_cell(cell: dict) -> rx.Component:
    """One calendar day button. `cell` is a dict Var from `OS.calendar_weeks`
    (backend already computed day/label/is_today/disabled); values are
    generic, so `cell["day"]` is cast with `.to(str)` for display, matching
    the pattern used for dict Var fields elsewhere (`food_card`).
    """
    return rx.cond(
        cell["day"] == 0,
        rx.box(width="40px", height="40px"),
        rx.button(
            cell["day"].to(str),
            on_click=OS.select_date(cell["label"].to(str)),
            disabled=cell["disabled"],
            width="40px",
            height="40px",
            border_radius="9999px",
            padding="0",
            background=rx.cond(OS.selected_date == cell["label"], COLORS["terracotta"], "transparent"),
            color=rx.cond(OS.selected_date == cell["label"], "white", COLORS["ink"]),
            border=rx.cond(cell["is_today"], f"2px solid {COLORS['today_blue']}", "none"),
            opacity=rx.cond(cell["disabled"], 0.3, 1),
        ),
    )


def _weekday_header() -> rx.Component:
    return rx.hstack(
        *[
            rx.text(
                label,
                width="40px",
                text_align="center",
                font_size="12px",
                font_weight="600",
                color=COLORS["muted"],
            )
            for label in _WEEKDAY_LABELS
        ],
        justify="between",
        width="100%",
    )


def calendar() -> rx.Component:
    return rx.vstack(
        rx.hstack(
            rx.button("‹", on_click=OS.prev_month, variant="ghost"),
            rx.text(OS.cal_month_label, font_weight="600", color=COLORS["ink"]),
            rx.button("›", on_click=OS.next_month, variant="ghost"),
            justify="between",
            width="100%",
            align="center",
        ),
        _weekday_header(),
        rx.foreach(
            OS.calendar_weeks,
            lambda week: rx.hstack(rx.foreach(week, _day_cell), justify="between", width="100%"),
        ),
        rx.box(
            rx.text(
                "Tip: order a day ahead for large trays.",
                color=COLORS["green"],
                font_size="13px",
            ),
            background=COLORS["green_soft"],
            border_radius="10px",
            padding="10px",
            width="100%",
        ),
        primary_button("Done", SO.close_date_picker),
        spacing="3",
        width="100%",
    )


def date_picker_sheet() -> rx.Component:
    """Phone bottom sheet wrapping the calendar. Wired into the shell in Task 12."""
    return bottom_sheet(SO.show_date_picker, calendar())


def date_picker_modal() -> rx.Component:
    """Tablet dialog wrapping the calendar."""
    return rx.dialog.root(
        rx.dialog.content(
            rx.dialog.title("Pick delivery date", font_family=FONT_SERIF),
            calendar(),
        ),
        open=SO.show_date_picker,
    )
