# Sarthi Catering App — Design Spec

**Date:** 2026-07-15
**Status:** Approved (design), pending implementation plan
**Framework:** Reflex 0.9.6 (Python), Tailwind V4 plugin enabled

## Goal

A componentized, fully interactive mock of the Sarthi catering ordering flow — a
mobile-first single-page app that matches the 7 provided design screenshots
(`assets/01`–`07`). Menu → date → profile → cart → container packing → payment →
success. All state and events are real; payment is mocked but shaped so real
Razorpay drops in later.

## Locked-in decisions

| Topic | Decision |
| --- | --- |
| Scope | Full working flow, all screens |
| Layout | Hybrid: `state/` package (3 states) + `components/` (atoms) + `pages/` (screens) |
| Behavior | Fully interactive — real state & event handlers |
| Data | Hardcoded: real Rotis & Breads items + invented veg items for other categories |
| Payment | Mocked; `pay` handler shaped so real Razorpay drops in cleanly later |
| Phone frame | **No bezel.** Mobile-first: ~430px column on phone; two-pane fills the viewport on tablet/desktop |
| Auth | Hardcoded mock user "Priya S." |
| Container packing | **Medium fidelity**: tap-to-pack, per-container capacity + progress bar, packing fee, Auto-pack. **No** wet/dry rule (DRY tag cosmetic or omitted) |

## Architecture

Single page at `/`. The **menu is the always-mounted base layer**.

- **Overlays** (menu stays underneath, dimmed) toggled by boolean flags:
  `show_cart`, `show_date_picker`, `show_profile`.
- **Full-screen stages** swap out the menu via a `stage` var:
  `"menu" | "containers" | "success"`.

A single page means no cross-route state passing; shared state lives on three
purpose-scoped states (see State model), read across states via var operations in
the UI and `get_state` in handlers.

### Responsive shell (`components/background.py`)

Cream full-bleed page, mobile-first. Breakpoint switching uses Reflex's display
helper components (confirmed in installed Reflex 0.9.6): **`rx.mobile_only()`** wraps
the single-column phone layout, and **`rx.tablet_and_desktop()`** (= `tablet_only` +
`desktop_only`) wraps the two-pane layout. `rx.tablet_only()` / `rx.desktop_only()`
are used where a piece must differ between tablet and desktop. Default breakpoints:
mobile ≤ 48em, tablet 48–62em, desktop ≥ 62em.

**Phone (< 768px):** single column, `width: 100%`, `max_width ≈ 430px`, centered —
matches the screenshots exactly. Cart / date picker are bottom sheets; profile is a
right drawer; containers and success are full-screen stages.

**Tablet / desktop (≥ 768px): two-pane layout that fills the viewport.**

```
┌──────────────────────────────┬────────────────────────┐
│ LEFT PANE (flex, scrolls)    │ RIGHT PANE (~420px)    │
│ header + category chips +    │ persistent "order rail"│
│ menu list                    │ = cart / "Your order"  │
└──────────────────────────────┴────────────────────────┘
```

Cross-breakpoint mapping (same components, placed differently by breakpoint — not a
second UI):

| Element | Phone (< 768px) | Tablet (≥ 768px) |
| --- | --- | --- |
| Cart ("Your order") | Bottom-sheet overlay | **Persistent right pane**, always visible |
| Header "Cart" button | Shown (opens sheet) | Hidden (cart already visible) |
| Empty cart | Sheet not opened | Right pane shows empty state ("Add dishes…") |
| Containers ("Pack your order") | Full-screen stage | **Full-screen stage** (takes over both panes) |
| Success ("Payment received") | Full-screen stage | **Full-screen takeover** (centered card) |
| Date picker | Bottom sheet | Centered **modal dialog** |
| Profile | Right drawer | Right drawer (unchanged) |

The `containers` and `success` stages swap out the entire two-pane shell at all
breakpoints. `show_cart` still gates the phone bottom sheet; on tablet the right
pane renders the cart directly regardless of `show_cart`.

## Folder structure

Follows the repo's Reflex architecture rules (`pages/`, `state/` package) and the
**300-line-per-file / 40-line-per-function** caps.

