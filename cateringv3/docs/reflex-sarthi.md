# Reflex + Sarthi — Design System & UI Conventions

Read this before building or converting any Sarthi UI. Checklist, not prose.

Token source: `cateringv3/theme.py` (no design-skill theme-tokens.md exists yet — these are the real, already-implemented values, not invented ones).

---

## 1. Design tokens

### Colors (`theme.COLORS`)

| Token | Hex | Used for |
| --- | --- | --- |
| `cream` | `#F5EFE6` | Page background (full-bleed). |
| `card` | `#FFFFFF` | Card/sheet surfaces, tablet+ right pane. |
| `terracotta` | `#B5502E` | Primary CTA buttons, active/selected states, brand accent. |
| `terracotta_soft` | `#F6E6DC` | Soft accent backgrounds (e.g. "Add" button fill, avatar chip). |
| `ink` | `#241E1A` | Primary text, active chip fill. |
| `muted` | `#8A8178` | Secondary/muted text, inactive chip text, borders. |
| `green` | `#2E7D32` | Success/veg-dot accent. |
| `green_soft` | `#E8F0E9` | Success-state soft background. |
| `today_blue` | `#DCE7F0` | Calendar "today" highlight. |

### Typography

| Token | Value | Used for |
| --- | --- | --- |
| `FONT_SERIF` | `Playfair Display, serif` | Headings, logo wordmark ("Sarthi"), section titles. |
| `FONT_SANS` | `Inter, sans-serif` | Body text, everything else. |

Fonts are self-hosted (`assets/fonts/*.woff2`, injected via `FONT_FACE_CSS`) — no CDN.

### Spacing / radii / shared styles

| Token | Value | Used for |
| --- | --- | --- |
| `CARD_STYLE.border_radius` | `16px` | Standard card corner radius. |
| `CARD_STYLE.padding` | `16px` | Standard card padding. |
| `CARD_STYLE.box_shadow` | `0 1px 2px rgba(0,0,0,0.05)` | Standard card shadow. |
| `PILL_STYLE.border_radius` | `9999px` | Chips, pill buttons. |
| `PILL_STYLE.padding` | `8px 16px` | Chips, pill buttons. |
| `SHEET_STYLE.border_radius` | `24px 24px 0 0` | Bottom sheets (rounded top only). |
| `SHEET_STYLE.padding` | `20px` | Bottom sheets. |

Reuse these dicts (`theme.CARD_STYLE`, `theme.PILL_STYLE`, `theme.SHEET_STYLE`) via `**spread`. Never redefine a card/pill/sheet style inline — if a new variant is needed, add a new named constant to `theme.py`, don't hardcode values in a component.

---

## 2. Layout rules — mobile-first

Sarthi is mobile-first. Every layout decision starts at mobile width and scales up — never the reverse.

- Design and build the phone layout first (~430px column, `padding: 0 16px`).
- Only after the phone layout is correct, add tablet/desktop treatment if the design actually calls for it.
- Breakpoint mechanism: `rx.mobile_only(...)` / `rx.tablet_and_desktop(...)` — never raw CSS media queries.
- Two-pane tablet/desktop layout (persistent right pane) is a customer-app-specific pattern (see `components/background.py: page_shell`). Don't assume every new feature needs it — the admin app, for example, is phone-width only by design (no admin desktop screens exist yet). Check the feature's design spec before adding tablet/desktop layout.

---

## 3. Component rules

- **Native Reflex components only.** `rx.box`, `vstack`, `hstack`, `flex`, `grid`, `card`, `tabs`, `dialog`, `drawer`, `foreach`, `switch`, `cond`, `match`.
- **Never `rx.html()` or `rx.el`** — even if explicitly asked to match a design pixel-for-pixel.
- **Correct Reflex API beats pixel-perfect match, every time.** If a design shows a custom dropdown but Reflex ships `rx.menu` / `rx.select`, use the native component even if it renders slightly differently. Never fake a component with `rx.html`/`rx.el` to chase visual fidelity.
- Verify every component/prop/event against reflex-docs or installed source before using it. Never guess.

---

## 4. State rules

- **One state class per feature/task.** `CustomerOrderSelectionState`, `CustomerPackingState`, `StageOverlaysState`, `AdminMenuState`, `AdminOrdersState`, `AdminNavState` — each owns one concern.
- **Never share one giant state across features.** If a new feature needs data from another state, use `await self.get_state(OtherState)` for cross-state reads — don't merge state classes to avoid the lookup.
- **UI is display-only.** No arithmetic or business conditionals in the component tree. Business logic lives in plain pure functions (e.g. `state/packing.py`, `state/admin_logic.py`); states call those functions and expose `@rx.var` computed vars that are already display-ready strings/values.

---

## 5. The `base_page` pattern

Sarthi's hard-learned lesson: **one `base_page` holds every element common to all screens** (nav/header, background shell, shared layout). Individual pages wrap their unique content in `base_page` via a decorator, instead of each page repeating the shared shell by hand.

```python
# components/base_page.py
import reflex as rx
from cateringv3.theme import COLORS


def base_page(page_fn):
    """Decorator: injects the shared shell (background, header/nav) around a page's unique content."""

    def wrapper(*args, **kwargs) -> rx.Component:
        content = page_fn(*args, **kwargs)

        return rx.box(
            shared_header(),
            content,
            background=COLORS["cream"],
            min_height="100vh",
            width="100%",
        )

    wrapper.__name__ = page_fn.__name__
    return wrapper
```

```python
# pages/admin_orders.py
from cateringv3.components.base_page import base_page


@base_page
def admin_orders_page() -> rx.Component:
    # Only the unique content — no shell, no header, no background here.
    return orders_tab_content()
```

Rule of thumb: if you find yourself calling `header()` or repeating the same background/shell box in more than one page function, stop — pull it into (or reuse) `base_page` instead.

---

## 6. Repetitive / routine tasks

Do these every time, without being asked again:

- **Log every bash command** run during a task to `docs/Bashcommands.md`.
- **Verify the Reflex API** (reflex-docs / installed source) before writing any component, prop, event, or state API — never guess.
- **Run the full pytest suite** before committing, not just the new test file.
- **Commit after each completed task**, not batched at the end.
- **Update `TODO.md`** when a task starts/finishes (check items off, add newly discovered ones).
- **Add new architectural decisions to `DECISIONS.md`** (with a why) the moment they're locked in — don't wait until the spec is done.
- **Keep `docs/PLAN.md` in sync** with the active implementation plan so it survives `/compact`.

---

## Codebase cross-reference

- Customer app's `components/background.py: page_shell()` is the existing (pre-decorator) shell pattern — it's what `base_page` should eventually wrap or replace for new work, but per the guard rail in `CLAUDE.md`, don't modify the customer app's pages/state while doing admin work. Apply the decorator pattern fresh for the admin app; don't retrofit the customer app in the same pass.