```
cateringv3/
  theme.py                 # color tokens, fonts, shared style dicts
  data.py                  # hardcoded menu: categories + items; container specs
  state/
    __init__.py                  # exports the three states
    customerorderstate.py        # CustomerOrderSelectionState (cart + menu + date)
    customerpackingstate.py      # CustomerPackingState (containers, packing)
    stageoverlaystate.py         # StageOverlaysState (stage, overlays, user, order #)
    packing.py                   # pure helper fns for auto-pack / capacity math
                                 #   (keeps handlers <=40 lines, files <=300)
  components/
    background.py          # responsive shell: mobile_only column + two-pane
    header.py              # "Sarthi" logo, delivery pill, profile + Cart buttons
    category_chips.py      # horizontal scrolling category pills
    food_card.py           # one food item row: veg dot, name, desc, price, Add/stepper
    quantity_stepper.py    # the − qty + control
    bottom_sheet.py        # reusable bottom sheet (cart, date picker)
    buttons.py             # primary terracotta button + outline pill button
  pages/
    menu.py                # screen 1
    delivery_date.py       # screen 2 (calendar bottom sheet / tablet modal)
    profile_drawer.py      # screen 3 (right-side drawer)
    cart.py                # screen 4 ("Your order") — sheet on phone, right pane on tablet
    containers.py          # screens 5 & 6 ("Pack your order")
    success.py             # screen 7 ("Payment received")
  cateringv3.py            # assembles the page + drives overlay/stage switching
```

## State model — three states (`state/` package)

State is split into three `rx.State` classes, each owning one concern.

### 1. `CustomerOrderSelectionState` (`customerorderstate.py`) — cart, menu, date

```python
cart: dict[str, int]                 # item_id -> qty
active_category: str = "Rotis & Breads"
selected_date: str = "Thu, 16 Jul"
# computed (own-state only): cart_count, items_total, total_portions
```
Handlers: `add_item(item_id)`, `inc(item_id)`, `dec(item_id)`,
`set_category(name)`, `select_date(date)`.

### 2. `CustomerPackingState` (`customerpackingstate.py`) — packing

```python
containers: list[dict]               # [{id, size, capacity, fee, items:{item_id:qty}}]
selected_item_to_pack: str | None = None
# computed (own-state only): packing_fee, portions_packed, container_count
```
Handlers: `add_container(size)`, `select_item_to_pack(item_id)`,
`pack_into(container_id)`, `remove_from_container(container_id, item_id)`,
`auto_pack` (**async** — reads cart via `get_state`), `reset_packing`.

### 3. `StageOverlaysState` (`stageoverlaystate.py`) — nav, overlays, user, result

```python
stage: str = "menu"                  # "menu" | "containers" | "success"
show_cart: bool = False
show_date_picker: bool = False
show_profile: bool = False
user_name: str = "Priya S."          # mock user
orders_placed: int = 12
balance_status: str = "All paid up"
order_number: str = ""               # generated on pay, e.g. "SAR-3411"
paid_total: int = 0                  # snapshotted grand total for the receipt
receipt_container_count: int = 0     # snapshotted for the receipt
```
Handlers: `open_cart/close_cart`, `open_date_picker/close_date_picker`,
`open_profile/close_profile`, `go_to_containers`, `back_to_menu`,
`pay` (**async** — reads order + packing via `get_state`, snapshots total &
container count, generates `order_number`, sets `stage="success"`).

### Cross-state access rules (verified against Reflex 0.9.6)

`get_state` / `get_var_value` work **only inside async event handlers**, never inside
`@rx.var` computed vars. So values that span two states are NOT computed vars:

- **`grand_total` / `portions_left`** are combined in the **component tree via var
  operations** — e.g. `CustomerOrderSelectionState.items_total +
  CustomerPackingState.packing_fee`. Both states' vars are available to the frontend.
- **`is_fully_packed`** (gates Pay) is a var expression in the page:
  `CustomerPackingState.portions_packed >= CustomerOrderSelectionState.total_portions`.
- Handlers needing another state's data (`auto_pack`, `pay`, `back_to_menu`'s full
  reset) use `other = await self.get_state(OtherState)`.
- `back_to_menu` resets all three states (cart, packing, stage) via `get_state`.

### Packing math (`packing.py` — pure helpers)

- Container specs (from `data.py`): Small cap 3 / fee ₹5; Medium 6 / ₹8; Large 12 / ₹12.
- `packing_fee` = sum of chosen containers' fees (computed var on packing state).
- `grand_total` = `items_total + packing_fee` (var op in the view).
- `portions_left` = `total_portions − portions_packed` (var op in the view).
- Pay disabled until `portions_left == 0`.
- `auto_pack`: **First Fit Decreasing (FFD)** bin-packing — sort portions descending,
  place each into the first container with room, opening a new (cheapest-fitting)
  container when none fits. Implemented as a pure helper in `packing.py`, given the
  cart dict, called from the async handler after `get_state(CustomerOrderSelectionState)`.

## Data (`data.py`)

Categories (horizontal chips): **Rotis & Breads · Rice · Curries · Raw Salads · Dals**.

- **Rotis & Breads** (real, from screenshot): Paneer Paratha ₹80, Aloo Paratha ₹50,
  Puri ₹15, Oilless Phulka ₹10, Ghee Phulka ₹15, Ghee Chapathi ₹20.
- **Rice / Curries / Raw Salads / Dals:** ~4–6 invented plausible veg items each,
  with name, one-line description, price, unit.
- All items are **veg** (green dot) — matches every screenshot.

Item shape: `{id, category, name, desc, price, unit, veg: True}`.

## Visual system (`theme.py`) — approximated from screenshots

| Token | Value (approx) | Use |
| --- | --- | --- |
| `cream` | `#F5EFE6` | page background |
| `card` | `#FFFFFF` | food cards, sheets |
| `terracotta` | `#B5502E` | primary buttons, active chip fill, stepper, selected date |
| `terracotta_soft` | peach `#F6E6DC` | Add-button hover, reminder box |
| `ink` | `#241E1A` | headings, "Done" button, active chip |
| `muted` | `#8A8178` | descriptions, secondary labels |
| `green` | `#2E7D32` | veg dot, success check, "All paid up", "Secured by Razorpay" |
| `green_soft` | `#E8F0E9` | info/success boxes |
| `today_blue` | `#DCE7F0` | today's date outline in calendar |

Fonts: **serif** headings (Playfair Display / Fraunces style) for "Sarthi", section
titles, sheet titles, "Payment received"; **sans** body (Inter/system). Loaded via
theme; approximated since exact hex/font can't be extracted from images (easy to
fine-tune later).

## Screen-by-screen behavior

1. **Menu** — header (logo, "Delivering <date> ▾" opens date picker, profile icon,
   Cart pill with count badge), category chips (tap sets `active_category`),
   section title + item count, food cards. "Add" → stepper once qty > 0.
2. **Delivery date** — bottom sheet over dimmed menu; month nav; past dates disabled;
   today outlined; selected date terracotta; green tip box; "Done" closes.
3. **Profile drawer** — right-side drawer; avatar "P", "Priya S.", stat cards
   (orders placed, current orders empty-state, balance "All paid up"); bottom links
   "Order history on WhatsApp" / "Saved addresses" (no-op stubs) / "Sign out".
4. **Cart ("Your order")** — bottom sheet; delivery reminder box with "Change"
   (reopens date picker); line items with steppers; summary (Items, Containers
   "chosen next", Items total); "Choose containers →" → `stage="containers"`.
5. **Containers ("Pack your order")** — screens 5 (empty) & 6 (packed). Item chips to
   pack, capacity/progress per container, add S/M/L, Auto-pack, packing status
   footer; "Pay ₹<grand_total> securely" enabled only when fully packed → `pay`.
6. **Success ("Payment received")** — full-screen; green check; "₹<total> paid
   successfully"; receipt (order number, delivery date, container count, "UPI ·
   Razorpay"); WhatsApp confirmation box; "Back to menu" resets and returns.

## Out of scope (stubs / mocked)

- Real payment gateway (mocked; Razorpay shape preserved at `pay`).
- WhatsApp order history, saved addresses, sign out — visual buttons, no behavior.
- Wet/dry container rules and strict capacity validation beyond simple counts.
- Persistence / backend / real auth.

## Verification

Follow reflex-process-management to compile & run, then drive each screen with
Playwright and compare screenshots against `assets/01`–`07`; fix visual gaps.
